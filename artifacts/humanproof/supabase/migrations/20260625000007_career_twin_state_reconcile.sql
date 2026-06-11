-- ═══════════════════════════════════════════════════════════════════════════
-- Reconcile career_twin_state to the schema the app actually writes.
--
-- The live table was created from the leaner root migration and is MISSING the
-- columns careerTwinService.syncTwinFromProfile() upserts — audit_score_history,
-- outcome_success_rates, last_outcome_sync, profile_completeness. Because every
-- twin write is fire-and-forget with a swallowed .catch(), those writes have
-- been silently failing: the Career Twin's score history, learned outcome rates,
-- and the Phase-3 stagnation detector (which reads audit_score_history) have had
-- no data. Adding the columns idempotently makes the whole memory/learning loop
-- actually persist.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE career_twin_state ADD COLUMN IF NOT EXISTS audit_score_history   JSONB DEFAULT '[]'::jsonb;
ALTER TABLE career_twin_state ADD COLUMN IF NOT EXISTS outcome_success_rates JSONB DEFAULT '{}'::jsonb;
ALTER TABLE career_twin_state ADD COLUMN IF NOT EXISTS last_outcome_sync     TIMESTAMPTZ;
ALTER TABLE career_twin_state ADD COLUMN IF NOT EXISTS score_at_last_update  NUMERIC;
ALTER TABLE career_twin_state ADD COLUMN IF NOT EXISTS profile_completeness  INTEGER DEFAULT 0;

-- Ask PostgREST to reload its schema cache so the new columns are queryable now.
NOTIFY pgrst, 'reload schema';
