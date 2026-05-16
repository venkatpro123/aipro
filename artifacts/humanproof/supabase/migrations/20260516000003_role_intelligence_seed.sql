-- Migration: 20260516000003_role_intelligence_seed.sql
-- v38.0 Phase 1 — Seed role intelligence tables with baseline data
--
-- Seeds:
--   1. roles                      → role registry (canonical key + metadata)
--   2. role_seniority_benchmarks  → per role-family tenure thresholds
--   3. role_portability_edges     → cross-family transition portability
--
-- Action pools, full compensation grids, negotiation scripts, and automation timelines
-- are NOT seeded here (they live in static TS files for fast first-render).
-- A future migration or admin script can sync TS → DB for specific roles when DB
-- overrides are needed for freshness updates.
--
-- This migration is idempotent: ON CONFLICT DO UPDATE keeps DB in sync on re-run.

-- ──────────────────────────────────────────────────────────────────────────────
-- Roles: canonical registry (includes Phase 1 cybersecurity, cloud, AI/ML, QA, FE/mobile)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO roles (role_key, display_name, role_family, industry, category) VALUES
  -- ─── Tech baseline (v37.0) ─────────────────────────────────────────────────
  ('swe', 'Software Engineer', 'tech', 'software', 'individual_contributor'),
  ('senior_swe', 'Senior Software Engineer', 'tech', 'software', 'individual_contributor'),
  ('staff_engineer', 'Staff Engineer', 'tech', 'software', 'individual_contributor'),
  ('frontend_engineer', 'Frontend Engineer', 'tech', 'software', 'individual_contributor'),
  ('backend_engineer', 'Backend Engineer', 'tech', 'software', 'individual_contributor'),
  ('fullstack_engineer', 'Full Stack Engineer', 'tech', 'software', 'individual_contributor'),
  ('devops_engineer', 'DevOps Engineer', 'devops_infra', 'software', 'individual_contributor'),
  ('data_scientist', 'Data Scientist', 'data_science', 'software', 'individual_contributor'),
  ('ml_engineer', 'ML Engineer', 'ml_ai', 'software', 'individual_contributor'),
  ('product_manager', 'Product Manager', 'product', 'software', 'manager'),

  -- ─── Cybersecurity (Phase 1, 25 roles) ─────────────────────────────────────
  ('cyber_threat_analyst', 'Cyber Threat Analyst', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('soc_analyst_tier_1', 'SOC Analyst (Tier 1)', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('soc_analyst_tier_2', 'SOC Analyst (Tier 2)', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('soc_analyst_tier_3', 'SOC Analyst (Tier 3)', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('incident_response_engineer', 'Incident Response Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('penetration_tester', 'Penetration Tester', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('red_team_operator', 'Red Team Operator', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('purple_team_engineer', 'Purple Team Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('application_security_engineer', 'Application Security Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('cloud_security_architect', 'Cloud Security Architect', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('devsecops_engineer', 'DevSecOps Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('identity_access_management_engineer', 'IAM Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('grc_analyst', 'GRC Analyst', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('siem_engineer', 'SIEM Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('forensics_analyst', 'Forensics Analyst', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('malware_analyst', 'Malware Analyst', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('vulnerability_management_specialist', 'Vulnerability Management Specialist', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('security_compliance_manager', 'Security Compliance Manager', 'cybersecurity', 'cybersecurity', 'manager'),
  ('ciso', 'Chief Information Security Officer (CISO)', 'cybersecurity', 'cybersecurity', 'executive'),
  ('vciso', 'Virtual CISO (vCISO)', 'cybersecurity', 'cybersecurity', 'executive'),
  ('bug_bounty_researcher', 'Bug Bounty Researcher', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('cryptography_engineer', 'Cryptography Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('zero_trust_architect', 'Zero Trust Architect', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('ot_security_engineer', 'OT Security Engineer', 'cybersecurity', 'cybersecurity', 'individual_contributor'),
  ('cyber_intelligence_analyst', 'Cyber Intelligence Analyst', 'cybersecurity', 'cybersecurity', 'individual_contributor'),

  -- ─── Cloud Platform (Phase 1, 15 roles) ────────────────────────────────────
  ('kubernetes_engineer', 'Kubernetes Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('service_mesh_engineer', 'Service Mesh Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('observability_engineer', 'Observability Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('chaos_engineer', 'Chaos Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('gitops_engineer', 'GitOps Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('database_reliability_engineer', 'Database Reliability Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('data_engineer', 'Data Engineer', 'data_science', 'data', 'individual_contributor'),
  ('data_platform_engineer', 'Data Platform Engineer', 'devops_infra', 'data', 'individual_contributor'),
  ('cloud_finops_analyst', 'Cloud FinOps Analyst', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('edge_computing_engineer', 'Edge Computing Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('multi_cloud_architect', 'Multi-Cloud Architect', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('aws_solutions_architect', 'AWS Solutions Architect', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('gcp_solutions_architect', 'GCP Solutions Architect', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('azure_solutions_architect', 'Azure Solutions Architect', 'devops_infra', 'cloud_platform', 'individual_contributor'),
  ('internal_developer_platform_engineer', 'Internal Developer Platform Engineer', 'devops_infra', 'cloud_platform', 'individual_contributor'),

  -- ─── AI/ML Specialization (Phase 1, 10 roles) ──────────────────────────────
  ('llm_engineer', 'LLM Engineer', 'ml_ai', 'ai', 'individual_contributor'),
  ('prompt_engineer', 'Prompt Engineer', 'ml_ai', 'ai', 'individual_contributor'),
  ('ml_research_scientist', 'ML Research Scientist', 'ml_ai', 'ai', 'individual_contributor'),
  ('applied_ml_scientist', 'Applied ML Scientist', 'ml_ai', 'ai', 'individual_contributor'),
  ('computer_vision_engineer', 'Computer Vision Engineer', 'ml_ai', 'ai', 'individual_contributor'),
  ('nlp_engineer', 'NLP Engineer', 'ml_ai', 'ai', 'individual_contributor'),
  ('reinforcement_learning_engineer', 'Reinforcement Learning Engineer', 'ml_ai', 'ai', 'individual_contributor'),
  ('ai_safety_researcher', 'AI Safety Researcher', 'ml_ai', 'ai', 'individual_contributor'),
  ('model_evaluation_engineer', 'Model Evaluation Engineer', 'ml_ai', 'ai', 'individual_contributor'),
  ('ai_red_teamer', 'AI Red Teamer', 'ml_ai', 'ai', 'individual_contributor'),

  -- ─── QA + Frontend/Mobile (Phase 1, 10 roles) ──────────────────────────────
  ('qa_automation_engineer', 'QA Automation Engineer', 'tech', 'software', 'individual_contributor'),
  ('performance_test_engineer', 'Performance Test Engineer', 'tech', 'software', 'individual_contributor'),
  ('chaos_qa_engineer', 'Chaos QA Engineer', 'tech', 'software', 'individual_contributor'),
  ('mobile_qa_engineer', 'Mobile QA Engineer', 'tech', 'software', 'individual_contributor'),
  ('accessibility_engineer', 'Accessibility Engineer', 'tech', 'software', 'individual_contributor'),
  ('frontend_performance_engineer', 'Frontend Performance Engineer', 'tech', 'software', 'individual_contributor'),
  ('webgl_engineer', 'WebGL Engineer', 'tech', 'software', 'individual_contributor'),
  ('ios_engineer_senior', 'Senior iOS Engineer', 'tech', 'software', 'individual_contributor'),
  ('android_engineer_senior', 'Senior Android Engineer', 'tech', 'software', 'individual_contributor'),
  ('react_native_engineer', 'React Native Engineer', 'tech', 'software', 'individual_contributor')

ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role_family = EXCLUDED.role_family,
  industry = EXCLUDED.industry,
  category = EXCLUDED.category,
  updated_at = NOW();


-- ──────────────────────────────────────────────────────────────────────────────
-- Role-Family Seniority Benchmarks
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO role_seniority_benchmarks (role_family, mid_years, senior_years, principal_years, principal_description) VALUES
  ('tech',                 3, 7, 14, 'Staff/Principal/Distinguished Engineer leading cross-team technical direction'),
  ('data_science',         2, 6, 12, 'Principal Data Scientist or Head of Data Science leading methodology and strategy'),
  ('ml_ai',                2, 5, 10, 'Research Scientist or Principal ML Engineer setting technical direction'),
  ('product',              2, 6, 12, 'Group PM, Director, or VP Product owning a product line'),
  ('design',               2, 6, 12, 'Design Director or VP Design owning design system and org standards'),
  ('finance',              3, 8, 16, 'Managing Director, Partner, or CIO-level with portfolio authority'),
  ('accounting',           3, 8, 15, 'Controller, CFO, or Partner at public accounting firm'),
  ('sales',                2, 5, 10, 'VP Sales, CRO, or Enterprise Sales Director with full territory P&L'),
  ('marketing',            2, 6, 12, 'VP Marketing, CMO, or Head of Growth with full-funnel ownership'),
  ('hr_people',            2, 7, 14, 'CHRO or CPO setting talent strategy at the organizational level'),
  ('consulting',           2, 6, 12, 'Partner or Principal owning client relationships and business development'),
  ('legal',                3, 10, 20, 'Partner at law firm, General Counsel, or Chief Legal Officer'),
  ('healthcare_clinical',  2, 5, 18, 'Chief of Medicine, Nurse Executive, or Department Chief with institutional authority'),
  ('healthcare_admin',     3, 8, 16, 'CEO/COO of health system or Hospital President'),
  ('pharma_biotech',       3, 9, 18, 'Chief Scientific Officer, VP R&D, or Distinguished Scientist'),
  ('manufacturing',        3, 8, 16, 'VP Operations, Plant Director, or Chief Manufacturing Officer'),
  ('energy',               3, 9, 18, 'Chief Engineer, VP Engineering, or C-suite with asset P&L responsibility'),
  ('construction',         4, 10, 20, 'Project Director or VP Construction with program-level authority'),
  ('retail',               2, 6, 12, 'VP Merchandising, Regional Director, or Chief Commercial Officer'),
  ('logistics',            3, 8, 16, 'VP Supply Chain or Chief Logistics Officer with network-level authority'),
  ('government',           3, 10, 20, 'Senior Executive Service (SES) or equivalent political/career appointee level'),
  ('education',            3, 8, 20, 'Full Professor with tenure, Dean, or Provost'),
  ('media_creative',       2, 6, 12, 'Executive Editor, Creative Director, or VP Content with editorial authority'),
  ('hospitality',          3, 8, 16, 'General Manager of luxury property or VP Operations of hotel group'),
  ('cybersecurity',        2, 6, 12, 'CISO, Principal Security Architect, or VP Security with org-wide authority')
ON CONFLICT (role_family) DO UPDATE SET
  mid_years = EXCLUDED.mid_years,
  senior_years = EXCLUDED.senior_years,
  principal_years = EXCLUDED.principal_years,
  principal_description = EXCLUDED.principal_description,
  updated_at = NOW();


-- ──────────────────────────────────────────────────────────────────────────────
-- Role Portability Edges — high-signal cross-family transitions (subset)
-- Full matrix (100+ edges) remains in static src/data/rolePortabilityMatrix.ts;
-- this DB layer holds admin-overridable edges only.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO role_portability_edges (source_family, target_family, portability_score, difficulty, typical_months, key_bridges, note) VALUES
  -- Cybersecurity outbound paths
  ('cybersecurity', 'tech',          0.78, 'easy',      6,  ARRAY['secure coding practices', 'system design fundamentals', 'cloud architecture'], 'Security engineers transition back to SWE easily — security background is a strong differentiator.'),
  ('cybersecurity', 'devops_infra',  0.85, 'easy',      4,  ARRAY['Kubernetes/CI-CD security', 'IaC security patterns', 'observability'], 'DevSecOps and security-platform engineering are natural moves.'),
  ('cybersecurity', 'consulting',    0.72, 'easy',      6,  ARRAY['client advisory framing', 'business risk quantification', 'executive presentation skills'], 'Senior security pros are highly valued in advisory and incident response consulting.'),
  ('cybersecurity', 'ml_ai',         0.58, 'moderate',  12, ARRAY['ML safety fundamentals', 'AI red-teaming', 'evals engineering'], 'AI safety and AI red-teaming are growing niches accessible from cybersecurity.'),
  ('cybersecurity', 'product',       0.62, 'moderate',  10, ARRAY['security product strategy', 'PM frameworks', 'customer discovery'], 'Security product management at Wiz, CrowdStrike, etc. directly values security background.'),
  ('cybersecurity', 'government',    0.78, 'easy',      6,  ARRAY['security clearance', 'government contracting', 'compliance frameworks (FedRAMP, NIST)'], 'Government and defense actively recruit experienced security professionals.'),
  -- Inbound to cybersecurity
  ('tech', 'cybersecurity',          0.65, 'moderate',  10, ARRAY['security fundamentals (OWASP, threat modeling)', 'CISSP or Security+ certification', 'specific tool stack expertise'], 'SWE-to-security is achievable with certification and demonstrated security work.'),
  ('devops_infra', 'cybersecurity',  0.78, 'easy',      6,  ARRAY['security architecture certifications (CCSP, AWS Sec Specialty)', 'identity and access management depth', 'CSPM tooling'], 'DevOps engineers move into cloud security architecture naturally — strong overlap.')
ON CONFLICT (source_family, target_family) DO UPDATE SET
  portability_score = EXCLUDED.portability_score,
  difficulty = EXCLUDED.difficulty,
  typical_months = EXCLUDED.typical_months,
  key_bridges = EXCLUDED.key_bridges,
  note = EXCLUDED.note,
  updated_at = NOW();


-- ──────────────────────────────────────────────────────────────────────────────
-- High-signal Q1 2026 demand overrides for Phase 1 roles
-- Adds to role_demand_overrides (from migration 20260516000001).
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO role_demand_overrides (
  role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend,
  ai_substitution_risk, time_to_fill_days, yoy_job_openings_change,
  top_hiring_locations, data_quarter, data_source, calibration_note, created_by
) VALUES
  ('ciso',                       'global', 90, 'rising', 'rising', 'rising', 0.04, 120, 0.12,
   ARRAY['New York NY','San Francisco CA','London','Washington DC','Boston MA'],
   'Q1 2026', 'ISC2 Workforce Study 2026', 'CISO market extremely tight; F500 willing to pay $400K-$1.2M total comp.', 'system@humanproof.ai'),

  ('cloud_security_architect',   'global', 88, 'rising', 'rising', 'rising', 0.08, 68, 0.26,
   ARRAY['San Francisco CA','Seattle WA','New York NY','Austin TX','Bangalore'],
   'Q1 2026', 'LinkedIn Talent Insights + ISC2 2026', 'Multi-cloud security architects in 4:1 demand-to-supply ratio.', 'system@humanproof.ai'),

  ('ot_security_engineer',       'global', 88, 'rising', 'rising', 'rising', 0.08, 95, 0.26,
   ARRAY['Houston TX','Washington DC','Chicago IL','Pittsburgh PA','Atlanta GA'],
   'Q1 2026', 'Dragos Year in Review 2025 + ISC2 2026', 'OT security engineers in extreme shortage; 5:1 openings-to-candidates.', 'system@humanproof.ai'),

  ('ai_safety_researcher',       'global', 96, 'rising', 'rising', 'rising', 0.02, 90, 0.42,
   ARRAY['San Francisco CA','London','Boston MA','New York NY','Berkeley CA'],
   'Q1 2026', 'Anthropic + OpenAI + DeepMind public hiring data Q1 2026', 'AI safety is the highest-demand niche in frontier AI labs in 2026.', 'system@humanproof.ai'),

  ('ml_research_scientist',      'global', 95, 'rising', 'rising', 'rising', 0.04, 95, 0.38,
   ARRAY['San Francisco CA','London','Boston MA','New York NY','Toronto'],
   'Q1 2026', 'Anthropic + OpenAI + DeepMind + Meta SI Labs hiring data Q1 2026', 'Frontier-lab ML research scientists in critical shortage.', 'system@humanproof.ai'),

  ('llm_engineer',               'global', 93, 'rising', 'rising', 'rising', 0.06, 45, 0.48,
   ARRAY['San Francisco CA','New York NY','Seattle WA','London','Bangalore'],
   'Q1 2026', 'LinkedIn Talent Insights Q1 2026', 'LLM engineer postings up 48% YoY; applied AI scaleup market booming.', 'system@humanproof.ai'),

  ('cryptography_engineer',      'global', 86, 'rising', 'rising', 'rising', 0.05, 95, 0.28,
   ARRAY['San Francisco CA','Seattle WA','New York NY','Boston MA','London'],
   'Q1 2026', 'CloudFlare + AWS + Google public hiring + NIST PQC standardization', 'PQC migration driving acute demand; sub-200 PQC-experienced engineers globally.', 'system@humanproof.ai'),

  ('soc_analyst_tier_1',         'global', 60, 'falling', 'falling', 'stable', 0.48, 28, -0.08,
   ARRAY['Bangalore','Hyderabad','Manila','San Antonio TX','Tampa FL'],
   'Q1 2026', 'Gartner SOAR Adoption Report 2026', 'Tier 1 demand softening — XSIAM/Charlotte/Sentinel AI displacing routine triage. Career velocity = move to tier-2/IR.', 'system@humanproof.ai'),

  ('grc_analyst',                'global', 66, 'falling', 'falling', 'stable', 0.38, 35, -0.10,
   ARRAY['New York NY','Washington DC','Bangalore','Hyderabad','San Francisco CA'],
   'Q1 2026', 'Vanta + Drata adoption metrics Q1 2026', 'Routine evidence collection being automated; technical GRC at vendors still rising.', 'system@humanproof.ai'),

  ('qa_automation_engineer',     'global', 70, 'stable', 'falling', 'stable', 0.32, 38, -0.06,
   ARRAY['Bangalore','Hyderabad','Pune','Manila','San Francisco CA'],
   'Q1 2026', 'Playwright + Cypress AI adoption Q1 2026', 'AI codegen tools displacing test authoring; test architecture roles still rising.', 'system@humanproof.ai')

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


-- ──────────────────────────────────────────────────────────────────────────────
-- Comment summary
-- ──────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE roles IS 'Canonical role registry. v38.0 Phase 1: 60 new roles added (25 cybersecurity, 15 cloud platform, 10 AI/ML, 10 QA + FE/Mobile).';
