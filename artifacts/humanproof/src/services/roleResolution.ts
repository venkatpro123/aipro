import { getRoleEntryByKey } from "@/data/oracleRoleIndex";
import { getCareerIntelligence, hasSeededData } from "@/data/intelligence";
// v37.0 multi-industry alias and canonical group imports
import { ALIAS_ADDITIONS_HEALTHCARE_LEGAL, CANONICAL_GROUP_ADDITIONS_HEALTHCARE_LEGAL } from "../data/actions/healthcare_legal_actions";
import { ALIAS_ADDITIONS_CONSULTING_MARKETING_CX, CANONICAL_GROUP_ADDITIONS_CONSULTING_MARKETING_CX } from "../data/actions/consulting_marketing_cx_actions";
import { ALIAS_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION, CANONICAL_GROUP_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION } from "../data/actions/manufacturing_energy_construction_actions";
import { ALIAS_ADDITIONS_RETAIL_LOGISTICS_PHARMA, CANONICAL_GROUP_ADDITIONS_RETAIL_LOGISTICS_PHARMA } from "../data/actions/retail_logistics_pharma_actions";
import { ALIAS_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION, CANONICAL_GROUP_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION } from "../data/actions/auto_telecom_govt_education_actions";
import { ALIAS_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY, CANONICAL_GROUP_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY } from "../data/actions/insurance_media_hospitality_actions";
// v38.0 Phase 1
import { ALIAS_ADDITIONS_CYBERSECURITY, CANONICAL_GROUP_ADDITIONS_CYBERSECURITY } from "../data/actions/cybersecurity_actions";
import { ALIAS_ADDITIONS_CLOUD_PLATFORM, CANONICAL_GROUP_ADDITIONS_CLOUD_PLATFORM } from "../data/actions/cloud_platform_actions";
import { ALIAS_ADDITIONS_AI_ML_SPECIALIZATION, CANONICAL_GROUP_ADDITIONS_AI_ML_SPECIALIZATION } from "../data/actions/ai_ml_specialization_actions";
import { ALIAS_ADDITIONS_QA_FRONTEND_MOBILE, CANONICAL_GROUP_ADDITIONS_QA_FRONTEND_MOBILE } from "../data/actions/qa_frontend_mobile_actions";
// v38.0 Phase 2
import { ALIAS_ADDITIONS_PHYSICIANS, CANONICAL_GROUP_ADDITIONS_PHYSICIANS } from "../data/actions/physicians_actions";
import { ALIAS_ADDITIONS_NURSING_ALLIED_HEALTH, CANONICAL_GROUP_ADDITIONS_NURSING_ALLIED_HEALTH } from "../data/actions/nursing_allied_health_actions";
import { ALIAS_ADDITIONS_BIOTECH_HEALTHCARE_IT, CANONICAL_GROUP_ADDITIONS_BIOTECH_HEALTHCARE_IT } from "../data/actions/biotech_healthcare_it_actions";
import { ALIAS_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH, CANONICAL_GROUP_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH } from "../data/actions/behavioral_admin_vet_public_health_actions";
// v38.0 Phase 3
import { ALIAS_ADDITIONS_INVESTMENT_BANKING_PE_VC, CANONICAL_GROUP_ADDITIONS_INVESTMENT_BANKING_PE_VC } from "../data/actions/investment_banking_pe_vc_actions";
import { ALIAS_ADDITIONS_QUANT_ASSET_HEDGE, CANONICAL_GROUP_ADDITIONS_QUANT_ASSET_HEDGE } from "../data/actions/quant_asset_hedge_actions";
import { ALIAS_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK, CANONICAL_GROUP_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK } from "../data/actions/corporate_finance_banking_risk_actions";
import { ALIAS_ADDITIONS_INSURANCE_RE_FINANCE, CANONICAL_GROUP_ADDITIONS_INSURANCE_RE_FINANCE } from "../data/actions/insurance_real_estate_finance_actions";
// v38.0 Phase 4
import { ALIAS_ADDITIONS_SKILLED_TRADES, CANONICAL_GROUP_ADDITIONS_SKILLED_TRADES } from "../data/actions/skilled_trades_actions";
import { ALIAS_ADDITIONS_INDUSTRIAL_ENGINEERING, CANONICAL_GROUP_ADDITIONS_INDUSTRIAL_ENGINEERING } from "../data/actions/industrial_engineering_actions";
import { ALIAS_ADDITIONS_ENERGY_SPECIALIZATIONS, CANONICAL_GROUP_ADDITIONS_ENERGY_SPECIALIZATIONS } from "../data/actions/energy_specializations_actions";
import { ALIAS_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS, CANONICAL_GROUP_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS } from "../data/actions/construction_specializations_actions";
import { ALIAS_ADDITIONS_AVIATION_PUBLIC_SAFETY, CANONICAL_GROUP_ADDITIONS_AVIATION_PUBLIC_SAFETY } from "../data/actions/aviation_public_safety_actions";
// v38.0 Phase 5
import { ALIAS_ADDITIONS_MEDIA_ENTERTAINMENT, CANONICAL_GROUP_ADDITIONS_MEDIA_ENTERTAINMENT } from "../data/actions/media_entertainment_actions";
import { ALIAS_ADDITIONS_HOSPITALITY_TRAVEL, CANONICAL_GROUP_ADDITIONS_HOSPITALITY_TRAVEL } from "../data/actions/hospitality_travel_actions";
import { ALIAS_ADDITIONS_CX_RESEARCH_ACADEMIA, CANONICAL_GROUP_ADDITIONS_CX_RESEARCH_ACADEMIA } from "../data/actions/cx_research_academia_actions";
// v38.0 Phase 6
import { ALIAS_ADDITIONS_MEDICAL_SUBSPECIALTIES, CANONICAL_GROUP_ADDITIONS_MEDICAL_SUBSPECIALTIES } from "../data/actions/medical_subspecialties_actions";
import { ALIAS_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE, CANONICAL_GROUP_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE } from "../data/actions/advanced_engineering_creative_actions";
import { ALIAS_ADDITIONS_SKILLED_SERVICES_EDU_GOV, CANONICAL_GROUP_ADDITIONS_SKILLED_SERVICES_EDU_GOV } from "../data/actions/skilled_services_education_government_actions";

export type ResolvedRoleSource =
  | "oracle_picker"
  | "alias_map"
  | "catalog_bridge"
  | "unresolved";

export interface ResolvedRole {
  input: string;
  canonicalKey: string | null;
  displayRole: string | null;
  source: ResolvedRoleSource;
  confidence: number;
  requiresConfirmation: boolean;
}

// v37.0: Expanded from 9 to 150+ entries. Covers Phase 1B roles (Product/Design,
// Data/Analytics, Engineering Leadership, Finance, Sales, HR) plus common variants.
const HUMAN_TITLE_ALIAS_MAP: Record<string, { canonicalKey: string; displayRole: string }> = {
  // ── Software Engineering ───────────────────────────────────────────────────
  "software developer": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "software engineer": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "swe": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "programmer": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "coder": { canonicalKey: "sw_software_engineer", displayRole: "Software Engineer" },
  "backend developer": { canonicalKey: "sw_backend", displayRole: "Backend Engineer" },
  "backend engineer": { canonicalKey: "sw_backend", displayRole: "Backend Engineer" },
  "server side developer": { canonicalKey: "sw_backend", displayRole: "Backend Engineer" },
  "api developer": { canonicalKey: "sw_backend", displayRole: "Backend Engineer" },
  "frontend developer": { canonicalKey: "sw_frontend", displayRole: "Frontend Engineer" },
  "frontend engineer": { canonicalKey: "sw_frontend", displayRole: "Frontend Engineer" },
  "ui developer": { canonicalKey: "sw_frontend", displayRole: "Frontend Engineer" },
  "react developer": { canonicalKey: "sw_frontend", displayRole: "Frontend Engineer" },
  "angular developer": { canonicalKey: "sw_frontend", displayRole: "Frontend Engineer" },
  "vue developer": { canonicalKey: "sw_frontend", displayRole: "Frontend Engineer" },
  "full stack developer": { canonicalKey: "sw_fullstack", displayRole: "Full Stack Developer" },
  "fullstack developer": { canonicalKey: "sw_fullstack", displayRole: "Full Stack Developer" },
  "full stack engineer": { canonicalKey: "sw_fullstack", displayRole: "Full Stack Developer" },
  "mobile developer": { canonicalKey: "sw_mobile_crossplatform", displayRole: "Mobile Developer" },
  "ios developer": { canonicalKey: "sw_mobile_crossplatform", displayRole: "Mobile Developer" },
  "android developer": { canonicalKey: "sw_mobile_crossplatform", displayRole: "Mobile Developer" },
  "react native developer": { canonicalKey: "sw_mobile_crossplatform", displayRole: "Mobile Developer" },
  "flutter developer": { canonicalKey: "sw_mobile_crossplatform", displayRole: "Mobile Developer" },
  "database administrator": { canonicalKey: "sw_dba", displayRole: "Database Administrator (DBA)" },
  "database administrator dba": { canonicalKey: "sw_dba", displayRole: "Database Administrator (DBA)" },
  "dba": { canonicalKey: "sw_dba", displayRole: "Database Administrator (DBA)" },

  // ── AI / ML ────────────────────────────────────────────────────────────────
  "machine learning engineer": { canonicalKey: "ml_engineer", displayRole: "ML Engineer" },
  "ml engineer": { canonicalKey: "ml_engineer", displayRole: "ML Engineer" },
  "machine learning scientist": { canonicalKey: "ml_engineer", displayRole: "ML Engineer" },
  "deep learning engineer": { canonicalKey: "ml_engineer", displayRole: "ML Engineer" },
  "ai engineer": { canonicalKey: "ai_engineer", displayRole: "AI Engineer" },
  "artificial intelligence engineer": { canonicalKey: "ai_engineer", displayRole: "AI Engineer" },
  "llm engineer": { canonicalKey: "llm_engineer", displayRole: "LLM Engineer" },
  "generative ai engineer": { canonicalKey: "llm_engineer", displayRole: "LLM Engineer" },
  "prompt engineer": { canonicalKey: "llm_engineer", displayRole: "Prompt Engineer" },
  "nlp engineer": { canonicalKey: "nlp_engineer", displayRole: "NLP Engineer" },
  "natural language processing engineer": { canonicalKey: "nlp_engineer", displayRole: "NLP Engineer" },
  "computer vision engineer": { canonicalKey: "cv_engineer", displayRole: "Computer Vision Engineer" },
  "cv engineer": { canonicalKey: "cv_engineer", displayRole: "Computer Vision Engineer" },
  "data scientist": { canonicalKey: "data_scientist", displayRole: "Data Scientist" },
  "senior data scientist": { canonicalKey: "data_scientist", displayRole: "Data Scientist" },
  "principal data scientist": { canonicalKey: "data_scientist", displayRole: "Data Scientist" },
  "research scientist": { canonicalKey: "research_scientist", displayRole: "Research Scientist" },
  "applied scientist": { canonicalKey: "research_scientist", displayRole: "Research Scientist" },
  "quantitative researcher": { canonicalKey: "quantitative_analyst", displayRole: "Quantitative Analyst" },
  "quant researcher": { canonicalKey: "quantitative_analyst", displayRole: "Quantitative Analyst" },
  "quant analyst": { canonicalKey: "quantitative_analyst", displayRole: "Quantitative Analyst" },

  // ── Data / Analytics ───────────────────────────────────────────────────────
  "data engineer": { canonicalKey: "data_engineer", displayRole: "Data Engineer" },
  "etl developer": { canonicalKey: "data_engineer", displayRole: "Data Engineer" },
  "data pipeline engineer": { canonicalKey: "data_engineer", displayRole: "Data Engineer" },
  "analytics engineer": { canonicalKey: "analytics_engineer", displayRole: "Analytics Engineer" },
  "dbt engineer": { canonicalKey: "analytics_engineer", displayRole: "Analytics Engineer" },
  "data analyst": { canonicalKey: "data_analyst", displayRole: "Data Analyst" },
  "business analyst": { canonicalKey: "data_analyst", displayRole: "Data Analyst" },
  "bi developer": { canonicalKey: "bi_analyst", displayRole: "BI Developer" },
  "bi analyst": { canonicalKey: "bi_analyst", displayRole: "BI Analyst" },
  "business intelligence analyst": { canonicalKey: "bi_analyst", displayRole: "BI Analyst" },
  "business intelligence developer": { canonicalKey: "bi_analyst", displayRole: "BI Developer" },
  "tableau developer": { canonicalKey: "bi_analyst", displayRole: "BI Developer" },
  "power bi developer": { canonicalKey: "bi_analyst", displayRole: "BI Developer" },
  "ml ops engineer": { canonicalKey: "ml_ops_engineer", displayRole: "MLOps Engineer" },
  "mlops engineer": { canonicalKey: "ml_ops_engineer", displayRole: "MLOps Engineer" },
  "data governance analyst": { canonicalKey: "data_governance_analyst", displayRole: "Data Governance Analyst" },

  // ── DevOps / Platform / Cloud ──────────────────────────────────────────────
  "devops engineer": { canonicalKey: "devops_engineer", displayRole: "DevOps Engineer" },
  "sre": { canonicalKey: "devops_engineer", displayRole: "Site Reliability Engineer" },
  "site reliability engineer": { canonicalKey: "devops_engineer", displayRole: "Site Reliability Engineer" },
  "platform engineer": { canonicalKey: "platform_engineer", displayRole: "Platform Engineer" },
  "cloud engineer": { canonicalKey: "cloud_architect", displayRole: "Cloud Engineer" },
  "cloud architect": { canonicalKey: "cloud_architect", displayRole: "Cloud Architect" },
  "aws engineer": { canonicalKey: "cloud_architect", displayRole: "Cloud Engineer" },
  "gcp engineer": { canonicalKey: "cloud_architect", displayRole: "Cloud Engineer" },
  "azure engineer": { canonicalKey: "cloud_architect", displayRole: "Cloud Engineer" },
  "infrastructure engineer": { canonicalKey: "devops_engineer", displayRole: "Infrastructure Engineer" },
  "security engineer": { canonicalKey: "security_engineer", displayRole: "Security Engineer" },
  "cybersecurity engineer": { canonicalKey: "security_engineer", displayRole: "Cybersecurity Engineer" },
  "appsec engineer": { canonicalKey: "security_engineer", displayRole: "Application Security Engineer" },
  "embedded engineer": { canonicalKey: "embedded_engineer", displayRole: "Embedded Engineer" },
  "firmware engineer": { canonicalKey: "embedded_engineer", displayRole: "Firmware Engineer" },
  "iot engineer": { canonicalKey: "embedded_engineer", displayRole: "IoT Engineer" },
  "qa engineer": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },
  "qa tester": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },
  "qa analyst": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },
  "software tester": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },
  "manual tester": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },
  "test engineer": { canonicalKey: "qa_engineer", displayRole: "Test Engineer" },
  "testing engineer": { canonicalKey: "qa_engineer", displayRole: "Test Engineer" },
  "sdet": { canonicalKey: "qa_engineer", displayRole: "SDET" },
  "test automation engineer": { canonicalKey: "qa_engineer", displayRole: "Test Automation Engineer" },
  "quality assurance engineer": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },
  "quality assurance analyst": { canonicalKey: "qa_engineer", displayRole: "QA Engineer" },

  // ── Non-Software Engineering ───────────────────────────────────────────────
  "mechanical engineer": { canonicalKey: "eng_mech", displayRole: "Mechanical Engineer" },
  "civil engineer": { canonicalKey: "eng_civil", displayRole: "Civil Engineer" },
  "electrical engineer": { canonicalKey: "eng_electrical", displayRole: "Electrical Engineer" },
  "chemical engineer": { canonicalKey: "eng_chemical", displayRole: "Chemical Engineer" },
  "industrial engineer": { canonicalKey: "eng_industrial", displayRole: "Industrial Engineer" },
  "manufacturing engineer": { canonicalKey: "eng_mech", displayRole: "Manufacturing Engineer" },
  "process engineer": { canonicalKey: "eng_mech", displayRole: "Process Engineer" },
  "structural engineer": { canonicalKey: "eng_civil", displayRole: "Structural Engineer" },
  "aerospace engineer": { canonicalKey: "eng_mech", displayRole: "Aerospace Engineer" },
  "automotive engineer": { canonicalKey: "eng_mech", displayRole: "Automotive Engineer" },

  // ── Engineering Leadership ─────────────────────────────────────────────────
  "engineering manager": { canonicalKey: "eng_manager", displayRole: "Engineering Manager" },
  "tech lead": { canonicalKey: "tech_lead", displayRole: "Tech Lead" },
  "technical lead": { canonicalKey: "tech_lead", displayRole: "Tech Lead" },
  "staff engineer": { canonicalKey: "staff_engineer", displayRole: "Staff Engineer" },
  "principal engineer": { canonicalKey: "staff_engineer", displayRole: "Principal Engineer" },
  "distinguished engineer": { canonicalKey: "distinguished_engineer", displayRole: "Distinguished Engineer" },
  "fellow engineer": { canonicalKey: "distinguished_engineer", displayRole: "Fellow Engineer" },
  "solution architect": { canonicalKey: "solution_architect", displayRole: "Solutions Architect" },
  "solutions architect": { canonicalKey: "solution_architect", displayRole: "Solutions Architect" },
  "enterprise architect": { canonicalKey: "solution_architect", displayRole: "Enterprise Architect" },
  "director of engineering": { canonicalKey: "director_engineering", displayRole: "Director of Engineering" },
  "engineering director": { canonicalKey: "director_engineering", displayRole: "Director of Engineering" },
  "vp of engineering": { canonicalKey: "vp_engineering", displayRole: "VP of Engineering" },
  "vice president engineering": { canonicalKey: "vp_engineering", displayRole: "VP Engineering" },
  "vp engineering": { canonicalKey: "vp_engineering", displayRole: "VP Engineering" },
  "cto": { canonicalKey: "cto", displayRole: "Chief Technology Officer" },
  "chief technology officer": { canonicalKey: "cto", displayRole: "Chief Technology Officer" },
  "head of engineering": { canonicalKey: "vp_engineering", displayRole: "Head of Engineering" },
  "head of technology": { canonicalKey: "cto", displayRole: "Head of Technology" },

  // ── Product & Design ───────────────────────────────────────────────────────
  "product manager": { canonicalKey: "sw_pm", displayRole: "Product Manager" },
  "product owner": { canonicalKey: "sw_pm", displayRole: "Product Manager" },
  "associate product manager": { canonicalKey: "associate_pm", displayRole: "Associate Product Manager" },
  "apm": { canonicalKey: "associate_pm", displayRole: "Associate Product Manager" },
  "senior product manager": { canonicalKey: "sw_pm", displayRole: "Senior Product Manager" },
  "product director": { canonicalKey: "product_director", displayRole: "Director of Product" },
  "director of product": { canonicalKey: "product_director", displayRole: "Director of Product" },
  "head of product": { canonicalKey: "product_director", displayRole: "Head of Product" },
  "vp product": { canonicalKey: "product_director", displayRole: "VP Product" },
  "vp of product": { canonicalKey: "product_director", displayRole: "VP Product" },
  "chief product officer": { canonicalKey: "product_director", displayRole: "Chief Product Officer" },
  "product analyst": { canonicalKey: "product_analyst", displayRole: "Product Analyst" },
  "ai product manager": { canonicalKey: "ai_product_manager", displayRole: "AI Product Manager" },
  "ux designer": { canonicalKey: "ux_designer", displayRole: "UX Designer" },
  "ui designer": { canonicalKey: "ux_designer", displayRole: "UI Designer" },
  "product designer": { canonicalKey: "product_designer", displayRole: "Product Designer" },
  "ui ux designer": { canonicalKey: "ux_designer", displayRole: "UI/UX Designer" },
  "user experience designer": { canonicalKey: "ux_designer", displayRole: "UX Designer" },
  "ux researcher": { canonicalKey: "ux_researcher", displayRole: "UX Researcher" },
  "user researcher": { canonicalKey: "ux_researcher", displayRole: "UX Researcher" },
  "brand designer": { canonicalKey: "brand_designer", displayRole: "Brand Designer" },
  "graphic designer": { canonicalKey: "brand_designer", displayRole: "Graphic Designer" },
  "visual designer": { canonicalKey: "brand_designer", displayRole: "Visual Designer" },
  "ux writer": { canonicalKey: "ux_writer", displayRole: "UX Writer" },
  "content designer": { canonicalKey: "ux_writer", displayRole: "Content Designer" },
  "design director": { canonicalKey: "design_director", displayRole: "Design Director" },
  "head of design": { canonicalKey: "design_director", displayRole: "Head of Design" },

  // ── Finance & Accounting ───────────────────────────────────────────────────
  "financial analyst": { canonicalKey: "financial_analyst", displayRole: "Financial Analyst" },
  "finance analyst": { canonicalKey: "financial_analyst", displayRole: "Financial Analyst" },
  "senior financial analyst": { canonicalKey: "senior_financial_analyst", displayRole: "Senior Financial Analyst" },
  "fp&a analyst": { canonicalKey: "fp_a_analyst", displayRole: "FP&A Analyst" },
  "fpa analyst": { canonicalKey: "fp_a_analyst", displayRole: "FP&A Analyst" },
  "financial planning analyst": { canonicalKey: "fp_a_analyst", displayRole: "FP&A Analyst" },
  "investment banker": { canonicalKey: "investment_banker", displayRole: "Investment Banker" },
  "investment banking analyst": { canonicalKey: "investment_banker", displayRole: "Investment Banking Analyst" },
  "equity research analyst": { canonicalKey: "equity_researcher", displayRole: "Equity Research Analyst" },
  "equity researcher": { canonicalKey: "equity_researcher", displayRole: "Equity Research Analyst" },
  "portfolio manager": { canonicalKey: "portfolio_manager", displayRole: "Portfolio Manager" },
  "fund manager": { canonicalKey: "portfolio_manager", displayRole: "Fund Manager" },
  "risk analyst": { canonicalKey: "risk_analyst", displayRole: "Risk Analyst" },
  "risk manager": { canonicalKey: "risk_analyst", displayRole: "Risk Manager" },
  "credit risk analyst": { canonicalKey: "risk_analyst", displayRole: "Credit Risk Analyst" },
  "compliance officer": { canonicalKey: "compliance_officer", displayRole: "Compliance Officer" },
  "compliance analyst": { canonicalKey: "compliance_officer", displayRole: "Compliance Analyst" },
  "regulatory compliance officer": { canonicalKey: "compliance_officer", displayRole: "Compliance Officer" },
  "internal auditor": { canonicalKey: "auditor_cpa", displayRole: "Internal Auditor" },
  "auditor": { canonicalKey: "auditor_cpa", displayRole: "Auditor" },
  "cpa": { canonicalKey: "auditor_cpa", displayRole: "CPA / Auditor" },
  "chartered accountant": { canonicalKey: "auditor_cpa", displayRole: "Chartered Accountant" },
  "ca": { canonicalKey: "auditor_cpa", displayRole: "Chartered Accountant" },
  "controller": { canonicalKey: "controller", displayRole: "Financial Controller" },
  "financial controller": { canonicalKey: "controller", displayRole: "Financial Controller" },
  "cfo": { canonicalKey: "cfo", displayRole: "Chief Financial Officer" },
  "chief financial officer": { canonicalKey: "cfo", displayRole: "Chief Financial Officer" },
  "vp finance": { canonicalKey: "cfo", displayRole: "VP Finance" },
  "treasury analyst": { canonicalKey: "treasury_analyst", displayRole: "Treasury Analyst" },
  "treasurer": { canonicalKey: "treasury_analyst", displayRole: "Treasurer" },
  "tax analyst": { canonicalKey: "tax_specialist", displayRole: "Tax Analyst" },
  "tax specialist": { canonicalKey: "tax_specialist", displayRole: "Tax Specialist" },
  "tax manager": { canonicalKey: "tax_specialist", displayRole: "Tax Manager" },
  "actuary": { canonicalKey: "actuarial_analyst", displayRole: "Actuary" },
  "actuarial analyst": { canonicalKey: "actuarial_analyst", displayRole: "Actuarial Analyst" },
  "quantitative analyst": { canonicalKey: "quantitative_analyst", displayRole: "Quantitative Analyst" },

  // ── Sales & Revenue ────────────────────────────────────────────────────────
  "account executive": { canonicalKey: "account_executive", displayRole: "Account Executive" },
  "ae": { canonicalKey: "account_executive", displayRole: "Account Executive" },
  "enterprise account executive": { canonicalKey: "enterprise_ae", displayRole: "Enterprise AE" },
  "senior account executive": { canonicalKey: "senior_account_executive", displayRole: "Senior AE" },
  "sales development representative": { canonicalKey: "sales_development_rep", displayRole: "SDR" },
  "sdr": { canonicalKey: "sales_development_rep", displayRole: "SDR" },
  "bdr": { canonicalKey: "sales_development_rep", displayRole: "BDR" },
  "business development representative": { canonicalKey: "sales_development_rep", displayRole: "BDR" },
  "business development manager": { canonicalKey: "business_development_manager", displayRole: "Business Development Manager" },
  "bdm": { canonicalKey: "business_development_manager", displayRole: "Business Development Manager" },
  "customer success manager": { canonicalKey: "customer_success_manager", displayRole: "Customer Success Manager" },
  "csm": { canonicalKey: "customer_success_manager", displayRole: "Customer Success Manager" },
  "sales engineer": { canonicalKey: "sales_engineer", displayRole: "Sales Engineer" },
  "solutions engineer": { canonicalKey: "sales_engineer", displayRole: "Solutions Engineer" },
  "pre sales engineer": { canonicalKey: "sales_engineer", displayRole: "Pre-Sales Engineer" },
  "vp sales": { canonicalKey: "vp_sales", displayRole: "VP Sales" },
  "vp of sales": { canonicalKey: "vp_sales", displayRole: "VP Sales" },
  "head of sales": { canonicalKey: "vp_sales", displayRole: "Head of Sales" },
  "chief revenue officer": { canonicalKey: "chief_revenue_officer", displayRole: "Chief Revenue Officer" },
  "cro": { canonicalKey: "chief_revenue_officer", displayRole: "CRO" },
  "sales operations analyst": { canonicalKey: "sales_operations_analyst", displayRole: "Sales Operations Analyst" },
  "sales ops": { canonicalKey: "sales_operations_analyst", displayRole: "Sales Ops Analyst" },
  "revenue operations manager": { canonicalKey: "revenue_operations_manager", displayRole: "Revenue Operations Manager" },
  "revops manager": { canonicalKey: "revenue_operations_manager", displayRole: "RevOps Manager" },
  "partnership manager": { canonicalKey: "partnership_manager", displayRole: "Partnerships Manager" },
  "alliances manager": { canonicalKey: "partnership_manager", displayRole: "Alliances Manager" },
  "channel manager": { canonicalKey: "partnership_manager", displayRole: "Channel Manager" },

  // ── HR & People Operations ─────────────────────────────────────────────────
  "hr generalist": { canonicalKey: "hr_generalist", displayRole: "HR Generalist" },
  "human resources generalist": { canonicalKey: "hr_generalist", displayRole: "HR Generalist" },
  "hr business partner": { canonicalKey: "hr_business_partner", displayRole: "HR Business Partner" },
  "hrbp": { canonicalKey: "hr_business_partner", displayRole: "HRBP" },
  "hr director": { canonicalKey: "hr_director", displayRole: "HR Director" },
  "director of hr": { canonicalKey: "hr_director", displayRole: "HR Director" },
  "head of hr": { canonicalKey: "hr_director", displayRole: "Head of HR" },
  "talent acquisition specialist": { canonicalKey: "talent_acquisition_specialist", displayRole: "Talent Acquisition Specialist" },
  "recruiter": { canonicalKey: "talent_acquisition_specialist", displayRole: "Recruiter" },
  "technical recruiter": { canonicalKey: "talent_acquisition_specialist", displayRole: "Technical Recruiter" },
  "recruiting manager": { canonicalKey: "recruiting_manager", displayRole: "Recruiting Manager" },
  "talent acquisition manager": { canonicalKey: "recruiting_manager", displayRole: "TA Manager" },
  "executive recruiter": { canonicalKey: "executive_recruiter", displayRole: "Executive Recruiter" },
  "headhunter": { canonicalKey: "executive_recruiter", displayRole: "Executive Recruiter" },
  "compensation analyst": { canonicalKey: "compensation_benefits_analyst", displayRole: "Compensation Analyst" },
  "total rewards analyst": { canonicalKey: "compensation_benefits_analyst", displayRole: "Total Rewards Analyst" },
  "benefits analyst": { canonicalKey: "compensation_benefits_analyst", displayRole: "Benefits Analyst" },
  "learning development manager": { canonicalKey: "learning_development_manager", displayRole: "L&D Manager" },
  "l and d manager": { canonicalKey: "learning_development_manager", displayRole: "L&D Manager" },
  "training manager": { canonicalKey: "learning_development_manager", displayRole: "Training Manager" },
  "dei manager": { canonicalKey: "dei_program_manager", displayRole: "DEI Manager" },
  "diversity equity inclusion manager": { canonicalKey: "dei_program_manager", displayRole: "DEI Manager" },
  "chief people officer": { canonicalKey: "chief_people_officer", displayRole: "Chief People Officer" },
  "cpo hr": { canonicalKey: "chief_people_officer", displayRole: "Chief People Officer" },
  "chro": { canonicalKey: "chief_people_officer", displayRole: "CHRO" },
  "chief human resources officer": { canonicalKey: "chief_people_officer", displayRole: "CHRO" },

  // ── Operations / BPO ───────────────────────────────────────────────────────
  "process associate": { canonicalKey: "bpo_associate", displayRole: "Process Associate" },
  "process analyst": { canonicalKey: "bpo_associate", displayRole: "Process Analyst" },
  "operations analyst": { canonicalKey: "bpo_associate", displayRole: "Operations Analyst" },
  "bpo analyst": { canonicalKey: "bpo_associate", displayRole: "BPO Analyst" },
  "support engineer": { canonicalKey: "support_engineer", displayRole: "Support Engineer" },
  "technical support engineer": { canonicalKey: "support_engineer", displayRole: "Technical Support Engineer" },
  "customer support specialist": { canonicalKey: "support_engineer", displayRole: "Customer Support Specialist" },
};

// v37.0: Expanded from 7 to 150+ canonical key → ACTION_DB group mappings.
const CANONICAL_TO_ACTION_GROUP: Record<string, string> = {
  // Software Engineering
  sw_software_engineer: "swe",
  sw_backend: "swe_backend",
  sw_frontend: "swe_frontend",
  sw_fullstack: "swe_fullstack",
  sw_mobile_crossplatform: "swe_mobile",
  sw_dba: "data_engineer",
  // AI / ML
  ml_engineer: "ml_engineer",
  ai_engineer: "ai_engineer",
  llm_engineer: "llm_engineer",
  nlp_engineer: "nlp_engineer",
  cv_engineer: "cv_engineer",
  // Data
  data_engineer: "data_engineer",
  data_analyst: "data_analyst",
  data_scientist: "data_scientist",
  analytics_engineer: "analytics_engineer",
  bi_analyst: "bi_analyst",
  ml_ops_engineer: "devops",
  data_governance_analyst: "data_analyst",
  quantitative_analyst: "quantitative_analyst",
  research_scientist: "data_scientist",
  // DevOps / Platform / Cloud
  devops_engineer: "devops",
  platform_engineer: "platform_engineer",
  cloud_architect: "cloud_architect",
  security_engineer: "security_engineer",
  embedded_engineer: "embedded_engineer",
  qa_engineer: "qa_engineer",
  // Engineering Leadership
  eng_manager: "eng_manager",
  tech_lead: "tech_lead",
  staff_engineer: "principal_engineer",
  distinguished_engineer: "principal_engineer",
  solution_architect: "solution_architect",
  director_engineering: "eng_manager",
  vp_engineering: "eng_manager",
  cto: "eng_manager",
  // Product & Design
  sw_pm: "product_manager",
  associate_pm: "product_manager",
  product_analyst: "product_manager",
  product_director: "product_manager",
  ai_product_manager: "product_manager",
  ux_designer: "ux_designer",
  product_designer: "ux_designer",
  ux_researcher: "ux_researcher",
  brand_designer: "brand_designer",
  ux_writer: "ux_designer",
  design_director: "ux_designer",
  // Finance & Accounting
  financial_analyst: "financial_analyst",
  senior_financial_analyst: "financial_analyst",
  fp_a_analyst: "financial_analyst",
  investment_banker: "investment_banker",
  equity_researcher: "investment_banker",
  portfolio_manager: "portfolio_manager",
  risk_analyst: "risk_analyst",
  compliance_officer: "compliance_officer",
  auditor_cpa: "financial_analyst",
  controller: "financial_analyst",
  cfo: "financial_analyst",
  treasury_analyst: "financial_analyst",
  tax_specialist: "financial_analyst",
  actuarial_analyst: "financial_analyst",
  // Sales & Revenue
  account_executive: "account_executive",
  senior_account_executive: "account_executive",
  enterprise_ae: "account_executive",
  sales_development_rep: "account_executive",
  business_development_manager: "business_development_manager",
  customer_success_manager: "customer_success_manager",
  sales_engineer: "sales_engineer",
  vp_sales: "vp_sales",
  chief_revenue_officer: "vp_sales",
  sales_operations_analyst: "sales_operations_analyst",
  revenue_operations_manager: "sales_operations_analyst",
  partnership_manager: "business_development_manager",
  // HR & People Operations
  hr_generalist: "hr_generalist",
  hr_business_partner: "hr_business_partner",
  hr_director: "hr_director",
  talent_acquisition_specialist: "talent_acquisition_specialist",
  recruiting_manager: "recruiting_manager",
  executive_recruiter: "recruiting_manager",
  compensation_benefits_analyst: "hr_generalist",
  learning_development_manager: "hr_generalist",
  dei_program_manager: "hr_generalist",
  chief_people_officer: "hr_director",
  // BPO / Operations
  bpo_associate: "bpo_associate",
  support_engineer: "support_engineer",
};

// v37.0 + v38.0: Merge industry alias additions into both maps at module initialization.
// Some files export Record<string, string> (value = canonical group key).
// Other files export Record<string, { canonicalKey, displayRole }> (richer shape).
// Handle both shapes — extract the canonical key string regardless of input shape.
type AliasValue = string | { canonicalKey: string; displayRole?: string };
const asAlias = (x: unknown) => x as Record<string, AliasValue>;
const _industryAliasModules: Array<Record<string, AliasValue>> = [
  asAlias(ALIAS_ADDITIONS_HEALTHCARE_LEGAL),
  asAlias(ALIAS_ADDITIONS_CONSULTING_MARKETING_CX),
  asAlias(ALIAS_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION),
  asAlias(ALIAS_ADDITIONS_RETAIL_LOGISTICS_PHARMA),
  asAlias(ALIAS_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION),
  asAlias(ALIAS_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY),
  // v38.0 Phase 1
  asAlias(ALIAS_ADDITIONS_CYBERSECURITY),
  asAlias(ALIAS_ADDITIONS_CLOUD_PLATFORM),
  asAlias(ALIAS_ADDITIONS_AI_ML_SPECIALIZATION),
  asAlias(ALIAS_ADDITIONS_QA_FRONTEND_MOBILE),
  // v38.0 Phase 2
  asAlias(ALIAS_ADDITIONS_PHYSICIANS),
  asAlias(ALIAS_ADDITIONS_NURSING_ALLIED_HEALTH),
  asAlias(ALIAS_ADDITIONS_BIOTECH_HEALTHCARE_IT),
  asAlias(ALIAS_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH),
  // v38.0 Phase 3
  asAlias(ALIAS_ADDITIONS_INVESTMENT_BANKING_PE_VC),
  asAlias(ALIAS_ADDITIONS_QUANT_ASSET_HEDGE),
  asAlias(ALIAS_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK),
  asAlias(ALIAS_ADDITIONS_INSURANCE_RE_FINANCE),
  // v38.0 Phase 4
  asAlias(ALIAS_ADDITIONS_SKILLED_TRADES),
  asAlias(ALIAS_ADDITIONS_INDUSTRIAL_ENGINEERING),
  asAlias(ALIAS_ADDITIONS_ENERGY_SPECIALIZATIONS),
  asAlias(ALIAS_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS),
  asAlias(ALIAS_ADDITIONS_AVIATION_PUBLIC_SAFETY),
  // v38.0 Phase 5
  asAlias(ALIAS_ADDITIONS_MEDIA_ENTERTAINMENT),
  asAlias(ALIAS_ADDITIONS_HOSPITALITY_TRAVEL),
  asAlias(ALIAS_ADDITIONS_CX_RESEARCH_ACADEMIA),
  // v38.0 Phase 6
  asAlias(ALIAS_ADDITIONS_MEDICAL_SUBSPECIALTIES),
  asAlias(ALIAS_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE),
  asAlias(ALIAS_ADDITIONS_SKILLED_SERVICES_EDU_GOV),
];
for (const moduleAliases of _industryAliasModules) {
  for (const [title, raw] of Object.entries(moduleAliases)) {
    const normalized = title.toLowerCase().replace(/[()]/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const canonicalKey = typeof raw === "string" ? raw : raw.canonicalKey;
    const displayRole = typeof raw === "string" ? title : (raw.displayRole ?? title);
    HUMAN_TITLE_ALIAS_MAP[normalized] = { canonicalKey, displayRole };
  }
}

Object.assign(CANONICAL_TO_ACTION_GROUP, {
  ...CANONICAL_GROUP_ADDITIONS_HEALTHCARE_LEGAL,
  ...CANONICAL_GROUP_ADDITIONS_CONSULTING_MARKETING_CX,
  ...CANONICAL_GROUP_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION,
  ...CANONICAL_GROUP_ADDITIONS_RETAIL_LOGISTICS_PHARMA,
  ...CANONICAL_GROUP_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION,
  ...CANONICAL_GROUP_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY,
  // v38.0 Phase 1
  ...CANONICAL_GROUP_ADDITIONS_CYBERSECURITY,
  ...CANONICAL_GROUP_ADDITIONS_CLOUD_PLATFORM,
  ...CANONICAL_GROUP_ADDITIONS_AI_ML_SPECIALIZATION,
  ...CANONICAL_GROUP_ADDITIONS_QA_FRONTEND_MOBILE,
  // v38.0 Phase 2
  ...CANONICAL_GROUP_ADDITIONS_PHYSICIANS,
  ...CANONICAL_GROUP_ADDITIONS_NURSING_ALLIED_HEALTH,
  ...CANONICAL_GROUP_ADDITIONS_BIOTECH_HEALTHCARE_IT,
  ...CANONICAL_GROUP_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH,
  // v38.0 Phase 3
  ...CANONICAL_GROUP_ADDITIONS_INVESTMENT_BANKING_PE_VC,
  ...CANONICAL_GROUP_ADDITIONS_QUANT_ASSET_HEDGE,
  ...CANONICAL_GROUP_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK,
  ...CANONICAL_GROUP_ADDITIONS_INSURANCE_RE_FINANCE,
  // v38.0 Phase 4
  ...CANONICAL_GROUP_ADDITIONS_SKILLED_TRADES,
  ...CANONICAL_GROUP_ADDITIONS_INDUSTRIAL_ENGINEERING,
  ...CANONICAL_GROUP_ADDITIONS_ENERGY_SPECIALIZATIONS,
  ...CANONICAL_GROUP_ADDITIONS_CONSTRUCTION_SPECIALIZATIONS,
  ...CANONICAL_GROUP_ADDITIONS_AVIATION_PUBLIC_SAFETY,
  // v38.0 Phase 5
  ...CANONICAL_GROUP_ADDITIONS_MEDIA_ENTERTAINMENT,
  ...CANONICAL_GROUP_ADDITIONS_HOSPITALITY_TRAVEL,
  ...CANONICAL_GROUP_ADDITIONS_CX_RESEARCH_ACADEMIA,
  // v38.0 Phase 6
  ...CANONICAL_GROUP_ADDITIONS_MEDICAL_SUBSPECIALTIES,
  ...CANONICAL_GROUP_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE,
  ...CANONICAL_GROUP_ADDITIONS_SKILLED_SERVICES_EDU_GOV,
});

const normalizeRoleTitle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function canonicalKeyToActionGroup(canonicalKey: string | null | undefined): string | null {
  if (!canonicalKey) return null;
  return CANONICAL_TO_ACTION_GROUP[canonicalKey] ?? null;
}

export function resolveRoleInput(
  input: string,
  options?: { oracleKey?: string | null },
): ResolvedRole {
  const trimmed = input.trim();
  const explicitOracleKey = options?.oracleKey?.trim();

  if (explicitOracleKey) {
    const roleEntry = getRoleEntryByKey(explicitOracleKey);
    const intel = getCareerIntelligence(explicitOracleKey);
    return {
      input,
      canonicalKey: explicitOracleKey,
      displayRole: roleEntry?.displayTitle ?? intel?.displayRole ?? explicitOracleKey,
      source: "oracle_picker",
      confidence: 1,
      requiresConfirmation: false,
    };
  }

  if (!trimmed) {
    return {
      input,
      canonicalKey: null,
      displayRole: null,
      source: "unresolved",
      confidence: 0,
      requiresConfirmation: false,
    };
  }

  const normalized = normalizeRoleTitle(trimmed);
  const alias = HUMAN_TITLE_ALIAS_MAP[normalized];
  if (alias) {
    return {
      input,
      canonicalKey: alias.canonicalKey,
      displayRole: alias.displayRole,
      source: "alias_map",
      confidence: 0.95,
      requiresConfirmation: false,
    };
  }

  const canUseCatalogBridge = trimmed.includes("_") || !trimmed.includes(" ");
  if (canUseCatalogBridge && hasSeededData(trimmed)) {
    const intel = getCareerIntelligence(trimmed);
    return {
      input,
      canonicalKey: trimmed,
      displayRole: intel?.displayRole ?? trimmed,
      source: "catalog_bridge",
      confidence: 0.85,
      requiresConfirmation: false,
    };
  }

  return {
    input,
    canonicalKey: null,
    displayRole: null,
    source: "unresolved",
    confidence: 0,
    requiresConfirmation: true,
  };
}
