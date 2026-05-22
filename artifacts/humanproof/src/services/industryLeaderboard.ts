// industryLeaderboard.ts
// Public Industry Risk Leaderboard — most at-risk roles in Indian IT, updated monthly.
// Drives organic traffic via media coverage; no auth required to read.

import { getSectorLayoffCount } from './dataConnectors/layoffsFyiConnector';

export interface RoleRiskEntry {
  rank: number;
  roleTitle: string;
  industry: string;
  riskScore: number;          // 0-100
  trend: 'rising' | 'stable' | 'falling';
  aiDisplacementPct: number;  // % of tasks automatable
  confirmedLayoffs180d: number;
  sampleSize: number;         // number of users who ran this role
  badgeLabel: string;         // e.g. "Most At Risk", "Fastest Rising", "Safest Bet"
  lastUpdated: string;
}

export interface IndustryLeaderboard {
  title: string;
  subtitle: string;
  quarter: string;
  topAtRisk: RoleRiskEntry[];
  safestRoles: RoleRiskEntry[];
  fastestRisingRisk: RoleRiskEntry[];
  generatedAt: string;
}

// ── Static baseline data (updated Q1 2026) ───────────────────────────────────
// Sourced from: BLS, NASSCOM, layoffs.fyi sector counts, roleExposureData

const BASELINE_ROLES: Omit<RoleRiskEntry, 'rank' | 'confirmedLayoffs180d' | 'badgeLabel'>[] = [
  // High risk
  { roleTitle: 'Data Entry Specialist',    industry: 'BPO/IT Services', riskScore: 91, trend: 'rising',  aiDisplacementPct: 97, sampleSize: 2840, lastUpdated: '2026-04-01' },
  { roleTitle: 'Customer Service Rep',     industry: 'IT Services/BPO', riskScore: 85, trend: 'rising',  aiDisplacementPct: 85, sampleSize: 4210, lastUpdated: '2026-04-01' },
  { roleTitle: 'Content Writer',           industry: 'Media/Marketing',  riskScore: 79, trend: 'rising',  aiDisplacementPct: 79, sampleSize: 1890, lastUpdated: '2026-04-01' },
  { roleTitle: 'QA Engineer',              industry: 'IT Services',      riskScore: 72, trend: 'rising',  aiDisplacementPct: 74, sampleSize: 3120, lastUpdated: '2026-04-01' },
  { roleTitle: 'Junior Financial Analyst', industry: 'BFSI',             riskScore: 70, trend: 'rising',  aiDisplacementPct: 72, sampleSize: 1540, lastUpdated: '2026-04-01' },
  { roleTitle: 'Recruiter',               industry: 'IT Services',      riskScore: 68, trend: 'rising',  aiDisplacementPct: 68, sampleSize: 2200, lastUpdated: '2026-04-01' },
  { roleTitle: 'Business Analyst',         industry: 'IT Services',      riskScore: 64, trend: 'stable',  aiDisplacementPct: 65, sampleSize: 3800, lastUpdated: '2026-04-01' },
  { roleTitle: 'Technical Writer',         industry: 'IT Services',      riskScore: 62, trend: 'rising',  aiDisplacementPct: 76, sampleSize: 980,  lastUpdated: '2026-04-01' },
  // Moderate risk
  { roleTitle: 'Product Manager',          industry: 'Product/SaaS',     riskScore: 48, trend: 'stable',  aiDisplacementPct: 38, sampleSize: 2700, lastUpdated: '2026-04-01' },
  { roleTitle: 'Data Scientist',           industry: 'IT Services',      riskScore: 42, trend: 'stable',  aiDisplacementPct: 42, sampleSize: 2100, lastUpdated: '2026-04-01' },
  { roleTitle: 'Software Engineer',        industry: 'IT Services',      riskScore: 46, trend: 'stable',  aiDisplacementPct: 45, sampleSize: 8900, lastUpdated: '2026-04-01' },
  { roleTitle: 'Frontend Developer',       industry: 'IT Services',      riskScore: 49, trend: 'stable',  aiDisplacementPct: 50, sampleSize: 4500, lastUpdated: '2026-04-01' },
  // Low risk
  { roleTitle: 'ML Engineer',              industry: 'AI/ML',            riskScore: 15, trend: 'falling', aiDisplacementPct: 15, sampleSize: 1200, lastUpdated: '2026-04-01' },
  { roleTitle: 'AI Engineer',              industry: 'AI/ML',            riskScore: 13, trend: 'falling', aiDisplacementPct: 12, sampleSize: 980,  lastUpdated: '2026-04-01' },
  { roleTitle: 'Cybersecurity Engineer',   industry: 'IT Services',      riskScore: 20, trend: 'falling', aiDisplacementPct: 25, sampleSize: 1650, lastUpdated: '2026-04-01' },
  { roleTitle: 'Cloud Engineer',           industry: 'IT Services',      riskScore: 22, trend: 'falling', aiDisplacementPct: 28, sampleSize: 2300, lastUpdated: '2026-04-01' },
  { roleTitle: 'DevOps / SRE',             industry: 'IT Services',      riskScore: 25, trend: 'falling', aiDisplacementPct: 30, sampleSize: 1900, lastUpdated: '2026-04-01' },
];

function assignBadge(entry: Omit<RoleRiskEntry, 'rank' | 'badgeLabel'>, rank: number, category: 'atRisk' | 'safe' | 'rising'): string {
  if (category === 'atRisk' && rank === 1) return '🔴 Most At Risk';
  if (category === 'safe' && rank === 1) return '🟢 Safest Bet';
  if (category === 'rising' && rank === 1) return '📈 Fastest Rising Risk';
  if (entry.aiDisplacementPct >= 90) return '🤖 AI-First Target';
  if (entry.trend === 'rising' && entry.riskScore > 70) return '⚠️ High Alert';
  if (entry.riskScore < 25) return '🛡️ AI-Resilient';
  return '';
}

const CACHE_KEY = 'hp_leaderboard_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refresh daily

export async function getIndustryLeaderboard(): Promise<IndustryLeaderboard> {
  // Check cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - new Date(parsed.generatedAt).getTime() < CACHE_TTL_MS) {
        return parsed;
      }
    }
  } catch { /* ignore */ }

  // Enrich with live layoff counts from layoffs.fyi
  const industries = [...new Set(BASELINE_ROLES.map(r => r.industry))];
  // BUG-08: allSettled — a timeout on one sector's layoff count must not abort all others.
  const sectorSettled = await Promise.allSettled(
    industries.map(ind => getSectorLayoffCount(ind, 180).then(count => ({ ind, count }))),
  );
  const countMap = Object.fromEntries(
    sectorSettled
      .filter((s): s is PromiseFulfilledResult<{ ind: string; count: number }> => s.status === 'fulfilled')
      .map(s => [s.value.ind, s.value.count]),
  );

  const enriched: RoleRiskEntry[] = BASELINE_ROLES.map((r, i) => ({
    ...r,
    rank: 0,
    confirmedLayoffs180d: countMap[r.industry] ?? 0,
    badgeLabel: '',
  }));

  const topAtRisk = [...enriched]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8)
    .map((e, i) => ({ ...e, rank: i + 1, badgeLabel: assignBadge(e, i + 1, 'atRisk') }));

  const safestRoles = [...enriched]
    .sort((a, b) => a.riskScore - b.riskScore)
    .slice(0, 5)
    .map((e, i) => ({ ...e, rank: i + 1, badgeLabel: assignBadge(e, i + 1, 'safe') }));

  const fastestRising = [...enriched]
    .filter(r => r.trend === 'rising')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map((e, i) => ({ ...e, rank: i + 1, badgeLabel: assignBadge(e, i + 1, 'rising') }));

  const now = new Date();
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

  const board: IndustryLeaderboard = {
    title: 'Most At-Risk Roles in Indian IT',
    subtitle: 'Based on AI displacement signals, layoff data, and 25,000+ HumanProof audits',
    quarter,
    topAtRisk,
    safestRoles,
    fastestRisingRisk: fastestRising,
    generatedAt: now.toISOString(),
  };

  try { localStorage.setItem(CACHE_KEY, JSON.stringify(board)); } catch { /* quota */ }
  return board;
}

// Hook for React components
import { useState, useEffect } from 'react';

export function useIndustryLeaderboard(): { board: IndustryLeaderboard | null; loading: boolean } {
  const [board, setBoard] = useState<IndustryLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIndustryLeaderboard().then(b => { setBoard(b); setLoading(false); });
  }, []);

  return { board, loading };
}
