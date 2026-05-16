-- Migration: 20260516000007_phase5_role_seed.sql
-- v38.0 Phase 5 — Media / Hospitality / CX Scale / Research & Academia (~38 roles)
-- Idempotent — safe to re-run.

INSERT INTO roles (role_key, display_name, role_family, industry, category) VALUES
  -- Media & Entertainment (14)
  ('editor_in_chief','Editor-in-Chief','media_creative','media','executive'),
  ('content_producer_video','Video Content Producer','media_creative','media','manager'),
  ('film_tv_director','Film/TV Director','media_creative','entertainment','individual_contributor'),
  ('screenwriter','Screenwriter (WGA)','media_creative','entertainment','individual_contributor'),
  ('video_editor_professional','Professional Video Editor','media_creative','entertainment','individual_contributor'),
  ('music_producer','Music Producer','media_creative','entertainment','individual_contributor'),
  ('audio_engineer_professional','Audio Engineer (Pro)','media_creative','entertainment','individual_contributor'),
  ('podcast_producer','Podcast Producer','media_creative','entertainment','individual_contributor'),
  ('talent_agent','Talent Agent','media_creative','entertainment','individual_contributor'),
  ('entertainment_attorney','Entertainment Attorney','legal','entertainment','individual_contributor'),
  ('esports_manager','Esports Manager','media_creative','esports','manager'),
  ('media_analytics_specialist','Media Analytics Specialist','data_science','media','individual_contributor'),
  ('broadcast_journalist','Broadcast Journalist','media_creative','media','individual_contributor'),
  ('documentary_filmmaker','Documentary Filmmaker','media_creative','entertainment','individual_contributor'),
  -- Hospitality & Travel (10)
  ('restaurant_manager','Restaurant Manager','hospitality','hospitality','manager'),
  ('travel_agent_specialist','Travel Agent Specialist','hospitality','travel','individual_contributor'),
  ('airline_operations_manager','Airline Operations Manager','aviation','aviation','manager'),
  ('airport_operations_specialist','Airport Operations Specialist','aviation','aviation','individual_contributor'),
  ('hospitality_technology_manager','Hospitality Technology Manager','hospitality','hospitality','manager'),
  ('spa_wellness_director','Spa & Wellness Director','hospitality','wellness','manager'),
  ('food_beverage_director','Food & Beverage Director','hospitality','hospitality','manager'),
  ('concierge_specialist','Concierge Specialist','hospitality','hospitality','individual_contributor'),
  ('hotel_operations_manager','Hotel Operations Manager','hospitality','hospitality','manager'),
  ('chief_hospitality_officer','Chief Hospitality Officer','hospitality','hospitality','executive'),
  -- CX Support Scale (6)
  ('enterprise_support_engineer','Enterprise Support Engineer','tech','customer_experience','individual_contributor'),
  ('support_operations_director','Support Operations Director','consulting','customer_experience','manager'),
  ('workforce_management_analyst_cx','CX Workforce Management Analyst','consulting','customer_experience','individual_contributor'),
  ('chatbot_ai_trainer','Chatbot/AI Trainer','ml_ai','customer_experience','individual_contributor'),
  ('knowledge_base_specialist','Knowledge Base Specialist','consulting','customer_experience','individual_contributor'),
  ('voice_of_customer_analyst','Voice of Customer Analyst','data_science','customer_experience','individual_contributor'),
  -- Research & Academia (8)
  ('postdoctoral_researcher','Postdoctoral Researcher','education','research','individual_contributor'),
  ('research_lab_director','Research Lab Director','education','research','manager'),
  ('science_policy_advisor','Science Policy Advisor','government','research','individual_contributor'),
  ('technology_transfer_specialist','Technology Transfer Specialist','education','research','individual_contributor'),
  ('research_commercialization_manager','Research Commercialization Manager','education','research','manager'),
  ('think_tank_researcher','Think Tank Researcher','education','research','individual_contributor'),
  ('independent_researcher','Independent Researcher','education','research','individual_contributor'),
  ('science_journalist','Science Journalist','media_creative','media','individual_contributor')
ON CONFLICT (role_key) DO UPDATE SET display_name=EXCLUDED.display_name, role_family=EXCLUDED.role_family, industry=EXCLUDED.industry, category=EXCLUDED.category, updated_at=NOW();

-- High-signal Q1 2026 demand overrides for Phase 5
INSERT INTO role_demand_overrides (role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend, ai_substitution_risk, time_to_fill_days, yoy_job_openings_change, top_hiring_locations, data_quarter, data_source, calibration_note, created_by) VALUES
  ('chatbot_ai_trainer','global',86,'rising','rising','rising',0.08,42,0.42,ARRAY['Bay Area','New York NY','Austin TX','Seattle WA','London'],'Q1 2026','Intercom + Salesforce Einstein + Anthropic Q1 2026','AI conversation design talent in acute shortage as enterprises deploy chatbots at scale.','system@humanproof.ai'),
  ('esports_manager','global',82,'rising','rising','rising',0.14,45,0.28,ARRAY['Los Angeles CA','Bay Area','New York NY','Berlin','Seoul'],'Q1 2026','Riot + Activision + ESL + 100 Thieves Q1 2026','Esports growing $5B+ market; competitive team manager demand rising.','system@humanproof.ai'),
  ('film_tv_director','global',60,'stable','stable','stable',0.06,180,-0.04,ARRAY['Los Angeles CA','New York NY','Atlanta GA','Vancouver BC','London'],'Q1 2026','DGA + IATSE 2025-2026 production data','Director job market structurally limited by union supply; AI tools augment but do not replace.','system@humanproof.ai'),
  ('screenwriter','global',58,'stable','falling','stable',0.22,210,-0.10,ARRAY['Los Angeles CA','New York NY','Atlanta GA','London','Toronto'],'Q1 2026','WGA 2024 strike outcome + production pipeline 2026','Post-strike content pipeline still recovering; WGA protections limit AI displacement.','system@humanproof.ai'),
  ('travel_agent_specialist','global',55,'falling','falling','falling',0.40,28,-0.18,ARRAY['Remote','Atlanta GA','New York NY','Miami FL','Los Angeles CA'],'Q1 2026','Expedia + Booking.com adoption + ASTA 2026 data','Routine travel agent role falling rapidly; luxury/UHNW specialist segment protected.','system@humanproof.ai'),
  ('airline_operations_manager','global',86,'rising','rising','rising',0.12,72,0.18,ARRAY['Atlanta GA','Dallas TX','Chicago IL','Denver CO','New York NY'],'Q1 2026','Airlines 4 America 2026 workforce report','Post-COVID airline expansion driving ops manager demand at all major carriers.','system@humanproof.ai'),
  ('postdoctoral_researcher','global',52,'falling','falling','stable',0.08,90,-0.12,ARRAY['Boston MA','Bay Area','New York NY','Chicago IL','Research Triangle'],'Q1 2026','NSF Doctorate Recipients + AAUP academic job market 2026','Academic postdoc market structurally shrinking as tenure-track positions decline.','system@humanproof.ai'),
  ('technology_transfer_specialist','global',76,'rising','rising','rising',0.12,55,0.16,ARRAY['Boston MA','Bay Area','Research Triangle','New York NY','San Diego'],'Q1 2026','AUTM + USPTO 2026 university patent licensing data','University tech commercialization driving acute TTS demand.','system@humanproof.ai'),
  ('voice_of_customer_analyst','global',76,'rising','rising','rising',0.24,52,0.18,ARRAY['Remote','Bay Area','Boston MA','Austin TX','New York NY'],'Q1 2026','Medallia + Qualtrics + Sprout Social 2026','CX investment driving VoC analyst demand; junior roles compressing due to AI.','system@humanproof.ai'),
  ('workforce_management_analyst_cx','global',62,'falling','falling','stable',0.32,32,-0.12,ARRAY['Atlanta GA','Phoenix AZ','Dallas TX','Bangalore','Manila'],'Q1 2026','Verint + NICE + Genesys 2026 adoption','AI WFM platforms compressing junior analyst roles; senior strategy stays human.','system@humanproof.ai'),
  ('knowledge_base_specialist','global',58,'falling','falling','stable',0.40,28,-0.16,ARRAY['Remote','Bay Area','Austin TX','Seattle WA','Bangalore'],'Q1 2026','Notion AI + Guru AI + Atlassian AI 2026 adoption','AI writing tools compressing routine KB article creation aggressively.','system@humanproof.ai')
ON CONFLICT (role_key, region) DO UPDATE SET demand_index=EXCLUDED.demand_index, demand_trend=EXCLUDED.demand_trend, job_openings_trend=EXCLUDED.job_openings_trend, salary_trend=EXCLUDED.salary_trend, ai_substitution_risk=EXCLUDED.ai_substitution_risk, time_to_fill_days=EXCLUDED.time_to_fill_days, yoy_job_openings_change=EXCLUDED.yoy_job_openings_change, top_hiring_locations=EXCLUDED.top_hiring_locations, data_quarter=EXCLUDED.data_quarter, data_source=EXCLUDED.data_source, calibration_note=EXCLUDED.calibration_note, updated_at=NOW();
