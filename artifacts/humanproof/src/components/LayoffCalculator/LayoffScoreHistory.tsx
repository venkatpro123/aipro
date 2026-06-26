import React, { useEffect, useState } from 'react';
import { getLayoffScoreHistory, ScoreHistoryEntry, clearLayoffScoreHistory } from '../../services/scoreStorageService';

interface Props {
  refreshKey?: number;
}

// ── ENHANCEMENT: Outcome feedback — stores per-entry outcome in localStorage ──
const OUTCOME_KEY = 'hp_layoff_score_outcomes';
type OutcomeMap = Record<string, 'correct' | 'incorrect' | 'pending'>;

const getOutcomes = (): OutcomeMap => {
  try { return JSON.parse(localStorage.getItem(OUTCOME_KEY) || '{}'); }
  catch { return {}; }
};
const setOutcome = (id: string, outcome: 'correct' | 'incorrect') => {
  const map = getOutcomes();
  map[id] = outcome;
  localStorage.setItem(OUTCOME_KEY, JSON.stringify(map));
};

export const LayoffScoreHistory: React.FC<Props> = ({ refreshKey = 0 }) => {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [outcomes, setOutcomes] = useState<OutcomeMap>({});

  useEffect(() => {
    const data = getLayoffScoreHistory().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setHistory(data);
    setOutcomes(getOutcomes());
  }, [refreshKey]);

  if (history.length === 0) return null;

  const handleClearRequest = () => setConfirmClear(true);
  const handleClearConfirm = () => {
    clearLayoffScoreHistory();
    setHistory([]);
    setConfirmClear(false);
  };

  const handleOutcome = (id: string, outcome: 'correct' | 'incorrect') => {
    setOutcome(id, outcome);
    setOutcomes(prev => ({ ...prev, [id]: outcome }));
  };

  const getTierHex = (c: string) => {
    const map: Record<string, string> = {
      red: '#ef4444', orange: '#f97316', amber: '#f59e0b', green: '#10b981', teal: '#14b8a6',
    };
    return map[c] || '#00F5FF';
  };

  // ── ENHANCEMENT: Compute risk velocity (point change) between consecutive same-company scores ──
  const getVelocity = (entry: ScoreHistoryEntry, index: number): { delta: number; direction: 'up' | 'down' | 'neutral' } | null => {
    const prev = history.find((e, i) =>
      i > index &&
      e.companyName.toLowerCase() === entry.companyName.toLowerCase() &&
      e.roleTitle.toLowerCase() === entry.roleTitle.toLowerCase()
    );
    if (!prev) return null;
    const delta = entry.score - prev.score;
    if (Math.abs(delta) < 3) return { delta: 0, direction: 'neutral' };
    return { delta, direction: delta > 0 ? 'up' : 'down' };
  };

  // ── ENHANCEMENT: How many months ago was the score? Show "Is this still true?" nudge ──
  const isOldEnoughForFeedback = (timestamp: string) => {
    const months = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months >= 2; // Show after 2 months
  };

  return (
    <div style={{
      marginTop: '40px',
      padding: '24px',
      background: 'var(--alpha-bg-04)',
      borderRadius: '12px',
      border: '1px solid var(--alpha-bg-06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--text)', margin: 0 }}>Your Score History</h3>

        {confirmClear ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#9ba5b4', fontSize: '0.8rem' }}>Clear all?</span>
            <button
              onClick={handleClearConfirm}
              aria-label="Confirm clear history"
              style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
                color: '#ef4444', padding: '4px 10px', borderRadius: '4px',
                cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              Yes, clear
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              aria-label="Cancel clear history"
              style={{
                background: 'none', border: 'none',
                color: '#9ba5b4', cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleClearRequest}
            aria-label="Clear history"
            style={{
              background: 'none', border: 'none', color: '#6b7280',
              fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
        {history.map((entry, index) => {
          const d = new Date(entry.timestamp);
          const hex = getTierHex(entry.tierColor);
          const velocity = getVelocity(entry, index);
          const outcome = outcomes[entry.id];
          const showFeedback = isOldEnoughForFeedback(entry.timestamp) && !outcome;

          return (
            <div key={entry.id} style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg2, #111827)',
              borderRadius: '10px',
              borderLeft: `4px solid ${hex}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '1.1rem' }}>
                      {entry.score}%
                    </span>
                    {/* ── ENHANCEMENT: Risk velocity indicator ── */}
                    {velocity && velocity.direction !== 'neutral' && (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: velocity.direction === 'up' ? '#ef4444' : '#10b981',
                        background: velocity.direction === 'up' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                        padding: '2px 7px',
                        borderRadius: '10px',
                      }}>
                        {velocity.direction === 'up' ? '▲' : '▼'} {Math.abs(velocity.delta)} pts
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#9ba5b4', fontSize: '0.85rem', marginTop: '2px' }}>
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {entry.companyName}
                  </div>
                  {entry.roleTitle && (
                    <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '2px' }}>
                      {entry.roleTitle} {entry.department ? `(${entry.department})` : ''}
                    </div>
                  )}
                </div>
                <div style={{
                  background: `${hex}15`,
                  color: hex,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  border: `1px solid ${hex}30`,
                }}>
                  {entry.tier}
                </div>
              </div>

              {/* ── ENHANCEMENT: Outcome feedback loop ── */}
              {showFeedback && (
                <div style={{
                  padding: '10px 16px 12px',
                  borderTop: '1px solid var(--alpha-bg-06)',
                  background: 'var(--alpha-bg-04)',
                }}>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0 0 8px' }}>
                    Was this prediction accurate? (helps us improve)
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOutcome(entry.id, 'correct')}
                      style={{
                        padding: '4px 12px', borderRadius: '6px',
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        color: '#10b981', fontSize: '0.78rem', cursor: 'pointer',
                      }}
                    >
                      ✓ Yes, it was
                    </button>
                    <button
                      onClick={() => handleOutcome(entry.id, 'incorrect')}
                      style={{
                        padding: '4px 12px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer',
                      }}
                    >
                      ✗ No, it wasn't
                    </button>
                  </div>
                </div>
              )}
              {outcome && (
                <div style={{
                  padding: '8px 16px',
                  borderTop: '1px solid var(--alpha-bg-06)',
                  background: 'var(--alpha-bg-04)',
                  fontSize: '0.73rem',
                  color: outcome === 'correct' ? '#10b981' : '#6b7280',
                }}>
                  {outcome === 'correct'
                    ? '✓ You marked this as correct — thank you for the feedback!'
                    : '✗ Noted. This helps us recalibrate our models.'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
