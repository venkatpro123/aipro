// profileCompletenessEngine.ts — Phase 4: The Career Twin That Remembers
// Pure synchronous function — no async, no DB, no network.
// Scoring weights sum to 100 points.

import type { UserProfile } from './userProfileService';
import type { CareerMemorySummary } from './careerMemoryService';

export type CompletenessGrade = 'A' | 'B' | 'C' | 'D';

export interface ProfileCompleteness {
  score: number;             // 0–100
  grade: CompletenessGrade;
  missingFields: string[];   // human-readable labels
  impact: string;            // one-liner on what improves with more data
}

// Scoring weights — must sum to 100
const WEIGHTS = {
  companyAndRole:      20,   // companyName + roleTitle from LayoffContext (proxy: jobTitle in profile)
  yearsExperience:     10,
  salaryBand:          10,
  visaStatus:          10,
  savingsMonthsRunway: 15,
  auditCount:          15,   // ≥2 audits shows ongoing engagement
  actionCompleted:     10,   // ≥1 action completed
  primaryGoal:         10,
} as const;

export function computeProfileCompleteness(
  profile: UserProfile | null,
  memorySummary: CareerMemorySummary | null,
  companyAndRoleFilled?: boolean,  // from LayoffContext (companyName + roleTitle present)
): ProfileCompleteness {
  let score = 0;
  const missingFields: string[] = [];

  // Company + role (proxy via profile.jobTitle OR explicitly passed flag)
  const hasCompanyRole = companyAndRoleFilled ?? !!profile?.jobTitle;
  if (hasCompanyRole) {
    score += WEIGHTS.companyAndRole;
  } else {
    missingFields.push('Company & role (run first audit)');
  }

  // Years of experience
  if (profile?.yearsExperience != null) {
    score += WEIGHTS.yearsExperience;
  } else {
    missingFields.push('Years of experience');
  }

  // Salary band
  if (profile?.salaryBand) {
    score += WEIGHTS.salaryBand;
  } else {
    missingFields.push('Salary band');
  }

  // Visa status
  if (profile?.visaStatus) {
    score += WEIGHTS.visaStatus;
  } else {
    missingFields.push('Visa / work status');
  }

  // Financial runway (savings months)
  if (profile?.savingsMonthsRunway != null) {
    score += WEIGHTS.savingsMonthsRunway;
  } else {
    missingFields.push('Savings / financial runway');
  }

  // Audit engagement — ≥2 audits
  const auditCount = memorySummary?.auditCount ?? 0;
  if (auditCount >= 2) {
    score += WEIGHTS.auditCount;
  } else if (auditCount === 1) {
    score += Math.round(WEIGHTS.auditCount * 0.5);
    missingFields.push('Run a 2nd audit to track progress');
  } else {
    missingFields.push('Run your first audit');
  }

  // Action completion — ≥1 action
  const actionsCompleted = memorySummary?.actionsCompleted ?? 0;
  if (actionsCompleted >= 1) {
    score += WEIGHTS.actionCompleted;
  } else {
    missingFields.push('Complete your first action item');
  }

  // Primary goal
  if (profile?.primaryGoal) {
    score += WEIGHTS.primaryGoal;
  } else {
    missingFields.push('Primary career goal');
  }

  score = Math.min(100, Math.max(0, score));

  const grade: CompletenessGrade =
    score >= 85 ? 'A' :
    score >= 65 ? 'B' :
    score >= 45 ? 'C' : 'D';

  const impact =
    grade === 'A' ? 'Recommendations are fully personalised to your situation.' :
    grade === 'B' ? `Completing ${missingFields.length} more field${missingFields.length === 1 ? '' : 's'} improves recommendation accuracy by ~20%.` :
    grade === 'C' ? `Recommendations are ~40% less precise without the missing data.` :
    `Recommendations are generic — your profile needs more data to personalise them.`;

  return { score, grade, missingFields, impact };
}

export function completenessColor(score: number): string {
  if (score >= 80) return '#10b981'; // green
  if (score >= 60) return '#f59e0b'; // amber
  return '#ef4444';                  // red
}
