// industrial_engineering_actions.ts — v38.0 Phase 3
// 15 Industrial Engineering / Manufacturing / Supply Chain roles — Industry 4.0,
// robotics, and specialty chemicals are driving sustained demand across these disciplines.

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
  { title: 'Join 2 Active Industrial Engineering Professional Communities', description: 'Join the SMRP (Society for Maintenance & Reliability Professionals) LinkedIn community and the AME (Association for Manufacturing Excellence) local chapter. Senior reliability and continuous improvement professionals share open roles 30-60 days before public posting. Active participation in AME Lean kaizen events accelerates CMRP/Six Sigma credentialing by exposing you to real-world benchmarks. Attend at least one regional AME workshop this quarter.', layerFocus: 'L4 · Network', riskReductionPct: 13, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Personal Continuous Improvement Portfolio on LinkedIn', description: 'Document 3-5 measurable process improvement projects with before/after data: cycle time, OEE uplift, defect rate reduction, or cost savings. Recruiters at GE Vernova, Honeywell, Emerson, and Danaher search for Lean/Six Sigma practitioners with quantified impact. A LinkedIn portfolio showing "$2.3M annual savings via DMAIC-driven scrap reduction at XYZ Plant" generates 4-6 recruiter contacts per quarter in the industrial sector.', layerFocus: 'L3 · Visibility', riskReductionPct: 16, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue a High-Signal Certification (CMRP, CSSBB, or CPIM)', description: 'CMRP ($375 SMRP exam) adds $12K-$20K to median reliability engineer comp. Six Sigma Black Belt CSSBB ($439 ASQ exam) is the gateway to $125K+ CI manager roles at Caterpillar, 3M, and Illinois Tool Works. CPIM ($395 APICS exam, 2-part) is the gold standard for supply chain planning at $110K-$155K. Schedule the exam at registration to force the deadline and signal commitment to employers.', layerFocus: 'L3 · Skills', riskReductionPct: 21, deadline: '6 months — register now', priority: 'High' },
  { title: 'Connect with Industrial Hiring Managers via APICS and ASQ Events', description: 'APICS chapter meetings and ASQ section dinner events consistently attract operations managers and plant directors from Cummins, Parker Hannifin, ABB, and Bosch — all of which hire 20-50 industrial engineers annually in the US. Volunteering on an APICS chapter committee makes you visible to the exact decision-makers who control requisitions before HR posts them.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Audit Your LinkedIn for Industry-Specific Tools and Certifications', description: 'Recruiters in industrial/manufacturing search by tool (SAP PM, IBM Maximo, Minitab, Arena simulation, Siemens TIA Portal) and credential (CMRP, CSSBB, CPIM, PE stamp). Add every tool and certification you have hands-on experience with. This single update typically doubles recruiter outreach within 30 days from Siemens, Emerson, and GE Vernova talent acquisition teams.', layerFocus: 'L3 · Visibility', riskReductionPct: 11, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_INDUSTRIAL_ENGINEERING ──────────────────────────────────────────

export const ACTION_DB_INDUSTRIAL_ENGINEERING: Record<string, BracketPool> = {

  reliability_engineer: pool(
    { title: 'Earn the CMRP Certification and Add IBM Maximo/SAP PM Hands-On Experience', description: 'CMRP (Certified Maintenance & Reliability Professional, $375 SMRP exam) is the threshold credential for reliability engineers at Emerson, ABB, and Honeywell. Combine CMRP prep with hands-on time in a CMMS — IBM Maximo or SAP PM. Set up a free Maximo trial account and complete the IBM TS010 training module. CMRP holders earn $15K-$22K more than uncertified peers at the same experience level. Register today and target the exam in 90 days.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Earn the CRE (ASQ Certified Reliability Engineer) and Build an RCM Analysis Portfolio', description: 'CRE ($439 ASQ exam) is the senior-level reliability credential recognized by GE Vernova, Caterpillar, and Cummins — it adds $18K-$28K to total comp at mid-tier experience. Build a portfolio of 3 Reliability-Centered Maintenance (RCM) analyses using real or simulated equipment failure data. Use Weibull++ or ReliaSoft BlockSim (30-day trial) to demonstrate quantitative failure modeling. Senior reliability engineers with CRE + RCM portfolio earn $145K-$185K at top industrials.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Lead a Predictive Maintenance Pilot Using IIoT Sensors and PTC Windchill', description: 'Senior reliability engineers who can bridge CMMS data with IIoT predictive analytics (vibration analysis, oil sampling, thermography) are in acute demand across Parker Hannifin, Illinois Tool Works, and Danaher. Design and lead a 90-day PdM pilot: instrument 5-10 critical assets, integrate sensor data into PTC Windchill or SAP PM, and report Mean Time Between Failure (MTBF) improvement. A documented PdM pilot showing 20%+ MTBF improvement is a $25K-$40K salary lever.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  industrial_automation_engineer: pool(
    { title: 'Complete Siemens TIA Portal Certification and Build a PLC Demo Project', description: 'Siemens TIA Portal V18 proficiency is the threshold for 60% of US automation engineer postings at Siemens, ABB, Emerson, and Honeywell. Complete the free Siemens SITRAIN TIA Portal Basics course (8-12 hours) and build a demo PLC program (conveyor simulation or bottle-filling line) using TIA Portal S7-1500 simulator. Post the project on GitHub or LinkedIn. This portfolio piece generates direct recruiter outreach from automation-heavy manufacturers.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '60 days', priority: 'Critical' },
    { title: 'Earn Allen-Bradley/Rockwell ControlLogix Certification and SCADA Hands-On Experience', description: 'Allen-Bradley ControlLogix is the dominant PLC platform in US discrete manufacturing. Rockwell offers the Studio 5000 free trial for 90 days — build 2-3 ladder logic programs (PID loop, safety interlock, batch sequencer) and earn the Rockwell Automation Competency Certification ($200). Add FactoryTalk (SCADA) experience. Mid-level automation engineers at Caterpillar, Cummins, and Bosch with ControlLogix + SCADA earn $115K-$145K vs. $90K for PLC-only candidates.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Develop IIoT Integration Expertise: MQTT, OPC-UA, and Digital Twin Architecture', description: 'Industry 4.0 is creating a premium for automation engineers who can bridge OT (PLC/SCADA) with IT (cloud data platforms). Learn OPC-UA (open standard, free spec) and MQTT protocol, then build a demo digital twin integrating PLC simulator data into Azure IoT Hub or AWS IoT Core. Senior automation engineers at GE Vernova, Siemens, and ABB who own IT/OT integration earn $165K-$210K — a $40K-$60K premium over pure PLC programmers.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '120 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  cnc_machinist_programmer: pool(
    { title: 'Master Fanuc and Siemens 840D CNC Programming and Pursue a CAM Certification', description: 'Fanuc 0i/30i and Siemens SINUMERIK 840D are the two dominant CNC controls in US precision machining. Build a portfolio of 5-10 documented programs covering turning, milling, and 5-axis part families. Add CAM programming certification: Mastercam University Level 1 ($295) or Siemens NX CAM online training. CNC programmer-machinists with both G-code mastery and CAM software command $80K-$105K vs. $60K-$72K for G-code-only machinists.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Develop Multi-Axis and Swiss-Screw Programming Expertise for Precision Markets', description: '4-axis and 5-axis CNC programming for aerospace and medical precision components is the highest-demand and most layoff-resistant specialty. Seek exposure to simultaneous 5-axis machining (A+B or A+C axis moves, RTCP cycles) on Fanuc 31i or Siemens 840D. Mid-level 5-axis programmers at precision contract manufacturers (aerospace/medical/defense) earn $92K-$125K — virtually impossible to offshore or automate.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Pursue AS9100 or ISO 13485 First-Article Inspection Leadership Roles', description: 'Senior CNC machinist-programmers who own first-article inspection (FAI) and AS9100 (aerospace) or ISO 13485 (medical device) quality documentation are a $15K-$25K premium specialty. Volunteer to lead the next FAI at your current employer or take the Quality Systems Basics course (ASQ, free member access). This positions you as a quality-critical resource — the last person management cuts.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  chemical_engineer: pool(
    { title: 'Pursue the PE Stamp (Professional Engineer) for Chemical — Immediate Career Insurance', description: 'PE licensure (NCEES ChE PE exam, $350 application + $350 exam) adds $20K-$35K to mid-senior chemical engineer comp and creates near-absolute layoff protection at EPC firms and chemical manufacturers — PE-stamped designs cannot be signed by unlicensed staff. Study using the School of PE review course ($1,200) or Lindeburg\'s Chemical Engineering Reference Manual. Engineers in chemical, petroleum, and materials with the PE stamp earn $115K-$155K vs. $90K-$120K without.', layerFocus: 'L3 · Skills', riskReductionPct: 33, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Specialty Chemicals Process Expertise: Lithium-Ion, Specialty Polymers, or Semiconductors', description: 'General chemical plant experience is being automated; specialty process knowledge (lithium-ion battery materials, specialty polymer synthesis, semiconductor wet process) is in acute shortage. Volunteer for or transition to a specialty process project at your current employer. Mid-level chemical engineers at 3M (specialty materials), Honeywell (advanced materials), and Cabot (specialty chemicals) working in these niches earn $110K-$145K vs. $88K-$115K in commodity chemicals.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Develop Aspen Plus/HYSYS Process Simulation Expertise and Document a Design Case Study', description: 'Aspen Plus and Aspen HYSYS are the gold-standard process simulation tools used by BASF, Dow, ExxonMobil, and Honeywell UOP. Build and document a simulation case study — distillation column design, reactor optimization, or heat integration — using the AspenTech academic license (free for students) or a company seat. Senior process engineers with strong Aspen Plus capability earn $130K-$165K and are rarely laid off during restructuring.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  materials_engineer: pool(
    { title: 'Pursue ASM International Materials Characterization Certification and Build a Failure Analysis Portfolio', description: 'ASM International\'s Materials Characterization and Failure Analysis courses ($800-$1,200) provide the credentialing signal for senior materials roles at Boeing, Caterpillar, Alcoa, and defense primes. Build a portfolio of 3 documented failure analysis cases using SEM, EDS, or XRD methodology. Senior materials engineers with failure analysis expertise earn $110K-$155K — and are called in during crises, making them termination-resistant.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Develop Expertise in Advanced Materials: Composites, Additive Manufacturing, or Battery Materials', description: 'Carbon fiber composites (aerospace/EV), metal additive manufacturing (titanium for aerospace/medical), and next-gen battery cathode/anode materials are the highest-growth materials specialties. 3M, Hexcel, and Materion are hiring materials engineers with these specializations at $120K-$165K. Pursue the SAMPE (Society for the Advancement of Material and Process Engineering) conference and certification track for composites.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Add PTC Windchill PLM or Siemens Teamcenter Expertise for Product Development Roles', description: 'Materials engineers who also own PLM system configuration (PTC Windchill or Siemens Teamcenter for materials specifications, BOM management, and change control) earn 15-25% more than materials-only specialists. Complete the PTC Windchill free learning path and configure a sample BOM. This cross-functional skill makes you critical in NPI (new product introduction) environments at Parker Hannifin, Eaton, and Danaher.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  packaging_engineer: pool(
    { title: 'Earn ISTA or TAPPI Packaging Certification and Document Cost-Reduction Projects', description: 'ISTA (International Safe Transit Association) certification ($450 + testing) is the threshold credential for consumer goods and pharmaceutical packaging roles at Procter & Gamble, Honeywell, and 3M. Combine with TAPPI (corrugated/fiber) or SPC (sustainable packaging) training. Document 2-3 projects quantifying material savings (e.g., "reduced secondary packaging weight 18%, saving $1.4M/year"). Entry-level packaging engineers with ISTA certification start at $72K-$88K vs. $62K-$75K without.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '90 days', priority: 'Critical' },
    { title: 'Develop Sustainable Packaging Expertise: Life Cycle Assessment and Recyclability Standards', description: 'Sustainable packaging is the fastest-growing specialty in packaging engineering — driven by EU EPR regulations and US state-level extended producer responsibility laws. Learn LCA methodology (SimaPro or openLCA, both free trials) and the Sustainable Packaging Coalition\'s How2Recycle label system. Mid-level packaging engineers with sustainability expertise earn $95K-$128K at CPG and pharma companies, vs. $78K-$95K for traditional structural packaging.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '120 days', priority: 'Critical' },
    { title: 'Add Regulatory Expertise: FDA 21 CFR Part 11 or EU MDR for Pharmaceutical/Medical Packaging', description: 'Pharmaceutical and medical device packaging engineers with FDA 21 CFR Part 11 (electronic records) or EU MDR 2017/745 compliance expertise earn $108K-$145K — commanding a substantial premium over commodity packaging roles. Complete the RAPS (Regulatory Affairs Professionals Society) packaging regulation introductory module ($250). This specialty makes you termination-resistant in regulated industries.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  quality_systems_manager: pool(
    { title: 'Earn ASQ CSQE or CQM/OE and Lead the Next Major Customer Audit', description: 'ASQ CSQE (Certified Software Quality Engineer, $439) or CQM/OE (Certified Quality Manager/Organizational Excellence, $439) is the credential bar for senior QS manager roles at Bosch, Honeywell, and 3M. If your company has an upcoming ISO 9001, IATF 16949, or AS9100 surveillance audit, volunteer to lead the internal readiness review. Senior QS managers who own major audit outcomes earn $105K-$145K and are essentially irreplaceable during audit cycles.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Implement a Digital Quality Management System (QMS) Upgrade', description: 'Quality systems managers who lead transitions from paper-based or legacy QMS to modern digital platforms (MasterControl, Veeva Vault QMS, or ETQ Reliance) earn $20K-$30K more than peers. Propose and lead a QMS digitization project at your current employer — even a partial rollout of 3-5 quality modules. This portfolio piece differentiates you as a QS leader who drives systems transformation, not just compliance maintenance.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Add Statistical Process Control (SPC) and Minitab Expertise for Customer-Facing Roles', description: 'Quality managers with hands-on Minitab SPC capability (control charts, Cpk analysis, MSA/gauge R&R, DOE) are specifically sought by Tier 1 automotive and aerospace suppliers for customer-facing quality roles. The Minitab Statistical Analysis certification is $199 online. Add SPC charting for 5+ critical characteristics at your current plant and document the quality improvement results.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  continuous_improvement_manager: pool(
    { title: 'Earn Six Sigma Black Belt CSSBB and Lead a $500K+ DMAIC Project', description: 'ASQ CSSBB ($439 exam) is the gold-standard credential for CI manager roles at Caterpillar, Danaher, Illinois Tool Works, and GE Vernova — these companies explicitly require CSSBB or equivalent for CI manager hiring. Simultaneously lead a DMAIC project targeting $500K-$1M+ annual savings. Documented project results are the interview centerpiece: "led Black Belt project reducing casting scrap 32%, saving $820K annually." CSSBB-certified CI managers earn $118K-$155K.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop the Danaher Business System (DBS) or Honeywell Operating System (HOS) Vocabulary', description: 'The highest-paying CI manager roles are at Danaher ($135K-$175K) and Honeywell ($125K-$165K) — both have proprietary lean operating systems (DBS and HOS respectively) that mirror the Toyota Production System. Study DBS fundamentals via the Danaher public hiring case studies, and map your TPS/Lean experience to DBS language in your resume. Candidates who speak DBS/HOS fluently advance faster through the interview process.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Integrate Digital CI Tools: Arena Simulation Software and Power BI Dashboards', description: 'CI managers who add Arena or FlexSim discrete-event simulation capability can model process changes before implementation — eliminating the pilot cost that blocks many improvement projects. Arena offers a free student version; FlexSim has a 30-day trial. Combine with a Power BI dashboard showing real-time OEE and defect metrics for your facility. This digital CI skill earns $15K-$25K premium at Industry 4.0-forward manufacturers.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  industrial_safety_engineer_hse: pool(
    { title: 'Earn the NEBOSH IGC or CSP and Expand to Process Safety Management (PSM)', description: 'NEBOSH IGC ($1,200-$1,800 including coursework) is the internationally recognized HSE credential that opens roles at EPC firms, chemical plants, and multinational manufacturers. CSP (Certified Safety Professional, BCSP, $525 exam) is the US gold standard, adding $18K-$25K to mid-senior HSE comp at 3M, Honeywell, and Emerson. If your facility handles highly hazardous chemicals (HHC), add OSHA PSM 29 CFR 1910.119 expertise — PSM-qualified safety engineers are chronically short and earn a 15-20% premium.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Lead a High-Impact Safety Initiative: BBS or Machinery Safety (ANSI/OSHA 1910.212)', description: 'Safety engineers who lead Behavior-Based Safety (BBS) programs or machinery guarding risk assessment campaigns (aligned with ANSI B11 or OSHA 1910.212) create measurable OSHA recordable rate reductions that protect their role. Document the initiative: "led BBS rollout reducing TRIR 45% over 18 months at 800-person facility." This becomes the centerpiece of your candidacy for senior HSE manager roles at Caterpillar, Cummins, and Parker Hannifin.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Add ISO 45001 Internal Auditor Certification for International Employer Appeal', description: 'ISO 45001 Internal Auditor certification ($500-$800 via BSI or Bureau Veritas training) is increasingly required by global manufacturers (ABB, Siemens, Bosch, ABB) for senior HSE roles at facilities exporting to the EU. Combine with OSHA 30-hour (construction or general industry, $150-$200) for the complete credential package. Senior HSE engineers with ISO 45001 auditor status earn $108K-$148K.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  production_planning_manager: pool(
    { title: 'Earn CPIM (Certified in Planning and Inventory Management) and SAP PP Hands-On Experience', description: 'CPIM ($395 per part, 2-part APICS exam) is the gold-standard credential for production planning managers at Illinois Tool Works, Caterpillar, Parker Hannifin, and Cummins — companies where CPIM is often an explicit job requirement. Combine with SAP PP (Production Planning) module hands-on experience: request access to your company\'s SAP training environment or use the SAP ES5 developer trial. CPIM-certified production planners earn $105K-$140K vs. $85K-$108K without.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Lead an S&OP Process Improvement Initiative', description: 'Production planning managers who own and improve the Sales & Operations Planning (S&OP) cycle — integrating demand signals from sales, supply constraints from manufacturing, and financial targets — are irreplaceable during demand volatility. Propose and lead an S&OP maturity improvement project at your current employer. Document the outcome: "reduced inventory carrying cost $3.2M while improving on-time delivery from 87% to 96%." This is the bridge to director-level planning roles at $145K-$185K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '120 days', priority: 'Critical' },
    { title: 'Add Digital Planning Tools: Oracle SCM Cloud or Kinaxis RapidResponse', description: 'Production planning managers who can configure and run modern supply chain planning platforms (Oracle SCM Cloud, Kinaxis RapidResponse, or Blue Yonder Luminate) are 20-30% more valuable than ERP-only planners. Ask to join the implementation team if your company is upgrading planning software, or complete the Kinaxis RapidResponse free eLearning series. Senior planners with these platform skills earn $130K-$160K.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  demand_planner: pool(
    { title: 'Earn CPIM or IBF CPF and Build a Statistical Forecasting Portfolio', description: 'CPIM Part 1 ($395 APICS) covers demand management fundamentals. For forecasting specialists, IBF CPF (Certified Professional Forecaster, $495) is the dedicated credential. Build a portfolio of 3 forecasting case studies using statistical methods (ARIMA, exponential smoothing, regression) in Excel, Python, or SAP IBP. Senior demand planners who combine IBF CPF with ERP experience (SAP APO or SAP IBP) earn $110K-$145K at consumer goods and industrial companies.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop Machine Learning Forecasting Capability Using Python and dbt', description: 'AI-powered demand planning (using ML models vs. traditional statistical methods) is displacing traditional demand planners. Protect yourself by becoming the person who builds and validates the models. Complete the free Google Machine Learning Crash Course + the dbt Fundamentals certification (free). Build a demand forecasting model using open-source Prophet (Facebook) on a public retail dataset and publish it on GitHub. Demand planners with ML + dbt skills earn $125K-$155K vs. $90K-$115K for non-technical planners.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Lead a Forecast Accuracy Improvement Initiative with Documented Results', description: 'Demand planners who own Forecast Accuracy (FA) and Forecast Bias metrics with documented improvement projects are significantly more layoff-resistant than those operating in the status quo. Propose a 90-day forecast accuracy sprint: identify the 20 SKUs with highest forecast error, run root-cause analysis, and implement corrective actions. Target 5+ percentage point MAPE improvement. Document the project for portfolio and interview use.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  procurement_manager: pool(
    { title: 'Earn CPSM (Certified Professional in Supply Management) and Lead a Strategic Sourcing Project', description: 'CPSM ($895 ISM, 3-part exam) is the gold-standard procurement credential at Caterpillar, Parker Hannifin, Honeywell, and GE Vernova — it appears in 40%+ of senior procurement manager postings at F500 industrial companies and adds $18K-$28K to comp. Simultaneously lead a strategic sourcing project for a major spend category using the 7-step strategic sourcing methodology. Document the outcome: "reduced Category X spend 14% ($4.2M savings) via competitive RFP and dual-sourcing."', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop Supplier Risk Management Expertise: SRM Platforms and ESG Compliance', description: 'Post-COVID supply chain resilience focus means procurement managers with formal supplier risk management capability earn a 15-25% premium. Build expertise in SRM platforms (SAP Ariba Supplier Risk, Coupa, or Jaggaer) and ESG supply chain compliance (EU Deforestation Regulation, CBAM, Forced Labor Act). Senior procurement managers with SRM + ESG expertise earn $135K-$175K at global industrials vs. $105K-$135K for transactional procurement.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Add SAP Ariba or Coupa Proficiency for Digital Procurement Roles', description: 'Procurement managers who own e-sourcing and contract management platform configuration (SAP Ariba, Coupa, or Jaggaer) are the most sought-after candidates at companies undergoing P2P (procure-to-pay) digital transformation. Complete the free SAP Ariba eLearning series (SAP Learning Hub) and map your sourcing experience to Ariba workflows. This cross-functional skill commands a $15K-$25K premium at companies mid-transformation.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  category_manager_strategic: pool(
    { title: 'Build a 3-Category Portfolio with Documented TCO Savings and Supplier Consolidation Results', description: 'Strategic category managers are distinguished by a portfolio of owned categories with measurable Total Cost of Ownership (TCO) outcomes — not just price reductions. Document 3 categories in depth: spend baseline, supplier landscape, negotiation approach, savings realized, and supplier consolidation ratio. Senior category managers at 3M, Honeywell, and Illinois Tool Works with a strong multi-category portfolio earn $130K-$165K and are recruited directly by Chief Procurement Officers.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Earn CPSM + Advanced Negotiation Training (Scotwork or Karrass)', description: 'CPSM ($895 ISM) combined with a recognized negotiation program (Scotwork Negotiating Skills course $3,500-$4,500, or Karrass Effective Negotiating $795) is the credential stack for senior strategic category manager roles at major industrials. Category managers who can reference Scotwork-caliber negotiation training in interviews earn offers 10-18% higher than uncertified peers.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop Commodity Market Intelligence Expertise: LME Metals, Chemical Feedstocks, or Energy', description: 'Category managers who track and respond to commodity market movements (LME aluminum/copper, ethylene feedstock, natural gas) using Bloomberg Terminal (if available) or free alternatives (LME data, ICIS free reports) earn a $20K-$35K premium at manufacturing companies with significant raw material spend. Publish a commodity market analysis on LinkedIn quarterly to build a public track record of market insight.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  warehouse_operations_manager: pool(
    { title: 'Earn APICS CPIM and Lead a Warehouse Layout or Slotting Optimization Project', description: 'CPIM Part 1 ($395 APICS) is the credential for warehouse operations managers pursuing distribution center director roles at industrial distributors (Fastenal, Grainger, MSC Industrial). Simultaneously lead a warehouse slotting optimization project: ABC velocity analysis, pick-path optimization, and dock door assignment. Document the outcome in picks-per-hour improvement and labor cost reduction. Senior WH ops managers with documented optimization results earn $105K-$135K.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop WMS Expertise (Manhattan Associates, Blue Yonder, or SAP EWM)', description: 'Warehouse operations managers who own WMS configuration and user training earn 20-35% more than manual-process-only managers. Request access to your company\'s WMS configuration environment or complete the Manhattan Associates SCALE certification (free online). Senior WH managers with deep WMS expertise are specifically sought during 3PL (third-party logistics) provider transitions — a high-visibility career moment.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    { title: 'Add Lean Warehousing and 5S/Visual Management Credentials', description: 'Warehouse operations managers who implement and sustain 5S visual management systems with documented audit scores and lean material flow (supermarket replenishment, kanban) earn recognition that survives ownership changes and restructurings. Take the SME (Society of Manufacturing Engineers) Lean Bronze certification ($695) and create a photo/video portfolio of your warehouse 5S transformation. This positions you as a culture-carrier, not just an operations supervisor.', layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  environmental_engineer_industrial: pool(
    { title: 'Pursue PE (Environmental) Licensure and RCRA/Title V Air Permit Management Expertise', description: 'PE licensure (NCEES Environmental PE exam, $350 application + $350 exam) is the threshold credential for senior environmental engineering roles at major industrial manufacturers (3M, Honeywell, Cummins, Parker Hannifin) and EPC firms. Simultaneously develop hands-on expertise managing RCRA (hazardous waste), Title V air permits, or NPDES (water discharge) programs. Senior environmental engineers with PE stamp + permit management earn $105K-$145K vs. $80K-$105K without.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Develop ESG Reporting and Carbon Accounting Expertise: GHG Protocol and CDP Framework', description: 'Environmental engineers who can lead Scope 1/2/3 greenhouse gas inventory (GHG Protocol methodology) and manage CDP disclosure submissions are in acute demand across industrial manufacturers facing SEC climate disclosure requirements (effective 2026). Complete the free GHG Protocol e-Learning series and CDP preparatory training ($200). Mid-level environmental engineers with GHG/CDP expertise earn $100K-$135K and are being pulled into sustainability director pipelines.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Add HAZWOPER 40-Hour Certification and Chemical Release Response Planning Expertise', description: 'Environmental engineers with HAZWOPER 40-hour certification ($500-$800) and facility emergency response planning experience (EPCRA Section 302/304 reporting, SPCC Plan authorship) are irreplaceable during plant incidents and regulatory inspections. Volunteer to own the annual SPCC Plan review or lead the next emergency response tabletop exercise. This crisis-response positioning makes you the last person cut during cost reduction cycles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_INDUSTRIAL_ENGINEERING: Record<string, { canonicalKey: string; displayRole: string }> = {
  'reliability engineer': { canonicalKey: 'reliability_engineer', displayRole: 'Reliability Engineer' },
  'maintenance reliability engineer': { canonicalKey: 'reliability_engineer', displayRole: 'Maintenance & Reliability Engineer' },
  'plant reliability engineer': { canonicalKey: 'reliability_engineer', displayRole: 'Plant Reliability Engineer' },
  'cmrp engineer': { canonicalKey: 'reliability_engineer', displayRole: 'Reliability Engineer (CMRP)' },
  'industrial automation engineer': { canonicalKey: 'industrial_automation_engineer', displayRole: 'Industrial Automation Engineer' },
  'automation engineer': { canonicalKey: 'industrial_automation_engineer', displayRole: 'Automation Engineer' },
  'plc programmer': { canonicalKey: 'industrial_automation_engineer', displayRole: 'PLC Programmer' },
  'controls engineer': { canonicalKey: 'industrial_automation_engineer', displayRole: 'Controls Engineer' },
  'scada engineer': { canonicalKey: 'industrial_automation_engineer', displayRole: 'SCADA Engineer' },
  'cnc machinist programmer': { canonicalKey: 'cnc_machinist_programmer', displayRole: 'CNC Machinist / Programmer' },
  'cnc programmer': { canonicalKey: 'cnc_machinist_programmer', displayRole: 'CNC Programmer' },
  'cnc machinist': { canonicalKey: 'cnc_machinist_programmer', displayRole: 'CNC Machinist' },
  'cam programmer': { canonicalKey: 'cnc_machinist_programmer', displayRole: 'CAM Programmer' },
  'chemical engineer': { canonicalKey: 'chemical_engineer', displayRole: 'Chemical Engineer' },
  'process engineer chemical': { canonicalKey: 'chemical_engineer', displayRole: 'Chemical Process Engineer' },
  'process safety engineer': { canonicalKey: 'chemical_engineer', displayRole: 'Process Safety Engineer' },
  'petrochemical engineer': { canonicalKey: 'chemical_engineer', displayRole: 'Petrochemical Engineer' },
  'materials engineer': { canonicalKey: 'materials_engineer', displayRole: 'Materials Engineer' },
  'materials scientist': { canonicalKey: 'materials_engineer', displayRole: 'Materials Scientist' },
  'metallurgical engineer': { canonicalKey: 'materials_engineer', displayRole: 'Metallurgical Engineer' },
  'failure analysis engineer': { canonicalKey: 'materials_engineer', displayRole: 'Failure Analysis Engineer' },
  'packaging engineer': { canonicalKey: 'packaging_engineer', displayRole: 'Packaging Engineer' },
  'packaging development engineer': { canonicalKey: 'packaging_engineer', displayRole: 'Packaging Development Engineer' },
  'sustainable packaging engineer': { canonicalKey: 'packaging_engineer', displayRole: 'Sustainable Packaging Engineer' },
  'quality systems manager': { canonicalKey: 'quality_systems_manager', displayRole: 'Quality Systems Manager' },
  'quality manager': { canonicalKey: 'quality_systems_manager', displayRole: 'Quality Manager' },
  'qms manager': { canonicalKey: 'quality_systems_manager', displayRole: 'QMS Manager' },
  'quality engineer manager': { canonicalKey: 'quality_systems_manager', displayRole: 'Quality Engineering Manager' },
  'continuous improvement manager': { canonicalKey: 'continuous_improvement_manager', displayRole: 'Continuous Improvement Manager' },
  'lean manager': { canonicalKey: 'continuous_improvement_manager', displayRole: 'Lean Manager' },
  'six sigma black belt manager': { canonicalKey: 'continuous_improvement_manager', displayRole: 'Six Sigma Black Belt (Manager)' },
  'opex manager': { canonicalKey: 'continuous_improvement_manager', displayRole: 'Operational Excellence Manager' },
  'operational excellence manager': { canonicalKey: 'continuous_improvement_manager', displayRole: 'Operational Excellence Manager' },
  'industrial safety engineer': { canonicalKey: 'industrial_safety_engineer_hse', displayRole: 'Industrial Safety Engineer' },
  'hse engineer': { canonicalKey: 'industrial_safety_engineer_hse', displayRole: 'HSE Engineer' },
  'ehs engineer': { canonicalKey: 'industrial_safety_engineer_hse', displayRole: 'EHS Engineer' },
  'safety engineer': { canonicalKey: 'industrial_safety_engineer_hse', displayRole: 'Safety Engineer' },
  'production planning manager': { canonicalKey: 'production_planning_manager', displayRole: 'Production Planning Manager' },
  'manufacturing planning manager': { canonicalKey: 'production_planning_manager', displayRole: 'Manufacturing Planning Manager' },
  'master scheduler': { canonicalKey: 'production_planning_manager', displayRole: 'Master Scheduler' },
  'production scheduler': { canonicalKey: 'production_planning_manager', displayRole: 'Production Scheduler' },
  'demand planner': { canonicalKey: 'demand_planner', displayRole: 'Demand Planner' },
  'demand planning manager': { canonicalKey: 'demand_planner', displayRole: 'Demand Planning Manager' },
  'forecasting analyst': { canonicalKey: 'demand_planner', displayRole: 'Forecasting Analyst' },
  'supply planning analyst': { canonicalKey: 'demand_planner', displayRole: 'Supply Planning Analyst' },
  'procurement manager': { canonicalKey: 'procurement_manager', displayRole: 'Procurement Manager' },
  'sourcing manager': { canonicalKey: 'procurement_manager', displayRole: 'Sourcing Manager' },
  'supply chain manager': { canonicalKey: 'procurement_manager', displayRole: 'Supply Chain Manager' },
  'purchasing manager': { canonicalKey: 'procurement_manager', displayRole: 'Purchasing Manager' },
  'category manager': { canonicalKey: 'category_manager_strategic', displayRole: 'Category Manager' },
  'strategic category manager': { canonicalKey: 'category_manager_strategic', displayRole: 'Strategic Category Manager' },
  'strategic sourcing category manager': { canonicalKey: 'category_manager_strategic', displayRole: 'Strategic Sourcing Category Manager' },
  'commodity manager': { canonicalKey: 'category_manager_strategic', displayRole: 'Commodity Manager' },
  'warehouse operations manager': { canonicalKey: 'warehouse_operations_manager', displayRole: 'Warehouse Operations Manager' },
  'distribution center manager': { canonicalKey: 'warehouse_operations_manager', displayRole: 'Distribution Center Manager' },
  'dc manager': { canonicalKey: 'warehouse_operations_manager', displayRole: 'DC Manager' },
  'logistics manager': { canonicalKey: 'warehouse_operations_manager', displayRole: 'Logistics Manager' },
  'environmental engineer': { canonicalKey: 'environmental_engineer_industrial', displayRole: 'Environmental Engineer' },
  'environmental engineer industrial': { canonicalKey: 'environmental_engineer_industrial', displayRole: 'Industrial Environmental Engineer' },
  'ehs environmental engineer': { canonicalKey: 'environmental_engineer_industrial', displayRole: 'EHS Environmental Engineer' },
  'environmental compliance engineer': { canonicalKey: 'environmental_engineer_industrial', displayRole: 'Environmental Compliance Engineer' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_INDUSTRIAL_ENGINEERING: Record<string, string> = {
  reliability_engineer: 'reliability_engineer',
  industrial_automation_engineer: 'industrial_automation_engineer',
  cnc_machinist_programmer: 'cnc_machinist_programmer',
  chemical_engineer: 'chemical_engineer',
  materials_engineer: 'materials_engineer',
  packaging_engineer: 'packaging_engineer',
  quality_systems_manager: 'quality_systems_manager',
  continuous_improvement_manager: 'continuous_improvement_manager',
  industrial_safety_engineer_hse: 'industrial_safety_engineer_hse',
  production_planning_manager: 'production_planning_manager',
  demand_planner: 'demand_planner',
  procurement_manager: 'procurement_manager',
  category_manager_strategic: 'category_manager_strategic',
  warehouse_operations_manager: 'warehouse_operations_manager',
  environmental_engineer_industrial: 'environmental_engineer_industrial',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_INDUSTRIAL_ENGINEERING: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  reliability_engineer:              { roleKey: 'reliability_engineer',              roleName: 'Reliability Engineer',                  demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 55, yoyJobOpeningsChange: 16,  topHiringLocations: ['Houston TX', 'Detroit MI', 'Chicago IL', 'Charlotte NC', 'Greenville SC'],     aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Industry 4.0 PdM adoption driving reliability engineering demand; CMRP holders at 2:1 openings-to-candidates.' },
  industrial_automation_engineer:    { roleKey: 'industrial_automation_engineer',    roleName: 'Industrial Automation Engineer',        demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 68, yoyJobOpeningsChange: 28,  topHiringLocations: ['Detroit MI', 'Chicago IL', 'Charlotte NC', 'Columbus OH', 'Houston TX'],       aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Industry 4.0 and reshoring wave driving automation engineer demand; IIoT-capable engineers in acute shortage.' },
  cnc_machinist_programmer:          { roleKey: 'cnc_machinist_programmer',          roleName: 'CNC Machinist / Programmer',            demandIndex: 76, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 45, yoyJobOpeningsChange: 4,   topHiringLocations: ['Detroit MI', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Cleveland OH'],    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Skilled 5-axis CNC programmers in shortage; basic 2-3 axis facing wage pressure from CAM automation.' },
  chemical_engineer:                 { roleKey: 'chemical_engineer',                 roleName: 'Chemical Engineer',                    demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 52, yoyJobOpeningsChange: 12,  topHiringLocations: ['Houston TX', 'Midland MI', 'Wilmington DE', 'Baton Rouge LA', 'San Jose CA'],  aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1', calibrationNote: 'Specialty chemicals, battery materials, and semiconductor process demand rising; commodity chemical flat.' },
  materials_engineer:                { roleKey: 'materials_engineer',                roleName: 'Materials Engineer',                   demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 50, yoyJobOpeningsChange: 6,   topHiringLocations: ['Seattle WA', 'Detroit MI', 'Pittsburgh PA', 'Boston MA', 'San Jose CA'],       aiSubstitutionRisk: 0.13, dataQuarter: '2026-Q1', calibrationNote: 'Advanced materials (composites, additive, battery) strong; traditional metallurgy flat.' },
  packaging_engineer:                { roleKey: 'packaging_engineer',                roleName: 'Packaging Engineer',                   demandIndex: 68, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 40, yoyJobOpeningsChange: 3,   topHiringLocations: ['Cincinnati OH', 'Chicago IL', 'New York NY', 'Minneapolis MN', 'Atlanta GA'],  aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Sustainable packaging regulatory tailwind driving specialist demand; commodity packaging design softening.' },
  quality_systems_manager:           { roleKey: 'quality_systems_manager',           roleName: 'Quality Systems Manager',              demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 42, yoyJobOpeningsChange: 5,   topHiringLocations: ['Detroit MI', 'Chicago IL', 'Charlotte NC', 'Minneapolis MN', 'Raleigh NC'],    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Digital QMS adoption driving demand for systems-literate quality managers; traditional paper-QMS roles declining.' },
  continuous_improvement_manager:    { roleKey: 'continuous_improvement_manager',    roleName: 'Continuous Improvement Manager',       demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 48, yoyJobOpeningsChange: 10,  topHiringLocations: ['Detroit MI', 'Chicago IL', 'Charlotte NC', 'Columbus OH', 'Milwaukee WI'],     aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Danaher Business System and Honeywell Operating System models driving CI manager demand across industrials.' },
  industrial_safety_engineer_hse:    { roleKey: 'industrial_safety_engineer_hse',    roleName: 'Industrial Safety / HSE Engineer',     demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 38, yoyJobOpeningsChange: 4,   topHiringLocations: ['Houston TX', 'Chicago IL', 'Detroit MI', 'Pittsburgh PA', 'Baton Rouge LA'],   aiSubstitutionRisk: 0.11, dataQuarter: '2026-Q1', calibrationNote: 'OSHA enforcement consistency driving HSE demand; PSM-qualified engineers in shortage at chemical facilities.' },
  production_planning_manager:       { roleKey: 'production_planning_manager',       roleName: 'Production Planning Manager',          demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 40, yoyJobOpeningsChange: 3,   topHiringLocations: ['Detroit MI', 'Chicago IL', 'Columbus OH', 'Indianapolis IN', 'Nashville TN'],  aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1', calibrationNote: 'AI planning tools reducing head count at large manufacturers; S&OP-capable managers still valued.' },
  demand_planner:                    { roleKey: 'demand_planner',                    roleName: 'Demand Planner',                       demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 38, yoyJobOpeningsChange: 6,   topHiringLocations: ['Chicago IL', 'Atlanta GA', 'Dallas TX', 'Cincinnati OH', 'Minneapolis MN'],    aiSubstitutionRisk: 0.35, dataQuarter: '2026-Q1', calibrationNote: 'ML forecasting tools automating statistical work; planners who own model governance are protected.' },
  procurement_manager:               { roleKey: 'procurement_manager',               roleName: 'Procurement Manager',                  demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 45, yoyJobOpeningsChange: 8,   topHiringLocations: ['Chicago IL', 'Detroit MI', 'Houston TX', 'Atlanta GA', 'Minneapolis MN'],      aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1', calibrationNote: 'Supply chain resilience focus post-COVID driving strategic procurement hiring; tactical buyers declining.' },
  category_manager_strategic:        { roleKey: 'category_manager_strategic',        roleName: 'Strategic Category Manager',           demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 50, yoyJobOpeningsChange: 10,  topHiringLocations: ['Chicago IL', 'New York NY', 'Detroit MI', 'Houston TX', 'Minneapolis MN'],     aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1', calibrationNote: 'C-suite prioritization of procurement strategy driving category management demand; CPSM holders in shortage.' },
  warehouse_operations_manager:      { roleKey: 'warehouse_operations_manager',      roleName: 'Warehouse Operations Manager',         demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 35, yoyJobOpeningsChange: 2,   topHiringLocations: ['Chicago IL', 'Los Angeles CA', 'Dallas TX', 'Atlanta GA', 'Columbus OH'],      aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1', calibrationNote: 'Automation reducing headcount in large DCs; WMS-capable managers essential during automation transitions.' },
  environmental_engineer_industrial: { roleKey: 'environmental_engineer_industrial', roleName: 'Environmental Engineer (Industrial)',   demandIndex: 72, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 48, yoyJobOpeningsChange: 9,   topHiringLocations: ['Houston TX', 'Chicago IL', 'Pittsburgh PA', 'Baton Rouge LA', 'Charlotte NC'], aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'SEC climate disclosure and ESG reporting mandates driving environmental engineer demand at industrials.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_INDUSTRIAL_ENGINEERING: Record<string, Record<string, number>> = {
  reliability_engineer:              { '0-2': 72_000,  '2-5': 95_000,  '5-10': 125_000, '10-15': 155_000, '15+': 185_000 },
  industrial_automation_engineer:    { '0-2': 80_000,  '2-5': 108_000, '5-10': 145_000, '10-15': 178_000, '15+': 210_000 },
  cnc_machinist_programmer:          { '0-2': 52_000,  '2-5': 68_000,  '5-10': 88_000,  '10-15': 108_000, '15+': 125_000 },
  chemical_engineer:                 { '0-2': 78_000,  '2-5': 100_000, '5-10': 130_000, '10-15': 158_000, '15+': 180_000 },
  materials_engineer:                { '0-2': 72_000,  '2-5': 92_000,  '5-10': 118_000, '10-15': 145_000, '15+': 168_000 },
  packaging_engineer:                { '0-2': 62_000,  '2-5': 80_000,  '5-10': 102_000, '10-15': 125_000, '15+': 145_000 },
  quality_systems_manager:           { '0-2': 72_000,  '2-5': 92_000,  '5-10': 118_000, '10-15': 142_000, '15+': 165_000 },
  continuous_improvement_manager:    { '0-2': 82_000,  '2-5': 105_000, '5-10': 135_000, '10-15': 158_000, '15+': 175_000 },
  industrial_safety_engineer_hse:    { '0-2': 68_000,  '2-5': 88_000,  '5-10': 112_000, '10-15': 135_000, '15+': 155_000 },
  production_planning_manager:       { '0-2': 72_000,  '2-5': 92_000,  '5-10': 118_000, '10-15': 142_000, '15+': 162_000 },
  demand_planner:                    { '0-2': 65_000,  '2-5': 85_000,  '5-10': 108_000, '10-15': 132_000, '15+': 155_000 },
  procurement_manager:               { '0-2': 78_000,  '2-5': 100_000, '5-10': 132_000, '10-15': 160_000, '15+': 185_000 },
  category_manager_strategic:        { '0-2': 82_000,  '2-5': 105_000, '5-10': 135_000, '10-15': 162_000, '15+': 188_000 },
  warehouse_operations_manager:      { '0-2': 62_000,  '2-5': 78_000,  '5-10': 100_000, '10-15': 122_000, '15+': 140_000 },
  environmental_engineer_industrial: { '0-2': 65_000,  '2-5': 82_000,  '5-10': 108_000, '10-15': 132_000, '15+': 155_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_INDUSTRIAL_ENGINEERING: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  industrial_automation_engineer: {
    strongOpener: 'I want to discuss my compensation in the context of the automation engineer market in 2026. With my hands-on experience in [Siemens TIA Portal / Allen-Bradley ControlLogix / IIoT/OPC-UA integration] and [X projects delivered on time / Y uptime improvements / Industry 4.0 implementations], I\'m operating at the level of senior automation engineers commanding $160K-$200K+ in the market.',
    leverageContext: 'Per BLS and Burning Glass 2026 data, industrial automation engineers with IIoT integration capability are in a 3:1 demand-to-supply ratio. Siemens, ABB, and Emerson are offering $165K-$210K for senior engineers who can bridge PLC/SCADA with cloud data platforms. My specific contributions: [OPC-UA integration, TIA Portal projects, digital twin work]. Replacing me would take 4-6 months during critical production ramp.',
    countersScript: 'I\'m asking for $X base (75th percentile for senior automation engineers with IIoT capability), a training budget of $5K/year for Siemens SITRAIN and Rockwell certification renewals, and a documented path to lead engineer within 18 months.',
    walkAwayLine: 'I have approaches from [Siemens / Emerson / ABB] at substantially higher comp for roles requiring my TIA Portal and IIoT experience. I\'d strongly prefer to stay and continue the [specific program] but the market gap is significant.',
  },
  reliability_engineer: {
    strongOpener: 'I\'d like to discuss my compensation in light of my CMRP certification and the PdM program I\'ve led this year. Reliability engineers with demonstrated predictive maintenance capability are a premium specialty — the market rate for CMRP-certified mid-senior engineers is $120K-$155K.',
    leverageContext: 'My contributions this year: [MTBF improvement %, PdM pilot savings, IBM Maximo/SAP PM optimization]. The maintenance and reliability market is chronically short — SMRP 2026 data shows 2:1 unfilled openings-to-candidates for CMRP holders. Emerson, ABB, and Parker Hannifin are recruiting at $130K-$165K for engineers with my profile.',
    countersScript: 'I\'m asking for $X base (aligned with CMRP mid-senior market), SMRP annual membership and conference budget ($2K), and CMMS training budget for PTC Windchill / SAP PM advanced modules.',
    walkAwayLine: 'I have an inbound from [Parker Hannifin / Emerson / Honeywell] at $X above current. The work I\'ve built here — the PdM program, the CMMS optimization — I\'d prefer to see through, but I need market-rate comp.',
  },
  continuous_improvement_manager: {
    strongOpener: 'I want to discuss my compensation in the context of my CSSBB certification and the DMAIC project outcomes this year. CI managers with Black Belt credentials and documented $500K+ savings at Danaher, Caterpillar, and Illinois Tool Works earn $130K-$168K.',
    leverageContext: 'My measurable outcomes: [specific DMAIC project savings, OEE improvement, scrap reduction]. CSSBB-certified CI managers are in shortage at the 75th percentile experience level — AME data shows 8-week average time-to-fill for mid-senior CI roles. Replacing me mid-program would stall [specific improvement initiative] and lose the momentum built.',
    countersScript: 'I\'m asking for $X base (Danaher/Illinois Tool Works equivalent for CSSBB-certified mid-senior CI manager), ASQ annual membership and conference budget ($2.5K), and a structured path to CI director within 24 months.',
    walkAwayLine: 'I\'ve been approached by [Danaher / Illinois Tool Works / Honeywell] at $X for a CI manager role. I\'d prefer to see [current program] to completion here, but the gap needs to close.',
  },
  procurement_manager: {
    strongOpener: 'With my CPSM certification and the [Category X strategic sourcing project / $X million spend reduction / supplier consolidation] I led this year, I\'d like to align my comp with the senior procurement manager market. CPSM-certified managers at companies of our size earn $118K-$152K.',
    leverageContext: 'Supply chain resilience is a board-level priority — strategic procurement managers are being elevated across the industrial sector. My specific contributions: [sourcing savings, supplier risk mitigation, ESG compliance work]. ISM data shows senior procurement managers at the 75th percentile averaging $138K at industrial manufacturers of our revenue band. Replacing a CPSM-certified manager mid-category-cycle costs 3-4 months of strategic momentum.',
    countersScript: 'I\'m asking for $X base (ISM 75th percentile), CPSM recertification budget ($500), ISM annual membership, and a documented path to director of procurement within 24 months tied to [specific metric].',
    walkAwayLine: 'I have a conversation underway with [Caterpillar / Parker Hannifin / Illinois Tool Works] procurement team at meaningfully higher total comp. I\'d prefer to build the center of excellence here — but I need the gap addressed.',
  },
  chemical_engineer: {
    strongOpener: 'I\'d like to discuss my comp in the context of my PE licensure / specialty process expertise in [battery materials / specialty polymers / semiconductor wet process]. Senior chemical engineers with PE stamps and specialty process depth earn $125K-$162K at 3M, Honeywell, and Cabot.',
    leverageContext: 'PE-licensed chemical engineers are in acute shortage in specialty chemicals — replacing me would require 4-6 months and likely a $20K-$30K higher salary for a replacement. My contributions this year: [process yield improvement, safety incident reduction, Aspen Plus simulation work]. AIChE 2026 salary survey shows 75th-percentile ChE compensation at our experience level is $X.',
    countersScript: 'I\'m asking for $X base (75th percentile per AIChE survey for PE-licensed engineers at my experience level), AIChE membership and conference budget ($2K), and support for Aspen Plus training if not currently licensed.',
    walkAwayLine: 'I have a strong inbound from [Honeywell / 3M / BASF] at $X for a specialty process role in [my area of expertise]. The work here is meaningful — I need to see meaningful movement.',
  },
  category_manager_strategic: {
    strongOpener: 'I want to discuss my compensation reflecting the strategic category manager market. My ownership of [Category X, Y] with documented TCO savings of $X and supplier consolidation from Y to Z suppliers positions me at the senior level commanding $130K-$162K at industrial F500s.',
    leverageContext: 'Category managers who own multi-category portfolios with documented TCO outcomes are the most sought-after procurement profile at companies like Illinois Tool Works, Parker Hannifin, and Honeywell. ISM 2026 data shows senior strategic category managers at the 75th percentile earning $148K. My categories contribute $X million in annual spend — the strategic sourcing expertise I\'ve built is not quickly transferable.',
    countersScript: 'I\'m asking for $X base, a structured variable component tied to documented category savings, CPSM certification budget ($895) if not yet obtained, and Scotwork advanced negotiation training ($3,500) as a development investment.',
    walkAwayLine: 'I have a category director conversation underway at [Caterpillar / 3M / Danaher] at $X total comp. I\'d rather build the category management center of excellence here — I need to see the gap close.',
  },
  demand_planner: {
    strongOpener: 'I want to discuss my compensation in the context of my CPIM certification and the forecast accuracy improvements I\'ve delivered. Demand planners with ML forecasting capability and CPIM credentials earn $108K-$140K at consumer goods and industrial companies in 2026.',
    leverageContext: 'The demand planning market is bifurcating: traditional statistical planners face displacement from AI tools, while planners who own model governance and ML implementation are increasingly valuable. My contributions: [MAPE improvement, IBF CPF certification, Python/dbt work]. I represent the protected tier — I build and validate the forecasting models, not just run them.',
    countersScript: 'I\'m asking for $X base, APICS/IBF annual membership ($350), and training budget for advanced ML forecasting tools ($2K). I\'d also like a documented progression path to demand planning manager tied to [specific metric].',
    walkAwayLine: 'I\'ve been approached by [3M / Parker Hannifin / Illinois Tool Works] supply chain team at $X for a demand planning lead role. I\'d prefer to stay and continue the S&OP improvements here.',
  },
  industrial_safety_engineer_hse: {
    strongOpener: 'After [TRIR reduction achievement / PSM program completion / ISO 45001 certification], I\'d like to discuss aligning my comp with the CSP-certified HSE engineer market. CSP-certified safety engineers at chemical and heavy manufacturing facilities earn $108K-$145K.',
    leverageContext: 'My contributions this year: [OSHA recordable reduction %, TRIR at vs. industry average, BBS program launch, permit management milestones]. Safety engineers with CSP + NEBOSH or PSM expertise are in shortage at facilities with significant OSHA exposure — an incident during a gap in coverage would cost orders of magnitude more than a salary adjustment. Emerson, Honeywell, and Cummins are hiring at $110K-$148K for my credential profile.',
    countersScript: 'I\'m asking for $X base (75th percentile for CSP-certified mid-senior HSE at our facility type), BCSP recertification budget ($525), and ASSE/ASSP annual membership. I\'d also like support for the NEBOSH IGC if not yet obtained.',
    walkAwayLine: 'I have an inbound from [Honeywell / Cummins / Parker Hannifin] HSE team at $X. The programs I\'ve built here — [BBS, PSM, ISO 45001] — I\'d prefer to see to maturity, but I need the gap addressed.',
  },
  reliability_engineer_senior: {
    strongOpener: 'With CRE certification and my RCM analysis and PdM program track record, I\'d like to discuss aligning my comp with the senior reliability engineering market. CRE-certified senior engineers at Emerson, ABB, and Danaher earn $145K-$185K.',
    leverageContext: 'Senior reliability engineers who can design and implement predictive maintenance programs using vibration analysis, oil analysis, and thermography integrated with PTC Windchill or SAP PM are extremely scarce. My specific deliverables: [MTBF improvement, PdM pilot ROI, IBM Maximo configuration]. Losing this expertise mid-program would take 6+ months to replace at a higher market rate.',
    countersScript: 'I\'m asking for $X base (75th percentile CRE-certified senior reliability market), SMRP conference and membership budget ($2K), and protected time to complete the RCM analysis expansion to [next asset class].',
    walkAwayLine: 'I have a senior reliability engineer offer from [Parker Hannifin / Emerson / ABB] at $X. I\'d prefer to see the PdM program I\'ve built through its full implementation here.',
  },
};
