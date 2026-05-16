// aviation_public_safety_actions.ts — v38.0 Phase 2B
// 20 Aviation + Public Safety roles — physical-presence, judgment-critical professions with
// near-zero AI substitution risk. Global pilot shortage (12,000+ unfilled), FAA ATC shortage
// (3,000 below staffing target), and post-2020 law enforcement staffing crises drive demand.

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

const A_AVIATION_NETWORK: BracketPool = pool(
  { title: 'Join ALPA and Attend a Regional ALPA Pilot Meeting', description: 'The Air Line Pilots Association (ALPA) represents 68,000+ pilots at 37 airlines. Attending regional ALPA meetings opens access to the informal seniority-list intelligence network — pilots share captain-upgrade timelines, base openings, and furlough signals weeks before official announcements. New members should attend the next in-person ALPA chapter meeting and introduce themselves to the MEC (Master Executive Council) reps at their carrier or target carrier.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Build Relationships at Target Major Carriers Through Type-Rating Programs', description: 'Captain upgrades at Delta, United, American, Southwest, FedEx, and UPS are governed by strict seniority systems — the earlier you build a number, the earlier you upgrade. Regional airline pilots pursuing a major-carrier path should attend CareerCast events (ALPA hosts), ATP-CTP courses where line pilots teach, and the Aviation Career Expo in Atlanta. A first-officer-level contact inside the target carrier can flag when classes are opening 30-60 days before bids post.', layerFocus: 'L4 · Network', riskReductionPct: 18, deadline: '60 days', priority: 'Medium' },
  { title: 'Engage the Aviation Professional Network on PilotCredentials.com and ATPflightschool.com Forums', description: 'Senior captains at major carriers and check airmen at regional carriers are active on PilotCredentials.com forums, the PPRuNe professional pilots forum, and the Airline Pilot Central message boards. Contributing substantive posts on training pipelines, CBA (collective bargaining agreement) changes, and type-rating market conditions builds visibility and generates referral contacts at target airlines.', layerFocus: 'L3 · Visibility', riskReductionPct: 10, deadline: '14 days', priority: 'Medium' },
  { title: 'Obtain Your ATP Certificate Before Applying to Mainline Airlines', description: 'An Airline Transport Pilot (ATP) certificate (1,500 flight hours, or R-ATP at 1,000 hours with aviation degree + 200 NVG hours) is the regulatory floor for first officer positions at Part 121 major carriers (Delta, United, American, Southwest, FedEx, UPS). Start the ATP-CTP course ($5,000-$7,500) now — it is a prerequisite for the ATP written exam. Every month of delay costs a seniority position. Schedule your ATP written exam date today.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days — register now', priority: 'High' },
  { title: 'Log and Organize Your Logbook for Major Carrier Applications', description: "Every major carrier hiring system (Delta Avature, United's online portal, American's Jetstream) pulls total time, PIC time, turbine time, and multi-engine time from your digital logbook. Switch to ForeFlight Logbook or LogTen Pro now — these integrate directly with FAPA.aero and airline application portals. A clean, audited logbook with zero discrepancies prevents the most common cause of hiring delays (logbook reconciliation failures at CASS background check).", layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '7 days', priority: 'Medium' },
);

const A_PUBLIC_SAFETY_NETWORK: BracketPool = pool(
  { title: 'Connect with the FOP (Fraternal Order of Police) Lodge and POST Alumni Network', description: 'The Fraternal Order of Police (FOP) is the largest law enforcement labor organization in the US. Lodge members receive advance notice of civil service exam openings, eligibility list announcements, and lateral transfer openings across jurisdictions. Register with your state POST alumni directory — detectives and senior officers from your academy cohort are the fastest path to lateral-agency referrals, particularly in higher-paying jurisdictions (NYPD, LAPD, Metro DC, Chicago PD).', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Join IAFF or IAFC and Attend a Regional Fire Leadership Conference', description: 'The International Association of Fire Fighters (IAFF) and International Association of Fire Chiefs (IAFC) are the two most important professional networks for fire service careers. IAFF union membership provides CBA intelligence — which departments are hiring, when civil service lists are opening, and which jurisdictions offer the strongest pension multipliers. Fire captains targeting chief-track roles should attend the IAFC Annual Conference for command-level networking and promotional exam coaching.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Apply for FEMA Emergency Management Institute (EMI) Training and Build Your ICS Portfolio', description: 'FEMA/EMI offers free online and residential ICS/NIMS training (ICS 100 through ICS 800). The G-300 (Intermediate ICS), G-400 (Advanced ICS), and the All-Hazards Incident Commander credential are the career-differentiating levels. Each course adds a verifiable credential to your resume and signals readiness for emergency management coordinator or multi-agency incident management roles. Apply for the next EMI residential course at FEMA\'s campus in Emmitsburg, MD.', layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'Medium' },
  { title: 'Register for the Next Civil Service or POST Examination in Your Target Jurisdiction', description: 'Most law enforcement agencies are operating with staffing crises — many departments are 15-25% below authorized strength post-2020. Civil service exams for police officer and corrections officer open periodically; missing an exam means waiting 12-18 months for the next eligible list. Register at your target jurisdiction\'s civil service commission site this week. Many agencies also accept lateral transfers without a new exam for officers with 3+ years and current POST certification.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '14 days', priority: 'High' },
  { title: 'Research State Pension Cliff Timing and Optimize Your 20-Year Milestone Plan', description: 'Public safety pensions are among the most valuable deferred compensation structures remaining in the US labor market. Most state pension systems offer a "pension cliff" at 20 years — a dramatic jump in multiplier (often 2-2.5% per year of service, vesting at a high percentage of final salary). Map your current service credit, projected 20-year date, and whether reciprocity agreements allow you to transfer credit from a prior jurisdiction. Knowing your cliff date governs every career decision.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 16, deadline: '30 days', priority: 'Medium' },
);

// ── ACTION_DB_AVIATION_PUBLIC_SAFETY ─────────────────────────────────────────

export const ACTION_DB_AVIATION_PUBLIC_SAFETY: Record<string, BracketPool> = {

  commercial_pilot_airline: pool(
    { title: 'Earn Your ATP Certificate via the ATP-CTP Course and Apply to Regional Feeders', description: 'The Airline Transport Pilot (ATP) certificate requires 1,500 total flight hours (or R-ATP at 1,000 hours with an aviation degree + completion of an approved ATP-CTP course). The ATP-CTP prerequisite course costs $5,000-$7,500 and takes 30 hours ground + 10 hours simulator. Regional feeder carriers (SkyWest, Envoy, Piedmont — affiliates of Delta, American, United) hire first officers aggressively with regionals serving as the primary pipeline to major carriers. Apply to regionals now — the average upgrade to captain at a regional is 2-4 years, versus 8-15+ years at a major.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to the Delta Propel, United Aviate, or American Cadet Programs for Mainline Fast-Track', description: 'Delta Propel, United Aviate, and American Cadet are structured pathway programs that guarantee a conditional first officer class date at the major carrier upon reaching 1,500 hours (or R-ATP minimums). A conditional offer letter from a major carrier dramatically changes your career calculus — you know exactly where you\'re going and when. These programs are competitive but open: Delta Propel accepts 350+ candidates per cohort. Apply within 30 days. Current pilot shortage means acceptance rates are the highest in program history.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical' },
    { title: 'Pursue a Type Rating at Your Current Carrier and Optimize Your Seniority Number', description: 'At major carriers, a captain\'s seniority number determines base assignment, aircraft type, schedule quality, and ultimately compensation — a 15-year Delta captain on the 767 earns $350K-$420K+ vs. a junior first officer at $110K. The most important career lever for an established major-carrier pilot is seniority management: bid for bases where upgrade timelines are shortest (smaller bases have faster captain upgrades), volunteer for training programs that add type ratings and increase your value during furlough downturns, and contribute to ALPA contract negotiations to protect the seniority system. Know your relative seniority number on Airline Pilot Central and model your captain-upgrade year.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  first_officer_airline: pool(
    { title: 'Build Total Time to 1,500 Hours and Apply to a Regional Carrier Immediately', description: 'The FAA\'s 1,500-hour rule (49 CFR Part 61) means most flight instructors and corporate co-pilots are racing toward ATP minimums. If you have 1,200+ hours, you are within 6-9 months of hire eligibility at regional carriers. SkyWest, Envoy, Piedmont, and GoJet actively hire first officers at minimums during pilot shortages. Use flight instruction, banner towing, charter, or Part 135 flying to accumulate hours efficiently. File your ATP-CTP registration this month.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical' },
    { title: 'Obtain a Type Rating on a Common Regional Jet (CRJ-200/700 or ERJ-145/175)', description: 'A self-sponsored type rating on the CRJ-200 ($8,000-$12,000 at SimuFlite or FlightSafety) signals seriousness and can accelerate hiring 30-60 days at regional carriers. ERJ-145 or ERJ-175 type ratings are also valued at GoJet and Envoy. Some regional carriers fully reimburse type rating costs within 12 months of hire. Factor this against time-to-class if you have an immediate slot offer.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'High' },
    { title: 'Build Relationships at Your Target Major Carrier Before You Are Eligible', description: 'Major carrier hiring managers at Delta, United, American, and Southwest value ALPA union involvement, participation in ERPs (Employee Resource Programs), and direct referrals from current line pilots. Get your resume to a Delta TechOps or United liaison before you hit mainline minimums — hiring managers remember applicants who engaged 12-24 months before eligibility. Use ALPA\'s career services and attend CareerCast annually.', layerFocus: 'L4 · Network', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  corporate_pilot: pool(
    { title: 'Earn a Type Rating on the Gulfstream G550/G650 or Bombardier Global 6000/7500', description: 'Corporate aviation compensation is heavily driven by aircraft type. Gulfstream G650 and Bombardier Global 7500 pilots command the highest rates — $185K-$220K base + $30K-$50K per diem/expenses at large flight departments (Fortune 500, PE firm, UHNW individual). Type rating costs: $25,000-$40,000 at FlightSafety International or CAE. Some fractional operators (NetJets, Flexjet, Wheels Up) sponsor type ratings in exchange for a 12-month service commitment.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Pursue the IS-BAO SMS Audit and NBAA Certified Aviation Manager (CAM) for Chief Pilot Track', description: 'Flight departments seeking IS-BAO (International Standard for Business Aircraft Operations) Stage 2 or 3 certification need chief pilots who understand Safety Management Systems (SMS). The NBAA Certified Aviation Manager (CAM) designation ($395 exam + 3 years flight department management experience) is the gold-standard for director of aviation and chief pilot roles at $185K-$240K. If you\'re a second-in-command at a large flight department, lead your department\'s IS-BAO renewal process to build the portfolio piece.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Target Fractional Operators for Guaranteed Income + Type Rating Sponsorship', description: 'NetJets (Berkshire Hathaway), Flexjet, and Wheels Up hire 500-800 pilots annually and are among the most stable corporate aviation employers due to guaranteed card-holder revenue. NetJets captain upgrade times are 3-5 years from hire; compensation reaches $180K-$240K at the senior captain level. Fractional flying also builds multi-aircraft type experience faster than most single-client flight departments. Apply to all three fractionals simultaneously.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  air_traffic_controller: pool(
    { title: 'Apply to the FAA\'s ATC Hiring Announcement Immediately — Vacancies Close in Days', description: 'The FAA is approximately 3,000 controllers below its target staffing level and is running near-continuous hiring announcements on USAJobs.gov for the Air Traffic Control Specialist (ATCS) series (GS-2152). The three qualification paths are: (1) ATCS with prior military or civilian ATC experience; (2) Collegiate Training Initiative (CTI) graduates with FAA-approved diplomas; (3) General Public announcements (no experience required). All paths require passing the AT-SAT (Air Traffic Selection and Training) test and biographical questionnaire. Monitor USAJobs.gov with an alert set for "2152" and apply within 24 hours of vacancy posting.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '7 days — apply immediately', priority: 'Critical' },
    { title: 'Complete the FAA Academy Program in Oklahoma City and Qualify at Your Assigned Facility', description: 'After selection, new ATCS hires attend the FAA Academy in Oklahoma City (6-12 months of classroom and simulation training). Academy failure rates run 15-25% — preparation matters. Use ATC simulator software (ATCSim, VRC for VATSIM) to build radar scan technique before reporting. After Academy, facility qualification is the next milestone — controllers who earn a full CPC (Certified Professional Controller) certification within 2-3 years access the GS-12/13/14 pay scale ($95K-$155K depending on facility LEVEL classification). Apply to terminal Level 5 or en route facilities in CONUS high-cost metros for maximum pay.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Pursue NATCA Involvement and Obtain FCC Restricted Radiotelephone Operator Permit', description: 'The National Air Traffic Controllers Association (NATCA) negotiates directly with FAA on staffing ratios, overtime rates, and facility classifications. NATCA-represented controllers at Level 12 facilities (New York TRACON, Los Angeles ARTCC, Chicago O\'Hare Tower) earn $140K-$175K with overtime that regularly pushes total pay over $180K. The FCC Restricted Radiotelephone Operator Permit (required for operating on aviation frequencies) takes 30 minutes to apply for online at $65 — do this immediately. Also contribute to VATSIM as an ATC provider to stay current on scan technique between operational positions.', layerFocus: 'L4 · Network', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  aviation_mechanic_ap: pool(
    { title: 'Obtain Your A&P Certificate (Airframe and Powerplant) and Apply to Major MROs', description: 'The FAA Airframe and Powerplant (A&P) mechanic certificate is the core credential for all civilian aviation maintenance. Requirements: 30 months of practical experience (or FAA-approved Part 147 school) + written, oral, and practical exams for both Airframe and Powerplant ratings. Top MRO (Maintenance, Repair, and Overhaul) employers — Delta TechOps, United MRO, American Airlines Technical Operations, AAR Corp, HAECO, ST Aerospace — hire A&P mechanics at $65K-$95K base with 5-8% annual increases under IBT or IAM union contracts. Apply to all major MROs this month.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    { title: 'Earn Your Inspection Authorization (IA) for Senior MRO and Regulatory Roles', description: 'The FAA Inspection Authorization (IA) certification (requires 3+ years A&P experience + passing FAA exam) authorizes a mechanic to perform annual inspections on certificated aircraft and sign off on major repairs and alterations. IA holders at major MROs earn $95K-$120K base vs. $75K-$85K for non-IA A&Ps. IAs also qualify for Quality Assurance inspector roles — a track toward $100K-$130K QA management positions at Delta TechOps and United MRO. Study the FAR Part 65 IA requirements and file FAA Form 8610-1 for the next examination cycle.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in High-Value Aircraft Types (B787, A320neo, B737 MAX) for Premium Pay', description: 'Aircraft type specialization dramatically increases compensation. Boeing 787 Dreamliner mechanics (composite structure, ETOPS systems) earn $95K-$120K at MROs — premium vs. $65K-$75K for older narrowbody mechanics. A320neo (LEAP/PW1100G engines) specialists are in high demand as Airbus deliveries surge. Apply for manufacturer-sponsored type training (Delta TechOps partners with Boeing for free 787 training for current employees). B737 MAX return-to-service work also commands overtime premiums.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '120 days', priority: 'High' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  aerospace_engineer_structures: pool(
    { title: 'Develop Expertise in Composite Structures and Finite Element Analysis (FEA)', description: 'Composite structures (carbon fiber, titanium honeycomb) now constitute 50-53% of the Boeing 787 and Airbus A350 airframes. Aerospace structural engineers with hands-on FEA (Nastran, ABAQUS, Ansys) and composite design experience earn $125K-$175K vs. $95K-$120K for generalists. Boeing Commercial Airplanes (BCA), Northrop Grumman, Lockheed Martin Aeronautics, and Spirit AeroSystems are actively hiring structural analysis engineers. Complete the Nastran MSC course ($2,500 online) and build a composites analysis portfolio in your next 90 days.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Obtain a PE License (Professional Engineer) for Senior Structural Design Authority Roles', description: 'PE licensure (requires NCEES FE exam + 4 years engineering experience + PE exam) unlocks Structural Design Authority roles — the senior engineering positions that provide DER (Designated Engineering Representative) approval authority. DER-authorized engineers earn $160K-$210K and are in acute shortage at Boeing, Lockheed Martin, Northrop Grumman, and GE Aerospace. The PE exam costs $375 (NCEES); budget 6 months of study.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to Boeing BCA, Lockheed Martin Aero, or Northrop Grumman — All Running Active Campaigns', description: 'Boeing Commercial Airplanes is hiring 10,000+ engineers over the next 3 years for the 737 MAX stabilization and 777X production ramp. Lockheed Martin is expanding F-35 production (3,000 aircraft backlog). Northrop Grumman B-21 Raider production is entering full-rate. All three carry active reqs for structures engineers with 3-10 years experience at $115K-$175K base + 10-15% bonus. Apply to all three simultaneously — no non-compete conflicts for civilian engineers.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  aerospace_engineer_propulsion: pool(
    { title: 'Specialize in Advanced Turbofan Thermodynamics and SAF (Sustainable Aviation Fuel) Integration', description: 'Sustainable Aviation Fuel (SAF) integration, next-generation turbofan efficiency (RISE — CFM\'s Revolutionary Innovation for Sustainable Engines), and geared turbofan optimization (Pratt & Whitney GTF) are the three fastest-growing propulsion specializations in 2026. GE Aerospace (Cincinnati, Ohio), Pratt & Whitney (East Hartford, CT), and Rolls-Royce (Indianapolis) are running active campaigns for propulsion thermodynamics engineers. The DOE and FAA CLEEN program fund $250M+ annually in propulsion R&D. Align your research portfolio with SAF combustion or cycle efficiency and apply to all three OEMs.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '60 days', priority: 'Critical' },
    { title: 'Earn an AIAA (American Institute of Aeronautics and Astronautics) Propulsion and Energy Award or Publication', description: 'AIAA Propulsion and Energy Forum publications and technical papers are the strongest credential differentiators for senior propulsion engineers. A peer-reviewed AIAA journal paper on combustion efficiency, turbofan cycle analysis, or emissions reduction is worth $20K-$35K in compensation premium at GE Aerospace, Pratt & Whitney, and DARPA contractors. Submit an abstract for the next AIAA SciTech Forum (January) — abstracts are due 4-5 months in advance.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '120 days', priority: 'Critical' },
    { title: 'Pursue an Advanced Degree or Certification in Turbomachinery or Combustion Dynamics', description: 'Propulsion engineers with M.S. or Ph.D. in aerospace engineering + turbomachinery focus earn $150K-$195K at OEMs vs. $95K-$130K for B.S.-only engineers. The VKI (Von Karman Institute) lectures on turbomachinery and the Purdue AAE turbomachinery short course ($3,500 / week) are the fastest professional development paths for working engineers. Target the Purdue short course or the Penn State ARL turbine program this year.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  avionics_technician: pool(
    { title: 'Earn an FCC Restricted Radiotelephone Operator Permit and Manufacturer Certifications (Garmin, Collins, Honeywell)', description: 'Avionics technicians who hold FCC Restricted Radiotelephone Operator Permits and manufacturer-specific certifications (Garmin GTN/GFC series, Collins Aerospace Pro Line Fusion, Honeywell Primus Epic) earn $20K-$35K more than general A&P-only technicians. The FCC permit costs $65 and takes 30 minutes to apply. Manufacturer training: Garmin Aviation dealer certification is available free to employees of authorized service centers; Collins and Honeywell run paid training ($2,000-$4,500 per platform). Get your FCC permit this week and pursue one manufacturer cert in the next 90 days.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '7 days for FCC; 90 days for manufacturer cert', priority: 'Critical' },
    { title: 'Transition to Airline MRO Avionics for Union Scale and Stability', description: 'Avionics technicians at major airline MROs (Delta TechOps, United MRO, American Tech Ops) earn $85K-$115K base under IAMAW (International Association of Machinists and Aerospace Workers) contracts — 15-25% above regional repair station rates. Apply to all three major carriers\' MRO operations. Delta TechOps in Atlanta is particularly aggressive in hiring IFE (In-Flight Entertainment) systems technicians and fly-by-wire avionics specialists due to their A330 and B767 widebody fleet.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Build Expertise in ADS-B, NextGen Systems, and Synthetic Vision for Premium Specialization', description: 'NextGen ADS-B Out mandate (FAR 91.227) drove a decade of avionics upgrades, and NextGen ADS-B In (traffic and weather in cockpit) is now the upgrade cycle. Avionics technicians certified in ADS-B, synthetic vision systems (Garmin GI 275, Avidyne IFD series), and WAAS/LPV approach systems can charge $125-$185/hour at independent shops or earn $105K-$130K base at avionics service centers. Complete the Garmin Aviation Advanced Tech Program through an authorized center.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  aerospace_project_manager: pool(
    { title: 'Earn PMP Certification and Apply to Boeing, Lockheed Martin, or Northrop Program Management Office', description: 'Program management in aerospace is governed by FAR/DFARS acquisition requirements (government contracts) and AS9100 quality systems. PMP ($555 exam) plus 4,500 hours leading projects is the baseline credential. Boeing\'s 737 MAX recovery, Lockheed\'s F-35 Block 4 software, and Northrop\'s B-21 production all have active PMO hiring — program managers with aerospace manufacturing experience earn $145K-$195K base + performance bonuses. Apply to all three companies\' PMO reqs now.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months for PMP; 14 days for applications', priority: 'Critical' },
    { title: 'Obtain SAP/Oracle ERP Aerospace Module Experience for Manufacturing PM Roles', description: 'Aerospace manufacturers and Tier 1 suppliers (Spirit AeroSystems, TransDigm, Heico, Moog) require program managers who understand MRP/ERP systems (SAP ECC or S/4HANA aerospace modules, Oracle Manufacturing Cloud). PMs with SAP Aerospace Manufacturing module experience earn $165K-$220K. If your current role uses SAP or Oracle, volunteer to lead the next ERP configuration or module upgrade project — this builds the portfolio piece.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    { title: 'Build a Space/Defense Clearance Portfolio for Premium Defense Program Management', description: 'Defense aerospace program managers with active Secret or Top Secret/SCI clearances earn 20-40% above commercial aerospace peers. Programs like the F-35, B-21, Next-Generation Air Dominance (NGAD), and T-7A Red Hawk Red Hawk require PM teams with Defense Industrial Security Clearance (DISCO) eligibility. If you have a prior clearance, contact your FSO immediately to reinstate. If you are clearance-eligible, contact Leidos, L3Harris, Raytheon, or SAIC — all sponsor clearances for aerospace PMs.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  uav_operator_commercial: pool(
    { title: 'Earn FAA Part 107 Remote Pilot Certificate and Apply to Enterprise UAS Operators', description: 'The FAA Part 107 Remote Pilot Certificate ($175 written exam at a PSI testing center) is the legal requirement for commercial UAS operations. Enterprise UAS operators — American Robotics, Percepto, Skydio, Joby Aviation, Zipline, Wingcopter — all require Part 107 as baseline. Beyond Part 107, pursue FAA Part 107 waiver experience (night operations, beyond visual line of sight / BVLOS) — BVLOS waivers are the premium skill that unlocks $85K-$115K enterprise operator roles. Apply to all five enterprise operators simultaneously.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days for exam; 60 days for applications', priority: 'Critical' },
    { title: 'Develop Expertise in UAS Data Processing (Photogrammetry, LiDAR, Thermal Imaging)', description: 'Commercial UAS operators who can process and analyze drone-collected data (Pix4D or Agisoft Metashape for photogrammetry; DJI Terra for mapping; FLIR thermal analysis) earn $75K-$105K vs. $55K-$70K for pure fly-only operators. The intersection of UAS + GIS (ESRI ArcGIS certification, $450) opens infrastructure inspection, precision agriculture, and public safety applications with premium pay. Complete the Pix4D online training (free tier) and build a 5-project portfolio on photogrammetry outputs.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Target the Advanced Air Mobility (AAM) and Urban Air Mobility (UAM) Sector for Highest Growth', description: 'Joby Aviation, Archer Aviation, Lilium, Wisk Aero, Volocopter, and EHang are building the eVTOL / AAM ecosystem. Experienced UAS operators with multi-rotor expertise are the preferred candidates for operations roles at AAM companies — these are $80K-$120K roles with significant equity upside. The FAA\'s Special Federal Aviation Regulation for powered-lift certification (SFAR 103) is the regulatory path being developed now. Attend the AAM Summit or AUVSI XPONENTIAL to build direct connections.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    A_AVIATION_NETWORK.senior.high[0], A_AVIATION_NETWORK.junior.moderate[0],
  ),

  police_officer: pool(
    { title: 'Complete State POST Certification and Target Higher-Paying Jurisdictions', description: 'Police Officer Standards and Training (POST) certification is state-specific and most states have reciprocity agreements allowing lateral transfers with abbreviated re-certification. NYC ($80K-$120K+ with OT), LAPD ($70K-$110K + OT), Metro DC ($60K-$100K + OT), and Chicago PD ($67K-$98K + OT) pay 30-60% above the national median. If your current jurisdiction underpays, research reciprocity with target states (California, New York, New Jersey, Washington DC all offer POST reciprocity or abbreviated academies for certified laterals). Begin the lateral application process within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    { title: 'Apply for Federal Law Enforcement Positions at FLETC-Trained Agencies', description: 'Federal law enforcement (DEA, FBI Special Agent, ATF, HSI, Secret Service, US Marshals Service) pays GS-10 to GS-14 scale ($65K-$135K) plus Law Enforcement Availability Pay (LEAP) of 25% above base — total comp $81K-$169K. All federal LE agencies require attendance at FLETC (Federal Law Enforcement Training Centers) in Glynco, GA. State and local POST certification dramatically accelerates the hiring process — your academy record and polygraph history transfer. Apply to USAJobs.gov for the next DEA/FBI/HSI announcements this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Pursue Specialized Unit Assignment (SWAT, K-9, Narcotics, Cyber Crime) for Career Protection', description: 'Specialized unit officers are nearly immune to layoffs and staffing cuts — departments protect specialized capabilities aggressively. SWAT operators, K-9 handlers, narcotics detectives, and cyber crime investigators earn $10K-$25K above base through specialty pay and overtime access. Specialized unit experience also accelerates promotion to detective and sergeant tracks. Apply for the next specialized unit selection process at your department and begin physical/skills preparation.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  detective_investigator: pool(
    { title: 'Pursue the ILEA (International Law Enforcement Academy) or NW3C Investigative Training', description: 'The International Law Enforcement Academy and the National White Collar Crime Center (NW3C) offer advanced investigative courses (financial crimes, cybercrime, human trafficking, homicide investigation) that are the differentiators for detective promotion and specialized assignment. ILEA courses ($500-$2,000 per course, often agency-sponsored) are the credential bar for state and federal investigative unit assignments. Complete one advanced course per year in your target investigative specialty.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply for a Federal Task Force Officer (TFO) Position for Career Expansion', description: 'FBI Safe Streets Task Forces, DEA Enforcement Task Forces, and HSI Cyber Action Teams deputize local detectives as Task Force Officers (TFOs). TFO positions dramatically increase career capital — you build federal investigative techniques, federal case law familiarity, and direct relationships with prosecutors and federal agents. Most TFO positions come with federal case support resources unavailable at local agencies. Contact your local FBI field office\'s TFO coordinator or your department\'s liaison unit.', layerFocus: 'L4 · Network', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    { title: 'Build Court Testimony and Expert Witness Capability for Investigative Credibility', description: 'Detectives with a track record of successful prosecutorial testimony earn case-result credibility scores that directly influence promotion and elite unit selection. Take the NIJ National Forensic Science Technology Center expert witness training ($0-$500 depending on agency sponsorship). Document your court appearance record and conviction rates — this becomes a portfolio piece for promotion boards and lateral applications to higher-paying jurisdictions or federal agencies.', layerFocus: 'L3 · Reputation', riskReductionPct: 24, deadline: '90 days', priority: 'High' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  firefighter: pool(
    { title: 'Obtain NFPA Firefighter I/II Certification and Apply to Career Fire Departments', description: 'Volunteer and combination firefighters seeking career (paid) positions must hold NFPA 1001 Firefighter I and II certifications — the universal credential across career fire departments. The IFSTA (International Fire Service Training Association) Essentials series is the standard textbook. Career fire departments in high-pay metro areas (LA County Fire, Miami-Dade Fire Rescue, Phoenix FD) pay $75K-$110K base with overtime bringing total comp to $95K-$140K. Civil service exams open periodically — register at every target department\'s HR portal for exam notifications.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Earn Paramedic Certification (EMT-P) for Firefighter/Medic Dual-Role Premium Pay', description: 'Departments that operate as combination fire/EMS agencies (the majority of large metro departments) pay firefighter/paramedics $10K-$18K above single-role firefighters. EMT-P certification requires 1,200-1,800 hours of training ($3,000-$8,000 at community colleges) plus a state licensure exam (NREMT-P). Departments like LA County, Miami-Dade, and Dallas FD actively recruit dual-certified firefighter/medics. Enroll in a paramedic program this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Join the IAFF and Pursue Specialized Rescue Certification (HazMat, Technical Rescue, Swift Water)', description: 'IAFF membership provides CBA intelligence, promotional exam study materials, and access to the IAFF Alfred W. Whitehead Memorial Education Center training grants ($1,000-$5,000). Specialized rescue certifications — NFPA 1006 Technical Rescue (confined space, trench, high-angle, structural collapse), HazMat Operations/Technician, and Swift Water Rescue — earn specialty pay ($2K-$8K annually) and dramatically reduce layoff/force-reduction risk as specialized units are protected across budget cycles.', layerFocus: 'L4 · Network', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  fire_captain: pool(
    { title: 'Complete Fire Officer I/II (NFPA 1021) and Apply for Promotional Examination', description: 'Fire Officer I and II certification (NFPA 1021) is the credential bar for promotional exams to captain across most career fire departments. The IFSTA Fire and Emergency Services Company Officer textbook + Executive Fire Officer Program (EFOP) at the National Fire Academy in Emmitsburg, MD are the preparation pathway. Captain promotion brings $85K-$135K base + overtime and opens the battalion chief / division chief career track. Schedule NFPA 1021 testing this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Pursue the Executive Fire Officer Program (EFOP) at the National Fire Academy for Chief Track', description: 'The Executive Fire Officer Program (EFOP) at the National Fire Administration\'s National Fire Academy is a 4-year program requiring a 2-week residence per year in Emmitsburg, MD. EFOP designation is the gold-standard credential for fire chief and assistant chief positions ($120K-$185K in major metro departments). Courses are free to career firefighters; apply for the next class year admission window. EFOP graduates are directly recruited by major metro departments facing planned retirements in command staff.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Build Grant Writing and FEMA AFG Grant Expertise for Budget Protection', description: 'Fire captains who develop grant writing expertise for FEMA Assistance to Firefighters Grant (AFG) and SAFER (Staffing for Adequate Fire and Emergency Response) programs become indispensable to department administration. AFG awards $360M+ annually for equipment and training; SAFER awards $360M+ for staffing. A captain who directly funds a SAFER grant that protects 5 positions is untouchable in any budget cycle. Contact your state fire marshal\'s office for AFG application training.', layerFocus: 'L3 · Reputation', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  corrections_officer: pool(
    { title: 'Complete State Corrections Academy and Apply to Federal BOP for Higher Pay', description: 'Federal Bureau of Prisons (BOP) corrections officers (Correctional Officer GS-6/7/8 series) earn $57K-$82K base + Law Enforcement Availability Pay (LEAP) + locality pay — 20-40% above most state systems. BOP positions require passing a written exam, physical fitness test, and background investigation. Apply to USAJobs.gov for the next BOP Correctional Officer announcement this week. Most state corrections POST certifications partially satisfy BOP hiring requirements.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    { title: 'Pursue Corrections Sergeant/Lieutenant Examination for Supervisory Premium Pay', description: 'Most state corrections systems conduct promotional examinations for sergeant (typically $52K-$70K vs. $42K-$58K officer) and lieutenant ($68K-$85K) on annual or biennial cycles. Passing the promotional exam requires study of the department\'s policies and procedures manual plus behavioral assessments. Study materials from the NIC (National Institute of Corrections) are available free online. Supervisory positions are far more layoff-resistant than line officer positions during budget cuts.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    { title: 'Build Mental Health Crisis Intervention Training (CIT) for Specialized Unit Access', description: 'Corrections facilities increasingly require officers with Mental Health First Aid (MHFA) and Crisis Intervention Team (CIT) certification to manage mental health crises, which constitute 30-40% of all use-of-force incidents. Officers with CIT certification earn specialized assignment to mental health units, which carry $3K-$8K specialty pay differentials. The NAMI CIT training is typically 40 hours and agency-sponsored — request enrollment in the next available class.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'Medium' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  probation_parole_officer: pool(
    { title: 'Pursue Federal Probation Officer Position (USPO) for Premium Pay and Career Stability', description: 'US Probation Officers (USPO) under federal courts earn GS-9/11/12 scale ($65K-$110K) plus judicial branch benefits — superior to most state probation systems. The Judicial Conference of the United States supervises USPOs; each federal district court administers its own hiring. Apply directly to the probation office of your target federal district via JNET (Judiciary Net) postings. A bachelor\'s degree in criminal justice, social work, or psychology + 2 years field experience qualifies you for the GL-9 entry level.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    { title: 'Earn a Master\'s Degree in Criminal Justice or Social Work for Senior Caseload Management Roles', description: 'Senior probation and parole supervisors, pretrial services officers, and specialized caseload officers (sex offender unit, gang unit, mental health court) typically require a master\'s degree in criminal justice, social work (MSW), or counseling. An MSW or MCJ opens supervisor and program manager tracks at $75K-$100K. Most state parole boards sponsor tuition reimbursement ($5,250/year IRS exclusion). Enroll in an online MSW program (USC, Fordham, Michigan) that permits part-time completion in 2-3 years while working.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '6 months', priority: 'High' },
    { title: 'Obtain Evidence-Based Risk Assessment Tool Certification (LSI-R, ORAS, Static-99)', description: 'Probation and parole officers who are certified in evidence-based risk assessment tools (Level of Service Inventory-Revised / LSI-R, Ohio Risk Assessment System / ORAS, Static-99 for sex offenders) become training supervisors and quality assurance leads — roles that pay $65K-$90K vs. $55K-$72K for general officers. The NIC (National Institute of Corrections) and BJA offer free online training for most of these instruments. Complete the next available training cycle.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'Medium' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  security_manager_physical: pool(
    { title: 'Pursue CPP (Certified Protection Professional) Certification from ASIS International', description: 'The CPP (Certified Protection Professional) from ASIS International is the gold-standard credential for physical security management — the CISSP equivalent for the physical security world. CPP holders ($395 exam + 9 years security management experience) earn $105K-$145K base vs. $80K-$105K for uncertified managers. Top employers at this level: Amazon Global Security Operations, Google Global Security, Meta Physical Security, Fortune 500 CISO offices, and major retail/financial institution security programs. Apply for the CPP exam this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Expertise in Integrated Security Systems (Lenel, Software House, Genetec VMS)', description: 'Physical security managers who understand access control platforms (Lenel OnGuard, Software House C-Cure 9000, Genetec Security Center) and video management systems (Axis Camera Station, Milestone XProtect, Genetec VMS) earn $15K-$25K more than operations-only managers. These platforms are enterprise standards at Fortune 500 companies. Pursue vendor-authorized training: Lenel Certified Integrator Training ($1,500) or Genetec Certified Integration Specialist ($800). Hands-on configuration experience is the resume differentiator.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    { title: 'Pursue a Corporate Director of Security Role at a Tech Company for Premium Pay', description: 'Technology company physical security directors (Amazon, Google, Meta, Apple, Microsoft) earn $145K-$210K base — 40-70% above traditional corporate security. These roles require CPP or equivalent + experience managing global security operations centers (GSOCs) and executive protection programs. Apply to all five FAANG physical security director openings on LinkedIn within 14 days — tech company security organizations are aggressively expanding.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  emergency_management_coordinator: pool(
    { title: 'Earn FEMA Professional Development Series (PDS) and Apply for Emergency Management Specialist Positions', description: 'The FEMA Professional Development Series (PDS) — a curriculum of 7 online courses culminating in a PDS certificate — is the career baseline for emergency management coordinators. Beyond PDS, the Emergency Management Professional Program (EMPP) includes the Emergency Management Basic (EMB) and Executive Academy for State and Local Officials. Federal FEMA positions (GS-11 to GS-14, $75K-$135K) and FEMA Corps Cadres are posted on USAJobs.gov. Apply to your State Emergency Management Agency (SEMA) and FEMA Region office simultaneously.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Obtain ICS/NIMS G-300/G-400 Credentials and Pursue Incident Commander Qualification', description: 'The Incident Command System (ICS) G-300 (Intermediate ICS for Expanding Incidents) and G-400 (Advanced ICS for Command and General Staff) are the career-differentiating credentials that qualify coordinators for Operations Section Chief and Incident Commander roles on complex multi-agency incidents. These courses are free through FEMA/EMI and available in-person or online. Incident Commanders earn $90K-$115K at the county/state level and can supplement income with disaster relief deployments ($45-$65/hour consultant rate).', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    { title: 'Build Private Sector Emergency Management Experience at Fortune 500 BCP Roles', description: 'Business Continuity Planners (BCPs) and resilience managers at Fortune 500 companies earn $95K-$140K — significantly above most government emergency management positions. The DRII CBCP (Certified Business Continuity Professional, $395) or BCI MBCI credential is the translation path. These roles require ISO 22301 knowledge and experience running tabletop exercises for enterprise risk scenarios. Apply to corporate resilience manager roles at JPMorgan, Amazon, Google, and large hospital systems — all are hiring aggressively.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  forensic_scientist: pool(
    { title: 'Earn AAFS Membership and Pursue ABC (American Board of Criminalistics) or ABFT Certification', description: 'The American Academy of Forensic Sciences (AAFS) is the premier professional organization for forensic scientists across all 11 forensic disciplines. Fellow membership requires peer review and publication. The American Board of Criminalistics (ABC) Diplomate credential and the American Board of Forensic Toxicology (ABFT) certification are the employer-valued credentials for lab leadership tracks. FBI Laboratory forensic scientists earn $85K-$135K (GS-11/12/13/14); DEA forensic chemists earn $80K-$120K. Apply to AAFS membership and the next ABC examination cycle this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Become Proficient in LIMS (LabVantage or Thermo Scientific LIMS) for Lab Informatics Roles', description: 'Forensic laboratories running LabVantage or Thermo Scientific LIMS platforms urgently need forensic scientists who can also serve as LIMS administrators and superusers — this intersection of technical forensic expertise and informatics earns $15K-$25K premium. Forensic LIMS admins at major state crime labs and the FBI CJIS Division earn $90K-$115K. If your current lab uses LabVantage, volunteer to lead the next LIMS configuration project or module implementation. LIMS vendor training ($2,000-$3,500) is worth the investment.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Build Court Testimony Expertise and Expert Witness Qualification', description: 'Forensic scientists who are qualified as expert witnesses in specific evidentiary areas (DNA, toxicology, trace evidence, digital forensics, latent prints, firearms/toolmarks) generate court testimony hours that supplement lab salaries by $300-$800/day. The AAFS Expert Witness Workshop and the NIJ (National Institute of Justice) expert witness training program are the preparation paths. A state or federal court qualification in your specialty is the strongest career protection signal in forensic science — no AI can qualify as an expert witness.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),

  crime_scene_investigator: pool(
    { title: 'Earn IACIS or IAI Certified Crime Scene Investigator (CCSI) Credential', description: 'The International Association for Identification (IAI) Certified Crime Scene Investigator (CCSI) credential is the gold-standard for CSI career advancement. CCSI requires 40 hours of crime scene coursework + 3 years CSI experience + passing a written exam ($150 application fee). IAI-certified CSIs at major metropolitan departments (NYPD CSU, LAPD SID, Dallas PD CSU) earn $72K-$95K base — 15-25% above uncertified peers. Also pursue the IAI Latent Print Examiner (CLPE) if your specialty involves fingerprint analysis.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Build Expertise in 3D Crime Scene Scanning (Leica Geosystems RTC360 or FARO Focus Laser Scanner)', description: '3D laser scanning crime scene documentation is now standard practice at major metro departments and federal agencies. Leica Geosystems RTC360 and FARO Focus S 70/150/350 operators are in acute shortage — only 200-300 qualified CSIs nationally. Leica Geosystems training certification ($3,500 course at their North American Training Centers) qualifies you for major crime unit assignment and earns $10K-$20K specialty pay differential. CSIs with 3D scanning expertise are recruited nationally by DA offices and federal agencies.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue Digital Evidence Collection and Mobile Device Forensics Certification (CDFE or Cellebrite Certified Operator)', description: 'Crime scene investigators who can collect and preserve digital evidence (mobile devices, computers, wearables, cloud evidence) earn $15K-$25K above traditional physical-evidence-only CSIs. The Cellebrite Certified Operator (CCO) and Certified Digital Forensics Examiner (CDFE from Mile2, $495) are the credentials. Most large departments have UFED units collecting dust because trained operators are scarce. Volunteer for digital evidence collection training at your current department or apply to the next IACIS forensics conference.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    A_PUBLIC_SAFETY_NETWORK.senior.high[0], A_PUBLIC_SAFETY_NETWORK.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_AVIATION_PUBLIC_SAFETY: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Aviation — commercial pilot
  'commercial pilot': { canonicalKey: 'commercial_pilot_airline', displayRole: 'Commercial Airline Pilot' },
  'airline pilot': { canonicalKey: 'commercial_pilot_airline', displayRole: 'Airline Pilot' },
  'airline captain': { canonicalKey: 'commercial_pilot_airline', displayRole: 'Airline Captain' },
  'captain airline': { canonicalKey: 'commercial_pilot_airline', displayRole: 'Airline Captain' },
  'part 121 pilot': { canonicalKey: 'commercial_pilot_airline', displayRole: 'Part 121 Airline Pilot' },
  'atp pilot': { canonicalKey: 'commercial_pilot_airline', displayRole: 'ATP-Certified Airline Pilot' },

  // Aviation — first officer
  'first officer': { canonicalKey: 'first_officer_airline', displayRole: 'First Officer (Airline)' },
  'airline first officer': { canonicalKey: 'first_officer_airline', displayRole: 'Airline First Officer' },
  'regional airline pilot': { canonicalKey: 'first_officer_airline', displayRole: 'Regional Airline Pilot' },
  'co pilot airline': { canonicalKey: 'first_officer_airline', displayRole: 'Airline Co-Pilot' },

  // Aviation — corporate pilot
  'corporate pilot': { canonicalKey: 'corporate_pilot', displayRole: 'Corporate Pilot' },
  'business aviation pilot': { canonicalKey: 'corporate_pilot', displayRole: 'Business Aviation Pilot' },
  'charter pilot': { canonicalKey: 'corporate_pilot', displayRole: 'Charter Pilot' },
  'fractional pilot': { canonicalKey: 'corporate_pilot', displayRole: 'Fractional Ownership Pilot' },
  'part 91 pilot': { canonicalKey: 'corporate_pilot', displayRole: 'Part 91 Corporate Pilot' },
  'part 135 pilot': { canonicalKey: 'corporate_pilot', displayRole: 'Part 135 Charter Pilot' },

  // Aviation — ATC
  'air traffic controller': { canonicalKey: 'air_traffic_controller', displayRole: 'Air Traffic Controller' },
  'atc controller': { canonicalKey: 'air_traffic_controller', displayRole: 'ATC Controller' },
  'radar controller': { canonicalKey: 'air_traffic_controller', displayRole: 'Radar Controller' },
  'en route controller': { canonicalKey: 'air_traffic_controller', displayRole: 'En Route ATC Controller' },
  'approach controller': { canonicalKey: 'air_traffic_controller', displayRole: 'Approach Control Specialist' },
  'tower controller': { canonicalKey: 'air_traffic_controller', displayRole: 'Tower Controller' },

  // Aviation — mechanic
  'aviation mechanic': { canonicalKey: 'aviation_mechanic_ap', displayRole: 'Aviation Mechanic (A&P)' },
  'aircraft mechanic': { canonicalKey: 'aviation_mechanic_ap', displayRole: 'Aircraft Mechanic' },
  'ap mechanic': { canonicalKey: 'aviation_mechanic_ap', displayRole: 'Airframe & Powerplant Mechanic' },
  'airframe mechanic': { canonicalKey: 'aviation_mechanic_ap', displayRole: 'Airframe Mechanic' },
  'powerplant mechanic': { canonicalKey: 'aviation_mechanic_ap', displayRole: 'Powerplant Mechanic' },
  'mro technician': { canonicalKey: 'aviation_mechanic_ap', displayRole: 'MRO Technician' },

  // Aviation — structures engineer
  'aerospace engineer structures': { canonicalKey: 'aerospace_engineer_structures', displayRole: 'Aerospace Structures Engineer' },
  'structural aerospace engineer': { canonicalKey: 'aerospace_engineer_structures', displayRole: 'Aerospace Structural Engineer' },
  'aircraft structures engineer': { canonicalKey: 'aerospace_engineer_structures', displayRole: 'Aircraft Structures Engineer' },
  'stress engineer aerospace': { canonicalKey: 'aerospace_engineer_structures', displayRole: 'Aerospace Stress Engineer' },
  'composites engineer aerospace': { canonicalKey: 'aerospace_engineer_structures', displayRole: 'Aerospace Composites Engineer' },

  // Aviation — propulsion engineer
  'aerospace engineer propulsion': { canonicalKey: 'aerospace_engineer_propulsion', displayRole: 'Aerospace Propulsion Engineer' },
  'propulsion engineer': { canonicalKey: 'aerospace_engineer_propulsion', displayRole: 'Propulsion Engineer' },
  'jet engine engineer': { canonicalKey: 'aerospace_engineer_propulsion', displayRole: 'Jet Engine Engineer' },
  'turbine engineer': { canonicalKey: 'aerospace_engineer_propulsion', displayRole: 'Turbine Engineer' },
  'combustion engineer aerospace': { canonicalKey: 'aerospace_engineer_propulsion', displayRole: 'Aerospace Combustion Engineer' },

  // Aviation — avionics
  'avionics technician': { canonicalKey: 'avionics_technician', displayRole: 'Avionics Technician' },
  'avionics tech': { canonicalKey: 'avionics_technician', displayRole: 'Avionics Technician' },
  'avionics engineer': { canonicalKey: 'avionics_technician', displayRole: 'Avionics Engineer' },
  'aircraft electronics technician': { canonicalKey: 'avionics_technician', displayRole: 'Aircraft Electronics Technician' },
  'ife technician': { canonicalKey: 'avionics_technician', displayRole: 'In-Flight Entertainment Technician' },

  // Aviation — project manager
  'aerospace project manager': { canonicalKey: 'aerospace_project_manager', displayRole: 'Aerospace Project Manager' },
  'aerospace program manager': { canonicalKey: 'aerospace_project_manager', displayRole: 'Aerospace Program Manager' },
  'aviation program manager': { canonicalKey: 'aerospace_project_manager', displayRole: 'Aviation Program Manager' },
  'defense program manager': { canonicalKey: 'aerospace_project_manager', displayRole: 'Defense Program Manager' },

  // Aviation — UAV
  'uav operator': { canonicalKey: 'uav_operator_commercial', displayRole: 'UAV Operator' },
  'drone operator': { canonicalKey: 'uav_operator_commercial', displayRole: 'Commercial Drone Operator' },
  'uas pilot': { canonicalKey: 'uav_operator_commercial', displayRole: 'UAS Pilot' },
  'rpas operator': { canonicalKey: 'uav_operator_commercial', displayRole: 'RPAS Operator' },
  'part 107 pilot': { canonicalKey: 'uav_operator_commercial', displayRole: 'FAA Part 107 Pilot' },
  'evtol pilot': { canonicalKey: 'uav_operator_commercial', displayRole: 'eVTOL / AAM Pilot' },

  // Public Safety — police
  'police officer': { canonicalKey: 'police_officer', displayRole: 'Police Officer' },
  'law enforcement officer': { canonicalKey: 'police_officer', displayRole: 'Law Enforcement Officer' },
  'patrol officer': { canonicalKey: 'police_officer', displayRole: 'Patrol Officer' },
  'deputy sheriff': { canonicalKey: 'police_officer', displayRole: 'Deputy Sheriff' },
  'state trooper': { canonicalKey: 'police_officer', displayRole: 'State Trooper' },
  'campus police officer': { canonicalKey: 'police_officer', displayRole: 'Campus Police Officer' },

  // Public Safety — detective
  'detective': { canonicalKey: 'detective_investigator', displayRole: 'Detective' },
  'criminal investigator': { canonicalKey: 'detective_investigator', displayRole: 'Criminal Investigator' },
  'detective investigator': { canonicalKey: 'detective_investigator', displayRole: 'Detective / Investigator' },
  'homicide detective': { canonicalKey: 'detective_investigator', displayRole: 'Homicide Detective' },
  'financial crimes investigator': { canonicalKey: 'detective_investigator', displayRole: 'Financial Crimes Investigator' },

  // Public Safety — firefighter
  'firefighter': { canonicalKey: 'firefighter', displayRole: 'Firefighter' },
  'fire fighter': { canonicalKey: 'firefighter', displayRole: 'Firefighter' },
  'firefighter emt': { canonicalKey: 'firefighter', displayRole: 'Firefighter / EMT' },
  'firefighter paramedic': { canonicalKey: 'firefighter', displayRole: 'Firefighter / Paramedic' },
  'fire rescue technician': { canonicalKey: 'firefighter', displayRole: 'Fire & Rescue Technician' },

  // Public Safety — fire captain
  'fire captain': { canonicalKey: 'fire_captain', displayRole: 'Fire Captain' },
  'fire lieutenant': { canonicalKey: 'fire_captain', displayRole: 'Fire Lieutenant' },
  'fire battalion chief': { canonicalKey: 'fire_captain', displayRole: 'Fire Battalion Chief' },
  'fire company officer': { canonicalKey: 'fire_captain', displayRole: 'Fire Company Officer' },

  // Public Safety — corrections
  'corrections officer': { canonicalKey: 'corrections_officer', displayRole: 'Corrections Officer' },
  'correctional officer': { canonicalKey: 'corrections_officer', displayRole: 'Correctional Officer' },
  'detention officer': { canonicalKey: 'corrections_officer', displayRole: 'Detention Officer' },
  'jail officer': { canonicalKey: 'corrections_officer', displayRole: 'Jail Officer' },
  'bop officer': { canonicalKey: 'corrections_officer', displayRole: 'Federal Bureau of Prisons Officer' },

  // Public Safety — probation/parole
  'probation officer': { canonicalKey: 'probation_parole_officer', displayRole: 'Probation Officer' },
  'parole officer': { canonicalKey: 'probation_parole_officer', displayRole: 'Parole Officer' },
  'probation parole officer': { canonicalKey: 'probation_parole_officer', displayRole: 'Probation / Parole Officer' },
  'pretrial services officer': { canonicalKey: 'probation_parole_officer', displayRole: 'Pretrial Services Officer' },
  'community supervision officer': { canonicalKey: 'probation_parole_officer', displayRole: 'Community Supervision Officer' },

  // Public Safety — security manager
  'security manager': { canonicalKey: 'security_manager_physical', displayRole: 'Security Manager' },
  'physical security manager': { canonicalKey: 'security_manager_physical', displayRole: 'Physical Security Manager' },
  'corporate security manager': { canonicalKey: 'security_manager_physical', displayRole: 'Corporate Security Manager' },
  'director of security': { canonicalKey: 'security_manager_physical', displayRole: 'Director of Security' },
  'security operations manager': { canonicalKey: 'security_manager_physical', displayRole: 'Security Operations Manager' },

  // Public Safety — emergency management
  'emergency management coordinator': { canonicalKey: 'emergency_management_coordinator', displayRole: 'Emergency Management Coordinator' },
  'emergency manager': { canonicalKey: 'emergency_management_coordinator', displayRole: 'Emergency Manager' },
  'business continuity manager': { canonicalKey: 'emergency_management_coordinator', displayRole: 'Business Continuity Manager' },
  'disaster preparedness coordinator': { canonicalKey: 'emergency_management_coordinator', displayRole: 'Disaster Preparedness Coordinator' },
  'homeland security coordinator': { canonicalKey: 'emergency_management_coordinator', displayRole: 'Homeland Security Coordinator' },

  // Public Safety — forensic scientist
  'forensic scientist': { canonicalKey: 'forensic_scientist', displayRole: 'Forensic Scientist' },
  'forensic chemist': { canonicalKey: 'forensic_scientist', displayRole: 'Forensic Chemist' },
  'forensic toxicologist': { canonicalKey: 'forensic_scientist', displayRole: 'Forensic Toxicologist' },
  'forensic biologist': { canonicalKey: 'forensic_scientist', displayRole: 'Forensic Biologist' },
  'dna analyst': { canonicalKey: 'forensic_scientist', displayRole: 'DNA Analyst' },
  'forensic lab analyst': { canonicalKey: 'forensic_scientist', displayRole: 'Forensic Laboratory Analyst' },

  // Public Safety — CSI
  'crime scene investigator': { canonicalKey: 'crime_scene_investigator', displayRole: 'Crime Scene Investigator' },
  'csi technician': { canonicalKey: 'crime_scene_investigator', displayRole: 'CSI Technician' },
  'crime scene technician': { canonicalKey: 'crime_scene_investigator', displayRole: 'Crime Scene Technician' },
  'forensic evidence technician': { canonicalKey: 'crime_scene_investigator', displayRole: 'Forensic Evidence Technician' },
  'latent print examiner': { canonicalKey: 'crime_scene_investigator', displayRole: 'Latent Print Examiner' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_AVIATION_PUBLIC_SAFETY: Record<string, string> = {
  commercial_pilot_airline: 'commercial_pilot_airline',
  first_officer_airline: 'first_officer_airline',
  corporate_pilot: 'corporate_pilot',
  air_traffic_controller: 'air_traffic_controller',
  aviation_mechanic_ap: 'aviation_mechanic_ap',
  aerospace_engineer_structures: 'aerospace_engineer_structures',
  aerospace_engineer_propulsion: 'aerospace_engineer_propulsion',
  avionics_technician: 'avionics_technician',
  aerospace_project_manager: 'aerospace_project_manager',
  uav_operator_commercial: 'uav_operator_commercial',
  police_officer: 'police_officer',
  detective_investigator: 'detective_investigator',
  firefighter: 'firefighter',
  fire_captain: 'fire_captain',
  corrections_officer: 'corrections_officer',
  probation_parole_officer: 'probation_parole_officer',
  security_manager_physical: 'security_manager_physical',
  emergency_management_coordinator: 'emergency_management_coordinator',
  forensic_scientist: 'forensic_scientist',
  crime_scene_investigator: 'crime_scene_investigator',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_AVIATION_PUBLIC_SAFETY: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  commercial_pilot_airline:        { roleKey: 'commercial_pilot_airline',        roleName: 'Commercial Airline Pilot (Captain)',     demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 90,  yoyJobOpeningsChange: 22,  topHiringLocations: ['Atlanta GA', 'Dallas TX', 'Chicago IL', 'Denver CO', 'Los Angeles CA'],           aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1', calibrationNote: 'Acute global pilot shortage — 12,000+ unfilled pilot seats; ALPA seniority system protects career equity.' },
  first_officer_airline:           { roleKey: 'first_officer_airline',           roleName: 'First Officer (Airline)',                demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 45,  yoyJobOpeningsChange: 28,  topHiringLocations: ['Atlanta GA', 'Houston TX', 'Minneapolis MN', 'Cincinnati OH', 'Salt Lake City UT'], aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1', calibrationNote: 'Regional feeder carriers running at minimum captain ratios; all pathway programs at record acceptance.' },
  corporate_pilot:                 { roleKey: 'corporate_pilot',                 roleName: 'Corporate / Business Aviation Pilot',   demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 60,  yoyJobOpeningsChange: 18,  topHiringLocations: ['New York NY', 'Dallas TX', 'Los Angeles CA', 'Miami FL', 'Chicago IL'],            aiSubstitutionRisk: 0.02, dataQuarter: '2026-Q1', calibrationNote: 'Business aviation expansion post-pandemic; NetJets/Flexjet hiring record cohorts of 500-800 pilots annually.' },
  air_traffic_controller:          { roleKey: 'air_traffic_controller',          roleName: 'Air Traffic Controller',                demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 365, yoyJobOpeningsChange: 15,  topHiringLocations: ['Oklahoma City OK', 'Atlanta GA', 'New York NY', 'Chicago IL', 'Los Angeles CA'],   aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'FAA 3,000 controllers below target; Academy pipeline 2-3 year lag; high timeToFill reflects training duration.' },
  aviation_mechanic_ap:            { roleKey: 'aviation_mechanic_ap',            roleName: 'Aviation Mechanic (A&P)',               demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 38,  yoyJobOpeningsChange: 14,  topHiringLocations: ['Atlanta GA', 'Dallas TX', 'Seattle WA', 'Miami FL', 'Cincinnati OH'],              aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'FAA A&P shortage mirrors pilot shortage; MRO hiring 15-20% above pre-pandemic levels for Boeing/Airbus ramps.' },
  aerospace_engineer_structures:   { roleKey: 'aerospace_engineer_structures',   roleName: 'Aerospace Structures Engineer',         demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 55,  yoyJobOpeningsChange: 16,  topHiringLocations: ['Seattle WA', 'Fort Worth TX', 'Palmdale CA', 'Huntsville AL', 'Wichita KS'],       aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Boeing 737 MAX stabilization + 777X ramp; Northrop B-21; Lockheed F-35 Block 4 all driving structures engineer demand.' },
  aerospace_engineer_propulsion:   { roleKey: 'aerospace_engineer_propulsion',   roleName: 'Aerospace Propulsion Engineer',         demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 65,  yoyJobOpeningsChange: 18,  topHiringLocations: ['Cincinnati OH', 'East Hartford CT', 'Indianapolis IN', 'Evendale OH', 'Derby UK'],  aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'RISE/GTF/CFM56 replacement programs driving propulsion engineer demand at GE Aerospace and Pratt & Whitney.' },
  avionics_technician:             { roleKey: 'avionics_technician',             roleName: 'Avionics Technician',                   demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 42,  yoyJobOpeningsChange: 12,  topHiringLocations: ['Atlanta GA', 'Dallas TX', 'Seattle WA', 'Tulsa OK', 'Miami FL'],                   aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Avionics techs scarcer than A&P generalists; Garmin/Collins/Honeywell platform specialists in acute shortage.' },
  aerospace_project_manager:       { roleKey: 'aerospace_project_manager',       roleName: 'Aerospace Project Manager',             demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 52,  yoyJobOpeningsChange: 14,  topHiringLocations: ['Seattle WA', 'Fort Worth TX', 'Huntsville AL', 'Bethesda MD', 'El Segundo CA'],    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Defense budget expansion + commercial aviation recovery driving aerospace PMO hiring; clearance a force multiplier.' },
  uav_operator_commercial:         { roleKey: 'uav_operator_commercial',         roleName: 'Commercial UAV / UAS Operator',         demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 28,  yoyJobOpeningsChange: 30,  topHiringLocations: ['San Francisco CA', 'Austin TX', 'Phoenix AZ', 'Dallas TX', 'Columbus OH'],         aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'BVLOS waiver operators and AAM/eVTOL sector creating new premium tier of UAS operator demand.' },
  police_officer:                  { roleKey: 'police_officer',                  roleName: 'Police Officer',                        demandIndex: 72, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 90,  yoyJobOpeningsChange: 12,  topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Phoenix AZ'],          aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Post-2020 staffing crisis; most departments 10-25% below authorized strength; signing bonuses common.' },
  detective_investigator:          { roleKey: 'detective_investigator',          roleName: 'Detective / Criminal Investigator',     demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 60,  yoyJobOpeningsChange: 6,   topHiringLocations: ['New York NY', 'Los Angeles CA', 'Washington DC', 'Houston TX', 'Chicago IL'],      aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Detective promotion competitive but agency staffing crises improve odds; federal TFO slots opening at record rate.' },
  firefighter:                     { roleKey: 'firefighter',                     roleName: 'Firefighter',                           demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 75,  yoyJobOpeningsChange: 10,  topHiringLocations: ['Los Angeles CA', 'Houston TX', 'Phoenix AZ', 'San Antonio TX', 'Dallas TX'],       aiSubstitutionRisk: 0.02, dataQuarter: '2026-Q1', calibrationNote: 'Career fire departments selectively hiring; wildland fire expansion driving rural department growth; dual EMT-P certification premium.' },
  fire_captain:                    { roleKey: 'fire_captain',                    roleName: 'Fire Captain',                          demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 90,  yoyJobOpeningsChange: 8,   topHiringLocations: ['Los Angeles CA', 'Houston TX', 'Miami FL', 'Phoenix AZ', 'Atlanta GA'],           aiSubstitutionRisk: 0.02, dataQuarter: '2026-Q1', calibrationNote: 'EFOP graduates in demand for command succession; retiring baby-boom cohort creating sustained captain/chief openings.' },
  corrections_officer:             { roleKey: 'corrections_officer',             roleName: 'Corrections Officer',                   demandIndex: 66, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'stable',  timeToFillDays: 45,  yoyJobOpeningsChange: 14,  topHiringLocations: ['Houston TX', 'Los Angeles CA', 'Phoenix AZ', 'Chicago IL', 'New York NY'],        aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1', calibrationNote: 'Severe staffing crisis in federal BOP and most state systems; mandatory overtime common; high retention bonuses.' },
  probation_parole_officer:        { roleKey: 'probation_parole_officer',        roleName: 'Probation / Parole Officer',            demandIndex: 68, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 45,  yoyJobOpeningsChange: 5,   topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Philadelphia PA'],   aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Stable demand; federal USPO positions most competitive; state systems face budget pressures offset by staffing shortfalls.' },
  security_manager_physical:       { roleKey: 'security_manager_physical',       roleName: 'Physical Security Manager',             demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 42,  yoyJobOpeningsChange: 16,  topHiringLocations: ['New York NY', 'Washington DC', 'San Francisco CA', 'Seattle WA', 'Dallas TX'],    aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'Tech company and corporate security expansion; CPP holders in acute shortage at senior director level.' },
  emergency_management_coordinator:{ roleKey: 'emergency_management_coordinator',roleName: 'Emergency Management Coordinator',      demandIndex: 74, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 50,  yoyJobOpeningsChange: 14,  topHiringLocations: ['Washington DC', 'Sacramento CA', 'Austin TX', 'Baton Rouge LA', 'Tampa FL'],     aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Climate disaster frequency driving FEMA and county EM hiring; private sector BCP roles now exceeding government openings.' },
  forensic_scientist:              { roleKey: 'forensic_scientist',              roleName: 'Forensic Scientist',                    demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 65,  yoyJobOpeningsChange: 14,  topHiringLocations: ['Washington DC', 'Quantico VA', 'New York NY', 'Los Angeles CA', 'Atlanta GA'],     aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'FBI Laboratory and state crime labs chronically understaffed; AAFS membership + ABC/ABFT certification unlocks lab director track.' },
  crime_scene_investigator:        { roleKey: 'crime_scene_investigator',        roleName: 'Crime Scene Investigator',              demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 55,  yoyJobOpeningsChange: 8,   topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Dallas TX'],         aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: '3D scanning specialists in extreme national shortage; digital evidence certification adds immediate premium.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_AVIATION_PUBLIC_SAFETY: Record<string, Record<string, number>> = {
  commercial_pilot_airline:        { '0-2': 65_000,  '2-5': 95_000,  '5-10': 165_000, '10-15': 265_000, '15+': 380_000 },
  first_officer_airline:           { '0-2': 65_000,  '2-5': 90_000,  '5-10': 130_000, '10-15': 158_000, '15+': 175_000 },
  corporate_pilot:                 { '0-2': 75_000,  '2-5': 102_000, '5-10': 138_000, '10-15': 168_000, '15+': 185_000 },
  air_traffic_controller:          { '0-2': 55_000,  '2-5': 85_000,  '5-10': 115_000, '10-15': 142_000, '15+': 155_000 },
  aviation_mechanic_ap:            { '0-2': 52_000,  '2-5': 68_000,  '5-10': 88_000,  '10-15': 105_000, '15+': 120_000 },
  aerospace_engineer_structures:   { '0-2': 88_000,  '2-5': 115_000, '5-10': 148_000, '10-15': 178_000, '15+': 195_000 },
  aerospace_engineer_propulsion:   { '0-2': 92_000,  '2-5': 120_000, '5-10': 155_000, '10-15': 182_000, '15+': 195_000 },
  avionics_technician:             { '0-2': 58_000,  '2-5': 76_000,  '5-10': 98_000,  '10-15': 118_000, '15+': 130_000 },
  aerospace_project_manager:       { '0-2': 95_000,  '2-5': 128_000, '5-10': 162_000, '10-15': 195_000, '15+': 220_000 },
  uav_operator_commercial:         { '0-2': 45_000,  '2-5': 65_000,  '5-10': 85_000,  '10-15': 102_000, '15+': 115_000 },
  police_officer:                  { '0-2': 50_000,  '2-5': 62_000,  '5-10': 78_000,  '10-15': 92_000,  '15+': 105_000 },
  detective_investigator:          { '0-2': 65_000,  '2-5': 82_000,  '5-10': 102_000, '10-15': 118_000, '15+': 130_000 },
  firefighter:                     { '0-2': 48_000,  '2-5': 62_000,  '5-10': 76_000,  '10-15': 88_000,  '15+': 95_000  },
  fire_captain:                    { '0-2': 82_000,  '2-5': 98_000,  '5-10': 115_000, '10-15': 128_000, '15+': 135_000 },
  corrections_officer:             { '0-2': 38_000,  '2-5': 48_000,  '5-10': 60_000,  '10-15': 70_000,  '15+': 80_000  },
  probation_parole_officer:        { '0-2': 48_000,  '2-5': 58_000,  '5-10': 70_000,  '10-15': 80_000,  '15+': 88_000  },
  security_manager_physical:       { '0-2': 68_000,  '2-5': 88_000,  '5-10': 110_000, '10-15': 132_000, '15+': 145_000 },
  emergency_management_coordinator:{ '0-2': 55_000,  '2-5': 70_000,  '5-10': 88_000,  '10-15': 105_000, '15+': 115_000 },
  forensic_scientist:              { '0-2': 52_000,  '2-5': 68_000,  '5-10': 86_000,  '10-15': 100_000, '15+': 110_000 },
  crime_scene_investigator:        { '0-2': 45_000,  '2-5': 60_000,  '5-10': 74_000,  '10-15': 85_000,  '15+': 90_000  },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_AVIATION_PUBLIC_SAFETY: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  commercial_pilot_airline: {
    strongOpener: 'I want to discuss my seniority position and compensation in the context of my current upgrade timeline. With [X total hours / Y turbine hours / Z type ratings] and my position on the [carrier] seniority list, I\'d like to explore whether there are opportunities to accelerate my captain upgrade track or improve my base before the next CBA cycle.',
    leverageContext: 'Per ALPA\'s 2026 Pilot Pay Supplement, first officers at comparable seniority positions at Delta, United, and American earn $15K-$30K more annually under their current CBAs. The pilot shortage means that hiring a replacement requires 18-24 months of training pipeline time. My CPA [captain upgrade year] is currently projected at [X year] — I\'d like to discuss early-bid options at smaller bases or reserve conversion.',
    countersScript: 'I\'m asking for a guaranteed upgrade training slot within [timeframe], or alternatively a base-transfer approval to [city] where upgrade timelines are shorter. If compensation adjustment within CBA is not available, I\'d like to discuss profit-sharing opt-in and premium reserve rates for international segments.',
    walkAwayLine: 'I have a conditional offer from [NetJets / Flexjet / competitor regional] with a shorter captain-upgrade track and equivalent total compensation. I\'d strongly prefer to remain here — but the timeline difference is significant to me personally and financially.',
  },
  air_traffic_controller: {
    strongOpener: 'I want to discuss my facility classification level and overtime bank in the context of my current performance standing. As a fully certified CPC at [facility name] with [X years experience], I\'m operating at the GS-[12/13/14] level and I\'d like to ensure my pay is aligned with my facility\'s classification.',
    leverageContext: 'The FAA is 3,000 controllers below target staffing nationwide. Replacing a CPC takes a minimum of 2-3 years from recruitment through Academy through facility certification. My NATCA contract entitles me to annual step increases, but I want to discuss whether a temporary supervisor rotation or training officer designation might qualify me for the next GS step. En route and TRACON facilities in high-cost metros pay $135K-$175K at GS-14 — I\'d like to understand my trajectory.',
    countersScript: 'I\'m asking for a developmental position toward Traffic Management Coordinator or Operations Supervisor designation, which would place me on the GS-14 track. Alternatively, I\'d like to discuss assignment to a higher-level facility where my experience would qualify for a GS-13 lateral.',
    walkAwayLine: 'I have an offer from [TRACON / ARTCC facility] that would advance my GS level within 18 months. I\'d prefer to stay at this facility given my investment in the team — but the pay differential is meaningful.',
  },
  aerospace_engineer_structures: {
    strongOpener: 'I\'d like to align my compensation with the 2026 aerospace structural engineering market. With my [FEA / composites / DER authorization] expertise and [X years on program name], I\'m operating at the senior engineer level and the market has moved substantially.',
    leverageContext: 'Per Levels.fyi and Bureau of Labor Statistics OES, aerospace structural engineers with composite and FEA expertise at Boeing/Lockheed/Northrop earn $140K-$175K base at the 75th percentile. My specific program contributions: [specific design wins, weight savings, certification successes]. Replacing my program-specific knowledge would take 12-18 months of onboarding.',
    countersScript: 'I\'m asking for $X base (75th percentile for senior structures engineer with my specialty), a technical ladder promotion to Principal Engineer, and DER sponsorship if program schedule permits. If immediate base adjustment isn\'t feasible, I\'ll accept a retention RSU plus a 6-month review commitment.',
    walkAwayLine: 'I have an offer from [Boeing / Lockheed / Northrop / Raytheon] at $X above current package. I\'d prefer to stay and finish [program milestone] — but I need to see meaningful movement.',
  },
  aerospace_project_manager: {
    strongOpener: 'I\'d like to discuss my total compensation in the context of the aerospace program management market. With my PMP + [security clearance / AS9100 / defense acquisition experience], I\'m managing a program of [value / complexity] that typically commands $160K-$200K in the current market.',
    leverageContext: 'Defense and commercial aerospace PMO compensation has risen 18-22% in the past 24 months (BLS SOC 11-9041 OES data). My specific contributions: [program delivered on schedule / cost savings / milestone achievements]. Replacing a cleared program manager with domain expertise in [fighter / commercial / space] takes 9-15 months.',
    countersScript: 'I\'m asking for $X base (75th percentile for senior aerospace PM with active [Secret/TS] clearance), a program performance bonus tied to next milestone, and access to the company\'s Leadership Development Program for the Director of Programs track.',
    walkAwayLine: 'I have an offer from [Leidos / L3Harris / Raytheon / SAIC] at $X. The work here on [program] is compelling — I need to see movement to justify staying.',
  },
  forensic_scientist: {
    strongOpener: 'I want to discuss my compensation in light of my AAFS membership, [ABC / ABFT] certification, and [X years specialized laboratory experience]. I\'m also now qualified as an expert witness in [DNA / toxicology / trace evidence] — a credential that generates $300-$800/day in supplemental testimony income at market rates.',
    leverageContext: 'FBI Laboratory forensic scientists at the GS-12/13 level earn $88K-$118K — 15-30% above most state crime lab pay scales. My court qualification as an expert witness means I can generate revenue for the DA\'s office through testimony. The ASCLD accreditation cycle I managed saved the lab from a potential compliance deficiency. Replacing a lab-qualified expert witness takes 3-5 years.',
    countersScript: 'I\'m asking for $X base (commensurate with federal GS-12 locality-adjusted scale for my specialty), a designated expert witness fee-sharing arrangement for outside testimony, and LIMS administrator designation (with $8K-$12K specialty pay) given my LabVantage experience.',
    walkAwayLine: 'I have an inquiry from the [FBI Laboratory / DEA lab / private forensic consulting firm] at substantially higher compensation. I\'d strongly prefer to continue my cases here — but the gap is difficult to ignore.',
  },
  security_manager_physical: {
    strongOpener: 'I\'d like to discuss my compensation package in the context of my CPP certification and my responsibility for [X sites / Y employees / Z spend under management]. The corporate security director market has moved significantly in the last 24 months.',
    leverageContext: 'ASIS International\'s 2026 Security Management Compensation Study shows CPP-certified security directors at comparable scope ($X budget, Y sites) earning $120K-$160K base. My specific contributions: [integrated security system rollout / cost reduction / critical incident outcomes]. Tech company security directors earn $155K-$210K for comparable scope. Replacing a CPP-certified leader with program knowledge takes 8-12 months.',
    countersScript: 'I\'m asking for $X base (75th percentile for CPP-certified director at comparable scope), a performance bonus tied to audit outcomes, and budget for vendor certification renewals (Lenel/Genetec annual training). If full base adjustment isn\'t immediately available, I\'ll accept a retention RSU plus a formal 6-month review.',
    walkAwayLine: 'I have an offer from [Amazon Global Security / Google Global Security / Fortune 100 corporate security] at significantly higher comp. I\'d prefer to continue the programs we\'ve built here.',
  },
  uav_operator_commercial: {
    strongOpener: 'I\'d like to discuss my compensation in light of my BVLOS waiver qualification and [photogrammetry / thermal / LiDAR] data processing expertise. Specialized BVLOS operators are in acute shortage and the market rate has moved substantially.',
    leverageContext: 'Operators with active BVLOS waivers and advanced sensor payload expertise earn $85K-$115K at enterprise UAS companies — 30-50% above entry-level Part 107 operators. My specific contributions: [mission types, cost savings vs. traditional methods, safety record]. The AAM sector is hiring at $95K-$130K for eVTOL operations roles. My BVLOS qualifications took 18+ months to build.',
    countersScript: 'I\'m asking for $X base (benchmarked to BVLOS operator median at enterprise UAS firms), reimbursement for BVLOS waiver renewal costs, and a defined path to operations manager or chief pilot role within 18 months.',
    walkAwayLine: 'I have an offer from [Joby / Archer / Skydio / American Robotics] at $X. The mission work here is compelling — but the equity upside and comp differential at the AAM company is significant.',
  },
  police_officer: {
    strongOpener: 'I\'d like to discuss my current classification and overtime opportunities in the context of my [specialized unit assignment / POST advanced certification / years of service toward pension cliff]. I want to ensure my total compensation reflects the staffing crisis the department is navigating.',
    leverageContext: 'Departments in comparable jurisdictions — [City A, City B] — are offering $5K-$15K signing bonuses for certified lateral transfers with my experience and specialty. My specialized unit assignment and court testimony record represent skills that take 3-5 years to develop. Replacing me mid-unit would disrupt active investigations.',
    countersScript: 'I\'m asking for reclassification to [Senior Officer / Detective I] which aligns with my experience, access to all available overtime pools in my unit, and a formal commitment to [specialized training / equipment] for my specialty assignment. If immediate reclassification isn\'t available, I\'d like a formal written retention commitment tied to the next budget cycle.',
    walkAwayLine: 'I\'ve been approached by [NYPD / LAPD / a federal agency] for a lateral position with higher base pay and LEAP supplement. I\'d strongly prefer to continue here — but the financial difference is significant given my pension timeline.',
  },
  emergency_management_coordinator: {
    strongOpener: 'I\'d like to discuss my compensation in the context of my ICS Incident Commander qualification, FEMA PDS completion, and [CBCP / DRII] certification. Emergency management coordinator market rates have risen substantially in response to escalating climate disaster activity.',
    leverageContext: 'FEMA GS-12/13 emergency management specialists earn $85K-$115K + locality. Private sector business continuity managers at Fortune 500 companies earn $95K-$140K for comparable responsibilities. My specific contribution: [grant awards, disaster declarations managed, tabletop exercises facilitated, continuity plans developed]. Replacing a credentialed ICS Incident Commander takes 2-3 years of pipeline.',
    countersScript: 'I\'m asking for $X base (commensurate with FEMA GS-13 locality rate or private sector BCP manager equivalent), a conference budget for the IAEM Annual Conference, and a defined path to Emergency Management Director within 24 months given my credential base.',
    walkAwayLine: 'I have an offer from [a Fortune 500 corporate resilience team / a FEMA Region office / a state emergency management agency] at $X above current compensation. I\'d prefer to continue the programs I\'ve built here.',
  },
  forensic_scientist_csi: {
    strongOpener: 'I want to discuss my compensation in light of my IAI CCSI certification and my 3D laser scanning qualification on the [Leica RTC360 / FARO Focus]. These are skills in acute national shortage.',
    leverageContext: 'Leica-certified and FARO-certified CSIs earn $75K-$95K at major metro departments — 20-30% above uncertified CSI peers. My 3D scanning work on [specific case types] has reduced courtroom challenges to scene documentation substantially. There are fewer than 300 certified 3D scanning CSIs nationally.',
    countersScript: 'I\'m asking for a specialty pay differential of $8K-$12K annually for my 3D scanning qualification and IAI CCSI credential, plus designation as the department\'s 3D scanning subject matter expert with associated training budget. If immediate specialty pay isn\'t available, I\'d like a written commitment to establish the pay grade in the next budget cycle.',
    walkAwayLine: 'I have an inquiry from [a major metro department / a DA\'s office forensic unit / a private forensic consulting firm] offering higher base and specialty pay for my 3D scanning skills. I\'d prefer to continue here given my case history.',
  },
  crime_scene_investigator: {
    strongOpener: 'I want to discuss my compensation in light of my IAI CCSI certification and my 3D laser scanning qualification on the [Leica RTC360 / FARO Focus]. These are skills in acute national shortage.',
    leverageContext: 'Leica-certified and FARO-certified CSIs earn $75K-$95K at major metro departments — 20-30% above uncertified CSI peers. My 3D scanning work on major crime scenes has reduced courtroom challenges to scene documentation substantially. There are fewer than 300 certified 3D scanning CSIs nationally.',
    countersScript: 'I\'m asking for a specialty pay differential of $8K-$12K annually for my 3D scanning qualification and IAI CCSI credential, plus designation as the department\'s 3D scanning subject matter expert with associated training budget. If immediate specialty pay isn\'t available, I\'d like a written commitment to establish the pay grade in the next budget cycle.',
    walkAwayLine: 'I have an inquiry from [a major metro department / a DA\'s office forensic unit / a private forensic consulting firm] offering higher base and specialty pay for my 3D scanning skills. I\'d prefer to continue here given my case history.',
  },
  firefighter: {
    strongOpener: 'I want to discuss my compensation and specialized unit assignment in the context of my [EMT-P certification / HazMat Technician / Technical Rescue certification] and my years of service toward the pension cliff. Departments at [City A, City B] are offering $10K-$18K signing bonuses for certified lateral transfers with dual EMT-P certification.',
    leverageContext: 'My dual firefighter/paramedic certification generates direct EMS revenue for the department — paramedic-certified FF/medics earn $10K-$18K specialty pay at comparable departments. IAFF CBA analysis shows our specialty pay schedule is below the median for departments of comparable size. My technical rescue certification also qualifies me for specialty unit assignment with associated pay differential.',
    countersScript: 'I\'m asking for the firefighter/paramedic specialty pay differential of $X per year, access to the Technical Rescue Unit selection process in the next cycle, and overtime access to high-pay specialty shifts. If immediate specialty pay isn\'t CBA-feasible, I\'d like a formal commitment to include it in the next contract negotiation.',
    walkAwayLine: 'I\'ve been approached about a lateral transfer to [LA County Fire / Miami-Dade Fire / Dallas FD] with a signing bonus and higher specialty pay. I\'d prefer to continue here given my seniority — but the financial gap is meaningful.',
  },
};
