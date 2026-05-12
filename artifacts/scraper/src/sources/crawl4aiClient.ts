// crawl4aiClient.ts
// Node ↔ Python IPC wrapper for the Crawl4AI subprocess.
//
// Why a subprocess (not a long-lived Python server):
//   - Crawl4AI uses its own Playwright instance internally — wrapping it in
//     a Flask/FastAPI service would mean a second always-running container,
//     doubling our Fly.io cost.
//   - A one-shot subprocess per extraction keeps memory predictable: Python
//     exits, browser is killed, no leaks accumulate across hundreds of jobs.
//
// Wire format:
//   stdin:  JSON   { url, schema, mode: "article" | "html_diff" }
//   stdout: JSON   { ok, fields?, error? }
//   Process exits with 0 even on failure — we read `ok` from JSON.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export interface Crawl4AIRequest {
  url: string;
  mode: 'article' | 'html_diff' | 'company_page';
  /** Optional JSON-schema for structured extraction (Crawl4AI uses LLMExtractionStrategy when present). */
  schema?: Record<string, unknown>;
}

export interface Crawl4AIResponse {
  ok: boolean;
  fields?: Record<string, unknown>;
  rawText?: string;
  error?: string;
}

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const SCRIPT_PATH = process.env.CRAWL4AI_SCRIPT || './python/crawl4ai_extract.py';

export async function runCrawl4AI(req: Crawl4AIRequest, timeoutMs = 30_000): Promise<Crawl4AIResponse> {
  return new Promise<Crawl4AIResponse>(async (resolve) => {
    const child = spawn(PYTHON_BIN, [SCRIPT_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const done = (resp: Crawl4AIResponse) => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGKILL'); } catch { /* already exited */ }
      resolve(resp);
    };

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => done({ ok: false, error: `spawn failed: ${err.message}` }));
    child.on('close', () => {
      try {
        const parsed = JSON.parse(stdout.trim());
        done(parsed);
      } catch {
        done({
          ok: false,
          error: stderr.slice(0, 500) || `non-JSON stdout: ${stdout.slice(0, 200)}`,
        });
      }
    });

    // Send the request and close stdin so Python's read() returns.
    try {
      child.stdin.write(JSON.stringify(req));
      child.stdin.end();
    } catch (err: any) {
      done({ ok: false, error: `stdin write failed: ${err?.message ?? err}` });
      return;
    }

    // Hard timeout — kill the subprocess if it stalls.
    await delay(timeoutMs);
    done({ ok: false, error: `crawl4ai timeout after ${timeoutMs}ms` });
  });
}
