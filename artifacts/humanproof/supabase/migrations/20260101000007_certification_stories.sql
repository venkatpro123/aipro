-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260101000007_certification_stories.sql
-- Purpose:   User-submitted certification success stories.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS certification_stories (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  story_text   TEXT        NOT NULL,
  word_count   INTEGER,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','featured')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cs_status ON certification_stories (status, submitted_at DESC);

ALTER TABLE certification_stories ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certification_stories' AND policyname='users_submit_stories') THEN
    EXECUTE 'CREATE POLICY "users_submit_stories" ON certification_stories FOR INSERT WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certification_stories' AND policyname='read_approved_stories') THEN
    EXECUTE 'CREATE POLICY "read_approved_stories" ON certification_stories FOR SELECT USING (status IN (''approved'',''featured''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certification_stories' AND policyname='users_read_own_stories') THEN
    EXECUTE 'CREATE POLICY "users_read_own_stories" ON certification_stories FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='certification_stories' AND policyname='service_manage_stories') THEN
    EXECUTE 'CREATE POLICY "service_manage_stories" ON certification_stories FOR ALL USING (auth.role() = ''service_role'')';
  END IF;
END
$do$;
