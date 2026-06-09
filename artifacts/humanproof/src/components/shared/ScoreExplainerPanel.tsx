// ScoreExplainerPanel.tsx — Phase C: Universal "Why this score?" explainer
// Renders key insight, top 3 breakdown dimensions, fastest win lever,
// and best-3-levers projected score. Used in RiskSimulator expanded
// card and CareerOSHome CareerHealthIndicator "Why?" button.
import type { HybridResult } from '../../types/hybridResult';
import ProvenanceLabel from '../AuditTabs/common/ProvenanceLabel';
import type { ProvenanceKind } from '../AuditTabs/common/ProvenanceLabel';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreExplainerPanelProps {
  scoreResult: HybridResult;
  accentColor?: string;
  title?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  // L-series — standard 5-layer breakdown (all audit versions)
  L1: 'Financial Vulnerability',
  L2: 'Layoff & Instability History',
  L3: 'Role Displacement Risk',
  L4: 'Industry Headwinds',
  L5: 'Regional Headwinds',
  // D-series — extended keys stored on older layoff_scores rows
  D1: 'AI Displacement Risk',
  D2: 'Market Demand',
  D3: 'Company Amplification',
  D4: 'Tenure Protection',
  D5: 'Country Context',
  D6: 'Experience Buffer',
  D7: 'Seniority Shield',
  D8: 'Performance Signal',
};

const CONFIDENCE_MAP: Record<'High' | 'Medium' | 'Low', ProvenanceKind> = {
  High: 'measured',
  Medium: 'modeled',
  Low: 'estimated',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ScoreExplainerPanel({
  scoreResult,
  accentColor = 'var(--cyan)',
  title = 'Why this score?',
}: ScoreExplainerPanelProps) {
  if (!scoreResult) return null;

  const sensitivity = scoreResult.scoreSensitivity;
  const breakdown = scoreResult.breakdown;

  // Section 2: top 3 breakdown dims sorted by contribution (highest = most risk)
  const topDims = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Section 3: fastest win — first immediate or short_term lever
  const fastestLever = sensitivity?.levers?.find(
    l => l.feasibility === 'immediate' || l.feasibility === 'short_term',
  );

  // Section 4: best 3 levers projected score
  const bestThree = sensitivity?.bestThreeLeverScore;

  // Key insight — prefer sensitivity engine output, fallback to tier advice
  const keyInsight = sensitivity?.keySensitivityInsight ?? scoreResult.tier?.advice ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Panel header */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: accentColor,
        letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)',
      }}>
        {title.toUpperCase()}
      </div>

      {/* Section 1 — Key insight */}
      {keyInsight && (
        <div style={{
          padding: '9px 12px', borderRadius: 8,
          background: `${accentColor}08`, border: `1px solid ${accentColor}22`,
          fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <ProvenanceLabel kind={sensitivity ? 'modeled' : 'estimated'} size="xs" />
          <span>{keyInsight}</span>
        </div>
      )}

      {/* Section 2 — Top 3 dimension bars */}
      {topDims.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topDims.map(([key, val]) => {
            const pct = Math.round(val * 100);
            const label = DIMENSION_LABELS[key] ?? key;
            return (
              <div key={key}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 4,
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 10, color: accentColor, fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>
                    {pct}%
                  </span>
                </div>
                <div style={{
                  height: 4, borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${pct}%`,
                    background: pct > 65 ? '#ef4444' : pct > 40 ? '#f59e0b' : accentColor,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ProvenanceLabel kind="modeled" size="xs" />
          </div>
        </div>
      )}

      {/* Section 3 — Fastest win */}
      {fastestLever && (
        <div style={{
          padding: '9px 12px', borderRadius: 8,
          background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', marginBottom: 5 }}>
            FASTEST WIN
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {fastestLever.dimensionLabel}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 8 }}>
            {fastestLever.fastestAction.slice(0, 120)}{fastestLever.fastestAction.length > 120 ? '…' : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
              background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.2)',
              color: 'var(--cyan)', fontFamily: 'var(--font-mono, monospace)',
            }}>
              ⏱ {fastestLever.actionTimeframe}
            </span>
            <span style={{
              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
              background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
              color: '#10b981', fontFamily: 'var(--font-mono, monospace)',
            }}>
              −{fastestLever.scoreDropIfImproved} pts
            </span>
            <ProvenanceLabel kind={CONFIDENCE_MAP[fastestLever.confidenceInEstimate]} size="xs" />
          </div>
        </div>
      )}

      {/* Section 4 — Best 3 levers summary */}
      {bestThree !== undefined && bestThree !== null && (
        <div style={{
          padding: '7px 12px', borderRadius: 7,
          background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)',
          fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>If 3 best actions completed:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--font-mono, monospace)', fontWeight: 800,
              fontSize: 14, color: '#a78bfa',
            }}>
              {bestThree} risk
            </span>
            <ProvenanceLabel kind="modeled" size="xs" />
          </div>
        </div>
      )}
    </div>
  );
}
