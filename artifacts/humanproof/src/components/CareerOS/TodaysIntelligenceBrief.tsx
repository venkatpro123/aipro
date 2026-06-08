// TodaysIntelligenceBrief.tsx — Phase 1: The System Speaks
// The Career OS voice. Greets the user, tells them what changed, why it matters, what to do today.
// Calls intelligenceBriefService (which uses the llm-analyze EF) and renders the result
// as a living 3-sentence narrative. Gracefully shows nothing if the EF fails.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import type { HybridResult } from '../../types/hybridResult';
import { fetchIntelligenceBrief, type IntelligenceBriefResult } from '../../services/intelligenceBriefService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGreeting(email: string, hour: number): string {
  const name = email.split('@')[0].split('.')[0];
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  if (hour < 12) return `Good morning, ${capitalized}.`;
  if (hour < 17) return `Good afternoon, ${capitalized}.`;
  return `Good evening, ${capitalized}.`;
}

function buildVelocityClause(
  velocity: number | null,
  drift: { drift: number; daysSince: number } | null,
): string {
  const v = velocity ?? (drift ? drift.drift / Math.max(drift.daysSince / 30, 1) : null);
  if (v === null || Math.abs(v) < 0.5) return '';
  if (v > 0) return ` Your risk has been rising ${v.toFixed(1)} pts/month.`;
  return ` Your risk has been improving ${Math.abs(v).toFixed(1)} pts/month — keep going.`;
}

const URGENCY_BAR: Record<string, { color: string; label: string }> = {
  CRITICAL: { color: '#ef4444', label: 'CRITICAL' },
  HIGH:     { color: '#f97316', label: 'HIGH PRIORITY' },
  MODERATE: { color: '#f59e0b', label: 'MONITOR' },
  LOW:      { color: '#10b981', label: 'LOOKING GOOD' },
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[100, 85, 70].map((w, i) => (
        <div key={i} style={{
          height: 13, borderRadius: 6, width: `${w}%`,
          background: 'rgba(255,255,255,0.06)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TodaysIntelligenceBrief() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [brief, setBrief] = useState<IntelligenceBriefResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const scoreResult = state.scoreResult as HybridResult | null;
  const companyName = state.companyName;
  const roleTitle = state.roleTitle;

  // Don't render at all if no audit has been run
  const hasAudit = scoreResult !== null && companyName && roleTitle;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!hasAudit || !user) return;

    setLoading(true);
    fetchIntelligenceBrief(
      companyName!,
      roleTitle!,
      scoreResult as unknown as Record<string, unknown>,
      user.id,
    )
      .then(result => { if (result) setBrief(result); })
      .catch(() => {/* silent — component simply won't render */})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyName, roleTitle, user?.id]);

  // Don't render until hydrated (prevents SSR flash)
  if (!mounted || !hasAudit) return null;

  const hour = new Date().getHours();
  const greeting = user?.email ? buildGreeting(user.email, hour) : null;
  const velocity = (scoreResult as HybridResult)?.scoreTrajectory?.velocityPtsPerMonth ?? null;
  const velocityClause = buildVelocityClause(velocity, state.alertDrift);
  const urgencyMeta = brief ? (URGENCY_BAR[brief.urgencyLevel] ?? URGENCY_BAR.MODERATE) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ marginBottom: 24 }}
    >
      <div
        className="card-premium"
        style={{
          padding: '20px 24px',
          borderLeft: urgencyMeta ? `3px solid ${urgencyMeta.color}` : '3px solid rgba(0,245,255,0.3)',
          background: 'rgba(255,255,255,0.025)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Urgency badge + icon row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Sparkles size={14} style={{ color: urgencyMeta?.color ?? 'var(--cyan)', flexShrink: 0 }} />
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            color: urgencyMeta?.color ?? 'var(--cyan)',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            INTELLIGENCE BRIEF
          </span>
          {urgencyMeta && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
              padding: '2px 7px', borderRadius: 4,
              background: `${urgencyMeta.color}18`,
              border: `1px solid ${urgencyMeta.color}35`,
              color: urgencyMeta.color,
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {urgencyMeta.label}
            </span>
          )}
          {brief?.fromCache && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
              cached
            </span>
          )}
        </div>

        {/* Narrative content */}
        {loading ? (
          <BriefSkeleton />
        ) : brief ? (
          <>
            {greeting && (
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {greeting}
              </div>
            )}
            <div style={{
              fontSize: '0.88rem', lineHeight: 1.65,
              color: 'rgba(255,255,255,0.78)',
            }}>
              {brief.paragraphs[0]}
              {velocityClause && (
                <span style={{ color: velocity !== null && velocity > 0 ? '#f97316' : '#10b981' }}>
                  {velocityClause}
                </span>
              )}
            </div>
            {brief.paragraphs[1] && (
              <div style={{
                fontSize: '0.84rem', lineHeight: 1.6,
                color: 'rgba(255,255,255,0.55)',
                marginTop: 6,
              }}>
                {brief.paragraphs[1]}
              </div>
            )}
            {brief.topActionThisWeek && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'rgba(0,245,255,0.05)',
                border: '1px solid rgba(0,245,255,0.15)',
                borderRadius: 8,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <AlertTriangle size={13} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.08em', marginBottom: 3 }}>
                    TOP ACTION THIS WEEK
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                    {brief.topActionThisWeek}
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'terminal' } }))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7, padding: '5px 12px',
                  fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', transition: 'all 150ms',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--cyan)'; el.style.color = 'var(--cyan)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.12)'; el.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                Re-run audit <ArrowRight size={11} />
              </button>
            </div>
          </>
        ) : (
          // Silent fail — no brief yet, show minimal greeting only
          greeting ? (
            <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)' }}>
              {greeting} Your career intelligence is loading...
            </div>
          ) : null
        )}
      </div>
    </motion.div>
  );
}
