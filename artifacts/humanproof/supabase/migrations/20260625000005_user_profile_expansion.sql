-- Phase 5 (Career OS): Adaptive Personalization — 6 new user_profiles fields.
-- These feed the decision engine (risk_tolerance shifts the LEAVE_NOW threshold,
-- geographic_mobility suppresses GEOGRAPHIC_ARBITRAGE, debt adjusts effective
-- runway) and the CareerTwinPanel "what the twin knows about you" surface.

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS risk_tolerance text
  CHECK (risk_tolerance IN ('conservative','moderate','aggressive'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS geographic_mobility text
  CHECK (geographic_mobility IN ('none','same_country','global'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS job_search_constraints text[];

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS monthly_debt_obligations_usd numeric;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS manager_relationship_quality text
  CHECK (manager_relationship_quality IN ('strong','neutral','strained','unknown'));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career_values text[];
