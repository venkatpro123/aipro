// CareerCopilot.tsx — Phase 17 Contextual Career Guidance Panel
//
// Floating "Ask HumanProof" button that opens a smart guidance panel.
// Uses pre-computed pipeline data (no API calls) to answer contextual
// questions about the user's career risk situation.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ChevronRight, Sparkles, Shield, TrendingDown, Zap, BookOpen, Building2, Clock } from 'lucide-react';
import { riskColor, riskLabel } from '../lib/riskTokens';

interface CopilotContext {
  score: number;
  workTypeKey?: string;
  roleTitle?: string;
  industryKey?: string;
  tenureYears?: number;
  companyName?: string;
  topDriverLabel?: string;
  topAction?: string;
  skillGapCount?: number;
  escapePaths?: number;
}

interface QuickInsight {
  id: string;
  icon: React.ElementType;
  question: string;
  answer: string;
  accent: string;
}

function generateInsights(ctx: CopilotContext): QuickInsight[] {
  const insights: QuickInsight[] = [];
  const role = ctx.roleTitle ?? ctx.workTypeKey?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'your role';
  const tier = riskLabel(ctx.score);

  insights.push({
    id: 'situation',
    icon: Sparkles,
    question: 'What does my score actually mean?',
    answer: ctx.score >= 65
      ? `Your score of ${ctx.score} places you in the ${tier} tier. For ${role}, this means structural forces — AI automation, market compression, or company instability — are actively threatening your position. The next 30-90 days are your highest-leverage window.`
      : ctx.score >= 35
      ? `Your score of ${ctx.score} is ${tier}. You have time to act, but signals are building. For ${role}, this typically means some parts of your work are being absorbed by AI tools, or your company shows early stress indicators.`
      : `Your score of ${ctx.score} is ${tier}. Your position is relatively secure right now. Use this stability to build career capital — skills, network, and reputation — that compounds over time.`,
    accent: riskColor(ctx.score),
  });

  if (ctx.topDriverLabel) {
    insights.push({
      id: 'driver',
      icon: TrendingDown,
      question: 'What is driving my risk the most?',
      answer: `Your biggest risk driver is "${ctx.topDriverLabel}". This single factor contributes the most to your score. Addressing it directly — through the actions in your plan — will have the largest impact on reducing your overall risk.`,
      accent: 'var(--color-orange-text)',
    });
  }

  if (ctx.topAction) {
    insights.push({
      id: 'action',
      icon: Zap,
      question: 'What should I do this week?',
      answer: `Your highest-priority action is: "${ctx.topAction}". This was selected because it targets your biggest vulnerability with the shortest time-to-impact. Complete it before moving to lower-priority items.`,
      accent: 'var(--color-emerald-text)',
    });
  }

  insights.push({
    id: 'protection',
    icon: Shield,
    question: 'How do I protect myself long-term?',
    answer: ctx.score >= 50
      ? `Three moves that compound: (1) Build visible proof of skills AI cannot replicate — judgment, strategy, relationships. (2) Activate your professional network now, before you need it. (3) Identify 2-3 adjacent roles with lower AI exposure as escape paths.`
      : `You're in a strong position. Compound it: (1) Deepen skills that are human-durable — empathy, cross-functional leadership, novel problem-solving. (2) Build external reputation (writing, speaking, open-source). (3) Grow your network while you have leverage.`,
    accent: '#06B6D4',
  });

  if (ctx.skillGapCount != null && ctx.skillGapCount > 0) {
    insights.push({
      id: 'skills',
      icon: BookOpen,
      question: `How many skill gaps do I have?`,
      answer: `Your audit identified ${ctx.skillGapCount} skill gap${ctx.skillGapCount > 1 ? 's' : ''} where market demand is outpacing your current proficiency. These are ranked by urgency in your Protection tab. Focus on the top-priority gap first — closing one high-urgency gap typically reduces your score by 8-15 points.`,
      accent: '#8B5CF6',
    });
  }

  if (ctx.companyName) {
    insights.push({
      id: 'company',
      icon: Building2,
      question: `Is ${ctx.companyName} a safe employer?`,
      answer: ctx.score >= 55
        ? `${ctx.companyName} shows elevated risk signals. This could be financial stress, layoff history, or sector headwinds. Check the Company tab for specific indicators. Regardless of company health, having a personal escape plan is the strongest insurance.`
        : `${ctx.companyName} appears relatively stable based on available signals. However, company health is just one of five risk dimensions. Even at stable companies, role-level AI disruption can create individual risk. Stay audit-aware.`,
      accent: '#3B82F6',
    });
  }

  if (ctx.escapePaths != null && ctx.escapePaths > 0) {
    insights.push({
      id: 'escape',
      icon: Clock,
      question: 'What are my escape paths?',
      answer: `Your audit found ${ctx.escapePaths} viable escape path${ctx.escapePaths > 1 ? 's' : ''} — adjacent roles you could transition to with targeted upskilling. The best path is shown in your Protection tab's Career Evolution Timeline. Each path includes the specific skills to bridge and estimated time to qualify.`,
      accent: 'var(--color-emerald-text)',
    });
  }

  return insights;
}

export const CareerCopilotButton: React.FC<{ context: CopilotContext }> = ({ context }) => {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const insights = useMemo(() => generateInsights(context), [context]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #0096aa, #00d4e0)',
          border: '2px solid rgba(0,212,224,0.40)',
          boxShadow: '0 4px 20px rgba(0,212,224,0.30)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open Career Copilot"
      >
        <MessageCircle size={20} color="#fff" strokeWidth={2} />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.50)' }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg-card, #1a1c24)',
                border: '1px solid var(--alpha-bg-08)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.50)',
                maxHeight: 'calc(100vh - 120px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} style={{ color: 'var(--color-cyan-text)' }} />
                  <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                    Career Copilot
                  </span>
                  <span className="text-[9px] font-black tracking-[0.12em] uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,224,0.12)', color: 'var(--color-cyan-text)' }}>
                    BETA
                  </span>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70 transition-opacity">
                  <X size={16} style={{ color: 'var(--alpha-text-50)' }} />
                </button>
              </div>

              {/* Context summary */}
              <div className="px-4 py-2.5" style={{ background: 'var(--alpha-bg-04)' }}>
                <p className="text-[10px] font-bold" style={{ color: 'var(--alpha-text-35)' }}>
                  {context.companyName ? `${context.companyName} · ` : ''}{riskLabel(context.score)} Risk · Score {context.score}
                </p>
              </div>

              {/* Quick insights */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
                <div className="p-3 space-y-2">
                  <p className="text-[9px] font-black tracking-[0.14em] uppercase px-1 mb-2" style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}>
                    QUICK INSIGHTS
                  </p>
                  {insights.map((insight) => {
                    const Icon = insight.icon;
                    const isExpanded = expandedId === insight.id;
                    return (
                      <motion.button
                        key={insight.id}
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                        className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                        style={{
                          background: isExpanded ? `${insight.accent}08` : 'var(--alpha-bg-04)',
                          border: `1px solid ${isExpanded ? `${insight.accent}25` : 'var(--alpha-bg-06)'}`,
                        }}
                        layout
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${insight.accent}15` }}
                          >
                            <Icon size={14} style={{ color: insight.accent }} />
                          </div>
                          <p className="text-[11px] font-semibold flex-1" style={{ color: 'var(--alpha-text-85)' }}>
                            {insight.question}
                          </p>
                          <ChevronRight
                            size={14}
                            style={{
                              color: 'var(--alpha-text-30)',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="text-[11px] leading-relaxed mt-2.5 pt-2.5" style={{ color: 'var(--alpha-text-70)', borderTop: '1px solid var(--alpha-bg-06)' }}>
                                {insight.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
                <p className="text-[9px]" style={{ color: 'var(--alpha-text-25)' }}>
                  Answers derived from your audit data. No external API calls.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CareerCopilotButton;
