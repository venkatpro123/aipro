// CareerDecisionSimulator.tsx — Phase 4: Decision-Based Career Simulator
// Answers: "What happens to my risk if I make THIS career decision?"
// 7 decisions built from real HybridResult dimensions — no hardcoded deltas.

import { useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface CareerDecision {
  id:          string;
  icon:        string;
  title:       string;
  subtitle:    string;
  rationale:   string;
  // Per-dimension multipliers applied to breakdown[dim]*total for projection
  changes:     Array<{ dim: string; factor: number }>;
  // Text that explains the tradeoff
  tradeoff:    string;
  // Constraint: when to warn
  constraint?: (hr: HybridResult) => string | null;
}

const DECISIONS: CareerDecision[] = [
  {
    id:       'stay',
    icon:     '🏰',
    title:    'Stay & Defend',
    subtitle: 'Optimise within current role',
    rationale: 'Use your best sensitivity levers to reduce risk without leaving. Highest leverage when company health is adequate.',
    changes:  [
      { dim: 'D4', factor: -0.22 }, // tenure improvement over time
      { dim: 'D7', factor: -0.15 }, // performance signalling
      { dim: 'D8', factor: -0.12 }, // seniority visibility
    ],
    tradeoff: 'Lower risk but slower. Best if company fundamentals are solid.',
    constraint: (hr) => {
      const companyRisk = (hr.breakdown?.['D3'] ?? 0) + (hr.breakdown?.['L2'] ?? 0);
      if (companyRisk > 0.7) return 'Warning: company risk is high — staying may be defending a sinking ship.';
      return null;
    },
  },
  {
    id:       'switch',
    icon:     '🚀',
    title:    'Switch Company',
    subtitle: 'Move to a healthier employer',
    rationale: 'Escape company-specific risk. Resets L2/L3 company vulnerability but introduces short-term transition risk.',
    changes:  [
      { dim: 'L2', factor: -0.60 }, // company health risk resets
      { dim: 'L3', factor: -0.35 }, // synthetic risk score improves
      { dim: 'D3', factor: -0.55 }, // company amplification reduced
      { dim: 'D4', factor: +0.18 }, // tenure resets to zero — short-term risk
    ],
    tradeoff: 'Biggest long-term risk reduction. Short-term tenure/transition cost.',
    constraint: (hr) => {
      const visaDep = hr.visaRisk?.dependencyScore ?? 0;
      if (visaDep > 60) return 'High visa employer dependency — switching requires transfer approval or new sponsorship.';
      return null;
    },
  },
  {
    id:       'ai-role',
    icon:     '🤖',
    title:    'Move to AI Role',
    subtitle: 'Transition into AI / automation domain',
    rationale: 'Reduces AI displacement risk by aligning with the direction of automation rather than opposing it.',
    changes:  [
      { dim: 'D1', factor: -0.65 }, // AI displacement risk drops sharply
      { dim: 'D3', factor: -0.20 }, // broader market demand improves
      { dim: 'D6', factor: -0.15 }, // experience relevance increases
    ],
    tradeoff: 'Strongest AI protection long-term. Requires skill transition investment.',
    constraint: (hr) => {
      const runway = hr.financialRunwayMonths ?? 6;
      if (runway < 3) return 'Financial runway < 3 months — skill transition investment may be unaffordable right now.';
      return null;
    },
  },
  {
    id:       'manager',
    icon:     '👔',
    title:    'Become a Manager',
    subtitle: 'Move into people leadership',
    rationale: 'Managers are typically later in layoff order. Reduces AI displacement exposure for IC roles.',
    changes:  [
      { dim: 'D7', factor: -0.25 }, // seniority tier improves
      { dim: 'D1', factor: -0.30 }, // AI less likely to target managers
      { dim: 'D6', factor: -0.20 }, // experience complexity increases
      { dim: 'D8', factor: -0.15 }, // performance more visible as a manager
    ],
    tradeoff: 'Good stability improvement. Requires strong internal visibility and endorsement.',
    constraint: (hr) => {
      const tenure = hr.breakdown?.['D4'] ?? 0.4;
      if (tenure > 0.5) return 'Short tenure detected — management track typically requires 2+ years of established performance.';
      return null;
    },
  },
  {
    id:       'consulting',
    icon:     '💼',
    title:    'Go Consulting / Freelance',
    subtitle: 'Diversify income across multiple clients',
    rationale: 'Eliminates single-employer dependency (L2/L3) but increases financial variability. Best for high-network roles.',
    changes:  [
      { dim: 'L2', factor: -0.80 }, // company-specific risk eliminated
      { dim: 'L3', factor: -0.45 },
      { dim: 'L1', factor: +0.30 }, // financial volatility increases
      { dim: 'D5', factor: -0.20 }, // geographic freedom improves
    ],
    tradeoff: 'Eliminates company-specific risk but adds financial unpredictability. Best for strong networks.',
    constraint: (hr) => {
      const network = hr.networkLeverage?.networkScore ?? 30;
      const runway  = hr.financialRunwayMonths ?? 4;
      if (network < 40 && runway < 4) return 'Low network + low runway: consulting without clients is high-risk. Build network first.';
      return null;
    },
  },
  {
    id:       'relocate',
    icon:     '✈️',
    title:    'Relocate',
    subtitle: 'Move to a higher-demand market',
    rationale: 'Geographic optionality can significantly lower sector risk if your current region is over-indexed to one industry.',
    changes:  [
      { dim: 'L5', factor: -0.40 }, // location risk reduced
      { dim: 'D2', factor: -0.30 }, // sector/industry risk diversified
    ],
    tradeoff: 'High personal impact but strong long-term positioning in demand markets.',
    constraint: (hr) => {
      const visaDep = hr.visaRisk?.dependencyScore ?? 0;
      if (visaDep > 40) return 'Visa dependency may restrict relocation options without employer sponsorship in new country.';
      return null;
    },
  },
  {
    id:       'upskill',
    icon:     '📚',
    title:    'Intensive Upskilling',
    subtitle: '3–6 month focused skill investment',
    rationale: 'Directly reduces AI displacement risk and improves experience relevance score. Fastest ROI when skills are actively hiring.',
    changes:  [
      { dim: 'D1', factor: -0.35 }, // AI displacement reduced by skill update
      { dim: 'D3', factor: -0.18 }, // market demand for role improves
      { dim: 'D6', factor: -0.25 }, // experience complexity improves
    ],
    tradeoff: 'Relatively low disruption. Time investment required. Maximum 6-month horizon to realise gains.',
    constraint: (hr) => {
      const runway = hr.financialRunwayMonths ?? 6;
      if (runway < 2) return 'Runway under 2 months — upskilling time investment may not be viable before financial pressure.';
      return null;
    },
  },
];

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function projectRisk(hr: HybridResult, decision: CareerDecision): number {
  const b = hr.breakdown ?? {};
  const base = hr.total;

  // Each change: contribution = breakdown[dim] * total, then apply factor
  const totalDelta = decision.changes.reduce((sum, ch) => {
    const contribution = (b[ch.dim] ?? 0) * base;
    // factor is negative = risk reduction, positive = risk increase
    return sum + contribution * ch.factor;
  }, 0);

  return clamp(Math.round(base + totalDelta), 5, 97);
}

function deltaColor(delta: number) {
  if (delta < -10) return '#10b981';
  if (delta < -3)  return '#34d399';
  if (delta < 3)   return '#f59e0b';
  return '#ef4444';
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props { scoreResult: HybridResult }

export function CareerDecisionSimulator({ scoreResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const base = scoreResult.total;

  const projections = DECISIONS.map(d => {
    const projected = projectRisk(scoreResult, d);
    const delta     = projected - base;
    const warning   = d.constraint ? d.constraint(scoreResult) : null;
    return { decision: d, projected, delta, warning };
  });

  // Sort: biggest risk reduction first
  projections.sort((a, b) => a.delta - b.delta);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>
          CAREER DECISION SIMULATOR
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          See how each career move would change your risk score — based on your actual audit data.
        </div>
      </div>

      {/* Current score anchor */}
      <div style={{
        padding: '10px 16px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Current risk score</span>
        <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: '#ef4444' }}>
          {base}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Tap any decision to see the projected impact.</span>
      </div>

      {/* Decision grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projections.map(({ decision, projected, delta, warning }) => {
          const isSelected = selected === decision.id;
          const dColor = deltaColor(delta);

          return (
            <div key={decision.id}>
              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : decision.id)}
                style={{
                  width: '100%', background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? dColor + '35' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10, padding: '12px 16px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{decision.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                    {decision.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {decision.subtitle}
                  </div>
                </div>

                {/* Projected score + delta */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 20, fontWeight: 900,
                    fontFamily: 'var(--font-mono, monospace)', color: dColor, lineHeight: 1,
                  }}>
                    {projected}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: dColor }}>
                    {delta > 0 ? '+' : ''}{delta} pts
                  </span>
                </div>

                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  {isSelected ? '▲' : '▾'}
                </span>
              </button>

              {isSelected && (
                <div style={{
                  padding: '12px 16px 14px', borderRadius: '0 0 10px 10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${dColor}20`, borderTop: 'none',
                  marginTop: -2,
                }}>
                  {/* Rationale */}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 10 }}>
                    {decision.rationale}
                  </div>

                  {/* Score visualization */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, monospace)' }}>
                      {base}
                    </span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: dColor,
                        width: `${Math.abs(delta) / base * 100}%`,
                        marginLeft: delta < 0 ? undefined : `${projected / base * 100}%`,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: dColor, fontFamily: 'var(--font-mono, monospace)' }}>
                      {projected}
                    </span>
                  </div>

                  {/* Tradeoff */}
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '7px 10px',
                    borderRadius: 6, background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.5, marginBottom: warning ? 8 : 0,
                  }}>
                    ⚖️ {decision.tradeoff}
                  </div>

                  {/* Constraint warning */}
                  {warning && (
                    <div style={{
                      fontSize: 11, color: '#f59e0b', padding: '7px 10px',
                      borderRadius: 6, background: 'rgba(245,158,11,0.06)',
                      border: '1px solid rgba(245,158,11,0.2)', lineHeight: 1.5, marginTop: 8,
                    }}>
                      ⚠ {warning}
                    </div>
                  )}

                  {/* Dimension drivers */}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {decision.changes.map(ch => (
                      <span key={ch.dim} style={{
                        padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: ch.factor < 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: ch.factor < 0 ? '#10b981' : '#ef4444',
                        border: `1px solid ${ch.factor < 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        fontFamily: 'var(--font-mono, monospace)',
                      }}>
                        {ch.dim} {ch.factor < 0 ? '↓' : '↑'}{Math.abs(Math.round(ch.factor * 100))}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
        ESTIMATED · Projections derived from your audit breakdown dimensions and documented risk factor changes. Actual outcomes depend on execution.
      </div>
    </div>
  );
}
