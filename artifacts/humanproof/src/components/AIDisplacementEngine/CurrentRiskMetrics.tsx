// CurrentRiskMetrics — §1 Score Header Enhancement
// 4 metric pills shown beneath the existing confidence badge.

import React from 'react';
import type { AutomationTimeline } from '../../data/automationTimelineData';
import type { IndustryRisk } from '../../data/industryRiskData';

interface Props {
  d1Score: number;
  industryRisk: IndustryRisk | null;
  timeline: AutomationTimeline | null;
  scoreColor: string;
}

function hiringTrendLabel(layoffRate: number): { label: string; color: string } {
  if (layoffRate < 0.03) return { label: 'Positive',  color: 'var(--emerald)' };
  if (layoffRate < 0.07) return { label: 'Neutral',   color: 'var(--amber)' };
  return { label: 'Pressured', color: 'var(--red)' };
}

function demandColor(outlook: string): string {
  if (outlook === 'growing')  return 'var(--emerald)';
  if (outlook === 'stable')   return 'var(--cyan)';
  if (outlook === 'volatile') return 'var(--amber)';
  return 'var(--red)';
}

export const CurrentRiskMetrics: React.FC<Props> = ({ d1Score, industryRisk, timeline, scoreColor }) => {
  const hiring = industryRisk ? hiringTrendLabel(industryRisk.avgLayoffRate2025) : null;
  const outlook = industryRisk?.growthOutlook ?? null;

  const pills: { label: string; value: string; color: string }[] = [
    {
      label: 'AI Automation Exposure',
      value: `${d1Score}%`,
      color: scoreColor,
    },
    {
      label: 'Market Demand',
      value: outlook
        ? outlook.charAt(0).toUpperCase() + outlook.slice(1)
        : '—',
      color: outlook ? demandColor(outlook) : 'var(--text-3)',
    },
    {
      label: 'Hiring Trend',
      value: hiring?.label ?? '—',
      color: hiring?.color ?? 'var(--text-3)',
    },
  ];

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '8px',
      marginTop: '12px', marginBottom: '4px',
    }}>
      {pills.map((pill) => (
        <div
          key={pill.label}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            padding: '6px 12px', borderRadius: '6px',
            background: `${pill.color}10`, border: `1px solid ${pill.color}28`,
            minWidth: '100px',
          }}
        >
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '2px' }}>
            {pill.label.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: pill.color, fontFamily: 'var(--font-mono)' }}>
            {pill.value}
          </span>
        </div>
      ))}
    </div>
  );
};
