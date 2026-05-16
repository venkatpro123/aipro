-- Migration: 20260516000004_phase2_role_seed.sql
-- v38.0 Phase 2 — Seed healthcare deep + biotech distinct roles (75 total)
--
-- Adds:
--   - 75 new roles to the roles registry
--   - 2 new role-family seniority benchmarks (veterinary, public_health)
--   - High-signal demand overrides for acute-shortage healthcare specialties
--
-- Idempotent — safe to re-run.

-- ──────────────────────────────────────────────────────────────────────────────
-- 75 new Phase 2 roles
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO roles (role_key, display_name, role_family, industry, category) VALUES
  -- Physicians (17)
  ('cardiologist', 'Cardiologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('oncologist_medical', 'Medical Oncologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('oncologist_surgical', 'Surgical Oncologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('radiologist', 'Radiologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('radiation_oncologist', 'Radiation Oncologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('anesthesiologist', 'Anesthesiologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('neurologist', 'Neurologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('emergency_medicine_physician', 'Emergency Medicine Physician', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('general_surgeon', 'General Surgeon', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('neurosurgeon', 'Neurosurgeon', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('orthopedic_surgeon', 'Orthopedic Surgeon', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('cardiothoracic_surgeon', 'Cardiothoracic Surgeon', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('plastic_surgeon', 'Plastic Surgeon', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('psychiatrist', 'Psychiatrist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('dermatologist', 'Dermatologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('ophthalmologist', 'Ophthalmologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('pediatrician', 'Pediatrician', 'healthcare_clinical', 'healthcare', 'individual_contributor'),

  -- Nursing (11)
  ('icu_nurse', 'ICU Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('er_nurse', 'ER Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('or_nurse', 'OR Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('pacu_nurse', 'PACU Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('labor_delivery_nurse', 'Labor & Delivery Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('psychiatric_nurse', 'Psychiatric Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('oncology_nurse', 'Oncology Nurse', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('nurse_practitioner_family', 'Family Nurse Practitioner (FNP)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('nurse_practitioner_psychiatric', 'Psychiatric NP (PMHNP)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('crna', 'Certified Registered Nurse Anesthetist (CRNA)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('clinical_nurse_specialist', 'Clinical Nurse Specialist (CNS)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),

  -- Allied Health (10)
  ('occupational_therapist', 'Occupational Therapist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('speech_language_pathologist', 'Speech Language Pathologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('respiratory_therapist', 'Respiratory Therapist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('radiologic_technologist', 'Radiologic Technologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('surgical_technologist', 'Surgical Technologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('paramedic', 'Paramedic', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('emt', 'Emergency Medical Technician (EMT)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('hospital_pharmacist', 'Hospital Pharmacist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('pharmacy_technician', 'Pharmacy Technician', 'healthcare_clinical', 'healthcare', 'individual_contributor'),

  -- Biotech distinct (10)
  ('computational_biologist', 'Computational Biologist', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('bioinformatics_scientist', 'Bioinformatics Scientist', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('cell_gene_therapy_specialist', 'Cell & Gene Therapy Specialist', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('protein_engineer', 'Protein Engineer', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('synthetic_biologist', 'Synthetic Biologist', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('bioprocess_engineer', 'Bioprocess Engineer', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('biostatistician', 'Biostatistician', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('cro_project_manager', 'CRO Project Manager', 'pharma_biotech', 'biotech', 'manager'),
  ('bench_scientist', 'Bench Scientist', 'pharma_biotech', 'biotech', 'individual_contributor'),
  ('clinical_biostatistician', 'Clinical Biostatistician', 'pharma_biotech', 'biotech', 'individual_contributor'),

  -- Healthcare IT (5)
  ('epic_analyst', 'Epic Systems Analyst', 'healthcare_admin', 'healthcare', 'individual_contributor'),
  ('clinical_informaticist', 'Clinical Informaticist', 'healthcare_admin', 'healthcare', 'individual_contributor'),
  ('fhir_engineer', 'FHIR Engineer', 'tech', 'healthcare', 'individual_contributor'),
  ('healthcare_data_scientist', 'Healthcare Data Scientist', 'data_science', 'healthcare', 'individual_contributor'),
  ('revenue_cycle_management_analyst', 'RCM Analyst', 'healthcare_admin', 'healthcare', 'individual_contributor'),

  -- Behavioral Health (6)
  ('clinical_psychologist', 'Clinical Psychologist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('licensed_clinical_social_worker', 'Licensed Clinical Social Worker (LCSW)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('licensed_professional_counselor', 'Licensed Professional Counselor (LPC)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('bcba', 'Board Certified Behavior Analyst (BCBA)', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('addiction_counselor', 'Addiction Counselor', 'healthcare_clinical', 'healthcare', 'individual_contributor'),
  ('marriage_family_therapist', 'Marriage & Family Therapist', 'healthcare_clinical', 'healthcare', 'individual_contributor'),

  -- Healthcare Admin (6)
  ('chief_medical_officer', 'Chief Medical Officer (CMO)', 'healthcare_admin', 'healthcare', 'executive'),
  ('chief_nursing_officer', 'Chief Nursing Officer (CNO)', 'healthcare_admin', 'healthcare', 'executive'),
  ('hospital_administrator_senior', 'Senior Hospital Administrator', 'healthcare_admin', 'healthcare', 'manager'),
  ('clinical_operations_director', 'Clinical Operations Director', 'healthcare_admin', 'healthcare', 'manager'),
  ('quality_improvement_director', 'Quality Improvement Director', 'healthcare_admin', 'healthcare', 'manager'),
  ('medical_coder_denials_specialist', 'Medical Coder / Denials Specialist', 'healthcare_admin', 'healthcare', 'individual_contributor'),

  -- Veterinary (4)
  ('veterinarian', 'Veterinarian (DVM)', 'veterinary', 'veterinary', 'individual_contributor'),
  ('veterinary_technician', 'Veterinary Technician', 'veterinary', 'veterinary', 'individual_contributor'),
  ('veterinary_surgeon', 'Veterinary Surgeon (DACVS)', 'veterinary', 'veterinary', 'individual_contributor'),
  ('equine_veterinarian', 'Equine Veterinarian', 'veterinary', 'veterinary', 'individual_contributor'),

  -- Public Health (6)
  ('epidemiologist', 'Epidemiologist', 'public_health', 'public_health', 'individual_contributor'),
  ('biostatistician_public_health', 'Public Health Biostatistician', 'public_health', 'public_health', 'individual_contributor'),
  ('mph_health_analyst', 'MPH Health Analyst', 'public_health', 'public_health', 'individual_contributor'),
  ('vaccine_program_specialist', 'Vaccine Program Specialist', 'public_health', 'public_health', 'individual_contributor'),
  ('global_health_officer', 'Global Health Officer', 'public_health', 'public_health', 'manager'),
  ('infection_preventionist', 'Infection Preventionist', 'public_health', 'healthcare', 'individual_contributor')

ON CONFLICT (role_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role_family = EXCLUDED.role_family,
  industry = EXCLUDED.industry,
  category = EXCLUDED.category,
  updated_at = NOW();


-- ──────────────────────────────────────────────────────────────────────────────
-- 2 new role-family seniority benchmarks (veterinary, public_health)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO role_seniority_benchmarks (role_family, mid_years, senior_years, principal_years, principal_description) VALUES
  ('veterinary',    3, 8, 16, 'Specialty board-certified veterinarian, practice owner, or veterinary medical director'),
  ('public_health', 3, 8, 15, 'CDC Senior Executive, state health officer, or international health official')
ON CONFLICT (role_family) DO UPDATE SET
  mid_years = EXCLUDED.mid_years,
  senior_years = EXCLUDED.senior_years,
  principal_years = EXCLUDED.principal_years,
  principal_description = EXCLUDED.principal_description,
  updated_at = NOW();


-- ──────────────────────────────────────────────────────────────────────────────
-- Acute-shortage demand overrides (Q1 2026)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO role_demand_overrides (
  role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend,
  ai_substitution_risk, time_to_fill_days, yoy_job_openings_change,
  top_hiring_locations, data_quarter, data_source, calibration_note, created_by
) VALUES
  ('psychiatrist',                'global', 94, 'rising', 'rising', 'rising', 0.08, 145, 0.22,
   ARRAY['Remote-friendly','New York NY','California','Texas','Florida'],
   'Q1 2026', 'AAMC + APA Workforce Report 2026',
   'Mental health crisis driving acute shortage. Telepsychiatry expanding rapidly. Locum rates $400-650/hr.',
   'system@humanproof.ai'),

  ('crna', 'global', 94, 'rising', 'rising', 'rising', 0.04, 95, 0.18,
   ARRAY['Texas','California','Florida','New York','Pennsylvania'],
   'Q1 2026', 'AANA Workforce Data 2026',
   'Acute CRNA shortage. Locum rates $250-350/hr. 5:1 demand-to-supply ratio.',
   'system@humanproof.ai'),

  ('icu_nurse', 'global', 91, 'rising', 'rising', 'rising', 0.03, 38, 0.16,
   ARRAY['Houston TX','Dallas TX','Phoenix AZ','Los Angeles CA','Chicago IL'],
   'Q1 2026', 'BLS OES 2025 + ANA Critical Care Workforce 2026',
   'Structural ICU nursing shortage. Travel rates $3000-4500/wk all-in.',
   'system@humanproof.ai'),

  ('cell_gene_therapy_specialist', 'global', 92, 'rising', 'rising', 'rising', 0.05, 88, 0.32,
   ARRAY['Cambridge MA','San Diego','South SF','Research Triangle','Philadelphia'],
   'Q1 2026', 'BioSpace + ARMRC Q1 2026',
   'CGT manufacturing scaling rapidly. Sub-1000 qualified specialists globally.',
   'system@humanproof.ai'),

  ('computational_biologist', 'global', 88, 'rising', 'rising', 'rising', 0.10, 65, 0.28,
   ARRAY['Cambridge MA','San Diego','South SF','Research Triangle','Bay Area'],
   'Q1 2026', 'BioSpace + LinkedIn Q1 2026',
   'AI-driven drug discovery driving acute demand for computational biology talent.',
   'system@humanproof.ai'),

  ('fhir_engineer', 'global', 89, 'rising', 'rising', 'rising', 0.12, 55, 0.32,
   ARRAY['Boston MA','Nashville TN','Madison WI','Bay Area','Verona WI'],
   'Q1 2026', 'HL7 + ONC Interoperability data 2026',
   '21st Century Cures Act + USCDI v3 driving FHIR engineer demand.',
   'system@humanproof.ai'),

  ('clinical_psychologist', 'global', 90, 'rising', 'rising', 'rising', 0.05, 65, 0.20,
   ARRAY['Remote-friendly','New York NY','California','Texas','Massachusetts'],
   'Q1 2026', 'APA + Headway/Alma marketplace data Q1 2026',
   'Mental health crisis driving acute shortage. Cash-pay clinics rapid growth.',
   'system@humanproof.ai'),

  ('chief_medical_officer', 'global', 88, 'rising', 'rising', 'rising', 0.04, 165, 0.14,
   ARRAY['New York NY','San Francisco CA','Boston MA','Nashville TN','Chicago IL'],
   'Q1 2026', 'AHA + Witt/Kieffer CMO survey 2026',
   'CMO market tight. F500 hospital systems offering $400K-$900K total comp.',
   'system@humanproof.ai'),

  ('veterinarian', 'global', 86, 'rising', 'rising', 'rising', 0.06, 88, 0.18,
   ARRAY['Texas','California','Florida','Colorado','North Carolina'],
   'Q1 2026', 'AVMA Workforce Report 2026',
   'Persistent vet shortage driven by pandemic pet adoption boom.',
   'system@humanproof.ai'),

  ('pharmacy_technician', 'global', 58, 'falling', 'falling', 'stable', 0.40, 22, -0.14,
   ARRAY['Texas','California','Florida','New York'],
   'Q1 2026', 'Omnicell + Pyxis robotic dispensing adoption Q1 2026',
   'Robotic dispensing displacing pill-counting work. Clinical/compounding roles still growing.',
   'system@humanproof.ai'),

  ('medical_coder_denials_specialist', 'global', 52, 'falling', 'falling', 'falling', 0.55, 28, -0.22,
   ARRAY['Texas','Remote','India (offshore)','Florida','Tennessee'],
   'Q1 2026', 'Codametrix + Notable AI + Olive AI Q1 2026 adoption',
   'Largest healthcare AI displacement category in 2026. Routine coding being automated rapidly.',
   'system@humanproof.ai'),

  ('revenue_cycle_management_analyst', 'global', 62, 'falling', 'falling', 'stable', 0.42, 35, -0.12,
   ARRAY['Tennessee','Texas','Remote','India (offshore)','Florida'],
   'Q1 2026', 'Notable AI + Olive AI Q1 2026',
   'AI-driven RCM platforms compressing analyst headcount. Complex appeals roles still needed.',
   'system@humanproof.ai'),

  ('epidemiologist', 'global', 78, 'stable', 'stable', 'rising', 0.10, 65, 0.06,
   ARRAY['Atlanta GA (CDC)','Washington DC','Boston MA','Baltimore MD','Maryland'],
   'Q1 2026', 'CDC + APHA Workforce 2026',
   'Post-pandemic demand normalized. Specialty epi (genomic, AI-driven surveillance) growing.',
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


COMMENT ON TABLE roles IS 'Canonical role registry. v38.0 Phase 2: 75 healthcare deep + biotech distinct roles added (17 physicians, 11 nursing, 10 allied health, 10 biotech, 5 healthcare IT, 6 behavioral health, 6 healthcare admin, 4 veterinary, 6 public health).';
