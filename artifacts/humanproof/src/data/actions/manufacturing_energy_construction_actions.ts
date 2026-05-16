// manufacturing_energy_construction_actions.ts — v37.0 Multi-Industry Role Intelligence
// Phase 3: Manufacturing/Operations (15 roles) + Energy/Infrastructure (10 roles) + Construction/Civil (10 roles)

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

export const ACTION_DB_MANUFACTURING_ENERGY_CONSTRUCTION: Record<string, BracketPool> = {

  // ── MANUFACTURING & OPERATIONS ────────────────────────────────────────────

  manufacturing_engineer: pool(
    {
      title: 'Earn Six Sigma Green Belt Certification to Move Beyond Process Execution',
      description: 'Manufacturing engineers with Six Sigma Green Belt (ASQ, $438 or IASSC, $395) demonstrate process improvement capability beyond execution-level work. Green Belts lead projects reducing defect rates and production costs. Engineers with Six Sigma credentials earn 15–25% more and face lower displacement risk than pure execution engineers. Complete the ASQ Green Belt study guide (free) and register for the next exam. Time investment: 80–100 hours prep.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Lead an Automation or Robotics Integration Project for Internal Visibility',
      description: 'Manufacturing engineers who lead automation projects (collaborative robot integration, PLC programming, AGV deployment) transition from displacement risk to automation implementation value. Pitch an automation initiative to your plant manager: identify one manual process with 15+ repetitions/hour and propose cobot integration (Universal Robots UR5e: ~$35,000, ROI < 18 months). Engineers who implement automation are not displaced by it.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '21 days — pitch', priority: 'Critical',
    },
    {
      title: 'Pursue a Manufacturing Engineering Manager or Plant Engineering Director Role',
      description: 'Senior manufacturing engineers who transition into Engineering Manager or Plant Engineering Director roles gain institutional protection through team dependency and cross-functional scope. Engineers managing teams of 5+ are reclassified as organizational assets. Apply to 3 engineering management roles at tier-1 automotive suppliers, aerospace primes, or consumer goods manufacturers this week.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Complete PLC Programming Certification (Siemens TIA Portal or Allen-Bradley RSLogix)',
      description: 'PLC (Programmable Logic Controller) programming skills in Siemens TIA Portal or Allen-Bradley Studio 5000 are the single most sought-after technical skills in manufacturing automation. Siemens TIA Portal training: $500–$800 at local technical colleges. Engineers with PLC skills earn $15,000–$30,000/year more and receive far more recruiter interest across automotive, food & beverage, and pharmaceutical manufacturing.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Join AME (Association for Manufacturing Excellence) for Job Market Connections',
      description: 'AME membership ($175/year) provides access to the largest lean manufacturing professional community in North America, including regional job boards and peer referrals. AME plant tours and workshops create warm relationships with manufacturing leaders at other facilities — the most common source of senior manufacturing engineering opportunities.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  operations_manager: pool(
    {
      title: 'Document Cost Savings and Operational KPI Improvements for Negotiation Leverage',
      description: 'Operations managers who cannot quantify their impact (cost per unit reduced X%, throughput increased Y%, OEE improved Z%) face budget pressure as overhead. Build your impact summary this week: (1) operational cost savings since joining, (2) quality improvement metrics, (3) productivity gains, (4) safety record improvements. Present this as a P&L contribution. Operations managers who own business outcomes earn 20–30% more than those who manage processes.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Pursue Operations Director or VP Operations Role at a Competitor or Larger Plant',
      description: 'Operations managers with documented KPI improvements are highly sought by competitors at larger facilities paying 25–40% more. Apply to VP Operations roles (reporting to COO/CEO) at companies with $50M–$500M in manufacturing revenue. LinkedIn, Indeed, and industry associations (APICS, AME) list these positions. A lateral move to a larger operation is the fastest compensation multiplier for operations managers.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn APICS CSCP or CPIM Certification for Supply Chain Leadership Access',
      description: 'APICS CSCP (Certified Supply Chain Professional, $1,395) or CPIM (Certified in Planning and Inventory Management, $695 per part) credentials open Director of Operations and Supply Chain roles that are systematically more protected and better compensated. CSCP is the highest-value certification for operations managers targeting broader supply chain leadership.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Lead a Lean Manufacturing Kaizen Event to Demonstrate Continuous Improvement',
      description: 'Operations managers who run structured Kaizen events (1–5 day rapid improvement workshops) generate measurable operational gains and demonstrate leadership beyond daily management. Plan a Kaizen event on your highest-waste process (changeover time, defect rate, material handling). Document the before/after results — these become your negotiation and promotion portfolio.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 25, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build Cross-Functional Relationships with Finance and Engineering to Become Indispensable',
      description: 'Operations managers who are the primary bridge between Finance, Engineering, and production floor are the last replaced in any restructuring because their institutional knowledge spans multiple functions. Volunteer to lead cross-functional projects and present at monthly leadership reviews. Cross-functional visibility creates protection that technical expertise alone cannot.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Medium',
    },
  ),

  supply_chain_manager: pool(
    {
      title: 'Obtain APICS CSCP Certification for Senior Supply Chain Leadership Access',
      description: 'APICS CSCP (Certified Supply Chain Professional) is the gold standard for supply chain leadership. Directors and VPs of Supply Chain at Fortune 500 companies consistently list CSCP as a hiring requirement. The certification ($1,395) requires 150 study hours. It opens roles paying $150,000–$250,000 with significantly higher job security than supply chain specialist roles. Register for the next exam cycle today.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days — register now', priority: 'Critical',
    },
    {
      title: 'Build Supplier Diversification Intelligence Report for C-Suite Visibility',
      description: 'Supply chain managers who proactively identify supplier concentration risk (single-source dependencies, geographic concentration in disruption-prone regions) and present mitigation strategies to C-suite are reclassified from operational to strategic. Conduct a supplier concentration analysis: identify top 10 commodities with single-source dependency and propose alternatives. This is the highest-value project a supply chain manager can execute for visibility.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Develop SAP ERP or Oracle Supply Chain Management Expertise',
      description: 'Supply chain managers with SAP S/4HANA or Oracle Supply Chain Management implementation experience earn 30–45% more than those with only operational knowledge. SAP Supply Chain training at SAP Learning Hub ($150/month) covers MM, PP, and IBP modules. Certified SAP supply chain consultants can pivot to $200–$400/hour advisory roles independently of any employer.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Apply to Director of Supply Chain at a Manufacturing Company 2-3× Your Current Size',
      description: 'Supply chain managers at $100M revenue companies are qualified for Director of Supply Chain at $300M–$1B companies paying 35–55% more. Apply to 3 Director of Supply Chain roles this week via LinkedIn and ASCM job board. The most common barrier is not qualifications but not applying. Your hands-on experience managing a supply chain under disruption is rarer than many candidates realize.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 30, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Build a Supply Chain Risk Dashboard Using Excel or Tableau',
      description: 'A supply chain risk dashboard (supplier financial health scores, geopolitical risk ratings, lead time trends, inventory buffers by commodity) makes supply chain risk visible to leadership. Present this monthly to your CEO or COO. Leaders who make risk invisible to management face higher displacement risk than those who manage risk transparently.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
    },
  ),

  process_engineer: pool(
    {
      title: 'Earn Six Sigma Black Belt and Lead a $500K+ Cost Reduction Project',
      description: 'Six Sigma Black Belt (ASQ, $588; or IASSC, $595) with a documented project delivering $500,000+ in cost savings creates permanent career protection. Black Belts are internal consultants who generate measurable value — they are the last engineers eliminated in restructuring. Start with the Black Belt certification and immediately identify a high-waste process: yield losses, scrap rates, energy inefficiency, or rework. Quantify the opportunity and pitch it as a Black Belt project.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '90 days — start now', priority: 'Critical',
    },
    {
      title: 'Develop Digital Process Simulation Expertise (Aspen Plus, ANSYS, or Simio)',
      description: 'Process engineers with simulation software expertise (Aspen Plus for chemical engineering, ANSYS for mechanical/thermal, Simio for discrete event simulation) earn 25–40% more and face dramatically lower displacement risk. Process simulation expertise commands $140,000–$200,000 at chemical, pharmaceutical, and semiconductor manufacturers. Complete free trial courses on the relevant platform for your industry.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Transition to Process Engineering Manager or R&D Engineering Lead',
      description: 'Senior process engineers with 8+ years experience qualify for Process Engineering Manager ($120,000–$175,000) and R&D Engineering Lead ($130,000–$195,000) roles. These roles define the engineering direction rather than executing it — management and R&D positions face lower commodity-pricing risk than execution roles. Apply to 3 senior process engineering roles this week at specialty chemical, pharmaceutical, or semiconductor companies.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 30, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Complete HAZOP Study Facilitation Training for Safety-Critical Industries',
      description: 'HAZOP (Hazard and Operability Study) facilitators are mandatory for process safety reviews at chemical, oil & gas, and pharmaceutical plants. Certified HAZOP facilitators earn $120–$200/hour as consultants. IChemE offers HAZOP study courses ($800–$2,500). This certification creates an independent consulting option that is permanently in demand.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Join AIChE, SME, or Your Industry Trade Association for Job Market Connections',
      description: 'AIChE (chemical engineers), SME (manufacturing engineers), and ASME (mechanical engineers) maintain active job boards and networking communities. Senior members with 5+ years receive more direct recruiter contacts than those without professional association visibility. Membership costs $100–$200/year.',
      layerFocus: 'L5 · Network', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

  lean_six_sigma_specialist: pool(
    {
      title: 'Deliver a Documented $1M+ Cost Reduction Project Using DMAIC Methodology',
      description: 'Lean/Six Sigma specialists who have led projects delivering $1M+ in documented cost savings are in the top 5% of most valuable manufacturing professionals. If you\'ve delivered this, document it completely (project charter, baseline data, DMAIC analysis, control chart, financial validation signed by Finance). If not, identify your highest-value opportunity and pitch it as your next project this week. One $1M project creates a career-long credential.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '14 days — pitch project', priority: 'Critical',
    },
    {
      title: 'Pursue Master Black Belt Certification for the Highest-Level CI Role',
      description: 'Master Black Belt (MBB) is the highest-level continuous improvement credential — MBBs deploy CI programs enterprise-wide and mentor Black Belts. MBB certification from ASQ ($738) or IASSC ($595) requires prior Black Belt experience and a documented portfolio of projects. MBBs earn $130,000–$200,000 base and are the last CI professionals eliminated in restructuring because eliminating them removes the program infrastructure.',
      layerFocus: 'L3 · Skills', riskReductionPct: 42, deadline: '90 days — register', priority: 'Critical',
    },
    {
      title: 'Build an Independent Lean Consulting Practice for Manufacturing SMEs',
      description: 'Manufacturing SMEs ($10M–$50M revenue) need Lean/CI expertise but cannot afford full-time CI staff. A Lean consultant at $150–$250/hour offering: (1) value stream mapping workshops ($8,000–$12,000), (2) Kaizen event facilitation ($5,000–$8,000/event), (3) 5S implementation ($3,000–$6,000) generates $200,000–$400,000/year. Source clients through NIST Manufacturing Extension Partnership (MEP) network or directly via LinkedIn.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Develop Digital Lean Expertise: Value Stream Mapping in Digital/Software Environments',
      description: 'Lean principles applied to software development (DevOps value stream mapping, agile waste elimination) and knowledge work processes are the fastest-growing Lean specialty. "Digital VSM" skills extend Lean expertise from manufacturing floors to product development and service delivery — dramatically expanding your employable market.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Create an Internal Lean University to Build Institutional Dependency',
      description: 'Lean specialists who build internal training programs (Lean 101 for operators, Green Belt prep courses, Kaizen event facilitation training) create institutional dependency that no single project generates. When you train 50 people in Lean tools, your departure eliminates the knowledge transfer pipeline — making your retention a business continuity issue.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '30 days', priority: 'Medium',
    },
  ),

  quality_engineer: pool(
    {
      title: 'Become the Primary APQP/PPAP Lead for Your Highest-Revenue Product Lines',
      description: 'Quality engineers who own Advanced Product Quality Planning (APQP) and Production Part Approval Process (PPAP) for major customer accounts are displacement-resistant because losing them means losing customer approval status — a direct revenue risk. Volunteer to lead APQP for your next major launch and build the complete control plan, FMEA, and capability study.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Earn CQE (Certified Quality Engineer) Designation from ASQ',
      description: 'ASQ Certified Quality Engineer (CQE, $438) is the industry-standard quality credential for manufacturing. CQEs earn 20–28% more than non-certified quality engineers and receive significantly more recruiter contacts for senior quality positions. The CQE requires 8 years of quality work experience and covers: reliability, measurement systems analysis, statistical process control, and quality management systems.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Quality Manager or Director of Quality Role at a Tier-1 Supplier',
      description: 'Quality Directors at tier-1 automotive, aerospace, and medical device suppliers earn $120,000–$185,000 and are among the most protected manufacturing professionals (regulatory and customer audit requirements make them mandatory). Apply to 3 Quality Manager/Director roles this week at IATF 16949, AS9100, or ISO 13485-certified facilities.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Develop Minitab and SPC Software Expertise for Statistical Analysis Leadership',
      description: 'Quality engineers with Minitab proficiency (statistical process control, gage R&R, capability studies, DOE) earn 15–22% more than those without. Complete the Minitab online training series (free at support.minitab.com). Statistical analysis expertise is the core technical differentiator between quality technicians and quality engineers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Join ASQ and Your Industry Quality Association for Job Market Network',
      description: 'ASQ (American Society for Quality) membership ($152/year) provides access to the largest quality professional network in North America and ASQ\'s job board. AIAG (Automotive Industry Action Group) provides networking for automotive quality professionals. Industry-specific quality communities fill 55% of senior quality positions through referral.',
      layerFocus: 'L5 · Network', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

  // ── ENERGY & INFRASTRUCTURE ───────────────────────────────────────────────

  petroleum_engineer: pool(
    {
      title: 'Build Transferable Subsurface Skills for Geothermal and Carbon Storage Markets',
      description: 'Petroleum engineers with reservoir modeling expertise (Petrel, Eclipse, CMG) can transition to geothermal energy ($95,000–$150,000), carbon capture and storage (CCS, $105,000–$165,000), and hydrogen storage projects. These markets are growing while conventional oil & gas employment is contracting. Start with the Stanford Center for Carbon Storage online course (free) and update your CV to emphasize subsurface characterization skills transferable to these sectors.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Obtain Professional Engineer (PE) License for Job Security and Independence',
      description: 'Licensed Professional Engineers (PEs) in petroleum or mechanical engineering can stamp engineering reports independently — creating a consulting option that exists independent of any employer. The PE exam ($375, state-specific) requires 4 years of engineering experience and passing the Fundamentals of Engineering (FE) exam first if you haven\'t taken it. A PE license creates a permanent independent practice option.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '30 days — register for FE/PE', priority: 'Critical',
    },
    {
      title: 'Develop Data Science Skills for Digital Oilfield and Production Optimization Roles',
      description: 'Petroleum engineers who combine domain expertise with Python, machine learning, and production data analytics earn $140,000–$200,000+ in digital oilfield roles at operators, oilfield services, and energy tech startups. Complete the Kaggle Python course (free, 7 hours) and apply to 1 energy data science role this week. Hybrid petroleum + data roles face near-zero AI displacement risk.',
      layerFocus: 'L3 · Skills', riskReductionPct: 42, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Register on Rigzone and SPE Career Center for Immediate Market Intelligence',
      description: 'Rigzone (rigzone.com) and SPE Career Center (spe.org/careers) are the primary job boards for petroleum engineers with 5,000+ active postings. Registering and setting up job alerts takes 30 minutes. SPE membership ($115/year) provides access to the SPE Career Center and networking events with hiring managers from major operators and service companies.',
      layerFocus: 'L5 · Network', riskReductionPct: 20, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Complete SPE Certification Program for Professional Credentialing',
      description: 'SPE (Society of Petroleum Engineers) Certification validates subsurface and reservoir engineering competencies. SPE certification ($595) signals professional development commitment and is recognized by operators in the US, Middle East, and Southeast Asia markets where demand for petroleum engineers remains elevated.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
  ),

  renewable_energy_engineer: pool(
    {
      title: 'Develop Energy Storage and Battery System Design Expertise for the Fastest-Growing Specialty',
      description: 'Battery storage engineers (grid-scale lithium-ion, BESS design, grid interconnection) are the scarcest energy engineering specialty with 5× demand exceeding supply. Complete the NREL energy storage training program (free online) and build a BESS project design exercise using PVsyst or Homer Pro. Utility-scale storage engineers earn $125,000–$185,000 with 60+ days time-to-fill at every major developer.',
      layerFocus: 'L3 · Skills', riskReductionPct: 42, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Obtain NABCEP PV Installation Professional Certification for Solar Market Access',
      description: 'NABCEP PV Installation Professional certification ($625) is the gold standard for solar engineering and is required by most utilities for grid interconnection projects. NABCEP-certified engineers earn 20–35% more than non-certified peers. The certification requires 58+ hours of advanced PV training and a technical exam. Complete the SEI training prerequisite and register for the next exam.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Apply to Renewable Energy Developers (NextEra, Ørsted, Avangrid) for Project Pipeline Stability',
      description: 'Renewable energy project developers (NextEra Energy, Ørsted, Avangrid, Pattern Energy, Invenergy) have decade-long project pipelines — meaning engineers are needed through 2035+ for projects already permitted. These companies offer significantly more long-term stability than manufacturing or services firms. Apply to 3 developer positions this week at $95,000–$145,000 base.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Develop Grid Interconnection Study Expertise for Transmission Projects',
      description: 'Power systems engineers with grid interconnection study expertise (load flow analysis, stability analysis, short circuit studies using PSCAD, PowerWorld, or PSS/E) are the critical path resource for renewable energy projects. Interconnection study engineers earn $120,000–$175,000 and face structural shortage as interconnection queue backlogs grow to 12+ years.',
      layerFocus: 'L3 · Skills', riskReductionPct: 40, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Join AWEA (Wind Energy) or SEIA (Solar) for Industry Network and Job Market',
      description: 'AWEA (American Clean Power Association) and SEIA (Solar Energy Industries Association) maintain active job boards and networking events for renewable energy professionals. Both provide direct access to developers, IPPs, and utilities actively hiring. AWEA Windpower Conference and SEIA Solar Summit are the two events where most senior renewable energy hiring happens.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '14 days', priority: 'Medium',
    },
  ),

  sustainability_manager: pool(
    {
      title: 'Build the Company\'s First TCFD or GRI Sustainability Report for Board-Level Visibility',
      description: 'Sustainability managers who produce their company\'s first formal TCFD (Task Force on Climate-Related Financial Disclosures) or GRI-compliant sustainability report for external stakeholders are classified as compliance infrastructure — essential for investor relations, SEC climate disclosure requirements (effective 2025), and customer ESG audits. Building this report positions you as the function\'s creator, not its executor.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '30 days — start', priority: 'Critical',
    },
    {
      title: 'Obtain GRI or SASB Sustainability Reporting Certification',
      description: 'GRI Certified Sustainability Professional and SASB Fundamentals certification ($295–$695) are the recognized credentials for sustainability reporting roles. Companies facing SEC climate disclosure requirements are actively hiring credentialed sustainability professionals at $95,000–$150,000. Credentialed sustainability managers receive 3× more senior offers than uncredentialed peers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Transition to Chief Sustainability Officer (CSO) Track at a Larger Organization',
      description: 'CSO roles ($180,000–$350,000) are growing faster than any C-suite position as SEC climate disclosure, EU CSRD, and investor ESG mandates create demand. Senior sustainability managers with 2+ years of scope 1/2/3 reporting experience are qualified for Director of Sustainability and CSO roles. Apply to 3 positions this week via LinkedIn or GreenBiz Job Board.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Develop Carbon Accounting Expertise in GHG Protocol and CDP Reporting',
      description: 'Carbon accounting specialists (Scope 1, 2, and 3 greenhouse gas inventory, Science-Based Targets, CDP submission) are in structural shortage as corporate climate reporting mandates expand globally. Complete the GHG Protocol Corporate Standard training (free, 8 hours at ghgprotocol.org) and execute your company\'s first CDP submission. This becomes your primary negotiation and promotion credential.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Join GreenBiz, SASB Alliance, and Ceres Network for Senior Sustainability Opportunities',
      description: 'GreenBiz (greenbiz.com), SASB Alliance, and Ceres Network maintain job boards and networking specifically for sustainability professionals. GreenBiz VERGE Conference is the primary networking event for corporate sustainability leaders. Senior sustainability roles are filled 60% through referral within these communities.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  // ── CONSTRUCTION & CIVIL ENGINEERING ─────────────────────────────────────

  civil_engineer: pool(
    {
      title: 'Obtain Professional Engineer (PE) License as Your Career\'s Most Durable Asset',
      description: 'PE-licensed civil engineers can stamp engineering documents, take on independent project responsibility, and open their own practice. The PE creates permanent optionality: independent consulting ($150–$300/hour for plan reviews, expert witness work, and project consulting). PE examination ($375) requires 4 years post-EIT experience. If you have the EIT, take the PE exam at the next opportunity — this is the single most important career action for a civil engineer.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '30 days — register', priority: 'Critical',
    },
    {
      title: 'Develop BIM (Building Information Modeling) Expertise in Revit or Civil 3D',
      description: 'Civil engineers with BIM expertise (Autodesk Civil 3D, Revit MEP, Navisworks coordination) earn 20–35% more than CAD-only engineers and are hired preferentially by design firms working on federal and large commercial projects. Complete the Autodesk Civil 3D Essential Training on LinkedIn Learning ($39/month) and build one project as a portfolio piece.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Project Manager or Project Principal Role for Career Advancement',
      description: 'Project management roles ($95,000–$155,000) offer better career progression and retention leverage than pure design engineering roles. PMP certification (PMI, $555) plus your PE license opens project leadership at major ENR firms (AECOM, Jacobs, Parsons, Stantec). Project managers with both PE and PMP are in the top salary quartile of civil engineering.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 30, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Apply to Federal or State Transportation Agencies for Civil Service Career Stability',
      description: 'FHWA, USACE, state DOTs, and municipal public works departments offer civil engineers civil service protection, defined benefit pensions, and structured career progression from GS-9/11 to GS-14/15 ($72,000–$135,000). Federal civil engineering roles face significantly lower market-cycle risk than private consulting. Apply to 3 government agency positions this week via USAJobs.gov.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Join ASCE and Build Relationships with Local Consulting Firms for Referral Opportunities',
      description: 'ASCE (American Society of Civil Engineers) chapter membership ($270/year) provides access to the local engineering community. 70% of senior civil engineering positions at consulting firms are filled through referrals. Attend the next ASCE chapter meeting and introduce yourself to principals and department heads — this is how civil engineering jobs actually get filled.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  construction_project_manager: pool(
    {
      title: 'Complete Owner\'s Representative Training and Target the Owner\'s Side of Projects',
      description: 'Construction project managers working as Owner\'s Representatives ($110,000–$185,000) have significantly higher career stability than GC or subcontractor PMs — owners always need project management regardless of market cycle. Complete CMAA\'s Owner\'s Representative training and target owner\'s rep positions at corporate real estate departments (Fortune 500 companies, healthcare systems, universities). These roles have full benefits, lower travel, and are not subject to project-level layoffs.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Obtain PMP and CCM Certifications for Senior Project Leadership Access',
      description: 'Project Management Professional (PMP, $555) and Certified Construction Manager (CCM, CMAA, $350) together are the gold standard for senior construction PM roles ($120,000–$195,000). CCM requires 8 years construction experience and a technical exam. PMP + CCM holders receive 3× more senior recruiter contacts than single-certified peers. Register for both exams this week.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days — register', priority: 'Critical',
    },
    {
      title: 'Develop Procore and BIM 360 Administration Expertise for Technology Premium',
      description: 'Construction PMs who administer Procore ($85B in construction volume managed on the platform) or Autodesk BIM 360 for their organization earn 20–30% more and receive significantly more inbound opportunities from general contractors. Complete Procore Certification (free at learn.procore.com) and become your firm\'s Procore Admin. This creates dependency that protects you during project downtime.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build Federal Construction Experience for Long-Term Contract Stability',
      description: 'Federal construction contracts (USACE, GSA, DOD facility projects) run 3–7 year timelines with congressionally approved budgets. Construction PMs with federal project experience (security clearance eligible, prevailing wage compliance, Davis-Bacon Act) command 25–35% premium rates. Apply to federal prime contractors (Fluor, Bechtel, DynCorp) or register your firm as a small business with SAM.gov.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Join AGC and ENR Network for Senior Construction PM Opportunities',
      description: 'AGC (Associated General Contractors) and ENR (Engineering News-Record) networks provide access to senior construction leadership positions. AGC chapter events are the primary networking venue for GC executives, owners, and project leadership. ENR Top 400 firms hire primarily through their internal networks and AGC relationships.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  architect: pool(
    {
      title: 'Obtain Architecture License Immediately If You Have Your IDP Hours Completed',
      description: 'Licensed architects (AIA) can stamp and seal drawings independently, enabling solo practice, independent consulting ($100–$250/hour for plan review, project oversight, expert witness), and department leadership. If you have your 3,740 NAAB-accredited hours completed, schedule ARE exams this week. The ARE costs $235 per section (6 sections). Licensure is the single most important career protection investment an unlicensed architect can make.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 45, deadline: '7 days — schedule exams', priority: 'Critical',
    },
    {
      title: 'Develop a Healthcare or Science + Technology Specialty for Structural Demand Protection',
      description: 'Healthcare architects ($110,000–$175,000) and science + technology facility architects ($105,000–$165,000) face structural shortage and near-zero cyclical sensitivity — hospital construction and research facility projects have decade-long planning horizons that persist through economic downturns. Pursue Healthcare Architect credentialing through AIA Academy on Architecture for Health or LEAN Healthcare Design training.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Build Sustainable Design Expertise with LEED AP BD+C Certification',
      description: 'LEED AP BD+C ($500) is required for sustainability coordinator roles on major commercial and institutional projects. Many RFPs specifically require LEED AP team members. Architects with LEED AP earn 18–25% more and are prioritized for projects with sustainability requirements — which is increasingly all major commercial construction. Complete the LEED BD+C study guide and register for the next exam.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Apply to Institutional Clients (Universities, Hospitals, Government Agencies) for Stability',
      description: 'Architects at firms primarily serving institutional clients (universities, hospitals, government agencies) face 40% lower layoff risk than those at residential or commercial development-focused firms. Institutional projects are funded by bonds and grants rather than speculative development cycles. Target firms with strong healthcare, higher education, or federal portfolio.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 32, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Join AIA and Build Studio Leadership Portfolio for Promotion Track',
      description: 'AIA membership ($395/year for licensed architects) provides access to the AIA career center, continuing education credits, and firm leadership networks. Building a portfolio of studio leadership experiences (project architect role, design team leadership) is the fastest track to associate and partner-level positions.',
      layerFocus: 'L5 · Network', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

  safety_hse_manager: pool(
    {
      title: 'Pursue CSP (Certified Safety Professional) for Senior HSE Leadership Access',
      description: 'BCSP Certified Safety Professional (CSP, $300 exam, requires ASP first) is the most recognized safety credential in North America. CSPs earn 25–40% more than non-certified HSE professionals and are preferentially hired for Director of EHS and VP EHS roles ($110,000–$185,000). If you have the ASP, pursue the CSP immediately. If not, start with the ASP ($275). Register this week.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days — register', priority: 'Critical',
    },
    {
      title: 'Build an Incident Rate Trend Report That Shows Your Safety Program\'s Business Value',
      description: 'HSE managers who track and report OSHA recordable incident rate trends alongside their financial impact (workers compensation costs, OSHA fines avoided, productivity losses prevented) convert their role from regulatory compliance cost to financial risk management function. Build this report and present it to your CFO quarterly. A CFO who understands safety as a financial risk is a protector of the HSE budget.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Develop Process Safety Management (PSM) Expertise for Chemical and Energy Industries',
      description: 'PSM Coordinator ($95,000–$145,000) and Process Safety Engineer ($110,000–$165,000) roles at chemical plants, refineries, and oil & gas facilities are mandatory under OSHA PSM regulations — they cannot be eliminated without creating a compliance violation. CCPS (Center for Chemical Process Safety) offers PSM training. PSM expertise is the single most legally protected HSE specialty.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Apply to EHS Director Roles at Manufacturing Companies 2× Your Current Organization\'s Size',
      description: 'HSE Managers at companies with 200–500 employees are qualified for EHS Director positions ($100,000–$155,000) at companies with 1,000–5,000 employees. The jump from manager to director is primarily a company-size move, not a skills jump. Apply to 3 EHS Director roles this week — the ASSP career center and LinkedIn are the two primary channels.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 28, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Join ASSP (American Society of Safety Professionals) for Job Market Access',
      description: 'ASSP membership ($170/year) provides access to the largest safety professional community with active regional job boards, practice specialties, and the ASSP annual conference — the primary networking event for senior HSE positions. HSE Director and VP EHS roles are filled 55% through referral within the ASSP network.',
      layerFocus: 'L5 · Network', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

};

// ── ALIAS MAP ADDITIONS ────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Manufacturing
  'manufacturing engineer': { canonicalKey: 'manufacturing_engineer', displayRole: 'Manufacturing Engineer' },
  'production engineer': { canonicalKey: 'manufacturing_engineer', displayRole: 'Production Engineer' },
  'process engineer': { canonicalKey: 'process_engineer', displayRole: 'Process Engineer' },
  'operations manager': { canonicalKey: 'operations_manager', displayRole: 'Operations Manager' },
  'plant manager': { canonicalKey: 'operations_manager', displayRole: 'Plant Manager' },
  'production manager': { canonicalKey: 'operations_manager', displayRole: 'Production Manager' },
  'supply chain manager': { canonicalKey: 'supply_chain_manager', displayRole: 'Supply Chain Manager' },
  'logistics manager': { canonicalKey: 'supply_chain_manager', displayRole: 'Logistics Manager' },
  'procurement manager': { canonicalKey: 'supply_chain_manager', displayRole: 'Procurement Manager' },
  'quality engineer': { canonicalKey: 'quality_engineer', displayRole: 'Quality Engineer' },
  'quality assurance engineer': { canonicalKey: 'quality_engineer', displayRole: 'Quality Assurance Engineer' },
  'lean engineer': { canonicalKey: 'lean_six_sigma_specialist', displayRole: 'Lean Engineer' },
  'six sigma black belt': { canonicalKey: 'lean_six_sigma_specialist', displayRole: 'Six Sigma Black Belt' },
  'continuous improvement manager': { canonicalKey: 'lean_six_sigma_specialist', displayRole: 'Continuous Improvement Manager' },
  'industrial engineer': { canonicalKey: 'manufacturing_engineer', displayRole: 'Industrial Engineer' },
  'sustainability manager': { canonicalKey: 'sustainability_manager', displayRole: 'Sustainability Manager' },
  'esg manager': { canonicalKey: 'sustainability_manager', displayRole: 'ESG Manager' },
  'chief sustainability officer': { canonicalKey: 'sustainability_manager', displayRole: 'Chief Sustainability Officer' },
  // Energy
  'petroleum engineer': { canonicalKey: 'petroleum_engineer', displayRole: 'Petroleum Engineer' },
  'reservoir engineer': { canonicalKey: 'petroleum_engineer', displayRole: 'Reservoir Engineer' },
  'drilling engineer': { canonicalKey: 'petroleum_engineer', displayRole: 'Drilling Engineer' },
  'renewable energy engineer': { canonicalKey: 'renewable_energy_engineer', displayRole: 'Renewable Energy Engineer' },
  'solar engineer': { canonicalKey: 'renewable_energy_engineer', displayRole: 'Solar Engineer' },
  'wind energy engineer': { canonicalKey: 'renewable_energy_engineer', displayRole: 'Wind Energy Engineer' },
  'energy engineer': { canonicalKey: 'renewable_energy_engineer', displayRole: 'Energy Engineer' },
  'power systems engineer': { canonicalKey: 'renewable_energy_engineer', displayRole: 'Power Systems Engineer' },
  'hse manager': { canonicalKey: 'safety_hse_manager', displayRole: 'HSE Manager' },
  'health safety environment manager': { canonicalKey: 'safety_hse_manager', displayRole: 'HSE Manager' },
  'ehs manager': { canonicalKey: 'safety_hse_manager', displayRole: 'EHS Manager' },
  'safety manager': { canonicalKey: 'safety_hse_manager', displayRole: 'Safety Manager' },
  // Construction
  'civil engineer': { canonicalKey: 'civil_engineer', displayRole: 'Civil Engineer' },
  'structural engineer': { canonicalKey: 'civil_engineer', displayRole: 'Structural Engineer' },
  'construction project manager': { canonicalKey: 'construction_project_manager', displayRole: 'Construction Project Manager' },
  'construction manager': { canonicalKey: 'construction_project_manager', displayRole: 'Construction Manager' },
  'site manager': { canonicalKey: 'construction_project_manager', displayRole: 'Site Manager' },
  'architect': { canonicalKey: 'architect', displayRole: 'Architect' },
  'project architect': { canonicalKey: 'architect', displayRole: 'Project Architect' },
  'licensed architect': { canonicalKey: 'architect', displayRole: 'Licensed Architect' },
};

// ── CANONICAL → ACTION GROUP ADDITIONS ────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION: Record<string, string> = {
  manufacturing_engineer: 'manufacturing_engineer',
  process_engineer: 'process_engineer',
  quality_engineer: 'quality_engineer',
  production_supervisor: 'operations_manager',
  operations_manager: 'operations_manager',
  plant_manager: 'operations_manager',
  lean_six_sigma_specialist: 'lean_six_sigma_specialist',
  continuous_improvement_manager: 'lean_six_sigma_specialist',
  supply_chain_manager: 'supply_chain_manager',
  procurement_specialist: 'supply_chain_manager',
  category_manager: 'supply_chain_manager',
  logistics_coordinator: 'supply_chain_manager',
  warehouse_manager: 'operations_manager',
  inventory_analyst: 'supply_chain_manager',
  industrial_engineer: 'manufacturing_engineer',
  reliability_engineer: 'process_engineer',
  cnc_programmer: 'manufacturing_engineer',
  automation_technician: 'manufacturing_engineer',
  vp_operations: 'operations_manager',
  chief_operations_officer: 'operations_manager',
  petroleum_engineer: 'petroleum_engineer',
  reservoir_engineer: 'petroleum_engineer',
  drilling_engineer: 'petroleum_engineer',
  renewable_energy_engineer: 'renewable_energy_engineer',
  solar_installation_technician: 'renewable_energy_engineer',
  electrical_engineer_power: 'renewable_energy_engineer',
  grid_operations_specialist: 'renewable_energy_engineer',
  nuclear_engineer: 'process_engineer',
  environmental_engineer: 'sustainability_manager',
  energy_analyst: 'sustainability_manager',
  sustainability_manager: 'sustainability_manager',
  utility_field_technician: 'renewable_energy_engineer',
  power_systems_engineer: 'renewable_energy_engineer',
  oil_gas_project_manager: 'construction_project_manager',
  energy_trading_analyst: 'supply_chain_manager',
  civil_engineer: 'civil_engineer',
  structural_engineer: 'civil_engineer',
  geotechnical_engineer: 'civil_engineer',
  construction_project_manager: 'construction_project_manager',
  site_superintendent: 'construction_project_manager',
  quantity_surveyor_estimator: 'construction_project_manager',
  bim_specialist: 'architect',
  architect: 'architect',
  urban_planner: 'civil_engineer',
  mechanical_engineer_hvac: 'process_engineer',
  electrical_engineer_building: 'civil_engineer',
  safety_hse_manager: 'safety_hse_manager',
  project_controls_specialist: 'construction_project_manager',
  real_estate_developer: 'construction_project_manager',
  facilities_manager: 'operations_manager',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  manufacturing_engineer: {
    roleKey: 'manufacturing_engineer', roleName: 'Manufacturing Engineer',
    demandIndex: 72, demandTrend: 'stable', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 10,
    topHiringLocations: ['Detroit MI', 'Houston TX', 'Chicago IL', 'Columbus OH', 'Cincinnati OH'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'Reshoring wave driving manufacturing engineering demand. Robotics/automation integration skills most sought.',
  },
  operations_manager: {
    roleKey: 'operations_manager', roleName: 'Operations Manager',
    demandIndex: 70, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 8,
    topHiringLocations: ['Chicago IL', 'Dallas TX', 'Atlanta GA', 'Columbus OH', 'Indianapolis IN'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Operations management in structural demand across all manufacturing sectors.',
  },
  supply_chain_manager: {
    roleKey: 'supply_chain_manager', roleName: 'Supply Chain Manager',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 48, yoyJobOpeningsChange: 18,
    topHiringLocations: ['Chicago IL', 'Dallas TX', 'Atlanta GA', 'Los Angeles CA', 'New York NY'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'Supply chain resilience investment post-COVID driving manager demand. CSCP credential shortage.',
  },
  process_engineer: {
    roleKey: 'process_engineer', roleName: 'Process Engineer',
    demandIndex: 74, demandTrend: 'stable', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 12,
    topHiringLocations: ['Houston TX', 'Midland TX', 'Baton Rouge LA', 'Detroit MI', 'Philadelphia PA'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Chemical, semiconductor, and pharmaceutical process engineering in structural shortage.',
  },
  lean_six_sigma_specialist: {
    roleKey: 'lean_six_sigma_specialist', roleName: 'Lean / Six Sigma Specialist',
    demandIndex: 70, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 40, yoyJobOpeningsChange: 8,
    topHiringLocations: ['Detroit MI', 'Chicago IL', 'Cincinnati OH', 'Nashville TN', 'Charlotte NC'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'CI specialists in demand across automotive, aerospace, healthcare, and financial services.',
  },
  quality_engineer: {
    roleKey: 'quality_engineer', roleName: 'Quality Engineer',
    demandIndex: 72, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 40, yoyJobOpeningsChange: 10,
    topHiringLocations: ['Detroit MI', 'Chicago IL', 'Houston TX', 'Los Angeles CA', 'Phoenix AZ'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'IATF 16949 and ISO 13485 compliance driving quality engineering demand in automotive and medical device.',
  },
  petroleum_engineer: {
    roleKey: 'petroleum_engineer', roleName: 'Petroleum Engineer',
    demandIndex: 65, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 55, yoyJobOpeningsChange: -5,
    topHiringLocations: ['Houston TX', 'Midland TX', 'Williston ND', 'Oklahoma City OK', 'Calgary Canada'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'E&P capex contraction reducing demand. Digital oilfield and data science hybrid roles growing within declining sector.',
  },
  renewable_energy_engineer: {
    roleKey: 'renewable_energy_engineer', roleName: 'Renewable Energy Engineer',
    demandIndex: 85, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 35,
    topHiringLocations: ['Austin TX', 'Denver CO', 'San Francisco CA', 'Phoenix AZ', 'Boston MA'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'IRA incentives driving unprecedented renewable energy engineering demand. Battery storage engineers scarcest specialty.',
  },
  sustainability_manager: {
    roleKey: 'sustainability_manager', roleName: 'Sustainability Manager / ESG Director',
    demandIndex: 78, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 42,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Chicago IL', 'Austin TX', 'Seattle WA'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'SEC climate disclosure + EU CSRD driving corporate sustainability hiring surge. GRI/SASB-credentialed specialists scarce.',
  },
  civil_engineer: {
    roleKey: 'civil_engineer', roleName: 'Civil Engineer',
    demandIndex: 74, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 15,
    topHiringLocations: ['New York NY', 'Los Angeles CA', 'Houston TX', 'Dallas TX', 'Washington DC'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'Infrastructure Investment and Jobs Act driving sustained civil engineering demand through 2030.',
  },
  construction_project_manager: {
    roleKey: 'construction_project_manager', roleName: 'Construction Project Manager',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 18,
    topHiringLocations: ['New York NY', 'Houston TX', 'Dallas TX', 'Los Angeles CA', 'Seattle WA'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'Infrastructure, datacenter, and semiconductor fab construction driving construction PM shortage.',
  },
  architect: {
    roleKey: 'architect', roleName: 'Licensed Architect',
    demandIndex: 68, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 5,
    topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Boston MA', 'Seattle WA'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Healthcare, science & technology, and data center facility demand driving architect need. Generative AI impacting schematic design but not licensure-required work.',
  },
  safety_hse_manager: {
    roleKey: 'safety_hse_manager', roleName: 'HSE / EHS Manager',
    demandIndex: 70, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 8,
    topHiringLocations: ['Houston TX', 'Dallas TX', 'Los Angeles CA', 'Chicago IL', 'Pittsburgh PA'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'OSHA compliance requirements create structural demand independent of economic cycles.',
  },
};

// ── COMPENSATION ADDITIONS ─────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION: Record<string, Record<string, number>> = {
  manufacturing_engineer: { '0-2': 68_000, '2-5': 82_000, '5-10': 100_000, '10-15': 118_000, '15+': 138_000 },
  process_engineer: { '0-2': 72_000, '2-5': 88_000, '5-10': 108_000, '10-15': 130_000, '15+': 155_000 },
  quality_engineer: { '0-2': 65_000, '2-5': 78_000, '5-10': 95_000, '10-15': 112_000, '15+': 130_000 },
  operations_manager: { '0-2': 75_000, '2-5': 95_000, '5-10': 120_000, '10-15': 148_000, '15+': 180_000 },
  lean_six_sigma_specialist: { '0-2': 70_000, '2-5': 88_000, '5-10': 110_000, '10-15': 132_000, '15+': 158_000 },
  supply_chain_manager: { '0-2': 72_000, '2-5': 92_000, '5-10': 118_000, '10-15': 145_000, '15+': 175_000 },
  industrial_engineer: { '0-2': 70_000, '2-5': 85_000, '5-10': 105_000, '10-15': 125_000, '15+': 148_000 },
  petroleum_engineer: { '0-2': 95_000, '2-5': 118_000, '5-10': 145_000, '10-15': 172_000, '15+': 205_000 },
  renewable_energy_engineer: { '0-2': 82_000, '2-5': 105_000, '5-10': 130_000, '10-15': 155_000, '15+': 185_000 },
  sustainability_manager: { '0-2': 75_000, '2-5': 98_000, '5-10': 125_000, '10-15': 155_000, '15+': 190_000 },
  civil_engineer: { '0-2': 68_000, '2-5': 82_000, '5-10': 102_000, '10-15': 122_000, '15+': 145_000 },
  structural_engineer: { '0-2': 72_000, '2-5': 88_000, '5-10': 110_000, '10-15': 132_000, '15+': 158_000 },
  construction_project_manager: { '0-2': 72_000, '2-5': 90_000, '5-10': 115_000, '10-15': 140_000, '15+': 170_000 },
  architect: { '0-2': 58_000, '2-5': 72_000, '5-10': 92_000, '10-15': 115_000, '15+': 145_000 },
  safety_hse_manager: { '0-2': 65_000, '2-5': 82_000, '5-10': 102_000, '10-15': 125_000, '15+': 152_000 },
};

// ── NEGOTIATION SCRIPT ADDITIONS ──────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_MANUFACTURING_ENERGY_CONSTRUCTION: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  manufacturing_engineer: {
    strongOpener: 'I\'d like to share the operational improvements I\'ve driven this year before we discuss compensation: [specific metrics — OEE improvement, scrap reduction, cycle time reduction].',
    leverageContext: 'The automation project I led delivered $X in annual cost savings. Replacing my institutional knowledge of these systems would require 6–12 months of knowledge transfer — plus the cost of a search.',
    countersScript: 'I\'m requesting a base adjustment to $X, consistent with what manufacturers in our sector pay for engineers with Six Sigma credentials and automation implementation experience.',
    walkAwayLine: 'I have an offer from a Tier-1 supplier at $X. I prefer to stay and build on the automation work we\'ve started — but I need the compensation to reflect my market value.',
  },
  operations_manager: {
    strongOpener: 'My operations P&L contribution this year: throughput increased X%, scrap reduced Y%, and we brought $Z in overtime back in-house. I\'d like these results to inform our compensation discussion.',
    leverageContext: 'The operational changes I\'ve implemented have created $X in annual savings. More importantly, my team\'s performance metrics depend on relationships and processes I\'ve built — continuity here has direct financial value.',
    countersScript: 'Market data for operations managers with my experience, scope, and certifications shows a range of $X–$Y. I\'m requesting a base of $X with a performance bonus tied to the OEE and throughput targets we\'ve agreed on.',
    walkAwayLine: 'I\'ve been in discussion with two manufacturers in our region at higher compensation. I\'d rather invest in this plant\'s transformation, but I need competitive terms to do that.',
  },
  renewable_energy_engineer: {
    strongOpener: 'I want to discuss my compensation relative to what the renewable energy market currently pays for engineers with my background in [solar/wind/storage/grid interconnection].',
    leverageContext: 'Time-to-fill for renewable energy engineers is currently 55+ days in this region. The project timeline I\'m managing cannot afford a 6-month search and ramp period if I were to leave.',
    countersScript: 'NABCEP-certified engineers with my project experience earn $X–$Y in this market. I\'m requesting a base of $X and would appreciate discussing a project completion bonus structure.',
    walkAwayLine: 'I\'ve received a competing offer from a utility-scale solar developer at $X. I\'d prefer to stay given the project trajectory here, but the compensation gap is significant.',
  },
  construction_project_manager: {
    strongOpener: 'The project I\'ve managed is currently [X% under budget / Y days ahead of schedule / Z% lower defect rate than forecast]. I\'d like that performance reflected in my compensation.',
    leverageContext: 'I\'m managing $X in project value with [N] subcontractors and direct owner relationships. A PM transition mid-project creates immediate schedule and budget risk — the owner would notice immediately.',
    countersScript: 'PMP-certified construction PMs managing projects of this size and complexity earn $X–$Y in this market. I\'m requesting a base of $X and a project completion incentive.',
    walkAwayLine: 'I have a GC and an owner\'s rep opportunity both at higher comp. I prefer the relationship we have here — but I need to close the compensation gap.',
  },
};
