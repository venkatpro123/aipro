// CareerDecisionSimulator.tsx — Decision Simulation (Rule #8)
// "What happens if I stay / switch / move into AI / become a manager / freelance
//  / relocate / upskill?" — each move projects a FULL alternate future:
// risk, promotion probability, salary growth, resilience, P(success), timeline,
// benefits, and risks. All derived from the user's real audit via
// careerSimulationEngine — no hardcoded universal deltas.

import { useEffect, useMemo, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import {
  DECISIONS,
  simulateDecisionFuture,
  type SimulatedFuture,
} from '../../../services/careerSimulationEngine';
import { getCohortSimulationFactors } from '../../../services/userOutcomeLearningService';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';

function deltaColor(delta: number) {
  if (delta < -10) return '#10b981';
  if (delta < -3) return '#34d399';
  if (delta < 3) return '#f59e0b';
  return '#ef4444';
}

const RESILIENCE_COLOR: Record<SimulatedFuture['resilience'], string> = {
  'Very High': '#10b981', High: '#34d399', Moderate: '#f59e0b', Low: '#ef4444',
};

// A compact outcome metric (label + value + color).
function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 78, textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

interface Props { scoreResult: HybridResult }

export function CareerDecisionSimulator({ scoreResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cohortFactors, setCohortFactors] = useState<Record<string, Record<string, number>> | null>(null);
  const base = scoreResult.total;

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile().then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
    getCohortSimulationFactors().then(f => { if (!cancelled) setCohortFactors(f); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Simulate every decision's full future, sorted by biggest risk reduction.
  const futures = useMemo(() => {
    return DECISIONS
      .map(d => ({ decision: d, future: simulateDecisionFuture(d, scoreResult, profile, cohortFactors) }))
      .sort((a, b) => a.future.riskDelta - b.future.riskDelta);
  }, [scoreResult, profile, cohortFactors]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>
          CAREER DECISION SIMULATOR
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Each move projects a full alternate future — risk, promotion odds, salary, resilience, and your probability of pulling it off.
        </div>
      </div>

      {/* Current score anchor */}
      <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Current risk score</span>
        <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: '#ef4444' }}>{base}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Tap any decision to explore that future.</span>
      </div>

      {/* Decision grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {futures.map(({ decision, future }) => {
          const isSelected = selected === decision.id;
          const dColor = deltaColor(future.riskDelta);

          return (
            <div key={decision.id}>
              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : decision.id)}
                style={{
                  width: '100%', background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? dColor + '35' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{decision.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{decision.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{decision.subtitle}</div>
                </div>
                {/* Headline: P(success) + projected risk */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>SUCCESS</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: future.successProbability >= 65 ? '#10b981' : future.successProbability >= 45 ? '#f59e0b' : '#ef4444', fontFamily: 'var(--font-mono, monospace)' }}>
                      {future.successProbability}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: dColor, lineHeight: 1 }}>{future.projectedRisk}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: dColor }}>{future.riskDelta > 0 ? '+' : ''}{future.riskDelta} pts</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{isSelected ? '▲' : '▾'}</span>
                </div>
              </button>

              {isSelected && (
                <div style={{ padding: '14px 16px 16px', borderRadius: '0 0 10px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${dColor}20`, borderTop: 'none', marginTop: -2 }}>
                  {/* Rationale */}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 12 }}>{decision.rationale}</div>

                  {/* Four outcome metrics */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <Metric label="Risk" value={`${future.projectedRisk}`} color={dColor} />
                    <Metric label="Promotion" value={`${future.promotionProbability}%`} color="#60a5fa" />
                    <Metric label="Salary" value={`+${future.salaryGrowthPct}%`} color="#10b981" />
                    <Metric label="Resilience" value={future.resilience} color={RESILIENCE_COLOR[future.resilience]} />
                  </div>

                  {/* Probability + timeline strip */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                      P(success) {future.successProbability}%
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                      ⏱ {future.timelineLabel}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                      {future.confidence}% confidence · {future.confidenceKind.toUpperCase()}
                    </span>
                  </div>

                  {/* Benefits + risks, side by side */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: future.constraintWarning ? 10 : 0 }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.1em', marginBottom: 6 }}>BENEFITS</div>
                      {future.benefits.map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <span style={{ color: '#10b981', flexShrink: 0, fontSize: 11 }}>+</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{b}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 6 }}>RISKS / TRADEOFFS</div>
                      {future.risks.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <span style={{ color: '#f59e0b', flexShrink: 0, fontSize: 11 }}>−</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Constraint warning */}
                  {future.constraintWarning && (
                    <div style={{ fontSize: 11, color: '#f59e0b', padding: '7px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', lineHeight: 1.5, marginTop: 10 }}>
                      ⚠ {future.constraintWarning}
                    </div>
                  )}

                  {/* Dimension drivers */}
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
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
        {cohortFactors
          ? 'MODELED · Projections calibrated against outcomes from users who made the same move.'
          : 'ESTIMATED · Projections derived from your audit breakdown + personal signals (runway, network, skill fit, market demand). They become MODELED once enough users report outcomes for each move. Actual results depend on execution.'}
      </div>
    </div>
  );
}
