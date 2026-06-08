// countryIntelligence.ts — Country-specific AI market context
// Provides narrative differentiation by market — not just a D5 score modifier.

export interface CountryIntelligence {
  countryKey: string;
  displayName: string;
  hiringDemandLabel: 'Surging' | 'Growing' | 'Stable' | 'Contracting';
  hiringDemandColor: string;
  salaryContext: string;
  aiAdoptionSpeed: 'Leading' | 'Catching Up' | 'Lagging';
  aiAdoptionColor: string;
  offshoringPressure: 'High' | 'Moderate' | 'Low';
  offshoringColor: string;
  localOpportunity: string;
  riskAdjustment: string;
  regulatoryContext: string;
}

const INTELLIGENCE_MAP: Record<string, CountryIntelligence> = {
  usa: {
    countryKey: 'usa',
    displayName: 'United States',
    hiringDemandLabel: 'Surging',
    hiringDemandColor: '#10b981',
    salaryContext: 'US salaries are the global benchmark — but AI premium roles (AI engineer, ML lead) are commanding 30–50% above traditional equivalents',
    aiAdoptionSpeed: 'Leading',
    aiAdoptionColor: '#ef4444',
    offshoringPressure: 'Moderate',
    offshoringColor: '#f59e0b',
    localOpportunity: 'The US market is absorbing AI-native talent faster than it\'s displacing traditional roles — net positive for adaptable professionals through 2028',
    riskAdjustment: 'Leading AI adoption increases near-term displacement pressure but also creates the largest market for AI-augmented professionals',
    regulatoryContext: 'Light-touch regulation — executive orders guide AI use but companies face minimal compliance barriers to automation deployment',
  },

  india: {
    countryKey: 'india',
    displayName: 'India',
    hiringDemandLabel: 'Growing',
    hiringDemandColor: '#10b981',
    salaryContext: 'India salaries are 35–55% of US equivalents in nominal terms — PPP-adjusted gap is smaller, but global AI benchmarking affects demand for higher-value roles',
    aiAdoptionSpeed: 'Catching Up',
    aiAdoptionColor: '#f59e0b',
    offshoringPressure: 'High',
    offshoringColor: '#ef4444',
    localOpportunity: 'India\'s IT and BPO sectors are reorienting toward AI-augmented service delivery — professionals who upskill to AI-native workflows are capturing the new demand tier',
    riskAdjustment: 'India faces elevated offshoring pressure as AI enables smaller teams to deliver the same BPO/IT output — but domestic startup and enterprise AI adoption is creating new demand',
    regulatoryContext: 'India has announced AI regulatory frameworks but implementation is nascent — companies face minimal compliance barriers to automation in practice',
  },

  uk: {
    countryKey: 'uk',
    displayName: 'United Kingdom',
    hiringDemandLabel: 'Growing',
    hiringDemandColor: '#10b981',
    salaryContext: 'UK salaries are 75–90% of US equivalents — London premium applies for financial and tech roles, with significant regional variation',
    aiAdoptionSpeed: 'Leading',
    aiAdoptionColor: '#ef4444',
    offshoringPressure: 'Moderate',
    offshoringColor: '#f59e0b',
    localOpportunity: 'London fintech and UK creative sectors are generating strong demand for AI-augmented professionals — particularly in compliance-adjacent AI governance roles',
    riskAdjustment: 'Post-Brexit regulatory environment has created distinct UK compliance requirements, slightly buffering against full globalized automation deployment',
    regulatoryContext: 'UK AI Safety Institute is active — pro-innovation regulation with emerging guardrails for high-stakes AI deployment; financial services AI oversight is stricter',
  },

  canada: {
    countryKey: 'canada',
    displayName: 'Canada',
    hiringDemandLabel: 'Growing',
    hiringDemandColor: '#10b981',
    salaryContext: 'Canadian salaries are 80–90% of US equivalents (CAD-to-USD adjusted) — strong demand for AI talent competing against US market gravity',
    aiAdoptionSpeed: 'Leading',
    aiAdoptionColor: '#ef4444',
    offshoringPressure: 'Low',
    offshoringColor: '#10b981',
    localOpportunity: 'Canada is a net importer of AI talent due to immigration-friendly policies — local professionals benefit from both domestic demand and US spillover hiring',
    riskAdjustment: 'Strong immigration pipeline and proximity to US market creates talent competition but also demand continuity — AI disruption risk is lower than US due to smaller automation scale',
    regulatoryContext: 'Canada\'s Artificial Intelligence and Data Act (AIDA) is in progress — active regulatory development with particular focus on high-impact AI systems',
  },

  australia: {
    countryKey: 'australia',
    displayName: 'Australia',
    hiringDemandLabel: 'Stable',
    hiringDemandColor: '#64748b',
    salaryContext: 'Australian salaries are strong in absolute terms (AUD) but global comparison depends on exchange rates — mining, healthcare, and tech sectors command premiums',
    aiAdoptionSpeed: 'Catching Up',
    aiAdoptionColor: '#f59e0b',
    offshoringPressure: 'Moderate',
    offshoringColor: '#f59e0b',
    localOpportunity: 'Australia\'s geographic isolation creates natural demand for local professionals in regulated industries — healthcare, government, and finance face lower offshoring pressure',
    riskAdjustment: 'Slower AI adoption than US/UK gives Australian professionals a longer transition window — but the gap is narrowing rapidly in tech-forward sectors',
    regulatoryContext: 'Australia is developing AI guardrails through the DISR framework — relatively permissive environment with growing focus on responsible AI guidelines',
  },

  germany: {
    countryKey: 'germany',
    displayName: 'Germany',
    hiringDemandLabel: 'Stable',
    hiringDemandColor: '#64748b',
    salaryContext: 'German salaries are competitive in EU context — engineering and manufacturing sectors command European premiums, particularly for specialized technical roles',
    aiAdoptionSpeed: 'Catching Up',
    aiAdoptionColor: '#f59e0b',
    offshoringPressure: 'Low',
    offshoringColor: '#10b981',
    localOpportunity: 'Germany\'s industrial and engineering base is creating strong demand for AI-augmented manufacturing and automation experts — Industrie 4.0 is accelerating',
    riskAdjustment: 'Germany\'s strong labor protections and works council system slows automation deployment — professionals have longer transition windows than US/UK peers',
    regulatoryContext: 'Germany operates under EU AI Act as of 2024 — strictest global AI regulation creates compliance complexity but also buffers against rapid unregulated automation',
  },

  singapore: {
    countryKey: 'singapore',
    displayName: 'Singapore',
    hiringDemandLabel: 'Surging',
    hiringDemandColor: '#10b981',
    salaryContext: 'Singapore salaries are among Asia\'s highest — strong demand for regional HQ roles and AI talent as companies establish APAC AI centers',
    aiAdoptionSpeed: 'Leading',
    aiAdoptionColor: '#ef4444',
    offshoringPressure: 'Low',
    offshoringColor: '#10b981',
    localOpportunity: 'Singapore is positioning as APAC\'s AI governance and deployment hub — regulatory clarity and government AI investment are creating sustained high-skill demand',
    riskAdjustment: 'Singapore\'s regional hub status means AI displacement is partially offset by new AI-governance and coordination roles — net effect is more positive than most markets',
    regulatoryContext: 'Singapore\'s Model AI Governance Framework is among the most mature globally — clear guidelines with active government AI investment create a favorable operating environment',
  },

  uae: {
    countryKey: 'uae',
    displayName: 'UAE',
    hiringDemandLabel: 'Surging',
    hiringDemandColor: '#10b981',
    salaryContext: 'UAE salaries are tax-free and competitive globally — significant premium for AI and tech talent as government AI strategy accelerates investment',
    aiAdoptionSpeed: 'Leading',
    aiAdoptionColor: '#ef4444',
    offshoringPressure: 'Low',
    offshoringColor: '#10b981',
    localOpportunity: 'UAE\'s National AI Strategy 2031 is driving active government and enterprise AI investment — strong net positive demand for AI-augmented professionals across sectors',
    riskAdjustment: 'UAE\'s aggressive AI adoption creates near-term pressure on routine roles but generates significant demand for AI-native talent across government and enterprise',
    regulatoryContext: 'UAE is actively promoting AI deployment with minimal regulatory friction — the government leads by example with AI integration in public services',
  },
};

// Fallback for countries not in the map
const DEFAULT_INTELLIGENCE: Omit<CountryIntelligence, 'countryKey' | 'displayName'> = {
  hiringDemandLabel: 'Stable',
  hiringDemandColor: '#64748b',
  salaryContext: 'Local market salaries vary — compare against global benchmarks for your role category using PPP-adjusted figures for a fair assessment',
  aiAdoptionSpeed: 'Catching Up',
  aiAdoptionColor: '#f59e0b',
  offshoringPressure: 'Moderate',
  offshoringColor: '#f59e0b',
  localOpportunity: 'AI adoption in your market is progressing — professionals who build AI-augmented skill sets are positioning ahead of local hiring shifts',
  riskAdjustment: 'Your country\'s AI adoption speed and labor market dynamics are factored into your D5 Country Exposure score',
  regulatoryContext: 'Local AI regulation is evolving — monitor regional policy developments that may affect automation deployment in your sector',
};

export function getCountryIntelligence(countryKey: string): CountryIntelligence {
  const normalized = countryKey.toLowerCase().replace(/[^a-z]/g, '');
  return INTELLIGENCE_MAP[normalized] ?? {
    countryKey: normalized,
    displayName: countryKey,
    ...DEFAULT_INTELLIGENCE,
  };
}

export function getAdoptionSpeedDescription(speed: CountryIntelligence['aiAdoptionSpeed']): string {
  switch (speed) {
    case 'Leading':      return 'Your market is at the leading edge of AI deployment — adoption is 12–18 months ahead of global average';
    case 'Catching Up':  return 'Your market is catching up to leading economies — AI deployment is accelerating but 12–24 months behind front-runners';
    case 'Lagging':      return 'Your market has slower AI adoption — this provides a transition buffer but should not be treated as permanent protection';
  }
}
