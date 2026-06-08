// DemandScanner.tsx — Adjacent high-demand roles from market demand report
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface RoleCard {
  title: string;
  demandIndex: number;
  demandTrend: number;
  avgSalaryUSD: number;
  growthRate: number;
  isAdjacent: boolean;
}

const DEMAND_TREND_MAP: Record<string, number> = {
  surging: 15, rising: 8, stable: 0, declining: -8, falling: -15,
};

function buildRoleCards(scoreResult: HybridResult): RoleCard[] {
  const market = scoreResult.roleMarketDemand;
  if (!market) return [];

  const snap = market.snapshot;
  const trendNum = DEMAND_TREND_MAP[snap.demandTrend] ?? 0;

  const cards: RoleCard[] = [];

  // Primary role
  cards.push({
    title: snap.roleName ?? 'Your Current Role',
    demandIndex: market.adjustedDemandIndex ?? snap.demandIndex ?? 50,
    demandTrend: trendNum,
    avgSalaryUSD: 80000,
    growthRate: snap.yoyJobOpeningsChange ?? trendNum,
    isAdjacent: false,
  });

  return cards.sort((a, b) => b.demandIndex - a.demandIndex);
}

export function DemandScanner({ scoreResult }: Props) {
  const roles = useMemo(() => buildRoleCards(scoreResult), [scoreResult]);
  const market = scoreResult.roleMarketDemand;

  if (!market || roles.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.5)', padding: '32px 0', textAlign: 'center', fontSize: 14 }}>
        Market demand data not available. Run a full audit to unlock role demand intelligence.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Role Demand Scanner
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Current and adjacent roles ranked by market demand. Higher index = more open roles and stronger hiring.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roles.map((role, i) => {
          const demandColor = role.demandIndex >= 70 ? '#10b981' : role.demandIndex >= 45 ? '#f59e0b' : '#ef4444';
          const TrendIcon = role.demandTrend > 2 ? TrendingUp : role.demandTrend < -2 ? TrendingDown : Minus;
          const trendColor = role.demandTrend > 2 ? '#10b981' : role.demandTrend < -2 ? '#ef4444' : '#f59e0b';

          return (
            <div key={i} className="card-premium" style={{
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              border: !role.isAdjacent ? '1px solid rgba(245,158,11,0.4)' : undefined,
            }}>
              {/* Demand index bar */}
              <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: demandColor }}>{Math.round(role.demandIndex)}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>DEMAND</div>
              </div>

              {/* Role info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.title}</div>
                  {!role.isAdjacent && (
                    <span style={{
                      fontSize: 10,
                      color: '#f59e0b',
                      background: 'rgba(245,158,11,0.15)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}>YOUR ROLE</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                  Avg salary: ${role.avgSalaryUSD.toLocaleString()}
                </div>
              </div>

              {/* Trend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: trendColor, flexShrink: 0 }}>
                <TrendIcon size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {role.demandTrend > 0 ? '+' : ''}{Math.round(role.demandTrend)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {market.snapshot?.dataQuarter && (
        <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Data as of {market.snapshot.dataQuarter} · {market.snapshot.calibrationNote}
        </div>
      )}
    </div>
  );
}
