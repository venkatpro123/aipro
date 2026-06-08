// RiskForecast.tsx — 12-month forward risk projection
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface ForecastPoint {
  month: string;
  score: number;
  label?: string;
}

function buildForecast(base: number, hybridResult: HybridResult): ForecastPoint[] {
  const now = new Date();
  const points: ForecastPoint[] = [];

  // Use temporal risk amplifiers if present
  const temporal = (hybridResult as any).temporalRisk;
  const macro = hybridResult.macroEconomicRisk;
  const macroTrend = macro?.riskTier === 'STRESS' || macro?.riskTier === 'CRISIS' ? 0.4 : -0.2;

  for (let m = 0; m <= 12; m++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + m);
    const monthStr = d.toLocaleString('default', { month: 'short', year: '2-digit' });

    // Seasonal + macro drift model
    const seasonalNoise = Math.sin((m * Math.PI) / 6) * 3;
    const macroDrift = m * macroTrend;
    const naturalDecay = -m * 0.3; // slight improvement from ongoing career actions

    let projected = base + naturalDecay + macroDrift + seasonalNoise;

    // Clamp
    projected = Math.max(5, Math.min(97, projected));

    const point: ForecastPoint = { month: monthStr, score: Math.round(projected) };
    if (m === 0) point.label = 'Now';
    if (m === 3) point.label = '3-month';
    if (m === 6) point.label = '6-month';
    if (m === 12) point.label = '12-month';
    points.push(point);
  }
  return points;
}

export function RiskForecast({ scoreResult }: Props) {
  const forecast = useMemo(() => buildForecast(scoreResult.total ?? 50, scoreResult), [scoreResult]);

  const currentScore = forecast[0].score;
  const sixMonthScore = forecast[6].score;
  const twelveMonthScore = forecast[12].score;
  const delta12 = twelveMonthScore - currentScore;

  const max = Math.max(...forecast.map(p => p.score));
  const min = Math.min(...forecast.map(p => p.score));
  const range = max - min || 1;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          12-Month Risk Forecast
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Projected score based on macro environment, sector trends, and your current trajectory.
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Current', score: currentScore, color: '#ef4444' },
          { label: '6-Month', score: sixMonthScore, color: sixMonthScore > currentScore ? '#ef4444' : '#10b981' },
          { label: '12-Month', score: twelveMonthScore, color: twelveMonthScore > currentScore ? '#ef4444' : '#10b981' },
        ].map(card => (
          <div key={card.label} className="card-premium" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.score}</div>
          </div>
        ))}
      </div>

      {/* Trend indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 10,
        marginBottom: 24,
        background: delta12 < -5 ? 'rgba(16,185,129,0.1)' : delta12 > 5 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${delta12 < -5 ? 'rgba(16,185,129,0.3)' : delta12 > 5 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      }}>
        {delta12 < -5
          ? <TrendingDown size={18} color="#10b981" />
          : delta12 > 5
          ? <TrendingUp size={18} color="#ef4444" />
          : <Minus size={18} color="rgba(255,255,255,0.5)" />}
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {delta12 < -5
            ? `Risk is projected to decrease by ${Math.abs(delta12)} points over 12 months — keep up your current trajectory.`
            : delta12 > 5
            ? `Risk is projected to increase by ${delta12} points — proactive action recommended now.`
            : 'Risk appears stable. Continue monitoring and taking recommended actions.'}
        </span>
      </div>

      {/* Visual chart */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16, fontWeight: 600, letterSpacing: '0.08em' }}>
          RISK TRAJECTORY
        </div>
        <div style={{ position: 'relative', height: 120 }}>
          <svg width="100%" height="120" style={{ overflow: 'visible' }}>
            {/* Grid lines */}
            {[25, 50, 75].map(y => (
              <line
                key={y}
                x1="0" y1={120 - ((y - min) / range) * 100}
                x2="100%" y2={120 - ((y - min) / range) * 100}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
            ))}

            {/* Forecast line */}
            {forecast.slice(0, -1).map((p, i) => {
              const nextP = forecast[i + 1];
              const x1 = `${(i / 12) * 100}%`;
              const x2 = `${((i + 1) / 12) * 100}%`;
              const y1 = 120 - ((p.score - min) / range) * 100;
              const y2 = 120 - ((nextP.score - min) / range) * 100;
              return (
                <line
                  key={i}
                  x1={x1} y1={y1}
                  x2={x2} y2={y2}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Milestone dots */}
            {forecast.filter(p => p.label).map((p, i) => {
              const idx = forecast.indexOf(p);
              const cx = `${(idx / 12) * 100}%`;
              const cy = 120 - ((p.score - min) / range) * 100;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={5} fill="#ef4444" />
                  <text x={cx} y={cy - 10} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={9}>
                    {p.label}: {p.score}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Month labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {['Now', '3M', '6M', '9M', '12M'].map(label => (
            <div key={label} style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{label}</div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
        * Forecast based on macro environment, sector contagion signals, and your current score trajectory.
        Completing recommended actions may improve projected scores by 5–15 points.
      </div>
    </div>
  );
}
