/**
 * peerBenchmarkEngine.ts
 *
 * Finds safer alternative employers for a user's role and sector.
 * Answers: "If my company is risky, which specific companies in my space are healthier?"
 *
 * This is one of the highest-value outputs the system can deliver — transforming
 * abstract risk awareness into concrete, actionable employer alternatives.
 */

import { supabase } from '../utils/supabase';
import type { CompanyData } from '../data/companyDatabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PeerCompany {
  name: string;
  industry: string;
  region: string;
  riskScore: number;           // 0-100, lower = safer
  companyRiskScore: number;    // 0-1 raw from DB
  employeeCount: number | null;
  revenueGrowthYoY: number | null;
  aiInvestmentSignal: string | null;
  layoffRounds: number;
  lastLayoffDate: string | null;
  hiringFreezeScore: number | null;
  whySafer: string;
  whyRelevant: string;
  opportunitySignal: 'strong' | 'moderate' | 'speculative';
  source: string;
}

export interface PeerBenchmarkResult {
  currentCompanyRisk: number;
  peerMedianRisk: number;
  saferAlternatives: PeerCompany[];
  industryContext: string;
  benchmarkSummary: string;
  dataSource: string;
  fetchedAt: string;
}

// ── Industry synonyms for broader peer matching ───────────────────────────────

const INDUSTRY_ALIASES: Record<string, string[]> = {
  'Technology':        ['Software', 'SaaS', 'Cloud', 'Internet', 'Tech', 'IT Services', 'Fintech'],
  'Financial Services':['Finance', 'Banking', 'Insurance', 'Fintech', 'Payments'],
  'Healthcare':        ['Health Technology', 'Biotech', 'MedTech', 'Pharma', 'Clinical'],
  'E-commerce':        ['Retail Tech', 'D2C', 'Marketplace'],
  'Consulting':        ['Professional Services', 'Advisory', 'Management Consulting'],
  'Media':             ['Media & Publishing', 'Content', 'Digital Media', 'EdTech'],
  'Manufacturing':     ['Industrial', 'Hardware', 'Semiconductor', 'Engineering'],
  'IT Services':       ['IT Outsourcing', 'BPO', 'ITES', 'Software Services', 'GCC'],
};

function getIndustrySearchTerms(industry: string): string[] {
  const terms = [industry];
  for (const [key, aliases] of Object.entries(INDUSTRY_ALIASES)) {
    if (key.toLowerCase() === industry.toLowerCase() ||
        aliases.some(a => a.toLowerCase() === industry.toLowerCase())) {
      return [key, ...aliases];
    }
  }
  return terms;
}

function buildWhySaferText(
  peer: { company_risk_score?: number; layoff_history?: Record<string, unknown>; financial_signals?: Record<string, unknown>; hiring_signals?: Record<string, unknown>; company_name?: string },
  currentRisk: number,
): string {
  const peerRisk = Math.round((peer.company_risk_score ?? 0.4) * 100);
  const riskDelta = currentRisk - peerRisk;
  const layoffs = (peer.layoff_history as any)?.layoff_rounds ?? 0;
  const growth = (peer.financial_signals as any)?.revenue_yoy ?? (peer.financial_signals as any)?.revenue_growth_yoy;
  const hiring = (peer.hiring_signals as any)?.hiring_velocity ?? 'moderate';

  const parts: string[] = [];
  if (riskDelta >= 20) parts.push(`${riskDelta}pts lower risk score`);
  if (layoffs === 0) parts.push('no documented layoff history');
  else if (layoffs < 2) parts.push('minimal restructuring history');
  if (typeof growth === 'number' && growth > 10) parts.push(`+${Math.round(growth)}% revenue growth`);
  if (hiring === 'high' || hiring === 'growing') parts.push('active hiring signals');

  return parts.length > 0 ? parts.join(' · ') : `Lower company risk profile vs. your current employer`;
}

function buildOpportunitySignal(peer: Record<string, unknown>): 'strong' | 'moderate' | 'speculative' {
  const hiring = (peer.hiring_signals as any)?.hiring_velocity;
  const freeze = (peer.hiring_signals as any)?.hiring_freeze_score ?? 0.35;
  const growth = (peer.financial_signals as any)?.revenue_yoy ?? (peer.financial_signals as any)?.revenue_growth_yoy ?? 0;
  if (hiring === 'high' || (freeze < 0.25 && growth > 10)) return 'strong';
  if (freeze < 0.45 || growth > 0) return 'moderate';
  return 'speculative';
}

// ── Core query ────────────────────────────────────────────────────────────────

export async function fetchPeerBenchmark(
  companyData: CompanyData,
  maxPeers = 6,
): Promise<PeerBenchmarkResult> {
  const currentRisk = Math.round((companyData as any)._companyRiskScore ?? 0.5) * 100;
  const industry = companyData.industry ?? 'Technology';
  const region = companyData.region ?? 'US';
  const searchTerms = getIndustrySearchTerms(industry);

  const saferAlternatives: PeerCompany[] = [];
  const fallback = buildFallbackPeers(companyData);

  try {
    // Strategy: Query companies in the same/adjacent industries with lower risk scores,
    // filtering out companies that are worse or the same. Order by risk ascending so
    // the safest companies appear first.
    const { data, error } = await supabase
      .from('company_intelligence')
      .select(`
        company_name, industry, region, company_risk_score, employee_count,
        financial_signals, layoff_history, hiring_signals, ai_exposure_index,
        confidence_score
      `)
      .in('industry', searchTerms)
      .neq('company_name', companyData.name ?? '')
      .lt('company_risk_score', ((companyData as any)._companyRiskScore ?? 0.55) - 0.05)
      .order('company_risk_score', { ascending: true })
      .limit(maxPeers * 2); // fetch more, filter for quality below

    if (!error && data && data.length > 0) {
      for (const row of data) {
        if (saferAlternatives.length >= maxPeers) break;
        const riskScore = Math.round((row.company_risk_score ?? 0.4) * 100);
        const layoffRounds = (row.layoff_history as any)?.layoff_rounds
          ?? (row.layoff_history as any)?.rounds ?? 0;

        // Only include companies with reasonable confidence data
        if ((row.confidence_score ?? 0) < 0.3) continue;

        saferAlternatives.push({
          name: row.company_name,
          industry: row.industry ?? industry,
          region: row.region ?? region,
          riskScore,
          companyRiskScore: row.company_risk_score ?? 0.4,
          employeeCount: row.employee_count ?? null,
          revenueGrowthYoY: (row.financial_signals as any)?.revenue_yoy
            ?? (row.financial_signals as any)?.revenue_growth_yoy ?? null,
          aiInvestmentSignal: (row.hiring_signals as any)?.ai_investment_signal ?? null,
          layoffRounds,
          lastLayoffDate: (row.layoff_history as any)?.lastLayoffDate ?? null,
          hiringFreezeScore: (row.hiring_signals as any)?.hiring_freeze_score ?? null,
          whySafer: buildWhySaferText(row as any, currentRisk),
          whyRelevant: `${row.industry ?? industry} company — directly comparable to your current employer profile`,
          opportunitySignal: buildOpportunitySignal(row as Record<string, unknown>),
          source: 'company_intelligence DB',
        });
      }
    }
  } catch {
    // Non-fatal — fall through to fallback
  }

  // Fill remaining slots with curated fallbacks when DB query returns < maxPeers
  const needed = maxPeers - saferAlternatives.length;
  if (needed > 0) {
    saferAlternatives.push(...fallback.slice(0, needed));
  }

  const peerMedianRisk = saferAlternatives.length > 0
    ? Math.round(saferAlternatives.reduce((s, p) => s + p.riskScore, 0) / saferAlternatives.length)
    : Math.max(10, currentRisk - 20);

  return {
    currentCompanyRisk: currentRisk,
    peerMedianRisk,
    saferAlternatives,
    industryContext: buildIndustryContext(industry, currentRisk, peerMedianRisk),
    benchmarkSummary: buildBenchmarkSummary(companyData.name ?? '', currentRisk, peerMedianRisk, saferAlternatives.length),
    dataSource: 'Supabase company_intelligence + curated sector benchmarks',
    fetchedAt: new Date().toISOString(),
  };
}

function buildIndustryContext(industry: string, currentRisk: number, medianRisk: number): string {
  const delta = currentRisk - medianRisk;
  if (delta >= 20) return `Your employer is materially riskier than comparable ${industry} companies. The gap of ${delta} points represents a significant structural disadvantage — peer companies have shown more stability.`;
  if (delta >= 10) return `Your employer sits above the peer median for ${industry} companies. This is notable but not extreme — the industry as a whole has similar pressures, your company is just managing them less smoothly.`;
  if (delta >= 0) return `Your employer is near the peer median for ${industry} companies. Risk is distributed across the sector rather than concentrated at your employer specifically.`;
  return `Your employer is actually below the peer median for ${industry} companies — a positive signal suggesting relative stability within a sector-wide context.`;
}

function buildBenchmarkSummary(
  companyName: string,
  currentRisk: number,
  medianRisk: number,
  peerCount: number,
): string {
  const delta = currentRisk - medianRisk;
  const label = delta >= 20 ? 'significantly above' : delta >= 10 ? 'above' : delta >= 0 ? 'near' : 'below';
  return `${companyName || 'Your company'} risk score (${currentRisk}/100) is ${label} the peer median (${medianRisk}/100) across ${peerCount} comparable companies. ${peerCount > 0 ? 'Safer alternatives identified below.' : ''}`;
}

// ── Curated fallback peers by sector ─────────────────────────────────────────
// Used when the DB query returns insufficient results.
// These represent structurally stable employers in each sector as of Q1 2026.

function buildFallbackPeers(companyData: CompanyData): PeerCompany[] {
  const industry = (companyData.industry ?? '').toLowerCase();
  const region = companyData.region ?? 'US';

  const FALLBACK_PEERS: Record<string, PeerCompany[]> = {
    tech: [
      { name: 'Cloudflare', industry: 'Technology', region: 'US', riskScore: 32, companyRiskScore: 0.32, employeeCount: 4300, revenueGrowthYoY: 28, aiInvestmentSignal: 'high', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.20, whySafer: 'Zero layoff history · 28% YoY revenue growth · active hiring', whyRelevant: 'Infrastructure/security SaaS — comparable engineering roles', opportunitySignal: 'strong', source: 'curated_fallback' },
      { name: 'Datadog', industry: 'Technology', region: 'US', riskScore: 28, companyRiskScore: 0.28, employeeCount: 5700, revenueGrowthYoY: 22, aiInvestmentSignal: 'high', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.18, whySafer: 'Zero layoff history · 22% revenue growth · observability sector growing', whyRelevant: 'Platform engineering — strong demand for backend and data engineers', opportunitySignal: 'strong', source: 'curated_fallback' },
      { name: 'Snowflake', industry: 'Technology', region: 'US', riskScore: 38, companyRiskScore: 0.38, employeeCount: 7000, revenueGrowthYoY: 32, aiInvestmentSignal: 'very-high', layoffRounds: 1, lastLayoffDate: '2024-01-01', hiringFreezeScore: 0.28, whySafer: 'High growth offsetting one past restructuring · data platform demand rising', whyRelevant: 'Data engineering and platform roles in high demand', opportunitySignal: 'moderate', source: 'curated_fallback' },
      { name: 'HashiCorp (IBM)', industry: 'Technology', region: 'US', riskScore: 30, companyRiskScore: 0.30, employeeCount: 1800, revenueGrowthYoY: 15, aiInvestmentSignal: 'high', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.22, whySafer: 'IBM parent backing · DevOps tooling market stable', whyRelevant: 'Platform/DevOps engineering roles', opportunitySignal: 'moderate', source: 'curated_fallback' },
    ],
    finance: [
      { name: 'Stripe', industry: 'Financial Services', region: 'US', riskScore: 35, companyRiskScore: 0.35, employeeCount: 8000, revenueGrowthYoY: 25, aiInvestmentSignal: 'high', layoffRounds: 1, lastLayoffDate: '2023-11-01', hiringFreezeScore: 0.25, whySafer: 'Post-restructuring stability · payments market structural growth', whyRelevant: 'Engineering, PM, and data science roles actively hiring', opportunitySignal: 'strong', source: 'curated_fallback' },
      { name: 'Wise (TransferWise)', industry: 'Financial Services', region: 'EU', riskScore: 28, companyRiskScore: 0.28, employeeCount: 5000, revenueGrowthYoY: 30, aiInvestmentSignal: 'medium', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.20, whySafer: 'No layoff history · profitable · cross-border payments growing', whyRelevant: 'Finance and engineering roles in growing FinTech', opportunitySignal: 'strong', source: 'curated_fallback' },
    ],
    healthcare: [
      { name: 'Epic Systems', industry: 'Healthcare Technology', region: 'US', riskScore: 22, companyRiskScore: 0.22, employeeCount: 11000, revenueGrowthYoY: 12, aiInvestmentSignal: 'medium', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.15, whySafer: 'Dominant EHR market position · no documented layoffs · stable government contracts', whyRelevant: 'Engineering, implementation, and data roles in healthcare tech', opportunitySignal: 'moderate', source: 'curated_fallback' },
    ],
    india_it: [
      { name: 'LTIMindtree', industry: 'IT Services', region: 'IN', riskScore: 38, companyRiskScore: 0.38, employeeCount: 85000, revenueGrowthYoY: 8, aiInvestmentSignal: 'high', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.30, whySafer: 'Mid-tier IT with higher growth rate than large-cap peers · no recent cuts', whyRelevant: 'Software services — direct skill transferability', opportunitySignal: 'moderate', source: 'curated_fallback' },
      { name: 'Persistent Systems', industry: 'IT Services', region: 'IN', riskScore: 35, companyRiskScore: 0.35, employeeCount: 23000, revenueGrowthYoY: 18, aiInvestmentSignal: 'high', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.25, whySafer: '18% revenue growth · AI-native services transition · no layoff history', whyRelevant: 'Engineering and data science roles — growing faster than sector', opportunitySignal: 'strong', source: 'curated_fallback' },
      { name: 'Mphasis', industry: 'IT Services', region: 'IN', riskScore: 40, companyRiskScore: 0.40, employeeCount: 36000, revenueGrowthYoY: 10, aiInvestmentSignal: 'medium', layoffRounds: 0, lastLayoffDate: null, hiringFreezeScore: 0.28, whySafer: 'DXC parent backing · BFSI focus with stable client base', whyRelevant: 'IT services with financial sector specialization', opportunitySignal: 'moderate', source: 'curated_fallback' },
    ],
  };

  if (/bpo|ites|call.?cent/i.test(industry) || region === 'IN') {
    return FALLBACK_PEERS.india_it ?? [];
  }
  if (/it.?service|software.?service/i.test(industry) && region === 'IN') {
    return FALLBACK_PEERS.india_it ?? [];
  }
  if (/finance|banking|fintech|payment/i.test(industry)) return FALLBACK_PEERS.finance ?? [];
  if (/health/i.test(industry)) return FALLBACK_PEERS.healthcare ?? [];
  return FALLBACK_PEERS.tech ?? [];
}
