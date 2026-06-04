// Section7_EarlyWarningSignals — 5-stage wave spectrum indicator.

import React from 'react';
import { motion } from 'framer-motion';
import type { WaveStatusDetail, WaveStatus } from '../../data/agenticWaveTypes';

interface Props {
  waveStatusDetail: WaveStatusDetail;
}

const WAVE_STAGES: { key: WaveStatus; label: string; color: string; shortDesc: string }[] = [
  { key: 'EARLY',        label: 'EARLY',        color: '#10b981', shortDesc: 'Limited deployment' },
  { key: 'BUILDING',     label: 'BUILDING',     color: '#22d3ee', shortDesc: 'Tools emerging' },
  { key: 'ACCELERATING', label: 'ACCELERATING', color: '#f59e0b', shortDesc: 'Rapid adoption' },
  { key: 'INFLECTION',   label: 'INFLECTION',   color: '#f97316', shortDesc: 'Restructuring begins' },
  { key: 'ACTIVE',       label: 'ACTIVE',       color: '#ef4444', shortDesc: 'Threshold crossed' },
];

const STAGE_IDX: Record<WaveStatus, number> = {
  EARLY: 0, BUILDING: 1, ACCELERATING: 2, INFLECTION: 3, ACTIVE: 4,
};

export const Section7_EarlyWarningSignals: React.FC<Props> = ({ waveStatusDetail }) => {
  const activeIdx = STAGE_IDX[waveStatusDetail.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Industry context */}
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        AI Adoption Wave Status — {waveStatusDetail.industryContext}
      </div>

      {/* 5-stage spectrum */}
      <div style={{
        padding: '18px 16px', borderRadius: 16,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {WAVE_STAGES.map((stage, i) => {
            const isActive = i === activeIdx;
            const isPast   = i < activeIdx;
            const bg = isActive ? `${stage.color}16` : isPast ? `${stage.color}08` : 'transparent';
            const border = isActive ? `1px solid ${stage.color}45` : '1px solid transparent';
            return (
              <div key={stage.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 10, background: bg, border, position: 'relative' }}>
                {/* Stage dot */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.2, 1], opacity: [1, 0.6, 1] } : {}}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  style={{
                    width: isActive ? 12 : 8, height: isActive ? 12 : 8,
                    borderRadius: '50%',
                    background: isPast || isActive ? stage.color : 'rgba(255,255,255,0.15)',
                    boxShadow: isActive ? `0 0 10px ${stage.color}80` : 'none',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 8, fontWeight: isActive ? 800 : 600, color: isActive ? stage.color : isPast ? `${stage.color}70` : 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.2 }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: 8, color: isActive ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.20)', textAlign: 'center', lineHeight: 1.2, display: 'none' }}>
                  {stage.shortDesc}
                </span>
                {/* Connector line */}
                {i < WAVE_STAGES.length - 1 && (
                  <div style={{
                    position: 'absolute', right: -1, top: '50%', width: 2, height: 16,
                    background: i < activeIdx ? WAVE_STAGES[i].color : 'rgba(255,255,255,0.10)',
                    transform: 'translateY(-50%)',
                    display: 'none',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar under stages */}
        <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${((activeIdx + 0.5) / WAVE_STAGES.length) * 100}%`,
            background: `linear-gradient(90deg,#10b981,${WAVE_STAGES[activeIdx].color})`,
            borderRadius: 2,
            transition: 'width 1s ease',
          }} />
        </div>
      </div>

      {/* Active status detail */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          padding: '16px 18px', borderRadius: 14,
          background: `${WAVE_STAGES[activeIdx].color}09`,
          border: `1px solid ${WAVE_STAGES[activeIdx].color}28`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 8, height: 8, borderRadius: '50%', background: WAVE_STAGES[activeIdx].color, boxShadow: `0 0 8px ${WAVE_STAGES[activeIdx].color}` }}
          />
          <span style={{ fontSize: 11, fontWeight: 800, color: WAVE_STAGES[activeIdx].color, fontFamily: 'var(--font-mono)', letterSpacing: '0.10em' }}>
            {waveStatusDetail.label}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, margin: '0 0 12px' }}>
          {waveStatusDetail.description}
        </p>

        {/* Supporting signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {waveStatusDetail.supportingSignals.map((sig, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5 }}>
              <span style={{ color: WAVE_STAGES[activeIdx].color, flexShrink: 0 }}>◦</span>
              <span>{sig}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Section7_EarlyWarningSignals;
