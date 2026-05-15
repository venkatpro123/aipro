// rateLimiter.ts — DEBT-10 client adapter
//
// Calls the consume_token RPC and returns a structured outcome. Designed
// so call sites can either:
//
//   * "Hard gate" — refuse the operation if !allowed (used for audit
//     submissions, which are expensive).
//   * "Soft gate" — degrade rather than refuse (used for analytics
//     events: drop instead of fail).

import { supabase } from '../utils/supabase';
import { createLogger } from '../shared/logger';

const log = createLogger({ service: 'rate-limiter' });

export type RateLimitBucket =
  | 'audit'
  | 'scrape_trigger'
  | 'recalibration'
  | 'outcome_report'
  | 'shadow_admin_read';

export interface RateLimitResult {
  allowed: boolean;
  balance: number | null;
  capacity: number | null;
  retryAfterMs: number;
  /** True when the consume call failed open (no policy / RPC unavailable). */
  failedOpen: boolean;
}

const FAILED_OPEN_RESULT: RateLimitResult = {
  allowed: true,
  balance: null,
  capacity: null,
  retryAfterMs: 0,
  failedOpen: true,
};

/**
 * Attempt to consume one token (or `cost` tokens) from the bucket.
 * Returns an explicit RateLimitResult so callers can present UX
 * appropriate to "rate limited" vs "fail-open / not configured."
 *
 * Subject normally is the authenticated user's id. For anonymous flows,
 * pass a stable session-local anon id so the per-user budget still
 * applies to the same browser.
 */
export async function consumeToken(
  bucket: RateLimitBucket,
  subject: string,
  cost = 1,
): Promise<RateLimitResult> {
  if (!subject) {
    // Without a subject we cannot enforce per-user limits. Fail open
    // but warn — typically indicates a wiring bug.
    log.warn('consume_token.no_subject', { bucket, cost });
    return FAILED_OPEN_RESULT;
  }
  try {
    const { data, error } = await supabase.rpc('consume_token', {
      p_bucket_key: bucket,
      p_subject: subject,
      p_cost: cost,
    });
    if (error) {
      log.warn('consume_token.rpc_error', { bucket, message: error.message });
      return FAILED_OPEN_RESULT;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.allowed !== 'boolean') {
      return FAILED_OPEN_RESULT;
    }
    return {
      allowed: !!row.allowed,
      balance: typeof row.balance === 'number' ? row.balance : Number(row.balance ?? 0),
      capacity: typeof row.capacity === 'number' ? row.capacity : null,
      retryAfterMs: typeof row.retry_after_ms === 'number' ? row.retry_after_ms : 0,
      failedOpen: false,
    };
  } catch (err) {
    log.warn('consume_token.exception', { bucket, error: err });
    return FAILED_OPEN_RESULT;
  }
}

/**
 * Convenience wrapper that throws a typed error when the bucket is empty,
 * so call sites can `try/catch` instead of branching on `result.allowed`.
 */
export class RateLimitError extends Error {
  constructor(public readonly bucket: RateLimitBucket, public readonly retryAfterMs: number) {
    super(`Rate limit exceeded for "${bucket}"; retry in ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
  }
}

export async function enforceTokenOrThrow(
  bucket: RateLimitBucket,
  subject: string,
  cost = 1,
): Promise<void> {
  const result = await consumeToken(bucket, subject, cost);
  if (!result.allowed) {
    throw new RateLimitError(bucket, result.retryAfterMs);
  }
}
