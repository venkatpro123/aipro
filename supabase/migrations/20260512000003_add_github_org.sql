-- 20260512000003_add_github_org.sql — v22.0
--
-- Adds `github_org` to `company_intelligence` so the `ingest-github` Edge
-- Function can resolve a company → GitHub organization slug and pull recent
-- commit-velocity stats. A sustained drop in cross-org commit volume is a
-- low-confidence stealth hiring-freeze / shrinking-eng-team signal.
--
-- Seed list = top engineering employers we already track. New entries can be
-- added by `UPDATE company_intelligence SET github_org = '...' WHERE company_name = '...'`
-- — no follow-on migration needed.

ALTER TABLE public.company_intelligence
  ADD COLUMN IF NOT EXISTS github_org TEXT;

CREATE INDEX IF NOT EXISTS idx_company_intelligence_github_org
  ON public.company_intelligence (github_org)
  WHERE github_org IS NOT NULL;

-- Seed top-50 known orgs. UPSERT-pattern: only updates where the row exists
-- AND the column is currently null, so re-running this migration is safe.
DO $$
DECLARE
  v_seed JSONB := '[
    {"company": "google",       "org": "google"},
    {"company": "microsoft",    "org": "microsoft"},
    {"company": "amazon",       "org": "aws"},
    {"company": "meta",         "org": "facebook"},
    {"company": "apple",        "org": "apple"},
    {"company": "netflix",      "org": "Netflix"},
    {"company": "nvidia",       "org": "NVIDIA"},
    {"company": "openai",       "org": "openai"},
    {"company": "anthropic",    "org": "anthropics"},
    {"company": "salesforce",   "org": "salesforce"},
    {"company": "oracle",       "org": "oracle"},
    {"company": "ibm",          "org": "IBM"},
    {"company": "intel",        "org": "intel"},
    {"company": "cisco",        "org": "cisco"},
    {"company": "adobe",        "org": "adobe"},
    {"company": "snowflake",    "org": "snowflakedb"},
    {"company": "databricks",   "org": "databricks"},
    {"company": "stripe",       "org": "stripe"},
    {"company": "shopify",      "org": "Shopify"},
    {"company": "uber",         "org": "uber"},
    {"company": "airbnb",       "org": "airbnb"},
    {"company": "atlassian",    "org": "atlassian"},
    {"company": "twilio",       "org": "twilio"},
    {"company": "dropbox",      "org": "dropbox"},
    {"company": "cloudflare",   "org": "cloudflare"},
    {"company": "datadog",      "org": "DataDog"},
    {"company": "palantir",     "org": "palantir"},
    {"company": "spotify",      "org": "spotify"},
    {"company": "figma",        "org": "figma"},
    {"company": "vercel",       "org": "vercel"},
    {"company": "github",       "org": "github"},
    {"company": "tcs",          "org": "tcs-cto-office"},
    {"company": "infosys",      "org": "Infosys"},
    {"company": "wipro",        "org": "wipro-opensource"},
    {"company": "hcl_tech",     "org": "hcl-tech"},
    {"company": "cognizant",    "org": "cognizant"},
    {"company": "accenture",    "org": "Accenture"},
    {"company": "capgemini",    "org": "Capgemini"},
    {"company": "sap",          "org": "SAP"},
    {"company": "tesla",        "org": "teslamotors"}
  ]'::JSONB;
  v_row JSONB;
BEGIN
  FOR v_row IN SELECT jsonb_array_elements(v_seed) LOOP
    UPDATE public.company_intelligence
       SET github_org = v_row->>'org'
     WHERE company_name = v_row->>'company'
       AND (github_org IS NULL OR github_org = '');
  END LOOP;
END $$;

COMMENT ON COLUMN public.company_intelligence.github_org IS
  'GitHub organization slug — populated for companies whose public OSS activity '
  'serves as a stealth hiring signal. Consumed by ingest-github Edge Function '
  'to detect commit-velocity drops > 40% (writes to breaking_news_events).';
