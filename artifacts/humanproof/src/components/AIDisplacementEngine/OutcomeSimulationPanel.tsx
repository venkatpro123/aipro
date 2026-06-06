// OutcomeSimulationPanel — Deterministic 3-scenario outcome forecast
// No Action / 50% Plan / Full Plan — shows projected risk, runway, competitive probability, AI resilience.

import React from 'react';
import type { AutomationTimeline } from '../../data/automationTimelineData';
import type { TrajectoryResult } from '../../services/DisplacementTrajectoryEngine';

interface ActionLike {
  protectionIncrease: number;
}

interface Props {
  timeline: AutomationTimeline;
  trajectory: TrajectoryResult;
  score: number;
  d7Score?: number;
  experience?: string;
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
  timeline: AutomationTimeline,
  trajectory: TrajectoryResult,
  actions: ActionLike[],
): { noAction: ScenarioResult; plan50: ScenarioResult; planFull: ScenarioResult } {
  const growthPerYear = Math.max(1, trajectory.growthPerYear);
  const base2028 = timeline.displacementByYear[2028] * 100;
  const base2030 = timeline.displacementByYear[2030] * 100;

  const noAction2028 = Math.min(95, base2028 + growthPerYear * 2);
  const noAction2030 = Math.min(95, base2030 + growthPerYear * 4);

  const plan50_2028 = Math.round(noAction2028 * 0.73);
  const plan50_2030 = Math.round(noAction2030 * 0.72);
  const planFull2028 = Math.round(noAction2028 * 0.53);
  const planFull2030 = Math.round(noAction2030 * 0.48);

  const runway50   = Math.min(5, Math.max(0, Math.round(((70 - plan50_2028) / growthPerYear) * 10) / 10));
  const runwayFull = Math.min(8, Math.max(0, Math.round(((70 - planFull2028) / growthPerYear) * 10) / 10));

  const totalProtection = actions.reduce((s, a) => s + a.protectionIncrease, 0);
  const halfCount = Math.ceil(actions.length / 2);
  const half50protection = actions.slice(0, halfCount).reduce((s, a) => s + a.protectionIncrease, 0);

  return {
    noAction: {
      risk2028: Math.round(noAction2028),
      risk2030: Math.round(noAction2030),
      runwayYears: 0,
      competitiveProbability: Math.max(5, Math.round(100 - noAction2030)),
      resilienceGain: 0,
    },
    plan50: {
      risk2028: plan50_2028,
      risk2030: plan50_2030,
      runwayYears: runway50,
      competitiveProbability: Math.max(15, Math.round(100 - plan50_2030)),
      resilienceGain: Math.round(half50protection),
    },
    planFull: {
      risk2028: planFull2028,
      risk2030: planFull2030,
      runwayYears: runwayFull,
      competitiveProbability: Math.max(35, Math.round(100 - planFull2030)),
      resilienceGain: Math.round(totalProtection),
    },
  };
}

const SCENARIOS: { key: 'noAction' | 'plan50' | 'planFull'; label: string; sub: string; color: string; bg: string }[] = [
  { key: 'noAction', label: 'No Action',  sub: 'Current trajectory continues', color: 'var(--red)',     bg: 'rgba(239,68,68,0.06)' },
  { key: 'plan50',   label: '50% Plan',   sub: 'Partial action on key items',  color: 'var(--amber)',   bg: 'rgba(251,191,36,0.06)' },
  { key: 'planFull', label: 'Full Plan',  sub: 'All recommended actions taken', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.06)' },
];

function riskColor(risk: number): string {
  if (risk >= 65) return 'var(--red)';
  if (risk >= 45) return 'var(--amber)';
  if (risk >= 25) return 'var(--cyan)';
  return 'var(--emerald)';
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
  timeline, trajectory, score, d7Score = 55, experience = '5-10', actions,
}) => {
  const { noAction, plan50, planFull } = computeOutcomes(timeline, trajectory, actions);
  const results: Record<string, ScenarioResult> = { noAction, plan50, planFull };

  return (
    <div style={{
      marginTop: '32px',
      padding: '24px 28px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{
          padding: '3px 10px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-2)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        }}>
          OUTCOME SIMULATION · DETERMINISTIC FORECAST
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>2028–2030 projection · three scenarios</span>
      </div>

      {/* 3-column scenarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {SCENARIOS.map(({ key, label, sub, color, bg }) => {
          const r = results[key];
          return (
            <div key={key} style={{
              padding: '16px 18px', borderRadius: '12px',
              background: bg, border: `1px solid ${color}25`,
              borderTop: `3px solid ${color}`,
            }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{sub}</div>
              </div>

              <MetricRow label="2028 Risk" value={`${r.risk2028}%`} color={riskColor(r.risk2028)} />
              <MetricRow label="2030 Risk" value={`${r.risk2030}%`} color={riskColor(r.risk2030)} />

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />

              <MetricRow
                label="Extra Runway"
                value={r.runwayYears > 0 ? `+${r.runwayYears} yrs` : '—'}
                color={r.runwayYears > 0 ? 'var(--emerald)' : 'var(--text-3)'}
              />
              <MetricRow
                label="Remain Competitive"
                value={`${r.competitiveProbability}%`}
                color={r.competitiveProbability >= 60 ? 'var(--emerald)' : r.competitiveProbability >= 35 ? 'var(--amber)' : 'var(--red)'}
              />
              <MetricRow
                label="AI Resilience Gain"
                value={r.resilienceGain > 0 ? `+${r.resilienceGain} pts` : 'No change'}
                color={r.resilienceGain > 0 ? color : 'var(--text-3)'}
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '16px', paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5,
      }}>
        Projections are deterministic estimates based on role displacement research (McKinsey, Oxford Martin) and career transition outcome studies. Individual results depend on execution quality, market conditions, and timing. "Remain Competitive" reflects the probability of maintaining current career trajectory without major displacement.
      </div>
    </div>
  );
};
