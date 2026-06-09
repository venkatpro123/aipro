// AIReplacementAnalysis — AI amplification framing (Rule 14, 17)
// "X tasks automating — Y tasks AI-amplifiable" NOT "AI will replace you"
// DataSourceLabel on every intelligence data point.
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { SkillSignal } from '../../../services/skillPortfolioFitEngine';
import { DataSourceLabel } from '../../shared/DataSourceLabel';

interface Props {
  scoreResult: HybridResult;
}

// Classify skills into amplifiable vs. automating vs. irreplaceable
// based on automatabilityRisk and demandScore
interface SkillClassification {
  automating: SkillSignal[];      // high auto risk, task being replaced
  amplifiable: SkillSignal[];     // moderate auto risk, AI + human = stronger
  irreplaceable: SkillSignal[];   // low auto risk, durable human skill
}

function classifySkills(allSkills: SkillSignal[]): SkillClassification {
  return {
    automating:    allSkills.filter(s => s.automatabilityRisk > 0.6),
    amplifiable:   allSkills.filter(s => s.automatabilityRisk >= 0.25 && s.automatabilityRisk <= 0.6 && s.demandScore >= 40),
    irreplaceable: allSkills.filter(s => s.automatabilityRisk < 0.25),
  };
}

// Generic task categories derived from role D1 score when no skill data available
function genericTaskBreakdown(d1Score: number): Array<{ label: string; type: 'automating' | 'amplifiable' | 'irreplaceable'; detail: string }> {
  const automatingCount = Math.round(d1Score / 12);
  const amplifiableCount = Math.round((100 - d1Score) * 0.4 / 12);
  const irreplaceableCount = Math.round((100 - d1Score) * 0.6 / 12);

  const automating = [
    { label: 'Data entry & processing', detail: 'Automated by LLMs + RPA' },
    { label: 'Standard report generation', detail: 'AI can produce faster than humans' },
    { label: 'Pattern recognition in data', detail: 'ML exceeds human accuracy' },
    { label: 'Routine customer inquiry routing', detail: 'Chatbot + decision tree' },
  ].slice(0, Math.max(1, automatingCount));

  const amplifiable = [
    { label: 'Complex problem solving', detail: 'AI as thinking partner' },
    { label: 'Research & synthesis', detail: 'AI surfaces inputs, human interprets' },
    { label: 'Code & technical review', detail: 'AI copilot + human judgment' },
    { label: 'Customer relationship management', detail: 'AI tracks signals, human builds trust' },
  ].slice(0, Math.max(2, amplifiableCount));

  const irreplaceable = [
    { label: 'Stakeholder negotiation', detail: 'Human trust and relationship capital' },
    { label: 'Creative strategy & vision', detail: 'Judgment in ambiguous contexts' },
    { label: 'Team leadership & coaching', detail: 'Motivation and cultural fit' },
    { label: 'Cross-functional alignment', detail: 'Political and social intelligence' },
  ].slice(0, Math.max(2, irreplaceableCount));

  return [
    ...automating.map(t => ({ ...t, type: 'automating' as const })),
    ...amplifiable.map(t => ({ ...t, type: 'amplifiable' as const })),
    ...irreplaceable.map(t => ({ ...t, type: 'irreplaceable' as const })),
  ];
}

const TYPE_CONFIG = {
  automating:    { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  label: 'AUTOMATING',    icon: Zap    },
  amplifiable:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'AI-AMPLIFIABLE', icon: TrendingUp },
  irreplaceable: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'IRREPLACEABLE', icon: Shield  },
};

export function AIReplacementAnalysis({ scoreResult }: Props) {
  const d1Dim = scoreResult.dimensions?.find(d => d.key === 'D1');
  const d1Score = d1Dim?.score ?? null;
  const tech = scoreResult.techStackObsolescence;
  const skillFit = scoreResult.skillPortfolioFit;

  const allUserSkills: SkillSignal[] = [
    ...(skillFit?.surgingSkills ?? []),
    ...(skillFit?.stableSkills ?? []),
    ...(skillFit?.decliningSkills ?? []),
  ];

  const hasRealSkillData = allUserSkills.length > 0;
  const classified = hasRealSkillData ? classifySkills(allUserSkills) : null;
  const genericTasks = !hasRealSkillData && d1Score !== null ? genericTaskBreakdown(d1Score) : [];

  const automatingCount = classified ? classified.automating.length : genericTasks.filter(t => t.type === 'automating').length;
  const amplifiableCount = classified ? classified.amplifiable.length : genericTasks.filter(t => t.type === 'amplifiable').length;
  const irreplaceableCount = classified ? classified.irreplaceable.length : genericTasks.filter(t => t.type === 'irreplaceable').length;
  const totalTasks = automatingCount + amplifiableCount + irreplaceableCount;

  // Amplification readiness derived from inverse of D1 + surging skills
  const ampReadiness = d1Score !== null
    ? Math.round(100 - d1Score * 0.6 + (skillFit?.surgingSkills?.length ?? 0) * 3)
    : null;
  const ampColor = ampReadiness !== null
    ? (ampReadiness >= 65 ? '#10b981' : ampReadiness >= 40 ? '#f59e0b' : '#ef4444')
    : 'rgba(255,255,255,0.4)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Amplification summary hero — NOT replacement framing */}
      {d1Score !== null && (
        <div style={{
          padding: '18px 20px', borderRadius: 14,
          background: `${ampColor}08`, border: `1px solid ${ampColor}25`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
              AI LANDSCAPE FOR YOUR ROLE
            </div>
            <DataSourceLabel tier="MODELED" sourceName="Role AI displacement model" date={scoreResult.calculatedAt} compact />
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontWeight: 800, fontSize: '2rem', color: '#ef4444', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                {automatingCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>automating</div>
            </div>
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontWeight: 800, fontSize: '2rem', color: '#f59e0b', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                {amplifiableCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>AI-amplifiable</div>
            </div>
            <div style={{ textAlign: 'center' as const }}>
              <div style={{ fontWeight: 800, fontSize: '2rem', color: '#10b981', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                {irreplaceableCount}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>irreplaceable</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            {automatingCount > amplifiableCount + irreplaceableCount
              ? `${automatingCount} of your tasks are automating — the opportunity is moving into the ${amplifiableCount + irreplaceableCount} AI-amplifiable and irreplaceable areas.`
              : amplifiableCount >= irreplaceableCount
              ? `${amplifiableCount} of your tasks are AI-amplifiable — learn the tools that augment these and you become significantly more productive.`
              : `${irreplaceableCount} tasks in your role are highly resistant to AI — focus on deepening these while adding AI tools for the rest.`}
          </div>
        </div>
      )}

      {/* Task breakdown — real skill data or generic */}
      <div className="card-premium" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
            {hasRealSkillData ? 'Your Skills by AI Impact' : 'Task Breakdown by AI Impact'}
          </div>
          <DataSourceLabel
            tier={hasRealSkillData ? 'MODELED' : 'ESTIMATED'}
            sourceName={hasRealSkillData ? 'Skill database + job analysis' : 'Role-level model'}
            compact
          />
        </div>

        {/* Grouped by classification */}
        {(['automating', 'amplifiable', 'irreplaceable'] as const).map(type => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const items = classified
            ? classified[type].slice(0, 4)
            : genericTasks.filter(t => t.type === type);

          if (items.length === 0) return null;

          return (
            <div key={type} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <Icon size={11} color={cfg.color} />
                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: cfg.color, letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {items.map((item, i) => {
                  const isSkill = 'demandScore' in item;
                  const label = isSkill ? (item as SkillSignal).skill : (item as { label: string }).label;
                  const detail = isSkill
                    ? (item as SkillSignal).marketInsight
                    : (item as { detail: string }).detail;
                  const barVal = isSkill ? Math.round((item as SkillSignal).automatabilityRisk * 100) : null;

                  return (
                    <div key={i} style={{
                      padding: '7px 10px', borderRadius: 7,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: barVal != null ? 4 : 0 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                        {barVal != null && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono, monospace)' }}>
                            {barVal}% AI risk
                          </span>
                        )}
                      </div>
                      {barVal != null && (
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', marginBottom: 4 }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barVal}%` }}
                            transition={{ duration: 0.5, delay: i * 0.04 }}
                            style={{ height: '100%', background: cfg.color, borderRadius: 2 }}
                          />
                        </div>
                      )}
                      <div style={{ fontSize: '0.69rem', color: 'rgba(255,255,255,0.38)' }}>{detail}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tech stack signal */}
      {tech && (
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Tech Stack Status</div>
            <DataSourceLabel tier="MODELED" sourceName="Stack demand analysis" compact />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              padding: '3px 9px', borderRadius: 6,
              background: tech.primaryStackStatus === 'OBSOLETE' ? 'rgba(239,68,68,0.15)'
                : tech.primaryStackStatus === 'LEGACY' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
              color: tech.primaryStackStatus === 'OBSOLETE' ? '#ef4444'
                : tech.primaryStackStatus === 'LEGACY' ? '#f59e0b' : '#10b981',
              fontWeight: 700, fontSize: '0.72rem', fontFamily: 'var(--font-mono, monospace)',
            }}>
              {tech.primaryStackStatus}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>{tech.stackHealthLabel}</span>
          </div>
          {tech.bridgeSkillPriority.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 6, letterSpacing: '0.08em' }}>
                BRIDGE TO MODERN STACK
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tech.bridgeSkillPriority.slice(0, 5).map((s, i) => (
                  <span key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 5,
                    background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.18)',
                    fontSize: '0.73rem', color: 'var(--cyan)',
                  }}>
                    <ArrowRight size={9} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bridge skill priorities from skill portfolio */}
      {skillFit?.retoolPriority && skillFit.retoolPriority.length > 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'var(--font-mono, monospace)' }}>
            YOUR AI AMPLIFICATION NEXT STEPS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {skillFit.retoolPriority.slice(0, 4).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.25)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--cyan)',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
