-- Migration: 20260516000008_phase6_role_seed.sql
-- v38.0 Phase 6 — Final Coverage: Medical Sub-specialties + Advanced Engineering/Creative + Skilled/Services/Education/Government (~46 roles)
-- Idempotent — safe to re-run.

INSERT INTO roles (role_key, display_name, role_family, industry, category) VALUES
  -- Medical Sub-specialties (12)
  ('vascular_surgeon','Vascular Surgeon','healthcare_clinical','healthcare','individual_contributor'),
  ('ent_surgeon','ENT Surgeon (Otolaryngologist)','healthcare_clinical','healthcare','individual_contributor'),
  ('urologist','Urologist','healthcare_clinical','healthcare','individual_contributor'),
  ('ob_gyn_specialist','OB/GYN Specialist','healthcare_clinical','healthcare','individual_contributor'),
  ('palliative_care_specialist','Palliative Care Specialist','healthcare_clinical','healthcare','individual_contributor'),
  ('geriatrician','Geriatrician','healthcare_clinical','healthcare','individual_contributor'),
  ('sports_medicine_physician','Sports Medicine Physician','healthcare_clinical','healthcare','individual_contributor'),
  ('sleep_medicine_specialist','Sleep Medicine Specialist','healthcare_clinical','healthcare','individual_contributor'),
  ('nurse_midwife','Certified Nurse Midwife (CNM)','healthcare_clinical','healthcare','individual_contributor'),
  ('audiologist','Audiologist (AuD)','healthcare_clinical','healthcare','individual_contributor'),
  ('dietitian_nutritionist','Registered Dietitian Nutritionist (RDN)','healthcare_clinical','healthcare','individual_contributor'),
  ('physician_assistant_surgical','Surgical Physician Assistant','healthcare_clinical','healthcare','individual_contributor'),
  -- Advanced Engineering (8)
  ('biomedical_engineer','Biomedical Engineer','pharma_biotech','medical_devices','individual_contributor'),
  ('aerospace_systems_engineer','Aerospace Systems Engineer','tech','aerospace','individual_contributor'),
  ('robotics_engineer','Robotics Engineer','tech','robotics','individual_contributor'),
  ('mining_engineer','Mining Engineer','energy','mining','individual_contributor'),
  ('marine_engineer','Marine Engineer','energy','maritime','individual_contributor'),
  ('quantum_computing_engineer','Quantum Computing Engineer','ml_ai','quantum','individual_contributor'),
  ('photonics_engineer','Photonics Engineer','tech','photonics','individual_contributor'),
  ('rf_microwave_engineer','RF/Microwave Engineer','telecom','telecom','individual_contributor'),
  -- Creative & Design (8)
  ('graphic_designer_commercial','Commercial Graphic Designer','design','design','individual_contributor'),
  ('illustrator_freelance','Freelance Illustrator','design','design','individual_contributor'),
  ('animator_3d','3D Animator','media_creative','entertainment','individual_contributor'),
  ('commercial_photographer','Commercial Photographer','media_creative','media','individual_contributor'),
  ('industrial_designer','Industrial Designer','design','design','individual_contributor'),
  ('fashion_designer','Fashion Designer','design','fashion','individual_contributor'),
  ('voice_actor','Voice Actor','media_creative','entertainment','individual_contributor'),
  ('makeup_artist_film_tv','Film/TV Makeup Artist (IATSE 706)','media_creative','entertainment','individual_contributor'),
  -- Skilled Labor (6)
  ('auto_mechanic_master','ASE Master Automotive Technician','manufacturing','automotive','individual_contributor'),
  ('heavy_equipment_operator','Heavy Equipment Operator','construction','construction','individual_contributor'),
  ('crane_operator','NCCCO-Certified Crane Operator','construction','construction','individual_contributor'),
  ('locksmith_master','Master Locksmith','manufacturing','security','individual_contributor'),
  ('commercial_diver','Commercial Diver','energy','offshore','individual_contributor'),
  ('arborist_certified','ISA-Certified Arborist','agriculture','urban_forestry','individual_contributor'),
  -- Personal Services + Wellness (6)
  ('personal_trainer_certified','Certified Personal Trainer','hospitality','fitness','individual_contributor'),
  ('registered_dietitian','Registered Dietitian (RD)','healthcare_clinical','wellness','individual_contributor'),
  ('massage_therapist_licensed','Licensed Massage Therapist (LMT)','healthcare_clinical','wellness','individual_contributor'),
  ('hairstylist_master','Master Hairstylist','retail','personal_services','individual_contributor'),
  ('wedding_planner_executive','Executive Wedding Planner','hospitality','events','manager'),
  ('funeral_director_licensed','Licensed Funeral Director','hospitality','funeral_services','manager'),
  -- Education Specialty (3)
  ('special_education_teacher','Special Education Teacher','education','education','individual_contributor'),
  ('college_sports_coach','College Sports Coach (NCAA D1)','education','athletics','manager'),
  ('athletic_trainer_certified','Certified Athletic Trainer (ATC)','healthcare_clinical','athletics','individual_contributor'),
  -- Government Specialty (3)
  ('tax_cpa_specialist','Tax CPA Specialist','accounting','tax','individual_contributor'),
  ('foreign_service_officer','Foreign Service Officer (US State Dept)','government','government','individual_contributor'),
  ('customs_border_officer','Customs & Border Officer (CBP)','government','government','individual_contributor')
ON CONFLICT (role_key) DO UPDATE SET display_name=EXCLUDED.display_name, role_family=EXCLUDED.role_family, industry=EXCLUDED.industry, category=EXCLUDED.category, updated_at=NOW();

-- High-signal Q1 2026 demand overrides for Phase 6
INSERT INTO role_demand_overrides (role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend, ai_substitution_risk, time_to_fill_days, yoy_job_openings_change, top_hiring_locations, data_quarter, data_source, calibration_note, created_by) VALUES
  ('palliative_care_specialist','global',92,'rising','rising','rising',0.04,135,0.22,ARRAY['Boston MA','Houston TX','San Francisco CA','New York NY','Phoenix AZ'],'Q1 2026','AAHPM + Center to Advance Palliative Care 2026','Acute palliative shortage; aging population driving demand at all academic medical centers.','system@humanproof.ai'),
  ('geriatrician','global',90,'rising','rising','rising',0.06,180,0.18,ARRAY['Florida','Arizona','Texas','New York NY','California'],'Q1 2026','AGS + American Board of Internal Medicine 2026','Severe geriatrician shortage — 30K below demand by 2030 per AGS workforce report.','system@humanproof.ai'),
  ('robotics_engineer','global',92,'rising','rising','rising',0.06,68,0.42,ARRAY['Bay Area','Boston MA','Pittsburgh PA','Austin TX','Seattle WA'],'Q1 2026','Boston Dynamics + Figure + 1X + ABB + Tesla Optimus 2026 hiring','Embodied AI investment driving robotics engineer demand at unprecedented levels.','system@humanproof.ai'),
  ('quantum_computing_engineer','global',88,'rising','rising','rising',0.04,95,0.48,ARRAY['Bay Area','Boston MA','New York NY','Chicago IL','Seattle WA'],'Q1 2026','IBM + Google + Microsoft + IonQ + Quantinuum + PsiQuantum Q1 2026','Quantum hiring surging from low base; talent pool extremely limited.','system@humanproof.ai'),
  ('biomedical_engineer','global',86,'rising','rising','rising',0.08,72,0.20,ARRAY['Boston MA','Bay Area','Minneapolis MN','Research Triangle','San Diego CA'],'Q1 2026','Medtronic + Stryker + J&J + GE Healthcare Q1 2026','Medical device industry expansion + GLP-1 device innovations driving BME demand.','system@humanproof.ai'),
  ('illustrator_freelance','global',45,'falling','falling','falling',0.42,38,-0.32,ARRAY['Remote (global)','Los Angeles CA','New York NY','London','Berlin'],'Q1 2026','Midjourney + DALL-E + Stable Diffusion adoption Q1 2026','Major AI displacement category. Distinctive style + editorial niches still survive; routine illustration falling rapidly.','system@humanproof.ai'),
  ('voice_actor','global',48,'falling','falling','falling',0.38,32,-0.28,ARRAY['Los Angeles CA','New York NY','Atlanta GA','Vancouver BC','Remote'],'Q1 2026','ElevenLabs + Resemble AI + OpenAI Voice 2026 enterprise adoption','AI voice cloning displacing IVR/elearning/audiobook midlist; SAG-AFTRA union projects still protected.','system@humanproof.ai'),
  ('graphic_designer_commercial','global',55,'falling','falling','falling',0.38,32,-0.22,ARRAY['Remote','Bay Area','New York NY','Los Angeles CA','Chicago IL'],'Q1 2026','Adobe Firefly + Midjourney + Canva AI 2026 adoption','Routine graphic design under acute AI pressure; brand strategy + custom illustration roles persist.','system@humanproof.ai'),
  ('crane_operator','global',86,'rising','rising','rising',0.08,52,0.16,ARRAY['Texas','Florida','California','New York NY','Washington State'],'Q1 2026','IUOE + NCCCO + AGC 2026 workforce data','Acute NCCCO-certified operator shortage. IIJA megaproject construction driving demand at all major GCs.','system@humanproof.ai'),
  ('auto_mechanic_master','global',82,'rising','stable','rising',0.16,42,0.08,ARRAY['Texas','Florida','California','Georgia','North Carolina'],'Q1 2026','ASE + Automotive Service Association 2026','EV transition compressing ICE-only shops; ASE Master techs with EV/hybrid certs in shortage.','system@humanproof.ai'),
  ('special_education_teacher','global',88,'rising','rising','rising',0.06,75,0.20,ARRAY['California','Texas','Florida','New York','Illinois'],'Q1 2026','CEC + US Dept Education 2026 workforce data','Acute SPED teacher shortage; many states paying $5K-$15K signing bonuses + housing assistance.','system@humanproof.ai'),
  ('tax_cpa_specialist','global',72,'stable','stable','rising',0.28,40,0.04,ARRAY['Remote','New York NY','Chicago IL','Bay Area','Texas'],'Q1 2026','AICPA + Intuit Tax Domain LLM 2026','Routine returns compressing via TurboTax AI; complex business tax planning + audit defense in demand.','system@humanproof.ai')
ON CONFLICT (role_key, region) DO UPDATE SET demand_index=EXCLUDED.demand_index, demand_trend=EXCLUDED.demand_trend, job_openings_trend=EXCLUDED.job_openings_trend, salary_trend=EXCLUDED.salary_trend, ai_substitution_risk=EXCLUDED.ai_substitution_risk, time_to_fill_days=EXCLUDED.time_to_fill_days, yoy_job_openings_change=EXCLUDED.yoy_job_openings_change, top_hiring_locations=EXCLUDED.top_hiring_locations, data_quarter=EXCLUDED.data_quarter, data_source=EXCLUDED.data_source, calibration_note=EXCLUDED.calibration_note, updated_at=NOW();
