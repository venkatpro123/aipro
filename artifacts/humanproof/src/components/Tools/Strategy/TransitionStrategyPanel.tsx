// TransitionStrategyPanel.tsx — Full career pivot planner from escapePaths + skillPortfolio
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const TIER_CONFIG: Record<string, { color: string }> = {
  ELITE:      { color: '#10b981' },
  STRONG:     { color: '#22c55e' },
  ADEQUATE:   { color: '#f59e0b' },
  WEAK:       { color: '#f97316' },
  VULNERABLE: { color: '#ef4444' },
};

export function TransitionStrategyPanel({ scoreResult }: Props) {
  const paths = scoreResult.escapePaths;
  const skills = scoreResult.skillPortfolioFit;
  const runway = scoreResult.financialRunway;

  const topPath = paths?.paths?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Transition Strategy</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          A full career pivot plan: target path, skill gaps, financial bridge, and milestone timeline.
        </div>
      </div>

      {/* Skill portfolio */}
      {skills && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Skill Portfolio Assessment</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 40, color: TIER_CONFIG[skills.portfolioStrengthTier]?.color ?? '#f59e0b', lineHeight: 1 }}>
              {Math.round(skills.fitScore)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: TIER_CONFIG[skills.portfolioStrengthTier]?.color ?? '#f59e0b' }}>
                {skills.portfolioStrengthTier}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{skills.portfolioInsight}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 8 }}>SURGING SKILLS</div>
              {skills.surgingSkills?.slice(0, 4).map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', padding: '4px 0', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#10b981' }}>↑</span> {s.skill}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>DECLINING SKILLS</div>
              {skills.decliningSkills?.slice(0, 4).map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', padding: '4px 0', display: 'flex', gap: 6 }}>
                  <span style={{ color: '#ef4444' }}>↓</span> {s.skill}
                </div>
              ))}
            </div>
          </div>

          {skills.retoolPriority?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 600, marginBottom: 8 }}>PRIORITY SKILLS TO LEARN</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.retoolPriority.slice(0, 6).map((s, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top escape path as transition plan */}
      {topPath && (
        <div className="card-premium" style={{ padding: 20, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#a78bfa', marginBottom: 6 }}>Recommended Transition Path</div>
          <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>{topPath.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 16 }}>{topPath.rationale}</div>

          {/* Milestone timeline */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>Milestone Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topPath.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#a78bfa20', border: '2px solid #a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{i + 1}</div>
                  {i < topPath.steps.length - 1 && <div style={{ width: 2, height: 24, background: 'rgba(167,139,250,0.25)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{step.action}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{step.timeframe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial bridge */}
      {runway && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--cyan)' }}>Financial bridge:</strong>{' '}
          You have <strong>{runway.runwayMonths} months</strong> of runway ({runway.tierLabel}).{' '}
          {runway.runwayMonths >= 6
            ? 'Sufficient to pursue a quality transition — resist rushing into any offer.'
            : 'Limited runway — prioritize speed in your search while maintaining quality standards.'}
        </div>
      )}

      {/* Missing high-value skills */}
      {skills?.missingHighValueSkills?.length > 0 && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Missing High-Value Skills to Acquire</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.missingHighValueSkills.slice(0, 8).map((s, i) => (
              <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                + {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
