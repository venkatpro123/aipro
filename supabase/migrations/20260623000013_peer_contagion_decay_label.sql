-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260623000013_peer_contagion_decay_label.sql
-- Purpose:   GAP-A02 — Register sectorContagionAgent.decayLambda in
--            engine_calibration_constants.
--
-- BACKGROUND
-- ──────────
-- The peer contagion exponential decay constant λ=0.023 (30-day half-life) was
-- not registered in engine_calibration_constants. It existed only as a hardcoded
-- TypeScript constant in sectorContagionAgent.ts:
--
--   const DECAY_LAMBDA = 0.023;   // <── hardcoded; not DB-routable; not labeled
--
-- This means:
--   1. The recalibrate-engine cron cannot override it without a code deploy.
--   2. The TransparencyTab provenance viewer shows no entry for it.
--   3. PeerContagionPanel displayed no ESTIMATED label for the decay constant.
--
-- PROVENANCE FINDING
-- ──────────────────
-- λ=0.023 corresponds to a 30-day half-life (ln(2)/0.023 ≈ 30.1 days).
-- The comment in sectorContagionAgent.ts (added v40.0) reads:
--
--   "30-day half-life chosen to match the empirical observation that contagion
--    propagation from a peer announcement has ~80% of its effect within the first
--    30 days (sector follow-on announcements cluster in 2–6 weeks per layoffs.fyi
--    2022-2024 wave analysis). Calibrate via: fit exponential decay to the observed
--    lag distribution between first and follow-on announcements in each sector wave."
--
-- STATUS: ESTIMATED (uncalibrated_placeholder).
-- The 30-day half-life is a developer choice informed by qualitative wave timing
-- analysis. The calibration instruction ("fit exponential decay to lag distribution")
-- has NOT been executed. No regression output exists for this constant.
--
-- INCONSISTENCY DOCUMENTED
-- ────────────────────────
-- Three components use different sector-contagion decay constants:
--
--   Component                   Constant         Half-life   DB-routed?
--   ─────────────────────────── ──────────────── ─────────── ──────────
--   sectorContagionAgent.ts     λ=0.023          30 days     NO (fixed by this migration)
--   signalDecayModel.ts         sector_contagion  21 days    YES (manual_seed)
--   peerContagionEngine.ts      step-band         ~90 days   YES (via recencyDecayBands)
--   (recencyDecayedWeight util) τ=30              30 days    NO (hardcoded utility)
--
-- The DB comment for peerContagionEngine.exponentialDecayHalfLife says
-- "null here means: defer to signalDecayModel.halfLives.sector_contagion (21 days)"
-- but the actual code falls back to step-band instead. This is a code bug.
-- Fix: peerContagionEngine.recencyWeight() now reads sector_contagion (21d) before
-- falling to step-band when exponentialDecayHalfLife is null.
--
-- CALIBRATION RATIONALE FOR TWO VALUES
-- ──────────────────────────────────────
-- signalDecayModel (21 days): "After 21 days affected companies have either followed
-- or decoupled" — reflects the BINARY follow-or-decouple pattern seen in waves.
-- sectorContagionAgent (30 days): Reflects the CONTINUOUS contagion pressure that
-- persists longer — even if follow-on announcements cluster in 2-3 weeks, the
-- causal influence of a peer announcement lingers for ~30 days in hiring freezes
-- and board-level decisions.
-- Both are unvalidated. July 2026 calibration target: fit both against lag distribution.
--
-- THIS MIGRATION
-- ──────────────
-- 1. INSERT sectorContagionAgent.decayLambda → engine_calibration_constants
-- 2. INSERT sectorContagionAgent.macroTriggerFraction (companion constant)
-- 3. Log to scoring_architecture_log
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. Schema fix — add missing columns introduced after WS9 table creation ──
-- engine_calibration_constants was created in 20260615000001 without these
-- columns. Added here so INSERTs below succeed on a fresh deploy.
ALTER TABLE public.engine_calibration_constants
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS added_in_version TEXT;

-- ── 1. Register decay constants in engine_calibration_constants ───────────────
INSERT INTO public.engine_calibration_constants (key, value, provenance, description, status, cohort_scope, added_in_version)
VALUES
  (
    'sectorContagionAgent.decayLambda',
    '0.023',
    'uncalibrated_placeholder',
    'GAP-A02 — Exponential decay constant λ for peer contagion recency weighting. '
    'At λ=0.023: a peer cut 30 days ago carries 50% weight (half-life=30.1 days); '
    '100 days ago carries 10% weight. '
    'ESTIMATED: developer choice based on qualitative analysis of 2022-2024 sector wave timing '
    '(follow-on announcements observed to cluster in 2-6 weeks). '
    'NOT regression-fitted. '
    'Calibration method: fit exponential decay to the lag distribution between first '
    'and follow-on announcements across all documented sector waves in layoffs.fyi 2022-2024. '
    'INCONSISTENCY: signalDecayModel.sector_contagion uses 21-day half-life (λ≈0.033); '
    'this constant uses 30-day half-life (λ=0.023). Both are ESTIMATED. '
    'July 2026 calibration target: unify under one regression-derived value.',
    'active',
    'GLOBAL',
    'v40.0'
  ),
  (
    'sectorContagionAgent.macroTriggerFraction',
    '0.40',
    'uncalibrated_placeholder',
    'GAP-A02 — Fraction of sector companies cutting simultaneously above which cuts '
    'are treated as macro-driven rather than causal contagion. '
    'ANALYST_DERIVED: 2022 tech wave analysis (analyst observation, not regression). '
    'At 8% sector fraction (July 2022): ~70% contagion. '
    'At 38% sector fraction (Nov 2022): ~45% contagion → inflection at ~35-40%. '
    'Threshold set at 0.40 = midpoint of observed inflection range. '
    'Calibration requires regression on contagion% vs sectorFraction across all waves.',
    'active',
    'GLOBAL',
    'v40.0'
  )
ON CONFLICT (key, status, cohort_scope) DO NOTHING;


-- ── 2. Log to scoring_architecture_log ───────────────────────────────────────
INSERT INTO public.scoring_architecture_log (
  dimension_key,
  change_type,
  description,
  migration_ref,
  created_at
) VALUES (
  'peer_contagion_decay_label',
  'audit_fix',
  'GAP-A02: Registered sectorContagionAgent.decayLambda=0.023 (30-day half-life) and '
  'macroTriggerFraction=0.40 in engine_calibration_constants with provenance=''uncalibrated_placeholder''. '
  'Previously these were hardcoded TypeScript constants with no DB record, no ESTIMATED label, '
  'and no recalibrate-engine override path. '
  'Inconsistency documented: signalDecayModel.sector_contagion=21 days vs sectorContagionAgent=30 days. '
  'Code fix: sectorContagionAgent.ts now routes through getConstant(); '
  'peerContagionEngine.recencyWeight() fallback fixed to read sector_contagion (21d) before step-band. '
  'PeerContagionPanel: added ESTIMATED decay disclosure badge.',
  '20260623000013',
  NOW()
)
ON CONFLICT DO NOTHING;
