// GlassdoorVelocityPanel.tsx — v16.0
// Glassdoor CEO approval velocity + review volume acceleration signals.

import React from "react";
import { motion } from "framer-motion";
import { MessageSquare, TrendingDown, AlertTriangle, Clock, Zap } from "lucide-react";
import type { GlassdoorVelocityResult, CEOApprovalRiskTier } from "../../../services/glassdoorVelocityEngine";

interface GlassdoorVelocityPanelProps {
  glassdoorVelocity: GlassdoorVelocityResult | undefined;
}

const TIER_CONFIG: Record<Exclude<CEOApprovalRiskTier, 'UNKNOWN'>, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.09)',   border: 'rgba(239,68,68,0.24)',   label: 'CRITICAL'  },
  HIGH:     { color: 'var(--color-orange-text)', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)',  label: 'HIGH'      },
  MODERATE: { color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)',  label: 'MODERATE'  },
  LOW:      { color: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)',  label: 'LOW'       },
};

const GlassdoorVelocityPanel: React.FC<GlassdoorVelocityPanelProps> = ({ glassdoorVelocity }) => {
  if (!glassdoorVelocity) return null;
  if (glassdoorVelocity.ceoApprovalRiskTier === 'UNKNOWN') return null;

  const tier = glassdoorVelocity.ceoApprovalRiskTier as Exclude<CEOApprovalRiskTier, 'UNKNOWN'>;
  const { color, bg, border, label } = TIER_CONFIG[tier];

  const velocitySign = glassdoorVelocity.ceoApprovalVelocity !== null && glassdoorVelocity.ceoApprovalVelocity > 0 ? '+' : '';
  const velocityColor = glassdoorVelocity.ceoApprovalVelocity !== null
    ? (glassdoorVelocity.ceoApprovalVelocity < -2 ? 'var(--color-red-text)'
      : glassdoorVelocity.ceoApprovalVelocity < 0 ? 'var(--color-orange-text)'
      : 'var(--color-emerald-text)')
    : 'var(--alpha-text-45)';

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
          <MessageSquare className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>
            Glassdoor Velocity Intelligence
          </span>
        </div>
        <span
          className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
        >
          {label}
        </span>
      </div>

      {/* CEO approval metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {glassdoorVelocity.ceoApprovalCurrent !== null && (
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'var(--alpha-bg-04)' }}>
            <div className="text-sm font-black" style={{
              color: glassdoorVelocity.ceoApprovalCurrent < 40 ? 'var(--color-red-text)'
                : glassdoorVelocity.ceoApprovalCurrent < 55 ? 'var(--color-orange-text)'
                : 'var(--color-emerald-text)'
            }}>
              {glassdoorVelocity.ceoApprovalCurrent}%
            </div>
            <div className="text-[10px] opacity-45 mt-0.5">Current CEO Approval</div>
          </div>
        )}
        {glassdoorVelocity.ceoApprovalVelocity !== null && (
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'var(--alpha-bg-04)' }}>
            <div className="flex items-center justify-center gap-1">
              <TrendingDown
                className="w-3.5 h-3.5"
                style={{
                  color: velocityColor,
                  transform: glassdoorVelocity.ceoApprovalVelocity > 0 ? 'rotate(180deg)' : undefined,
                }}
              />
              <span className="text-sm font-black" style={{ color: velocityColor }}>
                {velocitySign}{glassdoorVelocity.ceoApprovalVelocity.toFixed(1)}
              </span>
            </div>
            <div className="text-[10px] opacity-45 mt-0.5">pp/month velocity</div>
          </div>
        )}
      </div>

      {/* Early warning banner */}
      {glassdoorVelocity.earlyWarningActive && (
        <div
          className="flex items-start gap-2 rounded-lg p-2.5 mb-2.5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-red-text)' }} />
          <p className="text-[10px] leading-relaxed font-semibold" style={{ color: 'rgba(239,68,68,0.90)' }}>
            Early warning active — sentiment deterioration meets layoff-precursor threshold
          </p>
        </div>
      )}

      {/* Review volume spike badge */}
      {glassdoorVelocity.reviewVolumeSpike && (
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2.5"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.22)' }}
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-orange-text)' }} />
          <span className="text-[10px] font-semibold" style={{ color: 'var(--color-orange-text)' }}>
            Review volume spike detected — {glassdoorVelocity.reviewVolumeSpikeNote}
          </span>
        </div>
      )}

      {/* Lead time estimate */}
      {glassdoorVelocity.leadTimeEstimateDays !== null && (
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 mb-2.5"
          style={{ background: 'var(--alpha-bg-04)' }}>
          <Clock className="w-3 h-3 flex-shrink-0" style={{ color }} />
          <span className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
            Est. <span className="font-bold" style={{ color }}>{glassdoorVelocity.leadTimeEstimateDays} days</span> lead time
          </span>
        </div>
      )}

      {/* CEO approval note */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
        {glassdoorVelocity.ceoApprovalNote}
      </p>
    </motion.div>
  );
};

export default GlassdoorVelocityPanel;
