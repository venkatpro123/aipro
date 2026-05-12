-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 20260509000002_create_user_profiles.sql
-- Purpose:   v15.0 personalization profile.
--            Captures the user-supplied attributes that modulate company-level
--            risk into a per-user assessment: salary band, visa status, metro,
--            tenure. Drives action ranking (actionPersonalizationEngine) and
--            visible UI re-render in the Analysis/Actions tabs.
--
-- Privacy:   Sensitive PII (visa_status especially). RLS denies cross-user
--            reads and writes. last_confirmed_at lets the UI re-prompt every
--            90 days with a single-confirm action so values stay current.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salary_band       TEXT CHECK (salary_band IN ('<50k','50-100k','100-150k','150-250k','250k+')),
  visa_status       TEXT CHECK (visa_status IN ('citizen','permanent_resident','h1b','l1','opt','other','na')),
  metro             TEXT,
  tenure_years      NUMERIC(4,1) CHECK (tenure_years >= 0 AND tenure_years <= 60),
  last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_self'
  ) THEN
    EXECUTE 'CREATE POLICY "user_profiles_self" ON user_profiles
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END
$do$;

CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_profiles_updated_at();
