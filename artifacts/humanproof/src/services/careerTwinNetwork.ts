// careerTwinNetwork.ts
// Career Twin Network — stores transitions + Euclidean distance matching.
// Spec: distance = sqrt( (role_similarity*0.35)^2 + (experience_delta*0.25)^2 +
//                        (risk_score_delta*0.20)^2 + (geography_match*0.20)^2 )

export interface CareerTransition {
  id: string;
  fromRole: string;
  fromIndustry: string;
  fromRiskScore: number;       // 0-100
  fromExperienceYears: number;
  fromCountry: string;
  toRole: string;
  toIndustry: string;
  incomeChangePct: number | null;  // % change (positive = increase)
  monthsToTransition: number;
  whatWorked: string;          // brief description
  addedAt: string;
  isVerified: boolean;         // user-confirmed post-transition
}

export interface CareerTwinMatch {
  twin: CareerTransition;
  distanceScore: number;       // 0 = perfect match, higher = less similar
  similarityPct: number;       // 0-100 (inverted distance, for display)
  matchReasons: string[];
  /** True when the twin is from a different labour-market region than the user.
   *  The UI should flag this so users know advice may not transfer directly. */
  isDifferentMarket: boolean;
  /** True when no same-region twin clears the quality threshold and this result
   *  is the best available across all markets. */
  isGeographicFallback: boolean;
}

const STORAGE_KEY = 'hp_career_twin_db';
const SUPABASE_TABLE = 'career_transitions';

// ── Seed data — real-world-inspired transitions for cold start ────────────────

const SEED_TRANSITIONS: CareerTransition[] = [
  {
    id: 'seed-001',
    fromRole: 'QA Engineer',
    fromIndustry: 'IT Services',
    fromRiskScore: 74,
    fromExperienceYears: 7,
    fromCountry: 'India',
    toRole: 'AI Quality Strategist',
    toIndustry: 'Product',
    incomeChangePct: 80,
    monthsToTransition: 4,
    whatWorked: 'Built prompt evaluation frameworks, got certified in LLM testing, joined AI-first startup',
    addedAt: '2025-11-15',
    isVerified: true,
  },
  {
    id: 'seed-002',
    fromRole: 'Business Analyst',
    fromIndustry: 'Banking',
    fromRiskScore: 68,
    fromExperienceYears: 5,
    fromCountry: 'India',
    toRole: 'Product Manager',
    toIndustry: 'Fintech',
    incomeChangePct: 45,
    monthsToTransition: 6,
    whatWorked: 'Built 2 side projects demonstrating PM skills, got referral from LinkedIn connection',
    addedAt: '2025-09-20',
    isVerified: true,
  },
  {
    id: 'seed-003',
    fromRole: 'Data Analyst',
    fromIndustry: 'E-commerce',
    fromRiskScore: 62,
    fromExperienceYears: 4,
    fromCountry: 'India',
    toRole: 'Data Scientist',
    toIndustry: 'AI/ML',
    incomeChangePct: 55,
    monthsToTransition: 8,
    whatWorked: 'Completed fast.ai course, contributed to open-source ML project, got into an AI startup',
    addedAt: '2025-08-10',
    isVerified: true,
  },
  {
    id: 'seed-004',
    fromRole: 'Content Writer',
    fromIndustry: 'Media',
    fromRiskScore: 78,
    fromExperienceYears: 3,
    fromCountry: 'India',
    toRole: 'AI Content Strategist',
    toIndustry: 'SaaS',
    incomeChangePct: 70,
    monthsToTransition: 3,
    whatWorked: 'Learned to use Claude + Midjourney for content pipelines, showcased AI-augmented portfolio',
    addedAt: '2026-01-05',
    isVerified: true,
  },
  {
    id: 'seed-005',
    fromRole: 'Recruiter',
    fromIndustry: 'IT Services',
    fromRiskScore: 72,
    fromExperienceYears: 6,
    fromCountry: 'India',
    toRole: 'People Analytics Manager',
    toIndustry: 'HR Tech',
    incomeChangePct: 35,
    monthsToTransition: 9,
    whatWorked: 'Self-taught SQL and Tableau, built attrition prediction model using company data',
    addedAt: '2025-10-18',
    isVerified: true,
  },
  {
    id: 'seed-006',
    fromRole: 'Software Engineer',
    fromIndustry: 'IT Services',
    fromRiskScore: 45,
    fromExperienceYears: 8,
    fromCountry: 'India',
    toRole: 'AI Engineer',
    toIndustry: 'AI/ML',
    incomeChangePct: 90,
    monthsToTransition: 5,
    whatWorked: 'Fine-tuned open-source LLMs, built RAG system on GitHub, got referral from ex-colleague',
    addedAt: '2026-02-12',
    isVerified: true,
  },
  {
    id: 'seed-007',
    fromRole: 'Marketing Coordinator',
    fromIndustry: 'Retail',
    fromRiskScore: 71,
    fromExperienceYears: 3,
    fromCountry: 'India',
    toRole: 'Growth Manager',
    toIndustry: 'D2C',
    incomeChangePct: 40,
    monthsToTransition: 7,
    whatWorked: 'Ran performance marketing experiments on own budget (₹5K), documented results in case study',
    addedAt: '2025-12-03',
    isVerified: true,
  },
  // ── Global / US / EU transitions ──────────────────────────────────────────
  {
    id: 'seed-g001',
    fromRole: 'Financial Analyst',
    fromIndustry: 'Banking',
    fromRiskScore: 73,
    fromExperienceYears: 6,
    fromCountry: 'USA',
    toRole: 'AI Finance Strategist',
    toIndustry: 'FinTech',
    incomeChangePct: 42,
    monthsToTransition: 6,
    whatWorked: 'Built Python-based forecasting models, earned CFA Level II, pivoted to a FinTech startup using AI for financial modeling',
    addedAt: '2026-01-10',
    isVerified: true,
  },
  {
    id: 'seed-g002',
    fromRole: 'Legal Associate',
    fromIndustry: 'Law',
    fromRiskScore: 65,
    fromExperienceYears: 5,
    fromCountry: 'UK',
    toRole: 'Legal Tech Consultant',
    toIndustry: 'LegalTech',
    incomeChangePct: 55,
    monthsToTransition: 8,
    whatWorked: 'Trained on contract AI platforms (Harvey, Lexis+), built automation demos, joined a legal AI startup',
    addedAt: '2026-02-20',
    isVerified: true,
  },
  {
    id: 'seed-g003',
    fromRole: 'Data Entry Specialist',
    fromIndustry: 'BPO',
    fromRiskScore: 91,
    fromExperienceYears: 4,
    fromCountry: 'Philippines',
    toRole: 'AI Workflow Auditor',
    toIndustry: 'Operations',
    incomeChangePct: 65,
    monthsToTransition: 5,
    whatWorked: 'Certified in RPA (UiPath), documented 40+ manual process flows and built automation case studies, got hired to validate AI outputs',
    addedAt: '2026-03-01',
    isVerified: true,
  },
  {
    id: 'seed-g004',
    fromRole: 'Journalist',
    fromIndustry: 'Media',
    fromRiskScore: 76,
    fromExperienceYears: 8,
    fromCountry: 'USA',
    toRole: 'AI Content Director',
    toIndustry: 'Media / SaaS',
    incomeChangePct: 60,
    monthsToTransition: 7,
    whatWorked: 'Built and monetized a newsletter using AI tools, demonstrated 300% productivity gain, recruited by a SaaS company as editorial AI lead',
    addedAt: '2026-01-25',
    isVerified: true,
  },
  {
    id: 'seed-g005',
    fromRole: 'HR Generalist',
    fromIndustry: 'Manufacturing',
    fromRiskScore: 69,
    fromExperienceYears: 7,
    fromCountry: 'Germany',
    toRole: 'People Analytics Lead',
    toIndustry: 'Consulting',
    incomeChangePct: 38,
    monthsToTransition: 10,
    whatWorked: 'Completed Google Data Analytics cert, built attrition prediction model for current employer, showcased ROI to secure internal promotion then external offer',
    addedAt: '2025-11-30',
    isVerified: true,
  },
  {
    id: 'seed-g006',
    fromRole: 'Software Developer',
    fromIndustry: 'IT Services',
    fromRiskScore: 48,
    fromExperienceYears: 9,
    fromCountry: 'USA',
    toRole: 'AI Platform Architect',
    toIndustry: 'Enterprise AI',
    incomeChangePct: 95,
    monthsToTransition: 4,
    whatWorked: 'Built production RAG system on top of company\'s internal knowledge base, presented at internal AI showcase, got poached by AWS AI team',
    addedAt: '2026-03-10',
    isVerified: true,
  },
  {
    id: 'seed-g007',
    fromRole: 'Accountant',
    fromIndustry: 'Finance',
    fromRiskScore: 82,
    fromExperienceYears: 10,
    fromCountry: 'Australia',
    toRole: 'Finance Transformation Lead',
    toIndustry: 'Consulting',
    incomeChangePct: 50,
    monthsToTransition: 12,
    whatWorked: 'Specialized in AI-powered accounting tools (Intuit, Dext), led ERP automation project, transitioned to advisory role for SMBs doing finance digitization',
    addedAt: '2025-09-15',
    isVerified: true,
  },
  {
    id: 'seed-g008',
    fromRole: 'Customer Support Specialist',
    fromIndustry: 'E-commerce',
    fromRiskScore: 84,
    fromExperienceYears: 3,
    fromCountry: 'global',
    toRole: 'CX Automation Manager',
    toIndustry: 'SaaS',
    incomeChangePct: 72,
    monthsToTransition: 5,
    whatWorked: 'Became expert user of Intercom AI and Zendesk AI, built routing and escalation workflows, moved to a B2B SaaS company to implement similar systems',
    addedAt: '2026-02-08',
    isVerified: true,
  },
];

// ── Role similarity matrix (0-1, higher = more similar) ──────────────────────

const ROLE_GROUPS: Record<string, string[]> = {
  engineering:   ['software engineer', 'frontend', 'backend', 'full stack', 'developer', 'sde'],
  ai_ml:         ['ai engineer', 'ml engineer', 'data scientist', 'ai researcher', 'llm', 'prompt'],
  data:          ['data analyst', 'business analyst', 'data engineer', 'bi analyst'],
  qa:            ['qa engineer', 'quality assurance', 'test engineer', 'sdet'],
  product:       ['product manager', 'program manager', 'product owner', 'cpo'],
  design:        ['ux designer', 'ui designer', 'product designer', 'design lead'],
  content:       ['content writer', 'copywriter', 'technical writer', 'content strategist'],
  marketing:     ['marketing manager', 'growth manager', 'marketing coordinator', 'seo', 'performance'],
  hr:            ['recruiter', 'hr business partner', 'talent acquisition', 'people ops', 'people analytics'],
  finance:       ['financial analyst', 'accountant', 'finance manager', 'bookkeeper', 'cfo'],
  leadership:    ['manager', 'director', 'vp', 'head of', 'cto', 'ceo', 'executive'],
  ops:           ['operations manager', 'supply chain', 'project manager', 'program manager'],
};

function getRoleGroup(role: string): string {
  const lower = role.toLowerCase();
  for (const [group, keywords] of Object.entries(ROLE_GROUPS)) {
    if (keywords.some(kw => lower.includes(kw))) return group;
  }
  return 'other';
}

function roleSimilarity(roleA: string, roleB: string): number {
  if (roleA.toLowerCase() === roleB.toLowerCase()) return 1.0;
  const gA = getRoleGroup(roleA);
  const gB = getRoleGroup(roleB);
  if (gA === gB && gA !== 'other') return 0.7;
  // Adjacent groups (e.g. data → ai_ml)
  const adjacent: Record<string, string[]> = {
    data: ['ai_ml', 'engineering'],
    qa: ['engineering', 'ai_ml'],
    content: ['marketing'],
    hr: ['ops', 'leadership'],
    finance: ['data', 'ops'],
  };
  if (adjacent[gA]?.includes(gB) || adjacent[gB]?.includes(gA)) return 0.4;
  return 0.1;
}

// ── Soft geographic market similarity ────────────────────────────────────────
//
// geoMismatch values (used as the raw geo term before weighting):
//   0.0  — exact country match OR 'global' twin (market-agnostic advice)
//   0.4  — same labour-market region (e.g. India/Singapore — similar hiring
//           dynamics, adjacent salary bands, comparable tech ecosystem)
//   1.0  — different region (e.g. India/Germany — structurally different labour
//           markets; advice like "attend Berlin meetups" does not transfer)
//
// Regions are based on labour-market comparability, not geography.
// APAC_DEV: developing-market tech hubs with similar talent supply/demand dynamics.
// APAC_ADV: advanced APAC economies (AU/NZ/JP/KR) — higher salary bands.
// NA / WEST_EU / LATAM / MENA: self-explanatory regional clusters.
const GEO_REGION: Record<string, string> = {
  'india': 'apac_dev',    'singapore': 'apac_dev',  'philippines': 'apac_dev',
  'indonesia': 'apac_dev','malaysia': 'apac_dev',   'vietnam': 'apac_dev',
  'bangladesh': 'apac_dev','sri lanka': 'apac_dev', 'pakistan': 'apac_dev',
  'usa': 'na',            'canada': 'na',
  'uk': 'west_eu',        'germany': 'west_eu',     'france': 'west_eu',
  'netherlands': 'west_eu','sweden': 'west_eu',      'ireland': 'west_eu',
  'australia': 'apac_adv','new zealand': 'apac_adv','japan': 'apac_adv',
  'south korea': 'apac_adv',
  'brazil': 'latam',      'mexico': 'latam',        'argentina': 'latam',
  'colombia': 'latam',    'chile': 'latam',
  'uae': 'mena',          'saudi arabia': 'mena',   'egypt': 'mena',
  'nigeria': 'africa',    'kenya': 'africa',        'south africa': 'africa',
  'global': 'global',  // intentionally market-agnostic — zero penalty
};

function geoMismatch(userCountry: string, twinCountry: string): number {
  const u = userCountry.toLowerCase().trim();
  const t = twinCountry.toLowerCase().trim();
  if (u === t) return 0.0;
  if (t === 'global') return 0.0;   // global twins are universally applicable
  if (u === 'global') return 0.0;   // user with global context — no geo preference
  const rU = GEO_REGION[u];
  const rT = GEO_REGION[t];
  if (!rU || !rT) return 1.0;       // unknown country → treat as full mismatch
  if (rU === rT) return 0.4;        // same labour-market region — partial credit
  return 1.0;                       // different region — full mismatch
}

// ── Euclidean distance (spec-aligned) ────────────────────────────────────────

function computeDistance(
  userRole: string, userExp: number, userRisk: number, userCountry: string,
  twin: CareerTransition,
): number {
  const roleSim = roleSimilarity(userRole, twin.fromRole);
  const roleComponent = (1 - roleSim) * 0.35;

  const expDelta = Math.min(1, Math.abs(userExp - twin.fromExperienceYears) / 10);
  const expComponent = expDelta * 0.25;

  const riskDelta = Math.abs(userRisk - twin.fromRiskScore) / 100;
  const riskComponent = riskDelta * 0.20;

  const geoComponent = geoMismatch(userCountry, twin.fromCountry) * 0.20;

  return Math.sqrt(
    roleComponent ** 2 +
    expComponent ** 2 +
    riskComponent ** 2 +
    geoComponent ** 2,
  );
}

// Maximum distance a twin may have to be included in results.
// distance > MAX_MATCH_DISTANCE → similarity < ~29% → results are too dissimilar
// to be actionable. If no twin clears this bar, the best available is returned
// with isGeographicFallback = true so the UI can communicate the limitation.
const MAX_MATCH_DISTANCE = 0.72;

// ── Storage: localStorage + optional Supabase sync ───────────────────────────

function loadLocalDB(): CareerTransition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const local: CareerTransition[] = raw ? JSON.parse(raw) : [];
    // Merge with seeds (seeds are overridden if same id exists in local)
    const localIds = new Set(local.map(t => t.id));
    const seeds = SEED_TRANSITIONS.filter(s => !localIds.has(s.id));
    return [...seeds, ...local];
  } catch {
    return SEED_TRANSITIONS;
  }
}

export function addTransition(transition: Omit<CareerTransition, 'id' | 'addedAt' | 'isVerified'>): CareerTransition {
  const record: CareerTransition = {
    ...transition,
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString(),
    isVerified: false,
  };

  const all = loadLocalDB();
  all.push(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(t => !t.id.startsWith('seed-'))));
  } catch { /* quota */ }

  window.dispatchEvent(new CustomEvent('twin-network-updated', { detail: record }));
  return record;
}

// ── Matching ──────────────────────────────────────────────────────────────────

export function findCareerTwins(
  userRole: string,
  userExperience: number,
  userRiskScore: number,
  userCountry: string,
  topN = 5,
): CareerTwinMatch[] {
  const db = loadLocalDB();
  const userRegion = GEO_REGION[userCountry.toLowerCase().trim()] ?? null;

  const scored = db.map(twin => {
    const dist = computeDistance(userRole, userExperience, userRiskScore, userCountry, twin);
    const similarityPct = Math.round(Math.max(0, (1 - dist) * 100));
    const mismatch = geoMismatch(userCountry, twin.fromCountry);
    const twinRegion = GEO_REGION[twin.fromCountry.toLowerCase().trim()] ?? null;
    const isDifferentMarket = mismatch > 0 && twin.fromCountry.toLowerCase() !== 'global';

    const reasons: string[] = [];
    if (roleSimilarity(userRole, twin.fromRole) > 0.6) reasons.push(`Similar role: ${twin.fromRole}`);
    if (Math.abs(userExperience - twin.fromExperienceYears) <= 2) reasons.push(`Similar experience (${twin.fromExperienceYears} yrs)`);
    if (Math.abs(userRiskScore - twin.fromRiskScore) <= 15) reasons.push(`Similar risk score (${twin.fromRiskScore}%)`);
    if (!isDifferentMarket) reasons.push(`Same market: ${twin.fromCountry}`);
    else if (userRegion && twinRegion && userRegion === twinRegion) reasons.push(`Similar region (${twin.fromCountry})`);

    return {
      twin,
      distanceScore: dist,
      similarityPct,
      matchReasons: reasons,
      isDifferentMarket,
      isGeographicFallback: false, // set below after threshold check
    };
  });

  scored.sort((a, b) => a.distanceScore - b.distanceScore);

  // Apply quality threshold — only include twins within MAX_MATCH_DISTANCE.
  // If the filtered set is large enough, use it; otherwise fall back to top-N
  // across all matches but flag them as geographic fallbacks.
  const withinThreshold = scored.filter(s => s.distanceScore <= MAX_MATCH_DISTANCE);
  const useAll = withinThreshold.length < Math.ceil(topN / 2);

  const candidates = useAll ? scored : withinThreshold;
  const results = candidates.slice(0, topN);

  if (useAll) {
    results.forEach(r => { r.isGeographicFallback = true; });
  }

  return results;
}

export function getTransitionStats(): {
  totalTransitions: number;
  avgIncomeChange: number;
  avgMonthsToTransition: number;
  topDestinationRoles: string[];
} {
  const db = loadLocalDB();
  const verified = db.filter(t => t.isVerified);

  const incomeChanges = verified.filter(t => t.incomeChangePct !== null).map(t => t.incomeChangePct!);
  const avgIncome = incomeChanges.length
    ? Math.round(incomeChanges.reduce((a, b) => a + b, 0) / incomeChanges.length)
    : 0;

  const avgMonths = verified.length
    ? Math.round(verified.reduce((a, t) => a + t.monthsToTransition, 0) / verified.length)
    : 0;

  const roleCounts: Record<string, number> = {};
  verified.forEach(t => { roleCounts[t.toRole] = (roleCounts[t.toRole] ?? 0) + 1; });
  const topRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([role]) => role);

  return {
    totalTransitions: db.length,
    avgIncomeChange: avgIncome,
    avgMonthsToTransition: avgMonths,
    topDestinationRoles: topRoles,
  };
}
