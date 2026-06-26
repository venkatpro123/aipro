// CalibrationPanel.tsx — WS8
//
// Ops dashboard for engine calibration. Answers three operational
// questions:
//
//   1. What calibration version is currently active per cohort scope?
//   2. Are there pending versions (held by drift gate) needing review?
//   3. Is empirical coverage tracking nominal coverage within ±10pp?
//
// Permissions: this page renders data from engine_calibration_versions,
// engine_drift_alerts, and coverage_measurements. The first two have
// service_role-only RLS; the page accesses them via the
// `admin-calibration-read` edge function (deferred — for now the page
// gracefully degrades when reads fail). coverage_measurements is
// publicly readable, so the coverage section always renders.

import { useEffect, useMemo, useState } from 'react';
// DEBT-3 — admin reads + mutations route through the repository.
import { calibrationRepo } from '../../infrastructure/repositories/calibrationRepository';

// ── Types ───────────────────────────────────────────────────────────────────

interface CalibrationVersion {
  id: number;
  version: string;
  cohort_scope: string;
  status: 'pending' | 'active' | 'superseded' | 'rejected';
  l1_multiplier: number;
  l2_multiplier: number;
  l3_multiplier: number;
  l4_multiplier: number;
  l5_multiplier: number;
  d8_beta0: number;
  d8_beta_l1: number;
  d8_beta_l2: number;
  d8_beta_ai_signal: number;
  d8_beta_layoff_rounds: number;
  auc_distress: number | null;
  auc_efficiency: number | null;
  auc_wave: number | null;
  auc_combined: number | null;
  brier_combined: number | null;
  coverage_at_90: number | null;
  coverage_at_80: number | null;
  coverage_at_50: number | null;
  n_events_total: number;
  drift_reason: string | null;
  prior_version_id: number | null;
  created_at: string;
  activated_at: string | null;
}

interface DriftAlert {
  id: number;
  version_id: number | null;
  cohort_scope: string;
  alert_kind: string;
  metric_name: string;
  prior_value: number | null;
  candidate_value: number | null;
  delta: number | null;
  status: string;
  created_at: string;
  detail: { reason?: string } | null;
}

interface CoverageMeasurement {
  cohort_scope: string;
  nominal_coverage: number;
  empirical_coverage: number;
  coverage_ci_low: number | null;
  coverage_ci_high: number | null;
  sample_size: number;
  delta_from_nominal: number;
  is_misaligned: boolean;
  measured_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
};

const SECTION_HEADER: React.CSSProperties = {
  fontSize: 11,
  fontFamily: 'var(--font-mono, monospace)',
  letterSpacing: '0.25em',
  textTransform: 'uppercase',
  color: 'rgba(0,212,224,0.6)',
  marginBottom: 12,
};

const STATUS_COLOR: Record<string, string> = {
  active:     'var(--color-emerald-text)',
  pending:    'var(--color-amber500-text)',
  superseded: 'rgba(255,255,255,0.45)',
  rejected:   '#dc2626',
};

const ALERT_KIND_COLOR: Record<string, string> = {
  auc_regression:           '#dc2626',
  coverage_divergence:      'var(--color-orange-text)',
  sample_size_collapse:     'var(--color-amber500-text)',
  cohort_distribution_shift: '#22d3ee',
};

const fmtNum = (n: number | null | undefined, decimals = 3): string =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(decimals);

const fmtPct = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : `${(n * 100).toFixed(1)}%`;

const fmtRelTime = (iso: string): string => {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return new Date(iso).toLocaleString();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

// ── Versions table ──────────────────────────────────────────────────────────

const VersionsTable: React.FC<{
  versions: CalibrationVersion[];
  onRequestPromote: (v: CalibrationVersion) => void;
  onRequestReject: (v: CalibrationVersion) => void;
}> = ({ versions, onRequestPromote, onRequestReject }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
    <thead>
      <tr style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
        <th style={{ padding: '6px 8px' }}>scope</th>
        <th style={{ padding: '6px 8px' }}>version</th>
        <th style={{ padding: '6px 8px' }}>status</th>
        <th style={{ padding: '6px 8px', textAlign: 'right' }}>AUC</th>
        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Brier</th>
        <th style={{ padding: '6px 8px', textAlign: 'right' }}>cov@90</th>
        <th style={{ padding: '6px 8px', textAlign: 'right' }}>n</th>
        <th style={{ padding: '6px 8px' }}>created</th>
        <th style={{ padding: '6px 8px' }}>actions</th>
      </tr>
    </thead>
    <tbody>
      {versions.map((v) => (
        <tr key={v.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.85)' }}>{v.cohort_scope}</td>
          <td style={{ padding: '6px 8px' }}>{v.version}</td>
          <td style={{ padding: '6px 8px' }}>
            <span
              style={{
                background: `${STATUS_COLOR[v.status] ?? '#666'}1a`,
                color: STATUS_COLOR[v.status] ?? '#999',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {v.status}
            </span>
          </td>
          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtNum(v.auc_combined)}</td>
          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtNum(v.brier_combined, 4)}</td>
          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtPct(v.coverage_at_90)}</td>
          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{v.n_events_total}</td>
          <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.5)' }}>{fmtRelTime(v.created_at)}</td>
          <td style={{ padding: '6px 8px' }}>
            {v.status === 'pending' ? (
              <>
                <button
                  onClick={() => onRequestPromote(v)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    background: 'rgba(16,185,129,0.1)',
                    color: 'var(--color-emerald-text)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginRight: 6,
                  }}
                >
                  promote
                </button>
                <button
                  onClick={() => onRequestReject(v)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    background: 'rgba(220,38,38,0.1)',
                    color: 'var(--color-red-text)',
                    border: '1px solid rgba(220,38,38,0.4)',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  reject
                </button>
              </>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>—</span>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// ── Alerts panel ────────────────────────────────────────────────────────────

const AlertsPanel: React.FC<{ alerts: DriftAlert[] }> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div style={{ color: 'rgba(16,185,129,0.7)', fontSize: 13 }}>
        No open drift alerts. Calibration metrics are within thresholds.
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
      <thead>
        <tr style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
          <th style={{ padding: '6px 8px' }}>when</th>
          <th style={{ padding: '6px 8px' }}>scope</th>
          <th style={{ padding: '6px 8px' }}>kind</th>
          <th style={{ padding: '6px 8px' }}>metric</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>prior</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>candidate</th>
          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Δ</th>
          <th style={{ padding: '6px 8px' }}>reason</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((a) => (
          <tr key={a.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.5)' }}>{fmtRelTime(a.created_at)}</td>
            <td style={{ padding: '6px 8px' }}>{a.cohort_scope}</td>
            <td style={{ padding: '6px 8px', color: ALERT_KIND_COLOR[a.alert_kind] ?? 'var(--color-amber500-text)' }}>{a.alert_kind}</td>
            <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.7)' }}>{a.metric_name}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtNum(a.prior_value)}</td>
            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtNum(a.candidate_value)}</td>
            <td
              style={{
                padding: '6px 8px',
                textAlign: 'right',
                color: (a.delta ?? 0) < 0 ? '#dc2626' : 'var(--color-emerald-text)',
                fontWeight: 700,
              }}
            >
              {a.delta == null ? '—' : `${(a.delta > 0 ? '+' : '')}${a.delta.toFixed(3)}`}
            </td>
            <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.6)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.detail?.reason ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ── Coverage grid ───────────────────────────────────────────────────────────

const CoverageGrid: React.FC<{ measurements: CoverageMeasurement[] }> = ({ measurements }) => {
  const scopes = useMemo(
    () => Array.from(new Set(measurements.map((m) => m.cohort_scope))).sort(),
    [measurements],
  );
  const nominals = useMemo(
    () => Array.from(new Set(measurements.map((m) => m.nominal_coverage))).sort((a, b) => a - b),
    [measurements],
  );

  if (measurements.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        No coverage measurements yet. coverage-audit cron runs Mondays 04:00 UTC.
      </div>
    );
  }

  const cellFor = (scope: string, nominal: number): CoverageMeasurement | undefined =>
    measurements.find((m) => m.cohort_scope === scope && m.nominal_coverage === nominal);

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12 }}>
      <thead>
        <tr style={{ color: 'rgba(255,255,255,0.5)' }}>
          <th style={{ padding: '6px 10px', textAlign: 'left' }}>scope</th>
          {nominals.map((n) => (
            <th key={n} style={{ padding: '6px 10px', textAlign: 'center' }}>
              nominal {Math.round(n * 100)}%
            </th>
          ))}
          <th style={{ padding: '6px 10px', textAlign: 'right' }}>n</th>
          <th style={{ padding: '6px 10px', textAlign: 'right' }}>measured</th>
        </tr>
      </thead>
      <tbody>
        {scopes.map((scope) => {
          const refCell = nominals.map((n) => cellFor(scope, n)).find((c) => c);
          return (
            <tr key={scope} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '6px 10px', fontWeight: 600 }}>{scope}</td>
              {nominals.map((n) => {
                const m = cellFor(scope, n);
                if (!m) return <td key={n} style={{ padding: '6px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>—</td>;
                const color = m.is_misaligned ? '#dc2626' : Math.abs(m.delta_from_nominal) > 0.05 ? 'var(--color-amber500-text)' : 'var(--color-emerald-text)';
                return (
                  <td
                    key={n}
                    style={{ padding: '6px 10px', textAlign: 'center', color }}
                    title={`empirical ${(m.empirical_coverage * 100).toFixed(1)}%, ci [${(m.coverage_ci_low ?? 0) * 100}, ${(m.coverage_ci_high ?? 0) * 100}], delta ${(m.delta_from_nominal * 100).toFixed(1)}pp`}
                  >
                    {(m.empirical_coverage * 100).toFixed(1)}%
                  </td>
                );
              })}
              <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>
                {refCell?.sample_size ?? '—'}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>
                {refCell ? fmtRelTime(refCell.measured_at) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const CalibrationPanel: React.FC = () => {
  const [versions, setVersions] = useState<CalibrationVersion[]>([]);
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [coverage, setCoverage] = useState<CoverageMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setErrors([]);
    const errs: string[] = [];
    const repo = calibrationRepo();

    const [vRes, aRes, cRes] = await Promise.allSettled([
      repo.listRecentVersions(50),
      repo.listOpenDriftAlerts(50),
      repo.getLatestCoverageMeasurements(),
    ]);

    if (vRes.status === 'fulfilled') setVersions(vRes.value as unknown as CalibrationVersion[]);
    else errs.push(`versions: ${(vRes.reason as Error).message}`);

    if (aRes.status === 'fulfilled') setAlerts(aRes.value as unknown as DriftAlert[]);
    else errs.push(`alerts: ${(aRes.reason as Error).message} (likely service_role required)`);

    if (cRes.status === 'fulfilled') setCoverage(cRes.value as unknown as CoverageMeasurement[]);
    else errs.push(`coverage: ${(cRes.reason as Error).message}`);

    setErrors(errs);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handlePromote = async (v: CalibrationVersion) => {
    if (!window.confirm(`Promote ${v.cohort_scope} ${v.version} to ACTIVE? This demotes the current active version.`)) return;
    const reason = window.prompt('Activation reason (mandatory):') ?? '';
    if (!reason.trim()) return;
    try {
      await calibrationRepo().promoteVersion({ versionId: v.id, reason });
      await load();
    } catch (err) {
      alert(`Promote failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleReject = async (v: CalibrationVersion) => {
    if (!window.confirm(`Reject ${v.cohort_scope} ${v.version}? This is final.`)) return;
    const reason = window.prompt('Rejection reason (mandatory):') ?? '';
    if (!reason.trim()) return;
    try {
      await calibrationRepo().rejectVersion({ versionId: v.id, reason });
      await load();
    } catch (err) {
      alert(`Reject failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.3em', color: 'rgba(0,212,224,0.6)', textTransform: 'uppercase' }}>
          Admin · WS8
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 6, marginBottom: 8 }}>Calibration</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 720, lineHeight: 1.5 }}>
          Versioned engine calibration coefficients, drift alerts from the weekly recalibration cron, and empirical coverage
          measurements from the weekly conformal validation cron. Promotion / rejection actions require service_role; if you see
          permission errors, switch to a service_role console.
        </p>
      </div>

      {loading && <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</div>}

      {!loading && errors.length > 0 && (
        <div style={{ ...PANEL, borderColor: 'rgba(220,38,38,0.4)' }}>
          <div style={SECTION_HEADER}>partial load</div>
          {errors.map((e, i) => (
            <div key={i} style={{ color: 'var(--color-red-text)', fontSize: 12, fontFamily: 'monospace' }}>
              {e}
            </div>
          ))}
        </div>
      )}

      <div style={PANEL}>
        <div style={SECTION_HEADER}>open drift alerts</div>
        <AlertsPanel alerts={alerts} />
      </div>

      <div style={PANEL}>
        <div style={SECTION_HEADER}>calibration versions</div>
        <VersionsTable versions={versions} onRequestPromote={handlePromote} onRequestReject={handleReject} />
      </div>

      <div style={PANEL}>
        <div style={SECTION_HEADER}>empirical coverage (latest per scope/nominal)</div>
        <CoverageGrid measurements={coverage} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
          Green: within ±5pp of nominal. Amber: 5-10pp off. Red: &gt;10pp off (is_misaligned=true). Mouseover for full CI.
        </p>
      </div>
    </div>
  );
};

export default CalibrationPanel;
