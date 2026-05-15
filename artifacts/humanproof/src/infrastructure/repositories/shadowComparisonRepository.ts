// shadowComparisonRepository.ts — DEBT-3
//
// Read access to audit_shadow_comparison. Writes go through
// engineShadowRunner so the ledger row contains the full payload
// (this repo only services the admin UI's read paths).

import { BaseRepository } from './baseRepository';

export interface ShadowComparisonRow {
  id: string;
  company_name: string;
  company_canonical: string | null;
  role_title: string | null;
  legacy_score: number;
  candidate_score: number;
  score_delta: number;
  legacy_confidence_pct: number;
  candidate_confidence_pct: number;
  confidence_delta_pct: number;
  legacy_tier: string;
  candidate_tier: string;
  tier_migrated: boolean;
  cohort: string | null;
  archetype: string | null;
  legacy_engine_version: string;
  candidate_engine_version: string;
  active_flags: Record<string, string>;
  legacy_duration_ms: number;
  candidate_duration_ms: number;
  created_at: string;
}

export interface ShadowQuery {
  windowHours?: number;        // default 24
  cohort?: string;             // exact match; omit for all
  largeDeltaOnly?: boolean;    // tier_migrated OR |score_delta| >= 10
  limit?: number;              // default 200
}

export class ShadowComparisonRepository extends BaseRepository {
  constructor() {
    super({ serviceName: 'shadow-comparison-repository' });
  }

  async load(opts: ShadowQuery = {}): Promise<ShadowComparisonRow[]> {
    const windowHours = opts.windowHours ?? 24;
    const limit = opts.limit ?? 200;
    const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();

    return (
      (await this.runQuery<ShadowComparisonRow[]>('load', async () => {
        let q = this.client
          .from('audit_shadow_comparison')
          .select(
            'id,company_name,company_canonical,role_title,legacy_score,candidate_score,score_delta,' +
              'legacy_confidence_pct,candidate_confidence_pct,confidence_delta_pct,' +
              'legacy_tier,candidate_tier,tier_migrated,cohort,archetype,' +
              'legacy_engine_version,candidate_engine_version,active_flags,' +
              'legacy_duration_ms,candidate_duration_ms,created_at',
          )
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (opts.cohort) q = q.eq('cohort', opts.cohort);
        if (opts.largeDeltaOnly) q = q.or('tier_migrated.eq.true,score_delta.gte.10,score_delta.lte.-10');
        const res = await q;
        return {
          data: (res.data ?? []) as unknown as ShadowComparisonRow[],
          error: res.error,
        };
      })) ?? []
    );
  }

  /**
   * Per-cohort, per-day aggregation suitable for charting.
   * Returns an array of { day, cohort, count, mean_delta, p95_abs_delta }.
   */
  async dailySummary(opts: { sinceDays?: number } = {}): Promise<
    Array<{ day: string; cohort: string | null; count: number; mean_delta: number; p95_abs_delta: number }>
  > {
    const rows = await this.load({ windowHours: (opts.sinceDays ?? 7) * 24, limit: 5000 });
    const groups = new Map<string, { day: string; cohort: string | null; deltas: number[] }>();
    for (const r of rows) {
      const day = r.created_at.slice(0, 10);
      const key = `${day}::${r.cohort ?? 'NULL'}`;
      let entry = groups.get(key);
      if (!entry) {
        entry = { day, cohort: r.cohort, deltas: [] };
        groups.set(key, entry);
      }
      entry.deltas.push(r.score_delta);
    }
    const out: Array<{ day: string; cohort: string | null; count: number; mean_delta: number; p95_abs_delta: number }> = [];
    for (const { day, cohort, deltas } of groups.values()) {
      const absSorted = deltas.map((d) => Math.abs(d)).sort((a, b) => a - b);
      const p95 = absSorted[Math.min(absSorted.length - 1, Math.floor(absSorted.length * 0.95))];
      const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      out.push({ day, cohort, count: deltas.length, mean_delta: mean, p95_abs_delta: p95 });
    }
    return out.sort((a, b) => b.day.localeCompare(a.day));
  }
}

let _instance: ShadowComparisonRepository | null = null;
export function shadowComparisonRepo(): ShadowComparisonRepository {
  if (!_instance) _instance = new ShadowComparisonRepository();
  return _instance;
}
export function __resetShadowComparisonRepoForTesting(): void {
  _instance = null;
}
