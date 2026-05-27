/**
 * MonthlyActionPlan.tsx — v45.0
 *
 * Month-by-month action calendar from monthlyActionPlanEngine.ts.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle, Lock, Zap, Star
} from "lucide-react";
import type { MonthlyActionPlanResult, MonthPlan, WeeklyAction } from "@/services/monthlyActionPlanEngine";

interface MonthlyActionPlanProps {
  plan: MonthlyActionPlanResult;
  className?: string;
}

function UrgencyHeader({ mode, totalMonths }: { mode: MonthlyActionPlanResult['urgencyMode']; totalMonths: number }) {
  const config: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    crisis:    { label: 'Crisis Protocol',   color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  icon: '🚨' },
    elevated:  { label: 'Elevated Response', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', icon: '⚡' },
    standard:  { label: 'Strategic Plan',    color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', icon: '📋' },
    monitoring:{ label: 'Maintenance Mode',  color: '#10b981', bg: 'rgba(16,185,129,0.10)', icon: '✓' },
  };
  const c = config[mode] ?? config.standard;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">{c.icon}</span>
        <div>
          <div className="text-sm font-semibold text-white/90">{c.label}</div>
          <div className="text-xs text-white/45">{totalMonths}-month action calendar</div>
        </div>
      </div>
      <span className="text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full"
        style={{ color: c.color, background: c.bg }}>
        {mode.toUpperCase()}
      </span>
    </div>
  );
}

function ROIStars({ rating }: { rating: number }) {
  // roiRating is 1–10; display as 1–5 stars
  const stars = Math.round(rating / 2);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className="w-2.5 h-2.5"
          style={{ color: n <= stars ? '#f59e0b' : 'rgba(255,255,255,0.12)', fill: n <= stars ? '#f59e0b' : 'none' }} />
      ))}
    </div>
  );
}

function WeekRow({ action, index, isLast }: { action: WeeklyAction; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      )}
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-1">
          <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold relative z-10"
            style={{
              background: action.isBlocking ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.12)',
              color: action.isBlocking ? '#ef4444' : '#60a5fa',
              border: action.isBlocking ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(59,130,246,0.20)',
            }}>
            W{action.weekNumber}
          </div>
        </div>

        <div className="flex-1 pb-4">
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-start justify-between gap-2 w-full text-left">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-0.5">
                {action.isBlocking && <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400/70" />}
                <span className="text-sm font-medium text-white/85 leading-snug">{action.action}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/35">{action.deadline}</span>
                <span className="text-[10px] text-white/20">·</span>
                <div className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-white/25" />
                  <span className="text-[10px] text-white/35">{action.timeInvestment}</span>
                </div>
                <span className="text-[10px] text-white/20">·</span>
                <ROIStars rating={action.roiRating} />
              </div>
            </div>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" />
              : <ChevronDown className="w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5" />}
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
                          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-white/25" />
                          <span className="text-xs text-white/60">{sub}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {action.whyNow && (
                    <div className="rounded-lg p-2 flex items-start gap-1.5"
                      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                      <Zap className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400/60" />
                      <p className="text-xs text-white/55 leading-relaxed">
                        <span className="text-amber-400/70 font-medium">Why now: </span>{action.whyNow}
                      </p>
                    </div>
                  )}

                  {action.expectedOutcome && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-400/50" />
                      <p className="text-xs text-white/50 leading-relaxed">
                        <span className="text-emerald-400/60 font-medium">Expected: </span>{action.expectedOutcome}
                      </p>
                    </div>
                  )}

                  {action.evidence && (
                    <p className="text-[11px] text-white/30 italic leading-relaxed">{action.evidence}</p>
                  )}

                  {action.unlocks && action.unlocks.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-white/30">Unlocks:</span>
                      {action.unlocks.map(u => (
                        <span key={u} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.08)', color: 'rgba(16,185,129,0.60)' }}>
                          {u}
                        </span>
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

function MonthSection({ month, isActive, onClick }: { month: MonthPlan; isActive: boolean; onClick: () => void }) {
  return (
    <div>
      <button onClick={onClick}
        className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-left transition-colors"
        style={{
          background: isActive ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.03)',
          border: isActive ? '1px solid rgba(59,130,246,0.22)' : '1px solid rgba(255,255,255,0.06)',
        }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{
              background: isActive ? 'rgba(59,130,246,0.20)' : 'rgba(255,255,255,0.06)',
              color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.40)',
            }}>
            M{month.month}
          </div>
          <div>
            <div className="text-sm font-medium text-white/85">{month.theme}</div>
            <div className="text-xs text-white/35">{month.weeklyActions.length} weekly actions</div>
          </div>
        </div>
        {isActive ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
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
                  <div className="text-xs font-medium text-white/35 uppercase tracking-wide mb-1.5">Month goal</div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-emerald-400/40" />
                    <span className="text-xs text-white/60">{month.milestoneGoal}</span>
                  </div>
                </div>
              )}
              {month.weeklyActions.map((week, i) => (
                <WeekRow key={`w${week.weekNumber}`} action={week} index={i} isLast={i === month.weeklyActions.length - 1} />
              ))}
              {month.goNoGoGate && (
                <div className="mt-2 mb-3 px-3 py-2 rounded-lg text-xs text-white/50 leading-relaxed"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                  <span className="text-amber-400/70 font-medium">Month-end gate: </span>{month.goNoGoGate}
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

  const totalActions = plan.months.reduce((sum, m) => sum + m.weeklyActions.length, 0);
  const totalBlocking = plan.months.reduce((sum, m) => sum + m.weeklyActions.filter(w => w.isBlocking).length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="mb-4">
        <UrgencyHeader mode={plan.urgencyMode} totalMonths={plan.months.length} />

        {plan.planSummary && (
          <p className="mt-2.5 text-xs text-white/50 leading-relaxed">{plan.planSummary}</p>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-center">
            <div className="text-base font-bold text-white/85">{totalActions}</div>
            <div className="text-[10px] text-white/35">total actions</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-white/85">{totalBlocking}</div>
            <div className="text-[10px] text-white/35">critical gates</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-white/85">{plan.quickWins.length}</div>
            <div className="text-[10px] text-white/35">quick wins</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-blue-400">{plan.estimatedJobSearchDuration}</div>
            <div className="text-[10px] text-white/35">est. timeline</div>
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
          <div className="text-xs font-medium text-white/30 uppercase tracking-wide mb-1.5">Critical path (must-dos)</div>
          {plan.criticalPath.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-1">
              <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400/40" />
              <span className="text-xs text-white/40">{item}</span>
            </div>
          ))}
        </div>
      )}

      {plan.planExpiry && (
        <div className="mt-2 text-[10px] text-white/25">
          Re-audit recommended: {plan.planExpiry}
        </div>
      )}
    </motion.div>
  );
};

export default MonthlyActionPlan;
