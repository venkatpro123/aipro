// ActionOutcomeTracker.tsx — Phase 7: Learning System
// After taking actions, the user reports what happened.
// Results are stored in localStorage hp_action_outcomes and surfaced back.

import { useState, useEffect } from 'react';

const COMPLETED_KEY = 'hp_completed_actions';
const OUTCOMES_KEY  = 'hp_action_outcomes';

const OUTCOME_OPTIONS = [
  { id: 'manager_recognised',  label: '🌟 Manager recognised my work'         },
  { id: 'new_project',         label: '📋 Assigned to a new / critical project' },
  { id: 'promotion_discussion', label: '🎯 Promotion discussion started'       },
  { id: 'recruiter_outreach',  label: '📩 Recruiter reached out'               },
  { id: 'interview',           label: '🤝 Got an interview'                    },
  { id: 'salary_increase',     label: '💰 Salary increase or bonus'            },
  { id: 'role_change',         label: '🚀 Changed role or company'             },
  { id: 'no_change',           label: '⏳ No visible change yet'               },
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

// Labels for completed action IDs (dimension labels from the priority engine)
const DIM_LABELS: Record<string, string> = {
  D1: 'AI Adaptation', D2: 'Sector Risk', D3: 'Company Risk',
  D4: 'Tenure', D5: 'Geographic Risk', D6: 'Experience Depth',
  D7: 'Seniority', D8: 'Performance', L1: 'Financial Vulnerability',
  L2: 'Company Health', L3: 'Synthetic Risk', L4: 'Funding Stage',
  L5: 'Location Risk', L6: 'Hiring Signal', L7: 'Sentiment',
};

// ── Component ──────────────────────────────────────────────────────────────────

export function ActionOutcomeTracker() {
  const [completed, setCompleted]   = useState<string[]>([]);
  const [outcomes,  setOutcomes]    = useState<ActionOutcome[]>([]);
  const [reporting, setReporting]   = useState<string | null>(null); // actionId being reported

  useEffect(() => {
    setCompleted(loadCompleted());
    setOutcomes(loadOutcomes());
  }, []);

  const pending = completed.filter(id => !outcomes.find(o => o.actionId === id));

  function recordOutcome(actionId: string, outcomeId: OutcomeId) {
    const updated: ActionOutcome[] = [
      ...outcomes.filter(o => o.actionId !== actionId),
      { actionId, outcomeId, date: new Date().toISOString().slice(0, 10) },
    ];
    setOutcomes(updated);
    saveOutcomes(updated);
    setReporting(null);
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
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20,
      }}>
        {[
          { label: 'Actions Done',    value: completed.length,               color: '#60a5fa' },
          { label: 'Outcomes Logged', value: outcomes.length,                color: '#10b981' },
          { label: 'Awaiting Report', value: pending.length,                 color: '#f59e0b' },
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
                      padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
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
