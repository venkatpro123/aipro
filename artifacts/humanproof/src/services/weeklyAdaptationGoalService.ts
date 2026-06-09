// weeklyAdaptationGoalService.ts — Phase 4 / P6 (Adaptation Over Prediction)
// Pure function, no I/O. Derives a single measurable weekly goal from the
// primary move so the LEARN stage shows a concrete target + due date.

import type { PrimaryMove } from './orchestration/signalOrchestrator';

export interface WeeklyAdaptationGoal {
  targetAction: string;
  successMetric: string;
  dueDate: string;
  impactConfidenceSource: 'MEASURED' | 'MODELED' | 'ESTIMATED';
}

function nextSundayDate(): string {
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function deriveSuccessMetric(actionTitle: string, riskReductionPct?: number): string {
  const t = actionTitle.toLowerCase();
  if (/linkedin|profile|update/.test(t)) return 'Profile updated and visible to recruiters';
  if (/cert|course|learn|train/.test(t)) return 'Module or section completed with progress tracked';
  if (/network|outreach|connect|recruiter/.test(t)) return '3+ connections made or replies received';
  if (/resume|cv|portfolio/.test(t)) return 'Document updated and saved in accessible format';
  if (/negotiat|salary|raise/.test(t)) return 'Research completed and talking points written';
  if (/apply|application|job/.test(t)) return '1+ application submitted';
  if (riskReductionPct) return `Completed — est. ${riskReductionPct}% risk reduction`;
  return 'Task completed and logged';
}

export function computeWeeklyGoal(primaryMove: PrimaryMove): WeeklyAdaptationGoal {
  const action = primaryMove.action;
  const rr = typeof action.riskReductionPct === 'number' ? action.riskReductionPct : undefined;

  return {
    targetAction: action.title,
    successMetric: deriveSuccessMetric(action.title, rr),
    dueDate: nextSundayDate(),
    impactConfidenceSource: rr != null ? 'MODELED' : 'ESTIMATED',
  };
}
