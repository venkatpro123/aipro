// NetworkMapPanel.tsx — Network strength from NetworkLeverageResult
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  POWERFUL:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
  SOLID:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)'   },
  FUNCTIONAL: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)'  },
  SPARSE:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)'  },
  MINIMAL:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
};

export function NetworkMapPanel({ scoreResult }: Props) {
  const net = scoreResult.networkLeverage;

  if (!net) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
        Run a full audit to generate your network intelligence.
      </div>
    );
  }

  const cfg = TIER_CONFIG[net.networkTier] ?? TIER_CONFIG.FUNCTIONAL;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Network Map</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your professional network strength, referral access, and activation timeline.
        </div>
      </div>

      {/* Score hero */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '20px 24px', borderRadius: 14,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        <div style={{ fontWeight: 800, fontSize: 56, color: cfg.color, lineHeight: 1 }}>
          {Math.round(net.networkScore)}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            Network Score · <span style={{ color: cfg.color }}>{net.networkTier}</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, maxWidth: 420, lineHeight: 1.5 }}>
            {net.networkHeadline}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>REFERRAL ACCESS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)' }}>{Math.round(net.referralAccessScore ?? 0)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>/ 100</div>
        </div>
        <div className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>TIME TO FIRST REFERRAL</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{net.timeToFirstReferral ?? '2–4 weeks'}</div>
        </div>
        <div className="card-premium" style={{ padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>WARM VS COLD APPLY</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
            {net.applicationChannelSplit?.warmReferral ?? 30}% warm
          </div>
        </div>
      </div>

      {/* Activation plan */}
      {net.activationPlan && net.activationPlan.length > 0 && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>
            2-Week Activation Plan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {net.activationPlan.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--cyan)',
                }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
