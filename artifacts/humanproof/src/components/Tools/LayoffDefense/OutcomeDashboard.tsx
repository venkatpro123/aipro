// OutcomeDashboard.tsx — Phase 4 (Rules 2 & 11): track OUTCOMES, not activity.
//
// Answers "Am I safer than last month?" from the Twin's real score history, shows
// what ACTUALLY worked (measured score drops, not estimates), the wins the user
// logged (promotions / raises / offers), and lets them log a new win. Every
// number here is a Rule-2 outcome metric — no clicks, no time-spent, no views.

import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { loadTwinLivingState } from '../../../services/careerTwinService';
import { getFeedbackSummary, type ActionROI } from '../../../services/feedbackEngine';
import {
  getOutcomeEvents, recordOutcomeEvent, OUTCOME_LABELS, OUTCOME_ICONS,
  type CareerOutcomeEvent, type OutcomeEventType,
} from '../../../services/careerOutcomeService';

const LOGGABLE: OutcomeEventType[] = ['promotion', 'salary_increase', 'offer_received', 'job_change', 'layoff_avoided'];

export function OutcomeDashboard() {
  const { user } = useAuth();
  const [safer, setSafer] = useState<{ delta: number; from: number; to: number; days: number } | null>(null);
  const [worked, setWorked] = useState<ActionROI[]>([]);
  const [events, setEvents] = useState<CareerOutcomeEvent[]>([]);
  const [logging, setLogging] = useState<OutcomeEventType | null>(null);

  const load = async () => {
    if (!user) return;
    const [living, summary, evs] = await Promise.all([
      loadTwinLivingState().catch(() => null),
      getFeedbackSummary(user.id).catch(() => null),
      getOutcomeEvents(user.id).catch(() => []),
    ]);
    // Am I safer than last month? Latest score vs the earliest within ~35 days.
    const hist = living?.scoreHistory ?? [];
    if (hist.length >= 2) {
      const latest = hist[hist.length - 1];
      const cutoff = Date.now() - 35 * 86_400_000;
      const prior = [...hist.slice(0, -1)].reverse().find(h => new Date(h.date).getTime() <= cutoff) ?? hist[0];
      const days = Math.max(1, Math.round((new Date(latest.date).getTime() - new Date(prior.date).getTime()) / 86_400_000));
      setSafer({ delta: prior.score - latest.score, from: prior.score, to: latest.score, days });
    }
    setWorked((summary?.topEffectiveActions ?? []).filter(a => a.reduction > 0));
    setEvents(evs);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id]);

  const logWin = async (type: OutcomeEventType) => {
    setLogging(type);
    await recordOutcomeEvent(type).catch(() => {});
    await load();
    setLogging(null);
  };

  if (!user) {
    return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '32px 0', textAlign: 'center' }}>Sign in to track your real career outcomes.</div>;
  }

  const saferColor = !safer ? 'rgba(255,255,255,0.5)' : safer.delta > 0 ? '#10b981' : safer.delta < 0 ? '#ef4444' : '#f59e0b';

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Am I safer? */}
      <div style={{ padding: '18px 20px', borderRadius: 13, background: `linear-gradient(135deg, ${saferColor}10 0%, rgba(255,255,255,0.01) 100%)`, border: `1px solid ${saferColor}28`, marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 8 }}>AM I SAFER THAN LAST MONTH?</div>
        {safer ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: saferColor, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
              {safer.delta > 0 ? '↓' : safer.delta < 0 ? '↑' : '→'} {Math.abs(safer.delta)} pts
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {safer.delta > 0 ? `safer than ${safer.days} days ago` : safer.delta < 0 ? `more exposed than ${safer.days} days ago` : 'unchanged'} · risk {safer.from} → {safer.to}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Run a second audit and this tracks your real risk trajectory over time.</div>
        )}
      </div>

      {/* Log a win */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 8 }}>LOG A WIN — THIS IS WHAT SUCCESS LOOKS LIKE</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {LOGGABLE.map(t => (
            <button key={t} type="button" disabled={logging === t} onClick={() => logWin(t)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.72)', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)', opacity: logging === t ? 0.5 : 1 }}>
              <span>{OUTCOME_ICONS[t]}</span> {OUTCOME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* What actually worked (measured) */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#10b981', letterSpacing: '0.1em', marginBottom: 8 }}>WHAT ACTUALLY WORKED — MEASURED, NOT ESTIMATED</div>
        {worked.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            Complete actions and run a follow-up audit — the score drop you actually saw shows up here, replacing the estimate.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {worked.slice(0, 5).map(a => (
              <div key={a.actionId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <span style={{ flex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{a.actionText}</span>
                <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 3, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>MEASURED</span>
                <span style={{ flexShrink: 0, fontSize: 14, fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono, monospace)' }}>−{a.reduction.toFixed(1)} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outcome timeline */}
      {events.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 8 }}>YOUR WINS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.slice(0, 8).map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 14 }}>{OUTCOME_ICONS[e.eventType]}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{OUTCOME_LABELS[e.eventType]}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', fontFamily: 'var(--font-mono, monospace)' }}>{e.eventDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
