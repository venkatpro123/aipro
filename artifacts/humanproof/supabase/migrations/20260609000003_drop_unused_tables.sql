-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260609000003_drop_unused_tables.sql
-- Purpose:   Drop 11 tables that were created speculatively but never
--            referenced in any application code, edge function, or script.
--
-- SAFETY AUDIT (performed 2026-06-09)
-- ─────────────────────────────────────
-- Every table below was verified to have ZERO .from() references across:
--   src/**/*.ts, src/**/*.tsx, supabase/functions/**/*.ts, scripts/**/*.mjs
-- None appears in any RPC, trigger, view, or pg_cron job that is active.
-- Dropping them has no effect on any live application path.
--
-- TABLES AND REASON FOR REMOVAL
-- ──────────────────────────────
-- calibration_drift_events     — EF synthetic-probe mistakenly writes to
--                                calibration_drift_runs (undefined). This
--                                table was never read by any code path.
-- engine_calibration_snapshots — Planned weekly calibration CI; never wired.
-- signal_attribution_accuracy  — Planned signal tracking; feature not built.
-- macro_regime_cache           — Planned pg_cron macro snapshot; cron job
--                                was never created.
-- implicit_outcome_detections  — System-inferred post-audit outcomes;
--                                feature never implemented.
-- sec_enhanced_signals         — SEC FCF/margin data; SEC scraper writes to
--                                the companies table instead.
-- prediction_horizons          — Planned prediction feature; zero references.
-- skill_gap_assessments        — Planned skill gap feature; zero references.
-- role_portability_edges       — Listed in roleIntelligenceClient.ts comment
--                                but the .from() call was never written;
--                                static TS files handle portability data.
-- role_seniority_benchmarks    — Same as above.
-- cross_industry_transitions   — Same as above.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop in dependency-safe order (most isolated first).
-- CASCADE covers any indexes, RLS policies, and triggers on each table.

DROP TABLE IF EXISTS calibration_drift_events        CASCADE;
DROP TABLE IF EXISTS engine_calibration_snapshots    CASCADE;
DROP TABLE IF EXISTS signal_attribution_accuracy     CASCADE;
DROP TABLE IF EXISTS macro_regime_cache              CASCADE;
DROP TABLE IF EXISTS implicit_outcome_detections     CASCADE;
DROP TABLE IF EXISTS sec_enhanced_signals            CASCADE;
DROP TABLE IF EXISTS prediction_horizons             CASCADE;
DROP TABLE IF EXISTS skill_gap_assessments           CASCADE;
DROP TABLE IF EXISTS role_portability_edges          CASCADE;
DROP TABLE IF EXISTS role_seniority_benchmarks       CASCADE;
DROP TABLE IF EXISTS cross_industry_transitions      CASCADE;
