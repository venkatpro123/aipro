// OutcomeSimulationPanel — Deterministic 3-scenario outcome forecast
// No Action / 50% Plan / Full Plan — shows projected risk, runway, competitive probability, AI resilience.

import React, { useState } from 'react';
import type { AutomationTimeline } from '../../data/automationTimelineData';
import type { TrajectoryResult } from '../../services/DisplacementTrajectoryEngine';
import { yearIndexToMonthLabel } from '../../services/DisplacementTrajectoryEngine';
import { riskToSurvival } from '../../data/riskFormula';
import { getForecastMetadata } from '../../data/forecastRealism';

interface ActionLike {
  protectionIncrease: number;
}

interface Props {
  timeline: AutomationTimeline;
  trajectory: TrajectoryResult;
  score: number;
  d7Score?: number;
  experience?: string;
  roleKey?: string;
  actions: ActionLike[];
}

interface ScenarioResult {
  risk2028: number;
  risk2030: number;
  runwayYears: number;
  competitiveProbability: number;
  resilienceGain: number;
}

function computeOutcomes(
  _timeline: AutomationTimeline,
  trajectory: TrajectoryResult,
  actions: ActionLike[],
  score: number,
): { noAction: ScenarioResult; plan50: ScenarioResult; planFull: ScenarioResult } {
  // Anchor everything to the user's actual score — the single source of truth.
  // growthPerYear guaranteed ≥ 1.5 so there is always a visible gap between scenarios.
  const growthPerYear = Math.max(1.5, trajectory.growthPerYear);

  // No-action path: score grows at full rate
  const noAction2028risk = Math.min(95, score + growthPerYear * 2);
  const noAction2030risk = Math.min(95, score + growthPerYear * 4);

  // Partial plan: 35% risk-growth mitigation (always visible above no-action)
  const plan50_2028risk = Math.min(95, score + growthPerYear * 2 * 0.65);
  const plan50_2030risk = Math.min(95, score + growthPerYear * 4 * 0.65);

  // Full plan: 55% risk-growth mitigation (always meaningful above partial)
  const planFull2028risk = Math.min(95, score + growthPerYear * 2 * 0.45);
  const planFull2030risk = Math.min(95, score + growthPerYear * 4 * 0.45);

  // Guarantee: planFull < plan50 < noAction at both time points
  // (the clamping above is monotone if score is the same anchor, so this holds)

  const runway50   = Math.min(5, Math.max(0.5, Math.round(((70 - plan50_2028risk)  / growthPerYear) * 10) / 10));
  const runwayFull = Math.min(8, Math.max(1.0, Math.round(((70 - planFull2028risk) / growthPerYear) * 10) / 10));

  const totalProtection    = Math.max(10, actions.reduce((s, a) => s + a.protectionIncrease, 0));
  const halfCount          = Math.ceil(actions.length / 2);
  const half50protection   = Math.max(5,  actions.slice(0, halfCount).reduce((s, a) => s + a.protectionIncrease, 0));

  // Competitive probability: derived from survival at 2030
  const compNoAction = Math.max(5,  Math.round(riskToSurvival(Math.round(noAction2030risk))));
  const compPlan50   = Math.max(20, Math.round(riskToSurvival(Math.round(plan50_2030risk))));
  const compPlanFull = Math.max(40, Math.round(riskToSurvival(Math.round(planFull2030risk))));

  // Resilience gain shown in survival-% terms (not raw risk points) — more legible
  const survivalGain50   = Math.max(4, compPlan50   - compNoAction);
  const survivalGainFull = Math.max(8, compPlanFull  - compNoAction);

  return {
    noAction: {
      risk2028: Math.round(noAction2028risk),
      risk2030: Math.round(noAction2030risk),
      runwayYears: 0,
      competitiveProbability: compNoAction,
      resilienceGain: 0,
    },
    plan50: {
      risk2028: Math.round(plan50_2028risk),
      risk2030: Math.round(plan50_2030risk),
      runwayYears: runway50,
      competitiveProbability: compPlan50,
      resilienceGain: survivalGain50,
    },
    planFull: {
      risk2028: Math.round(planFull2028risk),
      risk2030: Math.round(planFull2030risk),
      runwayYears: runwayFull,
      competitiveProbability: compPlanFull,
      resilienceGain: survivalGainFull,
    },
  };
}

const SCENARIOS: { key: 'noAction' | 'plan50' | 'planFull'; label: string; sub: string; color: string; bg: string }[] = [
  { key: 'noAction', label: 'Do Nothing',      sub: "You keep doing what you're doing today",    color: 'var(--red)',     bg: 'rgba(239,68,68,0.06)' },
  { key: 'plan50',   label: 'Take Some Steps', sub: 'You follow some of the recommended actions', color: 'var(--amber)',   bg: 'rgba(251,191,36,0.06)' },
  { key: 'planFull', label: 'Take Full Action', sub: 'You follow the full action plan',            color: 'var(--emerald)', bg: 'rgba(16,185,129,0.06)' },
];

function riskColor(risk: number): string {
  if (risk >= 65) return 'var(--red)';
  if (risk >= 45) return 'var(--amber)';
  if (risk >= 25) return 'var(--cyan)';
  return 'var(--emerald)';
}

function survivalColor(s: number): string {
  if (s >= 70) return 'var(--emerald)';
  if (s >= 50) return 'var(--cyan)';
  if (s >= 30) return 'var(--amber)';
  return 'var(--red)';
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.92rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
    </div>
  );
}

export const OutcomeSimulationPanel: React.FC<Props> = ({
  timeline, trajectory, score, d7Score = 55, experience = '5-10', roleKey = '', actions,
}) => {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const { noAction, plan50, planFull } = computeOutcomes(timeline, trajectory, actions, score);
  const results: Record<string, ScenarioResult> = { noAction, plan50, planFull };
  // Phase 2: confidence margin for range display
  const forecastMeta = getForecastMetadata(roleKey, score, experience);
  const margin = forecastMeta.confidenceLevel === 'High' ? 4 : forecastMeta.confidenceLevel === 'Moderate' ? 7 : 12;
  function survivalRange(base: number): string {
    return `${Math.max(1, base - margin)}–${Math.min(99, base + margin)}%`;
  }

  return (
    <div style={{
      marginTop: '32px',
      padding: '24px 28px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Two-layer forecast header */}
      {(() => {
        const currentSurvival = riskToSurvival(score);
        const structuralRiskLabel = d7Score >= 65 ? 'HIGH' : d7Score >= 40 ? 'MODERATE' : 'LOW';
        const structuralRiskColor = d7Score >= 65 ? 'var(--red)' : d7Score >= 40 ? 'var(--amber)' : 'var(--emerald)';
        const postThresholdSurvival = riskToSurvival(d7Score);
        const capabilityWindow = timeline.impactTimeline === 'short' ? '2026–2028' : timeline.impactTimeline === 'medium' ? '2028–2030' : '2030–2033';
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ fontSize: '0.54rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px', letterSpacing: '0.08em' }}>CURRENT SURVIVAL PROBABILITY</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: survivalColor(currentSurvival), fontFamily: 'var(--font-mono)' }}>{currentSurvival}%</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>Based on today's AI capabilities</div>
            </div>
            <div>
              <div style={{ fontSize: '0.54rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px', letterSpacing: '0.08em' }}>STRUCTURAL AI WAVE RISK</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: structuralRiskColor, fontFamily: 'var(--font-mono)' }}>{structuralRiskLabel}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>Long-term autonomous AI exposure</div>
            </div>
            <div>
              <div style={{ fontSize: '0.54rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px', letterSpacing: '0.08em' }}>CAPABILITY THRESHOLD</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{capabilityWindow}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>When the major AI shift is expected</div>
            </div>
            <div>
              <div style={{ fontSize: '0.54rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px', letterSpacing: '0.08em' }}>POST-THRESHOLD SURVIVAL</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: survivalColor(postThresholdSurvival), fontFamily: 'var(--font-mono)' }}>{postThresholdSurvival}%</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '2px' }}>If the AI wave hits at full force</div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', marginBottom: '6px' }}>
          WHAT HAPPENS NEXT — THREE PATHS FROM TODAY
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
          Your survival probability in 2 and 4 years depending on how much of the action plan you follow.
          The gap between paths is your protection dividend.
        </p>
      </div>

      {/* 3-column scenarios — survival-first display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {SCENARIOS.map(({ key, label, sub, color, bg }) => {
          const r = results[key];
          const surv2028 = riskToSurvival(r.risk2028);
          const surv2030 = riskToSurvival(r.risk2030);
          const gainVsNoAction = r.resilienceGain; // survival-% improvement vs. no-action
          const isNoAction = key === 'noAction';
          return (
            <div key={key} style={{
              padding: '18px 20px', borderRadius: '12px',
              background: bg, border: `1px solid ${color}28`,
              borderTop: `3px solid ${color}`,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Label */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color, marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{sub}</div>
              </div>

              {/* Survival spotlight — the primary number; non-trivial scenarios show ranges */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '4px' }}>SURVIVAL IN 2 YEARS</div>
                <div style={{ fontSize: isNoAction ? '2rem' : '1.55rem', fontWeight: 900, color: survivalColor(surv2028), fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {isNoAction ? `${surv2028}%` : survivalRange(surv2028)}
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '4px' }}>SURVIVAL IN 4 YEARS</div>
                <div style={{ fontSize: isNoAction ? '1.5rem' : '1.2rem', fontWeight: 900, color: survivalColor(surv2030), fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                  {isNoAction ? `${surv2030}%` : survivalRange(surv2030)}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ height: '100%', width: `${surv2030}%`, background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }} />

              {/* Gain vs. no-action */}
              {isNoAction ? (
                <div style={{ fontSize: '0.65rem', color: 'var(--red)', fontWeight: 700 }}>
                  Baseline — no improvement
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ padding: '4px 10px', borderRadius: '5px', background: `${color}15`, border: `1px solid ${color}30`, fontSize: '0.68rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)' }}>
                    +{gainVsNoAction}% survival gain
                  </div>
                  {r.runwayYears > 0 && (
                    <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                      +{r.runwayYears}yr runway
                    </div>
                  )}
                </div>
              )}

              {/* Competitive probability */}
              <MetricRow
                label="Staying competitive"
                value={`${r.competitiveProbability}%`}
                color={r.competitiveProbability >= 60 ? 'var(--emerald)' : r.competitiveProbability >= 35 ? 'var(--amber)' : 'var(--red)'}
              />
            </div>
          );
        })}
      </div>

      {/* Forecast assumptions collapsible — Phase 3 */}
      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          onClick={() => setAssumptionsOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
        >
          {assumptionsOpen ? '▲' : '▼'} Forecast basis &amp; assumptions
          <span style={{ padding: '1px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontSize: '0.58rem', color: 'var(--text-3)', fontWeight: 600 }}>
            {forecastMeta.confidenceLevel} confidence · {forecastMeta.window}
          </span>
        </button>

        {assumptionsOpen && (
          <div style={{ marginTop: '10px', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '8px' }}>FORECAST ASSUMPTIONS</div>
            <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {forecastMeta.assumptions.map((a, i) => (
                <li key={i} style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{a}</li>
              ))}
            </ul>
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '4px' }}>ALTERNATIVE SCENARIO</div>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{forecastMeta.alternativeScenario}</p>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.5, fontStyle: 'italic' }}>
              {forecastMeta.methodologyNote}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '12px',
        fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5,
      }}>
        These projections are estimates based on research into how careers evolve with AI. They're directional — your actual outcome depends on how you execute, market timing, and factors outside anyone's model. Use them for direction, not prediction.
      </div>
    </div>
  );
};
