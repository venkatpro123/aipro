// RiskForecast.tsx — Phase B: Bear/base/bull 3-line forecast
// Replaces the single projection line with three scenario lines
// derived from hr.scenarioPlan + hr.scoreDelta (user's actual velocity).
// Assumption chips are shown so users understand each line's basis.
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import ProvenanceLabel from '../../AuditTabs/common/ProvenanceLabel';
import { useOrchestratorBus } from '../../../hooks/useOrchestratorBus';

interface Props {
  scoreResult: HybridResult;
}

interface ForecastPoint {
  month: number;
  label?: string;
  bear: number;
  base: number;
  bull: number;
}

// ─── Forecast builder ─────────────────────────────────────────────────────────

function buildThreeForecastLines(hr: HybridResult): ForecastPoint[] {
  const base = hr.total ?? 50;
  const macro = hr.macroEconomicRisk;
  const macroStress = macro?.riskTier === 'STRESS' || macro?.riskTier === 'CRISIS';

  // Velocity adjustment from actual user history (direction-aware)
  const velDir = hr.scoreDelta?.direction ?? 'stable';
  const velAdj = velDir === 'worsening' ? +0.5 : velDir === 'improving' ? -0.3 : 0;

  // Scenario anchors at month 6 from scenarioPlan or computed fallbacks
  const bearAnchor6 = hr.scenarioPlan?.worstCase?.score ?? Math.min(97, base + 18);
  const baseAnchor6 = hr.scenarioPlan?.baseCase?.score ?? base;
  const bullAnchor6 = hr.scenarioPlan?.bestCase?.score ?? Math.max(5, base - 15);

  // Action impact: bull line drops extra in months 1–2 when user follows plan
  const actionDrop = ((hr as any).recommendations?.[0]?.riskReductionPct ?? 5) * 0.4;

  const points: ForecastPoint[] = [];
  for (let m = 0; m <= 12; m++) {
    const t = m / 6; // 0 at start, 1 at 6-month anchor, 2 at 12 months

    // Bear — linearly interpolates 0→anchor6, then stays flat 7–12
    const bearRaw = m <= 6
      ? base + (bearAnchor6 - base) * (m / 6)
      : bearAnchor6 + (macroStress ? (m - 6) * 0.3 : 0);

    // Base — velocity-tilted linear to anchor6, continues gently beyond
    const baseRaw = m <= 6
      ? base + (baseAnchor6 - base) * (m / 6) + velAdj * m
      : baseAnchor6 + velAdj * Math.max(0, m - 6) * 0.5;

    // Bull — drops early due to action impact (visible divergence months 1–2)
    const earlyDrop = m <= 2 ? actionDrop * (m / 2) : actionDrop;
    const bullRaw = m <= 6
      ? base - earlyDrop + (bullAnchor6 - base + earlyDrop) * (m / 6)
      : bullAnchor6 - earlyDrop * 0.5;

    const point: ForecastPoint = {
      month: m,
      bear: Math.round(Math.max(5, Math.min(97, bearRaw))),
      base: Math.round(Math.max(5, Math.min(97, baseRaw))),
      bull: Math.round(Math.max(5, Math.min(97, bullRaw))),
    };
    if (m === 0) point.label = 'Now';
    if (m === 3) point.label = '3M';
    if (m === 6) point.label = '6M';
    if (m === 12) point.label = '12M';
    points.push(point);
  }
  return points;
}

// ─── SVG path helper ──────────────────────────────────────────────────────────

function toSvgPath(
  points: ForecastPoint[],
  key: 'bear' | 'base' | 'bull',
  minVal: number,
  range: number,
  chartH: number,
): string {
  return points
    .map((p, i) => {
      const x = (i / 12) * 100;
      const y = chartH - ((p[key] - minVal) / range) * (chartH - 10) - 5;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RiskForecast({ scoreResult }: Props) {
  const feed = useOrchestratorBus();
  const [showLegend, setShowLegend] = useState(false);

  const points = useMemo(() => buildThreeForecastLines(scoreResult), [scoreResult]);

  const allValues = points.flatMap(p => [p.bear, p.base, p.bull]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 10;
  const chartH = 130;

  const current = points[0];
  const six = points[6];
  const twelve = points[12];

  const delta12base = twelve.base - current.base;

  // Scenario probabilities
  const bearProb = scoreResult.scenarioPlan?.worstCase?.probability ?? 0.25;
  const baseProb = scoreResult.scenarioPlan?.baseCase?.probability ?? 0.50;
  const bullProb = scoreResult.scenarioPlan?.bestCase?.probability ?? 0.25;

  // Assumption chip data
  const macroTier = scoreResult.macroEconomicRisk?.riskTier ?? 'Unknown';
  const velDir = scoreResult.scoreDelta?.direction ?? 'No history';
  const actionPct = (scoreResult as any).recommendations?.[0]?.riskReductionPct ?? 5;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          12-Month Risk Forecast
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Three scenarios: bear (no action), base (current trend), bull (active plan).
        </div>
      </div>

      {/* Orchestrator context bar */}
      {feed?.trace?.conclusion && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '7px 12px', borderRadius: 7, marginBottom: 14,
            background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
            fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)',
            flexShrink: 0, boxShadow: '0 0 6px var(--cyan)',
          }} />
          <span>{feed.trace.conclusion}</span>
        </motion.div>
      )}

      {/* Summary cards — 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Current',  score: current.base, color: '#ef4444' },
          { label: 'Bear 6M',  score: six.bear,     color: '#ef4444' },
          { label: 'Base 6M',  score: six.base,     color: six.base > current.base ? '#f97316' : '#10b981' },
          { label: 'Bull 6M',  score: six.bull,     color: '#10b981' },
        ].map(card => (
          <div key={card.label} className="card-premium" style={{ padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.07em', marginBottom: 5 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.score}</div>
          </div>
        ))}
      </div>

      {/* Trend indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10, marginBottom: 22,
        background: delta12base < -5 ? 'rgba(16,185,129,0.1)' : delta12base > 5 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${delta12base < -5 ? 'rgba(16,185,129,0.3)' : delta12base > 5 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      }}>
        {delta12base < -5
          ? <TrendingDown size={16} color="#10b981" />
          : delta12base > 5
          ? <TrendingUp size={16} color="#ef4444" />
          : <Minus size={16} color="rgba(255,255,255,0.5)" />}
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {delta12base < -5
            ? `Base scenario: risk drops ${Math.abs(delta12base)} pts over 12 months.`
            : delta12base > 5
            ? `Base scenario: risk rises ${delta12base} pts — act now to shift to the bull path.`
            : 'Base scenario: relatively stable over 12 months. Active plan makes a real difference.'}
        </span>
      </div>

      {/* Chart */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em' }}>
            RISK TRAJECTORY
          </div>
          {/* Legend toggle */}
          <button
            type="button"
            onClick={() => setShowLegend(v => !v)}
            style={{
              display: 'flex', gap: 12, alignItems: 'center',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            {[
              { label: `Bear (${Math.round(bearProb * 100)}%)`, color: '#ef4444', dash: true },
              { label: `Base (${Math.round(baseProb * 100)}%)`, color: '#f59e0b', dash: false },
              { label: `Bull (${Math.round(bullProb * 100)}%)`, color: '#10b981', dash: false },
            ].map(leg => (
              <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="18" height="8">
                  <line
                    x1="0" y1="4" x2="18" y2="4"
                    stroke={leg.color} strokeWidth={1.5}
                    strokeDasharray={leg.dash ? '4 3' : undefined}
                  />
                </svg>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono, monospace)' }}>
                  {leg.label}
                </span>
              </div>
            ))}
          </button>
        </div>

        <div style={{ position: 'relative', height: chartH }}>
          {/* viewBox="0 0 100 130" maps path coordinates (x: 0–100, y: 0–130)
              to the full SVG viewport so lines span the entire chart width. */}
          <svg width="100%" height={chartH} viewBox={`0 0 100 ${chartH}`}
            preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            {[25, 50, 75].map(y => {
              const cy = chartH - ((y - minVal) / range) * (chartH - 15) - 5;
              return (
                <line key={y} x1={0} y1={cy} x2={100} y2={cy}
                  stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke" />
              );
            })}

            {/* Bear line (red dashed) */}
            <path
              d={toSvgPath(points, 'bear', minVal, range, chartH)}
              fill="none" stroke="#ef4444" strokeWidth={1.5}
              strokeDasharray="6 4" opacity={0.65}
              vectorEffect="non-scaling-stroke"
            />

            {/* Base line (amber solid) */}
            <path
              d={toSvgPath(points, 'base', minVal, range, chartH)}
              fill="none" stroke="#f59e0b" strokeWidth={2}
              opacity={0.85} vectorEffect="non-scaling-stroke"
            />

            {/* Bull line (green solid) */}
            <path
              d={toSvgPath(points, 'bull', minVal, range, chartH)}
              fill="none" stroke="#10b981" strokeWidth={2}
              opacity={0.85} vectorEffect="non-scaling-stroke"
            />

            {/* Vertical guide lines at 3M, 6M, 12M */}
            {[3, 6, 12].map(m => {
              const cx = (m / 12) * 100;
              return (
                <line key={m} x1={cx} y1={0} x2={cx} y2={chartH}
                  stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke" />
              );
            })}
          </svg>
        </div>

        {/* Month labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {['Now', '3M', '6M', '9M', '12M'].map(l => (
            <div key={l} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{l}</div>
          ))}
        </div>
      </div>

      {/* Per-scenario assumption cards */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
          WHY EACH SCENARIO EXISTS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              id: 'bear',
              label: 'Bear (No Action)',
              color: '#ef4444',
              bg: 'rgba(239,68,68,0.06)',
              border: 'rgba(239,68,68,0.2)',
              prob: Math.round(bearProb * 100),
              score6m: six.bear,
              description: scoreResult.scenarioPlan?.worstCase?.triggerConditions?.join('. ')
                ?? 'AI adoption accelerates in your sector, hiring freezes deepen, and no defensive action is taken.',
              assumptions: [
                { label: `Macro environment: ${macroTier}`, kind: 'estimated' as const },
                { label: 'No skill investment or job search activity', kind: 'modeled' as const },
                { label: 'Sector headwinds persist or worsen', kind: 'estimated' as const },
              ],
            },
            {
              id: 'base',
              label: 'Base (Current Trend)',
              color: '#f59e0b',
              bg: 'rgba(245,158,11,0.06)',
              border: 'rgba(245,158,11,0.2)',
              prob: Math.round(baseProb * 100),
              score6m: six.base,
              description: scoreResult.scenarioPlan?.baseCase?.triggerConditions?.join('. ')
                ?? 'Current behaviour maintained. Risk evolves with market, no acceleration in either direction.',
              assumptions: [
                { label: `Your velocity: ${velDir}`, kind: 'modeled' as const },
                { label: `Macro: ${macroTier}`, kind: 'estimated' as const },
                { label: 'No major role or company changes', kind: 'modeled' as const },
              ],
            },
            {
              id: 'bull',
              label: 'Bull (Active Plan)',
              color: '#10b981',
              bg: 'rgba(16,185,129,0.06)',
              border: 'rgba(16,185,129,0.2)',
              prob: Math.round(bullProb * 100),
              score6m: six.bull,
              description: scoreResult.scenarioPlan?.bestCase?.triggerConditions?.join('. ')
                ?? 'You complete your top 3 defence actions in the first 60 days. Skill gaps close, visibility increases.',
              assumptions: [
                { label: `If you act: −${actionPct} pts in month 1`, kind: 'modeled' as const },
                { label: 'Top 3 priority actions completed by month 2', kind: 'modeled' as const },
                { label: 'Network and job-search activity begins', kind: 'estimated' as const },
              ],
            },
          ].map(scenario => (
            <ScenarioAssumptionCard key={scenario.id} {...scenario} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Scenario assumption card ─────────────────────────────────────────────────

interface ScenarioCardProps {
  label: string; color: string; bg: string; border: string;
  prob: number; score6m: number; description: string;
  assumptions: { label: string; kind: 'estimated' | 'modeled' | 'measured' }[];
}

function ScenarioAssumptionCard({ label, color, bg, border, prob, score6m, description, assumptions }: ScenarioCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderRadius: 10, background: bg, border: `1px solid ${border}`, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
          boxShadow: `0 0 5px ${color}80`,
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
          {prob}% · {score6m} at 6M
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{open ? '▲' : '▾'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${border}` }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginTop: 10, marginBottom: 10 }}>
            {description}
          </p>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.09em', marginBottom: 6 }}>
            ASSUMPTIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {assumptions.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1 }}>{a.label}</span>
                <ProvenanceLabel kind={a.kind} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
