// RecommendationAccuracyCard.tsx — Honest prediction vs. actual score reduction display
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingDown, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getActionROIList } from '../../services/feedbackEngine';
import type { ActionROI } from '../../services/feedbackEngine';

interface AccuracyRow {
  actionText: string;
  actualReduction: number;
  reduction: number;
  thumbsUp: boolean | null;
}

function AccuracyBadge({ delta }: { delta: number }) {
  const abs = Math.abs(delta);
  if (abs <= 3) return <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>Accurate</span>;
  if (delta > 0) return <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>Over-estimated</span>;
  return <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Under-estimated</span>;
}

interface Props {
  /** If provided, shows predicted vs. actual for these action IDs */
  predictedReductions?: Record<string, number>;
}

export function RecommendationAccuracyCard({ predictedReductions = {} }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<AccuracyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getActionROIList(user.id).then((roi: ActionROI[]) => {
      const measured = roi.filter(a => a.reduction !== 0).slice(0, 6);
      setRows(measured.map(a => ({
        actionText: a.actionText,
        actualReduction: a.reduction,
        reduction: a.reduction,
        thumbsUp: a.thumbsUp ?? null,
      })));
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
        Loading accuracy data…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
        Complete actions and record a follow-up audit to see prediction accuracy.
      </div>
    );
  }

  const avgReduction = rows.reduce((s, r) => s + r.reduction, 0) / rows.length;
  const positiveCount = rows.filter(r => r.reduction > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={16} color="var(--cyan)" />
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Prediction Accuracy</div>
        <div
          title="We compare your score before and after each completed action to measure actual impact."
          style={{ cursor: 'help', color: 'rgba(255,255,255,0.25)' }}
        >
          <Info size={13} />
        </div>
      </div>

      {/* Aggregate */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="card-premium" style={{ padding: '10px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Avg Reduction</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: avgReduction > 0 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
            {avgReduction > 0 ? '−' : ''}{Math.abs(Math.round(avgReduction * 10) / 10)} pts
          </div>
        </div>
        <div className="card-premium" style={{ padding: '10px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Positive Impact</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
            {rows.length > 0 ? Math.round((positiveCount / rows.length) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Per-action rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row, i) => {
          const predicted = predictedReductions[row.actionText] ?? null;
          const delta = predicted != null ? predicted - row.actualReduction : null;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <TrendingDown size={14} color={row.reduction > 0 ? '#10b981' : 'rgba(255,255,255,0.3)'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.actionText}
                </div>
                {delta !== null && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    Predicted: −{predicted} pts · Actual: −{row.actualReduction} pts
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: row.reduction > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                  {row.reduction > 0 ? '−' : '+'}{Math.abs(row.actualReduction)} pts
                </div>
                {delta !== null && <AccuracyBadge delta={delta} />}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        Score change measured between completion date and next audit
      </div>
    </div>
  );
}
