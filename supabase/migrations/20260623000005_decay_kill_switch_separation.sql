-- Migration: 20260623000005_decay_kill_switch_separation.sql
--
-- Documents the verified decay model / kill-switch separation and three fixes
-- for previously undisclosed and unimplemented floor mechanisms.
--
-- VERIFICATION: Signal decay model only affects formula WEIGHTS, not kill-switch gates.
--   The decay model (signalDecayModel.ts) multiplies formula weights W by freshness
--   factors (e.g. W.L1 × f_stock, W.L2 × f_layoff). It never modifies:
--     - dimension VALUE scores (calibrated.L1, calibrated.L2, etc.)
--     - raw companyData signal fields
--     - kill-switch gate conditions
--   Kill-switch gate inputs are all raw/binary:
--     KS-A: layoffNewsAgeInDays (raw calendar days) — binary: ≤30
--     KS-B: calibrated.L1 (value, not decay-weighted), raw FCF, raw stock
--     KS-C: _hiringPostingTrend string, layoffRounds count, sectorContagion score
--     KS-D: calibrated.L1, isPublic flag
--   The WARN filing age (89 days in the question scenario) is irrelevant to the
--   kill-switch system — WARN has a separate `hasActiveWARN` binary field, and
--   `filterActiveFilings()` determines active vs. historical (90 days past layoff date).
--   A WARN filing is either "active" or not — no decay applies to the filing itself.
--
-- The one indirect decay interaction is correct by design:
--   preKillSwitchScore (the score compared to the floor) is decay-affected because
--   it comes from rawScore × 100, which uses decay-weighted W.
--   Stale data → lower formula score → floors MORE likely to apply → conservative. ✓
--
-- THREE FIXES:
--
-- Fix 1 — Stealth floor (auditDataPipeline.ts):
--   Was: additive boost (score + 8/15/25), bypassing killSwitchFloors tracking.
--   Now: hard floor (60/65/70 by severity), tracked in killSwitchFloors +
--        activatedKillSwitches + _formulaScorePreFloor. Disclosed in TransparencyTab.
--   Severity → floor: SILENT_TRIM→60, SILENT_CUT→65, SILENT_PURGE→70.
--
-- Fix 2 — WARN floor (auditDataPipeline.ts, step 39):
--   Was: warnGroundTruthOverride = true set but never read. No floor applied.
--        computeWARNSignal() ran but result never fed back to score.
--   Now: when hasActiveWARN = true and hybridResult.total < 68: apply hard floor 68.
--        Tracked in hybridResult.killSwitchFloors + activatedKillSwitches.
--   Note: WARN evaluation happens AFTER mapToHybridResult (due to async DB access),
--   so it patches hybridResult.total directly. The pre-floor score is preserved in
--   _formulaScorePreFloor for the TransparencyTab badge.
--
-- Fix 3 — TransparencyTab + KillSwitchFloorBadge labels:
--   Added DISCLOSURE entries for warn_act_filing and stealth_layoff_floor.
--   Added KS_LABELS entries for both in the badge component.

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
  'kill_switch_decay_separation',
  0.00,
  'regression_derived',
  'Kill-switch floors bypass the signal decay model. Decay affects only formula weights W '
  '(W.L1, W.L2, W.D7 multiplied by freshness factors). Kill-switch gates evaluate raw '
  'binary signals: news age in calendar days, calibrated L1 value (not decay-weighted), '
  'raw companyData fields. preKillSwitchScore is decay-affected (via W) but this is the '
  'correct direction: stale data → lower score → floor more likely to apply → conservative. '
  'Six floors now in the unified system: '
  'confirmed_recent_layoff_news=72, financial_distress_triad=65, warn_act_filing=68, '
  'stealth_layoff_floor=60/65/70, pre_layoff_precursor=58, pre_layoff_precursor_inferred=52.',
  '2026-06-23',
  'WARN floor was documented in Section 6.3 but never implemented. warnGroundTruthOverride '
  'was set but no code read it to apply a floor. Fixed: hybridResult.total patched in step 39 '
  'when hasActiveWARN=true and total<68. '
  'Stealth floor was additive (score+boost) outside killSwitchFloors tracking. Fixed: hard '
  'floor by severity (SILENT_TRIM=60, SILENT_CUT=65, SILENT_PURGE=70), tracked in unified system.',
  now(),
  now()
)
ON CONFLICT (dimension_key)
DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = now();

