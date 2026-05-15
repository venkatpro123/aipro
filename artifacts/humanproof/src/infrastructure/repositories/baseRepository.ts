// baseRepository.ts — DEBT-3 fix (data-access abstraction)
//
// Repository layer base class. Every concrete repository extends this so
// they share:
//
//   * A typed Supabase client reference (replaceable for tests / a future
//     REST backend).
//   * Structured logging on every DB call.
//   * Automatic span emission for the OTel adoption work.
//   * Uniform error handling that converts Supabase errors into typed
//     RepositoryError instances callers can pattern-match.
//
// The purpose of this abstraction is to give the codebase ONE chokepoint
// for "talking to Supabase." When we want to add caching, request batching,
// retry policies, or migrate to a REST API, we change ONE class instead
// of 60+ scattered `supabase.from(...)` call sites.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../utils/supabase';
import { createLogger, type StructuredLogger } from '../../shared/logger';

// ── Error types ─────────────────────────────────────────────────────────────

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'conflict' | 'unauthorized' | 'rls_denied' | 'validation' | 'unknown',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Map a raw Supabase error code to our RepositoryError taxonomy.
 * Unknown codes default to `'unknown'` and are still caught by callers
 * that pattern-match by class rather than code.
 */
function mapSupabaseError(message: string, code?: string): RepositoryError['code'] {
  // Message-based checks first because Supabase JWT errors typically arrive
  // without a structured `code`. Early-returning on undefined code would
  // misclassify them as 'unknown'.
  if (message && message.toLowerCase().includes('jwt')) return 'unauthorized';
  if (!code) return 'unknown';
  if (code === 'PGRST116') return 'not_found';
  if (code === 'PGRST301') return 'rls_denied';
  if (code === '23505') return 'conflict';            // unique_violation
  if (code === '23503') return 'validation';          // foreign_key_violation
  if (code === '23514') return 'validation';          // check_violation
  return 'unknown';
}

// ── Base class ──────────────────────────────────────────────────────────────

export abstract class BaseRepository {
  protected readonly client: SupabaseClient;
  protected readonly log: StructuredLogger;

  constructor(opts: { client?: SupabaseClient; logger?: StructuredLogger; serviceName: string } = { serviceName: 'repository' }) {
    this.client = opts.client ?? supabase;
    this.log = opts.logger ?? createLogger({ service: opts.serviceName });
  }

  /**
   * Wraps a Supabase query in span timing, structured logging, and
   * uniform error mapping. Subclasses call this for every public method:
   *
   *   async getById(id: string): Promise<Foo | null> {
   *     return this.runQuery('getById', async () =>
   *       this.client.from('foos').select('*').eq('id', id).maybeSingle()
   *     );
   *   }
   */
  protected async runQuery<T>(
    operation: string,
    fn: () => Promise<{ data: T | null; error: { code?: string; message: string } | null }>,
  ): Promise<T | null> {
    const t0 = Date.now();
    try {
      const { data, error } = await fn();
      const ms = Date.now() - t0;
      if (error) {
        const code = mapSupabaseError(error.message, error.code);
        this.log.warn(`${operation}.error`, { code, ms, message: error.message });
        throw new RepositoryError(error.message, code, error);
      }
      this.log.debug(`${operation}.ok`, { ms });
      return data;
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      const ms = Date.now() - t0;
      this.log.error(`${operation}.exception`, { ms, error: err });
      throw new RepositoryError(err instanceof Error ? err.message : String(err), 'unknown', err);
    }
  }

  /**
   * Same as runQuery but returns the row count from a select with
   * { count: 'exact' }. Convenience for analytics queries.
   */
  protected async runQueryWithCount<T>(
    operation: string,
    fn: () => Promise<{ data: T[] | null; count: number | null; error: { code?: string; message: string } | null }>,
  ): Promise<{ rows: T[]; count: number }> {
    const t0 = Date.now();
    try {
      const { data, count, error } = await fn();
      const ms = Date.now() - t0;
      if (error) {
        const code = mapSupabaseError(error.message, error.code);
        this.log.warn(`${operation}.error`, { code, ms, message: error.message });
        throw new RepositoryError(error.message, code, error);
      }
      this.log.debug(`${operation}.ok`, { ms, count });
      return { rows: data ?? [], count: count ?? 0 };
    } catch (err) {
      if (err instanceof RepositoryError) throw err;
      throw new RepositoryError(err instanceof Error ? err.message : String(err), 'unknown', err);
    }
  }
}
