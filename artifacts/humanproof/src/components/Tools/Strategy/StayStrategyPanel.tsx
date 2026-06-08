// StayStrategyPanel.tsx — "Should I stay?" decision engine
import { useMemo } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

function computeStayScore(scoreResult: HybridResult): { score: number; reasons: string[]; risks: string[]; actions: string[] } {
  const total = scoreResult.total ?? 50;
  const runway = scoreResult.financialRunway?.runwayMonths ?? 6;
  const d1Score = scoreResult.dimensions?.find(d => d.key === 'D1')?.score ?? 50;
  const mobility = scoreResult.internalMobility;
  const velocity = scoreResult.careerVelocity;

  let score = 100 - total;
  const reasons: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  if (total < 40) { score += 10; reasons.push('Low layoff risk — company fundamentals appear stable'); }
  if (total > 65) { score -= 15; risks.push('Elevated layoff risk — staying carries meaningful displacement risk'); }

  if (runway >= 6) { score += 8; reasons.push(`${runway}+ months of financial runway gives you negotiating power`); }
  else { risks.push('Short financial runway — limits your ability to wait for the right move'); }

  if (mobility?.internalTransferViability === 'HIGH' || mobility?.internalTransferViability === 'MODERATE') {
    score += 12;
    reasons.push(`Internal transfer viability is ${mobility.internalTransferViability.toLowerCase()} — lateral moves available`);
    actions.push('Identify and meet 2 hiring managers in adjacent departments this quarter');
  }

  if (velocity?.trajectory === 'ACCELERATING') { score += 10; reasons.push('Career trajectory is accelerating — momentum is on your side'); }
  else if (velocity?.trajectory === 'PLATEAUED') { score -= 10; risks.push('Career trajectory has plateaued — growth may require an external move'); actions.push('Request a formal promotion path conversation with your manager'); }
  else if (velocity?.trajectory === 'DECLINING') { score -= 15; risks.push('Career trajectory is declining — staying risks further regression'); }

  if (d1Score > 60) { risks.push(`AI displacement risk is elevated (D1: ${Math.round(d1Score)}) — role stability may diminish`); actions.push('Enroll in an AI augmentation course to protect your position'); }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (actions.length === 0) {
    actions.push('Document your impact quarterly to maintain visibility');
    actions.push('Schedule a career growth conversation with your manager');
    actions.push('Build relationships with leaders in 2 adjacent departments');
  }

  return { score, reasons, risks, actions };
}

export function StayStrategyPanel({ scoreResult }: Props) {
  const { score, reasons, risks, actions } = useMemo(() => computeStayScore(scoreResult), [scoreResult]);
  const color = score >= 60 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const verdict = score >= 60 ? 'Stay & Strengthen' : score >= 40 ? 'Stay with Caution' : 'Consider Exiting';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Stay Strategy</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Should you stay and strengthen your position, or plan an exit? A data-driven decision.
        </div>
      </div>

      {/* Score hero */}
      <div style={{ padding: '20px 24px', borderRadius: 14, background: `${color}10`, border: `1px solid ${color}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 64, color, lineHeight: 1 }}>{score}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color }}>{verdict}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Stay Score (0 = exit immediately, 100 = stay and invest)</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Reasons to stay */}
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#10b981', marginBottom: 12 }}>✓ Reasons to Stay</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasons.length > 0 ? reasons.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                <span style={{ color: '#10b981', flexShrink: 0 }}>·</span>{r}
              </div>
            )) : <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No strong stay signals detected</div>}
          </div>
        </div>

        {/* Risks of staying */}
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#ef4444', marginBottom: 12 }}>⚠ Risks of Staying</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.length > 0 ? risks.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                <span style={{ color: '#ef4444', flexShrink: 0 }}>·</span>{r}
              </div>
            )) : <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No major stay risks identified</div>}
          </div>
        </div>
      </div>

      {/* 90-day action plan */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Your 90-Day Stay Plan</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
