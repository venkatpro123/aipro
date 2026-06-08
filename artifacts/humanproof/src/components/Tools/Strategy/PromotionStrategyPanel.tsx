// PromotionStrategyPanel.tsx — Internal mobility + promotion likelihood
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const VIABILITY_CONFIG: Record<string, { color: string; label: string }> = {
  HIGH:     { color: '#10b981', label: 'High — strong internal opportunity' },
  MODERATE: { color: '#f59e0b', label: 'Moderate — some internal options'   },
  LOW:      { color: '#f97316', label: 'Low — limited internal paths'        },
  NONE:     { color: '#ef4444', label: 'None — external move recommended'    },
};

export function PromotionStrategyPanel({ scoreResult }: Props) {
  const mobility = scoreResult.internalMobility;
  const velocity = scoreResult.careerVelocity;

  if (!mobility) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
        Run a full audit to generate your internal mobility analysis.
      </div>
    );
  }

  const cfg = VIABILITY_CONFIG[mobility.internalTransferViability] ?? VIABILITY_CONFIG.MODERATE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Promotion Strategy</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Internal transfer viability, promotion likelihood, and what you need to change to advance.
        </div>
      </div>

      {/* Viability hero */}
      <div style={{ padding: '20px 24px', borderRadius: 14, background: `${cfg.color}10`, border: `1px solid ${cfg.color}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 48, color: cfg.color, lineHeight: 1 }}>
            {Math.round(mobility.viabilityScore)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Internal Transfer Viability</div>
            <div style={{ fontSize: 13, color: cfg.color, marginTop: 4 }}>{cfg.label}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 12, lineHeight: 1.5 }}>
          {mobility.viabilityRationale}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="card-premium" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>TRANSFER TIMELINE</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)' }}>{mobility.estimatedTransferTimelineWeeks}w</div>
        </div>
        <div className="card-premium" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>SURVIVAL BOOST</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>+{mobility.survivalRateBoost}%</div>
        </div>
        {mobility.isGoldenWindow && (
          <div className="card-premium" style={{ padding: '16px', textAlign: 'center', background: 'rgba(245,158,11,0.08)' }}>
            <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 6, fontWeight: 600 }}>🔥 GOLDEN WINDOW</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Optimal transfer timing now</div>
          </div>
        )}
      </div>

      {/* Career trajectory */}
      {velocity && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Career Trajectory</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12,
              background: velocity.trajectory === 'ACCELERATING' ? 'rgba(16,185,129,0.15)' : velocity.trajectory === 'STEADY' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              color: velocity.trajectory === 'ACCELERATING' ? '#10b981' : velocity.trajectory === 'STEADY' ? '#f59e0b' : '#ef4444',
            }}>{velocity.trajectory}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              Velocity score: {Math.round(velocity.velocityScore)}/100
            </span>
          </div>
          {velocity.careerStageProfile?.seniorityLabel && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Seniority: {velocity.careerStageProfile.seniorityLabel}
            </div>
          )}
        </div>
      )}

      {/* Target departments */}
      {mobility.targetDepartments?.length > 0 && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Internal Target Roles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mobility.targetDepartments.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{t.department}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{t.keyBridge}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#10b981', flexShrink: 0, marginLeft: 16 }}>
                  {Math.round(t.fitScore)}% fit
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill gaps */}
      {mobility.requiredSkillGaps?.length > 0 && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Skills to Bridge</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mobility.requiredSkillGaps.map((skill, i) => (
              <span key={i} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f97316' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
