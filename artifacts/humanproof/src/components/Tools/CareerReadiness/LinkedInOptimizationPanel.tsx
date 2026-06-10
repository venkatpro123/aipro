// LinkedInOptimizationPanel.tsx — LinkedIn Intelligence Engine (rebuilt from checklist → diagnosis).
// Determines recruiter discovery probability, profile authority, visibility, network reach, and
// content influence — with ranked improvements and their projected lift on discovery probability.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeLinkedInIntelligence } from '../../../services/readinessDiagnostics';
import { DiagnosisHeader, SubScoreBars, GapList, ImprovementList } from './_readinessShared';
import { EmptyState } from './ResumeReadinessPanel';

interface Props { scoreResult: HybridResult | null }

export function LinkedInOptimizationPanel({ scoreResult }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => { let c = false; fetchUserProfile().then(p => { if (!c) setProfile(p); }).catch(() => {}); return () => { c = true; }; }, []);

  if (!scoreResult) return <EmptyState icon="💼" line="The LinkedIn Intelligence engine estimates how often recruiters discover you, and exactly what to change." />;
  const d = computeLinkedInIntelligence(scoreResult, profile);

  return (
    <div>
      <DiagnosisHeader title="LINKEDIN INTELLIGENCE" d={d} />
      <SubScoreBars subScores={d.subScores} />
      <GapList gaps={d.gaps} />
      <ImprovementList improvements={d.improvements} unit="% discovery" />
    </div>
  );
}
