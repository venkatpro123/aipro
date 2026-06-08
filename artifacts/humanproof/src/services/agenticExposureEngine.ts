// agenticExposureEngine.ts — 2030 Structural Agentic AI Exposure Score
// Pure deterministic formula — zero API calls, zero new dependencies.
// Measures future-state exposure to autonomous (agentic) AI, separate from
// the current Oracle score which measures present-day displacement risk.

import { getAutomationTimeline } from '../data/automationTimelineData';
import { industryRiskData }       from '../data/industryRiskData';
import { COUNTRY_RISK_PROFILES }  from '../data/countryRiskProfile';

// Bridge from catalogData industry keys → industryRiskData keys (mirrors riskFormula.ts)
const INDUSTRY_TO_RISK_KEY: Record<string, string> = {
  it_software: 'Technology', it_web: 'Technology', it_mobile: 'Technology',
  it_saas: 'Technology', it_ai_ml: 'Technology', it_cybersec: 'Cybersecurity',
  it_devops: 'Technology', it_blockchain: 'Technology', it_gaming: 'Gaming',
  it_qa: 'Technology', it_erp: 'Technology',
  finance: 'Financial Services', fintech: 'FinTech', insurance: 'Insurance',
  investment: 'Financial Services',
  media: 'Media & Publishing', content: 'Media & Publishing',
  marketing: 'Media & Publishing', advertising: 'Media & Publishing',
  healthcare: 'Healthcare', pharma: 'Biotech/Pharma', biotech: 'Biotech/Pharma',
  education: 'Education', edtech: 'EdTech',
  ecommerce: 'E-commerce', retail: 'Retail',
  manufacturing: 'Manufacturing', engineering: 'Manufacturing',
  energy: 'Energy', construction: 'Construction',
  legal: 'Legal', consulting: 'Consulting', hr: 'Consulting',
  government: 'Government', nonprofit: 'Nonprofit',
  hospitality: 'Hospitality', logistics: 'Logistics',
  telecom: 'Telecom', realestate: 'Real Estate',
  bpo: 'BPO', ites: 'ITES', it_services: 'IT Services',
  banking: 'Banking', mobility: 'Mobility',
  food_tech: 'Food Tech', agritech: 'AgriTech',
  media_india: 'Media', social_media: 'Social Media',
};

export type AgenticTier = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'EXTREME';

export interface AgenticExposureResult {
  score: number;
  tier: AgenticTier;
  label: string;
  subScores: {
    taskAutoPotential: number;
    agenticProgression: number;
    laborEcon: number;
    orgRestructure: number;
    agenticDisruptionPotential: number; // D7 — structural agentic vulnerability
  };
  narrative: string;
}

function getAgenticTier(score: number): AgenticTier {
  if (score <= 20) return 'LOW';
  if (score <= 40) return 'MODERATE';
  if (score <= 60) return 'HIGH';
  if (score <= 80) return 'SEVERE';
  return 'EXTREME';
}

function buildNarrative(tier: AgenticTier, impactTimeline: string, industryName: string): string {
  const timingPhrase = impactTimeline === 'short'
    ? 'within the next 2–4 years'
    : impactTimeline === 'medium'
    ? 'over the next 4–7 years'
    : 'over a longer 7–10 year horizon';

  switch (tier) {
    case 'LOW':
      return `This role has strong structural protection against agentic AI displacement. Human judgment, physical presence, and relationship-intensive work remain highly resistant to autonomous AI systems ${timingPhrase}.`;
    case 'MODERATE':
      return `Agentic AI will likely augment this role rather than displace it, automating repetitive workflows while human expertise drives value. Expect meaningful workflow changes ${timingPhrase}.`;
    case 'HIGH':
      return `A significant portion of this role's tasks could be automated by agentic AI systems ${timingPhrase}. Proactive skill evolution toward oversight, strategy, and uniquely human capabilities is important now.`;
    case 'SEVERE':
      return `This role faces severe structural exposure to agentic AI adoption in ${industryName}. Many core workflows could be automated ${timingPhrase}. Pivoting toward higher-order responsibilities or adjacent roles is strongly recommended.`;
    case 'EXTREME':
      return `This role faces extreme structural disruption risk from autonomous AI systems. The ${industryName} sector is among the fastest-adopting. Immediate strategic repositioning — not gradual upskilling — is warranted before the capability threshold is crossed.`;
  }
}

export function computeAgenticExposureScore(params: {
  dimensions: { key: string; score: number }[];
  industryKey: string;
  roleKey: string;
  experience: string;
  countryKey: string;
  companyType?: string;
  d7Score?: number; // D7 Agentic Disruption Potential (0-100), default 55
}): AgenticExposureResult {
  const { dimensions, industryKey, roleKey, experience, countryKey, companyType, d7Score = 55 } = params;

  const timeline     = getAutomationTimeline(roleKey);
  const riskKey      = INDUSTRY_TO_RISK_KEY[industryKey] ?? 'Technology';
  const industryRisk = industryRiskData[riskKey] ?? industryRiskData['Technology'];
  const countryProf  = COUNTRY_RISK_PROFILES[countryKey] ?? COUNTRY_RISK_PROFILES['usa'];

  const d1 = dimensions.find(d => d.key === 'D1')?.score ?? 50;
  const d2 = dimensions.find(d => d.key === 'D2')?.score ?? 50;
  const d4 = dimensions.find(d => d.key === 'D4')?.score ?? 50;

  // Sub-A: Task Automation Potential (weight 0.30)
  const taskAutoPotential = Math.min(100, Math.round(
    (d1 * 0.6) + (timeline.displacementProbability2032 * 100 * 0.4)
  ));

  // Sub-B: Agentic Capability Progression (weight 0.30)
  // Capped at 85 to prevent a single volatile+high-adoption industry from
  // dominating the composite score and inflating the overall tier beyond
  // what the role-level task data supports.
  const outlookMultiplier: Record<string, number> = {
    growing: 0.75, stable: 1.0, volatile: 1.10, declining: 1.20,
  };
  const mult = outlookMultiplier[industryRisk.growthOutlook] ?? 1.0;
  const agenticProgression = Math.min(85, Math.round(industryRisk.aiAdoptionRate * 100 * mult));

  // Sub-C: Labor Replacement Economics (weight 0.25)
  const laborEcon = Math.min(100, Math.round(
    (d2 * 0.5)
    + (countryProf.labourFlexibility * 30)
    + (countryProf.offshoreVulnerability * 20)
  ));

  // Sub-D: Organizational Restructuring Likelihood (weight 0.15)
  const timelineScore: Record<string, number> = { short: 80, medium: 55, long: 30 };
  const d4ShieldDiscount = Math.max(0, (d4 - 50) / 100);
  const orgRestructureRaw = (timelineScore[timeline.impactTimeline] ?? 55) * (1 - d4ShieldDiscount * 0.4);

  // Company-type modifier — startups adopt faster, government slowest
  const companyMult: Record<string, number> = {
    startup: 1.15, scaleup: 1.05, enterprise: 1.0, government: 0.70, freelance: 1.0,
  };
  const orgRestructure = Math.min(100, Math.round(orgRestructureRaw * (companyMult[companyType ?? ''] ?? 1.0)));

  // Sub-E: Agentic Disruption Potential (D7) — blended at 0.10 weight
  // d7Score is 0-100; clamp to prevent it dominating the composite.
  const agenticDisruptionPotential = Math.min(100, Math.max(0, d7Score));

  // Final weighted score — D7 contributes 10%, redistributed from orgRestructure
  const raw = (
    taskAutoPotential          * 0.30 +
    agenticProgression         * 0.28 +
    laborEcon                  * 0.22 +
    orgRestructure             * 0.10 +
    agenticDisruptionPotential * 0.10
  );
  const score = Math.min(100, Math.max(0, Math.round(raw)));
  const tier  = getAgenticTier(score);

  return {
    score,
    tier,
    label: `2030 Structural Exposure: ${score}%`,
    subScores: {
      taskAutoPotential,
      agenticProgression,
      laborEcon,
      orgRestructure,
      agenticDisruptionPotential,
    },
    narrative: buildNarrative(tier, timeline.impactTimeline, riskKey),
  };
}
