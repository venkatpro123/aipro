// FeedbackSummaryPanel.tsx — Feedback summary used on /os home and transparency tab
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, CheckCircle2, ThumbsUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getFeedbackSummary, submitThumbsFeedback, getPendingFeedback } from '../../services/feedbackEngine';
import type { FeedbackSummary, ActionFeedbackRecord } from '../../services/feedbackEngine';
import { useLayoff } from '../../context/LayoffContext';
import type { HybridResult } from '../../types/hybridResult';

function PendingFeedbackCard({ record, onSubmitted }: { record: ActionFeedbackRecord; onSubmitted: () => void }) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [submitted, setSubmitted] = useState(false);
  const currentScore = (state.scoreResult as HybridResult | null)?.total ?? null;

  const submit = async (thumbsUp: boolean) => {
    if (!user) return;
    await submitThumbsFeedback(user.id, record.actionId, thumbsUp, currentScore);
    setSubmitted(true);
    setTimeout(onSubmitted, 1200);
  };

  const daysAgo = Math.floor((Date.now() - new Date(record.completedAt).getTime()) / 86_400_000);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: submitted ? 0 : 1, x: 0 }}
      style={{
        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 10, padding: '12px 14px',
      }}
    >
      {submitted ? (
        <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={14} /> Thanks for the feedback!
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {record.actionText || record.actionId}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
            Completed {daysAgo}d ago — did it help?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => submit(true)} style={feedbackBtnStyle('#10b981')}>
              <ThumbsUp size={12} /> Yes, it helped
            </button>
            <button onClick={() => submit(false)} style={feedbackBtnStyle('#ef4444')}>
              Not really
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

const feedbackBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7,
  border: `1px solid ${color}40`, background: `${color}10`, color,
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
});

interface Props {
  compact?: boolean;
}

export function FeedbackSummaryPanel({ compact = false }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [pending, setPending] = useState<ActionFeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    if (!user) return;
    Promise.all([
      getFeedbackSummary(user.id),
      getPendingFeedback(user.id),
    ]).then(([s, p]) => {
      setSummary(s);
      setPending(p);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, [user]);

  const handleFeedbackSubmitted = () => {
    reload();
  };

  if (loading) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
        Loading feedback…
      </div>
    );
  }

  if (!summary?.hasData && pending.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
        Complete actions to start tracking your ROI.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>This Month</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{summary.actionsCompletedThisMonth}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>actions done</div>
          </div>
          {summary.estimatedScoreImpact !== null && (
            <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Score Impact</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: summary.estimatedScoreImpact < 0 ? '#10b981' : '#f59e0b' }}>
                {summary.estimatedScoreImpact > 0 ? '+' : ''}{summary.estimatedScoreImpact} pts
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>measured reduction</div>
            </div>
          )}
          {summary.pendingFeedbackCount > 0 && (
            <div className="card-premium" style={{ padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Feedback Due</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)' }}>{summary.pendingFeedbackCount}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>awaiting response</div>
            </div>
          )}
        </div>
      )}

      {/* Pending feedback prompts */}
      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Feedback Requests
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.slice(0, compact ? 1 : 3).map(r => (
              <PendingFeedbackCard key={r.actionId} record={r} onSubmitted={handleFeedbackSubmitted} />
            ))}
          </div>
        </div>
      )}

      {/* Top effective actions */}
      {!compact && summary && summary.topEffectiveActions.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Your Most Effective Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {summary.topEffectiveActions.map((a, i) => (
              <div key={a.actionId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', width: 18, flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.actionText}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <TrendingDown size={12} color="#10b981" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>−{Math.abs(a.reduction)} pts</span>
                </div>
                {a.thumbsUp !== null && (
                  <ThumbsUp size={12} color={a.thumbsUp ? '#10b981' : 'rgba(255,255,255,0.2)'} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
