// worker-entry.ts
// Workers-only process entrypoint. Use this when you want to run BullMQ
// workers on a separate Fly.io machine from the HTTP /enqueue server — for
// example to scale browser scraping horizontally without scaling the inbound
// listener.
//
// This entrypoint is ONLY useful in BullMQ mode (multiple machines sharing a
// Redis queue). In in-process mode it serves no purpose because workers must
// run in the same process as the /enqueue HTTP handler.
//
// To use:
//   fly machine run . --command "node dist/worker-entry.js" --region bom

import { config, logConfigStatus } from './lib/config.js';
import { QUEUE_MODE } from './queues.js';

console.log('[worker-entry] starting workers-only process…');
console.log(`[worker-entry] queue mode: ${QUEUE_MODE}`);

if (QUEUE_MODE === 'in-process') {
  console.error('[worker-entry] ERROR: this entrypoint requires BullMQ mode (REDIS_URL set).');
  console.error('[worker-entry] In-process mode workers must run inside server.ts.');
  process.exit(78); // EX_CONFIG
}

if (!logConfigStatus()) {
  console.error('[worker-entry] exiting due to invalid config.');
  process.exit(78);
}

// Lazy import — Redis connection only initialises after config check passes.
const { startAllWorkers, stopAllWorkers } = await import('./workers/index.js');

console.log(`[worker-entry] HTTP-concurrency=${config.concurrency.http} browser-concurrency=${config.concurrency.browser}`);
await startAllWorkers();

// Keep the event loop alive — BullMQ Workers stay registered with the queue
// but Node has no other long-running handle on this entrypoint.
const heartbeat = setInterval(() => { /* keep-alive */ }, 60_000);

const shutdown = async (signal: string) => {
  console.log(`[worker-entry] received ${signal}, draining…`);
  clearInterval(heartbeat);
  try {
    await stopAllWorkers();
    console.log('[worker-entry] workers drained; exiting.');
    process.exit(0);
  } catch (err: any) {
    console.warn('[worker-entry] shutdown error:', err?.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
