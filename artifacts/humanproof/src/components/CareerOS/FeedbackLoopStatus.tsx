// FeedbackLoopStatus — Rule 7 (visible feedback loops)
// Shows the user HOW the system has learned from them.
// Transparency about suppressed actions and cohort contributions.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, EyeOff, Users } from 'lucide-react';
import { loadCareerTwin, type CareerTwinState } from '../../services/careerTwinService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  compact?: boolean;
}

export function FeedbackLoopStatus({ compact = false }: Props) {
  const { user } = useAuth();
  const [twin, setTwin] = useState<CareerTwinState | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) { setChecked(true); return; }
    loadCareerTwin()
      .then(t => setTwin(t))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [user]);

  if (!checked || !twin) return null;

  const suppressedIds = twin.goalsSnapshot?.suppressedActionIds ?? [];
  const suppressedCats = twin.goalsSnapshot?.suppressedCategories ?? [];
  const totalActions = twin.actionsCompletedTotal;

  // Only show when there's meaningful feedback to display
  if (suppressedIds.length === 0 && suppressedCats.length === 0 && totalActions < 3) return null;

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 8,
        background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.1)',
        fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)',
      }}>
        <RefreshCw size={11} color="var(--cyan)" />
        <span>
          System has learned from{' '}
          <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{totalActions}</span>
          {' '}completed actions
          {suppressedIds.length > 0 && (
            <> · <span style={{ color: '#f59e0b' }}>{suppressedIds.length} suppressed</span></>
          )}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '16px 18px', borderRadius: 12,
        background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={13} color="var(--cyan)" />
        <span style={{
          fontSize: '0.7rem', fontWeight: 800, color: 'var(--cyan)',
          letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)',
        }}>
          SYSTEM LEARNING FROM YOU
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Total actions → cohort contribution */}
        {totalActions >= 3 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Users size={12} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{totalActions} actions completed</span>
              {' '}— your outcomes contribute to peer benchmarks for users with your profile
            </span>
          </div>
        )}

        {/* Suppressed action categories */}
        {suppressedCats.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <EyeOff size={12} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{suppressedCats.length} recommendation type{suppressedCats.length > 1 ? 's' : ''}</span>
              {' '}marked not helpful —{' '}
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {suppressedCats.slice(0, 3).join(', ')}
              </span>
              {' '}deprioritised for you
            </div>
          </div>
        )}

        {/* Goal alignment */}
        {twin.goalsSnapshot?.primaryGoal && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Recommendations aligned to your goal:{' '}
              <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>"{twin.goalsSnapshot.primaryGoal}"</span>
            </span>
          </div>
        )}

      </div>
    </motion.div>
  );
}
