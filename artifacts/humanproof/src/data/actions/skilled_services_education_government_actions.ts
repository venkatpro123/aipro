// skilled_services_education_government_actions.ts — v38.0 Phase 4B
// 18 roles spanning skilled labor specialties (auto, heavy equipment, crane, locksmith, diver,
// arborist), personal services + wellness (PT, RD, LMT, hairstylist, wedding, funeral), education
// specialties (SPED, NCAA D1 coach, athletic trainer), and government specialties (tax CPA, FSO, CBP).
// All roles share an extremely low AI-substitution profile (0.03-0.18) because the work is either
// physically embodied, relationally trust-bound, or sovereignty-bound (federal authority).

type BracketPool = Record<string, Record<string, Array<{ title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string }>>>;

function pool(
  jc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  mc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  sc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  h: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  m: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
): BracketPool {
  return {
    junior:    { critical: [jc], high: [h], moderate: [m], low: [m] },
    mid:       { critical: [mc], high: [h], moderate: [m], low: [m] },
    senior:    { critical: [sc], high: [h], moderate: [m], low: [m] },
    principal: { critical: [sc], high: [h], moderate: [m], low: [m] },
  };
}

const A_TRADES_GENERIC: BracketPool = pool(
  { title: 'Join Your Trade Association + Local Union Hall', description: 'For union trades (IUOE Local for heavy equipment, IBEW for electrical, UA for plumbing/HVAC, OPCMIA, Operating Engineers), the local union hall is where high-paying journeyman work is dispatched. Non-union: join the AGC, ABC, NCCER alumni network, or trade-specific guild. Attend the next monthly meeting in person. Senior tradesmen at the hall control referrals to the highest-paying private sector and federal Davis-Bacon work.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
  { title: 'Document Your Hours + Certifications in a Portable Logbook', description: 'OSHA 30, NCCER Core + craft, manufacturer-specific certs (Cat, Komatsu, Genie), and state licensure all need to be portable. Maintain a digital + physical logbook with hours, employer attestation, and renewal dates. This is the single most important defense against credential lapses during a job transition. Use the Bluebeam or Procore Field app, or simple Notion template.', layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue Specialty Endorsements That Add $8-$15/Hour', description: 'In skilled trades, specialty endorsements (NCCCO for crane, CDL with hazmat for material delivery, confined-space rescue, signal person, rigger) each add $5-$15/hour and dramatically increase resilience during downturns. Pick 1 endorsement aligned to your trade and schedule the exam this quarter. Most cost $300-$900 + ~40 hours of study.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days — register now', priority: 'High' },
  { title: 'Build a 6-Month Tool Reserve + Vehicle Maintenance Buffer', description: 'Skilled trades layoffs hit hardest when tool loans default or work trucks fail mid-jobsite. Maintain a 6-month tool replacement reserve and a service-due truck. Many master tradesmen lose their employability not from skill but from broken essential gear. The reserve also funds a smooth gap between jobs.', layerFocus: 'L3 · Financial', riskReductionPct: 16, deadline: '90 days', priority: 'Medium' },
  { title: 'Photograph + Geotag Every Major Job for Your Portfolio', description: 'Trade portfolios drive premium private and commercial referrals. Use a simple phone camera with location tags to document jobs — before/after photos, callouts of difficulty, signed customer permission. After 50 jobs documented, your portfolio is the #1 driver of premium-rate inbound work at $25-$50/hour above scale wages.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

const A_PERSONAL_SERVICES: BracketPool = pool(
  { title: 'Build Your Own Client List Outside Your Employer', description: 'In personal services (PT, massage, salon, wellness), client portability is everything. Even when employed at a gym/spa/salon, build a private client list (with permission per non-compete terms) — newsletter, retention contacts, referral history. Most personal service contracts permit independent client books. This list is your single biggest layoff insulator.', layerFocus: 'L4 · Network', riskReductionPct: 22, deadline: '30 days', priority: 'High' },
  { title: 'Earn a Specialty Certification That Doubles Your Hourly Rate', description: 'In personal services, specialty certifications (NASM CES corrective exercise, FMS, ART for massage, color specialist for salon, sports nutrition CISSN, hospice for funeral) command $50-$150/session rate premiums. Pick one specialty in adjacent demand and book the cert exam this quarter — typical cost $400-$1,200.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
  { title: 'Register on Premium Platforms (Trainerize, Mindbody, Booksy)', description: 'Premium booking platforms (Trainerize for PTs, Mindbody for wellness, Booksy/Square for salons, GigSalad for event services) give clients direct booking access and own the trust layer. Top performers earn 60-80% of revenue independent of their employer through these platforms.', layerFocus: 'L3 · Visibility', riskReductionPct: 18, deadline: '14 days', priority: 'High' },
  { title: 'Establish 1099 Side Practice to 30% of Income', description: 'Most personal services contracts permit 1099 side work (verify your specific agreement). Build a side practice to 25-30% of total income — this is layoff insulation without the risks of full self-employment. Use a CPA familiar with self-employed personal services to optimize Schedule C deductions.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 20, deadline: '90 days', priority: 'High' },
  { title: 'Document Outcomes (Photos, Reviews, Testimonials)', description: 'Documented outcomes (transformation photos, Google reviews, written testimonials) are the personal services equivalent of a portfolio. Build to 50+ Google reviews and 20+ written testimonials within 12 months. This is the #1 driver of new client acquisition at premium rates.', layerFocus: 'L3 · Reputation', riskReductionPct: 14, deadline: '90 days', priority: 'Medium' },
);

// ── ACTION_DB_SKILLED_SERVICES_EDU_GOV ───────────────────────────────────────

export const ACTION_DB_SKILLED_SERVICES_EDU_GOV: Record<string, BracketPool> = {

  auto_mechanic_master: pool(
    { title: 'Complete ASE Master Auto Technician (A1-A9 + L1)', description: 'ASE Master Auto Technician (all 8 core tests A1-A8 + L1 Advanced Engine Performance) is the single highest-paying credential in automotive repair. Master techs earn $25K-$35K more than non-Master. Cost: $50/test × 9 = $450. Use Motor Age training + Tomorrow\'s Technician practice tests. Schedule tests in 2-3 per quarter to pace study. Dealer techs with ASE Master often progress to shop foreman or service manager roles at $90K-$120K.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Add EV/Hybrid Certification (ASE L3 + Manufacturer)', description: 'EV market share is rising 35-50% YoY. ASE L3 Light Duty Hybrid/Electric ($50) + manufacturer EV cert (Tesla, Ford Pro, GM EV) opens premium $35-$50/hour EV-specialty roles. Most ICE-only techs will see flat real wages through 2030; EV-certified techs see 6-10% YoY raises. Schedule the L3 exam this quarter.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Build a Performance + Diagnostic Specialty Reputation', description: 'Master techs who specialize (European diesel, performance tuning, ADAS calibration, EV diagnostics) command $40-$60/hour vs. $28-$35/hour for generalist. Build a public reputation through YouTube diagnostic walkthroughs, regional forums (BimmerForums, TDIClub), or Facebook group expertise. Inbound work at independent shop rates of $150-$200/hour with 60% to the tech is the goal.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  heavy_equipment_operator: pool(
    { title: 'Earn NCCER Heavy Equipment Operator + IUOE Apprenticeship', description: 'NCCER Heavy Equipment Operator certification (Levels 1-3) plus IUOE (International Union of Operating Engineers) Local apprenticeship completion is the gold-standard credential combo. IUOE journeyman operators on federal Davis-Bacon work earn $55-$85/hour straight time + full benefits. Total apprenticeship: 3-4 years paid training. Apply to your local IUOE hall (Locals 3, 12, 18, 825, etc.) within 14 days — application windows are limited.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '14 days', priority: 'Critical' },
    { title: 'Add Multi-Equipment Endorsements (Dozer + Excavator + Grader + Scraper)', description: 'Operators certified on 4+ pieces of equipment earn 30-50% more than single-machine operators. NCCER + manufacturer (Caterpillar, Komatsu, John Deere) endorsements stack. Site-prep work (excavator + dozer + grader) is the highest-demand combo for road construction and large commercial. Schedule simulator hours and certification with your union hall or Cat training.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Pursue Foreman or Project Superintendent Track', description: 'Senior operators with 10+ years move into general foreman ($110K-$160K) or project superintendent ($130K-$200K) roles. Take the AGC Supervisory Training Program (STP, $1,200-$2,000) or Procore Certified Superintendent. Foreman roles command salary positions vs. hourly, plus benefits and bonus structures.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  crane_operator: pool(
    { title: 'Earn NCCCO Mobile + Tower Crane Certifications', description: 'NCCCO (National Commission for the Certification of Crane Operators) certification is OSHA-mandated for crane operation. Mobile Crane Operator + Tower Crane Operator + Signal Person + Rigger Level II is the maximum credential stack — opens $40-$70/hour union rates. Cost: ~$2,500 total for all 4 + practical exams. Schedule the practical exam through your IUOE Local 14 (NYC), Local 12 (LA), Local 3 (Bay Area), or comparable.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '6 months', priority: 'Critical' },
    { title: 'Pursue Tower Crane Specialty for Premium Urban Work', description: 'Tower crane operators on Manhattan high-rise or San Francisco mega-project work earn $70-$100/hour straight time + double-time overtime. NCCCO Tower + 5+ years experience opens these positions. Apply directly to the largest crane rental firms (Bigge Crane, Maxim, ALL Crane) — they place operators at premium project rates.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Add Lift Director + Lift Planning Expertise', description: 'Lift Director ($90K-$140K salary) plans complex picks and supervises operators. Senior crane operators with NCCCO Lift Director certification + AutoCAD lift planning skills move into project management at major lift specialists. This is the path off the seat into salary roles with longer career horizon.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  locksmith_master: pool(
    { title: 'Earn ALOA Certified Master Locksmith (CML)', description: 'ALOA (Associated Locksmiths of America) Certified Master Locksmith is the apex credential in the trade. Requires 7+ years experience + 12 elective ALOA classes + Master exam. Cost ~$3,000 total. CMLs command $80K-$120K in commercial security work and gain access to high-security distribution (Medeco, Mul-T-Lock, Abloy) restricted to credentialed shops only.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Specialize in Automotive Locksmith + High-Security Commercial', description: 'Automotive locksmiths with transponder/key-fob/PIN-code programming for modern vehicles charge $200-$500 per call vs. $75-$100 for residential. Add MVP Pro Tools, Advanced Diagnostics, or AutoProPad equipment. Commercial high-security (Medeco, Schlage Primus, electronic access) opens recurring contracts with property management companies at $150-$250/hour.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Local Property Management + Realtor Referral Network', description: 'Property management companies and realtors generate the highest-value recurring locksmith work (rekey-on-turnover, emergency lockouts, master key systems). Visit 20 local property management offices and realtor brokerages with business cards and a one-page service brochure. Establish 3-5 reliable referrers — each can drive $30K-$60K/year in revenue.', layerFocus: 'L4 · Network', riskReductionPct: 22, deadline: '30 days', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  commercial_diver: pool(
    { title: 'Earn ADCI Commercial Diver + Saturation Diving Certification', description: 'ADCI (Association of Diving Contractors International) certification plus offshore saturation diving qualification is the path to $150K-$300K offshore diving work. Commercial Diving Academy (CDA) or Divers Institute of Technology (DIT) 7-month programs cost $20K-$30K. Saturation diving certification requires 1-2 years post-school experience + offshore contractor sponsorship. Apply within 7 days — class slots fill 6-12 months out.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '7 days — apply now', priority: 'Critical' },
    { title: 'Specialize in Inland Civil/Nuclear Diving or Saturation', description: 'Three premium specializations: (1) inland civil diving (dams, bridges, water treatment) at $60-$100/hour; (2) nuclear diving (reactor maintenance, ANSI N45.2.6) at $85K-$130K + per-diem; (3) offshore saturation at $150K-$300K. Pick one specialty and pursue the credential (ADCI inland, ANSI nuclear, IMCA offshore) this year.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '12 months', priority: 'Critical' },
    { title: 'Transition to Dive Supervisor or Inspector Track', description: 'Diving careers have limited dive-years (typical 10-15 years on the bottom). Plan the transition to Dive Supervisor (ADCI Supervisor cert, $90K-$140K) or NDT/UT Inspector for underwater work ($85K-$130K) by year 10. Both extend earning years to age 60+ in lower-physical-toll roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  arborist_certified: pool(
    { title: 'Earn ISA Certified Arborist + Tree Risk Assessment Qualification (TRAQ)', description: 'ISA (International Society of Arboriculture) Certified Arborist ($340 exam) is the entry credential; TRAQ qualification adds expert witness and risk assessment capability charged at $150-$250/hour. ISA Board-Certified Master Arborist is the apex (requires 5+ years as ISA Certified Arborist + Master exam). Schedule the Certified Arborist exam this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Add Tree Climbing + Aerial Rescue Certifications (TCIA + ANSI Z133)', description: 'Senior climbing arborists with TCIA (Tree Care Industry Association) Certified Tree Care Safety Professional + ANSI Z133 compliance command $35-$55/hour for climbing crews. Add an EHAP (Electrical Hazard Awareness Program) cert for line-clearance arborist work — line-clearance pays $30-$50/hour for utility contracts (Asplundh, Wright Tree Service, Davey Resource Group).', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    { title: 'Build a Consulting Arborist Practice (Risk + Expert Witness)', description: 'Consulting arborists with TRAQ + ASCA (American Society of Consulting Arborists) Registered Consulting Arborist (RCA) credential earn $150-$300/hour for risk assessments, expert witness testimony in tree-failure litigation, and pre-development surveys. ASCA RCA requires 6+ years experience + portfolio review. This is the path off bucket trucks and into salary-level consulting work.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  personal_trainer_certified: pool(
    { title: 'Earn NASM CPT + CES (Corrective Exercise Specialist)', description: 'NASM (National Academy of Sports Medicine) CPT is the most recognized certification among employers and clients. NASM CES (Corrective Exercise Specialist) adds $30-$50/session premium for post-injury or movement-dysfunction clientele. Total cost ~$1,500. Alternative: NSCA CSCS for strength + sport performance, or ACE CPT + Orthopedic Exercise specialist. Schedule the CPT this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Build to Boutique or Independent Practice (1099 → LLC)', description: 'Gym-employed trainers earn $25-$45/hour. Boutique studio trainers (Equinox Tier 4, Barry\'s, F45 head trainer) earn $60-$100/session. Independent LLC trainers with 30+ clients earn $120K-$200K. The progression: build 5 private clients while gym-employed → boutique studio at $60+/session → independent LLC at $90-$150/session. Verify your gym non-compete carefully before transitioning private clients.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Add a High-Value Specialty (Pre/Postnatal, Senior Fitness, Sports Performance)', description: 'Specialty trainers (NASM Pre/Postnatal, ACE Senior Fitness, NSCA Tactical Strength & Conditioning) command 50-100% rate premiums. Pre/postnatal at $120-$180/session; tactical at $90-$140/session for military/LEO populations. Add one specialty this quarter via NASM/ACE/NSCA.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    A_PERSONAL_SERVICES.senior.high[0], A_PERSONAL_SERVICES.junior.moderate[0],
  ),

  registered_dietitian: pool(
    { title: 'Maintain CDR Registration + Pursue Board Certified Specialty (CSO, CSP, CSSD, CSR)', description: 'CDR (Commission on Dietetic Registration) maintains your RD/RDN. Board Certified Specialty (CSO Oncology, CSP Pediatric, CSSD Sports Dietetics, CSR Renal, CSG Gerontological, CSOWM Obesity & Weight Management) adds $10K-$25K annual salary and opens specialty clinical roles. Schedule a specialty exam ($350) within 12 months.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Private Practice + Telehealth Caseload', description: 'Private practice RDs with telehealth caseloads of 30-50 clients/week earn $120K-$180K. Use platforms like Healthie, SimplePractice, or Practice Better. Become credentialed with major insurers (Cigna, Aetna, Blue Cross) at $80-$140/session reimbursement. Add cash-pay clients at $150-$250/session for higher-margin work.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Pursue Diabetes Education (CDCES) for Clinical Premium', description: 'CDCES (Certified Diabetes Care and Education Specialist, from ADCES) is the highest-value RD specialty credential. CDCES RDs in diabetes clinics earn $95K-$135K and have extreme job security (chronic shortage). Requires 1,000 hours diabetes-focused practice + exam ($450).', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'High' },
    A_PERSONAL_SERVICES.senior.high[0], A_PERSONAL_SERVICES.junior.moderate[0],
  ),

  massage_therapist_licensed: pool(
    { title: 'Earn AMTA or ABMP Membership + a Modality Specialty (Cupping, Myofascial, Sports)', description: 'AMTA (American Massage Therapy Association) or ABMP (Associated Bodywork & Massage Professionals) membership provides liability insurance, CE access, and client-referral platforms. Add a modality specialty: NCBTMB Cupping Therapy, Rolf Institute Structural Integration, Active Release Technique (ART), or Sports Massage Certification. Each specialty enables $30-$60/session rate premiums.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    { title: 'Transition from Spa Employment to Independent or Concierge Practice', description: 'Spa-employed LMTs earn $25-$40/session after commission split. Independent LMTs at private studios earn $90-$180/session cash pay. Concierge (in-home) LMTs in luxury markets (Aspen, Hamptons, Beverly Hills, Park Avenue) earn $200-$350/session. Build to 30+ private clients while employed before transitioning. Confirm state licensure and business registration.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Add Medical Massage + Insurance Billing Capability', description: 'Medical massage (for accident-rehab, PT clinic referral, chiropractic adjunct) opens insurance-billable work at $75-$130/session reimbursement. Take a Medical Massage Practitioner certification + insurance billing course. Adds 30-50% to income vs. spa rates.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '6 months', priority: 'High' },
    A_PERSONAL_SERVICES.senior.high[0], A_PERSONAL_SERVICES.junior.moderate[0],
  ),

  hairstylist_master: pool(
    { title: 'Earn Multi-State Cosmetology Licensure + a Color Specialist Credential', description: 'Multi-state cosmetology licensure (via state-board reciprocity or endorsement) opens travel and relocation flexibility. Specialty credentials: Wella Master Color Expert, Redken Specialist, Vivienne Mackinder Hair Designers International, or Schwarzkopf Professional Master. Each enables $40-$80 service rate premiums and exclusive product brand placement.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '180 days', priority: 'Critical' },
    { title: 'Transition from Salon Employee to Booth Rental or Salon Suite', description: 'Salon-employed stylists earn 40-50% commission ($35-$60K typical). Booth-rental stylists keep 80-95% after rent ($65K-$120K typical). Salon-suite operators (Sola, Phenix, MY SALON Suite) keep ~95% after rent ($90K-$180K with full book). Plan the transition once you\'ve built a 60+ client book that will follow you.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Editorial / Wedding / Platform Artist Reputation', description: 'Editorial and wedding hairstylists in luxury markets earn $200-$500 per service + travel. Platform artists (educator/demo for Aveda, Pivot Point, etc.) earn $1,500-$3,500 per appearance. Build a portfolio on Instagram (250+ posts), submit work to NAHA awards, and pursue platform artist contracts via Wella/Aveda/Redken education divisions.', layerFocus: 'L3 · Reputation', riskReductionPct: 24, deadline: '12 months', priority: 'High' },
    A_PERSONAL_SERVICES.senior.high[0], A_PERSONAL_SERVICES.junior.moderate[0],
  ),

  wedding_planner_executive: pool(
    { title: 'Earn ABC (Association of Bridal Consultants) Master Certification', description: 'ABC Master Bridal Consultant (MBC) is the apex wedding planning credential — requires 5+ years experience + 100+ weddings + portfolio review + exam. Alternative: WPIC Wedding Planner certification or Certified Wedding Planner (CWP). MBC + luxury portfolio commands $25K-$75K planning fees per wedding in the luxury market.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Vendor Network in 2-3 Luxury Markets', description: 'Wedding planning income scales with vendor network strength. Build deep relationships with 8-10 venues, 5 photographers, 3 florists, 2-3 caterers in each of your target markets (your home metro + 1-2 destination markets like Charleston, Napa, Aspen, Cabo). Vendor referrals account for 60-70% of luxury wedding planner revenue.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Add Destination + Cultural Wedding Specialties', description: 'Destination wedding planners (in luxury markets like Italy, Greece, Mexico, Hawaii) earn $30K-$100K per wedding. Cultural specialties (South Asian, Persian, Jewish, Chinese weddings) command extreme premiums — South Asian luxury weddings have planning fees of $50K-$150K. Pursue training via Destination Wedding Studio (DWS) or culture-specific mentorships.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    A_PERSONAL_SERVICES.senior.high[0], A_PERSONAL_SERVICES.junior.moderate[0],
  ),

  funeral_director_licensed: pool(
    { title: 'Maintain NFDA Membership + Pursue Certified Funeral Service Practitioner (CFSP)', description: 'NFDA (National Funeral Directors Association) membership is the trade backbone. CFSP (Certified Funeral Service Practitioner) requires 25 CE credits + ABFSE-accredited education + 1+ year experience. Adds $5K-$15K annual salary and qualifies you for funeral home management roles. Maintain state board licensure (each state has its own — verify reciprocity if relocating).', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '12 months', priority: 'High' },
    { title: 'Pursue Funeral Home Manager or Owner Track', description: 'Senior funeral directors progress to home managers ($75K-$110K) or to ownership via succession or acquisition. Independent funeral home owners earn $90K-$250K depending on volume. SCI (Service Corporation International) and Carriage Services run consolidator acquisition programs that can fund ownership transitions for proven managers.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Add Pre-Need + Insurance Sales Capability', description: 'Pre-need (pre-planned funeral) sales add $30K-$60K annual commission income for licensed funeral directors. Pre-need insurance is a high-margin product. Pursue state pre-need licensure (varies by state) and partner with major pre-need carriers (Forethought, Homesteaders, Great Western). This is a recession-resistant income layer.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '6 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  special_education_teacher: pool(
    { title: 'Maintain CEC Membership + Add Autism / Behavior / Reading Specialist Endorsements', description: 'CEC (Council for Exceptional Children) is the SPED professional home. Stack state endorsements: Autism Spectrum Disorders, Applied Behavior Analysis (BCBA pathway), Structured Literacy / Wilson Reading, or Severe/Profound Disabilities. Each endorsement opens caseload specialties and unlocks $5K-$15K annual differentials in most districts.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'Critical' },
    { title: 'Pursue BCBA (Board Certified Behavior Analyst) for Premium Specialization', description: 'BCBA certification (Behavior Analyst Certification Board, requires master\'s + 2,000 supervised hours + exam $245) opens premium roles: school-based BCBA at $70K-$110K, private clinic BCBA at $80K-$130K, or independent private practice at $90K-$160K. SPED teachers with BCBA also become extremely difficult to lay off because the certification is in chronic shortage.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '24 months', priority: 'Critical' },
    { title: 'Add NBPTS (National Board Certification) for $5K-$10K Salary Premium', description: 'National Board for Professional Teaching Standards certification in Exceptional Needs Specialist adds $3K-$10K annual salary in most states + permanent license portability. Cost ~$1,900 total. 1-3 year process via portfolio submission. This is the most recognized teaching credential and dramatically improves career resilience and inter-state mobility.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '24 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  college_sports_coach: pool(
    { title: 'Master NCAA Recruiting Rules + Build a Coaching Tree Network', description: 'NCAA recruiting compliance (Bylaws 11, 13, 14) and the Transfer Portal rules are central to D1 head coach competence. Pass the annual NCAA Coaches Certification test (free). More importantly: build relationships with 20+ coaches in your sport (assistant + head coaches, AAU/club coaches, HS coaches). Senior coaches move via the coaching tree — your network drives every promotion opportunity.', layerFocus: 'L4 · Network', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate Multi-Year Guaranteed Contracts + Buyout Protection', description: 'D1 head coaching is extreme upside ($1M-$10M+ at Power 5) but high turnover. Always negotiate guaranteed multi-year contracts with buyout clauses ≥ 1× annual salary. Use an experienced collegiate sports attorney (e.g., Coach Adams, Bryan Freedman, Russ Campbell) for every contract — they extract 15-30% more total comp and significantly stronger buyout protections.', layerFocus: 'L5 · Negotiation', riskReductionPct: 38, deadline: '14 days', priority: 'Critical' },
    { title: 'Plan the Pro / NIL / TV / AD Pivot for Career Continuity', description: 'D1 head coach tenures average 4-7 years. Plan the post-coaching career: TV analyst (ESPN, FS1, networks), NIL agency partnership, athletic director track (NACDA programs), or pro/national-team coaching. The most resilient coaches build optionality during peak earning years — TV reps at WME/CAA, AD connections at AthleticDirectorU, and a media reel.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  athletic_trainer_certified: pool(
    { title: 'Maintain BOC AT Certification + Pursue Advanced Specialty (PES, CES, Manual Therapy)', description: 'BOC (Board of Certification) AT credential maintenance requires 50 CEUs / 2 years. Add NASM PES (Performance Enhancement Specialist), NASM CES (Corrective Exercise), or Manual Therapy specialty (FAAOMPT, IASTM, dry needling per state law). Specialty-credentialed ATs earn 15-25% more than generalist.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '12 months', priority: 'High' },
    { title: 'Transition from HS / College AT to Professional, Industrial, or Private Practice', description: 'High school AT roles ($45K-$55K) and college AT roles ($48K-$70K) cap relatively low. Higher-paying paths: professional sports AT ($75K-$150K), industrial AT (ergonomic + injury-prevention in F500 plants, $70K-$100K), or PT-clinic-based AT ($60K-$85K). Apply to industrial AT roles (Atrium Health, Pivot Onsite Innovations, WorkCare) within 30 days — chronic shortage.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Add Doctorate (DAT) for Faculty / Clinical Leadership Track', description: 'Doctor of Athletic Training (DAT) opens faculty positions at AT education programs ($75K-$110K salary, 9-month contracts) and clinical leadership roles at major university athletic departments. Programs: A.T. Still, Indiana State, USC, Temple. Cost $35K-$60K total, 2-3 years part-time. Reciprocal benefit: tuition discounts at most programs for working ATs.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '24 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  tax_cpa_specialist: pool(
    { title: 'Earn AICPA Personal Financial Specialist (PFS) or Tax Section Membership', description: 'AICPA PFS credential (for tax CPAs serving HNW individuals) requires CPA + 3,000 hours of personal financial planning + exam. Alternative: AICPA Tax Section membership + a specialty (estate, international, S-corp/partnership, R&D credits). Specialty-credentialed tax CPAs at top firms earn $30K-$80K above generalist tax CPAs.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Pursue High-Margin Specialty (R&D Credits, Estate, International, M&A Tax)', description: 'R&D credit consultants at boutique firms (Source Advisors, alliantgroup, ADP R&D) earn $130K-$220K. Estate tax planners at family offices earn $150K-$280K. International / transfer pricing tax CPAs at Big 4 earn $180K-$350K at senior manager. M&A tax (Big 4 transaction services) earns $200K-$400K at director level. Pick one specialty this year and pursue the credential + experience track.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Independent Tax Advisory Practice for HNW Clients', description: 'Independent tax CPAs serving HNW (10-50 clients at $5K-$25K annual retainer) earn $250K-$600K. Build the book while at firm (within ethical/contractual limits), then transition. Use Canopy, TaxDome, or Karbon practice management. Add a CFP (Certified Financial Planner) credential for combined tax + financial planning offering.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '24 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  foreign_service_officer: pool(
    { title: 'Pass the USFS Foreign Service Officer Test (FSOT) + Personal Narrative + Oral Assessment', description: 'The FSO selection pipeline: FSOT (multi-section exam, 3-hour) → Personal Narrative (QEPs, 6 essay questions) → Oral Assessment (FSOA, full-day) → Medical/Security Clearance → Register. Total process 12-24 months. Choose your cone strategically: Political and Economic are most competitive; Public Diplomacy, Consular, and Management have higher selection rates. Register for the next FSOT (free, offered 3×/year).', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '90 days — next FSOT', priority: 'Critical' },
    { title: 'Build Critical-Need Language Skills (Mandarin, Arabic, Farsi, Russian, Korean)', description: 'FSOs with critical-need languages (Category III + IV — Mandarin, Arabic, Farsi, Russian, Korean, Urdu, Pashto, Dari) receive 0.17 bonus points on the FSOA register (a substantial bump) plus language-incentive pay (5-25% of base) and faster promotion. Even intermediate proficiency moves you up the register. Use FSI Mod 1-3 self-study (free, declassified) + iTalki tutor 3×/week.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Develop Specialty Track (Cyber Diplomacy, Climate, Health Security, Trade)', description: 'Mid-career FSOs who develop specialties (cyber diplomacy at S/CCO, climate at OES, global health security, trade negotiation) build resilience against bureau reshuffling. Specialties open Senior Foreign Service (SFS) promotion and reassignment flexibility. Pursue an out-of-cone tour or Pearson Fellowship (assignment to Congress) to build specialty credentials.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '24 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),

  customs_border_officer: pool(
    { title: 'Complete FLETC CBP Officer Basic Training + Spanish Language Track', description: 'CBP Officer training at FLETC (Federal Law Enforcement Training Center, Glynco GA) is 89 days basic + 73 days Spanish (paid). Maintain physical fitness for the PFT, prepare for the polygraph (be 100% candid on the Standard Form 86), and complete the medical clearance. Once badged, GL-9 → GS-12 progression in ~5 years is automatic at most major ports.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days — apply now', priority: 'Critical' },
    { title: 'Pursue Specialty Assignment (K-9, Marine, Air & Marine Ops, Targeting)', description: 'CBP specialty roles command premium duty pay and faster promotion: CBP K-9 handler, CBP Marine Interdiction Agent, Air & Marine Operations (AMO) pilot/agent, or National Targeting Center (NTC) analyst. Most require 2-3 years line experience + selection board. Apply for a specialty selection within 36 months of starting line work.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '36 months', priority: 'High' },
    { title: 'Plan the Senior CBP / DHS / Federal Career Path (GS-13+ Supervisory or Investigator)', description: 'CBP Officers at GS-12 cap at ~$95K (with locality + LEAP). Promotion paths: Supervisory CBP Officer (GS-13/14, $115K-$155K), CBP Officer-Targeting Analyst at NTC, lateral to HSI Special Agent (1811 series, $90K-$140K), or DEA/USSS lateral. Take Federal Executive Institute training and pursue an OPM 1801 supervisory development program.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '24 months', priority: 'High' },
    A_TRADES_GENERIC.senior.high[0], A_TRADES_GENERIC.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_SKILLED_SERVICES_EDU_GOV: Record<string, { canonicalKey: string; displayRole: string }> = {
  'auto mechanic master': { canonicalKey: 'auto_mechanic_master', displayRole: 'ASE Master Auto Technician' },
  'ase master technician': { canonicalKey: 'auto_mechanic_master', displayRole: 'ASE Master Auto Technician' },
  'master auto technician': { canonicalKey: 'auto_mechanic_master', displayRole: 'Master Auto Technician' },
  'master automotive technician': { canonicalKey: 'auto_mechanic_master', displayRole: 'Master Automotive Technician' },
  'master mechanic': { canonicalKey: 'auto_mechanic_master', displayRole: 'Master Mechanic' },
  'dealer master technician': { canonicalKey: 'auto_mechanic_master', displayRole: 'Dealer Master Technician' },
  'heavy equipment operator': { canonicalKey: 'heavy_equipment_operator', displayRole: 'Heavy Equipment Operator' },
  'heavy machinery operator': { canonicalKey: 'heavy_equipment_operator', displayRole: 'Heavy Machinery Operator' },
  'iuoe operator': { canonicalKey: 'heavy_equipment_operator', displayRole: 'IUOE Operating Engineer' },
  'operating engineer': { canonicalKey: 'heavy_equipment_operator', displayRole: 'Operating Engineer' },
  'excavator operator': { canonicalKey: 'heavy_equipment_operator', displayRole: 'Excavator Operator' },
  'bulldozer operator': { canonicalKey: 'heavy_equipment_operator', displayRole: 'Bulldozer Operator' },
  'grader operator': { canonicalKey: 'heavy_equipment_operator', displayRole: 'Motor Grader Operator' },
  'crane operator': { canonicalKey: 'crane_operator', displayRole: 'Crane Operator' },
  'mobile crane operator': { canonicalKey: 'crane_operator', displayRole: 'Mobile Crane Operator' },
  'tower crane operator': { canonicalKey: 'crane_operator', displayRole: 'Tower Crane Operator' },
  'nccco operator': { canonicalKey: 'crane_operator', displayRole: 'NCCCO Crane Operator' },
  'locksmith master': { canonicalKey: 'locksmith_master', displayRole: 'Master Locksmith' },
  'master locksmith': { canonicalKey: 'locksmith_master', displayRole: 'Master Locksmith' },
  'aloa certified master locksmith': { canonicalKey: 'locksmith_master', displayRole: 'ALOA Certified Master Locksmith' },
  'cml locksmith': { canonicalKey: 'locksmith_master', displayRole: 'Certified Master Locksmith (CML)' },
  'automotive locksmith': { canonicalKey: 'locksmith_master', displayRole: 'Automotive Locksmith' },
  'commercial diver': { canonicalKey: 'commercial_diver', displayRole: 'Commercial Diver' },
  'saturation diver': { canonicalKey: 'commercial_diver', displayRole: 'Saturation Diver' },
  'offshore diver': { canonicalKey: 'commercial_diver', displayRole: 'Offshore Commercial Diver' },
  'adci diver': { canonicalKey: 'commercial_diver', displayRole: 'ADCI Commercial Diver' },
  'underwater welder': { canonicalKey: 'commercial_diver', displayRole: 'Underwater Welder / Diver' },
  'arborist certified': { canonicalKey: 'arborist_certified', displayRole: 'ISA Certified Arborist' },
  'certified arborist': { canonicalKey: 'arborist_certified', displayRole: 'ISA Certified Arborist' },
  'isa arborist': { canonicalKey: 'arborist_certified', displayRole: 'ISA Certified Arborist' },
  'tree climber arborist': { canonicalKey: 'arborist_certified', displayRole: 'Tree-Climbing Arborist' },
  'consulting arborist': { canonicalKey: 'arborist_certified', displayRole: 'Consulting Arborist (RCA)' },
  'personal trainer certified': { canonicalKey: 'personal_trainer_certified', displayRole: 'Certified Personal Trainer' },
  'personal trainer': { canonicalKey: 'personal_trainer_certified', displayRole: 'Personal Trainer' },
  'nasm cpt': { canonicalKey: 'personal_trainer_certified', displayRole: 'NASM Certified Personal Trainer' },
  'fitness trainer': { canonicalKey: 'personal_trainer_certified', displayRole: 'Fitness Trainer' },
  'strength coach': { canonicalKey: 'personal_trainer_certified', displayRole: 'Strength & Conditioning Coach' },
  'registered dietitian': { canonicalKey: 'registered_dietitian', displayRole: 'Registered Dietitian (RD)' },
  'rd dietitian': { canonicalKey: 'registered_dietitian', displayRole: 'Registered Dietitian Nutritionist (RDN)' },
  'clinical dietitian': { canonicalKey: 'registered_dietitian', displayRole: 'Clinical Dietitian' },
  'sports dietitian': { canonicalKey: 'registered_dietitian', displayRole: 'Sports Dietitian (CSSD)' },
  'oncology dietitian': { canonicalKey: 'registered_dietitian', displayRole: 'Oncology Dietitian (CSO)' },
  'massage therapist licensed': { canonicalKey: 'massage_therapist_licensed', displayRole: 'Licensed Massage Therapist (LMT)' },
  'lmt': { canonicalKey: 'massage_therapist_licensed', displayRole: 'Licensed Massage Therapist' },
  'massage therapist': { canonicalKey: 'massage_therapist_licensed', displayRole: 'Massage Therapist' },
  'sports massage therapist': { canonicalKey: 'massage_therapist_licensed', displayRole: 'Sports Massage Therapist' },
  'medical massage therapist': { canonicalKey: 'massage_therapist_licensed', displayRole: 'Medical Massage Therapist' },
  'hairstylist master': { canonicalKey: 'hairstylist_master', displayRole: 'Master Hairstylist' },
  'master hairstylist': { canonicalKey: 'hairstylist_master', displayRole: 'Master Hairstylist' },
  'cosmetologist master': { canonicalKey: 'hairstylist_master', displayRole: 'Master Cosmetologist' },
  'master colorist': { canonicalKey: 'hairstylist_master', displayRole: 'Master Color Specialist' },
  'salon owner stylist': { canonicalKey: 'hairstylist_master', displayRole: 'Salon-Suite Stylist' },
  'wedding planner executive': { canonicalKey: 'wedding_planner_executive', displayRole: 'Executive Wedding Planner' },
  'wedding planner': { canonicalKey: 'wedding_planner_executive', displayRole: 'Wedding Planner' },
  'luxury wedding planner': { canonicalKey: 'wedding_planner_executive', displayRole: 'Luxury Wedding Planner' },
  'master bridal consultant': { canonicalKey: 'wedding_planner_executive', displayRole: 'ABC Master Bridal Consultant' },
  'destination wedding planner': { canonicalKey: 'wedding_planner_executive', displayRole: 'Destination Wedding Planner' },
  'funeral director licensed': { canonicalKey: 'funeral_director_licensed', displayRole: 'Licensed Funeral Director' },
  'funeral director': { canonicalKey: 'funeral_director_licensed', displayRole: 'Funeral Director' },
  'mortician': { canonicalKey: 'funeral_director_licensed', displayRole: 'Mortician / Funeral Director' },
  'embalmer funeral director': { canonicalKey: 'funeral_director_licensed', displayRole: 'Embalmer + Funeral Director' },
  'cfsp practitioner': { canonicalKey: 'funeral_director_licensed', displayRole: 'Certified Funeral Service Practitioner (CFSP)' },
  'special education teacher': { canonicalKey: 'special_education_teacher', displayRole: 'Special Education Teacher (SPED)' },
  'sped teacher': { canonicalKey: 'special_education_teacher', displayRole: 'SPED Teacher' },
  'special ed teacher': { canonicalKey: 'special_education_teacher', displayRole: 'Special Education Teacher' },
  'inclusion teacher': { canonicalKey: 'special_education_teacher', displayRole: 'Inclusion / Resource Teacher' },
  'resource room teacher': { canonicalKey: 'special_education_teacher', displayRole: 'Resource Room Teacher' },
  'college sports coach': { canonicalKey: 'college_sports_coach', displayRole: 'College Sports Coach (NCAA D1)' },
  'ncaa coach': { canonicalKey: 'college_sports_coach', displayRole: 'NCAA Coach' },
  'd1 head coach': { canonicalKey: 'college_sports_coach', displayRole: 'NCAA Division I Head Coach' },
  'division i coach': { canonicalKey: 'college_sports_coach', displayRole: 'NCAA Division I Coach' },
  'collegiate head coach': { canonicalKey: 'college_sports_coach', displayRole: 'Collegiate Head Coach' },
  'athletic trainer certified': { canonicalKey: 'athletic_trainer_certified', displayRole: 'Certified Athletic Trainer (ATC)' },
  'athletic trainer': { canonicalKey: 'athletic_trainer_certified', displayRole: 'Athletic Trainer' },
  'atc trainer': { canonicalKey: 'athletic_trainer_certified', displayRole: 'BOC Certified Athletic Trainer' },
  'boc certified athletic trainer': { canonicalKey: 'athletic_trainer_certified', displayRole: 'BOC AT' },
  'industrial athletic trainer': { canonicalKey: 'athletic_trainer_certified', displayRole: 'Industrial Athletic Trainer' },
  'tax cpa specialist': { canonicalKey: 'tax_cpa_specialist', displayRole: 'Tax CPA Specialist' },
  'tax cpa': { canonicalKey: 'tax_cpa_specialist', displayRole: 'Tax CPA' },
  'tax accountant senior': { canonicalKey: 'tax_cpa_specialist', displayRole: 'Senior Tax CPA' },
  'cpa pfs': { canonicalKey: 'tax_cpa_specialist', displayRole: 'CPA / Personal Financial Specialist' },
  'tax advisor cpa': { canonicalKey: 'tax_cpa_specialist', displayRole: 'CPA Tax Advisor' },
  'foreign service officer': { canonicalKey: 'foreign_service_officer', displayRole: 'Foreign Service Officer (FSO)' },
  'fso state department': { canonicalKey: 'foreign_service_officer', displayRole: 'US State Department FSO' },
  'us diplomat': { canonicalKey: 'foreign_service_officer', displayRole: 'US Diplomat / FSO' },
  'consular officer': { canonicalKey: 'foreign_service_officer', displayRole: 'Consular Officer (FSO)' },
  'public diplomacy officer': { canonicalKey: 'foreign_service_officer', displayRole: 'Public Diplomacy Officer (FSO)' },
  'customs border officer': { canonicalKey: 'customs_border_officer', displayRole: 'CBP Officer' },
  'cbp officer': { canonicalKey: 'customs_border_officer', displayRole: 'Customs and Border Protection Officer' },
  'customs officer': { canonicalKey: 'customs_border_officer', displayRole: 'Customs Officer' },
  'border patrol agent cbp': { canonicalKey: 'customs_border_officer', displayRole: 'CBP Border Patrol Agent' },
  'port of entry officer': { canonicalKey: 'customs_border_officer', displayRole: 'CBP Port of Entry Officer' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_SKILLED_SERVICES_EDU_GOV: Record<string, string> = {
  auto_mechanic_master: 'auto_mechanic_master',
  heavy_equipment_operator: 'heavy_equipment_operator',
  crane_operator: 'crane_operator',
  locksmith_master: 'locksmith_master',
  commercial_diver: 'commercial_diver',
  arborist_certified: 'arborist_certified',
  personal_trainer_certified: 'personal_trainer_certified',
  registered_dietitian: 'registered_dietitian',
  massage_therapist_licensed: 'massage_therapist_licensed',
  hairstylist_master: 'hairstylist_master',
  wedding_planner_executive: 'wedding_planner_executive',
  funeral_director_licensed: 'funeral_director_licensed',
  special_education_teacher: 'special_education_teacher',
  college_sports_coach: 'college_sports_coach',
  athletic_trainer_certified: 'athletic_trainer_certified',
  tax_cpa_specialist: 'tax_cpa_specialist',
  foreign_service_officer: 'foreign_service_officer',
  customs_border_officer: 'customs_border_officer',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_SKILLED_SERVICES_EDU_GOV: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  auto_mechanic_master:        { roleKey: 'auto_mechanic_master',        roleName: 'ASE Master Auto Technician',        demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 48, yoyJobOpeningsChange: 12, topHiringLocations: ['Dallas TX', 'Phoenix AZ', 'Atlanta GA', 'Tampa FL', 'Charlotte NC'],            aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Master tech demand chronically short; EV+ADAS specialty commands premium.' },
  heavy_equipment_operator:    { roleKey: 'heavy_equipment_operator',    roleName: 'Heavy Equipment Operator',          demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 35, yoyJobOpeningsChange: 18, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Denver CO', 'Charlotte NC'],          aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Infrastructure (IIJA), data center, semi-fab construction driving acute shortage of certified operators.' },
  crane_operator:              { roleKey: 'crane_operator',              roleName: 'NCCCO Crane Operator',              demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 52, yoyJobOpeningsChange: 22, topHiringLocations: ['New York NY', 'San Francisco CA', 'Seattle WA', 'Houston TX', 'Boston MA'],     aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'NCCCO + tower experience extremely scarce in urban high-rise + offshore wind markets.' },
  locksmith_master:            { roleKey: 'locksmith_master',            roleName: 'Master Locksmith (CML)',            demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 42, yoyJobOpeningsChange: 4,  topHiringLocations: ['Los Angeles CA', 'New York NY', 'Chicago IL', 'Houston TX', 'Atlanta GA'],     aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'CML demand steady; automotive + high-security commercial premium tiers growing.' },
  commercial_diver:            { roleKey: 'commercial_diver',            roleName: 'Commercial Diver',                  demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 14, topHiringLocations: ['Houston TX', 'New Orleans LA', 'Norfolk VA', 'San Diego CA', 'Seattle WA'],    aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1', calibrationNote: 'Offshore wind, oil & gas, and infrastructure inspection driving acute shortage.' },
  arborist_certified:          { roleKey: 'arborist_certified',          roleName: 'ISA Certified Arborist',            demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 32, yoyJobOpeningsChange: 12, topHiringLocations: ['Atlanta GA', 'Charlotte NC', 'Nashville TN', 'Portland OR', 'Boston MA'],     aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Storm response, utility line clearance, and urban forestry investment driving rising demand.' },
  personal_trainer_certified:  { roleKey: 'personal_trainer_certified',  roleName: 'Certified Personal Trainer',        demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 25, yoyJobOpeningsChange: 6,  topHiringLocations: ['Los Angeles CA', 'New York NY', 'Miami FL', 'Austin TX', 'Denver CO'],         aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Boutique + concierge tiers growing fastest; commodity gym tier flat to declining.' },
  registered_dietitian:        { roleKey: 'registered_dietitian',        roleName: 'Registered Dietitian (RD/RDN)',     demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 45, yoyJobOpeningsChange: 14, topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Boston MA'],      aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'GLP-1 / obesity clinical channels + telehealth expansion driving demand; CDCES acutely short.' },
  massage_therapist_licensed:  { roleKey: 'massage_therapist_licensed',  roleName: 'Licensed Massage Therapist (LMT)',  demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 28, yoyJobOpeningsChange: 5,  topHiringLocations: ['Los Angeles CA', 'New York NY', 'Miami FL', 'Austin TX', 'San Francisco CA'],   aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Medical massage + concierge tier rising; commodity spa tier flat. AI cannot replicate physical touch.' },
  hairstylist_master:          { roleKey: 'hairstylist_master',          roleName: 'Master Hairstylist',                demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 22, yoyJobOpeningsChange: 4,  topHiringLocations: ['Los Angeles CA', 'New York NY', 'Miami FL', 'Atlanta GA', 'Chicago IL'],         aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Salon-suite + booth rental rising; commodity chain salon flat. Specialty colorist tier strong.' },
  wedding_planner_executive:   { roleKey: 'wedding_planner_executive',   roleName: 'Executive Wedding Planner',         demandIndex: 75, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 45, yoyJobOpeningsChange: 10, topHiringLocations: ['New York NY', 'Los Angeles CA', 'Miami FL', 'Charleston SC', 'Napa CA'],        aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Luxury + destination + cultural specialty tiers growing fastest; mid-market consolidating.' },
  funeral_director_licensed:   { roleKey: 'funeral_director_licensed',   roleName: 'Licensed Funeral Director',         demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 55, yoyJobOpeningsChange: 3,  topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Tampa FL', 'Dallas TX', 'Atlanta GA'],              aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Demographics (aging boomers) drive steady demand; cremation shift compresses revenue per case but volume rising.' },
  special_education_teacher:   { roleKey: 'special_education_teacher',   roleName: 'Special Education Teacher (SPED)',  demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 75, yoyJobOpeningsChange: 18, topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Phoenix AZ', 'Houston TX'],     aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'SPED is the most acute teacher shortage in the US; districts pay sign-on bonuses + loan forgiveness.' },
  college_sports_coach:        { roleKey: 'college_sports_coach',        roleName: 'NCAA D1 Sports Coach',              demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 90, yoyJobOpeningsChange: 6,  topHiringLocations: ['Austin TX', 'Los Angeles CA', 'Columbus OH', 'Nashville TN', 'Tuscaloosa AL'],   aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'NIL + transfer portal era reshaping market; top-tier head coach pay accelerating, mid-major flat.' },
  athletic_trainer_certified:  { roleKey: 'athletic_trainer_certified',  roleName: 'Certified Athletic Trainer (BOC AT)', demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 38, yoyJobOpeningsChange: 14, topHiringLocations: ['Dallas TX', 'Charlotte NC', 'Atlanta GA', 'Phoenix AZ', 'Indianapolis IN'],     aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Industrial AT + secondary school + clinic tier all expanding; pro + D1 AT highly competitive.' },
  tax_cpa_specialist:          { roleKey: 'tax_cpa_specialist',          roleName: 'Tax CPA Specialist',                demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 16, topHiringLocations: ['New York NY', 'San Francisco CA', 'Chicago IL', 'Dallas TX', 'Houston TX'],    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'CPA shortage chronic; specialty (R&D, estate, international, M&A) tax CPAs in deep deficit.' },
  foreign_service_officer:     { roleKey: 'foreign_service_officer',     roleName: 'Foreign Service Officer (FSO)',     demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 365, yoyJobOpeningsChange: 4, topHiringLocations: ['Washington DC', 'Arlington VA', 'Posts Worldwide'],                            aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'FSO selection extremely competitive; ~10K applicants → ~500 hires/year. Strong language candidates favored.' },
  customs_border_officer:      { roleKey: 'customs_border_officer',      roleName: 'CBP Officer',                       demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 240, yoyJobOpeningsChange: 12, topHiringLocations: ['El Paso TX', 'San Diego CA', 'Laredo TX', 'Buffalo NY', 'Miami FL'],          aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'CBP authorized strength expansion ongoing; 2024-2026 hiring surge with retention bonus programs.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_SKILLED_SERVICES_EDU_GOV: Record<string, Record<string, number>> = {
  auto_mechanic_master:        { '0-2': 52_000,  '2-5': 62_000,  '5-10': 75_000,  '10-15': 85_000,  '15+': 95_000 },
  heavy_equipment_operator:    { '0-2': 55_000,  '2-5': 68_000,  '5-10': 82_000,  '10-15': 95_000,  '15+': 110_000 },
  crane_operator:              { '0-2': 75_000,  '2-5': 92_000,  '5-10': 110_000, '10-15': 125_000, '15+': 140_000 },
  locksmith_master:            { '0-2': 45_000,  '2-5': 58_000,  '5-10': 72_000,  '10-15': 88_000,  '15+': 105_000 },
  commercial_diver:            { '0-2': 60_000,  '2-5': 95_000,  '5-10': 145_000, '10-15': 195_000, '15+': 240_000 },
  arborist_certified:          { '0-2': 42_000,  '2-5': 55_000,  '5-10': 72_000,  '10-15': 90_000,  '15+': 115_000 },
  personal_trainer_certified:  { '0-2': 40_000,  '2-5': 58_000,  '5-10': 75_000,  '10-15': 92_000,  '15+': 110_000 },
  registered_dietitian:        { '0-2': 62_000,  '2-5': 72_000,  '5-10': 82_000,  '10-15': 90_000,  '15+': 98_000 },
  massage_therapist_licensed:  { '0-2': 42_000,  '2-5': 55_000,  '5-10': 68_000,  '10-15': 80_000,  '15+': 90_000 },
  hairstylist_master:          { '0-2': 38_000,  '2-5': 55_000,  '5-10': 75_000,  '10-15': 95_000,  '15+': 115_000 },
  wedding_planner_executive:   { '0-2': 50_000,  '2-5': 72_000,  '5-10': 105_000, '10-15': 138_000, '15+': 165_000 },
  funeral_director_licensed:   { '0-2': 52_000,  '2-5': 62_000,  '5-10': 75_000,  '10-15': 86_000,  '15+': 95_000 },
  special_education_teacher:   { '0-2': 52_000,  '2-5': 62_000,  '5-10': 74_000,  '10-15': 85_000,  '15+': 95_000 },
  college_sports_coach:        { '0-2': 50_000,  '2-5': 95_000,  '5-10': 180_000, '10-15': 425_000, '15+': 1_200_000 },
  athletic_trainer_certified:  { '0-2': 48_000,  '2-5': 58_000,  '5-10': 68_000,  '10-15': 78_000,  '15+': 85_000 },
  tax_cpa_specialist:          { '0-2': 75_000,  '2-5': 102_000, '5-10': 135_000, '10-15': 162_000, '15+': 185_000 },
  foreign_service_officer:     { '0-2': 52_000,  '2-5': 72_000,  '5-10': 95_000,  '10-15': 128_000, '15+': 165_000 },
  customs_border_officer:      { '0-2': 52_000,  '2-5': 68_000,  '5-10': 82_000,  '10-15': 95_000,  '15+': 105_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_SKILLED_SERVICES_EDU_GOV: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  auto_mechanic_master: {
    strongOpener: 'I\'d like to discuss my flat-rate, hourly, or salaried compensation in light of my ASE Master + L1 credentials and the EV / ADAS specialty work I\'ve been bringing into the shop. The market for Master techs with EV calibration experience is at $35-$50/hour at top dealers.',
    leverageContext: 'My productivity this year: [X flat-rate hours billed / Y warranty rework rate / Z customer-pay vs. warranty mix]. Replacement cost for an ASE Master + EV-certified tech is 6-9 months given current shortage. Cross-town dealers (Mercedes/BMW/Tesla certified shops) are actively recruiting at $40-$55/hour for my credential stack.',
    countersScript: 'I\'m asking for $X/flag hour (or $Y annual base if salaried), tooling allowance of $5K/year, and full reimbursement for the next ASE renewal cycle + 1 manufacturer EV course. If hourly increase isn\'t feasible, I\'ll accept a productivity bonus structure tied to flag hours over baseline.',
    walkAwayLine: 'I\'ve been approached by [Mercedes-Benz / Tesla / luxury independent shop] at $X/hour. I\'d prefer to continue here — but the comp gap to my current market value is significant.',
  },
  crane_operator: {
    strongOpener: 'I want to discuss my wage and overtime structure in the context of NCCCO Mobile + Tower + Lift Director credentials and the project mix I\'ve been running.',
    leverageContext: 'Per the IUOE collective bargaining agreement for [Local 14/12/3] and current private-sector rates, a Lift-Director-qualified operator on tower work is at $70-$95/hour straight time. My recent picks include [specific complex lifts]. Bigge Crane, Maxim, and the largest GCs are recruiting at $80+/hour for my qualifications.',
    countersScript: 'I\'m asking for $X/hour straight time, $Y overtime + Sunday/holiday differentials per CBA, and dispatch priority for tower assignments. Also reimbursement for NCCCO recerts + Lift Director continuing education.',
    walkAwayLine: 'I\'ve had standing inbounds from [Bigge / Maxim / specific GC] at substantially higher rates. I\'d prefer to stay — but the rate needs to match my market value or I\'ll need to take dispatch elsewhere.',
  },
  commercial_diver: {
    strongOpener: 'I\'d like to discuss my day rate and per-diem in the context of saturation diving / offshore wind / inland nuclear specialty work I\'ve been logging.',
    leverageContext: 'Per the IMCA / ADCI rate ranges and current offshore wind expansion (Orsted, Avangrid, Vineyard Wind), qualified sat divers and bell engineers are in 3:1 demand-to-supply. My recent work: [specific dives, bottom-hours logged, specialty certs]. Replacement cost: 12-18 months given school throughput.',
    countersScript: 'I\'m asking for $X/day rate, $Y depth pay above 150 ft saturation, $Z mob/demob, and full per-diem at IRS high-cost rates. Also full medical coverage including hyperbaric chamber operations and travel insurance.',
    walkAwayLine: 'I have inbound from [Subsea 7 / TechnipFMC / DOF Subsea] at significantly higher day rates and project guarantees. I\'d like to continue here — but the gap to offshore market is real.',
  },
  registered_dietitian: {
    strongOpener: 'I\'d like to align my compensation with the market for RDs with [CDCES / CSO / CSP / CSSD] specialty certification. The CDR salary survey shows my specialty + experience at $X median.',
    leverageContext: 'Per the AND Compensation & Benefits Survey 2026, specialty-credentialed RDs are at the 75th percentile of $Y. My patient outcomes: [specific A1c reduction, weight loss, oncology outcomes]. Telehealth platforms (Nourish, Berry Street, OnPoint Nutrition) and hospital systems are hiring at $90K-$140K for my credentials.',
    countersScript: 'I\'m asking for $X base, CDR + specialty cert renewal reimbursement, and conference budget (FNCE attendance). Also a documented path to clinical lead or hospital nutrition manager within 18 months.',
    walkAwayLine: 'I have an offer from [Nourish / regional hospital system / private practice partnership] at meaningfully higher comp. I\'d prefer to find a way to stay.',
  },
  wedding_planner_executive: {
    strongOpener: 'I want to discuss my planning fee structure or salary in light of the luxury / destination / cultural wedding work I\'ve been booking. The luxury market 2026 fee range for full-service planning is $45K-$120K per wedding.',
    leverageContext: 'My book this year: [X weddings booked at $Y average fee / Z vendor referral revenue / repeat client rate]. Top luxury planners (David Stark, Marcy Blum, Mindy Weiss) and luxury hotel groups (Aman, Rosewood, Four Seasons) are actively partnering with senior planners at premium splits.',
    countersScript: 'I\'m asking for $X base salary plus Y% of planning fees above target, plus vendor commission transparency. Also marketing budget for portfolio shoots and conference attendance (BizBash, The Special Event).',
    walkAwayLine: 'I\'ve been recruited by [specific luxury planning firm or hotel group] at significantly higher fee splits. I\'d prefer to continue building my book here — but I need to see meaningful movement.',
  },
  special_education_teacher: {
    strongOpener: 'I\'d like to discuss my salary placement and stipend structure in light of my SPED certification, [Autism / BCBA / Reading Specialist] endorsement, and the caseload complexity I\'ve been managing.',
    leverageContext: 'SPED is the most acute teacher shortage nationally; my district is paying $X sign-on bonuses for new SPED hires. My credentials (BCBA + NBPTS pending) qualify me for the highest stipend tier per the CBA. Neighboring districts ([X / Y / Z]) are offering $Z extra for SPED + BCBA + multi-language qualifications.',
    countersScript: 'I\'m asking for step placement at year [X] (recognizing my prior experience), SPED stipend of $Y per CBA, and BCBA stipend differential of $Z. Also tuition reimbursement for completion of my BCBA hours + a written commitment to NBPTS reimbursement.',
    walkAwayLine: 'I have inbounds from [neighboring district / private school / clinical BCBA practice] at meaningfully higher comp. I\'d rather continue serving these students — but the district needs to compete for SPED talent.',
  },
  college_sports_coach: {
    strongOpener: 'I want to discuss my compensation package, contract term, and buyout structure in light of my [year-X results, recruiting class rankings, conference titles, NIL fundraising].',
    leverageContext: 'Per the most recent USA Today coaches salary database and the IRS Form 990 disclosures for peer programs, head coaches at my conference + win-rate quartile are at $X base + $Y bonus structure + $Z buyout. Replacement cost for the program is the search firm fee + the value of recruiting disruption + NIL collective uncertainty.',
    countersScript: 'I\'m asking for a 5-year guaranteed contract at $X base, $Y APR-based incentive structure, $Z buyout (1× annual at minimum), and a $W discretionary fund for assistants + NIL coordinator. Per Bryan Freedman / Russ Campbell guidance.',
    walkAwayLine: 'I have a formal offer from [specific peer program / pro coaching opportunity / TV analyst contract]. I\'d prefer to continue what we\'ve built here — but the package needs to reflect market reality.',
  },
  tax_cpa_specialist: {
    strongOpener: 'I\'d like to align my compensation with the market for tax CPAs with [R&D Credit / Estate / International / M&A / SALT] specialty expertise. The 2026 Robert Half tax CPA salary guide places senior specialists in my niche at $Y at the 75th percentile.',
    leverageContext: 'My specialty book: [X clients / Y annual recurring revenue / Z complex engagements led]. Specialty tax CPAs are in 5:1 demand-to-supply per AICPA. Boutique R&D firms (alliantgroup, Source Advisors) and Big 4 are recruiting at substantially above mainstream tax comp for my profile.',
    countersScript: 'I\'m asking for $X base, target bonus of Y%, partner-track timeline acceleration to year Z, and a documented commitment to my specialty practice growth (marketing budget + dedicated junior staff).',
    walkAwayLine: 'I\'ve had inbound from [Big 4 specialty group / regional firm partner role / boutique R&D firm] at significantly higher total comp + faster partner track. I\'d like to continue building here — but the gap needs to close.',
  },
  funeral_director_licensed: {
    strongOpener: 'I\'d like to discuss my salary, commission, and ownership track in light of my CFSP credential and the case volume / pre-need sales I\'ve been generating.',
    leverageContext: 'NFDA salary surveys place CFSP-credentialed funeral directors with my experience at $X median. My case volume this year + pre-need policies sold = $Y revenue contribution. Local independents and SCI/Carriage consolidators are recruiting for manager roles at $90K-$120K + ownership equity opportunities.',
    countersScript: 'I\'m asking for $X base + Y% pre-need commission + Z% case volume bonus. Also a documented path to home manager within 24 months with equity participation or owner-financed succession discussion.',
    walkAwayLine: 'I have inbound from [SCI / independent home looking for manager / private equity rollup]. I\'d like to stay and grow here — but I need a clear succession or comp path.',
  },
  athletic_trainer_certified: {
    strongOpener: 'I\'d like to align my compensation with the BOC AT market — industrial AT, clinic-based AT, and pro/D1 AT pay 30-60% above HS AT. My credentials [PES + CES + Manual Therapy] qualify me for the higher tier.',
    leverageContext: 'NATA salary survey + Industrial AT market data place my profile at $Y at the 75th percentile. My contributions: [injury rate reduction / time-loss prevention / clinical outcomes]. Atrium Health, Pivot Onsite, and WorkCare are recruiting industrial ATs at $80K-$105K.',
    countersScript: 'I\'m asking for $X base, CEU and conference budget ($2K/year), and either reduced after-hours coverage or comp time. Also a clear progression pathway to head AT or clinical coordinator within 24 months.',
    walkAwayLine: 'I have inbound from [industrial AT firm / pro team support staff / clinic chain] at meaningfully higher comp. I\'d like to continue here — but I need movement on base + work-life.',
  },
};
