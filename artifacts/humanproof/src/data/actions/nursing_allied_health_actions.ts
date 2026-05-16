// nursing_allied_health_actions.ts — v38.0 Phase 1B
// 21 Nursing & Allied Health roles — structural shortage persists across hospital systems
// (BLS/AACN/AANA 2026 workforce data). AI substitution is near-zero for hands-on patient care;
// modest for radiologic technologists where AI-assisted reading is operational.

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

const A_NETWORKING: BracketPool = pool(
  { title: 'Activate Nurse Licensure Compact (NLC) or Multi-State Privileges', description: 'If you live in an NLC state, your single license already authorizes practice in 41+ compact states — but most nurses never operationalize it. Update your NURSYS profile, attest your primary state of residence, and list yourself on at least 2 travel/per-diem platforms (Aya Healthcare, AMN, Cross Country). Even passive availability surfaces $2,800-$4,200/wk travel rates. For non-NLC nurses, file the application for a compact-state secondary license now (90-day path) — this single change typically lifts maximum reachable comp by $20K-$45K/year.', layerFocus: 'L4 · Mobility', riskReductionPct: 18, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Specialty Certification Portfolio on Your License', description: 'Specialty certification (CCRN for ICU, CEN for ED, CNOR for OR, OCN for oncology, RNC-OB for L&D) is the single strongest signal for charge nurse / educator / clinical ladder advancement. Most hospitals pay a $1.50-$3.00/hr differential plus a one-time bonus ($500-$2,500). Schedule the AACN/ANCC exam within 90 days and use a Pocket Prep app + the official review course. Stack 2 certifications within 18 months to qualify for clinical ladder tier 3-4 ($3-$6/hr ladder differential).', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High' },
  { title: 'Join Your Specialty Association + Local Chapter', description: 'AACN (critical care), ENA (emergency), AORN (perioperative), AWHONN (women\'s health), ONS (oncology), APTA (PT), AOTA (OT), ASHA (SLP), AARC (respiratory), NAEMT (EMS), ASHP (pharmacy) — your specialty body is the gateway to scholarships, conference networking, and pre-public job posts. Senior practitioners on local chapter boards control 30-50% of clinical-educator and director-of-nursing-practice openings in your region.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Register on 3 Travel/Per-Diem Platforms for Rate Visibility', description: 'Aya Healthcare, AMN Healthcare, Cross Country, Trusted Health, and Nomad Health publish live weekly rate boards. Even if you have no intention of going travel, monthly rate visibility is the most accurate market-rate signal for your specialty. Per-diem at a second hospital ($60-$95/hr for RN, $85-$140/hr for CRNA) generates $400-$1,800/wk supplemental income while preserving your staff benefits.', layerFocus: 'L3 · Visibility', riskReductionPct: 16, deadline: '7 days', priority: 'Medium' },
  { title: 'Audit Your License Stack + Update LinkedIn With Active Credentials', description: 'List every active credential with expiry date: RN-BSN/MSN, NCLEX state(s), DEA (NPs/CRNAs), BLS/ACLS/PALS/NRP/TNCC, specialty certs. Recruiters at Aya, AMN, and direct hospital systems search by exact credential string — a fully populated profile typically triples inbound recruiter contact within 30 days. Add an "open to PRN/travel" signal even if currently staff.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_NURSING_ALLIED_HEALTH ──────────────────────────────────────────

export const ACTION_DB_NURSING_ALLIED_HEALTH: Record<string, BracketPool> = {

  icu_nurse: pool(
    { title: 'Earn CCRN Certification Within 90 Days', description: 'CCRN (AACN, $250 member / $360 non-member) is the credential gate for ICU charge nurse, clinical-ladder tier 3, rapid response team, and ECMO specialty. Adds $1.50-$3.00/hr differential plus a one-time $1,000-$2,500 hospital bonus. Eligibility: 1,750 hours of direct ICU care in the last 2 years. Use the AACN review book + Laura Gasparis review course (~$300). Schedule the exam now to force the deadline — passing CCRN is the single highest-leverage credential move for an ICU RN under age 40.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Stack CMC or CSC for Cardiothoracic ICU Path', description: 'CMC (cardiac medicine) or CSC (cardiac surgery) sub-specialty cert on top of CCRN opens CVICU and CT-surgical step-down roles paying $8-$15/hr above general ICU. Both are AACN exams ($170 each, member rate). Top academic medical centers (Cleveland Clinic, Mass General, Mayo) specifically recruit CCRN+CMC/CSC dyads for their ECMO and LVAD programs at $115K-$155K base + $20K-$35K shift differentials.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Negotiate Charge or Clinical Ladder Tier 4 Promotion', description: 'Senior ICU RNs with CCRN + 5+ years should be on clinical ladder tier 3-4 ($3-$6/hr ladder differential) and on the charge rotation. If you\'re not, request a clinical ladder portfolio review this quarter. If denied, the credential portfolio is immediately portable to a magnet-accredited competitor at $8K-$18K higher base. Also explore CRNA school as a 36-month pathway to $200K-$280K compensation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  er_nurse: pool(
    { title: 'Earn CEN Certification (Certified Emergency Nurse)', description: 'CEN (BCEN, $370 member / $470 non-member) is the credential gate for ED charge nurse, trauma team activation lead, and ENA leadership roles. Adds $1.50-$3.00/hr differential at most level 1-2 trauma centers. Eligibility: 2 years ED experience recommended. Use the Solheim Enterprises CEN review or the Jeff Solheim review course ($200-$350). Pair with TNCC (Trauma Nursing Core Course) within the same year.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    { title: 'Stack TCRN for Trauma Specialization', description: 'TCRN (Trauma Certified Registered Nurse, BCEN $370) opens trauma team activation lead and trauma program coordinator roles at level 1-2 trauma centers. Top systems (Shock Trauma Baltimore, Grady Atlanta, Harborview Seattle) pay $108K-$148K base + $20K shift/weekend differentials for CEN+TCRN holders. Trauma program coordinator is the bridge to nurse-manager pay ($120K-$155K).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Negotiate Float/Travel Hybrid or Pursue ED-to-CRNA Path', description: 'Senior ED RNs have two high-leverage paths: (1) negotiate a 0.6 FTE staff + travel/per-diem hybrid with the same hospital system (typical comp lift: 25-40%), or (2) apply to CRNA school — ED + ICU rotation is fully accepted ICU equivalence at most CRNA programs and the 36-month path leads to $200K-$280K. Decision should be made this quarter.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  or_nurse: pool(
    { title: 'Earn CNOR Certification (Certified Perioperative Nurse)', description: 'CNOR (CCI, $390 member / $480 non-member) is the credential gate for OR charge nurse, robotic surgery specialty lead, and surgical services educator. Adds $2-$4/hr differential. Eligibility: 2 years perioperative practice + 2,400 hours. Use the AORN CNOR review course (~$250). The single highest-leverage move for a perioperative RN.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '120 days', priority: 'Critical' },
    { title: 'Specialize in Robotic Surgery (da Vinci, Mako) or Cardiac/Neuro OR', description: 'Robotics-credentialed OR nurses (da Vinci, Mako, ROSA) and cardiac/neuro/transplant specialty nurses earn $8-$18/hr above general OR. Complete the Intuitive da Vinci nurse training and request rotation onto the robotics service line. Cardiac/transplant OR is the second-highest paid OR specialty after CRNA ($115K-$148K base + heavy weekend differential).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Pivot to RN First Assist (RNFA) for Surgeon-Adjacent Pay', description: 'CRNFA (Certified RN First Assist) is a 9-12 month program ($6K-$12K tuition) that converts an OR RN into a surgeon\'s first assistant. RNFAs earn $95K-$135K and can moonlight at $70-$110/hr for outpatient surgery centers. This is the closest non-advanced-practice path to surgeon-adjacent compensation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  pacu_nurse: pool(
    { title: 'Earn CPAN or CAPA Certification', description: 'CPAN (post-anesthesia) or CAPA (ambulatory perianesthesia) — ABPANC, $325 — is the credential gate for PACU charge and pre-op assessment lead. Adds $1.50-$3.00/hr differential. Eligibility: 1,800 hours perianesthesia. Use the ASPAN review materials.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Cross-Train to ICU for CRNA School Eligibility', description: 'PACU experience is partially accepted by some CRNA programs but most require 1+ year of true ICU. Negotiate an ICU rotation or PRN ICU role within your system — this is the gateway to CRNA school ($200K-$280K). For RNs not pursuing CRNA, ASC (ambulatory surgery center) PACU lead is a 4/10 schedule with $95K-$120K and minimal call.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate ASC Lead RN or Pre-Op Assessment Coordinator Role', description: 'Outpatient ASC (ambulatory surgery center) PACU positions are 4-day/10-hour shifts with no nights/weekends, paying $90K-$125K. Pre-op assessment coordinator is similarly desirable. These positions are competitive — apply within 30 days while CPAN/CAPA holders are scarce.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  labor_delivery_nurse: pool(
    { title: 'Earn RNC-OB (Inpatient Obstetrics) Certification', description: 'RNC-OB (NCC, $325) is the credential gate for L&D charge nurse, antepartum specialist, and clinical-ladder advancement. Adds $1.50-$3.00/hr differential plus $1,500-$2,500 one-time bonus at most magnet hospitals. Eligibility: 2 years inpatient OB. Use the Mometrix RNC-OB study guide + NCC practice exams.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Add C-EFM and NRP Instructor Credentials', description: 'C-EFM (electronic fetal monitoring, NCC $200) and NRP instructor status (AAP $200 instructor course) make you the in-house authority on intrapartum decision-making. These two add-ons typically convert a staff L&D RN into a charge / clinical educator track at $98K-$135K base. NRP instructor moonlight pays $40-$60/hr at simulation centers.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Pursue CNM or WHNP-BC Advanced Practice Path', description: 'Certified Nurse Midwife (CNM, AMCB) or Women\'s Health NP (WHNP-BC) are the natural advancement paths from L&D — both 24-36 month MSN/DNP programs leading to $115K-$165K compensation with full autonomy in most states. Apply for admission this cycle.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  psychiatric_nurse: pool(
    { title: 'Earn PMH-BC Certification (Psychiatric-Mental Health Nursing)', description: 'PMH-BC (ANCC, $295 ANA member) is the credential gate for psych charge, milieu lead, and PMH clinical educator. Adds $1.50-$3.00/hr differential. Eligibility: 2 years psych nursing. PMH-BC is the prerequisite signal for PMHNP school admission.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue PMHNP Path — Highest-Paid NP Specialty', description: 'Psychiatric Mental Health Nurse Practitioner (PMHNP-BC) is the highest-paid NP specialty: $135K-$205K with telehealth practices commonly clearing $230K. The acute national psychiatric provider shortage means full panels within 3-6 months of board pass. 36-month MSN/DNP path. Apply this cycle.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '180 days', priority: 'Critical' },
    { title: 'Build a Substance Use Disorder (SUD) or Crisis Specialization', description: 'CARN (Certified Addictions RN) and CARN-AP (advanced practice) opens addiction medicine roles at $95K-$135K with substantial telehealth/IOP options. Crisis stabilization unit experience is also valued. Senior psych RNs with SUD specialization rarely face market downturn.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  oncology_nurse: pool(
    { title: 'Earn OCN Certification (Oncology Certified Nurse)', description: 'OCN (ONCC, $315 ONS member) is the credential gate for chemotherapy/biotherapy administration, oncology charge, and infusion center lead. Adds $1.50-$3.00/hr differential. Eligibility: 2 years oncology RN. Use the ONS OCN review course + ONS chemo/bio provider course. Required for most academic cancer center roles (MD Anderson, Memorial Sloan Kettering, Dana-Farber).', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Stack BMTCN or AOCNS for Sub-Specialty Path', description: 'BMTCN (blood and marrow transplant) or AOCNS (advanced oncology clinical nurse specialist) opens BMT unit lead, CAR-T navigator, and research nurse coordinator roles at $98K-$148K base. CAR-T navigator is the highest-growth oncology niche — 30%+ YoY hiring at NCI-designated cancer centers.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'High' },
    { title: 'Pivot to Clinical Research Nurse or Pharma Industry', description: 'Oncology RNs with OCN + clinical trial experience are heavily recruited by Genentech, Merck, Bristol Myers Squibb, and CROs (IQVIA, Parexel) for medical science liaison and clinical research nurse roles at $115K-$165K with no nights/weekends. Apply within 30 days while oncology trial enrollment is at a 10-year high.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  nurse_practitioner_family: pool(
    { title: 'Add a Procedural Specialty (Aesthetics, Dermatology, or Pain)', description: 'FNP comp is dominated by procedural add-ons. Aesthetics certification (Empire Medical Training, $3K-$6K for botox/filler) opens medspa work at $90-$160/hr part-time. Dermatology procedural FNP earns $135K-$185K. Interventional pain FNPs (with proper supervision) earn $145K-$190K. Choose a procedural specialty within 90 days.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Operationalize Full Practice Authority (FPA) States', description: 'In the 27 FPA states (most recently Kansas, NY full FPA pending), FNPs can own and operate independent clinics. The DSO (dental service org) model is now active in primary care — FNP-owned DTC primary care clinics (Forward, Carbon Health adjacent) generate $250K-$450K owner compensation. Even maintaining a single FPA-state license unlocks telehealth practices like Hims/Hers, Done, and SteadyMD at $90-$140/hr.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate Productivity/RVU-Based Compensation Model', description: 'Salary FNPs in primary care typically cap at $115K-$135K. RVU/productivity-based contracts (common at retail clinics, DSO-style primary care, urgent care) regularly clear $145K-$185K for the same panel volume. Request a contract restructure or change employer within 6 months. Use MGMA NP compensation benchmark data as leverage.', layerFocus: 'L5 · Negotiation', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  nurse_practitioner_psychiatric: pool(
    { title: 'Build a Hybrid In-Person + Telehealth Practice Mix', description: 'PMHNP compensation maximizes with a 2-day in-person + 3-day telehealth blend. Telehealth platforms (Done, Cerebral, Talkiatry, Headway, Grow Therapy) pay $85-$140/hr with 6-week panel fill time. Stack 1-2 platforms with W-2 part-time hospital or community mental health work — typical total: $185K-$240K with reasonable hours.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Negotiate Pure RVU/Per-Patient Compensation', description: 'W-2 salary PMHNP roles cap at $145K-$175K. RVU or per-patient pay structures (common at private psychiatry groups, telehealth platforms, and PE-backed practices) regularly clear $200K-$260K for the same patient volume. Use MGMA Behavioral Health benchmark + APA workforce data as leverage in renegotiation.', layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Add Buprenorphine/MAT Waiver + Ketamine Specialty', description: 'X-waiver removal has expanded MAT prescribing for all PMHNPs — but most haven\'t built a structured buprenorphine practice. Adding a SUD MAT panel (15-30 patients) adds $35K-$65K/year. Ketamine assisted therapy certification (KRIYA Institute, MAPS) opens an emerging $250-$450/hour cash-pay niche.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '120 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  crna: pool(
    { title: 'Lock In a 1099 Locum Contract Pipeline', description: 'CRNA locum rates in 2026 are $250-$400/hr (W-2 equivalent: $520K-$830K annualized). Register with NorthStar Anesthesia, Somnia, Anesthesia Business Consultants, and AANA Joblink. Even maintaining 1-2 active 1099 contracts on a 2-week/month basis layered onto W-2 employment generates $80K-$160K supplemental income while preserving primary benefits.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical' },
    { title: 'Pursue CRNA-Owned Practice or Office-Based Anesthesia (OBA)', description: 'In states with CRNA full practice authority (29 states under VA opt-out + state law), CRNA-owned OBA practices serving GI/oral surgery/podiatry generate $400K-$700K owner compensation with significantly lower hours than hospital W-2. AANA practice management resources + state-specific opt-out advocacy is the foundation. Begin partnership discussions with 2-3 outpatient providers within 90 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate Call-Pay Premium and Stipend Structure', description: 'CRNA W-2 base is often $200K-$240K, but the variable comp (call pay $150-$300/hr, weekend differential $50-$100/hr, OB epidural stipend, late case stipend) typically adds $40K-$110K. Request a call structure audit with your group — many groups under-pay call relative to AANA benchmark. Levering AANA salary survey + locum rate data is the strongest negotiation lever.', layerFocus: 'L5 · Negotiation', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  clinical_nurse_specialist: pool(
    { title: 'Align CNS Credential With State APRN Authority', description: 'CNS scope of practice varies dramatically by state — some states grant full APRN status with prescriptive authority, others limit to consultative/educator role. Verify your state\'s CNS authority and pursue the certification (ACCNS-AG for adult-gero, PCCN, AGCNS-BC via ANCC, $295) that maximizes prescriptive scope. This single credential alignment moves comp from $95K (educator-track) to $128K-$155K (prescriber-track).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Lead an Evidence-Based Practice (EBP) or Quality Improvement Initiative', description: 'CNS hiring at magnet-accredited hospitals is dominated by EBP/QI portfolio. Lead a system-wide EBP initiative (CLABSI reduction, sepsis bundle compliance, pressure injury reduction) with measurable outcomes. This portfolio piece converts a clinical-educator CNS into a director-of-nursing-practice role at $135K-$170K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Pivot to Pharma MSL or Health-Tech Clinical Affairs', description: 'CNS credentials (especially in oncology, cardiology, critical care) are heavily recruited by pharma as medical science liaisons ($145K-$185K + bonus) and health-tech (Epic, Cerner, Hillrom, Stryker) for clinical informatics and clinical affairs roles at $130K-$170K with no patient care hours.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  // physical_therapist covered in healthcare_legal_actions.ts (v37.0) — removed to avoid duplication

  occupational_therapist: pool(
    { title: 'Earn AOTA Board Certification (BCG, BCMH, BCPR, or SCFES)', description: 'AOTA board certification ($785 ABOT exam) in gerontology (BCG), mental health (BCMH), physical rehab (BCPR), or feeding/eating/swallowing (SCFES) adds $6K-$15K to compensation. Eligibility: 5,000 hours OT practice + 500 hours in specialty. Use the AOTA review course.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Specialize in Hand Therapy (CHT) — Highest-Paid OT Niche', description: 'Certified Hand Therapist (CHT, HTCC $375) is the highest-comp OT specialty: $90K-$130K base plus cash-pay/specialty clinic premium. Eligibility: 3 years OT/PT + 4,000 hours hand therapy. Hand therapy clinics (often physician-owned MSK groups) are growing 8-12% YoY and aggressively recruit CHTs.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Pivot to Pediatric Outpatient or Sensory Integration Practice', description: 'Pediatric outpatient OT (sensory integration, autism therapy) is in acute shortage with 12-18 month waitlists in most metro areas. Pediatric OT practices pay $85K-$115K base, and ownership of a 2-3 therapist pediatric practice generates $160K-$260K owner pay. Acquire SIPT or Ayres Sensory Integration certification ($3K).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  speech_language_pathologist: pool(
    { title: 'Maintain ASHA CCC + Add a High-Demand Specialty Recognition', description: 'ASHA Certificate of Clinical Competence (CCC-SLP) is required baseline. Specialty recognition in swallowing/dysphagia (BCS-S), child language (BCS-CL), or fluency (BCS-F) adds $5K-$12K and opens medical SLP / FEES-credentialed roles at $85K-$120K. Schedule the specialty exam within 12 months.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    { title: 'Build a Medical SLP / Acute Hospital Practice', description: 'Medical SLPs (dysphagia, tracheostomy, voice, trach-vent populations) earn $85K-$118K base — substantially above school-based SLP ($65K-$82K). FEES (fiberoptic endoscopic evaluation of swallowing) certification ($1,200-$2,500 course) is the credential differentiator. Apply to acute hospital and SNF positions within 60 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Add Tele-Practice Platform Work for Schedule Flexibility', description: 'PresenceLearning, Lessonpix, Talkiatry-adjacent platforms, and direct school-district teletherapy pay $50-$85/hr part-time with flexible scheduling. Stack 8-15 hr/week of teletherapy onto W-2 employment for $25K-$50K supplemental income. Maintain interstate compact (ASLP-IC) licensure for multi-state reach.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '30 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  respiratory_therapist: pool(
    { title: 'Earn RRT-ACCS or RRT-NPS Specialty Credential', description: 'RRT-ACCS (Adult Critical Care, NBRC $190) or RRT-NPS (Neonatal/Pediatric, NBRC $190) is the credential gate for ICU charge RT, ECMO specialist, and transport team membership. Adds $1.50-$3.00/hr differential. Eligibility: RRT + 2 years specialty practice. Use the Kettering Review course.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Specialize in ECMO or Transport Team', description: 'ECMO specialist RT and critical care transport RT are the highest-comp RT niches: $88K-$118K base + heavy differentials. ECMO Specialist Certification (ELSO) is the gateway. Apply to your hospital\'s ECMO team or pursue a transport RT role at a level 1 system.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '120 days', priority: 'High' },
    { title: 'Bridge to Sleep Medicine, PFT Lab, or Pulmonary RN Path', description: 'RTs frequently bridge to (1) sleep medicine technologist + RPSGT credential ($70K-$95K, weekday day shifts), (2) PFT lab specialist ($72K-$92K), or (3) BSN bridge programs leading to ICU RN ($85K-$130K) and then CRNA path ($200K-$280K). Choose your trajectory within 90 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  radiologic_technologist: pool(
    { title: 'Stack Cross-Modality Credentials (CT, MRI, Mammo, Vascular)', description: 'Single-modality (R) techs are most exposed to AI reading triage and modality consolidation. Stack 2+ ARRT post-primary credentials — CT (R)(CT), MRI (R)(MR), Mammography (R)(M), or Vascular Interventional (R)(VI) — within 18 months. Each adds $4K-$10K base + opens travel rates of $2,200-$3,200/wk. Use the Mosby ARRT review or Clover Learning.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '180 days', priority: 'Critical' },
    { title: 'Pivot to Interventional Radiology or Cardiovascular Cath Lab', description: 'IR and cath lab techs are the AI-protected radiologic niche: hands-on procedural work that can\'t be automated. Comp: $85K-$118K base + on-call premium. Required credentials: RT(R) + RCIS (cardiovascular) or RT(VI) (vascular interventional). Apply within 90 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Bridge to Sonographer (RDMS) or Radiation Therapist Path', description: 'Diagnostic Medical Sonographer (RDMS, ARDMS) and Radiation Therapist (RT(T), ARRT) are the two highest-comp imaging specialties: RDMS $82K-$108K, RT(T) $92K-$128K. Both require 12-24 month bridge programs ($8K-$22K tuition). Either choice meaningfully de-risks AI exposure relative to general (R) practice.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  surgical_technologist: pool(
    { title: 'Earn CST + Specialty Surgical Service-Line Credential', description: 'CST (NBSTSA, $290) is the baseline. Stack a specialty service-line credential — cardiothoracic, neuro, orthopedic-robotics, or transplant — by completing the manufacturer training (Stryker, Medtronic, Intuitive, Mako) for that service. Service-line-specialized CSTs earn $58K-$78K vs. $48K-$62K for generalists.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Pursue CSFA (Surgical First Assistant) for Surgeon-Adjacent Pay', description: 'CSFA (Certified Surgical First Assistant, NBSTSA $290) is a 12-18 month bridge ($6K-$12K tuition) that converts a surgical tech into a first assistant. CSFAs earn $75K-$110K and moonlight at $55-$85/hr in outpatient surgery centers. This is the highest-leverage move for a surgical tech.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Travel Surg Tech or Locum Surgery Center Work', description: 'Travel surgical tech rates in 2026 are $1,600-$2,400/wk all-in. Register with Aya, AMN, and Cross Country. Locum surgery center work in metro areas pays $45-$70/hr 1099. Stack 2-3 weekend cases per month onto W-2 for $1,800-$3,500/month supplemental income.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '30 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  paramedic: pool(
    { title: 'Stack Critical Care Paramedic (CCP-C or FP-C) Credentials', description: 'CCP-C (Critical Care Paramedic, IBSC $325) or FP-C (Flight Paramedic, IBSC $325) is the credential gate for critical care transport, flight EMS, and hospital-based critical care paramedic roles paying $68K-$92K — significantly above 911 medic comp. Eligibility: 3 years paramedic + ICU rotations. Use the FlightBridgeED review course.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Pivot to Critical Care Transport (Flight or Ground)', description: 'Flight paramedic (HEMS) and ground critical care transport are the highest-comp paramedic niches: $72K-$95K base + flight pay/hazard differential. Top systems (Air Methods, Med-Trans, REACH, university hospital flight programs) recruit FP-C/CCP-C holders aggressively. Apply within 60 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Bridge to RN, PA, or Community Paramedicine Lead', description: 'Paramedic-to-RN bridge programs (12-18 months, $8K-$18K tuition) lead directly to ICU RN ($85K-$130K), then optionally CRNA path. Paramedic-to-PA bridge (Stony Brook, Quinnipiac, Hardin-Simmons) leads to $115K-$155K. Community paramedicine program lead is a $72K-$95K specialty with no nights. Choose your bridge within 90 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  emt: pool(
    { title: 'Schedule Paramedic School Application This Quarter', description: 'EMT-B compensation ($38K-$55K) is the most compressed in allied health and has limited upward mobility without paramedic certification. NAEMT-recognized paramedic programs are 12-24 months ($6K-$18K tuition, often employer-reimbursed) and lead directly to $52K-$78K paramedic comp + FP-C/CCP-C pathway to $72K-$95K. Apply this quarter — the differential opens within 24 months.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Specialize: Hospital ED Tech, Event Medic, or ER Scribe Hybrid', description: 'In-hospital EMT roles (ER tech, scribe-tech hybrid) pay $42K-$58K with no overnight 911 schedule. Event medical (concerts, sports, film/TV set medic) pays $25-$45/hr 1099 and stacks well with W-2. Hospital ED tech is also the most direct on-ramp to RN bridge programs (eligible for tuition reimbursement at most systems).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    { title: 'Stack Tactical Medic (TCCC), Industrial Medic, or Travel EMT', description: 'TCCC (Tactical Combat Casualty Care) and industrial site medic certifications open private-sector roles at $52K-$78K (oil/gas industrial medic, film/TV set medic, private security medic). Travel EMT rates are $1,400-$1,900/wk all-in. These specialty niches consistently out-pay traditional 911 EMT.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  hospital_pharmacist: pool(
    { title: 'Earn a BPS Specialty Board (BCPS, BCCCP, BCOP, or BCIDP)', description: 'BPS specialty certification (BCPS pharmacotherapy, BCCCP critical care, BCOP oncology, BCIDP infectious disease, $600 each) is the credential gate for clinical pharmacist (vs. staff/dispensing) tracks and adds $8K-$18K base. BCOP (oncology) and BCCCP (critical care) command the highest premiums at academic medical centers. Use the ACCP Updates in Therapeutics review.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Pivot to a Specialty Clinical Pharmacist Role (ID, Oncology, ICU)', description: 'Specialty clinical pharmacists (antimicrobial stewardship, oncology, critical care) earn $128K-$165K base — substantially above staff hospital pharmacist ($118K-$140K). These roles also have no overnight rotation. Apply within 90 days while specialty pharmacist shortage is at decade-high (ASHP 2026 workforce survey).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Pivot to Industry (Medical Affairs, MSL) or PBM Clinical Lead', description: 'Hospital pharmacists with BCPS + 5+ years are heavily recruited by pharma (medical science liaison $145K-$185K + bonus, medical affairs $155K-$195K), PBMs (CVS Caremark, Express Scripts clinical lead $135K-$165K), and biotech ($150K-$210K). No overnight call. Apply within 60 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '60 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  pharmacy_technician: pool(
    { title: 'Earn CPhT + Advanced Specialty (CSPT, IV/Sterile, or 503B)', description: 'CPhT (PTCB, $129) is the credential baseline. CSPT (Compounded Sterile Preparation Tech, PTCB $169), USP <800> hazardous drug compliance, or 503B outsourcing facility experience adds $3-$8/hr ($6K-$16K/year). Sterile compounding techs at academic medical centers and 503B facilities earn $48K-$62K vs. $34K-$44K for retail/general.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize: Oncology IV, Investigational Drug Service (IDS), or Informatics', description: 'Oncology IV compounding ($46K-$58K), Investigational Drug Service tech ($48K-$62K supporting clinical trials), or pharmacy informatics tech ($52K-$72K, Epic/Cerner system support) are the three highest-comp pharm tech niches. All are clinical research / IT-adjacent and dramatically out-pay retail.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Schedule PharmD School Application or 340B Specialist Path', description: 'PharmD bridge from CPhT is 4 years + 1 PGY-1 residency, leading to $118K-$155K hospital pharmacist comp. Alternatively, the 340B drug pricing program specialist track ($55K-$78K, no degree required) is a high-growth administrative niche at health systems and FQHCs. Choose path within 90 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_NURSING_ALLIED_HEALTH: Record<string, { canonicalKey: string; displayRole: string }> = {
  'icu nurse': { canonicalKey: 'icu_nurse', displayRole: 'ICU Nurse' },
  'critical care nurse': { canonicalKey: 'icu_nurse', displayRole: 'Critical Care Nurse' },
  'intensive care nurse': { canonicalKey: 'icu_nurse', displayRole: 'Intensive Care Nurse' },
  'cvicu nurse': { canonicalKey: 'icu_nurse', displayRole: 'CVICU Nurse' },
  'micu nurse': { canonicalKey: 'icu_nurse', displayRole: 'MICU Nurse' },
  'sicu nurse': { canonicalKey: 'icu_nurse', displayRole: 'SICU Nurse' },
  'er nurse': { canonicalKey: 'er_nurse', displayRole: 'ER Nurse' },
  'ed nurse': { canonicalKey: 'er_nurse', displayRole: 'ED Nurse' },
  'emergency department nurse': { canonicalKey: 'er_nurse', displayRole: 'Emergency Department Nurse' },
  'emergency room nurse': { canonicalKey: 'er_nurse', displayRole: 'Emergency Room Nurse' },
  'trauma nurse': { canonicalKey: 'er_nurse', displayRole: 'Trauma Nurse' },
  'or nurse': { canonicalKey: 'or_nurse', displayRole: 'OR Nurse' },
  'operating room nurse': { canonicalKey: 'or_nurse', displayRole: 'Operating Room Nurse' },
  'perioperative nurse': { canonicalKey: 'or_nurse', displayRole: 'Perioperative Nurse' },
  'circulating nurse': { canonicalKey: 'or_nurse', displayRole: 'Circulating Nurse' },
  'scrub nurse': { canonicalKey: 'or_nurse', displayRole: 'Scrub Nurse' },
  'pacu nurse': { canonicalKey: 'pacu_nurse', displayRole: 'PACU Nurse' },
  'recovery room nurse': { canonicalKey: 'pacu_nurse', displayRole: 'Recovery Room Nurse' },
  'post anesthesia nurse': { canonicalKey: 'pacu_nurse', displayRole: 'Post-Anesthesia Care Nurse' },
  'perianesthesia nurse': { canonicalKey: 'pacu_nurse', displayRole: 'Perianesthesia Nurse' },
  'labor and delivery nurse': { canonicalKey: 'labor_delivery_nurse', displayRole: 'Labor & Delivery Nurse' },
  'l&d nurse': { canonicalKey: 'labor_delivery_nurse', displayRole: 'L&D Nurse' },
  'obstetric nurse': { canonicalKey: 'labor_delivery_nurse', displayRole: 'Obstetric Nurse' },
  'maternity nurse': { canonicalKey: 'labor_delivery_nurse', displayRole: 'Maternity Nurse' },
  'birth nurse': { canonicalKey: 'labor_delivery_nurse', displayRole: 'Birth Nurse' },
  'psychiatric nurse': { canonicalKey: 'psychiatric_nurse', displayRole: 'Psychiatric Nurse' },
  'mental health nurse': { canonicalKey: 'psychiatric_nurse', displayRole: 'Mental Health Nurse' },
  'psych rn': { canonicalKey: 'psychiatric_nurse', displayRole: 'Psych RN' },
  'behavioral health nurse': { canonicalKey: 'psychiatric_nurse', displayRole: 'Behavioral Health Nurse' },
  'oncology nurse': { canonicalKey: 'oncology_nurse', displayRole: 'Oncology Nurse' },
  'chemo nurse': { canonicalKey: 'oncology_nurse', displayRole: 'Chemotherapy Nurse' },
  'infusion nurse': { canonicalKey: 'oncology_nurse', displayRole: 'Infusion Nurse' },
  'cancer nurse': { canonicalKey: 'oncology_nurse', displayRole: 'Cancer Nurse' },
  'family nurse practitioner': { canonicalKey: 'nurse_practitioner_family', displayRole: 'Family Nurse Practitioner (FNP)' },
  'fnp': { canonicalKey: 'nurse_practitioner_family', displayRole: 'FNP' },
  'fnp bc': { canonicalKey: 'nurse_practitioner_family', displayRole: 'FNP-BC' },
  'primary care nurse practitioner': { canonicalKey: 'nurse_practitioner_family', displayRole: 'Primary Care NP' },
  'psychiatric nurse practitioner': { canonicalKey: 'nurse_practitioner_psychiatric', displayRole: 'Psychiatric Nurse Practitioner (PMHNP)' },
  'pmhnp': { canonicalKey: 'nurse_practitioner_psychiatric', displayRole: 'PMHNP' },
  'pmhnp bc': { canonicalKey: 'nurse_practitioner_psychiatric', displayRole: 'PMHNP-BC' },
  'mental health nurse practitioner': { canonicalKey: 'nurse_practitioner_psychiatric', displayRole: 'Mental Health Nurse Practitioner' },
  'crna': { canonicalKey: 'crna', displayRole: 'Certified Registered Nurse Anesthetist (CRNA)' },
  'nurse anesthetist': { canonicalKey: 'crna', displayRole: 'Nurse Anesthetist' },
  'certified registered nurse anesthetist': { canonicalKey: 'crna', displayRole: 'CRNA' },
  'clinical nurse specialist': { canonicalKey: 'clinical_nurse_specialist', displayRole: 'Clinical Nurse Specialist (CNS)' },
  'cns rn': { canonicalKey: 'clinical_nurse_specialist', displayRole: 'CNS' },
  'aprn cns': { canonicalKey: 'clinical_nurse_specialist', displayRole: 'APRN-CNS' },
  // physical_therapist aliases in healthcare_legal_actions.ts (v37.0)
  'occupational therapist': { canonicalKey: 'occupational_therapist', displayRole: 'Occupational Therapist (OT)' },
  'otr l': { canonicalKey: 'occupational_therapist', displayRole: 'OTR/L' },
  'ot otr': { canonicalKey: 'occupational_therapist', displayRole: 'OT' },
  'speech language pathologist': { canonicalKey: 'speech_language_pathologist', displayRole: 'Speech-Language Pathologist (SLP)' },
  'slp': { canonicalKey: 'speech_language_pathologist', displayRole: 'SLP' },
  'speech therapist': { canonicalKey: 'speech_language_pathologist', displayRole: 'Speech Therapist' },
  'ccc slp': { canonicalKey: 'speech_language_pathologist', displayRole: 'CCC-SLP' },
  'respiratory therapist': { canonicalKey: 'respiratory_therapist', displayRole: 'Respiratory Therapist (RRT)' },
  'rrt': { canonicalKey: 'respiratory_therapist', displayRole: 'RRT' },
  'crt': { canonicalKey: 'respiratory_therapist', displayRole: 'CRT' },
  'pulmonary therapist': { canonicalKey: 'respiratory_therapist', displayRole: 'Pulmonary Therapist' },
  'radiologic technologist': { canonicalKey: 'radiologic_technologist', displayRole: 'Radiologic Technologist' },
  'rad tech': { canonicalKey: 'radiologic_technologist', displayRole: 'Rad Tech' },
  'x ray tech': { canonicalKey: 'radiologic_technologist', displayRole: 'X-Ray Tech' },
  'arrt rt': { canonicalKey: 'radiologic_technologist', displayRole: 'ARRT (R)' },
  'ct tech': { canonicalKey: 'radiologic_technologist', displayRole: 'CT Technologist' },
  'mri tech': { canonicalKey: 'radiologic_technologist', displayRole: 'MRI Technologist' },
  'surgical technologist': { canonicalKey: 'surgical_technologist', displayRole: 'Surgical Technologist' },
  'surg tech': { canonicalKey: 'surgical_technologist', displayRole: 'Surg Tech' },
  'cst': { canonicalKey: 'surgical_technologist', displayRole: 'CST' },
  'operating room tech': { canonicalKey: 'surgical_technologist', displayRole: 'Operating Room Tech' },
  'paramedic': { canonicalKey: 'paramedic', displayRole: 'Paramedic' },
  'emt p': { canonicalKey: 'paramedic', displayRole: 'EMT-P' },
  'nremt p': { canonicalKey: 'paramedic', displayRole: 'NREMT-P' },
  'flight paramedic': { canonicalKey: 'paramedic', displayRole: 'Flight Paramedic' },
  'critical care paramedic': { canonicalKey: 'paramedic', displayRole: 'Critical Care Paramedic' },
  'emt': { canonicalKey: 'emt', displayRole: 'Emergency Medical Technician (EMT)' },
  'emt b': { canonicalKey: 'emt', displayRole: 'EMT-B' },
  'nremt': { canonicalKey: 'emt', displayRole: 'NREMT' },
  'emergency medical technician': { canonicalKey: 'emt', displayRole: 'EMT' },
  'hospital pharmacist': { canonicalKey: 'hospital_pharmacist', displayRole: 'Hospital Pharmacist' },
  'clinical pharmacist': { canonicalKey: 'hospital_pharmacist', displayRole: 'Clinical Pharmacist' },
  'inpatient pharmacist': { canonicalKey: 'hospital_pharmacist', displayRole: 'Inpatient Pharmacist' },
  'pharmd hospital': { canonicalKey: 'hospital_pharmacist', displayRole: 'PharmD (Hospital)' },
  'pharmacy technician': { canonicalKey: 'pharmacy_technician', displayRole: 'Pharmacy Technician' },
  'pharm tech': { canonicalKey: 'pharmacy_technician', displayRole: 'Pharm Tech' },
  'cpht': { canonicalKey: 'pharmacy_technician', displayRole: 'CPhT' },
  'sterile compounding technician': { canonicalKey: 'pharmacy_technician', displayRole: 'Sterile Compounding Tech' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_NURSING_ALLIED_HEALTH: Record<string, string> = {
  icu_nurse: 'icu_nurse', er_nurse: 'er_nurse', or_nurse: 'or_nurse',
  pacu_nurse: 'pacu_nurse', labor_delivery_nurse: 'labor_delivery_nurse',
  psychiatric_nurse: 'psychiatric_nurse', oncology_nurse: 'oncology_nurse',
  nurse_practitioner_family: 'nurse_practitioner_family',
  nurse_practitioner_psychiatric: 'nurse_practitioner_psychiatric',
  crna: 'crna', clinical_nurse_specialist: 'clinical_nurse_specialist',
  occupational_therapist: 'occupational_therapist',
  speech_language_pathologist: 'speech_language_pathologist',
  respiratory_therapist: 'respiratory_therapist',
  radiologic_technologist: 'radiologic_technologist',
  surgical_technologist: 'surgical_technologist',
  paramedic: 'paramedic', emt: 'emt',
  hospital_pharmacist: 'hospital_pharmacist',
  pharmacy_technician: 'pharmacy_technician',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_NURSING_ALLIED_HEALTH: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  icu_nurse:                       { roleKey: 'icu_nurse',                       roleName: 'ICU Nurse',                                   demandIndex: 91, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 78, yoyJobOpeningsChange: 16, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Tampa FL'],                       aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'ICU RN shortage structural; magnet hospitals paying $20K+ sign-on bonuses. CCRN holders especially scarce.' },
  er_nurse:                        { roleKey: 'er_nurse',                        roleName: 'ER Nurse',                                    demandIndex: 89, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 14, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Las Vegas NV', 'Atlanta GA', 'Dallas TX'],                   aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'ED RN attrition driving chronic shortage; trauma center premium 15-25% above community ED.' },
  or_nurse:                        { roleKey: 'or_nurse',                        roleName: 'OR Nurse',                                    demandIndex: 86, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 72, yoyJobOpeningsChange: 12, topHiringLocations: ['Houston TX', 'Boston MA', 'Cleveland OH', 'Rochester MN', 'Pittsburgh PA'],              aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'OR RN shortage acute at academic centers; CNOR + robotics experience commands premium.' },
  pacu_nurse:                      { roleKey: 'pacu_nurse',                      roleName: 'PACU Nurse',                                  demandIndex: 80, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising', timeToFillDays: 52, yoyJobOpeningsChange: 8,  topHiringLocations: ['Houston TX', 'Atlanta GA', 'Phoenix AZ', 'Charlotte NC', 'Tampa FL'],                    aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'PACU demand stable; ASC growth driving 4/10 schedule competition.' },
  labor_delivery_nurse:            { roleKey: 'labor_delivery_nurse',            roleName: 'Labor & Delivery Nurse',                      demandIndex: 84, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 68, yoyJobOpeningsChange: 10, topHiringLocations: ['Houston TX', 'Dallas TX', 'Atlanta GA', 'Phoenix AZ', 'Salt Lake City UT'],               aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'L&D RN shortage worsened by hospital obstetric unit closures shifting volume to remaining sites.' },
  psychiatric_nurse:               { roleKey: 'psychiatric_nurse',               roleName: 'Psychiatric Nurse',                           demandIndex: 87, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 72, yoyJobOpeningsChange: 18, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Indianapolis IN', 'Denver CO'],                aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Psych RN demand acute; behavioral health bed shortage drives wages 12-18% above med-surg.' },
  oncology_nurse:                  { roleKey: 'oncology_nurse',                  roleName: 'Oncology Nurse',                              demandIndex: 85, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 70, yoyJobOpeningsChange: 14, topHiringLocations: ['Houston TX', 'Boston MA', 'Philadelphia PA', 'Atlanta GA', 'Seattle WA'],               aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'OCN nurses in shortage at NCI-designated centers; CAR-T and BMT specialty demand accelerating.' },
  nurse_practitioner_family:       { roleKey: 'nurse_practitioner_family',       roleName: 'Nurse Practitioner — Family (FNP)',           demandIndex: 89, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 20, topHiringLocations: ['Texas (statewide)', 'Florida (statewide)', 'Arizona', 'North Carolina', 'Tennessee'],     aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'FNP demand driven by physician shortage + retail clinic / telehealth expansion; FPA states out-pay restricted states by 15-25%.' },
  nurse_practitioner_psychiatric:  { roleKey: 'nurse_practitioner_psychiatric',  roleName: 'Nurse Practitioner — Psychiatric (PMHNP)',    demandIndex: 93, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 62, yoyJobOpeningsChange: 28, topHiringLocations: ['Remote (telehealth)', 'Texas', 'Florida', 'California', 'New York'],                    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'PMHNP is highest-comp NP specialty; telehealth platforms (Talkiatry, Headway, Done) hiring aggressively at $135K-$205K W-2 + RVU upside.' },
  crna:                            { roleKey: 'crna',                            roleName: 'Certified Registered Nurse Anesthetist',      demandIndex: 94, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 95, yoyJobOpeningsChange: 18, topHiringLocations: ['Rural (statewide)', 'Texas', 'Florida', 'Pennsylvania', 'California'],                  aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1', calibrationNote: 'CRNA is highest-paid nursing role; locum rates $250-$400/hr; rural hospitals paying $300K+ retention.' },
  clinical_nurse_specialist:       { roleKey: 'clinical_nurse_specialist',       roleName: 'Clinical Nurse Specialist (CNS)',             demandIndex: 78, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising', timeToFillDays: 75, yoyJobOpeningsChange: 6,  topHiringLocations: ['Boston MA', 'Houston TX', 'Cleveland OH', 'Pittsburgh PA', 'Rochester MN'],              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'CNS demand strongest at magnet-accredited academic centers; state-by-state APRN scope variability is the principal constraint.' },
  occupational_therapist:          { roleKey: 'occupational_therapist',          roleName: 'Occupational Therapist (OT)',                 demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 9,  topHiringLocations: ['Phoenix AZ', 'Dallas TX', 'Houston TX', 'Atlanta GA', 'Denver CO'],                      aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'OT demand driven by pediatric (autism/sensory) and CHT hand-therapy niches; SNF-based OT under reimbursement pressure.' },
  speech_language_pathologist:     { roleKey: 'speech_language_pathologist',     roleName: 'Speech-Language Pathologist (SLP)',           demandIndex: 81, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 60, yoyJobOpeningsChange: 11, topHiringLocations: ['Phoenix AZ', 'Houston TX', 'Atlanta GA', 'Dallas TX', 'Charlotte NC'],                   aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'SLP shortage particularly severe in medical (acute/SNF) settings — school-based SLP supply far exceeds medical SLP supply.' },
  respiratory_therapist:           { roleKey: 'respiratory_therapist',           roleName: 'Respiratory Therapist (RRT)',                 demandIndex: 83, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 50, yoyJobOpeningsChange: 12, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Charlotte NC'],                   aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'RT demand bolstered by ECMO program growth and persistent post-COVID respiratory care volume.' },
  radiologic_technologist:         { roleKey: 'radiologic_technologist',         roleName: 'Radiologic Technologist',                     demandIndex: 76, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable', timeToFillDays: 45, yoyJobOpeningsChange: 4,  topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Tampa FL'],                       aiSubstitutionRisk: 0.25, dataQuarter: '2026-Q1', calibrationNote: 'AI-assisted reading triage (Aidoc, Viz.ai) compresses single-modality (R) tech demand; cross-modality and IR/cath are protected.' },
  surgical_technologist:           { roleKey: 'surgical_technologist',           roleName: 'Surgical Technologist',                       demandIndex: 78, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 48, yoyJobOpeningsChange: 9,  topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Charlotte NC'],                   aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Surg tech demand growing with surgical volume; ASC expansion and service-line specialization driving 8-14% wage growth.' },
  paramedic:                       { roleKey: 'paramedic',                       roleName: 'Paramedic',                                   demandIndex: 84, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 13, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Las Vegas NV'],                   aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Paramedic shortage acute at 911 + critical care transport; FP-C/CCP-C holders rarely face market downturn.' },
  emt:                             { roleKey: 'emt',                             roleName: 'Emergency Medical Technician (EMT)',          demandIndex: 75, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable', timeToFillDays: 28, yoyJobOpeningsChange: 5,  topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Tampa FL'],                       aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'EMT-B wage compression persistent; primary protection is paramedic / RN bridge progression.' },
  hospital_pharmacist:             { roleKey: 'hospital_pharmacist',             roleName: 'Hospital Pharmacist',                         demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 8,  topHiringLocations: ['Houston TX', 'Boston MA', 'Atlanta GA', 'Chicago IL', 'Philadelphia PA'],                aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Hospital pharmacist demand strong; specialty BPS-board pharmacists in shortage. Retail PharmD displaced by automation — hospital is the resilient track.' },
  pharmacy_technician:             { roleKey: 'pharmacy_technician',             roleName: 'Pharmacy Technician',                         demandIndex: 73, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable', timeToFillDays: 30, yoyJobOpeningsChange: 3,  topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Charlotte NC'],                   aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1', calibrationNote: 'Retail/dispensing tech roles under pressure from automation; sterile compounding / 503B / IDS specialty tracks rising.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_NURSING_ALLIED_HEALTH: Record<string, Record<string, number>> = {
  icu_nurse:                       { '0-2': 78_000,  '2-5': 92_000,  '5-10': 108_000, '10-15': 122_000, '15+': 138_000 },
  er_nurse:                        { '0-2': 76_000,  '2-5': 90_000,  '5-10': 106_000, '10-15': 120_000, '15+': 135_000 },
  or_nurse:                        { '0-2': 78_000,  '2-5': 92_000,  '5-10': 108_000, '10-15': 122_000, '15+': 138_000 },
  pacu_nurse:                      { '0-2': 75_000,  '2-5': 88_000,  '5-10': 102_000, '10-15': 115_000, '15+': 128_000 },
  labor_delivery_nurse:            { '0-2': 76_000,  '2-5': 90_000,  '5-10': 105_000, '10-15': 118_000, '15+': 132_000 },
  psychiatric_nurse:               { '0-2': 74_000,  '2-5': 88_000,  '5-10': 104_000, '10-15': 118_000, '15+': 132_000 },
  oncology_nurse:                  { '0-2': 77_000,  '2-5': 91_000,  '5-10': 107_000, '10-15': 121_000, '15+': 135_000 },
  nurse_practitioner_family:       { '0-2': 108_000, '2-5': 122_000, '5-10': 138_000, '10-15': 155_000, '15+': 178_000 },
  nurse_practitioner_psychiatric:  { '0-2': 135_000, '2-5': 155_000, '5-10': 175_000, '10-15': 195_000, '15+': 220_000 },
  crna:                            { '0-2': 200_000, '2-5': 225_000, '5-10': 245_000, '10-15': 265_000, '15+': 285_000 },
  clinical_nurse_specialist:       { '0-2': 95_000,  '2-5': 112_000, '5-10': 128_000, '10-15': 145_000, '15+': 165_000 },
  // physical_therapist comp in healthcare_legal_actions.ts
  occupational_therapist:          { '0-2': 75_000,  '2-5': 84_000,  '5-10': 94_000,  '10-15': 104_000, '15+': 114_000 },
  speech_language_pathologist:     { '0-2': 72_000,  '2-5': 82_000,  '5-10': 92_000,  '10-15': 102_000, '15+': 112_000 },
  respiratory_therapist:           { '0-2': 62_000,  '2-5': 72_000,  '5-10': 84_000,  '10-15': 94_000,  '15+': 105_000 },
  radiologic_technologist:         { '0-2': 58_000,  '2-5': 68_000,  '5-10': 78_000,  '10-15': 88_000,  '15+': 96_000 },
  surgical_technologist:           { '0-2': 48_000,  '2-5': 56_000,  '5-10': 64_000,  '10-15': 72_000,  '15+': 80_000 },
  paramedic:                       { '0-2': 50_000,  '2-5': 60_000,  '5-10': 70_000,  '10-15': 78_000,  '15+': 85_000 },
  emt:                             { '0-2': 38_000,  '2-5': 44_000,  '5-10': 48_000,  '10-15': 52_000,  '15+': 55_000 },
  hospital_pharmacist:             { '0-2': 118_000, '2-5': 128_000, '5-10': 138_000, '10-15': 148_000, '15+': 158_000 },
  pharmacy_technician:             { '0-2': 38_000,  '2-5': 44_000,  '5-10': 50_000,  '10-15': 56_000,  '15+': 62_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_NURSING_ALLIED_HEALTH: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  icu_nurse: {
    strongOpener: 'I\'d like to discuss my comp in context of the current ICU travel rate gap. My CCRN credential, [X years ICU experience], and [specific responsibility — ECMO, CRRT, charge rotation] are operating at the clinical-ladder tier 3-4 level.',
    leverageContext: 'Live travel rates for ICU at Aya / AMN / Cross Country are running $2,800-$4,200/wk all-in (~$145K-$220K annualized) for a 13-week assignment in this region. Staff base + differentials at this hospital are running 25-35% below that. Magnet hospitals within 30 miles are offering CCRN-credentialed ICU RNs $8K-$18K sign-on plus higher base.',
    countersScript: 'I\'m asking for clinical ladder tier 3 advancement (additional $3-$5/hr), a one-time CCRN bonus of $2,500 if not previously paid, and a written commitment to charge nurse rotation within 6 months. Alternatively, a 0.6 FTE + travel-internal hybrid would close the gap.',
    walkAwayLine: 'I have an active conversation with [Aya / AMN / specific magnet hospital] at substantially higher total comp. The work here is meaningful — I\'d like to find a way to close the gap.',
  },
  er_nurse: {
    strongOpener: 'I want to align my compensation with the ED RN market — particularly with CEN + TNCC + [years of trauma center experience]. Trauma activations I lead, sepsis bundle compliance, and door-to-doc times under my charge shifts are all at or above the 75th percentile.',
    leverageContext: 'Travel ER rates are running $2,600-$3,800/wk all-in. Level 1-2 trauma centers within commuting distance pay $4-$8/hr above this facility for CEN holders. Replacement cost for a senior ED RN is 4-6 months minimum, during which the department runs deficit shifts.',
    countersScript: 'I\'m asking for clinical ladder tier 3, the CEN/TNCC differential applied retroactively, and a documented path to trauma program coordinator within 12 months. Alternatively, a per-diem float-pool premium of $8-$12/hr above staff base.',
    walkAwayLine: 'I have an offer at [specific Level 1 trauma center / travel agency] at meaningfully higher total comp. I prefer to stay — but I need to see real movement.',
  },
  crna: {
    strongOpener: 'I\'d like to align my compensation with the 2026 CRNA market. With AANA salary survey data, locum benchmark rates at $250-$400/hr, and my [years of specialty experience — cardiac, regional, OB], I\'m operating well below current 75th percentile.',
    leverageContext: 'Per the 2026 AANA Compensation & Benefits Survey, median CRNA base for my specialty/region is $X, with locum equivalent of $Y. My current package (including call) is below the 50th percentile. Locum agencies (NorthStar, Somnia, ABC) are offering $300/hr+ for my exact specialty mix. Replacement cost: 6-9 months and significant OR throughput impact.',
    countersScript: 'I\'m asking for base of $X (75th percentile per AANA), call pay of $250/hr (currently $Y), and a documented production-pay or stipend structure for late cases and weekends. If full base adjustment isn\'t possible, I\'ll accept a meaningful sign-on/retention bonus plus the call-pay adjustment immediately.',
    walkAwayLine: 'I have approaches from [specific locum agencies / competing groups / rural retention package at $300K+]. The work here is excellent — but the gap to market needs to close this cycle.',
  },
  nurse_practitioner_family: {
    strongOpener: 'I\'d like to discuss my comp in context of the FNP market — particularly with my [procedural specialty / panel size / RVU production] and the FPA-state telehealth alternatives now available to me.',
    leverageContext: 'Per MGMA 2026 NP Compensation Benchmark, FNPs at the 75th percentile in this region earn $X. Telehealth platforms (Hims/Hers, Done, SteadyMD, Carbon Health adjacent) are paying $90-$140/hr cash-pay, equivalent to $185K-$245K annualized. My panel size, visit volume, and outcomes are at or above the productivity-target threshold.',
    countersScript: 'I\'m asking for either (1) base adjustment to $X plus 10% RVU bonus structure above target, or (2) full conversion to RVU-based compensation at $Y per wRVU. Plus protected CME budget of $3K/year and procedural training reimbursement.',
    walkAwayLine: 'I have an offer at [retail clinic chain / DSO primary care / telehealth platform] at significantly higher productivity-based compensation. I want to find a way to stay — but the structure needs to change.',
  },
  nurse_practitioner_psychiatric: {
    strongOpener: 'I want to discuss compensation in context of the PMHNP market — currently the most acute provider shortage in mental health, with panel-fill time under 6 weeks at every platform.',
    leverageContext: 'Per MGMA 2026 Behavioral Health Benchmark, PMHNPs at the 75th percentile earn $X base; RVU-structured PMHNP roles regularly clear $200K-$260K. Telehealth platforms (Talkiatry, Headway, Done, Cerebral, Grow Therapy) are paying $90-$140/hr equivalent. APA national workforce data confirms 14-18 month wait for psychiatric care in most markets.',
    countersScript: 'I\'m asking for either (1) base of $X plus per-patient bonus structure above visit-volume target, or (2) full per-encounter / RVU compensation at $Y. Plus protected admin time for documentation (1 hour per 4 clinical hours) and CME budget of $4K/year.',
    walkAwayLine: 'I have multiple inbound offers from telehealth platforms and private group practices at meaningfully higher comp. I\'d prefer to stay — but the gap is significant.',
  },
  clinical_nurse_specialist: {
    strongOpener: 'I\'d like to discuss aligning my CNS comp with the senior APRN market. With my ACCNS-AG / specialty cert, the [specific EBP/QI initiatives] I\'ve led, and the prescriptive authority I exercise, I\'m operating at the senior-APRN-equivalent level.',
    leverageContext: 'Per ANCC and AACN 2026 APRN compensation data, CNS roles at the 75th percentile of magnet-accredited academic centers in this region earn $X. My specific contributions: [list outcomes — CLABSI reduction, sepsis bundle compliance, pressure injury reduction, residency-program impact]. Replacement cost: 6+ months and significant program disruption.',
    countersScript: 'I\'m asking for base of $X (75th percentile), CME budget of $4K/year, protected academic time (one full day per week for EBP / publication work), and a documented promotion path to director-of-nursing-practice within 18 months.',
    walkAwayLine: 'I have an active conversation with [academic medical center / pharma MSL / health-tech clinical affairs role] at meaningfully higher comp. I value the work here — but the gap needs to close.',
  },
  // physical_therapist negotiation script in healthcare_legal_actions.ts
  occupational_therapist: {
    strongOpener: 'I\'d like to discuss my comp with reference to the OT market — particularly with my [CHT / SCFES / BCP / BCG] specialty credential and the [pediatric / hand-therapy / acute] caseload I manage.',
    leverageContext: 'Per AOTA 2026 workforce data and travel OT rates ($1,700-$2,300/wk all-in), my specialty caseload is currently compensated below the 50th percentile. Hand-therapy clinics and pediatric outpatient practices in this region pay CHT/specialty-credentialed OTs $95K-$125K. Replacement cost in this specialty: 6+ months.',
    countersScript: 'I\'m asking for base of $X (matches specialty-credentialed OT 75th percentile), a documented productivity-target reduction, and CE budget of $1,500/year. Alternatively, partner-track / revenue-share structure at the practice level.',
    walkAwayLine: 'I have inbound from [specialty pediatric / hand-therapy clinic] at meaningfully higher comp plus partner-track. I value the work here — but the gap needs to close.',
  },
  hospital_pharmacist: {
    strongOpener: 'I want to align my compensation with the specialty clinical pharmacist market. With my BCPS / BCCCP / BCOP / BCIDP specialty board plus [years of clinical practice], I\'m operating at the senior clinical pharmacist level.',
    leverageContext: 'Per ASHP 2026 workforce and salary survey, specialty BPS-board pharmacists at the 75th percentile earn $X in this region. My clinical contributions: [antimicrobial stewardship / oncology / ICU rounding / pharmacokinetic consult volume]. Industry MSL / medical affairs roles pay $145K-$195K with no overnight. Replacement cost: 6+ months for board-certified specialty.',
    countersScript: 'I\'m asking for base of $X (specialty 75th percentile), elimination of overnight rotation (or a documented overnight differential of $8-$12/hr), CE budget of $3K/year, and protected academic time for residency-program / publication work.',
    walkAwayLine: 'I have approaches from [specific pharma MSL role / PBM clinical lead / academic medical center] at meaningfully higher comp with day-shift schedule. I\'d prefer to stay — but the gap needs to close.',
  },
  paramedic: {
    strongOpener: 'I\'d like to discuss my comp in context of the critical care / flight paramedic market. With my FP-C / CCP-C credential and [years of 911 / transport / flight experience], I\'m operating at the senior critical-care-transport level.',
    leverageContext: 'Per NAEMT 2026 workforce data, FP-C/CCP-C holders at flight programs and critical-care ground transport earn $X (75th percentile in this region). Locum critical-care transport rates are $35-$55/hr 1099 + travel pay. Industrial / oil & gas medic positions pay $72K-$95K base.',
    countersScript: 'I\'m asking for base of $X (matches FP-C/CCP-C 75th percentile), call/overtime differential of Y%, and protected CME/recertification budget. Alternatively, a path to critical care transport / flight assignment within 12 months.',
    walkAwayLine: 'I have inbound from [flight program / industrial medic position / RN bridge program with tuition support] at meaningfully higher total comp. I\'d like to find a way to stay.',
  },
  oncology_nurse: {
    strongOpener: 'I want to align my compensation with the OCN-credentialed oncology nurse market — particularly given the BMTCN / AOCNS sub-specialty trajectory I\'m on and the [CAR-T / BMT / clinical-trial] volume I manage.',
    leverageContext: 'Per ONS 2026 workforce data, OCN + sub-specialty credentialed oncology nurses at NCI-designated cancer centers and high-volume infusion centers earn $X (75th percentile). Industry clinical-research nurse and MSL roles at oncology-focused pharma pay $115K-$165K with no nights/weekends. Replacement cost: 6+ months for OCN + BMTCN/AOCNS combination.',
    countersScript: 'I\'m asking for clinical ladder tier 3-4 advancement, the OCN/BMTCN differential applied, ONS Congress + 1 specialty conference budget, and a documented path to navigator / CAR-T coordinator within 12 months.',
    walkAwayLine: 'I have an active conversation with [NCI-designated cancer center / pharma clinical research role / biotech medical affairs] at meaningfully higher comp. The work here is meaningful — I want to find a way to stay.',
  },
  labor_delivery_nurse: {
    strongOpener: 'I\'d like to discuss my comp in context of the L&D market — particularly with my RNC-OB + C-EFM + [NRP instructor / NRP] credentials and the volume of high-acuity births I manage.',
    leverageContext: 'Per AWHONN 2026 workforce data, RNC-OB credentialed L&D nurses with C-EFM at high-volume L&D units earn $X (75th percentile). Travel L&D rates currently $2,700-$3,800/wk all-in. Hospital obstetric unit closures in the region have concentrated volume and intensified shortage. Replacement cost: 4-6 months.',
    countersScript: 'I\'m asking for clinical ladder tier 3 advancement, RNC-OB / C-EFM differential applied retroactively, and CNM / WHNP educational support if pursuing advanced practice. Alternatively, a 0.6 FTE + per-diem hybrid that closes the comp gap.',
    walkAwayLine: 'I have an active conversation with [academic medical center L&D / travel agency / outpatient women\'s health practice]. I value the work here — but the gap to market is real.',
  },
};
