-- Phase 3: Career Readiness Center — readiness score columns on user_profiles

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'resume_readiness_score') THEN
    ALTER TABLE user_profiles ADD COLUMN resume_readiness_score INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'linkedin_readiness_score') THEN
    ALTER TABLE user_profiles ADD COLUMN linkedin_readiness_score INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'interview_readiness_score') THEN
    ALTER TABLE user_profiles ADD COLUMN interview_readiness_score INTEGER;
  END IF;
END $$;
