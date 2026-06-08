// MarketForecastPanel.tsx — 12-month macro + sector forecast
import { useMemo } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

function getTierLabel(tier: string): { label: string; color: string } {
  switch (tier) {
    case 'CRISIS':   return { label: 'Crisis', color: '#ef4444' };
    case 'STRESS':   return { label: 'Stress', color: '#f97316' };
    case 'ELEVATED': return { label: 'Elevated', color: '#f59e0b' };
    case 'NORMAL':   return { label: 'Normal', color: '#10b981' };
    case 'EXPANSION': return { label: 'Expansion', color: '#22c55e' };
    default: return { label: tier, color: 'rgba(255,255,255,0.5)' };
  }
}

export function MarketForecastPanel({ scoreResult }: Props) {
  const macro = scoreResult.macroEconomicRisk;
  const market = scoreResult.roleMarketDemand;

  const tier = macro?.riskTier ?? 'NORMAL';
  const { label: tierLabel, color: tierColor } = getTierLabel(tier);

  const signals = useMemo(() => {
    if (!macro) return [];
    return [
      { label: 'Macro Regime', value: macro.regime ?? 'Unknown' },
      { label: 'Rate Cycle Phase', value: macro.rateCyclePhase ?? 'Unknown' },
      { label: 'Outlook Direction', value: macro.outlookDirection ?? 'Unknown' },
      { label: 'Risk Tier', value: tierLabel, color: tierColor },
    ];
  }, [macro, tierLabel, tierColor]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Market Forecast
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Macro environment analysis for your sector and role category.
        </div>
      </div>

      {!macro ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
          Macro data not available. Run a full audit to generate the market forecast.
        </div>
      ) : (
        <>
          {/* Tier banner */}
          <div style={{
            padding: '20px 24px',
            borderRadius: 14,
            background: `${tierColor}10`,
            border: `1px solid ${tierColor}33`,
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
              CURRENT MACRO ENVIRONMENT
            </div>
            <div style={{ fontWeight: 800, fontSize: 28, color: tierColor }}>{tierLabel}</div>
            {macro.regimeNarrative && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 1.5 }}>
                {macro.regimeNarrative}
              </div>
            )}
          </div>

          {/* Signal grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {signals.map(s => (
              <div key={s.label} className="card-premium" style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em' }}>
                  {s.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color ?? 'var(--text)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* 12-month outlook */}
          <div className="card-premium" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>
              12-Month Outlook for {market?.snapshot?.roleName ?? 'Your Role'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { period: 'Near Term', outlook: macro.outlookNarrative ?? 'Monitor for signals', color: tierColor },
                { period: 'Key Risks', outlook: macro.keyMacroRisks?.slice(0, 2).join(' · ') ?? 'No key risks identified', color: '#f59e0b' },
                { period: 'Tailwinds', outlook: macro.macroTailwinds?.slice(0, 2).join(' · ') ?? 'No tailwinds identified', color: '#10b981' },
              ].map(row => (
                <div key={row.period} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: row.color,
                    whiteSpace: 'nowrap',
                    minWidth: 120,
                  }}>
                    {row.period}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                    {row.outlook}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
