// workers/index.ts
// Registers worker handlers — works in both queue modes:
//
//   BullMQ mode      — creates a Worker per JobType bound to its Redis queue.
//                      BullMQ handles retries, exponential backoff, DLQ.
//
//   In-process mode  — registers the same wrapped handler with the in-process
//                      queue runner. Zero external deps.
//
// Both modes share the same `wrappedHandler` so behaviour matches: each job
// is logged to scrape_jobs, the company's last_scraped_at is touched, and
// configured follow-up enqueues a signalCompose job after successful raw
// scrapes.

import type { Job, Worker } from 'bullmq';
import { QUEUE_MODE, enqueueJob, createBullmqWorker } from '../queues.js';
import { config } from '../lib/config.js';
import { logJobResult, markCompanyScraped } from '../lib/scrapeJobLog.js';
import { registerHandler as registerInProcess, drainAll as drainInProcess } from '../lib/inProcessQueue.js';
import type { JobPayload, JobType, JobResult } from '../lib/types.js';

import { secEdgarWorker }     from './secEdgarWorker.js';
import { redditWorker }        from './redditWorker.js';
import { githubWorker }        from './githubWorker.js';
import { warnActWorker }       from './warnActWorker.js';
import { layoffTrackerWorker } from './layoffTrackerWorker.js';
import { newsWorker }          from './newsWorker.js';
import { careerPageWorker }    from './careerPageWorker.js';
import { linkedinWorker }      from './linkedinWorker.js';
import { glassdoorWorker }     from './glassdoorWorker.js';
import { signalComposeWorker } from './signalComposeWorker.js';

type RawHandler = (p: JobPayload) => Promise<JobResult>;

interface HandlerConfig {
  fn:          RawHandler;
  concurrency: number;
  /** When true, on success this worker enqueues a downstream signalCompose job. */
  followUp:    boolean;
}

const HANDLERS: Record<JobType, HandlerConfig> = {
  secEdgarPoll:     { fn: secEdgarWorker,     concurrency: config.concurrency.http,    followUp: true  },
  redditMentions:   { fn: redditWorker,        concurrency: config.concurrency.http,    followUp: true  },
  githubActivity:   { fn: githubWorker,        concurrency: config.concurrency.http,    followUp: false },
  warnActFetch:     { fn: warnActWorker,       concurrency: config.concurrency.http,    followUp: true  },
  layoffTracker:    { fn: layoffTrackerWorker, concurrency: config.concurrency.http,    followUp: true  },
  newsExtract:      { fn: newsWorker,          concurrency: config.concurrency.http,    followUp: true  },
  careerPageScrape: { fn: careerPageWorker,    concurrency: config.concurrency.browser, followUp: false },
  linkedinJobs:     { fn: linkedinWorker,      concurrency: config.concurrency.browser, followUp: false },
  glassdoorScrape:  { fn: glassdoorWorker,     concurrency: config.concurrency.browser, followUp: false },
  signalCompose:    { fn: signalComposeWorker, concurrency: 1,                          followUp: false },
};

/**
 * Wraps the raw handler with bookkeeping: timing, scrape_jobs row, company
 * last_scraped_at update, follow-up enqueue. Used by both queue modes.
 */
function buildWrappedHandler(name: JobType, cfg: HandlerConfig): RawHandler {
  return async (payload: JobPayload): Promise<JobResult> => {
    const startedAt = Date.now();
    let result: JobResult;
    try {
      result = await cfg.fn(payload);
    } catch (err: any) {
      result = {
        ok:          false,
        errorKind:   'parse_error',
        errorMessage: err?.message ?? String(err),
      };
    }

    // Always log to scrape_jobs — best-effort, never throws
    await logJobResult(payload, result, startedAt);

    if (result.ok) {
      if (payload.companyName) await markCompanyScraped(payload.companyName);
      if (cfg.followUp && payload.companyName) {
        await enqueueJob({
          type:        'signalCompose',
          companyName: payload.companyName,
          metadata:    { triggeredBy: name },
        }).catch(err => console.warn('[workers] follow-up enqueue failed:', err?.message));
      }
    }

    return result;
  };
}

// ── BullMQ worker bookkeeping (only used in bullmq mode) ────────────────────
const _bullmqWorkers: Worker<JobPayload>[] = [];

export async function startAllWorkers(): Promise<void> {
  for (const [name, cfg] of Object.entries(HANDLERS) as [JobType, HandlerConfig][]) {
    const wrapped = buildWrappedHandler(name, cfg);

    if (QUEUE_MODE === 'in-process') {
      registerInProcess(name, wrapped, cfg.concurrency);
      console.log(`[worker:${name}] registered (in-process, concurrency=${cfg.concurrency})`);
      continue;
    }

    // BullMQ mode — create a Worker that wraps `wrapped`. On throw, BullMQ
    // re-queues with exponential backoff (configured in queues.ts).
    const w = await createBullmqWorker(
      name,
      async (job: Job<JobPayload>) => {
        const result = await wrapped(job.data);
        // BullMQ retries on throw; mirror that contract.
        if (!result.ok) throw new Error(result.errorMessage ?? `worker ${name} failed`);
        return result;
      },
      cfg.concurrency,
    );
    w.on('error',  (err) => console.warn(`[worker:${name}] error:`, err.message));
    w.on('failed', (_job, err) => console.warn(`[worker:${name}] failed:`, err.message));
    w.on('ready',  () => console.log(`[worker:${name}] ready (bullmq, concurrency=${cfg.concurrency})`));
    _bullmqWorkers.push(w);
  }
  console.log(`[workers] started ${Object.keys(HANDLERS).length} handlers (mode=${QUEUE_MODE})`);
}

export async function stopAllWorkers(): Promise<void> {
  if (QUEUE_MODE === 'in-process') {
    await drainInProcess(15_000);
    return;
  }
  await Promise.all(_bullmqWorkers.map(w => w.close()));
  _bullmqWorkers.length = 0;
}
