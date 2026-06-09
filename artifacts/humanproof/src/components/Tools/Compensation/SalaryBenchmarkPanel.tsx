// SalaryBenchmarkPanel — "Am I underpaid?" — pay position vs. market (Rule 10, 17)
// DataSourceLabel on every data point. Detection language only — no probability framing.
import { useState } from 'react';
import { TrendingUp, DollarSign, Shield, ArrowRight } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import { DataSourceLabel } from '../../shared/DataSourceLabel';

interface Props {
  scoreResult: HybridResult;
}

const PAY_POSITION_CONFIG: Record<string, { color: string; label: string; advice: string }> = {
  HIGHLY_ABOVE_MARKET: { color: '#10b981', label: 'Highly Above Market', advice: 'Strong leverage — you can afford to be selective in any transition.' },
  ABOVE_MARKET:        { color: '#22c55e', label: 'Above Market',         advice: 'Good position — if you leave, insist on matching or exceeding current comp.' },
  AT_MARKET:           { color: '#f59e0b', label: 'At Market',            advice: 'Neutral — any offer should beat market by 10–15% to justify switching.' },
  BELOW_MARKET:        { color: '#f97316', label: 'Below Market',         advice: 'Negotiate now — you have data-backed leverage to close the gap.' },
  HIGHLY_BELOW_MARKET: { color: '#ef4444', label: 'Highly Below Market',  advice: 'Critical gap — market salary should be your first negotiation target.' },
  UNKNOWN:             { color: 'rgba(255,255,255,0.4)', label: 'Calculating…', advice: '' },
};

const PERCENTILE_BENCHMARKS = [
  { label: '25th pct  (entry)', multiplier: 0.78 },
  { label: '50th pct  (market)', multiplier: 1.00 },
  { label: '75th pct  (senior)', multiplier: 1.28 },
  { label: '90th pct  (top)',    multiplier: 1.55 },
];

function formatSalary(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)     return `$${Math.round(usd / 1_000)}K`;
  return `$${Math.round(usd)}`;
}

// Derive negotiation leverage factors from compensation data
function buildLeveragePoints(comp: NonNullable<HybridResult['compensationRisk']>): string[] {
  const pts: string[] = [];
  if (comp.marketDeltaPct != null && comp.marketDeltaPct < -10) {
    pts.push(`You are ${Math.abs(Math.round(comp.marketDeltaPct))}% below market — use ${formatSalary((comp.estimatedMarketMedian ?? 0) * (1 + Math.abs(comp.marketDeltaPct ?? 0) / 100))} as your anchor`);
  }
  if (comp.vestingProtection === 'STRONG') {
    pts.push('Vesting protection is strong — any offer needs to cover unvested equity value');
  } else if (comp.vestingProtection === 'WEAK' || comp.vestingProtection === 'NONE') {
    pts.push('Low vesting lock-in — you can leave without leaving money on the table');
  }
  if (comp.payPosition === 'BELOW_MARKET' || comp.payPosition === 'HIGHLY_BELOW_MARKET') {
    pts.push('Current underpayment is documented — request a correction, not a raise (different framing)');
  }
  if (comp.cascadeStage === 'PRE_LAYOFF' || comp.cascadeStage === 'PAY_CUT') {
    pts.push('Company is at cascade stage with compensation signals — external offer gives you rare leverage for counter-offer or severance');
  }
  // Add from compensation actions
  const immediateActions = (comp.compensationActions ?? []).filter(a => a.urgency === 'immediate').slice(0, 1);
  immediateActions.forEach(a => pts.push(a.action));
  return pts.slice(0, 4);
}

export function SalaryBenchmarkPanel({ scoreResult }: Props) {
  const comp = scoreResult.compensationRisk;
  const [showNegScript, setShowNegScript] = useState(false);

  if (!comp) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: '0.88rem' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>💰</div>
        Run a full audit with your current salary to generate compensation benchmarks.
      </div>
    );
  }

  const cfg = PAY_POSITION_CONFIG[comp.payPosition] ?? PAY_POSITION_CONFIG.UNKNOWN;
  const median = comp.estimatedMarketMedian ?? 0;
  const leveragePoints = buildLeveragePoints(comp);
  const isUnderpaid = comp.payPosition === 'BELOW_MARKET' || comp.payPosition === 'HIGHLY_BELOW_MARKET';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Pay position hero */}
      <div style={{ padding: '20px 22px', borderRadius: 14, background: `${cfg.color}10`, border: `1px solid ${cfg.color}33` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'var(--font-mono, monospace)' }}>
              PAY POSITION DETECTED
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: cfg.color, lineHeight: 1 }}>
              {cfg.label}
            </div>
          </div>
          <DataSourceLabel tier="MODELED" sourceName="Levels.fyi / Glassdoor 2026" date={scoreResult.calculatedAt} />
        </div>
        {comp.marketDeltaPct != null && (
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
            {comp.marketDeltaPct > 0 ? '+' : ''}{Math.round(comp.marketDeltaPct)}% vs. market median
            {median > 0 && (
              <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
                (market median: {formatSalary(median)})
              </span>
            )}
          </div>
        )}
        {cfg.advice && (
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            {cfg.advice}
          </div>
        )}
      </div>

      {/* Percentile bands */}
      {median > 0 && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Market Percentile Bands</div>
            <DataSourceLabel tier="MODELED" sourceName="Salary benchmarks" compact />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PERCENTILE_BENCHMARKS.map((p, i) => {
              const isMedian = i === 1;
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', borderRadius: 7,
                  background: isMedian ? 'rgba(0,212,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: isMedian ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: '0.78rem', color: isMedian ? 'var(--cyan)' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isMedian ? 'var(--cyan)' : 'var(--text)' }}>
                    {formatSalary(median * p.multiplier)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Negotiation leverage — shown when underpaid or has leverage factors */}
      {(isUnderpaid || leveragePoints.length > 0) && (
        <div className="card-premium" style={{ padding: 18, border: '1px solid rgba(0,245,255,0.15)', background: 'rgba(0,245,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} color="var(--cyan)" />
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Your Negotiation Leverage</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leveragePoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <ArrowRight size={11} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: '0.79rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{pt}</span>
              </div>
            ))}
          </div>
          {isUnderpaid && (
            <button
              type="button"
              onClick={() => setShowNegScript(s => !s)}
              style={{
                marginTop: 14, width: '100%',
                background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)',
                borderRadius: 8, color: 'var(--cyan)', fontSize: '0.8rem', fontWeight: 700,
                padding: '8px 0', cursor: 'pointer',
              }}
            >
              {showNegScript ? 'Hide' : 'Show'} raise conversation starter →
            </button>
          )}
          {showNegScript && isUnderpaid && (
            <div style={{
              marginTop: 10, padding: '12px 14px', borderRadius: 8,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)',
              fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
            }}>
              <strong style={{ color: 'var(--text)' }}>Opening script:</strong><br />
              "I've been benchmarking my compensation against current market data for my role.
              I'm currently {comp.marketDeltaPct != null ? `${Math.abs(Math.round(comp.marketDeltaPct))}%` : 'noticeably'} below
              the market median of {median > 0 ? formatSalary(median) : 'comparable roles'}.
              I'd like to discuss aligning my comp to market — what's the process for that here?"
            </div>
          )}
        </div>
      )}

      {/* Compensation cascade stage — detection language, no probability */}
      <div className="card-premium" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Compensation Cascade Stage</div>
          <DataSourceLabel tier="MODELED" sourceName="Cascade pattern analysis" compact />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{
            padding: '4px 11px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem',
            fontFamily: 'var(--font-mono, monospace)',
            background: comp.cascadeStage === 'PRE_LAYOFF' || comp.cascadeStage === 'PAY_CUT'
              ? 'rgba(239,68,68,0.15)' : comp.cascadeStage === 'PAY_FREEZE' || comp.cascadeStage === 'CONTRACTOR_CUTS'
              ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
            color: comp.cascadeStage === 'PRE_LAYOFF' || comp.cascadeStage === 'PAY_CUT'
              ? '#ef4444' : comp.cascadeStage === 'PAY_FREEZE' || comp.cascadeStage === 'CONTRACTOR_CUTS'
              ? '#f59e0b' : '#10b981',
          }}>
            {comp.cascadeStageLabel}
          </div>
        </div>
        {comp.nextCascadeSignals?.length > 0 && (
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
            Watch for: {comp.nextCascadeSignals.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>

      {/* Vesting protection */}
      <div className="card-premium" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Shield size={13} color={comp.vestingProtection === 'STRONG' ? '#10b981' : comp.vestingProtection === 'MODERATE' ? '#f59e0b' : '#ef4444'} />
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Equity Vesting Protection</span>
          </div>
          <DataSourceLabel tier="ESTIMATED" sourceName="Profile data" compact />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '3px 9px', borderRadius: 6, fontWeight: 700, fontSize: '0.72rem',
            background: comp.vestingProtection === 'STRONG' ? 'rgba(16,185,129,0.15)' : comp.vestingProtection === 'MODERATE' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
            color: comp.vestingProtection === 'STRONG' ? '#10b981' : comp.vestingProtection === 'MODERATE' ? '#f59e0b' : '#ef4444',
          }}>
            {comp.vestingProtection}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{comp.vestingNote}</span>
        </div>
      </div>

      {/* Immediate compensation actions */}
      {(comp.compensationActions ?? []).length > 0 && (
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <DollarSign size={13} color="var(--cyan)" />
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Recommended Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comp.compensationActions.slice(0, 3).map((a, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 8,
                background: a.urgency === 'immediate' ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${a.urgency === 'immediate' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{a.action}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{a.why}</div>
                <div style={{ marginTop: 5 }}>
                  <span style={{
                    fontSize: '0.63rem', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)',
                    color: a.urgency === 'immediate' ? '#ef4444' : 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase' as const,
                  }}>
                    {a.urgency.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
