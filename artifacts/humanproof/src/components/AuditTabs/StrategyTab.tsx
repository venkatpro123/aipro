// StrategyTab.tsx
// Your full plan: what to do, in what order, plus job offer help.
// Layout: plan banner → things to watch → action phases → readiness → offer eval modal

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Zap, Shield, Clock, ArrowRight, CheckCircle2,
  Circle, AlertTriangle, TrendingUp, Brain, DollarSign,
  ChevronDown, ChevronUp, ChevronRight, Building2, Globe, Briefcase, Star,
  Search,
} from "lucide-react";
import type { HybridResult } from "@/types/hybridResult";
import type { CompanyData } from "@/data/companyDatabase";
import type { StrategyAction, StrategicPlan } from "@/services/strategySynthesisEngine";
import type { OfferEvaluationInputs } from "@/services/offerEvaluationEngine";
import { evaluateJobOffer } from "@/services/offerEvaluationEngine";
import { loadFinancialContext } from "@/services/financialContextService";
import { CURRENCY_META } from "@/services/currencyService";

interface StrategyTabProps {
  result: HybridResult;
  companyData: CompanyData;
}

// ── Strategy color system ─────────────────────────────────────────────────────
const STRATEGY_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  EMERGENCY_EXIT:      { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)',   text: '#ef4444',  accent: '#ef4444' },
  ACCELERATE_EXIT:     { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.35)',  text: '#f97316',  accent: '#f97316' },
  PROTECT_AND_WAIT:    { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)',  text: '#f59e0b',  accent: '#f59e0b' },
  STRENGTHEN_POSITION: { bg: 'rgba(0,212,224,0.08)',   border: 'rgba(0,212,224,0.35)',   text: '#00d4e0',  accent: '#00d4e0' },
  OPPORTUNISTIC_MOVE:  { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.35)',  text: '#10b981',  accent: '#10b981' },
};

const STRATEGY_HUMAN_LABELS: Record<string, string> = {
  EMERGENCY_EXIT:      'Start job hunting now',
  ACCELERATE_EXIT:     'Start job hunting now',
  PROTECT_AND_WAIT:    'Stay and improve',
  STRENGTHEN_POSITION: 'Stay and improve',
  OPPORTUNISTIC_MOVE:  'Watch for a good opportunity',
};

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MODERATE: '#f59e0b',
  LOW:      '#10b981',
};

const URGENCY_HUMAN_LABELS: Record<string, string> = {
  CRITICAL: 'Act This Week',
  HIGH:     'High Priority',
  MODERATE: 'No Rush',
  LOW:      'You Have Time',
};

const OFFER_REC_HUMAN_LABELS: Record<string, string> = {
  STRONG_ACCEPT:    'Strong Accept',
  ACCEPT:           'Accept',
  NEGOTIATE:        'Negotiate',
  NEGOTIATE_HARD:   'Negotiate Hard',
  DECLINE:          'Decline',
  INVESTIGATE_MORE: 'Investigate Further',
  CANNOT_ACCEPT:    'Do Not Accept',
};

const toTitleCase = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const PHASE_ICONS = {
  PHASE_0_EMERGENCY:  AlertTriangle,
  PHASE_1_IMMEDIATE:  Zap,
  PHASE_2_SHORT_TERM: TrendingUp,
  PHASE_3_LONG_TERM:  Shield,
};

const PHASE_COLORS: Record<string, string> = {
  PHASE_0_EMERGENCY:  '#ef4444',
  PHASE_1_IMMEDIATE:  '#f97316',
  PHASE_2_SHORT_TERM: '#00d4e0',
  PHASE_3_LONG_TERM:  '#10b981',
};

// ── Action card ───────────────────────────────────────────────────────────────
const ActionCard: React.FC<{
  action: StrategyAction;
  index: number;
  phaseColor: string;
  completed: boolean;
  onToggle: () => void;
}> = ({ action, index, phaseColor, completed, onToggle }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06 }}
    className="flex gap-3 p-3 rounded-xl cursor-pointer group"
    style={{
      background: completed ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${completed ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
      transition: 'all 200ms ease',
    }}
    onClick={onToggle}
    whileHover={{ background: 'var(--alpha-bg-06)' }}
  >
    <button className="mt-0.5 flex-shrink-0" onClick={onToggle}>
      {completed
        ? <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />
        : <Circle className="w-4 h-4 opacity-30 group-hover:opacity-60 transition-opacity" />
      }
    </button>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug" style={{
          color: completed ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.9)',
          textDecoration: completed ? 'line-through' : 'none',
        }}>
          {action.title}
        </p>
        {action.isUrgent && !completed && (
          <span className="text-[10px] font-bold tracking-widest flex-shrink-0 px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            URGENT
          </span>
        )}
      </div>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
        {action.description}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] tracking-wider" style={{ color: phaseColor, opacity: 0.8 }}>
          {action.timeHorizon}
        </span>
      </div>
    </div>
  </motion.div>
);

// ── Phase card ─────────────────────────────────────────────────────────────────
const PhaseCard: React.FC<{
  plan: StrategicPlan;
  completedIds: Set<string>;
  onToggleAction: (id: string) => void;
}> = ({ plan, completedIds, onToggleAction }) => {
  const [expanded, setExpanded] = useState(plan.phase === 'PHASE_0_EMERGENCY' || plan.phase === 'PHASE_1_IMMEDIATE');
  const Icon = PHASE_ICONS[plan.phase];
  const color = PHASE_COLORS[plan.phase];
  const completedCount = plan.actions.filter(a => completedIds.has(a.id)).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      border: `1px solid ${color}25`,
      background: `${color}06`,
    }}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{
          background: `${color}18`,
          border: `1px solid ${color}35`,
        }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--alpha-text-92)' }}>
              {plan.phaseLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{
              background: `${color}18`, color, border: `1px solid ${color}30`,
            }}>
              {plan.timeframe}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--alpha-text-45)' }}>
            {plan.phaseObjective}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color }}>
            {completedCount}/{plan.actions.length}
          </span>
          {expanded
            ? <ChevronDown className="w-4 h-4 opacity-40" />
            : <ChevronRight className="w-4 h-4 opacity-40" />
          }
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {plan.actions.map((action, i) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  index={i}
                  phaseColor={color}
                  completed={completedIds.has(action.id)}
                  onToggle={() => onToggleAction(action.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Offer evaluation modal ────────────────────────────────────────────────────
const OfferModal: React.FC<{
  currentScore: number;
  currentSalary?: number;
  onClose: () => void;
}> = ({ currentScore, currentSalary = 0, onClose }) => {
  const [offerSalary, setOfferSalary] = useState('');
  const [offerCompany, setOfferCompany] = useState('');
  const [offerIndustry, setOfferIndustry] = useState('');
  const [offerSize, setOfferSize] = useState<OfferEvaluationInputs['offerCompanySize']>('mid');
  const [hasRecentLayoffs, setHasRecentLayoffs] = useState(false);
  const [offerResult, setOfferResult] = useState<ReturnType<typeof evaluateJobOffer> | null>(null);

  // Currency symbol from the user's saved context so the salary field shows the
  // right prefix (₹/$/€/…) instead of a bare number labelled "in your currency".
  const currSymbol = useMemo(() => {
    const code = loadFinancialContext()?.currency ?? 'USD';
    return CURRENCY_META[code]?.symbol ?? '$';
  }, []);

  const evaluate = () => {
    if (!offerSalary || !offerCompany) return;
    const result = evaluateJobOffer({
      currentScore,
      currentSalary: currentSalary || parseInt(offerSalary) * 0.85,
      currentTenureYears: 3,
      currentIndustry: '',
      offerCompanyName: offerCompany,
      offerCompanyIndustry: offerIndustry,
      offerCompanySize: offerSize,
      offerCompanyRecentLayoffs: hasRecentLayoffs,
      offerBaseSalary: parseInt(offerSalary) || 0,
    });
    setOfferResult(result);
  };

  const REC_COLORS: Record<string, string> = {
    STRONG_ACCEPT: '#10b981', ACCEPT: '#10b981', NEGOTIATE: '#f59e0b',
    NEGOTIATE_HARD: '#f97316', DECLINE: '#ef4444', INVESTIGATE_MORE: '#00d4e0',
  };

  // Render through a portal to document.body. The modal lives inside the
  // collapsible "Strategic plan & negotiation" AdaptiveBlock, whose content is
  // wrapped in an overflow-hidden + Framer-Motion (transformed) container.
  // A position:fixed child of a transformed ancestor is positioned relative to
  // that ancestor and clipped by its overflow:hidden — so the modal rendered
  // into the collapsed box and showed a blank screen. Portalling to body escapes
  // both the transform and the clip so it overlays the viewport correctly.
  const overlay = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: '#0f1117', border: '1px solid rgba(0,212,224,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: '#00d4e0' }}>Offer Evaluation</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--alpha-text-45)' }}>Score any job offer against your risk profile</p>
          </div>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--alpha-bg-08)', color: 'var(--alpha-text-55)' }}>
            Close
          </button>
        </div>

        {!offerResult ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--alpha-text-55)' }}>Offer Company Name</label>
              <input value={offerCompany} onChange={e => setOfferCompany(e.target.value)}
                placeholder="e.g. Google, Stripe, Razorpay"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--alpha-bg-06)', border: '1px solid var(--alpha-bg-08)', color: 'var(--alpha-text-92)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--alpha-text-55)' }}>Offered Base Salary (annual)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--alpha-text-50)' }}>{currSymbol}</span>
                <input value={offerSalary} onChange={e => setOfferSalary(e.target.value)}
                  placeholder="e.g. 1500000"
                  type="number"
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--alpha-bg-06)', border: '1px solid var(--alpha-bg-08)', color: 'var(--alpha-text-92)' }} />
              </div>
              {currentSalary > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--alpha-text-35)' }}>
                  Compared against your current {currSymbol}{currentSalary.toLocaleString()} from your saved profile.
                </p>
              )}
            </div>
            {/* Offer industry — collected by the engine but had no input field before. */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--alpha-text-55)' }}>Offer Industry (optional)</label>
              <input value={offerIndustry} onChange={e => setOfferIndustry(e.target.value)}
                placeholder="e.g. fintech, healthcare, SaaS"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--alpha-bg-06)', border: '1px solid var(--alpha-bg-08)', color: 'var(--alpha-text-92)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--alpha-text-55)' }}>Company Size</label>
              <select value={offerSize} onChange={e => setOfferSize(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--alpha-bg-06)', border: '1px solid var(--alpha-bg-08)', color: 'var(--alpha-text-92)' }}>
                <option value="startup">Startup (&lt;50)</option>
                <option value="smb">SMB (50–500)</option>
                <option value="mid">Mid (500–5,000)</option>
                <option value="large">Large (5,000–50,000)</option>
                <option value="enterprise">Enterprise (50,000+)</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="recentLayoffs" checked={hasRecentLayoffs}
                onChange={e => setHasRecentLayoffs(e.target.checked)}
                className="w-4 h-4 rounded" />
              <label htmlFor="recentLayoffs" className="text-xs" style={{ color: 'var(--alpha-text-55)' }}>
                This company has had recent layoffs
              </label>
            </div>
            <button
              onClick={evaluate}
              disabled={!offerSalary || !offerCompany}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: offerSalary && offerCompany ? 'linear-gradient(135deg, #00d4e0, #0099a8)' : 'rgba(255,255,255,0.08)',
                color: offerSalary && offerCompany ? '#fff' : 'rgba(255,255,255,0.3)',
              }}>
              Evaluate Offer →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl font-black mb-1" style={{ color: REC_COLORS[offerResult.recommendation] }}>
                {offerResult.overallScore}
              </div>
              <div className="text-sm font-bold" style={{ color: REC_COLORS[offerResult.recommendation] }}>
                {OFFER_REC_HUMAN_LABELS[offerResult.recommendation] ?? offerResult.recommendation.replace(/_/g, ' ')}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--alpha-text-50)' }}>{offerResult.keyInsight}</p>
            </div>

            <div className="space-y-2">
              {offerResult.dimensions.map(dim => (
                <div key={dim.id} className="flex items-center gap-3">
                  <span className="text-xs w-32 flex-shrink-0" style={{ color: 'var(--alpha-text-50)' }}>{dim.name}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--alpha-bg-08)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${dim.score}%`, background: dim.score >= 70 ? '#10b981' : dim.score >= 45 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: 'var(--alpha-text-50)' }}>{dim.score}</span>
                </div>
              ))}
            </div>

            {offerResult.negotiationPoints.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#f59e0b' }}>Negotiation Points</p>
                {offerResult.negotiationPoints.map((pt, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-xs" style={{ color: 'var(--alpha-text-70)' }}>
                      <span className="font-medium" style={{ color: '#f59e0b' }}>{toTitleCase(pt.priority)}: </span>
                      {pt.lever}
                    </p>
                    {pt.script && (
                      <p className="text-[11px] mt-1 leading-snug pl-2" style={{ color: 'var(--alpha-text-45)', borderLeft: '2px solid rgba(245,158,11,0.3)' }}>
                        “{pt.script}”
                      </p>
                    )}
                    {pt.expectedImprovement && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#10b981' }}>
                        Expected: {pt.expectedImprovement}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Key strengths / concerns summary, if the engine surfaced them */}
            {offerResult.keyInsight && (
              <p className="text-[11px] text-center" style={{ color: 'var(--alpha-text-35)' }}>
                {offerResult.recommendation === 'CANNOT_ACCEPT'
                  ? 'This offer has a hard eligibility block — review the dimensions above before proceeding.'
                  : 'Scores are directional — validate comp and stability claims before deciding.'}
              </p>
            )}

            <button onClick={() => setOfferResult(null)} className="w-full py-2 rounded-lg text-xs"
              style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-50)' }}>
              ← Evaluate Another Offer
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined'
    ? createPortal(overlay, document.body)
    : overlay;
};


// ── Main component ─────────────────────────────────────────────────────────────
const StrategyTab: React.FC<StrategyTabProps> = ({ result, companyData }) => {
  const synthesis = (result as any).strategySynthesis;
  const confidence = (result as any).careerConfidence;
  const [showOfferModal, setShowOfferModal] = useState(false);
  // Negotiation scripts, the full phase plan, network leverage, and the
  // readiness profile stay collapsed by default — they're depth, not the
  // 3 things a user needs to remember (strategy, top priority, safety window).
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);

  // Persist phase-action completion across remounts (the AdaptiveBlock unmounts
  // StrategyTab when collapsed, which previously wiped progress). Keyed by
  // company + role so different audits keep separate checklists.
  const completionKey = useMemo(
    () => `hp_strategy_done::${(companyData as any)?.name ?? 'co'}::${result.workTypeKey ?? 'role'}`,
    [companyData, result.workTypeKey],
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(completionKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const toggleAction = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(completionKey, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  };

  if (!synthesis) {
    return (
      <div className="flex flex-col items-center text-center gap-2.5 py-10 px-6 rounded-2xl" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
        <Target className="w-5 h-5" style={{ color: 'var(--alpha-text-35)' }} />
        <p className="text-sm font-bold" style={{ color: 'var(--alpha-text-85)' }}>Strategy isn't ready yet</p>
        <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
          We need a bit more signal — usually company, role, and experience details — before we can build your personalized strategy.
        </p>
        <button
          type="button"
          onClick={() => {
            try { window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: 'summary' } })); } catch { /* SSR */ }
          }}
          className="mt-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: 'rgba(0,212,224,0.12)', color: '#00d4e0', border: '1px solid rgba(0,212,224,0.28)' }}
        >
          Complete Your Profile →
        </button>
      </div>
    );
  }

  const strategyColors = STRATEGY_COLORS[synthesis.overallStrategy] ?? STRATEGY_COLORS.PROTECT_AND_WAIT;
  const urgencyColor = URGENCY_COLORS[synthesis.urgencyLevel] ?? '#f59e0b';
  const allActions = (synthesis.phases ?? []).flatMap((p: StrategicPlan) => p.actions);
  const completedCount = allActions.filter((a: StrategyAction) => completedIds.has(a.id)).length;
  const progressPct = allActions.length > 0 ? Math.round((completedCount / allActions.length) * 100) : 0;

  return (
    <div className="space-y-5 px-1">
      {/* IntelligenceBriefPanel removed — same content exists in Intelligence Lab tab */}

      {/* Strategy banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5"
        style={{ background: strategyColors.bg, border: `1px solid ${strategyColors.border}` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: `${urgencyColor}18`, color: urgencyColor, border: `1px solid ${urgencyColor}30` }}>
                {URGENCY_HUMAN_LABELS[synthesis.urgencyLevel] ?? synthesis.urgencyLevel}
              </span>
            </div>
            <h2 className="text-lg font-black mb-1" style={{ color: strategyColors.text }}>
              {STRATEGY_HUMAN_LABELS[synthesis.overallStrategy] ?? synthesis.overallStrategy.replace(/_/g, ' ')}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
              {synthesis.strategyRationale}
            </p>
            {/* Promotion timing — computed by the engine but never shown before.
                Null when an exit strategy makes promotion timing irrelevant. */}
            {synthesis.promotionTimingNote && (
              <div className="flex items-start gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--alpha-bg-08)' }}>
                <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: strategyColors.text }} />
                <p className="text-xs leading-snug" style={{ color: 'var(--alpha-text-55)' }}>
                  <span className="font-semibold" style={{ color: strategyColors.text }}>Promotion timing: </span>
                  {synthesis.promotionTimingNote}
                </p>
              </div>
            )}
          </div>
          <div className="text-center flex-shrink-0">
            <div className="text-3xl font-black" style={{ color: urgencyColor }}>
              {synthesis.estimatedSafetyWindowDays}
            </div>
            <div className="text-[10px] tracking-wider opacity-60">DAYS</div>
            <div className="text-[10px] opacity-45">est. time to act</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--alpha-bg-08)' }}>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'var(--alpha-text-50)' }}>
              {completedCount} of {allActions.length} actions completed
            </span>
            <span className="text-xs font-semibold" style={{ color: strategyColors.text }}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--alpha-bg-08)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${strategyColors.accent}, ${strategyColors.text})` }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }} />
          </div>
        </div>
      </motion.div>

      {/* v14.0: Active Signal Alerts — surface critical signals from new layers */}
      {(() => {
        const careerVel = (result as any).careerVelocity;
        const compRisk  = (result as any).compensationRisk;
        const maRisk    = (result as any).maRisk;
        const sentiment = (result as any).employeeSentiment;
        const leadership = (result as any).leadershipTransitionRisk;
        const alerts: Array<{ icon: string; text: string; color: string }> = [];

        if (careerVel?.plateauRisk === 'HIGH') alerts.push({ icon: '⚠', text: `Your growth has slowed — ${careerVel.promotionNote?.split('.')[0]}`, color: '#f59e0b' });
        if (compRisk?.cascadeStage === 'PAY_FREEZE' || compRisk?.cascadeStage === 'PAY_CUT' || compRisk?.cascadeStage === 'PRE_LAYOFF') {
          alerts.push({ icon: '🔴', text: `${compRisk.cascadeStageLabel}`, color: '#ef4444' });
        }
        if (maRisk?.isInPeakRiskWindow) alerts.push({ icon: '🔴', text: 'Your company may be merging or restructuring soon', color: '#ef4444' });
        if (sentiment?.earlyWarningActive) alerts.push({ icon: '⚠', text: 'Employees are unhappy — often happens before layoffs', color: '#f59e0b' });
        if (leadership?.vpClusteringAlert === 'ACTIVE') alerts.push({ icon: '⚠', text: 'Several leaders have left recently', color: '#f97316' });
        if (leadership?.cfoSignal === 'DEPARTED') alerts.push({ icon: '🔴', text: 'The finance chief left — often happens before layoffs', color: '#ef4444' });

        if (alerts.length === 0) return null;
        return (
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--alpha-text-35)' }}>
              THINGS TO WATCH ({alerts.length})
            </div>
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs flex-shrink-0">{a.icon}</span>
                <span className="text-[11px] leading-relaxed" style={{ color: a.color }}>{a.text}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Top priority + competitive position */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,212,224,0.06)', border: '1px solid rgba(0,212,224,0.18)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5" style={{ color: '#00d4e0' }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#00d4e0' }}>DO THIS FIRST</span>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--alpha-text-92)' }}>
            {synthesis.topPriorityAction?.title}
          </p>
          {/* Surface the rationale (WHY this is the priority) — previously dropped. */}
          {synthesis.topPriorityAction?.rationale && (
            <p className="text-xs mb-1.5 leading-snug" style={{ color: 'var(--alpha-text-50)' }}>
              {synthesis.topPriorityAction.rationale}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--alpha-text-50)' }}>
              {synthesis.topPriorityAction?.timeHorizon}
            </span>
            {null /* sourceLayer is an internal signal code — not surfaced to users */}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#10b981' }}>BEST OPPORTUNITY</span>
          </div>
          <p className="text-sm leading-snug" style={{ color: 'var(--alpha-text-70)' }}>
            {synthesis.singleBiggestOpportunity}
          </p>
        </div>
      </div>

      {/* Offer evaluation CTA */}
      <motion.button
        onClick={() => setShowOfferModal(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid rgba(255,255,255,0.1)' }}
        whileHover={{ background: 'var(--alpha-bg-06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
            background: 'rgba(0,212,224,0.12)', border: '1px solid rgba(0,212,224,0.25)',
          }}>
            <DollarSign className="w-4 h-4" style={{ color: '#00d4e0' }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--alpha-text-85)' }}>Evaluate a Job Offer</p>
            <p className="text-xs" style={{ color: 'var(--alpha-text-35)' }}>Score any offer against your risk profile in 60 seconds</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 opacity-40" />
      </motion.button>

      {/* ── See the full plan — depth for when you want it, not blocking memory. ── */}
      <button
        type="button"
        onClick={() => setShowFullBreakdown(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" style={{ color: 'var(--alpha-text-45)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--alpha-text-85)' }}>
            {showFullBreakdown ? 'Hide full plan' : 'See full plan'}
          </span>
        </div>
        {showFullBreakdown ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
      </button>

      <AnimatePresence>
        {showFullBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-5">

      {/* Strategic phases */}
      <div>
        <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--alpha-text-35)' }}>
          YOUR PLAN
        </p>
        <div className="space-y-3">
          {(synthesis.phases ?? []).map((plan: StrategicPlan) => (
            <PhaseCard
              key={plan.phase}
              plan={plan}
              completedIds={completedIds}
              onToggleAction={toggleAction}
            />
          ))}
        </div>
      </div>

      {/* Career confidence summary */}
      {confidence && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" style={{ color: '#a78bfa' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>Job Search Readiness</span>
            </div>
            <div className="flex items-center gap-2">
              {typeof confidence.compositeScore === 'number' && (
                <span className="text-sm font-black" style={{ color: '#a78bfa' }}>{confidence.compositeScore}<span className="text-[10px] opacity-50">/100</span></span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)',
              }}>
                {toTitleCase(confidence.confidenceTier)}
              </span>
            </div>
          </div>
          {/* Readiness headline + estimated time-to-ready — both computed but
              never shown. They answer "how ready am I and how long to fix it?" */}
          {confidence.readinessHeadline && (
            <p className="text-xs mb-2" style={{ color: 'var(--alpha-text-50)' }}>{confidence.readinessHeadline}</p>
          )}
          {typeof confidence.estimatedReadyInDays === 'number' && confidence.estimatedReadyInDays > 0 && (
            <p className="text-[11px] mb-3" style={{ color: 'rgba(167,139,250,0.85)' }}>
              ~{confidence.estimatedReadyInDays} days of focused effort to reach job-ready.
            </p>
          )}
          <div className="space-y-2">
            {confidence.pillars.map((pillar: any) => (
              <div key={pillar.id} className="flex items-center gap-3">
                <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--alpha-text-50)' }}>{pillar.name}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--alpha-bg-08)' }}>
                  <div className="h-full rounded-full"
                    style={{
                      width: `${pillar.score}%`,
                      background: pillar.score >= 70 ? '#10b981' : pillar.score >= 45 ? '#f59e0b' : '#ef4444',
                    }} />
                </div>
                <span className="text-xs w-8 text-right" style={{ color: 'var(--alpha-text-35)' }}>{pillar.score}</span>
              </div>
            ))}
          </div>
          {/* Key strength to leverage — paired with the critical gap so the
              profile shows both the asset and the weakness, not just the weakness. */}
          {confidence.keyStrength && (
            <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs" style={{ color: 'var(--alpha-text-55)' }}>
                <span className="font-semibold" style={{ color: '#10b981' }}>Key strength ({confidence.keyStrength.name}): </span>
                lead with this — it is your strongest readiness pillar.
              </p>
            </div>
          )}
          {confidence.criticalGap && (
            <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs" style={{ color: 'var(--alpha-text-55)' }}>
                <span className="font-semibold" style={{ color: '#ef4444' }}>Critical gap ({confidence.criticalGap.name}): </span>
                {confidence.criticalGap.topAction}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Competitive position + risk/opportunity — the 2-col grid previously had
          an empty second column (only BIGGEST RISK rendered), which read as a
          layout bug. Now pairs the biggest risk with the biggest opportunity. */}
      <div className="rounded-xl p-4" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
        <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--alpha-text-30)' }}>WHERE YOU STAND</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>{synthesis.competitivePositionStatement}</p>
        <div className="mt-3 pt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-[10px] font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: 'rgba(239,68,68,0.85)' }}>
              <AlertTriangle className="w-3 h-3" /> MAIN CONCERN
            </p>
            <p className="text-xs leading-snug" style={{ color: 'var(--alpha-text-55)' }}>{synthesis.singleBiggestRisk}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-[10px] font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: '#10b981' }}>
              <TrendingUp className="w-3 h-3" /> BEST OPPORTUNITY
            </p>
            <p className="text-xs leading-snug" style={{ color: 'var(--alpha-text-55)' }}>{synthesis.singleBiggestOpportunity}</p>
          </div>
        </div>
      </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offer modal — currentSalary sourced from the user's saved financial
          context so the comp-delta dimension compares against their REAL salary,
          not a fabricated 85%-of-offer placeholder. */}
      <AnimatePresence>
        {showOfferModal && (
          <OfferModal
            currentScore={result.total}
            currentSalary={loadFinancialContext()?.currentAnnualIncome ?? undefined}
            onClose={() => setShowOfferModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StrategyTab;
