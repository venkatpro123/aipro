// StructuralRiskPanel — "Future AI Wave Assessment" card
// 7-field structural snapshot: current risk, trend, agentic exposure,
// threshold window, post-threshold projection, confidence, runway.
// No fear language. Honest uncertainty throughout.

import React from 'react';
import type { TrajectoryResult, ThresholdForecastResult } from '../../services/DisplacementTrajectoryEngine';
import type { AgenticExposureResult } from '../../services/agenticExposureEngine';
import { getScoreColor } from '../../data/riskFormula';

interface Props {
  currentScore: number;
  trajectory: TrajectoryResult;
  agenticScore: AgenticExposureResult;
  thresholdForecast?: ThresholdForecastResult;
}

function deriveRunway(thresholdForecast?: ThresholdForecastResult): string {
  if (!thresholdForecast) return 'Timeline unclear';
  const window = thresholdForecast.thresholdWindows.capabilityThreshold; // e.g. "2028–2030"
  const parts = window.split('–');
  if (parts.length !== 2) return 'Timeline unclear';
  const startYear = parseInt(parts[0].trim(), 10);
  const currentYear = new Date().getFullYear();
  const yearsRemaining = startYear - currentYear;
  if (isNaN(yearsRemaining) || yearsRemaining <= 0) return 'Threshold approaching';
  if (yearsRemaining <= 2) return `~${yearsRemaining} year${yearsRemaining === 1 ? '' : 's'} — act now`;
  if (yearsRemaining <= 4) return `~${yearsRemaining} years — plan actively`;
  return `~${yearsRemaining}+ years — monitor closely`;
}

function derivePostThresholdRisk(thresholdForecast?: ThresholdForecastResult): string {
  if (!thresholdForecast || thresholdForecast.points.length === 0) return '—';
  const last = thresholdForecast.points[thresholdForecast.points.length - 1];
  return `${last.agenticTransition}% (${last.structuralDisruption}% worst-case)`;
}

function trendLabel(interpretation: string): string {
  const map: Record<string, string> = {
    critical_now:       'Critical — immediate action',
    high_risk_imminent: 'High risk emerging',
    moderate_rising:    'Moderately rising',
    safe_rising:        'Low — slowly rising',
    stable:             'Stable',
    declining_risk:     'Declining risk',
  };
  return map[interpretation] ?? interpretation;
}

function trendColor(interpretation: string): string {
  if (interpretation === 'critical_now')       return 'var(--red)';
  if (interpretation === 'high_risk_imminent') return '#f97316';
  if (interpretation === 'moderate_rising')    return 'var(--amber)';
  if (interpretation === 'safe_rising')        return 'var(--cyan)';
  return 'var(--emerald)';
}

function agenticTierColor(tier: string): string {
  const map: Record<string, string> = {
    LOW: 'var(--emerald)', MODERATE: 'var(--cyan)',
    HIGH: 'var(--amber)', SEVERE: '#f97316', EXTREME: 'var(--red)',
  };
  return map[tier] ?? 'var(--text-3)';
}

export const StructuralRiskPanel: React.FC<Props> = ({
  currentScore, trajectory, agenticScore, thresholdForecast,
}) => {
  const scoreColor   = getScoreColor(currentScore);
  const runway       = deriveRunway(thresholdForecast);
  const postRisk     = derivePostThresholdRisk(thresholdForecast);
  const trendCol     = trendColor(trajectory.interpretation);
  const agentCol     = agenticTierColor(agenticScore.tier);
  const threshWindow = thresholdForecast?.thresholdWindows.capabilityThreshold ?? '—';

  const fields: { label: string; value: string; color: string; sub?: string }[] = [
    {
      label: 'Current Risk',
      value: `${currentScore}%`,
      color: scoreColor,
      sub: `${currentScore < 25 ? 'AI-Resistant' : currentScore < 50 ? 'Resilient' : currentScore < 70 ? 'Exposed' : 'Critical Risk'}`,
    },
    {
      label: 'Current Trend',
      value: trendLabel(trajectory.interpretation),
      color: trendCol,
      sub: `${trajectory.growthPerYear.toFixed(1)}% avg growth / yr`,
    },
    {
      label: 'Agentic Exposure',
      value: `${agenticScore.score}%`,
      color: agentCol,
      sub: `${agenticScore.tier} structural tier`,
    },
    {
      label: 'Capability Threshold Window',
      value: threshWindow,
      color: 'var(--amber)',
      sub: 'Estimated range — not a guarantee',
    },
    {
      label: 'Post-Threshold Projection',
      value: postRisk,
      color: thresholdForecast && thresholdForecast.points.length > 0
        ? getScoreColor(thresholdForecast.points[thresholdForecast.points.length - 1].agenticTransition)
        : 'var(--text-3)',
      sub: 'Agentic transition / worst-case scenarios',
    },
    {
      label: 'Forecast Confidence',
      value: 'HIGH · MEDIUM · SPECULATIVE',
      color: 'var(--text-2)',
      sub: '2026–27 · 2028–29 · 2030–31',
    },
    {
      label: 'Strategic Runway Remaining',
      value: runway,
      color: runway.includes('act now') ? 'var(--red)'
           : runway.includes('actively') ? 'var(--amber)'
           : 'var(--emerald)',
      sub: 'Before capability threshold window opens',
    },
  ];

  return (
    <div style={{
      marginTop: '32px',
      padding: '28px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(251,191,36,0.2)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Amber accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '3px', height: '100%',
        background: 'linear-gradient(180deg, var(--amber), rgba(251,191,36,0.3))',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{
          padding: '3px 10px', borderRadius: '4px',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
          fontSize: '0.62rem', fontWeight: 800, color: 'var(--amber)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        }}>
          FUTURE AI WAVE ASSESSMENT
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
          Structural intelligence — two time horizons
        </span>
      </div>

      {/* 7-field grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
      }}>
        {fields.map(({ label, value, color, sub }) => (
          <div key={label} style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{
              fontSize: '0.58rem', color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
              fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase',
            }}>
              {label}
            </div>
            <div style={{
              fontSize: '0.92rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)',
              lineHeight: 1.3, marginBottom: sub ? '4px' : 0,
            }}>
              {value}
            </div>
            {sub && (
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.4 }}>
                {sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* D7 narrative if available */}
      {thresholdForecast && (
        <div style={{
          marginTop: '18px', padding: '14px 18px',
          borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(251,191,36,0.15)',
          borderLeft: '2px solid var(--amber)',
        }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '6px' }}>
            STRUCTURAL OUTLOOK
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
            {thresholdForecast.narrative}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: '16px', paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5,
      }}>
        Projections are probabilistic estimates conditioned on D7 (Agentic Disruption Potential) and AI adoption research. Post-threshold values represent scenarios, not guarantees. Timing depends on regulatory, economic, and technical factors outside any model's certainty.
      </div>
    </div>
  );
};
