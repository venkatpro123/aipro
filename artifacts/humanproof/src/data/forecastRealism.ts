// forecastRealism.ts — Forecast transparency layer
// Every forecast surface in the UI can pull from this to show assumptions + alternatives.

export interface ForecastMetadata {
  window: string;
  confidenceLevel: 'High' | 'Moderate' | 'Low' | 'Speculative';
  confidenceColor: string;
  assumptions: string[];
  alternativeScenario: string;
  methodologyNote: string;
}

const HIGH_RISK_ROLES = new Set([
  'bpo_inbound', 'bpo_data_entry', 'bpo_chat', 'bpo_outbound', 'bpo_email_support',
  'adm_data_entry', 'cnt_translation', 'qa_manual', 'fin_payroll', 'ret_floor',
  'cnt_seo_content', 'cnt_email', 'mkt_sem', 'web_wordpress',
]);

const LOW_RISK_ROLES = new Set([
  'hc_surgeon', 'mh_therapist', 'mh_psychologist', 'sw_arch', 'it_lead',
  'gov_policy', 'leg_litigation', 'inv_ibanking', 'ml_research', 'hc_specialist',
  'ngo_program', 'con_strategy', 'edu_higher',
]);

export function getForecastMetadata(roleKey: string, score: number, experience: string): ForecastMetadata {
  const isSenior = ['10-15', '15+', '10-20', '20+'].includes(experience);
  const isHighRiskRole = HIGH_RISK_ROLES.has(roleKey);
  const isLowRiskRole  = LOW_RISK_ROLES.has(roleKey);
  const currentYear = 2026;

  // ── HIGH risk (score ≥ 70 OR known high-risk role with moderate score) ──────
  if (score >= 70 || (isHighRiskRole && score >= 50)) {
    return {
      window: `${currentYear}–${currentYear + 3}`,
      confidenceLevel: 'Low',
      confidenceColor: '#ef4444',
      assumptions: [
        'AI capabilities in your role\'s task categories continue advancing at current pace',
        'Enterprise adoption of AI tools in your sector follows observed 2024–2026 trends',
        'No major regulatory intervention (EU AI Act, US executive orders) significantly constrains automation',
        'Your company\'s hiring and automation strategy follows industry peers',
      ],
      alternativeScenario: 'If regulatory AI pauses emerge or AI capability growth stalls, your runway extends by 18–24 months. Historical technology adoption curves (cloud, SaaS) show that enterprise deployment consistently lags capability by 2–4 years.',
      methodologyNote: 'High-displacement estimate based on McKinsey 2024 automation benchmarks and WEF 2025 Jobs at Risk analysis for this task category.',
    };
  }

  // ── MODERATE risk (score 40–70) ──────────────────────────────────────────
  if (score >= 40) {
    return {
      window: `${currentYear}–${currentYear + 5}`,
      confidenceLevel: 'Moderate',
      confidenceColor: '#f59e0b',
      assumptions: [
        'Your role\'s higher-complexity tasks remain primarily human-executed for 2–4 years',
        'AI augments the execution layer but human judgment remains required for strategic work',
        isSenior
          ? 'Your experience shield continues to provide meaningful protection above junior peers'
          : 'Active upskilling pace matches or exceeds AI capability growth in your field',
        'The human premium for your role\'s relationship and contextual dimensions holds',
      ],
      alternativeScenario: isLowRiskRole
        ? 'If AI capabilities advance faster than expected toward general reasoning, even complexity-protected roles face review by 2030–2032, though with significantly more transition time than routine roles.'
        : 'If AI capabilities plateau at current 2026 levels for 2+ years (possible given energy and compute constraints), your risk growth slows and the 5-year window extends to 7–8 years.',
      methodologyNote: 'Moderate-risk estimate from Stanford AI Index 2025 adoption curves and McKinsey State of AI 2024 role-category displacement projections.',
    };
  }

  // ── LOW risk (score < 40) ────────────────────────────────────────────────
  return {
    window: `${currentYear}–${currentYear + 8}`,
    confidenceLevel: 'High',
    confidenceColor: '#10b981',
    assumptions: [
      'Specialized human judgment in your domain remains economically irreplaceable through this period',
      'Your professional network and relationship capital continues to compound',
      'Physical, creative, or ethical complexity in your role maintains premium demand',
      'AI tools amplify your professional output rather than substituting your role',
    ],
    alternativeScenario: 'Under an AGI scenario (general reasoning AI by 2028–2030), structural review of all roles is expected — but professionals in complexity-protected roles have the adaptability and reputation capital to transition successfully, unlike high-displacement role holders.',
    methodologyNote: 'Low-displacement estimate supported by WEF Future of Jobs 2025 analysis of human-complementary roles and Bureau of Labor Statistics occupational resilience data.',
  };
}

// ── Forecast confidence display helper ──────────────────────────────────────
export function getForecastConfidenceLabel(level: ForecastMetadata['confidenceLevel']): string {
  switch (level) {
    case 'High':       return 'Higher confidence forecast — based on established automation patterns';
    case 'Moderate':   return 'Moderate confidence — outcome depends significantly on your upskilling pace';
    case 'Low':        return 'Lower confidence — multiple paths exist; your actions matter most here';
    case 'Speculative': return 'Speculative range — long-term AI trajectory has meaningful uncertainty';
  }
}
