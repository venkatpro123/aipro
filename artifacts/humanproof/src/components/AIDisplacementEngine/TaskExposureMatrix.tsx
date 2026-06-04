// TaskExposureMatrix — §4 Task Exposure Analysis
// Heat-map grid of per-task AI automatable % vs human required %.

import React from 'react';
import type { AutomationTimeline } from '../../data/automationTimelineData';

interface Props {
  timeline: AutomationTimeline;
  d1Score: number;
  techStack?: string;
}

interface TaskEntry {
  name: string;
  aiPct: number;
  humanPct: number;
  level: 'HIGH' | 'MODERATE' | 'PROTECTED';
}

function exposureColor(level: TaskEntry['level']): string {
  if (level === 'HIGH')      return 'var(--red)';
  if (level === 'MODERATE')  return 'var(--amber)';
  return 'var(--emerald)';
}

function levelFromAiPct(pct: number): TaskEntry['level'] {
  if (pct >= 70) return 'HIGH';
  if (pct >= 40) return 'MODERATE';
  return 'PROTECTED';
}

// Generate task list from AutomationTimeline seeded data
function buildTaskList(timeline: AutomationTimeline, d1Score: number): TaskEntry[] {
  const tasks: TaskEntry[] = [];

  // At-risk tasks: higher AI automatable % based on d1 severity
  const baseAiPct = Math.min(92, Math.max(62, d1Score + 10));
  timeline.topTasksAtRisk.forEach((task, i) => {
    // Stagger the scores slightly for visual variety
    const aiPct = Math.min(95, baseAiPct - i * 5);
    tasks.push({
      name: task,
      aiPct,
      humanPct: 100 - aiPct,
      level: levelFromAiPct(aiPct),
    });
  });

  // Essential (human) tasks: lower AI automatable %
  const baseHumanPct = Math.min(95, Math.max(72, 100 - d1Score + 20));
  timeline.humanEssentialTasks.forEach((task, i) => {
    const humanPct = Math.min(97, baseHumanPct - i * 3);
    const aiPct = 100 - humanPct;
    tasks.push({
      name: task,
      aiPct,
      humanPct,
      level: levelFromAiPct(aiPct),
    });
  });

  return tasks;
}

// Heuristic fallback when no seeded data
function buildHeuristicTasks(d1Score: number): TaskEntry[] {
  const isHigh = d1Score >= 65;
  const isMod  = d1Score >= 40;
  return [
    { name: 'Routine data processing & reporting', aiPct: isHigh ? 88 : 72, humanPct: isHigh ? 12 : 28, level: isHigh ? 'HIGH' : 'MODERATE' },
    { name: 'Standard workflow execution', aiPct: isHigh ? 82 : 65, humanPct: isHigh ? 18 : 35, level: isHigh ? 'HIGH' : 'MODERATE' },
    { name: 'Document creation & summarisation', aiPct: isMod ? 76 : 55, humanPct: isMod ? 24 : 45, level: isMod ? 'HIGH' : 'MODERATE' },
    { name: 'Scheduling & coordination tasks', aiPct: isMod ? 70 : 50, humanPct: isMod ? 30 : 50, level: isMod ? 'MODERATE' : 'MODERATE' },
    { name: 'Stakeholder communication', aiPct: 35, humanPct: 65, level: 'PROTECTED' },
    { name: 'Strategic judgment & decision making', aiPct: 15, humanPct: 85, level: 'PROTECTED' },
    { name: 'Relationship building & trust', aiPct: 10, humanPct: 90, level: 'PROTECTED' },
  ];
}

export const TaskExposureMatrix: React.FC<Props> = ({ timeline, d1Score, techStack }) => {
  const isSeeded = timeline.roleKey !== 'unknown'
    && (timeline.topTasksAtRisk.length > 0 || timeline.humanEssentialTasks.length > 0);

  const tasks = isSeeded ? buildTaskList(timeline, d1Score) : buildHeuristicTasks(d1Score);

  const highCount = tasks.filter(t => t.level === 'HIGH').length;
  const protCount = tasks.filter(t => t.level === 'PROTECTED').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>TASK EXPOSURE ANALYSIS</h3>
        {!isSeeded && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
            HEURISTIC ESTIMATE
          </span>
        )}
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.7rem', color: 'var(--red)', fontWeight: 700 }}>
          {highCount} HIGH-EXPOSURE TASKS
        </div>
        <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.7rem', color: 'var(--emerald)', fontWeight: 700 }}>
          {protCount} PROTECTED TASKS
        </div>
      </div>

      {/* Task rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {tasks.map((task) => {
          const c = exposureColor(task.level);
          return (
            <div key={task.name} style={{
              padding: '12px 16px', borderRadius: '8px',
              background: `${c}06`, border: `1px solid ${c}20`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{task.name}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px',
                  background: `${c}15`, border: `1px solid ${c}35`,
                  fontSize: '0.6rem', fontWeight: 800, color: c, fontFamily: 'var(--font-mono)',
                }}>
                  {task.level}
                </span>
              </div>

              {/* Split bar */}
              <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', gap: '1px' }}>
                <div style={{ width: `${task.aiPct}%`, background: c, borderRadius: '3px 0 0 3px', transition: 'width 0.8s ease' }} />
                <div style={{ width: `${task.humanPct}%`, background: 'rgba(16,185,129,0.35)', borderRadius: '0 3px 3px 0', transition: 'width 0.8s ease' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '0.62rem', color: c, fontFamily: 'var(--font-mono)' }}>
                  AI Automatable: {task.aiPct}%
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                  Human Required: {task.humanPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation drivers */}
      {timeline.automationDrivers.length > 0 && (
        <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '10px' }}>AUTOMATION DRIVERS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {timeline.automationDrivers.map((driver) => (
              <span key={driver} style={{
                padding: '3px 10px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.7rem', color: 'var(--text-2)',
              }}>
                {driver}
              </span>
            ))}
          </div>
          {techStack && (
            <div style={{ marginTop: '10px', fontSize: '0.68rem', color: 'var(--text-3)' }}>
              Your stack: <span style={{ color: 'var(--cyan)' }}>{techStack}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
