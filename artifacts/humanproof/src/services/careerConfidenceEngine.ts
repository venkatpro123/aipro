// careerConfidenceEngine.ts — v13.0 Layer 24
//
// Career confidence and psychological job-search readiness assessment.
//
// Risk score tells users HOW DANGEROUS their situation is.
// Career confidence tells them HOW PREPARED they are to respond.
// These are orthogonal: a high-risk user with high confidence needs
// different guidance than a high-risk user who is psychologically unprepared.
//
// Five readiness pillars (each 0–100):
//   P1: Material Readiness   — resume, LinkedIn, portfolio up-to-date?
//   P2: Market Intelligence  — does the user know their market rate + top targets?
//   P3: Network Activation   — warm contacts, referrals, recruiter relationships
//   P4: Financial Stability  — can they search without desperation-driven decisions?
//   P5: Skill Confidence     — do they feel their skills are competitive today?
//
// Composite score → Confidence Tier → Personalized guidance
//
// All inputs are heuristically derived from known user factors.
// We do NOT ask users to self-report confidence (avoids Dunning-Kruger bias).

export type ConfidenceTier =
  | 'READY'          // 75–100: All systems go. You can move immediately and effectively.
  | 'MOSTLY_READY'   // 60–74: One or two gaps. Address them while still employed.
  | 'PREPARING'      // 45–59: Significant gaps. 2–4 weeks of prep will change your position substantially.
  | 'UNREADY'        // 30–44: Multiple critical gaps. Proactive preparation is urgent.
  | 'VULNERABLE';    // 0–29: Severely under-prepared for a sudden job search event.

export interface ReadinessPillar {
  id: 'material' | 'market' | 'network' | 'financial' | 'skill';
  name: string;
  score: number;          // 0–100
  weight: number;
  status: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';
  gap: string;            // what's missing
  topAction: string;      // highest-ROI action for this pillar
  timeToFix: string;      // realistic time to close the gap
}

export interface CareerConfidenceResult {
  compositeScore: number;
  confidenceTier: ConfidenceTier;
  pillars: ReadinessPillar[];
  criticalGap: ReadinessPillar | null;     // single biggest weakness
  keyStrength: ReadinessPillar | null;     // biggest asset to leverage
  readinessHeadline: string;
  improvementPriority: string[];           // ordered top 3 actions
  estimatedReadyInDays: number;            // days to reach MOSTLY_READY tier
  riskConfidenceInterpretation: string;    // how risk + confidence interact
  readonly calibrationStatus: 'heuristic_v13';
}

export interface CareerConfidenceInputs {
  currentScore: number;
  tenureYears: number;
  financialRunwayMonths: number;
  performanceTier: 'top' | 'average' | 'below' | 'unknown';
  hasAiSkills: boolean;
  oracleKey: string;
  industry: string;
  experience: string;   // "0-2" | "2-5" | "5-10" | "10+"
  uniquenessDepth?: 'generic' | 'functional_specialist' | 'critical_knowledge';
  networkStrengthSelfReport?: 'strong' | 'moderate' | 'weak' | 'unknown';
  jobMarketLiquidityScore?: number;    // from Layer 9
  resilienceScore?: number;            // from careerResilienceEngine
}

// ── Scoring helpers ────────────────────────────────────────────────────────────

function pillarStatus(score: number): ReadinessPillar['status'] {
  if (score >= 70) return 'STRONG';
  if (score >= 50) return 'ADEQUATE';
  if (score >= 30) return 'WEAK';
  return 'CRITICAL';
}

// ── Pillar 1: Material Readiness (resume, LinkedIn, portfolio) ─────────────────

function scoreMaterialReadiness(inputs: CareerConfidenceInputs): ReadinessPillar {
  let score = 50; // baseline — we can't know if resume is updated

  // Longer tenure = more likely resume is stale
  if (inputs.tenureYears > 5) score -= 15;
  else if (inputs.tenureYears > 2) score -= 8;

  // Strong performers tend to have more visible profiles
  if (inputs.performanceTier === 'top') score += 12;
  if (inputs.performanceTier === 'below') score -= 10;

  // AI skills = likely has a modern portfolio or GitHub
  if (inputs.hasAiSkills) score += 10;

  // Critical knowledge depth = harder to commoditize = less likely to have prepared materials
  if (inputs.uniquenessDepth === 'critical_knowledge') score -= 8;

  score = Math.min(100, Math.max(0, score));

  return {
    id: 'material',
    name: 'Career Materials',
    score,
    weight: 0.20,
    status: pillarStatus(score),
    gap: score < 50
      ? 'Resume likely outdated; LinkedIn profile may not reflect recent achievements'
      : 'Materials exist but may need achievement quantification',
    topAction: 'Update LinkedIn "About" section with 3 quantified achievements from the past 12 months. This takes 90 minutes and is the highest-ROI career action at any risk level.',
    timeToFix: '1–3 days',
  };
}

// ── Pillar 2: Market Intelligence (salary, target companies, competition) ──────

function scoreMarketIntelligence(inputs: CareerConfidenceInputs): ReadinessPillar {
  let score = 40; // baseline — most people underinvest in market research

  // Longer tenure = more removed from market realities
  if (inputs.tenureYears > 5) score -= 15;
  else if (inputs.tenureYears < 2) score += 15; // recently hired = knows the market

  // Job market liquidity awareness correlates with market knowledge
  const liquidity = inputs.jobMarketLiquidityScore ?? 50;
  if (liquidity >= 70) score += 12;
  else if (liquidity <= 30) score -= 10;

  // AI skills = more likely to follow tech market closely
  if (inputs.hasAiSkills) score += 8;

  // Senior experience = typically better market awareness
  if (inputs.experience === '10+') score += 10;
  if (inputs.experience === '0-2') score -= 5;

  score = Math.min(100, Math.max(0, score));

  return {
    id: 'market',
    name: 'Market Intelligence',
    score,
    weight: 0.20,
    status: pillarStatus(score),
    gap: score < 50
      ? 'Likely unclear on current market rate and competitive talent supply'
      : 'Good baseline awareness; needs specific target company research',
    topAction: 'Spend 2 hours researching: (1) your current market rate on Glassdoor/Levels.fyi, (2) 10 companies actively hiring for your role. This data transforms every negotiation and application.',
    timeToFix: '2–4 hours',
  };
}

// ── Pillar 3: Network Activation ───────────────────────────────────────────────

function scoreNetworkActivation(inputs: CareerConfidenceInputs): ReadinessPillar {
  let score = 40; // baseline

  const network = inputs.networkStrengthSelfReport ?? 'unknown';
  if (network === 'strong') score += 30;
  else if (network === 'moderate') score += 15;
  else if (network === 'weak') score -= 10;

  // Longer tenure at one company = potentially narrower network outside it
  if (inputs.tenureYears > 7) score -= 12;

  // Senior experience = broader network across career
  if (inputs.experience === '10+') score += 15;
  else if (inputs.experience === '0-2') score -= 12;

  // Top performers typically have higher visibility and inbound recruitment
  if (inputs.performanceTier === 'top') score += 10;

  // AI skills = active in high-demand community
  if (inputs.hasAiSkills) score += 8;

  score = Math.min(100, Math.max(0, score));

  return {
    id: 'network',
    name: 'Network Activation',
    score,
    weight: 0.25,
    status: pillarStatus(score),
    gap: score < 50
      ? 'Network likely dormant — warm contacts not recently engaged'
      : 'Network exists but needs proactive reactivation for job search',
    topAction: 'Send 5 personal catch-up messages to former colleagues and managers this week — not asking for jobs, just reconnecting. Referrals account for 40%+ of successful hires; building this channel now is essential.',
    timeToFix: '1–2 weeks',
  };
}

// ── Pillar 4: Financial Stability ──────────────────────────────────────────────

function scoreFinancialStability(inputs: CareerConfidenceInputs): ReadinessPillar {
  const runway = inputs.financialRunwayMonths;

  let score: number;
  if (runway >= 12) score = 92;
  else if (runway >= 9) score = 80;
  else if (runway >= 6) score = 65;
  else if (runway >= 3) score = 42;
  else if (runway >= 1) score = 22;
  else score = 35; // 0 = not provided; assume median

  return {
    id: 'financial',
    name: 'Financial Stability',
    score,
    weight: 0.20,
    status: pillarStatus(score),
    gap: runway < 6
      ? 'Under 6 months runway creates financial pressure that forces hasty decisions in job negotiations'
      : runway < 9
        ? 'Adequate but tight runway — aim for 9+ months before any voluntary exit'
        : 'Strong financial buffer enables patient, selective job search',
    topAction: runway < 6
      ? 'Immediately: reduce 3 largest discretionary expenses and calculate exact monthly burn. Target 2–3 additional months of runway through expense reduction alone.'
      : 'Identify the minimum monthly income that maintains your lifestyle — this is your floor for any negotiation.',
    timeToFix: runway >= 6 ? 'No immediate action needed' : '30–60 days to improve through expense reduction',
  };
}

// ── Pillar 5: Skill Confidence ─────────────────────────────────────────────────

function scoreSkillConfidence(inputs: CareerConfidenceInputs): ReadinessPillar {
  let score = 55; // baseline

  if (inputs.hasAiSkills) score += 20;
  if (inputs.uniquenessDepth === 'critical_knowledge') score += 15;
  else if (inputs.uniquenessDepth === 'functional_specialist') score += 8;
  else if (inputs.uniquenessDepth === 'generic') score -= 12;

  if (inputs.performanceTier === 'top') score += 10;
  if (inputs.performanceTier === 'below') score -= 18;

  // Experience level
  if (inputs.experience === '10+') score += 5;
  if (inputs.experience === '0-2') score -= 8;

  // Job market liquidity as a proxy for skill demand
  const liquidity = inputs.jobMarketLiquidityScore ?? 50;
  if (liquidity >= 70) score += 8;
  else if (liquidity <= 30) score -= 12;

  score = Math.min(100, Math.max(0, score));

  return {
    id: 'skill',
    name: 'Skill Confidence',
    score,
    weight: 0.15,
    status: pillarStatus(score),
    gap: score < 50
      ? 'Skills may be perceived as generic or not differentiated in the current market'
      : inputs.hasAiSkills
        ? 'AI skills create differentiation — focus on portfolio evidence of these skills'
        : 'Add one AI-adjacent skill to demonstrate market-awareness and future-readiness',
    topAction: inputs.hasAiSkills
      ? 'Build one visible portfolio artifact (GitHub project, case study, or published analysis) that demonstrates your AI skills in your specific domain. This transforms skill claims into evidence.'
      : 'Invest 8 hours/week into one high-demand AI tool in your domain (Cursor, Claude API, Copilot, LangChain) and build one small project with it within 30 days.',
    timeToFix: inputs.hasAiSkills ? '1–2 weeks (portfolio build)' : '4–6 weeks (skill development)',
  };
}

// ── Composite computation ──────────────────────────────────────────────────────

function computeConfidenceTier(score: number): ConfidenceTier {
  if (score >= 75) return 'READY';
  if (score >= 60) return 'MOSTLY_READY';
  if (score >= 45) return 'PREPARING';
  if (score >= 30) return 'UNREADY';
  return 'VULNERABLE';
}

function buildReadinessHeadline(tier: ConfidenceTier, score: number): string {
  const headlines: Record<ConfidenceTier, string> = {
    READY: `High readiness (${score}/100) — you can begin an effective job search immediately if needed`,
    MOSTLY_READY: `Good readiness (${score}/100) — 1–2 specific gaps to close before a job search would be highly effective`,
    PREPARING: `Moderate readiness (${score}/100) — 2–4 weeks of targeted preparation will substantially improve your search outcomes`,
    UNREADY: `Low readiness (${score}/100) — multiple gaps create vulnerabilities; prioritize the critical pillar immediately`,
    VULNERABLE: `Critically low readiness (${score}/100) — your risk exposure exceeds your current preparation level; emergency prep needed`,
  };
  return headlines[tier];
}

function buildRiskConfidenceInterpretation(score: number, riskScore: number, tier: ConfidenceTier): string {
  const riskLabel = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 40 ? 'ELEVATED' : 'MODERATE';

  if (riskScore >= 70 && score < 45) {
    return `Your situation is ${riskLabel} risk + LOW readiness — this is the most vulnerable combination. The risk engine suggests a potential announcement within months, but your preparation level means you would enter a job search at a disadvantage. Address the critical pillar gap first.`;
  }
  if (riskScore >= 70 && score >= 70) {
    return `Your situation shows ${riskLabel} risk but HIGH readiness — this is actually a position of strength. You have the preparation to respond effectively if an announcement occurs. Use this window to accelerate your preparation to READY status.`;
  }
  if (riskScore < 50 && score >= 70) {
    return `Low risk + high readiness: you are in an excellent career position. Consider whether there are growth opportunities you should proactively pursue before conditions change.`;
  }
  return `${riskLabel} risk level combined with ${tier.replace('_', ' ')} readiness (${score}/100) suggests moderately urgent preparation. Focus on the weakest pillar to materially improve your position within 2 weeks.`;
}

function estimateDaysToReady(pillars: ReadinessPillar[]): number {
  const weakPillars = pillars.filter(p => p.status === 'WEAK' || p.status === 'CRITICAL');
  if (weakPillars.length === 0) return 7;
  if (weakPillars.length === 1) return 14;
  if (weakPillars.length === 2) return 21;
  return 35;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeCareerConfidence(inputs: CareerConfidenceInputs): CareerConfidenceResult {
  const pillars: ReadinessPillar[] = [
    scoreMaterialReadiness(inputs),
    scoreMarketIntelligence(inputs),
    scoreNetworkActivation(inputs),
    scoreFinancialStability(inputs),
    scoreSkillConfidence(inputs),
  ];

  const compositeScore = Math.round(
    pillars.reduce((sum, p) => sum + p.score * p.weight, 0)
  );

  const confidenceTier = computeConfidenceTier(compositeScore);
  const criticalGap = [...pillars].sort((a, b) => a.score - b.score)[0];
  const keyStrength = [...pillars].sort((a, b) => b.score - a.score)[0];

  const improvementPriority = pillars
    .filter(p => p.status === 'WEAK' || p.status === 'CRITICAL' || p.status === 'ADEQUATE')
    .sort((a, b) => {
      const urgency = (a.score * a.weight) - (b.score * b.weight);
      return urgency;
    })
    .slice(0, 3)
    .map(p => p.topAction);

  return {
    compositeScore,
    confidenceTier,
    pillars,
    criticalGap: criticalGap.status === 'STRONG' ? null : criticalGap,
    keyStrength: keyStrength.status === 'CRITICAL' ? null : keyStrength,
    readinessHeadline: buildReadinessHeadline(confidenceTier, compositeScore),
    improvementPriority,
    estimatedReadyInDays: estimateDaysToReady(pillars),
    riskConfidenceInterpretation: buildRiskConfidenceInterpretation(compositeScore, inputs.currentScore, confidenceTier),
    calibrationStatus: 'heuristic_v13',
  };
}
