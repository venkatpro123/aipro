// evidenceLayer.ts — Evidence metadata for every major claim in the report
// Renders as [Verified] / [Modeled] / [Estimated] micro-chips beside numbers.

export interface Evidence {
  source: string;
  verifiedDate: string;       // "YYYY-MM" format
  confidence: 'Verified' | 'Modeled' | 'Estimated';
  evidenceType: 'empirical' | 'survey' | 'model' | 'expert';
  detail?: string;            // optional tooltip expansion text
}

// ── Dimension evidence ───────────────────────────────────────────────────────
const DIMENSION_EVIDENCE: Record<string, Evidence> = {
  D1: {
    source: 'WEF Future of Jobs Report 2025',
    verifiedDate: '2025-01',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Task automatability derived from industry AI adoption rates × role-specific task profiles. WEF tasks-at-risk methodology applied to your role category.',
  },
  D2: {
    source: 'McKinsey State of AI 2024 + Stanford AI Index 2025',
    verifiedDate: '2025-03',
    confidence: 'Verified',
    evidenceType: 'survey',
    detail: 'AI tool maturity in your sector measured from enterprise adoption surveys and market deployment data across 2,000+ companies.',
  },
  D3: {
    source: 'O*NET Cognitive Complexity Database 2024',
    verifiedDate: '2024-12',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Human amplification score derived from O*NET occupational complexity ratings and academic research on cognitive task irreplaceability.',
  },
  D4: {
    source: 'Bureau of Labor Statistics + LinkedIn Career Pathways 2024',
    verifiedDate: '2024-10',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Experience shield quantified from observed career trajectory data and seniority-adjusted displacement rates across 50+ role categories.',
  },
  D5: {
    source: 'OECD Digital Economy Outlook 2024 + IMF World Economic Outlook 2025',
    verifiedDate: '2025-01',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Country exposure score from multi-factor model: AI adoption speed, offshoring pressure, regulatory environment, and local labor market resilience across 65 countries.',
  },
  D6: {
    source: 'LinkedIn Economic Graph Research 2024',
    verifiedDate: '2024-09',
    confidence: 'Estimated',
    evidenceType: 'model',
    detail: 'Social capital moat estimated from network density proxies by industry and role seniority. Direct measurement of individual network strength is not possible from public data.',
  },
};

// ── Sub-score evidence ────────────────────────────────────────────────────────
const SUBSCORE_EVIDENCE: Record<string, Evidence> = {
  exposureScore: {
    source: 'WEF + McKinsey 2024–2025',
    verifiedDate: '2025-01',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Composite of Task Automatability (D1) and AI Tool Maturity (D2). Higher score = more direct exposure to current AI capabilities.',
  },
  protectionScore: {
    source: 'O*NET + BLS + LinkedIn 2024',
    verifiedDate: '2024-12',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Composite of Human Amplification, Experience Shield, and Social Capital. Represents your portfolio of AI-resistant career assets.',
  },
  adaptabilityScore: {
    source: 'LinkedIn Learning + WEF Reskilling Data 2024',
    verifiedDate: '2024-11',
    confidence: 'Estimated',
    evidenceType: 'survey',
    detail: 'Estimated from experience level, role complexity, and observed career transition success rates in your role category.',
  },
  marketStrength: {
    source: 'OECD Digital Economy Outlook 2024',
    verifiedDate: '2025-01',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Inverse of Country Exposure (D5). Reflects your local market\'s hiring demand, AI adoption pace, and salary competitiveness.',
  },
  survivalPct: {
    source: 'Derived from D1–D6 composite risk model',
    verifiedDate: '2025-01',
    confidence: 'Modeled',
    evidenceType: 'model',
    detail: 'Survival probability is the inverse of risk score. A 65% survival estimate means: under base-case AI adoption assumptions, 65% of professionals in your position maintain career trajectory without major disruption over the forecast window.',
  },
};

// ── Forecast evidence ────────────────────────────────────────────────────────
const FORECAST_EVIDENCE: Evidence = {
  source: 'WEF 2025 + McKinsey 2024 + Stanford AI Index 2025',
  verifiedDate: '2025-03',
  confidence: 'Estimated',
  evidenceType: 'model',
  detail: 'Forecast scenarios are probabilistic estimates based on observed AI adoption trajectories, not guaranteed predictions. Actual outcomes depend on technology pace, regulation, and individual action.',
};

// ── Peer comparison evidence ──────────────────────────────────────────────────
const PEER_EVIDENCE: Evidence = {
  source: 'Derived from risk model — computed, not surveyed',
  verifiedDate: '2025-01',
  confidence: 'Estimated',
  evidenceType: 'model',
  detail: 'Peer comparisons are computed by applying the same D1–D6 model to representative peer profiles (AI-augmented, senior, typical, junior versions of your role). These are model-derived benchmarks, not individual survey respondents.',
};

// ── Public API ────────────────────────────────────────────────────────────────
export function getDimensionEvidence(dimensionKey: string): Evidence {
  return DIMENSION_EVIDENCE[dimensionKey] ?? {
    source: 'Industry research composite',
    verifiedDate: '2025-01',
    confidence: 'Estimated',
    evidenceType: 'model',
  };
}

export function getSubScoreEvidence(scoreKey: string): Evidence {
  return SUBSCORE_EVIDENCE[scoreKey] ?? {
    source: 'Composite model',
    verifiedDate: '2025-01',
    confidence: 'Estimated',
    evidenceType: 'model',
  };
}

export function getForecastEvidence(): Evidence {
  return FORECAST_EVIDENCE;
}

export function getPeerEvidence(): Evidence {
  return PEER_EVIDENCE;
}

// ── Badge renderer helper ────────────────────────────────────────────────────
export function getEvidenceBadgeStyle(confidence: Evidence['confidence']): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  switch (confidence) {
    case 'Verified':
      return { label: 'Verified', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' };
    case 'Modeled':
      return { label: 'Modeled', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)' };
    case 'Estimated':
      return { label: 'Estimated', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' };
  }
}
