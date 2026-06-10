// CareerMoatPanel.tsx — AI Career Defense: Career Moat Intelligence (Rule #3)
//
// Shows what AI cannot take from you: 8 moats scored, the open flanks, the single
// highest-ROI moat to build, and the most-defensible strategy — every
// recommendation justified via the command chain.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeCareerMoats, type CareerMoatReport, type CareerMoat } from '../../../services/careerMoatEngine';
import { DefenseCommandChain } from './DefenseCommandChain';

interface Props { scoreResult: HybridResult }

const STATUS_COLOR: Record<CareerMoat['status'], string> = { strong: '#10b981', fair: '#f59e0b', weak: '#ef4444' };
const STRENGTH_COLOR: Record<CareerMoatReport['strengthLabel'], string> = {
  Fortress: '#10b981', Defensible: '#34d399', Exposed: '#f59e0b', Vulnerable: '#ef4444',
};

function MoatRow({ moat, isHighlight }: { moat: CareerMoat; isHighlight: boolean }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLOR[moat.status];
  return (
    <div style={{ borderRadius: 10, background: isHighlight ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isHighlight ? 'rgba(0,212,255,0.22)' : 'rgba(255,255,255,0.06)'}`, padding: '12px 14px' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{moat.icon}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{moat.label.replace(' Moat', '')}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)' }}>{moat.status}</span>
          <span style={{ fontSize: 16, fontWeight: 900, color, fontFamily: 'var(--font-mono, monospace)', minWidth: 30, textAlign: 'right' }}>{moat.score}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{open ? '▲' : '▾'}</span>
        </div>
        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${moat.score}%`, height: '100%', background: color, borderRadius: 4 }} />
        </div>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 8 }}>{moat.protects}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            {moat.evidence.map((e, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{e}</span>
            ))}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, color: STATUS_COLOR[moat.status === 'strong' ? 'strong' : 'fair'], background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {moat.confidenceKind.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, padding: '8px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <span style={{ fontWeight: 800, color: '#10b981' }}>Build it: </span>{moat.howToBuild}
          </div>
        </div>
      )}
    </div>
  );
}

export function CareerMoatPanel({ scoreResult }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [report, setReport] = useState<CareerMoatReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile().then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try { setReport(computeCareerMoats(scoreResult, profile)); } catch { setReport(null); }
  }, [scoreResult, profile]);

  if (!report) return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '32px 0', textAlign: 'center' }}>Computing your career moats…</div>;

  const strengthColor = STRENGTH_COLOR[report.strengthLabel];
  const roi = report.highestRoiMoat;

  // Build the command chain for the highest-ROI recommendation.
  const chain = {
    threat: 'As AI automates routine work, undefended career dimensions become commoditised first.',
    impact: `Your ${roi.label.replace(' Moat', '').toLowerCase()} moat is your weakest high-leverage flank (${roi.score}/100).`,
    probability: `Highest return on effort of all 8 moats (ROI index ${roi.roiScore}).`,
    timeline: roi.buildSpeed === 'fast' ? 'Weeks to first gain' : roi.buildSpeed === 'medium' ? '1–3 months' : '3–6 months',
    defense: roi.howToBuild,
    outcome: `Closes your most exploitable gap and lifts overall moat strength above ${report.overallMoatStrength}.`,
    confidence: roi.confidenceKind === 'measured' ? 80 : roi.confidenceKind === 'modeled' ? 70 : 58,
    confidenceKind: roi.confidenceKind,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>CAREER MOAT INTELLIGENCE</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>What AI and the market cannot easily take from you — and the one moat to build next.</div>
      </div>

      {/* Overall strength */}
      <div style={{ padding: '16px 18px', borderRadius: 12, background: `linear-gradient(135deg, ${strengthColor}10 0%, rgba(255,255,255,0.01) 100%)`, border: `1px solid ${strengthColor}28`, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 4 }}>OVERALL MOAT STRENGTH</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: strengthColor, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{report.overallMoatStrength}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: strengthColor }}>{report.strengthLabel}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 180, fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
          {report.mostDefensibleStrategy}
        </div>
      </div>

      {/* Highest-ROI moat to build — fully justified */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#00d4e0', letterSpacing: '0.1em', marginBottom: 8 }}>🎯 HIGHEST-ROI MOAT TO BUILD NOW — {roi.label.replace(' Moat', '').toUpperCase()}</div>
        <DefenseCommandChain chain={chain} />
      </div>

      {/* All 8 moats */}
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 10 }}>YOUR 8 MOATS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {report.moats.map(m => <MoatRow key={m.key} moat={m} isHighlight={m.key === roi.key} />)}
      </div>

      <div style={{ marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
        Moats derived from your audit signals. Reputation & Distribution are estimated from profile proxies (no direct measurement) and labelled accordingly.
      </div>
    </div>
  );
}
