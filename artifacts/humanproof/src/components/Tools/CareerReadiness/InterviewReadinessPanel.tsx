// InterviewReadinessPanel.tsx — Interview Readiness Engine (rebuilt from self-rating → evaluation).
// The system EVALUATES readiness across behavioral/technical/AI/leadership/communication and flags
// the likely weaknesses, then generates a ranked practice plan — instead of asking you to rate yourself.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeInterviewReadiness } from '../../../services/readinessDiagnostics';
import { DiagnosisHeader, SubScoreBars, GapList, ImprovementList } from './_readinessShared';
import { EmptyState } from './ResumeReadinessPanel';

interface Props { scoreResult: HybridResult | null }

export function InterviewReadinessPanel({ scoreResult }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => { let c = false; fetchUserProfile().then(p => { if (!c) setProfile(p); }).catch(() => {}); return () => { c = true; }; }, []);

  if (!scoreResult) return <EmptyState icon="🎙️" line="The Interview Readiness engine evaluates your readiness and flags likely weaknesses — no self-rating required." />;
  const d = computeInterviewReadiness(scoreResult, profile);

  return (
    <div>
      <DiagnosisHeader title="INTERVIEW READINESS" d={d} />
      <SubScoreBars subScores={d.subScores} />
      <GapList gaps={d.risks} title="LIKELY INTERVIEW WEAKNESSES" />
      <ImprovementList improvements={d.improvements} unit=" pts" />
    </div>
  );
}
