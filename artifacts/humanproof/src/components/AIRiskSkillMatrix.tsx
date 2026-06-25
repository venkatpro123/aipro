// ═══════════════════════════════════════════════════════════════════════════════
// AIRiskSkillMatrix.tsx — Visual AI Skill Risk Breakdown Component
// Shows: Obsolete | At-Risk | Safe skill tiers with impact bars, disruption
// timelines, adaptation strategies, and long-term value indicators.
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { CareerIntelligence, SkillRisk, SafeSkill } from '../data/intelligence/types.ts';
import { AlertTriangle, XCircle, CheckCircle2, Clock, Zap, TrendingUp, Shield, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { buildObsoleteAdvice, buildAtRiskAdvice } from '../services/skillAdviceBuilder';
import { LearningIllustration } from './illustrations/AdditionalIllustrations';

interface Props {
  intel: CareerIntelligence;
  scoreColor: string;
  roleKey?: string;
}

// ── Horizon label → estimated months ─────────────────────────────────────────
// BUG-06 FIX: Added 'immediate', '<1yr', 'now' horizon cases that appeared
// in some seeded role data but were silently falling through to the 24-month default.
const horizonToMonths = (horizon: string | undefined | null): number => {
  if (!horizon) return 24;
  const h = horizon.toLowerCase().trim();
  if (h === 'immediate' || h === 'now' || h === 'active') return 3;
  if (h === '<1yr' || h === '0-1yr' || h === '<12mo') return 9;
  if (h.includes('1yr') || h === '1-2yr') return 12;
  if (h === '2yr' || h === '1-3yr') return 18;
  if (h === '3yr' || h === '3-5yr') return 36;
  if (h === '5yr+') return 60;
  return 24;
};

const horizonLabel = (horizon: string | undefined | null): string => {
  const months = horizonToMonths(horizon);
  if (months <= 3)  return 'Immediate threat';
  if (months <= 9)  return '< 12 months';
  if (months <= 12) return '< 12 months';
  if (months <= 18) return '12–18 months';
  if (months <= 36) return '1–3 years';
  return '3–5 years';
};

const horizonUrgency = (horizon: string | undefined | null): 'critical' | 'warning' | 'caution' => {
  const months = horizonToMonths(horizon);
  if (months <= 12) return 'critical';
  if (months <= 24) return 'warning';
  return 'caution';
};

// ── AI Tool Badge ─────────────────────────────────────────────────────────────
const AIToolBadge = ({ tool }: { tool: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'rgba(239,68,68,0.12)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700,
    fontFamily: 'var(--font-mono, monospace)',
  }}>
    <Zap size={9} /> {tool}
  </span>
);

// ── Impact Bar ────────────────────────────────────────────────────────────────
const ImpactBar = ({ score, color, label }: { score: number; color: string; label: string }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '0.75rem', color, fontWeight: 800 }}>{score}/100</span>
    </div>
    <div style={{ height: 5, background: 'var(--alpha-bg-06)', borderRadius: '99px', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${score}%`, background: color,
        borderRadius: '99px',
        boxShadow: `0 0 8px ${color}60`,
        transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
      }} />
    </div>
  </div>
);

// ── Urgency Clock ─────────────────────────────────────────────────────────────
const UrgencyClock = ({ horizon }: { horizon: string | undefined | null }) => {
  const urgency = horizonUrgency(horizon);
  const colorMap = { critical: '#ef4444', warning: '#f59e0b', caution: '#3b82f6' };
  const color = colorMap[urgency];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}15`, color, border: `1px solid ${color}30`,
      borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700,
    }}>
      <Clock size={9} /> {horizonLabel(horizon)}
    </span>
  );
};

// ── Skill Row: Obsolete ───────────────────────────────────────────────────────
const ObsoleteSkillRow = ({ skill, idx }: { skill: SkillRisk; idx: number }) => {
  const [expanded, setExpanded] = useState(idx === 0);

  // Adaptation advice composition lives in services/skillAdviceBuilder.ts so it
  // is independently unit-testable (component file would otherwise pull in React).

  return (
    <div style={{
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 12, padding: 16, marginBottom: 10,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <XCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.875rem', letterSpacing: '-0.01em' }}>
                {skill.skill}
              </span>
              <UrgencyClock horizon={skill.horizon} />
              {skill.aiReplacement === 'Full' && (
                <span style={{
                  background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                  borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em',
                }}>FULLY AUTOMATED</span>
              )}
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4, lineHeight: 1.5 }}>
              {skill.reason}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(239,68,68,0.15)' }}>
          {skill.aiTool && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Replacing Tool:</span>
              {skill.aiTool.split(',').map(t => <AIToolBadge key={t} tool={t.trim()} />)}
            </div>
          )}
          <ImpactBar score={skill.riskScore} color="#ef4444" label="AI Replacement Risk" />
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: 'rgba(239,68,68,0.08)', borderRadius: 8,
            borderLeft: '3px solid #ef4444',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#ef4444' }}>Adaptation Strategy:</strong>{' '}
              {buildObsoleteAdvice(skill)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Skill Row: At-Risk ────────────────────────────────────────────────────────
const AtRiskSkillRow = ({ skill, idx }: { skill: SkillRisk; idx: number }) => {
  const [expanded, setExpanded] = useState(idx === 0);

  // (see services/skillAdviceBuilder.ts — same pattern as buildObsoleteAdvice above)

  return (
    <div style={{
      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 12, padding: 16, marginBottom: 10,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.875rem', letterSpacing: '-0.01em' }}>
                {skill.skill}
              </span>
              <UrgencyClock horizon={skill.horizon} />
              <span style={{
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.06em',
              }}>AI-ASSISTED</span>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4, lineHeight: 1.5 }}>
              {skill.reason}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(245,158,11,0.15)' }}>
          <ImpactBar score={skill.riskScore} color="#f59e0b" label="Exposure Level" />
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: 'rgba(245,158,11,0.08)', borderRadius: 8,
            borderLeft: '3px solid #f59e0b',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <Lightbulb size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b' }}>HOW TO ADAPT</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              {buildAtRiskAdvice(skill)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Skill Row: Safe ───────────────────────────────────────────────────────────
const SafeSkillRow = ({ skill }: { skill: SafeSkill }) => {
  const [expanded, setExpanded] = useState(false);
  const ltv = skill.longTermValue ?? 85;

  const difficultyColor = (d: string) =>
    d === 'Extremely High' ? '#8b5cf6' :
    d === 'Very High' ? '#6366f1' :
    d === 'High' ? '#3b82f6' :
    d === 'Medium' ? '#10b981' : '#6b7280';

  return (
    <div style={{
      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 12, padding: 16, marginBottom: 10,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.875rem', letterSpacing: '-0.01em' }}>
                {skill.skill}
              </span>
              <span style={{
                background: `${difficultyColor(skill.difficulty)}20`,
                color: difficultyColor(skill.difficulty),
                border: `1px solid ${difficultyColor(skill.difficulty)}30`,
                borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
              }}>{skill.difficulty?.toUpperCase()} DIFFICULTY</span>
            </div>
            <p style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4, lineHeight: 1.5 }}>
              {skill.whySafe}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(16,185,129,0.15)' }}>
          <ImpactBar score={ltv} color="#10b981" label="Long-Term Strategic Value" />
          {skill.resource && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>📚 Build via: </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{skill.resource}</span>
            </div>
          )}
          <div style={{
            marginTop: 10, display: 'flex', gap: 6,
            padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 8,
            alignItems: 'flex-start',
          }}>
            <Shield size={13} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#10b981' }}>Why it holds:</strong>{' '}
              AI systems can approximate individual components of this skill in isolation, but cannot replicate the judgment, accountability, and contextual synthesis
              required when it matters most — under high-stakes, novel conditions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({
  icon, title, subtitle, count, color, bg,
}: {
  icon: React.ReactNode; title: string; subtitle: string; count: number; color: string; bg: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color, letterSpacing: '-0.02em', margin: 0 }}>
          {title}
        </h4>
        <span style={{
          background: `${color}20`, color, borderRadius: 99, padding: '1px 8px',
          fontSize: '0.7rem', fontWeight: 800,
        }}>{count}</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const AIRiskSkillMatrix = ({ intel, scoreColor }: Props) => {
  const obsolete = intel.skills.obsolete ?? [];
  const atRisk = intel.skills.at_risk ?? [];
  const safe = intel.skills.safe ?? [];
  const total = obsolete.length + atRisk.length + safe.length;

  const obsoletePct = Math.round((obsolete.length / Math.max(total, 1)) * 100);
  const atRiskPct = Math.round((atRisk.length / Math.max(total, 1)) * 100);
  const safePct = Math.round((safe.length / Math.max(total, 1)) * 100);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0, opacity: 0.85 }}><LearningIllustration size={52} /></div>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem',
              letterSpacing: '-0.03em', color: 'var(--text)', margin: 0,
            }}>AI Risk Skill Matrix</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>
              Skill-by-skill disruption analysis with impact intensity & time-to-disruption
            </p>
          </div>
        </div>
        {/* Pie-style summary */}
        <div style={{ display: 'flex', gap: 8 }}>
          {obsolete.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>{obsoletePct}%</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Obsolete</div>
            </div>
          )}
          {atRisk.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{atRiskPct}%</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>At-Risk</div>
            </div>
          )}
          {safe.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{safePct}%</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Safe</div>
            </div>
          )}
        </div>
      </div>

      {/* Visual disruption bar */}
      <div style={{
        height: 8, borderRadius: 99, overflow: 'hidden',
        display: 'flex', marginBottom: 24, gap: 2,
      }}>
        {obsoletePct > 0 && <div style={{ flex: obsoletePct, background: '#ef4444', boxShadow: '0 0 8px #ef444460' }} />}
        {atRiskPct > 0 && <div style={{ flex: atRiskPct, background: '#f59e0b', boxShadow: '0 0 8px #f59e0b60' }} />}
        {safePct > 0 && <div style={{ flex: safePct, background: '#10b981', boxShadow: '0 0 8px #10b98160' }} />}
      </div>

      {/* ❌ Obsolete Skills */}
      {obsolete.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader
            icon={<XCircle size={18} color="#ef4444" />}
            title="Obsolete Skills"
            subtitle="AI replaces these entirely — stop investing, start pivoting"
            count={obsolete.length}
            color="#ef4444"
            bg="rgba(239,68,68,0.12)"
          />
          {obsolete.map((s, i) => <ObsoleteSkillRow key={s.skill} skill={s} idx={i} />)}
        </div>
      )}

      {/* ⚠️ At-Risk Skills */}
      {atRisk.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader
            icon={<AlertTriangle size={18} color="#f59e0b" />}
            title="At-Risk Skills"
            subtitle="Partial automation — the execution layer is being absorbed, judgment remains"
            count={atRisk.length}
            color="#f59e0b"
            bg="rgba(245,158,11,0.12)"
          />
          {atRisk.map((s, i) => <AtRiskSkillRow key={s.skill} skill={s} idx={i} />)}
        </div>
      )}

      {/* ✅ Safe Skills */}
      {safe.length > 0 && (
        <div style={{ marginBottom: 0 }}>
          <SectionHeader
            icon={<Shield size={18} color="#10b981" />}
            title="Human-Durable Skills"
            subtitle="AI cannot replicate — compound these for long-term resilience"
            count={safe.length}
            color="#10b981"
            bg="rgba(16,185,129,0.12)"
          />
          {safe.map(s => <SafeSkillRow key={s.skill} skill={s} />)}
        </div>
      )}

      {/* No data fallback */}
      {obsolete.length === 0 && atRisk.length === 0 && safe.length === 0 && (
        <div style={{
          padding: 24, borderRadius: 12, background: 'var(--alpha-bg-04)',
          textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem',
        }}>
          Skill matrix data not yet available for this role.
        </div>
      )}
    </div>
  );
};

export default AIRiskSkillMatrix;
