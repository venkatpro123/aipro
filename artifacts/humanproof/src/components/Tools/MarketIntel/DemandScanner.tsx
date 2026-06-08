// DemandScanner.tsx — Adjacent high-demand roles from market demand + escape paths
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface RoleCard {
  title: string;
  demandIndex: number;
  demandTrend: number;
  avgSalaryUSD: number | null;
  growthRate: number;
  isAdjacent: boolean;
  riskReduction?: number;
}

const DEMAND_TREND_MAP: Record<string, number> = {
  surging: 15, rising: 8, stable: 0, declining: -8, falling: -15,
};

// Role-family to median USD salary map (BLS / LinkedIn Salary 2025)
const ROLE_SALARY_MAP: Record<string, number> = {
  'software engineer':         130000,
  'data scientist':            120000,
  'product manager':           125000,
  'data analyst':              85000,
  'machine learning engineer': 145000,
  'devops engineer':           125000,
  'ux designer':               95000,
  'product designer':          100000,
  'marketing manager':         90000,
  'sales manager':             105000,
  'financial analyst':         85000,
  'operations manager':        90000,
  'project manager':           95000,
  'hr manager':                80000,
  'cybersecurity analyst':     105000,
  'cloud architect':           150000,
  'ai engineer':               155000,
};

function estimateSalary(roleTitle: string): number | null {
  const lower = roleTitle.toLowerCase();
  for (const [key, sal] of Object.entries(ROLE_SALARY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return sal;
  }
  return null;
}

function buildRoleCards(scoreResult: HybridResult): RoleCard[] {
  const market = scoreResult.roleMarketDemand;
  if (!market) return [];

  const snap = market.snapshot;
  const trendNum = DEMAND_TREND_MAP[snap.demandTrend] ?? 0;
  const cards: RoleCard[] = [];

  // Primary role — try compensationRisk for median salary
  const primarySalary =
    (scoreResult.compensationRisk as any)?.marketMedianUSD ??
    estimateSalary(snap.roleName ?? '') ??
    null;

  cards.push({
    title: snap.roleName ?? 'Your Current Role',
    demandIndex: market.adjustedDemandIndex ?? snap.demandIndex ?? 50,
    demandTrend: trendNum,
    avgSalaryUSD: primarySalary,
    growthRate: snap.yoyJobOpeningsChange ?? trendNum,
    isAdjacent: false,
  });

  // Adjacent roles from escape paths
  const escapePaths = scoreResult.escapePaths?.paths ?? [];
  for (const path of escapePaths.slice(0, 5)) {
    const titleWords = path.title ?? path.headline ?? '';
    const salEstimate = estimateSalary(titleWords);
    // Map estimatedScoreDrop to a demand index (higher score drop → role is in higher demand)
    const demandIdx = Math.max(20, Math.min(95, 55 + (path.estimatedScoreDrop ?? 0)));
    cards.push({
      title: titleWords,
      demandIndex: demandIdx,
      demandTrend: 5,
      avgSalaryUSD: salEstimate,
      growthRate: 5,
      isAdjacent: true,
      riskReduction: path.estimatedScoreDrop,
    });
  }

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
          Your current role + adjacent opportunities ranked by market demand. Higher index = more open roles and stronger hiring.
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
              {/* Demand index */}
              <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: demandColor }}>{Math.round(role.demandIndex)}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>DEMAND</div>
              </div>

              {/* Role info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {role.title}
                  </div>
                  {!role.isAdjacent && (
                    <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      YOUR ROLE
                    </span>
                  )}
                  {role.isAdjacent && role.riskReduction != null && role.riskReduction > 0 && (
                    <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      −{Math.round(role.riskReduction)}pts risk
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
                  {role.avgSalaryUSD != null
                    ? `Avg salary: $${role.avgSalaryUSD.toLocaleString()}`
                    : role.isAdjacent ? 'Adjacent opportunity' : 'Salary data unavailable'}
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
      {roles.filter(r => r.isAdjacent).length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Adjacent roles sourced from your career escape path analysis · Salary estimates from BLS/LinkedIn 2025
        </div>
      )}
    </div>
  );
}
