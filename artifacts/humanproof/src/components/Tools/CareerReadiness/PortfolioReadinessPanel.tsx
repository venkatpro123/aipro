// PortfolioReadinessPanel.tsx — Proof-of-Work Engine (rebuilt from checklist → evaluation).
// Scores portfolio credibility, authority, differentiation, and discoverability, then names the
// single highest-value project to build next — tied to role + market demand + AI trends.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computePortfolioStrength } from '../../../services/readinessDiagnostics';
import { DiagnosisHeader, SubScoreBars, GapList, ImprovementList } from './_readinessShared';
import { EmptyState } from './ResumeReadinessPanel';

interface Props { scoreResult: HybridResult | null }

export function PortfolioReadinessPanel({ scoreResult }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => { let c = false; fetchUserProfile().then(p => { if (!c) setProfile(p); }).catch(() => {}); return () => { c = true; }; }, []);

  if (!scoreResult) return <EmptyState icon="🗂️" line="The Proof-of-Work engine scores your portfolio's credibility and names the highest-value project to build next." />;
  const d = computePortfolioStrength(scoreResult, profile);

  return (
    <div>
      <DiagnosisHeader title="PROOF-OF-WORK ENGINE" d={d} />
      <SubScoreBars subScores={d.subScores} />
      {/* Highest-value next project — front and centre */}
      <div style={{ marginBottom: 18, padding: '13px 16px', borderRadius: 11, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', marginBottom: 7 }}>🎯 HIGHEST-VALUE PROJECT TO BUILD NEXT</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>{d.nextProject}</div>
      </div>
      <GapList gaps={d.gaps} />
      <ImprovementList improvements={d.improvements} unit=" pts" />
    </div>
  );
}
