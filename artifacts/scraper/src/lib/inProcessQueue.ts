// inProcessQueue.ts
// A minimal in-process job runner used when Redis (and therefore BullMQ) is
// not configured. Suitable for low-traffic MVP deployments where standing up
// Redis is overkill.
//
// Differences from BullMQ:
//   - Jobs live only in memory: a process restart drops the queue.
//   - No exponential-backoff retries; jobs run once, failures are logged.
//   - No dead-letter queue, no cross-machine visibility.
//   - Same concurrency caps + 24h dedupe as the BullMQ path so behaviour
//     matches as closely as possible.
//
// When to upgrade to Redis/BullMQ:
//   - You start seeing crashes / missed jobs because the process restarts mid-scrape
//   - You need to run workers on a separate machine from the HTTP listener
//   - Multiple Fly.io machines need to share queue state

import type { JobPayload, JobType, JobResult } from './types.js';

export type WrappedHandler = (p: JobPayload) => Promise<JobResult>;

interface Slot {
  handler:     WrappedHandler;
  concurrency: number;
  active:      number;
  pending:     JobPayload[];
  /** dedupeKey → ms timestamp of last enqueue */
  seen:        Map<string, number>;
}

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const SEEN_PRUNE_THRESHOLD = 1000;

const slots = new Map<JobType, Slot>();

/**
 * Register a worker handler. Called once per JobType at startup.
 * Subsequent calls overwrite — useful for hot-reload in dev.
 */
export function registerHandler(type: JobType, handler: WrappedHandler, concurrency: number): void {
  slots.set(type, {
    handler,
    concurrency: Math.max(1, concurrency),
    active:  0,
    pending: [],
    seen:    new Map(),
  });
}

export function isHandlerRegistered(type: JobType): boolean {
  return slots.has(type);
}

/**
 * Enqueue a job. Returns immediately — the job runs in the background.
 * Caller MUST NOT await the result, otherwise the HTTP request blocks until
 * the scrape completes (in BullMQ mode it returns instantly because Redis
 * persists the job; we preserve that contract here by using setImmediate).
 */
export function enqueueInProcess(payload: JobPayload): void {
  const slot = slots.get(payload.type);
  if (!slot) {
    console.warn(`[inproc] no handler registered for ${payload.type} — dropping job`);
    return;
  }

  // 24h dedup by dedupeKey (matches BullMQ jobId behaviour)
  if (payload.dedupeKey) {
    const lastSeen = slot.seen.get(payload.dedupeKey);
    if (lastSeen && Date.now() - lastSeen < DEDUP_WINDOW_MS) {
      // Duplicate inside the window — silently drop
      return;
    }
    slot.seen.set(payload.dedupeKey, Date.now());

    // Opportunistic prune so the dedup map doesn't grow unbounded
    if (slot.seen.size > SEEN_PRUNE_THRESHOLD) {
      const cutoff = Date.now() - DEDUP_WINDOW_MS;
      for (const [k, t] of slot.seen) {
        if (t < cutoff) slot.seen.delete(k);
      }
    }
  }

  slot.pending.push(payload);
  // Defer to next tick so the HTTP handler returns quickly
  setImmediate(() => drain(slot, payload.type));
}

async function drain(slot: Slot, type: JobType): Promise<void> {
  while (slot.pending.length > 0 && slot.active < slot.concurrency) {
    const payload = slot.pending.shift();
    if (!payload) break;
    slot.active += 1;
    // Fire each handler without awaiting so multiple can run in parallel up to concurrency
    void runOne(slot, type, payload);
  }
}

async function runOne(slot: Slot, type: JobType, payload: JobPayload): Promise<void> {
  try {
    await slot.handler(payload);
  } catch (err: any) {
    // Wrapped handler already persisted scrape_jobs row + logs; swallow here
    // so an unhandled rejection doesn't crash the Node process.
    console.warn(`[inproc:${type}]`, err?.message ?? err);
  } finally {
    slot.active = Math.max(0, slot.active - 1);
    // Keep draining if more work is pending
    if (slot.pending.length > 0) {
      setImmediate(() => drain(slot, type));
    }
  }
}

/**
 * Stats per queue — used by /stats endpoint when running in in-process mode.
 */
export function getInProcessStats(): Record<string, { waiting: number; active: number; concurrency: number }> {
  const out: Record<string, { waiting: number; active: number; concurrency: number }> = {};
  for (const [type, slot] of slots) {
    out[type] = {
      waiting: slot.pending.length,
      active: slot.active,
      concurrency: slot.concurrency,
    };
  }
  return out;
}

/**
 * Drain pending jobs gracefully on shutdown. Resolves when all active jobs
 * complete or the timeout elapses.
 */
export async function drainAll(timeoutMs = 15_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    let totalActive = 0;
    for (const slot of slots.values()) totalActive += slot.active;
    if (totalActive === 0) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
