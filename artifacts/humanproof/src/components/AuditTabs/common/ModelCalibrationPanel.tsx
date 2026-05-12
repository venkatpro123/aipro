// ModelCalibrationPanel.tsx — v13.0
// Engine accuracy and trust display. Shown in TransparencyTab.

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Info, CheckCircle, AlertCircle, Activity } from "lucide-react";
import type { ModelCalibrationResult, TierAccuracyRecord } from "@/services/modelCalibrationEngine";

interface ModelCalibrationPanelProps {
  calibration: ModelCalibrationResult;
}

const TRUST_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  HIGH:                { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
  MODERATE:            { color: '#00d4e0', bg: 'rgba(0,212,224,0.08)',   border: 'rgba(0,212,224,0.22)' },
  BUILDING:            { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  RESEARCH_GROUNDED:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
};

const TIER_ACCURACY_COLOR = (acc: number) =>
  acc >= 0.70 ? '#10b981' : acc >= 0.55 ? '#f59e0b' : '#f97316';

const CONFIDENCE_OPACITY: Record<string, number> = { HIGH: 1.0, MEDIUM: 0.75, LOW: 0.5 };

const TierRow: React.FC<{ record: TierAccuracyRecord; index: number }> = ({ record, index }) => {
  const accPct = Math.round(record.blendedAccuracy * 100);
  const barColor = TIER_ACCURACY_COLOR(record.blendedAccuracy);
  const opacity = CONFIDENCE_OPACITY[record.confidenceLevel];

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3"
      style={{ opacity }}
    >
      <span className="text-xs w-20 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {record.tier}
      </span>
      <span className="text-[10px] w-12 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {record.scoreRange}
      </span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${accPct}%` }}
          transition={{ duration: 0.5, delay: index * 0.07 }}
        />
      </div>
      <span className="text-xs w-8 text-right font-semibold flex-shrink-0" style={{ color: barColor }}>
        {accPct}%
      </span>
      <span className="text-[10px] w-6 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
        {record.confidenceLevel[0]}
      </span>
    </motion.div>
  );
};

const ModelCalibrationPanel: React.FC<ModelCalibrationPanelProps> = ({ calibration }) => {
  const [showSignals, setShowSignals] = useState(false);
  const [showCaveats, setShowCaveats] = useState(false);
  const trust = TRUST_COLORS[calibration.trustLevel] ?? TRUST_COLORS.RESEARCH_GROUNDED;

  return (
    <div className="rounded-2xl p-4" style={{ background: trust.bg, border: `1px solid ${trust.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: trust.color }} />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>Engine Accuracy & Trust</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black" style={{ color: trust.color }}>
            {calibration.overallAccuracyPct}
          </span>
          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${trust.color}15`, color: trust.color, border: `1px solid ${trust.color}28` }}>
            {calibration.trustLevel.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Trust narrative */}
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {calibration.trustNarrative}
      </p>

      {/* Accuracy by tier */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
            ACCURACY BY RISK TIER
          </p>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            H=High/M=Medium/L=Low confidence
          </span>
        </div>
        <div className="space-y-2">
          {calibration.accuracyByTier.map((record, i) => (
            <TierRow key={record.tier} record={record} index={i} />
          ))}
        </div>
      </div>

      {/* Sample size note */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3 h-3 opacity-40" />
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {calibration.totalOutcomesTracked > 0
            ? `${calibration.totalOutcomesTracked} confirmed outcomes tracked · Source: ${calibration.dataSource}`
            : 'No outcome data yet · Using research priors (Cascio 2002, Datta 2010, Zatzick 2009)'
          }
        </span>
      </div>

      {/* Signal contributions toggle */}
      <button
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg mb-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={() => setShowSignals(s => !s)}
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Signal contributions to accuracy</span>
        <Info className="w-3.5 h-3.5 opacity-40" />
      </button>
      {showSignals && (
        <div className="space-y-2 mb-3 px-1">
          {calibration.signalContributions.map((sig, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0`}
                style={{ background: sig.availableForCurrentAudit ? '#10b981' : '#6b7280' }} />
              <div>
                <span className="text-xs font-medium" style={{ color: sig.availableForCurrentAudit ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)' }}>
                  {sig.signalName}
                </span>
                <span className="text-[10px] ml-2" style={{ color: trust.color }}>
                  +{Math.round(sig.accuracyContribution * 100)}%
                </span>
                {!sig.availableForCurrentAudit && (
                  <span className="text-[10px] ml-1 opacity-40">(not provided)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Caveats toggle */}
      <button
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={() => setShowCaveats(s => !s)}
      >
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Accuracy limitations & caveats</span>
        <AlertCircle className="w-3.5 h-3.5 opacity-40" />
      </button>
      {showCaveats && (
        <ul className="mt-2 space-y-1.5 px-1">
          {calibration.calibrationCaveats.map((c, i) => (
            <li key={i} className="flex gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <span className="opacity-40">·</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Help improve */}
      <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="font-bold" style={{ color: trust.color }}>Help improve accuracy: </span>
          {calibration.howToImproveAccuracy}
        </p>
      </div>

      <p className="text-[10px] mt-2 text-right" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Engine {calibration.engineVersion} · Calibrated {calibration.lastCalibrationDate}
      </p>
    </div>
  );
};

export default ModelCalibrationPanel;
