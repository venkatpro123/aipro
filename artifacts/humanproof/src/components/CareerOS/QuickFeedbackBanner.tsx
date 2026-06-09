// QuickFeedbackBanner — Rule 7 (14-day follow-up, highest response-rate window)
// Shows 14 days after an action was marked complete if no feedback was submitted.
// On response → submitActionFeedback() → Career Twin suppresses unhelpful actions.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { loadCompletionsLocal } from '../../services/actionCompletionService';
import { submitActionFeedback } from '../../services/actionCompletionService';
import { supabase } from '../../utils/supabase';

interface PendingFeedback {
  actionId: string;
  actionText: string;
  completedAt: string;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const LS_FEEDBACK_SUBMITTED_KEY = 'hp.feedback.submitted';

function getFeedbackSubmitted(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_FEEDBACK_SUBMITTED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function markFeedbackSubmitted(actionId: string) {
  try {
    const existing = getFeedbackSubmitted();
    existing.add(actionId);
    localStorage.setItem(LS_FEEDBACK_SUBMITTED_KEY, JSON.stringify(Array.from(existing)));
  } catch { /* quota */ }
}

export function QuickFeedbackBanner() {
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    async function findPendingFeedback() {
      const completedIds = loadCompletionsLocal();
      if (completedIds.size === 0) return;
      const alreadySubmitted = getFeedbackSubmitted();

      // Load completion timestamps from Supabase (or fallback to localStorage ts)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('user_action_completions')
          .select('action_id, action_text, completed_at, user_feedback')
          .eq('user_id', user.id)
          .is('user_feedback', null)         // no feedback yet
          .order('completed_at', { ascending: false })
          .limit(20);

        if (!data) return;
        const now = Date.now();
        for (const row of data) {
          const id = row.action_id as string;
          if (alreadySubmitted.has(id)) continue;
          if (!row.completed_at) continue;
          const age = now - new Date(row.completed_at as string).getTime();
          if (age >= FOURTEEN_DAYS_MS) {
            setPending({
              actionId: id,
              actionText: (row.action_text as string | null) ?? 'that action',
              completedAt: row.completed_at as string,
            });
            return; // show only the most recent qualifying one
          }
        }
      } catch { /* offline — skip */ }
    }
    void findPendingFeedback();
  }, []);

  async function handleResponse(helpful: boolean) {
    if (!pending) return;
    setResponded(true);
    markFeedbackSubmitted(pending.actionId);
    await submitActionFeedback(
      pending.actionId,
      helpful ? 4 : 2,
    );
    setTimeout(() => setPending(null), 2000);
  }

  if (!pending || dismissed) return null;

  const daysAgo = Math.round((Date.now() - new Date(pending.completedAt).getTime()) / 86400000);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        style={{
          marginBottom: 12, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(0,245,255,0.05)',
          border: '1px solid rgba(0,245,255,0.18)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}
      >
        {responded ? (
          <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600, flex: 1 }}>
            Thanks — the system will factor that in going forward.
          </span>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.4 }}>
                You did{' '}
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>
                  "{pending.actionText}"
                </span>
                {' '}{daysAgo} days ago. Did it help?
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => handleResponse(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                  color: '#10b981', fontSize: '0.78rem', fontWeight: 700,
                }}
              >
                <ThumbsUp size={12} /> Yes, helped
              </button>
              <button
                type="button"
                onClick={() => handleResponse(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', fontSize: '0.78rem', fontWeight: 700,
                }}
              >
                <ThumbsDown size={12} /> Not really
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer', padding: '6px', borderRadius: 5,
                }}
              >
                <X size={13} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
