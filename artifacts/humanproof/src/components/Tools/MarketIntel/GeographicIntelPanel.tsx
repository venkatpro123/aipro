// GeographicIntelPanel.tsx — Geographic opportunity intelligence
import { useMemo } from 'react';
import { MapPin, Globe } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

export function GeographicIntelPanel({ scoreResult }: Props) {
  const geo = scoreResult.geographicOptionality;

  if (!geo) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
        Geographic intelligence not available. Run a full audit to unlock location data.
      </div>
    );
  }

  const score = geo.geographicOptionalityScore;
  const label = geo.optionalityLabel;
  const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';

  const topMarkets = (geo as any).topMarkets ?? (geo as any).bestMarkets ?? [];
  const remoteViability = (geo as any).remoteViability ?? 'Unknown';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Geographic Intelligence
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Identifies which markets have highest demand for your role. Higher optionality = more leverage.
        </div>
      </div>

      {/* Optionality score */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '20px 24px',
        borderRadius: 14,
        background: `${scoreColor}10`,
        border: `1px solid ${scoreColor}33`,
        marginBottom: 24,
      }}>
        <Globe size={36} color={scoreColor} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 42, color: scoreColor, lineHeight: 1 }}>{Math.round(score)}</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginTop: 4 }}>
            Geographic Optionality Score
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Remote Viability', value: remoteViability },
          { label: 'Optionality', value: label ?? 'Moderate' },
          { label: 'Market Breadth', value: score >= 70 ? 'Wide' : score >= 45 ? 'Moderate' : 'Narrow' },
        ].map(m => (
          <div key={m.label} className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, letterSpacing: '0.06em' }}>
              {m.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Top markets */}
      {topMarkets.length > 0 ? (
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>
            Top Markets for Your Role
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topMarkets.map((market: { city: string; demandIndex?: number; avgSalary?: number; remote?: boolean }, i: number) => (
              <div key={i} className="card-premium" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <MapPin size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{market.city}</div>
                  {market.avgSalary && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                      Avg salary: ${market.avgSalary.toLocaleString()}
                      {market.remote && <span style={{ color: '#10b981', marginLeft: 8 }}>· Remote-friendly</span>}
                    </div>
                  )}
                </div>
                {market.demandIndex !== undefined && (
                  <div style={{ fontWeight: 700, fontSize: 16, color: market.demandIndex >= 70 ? '#10b981' : '#f59e0b' }}>
                    {Math.round(market.demandIndex)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>
            Geographic Strategy
          </div>
          {score >= 70 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
              Your role has strong geographic optionality. Consider expanding your job search to multiple cities
              or remote-first companies to maximize negotiating leverage and find better compensation.
            </div>
          ) : score >= 45 ? (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
              Moderate optionality — your primary market likely has good demand. Consider targeting top 2–3 metros
              in your region plus remote opportunities to widen your options.
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
              Limited geographic optionality detected. Focus on deepening specialization to increase your
              portability, or consider remote-first roles to break geographic constraints.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
