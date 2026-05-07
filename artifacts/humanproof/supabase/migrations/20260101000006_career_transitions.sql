-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000006_career_transitions.sql
-- Purpose:   Career Twin community database — real transition stories.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS career_transitions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  from_role             TEXT        NOT NULL,
  from_risk_score       INTEGER,
  from_experience_years INTEGER,
  to_role               TEXT        NOT NULL,
  months_to_transition  INTEGER,
  income_change_pct     INTEGER,
  what_worked           TEXT,
  country               TEXT        NOT NULL DEFAULT 'India',
  city                  TEXT,
  is_verified           BOOLEAN     NOT NULL DEFAULT false,
  moderation_status     TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (moderation_status IN ('pending','approved','rejected')),
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ct_from_role    ON career_transitions (from_role);
CREATE INDEX IF NOT EXISTS idx_ct_to_role      ON career_transitions (to_role);
CREATE INDEX IF NOT EXISTS idx_ct_status       ON career_transitions (moderation_status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_country_city ON career_transitions (country, city);

ALTER TABLE career_transitions ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='career_transitions' AND policyname='users_submit_transitions') THEN
    EXECUTE 'CREATE POLICY "users_submit_transitions" ON career_transitions FOR INSERT WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='career_transitions' AND policyname='read_approved_transitions') THEN
    EXECUTE 'CREATE POLICY "read_approved_transitions" ON career_transitions FOR SELECT USING (moderation_status = ''approved'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='career_transitions' AND policyname='users_read_own_transitions') THEN
    EXECUTE 'CREATE POLICY "users_read_own_transitions" ON career_transitions FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='career_transitions' AND policyname='service_manage_transitions') THEN
    EXECUTE 'CREATE POLICY "service_manage_transitions" ON career_transitions FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END
$do$;
