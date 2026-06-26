import React, { useState, useEffect, useRef } from 'react';
import {
  computeTrajectory,
  OracleResult,
  TrajectoryResult,
  TrajectoryPoint,
  TrajectoryRecommendation,
} from '../../services/DisplacementTrajectoryEngine';
import { CareerIntelligence } from '../../data/intelligence/types';

// ─── Prop types ──────────────────────────────────────────────────────────────
interface Props {
  currentScore: number;
  oracleResult: OracleResult | null;
  roleTitle: string;        // human-readable role title
  roleKey?: string;         // resolved oracle key e.g. "sw_backend"
  experience?: string;      // "0-2" | "2-5" | "5-10" | "10-15" | "15+"
  careerIntelligence?: CareerIntelligence | null;
}

// ─── Design tokens (match existing spy-themed dark UI) ───────────────────────
const C = {
  bg1:       'rgba(10, 15, 25, 0.95)',
  bg2:       'var(--alpha-bg-04)',
  bg3:       'var(--alpha-bg-06)',
  border:    'var(--alpha-bg-08)',
  borderHi:  'var(--alpha-bg-08)',
  cyan:      '#00F5FF',
  violet:    '#7C3AFF',
  green:     'var(--color-emerald-text)',
  amber:     'var(--color-amber500-text)',
  orange:    'var(--color-orange-text)',
  red:       'var(--color-red-text)',
  text:      '#fff',
  text2:     '#9ba5b4',
  text3:     '#6b7280',
  mono:      '"JetBrains Mono", "Fira Code", monospace',
};

// ─── Color helpers ───────────────────────────────────────────────────────────
const scoreColor = (s: number): string => {
  if (s >= 75) return C.red;
  if (s >= 55) return C.orange;
  if (s >= 35) return C.amber;
  if (s >= 20) return C.green;
  return C.cyan;
};

const interpretColor = (interp: TrajectoryResult['interpretation']): string => {
  if (interp === 'critical_now')       return C.red;
  if (interp === 'high_risk_imminent') return C.orange;
  if (interp === 'moderate_rising')    return C.amber;
  if (interp === 'declining_risk')     return C.green;
  if (interp === 'stable')             return C.cyan;
  return C.amber; // safe_rising
};

const urgencyColor = (u: TrajectoryRecommendation['urgency']): string => {
  if (u === 'critical') return C.red;
  if (u === 'high')     return C.orange;
  if (u === 'medium')   return C.amber;
  return C.green;
};

// ─── SVG line chart ──────────────────────────────────────────────────────────
const TrajectoryChart: React.FC<{
  data: TrajectoryPoint[];
  activeScenario: 'base' | 'pessimistic' | 'optimistic';
  threshold: number;
  seededTrend?: { year: number; riskScore: number }[];
}> = ({ data, activeScenario, threshold, seededTrend }) => {
  const W = 540;
  const H = 220;
  const PAD = { top: 20, right: 20, bottom: 40, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / 100) * chartH;

  const makePath = (key: 'base' | 'pessimistic' | 'optimistic') =>
    data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d[key]).toFixed(1)}`)
      .join(' ');

  const threshY = toY(threshold);

  const curves: Array<{
    key: 'base' | 'pessimistic' | 'optimistic';
    color: string;
    dasharray?: string;
    label: string;
  }> = [
    { key: 'pessimistic', color: C.red,    dasharray: undefined,  label: 'Pessimistic' },
    { key: 'base',        color: C.amber,  dasharray: '5 3',      label: 'Base' },
    { key: 'optimistic',  color: C.green,  dasharray: undefined,  label: 'Optimistic' },
  ];

  // Gradient id unique per render
  const [gradId]  = useState(() => `traj-grad-${Math.random().toString(36).slice(2)}`);
  const [areaId]  = useState(() => `traj-area-${Math.random().toString(36).slice(2)}`);

  // Area fill for active curve
  const activeData = data.map(d => d[activeScenario]);
  const areaPath = [
    `M ${toX(0).toFixed(1)} ${toY(activeData[0]).toFixed(1)}`,
    ...activeData.slice(1).map((v, i) => `L ${toX(i + 1).toFixed(1)} ${toY(v).toFixed(1)}`),
    `L ${toX(data.length - 1).toFixed(1)} ${toY(0).toFixed(1)}`,
    `L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)}`,
    'Z',
  ].join(' ');

  const activeColor = activeScenario === 'pessimistic' ? C.red : activeScenario === 'optimistic' ? C.green : C.amber;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Displacement trajectory chart"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={activeColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={activeColor} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id={areaId}>
          <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
        </clipPath>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke="var(--alpha-bg-06)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              fill={C.text3} fontSize="10" fontFamily={C.mono}>
              {v}
            </text>
          </g>
        );
      })}

      {/* Threshold line */}
      <line x1={PAD.left} y1={threshY} x2={PAD.left + chartW} y2={threshY}
        stroke={C.red} strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.5" />
      <text x={PAD.left + chartW + 4} y={threshY + 4} fill={C.red} fontSize="9"
        fontFamily={C.mono} opacity="0.7">threshold</text>

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${areaId})`} />

      {/* All curves (dim inactive) */}
      {curves.map(c => (
        <path key={c.key} d={makePath(c.key)}
          fill="none"
          stroke={c.color}
          strokeWidth={c.key === activeScenario ? 2.5 : 1}
          strokeDasharray={c.dasharray}
          strokeOpacity={c.key === activeScenario ? 1 : 0.22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Dots on active curve */}
      {data.map((d, i) => (
        <circle key={i}
          cx={toX(i)} cy={toY(d[activeScenario])} r={4}
          fill={activeColor} opacity={0.9}
        />
      ))}

      {/* ── ORACLE SEEDED TREND OVERLAY ───────────────────────────── */}
      {seededTrend && seededTrend.length >= 2 && (() => {
        // Map seeded years to X positions based on data year domain
        const years = data.map(d => parseInt(d.year, 10));
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const yearRange = maxYear - minYear || 1;
        const seedToX = (year: number) =>
          PAD.left + ((year - minYear) / yearRange) * chartW;
        const seedPath = seededTrend
          .filter(t => t.year >= minYear && t.year <= maxYear)
          .map((t, idx, arr) =>
            `${idx === 0 ? 'M' : 'L'} ${seedToX(t.year).toFixed(1)} ${toY(t.riskScore).toFixed(1)}`
          ).join(' ');
        if (!seedPath) return null;
        return (
          <g>
            <path d={seedPath}
              fill="none" stroke={C.cyan} strokeWidth="1.8"
              strokeDasharray="3 4" strokeOpacity="0.55"
              strokeLinecap="round" strokeLinejoin="round"
            />
            {seededTrend.filter(t => t.year >= minYear && t.year <= maxYear).map((t, idx) => (
              <circle key={idx}
                cx={seedToX(t.year)} cy={toY(t.riskScore)} r={2.5}
                fill={C.cyan} opacity={0.5}
              />
            ))}
          </g>
        );
      })()}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={d.year} x={toX(i)} y={H - 8}
          textAnchor="middle" fill={C.text2} fontSize="11" fontFamily={C.mono}>
          {d.year}
        </text>
      ))}

      {/* Legend bottom */}
      {curves.map((c, i) => (
        <g key={c.key} transform={`translate(${PAD.left + i * 110}, ${H - 26})`}>
          <line x1="0" y1="0" x2="18" y2="0" stroke={c.color}
            strokeWidth={c.key === activeScenario ? 2.5 : 1.2}
            strokeDasharray={c.dasharray} strokeOpacity={c.key === activeScenario ? 1 : 0.4} />
          <text x="22" y="4" fill={c.key === activeScenario ? c.color : C.text3}
            fontSize="10" fontFamily={C.mono}>{c.label}</text>
        </g>
      ))}
      {seededTrend && seededTrend.length >= 2 && (
        <g transform={`translate(${PAD.left + 3 * 110}, ${H - 26})`}>
          <line x1="0" y1="0" x2="18" y2="0" stroke={C.cyan} strokeWidth="1.8" strokeDasharray="3 4" strokeOpacity="0.7" />
          <text x="22" y="4" fill={C.cyan} fontSize="10" fontFamily={C.mono} opacity="0.7">Oracle Seeded</text>
        </g>
      )}
    </svg>
  );
};

// ─── Year-by-year grid ───────────────────────────────────────────────────────
const YearGrid: React.FC<{
  data: TrajectoryPoint[];
  activeScenario: 'base' | 'pessimistic' | 'optimistic';
  threshold: number;
  currentScore: number;
}> = ({ data, activeScenario, threshold, currentScore }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
      {data.map(pt => {
        const val   = pt[activeScenario];
        const delta = val - currentScore;
        const col   = scoreColor(val);
        const isActive = hovered === pt.year;
        const crossThresh = val >= threshold;

        return (
          <div
            key={pt.year}
            onMouseEnter={() => setHovered(pt.year)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background:   isActive ? `${col}18` : C.bg2,
              border:       `1px solid ${isActive ? col : (crossThresh ? `${C.red}40` : C.border)}`,
              borderRadius: '10px',
              padding:      '12px 10px',
              textAlign:    'center',
              cursor:       'default',
              transition:   'all 0.2s ease',
              position:     'relative',
            }}
          >
            {crossThresh && (
              <div style={{
                position: 'absolute', top: '-7px', right: '-7px',
                background: C.red, borderRadius: '50%',
                width: '14px', height: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '8px', color: 'var(--text)', fontWeight: 700,
              }}>!</div>
            )}
            <div style={{ color: C.text3, fontSize: '0.6875rem', fontFamily: C.mono, marginBottom: '6px', letterSpacing: '0.05em' }}>
              {pt.year}
            </div>
            <div style={{ color: col, fontSize: '1.25rem', fontWeight: 800, fontFamily: C.mono, lineHeight: 1 }}>
              {val}%
            </div>
            <div style={{
              color:     delta > 0 ? `${C.red}99` : C.green,
              fontSize:  '0.6875rem',
              fontFamily: C.mono,
              marginTop: '4px',
            }}>
              {delta > 0 ? `+${Math.round(delta)}` : Math.round(delta)}pts
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Interpretation badge ────────────────────────────────────────────────────
const InterpretBadge: React.FC<{ trajectory: TrajectoryResult }> = ({ trajectory }) => {
  const color = interpretColor(trajectory.interpretation);
  return (
    <div style={{
      background: `${color}10`,
      border:     `1px solid ${color}35`,
      borderRadius: '12px',
      padding:    '18px 20px',
      marginBottom: '20px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
      }}>
        <div style={{
          width:  '10px', height: '10px', borderRadius: '50%',
          background: color, flexShrink: 0, marginTop: '4px',
          boxShadow: `0 0 10px ${color}`,
          animation: 'trajectoryPulse 1.8s ease-in-out infinite',
        }} />
        <div>
          <div style={{ color, fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
            {trajectory.interpretationLabel}
          </div>
          <div style={{ color: C.text2, fontSize: '0.85rem', lineHeight: 1.6 }}>
            {trajectory.interpretationDetail}
          </div>
          {trajectory.displacementCrossover && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginTop: '10px', background: `${C.red}15`, border: `1px solid ${C.red}30`,
              borderRadius: '6px', padding: '4px 10px',
              color: C.red, fontSize: '0.78rem', fontFamily: C.mono,
            }}>
              ⚠ Threshold crossing projected: {trajectory.displacementCrossover}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Recommendation card ─────────────────────────────────────────────────────
const RecCard: React.FC<{ rec: TrajectoryRecommendation }> = ({ rec }) => {
  const col = urgencyColor(rec.urgency);
  return (
    <div style={{
      background:   C.bg2,
      border:       `1px solid ${col}25`,
      borderRadius: '10px',
      padding:      '16px',
      borderLeft:   `3px solid ${col}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '1rem' }}>{rec.icon}</span>
        <span style={{ color: col, fontWeight: 600, fontSize: '0.88rem' }}>{rec.title}</span>
      </div>
      <p style={{ margin: 0, color: C.text2, fontSize: '0.83rem', lineHeight: 1.6 }}>{rec.body}</p>
    </div>
  );
};

// ─── Scenario slider ─────────────────────────────────────────────────────────
const ScenarioSlider: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const labels = ['No Upskilling (Passive)', 'Moderate AI Adoption', 'Intense AI Upskilling'];
  const colors = [C.red, C.amber, C.green];

  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ color: C.text2, fontSize: '0.85rem', fontWeight: 600 }}>Scenario Modeller</span>
        <span style={{ color: colors[value], fontFamily: C.mono, fontSize: '0.8rem', fontWeight: 700 }}>
          {['Pessimistic', 'Base', 'Optimistic'][value]}
        </span>
      </div>
      <input
        type="range" min={0} max={2} step={1} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: colors[value], cursor: 'pointer' }}
        aria-label="Trajectory scenario selector"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        {labels.map((l, i) => (
          <span key={i} style={{
            fontSize: '0.6875rem', color: i === value ? colors[i] : C.text3,
            fontFamily: C.mono, letterSpacing: '0.02em',
            maxWidth: '31%', textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center',
          }}>{l}</span>
        ))}
      </div>
    </div>
  );
};

// ─── Animated entrance hook ──────────────────────────────────────────────────
const useReveal = (): { ref: React.RefObject<HTMLDivElement>; visible: boolean } => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

// ─── Main component ──────────────────────────────────────────────────────────
export const DisplacementTrajectoryPanel: React.FC<Props> = ({
  currentScore,
  oracleResult,
  roleTitle,
  roleKey = 'generic',
  experience = '5-10',
  careerIntelligence = null,
}) => {
  const [scenarioIdx, setScenarioIdx] = useState(1); // 0=pessimistic, 1=base, 2=optimistic
  const { ref, visible } = useReveal();

  // BUG-C2 FIX: Server-side DB-calibrated trajectory (Cloudflare Worker / api-server).
  // Fetched non-blocking — local client trajectory shows instantly while server enriches.
  const [serverCalibrated, setServerCalibrated] = useState(false);
  const [serverYears, setServerYears] = useState<TrajectoryPoint[] | null>(null);

  useEffect(() => {
    if (!roleKey || roleKey === 'generic') return;
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL;
    if (!apiBase) return; // skip if no API server configured

    const ctrl = new AbortController();
    fetch(`${apiBase}/api/forecast/${encodeURIComponent(roleKey)}`, {
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: any) => {
        if (!data?.timeline || !Array.isArray(data.timeline) || data.timeline.length < 2) return;
        // Server returns: { timeline: [{ year: '2026', riskScore: 42 }, …] }
        // Merge into TrajectoryPoints using local base/pess/opti deltas as offsets
        const merged: TrajectoryPoint[] = data.timeline.map((pt: any, i: number) => {
          const local = trajectory.years[i];
          const serverBase = Math.min(100, Math.max(0, Math.round(pt.riskScore)));
          const delta = local ? serverBase - local.base : 0;
          return {
            year:        String(pt.year),
            base:        serverBase,
            pessimistic: local ? Math.min(100, local.pessimistic + delta) : serverBase + 6,
            optimistic:  local ? Math.max(0,   local.optimistic  + delta) : Math.max(0, serverBase - 5),
          };
        });
        setServerYears(merged);
        setServerCalibrated(true);
      })
      .catch(() => { /* server unavailable — silent fallback */ });

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey]);

  // Local client trajectory (always computed, used as fallback or until server responds)
  const trajectory: TrajectoryResult = React.useMemo(
    () => computeTrajectory({ currentScore, oracleResult, roleKey, experience, careerIntelligence }),
    [currentScore, oracleResult, roleKey, experience, careerIntelligence]
  );

  // Prefer server-calibrated years if available, otherwise local
  const displayYears = serverYears ?? trajectory.years;

  const activeScenario: 'base' | 'pessimistic' | 'optimistic' =
    scenarioIdx === 0 ? 'pessimistic' : scenarioIdx === 1 ? 'base' : 'optimistic';

  const color      = interpretColor(trajectory.interpretation);
  const baseYear   = trajectory.baseYear;
  const finalYear  = baseYear + 5;
  // Use displayYears for final score calculation (server-preferred)
  const finalScore = displayYears[displayYears.length - 1]?.[activeScenario] ?? trajectory.years[trajectory.years.length - 1][activeScenario];

  return (
    <div
      ref={ref}
      style={{
        marginTop:    '32px',
        marginBottom: '32px',
        opacity:      visible ? 1 : 0,
        transform:    visible ? 'translateY(0)' : 'translateY(20px)',
        transition:   'opacity 0.6s ease, transform 0.6s ease',
      }}
    >
      <style>{`
        @keyframes trajectoryPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background:   C.bg1,
        border:       `1px solid ${color}30`,
        borderRadius: '12px 12px 0 0',
        padding:      '20px 24px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexWrap:     'wrap',
        gap:          '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '4px', height: '32px', background: color, borderRadius: '2px' }} />
          <div>
            <div style={{ color: C.text3, fontSize: '0.6875rem', letterSpacing: '2px', fontFamily: C.mono, marginBottom: '3px' }}>
              DISPLACEMENT TRAJECTORY /// ORACLE ENGINE
            </div>
            <div style={{ color: C.text, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              {roleTitle} — {baseYear}–{finalYear} Forecast
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px',
        }}>
          <div style={{
            background: `${color}15`, border: `1px solid ${color}35`,
            borderRadius: '6px', padding: '4px 10px',
            color, fontSize: '1.1rem', fontWeight: 800, fontFamily: C.mono,
          }}>
            {finalScore}%
          </div>
          <div style={{ color: C.text3, fontSize: '0.6875rem', fontFamily: C.mono }}>
            by {finalYear}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        background:   'rgba(10,15,25,0.85)',
        border:       `1px solid ${color}20`,
        borderTop:    'none',
        borderRadius: '0 0 12px 12px',
        padding:      '24px',
      }}>

        {/* Interpretation badge */}
        <InterpretBadge trajectory={trajectory} />

        {/* Scenario slider */}
        <ScenarioSlider value={scenarioIdx} onChange={setScenarioIdx} />

        {/* SVG Chart */}
        <div style={{
          background:   C.bg2,
          border:       `1px solid ${C.border}`,
          borderRadius: '12px',
          padding:      '20px 16px 12px',
          marginBottom: '20px',
          overflowX:    'auto',
        }}>
          <TrajectoryChart
            data={displayYears}
            activeScenario={activeScenario}
            threshold={trajectory.threshold}
            seededTrend={careerIntelligence?.riskTrend ?? undefined}
          />
          {serverCalibrated && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              marginTop: '8px', padding: '4px 10px',
              background: 'rgba(0,245,255,0.06)', borderRadius: '4px',
              color: C.cyan, fontSize: '0.6875rem', fontFamily: C.mono,
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: C.cyan, animation: 'trajectoryPulse 2s infinite' }} />
              SERVER-CALIBRATED — DB-backed S-curve model active
            </div>
          )}
        </div>

        {/* Year-by-year grid */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            color:C.text3, fontSize: '0.7rem', letterSpacing: '1.5px',
            textTransform: 'uppercase', fontFamily: C.mono, marginBottom: '12px',
          }}>
            Year-by-Year Risk Projection
          </div>
          <YearGrid
            data={displayYears}
            activeScenario={activeScenario}
            threshold={trajectory.threshold}
            currentScore={currentScore}
          />
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px', marginBottom: '24px',
        }}>
          {[
            { label: 'Avg Growth / Year', value: `+${trajectory.growthPerYear.toFixed(1)}%`, color: scoreColor(trajectory.peakScore) },
            { label: 'Risk at Peak',       value: `${trajectory.peakScore}%`,         color: scoreColor(trajectory.peakScore) },
            { label: 'Safe Threshold',     value: `${trajectory.threshold}%`,          color: C.text2 },
            {
              label: 'Threshold Crossing',
              value:  trajectory.displacementCrossover ?? 'Not in window',
              color:  trajectory.displacementCrossover ? C.red : C.green,
            },
          ].map(stat => (
            <div key={stat.label} style={{
              background: C.bg2, border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '12px',
            }}>
              <div style={{ color: C.text3, fontSize: '0.6875rem', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: C.mono, marginBottom: '6px' }}>
                {stat.label}
              </div>
              <div style={{ color: stat.color, fontFamily: C.mono, fontWeight: 700, fontSize: '1rem' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div>
          <div style={{
            color: C.text3, fontSize: '0.7rem', letterSpacing: '1.5px',
            textTransform: 'uppercase', fontFamily: C.mono, marginBottom: '12px',
          }}>
            Actionable Intelligence
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {trajectory.recommendations.map((rec, i) => (
              <RecCard key={i} rec={rec} />
            ))}
          </div>
        </div>

        {/* Footnote */}
        <div style={{
          marginTop: '24px', paddingTop: '16px',
          borderTop: `1px solid ${C.border}`,
          color: C.text3, fontSize: '0.72rem', fontFamily: C.mono, textAlign: 'center',
          lineHeight: 1.6,
        }}>
          {serverCalibrated
            ? <>Server-calibrated via DB-backed S-curve model · Supplemented by Risk Oracle D1–D6 Engine<br /></>
            : <>Powered by Risk Oracle D1–D6 Multiplicative Engine · WEF Future of Jobs 2025 · McKinsey State of AI · Stanford AI Index<br /></>
          }
          Projections are probabilistic estimates, not guarantees. Update your assessment quarterly.
          <br />
          <span style={{ color: trajectory.isDataStale ? C.red : C.text3 }}>
            {trajectory.isDataStale
              ? `⚠ Growth-rate model as of ${trajectory.dataAsOf} — ${Math.floor(trajectory.dataAgeDays / 30)} mo old, refresh due.`
              : `Growth-rate model as of ${trajectory.dataAsOf} (${trajectory.dataAgeDays}d old).`}
          </span>
        </div>
      </div>
    </div>
  );
};
