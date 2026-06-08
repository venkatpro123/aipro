// CareerMomentAlert.tsx — Phase 9: Time-sensitive career moment banners
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { fetchUserProfile } from '../../services/userProfileService';
import { detectCareerMoments, type CareerMoment } from '../../services/proactiveInsightEngine';
import type { HybridResult } from '../../types/hybridResult';

const URGENCY_STYLE: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
  immediate: {
    border: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.06)',
    badge: '#ef4444',
    badgeText: 'ACT NOW',
  },
  this_week: {
    border: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.05)',
    badge: '#f59e0b',
    badgeText: 'THIS WEEK',
  },
  this_month: {
    border: 'rgba(0,212,255,0.25)',
    bg: 'rgba(0,212,255,0.04)',
    badge: 'var(--cyan)',
    badgeText: 'THIS MONTH',
  },
};

function MomentBanner({
  moment,
  onDismiss,
}: {
  moment: CareerMoment;
  onDismiss: (id: string) => void;
}) {
  const navigate = useNavigate();
  const style = URGENCY_STYLE[moment.urgency] ?? URGENCY_STYLE.this_month;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', borderRadius: 10,
        border: `1px solid ${style.border}`,
        background: style.bg,
        marginBottom: 8,
      }}
    >
      <AlertTriangle size={16} style={{ color: style.badge, flexShrink: 0, marginTop: 2 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
            color: style.badge, padding: '2px 6px', borderRadius: 4,
            background: `${style.badge}18`,
          }}>
            {style.badgeText}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3, lineHeight: 1.3 }}>
          {moment.headline}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          {moment.detail}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => navigate(moment.actionRoute)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: style.badge === '#ef4444' ? '#ef4444' : style.badge === '#f59e0b' ? '#f59e0b' : 'var(--cyan)',
            color: '#000', fontSize: 11, fontWeight: 800,
          }}
        >
          {moment.actionLabel}
          <ArrowRight size={11} />
        </button>
        <button
          onClick={() => onDismiss(moment.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

const DISMISSED_KEY = 'hp_dismissed_moments';

function getDismissed(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]')); }
  catch { return new Set(); }
}

function persistDismissed(ids: Set<string>) {
  try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids])); } catch { /* */ }
}

export function CareerMomentAlert() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [moments, setMoments] = useState<CareerMoment[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchUserProfile();
        const ms = await detectCareerMoments(user.id, (state.scoreResult as HybridResult | null), profile);
        if (!cancelled) setMoments(ms);
      } catch { /* non-fatal */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id, state.scoreResult]);

  const handleDismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  };

  const visible = moments.filter(m => !dismissed.has(m.id));
  if (!user || visible.length === 0) return null;

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <AnimatePresence mode="popLayout">
        {visible.map(m => (
          <MomentBanner key={m.id} moment={m} onDismiss={handleDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
