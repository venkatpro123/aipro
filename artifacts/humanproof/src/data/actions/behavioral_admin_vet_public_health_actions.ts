// behavioral_admin_vet_public_health_actions.ts — v38.0 Phase 1B
// 22 roles across Behavioral Health, Healthcare Administration, Veterinary, and Public Health.
// These are clinical/hands-on/leadership domains with very low AI substitution risk
// (except medical coding which is the single largest displacement category in this file).

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

// Shared networking/credential pool for the file
const A_NETWORKING_BAVPH: BracketPool = pool(
  { title: 'Join 2 Specialty Associations Aligned with Your Sub-Discipline', description: 'For behavioral health: APA Div. 42 (Independent Practice) or NASW Specialty Practice Section. For healthcare admin: ACHE local chapter + MGMA. For veterinary: AVMA + state VMA + ACVS/ACVIM if specialty-track. For public health: APHA + your sub-section (epi, biostats, global health). Active membership unlocks unposted jobs and gives you direct CE event access where 70% of senior hiring conversations actually happen.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Public Profile (Substack / Personal Site) Around Your Practice Niche', description: 'Senior hiring managers (medical directors, clinical recruiters, AVMA placement services, CDC career staff) increasingly source talent via public writing. Publish 1-2 thoughtful pieces a month: a case write-up (de-identified), a regulatory interpretation, an evidence-based-practice review. Six months of consistent publishing reliably produces 3-5 unsolicited inbound contacts from healthcare systems, group practices, or federal recruiters.', layerFocus: 'L3 · Visibility', riskReductionPct: 18, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue a Board / Specialty Credential That Maps to Your Earnings Lane', description: 'Behavioral: BCBA (BACB), Board Cert in Clinical Psych (ABPP), CADC. Admin: FACHE (ACHE), CPHQ, CMPE (MGMA). Vet: ACVS / ACVIM / ABVP specialty boards. Public health: CPH (NBPHE), CIC (infection prevention), SAS Certified Statistical Business Analyst. The right credential maps to a $20K-$60K base shift and dramatic mobility — choose the one that opens your next job, not your last one.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '6 months — register the exam', priority: 'High' },
  { title: 'Get Credentialed on CAQH ProView and Major Insurance Panels (or the Vet/PH Analog)', description: 'Behavioral health: complete CAQH ProView; apply to Headway, Alma, Spring Health, Lyra, Grow Therapy panels — these handle credentialing in 2-6 weeks vs. 4-9 months for direct payer credentialing. Healthcare admin: list yourself on the ACHE Careers board + Witt/Kieffer / B.E. Smith executive search registries. Vet: register on AVMA Veterinary Career Center + RelifVet for locum. Public health: CDC USAJobs profile + Council on Education for Public Health alumni boards.', layerFocus: 'L3 · Reputation', riskReductionPct: 16, deadline: '7 days', priority: 'Medium' },
  { title: 'Audit Your LinkedIn (or Doximity / VIN) Profile for Specific Modality / Specialty Tags', description: 'Recruiters search by very specific tags: "CBT", "DBT", "EMDR", "PCIT", "ABA", "value-based care", "MIPS", "ACVS", "epidemiologic surveillance", "REDCap", "R/SAS". Add every modality / framework / platform you have hands-on hours on. Behavioral clinicians: Doximity / Psychology Today. Veterinarians: VIN (Veterinary Information Network). Public health: LinkedIn + the CDC Foundation talent network. Single audit triples qualified recruiter contact in 30 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_BEHAVIORAL_ADMIN_VET_PH ─────────────────────────────────────────

export const ACTION_DB_BEHAVIORAL_ADMIN_VET_PH: Record<string, BracketPool> = {

  // ── Behavioral health ──────────────────────────────────────────────────────

  clinical_psychologist: pool(
    { title: 'Build a Hybrid Cash-Pay + Telehealth-Panel Income Stream', description: 'Solo licensed PsyD/PhD clinicians who blend a 50% private cash-pay caseload ($200-$300/session) with a 50% telehealth-panel caseload via Headway / Alma / Spring Health / Lyra (in-network at $90-$140/session) routinely clear $180K-$240K with a 25-hour clinical week. Build this hybrid now — cash-pay-only is fragile when local market softens; in-network-only caps you at insurance-fee schedules. Open a Headway and an Alma application this week (credentialing takes 4-8 weeks).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '14 days', priority: 'Critical' },
    { title: 'Add an ABPP Board Certification or a Reimbursable Assessment Sub-Specialty', description: 'Mid-career psychologists who add ABPP board certification (Clinical, Forensic, Neuropsych) or a high-reimbursement assessment niche (ADHD/autism eval, neuropsych testing, custody/forensic) pivot from $120K-$140K to $160K-$220K. Assessment work bills CPT 96130-96139 at $400-$1,200 per case; insurance pays it without prior-auth fights. Complete the ABPP candidacy materials this quarter — written exam slots fill 9 months out.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate a Reduced In-Network Footprint + Cash-Pay Day Conversion', description: 'Senior psychologists in group practices should formally negotiate dropping 1-2 in-network panels (typically the lowest-paying — often Medicaid HMO or a regional Blue) and converting that day to cash-pay. A single converted day shifts $45K-$70K of revenue per year. Most practice owners will agree because they capture the same percentage and reduce billing overhead. Make the proposal in writing with the math attached.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '21 days', priority: 'Critical' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  licensed_clinical_social_worker: pool(
    { title: 'Get on 3-4 Telehealth Panels (Headway / Alma / Grow / Path) This Month', description: 'LCSWs are the most demand-saturated mental health credential in 2026. The fastest income lift is panel breadth: Headway, Alma, Grow Therapy, and Path Mental Health each pay $85-$130/session in-network and handle credentialing in 3-6 weeks. A full-time LCSW across these panels reliably clears $110K-$140K W-2 equivalent. Open all four applications in a single sitting — they reuse the same CAQH ProView data.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Build LCSW Reciprocity in 3 Compact / Telehealth-Friendly States', description: 'LCSW licensure portability remains state-by-state but ASWB Social Work Compact rollout (2025-2026) plus telehealth-friendly states (FL, TX, CO, AZ, NC) lets you serve 4-6x your home-state caseload. Apply for licenses in 2-3 reciprocity states immediately — costs $500-$1,200 per state, recoups in 1-2 months of added caseload. This is the single highest-ROI move for an LCSW under age 45.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Add a Reimbursable Specialty (EMDR / DBT / Perinatal / Trauma-Focused CBT)', description: 'Senior LCSWs who hold EMDR certification (EMDRIA) or DBT certification (DBT-LBC) or Perinatal Mental Health (PMH-C) cap session rates at $150-$200/session cash and command full caseload waitlists. Total cost: $1,500-$3,500 + supervised hours over 12 months. The specialty premium effectively doubles your hourly economics versus generalist talk therapy.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  licensed_professional_counselor: pool(
    { title: 'Apply to the LPC Compact / Counseling Compact States This Quarter', description: 'The Counseling Compact went live in 2024 and by 2026 covers 30+ states — but you must individually opt in via your home-state board and pay the privilege-to-practice fee ($150-$300). Doing so unlocks telehealth caseload from 30 states without re-licensing. LPCs who fail to activate Compact privileges are leaving 30-50% of potential caseload uncaptured.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Credential on Telehealth Platforms + Lyra/Spring/Modern Health EAP Networks', description: 'LPCs are accepted on Headway, Alma, Grow, BetterHelp Pro, Talkspace clinician, Lyra Health, Spring Health, and Modern Health. EAP-platform sessions (Lyra/Spring/Modern Health) pay $90-$140/session and feed steady caseload from large employer contracts (Google, Meta, Amazon, Walmart, Starbucks). Apply to at least 2 EAP networks this month.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '21 days', priority: 'Critical' },
    { title: 'Build a Niche Practice (Couples / Adolescent / Substance Use) and Document It Publicly', description: 'Senior LPCs who niche down and publish (Psychology Today profile, Substack, podcast guesting) reach $130K-$170K in solo practice. Generalists cap at $85K-$105K. Choose one population, write 1-2 pieces a month for 6 months, and watch inbound referrals climb. Track every referral source so you know which networks are paying off.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  bcba: pool(
    { title: 'Pass the BCBA Exam (BACB) and Negotiate a Clinical Director Track', description: 'The Behavior Analyst Certification Board (BACB) BCBA exam is the gating credential — pass rate is ~65% on first attempt. Once certified, immediately negotiate a clinical director / case supervisor track. BCBAs with clinical director responsibility (supervising RBTs across 8-15 cases) earn $95K-$135K vs. line-BCBA at $72K-$92K. The promotion ask should be made within 6 months of certification while the BACB credential is freshly leverage-able.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days — schedule the exam', priority: 'Critical' },
    { title: 'Move from Agency to a Telehealth-Capable Hybrid ABA Provider', description: 'Mid-career BCBAs trapped at low-pay agencies (Centria, Hopebridge, BlueSprig, ABC, LEARN) should target hybrid/tele-ABA providers (CentralReach Care, AnswersNow, Action Behavior Centers regional director track) at $105K-$135K + caseload bonus. The work is the same; the comp gap is large. Apply to 3 hybrid providers this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Add BCBA-D or a Sub-Specialty (OBM, Acceptance & Commitment, Verbal Behavior)', description: 'Senior BCBAs who pursue a BCBA-D (doctoral-level), an OBM (Organizational Behavior Management) credential, or a specialty cert in Verbal Behavior or ACT for ABA reach $130K-$170K and access clinical director / regional clinical lead roles. Doctoral path is 3-4 years; OBM cert is 6-12 months. Choose based on whether you want clinical or operational leadership.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  addiction_counselor: pool(
    { title: 'Stack Your Credentials: CADC → LADC → MAT-Trained', description: 'The credential ladder for addiction counselors is concrete: CADC ($300-$800 exam + 270 hours of training) → LADC (state license, often requires master\'s) → MAT (Medication-Assisted Treatment) training (free 8-24 hour SAMHSA course). Each step adds $8K-$18K to base. MAT-trained counselors in particular are in acute shortage post-opioid-crisis policy expansion. Schedule the next step in writing this month.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to State / Federal Behavioral Health Block-Grant-Funded Programs', description: 'SAMHSA block grant programs and state-funded MAT clinics pay $58K-$82K with full benefits, pension, and student-loan forgiveness via NHSC (National Health Service Corps). NHSC loan repayment is up to $50K for 2 years of service. The combination of stable funding + loan forgiveness frequently outearns private agencies by $30K-$40K real-dollar terms.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Specialize in High-Acuity Co-Occurring Disorders or Adolescent SUD', description: 'Senior addiction counselors with dual licensure (LADC + LPC or LCSW) and co-occurring disorder training (CCDP-D) earn $85K-$115K and become the clinical core of IOP/PHP/inpatient programs. The credential combo creates near-zero replacement supply. Begin the second-licensure path this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  marriage_family_therapist: pool(
    { title: 'Activate the LMFT Compact + Out-of-State Telehealth Caseload', description: 'The Counseling Compact (which covers LMFTs in many states) and direct telehealth licensure in CA/TX/FL/CO can roughly 3x caseload reach. Begin compact privilege applications + 2 telehealth state licenses this month. LMFTs who fail to act on multi-state reach in 2026 cap at local-market saturation and stagnant rates.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Get Credentialed on Couples-Focused Telehealth Networks (Gottman, Ours, Lasting)', description: 'Couples-focused niches command $180-$280/session cash. Train in Gottman Method (Level 1-3 certifications, $500-$2,500 each) or EFT (Emotionally Focused Therapy, ICEEFT certification path). Then list on the Gottman Referral Network and on the Headway/Alma couples-focused tags. The niche premium routinely doubles a generalist LMFT\'s effective hourly rate.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Concierge / Cash-Pay Couples Intensive Practice', description: 'Senior LMFTs who offer weekend or multi-day intensives ($1,500-$5,000 per couple) reach $180K-$240K with a 25-hour clinical week. Intensives are the single highest dollar-per-hour modality in MFT. Document 2-3 case stories, build a simple website, and price the first 6 months at a discount to fill calendar.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '120 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  // ── Healthcare administration ──────────────────────────────────────────────

  chief_medical_officer: pool(
    { title: 'Frame Your CMO Comp Around CMS Star Rating + Value-Based Contract Outcomes', description: 'CMO base comp in 2026 ranges $350K-$650K + 25-50% bonus. The single highest leverage in your renegotiation is documented value-based-care outcomes: CMS Star Rating movement, MIPS quality score, ACO shared-savings dollars, reduced 30-day readmits. Document each metric movement of the last 12 months and present at your next comp review. CMOs who own a published Star Rating jump from 3.5 → 4.5 routinely add $60K-$120K to next-cycle base.', layerFocus: 'L5 · Negotiation', riskReductionPct: 36, deadline: '30 days', priority: 'Critical' },
    { title: 'Earn FACHE Board Certification + Join an ACHE / AHA Policy Committee', description: 'FACHE (Fellow of the American College of Healthcare Executives) is the gold-standard credential for senior health-system leadership. Combined with active service on an ACHE or AHA policy committee, this credential combo opens system-level CMO roles ($500K-$850K) and post-CMO board director appointments ($35K-$80K/seat × 2-3 seats). Begin the FACHE candidacy this quarter (BoG exam, 2 years experience, references).', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a vCMO / Advisory Practice as Career Insulation', description: 'Senior CMOs are increasingly contracted as fractional/v-CMO to PE-backed health platforms, digital-health scaleups, and ASC chains at $4K-$12K/day. 2-3 advisory clients on the side of a full-time CMO role generates $150K-$400K in supplemental income and total layoff insulation. Most CMO employment agreements permit board-approved outside advisory; negotiate this clause at next renewal.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  chief_nursing_officer: pool(
    { title: 'Document Nursing Turnover, Magnet Status, and Quality Metrics for Comp Renegotiation', description: 'CNO compensation in 2026 ranges $250K-$420K. The most decisive leverage is documented reduction in RN turnover (national baseline ~22%; top quartile <14%), Magnet Recognition status, and quality metric movement (HCAHPS, CLABSI/CAUTI reduction, falls/pressure injury rates). Build a one-page metric dashboard showing year-on-year improvements and present at the next executive comp review.', layerFocus: 'L5 · Negotiation', riskReductionPct: 34, deadline: '30 days', priority: 'Critical' },
    { title: 'Earn AONL CENP / NEA-BC Plus Lead a Magnet Re-Designation Cycle', description: 'AONL\'s CENP (Certified in Executive Nursing Practice) plus ANCC\'s NEA-BC are the executive-nursing credentials hospital boards look for. Pair them with leadership of an active Magnet re-designation cycle and you become an essentially irreplaceable senior nursing executive — CNO mobility into system-CNO roles ($380K-$600K) typically follows within 24 months.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Position for a System-CNO or VP-Nursing-Operations Move', description: 'Single-facility CNOs hit a comp ceiling. Move to system-CNO or VP of Nursing Operations (over 4-15 facilities) and base jumps to $380K-$600K + bonus. Pipeline: ACHE local chapter board service + Witt/Kieffer registry + 2-3 inbound executive recruiter conversations per quarter. Initiate the recruiter relationships this month.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  hospital_administrator_senior: pool(
    { title: 'Build Service Line + Margin Ownership (Not Just Operations)', description: 'Senior hospital administrators who own a specific service line P&L (cardiology, orthopedics, oncology, women\'s health) and can show margin improvement + volume growth move to COO-track at $250K-$400K. Administrators stuck in pure ops cap at $185K-$240K. In the next 60 days, propose formally owning a service line P&L with quarterly board reporting.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Earn FACHE + Lead a JCAHO / Joint Commission Survey Cycle', description: 'FACHE is the senior-administrator credential bar; leadership of a successful Joint Commission survey is the operational proof point. Together they unlock COO/VP-Operations roles at $250K-$400K. Survey leadership is rare to volunteer for — but it puts you in the executive-track conversation for the next 24 months.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    { title: 'Pursue a Multi-Site / Regional Operations Role', description: 'Single-facility caps administrators at $185K-$240K. Regional ops roles (3-8 facilities) reach $275K-$385K. Pipeline: ACHE network + B.E. Smith / Witt/Kieffer / Korn Ferry executive search. Begin recruiter conversations within 30 days — health-system M&A in 2026 is driving net openings.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  clinical_operations_director: pool(
    { title: 'Own Throughput, Capacity, and AR Days as Your Headline Metrics', description: 'Clinical operations directors who reduce ED-to-floor time, increase OR utilization, and pull AR days from 50+ to mid-30s become CFO/COO-track talent. Build a one-page dashboard of throughput + revenue cycle metrics with month-over-month improvement. Senior directors who own 3 of these metrics reach $185K-$260K; pure managers cap at $135K-$175K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Earn CMPE (MGMA) or CPHQ (NAHQ) for Senior-Director Credentialing', description: 'CMPE (Certified Medical Practice Executive, MGMA) for ambulatory/large-group practice; CPHQ (Certified Professional in Healthcare Quality, NAHQ) for hospital quality leadership. Either credential maps to a $25K-$45K base shift and opens VP-clinical-operations roles. Self-study path costs ~$1,200 + 4-6 months.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    { title: 'Lead a Value-Based-Care Contract Transition (MSSP / REACH / Medicare Advantage)', description: 'Operations directors who lead a fee-for-service → value-based-care transition (MSSP ACO, ACO REACH, Medicare Advantage capitated contract) become highly sought by every health system in 2026. Volunteer to lead the next VBC contract launch and document outcomes (shared savings, attribution, quality measures). This single project unlocks VP-VBC and Chief Population Health Officer pipelines.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '120 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  quality_improvement_director: pool(
    { title: 'Earn CPHQ + Lead a CMS Star Rating / HCAHPS Improvement Cycle', description: 'CPHQ (NAHQ) is the credential. The portfolio piece is a documented CMS Star Rating movement (e.g., 3.5 → 4.5) or HCAHPS top-box gain. Together they unlock VP of Quality / Chief Quality Officer roles ($210K-$310K). Begin CPHQ candidacy this quarter and own the next Star Rating improvement cycle in your organization.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Lead a MIPS / Value-Based Quality Score Optimization Initiative', description: 'MIPS quality score optimization (or Medicare Advantage quality bonus capture) drives 1-3% net revenue lift on hundreds of millions in payer revenue — making the Quality Director one of the highest-ROI roles in the organization. Document one fully-attributed optimization cycle (specific measures, specific score movement, specific revenue impact) and you become essentially un-layoff-able.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '120 days', priority: 'Critical' },
    { title: 'Build a Public Body of Quality-Improvement Work (IHI, JCAHO Speaker)', description: 'Senior QI directors who present at IHI Forum, Joint Commission Conferences, or NAHQ Next set themselves apart from peers and reach Chief Quality Officer / SVP-Quality at $260K-$400K. Submit a CFP this cycle — the work you already do is more publishable than you think.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  medical_coder_denials_specialist: pool(
    { title: 'Pivot to Denials Management, Audit, or Clinical Documentation Improvement (CDI) — Now', description: 'Routine outpatient and physician E/M coding is the single most AI-displaced category in healthcare (Optum, 3M-CodeAssist, Fathom, Codamedix automating 60-85% of routine codes by 2027). Senior coders MUST pivot to denials management, audit (CCA-AAPC, CRC-AAPC), or CDI (CCDS via ACDIS, CDIP via AHIMA) within 12 months. These pivots add $15K-$35K to base and are AI-resistant because they require clinical interpretation + payer negotiation. Schedule the CRC or CCDS exam this month.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '60 days', priority: 'Critical' },
    { title: 'Move to a Specialty-Coder Track (Interventional, Oncology, Cardiology, Surgical)', description: 'Specialty coding (interventional radiology, oncology infusion, cardiothoracic surgery) is the second AI-resistant lane. Specialty coders earn $72K-$95K vs. generalist E/M coders at $52K-$65K. CCS (AHIMA) or CIRCC (AAPC) credentials are the bar. The combination of high specialty CPT complexity + low automation tolerance makes these roles durable through 2028.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Toward a Revenue-Cycle Analyst or Coding Manager Role', description: 'Senior coders who become Coding Managers (overseeing 6-25 coders) or Revenue Cycle Analysts (KPI ownership, denials root-cause, payer behavior analysis) escape the displacement risk entirely — these are oversight + judgment roles AI does not replicate. Comp jumps from $58K-$72K to $85K-$120K. Propose to your director that you take on 90 days of acting-manager responsibility as a trial.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  // ── Veterinary ─────────────────────────────────────────────────────────────

  veterinarian: pool(
    { title: 'Negotiate a Production-Based (ProSal) Compensation Structure', description: 'GP veterinarians on flat salary at $100K-$130K consistently underearn vs. ProSal (production-based) peers earning $130K-$175K at the same case volume. The corporate (VCA, Banfield, Mars-NVA, BluePearl) standard is now 22-25% of personal production with a base draw. If you\'re not on ProSal by 2026, you\'re leaving $20K-$45K on the table each year. Renegotiate this quarter or interview elsewhere — 5+ inbound offers are typical for an AAVSB-licensed GP DVM.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Add a High-Value Skill (Dentistry, Ultrasound, Soft-Tissue Surgery, Acupuncture)', description: 'GP DVMs who add a high-value clinical skill — advanced dentistry (AVDC-track CE), abdominal ultrasound (SAVU certificate), TPLO surgery, or veterinary acupuncture (IVAS) — add $25K-$60K to annual production. CE costs $3K-$15K and pays back in 4-9 months. Choose the skill based on what your hospital lacks; you instantly become the in-house specialist.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Mobile Veterinary or Locum DVM Income Stream', description: 'Senior GP DVMs are pivoting to mobile (in-home euthanasia like Lap of Love, mobile preventive care like The Vets, BondVet) and locum (relief) work at $90-$135/hour with no on-call. Locums clear $180K-$240K with a 35-hour week, total scheduling control, and complete corporate-consolidation insulation. Register on RelifVet, RoVR Locum, and VetMedTeam locum boards this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  veterinary_technician: pool(
    { title: 'Pursue a VTS (Veterinary Technician Specialty) Credential', description: 'VTS credentials from NAVTA-recognized academies (AVECC for emergency/critical care; AVTAA for anesthesia; AVDT for dentistry) take 3-5 years of supervised hours + case logs + exam, but jump comp from $42K-$55K to $68K-$95K. VTS-credentialed techs are essentially unemployable-in-shortage in 2026. Begin case-log documentation this month — most candidates lose 12+ months by not starting documentation early.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days — begin case log', priority: 'Critical' },
    { title: 'Move from Corporate (VCA / Banfield) to Specialty / ER Hospital', description: 'Mid-career RVTs / LVTs in corporate GP cap at $48K-$58K. Specialty / ER hospitals (BluePearl, MedVet, Ethos, VEG) pay $58K-$78K + shift differentials, plus accelerate the path to VTS. Apply to 3 specialty hospitals this week — they have continuous openings.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    { title: 'Build Toward a Practice Manager / Surgical Lead Role', description: 'Senior RVTs/LVTs who move into practice manager or surgical lead positions reach $72K-$95K. CVPM (Certified Veterinary Practice Manager, VHMA) is the credential. The transition fully insulates from the corporate-consolidation comp compression that ordinary techs face.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  veterinary_surgeon: pool(
    { title: 'Complete ACVS Board Certification — and Negotiate Production at 27-30%', description: 'Board-certified surgeons (ACVS Diplomate) command 27-30% production at specialty hospitals (BluePearl, MedVet, Ethos, VRC). At a $1.8M-$2.4M personal production volume, that\'s $490K-$720K W-2. If you\'re a residency-trained surgeon still on a flat salary, you are dramatically underpaid; renegotiate or move within 60 days. ACVS Diplomate status is essentially exempt from corporate-consolidation comp compression because supply is sub-2,500 nationally.', layerFocus: 'L5 · Negotiation', riskReductionPct: 38, deadline: '30 days', priority: 'Critical' },
    { title: 'Specialize Further (Orthopedic / Neurosurgery / Minimally Invasive)', description: 'Sub-specialization within ACVS (orthopedic, neurosurgery, minimally invasive surgery) adds $80K-$160K to base earnings because referral demand exceeds supply by 8-12x in most metros. Fellowship + case-log pathway is 1-2 years post-Diplomate. The economic return on the additional sub-specialty year exceeds 25:1 over a career.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Establish a Surgical Locum / Traveling-Surgeon Practice', description: 'Top ACVS surgeons run traveling-surgery practices serving 8-15 GP hospitals at $3,500-$6,000/surgical-day. Two days/week of travel surgery on top of a hospital base earns $250K-$400K supplemental. The structure is dramatically more layoff-insulated than salaried specialty practice.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  equine_veterinarian: pool(
    { title: 'Build a Locum / Mobile Equine Practice — the AAEP 2025 Crisis Has Created a Shortage', description: 'AAEP\'s 2024-2025 equine vet workforce study documented a near-crisis shortage: 50%+ of new grads exit equine practice within 5 years due to on-call burden. The remaining practitioners are in extreme demand. Mobile/locum equine vets are commanding $120K-$180K with their own scheduling and no full on-call rotation. Register on AAEP\'s locum/relief board and on RelifVet equine listings this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '14 days', priority: 'Critical' },
    { title: 'Specialize in Sports Medicine, Reproduction, or Lameness (ACVSMR / ACT Boards)', description: 'Boarded specialists (ACVSMR sports medicine, ACT reproduction, ACVS-LA surgery) earn $200K-$340K at performance / breeding operations. Residency takes 3 years; case-log + exam pathway 2-5 years. Demand from racing, eventing, breeding, and pleasure-horse owners far exceeds specialist supply.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'High' },
    { title: 'Negotiate Reduced On-Call + Production Structure with Current Practice', description: 'Mid-career equine vets staying with their current practice should formally renegotiate: (1) on-call schedule capped at 1-in-4 or better, (2) production at 22-25%, (3) emergency fee structure that flows to the attending vet not the practice. Practice owners increasingly agree because finding any replacement equine DVM takes 12+ months.', layerFocus: 'L5 · Negotiation', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  // ── Public health ──────────────────────────────────────────────────────────

  epidemiologist: pool(
    { title: 'Build a Public R/SAS Portfolio + Reproducible-Analysis GitHub Repo', description: 'Senior epi roles (CDC, state DOH, Gates Foundation, McKinsey/Mathematica) increasingly hire on demonstrated reproducible analysis: a public GitHub with 5+ Quarto/R Markdown notebooks (NHANES, BRFSS, MMWR-style analysis) is now a hiring signal as strong as a JID/AJE publication. Publish 5 reproducible analyses over 90 days; add one each subsequent month.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue CDC EIS (Epidemic Intelligence Service) or Council of State and Territorial Epi Pathway', description: 'CDC EIS Fellowship (2 years) is the elite epi pipeline — alumni reach CDC senior staff, WHO, Bloomberg, Gates Foundation, and academic faculty at $120K-$180K starting. CSTE applied epi fellowship is the state-DOH equivalent. Application deadlines are annual; prep the application this quarter even if you\'re mid-career — CDC accepts experienced applicants.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '6 months — application window', priority: 'Critical' },
    { title: 'Move into Pharma / Biotech Epidemiology or Health-Tech Companies', description: 'Pharma RWE/HEOR teams (Pfizer, Merck, Roche, Lilly), payer analytics (UnitedHealth Optum, Anthem, Humana), and health-tech (Flatiron, Komodo, Truveta, Datavant) pay $130K-$220K — $30K-$80K above state DOH. Public-sector epis with a strong R/SAS portfolio routinely make this pivot. Apply within 60 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  biostatistician_public_health: pool(
    { title: 'Master Modern Causal Inference + Bayesian Tooling (R/Stan, brms, PyMC)', description: 'PH biostatisticians who stay on classical frequentist methods cap at $95K-$120K. Those who add causal inference (TMLE, double-ML, IPTW, DAGitty) + Bayesian hierarchical modeling reach $150K-$210K and move freely between academic, pharma, and health-tech roles. Take a Coursera Specialization (Imperial Causal Inference; Bayesian Statistics by Statistical Rethinking) this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Public Methods Portfolio (Stan / brms / Bayesian Tutorial GitHub)', description: 'Biostat hiring at Flatiron, Verana, Truveta, Roche, and Genentech is heavily skewed toward demonstrated tooling. Publish 5+ tutorials/case studies (R-Stan worked example, brms hierarchical model, PyMC trial design). This portfolio essentially replaces a publication record for industry hiring at $150K-$220K.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '120 days', priority: 'Critical' },
    { title: 'Move from Academic / DOH to Pharma RWE or Health-Tech Analytics', description: 'Pharma RWE/HEOR/biostatistics and health-tech analytics pay $40K-$80K above academic / DOH biostatistician pay at the same experience level. The credentials translate directly. Apply to Pfizer Worldwide Research, Lilly RWE, Flatiron, Komodo, Datavant within 30 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  mph_health_analyst: pool(
    { title: 'Specialize: Pick One of (RWE / Health Equity Analytics / Surveillance / Implementation Science)', description: 'Generalist MPH health analysts cap at $62K-$82K. Specialized analysts (RWE, health equity analytics, surveillance with CDC PHIN, implementation science) reach $85K-$120K and pivot freely into pharma/health-tech. Choose one specialty this month based on your strongest portfolio — and own it publicly via a Substack or LinkedIn newsletter.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Master REDCap + SAS / R / SQL and Publish a Public Project', description: 'REDCap is the universal data capture tool across CDC, NIH, academic medical centers, and global health. Combined with R or SAS (and SQL for warehouse extraction), this is the modern analyst stack. Build one end-to-end project (REDCap → R/SAS → dashboard) and publish it. Adds $10K-$25K to base offers immediately.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    { title: 'Apply to Federal Pathways (CDC Public Health Associate Program, ORISE) and Foundation Tracks', description: 'CDC PHAP, ORISE fellowships, Gates Foundation analyst tracks, RWJF program officer roles, and Robert Wood Johnson Foundation Health Policy Fellowships create direct pipelines to $80K-$140K senior public health roles. Apply within the next application cycle.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '120 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  vaccine_program_specialist: pool(
    { title: 'Build CDC VTrckS / IIS / VAERS Data-Linkage Expertise', description: 'The vaccine program landscape (CDC PHIN, VTrckS, state Immunization Information Systems, VAERS, V-safe) is fragmented and requires hands-on data-linkage skill. Specialists who can build IIS-to-VAERS-to-claims linkage pipelines are in extreme demand at state DOHs, CDC, Gates Foundation, GAVI, and pharma vaccine teams. Document one end-to-end linkage workflow + privacy review this quarter.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Move into Pharma Vaccine Medical Affairs / Global Health Vaccine Programs', description: 'Pharma vaccine medical affairs (Pfizer, Moderna, Merck, GSK, Sanofi) and global health vaccine programs (GAVI, BMGF, WHO/EPI) pay $95K-$165K — $25K-$60K above state DOH vaccine program comp. The credential bar is an MPH + 3-5 years of vaccine program operations. Apply within 60 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Earn the CHES / MCHES + Add ACIP / WHO SAGE Knowledge', description: 'CHES (Certified Health Education Specialist) or MCHES is a credential signal for public-facing vaccine programs. Pair it with deep ACIP recommendation + WHO SAGE position knowledge — this is the bar for senior vaccine policy roles at state DOH, CDC, and BMGF.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '6 months', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  global_health_officer: pool(
    { title: 'Target the Foundation / Multilateral Tier (Gates Foundation, WHO, CDC Global, UNICEF, GAVI)', description: 'The top global health employer tier — BMGF, WHO (Geneva or country offices), CDC Global Health, UNICEF, GAVI, Global Fund, USAID, PATH — pays $110K-$220K + housing/dependent-school benefits when posted overseas. Application cycles are slow (4-9 months). Begin 2-3 applications this quarter and tap your network at each — at this tier, network referrals are decisive.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Build IHR (International Health Regulations) + Global Health Security Expertise', description: 'Post-COVID, every major health security funder (BMGF, GHSA, WHO HEPR, CDC Global Health Security) is hiring practitioners with deep IHR (2005) knowledge + outbreak operations experience. Volunteer for one international outbreak deployment (CDC GRRT, WHO GOARN, MSF) this year — a single deployment opens 5-year career runway.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Pursue an MPH + DrPH or Health Policy Doctoral Pathway for Director-Track Mobility', description: 'Senior global health roles (Country Director, Regional Director, Foundation Program Officer at $150K-$280K) typically require a doctoral credential (DrPH, PhD epi/health policy). If your MPH is your terminal degree, plan a 4-year part-time DrPH (Johns Hopkins, BU, UNC, LSHTM all offer executive formats).', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '12 months', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),

  infection_preventionist: pool(
    { title: 'Earn the CIC (Certification in Infection Prevention and Control) — Now', description: 'CIC (CBIC) is the de facto required credential for senior infection preventionist roles. CIC-credentialed IPs earn $90K-$120K vs. uncredentialed at $68K-$85K. Exam is $410; study path is 4-6 months. Schedule the exam this month — the credential pays for itself in 2-4 months.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Build Antimicrobial Stewardship + HAI Surveillance Portfolio', description: 'Senior IP roles (Director of Infection Prevention, $110K-$155K) require demonstrated antimicrobial stewardship leadership + NHSN HAI surveillance expertise. Volunteer for the next CMS HAI submission cycle and document your role + outcomes. This portfolio piece is the bridge to system-level IP roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Pursue System-Director or Public-Health-IP Crossover Roles', description: 'Single-facility IPs cap at $95K-$120K. System-Director IPs (over 4-15 facilities) reach $135K-$185K. Or pivot to state DOH / CDC HAI program at $100K-$140K with federal-pension stability. Either move dramatically increases career resilience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    A_NETWORKING_BAVPH.senior.high[0], A_NETWORKING_BAVPH.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Behavioral health
  'clinical psychologist': { canonicalKey: 'clinical_psychologist', displayRole: 'Clinical Psychologist' },
  'psychologist': { canonicalKey: 'clinical_psychologist', displayRole: 'Psychologist' },
  'psyd': { canonicalKey: 'clinical_psychologist', displayRole: 'PsyD Psychologist' },
  'phd psychologist': { canonicalKey: 'clinical_psychologist', displayRole: 'PhD Psychologist' },
  'licensed clinical social worker': { canonicalKey: 'licensed_clinical_social_worker', displayRole: 'Licensed Clinical Social Worker (LCSW)' },
  'lcsw': { canonicalKey: 'licensed_clinical_social_worker', displayRole: 'LCSW' },
  'licsw': { canonicalKey: 'licensed_clinical_social_worker', displayRole: 'LICSW' },
  'clinical social worker': { canonicalKey: 'licensed_clinical_social_worker', displayRole: 'Clinical Social Worker' },
  'licensed professional counselor': { canonicalKey: 'licensed_professional_counselor', displayRole: 'Licensed Professional Counselor (LPC)' },
  'lpc': { canonicalKey: 'licensed_professional_counselor', displayRole: 'LPC' },
  'lmhc': { canonicalKey: 'licensed_professional_counselor', displayRole: 'LMHC (Licensed Mental Health Counselor)' },
  'mental health counselor': { canonicalKey: 'licensed_professional_counselor', displayRole: 'Mental Health Counselor' },
  'bcba': { canonicalKey: 'bcba', displayRole: 'Board Certified Behavior Analyst (BCBA)' },
  'board certified behavior analyst': { canonicalKey: 'bcba', displayRole: 'BCBA' },
  'behavior analyst': { canonicalKey: 'bcba', displayRole: 'Behavior Analyst' },
  'aba clinician': { canonicalKey: 'bcba', displayRole: 'ABA Clinician' },
  'addiction counselor': { canonicalKey: 'addiction_counselor', displayRole: 'Addiction Counselor' },
  'substance abuse counselor': { canonicalKey: 'addiction_counselor', displayRole: 'Substance Abuse Counselor' },
  'cadc': { canonicalKey: 'addiction_counselor', displayRole: 'CADC' },
  'ladc': { canonicalKey: 'addiction_counselor', displayRole: 'LADC' },
  'marriage and family therapist': { canonicalKey: 'marriage_family_therapist', displayRole: 'Marriage & Family Therapist (LMFT)' },
  'lmft': { canonicalKey: 'marriage_family_therapist', displayRole: 'LMFT' },
  'couples therapist': { canonicalKey: 'marriage_family_therapist', displayRole: 'Couples Therapist' },
  'family therapist': { canonicalKey: 'marriage_family_therapist', displayRole: 'Family Therapist' },

  // Healthcare admin
  'chief medical officer': { canonicalKey: 'chief_medical_officer', displayRole: 'Chief Medical Officer (CMO)' },
  'cmo': { canonicalKey: 'chief_medical_officer', displayRole: 'CMO' },
  'vp of medical affairs': { canonicalKey: 'chief_medical_officer', displayRole: 'VP of Medical Affairs' },
  'chief nursing officer': { canonicalKey: 'chief_nursing_officer', displayRole: 'Chief Nursing Officer (CNO)' },
  'cno': { canonicalKey: 'chief_nursing_officer', displayRole: 'CNO' },
  'vp of nursing': { canonicalKey: 'chief_nursing_officer', displayRole: 'VP of Nursing' },
  'hospital administrator': { canonicalKey: 'hospital_administrator_senior', displayRole: 'Senior Hospital Administrator' },
  'senior hospital administrator': { canonicalKey: 'hospital_administrator_senior', displayRole: 'Senior Hospital Administrator' },
  'hospital coo': { canonicalKey: 'hospital_administrator_senior', displayRole: 'Hospital COO' },
  'clinical operations director': { canonicalKey: 'clinical_operations_director', displayRole: 'Clinical Operations Director' },
  'director clinical operations': { canonicalKey: 'clinical_operations_director', displayRole: 'Director of Clinical Operations' },
  'practice operations director': { canonicalKey: 'clinical_operations_director', displayRole: 'Practice Operations Director' },
  'quality improvement director': { canonicalKey: 'quality_improvement_director', displayRole: 'Quality Improvement Director' },
  'director quality': { canonicalKey: 'quality_improvement_director', displayRole: 'Director of Quality' },
  'vp quality': { canonicalKey: 'quality_improvement_director', displayRole: 'VP of Quality' },
  'medical coder': { canonicalKey: 'medical_coder_denials_specialist', displayRole: 'Medical Coder' },
  'denials specialist': { canonicalKey: 'medical_coder_denials_specialist', displayRole: 'Denials Specialist' },
  'coding specialist': { canonicalKey: 'medical_coder_denials_specialist', displayRole: 'Coding Specialist' },
  'health information coder': { canonicalKey: 'medical_coder_denials_specialist', displayRole: 'Health Information Coder' },

  // Veterinary
  'veterinarian': { canonicalKey: 'veterinarian', displayRole: 'Veterinarian (DVM)' },
  'dvm': { canonicalKey: 'veterinarian', displayRole: 'DVM' },
  'small animal veterinarian': { canonicalKey: 'veterinarian', displayRole: 'Small Animal Veterinarian' },
  'general practice vet': { canonicalKey: 'veterinarian', displayRole: 'General Practice Veterinarian' },
  'veterinary technician': { canonicalKey: 'veterinary_technician', displayRole: 'Veterinary Technician (RVT/LVT)' },
  'vet tech': { canonicalKey: 'veterinary_technician', displayRole: 'Vet Tech' },
  'rvt': { canonicalKey: 'veterinary_technician', displayRole: 'Registered Veterinary Technician' },
  'lvt': { canonicalKey: 'veterinary_technician', displayRole: 'Licensed Veterinary Technician' },
  'veterinary surgeon': { canonicalKey: 'veterinary_surgeon', displayRole: 'Veterinary Surgeon (ACVS Diplomate)' },
  'acvs surgeon': { canonicalKey: 'veterinary_surgeon', displayRole: 'ACVS Diplomate Surgeon' },
  'board certified veterinary surgeon': { canonicalKey: 'veterinary_surgeon', displayRole: 'Board Certified Veterinary Surgeon' },
  'equine veterinarian': { canonicalKey: 'equine_veterinarian', displayRole: 'Equine Veterinarian' },
  'horse vet': { canonicalKey: 'equine_veterinarian', displayRole: 'Equine Vet' },
  'large animal veterinarian equine': { canonicalKey: 'equine_veterinarian', displayRole: 'Large Animal (Equine) Veterinarian' },

  // Public health
  'epidemiologist': { canonicalKey: 'epidemiologist', displayRole: 'Epidemiologist' },
  'epi': { canonicalKey: 'epidemiologist', displayRole: 'Epidemiologist' },
  'infectious disease epidemiologist': { canonicalKey: 'epidemiologist', displayRole: 'Infectious Disease Epidemiologist' },
  'biostatistician': { canonicalKey: 'biostatistician_public_health', displayRole: 'Biostatistician (Public Health)' },
  'public health biostatistician': { canonicalKey: 'biostatistician_public_health', displayRole: 'Public Health Biostatistician' },
  'phd biostatistics': { canonicalKey: 'biostatistician_public_health', displayRole: 'Biostatistics PhD' },
  'mph analyst': { canonicalKey: 'mph_health_analyst', displayRole: 'MPH Health Analyst' },
  'public health analyst': { canonicalKey: 'mph_health_analyst', displayRole: 'Public Health Analyst' },
  'health policy analyst': { canonicalKey: 'mph_health_analyst', displayRole: 'Health Policy Analyst' },
  'vaccine program specialist': { canonicalKey: 'vaccine_program_specialist', displayRole: 'Vaccine Program Specialist' },
  'immunization program manager': { canonicalKey: 'vaccine_program_specialist', displayRole: 'Immunization Program Manager' },
  'vaccine policy analyst': { canonicalKey: 'vaccine_program_specialist', displayRole: 'Vaccine Policy Analyst' },
  'global health officer': { canonicalKey: 'global_health_officer', displayRole: 'Global Health Officer' },
  'global health specialist': { canonicalKey: 'global_health_officer', displayRole: 'Global Health Specialist' },
  'international health officer': { canonicalKey: 'global_health_officer', displayRole: 'International Health Officer' },
  'infection preventionist': { canonicalKey: 'infection_preventionist', displayRole: 'Infection Preventionist (IP)' },
  'infection control practitioner': { canonicalKey: 'infection_preventionist', displayRole: 'Infection Control Practitioner' },
  'cic': { canonicalKey: 'infection_preventionist', displayRole: 'CIC-Certified Infection Preventionist' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH: Record<string, string> = {
  clinical_psychologist: 'clinical_psychologist',
  licensed_clinical_social_worker: 'licensed_clinical_social_worker',
  licensed_professional_counselor: 'licensed_professional_counselor',
  bcba: 'bcba',
  addiction_counselor: 'addiction_counselor',
  marriage_family_therapist: 'marriage_family_therapist',
  chief_medical_officer: 'chief_medical_officer',
  chief_nursing_officer: 'chief_nursing_officer',
  hospital_administrator_senior: 'hospital_administrator_senior',
  clinical_operations_director: 'clinical_operations_director',
  quality_improvement_director: 'quality_improvement_director',
  medical_coder_denials_specialist: 'medical_coder_denials_specialist',
  veterinarian: 'veterinarian',
  veterinary_technician: 'veterinary_technician',
  veterinary_surgeon: 'veterinary_surgeon',
  equine_veterinarian: 'equine_veterinarian',
  epidemiologist: 'epidemiologist',
  biostatistician_public_health: 'biostatistician_public_health',
  mph_health_analyst: 'mph_health_analyst',
  vaccine_program_specialist: 'vaccine_program_specialist',
  global_health_officer: 'global_health_officer',
  infection_preventionist: 'infection_preventionist',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  clinical_psychologist:              { roleKey: 'clinical_psychologist',              roleName: 'Clinical Psychologist',               demandIndex: 90, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 60, yoyJobOpeningsChange: 16, topHiringLocations: ['Remote/Telehealth', 'New York NY', 'Los Angeles CA', 'Boston MA', 'Austin TX'],          aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Acute mental health crisis; demand for PhD/PsyD assessment and therapy capacity is near record highs.' },
  licensed_clinical_social_worker:    { roleKey: 'licensed_clinical_social_worker',    roleName: 'Licensed Clinical Social Worker',     demandIndex: 92, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 38, yoyJobOpeningsChange: 20, topHiringLocations: ['Remote/Telehealth', 'New York NY', 'Chicago IL', 'Atlanta GA', 'Phoenix AZ'],           aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Highest-demand mental-health credential; Compact rollout further accelerating multi-state caseload reach.' },
  licensed_professional_counselor:    { roleKey: 'licensed_professional_counselor',    roleName: 'Licensed Professional Counselor',     demandIndex: 90, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 36, yoyJobOpeningsChange: 18, topHiringLocations: ['Remote/Telehealth', 'Dallas TX', 'Denver CO', 'Tampa FL', 'Nashville TN'],              aiSubstitutionRisk: 0.09, dataQuarter: '2026-Q1', calibrationNote: 'Counseling Compact + EAP platform expansion drives multi-state caseload; rates rising 5-8% YoY.' },
  bcba:                                { roleKey: 'bcba',                                roleName: 'Board Certified Behavior Analyst',    demandIndex: 88, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 32, yoyJobOpeningsChange: 16, topHiringLocations: ['Remote/Hybrid', 'Dallas TX', 'Phoenix AZ', 'Atlanta GA', 'Tampa FL'],                       aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'ABA insurance mandate expansion + autism diagnosis growth; BCBAs in chronic shortage across most states.' },
  addiction_counselor:                { roleKey: 'addiction_counselor',                roleName: 'Addiction Counselor (CADC/LADC)',     demandIndex: 86, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 30, yoyJobOpeningsChange: 14, topHiringLocations: ['Remote', 'Cincinnati OH', 'Phoenix AZ', 'Boston MA', 'Charlotte NC'],                  aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Opioid policy expansion + MAT scaling driving SAMHSA-funded program hiring.' },
  marriage_family_therapist:          { roleKey: 'marriage_family_therapist',          roleName: 'Marriage & Family Therapist (LMFT)',  demandIndex: 88, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 35, yoyJobOpeningsChange: 14, topHiringLocations: ['Remote/Telehealth', 'Los Angeles CA', 'Seattle WA', 'Austin TX', 'Denver CO'],            aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Couples-focused niches + intensive practice models commanding premium pricing.' },
  chief_medical_officer:              { roleKey: 'chief_medical_officer',              roleName: 'Chief Medical Officer',               demandIndex: 86, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 140, yoyJobOpeningsChange: 10, topHiringLocations: ['New York NY', 'Boston MA', 'San Francisco CA', 'Chicago IL', 'Atlanta GA'],            aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'CMO market chronically short for VBC-experienced executives; search timelines 4-6 months typical.' },
  chief_nursing_officer:              { roleKey: 'chief_nursing_officer',              roleName: 'Chief Nursing Officer',               demandIndex: 88, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 120, yoyJobOpeningsChange: 12, topHiringLocations: ['New York NY', 'Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Minneapolis MN'],            aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Post-pandemic nursing leadership churn + Magnet competition keeping CNO market hot.' },
  hospital_administrator_senior:      { roleKey: 'hospital_administrator_senior',      roleName: 'Senior Hospital Administrator',       demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 95, yoyJobOpeningsChange: 8, topHiringLocations: ['Nashville TN', 'Dallas TX', 'Atlanta GA', 'Phoenix AZ', 'Charlotte NC'],                  aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Health system M&A driving regional administrator demand; service-line owners outperform.' },
  clinical_operations_director:       { roleKey: 'clinical_operations_director',       roleName: 'Clinical Operations Director',        demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 80, yoyJobOpeningsChange: 12, topHiringLocations: ['Dallas TX', 'Boston MA', 'Nashville TN', 'Denver CO', 'Atlanta GA'],                       aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'VBC transition driving high demand for ops leaders who own throughput + AR + quality.' },
  quality_improvement_director:       { roleKey: 'quality_improvement_director',       roleName: 'Quality Improvement Director',        demandIndex: 84, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 75, yoyJobOpeningsChange: 14, topHiringLocations: ['New York NY', 'Boston MA', 'Chicago IL', 'Atlanta GA', 'San Francisco CA'],              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'CMS Star Rating + MIPS optimization drives extreme value for senior QI directors.' },
  medical_coder_denials_specialist:   { roleKey: 'medical_coder_denials_specialist',   roleName: 'Medical Coder / Denials Specialist',  demandIndex: 60, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 22, yoyJobOpeningsChange: -18, topHiringLocations: ['Remote', 'Manila', 'Bangalore', 'Tampa FL', 'Dallas TX'],                              aiSubstitutionRisk: 0.50, dataQuarter: '2026-Q1', calibrationNote: 'Single largest displacement category in this file. Optum/3M/Fathom AI coding automating routine E/M. Pivot to denials/CDI/audit/specialty coding is critical.' },
  veterinarian:                       { roleKey: 'veterinarian',                       roleName: 'Veterinarian (DVM, GP)',              demandIndex: 84, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 12, topHiringLocations: ['Dallas TX', 'Phoenix AZ', 'Charlotte NC', 'Nashville TN', 'Denver CO'],                  aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'AVMA 2026 workforce shortage continues; corporate (VCA/Banfield/Mars/BluePearl) hiring aggressively.' },
  veterinary_technician:              { roleKey: 'veterinary_technician',              roleName: 'Veterinary Technician (RVT/LVT)',     demandIndex: 86, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 28, yoyJobOpeningsChange: 14, topHiringLocations: ['Phoenix AZ', 'Tampa FL', 'Dallas TX', 'Denver CO', 'Charlotte NC'],                       aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Vet tech shortage chronic; high turnover at corporate GP keeps openings perpetually unfilled.' },
  veterinary_surgeon:                 { roleKey: 'veterinary_surgeon',                 roleName: 'Veterinary Surgeon (ACVS Diplomate)', demandIndex: 92, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 150, yoyJobOpeningsChange: 14, topHiringLocations: ['Los Angeles CA', 'Dallas TX', 'New York NY', 'Boston MA', 'Atlanta GA'],            aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Boarded ACVS surgeons sub-2,500 nationally; demand 8-12x supply. Highest-resilience role in file.' },
  equine_veterinarian:                { roleKey: 'equine_veterinarian',                roleName: 'Equine Veterinarian',                 demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 8, topHiringLocations: ['Lexington KY', 'Ocala FL', 'Aiken SC', 'Wellington FL', 'Saratoga Springs NY'],          aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'AAEP 2024-2025 study documents acute shortage; 50%+ of new grads exit equine within 5 years due to on-call burden.' },
  epidemiologist:                     { roleKey: 'epidemiologist',                     roleName: 'Epidemiologist',                      demandIndex: 78, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 6, topHiringLocations: ['Atlanta GA', 'Washington DC', 'Boston MA', 'New York NY', 'Seattle WA'],                  aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Post-COVID stable; pharma RWE + health-tech absorbing surplus academic epi capacity.' },
  biostatistician_public_health:      { roleKey: 'biostatistician_public_health',      roleName: 'Biostatistician (Public Health)',     demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 60, yoyJobOpeningsChange: 14, topHiringLocations: ['Boston MA', 'Cambridge MA', 'New York NY', 'San Francisco CA', 'Research Triangle NC'],     aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Pharma RWE + health-tech driving demand for causal-inference + Bayesian tooling.' },
  mph_health_analyst:                 { roleKey: 'mph_health_analyst',                 roleName: 'MPH Health Analyst',                  demandIndex: 72, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable', timeToFillDays: 38, yoyJobOpeningsChange: 4, topHiringLocations: ['Washington DC', 'Atlanta GA', 'New York NY', 'Boston MA', 'Seattle WA'],                  aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Generalist MPH analysts increasingly displaced by tooling; specialization is the durable path.' },
  vaccine_program_specialist:         { roleKey: 'vaccine_program_specialist',         roleName: 'Vaccine Program Specialist',          demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 12, topHiringLocations: ['Atlanta GA', 'Washington DC', 'Seattle WA', 'New York NY', 'Geneva'],                    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Pharma vaccines + GAVI/BMGF/WHO global immunization expansion drives demand.' },
  global_health_officer:              { roleKey: 'global_health_officer',              roleName: 'Global Health Officer',               demandIndex: 74, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 8, topHiringLocations: ['Washington DC', 'Seattle WA', 'New York NY', 'Geneva', 'Atlanta GA'],                   aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Post-COVID health security funding continues; BMGF/WHO/CDC Global Health hiring sustained.' },
  infection_preventionist:            { roleKey: 'infection_preventionist',            roleName: 'Infection Preventionist (IP)',        demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising', timeToFillDays: 48, yoyJobOpeningsChange: 10, topHiringLocations: ['Boston MA', 'New York NY', 'Atlanta GA', 'Houston TX', 'Chicago IL'],                       aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'CMS HAI reporting + antimicrobial stewardship mandates driving sustained demand.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH: Record<string, Record<string, number>> = {
  clinical_psychologist:              { '0-2': 92_000,  '2-5': 115_000, '5-10': 138_000, '10-15': 158_000, '15+': 178_000 },
  licensed_clinical_social_worker:    { '0-2': 62_000,  '2-5': 75_000,  '5-10': 88_000,  '10-15': 100_000, '15+': 112_000 },
  licensed_professional_counselor:    { '0-2': 58_000,  '2-5': 72_000,  '5-10': 88_000,  '10-15': 102_000, '15+': 115_000 },
  bcba:                                { '0-2': 75_000,  '2-5': 88_000,  '5-10': 102_000, '10-15': 115_000, '15+': 128_000 },
  addiction_counselor:                { '0-2': 48_000,  '2-5': 58_000,  '5-10': 72_000,  '10-15': 85_000,  '15+': 98_000 },
  marriage_family_therapist:          { '0-2': 58_000,  '2-5': 75_000,  '5-10': 92_000,  '10-15': 110_000, '15+': 132_000 },
  chief_medical_officer:              { '0-2': 320_000, '2-5': 395_000, '5-10': 475_000, '10-15': 555_000, '15+': 640_000 },
  chief_nursing_officer:              { '0-2': 235_000, '2-5': 285_000, '5-10': 335_000, '10-15': 385_000, '15+': 425_000 },
  hospital_administrator_senior:      { '0-2': 165_000, '2-5': 200_000, '5-10': 235_000, '10-15': 275_000, '15+': 320_000 },
  clinical_operations_director:       { '0-2': 115_000, '2-5': 145_000, '5-10': 175_000, '10-15': 210_000, '15+': 245_000 },
  quality_improvement_director:       { '0-2': 105_000, '2-5': 135_000, '5-10': 168_000, '10-15': 205_000, '15+': 245_000 },
  medical_coder_denials_specialist:   { '0-2': 48_000,  '2-5': 58_000,  '5-10': 68_000,  '10-15': 78_000,  '15+': 88_000 },
  veterinarian:                       { '0-2': 105_000, '2-5': 120_000, '5-10': 132_000, '10-15': 142_000, '15+': 152_000 },
  veterinary_technician:              { '0-2': 38_000,  '2-5': 46_000,  '5-10': 55_000,  '10-15': 65_000,  '15+': 75_000 },
  veterinary_surgeon:                 { '0-2': 195_000, '2-5': 245_000, '5-10': 295_000, '10-15': 325_000, '15+': 350_000 },
  equine_veterinarian:                { '0-2': 78_000,  '2-5': 95_000,  '5-10': 118_000, '10-15': 140_000, '15+': 162_000 },
  epidemiologist:                     { '0-2': 78_000,  '2-5': 95_000,  '5-10': 115_000, '10-15': 132_000, '15+': 148_000 },
  biostatistician_public_health:      { '0-2': 92_000,  '2-5': 118_000, '5-10': 142_000, '10-15': 162_000, '15+': 178_000 },
  mph_health_analyst:                 { '0-2': 58_000,  '2-5': 72_000,  '5-10': 88_000,  '10-15': 102_000, '15+': 115_000 },
  vaccine_program_specialist:         { '0-2': 68_000,  '2-5': 85_000,  '5-10': 105_000, '10-15': 125_000, '15+': 145_000 },
  global_health_officer:              { '0-2': 78_000,  '2-5': 105_000, '5-10': 135_000, '10-15': 165_000, '15+': 200_000 },
  infection_preventionist:            { '0-2': 72_000,  '2-5': 88_000,  '5-10': 108_000, '10-15': 128_000, '15+': 148_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_BEHAVIORAL_ADMIN_VET_PH: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  clinical_psychologist: {
    strongOpener: 'I want to discuss my compensation in the context of the private-practice vs. in-network differential. My current caseload mix is X% in-network at $Y/session — well below the cash-pay median of $225-$300/session that PsyD/PhD clinicians command in this market.',
    leverageContext: 'Per APA Practice Organization 2026 data, doctoral-level psychologists in this region average $145K-$185K W-2 equivalent with a mixed cash + in-network practice. My current package is at the 30th percentile despite a full caseload and strong outcomes data. The Headway/Alma/Spring/Lyra panel networks I am credentialed on alone could absorb the patient demand.',
    countersScript: 'I am asking for a 15% per-session rate increase, a shift to 50% cash-pay days (Tuesdays/Thursdays), and dropping the two lowest-reimbursing panels. If a full rate increase is not possible, I will accept the cash-pay day conversion alone — that math works out comparably.',
    walkAwayLine: 'I have inbound from two group practices and a hospital outpatient program at meaningfully higher per-session economics. I would prefer to continue here, but the gap is now substantial enough that I need to see real movement.',
  },
  licensed_clinical_social_worker: {
    strongOpener: 'I want to discuss aligning my compensation with the 2026 LCSW market. With my [3-5] panels including Headway/Alma/Spring/Lyra and the Compact privileges in [states], I now have effective access to 5x my prior caseload reach.',
    leverageContext: 'Per ASWB 2026 LCSW compensation data, full-time LCSWs in this market with a multi-panel telehealth caseload clear $95K-$125K W-2 equivalent. My current package is at the 35th percentile despite carrying a full caseload. The replacement cost to backfill my panel-credentialed caseload is 4-6 months of credentialing delay.',
    countersScript: 'I am asking for a base of $X (75th percentile), retention of my telehealth flexibility, and 100% coverage of CEU + compact-state license fees. If full base adjustment is not feasible this cycle, I will accept a meaningful supervision-rate increase plus a documented review in 6 months.',
    walkAwayLine: 'I have offers from two telehealth platforms (Headway W-2 track and Spring Health staff clinician) at $X above my current base. I would like to find a path to stay.',
  },
  bcba: {
    strongOpener: 'After completing the BACB BCBA credential and supervising [X RBTs / Y cases], I want to align my comp with the clinical-director track at this organization rather than the line-BCBA track.',
    leverageContext: 'The 2026 BCBA market for clinical directors / case supervisors at hybrid ABA providers (CentralReach Care, AnswersNow, Action Behavior Centers) is $105K-$135K base plus caseload bonus. My current package is in the line-BCBA range despite supervisory responsibilities. BACB-certified BCBAs in this region take 4-6 months to backfill.',
    countersScript: 'I am asking for a clinical-director title, base of $X, and a caseload bonus structure tied to supervised-RBT productivity. If the title change is not possible this cycle, I will accept the equivalent base + bonus structure with a 6-month review for the formal title.',
    walkAwayLine: 'I have inbound from [2 hybrid ABA providers] at clinical-director track. The work here has been meaningful — but the comp gap to the director track in the market is now material.',
  },
  chief_medical_officer: {
    strongOpener: 'I want to discuss my comp package in the context of measurable value-based-care outcomes this year: [Star Rating movement / MIPS score / ACO shared savings / readmit reduction]. I am asking that my package reflect the documented financial impact.',
    leverageContext: 'Per IANS/Cejka/MGMA 2026 CMO compensation data, system CMOs with documented Star Rating / VBC outcomes earn $475K-$650K base + 25-40% bonus + equity (PE-backed) or LTI (non-profit). My current package is materially below the 50th percentile despite documented outperformance on the metrics that map directly to the organization\'s strategic plan. Replacement cost: 4-6 months and would stall the next VBC contract cycle.',
    countersScript: 'I am asking for base of $X (75th percentile for CMOs at organizations this size), a bonus structure tied to CMS Star Rating + ACO shared savings (with documented thresholds), and a retention LTI / equity grant of $Y to align with peer CMOs. If the full base is not feasible this cycle, I will accept the bonus restructure plus a 6-month review.',
    walkAwayLine: 'I have approaches from [PE-backed health platform / competitor system / national medical group] at meaningfully higher total comp. I have invested heavily in the work here — but the gap is now too large to leave unaddressed.',
  },
  chief_nursing_officer: {
    strongOpener: 'I want to align my compensation with the documented nursing-leadership outcomes this year: [RN turnover reduction / Magnet re-designation / HCAHPS / CLABSI-CAUTI / pressure injury / falls metric movement]. Each of these maps to specific financial impact.',
    leverageContext: 'Per AONL/MGMA 2026 CNO compensation data, system-level CNOs in this region earn $320K-$420K base + 20-35% bonus. RN turnover reduction alone delivers $X million in retained orientation / agency costs. My current package is below the 50th percentile despite this outperformance.',
    countersScript: 'I am asking for base of $X, bonus target tied to Magnet status + retention metrics, and retention LTI of $Y to align with peer CNOs. If full base is not feasible, I will accept the bonus + LTI restructure with a 6-month base review.',
    walkAwayLine: 'I have inbound from [Witt/Kieffer / B.E. Smith] for two system-CNO roles at meaningfully higher comp. I want to find a path to continue here.',
  },
  veterinarian: {
    strongOpener: 'I want to renegotiate my compensation structure from flat salary to ProSal (production-based). Per the AVMA 2026 economic survey, GP DVMs at this experience level on ProSal at 22-25% of personal production earn $135K-$170K — meaningfully above my current flat salary.',
    leverageContext: 'My personal production this year: $X. At 22% ProSal that equals $Y W-2; at 25% it equals $Z. Either is above my current flat salary. The corporate-consolidation landscape (VCA, Banfield, Mars-NVA, BluePearl, Thrive) is actively recruiting at exactly this structure. Replacement cost: 4-9 months given current GP DVM shortage.',
    countersScript: 'I am asking for ProSal at 22% with a base draw of $X (current salary as floor), production bonus uncapped above the draw, and CE allowance of $5K/year. If 22% is not feasible, I will accept 20% with a higher base draw.',
    walkAwayLine: 'I have inbound from two corporate hospitals and one independent practice at 22-25% ProSal structures. I would prefer to stay — but the structural underpayment of flat salary is no longer sustainable.',
  },
  veterinary_surgeon: {
    strongOpener: 'I want to align my compensation with the ACVS Diplomate market. ACVS-boarded surgeons at specialty hospitals (BluePearl, MedVet, Ethos, VRC) earn 27-30% of personal production. My current package is meaningfully below that.',
    leverageContext: 'My personal production this year: $X (surgical + consults + emergency). At 27% that equals $Y W-2 equivalent. The ACVS Diplomate supply nationally is sub-2,500 — replacement cost is essentially 12+ months. Specialty groups are recruiting actively at 27-30%.',
    countersScript: 'I am asking for production at 27% with a base draw, conference budget for ACVS Surgery Summit + one elective course/year, and protected time for resident teaching (which retains residents — a key talent pipeline). If 27% is not immediately feasible, I will accept 25% with an equity-track conversation in 12 months.',
    walkAwayLine: 'I have inbound from [competing specialty group / academic surgical program] at 27%+ production. I value the work and team here — but specialty-surgeon comp standards are clear and replicable.',
  },
  equine_veterinarian: {
    strongOpener: 'I want to renegotiate my on-call schedule and production structure. The AAEP 2024-2025 workforce study documents the equine vet shortage and the on-call exodus — and my own on-call burden is unsustainable at the current rate.',
    leverageContext: 'My personal production: $X. Current on-call: 1-in-2 / 1-in-3. The AAEP study and Merck Animal Health 2026 equine practice survey both document that 1-in-4 or better on-call + 22-25% production is the new retention bar. Replacement cost: 12+ months given the equine DVM shortage in this market.',
    countersScript: 'I am asking for on-call capped at 1-in-4 with backup coverage by [partner / locum / regional service], production at 22%, and emergency fees that flow to the attending vet at 30% (not 0% as currently). If full restructure is not feasible immediately, I will accept the on-call cap alone — it is the single most important retention factor.',
    walkAwayLine: 'I have inbound from [mobile equine practice / locum agency / competing referral practice] with materially better on-call structure. I want to continue building this practice — but my schedule must change.',
  },
  quality_improvement_director: {
    strongOpener: 'I want to align my compensation with the documented quality and revenue impact of this year\'s work: [CMS Star Rating movement / MIPS score / readmit reduction / CLABSI-CAUTI reduction]. These metrics map directly to $X million in payer revenue and avoided penalties.',
    leverageContext: 'Per NAHQ 2026 compensation data and Mercer healthcare exec surveys, Quality Directors at organizations this size with documented Star Rating movement earn $185K-$245K. My current package is at the 40th percentile despite the documented outperformance. Replacement cost: 6+ months and would interrupt the current CMS submission cycle.',
    countersScript: 'I am asking for base of $X (75th percentile per NAHQ data), a quality bonus tied to Star Rating + MIPS thresholds, and CPHQ/CPPS certification budget renewal. If full base is not feasible, I will accept the bonus restructure with a 6-month base review.',
    walkAwayLine: 'I have inbound from two competitor systems and one PE-backed health platform at $X above current. I would like to find a path to continue here.',
  },
  epidemiologist: {
    strongOpener: 'I want to align my compensation with the 2026 epi market — specifically the differential between academic/state-DOH epi and pharma RWE / health-tech epi. My current package is on the academic side; my output and skills now map to the industry side.',
    leverageContext: 'Per CSTE 2026 and Flatiron/Truveta/Verana published bands, pharma RWE and health-tech epis at my experience level earn $130K-$185K base + bonus + equity. My current package is at $X. My recent work [specific reproducible-analysis portfolio / publications / methods contributions] qualifies for the industry track directly.',
    countersScript: 'I am asking for base of $X (matches pharma RWE 50th percentile), an analytic-platform tooling stipend, and conference budget (SER, ISPOR). If full base is not feasible, I will accept a tooling + conference + bonus restructure with a 12-month base review.',
    walkAwayLine: 'I have offers from two pharma RWE teams and one health-tech analytics platform at meaningfully higher total comp. I value the work here — but the gap to industry comp is now too large.',
  },
};
