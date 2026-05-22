-- Migration: 20260623000004_hard_floor_kill_switches.sql
--
-- Documents the kill-switch floor system change from sigmoid to hard floors.
--
-- FIVE BUGS FIXED:
--
-- Bug 1 (Critical) — Sigmoid floor was non-deterministic near the threshold:
--   sigmoidFloor(65, threshold=68, floor=72) = 65 (unchanged).
--   A company with confirmed layoff news and formula score of 65 received NO floor.
--   The sigmoid was designed to avoid cliff edges but violated the "minimum score"
--   contract documented everywhere ("floor at 72 means score ≥ 72").
--   Fix: replaced with hard Math.max(score, floor). score = floor when floor > score.
--
-- Bug 2 (Critical) — _formulaScorePreFloor never populated:
--   KillSwitchFloorBadge referenced (result._formulaScorePreFloor ?? result.total).
--   Since the field was never set, it always fell back to result.total (post-floor score).
--   Badge showed "Floor: 72 → Formula: 72" (meaningless).
--   Fix: preKillSwitchScore now stored as _formulaScorePreFloor in ScoreResult,
--   threaded through HybridResult and hybridResultMapper.
--
-- Bug 3 (Selection) — Multi-floor winner selection:
--   Was: candidates.sort((a,b) => b.score - a.score) — sorts by sigmoid result.
--   Now: candidates.sort((a,b) => b.floor - a.floor) — sorts by floor value directly.
--   With hard floors, score === floor, so these are equivalent.
--   The "highest floor wins" invariant is now explicit and guaranteed.
--
-- Bug 4 (Display) — SignalAttributionWaterfall showed only the winning kill-switch:
--   Was: (+{ksAdjustment}) ({ksName})  ← single winner only.
--   Now: (+{ksAdjustment}) ({ksName} +N more)  ← all activated surfaces count.
--
-- Bug 5 (Badge display) — KillSwitchFloorBadge now shows count of all active floors:
--   Was: "Floor: 72 → Formula: X" (single winner, no indication of co-firing).
--   Now: "Floor: 72 → Formula: X +2 more" when multiple floors fired.
--   Title tooltip lists all fired floors with their values.
--
-- VERIFIED SCENARIOS:
--   All four simultaneous (score=30): adjusted=72, winner=confirmed_recent_layoff_news
--   WARN+news simultaneous (score=55): adjusted=72, winner=confirmed_recent_layoff_news
--   Score already above all floors (score=75): no adjustment
--   Previously-broken case (score=65, news floor=72): NOW adjusted=72 (sigmoid gave 65)

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
  'kill_switch_hard_floor_system',
  0.00,
  'regression_derived',
  'Kill-switch floors are hard Math.max(score, floor) constraints, not sigmoid blends. '
  'Floor values: KS-A=72 (confirmed news ≤30d, confidence≥0.85), '
  'KS-B=65 (distress triad: L1>0.75+negativeFCF+stock<-30%), '
  'KS-C=58 (hiring freeze+layoff history+sector contagion≥0.45), '
  'KS-D=52 (private company, L1≥0.68, no prior rounds, no hire trend data). '
  'When multiple fire: all recorded in killSwitchFloors; highest floor wins; '
  'score = Math.max(rawComposite, max_active_floor).',
  '2026-06-23',
  'Replaced sigmoid floors (which failed for scores near threshold). '
  'sigmoidFloor(65, threshold=68, floor=72) returned 65 — the stated floor=72 was ineffective '
  'for scores already in range [62, 72]. Hard floors guarantee the contract. '
  '_formulaScorePreFloor now populated from preKillSwitchScore so badge shows accurate '
  '"Floor: 72 → Formula: 65" instead of the previous "Floor: 72 → Formula: 72".',
  now(),
  now()
)
ON CONFLICT (dimension_key)
DO UPDATE SET
  source_description = EXCLUDED.source_description,
  notes              = EXCLUDED.notes,
  updated_at         = now();

