// HirabilityCommandCenter.tsx — Career Readiness: the top-level dashboard.
// Answers "Can you get hired tomorrow?" — overall Hirability Score, the lead
// probabilities (interview / offer / competitiveness / mobility), all 10
// readiness components with trend + provenance, and the two bottlenecks to fix
// first. Tapping a component jumps to its diagnostic tab.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { useAuth } from '../../../context/AuthContext';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeHirability, type HirabilityReport, type HirabilityComponent } from '../../../services/hirabilityEngine';
import { getReadinessProgressSummary } from '../../../services/readinessOutcomeService';
import { scoreColor, ProvenanceTag } from './_readinessShared';
import { EmptyState } from './ResumeReadinessPanel';

interface Props {
  scoreResult: HybridResult | null;
  onJumpToTab?: (tab: string) => void;
}

const VERDICT_COLOR: Record<HirabilityReport['verdict'], string> = {
  'Highly Hireable': '#10b981', Hireable: '#34d399', 'Gaps to Close': '#f59e0b', 'At Risk': '#ef4444',
};

function BigMetric({ label, value, sub }: { label: string; value: number; sub?: string }) {
  const c = scoreColor(value);
  return (
    <div style={{ flex: 1, minWidth: 120, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: c, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{value}%</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ComponentRow({ comp, onJump }: { comp: HirabilityComponent; onJump?: (t: string) => void }) {
  const c = scoreColor(comp.score);
  const trendIcon = comp.trend === 'rising' ? '↑' : comp.trend === 'falling' ? '↓' : '→';
  const trendColor = comp.trend === 'rising' ? '#10b981' : comp.trend === 'falling' ? '#ef4444' : 'rgba(255,255,255,0.3)';
  return (
    <button type="button" onClick={() => comp.tab && onJump?.(comp.tab)} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 13px', cursor: comp.tab ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
      onMouseEnter={e => { if (comp.tab) (e.currentTarget as HTMLElement).style.borderColor = `${c}40`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{comp.icon}</span>
        <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{comp.label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: trendColor }}>{trendIcon}</span>
        <ProvenanceTag kind={comp.confidenceKind} />
        <span style={{ fontSize: 15, fontWeight: 900, color: c, fontFamily: 'var(--font-mono, monospace)', minWidth: 28, textAlign: 'right' }}>{comp.score}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 7 }}>
        <div style={{ width: `${comp.score}%`, height: '100%', background: c, borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
        <span style={{ color: '#10b981', fontWeight: 700 }}>Next: </span>{comp.improvement}
      </div>
    </button>
  );
}

export function HirabilityCommandCenter({ scoreResult, onJumpToTab }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [report, setReport] = useState<HirabilityReport | null>(null);
  const [progress, setProgress] = useState<{ logged: number; rated: number; helped: number } | null>(null);

  useEffect(() => { let c = false; fetchUserProfile().then(p => { if (!c) setProfile(p); }).catch(() => {}); return () => { c = true; }; }, []);
  useEffect(() => {
    if (!scoreResult) { setReport(null); return; }
    try { setReport(computeHirability(scoreResult, profile)); } catch { setReport(null); }
  }, [scoreResult, profile]);
  useEffect(() => {
    if (!user) return;
    let c = false;
    getReadinessProgressSummary(user.id).then(p => { if (!c && p.logged > 0) setProgress(p); }).catch(() => {});
    return () => { c = true; };
  }, [user]);

  if (!scoreResult) return <EmptyState icon="🎯" line="The Hirability Command Center answers one question: can you get hired tomorrow? Run an audit to find out." />;
  if (!report) return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '32px 0', textAlign: 'center' }}>Computing your hirability…</div>;

  const vColor = VERDICT_COLOR[report.verdict];

  return (
    <div>
      {/* Hero verdict */}
      <div style={{ padding: '20px 22px', borderRadius: 14, background: `linear-gradient(135deg, ${vColor}12 0%, rgba(255,255,255,0.01) 100%)`, border: `1px solid ${vColor}30`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', marginBottom: 10 }}>CAN YOU GET HIRED TOMORROW?</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 46, fontWeight: 900, color: vColor, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{report.hirabilityScore}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>/100</span>
          <span style={{ padding: '4px 12px', borderRadius: 7, fontSize: 13, fontWeight: 800, color: vColor, background: `${vColor}16`, border: `1px solid ${vColor}30` }}>{report.verdict}</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6 }}>{report.verdictNarrative}</div>
      </div>

      {/* Outcome-loop progress — the system learning from what you actually do */}
      {progress && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', borderRadius: 10, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.18)', marginBottom: 16 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#a78bfa', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>LEARNING LOOP</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            <b style={{ color: 'rgba(255,255,255,0.85)' }}>{progress.logged}</b> actions logged
            {progress.rated > 0 && <> · <b style={{ color: 'rgba(255,255,255,0.85)' }}>{progress.rated}</b> outcomes reported · <b style={{ color: '#10b981' }}>{Math.round((progress.helped / progress.rated) * 100)}%</b> helped</>}
          </span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
            {progress.rated >= 3 ? 'Calibrating your guidance to what actually works.' : 'Report a few outcomes to start calibrating.'}
          </span>
        </div>
      )}

      {/* Lead probabilities */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <BigMetric label="INTERVIEW PROBABILITY" value={report.interviewProbability} sub="getting the call" />
        <BigMetric label="OFFER PROBABILITY" value={report.offerProbability} sub="closing it" />
        <BigMetric label="MARKET COMPETITIVENESS" value={report.marketCompetitiveness} sub="vs. the field" />
        <BigMetric label="EXTERNAL MOBILITY" value={report.externalMobility} sub="ease of moving" />
      </div>

      {/* Bottlenecks */}
      <div style={{ padding: '13px 16px', borderRadius: 11, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', marginBottom: 18 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', letterSpacing: '0.1em', marginBottom: 8 }}>YOUR TOP 2 BOTTLENECKS — FIX THESE FIRST</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {report.bottlenecks.map(b => (
            <div key={b.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>{b.icon}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.45 }}>
                <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{b.label} ({b.score}/100): </span>{b.improvement}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* All 10 components */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 10 }}>YOUR 10 READINESS COMPONENTS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {report.components.map(c => <ComponentRow key={c.key} comp={c} onJump={onJumpToTab} />)}
      </div>
    </div>
  );
}
