// MissionBriefCard.tsx — Mission Lifecycle v2.0
//
// Full lifecycle: NEW → ACTIVE → COMPLETED → REPLACED → ARCHIVED
// Dynamic accent color injected once as --mission-accent CSS variable on the
// wrapper — all children reference it via class, zero inline styles per rule.

import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ChevronRight, Zap, Archive, RefreshCw } from 'lucide-react';
import { riskLabel, riskColor } from '../../../lib/riskTokens';
import {
  activateMission,
  getMissionState,
  type MissionState,
} from '../../../services/missionCompletionService';

interface MissionBriefCardProps {
  missionId: string;
  companyName: string;
  score: number;
  urgency: string;
  spine?: string;
  singleBiggestRisk?: string;
  topAction?: string;
  confidencePercent: number;
  missionActionIds?: string[];
  completedActionIds?: Set<string>;
  onRequestNextMission?: () => void;
}

const URGENCY_PROSE: Record<string, string> = {
  CRITICAL: 'critical', HIGH: 'elevated', MODERATE: 'moderate', LOW: 'low',
};

export const MissionBriefCard: React.FC<MissionBriefCardProps> = ({
  missionId,
  companyName,
  score,
  urgency,
  spine,
  singleBiggestRisk,
  topAction,
  confidencePercent,
  missionActionIds = [],
  completedActionIds = new Set(),
  onRequestNextMission,
}) => {
  const accentColor = riskColor(score);
  const tierLabel   = riskLabel(score);
  const prose       = URGENCY_PROSE[urgency] ?? 'moderate';
  const activated   = useRef(false);

  const missionState: MissionState = useMemo(() => getMissionState(missionId), [missionId]);

  const actionsTotal = missionActionIds.length;
  const actionsDone  = missionActionIds.filter(id => completedActionIds.has(id)).length;
  const allActionsDone = actionsTotal > 0 && actionsDone === actionsTotal;

  useEffect(() => {
    if (activated.current) return;
    activated.current = true;
    if (missionState === 'new') activateMission(missionId);
  }, [missionId, missionState]);

  const situationText = spine
    ?? `${companyName} is showing ${prose} risk signals. Your displacement probability index is ${score}/100.`;
  const riskText  = singleBiggestRisk
    ?? `${tierLabel} risk indicators are present — monitor workforce and financial signals closely.`;
  const actionText = topAction
    ?? 'Begin external market positioning and update your professional profile.';

  // ── ARCHIVED ──────────────────────────────────────────────────────────────
  if (missionState === 'archived') {
    return (
      <div className="glass-card flex items-center gap-3 px-4 py-2.5 opacity-40">
        <Archive className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-3)]" />
        <span className="mono-section-label">Mission archived</span>
      </div>
    );
  }

  // ── REPLACED ──────────────────────────────────────────────────────────────
  if (missionState === 'replaced') {
    return (
      <div className="glass-card px-4 py-3 opacity-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="mission-state-badge mission-state-badge--replaced">
            <RefreshCw className="w-2.5 h-2.5" />
            SUPERSEDED
          </span>
        </div>
        <p className="mission-text-secondary">
          A new mission was issued based on updated intelligence.
        </p>
      </div>
    );
  }

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (missionState === 'completed' || allActionsDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, type: 'spring', stiffness: 300, damping: 28 }}
        className="glass-card mission-card-completed px-4 py-4"
      >
        <div className="flex items-start gap-3">
          <div className="intel-chip-icon intel-chip-icon--shield flex-shrink-0 mt-0.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="mission-state-badge mission-state-badge--completed">
                <CheckCircle className="w-2.5 h-2.5" />
                MISSION COMPLETE
              </span>
              <span className="mono-section-label">{confidencePercent}% confidence</span>
            </div>
            <p className="mission-completed-title">All mission actions completed.</p>
            <p className="mission-completed-desc">
              Your intelligence profile has been updated. A new mission path is ready based on
              your current risk trajectory.
            </p>
            {onRequestNextMission && (
              <button type="button" onClick={onRequestNextMission} className="mission-next-btn">
                <Zap className="w-3 h-3" />
                Unlock next mission
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── NEW / ACTIVE — inject accent as CSS var once on wrapper ───────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="glass-card-md mission-card relative overflow-hidden"
      style={{ '--mission-accent': accentColor } as React.CSSProperties}
    >
      <div className="px-4 py-3.5 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="mono-section-label mission-header-accent">AI MISSION BRIEF</span>
            {missionState === 'new'    && <span className="mission-state-badge mission-state-badge--new">NEW</span>}
            {missionState === 'active' && <span className="mission-state-badge mission-state-badge--active">ACTIVE</span>}
          </div>
          <div className="flex items-center gap-2">
            {actionsTotal > 0 && (
              <span className="mono-section-label">{actionsDone}/{actionsTotal} done</span>
            )}
            <span className="mono-section-label">{confidencePercent}% confidence</span>
          </div>
        </div>

        {/* Situation */}
        <div className="mission-brief-row">
          <span className="mission-brief-key">SITUATION</span>
          <p className="mission-text-primary">{situationText}</p>
        </div>
        <div className="mission-brief-divider" />

        {/* Biggest Risk */}
        <div className="mission-brief-row">
          <span className="mission-brief-key">BIGGEST RISK</span>
          <p className="mission-text-secondary">{riskText}</p>
        </div>
        <div className="mission-brief-divider" />

        {/* Priority Action */}
        <div className="mission-brief-row">
          <span className="mission-brief-key">PRIORITY</span>
          <p className="mission-priority-text">{actionText}</p>
        </div>

        {/* Progress bar — shown once some actions are done */}
        {actionsTotal > 0 && actionsDone > 0 && (
          <div className="gradient-bar-track">
            <div
              className="gradient-bar gradient-bar--complete"
              style={{ '--bar-w': `${Math.round((actionsDone / actionsTotal) * 100)}%` } as React.CSSProperties}
            />
          </div>
        )}

      </div>
    </motion.div>
  );
};

export default MissionBriefCard;
