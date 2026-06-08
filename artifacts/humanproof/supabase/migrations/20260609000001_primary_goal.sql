-- Phase 4: Career Twin — store user's primary career goal
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT;
