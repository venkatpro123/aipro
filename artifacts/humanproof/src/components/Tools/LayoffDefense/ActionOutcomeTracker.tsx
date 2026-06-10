// ActionOutcomeTracker.tsx — Phase 2 (Career OS): Outcome Learning Engine
// Outcomes are written to localStorage (optimistic) AND Supabase action_completions (durable).
// getDimensionSuccessStats() reads back per-user rates and surfaces them as learning insights.

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLayoff } from '../../../context/LayoffContext';
import { supabase } from '../../../utils/supabase';
import { getDimensionSuccessStats, type DimensionSuccessStats } from '../../../services/userOutcomeLearningService';

const COMPLETED_KEY = 'hp_completed_actions';
const OUTCOMES_KEY  = 'hp_action_outcomes';

const OUTCOME_OPTIONS = [
  { id: 'manager_recognised',   label: '🌟 Manager recognised my work'          },
  { id: 'new_project',          label: '📋 Assigned to a new / critical project' },
  { id: 'promotion_discussion', label: '🎯 Promotion discussion started'         },
  { id: 'recruiter_outreach',   label: '📩 Recruiter reached out'                },
  { id: 'interview',            label: '🤝 Got an interview'                     },
  { id: 'salary_increase',      label: '💰 Salary increase or bonus'             },
  { id: 'role_change',          label: '🚀 Changed role or company'              },
  { id: 'no_change',            label: '⏳ No visible change yet'                },
] as const;

type OutcomeId = typeof OUTCOME_OPTIONS[number]['id'];

interface ActionOutcome {
  actionId:  string;
  outcomeId: OutcomeId;
  date:      string;
}

function loadCompleted(): string[] {
  try { return JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? '[]') as string[]; }
  catch { return []; }
}

function loadOutcomes(): ActionOutcome[] {
  try { return JSON.parse(localStorage.getItem(OUTCOMES_KEY) ?? '[]') as ActionOutcome[]; }
  catch { return []; }
}

function saveOutcomes(outcomes: ActionOutcome[]) {
  try { localStorage.setItem(OUTCOMES_KEY, JSON.stringify(outcomes)); } catch { }
}

const DIM_LABELS: Record<string, string> = {
  D1: 'AI Adaptation', D2: 'Sector Risk', D3: 'Company Risk',
  D4: 'Tenure', D5: 'Geographic Risk', D6: 'Experience Depth',
  D7: 'Seniority', D8: 'Performance', L1: 'Financial Vulnerability',
  L2: 'Company Health', L3: 'Synthetic Risk', L4: 'Funding Stage',
  L5: 'Location Risk', L6: 'Hiring Signal', L7: 'Sentiment',
};

const EXPECTED_IMPACT: Record<string, number> = {
  D1: 8, D2: 5, D3: 7, D4: 4, D6: 6, D7: 6, D8: 5,
  L1: 9, L2: 8, L3: 7, L4: 4, L5: 3, L6: 4, L7: 3,
};

const OUTCOME_IMPACT: Record<string, number> = {
  manager_recognised:   7,
  new_project:          5,
  promotion_discussion: 9,
  recruiter_outreach:   6,
  interview:            8,
  salary_increase:     10,
  role_change:         11,
  no_change:            0,
};

function computeSystemIntelligence(outcomes: ActionOutcome[]) {
  const positive = outcomes.filter(o => o.outcomeId !== 'no_change');
  const successRate = outcomes.length > 0 ? Math.round(positive.length / outcomes.length * 100) : 0;

  const comparisons = outcomes.map(o => ({
    actionId:  o.actionId,
    expected:  EXPECTED_IMPACT[o.actionId] ?? 5,
    actual:    OUTCOME_IMPACT[o.outcomeId] ?? 0,
    outcomeId: o.outcomeId,
  }));

  const avgExpected = comparisons.length > 0
    ? Math.round(comparisons.reduce((s, c) => s + c.expected, 0) / comparisons.length * 10) / 10
    : 0;
  const avgActual = comparisons.length > 0
    ? Math.round(comparisons.reduce((s, c) => s + c.actual, 0) / comparisons.length * 10) / 10
    : 0;

  const byDim: Record<string, { total: number; count: number }> = {};
  for (const c of comparisons) {
    if (!byDim[c.actionId]) byDim[c.actionId] = { total: 0, count: 0 };
    byDim[c.actionId].total += c.actual;
    byDim[c.actionId].count++;
  }
  const bestDim = Object.entries(byDim).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];

  return { successRate, avgExpected, avgActual, bestDim, comparisons };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ActionOutcomeTracker() {
  const { user }  = useAuth();
  const { state } = useLayoff();
  const scoreResult = state.scoreResult;

  const [completed, setCompleted] = useState<string[]>([]);
  const [outcomes,  setOutcomes]  = useState<ActionOutcome[]>([]);
  const [reporting, setReporting] = useState<string | null>(null);
  const [dbStats, setDbStats]     = useState<DimensionSuccessStats[]>([]);

  useEffect(() => {
    setCompleted(loadCompleted());
    setOutcomes(loadOutcomes());
  }, []);

  // Phase 2: load per-user success rates from Supabase
  useEffect(() => {
    if (!user?.id) return;
    getDimensionSuccessStats(user.id)
      .then(stats => { if (stats.length > 0) setDbStats(stats); })
      .catch(() => {});
  }, [user?.id]);

  const pending = completed.filter(id => !outcomes.find(o => o.actionId === id));

  function recordOutcome(actionId: string, outcomeId: OutcomeId) {
    const updated: ActionOutcome[] = [
      ...outcomes.filter(o => o.actionId !== actionId),
      { actionId, outcomeId, date: new Date().toISOString().slice(0, 10) },
    ];
    setOutcomes(updated);
    saveOutcomes(updated);
    setReporting(null);

    // Phase 2: dual-write to Supabase (fire-and-forget)
    if (user?.id) {
      const uid = user.id;
      const thumbsUp = outcomeId !== 'no_change';
      (async () => {
        await supabase.from('action_completions').upsert(
          {
            user_id:               uid,
            action_id:             actionId,
            action_text:           DIM_LABELS[actionId] ?? actionId,
            completed_at:          new Date().toISOString(),
            thumbs_up:             thumbsUp,
            outcome_notes:         outcomeId,
            feedback_requested_at: new Date().toISOString(),
            score_before:          (scoreResult as { total?: number } | null)?.total ?? null,
          },
          { onConflict: 'user_id,action_id' },
        );
        // Refresh DB stats inline so the learning panel updates immediately
        const stats = await getDimensionSuccessStats(uid);
        if (stats.length > 0) setDbStats(stats);
      })().catch(() => {});
    }
  }

  if (completed.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 24px',
        background: 'rgba(255,255,255,0.02)', borderRadius: 12,
        border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontSize: 13,
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>No actions completed yet</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          Mark actions as done in the Priority Actions tab, then come back here to report what happened.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>
          ACTION OUTCOMES
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Track what happened after each completed action. This improves future recommendations.
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Actions Done',    value: completed.length, color: '#60a5fa' },
          { label: 'Outcomes Logged', value: outcomes.length,  color: '#10b981' },
          { label: 'Awaiting Report', value: pending.length,   color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '12px', borderRadius: 8, textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.07em', marginTop: 4 }}>
              {stat.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* System Intelligence — localStorage stats */}
      {outcomes.length >= 2 && (() => {
        const intel = computeSystemIntelligence(outcomes);
        const delta = intel.avgActual - intel.avgExpected;
        const bestDbStat = dbStats[0] ?? null;

        return (
          <div style={{
            marginBottom: 20, padding: '14px 16px', borderRadius: 10,
            background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(6,182,212,0.7)', letterSpacing: '0.1em', marginBottom: 10 }}>
              🧠 SYSTEM INTELLIGENCE — What we've learned from your data
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: '8px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                  {intel.successRate}%
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>SUCCESS RATE</div>
              </div>
              <div style={{ padding: '8px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: delta >= 0 ? '#10b981' : '#f59e0b', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>VS EXPECTED</div>
              </div>
              <div style={{ padding: '8px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa', lineHeight: 1, marginTop: 2 }}>
                  {DIM_LABELS[intel.bestDim?.[0]] ?? intel.bestDim?.[0] ?? '—'}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>BEST AREA</div>
              </div>
            </div>

            {/* Pattern insight */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: bestDbStat ? 10 : 0 }}>
              {intel.successRate >= 70
                ? `Your actions are working — ${intel.successRate}% resulted in a positive outcome. ${delta > 0 ? 'Impact exceeded expectations.' : 'Keep this momentum.'}`
                : intel.successRate >= 40
                ? `Mixed results so far. Try focusing more on ${DIM_LABELS[intel.bestDim?.[0]] ?? 'your strongest areas'} where you've seen the best outcomes.`
                : `Early data. More actions needed before patterns emerge. Your best area so far: ${DIM_LABELS[intel.bestDim?.[0]] ?? 'undefined'}.`
              }
            </div>

            {/* Phase 2: per-user DB-backed learning insights */}
            {bestDbStat && (
              <div style={{
                padding: '9px 12px', borderRadius: 8,
                background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(16,185,129,0.7)', letterSpacing: '0.08em', marginBottom: 5 }}>
                  PERSONALISED LEARNING
                </div>
                <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 3 }}>
                  Your strongest area: {DIM_LABELS[bestDbStat.dim] ?? bestDbStat.dim} — {Math.round(bestDbStat.successRate * 100)}% success rate
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                  System now prioritises {DIM_LABELS[bestDbStat.dim] ?? bestDbStat.dim} actions in your next audit
                  {dbStats.length > 1 && ` · ${dbStats.length} dimensions tracked`}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Actions pending outcome report */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
            WHAT HAPPENED? ({pending.length} awaiting)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(actionId => {
              const label = DIM_LABELS[actionId] ?? actionId;
              const isReporting = reporting === actionId;

              return (
                <div key={actionId} style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)',
                }}>
                  <button
                    type="button"
                    onClick={() => setReporting(isReporting ? null : actionId)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                        {label} — completed
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        Tap to report outcome
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      {isReporting ? '▲' : '▾'}
                    </span>
                  </button>

                  {isReporting && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 10, marginTop: 10 }}>
                        What actually happened?
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {OUTCOME_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => recordOutcome(actionId, opt.id)}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.12s',
                            }}
                            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logged outcomes */}
      {outcomes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
            OUTCOME LOG
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...outcomes].reverse().map((o, i) => {
              const optLabel = OUTCOME_OPTIONS.find(x => x.id === o.outcomeId)?.label ?? o.outcomeId;
              const actionLabel = DIM_LABELS[o.actionId] ?? o.actionId;
              const positive = o.outcomeId !== 'no_change';

              return (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${positive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{positive ? '🟢' : '⏳'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                      {actionLabel}
                    </div>
                    <div style={{ fontSize: 11, color: positive ? '#10b981' : 'rgba(255,255,255,0.35)' }}>
                      {optLabel}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                    {o.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
