// biotech_healthcare_it_actions.ts — v38.0 Phase 1B
// 15 Biotech + Healthcare IT roles — biotech is in the highest-leverage AI-augmentation
// phase of its history (AlphaFold + Anthropic-class LLMs reshaping drug discovery), and
// healthcare IT roles (Epic + FHIR + RCM) remain chronically under-supplied as the
// 21st Century Cures Act and USCDI v3 mandate accelerates EHR interop nationwide.

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

const A_BIO_NETWORKING: BracketPool = pool(
  { title: 'Join 2 Active Biotech Communities (Bioinformatics.org + r/bioinformatics)', description: 'Sign up for Bioinformatics.org slack, the r/bioinformatics Reddit, and the Bioconductor support forum. Senior computational biologists and CGT scientists in these communities share unfilled role intel from Cambridge MA, San Diego, SSF, and RTP hubs 30-60 days before public posting. Active community participation also accelerates your transition into Anthropic-powered drug discovery workflows — peers will share their AlphaFold/RoseTTAFold prompt templates and reproducible Nextflow pipelines.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Reproducible Bioinformatics Portfolio on GitHub', description: 'Publish a public GitHub repo with 5+ reproducible analyses (single-cell scRNA-seq via Scanpy/Seurat, variant calling via GATK best-practices, CRISPR-Cas9 screen analysis via MAGeCK). Include Nextflow or Snakemake pipelines and Docker/Singularity containers — GxP-adjacent shops insist on it. Recruiters at Genentech, Moderna, Vertex, and Recursion scan GitHub for active practitioners with reproducible workflow discipline.', layerFocus: 'L3 · Visibility', riskReductionPct: 18, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue an Industry-Recognized Credential (SOCRA CCRP, RAC, or AWS HCLS)', description: 'For wet-lab pivots: SOCRA CCRP ($430) adds clinical-research credibility. For computational pivots: AWS Healthcare & Life Sciences certification or Coursera Genomic Data Science Specialization. For regulatory pivots: RAPS RAC ($725) is the gold-standard FDA/CTGTAB regulatory credential. Schedule the exam at registration to force the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '6 months — register now', priority: 'High' },
  { title: 'Register on the Bio-IT World, BioSpace, and FierceBiotech Talent Networks', description: 'Even passive profiles on Bio-IT World jobs, BioSpace, and FierceBiotech generate inbound recruiter contacts from VC-backed biotechs in Cambridge MA, San Diego, SSF, and RTP. Pre-IPO biotechs use these specialist networks far more than LinkedIn for niche bench/computational roles. A populated profile typically generates 4-6 specialist recruiter contacts per quarter.', layerFocus: 'L3 · Reputation', riskReductionPct: 16, deadline: '7 days', priority: 'Medium' },
  { title: 'Audit Your LinkedIn for Specific Platforms, Not Buzzwords', description: 'Biotech recruiters search by specific platform (Benchling, LabVantage LIMS, Cytobank, SpotFire, Veeva Vault, JMP, GraphPad). Healthcare IT recruiters search by Epic module (Resolute, OpTime, Ambulatory, Cogito, Caboodle), Cerner Millennium, MEDITECH, FHIR R4/R5, HL7 v2/v3. Add each tool you have hands-on experience with. Add an "Open to biotech / healthcare IT roles" signal so external recruiters can ping you — typically triples recruiter outreach within 30 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_BIOTECH_HEALTHCARE_IT ─────────────────────────────────────────

export const ACTION_DB_BIOTECH_HEALTHCARE_IT: Record<string, BracketPool> = {

  computational_biologist: pool(
    { title: 'Master AlphaFold + RoseTTAFold + Anthropic-Powered Structure Prediction', description: 'AlphaFold 3 (multi-chain complexes) and RoseTTAFold All-Atom redefined computational biology in 2024-2026. Pair them with Anthropic Claude for hypothesis generation and you become a 10x computational biologist. Build a public repo with 3 case studies: (1) protein-ligand binding prediction for a real target, (2) protein-protein complex modeling, (3) Anthropic Claude prompted hypothesis generation pipeline. This portfolio piece is the bridge to senior computational biology roles at $180K-$230K at Recursion, Insitro, Genesis Therapeutics, Isomorphic Labs.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Publish a Reproducible Drug Discovery Pipeline on GitHub', description: 'Publish a Nextflow or Snakemake pipeline combining AlphaFold predictions + molecular docking (AutoDock Vina, Glide) + ADMET prediction. Include a clean Anthropic API wrapper for literature triage. Senior computational biology hiring at Recursion, Schrodinger, Atomwise, Genesis Therapeutics specifically values demonstrated end-to-end pipeline ownership. Adds $25K-$45K to base offer.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to AI-Native Drug Discovery Companies', description: 'Recursion ($RXRX), Insitro, Isomorphic Labs (Alphabet), Atomwise, Genesis Therapeutics, Anthropic-collaborating biotechs are hiring senior computational biologists at $200K-$320K + equity. These companies are growing 40-80% YoY and aggressively recruiting. Apply within 14 days while the AI-drug-discovery hiring wave is at peak intensity.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  bioinformatics_scientist: pool(
    { title: 'Build ML-First Single-Cell Genomics Expertise (Scanpy + scVI + CellTypist)', description: 'Single-cell RNA-seq + ATAC-seq is the dominant data modality in modern biotech. ML-trained bioinformatics scientists (scVI, scANVI, CellTypist, Geneformer) earn $30K-$60K more than classical pipeline-only bioinformaticians. Publish a public reanalysis of the Tabula Sapiens or HCA datasets with proper batch correction, integration, and cell-type annotation. This portfolio piece converts a $140K bioinformatics scientist into a $180K-$240K ML-bioinformatics scientist.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    { title: 'Master CRISPR-Cas9 Screen Analysis (MAGeCK + DrugZ + Variants)', description: 'Pooled CRISPR-Cas9 screen analysis (knockout, CRISPRi, CRISPRa, base editing, prime editing) is essentially every modern biotech\'s core data type. Build a portfolio analysis of public DepMap / Project Achilles screens using MAGeCK, DrugZ, and CRISPhieRmix. Document the QC, gene essentiality, and pathway enrichment. Bioinformaticians fluent in CRISPR screen analysis are in extreme shortage — adds $25K-$40K to senior offers.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply to Senior Bioinformatics Roles at AI-First Biotechs', description: 'Recursion, Insitro, Tempus AI, Genomic Medicine Ireland, 10x Genomics, Illumina AI, BioMap are hiring senior ML-bioinformatics scientists at $200K-$280K. ML-trained bioinformatics is the highest-growth specialty in computational biology. Apply within 14 days while market conditions are at peak.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  cell_gene_therapy_specialist: pool(
    { title: 'Master Lentiviral / AAV Vector Manufacturing Process Development', description: 'Cell & gene therapy (CGT) manufacturing scale-up is the bottleneck for the entire industry — every approved CGT therapy ($1M+ list price) is gated on bioprocess capability. Hands-on experience with lentiviral vector production, AAV upstream/downstream, suspension HEK293, and Sf9-baculovirus systems is the most demanded skillset in 2026. Document your contributions on a redacted CV portfolio. CGT process development scientists earn $180K-$280K at Vertex, BMS Cell Therapy, Kite/Gilead, Novartis CGT, Sangamo, bluebird bio.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Earn ISCT or RAPS RAC for CGT Regulatory Path', description: 'ISCT membership + the FDA CTGTAB (Cellular and Gene Therapy Products) guidance documents are required reading. RAPS RAC ($725) is the regulatory affairs credential for CGT scientists pivoting to regulatory. Study the ICH Q5A/Q5B/Q5D and the FDA 21 CFR Part 1271 framework. Adds $30K-$50K to base offer at CGT-focused regulatory roles.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to CGT Manufacturing Roles at Cambridge MA, RTP, and SSF Hubs', description: 'Vertex (Boston), BMS Cell Therapy (Seattle/Devens), Kite/Gilead (LA), Novartis CGT (NJ/Morris Plains), Sangamo (Brisbane CA), bluebird bio (Cambridge MA), Lonza CGT (Houston/RTP), Catalent CGT (Bloomington IN) are hiring CGT manufacturing specialists at $180K-$280K. Demand-to-supply ratio is 6:1 for experienced CGT scientists. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  protein_engineer: pool(
    { title: 'Master AI-Driven Protein Design (RFdiffusion + ProteinMPNN + ESM-2)', description: 'AI-first protein design (RFdiffusion for de novo backbone generation, ProteinMPNN for sequence design, ESM-2 for variant prediction) is the new baseline for senior protein engineers in 2026. The Baker Lab tools + Meta ESM ecosystem are reshaping the field. Build a public portfolio with 3 designs: (1) de novo enzyme using RFdiffusion, (2) binder design for a real target, (3) library-scale design with ESM-2 variant scoring. This converts a $150K protein engineer into a $220K-$280K AI-protein-design specialist at Generate Biomedicines, Cradle, Profluent, Arzeda, Dyno Therapeutics.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '120 days', priority: 'Critical' },
    { title: 'Publish a Wet-Lab Validated Design Cycle', description: 'A "designed in silico → expressed → validated by SPR / DSF / functional assay" portfolio piece is the differentiator. Even one published validated design (e.g., on bioRxiv with raw data on Zenodo) generates $40K-$60K in offer premium. The companies hiring (Generate Biomedicines, Cradle, Adaptyv Bio) specifically value design-build-test-learn cycle ownership.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to AI-First Protein Engineering Scaleups', description: 'Generate Biomedicines (Cambridge MA), Cradle (Zurich/Amsterdam), Profluent AI (Berkeley), Arzeda (Seattle), Dyno Therapeutics (Boston), Nabla Bio, Outpace Bio are hiring AI-trained protein engineers at $200K-$280K + significant equity. Apply within 14 days while the AI-protein hiring wave is at peak.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  synthetic_biologist: pool(
    { title: 'Master Modern Strain Engineering (CRISPR-Cas9 + Cas12a + MAGE)', description: 'Modern strain engineering combines multiplex CRISPR (Cas9, Cas12a base editing, prime editing), MAGE, and machine-learning-guided design-build-test cycles. Document hands-on experience with at least 3 chassis organisms (E. coli, S. cerevisiae, P. pastoris, mammalian CHO). Tools like Inscripta, Twist Bioscience workflows, and Asimov Bio Design Studio are differentiating credentials. Senior synthetic biologists at Ginkgo Bioworks, Zymergen-equivalent, Asimov, Inscripta earn $160K-$240K.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Lead a Design-Build-Test-Learn Cycle for Portfolio', description: 'A documented end-to-end DBTL cycle (target → in-silico design → strain build → screening → validated improvement) is the senior synbio credential. Use Benchling for design, Twist for synthesis, and standard fermentation/analytics. Even a benchtop-scale cycle with clean data and reproducible methods is a portfolio differentiator that moves you from $140K bench synbio to $200K+ senior synbio role.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Apply to Industrial Biotech and Foundry Companies', description: 'Ginkgo Bioworks (Boston), Asimov Bio (Boston), Inscripta (Boulder), Amyris (Emeryville), Solugen (Houston), LanzaTech (Skokie), Conagen (Bedford MA), Antheia are hiring synthetic biologists at $160K-$240K. Foundry-style biotechs specifically value multi-chassis DBTL experience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  bioprocess_engineer: pool(
    { title: 'Master Single-Use Bioreactor Scale-Up + GxP Validation', description: 'Single-use bioreactor scale-up (Sartorius BIOSTAT, Cytiva Xcellerex, Thermo Fisher HyPerforma) for both mammalian and CGT applications is the highest-demand bioprocess skill in 2026. Hands-on scale-up from 2L → 50L → 500L → 2000L with PAT (process analytical technology) integration plus full GxP documentation (DQ/IQ/OQ/PQ + cleaning validation per ICH Q7/Q9/Q10) commands $180K-$260K at Lonza, Catalent, Samsung Biologics, Wuxi Biologics, Resilience.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '120 days', priority: 'Critical' },
    { title: 'Build a Process Development Portfolio Following ICH Q8/Q9/Q10/Q11', description: 'Document a complete process characterization following ICH Q8 (Quality by Design), Q9 (Risk Management), Q10 (Pharmaceutical Quality System), Q11 (Development & Manufacture). Include DOE-driven design space identification, control strategy, and process validation lifecycle (PV1/PV2/PV3). This portfolio is the differentiator for senior bioprocess roles at CDMOs.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '180 days', priority: 'High' },
    { title: 'Apply to CDMOs and CGT Manufacturers in Boston / RTP / Durham', description: 'Lonza (Visp/Houston/Portsmouth), Catalent (Bloomington/RTP), Samsung Biologics (Songdo/NJ), Wuxi Biologics (Wuxi/Worcester MA), Resilience (US-wide), FUJIFILM Diosynth (RTP/College Station), Thermo Fisher CDMO (Greenville NC) are hiring bioprocess engineers at $150K-$240K. The Boston-RTP-SSF triangle has 5:1 demand-to-supply.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  biostatistician: pool(
    { title: 'Master Bayesian Adaptive Clinical Trial Design + R + SAS', description: 'Bayesian adaptive trial design is the modern frontier (FDA Complex Innovative Designs program). Master rstanarm, brms, and the R/Stan ecosystem alongside SAS (still required for FDA submissions). Document a personal portfolio analysis of a public trial using both Bayesian and frequentist methods. Biostatisticians fluent in Bayesian methods + R/Stan + SAS earn $30K-$50K more than SAS-only practitioners.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Earn the Society for Clinical Trials Member Status + Publish a Methods Paper', description: 'Membership in the Society for Clinical Trials (SCT) and Drug Information Association (DIA), combined with at least one published methods paper or simulation study, is the credential bar for senior biostatistician roles. Submit a methods note to Statistics in Medicine, Biometrics, or Pharmaceutical Statistics. Adds $20K-$40K to senior offer.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Apply to Top-Tier CROs and Pharma Biostats Groups', description: 'IQVIA, Parexel, ICON, Labcorp Drug Development, PPD, Syneos Health, Veristat, Cytel are hiring senior biostatisticians at $160K-$230K. Pharma in-house biostats groups (Genentech, Pfizer, Novartis, Vertex, Bristol Myers Squibb) pay $180K-$260K. Apply within 14 days while late-cycle 2026 hiring is active.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  cro_project_manager: pool(
    { title: 'Earn the PMP + ACRP CCRC (or SOCRA CCRP) for Senior CRO PM Path', description: 'PMP ($555) + ACRP CCRC ($230) or SOCRA CCRP ($430) is the credential bar for senior CRO project managers. Documents both project-management discipline and ICH GCP fluency. Senior CRO PMs at IQVIA, Parexel, ICON, Labcorp earn $130K-$190K + bonus. Schedule both exams within 90 days.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in CGT or Rare Disease Trials', description: 'CGT trials and rare disease trials command 30-50% premium over standard Phase II/III oncology PMs. Document any CGT or rare disease experience prominently; pursue an ISCT membership or NORD partnership. Specialty PMs at Vertex, BMS Cell Therapy, Spark Therapeutics, Sarepta earn $160K-$220K base.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Pivot to Sponsor-Side Clinical Operations', description: 'Sponsor-side clinical operations (in-house at Pfizer, Genentech, Vertex, BMS, Moderna) pays $30K-$60K above CRO equivalents and has dramatically better stability. Apply within 14 days — sponsor-side clinical ops hiring is at sustained high volume for the 2027 trial pipeline.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  bench_scientist: pool(
    { title: 'Build a Multi-Modal Wet-Lab Skill Stack (Flow + Imaging + Omics + Functional)', description: 'The most resilient bench scientists in 2026 combine 4 modalities: flow cytometry (BD FACSymphony / Cytek Aurora full-spectrum), high-content imaging (Operetta/IncuCyte), -omics sample prep (10x Chromium, Visium, single-cell library prep), and functional assays (ELISA, MSD, SPR). Document hands-on expertise with at least 3 of the 4 on your CV with platform names. Adds $15K-$25K to senior bench offers and provides AI-substitution insulation.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '120 days', priority: 'Critical' },
    { title: 'Specialize in a High-Demand Wet-Lab Modality (CGT, Antibody, or Single-Cell)', description: 'Specialization is the differentiator: (1) CGT bench scientist — viral vector / cell engineering / potency assays, (2) antibody discovery — phage display / hybridoma / B-cell single-cell sequencing, (3) single-cell omics bench scientist. Senior specialized bench scientists earn $110K-$150K vs. $90K-$120K for generalists.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    { title: 'Pivot Toward Process Development or Translational Roles', description: 'Bench scientists who progress to process development (CMC bench) or translational science (bench + clinical) earn $20K-$40K more and have far higher career resilience than pure research bench roles. Apply to 3 process development or translational roles within 30 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '30 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  clinical_biostatistician: pool(
    { title: 'Master FDA Submission Statistics + CDISC SDTM/ADaM Standards', description: 'Clinical biostatisticians (sponsor- or CRO-side) require fluency in CDISC SDTM/ADaM standards, FDA submission statistics, and integrated summary of safety / efficacy (ISS/ISE). Earn the CDISC SDTM certification ($800) and the SAS Clinical Trials Programmer credential ($250). Adds $20K-$40K to base offer at sponsors and elite CROs.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Lead a Submission Package or Phase III SAP Authoring', description: 'A "led SAP authoring + dry-run analysis for Phase III pivotal study with FDA Type B meeting input" portfolio piece is the bridge to principal biostatistician roles at $230K-$300K. Negotiate ownership of the next pivotal SAP. If unavailable internally, apply to CRO sponsor-dedicated teams to access it externally.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Sponsor-Side Senior Biostats Roles', description: 'Genentech, Pfizer, Novartis, Vertex, BMS, Moderna, Regeneron, Eli Lilly hire senior clinical biostatisticians at $170K-$260K + bonus + RSU. The premium vs. CRO is $30K-$60K base + significant equity. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  epic_analyst: pool(
    { title: 'Earn Epic Resolute + Cogito + Caboodle for Revenue/Analytics Specialization', description: 'Stacked Epic certifications (Resolute Professional Billing + Hospital Billing, Cogito Fundamentals, Caboodle Data Model) command $130K-$170K vs. $95K-$115K for single-cert Ambulatory or OpTime analysts. The Resolute + Cogito + Caboodle stack is the highest-leverage Epic analyst path in 2026 because RCM optimization + analytics is the #1 health system priority. Schedule one cert per quarter — Epic only certifies through customer/partner channels.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build an Epic Hyperspace Customization Portfolio (SmartPhrases, BPAs, Reports)', description: 'Senior Epic analysts who own demonstrable customizations — clinical decision support BPAs, custom Cogito reports, Hyperspace personalization at scale — earn $20K-$35K more than build-only analysts. Document specific go-lives and adoption metrics on your CV. This portfolio is what differentiates a $115K Epic analyst from a $150K Epic application coordinator.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Apply to Health System Senior Analyst Roles or Epic Consulting Firms', description: 'Cleveland Clinic, Mass General Brigham, Kaiser, Sutter Health, Stanford Health, Ascension are hiring senior Epic analysts at $120K-$155K with stable health-system benefits. Epic consulting firms (Nordic Consulting, HCTec, Optimum Healthcare IT, Impact Advisors) pay $140K-$185K but require ~50% travel. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  clinical_informaticist: pool(
    { title: 'Earn AMIA Clinical Informatics Board Certification (or ABPM Subspecialty)', description: 'For MD/DO/PharmD/RN: AMIA Clinical Informatics Board Certification (CIBC) or ABPM Clinical Informatics subspecialty is the gold-standard credential. For non-clinical: AMIA Health Informatics Certification (AHIC) is the equivalent. Both add $25K-$45K to base offer at academic medical centers and health systems. AMIA also opens the path to CMIO / CNIO roles at $300K+.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Lead a Clinical Decision Support (CDS) or Quality Measure Implementation', description: 'A "led CDS implementation reducing X adverse events / Y% sepsis mortality / Z minutes time-to-treatment" portfolio piece is the bridge to CMIO/CNIO-track roles. Use established frameworks (CDS Five Rights, AHRQ CDS Connect) and document outcomes rigorously. This is the highest-leverage clinical informatics portfolio piece.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Academic Medical Center or Payer Informatics Roles', description: 'Academic medical centers (Mass General Brigham, Mayo Clinic, Cleveland Clinic, Johns Hopkins, Stanford Health) hire clinical informaticists at $150K-$230K + faculty appointment. Payer informatics (UnitedHealth Optum, Anthem Elevance, Humana, BCBS) pays $160K-$240K. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  fhir_engineer: pool(
    { title: 'Master FHIR R4/R5 + SMART on FHIR + USCDI v3 Implementation', description: 'FHIR R4 + R5 fluency, SMART on FHIR app launch, and USCDI v3 data class implementation are the credential trifecta in 2026. The 21st Century Cures Act and the ONC HTI-1 final rule mandate FHIR-based API access — every health system, payer, and EHR vendor is hiring. Build a public SMART on FHIR app (patient launch + provider launch) on GitHub. Adds $30K-$50K to base offer. FHIR engineers are surging in demand: $150K-$200K base for senior roles.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    { title: 'Earn the HL7 FHIR Implementer Certification + Publish on Open Source FHIR Servers', description: 'HL7 FHIR Foundational + Proficiency certifications ($500 combined) are the formal credential. Combine with active contributions to HAPI FHIR, Microsoft FHIR Server, or Google Cloud Healthcare API. Open-source FHIR contributions are 5x stronger hiring signals than certifications alone. Senior FHIR engineers at Epic, Cerner Oracle Health, Microsoft Health, AWS HealthLake, Google Cloud Healthcare, Particle Health, Health Gorilla earn $180K-$240K.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to Interop Vendor and Payer FHIR Engineer Roles', description: 'Particle Health, Health Gorilla, Redox, 1upHealth, CommonWell/Carequality, Datavant, Innovaccer are hiring FHIR engineers at $160K-$220K + equity. Payer FHIR (UnitedHealth Optum, Elevance, Humana) hires at $170K-$240K. Apply within 14 days — the post-Cures Act FHIR hiring wave is at peak intensity in 2026.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  healthcare_data_scientist: pool(
    { title: 'Master Healthcare-Specific Modeling (Sepsis, Readmission, Cost Prediction, NLP-on-Notes)', description: 'Healthcare data scientists with demonstrated production models for sepsis prediction, 30-day readmission, total cost of care, or clinical NLP on unstructured notes (using transformer models on MIMIC-IV or eICU data) earn $30K-$50K more than generalists. Build a public portfolio with 2 production-style models including fairness audit (using AIF360 or Fairlearn) and clinical-utility analysis (decision curve analysis).', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Publish a Healthcare ML Paper or Open-Source Healthcare Model', description: 'A peer-reviewed publication in JAMIA, NPJ Digital Medicine, or Nature Medicine — or an open-source healthcare model on Hugging Face — is the bridge to senior healthcare data scientist roles at $180K-$240K. Top hiring shops (Epic Cogito, Cerner Oracle Health AI, Tempus AI, Komodo Health, Innovaccer, Truveta) specifically recruit published healthcare ML practitioners.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Health Tech and Payer AI Teams', description: 'Tempus AI, Komodo Health, Truveta, Innovaccer, Verily, Flatiron Health, ConcertAI, Datavant are hiring senior healthcare data scientists at $180K-$240K. Payer AI teams (UnitedHealth Optum Labs, Elevance Carelon, Humana, CVS Aetna) hire at $170K-$230K. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),

  revenue_cycle_management_analyst: pool(
    { title: 'Pivot to Denials Management + Charge Capture Automation Specialization', description: 'Routine RCM coding is being automated by AI (3M 360 Encompass, AKASA, Notable Health). The protected, growing specialty is denials management + charge capture optimization. Earn the AAPC CPC ($499) or AHIMA CCS ($299), plus the HFMA Certified Revenue Cycle Representative (CRCR, $145). Senior denials specialists with AR-days expertise earn $85K-$120K vs. $60K-$80K for routine coders.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Master Epic Resolute + Healthcare Analytics for RCM Optimization Track', description: 'Epic Resolute Professional Billing + Hospital Billing certification, combined with SQL + Tableau / Power BI for RCM analytics, opens the path to senior RCM analyst ($100K-$140K) and RCM director ($140K-$200K). Document AR-days reduction, denial-rate improvement, and clean-claim-rate improvement on your CV.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to RCM SaaS Vendor Roles', description: 'RCM SaaS vendors (Waystar, R1 RCM, Change Healthcare/Optum, AKASA, Notable Health, Olive, Adonis) are growing 30-60% YoY and aggressively hiring RCM specialists at $95K-$140K + equity. Vendor-side roles have far better stability and pay than provider-side RCM. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_BIO_NETWORKING.senior.high[0], A_BIO_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_BIOTECH_HEALTHCARE_IT: Record<string, { canonicalKey: string; displayRole: string }> = {
  'computational biologist': { canonicalKey: 'computational_biologist', displayRole: 'Computational Biologist' },
  'comp bio': { canonicalKey: 'computational_biologist', displayRole: 'Computational Biologist' },
  'computational chemist': { canonicalKey: 'computational_biologist', displayRole: 'Computational Chemist' },
  'ai drug discovery scientist': { canonicalKey: 'computational_biologist', displayRole: 'AI Drug Discovery Scientist' },
  'bioinformatics scientist': { canonicalKey: 'bioinformatics_scientist', displayRole: 'Bioinformatics Scientist' },
  'bioinformatician': { canonicalKey: 'bioinformatics_scientist', displayRole: 'Bioinformatician' },
  'genomics scientist': { canonicalKey: 'bioinformatics_scientist', displayRole: 'Genomics Scientist' },
  'single cell genomics scientist': { canonicalKey: 'bioinformatics_scientist', displayRole: 'Single-Cell Genomics Scientist' },
  'cell and gene therapy specialist': { canonicalKey: 'cell_gene_therapy_specialist', displayRole: 'Cell & Gene Therapy Specialist' },
  'cgt specialist': { canonicalKey: 'cell_gene_therapy_specialist', displayRole: 'CGT Specialist' },
  'cgt scientist': { canonicalKey: 'cell_gene_therapy_specialist', displayRole: 'CGT Scientist' },
  'gene therapy scientist': { canonicalKey: 'cell_gene_therapy_specialist', displayRole: 'Gene Therapy Scientist' },
  'aav process scientist': { canonicalKey: 'cell_gene_therapy_specialist', displayRole: 'AAV Process Scientist' },
  'protein engineer': { canonicalKey: 'protein_engineer', displayRole: 'Protein Engineer' },
  'antibody engineer': { canonicalKey: 'protein_engineer', displayRole: 'Antibody Engineer' },
  'ai protein design scientist': { canonicalKey: 'protein_engineer', displayRole: 'AI Protein Design Scientist' },
  'computational protein scientist': { canonicalKey: 'protein_engineer', displayRole: 'Computational Protein Scientist' },
  'synthetic biologist': { canonicalKey: 'synthetic_biologist', displayRole: 'Synthetic Biologist' },
  'synbio scientist': { canonicalKey: 'synthetic_biologist', displayRole: 'SynBio Scientist' },
  'strain engineer': { canonicalKey: 'synthetic_biologist', displayRole: 'Strain Engineer' },
  'metabolic engineer': { canonicalKey: 'synthetic_biologist', displayRole: 'Metabolic Engineer' },
  'bioprocess engineer': { canonicalKey: 'bioprocess_engineer', displayRole: 'Bioprocess Engineer' },
  'process development scientist': { canonicalKey: 'bioprocess_engineer', displayRole: 'Process Development Scientist' },
  'upstream process engineer': { canonicalKey: 'bioprocess_engineer', displayRole: 'Upstream Process Engineer' },
  'downstream process engineer': { canonicalKey: 'bioprocess_engineer', displayRole: 'Downstream Process Engineer' },
  'fermentation scientist': { canonicalKey: 'bioprocess_engineer', displayRole: 'Fermentation Scientist' },
  'biostatistician': { canonicalKey: 'biostatistician', displayRole: 'Biostatistician' },
  'statistical scientist': { canonicalKey: 'biostatistician', displayRole: 'Statistical Scientist' },
  'bayesian statistician': { canonicalKey: 'biostatistician', displayRole: 'Bayesian Statistician' },
  'cro project manager': { canonicalKey: 'cro_project_manager', displayRole: 'CRO Project Manager' },
  'clinical project manager': { canonicalKey: 'cro_project_manager', displayRole: 'Clinical Project Manager' },
  'clinical operations manager': { canonicalKey: 'cro_project_manager', displayRole: 'Clinical Operations Manager' },
  'clinical trial manager': { canonicalKey: 'cro_project_manager', displayRole: 'Clinical Trial Manager' },
  'bench scientist': { canonicalKey: 'bench_scientist', displayRole: 'Bench Scientist' },
  'research associate biology': { canonicalKey: 'bench_scientist', displayRole: 'Research Associate (Biology)' },
  'wet lab scientist': { canonicalKey: 'bench_scientist', displayRole: 'Wet-Lab Scientist' },
  'in vitro scientist': { canonicalKey: 'bench_scientist', displayRole: 'In Vitro Scientist' },
  'clinical biostatistician': { canonicalKey: 'clinical_biostatistician', displayRole: 'Clinical Biostatistician' },
  'pivotal trial biostatistician': { canonicalKey: 'clinical_biostatistician', displayRole: 'Pivotal Trial Biostatistician' },
  'submission biostatistician': { canonicalKey: 'clinical_biostatistician', displayRole: 'Submission Biostatistician' },
  'epic analyst': { canonicalKey: 'epic_analyst', displayRole: 'Epic Analyst' },
  'epic application analyst': { canonicalKey: 'epic_analyst', displayRole: 'Epic Application Analyst' },
  'epic resolute analyst': { canonicalKey: 'epic_analyst', displayRole: 'Epic Resolute Analyst' },
  'epic cogito analyst': { canonicalKey: 'epic_analyst', displayRole: 'Epic Cogito Analyst' },
  'epic application coordinator': { canonicalKey: 'epic_analyst', displayRole: 'Epic Application Coordinator' },
  'clinical informaticist': { canonicalKey: 'clinical_informaticist', displayRole: 'Clinical Informaticist' },
  'clinical informatics specialist': { canonicalKey: 'clinical_informaticist', displayRole: 'Clinical Informatics Specialist' },
  'physician informaticist': { canonicalKey: 'clinical_informaticist', displayRole: 'Physician Informaticist' },
  'nursing informaticist': { canonicalKey: 'clinical_informaticist', displayRole: 'Nursing Informaticist' },
  'cmio': { canonicalKey: 'clinical_informaticist', displayRole: 'CMIO' },
  'fhir engineer': { canonicalKey: 'fhir_engineer', displayRole: 'FHIR Engineer' },
  'fhir developer': { canonicalKey: 'fhir_engineer', displayRole: 'FHIR Developer' },
  'healthcare interoperability engineer': { canonicalKey: 'fhir_engineer', displayRole: 'Healthcare Interoperability Engineer' },
  'hl7 engineer': { canonicalKey: 'fhir_engineer', displayRole: 'HL7 Engineer' },
  'smart on fhir developer': { canonicalKey: 'fhir_engineer', displayRole: 'SMART on FHIR Developer' },
  'healthcare data scientist': { canonicalKey: 'healthcare_data_scientist', displayRole: 'Healthcare Data Scientist' },
  'clinical data scientist': { canonicalKey: 'healthcare_data_scientist', displayRole: 'Clinical Data Scientist' },
  'health ml engineer': { canonicalKey: 'healthcare_data_scientist', displayRole: 'Health ML Engineer' },
  'medical ai scientist': { canonicalKey: 'healthcare_data_scientist', displayRole: 'Medical AI Scientist' },
  'revenue cycle management analyst': { canonicalKey: 'revenue_cycle_management_analyst', displayRole: 'Revenue Cycle Management Analyst' },
  'rcm analyst': { canonicalKey: 'revenue_cycle_management_analyst', displayRole: 'RCM Analyst' },
  'denials management analyst': { canonicalKey: 'revenue_cycle_management_analyst', displayRole: 'Denials Management Analyst' },
  'medical coder rcm': { canonicalKey: 'revenue_cycle_management_analyst', displayRole: 'Medical Coder (RCM Focus)' },
  'charge capture analyst': { canonicalKey: 'revenue_cycle_management_analyst', displayRole: 'Charge Capture Analyst' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_BIOTECH_HEALTHCARE_IT: Record<string, string> = {
  computational_biologist: 'computational_biologist',
  bioinformatics_scientist: 'bioinformatics_scientist',
  cell_gene_therapy_specialist: 'cell_gene_therapy_specialist',
  protein_engineer: 'protein_engineer',
  synthetic_biologist: 'synthetic_biologist',
  bioprocess_engineer: 'bioprocess_engineer',
  biostatistician: 'biostatistician',
  cro_project_manager: 'cro_project_manager',
  bench_scientist: 'bench_scientist',
  clinical_biostatistician: 'clinical_biostatistician',
  epic_analyst: 'epic_analyst',
  clinical_informaticist: 'clinical_informaticist',
  fhir_engineer: 'fhir_engineer',
  healthcare_data_scientist: 'healthcare_data_scientist',
  revenue_cycle_management_analyst: 'revenue_cycle_management_analyst',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_BIOTECH_HEALTHCARE_IT: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  computational_biologist:            { roleKey: 'computational_biologist',            roleName: 'Computational Biologist',             demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 78, yoyJobOpeningsChange: 32, topHiringLocations: ['Cambridge MA', 'San Diego CA', 'South San Francisco CA', 'RTP NC', 'Seattle WA'], aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'AlphaFold + Anthropic-powered drug discovery driving acute demand; AI augments rather than replaces.' },
  bioinformatics_scientist:           { roleKey: 'bioinformatics_scientist',           roleName: 'Bioinformatics Scientist',            demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 28, topHiringLocations: ['Cambridge MA', 'San Diego CA', 'South San Francisco CA', 'RTP NC', 'Boston MA'],   aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1', calibrationNote: 'ML-trained single-cell + CRISPR-screen bioinformaticians in extreme shortage.' },
  cell_gene_therapy_specialist:       { roleKey: 'cell_gene_therapy_specialist',       roleName: 'Cell & Gene Therapy Specialist',      demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95, yoyJobOpeningsChange: 38, topHiringLocations: ['Cambridge MA', 'Seattle WA', 'RTP NC', 'San Diego CA', 'Houston TX'],            aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'CGT manufacturing is the supply bottleneck of the industry; 6:1 demand-to-supply.' },
  protein_engineer:                   { roleKey: 'protein_engineer',                   roleName: 'Protein Engineer',                    demandIndex: 87, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 72, yoyJobOpeningsChange: 30, topHiringLocations: ['Cambridge MA', 'South San Francisco CA', 'San Diego CA', 'Seattle WA', 'Berkeley CA'],aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'RFdiffusion + ProteinMPNN + ESM-2 reshaping protein design; AI-trained engineers especially scarce.' },
  synthetic_biologist:                { roleKey: 'synthetic_biologist',                roleName: 'Synthetic Biologist',                 demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 60, yoyJobOpeningsChange: 18, topHiringLocations: ['Boston MA', 'Cambridge MA', 'Emeryville CA', 'Boulder CO', 'San Diego CA'],       aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Foundry biotechs and industrial biotech driving sustained hiring.' },
  bioprocess_engineer:                { roleKey: 'bioprocess_engineer',                roleName: 'Bioprocess Engineer',                 demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 88, yoyJobOpeningsChange: 34, topHiringLocations: ['RTP NC', 'Cambridge MA', 'Devens MA', 'Greenville NC', 'Houston TX'],             aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'CDMO + CGT manufacturing buildout (Lonza, Catalent, Resilience) driving severe shortage.' },
  biostatistician:                    { roleKey: 'biostatistician',                    roleName: 'Biostatistician',                     demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 62, yoyJobOpeningsChange: 16, topHiringLocations: ['Cambridge MA', 'South San Francisco CA', 'RTP NC', 'New York NY', 'Princeton NJ'],aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Bayesian adaptive design specialists in acute shortage; SAS+R+Stan combo commands premium.' },
  cro_project_manager:                { roleKey: 'cro_project_manager',                roleName: 'CRO Project Manager',                 demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 48, yoyJobOpeningsChange: 8,  topHiringLocations: ['RTP NC', 'Boston MA', 'Philadelphia PA', 'San Diego CA', 'Cambridge MA'],          aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'CGT and rare disease specialty PMs commanding 30-50% premium over generalists.' },
  bench_scientist:                    { roleKey: 'bench_scientist',                    roleName: 'Bench Scientist',                     demandIndex: 80, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 42, yoyJobOpeningsChange: 6,  topHiringLocations: ['Cambridge MA', 'South San Francisco CA', 'San Diego CA', 'RTP NC', 'Boston MA'],   aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'Wet-lab AI-resilience is highest in biotech; multi-modal specialists command premium.' },
  clinical_biostatistician:           { roleKey: 'clinical_biostatistician',           roleName: 'Clinical Biostatistician',            demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 70, yoyJobOpeningsChange: 20, topHiringLocations: ['Cambridge MA', 'South San Francisco CA', 'Princeton NJ', 'RTP NC', 'New York NY'],aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'CDISC SDTM/ADaM + FDA-submission biostatisticians in deep shortage at both sponsors and CROs.' },
  epic_analyst:                       { roleKey: 'epic_analyst',                       roleName: 'Epic Analyst',                        demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 48, yoyJobOpeningsChange: 10, topHiringLocations: ['Verona WI', 'Cleveland OH', 'Boston MA', 'Nashville TN', 'Madison WI'],           aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Resolute + Cogito + Caboodle stack persistently high demand; routine Ambulatory softer.' },
  clinical_informaticist:             { roleKey: 'clinical_informaticist',             roleName: 'Clinical Informaticist',              demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 14, topHiringLocations: ['Boston MA', 'Rochester MN', 'Cleveland OH', 'Baltimore MD', 'Palo Alto CA'],        aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'AMIA-certified clinical informaticists in shortage; CMIO/CNIO path commands $300K+.' },
  fhir_engineer:                      { roleKey: 'fhir_engineer',                      roleName: 'FHIR Engineer',                       demandIndex: 89, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 42, topHiringLocations: ['Verona WI', 'Kansas City MO', 'Boston MA', 'Seattle WA', 'San Francisco CA'],      aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Cures Act + ONC HTI-1 + USCDI v3 + TEFCA driving acute FHIR surge; salaries rising 20-25% YoY.' },
  healthcare_data_scientist:          { roleKey: 'healthcare_data_scientist',          roleName: 'Healthcare Data Scientist',           demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 58, yoyJobOpeningsChange: 24, topHiringLocations: ['Cambridge MA', 'Chicago IL', 'San Francisco CA', 'New York NY', 'Seattle WA'],     aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'Healthcare-specialized DS + clinical NLP in deep shortage at payers + health tech.' },
  revenue_cycle_management_analyst:   { roleKey: 'revenue_cycle_management_analyst',   roleName: 'Revenue Cycle Management Analyst',    demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'falling', salaryTrend: 'stable', timeToFillDays: 32, yoyJobOpeningsChange: -10,topHiringLocations: ['Nashville TN', 'Dallas TX', 'Atlanta GA', 'Phoenix AZ', 'Tampa FL'],               aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1', calibrationNote: 'AI coding automation (3M 360, AKASA, Notable) softening routine RCM; denials specialists protected.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_BIOTECH_HEALTHCARE_IT: Record<string, Record<string, number>> = {
  computational_biologist:            { '0-2': 115_000, '2-5': 150_000, '5-10': 185_000, '10-15': 215_000, '15+': 245_000 },
  bioinformatics_scientist:           { '0-2': 110_000, '2-5': 150_000, '5-10': 195_000, '10-15': 240_000, '15+': 285_000 },
  cell_gene_therapy_specialist:       { '0-2': 105_000, '2-5': 145_000, '5-10': 195_000, '10-15': 245_000, '15+': 290_000 },
  protein_engineer:                   { '0-2': 115_000, '2-5': 155_000, '5-10': 200_000, '10-15': 240_000, '15+': 275_000 },
  synthetic_biologist:                { '0-2': 95_000,  '2-5': 130_000, '5-10': 170_000, '10-15': 210_000, '15+': 250_000 },
  bioprocess_engineer:                { '0-2': 95_000,  '2-5': 130_000, '5-10': 170_000, '10-15': 215_000, '15+': 260_000 },
  biostatistician:                    { '0-2': 105_000, '2-5': 135_000, '5-10': 170_000, '10-15': 200_000, '15+': 230_000 },
  cro_project_manager:                { '0-2': 75_000,  '2-5': 105_000, '5-10': 138_000, '10-15': 168_000, '15+': 195_000 },
  bench_scientist:                    { '0-2': 70_000,  '2-5': 92_000,  '5-10': 115_000, '10-15': 138_000, '15+': 158_000 },
  clinical_biostatistician:           { '0-2': 115_000, '2-5': 148_000, '5-10': 185_000, '10-15': 220_000, '15+': 255_000 },
  epic_analyst:                       { '0-2': 78_000,  '2-5': 100_000, '5-10': 125_000, '10-15': 145_000, '15+': 162_000 },
  clinical_informaticist:             { '0-2': 95_000,  '2-5': 130_000, '5-10': 170_000, '10-15': 215_000, '15+': 260_000 },
  fhir_engineer:                      { '0-2': 105_000, '2-5': 140_000, '5-10': 175_000, '10-15': 205_000, '15+': 230_000 },
  healthcare_data_scientist:          { '0-2': 110_000, '2-5': 142_000, '5-10': 175_000, '10-15': 205_000, '15+': 235_000 },
  revenue_cycle_management_analyst:   { '0-2': 55_000,  '2-5': 72_000,  '5-10': 92_000,  '10-15': 112_000, '15+': 128_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_BIOTECH_HEALTHCARE_IT: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  computational_biologist: {
    strongOpener: 'I\'d like to discuss aligning my compensation with the 2026 computational biology market, particularly given the acute demand from AI-native drug discovery companies. With my AlphaFold / RoseTTAFold + Anthropic-powered pipeline experience and [X published / Y validated targets / Z internal program contributions], I\'m operating at the senior comp-bio level.',
    leverageContext: 'Senior computational biologists with AI-driven drug discovery experience are in 4:1 demand-to-supply (Bio-IT World 2026 workforce report). Recursion, Insitro, Isomorphic Labs, Genesis Therapeutics, Atomwise are recruiting at $200K-$320K + meaningful equity. Replacement cost: 6+ months minimum for someone who can own the AlphaFold + ADMET + docking pipeline end-to-end.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile for senior comp-bio at AI-native biotechs), an equity refresh to align with peers, and conference + compute budget ($10K/year for AWS/GCP credits + NeurIPS/RECOMB attendance). If full base adjustment isn\'t feasible this cycle, I\'ll accept a meaningful equity refresh plus a 6-month review.',
    walkAwayLine: 'I have approaches from [Recursion / Insitro / Isomorphic Labs] at substantially higher total comp. I\'d prefer to continue the program here — but the gap to market is meaningful and I need to see real movement.',
  },
  bioinformatics_scientist: {
    strongOpener: 'I want to align my compensation with the ML-bioinformatics market. With my single-cell genomics + CRISPR screen analysis + reproducible Nextflow pipeline experience, I\'m operating at the senior ML-bioinformatics level which commands $200K+ at AI-first biotechs.',
    leverageContext: 'ML-trained bioinformatics scientists (scVI / Geneformer / CellTypist + MAGeCK + DrugZ) are in extreme shortage. Recursion, Insitro, Tempus AI, BioMap, 10x Genomics, Illumina AI are hiring at $200K-$280K. Replacement cost: 4-6 months for someone who owns both the single-cell and CRISPR-screen analytical stack.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile for senior ML-bioinformatics), an equity refresh, and protected time + budget for open-source contributions (Bioconductor, Scanpy, scVI ecosystem).',
    walkAwayLine: 'I have an inbound from [Recursion / Insitro / Tempus AI / Illumina AI] at meaningfully higher comp. I\'d prefer to find a way to stay — but the gap needs to close.',
  },
  cell_gene_therapy_specialist: {
    strongOpener: 'CGT specialists are in 6:1 demand-to-supply ratio per the ARM 2026 workforce report. I want to align my compensation with that scarcity, given my hands-on lentiviral / AAV / suspension HEK293 process development experience.',
    leverageContext: 'Replacement cost for a CGT specialist with proven vector manufacturing experience: 6-9 months. My contributions: [specific process improvements / titer increases / GxP documentation / IND-enabling work]. Vertex, BMS Cell Therapy, Kite/Gilead, Novartis CGT, Lonza CGT, Catalent CGT are recruiting at $200K-$300K + significant equity.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile CGT scientist comp), retention RSU grant of $Y, on-call differential for manufacturing batches, and SANS-equivalent training budget for ICH Q5A/Q5B and CTGTAB compliance courses.',
    walkAwayLine: 'I have a strong inbound from [Vertex / BMS Cell Therapy / Lonza CGT / Catalent CGT] at substantially higher comp. The work here has been excellent — but I need to see meaningful movement.',
  },
  protein_engineer: {
    strongOpener: 'I\'d like to discuss my compensation given the explosion in demand for AI-trained protein engineers. With my RFdiffusion + ProteinMPNN + ESM-2 + wet-lab validation experience, I\'m operating at the level commanding $220K+ in the market.',
    leverageContext: 'AI-trained protein engineers with design-build-test-learn cycle ownership are sub-1,000 globally. My specific track record: [validated designs, expression results, functional assay data]. Generate Biomedicines, Cradle, Profluent AI, Arzeda, Dyno Therapeutics, Nabla Bio are hiring at $220K-$280K + significant equity.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile for AI-trained protein engineers), an equity refresh, GPU compute budget ($15K/year for AlphaFold / RFdiffusion inference), and conference budget (RECOMB, MoML, NeurIPS).',
    walkAwayLine: 'I have approaches from [Generate Biomedicines / Cradle / Profluent AI] at meaningfully higher comp. The work here is important — but the gap to market is real.',
  },
  bioprocess_engineer: {
    strongOpener: 'Bioprocess engineers with single-use scale-up + GxP validation + CGT or mAb experience are in 5:1 demand-to-supply per BIO 2026. I want to align my compensation with that market.',
    leverageContext: 'My hands-on scale-up experience [from 2L → 2000L / specific platforms / specific PV outcomes] is the core capability of every CDMO and CGT manufacturer right now. Lonza, Catalent, Samsung Biologics, Resilience, FUJIFILM Diosynth are hiring at $180K-$260K + on-call differential.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile for senior bioprocess), on-call manufacturing differential of Y%, and ISPE / PDA training budget for GxP recertification.',
    walkAwayLine: 'I have inbound from [Lonza / Catalent / Resilience] at meaningfully higher comp. I\'d like to continue the work here — but I need market-rate compensation.',
  },
  clinical_biostatistician: {
    strongOpener: 'After [authoring SAP for X pivotal trials / leading ISS/ISE for Y submissions / managing CDISC SDTM/ADaM deliverables], I want to align my compensation with the senior clinical biostatistics market.',
    leverageContext: 'Clinical biostatisticians with CDISC fluency + FDA submission experience are in deep shortage at both sponsors and elite CROs. My contributions: [specific submissions, FDA interactions, methods leadership]. Genentech, Pfizer, Vertex, BMS, Moderna pay $200K-$280K + RSU for senior clinical biostatisticians.',
    countersScript: 'I\'m asking for $X base (matches sponsor 75th percentile), bonus target of Y%, RSU refresh, and protected time for methods development (15%).',
    walkAwayLine: 'I have approaches from [Genentech / Pfizer / Vertex] at substantially higher comp. The work here has been excellent — I\'d like to stay, but the gap needs to close.',
  },
  fhir_engineer: {
    strongOpener: 'FHIR engineer demand is in a 4:1 supply gap driven by 21st Century Cures Act + ONC HTI-1 + USCDI v3 + TEFCA. With my SMART on FHIR + R4/R5 + open-source FHIR contributions, I\'m at the senior level commanding $180K-$220K in the market.',
    leverageContext: 'My specific contributions: [SMART on FHIR apps / HAPI FHIR open-source PRs / production FHIR API throughput / USCDI v3 implementation]. Epic, Cerner Oracle Health, Microsoft Health, AWS HealthLake, Particle Health, Health Gorilla, Redox, 1upHealth are hiring at $170K-$240K.',
    countersScript: 'I\'m asking for $X base (matches senior FHIR engineer 75th percentile), an equity refresh aligned with peers, and conference budget (HL7 FHIR DevDays, HIMSS, ONC).',
    walkAwayLine: 'I have an offer from [Particle Health / Health Gorilla / Redox / Microsoft Health] at substantially higher comp. The mission here is important to me — but I need market-rate compensation.',
  },
  clinical_informaticist: {
    strongOpener: 'After leading [X CDS implementations / quality measure programs / Epic optimization initiatives], I want to align my compensation with the senior clinical informatics market, particularly given my AMIA certification.',
    leverageContext: 'Clinical informaticists with AMIA board certification + demonstrated CDS outcomes are in chronic shortage at AMCs. My specific outcomes: [sepsis mortality reduction / readmission rate improvement / time-to-treatment metrics]. Mass General Brigham, Mayo Clinic, Cleveland Clinic, Johns Hopkins, UnitedHealth Optum Labs pay $170K-$260K + faculty appointments.',
    countersScript: 'I\'m asking for $X base (matches AMC senior informaticist + clinical FTE), faculty appointment, protected research time (20%), and academic publication / conference budget.',
    walkAwayLine: 'I have an inbound from [Mass General Brigham / Mayo Clinic / UnitedHealth Optum Labs] at substantially higher comp + protected academic time. I\'d prefer to continue the work here.',
  },
  healthcare_data_scientist: {
    strongOpener: 'I want to align my compensation with the senior healthcare data science market. With my MIMIC-IV NLP + clinical fairness audit + production model experience, I\'m operating at the senior healthcare DS level commanding $190K+ in the market.',
    leverageContext: 'Healthcare-specialized DS with production sepsis / readmission / cost prediction models + clinical NLP are in 3:1 demand-to-supply. My contributions: [specific models in production, AUC / clinical utility outcomes, fairness audits]. Tempus AI, Komodo Health, Truveta, Innovaccer, Verily, Flatiron, Optum Labs are hiring at $190K-$240K.',
    countersScript: 'I\'m asking for $X base (matches healthcare DS 75th percentile), an equity refresh, GPU compute budget, and protected publication time (10-15%).',
    walkAwayLine: 'I have an offer from [Tempus AI / Komodo Health / Truveta / Verily] at substantially higher total comp. I\'d like to find a way to stay — but the gap is meaningful.',
  },
  epic_analyst: {
    strongOpener: 'After earning my Resolute + Cogito + Caboodle certifications and leading [X go-lives / Y optimization projects / Z analytics dashboards], I want to align my compensation with the senior Epic analyst market.',
    leverageContext: 'Senior Epic analysts with the Resolute + Cogito + Caboodle stack are in chronic shortage — health systems are paying $130K-$170K and consulting firms (Nordic, HCTec, Optimum, Impact Advisors) are paying $150K-$185K with project bonuses. My specific outcomes: [specific dashboards / RCM optimization metrics / clinical adoption metrics].',
    countersScript: 'I\'m asking for $X base (matches senior Epic analyst 75th percentile), retention bonus to offset consulting market gap, and Epic certification budget to add the next cert (e.g., Tapestry / Beacon / Willow).',
    walkAwayLine: 'I have offers from [Nordic Consulting / HCTec / Optimum Healthcare IT] at $X above current with project bonuses. I\'d prefer to stay with the health system — but I need to see meaningful movement.',
  },
};
