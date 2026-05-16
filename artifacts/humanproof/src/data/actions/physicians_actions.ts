// physicians_actions.ts — v38.0 Phase 1B
// 17 Physician specialty roles — US physician labor market shows chronic shortages
// across nearly all specialties (AAMC 2026 Physician Workforce Report projects
// 86K-124K physician shortfall by 2036). Mental health crisis driving acute
// psychiatrist shortage; surgical specialties + dermatology + anesthesia commanding
// historic compensation premiums.

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

const A_PHYS_NETWORKING: BracketPool = pool(
  { title: 'Join the Interstate Medical Licensure Compact (IMLC) for Multi-State Portability', description: 'IMLC streamlines licensure across 40+ participating states in weeks rather than 6-12 months. For ~$700 application fee + state-level fees, you gain immediate ability to take locum tenens work, telemedicine contracts, and out-of-state staff positions during a layoff/hospital closure scenario. This single credential is the highest-ROI career resilience move available to US physicians.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 18, deadline: '21 days', priority: 'High' },
  { title: 'Build a Locum Tenens Backup Pipeline (CompHealth, Weatherby, LocumTenens.com)', description: 'Register with 2-3 major locum agencies (CompHealth, Weatherby Healthcare, LocumTenens.com, Staff Care). Even passive registration generates 5-15 inbound opportunity calls per quarter at $200-$450/hour for most specialties ($600-$1,200/hour for anesthesia, surgery, hospitalist). This creates an immediate income bridge if your primary position ends and signals market rate during compensation negotiations.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '30 days', priority: 'High' },
  { title: 'Maintain Board Certification with ABMS Continuous Certification (MOC)', description: 'Active board certification (ABIM, ABS, ABMS, ABFM, etc.) is the non-negotiable credential. MOC participation through your specialty board (CME credits, MOC modules, longitudinal assessment) protects against credentialing lapses that can permanently disqualify you from hospital privileges, payer panels, and locum work. Budget 30-40 hours/year + ~$400-$700/year in board fees.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
  { title: 'Build a Professional Network through Specialty Society Active Membership', description: 'Move beyond passive membership in your specialty society (ACC, ASCO, AAOS, ASA, AANS, APA, AAD, AAP, etc.). Volunteer for a committee, present at the annual meeting, or chair a local chapter. Senior physicians in committee roles routinely circulate unfilled job intel 30-90 days before public posting. This is how the top private practice partner roles and academic positions actually get filled.', layerFocus: 'L4 · Network', riskReductionPct: 18, deadline: '60 days', priority: 'Medium' },
  { title: 'Audit Hospital Privileges and Payer Panel Status Quarterly', description: 'Verify your hospital privileges status (active, courtesy, consulting), credentialing expiration dates, and active payer panel enrollments (Medicare, Medicaid, top 5 commercial payers in your region). A lapsed credential can take 90-180 days to restore. Use a simple spreadsheet with renewal dates. This single audit prevents the most common income disruptions physicians face.', layerFocus: 'L3 · Visibility', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
);

// ── ACTION_DB_PHYSICIANS ──────────────────────────────────────────────────────

export const ACTION_DB_PHYSICIANS: Record<string, BracketPool> = {

  cardiologist: pool(
    { title: 'Subspecialize in Structural Heart or Electrophysiology', description: 'General cardiology is becoming saturated in major metros; structural heart (TAVR, MitraClip, Watchman) and EP (ablation, device implant) are the high-leverage subspecialties. Pursue an additional 1-year fellowship through an ACGME-accredited program. Subspecialty cardiologists earn $650K-$900K vs. $480K for general non-invasive. Procedure-based comp models also insulate from purely RVU productivity pressure.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months — apply now', priority: 'Critical' },
    { title: 'Build a Procedure Volume Portfolio and Negotiate RVU Floor', description: 'Document your annual procedure volumes (echos, stress tests, caths, TEEs, ablations) over the past 24 months. Cardiologists who own 4,000+ RVUs/year hold strong negotiation leverage. Use MGMA Cardiology Compensation Survey 2026 (median $560K, 75th percentile $720K) to push for guaranteed RVU floor + uncapped productivity bonus. Replacing a high-volume cardiologist takes 12-18 months and $2M+ in lost contribution margin.', layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Target Private Practice Partnership Track at Single-Specialty Cardiology Group', description: 'Large single-specialty cardiology groups (CVA, Heart Place, US Heart & Vascular, etc.) offer 2-3 year partnership tracks leading to ownership distribution of $700K-$1.2M annual income. Even employed positions at PE-backed cardiology platforms (Cardiovascular Associates of America, Cardiology Partners) pay $50K-$100K above hospital-employed comp. Apply to 3 partnership-track positions this quarter.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  oncologist_medical: pool(
    { title: 'Build Clinical Trial PI Capability and Pharma Relationships', description: 'Medical oncologists who serve as Principal Investigator on industry-sponsored trials earn $80K-$200K supplemental income above clinical comp via per-patient enrollment fees. Beyond income, PI status creates structural protection from layoffs (trial sponsors have multi-year contracts) and provides direct relationships with pharma medical affairs for future industry transitions. Approach 2-3 sponsors via SCRS or via your hospital research office.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Subspecialize in High-Growth Tumor Sites (Breast, GU, Heme)', description: 'Tumor-site specialization (breast, GU, heme/lymphoma) commands 15-25% premium over general medical oncology and concentrates referral patterns. Heme-oncology with CAR-T/cell therapy experience is the rarest and highest-paid subspecialty ($600K-$850K). Pursue additional fellowship year if early career, or self-direct via ASCO University, ASH educational pathway, and 30-50 protocol cases.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Target Community Oncology Partnership (US Oncology, OneOncology, AON)', description: 'Community oncology consolidator platforms (US Oncology Network/McKesson, OneOncology, American Oncology Network) offer practice partnership comp of $650K-$900K + drug margin participation. Equity events at PE-backed groups have generated $500K-$2M payouts. Apply to 2-3 partnership-track positions this quarter — comp dramatically exceeds hospital-employed oncology.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  oncologist_surgical: pool(
    { title: 'Build Complex Case Volume and Hospital Service Line Leverage', description: 'Surgical oncologists with documented complex case volume (Whipple, HIPEC, complex sarcoma resection, hepatobiliary) are nearly irreplaceable at the hospital service-line level. Document your annual complex case mix and outcomes (NSQIP data is gold). Surgical oncologists at NCI-designated centers and academic cancer centers earn $580K-$780K base + complex case stipends. Replacement requires 12-24 month recruit and credentialing.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Maintain SSO Membership and Pursue Complex GI Surgery Fellowship if Early Career', description: 'Society of Surgical Oncology (SSO) membership + complex GI/HPB fellowship is the highest-leverage credential combo. Surgical oncologists with fellowship in HPB or peritoneal surface oncology command $650K-$850K and have effectively zero displacement risk through 2030. ABS board certification + SSO membership is the non-negotiable credential floor.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Establish Tumor Board Leadership Role for Career Resilience', description: 'Chairing or leading a multidisciplinary tumor board at your institution creates structural leverage: you become the central node for surgical referrals, oncology coordination, and hospital quality metrics. This role is impossible to backfill quickly. Negotiate explicit administrative time (1-2 days/month protected) and stipend ($25K-$60K/year) tied to tumor board leadership.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  radiologist: pool(
    { title: 'Subspecialize and Build Teleradiology Backup Income Stream', description: 'AI reading assistance (Aidoc, Annalise.ai, Rad AI) is the most disruptive force in radiology — but subspecialized radiologists (neuro, MSK, breast imaging, IR) remain in acute shortage. Pursue subspecialty fellowship if early career. Mid-career: build a teleradiology contract with vRad, NightHawk, StatRad, or Direct Radiology at $50-$120 per study reading nights/weekends. Generates $80K-$200K supplemental income and dramatic AI-displacement insulation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '60 days', priority: 'Critical' },
    { title: 'Pivot to Interventional Radiology Track if Diagnostic-Heavy', description: 'Interventional radiology is structurally protected from AI displacement — procedures cannot be replaced by reading algorithms. IR/DR dual-board pathway via 1-year IR fellowship adds $80K-$150K to annual comp ($560K → $700K+) and locks in procedural revenue. SIR (Society of Interventional Radiology) membership + IR fellowship completion is the credential bar. ABR IR/DR certification through ABR is the gold standard.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Negotiate Volume-Based RVU Floor + AI Tool Allowance', description: 'With AI reading tools accelerating per-radiologist throughput, hospitals are pushing higher RVU expectations. Negotiate a guaranteed RVU floor at the 50th percentile MGMA Radiology (2026 median: 11,500 RVUs, $510K base) regardless of AI-driven throughput inflation. Include explicit clause that AI tools are productivity aids, not justification for compensation reduction. Document all complex study mix to defend high-RVU work.', layerFocus: 'L5 · Negotiation', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  radiation_oncologist: pool(
    { title: 'Build Stereotactic and Brachytherapy Procedural Volume', description: 'Stereotactic radiosurgery (SRS/SBRT) and brachytherapy are the procedural subspecialty drivers in radiation oncology. Centers without these capabilities are losing referrals to those that do. Document annual SBRT and brachytherapy case volume. Radiation oncologists with strong procedural mix earn $580K-$780K vs. $470K for treatment-planning focused roles. Apply for ABS brachytherapy society membership.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Engage with PE-Backed Cancer Treatment Networks', description: 'PE-backed radiation oncology platforms (American Cancer Treatment Centers, GenesisCare, OneOncology RadOnc division) offer partnership tracks at $580K-$750K + equity participation. Apply to 2-3 partnership-track positions this quarter. Comp dramatically exceeds hospital-employed radonc, particularly for partners at high-volume free-standing centers.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    { title: 'Lead Hypofractionation and SBRT Protocol Implementation', description: 'Radiation oncologists who own protocol development (hypofractionation for breast/prostate, SBRT for lung/liver/oligomets) become the central referral node and gain structural protection. Lead protocol authorship at your center; this becomes a portfolio piece for academic appointments and PE-backed center medical directorships ($60K-$120K stipend on top of clinical).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '120 days', priority: 'High' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  anesthesiologist: pool(
    { title: 'Maintain Multi-State Licenses via IMLC for Maximum Locum Leverage', description: 'Anesthesia locum rates have surged to $300-$550/hour in 2026 due to chronic shortage (40% of US hospitals report anesthesia staffing crisis per ASA 2026 survey). With IMLC active in 40+ states and 2-3 additional state licenses, you can earn $300K-$500K supplemental from selective locum weeks while employed. Locum income also signals market rate and creates immediate income bridge during practice transitions.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '30 days', priority: 'Critical' },
    { title: 'Subspecialize: Cardiac, Pediatric, or Pain Medicine Fellowship', description: 'Cardiac anesthesia, peds anesthesia, and pain medicine fellowships each unlock $80K-$200K above general anesthesia base. Pain medicine in particular is the highest-RVU subspecialty in anesthesia ($550K-$750K). ABA subspecialty certification is the credential. If early career: pursue fellowship. If mid-career: build OR case mix in cardiac/peds to enable lateral pivot.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Target Anesthesia Partnership at Independent Practice or PE-Backed Group', description: 'Independent anesthesia groups (NorthStar, USAP, Sheridan/Envision) and PE-backed platforms pay $550K-$750K base + partnership distributions. Hospital-employed anesthesia averages 15-25% below practice-employed. Apply to 2-3 partnership-track positions in your region this quarter. ASA member directory + Doximity job board are primary sources.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  neurologist: pool(
    { title: 'Subspecialize in Stroke, Epilepsy, or Movement Disorders', description: 'General neurology compensation has stagnated; subspecialty neurology has surged. Stroke neurology (vascular fellowship + tPA / thrombectomy capable) earns $420K-$580K and is in acute shortage at every Joint Commission-certified Comprehensive Stroke Center. Epilepsy/EEG and movement disorders fellowships similarly add $50K-$120K. AAN subspecialty certification.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Telemedicine Stroke (Telestroke) Coverage Income Stream', description: 'Telestroke programs (SOC Telemed, Specialists On Call, university hub-and-spoke networks) pay $300-$650 per consultation for nighttime/weekend stroke coverage. Even 4-8 shifts/month generates $40K-$120K supplemental income. Programs require active state licensure (use IMLC for multi-state portability) and 1-2 year emergency neurology experience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '60 days', priority: 'Critical' },
    { title: 'Negotiate Protected Time for Neurodiagnostic Procedures (EMG/EEG)', description: 'Neurologists who own neurodiagnostic procedure volume (EMG/NCS, EEG interpretation, Botox for migraine/dystonia) earn $80K-$180K above pure cognitive neurology. Negotiate explicit protected procedure time + ownership of professional fees on neurodiagnostic studies. Document procedure volumes to defend the value during contract renewal.', layerFocus: 'L5 · Negotiation', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  emergency_medicine_physician: pool(
    { title: 'Build Locum and Multi-Site Coverage Portfolio for Group Independence', description: 'EM is the specialty most exposed to PE-group consolidation pressure (TeamHealth, Envision, USACS). Build a parallel locum income stream via CompHealth/Weatherby at $250-$400/hour. Maintain credentials at 2-3 EDs (not just one). This creates the leverage to walk from PE-group contract concessions or to weather the next round of consolidation-driven layoffs.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Pursue Critical Care or Ultrasound Fellowship for Subspecialty Leverage', description: 'EM-Critical Care (EM/CCM dual-boarded) and EM-Ultrasound fellowships unlock $80K-$150K above EM base and create alternate career paths if EM clinical practice deteriorates. ABEM subspecialty certification in EM/CCM allows ICU shifts at $400-$500/hour. Even mid-career EM physicians can pursue EM/CCM via 2-year fellowship.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Target Democratic Group or Hospital-Employed EM Position Away from PE', description: 'Democratic EM groups (physician-owned, not PE-controlled) and hospital-employed EM positions pay $400K-$520K with predictable schedules and no equity-clawback risk. Resources: ACEP EM Job Bank, Doximity, EmDocs.net. Apply to 2-3 non-PE positions to establish leverage and alternative path if current group conditions deteriorate.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  general_surgeon: pool(
    { title: 'Build Acute Care Surgery / Trauma Capability for Hospital Indispensability', description: 'General surgeons with acute care surgery (ACS) fellowship and active trauma call coverage are nearly impossible to recruit. ACS fellowship via AAST (American Association for the Surgery of Trauma) unlocks $480K-$680K base + significant call stipends ($1,500-$3,500/night). Even without fellowship, taking active trauma call at a Level II/III center creates structural indispensability.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Document Robotic / Advanced Laparoscopic Volume and Negotiate', description: 'Robotic surgery volume (>200 cases/year on Intuitive Xi/SP) is the modern surgical credential bar. Hospitals investing in robotic platforms desperately need high-volume robotic surgeons. Document your annual robotic case mix and outcomes. ABS board certification + 200+ robotic cases puts you in top 25% of general surgeons. Use to negotiate $480K-$620K range.', layerFocus: 'L5 · Negotiation', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply to Hospital-Employed Surgery Partnership or PE-Backed Surgical Group', description: 'PE-backed surgical platforms (USPI, Surgery Partners, SCA Health) offer partnership tracks at $520K-$720K + equity participation in ASC distributions. Hospital-employed general surgery typically pays $440K-$560K. Apply to 2-3 partnership-track positions this quarter via Doximity, ACS Job Board, MGMA recruiter network.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  neurosurgeon: pool(
    { title: 'Build Spine vs. Cranial Subspecialty Volume and Document Case Mix', description: 'Neurosurgery comp is driven by case mix. Spine-heavy practice (complex deformity, MIS, robotic spine) earns $750K-$1.1M; cranial/functional practice (epilepsy, DBS, tumor) earns $700K-$950K. Pediatric neurosurgery commands $850K+ due to extreme scarcity. Document your last 24 months case volume and complexity. ABNS board certification + subspecialty volume = ironclad negotiation leverage.', layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Target Single-Specialty Spine or Neuro Surgical Group Partnership', description: 'Single-specialty neurosurgery groups (NeuroPoint, Atlantic Neurosurgical, Carolina Neurosurgery) offer partnership comp of $850K-$1.3M. PE-backed spine platforms (Cantata Health, NSO Spine) pay $750K-$1M base + equity events. Apply to 2-3 partnership positions this quarter — comp dramatically exceeds hospital-employed neurosurgery.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Establish Expert Witness Practice for Career Resilience and Income Diversification', description: 'Neurosurgery is the highest-paid expert witness specialty: $750-$1,500/hour for case review, $5,000-$15,000/day for trial testimony. Even 5-10 cases/year adds $80K-$200K supplemental income and is a complete layoff hedge. Register with SEAK, ExpertPages, AMFS. Senior neurosurgeons with 10+ years experience are in highest demand.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  orthopedic_surgeon: pool(
    { title: 'Subspecialize: Joint Replacement, Sports Medicine, or Spine', description: 'Subspecialty fellowship is the highest-ROI move in orthopedics. Joint replacement (total joint via AAHKS fellowship) earns $640K-$900K. Sports medicine (AOSSM fellowship) earns $580K-$780K. Spine (AOA spine fellowship) earns $700K-$950K. Hand surgery, pediatric ortho, foot/ankle all add $80K-$200K. ABOS subspecialty designation through AAHKS/AOSSM is the credential.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Target Private Practice Ortho Partnership with ASC Ownership', description: 'Single-specialty ortho groups (Rothman, OrthoVirginia, Resurgens, Andrews) offer partnership tracks at $700K-$1.1M + ASC distributions of $150K-$400K annually. PE-backed ortho platforms (Healthcare Outcomes Performance Co., U.S. Orthopaedic Partners) offer equity events. Apply to 2-3 partnership positions this quarter — ASC ownership is the wealth multiplier.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Build Robotic Joint Replacement Volume (Mako, ROSA, Velys)', description: 'Robotic joint replacement (Stryker Mako, Zimmer ROSA, Johnson & Johnson Velys) is becoming standard of care. Surgeons with 100+ robotic cases/year on a specific platform are in acute demand at hospitals investing in robotics. Document annual robotic case volume; use as leverage in compensation negotiations and partnership applications.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  cardiothoracic_surgeon: pool(
    { title: 'Build Complex Aortic, Mitral, or Transplant Case Volume', description: 'CT surgeon comp is overwhelmingly driven by complex case mix. Complex aortic (root replacement, hemiarch, aortic dissection), complex mitral repair (Carpentier techniques), and transplant (heart, lung) are the high-value programs. CT surgeons with complex aortic + mitral repair earn $750K-$950K; transplant surgeons earn $750K-$1.1M. Document annual case mix via STS database; this is your strongest negotiation tool.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Maintain ABTS Certification and STS Membership', description: 'ABTS board certification + STS membership + STS database participation is the credential floor. Active STS database surgeons gain access to STS Adult Cardiac Risk Model risk-adjusted outcomes data that you can present during contract negotiations. Maintain MOC and ensure your subspecialty (cardiac, thoracic, congenital) certification is current.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    { title: 'Target High-Volume Heart Program for Indispensability', description: 'CT surgeons at high-volume programs (>500 cardiac cases/year, STS 3-star programs) are nearly impossible to recruit. These programs (Cleveland Clinic, Mayo, Mount Sinai, Mass General, Houston Methodist, etc.) pay $750K-$1.1M base + complex case stipends. Apply to 2-3 high-volume programs this quarter — the negotiation leverage is generational.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  plastic_surgeon: pool(
    { title: 'Build Cosmetic Cash-Pay Practice as Career Resilience Hedge', description: 'Plastic surgeons with established cosmetic (cash-pay) practice are immune to insurance reimbursement cuts and hospital employment volatility. Build cosmetic case volume gradually via local marketing, RealSelf profile optimization, and a website with before/after gallery. Even 2-3 cosmetic days/month adds $250K-$600K annual income that cannot be cut by a single payer or employer.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Subspecialize: Microsurgery, Hand, or Craniofacial', description: 'Reconstructive subspecialties (microsurgery for breast reconstruction post-mastectomy, hand surgery, craniofacial) are in chronic shortage at academic and tertiary centers. Microsurgeons earn $580K-$780K and have effectively zero layoff risk. ASPS membership + ASMS/ASRM fellowship + ABPS board certification is the credential combo. Hand surgery requires ASSH fellowship and CAQ.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Negotiate Cosmetic Practice Carve-Out in Employment Contract', description: 'If hospital-employed, negotiate explicit contract language permitting outside cosmetic practice (typically 1-2 days/week) with personal billing and no employer revenue share. This is standard for academic plastics positions but often missing in community hospital contracts. Cosmetic carve-out can double total compensation while preserving primary clinical position.', layerFocus: 'L5 · Negotiation', riskReductionPct: 26, deadline: '60 days', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  psychiatrist: pool(
    { title: 'Build Direct-Pay or Concierge Practice Alongside Employed Position', description: 'Psychiatry is the highest-demand physician specialty in 2026 due to mental health crisis (APA 2026 reports 5:1 demand-to-supply ratio). Direct-pay psychiatry rates run $300-$500/45-min session in major metros, generating $300K-$600K from a half-day/week of cash-pay work. Even 4 hours/week direct-pay generates ~$80K-$120K supplemental income with zero insurance overhead. APA + state license is sufficient.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Build Telepsychiatry Coverage Portfolio (Brightside, Talkiatry, Mindstrong, Iris)', description: 'Telepsychiatry platforms (Talkiatry, Iris Telehealth, Mindoula, Brightside) pay $200-$320/hour + benefits for W2 telehealth psychiatrists. Talkiatry/Iris in particular pay psychiatrists $300K-$400K full-time with no admin overhead. Use IMLC for multi-state licensure. This is the most resilient career path in psychiatry — extreme demand, AI-resistant, fully remote.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    { title: 'Subspecialize in Addiction, Child/Adolescent, or Forensic Psychiatry', description: 'Subspecialty psychiatry (child/adolescent, addiction medicine, forensic, geriatric) is in even more acute shortage than general adult psychiatry. Child/adolescent psychiatrists earn $320K-$450K and are in 8:1 demand ratio. Addiction psychiatry with X-waiver/Suboxone certification earns $280K-$400K. ABPN subspecialty certification + 1-year fellowship is the credential.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  dermatologist: pool(
    { title: 'Build Cash-Pay Cosmetic Dermatology Practice (Botox, Fillers, Lasers)', description: 'Cosmetic dermatology is the highest-margin physician specialty in 2026. Even 1-2 cosmetic days/week generates $250K-$500K in cash-pay revenue (Botox $12/unit cost vs. $400-$500/area; fillers $300/syringe cost vs. $700-$1,200; CoolSculpting, lasers, microneedling). ABD board certification + AAD/ASDS membership is the credential floor. Build inventory of 5-7 cosmetic procedure types.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Target Private Practice Partnership at PE-Backed Derm Platform', description: 'PE-backed derm platforms (Forefront Dermatology, Schweiger, Anne Arundel Dermatology, Epiphany) offer partnership tracks at $450K-$650K + equity participation. Derm equity events have generated $500K-$2M payouts. Apply to 2-3 partnership positions this quarter via AAD job board and Doximity.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Subspecialize in Mohs Surgery for Procedural Premium', description: 'Mohs micrographic surgery fellowship (1 year via ACMS/AAD) unlocks $580K-$780K compensation and creates effectively zero displacement risk. Mohs surgeons are in chronic shortage; even rural practices can sustain Mohs-only surgeons at $500K+. ABD board + Mohs College fellowship is the credential.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'Critical' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  ophthalmologist: pool(
    { title: 'Subspecialize: Retina, Glaucoma, or Cornea/Refractive', description: 'Retina (medical and surgical, with intravitreal injection volume) is the highest-comp ophthalmology subspecialty: $480K-$680K. Glaucoma (with MIGS procedural volume) earns $360K-$520K. Cornea/refractive (LASIK, corneal transplant) earns $380K-$580K with cash-pay LASIK component. AAO subspecialty + 1-2 year fellowship is the credential.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Target Private Practice Partnership with ASC + Optical Shop Ownership', description: 'Comprehensive ophthalmology partnerships often include surgical ASC ownership + optical shop revenue, generating $480K-$700K total comp. PE-backed eye platforms (EyeCare Partners, Acuity Eyecare Group, Spectrum Vision Partners) pay $400K-$580K + equity participation. ASC ownership is the wealth multiplier — $100K-$300K annual distributions on top of clinical comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Build Cataract Surgery Volume and Premium IOL Mix', description: 'Cataract surgery volume + premium intraocular lens (multifocal, EDOF, toric) mix is the modern ophthalmology revenue driver. Premium IOLs generate $1,500-$3,500 cash-pay upgrade per eye. Surgeons with 600+ cataracts/year and 30%+ premium IOL mix earn $80K-$200K above conventional cataract-only practice. Document volume and premium mix for partnership negotiations.', layerFocus: 'L5 · Negotiation', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

  pediatrician: pool(
    { title: 'Pivot to Hospitalist or Subspecialty Track for Higher Comp', description: 'General outpatient pediatrics has stagnant comp ($220K-$270K). Pediatric hospitalist ($240K-$310K), pediatric ED ($300K-$400K), and pediatric subspecialties (neonatology $300K-$450K, pediatric cardiology $300K-$420K, pediatric heme-onc $280K-$380K) all command premium. ABP subspecialty + fellowship is the credential. Even mid-career generalists can pivot via 3-year fellowship.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Target Private Pediatric Group Partnership or Direct Primary Care Pediatrics', description: 'Private pediatric group partnerships (vs. hospital-employed) pay $250K-$320K + partnership distributions. Direct primary care pediatrics ($1,500-$3,000/family/year membership) generates $300K-$500K from 200-400 families with zero insurance overhead. Apply to 2-3 partnership positions or research a DPC pediatrics launch in your region.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'Critical' },
    { title: 'Build Telemedicine and After-Hours Coverage Income Stream', description: 'Telepediatrics platforms (Brave Care, Blueberry Pediatrics, Pediatric Nurse Line networks) pay $150-$220/hour for after-hours coverage. Even 4-8 shifts/month generates $30K-$70K supplemental income. Combined with active multi-state IMLC licensure, this creates strong career resilience for primary care pediatricians facing reimbursement pressure.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    A_PHYS_NETWORKING.senior.high[0], A_PHYS_NETWORKING.junior.moderate[0],
  ),

};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_PHYSICIANS: Record<string, { canonicalKey: string; displayRole: string }> = {
  'cardiologist': { canonicalKey: 'cardiologist', displayRole: 'Cardiologist' },
  'cardiology': { canonicalKey: 'cardiologist', displayRole: 'Cardiologist' },
  'interventional cardiologist': { canonicalKey: 'cardiologist', displayRole: 'Interventional Cardiologist' },
  'electrophysiologist': { canonicalKey: 'cardiologist', displayRole: 'Cardiac Electrophysiologist' },
  'medical oncologist': { canonicalKey: 'oncologist_medical', displayRole: 'Medical Oncologist' },
  'hematologist oncologist': { canonicalKey: 'oncologist_medical', displayRole: 'Hematologist-Oncologist' },
  'heme onc': { canonicalKey: 'oncologist_medical', displayRole: 'Heme/Onc Physician' },
  'oncologist': { canonicalKey: 'oncologist_medical', displayRole: 'Oncologist' },
  'surgical oncologist': { canonicalKey: 'oncologist_surgical', displayRole: 'Surgical Oncologist' },
  'surgical oncology': { canonicalKey: 'oncologist_surgical', displayRole: 'Surgical Oncologist' },
  'hpb surgeon': { canonicalKey: 'oncologist_surgical', displayRole: 'HPB Surgical Oncologist' },
  'radiologist': { canonicalKey: 'radiologist', displayRole: 'Radiologist' },
  'diagnostic radiologist': { canonicalKey: 'radiologist', displayRole: 'Diagnostic Radiologist' },
  'interventional radiologist': { canonicalKey: 'radiologist', displayRole: 'Interventional Radiologist' },
  'teleradiologist': { canonicalKey: 'radiologist', displayRole: 'Teleradiologist' },
  'radiation oncologist': { canonicalKey: 'radiation_oncologist', displayRole: 'Radiation Oncologist' },
  'radiation oncology': { canonicalKey: 'radiation_oncologist', displayRole: 'Radiation Oncologist' },
  'rad onc': { canonicalKey: 'radiation_oncologist', displayRole: 'Radiation Oncologist' },
  'anesthesiologist': { canonicalKey: 'anesthesiologist', displayRole: 'Anesthesiologist' },
  'anesthesiology': { canonicalKey: 'anesthesiologist', displayRole: 'Anesthesiologist' },
  'cardiac anesthesiologist': { canonicalKey: 'anesthesiologist', displayRole: 'Cardiac Anesthesiologist' },
  'pain medicine physician': { canonicalKey: 'anesthesiologist', displayRole: 'Pain Medicine Physician' },
  'neurologist': { canonicalKey: 'neurologist', displayRole: 'Neurologist' },
  'neurology': { canonicalKey: 'neurologist', displayRole: 'Neurologist' },
  'stroke neurologist': { canonicalKey: 'neurologist', displayRole: 'Stroke Neurologist' },
  'epileptologist': { canonicalKey: 'neurologist', displayRole: 'Epileptologist' },
  'emergency medicine physician': { canonicalKey: 'emergency_medicine_physician', displayRole: 'Emergency Medicine Physician' },
  'emergency physician': { canonicalKey: 'emergency_medicine_physician', displayRole: 'Emergency Physician' },
  'er physician': { canonicalKey: 'emergency_medicine_physician', displayRole: 'ER Physician' },
  'ed physician': { canonicalKey: 'emergency_medicine_physician', displayRole: 'ED Physician' },
  'em physician': { canonicalKey: 'emergency_medicine_physician', displayRole: 'EM Physician' },
  'general surgeon': { canonicalKey: 'general_surgeon', displayRole: 'General Surgeon' },
  'general surgery': { canonicalKey: 'general_surgeon', displayRole: 'General Surgeon' },
  'trauma surgeon': { canonicalKey: 'general_surgeon', displayRole: 'Trauma Surgeon' },
  'acute care surgeon': { canonicalKey: 'general_surgeon', displayRole: 'Acute Care Surgeon' },
  'neurosurgeon': { canonicalKey: 'neurosurgeon', displayRole: 'Neurosurgeon' },
  'neurological surgeon': { canonicalKey: 'neurosurgeon', displayRole: 'Neurological Surgeon' },
  'spine surgeon': { canonicalKey: 'neurosurgeon', displayRole: 'Spine Surgeon (Neurosurgery)' },
  'orthopedic surgeon': { canonicalKey: 'orthopedic_surgeon', displayRole: 'Orthopedic Surgeon' },
  'orthopaedic surgeon': { canonicalKey: 'orthopedic_surgeon', displayRole: 'Orthopaedic Surgeon' },
  'orthopedic surgery': { canonicalKey: 'orthopedic_surgeon', displayRole: 'Orthopedic Surgeon' },
  'sports medicine surgeon': { canonicalKey: 'orthopedic_surgeon', displayRole: 'Sports Medicine Surgeon' },
  'joint replacement surgeon': { canonicalKey: 'orthopedic_surgeon', displayRole: 'Joint Replacement Surgeon' },
  'cardiothoracic surgeon': { canonicalKey: 'cardiothoracic_surgeon', displayRole: 'Cardiothoracic Surgeon' },
  'cardiac surgeon': { canonicalKey: 'cardiothoracic_surgeon', displayRole: 'Cardiac Surgeon' },
  'thoracic surgeon': { canonicalKey: 'cardiothoracic_surgeon', displayRole: 'Thoracic Surgeon' },
  'ct surgeon': { canonicalKey: 'cardiothoracic_surgeon', displayRole: 'CT Surgeon' },
  'plastic surgeon': { canonicalKey: 'plastic_surgeon', displayRole: 'Plastic Surgeon' },
  'plastic surgery': { canonicalKey: 'plastic_surgeon', displayRole: 'Plastic Surgeon' },
  'reconstructive surgeon': { canonicalKey: 'plastic_surgeon', displayRole: 'Reconstructive Surgeon' },
  'cosmetic surgeon': { canonicalKey: 'plastic_surgeon', displayRole: 'Cosmetic Surgeon' },
  'psychiatrist': { canonicalKey: 'psychiatrist', displayRole: 'Psychiatrist' },
  'psychiatry': { canonicalKey: 'psychiatrist', displayRole: 'Psychiatrist' },
  'child psychiatrist': { canonicalKey: 'psychiatrist', displayRole: 'Child & Adolescent Psychiatrist' },
  'addiction psychiatrist': { canonicalKey: 'psychiatrist', displayRole: 'Addiction Psychiatrist' },
  'forensic psychiatrist': { canonicalKey: 'psychiatrist', displayRole: 'Forensic Psychiatrist' },
  'dermatologist': { canonicalKey: 'dermatologist', displayRole: 'Dermatologist' },
  'dermatology': { canonicalKey: 'dermatologist', displayRole: 'Dermatologist' },
  'mohs surgeon': { canonicalKey: 'dermatologist', displayRole: 'Mohs Surgeon' },
  'cosmetic dermatologist': { canonicalKey: 'dermatologist', displayRole: 'Cosmetic Dermatologist' },
  'ophthalmologist': { canonicalKey: 'ophthalmologist', displayRole: 'Ophthalmologist' },
  'ophthalmology': { canonicalKey: 'ophthalmologist', displayRole: 'Ophthalmologist' },
  'eye surgeon': { canonicalKey: 'ophthalmologist', displayRole: 'Eye Surgeon' },
  'retina specialist': { canonicalKey: 'ophthalmologist', displayRole: 'Retina Specialist' },
  'pediatrician': { canonicalKey: 'pediatrician', displayRole: 'Pediatrician' },
  'pediatrics': { canonicalKey: 'pediatrician', displayRole: 'Pediatrician' },
  'pediatric hospitalist': { canonicalKey: 'pediatrician', displayRole: 'Pediatric Hospitalist' },
  'general pediatrician': { canonicalKey: 'pediatrician', displayRole: 'General Pediatrician' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_PHYSICIANS: Record<string, string> = {
  cardiologist: 'cardiologist',
  oncologist_medical: 'oncologist_medical',
  oncologist_surgical: 'oncologist_surgical',
  radiologist: 'radiologist',
  radiation_oncologist: 'radiation_oncologist',
  anesthesiologist: 'anesthesiologist',
  neurologist: 'neurologist',
  emergency_medicine_physician: 'emergency_medicine_physician',
  general_surgeon: 'general_surgeon',
  neurosurgeon: 'neurosurgeon',
  orthopedic_surgeon: 'orthopedic_surgeon',
  cardiothoracic_surgeon: 'cardiothoracic_surgeon',
  plastic_surgeon: 'plastic_surgeon',
  psychiatrist: 'psychiatrist',
  dermatologist: 'dermatologist',
  ophthalmologist: 'ophthalmologist',
  pediatrician: 'pediatrician',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_PHYSICIANS: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  cardiologist:                 { roleKey: 'cardiologist',                 roleName: 'Cardiologist',                          demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 145, yoyJobOpeningsChange: 12, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Tampa FL', 'Charlotte NC', 'Dallas TX'],                                aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'Cardiology in chronic shortage; structural heart and EP subspecialists most acute. Aging population sustains demand.' },
  oncologist_medical:           { roleKey: 'oncologist_medical',           roleName: 'Medical Oncologist',                    demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 165, yoyJobOpeningsChange: 14, topHiringLocations: ['Houston TX', 'New York NY', 'Boston MA', 'Phoenix AZ', 'Atlanta GA'],                              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Med onc in acute shortage; aging population + expanding treatment options drive demand. PE consolidation active.' },
  oncologist_surgical:          { roleKey: 'oncologist_surgical',          roleName: 'Surgical Oncologist',                   demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 180, yoyJobOpeningsChange: 10, topHiringLocations: ['Houston TX', 'Boston MA', 'Rochester MN', 'New York NY', 'Pittsburgh PA'],                          aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Surgical oncology demand concentrated at NCI-designated centers; HPB and complex GI most scarce.' },
  radiologist:                  { roleKey: 'radiologist',                  roleName: 'Radiologist',                           demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 120, yoyJobOpeningsChange: 18, topHiringLocations: ['Phoenix AZ', 'Tampa FL', 'Dallas TX', 'Atlanta GA', 'Charlotte NC'],                                aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1', calibrationNote: 'Radiology in deepest shortage (ACR 2026: 5K+ unfilled). AI reading tools accelerating throughput but not displacing diagnostic interpretation.' },
  radiation_oncologist:         { roleKey: 'radiation_oncologist',         roleName: 'Radiation Oncologist',                  demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 140, yoyJobOpeningsChange: 4,  topHiringLocations: ['New York NY', 'Houston TX', 'Atlanta GA', 'Phoenix AZ', 'Chicago IL'],                              aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Rad onc supply slightly tightening; treatment planning automation watchful but procedure-based subspecialties stable.' },
  anesthesiologist:             { roleKey: 'anesthesiologist',             roleName: 'Anesthesiologist',                      demandIndex: 90, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 22, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Dallas TX', 'Tampa FL', 'Atlanta GA'],                                aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Anesthesia in critical national shortage (ASA 2026: 40% of hospitals report staffing crisis). Locum rates surged 35% YoY.' },
  neurologist:                  { roleKey: 'neurologist',                  roleName: 'Neurologist',                           demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 150, yoyJobOpeningsChange: 11, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Dallas TX', 'Tampa FL'],                                aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Neurology demand strong; stroke neurology especially scarce at Comprehensive Stroke Centers. Aging demographics sustain demand.' },
  emergency_medicine_physician: { roleKey: 'emergency_medicine_physician', roleName: 'Emergency Medicine Physician',          demandIndex: 80, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 95,  yoyJobOpeningsChange: 3,  topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Atlanta GA', 'Charlotte NC', 'Tampa FL'],                              aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'EM market softening at PE-controlled groups (TeamHealth/Envision/USACS); democratic groups and hospital-employed positions stable.' },
  general_surgeon:              { roleKey: 'general_surgeon',              roleName: 'General Surgeon',                       demandIndex: 87, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 140, yoyJobOpeningsChange: 13, topHiringLocations: ['Phoenix AZ', 'Houston TX', 'Charlotte NC', 'Dallas TX', 'Tampa FL'],                                aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'General surgery shortage acute in rural and community hospital settings; ACS-trained surgeons highly competitive nationally.' },
  neurosurgeon:                 { roleKey: 'neurosurgeon',                 roleName: 'Neurosurgeon',                          demandIndex: 89, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 200, yoyJobOpeningsChange: 14, topHiringLocations: ['Houston TX', 'Phoenix AZ', 'Dallas TX', 'Atlanta GA', 'Charlotte NC'],                              aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1', calibrationNote: 'Neurosurgery in extreme shortage; rural and mid-tier metros routinely cannot recruit. Spine subspecialty highest demand.' },
  orthopedic_surgeon:           { roleKey: 'orthopedic_surgeon',           roleName: 'Orthopedic Surgeon',                    demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 155, yoyJobOpeningsChange: 16, topHiringLocations: ['Phoenix AZ', 'Houston TX', 'Tampa FL', 'Dallas TX', 'Charlotte NC'],                                aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Ortho demand surging; joint replacement aging-population driven, sports medicine and spine subspecialists most acute.' },
  cardiothoracic_surgeon:       { roleKey: 'cardiothoracic_surgeon',       roleName: 'Cardiothoracic Surgeon',                demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 220, yoyJobOpeningsChange: 9,  topHiringLocations: ['Houston TX', 'Cleveland OH', 'Rochester MN', 'Boston MA', 'New York NY'],                          aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'CT surgery supply structurally constrained (small training pipeline); complex aortic and transplant surgeons especially scarce.' },
  plastic_surgeon:              { roleKey: 'plastic_surgeon',              roleName: 'Plastic Surgeon',                       demandIndex: 85, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 130, yoyJobOpeningsChange: 12, topHiringLocations: ['Miami FL', 'Los Angeles CA', 'Houston TX', 'Dallas TX', 'New York NY'],                            aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Plastics demand bifurcated: cosmetic cash-pay growing 15%+ YoY; reconstructive (microsurgery, hand, cranio) chronic shortage.' },
  psychiatrist:                 { roleKey: 'psychiatrist',                 roleName: 'Psychiatrist',                          demandIndex: 92, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising', timeToFillDays: 175, yoyJobOpeningsChange: 28, topHiringLocations: ['Remote', 'Phoenix AZ', 'Houston TX', 'Atlanta GA', 'Dallas TX'],                                   aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Psychiatry in deepest US physician shortage (APA 2026: 5:1 demand-to-supply). Mental health crisis + telemedicine expansion sustaining surge.' },
  dermatologist:                { roleKey: 'dermatologist',                roleName: 'Dermatologist',                         demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 165, yoyJobOpeningsChange: 14, topHiringLocations: ['Phoenix AZ', 'Tampa FL', 'Miami FL', 'Houston TX', 'Charlotte NC'],                                aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Dermatology in chronic shortage; PE consolidation aggressive, cash-pay cosmetic margins driving practice growth. AI dermoscopy watchful.' },
  ophthalmologist:              { roleKey: 'ophthalmologist',              roleName: 'Ophthalmologist',                       demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 140, yoyJobOpeningsChange: 10, topHiringLocations: ['Phoenix AZ', 'Houston TX', 'Tampa FL', 'Dallas TX', 'Charlotte NC'],                                aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Ophthalmology demand strong; retina specialists in deepest shortage. AI diabetic retinopathy screening expanding but augmenting not replacing.' },
  pediatrician:                 { roleKey: 'pediatrician',                 roleName: 'Pediatrician',                          demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 110, yoyJobOpeningsChange: 2,  topHiringLocations: ['Phoenix AZ', 'Houston TX', 'Atlanta GA', 'Tampa FL', 'Charlotte NC'],                              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'General pediatrics demand stable but comp stagnant; pediatric subspecialties (cardio, heme-onc, hospitalist) commanding premium.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_PHYSICIANS: Record<string, Record<string, number>> = {
  cardiologist:                 { '0-2': 380_000, '2-5': 480_000, '5-10': 560_000, '10-15': 660_000, '15+': 750_000 },
  oncologist_medical:           { '0-2': 340_000, '2-5': 420_000, '5-10': 500_000, '10-15': 580_000, '15+': 660_000 },
  oncologist_surgical:          { '0-2': 410_000, '2-5': 510_000, '5-10': 600_000, '10-15': 690_000, '15+': 770_000 },
  radiologist:                  { '0-2': 380_000, '2-5': 460_000, '5-10': 520_000, '10-15': 560_000, '15+': 600_000 },
  radiation_oncologist:         { '0-2': 400_000, '2-5': 480_000, '5-10': 550_000, '10-15': 620_000, '15+': 680_000 },
  anesthesiologist:             { '0-2': 400_000, '2-5': 470_000, '5-10': 540_000, '10-15': 600_000, '15+': 650_000 },
  neurologist:                  { '0-2': 280_000, '2-5': 340_000, '5-10': 400_000, '10-15': 460_000, '15+': 520_000 },
  emergency_medicine_physician: { '0-2': 320_000, '2-5': 360_000, '5-10': 400_000, '10-15': 430_000, '15+': 460_000 },
  general_surgeon:              { '0-2': 360_000, '2-5': 440_000, '5-10': 510_000, '10-15': 580_000, '15+': 640_000 },
  neurosurgeon:                 { '0-2': 580_000, '2-5': 720_000, '5-10': 820_000, '10-15': 900_000, '15+': 950_000 },
  orthopedic_surgeon:           { '0-2': 460_000, '2-5': 580_000, '5-10': 680_000, '10-15': 770_000, '15+': 850_000 },
  cardiothoracic_surgeon:       { '0-2': 520_000, '2-5': 640_000, '5-10': 740_000, '10-15': 810_000, '15+': 850_000 },
  plastic_surgeon:              { '0-2': 380_000, '2-5': 460_000, '5-10': 560_000, '10-15': 660_000, '15+': 760_000 },
  psychiatrist:                 { '0-2': 250_000, '2-5': 290_000, '5-10': 320_000, '10-15': 350_000, '15+': 380_000 },
  dermatologist:                { '0-2': 380_000, '2-5': 450_000, '5-10': 500_000, '10-15': 540_000, '15+': 580_000 },
  ophthalmologist:              { '0-2': 320_000, '2-5': 400_000, '5-10': 460_000, '10-15': 520_000, '15+': 580_000 },
  pediatrician:                 { '0-2': 210_000, '2-5': 235_000, '5-10': 250_000, '10-15': 265_000, '15+': 280_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_PHYSICIANS: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  cardiologist: {
    strongOpener: 'I\'d like to discuss my compensation package in the context of my procedure volume and the 2026 cardiology market. Over the past 24 months I\'ve generated [X RVUs / Y echos / Z caths / W ablations]; per MGMA 2026, this places me at the 75th percentile for [general/invasive/EP] cardiology.',
    leverageContext: 'Per MGMA Cardiology Compensation Survey 2026, 75th percentile total comp for [subspecialty] is $X. Replacing a cardiologist at my volume takes 12-18 months given Interstate Medical Licensure Compact processing, credentialing, and payer panel enrollment — during which contribution margin loss exceeds $2M. Two single-specialty cardiology groups in the region have made informal inquiries at higher comp.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA), RVU floor at the 50th percentile guaranteed regardless of volume fluctuation, uncapped productivity bonus above floor, call stipend of $Y per night, and CME budget of $7,500/year plus 5 days protected.',
    walkAwayLine: 'I\'ve been approached by [CVA / US Heart & Vascular / regional cardiology partnership] at meaningfully higher total comp including partnership track. I\'d prefer to continue building here — but the comp gap needs to close.',
  },
  oncologist_medical: {
    strongOpener: 'I want to align my compensation with my contribution profile: [X new patient consults / Y infusion encounters / Z trial enrollments / drug margin contribution of $W]. Per MGMA Oncology 2026, this places me at the 75th percentile.',
    leverageContext: 'Med oncologists are in 5:1 demand-to-supply at the national level (AAMC 2026). Replacement timeline: 6-12 months minimum. My active patient panel of [N] patients would need transition coordination; relationship continuity is a material factor in oncology outcomes and patient retention. US Oncology, OneOncology, and American Oncology Network are actively recruiting at $650K+.',
    countersScript: 'I\'m asking for base of $X, RVU + drug margin participation, $50K-$100K annual research/PI stipend, CME budget of $7,500, and 5 protected research/admin days for trial work.',
    walkAwayLine: 'I have ongoing conversations with [US Oncology / OneOncology / regional cancer center] with partnership comp at $X. The patient relationships here matter to me — but the gap is meaningful.',
  },
  oncologist_surgical: {
    strongOpener: 'I\'d like to discuss my comp in the context of complex case volume and service-line contribution. Last 24 months: [X Whipples / Y HIPECs / Z complex hepatobiliary / W sarcoma resections] — per SSO and NSQIP benchmarks, this is top-quartile volume.',
    leverageContext: 'Complex surgical oncology programs (Whipple, HIPEC, complex liver) cannot recruit replacements in under 18 months. My case mix supports the entire downstream service line — medical onc referrals, radiology, pathology utilization. Per MGMA Surgical Oncology 2026, 75th percentile is $X. Two NCI-designated centers have made informal inquiries.',
    countersScript: 'I\'m asking for base of $X, complex case stipend of $Y per index case, service-line directorship admin time (1-2 days/month) with stipend of $40K-$80K, and 7 protected days for SSO meeting + complex case continuing education.',
    walkAwayLine: 'I have inbound from [MD Anderson / Mayo / Sloan / regional NCI center]. The program we\'ve built here is meaningful — but I need to see real movement on the gap to market.',
  },
  radiologist: {
    strongOpener: 'I want to discuss my compensation in light of my RVU production and subspecialty case mix. Last 12 months I\'ve generated [X RVUs] including [Y complex neuro / Z breast imaging / W MSK MRI] — per MGMA Radiology 2026 this is 75th percentile volume.',
    leverageContext: 'Per ACR 2026, the US has 5,000+ unfilled radiology positions; subspecialty radiologists (neuro, breast, MSK, IR) are in deepest shortage. AI reading tools (Aidoc, Annalise) accelerate throughput but do not reduce required interpretation volume per case. Replacement timeline: 12+ months given credentialing and payer enrollment. vRad and NightHawk offer teleradiology at $50-$120 per study.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA), RVU floor at 50th percentile with uncapped productivity, explicit contract language that AI tools are aids and not justification for comp reduction, $7,500/year CME, and 7 protected days for RSNA + subspecialty meeting.',
    walkAwayLine: 'I have approaches from [Radiology Partners / vRad full-time / regional teleradiology group] at total comp meaningfully above current. I\'d prefer to continue here — but the gap to market is significant.',
  },
  anesthesiologist: {
    strongOpener: 'I want to align my compensation with the 2026 anesthesia market. Per ASA 2026, 40% of US hospitals report anesthesia staffing crisis; locum rates have surged to $300-$550/hour. My case mix includes [X cardiac / Y peds / Z high-complexity ASA III-IV] supporting top-tier surgical programs.',
    leverageContext: 'Anesthesia replacement timeline: 9-12 months minimum given residency pipeline constraints. CRNA augmentation cannot replace MD anesthesiologist roles for complex cardiac, neuro, peds. NorthStar, USAP, and Sheridan/Envision are actively recruiting at $550K-$700K + partnership track. I can demonstrate $X in locum offers within 30 days.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA Anesthesia 2026), call stipend of $Y per night, subspecialty case stipend (cardiac, peds), and CME budget of $7,500 plus 5 days protected. If full base move isn\'t possible, I\'ll accept a partnership track conversion plus interim retention bonus.',
    walkAwayLine: 'I have written locum offers totaling $X for selective weeks and a partnership-track conversation with [USAP / NorthStar / regional anesthesia group] at substantially higher total comp. The OR teams here are excellent — but the comp gap is too wide to ignore.',
  },
  emergency_medicine_physician: {
    strongOpener: 'I\'d like to discuss my compensation and schedule in the context of the 2026 EM market. My case volume per shift, procedure mix, and patient satisfaction metrics are at the top quartile per ACEP and group benchmarks.',
    leverageContext: 'EM market shifting away from PE-controlled staffing groups; democratic groups and hospital-employed positions pay $400K-$520K with predictable schedules and no equity-clawback. I maintain credentials at 2-3 EDs and have an active locum income stream demonstrating market rate at $250-$400/hour. Replacement timeline: 4-6 months minimum.',
    countersScript: 'I\'m asking for shift rate of $X (or salary of $Y), guaranteed schedule density of 14-15 shifts/month with no overnight ratio penalty, $5,000 CME budget, and explicit contract language preserving the ability to take outside locum work.',
    walkAwayLine: 'I have written offers from [democratic EM group / hospital-employed EM position / EM-CCM ICU shifts] at total comp above current with better schedule. I\'d like to stay — but the package needs to move.',
  },
  general_surgeon: {
    strongOpener: 'I want to discuss compensation in the context of my surgical case volume and robotic/laparoscopic procedural mix. Last 24 months: [X cases / Y robotic / Z complex laparoscopic / W trauma call shifts]. Per MGMA General Surgery 2026 this places me at the 75th percentile.',
    leverageContext: 'General surgery shortage is acute in community hospital settings. Replacement timeline: 8-12 months minimum given board certification, credentialing, payer enrollment. My active trauma call coverage and robotic volume directly impact hospital service-line revenue. PE-backed surgical platforms and democratic groups are actively recruiting at $520K-$680K.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA), call stipend of $Y per night, robotic case stipend, ACS service line stipend if applicable, and 7 protected days CME with $7,500 budget.',
    walkAwayLine: 'I have inbound from [Surgery Partners / regional ASC partnership / hospital-employed surgery position] at meaningfully higher total comp. The OR teams and referral network here are strong — but the comp gap is real.',
  },
  neurosurgeon: {
    strongOpener: 'I\'d like to align my compensation with my procedural volume and case complexity. Last 24 months: [X spine cases / Y cranial / Z complex / W trauma call]. Per MGMA Neurosurgery 2026, 75th percentile total comp for my case mix is $X.',
    leverageContext: 'Neurosurgery replacement timeline: 18-24 months minimum. Single-specialty neurosurgery groups (NeuroPoint, Atlantic Neurosurgical) and PE-backed spine platforms are recruiting at $850K-$1.3M + partnership. My subspecialty volume in [spine/cranial/peds/functional] would require 1-2 surgeons to replace given case complexity coverage. I also have expert witness work generating $Y supplemental.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA), call stipend of $Y per night, complex case stipend, service-line directorship admin time + stipend of $80K-$150K if applicable, and 7 protected days for CNS/AANS meetings.',
    walkAwayLine: 'I have written inquiries from [Atlantic Neurosurgical / Carolina Neurosurgery / NSO Spine] at partnership comp meaningfully above current. I\'ve built strong relationships with the OR team here — but the gap to market is too large to leave on the table.',
  },
  orthopedic_surgeon: {
    strongOpener: 'I want to discuss my compensation in the context of my subspecialty case volume. Last 24 months: [X total joints / Y arthroscopies / Z robotic / W spine if applicable]. Per MGMA Orthopedics 2026, 75th percentile [subspecialty] comp is $X.',
    leverageContext: 'Orthopedic surgery in extreme demand; replacement timeline 12-18 months. Single-specialty ortho groups (Rothman, OrthoVirginia, Resurgens) offer partnership at $700K-$1.1M + ASC distributions of $150K-$400K. My robotic case volume on [Mako/ROSA/Velys] supports the hospital\'s capital investment in robotics — defection would compromise that program.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA), call stipend of $Y per night, ASC participation if applicable, robotic case stipend, and 7 protected days for AAOS + subspecialty meeting with $7,500 CME budget.',
    walkAwayLine: 'I have ongoing conversations with [Rothman / Resurgens / regional ortho partnership] including ASC ownership. The orthopedic team here is excellent — but partnership economics elsewhere are 30-40% above current.',
  },
  cardiothoracic_surgeon: {
    strongOpener: 'I\'d like to align my compensation with my case volume and STS outcomes. Last 24 months: [X CABGs / Y valve / Z complex aortic / W transplant if applicable] with STS risk-adjusted outcomes [top-tier / 3-star]. Per MGMA CT Surgery 2026, 75th percentile is $X.',
    leverageContext: 'CT surgery supply is structurally constrained — small training pipeline (~120 grads/year nationally). Replacement timeline: 18-24 months. My complex aortic and [valve/transplant] volume cannot be backfilled without 1-2 surgeon recruitment. Mayo, Cleveland Clinic, and large academic programs actively recruit experienced CT surgeons at $750K-$1.1M + complex case stipends.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA), call stipend of $Y per night, complex case stipend (root replacement, hemiarch, complex valve), STS database administrative time, and 7 protected days for STS + AATS meetings with $10,000 CME budget.',
    walkAwayLine: 'I have ongoing dialogue with [Cleveland Clinic / Mass General / Houston Methodist / regional academic CT program]. The team here has been remarkable — but the total package gap is meaningful.',
  },
  psychiatrist: {
    strongOpener: 'I want to align my compensation with the 2026 psychiatry market. Per APA 2026, US psychiatry is in 5:1 demand-to-supply ratio; telepsychiatry platforms pay $300K-$400K full-time W2. My patient panel size and complexity (including [med management / addiction / forensic / child]) supports premium compensation.',
    leverageContext: 'Psychiatry replacement timeline: 6-12 months minimum. Talkiatry, Iris Telehealth, and Brightside are actively recruiting at $300K-$400K with full benefits and zero admin overhead. Direct-pay rates in this metro are $300-$500/45-min session. I can demonstrate concrete telepsychiatry offers and direct-pay practice projections within 30 days.',
    countersScript: 'I\'m asking for base of $X, panel size cap (no over-loading), explicit contract language permitting outside direct-pay or telepsychiatry work (4-8 hours/week), $5,000 CME budget, and 5 protected days for APA meeting + CME.',
    walkAwayLine: 'I have a written offer from [Talkiatry / Iris Telehealth / regional concierge psychiatry practice] at total comp above current with better work conditions. I\'d like to continue serving this patient panel — but the package needs to move.',
  },
  dermatologist: {
    strongOpener: 'I\'d like to discuss compensation in the context of my procedural mix and cosmetic case volume. Last 12 months: [X medical visits / Y biopsies / Z Mohs cases if applicable / W cosmetic procedures]. Per MGMA Dermatology 2026, 75th percentile is $X.',
    leverageContext: 'Dermatology in chronic national shortage; PE-backed platforms (Forefront, Schweiger, Anne Arundel, Epiphany) recruit aggressively at $450K-$650K + partnership track. Replacement timeline: 12-18 months. My cosmetic cash-pay volume supports practice margin above insurance reimbursement; loss of this volume would impact practice contribution materially.',
    countersScript: 'I\'m asking for base of $X (75th percentile MGMA) plus explicit cosmetic carve-out with personal billing for 1-2 days/week of cash-pay procedures, no employer revenue share on cosmetic, $5,000 CME budget, and 5 protected days for AAD + ASDS meetings.',
    walkAwayLine: 'I have ongoing dialogue with [Forefront Dermatology / Schweiger / regional PE-backed derm platform] at partnership comp meaningfully above current. The practice here has been good — but I need real movement.',
  },
};
