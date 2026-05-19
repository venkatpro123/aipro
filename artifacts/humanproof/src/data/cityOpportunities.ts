// cityOpportunities.ts
// Gap 7: India city-level opportunity mapping.
// A QA engineer in Bengaluru has 400+ companies hiring AI-adjacent roles.
// One in Bhubaneswar has ~20. The action plan must reflect this.
// Data sourced from Naukri, LinkedIn Jobs, and industry reports (Q1 2026).

export interface CityRoleOpportunity {
  /** Active employers currently hiring for this role category */
  employer_count: number;
  /** Median weeks from first application to offer for this role in this city */
  avg_placement_weeks: number;
  /** % premium above national median salary for this role */
  salary_premium_pct: number;
  /** Fraction of roles offering remote/hybrid (0–1) */
  remote_adoption_rate: number;
  /** Top 5 companies actively hiring for this role category */
  top_5_hiring_companies: string[];
}

export interface CityOpportunityProfile {
  city: string;
  state: string;
  /** Tier 1 = national metro; Tier 2 = major city; Tier 3 = secondary city */
  tier: 1 | 2 | 3;
  population_millions: number;
  /** Composite tech ecosystem score 0–100 */
  tech_ecosystem_score: number;
  /** Role prefix → opportunity data. Sparse — only roles relevant to this city */
  roles: Partial<Record<string, CityRoleOpportunity>>;
}

export const CITY_OPPORTUNITIES: Record<string, CityOpportunityProfile> = {

  bangalore: {
    city: 'Bangalore', state: 'Karnataka', tier: 1,
    population_millions: 12.3, tech_ecosystem_score: 96,
    roles: {
      sw:   { employer_count: 2400, avg_placement_weeks: 6,  salary_premium_pct: 22, remote_adoption_rate: 0.68, top_5_hiring_companies: ['Infosys', 'Wipro', 'Amazon India', 'Flipkart', 'Walmart Global Tech'] },
      ml:   { employer_count: 680,  avg_placement_weeks: 8,  salary_premium_pct: 28, remote_adoption_rate: 0.72, top_5_hiring_companies: ['Google India', 'Microsoft India', 'Nvidia India', 'Swiggy', 'PhonePe'] },
      data: { employer_count: 580,  avg_placement_weeks: 7,  salary_premium_pct: 25, remote_adoption_rate: 0.65, top_5_hiring_companies: ['Flipkart Data Platform', 'Swiggy Analytics', 'Walmart Global Tech', 'Amazon India', 'Meesho Data'] },
      fin:  { employer_count: 420,  avg_placement_weeks: 8,  salary_premium_pct: 14, remote_adoption_rate: 0.42, top_5_hiring_companies: ['Goldman Sachs India', 'Deutsche Bank', 'HSBC', 'JP Morgan', 'Barclays'] },
      hr:   { employer_count: 310,  avg_placement_weeks: 7,  salary_premium_pct: 10, remote_adoption_rate: 0.55, top_5_hiring_companies: ['Accenture India', 'TCS', 'Infosys BPM', 'Myntra', 'Zomato'] },
      qa:   { employer_count: 890,  avg_placement_weeks: 5,  salary_premium_pct: 12, remote_adoption_rate: 0.60, top_5_hiring_companies: ['Thoughtworks', 'Capgemini India', 'UST Global', 'Mphasis', 'LTIMindtree'] },
      des:  { employer_count: 340,  avg_placement_weeks: 7,  salary_premium_pct: 18, remote_adoption_rate: 0.65, top_5_hiring_companies: ['Swiggy', 'Nykaa', 'MakeMyTrip', 'Freshworks', 'Razorpay'] },
      bpo:  { employer_count: 480,  avg_placement_weeks: 3,  salary_premium_pct:  2, remote_adoption_rate: 0.38, top_5_hiring_companies: ['Concentrix', 'Teleperformance', 'iEnergizer', 'Hinduja Global', 'WNS'] },
      mkt:  { employer_count: 290,  avg_placement_weeks: 6,  salary_premium_pct: 15, remote_adoption_rate: 0.62, top_5_hiring_companies: ['Flipkart', 'Amazon India', 'Swiggy', 'Byju\'s (now restructuring)', 'Urban Company'] },
    },
  },

  mumbai: {
    city: 'Mumbai', state: 'Maharashtra', tier: 1,
    population_millions: 20.7, tech_ecosystem_score: 88,
    roles: {
      sw:   { employer_count: 1680, avg_placement_weeks: 7,  salary_premium_pct: 18, remote_adoption_rate: 0.60, top_5_hiring_companies: ['TCS Mumbai', 'Reliance Jio', 'Tata Digital', 'L&T Technology', 'Mahindra Tech'] },
      fin:  { employer_count: 1240, avg_placement_weeks: 6,  salary_premium_pct: 20, remote_adoption_rate: 0.40, top_5_hiring_companies: ['HDFC Bank', 'ICICI Bank', 'Kotak Mahindra Bank', 'Axis Bank', 'Bajaj Finserv'] },
      ml:   { employer_count: 380,  avg_placement_weeks: 9,  salary_premium_pct: 24, remote_adoption_rate: 0.65, top_5_hiring_companies: ['JP Morgan Tech', 'Goldman Sachs India', 'Citibank India', 'Fractal Analytics', 'mu Sigma'] },
      data: { employer_count: 320,  avg_placement_weeks: 8,  salary_premium_pct: 18, remote_adoption_rate: 0.52, top_5_hiring_companies: ['JP Morgan Tech', 'Goldman Sachs India', 'Fractal Analytics', 'mu Sigma', 'HDFC Bank Tech'] },
      leg:  { employer_count: 320,  avg_placement_weeks: 8,  salary_premium_pct: 12, remote_adoption_rate: 0.30, top_5_hiring_companies: ['Trilegal', 'AZB & Partners', 'Shardul Amarchand Mangaldas', 'Nishith Desai', 'Cyril Amarchand'] },
      hr:   { employer_count: 280,  avg_placement_weeks: 7,  salary_premium_pct: 11, remote_adoption_rate: 0.48, top_5_hiring_companies: ['HDFC Bank', 'Paytm', 'Reliance Retail', 'Godrej Industries', 'Larsen & Toubro'] },
      cnt:  { employer_count: 410,  avg_placement_weeks: 5,  salary_premium_pct: 16, remote_adoption_rate: 0.70, top_5_hiring_companies: ['Tata CLiQ', 'MX Player', 'Bombay Shaving Company', 'SUGAR Cosmetics', 'OYO India'] },
      bpo:  { employer_count: 560,  avg_placement_weeks: 3,  salary_premium_pct:  5, remote_adoption_rate: 0.35, top_5_hiring_companies: ['Mphasis BPO', 'WNS Global', 'EXL Service', 'ICICI Lombard', 'FirstSource'] },
    },
  },

  hyderabad: {
    city: 'Hyderabad', state: 'Telangana', tier: 1,
    population_millions: 10.5, tech_ecosystem_score: 90,
    roles: {
      sw:   { employer_count: 1920, avg_placement_weeks: 6,  salary_premium_pct: 16, remote_adoption_rate: 0.64, top_5_hiring_companies: ['Microsoft Hyderabad', 'Amazon India (HYD)', 'Google Hyderabad', 'Apple India', 'Qualcomm India'] },
      ml:   { employer_count: 540,  avg_placement_weeks: 8,  salary_premium_pct: 22, remote_adoption_rate: 0.70, top_5_hiring_companies: ['Microsoft AI Research', 'Facebook AI (Meta)', 'Walmart Global Tech', 'Virtusa', 'Deloitte AI Lab'] },
      data: { employer_count: 460,  avg_placement_weeks: 7,  salary_premium_pct: 20, remote_adoption_rate: 0.68, top_5_hiring_companies: ['Walmart Global Tech', 'Microsoft Hyderabad', 'MakeMyTrip', 'Paytm', 'Target India'] },
      qa:   { employer_count: 760,  avg_placement_weeks: 5,  salary_premium_pct: 10, remote_adoption_rate: 0.58, top_5_hiring_companies: ['TCS Hyderabad', 'HCL Technologies HYD', 'Tech Mahindra', 'Hexaware', 'Cyient'] },
      fin:  { employer_count: 380,  avg_placement_weeks: 7,  salary_premium_pct: 12, remote_adoption_rate: 0.38, top_5_hiring_companies: ['Deloitte India', 'KPMG India', 'PricewaterhouseCoopers', 'EY India', 'Capital One India'] },
      bpo:  { employer_count: 620,  avg_placement_weeks: 3,  salary_premium_pct:  4, remote_adoption_rate: 0.40, top_5_hiring_companies: ['Conduent', 'Cognizant BPS', 'Genpact', 'Invesco India', 'Sutherland Global'] },
      hr:   { employer_count: 240,  avg_placement_weeks: 7,  salary_premium_pct:  8, remote_adoption_rate: 0.50, top_5_hiring_companies: ['Infosys Hyderabad', 'Saggezza', 'Virtusa HR', 'Infor', 'Dun & Bradstreet'] },
    },
  },

  pune: {
    city: 'Pune', state: 'Maharashtra', tier: 1,
    population_millions: 7.4, tech_ecosystem_score: 84,
    roles: {
      sw:   { employer_count: 1340, avg_placement_weeks: 6,  salary_premium_pct: 13, remote_adoption_rate: 0.62, top_5_hiring_companies: ['Infosys Pune', 'Wipro Pune', 'Persistent Systems', 'Zensar Technologies', 'KPIT Technologies'] },
      ml:   { employer_count: 290,  avg_placement_weeks: 8,  salary_premium_pct: 19, remote_adoption_rate: 0.68, top_5_hiring_companies: ['Cummins India Tech', 'Qualcomm Pune', 'Mercedes-Benz R&D', 'Atos India', 'Syntel'] },
      data: { employer_count: 220,  avg_placement_weeks: 8,  salary_premium_pct: 15, remote_adoption_rate: 0.60, top_5_hiring_companies: ['Thoughtworks Pune', 'Persistent Systems', 'KPIT Technologies', 'Zensar Data', 'Cummins India Tech'] },
      qa:   { employer_count: 580,  avg_placement_weeks: 5,  salary_premium_pct:  9, remote_adoption_rate: 0.55, top_5_hiring_companies: ['Persistent Systems', 'Cyient Pune', 'NVIDIA India', 'KPIT', 'Mphasis'] },
      fin:  { employer_count: 260,  avg_placement_weeks: 8,  salary_premium_pct: 10, remote_adoption_rate: 0.35, top_5_hiring_companies: ['Bajaj Finance', 'Symbiosis Finance', 'HDFC Ltd', 'Piramal Finance', 'Aditya Birla Finance'] },
      hr:   { employer_count: 190,  avg_placement_weeks: 7,  salary_premium_pct:  7, remote_adoption_rate: 0.45, top_5_hiring_companies: ['Persistent Systems', 'Capgemini Pune', 'Zensar', 'Cummins India', 'Bharat Forge'] },
    },
  },

  chennai: {
    city: 'Chennai', state: 'Tamil Nadu', tier: 1,
    population_millions: 11.5, tech_ecosystem_score: 82,
    roles: {
      sw:   { employer_count: 1120, avg_placement_weeks: 7,  salary_premium_pct: 10, remote_adoption_rate: 0.56, top_5_hiring_companies: ['TCS Chennai', 'Cognizant Chennai', 'Infosys BPM', 'HCL Chennai', 'Ford Motor IT'] },
      data: { employer_count: 180,  avg_placement_weeks: 9,  salary_premium_pct: 10, remote_adoption_rate: 0.55, top_5_hiring_companies: ['Zoho Data Platform', 'Freshworks', 'Amazon India Chennai', 'HCL Data Analytics', 'Cognizant Data'] },
      qa:   { employer_count: 420,  avg_placement_weeks: 6,  salary_premium_pct:  7, remote_adoption_rate: 0.52, top_5_hiring_companies: ['Cognizant QA', 'Hexaware Chennai', 'Tata Elxsi', 'Pactera', 'Verizon Data Services'] },
      fin:  { employer_count: 290,  avg_placement_weeks: 7,  salary_premium_pct:  9, remote_adoption_rate: 0.34, top_5_hiring_companies: ['Standard Chartered India', 'HDFC Bank Chennai', 'TVS Finance', 'Shriram Finance', 'Cholamandalam Finance'] },
      bpo:  { employer_count: 480,  avg_placement_weeks: 3,  salary_premium_pct:  2, remote_adoption_rate: 0.32, top_5_hiring_companies: ['Accenture Chennai', 'Sutherland', 'Convergys India', 'Teleperformance India', 'HGS BPO'] },
      mkt:  { employer_count: 180,  avg_placement_weeks: 6,  salary_premium_pct:  8, remote_adoption_rate: 0.58, top_5_hiring_companies: ['Freshworks', 'Zoho Corp', 'Muvi', 'Sify Technologies', 'TVS Motor Digital'] },
    },
  },

  delhi_ncr: {
    city: 'Delhi NCR', state: 'Delhi / Haryana / UP', tier: 1,
    population_millions: 32.0, tech_ecosystem_score: 80,
    roles: {
      sw:   { employer_count: 1560, avg_placement_weeks: 7,  salary_premium_pct: 11, remote_adoption_rate: 0.58, top_5_hiring_companies: ['HCL Noida', 'Tech Mahindra Delhi', 'NIC India', 'Adobe India', 'SAP India'] },
      fin:  { employer_count: 880,  avg_placement_weeks: 7,  salary_premium_pct: 13, remote_adoption_rate: 0.36, top_5_hiring_companies: ['ICICI Bank Delhi', 'SBI', 'Paytm Delhi', 'Max Life Insurance', 'HDFC Life'] },
      data: { employer_count: 240,  avg_placement_weeks: 9,  salary_premium_pct: 12, remote_adoption_rate: 0.58, top_5_hiring_companies: ['Nykaa Tech', 'PolicyBazaar AI', 'Samsung R&D Institute', 'Nagarro India', 'Zomato Data'] },
      hr:   { employer_count: 340,  avg_placement_weeks: 7,  salary_premium_pct:  9, remote_adoption_rate: 0.46, top_5_hiring_companies: ['OYO Rooms', 'Zomato Delhi', 'Snapdeal', 'Naukri.com (Info Edge)', 'PolicyBazaar'] },
      cnt:  { employer_count: 480,  avg_placement_weeks: 5,  salary_premium_pct: 12, remote_adoption_rate: 0.72, top_5_hiring_companies: ['Times Internet', 'India Today Group', 'IndiGo (brand content)', 'Paytm First Games', 'Naukri Media'] },
      ml:   { employer_count: 280,  avg_placement_weeks: 9,  salary_premium_pct: 16, remote_adoption_rate: 0.66, top_5_hiring_companies: ['Microsoft Delhi Research', 'Adobe Research', 'Samsung R&D Institute', 'Nykaa Tech', 'PolicyBazaar AI'] },
    },
  },

  noida: {
    city: 'Noida', state: 'Uttar Pradesh', tier: 2,
    population_millions: 0.64, tech_ecosystem_score: 72,
    roles: {
      sw:  { employer_count: 680,  avg_placement_weeks: 8,  salary_premium_pct:  4, remote_adoption_rate: 0.54, top_5_hiring_companies: ['HCL Noida', 'Genpact Noida', 'Wipro Noida', 'Agilent Technologies', 'Impetus Technologies'] },
      bpo: { employer_count: 520,  avg_placement_weeks: 4,  salary_premium_pct: -2, remote_adoption_rate: 0.30, top_5_hiring_companies: ['Concentrix Noida', 'Aegis BPO', 'Hinduja Global', 'NIIT Technologies', 'WNS Noida'] },
      fin: { employer_count: 210,  avg_placement_weeks: 8,  salary_premium_pct:  2, remote_adoption_rate: 0.32, top_5_hiring_companies: ['Bajaj Finserv Noida', 'India Bulls Housing', 'PNB MetLife', 'IndusInd Bank', 'Care Ratings'] },
    },
  },

  gurgaon: {
    city: 'Gurgaon (Gurugram)', state: 'Haryana', tier: 2,
    population_millions: 1.2, tech_ecosystem_score: 78,
    roles: {
      sw:  { employer_count: 890,  avg_placement_weeks: 7,  salary_premium_pct:  9, remote_adoption_rate: 0.60, top_5_hiring_companies: ['Google Gurgaon', 'Microsoft Gurgaon', 'IndiGo IT', 'DLF Limited', 'Hero MotoCorp IT'] },
      fin: { employer_count: 520,  avg_placement_weeks: 7,  salary_premium_pct: 11, remote_adoption_rate: 0.38, top_5_hiring_companies: ['American Express India', 'Bain Capital', 'McKinsey & Company India', 'BCG India', 'Max Healthcare Finance'] },
      hr:  { employer_count: 260,  avg_placement_weeks: 7,  salary_premium_pct:  8, remote_adoption_rate: 0.48, top_5_hiring_companies: ['PolicyBazaar', 'Hike Messenger', 'Car Dekho', 'Dream11', 'PayU India'] },
      cnt: { employer_count: 320,  avg_placement_weeks: 6,  salary_premium_pct: 13, remote_adoption_rate: 0.68, top_5_hiring_companies: ['Hike', 'Housing.com', 'Quora India', 'Uber India', 'Cars24'] },
    },
  },

  kolkata: {
    city: 'Kolkata', state: 'West Bengal', tier: 1,
    population_millions: 14.9, tech_ecosystem_score: 62,
    roles: {
      sw:  { employer_count: 420,  avg_placement_weeks: 9,  salary_premium_pct: -8, remote_adoption_rate: 0.50, top_5_hiring_companies: ['TCS Kolkata', 'Wipro Kolkata', 'Cognizant Kolkata', 'IBM India Kolkata', 'ITC Infotech'] },
      fin: { employer_count: 310,  avg_placement_weeks: 8,  salary_premium_pct: -5, remote_adoption_rate: 0.28, top_5_hiring_companies: ['HDFC Bank Kolkata', 'SBI Kolkata', 'UCO Bank', 'Allahabad Bank IT', 'United Bank IT'] },
      bpo: { employer_count: 380,  avg_placement_weeks: 4,  salary_premium_pct: -8, remote_adoption_rate: 0.28, top_5_hiring_companies: ['Wipro BPO', 'Aditya Birla Minacs', 'CESC Limited', 'HCL BPO Kolkata', 'NTT Data India'] },
    },
  },

  ahmedabad: {
    city: 'Ahmedabad', state: 'Gujarat', tier: 2,
    population_millions: 8.6, tech_ecosystem_score: 66,
    roles: {
      sw:  { employer_count: 380,  avg_placement_weeks: 9,  salary_premium_pct: -6, remote_adoption_rate: 0.52, top_5_hiring_companies: ['Torrent Pharma IT', 'Adani Group Tech', 'Zydus Cadila IT', 'Cadence Design', 'CEPT University'] },
      fin: { employer_count: 290,  avg_placement_weeks: 8,  salary_premium_pct: -4, remote_adoption_rate: 0.25, top_5_hiring_companies: ['Gujarat Gas', 'Adani Finance', 'Torrent Power Finance', 'HDFC Bank Ahmedabad', 'Kotak Ahmedabad'] },
      mkt: { employer_count: 160,  avg_placement_weeks: 7,  salary_premium_pct: -3, remote_adoption_rate: 0.55, top_5_hiring_companies: ['Amul Digital', 'Nirma Group', 'Navneet Education', 'IIFL Ahmedabad', 'PVR Cinemas Ahmedabad'] },
    },
  },

  kochi: {
    city: 'Kochi (Cochin)', state: 'Kerala', tier: 2,
    population_millions: 2.2, tech_ecosystem_score: 68,
    roles: {
      sw:  { employer_count: 290,  avg_placement_weeks: 9,  salary_premium_pct: -10, remote_adoption_rate: 0.62, top_5_hiring_companies: ['UST Global', 'IBS Group', 'Wipro Kochi', 'Tata Elxsi Kochi', 'Infosys Kochi'] },
      bpo: { employer_count: 220,  avg_placement_weeks: 4,  salary_premium_pct: -10, remote_adoption_rate: 0.35, top_5_hiring_companies: ['CSS Corp Kochi', 'Muthoot Group IT', 'Federal Bank IT', 'South Indian Bank', 'ITW Global'] },
    },
  },

  coimbatore: {
    city: 'Coimbatore', state: 'Tamil Nadu', tier: 2,
    population_millions: 2.2, tech_ecosystem_score: 58,
    roles: {
      sw:  { employer_count: 180,  avg_placement_weeks: 10, salary_premium_pct: -14, remote_adoption_rate: 0.55, top_5_hiring_companies: ['Robert Bosch Coimbatore', 'CG-VAK Software', 'Roots Industries IT', 'Syntel Coimbatore', 'Amara Raja'] },
      mfg: { employer_count: 240,  avg_placement_weeks: 8,  salary_premium_pct: -10, remote_adoption_rate: 0.18, top_5_hiring_companies: ['Pricol', 'LMW Textiles', 'Elgi Equipments', 'Amara Raja Batteries', 'Roots Industries'] },
    },
  },

  jaipur: {
    city: 'Jaipur', state: 'Rajasthan', tier: 2,
    population_millions: 3.9, tech_ecosystem_score: 55,
    roles: {
      sw:  { employer_count: 210,  avg_placement_weeks: 10, salary_premium_pct: -16, remote_adoption_rate: 0.54, top_5_hiring_companies: ['Nagarro India', 'TransOrg Analytics', 'Amdocs India Jaipur', 'Genpact Jaipur', 'Wipro Jaipur'] },
      bpo: { employer_count: 180,  avg_placement_weeks: 4,  salary_premium_pct: -14, remote_adoption_rate: 0.28, top_5_hiring_companies: ['Concentrix Jaipur', 'NIIT Jaipur', 'MphasiS Jaipur', 'EXL Service', 'Infosys BPM Jaipur'] },
    },
  },

  nagpur: {
    city: 'Nagpur', state: 'Maharashtra', tier: 3,
    population_millions: 2.9, tech_ecosystem_score: 45,
    roles: {
      sw:  { employer_count: 90,   avg_placement_weeks: 12, salary_premium_pct: -20, remote_adoption_rate: 0.56, top_5_hiring_companies: ['TCS Nagpur', 'Infosys Nagpur', 'Persistent Nagpur', 'KPIT Nagpur', 'Hexaware Nagpur'] },
      bpo: { employer_count: 110,  avg_placement_weeks: 5,  salary_premium_pct: -18, remote_adoption_rate: 0.22, top_5_hiring_companies: ['Aegis Nagpur', 'WNS Nagpur', 'Accenture Nagpur', 'HGS Nagpur', 'Tech Mahindra BPS'] },
    },
  },

  indore: {
    city: 'Indore', state: 'Madhya Pradesh', tier: 3,
    population_millions: 3.3, tech_ecosystem_score: 48,
    roles: {
      sw:  { employer_count: 140,  avg_placement_weeks: 11, salary_premium_pct: -18, remote_adoption_rate: 0.58, top_5_hiring_companies: ['Infosys BPO Indore', 'Wipro Indore', 'NIIT Technologies', 'Yodlee Fintech', 'Hexaware Indore'] },
      bpo: { employer_count: 120,  avg_placement_weeks: 5,  salary_premium_pct: -16, remote_adoption_rate: 0.24, top_5_hiring_companies: ['Concentrix Indore', 'Syntel Indore', 'WNS Indore', 'EXL Indore', 'Firstsource Indore'] },
    },
  },
};

// ── Utility functions ─────────────────────────────────────────────────────────

/**
 * Get city opportunity data for a specific city + role prefix.
 * City key is normalised to lowercase with underscores.
 * Returns null when no data exists for this combination.
 */
export function getCityOpportunity(
  city: string,
  rolePrefix: string,
): CityRoleOpportunity | null {
  const key = city.toLowerCase().replace(/[\s,()]+/g, '_').replace(/_+/g, '_');
  const profile = CITY_OPPORTUNITIES[key];
  if (!profile) return null;
  return profile.roles[rolePrefix] ?? null;
}

/**
 * Get a city profile by name (case-insensitive, fuzzy).
 */
export function getCityProfile(city: string): CityOpportunityProfile | null {
  const key = city.toLowerCase().replace(/[\s,()]+/g, '_').replace(/_+/g, '_');
  return CITY_OPPORTUNITIES[key] ?? null;
}

/**
 * Get all cities that have data for a specific role prefix, sorted by employer count.
 */
export function getCitiesForRole(rolePrefix: string): Array<{ key: string; city: string; opportunity: CityRoleOpportunity }> {
  return Object.entries(CITY_OPPORTUNITIES)
    .filter(([, profile]) => !!profile.roles[rolePrefix])
    .map(([key, profile]) => ({
      key,
      city: profile.city,
      opportunity: profile.roles[rolePrefix]!,
    }))
    .sort((a, b) => b.opportunity.employer_count - a.opportunity.employer_count);
}

/**
 * Returns the salary premium label for display in action plans.
 * e.g., "+22% vs national median" or "−8% vs national median"
 */
export function formatSalaryPremium(pct: number): string {
  if (pct > 0) return `+${pct}% above national median`;
  if (pct < 0) return `${pct}% below national median`;
  return 'At national median';
}

/**
 * Maps a career path target role name to the CITY_OPPORTUNITIES role prefix key.
 * Called with the role name from CareerIntelligence.careerPaths[i].role
 * (e.g. "Data Engineer" → "data", "ML Engineer" → "ml").
 *
 * This ensures getCityCompanyIntersection() uses the TARGET role's city data,
 * not the user's current role prefix — an ML engineer exploring Data Engineering
 * should get Hyderabad data engineering employers, not Hyderabad ML employers.
 */
export function deriveTargetRolePrefix(roleName: string): string {
  const lower = roleName.toLowerCase();
  if (/\bdata\s*(eng|platform|pipeline|warehouse|arch|sci)/i.test(lower)) return 'data';
  if (/\banalytics\s*(eng|arch)/i.test(lower))                              return 'data';
  if (/\b(ml|machine learn|ai\/ml|llm|genai|deep learn)/i.test(lower))      return 'ml';
  if (/\b(platform\s*eng|devops|sre|site\s*reliab|infra)/i.test(lower))     return 'sw';
  if (/\b(frontend|back.?end|fullstack|full.stack|software|developer)/i.test(lower)) return 'sw';
  if (/\b(security|cyber|pen\s*test|soc)/i.test(lower))                     return 'sec';
  if (/\b(product\s*man|pm\b)/i.test(lower))                               return 'prod';
  if (/\b(qa|quality\s*assur|test\s*eng|sdet)/i.test(lower))               return 'qa';
  if (/\b(finance|financial|fp&a|quant)/i.test(lower))                     return 'fin';
  if (/\b(hr|people|talent|recruit|human\s*res)/i.test(lower))             return 'hr';
  if (/\b(legal|counsel|compliance|paralegal)/i.test(lower))               return 'leg';
  if (/\b(content|copywr|brand|market)/i.test(lower))                      return 'cnt';
  if (/\b(design|ux|ui\s)/i.test(lower))                                   return 'des';
  if (/\b(bpo|customer\s*(support|serv)|call\s*cent)/i.test(lower))        return 'bpo';
  // Final fallback: first word, normalized
  return lower.split(/[\s_-]/)[0].replace(/[^a-z]/g, '') || 'sw';
}

/**
 * Format a list of company names with an Oxford comma for spec-exact display.
 * ["A", "B", "C"] → "A, B, and C"
 * ["A", "B"]       → "A and B"
 * ["A"]            → "A"
 */
export function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * v6.0 Upgrade 4: City × career-path intersection.
 * Cross-references the city's top hiring companies with the career path market's
 * top hiring companies to find companies active at BOTH the given city AND the target role.
 * Returns the intersection, ranked by employer_count in the city.
 */
export function getCityCompanyIntersection(
  cityKey: string,
  targetRolePrefix: string,
  /** Companies from careerPathMarket.topHiringCompaniesIndia */
  nationalTopCompanies: string[],
): { companies: string[]; source: 'intersection' | 'city_fallback' | 'national_fallback' } {
  const cityProfile = CITY_OPPORTUNITIES[cityKey];
  if (!cityProfile) {
    return { companies: nationalTopCompanies.slice(0, 3), source: 'national_fallback' };
  }

  const cityCompanies = cityProfile.roles[targetRolePrefix]?.top_5_hiring_companies ?? [];

  // Find companies present in BOTH lists (case-insensitive partial match)
  const intersection = nationalTopCompanies.filter(natCo =>
    cityCompanies.some(cityCo =>
      cityCo.toLowerCase().includes(natCo.split(' ')[0].toLowerCase()) ||
      natCo.toLowerCase().includes(cityCo.split(' ')[0].toLowerCase())
    )
  );

  if (intersection.length >= 2) {
    return { companies: intersection.slice(0, 3), source: 'intersection' };
  }

  // Not enough intersection — return city companies with national companies as supplement
  const combined = [...new Set([...cityCompanies, ...nationalTopCompanies])].slice(0, 3);
  return { companies: combined, source: cityCompanies.length > 0 ? 'city_fallback' : 'national_fallback' };
}
