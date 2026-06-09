// TransitionStrategyPanel — "Should I switch jobs?" (Rule 10, 17)
// Decision frame: Stay+Grow / Stay+Pivot / Leave Now / Leave in 6mo
// DataSourceLabel on every data point. No prediction language.
import { useState } from 'react';
import { ArrowRight, Clock, TrendingUp, Building2, Map } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import { DataSourceLabel } from '../../shared/DataSourceLabel';

interface Props {
  scoreResult: HybridResult;
}

const TIER_COLOR: Record<string, string> = {
  ELITE:      '#10b981',
  STRONG:     '#22c55e',
  ADEQUATE:   '#f59e0b',
  WEAK:       '#f97316',
  VULNERABLE: '#ef4444',
};

type Decision = 'stay-grow' | 'stay-pivot' | 'leave-now' | 'leave-6mo';

interface DecisionOption {
  id: Decision;
  label: string;
  tag: string;
  tagColor: string;
  description: string;
  bestWhen: string;
}

const DECISION_OPTIONS: DecisionOption[] = [
  {
    id: 'stay-grow',
    label: 'Stay + Grow',
    tag: 'LOW RISK',
    tagColor: '#10b981',
    description: 'Stay in role, focus on skill acquisition and internal visibility.',
    bestWhen: 'Company is stable, your readiness is improving, equity is vesting.',
  },
  {
    id: 'stay-pivot',
    label: 'Stay + Pivot',
    tag: 'MEDIUM EFFORT',
    tagColor: '#f59e0b',
    description: 'Stay at the company but move to a lower-risk department or role.',
    bestWhen: 'Your department is at risk but the company is healthy and values you.',
  },
  {
    id: 'leave-now',
    label: 'Leave Now',
    tag: 'ACTIVE SEARCH',
    tagColor: '#f97316',
    description: 'Begin active job search immediately. Target roles with strong demand.',
    bestWhen: 'Multiple collapse signals, limited runway, no vesting lock-in.',
  },
  {
    id: 'leave-6mo',
    label: 'Leave in 6 mo',
    tag: 'PLANNED EXIT',
    tagColor: 'var(--cyan)',
    description: 'Position yourself for departure while completing near-term milestones.',
    bestWhen: 'Vesting cliff coming, building skills for a specific target role.',
  },
];

function recommendDecision(hr: HybridResult): Decision {
  const score = hr.total ?? 50;
  const collapse = hr.collapseStage ?? 0;
  const vesting = hr.compensationRisk?.vestingProtection;
  const exitMonths = hr.exitTiming?.monthsUntilOptimalWindow ?? 0;
  const runway = hr.financialRunway?.runwayMonths ?? 6;

  if (score >= 70 && collapse < 2) return 'stay-grow';
  if (collapse >= 3 || (score < 25 && runway >= 3)) return 'leave-now';
  if (exitMonths <= 3 && (vesting === 'WEAK' || vesting === 'NONE')) return 'leave-now';
  if (exitMonths > 0 && exitMonths <= 6) return 'leave-6mo';
  if (hr.internalMobility?.internalTransferViability === 'HIGH') return 'stay-pivot';
  if (score < 45) return 'leave-6mo';
  return 'stay-grow';
}

export function TransitionStrategyPanel({ scoreResult }: Props) {
  const paths = scoreResult.escapePaths;
  const skills = scoreResult.skillPortfolioFit;
  const runway = scoreResult.financialRunway;
  const exitTiming = scoreResult.exitTiming;
  const mobility = scoreResult.internalMobility;

  const recommended = recommendDecision(scoreResult);
  const [selectedDecision, setSelectedDecision] = useState<Decision>(recommended);

  const topPath = paths?.paths?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Decision frame (Rule 10 — "Should I switch?") */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)', marginBottom: 10 }}>
          DECISION FRAMEWORK
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {DECISION_OPTIONS.map(opt => {
            const isSelected = selectedDecision === opt.id;
            const isRecommended = recommended === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedDecision(opt.id)}
                style={{
                  background: isSelected ? `${opt.tagColor}10` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? opt.tagColor + '40' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '12px 14px', textAlign: 'left' as const,
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.84rem', color: isSelected ? opt.tagColor : 'var(--text)' }}>
                    {opt.label}
                  </span>
                  {isRecommended && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)',
                      padding: '1px 5px', borderRadius: 4,
                      background: `${opt.tagColor}18`, color: opt.tagColor,
                    }}>
                      SUGGESTED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                  {opt.bestWhen}
                </div>
              </button>
            );
          })}
        </div>
        {/* Selected decision detail */}
        <div style={{
          marginTop: 10, padding: '12px 14px', borderRadius: 9,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {DECISION_OPTIONS.filter(o => o.id === selectedDecision).map(opt => (
            <div key={opt.id}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: opt.tagColor, marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{opt.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exit timing window */}
      {exitTiming && (
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Clock size={13} color="var(--cyan)" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Exit Timing</span>
            </div>
            <DataSourceLabel tier="MODELED" sourceName="Vesting + market calendar" date={scoreResult.calculatedAt} compact />
          </div>
          {exitTiming.optimalDepartureWindow.months.length > 0 ? (
            <>
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                  {exitTiming.monthsUntilOptimalWindow === 0
                    ? 'Now is optimal'
                    : `Optimal in ${exitTiming.monthsUntilOptimalWindow} month${exitTiming.monthsUntilOptimalWindow > 1 ? 's' : ''}`}
                </span>
                {' '}— {exitTiming.optimalDepartureWindow.reason}
              </div>
              {exitTiming.unvestedIfImmediateExit > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  Immediate exit: {exitTiming.unvestedIfImmediateExit > 0
                    ? `leaves $${Math.round(exitTiming.unvestedIfImmediateExit / 1000)}K unvested`
                    : 'no unvested equity'} ·
                  Optimal exit: {exitTiming.unvestedAtOptimalExit > 0
                    ? `$${Math.round(exitTiming.unvestedAtOptimalExit / 1000)}K unvested`
                    : 'fully vested'}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
              No vesting lock-in detected — timing is flexible.
            </div>
          )}
        </div>
      )}

      {/* Internal mobility — stay + pivot option */}
      {mobility && mobility.internalTransferViability !== 'NONE' && (
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={13} color="#a78bfa" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Internal Pivot Options</span>
            </div>
            <DataSourceLabel tier="ESTIMATED" sourceName="Company structure model" compact />
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 10,
            padding: '3px 10px', borderRadius: 6,
            background: mobility.internalTransferViability === 'HIGH' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${mobility.internalTransferViability === 'HIGH' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
          }}>
            <TrendingUp size={11} color={mobility.internalTransferViability === 'HIGH' ? '#10b981' : '#f59e0b'} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: mobility.internalTransferViability === 'HIGH' ? '#10b981' : '#f59e0b' }}>
              {mobility.internalTransferViability} viability
            </span>
          </div>
          {(mobility.targetDepartments ?? []).slice(0, 3).map((dept, i) => (
            <div key={i} style={{
              padding: '8px 10px', borderRadius: 7, marginBottom: 6,
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>{dept.department}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', fontFamily: 'var(--font-mono, monospace)' }}>
                  {Math.round(dept.fitScore)}% fit
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                {dept.keyBridge} · {dept.estimatedOpenings}
              </div>
            </div>
          ))}
          {mobility.requiredSkillGaps.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              Skills needed: {mobility.requiredSkillGaps.slice(0, 3).join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Top escape path as transition plan */}
      {topPath && (
        <div className="card-premium" style={{ padding: 18, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#a78bfa' }}>Recommended Transition Path</div>
            <DataSourceLabel tier="MODELED" sourceName="Escape path analysis" date={scoreResult.calculatedAt} compact />
          </div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>{topPath.title}</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 16 }}>{topPath.rationale}</div>

          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', marginBottom: 10 }}>Milestone Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPath.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.15)', border: '2px solid #a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa',
                  }}>{i + 1}</div>
                  {i < topPath.steps.length - 1 && (
                    <div style={{ width: 2, height: 22, background: 'rgba(167,139,250,0.2)', marginTop: 4 }} />
                  )}
                </div>
                <div style={{ paddingTop: 3 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>{step.action}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{step.timeframe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill portfolio */}
      {skills && (
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Skill Portfolio Fit</div>
            <DataSourceLabel tier="MODELED" sourceName="Job posting analysis" compact />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 36, color: TIER_COLOR[skills.portfolioStrengthTier] ?? '#f59e0b', lineHeight: 1 }}>
              {Math.round(skills.fitScore)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: TIER_COLOR[skills.portfolioStrengthTier] ?? '#f59e0b' }}>
                {skills.portfolioStrengthTier}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{skills.portfolioInsight}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>SURGING</div>
              {(skills.surgingSkills ?? []).slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', padding: '3px 0', display: 'flex', gap: 5 }}>
                  <ArrowRight size={10} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                  {s.skill}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>DECLINING</div>
              {(skills.decliningSkills ?? []).slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', padding: '3px 0', display: 'flex', gap: 5 }}>
                  <ArrowRight size={10} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  {s.skill}
                </div>
              ))}
            </div>
          </div>
          {(skills.retoolPriority ?? []).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: 7, letterSpacing: '0.08em' }}>LEARN NEXT</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.retoolPriority.slice(0, 5).map((s, i) => (
                  <span key={i} style={{
                    fontSize: '0.74rem', padding: '2px 9px', borderRadius: 5,
                    background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)',
                    color: 'var(--cyan)',
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial bridge */}
      {runway && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.12)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--cyan)', marginBottom: 4 }}>
              Financial Bridge: {runway.runwayMonths} months ({runway.tierLabel})
            </div>
            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              {runway.runwayMonths >= 9
                ? 'Strong runway — pursue quality over speed. Don\'t accept the first offer.'
                : runway.runwayMonths >= 5
                ? 'Adequate runway — maintain selectivity but don\'t delay starting your search.'
                : 'Limited runway — begin search now and set a clear decision deadline.'}
            </div>
          </div>
          <DataSourceLabel tier="ESTIMATED" sourceName="Profile data" compact />
        </div>
      )}
    </div>
  );
}
