// TimeToSafetyStrip.tsx — Wave 5.1 Time-to-Safety Calculation
//
// PROBLEM: Users see a score of 67 but have no sense of HOW LONG it would take
// to reach a safe zone, or what specific actions would get them there.
//
// SOLUTION: A compact strip below the score ring showing the estimated path
// to MODERATE risk (≤35). Built from scoreSensitivity.levers (already computed
// by scoreSensitivityEngine) — no new engine needed.
//
// Algorithm:
//   1. pointsNeeded  = max(0, currentScore - SAFE_THRESHOLD)
//   2. Take top N levers (by scoreDropIfImproved) until sum ≥ pointsNeeded
//   3. Assign week offsets: lever1=4wk, lever2=8wk, lever3=12wk, etc.
//   4. Show milestones as a horizontal timeline
//   5. Add runway alert when financial runway expires before projected safety
//
// Only renders when currentScore > SAFE_THRESHOLD (35).

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

// ── Types (mirrors scoreSensitivityEngine exports) ───────────────────────────

interface SensitivityLever {
  dimensionLabel: string;
  scoreDropIfImproved: number;
  fastestAction: string;
  currentScore?: number;
}

interface ScoreSensitivityResult {
  levers?: SensitivityLever[];
  summary?: string;
}

interface Props {
  currentScore: number;
  scoreSensitivity?: ScoreSensitivityResult;
  financialRunwayMonths?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SAFE_THRESHOLD = 35;   // MODERATE risk boundary
const WEEK_OFFSETS   = [4, 8, 12, 18]; // cumulative weeks per lever action

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

function truncate(text: string, maxChars = 48): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '…';
}

// ── Milestone interface ───────────────────────────────────────────────────────

interface Milestone {
  week: number;
  scoreAfter: number;
  action: string;
  drop: number;
  isSafetyReached: boolean;
}

function buildMilestones(currentScore: number, levers: SensitivityLever[]): {
  milestones: Milestone[];
  totalWeeks: number;
  reachSafety: boolean;
} {
  const pointsNeeded = Math.max(0, currentScore - SAFE_THRESHOLD);
  const validLevers = levers.filter(l => l.scoreDropIfImproved > 0).slice(0, 4);

  const milestones: Milestone[] = [];
  let running = currentScore;
  let totalDrop = 0;
  let safetyWeek = 0;

  for (let i = 0; i < validLevers.length; i++) {
    const lever = validLevers[i];
    const drop = lever.scoreDropIfImproved;
    running = Math.max(SAFE_THRESHOLD, running - drop);
    totalDrop += drop;
    const week = WEEK_OFFSETS[i] ?? WEEK_OFFSETS[WEEK_OFFSETS.length - 1] + i * 4;
    const reached = running <= SAFE_THRESHOLD;

    milestones.push({
      week,
      scoreAfter: running,
      action: lever.dimensionLabel ?? lever.fastestAction,
      drop,
      isSafetyReached: reached,
    });

    if (reached && safetyWeek === 0) {
      safetyWeek = week;
      break; // Don't show milestones after safety is reached
    }
  }

  // If levers don't add up, extrapolate with constant rate
  if (running > SAFE_THRESHOLD && milestones.length > 0) {
    const lastWeek = milestones[milestones.length - 1].week;
    const remaining = running - SAFE_THRESHOLD;
    const avgDrop = totalDrop / milestones.length; // pts per lever action
    const extraWeeks = Math.ceil((remaining / avgDrop) * 4); // 4 weeks per action cycle
    safetyWeek = lastWeek + extraWeeks;
  } else if (milestones.length === 0) {
    safetyWeek = Math.ceil(pointsNeeded / 1.5); // fallback: 1.5pts/week
  }

  return {
    milestones,
    totalWeeks: safetyWeek || (WEEK_OFFSETS[milestones.length - 1] ?? 12),
    reachSafety: running <= SAFE_THRESHOLD,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export const TimeToSafetyStrip: React.FC<Props> = ({
  currentScore,
  scoreSensitivity,
  financialRunwayMonths,
}) => {
  // Only meaningful when above the safe threshold
  if (currentScore <= SAFE_THRESHOLD) return null;
  const levers = scoreSensitivity?.levers ?? [];
  if (levers.length === 0) return null;

  const { milestones, totalWeeks, reachSafety } = buildMilestones(currentScore, levers);

  // Runway warning: if financial runway (in months) expires before estimated safety
  const runwayWeeks = financialRunwayMonths != null ? financialRunwayMonths * 4.33 : null;
  const runwayAlert = runwayWeeks != null && runwayWeeks < totalWeeks;

  const currentColor = scoreColor(currentScore);
  const safeColor = '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(34,211,238,0.60)' }} />
          <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            PATH TO MODERATE RISK
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black" style={{ color: currentColor }}>{currentScore}</span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
          <span className="text-[10px] font-black" style={{ color: safeColor }}>{SAFE_THRESHOLD}</span>
          <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ~{totalWeeks}wk
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pb-1">
        {/* Progress spine */}
        <div className="relative flex items-stretch gap-0 mb-1">
          {/* Start dot */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
            style={{ background: currentColor, boxShadow: `0 0 6px ${currentColor}55` }}
          />
          {/* Line + milestones */}
          <div className="flex-1 flex flex-col gap-0">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                {/* Connector line */}
                <div className="flex flex-col items-center ml-[-6px]" style={{ width: 12 }}>
                  <div className="w-0.5 flex-1 min-h-[20px]"
                    style={{ background: m.isSafetyReached ? safeColor + '60' : 'rgba(255,255,255,0.10)' }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: m.isSafetyReached ? safeColor : scoreColor(m.scoreAfter),
                      border: '1.5px solid rgba(0,0,0,0.4)',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Wk {m.week}
                    </span>
                    <span className="text-[11px] font-black" style={{ color: m.isSafetyReached ? safeColor : scoreColor(m.scoreAfter) }}>
                      {m.scoreAfter}
                    </span>
                    <span className="text-[10px]" style={{ color: '#10b981aa' }}>
                      −{m.drop.toFixed(1)} pts
                    </span>
                    {m.isSafetyReached && (
                      <span className="flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.30)' }}>
                        <CheckCircle2 className="w-2.5 h-2.5" />MODERATE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    {truncate(m.action, 52)}
                  </p>
                </div>
              </div>
            ))}

            {/* Projected safety if not yet reached in milestones */}
            {!reachSafety && (
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center ml-[-6px]" style={{ width: 12 }}>
                  <div className="w-0.5 min-h-[16px]" style={{ background: 'rgba(16,185,129,0.30)' }} />
                  <div className="w-2.5 h-2.5 rounded-full border-2"
                    style={{ borderColor: '#10b981', background: 'transparent' }} />
                </div>
                <div className="flex-1 pb-2 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>Wk {totalWeeks}*</span>
                    <span className="text-[11px] font-black" style={{ color: '#10b981' }}>{SAFE_THRESHOLD}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                      PROJECTED
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    *Extrapolated from action pace
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Runway alert */}
      {runwayAlert && (
        <div
          className="mx-3 mb-3 rounded-xl flex items-start gap-2 px-3 py-2"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f97316' }} />
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span className="font-semibold" style={{ color: '#f97316' }}>Runway alert: </span>
            Your {financialRunwayMonths}mo financial runway may expire before you reach safety (est. {totalWeeks} weeks). Escalate search intensity now.
          </p>
        </div>
      )}

      {/* Footer note */}
      <div className="px-4 pb-3">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Based on your top score levers. Assumes one major action completed per 4-week cycle.
        </p>
      </div>
    </motion.div>
  );
};

export default TimeToSafetyStrip;
