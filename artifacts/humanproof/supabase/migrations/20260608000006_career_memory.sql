-- Career Memory: stores user-recorded career decisions
CREATE TABLE IF NOT EXISTS career_decisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  decision_type TEXT NOT NULL, -- 'stayed','left','promoted','pivoted','negotiated','other'
  company_name  TEXT,
  role_title    TEXT,
  decided_at    DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE career_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_career_decisions"
  ON career_decisions
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS career_decisions_user_date
  ON career_decisions (user_id, decided_at DESC);
