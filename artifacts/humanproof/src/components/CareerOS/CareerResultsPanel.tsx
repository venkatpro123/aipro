// CareerResultsPanel — Rule 2 (Outcome Monopoly), Rule 18 (Cohort Benchmarks)
// Shows what actually happened from your actions — not predictions.
// "YOUR RESULTS" is the north star metric, not the risk score.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { getFeedbackSummary, type ActionROI } from '../../services/feedbackEngine';
import { getOutcomeSummary, type OutcomeSummary, OUTCOME_LABELS, OUTCOME_ICONS } from '../../services/careerOutcomeService';
import type { HybridResult } from '../../types/hybridResult';

interface Props {
  onRecordOutcome?: () => void;
  /** Increment to trigger a re-fetch after a new outcome is recorded */
  refreshKey?: number;
}

export function CareerResultsPanel({ onRecordOutcome, refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [roi, setRoi] = useState<ActionROI[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const hr = state.scoreResult as HybridResult | null;
  const riskScore = hr?.total ?? null;
  const readiness = riskScore !== null ? 100 - riskScore : null;

  useEffect(() => {
    if (!user) { setChecked(true); return; }
    setLoading(true);
    Promise.all([
      getFeedbackSummary(user.id),
      getOutcomeSummary(user.id),
    ])
      .then(([summary, outcomeSummary]) => {
        const effective = (summary.topEffectiveActions ?? []).filter(a => a.reduction > 0);
        setRoi(effective.slice(0, 4));
        setOutcomes(outcomeSummary);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setChecked(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  if (!checked || loading) return null;

  const hasAnyData = roi.length > 0 || (outcomes?.events?.length ?? 0) > 0;
  const totalWins = (outcomes?.totalWins ?? 0) + roi.filter(r => r.reduction > 2).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={14} color="#10b981" />
          <span style={{
            fontSize: '0.72rem', fontWeight: 800, color: '#10b981',
            letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)',
          }}>
            YOUR RESULTS
          </span>
          {totalWins > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem',
              fontWeight: 800, background: 'rgba(16,185,129,0.12)',
              color: '#10b981', border: '1px solid rgba(16,185,129,0.2)',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {totalWins} WIN{totalWins > 1 ? 'S' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRecordOutcome}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.2)',
            borderRadius: 7, color: 'var(--cyan)', fontSize: '0.75rem',
            fontWeight: 700, padding: '5px 12px', cursor: 'pointer',
          }}
        >
          <Plus size={11} />
          Record outcome
        </button>
      </div>

      {!hasAnyData ? (
        /* Empty state — first-time user */
        <div style={{
          padding: '20px 22px', borderRadius: 12,
          background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Complete actions to see measured results here —{' '}
            or <button type="button" onClick={onRecordOutcome} style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>record an outcome</button> like a salary increase, promotion, or new role.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Readiness trend + action count summary */}
          {readiness !== null && (
            <div style={{
              display: 'flex', gap: 16, flexWrap: 'wrap',
              padding: '14px 16px', borderRadius: 10,
              background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)',
            }}>
              <div style={{ textAlign: 'center' as const }}>
                <div style={{ fontWeight: 800, fontSize: '1.6rem', color: '#10b981', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                  {readiness}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>readiness now</div>
              </div>
              {roi.length > 0 && (
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--cyan)', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                    {roi.length}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>measured actions</div>
                </div>
              )}
              {roi.length > 0 && (
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontWeight: 800, fontSize: '1.6rem', color: '#f59e0b', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                    −{roi.reduce((sum, a) => sum + a.reduction, 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>risk pts removed</div>
                </div>
              )}
            </div>
          )}

          {/* Measured action ROI */}
          {roi.length > 0 && (
            <div className="card-premium" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--font-mono, monospace)' }}>
                WHAT WORKED — MEASURED OUTCOMES
                <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.6rem' }}>MEASURED</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {roi.map((action, i) => (
                  <motion.div
                    key={action.actionId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 800, color: '#10b981',
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {action.actionText}
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 4 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((action.reduction / 20) * 100, 100)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.07 }}
                          style={{ height: '100%', background: '#10b981', borderRadius: 2 }}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
                      −{action.reduction.toFixed(1)}pts
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* User-recorded career outcomes */}
          {(outcomes?.events?.length ?? 0) > 0 && (
            <div className="card-premium" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'var(--font-mono, monospace)' }}>
                YOUR CAREER MILESTONES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {outcomes!.events.slice(0, 4).map((evt) => (
                  <div key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{OUTCOME_ICONS[evt.eventType]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>
                        {OUTCOME_LABELS[evt.eventType]}
                        {evt.roleTitle && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> — {evt.roleTitle}</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                        {new Date(evt.eventDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {evt.companyName && ` · ${evt.companyName}`}
                      </div>
                    </div>
                    <TrendingUp size={11} color="rgba(16,185,129,0.5)" style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
