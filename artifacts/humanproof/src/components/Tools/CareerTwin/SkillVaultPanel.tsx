// SkillVaultPanel — Rule 6: skills as transferable career asset inventory (Phase 4)
// Confirmed + target skills overlaid against live demand signals.
// Every skill shows: demand trend, automation risk, portability tier.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Zap, Target, CheckCircle2 } from 'lucide-react';
import { useLayoff } from '../../../context/LayoffContext';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { useAuth } from '../../../context/AuthContext';
import type { HybridResult } from '../../../types/hybridResult';
import type { SkillSignal } from '../../../services/skillPortfolioFitEngine';

// ── Demand indicator ──────────────────────────────────────────────────────────

function DemandChip({ trend }: { trend: 'surging' | 'stable' | 'declining' | 'unknown' }) {
  const cfg = {
    surging:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   icon: TrendingUp,   label: 'SURGING'   },
    stable:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: Minus,        label: 'STABLE'    },
    declining: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    icon: TrendingDown, label: 'DECLINING' },
    unknown:   { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', icon: Minus, label: '?' },
  }[trend];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 4,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <Icon size={8} />
      {cfg.label}
    </span>
  );
}

function AutoRiskDot({ risk }: { risk: number }) {
  const color = risk > 0.6 ? '#ef4444' : risk > 0.35 ? '#f59e0b' : '#10b981';
  return (
    <span title={`Automation risk: ${Math.round(risk * 100)}%`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {Math.round(risk * 100)}% AI risk
    </span>
  );
}

// ── Skill row ─────────────────────────────────────────────────────────────────

function SkillRow({ skill, trend, autoRisk, source }: {
  skill: string;
  trend: 'surging' | 'stable' | 'declining' | 'unknown';
  autoRisk?: number;
  source: 'confirmed' | 'target' | 'gap' | 'detected';
}) {
  const sourceColors: Record<typeof source, string> = {
    confirmed: 'var(--cyan)',
    target: '#a78bfa',
    gap: '#f59e0b',
    detected: '#10b981',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 7,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: sourceColors[source], flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{skill}</span>
      <DemandChip trend={trend} />
      {autoRisk != null && <AutoRiskDot risk={autoRisk} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SkillVaultPanel() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const hr = state.scoreResult as HybridResult | null;
  const skillFit = hr?.skillPortfolioFit;

  useEffect(() => {
    if (!user) return;
    fetchUserProfile().then(setProfile).catch(() => {});
  }, [user]);

  // Map portfolio signals to lookup
  const surgingMap = new Map<string, SkillSignal>(
    (skillFit?.surgingSkills ?? []).map(s => [s.skill.toLowerCase(), s])
  );
  const stableMap = new Map<string, SkillSignal>(
    (skillFit?.stableSkills ?? []).map(s => [s.skill.toLowerCase(), s])
  );
  const decliningMap = new Map<string, SkillSignal>(
    (skillFit?.decliningSkills ?? []).map(s => [s.skill.toLowerCase(), s])
  );

  function trendForSkill(name: string): 'surging' | 'stable' | 'declining' | 'unknown' {
    const n = name.toLowerCase();
    if (surgingMap.has(n)) return 'surging';
    if (stableMap.has(n)) return 'stable';
    if (decliningMap.has(n)) return 'declining';
    return 'unknown';
  }

  function autoRiskForSkill(name: string): number | undefined {
    const n = name.toLowerCase();
    return surgingMap.get(n)?.automatabilityRisk ?? stableMap.get(n)?.automatabilityRisk ?? decliningMap.get(n)?.automatabilityRisk;
  }

  const confirmedSkills = profile?.selfRatedSkills ?? [];
  const targetSkills = profile?.targetSkills ?? [];
  const confirmedSet = new Set(confirmedSkills.map(s => s.toLowerCase()));
  const targetSet = new Set(targetSkills.map(s => s.toLowerCase()));

  // Gap skills: high-demand skills not in confirmed inventory
  const gapSkills = (skillFit?.missingHighValueSkills ?? []).filter(s => !confirmedSet.has(s.toLowerCase()));

  // Detected skills: from pipeline but not in user's self-rated list
  const allPortfolioSkills = [
    ...(skillFit?.surgingSkills ?? []),
    ...(skillFit?.stableSkills ?? []),
    ...(skillFit?.decliningSkills ?? []),
  ];
  const detectedNotConfirmed = allPortfolioSkills.filter(s => !confirmedSet.has(s.skill.toLowerCase())).slice(0, 5);

  const hasAnyData = confirmedSkills.length > 0 || allPortfolioSkills.length > 0;

  if (!hasAnyData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔐</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Skill Vault is empty</div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          Add your skills in the Profile tab, then run an audit to see demand signals and automation risk for each one.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Portfolio score hero */}
      {skillFit && (
        <div style={{
          padding: '16px 18px', borderRadius: 12,
          background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.12)',
          display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontWeight: 800, fontSize: '2.2rem', color: 'var(--cyan)', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
              {skillFit.fitScore}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>portfolio-market fit</div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {skillFit.portfolioStrengthTier} portfolio
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              {skillFit.portfolioInsight}
            </div>
          </div>
          {skillFit.skillDecayRisk !== 'LOW' && (
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              background: skillFit.skillDecayRisk === 'HIGH' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${skillFit.skillDecayRisk === 'HIGH' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              fontSize: '0.68rem', fontWeight: 700,
              color: skillFit.skillDecayRisk === 'HIGH' ? '#ef4444' : '#f59e0b',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {skillFit.skillDecayRisk} DECAY RISK
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--cyan)', label: 'Confirmed (self-rated)' },
          { color: '#a78bfa',     label: 'Target (learning)' },
          { color: '#10b981',     label: 'Detected in role' },
          { color: '#f59e0b',     label: 'Gap (high demand)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Confirmed skills */}
      {confirmedSkills.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <CheckCircle2 size={12} color="var(--cyan)" />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
              YOUR SKILLS ({confirmedSkills.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {confirmedSkills.map(skill => (
              <motion.div
                key={skill}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <SkillRow
                  skill={skill}
                  trend={trendForSkill(skill)}
                  autoRisk={autoRiskForSkill(skill)}
                  source="confirmed"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Detected skills not in confirmed list */}
      {detectedNotConfirmed.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Zap size={12} color="#10b981" />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
              DETECTED IN YOUR ROLE
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {detectedNotConfirmed.map(s => (
              <SkillRow key={s.skill} skill={s.skill} trend={trendForSkill(s.skill)} autoRisk={s.automatabilityRisk} source="detected" />
            ))}
          </div>
        </div>
      )}

      {/* Target skills */}
      {targetSkills.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Target size={12} color="#a78bfa" />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a78bfa', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
              LEARNING ({targetSkills.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {targetSkills.map(skill => (
              <SkillRow key={skill} skill={skill} trend={trendForSkill(skill)} autoRisk={autoRiskForSkill(skill)} source="target" />
            ))}
          </div>
        </div>
      )}

      {/* Gap skills */}
      {gapSkills.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TrendingUp size={12} color="#f59e0b" />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
              HIGH-DEMAND GAPS
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8, lineHeight: 1.4 }}>
            In demand for your role but not in your inventory. Learn these next.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {gapSkills.slice(0, 8).map(skill => (
              <span key={skill} style={{
                padding: '3px 10px', borderRadius: 5,
                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600,
              }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Retool priority */}
      {(skillFit?.retoolPriority?.length ?? 0) > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: 8,
          background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a78bfa', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 8 }}>
            RETOOL PRIORITY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {skillFit!.retoolPriority.slice(0, 5).map((skill, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 800, color: '#a78bfa',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 600 }}>{skill}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
