-- Migration: 20260516000006_phase4_role_seed.sql
-- v38.0 Phase 4 — Industrial / Trades / Energy / Construction / Aviation / Public Safety (80 roles)
-- Idempotent — safe to re-run.

INSERT INTO roles (role_key, display_name, role_family, industry, category) VALUES
  -- Skilled Trades (15)
  ('journeyman_electrician','Journeyman Electrician','tech','skilled_trades','individual_contributor'),
  ('master_electrician','Master Electrician','tech','skilled_trades','individual_contributor'),
  ('plumber_journeyman','Journeyman Plumber','construction','skilled_trades','individual_contributor'),
  ('hvac_technician','HVAC Technician','construction','skilled_trades','individual_contributor'),
  ('hvac_engineer_licensed','Licensed HVAC Engineer','construction','skilled_trades','individual_contributor'),
  ('welder_certified','Certified Welder','manufacturing','skilled_trades','individual_contributor'),
  ('pipefitter','Pipefitter','construction','skilled_trades','individual_contributor'),
  ('ironworker_structural','Structural Ironworker','construction','skilled_trades','individual_contributor'),
  ('carpenter_journeyman','Journeyman Carpenter','construction','skilled_trades','individual_contributor'),
  ('concrete_mason','Concrete Mason','construction','skilled_trades','individual_contributor'),
  ('sheet_metal_worker','Sheet Metal Worker','construction','skilled_trades','individual_contributor'),
  ('boilermaker','Boilermaker','manufacturing','skilled_trades','individual_contributor'),
  ('millwright','Millwright','manufacturing','skilled_trades','individual_contributor'),
  ('industrial_painter','Industrial Painter','construction','skilled_trades','individual_contributor'),
  ('roofer_commercial','Commercial Roofer','construction','skilled_trades','individual_contributor'),
  -- Industrial Engineering (15)
  ('reliability_engineer','Reliability Engineer (CMRP)','manufacturing','industrial_engineering','individual_contributor'),
  ('industrial_automation_engineer','Industrial Automation Engineer','tech','industrial_engineering','individual_contributor'),
  ('cnc_machinist_programmer','CNC Machinist / Programmer','manufacturing','industrial_engineering','individual_contributor'),
  ('chemical_engineer','Chemical Engineer','energy','industrial_engineering','individual_contributor'),
  ('materials_engineer','Materials Engineer','manufacturing','industrial_engineering','individual_contributor'),
  ('packaging_engineer','Packaging Engineer','manufacturing','industrial_engineering','individual_contributor'),
  ('quality_systems_manager','Quality Systems Manager','manufacturing','industrial_engineering','manager'),
  ('continuous_improvement_manager','Continuous Improvement Manager','manufacturing','industrial_engineering','manager'),
  ('industrial_safety_engineer_hse','Industrial Safety Engineer (HSE)','manufacturing','industrial_engineering','individual_contributor'),
  ('production_planning_manager','Production Planning Manager','manufacturing','industrial_engineering','manager'),
  ('demand_planner','Demand Planner','logistics','industrial_engineering','individual_contributor'),
  ('procurement_manager','Procurement Manager','logistics','industrial_engineering','manager'),
  ('category_manager_strategic','Strategic Category Manager','consulting','industrial_engineering','manager'),
  ('warehouse_operations_manager','Warehouse Operations Manager','logistics','industrial_engineering','manager'),
  ('environmental_engineer_industrial','Industrial Environmental Engineer','energy','industrial_engineering','individual_contributor'),
  -- Energy Specializations (15)
  ('reservoir_engineer','Reservoir Engineer','energy','oil_gas','individual_contributor'),
  ('drilling_engineer','Drilling Engineer','energy','oil_gas','individual_contributor'),
  ('nuclear_engineer','Nuclear Engineer','energy','nuclear','individual_contributor'),
  ('nuclear_plant_operator','Nuclear Plant Operator (SRO)','energy','nuclear','individual_contributor'),
  ('grid_operations_engineer','Grid Operations Engineer','energy','power_systems','individual_contributor'),
  ('energy_trading_analyst','Energy Trading Analyst','finance','energy','individual_contributor'),
  ('power_systems_engineer','Power Systems Engineer','energy','power_systems','individual_contributor'),
  ('solar_pv_engineer_utility','Utility-Scale Solar PV Engineer','energy','renewables','individual_contributor'),
  ('wind_energy_engineer','Wind Energy Engineer','energy','renewables','individual_contributor'),
  ('battery_storage_engineer','Battery Storage Engineer (BESS)','energy','renewables','individual_contributor'),
  ('hydrogen_engineer','Hydrogen Engineer','energy','renewables','individual_contributor'),
  ('geothermal_engineer','Geothermal Engineer','energy','renewables','individual_contributor'),
  ('transmission_line_engineer','Transmission Line Engineer','energy','power_systems','individual_contributor'),
  ('oil_gas_project_manager','Oil & Gas Project Manager','energy','oil_gas','manager'),
  ('environmental_compliance_specialist_energy','Energy Environmental Compliance Specialist','energy','energy','individual_contributor'),
  -- Construction Specializations (15)
  ('site_superintendent','Site Superintendent','construction','construction','manager'),
  ('quantity_surveyor','Quantity Surveyor (MRICS)','construction','construction','individual_contributor'),
  ('bim_manager','BIM Manager','construction','construction','manager'),
  ('mep_coordinator','MEP Coordinator','construction','construction','individual_contributor'),
  ('safety_hse_manager_construction','Construction HSE Manager (CSP)','construction','construction','manager'),
  ('project_controls_specialist','Project Controls Specialist','construction','construction','individual_contributor'),
  ('urban_planner','Urban Planner (AICP)','government','urban_planning','individual_contributor'),
  ('geotechnical_engineer','Geotechnical Engineer (PE/GE)','construction','geotechnical','individual_contributor'),
  ('building_inspector','Building Inspector (ICC)','government','construction','individual_contributor'),
  ('facilities_manager','Facilities Manager (CFM)','real_estate','facilities','manager'),
  ('real_estate_developer_commercial','Commercial Real Estate Developer','real_estate','real_estate','manager'),
  ('landscape_architect','Landscape Architect (RLA)','construction','design','individual_contributor'),
  ('interior_designer_commercial','Commercial Interior Designer (NCIDQ)','design','design','individual_contributor'),
  ('sustainability_consultant_built_env','Sustainability Consultant (Built Environment)','consulting','sustainability','individual_contributor'),
  ('fire_protection_engineer','Fire Protection Engineer (PE)','construction','engineering','individual_contributor'),
  -- Aviation (10)
  ('commercial_pilot_airline','Commercial Airline Pilot (ATP)','aviation','aviation','individual_contributor'),
  ('first_officer_airline','First Officer (Airline)','aviation','aviation','individual_contributor'),
  ('corporate_pilot','Corporate Pilot','aviation','aviation','individual_contributor'),
  ('air_traffic_controller','Air Traffic Controller (CPC)','government','aviation','individual_contributor'),
  ('aviation_mechanic_ap','Aviation Mechanic (A&P)','aviation','aviation','individual_contributor'),
  ('aerospace_engineer_structures','Aerospace Engineer (Structures)','tech','aerospace','individual_contributor'),
  ('aerospace_engineer_propulsion','Aerospace Engineer (Propulsion)','tech','aerospace','individual_contributor'),
  ('avionics_technician','Avionics Technician','aviation','aviation','individual_contributor'),
  ('aerospace_project_manager','Aerospace Project Manager','tech','aerospace','manager'),
  ('uav_operator_commercial','Commercial UAV Operator (Part 107)','aviation','aviation','individual_contributor'),
  -- Public Safety (10)
  ('police_officer','Police Officer','government','public_safety','individual_contributor'),
  ('detective_investigator','Detective / Investigator','government','public_safety','individual_contributor'),
  ('firefighter','Firefighter','government','public_safety','individual_contributor'),
  ('fire_captain','Fire Captain','government','public_safety','manager'),
  ('corrections_officer','Corrections Officer','government','public_safety','individual_contributor'),
  ('probation_parole_officer','Probation / Parole Officer','government','public_safety','individual_contributor'),
  ('security_manager_physical','Physical Security Manager','consulting','public_safety','manager'),
  ('emergency_management_coordinator','Emergency Management Coordinator','government','public_safety','individual_contributor'),
  ('forensic_scientist','Forensic Scientist','government','public_safety','individual_contributor'),
  ('crime_scene_investigator','Crime Scene Investigator','government','public_safety','individual_contributor')
ON CONFLICT (role_key) DO UPDATE SET display_name=EXCLUDED.display_name, role_family=EXCLUDED.role_family, industry=EXCLUDED.industry, category=EXCLUDED.category, updated_at=NOW();

-- 2 new seniority benchmarks
INSERT INTO role_seniority_benchmarks (role_family, mid_years, senior_years, principal_years, principal_description) VALUES
  ('aviation', 3, 8, 18, 'Airline captain with 20+ years seniority, Type Rating on widebody, Chief Pilot'),
  ('public_health', 3, 8, 15, 'See Phase 2 seed — this aliases government family')
ON CONFLICT (role_family) DO UPDATE SET mid_years=EXCLUDED.mid_years, senior_years=EXCLUDED.senior_years, principal_years=EXCLUDED.principal_years, updated_at=NOW();

-- High-signal Q1 2026 demand overrides for Phase 4
INSERT INTO role_demand_overrides (role_key, region, demand_index, demand_trend, job_openings_trend, salary_trend, ai_substitution_risk, time_to_fill_days, yoy_job_openings_change, top_hiring_locations, data_quarter, data_source, calibration_note, created_by) VALUES
  ('commercial_pilot_airline','global',92,'rising','rising','rising',0.04,180,0.22,ARRAY['Atlanta GA','Dallas TX','Denver CO','Chicago IL','New York JFK'],'Q1 2026','ALPA + FAA Aerospace Forecast 2026','Acute global pilot shortage. Airlines short 14,000 pilots through 2030.','system@humanproof.ai'),
  ('air_traffic_controller','global',88,'rising','rising','rising',0.06,220,0.16,ARRAY['Oklahoma City OK (FAA Academy)','Atlanta GA','Chicago IL','Dallas TX','New York NY'],'Q1 2026','FAA Air Traffic Workforce Plan 2026','FAA 3,000 controllers below target. Average 1,800 new hires needed per year.','system@humanproof.ai'),
  ('battery_storage_engineer','global',94,'rising','rising','rising',0.06,72,0.38,ARRAY['California','Texas','Arizona','Nevada','Reston VA'],'Q1 2026','Wood Mackenzie + BloombergNEF BESS 2026','$25B+ BESS market 2026. Battery storage engineers in critical shortage.','system@humanproof.ai'),
  ('hydrogen_engineer','global',88,'rising','rising','rising',0.05,88,0.42,ARRAY['California','Texas','Gulf Coast','Pittsburgh PA','Houston TX'],'Q1 2026','DOE Hydrogen Earthshot + Plug Power + Nel Q1 2026','IRA hydrogen production credits driving acute demand from near-zero base.','system@humanproof.ai'),
  ('industrial_automation_engineer','global',92,'rising','rising','rising',0.08,62,0.32,ARRAY['Detroit MI','Chicago IL','Milwaukee WI','Houston TX','Raleigh NC'],'Q1 2026','ABB + Siemens + Rockwell Q1 2026 hiring','Industry 4.0 + robotics deployment outpacing engineer supply.','system@humanproof.ai'),
  ('master_electrician','global',88,'rising','rising','rising',0.04,42,0.24,ARRAY['Texas','Florida','California','Arizona','North Carolina'],'Q1 2026','IBEW + NECA Workforce Report 2026','4-5M skilled trade vacancy. Master electrician exam pass rates declining. Union shortage critical.','system@humanproof.ai'),
  ('nuclear_engineer','global',84,'rising','rising','rising',0.06,88,0.18,ARRAY['Virginia','South Carolina','Illinois','Tennessee','Georgia'],'Q1 2026','NEI + NRC SMR workforce report 2026','SMR (Small Modular Reactor) wave + life extension of existing fleet driving demand.','system@humanproof.ai'),
  ('demand_planner','global',60,'falling','falling','stable',0.38,28,-0.14,ARRAY['Remote','Chicago IL','Minneapolis MN','Cincinnati OH','Columbus OH'],'Q1 2026','Blue Yonder + Kinaxis + o9 AI adoption Q1 2026','AI-driven demand forecasting compressing junior demand planner roles.','system@humanproof.ai'),
  ('reservoir_engineer','global',52,'falling','falling','falling',0.18,62,-0.22,ARRAY['Houston TX','Denver CO','Midland TX','Calgary AB','Aberdeen UK'],'Q1 2026','SLB + Baker Hughes Q1 2026 headcount','Energy transition compressing upstream O&G headcount. Premium still for experienced PEs.','system@humanproof.ai')
ON CONFLICT (role_key, region) DO UPDATE SET demand_index=EXCLUDED.demand_index, demand_trend=EXCLUDED.demand_trend, job_openings_trend=EXCLUDED.job_openings_trend, salary_trend=EXCLUDED.salary_trend, ai_substitution_risk=EXCLUDED.ai_substitution_risk, time_to_fill_days=EXCLUDED.time_to_fill_days, yoy_job_openings_change=EXCLUDED.yoy_job_openings_change, top_hiring_locations=EXCLUDED.top_hiring_locations, data_quarter=EXCLUDED.data_quarter, data_source=EXCLUDED.data_source, calibration_note=EXCLUDED.calibration_note, updated_at=NOW();
