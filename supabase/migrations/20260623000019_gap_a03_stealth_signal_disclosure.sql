-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000019_gap_a03_stealth_signal_disclosure.sql
-- Purpose:   GAP-A03 — Stealth layoff detection signal disclosure in
--            TransparencyTab (code-only audit fix; no new schema columns).
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION COVERS
-- ════════════════════════════════════════════════════════════════════════════
--
-- Code changes (TypeScript — no migration needed for those, documented here):
--
--   stealthLayoffDetector.ts
--   ─────────────────────────
--   + StealthSubSignal interface: label, observedValue, threshold, direction,
--     dataSource, windowPeriod — one entry per detection signal.
--   + StealthPrecisionStats interface: overallN, overallPrecision,
--     precisionLabel, fprLabel, gateStatus.
--   + subSignals: StealthSubSignal[] field added to StealthSignal.
--     Populated in detectStealthLayoff() with the single headcount-delta
--     signal entry (flagged cases only; empty when STABLE/SOFT_TRIM/NO_DATA).
--   + getStealthPrecisionStats(): queries stealth_layoff_precision_summary
--     (added in 20260623000014), aggregates across all severity bands.
--     1-hour cache, non-fatal, falls back to UNKNOWN when <20 outcomes.
--   + getStealthPrecisionStatsSync(): sync accessor for React useState init.
--
--   TransparencyTab.tsx
--   ───────────────────
--   + Imports: getStealthPrecisionStats, getStealthPrecisionStatsSync,
--     StealthPrecisionStats, StealthSubSignal.
--   + State hook: stealthPrecision (init from sync, refreshed via useEffect).
--   + StealthSignal cast type extended: subSignals?: StealthSubSignal[].
--   + Kill-switch block: replaced static "PRECISION: UNKNOWN" badge with:
--       - ESTIMATED badge (indigo) — labels the heuristic correctly.
--       - Dynamic PRECISION: {precisionLabel} badge (amber/emerald).
--   + Rich detail block rewritten: numbered detection signal list from
--     subSignals (observed value, threshold, window, source per signal),
--     headcount from→to row, ESTIMATED heuristic explanation, live
--     precision and FPR from stealthPrecision state, gate status note.
--   + Invariant: when stealth_layoff_floor fires and stealthSig present,
--     the disclosure always shows the triggering signals and precision rate.
--     No kill-switch floor is shown without both.
--
--   Schema bug fix (also applied in this session):
--   ────────────────────────────────────────────────
--   Migrations 20260623000013 and 20260623000014 referenced columns
--   `description` and `added_in_version` that were not present in the
--   engine_calibration_constants table created by 20260615000001.
--   Both migrations now include ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   at their start (idempotent on re-run).
--
-- ════════════════════════════════════════════════════════════════════════════
-- DB CHANGE (idempotent)
-- ════════════════════════════════════════════════════════════════════════════
-- Ensure the schema columns are present (guard in case 000013/000014
-- ran before the fix was applied to those files).
ALTER TABLE public.engine_calibration_constants
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS added_in_version TEXT;

-- ── Log to scoring_architecture_log ──────────────────────────────────────
INSERT INTO public.scoring_architecture_log (
  dimension_key,
  change_type,
  description,
  migration_ref,
  created_at
) VALUES (
  'gap_a03_stealth_signal_disclosure',
  'audit_fix',
  'GAP-A03 complete: stealth layoff detection signals now fully disclosed in '
  'TransparencyTab KillSwitchLog when stealth_layoff_floor fires. '
  'Changes: (1) StealthSubSignal interface — one structured entry per detection '
  'signal (label, observedValue, threshold, direction, dataSource, windowPeriod); '
  'added to StealthSignal.subSignals[]. Currently 0 or 1 entry (single headcount-'
  'delta signal). (2) StealthPrecisionStats interface + getStealthPrecisionStats() '
  'queries stealth_layoff_precision_summary, aggregates across severity bands, '
  '1-hour cache; falls back to UNKNOWN when <20 outcomes. '
  '(3) TransparencyTab: ESTIMATED badge (indigo), dynamic PRECISION badge '
  '(amber when UNKNOWN, emerald when gate_clears), numbered signal list with '
  'observed value + threshold + window + source per signal, live precision '
  'and FPR, precision gate explanation. '
  'Invariant enforced: no stealth_layoff_floor disclosure without triggering '
  'signals AND precision rate shown. '
  'Schema fix: description + added_in_version columns added to '
  'engine_calibration_constants (referenced by 000013 and 000014 but not '
  'present in base table from 20260615000001).',
  '20260623000019',
  NOW()
)
ON CONFLICT DO NOTHING;
