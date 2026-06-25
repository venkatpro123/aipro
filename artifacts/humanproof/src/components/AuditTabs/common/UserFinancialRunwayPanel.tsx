// UserFinancialRunwayPanel.tsx — v16.0
// User financial runway assessment — situation classification, constraints, strengths.

import React from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import type { FinancialRunwayAssessment, RunwaySituation } from "../../../services/financialRunwayService";
import { FinancialRunwayIllustration } from "../../illustrations/AdditionalIllustrations";

interface UserFinancialRunwayPanelProps {
  userFinancialRunway: FinancialRunwayAssessment | undefined;
}

const SITUATION_CONFIG: Record<Exclude<RunwaySituation, 'unknown'>, {
  label: string; color: string; bg: string; border: string
}> = {
  critical:    { label: 'CRITICAL',    color: '#ef4444', bg: 'rgba(239,68,68,0.09)',    border: 'rgba(239,68,68,0.24)'    },
  tight:       { label: 'TIGHT',       color: '#f97316', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.22)'   },
  moderate:    { label: 'MODERATE',    color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.22)'   },
  comfortable: { label: 'COMFORTABLE', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.22)'   },
  secure:      { label: 'SECURE',      color: '#10b981', bg: 'rgba(16,185,129,0.07)',   border: 'rgba(16,185,129,0.20)'   },
};

const URGENCY_CONFIG = {
  IMMEDIATE: { color: '#ef4444', bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.28)' },
  HIGH:      { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.26)' },
  MODERATE:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' },
  LOW:       { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)' },
};

const UserFinancialRunwayPanel: React.FC<UserFinancialRunwayPanelProps> = ({ userFinancialRunway }) => {
  if (!userFinancialRunway) return null;
  if (userFinancialRunway.situation === 'unknown') return null;

  const situation = userFinancialRunway.situation as Exclude<RunwaySituation, 'unknown'>;
  const { label, color, bg, border } = SITUATION_CONFIG[situation];
  const urgencyConf = URGENCY_CONFIG[userFinancialRunway.urgencyLevel];

  const showMultiplier = userFinancialRunway.actionUrgencyMultiplier !== 1.0;
  const multiplierAccelerated = userFinancialRunway.actionUrgencyMultiplier > 1.0;

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
          <Shield className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Your Financial Runway
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: urgencyConf.bg, color: urgencyConf.color, border: `1px solid ${urgencyConf.border}` }}
          >
            {userFinancialRunway.urgencyLevel}
          </span>
          <span
            className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Runway months — prominently displayed */}
      {userFinancialRunway.runwayMonths !== null && (
        <div
          className="rounded-xl p-3 mb-3 flex items-center gap-3"
          style={{ background: `${color}12`, border: `1px solid ${color}24` }}
        >
          <FinancialRunwayIllustration size={44} className="flex-shrink-0 opacity-80" />
          <div className="flex-1 text-center">
            <div className="text-2xl font-black" style={{ color }}>
              {userFinancialRunway.runwayMonths}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--alpha-text-50)' }}>
              months runway
            </div>
          </div>
        </div>
      )}

      {/* Action urgency multiplier — only when != 1.0 */}
      {showMultiplier && (
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-3"
          style={{
            background: multiplierAccelerated ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            border: `1px solid ${multiplierAccelerated ? 'rgba(239,68,68,0.20)' : 'rgba(16,185,129,0.20)'}`,
          }}
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: multiplierAccelerated ? '#ef4444' : '#10b981' }} />
          <span className="text-[11px] font-semibold" style={{ color: multiplierAccelerated ? '#ef4444' : '#10b981' }}>
            Actions {multiplierAccelerated ? 'accelerated' : 'relaxed'}{' '}
            <span className="font-black">{userFinancialRunway.actionUrgencyMultiplier.toFixed(2)}×</span>
          </span>
        </div>
      )}

      {/* Key constraints */}
      {userFinancialRunway.keyConstraints.length > 0 && (
        <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: '#f97316' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>KEY CONSTRAINTS</span>
          </div>
          <div className="space-y-1">
            {userFinancialRunway.keyConstraints.map((constraint, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#f97316' }} />
                <span className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
                  {constraint}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key strengths */}
      {userFinancialRunway.keyStrengths.length > 0 && (
        <div className="rounded-lg p-2.5 mb-2.5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.16)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#10b981' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-50)' }}>KEY STRENGTHS</span>
          </div>
          <div className="space-y-1">
            {userFinancialRunway.keyStrengths.map((strength, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#10b981' }} />
                <span className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
                  {strength}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Situation summary */}
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
        {userFinancialRunway.situationSummary}
      </p>
    </motion.div>
  );
};

export default UserFinancialRunwayPanel;
