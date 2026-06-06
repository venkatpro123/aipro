// TaskExposureMatrix — §4 Task Exposure Analysis
// Temporal per-task risk matrix: 2026/2028/2030 risk %, Human Advantage,
// AI Capability Trend, Displacement Timeline, Confidence.
// Country/experience modulation applied to all values.

import React, { useState } from 'react';
import type { AutomationTimeline, TaskDetail, DriverNarrative } from '../../data/automationTimelineData';
import { COUNTRY_RISK_PROFILES } from '../../data/countryRiskProfile';

interface Props {
  timeline: AutomationTimeline;
  d1Score: number;
  techStack?: string;
  countryKey?: string;
  experience?: string;
  d7Score?: number;
}

type GroupView = 'vulnerable' | 'defensible' | 'fastest' | 'human' | 'agentic';

const TASK_TYPE_COLORS: Record<TaskDetail['taskType'], string> = {
  'core':              'var(--red)',
  'secondary':         'var(--amber)',
  'administrative':    '#f97316',
  'strategic':         'var(--emerald)',
  'human-interaction': 'var(--cyan)',
  'decision-making':   'var(--violet)',
  'creative':          '#a78bfa',
};

const TREND_COLORS: Record<string, string> = {
  Rapid:    'var(--red)',
  Moderate: 'var(--amber)',
  Slow:     'var(--cyan)',
  Plateau:  'var(--emerald)',
};

const IMPACT_COLORS: Record<string, string> = {
  Critical: 'var(--red)',
  High:     'var(--amber)',
  Moderate: 'var(--cyan)',
  Low:      'var(--emerald)',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  High:       'var(--emerald)',
  Medium:     'var(--amber)',
  Speculative:'var(--text-3)',
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getExperienceModifier(experience: string): number {
  if (experience === '0-2') return +5;
  if (experience === '10-20' || experience === '20+') return -8;
  return 0;
}

function getAdoptionLag(countryKey: string): number {
  const profile = COUNTRY_RISK_PROFILES[countryKey];
  if (!profile) return 0;
  return 1 - profile.aiAdoptionSpeed; // 0 for USA, ~0.3 for India
}

function applyCountryAndExpModifiers(
  tasks: TaskDetail[],
  countryKey: string,
  experience: string,
): TaskDetail[] {
  const lag = getAdoptionLag(countryKey);
  const expMod = getExperienceModifier(experience);
  return tasks.map(t => {
    const adj2026 = Math.min(95, Math.max(2, t.risk2026 + expMod));
    const adj2028 = Math.min(95, Math.max(2, Math.round(lerp(t.risk2026, t.risk2028, 1 - lag * 0.5)) + expMod));
    const adj2030 = Math.min(95, Math.max(2, Math.round(lerp(t.risk2028, t.risk2030, 1 - lag * 0.4)) + expMod));
    const adjHuman = Math.min(98, Math.max(2, t.humanAdvantageScore - expMod)); // inverse of risk
    return { ...t, risk2026: adj2026, risk2028: adj2028, risk2030: adj2030, humanAdvantageScore: adjHuman };
  });
}

function buildHeuristicTasks(timeline: AutomationTimeline, d1Score: number): TaskDetail[] {
  const base = Math.min(88, Math.max(55, d1Score + 8));
  const tasks: TaskDetail[] = [];
  timeline.topTasksAtRisk.forEach((name, i) => {
    const r26 = Math.min(93, base - i * 4);
    tasks.push({
      name, taskType: 'core',
      risk2026: r26, risk2028: Math.min(93, r26 + 12), risk2030: Math.min(93, r26 + 20),
      humanAdvantageScore: Math.max(5, 100 - r26 - 10),
      aiCapabilityTrend: 'Rapid',
      displacementTimeline: r26 >= 70 ? 'Immediate' : '2–3 years',
      confidence: 'Medium',
    });
  });
  timeline.humanEssentialTasks.forEach((name, i) => {
    const h = Math.min(95, 75 + i * 3);
    const r26 = Math.max(5, 100 - h);
    tasks.push({
      name, taskType: 'human-interaction',
      risk2026: r26, risk2028: Math.min(50, r26 + 5), risk2030: Math.min(60, r26 + 10),
      humanAdvantageScore: h,
      aiCapabilityTrend: 'Slow',
      displacementTimeline: '7+ years',
      confidence: 'Medium',
    });
  });
  return tasks;
}

function buildHeuristicDriverNarratives(timeline: AutomationTimeline): DriverNarrative[] {
  const impactFromTier = (tier: string): 'Low' | 'Moderate' | 'High' | 'Critical' => {
    if (tier === 'very_high') return 'Critical';
    if (tier === 'high') return 'High';
    if (tier === 'moderate') return 'Moderate';
    return 'Low';
  };
  const curr = impactFromTier(timeline.riskTier);
  const FUTURE_STEP: Record<string, 'Low' | 'Moderate' | 'High' | 'Critical'> = { Low: 'Moderate', Moderate: 'High', High: 'Critical', Critical: 'Critical' };
  const fut = FUTURE_STEP[curr];
  return timeline.automationDrivers.map(driver => ({
    driver,
    currentImpact: curr,
    futureImpact: fut,
    reason: `${driver} is increasingly capable of handling ${timeline.topTasksAtRisk[0] ?? 'core tasks in this role'}, creating structural pressure on headcount and role definitions over the coming years.`,
  }));
}

function applyGroupView(tasks: TaskDetail[], view: GroupView): TaskDetail[] {
  const sorted = [...tasks];
  if (view === 'vulnerable')  return sorted.sort((a, b) => b.risk2028 - a.risk2028);
  if (view === 'defensible')  return sorted.sort((a, b) => b.humanAdvantageScore - a.humanAdvantageScore);
  if (view === 'fastest')     return sorted.sort((a, b) => (a.aiCapabilityTrend === 'Rapid' ? -1 : b.aiCapabilityTrend === 'Rapid' ? 1 : 0));
  if (view === 'human')       return sorted.sort((a, b) => {
    const human = ['strategic', 'human-interaction', 'decision-making'];
    const aH = human.includes(a.taskType) ? 1 : 0;
    const bH = human.includes(b.taskType) ? 1 : 0;
    return bH - aH || b.humanAdvantageScore - a.humanAdvantageScore;
  });
  // agentic
  return sorted.sort((a, b) => b.risk2030 - a.risk2030);
}

function RiskBar({ value, max = 95 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  let color = 'var(--emerald)';
  if (value >= 70) color = 'var(--red)';
  else if (value >= 45) color = 'var(--amber)';
  else if (value >= 25) color = 'var(--cyan)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
      </div>
      <span style={{ fontSize: '0.62rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function Chip({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <span style={{
      padding: small ? '1px 6px' : '2px 7px',
      borderRadius: '4px',
      background: `${color}14`,
      border: `1px solid ${color}30`,
      fontSize: '0.55rem',
      fontWeight: 800,
      color,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

const GROUP_VIEWS: { key: GroupView; label: string }[] = [
  { key: 'vulnerable',  label: 'Most Vulnerable' },
  { key: 'defensible',  label: 'Most Defensible' },
  { key: 'fastest',     label: 'Fastest Changing' },
  { key: 'human',       label: 'Highest Human Value' },
  { key: 'agentic',     label: 'Highest Agentic Risk' },
];

export const TaskExposureMatrix: React.FC<Props> = ({
  timeline, d1Score, techStack, countryKey = 'usa', experience = '5-10', d7Score = 55,
}) => {
  const [activeView, setActiveView] = useState<GroupView>('vulnerable');

  const isSeeded = timeline.roleKey !== 'unknown'
    && (timeline.topTasksAtRisk.length > 0 || timeline.humanEssentialTasks.length > 0);

  const rawTasks: TaskDetail[] = timeline.taskDetails?.length
    ? timeline.taskDetails
    : buildHeuristicTasks(timeline, d1Score);

  const tasks = applyCountryAndExpModifiers(rawTasks, countryKey, experience);
  const displayed = applyGroupView(tasks, activeView);

  const driverNarratives: DriverNarrative[] = timeline.driverNarratives?.length
    ? timeline.driverNarratives
    : buildHeuristicDriverNarratives(timeline);

  const countryProfile = COUNTRY_RISK_PROFILES[countryKey];
  const lag = getAdoptionLag(countryKey);
  const lagLabel = lag > 0.25 ? `~${Math.round(lag * 30)} months behind US adoption pace` : null;

  const highCount = displayed.filter(t => t.risk2028 >= 65).length;
  const protCount = displayed.filter(t => t.humanAdvantageScore >= 70).length;
  const isHeuristic = !timeline.taskDetails?.length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>TASK EXPOSURE ANALYSIS</h3>
        {isHeuristic && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
            HEURISTIC ESTIMATE
          </span>
        )}
        {lagLabel && (
          <span style={{ fontSize: '0.6rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', background: 'rgba(251,191,36,0.08)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.2)' }}>
            {lagLabel}
          </span>
        )}
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>
          {highCount} HIGH-EXPOSURE TASKS (2028)
        </div>
        <div style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.68rem', color: 'var(--emerald)', fontWeight: 700 }}>
          {protCount} HUMAN-ESSENTIAL TASKS
        </div>
      </div>

      {/* Group view tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
        {GROUP_VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            style={{
              padding: '5px 11px', borderRadius: '5px', border: 'none', cursor: 'pointer',
              background: activeView === key ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: activeView === key ? 'var(--text)' : 'var(--text-3)',
              fontWeight: activeView === key ? 700 : 500,
              fontSize: '0.68rem', transition: 'all 0.15s ease',
              outline: activeView === key ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 80px', gap: '6px', alignItems: 'center', marginBottom: '8px', padding: '0 14px' }}>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase' }}>Task</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>2026</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>2028</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>2030</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Human</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Trend</span>
      </div>

      {/* Task rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {displayed.map((task) => {
          const typeColor = TASK_TYPE_COLORS[task.taskType] ?? 'var(--text-3)';
          const trendColor = TREND_COLORS[task.aiCapabilityTrend] ?? 'var(--text-3)';
          const confColor  = CONFIDENCE_COLORS[task.confidence] ?? 'var(--text-3)';
          return (
            <div key={task.name} style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Top row: name + type chip + timeline chip + confidence */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: '120px' }}>{task.name}</span>
                <Chip label={task.taskType.toUpperCase().replace('-', ' ')} color={typeColor} small />
                <Chip label={task.displacementTimeline} color={task.displacementTimeline === 'Immediate' ? 'var(--red)' : task.displacementTimeline === '2–3 years' ? 'var(--amber)' : task.displacementTimeline === '4–6 years' ? 'var(--cyan)' : 'var(--emerald)'} small />
                <Chip label={task.confidence} color={confColor} small />
              </div>
              {/* Grid: 4 bars + trend chip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>2026 Risk</div>
                  <RiskBar value={task.risk2026} />
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>2028 Risk</div>
                  <RiskBar value={task.risk2028} />
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>2030 Risk</div>
                  <RiskBar value={task.risk2030} />
                </div>
                <div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>Human Adv.</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${task.humanAdvantageScore}%`, background: 'var(--emerald)', borderRadius: '3px', transition: 'width 0.7s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>{task.humanAdvantageScore}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>AI Trend</div>
                  <Chip label={task.aiCapabilityTrend.toUpperCase()} color={trendColor} small />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation Drivers — WHY section */}
      <div style={{ padding: '16px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
        <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '14px' }}>AUTOMATION DRIVERS — WHY THIS ROLE IS CHANGING</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {driverNarratives.map((d) => {
            const currColor = IMPACT_COLORS[d.currentImpact] ?? 'var(--text-3)';
            const futColor  = IMPACT_COLORS[d.futureImpact]  ?? 'var(--text-3)';
            return (
              <div key={d.driver} style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `2px solid ${futColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{d.driver}</span>
                  <Chip label={`NOW: ${d.currentImpact.toUpperCase()}`} color={currColor} small />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>→</span>
                  <Chip label={`FUTURE: ${d.futureImpact.toUpperCase()}`} color={futColor} small />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{d.reason}</p>
              </div>
            );
          })}
        </div>

        {/* Country regulatory context */}
        {countryProfile?.note && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)',
            borderLeft: '2px solid var(--amber)',
          }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '4px' }}>
              {(countryProfile.label || countryKey.toUpperCase())} MARKET CONTEXT
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.55, margin: 0 }}>{countryProfile.note}</p>
          </div>
        )}

        {techStack && (
          <div style={{ marginTop: '10px', fontSize: '0.68rem', color: 'var(--text-3)' }}>
            Your stack: <span style={{ color: 'var(--cyan)' }}>{techStack}</span>
          </div>
        )}
      </div>
    </div>
  );
};
