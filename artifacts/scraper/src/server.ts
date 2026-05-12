// server.ts
// Hono HTTP server — single entrypoint for the Fly.io machine.
// Hosts both the public endpoints (/enqueue, /health, /stats) AND the
// BullMQ Workers in the same Node process (saves a machine = saves $5/mo).
//
// Two operating modes (auto-selected based on REDIS_URL):
//
//   in-process mode  — no Redis. Jobs run in this Node event loop with
//                      concurrency caps. Zero external infra beyond Supabase.
//                      Suitable for MVP / hobby deployments.
//
//   bullmq mode      — REDIS_URL set. Jobs persist in Redis with exponential-
//                      backoff retries and dead-letter. Scales horizontally.
//
// Startup is fault-tolerant: if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are
// missing the HTTP server still starts but workers are NOT registered.
// /health returns 503 with the exact missing-keys list and a paste-ready
// `fly secrets set` hint.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { z } from 'zod';
import { config, validateConfig, logConfigStatus } from './lib/config.js';
import { verifyHmac } from './lib/hmacAuth.js';
import { QUEUE_MODE } from './queues.js';
import type { JobPayload } from './lib/types.js';

// ── Boot-time validation ─────────────────────────────────────────────────────
console.log(`[scraper] booting on port ${config.port}…`);
console.log(`[scraper] queue mode: ${QUEUE_MODE}`);
const configValid = logConfigStatus();

// Lazy imports for modules that touch Redis/Supabase — only loaded when config
// is valid so a missing key doesn't crash a downstream module at import time.
let enqueueJob:     typeof import('./queues.js')['enqueueJob']     | null = null;
let getQueueStats:  typeof import('./queues.js')['getQueueStats']  | null = null;
let startAllWorkers: typeof import('./workers/index.js')['startAllWorkers'] | null = null;
let stopAllWorkers:  typeof import('./workers/index.js')['stopAllWorkers']  | null = null;

if (configValid) {
  const queues  = await import('./queues.js');
  const workers = await import('./workers/index.js');
  enqueueJob      = queues.enqueueJob;
  getQueueStats   = queues.getQueueStats;
  startAllWorkers = workers.startAllWorkers;
  stopAllWorkers  = workers.stopAllWorkers;
}

const app = new Hono();

// ── Health ──────────────────────────────────────────────────────────────────
// Returns 503 when required env vars are missing so Fly.io's health-check sees
// the machine as unhealthy (rather than restarting it endlessly). The body
// lists the exact missing keys + a fly-secrets hint + which optional features
// are running degraded.
app.get('/health', async (c) => {
  const status = validateConfig();
  if (!status.ok) {
    return c.json({
      ok:      false,
      status:  'misconfigured',
      service: 'humansheild-scraper',
      missing: status.missing,
      hmacMissingInProd: status.hmacMissingInProd,
      hint:    status.flyHint,
      docs:    'See artifacts/scraper/README.md → Minimum config.',
      timestamp: new Date().toISOString(),
    }, 503);
  }
  return c.json({
    ok:        true,
    status:    'healthy',
    service:   'humansheild-scraper',
    queueMode: QUEUE_MODE,
    degraded:  status.degraded,                       // [] when nothing is degraded
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  });
});

// ── Stats (Bearer-protected for operators) ──────────────────────────────────
app.get('/stats', async (c) => {
  if (!configValid || !getQueueStats) {
    return c.json({ error: 'misconfigured', missing: validateConfig().missing }, 503);
  }
  const auth = c.req.header('authorization') ?? '';
  if (auth !== `Bearer ${config.hmac.sharedSecret}`) {
    return c.json({ error: 'unauthorised' }, 401);
  }
  const queues = await getQueueStats();
  return c.json({ queueMode: QUEUE_MODE, queues, fetchedAt: new Date().toISOString() });
});

// ── Enqueue (HMAC-protected — supabase EF + frontend triggerScraperForCompany) ──
const EnqueueBody = z.object({
  jobs: z.array(z.object({
    type: z.enum([
      'careerPageScrape', 'linkedinJobs', 'newsExtract', 'secEdgarPoll',
      'layoffTracker', 'warnActFetch', 'redditMentions', 'githubActivity',
      'glassdoorScrape', 'signalCompose',
    ]),
    companyName: z.string().min(1).max(200),
    ticker:      z.string().max(20).optional(),
    cik:         z.string().max(20).optional(),
    targetUrl:   z.string().url().max(2048).optional(),
    dedupeKey:   z.string().max(64).optional(),
    metadata:    z.record(z.unknown()).optional(),
  })).min(1).max(200),
});

app.post('/enqueue', async (c) => {
  // Refuse work when config is broken — better to fail fast than queue jobs
  // that can never run.
  if (!configValid || !enqueueJob) {
    return c.json({
      error:   'misconfigured',
      detail:  'scraper is running but required env vars are missing — see /health',
      missing: validateConfig().missing,
    }, 503);
  }

  const rawBody = await c.req.text();
  const ts  = c.req.header('x-hp-timestamp');
  const sig = c.req.header('x-hp-signature');

  const auth = verifyHmac(rawBody, ts, sig);
  if (!auth.ok) {
    console.warn('[enqueue] HMAC rejected:', auth.reason);
    return c.json({ error: 'hmac_invalid', reason: auth.reason }, 401);
  }

  let parsed: z.infer<typeof EnqueueBody>;
  try {
    parsed = EnqueueBody.parse(JSON.parse(rawBody));
  } catch (err: any) {
    return c.json({ error: 'invalid_payload', detail: err?.message ?? 'bad json' }, 400);
  }

  let queued = 0;
  const errors: string[] = [];
  for (const job of parsed.jobs) {
    try {
      await enqueueJob(job as JobPayload);
      queued += 1;
    } catch (err: any) {
      errors.push(`${job.type}:${job.companyName} ${err?.message ?? 'unknown'}`);
    }
  }

  return c.json(
    { ok: errors.length === 0, queued, total: parsed.jobs.length, queueMode: QUEUE_MODE, errors },
    errors.length === 0 ? 200 : 207,
  );
});

// ── Fallback ────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'not_found' }, 404));

// ── Start ───────────────────────────────────────────────────────────────────
if (configValid && startAllWorkers) {
  await startAllWorkers();
  console.log(`[scraper] workers started — mode=${QUEUE_MODE} HTTP-concurrency=${config.concurrency.http} browser-concurrency=${config.concurrency.browser}`);
} else {
  console.log('[scraper] workers NOT started (config invalid) — /health will report 503');
}

const server = serve({ fetch: app.fetch, port: config.port });
console.log(`[scraper] HTTP listening on :${config.port}`);

// Graceful shutdown — Fly.io sends SIGTERM 30s before machine stop
const shutdown = async (signal: string) => {
  console.log(`[scraper] received ${signal}, draining…`);
  try {
    if (stopAllWorkers) await stopAllWorkers();
    server.close(() => {
      console.log('[scraper] http server closed; exiting.');
      process.exit(0);
    });
  } catch (err: any) {
    console.warn('[scraper] shutdown error:', err?.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
