// DefensePriorityEngine.tsx — Ranked action list by (impact × confidence) / effort
// Replaces the generic WhatIfSimulatorPanel.
// Shows "DO THIS FIRST", full action text, risk reduction, difficulty, time, confidence,
// and an expandable "why this works" explanation for each lever.

import { useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import type { SensitivityLever } from '../../../services/scoreSensitivityEngine';
import ProvenanceLabel, { provenanceKindFromSource } from '../../AuditTabs/common/ProvenanceLabel';
import { useOrchestratorBus } from '../../../hooks/useOrchestratorBus';
import { recordTwinDecision } from '../../../services/careerTwinService';
import { useAuth } from '../../../context/AuthContext';

// ── Reason copy per dimension ─────────────────────────────────────────────────

const DIMENSION_REASONS: Record<string, string> = {
  L1: 'Reducing financial vulnerability lets you make career decisions from a position of strength, not desperation. A 3-month cash runway gives you the ability to walk away from a bad situation — which is your most powerful negotiating tool.',
  L2: 'A strong track record of outcomes makes you the last to be considered in future cuts — not the first. Document results now so your value is undeniable when decisions are made.',
  L3: 'Each skill you add directly reduces overlap with what AI handles. Automation replaces isolated tasks, not people who can combine judgment, context, and stakeholder trust.',
  L4: 'Moving toward the growing segments of your industry buffers you from sector-wide headcount reductions. The safest position is where the industry is heading, not where it has been.',
  L5: 'Geographic flexibility multiplies your options when local demand contracts. Even partial remote capability expands your effective job market by 10×.',
  D1: 'AI task coverage drops when you develop skills that require situational judgment, institutional context, and stakeholder relationships — the last things automated in any enterprise.',
  D2: 'Higher market demand for your skills means multiple employers are competing for you. You are never dependent on one company\'s budget cycle.',
  D3: 'Company amplification shrinks when the employer stabilizes or you diversify your income and identity beyond your current employer.',
  D4: 'Institutional knowledge and track record compound over time. Your experience becomes a genuine moat once it exceeds the replication cost for your employer.',
  D6: 'Complex, judgment-intensive work signals irreplaceable value. Move up the task stack — own design and decision-making, not execution alone.',
};

// ── Feasibility metadata ──────────────────────────────────────────────────────

const FEASIBILITY_META: Record<string, { label: string; color: string; bg: string }> = {
  immediate:   { label: 'Easy',   color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  short_term:  { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  medium_term: { label: 'Hard',   color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
  long_term:   { label: 'Major',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

const CONFIDENCE_KINDS = {
  High:   'measured'  as const,
  Medium: 'modeled'   as const,
  Low:    'estimated' as const,
};

// ── Priority score: (impact × confidence) / effort ───────────────────────────

function priorityScore(lever: SensitivityLever): number {
  const conf   = lever.confidenceInEstimate === 'High' ? 1.0
    : lever.confidenceInEstimate === 'Medium' ? 0.7 : 0.4;
  const effort = lever.feasibility === 'immediate'   ? 0.5
    : lever.feasibility === 'short_term'  ? 1.0
    : lever.feasibility === 'medium_term' ? 2.0 : 3.5;
  return (lever.scoreDropIfImproved * conf) / effort;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  scoreResult: HybridResult;
}

export function DefensePriorityEngine({ scoreResult }: Props) {
  const { user }    = useAuth();
  const feed        = useOrchestratorBus();
  const topSignals  = feed?.primary.slice(0, 2) ?? [];

  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [showSigs,  setShowSigs]  = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('hp_completed_actions');
      return new Set(JSON.parse(raw ?? '[]'));
    } catch { return new Set(); }
  });

  const levers = scoreResult.scoreSensitivity?.levers ?? [];
  // Only show dimensions actively contributing to risk (value > 8%)
  const activeDims = new Set(
    Object.entries(scoreResult.breakdown ?? {})
      .filter(([, v]) => v > 0.08)
      .map(([k]) => k),
  );
  // Ranked by priority score; filter to active dims; cap at 6 cards
  const ranked = [...levers]
    .filter(l => activeDims.has(l.dimension))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 6);

  // Fall back to all levers if activeDims filter yields nothing
  const displayLevers = ranked.length > 0
    ? ranked
    : [...levers].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 5);

  function toggleComplete(dimension: string, label: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(dimension)) { next.delete(dimension); } else { next.add(dimension); }
      try { localStorage.setItem('hp_completed_actions', JSON.stringify([...next])); } catch {}
      return next;
    });
    if (user?.id && !completed.has(dimension)) {
      recordTwinDecision({
        userId: user.id,
        decisionType: 'other',
        notes: `Defense action completed: ${label}`,
        decidedAt: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
  }

  if (!displayLevers.length) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>⚡</div>
        Run an audit to generate your personalised defence priority list.
      </div>
    );
  }

  const completedCount = displayLevers.filter(l => completed.has(l.dimension)).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 5 }}>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>
            Defence Priority Engine
          </div>
          {completedCount > 0 && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              color: '#10b981',
            }}>
              {completedCount}/{displayLevers.length} actions completed
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          Ranked by{' '}
          <span style={{ color: 'rgba(255,255,255,0.65)' }}>impact × confidence ÷ effort</span>.
          {' '}The top card gives you the most protection per hour invested.
        </div>
      </div>

      {/* Live signals strip */}
      {topSignals.length > 0 && (
        <div style={{ marginBottom: 18, borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setShowSigs(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0, boxShadow: '0 0 6px var(--cyan)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', flex: 1 }}>
              {topSignals.length} live signal{topSignals.length !== 1 ? 's' : ''} affecting your priorities
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{showSigs ? '▲' : '▾'}</span>
          </button>
          {showSigs && (
            <div style={{ padding: '2px 14px 12px' }}>
              {topSignals.map((rs, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined }}>
                  <span style={{ padding: '1px 5px', borderRadius: 3, background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.18)', fontSize: 9, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
                    T{rs.signal.tier}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 1.4 }}>{rs.signal.headline}</span>
                  <ProvenanceLabel kind={provenanceKindFromSource(rs.signal.sourceKind)} size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayLevers.map((lever, idx) => {
          const isFirst     = idx === 0;
          const isDone      = completed.has(lever.dimension);
          const isOpen      = expanded === lever.dimension;
          const feasMeta    = FEASIBILITY_META[lever.feasibility] ?? FEASIBILITY_META.medium_term;
          const synergyNote = scoreResult.scoreSensitivity?.topSynergyCombos
            ?.find(c => c.levers.includes(lever.dimension))?.rationale;

          return (
            <div
              key={lever.dimension}
              className="card-premium"
              style={{
                padding: '16px 18px',
                border: isFirst && !isDone
                  ? '1px solid rgba(0,245,255,0.28)'
                  : isDone
                  ? '1px solid rgba(16,185,129,0.22)'
                  : undefined,
                opacity: isDone ? 0.68 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Rank / complete toggle */}
                <button
                  type="button"
                  onClick={() => toggleComplete(lever.dimension, lever.dimensionLabel)}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark as completed'}
                  style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                    border: isDone
                      ? '1px solid rgba(16,185,129,0.55)'
                      : isFirst
                      ? '1px solid rgba(0,245,255,0.4)'
                      : '1px solid rgba(255,255,255,0.2)',
                    background: isDone
                      ? 'rgba(16,185,129,0.12)'
                      : isFirst
                      ? 'rgba(0,245,255,0.06)'
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isDone ? 13 : 10, fontWeight: 700,
                    color: isDone ? '#10b981' : isFirst ? 'var(--cyan)' : 'rgba(255,255,255,0.4)',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
                >
                  {isDone ? '✓' : String(idx + 1).padStart(2, '0')}
                </button>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                    {isFirst && !isDone && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 3, fontSize: 9, fontWeight: 800,
                        background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.3)',
                        color: 'var(--cyan)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)',
                      }}>
                        DO THIS FIRST
                      </span>
                    )}
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: isDone ? 'rgba(255,255,255,0.45)' : 'var(--text)',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>
                      {lever.dimensionLabel}
                    </span>
                  </div>

                  {/* Action text */}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.55, marginBottom: 10 }}>
                    {lever.fastestAction}
                  </div>

                  {/* Chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: 'rgba(16,185,129,0.1)', color: '#10b981',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}>
                      Risk Reduction: −{lever.scoreDropIfImproved} pts
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: feasMeta.bg, color: feasMeta.color,
                    }}>
                      Difficulty: {feasMeta.label}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10,
                      background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                    }}>
                      ⏱ Time: {lever.actionTimeframe}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Confidence:</span>
                      <ProvenanceLabel kind={CONFIDENCE_KINDS[lever.confidenceInEstimate]} size="xs" />
                    </div>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : lever.dimension)}
                  aria-label="Show reason"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.28)', fontSize: 11, flexShrink: 0, padding: '4px 0', marginTop: 2 }}
                >
                  {isOpen ? '▲' : '▾'}
                </button>
              </div>

              {/* Expanded reason — full causal chain */}
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, marginTop: 12, marginLeft: 40 }}>

                  {/* Section 1: WHY THIS ACTION EXISTS — causal chain */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.09em', marginBottom: 8 }}>
                    WHY THIS ACTION EXISTS
                  </div>

                  {/* Causal chain: signal → driver → impact */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {/* Source signal */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', width: 72, flexShrink: 0, paddingTop: 1, letterSpacing: '0.06em' }}>
                        SOURCE
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45, flex: 1 }}>
                        {(() => {
                          const sig = topSignals.find(rs => rs.signal?.headline);
                          return sig?.signal?.headline
                            ?? `${lever.dimensionLabel} is a top-3 risk contributor in your current audit profile.`;
                        })()}
                      </span>
                    </div>

                    {/* Risk driver bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', width: 72, flexShrink: 0, letterSpacing: '0.06em' }}>
                        DRIVER
                      </span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.min(100, Math.round((scoreResult.breakdown?.[lever.dimension] ?? 0) * 100))}%`,
                            background: '#ef4444', transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', width: 30, textAlign: 'right', flexShrink: 0 }}>
                          {Math.round((scoreResult.breakdown?.[lever.dimension] ?? 0) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Score impact */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', width: 72, flexShrink: 0, letterSpacing: '0.06em' }}>
                        IMPACT
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#ef4444' }}>
                          {scoreResult.total}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>→</span>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', color: '#10b981' }}>
                          {Math.max(5, scoreResult.total - lever.scoreDropIfImproved)}
                        </span>
                        <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>
                          (−{lever.scoreDropIfImproved} pts)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: WHY THIS WORKS */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.09em', marginBottom: 6 }}>
                    WHY THIS WORKS
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.65, marginBottom: synergyNote ? 12 : 0 }}>
                    {DIMENSION_REASONS[lever.dimension]
                      ?? `Improving ${lever.dimensionLabel} directly reduces your composite risk score by targeting one of your highest-contributing risk dimensions.`}
                  </div>

                  {synergyNote && (
                    <div style={{
                      padding: '9px 13px', borderRadius: 7, marginTop: 4,
                      background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                      fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55,
                    }}>
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>SYNERGY: </span>
                      {synergyNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      {scoreResult.scoreSensitivity?.bestThreeLeverScore !== undefined && (
        <div style={{
          marginTop: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
            Complete the top 3 actions above → your projected risk score drops to{' '}
            <strong style={{ color: '#10b981' }}>
              {scoreResult.scoreSensitivity.bestThreeLeverScore}
            </strong>
            {' '}(a reduction of{' '}
            <strong style={{ color: '#10b981' }}>
              {scoreResult.total - scoreResult.scoreSensitivity.bestThreeLeverScore} points
            </strong>).
          </div>
        </div>
      )}
    </div>
  );
}
