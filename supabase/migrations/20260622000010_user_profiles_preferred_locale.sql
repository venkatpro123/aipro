-- v40.0 — Persistent locale preference per user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='user_profiles') THEN
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS preferred_locale TEXT
        CHECK (preferred_locale IS NULL OR preferred_locale IN ('en','es','pt','fr','de','hi','ja','zh'));
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='user_profiles' AND indexname='idx_user_profiles_preferred_locale') THEN
      CREATE INDEX idx_user_profiles_preferred_locale
        ON user_profiles (preferred_locale)
        WHERE preferred_locale IS NOT NULL;
    END IF;
  END IF;
END $$;
