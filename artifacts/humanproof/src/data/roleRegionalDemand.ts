// roleRegionalDemand.ts — v37.0 Phase 5
// Per-role demand by region + India sub-regional data + INR salary bands.
//
// Regions:
//   'india'        — India overall (aggregates Tier 1 + Tier 2 cities)
//   'us'           — United States
//   'eu'           — European Union (UK included as 'uk' for post-Brexit distinction)
//   'uk'           — United Kingdom
//   'mena'         — Middle East & North Africa
//   'latam'        — Latin America
//   'apac_ex'      — Asia-Pacific excluding India (Singapore, Australia, SEA)
//   'canada'       — Canada
//   'aus_nz'       — Australia + New Zealand
//
// India sub-regions (Tier 1 metros):
//   'india_bangalore', 'india_hyderabad', 'india_pune', 'india_mumbai', 'india_delhi_ncr'
// India Tier 2:
//   'india_ahmedabad', 'india_kochi', 'india_kolkata', 'india_chandigarh'
//
// Demand index: 0–100 scale (same as roleMarketDemandService)
//   70+ = strong demand, <40 = weak demand
//
// INR salary bands: annual CTC in ₹ Lakhs (LPA)
// USD salary bands: annual in $K USD
//
// Sources: Naukri JobSpeak Index Q1 2026, LinkedIn India Insights Q1 2026,
//          NASSCOM Tech Report 2025, BLS OES 2025, Glassdoor 2026 data

export type RegionKey =
  | 'india' | 'us' | 'eu' | 'uk' | 'mena' | 'latam' | 'apac_ex' | 'canada' | 'aus_nz'
  | 'india_bangalore' | 'india_hyderabad' | 'india_pune' | 'india_mumbai' | 'india_delhi_ncr'
  | 'india_ahmedabad' | 'india_kochi' | 'india_kolkata' | 'india_chandigarh';

export type DemandTrend = 'rising' | 'stable' | 'falling';

export interface RegionalDemandEntry {
  demandIndex: number;          // 0–100
  demandTrend: DemandTrend;
  /** Annual salary range in USD thousands (e.g. [80, 130] = $80K–$130K) */
  salaryRangeUSD?: [number, number];
  /** Annual CTC in INR Lakhs (e.g. [12, 22] = ₹12–22 LPA) */
  salaryRangeINR?: [number, number];
  topHiringCities?: string[];
  platformsToUse?: string[];
  note?: string;
}

export type RoleRegionalProfile = Partial<Record<RegionKey, RegionalDemandEntry>>;

// ─── Regional Demand Database ──────────────────────────────────────────────────
// KEY: canonical role key from roleResolution.ts / ACTION_DB
const ROLE_REGIONAL_DEMAND: Record<string, RoleRegionalProfile> = {

  // ─── Software Engineering ────────────────────────────────────────────────────
  swe: {
    india: { demandIndex: 82, demandTrend: 'stable', salaryRangeINR: [12, 45], topHiringCities: ['Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Delhi NCR'], platformsToUse: ['Naukri', 'LinkedIn', 'GitHub Jobs'] },
    india_bangalore: { demandIndex: 88, demandTrend: 'stable', salaryRangeINR: [15, 55], topHiringCities: ['Bangalore'], platformsToUse: ['Naukri', 'LinkedIn', 'AngelList India'] },
    india_hyderabad: { demandIndex: 84, demandTrend: 'stable', salaryRangeINR: [13, 48], topHiringCities: ['Hyderabad'], platformsToUse: ['Naukri', 'LinkedIn'] },
    india_pune: { demandIndex: 80, demandTrend: 'stable', salaryRangeINR: [12, 42], topHiringCities: ['Pune'], platformsToUse: ['Naukri', 'LinkedIn'] },
    india_mumbai: { demandIndex: 76, demandTrend: 'stable', salaryRangeINR: [14, 50], topHiringCities: ['Mumbai', 'Thane', 'Navi Mumbai'], platformsToUse: ['Naukri', 'LinkedIn'] },
    india_delhi_ncr: { demandIndex: 78, demandTrend: 'stable', salaryRangeINR: [13, 48], topHiringCities: ['Gurugram', 'Noida', 'Delhi'], platformsToUse: ['Naukri', 'LinkedIn'] },
    us: { demandIndex: 78, demandTrend: 'stable', salaryRangeUSD: [95, 185], topHiringCities: ['San Francisco', 'Seattle', 'New York', 'Austin', 'Boston'], platformsToUse: ['LinkedIn', 'Indeed', 'levels.fyi', 'Blind'] },
    eu: { demandIndex: 72, demandTrend: 'stable', salaryRangeUSD: [60, 120], topHiringCities: ['Berlin', 'Amsterdam', 'Dublin', 'Paris', 'Stockholm'], platformsToUse: ['LinkedIn', 'Stack Overflow Jobs', 'Xing (Germany)'] },
    uk: { demandIndex: 75, demandTrend: 'stable', salaryRangeUSD: [70, 140], topHiringCities: ['London', 'Cambridge', 'Manchester', 'Edinburgh'], platformsToUse: ['LinkedIn', 'Reed', 'Otta'] },
    canada: { demandIndex: 74, demandTrend: 'stable', salaryRangeUSD: [75, 145], topHiringCities: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], platformsToUse: ['LinkedIn', 'Indeed CA', 'Workopolis'] },
    aus_nz: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [75, 135], platformsToUse: ['LinkedIn', 'Seek.com.au', 'TradeMe Jobs (NZ)'] },
    mena: { demandIndex: 62, demandTrend: 'rising', salaryRangeUSD: [50, 110], topHiringCities: ['Dubai', 'Abu Dhabi', 'Riyadh', 'Cairo'], platformsToUse: ['Bayt.com', 'GulfTalent', 'LinkedIn'] },
  },

  ml_engineer: {
    india: { demandIndex: 90, demandTrend: 'rising', salaryRangeINR: [18, 70], topHiringCities: ['Bangalore', 'Hyderabad', 'Mumbai'], platformsToUse: ['Naukri', 'LinkedIn', 'AI Jobs India'] },
    india_bangalore: { demandIndex: 95, demandTrend: 'rising', salaryRangeINR: [22, 90], note: 'Highest AI demand concentration in India' },
    us: { demandIndex: 94, demandTrend: 'rising', salaryRangeUSD: [150, 350], topHiringCities: ['San Francisco', 'Seattle', 'New York', 'Boston'], platformsToUse: ['LinkedIn', 'levels.fyi', 'Anthropic/OpenAI/Google careers'] },
    eu: { demandIndex: 82, demandTrend: 'rising', salaryRangeUSD: [80, 160], topHiringCities: ['London', 'Paris', 'Berlin', 'Zurich'], platformsToUse: ['LinkedIn', 'AI Jobs Europe'] },
    uk: { demandIndex: 88, demandTrend: 'rising', salaryRangeUSD: [90, 180], platformsToUse: ['LinkedIn', 'Otta', 'AI Jobs UK'] },
    canada: { demandIndex: 82, demandTrend: 'rising', salaryRangeUSD: [100, 200], topHiringCities: ['Toronto', 'Montreal (AI hub)', 'Vancouver'], platformsToUse: ['LinkedIn', 'Vector Institute job board'] },
    mena: { demandIndex: 68, demandTrend: 'rising', salaryRangeUSD: [60, 130], platformsToUse: ['Bayt.com', 'GulfTalent', 'LinkedIn'] },
  },

  data_scientist: {
    india: { demandIndex: 84, demandTrend: 'stable', salaryRangeINR: [15, 55], topHiringCities: ['Bangalore', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi NCR'], platformsToUse: ['Naukri', 'LinkedIn', 'Analytics Vidhya Jobs'] },
    india_bangalore: { demandIndex: 90, demandTrend: 'stable', salaryRangeINR: [18, 70] },
    us: { demandIndex: 82, demandTrend: 'stable', salaryRangeUSD: [110, 210], platformsToUse: ['LinkedIn', 'Indeed', 'Kaggle Jobs'] },
    uk: { demandIndex: 78, demandTrend: 'stable', salaryRangeUSD: [75, 145], platformsToUse: ['LinkedIn', 'Reed', 'CW Jobs'] },
    eu: { demandIndex: 74, demandTrend: 'stable', salaryRangeUSD: [65, 125], platformsToUse: ['LinkedIn', 'Stack Overflow Jobs'] },
    canada: { demandIndex: 76, demandTrend: 'stable', salaryRangeUSD: [80, 155], platformsToUse: ['LinkedIn', 'Indeed CA'] },
    aus_nz: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [70, 130], platformsToUse: ['LinkedIn', 'Seek.com.au'] },
  },

  // ─── Product Management ──────────────────────────────────────────────────────
  product_manager: {
    india: { demandIndex: 76, demandTrend: 'rising', salaryRangeINR: [18, 60], topHiringCities: ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi NCR'], platformsToUse: ['Naukri', 'LinkedIn', 'IIM Jobs'] },
    india_bangalore: { demandIndex: 82, demandTrend: 'rising', salaryRangeINR: [22, 80] },
    us: { demandIndex: 74, demandTrend: 'stable', salaryRangeUSD: [120, 220], platformsToUse: ['LinkedIn', 'Glassdoor', 'ProductBoard jobs'] },
    eu: { demandIndex: 66, demandTrend: 'stable', salaryRangeUSD: [75, 140], platformsToUse: ['LinkedIn', 'EU-Startups job board'] },
    uk: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [80, 155], platformsToUse: ['LinkedIn', 'Otta', 'Reed'] },
    canada: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [85, 160], platformsToUse: ['LinkedIn', 'Indeed CA'] },
  },

  // ─── Finance ─────────────────────────────────────────────────────────────────
  financial_analyst: {
    india: { demandIndex: 70, demandTrend: 'stable', salaryRangeINR: [6, 20], topHiringCities: ['Mumbai', 'Bangalore', 'Delhi NCR', 'Pune'], platformsToUse: ['Naukri', 'LinkedIn', 'Finladder'] },
    india_mumbai: { demandIndex: 80, demandTrend: 'stable', salaryRangeINR: [8, 28], note: 'Mumbai is the primary financial services hub in India' },
    india_delhi_ncr: { demandIndex: 68, demandTrend: 'stable', salaryRangeINR: [7, 22] },
    us: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [65, 130], topHiringCities: ['New York', 'Chicago', 'Boston', 'San Francisco'], platformsToUse: ['LinkedIn', 'eFinancialCareers', 'Indeed'] },
    uk: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [55, 115], topHiringCities: ['London (City)', 'Edinburgh', 'Manchester'], platformsToUse: ['eFinancialCareers', 'LinkedIn', 'Totaljobs'] },
    eu: { demandIndex: 62, demandTrend: 'stable', salaryRangeUSD: [50, 110], topHiringCities: ['Frankfurt', 'Amsterdam', 'Zurich', 'Luxembourg'], platformsToUse: ['eFinancialCareers', 'LinkedIn'] },
    mena: { demandIndex: 72, demandTrend: 'rising', salaryRangeUSD: [55, 120], topHiringCities: ['Dubai DIFC', 'Abu Dhabi', 'Riyadh'], platformsToUse: ['GulfTalent', 'Bayt.com', 'LinkedIn'] },
    canada: { demandIndex: 66, demandTrend: 'stable', salaryRangeUSD: [60, 115], platformsToUse: ['LinkedIn', 'Indeed CA'] },
  },

  investment_banker: {
    us: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [110, 300], topHiringCities: ['New York', 'San Francisco', 'Chicago'], platformsToUse: ['LinkedIn', 'eFinancialCareers', 'Mergers & Inquisitions job board'] },
    uk: { demandIndex: 72, demandTrend: 'stable', salaryRangeUSD: [95, 280], topHiringCities: ['London (City)', 'Canary Wharf'], platformsToUse: ['eFinancialCareers', 'LinkedIn', 'Wall Street Oasis job board'] },
    eu: { demandIndex: 62, demandTrend: 'stable', salaryRangeUSD: [75, 200], topHiringCities: ['Frankfurt', 'Paris', 'Amsterdam', 'Zurich'], platformsToUse: ['eFinancialCareers', 'LinkedIn'] },
    mena: { demandIndex: 70, demandTrend: 'rising', salaryRangeUSD: [100, 250], topHiringCities: ['Dubai', 'Abu Dhabi', 'Riyadh'], platformsToUse: ['GulfTalent', 'LinkedIn'] },
    india_mumbai: { demandIndex: 62, demandTrend: 'stable', salaryRangeINR: [20, 80], note: 'Bulge bracket and boutique IB presence in BKC/Nariman Point' },
  },

  // ─── Sales ───────────────────────────────────────────────────────────────────
  account_executive: {
    india: { demandIndex: 72, demandTrend: 'stable', salaryRangeINR: [10, 35], topHiringCities: ['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad'], platformsToUse: ['Naukri', 'LinkedIn', 'Internshala (for entry level)'] },
    us: { demandIndex: 74, demandTrend: 'stable', salaryRangeUSD: [70, 180], note: 'OTE (base + commission) typically 1.8–2.2× base', platformsToUse: ['LinkedIn', 'Bravado', 'RepVue'] },
    eu: { demandIndex: 62, demandTrend: 'stable', salaryRangeUSD: [55, 130], platformsToUse: ['LinkedIn', 'Jobsite.co.uk', 'Xing'] },
    uk: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [55, 145], platformsToUse: ['LinkedIn', 'Reed', 'Totaljobs'] },
    canada: { demandIndex: 66, demandTrend: 'stable', salaryRangeUSD: [60, 140], platformsToUse: ['LinkedIn', 'Indeed CA'] },
  },

  // ─── Marketing ───────────────────────────────────────────────────────────────
  digital_marketing_manager: {
    india: { demandIndex: 68, demandTrend: 'rising', salaryRangeINR: [8, 28], topHiringCities: ['Bangalore', 'Mumbai', 'Delhi NCR', 'Pune'], platformsToUse: ['Naukri', 'LinkedIn', 'IIM Jobs'] },
    india_bangalore: { demandIndex: 72, demandTrend: 'rising', salaryRangeINR: [10, 35] },
    us: { demandIndex: 64, demandTrend: 'stable', salaryRangeUSD: [65, 125], platformsToUse: ['LinkedIn', 'Indeed', 'MarketingHire'] },
    uk: { demandIndex: 66, demandTrend: 'stable', salaryRangeUSD: [50, 105], platformsToUse: ['LinkedIn', 'Reed', 'Totaljobs'] },
    eu: { demandIndex: 60, demandTrend: 'stable', salaryRangeUSD: [45, 95], platformsToUse: ['LinkedIn', 'XING (Germany/Austria/Switzerland)'] },
    mena: { demandIndex: 62, demandTrend: 'rising', salaryRangeUSD: [40, 95], platformsToUse: ['Bayt.com', 'GulfTalent', 'LinkedIn'] },
    latam: { demandIndex: 58, demandTrend: 'rising', salaryRangeUSD: [25, 65], platformsToUse: ['LinkedIn', 'Workana', 'Computrabajo'] },
  },

  // ─── HR ──────────────────────────────────────────────────────────────────────
  hr_business_partner: {
    india: { demandIndex: 60, demandTrend: 'stable', salaryRangeINR: [8, 30], topHiringCities: ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi NCR'], platformsToUse: ['Naukri', 'LinkedIn', 'TimesJobs'] },
    us: { demandIndex: 58, demandTrend: 'stable', salaryRangeUSD: [80, 145], platformsToUse: ['LinkedIn', 'Indeed', 'SHRM HR Jobs'] },
    uk: { demandIndex: 60, demandTrend: 'stable', salaryRangeUSD: [55, 115], platformsToUse: ['LinkedIn', 'CIPD Jobs', 'Reed'] },
    eu: { demandIndex: 55, demandTrend: 'stable', salaryRangeUSD: [50, 110], platformsToUse: ['LinkedIn', 'XING', 'StepStone'] },
  },

  // ─── Healthcare ──────────────────────────────────────────────────────────────
  registered_nurse: {
    india: { demandIndex: 72, demandTrend: 'stable', salaryRangeINR: [3, 12], topHiringCities: ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Chennai', 'Kochi'], platformsToUse: ['Naukri', 'LinkedIn', 'Nursing Jobs India'] },
    india_kochi: { demandIndex: 76, demandTrend: 'stable', salaryRangeINR: [3, 10], note: 'Kerala is the primary nursing talent hub in India' },
    us: { demandIndex: 84, demandTrend: 'rising', salaryRangeUSD: [65, 130], topHiringCities: ['California', 'Texas', 'Florida', 'New York'], platformsToUse: ['LinkedIn', 'Indeed', 'NurseRecruiter.com', 'HireUp'] },
    uk: { demandIndex: 80, demandTrend: 'rising', salaryRangeUSD: [35, 65], topHiringCities: ['London', 'Birmingham', 'Manchester'], platformsToUse: ['NHS Jobs', 'RCN Jobs', 'LinkedIn'] },
    canada: { demandIndex: 80, demandTrend: 'rising', salaryRangeUSD: [60, 110], platformsToUse: ['LinkedIn', 'Healthcarejobs.ca', 'Indeed CA'] },
    mena: { demandIndex: 78, demandTrend: 'rising', salaryRangeUSD: [28, 65], topHiringCities: ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha'], platformsToUse: ['GulfTalent', 'Bayt.com', 'LinkedIn'] },
    aus_nz: { demandIndex: 80, demandTrend: 'rising', salaryRangeUSD: [60, 100], platformsToUse: ['Seek.com.au', 'LinkedIn', 'HospitalCareers.com.au'] },
  },

  physician_general_practitioner: {
    india: { demandIndex: 68, demandTrend: 'stable', salaryRangeINR: [12, 60], topHiringCities: ['All metro cities', 'Tier 2 cities (high demand)'], platformsToUse: ['Naukri Health', 'LinkedIn', 'MedBound'] },
    us: { demandIndex: 78, demandTrend: 'rising', salaryRangeUSD: [200, 280], note: 'Primary care physician shortage is critical across US', platformsToUse: ['PracticeLink', 'LinkedIn', 'New England Journal of Medicine CareerCenter'] },
    uk: { demandIndex: 76, demandTrend: 'rising', salaryRangeUSD: [90, 150], platformsToUse: ['NHS Jobs', 'BMJ Careers', 'LinkedIn'] },
    canada: { demandIndex: 80, demandTrend: 'rising', salaryRangeUSD: [160, 240], platformsToUse: ['CMA Career Centre', 'LinkedIn', 'MD Financial'] },
    mena: { demandIndex: 80, demandTrend: 'rising', salaryRangeUSD: [80, 200], platformsToUse: ['GulfTalent', 'LinkedIn', 'Health Jobs MENA'] },
    aus_nz: { demandIndex: 78, demandTrend: 'rising', salaryRangeUSD: [150, 220], platformsToUse: ['Seek.com.au', 'MedicalJobs.com.au', 'LinkedIn'] },
  },

  // ─── Legal ───────────────────────────────────────────────────────────────────
  corporate_attorney: {
    india: { demandIndex: 60, demandTrend: 'stable', salaryRangeINR: [8, 40], topHiringCities: ['Mumbai', 'Delhi NCR', 'Bangalore', 'Hyderabad'], platformsToUse: ['Naukri', 'LinkedIn', 'Bar & Bench Jobs'] },
    india_mumbai: { demandIndex: 68, demandTrend: 'stable', salaryRangeINR: [12, 55], note: 'Primary commercial law market' },
    us: { demandIndex: 64, demandTrend: 'stable', salaryRangeUSD: [160, 400], topHiringCities: ['New York', 'Washington DC', 'Chicago', 'San Francisco'], platformsToUse: ['LinkedIn', 'Law.com', 'Lateral Hub'] },
    uk: { demandIndex: 66, demandTrend: 'stable', salaryRangeUSD: [90, 250], topHiringCities: ['London (City and Canary Wharf)'], platformsToUse: ['LinkedIn', 'The Lawyer Jobs', 'RollOnFriday Jobs'] },
    eu: { demandIndex: 58, demandTrend: 'stable', salaryRangeUSD: [70, 180], topHiringCities: ['Brussels', 'Frankfurt', 'Paris', 'Luxembourg'], platformsToUse: ['LinkedIn', 'Eurojobs', 'eJobs'] },
    mena: { demandIndex: 66, demandTrend: 'rising', salaryRangeUSD: [80, 200], platformsToUse: ['GulfTalent', 'LinkedIn', 'Bayt.com'] },
  },

  // ─── Consulting ──────────────────────────────────────────────────────────────
  management_consultant: {
    india: { demandIndex: 72, demandTrend: 'rising', salaryRangeINR: [15, 60], topHiringCities: ['Mumbai', 'Delhi NCR', 'Bangalore', 'Hyderabad'], platformsToUse: ['Naukri', 'LinkedIn', 'IIM Jobs'] },
    india_mumbai: { demandIndex: 76, demandTrend: 'rising', salaryRangeINR: [18, 75] },
    us: { demandIndex: 72, demandTrend: 'stable', salaryRangeUSD: [120, 280], topHiringCities: ['New York', 'Chicago', 'Boston', 'San Francisco', 'DC'], platformsToUse: ['LinkedIn', 'Management Consulted job board'] },
    uk: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [80, 200], topHiringCities: ['London'], platformsToUse: ['LinkedIn', 'Management Consulted', 'Consulting Point'] },
    eu: { demandIndex: 65, demandTrend: 'stable', salaryRangeUSD: [70, 180], topHiringCities: ['Frankfurt', 'Amsterdam', 'Brussels', 'Paris'], platformsToUse: ['LinkedIn', 'Management Consulted'] },
    mena: { demandIndex: 68, demandTrend: 'rising', salaryRangeUSD: [75, 180], platformsToUse: ['GulfTalent', 'LinkedIn'] },
    canada: { demandIndex: 66, demandTrend: 'stable', salaryRangeUSD: [90, 190], platformsToUse: ['LinkedIn', 'Indeed CA'] },
  },

  // ─── Pharma / Biotech ────────────────────────────────────────────────────────
  pharmaceutical_scientist: {
    india: { demandIndex: 70, demandTrend: 'rising', salaryRangeINR: [8, 35], topHiringCities: ['Hyderabad (pharma hub)', 'Bangalore', 'Mumbai', 'Ahmedabad'], platformsToUse: ['Naukri', 'LinkedIn', 'Pharma Jobs India'] },
    india_hyderabad: { demandIndex: 78, demandTrend: 'rising', salaryRangeINR: [10, 45], note: 'Genome Valley / Hyderabad is the largest pharma cluster in India' },
    india_ahmedabad: { demandIndex: 70, demandTrend: 'stable', salaryRangeINR: [8, 30], note: 'Major generic pharma cluster (Sun Pharma, Zydus)' },
    us: { demandIndex: 74, demandTrend: 'rising', salaryRangeUSD: [95, 185], topHiringCities: ['Boston/Cambridge', 'San Francisco Bay Area', 'San Diego', 'New Jersey', 'Philadelphia'], platformsToUse: ['LinkedIn', 'BioSpace', 'Pharma Jobs'] },
    eu: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [70, 145], topHiringCities: ['Basel (Novartis/Roche)', 'Dublin', 'Munich', 'Copenhagen'], platformsToUse: ['LinkedIn', 'EuroPharma Jobs'] },
    uk: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [65, 135], platformsToUse: ['LinkedIn', 'New Scientist Jobs', 'Reed Life Sciences'] },
    mena: { demandIndex: 58, demandTrend: 'rising', salaryRangeUSD: [55, 115], platformsToUse: ['GulfTalent', 'Bayt.com'] },
  },

  clinical_trial_manager: {
    india: { demandIndex: 66, demandTrend: 'rising', salaryRangeINR: [10, 35], topHiringCities: ['Hyderabad', 'Bangalore', 'Mumbai', 'Pune'], platformsToUse: ['Naukri', 'LinkedIn', 'CliniqonJobs'] },
    us: { demandIndex: 76, demandTrend: 'rising', salaryRangeUSD: [80, 155], platformsToUse: ['LinkedIn', 'ClinicalTrials.gov careers', 'BioSpace'] },
    eu: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [60, 125], platformsToUse: ['LinkedIn', 'EuroClinical Jobs'] },
    uk: { demandIndex: 70, demandTrend: 'stable', salaryRangeUSD: [55, 120], platformsToUse: ['LinkedIn', 'NHS Jobs', 'New Scientist Jobs'] },
  },

  // ─── Manufacturing / Energy ──────────────────────────────────────────────────
  manufacturing_engineer: {
    india: { demandIndex: 62, demandTrend: 'stable', salaryRangeINR: [5, 20], topHiringCities: ['Pune', 'Chennai', 'Bangalore', 'Gujarat', 'NCR'], platformsToUse: ['Naukri', 'LinkedIn', 'TimesJobs'] },
    india_pune: { demandIndex: 68, demandTrend: 'stable', salaryRangeINR: [6, 22], note: 'Pune is the primary automotive/manufacturing hub in India' },
    us: { demandIndex: 62, demandTrend: 'stable', salaryRangeUSD: [70, 130], topHiringCities: ['Detroit', 'Chicago', 'Houston', 'Nashville'], platformsToUse: ['LinkedIn', 'Indeed', 'SME job board'] },
    eu: { demandIndex: 65, demandTrend: 'stable', salaryRangeUSD: [55, 110], topHiringCities: ['Stuttgart (automotive)', 'Munich', 'Wolfsburg'], platformsToUse: ['LinkedIn', 'Jobware (Germany)', 'StepStone'] },
    mena: { demandIndex: 58, demandTrend: 'rising', salaryRangeUSD: [45, 100], platformsToUse: ['Bayt.com', 'GulfTalent', 'LinkedIn'] },
  },

  petroleum_engineer: {
    us: { demandIndex: 58, demandTrend: 'falling', salaryRangeUSD: [90, 175], topHiringCities: ['Houston', 'Denver', 'Midland TX', 'Oklahoma City'], platformsToUse: ['LinkedIn', 'SPE (Society of Petroleum Engineers) jobs', 'Oil & Gas Job Search'] },
    eu: { demandIndex: 45, demandTrend: 'falling', salaryRangeUSD: [75, 145], topHiringCities: ['Aberdeen (North Sea)', 'Oslo', 'The Hague'], platformsToUse: ['LinkedIn', 'Oil & Gas Job Search', 'SPE'] },
    mena: { demandIndex: 72, demandTrend: 'stable', salaryRangeUSD: [80, 180], topHiringCities: ['Riyadh', 'Abu Dhabi', 'Doha', 'Kuwait City'], platformsToUse: ['GulfTalent', 'Oil & Gas Job Search', 'LinkedIn'] },
    india: { demandIndex: 50, demandTrend: 'falling', salaryRangeINR: [8, 30], platformsToUse: ['Naukri', 'LinkedIn', 'Oil & Gas Job Search'] },
  },

  renewable_energy_engineer: {
    india: { demandIndex: 75, demandTrend: 'rising', salaryRangeINR: [8, 30], topHiringCities: ['Bangalore', 'Chennai', 'Hyderabad', 'Rajasthan (solar projects)', 'Gujarat'], platformsToUse: ['Naukri', 'LinkedIn', 'MNREjobs'] },
    us: { demandIndex: 80, demandTrend: 'rising', salaryRangeUSD: [85, 160], topHiringCities: ['California', 'Texas', 'Colorado', 'Massachusetts'], platformsToUse: ['LinkedIn', 'Indeed', 'CleanTechies.com'] },
    eu: { demandIndex: 82, demandTrend: 'rising', salaryRangeUSD: [65, 135], topHiringCities: ['Denmark (wind)', 'Germany (solar/wind)', 'Netherlands', 'UK offshore'], platformsToUse: ['LinkedIn', 'Green Jobs Network', 'Vestas/Siemens Gamesa careers'] },
    uk: { demandIndex: 78, demandTrend: 'rising', salaryRangeUSD: [65, 130], platformsToUse: ['LinkedIn', 'Green Economy Mark jobs', 'Catapult Energy Systems'] },
    mena: { demandIndex: 72, demandTrend: 'rising', salaryRangeUSD: [60, 130], topHiringCities: ['Saudi Arabia (NEOM/ACWA)', 'UAE', 'Egypt', 'Morocco'], platformsToUse: ['GulfTalent', 'LinkedIn'] },
  },

  // ─── BPO / Customer Support ──────────────────────────────────────────────────
  customer_support_specialist: {
    india: { demandIndex: 65, demandTrend: 'falling', salaryRangeINR: [3, 9], topHiringCities: ['Hyderabad', 'Bangalore', 'Pune', 'Noida', 'Chennai'], platformsToUse: ['Naukri', 'LinkedIn', 'Shine.com'] },
    india_hyderabad: { demandIndex: 68, demandTrend: 'falling', salaryRangeINR: [3, 8], note: 'BPO hub — but AI automation driving demand reduction' },
    us: { demandIndex: 52, demandTrend: 'falling', salaryRangeUSD: [35, 60], platformsToUse: ['Indeed', 'LinkedIn', 'ZipRecruiter'] },
    latam: { demandIndex: 68, demandTrend: 'stable', salaryRangeUSD: [15, 35], note: 'Nearshore BPO demand from US companies remains strong', platformsToUse: ['LinkedIn', 'Computrabajo', 'Workana'] },
    mena: { demandIndex: 58, demandTrend: 'stable', salaryRangeUSD: [18, 40], platformsToUse: ['Bayt.com', 'GulfTalent', 'LinkedIn'] },
  },

  // ─── Government ──────────────────────────────────────────────────────────────
  government_policy_analyst: {
    india: { demandIndex: 52, demandTrend: 'stable', salaryRangeINR: [8, 25], note: 'UPSC and state service exams primary pathway; lateral entry programmes growing', platformsToUse: ['UPSC portal', 'NITI Aayog careers', 'LinkedIn'] },
    us: { demandIndex: 54, demandTrend: 'stable', salaryRangeUSD: [65, 120], topHiringCities: ['Washington DC', 'State capitals'], platformsToUse: ['USAJobs.gov', 'LinkedIn', 'Partnership for Public Service'] },
    uk: { demandIndex: 56, demandTrend: 'stable', salaryRangeUSD: [45, 95], platformsToUse: ['Civil Service Jobs (civilservicejobs.service.gov.uk)', 'LinkedIn'] },
    eu: { demandIndex: 50, demandTrend: 'stable', salaryRangeUSD: [55, 110], topHiringCities: ['Brussels (EU institutions)', 'National capitals'], platformsToUse: ['EU Careers portal (epso.europa.eu)', 'LinkedIn'] },
  },

  // ─── Education ───────────────────────────────────────────────────────────────
  university_professor: {
    india: { demandIndex: 50, demandTrend: 'stable', salaryRangeINR: [8, 30], topHiringCities: ['All major cities with IIT/IIM/Central Universities'], platformsToUse: ['UGC NET portal', 'INSPIRE scheme', 'LinkedIn'] },
    us: { demandIndex: 44, demandTrend: 'falling', salaryRangeUSD: [65, 180], note: 'Academic job market highly competitive; tenure-track positions declining', platformsToUse: ['HigherEdJobs.com', 'Chronicle of Higher Education', 'LinkedIn'] },
    uk: { demandIndex: 48, demandTrend: 'stable', salaryRangeUSD: [55, 120], platformsToUse: ['jobs.ac.uk', 'LinkedIn', 'Times Higher Education jobs'] },
    eu: { demandIndex: 50, demandTrend: 'stable', salaryRangeUSD: [50, 110], platformsToUse: ['jobs.ac.uk (international)', 'EURAXESS', 'LinkedIn'] },
    canada: { demandIndex: 52, demandTrend: 'stable', salaryRangeUSD: [70, 150], platformsToUse: ['HigherEdJobs.com', 'LinkedIn', 'CAUT job board'] },
    aus_nz: { demandIndex: 52, demandTrend: 'stable', salaryRangeUSD: [70, 140], platformsToUse: ['jobs.ac.uk', 'Seek.com.au', 'LinkedIn'] },
  },

  // ─── Media / Creative ────────────────────────────────────────────────────────
  journalist_reporter: {
    india: { demandIndex: 48, demandTrend: 'falling', salaryRangeINR: [3, 15], topHiringCities: ['Mumbai', 'Delhi NCR', 'Bangalore'], platformsToUse: ['LinkedIn', 'Exchange4media Jobs', 'Naukri'] },
    us: { demandIndex: 40, demandTrend: 'falling', salaryRangeUSD: [40, 90], platformsToUse: ['LinkedIn', 'Journalism Jobs', 'Ed2010 (digital)'] },
    uk: { demandIndex: 44, demandTrend: 'falling', salaryRangeUSD: [30, 75], platformsToUse: ['LinkedIn', 'Hold The Front Page', 'Guardian Jobs'] },
  },

  // ─── Hospitality ─────────────────────────────────────────────────────────────
  hotel_general_manager: {
    india: { demandIndex: 58, demandTrend: 'stable', salaryRangeINR: [15, 50], topHiringCities: ['Mumbai', 'Delhi', 'Goa', 'Bangalore', 'Hyderabad'], platformsToUse: ['Naukri', 'LinkedIn', 'Hozpitality'] },
    us: { demandIndex: 60, demandTrend: 'stable', salaryRangeUSD: [70, 140], platformsToUse: ['LinkedIn', 'Hcareers', 'Hospitality Online'] },
    eu: { demandIndex: 58, demandTrend: 'stable', salaryRangeUSD: [60, 120], platformsToUse: ['LinkedIn', 'HotelCareer', 'Caterer.com'] },
    mena: { demandIndex: 68, demandTrend: 'rising', salaryRangeUSD: [65, 140], topHiringCities: ['Dubai', 'Abu Dhabi', 'Doha', 'Riyadh'], platformsToUse: ['GulfTalent', 'Hcareers', 'LinkedIn'] },
    aus_nz: { demandIndex: 60, demandTrend: 'stable', salaryRangeUSD: [60, 120], platformsToUse: ['Seek.com.au', 'Hcareers', 'LinkedIn'] },
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get regional demand entry for a specific role + region. Returns null if not mapped. */
export function getRegionalDemand(roleKey: string, region: RegionKey): RegionalDemandEntry | null {
  return ROLE_REGIONAL_DEMAND[roleKey]?.[region] ?? null;
}

/** Get full regional profile for a role (all regions). */
export function getFullRegionalProfile(roleKey: string): RoleRegionalProfile | null {
  return ROLE_REGIONAL_DEMAND[roleKey] ?? null;
}

/** Get India-specific entry (aggregated), falling back to 'india' key if sub-city not mapped. */
export function getIndiaDemand(roleKey: string, subRegion?: string): RegionalDemandEntry | null {
  const profile = ROLE_REGIONAL_DEMAND[roleKey];
  if (!profile) return null;
  if (subRegion && profile[subRegion as RegionKey]) return profile[subRegion as RegionKey]!;
  return profile['india'] ?? null;
}

/** Get salary range in INR Lakhs for a role + India sub-region. Returns null if not mapped. */
export function getInrSalaryRange(roleKey: string, subRegion?: string): [number, number] | null {
  const entry = getIndiaDemand(roleKey, subRegion);
  return entry?.salaryRangeINR ?? null;
}

/** Get salary range in USD thousands for a role + region. Returns null if not mapped. */
export function getUsdSalaryRange(roleKey: string, region: RegionKey): [number, number] | null {
  const entry = getRegionalDemand(roleKey, region);
  return entry?.salaryRangeUSD ?? null;
}

/** List all roles that have regional demand data. */
export function listRolesWithRegionalData(): string[] {
  return Object.keys(ROLE_REGIONAL_DEMAND);
}

/** Get recommended job platforms for a role + region. */
export function getJobPlatforms(roleKey: string, region: RegionKey): string[] {
  return ROLE_REGIONAL_DEMAND[roleKey]?.[region]?.platformsToUse ?? [];
}
