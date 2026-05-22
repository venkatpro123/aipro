-- Migration: 20260623000010_grace_period_action_compression.sql
--
-- Grace-period-aware action plan phase compression for short-grace visas.
--
-- THE BUG
-- ───────
-- When visaRisk.overallVisaRisk is HIGH or CRITICAL and gracePeriodDays < 30,
-- the Action Plan displayed standard 30-day and 90-day phase labels
-- (Day 1 / Week 1 / Month 1 / Quarter 1) that were legally meaningless:
--   - Singapore S Pass holder (10-day grace): "Month 1 action" = impossible
--   - UAE employment visa (30-day grace):      "Quarter 1 action" = impossible
--   - Philippines 9G/AEP (15-day grace):       "Week 1" = already past deadline
-- The displayed timelines implied the user had time they did not have.
--
-- THE FIX
-- ───────
-- Two compression tiers keyed by gracePeriodDays:
--
--   CRITICAL tier (gracePeriodDays ≤ 10 — Singapore S Pass):
--     day1   → '6 hours'   (from 'Day 1')
--     week1  → '2 days'    (from 'Week 1')
--     month1 → '7 days'    (from 'Month 1')
--     quarter1→ '7 days'   (quarter actions collapse to same as month)
--
--   COMPRESSED tier (10 < gracePeriodDays < 30 — UAE 30d, Philippines 15d):
--     day1   → '24 hours'  (from 'Day 1')
--     week1  → '3 days'    (from 'Week 1')
--     month1 → '10 days'   (from 'Month 1')
--     quarter1→ '10 days'  (quarter actions collapse to same as month)
--
-- Compression is gated on: overallVisaRisk === 'HIGH' || 'CRITICAL'.
-- When flag is LOW/MODERATE (e.g. L-1 with 60-day grace), no compression —
-- standard timelines apply. This prevents false urgency for well-protected users.
--
-- FILES CHANGED
-- ─────────────
-- actionPersonalizationEngine.ts:
--   - Import VisaRiskResult type from visaRiskEngine
--   - Add visaRisk?: VisaRiskResult | null as 8th parameter
--   - Post-process actions with GRACE_DEADLINE_MAP when compression applies
--   - PersonalizedActionSet: graceCompressionApplied, graceCompressionTier fields
--
-- auditDataPipeline.ts:
--   - Step 45: pass (hybridResult as any).visaRisk ?? null as 8th arg
--   - After personalizedActionSet, compress hybridResult.recommendations deadlines
--     using same GRACE_DEADLINE_MAP so TakeActionTab's ActionMatrix reflects window
--
-- TakeActionTab.tsx (v3):
--   - Import VisaRiskResult, Timer icon
--   - ActionMatrix now accepts optional phaseLabels?: Record<string,string>
--   - sequencePhase chip uses phaseLabels override when provided
--   - VISA_TYPE_LABEL map for 20+ visa types → user-friendly names
--   - Grace period banner (red): "Your [visa type] grace period: N days.
--     All timelines below are compressed to fit your actual legal window."
--   - Banner only shown when overallVisaRisk HIGH/CRITICAL + gracePeriodDays < 30
--
-- COMPRESSION SCOPE
-- ─────────────────
-- Only affects:
--   1. personalizedActionSet.actions (role-specific actions from actionPersonalizationEngine)
--   2. hybridResult.recommendations (engine recommendations from generateRecommendations)
-- Does NOT affect:
--   - ContingencyPlan timelines (separate engine with its own horizon model)
--   - NegotiationIntelligence scripts (not phase-bucketed)
--   - FinancialRunway panel (operates on months, not sequencePhase)
--
-- VISA TYPES WITH SHORT GRACE (compression fires):
--   singapore_s_pass   → 10 days → CRITICAL tier
--   philippines_9g_aep → 15 days → COMPRESSED tier
--   uae_employment_visa→ 30 days → COMPRESSED tier (boundary — gracePeriodDays < 30)
--   qatar_work_permit  → 30 days → COMPRESSED tier (same boundary)
--   australia_482_tss  → 28 days → COMPRESSED tier
--   japan_work_visa    → 30 days → COMPRESSED tier (boundary)
--   tn                 → 0 days  → CRITICAL tier (immediate status loss on termination)

INSERT INTO scoring_architecture_log (
  dimension_key,
  formula_weight,
  status,
  source_description,
  validation_date,
  notes,
  created_at,
  updated_at
) VALUES (
  'grace_period_action_compression',
  0.00,
  'regression_derived',
  'Grace-period-aware action plan phase compression for short-grace visa holders. '
  'When visaRisk.overallVisaRisk is HIGH/CRITICAL and gracePeriodDays < 30, action '
  'deadline strings are remapped: CRITICAL tier (≤10d): day1→6h, week1→2d, month1→7d; '
  'COMPRESSED tier (<30d): day1→24h, week1→3d, month1→10d. Compression applied in '
  'getPersonalizedActions() and propagated to hybridResult.recommendations. '
  'TakeActionTab banner surfaces the grace period and compressed window to the user. '
  'Standard timelines preserved for LOW/MODERATE visa risk (≥30d grace).',
  '2026-06-23',
  'Files changed: actionPersonalizationEngine.ts (visaRisk 8th param + GRACE_DEADLINE_MAP), '
  'auditDataPipeline.ts (visaRisk pass-through + recommendations compression), '
  'TakeActionTab.tsx (ActionMatrix phaseLabels prop + grace banner + VISA_TYPE_LABEL map). '
  'Visa types with short grace: singapore_s_pass(10d), australia_482_tss(28d), '
  'uae_employment_visa(30d), qatar_work_permit(30d), japan_work_visa(30d), tn(0d). '
  'formula_weight 0.00 — this is a display/UX fix, not a scoring dimension.',
  NOW(),
  NOW()
)
ON CONFLICT (dimension_key) DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = NOW();
