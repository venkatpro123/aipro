// Section4_TaskExposure — Per-task heat map.
// Each row: task name, dual Human%/AI% bars, exposure badge, AI tool chip.

import React from 'react';
import { motion } from 'framer-motion';
import type { TaskExposureEntry } from '../../data/agenticWaveTypes';

interface Props {
  tasks: TaskExposureEntry[];
}

const EXPOSURE_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#ef4444', label: 'CRITICAL' },
  high:     { bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.22)', color: '#f97316', label: 'HIGH' },
  medium:   { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.20)', color: '#f59e0b', label: 'MEDIUM' },
  low:      { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.20)', color: '#10b981', label: 'LOW' },
};

const TRAJECTORY_LABEL: Record<string, string> = {
  ai_dominant: '⬡ AI Dominant',
  ai_gaining:  '↑ AI Gaining',
  stable:      '— Stable',
};

export const Section4_TaskExposure: React.FC<Props> = ({ tasks }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header disclaimer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        padding: '8px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          Estimated Task Exposure — AI Automatable Share
        </span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['Human', '#10b981'], ['AI Automatable', '#ef4444']].map(([l, c]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 1, background: c }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--font-mono)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Task rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map((task, i) => {
          const style = EXPOSURE_STYLES[task.exposureLevel] ?? EXPOSURE_STYLES.medium;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{
                padding: '12px 14px', borderRadius: 10,
                background: style.bg, border: `1px solid ${style.border}`,
              }}
            >
              {/* Row 1: task name + badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', lineHeight: 1.2 }}>{task.task}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {task.aiTool && (
                    <span style={{ fontSize: 9, color: 'rgba(0,212,224,0.75)', padding: '1px 6px', borderRadius: 4, background: 'rgba(0,212,224,0.08)', border: '1px solid rgba(0,212,224,0.18)', fontFamily: 'var(--font-mono)' }}>
                      {task.aiTool}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 800, color: style.color, padding: '1px 6px', borderRadius: 4, background: `${style.color}18`, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                    {style.label}
                  </span>
                </div>
              </div>

              {/* Dual bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Human bar */}
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.humanPct}%`, background: 'linear-gradient(90deg,#10b981,#22d3ee)', borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>{task.humanPct}%</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)' }}> H</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {/* AI bar */}
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.aiPct}%`, background: `linear-gradient(90deg,${style.color}aa,${style.color})`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ width: 40, textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: style.color, fontFamily: 'var(--font-mono)' }}>{task.aiPct}%</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)' }}> AI</span>
                </div>
              </div>

              {/* Trajectory */}
              <div style={{ marginTop: 6, fontSize: 9, color: 'rgba(255,255,255,0.30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                {TRAJECTORY_LABEL[task.trajectory] ?? task.trajectory}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, fontStyle: 'italic' }}>
        Task exposure percentages are estimates derived from AI capability research and skill-tier analysis for this role type. Individual task profiles will vary with seniority, specialisation, and organisation.
      </div>
    </div>
  );
};

export default Section4_TaskExposure;
