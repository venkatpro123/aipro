// DefenseCommandPanel.tsx — AI Career Officer Briefing
// Problem #10: Transform from "score dashboard" to "situation awareness first"
// Users care about: Am I safe? What should I do? What happens if I don't?

import { useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { useLayoff } from '../../../context/LayoffContext';
import { useDefenseIntelligence } from './DefenseIntelligenceContext';

// ── Label maps ──────────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  L1: 'Financial Vulnerability',  L2: 'Layoff History',
  L3: 'Role Displacement Risk',   L4: 'Industry Headwinds',
  L5: 'Regional Headwinds',       D1: 'AI Displacement',
  D2: 'Market Demand',            D3: 'Company Risk',
  D4: 'Tenure Protection',        D5: 'Country Context',
  D6: 'Experience Buffer',        D7: 'Seniority Shield',
  D8: 'Performance Signal',
};

const WHY_STRINGS: Record<string, string> = {
  D1: 'Your role overlaps with current AI capabilities — without adaptation, automation becomes a direct threat.',
  D2: 'Low market demand means fewer employers competing for you, reducing your leverage in any negotiation.',
  D3: 'Company-specific risk amplifies your personal exposure even if your individual performance is strong.',
  D4: 'Tenure below critical threshold makes you statistically more likely to be included in any cut.',
  L1: 'Limited financial runway forces you into the first offer instead of the best offer.',
  L2: 'Recent layoff rounds signal ongoing instability — the cycle often repeats within 12 months.',
  L3: 'AI automation exposure in your role category is rising faster than your current adaptation rate.',
  L4: 'Sector-wide headwinds mean budget cuts spread across employers regardless of company performance.',
  L5: 'Regional economic conditions are compressing hiring in your geography, narrowing your options.',
  D5: 'Country-level market dynamics shape your baseline risk independent of your individual performance.',
  D6: 'Experience level determines how much buffer you have against replacement by cheaper alternatives.',
  D7: 'Seniority provides structural protection — but only up to a point when cost-cutting dominates.',
  D8: 'Performance signals determine whether you are seen as essential or expendable in a downturn.',
};

function getWhyString(dimKey: string): string {
  return WHY_STRINGS[dimKey] ?? 'This dimension is contributing meaningfully to your current risk profile.';
}

// ── Threat level from score ──────────────────────────────────────────────────

function getThreatLevel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'HIGH',      color: '#ef4444' };
  if (score >= 50) return { label: 'ELEVATED',  color: '#f97316' };
  if (score >= 30) return { label: 'MODERATE',  color: '#f59e0b' };
  return             { label: 'STABLE',    color: '#10b981' };
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  scoreResult: HybridResult;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DefenseCommandPanel({ scoreResult }: Props) {
  const { state }                                   = useLayoff();
  const { setActiveThreat, setRequestedTab }        = useDefenseIntelligence();
  const [threatHovered, setThreatHovered]           = useState(false);

  const score                = scoreResult.total ?? 0;
  const { label: threatLabel, color: threatColor }  = getThreatLevel(score);

  // ── Derive top threat & strongest protection from breakdown ─────────────────
  // breakdown keys: L1–L5 only (typed). Extended dims come from dimensions array.
  // We merge both sources into a single scored map for ranking.
  const breakdownMap: Record<string, number> = { ...(scoreResult.breakdown ?? {}) };

  // Also fold in dimensions array (which may include D1–D8) for completeness
  for (const dim of scoreResult.dimensions ?? []) {
    if (!(dim.key in breakdownMap)) {
      // dimensions.score is 0–100; normalise to 0–1 to match breakdown scale
      breakdownMap[dim.key] = dim.score / 100;
    }
  }

  const sortedDims = Object.entries(breakdownMap)
    .filter(([, v]) => v > 0.04)          // filter noise
    .sort(([, a], [, b]) => b - a);

  const topThreatEntry       = sortedDims[0];   // highest contributor
  const topThreatKey         = topThreatEntry?.[0] ?? null;
  const topThreatValue       = topThreatEntry?.[1] ?? 0;
  const topThreatLabel       = topThreatKey ? (DIMENSION_LABELS[topThreatKey] ?? topThreatKey) : null;

  // Strongest protection = lowest contributor (best protected dimension)
  const bottomEntry          = [...sortedDims].reverse()[0];
  const strongestProtKey     = bottomEntry?.[0] ?? null;
  const strongestProtLabel   = strongestProtKey ? (DIMENSION_LABELS[strongestProtKey] ?? strongestProtKey) : null;

  // ── Action data ──────────────────────────────────────────────────────────────
  const levers               = scoreResult.scoreSensitivity?.levers ?? [];
  const topLever             = levers[0] ?? null;

  // ── Bear case ────────────────────────────────────────────────────────────────
  const bearScore            = scoreResult.scenarioPlan?.worstCase?.score;
  const bearProb             = scoreResult.scenarioPlan?.worstCase?.probability ?? 0.25;

  // ── Velocity & collapse ──────────────────────────────────────────────────────
  const velDir               = scoreResult.scoreDelta?.direction ?? null;
  const collapse             = (scoreResult as unknown as Record<string, unknown>).collapseStage as 1 | 2 | 3 | null | undefined;

  // ── Lever count for opportunity link ────────────────────────────────────────
  const leverCount           = levers.length;

  // ── Intelligence brief narrative ─────────────────────────────────────────────
  function buildBrief(): string {
    const parts: string[] = [];

    // Sentence 1: situation
    parts.push(`You are at ${threatLabel} vulnerability.`);

    // Sentence 2: primary weakness
    if (topThreatLabel) {
      parts.push(`${topThreatLabel} is your primary weakness — ${getWhyString(topThreatKey!).toLowerCase()}`);
    }

    // Sentence 3: protection or top action
    if (strongestProtLabel && strongestProtKey !== topThreatKey) {
      parts.push(`Your strongest protection is ${strongestProtLabel}, giving you viable options if action is needed.`);
    } else if (topLever?.dimensionLabel) {
      parts.push(`Your fastest path to lower risk is improving ${topLever.dimensionLabel}.`);
    }

    return parts.join(' ');
  }

  const brief = buildBrief();

  // ── Velocity label for cost-of-waiting fallback ──────────────────────────────
  function velLabel(): string {
    if (velDir === 'improving') return 'improving';
    if (velDir === 'worsening') return 'worsening';
    return 'stable';
  }

  // ── Shared card style helper ─────────────────────────────────────────────────
  function cardBase(accent: string, bg: string): React.CSSProperties {
    return {
      padding: '16px 18px',
      borderRadius: 10,
      background: bg,
      border: `1px solid ${accent}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      flex: '1 1 220px',
      minWidth: 0,
    };
  }

  const chipBase: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    fontFamily: 'var(--font-mono, monospace)',
    letterSpacing: '0.06em',
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${threatColor}08 0%, rgba(0,0,0,0) 70%)`,
      border: `1px solid ${threatColor}22`,
      borderRadius: 14,
      padding: '20px 22px',
      marginBottom: 28,
    }}>

      {/* ── Panel label ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🛡️</span>
          <span style={{
            fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.13em', fontFamily: 'var(--font-mono, monospace)',
          }}>
            AI CAREER OFFICER · SITUATION BRIEFING
          </span>
          {(state.roleTitle || state.companyName) && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', fontFamily: 'var(--font-mono, monospace)' }}>
              · {[state.roleTitle, state.companyName].filter(Boolean).join(' @ ')}
            </span>
          )}
        </div>

        {/* Alerts strip */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {collapse && (
            <span style={{
              ...chipBase,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
              color: '#ef4444',
            }}>
              ⚠ STAGE {collapse} ALERT
            </span>
          )}
          {velDir && velDir !== 'stable' && (
            <span style={{
              ...chipBase,
              background: velDir === 'worsening' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${velDir === 'worsening' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: velDir === 'worsening' ? '#ef4444' : '#10b981',
            }}>
              {velDir === 'worsening' ? '↑ worsening' : '↓ improving'}
            </span>
          )}
        </div>
      </div>

      {/* ══ SECTION 1: INTELLIGENCE BRIEF ════════════════════════════════════ */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.13em', fontFamily: 'var(--font-mono, monospace)',
          marginBottom: 10,
        }}>
          INTELLIGENCE BRIEF
        </div>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 500,
          color: 'rgba(255,255,255,0.88)', lineHeight: 1.65,
        }}>
          {brief}
        </p>
      </div>

      {/* ══ SECTION 2: THREE INTELLIGENCE CARDS ══════════════════════════════ */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        marginBottom: 14,
      }}>

        {/* ── Card A: BIGGEST THREAT ──────────────────────────────────────── */}
        {topThreatKey && topThreatLabel && (
          <div
            role="button"
            tabIndex={0}
            aria-label={`Investigate ${topThreatLabel} — your biggest threat`}
            onClick={() => {
              setActiveThreat(topThreatKey);
              setRequestedTab('priority');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveThreat(topThreatKey);
                setRequestedTab('priority');
              }
            }}
            onMouseEnter={() => setThreatHovered(true)}
            onMouseLeave={() => setThreatHovered(false)}
            style={{
              ...cardBase('rgba(239,68,68,0.25)', 'rgba(239,68,68,0.06)'),
              cursor: 'pointer',
              outline: 'none',
              transition: 'border-color 0.15s, background 0.15s',
              ...(threatHovered ? {
                background: 'rgba(239,68,68,0.10)',
                borderColor: 'rgba(239,68,68,0.45)',
              } : {}),
            }}
          >
            <div style={{
              fontSize: 9, fontWeight: 800, color: '#ef4444',
              letterSpacing: '0.11em', fontFamily: 'var(--font-mono, monospace)',
            }}>
              BIGGEST THREAT
            </div>

            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #fff)', lineHeight: 1.3 }}>
              {topThreatLabel}
            </div>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              {getWhyString(topThreatKey)}
            </div>

            {/* Contribution bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round(topThreatValue * 100)}%`,
                  background: '#ef4444',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{
                fontSize: 11, color: '#ef4444', fontWeight: 800,
                fontFamily: 'var(--font-mono, monospace)', flexShrink: 0,
              }}>
                {Math.round(topThreatValue * 100)}%
              </span>
            </div>

            <div style={{
              fontSize: 10, color: 'rgba(239,68,68,0.70)', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
            }}>
              <span>Click to investigate</span>
              <span>→</span>
            </div>
          </div>
        )}

        {/* ── Card B: DO THIS TODAY ───────────────────────────────────────── */}
        {topLever && (
          <div style={cardBase('rgba(0,245,255,0.18)', 'rgba(0,245,255,0.05)')}>
            <div style={{
              fontSize: 9, fontWeight: 800, color: 'rgba(0,245,255,0.80)',
              letterSpacing: '0.11em', fontFamily: 'var(--font-mono, monospace)',
            }}>
              DO THIS TODAY
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #fff)', lineHeight: 1.4 }}>
              {topLever.fastestAction.length > 80
                ? topLever.fastestAction.slice(0, 77) + '…'
                : topLever.fastestAction}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                ...chipBase,
                background: 'rgba(16,185,129,0.12)',
                color: '#10b981',
              }}>
                −{topLever.scoreDropIfImproved} pts
              </span>
              <span style={{
                ...chipBase,
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.50)',
              }}>
                {topLever.actionTimeframe}
              </span>
            </div>
          </div>
        )}

        {/* ── Card C: COST OF WAITING ─────────────────────────────────────── */}
        <div style={cardBase('rgba(239,68,68,0.20)', 'rgba(239,68,68,0.04)')}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: '#ef4444',
            letterSpacing: '0.11em', fontFamily: 'var(--font-mono, monospace)',
          }}>
            COST OF WAITING
          </div>

          {bearScore !== undefined && bearScore !== null ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                In 6 months if no action: Risk reaches{' '}
                <span style={{ color: '#ef4444', fontFamily: 'var(--font-mono, monospace)' }}>
                  {bearScore}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  ...chipBase,
                  background: 'rgba(239,68,68,0.12)',
                  color: '#ef4444',
                }}>
                  {Math.round(bearProb * 100)}% probability
                </span>
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.38)',
                }}>
                  bear case scenario
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              Trajectory is{' '}
              <span style={{
                color: velDir === 'improving' ? '#10b981' : velDir === 'worsening' ? '#ef4444' : 'rgba(255,255,255,0.60)',
                fontWeight: 700,
              }}>
                {velLabel()}
              </span>
              {' '}based on current signals. Inaction in a{' '}
              {threatLabel === 'HIGH' || threatLabel === 'ELEVATED' ? 'high-risk' : 'moderate-risk'}{' '}
              environment compounds exposure over time.
            </div>
          )}
        </div>
      </div>

      {/* ══ SECTION 3: STATUS STRIP ═══════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
        paddingTop: 12,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* Left: micro chips */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Score chip — small, not hero */}
          <span style={{
            ...chipBase,
            background: `${threatColor}18`,
            border: `1px solid ${threatColor}35`,
            color: threatColor,
          }}>
            RISK {score} · {threatLabel}
          </span>

          {/* Velocity chip */}
          {velDir && (
            <span style={{
              ...chipBase,
              background: 'rgba(255,255,255,0.05)',
              color: velDir === 'improving' ? '#10b981' : velDir === 'worsening' ? '#f97316' : 'rgba(255,255,255,0.40)',
            }}>
              {velDir === 'improving' ? '↓' : velDir === 'worsening' ? '↑' : '→'} {velDir}
            </span>
          )}

          {/* Collapse stage warning chip */}
          {collapse && collapse >= 2 && (
            <span style={{
              ...chipBase,
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.30)',
              color: '#ef4444',
            }}>
              ⚠ STAGE {collapse}
            </span>
          )}
        </div>

        {/* Right: opportunity link */}
        {leverCount > 0 && (
          <button
            type="button"
            onClick={() => setRequestedTab('simulator')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 11,
              color: 'rgba(0,245,255,0.65)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            View your {leverCount} protection {leverCount === 1 ? 'opportunity' : 'opportunities'} →
          </button>
        )}
      </div>
    </div>
  );
}
