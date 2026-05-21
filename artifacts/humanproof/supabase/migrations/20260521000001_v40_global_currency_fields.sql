-- v40.0 Global Currency Fields
-- Adds local_currency_code and local_monthly_salary_raw to user_profiles.
--
-- Purpose: financial runway advice is now PPP-calibrated per market.
--   local_currency_code  — ISO 4217 code (e.g. 'SGD', 'PHP', 'GBP').
--                          Null = not set; client defaults to USD.
--   local_monthly_salary_raw — gross monthly salary in the user's local currency.
--                          Stored alongside monthly_salary_usd (pipeline uses USD;
--                          UI uses this for "SGD 8,500 = ~$6,340 USD" display).
--
-- RLS: user_profiles already has row-level security gated on auth.uid() = user_id.
--      These columns inherit the existing policy with no additional grants needed.
--
-- Rollback: DROP COLUMN local_currency_code, local_monthly_salary_raw (no data loss
--           risk — both columns are nullable additive-only additions).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS local_currency_code       TEXT            DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS local_monthly_salary_raw  NUMERIC(15, 2)  DEFAULT NULL;

-- Index on local_currency_code for future cohort aggregations (e.g. median runway
-- by currency, PPP-adjusted benchmark comparisons). Low cardinality (~48 values)
-- so a btree index is appropriate.
CREATE INDEX IF NOT EXISTS idx_user_profiles_local_currency_code
  ON user_profiles (local_currency_code)
  WHERE local_currency_code IS NOT NULL;

COMMENT ON COLUMN user_profiles.local_currency_code IS
  'ISO 4217 code for the user''s local currency — auto-detected from metro + visa_status, user-overridable. Used to format salary display and PPP-calibrate advice amounts.';

COMMENT ON COLUMN user_profiles.local_monthly_salary_raw IS
  'Gross monthly salary in local_currency_code units. Stored raw so UI can show "SGD 8,500 = ~$6,340 USD" without re-prompting. Pipeline calculations use monthly_salary_usd (derived from this value via static exchange rate at time of save).';
