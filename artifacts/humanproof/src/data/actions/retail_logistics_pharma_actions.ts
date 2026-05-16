// Retail, Logistics, Agriculture & Pharma action pools — v37.0
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

// ─── RETAIL ───────────────────────────────────────────────────────────────────

const retail_store_manager: BracketPool = pool(
  {
    title: 'Document Store P&L Ownership and Revenue Outcomes',
    description: 'Compile a clear record of P&L responsibility, YoY revenue growth, shrinkage control, and NPS scores. Store-level financial ownership is the primary negotiation lever and the primary signal for regional/district manager promotion tracks.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Quantify Store Metrics and Build District-Level Network',
    description: 'Compile store KPIs (comp sales, conversion rate, units per transaction, shrink %) and begin building relationships with district managers and field HR. Retail at this level runs on demonstrated metrics, not resumes — own your numbers.',
    layerFocus: 'career_velocity',
    riskReductionPct: 17,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Activate Multi-Brand Senior Retail Network and Explore District/Regional Roles',
    description: 'Use tenure, P&L record, and volume responsibility to target District Manager, Area VP, or Retail Operations Director openings. Retail leadership portability across brands (fashion → electronics → grocery) is higher than most assume — lead with volume and people management scope.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Certify in Retail Loss Prevention and Workforce Management Tools',
    description: 'Complete certifications in Kronos/UKG (workforce scheduling) or loss prevention management. These credentials expand optionality into loss prevention director, operations manager, or corporate retail training roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 9,
    deadline: '30 days',
    priority: 'medium',
  },
  {
    title: 'Build Retail-to-Corporate Transition Bridge',
    description: 'Identify corporate retail functions (buying, planning, visual merchandising, store operations) that value field store experience and begin informational conversations. Store GMs with strong P&L records transition to corporate operations at 40–60% of attempts.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 7,
    deadline: '45 days',
    priority: 'medium',
  }
);

const e_commerce_manager: BracketPool = pool(
  {
    title: 'Document Attribution-Verified Revenue Impact for E-Commerce Portfolio',
    description: 'Build a concise record of attributed GMV growth, ROAS improvement, CAC reduction, and conversion rate lifts across channels. E-commerce roles without measurable attribution data lose 40% of negotiation leverage — own your numbers with GA4 or platform-native attribution.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in Marketplace Platforms and Run Competitor GMV Analysis',
    description: 'Get certified in Amazon Seller Central, Shopify Plus, or Shopee/Lazada depending on your market. Run a competitor GMV analysis for your category to validate your market position — this becomes a concrete negotiation artifact and interview signal.',
    layerFocus: 'career_velocity',
    riskReductionPct: 18,
    deadline: '14 days',
    priority: 'high',
  },
  {
    title: 'Target Director of E-Commerce or Head of Digital Commerce Roles Across Verticals',
    description: 'E-commerce expertise is horizontally portable across fashion, FMCG, electronics, and DTC. Your channel expertise (Amazon SEO, performance marketing, marketplace ops) compounds as a director-level credential — activate LinkedIn for inbound from e-commerce directors at comparable GMV brands.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Proficiency in Headless Commerce and Composable Architecture',
    description: 'Understand headless/composable commerce stacks (Contentful, Commerce Layer, BigCommerce headless). Technical fluency in modern e-commerce architecture moves e-commerce managers from operator to strategist-level compensation bands.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore DTC Brand and Venture-Backed E-Commerce Startup Opportunities',
    description: 'DTC startups ($5M–$50M ARR stage) consistently seek experienced e-commerce leads with marketplace and performance marketing expertise. These roles often include meaningful equity and faster path to VP scope than corporate ladders.',
    layerFocus: 'offer_evaluation',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const merchandising_manager: BracketPool = pool(
  {
    title: 'Compile Buy-to-Sell Ratio and Margin Impact Record',
    description: 'Document your category sell-through rate, average margin improvement, markdown reduction, and inventory turn. Merchandising leverage is entirely built on margin outcomes — without this data, negotiation falls back to generic salary benchmarking.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue Certified Retail Analyst (CRA) or APICS CPIM Credential',
    description: 'Complete the Certified Retail Analyst credential or APICS CPIM for supply chain integration. Merchandising managers with formal demand planning or supply chain credentials transition more readily into buying director or category VP tracks.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Activate Buyer and Merchandise Planning Network at Competing Retailers',
    description: 'Use category expertise and vendor relationships to connect with buying directors and merchandise VPs at competing retailers. Vendor-side roles (category management at CPG companies) offer 20–30% compensation premiums for strong retail buyers.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '14 days',
    priority: 'critical',
  },
  {
    title: 'Build Expertise in AI-Powered Demand Forecasting Platforms',
    description: 'Gain hands-on experience with Relex Solutions, o9 Solutions, or Blue Yonder AI forecasting. Merchandising managers with AI demand planning fluency are insulated from automation displacement and command 15–25% higher compensation.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Explore Private Label Development and Brand Management Pivot',
    description: 'Private label development is a growing function inside major retailers (Target, Walmart) and DTC brands. Your category expertise positions you for Private Label Director or Brand Manager roles that carry higher autonomy and margins.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 7,
    deadline: '45 days',
    priority: 'medium',
  }
);

const retail_operations_analyst: BracketPool = pool(
  {
    title: 'Quantify Operational Efficiency Wins and Process Improvements',
    description: 'Document specific process improvements: shrink reduction %, labor cost saved, fulfillment time improvements, store compliance scores elevated. Retail operations analysts without quantified impact are easily displaced — your outcomes are your differentiation.',
    layerFocus: 'career_velocity',
    riskReductionPct: 13,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Master Retail Analytics Platforms and Power BI/Tableau Dashboarding',
    description: 'Develop proficiency in retail analytics tools (Tableau, Power BI, Looker) and retail-specific platforms (JDA, Blue Yonder, Oracle Retail). Data visualization skills move retail ops analysts into senior analyst and operations strategy roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Retail Strategy Analyst and Store Operations Manager Roles',
    description: 'Retail operations analytics experience translates directly to store operations management, field operations analyst, or retail strategy consulting roles. Apply to 3 target companies this week with portfolio of metrics-driven operational improvements.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Get Certified in Lean Six Sigma Green Belt for Retail Operations',
    description: 'A Lean Six Sigma Green Belt credential signals process improvement rigor to retail operations leaders and opens supply chain and continuous improvement career paths. Certification pairs well with retail domain knowledge.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Pursue SQL and Python Proficiency for Retail Data Queries',
    description: 'Develop SQL and basic Python skills for retail data analysis. Analysts who can query databases directly (without waiting for data teams) 2-3x their productivity and move into senior analyst, data analyst, or business intelligence tracks.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

const inventory_planner: BracketPool = pool(
  {
    title: 'Document Forecast Accuracy Rate and Stockout/Overstock Reduction Record',
    description: 'Compile your MAPE (Mean Absolute Percentage Error) improvement, stockout reduction rate, and inventory carrying cost reduction. Inventory planners with documented forecast accuracy improvements are 3× less likely to be included in workforce reductions.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in APICS CPIM or IBF Certification in Business Forecasting',
    description: 'Complete APICS Certified in Planning and Inventory Management (CPIM) or IBF\'s Certified Professional Forecaster (CPF). These credentials are the gold standard in demand planning and unlock mid-to-senior supply chain planning roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 17,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Demand Planner and Supply Chain Planning Roles Outside Current Sector',
    description: 'Inventory planning expertise transfers across verticals (retail → FMCG → pharma → automotive). Pharma and medical device planning roles pay 20–35% premiums over retail planning. Activate supply chain networks and apply cross-sector.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Proficiency in AI Demand Planning Tools (Relex, o9, Kinaxis)',
    description: 'Hands-on experience with AI-augmented planning tools (Relex, o9 Solutions, Kinaxis RapidResponse) is rapidly becoming the differentiator between planners who get retained and those who get automated. Prioritize platform training now.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore S&OP Process Ownership and Cross-Functional Planning Roles',
    description: 'Sales & Operations Planning (S&OP) process ownership is a natural career step for senior inventory planners. S&OP leaders interface with finance, sales, and operations — a role that is significantly harder to automate than pure statistical forecasting.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── LOGISTICS ────────────────────────────────────────────────────────────────

const logistics_operations_manager: BracketPool = pool(
  {
    title: 'Quantify Cost-Per-Unit, On-Time Delivery, and Capacity Utilization Improvements',
    description: 'Document logistics KPIs: cost-per-shipment reduction, OTD rate improvement, dock-to-stock time, carrier claim rate. Logistics managers without quantified efficiency improvements lose negotiation leverage to managers who can speak freight economics.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue APICS CSCP or Logistics Management Professional (LMP) Certification',
    description: 'APICS Certified Supply Chain Professional (CSCP) or American Society of Transportation & Logistics LMP credential formally validates your expertise. Certification holders earn 12–18% more than uncertified peers at equivalent experience levels.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target 3PL Director and Supply Chain Operations Roles with Broader Scope',
    description: 'Logistics operations management expertise is highly portable to 3PL companies (DHL, XPO, Ryder), e-commerce fulfillment networks, and regional distribution operations. 3PL roles often pay 15–25% above enterprise internal logistics roles.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 20,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build TMS and WMS Platform Expertise (Manhattan, Blue Yonder, SAP EWM)',
    description: 'Deep proficiency in Transportation Management Systems (TMS) and Warehouse Management Systems (WMS) is the technical moat that separates logistics managers from automation displacement. Manhattan Associates, Blue Yonder, and SAP EWM are the most in-demand platforms.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Network with Freight Forwarding and Customs Brokerage Community',
    description: 'International trade compliance expertise (customs, HS codes, Incoterms, FTA rules of origin) dramatically expands logistics optionality. Even non-expert familiarity with freight forwarding operations opens Director of Global Logistics roles.',
    layerFocus: 'network_leverage',
    riskReductionPct: 7,
    deadline: '30 days',
    priority: 'medium',
  }
);

const customs_broker: BracketPool = pool(
  {
    title: 'Verify Licensed Customs Broker Credential Status and Ensure Active Standing',
    description: 'Confirm your U.S. Customs Broker License (CBP Form 3124E) or equivalent regional customs credential is current and in good standing. Licensed brokers with 5+ years experience face very low displacement risk — your license is your primary career protection asset.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 18,
    deadline: '3 days',
    priority: 'high',
  },
  {
    title: 'Document Trade Compliance Wins: Drawback Recovery, FTA Utilization, Audit Defense',
    description: 'Compile your record of duty drawback recoveries, FTA utilization savings, ISF filings, and any customs audit defense. Brokers who can quantify cost savings for their clients/employers have 2× the negotiation leverage of those who cannot.',
    layerFocus: 'career_velocity',
    riskReductionPct: 17,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Target Trade Compliance Director and Global Trade Management Roles',
    description: 'Licensed customs brokers with 5+ years of experience are consistently sought for trade compliance director, global trade manager, and import/export VP roles at Fortune 500 companies. Your regulatory knowledge is scarce — activate trade compliance professional networks.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Expertise in Trade Management Software (Amber Road, Descartes, SAP GTS)',
    description: 'Proficiency in Global Trade Management (GTM) software (Amber Road/E2open, Descartes, SAP GTS) makes trade compliance professionals valuable beyond transactional brokerage into advisory and implementation roles at major ERP/TMS vendors.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Customs Consulting and Trade Advisory Practice Development',
    description: 'Licensed customs brokers command $150–$300/hour as independent trade consultants and expert witnesses. Building a consulting practice alongside employment reduces your dependence on any single employer and compounds your credential value.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 8,
    deadline: '60 days',
    priority: 'medium',
  }
);

const freight_forwarder: BracketPool = pool(
  {
    title: 'Quantify Freight Cost Savings and On-Time Performance Record',
    description: 'Document freight cost reductions, carrier diversification that improved OTD, claims recovery success rate, and any lanes/corridors optimized. Forwarders who can quantify savings are retained during consolidations; those who cannot are treated as interchangeable.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 13,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in Incoterms 2020 and IATA DGR if Handling Hazmat/Air Cargo',
    description: 'Formal Incoterms 2020 certification and IATA Dangerous Goods Regulations (DGR) training dramatically expands freight forwarding optionality, particularly for air freight, pharmaceutical, and defense logistics roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 14,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target NVOCC, Ocean Freight, and Multi-Modal Operations Roles',
    description: 'Experienced forwarders with multi-modal expertise (ocean, air, inland) and NVOCC experience are consistently sought by global 3PLs, freight tech startups, and enterprise logistics teams. Digital freight platforms (Flexport, Freightos) seek experienced operators to guide product decisions.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Proficiency in Digital Freight Platforms and TMS Integration',
    description: 'Digital freight forwarders (Flexport, Forto, Transfix) are displacing traditional brokers. Building fluency with digital freight platforms, API-connected TMS, and real-time tracking systems positions you at the intersection of traditional logistics and tech.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Develop Specialty Lane or Commodity Expertise for Premium Positioning',
    description: 'Forwarders with deep expertise in specific corridors (transpacific, China-India, MENA) or commodities (pharma cold chain, aerospace, perishables) command 20–35% premiums and face far less price competition from digital platforms.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 7,
    deadline: '60 days',
    priority: 'medium',
  }
);

const route_optimization_analyst: BracketPool = pool(
  {
    title: 'Document Algorithm Performance Improvements and Cost-Per-Route Reduction',
    description: 'Compile measurable outcomes from route optimization work: fuel cost reduction, miles-per-delivery improvement, driver hours saved, fleet utilization gains. Analysts with outcome data are 4× more likely to survive consolidation than those without.',
    layerFocus: 'career_velocity',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Python/OR-Tools or CPLEX Proficiency for Operations Research',
    description: 'Develop or deepen proficiency in optimization libraries (Google OR-Tools, PuLP, Gurobi) and Python for logistics analytics. Route optimization analysts with hands-on algorithmic skills transition readily into data science, ML engineering, and supply chain tech roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 19,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Last-Mile Technology Startups and Supply Chain Analytics Companies',
    description: 'Last-mile tech (Onfleet, Routific, OptimoRoute) and supply chain analytics firms (project44, FourKites) actively recruit route optimization experts who understand both the math and the operational reality. These roles pay 20–40% above traditional logistics analyst compensation.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 20,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Learn GIS and Spatial Analysis for Advanced Route Intelligence',
    description: 'Geographic Information Systems (GIS) proficiency (ArcGIS, QGIS, or Python GeoPandas) elevates route optimization analysts into geospatial intelligence roles that support urban planning, e-commerce expansion, and autonomous vehicle deployment.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 9,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Contribute to Autonomous Delivery and Drone Delivery Research Communities',
    description: 'Active participation in last-mile innovation communities (Last Mile Experts Forum, autonomous delivery research networks) positions you as a thought leader in next-generation delivery operations and attracts inbound from logistics tech companies.',
    layerFocus: 'network_leverage',
    riskReductionPct: 6,
    deadline: '45 days',
    priority: 'medium',
  }
);

const warehouse_automation_specialist: BracketPool = pool(
  {
    title: 'Document Automation ROI, Throughput Improvement, and Error Rate Reduction',
    description: 'Compile the business case for automation projects you\'ve led: ROI achieved vs. projected, throughput improvement, pick accuracy improvement, labor cost impact. Automation specialists who own the full business case are far harder to displace than those who only operate equipment.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in Robotics Process Automation and AMR/AGV Systems Integration',
    description: 'Pursue vendor certifications in Autonomous Mobile Robots (AMR) platforms (6 River Systems, Locus Robotics, Fetch) or Automated Storage and Retrieval Systems (AS/RS). Vendor-certified automation specialists earn 25–40% premiums over generalist warehouse managers.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 18,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target Automation Vendor, Systems Integrator, and 3PL Automation Director Roles',
    description: 'Warehouse automation specialists are in severe shortage. Automation vendors (Dematic, Honeywell Intelligrated, Swisslog), systems integrators, and 3PLs building smart warehouses actively recruit experienced operators. Apply to 3 targets this week.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 23,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Proficiency in WCS/WMS Integration and PLC Programming Fundamentals',
    description: 'Understanding Warehouse Control Systems (WCS) integration and basic PLC (Programmable Logic Controller) programming dramatically expands your range from operator to engineer-adjacent roles. WCS integration expertise is one of the scarcest skills in modern logistics.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Director of Automation and VP of Operations Paths in E-Commerce',
    description: 'E-commerce fulfillment networks (Amazon, Flipkart, Meesho, Delhivery) are the fastest growing employers of warehouse automation leadership. Your expertise is directly transferable and these roles offer equity, scale, and career acceleration.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const transportation_analyst: BracketPool = pool(
  {
    title: 'Compile Transportation Cost Analytics and Mode-Shift Savings Record',
    description: 'Document freight spend analytics, mode optimization (air-to-ocean, LTL-to-FTL), carrier lane analysis, and any load consolidation savings. Transportation analysts without cost impact records blend into commodity analyst pools during budget cuts.',
    layerFocus: 'career_velocity',
    riskReductionPct: 13,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build SQL and Transportation Analytics Dashboard Proficiency',
    description: 'Develop advanced SQL querying skills and transportation KPI dashboards in Power BI or Tableau. Analysts who build self-serve analytics infrastructure are 3× more valuable than those who pull reports on request.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Carrier Analytics and Freight Intelligence Platform Roles',
    description: 'Freight intelligence platforms (FreightWaves, project44, FourKites, DAT) actively recruit transportation analysts with carrier analytics and market intelligence expertise. These roles are 30–50% better compensated than equivalent carrier or shipper-side analyst roles.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Get CSCMP Certification and Engage Transportation Professionals Community',
    description: 'Council of Supply Chain Management Professionals (CSCMP) certification and active engagement in transportation professional communities (NASSTRAC, TMSA) builds a visible professional brand and generates passive inbound opportunities.',
    layerFocus: 'network_leverage',
    riskReductionPct: 9,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Explore Sustainability Analytics — Freight Decarbonization Data Roles',
    description: 'Freight decarbonization analytics (Scope 3 emissions calculation, carrier emissions reporting, modal shift carbon modeling) is a rapidly emerging niche. Transportation analysts with sustainability analytics skills access ESG-driven roles at 15–25% premium compensation.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 7,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── AGRICULTURE ──────────────────────────────────────────────────────────────

const agronomist: BracketPool = pool(
  {
    title: 'Document Crop Yield Improvements and Input Cost Reductions with Field Data',
    description: 'Compile agronomic trial results, yield improvements attributed to your recommendations, input efficiency gains, and soil health outcomes. Agronomists with field-trial data and measurable yield impacts have strong leverage with seed companies, chemical companies, and ag-tech startups.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue Precision Agriculture Technology Certification',
    description: 'Complete certification in precision agriculture platforms (Climate FieldView, Trimble Agriculture, John Deere Operations Center). Agronomists who bridge traditional agronomy and precision ag technology are commanding 20–35% compensation premiums.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 17,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target Ag-Tech Companies and Specialty Crop Advisory Roles',
    description: 'Ag-tech startups (Indigo Ag, Farmers Business Network, Granular) and specialty crop producers are actively hiring agronomists who can bridge field agronomy and digital agriculture platforms. These roles pay 15–30% above traditional cooperative or extension service positions.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Remote Sensing and Drone Imagery Analysis Skills',
    description: 'Develop proficiency in drone imagery analysis, NDVI interpretation, and remote sensing platforms. Agronomists who can conduct aerial crop scouting and interpret multispectral imagery double their consulting value and expand into precision agriculture specialist roles.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Engage Carbon Credit and Regenerative Agriculture Markets',
    description: 'Carbon credit programs (Bayer Carbon, Indigo Carbon, Nutrien Ag Solutions) and regenerative agriculture programs are creating new revenue streams for agronomists who can advise on practice change verification. This niche has very low competition and growing demand.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

const food_scientist: BracketPool = pool(
  {
    title: 'Document Formulation IP, Launch Track Record, and Shelf-Life Extension Outcomes',
    description: 'Compile your product formulation contributions, new product launch record, shelf-life extension achievements, and any cost reduction through reformulation. Food scientists who own documented formulation IP are significantly harder to replace than those in support roles.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue IFT Certified Food Scientist (CFS) Credential',
    description: 'Complete the Institute of Food Technologists Certified Food Scientist (CFS) examination. The CFS credential signals technical rigor to food manufacturers, ingredient suppliers, and contract research organizations — and commands a verified compensation premium.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Functional Food, Alternative Protein, and Health & Wellness CPG Roles',
    description: 'Alternative protein (plant-based, cultivated meat), functional food, and nutraceutical sectors are the highest-growth niches in food science. Your formulation expertise is directly transferable — these companies pay 20–40% premiums over traditional food manufacturers.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build AI-Assisted Formulation and Materials Informatics Skills',
    description: 'AI-driven formulation platforms (Shiru, Brightseed, Nobell Foods) are transforming R&D. Food scientists with materials informatics and computational chemistry exposure are positioned for the next wave of food tech — a niche with very few qualified candidates.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Explore Regulatory Affairs and FSMA Compliance Consulting for Smaller Manufacturers',
    description: 'Small to mid-size food manufacturers consistently need FSMA/SQF/BRC compliance expertise and food safety consulting on a contract basis. Your technical background positions you for consulting that earns $100–175/hr while providing supplemental income protection.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 7,
    deadline: '45 days',
    priority: 'medium',
  }
);

const agri_tech_product_manager: BracketPool = pool(
  {
    title: 'Compile Ag-Tech Product Metrics: Farmer Adoption, Acres Under Management, Revenue Impact',
    description: 'Document your product KPIs: farmer adoption rate, acres under management on your platform, net revenue retention, and any yield improvements attributable to platform usage. Ag-tech PMs without adoption metrics lose ground to product managers from consumer tech.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build a Deep Farmer Persona Library and Field Research Portfolio',
    description: 'Conduct 10 structured farmer interviews and publish a public persona library or field research summary. Ag-tech PMs with deep farmer empathy and documented field research are extremely scarce — this becomes both your positioning artifact and your interview differentiator.',
    layerFocus: 'career_velocity',
    riskReductionPct: 18,
    deadline: '21 days',
    priority: 'high',
  },
  {
    title: 'Target Ag-Tech Startups with Series B+ Funding and Platform Scale',
    description: 'Ag-tech is at an inflection point. Series B+ ag-tech companies (Farmers Business Network, Granular/Corteva, Trimble Ag) need PMs with both tech PM skills and genuine agricultural domain knowledge — a rare combination that commands strong leverage.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Develop IoT and Sensor Data Platform Knowledge for Precision Ag',
    description: 'Precision agriculture increasingly runs on IoT sensor networks, satellite imagery APIs, and weather data integrations. Ag-tech PMs who can specify and evaluate sensor platforms move into Principal PM and VP Product roles far ahead of peers.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Engage Agricultural Venture Capital and Innovation Networks',
    description: 'Joining Ag-tech accelerator networks (Rabobank FoodBytes, AgFunder, Anterra Capital ecosystem) and SXSW Ag Innovation circles builds relationships that generate opportunities invisible to standard job searches in this niche industry.',
    layerFocus: 'network_leverage',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── PHARMACEUTICAL ───────────────────────────────────────────────────────────

const pharmaceutical_scientist: BracketPool = pool(
  {
    title: 'Compile Patent Contributions, IND/NDA Filings, and Compound Advancement Record',
    description: 'Document patent inventorship, IND/NDA submissions you\'ve contributed to, stage progressions (Phase I→II→III) for compounds you\'ve worked on, and any breakthrough therapy designations. This record is your primary negotiation asset — pharma scientists with documented compound advancement are extremely difficult to replace.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 20,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Publish in Peer-Reviewed Journals and Build Scientific Reputation',
    description: 'Submit current research findings to peer-reviewed journals and conference abstracts. Published pharmaceutical scientists with H-index visibility are recruited passively — this is your career protection moat that no corporate restructuring can take away.',
    layerFocus: 'career_resilience',
    riskReductionPct: 17,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Activate Pharma Network and Target Biotech/CDMO Opportunities',
    description: 'Contract Development and Manufacturing Organizations (CDMOs: Lonza, Catalent, Patheon, Samsung Biologics) and biotech companies in your therapeutic area are the most active employers of pharmaceutical scientists during Big Pharma restructurings. Activate your network immediately.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 24,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build AI-Augmented Drug Discovery Skills (AlphaFold, Schrödinger, Insilico)',
    description: 'Computational drug discovery (AlphaFold structure prediction, Schrödinger platform, Insilico Medicine, Atomwise) is transforming pharmaceutical R&D. Scientists who bridge traditional wet-lab expertise with AI-assisted discovery are the most in-demand profiles in pharma R&D.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 15,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Explore Regulatory Consulting and FDA Advisory Panel Participation',
    description: 'Pharmaceutical scientists with IND/NDA regulatory experience can build consulting practices ($200–400/hr) supporting smaller biotechs on regulatory strategy. FDA advisory panel participation builds your external scientific reputation while creating consulting pipeline.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '60 days',
    priority: 'medium',
  }
);

const clinical_trial_manager: BracketPool = pool(
  {
    title: 'Document Trial Enrollment Speed, Protocol Deviation Rate, and On-Time Completion Record',
    description: 'Compile your clinical trial performance record: enrollment vs. target timeline, protocol deviation rate, patient retention rate, database lock timing, and inspection readiness. CTMs with clean inspection records and on-time delivery have strong leverage even in company downturns.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify in ICH-GCP and ACRP or SOCRA Clinical Research Credential',
    description: 'If not already certified, complete Association of Clinical Research Professionals (ACRP) or Society of Clinical Research Associates (SOCRA) certification. These credentials are baseline requirements for senior CTM and CRO Principal roles and signal regulatory rigor.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target CRO (Contract Research Organization) Senior and Associate Director Roles',
    description: 'CROs (IQVIA, Covance, PPD, Syneos, PRA Health Sciences) are the most stable employers during Big Pharma restructurings — they benefit from outsourcing. Your sponsor-side experience is highly valued at CROs. Apply to 3 CRO openings within 5 business days.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '5 days',
    priority: 'critical',
  },
  {
    title: 'Build Proficiency in EDC Systems and Clinical Data Platforms',
    description: 'Deepen proficiency in Electronic Data Capture (EDC) systems (Medidata Rave, Oracle Clinical, Veeva Vault) and clinical trial management systems (CTMS). CTMs with CTMS administration experience command 10–20% compensation premiums.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Decentralized Clinical Trial (DCT) Specialist Roles',
    description: 'Decentralized and hybrid clinical trials are the fastest-growing segment in clinical research. CTMs who develop expertise in DCT platforms (Medable, Science 37, ObvioHealth) are entering a niche with very low competition and premium compensation.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '45 days',
    priority: 'medium',
  }
);

const regulatory_affairs_specialist_pharma: BracketPool = pool(
  {
    title: 'Inventory Regulatory Submissions Portfolio: INDs, NDAs, BLAs, CTAs, MAAs',
    description: 'Compile your full regulatory submissions portfolio: IND/CTA filings, NDA/BLA/MAA submissions, agency meeting requests managed, labeling negotiations, and any advisory committee interactions. This portfolio is your primary value artifact — agency-facing regulatory expertise cannot be offshored or automated.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 22,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue RAC Certification (Regulatory Affairs Certification)',
    description: 'Regulatory Affairs Professionals Society (RAPS) Regulatory Affairs Certification (RAC) is the gold standard credential in the field. RAC-credentialed professionals earn 18–30% more than non-credentialed peers and access the most competitive senior regulatory director roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 19,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Activate Regulatory Network and Target Biotech and Gene Therapy Emerging Areas',
    description: 'Gene therapy (CGT) regulatory affairs is the highest-demand niche in the field — BLA/MAA experience for cell and gene therapies commands 30–50% compensation premiums. Activate your regulatory network and specifically target regenerative medicine and rare disease biotechs.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 25,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build eCTD Publishing and Regulatory Information Management Expertise',
    description: 'Proficiency in eCTD publishing tools (Veeva Vault RIM, Documentum, OpenText) and regulatory information management (RIM) systems is increasingly baseline for senior regulatory roles. Platform expertise expands your roles from pure science to systems architecture.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Global Regulatory Strategy and Simultaneous Worldwide Filing Expertise',
    description: 'Regulatory professionals who can manage simultaneous global submissions (FDA + EMA + PMDA + CDSCO) are among the highest-compensated in the industry. Even foundational experience with ex-US submissions creates meaningful compensation differentiation.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  }
);

const drug_safety_pharmacovigilance: BracketPool = pool(
  {
    title: 'Document ICSR Processing Volume, Signal Detection Record, and Inspection Readiness',
    description: 'Compile your PV performance record: ICSRs processed, signal detections confirmed by safety committees, PSUR/PBRER contributions, and any PRAC/FDA inspection readiness record. Drug safety professionals with zero critical inspection findings are protected assets.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify with Drug Information Association (DIA) PV Training',
    description: 'Complete DIA pharmacovigilance certificate training or equivalent (Uppsala Monitoring Centre, PvLEADs). Certified PV professionals with regulatory safety database expertise (ARISg, Argus, Veeva Vault Safety) access the most competitive safety director positions.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target PV Outsourcing and CRO Safety Science Roles',
    description: 'PV outsourcing companies (IQVIA Safety, Cognizant Life Sciences, Syneos Safety) and CRO safety departments are the most insulated from Big Pharma restructurings. Your regulatory safety expertise is highly portable across therapeutic areas.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 20,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build AI Signal Detection and Automated ICSR Processing Knowledge',
    description: 'AI-powered PV platforms (Oracle PV, Veeva SafetyDocs, Pfizer\'s internal AI tools) are transforming case processing. Safety professionals who understand AI-augmented signal detection are positioned at the high-leverage intersection of PV science and pharma AI.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Medical Safety Affairs and Benefit-Risk Communication Roles',
    description: 'Medical safety officers and benefit-risk communication specialists represent the senior career path for PV professionals beyond case processing. These roles interface with regulatory agencies directly and earn 25–40% premiums over pure PV operations roles.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '60 days',
    priority: 'medium',
  }
);

const quality_assurance_pharma: BracketPool = pool(
  {
    title: 'Document GMP Inspection Outcomes and CAPA Resolution Record',
    description: 'Compile GMP inspection outcomes (0 critical/major findings if applicable), CAPA closure rate, deviation trend reduction, and batch release reliability record. QA professionals with clean inspection records have the strongest negotiation position in pharma operations.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify as ASQ Certified Quality Auditor (CQA) or Certified Quality Engineer (CQE)',
    description: 'American Society for Quality (ASQ) CQA or CQE certification formalizes your quality credentials and opens senior QA director, quality systems manager, and validation specialist tracks. Pharma QA professionals with ASQ credentials earn verifiable compensation premiums.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target CDMO, Medical Device, and Biotech Quality Operations Roles',
    description: 'CDMOs (Lonza, Catalent, Recipharm) and medical device companies are actively seeking GMP-experienced QA professionals. Your pharma GMP background transfers directly to ISO 13485 medical device quality and CDMO product release — often with 15–25% compensation uplift.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Quality 4.0 and Digital Quality Management System Expertise',
    description: 'Quality 4.0 encompasses digital QMS (Veeva Vault QMS, MasterControl, Trackwise), statistical process control automation, and real-time batch release. QA professionals leading digital QMS implementations are insulated from restructurings and sought by consulting firms.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Quality Consulting for Emerging Biotech and Small Pharma',
    description: 'Small and emerging biotech companies consistently need contract QA expertise for GMP gap assessments, FDA submission readiness, and CAPA remediation. Experienced pharma QA professionals earn $150–250/hr as consultants — a strong income protection mechanism.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '45 days',
    priority: 'medium',
  }
);

const medical_writer_pharma: BracketPool = pool(
  {
    title: 'Document Regulatory Submission Writing Record: CTDs, CSRs, IB Documents',
    description: 'Compile your regulatory writing portfolio: Common Technical Documents (CTDs), Clinical Study Reports (CSRs), Investigator\'s Brochures (IBs), risk management plans (RMPs). Regulatory medical writers with multi-document portfolio history are highly sought during drug approvals.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify with American Medical Writers Association (AMWA)',
    description: 'AMWA Certified Medical Writer (CMW) credential demonstrates professional medical writing competency and generates inbound recruiting from CROs, regulatory agencies, and medical communications agencies. Certification holders access a premium compensation tier.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 14,
    deadline: '60 days',
    priority: 'high',
  },
  {
    title: 'Target Medical Communications Agencies and CRO Regulatory Writing Teams',
    description: 'Medical communications agencies (Caudex, Fishawack, Palio McCann) and CRO regulatory writing teams are the most stable employers for medical writers during pharma restructurings. Agency roles pay slightly less but offer stability and diverse therapeutic area experience.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build AI-Augmented Medical Writing Workflow Expertise',
    description: 'GenAI tools (ChatGPT-4, Claude, specialized medical writing AI) are transforming the field. Medical writers who master AI-augmented workflows — using AI for first drafts while applying expert scientific review — are 2× more productive and command premium rates.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '30 days',
    priority: 'medium',
  },
  {
    title: 'Explore Freelance Regulatory Writing for Premium Biotech and Device Clients',
    description: 'Experienced regulatory medical writers earn $90–150/hr as freelancers. Building a freelance client base of 2–3 emerging biotechs provides income diversification and protection against any single employer layoff risk.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

const pharmaceutical_sales_representative: BracketPool = pool(
  {
    title: 'Compile Sales Ranking History, Market Share Gains, and Launch Excellence Record',
    description: 'Document your sales performance rankings (top decile / top quartile), market share gains in your territory, new product launch achievement, and any awards or recognitions. Pharma reps with documented performance rankings are far harder to target in restructurings than average performers.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build KOL Relationships and Medical Affairs Network in Your Therapeutic Area',
    description: 'Your relationships with Key Opinion Leaders (KOLs), thought leaders, and medical education faculty in your therapeutic area are your most portable career asset. These relationships transfer to competitors, devices, biotech, and MSL roles.',
    layerFocus: 'network_leverage',
    riskReductionPct: 18,
    deadline: '14 days',
    priority: 'high',
  },
  {
    title: 'Target Specialty Pharma, Medical Device, and MSL/Medical Science Liaison Tracks',
    description: 'Medical Science Liaison (MSL) roles pay 30–50% more than field sales and are far less vulnerable to AI-driven automation of detailing calls. Your scientific knowledge and KOL network are the primary qualifications. Target MSL openings in your therapeutic area immediately.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 23,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Complete CNPR Certification and Therapeutic Area Scientific Training',
    description: 'National Association of Pharmaceutical Sales Representatives (NAPSRx) CNPR certification formalizes your credentials and creates options for moving into specialty pharma, oncology, rare disease, and biologics sales — all of which carry 20–40% compensation premiums.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 11,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Explore Digital Health and Remote Detailing Platform Opportunities',
    description: 'As HCP digital engagement expands, hybrid sales roles combining field relationships with virtual detailing (Veeva CRM, Veeva Engage, DocStation) are becoming permanent. Reps who lead digital transformation in their therapeutic area become consultants on rep-of-the-future programs.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── MAIN EXPORTS ─────────────────────────────────────────────────────────────

export const ACTION_DB_RETAIL_LOGISTICS_PHARMA: Record<string, BracketPool> = {
  // Retail
  retail_store_manager,
  e_commerce_manager,
  merchandising_manager,
  retail_operations_analyst,
  inventory_planner,
  // Logistics
  logistics_operations_manager,
  customs_broker,
  freight_forwarder,
  route_optimization_analyst,
  warehouse_automation_specialist,
  transportation_analyst,
  // Agriculture
  agronomist,
  food_scientist,
  agri_tech_product_manager,
  // Pharma
  pharmaceutical_scientist,
  clinical_trial_manager,
  regulatory_affairs_specialist_pharma,
  drug_safety_pharmacovigilance,
  quality_assurance_pharma,
  medical_writer_pharma,
  pharmaceutical_sales_representative,
};

export const ALIAS_ADDITIONS_RETAIL_LOGISTICS_PHARMA: Record<string, string> = {
  // Retail
  'Store Manager': 'retail_store_manager',
  'Retail Store Manager': 'retail_store_manager',
  'Branch Manager Retail': 'retail_store_manager',
  'General Manager Retail': 'retail_store_manager',
  'E-Commerce Manager': 'e_commerce_manager',
  'Ecommerce Manager': 'e_commerce_manager',
  'Online Channel Manager': 'e_commerce_manager',
  'Digital Commerce Manager': 'e_commerce_manager',
  'Marketplace Manager': 'e_commerce_manager',
  'D2C Manager': 'e_commerce_manager',
  'Merchandising Manager': 'merchandising_manager',
  'Category Merchandiser': 'merchandising_manager',
  'Retail Buyer': 'merchandising_manager',
  'Senior Buyer': 'merchandising_manager',
  'Retail Operations Analyst': 'retail_operations_analyst',
  'Store Operations Analyst': 'retail_operations_analyst',
  'Retail Analyst': 'retail_operations_analyst',
  'Inventory Planner': 'inventory_planner',
  'Demand Planner': 'inventory_planner',
  'Supply Planning Analyst': 'inventory_planner',
  'Replenishment Analyst': 'inventory_planner',
  // Logistics
  'Logistics Manager': 'logistics_operations_manager',
  'Operations Manager Logistics': 'logistics_operations_manager',
  'Distribution Manager': 'logistics_operations_manager',
  'Customs Broker': 'customs_broker',
  'Licensed Customs Broker': 'customs_broker',
  'Trade Compliance Specialist': 'customs_broker',
  'Import Export Specialist': 'customs_broker',
  'Freight Forwarder': 'freight_forwarder',
  'Forwarding Agent': 'freight_forwarder',
  'Logistics Coordinator': 'freight_forwarder',
  'Ocean Freight Manager': 'freight_forwarder',
  'Route Optimization Analyst': 'route_optimization_analyst',
  'Network Design Analyst': 'route_optimization_analyst',
  'Transportation Analyst': 'transportation_analyst',
  'Freight Analyst': 'transportation_analyst',
  'Carrier Management Analyst': 'transportation_analyst',
  'Warehouse Automation Specialist': 'warehouse_automation_specialist',
  'Automation Engineer Warehouse': 'warehouse_automation_specialist',
  'WMS Administrator': 'warehouse_automation_specialist',
  // Agriculture
  'Agronomist': 'agronomist',
  'Crop Scientist': 'agronomist',
  'Agricultural Advisor': 'agronomist',
  'Field Agronomist': 'agronomist',
  'Food Scientist': 'food_scientist',
  'Food Technologist': 'food_scientist',
  'Food Formulation Scientist': 'food_scientist',
  'Product Development Scientist Food': 'food_scientist',
  'Ag Tech Product Manager': 'agri_tech_product_manager',
  'Agriculture Technology PM': 'agri_tech_product_manager',
  'AgTech PM': 'agri_tech_product_manager',
  // Pharma
  'Pharmaceutical Scientist': 'pharmaceutical_scientist',
  'Research Scientist Pharma': 'pharmaceutical_scientist',
  'Drug Discovery Scientist': 'pharmaceutical_scientist',
  'Formulation Scientist': 'pharmaceutical_scientist',
  'Clinical Trial Manager': 'clinical_trial_manager',
  'CTM': 'clinical_trial_manager',
  'Study Manager': 'clinical_trial_manager',
  'Clinical Operations Manager': 'clinical_trial_manager',
  'Regulatory Affairs Specialist': 'regulatory_affairs_specialist_pharma',
  'Regulatory Affairs Manager': 'regulatory_affairs_specialist_pharma',
  'Drug Safety Specialist': 'drug_safety_pharmacovigilance',
  'Pharmacovigilance Specialist': 'drug_safety_pharmacovigilance',
  'PV Associate': 'drug_safety_pharmacovigilance',
  'Safety Officer Pharma': 'drug_safety_pharmacovigilance',
  'QA Specialist Pharma': 'quality_assurance_pharma',
  'Quality Assurance Manager Pharma': 'quality_assurance_pharma',
  'GMP Quality Specialist': 'quality_assurance_pharma',
  'Medical Writer': 'medical_writer_pharma',
  'Regulatory Medical Writer': 'medical_writer_pharma',
  'Clinical Medical Writer': 'medical_writer_pharma',
  'Pharma Sales Rep': 'pharmaceutical_sales_representative',
  'Pharmaceutical Sales Representative': 'pharmaceutical_sales_representative',
  'Specialty Pharma Rep': 'pharmaceutical_sales_representative',
  'Medical Sales Representative': 'pharmaceutical_sales_representative',
};

export const CANONICAL_GROUP_ADDITIONS_RETAIL_LOGISTICS_PHARMA: Record<string, string> = {
  retail_store_manager: 'retail_store_manager',
  e_commerce_manager: 'e_commerce_manager',
  merchandising_manager: 'merchandising_manager',
  retail_operations_analyst: 'retail_operations_analyst',
  inventory_planner: 'inventory_planner',
  logistics_operations_manager: 'logistics_operations_manager',
  customs_broker: 'customs_broker',
  freight_forwarder: 'freight_forwarder',
  route_optimization_analyst: 'route_optimization_analyst',
  warehouse_automation_specialist: 'warehouse_automation_specialist',
  transportation_analyst: 'transportation_analyst',
  agronomist: 'agronomist',
  food_scientist: 'food_scientist',
  agri_tech_product_manager: 'agri_tech_product_manager',
  pharmaceutical_scientist: 'pharmaceutical_scientist',
  clinical_trial_manager: 'clinical_trial_manager',
  regulatory_affairs_specialist_pharma: 'regulatory_affairs_specialist_pharma',
  drug_safety_pharmacovigilance: 'drug_safety_pharmacovigilance',
  quality_assurance_pharma: 'quality_assurance_pharma',
  medical_writer_pharma: 'medical_writer_pharma',
  pharmaceutical_sales_representative: 'pharmaceutical_sales_representative',
};

export const DEMAND_ADDITIONS_RETAIL_LOGISTICS_PHARMA: Record<string, {
  demandIndex: number;
  demandTrend: 'surging' | 'rising' | 'stable' | 'declining' | 'falling';
  jobOpeningsTrend: 'surging' | 'rising' | 'stable' | 'declining' | 'falling';
  aiSubstitutionRisk: number;
  topHiringLocations: string[];
  averageDaysToFill: number;
  remoteWorkFeasibility: 'high' | 'medium' | 'low';
  dataAsOf: string;
}> = {
  retail_store_manager: {
    demandIndex: 62,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['US Metro Areas', 'India Tier 1 Cities', 'UK', 'Southeast Asia'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  e_commerce_manager: {
    demandIndex: 80,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.22,
    topHiringLocations: ['Bangalore', 'Gurgaon', 'Mumbai', 'New York', 'London', 'Singapore'],
    averageDaysToFill: 32,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  merchandising_manager: {
    demandIndex: 66,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.30,
    topHiringLocations: ['New York', 'London', 'Mumbai', 'Bangalore', 'Hong Kong'],
    averageDaysToFill: 35,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  retail_operations_analyst: {
    demandIndex: 65,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.35,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'New York', 'Chicago', 'London'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  inventory_planner: {
    demandIndex: 70,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.32,
    topHiringLocations: ['Bangalore', 'Pune', 'Chicago', 'New York', 'London', 'Singapore'],
    averageDaysToFill: 30,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  logistics_operations_manager: {
    demandIndex: 74,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.20,
    topHiringLocations: ['US Logistics Hubs', 'Germany', 'Singapore', 'Dubai', 'India Tier 1', 'Netherlands'],
    averageDaysToFill: 30,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  customs_broker: {
    demandIndex: 72,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.25,
    topHiringLocations: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Chicago', 'Singapore', 'Rotterdam'],
    averageDaysToFill: 38,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  freight_forwarder: {
    demandIndex: 68,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['Singapore', 'Dubai', 'Rotterdam', 'Hong Kong', 'Mumbai', 'Los Angeles'],
    averageDaysToFill: 32,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  route_optimization_analyst: {
    demandIndex: 76,
    demandTrend: 'rising',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.30,
    topHiringLocations: ['Bangalore', 'Hyderabad', 'New York', 'London', 'Berlin', 'Singapore'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  warehouse_automation_specialist: {
    demandIndex: 82,
    demandTrend: 'surging',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.15,
    topHiringLocations: ['US Distribution Hubs', 'Germany', 'Netherlands', 'Japan', 'South Korea', 'India Industrial'],
    averageDaysToFill: 45,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  transportation_analyst: {
    demandIndex: 70,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.32,
    topHiringLocations: ['Bangalore', 'Pune', 'Chicago', 'Dallas', 'London', 'Singapore'],
    averageDaysToFill: 30,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  agronomist: {
    demandIndex: 68,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['US Midwest', 'Brazil', 'India Agricultural States', 'Australia', 'Canada Prairies'],
    averageDaysToFill: 42,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  food_scientist: {
    demandIndex: 72,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.20,
    topHiringLocations: ['US Food Industry Hubs', 'Netherlands', 'Germany', 'Singapore', 'India Pune/Mumbai'],
    averageDaysToFill: 38,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  agri_tech_product_manager: {
    demandIndex: 77,
    demandTrend: 'rising',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['San Francisco', 'Bangalore', 'Hyderabad', 'Tel Aviv', 'Amsterdam', 'Berlin'],
    averageDaysToFill: 45,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  pharmaceutical_scientist: {
    demandIndex: 82,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.15,
    topHiringLocations: ['San Francisco Bay Area', 'Boston', 'New Jersey', 'Switzerland', 'Hyderabad', 'Pune'],
    averageDaysToFill: 55,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  clinical_trial_manager: {
    demandIndex: 80,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['US (Boston, NJ, Research Triangle)', 'UK', 'India (Hyderabad, Pune, Mumbai)', 'Switzerland', 'Germany'],
    averageDaysToFill: 48,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  regulatory_affairs_specialist_pharma: {
    demandIndex: 84,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.14,
    topHiringLocations: ['New Jersey', 'Switzerland', 'UK', 'Germany', 'Hyderabad', 'Mumbai'],
    averageDaysToFill: 58,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  drug_safety_pharmacovigilance: {
    demandIndex: 79,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.22,
    topHiringLocations: ['US (NJ, Boston)', 'UK', 'India (Hyderabad, Pune, Bangalore)', 'Germany', 'Switzerland'],
    averageDaysToFill: 42,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  quality_assurance_pharma: {
    demandIndex: 78,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.20,
    topHiringLocations: ['NJ', 'Boston', 'UK', 'Germany', 'Hyderabad', 'Pune', 'Mumbai'],
    averageDaysToFill: 38,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  medical_writer_pharma: {
    demandIndex: 75,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['US', 'UK', 'India (Hyderabad, Bangalore, Pune)', 'Germany', 'Switzerland'],
    averageDaysToFill: 35,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  pharmaceutical_sales_representative: {
    demandIndex: 65,
    demandTrend: 'declining',
    jobOpeningsTrend: 'declining',
    aiSubstitutionRisk: 0.35,
    topHiringLocations: ['US nationwide', 'India nationwide', 'UK', 'Germany', 'Brazil', 'Japan'],
    averageDaysToFill: 25,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
};

export const COMPENSATION_ADDITIONS_RETAIL_LOGISTICS_PHARMA: Record<string, {
  bands: { '0-2': number; '3-5': number; '6-9': number; '10-14': number; '15+': number };
  currency: 'USD' | 'INR';
  salaryTrend: 'rising' | 'stable' | 'falling';
  inrBands?: { '0-2': number; '3-5': number; '6-9': number; '10-14': number; '15+': number };
}> = {
  retail_store_manager: {
    bands: { '0-2': 52000, '3-5': 68000, '6-9': 85000, '10-14': 105000, '15+': 135000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 480000, '3-5': 800000, '6-9': 1300000, '10-14': 2000000, '15+': 3200000 },
  },
  e_commerce_manager: {
    bands: { '0-2': 72000, '3-5': 95000, '6-9': 125000, '10-14': 155000, '15+': 195000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 900000, '3-5': 1500000, '6-9': 2400000, '10-14': 3600000, '15+': 5500000 },
  },
  merchandising_manager: {
    bands: { '0-2': 58000, '3-5': 78000, '6-9': 100000, '10-14': 125000, '15+': 158000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 700000, '3-5': 1100000, '6-9': 1800000, '10-14': 2800000, '15+': 4200000 },
  },
  retail_operations_analyst: {
    bands: { '0-2': 48000, '3-5': 62000, '6-9': 80000, '10-14': 98000, '15+': 120000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1300000, '10-14': 1900000, '15+': 2800000 },
  },
  inventory_planner: {
    bands: { '0-2': 52000, '3-5': 70000, '6-9': 92000, '10-14': 115000, '15+': 140000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 950000, '6-9': 1600000, '10-14': 2400000, '15+': 3500000 },
  },
  logistics_operations_manager: {
    bands: { '0-2': 62000, '3-5': 82000, '6-9': 105000, '10-14': 130000, '15+': 165000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 700000, '3-5': 1200000, '6-9': 2000000, '10-14': 3000000, '15+': 4500000 },
  },
  customs_broker: {
    bands: { '0-2': 52000, '3-5': 70000, '6-9': 92000, '10-14': 118000, '15+': 148000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 950000, '6-9': 1600000, '10-14': 2400000, '15+': 3600000 },
  },
  freight_forwarder: {
    bands: { '0-2': 45000, '3-5': 60000, '6-9': 80000, '10-14': 100000, '15+': 128000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2200000, '15+': 3400000 },
  },
  route_optimization_analyst: {
    bands: { '0-2': 62000, '3-5': 82000, '6-9': 105000, '10-14': 130000, '15+': 160000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 800000, '3-5': 1300000, '6-9': 2200000, '10-14': 3200000, '15+': 5000000 },
  },
  warehouse_automation_specialist: {
    bands: { '0-2': 68000, '3-5': 92000, '6-9': 120000, '10-14': 148000, '15+': 185000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 900000, '3-5': 1600000, '6-9': 2800000, '10-14': 4200000, '15+': 6500000 },
  },
  transportation_analyst: {
    bands: { '0-2': 50000, '3-5': 68000, '6-9': 88000, '10-14': 108000, '15+': 135000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 950000, '6-9': 1600000, '10-14': 2400000, '15+': 3800000 },
  },
  agronomist: {
    bands: { '0-2': 52000, '3-5': 68000, '6-9': 88000, '10-14': 108000, '15+': 135000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2200000, '15+': 3500000 },
  },
  food_scientist: {
    bands: { '0-2': 58000, '3-5': 78000, '6-9': 100000, '10-14': 125000, '15+': 158000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 700000, '3-5': 1100000, '6-9': 1900000, '10-14': 2900000, '15+': 4500000 },
  },
  agri_tech_product_manager: {
    bands: { '0-2': 90000, '3-5': 118000, '6-9': 148000, '10-14': 178000, '15+': 215000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1200000, '3-5': 2000000, '6-9': 3500000, '10-14': 5500000, '15+': 9000000 },
  },
  pharmaceutical_scientist: {
    bands: { '0-2': 95000, '3-5': 128000, '6-9': 165000, '10-14': 210000, '15+': 265000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 900000, '3-5': 1600000, '6-9': 3000000, '10-14': 5000000, '15+': 8500000 },
  },
  clinical_trial_manager: {
    bands: { '0-2': 85000, '3-5': 112000, '6-9': 142000, '10-14': 172000, '15+': 210000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 900000, '3-5': 1600000, '6-9': 2900000, '10-14': 4800000, '15+': 7500000 },
  },
  regulatory_affairs_specialist_pharma: {
    bands: { '0-2': 82000, '3-5': 108000, '6-9': 140000, '10-14': 175000, '15+': 220000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 950000, '3-5': 1700000, '6-9': 3200000, '10-14': 5500000, '15+': 9000000 },
  },
  drug_safety_pharmacovigilance: {
    bands: { '0-2': 72000, '3-5': 95000, '6-9': 120000, '10-14': 148000, '15+': 182000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 800000, '3-5': 1400000, '6-9': 2600000, '10-14': 4200000, '15+': 7000000 },
  },
  quality_assurance_pharma: {
    bands: { '0-2': 68000, '3-5': 90000, '6-9': 115000, '10-14': 142000, '15+': 175000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 750000, '3-5': 1300000, '6-9': 2400000, '10-14': 3900000, '15+': 6500000 },
  },
  medical_writer_pharma: {
    bands: { '0-2': 65000, '3-5': 85000, '6-9': 108000, '10-14': 132000, '15+': 162000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 750000, '3-5': 1300000, '6-9': 2300000, '10-14': 3800000, '15+': 6000000 },
  },
  pharmaceutical_sales_representative: {
    bands: { '0-2': 58000, '3-5': 78000, '6-9': 100000, '10-14': 120000, '15+': 145000 },
    currency: 'USD',
    salaryTrend: 'falling',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2200000, '15+': 3500000 },
  },
};

export const NEGOTIATION_ADDITIONS_RETAIL_LOGISTICS_PHARMA: Record<string, {
  primaryLeverage: string;
  scriptTemplate: string;
  alternativeLeverage: string[];
  leverageScore: number;
  bestTiming: string;
}> = {
  retail_store_manager: {
    primaryLeverage: 'Store P&L ownership and revenue performance record',
    scriptTemplate: 'I manage a $[X]M revenue store with [Y]% YoY comp sales growth and [Z]% shrink reduction. My store consistently ranks in the top [Q] of the district on customer NPS and revenue productivity per labor hour. To sustain these results through this period, I need [ask].',
    alternativeLeverage: ['High cost and 3–6 month timeline to onboard a trained replacement', 'District-wide knowledge of operations that cannot be quickly transferred', 'Vendor relationships and community goodwill built over years'],
    leverageScore: 52,
    bestTiming: 'Following strong quarterly results; before holiday season planning begins',
  },
  e_commerce_manager: {
    primaryLeverage: 'Attributed GMV growth and channel ROAS performance',
    scriptTemplate: 'Over the past [Y] months, I\'ve grown channel GMV by [X]% with a [Z]× improvement in ROAS and a [W]% reduction in CAC. The algorithms, vendor relationships, and campaign playbooks I\'ve built are proprietary to our business and would take 6–12 months to rebuild. To stay and continue this growth, I need [ask].',
    alternativeLeverage: ['Marketplace account relationship history and performance track record', 'Proprietary testing frameworks and CRO learnings', 'Vendor and agency relationship continuity'],
    leverageScore: 68,
    bestTiming: 'After strong GMV quarter; during annual review or before new budget cycle',
  },
  customs_broker: {
    primaryLeverage: 'Licensed broker credential scarcity and regulatory relationship continuity',
    scriptTemplate: 'As a licensed customs broker, my credential requires [X] years of experience and a federal examination most candidates fail. My client relationships and CBP/regulatory contacts are not transferable — replacing me would require 3–6 months of onboarding and significant client relationship risk. To ensure continuity through this period, I need [ask].',
    alternativeLeverage: ['Specialized lane or commodity expertise (pharma cold chain, defense, aerospace)', 'Client retention and renewal history', 'Compliance audit track record with zero critical findings'],
    leverageScore: 66,
    bestTiming: 'Before regulatory deadline seasons; when client renewals are at risk',
  },
  pharmaceutical_scientist: {
    primaryLeverage: 'Compound-specific knowledge and IND/NDA contribution record',
    scriptTemplate: 'My work on [compound/program] is at a critical juncture — [Phase X] data readout is [Z] months away, and my deep understanding of the formulation and regulatory strategy represents at minimum 12–18 months of institutional knowledge. Replacing me at this stage would materially impact the program timeline. To continue delivering on [compound], I need [ask].',
    alternativeLeverage: ['Patent inventorship creating IP continuity requirement', 'Key FDA/EMA relationship history on specific submissions', 'Unique technical expertise in therapeutic area or platform technology'],
    leverageScore: 78,
    bestTiming: 'Before Phase transition milestones; after NDA acceptance; before key regulatory meetings',
  },
  clinical_trial_manager: {
    primaryLeverage: 'Trial continuity risk and enrollment pipeline ownership',
    scriptTemplate: 'I\'m managing [X] active sites across [Y] countries with [Z] patients currently enrolled. A mid-trial leadership transition carries significant protocol deviation risk, FDA audit risk, and would likely extend our database lock by [N] months. To ensure we hit our primary endpoint on schedule, I need [ask].',
    alternativeLeverage: ['CRO vendor relationship and oversight history', 'Site investigator relationships that are personal and not transferable', 'Regulatory agency briefing history and agency relationship continuity'],
    leverageScore: 72,
    bestTiming: 'During active enrollment; before data lock; when CRO contract renewal is pending',
  },
  regulatory_affairs_specialist_pharma: {
    primaryLeverage: 'FDA/EMA regulatory pathway knowledge and agency relationship history',
    scriptTemplate: 'My experience with [agency] reviewers and our submission history for [compound class/therapy area] represents rare institutional knowledge. Our current NDA/BLA timeline assumes my continuity through [submission date]. A leadership change at this stage would add 3–6 months of risk to the approval timeline and potentially $[X]M in costs. To maintain regulatory momentum, I need [ask].',
    alternativeLeverage: ['Multi-jurisdiction regulatory knowledge (FDA + EMA + PMDA)', 'Precedent knowledge on similar compound approvals', 'Agency meeting history and informal relationship capital with reviewers'],
    leverageScore: 82,
    bestTiming: 'Before major regulatory filings; during NDA/BLA review cycles; ahead of PDUFA dates',
  },
  drug_safety_pharmacovigilance: {
    primaryLeverage: 'Zero-critical-finding inspection record and signal detection history',
    scriptTemplate: 'Our PV system has maintained a zero critical findings record across [X] regulatory inspections over [Y] years, and I own the safety signal detection protocols for [product portfolio]. Our next PSUR submission is due in [Z] weeks. Ensuring continuity of our inspection-ready quality system is essential. To maintain this standard through this period, I need [ask].',
    alternativeLeverage: ['Knowledge of company-specific safety database configuration', 'Agency relationship history on specific safety questions', 'Signal detection history and precedent decisions for the compound portfolio'],
    leverageScore: 64,
    bestTiming: 'Before inspection cycles; before major PSUR/PBRER submissions; when safety database migration is planned',
  },
  warehouse_automation_specialist: {
    primaryLeverage: 'Automation ROI ownership and system integration knowledge',
    scriptTemplate: 'I designed and implemented the automation systems generating [X]% throughput improvement and [$Y]M annual labor savings. The WCS integration and AMR fleet management protocols I built are undocumented outside of my expertise. Replacing this knowledge would require 6–9 months and risk [Z]% productivity loss during transition. To continue the roadmap, I need [ask].',
    alternativeLeverage: ['Vendor relationship continuity with automation system suppliers', 'System configuration knowledge that is effectively person-dependent', 'Ongoing automation roadmap ownership across multiple distribution centers'],
    leverageScore: 70,
    bestTiming: 'Before peak season operations; when new automation capital projects are being approved',
  },
  pharmaceutical_sales_representative: {
    primaryLeverage: 'Territory market share, KOL relationships, and launch performance history',
    scriptTemplate: 'My territory has grown to [X]% market share over [Y] years — [Z] percentage points above the national average. My relationships with [specialty] KOLs including [Dr. X] are personal and not transferable — these accounts represent $[W]M in annual revenue. A territory transition would likely cost [Q]% market share in year one. To protect this position, I need [ask].',
    alternativeLeverage: ['Specialist prescriber relationships built over multi-year engagement', 'Top decile/quartile ranking history creating measurable replacement cost argument', 'Launch excellence record with documented market development impact'],
    leverageScore: 55,
    bestTiming: 'After Q4 ranking results; before new product launch assignment decisions',
  },
  quality_assurance_pharma: {
    primaryLeverage: 'GMP inspection record and CAPA institutional knowledge',
    scriptTemplate: 'Our facility has maintained a clean inspection record through [X] regulatory audits, and I own the CAPA management system and deviation history for [site]. A QA leadership transition at this stage would require 3–6 months of knowledge transfer during a period when [inspection/audit trigger] is scheduled. To protect compliance continuity, I need [ask].',
    alternativeLeverage: ['Site-specific quality system configuration knowledge', 'Regulatory agency relationship history at facility level', 'Validation documentation ownership for critical manufacturing processes'],
    leverageScore: 66,
    bestTiming: 'Before FDA/EMA inspection cycles; before product launch validation; during site audit preparation',
  },
};
