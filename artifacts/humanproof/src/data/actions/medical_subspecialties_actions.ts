// medical_subspecialties_actions.ts — v38.0 Phase 4B
// 12 Medical Subspecialty roles — procedural and cognitive subspecialists not covered
// in physicians_actions.ts or nursing_allied_health_actions.ts. ABMS board-certified
// niches with chronic shortage profiles (palliative, geriatrics, OB/GYN, urology, ENT).

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

const A_MEDSUB_NETWORKING: BracketPool = pool(
  { title: 'Join 2 Subspecialty Society Communities for Pipeline Intelligence', description: 'Active membership in your ABMS subspecialty society (SVS, AAO-HNS, AUA, ACOG, AAHPM, AGS, ACSM, AASM, ACNM, ASHA, AND) is the highest-yield single career investment. Senior physicians and clinicians share unposted hospital openings, locums opportunities, and PE-backed group expansions 60-120 days before they hit public boards. Commit to attending 1 regional chapter event per quarter and 2 society listserv responses per month.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Build a Public Clinical Profile Tied to Your Subspecialty Niche', description: 'Publish 2-3 clinical case writeups, society newsletter contributions, or guideline-summary posts on Doximity / LinkedIn / a personal site each quarter. Hospital recruiters and PE-backed multi-specialty groups (Optum, USPI, US Acute Care Solutions, OB/GYN Hospitalist Group, etc.) scan these for board-certified clinicians with documented subspecialty depth. A populated profile generates 4-8 inbound recruiter contacts per quarter.', layerFocus: 'L3 · Visibility', riskReductionPct: 16, deadline: '60 days', priority: 'Medium' },
  { title: 'Maintain ABMS Subspecialty Board Certification and CME Currency', description: 'ABMS Continuing Certification (formerly MOC) plus subspecialty board recertification cycles are the single largest defensible credential. Lapsed certification immediately drops marketable comp by 15-25% and disqualifies most hospital privilege panels. Budget $1,500-$3,500 per recert cycle plus 25-50 CME hours per year. Use ABMS portfolio platform plus a recognized review course (Hopkins, Mayo, or society annual meeting).', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: 'Aligned with cert cycle', priority: 'High' },
  { title: 'Register on Doximity and 2 Locums Platforms as a Hedge', description: 'A complete Doximity profile plus active accounts on 2 locums platforms (Weatherby, CompHealth, Locum Tenens.com, Barton Associates) create a passive income hedge and rapid re-employment path. Even occasional locums work ($1,800-$4,500/day depending on subspecialty) provides total layoff insulation. Most employment contracts permit unrestricted locums outside the geographic non-compete radius.', layerFocus: 'L3 · Reputation', riskReductionPct: 15, deadline: '14 days', priority: 'Medium' },
  { title: 'Audit Your CV for ABMS Boards, Fellowships, and Procedural Volume', description: 'Hospital credentialing committees and PE-backed groups screen on 3 things: ABMS board certification, ACGME-accredited fellowship completion, and specific procedural volume (case logs). Annotate your CV with explicit procedure counts (e.g., "850+ endovascular AAA repairs," "2,400+ deliveries," "650+ cochlear implants"). This single update typically doubles offer quality.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '7 days', priority: 'Medium' },
);

// ── ACTION_DB_MEDICAL_SUBSPECIALTIES ─────────────────────────────────────────

export const ACTION_DB_MEDICAL_SUBSPECIALTIES: Record<string, BracketPool> = {

  vascular_surgeon: pool(
    { title: 'Complete ABS Vascular Surgery Board Certification + SVS Active Membership', description: 'ABS Vascular Surgery board certification (post-fellowship, 0+5 integrated or 5+2 traditional pathway) plus Society for Vascular Surgery (SVS) Active Membership is the credential floor. SVS Active Membership unlocks the VESS Foundation, VAM annual meeting podium access, and the Vascular Specialist career board with PE-backed and hospital-employed offers at $475K-$700K base. Schedule the ABS-VS exam at registration to force the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Endovascular Procedural Volume and Publish Case Series', description: 'Endovascular AAA repair, peripheral interventions, and TCAR procedural volume drive comp at the 75th-90th percentile. Document 200+ EVAR/TEVAR cases, 400+ peripheral interventions, and 50+ TCAR cases. Submit a case series to the Journal of Vascular Surgery and present at SVS VAM. PE-backed vascular groups (Vascular Care Group, Cardiovascular Associates) hire senior vascular surgeons at $650K-$900K base + production bonus on this profile.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Negotiate Equity Stake in a PE-Backed Vascular Group', description: 'Senior vascular surgeons with 250+ EVAR cases and a referral network are recruited by PE-backed vascular groups (Vascular Care Group, USA Vein Clinics, USA Vascular Centers) with equity participation. Total comp typically reaches $850K-$1.3M with equity. Outpatient-based labs (OBLs) for peripheral work offer the highest production bonus structure in vascular surgery.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '180 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  ent_surgeon: pool(
    { title: 'Complete ABOto Board Certification + AAO-HNS Active Membership', description: 'American Board of Otolaryngology - Head and Neck Surgery (ABOto-HNS) board certification post 5-year ACGME residency is the credential floor. AAO-HNS (American Academy of Otolaryngology - Head and Neck Surgery) Active Membership unlocks the annual meeting, the Bulletin journal, and the ENT/Otolaryngology Job Connect board with hospital-employed and private group offers at $475K-$650K base.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Pursue Subspecialty Fellowship for Premium Pathways', description: 'ACGME-accredited 1-year ENT fellowships (rhinology, otology/neurotology, head and neck oncology, laryngology, pediatric ENT, facial plastics) increase compensation 20-35% and dramatically reduce competition. Neurotology + cochlear implants and head & neck oncology are the highest-comp pathways ($600K-$850K). Apply via the Otolaryngology Fellowship Match.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build an Ancillary Revenue Practice Model', description: 'Senior ENTs in private practice add allergy testing, in-office balloon sinuplasty, audiology services, and hearing aid dispensing for ancillary revenue. A mature ENT practice with these ancillaries generates $750K-$1.1M owner comp vs. $475K-$600K hospital-employed. Audiology dispensing alone can add $150K-$300K in margin annually.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  urologist: pool(
    { title: 'Complete ABU Board Certification + AUA Active Membership', description: 'American Board of Urology (ABU) certification post 5-year ACGME urology residency is the credential floor. American Urological Association (AUA) Active Membership unlocks the AUA Annual Meeting podium access, the Journal of Urology, and the AUA Career Center with hospital-employed and large-group offers at $500K-$700K base. AUA Update Series is the primary recertification CME pathway.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Robotic and Outpatient Procedural Volume', description: 'Robotic prostatectomy, GreenLight/HoLEP for BPH, and outpatient stone management drive urologist comp at the 75th-90th percentile. Document 250+ robotic cases, 400+ BPH interventions, and 600+ stone cases. Present at AUA and publish in Journal of Urology or Urology. Large urology groups (US Urology Partners, Solaris Health, Chesapeake Urology) hire at $625K-$850K base + production.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Join a PE-Backed Urology Mega-Group for Equity Upside', description: 'PE-backed urology platforms (Solaris Health, US Urology Partners, Genesis Healthcare Partners) recruit senior urologists with equity participation. Total comp reaches $950K-$1.4M with equity recap events. In-office ancillaries (lab, pathology, radiation, ASC ownership) drive additional margin. Urology is the highest-PE-consolidation specialty in 2026.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '180 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  ob_gyn_specialist: pool(
    { title: 'Complete ABOG Board Certification + ACOG Fellow Status', description: 'American Board of Obstetrics and Gynecology (ABOG) certification post 4-year ACGME residency, followed by ACOG Fellow status (FACOG), is the credential floor. ACOG (American Congress of Obstetricians and Gynecologists) Fellow status unlocks committee work, the OBGYN Career Center, and recognition required for tertiary referral practice. Compensation $325K-$475K base hospital-employed.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Pursue Subspecialty Fellowship (MFM, REI, Gyn-Onc, FPMRS, MIGS)', description: 'ABMS-recognized OB/GYN subspecialty fellowships (Maternal-Fetal Medicine, Reproductive Endocrinology and Infertility, Gynecologic Oncology, Female Pelvic Medicine, Minimally Invasive Gyn Surgery) increase compensation 30-50%. REI ($550K-$850K at IVF networks like Inception, Pinnacle, US Fertility) and Gyn-Onc are the highest-comp subspecialty pathways. Apply via SREI / SGO match.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Transition to OB Hospitalist or Laborist Model', description: 'OB hospitalist groups (OB Hospitalist Group, Ob Hospitalist Network) offer shift-based work at $325K-$450K with zero call burden — a major resilience improvement vs. traditional private OB. The shift model also eliminates the 24/7 call burnout that drives early retirement. Apply directly to OBHG or Ob Hospitalist Network within 14 days for openings.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  palliative_care_specialist: pool(
    { title: 'Complete ABMS Hospice and Palliative Medicine Board Certification + AAHPM Membership', description: 'ABMS Hospice and Palliative Medicine (HPM) subspecialty certification (1-year ACGME fellowship after primary residency in IM/FM/Peds/Anesthesia/Surgery/Neurology/Psychiatry) is the credential floor. American Academy of Hospice and Palliative Medicine (AAHPM) membership unlocks the Annual Assembly, the Journal of Pain and Symptom Management, and the AAHPM Career Network. Compensation $280K-$380K with massive demand.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Telehealth Palliative Practice for Reach Multiplication', description: 'Telehealth palliative care (Aspire Health, Resolution Care, Empath Health) reaches underserved populations and multiplies physician capacity 3-5x. Senior palliative physicians in telehealth networks earn $325K-$425K with hybrid in-person/virtual schedules. CMS expanded telehealth reimbursement for palliative consults in 2026.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Lead a Hospital Palliative Program for Director-Track Comp', description: 'Hospital palliative program medical directors earn $350K-$475K and own program design + ROI metrics (reduced ICU days, hospice transitions, advance care planning). The Center to Advance Palliative Care (CAPC) provides program leadership training. Apply to director roles at academic medical centers and large IDNs (Cleveland Clinic, Mayo, Kaiser).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  geriatrician: pool(
    { title: 'Complete ABIM Geriatric Medicine Board Certification + AGS Fellow Status', description: 'ABIM Geriatric Medicine subspecialty certification (1-year ACGME fellowship after IM or FM residency) plus American Geriatrics Society (AGS) Fellow (AGSF) status is the credential floor. AGS Annual Scientific Meeting, the Journal of the American Geriatrics Society, and AGS GeriatricsCareOnline are the primary CME pathways. Compensation $260K-$355K with critical shortage in 2026.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Transition to Senior-Focused Value-Based Care Practice', description: 'Senior-focused value-based primary care groups (ChenMed, Oak Street Health, CenterWell, Iora Health/One Medical Senior, Cano Health) employ geriatricians at $325K-$425K base + capitation-tied bonus. The value-based model rewards geriatric expertise (reduced hospitalizations, polypharmacy management) at a level fee-for-service cannot match. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '14 days', priority: 'Critical' },
    { title: 'Build Dementia and Polypharmacy Subspecialty Niche', description: 'Behavioral and Psychological Symptoms of Dementia (BPSD) management and high-complexity polypharmacy de-prescribing are unfilled subniches. Complete the AGS / Alzheimer\'s Association Dementia Care Practice Recommendations training. Geriatricians with dementia care expertise are recruited to memory clinics and ACO programs at $375K-$450K.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '120 days', priority: 'High' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  sports_medicine_physician: pool(
    { title: 'Complete ABMS Sports Medicine CAQ + ACSM Fellow Status', description: 'ABMS Certificate of Added Qualification (CAQ) in Sports Medicine (1-year ACGME fellowship after FM/IM/Peds/EM/PMR) plus American College of Sports Medicine (ACSM) Fellow (FACSM) status is the credential floor. The American Medical Society for Sports Medicine (AMSSM) provides the primary clinical CME. Compensation $290K-$385K hospital-employed; $400K+ with team coverage contracts.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Team Coverage and Mass-Participation Event Portfolio', description: 'Team physician roles with NCAA Division I programs, NFL/NBA/MLB/NHL teams, and Olympic Training Centers are the prestige pathway. Even high school district team physician contracts ($25K-$60K/year as W-2 supplement) build the portfolio. Mass-participation events (marathons, IRONMAN, USA Cycling) build experience and visibility. AMSSM Job Board lists team physician openings.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    { title: 'Develop a Regenerative Medicine and MSK Ultrasound Practice', description: 'MSK ultrasound, ultrasound-guided injections, PRP, and biologics (regenerative medicine) drive senior sports med physician compensation to $425K-$575K in private practice. Complete the AMSSM MSK Ultrasound certification ($895). Cash-pay regenerative procedures yield 65-80% margin vs. 25-35% on traditional E/M visits.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  sleep_medicine_specialist: pool(
    { title: 'Complete ABMS Sleep Medicine Certification + AASM Member Status', description: 'ABMS Sleep Medicine subspecialty certification (1-year ACGME fellowship after primary residency in IM/FM/Peds/Neurology/Psychiatry/Pulmonary/Anesthesia/ENT) plus American Academy of Sleep Medicine (AASM) Member status is the credential floor. AASM Annual Meeting and the Journal of Clinical Sleep Medicine are the primary CME pathways. Compensation $290K-$385K.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Telehealth Sleep Practice With AASM-Accredited PSG/HSAT', description: 'Telehealth sleep medicine (Lofta, Sleep Centers of America, Sleep Number HomeMed) is the highest-growth sleep medicine model. Home Sleep Apnea Testing (HSAT) volume + telehealth follow-up reaches 5x the patient volume of traditional clinic models. Senior sleep physicians in telehealth networks earn $355K-$475K. AASM-accredited HSAT interpretation requires board certification + facility accreditation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Develop a Pediatric Sleep or Insomnia CBT-I Niche', description: 'Pediatric sleep medicine and CBT-I (cognitive behavioral therapy for insomnia) are the unfilled subniches in sleep medicine. Pediatric sleep board-certified physicians command $375K-$475K. CBT-I certification (via the Society of Behavioral Sleep Medicine) opens cash-pay insomnia programs with $300/visit margin. Document a CBT-I program for portfolio.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '120 days', priority: 'High' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  nurse_midwife: pool(
    { title: 'Complete AMCB Certification (CNM) + ACNM Membership', description: 'American Midwifery Certification Board (AMCB) Certified Nurse-Midwife (CNM) credential (post-MSN/DNP nurse-midwifery program accredited by ACME) is the credential floor. American College of Nurse-Midwives (ACNM) membership unlocks the ACNM Annual Meeting, the Journal of Midwifery & Women\'s Health, and the ACNM Career Center. Compensation $115K-$155K hospital-employed; $145K+ with full-scope practice authority states.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Move to a Full-Scope Practice Authority State', description: 'CNMs in full-practice-authority states (per ACNM 2026 State of the Profession) earn 20-35% more than in restricted states. Top markets: California, Washington, New Mexico, Vermont, Massachusetts, New York. Full-scope practice authority allows independent prescribing, birth center operation, and direct hospital privileging without supervising physician. Plan a 12-18 month move if currently in a restricted state.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Hospital-Based or Birth Center Practice', description: 'CNMs in OB hospitalist co-management models (with OBHG, OB Hospitalist Network, or large IDN women\'s services) earn $145K-$185K with shift-based scheduling. Alternatively, freestanding birth center practice (AABC-accredited) generates owner comp of $175K-$240K at maturity. Either model dramatically improves career resilience vs. traditional private practice.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  audiologist: pool(
    { title: 'Complete AuD + ABA Certification + ASHA CCC-A', description: 'Doctor of Audiology (AuD) from a CAA-accredited program plus American Board of Audiology (ABA) certification plus ASHA Certificate of Clinical Competence in Audiology (CCC-A) is the credential floor. American Speech-Language-Hearing Association (ASHA) membership unlocks the ASHA Convention, the American Journal of Audiology, and the ASHA Career Portal. Compensation $90K-$120K hospital/clinic-employed.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'High' },
    { title: 'Develop Cochlear Implant and Diagnostic Audiology Niche', description: 'Cochlear implant audiologist roles at academic medical centers and CI manufacturer support roles (Cochlear, MED-EL, Advanced Bionics) earn $115K-$155K. Specialty pediatric audiology (ABA-PASC certification) and vestibular audiology are also high-demand subniches. The CI mapping workflow is one of the highest-value audiology specialties.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '180 days', priority: 'High' },
    { title: 'Own a Private Practice or Hearing Aid Dispensing Business', description: 'Private practice audiologists with hearing aid dispensing generate $145K-$220K owner comp at maturity (vs. $95K-$115K employed). Buying into an existing practice is the fastest path; AAA (American Academy of Audiology) provides practice valuation resources. OTC hearing aid market disruption since 2022 is reshaping the model — practices pivoting to fitting/programming services are thriving.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  dietitian_nutritionist: pool(
    { title: 'Complete CDR RD/RDN Credential + AND Membership', description: 'Commission on Dietetic Registration (CDR) Registered Dietitian / Registered Dietitian Nutritionist (RD/RDN) credential (post-ACEND-accredited program + supervised practice + RD exam) is the credential floor. Academy of Nutrition and Dietetics (AND) membership unlocks the Food & Nutrition Conference & Expo (FNCE), the Journal of the Academy of Nutrition and Dietetics, and the AND Career Center. Compensation $65K-$85K hospital/clinic.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '12 months', priority: 'High' },
    { title: 'Earn a Board-Certified Specialist Credential (CDCES, CSO, CSR, CSP, CSSD)', description: 'CDR Board-Certified Specialist credentials (CDCES for diabetes, CSO oncology, CSR renal, CSP pediatric, CSSD sports dietetics) add $12K-$22K to base compensation and unlock specialty roles. CDCES is the highest-demand credential (diabetes population is 38M+ and growing). Each board certification requires 2,000+ practice hours plus an exam. Schedule the exam to force the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'High' },
    { title: 'Build a Telehealth Private Practice Tied to MNT Reimbursement', description: 'Telehealth RDN private practice (Nourish, Berry Street, Fay Nutrition, Healthie platform) leverages MNT (Medical Nutrition Therapy) Medicare reimbursement for diabetes, kidney disease, and post-transplant. Senior RDNs in telehealth networks earn $110K-$145K with hybrid schedules. Cash-pay coaching adds $30K-$60K supplemental income. Apply to telehealth platforms within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),

  physician_assistant_surgical: pool(
    { title: 'Complete ARC-PA Accredited Program + NCCPA PA-C + CAQ in Surgery', description: 'ARC-PA accredited PA program plus NCCPA Physician Assistant - Certified (PA-C) credential plus NCCPA Certificate of Added Qualifications (CAQ) in Surgery is the credential floor for surgical PAs. The CAQ Surgery requires 4,000+ surgical practice hours plus exam ($350). Association of Physician Assistants in Surgery (APAS) membership unlocks specialty CME. Compensation $135K-$175K hospital-employed.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Build First-Assist Surgical Volume in a High-Demand Specialty', description: 'Surgical PAs with documented first-assist volume in cardiothoracic, neurosurgery, orthopedic spine, or transplant surgery earn $165K-$210K vs. $135K-$155K in general surgical PA roles. Document 500+ first-assist cases in your subspecialty. NCCPA CAQ in Cardiovascular & Thoracic Surgery is the next credential tier. Top medical centers (Cleveland Clinic, Mayo, Cedars-Sinai, NYU Langone) recruit specialized surgical PAs aggressively.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    { title: 'Negotiate Production Bonus or RVU-Based Compensation', description: 'Surgical PAs in private practice or PE-backed surgical groups can negotiate RVU-tied production bonuses that add $25K-$55K to base. Surgical PAs in robotic, spine, or cardiothoracic programs are scarce — the leverage is high. Apply to surgical PA roles at PE-backed orthopedic, urology, and cardiothoracic groups. Total comp can reach $200K-$240K at the senior level with production bonus.', layerFocus: 'L5 · Negotiation', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_MEDSUB_NETWORKING.senior.high[0], A_MEDSUB_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_MEDICAL_SUBSPECIALTIES: Record<string, { canonicalKey: string; displayRole: string }> = {
  'vascular surgeon': { canonicalKey: 'vascular_surgeon', displayRole: 'Vascular Surgeon' },
  'endovascular surgeon': { canonicalKey: 'vascular_surgeon', displayRole: 'Endovascular Surgeon' },
  'vascular and endovascular surgeon': { canonicalKey: 'vascular_surgeon', displayRole: 'Vascular and Endovascular Surgeon' },
  'ent surgeon': { canonicalKey: 'ent_surgeon', displayRole: 'ENT Surgeon' },
  'otolaryngologist': { canonicalKey: 'ent_surgeon', displayRole: 'Otolaryngologist' },
  'head and neck surgeon': { canonicalKey: 'ent_surgeon', displayRole: 'Head and Neck Surgeon' },
  'ear nose and throat surgeon': { canonicalKey: 'ent_surgeon', displayRole: 'Ear, Nose, and Throat Surgeon' },
  'urologist': { canonicalKey: 'urologist', displayRole: 'Urologist' },
  'urology specialist': { canonicalKey: 'urologist', displayRole: 'Urology Specialist' },
  'urological surgeon': { canonicalKey: 'urologist', displayRole: 'Urological Surgeon' },
  'ob gyn specialist': { canonicalKey: 'ob_gyn_specialist', displayRole: 'OB/GYN Specialist' },
  'obstetrician gynecologist': { canonicalKey: 'ob_gyn_specialist', displayRole: 'Obstetrician-Gynecologist' },
  'obgyn': { canonicalKey: 'ob_gyn_specialist', displayRole: 'OB/GYN' },
  'obstetrics and gynecology specialist': { canonicalKey: 'ob_gyn_specialist', displayRole: 'Obstetrics and Gynecology Specialist' },
  'palliative care specialist': { canonicalKey: 'palliative_care_specialist', displayRole: 'Palliative Care Specialist' },
  'palliative care physician': { canonicalKey: 'palliative_care_specialist', displayRole: 'Palliative Care Physician' },
  'hospice and palliative medicine physician': { canonicalKey: 'palliative_care_specialist', displayRole: 'Hospice and Palliative Medicine Physician' },
  'hpm physician': { canonicalKey: 'palliative_care_specialist', displayRole: 'HPM Physician' },
  'geriatrician': { canonicalKey: 'geriatrician', displayRole: 'Geriatrician' },
  'geriatric medicine physician': { canonicalKey: 'geriatrician', displayRole: 'Geriatric Medicine Physician' },
  'geriatric specialist': { canonicalKey: 'geriatrician', displayRole: 'Geriatric Specialist' },
  'sports medicine physician': { canonicalKey: 'sports_medicine_physician', displayRole: 'Sports Medicine Physician' },
  'sports medicine doctor': { canonicalKey: 'sports_medicine_physician', displayRole: 'Sports Medicine Doctor' },
  'team physician': { canonicalKey: 'sports_medicine_physician', displayRole: 'Team Physician' },
  'sleep medicine specialist': { canonicalKey: 'sleep_medicine_specialist', displayRole: 'Sleep Medicine Specialist' },
  'sleep medicine physician': { canonicalKey: 'sleep_medicine_specialist', displayRole: 'Sleep Medicine Physician' },
  'sleep doctor': { canonicalKey: 'sleep_medicine_specialist', displayRole: 'Sleep Doctor' },
  'somnologist': { canonicalKey: 'sleep_medicine_specialist', displayRole: 'Somnologist' },
  'nurse midwife': { canonicalKey: 'nurse_midwife', displayRole: 'Nurse-Midwife' },
  'certified nurse midwife': { canonicalKey: 'nurse_midwife', displayRole: 'Certified Nurse-Midwife (CNM)' },
  'cnm': { canonicalKey: 'nurse_midwife', displayRole: 'CNM' },
  'audiologist': { canonicalKey: 'audiologist', displayRole: 'Audiologist' },
  'doctor of audiology': { canonicalKey: 'audiologist', displayRole: 'Doctor of Audiology (AuD)' },
  'hearing specialist': { canonicalKey: 'audiologist', displayRole: 'Hearing Specialist' },
  'dietitian nutritionist': { canonicalKey: 'dietitian_nutritionist', displayRole: 'Registered Dietitian Nutritionist' },
  'registered dietitian': { canonicalKey: 'dietitian_nutritionist', displayRole: 'Registered Dietitian (RD)' },
  'rdn': { canonicalKey: 'dietitian_nutritionist', displayRole: 'RDN' },
  'clinical dietitian': { canonicalKey: 'dietitian_nutritionist', displayRole: 'Clinical Dietitian' },
  'physician assistant surgical': { canonicalKey: 'physician_assistant_surgical', displayRole: 'Surgical Physician Assistant' },
  'surgical physician assistant': { canonicalKey: 'physician_assistant_surgical', displayRole: 'Surgical PA' },
  'surgical pa': { canonicalKey: 'physician_assistant_surgical', displayRole: 'Surgical PA' },
  'first assist pa': { canonicalKey: 'physician_assistant_surgical', displayRole: 'First-Assist PA' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_MEDICAL_SUBSPECIALTIES: Record<string, string> = {
  vascular_surgeon: 'vascular_surgeon',
  ent_surgeon: 'ent_surgeon',
  urologist: 'urologist',
  ob_gyn_specialist: 'ob_gyn_specialist',
  palliative_care_specialist: 'palliative_care_specialist',
  geriatrician: 'geriatrician',
  sports_medicine_physician: 'sports_medicine_physician',
  sleep_medicine_specialist: 'sleep_medicine_specialist',
  nurse_midwife: 'nurse_midwife',
  audiologist: 'audiologist',
  dietitian_nutritionist: 'dietitian_nutritionist',
  physician_assistant_surgical: 'physician_assistant_surgical',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_MEDICAL_SUBSPECIALTIES: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  vascular_surgeon:             { roleKey: 'vascular_surgeon',             roleName: 'Vascular Surgeon',                  demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 165, yoyJobOpeningsChange: 14, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Tampa FL'],                aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Vascular surgery in chronic shortage; aging population + PAD/AAA prevalence drive demand. PE consolidation accelerating.' },
  ent_surgeon:                  { roleKey: 'ent_surgeon',                  roleName: 'ENT Surgeon (Otolaryngologist)',    demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 145, yoyJobOpeningsChange: 9,  topHiringLocations: ['Dallas TX', 'Atlanta GA', 'Houston TX', 'Phoenix AZ', 'Charlotte NC'],          aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'ENT demand strong, especially in suburban markets; subspecialty fellowships (neurotology, H&N onc) command premium.' },
  urologist:                    { roleKey: 'urologist',                    roleName: 'Urologist',                         demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 150, yoyJobOpeningsChange: 13, topHiringLocations: ['Dallas TX', 'Houston TX', 'Atlanta GA', 'Phoenix AZ', 'Orlando FL'],            aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Urology PE consolidation at peak; aging population + prostate/BPH/stone burden drive structural demand.' },
  ob_gyn_specialist:            { roleKey: 'ob_gyn_specialist',            roleName: 'OB/GYN Specialist',                 demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 130, yoyJobOpeningsChange: 11, topHiringLocations: ['Houston TX', 'Atlanta GA', 'Dallas TX', 'Phoenix AZ', 'Charlotte NC'],          aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'OB/GYN supply contracting in rural markets; hospitalist model + subspecialty (REI, Gyn-Onc) command premium.' },
  palliative_care_specialist:   { roleKey: 'palliative_care_specialist',   roleName: 'Palliative Care Specialist',        demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 175, yoyJobOpeningsChange: 22, topHiringLocations: ['Remote/Telehealth', 'Boston MA', 'New York NY', 'Cleveland OH', 'Los Angeles CA'], aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Palliative care in deepest physician shortage in 2026; aging population + ACO model expansion drive acute demand.' },
  geriatrician:                 { roleKey: 'geriatrician',                 roleName: 'Geriatrician',                      demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 180, yoyJobOpeningsChange: 24, topHiringLocations: ['Phoenix AZ', 'Tampa FL', 'Sarasota FL', 'San Diego CA', 'Houston TX'],          aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Geriatrician shortage acute; senior-focused VBC groups (ChenMed, Oak Street) hiring aggressively at premium comp.' },
  sports_medicine_physician:    { roleKey: 'sports_medicine_physician',    roleName: 'Sports Medicine Physician',         demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 12, topHiringLocations: ['Dallas TX', 'Atlanta GA', 'Denver CO', 'Phoenix AZ', 'Nashville TN'],            aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Sports medicine demand growing with active aging + youth sports; regenerative medicine niche drives premium.' },
  sleep_medicine_specialist:    { roleKey: 'sleep_medicine_specialist',    roleName: 'Sleep Medicine Specialist',         demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 105, yoyJobOpeningsChange: 10, topHiringLocations: ['Remote/Telehealth', 'Dallas TX', 'Atlanta GA', 'Phoenix AZ', 'Tampa FL'],         aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Sleep medicine demand strong; telehealth + HSAT model multiplying capacity. AI scoring of PSG creating efficiency gains.' },
  nurse_midwife:                { roleKey: 'nurse_midwife',                roleName: 'Nurse-Midwife (CNM)',               demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95,  yoyJobOpeningsChange: 18, topHiringLocations: ['Seattle WA', 'Portland OR', 'Boston MA', 'San Francisco CA', 'Denver CO'],       aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'CNM demand rising with full-scope practice authority expansion; OB hospitalist co-management driving hospital hiring.' },
  audiologist:                  { roleKey: 'audiologist',                  roleName: 'Audiologist',                       demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 75,  yoyJobOpeningsChange: 6,  topHiringLocations: ['Dallas TX', 'Phoenix AZ', 'Atlanta GA', 'Tampa FL', 'Houston TX'],              aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Audiology stable; OTC hearing aids reshaping dispensing model but increasing fitting/programming services demand.' },
  dietitian_nutritionist:       { roleKey: 'dietitian_nutritionist',       roleName: 'Registered Dietitian Nutritionist', demandIndex: 74, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 55,  yoyJobOpeningsChange: 13, topHiringLocations: ['Remote/Telehealth', 'New York NY', 'Los Angeles CA', 'Chicago IL', 'Dallas TX'], aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'RDN demand rising with telehealth platforms (Nourish, Berry Street) + GLP-1 obesity wave + diabetes population growth.' },
  physician_assistant_surgical: { roleKey: 'physician_assistant_surgical', roleName: 'Surgical Physician Assistant',      demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 70,  yoyJobOpeningsChange: 17, topHiringLocations: ['New York NY', 'Boston MA', 'Cleveland OH', 'Los Angeles CA', 'Houston TX'],       aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Surgical PA demand acute as physicians cap caseload growth; cardiothoracic/spine/neuro PAs in deepest shortage.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_MEDICAL_SUBSPECIALTIES: Record<string, Record<string, number>> = {
  vascular_surgeon:             { '0-2': 425_000, '2-5': 525_000, '5-10': 650_000, '10-15': 750_000, '15+': 825_000 },
  ent_surgeon:                  { '0-2': 380_000, '2-5': 475_000, '5-10': 575_000, '10-15': 660_000, '15+': 720_000 },
  urologist:                    { '0-2': 410_000, '2-5': 510_000, '5-10': 625_000, '10-15': 735_000, '15+': 810_000 },
  ob_gyn_specialist:            { '0-2': 290_000, '2-5': 355_000, '5-10': 425_000, '10-15': 490_000, '15+': 540_000 },
  palliative_care_specialist:   { '0-2': 245_000, '2-5': 295_000, '5-10': 345_000, '10-15': 395_000, '15+': 430_000 },
  geriatrician:                 { '0-2': 230_000, '2-5': 275_000, '5-10': 325_000, '10-15': 375_000, '15+': 415_000 },
  sports_medicine_physician:    { '0-2': 255_000, '2-5': 305_000, '5-10': 360_000, '10-15': 415_000, '15+': 460_000 },
  sleep_medicine_specialist:    { '0-2': 255_000, '2-5': 305_000, '5-10': 360_000, '10-15': 410_000, '15+': 450_000 },
  nurse_midwife:                { '0-2': 110_000, '2-5': 125_000, '5-10': 140_000, '10-15': 155_000, '15+': 168_000 },
  audiologist:                  { '0-2': 82_000,  '2-5': 95_000,  '5-10': 110_000, '10-15': 125_000, '15+': 140_000 },
  dietitian_nutritionist:       { '0-2': 62_000,  '2-5': 72_000,  '5-10': 82_000,  '10-15': 92_000,  '15+': 100_000 },
  physician_assistant_surgical: { '0-2': 130_000, '2-5': 150_000, '5-10': 170_000, '10-15': 185_000, '15+': 195_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_MEDICAL_SUBSPECIALTIES: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  vascular_surgeon: {
    strongOpener: 'I\'d like to align my compensation with the 2026 vascular surgery market. With my ABS Vascular Surgery board certification, [X] EVAR/TEVAR cases, [Y] TCAR cases, and SVS Active Membership, I\'m operating at the senior subspecialist level.',
    leverageContext: 'Per the MGMA 2026 Physician Compensation Report, vascular surgeons at the 75th percentile earn $725K base + production bonus. Vascular surgery is in 4:1 demand-to-supply per the SVS Workforce Study 2026. PE-backed vascular groups (Vascular Care Group, USA Vein Clinics) are recruiting at $800K-$950K total comp with equity.',
    countersScript: 'I\'m asking for $X base (matches MGMA 75th percentile), an RVU-based production bonus tier above 8,500 wRVU, and CME budget of $7,500/year including SVS VAM and one elective course. If full base adjustment isn\'t possible, I\'ll accept a meaningful production tier improvement.',
    walkAwayLine: 'I\'ve received approaches from [Vascular Care Group / a regional PE-backed vascular platform / academic medical center] at $X above current. I\'d prefer to continue our practice growth here, but the gap is meaningful.',
  },
  ent_surgeon: {
    strongOpener: 'I want to discuss my compensation in the context of the 2026 ENT market. With my ABOto-HNS board certification, [X] cases including [neurotology/H&N onc/rhinology] subspecialty volume, and AAO-HNS Active Membership, I\'m at the senior subspecialist tier.',
    leverageContext: 'Per the AAO-HNS 2026 Compensation Survey, fellowship-trained ENTs at the 75th percentile earn $625K total comp. The fellowship-trained ENT supply is acutely short — replacement cost for a fellowship-trained ENT is 12-18 months. Local competitor groups and PE-backed ENT platforms are actively recruiting.',
    countersScript: 'I\'m asking for $X base (75th percentile fellowship-trained), an RVU production bonus, and ancillary revenue participation (allergy/audiology/in-office balloon sinuplasty). I\'d also like CME budget of $6,000/year covering AAO-HNS plus one subspecialty course.',
    walkAwayLine: 'I have an offer from [a competitor practice / regional ENT mega-group / hospital-employed role] at meaningfully higher comp. The patient panel I\'ve built here is meaningful — I want to find a way to stay.',
  },
  urologist: {
    strongOpener: 'I\'d like to discuss aligning my compensation with the 2026 urology market. With my ABU board certification, [X] robotic prostatectomy cases, [Y] BPH interventions (HoLEP/GreenLight/UroLift), and AUA Active Membership, I\'m operating at the senior level.',
    leverageContext: 'Urology is the highest-PE-consolidation specialty in 2026. PE-backed urology platforms (Solaris Health, US Urology Partners, Genesis Healthcare Partners) recruit senior urologists at $750K-$950K total comp with equity participation. MGMA 75th percentile is $735K. In-office ancillaries (pathology, lab, radiation, ASC ownership) drive an additional $150K-$300K.',
    countersScript: 'I\'m asking for $X base (matches MGMA 75th percentile), production bonus above 9,000 wRVU, and ancillary revenue participation including any ASC ownership opportunity. CME budget of $7,500/year covering AUA Annual Meeting plus one elective course.',
    walkAwayLine: 'I have inbound from [Solaris Health / US Urology Partners / regional urology platform] at $X base plus equity. The practice we\'ve built has been excellent — I want to continue, but the gap to market with equity participation is significant.',
  },
  ob_gyn_specialist: {
    strongOpener: 'I\'d like to discuss my compensation in the context of the 2026 OB/GYN market. With my ABOG board certification, ACOG Fellow (FACOG) status, and [X] deliveries plus [Y] surgical cases this year, I\'m operating at the senior generalist or [subspecialty] level.',
    leverageContext: 'Per MGMA 2026, OB/GYNs at the 75th percentile earn $425K. OB hospitalist programs (OBHG, Ob Hospitalist Network) offer $375K-$450K with zero call burden — a meaningful alternative. Replacement cost for a board-certified OB/GYN in our market is 6-9 months.',
    countersScript: 'I\'m asking for $X base (75th percentile generalist or [subspecialty]), an RVU production tier, call differential of $X per night beyond [Y] nights/month, and CME budget of $5,500/year covering ACOG Annual Meeting plus one elective.',
    walkAwayLine: 'I have an offer from [OBHG hospitalist group / a competitor practice / regional women\'s services line] at significantly improved call schedule and comp. I value the patient continuity here — I want to find a way to stay.',
  },
  palliative_care_specialist: {
    strongOpener: 'I\'d like to align my compensation with the palliative care market. With my ABMS HPM board certification, AAHPM membership, and program contributions including [reduced LOS / hospice transitions / advance care planning rate], I\'m operating at the senior subspecialist level.',
    leverageContext: 'Palliative care is in deepest physician shortage among IM subspecialties (AAHPM Workforce Study 2026). Telehealth palliative networks (Aspire, Resolution Care, Empath) and major IDNs (Cleveland Clinic, Kaiser, Mayo, Sutter) actively recruit at $345K-$425K. Program ROI from palliative care typically reaches $5K-$15K per consult in reduced ICU and 30-day readmit costs.',
    countersScript: 'I\'m asking for $X base (matches AAHPM Compensation Survey 75th percentile), program leadership stipend of $25K-$40K if directing, and protected non-clinical time of 20% for program development and CAPC participation. CME budget of $5,000/year.',
    walkAwayLine: 'I have approaches from [Aspire Health / a competitor IDN palliative service / academic medical center program director role] at meaningful comp + protected program development time. The program we\'ve built here is important — I need real movement to continue.',
  },
  geriatrician: {
    strongOpener: 'I\'d like to discuss compensation in the context of the 2026 geriatrics market. With my ABIM Geriatric Medicine certification, AGS Fellow (AGSF) status, and [BPSD/polypharmacy/transitions of care] program contributions, I\'m operating at the senior level.',
    leverageContext: 'Geriatricians are in the deepest shortage of any IM subspecialty (AGS Workforce Study 2026). Senior-focused VBC platforms (ChenMed, Oak Street, CenterWell, Cano) recruit geriatricians at $355K-$450K total comp + capitation bonus. Replacement cost in our market is 9-15 months.',
    countersScript: 'I\'m asking for $X base (matches VBC market for geriatricians), a capitation or ACO shared-savings bonus tied to specific quality metrics (HCC documentation, falls reduction, hospitalizations), and protected time for dementia clinic or memory program development.',
    walkAwayLine: 'I have inbound from [ChenMed / Oak Street Health / CenterWell / a competitor VBC group] at $X above current + capitation upside. The patients I\'ve built relationships with here matter to me — I want to find a way to stay.',
  },
  sports_medicine_physician: {
    strongOpener: 'I want to align my compensation with the 2026 sports medicine market. With my ABMS Sports Medicine CAQ, ACSM Fellow status, and [team coverage / MSK ultrasound / regenerative medicine] portfolio, I\'m at the senior subspecialist level.',
    leverageContext: 'Per AMSSM 2026 Compensation Survey, sports medicine physicians with MSK ultrasound + regenerative medicine practices reach the $425K-$525K range. Team physician contracts (collegiate / professional / Olympic) add $35K-$90K. Cash-pay regenerative medicine yields 65-80% margin.',
    countersScript: 'I\'m asking for $X base (75th percentile sports med), production bonus tied to procedural volume, ancillary revenue participation for ultrasound-guided injections and regenerative procedures, and team coverage stipend if applicable.',
    walkAwayLine: 'I have an offer from [a competitor sports medicine group / orthopedic group with sports med line / cash-pay regenerative practice] with significantly higher procedural participation. I value our team relationships — I want to make this work.',
  },
  nurse_midwife: {
    strongOpener: 'I\'d like to discuss compensation in the context of the 2026 CNM market. With my AMCB certification, ACNM membership, [X] births attended, and full-scope practice authority in our state, I\'m operating at the senior CNM level.',
    leverageContext: 'Per ACNM 2026 State of the Profession, CNMs in full-practice-authority states at the 75th percentile earn $155K hospital-employed. OB hospitalist co-management (OBHG, OHN) employs CNMs at $150K-$185K with shift-based scheduling. Replacement cost for an experienced CNM is 4-6 months.',
    countersScript: 'I\'m asking for $X base (matches ACNM 75th percentile), call differential of $X per night beyond [Y] nights/month, and CME budget of $3,500/year covering ACNM Annual Meeting plus one elective. I\'d also like protected time for new graduate CNM mentorship.',
    walkAwayLine: 'I have an offer from [OBHG / OB Hospitalist Network / a freestanding birth center / a competitor hospital women\'s services line] at meaningfully higher comp + shift-based schedule. The patients here matter — but I need real movement.',
  },
  audiologist: {
    strongOpener: 'I want to discuss compensation in the context of the 2026 audiology market. With my AuD, ABA certification, ASHA CCC-A, and [cochlear implant / vestibular / pediatric] subspecialty volume, I\'m operating at the senior clinical audiologist level.',
    leverageContext: 'Per ASHA 2026 Audiology Compensation Report, senior clinical audiologists at the 75th percentile earn $125K + dispensing bonus. CI manufacturer support roles (Cochlear, MED-EL, Advanced Bionics) hire at $130K-$165K. Private practice with dispensing generates $175K-$220K owner comp.',
    countersScript: 'I\'m asking for $X base (matches ASHA 75th percentile), dispensing commission tier above $X/unit, and CME budget of $2,500/year covering AAA AudiologyNOW plus one elective. If full base isn\'t feasible, I\'ll accept improved dispensing commission structure.',
    walkAwayLine: 'I have an offer from [a CI manufacturer / a competitor audiology practice / hospital system audiology lead role] at $X above current. The patient relationships here are meaningful — I want to find a way to stay.',
  },
  physician_assistant_surgical: {
    strongOpener: 'I\'d like to align my compensation with the 2026 surgical PA market. With my NCCPA PA-C, CAQ in Surgery, and [X] first-assist cases in [cardiothoracic/neurosurgery/orthopedic spine/transplant], I\'m operating at the senior subspecialty surgical PA level.',
    leverageContext: 'Per AAPA 2026 Salary Report, subspecialty surgical PAs at the 75th percentile earn $185K + first-assist call differential. NCCPA Surgery CAQ + subspecialty first-assist experience is acutely short — replacement cost is 9-12 months. PE-backed surgical groups offer RVU-tied bonuses adding $25K-$55K.',
    countersScript: 'I\'m asking for $X base (matches AAPA 75th percentile surgical PA), first-assist call differential of $X per hour, RVU production bonus above [Y] wRVU, and CME budget of $3,500/year covering AAPA plus one subspecialty surgical course (APAS or specialty society).',
    walkAwayLine: 'I have an offer from [a competitor surgical practice / PE-backed orthopedic or cardiothoracic group / academic medical center surgical PA role] at significantly higher RVU participation. The surgical team relationships here are valuable — I need to see meaningful movement to stay.',
  },
};
