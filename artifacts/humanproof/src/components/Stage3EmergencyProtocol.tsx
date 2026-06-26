// Stage3EmergencyProtocol.tsx
// The 6-week crisis protocol for Stage 3 collapse conditions.
// "Treat as active emergency" is correct but useless without a specific plan.
// This component gives the user exactly what to do, week by week.
// Renders in OverviewTab when collapseStage === 3.

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle, Circle, ChevronDown, ChevronUp,
  DollarSign, UserCheck, Send, TrendingUp,
} from "lucide-react";
import type { FinancialProfile } from "../services/financialContextService";

interface WeekAction {
  id: string;
  text: string;
  critical: boolean; // must-do vs nice-to-have
}

interface WeekPlan {
  week: string;
  title: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  actions: WeekAction[];
  milestone: string;
}

interface Props {
  companyName: string;
  roleKey: string;
  score: number;
  financialProfile?: FinancialProfile | null;
}

const STORAGE_KEY_PREFIX = "hp_stage3_checklist_";

function buildWeekPlan(companyName: string, _roleKey: string, score: number, fp: FinancialProfile | null): WeekPlan[] {
  const hasRunway     = fp?.emergencyRunway && fp.emergencyRunway !== "Unknown";
  const isConservative = fp?.riskAppetite === "conservative";
  const isCriticalRunway = fp?.runwayTier === "CRITICAL";
  // Conservative financial profile = explicitly conservative OR runway is critically short
  const needsConservativeAdaptation = isConservative || isCriticalRunway;

  // Week 1 actions — financial preparation
  // Conservative adaptation is prepended as the FIRST critical action when applicable.
  // Spec: "Emergency fund is critically low — do NOT resign under any circumstances.
  //        Job search and emergency fund building are simultaneous Week 1 priorities."
  const week1Actions: WeekAction[] = [];

  if (needsConservativeAdaptation) {
    week1Actions.push({
      id: "w1-0",
      text: hasRunway
        ? `Emergency fund is critically low (${fp!.emergencyRunway} runway) — do NOT resign under any circumstances. Job search and emergency fund building are simultaneous Week 1 priorities. Every rupee saved this week extends the window.`
        : "Emergency fund is critically low — do NOT resign under any circumstances. Job search and emergency fund building are simultaneous Week 1 priorities.",
      critical: true,
    });
  }

  week1Actions.push(
    {
      id: "w1-1",
      text: "Calculate your exact monthly burn rate — rent, food, EMIs, subscriptions. Write it down. This number determines how much time you have.",
      critical: true,
    },
    {
      id: "w1-2",
      text: hasRunway
        ? `Your current runway: ${fp!.emergencyRunway}. Extend to at least 3 months if possible — cancel non-essential subscriptions today. OTT, gym, unused SaaS tools first.`
        : "Audit your savings: how many months of expenses can you cover? Target minimum 3 months — cancel non-essentials today to extend runway.",
      critical: true,
    },
    {
      id: "w1-3",
      text: needsConservativeAdaptation
        ? "Do NOT resign. Do NOT tell colleagues. Do NOT make any large purchases or financial commitments until you have an offer in hand."
        : "Do NOT resign yet. Do NOT tell colleagues. Do NOT make large purchases.",
      critical: true,
    },
    {
      id: "w1-4",
      text: "Notify one trusted person — partner, close family member, or mentor — about the situation. They need to know for financial planning. No one else.",
      critical: false,
    },
  );

  return [
    {
      week: "Week 1",
      title: "Financial Preparation",
      Icon: DollarSign,
      color: 'var(--color-red-text)',
      milestone: needsConservativeAdaptation
        ? "Emergency fund plan documented. No resignation under any circumstances."
        : "Emergency fund documented. Monthly burn calculated. One person notified.",
      actions: week1Actions,
    },
    {
      week: "Week 2",
      title: "Profile Activation",
      Icon: UserCheck,
      color: 'var(--color-orange-text)',
      milestone: "CV with impact bullets ready. 5 warm outreach emails sent.",
      actions: [
        {
          id: "w2-1",
          text: 'Update your CV: every role needs 2–3 impact bullets in this exact format: "I did X, which resulted in Y (quantified outcome)." No numbers = invisible to ATS and recruiters. Add metrics even if approximate.',
          critical: true,
        },
        {
          id: "w2-2",
          text: 'LinkedIn: update your headline and "About" section. Enable "Open to Work" under Career Interests — set visibility to Hidden from current employer only. Do not make it public.',
          critical: true,
        },
        {
          id: "w2-3",
          text: 'Email 5 warm professional contacts this week — NOT asking for jobs. Message template: "Reconnecting — I\'m quietly exploring options in [area]. Would love a 15-minute catch-up." Warm contacts have 4× the reply rate of cold ones.',
          critical: true,
        },
        {
          id: "w2-4",
          text: "Identify 3 specific target companies and the exact role title you are targeting at each. Specificity is a competitive advantage — it guides every network conversation in weeks 3–4.",
          critical: false,
        },
      ],
    },
    {
      week: "Weeks 3–4",
      title: "Parallel Pursuit",
      Icon: Send,
      color: 'var(--color-amber500-text)',
      milestone: "6+ targeted applications submitted. First interview scheduled.",
      actions: [
        {
          id: "w3-1",
          text: "3 targeted applications per week — not more. Quality over volume. Customise each cover letter to the specific role. 3 quality applications outperform 30 spray-and-pray submissions in interview conversion.",
          critical: true,
        },
        {
          id: "w3-2",
          text: "1 informational conversation per week with someone at a target company. This is NOT a job interview — ask about the work, the team, the challenges. Informational interviews convert to referrals at 3× the rate of cold applications.",
          critical: true,
        },
        {
          id: "w3-3",
          text: "Prepare 3 STAR-format stories (Situation, Task, Action, Result) from your most impactful work. Behavioral interviews use these at 90%+ of companies. Write them out; don't improvise in the room.",
          critical: true,
        },
        {
          id: "w3-4",
          text: isConservative
            ? "Complete one free micro-certification directly relevant to your target role this week (DeepLearning.AI, Google Analytics, HubSpot, AWS free tier — all free). Demonstrates forward motion to interviewers."
            : "Complete one micro-certification relevant to your target role (max 2 weeks, max ₹3,000). Tangible signal of transition intent for interviewers.",
          critical: false,
        },
      ],
    },
    {
      week: "Weeks 5–6",
      title: "Consolidation",
      Icon: TrendingUp,
      color: 'var(--color-emerald-text)',
      milestone: "Offer in hand OR 3+ active conversations. Pipeline expanding if needed.",
      actions: [
        {
          id: "w5-1",
          text: "Follow up on every application that has been silent for 7+ days: one sentence on LinkedIn or email — 'Following up on my application for [role] — happy to share additional context if useful.' Most rejections are silent; following up surfaces 20–30% of hidden opportunities.",
          critical: true,
        },
        {
          id: "w5-2",
          text: "If you have an offer: do NOT accept the first number. Counter with your target + 10–15%. The worst outcome is they say no and revert to the original number. Negotiating is expected — not negotiating is leaving money on the table.",
          critical: true,
        },
        {
          id: "w5-3",
          text: `If no offer yet — expand pipeline: add 2 more target companies, consider one role level below your current (senior → mid-senior is recoverable), and increase outreach to 8 contacts this week instead of 5.`,
          critical: true,
        },
        {
          id: "w5-4",
          text: `Review your notice period obligations at ${companyName}. Your exit timeline is a negotiating asset: if you can start in 2 weeks instead of 60 days, say so — it is a real differentiator for urgent roles.`,
          critical: false,
        },
        {
          id: "w5-5",
          text: score >= 80
            ? "Score is still elevated after 6 weeks of this protocol — contact a career coach with outplacement experience. This is a targeted resource investment, not a defeat. A 1-session coach can unlock referrals and preparation gaps you cannot see yourself."
            : "If no offer by end of week 6, reassess your target role and company list — the market may be giving you feedback about positioning that a coach or trusted peer can surface.",
          critical: false,
        },
      ],
    },
  ];
}

export const Stage3EmergencyProtocol: React.FC<Props> = ({
  companyName,
  roleKey,
  score,
  financialProfile,
}) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${companyName.toLowerCase().replace(/\s+/g, "_")}`;
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [expandedWeek, setExpandedWeek] = useState<string | null>("Week 1");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompleted(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [storageKey]);

  const toggleAction = (id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  };

  const weeks = useMemo(
    () => buildWeekPlan(companyName, roleKey, score, financialProfile ?? null),
    [companyName, roleKey, score, financialProfile],
  );

  const totalActions = weeks.reduce((s, w) => s + w.actions.length, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const pct = Math.round((completedCount / totalActions) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden border border-red-500/40"
      style={{ background: "rgba(239,68,68,0.06)" }}
    >
      {/* Header */}
      <div className="p-5 border-b border-red-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/15 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-red-400 uppercase tracking-widest mb-1">
              Stage 3 — 6-Week Emergency Protocol
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {companyName} shows imminent collapse signals. Generic advice fails at Stage 3.
              This protocol tells you exactly what to do, week by week.
              Complete in order — sequence matters.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-[var(--alpha-bg-05)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-emerald-400"
              style={{ boxShadow: "0 0 8px rgba(52,211,153,0.5)" }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
            {completedCount}/{totalActions} actions · {pct}%
          </span>
        </div>
      </div>

      {/* Week cards */}
      <div className="divide-y divide-[var(--alpha-bg-05)]">
        {weeks.map((week) => {
          const isExpanded = expandedWeek === week.week;
          const weekCompleted = week.actions.filter(a => completed[a.id]).length;
          const weekTotal = week.actions.length;
          const weekDone = weekCompleted === weekTotal;
          const Icon = week.Icon;

          return (
            <div key={week.week}>
              <button
                onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
                className="w-full flex items-center gap-3 p-4 hover:bg-[var(--alpha-bg-05)] transition-colors text-left"
              >
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ background: `${week.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: week.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: week.color }}>
                      {week.week}
                    </span>
                    <span className="text-sm font-bold">{week.title}</span>
                    {weekDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{week.milestone}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono text-muted-foreground">{weekCompleted}/{weekTotal}</span>
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {week.actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => toggleAction(action.id)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl text-left hover:bg-[var(--alpha-bg-05)] transition-colors"
                        style={{ borderLeft: action.critical ? `3px solid ${week.color}` : "3px solid transparent" }}
                      >
                        {completed[action.id]
                          ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          : <Circle className="w-4 h-4 text-muted-foreground opacity-40 flex-shrink-0 mt-0.5" />}
                        <span className={`text-xs leading-relaxed ${completed[action.id] ? "line-through opacity-60 text-muted-foreground" : "text-[var(--text-2)]"}`}>
                          {action.text}
                          {action.critical && (
                            <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider"
                              style={{ color: week.color }}>
                              CRITICAL
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-red-500/20">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed opacity-70">
          This protocol is based on observed transition timelines. The 6-week window is an estimate — some transitions take 4 weeks, others 12. The protocol creates the best conditions for the fastest possible outcome.
        </p>
      </div>
    </motion.div>
  );
};

export default Stage3EmergencyProtocol;
