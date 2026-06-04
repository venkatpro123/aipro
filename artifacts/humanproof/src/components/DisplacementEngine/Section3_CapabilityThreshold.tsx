// Section3_CapabilityThreshold — 4-state non-linear model.
// No year-by-year percentages. Stage names + confidence + trigger conditions.

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { CapabilityThresholdState, ThresholdStage } from '../../data/agenticWaveTypes';

interface Props {
  threshold: CapabilityThresholdState;
}

const STAGES: { key: ThresholdStage; shortLabel: string; color: string }[] = [
  { key: 'CURRENT',          shortLabel: 'AI Assists',            color: '#10b981' },
  { key: 'APPROACHING',      shortLabel: 'Workflows Disrupted',   color: '#f59e0b' },
  { key: 'THRESHOLD_WINDOW', shortLabel: 'Threshold Window',      color: '#f97316' },
  { key: 'POST_THRESHOLD',   shortLabel: 'Post-Threshold',        color: '#ef4444' },
];

const STAGE_INDEX: Record<ThresholdStage, number> = {
  CURRENT: 0, APPROACHING: 1, THRESHOLD_WINDOW: 2, POST_THRESHOLD: 3,
};

const CONFIDENCE_COLORS: Record<string, string> = {
  LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444',
};

export const Section3_CapabilityThreshold: React.FC<Props> = ({ threshold }) => {
  const activeIdx = STAGE_INDEX[threshold.stage];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* No-linear disclaimer */}
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em', padding: '7px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        NON-LINEAR MODEL — AI capability advances in waves, not gradual yearly increments. This model reflects structural stage transitions.
      </div>

      {/* Stage pipeline */}
      <div style={{
        padding: '20px', borderRadius: 16,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
          {STAGES.map((stage, i) => {
            const isDone   = i < activeIdx;
            const isActive = i === activeIdx;
            const color    = isActive ? stage.color : isDone ? stage.color : 'rgba(255,255,255,0.20)';
            return (
              <React.Fragment key={stage.key}>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '12px 14px', borderRadius: 12, flexShrink: 0,
                    background: isActive ? `${stage.color}12` : isDone ? `${stage.color}06` : 'transparent',
                    border: isActive ? `1px solid ${stage.color}40` : isDone ? `1px solid ${stage.color}20` : '1px solid transparent',
                    minWidth: 120,
                  }}
                >
                  {isDone
                    ? <CheckCircle2 size={18} style={{ color }} />
                    : isActive
                    ? <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                        <AlertCircle size={18} style={{ color }} />
                      </motion.div>
                    : <Circle size={18} style={{ color: 'rgba(255,255,255,0.18)' }} />
                  }
                  <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, color, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 1.3 }}>
                    {stage.shortLabel}
                  </span>
                  {isActive && (
                    <span style={{ fontSize: 9, color: `${stage.color}80`, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                      ← YOU ARE HERE
                    </span>
                  )}
                </motion.div>
                {i < STAGES.length - 1 && (
                  <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active stage detail */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          padding: '18px 20px', borderRadius: 14,
          background: `${STAGES[activeIdx].color}08`,
          border: `1px solid ${STAGES[activeIdx].color}28`,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: STAGES[activeIdx].color, fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>
          {threshold.stageLabel}
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 14px' }}>
          {threshold.stageDescription}
        </p>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
          {threshold.timingRange}
        </div>
      </motion.div>

      {/* Confidence indicators */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Direction Confidence', value: 'HIGH', color: '#ef4444' },
          { label: 'Timing Confidence', value: threshold.timingConfidence, color: CONFIDENCE_COLORS[threshold.timingConfidence] },
        ].map(c => (
          <div key={c.label} style={{
            flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 10,
            background: `${c.color}08`, border: `1px solid ${c.color}20`,
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>{c.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.color, fontFamily: 'var(--font-mono)' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Trigger conditions */}
      {threshold.triggerConditions.length > 0 && (
        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            What Would Trigger the Next Stage
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {threshold.triggerConditions.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>
                <span style={{ color: STAGES[activeIdx].color, flexShrink: 0 }}>{i + 1}.</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Section3_CapabilityThreshold;
