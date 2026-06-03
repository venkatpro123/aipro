// MissionBriefCard.tsx — Beast Mode V3
//
// First thing a user reads on Command Center.
// 3 lines: Situation · Biggest Risk · Priority Action.
// Sources: adaptation.feed.spine, strategySynthesis.singleBiggestRisk,
//          adaptation.feed.primaryMove.action.title.
// Deterministic fallbacks when AI data is unavailable.

import React from 'react';
import { motion } from 'framer-motion';
import { riskLabel, riskColor } from '../../../lib/riskTokens';

interface MissionBriefCardProps {
  companyName: string;
  score: number;
  urgency: string;
  spine?: string;
  singleBiggestRisk?: string;
  topAction?: string;
  confidencePercent: number;
}

const URGENCY_PROSE: Record<string, string> = {
  CRITICAL: 'critical',
  HIGH: 'elevated',
  MODERATE: 'moderate',
  LOW: 'low',
};

export const MissionBriefCard: React.FC<MissionBriefCardProps> = ({
  companyName,
  score,
  urgency,
  spine,
  singleBiggestRisk,
  topAction,
  confidencePercent,
}) => {
  const tierLabel = riskLabel(score);
  const accentColor = riskColor(score);
  const prose = URGENCY_PROSE[urgency] ?? 'moderate';

  const situationText = spine
    ?? `${companyName} is showing ${prose} risk signals. Your displacement probability index is ${score}/100.`;

  const riskText = singleBiggestRisk
    ?? `${tierLabel} risk indicators are present — monitor workforce and financial signals closely.`;

  const actionText = topAction
    ?? 'Begin external market positioning and update your professional profile.';

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div className="px-4 py-3.5 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-black tracking-[0.14em] uppercase"
            style={{ color: accentColor }}
          >
            AI MISSION BRIEF
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.40)',
            }}
          >
            {confidencePercent}% confidence
          </span>
        </div>

        {/* Line 1 — Situation */}
        <div className="flex items-start gap-2.5">
          <span
            className="text-[9px] font-black tracking-[0.12em] uppercase flex-shrink-0 pt-0.5 w-24"
            style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)' }}
          >
            SITUATION
          </span>
          <p
            className="text-[12px] leading-snug flex-1"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {situationText}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* Line 2 — Biggest Risk */}
        <div className="flex items-start gap-2.5">
          <span
            className="text-[9px] font-black tracking-[0.12em] uppercase flex-shrink-0 pt-0.5 w-24"
            style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)' }}
          >
            BIGGEST RISK
          </span>
          <p
            className="text-[12px] leading-snug flex-1"
            style={{ color: 'rgba(255,255,255,0.72)' }}
          >
            {riskText}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* Line 3 — Priority Action */}
        <div className="flex items-start gap-2.5">
          <span
            className="text-[9px] font-black tracking-[0.12em] uppercase flex-shrink-0 pt-0.5 w-24"
            style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono)' }}
          >
            PRIORITY
          </span>
          <p
            className="text-[12px] leading-snug flex-1 font-semibold"
            style={{ color: accentColor + 'dd' }}
          >
            {actionText}
          </p>
        </div>

      </div>
    </motion.div>
  );
};

export default MissionBriefCard;
