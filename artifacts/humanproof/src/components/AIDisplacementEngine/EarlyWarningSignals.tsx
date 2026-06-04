// EarlyWarningSignals — §7 Early Warning Signals
// Wave status display + signal monitor panel.

import React from 'react';
import type { AutomationTimeline } from '../../data/automationTimelineData';
import type { IndustryRisk } from '../../data/industryRiskData';

interface Props {
  timeline: AutomationTimeline;
  industryRisk: IndustryRisk | null;
  scoreColor: string;
  industryLabel: string;
}

type WaveStatus = 'EARLY' | 'BUILDING' | 'ACCELERATING' | 'INFLECTION POINT' | 'ACTIVE DISRUPTION';

interface SignalItem {
  name: string;
  description: string;
  status: 'ACTIVE' | 'MONITORING' | 'PENDING';
}

const WAVE_COLORS: Record<WaveStatus, string> = {
  'EARLY':             'var(--emerald)',
  'BUILDING':          'var(--cyan)',
  'ACCELERATING':      'var(--amber)',
  'INFLECTION POINT':  '#f97316',
  'ACTIVE DISRUPTION': 'var(--red)',
};

const WAVE_DESC: Record<WaveStatus, string> = {
  'EARLY':             'Early indicators present. AI capabilities exist but adoption in this sector is limited. Preparation window is wide.',
  'BUILDING':          'AI capability is maturing and enterprise adoption is increasing. Workflow changes are beginning to appear across the industry.',
  'ACCELERATING':      'Rapid capability advancement combined with accelerating adoption. Meaningful role restructuring is underway in leading organizations.',
  'INFLECTION POINT':  'The capability-economics threshold has been reached. AI can now perform a significant portion of core tasks at scale. Major workforce adjustments are starting.',
  'ACTIVE DISRUPTION': 'Full-scale autonomous AI deployment underway. Role function is changing at industry-wide pace. Immediate strategic action required.',
};

function deriveWaveStatus(timeline: AutomationTimeline, industryRisk: IndustryRisk | null): WaveStatus {
  const adoption = industryRisk?.aiAdoptionRate ?? 0.5;
  const tier      = timeline.riskTier;
  const impact    = timeline.impactTimeline;

  if ((tier === 'very_high' && impact === 'short') || adoption >= 0.85) return 'ACTIVE DISRUPTION';
  if ((tier === 'high'      && impact === 'short') || (tier === 'very_high' && impact === 'medium')) return 'INFLECTION POINT';
  if (impact === 'short' || adoption >= 0.70)      return 'ACCELERATING';
  if (adoption >= 0.50 || tier === 'moderate')     return 'BUILDING';
  return 'EARLY';
}

function buildSignals(timeline: AutomationTimeline, waveStatus: WaveStatus, industryLabel: string): SignalItem[] {
  const isActive       = waveStatus === 'ACTIVE DISRUPTION' || waveStatus === 'INFLECTION POINT';
  const isAccelerating = waveStatus === 'ACCELERATING';

  return [
    {
      name: 'Agent Capability Breakthroughs',
      description: `New autonomous AI agents capable of multi-step ${timeline.topTasksAtRisk[0]?.toLowerCase() ?? 'task execution'} without human oversight`,
      status: isActive ? 'ACTIVE' : isAccelerating ? 'MONITORING' : 'PENDING',
    },
    {
      name: `Major Workforce Reductions in ${industryLabel}`,
      description: `Large-scale headcount reductions citing AI automation or productivity improvements across sector peers`,
      status: isActive ? 'ACTIVE' : isAccelerating ? 'ACTIVE' : 'MONITORING',
    },
    {
      name: 'AI-First Company Announcements',
      description: `Public announcements of AI-first operating models replacing traditional role structures`,
      status: isAccelerating || isActive ? 'ACTIVE' : 'MONITORING',
    },
    {
      name: 'Productivity Multiplier Reports',
      description: `Research showing ${timeline.automationDrivers[0]?.split('/')[0] ?? 'AI tools'} delivering 3–10× productivity gains for this role category`,
      status: timeline.impactTimeline === 'short' ? 'ACTIVE' : 'MONITORING',
    },
    {
      name: 'Automation Milestone Events',
      description: `Demonstrations of AI completing "${timeline.topTasksAtRisk[1] ?? 'core workflows'}" end-to-end without human review`,
      status: timeline.riskTier === 'very_high' ? 'ACTIVE' : timeline.riskTier === 'high' ? 'MONITORING' : 'PENDING',
    },
  ];
}

function statusColor(s: SignalItem['status']): string {
  if (s === 'ACTIVE')     return 'var(--red)';
  if (s === 'MONITORING') return 'var(--amber)';
  return 'var(--text-3)';
}

function waveProgress(status: WaveStatus): number {
  const map: Record<WaveStatus, number> = {
    'EARLY': 10, 'BUILDING': 30, 'ACCELERATING': 55, 'INFLECTION POINT': 78, 'ACTIVE DISRUPTION': 98,
  };
  return map[status];
}

export const EarlyWarningSignals: React.FC<Props> = ({ timeline, industryRisk, scoreColor, industryLabel }) => {
  const waveStatus = deriveWaveStatus(timeline, industryRisk);
  const waveColor  = WAVE_COLORS[waveStatus];
  const signals    = buildSignals(timeline, waveStatus, industryLabel);
  const progress   = waveProgress(waveStatus);

  return (
    <div style={{ marginTop: '28px' }}>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>EARLY WARNING SIGNALS</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '20px', lineHeight: 1.5 }}>
        Key indicators monitoring the progression of AI capability adoption in your sector.
      </p>

      {/* Wave status */}
      <div style={{
        padding: '20px 24px', borderRadius: 'var(--radius-xl)',
        background: `${waveColor}0a`, border: `1px solid ${waveColor}30`,
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px', letterSpacing: '0.08em' }}>
              CURRENT WAVE STATUS
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: waveColor,
                boxShadow: `0 0 8px ${waveColor}`,
                animation: waveStatus !== 'EARLY' ? 'pulse 2s infinite' : 'none',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: waveColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                {waveStatus}
              </span>
            </div>
          </div>
          <div style={{
            padding: '4px 12px', borderRadius: '6px',
            background: `${waveColor}15`, border: `1px solid ${waveColor}35`,
            fontSize: '0.68rem', color: waveColor, fontWeight: 700, fontFamily: 'var(--font-mono)',
          }}>
            {industryLabel}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            {(['EARLY', 'BUILDING', 'ACCELERATING', 'INFLECTION POINT', 'ACTIVE DISRUPTION'] as WaveStatus[]).map((s) => (
              <span key={s} style={{
                fontSize: '0.5rem', fontFamily: 'var(--font-mono)',
                color: s === waveStatus ? waveColor : 'rgba(255,255,255,0.15)',
                fontWeight: s === waveStatus ? 800 : 400,
              }}>
                {s.split(' ')[0]}
              </span>
            ))}
          </div>
          <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`, background: waveColor,
              borderRadius: '2px', transition: 'width 1s ease',
              boxShadow: `0 0 8px ${waveColor}66`,
            }} />
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
          {WAVE_DESC[waveStatus]}
        </p>
      </div>

      {/* Signal list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {signals.map((signal) => {
          const c = statusColor(signal.status);
          return (
            <div
              key={signal.name}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '12px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Status dot */}
              <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: c,
                  display: 'inline-block',
                  boxShadow: signal.status === 'ACTIVE' ? `0 0 6px ${c}` : 'none',
                  animation: signal.status === 'ACTIVE' ? 'pulse 2s infinite' : 'none',
                }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                    {signal.name}
                  </span>
                  <span style={{
                    padding: '1px 7px', borderRadius: '4px', flexShrink: 0,
                    background: `${c}15`, border: `1px solid ${c}30`,
                    fontSize: '0.58rem', fontWeight: 800, color: c, fontFamily: 'var(--font-mono)',
                  }}>
                    {signal.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.67rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                  {signal.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
