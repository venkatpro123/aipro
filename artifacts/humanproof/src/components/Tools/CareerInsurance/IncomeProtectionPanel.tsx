// IncomeProtectionPanel.tsx — Severance negotiation and income protection
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

const NEGOTIATION_STEPS = [
  { step: 'Request 30-day notice period', note: 'Gives you time to transition while still employed' },
  { step: 'Ask for extended health insurance (COBRA at company cost)', note: 'Often negotiable in layoff scenarios' },
  { step: 'Negotiate unused PTO payout', note: 'Many companies will pay this out — confirm in writing' },
  { step: 'Request positive reference letter from manager', note: 'Essential for your next role search — get it now' },
  { step: 'Review equity vesting schedule', note: 'Accelerated vesting may be available — check your offer letter' },
];

export function IncomeProtectionPanel({ scoreResult }: Props) {
  const negotiation = scoreResult?.negotiationIntelligence;
  const runway = scoreResult?.financialRunway;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Income Protection
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Severance negotiation, benefits preservation, and income continuity strategies.
        </div>
      </div>

      {/* Financial runway from audit */}
      {runway && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
            Your Financial Position
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {runway.runwayMonths !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>RUNWAY</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: (runway.runwayMonths ?? 0) >= 6 ? '#10b981' : '#ef4444' }}>
                  {runway.runwayMonths}mo
                </div>
              </div>
            )}
            {runway.tierLabel && (
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>TIER</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{runway.tierLabel}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Negotiation leverage */}
      {negotiation && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>
            Severance Negotiation Script
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
            Leverage rating: <strong style={{ color: negotiation.leverageRating === 'STRONG' ? '#10b981' : negotiation.leverageRating === 'MODERATE' ? '#f59e0b' : '#ef4444' }}>
              {negotiation.leverageRating}
            </strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NEGOTIATION_STEPS.map((item, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                borderLeft: '2px solid #10b981',
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                  {i + 1}. {item.step}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!negotiation && !runway && (
        <div style={{
          padding: 24,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed var(--border)',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
        }}>
          Run a full audit to generate your personalized income protection plan.
        </div>
      )}

      <div style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: 'rgba(16,185,129,0.06)',
        border: '1px solid rgba(16,185,129,0.15)',
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: '#10b981' }}>Pro tip:</strong>{' '}
        Most severance agreements have a 21-day review window. Never sign immediately — use the time to negotiate.
        Everything above is negotiable when approached professionally.
      </div>
    </div>
  );
}
