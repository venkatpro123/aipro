// MonthlyActionPlan.tsx — v46.0
//
// Month-by-month action calendar from monthlyActionPlanEngine.ts.
// No inline styles — all surfaces use CSS utility classes.
// Emoji icons replaced with Lucide (accessibility + consistency).

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle, Lock, Zap, Star, Siren, AlertTriangle,
  ClipboardList, ShieldCheck,
} from "lucide-react";
import type { MonthlyActionPlanResult, MonthPlan, WeeklyAction } from "@/services/monthlyActionPlanEngine";

interface MonthlyActionPlanProps {
  plan: MonthlyActionPlanResult;
  className?: string;
}

const URGENCY_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  Icon: React.ElementType;
}> = {
  crisis:    { label: 'Crisis Protocol',   badgeClass: 'urgency-badge urgency-badge--crisis',     Icon: Siren },
  elevated:  { label: 'Elevated Response', badgeClass: 'urgency-badge urgency-badge--elevated',   Icon: AlertTriangle },
  standard:  { label: 'Strategic Plan',    badgeClass: 'urgency-badge urgency-badge--standard',   Icon: ClipboardList },
  monitoring:{ label: 'Maintenance Mode',  badgeClass: 'urgency-badge urgency-badge--monitoring', Icon: ShieldCheck },
};

function UrgencyHeader({ mode, totalMonths }: { mode: MonthlyActionPlanResult['urgencyMode']; totalMonths: number }) {
  const c = URGENCY_CONFIG[mode] ?? URGENCY_CONFIG.standard;
  const { Icon } = c;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--alpha-text-55)] flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-[var(--alpha-text-85)]">{c.label}</div>
          <div className="text-xs text-[var(--alpha-text-40)]">{totalMonths}-month action calendar</div>
        </div>
      </div>
      <span className={c.badgeClass}>{mode.toUpperCase()}</span>
    </div>
  );
}

function ROIStars({ rating }: { rating: number }) {
  const stars = Math.round(rating / 2);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`roi-star ${n <= stars ? 'roi-star--filled' : 'roi-star--empty'}`} />
      ))}
    </div>
  );
}

function WeekRow({ action, index, isLast }: { action: WeeklyAction; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="relative">
      {!isLast && <div className="timeline-connector" />}
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-1">
          <div className={`week-node ${action.isBlocking ? 'week-node--blocking' : 'week-node--normal'}`}>
            W{action.weekNumber}
          </div>
        </div>

        <div className="flex-1 pb-4">
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="flex items-start justify-between gap-2 w-full text-left">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-0.5">
                {action.isBlocking && <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400/70" />}
                <span className="text-sm font-medium text-[var(--alpha-text-78)] leading-snug">{action.action}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--alpha-text-30)]">{action.deadline}</span>
                <span className="text-[10px] text-[var(--alpha-text-15)]">·</span>
                <div className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-[var(--alpha-text-20)]" />
                  <span className="text-[10px] text-[var(--alpha-text-30)]">{action.timeInvestment}</span>
                </div>
                <span className="text-[10px] text-[var(--alpha-text-15)]">·</span>
                <ROIStars rating={action.roiRating} />
              </div>
            </div>
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-[var(--alpha-text-20)] flex-shrink-0 mt-0.5" />
              : <ChevronDown className="w-3.5 h-3.5 text-[var(--alpha-text-20)] flex-shrink-0 mt-0.5" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-2.5">
                  {action.subActions && action.subActions.length > 0 && (
                    <div className="space-y-1">
                      {action.subActions.map((sub, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-[var(--alpha-text-20)]" />
                          <span className="text-xs text-[var(--alpha-text-55)]">{sub}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {action.whyNow && (
                    <div className="why-now-box">
                      <Zap className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/60" />
                      <p className="text-xs text-[var(--alpha-text-50)] leading-relaxed">
                        <span className="text-amber-400/70 font-medium">Why now: </span>{action.whyNow}
                      </p>
                    </div>
                  )}

                  {action.expectedOutcome && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-400/50" />
                      <p className="text-xs text-[var(--alpha-text-45)] leading-relaxed">
                        <span className="text-emerald-400/60 font-medium">Expected: </span>{action.expectedOutcome}
                      </p>
                    </div>
                  )}

                  {action.evidence && (
                    <p className="text-[11px] text-[var(--alpha-text-25)] italic leading-relaxed">{action.evidence}</p>
                  )}

                  {action.unlocks && action.unlocks.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[var(--alpha-text-25)]">Unlocks:</span>
                      {action.unlocks.map(u => (
                        <span key={u} className="unlock-tag">{u}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MonthSection({
  month, isActive, onClick,
}: { month: MonthPlan; isActive: boolean; onClick: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`month-section-btn ${isActive ? 'month-section-btn--active' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className={`month-num ${isActive ? 'month-num--active' : ''}`}>
            M{month.month}
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--alpha-text-78)]">{month.theme}</div>
            <div className="text-xs text-[var(--alpha-text-30)]">{month.weeklyActions.length} weekly actions</div>
          </div>
        </div>
        {isActive
          ? <ChevronUp className="w-4 h-4 text-[var(--alpha-text-25)]" />
          : <ChevronDown className="w-4 h-4 text-[var(--alpha-text-25)]" />}
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1 pl-4">
              {month.milestoneGoal && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-[var(--alpha-text-30)] uppercase tracking-wide mb-1.5">Month goal</div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400/40" />
                    <span className="text-xs text-[var(--alpha-text-55)]">{month.milestoneGoal}</span>
                  </div>
                </div>
              )}
              {month.weeklyActions.map((week, i) => (
                <WeekRow
                  key={`w${week.weekNumber}`}
                  action={week}
                  index={i}
                  isLast={i === month.weeklyActions.length - 1}
                />
              ))}
              {month.goNoGoGate && (
                <div className="go-no-go-box mt-2 mb-3">
                  <span className="text-amber-400/70 font-medium">Month-end gate: </span>
                  {month.goNoGoGate}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MonthlyActionPlan: React.FC<MonthlyActionPlanProps> = ({ plan, className = '' }) => {
  const [activeMonth, setActiveMonth] = useState(0);

  const totalActions  = plan.months.reduce((sum, m) => sum + m.weeklyActions.length, 0);
  const totalBlocking = plan.months.reduce(
    (sum, m) => sum + m.weeklyActions.filter(w => w.isBlocking).length, 0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-4 ${className}`}
    >
      <div className="mb-4">
        <UrgencyHeader mode={plan.urgencyMode} totalMonths={plan.months.length} />

        {plan.planSummary && (
          <p className="mt-2.5 text-xs text-[var(--alpha-text-45)] leading-relaxed">{plan.planSummary}</p>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-center">
            <div className="text-base font-bold text-[var(--alpha-text-78)]">{totalActions}</div>
            <div className="text-[10px] text-[var(--alpha-text-30)]">total actions</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-[var(--alpha-text-78)]">{totalBlocking}</div>
            <div className="text-[10px] text-[var(--alpha-text-30)]">critical gates</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-[var(--alpha-text-78)]">{plan.quickWins.length}</div>
            <div className="text-[10px] text-[var(--alpha-text-30)]">quick wins</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-blue-400">{plan.estimatedJobSearchDuration}</div>
            <div className="text-[10px] text-[var(--alpha-text-30)]">est. timeline</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {plan.months.map((month, i) => (
          <MonthSection
            key={`month-${month.month}`}
            month={month}
            isActive={activeMonth === i}
            onClick={() => setActiveMonth(activeMonth === i ? -1 : i)}
          />
        ))}
      </div>

      {plan.criticalPath && plan.criticalPath.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <div className="text-xs font-medium text-[var(--alpha-text-25)] uppercase tracking-wide mb-1.5">
            Critical path (must-dos)
          </div>
          {plan.criticalPath.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-1">
              <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400/40" />
              <span className="text-xs text-[var(--alpha-text-35)]">{item}</span>
            </div>
          ))}
        </div>
      )}

      {plan.planExpiry && (
        <div className="mt-2 text-[10px] text-[var(--alpha-text-20)]">
          Re-audit recommended: {plan.planExpiry}
        </div>
      )}
    </motion.div>
  );
};

export default MonthlyActionPlan;
