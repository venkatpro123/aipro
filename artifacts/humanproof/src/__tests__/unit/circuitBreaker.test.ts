// circuitBreaker.test.ts — Phase 3
//
// Full state-machine coverage for apiCircuitBreaker.ts:
//   stockCircuitKeyForTicker, isCallAllowed, recordSuccess/Failure,
//   getCachedResponse, getCircuitSnapshot, withCircuitBreaker,
//   getApiQuotaStatus, reset functions, ageLabel paths,
//   syncCircuitStateFromSupabase.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Supabase must be mocked before the module is imported
vi.mock('../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({ then: vi.fn() })),
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ data: [] }),
      })),
    })),
  },
}));

import { supabase } from '../../utils/supabase';
import {
  stockCircuitKeyForTicker,
  isCallAllowed,
  recordSuccess,
  recordFailure,
  getCachedResponse,
  getCircuitSnapshot,
  withCircuitBreaker,
  getApiQuotaStatus,
  resetCircuit,
  resetAllOpenCircuits,
  resetAllCircuits,
  syncCircuitStateFromSupabase,
  type CircuitApiName,
} from '../../services/apiCircuitBreaker';

const API: CircuitApiName = 'yahoo-finance-us';
const API2: CircuitApiName = 'naukri';
const API3: CircuitApiName = 'bse';

// ─── helpers ──────────────────────────────────────────────────────────────────

function openAndExpire(api: CircuitApiName) {
  recordFailure(api, 'e1');
  recordFailure(api, 'e2');
  recordFailure(api, 'e3');
  // Backdate openedAt past the 5-minute timeout
  const key = `hp_circuit_${api}`;
  const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
  stored.openedAt = Date.now() - 6 * 60_000;
  localStorage.setItem(key, JSON.stringify(stored));
}

function backdateCachedAt(api: CircuitApiName, msAgo: number) {
  const key = `hp_circuit_cache_${api}`;
  const raw = JSON.parse(localStorage.getItem(key) ?? '{}');
  raw.cachedAt = Date.now() - msAgo;
  localStorage.setItem(key, JSON.stringify(raw));
}

// ─── stockCircuitKeyForTicker ─────────────────────────────────────────────────

describe('stockCircuitKeyForTicker', () => {
  it('null → yahoo-finance-us', () => {
    expect(stockCircuitKeyForTicker(null)).toBe('yahoo-finance-us');
  });
  it('undefined → yahoo-finance-us', () => {
    expect(stockCircuitKeyForTicker(undefined)).toBe('yahoo-finance-us');
  });
  it('plain US ticker → yahoo-finance-us', () => {
    expect(stockCircuitKeyForTicker('AAPL')).toBe('yahoo-finance-us');
  });
  it('MSFT (no suffix) → yahoo-finance-us', () => {
    expect(stockCircuitKeyForTicker('MSFT')).toBe('yahoo-finance-us');
  });
  it('.NS (NSE India) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('RELIANCE.NS')).toBe('yahoo-finance-global');
  });
  it('.BO (BSE India) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('SBIN.BO')).toBe('yahoo-finance-global');
  });
  it('.L (London) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('SHEL.L')).toBe('yahoo-finance-global');
  });
  it('.SI (Singapore) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('DBS.SI')).toBe('yahoo-finance-global');
  });
  it('.AX (Australia) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('BHP.AX')).toBe('yahoo-finance-global');
  });
  it('.HK (Hong Kong) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('0005.HK')).toBe('yahoo-finance-global');
  });
  it('.TO (Toronto) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('RY.TO')).toBe('yahoo-finance-global');
  });
  it('.DE (Germany) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('SAP.DE')).toBe('yahoo-finance-global');
  });
  it('.PA (Paris) → yahoo-finance-global', () => {
    expect(stockCircuitKeyForTicker('MC.PA')).toBe('yahoo-finance-global');
  });
});

// ─── initial state ─────────────────────────────────────────────────────────

describe('initial circuit state', () => {
  beforeEach(() => { localStorage.clear(); });

  it('fresh API is CLOSED', () => {
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
  });
  it('fresh API allows calls', () => {
    expect(isCallAllowed(API)).toBe(true);
  });
  it('fresh API has no cached data', () => {
    expect(getCircuitSnapshot(API).hasCachedData).toBe(false);
  });
  it('fresh API cachedDataAgeMs is null', () => {
    expect(getCircuitSnapshot(API).cachedDataAgeMs).toBeNull();
  });
  it('fresh API cachedAgeLabel is null', () => {
    expect(getCircuitSnapshot(API).cachedAgeLabel).toBeNull();
  });
  it('fresh API msUntilProbe is 0', () => {
    expect(getCircuitSnapshot(API).msUntilProbe).toBe(0);
  });
  it('fresh API consecutiveFailures is 0', () => {
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(0);
  });
});

// ─── recordFailure state machine ──────────────────────────────────────────────

describe('recordFailure', () => {
  beforeEach(() => { localStorage.clear(); });

  it('1 failure keeps circuit CLOSED', () => {
    recordFailure(API, 'err1');
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
  });

  it('2 failures keeps circuit CLOSED', () => {
    recordFailure(API); recordFailure(API);
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
  });

  it('3 consecutive failures → OPEN', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(getCircuitSnapshot(API).state).toBe('OPEN');
  });

  it('OPEN circuit blocks isCallAllowed', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(isCallAllowed(API)).toBe(false);
  });

  it('consecutiveFailures increments correctly', () => {
    recordFailure(API);
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(1);
    recordFailure(API);
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(2);
    recordFailure(API);
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(3);
  });

  it('lastFailureAt is set after failure', () => {
    const before = Date.now();
    recordFailure(API);
    expect(getCircuitSnapshot(API).lastFailureAt).toBeGreaterThanOrEqual(before);
  });

  it('openedAt is set when circuit opens', () => {
    const before = Date.now();
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(getCircuitSnapshot(API).openedAt).toBeGreaterThanOrEqual(before);
  });

  it('different APIs have independent state', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(getCircuitSnapshot(API2).state).toBe('CLOSED');
  });
});

// ─── recordSuccess transitions ─────────────────────────────────────────────

describe('recordSuccess', () => {
  beforeEach(() => { localStorage.clear(); });

  it('resets consecutiveFailures to 0', () => {
    recordFailure(API); recordFailure(API);
    recordSuccess(API);
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(0);
  });

  it('state stays CLOSED after success', () => {
    recordSuccess(API);
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
  });

  it('caches response data', () => {
    recordSuccess(API, { price: 150 });
    expect(getCachedResponse(API)).not.toBeNull();
    expect((getCachedResponse<{ price: number }>(API)?.data as any).price).toBe(150);
  });

  it('success without data does not break state', () => {
    recordSuccess(API);
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
  });

  it('sets lastSuccessAt', () => {
    const before = Date.now();
    recordSuccess(API, { x: 1 });
    expect(getCircuitSnapshot(API).lastSuccessAt).toBeGreaterThanOrEqual(before);
  });

  it('clears openedAt', () => {
    recordSuccess(API);
    expect(getCircuitSnapshot(API).openedAt).toBeNull();
  });
});

// ─── HALF_OPEN after timeout ──────────────────────────────────────────────────

describe('HALF_OPEN after timeout', () => {
  beforeEach(() => { localStorage.clear(); });

  it('transitions OPEN → HALF_OPEN after 5 min', () => {
    openAndExpire(API);
    expect(getCircuitSnapshot(API).state).toBe('HALF_OPEN');
  });

  it('HALF_OPEN: first caller claims probe and is allowed', () => {
    openAndExpire(API);
    expect(isCallAllowed(API)).toBe(true);
  });

  it('HALF_OPEN: second concurrent caller is denied probe (probe in flight)', () => {
    openAndExpire(API);
    expect(isCallAllowed(API)).toBe(true);  // first caller claims probe
    expect(isCallAllowed(API)).toBe(false); // second caller denied — probe already in flight
  });

  it('HALF_OPEN: probe success → CLOSED', () => {
    openAndExpire(API);
    isCallAllowed(API); // claim probe
    recordSuccess(API, 'ok');
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
  });

  it('HALF_OPEN: probe failure → back to OPEN', () => {
    openAndExpire(API);
    isCallAllowed(API); // claim probe
    recordFailure(API, 'probe failed');
    expect(getCircuitSnapshot(API).state).toBe('OPEN');
  });

  it('HALF_OPEN msUntilProbe is 0 (timeout already elapsed)', () => {
    openAndExpire(API);
    expect(getCircuitSnapshot(API).msUntilProbe).toBe(0);
  });
});

// ─── getCachedResponse ────────────────────────────────────────────────────────

describe('getCachedResponse', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns null when no cache', () => {
    expect(getCachedResponse(API)).toBeNull();
  });

  it('returns cached data and timestamp after success', () => {
    const before = Date.now();
    recordSuccess(API, { ticker: 'AAPL', price: 150 });
    const cached = getCachedResponse<{ ticker: string; price: number }>(API);
    expect(cached?.data.ticker).toBe('AAPL');
    expect(cached?.cachedAt).toBeGreaterThanOrEqual(before);
  });
});

// ─── getCircuitSnapshot — ageLabel coverage ──────────────────────────────────

describe('getCircuitSnapshot ageLabel', () => {
  beforeEach(() => { localStorage.clear(); });

  it('"just now" for fresh cache (< 60s)', () => {
    recordSuccess(API, 'data');
    expect(getCircuitSnapshot(API).cachedAgeLabel).toBe('just now');
  });

  it('"N minute(s) ago" for cache 5 minutes old', () => {
    recordSuccess(API, 'data');
    backdateCachedAt(API, 5 * 60_000);
    expect(getCircuitSnapshot(API).cachedAgeLabel).toContain('minute');
  });

  it('"1 minute ago" singular', () => {
    recordSuccess(API, 'data');
    backdateCachedAt(API, 70_000); // ~1 min 10s
    expect(getCircuitSnapshot(API).cachedAgeLabel).toBe('1 minute ago');
  });

  it('"N hours ago" for 3-hour-old cache', () => {
    recordSuccess(API, 'data');
    backdateCachedAt(API, 3 * 60 * 60_000);
    expect(getCircuitSnapshot(API).cachedAgeLabel).toContain('hour');
  });

  it('"1 hour ago" singular', () => {
    recordSuccess(API, 'data');
    backdateCachedAt(API, 61 * 60_000); // 61 min
    expect(getCircuitSnapshot(API).cachedAgeLabel).toBe('1 hour ago');
  });

  it('"N days ago" for 2-day-old cache', () => {
    recordSuccess(API, 'data');
    backdateCachedAt(API, 2 * 24 * 60 * 60_000);
    expect(getCircuitSnapshot(API).cachedAgeLabel).toContain('day');
  });

  it('"1 day ago" singular', () => {
    recordSuccess(API, 'data');
    backdateCachedAt(API, 25 * 60 * 60_000); // 25h
    expect(getCircuitSnapshot(API).cachedAgeLabel).toBe('1 day ago');
  });

  it('OPEN circuit has msUntilProbe > 0', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(getCircuitSnapshot(API).msUntilProbe).toBeGreaterThan(0);
  });

  it('OPEN with fresh cache shows hasCachedData=true', () => {
    recordSuccess(API, 'x');
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(getCircuitSnapshot(API).hasCachedData).toBe(true);
  });
});

// ─── withCircuitBreaker ────────────────────────────────────────────────────────

describe('withCircuitBreaker', () => {
  beforeEach(() => { localStorage.clear(); });

  it('success path returns fresh data', async () => {
    const r = await withCircuitBreaker(API, async () => ({ stock: 42 }));
    expect(r.fromCircuitBreaker).toBe(false);
    expect(r.servedReason).toBe('fresh');
    expect((r.data as any).stock).toBe(42);
    expect(r.dataAgeSeconds).toBeNull();
  });

  it('success caches data for future fallbacks', async () => {
    await withCircuitBreaker(API, async () => ({ cached: true }));
    expect(getCachedResponse(API)?.data).toEqual({ cached: true });
  });

  it('fn returning null is treated as success without caching', async () => {
    const r = await withCircuitBreaker(API, async () => null);
    expect(r.fromCircuitBreaker).toBe(false);
    expect(r.servedReason).toBe('fresh');
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(0);
  });

  it('fn throwing → records failure, returns cached data', async () => {
    recordSuccess(API, { fallback: true });
    const r = await withCircuitBreaker(API, async () => { throw new Error('API down'); });
    expect(r.fromCircuitBreaker).toBe(true);
    expect(r.servedReason).toBe('cached_failure');
    expect((r.data as any)?.fallback).toBe(true);
  });

  it('fn throwing with no cache → data=null', async () => {
    const r = await withCircuitBreaker(API, async () => { throw new Error('no fallback'); });
    expect(r.fromCircuitBreaker).toBe(true);
    expect(r.data).toBeNull();
    expect(r.dataAgeSeconds).toBeNull();
  });

  it('fn throwing → dataAgeSeconds set when cache exists', async () => {
    recordSuccess(API, 'x');
    const r = await withCircuitBreaker(API, async () => { throw new Error('down'); });
    expect(r.dataAgeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('OPEN circuit returns cached data without calling fn', async () => {
    recordSuccess(API, { source: 'cache' });
    recordFailure(API); recordFailure(API); recordFailure(API);
    let called = false;
    const r = await withCircuitBreaker(API, async () => { called = true; return null; });
    expect(called).toBe(false);
    expect(r.fromCircuitBreaker).toBe(true);
    expect(r.servedReason).toBe('cached_open');
    expect((r.data as any)?.source).toBe('cache');
  });

  it('OPEN with no cache → data=null, servedReason=cached_open', async () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    const r = await withCircuitBreaker(API, async () => 'live');
    expect(r.data).toBeNull();
    expect(r.servedReason).toBe('cached_open');
  });

  it('OPEN circuit dataAgeSeconds set when cache exists', async () => {
    recordSuccess(API, 'x');
    recordFailure(API); recordFailure(API); recordFailure(API);
    const r = await withCircuitBreaker(API, async () => 'live');
    expect(r.dataAgeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('3 successive failures open the circuit', async () => {
    for (let i = 0; i < 3; i++) {
      await withCircuitBreaker(API2, async () => { throw new Error(`fail ${i}`); });
    }
    expect(getCircuitSnapshot(API2).state).toBe('OPEN');
  });
});

// ─── getApiQuotaStatus ────────────────────────────────────────────────────────

describe('getApiQuotaStatus', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns entries for all tracked APIs', () => {
    const status = getApiQuotaStatus();
    expect(Object.keys(status)).toContain('yahoo-finance-us');
    expect(Object.keys(status)).toContain('naukri');
    expect(Object.keys(status)).toContain('bse');
    expect(Object.keys(status)).toContain('sec-edgar');
  });

  it('OPEN circuit shows state=OPEN in quota status', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    expect(getApiQuotaStatus()[API].state).toBe('OPEN');
  });

  it('quota status includes hasCachedData', () => {
    recordSuccess(API, 'x');
    expect(getApiQuotaStatus()[API].hasCachedData).toBe(true);
  });
});

// ─── reset functions ──────────────────────────────────────────────────────────

describe('resetCircuit', () => {
  beforeEach(() => { localStorage.clear(); });

  it('resets OPEN circuit to CLOSED', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    resetCircuit(API);
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(0);
  });

  it('isCallAllowed is true after reset', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    resetCircuit(API);
    expect(isCallAllowed(API)).toBe(true);
  });
});

describe('resetAllOpenCircuits', () => {
  beforeEach(() => { localStorage.clear(); });

  it('resets OPEN circuits to CLOSED', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    recordFailure(API2); recordFailure(API2); recordFailure(API2);
    resetAllOpenCircuits();
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
    expect(getCircuitSnapshot(API2).state).toBe('CLOSED');
  });

  it('leaves already-CLOSED circuits alone', () => {
    recordSuccess(API3, 'x');
    const snapBefore = getCircuitSnapshot(API3).lastSuccessAt;
    resetAllOpenCircuits();
    expect(getCircuitSnapshot(API3).lastSuccessAt).toBe(snapBefore);
  });
});

describe('resetAllCircuits', () => {
  beforeEach(() => { localStorage.clear(); });

  it('resets all tracked circuits', () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    resetAllCircuits();
    expect(getCircuitSnapshot(API).state).toBe('CLOSED');
    expect(getCircuitSnapshot('sec-edgar').state).toBe('CLOSED');
    expect(getCircuitSnapshot('bse').state).toBe('CLOSED');
  });
});

// ─── syncCircuitStateFromSupabase ─────────────────────────────────────────────

function mockFromWithData(rows: object[]) {
  vi.mocked(supabase.from).mockImplementationOnce(() => ({
    upsert: vi.fn(() => ({ then: vi.fn() })),
    select: vi.fn(() => ({
      in: vi.fn().mockResolvedValue({ data: rows }),
    })),
  }) as any);
}

describe('syncCircuitStateFromSupabase', () => {
  beforeEach(() => { localStorage.clear(); });

  it('resolves without throwing when supabase returns empty data', async () => {
    await expect(syncCircuitStateFromSupabase()).resolves.toBeUndefined();
  });

  it('null data → returns early, local state unchanged', async () => {
    mockFromWithData(null as any); // null triggers if (!data) return
    await expect(syncCircuitStateFromSupabase()).resolves.toBeUndefined();
    expect(getCircuitSnapshot(API).state).toBe('CLOSED'); // unchanged
  });

  it('remote OPEN row (non-expired) → local state becomes OPEN', async () => {
    mockFromWithData([{
      api_name: 'yahoo-finance-us',
      state: 'OPEN',
      consecutive_failures: 3,
      opened_at: new Date().toISOString(),
      last_failure_at: new Date().toISOString(),
      last_success_at: null,
      probe_allowed_at: null,
    }]);
    await syncCircuitStateFromSupabase();
    expect(getCircuitSnapshot(API).state).toBe('OPEN');
  });

  it('remote OPEN row with expired openedAt → effective state HALF_OPEN merged', async () => {
    const expiredAt = new Date(Date.now() - 6 * 60_000).toISOString();
    mockFromWithData([{
      api_name: 'yahoo-finance-us',
      state: 'OPEN',
      consecutive_failures: 2,
      opened_at: expiredAt,
      last_failure_at: null,
      last_success_at: null,
      probe_allowed_at: null,
    }]);
    await syncCircuitStateFromSupabase();
    // local CLOSED (0) < remote effective HALF_OPEN (1) → merged = HALF_OPEN
    expect(getCircuitSnapshot(API).state).toBe('HALF_OPEN');
  });

  it('local OPEN beats remote CLOSED in pessimistic merge', async () => {
    recordFailure(API); recordFailure(API); recordFailure(API);
    mockFromWithData([{
      api_name: 'yahoo-finance-us',
      state: 'CLOSED',
      consecutive_failures: 0,
      opened_at: null,
      last_failure_at: null,
      last_success_at: null,
      probe_allowed_at: null,
    }]);
    await syncCircuitStateFromSupabase();
    // local OPEN (2) > remote CLOSED (0) → merged = OPEN
    expect(getCircuitSnapshot(API).state).toBe('OPEN');
  });

  it('consecutive_failures merged as max(local, remote)', async () => {
    recordFailure(API); recordFailure(API); // local = 2 failures
    mockFromWithData([{
      api_name: 'yahoo-finance-us',
      state: 'CLOSED',
      consecutive_failures: 5,
      opened_at: null,
      last_failure_at: null,
      last_success_at: null,
      probe_allowed_at: null,
    }]);
    await syncCircuitStateFromSupabase();
    expect(getCircuitSnapshot(API).consecutiveFailures).toBe(5); // max(2,5)=5
  });

  it('remote last_failure_at is merged into local status', async () => {
    const failAt = new Date(Date.now() - 30_000).toISOString();
    mockFromWithData([{
      api_name: 'yahoo-finance-us',
      state: 'CLOSED',
      consecutive_failures: 0,
      opened_at: null,
      last_failure_at: failAt,
      last_success_at: null,
      probe_allowed_at: null,
    }]);
    await syncCircuitStateFromSupabase();
    expect(getCircuitSnapshot(API).lastFailureAt).toBeGreaterThan(0);
  });
});
