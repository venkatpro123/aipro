-- Migration: 20260623000009_d8_weight_redistribution.sql
--
-- BUG-02 fix: Explicit D8 weight redistribution when flag is gated off.
--
-- THE BUG
-- ───────
-- When v39_d8_ai_efficiency_active=false AND neither the EFFICIENCY cohort
-- nor Condition3 heuristic fires, D8=0 and W.D8_aiEfficiencyRestructuring=0.09.
-- The rawScore formula computes:
--   rawScore += D8 * W.D8 = 0 * 0.09 = 0
-- This silently discards 9% of the formula budget:
--   - Score ceiling drops from 100 → 91 (all-risk scenario)
--   - Neutral-signal score drifts from 50 → 46 pts (0.5 × 0.91 × 100)
--   - Formula no longer sums to 1.00 — the invariant is broken invisibly
--
-- THE FIX (layoffScoreEngine.ts)
-- ──────────────────────────────
-- After W (the effective weight set) is computed and before rawScore is
-- evaluated, check for redistribution condition:
--   _d8RedistributedBump = !_d8FlagActive && D8 === 0 && W.D8 > 0 ? W.D8/3 : 0
--
-- When bump > 0, W is rewritten (spread + override):
--   W.D1_taskAutomatability   += bump   (from 0.18 → ~0.21)
--   W.D2_aiToolMaturity       += bump   (from 0.14 → ~0.17)
--   W.D3_augmentationRisk     += bump   (from 0.09 → ~0.12)
--   W.D8_aiEfficiencyRestructuring = 0
-- Formula sum remains 1.00. The ceiling is restored to 100.
--
-- Redistribution condition is flag-aware, not just D8-value-aware:
--   _d8FlagActive = true  → logistic evaluated, D8 may be 0 (no risk found)
--                           → NO redistribution (logistic is authoritative)
--   _d8FlagActive = false → flag gated, D8 structurally unavailable
--                           → REDISTRIBUTE when D8 = 0
--
-- Why D1/D2/D3? These are the three AI-facing dimensions (role automatability,
-- tool maturity, augmentation risk) that collectively proxy AI efficiency
-- restructuring risk when the validated logistic is unavailable. Equal thirds
-- avoids introducing directional bias not supported by the current data.
--
-- TRANSPARENCY
-- ────────────
-- TransparencyTab EffectiveWeightsPanel now shows:
--   D8 row label: "AI Efficiency (redistributed)" with →D1/D2/D3 badge
--   D8 Formula Wt column: "0%" (redistributed away)
--   Banner (amber): "D8 (AI efficiency restructuring) is currently flag-gated.
--     Its 0.09 weight is redistributed equally to D1/D2/D3 (+3% each),
--     preserving the 1.00 formula sum. The Hyperscaler D8 Proxy (+12 pts)
--     is applied separately when conditions are met and is labeled ESTIMATED."
--
-- ScoreResult new fields:
--   d8WeightRedistributed: true when redistribution happened
--   d8RedistributedBumpPerDimension: per-D1/D2/D3 bump (≈ 0.030)
--
-- FILES CHANGED
-- ─────────────
-- layoffScoreEngine.ts:
--   - const W → let W (allows W reassignment)
--   - redistribution block inserted after W computation, before rawScore
--   - d8WeightRedistributed, d8RedistributedBumpPerDimension added to ScoreResult
--   - both returned in calculateLayoffScore()
--
-- hybridResult.ts:
--   - d8WeightRedistributed, d8RedistributedBumpPerDimension added to HybridResult
--
-- TransparencyTab.tsx:
--   - d8WeightRedistributed, d8RedistributedBumpPerDimension added to
--     EffectiveWeightsPanel props and call site
--   - D8 inactive banner replaced by redistribution banner
--   - D8 row label / formula weight / badge updated for redistributed state
--
-- QUANTIFIED IMPACT
-- ─────────────────
-- Before (flag off, neutral signals, all scores = 0.5):
--   rawScore = 0.5 × (D1+D2+D3+D4+D6+D7+L1+L2) = 0.5 × 0.91 = 0.455 → 46 pts
--
-- After redistribution (flag off, neutral signals):
--   D1 weight = 0.18+0.03 = 0.21; D2 = 0.14+0.03 = 0.17; D3 = 0.09+0.03 = 0.12
--   rawScore = 0.5 × (0.21+0.17+0.12+0.18+0.04+0.06+0.16+0.06) = 0.5 × 1.00 = 0.50 → 50 pts
--   Score shift: +4 pts at neutral (restores correct neutral baseline)
--
-- For a high-risk company (all non-D8 signals = 0.85):
--   Before: 0.85 × 0.91 = 0.774 → 77 pts
--   After:  0.85 × 1.00 = 0.850 → 85 pts
--   Shift: +8 pts (restores correct ceiling)
--
-- These are CORRECTION shifts, not artificial score inflation — the formula
-- was previously underweighting because of the silent budget loss.

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
  'D8_weight_redistribution_flag_gate',
  0.09,
  'regression_derived',
  'D8_aiEfficiencyRestructuring (formula weight 0.09) is redistributed equally '
  'to D1/D2/D3 (+0.03 each) when v39_d8_ai_efficiency_active=false and D8=0. '
  'Redistribution is flag-aware: when the flag is on and the logistic scores 0 '
  '(no efficiency risk), no redistribution — the logistic is authoritative. '
  'Only when the flag is gated off does the budget get structurally wasted and '
  'require redistribution to preserve the 1.00 formula sum invariant. '
  'TransparencyTab surfaces this via a flag-gated redistribution banner and '
  'D8 row labeled REDISTRIBUTED with →D1/D2/D3 badge.',
  '2026-06-23',
  'Before: flag off → rawScore ceiling = 0.91, neutral score drifts 50→46 pts. '
  'After redistribution: ceiling = 1.00, neutral score = 50 pts (correct). '
  'Shift at neutral signals: +4 pts. Shift at 0.85-risk signals: +8 pts. '
  'These are correction shifts, not inflation — the prior formula was underweighting. '
  'd8WeightRedistributed + d8RedistributedBumpPerDimension added to ScoreResult/HybridResult.',
  NOW(),
  NOW()
)
ON CONFLICT (dimension_key) DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = NOW();
