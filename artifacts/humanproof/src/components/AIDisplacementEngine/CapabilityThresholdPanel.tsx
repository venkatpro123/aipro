// CapabilityThresholdPanel — §3 Capability Threshold Forecast
// Shows 4-phase capability timeline + 3 parallel forecast scenarios (D7-conditioned).
// Never shows exact single years — always uses ranges.

import React from 'react';
import type { TrajectoryResult, ThresholdForecastResult } from '../../services/DisplacementTrajectoryEngine';
import type { AutomationTimeline } from '../../data/automationTimelineData';

interface Props {
  trajectory: TrajectoryResult;
  timeline: AutomationTimeline;
  scoreColor: string;
  thresholdForecast?: ThresholdForecastResult;
}

interface Phase {
  id: string;
  label: string;
  sublabel: string;
  detail: string;
  color: string;
  active: boolean;
}

function getCurrentPhase(score: number, crossover: string | null, impactTimeline: string): number {
  if (score >= 65) return 3;
  if (score >= 45 || impactTimeline === 'short') return 2;
  if (score >= 25 || impactTimeline === 'medium') return 1;
  return 0;
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
  if (level === 'HIGH' || level === 'SEVERE')  return 'var(--red)';
  if (level === 'MODERATE')                    return 'var(--amber)';
  return 'var(--emerald)';
}

const BAND_COLORS: Record<string, string> = {
  high:        'var(--emerald)',
  medium:      'var(--amber)',
  speculative: 'var(--red)',
};
const BAND_LABELS: Record<string, string> = {
  high: 'HIGH', medium: 'MEDIUM', speculative: 'SPECULATIVE',
};

export const CapabilityThresholdPanel: React.FC<Props> = ({
  trajectory, timeline, scoreColor, thresholdForecast,
}) => {
  const currentBase    = trajectory.years.length > 0 ? (trajectory.years[0].base ?? 0) : 0;
  const activePhaseIdx = Math.min(3, Math.max(0, getCurrentPhase(
    currentBase, trajectory.displacementCrossover, timeline.impactTimeline,
  )));
  const conf = confidenceFromTrajectory(trajectory.interpretation);

  const phases: Phase[] = [
    {
      id: 'current',
      label: 'TODAY',
      sublabel: "AI tools help, but you're in charge",
      detail: 'AI tools help you work faster, but you make the decisions. Your role value is intact.',
      color: 'var(--emerald)',
      active: activePhaseIdx === 0,
    },
    {
      id: 'approaching',
      label: 'NEAR FUTURE',
      sublabel: 'AI handles more steps on its own',
      detail: 'AI takes on multi-step tasks with less oversight. Your role shifts toward directing, reviewing, and handling exceptions.',
      color: 'var(--cyan)',
      active: activePhaseIdx === 1,
    },
    {
      id: 'threshold',
      label: 'MAJOR SHIFT',
      sublabel: thresholdForecast
        ? thresholdForecast.thresholdWindows.capabilityThreshold
        : 'Timeline — monitoring',
      detail: "AI can do most of the core routine work in this role on its own. This is when the biggest changes happen.",
      color: 'var(--amber)',
      active: activePhaseIdx === 2,
    },
    {
      id: 'post',
      label: 'TRANSFORMED',
      sublabel: 'Your role looks very different',
      detail: 'The role has fundamentally changed. Human value is concentrated in strategy, ethics, novel problems, and relationships.',
      color: scoreColor,
      active: activePhaseIdx === 3,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>WHEN WILL AI CHANGE YOUR JOB?</h3>
        <div style={{
          padding: '2px 8px', borderRadius: '4px',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
          fontSize: '0.58rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 800,
        }}>
          BASED ON ROLE-SPECIFIC AI RESEARCH
        </div>
      </div>

      {/* ── Phase timeline ── */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <div style={{
          position: 'absolute', top: '24px', left: '24px', right: '24px', height: '2px',
          background: 'rgba(255,255,255,0.08)', zIndex: 0,
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', position: 'relative', zIndex: 1 }}>
          {phases.map((phase, i) => (
            <div key={phase.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.58rem', fontWeight: 800,
                  color: phase.active ? phase.color : 'var(--text-3)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: '4px',
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

      {/* ── Active phase detail ── */}
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
              WHERE YOU ARE NOW
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
              {active.detail}
            </p>
          </div>
        );
      })()}

      {/* ── THREE PARALLEL FORECASTS chart ── */}
      {thresholdForecast && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
              THREE POSSIBLE FUTURES FOR YOUR ROLE
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { color: 'var(--emerald)', label: 'AI tools today' },
                { color: 'var(--cyan)',    label: 'Advanced AI (next wave)' },
                { color: 'var(--red)',     label: 'Full automation scenario' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '2px', background: color }} />
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Threshold zone note */}
          {thresholdForecast.thresholdJumpMagnitude > 6 && (
            <div style={{
              marginBottom: '12px', padding: '8px 14px', borderRadius: '6px',
              background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)',
              fontSize: '0.65rem', color: 'var(--amber)',
            }}>
              These years are when the biggest shift is expected for roles like yours.
              Expected change size: <strong>+{thresholdForecast.thresholdJumpMagnitude}pts</strong>
            </div>
          )}

          {/* Bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thresholdForecast.points.length}, 1fr)`, gap: '6px' }}>
            {thresholdForecast.points.map((pt) => {
              const maxVal = Math.max(pt.currentState, pt.agenticTransition, pt.structuralDisruption, 30);
              const barH   = 90; // total bar area px
              const bColor = BAND_COLORS[pt.confidenceBand];

              return (
                <div key={pt.year} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '6px',
                  background: pt.isThresholdZone ? 'rgba(251,191,36,0.05)' : 'transparent',
                  border: pt.isThresholdZone ? '1px solid rgba(251,191,36,0.2)' : '1px solid transparent',
                }}>
                  {/* Bars grouped */}
                  <div style={{
                    display: 'flex', gap: '3px', alignItems: 'flex-end',
                    height: `${barH}px`,
                  }}>
                    {[
                      { val: pt.currentState,        color: 'var(--emerald)' },
                      { val: pt.agenticTransition,   color: pt.isThresholdZone ? 'var(--amber)' : 'var(--cyan)' },
                      { val: pt.structuralDisruption, color: 'var(--red)' },
                    ].map(({ val, color }, bi) => (
                      <div
                        key={bi}
                        title={`${val}%`}
                        style={{
                          width: '10px',
                          height: `${Math.round((val / 100) * barH)}px`,
                          background: color,
                          borderRadius: '2px 2px 0 0',
                          opacity: 0.85,
                          transition: 'height 0.8s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Year label */}
                  <div style={{ fontSize: '0.6rem', color: pt.isThresholdZone ? 'var(--amber)' : 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: pt.isThresholdZone ? 800 : 400 }}>
                    {pt.year}
                  </div>

                  {/* Confidence band chip */}
                  <div style={{
                    fontSize: '0.48rem', fontWeight: 800, color: bColor,
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                    padding: '1px 4px', borderRadius: '3px',
                    background: `${bColor}12`, border: `1px solid ${bColor}30`,
                  }}>
                    {BAND_LABELS[pt.confidenceBand]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Narrative */}
          <div style={{
            marginTop: '14px', padding: '12px 16px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
            borderLeft: '2px solid var(--amber)',
          }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
              {thresholdForecast.narrative}
            </p>
          </div>
        </div>
      )}

      {/* ── AGENTIC THRESHOLD WINDOWS ── */}
      {thresholdForecast && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '12px' }}>
            WHEN EACH STAGE IS EXPECTED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'AI CAN DO THE WORK',      value: thresholdForecast.thresholdWindows.capabilityThreshold,  color: 'var(--amber)', desc: 'When AI tools become capable enough to do your core tasks' },
              { label: 'COMPANIES START SWITCHING', value: thresholdForecast.thresholdWindows.orgAdoption,       color: 'var(--cyan)',  desc: 'When most employers start using these AI tools at scale' },
              { label: 'JOBS START CHANGING',    value: thresholdForecast.thresholdWindows.workforceReduction,   color: 'var(--red)',   desc: 'When people in this role are likely to see real impact' },
            ].map(({ label, value, color, desc }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '8px',
                background: `${color}06`, border: `1px solid ${color}20`,
                flexWrap: 'wrap', gap: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '2px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{desc}</div>
                </div>
                <div style={{
                  fontSize: '0.9rem', fontWeight: 900, color, fontFamily: 'var(--font-mono)',
                  padding: '4px 10px', borderRadius: '6px',
                  background: `${color}12`, border: `1px solid ${color}30`,
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Existing confidence bands ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Direction certainty', value: conf.direction },
          { label: 'Timing certainty',    value: conf.timing },
          { label: 'Expected impact',     value: conf.impact },
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

      {/* ── Disclaimer ── */}
      <div style={{
        padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Timing estimates are based on AI adoption research (WEF 2025, McKinsey 2024) and are ranges, not exact dates. The three scenarios show optimistic, middle, and worst-case paths. This is a planning tool, not a guarantee.
      </div>
    </div>
  );
};
