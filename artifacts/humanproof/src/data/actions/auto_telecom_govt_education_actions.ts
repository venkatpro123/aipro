// Automotive, Telecom, Government & Education action pools — v37.0
// Follows the same 6-export pattern as other industry action files

type BracketPool = Record<string, Record<string, Array<{
  title: string;
  description: string;
  layerFocus?: string;
  riskReductionPct?: number;
  deadline?: string;
  priority?: string;
}>>>;

function pool(
  juniorCritical: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  midCritical: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  seniorCritical: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  highAction: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  moderateAction: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string }
): BracketPool {
  return {
    junior: {
      critical: [juniorCritical],
      high: [highAction],
      moderate: [moderateAction],
      low: [moderateAction],
    },
    mid: {
      critical: [midCritical],
      high: [highAction],
      moderate: [moderateAction],
      low: [moderateAction],
    },
    senior: {
      critical: [seniorCritical],
      high: [highAction],
      moderate: [moderateAction],
      low: [moderateAction],
    },
    principal: {
      critical: [seniorCritical],
      high: [highAction],
      moderate: [moderateAction],
      low: [moderateAction],
    },
  };
}

// ─── AUTOMOTIVE ───────────────────────────────────────────────────────────────

const automotive_engineer: BracketPool = pool(
  {
    title: 'Document DFMEA Contributions and APQP Program Achievements',
    description: 'Compile your Design Failure Mode and Effects Analysis (DFMEA) contributions, Advanced Product Quality Planning (APQP) program records, and warranty reduction outcomes. Automotive engineers without documented program contributions are first targets in platform consolidations.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in ISO 26262 Functional Safety and Target EV/ADAS Programs',
    description: 'ISO 26262 Functional Safety Engineer (FUSE) certification is rapidly becoming a baseline for automotive engineers on ADAS and EV programs. Engineers with this certification are nearly impossible to lose from safety-critical programs.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 18,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Activate OEM and Tier-1 Supplier Network for EV Program Opportunities',
    description: 'EV program engineering demand at OEMs and Tier-1 suppliers (Bosch, Continental, Denso, Aptiv) far exceeds supply of experienced automotive engineers with software integration knowledge. Your mechanical domain expertise combined with any software exposure is extremely valuable.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Model-Based Systems Engineering (MBSE) and SysML Proficiency',
    description: 'Model-Based Systems Engineering (MBSE) using SysML (Capella, Enterprise Architect, MagicDraw) is transforming automotive development processes. Engineers with MBSE experience are promoted ahead of peers and specifically sought by autonomous vehicle programs.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Automotive Consulting and Vehicle Program Management',
    description: 'Automotive engineering consultants with APQP/program management experience earn $85–150/hr at engineering staffing firms (Alten, Capgemini Engineering, Ricardo) — higher than equivalent OEM roles in most markets. A transition to consulting preserves expertise while reducing employer risk.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

const ev_battery_engineer: BracketPool = pool(
  {
    title: 'Document Cell Chemistry Contributions, Pack Design Patents, and BMS Algorithm Ownership',
    description: 'Compile your electrochemistry research contributions, battery pack design patents (if any), battery management system (BMS) algorithm ownership, and any published performance benchmarks. EV battery engineers with documented IP contributions are among the most protected roles in the industry.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 21,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Electrochemistry Simulation and Battery Digital Twin Skills',
    description: 'Proficiency in battery simulation tools (COMSOL electrochemistry, Battery Design Studio, GT-SUITE electrical) and battery digital twin development positions you at the intersection of chemistry and software — the most scarce and valued skill combination in EV.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 20,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Cell Manufacturers, Gigafactory Programs, and Battery Tech Startups',
    description: 'Cell manufacturers (CATL, LG Energy Solution, Panasonic, Samsung SDI), gigafactory programs (Tesla, Rivian, Northvolt), and solid-state battery startups (QuantumScape, Solid Power, Factorial Energy) have near-unlimited demand for experienced battery engineers. Apply immediately.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 27,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Develop Second-Life Battery and Grid Storage Application Knowledge',
    description: 'Second-life EV battery applications (grid storage, stationary energy systems) are a rapidly growing market with severe talent shortages. Battery engineers who understand both automotive and grid storage applications have dramatically expanded career optionality.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Engage IEEE Vehicular Technology Society and Battery Symposium Communities',
    description: 'Active participation in IEEE VTS, The Battery Show, and international battery symposia builds scientific reputation and generates passive recruitment from cell manufacturers, OEMs, and research institutions globally.',
    layerFocus: 'network_leverage',
    riskReductionPct: 9,
    deadline: '30 days',
    priority: 'medium',
  }
);

const adas_engineer: BracketPool = pool(
  {
    title: 'Document ADAS Feature Ownership, Safety Case Contributions, and V&V Record',
    description: 'Compile ADAS feature ownership history, safety case (ISO 26262 ASIL levels), verification and validation records, and regulatory type-approval contributions. ADAS engineers who own safety-critical features are the last to be cut and the first to be recruited.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 19,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Deepen Perception Stack Expertise: Computer Vision, Sensor Fusion, and LiDAR',
    description: 'ADAS engineers with deep perception stack skills — computer vision (OpenCV, YOLO, PyTorch), sensor fusion (camera + radar + LiDAR), and real-time processing expertise — command 25–50% compensation premiums over mechanical-only automotive engineers.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 22,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Autonomous Vehicle and Robotics Companies with Active ADAS Programs',
    description: 'Active autonomous vehicle programs (Waymo, Mobileye, Cruise, Motional, Zoox) and automotive perception startups have multi-year backlogs of ADAS engineering work. Your domain expertise is globally portable — apply to US, EU, and China-based AV programs.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 25,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build AUTOSAR Adaptive and ROS2 Proficiency for Software-Defined Vehicle Era',
    description: 'AUTOSAR Adaptive (high-performance compute platforms) and ROS2 proficiency is becoming the baseline for senior ADAS engineers as software-defined vehicles emerge. Engineers with both traditional embedded (Classic AUTOSAR) and modern platform (Adaptive AUTOSAR) experience are extremely scarce.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 14,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Pursue Safety-Critical Systems Engineering Consulting Opportunities',
    description: 'ISO 26262-certified ADAS engineers with V&V experience earn $120–200/hr as automotive safety consultants. Regulatory type-approval support, safety architecture reviews, and SOTIF (ISO 21448) assessments are in very high demand with limited qualified supply.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 10,
    deadline: '45 days',
    priority: 'medium',
  }
);

const automotive_program_manager: BracketPool = pool(
  {
    title: 'Compile Program Launch Record: On-Time, On-Cost, and ILVS Achievement',
    description: 'Document your program launch record: Job 1 achievement dates vs. targets, budget performance (under/over), ILVS (Initial Launch Volume Standards) metrics, and quality gate outcomes. Automotive PMs with clean launch records are the hardest to eliminate during restructurings.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify as Program Management Professional (PMP) and APQP Expert',
    description: 'PMP certification combined with APQP expertise (AIAG standards, PPAP documentation management) formally validates your automotive program management credential. This combination opens Tier-1 supplier and consultancy program director tracks.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target EV Platform Programs and Software-Defined Vehicle Program Offices',
    description: 'EV platform programs (architecture-level, not carry-over) at OEMs and new entrants (Rivian, Lucid, VinFast) are expanding program management headcount significantly. Your ICE program experience combined with willingness to lead transformation is highly valued.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Agile and Scaled Agile Framework (SAFe) for Automotive Software',
    description: 'Automotive software development is rapidly adopting SAFe Agile. Program managers who can bridge traditional V-model automotive development and Agile sprint cadences are uniquely positioned for software-defined vehicle program offices and embedded software programs.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Automotive Program Management Consulting for Emerging OEMs',
    description: 'New automotive entrants (Chinese OEMs going global, EV startups, Indian OEMs expanding) consistently need experienced program managers on contract. Your established OEM methodologies command $120–180/hr consulting rates and provide employer diversification.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── TELECOMMUNICATIONS ───────────────────────────────────────────────────────

const network_engineer_telecom: BracketPool = pool(
  {
    title: 'Document Network Uptime Record, Incident Reduction, and CapEx Optimization',
    description: 'Compile your network reliability record (uptime SLAs maintained), major incident response history, and any CapEx optimization achieved through network design decisions. Telecom engineers with documented reliability ownership are the last to be targeted in workforce restructurings.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in Cisco CCIE or Nokia/Ericsson 5G Network Certification',
    description: 'CCIE (Cisco Certified Internetwork Expert) or equivalent 5G network certifications (Nokia 5G, Ericsson Certified Engineer) are the highest-value credentials in telecom. Certified engineers earn 20–40% premiums and are in permanent shortage globally.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 19,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Cloud-Native 5G, Open RAN, and Network Automation Roles',
    description: 'Open RAN disaggregation and cloud-native 5G core are creating a massive demand-supply gap for engineers who understand both traditional RAN/core and cloud/containerization. Apply to Nokia, Ericsson, Samsung Networks, Rakuten Mobile, and Dish Network — the most active Open RAN employers.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 23,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Network Automation: Ansible, Python, Terraform for Network Infrastructure',
    description: 'Network automation (Ansible playbooks, Python Netmiko/Nornir, Terraform for network infra) is the single most important skill shift for telecom engineers in 2026. Engineers who automate networks are protected; those who only configure manually are automatable.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 16,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Network Consulting and Managed Services Provider Opportunities',
    description: 'Managed services providers (NTT, Wipro, Infosys Networks) and telecom consulting firms (Analysys Mason, STL Partners, Cartesian) actively recruit experienced network engineers. Consulting pays 15–25% more and provides exposure to multiple carrier architectures.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const telecom_product_manager: BracketPool = pool(
  {
    title: 'Compile Telecom Product Launch Record: ARPU Growth, Churn Reduction, NPS',
    description: 'Document your product KPIs: ARPU growth, subscriber acquisition cost, churn rate reduction, and NPS improvement for products you\'ve launched. Telecom PMs with attributed ARPU growth data have strong negotiation leverage — telecom product is highly revenue-attributable.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build 5G Service Innovation and Edge Computing Product Expertise',
    description: 'Develop fluency in 5G network slicing, private network products, and mobile edge computing (MEC) use cases. Telecom PMs who understand the enterprise 5G value proposition are positioned for VP Product roles at carriers and enterprise 5G platform companies.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 18,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Enterprise 5G Platform Companies and IoT Connectivity Providers',
    description: 'Enterprise connectivity platforms (Celona, Emnify, Eseye, Transatel) and IoT connectivity providers are building product teams with telecom-aware PMs — a profile they cannot hire from consumer software PM markets. Your telecom domain knowledge is rare in product management.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Develop API Economy and Network-as-a-Service Product Strategy Expertise',
    description: 'Network APIs (CAMARA project, Twilio-style programmable connectivity) represent the next growth frontier for telecom. PMs who understand network API productization are positioned for VP Product roles at telecom API platforms — a high-growth, well-compensated niche.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Engage GSMA, TM Forum, and Telecom Industry Analyst Communities',
    description: 'GSMA and TM Forum participation, combined with written thought leadership in telecom trade media (Light Reading, FierceTelecom, Total Telecom), builds a visible market presence that generates passive inbound from carriers, vendors, and analysts.',
    layerFocus: 'network_leverage',
    riskReductionPct: 7,
    deadline: '30 days',
    priority: 'medium',
  }
);

const rf_engineer: BracketPool = pool(
  {
    title: 'Document RF Performance Optimization Record: Coverage, Capacity, and Interference Reduction',
    description: 'Compile your RF optimization outcomes: drive test coverage improvements, SINR gains, interference mitigation, and any spectrum efficiency improvements. RF engineers who own measurable network performance outcomes have strong leverage in a field where specialist supply consistently falls short of demand.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in 5G NR RF Engineering and mmWave Propagation',
    description: 'Develop 5G NR air interface expertise, mmWave propagation modeling, and beamforming optimization skills. 5G-specialized RF engineers command 25–40% premiums over LTE-era generalists, and mmWave expertise specifically is in severe global shortage.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 19,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target Satellite Communications and Non-Terrestrial Network Roles',
    description: 'Satellite broadband (Starlink, OneWeb, Amazon Kuiper, AST SpaceMobile) and Non-Terrestrial Network (NTN) 5G integration roles represent the fastest growing segment in wireless engineering. Your RF expertise transfers directly and commands premium compensation in these companies.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build AI-Native Network Optimization and Digital Twin Radio Skills',
    description: 'AI-driven radio access network (AI-RAN) optimization and digital twin modeling (NVIDIA Aerial, Ericsson AI-native RAN) are transforming RF engineering. RF engineers who lead AI-native optimization projects are indispensable in vendor and carrier AI strategy programs.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 13,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Spectrum Consulting and Government/Defense RF Engineering Opportunities',
    description: 'FCC spectrum consulting, DoD spectrum management, and FirstNet (public safety broadband) roles require exactly your skills and pay significant premiums. Government RF engineering roles also carry high job security relative to commercial carrier restructurings.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── GOVERNMENT & PUBLIC SECTOR ───────────────────────────────────────────────

const government_policy_analyst: BracketPool = pool(
  {
    title: 'Compile Policy Impact Record: Legislation Influenced, Regulations Drafted, Programs Implemented',
    description: 'Document your policy portfolio: bills or regulations you\'ve contributed to drafting, agency programs implemented, stakeholder coalitions built, and any public interest outcomes attributable to your work. Government analysts with documented policy impact have strong civil service protection and external consulting leverage.',
    layerFocus: 'career_velocity',
    riskReductionPct: 12,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Develop Data Analytics and Policy Modeling Skills for Evidence-Based Policy',
    description: 'Policy analysts with quantitative skills (R, Python, statistical modeling, cost-benefit analysis) are disproportionately promoted over purely qualitative peers. Econometric modeling and program evaluation methodology are the highest-value technical skills for policy career advancement.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target Think Tanks, Consulting Firms, and International Organizations',
    description: 'Government policy analysts consistently transition to think tanks (Brookings, RAND, AEI, Urban Institute), policy consulting firms (Booz Allen Hamilton, Deloitte Federal, ICF), and international organizations (World Bank, IMF, UNDP). Your domain expertise is valued across all three.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build AI Policy and Regulatory Technology (RegTech) Expertise',
    description: 'AI governance, algorithmic accountability, and digital regulation are emerging as specialized policy niches with very limited competition. Policy analysts who develop AI policy fluency are recruited by tech companies, regulatory bodies, and international standards organizations.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Engage Academic Affiliations and Policy Research Networks',
    description: 'Adjunct faculty roles, visiting researcher positions, and policy journal publications build your external reputation while maintaining government employment. These affiliations create optionality for future academic, think-tank, or international organization transitions.',
    layerFocus: 'network_leverage',
    riskReductionPct: 7,
    deadline: '60 days',
    priority: 'medium',
  }
);

const municipal_administrator: BracketPool = pool(
  {
    title: 'Document Budget Management, Service Delivery Improvement, and Community Outcomes',
    description: 'Compile your administrative record: budget managed ($M), service delivery improvements (response times, resident satisfaction), cost efficiencies achieved, and any successful infrastructure projects. Municipal administrators with documented outcome records are far better positioned for promotion and retention than those without.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 12,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Pursue ICMA-CM (Certified Manager) Credential',
    description: 'International City/County Management Association Certified Manager (ICMA-CM) is the premier credential in municipal management. ICMA-CM holders consistently earn 12–20% more than uncredentialed peers and have exclusive access to City Manager and County Administrator roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Growing Municipalities and Smart City Program Director Roles',
    description: 'Growing municipalities (suburban cities, new development areas) and smart city initiatives are actively recruiting experienced municipal administrators. Your operational experience is directly applicable across jurisdictions — city manager roles pay $120–250K and offer strong pension benefits.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 17,
    deadline: '14 days',
    priority: 'critical',
  },
  {
    title: 'Build Smart City Technology and Data-Driven Governance Expertise',
    description: 'Municipal administrators who lead digital transformation — GIS systems, open data portals, 311 analytics, smart infrastructure — are among the most protected and promoted in modern government. Technology leadership signals forward-thinking governance capability.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Engage MPA Programs and Government Leadership Networks',
    description: 'Master of Public Administration (MPA) alumni networks, Government Finance Officers Association (GFOA), and National League of Cities professional communities generate passive opportunities and visible positioning for competitive city/county leadership roles.',
    layerFocus: 'network_leverage',
    riskReductionPct: 7,
    deadline: '30 days',
    priority: 'medium',
  }
);

const nonprofit_program_director: BracketPool = pool(
  {
    title: 'Quantify Program Impact: Beneficiaries Served, Outcomes Achieved, Funds Leveraged',
    description: 'Compile your program impact portfolio: beneficiaries served, outcome metrics (employment rates, health improvements, educational attainment), and grant leverage ratios (funds raised per dollar of operational budget). Nonprofit directors who communicate impact in funder language are far more protected during budget cycles.',
    layerFocus: 'career_velocity',
    riskReductionPct: 13,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Develop Grant Writing and Major Donor Fundraising Expertise',
    description: 'Program directors with proven fundraising capability — whether federal grants, foundation grants, or major donor cultivation — are among the most protected in nonprofit organizations. Your program expertise combined with fundraising skill is the highest-value combination in the sector.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 17,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Social Enterprise, Impact Investing, and CSR Program Director Roles',
    description: 'Social enterprises, corporate foundations, and impact investors increasingly hire from nonprofit program leadership. Your community development, program evaluation, and stakeholder management skills translate directly to ESG program directors and corporate social responsibility VP roles at 30–50% compensation premiums.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Data-Driven Impact Measurement and Salesforce NPSP Proficiency',
    description: 'Nonprofits with rigorous data-driven impact measurement (Theory of Change, logic models, SROI analysis) consistently outcompete for grants. Salesforce Nonprofit Success Pack (NPSP) proficiency is rapidly becoming the sector standard for CRM and program management.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Engage Foundation Program Officers and Sector Capacity Building Networks',
    description: 'Strong relationships with foundation program officers are the most valuable career protection asset in the nonprofit sector — they generate both funding and referrals during leadership transitions. Participate in sector-wide capacity building networks (BoardSource, Alliance for Nonprofit Management).',
    layerFocus: 'network_leverage',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const defense_contractor_engineer: BracketPool = pool(
  {
    title: 'Maintain Security Clearance and Document Program Contribution Record',
    description: 'Ensure your security clearance (Secret, Top Secret, TS/SCI as applicable) is current and document your program contributions in unclassified terms: systems delivered, testing milestones achieved, CDRL deliverables completed. Defense contractors with active clearances are among the most protected engineering roles in any economy.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 20,
    deadline: '3 days',
    priority: 'high',
  },
  {
    title: 'Build Systems Engineering and MBSE Proficiency for Defense Programs',
    description: 'Model-Based Systems Engineering (MBSE) with DoD-relevant tools (DOORS Next, Cameo, SysML) is rapidly becoming required on major defense programs. Engineers who lead MBSE transformation on their programs gain program protection and promotion track access.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target Cleared Defense Contractor and Government Agency Direct Hire Openings',
    description: 'With an active clearance, your market is the entire cleared contractor ecosystem (Lockheed, Northrop, Raytheon, L3Harris, SAIC, Leidos, Booz Allen) plus GS/WG government direct hire positions. These roles have near-zero unemployment rates for cleared engineers with program experience.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 24,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Develop AI/ML Integration Knowledge for Next-Generation Defense Systems',
    description: 'DOD AI strategy (JAIC/CDAO) is driving AI integration into virtually all major defense programs. Defense engineers who understand AI integration for autonomous systems, ISR, and C2 are uniquely positioned at the intersection of defense domain knowledge and AI capability.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 13,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Engage DAU Training and Professional Military Education Networks',
    description: 'Defense Acquisition University (DAU) certification, professional military education alumni networks, and AFCEA participation build relationships that generate opportunities across the defense industrial base — the clearance requirement keeps competition artificially constrained.',
    layerFocus: 'network_leverage',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

// ─── EDUCATION ────────────────────────────────────────────────────────────────

const university_professor: BracketPool = pool(
  {
    title: 'Assess Tenure Status and Compile Research Impact Portfolio (H-Index, Citations)',
    description: 'If pre-tenure: immediately assess your tenure case strength (publications, citations, H-index, external grants). If tenured: tenure is your primary career protection — document it explicitly in any negotiation. Pre-tenure academics in financial-distress institutions face layoff risk; tenured faculty have near-absolute protection in most jurisdictions.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 20,
    deadline: '3 days',
    priority: 'high',
  },
  {
    title: 'Secure Externally-Funded Research Grants Before Institutional Cuts',
    description: 'External grant funding (NSF, NIH, DARPA, private foundations) creates financial independence from institutional budget cycles and provides implicit protection. PI/co-PI status on active grants is the strongest protection a pre-tenure faculty member can have during institutional financial distress.',
    layerFocus: 'career_resilience',
    riskReductionPct: 22,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Activate Academic Network and Apply to Comparable Institutions with Tenure Openings',
    description: 'Tenured faculty job searches operate through very specific channels: Chronicle of Higher Education, HigherEdJobs, disciplinary society job boards, and direct department chair networking. Begin exploring immediately — academic searches run 9–14 months from application to start date.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '14 days',
    priority: 'critical',
  },
  {
    title: 'Build Industry Consulting and Executive Education Parallel Income Stream',
    description: 'Most universities permit faculty to consult 1 day per week. Industry consulting rates for domain-expert academics range from $150–500/hr. Building a consulting practice now reduces financial dependence on any single institution and builds industry bridge relationships for future transitions.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Develop Online Course IP and Academic-to-Industry Transition Options',
    description: 'Massive Open Online Course (MOOC) platform content (Coursera, edX, Udemy, NPTEL) owned by faculty can generate passive income and builds public academic brand. Industry transitions for academics typically require 12–24 months of networking — start the bridge-building now.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 8,
    deadline: '60 days',
    priority: 'medium',
  }
);

const K12_teacher: BracketPool = pool(
  {
    title: 'Verify Tenure/Seniority Status and Union Protections in Your District',
    description: 'In most US public school districts, teacher tenure and union seniority rules determine layoff order — not performance. Verify your tenure status and seniority standing in your district. If not yet tenured, this is your primary vulnerability. If tenured and senior, your position is far more protected than most professions.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '3 days',
    priority: 'high',
  },
  {
    title: 'Earn National Board Certification or Subject-Matter Endorsement',
    description: 'National Board Certification is the highest credential in K-12 teaching and generates salary stipends in most states and districts. Dual-subject endorsements (special education + content area, or ESL + content area) dramatically reduce layoff risk by increasing your cross-assignment utility.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 17,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target High-Need Subject Areas and International Teaching Opportunities',
    description: 'STEM, special education, and bilingual teaching positions face systemic shortages in virtually every US state and internationally. If you hold credentials in shortage areas, apply to districts with better compensation and stability. International teaching positions (DOD schools, American international schools) pay 20–40% premiums.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '14 days',
    priority: 'critical',
  },
  {
    title: 'Build EdTech Fluency and Instructional Design Credentials for Corporate Training Pivot',
    description: 'Teachers with strong instructional design methodology and LMS proficiency (Canvas, Blackboard, iSpring) can pivot to corporate L&D, curriculum development, and ed-tech company instructional design roles at 30–60% compensation premiums. Build the portfolio now.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 13,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Develop Online Tutoring and Private Practice for Income Supplementation',
    description: 'Certified teachers earn $50–120/hr as online tutors (Varsity Tutors, Wyzant, Tutor.com, direct via LinkedIn). Building even a small tutoring practice (5–8 hours/week) creates income protection and business development skills applicable to independent practice.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '21 days',
    priority: 'medium',
  }
);

const instructional_designer: BracketPool = pool(
  {
    title: 'Compile Portfolio of Courses Designed with Measurable Learning Outcomes',
    description: 'Build a portfolio demonstrating completion rates, knowledge retention improvements, and performance uplift from courses you\'ve designed. Corporate instructional designers without measurable ROI data are vulnerable during L&D budget cuts — your outcomes data is your protection.',
    layerFocus: 'career_velocity',
    riskReductionPct: 14,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Master AI-Augmented Course Authoring Tools (Articulate AI, Adobe Learning Manager)',
    description: 'AI-augmented authoring tools (Articulate Rise AI, Adobe Captivate AI, 360Learning) are transforming instructional design productivity. IDs who leverage AI for rapid content creation while maintaining design quality 3–5× their throughput — this skill is the primary protection against role elimination.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 18,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Learning Experience Design (LXD) and Performance Consulting Roles',
    description: 'Learning Experience Design and Performance Consulting roles in tech companies, management consulting firms, and large enterprises pay 30–50% more than traditional ID roles in education and government. Your design expertise is highly portable across sectors.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Earn ATD CPTD (Certified Professional in Talent Development) Credential',
    description: 'Association for Talent Development (ATD) CPTD is the highest formal credential in learning and development. CPTD holders access senior learning strategist, Chief Learning Officer track roles, and consulting engagements that are not accessible to uncredentialed IDs.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 13,
    deadline: '90 days',
    priority: 'medium',
  },
  {
    title: 'Develop Freelance Course Design Practice for Corporate and Ed-Tech Clients',
    description: 'Freelance instructional designers earn $75–150/hr working for ed-tech platforms (Coursera, LinkedIn Learning), corporate L&D departments, and training companies. Building a freelance client base provides income protection and portfolio diversity.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const corporate_trainer: BracketPool = pool(
  {
    title: 'Quantify Training Effectiveness: Knowledge Retention, Behavior Change, and Business Impact',
    description: 'Apply Kirkpatrick Model Level 3/4 measurement to your recent training programs and compile the results. Corporate trainers who can demonstrate measurable business impact (sales uplift, error reduction, onboarding speed) are protected from L&D budget cuts that eliminate purely activity-based training programs.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Specialize in Sales Enablement, Leadership Development, or Compliance Training',
    description: 'Specialization in high-ROI training domains (sales enablement, leadership development, compliance, technical onboarding) creates negotiation leverage and dramatically expands your role options. Generalist corporate trainers are the most vulnerable to restructuring and AI content generation replacement.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Sales Enablement and Revenue Productivity Roles in High-Growth Tech',
    description: 'Sales enablement at tech companies (which values measurable revenue productivity impact) pays 40–70% more than traditional corporate training roles. Your facilitation, curriculum design, and learning assessment skills transfer directly. Apply to 3 sales enablement openings this week.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build Virtual Reality and Immersive Learning Development Skills',
    description: 'VR-based training (Strivr, Mursion, Virti) is expanding rapidly in safety training, medical simulation, and customer service. Corporate trainers who can design for immersive learning environments are entering a niche with very high compensation premiums and minimal competition.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Develop Independent Corporate Training and Facilitation Practice',
    description: 'Experienced corporate facilitators earn $2,500–8,000/day for executive workshops, leadership retreats, and team effectiveness programs. Building a consulting practice alongside employment creates income protection and reduces employer dependency.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '30 days',
    priority: 'medium',
  }
);

// ─── MAIN EXPORTS ─────────────────────────────────────────────────────────────

export const ACTION_DB_AUTO_TELECOM_GOVT_EDUCATION: Record<string, BracketPool> = {
  // Automotive
  automotive_engineer,
  ev_battery_engineer,
  adas_engineer,
  automotive_program_manager,
  // Telecom
  network_engineer_telecom,
  telecom_product_manager,
  rf_engineer,
  // Government
  government_policy_analyst,
  municipal_administrator,
  nonprofit_program_director,
  defense_contractor_engineer,
  // Education
  university_professor,
  K12_teacher,
  instructional_designer,
  corporate_trainer,
};

export const ALIAS_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION: Record<string, string> = {
  // Automotive
  'Automotive Engineer': 'automotive_engineer',
  'Vehicle Engineer': 'automotive_engineer',
  'Chassis Engineer': 'automotive_engineer',
  'Powertrain Engineer': 'automotive_engineer',
  'NVH Engineer': 'automotive_engineer',
  'EV Battery Engineer': 'ev_battery_engineer',
  'Battery Engineer': 'ev_battery_engineer',
  'Cell Engineer': 'ev_battery_engineer',
  'Electrochemical Engineer': 'ev_battery_engineer',
  'Battery Systems Engineer': 'ev_battery_engineer',
  'ADAS Engineer': 'adas_engineer',
  'Autonomous Systems Engineer': 'adas_engineer',
  'Perception Engineer': 'adas_engineer',
  'Self-Driving Engineer': 'adas_engineer',
  'Automotive Program Manager': 'automotive_program_manager',
  'Vehicle Program Manager': 'automotive_program_manager',
  'Platform Program Manager Auto': 'automotive_program_manager',
  // Telecom
  'Network Engineer Telecom': 'network_engineer_telecom',
  'Telecommunications Engineer': 'network_engineer_telecom',
  '5G Network Engineer': 'network_engineer_telecom',
  'RAN Engineer': 'network_engineer_telecom',
  'Core Network Engineer': 'network_engineer_telecom',
  'Telecom Product Manager': 'telecom_product_manager',
  'Product Manager Telecommunications': 'telecom_product_manager',
  'Connectivity Product Manager': 'telecom_product_manager',
  'RF Engineer': 'rf_engineer',
  'Radio Frequency Engineer': 'rf_engineer',
  'Wireless Engineer': 'rf_engineer',
  'RF Optimization Engineer': 'rf_engineer',
  'Spectrum Engineer': 'rf_engineer',
  // Government
  'Policy Analyst': 'government_policy_analyst',
  'Government Policy Analyst': 'government_policy_analyst',
  'Public Policy Analyst': 'government_policy_analyst',
  'Legislative Analyst': 'government_policy_analyst',
  'City Manager': 'municipal_administrator',
  'Municipal Administrator': 'municipal_administrator',
  'City Administrator': 'municipal_administrator',
  'County Administrator': 'municipal_administrator',
  'Town Manager': 'municipal_administrator',
  'Nonprofit Program Director': 'nonprofit_program_director',
  'Program Director Nonprofit': 'nonprofit_program_director',
  'Executive Director Nonprofit': 'nonprofit_program_director',
  'NGO Program Manager': 'nonprofit_program_director',
  'Defense Engineer': 'defense_contractor_engineer',
  'Defense Contractor Engineer': 'defense_contractor_engineer',
  'Cleared Engineer': 'defense_contractor_engineer',
  'Systems Engineer Defense': 'defense_contractor_engineer',
  // Education
  'University Professor': 'university_professor',
  'Assistant Professor': 'university_professor',
  'Associate Professor': 'university_professor',
  'Full Professor': 'university_professor',
  'Faculty Member': 'university_professor',
  'Academic Researcher': 'university_professor',
  'Lecturer University': 'university_professor',
  'Teacher': 'K12_teacher',
  'K12 Teacher': 'K12_teacher',
  'School Teacher': 'K12_teacher',
  'High School Teacher': 'K12_teacher',
  'Middle School Teacher': 'K12_teacher',
  'Elementary School Teacher': 'K12_teacher',
  'Instructional Designer': 'instructional_designer',
  'Learning Experience Designer': 'instructional_designer',
  'Curriculum Developer': 'instructional_designer',
  'E-Learning Developer': 'instructional_designer',
  'Corporate Trainer': 'corporate_trainer',
  'Training Specialist': 'corporate_trainer',
  'L&D Specialist': 'corporate_trainer',
  'Learning and Development Specialist': 'corporate_trainer',
  'Facilitator': 'corporate_trainer',
};

export const CANONICAL_GROUP_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION: Record<string, string> = {
  automotive_engineer: 'automotive_engineer',
  ev_battery_engineer: 'ev_battery_engineer',
  adas_engineer: 'adas_engineer',
  automotive_program_manager: 'automotive_program_manager',
  network_engineer_telecom: 'network_engineer_telecom',
  telecom_product_manager: 'telecom_product_manager',
  rf_engineer: 'rf_engineer',
  government_policy_analyst: 'government_policy_analyst',
  municipal_administrator: 'municipal_administrator',
  nonprofit_program_director: 'nonprofit_program_director',
  defense_contractor_engineer: 'defense_contractor_engineer',
  university_professor: 'university_professor',
  K12_teacher: 'K12_teacher',
  instructional_designer: 'instructional_designer',
  corporate_trainer: 'corporate_trainer',
};

export const DEMAND_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION: Record<string, {
  demandIndex: number;
  demandTrend: 'surging' | 'rising' | 'stable' | 'declining' | 'falling';
  jobOpeningsTrend: 'surging' | 'rising' | 'stable' | 'declining' | 'falling';
  aiSubstitutionRisk: number;
  topHiringLocations: string[];
  averageDaysToFill: number;
  remoteWorkFeasibility: 'high' | 'medium' | 'low';
  dataAsOf: string;
}> = {
  automotive_engineer: {
    demandIndex: 74,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['Detroit', 'Stuttgart', 'Munich', 'Tokyo', 'Pune', 'Shanghai', 'Seoul'],
    averageDaysToFill: 42,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  ev_battery_engineer: {
    demandIndex: 92,
    demandTrend: 'surging',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.10,
    topHiringLocations: ['Bay Area', 'Detroit', 'Germany', 'South Korea', 'China (Shenzhen/Shanghai)', 'Japan', 'India'],
    averageDaysToFill: 72,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  adas_engineer: {
    demandIndex: 89,
    demandTrend: 'surging',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.12,
    topHiringLocations: ['Bay Area', 'Detroit', 'Austin', 'Pittsburgh', 'Germany', 'Israel', 'Beijing', 'Shanghai'],
    averageDaysToFill: 68,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  automotive_program_manager: {
    demandIndex: 72,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.16,
    topHiringLocations: ['Detroit', 'Stuttgart', 'Munich', 'Tokyo', 'Pune', 'Seoul'],
    averageDaysToFill: 48,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  network_engineer_telecom: {
    demandIndex: 78,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.20,
    topHiringLocations: ['US Metro Areas', 'India (Bangalore, Hyderabad, Pune)', 'UK', 'Germany', 'Singapore', 'UAE'],
    averageDaysToFill: 38,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  telecom_product_manager: {
    demandIndex: 75,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['Bangalore', 'London', 'New York', 'Dallas', 'Singapore', 'Dubai'],
    averageDaysToFill: 42,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  rf_engineer: {
    demandIndex: 80,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.16,
    topHiringLocations: ['US (Dallas, Atlanta, Chicago)', 'India (Bangalore, Hyderabad)', 'Sweden', 'Finland', 'South Korea'],
    averageDaysToFill: 48,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  government_policy_analyst: {
    demandIndex: 65,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.22,
    topHiringLocations: ['Washington DC', 'Brussels', 'London', 'Delhi', 'Canberra', 'Ottawa'],
    averageDaysToFill: 55,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  municipal_administrator: {
    demandIndex: 64,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['US nationwide', 'India (State capitals, Tier 2 cities)', 'UK Local Government', 'Canada'],
    averageDaysToFill: 65,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  nonprofit_program_director: {
    demandIndex: 66,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.16,
    topHiringLocations: ['US (DC, NY, SF, Chicago)', 'India (Delhi, Mumbai, Bangalore)', 'UK', 'Canada', 'East Africa'],
    averageDaysToFill: 52,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  defense_contractor_engineer: {
    demandIndex: 82,
    demandTrend: 'rising',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.12,
    topHiringLocations: ['Washington DC Metro', 'Huntsville AL', 'San Diego', 'Colorado Springs', 'Dayton OH', 'Boston'],
    averageDaysToFill: 80,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  university_professor: {
    demandIndex: 55,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['US University Towns', 'UK (Russell Group)', 'India (IIT/IIM/NIT cities)', 'Singapore', 'Canada'],
    averageDaysToFill: 180,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  K12_teacher: {
    demandIndex: 72,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.16,
    topHiringLocations: ['US nationwide (shortage areas)', 'India nationwide', 'UK', 'Australia', 'International schools (Middle East, SEA)'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  instructional_designer: {
    demandIndex: 74,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.32,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'New York', 'Chicago', 'London', 'Remote (global)'],
    averageDaysToFill: 30,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  corporate_trainer: {
    demandIndex: 66,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['Bangalore', 'Mumbai', 'New York', 'Chicago', 'London', 'Singapore'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
};

export const COMPENSATION_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION: Record<string, {
  bands: { '0-2': number; '3-5': number; '6-9': number; '10-14': number; '15+': number };
  currency: 'USD' | 'INR';
  salaryTrend: 'rising' | 'stable' | 'falling';
  inrBands?: { '0-2': number; '3-5': number; '6-9': number; '10-14': number; '15+': number };
}> = {
  automotive_engineer: {
    bands: { '0-2': 72000, '3-5': 95000, '6-9': 122000, '10-14': 150000, '15+': 185000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 800000, '3-5': 1400000, '6-9': 2500000, '10-14': 4000000, '15+': 6500000 },
  },
  ev_battery_engineer: {
    bands: { '0-2': 105000, '3-5': 140000, '6-9': 180000, '10-14': 225000, '15+': 280000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1500000, '3-5': 2800000, '6-9': 5000000, '10-14': 8000000, '15+': 14000000 },
  },
  adas_engineer: {
    bands: { '0-2': 110000, '3-5': 148000, '6-9': 188000, '10-14': 232000, '15+': 285000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1600000, '3-5': 3000000, '6-9': 5500000, '10-14': 9000000, '15+': 15000000 },
  },
  automotive_program_manager: {
    bands: { '0-2': 85000, '3-5': 112000, '6-9': 145000, '10-14': 178000, '15+': 220000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 1200000, '3-5': 2200000, '6-9': 4000000, '10-14': 6500000, '15+': 10000000 },
  },
  network_engineer_telecom: {
    bands: { '0-2': 78000, '3-5': 102000, '6-9': 132000, '10-14': 162000, '15+': 198000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 900000, '3-5': 1600000, '6-9': 3000000, '10-14': 5000000, '15+': 8000000 },
  },
  telecom_product_manager: {
    bands: { '0-2': 95000, '3-5': 125000, '6-9': 158000, '10-14': 192000, '15+': 235000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1300000, '3-5': 2400000, '6-9': 4500000, '10-14': 7500000, '15+': 12000000 },
  },
  rf_engineer: {
    bands: { '0-2': 82000, '3-5': 108000, '6-9': 138000, '10-14': 170000, '15+': 210000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1000000, '3-5': 1900000, '6-9': 3500000, '10-14': 5800000, '15+': 9500000 },
  },
  government_policy_analyst: {
    bands: { '0-2': 52000, '3-5': 68000, '6-9': 88000, '10-14': 108000, '15+': 135000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2400000, '15+': 4000000 },
  },
  municipal_administrator: {
    bands: { '0-2': 62000, '3-5': 85000, '6-9': 115000, '10-14': 148000, '15+': 195000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 1000000, '6-9': 1800000, '10-14': 3200000, '15+': 5500000 },
  },
  nonprofit_program_director: {
    bands: { '0-2': 52000, '3-5': 68000, '6-9': 88000, '10-14': 108000, '15+': 132000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2200000, '15+': 3800000 },
  },
  defense_contractor_engineer: {
    bands: { '0-2': 92000, '3-5': 122000, '6-9': 155000, '10-14': 190000, '15+': 235000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1200000, '3-5': 2400000, '6-9': 4500000, '10-14': 7500000, '15+': 12000000 },
  },
  university_professor: {
    bands: { '0-2': 75000, '3-5': 98000, '6-9': 130000, '10-14': 165000, '15+': 215000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 700000, '3-5': 1200000, '6-9': 2200000, '10-14': 4000000, '15+': 7000000 },
  },
  K12_teacher: {
    bands: { '0-2': 42000, '3-5': 52000, '6-9': 65000, '10-14': 78000, '15+': 92000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 350000, '3-5': 550000, '6-9': 900000, '10-14': 1500000, '15+': 2500000 },
  },
  instructional_designer: {
    bands: { '0-2': 55000, '3-5': 72000, '6-9': 92000, '10-14': 115000, '15+': 142000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 1000000, '6-9': 1800000, '10-14': 3000000, '15+': 5000000 },
  },
  corporate_trainer: {
    bands: { '0-2': 48000, '3-5': 62000, '6-9': 80000, '10-14': 100000, '15+': 125000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2400000, '15+': 4000000 },
  },
};

export const NEGOTIATION_ADDITIONS_AUTO_TELECOM_GOVT_EDUCATION: Record<string, {
  primaryLeverage: string;
  scriptTemplate: string;
  alternativeLeverage: string[];
  leverageScore: number;
  bestTiming: string;
}> = {
  ev_battery_engineer: {
    primaryLeverage: 'Compound-specific chemistry IP and BMS algorithm ownership',
    scriptTemplate: 'My electrochemical expertise on [chemistry type/cell format] and the BMS algorithms I\'ve developed are specific to our battery architecture. Replacing this expertise would require 12–18 months of onboarding while our [program] launch timeline is [X] months away. To continue delivering on our EV roadmap, I need [ask].',
    alternativeLeverage: ['Patent inventorship creating IP continuity requirement', 'Safety-critical BMS algorithm knowledge specific to cell chemistry', 'Cell supplier relationship and characterization data history'],
    leverageScore: 82,
    bestTiming: 'Before critical program milestones; when new cell chemistry contracts are being signed',
  },
  adas_engineer: {
    primaryLeverage: 'Safety case ownership and type-approval certification knowledge',
    scriptTemplate: 'I own the ISO 26262 safety case for [feature/system] at ASIL-[X] level, with full knowledge of our V&V corpus and regulatory type-approval history. Replacing this knowledge mid-program would require 6–12 months of ramp-up and may delay our [regulatory certification] by [N] months. To keep our safety program on track, I need [ask].',
    alternativeLeverage: ['Sensor fusion algorithm tuning knowledge specific to our vehicle platform', 'Regulator relationship history on specific type-approval submissions', 'Test coverage knowledge that exists only in tribal institutional memory'],
    leverageScore: 79,
    bestTiming: 'Before safety gate milestones; during type-approval review cycles',
  },
  defense_contractor_engineer: {
    primaryLeverage: 'Active security clearance and program-specific classified knowledge',
    scriptTemplate: 'My [TS/SCI] clearance took [X] months and $[Y]K to obtain and requires continuous reinvestigation. My knowledge of [program] is classified and cannot be transferred to an uncleaned replacement without significant mission risk. Finding a cleared engineer with equivalent [platform/domain] expertise typically takes 6–18 months. To maintain program continuity, I need [ask].',
    alternativeLeverage: ['Classified system architecture knowledge that cannot be documented', 'Government customer relationship and personnel trust factor', 'CPSR audit readiness and government property accountability history'],
    leverageScore: 80,
    bestTiming: 'Before option period exercise; during government IDIQ/task order award cycles',
  },
  university_professor: {
    primaryLeverage: 'Tenure protection and research grant funding dependency',
    scriptTemplate: 'As a tenured professor, my position carries contractual protection under AAUP guidelines. My active grants — [NSF/NIH Grant X], totaling [$Y] in overhead recovery to the institution — require my continued PI status. Any change to my position would also trigger return of [N]% of indirect cost recovery per grant agreement. To maintain our research program\'s momentum, I need [ask].',
    alternativeLeverage: ['PhD student supervision continuity — students cannot be reassigned mid-research', 'External grant overhead recovery that will be forfeited if PI position is eliminated', 'External funding pipeline: pending proposals totaling $[X] in anticipated overhead'],
    leverageScore: 72,
    bestTiming: 'During department budget review; before grant submission deadlines',
  },
  network_engineer_telecom: {
    primaryLeverage: 'Network reliability record and architecture-specific configuration knowledge',
    scriptTemplate: 'Our network has maintained [X]% uptime SLA through [N] years of my direct engineering ownership. The configuration management, vendor escalation protocols, and architecture documentation I\'ve built represents years of institutional knowledge. A transition during our [5G rollout/upgrade cycle] would introduce significant outage risk during a period when SLA violations cost $[Y]/minute. To ensure network continuity, I need [ask].',
    alternativeLeverage: ['Vendor relationship and escalation privilege history with equipment manufacturers', 'Architecture documentation that is currently person-dependent', 'Capacity planning models calibrated to our specific traffic patterns'],
    leverageScore: 66,
    bestTiming: 'Before major network upgrade cycles; ahead of SLA renewal periods',
  },
  nonprofit_program_director: {
    primaryLeverage: 'Funder relationships and grant renewal continuity',
    scriptTemplate: 'I manage $[X]M in active grant relationships with [Foundation/Agency] and [Foundation]. These relationships are personal — grant officers at major foundations consistently cite program leadership continuity as a factor in renewal decisions. A leadership transition now risks the $[Y] renewal decision currently pending with [Funder]. To protect our funding pipeline, I need [ask].',
    alternativeLeverage: ['Beneficiary relationships and community trust that cannot be transferred quickly', 'Government contract compliance history and relationship with agency contract officers', 'Partnership and coalition relationships that are person-specific'],
    leverageScore: 58,
    bestTiming: 'Before major grant renewal cycles; ahead of annual funding decisions',
  },
  automotive_engineer: {
    primaryLeverage: 'DFMEA ownership and program-specific engineering knowledge',
    scriptTemplate: 'I own the DFMEA and APQP documentation for [system/module] on [program]. This knowledge is embedded in active supplier tooling contracts and validation sign-offs — replacing me mid-program would require re-validation at an estimated cost of $[X] and [Y] months. To protect program timing and quality targets, I need [ask].',
    alternativeLeverage: ['Supplier technical relationship and design-intent knowledge that exists tribally', 'Test correlation data and calibration history specific to our vehicle platform', 'Cross-functional program team relationships developed over the APQP lifecycle'],
    leverageScore: 65,
    bestTiming: 'Before program quality gate milestones; before Job 1 dates',
  },
  K12_teacher: {
    primaryLeverage: 'Tenure/seniority protection and shortage-area credential',
    scriptTemplate: 'As a [tenured/permanent] teacher with [X] years of seniority, district reduction-in-force procedures require that I be among the last teachers reduced in my certification area. Additionally, my [STEM/SPED/Bilingual] credential places me in the shortage area pool, which provides additional procedural protection. I want to understand how the district\'s plans account for these protections.',
    alternativeLeverage: ['Community relationships with families and PTAs that represent soft political protection', 'Continuity value for students with multi-year learning plans (IEPs, ELL plans)', 'Mentorship role for pre-tenure colleagues whose continuity depends on program leadership'],
    leverageScore: 52,
    bestTiming: 'Before district budget adoption; during union contract renewal cycles',
  },
  corporate_trainer: {
    primaryLeverage: 'Training program ROI and sales productivity attribution',
    scriptTemplate: 'The sales training program I designed contributed to [X]% improvement in rep quota attainment, saving approximately $[Y] in recruiting and onboarding costs for underperforming reps. The onboarding programs I own are currently the primary integration point for [N] new hires per quarter. Eliminating this function would add 30–60 days to new hire ramp time and cost $[Z] in lost productivity. To protect these outcomes, I need [ask].',
    alternativeLeverage: ['Institutional knowledge of learning management system configuration and reporting', 'Manager relationships and facilitation credibility that cannot be quickly rebuilt', 'Compliance training records and audit documentation that create legal risk if disrupted'],
    leverageScore: 55,
    bestTiming: 'After demonstrable training ROI data; before performance review cycles',
  },
};
