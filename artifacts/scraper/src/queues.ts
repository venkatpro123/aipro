// queues.ts
// Dual-mode queue layer:
//
//   BullMQ mode      — when REDIS_URL is set. Production-grade: retries with
//                      exponential backoff, dead-letter, persistence across
//                      restarts, cross-machine visibility.
//
//   In-process mode  — when REDIS_URL is empty. Zero external deps. Jobs run
//                      in the same Node event loop with concurrency caps that
//                      mirror the BullMQ config. Suitable for MVP / hobby
//                      deploys where standing up Redis isn't justified.
//
// The mode is decided once at module load based on `config.redis.url`. The
// rest of the codebase (workers, server) calls `enqueueJob()` and
// `getQueueStats()` and stays oblivious to which backend is active.

import type { Job, Queue, QueueOptions, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { config } from './lib/config.js';
import type { JobPayload, JobType } from './lib/types.js';
import { enqueueInProcess, getInProcessStats } from './lib/inProcessQueue.js';

export type QueueMode = 'bullmq' | 'in-process';

export const QUEUE_MODE: QueueMode = config.redis.url ? 'bullmq' : 'in-process';

const QUEUE_NAMES: JobType[] = [
  'careerPageScrape',
  'linkedinJobs',
  'newsExtract',
  'secEdgarPoll',
  'layoffTracker',
  'warnActFetch',
  'redditMentions',
  'githubActivity',
  'glassdoorScrape',
  'signalCompose',
];

// ── BullMQ resources (lazy — only created in bullmq mode) ────────────────────
let _redis: Redis | null = null;
let _bullmqMod: typeof import('bullmq') | null = null;
const _queues = new Map<JobType, Queue<JobPayload>>();

async function getBullmqMod(): Promise<typeof import('bullmq')> {
  if (_bullmqMod) return _bullmqMod;
  _bullmqMod = await import('bullmq');
  return _bullmqMod;
}

export async function getRedis(): Promise<Redis> {
  if (QUEUE_MODE !== 'bullmq') {
    throw new Error('getRedis() called in in-process mode — caller should not need Redis');
  }
  if (_redis) return _redis;
  const { default: IORedis } = await import('ioredis');
  _redis = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    keepAlive: 10_000,
  });
  _redis.on('error', (err) => console.warn('[redis]', err.message));
  return _redis;
}

const DEFAULT_JOB_OPTIONS: QueueOptions['defaultJobOptions'] = {
  attempts: 3,
  backoff:  { type: 'exponential', delay: 60_000 },
  removeOnComplete: { count: 1000, age: 86_400 },
  removeOnFail:     { count: 500,  age: 7 * 86_400 },
};

// Audit-blocking jobs run while a human is actively waiting on the audit pipeline.
// More attempts (anti-bot retries) but TIGHT backoff so we don't burn the
// quorum-wait budget on idle delays. BullMQ priority=1 (lower number = higher).
const AUDIT_BLOCKING_JOB_OPTIONS: QueueOptions['defaultJobOptions'] = {
  attempts: 5,
  backoff:  { type: 'exponential', delay: 3_000 },
  priority: 1,
  removeOnComplete: { count: 1000, age: 86_400 },
  removeOnFail:     { count: 500,  age: 7 * 86_400 },
};

async function getQueue(name: JobType): Promise<Queue<JobPayload>> {
  if (QUEUE_MODE !== 'bullmq') {
    throw new Error('getQueue() called in in-process mode');
  }
  const existing = _queues.get(name);
  if (existing) return existing;
  const { Queue } = await getBullmqMod();
  const conn = await getRedis();
  const q = new Queue<JobPayload>(name, { connection: conn, defaultJobOptions: DEFAULT_JOB_OPTIONS });
  _queues.set(name, q);
  return q;
}

// ── Public enqueue API ──────────────────────────────────────────────────────

/**
 * Enqueue a job. Returns immediately in both modes.
 *
 * BullMQ mode:     pushes onto Redis-backed queue; Worker picks it up.
 * In-process mode: hands the job to inProcessQueue; the registered handler
 *                  runs on next tick with concurrency caps.
 */
export async function enqueueJob(payload: JobPayload): Promise<void> {
  if (QUEUE_MODE === 'in-process') {
    enqueueInProcess(payload);
    return;
  }
  const q = await getQueue(payload.type);
  // Audit-blocking jobs get faster retries + queue-jump priority so the user
  // doesn't sit on a 60s backoff while their audit waits for quorum.
  const baseOpts = payload.priority === 'audit_blocking'
    ? AUDIT_BLOCKING_JOB_OPTIONS
    : undefined;
  const opts = {
    ...(baseOpts ?? {}),
    ...(payload.dedupeKey ? { jobId: payload.dedupeKey } : {}),
  };
  await q.add(`${payload.type}:${payload.companyName}`, payload, opts);
}

/**
 * Aggregate /stats data: per-queue depth (waiting+active+failed in BullMQ;
 * waiting+active+concurrency in in-process).
 */
export async function getQueueStats(): Promise<Record<string, Record<string, number>>> {
  if (QUEUE_MODE === 'in-process') {
    return getInProcessStats();
  }
  const result: Record<string, Record<string, number>> = {};
  for (const name of QUEUE_NAMES) {
    try {
      const q = await getQueue(name);
      const [waiting, active, failed] = await Promise.all([
        q.getWaitingCount(), q.getActiveCount(), q.getFailedCount(),
      ]);
      result[name] = { waiting, active, failed };
    } catch {
      result[name] = { waiting: -1, active: -1, failed: -1 };
    }
  }
  return result;
}

/**
 * Internal helper used by workers/index.ts. Lets the worker module spin up
 * BullMQ Workers without re-importing bullmq itself. Returns the Worker so
 * callers can attach `.on()` event handlers.
 */
export async function createBullmqWorker(
  name: JobType,
  handler: (job: Job<JobPayload>) => Promise<unknown>,
  concurrency: number,
): Promise<Worker<JobPayload>> {
  if (QUEUE_MODE !== 'bullmq') {
    throw new Error('createBullmqWorker() called in in-process mode');
  }
  const { Worker: BullmqWorker } = await getBullmqMod();
  const conn = await getRedis();
  return new BullmqWorker<JobPayload>(name, handler, { connection: conn, concurrency });
}
