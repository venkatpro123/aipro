// Section9_PsychologicalFraming — Honest, calm, strategic framing.
// No panic, no false reassurance. Tone calibrated from urgencyTone.

import React from 'react';
import { motion } from 'framer-motion';
import type { PsychologicalFrame } from '../../data/agenticWaveTypes';

interface Props {
  frame: PsychologicalFrame;
}

const TONE_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  calm:      { accent: '#10b981', bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.18)'  },
  strategic: { accent: '#22d3ee', bg: 'rgba(34,211,238,0.06)', border: 'rgba(34,211,238,0.18)' },
  urgent:    { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)' },
};

export const Section9_PsychologicalFraming: React.FC<Props> = ({ frame }) => {
  const toneStyle = TONE_COLORS[frame.urgencyTone] ?? TONE_COLORS.strategic;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          padding: '20px 22px', borderRadius: 16,
          background: toneStyle.bg, border: `1px solid ${toneStyle.border}`,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: toneStyle.accent, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Your Situation In Context
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--alpha-text-92)', lineHeight: 1.65, margin: 0 }}>
          {frame.headline}
        </p>
      </motion.div>

      {/* Context paragraph */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        style={{
          padding: '16px 18px', borderRadius: 12,
          background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)',
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--alpha-text-30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>The Broader Picture</div>
        <p style={{ fontSize: 13, color: 'var(--alpha-text-55)', lineHeight: 1.75, margin: 0 }}>
          {frame.context}
        </p>
      </motion.div>

      {/* Agency */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14 }}
        style={{
          padding: '16px 18px', borderRadius: 12,
          background: `${toneStyle.accent}08`, border: `1px solid ${toneStyle.accent}22`,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: toneStyle.accent, fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 8 }}>What You Control</div>
        <p style={{ fontSize: 13, color: 'var(--alpha-text-70)', lineHeight: 1.75, margin: 0 }}>
          {frame.agency}
        </p>
      </motion.div>

      {/* Uncertainty disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)',
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>Uncertainty Acknowledgment</div>
        <p style={{ fontSize: 11, color: 'var(--alpha-text-45)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          {frame.horizon}
        </p>
      </motion.div>
    </div>
  );
};

export default Section9_PsychologicalFraming;
