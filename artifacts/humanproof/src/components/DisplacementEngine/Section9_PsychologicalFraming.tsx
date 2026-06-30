// Section9_PsychologicalFraming — Phase 1 enhanced: visual 3-panel layout
//
// Transforms 4 plain text paragraphs into a visual compartmentalized briefing.
// Each mental model gets a large icon anchor, a role badge, and compressed text.
// The tone is communicated visually (color + icon) before the user reads a word.

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Globe, Compass, AlertCircle } from 'lucide-react';
import type { PsychologicalFrame } from '../../data/agenticWaveTypes';

interface Props {
  frame: PsychologicalFrame;
}

const TONE_CONFIG: Record<string, {
  color: string; bg: string; border: string; barColor: string;
  icon: React.ElementType; urgencyLabel: string;
}> = {
  calm: {
    color: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)', barColor: '#10b981',
    icon: Eye, urgencyLabel: 'STABLE OUTLOOK',
  },
  strategic: {
    color: '#22d3ee', bg: 'rgba(34,211,238,0.06)',
    border: 'rgba(34,211,238,0.18)', barColor: '#22d3ee',
    icon: Compass, urgencyLabel: 'STRATEGIC MOMENT',
  },
  urgent: {
    color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)', barColor: '#f59e0b',
    icon: AlertCircle, urgencyLabel: 'ACT NOW',
  },
};

const PANEL_ICONS = [Eye, Globe, Compass] as const;
const PANEL_ROLES = ['YOUR SITUATION', 'THE BIGGER PICTURE', 'WHAT YOU CONTROL'] as const;

export const Section9_PsychologicalFraming: React.FC<Props> = ({ frame }) => {
  const tone = TONE_CONFIG[frame.urgencyTone] ?? TONE_CONFIG.strategic;
  const { icon: ToneIcon } = tone;

  const panels = [
    { Icon: Eye,     role: 'YOUR SITUATION',    text: frame.headline, isPrimary: true },
    { Icon: Globe,   role: 'THE BIGGER PICTURE', text: frame.context,  isPrimary: false },
    { Icon: Compass, role: 'WHAT YOU CONTROL',   text: frame.agency,   isPrimary: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Tone indicator bar — visual stance signal before any text */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: tone.bg, border: `1px solid ${tone.border}`,
        }}
      >
        {/* Tone icon */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `${tone.barColor}18`, border: `1px solid ${tone.barColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ToneIcon size={16} style={{ color: tone.color }} />
        </div>

        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: tone.color, marginBottom: 1,
          }}>
            {tone.urgencyLabel}
          </p>
          <p style={{ fontSize: 11, color: 'var(--alpha-text-55)', lineHeight: 1.4 }}>
            {frame.headline.length > 100 ? frame.headline.slice(0, 97) + '…' : frame.headline}
          </p>
        </div>
      </motion.div>

      {/* 3-panel visual grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Panel 1 — full-width primary */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.30 }}
          style={{
            gridColumn: '1 / -1', padding: '14px 16px', borderRadius: 12,
            background: tone.bg, border: `1px solid ${tone.border}`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${tone.barColor}14`, border: `1px solid ${tone.barColor}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Eye size={17} style={{ color: tone.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 8, fontWeight: 800, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tone.color, marginBottom: 5,
            }}>
              YOUR SITUATION IN CONTEXT
            </p>
            <p style={{ fontSize: 12, color: 'var(--alpha-text-80)', lineHeight: 1.6 }}>
              {frame.headline}
            </p>
          </div>
        </motion.div>

        {/* Panel 2 — Broader Picture */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.30 }}
          style={{
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, marginBottom: 8,
            background: 'var(--alpha-bg-06)', border: '1px solid var(--alpha-bg-08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={13} style={{ color: 'var(--alpha-text-45)' }} />
          </div>
          <p style={{
            fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--alpha-text-30)', marginBottom: 5,
          }}>
            THE BIGGER PICTURE
          </p>
          <p style={{ fontSize: 11, color: 'var(--alpha-text-55)', lineHeight: 1.65 }}>
            {frame.context.length > 140 ? frame.context.slice(0, 137) + '…' : frame.context}
          </p>
        </motion.div>

        {/* Panel 3 — What You Control */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20, duration: 0.30 }}
          style={{
            padding: '12px 14px', borderRadius: 12,
            background: `${tone.barColor}08`, border: `1px solid ${tone.barColor}22`,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8, marginBottom: 8,
            background: `${tone.barColor}14`, border: `1px solid ${tone.barColor}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Compass size={13} style={{ color: tone.color }} />
          </div>
          <p style={{
            fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: tone.color, marginBottom: 5,
          }}>
            WHAT YOU CONTROL
          </p>
          <p style={{ fontSize: 11, color: 'var(--alpha-text-65)', lineHeight: 1.65 }}>
            {frame.agency.length > 140 ? frame.agency.slice(0, 137) + '…' : frame.agency}
          </p>
        </motion.div>
      </div>

      {/* Uncertainty footnote — compact, visual treatment */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.30, duration: 0.35 }}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--alpha-bg-03)', border: '1px solid var(--alpha-bg-05)',
        }}
      >
        <AlertCircle size={11} style={{ color: 'var(--alpha-text-25)', flexShrink: 0, marginTop: 1 }} />
        <p style={{
          fontSize: 10, color: 'var(--alpha-text-35)', lineHeight: 1.6,
          fontStyle: 'italic',
        }}>
          {frame.horizon}
        </p>
      </motion.div>
    </div>
  );
};

export default Section9_PsychologicalFraming;
