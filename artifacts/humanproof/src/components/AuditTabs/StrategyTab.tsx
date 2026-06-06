// StrategyTab.tsx — v14.0
// Career Strategy Command Center — 7th tab.
// Synthesizes ALL intelligence layers into a single strategic command view.
// Layout: urgency banner → v14.0 signal alerts → phase plan → network leverage → confidence pillars → offer eval modal

import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Zap, Shield, Clock, ArrowRight, CheckCircle2,
  Circle, AlertTriangle, TrendingUp, Users, Brain, DollarSign,
  ChevronDown, ChevronRight, Building2, Globe, Briefcase, Star,
  Scale, Copy, Check, MessageSquare,
} from "lucide-react";
import type { PsychologicalNegotiationTactic } from "@/services/offerEvaluationEngine";
import type { HybridResult } from "@/types/hybridResult";
import type { CompanyData } from "@/data/companyDatabase";
import type { StrategyAction, StrategicPlan } from "@/services/strategySynthesisEngine";
import type { OfferEvaluationInputs } from "@/services/offerEvaluationEngine";
import { evaluateJobOffer } from "@/services/offerEvaluationEngine";
import { loadFinancialContext } from "@/services/financialContextService";
import { CURRENCY_META } from "@/services/currencyService";
// v17.0
import IntelligenceBriefPanel from "./common/IntelligenceBriefPanel";

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

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MODERATE: '#f59e0b',
  LOW:      '#10b981',
};

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
    whileHover={{ background: 'rgba(255,255,255,0.06)' }}
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
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {action.description}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-[10px] tracking-wider" style={{ color: phaseColor, opacity: 0.8 }}>
          {action.timeHorizon}
        </span>
        <span className="text-[10px] opacity-30">·</span>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Impact {action.roiScore}/100
        </span>
        <span className="text-[10px] opacity-30">·</span>
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {(action.sourceLayer ?? '').replace(/^L\d+\s*·\s*|^D\d+\s*·\s*/i, '')}
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
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {plan.phaseLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{
              background: `${color}18`, color, border: `1px solid ${color}30`,
            }}>
              {plan.timeframe}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Score any job offer against your risk profile</p>
          </div>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            Close
          </button>
        </div>

        {!offerResult ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Offer Company Name</label>
              <input value={offerCompany} onChange={e => setOfferCompany(e.target.value)}
                placeholder="e.g. Google, Stripe, Razorpay"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Offered Base Salary (annual)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{currSymbol}</span>
                <input value={offerSalary} onChange={e => setOfferSalary(e.target.value)}
                  placeholder="e.g. 1500000"
                  type="number"
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }} />
              </div>
              {currentSalary > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Compared against your current {currSymbol}{currentSalary.toLocaleString()} from your saved profile.
                </p>
              )}
            </div>
            {/* Offer industry — collected by the engine but had no input field before. */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Offer Industry (optional)</label>
              <input value={offerIndustry} onChange={e => setOfferIndustry(e.target.value)}
                placeholder="e.g. fintech, healthcare, SaaS"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Company Size</label>
              <select value={offerSize} onChange={e => setOfferSize(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
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
              <label htmlFor="recentLayoffs" className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
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
                {offerResult.recommendation.replace(/_/g, ' ')}
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{offerResult.keyInsight}</p>
            </div>

            <div className="space-y-2">
              {offerResult.dimensions.map(dim => (
                <div key={dim.id} className="flex items-center gap-3">
                  <span className="text-xs w-32 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>{dim.name}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${dim.score}%`, background: dim.score >= 70 ? '#10b981' : dim.score >= 45 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: 'rgba(255,255,255,0.5)' }}>{dim.score}</span>
                </div>
              ))}
            </div>

            {offerResult.negotiationPoints.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#f59e0b' }}>Negotiation Points</p>
                {offerResult.negotiationPoints.map((pt, i) => (
                  <div key={i} className="mb-2">
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <span className="font-medium" style={{ color: '#f59e0b' }}>{pt.priority.replace(/_/g, ' ')}: </span>
                      {pt.lever}
                    </p>
                    {pt.script && (
                      <p className="text-[11px] mt-1 leading-snug pl-2" style={{ color: 'rgba(255,255,255,0.45)', borderLeft: '2px solid rgba(245,158,11,0.3)' }}>
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
              <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {offerResult.recommendation === 'CANNOT_ACCEPT'
                  ? 'This offer has a hard eligibility block — review the dimensions above before proceeding.'
                  : 'Scores are directional — validate comp and stability claims before deciding.'}
              </p>
            )}

            <button onClick={() => setOfferResult(null)} className="w-full py-2 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
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

// ── Negotiation tactics section ───────────────────────────────────────────────
// Surfaces synthesis.psychologicalNegotiationTactics — the "& negotiation" half
// of the "Strategic plan & negotiation" block, which was previously computed by
// the engine but never rendered anywhere. Each tactic ships a copy-pasteable
// script grounded in a named psychology principle.
const TacticCard: React.FC<{ tactic: PsychologicalNegotiationTactic; index: number }> = ({ tactic, index }) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(index === 0);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(tactic.script);
    } catch {
      const el = document.createElement('textarea');
      el.value = tactic.script;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left">
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
        <span className="text-xs font-semibold flex-1 min-w-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {tactic.tacticName}
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5 opacity-40" /> : <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
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
            <div className="px-3.5 pb-3.5">
              <p className="text-[11px] mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="font-semibold" style={{ color: '#a78bfa' }}>When: </span>{tactic.whenToUse}
              </p>
              <div className="rounded-lg p-3 mb-2" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {tactic.script}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] leading-snug flex-1 min-w-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Why it works: </span>{tactic.psychologyBasis}
                </p>
                <button
                  onClick={copyScript}
                  className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded flex-shrink-0"
                  style={{
                    background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                    color: copied ? '#34d399' : 'rgba(255,255,255,0.45)',
                    border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
              </div>
              {tactic.caution && (
                <p className="text-[10px] mt-2 leading-snug" style={{ color: '#f59e0b' }}>
                  ⚠ {tactic.caution}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NegotiationTacticsSection: React.FC<{ tactics: PsychologicalNegotiationTactic[] }> = ({ tactics }) => {
  if (!tactics || tactics.length === 0) return null;
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.18)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Scale className="w-4 h-4" style={{ color: '#a78bfa' }} />
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Negotiation Tactics</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
          {tactics.length} ready
        </span>
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Evidence-based scripts for retention, severance, or counter-offer conversations — ranked for your leverage.
      </p>
      <div className="space-y-2">
        {tactics.map((t, i) => <TacticCard key={i} tactic={t} index={i} />)}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const StrategyTab: React.FC<StrategyTabProps> = ({ result, companyData }) => {
  const synthesis = (result as any).strategySynthesis;
  const confidence = (result as any).careerConfidence;
  const network = (result as any).networkLeverage;
  const [showOfferModal, setShowOfferModal] = useState(false);

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
      <div className="flex items-center justify-center py-12 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Strategy synthesis not available for this audit.</p>
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
      {/* v41.0: evidence-floor-gated brief — heuristic tier and low confidence block it */}
      <IntelligenceBriefPanel
        intelligenceBrief={(result as any).intelligenceBrief}
        confidence={result.confidencePercent ?? Math.round(Number(result.confidence ?? 0.5) * 100)}
        freshnessTier={result.unifiedFreshness?.tier}
        companyName={(companyData as any)?.name}
      />

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
                {synthesis.urgencyLevel} URGENCY
              </span>
              <span className="text-[10px] tracking-wider opacity-50">STRATEGY v14.0</span>
            </div>
            <h2 className="text-lg font-black mb-1" style={{ color: strategyColors.text }}>
              {synthesis.overallStrategy.replace(/_/g, ' ')}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {synthesis.strategyRationale}
            </p>
            {/* Promotion timing — computed by the engine but never shown before.
                Null when an exit strategy makes promotion timing irrelevant. */}
            {synthesis.promotionTimingNote && (
              <div className="flex items-start gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <TrendingUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: strategyColors.text }} />
                <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
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
            <div className="text-[10px] opacity-45">safety window</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {completedCount} of {allActions.length} actions completed
            </span>
            <span className="text-xs font-semibold" style={{ color: strategyColors.text }}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
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

        if (careerVel?.plateauRisk === 'HIGH') alerts.push({ icon: '⚠', text: `Career plateau risk — ${careerVel.promotionNote?.split('.')[0]}`, color: '#f59e0b' });
        if (compRisk?.cascadeStage === 'PAY_FREEZE' || compRisk?.cascadeStage === 'PAY_CUT' || compRisk?.cascadeStage === 'PRE_LAYOFF') {
          alerts.push({ icon: '🔴', text: `${compRisk.cascadeStageLabel}`, color: '#ef4444' });
        }
        if (maRisk?.isInPeakRiskWindow) alerts.push({ icon: '🔴', text: 'Company is in the highest-risk window for restructuring after a merger or acquisition (months 6–18)', color: '#ef4444' });
        if (sentiment?.earlyWarningActive) alerts.push({ icon: '⚠', text: `Employee sentiment is declining — ${sentiment.sentimentLeadTimeEstimate}`, color: '#f59e0b' });
        if (leadership?.vpClusteringAlert === 'ACTIVE') alerts.push({ icon: '⚠', text: leadership.vpClusteringNote?.split('.')[0] ?? 'Multiple VP-level departures in a short window', color: '#f97316' });
        if (leadership?.cfoSignal === 'DEPARTED') alerts.push({ icon: '🔴', text: 'CFO has recently left — one of the strongest early signs of restructuring', color: '#ef4444' });

        if (alerts.length === 0) return null;
        return (
          <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              WHAT WE'RE WATCHING ({alerts.length})
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
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#00d4e0' }}>TOP PRIORITY NOW</span>
            {typeof synthesis.topPriorityAction?.roiScore === 'number' && (
              <span className="text-[9px] font-mono ml-auto px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,224,0.12)', color: '#00d4e0' }}>
                Impact {synthesis.topPriorityAction.roiScore}/100
              </span>
            )}
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {synthesis.topPriorityAction?.title}
          </p>
          {/* Surface the rationale (WHY this is the priority) — previously dropped. */}
          {synthesis.topPriorityAction?.rationale && (
            <p className="text-xs mb-1.5 leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {synthesis.topPriorityAction.rationale}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {synthesis.topPriorityAction?.timeHorizon}
            </span>
            {synthesis.topPriorityAction?.sourceLayer && (
              <>
                <span className="text-[10px] opacity-30">·</span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {(synthesis.topPriorityAction.sourceLayer ?? '').replace(/^L\d+\s*·\s*|^D\d+\s*·\s*/i, '')}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#10b981' }}>BIGGEST OPPORTUNITY</span>
          </div>
          <p className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {synthesis.singleBiggestOpportunity}
          </p>
        </div>
      </div>

      {/* Offer evaluation CTA */}
      <motion.button
        onClick={() => setShowOfferModal(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        whileHover={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
            background: 'rgba(0,212,224,0.12)', border: '1px solid rgba(0,212,224,0.25)',
          }}>
            <DollarSign className="w-4 h-4" style={{ color: '#00d4e0' }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Evaluate a Job Offer</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Score any offer against your risk profile in 60 seconds</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 opacity-40" />
      </motion.button>

      {/* Negotiation tactics — the "& negotiation" content, previously unrendered */}
      <NegotiationTacticsSection tactics={synthesis.psychologicalNegotiationTactics ?? []} />

      {/* Strategic phases */}
      <div>
        <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
          YOUR STRATEGIC PLAN
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

      {/* Network leverage summary */}
      {network && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: '#00d4e0' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Network Leverage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black" style={{ color: '#00d4e0' }}>{network.networkScore}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                background: 'rgba(0,212,224,0.12)', color: '#00d4e0', border: '1px solid rgba(0,212,224,0.25)',
              }}>
                {network.networkTier.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{network.networkHeadline}</p>

          {/* Headline metrics — now includes time-to-first-referral + diversity,
              both computed by the engine but previously never surfaced. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{network.estimatedWarmContacts}</div>
              <div className="text-[10px] opacity-40">warm contacts</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{network.referralAccessScore}</div>
              <div className="text-[10px] opacity-40">referral score</div>
            </div>
            {network.networkDiversityScore != null && (
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{network.networkDiversityScore}</div>
                <div className="text-[10px] opacity-40">diversity</div>
              </div>
            )}
            {network.timeToFirstReferral && (
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: '#10b981' }}>{network.timeToFirstReferral}</div>
                <div className="text-[10px] opacity-40">to 1st referral</div>
              </div>
            )}
          </div>

          {/* Recommended application channel split — was showing only 1 of 3
              numbers (the warm-referral %), which misrepresented the metric.
              Now renders the full recommended split as a stacked bar. */}
          {network.applicationChannelSplit && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                RECOMMENDED APPLICATION MIX
              </p>
              <div className="flex h-2 rounded-full overflow-hidden mb-1.5">
                <div style={{ width: `${network.applicationChannelSplit.warmReferral}%`, background: '#10b981' }} />
                <div style={{ width: `${network.applicationChannelSplit.recruiterOutreach}%`, background: '#00d4e0' }} />
                <div style={{ width: `${network.applicationChannelSplit.directApply}%`, background: 'rgba(255,255,255,0.25)' }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                  {network.applicationChannelSplit.warmReferral}% warm referral
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#00d4e0' }} />
                  {network.applicationChannelSplit.recruiterOutreach}% recruiter
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                  {network.applicationChannelSplit.directApply}% direct apply
                </span>
              </div>
            </div>
          )}

          {/* Top referral opportunities — specific, computed, never rendered before. */}
          {Array.isArray(network.topReferralOpportunities) && network.topReferralOpportunities.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>TOP REFERRAL OPPORTUNITIES</p>
              <div className="space-y-2">
                {network.topReferralOpportunities.slice(0, 3).map((opp: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      {Math.round((opp.referralProbability ?? 0) * 100)}%
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{opp.targetCompanyType}</p>
                      <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.5)' }}>{opp.actionToActivate}</p>
                      {opp.timeToReferral && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>~{opp.timeToReferral}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>ACTIVATION PLAN</p>
            {/* Show the full sequenced activation plan, not just step 1. */}
            <div className="space-y-1.5">
              {(network.activationPlan ?? []).slice(0, 3).map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-black flex-shrink-0 mt-0.5" style={{ color: '#00d4e0' }}>{i + 1}.</span>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Career confidence summary */}
      {confidence && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" style={{ color: '#a78bfa' }} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Readiness Profile</span>
            </div>
            <div className="flex items-center gap-2">
              {typeof confidence.compositeScore === 'number' && (
                <span className="text-sm font-black" style={{ color: '#a78bfa' }}>{confidence.compositeScore}<span className="text-[10px] opacity-50">/100</span></span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)',
              }}>
                {confidence.confidenceTier.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          {/* Readiness headline + estimated time-to-ready — both computed but
              never shown. They answer "how ready am I and how long to fix it?" */}
          {confidence.readinessHeadline && (
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{confidence.readinessHeadline}</p>
          )}
          {typeof confidence.estimatedReadyInDays === 'number' && confidence.estimatedReadyInDays > 0 && (
            <p className="text-[11px] mb-3" style={{ color: 'rgba(167,139,250,0.85)' }}>
              ~{confidence.estimatedReadyInDays} days of focused effort to reach job-ready.
            </p>
          )}
          <div className="space-y-2">
            {confidence.pillars.map((pillar: any) => (
              <div key={pillar.id} className="flex items-center gap-3">
                <span className="text-xs w-28 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>{pillar.name}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full"
                    style={{
                      width: `${pillar.score}%`,
                      background: pillar.score >= 70 ? '#10b981' : pillar.score >= 45 ? '#f59e0b' : '#ef4444',
                    }} />
                </div>
                <span className="text-xs w-8 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>{pillar.score}</span>
              </div>
            ))}
          </div>
          {/* Key strength to leverage — paired with the critical gap so the
              profile shows both the asset and the weakness, not just the weakness. */}
          {confidence.keyStrength && (
            <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span className="font-semibold" style={{ color: '#10b981' }}>Key strength ({confidence.keyStrength.name}): </span>
                lead with this — it is your strongest readiness pillar.
              </p>
            </div>
          )}
          {confidence.criticalGap && (
            <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
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
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>YOUR POSITION</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{synthesis.competitivePositionStatement}</p>
        <div className="mt-3 pt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-[10px] font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: 'rgba(239,68,68,0.85)' }}>
              <AlertTriangle className="w-3 h-3" /> BIGGEST RISK
            </p>
            <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{synthesis.singleBiggestRisk}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-[10px] font-bold tracking-wider mb-1 flex items-center gap-1" style={{ color: '#10b981' }}>
              <TrendingUp className="w-3 h-3" /> BIGGEST OPPORTUNITY
            </p>
            <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{synthesis.singleBiggestOpportunity}</p>
          </div>
        </div>
      </div>

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
