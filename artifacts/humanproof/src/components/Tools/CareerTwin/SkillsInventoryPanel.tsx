// SkillsInventoryPanel.tsx — HII dimensions + skill portfolio from HybridResult
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const DECAY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };
const TIER_COLORS: Record<string, string> = {
  ELITE: '#10b981', STRONG: '#22c55e', ADEQUATE: '#f59e0b', WEAK: '#f97316', VULNERABLE: '#ef4444',
};
const TREND_ICONS: Record<string, string> = { surging: '↑↑', rising: '↑', stable: '→', declining: '↓', falling: '↓↓', SURGING: '↑↑', GROWING: '↑', STABLE: '→', DECLINING: '↓', OBSOLETE: '↓↓' };
const TREND_COLORS: Record<string, string> = { surging: '#10b981', rising: '#22c55e', stable: '#f59e0b', declining: '#f97316', falling: '#ef4444', SURGING: '#10b981', GROWING: '#22c55e', STABLE: '#f59e0b', DECLINING: '#f97316', OBSOLETE: '#ef4444' };

export function SkillsInventoryPanel({ scoreResult }: Props) {
  const skills = scoreResult.skillPortfolioFit;
  const dims = scoreResult.dimensions ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Skills Inventory</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your skill portfolio health, decay risk, and what to learn next.
        </div>
      </div>

      {/* Portfolio score */}
      {skills && (
        <>
          <div style={{ padding: '20px 24px', borderRadius: 14, background: `${TIER_COLORS[skills.portfolioStrengthTier] ?? '#f59e0b'}10`, border: `1px solid ${TIER_COLORS[skills.portfolioStrengthTier] ?? '#f59e0b'}33` }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 56, color: TIER_COLORS[skills.portfolioStrengthTier] ?? '#f59e0b', lineHeight: 1 }}>
                {Math.round(skills.fitScore)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: TIER_COLORS[skills.portfolioStrengthTier] ?? '#f59e0b' }}>
                  {skills.portfolioStrengthTier} Portfolio
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, maxWidth: 380, lineHeight: 1.5 }}>
                  {skills.portfolioInsight}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                Skill decay risk: <strong style={{ color: DECAY_COLORS[skills.skillDecayRisk] }}>{skills.skillDecayRisk}</strong>
              </span>
              {skills.primaryDecayThreat && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  Primary threat: <strong style={{ color: '#f97316' }}>{skills.primaryDecayThreat}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Skill breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card-premium" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#10b981', marginBottom: 10 }}>Surging Skills</div>
              {(skills.surgingSkills ?? []).slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{s.skill}</span>
                  <span style={{ color: TREND_COLORS[s.trend] ?? '#f59e0b', fontWeight: 700 }}>{TREND_ICONS[s.trend] ?? '→'}</span>
                </div>
              ))}
              {(skills.surgingSkills ?? []).length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No surging skills detected</div>}
            </div>
            <div className="card-premium" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#ef4444', marginBottom: 10 }}>Declining Skills</div>
              {(skills.decliningSkills ?? []).slice(0, 5).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{s.skill}</span>
                  <span style={{ color: TREND_COLORS[s.trend] ?? '#ef4444', fontWeight: 700 }}>{TREND_ICONS[s.trend] ?? '↓'}</span>
                </div>
              ))}
              {(skills.decliningSkills ?? []).length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No declining skills</div>}
            </div>
          </div>

          {/* Learn next */}
          {(skills.retoolPriority ?? []).length > 0 && (
            <div className="card-premium" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Learn Next (Priority Order)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skills.retoolPriority.map((s, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)', fontWeight: 600 }}>
                    {i + 1}. {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Risk dimensions */}
      {dims.length > 0 && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Risk Dimension Scores</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dims.slice(0, 8).map(dim => (
              <div key={dim.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{dim.key}: {dim.label ?? dim.key}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: (dim.score ?? 0) > 60 ? '#ef4444' : (dim.score ?? 0) > 35 ? '#f59e0b' : '#10b981' }}>
                    {Math.round(dim.score ?? 0)}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${dim.score ?? 0}%`, background: (dim.score ?? 0) > 60 ? '#ef4444' : (dim.score ?? 0) > 35 ? '#f59e0b' : '#10b981' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!skills && dims.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
          Run a full audit to populate your skills inventory.
        </div>
      )}
    </div>
  );
}
