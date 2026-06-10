// SurvivalStrategyPanel.tsx — AI Career Defense: Survival Strategy (Rule #5)
//
// Plan A/B/C/D — a defense ladder with explicit activation triggers and a fully
// justified command chain per plan. The user always knows their next move AND
// when to escalate.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeCareerMoats } from '../../../services/careerMoatEngine';
import { computeSurvivalStrategy, type SurvivalStrategy, type SurvivalPlan } from '../../../services/survivalStrategyEngine';
import { DefenseCommandChain } from './DefenseCommandChain';

interface Props { scoreResult: HybridResult }

const TIER_COLOR: Record<SurvivalPlan['tier'], string> = { A: '#10b981', B: '#60a5fa', C: '#f59e0b', D: '#ef4444' };

function PlanCard({ plan, isActive }: { plan: SurvivalPlan; isActive: boolean }) {
  const [open, setOpen] = useState(isActive);
  const color = TIER_COLOR[plan.tier];
  return (
    <div style={{ borderRadius: 12, background: isActive ? `${color}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? color + '38' : 'rgba(255,255,255,0.07)'}` }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: `${color}1a`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color, fontFamily: 'var(--font-mono, monospace)' }}>{plan.tier}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>{plan.name}</span>
              {isActive && <span style={{ fontSize: 8.5, fontWeight: 800, color, background: `${color}1e`, border: `1px solid ${color}40`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)' }}>ACTIVE NOW</span>}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.4 }}>{plan.thesis}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>SUCCESS</div>
            <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'var(--font-mono, monospace)' }}>{plan.successProbability}%</div>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{open ? '▲' : '▾'}</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Trigger */}
          <div style={{ fontSize: 11, color, fontWeight: 700, padding: '7px 11px', borderRadius: 7, background: `${color}0d`, border: `1px solid ${color}26`, marginBottom: 12, lineHeight: 1.45 }}>
            ⚡ ACTIVATE WHEN: {plan.trigger}
          </div>

          {/* Steps */}
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginBottom: 7 }}>THE MOVES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {plan.steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--font-mono, monospace)', marginTop: 1 }}>{i + 1}.</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Timeline chip */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>⏱ {plan.timelineLabel}</span>
          </div>

          {/* Command chain */}
          <DefenseCommandChain chain={plan.command} />
        </div>
      )}
    </div>
  );
}

export function SurvivalStrategyPanel({ scoreResult }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [strategy, setStrategy] = useState<SurvivalStrategy | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile().then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const moat = computeCareerMoats(scoreResult, profile);
      setStrategy(computeSurvivalStrategy(scoreResult, profile, moat));
    } catch { setStrategy(null); }
  }, [scoreResult, profile]);

  if (!strategy) return <div style={{ color: 'rgba(255,255,255,0.4)', padding: '32px 0', textAlign: 'center' }}>Building your survival strategy…</div>;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 4 }}>SURVIVAL STRATEGY — PLAN A / B / C / D</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Your full defense ladder. Each plan tells you what to do and exactly when to escalate.</div>
      </div>

      {/* Escalation narrative */}
      <div style={{ padding: '13px 16px', borderRadius: 11, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.18)', marginBottom: 16, fontSize: 12.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>
        {strategy.escalationNarrative}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {strategy.plans.map(p => <PlanCard key={p.tier} plan={p} isActive={p.tier === strategy.activeTier} />)}
      </div>
    </div>
  );
}
