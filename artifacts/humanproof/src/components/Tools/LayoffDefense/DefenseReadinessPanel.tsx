// DefenseReadinessPanel.tsx — Phase 2: Defense Readiness Framework (v2)
// Answers: "If layoffs happen tomorrow, will I survive?"
// Five dimensions: Internal / External / Financial / AI / Network
// Each dimension expands to show sub-driver breakdown with weakest/strongest driver callouts.

import { useState, useEffect } from 'react';
import type { HybridResult } from '../../../types/hybridResult';
import { useHumanProof } from '../../../context/HumanProofContext';
import { useDefenseIntelligence } from './DefenseIntelligenceContext';

// ── Utility ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreColor(s: number): string {
  if (s >= 70) return '#10b981';
  if (s >= 50) return '#f59e0b';
  if (s >= 30) return '#f97316';
  return '#ef4444';
}

function scoreLabel(s: number): string {
  if (s >= 70) return 'Strong';
  if (s >= 50) return 'Moderate';
  if (s >= 30) return 'Weak';
  return 'Critical';
}

// ── Sub-driver types ──────────────────────────────────────────────────────────

interface SubDriver {
  label: string;
  score: number;
}

interface DimensionBreakdown {
  internal: SubDriver[];
  external: SubDriver[];
  financial: SubDriver[];
  ai: SubDriver[];
  network: SubDriver[];
}

// ── Dimension keys that trigger auto-expand via activeThreat ─────────────────

const DIMENSION_THREAT_KEYS: Record<string, string[]> = {
  internal:  ['D4', 'D7', 'D8'],
  external:  ['D2', 'D3', 'D6'],
  financial: ['L1'],
  ai:        ['D1', 'D6'],
  network:   ['D5'],
};

// ── Dimension metadata ───────────────────────────────────────────────────────

interface DimensionMeta {
  id: keyof DimensionBreakdown;
  label: string;
  icon: string;
  action: string;
}

const DIMENSIONS: DimensionMeta[] = [
  {
    id:     'internal',
    label:  'Internal Protection',
    icon:   '🏛️',
    action: 'Ask your manager for a stretch project or visibility opportunity this week.',
  },
  {
    id:     'external',
    label:  'External Protection',
    icon:   '📡',
    action: 'Update your resume with 3 quantified achievements and activate LinkedIn \'Open to Work\' privately.',
  },
  {
    id:     'financial',
    label:  'Financial Protection',
    icon:   '💰',
    action: 'Transfer 1 month\'s expenses to a separate emergency account before end of month.',
  },
  {
    id:     'ai',
    label:  'AI Protection',
    icon:   '🤖',
    action: 'Ship one AI-assisted deliverable or workflow in the next 14 days.',
  },
  {
    id:     'network',
    label:  'Network Protection',
    icon:   '🔗',
    action: 'Send 3 personalised messages to former colleagues you haven\'t spoken to in 6+ months.',
  },
];

// ── Sub-driver computation ────────────────────────────────────────────────────

function computeBreakdown(hr: HybridResult, runwayMonths: number | null): DimensionBreakdown {
  const b = hr.breakdown ?? { L1: 0.38, L2: 0.5, L3: 0.5, L4: 0.5, L5: 0.5 };
  const D1 = (b as unknown as Record<string, number>)['D1'] ?? 0.45;
  const D2 = (b as unknown as Record<string, number>)['D2'] ?? 0.35;
  const D3 = (b as unknown as Record<string, number>)['D3'] ?? 0.30;
  const D4 = (b as unknown as Record<string, number>)['D4'] ?? 0.38;
  const D6 = (b as unknown as Record<string, number>)['D6'] ?? 0.20;
  const D7 = (b as unknown as Record<string, number>)['D7'] ?? 0.28;
  const D8 = (b as unknown as Record<string, number>)['D8'] ?? 0.25;
  const L1 = b.L1 ?? 0.38;

  const networkRaw = hr.networkLeverage?.networkScore ?? 35;
  const levers = hr.scoreSensitivity?.levers ?? [];
  const runway = runwayMonths ?? 3;

  // AI leverage: find the D1 lever's scoreDropIfImproved and map to [30,85]
  const d1Lever = levers.find(l => l.dimension === 'D1');
  const aiLeverageRaw = d1Lever ? d1Lever.scoreDropIfImproved : 0;
  // scoreDropIfImproved typically 0–20; map to 30–85
  const aiLeverageScore = clamp(Math.round(30 + (aiLeverageRaw / 20) * 55), 30, 85);

  // Recruiter visibility: levers.length * 10, clamped to [40, 85]
  const recruiterVisibility = clamp(levers.length * 10, 40, 85);

  const internal: SubDriver[] = [
    { label: 'Manager Visibility',     score: clamp(Math.round((1 - D8) * 90 + 10), 10, 94) },
    { label: 'Project Criticality',    score: clamp(Math.round((1 - D4) * 85 + 15), 10, 94) },
    { label: 'Performance Reputation', score: clamp(Math.round((1 - D8) * 80 + 20), 10, 94) },
    { label: 'Organisational Influence', score: clamp(Math.round((1 - D7) * 75 + 15), 10, 94) },
  ];

  const external: SubDriver[] = [
    { label: 'Interview Readiness',  score: clamp(Math.round((1 - D2) * 85 + 15), 10, 94) },
    { label: 'Resume Currency',      score: clamp(Math.round((1 - D6) * 80 + 20), 10, 94) },
    { label: 'Market Demand',        score: clamp(Math.round((1 - D2) * 90 + 10), 10, 94) },
    { label: 'Recruiter Visibility', score: recruiterVisibility },
  ];

  const financial: SubDriver[] = [
    { label: 'Savings Runway',    score: clamp(Math.round(Math.min(90, (runway / 12) * 100)), 10, 94) },
    { label: 'Emergency Buffer',  score: clamp(Math.round((1 - L1) * 80 + 10), 10, 94) },
    { label: 'Income Stability',  score: clamp(Math.round((1 - D3) * 85 + 15), 10, 94) },
    { label: 'Debt Load',         score: clamp(Math.round((1 - L1) * 70 + 20), 10, 94) },
  ];

  const ai: SubDriver[] = [
    { label: 'AI Tool Adoption',   score: clamp(Math.round((1 - D1) * 85 + 5),  10, 94) },
    { label: 'Skill Currency',     score: clamp(Math.round((1 - D6) * 80 + 10), 10, 94) },
    { label: 'Automation Overlap', score: clamp(Math.round((1 - D1) * 75 + 15), 10, 94) },
    { label: 'AI Leverage',        score: aiLeverageScore },
  ];

  const network: SubDriver[] = [
    { label: 'Referral Quality',      score: clamp(Math.round(networkRaw * 0.90), 10, 94) },
    { label: 'Industry Connections',  score: clamp(Math.round(networkRaw * 0.85), 10, 94) },
    { label: 'Alumni Network',        score: clamp(Math.round(networkRaw * 0.75), 10, 94) },
    { label: 'Online Presence',       score: clamp(Math.round(networkRaw * 0.70), 10, 94) },
  ];

  return { internal, external, financial, ai, network };
}

// ── Dimension overall score = average of sub-drivers ─────────────────────────

function dimAvg(drivers: SubDriver[]): number {
  return Math.round(drivers.reduce((s, d) => s + d.score, 0) / drivers.length);
}

// ── Mini bar component ────────────────────────────────────────────────────────

function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div
      style={{
        width: 40,
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${score}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.35s ease',
        }}
      />
    </div>
  );
}

// ── Sub-driver pill ───────────────────────────────────────────────────────────

function SubDriverPill({ driver }: { driver: SubDriver }) {
  const color = scoreColor(driver.score);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}18`,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'rgba(255,255,255,0.55)',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {driver.label}
      </span>
      <MiniBar score={driver.score} color={color} />
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono, monospace)',
          flexShrink: 0,
          width: 22,
          textAlign: 'right',
        }}
      >
        {driver.score}
      </span>
    </div>
  );
}

// ── Expanded detail panel ─────────────────────────────────────────────────────

function ExpandedDetail({
  drivers,
  action,
  borderColor,
}: {
  drivers: SubDriver[];
  action: string;
  borderColor: string;
}) {
  const sorted = [...drivers].sort((a, b) => a.score - b.score);
  const weakest  = sorted[0];
  const strongest = sorted[sorted.length - 1];

  return (
    <div
      style={{
        padding: '10px 12px 12px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${borderColor}22`,
        marginTop: 2,
        marginBottom: 4,
      }}
    >
      {/* 2×2 sub-driver grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          marginBottom: 10,
        }}
      >
        {drivers.map(d => (
          <SubDriverPill key={d.label} driver={d} />
        ))}
      </div>

      {/* Weakest / Strongest callouts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#f59e0b', fontFamily: 'var(--font-mono, monospace)' }}>
            ▼ Weakest Driver:
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>
            {weakest.label}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, monospace)' }}>
            {weakest.score}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#10b981', fontFamily: 'var(--font-mono, monospace)' }}>
            ▲ Strongest Driver:
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981' }}>
            {strongest.label}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, monospace)' }}>
            {strongest.score}
          </span>
        </div>
      </div>

      {/* Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          padding: '7px 10px',
          borderRadius: 6,
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.18)',
        }}
      >
        <span style={{ color: '#818cf8', fontSize: 11, flexShrink: 0 }}>→</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', lineHeight: 1.45 }}>
          {action}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { scoreResult: HybridResult }

export function DefenseReadinessPanel({ scoreResult }: Props) {
  const { userProfile }               = useHumanProof();
  const { activeThreat }              = useDefenseIntelligence();
  const runwayMonths                  = userProfile?.savingsMonthsRunway ?? null;

  const breakdown = computeBreakdown(scoreResult, runwayMonths);

  // Derive per-dimension overall scores
  const scores: Record<keyof DimensionBreakdown, number> = {
    internal:  dimAvg(breakdown.internal),
    external:  dimAvg(breakdown.external),
    financial: dimAvg(breakdown.financial),
    ai:        dimAvg(breakdown.ai),
    network:   dimAvg(breakdown.network),
  };

  const overall = Math.round(
    Object.values(scores).reduce((s, v) => s + v, 0) / 5
  );

  // Determine which dimension to auto-expand based on activeThreat
  function threatDimension(threat: string | null): string | null {
    if (!threat) return null;
    for (const [dim, keys] of Object.entries(DIMENSION_THREAT_KEYS)) {
      if (keys.includes(threat)) return dim;
    }
    return null;
  }

  const [manualExpanded, setManualExpanded] = useState<string | null>(null);

  // When activeThreat changes, auto-expand the relevant dimension
  useEffect(() => {
    const dim = threatDimension(activeThreat);
    if (dim) setManualExpanded(dim);
  }, [activeThreat]);

  const overallColor = scoreColor(overall);
  const overallLabel = scoreLabel(overall);
  const threatDim    = threatDimension(activeThreat);

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${overallColor}20`,
        background: `${overallColor}06`,
        padding: '18px 20px',
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.12em',
              marginBottom: 3,
            }}
          >
            DEFENSE READINESS
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            If layoffs happen tomorrow — how prepared are you?
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: overallColor,
              fontFamily: 'var(--font-mono, monospace)',
              lineHeight: 1,
            }}
          >
            {overall}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: overallColor }}>
            {overallLabel}
          </span>
        </div>
      </div>

      {/* 5 dimension rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {DIMENSIONS.map(dim => {
          const score    = scores[dim.id];
          const color    = scoreColor(score);
          const isOpen   = manualExpanded === dim.id;
          const isThreat = threatDim === dim.id;
          const drivers  = breakdown[dim.id];

          return (
            <div
              key={dim.id}
              style={{
                borderRadius: 8,
                border: isThreat ? '1px solid #06b6d4' : '1px solid transparent',
                transition: 'border-color 0.25s ease',
                padding: isThreat ? '0 4px' : '0',
              }}
            >
              {/* Row button */}
              <button
                type="button"
                onClick={() =>
                  setManualExpanded(prev => (prev === dim.id ? null : dim.id))
                }
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 2px',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{dim.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {dim.label}
                </span>
                {/* Progress bar */}
                <div
                  style={{
                    width: 100,
                    height: 5,
                    borderRadius: 3,
                    background: 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${score}%`,
                      background: color,
                      borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color,
                    fontFamily: 'var(--font-mono, monospace)',
                    width: 28,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {score}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: isThreat ? '#06b6d4' : 'rgba(255,255,255,0.25)',
                    flexShrink: 0,
                  }}
                >
                  {isOpen ? '▲' : '▾'}
                </span>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <ExpandedDetail
                  drivers={drivers}
                  action={dim.action}
                  borderColor={color}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Overall interpretation footer */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.55,
        }}
      >
        {overall < 30
          ? '⚠ Critical readiness gap. A layoff today would put you in a very difficult position. Prioritise Financial and External protection immediately.'
          : overall < 50
          ? 'Readiness is below average. Focus on your two lowest dimensions — they have the highest leverage on survivability.'
          : overall < 70
          ? 'Moderate readiness. You could survive a layoff but would face real challenges. Targeted improvements will close the gap quickly.'
          : 'Strong readiness. You are well-positioned to navigate a layoff if it occurs. Maintain your strongest dimensions.'}
      </div>
    </div>
  );
}
