// HistoricalAccuracyPanel.tsx — v17.0
// Surfaces community_prediction_accuracy data from modelCalibration (step 28).
// Answers "How accurate have predictions been for scores in your range?"
// Builds user trust through verifiable track-record transparency.

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, TrendingUp } from 'lucide-react';
import type { ModelCalibrationResult, TierAccuracyRecord } from '../../../services/modelCalibrationEngine';

interface Props {
  calibration: ModelCalibrationResult;
  currentScore: number;
}

function tierColor(accuracy: number): string {
  if (accuracy >= 0.70) return 'var(--color-emerald-text)';
  if (accuracy >= 0.55) return '#00d4e0';
  if (accuracy >= 0.40) return 'var(--color-amber500-text)';
  return 'var(--color-orange-text)';
}

function getTierForScore(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'MODERATE';
  return 'LOW';
}

const AccuracyBar: React.FC<{
  record: TierAccuracyRecord;
  isCurrent: boolean;
  index: number;
}> = ({ record, isCurrent, index }) => {
  const accPct = Math.round(record.blendedAccuracy * 100);
  const barColor = tierColor(record.blendedAccuracy);
  const hasData = record.sampleSize > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-3 py-2.5"
      style={{
        borderBottom: '1px solid var(--alpha-bg-06)',
        background: isCurrent ? 'rgba(0,212,224,0.04)' : 'transparent',
        borderRadius: isCurrent ? '8px' : undefined,
        padding: isCurrent ? '8px 10px' : '10px 0',
        margin: isCurrent ? '4px -10px' : undefined,
      }}
    >
      {/* Tier label */}
      <div style={{ width: '72px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: isCurrent ? 'var(--cyan)' : 'var(--alpha-text-45)' }}>
          {record.tier}
          {isCurrent && <span style={{ color: 'var(--cyan)', marginLeft: '4px' }}>◀</span>}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--alpha-text-30)', fontFamily: 'var(--font-mono)' }}>
          {record.scoreRange}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 relative">
        <div className="h-2 rounded-full" style={{ background: 'var(--alpha-bg-06)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${accPct}%` }}
            transition={{ duration: 0.6, delay: index * 0.06 + 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: barColor }}
          />
        </div>
      </div>

      {/* Accuracy % */}
      <div style={{ width: '38px', flexShrink: 0, textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 900, letterSpacing: '-0.02em', color: barColor }}>
          {accPct}%
        </span>
      </div>

      {/* Sample size */}
      <div style={{ width: '64px', flexShrink: 0, textAlign: 'right' }}>
        {hasData ? (
          <span style={{ fontSize: '9px', color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)' }}>
            n={record.sampleSize.toLocaleString()}
          </span>
        ) : (
          <span style={{ fontSize: '9px', color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)', fontStyle: 'italic' }}>
            research
          </span>
        )}
      </div>
    </motion.div>
  );
};

const HistoricalAccuracyPanel: React.FC<Props> = ({ calibration, currentScore }) => {
  const currentTier = getTierForScore(currentScore);
  const currentTierRecord = calibration.accuracyByTier.find(r => r.tier === currentTier);
  const currentAccuracyPct = currentTierRecord
    ? Math.round(currentTierRecord.blendedAccuracy * 100)
    : Math.round(calibration.overallAccuracy * 100);
  const overallPct = Math.round(calibration.overallAccuracy * 100);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--alpha-bg-08)', background: 'var(--alpha-bg-04)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--alpha-bg-08)' }}>
        <Shield className="w-4 h-4" style={{ color: 'var(--cyan)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--cyan)' }}>
          Historical Prediction Accuracy
        </span>
        <span
          className="ml-auto text-[10px] font-black px-2 py-0.5 rounded"
          style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-35)', border: '1px solid var(--alpha-bg-08)', fontFamily: 'var(--font-mono)' }}
        >
          {calibration.dataSource === 'database' ? 'LIVE DATA' : calibration.dataSource === 'hybrid' ? 'HYBRID' : 'RESEARCH GROUNDED'}
        </span>
      </div>

      <div className="p-5">
        {/* Headline stat */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 mb-5"
        >
          {/* Your tier accuracy */}
          <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(0,212,224,0.06)', border: '1px solid rgba(0,212,224,0.18)' }}>
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Accuracy for your score range
            </div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', color: tierColor(currentAccuracyPct / 100) }}>
                {currentAccuracyPct}%
              </span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--alpha-text-50)', marginTop: '2px' }}>
              {currentTier} tier · scores {currentTierRecord?.scoreRange ?? '–'}
            </div>
          </div>

          {/* Overall + sample size */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="rounded-xl p-3 flex flex-col items-center" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
              <TrendingUp className="w-3.5 h-3.5 mb-1" style={{ color: 'var(--alpha-text-35)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: tierColor(calibration.overallAccuracy) }}>
                {overallPct}%
              </span>
              <span style={{ fontSize: '9px', color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>overall</span>
            </div>
            <div className="rounded-xl p-3 flex flex-col items-center" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}>
              <Users className="w-3.5 h-3.5 mb-1" style={{ color: 'var(--alpha-text-35)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: 'var(--alpha-text-70)' }}>
                {calibration.totalOutcomesTracked.toLocaleString()}
              </span>
              <span style={{ fontSize: '9px', color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>outcomes</span>
            </div>
          </div>
        </motion.div>

        {/* Tier breakdown */}
        <div className="mb-4">
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-30)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
            Accuracy by risk tier
          </div>
          {calibration.accuracyByTier.map((record, i) => (
            <AccuracyBar
              key={record.tier}
              record={record}
              isCurrent={record.tier === currentTier}
              index={i}
            />
          ))}
        </div>

        {/* Trust narrative */}
        <div
          className="rounded-lg px-4 py-3"
          style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}
        >
          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--alpha-text-35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Validation note
          </div>
          <p style={{ fontSize: '11px', color: 'var(--alpha-text-55)', lineHeight: 1.55 }}>
            {calibration.trustNarrative}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--alpha-text-35)', marginTop: '6px' }}>
            Last calibrated: {new Date(calibration.lastCalibrationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HistoricalAccuracyPanel;
