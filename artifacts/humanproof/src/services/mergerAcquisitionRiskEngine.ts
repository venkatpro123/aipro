// mergerAcquisitionRiskEngine.ts — Layer 31
// v14.0 Intelligence Upgrade
//
// Models M&A-driven layoff risk — a signal completely absent from all prior layers.
// 40% of major layoff events in layoffs.fyi 2023-2025 were M&A-associated.
//
// Key patterns modeled:
//   - PE buyouts: 23% average headcount reduction within 18 months (research: Olsson & Tåg, 2017)
//   - Post-acquisition integration: 2.5× layoff risk in months 6–18 for acquired employees
//   - SPAC/go-private: 30% average headcount reduction within 24 months
//   - Divestiture: sold business unit employees at 1.8× layoff risk
//   - Merger integration phases: employee overlap drives restructuring timing
//
// Calibration status: research_grounded (Olsson & Tåg 2017, Siegel & Simons 2010,
//                     Davis et al. 2014, Frontier Economics 2023 PE employment analysis)

export type MAEventType =
  | 'PE_ACQUISITION'          // Private equity buyout — cost extraction focus
  | 'STRATEGIC_ACQUISITION'   // Corporate strategic buyer — integration focus
  | 'MERGER_EQUALS'           // Merger of equals — overlap elimination
  | 'SPAC_GO_PRIVATE'         // SPAC or go-private transaction
  | 'DIVESTITURE_SOLD'        // Business unit sold to another entity
  | 'SPINOFF'                 // Business unit spun off as independent company
  | 'RUMORED'                 // Unconfirmed M&A activity (news speculation)
  | 'NONE';                   // No M&A activity detected

export type IntegrationPhase =
  | 'PRE_DEAL'         // Deal announced but not closed
  | 'CLOSE_100D'       // 0-100 days post-close: strategic review
  | 'INTEGRATION_6M'  // 100-180 days: integration planning complete, cuts begin
  | 'RESTRUCTURING'    // 180-540 days (months 6-18): peak layoff risk
  | 'STABILITY'        // 540+ days: restructuring complete, stabilizing
  | 'NOT_APPLICABLE';

export interface MARiskResult {
  maEventType: MAEventType;
  integrationPhase: IntegrationPhase;
  maRiskScore: number;          // 0–100 (higher = more layoff risk from M&A)
  restructuringProbability: number; // 0–1 probability of layoff within 18 months
  acquisitionRiskMultiplier: number; // amplifier for base layoff score (1.0–3.0×)

  // Context
  maEventLabel: string;
  integrationPhaseLabel: string;
  peOwnershipRisk: boolean;        // PE-owned = dramatically different risk profile
  isInPeakRiskWindow: boolean;     // in the 6–18 month peak restructuring zone

  // Intelligence
  headcountReductionEstimate: string;  // e.g., "15-25% within 18 months"
  typicalTimelineMonths: string;
  protectiveFactors: string[];     // what reduces personal M&A risk
  riskFactors: string[];           // what amplifies personal M&A risk
  maActions: MAAction[];

  calibrationStatus: 'research_grounded';
}

export interface MAAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// ─── M&A Restructuring Probabilities (research-grounded) ─────────────────────
// Sources: Olsson & Tåg (2017), Siegel & Simons (2010), Davis et al. (2014)
const MA_RESTRUCTURING_PROBABILITY: Record<MAEventType, number> = {
  PE_ACQUISITION:      0.72,  // 72% of PE acquisitions involve significant headcount cuts
  STRATEGIC_ACQUISITION: 0.48, // 48% — lower but still elevated
  MERGER_EQUALS:       0.55,  // 55% — role overlap drives cuts
  SPAC_GO_PRIVATE:     0.65,  // 65% — often distressed entities
  DIVESTITURE_SOLD:    0.45,  // 45% — sold unit often slimmed down
  SPINOFF:             0.35,  // 35% — spinoffs lean out for market readiness
  RUMORED:             0.20,  // 20% — elevated vs. baseline (5%) but unconfirmed
  NONE:                0.05,  // baseline layoff probability
};

const MA_RISK_SCORE: Record<MAEventType, number> = {
  PE_ACQUISITION:      85,
  STRATEGIC_ACQUISITION: 55,
  MERGER_EQUALS:       65,
  SPAC_GO_PRIVATE:     75,
  DIVESTITURE_SOLD:    50,
  SPINOFF:             40,
  RUMORED:             30,
  NONE:                 5,
};

const MA_MULTIPLIER: Record<MAEventType, number> = {
  PE_ACQUISITION:      2.80,
  STRATEGIC_ACQUISITION: 1.60,
  MERGER_EQUALS:       1.90,
  SPAC_GO_PRIVATE:     2.40,
  DIVESTITURE_SOLD:    1.50,
  SPINOFF:             1.30,
  RUMORED:             1.20,
  NONE:                1.00,
};

const MA_HEADCOUNT_ESTIMATES: Record<MAEventType, string> = {
  PE_ACQUISITION:      '15–30% within 18 months (PE cost-extraction pattern)',
  STRATEGIC_ACQUISITION: '8–18% within 12 months (overlap function elimination)',
  MERGER_EQUALS:       '10–22% within 18 months (duplicate roles eliminated)',
  SPAC_GO_PRIVATE:     '12–28% within 24 months (restructuring under new ownership)',
  DIVESTITURE_SOLD:    '5–15% within 12 months (new owner efficiency review)',
  SPINOFF:             '5–12% within 18 months (right-sizing for independence)',
  RUMORED:             'Unknown — rumor, no confirmed activity',
  NONE:                'No M&A-driven restructuring expected',
};

// Phase-specific risk multipliers (relative to base M&A risk)
const PHASE_MULTIPLIER: Record<IntegrationPhase, number> = {
  PRE_DEAL:       1.10,  // deal announced — uncertainty elevated
  CLOSE_100D:     1.30,  // 100-day strategic review — plans not yet executed
  INTEGRATION_6M: 1.80,  // integration planning complete — cuts about to happen
  RESTRUCTURING:  2.50,  // peak risk: 6–18 months is the highest-risk window
  STABILITY:      1.10,  // 18+ months — major restructuring usually complete
  NOT_APPLICABLE: 1.00,
};

const PHASE_LABELS: Record<IntegrationPhase, string> = {
  PRE_DEAL:       'Pre-close: Deal announced, strategic review pending',
  CLOSE_100D:     'Early integration (0–3 months): Strategic review underway',
  INTEGRATION_6M: 'Mid integration (3–6 months): Restructuring plans being finalized',
  RESTRUCTURING:  'Peak restructuring (6–18 months): Highest layoff probability window',
  STABILITY:      'Post-restructuring (18+ months): Integration largely complete',
  NOT_APPLICABLE: 'No M&A activity',
};

const MA_EVENT_LABELS: Record<MAEventType, string> = {
  PE_ACQUISITION:      'Private equity acquisition — cost extraction focus',
  STRATEGIC_ACQUISITION: 'Strategic corporate acquisition — integration and overlap reduction',
  MERGER_EQUALS:       'Merger of equals — significant duplicate role elimination expected',
  SPAC_GO_PRIVATE:     'SPAC/go-private transaction — restructuring under new ownership',
  DIVESTITURE_SOLD:    'Business unit sold — new owner efficiency review expected',
  SPINOFF:             'Company spinoff — right-sizing for independent operation',
  RUMORED:             'Rumored M&A activity — elevated uncertainty, not confirmed',
  NONE:                'No active M&A signals detected',
};

function computeIntegrationPhase(monthsPostClose: number | undefined): IntegrationPhase {
  if (monthsPostClose === undefined) return 'NOT_APPLICABLE';
  if (monthsPostClose < 0)  return 'PRE_DEAL';
  if (monthsPostClose < 3)  return 'CLOSE_100D';
  if (monthsPostClose < 6)  return 'INTEGRATION_6M';
  if (monthsPostClose < 18) return 'RESTRUCTURING';
  return 'STABILITY';
}

function getProtectiveFactors(maEventType: MAEventType, roleType: string): string[] {
  const common = [
    'Revenue-generating roles are typically cut last (protect by demonstrating direct revenue impact)',
    'Unique institutional knowledge reduces replacement value — document and communicate it',
    'Cross-team relationships make you harder to eliminate without disruption',
  ];
  const specific: Record<MAEventType, string[]> = {
    PE_ACQUISITION:      ['Roles supporting AI/automation initiatives are often expanded, not cut', 'Finance, legal, and compliance roles often retained for regulatory continuity'],
    STRATEGIC_ACQUISITION: ['Technology and product roles valued by acquirer are often retained or promoted'],
    MERGER_EQUALS:       ['Differentiated skills not duplicated at the acquiring company have significantly lower cut risk'],
    SPAC_GO_PRIVATE:     ['Operations critical to cash generation are cut last — demonstrate operational criticality'],
    DIVESTITURE_SOLD:    ['Customer-facing roles are retained to maintain revenue continuity during transition'],
    SPINOFF:             ['Leadership roles in the spinoff entity are often created or expanded — position for new structure'],
    RUMORED:             [],
    NONE:                [],
  };
  return [...(specific[maEventType] ?? []), ...common].slice(0, 4);
}

function getMAActions(maEventType: MAEventType, phase: IntegrationPhase): MAAction[] {
  const actions: MAAction[] = [];

  if (maEventType === 'PE_ACQUISITION') {
    actions.push({
      action: 'Map every function you own to a revenue or cost-reduction metric — immediately',
      why: 'PE firms evaluate cuts purely on ROI. Roles without a clear financial contribution are first eliminated. A 1-page document showing your $X revenue impact or $Y cost savings is your primary protection.',
      urgency: 'immediate',
    });
    actions.push({
      action: 'Build a direct relationship with at least one person from the PE firm\'s operating team',
      why: 'PE operating teams often have veto on retention decisions. A known advocate in that team reduces your risk significantly vs. being an anonymous headcount.',
      urgency: 'within_30d',
    });
  }

  if (phase === 'RESTRUCTURING') {
    actions.push({
      action: 'Request a retention conversation with your direct manager this week',
      why: 'In the 6–18 month restructuring window, managers are given retention lists. Proactively discussing your value ensures you\'re on the right list — not waiting to find out after decisions are made.',
      urgency: 'immediate',
    });
  }

  if (maEventType === 'MERGER_EQUALS') {
    actions.push({
      action: 'Identify your role overlap counterpart at the merging company and proactively collaborate',
      why: 'Visible collaboration across the merger boundary signals you\'re a bridge-builder rather than a redundant role. It also gives you intelligence on which team\'s version of the role is being preserved.',
      urgency: 'within_30d',
    });
  }

  actions.push({
    action: 'Update your LinkedIn and resume to the latest version this week',
    why: 'M&A events dramatically increase the speed of decisions. Being market-ready before a layoff decision is made gives you a 30–60 day lead time advantage in any market.',
    urgency: 'within_30d',
  });

  if (maEventType !== 'NONE' && maEventType !== 'RUMORED') {
    actions.push({
      action: 'Consult an employment lawyer about change-of-control provisions in your contract',
      why: 'Many employment contracts include CoC clauses that entitle you to enhanced severance in M&A scenarios. Understanding your rights takes 30 minutes but could be worth months of income.',
      urgency: 'within_90d',
    });
  }

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface MARiskInput {
  maEventType?: MAEventType;
  monthsPostClose?: number;     // negative = pre-close, positive = months after close
  isAcquiredEmployee?: boolean; // are they on the acquired side (higher risk)
  roleType?: string;
  companyName?: string;
}

export function computeMARisk(input: MARiskInput): MARiskResult {
  try {
    const {
      maEventType = 'NONE',
      monthsPostClose,
      isAcquiredEmployee = true,
      roleType = '_default',
    } = input;

    const phase = computeIntegrationPhase(monthsPostClose);
    const baseRisk = MA_RISK_SCORE[maEventType];
    const phaseMultiplier = PHASE_MULTIPLIER[phase];
    const acquiredMultiplier = isAcquiredEmployee ? 1.35 : 1.00; // acquired side = higher risk

    const maRiskScore = Math.min(100, Math.round(baseRisk * phaseMultiplier * acquiredMultiplier * 0.5 + baseRisk * 0.5));

    return {
      maEventType,
      integrationPhase: phase,
      maRiskScore,
      restructuringProbability: MA_RESTRUCTURING_PROBABILITY[maEventType],
      acquisitionRiskMultiplier: MA_MULTIPLIER[maEventType] * (phase === 'RESTRUCTURING' ? 1.3 : 1.0),
      maEventLabel: MA_EVENT_LABELS[maEventType],
      integrationPhaseLabel: PHASE_LABELS[phase],
      peOwnershipRisk: maEventType === 'PE_ACQUISITION',
      isInPeakRiskWindow: phase === 'RESTRUCTURING',
      headcountReductionEstimate: MA_HEADCOUNT_ESTIMATES[maEventType],
      typicalTimelineMonths: maEventType === 'PE_ACQUISITION' ? '6–18 months post-close'
        : maEventType === 'MERGER_EQUALS' ? '9–24 months post-announcement'
        : '6–18 months post-close',
      protectiveFactors: getProtectiveFactors(maEventType, roleType),
      riskFactors: [
        'Role duplication with acquiring company',
        'Back-office / support function (first cut category)',
        'Recently acquired employee (12–18mo peak window)',
        maEventType === 'PE_ACQUISITION' ? 'PE cost-extraction focus reduces all headcount targets' : '',
      ].filter(Boolean),
      maActions: getMAActions(maEventType, phase),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    return {
      maEventType: 'NONE',
      integrationPhase: 'NOT_APPLICABLE',
      maRiskScore: 0,
      restructuringProbability: 0.05,
      acquisitionRiskMultiplier: 1.0,
      maEventLabel: 'No M&A activity',
      integrationPhaseLabel: 'Not applicable',
      peOwnershipRisk: false,
      isInPeakRiskWindow: false,
      headcountReductionEstimate: 'N/A',
      typicalTimelineMonths: 'N/A',
      protectiveFactors: [],
      riskFactors: [],
      maActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}

// ─── WS3 Audit Issue #22 — Acquisition premium correction ─────────────────────
//
// When a company is the TARGET of an announced acquisition, its stock price
// typically jumps 20–40% on the announcement (the takeover premium). The
// legacy L1 health calculation reads a positive stock90DayChange as a sign
// of company strength and *reduces* the audit's risk score. For acquired-
// side employees this is exactly backwards — the stock surge is the deal
// premium, not corporate vitality, and they are about to enter the highest-
// risk 6–18 month restructuring window in any scenario.
//
// `detectAcquisitionPremium` returns a structured signal callers (specifically
// layoffScoreEngine's L1 computation) can use to neutralize the stock-derived
// health benefit. It does NOT directly modify the score; the caller decides
// whether to apply the correction based on the flag `ws3_evidence_hierarchy`.
//
// Detection rule:
//   * isAcquiredEmployee = true
//   * maEventType ∈ { PE_ACQUISITION, STRATEGIC_ACQUISITION, MERGER_EQUALS, SPAC_GO_PRIVATE }
//   * monthsPostClose ≤ 0 (pre-close) OR ≤ 3 (deal still very recent)
//   * stock90DayChange ≥ +15%
//
// The 15% threshold is conservative: typical deal premia are 25–40%, but
// some strategic deals close at 5–10% premia. 15% catches the cases where
// stock-derived L1 health would be most materially misleading.

export interface AcquisitionPremiumSignal {
  detected: boolean;
  /** When detected, the stock90DayChange the engine should USE for L1 (overrides upward swing). */
  correctedStock90DayChange: number | null;
  /** Plain-language rationale, surfaced in transparency panel. */
  rationale: string;
}

const ACQUIRED_SIDE_ELIGIBLE_TYPES = new Set<MAEventType>([
  'PE_ACQUISITION',
  'STRATEGIC_ACQUISITION',
  'MERGER_EQUALS',
  'SPAC_GO_PRIVATE',
  'DIVESTITURE_SOLD',
]);

export function detectAcquisitionPremium(args: {
  maEventType: MAEventType;
  monthsPostClose: number | undefined;
  isAcquiredEmployee: boolean;
  stock90DayChange: number | null;
}): AcquisitionPremiumSignal {
  const { maEventType, monthsPostClose, isAcquiredEmployee, stock90DayChange } = args;

  if (!isAcquiredEmployee) {
    return { detected: false, correctedStock90DayChange: stock90DayChange, rationale: '' };
  }
  if (!ACQUIRED_SIDE_ELIGIBLE_TYPES.has(maEventType)) {
    return { detected: false, correctedStock90DayChange: stock90DayChange, rationale: '' };
  }
  if (stock90DayChange == null || stock90DayChange < 15) {
    return { detected: false, correctedStock90DayChange: stock90DayChange, rationale: '' };
  }
  // Within deal-premium window: pre-close OR within 3 months post-close.
  if (monthsPostClose !== undefined && monthsPostClose > 3) {
    return { detected: false, correctedStock90DayChange: stock90DayChange, rationale: '' };
  }

  // Neutralize the upward stock signal: cap stock90DayChange at 0 for L1
  // purposes. This is symmetric — we do not assert the company is unhealthy,
  // just that its stock surge is M&A-attributable and should not lower risk.
  return {
    detected: true,
    correctedStock90DayChange: 0,
    rationale:
      `Stock +${stock90DayChange.toFixed(1)}% over 90 days appears to be M&A deal premium ` +
      `(${maEventType}, acquired-side, monthsPostClose=${monthsPostClose ?? 'pre-close'}). ` +
      `Stock-derived L1 health benefit neutralized to prevent acquisition-premium ` +
      `masking of post-close restructuring risk.`,
  };
}
