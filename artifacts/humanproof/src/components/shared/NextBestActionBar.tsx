// NextBestActionBar.tsx — Phase 1 (Rules conformance): the DO-THIS-NOW strip.
//
// Rule 5: every screen answers "what is the highest-impact action right now?"
// Rendered at the top of each tool center. Collapsed: the one action + impact/
// effort chips + provenance. Expanded: the full 4-question frame (what happened /
// why it matters / do this / if you skip). Self-contained — give it a tool key
// and the HybridResult; it fetches the profile and computes its own frame, and
// hides itself when there is no defensible action (never fakes one).

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUserProfile, type UserProfile } from '../../services/userProfileService';
import { nextBestActionFor, type SpineTool, type DecisionFrame } from '../../services/decisionSpine';
import { markActionCompleteWithScore } from '../../services/feedbackEngine';
import type { HybridResult } from '../../types/hybridResult';

interface Props {
  tool: SpineTool;
  hr: HybridResult | null;
  /** Accent color matching the host tool (defaults to cyan). */
  accent?: string;
}

const PROV_COLOR: Record<DecisionFrame['confidenceKind'], string> = {
  measured: '#10b981', modeled: '#60a5fa', estimated: '#f59e0b',
};

const QROWS: Array<{ key: 'whatHappened' | 'whyItMatters' | 'ifYouSkip'; label: string; color: string }> = [
  { key: 'whatHappened', label: 'WHAT HAPPENED',   color: 'rgba(255,255,255,0.45)' },
  { key: 'whyItMatters', label: 'WHY IT MATTERS',  color: '#60a5fa' },
  { key: 'ifYouSkip',    label: 'IF YOU SKIP IT',  color: '#ef4444' },
];

export function NextBestActionBar({ tool, hr, accent = 'var(--cyan, #00d4e0)' }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile().then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const frame = useMemo(() => nextBestActionFor(tool, hr, profile), [tool, hr, profile]);
  if (!frame) return null;

  const prov = PROV_COLOR[frame.confidenceKind];

  const handleDone = () => {
    setLogged(true);
    if (user?.id && hr) {
      // Feeds the outcome loop (Phase 4 reads score_before/after to measure real impact).
      markActionCompleteWithScore(user.id, frame.doThis.actionId, frame.doThis.label, hr.total ?? null)
        .catch(() => {});
    }
  };

  return (
    <div
      data-testid="next-best-action-bar"
      style={{
        marginBottom: 18, borderRadius: 13, overflow: 'hidden',
        background: `linear-gradient(135deg, ${accent}10 0%, rgba(255,255,255,0.015) 100%)`,
        border: `1px solid ${accent}38`,
      }}
    >
      {/* Collapsed strip — the one action */}
      <div style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: accent, letterSpacing: '0.14em', fontFamily: 'var(--font-mono, monospace)' }}>
                ▸ DO THIS NOW
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 4, color: prov, background: `${prov}14`, border: `1px solid ${prov}30`, fontFamily: 'var(--font-mono, monospace)' }}>
                {frame.confidence}% · {frame.confidenceKind.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-mono, monospace)' }}>{frame.source}</span>
              {frame.personalizationLevel === 'generic' && (
                <span title="Run an audit / complete your profile so this is tailored to your numbers" style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 4, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)', fontFamily: 'var(--font-mono, monospace)' }}>
                  GENERIC · COMPLETE PROFILE
                </span>
              )}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35, marginBottom: 5 }}>
              {frame.doThis.label}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {frame.impactLabel && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 5, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                  {frame.impactLabel}
                </span>
              )}
              {frame.effortLabel && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 5, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  ⏱ {frame.effortLabel}
                </span>
              )}
              {frame.timelineLabel && (
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 5, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {frame.timelineLabel}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
            {!logged ? (
              <button
                type="button"
                onClick={handleDone}
                style={{ fontSize: 11.5, fontWeight: 800, padding: '7px 14px', borderRadius: 8, cursor: 'pointer', color: '#000', background: accent, border: 'none' }}
              >
                ✓ I did this
              </button>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>✓ Logged — measuring impact</span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 11, fontWeight: 700, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', background: 'none', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              {expanded ? 'Less ▲' : 'Why? ▾'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded — the 4-question frame */}
      {expanded && (
        <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.16)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {QROWS.map(q => (
              <div key={q.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 104, fontSize: 9, fontWeight: 800, color: q.color, letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)', paddingTop: 2 }}>
                  {q.label}
                </span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.66)', lineHeight: 1.55 }}>{frame[q.key]}</span>
              </div>
            ))}
            {frame.doThis.detail && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 104, fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)', paddingTop: 2 }}>
                  HOW
                </span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.66)', lineHeight: 1.55 }}>{frame.doThis.detail}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
