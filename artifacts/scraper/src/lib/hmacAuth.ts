// hmacAuth.ts
// Validates that incoming /enqueue requests come from the trusted
// supabase scraper-enqueue Edge Function. Without this, anyone who knows the
// Fly.io URL could enqueue scraping jobs and burn Crawl4AI/Playwright time.
//
// Wire format (per request):
//   header  X-HP-Timestamp: <unix-ms>
//   header  X-HP-Signature: hex(sha256(timestamp + "." + body))   ← signed with shared secret
//
// Replay protection: timestamps older than 5 minutes are rejected.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

const MAX_SKEW_MS = 5 * 60 * 1000;

export function signRequestBody(timestampMs: number, body: string): string {
  return createHmac('sha256', config.hmac.sharedSecret)
    .update(`${timestampMs}.${body}`)
    .digest('hex');
}

export interface HmacVerifyResult {
  ok: boolean;
  reason?: 'missing_headers' | 'stale_timestamp' | 'bad_signature' | 'malformed';
}

export function verifyHmac(
  rawBody: string,
  timestampHeader: string | undefined,
  signatureHeader: string | undefined,
): HmacVerifyResult {
  if (!timestampHeader || !signatureHeader) return { ok: false, reason: 'missing_headers' };
  const ts = parseInt(timestampHeader, 10);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'malformed' };
  if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) return { ok: false, reason: 'stale_timestamp' };

  const expected = signRequestBody(ts, rawBody);
  // Equal-length compare with timingSafeEqual to defeat timing oracles.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  if (a.length !== b.length) return { ok: false, reason: 'bad_signature' };
  try {
    return timingSafeEqual(a, b) ? { ok: true } : { ok: false, reason: 'bad_signature' };
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
}
