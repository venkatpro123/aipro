// _readinessShared.tsx — shared presentational primitives for the readiness diagnostic panels.
// Keeps the rebuilt tabs (Resume/LinkedIn/Interview/Portfolio/Referral) consistent: a score ring,
// sub-score bars, an improvement list with impact, and a projected-after-improvement strip.

import { useEffect, useState } from 'react';
import type { ReadinessDiagnostic, ImprovementAction, ConfidenceKind } from '../../../services/readinessDiagnostics';
import {
  type ReadinessTab,
  readinessActionId,
  logReadinessAction,
  rateReadinessAction,
  getReadinessActionStates,
  getReadinessTabSuccess,
  type ReadinessActionState,
} from '../../../services/readinessOutcomeService';

const ACCENT = '#a78bfa';

export interface TrackingCtx {
  userId: string;
  tab: ReadinessTab;
  scoreNow: number;
}

export function scoreColor(s: number): string {
  return s >= 75 ? '#10b981' : s >= 58 ? '#34d399' : s >= 40 ? '#f59e0b' : '#ef4444';
}

const PROV_COLOR: Record<ConfidenceKind, string> = { measured: '#10b981', modeled: '#60a5fa', estimated: '#f59e0b' };

export function ProvenanceTag({ kind }: { kind: ConfidenceKind }) {
  const c = PROV_COLOR[kind];
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 5, color: c, background: `${c}16`, border: `1px solid ${c}30`, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.04em' }}>
      {kind.toUpperCase()}
    </span>
  );
}

// Diagnosis header: big score + headline + projected-after-improvement.
export function DiagnosisHeader({ title, d, metricOverride }: { title: string; d: ReadinessDiagnostic; metricOverride?: { label: string; value: number } }) {
  const metric = metricOverride ?? d.headlineMetric;
  const color = scoreColor(d.score);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>{title}</span>
        <ProvenanceTag kind={d.confidenceKind} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '14px 18px', borderRadius: 12, background: `linear-gradient(135deg, ${color}10 0%, rgba(255,255,255,0.01) 100%)`, border: `1px solid ${color}28` }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{metric ? metric.value : d.score}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginTop: 4 }}>{metric ? metric.label.toUpperCase() : d.label.toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{d.headline}</div>
          {d.projected > (metric ? metric.value : d.score) && (
            <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: '#10b981' }}>
              → Projected {metric ? metric.label.toLowerCase() : 'score'} after the fixes below: {d.projected} ({d.projected - (metric ? metric.value : d.score) > 0 ? '+' : ''}{d.projected - (metric ? metric.value : d.score)})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SubScoreBars({ subScores }: { subScores: { label: string; score: number }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
      {subScores.map(s => {
        const c = scoreColor(s.score);
        return (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: c, fontFamily: 'var(--font-mono, monospace)' }}>{s.score}</span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${s.score}%`, height: '100%', background: c, borderRadius: 4 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GapList({ gaps, title = 'WHAT THE SYSTEM FOUND' }: { gaps: string[]; title?: string }) {
  if (gaps.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gaps.map((g, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, color: '#f59e0b', fontSize: 12, marginTop: 1 }}>⚠</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{g}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImprovementList({ improvements, unit = 'pts', tracking }: { improvements: ImprovementAction[]; unit?: string; tracking?: TrackingCtx }) {
  const [states, setStates] = useState<Record<string, ReadinessActionState>>({});
  const [tabSuccess, setTabSuccess] = useState<{ rate: number; total: number } | null>(null);

  useEffect(() => {
    if (!tracking) return;
    let cancelled = false;
    (async () => {
      const [st, success] = await Promise.all([
        getReadinessActionStates(tracking.userId),
        getReadinessTabSuccess(tracking.userId),
      ]);
      if (cancelled) return;
      setStates(st);
      const s = success[tracking.tab];
      if (s) setTabSuccess({ rate: s.rate, total: s.total });
    })();
    return () => { cancelled = true; };
  }, [tracking]);

  const markDone = async (action: string) => {
    if (!tracking) return;
    const id = readinessActionId(tracking.tab, action);
    setStates(s => ({ ...s, [id]: { completed: true, thumbsUp: null } }));
    await logReadinessAction(tracking.userId, tracking.tab, action, tracking.scoreNow);
  };
  const rate = async (action: string, helped: boolean) => {
    if (!tracking) return;
    const id = readinessActionId(tracking.tab, action);
    setStates(s => ({ ...s, [id]: { completed: true, thumbsUp: helped } }));
    await rateReadinessAction(tracking.userId, tracking.tab, action, helped, tracking.scoreNow);
    const success = await getReadinessTabSuccess(tracking.userId);
    const sx = success[tracking.tab];
    if (sx) setTabSuccess({ rate: sx.rate, total: sx.total });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.1em' }}>WHAT TO DO (RANKED BY IMPACT)</span>
        {tabSuccess && tabSuccess.total > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: tabSuccess.rate >= 0.6 ? '#10b981' : '#f59e0b' }}>
            Your logged success here: {Math.round(tabSuccess.rate * 100)}% ({tabSuccess.total})
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {improvements.map((imp, i) => {
          const id = tracking ? readinessActionId(tracking.tab, imp.action) : '';
          const st = tracking ? states[id] : undefined;
          return (
            <div key={i} style={{ padding: '11px 13px', borderRadius: 9, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.45 }}>{imp.action}</span>
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono, monospace)' }}>+{imp.impactPct}{unit}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 4, color: ACCENT, background: `${ACCENT}14`, border: `1px solid ${ACCENT}28` }}>{imp.effort.toUpperCase()} EFFORT</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{imp.rationale}</span>
              </div>

              {/* Outcome loop controls */}
              {tracking && (
                <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {!st?.completed ? (
                    <button type="button" onClick={() => markDone(imp.action)} style={{ fontSize: 11, fontWeight: 700, padding: '4px 11px', borderRadius: 6, cursor: 'pointer', color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      ✓ I did this
                    </button>
                  ) : st.thumbsUp == null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Did it help?</span>
                      <button type="button" onClick={() => rate(imp.action, true)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>👍 Yes</button>
                      <button type="button" onClick={() => rate(imp.action, false)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, cursor: 'pointer', color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>👎 No</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.thumbsUp ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
                      {st.thumbsUp ? '✓ Logged — it helped. The system is learning this works for you.' : '✓ Logged — noted it didn’t help; deprioritising similar moves.'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
        Impact estimates are modeled from your audit signals — directional, not guaranteed. {tracking ? 'Log outcomes above and they calibrate to what actually works for you.' : 'They sharpen as you log real outcomes.'}
      </div>
    </div>
  );
}
