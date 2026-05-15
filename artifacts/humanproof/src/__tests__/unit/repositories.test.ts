// repositories.test.ts — DEBT-3 repository contract tests.
//
// Tests the BaseRepository error mapping + the runQuery /
// runQueryWithCount helpers against an in-process mock Supabase client.
// Full schema integration is exercised at the DB level via Supabase
// migration tests; these unit tests verify the abstraction's behaviour
// without touching the network.

import { beforeEach, describe, expect, it } from 'vitest';
import { BaseRepository, RepositoryError } from '../../infrastructure/repositories/baseRepository';

// ── Minimal Supabase mock ───────────────────────────────────────────────────
//
// We mock only the methods the repositories actually invoke. Keeps the
// test surface narrow and avoids coupling to the @supabase/supabase-js
// internal class hierarchy.

interface MockResult<T> {
  data?: T | null;
  count?: number | null;
  error?: { code?: string; message: string } | null;
}

class MockClient {
  private nextResult: MockResult<unknown> = { data: null, error: null };
  private capturedOperation: { table?: string; operation?: string; args?: unknown[] } = {};

  setNext<T>(result: MockResult<T>): void {
    this.nextResult = result;
  }

  getCapturedOperation(): { table?: string; operation?: string; args?: unknown[] } {
    return this.capturedOperation;
  }

  from(table: string): MockQueryBuilder {
    this.capturedOperation.table = table;
    return new MockQueryBuilder(this);
  }

  _consumeNext<T>(operation: string, args: unknown[]): Promise<MockResult<T>> {
    this.capturedOperation.operation = operation;
    this.capturedOperation.args = args;
    const r = this.nextResult as MockResult<T>;
    this.nextResult = { data: null, error: null }; // reset
    return Promise.resolve(r);
  }
}

class MockQueryBuilder {
  constructor(private readonly client: MockClient) {}
  select(_cols?: string, _opts?: unknown): this { return this; }
  insert(_rows: unknown): this { return this; }
  upsert(_rows: unknown, _opts?: unknown): this { return this; }
  update(_payload: unknown): this { return this; }
  delete(): this { return this; }
  eq(_col: string, _val: unknown): this { return this; }
  in(_col: string, _vals: unknown[]): this { return this; }
  is(_col: string, _val: unknown): this { return this; }
  not(_col: string, _op: string, _val: unknown): this { return this; }
  gte(_col: string, _val: unknown): this { return this; }
  order(_col: string, _opts?: unknown): this { return this; }
  limit(_n: number): this { return this; }
  ilike(_col: string, _pat: string): this { return this; }
  or(_filter: string): this { return this; }
  maybeSingle(): Promise<MockResult<unknown>> {
    return this.client._consumeNext('maybeSingle', []);
  }
  // Thenable so `await query` works directly.
  then<T, U>(
    onFulfilled?: (value: MockResult<unknown>) => T | PromiseLike<T>,
    onRejected?: (reason: unknown) => U | PromiseLike<U>,
  ): Promise<T | U> {
    return this.client._consumeNext('terminal', []).then(onFulfilled, onRejected);
  }
}

// ── Concrete test subject ───────────────────────────────────────────────────

interface FixtureRow { id: number; name: string }

class FixtureRepository extends BaseRepository {
  constructor(private readonly mockClient: MockClient) {
    super({ client: mockClient as unknown as Parameters<typeof BaseRepository>[0]['client'], serviceName: 'fixture-repo' });
  }
  async loadOne(id: number): Promise<FixtureRow | null> {
    return this.runQuery<FixtureRow>('loadOne', async () => {
      const res = await this.mockClient.from('fixtures').select('*').eq('id', id).maybeSingle();
      return res as MockResult<FixtureRow>;
    });
  }
  async loadMany(): Promise<{ rows: FixtureRow[]; count: number }> {
    return this.runQueryWithCount<FixtureRow>('loadMany', async () => {
      const res = await this.mockClient.from('fixtures').select('*', { count: 'exact' });
      return res as MockResult<FixtureRow[]> & { count: number | null };
    });
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('BaseRepository', () => {
  let mock: MockClient;
  let repo: FixtureRepository;

  beforeEach(() => {
    mock = new MockClient();
    repo = new FixtureRepository(mock);
  });

  it('returns the data when the query succeeds', async () => {
    mock.setNext<FixtureRow>({ data: { id: 1, name: 'alpha' }, error: null });
    const row = await repo.loadOne(1);
    expect(row).toEqual({ id: 1, name: 'alpha' });
  });

  it('returns null when no row matches', async () => {
    mock.setNext<FixtureRow>({ data: null, error: null });
    const row = await repo.loadOne(999);
    expect(row).toBeNull();
  });

  it('maps PostgREST PGRST116 to RepositoryError.code="not_found"', async () => {
    mock.setNext({ data: null, error: { code: 'PGRST116', message: 'no row' } });
    await expect(repo.loadOne(1)).rejects.toMatchObject({
      name: 'RepositoryError',
      code: 'not_found',
    });
  });

  it('maps Postgres 23505 (unique violation) to code="conflict"', async () => {
    mock.setNext({ data: null, error: { code: '23505', message: 'duplicate key' } });
    await expect(repo.loadOne(1)).rejects.toMatchObject({ code: 'conflict' });
  });

  it('maps Postgres 23514 (check violation) to code="validation"', async () => {
    mock.setNext({ data: null, error: { code: '23514', message: 'check violation' } });
    await expect(repo.loadOne(1)).rejects.toMatchObject({ code: 'validation' });
  });

  it('maps JWT errors to code="unauthorized"', async () => {
    mock.setNext({ data: null, error: { message: 'JWT expired' } });
    await expect(repo.loadOne(1)).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('defaults unknown error codes to code="unknown"', async () => {
    mock.setNext({ data: null, error: { code: 'X99999', message: 'mystery error' } });
    await expect(repo.loadOne(1)).rejects.toMatchObject({ code: 'unknown' });
  });

  it('runQueryWithCount returns rows AND count', async () => {
    mock.setNext({
      data: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }],
      count: 42,
      error: null,
    });
    const result = await repo.loadMany();
    expect(result.rows).toHaveLength(2);
    expect(result.count).toBe(42);
  });

  it('runQueryWithCount with empty data returns empty array + zero count', async () => {
    mock.setNext({ data: null, count: null, error: null });
    const result = await repo.loadMany();
    expect(result.rows).toEqual([]);
    expect(result.count).toBe(0);
  });

  it('RepositoryError is an Error subclass with the original cause attached', async () => {
    const supabaseError = { code: 'PGRST301', message: 'rls denied' };
    mock.setNext({ data: null, error: supabaseError });
    try {
      await repo.loadOne(1);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(RepositoryError);
      expect((err as RepositoryError).cause).toBe(supabaseError);
    }
  });
});

// ── Repository singleton lifecycle ──────────────────────────────────────────

import { outcomesRepo, __resetOutcomesRepoForTesting } from '../../infrastructure/repositories/outcomesRepository';
import { calibrationRepo, __resetCalibrationRepoForTesting } from '../../infrastructure/repositories/calibrationRepository';
import { shadowComparisonRepo, __resetShadowComparisonRepoForTesting } from '../../infrastructure/repositories/shadowComparisonRepository';

describe('repository singletons', () => {
  it('outcomesRepo returns the same instance across calls', () => {
    __resetOutcomesRepoForTesting();
    const a = outcomesRepo();
    const b = outcomesRepo();
    expect(a).toBe(b);
  });

  it('reset hooks invalidate the singleton (new instance after reset)', () => {
    const a = outcomesRepo();
    __resetOutcomesRepoForTesting();
    const b = outcomesRepo();
    expect(a).not.toBe(b);
  });

  it('every repository exposes its reset hook (test contract)', () => {
    __resetOutcomesRepoForTesting();
    __resetCalibrationRepoForTesting();
    __resetShadowComparisonRepoForTesting();
    expect(outcomesRepo()).toBeTruthy();
    expect(calibrationRepo()).toBeTruthy();
    expect(shadowComparisonRepo()).toBeTruthy();
  });
});
