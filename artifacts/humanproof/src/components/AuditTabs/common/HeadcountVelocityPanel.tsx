// HeadcountVelocityPanel.tsx — v14.0
// Contractor ratio trend, headcount direction, job posting velocity.

import React from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingDown, AlertCircle, Users } from "lucide-react";
import type { HeadcountVelocityResult, HeadcountTrend, PostingVelocity } from "@/services/headcountVelocityEngine";

interface HeadcountVelocityPanelProps {
  headcount: HeadcountVelocityResult;
}

const SCORE_BG = (score: number) =>
  score >= 70 ? { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.22)',   text: '#ef4444' }
  : score >= 50 ? { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)', text: '#f97316' }
  : score >= 30 ? { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', text: '#f59e0b' }
  : { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)',              text: '#10b981' };

const TREND_COLOR: Record<HeadcountTrend, string> = {
  GROWING: '#10b981', STABLE: '#f59e0b', DECLINING: '#f97316',
  DECLINING_SHARPLY: '#ef4444', UNKNOWN: 'rgba(255,255,255,0.40)',
};

const POSTING_COLOR: Record<PostingVelocity, string> = {
  ACCELERATING: '#10b981', STABLE: '#f59e0b', DECELERATING: '#f97316',
  FROZEN: '#ef4444', UNKNOWN: 'rgba(255,255,255,0.40)',
};

const HeadcountVelocityPanel: React.FC<HeadcountVelocityPanelProps> = ({ headcount }) => {
  const { bg, border, text } = SCORE_BG(headcount.headcountRiskScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4" style={{ color: text }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>Headcount Velocity</span>
        </div>
        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${text}18`, color: text, border: `1px solid ${text}30` }}>
          {headcount.headcountRiskScore}/100
        </span>
      </div>

      {/* Risk label */}
      <p className="text-[11px] font-semibold mb-3" style={{ color: text }}>
        {headcount.headcountRiskLabel}
      </p>

      {/* 3-signal row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[11px] font-bold" style={{ color: TREND_COLOR[headcount.headcountTrend] }}>
            {headcount.headcountTrend.replace('_', ' ')}
          </div>
          <div className="text-[10px] opacity-40 mt-0.5">Headcount</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[11px] font-bold" style={{ color: POSTING_COLOR[headcount.postingVelocity] }}>
            {headcount.postingVelocity}
          </div>
          <div className="text-[10px] opacity-40 mt-0.5">Postings</div>
        </div>
        <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-[11px] font-bold" style={{
            color: headcount.contractorRatioRisk === 'HIGH' ? '#ef4444'
              : headcount.contractorRatioRisk === 'MODERATE' ? '#f59e0b' : '#10b981',
          }}>
            {headcount.contractorRatioRisk}
          </div>
          <div className="text-[10px] opacity-40 mt-0.5">Contractor Risk</div>
        </div>
      </div>

      {/* Headcount note */}
      <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="w-3 h-3 flex-shrink-0" style={{ color: TREND_COLOR[headcount.headcountTrend] }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-55)' }}>Headcount Signal</span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
          {headcount.headcountNote}
        </p>
      </div>

      {/* Contractor note */}
      {headcount.contractorRatioRisk !== 'UNKNOWN' && (
        <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
            {headcount.contractorNote}
          </p>
        </div>
      )}

      {/* Early warning signals */}
      {headcount.earlyWarningSignals.length > 0 && (
        <div>
          <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--alpha-text-35)' }}>
            EARLY WARNING SIGNALS
            {headcount.estimatedLayoffLeadTimeDays && (
              <span style={{ color: '#f59e0b' }}> — ~{headcount.estimatedLayoffLeadTimeDays} days lead time</span>
            )}
          </div>
          <div className="space-y-1">
            {headcount.earlyWarningSignals.map((sig, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#f97316' }} />
                <span className="text-[10px]" style={{ color: 'var(--alpha-text-50)' }}>{sig}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Net momentum */}
      {headcount.netHeadcountMomentum !== 'UNKNOWN' && (
        <div className="flex items-center gap-2 mt-2.5 rounded-lg p-2"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <TrendingDown className="w-3 h-3 flex-shrink-0" style={{
            color: headcount.netHeadcountMomentum === 'NEGATIVE' ? '#ef4444' : '#10b981',
            transform: headcount.netHeadcountMomentum === 'POSITIVE' ? 'rotate(180deg)' : undefined,
          }} />
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-50)' }}>
            {headcount.netHeadcountNote}
          </p>
        </div>
      )}

      {/* Audit v35: provenance disclosure — show what live data actually fed
          the result vs which fields fell back to defaults. */}
      {headcount.isHeuristic ? (
        <div className="flex items-center gap-1.5 mt-2.5 px-2 py-1 rounded-md" style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
        }}>
          <span className="text-[10px]" style={{ color: 'rgba(245,158,11,0.85)' }}>
            ⚠ No live workforce data — neutral baseline shown
          </span>
        </div>
      ) : headcount.inputsProvided && headcount.inputsProvided.length < 4 ? (
        <p className="text-[10px] mt-2.5" style={{ color: 'var(--alpha-text-30)' }}>
          Based on {headcount.inputsProvided.length} of 7 input fields ·
          missing fields default to neutral
        </p>
      ) : null}
    </motion.div>
  );
};

export default HeadcountVelocityPanel;
