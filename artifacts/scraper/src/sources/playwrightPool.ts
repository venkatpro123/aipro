// playwrightPool.ts
// Single-Chromium-instance pool with a mutex so only one job uses the browser
// at a time. We run on a 2GB Fly.io machine — concurrent Chromium pages
// quickly exhaust memory and trigger OOM kills. BullMQ enforces this at the
// worker concurrency level too, but this is the defence-in-depth layer in
// case a future contributor sets QUEUE_CONCURRENCY_BROWSER > 1 by mistake.
//
// Random delays + user-agent rotation are applied here to dodge basic bot
// detection. For LinkedIn we add an extra cookie warmup step in the worker.

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const USER_AGENTS = [
  // Recent Chromium UAs from a few platforms — rotated per page
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

let _browser: Browser | null = null;
let _busy = false;
const _waiters: Array<() => void> = [];

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote',
      '--disable-gpu',
    ],
  });
  return _browser;
}

function acquireLock(): Promise<void> {
  if (!_busy) {
    _busy = true;
    return Promise.resolve();
  }
  return new Promise<void>(resolve => _waiters.push(resolve));
}

function releaseLock(): void {
  const next = _waiters.shift();
  if (next) {
    next();
  } else {
    _busy = false;
  }
}

export interface PageRunOptions {
  /** Override default 30s timeout — increase for slow JS-heavy sites. */
  timeoutMs?: number;
  /** Extra HTTP headers (set on the context, not the page). */
  extraHTTPHeaders?: Record<string, string>;
  /** When true, do not wait for networkidle — return as soon as the DOM is ready. */
  skipNetworkIdle?: boolean;
}

/**
 * Run `fn` with a fresh BrowserContext + Page. Auto-closes context on return.
 * Serialised — only one caller at a time inside the same Node process.
 */
export async function withPage<T>(
  fn: (page: Page) => Promise<T>,
  opts: PageRunOptions = {},
): Promise<T> {
  await acquireLock();
  let context: BrowserContext | null = null;
  try {
    const browser = await getBrowser();
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    context = await browser.newContext({
      userAgent: ua,
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      extraHTTPHeaders: opts.extraHTTPHeaders,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(opts.timeoutMs ?? 30_000);
    return await fn(page);
  } finally {
    if (context) {
      try { await context.close(); } catch { /* ignore */ }
    }
    releaseLock();
  }
}

/** Hard restart the browser — call when memory rises above 1.6GB. */
export async function recycleBrowser(): Promise<void> {
  if (_browser) {
    try { await _browser.close(); } catch { /* ignore */ }
    _browser = null;
  }
}

/** Random delay (ms) for politeness between page interactions. */
export function jitter(minMs = 1000, maxMs = 3000): Promise<void> {
  const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
  return new Promise(resolve => setTimeout(resolve, ms));
}
