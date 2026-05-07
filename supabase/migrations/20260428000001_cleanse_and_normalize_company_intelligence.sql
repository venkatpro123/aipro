-- ══════════════════════════════════════════════════════════════════════════════
-- COMPANY INTELLIGENCE: CLEANSE & NORMALIZE
-- Phase 1 of 2 — Fixes data quality issues in the existing dataset
-- Created: 2026-04-28
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. SCHEMA HARDENING ──────────────────────────────────────────────────────
-- Add safe defaults so partial inserts (missing company_size/stage) don't fail

ALTER TABLE public.company_intelligence
    ALTER COLUMN company_size SET DEFAULT 'unknown',
    ALTER COLUMN stage SET DEFAULT 'unknown',
    ALTER COLUMN archetype SET DEFAULT 'unknown';

-- Add GIN indexes for JSONB signal search performance
CREATE INDEX IF NOT EXISTS idx_company_intel_financial_signals
    ON public.company_intelligence USING GIN (financial_signals);

CREATE INDEX IF NOT EXISTS idx_company_intel_layoff_history
    ON public.company_intelligence USING GIN (layoff_history);

CREATE INDEX IF NOT EXISTS idx_company_intel_region
    ON public.company_intelligence (region);

CREATE INDEX IF NOT EXISTS idx_company_intel_is_public
    ON public.company_intelligence (is_public);

-- ── 2. RESOLVE DUPLICATE NAME VARIANTS ───────────────────────────────────────
-- Canonical rule: prefer the richer seed.sql version (company_size + stage set).
-- We UPDATE the canonical name to match, then DELETE the inferior duplicate.
-- Each block is safe to re-run (DO NOTHING if the target already matches).

-- 2a. Google (Alphabet) → canonical "Google (Alphabet)" already set; remove bare "Google"
UPDATE public.company_intelligence
SET
    company_name      = 'Google (Alphabet)',
    ticker            = 'GOOGL',
    is_public         = true,
    region            = 'US',
    employee_count    = 180000
WHERE company_name = 'Google'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Google (Alphabet)'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'Google'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Google (Alphabet)'
  );

-- 2b. Tata Consultancy Services (TCS) — merge bare "Tata Consultancy Services"
UPDATE public.company_intelligence
SET company_name = 'Tata Consultancy Services (TCS)',
    ticker       = 'TCS',
    is_public    = true,
    region       = 'IN',
    employee_count = 615000
WHERE company_name = 'Tata Consultancy Services'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Tata Consultancy Services (TCS)'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'Tata Consultancy Services'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Tata Consultancy Services (TCS)'
  );

-- 2c. HCL Technologies vs HCLTechnologies
UPDATE public.company_intelligence
SET company_name   = 'HCL Technologies',
    ticker         = 'HCLTECH',
    is_public      = true,
    region         = 'IN',
    employee_count = 227000
WHERE company_name = 'HCLTechnologies'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'HCL Technologies'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'HCLTechnologies'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'HCL Technologies'
  );

-- 2d. Twitter / X → canonical "X (Twitter)"
UPDATE public.company_intelligence
SET company_name = 'X (Twitter)',
    is_public    = false,
    region       = 'US',
    employee_count = 1500
WHERE company_name = 'Twitter / X'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'X (Twitter)'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'Twitter / X'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'X (Twitter)'
  );

-- 2e. Snap → canonical "Snap Inc."
UPDATE public.company_intelligence
SET company_name   = 'Snap Inc.',
    ticker         = 'SNAP',
    is_public      = true,
    region         = 'US',
    employee_count = 5000
WHERE company_name = 'Snap'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Snap Inc.'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'Snap'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Snap Inc.'
  );

-- 2f. McKinsey → canonical "McKinsey & Company"
UPDATE public.company_intelligence
SET company_name   = 'McKinsey & Company',
    is_public      = false,
    region         = 'GLOBAL',
    employee_count = 45000
WHERE company_name = 'McKinsey'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'McKinsey & Company'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'McKinsey'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'McKinsey & Company'
  );

-- 2g. ByteDance → canonical "ByteDance (TikTok)"
UPDATE public.company_intelligence
SET company_name   = 'ByteDance (TikTok)',
    is_public      = false,
    region         = 'APAC',
    employee_count = 110000
WHERE company_name = 'ByteDance'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'ByteDance (TikTok)'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'ByteDance'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'ByteDance (TikTok)'
  );

-- 2h. Samsung → canonical "Samsung Electronics"
UPDATE public.company_intelligence
SET company_name   = 'Samsung Electronics',
    ticker         = '005930',
    is_public      = true,
    region         = 'APAC',
    employee_count = 270000
WHERE company_name = 'Samsung'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Samsung Electronics'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'Samsung'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Samsung Electronics'
  );

-- 2i. Cognizant → canonical "Cognizant Technology Solutions"
UPDATE public.company_intelligence
SET company_name   = 'Cognizant Technology Solutions',
    ticker         = 'CTSH',
    is_public      = true,
    region         = 'US',
    employee_count = 340000
WHERE company_name = 'Cognizant'
  AND NOT EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Cognizant Technology Solutions'
  );

DELETE FROM public.company_intelligence
WHERE company_name = 'Cognizant'
  AND EXISTS (
      SELECT 1 FROM public.company_intelligence
      WHERE company_name = 'Cognizant Technology Solutions'
  );

-- ── 3. FIX SCORE SCALE INCONSISTENCY ─────────────────────────────────────────
-- Records seeded from 20260420000002 used 0-100 integers for company_risk_score.
-- Normalize any value > 1.5 back to [0, 1] range.

UPDATE public.company_intelligence
SET company_risk_score = ROUND((company_risk_score / 100.0)::NUMERIC, 3)
WHERE company_risk_score > 1.5;

UPDATE public.company_intelligence
SET market_risk_score = ROUND((market_risk_score / 100.0)::NUMERIC, 3)
WHERE market_risk_score > 1.5;

UPDATE public.company_intelligence
SET ai_exposure_index = ROUND((ai_exposure_index / 100.0)::NUMERIC, 3)
WHERE ai_exposure_index > 1.5;

UPDATE public.company_intelligence
SET confidence_score = ROUND((confidence_score / 100.0)::NUMERIC, 3)
WHERE confidence_score > 1.5;

-- ── 4. FIX ZERO / MISSING MARKET RISK SCORE ──────────────────────────────────
-- Records with market_risk_score = 0 but valid company_risk_score should inherit
-- a calibrated estimate based on stage and company_risk_score.

UPDATE public.company_intelligence
SET market_risk_score = ROUND(LEAST(company_risk_score * 0.75, 0.9)::NUMERIC, 3)
WHERE market_risk_score = 0.0
  AND company_risk_score > 0.0
  AND confidence_score > 0.5;

-- Declining-stage companies get an elevated market risk floor
UPDATE public.company_intelligence
SET market_risk_score = GREATEST(market_risk_score, 0.45)
WHERE stage = 'declining'
  AND market_risk_score < 0.45;

-- Hyper-growth / startup companies get a realistic market risk floor
UPDATE public.company_intelligence
SET market_risk_score = GREATEST(market_risk_score, 0.30)
WHERE stage IN ('startup', 'growth')
  AND archetype = 'hyper_growth'
  AND market_risk_score < 0.30;

-- ── 5. FIX ZERO CONFIDENCE SCORES ────────────────────────────────────────────
UPDATE public.company_intelligence
SET confidence_score = 0.70
WHERE confidence_score = 0.0;

-- ── 6. FIX ZERO AI EXPOSURE INDEX ────────────────────────────────────────────
-- Default minimum by industry if missing
UPDATE public.company_intelligence
SET ai_exposure_index = CASE
    WHEN industry ILIKE '%technology%' OR industry ILIKE '%software%' OR industry ILIKE '%saas%' THEN 0.55
    WHEN industry ILIKE '%artificial intelligence%' OR industry ILIKE '%AI%'                       THEN 0.80
    WHEN industry ILIKE '%consulting%' OR industry ILIKE '%IT services%'                          THEN 0.52
    WHEN industry ILIKE '%financial%' OR industry ILIKE '%fintech%' OR industry ILIKE '%banking%'  THEN 0.60
    WHEN industry ILIKE '%semiconductor%' OR industry ILIKE '%hardware%'                          THEN 0.55
    WHEN industry ILIKE '%media%' OR industry ILIKE '%entertainment%'                             THEN 0.45
    WHEN industry ILIKE '%retail%' OR industry ILIKE '%e-commerce%'                               THEN 0.40
    WHEN industry ILIKE '%healthcare%' OR industry ILIKE '%pharma%' OR industry ILIKE '%biotech%' THEN 0.48
    WHEN industry ILIKE '%manufacturing%' OR industry ILIKE '%automotive%'                        THEN 0.38
    WHEN industry ILIKE '%energy%' OR industry ILIKE '%utilities%'                                THEN 0.35
    ELSE 0.40
END
WHERE ai_exposure_index = 0.0;

-- ── 7. FILL MISSING COMPANY_SIZE / STAGE FROM DEFAULTS ───────────────────────
-- For records that ended up with the default 'unknown' from the schema change above,
-- map from employee_count where available.

UPDATE public.company_intelligence
SET company_size = CASE
    WHEN employee_count >= 100000 THEN 'enterprise'
    WHEN employee_count >= 10000  THEN 'large'
    WHEN employee_count >= 1000   THEN 'mid'
    WHEN employee_count >= 100    THEN 'small'
    ELSE 'small'
END
WHERE company_size = 'unknown'
  AND employee_count IS NOT NULL
  AND employee_count > 0;

-- Stage from archetype for remaining unknowns
UPDATE public.company_intelligence
SET stage = CASE
    WHEN archetype IN ('hyper_growth', 'aggressive_scaler') THEN 'growth'
    WHEN archetype = 'mature_profitable'                    THEN 'mature'
    WHEN archetype = 'restructuring'                        THEN 'restructuring'
    WHEN archetype = 'post_hypergrowth'                     THEN 'declining'
    WHEN archetype = 'volatile_startup'                     THEN 'growth'
    WHEN archetype = 'cost_optimizer'                       THEN 'restructuring'
    ELSE 'mature'
END
WHERE stage = 'unknown';

UPDATE public.company_intelligence
SET company_size = 'large'
WHERE company_size = 'unknown';

-- ── 8. STANDARDIZE INDUSTRY STRINGS ──────────────────────────────────────────
UPDATE public.company_intelligence SET industry = TRIM(industry);

-- Collapse near-duplicates
UPDATE public.company_intelligence SET industry = 'Technology'        WHERE industry IN ('Consumer Technology');
UPDATE public.company_intelligence SET industry = 'IT Services'       WHERE industry IN ('IT Services / BPO');
UPDATE public.company_intelligence SET industry = 'IT Services'       WHERE industry IN ('IT Services / Managed Services', 'IT Services / Telecom Tech');
UPDATE public.company_intelligence SET industry = 'Consulting'        WHERE industry IN ('Management Consulting', 'Professional Services / Consulting', 'IT Services / Consulting', 'Consulting / IT Services');
UPDATE public.company_intelligence SET industry = 'Financial Services' WHERE industry IN ('Fintech / Payments', 'Fintech / Brokerage', 'Fintech / BNPL', 'Fintech / Neobank', 'Crypto / Fintech');
UPDATE public.company_intelligence SET industry = 'Media & Entertainment' WHERE industry IN ('Media Streaming', 'Music Streaming / Media', 'Digital Media / Content');
UPDATE public.company_intelligence SET industry = 'E-Commerce'        WHERE industry IN ('E-Commerce / Home Goods', 'E-Commerce SaaS', 'E-Commerce / Gaming / Fintech');
UPDATE public.company_intelligence SET industry = 'Transportation'    WHERE industry IN ('Transportation / Ridesharing', 'Transportation / Delivery');
UPDATE public.company_intelligence SET industry = 'Social Media'      WHERE industry IN ('Social Media / AR', 'Social Media / Community Platform', 'Social Media / E-Commerce', 'Social Media / AI / Consumer Tech');
UPDATE public.company_intelligence SET industry = 'EdTech'            WHERE industry IN ('EdTech / Language Learning', 'EdTech / Online Learning');

-- ── 9. POPULATE MISSING TICKER / IS_PUBLIC / REGION ──────────────────────────
UPDATE public.company_intelligence SET ticker = 'GOOGL', is_public = true,  region = 'US'    WHERE company_name = 'Google (Alphabet)'               AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'META',  is_public = true,  region = 'US'    WHERE company_name = 'Meta'                              AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'AMZN',  is_public = true,  region = 'US'    WHERE company_name = 'Amazon'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'AAPL',  is_public = true,  region = 'US'    WHERE company_name = 'Apple'                             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'MSFT',  is_public = true,  region = 'US'    WHERE company_name = 'Microsoft'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'NVDA',  is_public = true,  region = 'US'    WHERE company_name = 'NVIDIA'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'CRM',   is_public = true,  region = 'US'    WHERE company_name = 'Salesforce'                        AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'ORCL',  is_public = true,  region = 'US'    WHERE company_name = 'Oracle'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'SAP',   is_public = true,  region = 'EU'    WHERE company_name = 'SAP'                               AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'ZM',    is_public = true,  region = 'US'    WHERE company_name = 'Zoom'                              AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DBX',   is_public = true,  region = 'US'    WHERE company_name = 'Dropbox'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'INTC',  is_public = true,  region = 'US'    WHERE company_name = 'Intel'                             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'IBM',   is_public = true,  region = 'US'    WHERE company_name = 'IBM'                               AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'CSCO',  is_public = true,  region = 'US'    WHERE company_name = 'Cisco Systems'                     AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'CSCO',  is_public = true,  region = 'US'    WHERE company_name = 'Cisco'                             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DELL',  is_public = true,  region = 'US'    WHERE company_name = 'Dell Technologies'                 AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'SNAP',  is_public = true,  region = 'US'    WHERE company_name = 'Snap Inc.'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'SHOP',  is_public = true,  region = 'US'    WHERE company_name = 'Shopify'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'ABNB',  is_public = true,  region = 'US'    WHERE company_name = 'Airbnb'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'UBER',  is_public = true,  region = 'US'    WHERE company_name = 'Uber'                              AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'LYFT',  is_public = true,  region = 'US'    WHERE company_name = 'Lyft'                              AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'TSLA',  is_public = true,  region = 'US'    WHERE company_name = 'Tesla'                             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'NFLX',  is_public = true,  region = 'US'    WHERE company_name = 'Netflix'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'SPOT',  is_public = true,  region = 'EU'    WHERE company_name = 'Spotify'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DIS',   is_public = true,  region = 'US'    WHERE company_name = 'Disney'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'WBD',   is_public = true,  region = 'US'    WHERE company_name = 'Warner Bros Discovery'             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'JPM',   is_public = true,  region = 'US'    WHERE company_name = 'JPMorgan Chase'                    AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'GS',    is_public = true,  region = 'US'    WHERE company_name = 'Goldman Sachs'                     AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'MS',    is_public = true,  region = 'US'    WHERE company_name = 'Morgan Stanley'                    AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'HSBC',  is_public = true,  region = 'EU'    WHERE company_name = 'HSBC'                              AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'PYPL',  is_public = true,  region = 'US'    WHERE company_name = 'PayPal'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'ACN',   is_public = true,  region = 'GLOBAL' WHERE company_name = 'Accenture'                        AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'TCS',   is_public = true,  region = 'IN'    WHERE company_name = 'Tata Consultancy Services (TCS)'   AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'INFY',  is_public = true,  region = 'IN'    WHERE company_name = 'Infosys'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'WIT',   is_public = true,  region = 'IN'    WHERE company_name = 'Wipro'                             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'HCLTECH', is_public = true, region = 'IN'   WHERE company_name = 'HCL Technologies'                  AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'CTSH',  is_public = true,  region = 'US'    WHERE company_name = 'Cognizant Technology Solutions'    AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'TECHM', is_public = true,  region = 'IN'    WHERE company_name = 'Tech Mahindra'                     AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'WMT',   is_public = true,  region = 'US'    WHERE company_name = 'Walmart'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'TGT',   is_public = true,  region = 'US'    WHERE company_name = 'Target'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'CAP',   is_public = true,  region = 'EU'    WHERE company_name = 'Capgemini'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'AVGO',  is_public = true,  region = 'US'    WHERE company_name = 'Broadcom'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'QCOM',  is_public = true,  region = 'US'    WHERE company_name = 'Qualcomm'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'ADBE',  is_public = true,  region = 'US'    WHERE company_name = 'Adobe'                             AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'NOW',   is_public = true,  region = 'US'    WHERE company_name = 'ServiceNow'                        AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'WDAY',  is_public = true,  region = 'US'    WHERE company_name = 'Workday'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'HUBS',  is_public = true,  region = 'US'    WHERE company_name = 'HubSpot'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'SNOW',  is_public = true,  region = 'US'    WHERE company_name = 'Snowflake'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DDOG',  is_public = true,  region = 'US'    WHERE company_name = 'Datadog'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'PLTR',  is_public = true,  region = 'US'    WHERE company_name = 'Palantir'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'CRWD',  is_public = true,  region = 'US'    WHERE company_name = 'CrowdStrike'                       AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'PANW',  is_public = true,  region = 'US'    WHERE company_name = 'Palo Alto Networks'                AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'TWLO',  is_public = true,  region = 'US'    WHERE company_name = 'Twilio'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DOCU',  is_public = true,  region = 'US'    WHERE company_name = 'DocuSign'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'TEAM',  is_public = true,  region = 'US'    WHERE company_name = 'Atlassian'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'U',     is_public = true,  region = 'US'    WHERE company_name = 'Unity Technologies'                AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'PATH',  is_public = true,  region = 'US'    WHERE company_name = 'UiPath'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'COIN',  is_public = true,  region = 'US'    WHERE company_name = 'Coinbase'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'HOOD',  is_public = true,  region = 'US'    WHERE company_name = 'Robinhood'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'PTON',  is_public = true,  region = 'US'    WHERE company_name = 'Peloton'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'W',     is_public = true,  region = 'US'    WHERE company_name = 'Wayfair'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'RBLX',  is_public = true,  region = 'US'    WHERE company_name = 'Reddit'                            AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DUOL',  is_public = true,  region = 'US'    WHERE company_name = 'Duolingo'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'COUR',  is_public = true,  region = 'US'    WHERE company_name = 'Coursera'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'GRAB',  is_public = true,  region = 'APAC'  WHERE company_name = 'Grab'                              AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'SE',    is_public = true,  region = 'APAC'  WHERE company_name = 'Sea Limited (Shopee / Garena)'     AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'PINS',  is_public = true,  region = 'US'    WHERE company_name = 'Pinterest'                         AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'BOX',   is_public = true,  region = 'US'    WHERE company_name = 'Box'                               AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'ESTC',  is_public = true,  region = 'US'    WHERE company_name = 'Elastic N.V.'                      AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'IOT',   is_public = true,  region = 'US'    WHERE company_name = 'Samsara'                           AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'VEEV',  is_public = true,  region = 'US'    WHERE company_name = 'Veeva Systems'                     AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'DASH',  is_public = true,  region = 'US'    WHERE company_name = 'DoorDash'                          AND (ticker IS NULL OR ticker = '');
UPDATE public.company_intelligence SET ticker = 'RDDT',  is_public = true,  region = 'US'    WHERE company_name = 'Reddit'                            AND (ticker IS NULL OR ticker = '');

-- Private companies
UPDATE public.company_intelligence SET is_public = false, region = 'US'    WHERE company_name IN ('OpenAI', 'Anthropic', 'Databricks', 'Stripe', 'Notion', 'Figma', 'Vercel', 'Scale AI', 'Cohere', 'Mistral AI', 'Hugging Face', 'Perplexity AI', 'Cursor (Anysphere)')  AND (is_public IS NULL OR is_public = false);
UPDATE public.company_intelligence SET is_public = false, region = 'US'    WHERE company_name IN ('McKinsey & Company', 'Deloitte', 'PwC') AND (is_public IS NULL);
UPDATE public.company_intelligence SET is_public = false, region = 'GLOBAL' WHERE company_name = 'DXC Technology' AND (is_public IS NULL);

-- ── 10. POPULATE EMPLOYEE_COUNT WHERE MISSING ─────────────────────────────────
UPDATE public.company_intelligence
SET employee_count = CASE company_name
    WHEN 'Google (Alphabet)'              THEN 180000
    WHEN 'Meta'                           THEN 72000
    WHEN 'Amazon'                         THEN 1500000
    WHEN 'Apple'                          THEN 161000
    WHEN 'Microsoft'                      THEN 221000
    WHEN 'NVIDIA'                         THEN 29000
    WHEN 'Salesforce'                     THEN 72000
    WHEN 'Oracle'                         THEN 143000
    WHEN 'SAP'                            THEN 105000
    WHEN 'Zoom'                           THEN 7400
    WHEN 'Dropbox'                        THEN 2500
    WHEN 'Intel'                          THEN 124800
    WHEN 'IBM'                            THEN 288000
    WHEN 'Cisco Systems'                  THEN 84000
    WHEN 'Cisco'                          THEN 84000
    WHEN 'Dell Technologies'              THEN 120000
    WHEN 'Snap Inc.'                      THEN 5000
    WHEN 'X (Twitter)'                    THEN 1500
    WHEN 'ByteDance (TikTok)'             THEN 110000
    WHEN 'Shopify'                        THEN 8300
    WHEN 'Airbnb'                         THEN 6900
    WHEN 'Uber'                           THEN 32000
    WHEN 'Lyft'                           THEN 4000
    WHEN 'Tesla'                          THEN 140000
    WHEN 'Netflix'                        THEN 13000
    WHEN 'Spotify'                        THEN 7000
    WHEN 'Disney'                         THEN 220000
    WHEN 'Warner Bros Discovery'          THEN 35000
    WHEN 'JPMorgan Chase'                 THEN 310000
    WHEN 'Goldman Sachs'                  THEN 45000
    WHEN 'Morgan Stanley'                 THEN 82000
    WHEN 'HSBC'                           THEN 220000
    WHEN 'PayPal'                         THEN 27200
    WHEN 'Stripe'                         THEN 7000
    WHEN 'Accenture'                      THEN 738000
    WHEN 'McKinsey & Company'             THEN 45000
    WHEN 'Deloitte'                       THEN 415000
    WHEN 'PwC'                            THEN 328000
    WHEN 'Capgemini'                      THEN 350000
    WHEN 'Tata Consultancy Services (TCS)' THEN 615000
    WHEN 'Infosys'                        THEN 315000
    WHEN 'Wipro'                          THEN 240000
    WHEN 'HCL Technologies'              THEN 227000
    WHEN 'Cognizant Technology Solutions' THEN 340000
    WHEN 'Tech Mahindra'                  THEN 148000
    WHEN 'Walmart'                        THEN 2100000
    WHEN 'Target'                         THEN 440000
    WHEN 'OpenAI'                         THEN 2000
    WHEN 'Databricks'                     THEN 5000
    WHEN 'Notion'                         THEN 600
    WHEN 'Figma'                          THEN 1200
    WHEN 'Samsung Electronics'            THEN 270000
    WHEN 'ServiceNow'                     THEN 22000
    WHEN 'Workday'                        THEN 17000
    WHEN 'HubSpot'                        THEN 7400
    WHEN 'Zendesk'                        THEN 6500
    WHEN 'Snowflake'                      THEN 6500
    WHEN 'Palantir'                       THEN 3750
    WHEN 'Datadog'                        THEN 5000
    WHEN 'Broadcom'                       THEN 60000
    WHEN 'Qualcomm'                       THEN 50000
    WHEN 'Adobe'                          THEN 30000
    WHEN 'CrowdStrike'                    THEN 8500
    WHEN 'Palo Alto Networks'             THEN 14000
    WHEN 'Coinbase'                       THEN 3200
    WHEN 'Robinhood'                      THEN 2200
    WHEN 'Peloton'                        THEN 3500
    WHEN 'Wayfair'                        THEN 14000
    WHEN 'Atlassian'                      THEN 11000
    WHEN 'Twilio'                         THEN 5900
    WHEN 'DocuSign'                       THEN 7100
    WHEN 'Unity Technologies'             THEN 4000
    WHEN 'Pinterest'                      THEN 3200
    WHEN 'Reddit'                         THEN 1900
    WHEN 'Discord'                        THEN 650
    WHEN 'Duolingo'                       THEN 700
    WHEN 'Coursera'                       THEN 1300
    WHEN 'Box'                            THEN 2400
    WHEN 'Qualtrics'                      THEN 4600
    WHEN 'Samsara'                        THEN 3000
    WHEN 'WeWork'                         THEN 2000
    WHEN 'BuzzFeed'                       THEN 800
    WHEN 'Veeva Systems'                  THEN 6000
    WHEN 'DoorDash'                       THEN 8600
    WHEN 'Elastic N.V.'                   THEN 2800
    WHEN 'UiPath'                         THEN 4000
    WHEN 'Automation Anywhere'            THEN 2500
    WHEN 'Klarna'                         THEN 5000
    WHEN 'Revolut'                        THEN 8000
    WHEN 'N26'                            THEN 1500
    WHEN 'Grab'                           THEN 10000
    WHEN 'Sea Limited (Shopee / Garena)'  THEN 67000
    WHEN 'BYJU''S'                        THEN 30000
    WHEN 'Zomato (Blinkit)'               THEN 5000
    WHEN 'Flipkart (Walmart)'             THEN 60000
    WHEN 'Vercel'                         THEN 400
    WHEN 'Scale AI'                       THEN 1000
    WHEN 'Cohere'                         THEN 500
    WHEN 'Mistral AI'                     THEN 200
    WHEN 'Hugging Face'                   THEN 350
    WHEN 'Perplexity AI'                  THEN 150
    WHEN 'Cursor (Anysphere)'             THEN 60
    WHEN 'DXC Technology'                 THEN 130000
    WHEN 'HashiCorp (IBM)'                THEN 2400
    WHEN 'Slack (Salesforce)'             THEN 2500
    WHEN 'GitHub (Microsoft)'             THEN 3000
    WHEN 'Anthropic'                      THEN 800
    ELSE employee_count
END
WHERE employee_count IS NULL OR employee_count = 0;

-- ── 11. VALIDATE SCORE BOUNDS [0, 1] ──────────────────────────────────────────
UPDATE public.company_intelligence SET ai_exposure_index  = 0.01 WHERE ai_exposure_index  < 0;
UPDATE public.company_intelligence SET ai_exposure_index  = 1.00 WHERE ai_exposure_index  > 1;
UPDATE public.company_intelligence SET market_risk_score  = 0.01 WHERE market_risk_score  < 0;
UPDATE public.company_intelligence SET market_risk_score  = 1.00 WHERE market_risk_score  > 1;
UPDATE public.company_intelligence SET company_risk_score = 0.01 WHERE company_risk_score < 0;
UPDATE public.company_intelligence SET company_risk_score = 1.00 WHERE company_risk_score > 1;
UPDATE public.company_intelligence SET confidence_score   = 0.01 WHERE confidence_score   < 0;
UPDATE public.company_intelligence SET confidence_score   = 1.00 WHERE confidence_score   > 1;

-- ── 12. ENSURE JSONB FIELD INTEGRITY ──────────────────────────────────────────
-- Ensure layoff_history always has the expected keys
UPDATE public.company_intelligence
SET layoff_history = layoff_history
    || '{"last_layoff_date":"No History"}'::jsonb
WHERE (layoff_history->>'last_layoff_date') IS NULL
  AND (layoff_history->>'total_layoffs' IS NULL
       OR (layoff_history->>'total_layoffs')::int = 0);

UPDATE public.company_intelligence
SET layoff_history = jsonb_set(layoff_history, '{affected_departments}', '[]')
WHERE layoff_history->'affected_departments' IS NULL;

-- ── 13. REFRESH UPDATED_AT ────────────────────────────────────────────────────
UPDATE public.company_intelligence
SET updated_at = NOW()
WHERE updated_at < '2026-04-20';

-- ── 14. FINAL DATA SOURCE STAMP ───────────────────────────────────────────────
UPDATE public.company_intelligence
SET data_source = 'preseeded_v2',
    last_updated = '2026-04-28'
WHERE data_source = 'preseeded';
