-- v40.0 EU citizenship region field
-- Adds citizenship_region to user_profiles so the visa risk engine can
-- differentiate EU citizens on non-EU work visas (who have 27-country fallback
-- mobility) from non-EU nationals on the same visa (who have no such safety net).
--
-- A German national on a UK Skilled Worker visa should receive dependencyScore ~50
-- (vs. 72 for a non-EU national), risk capped at MODERATE, and amplifier 1.10
-- (vs. 1.30) — because worst-case is "return to EU job market", not
-- "return to home country and restart from scratch".
--
-- Values: eu | us_citizen | uk_citizen | au_citizen | ca_citizen | other | NULL
-- NULL = not provided → treated as 'other' by the engine (no fallback discount applied).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS citizenship_region TEXT;

-- Constrain to the enum values the engine knows about
ALTER TABLE user_profiles
  ADD CONSTRAINT citizenship_region_valid
  CHECK (
    citizenship_region IS NULL
    OR citizenship_region IN ('eu', 'us_citizen', 'uk_citizen', 'au_citizen', 'ca_citizen', 'other')
  );

COMMENT ON COLUMN user_profiles.citizenship_region IS
  'Passport/citizenship region, separate from visa_status. eu = EU/EEA citizen on any work visa. '
  'Used by visaRiskEngine to apply EU fallback mobility discount (27-country job market access '
  'without sponsorship). NULL = not provided; engine treats as ''other'' (no discount).';
