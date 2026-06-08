// ActionCompletionTracker.tsx — Action cards with checkbox + deferred thumbs feedback
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { markActionCompleteWithScore, submitThumbsFeedback } from '../../services/feedbackEngine';
import type { HybridResult } from '../../types/hybridResult';

export interface TrackedAction {
  id: string;
  title: string;
  effortBadge?: string;
  priority?: string;
  category?: string;
}

interface ActionCardProps {
  action: TrackedAction;
  initialCompleted?: boolean;
  onCompleted?: (id: string) => void;
}

function ActionCard({ action, initialCompleted = false, onCompleted }: ActionCardProps) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [completed, setCompleted] = useState(initialCompleted);
  const [toggling, setToggling] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const currentScore = (state.scoreResult as HybridResult | null)?.total ?? null;

  const toggle = async () => {
    if (toggling || !user) return;
    setToggling(true);
    if (!completed) {
      const ok = await markActionCompleteWithScore(user.id, action.id, action.title, currentScore);
      if (ok) {
        setCompleted(true);
        onCompleted?.(action.id);
        // Show feedback prompt after 400ms
        setTimeout(() => setShowFeedback(true), 400);
      }
    } else {
      // Unmark — just toggle locally (no delete needed for UI purposes)
      setCompleted(false);
      setShowFeedback(false);
    }
    setToggling(false);
  };

  const submitFeedback = async (thumbsUp: boolean) => {
    if (!user) return;
    await submitThumbsFeedback(user.id, action.id, thumbsUp, currentScore);
    setFeedbackSubmitted(true);
    setTimeout(() => setShowFeedback(false), 1400);
  };

  const priorityColor =
    action.priority === 'Critical' ? '#ef4444'
    : action.priority === 'High'   ? '#f59e0b'
    : action.priority === 'Medium' ? 'var(--cyan)'
    : 'rgba(255,255,255,0.4)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: completed ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${completed ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10, padding: '12px 14px',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <button
          onClick={toggle}
          disabled={toggling}
          style={{ background: 'none', border: 'none', cursor: toggling ? 'default' : 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed
            ? <CheckCircle2 size={20} color="#10b981" />
            : <Circle size={20} color="rgba(255,255,255,0.25)" />
          }
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: completed ? 'rgba(255,255,255,0.4)' : 'var(--text)',
            textDecoration: completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>
            {action.title}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            {action.priority && (
              <span style={{ fontSize: 10, fontWeight: 700, color: priorityColor, background: `${priorityColor}15`, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {action.priority}
              </span>
            )}
            {action.effortBadge && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6 }}>
                {action.effortBadge}
              </span>
            )}
            {action.category && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '2px 4px', borderRadius: 4 }}>
                {action.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline feedback prompt */}
      <AnimatePresence>
        {showFeedback && !feedbackSubmitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flex: 1 }}>Did this help?</span>
              <button onClick={() => submitFeedback(true)} style={thumbBtnStyle('#10b981')} aria-label="Yes, helpful">
                <ThumbsUp size={13} /> Yes
              </button>
              <button onClick={() => submitFeedback(false)} style={thumbBtnStyle('#ef4444')} aria-label="Not helpful">
                <ThumbsDown size={13} /> No
              </button>
            </div>
          </motion.div>
        )}
        {showFeedback && feedbackSubmitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 8, fontSize: 12, color: '#10b981' }}
          >
            Thanks for the feedback!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const thumbBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7,
  border: `1px solid ${color}40`, background: `${color}10`, color,
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
});

interface Props {
  actions: TrackedAction[];
  completedIds?: Set<string>;
  title?: string;
  onActionCompleted?: (id: string) => void;
}

export function ActionCompletionTracker({ actions, completedIds = new Set(), title = 'Action Plan', onActionCompleted }: Props) {
  const completedCount = actions.filter(a => completedIds.has(a.id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{title}</div>
        {actions.length > 0 && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>{completedCount}</span> / {actions.length} done
          </div>
        )}
      </div>

      {/* Progress bar */}
      {actions.length > 0 && (
        <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((completedCount / actions.length) * 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, var(--cyan))', borderRadius: 4 }}
          />
        </div>
      )}

      {actions.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
          Run an audit to generate your personalized action plan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              initialCompleted={completedIds.has(action.id)}
              onCompleted={onActionCompleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
