/**
 * Precision9090Panel.tsx — v50.0
 *
 * Renders Precision9090PlanResult — the AI-prioritised 13-week execution plan
 * with phase checkpoints, quick wins, and daily focus priorities.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Zap, Target, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, Clock, TrendingUp, BarChart3, Flag, ArrowRight,
} from 'lucide-react';
import type {
  Precision9090PlanResult,
  PrecisionAction,
  WeekMilestone,
  PhaseCheckpoint,
} from '@/services/precision9090PlanEngine';

interface Precision9090PanelProps {
  plan: Precision9090PlanResult;
  className?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  phase_1_foundation: 'Phase 1: Foundation',
  phase_2_engagement: 'Phase 2: Engagement',
  phase_3_offers: 'Phase 3: Offers',
};

const PHASE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  phase_1_foundation: { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)' },
  phase_2_engagement: { text: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)' },
  phase_3_offers:     { text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  crisis:     { label: 'CRISIS',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  elevated:   { label: 'ELEVATED',   color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  standard:   { label: 'STANDARD',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  monitoring: { label: 'MONITORING', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  profile_readiness:    <CheckCircle2 className="w-3 h-3" />,
  skill_building:       <TrendingUp className="w-3 h-3" />,
  network_activation:   <Target className="w-3 h-3" />,
  direct_outreach:      <ArrowRight className="w-3 h-3" />,
  application_execution:<Flag className="w-3 h-3" />,
  interview_preparation:<BarChart3 className="w-3 h-3" />,
  offer_management:     <CheckCircle2 className="w-3 h-3" />,
  financial_protection: <AlertTriangle className="w-3 h-3" />,
  visa_management:      <AlertTriangle className="w-3 h-3" />,
  emergency_protocol:   <AlertTriangle className="w-3 h-3" />,
  risk_monitoring:      <BarChart3 className="w-3 h-3" />,
  narrative_crafting:   <Zap className="w-3 h-3" />,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function priorityColor(score: number) {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#f59e0b';
  return '#94a3b8';
}

function effortLabel(e: number) {
  return ['', 'Quick', 'Light', 'Moderate', 'Heavy', 'Major'][e] ?? '';
}

// ── Action Card ────────────────────────────────────────────────────────────────

function ActionCard({ action, index }: { action: PrecisionAction; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const pc = priorityColor(action.aiPriorityScore);
  const phaseColor = PHASE_COLORS[action.phase] ?? PHASE_COLORS.phase_1_foundation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--alpha-bg-06)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-3.5 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Priority score badge */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center"
          style={{ background: `${pc}15` }}>
          <span className="text-[11px] font-bold leading-none" style={{ color: pc }}>{action.aiPriorityScore}</span>
          <span className="text-[10px] text-white/30 leading-none mt-0.5">AI</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-white/85 leading-snug">{action.action}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" />
                   : <ChevronDown className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" />}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: phaseColor.text, background: phaseColor.bg }}>
              {PHASE_LABELS[action.phase]}
            </span>
            <span className="text-[10px] text-white/35">Wk {action.weekNumber}</span>
            <span className="text-[10px] text-white/35">{action.timeEstimate}</span>
            <span className="text-[10px] text-white/35">{effortLabel(action.effort)} effort</span>
            {action.isBlocking && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ color: '#ef4444', background: 'rgba(239,68,68,0.10)' }}>BLOCKING</span>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 pt-0.5">
              {/* Sub-steps */}
              {action.subSteps.length > 0 && (
                <ol className="space-y-1.5">
                  {action.subSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-white/30 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                      <span className="text-xs text-white/65 leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {/* Expected outcome + evidence */}
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.06)' }}>
                  <div className="text-[10px] text-green-400/60 uppercase tracking-wide mb-0.5">Expected outcome</div>
                  <p className="text-xs text-white/65 leading-snug">{action.expectedOutcome}</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--alpha-bg-04)' }}>
                  <div className="text-[10px] text-white/30 uppercase tracking-wide mb-0.5">Evidence</div>
                  <p className="text-xs text-white/45 leading-snug">{action.evidence}</p>
                </div>
              </div>

              {/* Personalisation tag */}
              {action.personalisationTag && (
                <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.10)' }}>
                  <span>Personalised:</span>
                  <span className="font-medium">{action.personalisationTag.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Week Card ──────────────────────────────────────────────────────────────────

function WeekCard({ week }: { week: WeekMilestone }) {
  const [open, setOpen] = useState(false);
  const phaseColor = PHASE_COLORS[week.phase] ?? PHASE_COLORS.phase_1_foundation;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${phaseColor.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-3.5 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: phaseColor.bg }}>
          <span className="text-sm font-bold" style={{ color: phaseColor.text }}>{week.weekNumber}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-white/85">{week.weekLabel}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                   : <ChevronDown className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />}
          </div>
          <p className="text-xs text-white/50 leading-snug mt-0.5">{week.coreObjective}</p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3">
              {/* Daily focus priorities */}
              {week.dailyFocusPriorities.length > 0 && (
                <div>
                  <div className="text-[10px] text-white/35 uppercase tracking-wide mb-1.5">Daily focus</div>
                  <div className="space-y-1.5">
                    {week.dailyFocusPriorities.map((p, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg"
                        style={{ background: 'var(--alpha-bg-04)' }}>
                        <span className="text-[10px] font-bold text-white/30 w-4 flex-shrink-0 mt-0.5">#{p.rank}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 leading-snug">{p.task}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/35">{p.timeBlock}</span>
                            <span className="text-[10px] text-green-400/50">✓ {p.successSignal}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End-of-week check */}
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                <div className="text-[10px] text-green-400/60 uppercase tracking-wide mb-0.5">End-of-week check</div>
                <p className="text-xs text-white/65 leading-snug">{week.endOfWeekCheck}</p>
              </div>

              {/* If behind */}
              <div className="p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)' }}>
                <div className="text-[10px] text-amber-400/60 uppercase tracking-wide mb-0.5">If behind</div>
                <p className="text-xs text-white/55 leading-snug">{week.ifBehind}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Checkpoint Card ────────────────────────────────────────────────────────────

function CheckpointCard({ checkpoint }: { checkpoint: PhaseCheckpoint }) {
  const [open, setOpen] = useState(false);
  const phaseColor = PHASE_COLORS[checkpoint.phase] ?? PHASE_COLORS.phase_1_foundation;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${phaseColor.border}`, background: phaseColor.bg }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex-shrink-0">
          <div className="text-xl font-black" style={{ color: phaseColor.text }}>D{checkpoint.checkpointDay}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white/85">{checkpoint.title}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                   : <ChevronDown className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />}
          </div>
          <p className="text-xs text-white/50 mt-0.5 leading-snug">{checkpoint.summary}</p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Target metrics */}
              <div>
                <div className="text-[10px] text-white/35 uppercase tracking-wide mb-2">Target metrics</div>
                <div className="space-y-2">
                  {checkpoint.targetMetrics.map((m, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-lg"
                      style={{ background: 'var(--alpha-bg-04)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/70">{m.metricName}</div>
                        <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{m.measureHow}</div>
                      </div>
                      <span className="text-xs font-bold text-white/60 whitespace-nowrap">{m.targetValue}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outcome grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <div className="text-[10px] text-green-400/60 uppercase tracking-wide mb-1">If passed</div>
                  <p className="text-[11px] text-white/65 leading-snug">{checkpoint.ifPassed}</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <div className="text-[10px] text-amber-400/60 uppercase tracking-wide mb-1">Near miss</div>
                  <p className="text-[11px] text-white/65 leading-snug">{checkpoint.ifNearMiss}</p>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)' }}>
                  <div className="text-[10px] text-red-400/60 uppercase tracking-wide mb-1">If failed</div>
                  <p className="text-[11px] text-white/65 leading-snug">{checkpoint.ifFailed}</p>
                </div>
              </div>

              {/* Emergency fallbacks */}
              {checkpoint.emergencyFallbackActions.length > 0 && (
                <div>
                  <div className="text-[10px] text-red-400/60 uppercase tracking-wide mb-1.5">Emergency fallback actions</div>
                  <div className="space-y-1.5">
                    {checkpoint.emergencyFallbackActions.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                        style={{ background: 'rgba(239,68,68,0.06)' }}>
                        <AlertTriangle className="w-3 h-3 mt-0.5 text-red-400/60 flex-shrink-0" />
                        <span className="text-xs text-white/60 leading-snug">{a.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type ActiveTab = 'quick_wins' | 'top_actions' | 'weeks' | 'checkpoints'

const Precision9090Panel: React.FC<Precision9090PanelProps> = ({ plan, className = '' }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quick_wins');
  const [showAllTopActions, setShowAllTopActions] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<string | null>('phase_1_foundation');

  const urgency = URGENCY_CONFIG[plan.urgencyMode] ?? URGENCY_CONFIG.standard;
  const displayedActions = showAllTopActions ? plan.topPriorityActions : plan.topPriorityActions.slice(0, 6);

  // Group weeks by phase
  const weeksByPhase: Record<string, WeekMilestone[]> = {};
  for (const w of plan.weeks) {
    if (!weeksByPhase[w.phase]) weeksByPhase[w.phase] = [];
    weeksByPhase[w.phase].push(w);
  }

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'quick_wins',  label: `Quick Wins (${plan.quickWins.length})` },
    { key: 'top_actions', label: `Top Actions (${plan.topPriorityActions.length})` },
    { key: 'weeks',       label: '13 Weeks' },
    { key: 'checkpoints', label: 'Gates (D30/60/90)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(96,165,250,0.15)' }}>
            <Calendar className="w-4 h-4" style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/90">{plan.planTitle}</div>
            <div className="text-xs text-white/40 mt-0.5">{plan.weeklyTimeCommitment}</div>
          </div>
        </div>
        <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ color: urgency.color, background: urgency.bg }}>
          {urgency.label}
        </span>
      </div>

      {/* Executive summary */}
      <div className="mx-4 mb-3 p-3.5 rounded-xl" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.12)' }}>
        <p className="text-sm text-white/80 leading-relaxed">{plan.executiveSummary}</p>
      </div>

      {/* Personalisation tags */}
      {plan.planPersonalisationTags.length > 0 && (
        <div className="mx-4 mb-3 flex flex-wrap gap-1.5">
          {plan.planPersonalisationTags.map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.10)' }}>
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Estimated outcome */}
      <div className="mx-4 mb-4 p-3 rounded-xl flex items-center justify-between gap-3"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: '#10b981' }} />
          <span className="text-xs text-white/50">Day 90 outlook</span>
        </div>
        <span className="text-xs font-semibold text-green-400/90 text-right">{plan.estimatedOutcomeByDay90}</span>
      </div>

      {/* Critical path */}
      <div className="mx-4 mb-4 space-y-1.5">
        <div className="text-[10px] text-white/40 uppercase tracking-wide">Critical path — do NOT skip</div>
        <div className="space-y-1">
          {plan.criticalPath.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-400/60 mt-0.5 flex-shrink-0">▸</span>
              <span className="text-xs text-white/65 leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mx-4 mb-3 flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--alpha-bg-04)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
            style={activeTab === tab.key
              ? { background: 'rgba(96,165,250,0.20)', color: '#60a5fa' }
              : { color: 'var(--alpha-text-45)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mx-4 mb-4">
        <AnimatePresence mode="wait">
          {activeTab === 'quick_wins' && (
            <motion.div key="quick_wins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-2">
                {plan.quickWins.length === 0 ? (
                  <p className="text-xs text-white/35 text-center py-4">No quick wins identified for this plan</p>
                ) : (
                  plan.quickWins.map((action, i) => (
                    <div key={action.id} className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                      <div className="flex items-start gap-2.5">
                        <Zap className="w-3.5 h-3.5 mt-0.5 text-green-400/70 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-white/80 leading-snug font-medium">{action.action}</span>
                            <span className="text-xs font-bold whitespace-nowrap" style={{ color: priorityColor(action.aiPriorityScore) }}>
                              {action.aiPriorityScore} AI score
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/35">{action.timeEstimate}</span>
                            <span className="text-[10px] text-green-400/50">Wk {action.weekNumber}</span>
                          </div>
                          {action.subSteps[0] && (
                            <p className="text-xs text-white/45 leading-snug mt-1.5">{action.subSteps[0]}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'top_actions' && (
            <motion.div key="top_actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-2">
                {displayedActions.map((action, i) => (
                  <ActionCard key={action.id} action={action} index={i} />
                ))}
                {plan.topPriorityActions.length > 6 && (
                  <button
                    onClick={() => setShowAllTopActions(!showAllTopActions)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mt-2"
                  >
                    {showAllTopActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showAllTopActions ? 'Show fewer' : `Show ${plan.topPriorityActions.length - 6} more actions`}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'weeks' && (
            <motion.div key="weeks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-4">
                {(['phase_1_foundation', 'phase_2_engagement', 'phase_3_offers'] as const).map(phase => {
                  const weeks = weeksByPhase[phase] ?? [];
                  if (weeks.length === 0) return null;
                  const pc = PHASE_COLORS[phase];
                  const isExpanded = expandedPhase === phase;
                  return (
                    <div key={phase}>
                      <button
                        onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                        className="w-full flex items-center justify-between mb-2 px-1"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: pc.text }}>
                          {PHASE_LABELS[phase]} · Weeks {weeks[0].weekNumber}–{weeks[weeks.length - 1].weekNumber}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: pc.text }} />
                                    : <ChevronDown className="w-3.5 h-3.5" style={{ color: pc.text }} />}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2">
                              {weeks.map(w => <WeekCard key={w.weekNumber} week={w} />)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'checkpoints' && (
            <motion.div key="checkpoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-3">
                {plan.checkpoints.map(cp => (
                  <CheckpointCard key={cp.checkpointDay} checkpoint={cp} />
                ))}
              </div>
              {plan.planExpiry && (
                <div className="mt-3 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/25" />
                  <span className="text-[10px] text-white/30">{plan.planExpiry}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Precision9090Panel;
