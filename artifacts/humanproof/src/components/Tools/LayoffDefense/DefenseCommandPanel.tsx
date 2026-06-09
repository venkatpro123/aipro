// DefenseCommandPanel.tsx — Unified career defense status view
// Answers the 5 core questions at a glance:
//   1. What is threatening me?      → TOP THREAT
//   2. How severe is it?            → THREAT LEVEL
//   3. What can I do today?         → DO THIS FIRST
//   4. What is the fastest win?     → fastest lever from scoreSensitivity
//   5. What happens if I do nothing? → IF YOU WAIT (bear case)

import type { HybridResult } from '../../../types/hybridResult';
import { useLayoff } from '../../../context/LayoffContext';

const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Financial Vulnerability',  L2: 'Layoff History',
  L3: 'Role Displacement Risk',   L4: 'Industry Headwinds',
  L5: 'Regional Headwinds',       D1: 'AI Displacement',
  D2: 'Market Demand',            D3: 'Company Amplification',
  D4: 'Tenure Protection',        D5: 'Country Context',
  D6: 'Experience Buffer',        D7: 'Seniority Shield',
  D8: 'Performance Signal',
};

const THREAT_META: Record<string, { label: string; color: string }> = {
  critical: { label: 'CRITICAL',  color: '#ef4444' },
  high:     { label: 'HIGH',      color: '#f97316' },
  elevated: { label: 'ELEVATED',  color: '#f59e0b' },
  stable:   { label: 'STABLE',    color: '#10b981' },
};

function getThreatTier(score: number): keyof typeof THREAT_META {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'elevated';
  return 'stable';
}

interface Props {
  scoreResult: HybridResult;
}

export function DefenseCommandPanel({ scoreResult }: Props) {
  const { state } = useLayoff();
  const score     = scoreResult.total ?? 0;
  const tier      = getThreatTier(score);
  const { label: tierLabel, color: tierColor } = THREAT_META[tier];

  // Q1: Top threat — highest-valued active breakdown dimension
  const activeDims = Object.entries(scoreResult.breakdown ?? {})
    .filter(([, v]) => v > 0.08)
    .sort(([, a], [, b]) => b - a);
  const topThreat = activeDims[0];

  // Q3/Q4: Fastest action — first lever sorted by scoreDropIfImproved (already sorted)
  const levers    = scoreResult.scoreSensitivity?.levers ?? [];
  const topLever  = levers[0];

  // Q5: Bear-case score
  const bearScore = scoreResult.scenarioPlan?.worstCase?.score;
  const bearProb  = scoreResult.scenarioPlan?.worstCase?.probability ?? 0.25;

  // Best-3 projected score
  const best3     = scoreResult.scoreSensitivity?.bestThreeLeverScore;

  // Collapse stage warning
  const collapse  = (scoreResult as any).collapseStage as 1 | 2 | 3 | null | undefined;

  // Velocity direction
  const velDir    = scoreResult.scoreDelta?.direction ?? null;

  const contextLine = [
    state.roleTitle, state.companyName,
  ].filter(Boolean).join(' @ ');

  return (
    <div style={{
      background: `linear-gradient(135deg, ${tierColor}08 0%, rgba(0,0,0,0) 70%)`,
      border: `1px solid ${tierColor}22`,
      borderRadius: 14,
      padding: '20px 22px',
      marginBottom: 28,
    }}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 15 }}>🛡️</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.13em', fontFamily: 'var(--font-mono, monospace)' }}>
            CAREER DEFENSE STATUS
          </span>
          {contextLine && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, monospace)' }}>
              · {contextLine}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {collapse && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#ef4444', letterSpacing: '0.09em', fontFamily: 'var(--font-mono, monospace)',
            }}>
              ⚠ STAGE {collapse} ALERT
            </span>
          )}
          {velDir && velDir !== 'stable' && (
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600,
              background: velDir === 'worsening' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${velDir === 'worsening' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: velDir === 'worsening' ? '#ef4444' : '#10b981',
            }}>
              {velDir === 'worsening' ? '↑ worsening' : '↓ improving'}
            </span>
          )}
        </div>
      </div>

      {/* ── 5-question grid ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>

        {/* HOW SEVERE — Threat Level */}
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: `${tierColor}0f`, border: `1px solid ${tierColor}2e`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.11em', marginBottom: 7 }}>
            THREAT LEVEL
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 5 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: tierColor, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: tierColor, letterSpacing: '0.05em' }}>
              {tierLabel}
            </span>
          </div>
          {scoreResult.tier?.advice && (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
              {scoreResult.tier.advice.length > 64
                ? scoreResult.tier.advice.slice(0, 61) + '…'
                : scoreResult.tier.advice}
            </div>
          )}
        </div>

        {/* WHAT IS THREATENING ME — Top Threat */}
        {topThreat && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.11em', marginBottom: 7 }}>
              TOP THREAT
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 7, lineHeight: 1.3 }}>
              {DIMENSION_LABELS[topThreat[0]] ?? topThreat[0]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(topThreat[1] * 100)}%`, background: '#ef4444', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
                {Math.round(topThreat[1] * 100)}%
              </span>
            </div>
            {activeDims[1] && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
                Also: {DIMENSION_LABELS[activeDims[1][0]] ?? activeDims[1][0]} ({Math.round(activeDims[1][1] * 100)}%)
              </div>
            )}
          </div>
        )}

        {/* WHAT CAN I DO TODAY — Fastest action */}
        {topLever && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.18)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.11em', marginBottom: 7 }}>
              DO THIS FIRST
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 7, lineHeight: 1.4 }}>
              {topLever.fastestAction.length > 72
                ? topLever.fastestAction.slice(0, 69) + '…'
                : topLever.fastestAction}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                −{topLever.scoreDropIfImproved} pts
              </span>
              <span style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 9,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)',
              }}>
                {topLever.actionTimeframe}
              </span>
            </div>
          </div>
        )}

        {/* IF YOU ACT — best-3 projected score */}
        {best3 !== undefined && best3 !== null && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '0.11em', marginBottom: 7 }}>
              IF YOU ACT (TOP 3)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                {best3}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>projected</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
              −{score - best3} pts from completing your top 3 defence actions
            </div>
          </div>
        )}

        {/* IF YOU DO NOTHING — bear case */}
        {bearScore !== undefined && (
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', letterSpacing: '0.11em', marginBottom: 7 }}>
              IF YOU DO NOTHING
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#ef4444', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                {bearScore}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>bear case</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
              {Math.round(bearProb * 100)}% probability if no defensive action is taken
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
