// TransformationRoadmap.tsx — AI Career Defense: Transformation Engine (Rule #6)
//
// Replaces the old course-list roadmap. Shows an OUTCOME, not a curriculum:
// current role → target role, why, transferable strengths, gap skills, portfolio
// projects, target companies, timeline, and success probability — fully justified.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeTransformation, type TransformationPlan } from '../../../services/transformationEngine';
import { DefenseCommandChain } from './DefenseCommandChain';

interface Props { scoreResult: HybridResult }

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export function TransformationRoadmap({ scoreResult }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TransformationPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile().then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try { setPlan(computeTransformation(scoreResult, profile)); } catch { setPlan(null); }
  }, [scoreResult, profile]);

  if (!plan) return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '32px 0', textAlign: 'center' }}>Mapping your transformation…</div>;

  const successColor = plan.successProbability >= 65 ? '#10b981' : plan.successProbability >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>TRANSFORMATION ROADMAP</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Not a course list — a transformation. Where you are, where you're going, and the evidence that gets you there.</div>
      </div>

      {/* Current → Target hero */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 130, padding: '14px 16px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 6 }}>CURRENT STATE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.78)', lineHeight: 1.4 }}>{plan.currentState}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, color: 'var(--cyan)', flexShrink: 0 }}>→</div>
        <div style={{ flex: 1, minWidth: 130, padding: '14px 16px', borderRadius: 11, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', marginBottom: 6 }}>TARGET ROLE</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.92)', lineHeight: 1.4 }}>{plan.targetRole}</div>
        </div>
      </div>

      {/* Success probability strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: `${successColor}0d`, border: `1px solid ${successColor}28`, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em' }}>SUCCESS PROBABILITY</span>
          <div style={{ fontSize: 22, fontWeight: 900, color: successColor, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>{plan.successProbability}%</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>⏱ {plan.timelineLabel}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1, minWidth: 160, lineHeight: 1.45 }}>{plan.whyThisTarget}</span>
      </div>

      {/* Transferable strengths */}
      <Section label="WHAT TRANSFERS (YOUR HEAD START)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {plan.transferableStrengths.map((s, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', color: '#10b981' }}>✓ {s}</span>
          ))}
        </div>
      </Section>

      {/* Gap skills */}
      <Section label="THE GAP TO CLOSE">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {plan.gapSkills.map((s, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 999, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', color: '#f59e0b' }}>+ {s}</span>
          ))}
        </div>
      </Section>

      {/* Projects */}
      <Section label="PORTFOLIO EVIDENCE (BUILD, DON'T STUDY)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {plan.projects.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono, monospace)', marginTop: 1 }}>{i + 1}.</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Target companies */}
      {plan.targetCompanies.length > 0 && (
        <Section label="WHERE TO AIM (HIRING FOR THIS)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {plan.targetCompanies.map((c, i) => (
              <span key={i} style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 11px', borderRadius: 7, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>{c}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Justification chain */}
      <Section label="WHY THIS TRANSFORMATION">
        <DefenseCommandChain chain={plan.command} />
      </Section>

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
        Derived from your role adjacency, skill-gap intelligence, and live job-targeting. {plan.confidenceKind === 'estimated' ? 'Estimated — add your skills + profile to upgrade to a modeled plan.' : 'Modeled from your audit signals.'}
      </div>
    </div>
  );
}
