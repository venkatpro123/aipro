// SkillDemandTracker — "Which skill matters next?" (Rule 10)
// Reads from skillPortfolioFit (pre-computed against user's skills_inventory).
// Shows: rising, declining, at-risk, and gap skills with demand data.
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Plus } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { SkillSignal } from '../../../services/skillPortfolioFitEngine';
import { DataSourceLabel } from '../../shared/DataSourceLabel';

interface Props {
  scoreResult: HybridResult;
}

function demandBar(score: number, color: string) {
  return (
    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', width: '100%', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, score)}%` }}
        transition={{ duration: 0.5 }}
        style={{ height: '100%', background: color, borderRadius: 2 }}
      />
    </div>
  );
}

function halfLifeLabel(years: number): string {
  if (years < 1) return '< 1 yr';
  if (years < 2) return `~${Math.round(years)} yr`;
  return `~${Math.round(years)} yrs`;
}

function SkillRow({ sig, badge, color }: { sig: SkillSignal; badge: React.ReactNode; color: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {badge}
        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>
          {sig.skill}
        </span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color, fontFamily: 'var(--font-mono, monospace)' }}>
          {Math.round(sig.demandScore)}/100
        </span>
      </div>
      {demandBar(sig.demandScore, color)}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
          {sig.marketInsight}
        </span>
        {sig.halfLifeYears < 3 && (
          <span style={{
            fontSize: '0.63rem', fontWeight: 700,
            color: '#f59e0b', fontFamily: 'var(--font-mono, monospace)',
          }}>
            half-life {halfLifeLabel(sig.halfLifeYears)}
          </span>
        )}
        {sig.automatabilityRisk > 0.6 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: '0.63rem', fontWeight: 700, color: '#ef4444',
          }}>
            <Zap size={9} />
            {Math.round(sig.automatabilityRisk * 100)}% AI risk
          </span>
        )}
      </div>
    </div>
  );
}

export function SkillDemandTracker({ scoreResult }: Props) {
  const skills = scoreResult.skillPortfolioFit;

  if (!skills) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
        Add your skills to your profile to activate skill demand tracking.
        <br />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'settings' } }))}
          style={{
            marginTop: 14, background: 'var(--cyan)', color: '#000',
            border: 'none', borderRadius: 7, padding: '8px 18px',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Add Skills →
        </button>
      </div>
    );
  }

  // Skills with high automatability risk (from user's portfolio)
  const allUserSkills = [...(skills.surgingSkills ?? []), ...(skills.stableSkills ?? []), ...(skills.decliningSkills ?? [])];
  const atRiskSkills = allUserSkills
    .filter(s => s.automatabilityRisk > 0.55)
    .sort((a, b) => b.automatabilityRisk - a.automatabilityRisk);

  const surging = (skills.surgingSkills ?? []).slice(0, 4);
  const declining = (skills.decliningSkills ?? []).slice(0, 3);
  const gaps = (skills.missingHighValueSkills ?? []).slice(0, 6);
  const nextSkills = (skills.retoolPriority ?? []).slice(0, 3);

  const fitColor = skills.portfolioStrengthTier === 'ELITE' ? '#10b981'
    : skills.portfolioStrengthTier === 'STRONG' ? '#22c55e'
    : skills.portfolioStrengthTier === 'ADEQUATE' ? '#f59e0b'
    : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Portfolio score header */}
      <div style={{
        padding: '18px 20px', borderRadius: 12,
        background: `${fitColor}08`, border: `1px solid ${fitColor}25`,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontWeight: 800, fontSize: 40, color: fitColor, lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
          {Math.round(skills.fitScore)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 2 }}>
            {skills.portfolioStrengthTier} Portfolio
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
            {skills.portfolioInsight}
          </div>
          {skills.skillDecayRisk === 'HIGH' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <AlertTriangle size={11} color="#ef4444" />
              <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
                Skill decay risk HIGH — {skills.primaryDecayThreat} being automated
              </span>
            </div>
          )}
        </div>
        <DataSourceLabel tier="MODELED" sourceName="Job posting analysis" date={scoreResult.calculatedAt} />
      </div>

      {/* Priority: learn next */}
      {nextSkills.length > 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.18)',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--font-mono, monospace)' }}>
            LEARN NEXT
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {nextSkills.map(s => (
              <span key={s} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6,
                background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.25)',
                fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)',
              }}>
                <Plus size={10} />
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rising demand — skills you have that are growing */}
      {surging.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={13} color="#10b981" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)' }}>
              Rising demand — you have these
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {surging.map(sig => (
              <SkillRow
                key={sig.skill}
                sig={sig}
                color="#10b981"
                badge={<TrendingUp size={11} color="#10b981" />}
              />
            ))}
          </div>
        </div>
      )}

      {/* Declining — skills losing demand */}
      {declining.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingDown size={13} color="#f97316" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f97316', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)' }}>
              Declining demand — deprioritise these
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {declining.map(sig => (
              <SkillRow
                key={sig.skill}
                sig={sig}
                color="#f97316"
                badge={<TrendingDown size={11} color="#f97316" />}
              />
            ))}
          </div>
        </div>
      )}

      {/* At-risk — high automatability skills in user's portfolio */}
      {atRiskSkills.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Zap size={13} color="#ef4444" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)' }}>
              AI automation risk — move away from these
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {atRiskSkills.slice(0, 3).map(sig => (
              <SkillRow
                key={sig.skill}
                sig={sig}
                color="#ef4444"
                badge={<Zap size={11} color="#ef4444" />}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gap skills — high demand, not in user's profile */}
      {gaps.length > 0 && (
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--font-mono, monospace)' }}>
            SKILL GAPS — IN DEMAND BUT NOT IN YOUR PROFILE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {gaps.map(s => (
              <span key={s} style={{
                padding: '3px 9px', borderRadius: 6,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                fontSize: '0.76rem', fontWeight: 600, color: '#f59e0b',
              }}>
                {s}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
            Adding even 2–3 of these to your profile increases role match significantly.
          </div>
        </div>
      )}
    </div>
  );
}
