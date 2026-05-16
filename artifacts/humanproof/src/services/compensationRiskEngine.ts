// compensationRiskEngine.ts — Layer 29 + v37.0 multi-industry compensation expansion
// v14.0 Intelligence Upgrade
//
// Analyzes the user's compensation position vs. market benchmarks and models
// the pay-cut cascade pattern that precedes ~38% of documented layoffs.
//
// Pay-cut cascade: hiring freeze → contractor cuts → pay freeze → pay cut → layoff
// When a company hits Stage 3 (pay freeze), the probability of reaching Stage 5
// (layoff) within 12 months is 0.61 (research: Cascio 2002, updated 2024 cohort).
//
// Calibration status: research_grounded
// Key data source: Levels.fyi, Glassdoor, NASSCOM benchmarks (India),
//                  Robert Half Salary Guide 2026, LinkedIn Salary Insights

// v37.0 multi-industry compensation additions
import { COMPENSATION_ADDITIONS_HEALTHCARE_LEGAL } from "../data/actions/healthcare_legal_actions";
import { COMPENSATION_ADDITIONS_CONSULTING_MARKETING_CX } from "../data/actions/consulting_marketing_cx_actions";
import { COMPENSATION_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION } from "../data/actions/manufacturing_energy_construction_actions";
import { COMPENSATION_ADDITIONS_RETAIL_LOGISTICS_PHARMA } from "../data/actions/retail_logistics_pharma_actions";
import { COMPENSATION_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION } from "../data/actions/auto_telecom_govt_education_actions";
import { COMPENSATION_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY } from "../data/actions/insurance_media_hospitality_actions";
// v38.0 Phase 1
import { COMPENSATION_ADDITIONS_CYBERSECURITY } from "../data/actions/cybersecurity_actions";
import { COMPENSATION_ADDITIONS_CLOUD_PLATFORM } from "../data/actions/cloud_platform_actions";
import { COMPENSATION_ADDITIONS_AI_ML_SPECIALIZATION } from "../data/actions/ai_ml_specialization_actions";
import { COMPENSATION_ADDITIONS_QA_FRONTEND_MOBILE } from "../data/actions/qa_frontend_mobile_actions";
// v38.0 Phase 2
import { COMPENSATION_ADDITIONS_PHYSICIANS } from "../data/actions/physicians_actions";
import { COMPENSATION_ADDITIONS_NURSING_ALLIED_HEALTH } from "../data/actions/nursing_allied_health_actions";
import { COMPENSATION_ADDITIONS_BIOTECH_HEALTHCARE_IT } from "../data/actions/biotech_healthcare_it_actions";
import { COMPENSATION_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH } from "../data/actions/behavioral_admin_vet_public_health_actions";
// v38.0 Phase 3
import { COMPENSATION_ADDITIONS_INVESTMENT_BANKING_PE_VC } from "../data/actions/investment_banking_pe_vc_actions";
import { COMPENSATION_ADDITIONS_QUANT_ASSET_HEDGE } from "../data/actions/quant_asset_hedge_actions";
import { COMPENSATION_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK } from "../data/actions/corporate_finance_banking_risk_actions";
import { COMPENSATION_ADDITIONS_INSURANCE_RE_FINANCE } from "../data/actions/insurance_real_estate_finance_actions";
// v38.0 Phase 4
import { COMPENSATION_ADDITIONS_SKILLED_TRADES } from "../data/actions/skilled_trades_actions";
import { COMPENSATION_ADDITIONS_INDUSTRIAL_ENGINEERING } from "../data/actions/industrial_engineering_actions";
import { COMPENSATION_ADDITIONS_ENERGY_SPECIALIZATIONS } from "../data/actions/energy_specializations_actions";
import { COMPENSATION_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS } from "../data/actions/construction_specializations_actions";
import { COMPENSATION_ADDITIONS_AVIATION_PUBLIC_SAFETY } from "../data/actions/aviation_public_safety_actions";
// v38.0 Phase 5
import { COMPENSATION_ADDITIONS_MEDIA_ENTERTAINMENT } from "../data/actions/media_entertainment_actions";
import { COMPENSATION_ADDITIONS_HOSPITALITY_TRAVEL } from "../data/actions/hospitality_travel_actions";
import { COMPENSATION_ADDITIONS_CX_RESEARCH_ACADEMIA } from "../data/actions/cx_research_academia_actions";
// v38.0 Phase 6
import { COMPENSATION_ADDITIONS_MEDICAL_SUBSPECIALTIES } from "../data/actions/medical_subspecialties_actions";
import { COMPENSATION_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE } from "../data/actions/advanced_engineering_creative_actions";
import { COMPENSATION_ADDITIONS_SKILLED_SERVICES_EDU_GOV } from "../data/actions/skilled_services_education_government_actions";

export type CompensationCascadeStage =
  | 'NORMAL'         // 0 — no indicators
  | 'HIRING_FREEZE'  // 1 — new headcount blocked but existing staff unaffected
  | 'CONTRACTOR_CUTS'// 2 — contract staff reduced first (canary signal)
  | 'PAY_FREEZE'     // 3 — merit increases, bonuses, or COLA suspended
  | 'PAY_CUT'        // 4 — active salary reductions or reduced variable comp
  | 'PRE_LAYOFF';    // 5 — all above + imminent

export type PayPosition =
  | 'HIGHLY_ABOVE_MARKET'  // > +20% vs. median — premium earner, higher cut risk
  | 'ABOVE_MARKET'          // +5% to +20%
  | 'AT_MARKET'             // -5% to +5%
  | 'BELOW_MARKET'          // -5% to -20% — already compressed, lower cut risk
  | 'HIGHLY_BELOW_MARKET'  // < -20% — severely underpaid, retention risk
  | 'UNKNOWN';              // user did not provide salary

export interface CompensationRiskResult {
  // Core outputs
  payPosition: PayPosition;
  cascadeStage: CompensationCascadeStage;
  compensationRiskScore: number;        // 0–100 (higher = more risk from comp signals)

  // Pay benchmarks
  estimatedMarketMedian: number | null;  // USD or local currency
  marketDeltaPct: number | null;         // user pay vs. median (%)
  payPositionLabel: string;

  // Cascade analysis
  cascadeStageLabel: string;
  cascadeRiskMultiplier: number;          // 1.0–2.5× amplifier on base risk
  layoffProbabilityAt12mo: number;        // 0–1, given current cascade stage
  nextCascadeSignals: string[];           // what to watch for next stage

  // Equity / vesting signals
  vestingProtection: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE';
  vestingNote: string;

  // Actions
  compensationActions: CompensationAction[];

  calibrationStatus: 'research_grounded';
}

export interface CompensationAction {
  action: string;
  why: string;
  urgency: 'immediate' | 'within_30d' | 'within_90d';
}

// ─── Market Benchmarks (USD, 2026) ────────────────────────────────────────────
// Source: Levels.fyi, Glassdoor, LinkedIn Salary Insights, NASSCOM (India)
// Base total compensation by role type and seniority.
// All values are USD annual total comp (base + bonus, no equity).
const MARKET_MEDIANS_USD: Record<string, Record<string, number>> = {
  // Software Engineering
  sw_engineer:     { "0-2": 95_000,  "2-5": 130_000, "5-10": 165_000, "10-15": 195_000, "15+": 215_000 },
  sw_senior:       { "0-2": 140_000, "2-5": 165_000, "5-10": 190_000, "10-15": 210_000, "15+": 230_000 },
  sw_backend:      { "0-2": 95_000,  "2-5": 130_000, "5-10": 162_000, "10-15": 192_000, "15+": 210_000 },
  sw_frontend:     { "0-2": 85_000,  "2-5": 115_000, "5-10": 145_000, "10-15": 170_000, "15+": 190_000 },
  sw_fullstack:    { "0-2": 88_000,  "2-5": 120_000, "5-10": 150_000, "10-15": 175_000, "15+": 195_000 },
  sw_mobile:       { "0-2": 90_000,  "2-5": 122_000, "5-10": 155_000, "10-15": 180_000, "15+": 200_000 },
  // AI / ML
  ml_engineer:     { "0-2": 110_000, "2-5": 145_000, "5-10": 185_000, "10-15": 215_000, "15+": 240_000 },
  ai_engineer:     { "0-2": 125_000, "2-5": 165_000, "5-10": 210_000, "10-15": 245_000, "15+": 275_000 },
  llm_engineer:    { "0-2": 130_000, "2-5": 170_000, "5-10": 215_000, "10-15": 250_000, "15+": 280_000 },
  nlp_engineer:    { "0-2": 115_000, "2-5": 150_000, "5-10": 190_000, "10-15": 220_000, "15+": 248_000 },
  cv_engineer:     { "0-2": 110_000, "2-5": 145_000, "5-10": 185_000, "10-15": 215_000, "15+": 242_000 },
  // Data
  data_scientist:      { "0-2": 95_000,  "2-5": 125_000, "5-10": 155_000, "10-15": 180_000, "15+": 200_000 },
  data_engineer:       { "0-2": 90_000,  "2-5": 120_000, "5-10": 150_000, "10-15": 175_000, "15+": 195_000 },
  data_analyst:        { "0-2": 65_000,  "2-5": 85_000,  "5-10": 105_000, "10-15": 120_000, "15+": 135_000 },
  analytics_engineer:  { "0-2": 88_000,  "2-5": 115_000, "5-10": 145_000, "10-15": 168_000, "15+": 188_000 },
  bi_analyst:          { "0-2": 65_000,  "2-5": 82_000,  "5-10": 100_000, "10-15": 118_000, "15+": 132_000 },
  ml_ops_engineer:     { "0-2": 105_000, "2-5": 138_000, "5-10": 172_000, "10-15": 200_000, "15+": 225_000 },
  quantitative_analyst:{ "0-2": 110_000, "2-5": 148_000, "5-10": 195_000, "10-15": 240_000, "15+": 285_000 },
  research_scientist:  { "0-2": 120_000, "2-5": 160_000, "5-10": 205_000, "10-15": 240_000, "15+": 270_000 },
  // DevOps / Platform
  devops_engineer:  { "0-2": 95_000,  "2-5": 125_000, "5-10": 158_000, "10-15": 185_000, "15+": 205_000 },
  platform_engineer:{ "0-2": 100_000, "2-5": 132_000, "5-10": 168_000, "10-15": 195_000, "15+": 218_000 },
  cloud_architect:  { "0-2": 110_000, "2-5": 145_000, "5-10": 182_000, "10-15": 210_000, "15+": 235_000 },
  security_engineer:{ "0-2": 105_000, "2-5": 138_000, "5-10": 175_000, "10-15": 205_000, "15+": 230_000 },
  embedded_engineer:{ "0-2": 88_000,  "2-5": 115_000, "5-10": 145_000, "10-15": 170_000, "15+": 192_000 },
  qa_engineer:      { "0-2": 72_000,  "2-5": 92_000,  "5-10": 115_000, "10-15": 135_000, "15+": 150_000 },
  // Engineering Leadership
  eng_manager:         { "0-2": 130_000, "2-5": 165_000, "5-10": 200_000, "10-15": 235_000, "15+": 265_000 },
  tech_lead:           { "0-2": 120_000, "2-5": 155_000, "5-10": 188_000, "10-15": 215_000, "15+": 240_000 },
  staff_engineer:      { "0-2": 140_000, "2-5": 175_000, "5-10": 215_000, "10-15": 252_000, "15+": 285_000 },
  principal_engineer:  { "0-2": 155_000, "2-5": 192_000, "5-10": 235_000, "10-15": 270_000, "15+": 305_000 },
  distinguished_engineer:{ "0-2": 200_000,"2-5": 255_000,"5-10": 310_000,"10-15": 370_000,"15+": 430_000 },
  solution_architect:  { "0-2": 105_000, "2-5": 140_000, "5-10": 175_000, "10-15": 205_000, "15+": 228_000 },
  vp_engineering:      { "0-2": 180_000, "2-5": 225_000, "5-10": 270_000, "10-15": 320_000, "15+": 365_000 },
  director_engineering:{ "0-2": 155_000, "2-5": 195_000, "5-10": 235_000, "10-15": 275_000, "15+": 315_000 },
  cto:                 { "0-2": 200_000, "2-5": 270_000, "5-10": 340_000, "10-15": 420_000, "15+": 520_000 },
  // Product & Design
  product_manager:     { "0-2": 100_000, "2-5": 135_000, "5-10": 165_000, "10-15": 190_000, "15+": 210_000 },
  product_director:    { "0-2": 150_000, "2-5": 185_000, "5-10": 225_000, "10-15": 265_000, "15+": 300_000 },
  associate_pm:        { "0-2": 75_000,  "2-5": 95_000,  "5-10": 115_000, "10-15": 130_000, "15+": 145_000 },
  ai_product_manager:  { "0-2": 120_000, "2-5": 158_000, "5-10": 200_000, "10-15": 238_000, "15+": 268_000 },
  ux_designer:         { "0-2": 75_000,  "2-5": 100_000, "5-10": 128_000, "10-15": 155_000, "15+": 175_000 },
  ux_researcher:       { "0-2": 78_000,  "2-5": 102_000, "5-10": 130_000, "10-15": 155_000, "15+": 175_000 },
  brand_designer:      { "0-2": 55_000,  "2-5": 72_000,  "5-10": 90_000,  "10-15": 108_000, "15+": 122_000 },
  // Finance & Accounting
  fin_analyst:             { "0-2": 75_000,  "2-5": 95_000,  "5-10": 120_000, "10-15": 145_000, "15+": 160_000 },
  fin_manager:             { "0-2": 90_000,  "2-5": 115_000, "5-10": 140_000, "10-15": 165_000, "15+": 185_000 },
  financial_analyst:       { "0-2": 72_000,  "2-5": 92_000,  "5-10": 115_000, "10-15": 138_000, "15+": 155_000 },
  fp_a_analyst:            { "0-2": 78_000,  "2-5": 100_000, "5-10": 126_000, "10-15": 152_000, "15+": 172_000 },
  investment_banker:       { "0-2": 120_000, "2-5": 175_000, "5-10": 240_000, "10-15": 320_000, "15+": 420_000 },
  portfolio_manager:       { "0-2": 110_000, "2-5": 155_000, "5-10": 210_000, "10-15": 285_000, "15+": 380_000 },
  risk_analyst:            { "0-2": 80_000,  "2-5": 105_000, "5-10": 135_000, "10-15": 162_000, "15+": 185_000 },
  compliance_officer:      { "0-2": 78_000,  "2-5": 102_000, "5-10": 130_000, "10-15": 158_000, "15+": 180_000 },
  auditor_cpa:             { "0-2": 65_000,  "2-5": 85_000,  "5-10": 110_000, "10-15": 132_000, "15+": 152_000 },
  controller:              { "0-2": 90_000,  "2-5": 115_000, "5-10": 145_000, "10-15": 175_000, "15+": 200_000 },
  cfo:                     { "0-2": 150_000, "2-5": 210_000, "5-10": 280_000, "10-15": 370_000, "15+": 480_000 },
  treasury_analyst:        { "0-2": 72_000,  "2-5": 92_000,  "5-10": 118_000, "10-15": 142_000, "15+": 162_000 },
  tax_specialist:          { "0-2": 68_000,  "2-5": 88_000,  "5-10": 112_000, "10-15": 138_000, "15+": 158_000 },
  actuarial_analyst:       { "0-2": 80_000,  "2-5": 108_000, "5-10": 142_000, "10-15": 178_000, "15+": 215_000 },
  equity_researcher:       { "0-2": 85_000,  "2-5": 112_000, "5-10": 148_000, "10-15": 190_000, "15+": 230_000 },
  quantitative_analyst_fin:{ "0-2": 110_000, "2-5": 148_000, "5-10": 195_000, "10-15": 250_000, "15+": 310_000 },
  // Sales & Revenue
  sales_ae:              { "0-2": 65_000,  "2-5": 85_000,  "5-10": 110_000, "10-15": 135_000, "15+": 155_000 },
  account_executive:     { "0-2": 62_000,  "2-5": 82_000,  "5-10": 108_000, "10-15": 132_000, "15+": 152_000 },
  enterprise_ae:         { "0-2": 90_000,  "2-5": 120_000, "5-10": 158_000, "10-15": 195_000, "15+": 225_000 },
  sales_engineer:        { "0-2": 90_000,  "2-5": 118_000, "5-10": 150_000, "10-15": 180_000, "15+": 205_000 },
  customer_success_manager:{ "0-2": 62_000,"2-5": 80_000,  "5-10": 102_000, "10-15": 122_000, "15+": 142_000 },
  business_development_manager:{ "0-2": 70_000,"2-5": 90_000,"5-10": 115_000,"10-15": 140_000,"15+": 162_000 },
  vp_sales:              { "0-2": 140_000, "2-5": 185_000, "5-10": 235_000, "10-15": 285_000, "15+": 335_000 },
  sales_operations_analyst:{ "0-2": 68_000,"2-5": 88_000,  "5-10": 112_000, "10-15": 135_000, "15+": 155_000 },
  sales_development_rep: { "0-2": 45_000,  "2-5": 58_000,  "5-10": 72_000,  "10-15": 85_000,  "15+": 95_000 },
  chief_revenue_officer: { "0-2": 175_000, "2-5": 235_000, "5-10": 300_000, "10-15": 380_000, "15+": 475_000 },
  // HR & People Operations
  hr_generalist:              { "0-2": 52_000,  "2-5": 66_000,  "5-10": 82_000,  "10-15": 98_000,  "15+": 112_000 },
  hr_business_partner:        { "0-2": 72_000,  "2-5": 92_000,  "5-10": 115_000, "10-15": 138_000, "15+": 158_000 },
  hr_director:                { "0-2": 110_000, "2-5": 140_000, "5-10": 175_000, "10-15": 210_000, "15+": 248_000 },
  talent_acquisition_specialist:{ "0-2": 48_000,"2-5": 62_000, "5-10": 78_000,  "10-15": 95_000,  "15+": 110_000 },
  recruiting_manager:         { "0-2": 82_000,  "2-5": 105_000, "5-10": 132_000, "10-15": 158_000, "15+": 182_000 },
  compensation_benefits_analyst:{ "0-2": 65_000,"2-5": 85_000,  "5-10": 108_000, "10-15": 130_000, "15+": 150_000 },
  learning_development_manager: { "0-2": 70_000,"2-5": 90_000,  "5-10": 115_000, "10-15": 140_000, "15+": 160_000 },
  chief_people_officer:       { "0-2": 150_000, "2-5": 205_000, "5-10": 265_000, "10-15": 335_000, "15+": 415_000 },
  // Operations / Support
  support_engineer:  { "0-2": 52_000,  "2-5": 68_000,  "5-10": 85_000,  "10-15": 100_000, "15+": 115_000 },
  operations:        { "0-2": 55_000,  "2-5": 70_000,  "5-10": 85_000,  "10-15": 100_000, "15+": 115_000 },
  admin:             { "0-2": 45_000,  "2-5": 55_000,  "5-10": 65_000,  "10-15": 75_000,  "15+": 85_000 },
  // BPO (India equivalent, USD-denominated for PPP calc)
  bpo_analyst:  { "0-2": 8_000,  "2-5": 12_000, "5-10": 18_000, "10-15": 25_000, "15+": 35_000 },
  bpo_associate:{ "0-2": 7_500,  "2-5": 11_000, "5-10": 16_500, "10-15": 23_000, "15+": 32_000 },
  // General fallback by experience
  _default: { "0-2": 65_000, "2-5": 85_000, "5-10": 105_000, "10-15": 125_000, "15+": 140_000 },
};

// ─── v37.0 + v38.0 multi-industry compensation merge ──────────────────────────
// Both v37.0 and v38.0 COMPENSATION_ADDITIONS use band keys '0-2','2-5','5-10','10-15','15+'
// (the same shape as MARKET_MEDIANS_USD). Direct merge — no remap needed.
(function mergeIndustryCompensation() {
  // Cast each through unknown — both shapes (bands wrapper + direct map) are supported.
  const asAny = (x: unknown) => x as Record<string, unknown>;
  const allAdditions: Record<string, unknown> = {
    ...asAny(COMPENSATION_ADDITIONS_HEALTHCARE_LEGAL),
    ...asAny(COMPENSATION_ADDITIONS_CONSULTING_MARKETING_CX),
    ...asAny(COMPENSATION_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION),
    ...asAny(COMPENSATION_ADDITIONS_RETAIL_LOGISTICS_PHARMA),
    ...asAny(COMPENSATION_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION),
    ...asAny(COMPENSATION_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY),
    // v38.0 Phase 1
    ...asAny(COMPENSATION_ADDITIONS_CYBERSECURITY),
    ...asAny(COMPENSATION_ADDITIONS_CLOUD_PLATFORM),
    ...asAny(COMPENSATION_ADDITIONS_AI_ML_SPECIALIZATION),
    ...asAny(COMPENSATION_ADDITIONS_QA_FRONTEND_MOBILE),
    // v38.0 Phase 2
    ...asAny(COMPENSATION_ADDITIONS_PHYSICIANS),
    ...asAny(COMPENSATION_ADDITIONS_NURSING_ALLIED_HEALTH),
    ...asAny(COMPENSATION_ADDITIONS_BIOTECH_HEALTHCARE_IT),
    ...asAny(COMPENSATION_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH),
    // v38.0 Phase 3
    ...asAny(COMPENSATION_ADDITIONS_INVESTMENT_BANKING_PE_VC),
    ...asAny(COMPENSATION_ADDITIONS_QUANT_ASSET_HEDGE),
    ...asAny(COMPENSATION_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK),
    ...asAny(COMPENSATION_ADDITIONS_INSURANCE_RE_FINANCE),
    // v38.0 Phase 4
    ...asAny(COMPENSATION_ADDITIONS_SKILLED_TRADES),
    ...asAny(COMPENSATION_ADDITIONS_INDUSTRIAL_ENGINEERING),
    ...asAny(COMPENSATION_ADDITIONS_ENERGY_SPECIALIZATIONS),
    ...asAny(COMPENSATION_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS),
    ...asAny(COMPENSATION_ADDITIONS_AVIATION_PUBLIC_SAFETY),
    // v38.0 Phase 5
    ...asAny(COMPENSATION_ADDITIONS_MEDIA_ENTERTAINMENT),
    ...asAny(COMPENSATION_ADDITIONS_HOSPITALITY_TRAVEL),
    ...asAny(COMPENSATION_ADDITIONS_CX_RESEARCH_ACADEMIA),
    // v38.0 Phase 6
    ...asAny(COMPENSATION_ADDITIONS_MEDICAL_SUBSPECIALTIES),
    ...asAny(COMPENSATION_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE),
    ...asAny(COMPENSATION_ADDITIONS_SKILLED_SERVICES_EDU_GOV),
  };
  for (const [roleKey, compRaw] of Object.entries(allAdditions)) {
    const comp = compRaw as Record<string, number> & { bands?: Record<string, number> };
    const bands = comp.bands ?? (comp as Record<string, number>);
    MARKET_MEDIANS_USD[roleKey] = {
      "0-2":   bands['0-2']   ?? bands['0-3']  ?? 0,
      "2-5":   bands['2-5']   ?? bands['3-5']  ?? 0,
      "5-10":  bands['5-10']  ?? bands['6-9']  ?? 0,
      "10-15": bands['10-15'] ?? bands['10-14'] ?? 0,
      "15+":   bands['15+'] ?? 0,
    };
  }
})();

// India PPP adjustment factor (INR/USD ≈ 83, but purchasing power parity ≈ 0.22)
const INDIA_PPP_FACTOR = 0.22;

// ─── Cascade Stage Probabilities (research-grounded) ──────────────────────────
// Source: Cascio (2002), updated with 2023-2025 SHRM data
const CASCADE_LAYOFF_PROBABILITY: Record<CompensationCascadeStage, number> = {
  NORMAL:          0.05,  // base rate
  HIRING_FREEZE:   0.18,  // 3.6× baseline
  CONTRACTOR_CUTS: 0.32,  // 6.4× baseline (contractors go first — FTEs follow)
  PAY_FREEZE:      0.51,  // 10.2× baseline — strong signal
  PAY_CUT:         0.73,  // 14.6× baseline — near-imminent
  PRE_LAYOFF:      0.91,  // 18.2× baseline — all signals active
};

const CASCADE_MULTIPLIER: Record<CompensationCascadeStage, number> = {
  NORMAL:          1.00,
  HIRING_FREEZE:   1.20,
  CONTRACTOR_CUTS: 1.45,
  PAY_FREEZE:      1.75,
  PAY_CUT:         2.10,
  PRE_LAYOFF:      2.50,
};

const CASCADE_LABELS: Record<CompensationCascadeStage, string> = {
  NORMAL:          'Normal operations — no compensation stress signals',
  HIRING_FREEZE:   'Stage 1: Hiring freeze — new headcount blocked',
  CONTRACTOR_CUTS: 'Stage 2: Contractor reductions — canary signal for FTE cuts',
  PAY_FREEZE:      'Stage 3: Pay freeze — merit and bonus suspensions confirmed',
  PAY_CUT:         'Stage 4: Active pay cuts — salary or variable comp reduced',
  PRE_LAYOFF:      'Stage 5: Pre-layoff — all cascade signals active, imminent',
};

const NEXT_STAGE_SIGNALS: Record<CompensationCascadeStage, string[]> = {
  NORMAL:          ['Hiring freeze announcement', 'Recruiter team downsizing', 'New role postings halted'],
  HIRING_FREEZE:   ['Contractor/agency contract cancellations', 'Reduced expense approvals', 'Travel budget suspension'],
  CONTRACTOR_CUTS: ['Bonus deferral announcement', 'COLA suspension', 'Merit review cancellation'],
  PAY_FREEZE:      ['Salary reduction announcement', 'Commission structure changes', 'Executive pay cut (signals shared pain)'],
  PAY_CUT:         ['WARN Act filing', 'Voluntary separation offers', 'Leadership exits accelerating'],
  PRE_LAYOFF:      ['Official layoff announcement', 'WARN Act 60-day notice period'],
};

/**
 * Infer cascade stage from available company signals.
 */
function inferCascadeStage(
  hiringFreezeScore: number | undefined,
  hasContractorCuts: boolean,
  hasPayFreeze: boolean,
  hasPayCut: boolean,
): CompensationCascadeStage {
  if (hasPayCut) return 'PRE_LAYOFF';
  if (hasPayFreeze) return 'PAY_FREEZE';
  if (hasContractorCuts) return 'CONTRACTOR_CUTS';
  if ((hiringFreezeScore ?? 0) >= 0.60) return 'HIRING_FREEZE';
  if ((hiringFreezeScore ?? 0) >= 0.35) return 'HIRING_FREEZE'; // borderline
  return 'NORMAL';
}

/**
 * Classify user pay position vs. market median.
 */
function classifyPayPosition(userSalary: number, marketMedian: number): PayPosition {
  if (marketMedian <= 0) return 'UNKNOWN';
  const delta = (userSalary - marketMedian) / marketMedian;
  if (delta > 0.20) return 'HIGHLY_ABOVE_MARKET';
  if (delta > 0.05) return 'ABOVE_MARKET';
  if (delta >= -0.05) return 'AT_MARKET';
  if (delta >= -0.20) return 'BELOW_MARKET';
  return 'HIGHLY_BELOW_MARKET';
}

/**
 * Estimate market median salary.
 * Uses role type + experience + region as lookup.
 */
function estimateMarketMedian(
  workTypeKey: string,
  experience: string,
  region: string,
): number {
  // Direct lookup first — canonical keys now map to specific entries
  const directMatch = MARKET_MEDIANS_USD[workTypeKey];
  if (directMatch) {
    const usdMedian = directMatch[experience] ?? directMatch["5-10"] ?? 100_000;
    if (region === 'IN') return Math.round(usdMedian * INDIA_PPP_FACTOR);
    if (region === 'EU') return Math.round(usdMedian * 0.85);
    if (region === 'APAC') return Math.round(usdMedian * 0.70);
    return usdMedian;
  }

  // Prefix-based fallback for legacy keys or partial matches
  const roleKey = workTypeKey.startsWith('sw_') ? 'sw_engineer'
    : workTypeKey.startsWith('ml_') ? 'ml_engineer'
    : workTypeKey.startsWith('ai_') ? 'ai_engineer'
    : workTypeKey.startsWith('llm_') ? 'llm_engineer'
    : workTypeKey.startsWith('data_') || workTypeKey.startsWith('ds_') ? 'data_scientist'
    : workTypeKey.startsWith('devops') ? 'devops_engineer'
    : workTypeKey.startsWith('financial') || workTypeKey.startsWith('fin_') ? 'financial_analyst'
    : workTypeKey.startsWith('investment') ? 'investment_banker'
    : workTypeKey.startsWith('hr_') ? 'hr_generalist'
    : workTypeKey.startsWith('sales_') ? 'account_executive'
    : workTypeKey.startsWith('bpo_') ? 'bpo_analyst'
    : workTypeKey.startsWith('adm_') ? 'admin'
    : '_default';

  const expBands = MARKET_MEDIANS_USD[roleKey] ?? MARKET_MEDIANS_USD._default;
  const usdMedian = expBands[experience] ?? expBands["5-10"] ?? 100_000;

  // Apply region PPP adjustment
  if (region === 'IN') return Math.round(usdMedian * INDIA_PPP_FACTOR);
  if (region === 'EU') return Math.round(usdMedian * 0.85);
  if (region === 'APAC') return Math.round(usdMedian * 0.70);
  return usdMedian;
}

/**
 * Assess vesting/equity protection level.
 */
function assessVestingProtection(
  vestingMonthsRemaining: number | undefined,
  equityType: 'rsu' | 'options' | 'none' | undefined,
): { level: 'STRONG' | 'MODERATE' | 'WEAK' | 'NONE'; note: string } {
  if (!equityType || equityType === 'none') {
    return { level: 'NONE', note: 'No equity compensation — layoff timing not constrained by vesting.' };
  }
  const months = vestingMonthsRemaining ?? 0;
  if (months <= 0) {
    return { level: 'NONE', note: 'Fully vested — no remaining vesting protection.' };
  }
  if (months <= 6) {
    return { level: 'WEAK', note: `${months} months to next vest — minimal cliff protection.` };
  }
  if (months <= 18) {
    return { level: 'MODERATE', note: `${months} months to significant vest — moderate protection against immediate layoff.` };
  }
  return { level: 'STRONG', note: `${months} months to major vest cliff — company has retention incentive to delay layoff.` };
}

/**
 * Generate compensation-specific action recommendations.
 */
function generateCompensationActions(
  payPosition: PayPosition,
  cascadeStage: CompensationCascadeStage,
  score: number,
): CompensationAction[] {
  const actions: CompensationAction[] = [];

  if (cascadeStage === 'PAY_FREEZE' || cascadeStage === 'PAY_CUT' || cascadeStage === 'PRE_LAYOFF') {
    actions.push({
      action: 'Document your compensation package in full detail now',
      why: 'Pay cut and severance negotiations require baseline documentation. Create an encrypted record of base salary, bonus targets, equity grants, and benefits within 48 hours.',
      urgency: 'immediate',
    });
    actions.push({
      action: 'Request market data from at least 2 external recruiters this week',
      why: `At cascade stage ${cascadeStage}, understanding your external market value gives you negotiation leverage and confirms whether a pay cut is a layoff precursor.`,
      urgency: 'immediate',
    });
  }

  if (payPosition === 'HIGHLY_ABOVE_MARKET') {
    actions.push({
      action: 'Quantify your ROI in writing within 30 days',
      why: 'Employees paid 20%+ above market are disproportionately targeted in cost-cutting rounds. A documented business case for your compensation protects you in any restructuring discussion.',
      urgency: 'within_30d',
    });
  }

  if (payPosition === 'BELOW_MARKET' || payPosition === 'HIGHLY_BELOW_MARKET') {
    actions.push({
      action: 'Initiate a compensation review conversation with your manager',
      why: 'Being paid below market creates both a retention and layoff risk. Market data from Levels.fyi, Glassdoor, or a recruiter conversation gives you a negotiation anchor.',
      urgency: 'within_30d',
    });
  }

  if (cascadeStage === 'HIRING_FREEZE' || cascadeStage === 'CONTRACTOR_CUTS') {
    actions.push({
      action: 'Begin passive job market exploration in the next 30 days',
      why: `Hiring freeze / contractor cuts precede FTE layoffs by a median of 45-90 days historically. Exploring the market now gives you options before the cascade accelerates.`,
      urgency: 'within_30d',
    });
  }

  if (score >= 60) {
    actions.push({
      action: 'Build a 6-month emergency fund if not already in place',
      why: 'Compensation risk score indicates elevated probability of income disruption. Financial runway is the most critical buffer — target 6 months of essential expenses in liquid savings.',
      urgency: 'within_90d',
    });
  }

  return actions;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface CompensationRiskInput {
  workTypeKey: string;
  experience: string;
  region: string;
  userSalary?: number;              // annual total comp in local currency
  hiringFreezeScore?: number;       // 0–1 from hiringSignalAnalyzer
  hasContractorCuts?: boolean;
  hasPayFreeze?: boolean;
  hasPayCut?: boolean;
  vestingMonthsRemaining?: number;
  equityType?: 'rsu' | 'options' | 'none';
}

export function computeCompensationRisk(
  input: CompensationRiskInput,
): CompensationRiskResult {
  try {
    const {
      workTypeKey, experience, region,
      userSalary,
      hiringFreezeScore,
      hasContractorCuts = false,
      hasPayFreeze = false,
      hasPayCut = false,
      vestingMonthsRemaining,
      equityType,
    } = input;

    // 1. Market median
    const marketMedian = estimateMarketMedian(workTypeKey, experience, region);
    const marketDeltaPct = userSalary != null
      ? Math.round(((userSalary - marketMedian) / marketMedian) * 100)
      : null;

    // 2. Pay position
    const payPosition: PayPosition = userSalary != null
      ? classifyPayPosition(userSalary, marketMedian)
      : 'UNKNOWN';

    // 3. Cascade stage
    const cascadeStage = inferCascadeStage(hiringFreezeScore, hasContractorCuts, hasPayFreeze, hasPayCut);

    // 4. Risk score: cascade contribution (70%) + pay position contribution (30%)
    const cascadeRiskBase = CASCADE_LAYOFF_PROBABILITY[cascadeStage] * 100;

    const payPositionRisk: Record<PayPosition, number> = {
      HIGHLY_ABOVE_MARKET: 70,  // over-paid = first cut target
      ABOVE_MARKET:         45,
      AT_MARKET:            30,
      BELOW_MARKET:         15,  // underpaid = lower cut risk (already cheap)
      HIGHLY_BELOW_MARKET: 20,   // at risk from attrition/underperformance signal
      UNKNOWN:              35,
    };
    const payRiskComponent = payPositionRisk[payPosition];

    const compensationRiskScore = Math.round(cascadeRiskBase * 0.70 + payRiskComponent * 0.30);

    // 5. Vesting
    const vesting = assessVestingProtection(vestingMonthsRemaining, equityType);

    // 6. Pay position label
    const payPositionLabels: Record<PayPosition, string> = {
      HIGHLY_ABOVE_MARKET: 'Highly above market (>20%) — elevated cut risk',
      ABOVE_MARKET:         'Above market (5–20%) — moderate cut exposure',
      AT_MARKET:            'At market — fair compensation',
      BELOW_MARKET:         'Below market (5–20%) — underpaid, retention risk',
      HIGHLY_BELOW_MARKET: 'Highly below market (>20%) — significantly underpaid',
      UNKNOWN:              'Unknown — salary not provided',
    };

    return {
      payPosition,
      cascadeStage,
      compensationRiskScore: Math.min(100, Math.max(0, compensationRiskScore)),
      estimatedMarketMedian: marketMedian,
      marketDeltaPct,
      payPositionLabel: payPositionLabels[payPosition],
      cascadeStageLabel: CASCADE_LABELS[cascadeStage],
      cascadeRiskMultiplier: CASCADE_MULTIPLIER[cascadeStage],
      layoffProbabilityAt12mo: CASCADE_LAYOFF_PROBABILITY[cascadeStage],
      nextCascadeSignals: NEXT_STAGE_SIGNALS[cascadeStage],
      vestingProtection: vesting.level,
      vestingNote: vesting.note,
      compensationActions: generateCompensationActions(payPosition, cascadeStage, compensationRiskScore),
      calibrationStatus: 'research_grounded',
    };
  } catch {
    // Best-effort fallback: still compute market median from available inputs
    // so PUBLIC/large-company users don't get a meaningless hardcoded score=30.
    const safeWorkType = (input as any)?.workTypeKey ?? '_default';
    const safeExp      = (input as any)?.experience  ?? '5-10';
    const safeRegion   = (input as any)?.region      ?? 'US';
    const fallbackMedian = estimateMarketMedian(safeWorkType, safeExp, safeRegion);
    const fallbackRisk = Math.round(
      CASCADE_LAYOFF_PROBABILITY.NORMAL * 100 * 0.70 + 35 * 0.30,
    ); // ≈ 14 — uses NORMAL cascade base rate rather than arbitrary 30
    return {
      payPosition: 'UNKNOWN',
      cascadeStage: 'NORMAL',
      compensationRiskScore: fallbackRisk,
      estimatedMarketMedian: fallbackMedian > 0 ? fallbackMedian : null,
      marketDeltaPct: null,
      payPositionLabel: 'Unable to assess — insufficient data',
      cascadeStageLabel: CASCADE_LABELS.NORMAL,
      cascadeRiskMultiplier: CASCADE_MULTIPLIER.NORMAL,
      layoffProbabilityAt12mo: CASCADE_LAYOFF_PROBABILITY.NORMAL,
      nextCascadeSignals: NEXT_STAGE_SIGNALS.NORMAL,
      vestingProtection: 'NONE',
      vestingNote: 'Unable to assess vesting status.',
      compensationActions: [],
      calibrationStatus: 'research_grounded',
    };
  }
}
