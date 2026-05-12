// LeadershipTransitionPanel.tsx — v14.0
// CEO tenure risk, departure clustering, CFO signal.

import React from "react";
import { motion } from "framer-motion";
import { Users, AlertTriangle, UserMinus, TrendingDown } from "lucide-react";
import type { LeadershipTransitionResult } from "@/services/leadershipTransitionRiskEngine";

interface LeadershipTransitionPanelProps {
  leadershipRisk: LeadershipTransitionResult;
}

const SCORE_COLOR = (score: number) =>
  score >= 70 ? '#ef4444'
  : score >= 50 ? '#f97316'
  : score >= 30 ? '#f59e0b'
  : '#10b981';

const LeadershipTransitionPanel: React.FC<LeadershipTransitionPanelProps> = ({ leadershipRisk }) => {
  const score = leadershipRisk.leadershipRiskScore;
  const mainColor = SCORE_COLOR(score);
  const bgColor = score >= 70 ? 'rgba(239,68,68,0.08)'
    : score >= 50 ? 'rgba(249,115,22,0.08)'
    : score >= 30 ? 'rgba(245,158,11,0.08)'
    : 'rgba(16,185,129,0.06)';
  const borderColor = score >= 70 ? 'rgba(239,68,68,0.22)'
    : score >= 50 ? 'rgba(249,115,22,0.22)'
    : score >= 30 ? 'rgba(245,158,11,0.22)'
    : 'rgba(16,185,129,0.18)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: mainColor }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Leadership Stability</span>
        </div>
        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${mainColor}18`, color: mainColor, border: `1px solid ${mainColor}30` }}>
          {score}/100
        </span>
      </div>

      {/* Risk label */}
      <p className="text-[11px] font-semibold mb-3" style={{ color: mainColor }}>
        {leadershipRisk.leadershipRiskLabel}
      </p>

      {/* Signals grid */}
      <div className="space-y-2 mb-3">
        {/* CEO tenure */}
        <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>CEO TENURE RISK</span>
            <span className="text-[10px] font-bold" style={{ color: SCORE_COLOR(leadershipRisk.ceoTenureRiskScore) }}>
              {leadershipRisk.ceoTenureRisk}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
            {leadershipRisk.ceoTenureNote}
          </p>
        </div>

        {/* CFO signal */}
        {leadershipRisk.cfoSignal !== 'UNKNOWN' && (
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.60)' }}>CFO SIGNAL</span>
              <span className="text-[10px] font-bold" style={{ color: leadershipRisk.cfoSignal === 'DEPARTED' ? '#ef4444' : 'rgba(255,255,255,0.70)' }}>
                {leadershipRisk.cfoSignal.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {leadershipRisk.cfoSignalNote}
            </p>
          </div>
        )}

        {/* VP clustering */}
        {leadershipRisk.vpClusteringAlert !== 'UNKNOWN' && leadershipRisk.vpClusteringAlert !== 'NONE' && (
          <div className="rounded-lg p-2.5"
            style={{ background: leadershipRisk.vpClusteringAlert === 'ACTIVE' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', border: leadershipRisk.vpClusteringAlert === 'ACTIVE' ? '1px solid rgba(239,68,68,0.20)' : 'none' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <UserMinus className="w-3 h-3" style={{ color: leadershipRisk.vpClusteringAlert === 'ACTIVE' ? '#ef4444' : '#f59e0b' }} />
              <span className="text-[10px] font-semibold" style={{ color: leadershipRisk.vpClusteringAlert === 'ACTIVE' ? '#ef4444' : 'rgba(255,255,255,0.60)' }}>
                VP DEPARTURE CLUSTER — {leadershipRisk.vpClusteringAlert}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {leadershipRisk.vpClusteringNote}
            </p>
          </div>
        )}
      </div>

      {/* Activist investor flag */}
      {leadershipRisk.hasActivistInvestor && (
        <div className="flex items-start gap-2 rounded-lg p-2.5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(245,158,11,0.85)' }}>
            {leadershipRisk.activistInvestorNote}
          </p>
        </div>
      )}

      {/* Stability factors */}
      {leadershipRisk.leadershipStabilityFactors.length > 0 && score < 40 && (
        <div className="mt-2.5">
          <div className="text-[10px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>STABILITY FACTORS</div>
          <div className="space-y-0.5">
            {leadershipRisk.leadershipStabilityFactors.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.50)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LeadershipTransitionPanel;
