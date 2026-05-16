-- Migration: 20260516000005_phase3_role_seed.sql
-- v38.0 Phase 3 — Seed finance deep + insurance + RE finance roles (70 total)
--
-- Adds:
--   - 70 new roles to the roles registry
--   - High-signal demand overrides for quant scarcity + mortgage displacement + insurtech disruption
--
-- All roles map to existing role_families (finance, accounting, real_estate, product).
-- No new families needed.
--
-- Idempotent — safe to re-run.

-- ──────────────────────────────────────────────────────────────────────────────
-- 70 new Phase 3 roles
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO roles (role_key, display_name, role_family, industry, category) VALUES
  -- Investment Banking (10)
  ('ib_analyst', 'Investment Banking Analyst', 'finance', 'investment_banking', 'individual_contributor'),
  ('ib_associate_ma', 'IB Associate (M&A)', 'finance', 'investment_banking', 'individual_contributor'),
  ('ib_vp_ma', 'IB VP (M&A)', 'finance', 'investment_banking', 'manager'),
  ('ib_director_ma', 'IB Director (M&A)', 'finance', 'investment_banking', 'manager'),
  ('ib_md_ma', 'IB Managing Director (M&A)', 'finance', 'investment_banking', 'executive'),
  ('ecm_banker', 'ECM Banker', 'finance', 'investment_banking', 'individual_contributor'),
  ('dcm_banker', 'DCM Banker', 'finance', 'investment_banking', 'individual_contributor'),
  ('leveraged_finance_banker', 'Leveraged Finance Banker', 'finance', 'investment_banking', 'individual_contributor'),
  ('restructuring_banker', 'Restructuring Banker', 'finance', 'investment_banking', 'individual_contributor'),
  ('fig_banker', 'FIG Banker', 'finance', 'investment_banking', 'individual_contributor'),

  -- PE / VC (8)
  ('pe_associate', 'PE Associate', 'finance', 'private_equity', 'individual_contributor'),
  ('pe_principal', 'PE Principal', 'finance', 'private_equity', 'manager'),
  ('pe_partner', 'PE Partner', 'finance', 'private_equity', 'executive'),
  ('growth_equity_principal', 'Growth Equity Principal', 'finance', 'private_equity', 'manager'),
  ('vc_associate', 'VC Associate', 'finance', 'venture_capital', 'individual_contributor'),
  ('vc_principal', 'VC Principal', 'finance', 'venture_capital', 'manager'),
  ('vc_partner', 'VC Partner', 'finance', 'venture_capital', 'executive'),
  ('secondaries_principal', 'PE Secondaries Principal', 'finance', 'private_equity', 'manager'),

  -- Quantitative Finance (6)
  ('quant_researcher', 'Quantitative Researcher', 'finance', 'quant_finance', 'individual_contributor'),
  ('quant_developer', 'Quantitative Developer', 'finance', 'quant_finance', 'individual_contributor'),
  ('algo_trader', 'Algorithmic Trader', 'finance', 'quant_finance', 'individual_contributor'),
  ('risk_quant', 'Risk Quant', 'finance', 'quant_finance', 'individual_contributor'),
  ('market_making_engineer', 'Market Making Engineer', 'finance', 'quant_finance', 'individual_contributor'),
  ('stat_arb_researcher', 'Statistical Arbitrage Researcher', 'finance', 'quant_finance', 'individual_contributor'),

  -- Asset Management (6)
  ('portfolio_manager', 'Portfolio Manager', 'finance', 'asset_management', 'manager'),
  ('etf_specialist', 'ETF Specialist', 'finance', 'asset_management', 'individual_contributor'),
  ('fixed_income_trader', 'Fixed Income Trader', 'finance', 'asset_management', 'individual_contributor'),
  ('equity_research_analyst', 'Equity Research Analyst', 'finance', 'asset_management', 'individual_contributor'),
  ('multi_asset_strategist', 'Multi-Asset Strategist', 'finance', 'asset_management', 'individual_contributor'),
  ('esg_analyst', 'ESG Analyst', 'finance', 'asset_management', 'individual_contributor'),

  -- Hedge Fund (5)
  ('long_short_equity_analyst', 'Long/Short Equity Analyst', 'finance', 'hedge_fund', 'individual_contributor'),
  ('event_driven_analyst', 'Event-Driven Analyst', 'finance', 'hedge_fund', 'individual_contributor'),
  ('macro_trader', 'Macro Trader', 'finance', 'hedge_fund', 'individual_contributor'),
  ('distressed_credit_analyst', 'Distressed Credit Analyst', 'finance', 'hedge_fund', 'individual_contributor'),
  ('special_situations_analyst', 'Special Situations Analyst', 'finance', 'hedge_fund', 'individual_contributor'),

  -- Corporate Finance / Treasury (6)
  ('fpa_director', 'FP&A Director', 'finance', 'corporate_finance', 'manager'),
  ('treasurer', 'Treasurer', 'finance', 'corporate_finance', 'executive'),
  ('ir_director', 'Investor Relations Director', 'finance', 'corporate_finance', 'manager'),
  ('deputy_cfo', 'Deputy CFO', 'finance', 'corporate_finance', 'executive'),
  ('corporate_development_director', 'Corporate Development Director', 'finance', 'corporate_finance', 'manager'),
  ('controller_strategic', 'Strategic Controller / CAO', 'accounting', 'corporate_finance', 'executive'),

  -- Banking (6)
  ('relationship_manager_commercial', 'Commercial Banking Relationship Manager', 'finance', 'commercial_banking', 'individual_contributor'),
  ('commercial_credit_officer', 'Commercial Credit Officer', 'finance', 'commercial_banking', 'individual_contributor'),
  ('wealth_manager_advisor', 'Wealth Manager / Financial Advisor', 'finance', 'wealth_management', 'individual_contributor'),
  ('private_banker', 'Private Banker (UHNW)', 'finance', 'wealth_management', 'manager'),
  ('mortgage_originator', 'Mortgage Originator', 'finance', 'retail_banking', 'individual_contributor'),
  ('branch_manager_bank', 'Bank Branch Manager', 'finance', 'retail_banking', 'manager'),

  -- Risk + Compliance (6)
  ('credit_risk_analyst', 'Credit Risk Analyst', 'finance', 'banking_risk', 'individual_contributor'),
  ('market_risk_analyst', 'Market Risk Analyst', 'finance', 'banking_risk', 'individual_contributor'),
  ('operational_risk_manager', 'Operational Risk Manager', 'finance', 'banking_risk', 'manager'),
  ('model_risk_validator', 'Model Risk Validator', 'finance', 'banking_risk', 'individual_contributor'),
  ('bsa_aml_specialist', 'BSA/AML Specialist', 'finance', 'banking_compliance', 'individual_contributor'),
  ('ofac_compliance_specialist', 'OFAC Compliance Specialist', 'finance', 'banking_compliance', 'individual_contributor'),

  -- Insurance (12)
  ('life_actuary', 'Life Actuary (FSA)', 'finance', 'insurance', 'individual_contributor'),
  ('pc_actuary', 'P&C Actuary (FCAS)', 'finance', 'insurance', 'individual_contributor'),
  ('reinsurance_pricing_actuary', 'Reinsurance Pricing Actuary', 'finance', 'insurance', 'individual_contributor'),
  ('catastrophe_modeler', 'Catastrophe Modeler', 'finance', 'insurance', 'individual_contributor'),
  ('captive_insurance_manager', 'Captive Insurance Manager', 'finance', 'insurance', 'manager'),
  ('health_underwriter_senior', 'Senior Health Underwriter', 'finance', 'insurance', 'individual_contributor'),
  ('claims_executive', 'Claims Executive', 'finance', 'insurance', 'manager'),
  ('insurance_broker_commercial', 'Commercial Insurance Broker', 'finance', 'insurance', 'individual_contributor'),
  ('mga_executive', 'MGA Executive', 'finance', 'insurance', 'executive'),
  ('insurtech_product_manager', 'Insurtech Product Manager', 'product', 'insurance', 'manager'),
  ('surplus_lines_specialist', 'Surplus Lines Specialist', 'finance', 'insurance', 'individual_contributor'),
  ('parametric_insurance_analyst', 'Parametric Insurance Analyst', 'finance', 'insurance', 'individual_contributor'),

  -- Real Estate Finance (5)
  ('cre_asset_manager', 'CRE Asset Manager', 'real_estate', 'real_estate_finance', 'manager'),
  ('cre_debt_origination', 'CRE Debt Origination', 'finance', 'real_estate_finance', 'individual_contributor'),
  ('reit_research_analyst', 'REIT Research Analyst', 'finance', 'real_estate_finance', 'individual_contributor'),
  ('opportunistic_re_investor', 'Opportunistic RE Investor', 'real_estate', 'real_estate_finance', 'manager'),
  ('gp_lp_relations_associate', 'GP/LP Relations Associate', 'finance', 'private_equity', 'individual_contributor')

ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role_family = EXCLUDED.role_family,
  industry = EXCLUDED.industry,
  category = EXCLUDED.category,
  updated_at = NOW();


-- ──────────────────────────────────────────────────────────────────────────────
-- High-signal Q1 2026 demand overrides
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO role_demand_overrides (
  role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend,
  ai_substitution_risk, time_to_fill_days, yoy_job_openings_change,
  top_hiring_locations, data_quarter, data_source, calibration_note, created_by
) VALUES
  -- Acute shortage / surging demand
  ('quant_researcher', 'global', 94, 'rising', 'rising', 'rising', 0.06, 95, 0.28,
   ARRAY['New York NY','Chicago IL','Boston MA','London','Bay Area'],
   'Q1 2026', 'Citadel + Two Sigma + Jane Street + DE Shaw Q1 2026 hiring',
   'Quant talent war intensifying. PhD physics/math at top funds: $300-650K base + bonus.',
   'system@humanproof.ai'),

  ('catastrophe_modeler', 'global', 92, 'rising', 'rising', 'rising', 0.10, 75, 0.32,
   ARRAY['Bermuda','London','Zurich','New York NY','Stamford CT'],
   'Q1 2026', 'AIR/Verisk + RMS/Moody''s + ICEYE Q1 2026',
   'Climate risk demand surging at reinsurers and parametric carriers.',
   'system@humanproof.ai'),

  ('model_risk_validator', 'global', 90, 'rising', 'rising', 'rising', 0.08, 75, 0.26,
   ARRAY['New York NY','Charlotte NC','Chicago IL','Bay Area','London'],
   'Q1 2026', 'SR 11-7 Federal Reserve + OCC Q1 2026 guidance',
   'AI/ML model proliferation driving model validator demand at all banks.',
   'system@humanproof.ai'),

  ('pe_principal', 'global', 88, 'rising', 'rising', 'rising', 0.06, 110, 0.18,
   ARRAY['New York NY','Bay Area','London','Boston MA','Hong Kong'],
   'Q1 2026', 'Blackstone + KKR + Apollo + Vista + Thoma Bravo Q1 2026 hiring',
   'PE principal level chronically short — partner-track positions in acute demand.',
   'system@humanproof.ai'),

  ('reinsurance_pricing_actuary', 'global', 88, 'rising', 'rising', 'rising', 0.08, 95, 0.20,
   ARRAY['Bermuda','Munich','Zurich','Stamford CT','London'],
   'Q1 2026', 'Munich Re + Swiss Re + Hannover Re + RGA Q1 2026',
   'FCAS-pathway pricing actuaries at reinsurers in chronic shortage.',
   'system@humanproof.ai'),

  ('parametric_insurance_analyst', 'global', 86, 'rising', 'rising', 'rising', 0.08, 75, 0.42,
   ARRAY['New York NY','Bermuda','London','Bay Area','Zurich'],
   'Q1 2026', 'ICEYE + Swiss Re Parametric + Munich Re Parametric Q1 2026',
   'Climate adaptation + parametric trigger products driving acute demand.',
   'system@humanproof.ai'),

  -- Stable demand at scarcity premium
  ('ib_md_ma', 'global', 75, 'stable', 'stable', 'rising', 0.03, 180, 0.05,
   ARRAY['New York NY','London','Hong Kong','Bay Area','Frankfurt'],
   'Q1 2026', 'Goldman + Morgan Stanley + JPM + Houlihan + Lazard Q1 2026',
   'MD-level openings rare; $1-3M+ total comp at top firms.',
   'system@humanproof.ai'),

  ('vc_partner', 'global', 70, 'stable', 'stable', 'rising', 0.04, 200, 0.02,
   ARRAY['Bay Area','New York NY','Boston MA','LA CA','London'],
   'Q1 2026', 'Sequoia + A16Z + Benchmark + Founders Fund Q1 2026',
   'VC partner roles essentially closed — promotion-from-within dominant.',
   'system@humanproof.ai'),

  -- Falling demand (AI displacement)
  ('mortgage_originator', 'global', 50, 'falling', 'falling', 'falling', 0.55, 25, -0.25,
   ARRAY['Texas','Florida','Phoenix AZ','Charlotte NC','Las Vegas NV'],
   'Q1 2026', 'Rocket + SoFi + Better.com adoption + MBA data Q1 2026',
   'Largest finance AI displacement. Rocket Mortgage + SoFi compressing routine processing.',
   'system@humanproof.ai'),

  ('health_underwriter_senior', 'global', 58, 'falling', 'falling', 'stable', 0.48, 38, -0.18,
   ARRAY['Connecticut','Indianapolis','Minneapolis','Hartford CT','Tampa FL'],
   'Q1 2026', 'Oscar Health + Bright Health + Lemonade Health + Cigna AI Q1 2026',
   'Health underwriting AI compressing routine UW. Specialty UW still in demand.',
   'system@humanproof.ai'),

  ('bsa_aml_specialist', 'global', 65, 'falling', 'falling', 'stable', 0.42, 35, -0.12,
   ARRAY['New York NY','Charlotte NC','Wilmington DE','Tampa FL','India offshore'],
   'Q1 2026', 'Refinitiv + ComplyAdvantage + ThetaRay Q1 2026',
   'AML transaction monitoring AI compressing alert clearing roles.',
   'system@humanproof.ai'),

  ('branch_manager_bank', 'global', 56, 'falling', 'falling', 'stable', 0.40, 42, -0.16,
   ARRAY['Texas','Florida','Phoenix AZ','Pacific NW','Southeast US'],
   'Q1 2026', 'JPM + BofA + Wells Fargo branch consolidation 2024-2026',
   'Branch consolidation continues; digital banking displacing teller-side work.',
   'system@humanproof.ai'),

  -- Moderate compression
  ('equity_research_analyst', 'global', 68, 'stable', 'falling', 'stable', 0.22, 55, -0.06,
   ARRAY['New York NY','Boston MA','Bay Area','Chicago IL','London'],
   'Q1 2026', 'Visible Alpha + Bloomberg AI adoption Q1 2026',
   'Sell-side equity research compressing; buy-side roles stable.',
   'system@humanproof.ai'),

  ('fpa_director', 'global', 70, 'stable', 'stable', 'rising', 0.32, 60, -0.04,
   ARRAY['New York NY','Bay Area','Texas','Atlanta GA','Chicago IL'],
   'Q1 2026', 'Anaplan + Pigment + Workday Adaptive AI adoption Q1 2026',
   'FP&A analyst-level compressing; FP&A director-level stable as strategic partner.',
   'system@humanproof.ai')

ON CONFLICT (role_key, region) DO UPDATE SET
  demand_index = EXCLUDED.demand_index,
  demand_trend = EXCLUDED.demand_trend,
  job_openings_trend = EXCLUDED.job_openings_trend,
  salary_trend = EXCLUDED.salary_trend,
  ai_substitution_risk = EXCLUDED.ai_substitution_risk,
  time_to_fill_days = EXCLUDED.time_to_fill_days,
  yoy_job_openings_change = EXCLUDED.yoy_job_openings_change,
  top_hiring_locations = EXCLUDED.top_hiring_locations,
  data_quarter = EXCLUDED.data_quarter,
  data_source = EXCLUDED.data_source,
  calibration_note = EXCLUDED.calibration_note,
  updated_at = NOW();


COMMENT ON TABLE roles IS 'Canonical role registry. v38.0 Phase 3: 70 finance deep + insurance + RE finance roles added (10 IB + 8 PE/VC + 6 quant + 6 AM + 5 HF + 6 corp finance + 6 banking + 6 risk + 12 insurance + 5 RE finance).';
