// roleMarketDemandService.ts — v16.0 + v37.0 multi-industry demand expansion
// Dynamic role demand index — 2026-Q1 data for 30+ key roles.
//
// Replaces static roleExposureData.ts values with demand signals that can be
// refreshed each quarter. The demandIndex is a composite of:
//   job openings trend × 0.45
//   salary trend       × 0.30
//   time-to-fill trend × 0.25
//
// All data is self-contained (no external API calls). The pipeline injects this
// data via computeMarketDemandReport(); callers never reach out to a network.

// v37.0 multi-industry demand additions
import { DEMAND_ADDITIONS_HEALTHCARE_LEGAL } from "../data/actions/healthcare_legal_actions";
import { DEMAND_ADDITIONS_CONSULTING_MARKETING_CX } from "../data/actions/consulting_marketing_cx_actions";
import { DEMAND_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION } from "../data/actions/manufacturing_energy_construction_actions";
import { DEMAND_ADDITIONS_RETAIL_LOGISTICS_PHARMA } from "../data/actions/retail_logistics_pharma_actions";
import { DEMAND_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION } from "../data/actions/auto_telecom_govt_education_actions";
import { DEMAND_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY } from "../data/actions/insurance_media_hospitality_actions";
// v38.0 Phase 1
import { DEMAND_ADDITIONS_CYBERSECURITY } from "../data/actions/cybersecurity_actions";
import { DEMAND_ADDITIONS_CLOUD_PLATFORM } from "../data/actions/cloud_platform_actions";
import { DEMAND_ADDITIONS_AI_ML_SPECIALIZATION } from "../data/actions/ai_ml_specialization_actions";
import { DEMAND_ADDITIONS_QA_FRONTEND_MOBILE } from "../data/actions/qa_frontend_mobile_actions";
// v38.0 Phase 2
import { DEMAND_ADDITIONS_PHYSICIANS } from "../data/actions/physicians_actions";
import { DEMAND_ADDITIONS_NURSING_ALLIED_HEALTH } from "../data/actions/nursing_allied_health_actions";
import { DEMAND_ADDITIONS_BIOTECH_HEALTHCARE_IT } from "../data/actions/biotech_healthcare_it_actions";
import { DEMAND_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH } from "../data/actions/behavioral_admin_vet_public_health_actions";
// v38.0 Phase 3
import { DEMAND_ADDITIONS_INVESTMENT_BANKING_PE_VC } from "../data/actions/investment_banking_pe_vc_actions";
import { DEMAND_ADDITIONS_QUANT_ASSET_HEDGE } from "../data/actions/quant_asset_hedge_actions";
import { DEMAND_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK } from "../data/actions/corporate_finance_banking_risk_actions";
import { DEMAND_ADDITIONS_INSURANCE_RE_FINANCE } from "../data/actions/insurance_real_estate_finance_actions";
// v38.0 Phase 4
import { DEMAND_ADDITIONS_SKILLED_TRADES } from "../data/actions/skilled_trades_actions";
import { DEMAND_ADDITIONS_INDUSTRIAL_ENGINEERING } from "../data/actions/industrial_engineering_actions";
import { DEMAND_ADDITIONS_ENERGY_SPECIALIZATIONS } from "../data/actions/energy_specializations_actions";
import { DEMAND_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS } from "../data/actions/construction_specializations_actions";
import { DEMAND_ADDITIONS_AVIATION_PUBLIC_SAFETY } from "../data/actions/aviation_public_safety_actions";
// v38.0 Phase 5
import { DEMAND_ADDITIONS_MEDIA_ENTERTAINMENT } from "../data/actions/media_entertainment_actions";
import { DEMAND_ADDITIONS_HOSPITALITY_TRAVEL } from "../data/actions/hospitality_travel_actions";
import { DEMAND_ADDITIONS_CX_RESEARCH_ACADEMIA } from "../data/actions/cx_research_academia_actions";
// v38.0 Phase 6
import { DEMAND_ADDITIONS_MEDICAL_SUBSPECIALTIES } from "../data/actions/medical_subspecialties_actions";
import { DEMAND_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE } from "../data/actions/advanced_engineering_creative_actions";
import { DEMAND_ADDITIONS_SKILLED_SERVICES_EDU_GOV } from "../data/actions/skilled_services_education_government_actions";
// v39.0 A1: DB-backed role intelligence override layer
import { getRoleOverride } from "./roleIntelligenceClient";

// ─── Public types ────────────────────────────────────────────────────────────

export type DemandTrend = 'surging' | 'rising' | 'stable' | 'declining' | 'falling';

export interface RoleDemandSnapshot {
  /** Matches work-type keys used throughout the pipeline (e.g. 'sw_backend') */
  roleKey: string;
  roleName: string;
  /** 0–100: higher = more in-demand right now */
  demandIndex: number;
  demandTrend: DemandTrend;
  jobOpeningsTrend: DemandTrend;
  salaryTrend: 'rising' | 'stable' | 'falling';
  /** Median calendar days from posting to accepted offer; null = not tracked */
  timeToFillDays: number | null;
  /** % change in job openings vs. same quarter 12 months prior */
  yoyJobOpeningsChange: number;
  /** Top city/metro areas with most open roles */
  topHiringLocations: string[];
  /** 0–1: fraction of tasks in this role automatable by 2027 AI roadmaps */
  aiSubstitutionRisk: number;
  /** e.g. '2026-Q1' */
  dataQuarter: string;
  calibrationNote: string;
}

export interface MarketDemandReport {
  roleKey: string;
  snapshot: RoleDemandSnapshot;
  /** 1.0 = average market; 1.3 = 30% better than average for this metro */
  localMarketMultiplier: number;
  /** snapshot.demandIndex × localMarketMultiplier, capped at 100 */
  adjustedDemandIndex: number;
  /** Estimated weeks from starting active search to receiving an offer */
  jobSearchRunwayWeeks: number;
  actionRecommendations: string[];
  /** Months since DATA_DATE. Set when > 3 so UI can surface a staleness warning. */
  _staleMonths?: number;
}

// ─── Staleness detection ─────────────────────────────────────────────────────
const ROLE_DEMAND_DATA_DATE = '2026-01-01'; // Q1 2026 snapshot

function computeRoleDataStaleMonths(): number {
  return Math.floor((Date.now() - new Date(ROLE_DEMAND_DATA_DATE).getTime()) / (30 * 24 * 60 * 60 * 1000));
}

// ─── Static demand database (2026-Q1) ────────────────────────────────────────

export const ROLE_DEMAND_DB: Record<string, RoleDemandSnapshot> = {

  ml_engineer: {
    roleKey: 'ml_engineer',
    roleName: 'Machine Learning Engineer',
    demandIndex: 88,
    demandTrend: 'surging',
    jobOpeningsTrend: 'surging',
    salaryTrend: 'rising',
    timeToFillDays: 28,
    yoyJobOpeningsChange: 42,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'Austin', 'London'],
    aiSubstitutionRisk: 0.12, // ML engineers build AI — low displacement risk
    dataQuarter: '2026-Q1',
    calibrationNote: 'Demand driven by enterprise GenAI rollouts; supply remains constrained.',
  },

  sw_backend: {
    roleKey: 'sw_backend',
    roleName: 'Backend Software Engineer',
    demandIndex: 65,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 42,
    yoyJobOpeningsChange: 3,
    topHiringLocations: ['Seattle', 'San Francisco', 'New York', 'Austin', 'Bangalore'],
    aiSubstitutionRisk: 0.28,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Steady demand; AI code-gen tools moderately compressing junior openings.',
  },

  sw_frontend: {
    roleKey: 'sw_frontend',
    roleName: 'Frontend / UI Engineer',
    demandIndex: 58,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    salaryTrend: 'stable',
    timeToFillDays: 52,
    yoyJobOpeningsChange: -8,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Berlin', 'Toronto'],
    aiSubstitutionRisk: 0.38,
    dataQuarter: '2026-Q1',
    calibrationNote: 'AI UI-generation tools (v0, Locofy) contracting junior frontend demand.',
  },

  data_scientist: {
    roleKey: 'data_scientist',
    roleName: 'Data Scientist',
    demandIndex: 70,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 38,
    yoyJobOpeningsChange: 18,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'Boston', 'Singapore'],
    aiSubstitutionRisk: 0.20,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Demand for applied DS with LLM fine-tuning skills growing fastest.',
  },

  data_analyst: {
    roleKey: 'data_analyst',
    roleName: 'Data Analyst',
    demandIndex: 55,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 45,
    yoyJobOpeningsChange: 2,
    topHiringLocations: ['New York', 'Chicago', 'Austin', 'Atlanta', 'Bangalore'],
    aiSubstitutionRisk: 0.42,
    dataQuarter: '2026-Q1',
    calibrationNote: 'BI/analytics commodity tools reducing analyst headcount at mid-market firms.',
  },

  product_manager: {
    roleKey: 'product_manager',
    roleName: 'Product Manager',
    demandIndex: 62,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 49,
    yoyJobOpeningsChange: 1,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.18,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Senior PM demand stable; APM programs being cut at post-ZIRP companies.',
  },

  devops_sre: {
    roleKey: 'devops_sre',
    roleName: 'DevOps / Site Reliability Engineer',
    demandIndex: 75,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 35,
    yoyJobOpeningsChange: 21,
    topHiringLocations: ['Seattle', 'San Francisco', 'Austin', 'Bangalore', 'Dublin'],
    aiSubstitutionRisk: 0.16,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Platform/infra complexity growing faster than headcount; SRE shortage persists.',
  },

  security_engineer: {
    roleKey: 'security_engineer',
    roleName: 'Security Engineer / AppSec',
    demandIndex: 80,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 32,
    yoyJobOpeningsChange: 27,
    topHiringLocations: ['Washington DC', 'San Francisco', 'New York', 'London', 'Tel Aviv'],
    aiSubstitutionRisk: 0.10,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Regulatory pressure (SEC, EU NIS2) and AI attack surface expanding demand.',
  },

  bpo_data_entry: {
    roleKey: 'bpo_data_entry',
    roleName: 'BPO Data Entry / Processing',
    demandIndex: 18,
    demandTrend: 'falling',
    jobOpeningsTrend: 'falling',
    salaryTrend: 'falling',
    timeToFillDays: null,
    yoyJobOpeningsChange: -35,
    topHiringLocations: ['Hyderabad', 'Manila', 'Cairo'],
    aiSubstitutionRisk: 0.92,
    dataQuarter: '2026-Q1',
    calibrationNote: 'OCR + LLM automation replacing >90% of data entry tasks; severe contraction.',
  },

  bpo_customer_service: {
    roleKey: 'bpo_customer_service',
    roleName: 'BPO Customer Service / Call Center',
    demandIndex: 22,
    demandTrend: 'falling',
    jobOpeningsTrend: 'falling',
    salaryTrend: 'falling',
    timeToFillDays: null,
    yoyJobOpeningsChange: -28,
    topHiringLocations: ['Manila', 'Colombo', 'Hyderabad'],
    aiSubstitutionRisk: 0.85,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Voice AI / chat bots handling tier-1 support; headcount down sector-wide.',
  },

  qa_manual: {
    roleKey: 'qa_manual',
    roleName: 'QA Engineer (Manual Testing)',
    demandIndex: 30,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    salaryTrend: 'stable',
    timeToFillDays: 60,
    yoyJobOpeningsChange: -18,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'Pune', 'Krakow'],
    aiSubstitutionRisk: 0.68,
    dataQuarter: '2026-Q1',
    calibrationNote: 'AI test-generation (Playwright AI, Testim) compressing manual QA headcount.',
  },

  ux_designer: {
    roleKey: 'ux_designer',
    roleName: 'UX / Product Designer',
    demandIndex: 52,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 55,
    yoyJobOpeningsChange: -2,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Berlin', 'Amsterdam'],
    aiSubstitutionRisk: 0.30,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Senior UX / research roles holding; junior visual design contracting.',
  },

  hr_recruiter: {
    roleKey: 'hr_recruiter',
    roleName: 'HR / Technical Recruiter',
    demandIndex: 35,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    salaryTrend: 'falling',
    timeToFillDays: 68,
    yoyJobOpeningsChange: -22,
    topHiringLocations: ['New York', 'Chicago', 'Bangalore', 'London'],
    aiSubstitutionRisk: 0.55,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Hiring freezes sector-wide compressing recruiter demand; ATS AI reducing sourcing burden.',
  },

  finance_analyst: {
    roleKey: 'finance_analyst',
    roleName: 'Finance / FP&A Analyst',
    demandIndex: 48,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 52,
    yoyJobOpeningsChange: -3,
    topHiringLocations: ['New York', 'London', 'Hong Kong', 'Chicago', 'Bangalore'],
    aiSubstitutionRisk: 0.40,
    dataQuarter: '2026-Q1',
    calibrationNote: 'AI excel assistants compressing junior FP&A; CFO-adjacent strategist roles stable.',
  },

  content_writer: {
    roleKey: 'content_writer',
    roleName: 'Content Writer / Copywriter',
    demandIndex: 25,
    demandTrend: 'falling',
    jobOpeningsTrend: 'falling',
    salaryTrend: 'falling',
    timeToFillDays: null,
    yoyJobOpeningsChange: -40,
    topHiringLocations: ['Remote', 'New York', 'London'],
    aiSubstitutionRisk: 0.80,
    dataQuarter: '2026-Q1',
    calibrationNote: 'LLM-generated content severely contracting commoditized writing roles.',
  },

  technical_writer: {
    roleKey: 'technical_writer',
    roleName: 'Technical Writer',
    demandIndex: 38,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 58,
    yoyJobOpeningsChange: -5,
    topHiringLocations: ['San Francisco', 'Seattle', 'Bangalore', 'London'],
    aiSubstitutionRisk: 0.48,
    dataQuarter: '2026-Q1',
    calibrationNote: 'AI drafts docs; human TW validates accuracy — niche but resilient at senior level.',
  },

  sales_ae: {
    roleKey: 'sales_ae',
    roleName: 'Account Executive (B2B SaaS)',
    demandIndex: 60,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'rising',
    timeToFillDays: 40,
    yoyJobOpeningsChange: 5,
    topHiringLocations: ['San Francisco', 'New York', 'Chicago', 'Austin', 'London'],
    aiSubstitutionRisk: 0.22,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise AE with technical depth in high demand; SMB AE declining.',
  },

  sales_sdr: {
    roleKey: 'sales_sdr',
    roleName: 'Sales Development Representative (SDR)',
    demandIndex: 42,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    salaryTrend: 'stable',
    timeToFillDays: 50,
    yoyJobOpeningsChange: -15,
    topHiringLocations: ['San Francisco', 'New York', 'Austin', 'London'],
    aiSubstitutionRisk: 0.58,
    dataQuarter: '2026-Q1',
    calibrationNote: 'AI outbound tools (Clay, Apollo AI) compressing SDR headcount by ~30% YoY.',
  },

  marketing_manager: {
    roleKey: 'marketing_manager',
    roleName: 'Marketing Manager',
    demandIndex: 50,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 52,
    yoyJobOpeningsChange: 0,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Austin', 'Chicago'],
    aiSubstitutionRisk: 0.35,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Performance marketing stable; brand / events seeing cuts at growth-stage cos.',
  },

  project_manager: {
    roleKey: 'project_manager',
    roleName: 'Project / Program Manager',
    demandIndex: 45,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 55,
    yoyJobOpeningsChange: -4,
    topHiringLocations: ['New York', 'Chicago', 'Washington DC', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.32,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Traditional PM demand flat; AI project tools reducing overhead PM roles.',
  },

  // ── Extended roles (supplement the core 20) ─────────────────────────────

  data_engineer: {
    roleKey: 'data_engineer',
    roleName: 'Data Engineer',
    demandIndex: 72,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 36,
    yoyJobOpeningsChange: 19,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'Bangalore', 'Amsterdam'],
    aiSubstitutionRisk: 0.18,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Data lakehouse + real-time pipelines driving steady demand surge.',
  },

  cloud_architect: {
    roleKey: 'cloud_architect',
    roleName: 'Cloud Architect',
    demandIndex: 78,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 33,
    yoyJobOpeningsChange: 24,
    topHiringLocations: ['Seattle', 'San Francisco', 'Dublin', 'Sydney', 'Bangalore'],
    aiSubstitutionRisk: 0.12,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Multi-cloud + FinOps specialists in severe shortage across enterprise.',
  },

  ai_llm_engineer: {
    roleKey: 'ai_llm_engineer',
    roleName: 'AI / LLM Systems Engineer',
    demandIndex: 92,
    demandTrend: 'surging',
    jobOpeningsTrend: 'surging',
    salaryTrend: 'rising',
    timeToFillDays: 22,
    yoyJobOpeningsChange: 68,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Zurich', 'Singapore'],
    aiSubstitutionRisk: 0.08,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Fastest-growing engineering specialty in 2026; median tenure offer is 14 months.',
  },

  mobile_engineer: {
    roleKey: 'mobile_engineer',
    roleName: 'Mobile Engineer (iOS/Android)',
    demandIndex: 60,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 44,
    yoyJobOpeningsChange: 2,
    topHiringLocations: ['San Francisco', 'New York', 'Berlin', 'Singapore', 'Bangalore'],
    aiSubstitutionRisk: 0.25,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Consumer app market mature; wearables + AR expanding specialist demand.',
  },

  network_engineer: {
    roleKey: 'network_engineer',
    roleName: 'Network / Infrastructure Engineer',
    demandIndex: 55,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 48,
    yoyJobOpeningsChange: 1,
    topHiringLocations: ['Dallas', 'Chicago', 'Washington DC', 'London', 'Mumbai'],
    aiSubstitutionRisk: 0.22,
    dataQuarter: '2026-Q1',
    calibrationNote: 'On-prem + hybrid infra stable; pure-DC networking declining as cloud grows.',
  },

  bi_developer: {
    roleKey: 'bi_developer',
    roleName: 'Business Intelligence Developer',
    demandIndex: 48,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    salaryTrend: 'stable',
    timeToFillDays: 56,
    yoyJobOpeningsChange: -10,
    topHiringLocations: ['New York', 'Chicago', 'Bangalore', 'Warsaw', 'Toronto'],
    aiSubstitutionRisk: 0.50,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Self-service BI (Sigma, Looker AI) reducing bespoke BI dev demand.',
  },

  legal_counsel: {
    roleKey: 'legal_counsel',
    roleName: 'In-House Legal Counsel / Paralegal',
    demandIndex: 50,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 65,
    yoyJobOpeningsChange: 0,
    topHiringLocations: ['New York', 'London', 'San Francisco', 'Chicago'],
    aiSubstitutionRisk: 0.38,
    dataQuarter: '2026-Q1',
    calibrationNote: 'AI legal research assistants reducing paralegal hours; senior counsel stable.',
  },

  supply_chain_analyst: {
    roleKey: 'supply_chain_analyst',
    roleName: 'Supply Chain / Operations Analyst',
    demandIndex: 53,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    salaryTrend: 'stable',
    timeToFillDays: 50,
    yoyJobOpeningsChange: 3,
    topHiringLocations: ['Chicago', 'Atlanta', 'Dallas', 'Amsterdam', 'Singapore'],
    aiSubstitutionRisk: 0.36,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Post-pandemic supply chain complexity sustaining analyst demand.',
  },

  healthcare_it: {
    roleKey: 'healthcare_it',
    roleName: 'Healthcare IT / EHR Specialist',
    demandIndex: 62,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 40,
    yoyJobOpeningsChange: 14,
    topHiringLocations: ['Boston', 'Nashville', 'Chicago', 'Houston', 'Washington DC'],
    aiSubstitutionRisk: 0.20,
    dataQuarter: '2026-Q1',
    calibrationNote: 'Epic/Cerner migrations + AI clinical tools driving sustained HIT demand.',
  },

  embedded_engineer: {
    roleKey: 'embedded_engineer',
    roleName: 'Embedded Systems / Firmware Engineer',
    demandIndex: 66,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    salaryTrend: 'rising',
    timeToFillDays: 38,
    yoyJobOpeningsChange: 16,
    topHiringLocations: ['Austin', 'San Jose', 'Munich', 'Seoul', 'Shenzhen'],
    aiSubstitutionRisk: 0.10,
    dataQuarter: '2026-Q1',
    calibrationNote: 'EV + robotics + edge AI expanding demand for embedded/firmware talent.',
  },

  // ── v37.0: Phase 1B new role demand entries ────────────────────────────────

  // Engineering aliases (canonical key alignment)
  devops_engineer: {
    roleKey: 'devops_engineer',
    roleName: 'DevOps / Site Reliability Engineer',
    demandIndex: 75, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 35, yoyJobOpeningsChange: 21,
    topHiringLocations: ['Seattle', 'San Francisco', 'Austin', 'Bangalore', 'Dublin'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'Platform/infra complexity growing faster than headcount; SRE shortage persists.',
  },
  platform_engineer: {
    roleKey: 'platform_engineer',
    roleName: 'Platform Engineer',
    demandIndex: 78, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 30, yoyJobOpeningsChange: 35,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Berlin'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Platform engineering recognized as distinct discipline; demand growing rapidly.',
  },
  ai_engineer: {
    roleKey: 'ai_engineer',
    roleName: 'AI Engineer',
    demandIndex: 92, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 22, yoyJobOpeningsChange: 68,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise GenAI deployments creating acute AI engineer shortage.',
  },
  llm_engineer: {
    roleKey: 'llm_engineer',
    roleName: 'LLM / Prompt Engineer',
    demandIndex: 90, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 24, yoyJobOpeningsChange: 85,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Berlin', 'Bangalore'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'LLM production deployment expertise extremely scarce; demand unprecedented.',
  },
  nlp_engineer: {
    roleKey: 'nlp_engineer',
    roleName: 'NLP Engineer',
    demandIndex: 84, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 26, yoyJobOpeningsChange: 52,
    topHiringLocations: ['San Francisco', 'New York', 'Boston', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'LLM era elevating NLP from niche to core; demand tracking AI adoption curve.',
  },
  cv_engineer: {
    roleKey: 'cv_engineer',
    roleName: 'Computer Vision Engineer',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 30, yoyJobOpeningsChange: 38,
    topHiringLocations: ['San Francisco', 'Seattle', 'Munich', 'Seoul', 'Tel Aviv'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'Robotics, autonomous vehicles, and medical imaging driving CV demand.',
  },
  qa_engineer: {
    roleKey: 'qa_engineer',
    roleName: 'QA / Test Automation Engineer',
    demandIndex: 52, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 48, yoyJobOpeningsChange: -12,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'Pune', 'Warsaw', 'Toronto'],
    aiSubstitutionRisk: 0.52, dataQuarter: '2026-Q1',
    calibrationNote: 'AI code-gen reducing manual QA; automation SDET roles more resilient.',
  },
  eng_manager: {
    roleKey: 'eng_manager',
    roleName: 'Engineering Manager',
    demandIndex: 58, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 60, yoyJobOpeningsChange: -15,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Berlin'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'Post-ZIRP flattening; span-of-control rationalization reducing EM headcount.',
  },
  tech_lead: {
    roleKey: 'tech_lead',
    roleName: 'Tech Lead',
    demandIndex: 65, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 45, yoyJobOpeningsChange: 2,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'Bangalore', 'London'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Demand stable; companies prefer IC-TL hybrid over dedicated TL.',
  },
  staff_engineer: {
    roleKey: 'staff_engineer',
    roleName: 'Staff / Principal Engineer',
    demandIndex: 70, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 5,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior IC track resilient post-2025; companies investing in depth over breadth.',
  },
  solution_architect: {
    roleKey: 'solution_architect',
    roleName: 'Solutions Architect',
    demandIndex: 68, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 50, yoyJobOpeningsChange: 4,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Singapore', 'Sydney'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise cloud migration sustaining demand for solutions architects.',
  },
  support_engineer: {
    roleKey: 'support_engineer',
    roleName: 'Technical Support Engineer',
    demandIndex: 48, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 42, yoyJobOpeningsChange: -18,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'Manila', 'Dublin', 'Austin'],
    aiSubstitutionRisk: 0.60, dataQuarter: '2026-Q1',
    calibrationNote: 'AI-first support tools displacing Tier 1-2 support headcount rapidly.',
  },
  bpo_associate: {
    roleKey: 'bpo_associate',
    roleName: 'BPO / ITES Associate',
    demandIndex: 38, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'falling',
    timeToFillDays: 20, yoyJobOpeningsChange: -28,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'Noida', 'Pune', 'Manila'],
    aiSubstitutionRisk: 0.78, dataQuarter: '2026-Q1',
    calibrationNote: 'AI automation accelerating BPO displacement; transition urgency high.',
  },

  // Analytics & Data (new canonical keys)
  analytics_engineer: {
    roleKey: 'analytics_engineer',
    roleName: 'Analytics Engineer',
    demandIndex: 72, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 26,
    topHiringLocations: ['San Francisco', 'New York', 'Austin', 'London', 'Amsterdam'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'dbt ecosystem growth driving analytics engineering as distinct discipline.',
  },
  bi_analyst: {
    roleKey: 'bi_analyst',
    roleName: 'BI Developer / Analyst',
    demandIndex: 54, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 44, yoyJobOpeningsChange: -3,
    topHiringLocations: ['New York', 'Chicago', 'Dallas', 'Bangalore', 'London'],
    aiSubstitutionRisk: 0.40, dataQuarter: '2026-Q1',
    calibrationNote: 'Self-service BI tools (Looker, Tableau AI) compressing junior analyst demand.',
  },
  quantitative_analyst: {
    roleKey: 'quantitative_analyst',
    roleName: 'Quantitative Analyst',
    demandIndex: 74, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 40, yoyJobOpeningsChange: 18,
    topHiringLocations: ['New York', 'London', 'Hong Kong', 'Chicago', 'Singapore'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Quants with ML expertise in demand; pure stat quants face AI compression.',
  },
  ml_ops_engineer: {
    roleKey: 'ml_ops_engineer',
    roleName: 'MLOps Engineer',
    demandIndex: 82, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 28, yoyJobOpeningsChange: 48,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise AI deployment creating MLOps as mandatory infrastructure role.',
  },
  data_governance_analyst: {
    roleKey: 'data_governance_analyst',
    roleName: 'Data Governance Analyst',
    demandIndex: 60, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 46, yoyJobOpeningsChange: 22,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Singapore', 'Toronto'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'GDPR, AI Act, and enterprise data quality investments driving governance demand.',
  },

  // Product & Design (new canonical keys)
  ux_researcher: {
    roleKey: 'ux_researcher',
    roleName: 'UX Researcher',
    demandIndex: 55, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 52, yoyJobOpeningsChange: -10,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Amsterdam', 'Seattle'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'Post-ZIRP research team cuts; AI research synthesis tools compressing roles.',
  },
  brand_designer: {
    roleKey: 'brand_designer',
    roleName: 'Brand / Graphic Designer',
    demandIndex: 45, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'falling',
    timeToFillDays: 48, yoyJobOpeningsChange: -22,
    topHiringLocations: ['New York', 'Los Angeles', 'London', 'Berlin', 'São Paulo'],
    aiSubstitutionRisk: 0.58, dataQuarter: '2026-Q1',
    calibrationNote: 'Generative AI (Midjourney, DALL-E, Firefly) significantly compressing brand design demand.',
  },

  // Finance & Accounting (new canonical keys)
  financial_analyst: {
    roleKey: 'financial_analyst',
    roleName: 'Financial Analyst',
    demandIndex: 58, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 46, yoyJobOpeningsChange: 0,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Hong Kong', 'Singapore'],
    aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1',
    calibrationNote: 'AI financial modelling tools compressing junior analyst roles; senior FP&A resilient.',
  },
  investment_banker: {
    roleKey: 'investment_banker',
    roleName: 'Investment Banker',
    demandIndex: 62, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 12,
    topHiringLocations: ['New York', 'London', 'Hong Kong', 'Singapore', 'Dubai'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'M&A activity recovering 2026; relationship-driven senior banking highly resilient.',
  },
  portfolio_manager: {
    roleKey: 'portfolio_manager',
    roleName: 'Portfolio Manager',
    demandIndex: 60, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 65, yoyJobOpeningsChange: 2,
    topHiringLocations: ['New York', 'London', 'Hong Kong', 'Boston', 'Zurich'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'Quant fund growth offset by passive index expansion; active PM market stable.',
  },
  risk_analyst: {
    roleKey: 'risk_analyst',
    roleName: 'Risk Analyst',
    demandIndex: 65, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 16,
    topHiringLocations: ['New York', 'London', 'Singapore', 'Frankfurt', 'Toronto'],
    aiSubstitutionRisk: 0.26, dataQuarter: '2026-Q1',
    calibrationNote: 'Basel IV compliance and AI risk regulation driving risk analyst demand.',
  },
  compliance_officer: {
    roleKey: 'compliance_officer',
    roleName: 'Compliance Officer',
    demandIndex: 68, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 44, yoyJobOpeningsChange: 20,
    topHiringLocations: ['New York', 'London', 'Singapore', 'Frankfurt', 'Dublin'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'AI regulation, crypto rules, and AML expansion driving compliance hiring.',
  },
  auditor_cpa: {
    roleKey: 'auditor_cpa',
    roleName: 'Auditor / CPA',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 50, yoyJobOpeningsChange: 4,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Bangalore', 'Sydney'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'Big-4 hiring steady; AI audit tools raising efficiency not headcount.',
  },
  controller: {
    roleKey: 'controller',
    roleName: 'Financial Controller',
    demandIndex: 60, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 55, yoyJobOpeningsChange: 1,
    topHiringLocations: ['New York', 'Chicago', 'San Francisco', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'Controller demand stable; ERP automation reducing headcount growth.',
  },
  cfo: {
    roleKey: 'cfo',
    roleName: 'Chief Financial Officer',
    demandIndex: 55, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 90, yoyJobOpeningsChange: -3,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Singapore', 'Toronto'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'CFO demand stable; AI-first finance orgs need CFOs who understand AI ROI.',
  },
  treasury_analyst: {
    roleKey: 'treasury_analyst',
    roleName: 'Treasury Analyst',
    demandIndex: 58, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 48, yoyJobOpeningsChange: 3,
    topHiringLocations: ['New York', 'London', 'Singapore', 'Frankfurt', 'Chicago'],
    aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1',
    calibrationNote: 'Treasury analytics automation compressing junior roles; senior treasury stable.',
  },
  tax_specialist: {
    roleKey: 'tax_specialist',
    roleName: 'Tax Specialist / Manager',
    demandIndex: 64, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 44, yoyJobOpeningsChange: 10,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Bangalore', 'Toronto'],
    aiSubstitutionRisk: 0.25, dataQuarter: '2026-Q1',
    calibrationNote: 'Pillar Two global minimum tax complexity driving international tax specialist demand.',
  },
  actuarial_analyst: {
    roleKey: 'actuarial_analyst',
    roleName: 'Actuarial Analyst',
    demandIndex: 70, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 14,
    topHiringLocations: ['New York', 'Hartford', 'London', 'Toronto', 'Singapore'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'Climate risk and longevity modeling driving actuarial demand; credentials scarce.',
  },
  equity_researcher: {
    roleKey: 'equity_researcher',
    roleName: 'Equity Research Analyst',
    demandIndex: 55, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 55, yoyJobOpeningsChange: -8,
    topHiringLocations: ['New York', 'London', 'Hong Kong', 'Singapore', 'Mumbai'],
    aiSubstitutionRisk: 0.40, dataQuarter: '2026-Q1',
    calibrationNote: 'AI research synthesis tools compressing sell-side research analyst headcount.',
  },
  senior_financial_analyst: {
    roleKey: 'senior_financial_analyst',
    roleName: 'Senior Financial Analyst',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 48, yoyJobOpeningsChange: 5,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Singapore', 'Toronto'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior FA demand stable; AI automation selectively compressing junior roles.',
  },
  fp_a_analyst: {
    roleKey: 'fp_a_analyst',
    roleName: 'FP&A Analyst',
    demandIndex: 65, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 44, yoyJobOpeningsChange: 12,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Singapore', 'Austin'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'Real-time financial intelligence driving FP&A evolution; strategic FP&A in demand.',
  },

  // Sales & Revenue (new canonical keys)
  account_executive: {
    roleKey: 'account_executive',
    roleName: 'Account Executive',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 38, yoyJobOpeningsChange: -2,
    topHiringLocations: ['San Francisco', 'New York', 'Chicago', 'London', 'Austin'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise AE demand stable; SMB AE market compressing with AI sales tools.',
  },
  business_development_manager: {
    roleKey: 'business_development_manager',
    roleName: 'Business Development Manager',
    demandIndex: 60, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 42, yoyJobOpeningsChange: 0,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Singapore', 'Dubai'],
    aiSubstitutionRisk: 0.25, dataQuarter: '2026-Q1',
    calibrationNote: 'Partnership and BD roles stable; AI lead-gen tools changing outbound motion.',
  },
  customer_success_manager: {
    roleKey: 'customer_success_manager',
    roleName: 'Customer Success Manager',
    demandIndex: 58, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 40, yoyJobOpeningsChange: -8,
    topHiringLocations: ['San Francisco', 'New York', 'Austin', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.35, dataQuarter: '2026-Q1',
    calibrationNote: 'Post-ZIRP CS team cuts; AI CS tools (Gainsight AI) compressing headcount.',
  },
  sales_engineer: {
    roleKey: 'sales_engineer',
    roleName: 'Sales / Solutions Engineer',
    demandIndex: 72, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 36, yoyJobOpeningsChange: 20,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'London', 'Austin'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'Technical complexity of enterprise AI products elevating SE importance.',
  },
  vp_sales: {
    roleKey: 'vp_sales',
    roleName: 'VP Sales / Head of Sales',
    demandIndex: 55, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 70, yoyJobOpeningsChange: -5,
    topHiringLocations: ['San Francisco', 'New York', 'Chicago', 'London', 'Austin'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior sales leadership resilient; VP Sales tenure under pressure from missed targets.',
  },
  sales_operations_analyst: {
    roleKey: 'sales_operations_analyst',
    roleName: 'Sales / Revenue Operations',
    demandIndex: 68, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 24,
    topHiringLocations: ['San Francisco', 'New York', 'Chicago', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.25, dataQuarter: '2026-Q1',
    calibrationNote: 'RevOps emergence as strategic function; CRM AI complexity driving analyst demand.',
  },
  sales_development_rep: {
    roleKey: 'sales_development_rep',
    roleName: 'SDR / BDR',
    demandIndex: 42, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'falling',
    timeToFillDays: 28, yoyJobOpeningsChange: -30,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Dublin', 'Austin'],
    aiSubstitutionRisk: 0.72, dataQuarter: '2026-Q1',
    calibrationNote: 'AI outbound tools (Clay, Apollo AI) dramatically compressing SDR/BDR headcount.',
  },
  senior_account_executive: {
    roleKey: 'senior_account_executive',
    roleName: 'Senior Account Executive',
    demandIndex: 65, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 5,
    topHiringLocations: ['San Francisco', 'New York', 'Chicago', 'London', 'Singapore'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise senior AE demand stable; experienced sellers with AI knowledge valued.',
  },
  enterprise_ae: {
    roleKey: 'enterprise_ae',
    roleName: 'Enterprise Account Executive',
    demandIndex: 68, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 12,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Singapore', 'Tokyo'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Enterprise AI contract complexity requires experienced enterprise sellers.',
  },
  chief_revenue_officer: {
    roleKey: 'chief_revenue_officer',
    roleName: 'Chief Revenue Officer',
    demandIndex: 52, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 90, yoyJobOpeningsChange: -2,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Austin', 'Chicago'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'CRO role under scrutiny post-ZIRP; AI GTM transformation creating demand for new profile.',
  },
  revenue_operations_manager: {
    roleKey: 'revenue_operations_manager',
    roleName: 'Revenue Operations Manager',
    demandIndex: 70, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 40, yoyJobOpeningsChange: 28,
    topHiringLocations: ['San Francisco', 'New York', 'Austin', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'RevOps centralization and AI CRM adoption driving senior RevOps manager demand.',
  },
  partnership_manager: {
    roleKey: 'partnership_manager',
    roleName: 'Partnerships / Channel Manager',
    demandIndex: 58, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 44, yoyJobOpeningsChange: 2,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Singapore', 'Amsterdam'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'Ecosystem-led growth strategy sustaining partnerships headcount.',
  },

  // HR & People Operations (new canonical keys)
  hr_generalist: {
    roleKey: 'hr_generalist',
    roleName: 'HR Generalist',
    demandIndex: 50, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 38, yoyJobOpeningsChange: -12,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Bangalore', 'Toronto'],
    aiSubstitutionRisk: 0.42, dataQuarter: '2026-Q1',
    calibrationNote: 'HR automation (Workday, BambooHR AI) compressing generalist headcount.',
  },
  hr_business_partner: {
    roleKey: 'hr_business_partner',
    roleName: 'HR Business Partner',
    demandIndex: 58, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 45, yoyJobOpeningsChange: -4,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Amsterdam', 'Toronto'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'Strategic HRBP roles more resilient than generalists; advisory function in demand.',
  },
  hr_director: {
    roleKey: 'hr_director',
    roleName: 'HR Director / CHRO',
    demandIndex: 52, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 70, yoyJobOpeningsChange: -6,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Singapore', 'Chicago'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior HR leadership resilient; AI transformation driving CHRO agenda centrality.',
  },
  talent_acquisition_specialist: {
    roleKey: 'talent_acquisition_specialist',
    roleName: 'Talent Acquisition Specialist',
    demandIndex: 44, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'falling',
    timeToFillDays: 35, yoyJobOpeningsChange: -20,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'New York', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.50, dataQuarter: '2026-Q1',
    calibrationNote: 'Hiring freezes + AI sourcing tools dramatically reducing TA headcount.',
  },
  recruiting_manager: {
    roleKey: 'recruiting_manager',
    roleName: 'Recruiting Manager',
    demandIndex: 48, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 42, yoyJobOpeningsChange: -14,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Bangalore', 'Toronto'],
    aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1',
    calibrationNote: 'TA team rationalization; managers with AI sourcing expertise more resilient.',
  },
  executive_recruiter: {
    roleKey: 'executive_recruiter',
    roleName: 'Executive Recruiter / Headhunter',
    demandIndex: 56, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 60, yoyJobOpeningsChange: 0,
    topHiringLocations: ['New York', 'London', 'San Francisco', 'Singapore', 'Dubai'],
    aiSubstitutionRisk: 0.25, dataQuarter: '2026-Q1',
    calibrationNote: 'Executive search relationship-driven; AI tools augment but do not replace.',
  },
  compensation_benefits_analyst: {
    roleKey: 'compensation_benefits_analyst',
    roleName: 'Compensation & Benefits Analyst',
    demandIndex: 58, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 46, yoyJobOpeningsChange: 4,
    topHiringLocations: ['New York', 'San Francisco', 'Chicago', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.35, dataQuarter: '2026-Q1',
    calibrationNote: 'AI comp benchmarking tools evolving role toward strategy vs data entry.',
  },
  learning_development_manager: {
    roleKey: 'learning_development_manager',
    roleName: 'Learning & Development Manager',
    demandIndex: 56, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 44, yoyJobOpeningsChange: 15,
    topHiringLocations: ['New York', 'London', 'Singapore', 'Sydney', 'Toronto'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'AI reskilling imperative driving L&D investment across enterprises.',
  },
  dei_program_manager: {
    roleKey: 'dei_program_manager',
    roleName: 'DEI Program Manager',
    demandIndex: 38, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'falling',
    timeToFillDays: 55, yoyJobOpeningsChange: -32,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Toronto', 'Chicago'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'Political and legal pressure causing widespread DEI team reductions 2025–2026.',
  },
  chief_people_officer: {
    roleKey: 'chief_people_officer',
    roleName: 'Chief People Officer / CHRO',
    demandIndex: 50, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 90, yoyJobOpeningsChange: -5,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Singapore', 'Austin'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'CPO role evolving; AI workforce transformation making people strategy critical.',
  },

  // Engineering leadership (new canonical keys)
  vp_engineering: {
    roleKey: 'vp_engineering',
    roleName: 'VP Engineering',
    demandIndex: 52, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 80, yoyJobOpeningsChange: -18,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'London', 'Austin'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'Engineering leadership layers being compressed; VP Eng headcount rationalizing.',
  },
  director_engineering: {
    roleKey: 'director_engineering',
    roleName: 'Director of Engineering',
    demandIndex: 55, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 65, yoyJobOpeningsChange: -12,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Austin'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Mid-management rationalization; Directors with AI delivery experience valued.',
  },
  cto: {
    roleKey: 'cto',
    roleName: 'Chief Technology Officer',
    demandIndex: 50, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 100, yoyJobOpeningsChange: -3,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Berlin', 'Singapore'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'CTO demand stable; AI transformation is CTOs\' primary agenda, raising strategic value.',
  },
  distinguished_engineer: {
    roleKey: 'distinguished_engineer',
    roleName: 'Distinguished / Fellow Engineer',
    demandIndex: 60, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 120, yoyJobOpeningsChange: 2,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Cambridge'],
    aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1',
    calibrationNote: 'Distinguished engineer roles rare but highly resilient; scarcity creates protection.',
  },
  principal_engineer: {
    roleKey: 'principal_engineer',
    roleName: 'Principal Engineer',
    demandIndex: 68, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 58, yoyJobOpeningsChange: 4,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior IC track gaining ground post-ZIRP; principals less exposed than managers.',
  },

  // Product & Design additional
  sw_pm: {
    roleKey: 'sw_pm',
    roleName: 'Product Manager',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 49, yoyJobOpeningsChange: 1,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior PM demand stable; APM programs being cut at post-ZIRP companies.',
  },
  associate_pm: {
    roleKey: 'associate_pm',
    roleName: 'Associate Product Manager',
    demandIndex: 44, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 45, yoyJobOpeningsChange: -25,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'APM programs widely cancelled post-ZIRP; entry-level PM market highly compressed.',
  },
  product_analyst: {
    roleKey: 'product_analyst',
    roleName: 'Product Analyst',
    demandIndex: 58, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 42, yoyJobOpeningsChange: 3,
    topHiringLocations: ['San Francisco', 'New York', 'Austin', 'London', 'Singapore'],
    aiSubstitutionRisk: 0.35, dataQuarter: '2026-Q1',
    calibrationNote: 'Product analytics automation compressing role; SQL+data literacy raising floor.',
  },
  product_director: {
    roleKey: 'product_director',
    roleName: 'Director of Product / VP Product',
    demandIndex: 55, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 65, yoyJobOpeningsChange: -6,
    topHiringLocations: ['San Francisco', 'New York', 'Seattle', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior product leadership stable; AI product expertise commanding premium.',
  },
  ai_product_manager: {
    roleKey: 'ai_product_manager',
    roleName: 'AI Product Manager',
    demandIndex: 86, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 28, yoyJobOpeningsChange: 72,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Berlin'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'AI PM is 2026\'s highest-demand product role; ML+product hybrid extremely scarce.',
  },
  product_designer: {
    roleKey: 'product_designer',
    roleName: 'Product Designer',
    demandIndex: 58, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 48, yoyJobOpeningsChange: -10,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Berlin', 'Amsterdam'],
    aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1',
    calibrationNote: 'Post-ZIRP design team cuts; AI design tools (Figma AI, v0) compressing headcount.',
  },
  ux_writer: {
    roleKey: 'ux_writer',
    roleName: 'UX Writer / Content Designer',
    demandIndex: 46, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'falling',
    timeToFillDays: 50, yoyJobOpeningsChange: -28,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Dublin', 'Amsterdam'],
    aiSubstitutionRisk: 0.65, dataQuarter: '2026-Q1',
    calibrationNote: 'LLM-based UX copy generation rapidly compressing UX writer headcount.',
  },
  design_director: {
    roleKey: 'design_director',
    roleName: 'Design Director / Head of Design',
    demandIndex: 52, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 65, yoyJobOpeningsChange: -12,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Berlin', 'Amsterdam'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Design leadership flattening; AI tools raising output-per-designer reducing headcount.',
  },

  // Additional SWE canonical keys
  sw_software_engineer: {
    roleKey: 'sw_software_engineer',
    roleName: 'Software Engineer',
    demandIndex: 65, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 40, yoyJobOpeningsChange: 2,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'Bangalore', 'Austin'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'AI code-gen moderately compressing junior SWE; senior AI-fluent SWEs in demand.',
  },
  sw_fullstack: {
    roleKey: 'sw_fullstack',
    roleName: 'Full Stack Developer',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 42, yoyJobOpeningsChange: 0,
    topHiringLocations: ['San Francisco', 'New York', 'London', 'Bangalore', 'Toronto'],
    aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1',
    calibrationNote: 'Full-stack demand stable; AI-assisted development increasing per-developer output.',
  },
  sw_mobile_crossplatform: {
    roleKey: 'sw_mobile_crossplatform',
    roleName: 'Mobile Developer (iOS/Android/React Native)',
    demandIndex: 60, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 44, yoyJobOpeningsChange: -2,
    topHiringLocations: ['San Francisco', 'New York', 'Seoul', 'London', 'Bangalore'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'Mobile demand stable; cross-platform (Flutter, React Native) preferred over native.',
  },
  sw_dba: {
    roleKey: 'sw_dba',
    roleName: 'Database Administrator',
    demandIndex: 52, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 50, yoyJobOpeningsChange: -10,
    topHiringLocations: ['New York', 'Chicago', 'Bangalore', 'London', 'Toronto'],
    aiSubstitutionRisk: 0.45, dataQuarter: '2026-Q1',
    calibrationNote: 'Cloud-managed DBs (RDS, Aurora, AlloyDB) reducing DBA headcount demand.',
  },
  research_scientist: {
    roleKey: 'research_scientist',
    roleName: 'Research Scientist',
    demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 60, yoyJobOpeningsChange: 30,
    topHiringLocations: ['San Francisco', 'Seattle', 'New York', 'London', 'Cambridge'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'AI frontier research scientist demand led by labs (Anthropic, Google, Meta AI).',
  },
};

// ─── Metro multiplier table ───────────────────────────────────────────────────

const METRO_MULTIPLIERS: Record<string, number> = {
  san_francisco:  1.35,
  san_jose:       1.30,
  new_york:       1.25,
  seattle:        1.20,
  austin:         1.15,
  boston:         1.15,
  washington_dc:  1.12,
  chicago:        1.10,
  los_angeles:    1.10,
  london:         1.08,
  toronto:        1.05,
  singapore:      1.05,
  berlin:         1.02,
  amsterdam:      1.00,
  bangalore:      0.90,
  hyderabad:      0.88,
  pune:           0.85,
  mumbai:         0.87,
  chennai:        0.84,
  other:          1.00,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function normalizeMetroKey(metro: string): string {
  return metro
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function getLocalMultiplier(metro: string | undefined): number {
  if (!metro) return 1.00;
  const key = normalizeMetroKey(metro);
  return METRO_MULTIPLIERS[key] ?? METRO_MULTIPLIERS['other'];
}

function demandIndexToRunwayWeeks(demandIndex: number): number {
  if (demandIndex > 75)  return 4;   // midpoint 3-6
  if (demandIndex >= 60) return 8;   // midpoint 6-10
  if (demandIndex >= 45) return 13;  // midpoint 10-16
  if (demandIndex >= 30) return 20;  // midpoint 16-24
  return 32;                         // midpoint 24-40
}

function buildActionRecommendations(
  snapshot: RoleDemandSnapshot,
  adjustedDemandIndex: number,
  runwayWeeks: number,
): string[] {
  const recs: string[] = [];

  if (snapshot.demandTrend === 'surging' || snapshot.demandTrend === 'rising') {
    recs.push(
      `Your role is in ${snapshot.demandTrend} demand — start targeted applications immediately to capture peak market.`,
    );
  }

  if (snapshot.aiSubstitutionRisk >= 0.65) {
    recs.push(
      `High AI substitution risk (${Math.round(snapshot.aiSubstitutionRisk * 100)}%). Prioritize upskilling in AI-adjacent adjacent skills within 6 months.`,
    );
  }

  if (snapshot.salaryTrend === 'rising') {
    recs.push('Salary benchmarks trending up — negotiate above midpoint in current offers.');
  } else if (snapshot.salaryTrend === 'falling') {
    recs.push('Salaries declining in this role — consider pivoting to adjacent higher-demand roles.');
  }

  if (runwayWeeks <= 6) {
    recs.push(`Estimated job search runway: ${runwayWeeks} weeks — high confidence in finding a new role quickly.`);
  } else if (runwayWeeks >= 20) {
    recs.push(
      `Estimated job search runway: ${runwayWeeks} weeks — plan financially for an extended search. Build savings buffer now.`,
    );
  }

  if (snapshot.topHiringLocations.length > 0) {
    recs.push(
      `Strongest hiring markets: ${snapshot.topHiringLocations.slice(0, 3).join(', ')}. Consider remote-first or relocation options.`,
    );
  }

  if (adjustedDemandIndex >= 80 && snapshot.timeToFillDays && snapshot.timeToFillDays < 35) {
    recs.push('Hiring pace is fast — expect compressed interview timelines. Prepare references and portfolio immediately.');
  }

  return recs;
}

// ─── Unknown role fallback ────────────────────────────────────────────────────

const UNKNOWN_ROLE_FALLBACK: RoleDemandSnapshot = {
  roleKey: 'unknown',
  roleName: 'Unknown Role',
  demandIndex: 50,
  demandTrend: 'stable',
  jobOpeningsTrend: 'stable',
  salaryTrend: 'stable',
  timeToFillDays: 52,
  yoyJobOpeningsChange: 0,
  topHiringLocations: [],
  aiSubstitutionRisk: 0.30,
  dataQuarter: '2026-Q1',
  calibrationNote: 'Role not found in demand database — using market-average estimates.',
};

// ─── v37.0 + v38.0 multi-industry demand merge ─────────────────────────────────
// DEMAND_ADDITIONS_* shapes evolved across versions:
//   - v37.0 files use: averageDaysToFill, dataAsOf, remoteWorkFeasibility
//   - v38.0 files use: timeToFillDays, dataQuarter, yoyJobOpeningsChange, salaryTrend, roleName
// We support both shapes — extract whichever field is present.
type IndustryDemandAddition = {
  demandIndex: number;
  demandTrend: DemandTrend | string;
  jobOpeningsTrend: DemandTrend | string;
  aiSubstitutionRisk: number;
  topHiringLocations: string[];
  // v37.0 fields
  averageDaysToFill?: number;
  remoteWorkFeasibility?: 'high' | 'medium' | 'low';
  dataAsOf?: string;
  // v38.0 fields
  timeToFillDays?: number;
  yoyJobOpeningsChange?: number;
  salaryTrend?: string;
  dataQuarter?: string;
  calibrationNote?: string;
  roleName?: string;
  roleKey?: string;
};
(function mergeIndustryDemand() {
  // Cast each import through unknown to avoid TypeScript union inference issues.
  const asDA = (x: unknown) => x as Record<string, IndustryDemandAddition>;
  const allAdditions: Record<string, IndustryDemandAddition> = {
    ...asDA(DEMAND_ADDITIONS_HEALTHCARE_LEGAL),
    ...asDA(DEMAND_ADDITIONS_CONSULTING_MARKETING_CX),
    ...asDA(DEMAND_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION),
    ...asDA(DEMAND_ADDITIONS_RETAIL_LOGISTICS_PHARMA),
    ...asDA(DEMAND_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION),
    ...asDA(DEMAND_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY),
    // v38.0 Phase 1
    ...asDA(DEMAND_ADDITIONS_CYBERSECURITY),
    ...asDA(DEMAND_ADDITIONS_CLOUD_PLATFORM),
    ...asDA(DEMAND_ADDITIONS_AI_ML_SPECIALIZATION),
    ...asDA(DEMAND_ADDITIONS_QA_FRONTEND_MOBILE),
    // v38.0 Phase 2
    ...asDA(DEMAND_ADDITIONS_PHYSICIANS),
    ...asDA(DEMAND_ADDITIONS_NURSING_ALLIED_HEALTH),
    ...asDA(DEMAND_ADDITIONS_BIOTECH_HEALTHCARE_IT),
    ...asDA(DEMAND_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH),
    // v38.0 Phase 3
    ...asDA(DEMAND_ADDITIONS_INVESTMENT_BANKING_PE_VC),
    ...asDA(DEMAND_ADDITIONS_QUANT_ASSET_HEDGE),
    ...asDA(DEMAND_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK),
    ...asDA(DEMAND_ADDITIONS_INSURANCE_RE_FINANCE),
    // v38.0 Phase 4
    ...asDA(DEMAND_ADDITIONS_SKILLED_TRADES),
    ...asDA(DEMAND_ADDITIONS_INDUSTRIAL_ENGINEERING),
    ...asDA(DEMAND_ADDITIONS_ENERGY_SPECIALIZATIONS),
    ...asDA(DEMAND_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS),
    ...asDA(DEMAND_ADDITIONS_AVIATION_PUBLIC_SAFETY),
    // v38.0 Phase 5
    ...asDA(DEMAND_ADDITIONS_MEDIA_ENTERTAINMENT),
    ...asDA(DEMAND_ADDITIONS_HOSPITALITY_TRAVEL),
    ...asDA(DEMAND_ADDITIONS_CX_RESEARCH_ACADEMIA),
    // v38.0 Phase 6
    ...asDA(DEMAND_ADDITIONS_MEDICAL_SUBSPECIALTIES),
    ...asDA(DEMAND_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE),
    ...asDA(DEMAND_ADDITIONS_SKILLED_SERVICES_EDU_GOV),
  };
  const validTrend = (s: string | undefined, fallback: DemandTrend): DemandTrend => {
    if (s === 'rising' || s === 'stable' || s === 'falling' || s === 'declining') return s as DemandTrend;
    if (s === 'surging') return 'rising';
    return fallback;
  };
  const validSalaryTrend = (s: string | undefined): 'rising' | 'stable' | 'falling' => {
    if (s === 'rising' || s === 'stable' || s === 'falling') return s;
    return 'stable';
  };
  for (const [roleKey, d] of Object.entries(allAdditions)) {
    const timeToFill = d.timeToFillDays ?? d.averageDaysToFill ?? 60;
    const quarter = d.dataQuarter ?? d.dataAsOf ?? '2026-Q1';
    ROLE_DEMAND_DB[roleKey] = {
      roleKey,
      roleName: d.roleName ?? roleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      demandIndex: d.demandIndex,
      demandTrend: validTrend(d.demandTrend as string, 'stable'),
      jobOpeningsTrend: validTrend(d.jobOpeningsTrend as string, 'stable'),
      salaryTrend: validSalaryTrend(d.salaryTrend),
      timeToFillDays: timeToFill,
      yoyJobOpeningsChange: d.yoyJobOpeningsChange ?? 0,
      topHiringLocations: d.topHiringLocations,
      aiSubstitutionRisk: d.aiSubstitutionRisk,
      dataQuarter: quarter,
      calibrationNote: d.calibrationNote ?? `Industry data — ${quarter}`,
    };
  }
})();

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Returns a full MarketDemandReport for a given roleKey and optional metro.
 * Falls back to market-average estimates for unknown roles.
 */
export function computeMarketDemandReport(
  roleKey: string,
  metro?: string,
  region?: string,
): MarketDemandReport {
  const staticSnapshot = ROLE_DEMAND_DB[roleKey] ?? { ...UNKNOWN_ROLE_FALLBACK, roleKey };

  // v39.0 A1: DB override layer wins. We look up the region-specific override
  // first (e.g. 'us', 'india'), then fall back to 'global', then static.
  const dbOverride = getRoleOverride(roleKey);
  const regionKey = (region ?? 'global').toLowerCase();
  const dbDemand = dbOverride?.demand?.[regionKey] ?? dbOverride?.demand?.['global'];
  const snapshot: RoleDemandSnapshot = dbDemand
    ? {
        ...staticSnapshot,
        demandIndex: dbDemand.demand_index,
        demandTrend: dbDemand.demand_trend as DemandTrend,
        jobOpeningsTrend: dbDemand.job_openings_trend as DemandTrend,
        salaryTrend: dbDemand.salary_trend as 'rising' | 'stable' | 'falling',
        timeToFillDays: dbDemand.time_to_fill_days ?? staticSnapshot.timeToFillDays,
        yoyJobOpeningsChange: dbDemand.yoy_job_openings_change ?? staticSnapshot.yoyJobOpeningsChange,
        topHiringLocations: dbDemand.top_hiring_locations ?? staticSnapshot.topHiringLocations,
        aiSubstitutionRisk: dbDemand.ai_substitution_risk ?? staticSnapshot.aiSubstitutionRisk,
        dataQuarter: dbDemand.data_quarter ?? staticSnapshot.dataQuarter,
        calibrationNote: dbDemand.calibration_note ?? staticSnapshot.calibrationNote,
        // honour DB-curated display name when present
        roleName: dbOverride?.role?.display_name ?? staticSnapshot.roleName,
      }
    : {
        ...staticSnapshot,
        roleName: dbOverride?.role?.display_name ?? staticSnapshot.roleName,
      };

  const localMarketMultiplier = getLocalMultiplier(metro);
  const adjustedDemandIndex  = Math.min(100, Math.round(snapshot.demandIndex * localMarketMultiplier));
  const jobSearchRunwayWeeks = demandIndexToRunwayWeeks(adjustedDemandIndex);
  const actionRecommendations = buildActionRecommendations(snapshot, adjustedDemandIndex, jobSearchRunwayWeeks);

  const staleMonths = computeRoleDataStaleMonths();
  return {
    roleKey,
    snapshot,
    localMarketMultiplier,
    adjustedDemandIndex,
    jobSearchRunwayWeeks,
    actionRecommendations,
    ...(staleMonths > 3 ? { _staleMonths: staleMonths } : {}),
  };
}

/**
 * Returns the list of all role keys present in the demand database.
 */
export function listAvailableRoleKeys(): string[] {
  return Object.keys(ROLE_DEMAND_DB);
}
