// DefenseStrategyPlan.tsx — Personalised 30 / 90 / 180-day defence roadmaps
// Built from scoreSensitivity.levers + escapePaths.
// Each plan is a time-phased sequence of the highest-impact actions
// with a projected score at completion.

import { useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import type { SensitivityLever } from '../../../services/scoreSensitivityEngine';

// ── Plan configuration ────────────────────────────────────────────────────────

const PLAN_CONFIGS = [
  {
    id:    '30'  as const,
    label: '30 Days',
    title: 'Rapid Defence',
    desc:  'Highest-impact, lowest-effort actions only. Maximum protection, minimum time.',
    color: '#ef4444',
  },
  {
    id:    '90'  as const,
    label: '90 Days',
    title: 'Active Defence',
    desc:  'Short and medium-term actions combined. Significant, durable risk reduction.',
    color: '#f59e0b',
  },
  {
    id:    '180' as const,
    label: '180 Days',
    title: 'Career Fortification',
    desc:  'Full portfolio of defensive actions plus escape path activation.',
    color: '#10b981',
  },
];

// ── Lever selection per plan ──────────────────────────────────────────────────

function getLeversForPlan(levers: SensitivityLever[], plan: '30' | '90' | '180'): SensitivityLever[] {
  if (plan === '30') {
    return levers
      .filter(l => l.feasibility === 'immediate' || l.feasibility === 'short_term')
      .slice(0, 3);
  }
  if (plan === '90') return levers.slice(0, 5);
  return levers.slice(0, 7);
}

// ── Phase grouping ────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<'30' | '90' | '180', string[]> = {
  '30':  ['Week 1–2', 'Week 3–4'],
  '90':  ['Month 1', 'Month 2–3'],
  '180': ['Month 1–2', 'Month 3–4', 'Month 5–6'],
};

function distributeLevers(levers: SensitivityLever[], phases: string[]): SensitivityLever[][] {
  if (!levers.length) return phases.map(() => []);
  const perPhase = Math.ceil(levers.length / phases.length);
  return phases.map((_, i) => levers.slice(i * perPhase, (i + 1) * perPhase));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  scoreResult: HybridResult;
}

export function DefenseStrategyPlan({ scoreResult }: Props) {
  const [activePlan, setActivePlan] = useState<'30' | '90' | '180'>('30');

  const allLevers  = scoreResult.scoreSensitivity?.levers ?? [];
  const planLevers = getLeversForPlan(allLevers, activePlan);
  const planCfg    = PLAN_CONFIGS.find(p => p.id === activePlan)!;
  const phases     = PHASE_LABELS[activePlan];
  const distributed = distributeLevers(planLevers, phases);

  // Project score after completing all plan actions
  const totalDrop     = planLevers.reduce((acc, l) => acc + l.scoreDropIfImproved, 0);
  const currentScore  = scoreResult.total ?? 0;
  const projectedScore = Math.max(5, currentScore - totalDrop);

  // Escape paths (available for 180-day plan)
  const escapePaths = (scoreResult as any).escapePaths as
    | { title?: string; role?: string; fitScore?: number; description?: string; timeToTransition?: string }[]
    | undefined;

  const actionCount = planLevers.length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>
          Personalised Defence Plan
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          A structured roadmap built from your highest-impact actions. Pick your time horizon.
        </div>
      </div>

      {/* Plan selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {PLAN_CONFIGS.map(plan => {
          const active = activePlan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setActivePlan(plan.id)}
              style={{
                flex: 1, padding: '12px 6px', borderRadius: 9, cursor: 'pointer',
                background: active ? `${plan.color}14` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? plan.color + '40' : 'rgba(255,255,255,0.1)'}`,
                textAlign: 'center', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: active ? plan.color : 'rgba(255,255,255,0.45)', marginBottom: 2 }}>
                {plan.label}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {plan.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Plan summary banner */}
      <div style={{
        padding: '14px 18px', borderRadius: 11, marginBottom: 22,
        background: `${planCfg.color}08`, border: `1px solid ${planCfg.color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: planCfg.color, letterSpacing: '0.06em', marginBottom: 3 }}>
            {planCfg.title.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
            {planCfg.desc}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
            {actionCount} action{actionCount !== 1 ? 's' : ''} · {planCfg.label} commitment
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 3, letterSpacing: '0.08em' }}>
            PROJECTED SCORE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: planCfg.color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
              {projectedScore}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              (−{Math.min(totalDrop, currentScore - 5)})
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {actionCount > 0 ? (
        <div>
          {phases.map((phase, phaseIdx) => {
            const phaseLevers = distributed[phaseIdx] ?? [];
            if (!phaseLevers.length) return null;

            const phaseStart = distributed.slice(0, phaseIdx).reduce((s, arr) => s + arr.length, 0);

            return (
              <div key={phase} style={{ marginBottom: 18 }}>
                {/* Phase label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: planCfg.color, boxShadow: `0 0 6px ${planCfg.color}80`,
                  }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                    {phase}
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 18 }}>
                  {phaseLevers.map((lever, i) => (
                    <div
                      key={lever.dimension}
                      className="card-premium"
                      style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                    >
                      {/* Step number */}
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        border: `1px solid ${planCfg.color}44`,
                        background: `${planCfg.color}10`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: planCfg.color,
                        fontFamily: 'var(--font-mono, monospace)',
                      }}>
                        {phaseStart + i + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                          {lever.dimensionLabel}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', lineHeight: 1.5, marginBottom: 7 }}>
                          {lever.fastestAction}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '1px 7px', borderRadius: 3, fontSize: 9, fontWeight: 700,
                            background: 'rgba(16,185,129,0.1)', color: '#10b981',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}>
                            −{lever.scoreDropIfImproved} pts
                          </span>
                          <span style={{
                            padding: '1px 7px', borderRadius: 3, fontSize: 9,
                            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
                          }}>
                            {lever.actionTimeframe}
                          </span>
                          <span style={{
                            padding: '1px 7px', borderRadius: 3, fontSize: 9, fontWeight: 600,
                            background: lever.feasibility === 'immediate'   ? 'rgba(16,185,129,0.1)'
                              : lever.feasibility === 'short_term' ? 'rgba(245,158,11,0.1)'
                              : 'rgba(249,115,22,0.1)',
                            color: lever.feasibility === 'immediate'   ? '#10b981'
                              : lever.feasibility === 'short_term' ? '#f59e0b'
                              : '#f97316',
                          }}>
                            {lever.feasibility === 'immediate'   ? 'Easy'
                              : lever.feasibility === 'short_term' ? 'Medium'
                              : 'Hard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Escape paths — only on 180-day plan */}
          {activePlan === '180' && escapePaths && escapePaths.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 6px #10b98180' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                  ESCAPE PATH OPTIONS
                </div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 18 }}>
                {escapePaths.slice(0, 3).map((path, i) => (
                  <div key={i} className="card-premium" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 18, flexShrink: 0 }}>🚀</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                        {path.title ?? path.role ?? `Escape Path ${i + 1}`}
                      </div>
                      {path.description && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                          {path.description}
                        </div>
                      )}
                      {path.timeToTransition && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                          Transition: {path.timeToTransition}
                        </div>
                      )}
                    </div>
                    {path.fitScore !== undefined && (
                      <div style={{
                        fontSize: 14, fontWeight: 800, color: '#10b981',
                        fontFamily: 'var(--font-mono, monospace)', flexShrink: 0,
                      }}>
                        {path.fitScore}% fit
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          Run an audit to generate your personalised defence roadmap.
        </div>
      )}
    </div>
  );
}
