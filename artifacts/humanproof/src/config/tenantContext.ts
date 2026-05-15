// tenantContext.ts — DEBT-7 client-side tenant resolver
//
// The DB migration added `tenant_id` to every user-data table with a
// SINGLE_TENANT default. This module is the corresponding client-side
// piece: a deterministic function for "which tenant does this request
// belong to?" so AuditContext, repositories, and event emissions all
// agree.
//
// Resolution strategy:
//   1. If a window-level `__HP_TENANT__` override is set (used by E2E
//      tests and white-label preview tools), honour it.
//   2. Read the auth user's first tenant membership from
//      tenant_memberships. Cached per session.
//   3. Fall back to SINGLE_TENANT_ID.
//
// The repository layer remains tenant-agnostic for now — RLS handles
// the actual row scoping. This file's job is to make the tenant
// available so:
//   * future explicit `tenant_id` filters can be added trivially,
//   * structured logs carry tenant context,
//   * the AuditContext stamps audits with the right tenant.

import { supabase } from '../utils/supabase';
import { SINGLE_TENANT_ID, type TenantId } from '../domain/pipeline/auditContext';
import { createLogger } from '../shared/logger';

const log = createLogger({ service: 'tenant-context' });

// ── Cache ───────────────────────────────────────────────────────────────────

let cachedTenant: TenantId | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

// ── Window override ─────────────────────────────────────────────────────────

interface TenantOverrideWindow {
  __HP_TENANT__?: string;
}

function readOverride(): TenantId | null {
  if (typeof window === 'undefined') return null;
  const w = window as TenantOverrideWindow;
  if (w.__HP_TENANT__ && typeof w.__HP_TENANT__ === 'string') {
    return w.__HP_TENANT__ as TenantId;
  }
  return null;
}

// ── Resolver ────────────────────────────────────────────────────────────────

/**
 * Resolve the active tenant id. Async because it may hit the DB once
 * per session; subsequent calls within the TTL return the cached value.
 *
 * NEVER throws — falls back to SINGLE_TENANT_ID on any error.
 */
export async function resolveTenantId(): Promise<TenantId> {
  const override = readOverride();
  if (override) return override;

  const now = Date.now();
  if (cachedTenant && now - cachedAt < TTL_MS) return cachedTenant;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      cachedTenant = SINGLE_TENANT_ID;
      cachedAt = now;
      return cachedTenant;
    }
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      log.warn('resolve.lookup_failed', { error: error.message });
      cachedTenant = SINGLE_TENANT_ID;
      cachedAt = now;
      return cachedTenant;
    }
    const tenant = (data as { tenant_id?: string } | null)?.tenant_id;
    cachedTenant = (tenant ?? SINGLE_TENANT_ID) as TenantId;
    cachedAt = now;
    return cachedTenant;
  } catch (err) {
    log.warn('resolve.exception', { error: err instanceof Error ? err.message : String(err) });
    cachedTenant = SINGLE_TENANT_ID;
    cachedAt = now;
    return cachedTenant;
  }
}

/**
 * Synchronous read of the cached tenant. Use only after `resolveTenantId`
 * has run at least once in the session. Falls back to SINGLE_TENANT_ID
 * if the cache is cold — semantically equivalent to "the user hasn't
 * been provisioned a tenant yet."
 */
export function tenantIdSync(): TenantId {
  return readOverride() ?? cachedTenant ?? SINGLE_TENANT_ID;
}

/** Test-only: clear cache. */
export function __resetTenantContextForTesting(): void {
  cachedTenant = null;
  cachedAt = 0;
}
