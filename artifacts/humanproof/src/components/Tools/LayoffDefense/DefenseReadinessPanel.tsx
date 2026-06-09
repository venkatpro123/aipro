// DefenseReadinessPanel.tsx — Phase 2: Defense Readiness Framework
// Answers: "If layoffs happen tomorrow, will I survive?"
// Five dimensions: Internal / External / Financial / AI / Network
// Each derived from typed HybridResult fields, never hardcoded.

import { useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { useHumanProof } from '../../../context/HumanProofContext';

// ── Readiness computation ──────────────────────────────────────────────────────

interface ReadinessScores {
  internal:  number; // manager visibility, tenure, performance, project criticality
  external:  number; // interview readiness, marketability, offer probability
  financial: number; // runway, savings, emergency preparedness
  ai:        number; // AI adaptation, leverage, productivity
  network:   number; // professional network, referral strength, industry visibility
  overall:   number;
}

interface ReadinessDimension {
  id:     keyof Omit<ReadinessScores, 'overall'>;
  label:  string;
  icon:   string;
  why:    (scores: ReadinessScores, hr: HybridResult) => string;
  action: string;
}

const DIMENSIONS: ReadinessDimension[] = [
  {
    id:     'internal',
    label:  'Internal Protection',
    icon:   '🏛️',
    why:    (s) => s.internal < 50
      ? 'Your tenure, performance signals, and project visibility leave you exposed if cuts happen internally.'
      : 'You have reasonable internal standing. Keep building project criticality and manager relationships.',
    action: 'Get assigned to a revenue-critical project in the next 30 days.',
  },
  {
    id:     'external',
    label:  'External Protection',
    icon:   '📡',
    why:    (s) => s.external < 50
      ? 'Your external marketability and interview readiness need attention — landing a new role quickly would be difficult.'
      : 'You have external options. Keep your resume updated and maintain recruiter visibility.',
    action: 'Do one mock interview or apply to one external role in the next 14 days.',
  },
  {
    id:     'financial',
    label:  'Financial Protection',
    icon:   '💰',
    why:    (s) => s.financial < 50
      ? 'Limited runway means a job loss forces you into the first offer rather than the best offer.'
      : 'Your financial buffer gives you negotiating power during a job search.',
    action: 'Build 3 additional months of savings runway.',
  },
  {
    id:     'ai',
    label:  'AI Protection',
    icon:   '🤖',
    why:    (s, hr) => {
      const aiRisk = (hr.breakdown?.['D1'] ?? 0) * 100;
      return aiRisk > 35
        ? `AI displacement risk is high (${Math.round(aiRisk)}% contribution). Your role has significant automated overlap.`
        : 'AI adoption in your role is moderate. Building AI leverage now moves you from target to driver.';
    },
    action: 'Ship one AI-assisted workflow or project in the next 30 days.',
  },
  {
    id:     'network',
    label:  'Network Protection',
    icon:   '🔗',
    why:    (s) => s.network < 50
      ? 'Weak referral network means your job search relies on inbound applications — slower and less effective.'
      : 'Your professional network provides referral paths. Keep nurturing warm contacts.',
    action: 'Reconnect with 3 former colleagues or managers this week.',
  },
];

function computeReadiness(hr: HybridResult, runwayMonths: number | null): ReadinessScores {
  const b = hr.breakdown ?? {};

  // Internal: tenure protection (D4), seniority (D7), performance (D8)
  // Lower breakdown contribution = better internal protection.
  const D4 = b['D4'] ?? 0.38;
  const D7 = b['D7'] ?? 0.28;
  const D8 = b['D8'] ?? 0.25;
  const collapseP = hr.collapseStage === 3 ? 0.30 : hr.collapseStage === 2 ? 0.18 : hr.collapseStage === 1 ? 0.07 : 0;
  const internal = clamp(Math.round((1 - (D4 + D7 + D8) / 3 - collapseP) * 100), 8, 94);

  // External: market demand (D2), company amplification (D3), escape path count
  const D2 = b['D2'] ?? 0.35;
  const D3 = b['D3'] ?? 0.30;
  const levers      = hr.scoreSensitivity?.levers?.length ?? 0;
  const escapeBonus = Math.min(0.18, levers * 0.025);
  const external = clamp(Math.round((1 - (D2 + D3) / 2 + escapeBonus) * 100), 8, 94);

  // Financial: L1 financial vulnerability, runway months
  const L1 = b['L1'] ?? 0.38;
  const runway = runwayMonths ?? 3;
  const runwayBonus = Math.min(0.28, runway / 20); // 20 months = max bonus
  const financial = clamp(Math.round((1 - L1 + runwayBonus) * 100), 8, 94);

  // AI: D1 (AI displacement), D6 (experience complexity)
  const D1 = b['D1'] ?? 0.45;
  const D6 = b['D6'] ?? 0.20;
  const ai = clamp(Math.round((1 - D1 * 0.70 - D6 * 0.30) * 100), 8, 94);

  // Network: networkLeverage.networkScore + visa dependency (employer-tied = penalty)
  const networkRaw = hr.networkLeverage?.networkScore ?? 35;
  const depScore   = hr.visaRisk?.dependencyScore ?? 0; // 0-100; higher = more employer-tied
  const networkAdj = networkRaw - depScore * 0.25;
  const network = clamp(Math.round(networkAdj), 8, 94);

  const overall = Math.round((internal + external + financial + ai + network) / 5);

  return { internal, external, financial, ai, network, overall };
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function scoreColor(s: number) {
  if (s >= 70) return '#10b981';
  if (s >= 50) return '#f59e0b';
  if (s >= 30) return '#f97316';
  return '#ef4444';
}

function scoreLabel(s: number) {
  if (s >= 70) return 'Strong';
  if (s >= 50) return 'Moderate';
  if (s >= 30) return 'Weak';
  return 'Critical';
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props { scoreResult: HybridResult }

export function DefenseReadinessPanel({ scoreResult }: Props) {
  const { userProfile }  = useHumanProof();
  const runwayMonths     = userProfile?.savingsMonthsRunway ?? null;
  const scores           = computeReadiness(scoreResult, runwayMonths);
  const [expanded, setExpanded] = useState<string | null>(null);

  const overallColor = scoreColor(scores.overall);
  const overallLabel = scoreLabel(scores.overall);

  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${overallColor}20`,
      background: `${overallColor}06`, padding: '18px 20px', marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 3 }}>
            DEFENSE READINESS
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            If layoffs happen tomorrow — how prepared are you?
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: overallColor, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
            {scores.overall}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: overallColor }}>
            {overallLabel}
          </span>
        </div>
      </div>

      {/* 5 dimension bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {DIMENSIONS.map(dim => {
          const score = scores[dim.id];
          const color = scoreColor(score);
          const isOpen = expanded === dim.id;

          return (
            <div key={dim.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : dim.id)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{dim.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', flex: 1, minWidth: 0 }}>
                  {dim.label}
                </span>
                {/* Bar */}
                <div style={{ width: 100, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--font-mono, monospace)', width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {score}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{isOpen ? '▲' : '▾'}</span>
              </button>

              {isOpen && (
                <div style={{
                  padding: '10px 14px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}20`,
                  marginBottom: 4,
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
                    {dim.why(scores, scoreResult)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ color, fontSize: 11, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1.4 }}>{dim.action}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall interpretation */}
      <div style={{
        marginTop: 14, padding: '10px 14px', borderRadius: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55,
      }}>
        {scores.overall < 30
          ? '⚠ Critical readiness gap. A layoff today would put you in a very difficult position. Prioritize Financial and External protection immediately.'
          : scores.overall < 50
          ? 'Readiness is below average. Focus on your two lowest dimensions — they have the highest leverage on survivability.'
          : scores.overall < 70
          ? 'Moderate readiness. You could survive a layoff but would face real challenges. Targeted improvements will close the gap quickly.'
          : 'Strong readiness. You are well-positioned to navigate a layoff if it occurs. Maintain your strongest dimensions.'}
      </div>
    </div>
  );
}
