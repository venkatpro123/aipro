// ReAuditPromptCard.tsx — Phase 5: nudge users to re-audit after completing actions
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { useNavigate } from 'react-router-dom';
import { getPendingFeedback } from '../../services/feedbackEngine';
import { getReAuditCandidates } from '../../services/actionOutcomeNarrativeEngine';
import type { HybridResult } from '../../types/hybridResult';

export function ReAuditPromptCard() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<{ actionTitle: string; daysSince: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const currentScore = (state.scoreResult as HybridResult | null)?.total ?? null;

  useEffect(() => {
    if (!user || dismissed) return;

    // Check localStorage for dismissed state
    const dismissKey = `hp_reaudit_dismissed_${user.id}`;
    try {
      const dismissedUntil = localStorage.getItem(dismissKey);
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) return;
    } catch { /* */ }

    getPendingFeedback(user.id).then(records => {
      const candidates = getReAuditCandidates(records, currentScore);
      if (candidates.length > 0) {
        setCandidate({
          actionTitle: candidates[0].actionTitle,
          daysSince: candidates[0].daysSinceCompletion,
        });
      }
    }).catch(() => { /* non-fatal */ });
  }, [user, dismissed, currentScore]);

  const handleDismiss = () => {
    setDismissed(true);
    // Suppress for 3 days
    try {
      const dismissKey = `hp_reaudit_dismissed_${user?.id}`;
      const until = new Date(Date.now() + 3 * 86_400_000).toISOString();
      localStorage.setItem(dismissKey, until);
    } catch { /* */ }
  };

  if (!candidate || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="reaudit-prompt"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        style={{
          marginBottom: 14,
          padding: '14px 16px',
          borderRadius: 10,
          background: 'rgba(0,245,255,0.05)',
          border: '1px solid rgba(0,245,255,0.2)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: 8,
          background: 'rgba(0,245,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw size={15} style={{ color: 'var(--cyan)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            Measure your impact
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 10 }}>
            You completed <span style={{ color: 'var(--text)', fontWeight: 600 }}>"{candidate.actionTitle}"</span>{' '}
            {candidate.daysSince} days ago. Re-run your audit to see if your risk score improved.
          </div>
          <button
            type="button"
            onClick={() => navigate('/terminal')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--cyan)', color: '#000',
              border: 'none', borderRadius: 7,
              padding: '6px 14px',
              fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer',
            }}
          >
            Re-run Audit →
          </button>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            flexShrink: 0, background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.25)', cursor: 'pointer', padding: 2,
          }}
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
