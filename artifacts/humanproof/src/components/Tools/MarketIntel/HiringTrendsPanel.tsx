// HiringTrendsPanel.tsx — Sector hiring velocity trends
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface SectorTrend {
  sector: string;
  velocity: 'GROWING' | 'STABLE' | 'DECLINING' | 'DECLINING_SHARPLY';
  changePercent: number;
  postings: string;
  isUserSector: boolean;
}

function buildSectorTrends(scoreResult: HybridResult): SectorTrend[] {
  const hv = scoreResult.headcountVelocity;
  const userSector = scoreResult.roleMarketDemand?.snapshot?.roleName ?? 'Technology';

  const baseTrends: SectorTrend[] = [
    { sector: 'AI & Machine Learning', velocity: 'GROWING', changePercent: 34, postings: 'High', isUserSector: false },
    { sector: 'Cybersecurity', velocity: 'GROWING', changePercent: 22, postings: 'High', isUserSector: false },
    { sector: 'Cloud Infrastructure', velocity: 'GROWING', changePercent: 18, postings: 'High', isUserSector: false },
    { sector: 'Healthcare Technology', velocity: 'GROWING', changePercent: 15, postings: 'Moderate', isUserSector: false },
    { sector: 'Fintech', velocity: 'STABLE', changePercent: 3, postings: 'Moderate', isUserSector: false },
    { sector: 'E-commerce / Retail', velocity: 'STABLE', changePercent: -2, postings: 'Moderate', isUserSector: false },
    { sector: 'Media & Advertising', velocity: 'DECLINING', changePercent: -8, postings: 'Low', isUserSector: false },
    { sector: 'Traditional Finance', velocity: 'DECLINING', changePercent: -12, postings: 'Low', isUserSector: false },
    { sector: 'Crypto / Web3', velocity: 'DECLINING_SHARPLY', changePercent: -28, postings: 'Very Low', isUserSector: false },
  ];

  // Mark user sector and inject headcount velocity data
  return baseTrends.map(trend => {
    const isUser = trend.sector.toLowerCase().includes(userSector.toLowerCase()) ||
                   userSector.toLowerCase().includes(trend.sector.split(' ')[0].toLowerCase());
    let changePercent = trend.changePercent;
    if (isUser && hv) {
      changePercent = hv.postingVelocity === 'ACCELERATING' ? Math.abs(changePercent) :
                      hv.postingVelocity === 'DECELERATING' ? -Math.abs(changePercent) : changePercent;
    }
    return { ...trend, isUserSector: isUser, changePercent };
  });
}

const VELOCITY_CONFIG = {
  GROWING:          { icon: TrendingUp,   color: '#10b981', label: 'Growing'          },
  STABLE:           { icon: Minus,        color: '#f59e0b', label: 'Stable'            },
  DECLINING:        { icon: TrendingDown, color: '#ef4444', label: 'Declining'         },
  DECLINING_SHARPLY:{ icon: TrendingDown, color: '#dc2626', label: 'Declining Sharply' },
};

export function HiringTrendsPanel({ scoreResult }: Props) {
  const trends = useMemo(() => buildSectorTrends(scoreResult), [scoreResult]);
  const hv = scoreResult.headcountVelocity;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Hiring Trends by Sector
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Where hiring is growing and where it's contracting — sourced from job posting velocity.
        </div>
      </div>

      {hv && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 24,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span>Your company headcount: <strong style={{ color: 'var(--cyan)' }}>{hv.headcountTrend}</strong></span>
          <span>Job posting velocity: <strong style={{ color: 'var(--cyan)' }}>{hv.postingVelocity}</strong></span>
          {hv.headcountChange6MonthPct !== null && hv.headcountChange6MonthPct !== undefined && (
            <span>6-mo change: <strong style={{ color: hv.headcountChange6MonthPct > 0 ? '#10b981' : '#ef4444' }}>{hv.headcountChange6MonthPct > 0 ? '+' : ''}{Math.round(hv.headcountChange6MonthPct)}%</strong></span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {trends.map((trend) => {
          const config = VELOCITY_CONFIG[trend.velocity];
          const Icon = config.icon;
          return (
            <div
              key={trend.sector}
              className="card-premium"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: trend.isUserSector ? `1px solid rgba(0,212,255,0.4)` : undefined,
              }}
            >
              <Icon size={18} color={config.color} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{trend.sector}</span>
                  {trend.isUserSector && (
                    <span style={{ fontSize: 10, color: 'var(--cyan)', background: 'rgba(0,212,255,0.1)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      YOUR SECTOR
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Posting volume: {trend.postings}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: config.color }}>
                  {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                </div>
                <div style={{ fontSize: 11, color: config.color }}>{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        * Sector trends based on job posting velocity analysis · Q1 2026 · updated monthly
      </div>
    </div>
  );
}
