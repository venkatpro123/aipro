-- 20260512000002_career_page_snapshots.sql — v22.0
--
-- Career-page diff state.
-- The `ingest-careers` Edge Function fetches each company's /careers HTML
-- once per day, counts job-link tags, and stores a snapshot here. When the
-- week-over-week open-roles count drops > 25%, it emits a row to
-- `breaking_news_events` with confidence='medium' and a "possible hiring
-- freeze" headline.
--
-- WHY A SEPARATE TABLE
-- ────────────────────
-- The diff state (snapshot history) is too noisy to jam into
-- `company_intelligence` and isn't user-facing on its own. We only need 7-14
-- days of history to compute the WoW delta — older rows are pruned on each
-- ingest cycle.

CREATE TABLE IF NOT EXISTS public.career_page_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      TEXT NOT NULL,        -- canonical key (matches company_intelligence.company_name)
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  open_roles_count  INTEGER NOT NULL,     -- count of job-link anchors found
  snapshot_hash     TEXT,                 -- optional SHA of HTML body for change detection
  careers_url       TEXT NOT NULL,        -- the URL fetched (e.g. https://www.cognizant.com/careers)
  fetch_status      TEXT NOT NULL DEFAULT 'ok'
                      CHECK (fetch_status IN ('ok','timeout','http_error','parse_error')),
  http_status       INTEGER,
  /** Avoid double-counting same-day re-runs */
  UNIQUE (company_name, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_career_snapshots_company_recent
  ON public.career_page_snapshots (company_name, fetched_at DESC);

ALTER TABLE public.career_page_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read so the analytics tab can show "open roles over time" later;
-- service_role only for writes (ingest-careers Edge Function).
CREATE POLICY "career_snapshots_public_read"
  ON public.career_page_snapshots FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.career_page_snapshots FROM anon, authenticated;

COMMENT ON TABLE public.career_page_snapshots IS
  'Daily snapshots of company /careers page open-roles count. '
  'Used by ingest-careers Edge Function to detect WoW hiring-freeze signals '
  'and emit breaking_news_events rows. Older than 14 days pruned automatically.';
