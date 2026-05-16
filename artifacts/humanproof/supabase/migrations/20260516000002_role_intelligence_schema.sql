-- Migration: 20260516000002_role_intelligence_schema.sql
-- Phase 1 / v38.0: Full Role Intelligence Schema for DB-backed updates
--
-- This migration creates the authoritative tables for all role intelligence data.
-- Static TS files in src/data/* and src/services/* remain for fast first-render performance.
-- DB rows override static data when present.
--
-- Admin workflow:
--   1. Edit DB rows via Supabase Studio (or admin scripts)
--   2. Next user session reads updated data (with 30-min cache TTL)
--   3. No code deployment required for content updates
--
-- Schema design principles:
--   * One row per role (in `roles`) — canonical metadata
--   * Nested JSONB for action pools (16-slot per role) — too sparse for relational
--   * Composite keys for region-specific data (role_key + region)
--   * RLS: public read for authenticated users; write only for service_role

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 1: roles — canonical role registry
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  role_key            TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  role_family         TEXT NOT NULL,          -- maps to RoleFamily in rolePortabilityMatrix.ts
  industry            TEXT NOT NULL,          -- 'cybersecurity', 'cloud_platform', 'ai_ml', etc.
  category            TEXT,                   -- 'individual_contributor', 'manager', 'executive'
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  description         TEXT,
  typical_seniority_distribution JSONB,       -- {junior: 0.2, mid: 0.4, senior: 0.3, principal: 0.1}
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_family ON roles (role_family);
CREATE INDEX IF NOT EXISTS idx_roles_industry ON roles (industry);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles (is_active) WHERE is_active = TRUE;

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 2: role_aliases — title → canonical key resolution
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_aliases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias               TEXT NOT NULL,          -- normalized (lowercase, trimmed)
  role_key            TEXT NOT NULL REFERENCES roles(role_key) ON DELETE CASCADE,
  display_role        TEXT,                   -- original-case display version
  confidence          NUMERIC(3,2) DEFAULT 1.00 CHECK (confidence BETWEEN 0 AND 1),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_aliases_alias_unique UNIQUE (alias)
);

CREATE INDEX IF NOT EXISTS idx_role_aliases_role_key ON role_aliases (role_key);
CREATE INDEX IF NOT EXISTS idx_role_aliases_alias ON role_aliases (alias);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 3: role_actions — 16-slot personalized action pools per role
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_actions (
  role_key            TEXT PRIMARY KEY REFERENCES roles(role_key) ON DELETE CASCADE,
  -- Action pool structure: { seniority: { riskBand: ActionItem[] } }
  -- Seniority: 'junior' | 'mid' | 'senior' | 'principal'
  -- Risk bands: 'low' (0-30), 'moderate' (30-60), 'high' (60-80), 'critical' (80-100)
  action_pool         JSONB NOT NULL,
  data_quarter        TEXT NOT NULL DEFAULT 'Q1 2026',
  data_source         TEXT,
  calibration_note    TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          TEXT
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 4: role_compensation_bands — USD + INR salary ranges per experience band
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_compensation_bands (
  role_key            TEXT NOT NULL REFERENCES roles(role_key) ON DELETE CASCADE,
  region              TEXT NOT NULL DEFAULT 'global',  -- 'global' | 'us' | 'india' | 'eu' | ...
  exp_band            TEXT NOT NULL,                   -- '0-2' | '2-5' | '5-10' | '10-15' | '15+'
  base_low_usd        INTEGER,                         -- base salary low end in USD
  base_high_usd       INTEGER,                         -- base salary high end in USD
  total_low_usd       INTEGER,                         -- base + bonus + equity low
  total_high_usd      INTEGER,                         -- base + bonus + equity high
  base_low_inr_lakhs  NUMERIC(7,2),                    -- INR base in Lakhs (₹L)
  base_high_inr_lakhs NUMERIC(7,2),
  bonus_pct_typical   NUMERIC(4,2),                    -- bonus as % of base (e.g. 0.20 = 20%)
  equity_significant  BOOLEAN DEFAULT FALSE,           -- is equity a meaningful comp lever?
  data_quarter        TEXT NOT NULL DEFAULT 'Q1 2026',
  data_source         TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_comp_bands_unique UNIQUE (role_key, region, exp_band)
);

CREATE INDEX IF NOT EXISTS idx_role_comp_role_region ON role_compensation_bands (role_key, region);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 5: role_negotiation_scripts — leverage strategies per role
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_negotiation_scripts (
  role_key            TEXT PRIMARY KEY REFERENCES roles(role_key) ON DELETE CASCADE,
  strong_opener       TEXT NOT NULL,
  leverage_context    TEXT NOT NULL,
  counters_script     TEXT NOT NULL,
  walk_away_line      TEXT NOT NULL,
  primary_leverage_axis TEXT,                          -- 'scarce_skill' | 'critical_project' | 'competing_offer' | 'institutional_knowledge'
  leverage_score      NUMERIC(3,2) CHECK (leverage_score BETWEEN 0 AND 1),
  best_timing         TEXT,
  alternative_levers  TEXT[],
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 6: role_automation_timeline — displacement projections per role
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_automation_timeline (
  role_key                   TEXT PRIMARY KEY REFERENCES roles(role_key) ON DELETE CASCADE,
  augmentation_probability   NUMERIC(3,2) CHECK (augmentation_probability BETWEEN 0 AND 1),
  displacement_2026          NUMERIC(3,2) CHECK (displacement_2026 BETWEEN 0 AND 1),
  displacement_2028          NUMERIC(3,2) CHECK (displacement_2028 BETWEEN 0 AND 1),
  displacement_2030          NUMERIC(3,2) CHECK (displacement_2030 BETWEEN 0 AND 1),
  displacement_2032          NUMERIC(3,2) CHECK (displacement_2032 BETWEEN 0 AND 1),
  top_tasks_at_risk          TEXT[],
  human_essential_tasks      TEXT[],
  automation_drivers         TEXT[],
  impact_timeline            TEXT CHECK (impact_timeline IN ('short', 'medium', 'long')),
  risk_tier                  TEXT CHECK (risk_tier IN ('very_high', 'high', 'moderate', 'low', 'very_low')),
  data_source                TEXT,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 7: role_portability_edges — asymmetric transition scores between role families
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_portability_edges (
  source_family       TEXT NOT NULL,
  target_family       TEXT NOT NULL,
  portability_score   NUMERIC(3,2) NOT NULL CHECK (portability_score BETWEEN 0 AND 1),
  difficulty          TEXT CHECK (difficulty IN ('trivial', 'easy', 'moderate', 'hard', 'very_hard')),
  typical_months      INTEGER CHECK (typical_months >= 0),
  key_bridges         TEXT[],
  note                TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_portability_edges_pair_unique UNIQUE (source_family, target_family)
);

CREATE INDEX IF NOT EXISTS idx_portability_source ON role_portability_edges (source_family);
CREATE INDEX IF NOT EXISTS idx_portability_target ON role_portability_edges (target_family);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 8: role_seniority_benchmarks — tenure thresholds per role family
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_seniority_benchmarks (
  role_family         TEXT PRIMARY KEY,
  mid_years           SMALLINT NOT NULL CHECK (mid_years >= 0),
  senior_years        SMALLINT NOT NULL CHECK (senior_years >= 0),
  principal_years     SMALLINT NOT NULL CHECK (principal_years >= 0),
  principal_description TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- Table 9: cross_industry_transitions — (sourceRole × targetIndustry) skill gaps
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cross_industry_transitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_role         TEXT NOT NULL REFERENCES roles(role_key) ON DELETE CASCADE,
  target_industry     TEXT NOT NULL,
  difficulty          TEXT NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'very_hard')),
  timeline_weeks      INTEGER CHECK (timeline_weeks > 0),
  skill_gaps          TEXT[] NOT NULL,
  transferable_strengths TEXT[],
  target_role_suggestions TEXT[],
  note                TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cross_transitions_unique UNIQUE (source_role, target_industry)
);

CREATE INDEX IF NOT EXISTS idx_cross_transitions_source ON cross_industry_transitions (source_role);
CREATE INDEX IF NOT EXISTS idx_cross_transitions_target ON cross_industry_transitions (target_industry);

-- ──────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at trigger function (shared)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_role_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all role intelligence tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'roles', 'role_actions', 'role_compensation_bands',
      'role_negotiation_scripts', 'role_automation_timeline',
      'role_portability_edges', 'role_seniority_benchmarks',
      'cross_industry_transitions'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW
        EXECUTE FUNCTION update_role_intelligence_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Row Level Security: public read, service_role write
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'roles', 'role_aliases', 'role_actions', 'role_compensation_bands',
      'role_negotiation_scripts', 'role_automation_timeline',
      'role_portability_edges', 'role_seniority_benchmarks',
      'cross_industry_transitions'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('
      DROP POLICY IF EXISTS "%s_read" ON %s;
      CREATE POLICY "%s_read" ON %s FOR SELECT TO authenticated, anon USING (TRUE);
    ', tbl, tbl, tbl, tbl);
    EXECUTE format('
      DROP POLICY IF EXISTS "%s_admin" ON %s;
      CREATE POLICY "%s_admin" ON %s FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Comments
-- ──────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE roles IS 'Canonical role registry. Source of truth for what roles the platform supports.';
COMMENT ON TABLE role_aliases IS 'Human-entered title → canonical role key mapping. Powers role resolution.';
COMMENT ON TABLE role_actions IS '16-slot personalized action pool per role (seniority × risk band).';
COMMENT ON TABLE role_compensation_bands IS 'USD + INR salary ranges per experience band per region.';
COMMENT ON TABLE role_negotiation_scripts IS 'Per-role leverage strategies and negotiation talking points.';
COMMENT ON TABLE role_automation_timeline IS 'Per-role AI displacement projections 2026-2032.';
COMMENT ON TABLE role_portability_edges IS 'Asymmetric cross-role family transition portability scores.';
COMMENT ON TABLE role_seniority_benchmarks IS 'Per role-family tenure thresholds for seniority bracket derivation.';
COMMENT ON TABLE cross_industry_transitions IS '(sourceRole × targetIndustry) specific transition data with skill gaps and bridge roles.';
