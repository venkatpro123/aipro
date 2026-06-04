// CapabilityThresholdPanel — §3 Capability Threshold Forecast
// Replaces the linear year-by-year grid with a 4-phase capability timeline.
// Never shows exact single years — always uses ranges.

import React from 'react';
import type { TrajectoryResult } from '../../services/DisplacementTrajectoryEngine';
import type { AutomationTimeline } from '../../data/automationTimelineData';

interface Props {
  trajectory: TrajectoryResult;
  timeline: AutomationTimeline;
  scoreColor: string;
}

interface Phase {
  id: string;
  label: string;
  sublabel: string;
  detail: string;
  color: string;
  active: boolean;
}

function deriveThresholdWindow(crossover: string | null, baseYear: number): string {
  if (!crossover) return 'Timeline unclear — monitoring';
  const yr = parseInt(crossover, 10);
  if (isNaN(yr)) return 'Timeline unclear — monitoring';
  return `Estimated: ${yr - 1}–${yr + 1}`;
}

function getCurrentPhase(score: number, crossover: string | null, impactTimeline: string): number {
  // Returns index 0-3 of the current phase
  if (score >= 65) return 3; // post-threshold
  if (score >= 45 || impactTimeline === 'short') return 2; // approaching threshold
  if (score >= 25 || impactTimeline === 'medium') return 1; // approaching
  return 0; // current state
}

function confidenceFromTrajectory(interpretation: string): { direction: string; timing: string; impact: string } {
  const map: Record<string, { direction: string; timing: string; impact: string }> = {
    critical_now:       { direction: 'HIGH',     timing: 'HIGH',     impact: 'SEVERE' },
    high_risk_imminent: { direction: 'HIGH',     timing: 'MODERATE', impact: 'HIGH' },
    moderate_rising:    { direction: 'MODERATE', timing: 'MODERATE', impact: 'MODERATE' },
    safe_rising:        { direction: 'MODERATE', timing: 'LOW',      impact: 'LOW' },
    stable:             { direction: 'LOW',      timing: 'LOW',      impact: 'LOW' },
    declining_risk:     { direction: 'LOW',      timing: 'LOW',      impact: 'LOW' },
  };
  return map[interpretation] ?? { direction: 'MODERATE', timing: 'LOW', impact: 'MODERATE' };
}

function confidenceColor(level: string): string {
  if (level === 'HIGH' || level === 'SEVERE')    return 'var(--red)';
  if (level === 'MODERATE')  return 'var(--amber)';
  return 'var(--emerald)';
}

export const CapabilityThresholdPanel: React.FC<Props> = ({ trajectory, timeline, scoreColor }) => {
  const thresholdWindow = deriveThresholdWindow(trajectory.displacementCrossover, trajectory.baseYear);
  const currentBase     = trajectory.years.length > 0 ? (trajectory.years[0].base ?? 0) : 0;
  const activePhaseIdx  = Math.min(3, Math.max(0, getCurrentPhase(currentBase, trajectory.displacementCrossover, timeline.impactTimeline)));
  const conf = confidenceFromTrajectory(trajectory.interpretation);

  const phases: Phase[] = [
    {
      id: 'current',
      label: 'CURRENT STATE',
      sublabel: 'AI assists workers',
      detail: `AI tools augment productivity. Human oversight drives quality and decisions. Role value remains intact.`,
      color: 'var(--emerald)',
      active: activePhaseIdx === 0,
    },
    {
      id: 'approaching',
      label: 'APPROACHING STATE',
      sublabel: 'AI completes significant workflows',
      detail: `Autonomous AI handles multi-step tasks. Human role shifts toward direction, review, and exception handling.`,
      color: 'var(--cyan)',
      active: activePhaseIdx === 1,
    },
    {
      id: 'threshold',
      label: 'AUTONOMOUS THRESHOLD',
      sublabel: thresholdWindow,
      detail: `Capability crossover window where agentic AI can perform the majority of this role's routine execution tasks independently.`,
      color: 'var(--amber)',
      active: activePhaseIdx === 2,
    },
    {
      id: 'post',
      label: 'POST-THRESHOLD STATE',
      sublabel: 'AI performs majority of execution tasks',
      detail: `Role fundamentally transformed. Human value concentrated in strategy, ethics, novel problems, and client relationships.`,
      color: scoreColor,
      active: activePhaseIdx === 3,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>CAPABILITY THRESHOLD FORECAST</h3>
        <div style={{
          padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
          fontSize: '0.58rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 800,
        }}>
          PHASE-BASED · NO LINEAR PROJECTION
        </div>
      </div>

      {/* Phase timeline */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute', top: '24px', left: '24px', right: '24px', height: '2px',
          background: 'rgba(255,255,255,0.08)', zIndex: 0,
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', position: 'relative', zIndex: 1 }}>
          {phases.map((phase, i) => (
            <div key={phase.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Node */}
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: phase.active ? `${phase.color}20` : 'rgba(255,255,255,0.03)',
                border: `2px solid ${phase.active ? phase.color : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '12px', flexShrink: 0,
                boxShadow: phase.active ? `0 0 16px ${phase.color}40` : 'none',
                transition: 'all 0.3s ease',
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: phase.active ? phase.color : 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
                  {i + 1}
                </span>
              </div>

              {/* Labels */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.58rem', fontWeight: 800,
                  color: phase.active ? phase.color : 'var(--text-3)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                  marginBottom: '4px',
                }}>
                  {phase.label}
                </div>
                <div style={{
                  fontSize: '0.68rem', fontWeight: phase.active ? 700 : 400,
                  color: phase.active ? 'var(--text)' : 'var(--text-3)',
                  lineHeight: 1.4, marginBottom: '6px',
                }}>
                  {phase.sublabel}
                </div>
                {phase.active && (
                  <div style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                    background: `${phase.color}18`, border: `1px solid ${phase.color}40`,
                    fontSize: '0.58rem', color: phase.color, fontFamily: 'var(--font-mono)', fontWeight: 800,
                  }}>
                    YOU ARE HERE
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase detail card — active phase */}
      {(() => {
        const active = phases[activePhaseIdx] ?? phases[0];
        if (!active) return null;
        return (
          <div style={{
            padding: '16px 20px', borderRadius: 'var(--radius-lg)',
            background: `${active.color}08`, border: `1px solid ${active.color}25`,
            marginBottom: '28px',
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: active.color, marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
              CURRENT PHASE DETAIL
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
              {active.detail}
            </p>
          </div>
        );
      })()}

      {/* Confidence bands */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Direction Confidence', value: conf.direction },
          { label: 'Timing Confidence',    value: conf.timing },
          { label: 'Impact Severity',      value: conf.impact },
        ].map(({ label, value }) => {
          const c = confidenceColor(value);
          return (
            <div key={label} style={{
              padding: '12px 16px', borderRadius: '8px',
              background: `${c}0a`, border: `1px solid ${c}25`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '6px', letterSpacing: '0.06em' }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: c, fontFamily: 'var(--font-mono)' }}>
                {value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        <strong style={{ color: 'var(--text-2)' }}>Methodology note:</strong> Phases represent capability thresholds derived from AI adoption research (WEF 2025, McKinsey 2024). Timing windows are probabilistic ranges — actual transition speed depends on regulatory environment, economic conditions, and breakthrough events. This is structural intelligence, not a guaranteed forecast.
      </div>
    </div>
  );
};
