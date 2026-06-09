// MissionCard — Rule 1 compliant dominant action card
// Answers: What happened / Why it matters / What to do / What if you don't
// This is the single most important element on the dashboard — occupies the full
// first fold above the fold. Every recommendation surfaces through this pattern.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, HelpCircle, ChevronRight, AlertTriangle, Users } from 'lucide-react';
import { markActionComplete } from '../../services/actionCompletionService';
import type { PrimaryMove } from '../../services/orchestration/signalOrchestrator';

interface Props {
  primaryMove: PrimaryMove;
  riskScore: number;
  /** Cohort benchmark if available — "N similar users saw +Xpt avg improvement" */
  peerBenchmark?: { n: number; avgPtsGain: number } | null;
  onHelp?: () => void;
  onSkip?: () => void;
}

function getReadinessColor(readiness: number): string {
  if (readiness >= 70) return '#10b981';
  if (readiness >= 50) return '#f59e0b';
  if (readiness >= 35) return '#f97316';
  return '#ef4444';
}

function getReadinessLabel(readiness: number): string {
  if (readiness >= 75) return 'Strong';
  if (readiness >= 60) return 'Good';
  if (readiness >= 45) return 'Needs attention';
  if (readiness >= 30) return 'At risk';
  return 'Critical';
}

export function MissionCard({ primaryMove, riskScore, peerBenchmark, onHelp, onSkip }: Props) {
  const [completed, setCompleted] = useState(false);
  const readiness = 100 - riskScore;
  const readinessColor = getReadinessColor(readiness);
  const accentColor = primaryMove.feasibleForProfile ? 'var(--cyan)' : '#f59e0b';

  const whatHappened = primaryMove.whatHappened ?? primaryMove.action.title;
  const whyItMatters = primaryMove.whyItMatters ?? primaryMove.rationale;
  const ifYouSkip = primaryMove.ifYouSkip ?? 'Inaction compounds the risk — act this week.';

  async function handleComplete() {
    setCompleted(true);
    await markActionComplete(primaryMove.action.id ?? primaryMove.action.title, {
      scoreAtCompletion: riskScore,
    });
  }

  if (completed) {
    return (
      <motion.div
        className="card-premium"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        style={{
          padding: '28px 28px',
          border: '1px solid rgba(16,185,129,0.3)',
          background: 'rgba(16,185,129,0.06)',
          textAlign: 'center',
        }}
      >
        <CheckCircle2 size={36} style={{ color: '#10b981', marginBottom: 12 }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          Mission Complete
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
          "{primaryMove.moveLabel}" — marked done. We'll track the impact over the next 14 days.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: '24px 28px',
        border: `1px solid ${accentColor}35`,
        background: `linear-gradient(135deg, ${accentColor}07 0%, rgba(255,255,255,0.02) 100%)`,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '4px 10px', borderRadius: 6,
            background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
            fontSize: '0.68rem', fontWeight: 800, color: accentColor,
            letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)',
          }}>
            THIS WEEK'S MISSION
          </div>
          {!primaryMove.feasibleForProfile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 5,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b',
            }}>
              <AlertTriangle size={9} />
              CONSTRAINED
            </div>
          )}
        </div>
        {/* Effort badge */}
        {primaryMove.action.effortBadge && (
          <div style={{
            fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)',
            fontFamily: 'var(--font-mono, monospace)', fontWeight: 600,
          }}>
            {primaryMove.action.effortBadge} effort
          </div>
        )}
      </div>

      {/* Action title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          fontWeight: 800, color: 'var(--text)',
          margin: '0 0 6px', letterSpacing: '-0.01em',
          lineHeight: 1.3,
        }}>
          "{primaryMove.moveLabel}"
        </h2>
        {primaryMove.action.description && (
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            {primaryMove.action.description}
          </p>
        )}
      </div>

      {/* 4-question grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
        gap: 12,
        marginBottom: 22,
        padding: '16px 18px',
        background: 'rgba(255,255,255,0.025)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <div style={{
            fontSize: '0.63rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            WHAT HAPPENED
          </div>
          <div style={{ fontSize: '0.79rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            {whatHappened}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: '0.63rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            WHY IT MATTERS
          </div>
          <div style={{ fontSize: '0.79rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            {whyItMatters}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: '0.63rem', fontWeight: 800, color: '#ef444440',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            IF YOU SKIP
          </div>
          <div style={{ fontSize: '0.79rem', color: 'rgba(239,68,68,0.65)', lineHeight: 1.5 }}>
            {ifYouSkip}
          </div>
        </div>
      </div>

      {/* Peer benchmark */}
      {peerBenchmark && peerBenchmark.n >= 5 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          marginBottom: 18,
          padding: '8px 12px', borderRadius: 7,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
        }}>
          <Users size={12} style={{ flexShrink: 0, color: 'var(--cyan)' }} />
          <span>
            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
              {peerBenchmark.n} users
            </span>
            {' '}with your profile who took this saw{' '}
            <span style={{ fontWeight: 700, color: '#10b981' }}>
              avg +{peerBenchmark.avgPtsGain}pt readiness gain
            </span>
          </span>
        </div>
      )}

      {/* Readiness context */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 20,
        fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)',
      }}>
        <span>Career Readiness:</span>
        <span style={{ fontWeight: 800, color: readinessColor }}>
          {readiness}
        </span>
        <span style={{ color: getReadinessColor(readiness), fontSize: '0.7rem' }}>
          — {getReadinessLabel(readiness)}
        </span>
      </div>

      {/* CTA row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleComplete}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: accentColor, color: '#000',
            fontWeight: 800, fontSize: '0.88rem',
            padding: '11px 22px', borderRadius: 9, border: 'none',
            cursor: 'pointer', flex: '1 1 140px', justifyContent: 'center',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        >
          <CheckCircle2 size={15} />
          Mark Complete
        </button>
        {onHelp && (
          <button
            type="button"
            onClick={onHelp}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)',
              fontWeight: 600, fontSize: '0.82rem',
              padding: '11px 18px', borderRadius: 9,
              border: '1px solid var(--border)',
              cursor: 'pointer', flex: '0 1 auto',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
          >
            <HelpCircle size={13} />
            I need help
          </button>
        )}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', color: 'rgba(255,255,255,0.25)',
              fontWeight: 600, fontSize: '0.78rem',
              padding: '11px 14px', borderRadius: 9,
              border: '1px solid transparent',
              cursor: 'pointer', flex: '0 1 auto',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'}
          >
            Skip this week
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
