-- v40.1 performance_tier field on user_profiles
--
-- performanceTier has D4 weight 0.18 (tied for 2nd-highest single-field impact)
-- but was never persisted — every new session defaulted to "average" regardless
-- of what the user had previously self-reported in LayoffInputForm.
--
-- This column lets ProfileSetupModal capture the value once and have
-- LayoffCalculator pre-populate the main form from UserProfile on return visits.
-- analyzePerformanceCredibility() in layoffScoreEngine.ts may downgrade 'top'
-- to 'average' when contradicting signals are detected — the engine-effective
-- tier may differ from the stored value (which is the user's self-report).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS performance_tier TEXT;

ALTER TABLE user_profiles
  ADD CONSTRAINT performance_tier_valid
  CHECK (
    performance_tier IS NULL
    OR performance_tier IN ('top', 'average', 'below', 'unknown')
  );

COMMENT ON COLUMN user_profiles.performance_tier IS
  'Self-reported performance tier. Feeds D4 (weight 0.18) in the scoring engine. '
  'Persisted so LayoffInputForm pre-populates from the last profile save rather '
  'than defaulting to ''average'' every session. Engine may downgrade ''top'' via '
  'analyzePerformanceCredibility() when contradicting signals are present.';
