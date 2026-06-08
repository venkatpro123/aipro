-- Phase 4 Migration: Career Twin profile columns (Tool 10)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career_goals JSONB DEFAULT '[]';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career_preferences JSONB DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS skills_inventory JSONB DEFAULT '{}';
