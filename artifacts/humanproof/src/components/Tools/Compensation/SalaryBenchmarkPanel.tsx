// SalaryBenchmarkPanel.tsx — Pay position vs. market from CompensationRiskResult
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const PAY_POSITION_CONFIG: Record<string, { color: string; label: string }> = {
  HIGHLY_ABOVE_MARKET: { color: '#10b981', label: 'Highly Above Market' },
  ABOVE_MARKET:        { color: '#22c55e', label: 'Above Market'        },
  AT_MARKET:           { color: '#f59e0b', label: 'At Market'           },
  BELOW_MARKET:        { color: '#f97316', label: 'Below Market'        },
  HIGHLY_BELOW_MARKET: { color: '#ef4444', label: 'Highly Below Market' },
  UNKNOWN:             { color: 'rgba(255,255,255,0.4)', label: 'Unknown' },
};

const PERCENTILE_BENCHMARKS = [
  { label: '25th pct (entry)', multiplier: 0.78 },
  { label: '50th pct (market)', multiplier: 1.00 },
  { label: '75th pct (senior)', multiplier: 1.28 },
  { label: '90th pct (top)', multiplier: 1.55 },
];

export function SalaryBenchmarkPanel({ scoreResult }: Props) {
  const comp = scoreResult.compensationRisk;

  if (!comp) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
        Run a full audit with your current salary to generate compensation benchmarks.
      </div>
    );
  }

  const cfg = PAY_POSITION_CONFIG[comp.payPosition] ?? PAY_POSITION_CONFIG.UNKNOWN;
  const median = comp.estimatedMarketMedian ?? 100000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Salary Benchmark</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your pay position vs. market for your role, seniority, and location.
        </div>
      </div>

      {/* Pay position hero */}
      <div style={{ padding: '20px 24px', borderRadius: 14, background: `${cfg.color}10`, border: `1px solid ${cfg.color}33` }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>PAY POSITION</div>
        <div style={{ fontWeight: 800, fontSize: 28, color: cfg.color }}>{cfg.label}</div>
        {comp.marketDeltaPct !== null && comp.marketDeltaPct !== undefined && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
            {comp.marketDeltaPct > 0 ? '+' : ''}{Math.round(comp.marketDeltaPct)}% vs. market median
            {median > 0 && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.4)' }}>
              (market median: ${Math.round(median / 1000)}K)
            </span>}
          </div>
        )}
      </div>

      {/* Percentile table */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Market Percentile Bands</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PERCENTILE_BENCHMARKS.map((p, i) => {
            const val = Math.round(median * p.multiplier / 1000);
            const isAtOrAbove = i === 1;
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: isAtOrAbove ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)', border: isAtOrAbove ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent' }}>
                <div style={{ fontSize: 13, color: isAtOrAbove ? 'var(--cyan)' : 'rgba(255,255,255,0.65)' }}>{p.label}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: isAtOrAbove ? 'var(--cyan)' : 'var(--text)' }}>${val}K</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Estimates based on US market data · Adjust for local cost of living
        </div>
      </div>

      {/* Cascade stage */}
      <div className="card-premium" style={{ padding: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Compensation Cascade Stage</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12,
            background: comp.cascadeStage === 'PRE_LAYOFF' || comp.cascadeStage === 'PAY_CUT' ? 'rgba(239,68,68,0.15)' :
                       comp.cascadeStage === 'PAY_FREEZE' || comp.cascadeStage === 'CONTRACTOR_CUTS' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
            color: comp.cascadeStage === 'PRE_LAYOFF' || comp.cascadeStage === 'PAY_CUT' ? '#ef4444' :
                   comp.cascadeStage === 'PAY_FREEZE' || comp.cascadeStage === 'CONTRACTOR_CUTS' ? '#f59e0b' : '#10b981',
          }}>{comp.cascadeStageLabel}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            12-mo layoff probability: <strong style={{ color: 'var(--text)' }}>{Math.round(comp.layoffProbabilityAt12mo * 100)}%</strong>
          </div>
        </div>
        {comp.nextCascadeSignals?.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Watch for: {comp.nextCascadeSignals.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>

      {/* Vesting protection */}
      <div className="card-premium" style={{ padding: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>Equity Vesting Protection</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 12,
            background: comp.vestingProtection === 'STRONG' ? 'rgba(16,185,129,0.15)' : comp.vestingProtection === 'MODERATE' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
            color: comp.vestingProtection === 'STRONG' ? '#10b981' : comp.vestingProtection === 'MODERATE' ? '#f59e0b' : '#ef4444',
          }}>{comp.vestingProtection}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{comp.vestingNote}</span>
        </div>
      </div>
    </div>
  );
}
