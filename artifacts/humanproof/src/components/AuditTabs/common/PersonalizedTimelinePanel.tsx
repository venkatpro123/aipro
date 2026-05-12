// PersonalizedTimelinePanel.tsx — v17.0
// Renders the personalized critical-date timeline from Layer 49.
// Shows: critical date countdown, urgency category, milestone list, runway narrative.
// Human-readable: "You need to act by October 15, 2026."

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, CheckCircle, Flag } from 'lucide-react';
import type { PersonalizedTimelineResult, TimelineMilestone } from '../../../services/personalizedTimelineService';

interface Props {
  personalizedTimeline: PersonalizedTimelineResult | null | undefined;
}

const URGENCY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; description: string }> = {
  IMMEDIATE: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', label: 'IMMEDIATE ACTION', description: 'Act within the next 2 weeks' },
  WEEKS:     { color: '#f97316', bg: 'rgba(249,115,22,0.09)', border: 'rgba(249,115,22,0.30)', label: 'ACT WITHIN WEEKS', description: 'Begin active job search now' },
  MONTHS:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.28)', label: 'ACT WITHIN MONTHS', description: 'Start preparation this month' },
  COMFORTABLE: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', label: 'COMFORTABLE BUFFER', description: 'Maintain readiness' },
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function humanDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const MilestoneRow: React.FC<{ milestone: TimelineMilestone; index: number }> = ({ milestone, index }) => {
  const isDeadline = milestone.isDeadline;
  const days = daysUntil(milestone.date);
  const isPast = days === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
        style={{
          background: isDeadline ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,224,0.12)',
          border: `1px solid ${isDeadline ? 'rgba(239,68,68,0.35)' : 'rgba(0,212,224,0.25)'}`,
        }}
      >
        {isDeadline
          ? <Flag className="w-3 h-3" style={{ color: '#ef4444' }} />
          : <CheckCircle className="w-3 h-3" style={{ color: 'var(--cyan)' }} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span style={{ fontSize: '12px', fontWeight: 700, color: isDeadline ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.82)' }}>
            {milestone.action}
          </span>
          {isDeadline && (
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.30)', borderRadius: '4px', padding: '1px 5px', fontWeight: 800 }}>
              DEADLINE
            </span>
          )}
        </div>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          {milestone.rationale}
        </p>
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-right">
        <div style={{ fontSize: '11px', fontWeight: 700, color: isDeadline ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>
          {humanDate(milestone.date)}
        </div>
        {!isPast && (
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
            {days}d away
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PersonalizedTimelinePanel: React.FC<Props> = ({ personalizedTimeline }) => {
  if (!personalizedTimeline) return null;

  const { criticalByDate, bufferWeeks, urgencyCategory, milestones, runwayNarrative, marketTimingNote } = personalizedTimeline;
  const urgency = URGENCY_CONFIG[urgencyCategory] ?? URGENCY_CONFIG.MONTHS;
  const daysLeft = criticalByDate ? daysUntil(criticalByDate) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${urgency.border}`, background: urgency.bg }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${urgency.border}` }}>
        <Calendar className="w-4 h-4" style={{ color: urgency.color }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: urgency.color }}>
          Personalized Action Timeline
        </span>
        <span
          className="ml-auto text-[9px] font-black px-2 py-0.5 rounded"
          style={{ background: `${urgency.color}20`, color: urgency.color, border: `1px solid ${urgency.color}40`, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
        >
          {urgency.label}
        </span>
      </div>

      <div className="p-5">
        {/* Critical date hero */}
        {criticalByDate && daysLeft !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4 mb-5 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${urgency.border}` }}
          >
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: urgency.color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
              {urgency.description}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: urgency.color }}>
              {daysLeft}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              days remaining
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: '8px' }}>
              Act by {humanDate(criticalByDate)}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              {Math.round(bufferWeeks)} weeks · {urgencyCategory.toLowerCase().replace('_', ' ')} urgency
            </div>
          </motion.div>
        )}

        {/* Runway narrative */}
        {runwayNarrative && (
          <div
            className="rounded-lg px-4 py-3 mb-4 flex items-start gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
              {runwayNarrative}
            </p>
          </div>
        )}

        {/* Milestone list */}
        {milestones.length > 0 && (
          <div className="mb-4">
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
              Your milestone plan
            </div>
            {milestones.map((m, i) => (
              <MilestoneRow key={`${m.date}-${i}`} milestone={m} index={i} />
            ))}
          </div>
        )}

        {/* Market timing note */}
        {marketTimingNote && (
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-2"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              {marketTimingNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalizedTimelinePanel;
