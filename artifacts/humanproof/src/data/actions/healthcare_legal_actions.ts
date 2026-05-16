// healthcare_legal_actions.ts — v37.0 Multi-Industry Role Intelligence
// Phase 2: Healthcare (24 roles) + Legal (15 roles) = 39 explicit role groups

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

// ── HEALTHCARE ROLES ──────────────────────────────────────────────────────────

export const ACTION_DB_HEALTHCARE_LEGAL: Record<string, BracketPool> = {

  registered_nurse: pool(
    {
      title: 'Register with 3 Travel Nursing Agencies This Week',
      description: 'Travel nursing contracts (13-week assignments) pay $2,800–$4,200/week all-in — 40–80% above staff RN rates. Register immediately with: (1) Aya Healthcare — largest volume, quick credentialing; (2) AMN Healthcare — best rural assignments; (3) Travel Nurse Across America — best housing stipends. NCLEX licensure is portable across states via Nurse Licensure Compact (NLC) — 41 states honor it. Your skills are in shortage nationally regardless of this company\'s financial health.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Pursue BSN Completion or Specialty Certification to Access Higher-Demand Units',
      description: 'ADN-to-BSN programs at WGU ($4,500 total, 100% online, 12–18 months) or University of Massachusetts Open Learning open doors to Magnet hospitals and ICU/ED/OR specialty units — where demand is structural and pay is 18–25% higher. Alternatively, earn a nationally recognized specialty certification: CCRN (critical care), CEN (emergency), or CNOR (perioperative) — each adds $3,000–$8,000/year in shift differentials. This is the most durable protection move available to an RN.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days — enroll now', priority: 'Critical',
    },
    {
      title: 'Build a Locum Tenens Pipeline to Diversify Income and Leverage',
      description: 'Senior RNs with specialty experience (ICU, ED, PACU, Labor & Delivery) can work locum shifts at $85–$150/hour through Vivian Health or NurseRecruiter while maintaining their primary employment. This creates leverage: you are demonstrably replaceable by the agency if the hospital forces unfavorable terms. Present this to your CNO during your next compensation discussion. 2–4 locum shifts per month build ₹6–12L/year additional income.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Join a Union or Shared Governance Council to Protect Staffing Ratios',
      description: 'California (SEIU-UHW, CNA) and Massachusetts (MNA) union RNs earn 22% more and face 40% lower layoff rates. If your state permits RN unions, attend a union organizing meeting this month. If already unionized, join the staffing committee — nurses on staffing committees are classified as essential governance employees, dramatically reducing individual layoff risk.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Complete a Telehealth Nursing Certificate to Expand Role Options',
      description: 'Telehealth RN roles (triage, chronic disease management, virtual ICU monitoring) are growing 40% annually with fully remote options. Complete the American Telemedicine Association telehealth nursing certificate (8 hours, $199). This opens roles at Teladoc Health, Hims & Hers, and hospital virtual care programs at $65–$95/hour — fully portable regardless of geography.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  nurse_practitioner: pool(
    {
      title: 'Open Your Own NP Practice in a Full-Practice-Authority State',
      description: 'Full-practice-authority states (28 states including WA, CO, OR, NY, FL) allow NPs to practice and prescribe independently without physician supervision. Starting a solo practice costs $15,000–$25,000 (malpractice insurance, EHR, billing). An NP solo practice generates $180,000–$350,000/year in revenue. This eliminates all employer dependency. Target: select your practice state this week, contact a healthcare attorney, and secure malpractice insurance.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '30 days — begin state research', priority: 'Critical',
    },
    {
      title: 'Negotiate a Direct Primary Care (DPC) Panel for Immediate Leverage',
      description: 'Mid-level NPs can build a DPC panel (150–300 patients paying $70–$150/month directly) while maintaining employment. This $10,500–$45,000/month recurring revenue stream is your negotiation ace: at your next performance review, present your DPC panel as proof of market demand. Employer matching requires better terms or losing you to a practice you already operate.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 40, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Develop a Medical Directorship or CMO Advisory Role',
      description: 'Senior NPs with 10+ years experience are qualified medical directors for urgent care chains, telehealth platforms, and senior living facilities. Medical director compensation ($80,000–$180,000/year) is additive to clinical income. Target: contact DispatchHealth, Carbon Health, or CenterWell with a medical director proposal. Your patient outcomes data and quality metrics are your pitch.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Specialty NP Certification to Command 25–40% Higher Rates',
      description: 'AGACNP (acute care adults), PMHNP (psychiatric), NEONP (neonatal), or CRNA bridge programs command $130–$220/hour versus $70–$110 for general NPs. ANCC specialty certs add $25,000–$60,000 to annual compensation. Research your target specialty\'s exam date and start a 6-month study plan using the ANCC review course.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months — begin now', priority: 'High',
    },
    {
      title: 'List Your Services on Zocdoc and Build a Patient Acquisition Funnel',
      description: 'Independently practicing NPs on Zocdoc see 30–50 new patient inquiries per month with no marketing spend. A Google Business profile + Zocdoc listing takes 2 hours to set up. Even as an employed NP, a professional web presence signals market demand to your current employer and positions you for independent practice.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 20, deadline: '7 days', priority: 'Medium',
    },
  ),

  physician_general_practitioner: pool(
    {
      title: 'Secure Hospital Privileges at Two Competing Hospital Systems',
      description: 'A physician with privileges at two competing hospital systems (e.g., HCA Healthcare + Tenet Health in your metro) cannot be fully controlled by either. Applying for privileges at a second hospital takes 60–90 days but creates irreversible protection. If your primary employer makes adverse terms, you immediately shift volume. Apply this week — credentialing applications are long lead-time items that must start immediately.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 40, deadline: '7 days — submit application', priority: 'Critical',
    },
    {
      title: 'Negotiate Your Employment Contract Out of Non-Compete Restrictions',
      description: 'The FTC non-compete rule (effective 2024) prohibits new non-competes for most workers including physicians in most states. If your contract has a non-compete clause (radius + years restrictions), consult a healthcare employment attorney immediately. Removal of the non-compete is free leverage — you can now leave and immediately practice in the same market if needed.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 35, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Launch a Cash-Pay Concierge Practice Alongside Employment',
      description: 'Concierge medicine practices charge $150–$300/month retainer per patient for direct access. A panel of 150 concierge patients generates $270,000–$540,000/year in recurring revenue — without insurance billing overhead. Many systems now permit employed physicians to maintain small concierge panels. Consult your employment contract and a healthcare attorney, then recruit your first 10 patients from loyal patients who would follow you.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Register for Telemedicine Panels at Two National Platforms',
      description: 'Teladoc, MDLive, and Amazon Clinic pay physicians $35–$75/virtual visit with flexible scheduling. A physician doing 20 telemedicine visits per week generates $35,000–$75,000/year supplemental income with zero overhead. More importantly, this establishes a patient pipeline independent of any hospital system. Registration and credentialing takes 3–4 weeks.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 28, deadline: '14 days — apply now', priority: 'High',
    },
    {
      title: 'Complete a CME Course in Practice Management and Medical Economics',
      description: 'Physicians with practice management knowledge command 30% higher compensation in administrative and leadership tracks. The MGMA (Medical Group Management Association) offers a Physician Leadership certificate ($1,800) covering financial management, contract negotiation, and quality metrics. This positions you for Medical Director, CMO, and VP Medical Affairs roles as alternatives to clinical-only paths.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
  ),

  specialist_physician: pool(
    {
      title: 'Negotiate Academic Appointment for Layoff Protection and Portfolio Leverage',
      description: 'A voluntary unpaid or paid appointment at a university hospital (clinical assistant professor) costs you nothing but creates significant protection: academic physicians are classified as faculty, face different termination procedures, and have access to research grants that supplement clinical income. Contact your local medical school this week — most offer voluntary clinical faculty appointments to community physicians.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Develop a Subspecialty Procedure That Creates Revenue Lock-In',
      description: 'Procedural specialists (interventional cardiologists, interventional radiologists, neurosurgeons) who perform high-revenue procedures that cannot be easily transferred face the lowest displacement risk. If you\'re in a cognitive specialty (psychiatry, endocrinology), identify the highest-value procedure in your field and obtain board certification for it this year. Procedure volume translates directly to hospital revenue — making you displacement-resistant.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '6 months — begin now', priority: 'Critical',
    },
    {
      title: 'Build Expert Witness Revenue Stream at $500–$1,500/Hour',
      description: 'Board-certified specialist physicians command $500–$1,500/hour as expert witnesses in medical malpractice litigation. Register with expert witness networks: SEAK Expert Witness Directory, ForensisGroup, or TASA Group. An expert witness engagement (case review + deposition + testimony) generates $10,000–$50,000. This income is fully independent of hospital employment and leverages existing clinical expertise.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '21 days — register now', priority: 'Critical',
    },
    {
      title: 'Contact 3 Competing Health Systems for Employed Physician Positions',
      description: 'Specialist physicians are the most actively recruited healthcare professionals. A cardiologist at HCA can have 3 competitive offers within 30 days. Contact 3 competing health systems\' physician recruitment departments this week — not to leave immediately, but to establish market rate leverage. Salary data from competing offers is the single most powerful negotiating tool in physician compensation discussions.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Publish a Quality Outcomes Report on Your Patient Panel',
      description: 'Specialists who can document their patient outcomes (readmission rates, complication rates, patient satisfaction scores, procedure success rates) relative to peers create irreplaceable value documentation. Request your quality metrics from the hospital quality department this week. A 1-page outcomes report positions you for value-based care bonuses and makes your compensation justification concrete.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 25, deadline: '30 days', priority: 'Medium',
    },
  ),

  registered_nurse_india: pool(
    {
      title: 'Complete NCLEX-RN Registration for US Work Authorization',
      description: 'Indian nurses with NCLEX-RN certification earn $75,000–$110,000/year in the US versus ₹3–8 LPA in India. Register on NCSBN today (nclex.org, $200 fee). Study path: Archer Review or Kaplan NCLEX-RN (₹12,000–₹18,000). Most Indian nursing councils accept NCLEX preparation. The VisaScreen credential (CGFNS, $395) runs parallel. First US assignment via travel nursing: $3,500–$5,500/week. This is the highest-ROI credential available to Indian nurses.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '30 days — register now', priority: 'Critical',
    },
    {
      title: 'Register with International Nurse Staffing Agencies for Gulf/UK/Canada Positions',
      description: 'India-trained RNs are eligible for positions in UAE (DHA/HAAD license, $48,000–$72,000/year), UK (NMC registration, £35,000–$£52,000/year), and Canada (NNAS assessment, CAD$75,000–$90,000). Register with: (1) Medical Staffing International — UK/EU placements; (2) Goldencare — Gulf specialization; (3) Matchpoint Talent — Canada pipeline. Registration is free. Overseas hospital positions provide 3–5× salary multiple versus India.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Earn a Post-Basic Nursing Specialty Certification for ICU, OT, or CCU',
      description: 'INC-recognized post-basic nursing certificates (Critical Care, Operation Theatre, Oncology) increase Indian hospital salaries from ₹3–6 LPA to ₹7–14 LPA and are prerequisites for senior roles and international licensing. Apply to Rajiv Gandhi University, AIIMS, or PGI Chandigarh post-basic programs this month. Specialization is the fastest income multiplier in India\'s nursing market.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Apply to Corporate Hospital Chains for 30% Higher Base Pay',
      description: 'Max Healthcare, Manipal Hospitals, Fortis, and Apollo pay 25–40% more than government and trust hospitals. Upload your CV to Max Healthcare\'s career portal, Fortis Healthworld, and Apollo Hospitals careers this week. A senior RN with ICU experience earns ₹6–12 LPA at corporate chains vs ₹3–6 LPA at government hospitals. Lateral moves to corporate chains are the fastest salary fix available.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 25, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Join a Nursing Union or Association for Collective Bargaining Access',
      description: 'Nurses registered with the Trained Nurses Association of India (TNAI) or Kerala Government Nurses Association have access to collective wage negotiations and legal support during adverse employment situations. Membership costs ₹500–₹2,000/year. Union nurses face 35% lower arbitrary termination rates in Indian hospital systems.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '7 days', priority: 'Medium',
    },
  ),

  physical_therapist: pool(
    {
      title: 'Obtain APTA Specialty Certification to Double Billable Rate',
      description: 'APTA board-certified specialists (orthopedic, sports, neurology, pediatrics) bill at $150–$250/session vs $75–$120 for general PTs. The OCS (Orthopedic Clinical Specialist) exam — the most marketable — requires 2,000 clinical hours and passes at 66%. Start studying with Scorebuilders OCS review ($299). Specialty PTs in outpatient ortho settings earn $85,000–$120,000 vs $62,000–$78,000 for generalists.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months — register now', priority: 'Critical',
    },
    {
      title: 'Register for 3 Home Health Agencies to Create Income Independence',
      description: 'Home health PTs earn $85–$150/visit vs $35–$60/hour in hospital settings. A PT doing 8 home health visits/day generates $680–$1,200/day. Register with BrightSpring, Encompass Health, and Amedisys home health divisions. Home health PTs are contracted, not employed — no layoff risk from any single hospital. This is the fastest path to income independence for a PT.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Open a Cash-Pay Physical Therapy Practice for 2× Revenue',
      description: 'Insurance-based PT reimbursements average $42–$80/visit. Cash-pay PT practices charge $120–$200/visit with zero insurance overhead. A 20-patient week generates $2,400–$4,000/week vs $840–$1,600 insurance-based. Start with 5 cash-pay patients through word of mouth and a simple website ($12/month Wix). PT private practice legal setup: $500–$1,000 (LLC filing + malpractice insurance).',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Develop a Telehealth PT Program for Remote Clients',
      description: 'Telehealth PT (exercise prescription, movement assessment, pain education) is reimbursable by Medicare and most commercial insurers since 2022. WebPT and Jane App both support telehealth billing. Telehealth PT sessions ($95–$150) require no clinic overhead and serve a national client base. Dedicate 5 telehealth hours per week to build a second income stream.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 25, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Earn a Dry Needling or Manual Therapy Certification',
      description: 'Dry needling certification (IAMT, 54 hours, $1,500) and NAIOMT manual therapy certification add $15–$30/session billable time in cash-pay settings and differentiate you in outpatient ortho. PTs with dry needling see 45% more patient referrals from sports medicine physicians.',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
    },
  ),

  pharmacist: pool(
    {
      title: 'Obtain MTM (Medication Therapy Management) Credentials and Build a Billing Practice',
      description: 'MTM pharmacists bill $40–$80/15-minute consultation directly to Medicare Part D plans — an additional revenue stream separate from dispensing. Complete ASHP\'s MTM certification ($250), then contract with Outcomes MTM or Mirixa to receive patient referrals. A pharmacist doing 10 MTM consults/day generates $400–$800 in supplemental daily revenue, building independence from retail chains.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Pursue PGY1/PGY2 Residency or BCPS Board Certification',
      description: 'Board-Certified Pharmacotherapy Specialists (BCPS) earn 20–35% more than non-certified pharmacists and face dramatically lower retail-chain layoff risk (clinical pharmacists are hospital-essential, not automated). Apply to ACCP or BPS for the BCPS exam ($575) and begin the Pharmacotherapy self-assessment program. Clinical pharmacy roles are the most protected segment as retail automation (ScriptPro, Codonics) eliminates dispensing positions.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '3 months — register now', priority: 'Critical',
    },
    {
      title: 'Transition from Retail to Ambulatory Care or Hospital Clinical Pharmacy',
      description: 'Retail pharmacy positions are high automation-displacement risk (Amazon Pharmacy, ScriptPro robotics). Hospital clinical pharmacy (anticoagulation clinics, oncology pharmacists, transplant pharmacists) pays $130,000–$185,000 vs $112,000–$128,000 retail and carries near-zero automation risk. Apply to 3 health system clinical pharmacy positions this week via ASHP Career Pharmacy or Doximity.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 40, deadline: '7 days — apply now', priority: 'Critical',
    },
    {
      title: 'Develop a Compounding Specialty Practice',
      description: 'Compounding pharmacists (sterile compounding for oncology, hospice, dermatology) operate in a specialty market that requires specialized 503A/503B facility certification and cannot be automated by retail chains. Starting or working at a compounding pharmacy pays $140,000–$200,000+ vs $112,000–$130,000 retail. PCAB accreditation creates a defensible market position.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days — research now', priority: 'High',
    },
    {
      title: 'Pursue Telepharmacy Opportunities for Income Independence',
      description: 'Telepharmacists verify prescriptions remotely for rural pharmacies at $55–$90/hour — fully remote, flexible hours. Register with DrugSmart Pharmacies or OutcomesMTM telepharmacy network. 15 telepharmacy hours/week adds $43,000–$70,000/year of income independent of your primary employer.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 22, deadline: '14 days', priority: 'Medium',
    },
  ),

  physician_assistant: pool(
    {
      title: 'Pursue Hospital Employment Over Physician Group Practice for Stability',
      description: 'Hospital-employed PAs face 60% lower layoff rates than physician practice PAs (which close when physicians retire or sell). Target health system employed positions (HCA, Kaiser, Advocate Aurora, CommonSpirit) rather than private practice. Hospital employed PAs also receive better benefits and malpractice coverage. Apply to 3 health system PA positions this week via Doximity or PracticeLink.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 30, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Obtain Surgical First Assist Certification (CSFA or RNFA-equivalent)',
      description: 'Surgical first assist PAs are among the most in-demand PA specialties (demand growing 22% annually). Complete ARC\'s Surgical Technology and Surgical Assisting program or the AAPA surgical first assist curriculum. Surgical PAs earn $130,000–$190,000 vs $95,000–$125,000 primary care. Operating room PA positions are non-automatable and in structural shortage.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '6 months', priority: 'Critical',
    },
    {
      title: 'Build a Locum Tenens Panel Through 3 PA-Specific Agencies',
      description: 'Locum PAs earn $70–$120/hour (primary care) to $130–$180/hour (hospitalist, emergency, surgery). Register with CompHealth, Barton Associates, and Staff Care PA divisions. A PA doing 1-week/month locum shifts generates $25,000–$55,000 supplemental income and builds market relationships independent of current employer.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Pursue NCCPA Certificate of Added Qualifications in Your Specialty',
      description: 'NCCPA Certificates of Added Qualifications (CAQ) in Cardiovascular & Thoracic Surgery, Orthopedic Surgery, Psychiatry, or Hospital Medicine differentiate senior PAs and command 15–25% premium compensation. The CAQ requires 150 specialty CME hours and specialty practice documentation.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '12 months — begin now', priority: 'High',
    },
    {
      title: 'Join AAPA and Your State PA Association for Job Board Access',
      description: 'AAPA (American Academy of PAs) maintains the largest PA-specific job board with 12,000+ active postings. Membership ($245/year) also provides liability advocacy and CME resources. State PA associations provide direct hospital system contacts in your region.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  clinical_research_coordinator: pool(
    {
      title: 'Complete ACRP or SOCRA Certification to Move from Site to Sponsor',
      description: 'ACRP Certified Clinical Research Coordinator (CCRC, $500) or SOCRA CCRP certification moves you from site-level CRC ($52,000–$68,000) to sponsor/CRO CRC positions ($72,000–$95,000) at companies like ICON, Covance, IQVIA, and Syneos. Apply to CRO positions immediately — site CRC positions are vulnerable when grant funding ends, while sponsor-side CRCs have stable project pipelines.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days — register', priority: 'Critical',
    },
    {
      title: 'Transition to Clinical Data Management or Regulatory Affairs',
      description: 'Clinical Data Managers ($75,000–$110,000) and Regulatory Affairs Specialists ($85,000–$130,000) are in structural shortage at pharmaceutical companies. Your CRC experience in protocol adherence and data collection is the prerequisite credential. Complete the CCDM (Society for Clinical Data Management) certification or the RAC (RAPS regulatory affairs certification) and apply to 3 pharma/CRO positions this week.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 35, deadline: '7 days — apply', priority: 'Critical',
    },
    {
      title: 'Apply to NIH or CDC for Federal Research Coordinator Positions',
      description: 'Federal research positions (NIH, CDC, VA) offer civil service protection, defined benefit pensions, and layoff immunity beyond what any private trial site provides. USAJOBS.gov lists GS-9 to GS-12 CRC positions ($60,000–$95,000). Federal positions require longer hiring timelines (8–16 weeks) — apply this week to have options within 4 months.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 40, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Build Medidata Rave/Oracle Clinical One Proficiency for CRO Roles',
      description: 'CROs universally require eDC (electronic data capture) system proficiency. Medidata Rave training is available through the Medidata Learning Center (free for industry professionals). Oracle Clinical One is taught via Oracle University. CRCs with eDC certifications receive 45% more CRO interview invitations than those without.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Register on SCRS and MAGI Trial Match Networks',
      description: 'SCRS (Society for Clinical Research Sites) and MAGI Clinical Research networks provide direct connections to pharmaceutical sponsors looking for experienced CRCs for multi-site trials. Site affiliation with SCRS gives access to 600+ sponsors and accelerated study startup.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  hospital_administrator: pool(
    {
      title: 'Establish Peer Relationships at 3 Competing Health Systems',
      description: 'Hospital administrators at risk need a warm pipeline, not a cold job search. Contact your counterpart administrators at 2–3 competing health systems now (during normal times). Healthcare administration is a relationship-driven market — 70% of hospital COO and CEO positions are filled through referrals. Join ACHE (American College of Healthcare Executives) and attend your regional ACHE chapter meeting this month.',
      layerFocus: 'L5 · Network', riskReductionPct: 35, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Document Your Financial Performance Metrics as a Negotiation Asset',
      description: 'Hospital administrators who can quantify: (a) cost savings implemented ($ amount), (b) quality metrics improved (readmission rates, HCAHPS scores), (c) revenue cycle improvements (AR days reduced), and (d) department productivity gains are 3× more negotiation-powerful in both retention and new-role discussions. Compile your impact metrics into a 2-page executive summary this week.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Pursue FACHE (Fellow of ACHE) Designation for Senior Role Access',
      description: 'FACHE designation opens access to C-suite and Senior VP positions at health systems that require it. The FACHE exam ($450) requires 5 years of healthcare management and ACHE membership. FACHE administrators earn 18–28% more than non-designated peers and face shorter job search times in C-suite markets. Begin ACHE membership and FACHE application this month.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build Board Governance Relationships in Your Health System',
      description: 'Administrators with direct relationships with board members (quality committees, finance committees, strategic planning) are last to be displaced in leadership restructuring. Volunteer for a board committee presentation or quality improvement initiative this quarter. Board visibility creates protection that exceeds any contractual severance clause.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Complete an Executive MBA or MHA Program at a Recognized Program',
      description: 'Executive MBA programs (University of Minnesota MHA, Cornell Weill, George Washington EMHA) signal CEO-track positioning and open roles at 50–200 bed independent hospitals seeking their first professional administrator. Programs cost $65,000–$110,000 but average salary lift of $45,000/year over 5 years.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days — research programs', priority: 'Medium',
    },
  ),

  behavioral_health_therapist: pool(
    {
      title: 'Open a Private Practice on SimplePractice and Build a 20-Client Caseload',
      description: 'LCSWs, LMFTs, and LPCs in private practice earn $85–$175/hour cash-pay vs $42–$65/hour for agency or community mental health employment. SimplePractice ($39/month) handles scheduling, billing, and progress notes. A 20-client/week private practice generates $85,000–$180,000/year with full schedule control. Starting now: create your Psychology Today profile (free) and SimplePractice account, set 3 cash-pay openings per week, and begin building your caseload.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Contract with Headway or Alma for Insurance Credentialing and Instant Patient Referrals',
      description: 'Headway and Alma handle insurance credentialing (usually takes 3–6 months independently) in 30–45 days and provide immediate patient matching. Therapists on Headway access 180M+ insured Americans and receive $85–$140/hour (they negotiate with insurers, you receive net rate). This eliminates agency employment dependency while maintaining insurance access.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '14 days — apply', priority: 'Critical',
    },
    {
      title: 'Pursue EMDR, DBT, or Somatic Therapy Certification for Premium Positioning',
      description: 'EMDR-trained therapists charge $175–$300/session in private practice (vs $85–$130 for general CBT). EMDR Institute training ($1,100–$2,200 for basic training) generates ROI within 3 months. DBT-Linehan Board Certified therapists command similar premium and have lower caseload requirements (intensive individual + skills group model). Specialty training is the fastest path to higher private practice rates.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Apply to Telehealth Platforms for Supplemental Income While Building Practice',
      description: 'Teladoc, BetterHelp ($70–$95/hour), and Brightside Health ($80–$110/hour) provide immediate caseload without insurance credentialing wait times. Working 15 hours/week on a telehealth platform ($52,000–$85,000/year supplemental) while building a private practice generates income bridge and reduces financial pressure during the private practice growth period.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 28, deadline: '7 days — apply', priority: 'High',
    },
    {
      title: 'Develop a Group Therapy Program to 3× Your Hourly Rate Per Hour Worked',
      description: 'A therapy group with 8 clients at $60/person generates $480/hour vs $125–$175 for individual sessions. Group formats: DBT skills group, grief support, anxiety management, couples communication. Create a 6-week group program using your existing modality, market through Psychology Today groups directory, and launch with 6–8 participants.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
    },
  ),

  // ── LEGAL ROLES ──────────────────────────────────────────────────────────────

  attorney_general_practice: pool(
    {
      title: 'Open a Solo Practice on LawPay and Build 10 Retained Clients',
      description: 'A solo attorney with 10 retained clients at $500–$2,500/month retainer generates $60,000–$300,000 in predictable monthly revenue. LawPay ($19/month) handles online client payments. Clio (practice management, $49/month) handles billing and matters. First 10 clients: family law, estate planning, or business contracts — areas where clients pay immediately and matter volume is high. A solo practice eliminates all employer dependency and allows rate-setting freedom.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Document Your Billable Hour Contribution and Client Portfolio for Retention Negotiation',
      description: 'An attorney at a firm with $800,000–$2,000,000 in annual billable revenue from their client relationships has significant negotiation leverage. Calculate your exact client origination revenue (origination credit) and billable hours generated. Present this to your firm\'s managing partner with a specific counter-offer. Attorney departures trigger client portability concerns — firms negotiate hard to retain revenue-generating partners and senior associates.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Pursue In-House Counsel Positions at 3 Companies in Your Practice Area',
      description: 'In-house counsel positions ($140,000–$350,000 for senior roles) provide law firm-level compensation with significantly lower billing pressure, better work-life balance, and equity upside at startups. Your specialty knowledge (employment, commercial contracts, IP, regulatory) is more valuable to a single company than to a general practice. Apply to 3 in-house positions this week via LinkedIn or The Legal Aid Society Board.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Register for Martindale-Hubbell AV Rating for Client Credibility',
      description: 'Martindale-Hubbell AV Preeminent rating (requires peer reviews from judges and opposing counsel) is the gold standard for attorney credibility in referral markets. Registration is free; rating earned through peer evaluation. AV-rated attorneys receive 3× more referrals from other attorneys and command 25% higher hourly rates in private practice.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Complete CLE Courses in a High-Demand Specialty (Cannabis, AI Law, Crypto)',
      description: 'Attorneys with emerging specialty expertise (cannabis law, AI governance, cryptocurrency/blockchain legal, data privacy) command $450–$850/hour vs $275–$450 for general practice. MCLE-approved courses in emerging specialties available through Lawline, Practising Law Institute, and West LegalEdcenter. Most states require 12–15 CLE hours/year — direct them toward highest-value emerging specialties.',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
  ),

  corporate_attorney: pool(
    {
      title: 'Quantify Your Deal Value and Build a Transaction Track Record Document',
      description: 'Corporate attorneys who can present a deal sheet (M&A transactions closed, aggregate deal value, role in each deal) have the strongest negotiation position of any legal specialty. Build your deal sheet this week: transaction name, deal value, your role (lead, supporting, specific workstreams), closing date, counterparties. A corporate associate with $500M+ in closed transactions can command BigLaw partner-track compensation or premium in-house equity packages.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 40, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Sullivan & Cromwell, Wachtell, or Kirkland & Ellis Lateral Role',
      description: 'BigLaw lateral moves for corporate attorneys are the fastest compensation upgrade (40–80% salary increase in 1 move). The NALP lateral directory and Lateral Link recruiter network specialize in corporate law laterals. Biglaw firms actively recruit M&A, capital markets, and private equity associates. Even sending one application creates market intelligence about your value.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Target Legal Operations Roles at PE-Backed Companies for Equity Upside',
      description: 'PE-backed companies need experienced corporate attorneys as General Counsel or VP Legal ($250,000–$500,000 total comp with equity). The equity component (0.25–1.0% at a $100M company) creates wealth-building that BigLaw partner draws cannot match. Apply to 3 PE-backed company GC roles this week via LinkedIn or The General Counsel Network.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Complete a CLE Series on AI Transactions and Digital Assets',
      description: 'Corporate attorneys with AI transaction experience (AI vendor contracts, data licensing, algorithm IP ownership) are the scarcest specialty in 2026 corporate law. PLI and Practising Law Institute offer AI transactions CLEs. Clients paying $800–$1,200/hour for AI contract specialists vs $450–$650 for general corporate work.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build a Network in Your City\'s Legal Recruiter Community',
      description: 'Leading legal recruiters (Major, Lindsey & Africa; Lateral Link; BCG Attorney Search) maintain the hidden job market for BigLaw and in-house positions. One coffee meeting with a recruiter generates 3–8 lateral opportunities. Reach out to 2 legal recruiters this week. Recruiters are paid by hiring firms — their services are free to you.',
      layerFocus: 'L5 · Network', riskReductionPct: 22, deadline: '7 days', priority: 'Medium',
    },
  ),

  ip_attorney: pool(
    {
      title: 'Build a Patent Portfolio Prosecution Practice for Tech Startups',
      description: 'IP attorneys with patent prosecution experience (USPTO registered, $900/hour for biotech/pharma, $600–$750 for software) are in structural shortage as startup AI patent filings surged 340% in 2023–2025. Register on Stripe Atlas, Clerky, or Atrium client networks and offer patent prosecution packages at $3,000–$8,000/patent to seed-stage companies. 5 active patent prosecution clients generates $180,000–$400,000/year.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Obtain Technical Degree or Engineering Background Credential for Premium USPTO Practice',
      description: 'Patent attorneys with STEM backgrounds (EE, CS, biochemistry, mechanical) command 40–65% premium rates and face near-zero displacement risk. If you lack a technical degree, complete MIT OpenCourseWare or Coursera engineering certificate programs in your area of patent specialization. USPTO registered patent practitioners with AI/ML background earn $300,000–$600,000+ at BigLaw IP groups.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '6 months', priority: 'Critical',
    },
    {
      title: 'Contact 3 Life Sciences or Technology Companies for In-House IP Counsel Roles',
      description: 'In-house IP Counsel at biotech ($220,000–$380,000) and tech ($200,000–$350,000 + equity) companies provide the most stable IP employment with equity upside. Apply to 3 companies in your technical specialty this week. IP departments are protected from layoffs because patent prosecution timelines extend years — disrupting the pipeline costs more than the attorney\'s salary.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'File for USPTO Registration If You Don\'t Have It — This Is a Career Asset',
      description: 'USPTO registration (requires technical bachelor\'s + ethics exam) is required for patent prosecution and commands 25–40% premium over general IP advisory. If you don\'t have USPTO registration and have a technical background, file your application this week. Registration takes 3–6 months and opens the patent prosecution market.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '7 days — file application', priority: 'High',
    },
    {
      title: 'Join AIPLA and Build Relationships with Patent Litigation Partners',
      description: 'AIPLA (American Intellectual Property Law Association) members have access to the largest IP attorney job board and networking events. IP litigators in need of technical experts for claim construction briefs pay $400–$700/hour for consulting engagements. Build 3 relationships with IP litigators this quarter — they are a consistent source of consulting revenue and referrals.',
      layerFocus: 'L5 · Network', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
    },
  ),

  employment_attorney: pool(
    {
      title: 'Build a Plaintiff-Side Employment Discrimination Practice',
      description: 'Plaintiff-side employment attorneys take cases on contingency (33–40% of settlement) — meaning your income grows with results, not billable hours, and is uncapped. Average Title VII or ADEA settlements range from $50,000–$300,000. A solo practice with 20 active contingency cases generates $300,000–$1,200,000/year. Contact 3 attorney referral networks this week to begin receiving plaintiff referrals. This eliminates employer dependency entirely.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Leverage Your Employment Law Expertise for In-House HR Compliance Roles',
      description: 'Employment attorneys are the highest-value hire for HR Compliance Director, Chief Compliance Officer, and CHRO roles at mid-market companies ($140,000–$280,000). Your litigation knowledge gives you unique insight into employer risk that HR-track professionals lack. Apply to 3 in-house HR compliance roles this week — these roles are structurally protected because the alternative (employment litigation exposure) costs companies millions.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Register as a Neutral Mediator/Arbitrator for JAMS or AAA',
      description: 'Employment mediators at JAMS earn $600–$1,200/hour with full schedule control. JAMS requires 10+ years employment law experience and a mediation training certificate (40 hours, $1,500). A neutral mediator with 3–4 cases per month generates $100,000–$200,000 supplemental income and builds a practice independent of any employer or client concentration.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Obtain SHRM-CP or PHR Credential for HR Consulting Crossover',
      description: 'Employment attorneys with SHRM-CP or PHR credentials bridge into HR consulting markets ($250–$500/hour for compliance advisory). Small and mid-size companies pay retainer fees ($3,000–$8,000/month) for on-call employment compliance counsel — cheaper than full-time counsel and more reliable than outside counsel billing.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Track NLRB and EEOC Regulatory Activity for Sector-Specific Opportunities',
      description: 'NLRB and EEOC enforcement surges (2024–2026: record number of enforcement actions) create demand spikes for employment attorneys on both plaintiff and defense sides. Subscribe to NLRB Daily Digest and EEOC press release feeds to identify emerging enforcement trends and sector hotspots for client development.',
      layerFocus: 'L5 · Market Intelligence', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  compliance_attorney: pool(
    {
      title: 'Pursue a Chief Compliance Officer Role at a Financial Institution or Pharma Company',
      description: 'CCO positions at banks, fintechs, and pharmaceutical companies pay $250,000–$600,000 base (often with significant bonus) and carry near-zero layoff risk because regulators require them. Your compliance expertise is not just valuable — it\'s legally mandatory. Apply to 3 CCO or Deputy CCO positions via LinkedIn or Compliance Week job board this week.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 40, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Obtain CRCM, CCEP, or CHC Certification for Premium Positioning',
      description: 'Certified Regulatory Compliance Manager (CRCM, $595 — banking), Certified Compliance & Ethics Professional (CCEP, $595 — corporate), or Certified in Healthcare Compliance (CHC, $595 — healthcare) designations increase compliance attorney compensation by 20–35% and reduce time-to-offer in job searches by 40%. Determine which certification best matches your practice sector and register this week.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days — register', priority: 'Critical',
    },
    {
      title: 'Develop AI Governance Expertise as the Fastest-Growing Compliance Specialty',
      description: 'AI governance compliance is the single fastest-growing legal specialty (650% increase in job postings 2023–2025). Complete the International Association of Privacy Professionals (IAPP) AI Governance Professional (AIGP) certification ($750). Compliance attorneys with AI governance expertise earn $280,000–$450,000 at tech companies and financial institutions.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Build a Consulting Practice for Mid-Market Companies Without In-House Compliance',
      description: 'Companies with 100–500 employees often cannot afford full-time compliance counsel but pay $2,000–$10,000/month retainers for fractional compliance services. Offer a "virtual CCO" retainer package including policy development, regulatory monitoring, and incident response. 5 retainer clients at $4,000/month generates $240,000/year with 50% of BigLaw billing pressure.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Monitor SEC, FINRA, OCC, and FinCEN Enforcement Actions for Client Development',
      description: 'Companies that receive regulatory actions immediately need compliance remediation counsel. Subscribe to SEC Enforcement Actions RSS, FINRA Disciplinary Actions, and FinCEN Advisories. When a company in your sector receives a consent order, they are a warm prospect for compliance remediation engagements ($250–$600/hour).',
      layerFocus: 'L5 · Market Intelligence', riskReductionPct: 20, deadline: '7 days', priority: 'Medium',
    },
  ),

  paralegal: pool(
    {
      title: 'Complete NALA or NFPA Certification for 20% Higher Compensation',
      description: 'Certified Paralegal (CP, NALA) or Registered Paralegal (RP, NFPA) designations increase paralegal compensation by 15–25% and signal senior-track positioning. NALA exam: $275, open to paralegals with 1 year experience. Certified paralegals average $68,000–$92,000 vs $52,000–$68,000 without certification. Register this week.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '14 days — register', priority: 'Critical',
    },
    {
      title: 'Develop E-Discovery and Relativity Certification for Premium Specialty',
      description: 'E-Discovery paralegals (Relativity Review, Nuix, Brainware) earn $75,000–$105,000 in litigation support roles vs $52,000–$68,000 for general paralegals. The Relativity Certified Administrator (RCA) certification ($450) is the market standard. E-discovery specialization is growing 35% annually as document review volume explodes. Complete Relativity training at the Relativity Academy (free learning path).',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Apply to Top BigLaw Firms for Paralegal Positions with Structured Career Paths',
      description: 'Cravath, Skadden, Sullivan & Cromwell, and Davis Polk offer structured paralegal programs with defined promotion tracks, $85,000–$110,000 starting compensation, and tuition reimbursement for law school. BigLaw paralegal positions also carry near-zero layoff risk because they are tied to major client matters running years. Apply to 3 AmLaw 100 firms this week.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Specialize in Healthcare or IP Paralegal for Structural Shortage Markets',
      description: 'Healthcare paralegals (regulatory submissions, HIPAA compliance, insurance appeals) and IP paralegals (patent docketing, trademark prosecution) face structural shortage in 2026. Both specialties pay $72,000–$95,000 vs $52,000–$65,000 for general litigation paralegals. Complete a specialty CLE series (National Paralegal College offers 12-hour specialty certificates) to pivot into these markets.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 30, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Join NALA and Your State Paralegal Association for Job Referral Network',
      description: 'National Association of Legal Assistants (NALA) and state paralegal associations maintain active job referral networks separate from general job boards. Membership costs $65–$120/year. 65% of paralegal positions at top law firms are filled through referral before public posting.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  legal_operations_manager: pool(
    {
      title: 'Implement e-Billing and Matter Management System to Demonstrate $500K+ ROI',
      description: 'Legal operations managers who can demonstrate concrete cost savings (e-billing rate guideline enforcement, alternative fee arrangement optimization, vendor consolidation) are the most protected role in a corporate legal department. Calculate your department\'s annual outside counsel spend and identify 15–20% cost reduction opportunities. A documented $500,000 in outside counsel savings is worth more than any certification in your next performance review.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Pursue CLM or Legal AI Tool Implementation Lead Role',
      description: 'Contract Lifecycle Management (CLM) implementation leads (Ironclad, Icertis, DocuSign CLM) earn $130,000–$185,000 and are actively recruited. Legal AI implementation (Harvey AI, CoCounsel, Lexis+ AI) specialists are the single fastest-growing legal operations specialty. Complete one CLM certification (Ironclad University, free) and apply to 3 legal ops or CLM implementation roles this week.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 40, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Obtain Certified Legal Manager (CLM) or CLOC Certification',
      description: 'Association of Legal Administrators (ALA) Certified Legal Manager (CLM) or CLOC Core Competency certification signals senior legal operations positioning. CLM requires 5 years legal management experience and a written examination. CLOC provides the most recognized certification in the corporate legal operations space and opens VP Legal Operations roles ($160,000–$280,000).',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '30 days — register', priority: 'Critical',
    },
    {
      title: 'Build a Legal Technology Audit Report for Your Organization',
      description: 'Legal departments spend an average of $2,200/attorney/month on legal tech stack with 35% redundant tools. Conduct a full audit of your legal tech stack (matter management, e-billing, CLM, research, e-discovery) and present a consolidation recommendation to your CLO. A well-executed legal tech audit is a high-visibility project that positions you as strategic rather than administrative.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Join CLOC and ACC (Association of Corporate Counsel) for Job Market Access',
      description: 'CLOC (Corporate Legal Operations Consortium) and ACC maintain the largest legal operations job boards and networking communities. CLOC annual membership ($200) provides access to salary surveys, benchmarking data, and direct recruiter connections. ACC provides in-house counsel and legal ops community with 45,000+ members globally.',
      layerFocus: 'L5 · Network', riskReductionPct: 20, deadline: '7 days', priority: 'Medium',
    },
  ),

  general_counsel: pool(
    {
      title: 'Document Legal Department ROI and Board-Level Risk Mitigation',
      description: 'General Counsel face displacement primarily during M&A integration (acquirer\'s GC displaces target\'s GC) and financial distress cost cuts. Build your protection document now: litigation avoided (settlement amounts + attorney fees you prevented), compliance programs implemented (regulatory fines avoided), M&A diligence value (risks identified), IP portfolio value created. A GC who can articulate $10M+ in annual value creation is retained even in severe restructuring.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 42, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build Board Relationships Beyond the CEO to Create Independent Job Security',
      description: 'GCs who report functionally to the board (not solely to the CEO) face lower displacement risk — the board can retain the GC even if the CEO who appointed them departs. Request a direct standing item on the Audit Committee or Governance Committee agendas. Board-facing GCs are last positions eliminated and first considered for interim C-suite elevation during executive transitions.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Maintain 3 Active CEO/Board Relationships at Other Companies',
      description: 'GC positions are rarely publicly posted — they\'re filled through CEO networks. Maintain active relationships with 3 non-competing CEOs or board chairs through quarterly coffee meetings and sharing relevant legal intelligence. A GC who is in active relationship with 3 other C-suite networks has a job offer within 4–6 weeks of departure.',
      layerFocus: 'L5 · Network', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Develop Board Directorship for Income Diversification',
      description: 'GCs with 5+ years experience are eligible for corporate board service ($70,000–$250,000/year per board seat). Board seats create income independence and career insurance. Register with PwC Board Governance Center, WomenCorporateDirectors, or National Association of Corporate Directors (NACD) for director candidate databases. 1 board seat generates annual income independent of employment.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '30 days — register', priority: 'High',
    },
    {
      title: 'Pursue a Public Company GC Role if Currently at Private Company',
      description: 'Public company GC roles ($350,000–$700,000 total comp) provide SEC filing obligations that create strong 12-month retention windows during any leadership transition. The SEC filing obligation means a company literally cannot function without the GC present — creating structural retention. Apply to 2 public company GC openings via LinkedIn or Major Lindsey & Africa legal recruiter network.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 30, deadline: '7 days', priority: 'Medium',
    },
  ),

  public_defender: pool(
    {
      title: 'Apply to a Federal Public Defender Office for Federal Employment Protection',
      description: 'Federal Public Defender offices (Article III court-funded, independent from executive branch politics) offer civil service-level protection, $80,000–$160,000 salary, loan forgiveness eligibility (PSLF), and career progression to Chief Deputy and First Assistant positions. Apply immediately to FD.org vacancy announcements — federal PD positions are rare, filled slowly, and extremely stable.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Pursue NACDL or State Criminal Defense Association Leadership',
      description: 'Public defenders who are active in NACDL (National Association of Criminal Defense Lawyers) or their state criminal defense association face 3× stronger employment networks for transition if budget cuts eliminate their position. Leadership roles (committee membership, CLE faculty) signal expertise that makes private defense firms actively recruit you.',
      layerFocus: 'L5 · Network', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build Criminal Defense Consulting for Law Students and Non-Profit Organizations',
      description: 'Public defenders with specialty expertise (federal sentencing, immigration consequences, juvenile, mental health court) earn $200–$400/hour as trainers for law school clinics and public defender offices in other jurisdictions. Develop a CLE curriculum around your specialty and pitch to 3 law schools or state public defender associations.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Apply for Public Service Loan Forgiveness Program and Document Employment',
      description: 'Public defenders employed at government offices qualify for PSLF (Public Service Loan Forgiveness) after 120 payments on income-driven repayment. If you haven\'t filed your Employment Certification Form annually, file immediately at studentaid.gov — retroactive certification is possible. PSLF eliminates law school debt, increasing your effective compensation by $30,000–$60,000/year.',
      layerFocus: 'L5 · Financial Protection', riskReductionPct: 22, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Explore Transition to Criminal Defense Private Practice via Innocence Projects',
      description: 'Criminal defense private practice pays $250–$500/hour for retained cases. The Innocence Project and state-based wrongful conviction organizations provide pro bono case experience that builds trial skills and public visibility that private clients seek. Offer to second-chair an innocence case to build your first private criminal defense client relationships.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
  ),

};

// ── ALIAS MAP ADDITIONS ────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_HEALTHCARE_LEGAL: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Registered Nurse variants
  'registered nurse': { canonicalKey: 'registered_nurse', displayRole: 'Registered Nurse (RN)' },
  'rn': { canonicalKey: 'registered_nurse', displayRole: 'Registered Nurse (RN)' },
  'staff nurse': { canonicalKey: 'registered_nurse', displayRole: 'Registered Nurse (RN)' },
  'charge nurse': { canonicalKey: 'registered_nurse', displayRole: 'Registered Nurse (RN)' },
  'travel nurse': { canonicalKey: 'registered_nurse', displayRole: 'Registered Nurse (RN)' },
  'nurse': { canonicalKey: 'registered_nurse', displayRole: 'Registered Nurse (RN)' },
  // NP variants
  'nurse practitioner': { canonicalKey: 'nurse_practitioner', displayRole: 'Nurse Practitioner (NP)' },
  'np': { canonicalKey: 'nurse_practitioner', displayRole: 'Nurse Practitioner (NP)' },
  'advanced practice nurse': { canonicalKey: 'nurse_practitioner', displayRole: 'Nurse Practitioner (NP)' },
  'aprn': { canonicalKey: 'nurse_practitioner', displayRole: 'Nurse Practitioner (NP)' },
  // Physician variants
  'physician': { canonicalKey: 'physician_general_practitioner', displayRole: 'Physician (MD/DO)' },
  'doctor': { canonicalKey: 'physician_general_practitioner', displayRole: 'Physician (MD/DO)' },
  'md': { canonicalKey: 'physician_general_practitioner', displayRole: 'Physician (MD/DO)' },
  'general practitioner': { canonicalKey: 'physician_general_practitioner', displayRole: 'Physician (GP)' },
  'gp': { canonicalKey: 'physician_general_practitioner', displayRole: 'Physician (GP)' },
  'family physician': { canonicalKey: 'physician_general_practitioner', displayRole: 'Family Physician' },
  // Specialist variants
  'specialist physician': { canonicalKey: 'specialist_physician', displayRole: 'Specialist Physician' },
  'cardiologist': { canonicalKey: 'specialist_physician', displayRole: 'Cardiologist' },
  'oncologist': { canonicalKey: 'specialist_physician', displayRole: 'Oncologist' },
  'neurologist': { canonicalKey: 'specialist_physician', displayRole: 'Neurologist' },
  'radiologist': { canonicalKey: 'specialist_physician', displayRole: 'Radiologist' },
  'anesthesiologist': { canonicalKey: 'specialist_physician', displayRole: 'Anesthesiologist' },
  'surgeon': { canonicalKey: 'specialist_physician', displayRole: 'Surgeon' },
  'pathologist': { canonicalKey: 'specialist_physician', displayRole: 'Pathologist' },
  // PA variants
  'physician assistant': { canonicalKey: 'physician_assistant', displayRole: 'Physician Assistant (PA)' },
  'pa': { canonicalKey: 'physician_assistant', displayRole: 'Physician Assistant (PA)' },
  'pa-c': { canonicalKey: 'physician_assistant', displayRole: 'Physician Assistant (PA-C)' },
  // PT variants
  'physical therapist': { canonicalKey: 'physical_therapist', displayRole: 'Physical Therapist (PT)' },
  'pt': { canonicalKey: 'physical_therapist', displayRole: 'Physical Therapist (PT)' },
  'physiotherapist': { canonicalKey: 'physical_therapist', displayRole: 'Physiotherapist' },
  // Pharmacist
  'pharmacist': { canonicalKey: 'pharmacist', displayRole: 'Pharmacist (RPh)' },
  'clinical pharmacist': { canonicalKey: 'pharmacist', displayRole: 'Clinical Pharmacist' },
  'hospital pharmacist': { canonicalKey: 'pharmacist', displayRole: 'Hospital Pharmacist' },
  // Clinical Research
  'clinical research coordinator': { canonicalKey: 'clinical_research_coordinator', displayRole: 'Clinical Research Coordinator' },
  'crc': { canonicalKey: 'clinical_research_coordinator', displayRole: 'Clinical Research Coordinator' },
  'research coordinator': { canonicalKey: 'clinical_research_coordinator', displayRole: 'Research Coordinator' },
  'clinical trial coordinator': { canonicalKey: 'clinical_research_coordinator', displayRole: 'Clinical Trial Coordinator' },
  // Hospital Admin
  'hospital administrator': { canonicalKey: 'hospital_administrator', displayRole: 'Hospital Administrator' },
  'healthcare administrator': { canonicalKey: 'hospital_administrator', displayRole: 'Healthcare Administrator' },
  'hospital coo': { canonicalKey: 'hospital_administrator', displayRole: 'Hospital COO' },
  'chief operating officer healthcare': { canonicalKey: 'hospital_administrator', displayRole: 'Hospital COO' },
  // Behavioral Health
  'therapist': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Licensed Therapist' },
  'psychotherapist': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Psychotherapist' },
  'lcswc': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Licensed Clinical Social Worker' },
  'lcsw': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Licensed Clinical Social Worker' },
  'lmft': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Licensed Marriage and Family Therapist' },
  'lpc': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Licensed Professional Counselor' },
  'mental health therapist': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Mental Health Therapist' },
  'counselor': { canonicalKey: 'behavioral_health_therapist', displayRole: 'Counselor' },
  // Legal
  'attorney': { canonicalKey: 'attorney_general_practice', displayRole: 'Attorney' },
  'lawyer': { canonicalKey: 'attorney_general_practice', displayRole: 'Lawyer' },
  'associate attorney': { canonicalKey: 'attorney_general_practice', displayRole: 'Associate Attorney' },
  'senior attorney': { canonicalKey: 'attorney_general_practice', displayRole: 'Senior Attorney' },
  'corporate attorney': { canonicalKey: 'corporate_attorney', displayRole: 'Corporate Attorney' },
  'corporate lawyer': { canonicalKey: 'corporate_attorney', displayRole: 'Corporate Lawyer' },
  'm&a attorney': { canonicalKey: 'corporate_attorney', displayRole: 'M&A Attorney' },
  'transactional attorney': { canonicalKey: 'corporate_attorney', displayRole: 'Transactional Attorney' },
  'ip attorney': { canonicalKey: 'ip_attorney', displayRole: 'IP Attorney' },
  'intellectual property attorney': { canonicalKey: 'ip_attorney', displayRole: 'Intellectual Property Attorney' },
  'patent attorney': { canonicalKey: 'ip_attorney', displayRole: 'Patent Attorney' },
  'patent counsel': { canonicalKey: 'ip_attorney', displayRole: 'Patent Counsel' },
  'employment attorney': { canonicalKey: 'employment_attorney', displayRole: 'Employment Attorney' },
  'labor attorney': { canonicalKey: 'employment_attorney', displayRole: 'Labor Attorney' },
  'compliance attorney': { canonicalKey: 'compliance_attorney', displayRole: 'Compliance Attorney' },
  'regulatory counsel': { canonicalKey: 'compliance_attorney', displayRole: 'Regulatory Counsel' },
  'paralegal': { canonicalKey: 'paralegal', displayRole: 'Paralegal' },
  'legal assistant': { canonicalKey: 'paralegal', displayRole: 'Legal Assistant' },
  'legal ops': { canonicalKey: 'legal_operations_manager', displayRole: 'Legal Operations Manager' },
  'legal operations': { canonicalKey: 'legal_operations_manager', displayRole: 'Legal Operations Manager' },
  'general counsel': { canonicalKey: 'general_counsel', displayRole: 'General Counsel' },
  'chief legal officer': { canonicalKey: 'general_counsel', displayRole: 'Chief Legal Officer' },
  'clo': { canonicalKey: 'general_counsel', displayRole: 'Chief Legal Officer' },
  'public defender': { canonicalKey: 'public_defender', displayRole: 'Public Defender' },
  'defense attorney': { canonicalKey: 'public_defender', displayRole: 'Defense Attorney' },
  'criminal defense attorney': { canonicalKey: 'public_defender', displayRole: 'Criminal Defense Attorney' },
};

// ── CANONICAL → ACTION GROUP ADDITIONS ────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_HEALTHCARE_LEGAL: Record<string, string> = {
  registered_nurse: 'registered_nurse',
  registered_nurse_india: 'registered_nurse_india',
  nurse_practitioner: 'nurse_practitioner',
  clinical_nurse_specialist: 'nurse_practitioner',
  physician_general_practitioner: 'physician_general_practitioner',
  specialist_physician: 'specialist_physician',
  radiologist: 'specialist_physician',
  pathologist: 'specialist_physician',
  anesthesiologist: 'specialist_physician',
  physician_assistant: 'physician_assistant',
  medical_technologist: 'clinical_research_coordinator',
  physical_therapist: 'physical_therapist',
  occupational_therapist: 'physical_therapist',
  speech_language_pathologist: 'behavioral_health_therapist',
  pharmacist: 'pharmacist',
  pharmacy_technician: 'paralegal',
  medical_coder_biller: 'paralegal',
  health_information_specialist: 'paralegal',
  clinical_research_coordinator: 'clinical_research_coordinator',
  biostatistician: 'clinical_research_coordinator',
  hospital_administrator: 'hospital_administrator',
  chief_medical_officer: 'hospital_administrator',
  healthcare_it_analyst: 'clinical_research_coordinator',
  health_data_analyst: 'clinical_research_coordinator',
  behavioral_health_therapist: 'behavioral_health_therapist',
  attorney_general_practice: 'attorney_general_practice',
  corporate_attorney: 'corporate_attorney',
  ip_attorney: 'ip_attorney',
  employment_attorney: 'employment_attorney',
  litigation_attorney: 'attorney_general_practice',
  compliance_attorney: 'compliance_attorney',
  privacy_counsel: 'compliance_attorney',
  regulatory_affairs_specialist: 'compliance_attorney',
  paralegal: 'paralegal',
  legal_secretary: 'paralegal',
  contract_manager: 'legal_operations_manager',
  legal_operations_manager: 'legal_operations_manager',
  public_defender: 'public_defender',
  prosecutor: 'attorney_general_practice',
  general_counsel: 'general_counsel',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_HEALTHCARE_LEGAL: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  registered_nurse: {
    roleKey: 'registered_nurse', roleName: 'Registered Nurse (RN)',
    demandIndex: 88, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 35, yoyJobOpeningsChange: 22,
    topHiringLocations: ['Houston TX', 'Dallas TX', 'Phoenix AZ', 'Los Angeles CA', 'Chicago IL'],
    aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1',
    calibrationNote: 'Structural nursing shortage; aging population + burnout attrition driving persistent demand.',
  },
  nurse_practitioner: {
    roleKey: 'nurse_practitioner', roleName: 'Nurse Practitioner (NP)',
    demandIndex: 91, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 28,
    topHiringLocations: ['New York NY', 'Florida', 'Texas', 'California', 'North Carolina'],
    aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1',
    calibrationNote: 'Full practice authority expansion + primary care physician shortage making NPs indispensable.',
  },
  physician_general_practitioner: {
    roleKey: 'physician_general_practitioner', roleName: 'Physician (GP/Family Medicine)',
    demandIndex: 85, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 78, yoyJobOpeningsChange: 15,
    topHiringLocations: ['Rural America', 'Texas', 'Florida', 'Georgia', 'North Carolina'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'Primary care physician shortage 2026: 14,000 FTEs short. Rural markets most acute.',
  },
  specialist_physician: {
    roleKey: 'specialist_physician', roleName: 'Specialist Physician',
    demandIndex: 82, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 120, yoyJobOpeningsChange: 8,
    topHiringLocations: ['New York NY', 'Houston TX', 'Los Angeles CA', 'Chicago IL', 'Boston MA'],
    aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1',
    calibrationNote: 'Specialist demand stable; procedural specialties (surgery, cardiology, radiology) protected by procedure volume.',
  },
  physician_assistant: {
    roleKey: 'physician_assistant', roleName: 'Physician Assistant (PA)',
    demandIndex: 87, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 48, yoyJobOpeningsChange: 20,
    topHiringLocations: ['New York NY', 'California', 'Texas', 'Pennsylvania', 'Florida'],
    aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1',
    calibrationNote: 'Physician extender demand surging as health systems expand care access with lower-cost providers.',
  },
  physical_therapist: {
    roleKey: 'physical_therapist', roleName: 'Physical Therapist (PT)',
    demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'stable',
    timeToFillDays: 40, yoyJobOpeningsChange: 16,
    topHiringLocations: ['Texas', 'Florida', 'California', 'New York NY', 'Ohio'],
    aiSubstitutionRisk: 0.09, dataQuarter: '2026-Q1',
    calibrationNote: 'Aging population + sports medicine expansion driving sustained PT demand.',
  },
  pharmacist: {
    roleKey: 'pharmacist', roleName: 'Pharmacist (RPh/PharmD)',
    demandIndex: 68, demandTrend: 'stable', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 28, yoyJobOpeningsChange: -8,
    topHiringLocations: ['Texas', 'California', 'New York NY', 'Pennsylvania', 'Florida'],
    aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1',
    calibrationNote: 'Retail pharmacy automation replacing dispensing. Clinical pharmacy roles growing; retail contracting.',
  },
  clinical_research_coordinator: {
    roleKey: 'clinical_research_coordinator', roleName: 'Clinical Research Coordinator',
    demandIndex: 75, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 32, yoyJobOpeningsChange: 18,
    topHiringLocations: ['Boston MA', 'San Francisco CA', 'San Diego CA', 'Research Triangle NC', 'Houston TX'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'AI-assisted trial design increasing efficiency; human CRCs still essential for patient interaction and protocol compliance.',
  },
  hospital_administrator: {
    roleKey: 'hospital_administrator', roleName: 'Hospital Administrator',
    demandIndex: 72, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 95, yoyJobOpeningsChange: 5,
    topHiringLocations: ['New York NY', 'Texas', 'California', 'Florida', 'Illinois'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'Consolidation waves creating leadership vacancies; FACHE-qualified administrators scarce.',
  },
  behavioral_health_therapist: {
    roleKey: 'behavioral_health_therapist', roleName: 'Licensed Therapist (LCSW/LMFT/LPC)',
    demandIndex: 86, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 32,
    topHiringLocations: ['New York NY', 'California', 'Texas', 'Colorado', 'Washington State'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'Mental health demand 40% above supply; telehealth expansion creating national access. Private practice rates rising 15% annually.',
  },
  attorney_general_practice: {
    roleKey: 'attorney_general_practice', roleName: 'Attorney (General Practice)',
    demandIndex: 65, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 45, yoyJobOpeningsChange: 3,
    topHiringLocations: ['New York NY', 'Washington DC', 'Los Angeles CA', 'Chicago IL', 'Houston TX'],
    aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1',
    calibrationNote: 'General practice attorneys face AI disruption in document review and research; specialty knowledge protected.',
  },
  corporate_attorney: {
    roleKey: 'corporate_attorney', roleName: 'Corporate Attorney',
    demandIndex: 72, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 12,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Chicago IL', 'Boston MA', 'Houston TX'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'M&A deal volume recovering 2026; private equity legal demand sustained. Senior corporate attorneys in shortage.',
  },
  ip_attorney: {
    roleKey: 'ip_attorney', roleName: 'IP Attorney / Patent Counsel',
    demandIndex: 78, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 18,
    topHiringLocations: ['San Francisco CA', 'Boston MA', 'San Diego CA', 'New York NY', 'Washington DC'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'AI patent filing surge + pharma pipeline activity driving record IP attorney demand.',
  },
  employment_attorney: {
    roleKey: 'employment_attorney', roleName: 'Employment Attorney',
    demandIndex: 70, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'stable',
    timeToFillDays: 42, yoyJobOpeningsChange: 14,
    topHiringLocations: ['California', 'New York NY', 'Illinois', 'Texas', 'Washington State'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'NLRB enforcement surge + California employment litigation volume driving demand on both sides.',
  },
  compliance_attorney: {
    roleKey: 'compliance_attorney', roleName: 'Compliance Attorney / Regulatory Counsel',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 48, yoyJobOpeningsChange: 20,
    topHiringLocations: ['New York NY', 'Washington DC', 'San Francisco CA', 'Chicago IL', 'Boston MA'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'AI governance + fintech regulation driving compliance attorney shortage. CRCM-certified attorneys command 30% premium.',
  },
  paralegal: {
    roleKey: 'paralegal', roleName: 'Paralegal',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 28, yoyJobOpeningsChange: 2,
    topHiringLocations: ['New York NY', 'Washington DC', 'Los Angeles CA', 'Chicago IL', 'Houston TX'],
    aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1',
    calibrationNote: 'AI document review tools reducing demand for general paralegals; e-discovery and specialty paralegals protected.',
  },
  legal_operations_manager: {
    roleKey: 'legal_operations_manager', roleName: 'Legal Operations Manager',
    demandIndex: 74, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 52, yoyJobOpeningsChange: 22,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Chicago IL', 'Austin TX', 'Seattle WA'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'CLM and AI legal tool implementations driving legal ops specialty demand.',
  },
  general_counsel: {
    roleKey: 'general_counsel', roleName: 'General Counsel / Chief Legal Officer',
    demandIndex: 68, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 110, yoyJobOpeningsChange: 6,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Austin TX', 'Chicago IL', 'Boston MA'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'GC demand tied to company formation and M&A activity. Startup GC demand elevated in 2026.',
  },
  public_defender: {
    roleKey: 'public_defender', roleName: 'Public Defender / Criminal Defense Attorney',
    demandIndex: 60, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 35, yoyJobOpeningsChange: 5,
    topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Philadelphia PA'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Public defender offices chronically underfunded but civil service protection and PSLF eligibility create retention.',
  },
};

// ── COMPENSATION ADDITIONS ─────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_HEALTHCARE_LEGAL: Record<string, Record<string, number>> = {
  registered_nurse: { '0-2': 62_000, '2-5': 72_000, '5-10': 85_000, '10-15': 98_000, '15+': 112_000 },
  nurse_practitioner: { '0-2': 105_000, '2-5': 118_000, '5-10': 135_000, '10-15': 155_000, '15+': 178_000 },
  physician_general_practitioner: { '0-2': 200_000, '2-5': 225_000, '5-10': 255_000, '10-15': 285_000, '15+': 310_000 },
  specialist_physician: { '0-2': 265_000, '2-5': 320_000, '5-10': 390_000, '10-15': 450_000, '15+': 520_000 },
  physician_assistant: { '0-2': 95_000, '2-5': 112_000, '5-10': 128_000, '10-15': 145_000, '15+': 165_000 },
  physical_therapist: { '0-2': 72_000, '2-5': 82_000, '5-10': 92_000, '10-15': 105_000, '15+': 118_000 },
  occupational_therapist: { '0-2': 68_000, '2-5': 78_000, '5-10': 88_000, '10-15': 100_000, '15+': 112_000 },
  speech_language_pathologist: { '0-2': 70_000, '2-5': 80_000, '5-10': 92_000, '10-15': 105_000, '15+': 115_000 },
  pharmacist: { '0-2': 112_000, '2-5': 122_000, '5-10': 132_000, '10-15': 142_000, '15+': 152_000 },
  pharmacy_technician: { '0-2': 38_000, '2-5': 44_000, '5-10': 52_000, '10-15': 58_000, '15+': 64_000 },
  medical_coder_biller: { '0-2': 42_000, '2-5': 52_000, '5-10': 62_000, '10-15': 72_000, '15+': 82_000 },
  clinical_research_coordinator: { '0-2': 52_000, '2-5': 65_000, '5-10': 80_000, '10-15': 95_000, '15+': 112_000 },
  biostatistician: { '0-2': 78_000, '2-5': 95_000, '5-10': 115_000, '10-15': 135_000, '15+': 155_000 },
  hospital_administrator: { '0-2': 88_000, '2-5': 112_000, '5-10': 145_000, '10-15': 180_000, '15+': 225_000 },
  chief_medical_officer: { '0-2': 280_000, '2-5': 340_000, '5-10': 420_000, '10-15': 510_000, '15+': 600_000 },
  behavioral_health_therapist: { '0-2': 52_000, '2-5': 68_000, '5-10': 85_000, '10-15': 105_000, '15+': 125_000 },
  attorney_general_practice: { '0-2': 78_000, '2-5': 100_000, '5-10': 135_000, '10-15': 175_000, '15+': 225_000 },
  corporate_attorney: { '0-2': 190_000, '2-5': 230_000, '5-10': 280_000, '10-15': 380_000, '15+': 480_000 },
  ip_attorney: { '0-2': 185_000, '2-5': 225_000, '5-10': 280_000, '10-15': 360_000, '15+': 450_000 },
  employment_attorney: { '0-2': 90_000, '2-5': 120_000, '5-10': 165_000, '10-15': 220_000, '15+': 290_000 },
  compliance_attorney: { '0-2': 105_000, '2-5': 140_000, '5-10': 185_000, '10-15': 240_000, '15+': 310_000 },
  paralegal: { '0-2': 48_000, '2-5': 60_000, '5-10': 75_000, '10-15': 90_000, '15+': 108_000 },
  legal_operations_manager: { '0-2': 85_000, '2-5': 110_000, '5-10': 145_000, '10-15': 175_000, '15+': 210_000 },
  general_counsel: { '0-2': 180_000, '2-5': 240_000, '5-10': 320_000, '10-15': 420_000, '15+': 550_000 },
  public_defender: { '0-2': 58_000, '2-5': 72_000, '5-10': 90_000, '10-15': 110_000, '15+': 135_000 },
};

// ── NEGOTIATION SCRIPT ADDITIONS ──────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_HEALTHCARE_LEGAL: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  registered_nurse: {
    strongOpener: 'Given the current nursing shortage — time-to-fill in this unit is averaging 35+ days — I\'d like to discuss my compensation relative to the agency rates you\'re currently paying for travel nurses.',
    leverageContext: 'Travel nurse agencies are billing $4,200–$5,800/week for the same skills. My institutional knowledge, patient relationships, and consistency create significantly more value than a traveler at 2× my current cost.',
    countersScript: 'I\'m asking for $X/hour, which is still $15–20/hour below what you\'re paying agencies. Additionally, I\'d like shift differential improvements for night/weekend shifts and tuition support for my specialty certification.',
    walkAwayLine: 'I\'ve already registered with two travel nursing agencies and have offers pending. I\'m choosing to stay because I value this team — but I need the compensation to reflect that decision.',
  },
  nurse_practitioner: {
    strongOpener: 'I\'ve analyzed the revenue my patient panel generates: approximately $X annually in RVUs. I\'d like to discuss increasing my compensation to more closely reflect my patient volume and outcomes.',
    leverageContext: 'My patient satisfaction scores are in the 90th percentile, my no-show rate is 8% below department average, and I\'ve maintained 98% adherence to quality metrics. I\'m operating a full primary care panel with NP-level overhead.',
    countersScript: 'I\'m requesting a base increase of $X plus a panel bonus structure tied to patient outcomes. I\'ve also received offers from health systems offering $X,000 signing bonuses for NPs with my specialty credentials.',
    walkAwayLine: 'I have a direct primary care opportunity that would yield $180,000–$240,000 with full practice authority. I\'m open to staying if we can find a compensation structure that reflects my market value.',
  },
  attorney_general_practice: {
    strongOpener: 'I\'ve prepared an analysis of the revenue I generate for this firm — $X in billable hours and $X in client origination — and I\'d like to discuss whether my compensation reflects that contribution.',
    leverageContext: 'My current origination credit represents $X of the firm\'s annual revenue. Replacing me would require 90–180 days of recruitment and risk disrupting client relationships that are tied to me personally.',
    countersScript: 'I\'m requesting a base compensation adjustment to $X, which is consistent with my billable hour contribution and market comps from [recruiting firm]. I\'d also like a clearer path on partnership timeline.',
    walkAwayLine: 'I\'ve had conversations with lateral recruiters and have a competing offer at $X that I\'m seriously considering. I\'d prefer to stay, but the compensation gap makes it difficult.',
  },
  general_counsel: {
    strongOpener: 'As I prepare for my performance review, I\'ve documented the legal risk mitigation and value creation I\'ve delivered this year: $X in litigation avoided, $X in outside counsel savings, and [specific M&A or regulatory outcome].',
    leverageContext: 'The legal function I\'ve built has reduced outside counsel spend by 28%, handled X matters internally that previously required outside counsel, and identified regulatory risks that saved the company from a potential $X fine.',
    countersScript: 'I\'m asking for a total compensation adjustment to $X, including base and equity. This is consistent with GC market comps for companies at our revenue scale. I\'d also like a seat on the board\'s Audit Committee.',
    walkAwayLine: 'I\'ve been approached by two private equity portfolio companies seeking a GC with my industry background. I\'m committed to this company\'s success, but need the compensation to reflect what the market offers.',
  },
  corporate_attorney: {
    strongOpener: 'I\'ve closed $X in transactions this year and contributed $X in billable revenue. I\'d like to discuss my compensation relative to that contribution and my progression to senior associate or partner track.',
    leverageContext: 'My deal sheet includes [transaction type, size], [transaction type, size], and [transaction type, size]. I\'ve been primary drafter on all major deal documents and have direct client relationships with [client name].',
    countersScript: 'Comparable associates at firms with similar deal volume receive $X. I\'m asking for a $X increase and a clear articulation of the partnership track criteria and expected timeline.',
    walkAwayLine: 'I have a lateral offer from [competing firm] that I\'m considering. The offer is $X higher than my current compensation. I\'d prefer to stay given my client relationships here, but need a credible path forward.',
  },
  behavioral_health_therapist: {
    strongOpener: 'My patient retention rate is 85% (vs. department average of 65%) and my telehealth session completion rate is 94%. I\'d like to discuss how my performance is reflected in my compensation.',
    leverageContext: 'Private practice therapists with my specialty training and client outcomes are billing $150–$250/session directly. Working through this organization, I\'m generating $X per session while receiving $Y — a $Z/session gap.',
    countersScript: 'I\'m asking for a base adjustment of $X and a performance bonus tied to client retention metrics. Alternatively, I\'d like to discuss a reduced hours arrangement that allows me to maintain 8–10 private practice clients.',
    walkAwayLine: 'I\'m currently building a private practice caseload. I\'d prefer to stay in this role if we can reach compensation alignment — otherwise, I\'ll transition to full private practice within 90 days.',
  },
};
