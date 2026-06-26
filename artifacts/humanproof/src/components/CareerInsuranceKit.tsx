// CareerInsuranceKit.tsx
// The "30-day survival plan" — converts risk score into a concrete,
// time-gated, week-by-week action plan with specific resources and cited impact.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Zap, Clock, Target, TrendingUp, Users,
  BookOpen, DollarSign, MessageSquare, ChevronDown,
  ChevronRight, ExternalLink, AlertTriangle, CheckCircle,
  Calendar, BarChart2, Briefcase,
} from 'lucide-react';
import type { CareerInsurancePlan, CareerInsuranceAction, UrgencyTier } from '../services/careerInsuranceEngine';

// ── Urgency styling ───────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<UrgencyTier, {
  label: string; bgColor: string; borderColor: string; textColor: string; icon: React.ReactNode;
}> = {
  critical:  { label: 'Critical — Act This Week',  bgColor: 'bg-red-500/8',    borderColor: 'border-red-500/40',    textColor: 'text-red-400',    icon: <AlertTriangle className="w-4 h-4" /> },
  elevated:  { label: 'Elevated — Act This Month', bgColor: 'bg-amber-500/8',  borderColor: 'border-amber-500/40',  textColor: 'text-amber-400',  icon: <Zap className="w-4 h-4" /> },
  moderate:  { label: 'Moderate — Act This Quarter', bgColor: 'bg-blue-500/8',  borderColor: 'border-blue-500/40',   textColor: 'text-blue-400',   icon: <Shield className="w-4 h-4" /> },
  low:       { label: 'Low — Strategic Positioning', bgColor: 'bg-emerald-500/8', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400', icon: <CheckCircle className="w-4 h-4" /> },
};

const CATEGORY_CONFIG: Record<CareerInsuranceAction['category'], {
  icon: React.ReactNode; color: string; label: string;
}> = {
  skill:        { icon: <BookOpen className="w-3.5 h-3.5" />, color: 'text-cyan-400',    label: 'Skill' },
  network:      { icon: <Users className="w-3.5 h-3.5" />,    color: 'text-violet-400',  label: 'Network' },
  financial:    { icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-emerald-400', label: 'Financial' },
  visibility:   { icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-amber-400', label: 'Visibility' },
  exploration:  { icon: <Briefcase className="w-3.5 h-3.5" />, color: 'text-blue-400',   label: 'Exploration' },
  conversation: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-pink-400', label: 'Conversation' },
};

const CONFIDENCE_BADGE: Record<CareerInsuranceAction['confidenceLevel'], { label: string; style: string }> = {
  high:            { label: 'High confidence', style: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  medium:          { label: 'Medium confidence', style: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  research_based:  { label: 'Research-based', style: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
};

// ── Action card ───────────────────────────────────────────────────────────────

const ActionCard: React.FC<{
  action: CareerInsuranceAction;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ action, index, isExpanded, onToggle }) => {
  const cat = CATEGORY_CONFIG[action.category];
  const conf = CONFIDENCE_BADGE[action.confidenceLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-[var(--alpha-bg-08)] bg-[var(--alpha-bg-04)] overflow-hidden hover:border-[var(--alpha-bg-12)] transition-colors"
    >
      {/* Header row */}
      <button
        className="w-full px-4 py-3 flex items-start gap-3 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className={`flex-shrink-0 mt-0.5 ${cat.color}`}>{cat.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold leading-snug">{action.title}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${conf.style}`}>
              {conf.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {action.specificOutcome}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {action.estimatedHours}h
            </span>
            {action.riskReductionPct > 0 && (
              <span className="text-[10px] font-mono text-emerald-400">
                −{action.riskReductionPct}% risk
              </span>
            )}
            <span className={`text-[10px] font-mono ${cat.color}`}>{cat.label}</span>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1 text-muted-foreground/50">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-[var(--alpha-bg-06)] pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Why This Specifically</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{action.rationale}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Expected Impact</p>
                <p className="text-xs text-emerald-400/80 leading-relaxed">{action.expectedImpact}</p>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-[var(--alpha-bg-04)] border border-[var(--alpha-bg-06)]">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-cyan-300">Resource</p>
                  <p className="text-[10px] text-muted-foreground">{action.resource}</p>
                </div>
                {action.resourceUrl && (
                  <a href={action.resourceUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400 hover:text-cyan-300" />
                  </a>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground/50 italic">Source: {action.sourceAttribution}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Week timeline section ─────────────────────────────────────────────────────

const TimelineSection: React.FC<{
  title: string;
  subtitle: string;
  actions: CareerInsuranceAction[];
  colorClass: string;
  defaultExpanded?: boolean;
}> = ({ title, subtitle, actions, colorClass, defaultExpanded = false }) => {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="mb-6">
      <button
        className="w-full flex items-center justify-between mb-3"
        onClick={() => setIsOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClass}`} />
          <span className="text-sm font-bold tracking-tight">{title}</span>
          <span className="text-xs text-muted-foreground font-mono">{subtitle}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--alpha-bg-06)] text-muted-foreground`}>
            {actions.length} actions
          </span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {actions.map((action, i) => (
              <ActionCard
                key={action.id}
                action={action}
                index={i}
                isExpanded={expandedId === action.id}
                onToggle={() => setExpandedId(expandedId === action.id ? null : action.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Skill upgrade cards ───────────────────────────────────────────────────────

const SkillUpgradeCard: React.FC<{
  skill: CareerInsurancePlan['skillUpgrades'][number];
  index: number;
}> = ({ skill, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.08 }}
    className="glass-panel p-4 space-y-2"
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-bold tracking-tight">{skill.skillName}</p>
        <p className="text-[11px] text-cyan-400">{skill.certificationOrCourse}</p>
      </div>
      <span className={`flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
        skill.demandTrend === 'rising' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : skill.demandTrend === 'stable' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
        : 'bg-red-500/15 text-red-400 border-red-500/20'
      }`}>
        {skill.demandTrend === 'rising' ? '↑ Rising' : skill.demandTrend === 'stable' ? '→ Stable' : '↓ Falling'}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-[10px]">
      <div className="p-2 rounded bg-[var(--alpha-bg-04)]">
        <p className="text-muted-foreground">Time</p>
        <p className="font-semibold">{skill.estimatedWeeks} weeks</p>
      </div>
      <div className="p-2 rounded bg-[var(--alpha-bg-04)]">
        <p className="text-muted-foreground">Cost</p>
        <p className="font-semibold">{skill.estimatedCost}</p>
      </div>
    </div>
    <p className="text-[10px] text-emerald-400 leading-relaxed">{skill.salaryImpact}</p>
    <div className="text-[9px] text-muted-foreground">
      <span className="font-semibold">Unlocks: </span>
      {skill.rolesItUnlocks.join(' · ')}
    </div>
    <p className="text-[9px] text-muted-foreground/50">Source: {skill.sourceAttribution}</p>
  </motion.div>
);

// ── Internal conversation guide ───────────────────────────────────────────────

const InternalConversationGuide: React.FC<{
  guide: CareerInsurancePlan['internalConversation'];
}> = ({ guide }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-panel p-4">
      <button className="w-full flex items-center justify-between" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-bold">The Conversation to Have This Week</span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      <p className="text-[11px] text-muted-foreground mt-2">{guide.whoToTalkTo}</p>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              <div className="p-3 rounded-lg bg-pink-500/6 border border-pink-500/15">
                <p className="text-[10px] font-bold text-pink-300 mb-1">How to Frame It</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{guide.conversationFraming}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Questions to Ask</p>
                <ul className="space-y-1">
                  {guide.keyQuestionsToAsk.map((q, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                      <span className="text-pink-400 flex-shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-red-500/6 border border-red-500/15">
                  <p className="text-[10px] font-bold text-red-400 mb-1">Signs of Risk</p>
                  <ul className="space-y-1">
                    {guide.signsOfRisk.map((s, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5">
                        <span className="text-red-400 flex-shrink-0">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/6 border border-emerald-500/15">
                  <p className="text-[10px] font-bold text-emerald-400 mb-1">Signs of Safety</p>
                  <ul className="space-y-1">
                    {guide.signsOfSafety.map((s, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5">
                        <span className="text-emerald-400 flex-shrink-0">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-[10px] text-amber-400 font-semibold">{guide.timing}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

interface CareerInsuranceKitProps {
  plan: CareerInsurancePlan;
  companyName: string;
}

export const CareerInsuranceKit: React.FC<CareerInsuranceKitProps> = ({ plan, companyName }) => {
  const urgencyConfig = URGENCY_CONFIG[plan.urgencyTier];
  const pct12 = Math.round(plan.twelveMonthLayoffProbability * 100);

  return (
    <div className="space-y-6">
      {/* Urgency header */}
      <div className={`rounded-xl border ${urgencyConfig.borderColor} ${urgencyConfig.bgColor} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${urgencyConfig.textColor}`}>{urgencyConfig.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-black tracking-tight ${urgencyConfig.textColor}`}>{urgencyConfig.label}</p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--alpha-bg-08)] text-muted-foreground">
                {pct12}% 12-month probability
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{plan.urgencyRationale}</p>
          </div>
        </div>
      </div>

      {/* Inaction consequence */}
      <div className="rounded-xl border border-[var(--alpha-bg-10)] bg-[var(--alpha-bg-02)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">If No Action Is Taken</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{plan.inactionConsequence}</p>
      </div>

      {/* Top priority action */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-cyan-400" />
          <p className="text-xs font-black uppercase tracking-widest text-cyan-400">Top Priority Right Now</p>
        </div>
        <p className="text-sm font-bold mb-2">{plan.topPriorityAction.title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{plan.topPriorityAction.specificOutcome}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{plan.topPriorityAction.estimatedHours}h investment</span>
          <span className="text-cyan-400">
            {(() => {
              const text = plan.topPriorityAction.expectedImpact ?? '';
              return text.length > 62 ? `${text.slice(0, 60)}…` : text;
            })()}
          </span>
        </div>
      </div>

      {/* Timeline sections */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Your 90-Day Protection Plan
        </h3>

        <TimelineSection
          title="Week 1" subtitle="— Critical first moves"
          actions={plan.week1Actions}
          colorClass="bg-red-500"
          defaultExpanded={plan.urgencyTier === 'critical' || plan.urgencyTier === 'elevated'}
        />
        <TimelineSection
          title="Month 1" subtitle="— Core defense deployed"
          actions={plan.month1Actions}
          colorClass="bg-amber-500"
          defaultExpanded={false}
        />
        <TimelineSection
          title="Quarters 1–2" subtitle="— Strategic positioning"
          actions={plan.quarter1Actions}
          colorClass="bg-blue-500"
          defaultExpanded={false}
        />
      </div>

      {/* Internal conversation */}
      <InternalConversationGuide guide={plan.internalConversation} />

      {/* Skill upgrades */}
      {plan.skillUpgrades.length > 0 && (
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Highest-ROI Skill Upgrades for Your Role
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {plan.skillUpgrades.map((skill, i) => (
              <SkillUpgradeCard key={skill.skillName} skill={skill} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerInsuranceKit;
