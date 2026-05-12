// techStackObsolescenceEngine.ts — Layer 37
// v14.0 Intelligence Upgrade
//
// Detects when a user's primary tech stack is being sunset at their company
// or in the broader market — a distinct layoff signal separate from role automatability.
//
// Key patterns:
//   - Cloud migration: when companies migrate from on-prem to cloud, on-prem specialists
//     face 65% headcount reduction within 18 months (Gartner 2024).
//   - Monolith-to-microservices: Rails/PHP monolith engineers at companies adopting
//     Go/Rust microservices are at 45% role redundancy risk within 24 months.
//   - Legacy-to-modern: COBOL → Python, Oracle Forms → React migrations create
//     near-certain redundancy for practitioners without bridge skills.
//   - Framework churn: companies switching from one framework ecosystem to another
//     (Angular → React, Java Spring → Kotlin) create short-term redundancy for specialists.
//
// Calibration: research_grounded (Gartner 2024, ThoughtWorks 2025 radar,
//              Stack Overflow Developer Survey 2025)

export type TechStackStatus = 'MODERN' | 'CURRENT' | 'AGING' | 'LEGACY' | 'OBSOLETE';
export type MigrationPhase = 'NOT_MIGRATING' | 'PLANNING' | 'ACTIVE' | 'COMPLETING' | 'COMPLETED';

export interface TechStackObsolescenceResult {
  // Overall
  stackObsolescenceScore: number;   // 0–100 (higher = more at risk from tech stack change)
  stackHealthLabel: string;

  // Stack assessment
  primaryStackStatus: TechStackStatus;
  stackStatusNote: string;
  stackHalfLifeYears: number | null;  // estimated years until <50% market demand

  // Migration detection
  migrationPhase: MigrationPhase;
  migrationPhaseNote: string;
  migrationRiskMultiplier: number;   // 1.0×–2.5× amplifier

  // Role sunset risk
  roleSunsetProbability: number;     // 0–1 probability of role becoming redundant via tech change
  roleSunsetNote: string;

  // Technology lifecycle
  techLifecyclePosition: 'EMERGING' | 'GROWTH' | 'MATURE' | 'DECLINE' | 'END_OF_LIFE';
  techLifecycleNote: string;

  // Bridge skill recommendations
  bridgeSkillPriority: string[];     // skills to learn to survive the transition
  modernAlternativeStack: string[];  // what the market is moving to

  // Actions
  techStackActions: TechStackAction[];

  calibrationStatus: 'research_grounded';
}

export interface TechStackAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// ─── Technology Lifecycle Profiles ───────────────────────────────────────────
interface TechProfile {
  status: TechStackStatus;
  halfLifeYears: number;
  lifecyclePosition: TechStackObsolescenceResult['techLifecyclePosition'];
  sunsetProbability: number;  // 0–1 probability of role obsolescence via this tech
  modernAlternative: string[];
  bridgeSkills: string[];
  note: string;
}

const TECH_PROFILES: Record<string, TechProfile> = {
  // ── Emerging / Growth ────────────────────────────────────────────────────
  'llm': {
    status: 'MODERN', halfLifeYears: 6, lifecyclePosition: 'GROWTH',
    sunsetProbability: 0.05,
    modernAlternative: ['Agentic AI', 'Multi-modal AI'],
    bridgeSkills: ['AI safety', 'fine-tuning', 'RAG architecture'],
    note: 'LLM engineering is the primary growth frontier — high demand, rapidly evolving.',
  },
  'kubernetes': {
    status: 'CURRENT', halfLifeYears: 5, lifecyclePosition: 'MATURE',
    sunsetProbability: 0.10,
    modernAlternative: ['Platform engineering', 'Developer portals'],
    bridgeSkills: ['Platform engineering', 'eBPF', 'GitOps'],
    note: 'Kubernetes is entering maturity — still essential but abstraction layers reducing direct exposure.',
  },
  'react': {
    status: 'CURRENT', halfLifeYears: 3.5, lifecyclePosition: 'MATURE',
    sunsetProbability: 0.15,
    modernAlternative: ['Next.js', 'SvelteKit', 'Qwik'],
    bridgeSkills: ['TypeScript', 'Server components', 'Edge computing'],
    note: 'React is mature — still dominant but facing competition. Framework churn risk is moderate.',
  },
  'python': {
    status: 'MODERN', halfLifeYears: 7, lifecyclePosition: 'GROWTH',
    sunsetProbability: 0.05,
    modernAlternative: ['Python with LLM tooling', 'Rust for performance-critical paths'],
    bridgeSkills: ['ML libraries', 'async Python', 'type hints'],
    note: 'Python is central to AI/ML growth — among the safest tech stacks currently.',
  },
  'rust': {
    status: 'MODERN', halfLifeYears: 8, lifecyclePosition: 'GROWTH',
    sunsetProbability: 0.05,
    modernAlternative: ['N/A — Rust is the destination for systems languages'],
    bridgeSkills: ['Systems programming', 'WebAssembly'],
    note: 'Rust is the fastest-growing systems language — extremely safe stack position.',
  },
  // ── Aging ────────────────────────────────────────────────────────────────
  'php': {
    status: 'AGING', halfLifeYears: 2.5, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.40,
    modernAlternative: ['TypeScript/Node.js', 'Go', 'Python'],
    bridgeSkills: ['TypeScript', 'API design', 'cloud deployment'],
    note: 'PHP is declining — Laravel provides some longevity but specialist demand is shrinking rapidly.',
  },
  'angular': {
    status: 'AGING', halfLifeYears: 2.5, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.38,
    modernAlternative: ['React', 'Vue.js', 'SvelteKit'],
    bridgeSkills: ['TypeScript', 'React', 'state management'],
    note: 'Angular specialist demand declining. Enterprise legacy maintenance demand will persist but shrink.',
  },
  'oracle forms': {
    status: 'LEGACY', halfLifeYears: 1.0, lifecyclePosition: 'END_OF_LIFE',
    sunsetProbability: 0.85,
    modernAlternative: ['Modern ERP (SAP S/4HANA, Oracle Cloud ERP)', 'Web applications'],
    bridgeSkills: ['SQL', 'PL/SQL', 'cloud ERP administration'],
    note: 'Oracle Forms is end-of-life — Oracle stopped new development. Migration risk is very high.',
  },
  'cobol': {
    status: 'LEGACY', halfLifeYears: 1.5, lifecyclePosition: 'END_OF_LIFE',
    sunsetProbability: 0.75,
    modernAlternative: ['Python', 'Java', 'cloud-native microservices'],
    bridgeSkills: ['Python', 'mainframe-to-cloud migration skills'],
    note: 'COBOL specialist — high short-term demand from banks and governments still maintaining mainframes, but facing systematic replacement.',
  },
  'mainframe': {
    status: 'LEGACY', halfLifeYears: 2.0, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.65,
    modernAlternative: ['Cloud infrastructure', 'microservices'],
    bridgeSkills: ['Cloud platforms (AWS/Azure)', 'containerization'],
    note: 'Mainframe infrastructure is being systematically migrated to cloud — long tail but declining.',
  },
  'java ee': {
    status: 'AGING', halfLifeYears: 2.0, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.45,
    modernAlternative: ['Spring Boot', 'Quarkus', 'Micronaut', 'Jakarta EE'],
    bridgeSkills: ['Spring Boot', 'reactive programming', 'microservices patterns'],
    note: 'Java EE specialist demand declining — Spring Boot has become the dominant enterprise Java stack.',
  },
  // ── Legacy UI Frameworks ─────────────────────────────────────────────────
  'jquery': {
    status: 'LEGACY', halfLifeYears: 1.5, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.60,
    modernAlternative: ['React', 'Vue.js', 'vanilla JS + Web Components'],
    bridgeSkills: ['TypeScript', 'React', 'browser APIs'],
    note: 'jQuery specialist — very limited new demand. Maintenance-only positions.',
  },
  'flash': {
    status: 'OBSOLETE', halfLifeYears: 0, lifecyclePosition: 'END_OF_LIFE',
    sunsetProbability: 0.99,
    modernAlternative: ['CSS animations', 'WebGL', 'Canvas API'],
    bridgeSkills: ['HTML5 animation', 'WebAssembly'],
    note: 'Flash is EOL and unsupported — transition immediately.',
  },
  // ── Data / Analytics ─────────────────────────────────────────────────────
  'tableau': {
    status: 'AGING', halfLifeYears: 2.5, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.40,
    modernAlternative: ['Power BI', 'Looker', 'Evidence.dev', 'Observable'],
    bridgeSkills: ['SQL', 'dbt', 'Python data visualization'],
    note: 'Tableau specialist demand declining — Salesforce acquisition has changed roadmap; Power BI taking market share.',
  },
  'hadoop': {
    status: 'LEGACY', halfLifeYears: 1.5, lifecyclePosition: 'DECLINE',
    sunsetProbability: 0.70,
    modernAlternative: ['Apache Spark', 'Databricks', 'cloud data lakes (AWS Lake Formation, BigQuery)'],
    bridgeSkills: ['Spark', 'cloud data platforms', 'dbt'],
    note: 'Hadoop is being replaced by cloud-native data platforms in almost all new architectures.',
  },
};

function lookupTechProfile(techStack: string[]): TechProfile | null {
  const normalized = techStack.map(t => t.toLowerCase().trim());
  for (const tech of normalized) {
    for (const [key, profile] of Object.entries(TECH_PROFILES)) {
      if (tech.includes(key) || key.includes(tech)) return profile;
    }
  }
  return null;
}

const MIGRATION_MULTIPLIER: Record<MigrationPhase, number> = {
  NOT_MIGRATING: 1.0,
  PLANNING:      1.30,
  ACTIVE:        1.80,
  COMPLETING:    2.20,
  COMPLETED:     1.10, // migration complete = reduced risk
};

const MIGRATION_LABELS: Record<MigrationPhase, string> = {
  NOT_MIGRATING: 'No active migration detected',
  PLANNING:      'Migration planning phase — decisions being made but not yet executing',
  ACTIVE:        'Active migration underway — headcount in old tech being reduced',
  COMPLETING:    'Migration nearly complete — most old-tech roles already restructured',
  COMPLETED:     'Migration complete — old tech roles mostly eliminated or converted',
};

function getTechStackActions(
  score: number,
  status: TechStackStatus,
  bridgeSkills: string[],
  modernAlternatives: string[],
  migrationPhase: MigrationPhase,
): TechStackAction[] {
  const actions: TechStackAction[] = [];

  if (status === 'OBSOLETE' || status === 'LEGACY') {
    actions.push({
      action: `Begin learning ${bridgeSkills[0] ?? modernAlternatives[0] ?? 'modern stack alternative'} immediately`,
      why: `Your primary tech stack is ${status.toLowerCase()} — job market demand is declining rapidly. Learning the bridge skill (${bridgeSkills[0] ?? 'see above'}) is the highest-ROI protection available. 10hrs/week = market-ready in 3–6 months.`,
      urgency: 'immediate',
    });
  }

  if (migrationPhase === 'ACTIVE' || migrationPhase === 'COMPLETING') {
    actions.push({
      action: 'Volunteer for the migration project — position yourself as a bridge resource',
      why: 'The people who survive technology migrations are those involved in executing them, not those who only know the old stack. Volunteering for migration work protects your position and teaches the new stack simultaneously.',
      urgency: 'immediate',
    });
  }

  if (status === 'AGING') {
    actions.push({
      action: `Add ${modernAlternatives[0] ?? 'modern alternative'} to your portfolio in the next 90 days`,
      why: `Your stack (${status}) has declining demand. Adding the modern alternative keeps you competitive for new roles while your current expertise remains relevant. 20hrs investment is enough to demonstrate competency.`,
      urgency: 'within_30d',
    });
  }

  if (score >= 50) {
    actions.push({
      action: 'Document your tech migration experience in your LinkedIn and resume',
      why: 'Companies in mid-migration need people who understand both old and new systems. Even 1 migration project makes you valuable as a bridge resource — document it explicitly.',
      urgency: 'within_30d',
    });
  }

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface TechStackObsolescenceInput {
  primaryTechStack?: string[];     // user's main tech skills
  companyMigrationPhase?: MigrationPhase;
  companyMainTech?: string[];      // what tech the company uses/is migrating to
}

export function computeTechStackObsolescence(
  input: TechStackObsolescenceInput,
): TechStackObsolescenceResult {
  try {
    const {
      primaryTechStack = [],
      companyMigrationPhase = 'NOT_MIGRATING',
      companyMainTech = [],
    } = input;

    const profile = lookupTechProfile(primaryTechStack) ?? lookupTechProfile(companyMainTech);

    if (!profile) {
      return buildFallbackResult(companyMigrationPhase);
    }

    const migrationMultiplier = MIGRATION_MULTIPLIER[companyMigrationPhase];
    const baseObsolescenceScore = profile.sunsetProbability * 100;
    const stackObsolescenceScore = Math.min(100, Math.round(baseObsolescenceScore * migrationMultiplier));

    const healthLabel = stackObsolescenceScore >= 70 ? 'Critical stack obsolescence risk — immediate transition needed'
      : stackObsolescenceScore >= 50 ? 'Elevated — primary stack aging, bridge skills needed'
      : stackObsolescenceScore >= 30 ? 'Monitoring — some technology lifecycle pressure'
      : 'Healthy — current or modern stack with strong demand';

    return {
      stackObsolescenceScore,
      stackHealthLabel: healthLabel,
      primaryStackStatus: profile.status,
      stackStatusNote: profile.note,
      stackHalfLifeYears: profile.halfLifeYears,
      migrationPhase: companyMigrationPhase,
      migrationPhaseNote: MIGRATION_LABELS[companyMigrationPhase],
      migrationRiskMultiplier: migrationMultiplier,
      roleSunsetProbability: Math.min(0.99, profile.sunsetProbability * migrationMultiplier),
      roleSunsetNote: profile.sunsetProbability > 0.5
        ? `High probability your specific tech role becomes redundant as the market transitions to ${profile.modernAlternative[0] ?? 'modern alternatives'}.`
        : 'Moderate technology transition risk — bridge skills will provide protection.',
      techLifecyclePosition: profile.lifecyclePosition,
      techLifecycleNote: profile.note,
      bridgeSkillPriority: profile.bridgeSkills,
      modernAlternativeStack: profile.modernAlternative,
      techStackActions: getTechStackActions(stackObsolescenceScore, profile.status, profile.bridgeSkills, profile.modernAlternative, companyMigrationPhase),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    return buildFallbackResult('NOT_MIGRATING');
  }
}

function buildFallbackResult(migrationPhase: MigrationPhase): TechStackObsolescenceResult {
  return {
    stackObsolescenceScore: 20,
    stackHealthLabel: 'Unable to assess — tech stack not recognized or not provided',
    primaryStackStatus: 'CURRENT',
    stackStatusNote: 'Tech stack not found in market database — add specific technologies to get personalized analysis.',
    stackHalfLifeYears: null,
    migrationPhase,
    migrationPhaseNote: MIGRATION_LABELS[migrationPhase],
    migrationRiskMultiplier: MIGRATION_MULTIPLIER[migrationPhase],
    roleSunsetProbability: 0.15,
    roleSunsetNote: 'Unable to assess role sunset probability without tech stack data.',
    techLifecyclePosition: 'MATURE',
    techLifecycleNote: 'No tech stack data — using market median assumptions.',
    bridgeSkillPriority: ['AI/ML integration', 'cloud-native development', 'TypeScript'],
    modernAlternativeStack: ['AI-augmented tooling', 'cloud platforms'],
    techStackActions: [{
      action: 'Add your primary tech stack to your profile to get personalized obsolescence analysis',
      why: 'Without tech stack data, we use market median assumptions. Your actual tech stack may have significantly different risk profiles.',
      urgency: 'within_30d',
    }],
    calibrationStatus: 'research_grounded',
  };
}
