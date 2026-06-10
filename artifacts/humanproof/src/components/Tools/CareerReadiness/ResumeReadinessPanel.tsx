// ResumeReadinessPanel.tsx — Resume Intelligence Engine (rebuilt from checklist → diagnosis).
// Determines ATS match, achievement density, keyword coverage, AI relevance, and the
// specific missing keywords + ranked fixes with estimated interview-probability impact.

import { useEffect, useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { useAuth } from '../../../context/AuthContext';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { computeResumeIntelligence } from '../../../services/readinessDiagnostics';
import { DiagnosisHeader, SubScoreBars, ImprovementList } from './_readinessShared';

interface Props { scoreResult: HybridResult | null }

export function ResumeReadinessPanel({ scoreResult }: Props) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => { let c = false; fetchUserProfile().then(p => { if (!c) setProfile(p); }).catch(() => {}); return () => { c = true; }; }, []);

  if (!scoreResult) return <EmptyState icon="📄" line="The Resume Intelligence engine derives your ATS match and missing keywords from your role + skill profile." />;
  const d = computeResumeIntelligence(scoreResult, profile);
  const tracking = user ? { userId: user.id, tab: 'resume' as const, scoreNow: d.score } : undefined;

  return (
    <div>
      <DiagnosisHeader title="RESUME INTELLIGENCE" d={d} />
      <SubScoreBars subScores={d.subScores} />
      {d.missingKeywords.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 8 }}>MISSING HIGH-DEMAND KEYWORDS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {d.missingKeywords.map((k, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>{k}</span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>In active demand for your role and absent from your likely keyword set — each one you add lifts ATS ranking.</div>
        </div>
      )}
      <ImprovementList improvements={d.improvements} unit="% interview prob" tracking={tracking} />
    </div>
  );
}

export function EmptyState({ icon, line }: { icon: string; line: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', background: 'rgba(167,139,250,0.05)', borderRadius: 16, border: '1px solid rgba(167,139,250,0.15)' }}>
      <div style={{ fontSize: 38, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 8 }}>Run an audit to unlock this diagnosis</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>{line}</div>
    </div>
  );
}
