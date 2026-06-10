// ReferralReadinessPanel.tsx — Network Activation Engine (rebuilt from template library → strategist).
// Determines network strength, referral readiness, and dormant opportunity, then tells you WHO to
// contact, WHY, and the expected response / referral / interview probabilities for each.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { useAuth } from '../../../context/AuthContext';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeNetworkActivation } from '../../../services/readinessDiagnostics';
import { DiagnosisHeader, SubScoreBars, ImprovementList, scoreColor } from './_readinessShared';
import { EmptyState } from './ResumeReadinessPanel';

interface Props { scoreResult: HybridResult | null }

export function ReferralReadinessPanel({ scoreResult }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => { let c = false; fetchUserProfile().then(p => { if (!c) setProfile(p); }).catch(() => {}); return () => { c = true; }; }, []);

  if (!scoreResult) return <EmptyState icon="🤝" line="The Network Activation engine tells you who to contact, why, and the odds each yields a referral and an interview." />;
  const d = computeNetworkActivation(scoreResult, profile);
  const tracking = user ? { userId: user.id, tab: 'referral' as const, scoreNow: d.score } : undefined;

  return (
    <div>
      <DiagnosisHeader title="NETWORK ACTIVATION ENGINE" d={d} />
      <SubScoreBars subScores={d.subScores} />

      {/* Who to contact — the strategist view */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#10b981', letterSpacing: '0.1em', marginBottom: 8 }}>WHO TO CONTACT (BY EXPECTED RETURN)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {d.contacts.map((c, i) => (
            <div key={i} style={{ padding: '11px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.82)', marginBottom: 3 }}>{c.who}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.45, marginBottom: 9 }}>{c.why}</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'Response', v: c.responseProbability },
                  { label: 'Referral', v: c.referralProbability },
                  { label: 'Interview', v: c.interviewProbability },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{m.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(m.v), fontFamily: 'var(--font-mono, monospace)' }}>{m.v}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Contact archetypes and probabilities are modeled from your network strength — no contact list is read.</div>
      </div>

      <ImprovementList improvements={d.improvements} unit=" pts" tracking={tracking} />
    </div>
  );
}
