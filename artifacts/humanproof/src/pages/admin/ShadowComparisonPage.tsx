// ShadowComparisonPage.tsx — WS0
//
// Internal admin dashboard for the WS0 shadow-mode harness.
//
// What this page answers, in priority order:
//   1. Is the candidate engine producing scores in a sensible distribution
//      vs the legacy engine? (score-delta histogram)
//   2. Is the candidate engine flipping users into a different risk tier
//      en masse? (tier-migration matrix)
//   3. Which individual audits show large deltas? (drill-down table)
//   4. Per-cohort: is the candidate engine systematically diverging from
//      legacy in any specific cohort?
//
// Access control: the page calls the supabase-authenticated select, which
// returns rows restricted by RLS. service_role queries (via a separate Edge
// Function in WS1) will surface cross-user aggregates without exposing
// individual rows. For now this page renders the caller's own shadow rows
// only — sufficient for ad-hoc development verification, not yet for ops.

import { useEffect, useMemo, useState } from 'react';
// DEBT-3 — repository-mediated reads.
import { shadowComparisonRepo } from '../../infrastructure/repositories/shadowComparisonRepository';

interface ShadowRow {
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

const TIER_ORDER = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;

const TIER_COLOR: Record<string, string> = {
  LOW:      'var(--color-emerald-text)',
  MODERATE: 'var(--color-amber500-text)',
  HIGH:     'var(--color-orange-text)',
  CRITICAL: '#dc2626',
};

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 20,
};

const SECTION_HEADER: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: 'rgba(0,212,224,0.6)',
  marginBottom: 12,
};

// ── Histogram ────────────────────────────────────────────────────────────────

interface Bucket {
  label: string;
  lo: number;
  hi: number;
  count: number;
}

function buildDeltaHistogram(rows: ShadowRow[]): Bucket[] {
  const edges = [-30, -20, -10, -5, -1, 0, 1, 5, 10, 20, 30];
  const buckets: Bucket[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    buckets.push({
      label: `${edges[i]} .. ${edges[i + 1] - 1}`,
      lo: edges[i],
      hi: edges[i + 1] - 1,
      count: 0,
    });
  }
  buckets.push({ label: '<-30', lo: -Infinity, hi: -31, count: 0 });
  buckets.push({ label: '>=30', lo: 31, hi: Infinity, count: 0 });

  for (const r of rows) {
    const d = r.score_delta;
    if (d < -30) {
      buckets[buckets.length - 2].count++;
    } else if (d >= 30) {
      buckets[buckets.length - 1].count++;
    } else {
      const idx = buckets.findIndex((b) => d >= b.lo && d <= b.hi);
      if (idx >= 0) buckets[idx].count++;
    }
  }
  return buckets;
}

const Histogram: React.FC<{ buckets: Bucket[] }> = ({ buckets }) => {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
      {buckets.map((b) => {
        const h = (b.count / max) * 100;
        const mid = (b.lo + b.hi) / 2;
        const color = Math.abs(mid) >= 10 ? 'var(--color-amber500-text)' : Math.abs(mid) >= 5 ? '#22d3ee' : 'var(--color-emerald-text)';
        return (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{b.count}</div>
            <div
              title={`${b.label}: ${b.count}`}
              style={{
                width: '100%',
                height: `${h}%`,
                minHeight: b.count > 0 ? 2 : 0,
                background: color,
                opacity: 0.85,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: 'monospace' }}>
              {b.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Tier migration matrix ────────────────────────────────────────────────────

function buildTierMatrix(rows: ShadowRow[]): Record<string, Record<string, number>> {
  const m: Record<string, Record<string, number>> = {};
  for (const t of TIER_ORDER) {
    m[t] = {};
    for (const t2 of TIER_ORDER) m[t][t2] = 0;
  }
  for (const r of rows) {
    if (m[r.legacy_tier] && m[r.legacy_tier][r.candidate_tier] !== undefined) {
      m[r.legacy_tier][r.candidate_tier]++;
    }
  }
  return m;
}

const TierMatrix: React.FC<{ matrix: Record<string, Record<string, number>> }> = ({ matrix }) => {
  const rowTotals: Record<string, number> = {};
  for (const t of TIER_ORDER) {
    rowTotals[t] = TIER_ORDER.reduce((sum, t2) => sum + matrix[t][t2], 0);
  }
  return (
    <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>
            legacy ↓ / candidate →
          </th>
          {TIER_ORDER.map((t) => (
            <th key={t} style={{ padding: '6px 10px', color: TIER_COLOR[t] }}>
              {t}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TIER_ORDER.map((t) => (
          <tr key={t}>
            <td style={{ padding: '6px 10px', color: TIER_COLOR[t], fontWeight: 600 }}>{t}</td>
            {TIER_ORDER.map((t2) => {
              const n = matrix[t][t2];
              const isDiagonal = t === t2;
              const isMigration = !isDiagonal && n > 0;
              return (
                <td
                  key={t2}
                  style={{
                    padding: '6px 10px',
                    textAlign: 'center',
                    background: isDiagonal ? 'rgba(16,185,129,0.08)' : isMigration ? 'rgba(220,38,38,0.12)' : 'transparent',
                    color: isDiagonal ? 'var(--color-emerald-text)' : isMigration ? 'var(--color-orange-text)' : 'rgba(255,255,255,0.4)',
                    fontWeight: isDiagonal ? 700 : 500,
                  }}
                >
                  {n}
                </td>
              );
            })}
            <td style={{ padding: '6px 10px', color: 'rgba(255,255,255,0.4)' }}>= {rowTotals[t]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ── Stats card ───────────────────────────────────────────────────────────────

interface Stats {
  n: number;
  meanDelta: number;
  medianDelta: number;
  p95AbsDelta: number;
  zeroDelta: number;
  meanConfDelta: number;
  meanLegacyMs: number;
  meanCandidateMs: number;
  migrations: number;
}

function computeStats(rows: ShadowRow[]): Stats {
  const n = rows.length;
  if (n === 0) {
    return { n: 0, meanDelta: 0, medianDelta: 0, p95AbsDelta: 0, zeroDelta: 0, meanConfDelta: 0, meanLegacyMs: 0, meanCandidateMs: 0, migrations: 0 };
  }
  const deltas = rows.map((r) => r.score_delta).sort((a, b) => a - b);
  const absDeltas = rows.map((r) => Math.abs(r.score_delta)).sort((a, b) => a - b);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const median = (xs: number[]) => xs[Math.floor(xs.length / 2)];
  return {
    n,
    meanDelta: mean(deltas),
    medianDelta: median(deltas),
    p95AbsDelta: absDeltas[Math.min(absDeltas.length - 1, Math.floor(absDeltas.length * 0.95))],
    zeroDelta: rows.filter((r) => r.score_delta === 0).length,
    meanConfDelta: mean(rows.map((r) => r.confidence_delta_pct)),
    meanLegacyMs: mean(rows.map((r) => r.legacy_duration_ms ?? 0)),
    meanCandidateMs: mean(rows.map((r) => r.candidate_duration_ms ?? 0)),
    migrations: rows.filter((r) => r.tier_migrated).length,
  };
}

const StatTile: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div style={{ ...PANEL, padding: 16, minWidth: 140 }}>
    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: tone ?? 'var(--text, #e5e7eb)' }}>{value}</div>
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 200;

const ShadowComparisonPage: React.FC = () => {
  const [rows, setRows] = useState<ShadowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState(24);
  const [cohortFilter, setCohortFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await shadowComparisonRepo().load({
          windowHours,
          cohort: cohortFilter || undefined,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setRows(data as unknown as ShadowRow[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [windowHours, cohortFilter]);

  const stats = useMemo(() => computeStats(rows), [rows]);
  const histogram = useMemo(() => buildDeltaHistogram(rows), [rows]);
  const tierMatrix = useMemo(() => buildTierMatrix(rows), [rows]);
  const largeDeltaRows = useMemo(
    () => rows.filter((r) => Math.abs(r.score_delta) >= 10).slice(0, 30),
    [rows],
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.3em', color: 'rgba(0,212,224,0.6)', textTransform: 'uppercase' }}>
          Admin · WS0
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 6, marginBottom: 8 }}>
          Shadow Comparison
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 720, lineHeight: 1.5 }}>
          Pairs of legacy and candidate engine outputs captured for every audit run while WS0 shadow mode is active.
          Use this view to verify candidate flag promotions do not produce en-masse tier migrations or large unexplained deltas.
          Per-user RLS applies to non-service-role callers.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Window:</label>
        {[6, 24, 168].map((h) => (
          <button
            key={h}
            onClick={() => setWindowHours(h)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontFamily: 'monospace',
              border: `1px solid ${windowHours === h ? 'rgba(0,212,224,0.6)' : 'rgba(255,255,255,0.1)'}`,
              background: windowHours === h ? 'rgba(0,212,224,0.1)' : 'transparent',
              color: windowHours === h ? 'rgba(0,212,224,0.9)' : 'rgba(255,255,255,0.6)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {h}h
          </button>
        ))}
        <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 24 }}>Cohort:</label>
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
          }}
        >
          <option value="">all</option>
          <option value="DISTRESS">DISTRESS</option>
          <option value="EFFICIENCY">EFFICIENCY</option>
          <option value="WAVE">WAVE</option>
          <option value="UNKNOWN">UNKNOWN</option>
        </select>
      </div>

      {loading && <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</div>}
      {error && (
        <div style={{ ...PANEL, borderColor: 'rgba(220,38,38,0.4)', color: 'var(--color-red-text)' }}>
          Error: {error}
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{ ...PANEL, color: 'rgba(255,255,255,0.5)' }}>
          No shadow rows in the last {windowHours}h. Either the shadow flag is off or no audits have run yet.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          {/* Stats tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatTile label="audits" value={String(stats.n)} />
            <StatTile label="mean Δ" value={stats.meanDelta.toFixed(2)} tone={Math.abs(stats.meanDelta) > 3 ? 'var(--color-amber500-text)' : undefined} />
            <StatTile label="median Δ" value={stats.medianDelta.toFixed(1)} />
            <StatTile label="p95 |Δ|" value={String(stats.p95AbsDelta)} tone={stats.p95AbsDelta > 10 ? 'var(--color-orange-text)' : undefined} />
            <StatTile label="zero Δ" value={`${stats.zeroDelta} (${Math.round((stats.zeroDelta / stats.n) * 100)}%)`} />
            <StatTile label="tier migrations" value={String(stats.migrations)} tone={stats.migrations > stats.n * 0.05 ? '#dc2626' : undefined} />
            <StatTile label="mean conf Δ" value={`${stats.meanConfDelta.toFixed(1)}pp`} />
            <StatTile label="legacy / cand ms" value={`${Math.round(stats.meanLegacyMs)} / ${Math.round(stats.meanCandidateMs)}`} />
          </div>

          {/* Histogram */}
          <div style={{ ...PANEL, marginBottom: 24 }}>
            <div style={SECTION_HEADER}>score delta histogram (candidate - legacy)</div>
            <Histogram buckets={histogram} />
          </div>

          {/* Tier migration matrix */}
          <div style={{ ...PANEL, marginBottom: 24 }}>
            <div style={SECTION_HEADER}>tier migration matrix</div>
            <TierMatrix matrix={tierMatrix} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
              Diagonal (green) = no migration. Off-diagonal cells with non-zero counts indicate users whose risk tier would change under the candidate engine.
              Investigate any non-diagonal cluster &gt; 5% of total.
            </p>
          </div>

          {/* Large-delta drill-down */}
          <div style={{ ...PANEL }}>
            <div style={SECTION_HEADER}>large deltas (|Δ| ≥ 10) — most recent 30</div>
            {largeDeltaRows.length === 0 ? (
              <div style={{ color: 'rgba(16,185,129,0.7)', fontSize: 13 }}>
                None. Candidate engine within ±9 pts of legacy across all audits.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>when</th>
                    <th style={{ padding: '6px 8px' }}>company</th>
                    <th style={{ padding: '6px 8px' }}>role</th>
                    <th style={{ padding: '6px 8px' }}>cohort</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>legacy</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>cand.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Δ</th>
                    <th style={{ padding: '6px 8px' }}>tier shift</th>
                  </tr>
                </thead>
                <tbody>
                  {largeDeltaRows.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.5)' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '6px 8px' }}>{r.company_canonical ?? r.company_name}</td>
                      <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>{r.role_title}</td>
                      <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.6)' }}>{r.cohort ?? '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.legacy_score}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.candidate_score}</td>
                      <td
                        style={{
                          padding: '6px 8px',
                          textAlign: 'right',
                          color: Math.abs(r.score_delta) >= 20 ? '#dc2626' : 'var(--color-amber500-text)',
                          fontWeight: 700,
                        }}
                      >
                        {r.score_delta > 0 ? '+' : ''}
                        {r.score_delta}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {r.tier_migrated ? (
                          <span style={{ color: 'var(--color-orange-text)' }}>
                            {r.legacy_tier} → {r.candidate_tier}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.35)' }}>same</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ShadowComparisonPage;
