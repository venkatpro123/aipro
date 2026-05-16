// Insurance, Real Estate, Media & Hospitality action pools — v37.0
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

// ─── INSURANCE ────────────────────────────────────────────────────────────────

const underwriter_property_casualty: BracketPool = pool(
  {
    title: 'Compile Book of Business Loss Ratio, Retention Rate, and Profitability Record',
    description: 'Document your underwriting performance: combined ratio on your book, YoY loss ratio, retention rate, new business written, and any specialty line expertise. P&C underwriters with profitable books have the strongest negotiation leverage in the industry — your numbers are your protection.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue CPCU (Chartered Property Casualty Underwriter) Designation',
    description: 'CPCU is the most recognized credential in P&C insurance. CPCU holders earn 15–25% more than non-credentialed underwriters and access senior underwriting officer and specialty markets tracks. If you don\'t have it, this is your highest-ROI career investment.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 18,
    deadline: '180 days',
    priority: 'high',
  },
  {
    title: 'Target Specialty Lines, E&S Markets, and London Market Opportunities',
    description: 'Specialty and Excess & Surplus (E&S) underwriters (Lloyd\'s syndicates, Markel, Axis, Argo) consistently outpay admitted market carriers by 20–40%. Your P&C foundation with specialty expertise is the most valuable combination in insurance markets.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build AI-Assisted Underwriting and Predictive Modeling Fluency',
    description: 'Insurtech-driven automated underwriting (Guidewire, Duck Creek, Verisk) is transforming the lower end of the market. Underwriters who understand ML-based risk scoring and can guide AI tool deployment are positioned for senior underwriting authority rather than displacement.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Develop Broker Relationship Portfolio and Wholesale Market Connections',
    description: 'Underwriters with strong broker relationships are 3× less likely to be restructured than those without — your broker network is a retention argument. Building relationships with wholesale brokers expands your optionality for E&S market moves significantly.',
    layerFocus: 'network_leverage',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const actuarial_analyst: BracketPool = pool(
  {
    title: 'Track Exam Progress and Ensure CAS/SOA Examination Continuity',
    description: 'Immediately confirm your actuarial examination progression (CAS or SOA exams passed, current study plan). Every exam passed increases your value and retention protection by approximately 10–15%. Employers almost never lay off candidates who are actively progressing through exams — stagnation is the risk.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 20,
    deadline: '3 days',
    priority: 'high',
  },
  {
    title: 'Pass Next Actuarial Exam and Build Predictive Analytics Proficiency',
    description: 'Prioritize your next CAS or SOA exam sitting. Simultaneously build proficiency in R, Python, and actuarial platforms (ResQ, STAR, Igloo). Fellow-level actuaries with modern analytics skills are among the most protected finance professionals in any economy — scarcity is structural.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 22,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Activate Actuarial Network and Target Consulting and FinTech Opportunities',
    description: 'Actuarial consulting (Milliman, Tillinghast/Towers Watson, Oliver Wyman Actuarial) pays 20–40% more than carrier-side roles at equivalent exam levels. Insurtech companies (Lemonade, Root, Oscar) seek actuarial talent with modern analytics skills. Activate your actuarial society network immediately.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 25,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Build Climate Risk and Catastrophe Modeling Expertise',
    description: 'Climate risk actuarial expertise (RMS, AIR Worldwide catastrophe models, TCFD reporting) is among the fastest-growing niches in the profession. Actuaries with climate/cat modeling experience access reinsurance consulting and regulatory advisory roles that are significantly higher-compensated.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 12,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Explore Data Science and Risk Analytics Roles Beyond Traditional Actuarial',
    description: 'Actuarial credentials plus data science skills (Python ML, credit risk modeling, fraud analytics) open pricing, risk analytics, and head of data science roles at banks, hedge funds, and consulting firms at 30–50% compensation premiums over insurance carrier roles.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '45 days',
    priority: 'medium',
  }
);

const claims_adjuster: BracketPool = pool(
  {
    title: 'Document Claim Closure Rate, Litigation Savings, and Customer Satisfaction Record',
    description: 'Compile your claims performance metrics: closure ratio, cycle time, litigation expense savings vs. reserve, subrogation recovery rate, and customer satisfaction scores. Claims adjusters with documented cost containment and resolution outcomes have strong retention value — their skills directly impact the combined ratio.',
    layerFocus: 'career_velocity',
    riskReductionPct: 13,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue AIC (Associate in Claims) or SCLA (Senior Claims Law Associate) Designation',
    description: 'The Associate in Claims (AIC) credential demonstrates professional claims competency and opens senior adjuster, claims supervisor, and claims management tracks. Coverage analysis specialists with SCLA credentials are among the most protected and promoted in complex lines claims.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Complex Lines and Specialty Claims Roles with Higher Authority Levels',
    description: 'Complex claims (commercial liability, D&O, professional liability, cyber) pay 25–40% more than personal lines adjusting and face significantly less automation risk. Your foundational claims knowledge transfers directly — apply to complex lines openings immediately.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build AI-Augmented Claims Triage and Fraud Detection Tool Expertise',
    description: 'AI claims triage platforms (Tractable, Verisk AI, Guidewire ClaimCenter AI) are automating simple claims handling. Adjusters who lead AI tool adoption — using it to handle high-volume simple claims while focusing expertise on complex decisions — are protected from displacement.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '30 days',
    priority: 'medium',
  },
  {
    title: 'Explore Independent Adjuster (IA) and Catastrophe Claims Specialist Track',
    description: 'Independent adjusters working catastrophe events earn $60–120/hr on a variable basis with significantly higher annual income than salaried staff adjusters during high-CAT years. IA status also eliminates single-employer risk — you work for multiple carriers simultaneously.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '30 days',
    priority: 'medium',
  }
);

const insurance_product_manager: BracketPool = pool(
  {
    title: 'Document Product P&L, Loss Ratio Performance, and Market Share Growth',
    description: 'Compile your product line performance: earned premium growth, loss ratio trajectory, expense ratio, market share gains, and new product launch outcomes. Insurance PMs with product P&L ownership and demonstrated improvement records have strong negotiation leverage with both carriers and insurtechs.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Digital Distribution and Embedded Insurance Product Expertise',
    description: 'Embedded insurance (coverage sold at point of purchase through non-insurance distribution channels) and digital-first product design are the fastest-growing segments in insurance product development. PMs with digital distribution expertise access insurtech and carrier innovation roles at significant premiums.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 18,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Insurtech Product Leadership and Specialty Lines Innovation Roles',
    description: 'Insurtech companies (Lemonade, Root, Hippo, Next Insurance, Coalition Cyber) and specialty carrier innovation labs are building product teams with deep insurance domain knowledge — a profile they cannot source from consumer tech PM markets. Your insurance foundation is rare.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Develop Parametric Insurance and Usage-Based Insurance Product Knowledge',
    description: 'Parametric insurance products and UBI (usage-based insurance with telematics) are growing rapidly and require product managers who understand both technology triggers and actuarial pricing. This niche has very limited competition and growing demand from specialty carriers.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Engage LOMA, IIA, and Insurance Innovation Alliance Professional Networks',
    description: 'Life Office Management Association (LOMA), Insurance Information Institute, and Insurance Innovation Alliance communities generate peer relationships and passive recruitment opportunities across the full insurance value chain.',
    layerFocus: 'network_leverage',
    riskReductionPct: 7,
    deadline: '30 days',
    priority: 'medium',
  }
);

// ─── REAL ESTATE ──────────────────────────────────────────────────────────────

const real_estate_analyst: BracketPool = pool(
  {
    title: 'Compile Investment Underwriting Record and Deal Attribution Portfolio',
    description: 'Document your deal underwriting record: acquisitions underwritten, assumptions vs. actuals, IRR achieved on closed deals you modeled, and any investment recommendations that were adopted. Real estate analysts with trackable deal contribution records transition more readily to investment management and private equity roles.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue CFA and ARGUS Certification for Capital Markets Positioning',
    description: 'CFA charterholder status and ARGUS Enterprise certification are the two highest-value credentials for real estate analysts targeting institutional investment, REITS, and PE real estate. ARGUS proficiency alone opens analyst-to-associate transitions at major RE private equity firms.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 19,
    deadline: '180 days',
    priority: 'high',
  },
  {
    title: 'Target Real Estate Private Equity, REIT, and PropTech Analyst Roles',
    description: 'Real estate PE firms (Blackstone RE, Brookfield, KKR RE, Starwood), publicly traded REITs, and PropTech platforms consistently recruit from brokerage and development analyst pools. These roles pay 30–60% more than equivalent developer or brokerage analyst roles.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build CoStar, MSCI Real Assets, and GIS Spatial Analytics Proficiency',
    description: 'CoStar/Loopnet market intelligence, MSCI/IPD real assets benchmarking, and GIS-based spatial analysis (ArcGIS, QGIS for real estate) distinguish analysts who can generate proprietary market insights from those who can only execute given assumptions.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 12,
    deadline: '30 days',
    priority: 'medium',
  },
  {
    title: 'Explore Debt Capital Markets and Commercial Mortgage Banking Opportunities',
    description: 'Commercial mortgage banking and CMBS origination roles value real estate financial modeling skills highly and pay 20–35% premiums over equity-side analyst roles. The credit analyst background transfers readily to bank RE lending groups.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

const property_manager: BracketPool = pool(
  {
    title: 'Document Portfolio NOI Growth, Occupancy Rate, and Capital Project Delivery Record',
    description: 'Compile your property management performance: NOI growth, stabilized occupancy maintained, lease renewal rates, capital project delivery on time/budget, and tenant satisfaction (NPS or survey data). Property managers with documented NOI ownership have strong leverage with institutional owners.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue CPM (Certified Property Manager) or ARM (Accredited Residential Manager)',
    description: 'Institute of Real Estate Management (IREM) CPM certification is the gold standard for commercial property managers. ARM certification targets residential. Both credentials open Regional Manager and Director of Property Management tracks and generate 12–20% compensation premiums.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '120 days',
    priority: 'high',
  },
  {
    title: 'Target Institutional Investor and REIT Portfolio Management Roles',
    description: 'Institutional investors (BlackRock, CBRE Investment Management, JLL Income Properties) and publicly traded REITs consistently need CPM-credentialed managers for stabilized commercial, multifamily, and mixed-use portfolios. These roles pay 20–40% more than third-party management company roles.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '14 days',
    priority: 'critical',
  },
  {
    title: 'Build PropTech and Smart Building Technology Management Expertise',
    description: 'Building automation systems (BAS/BMS), smart HVAC optimization platforms, and tenant engagement apps (HqO, Equiem, Comfy) are becoming baseline requirements for Class A property management. Technology-forward property managers command premiums and survive consolidation.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 10,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Develop Asset Management and Ownership-Side Perspective',
    description: 'Property managers who understand ownership-side asset management (DCF modeling, disposition timing, capital structure) transition to asset manager and acquisitions roles at significantly higher compensation. Building basic financial modeling skills opens these tracks.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '60 days',
    priority: 'medium',
  }
);

const proptech_product_manager: BracketPool = pool(
  {
    title: 'Document Platform Adoption Metrics: AUM on Platform, Transaction Volume, NRR',
    description: 'Compile your PropTech product KPIs: assets under management processed through your platform, transaction volume facilitated, net revenue retention, and any real estate professional adoption metrics. PropTech PMs without adoption data are indistinguishable from consumer software PMs in hiring processes.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Real Estate Data Infrastructure and AI Valuation Model Expertise',
    description: 'AVMs (Automated Valuation Models), real estate data APIs (Attom, CoreLogic, Zillow API), and AI-driven deal sourcing are transforming real estate. PropTech PMs who understand the data infrastructure underlying real estate intelligence move into VP Product roles at the fastest-growing companies.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 20,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Real Estate Marketplace, Digital Mortgage, and CRE SaaS Roles',
    description: 'CRE SaaS (VTS, Buildout, CompStak), digital mortgage platforms (Better.com, Blend, Stavvy), and real estate marketplace companies (CoStar, Zillow, OpenDoor) are the most active PropTech employers. Your combination of real estate domain knowledge and product management is extremely scarce.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 24,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Develop Climate Risk and ESG Real Estate Reporting Product Expertise',
    description: 'GRESB ESG reporting, climate risk disclosure (TCFD, SEC climate rules), and net-zero building performance standards are creating new software product categories in real estate. PropTech PMs who lead green building or climate risk product lines access a fast-growing, premium niche.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 11,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Engage ULI, NAIOP, and PropTech Association Networks',
    description: 'Urban Land Institute (ULI), NAIOP Commercial Real Estate Development Association, and PropTech Association communities generate peer relationships and passive recruitment from real estate operators, investors, and technology companies across the full RE spectrum.',
    layerFocus: 'network_leverage',
    riskReductionPct: 8,
    deadline: '30 days',
    priority: 'medium',
  }
);

// ─── MEDIA & ENTERTAINMENT ────────────────────────────────────────────────────

const journalist_reporter: BracketPool = pool(
  {
    title: 'Build Personal Journalism Brand and Subscriber/Audience Ownership',
    description: 'Begin building an owned audience platform (Substack newsletter, personal website, LinkedIn long-form posts) with your unique editorial voice. Journalists who own their audience are protected from masthead layoffs — your 5,000 subscribers don\'t work for your employer, they follow you.',
    layerFocus: 'career_resilience',
    riskReductionPct: 16,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Develop Beat Expertise and Transition Toward Investigative or Specialist Reporting',
    description: 'Beat specialization (cybersecurity, health policy, financial regulation, climate) combined with investigative depth creates a profile that is increasingly competitive. Specialist reporters at well-funded outlets earn 40–70% more than generalists. Define and own your beat publicly.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 17,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Content Strategy, Corporate Communications, and Brand Journalism Roles',
    description: 'The transition from journalism to corporate communications (PR director, brand journalist, content strategy) pays 50–100% more and is highly accessible to working reporters with clear beat expertise. Apply now — your research, sourcing, and storytelling skills are directly valued.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Data Journalism and Computational Reporting Portfolio',
    description: 'Data journalism (SQL, Python pandas for document analysis, scraping, visualization with D3 or Datawrapper) and computational reporting (FOIA automation, document parsing) create a newsroom profile that is nearly impossible to replicate and positions you for senior investigative roles.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 13,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Book Deal, Documentary, and Independent Media Project Pipeline',
    description: 'Experienced journalists with strong source networks and a defined beat are well-positioned for book proposals, documentary collaborations, and independent media projects. These build both income diversification and career-stage optionality beyond traditional masthead employment.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 7,
    deadline: '45 days',
    priority: 'medium',
  }
);

const game_designer: BracketPool = pool(
  {
    title: 'Document Game Systems You\'ve Owned and Measurable Player Engagement Outcomes',
    description: 'Compile your shipped titles, specific systems owned (economy design, combat loops, progression systems), and any engagement metrics (DAU, session length, D30 retention) attributable to your design contributions. Game designers without shipped credits face extreme competition; those with documented systems ownership have genuine leverage.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 15,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Publicly Visible Game Design Portfolio and Prototype',
    description: 'Develop and publish a game prototype (itch.io, Steam indie, mobile) that demonstrates your design methodology — even a jam game. Game designers with publicly shipped work activate inbound recruiting from studios that evaluate candidates on practice, not credentials.',
    layerFocus: 'career_resilience',
    riskReductionPct: 18,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Indie Studios, Game-Adjacent Tech, and Gamification Platform Roles',
    description: 'Funded indie studios, game tech middleware companies (Unity, Epic ecosystem), and gamification platforms (Kahoot, Duolingo, corporate gamification vendors) are consistently hiring designers with AAA or mobile experience. Apply immediately — studio cycles move fast.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 19,
    deadline: '7 days',
    priority: 'critical',
  },
  {
    title: 'Develop AI Game Design Tool Proficiency and Procedural Generation Expertise',
    description: 'AI-assisted game design tools (game narrative AI, procedural content generation, ML-driven balancing) are transforming the field. Designers who incorporate AI into their workflow are 2× more productive and position themselves for principal designer and technical designer roles.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore UX Design and Learning Experience Design Adjacent Roles',
    description: 'Game designers with systems thinking, feedback loop design, and player psychology expertise translate well to UX design (interaction design, onboarding flows) and educational game design at ed-tech companies. These transitions typically require a portfolio pivot — start now.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '60 days',
    priority: 'medium',
  }
);

const content_creator: BracketPool = pool(
  {
    title: 'Diversify Platform Distribution and Build Owned-Channel Audience',
    description: 'If you rely on a single platform (YouTube, Instagram, TikTok), you are a single-point-of-failure risk. Begin building cross-platform distribution and email list ownership immediately. Creators with email list audiences of 10,000+ have income protection that platform-dependent creators lack entirely.',
    layerFocus: 'career_resilience',
    riskReductionPct: 20,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Develop Brand Partnership Portfolio and Rate Card',
    description: 'Compile your engagement rate, audience demographics, CPM benchmarks, and past brand partnership outcomes. Professional creators with standardized rate cards and documented campaign metrics negotiate 2–4× better brand deals than those without. Your audience is your asset — document its commercial value.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '7 days',
    priority: 'high',
  },
  {
    title: 'Target Digital Media Companies, Brand Content Studios, and Streaming Platforms',
    description: 'Digital media companies (Vox Media, BuzzFeed, Complex Networks), brand content studios (Red Bull Media, Tastemade), and streaming platforms (Netflix, Amazon, Spotify) consistently hire experienced creators for in-house content and strategy roles. Your content instincts are rare inside corporate structures.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 18,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Digital Product and Paid Community Monetization Beyond AdSense',
    description: 'AI content tools are compressing ad revenue per video/post. Creators who transition from ad-revenue dependence to digital products (courses, templates, paid communities via Circle, Kajabi, Patreon) achieve income independence from platform algorithm changes.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 14,
    deadline: '30 days',
    priority: 'medium',
  },
  {
    title: 'Explore Content Strategy and Social Media Director Roles at Brands and Agencies',
    description: 'Brands and agencies consistently struggle to hire people who truly understand organic content performance. Your creator background makes you uniquely qualified for Head of Social, Content Strategy Director, or Brand Creative roles — at 30–70% higher compensation than creator income.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 11,
    deadline: '30 days',
    priority: 'medium',
  }
);

const streaming_product_manager: BracketPool = pool(
  {
    title: 'Document Subscription, Engagement, and Content Performance Attribution',
    description: 'Compile your streaming product KPIs: subscriber growth attributed to features you shipped, engagement lift (play rate, completion rate, D30 retention), and any churn reduction outcomes. Streaming PMs without measurable subscriber impact are vulnerable during consolidation — your data is your defense.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Recommendation Algorithm and Personalization System Product Expertise',
    description: 'Streaming platform differentiation is increasingly driven by recommendation quality. PMs who can define A/B test frameworks for recommendation systems, evaluate ML model quality, and translate personalization product requirements into engineering specifications access principal PM and VP roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 20,
    deadline: '45 days',
    priority: 'high',
  },
  {
    title: 'Target Streaming Infrastructure, Live Commerce, and Creator Economy Platforms',
    description: 'Live commerce (Amazon Live, TikTok Shop), creator monetization platforms (Kajabi, Circle, Substack), and streaming infrastructure companies (Mux, Wowza, Limelight) actively recruit PMs with streaming experience. The creator economy segment is growing faster than traditional streaming.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Develop Sports Rights, Live Events, and Interactive Entertainment Product Knowledge',
    description: 'Live sports streaming and interactive entertainment (watch parties, live trivia, fantasy integration) represent the highest-growth segments in streaming. PMs who understand live rights economics, CDN architecture for live events, and interactive overlay products access the best-compensated streaming PM roles.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 11,
    deadline: '60 days',
    priority: 'medium',
  },
  {
    title: 'Engage Streaming Media Alliance and Streaming Tech Community',
    description: 'Streaming Media Alliance, StreamingMedia.com professional community, and NAB/CES streaming track participation builds technical credibility and passive network inbound from streaming infrastructure and platform companies that value media engineering expertise.',
    layerFocus: 'network_leverage',
    riskReductionPct: 7,
    deadline: '30 days',
    priority: 'medium',
  }
);

// ─── HOSPITALITY & TRAVEL ─────────────────────────────────────────────────────

const hotel_general_manager: BracketPool = pool(
  {
    title: 'Compile Hotel Performance Record: RevPAR, GOP Margin, TripAdvisor Ranking',
    description: 'Document your hotel\'s financial performance: RevPAR index (RGI) vs. competitive set, Gross Operating Profit margin, YoY ADR growth, and TripAdvisor/Google rank trajectory. Hotel GMs with documented performance against competitive set have the strongest retention leverage in the industry.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 16,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue CHE (Certified Hospitality Educator) or CHM (Certified Hotel Manager)',
    description: 'American Hotel & Lodging Educational Institute CHM credential demonstrates professional hotel management competency. Dual-brand experience and branded hotel management credentials (Marriott, Hilton, IHG internal certifications) are the primary advancement signals for Regional VP and above roles.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 14,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Pre-Opening Hotel Assignments and Luxury/Boutique Sector Opportunities',
    description: 'Pre-opening hotel assignments and luxury/boutique sector openings offer 20–35% compensation premiums over incumbent GM roles. Your operational track record is your primary credential — activate your hotel owner, franchise, and management company network immediately.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 20,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Revenue Management and Tech Stack Expertise (PMS, CRS, RMS)',
    description: 'Hotel GMs who deeply understand Revenue Management Systems (IDeaS, Duetto), Property Management Systems (Opera, Maestro), and channel management are significantly harder to replace than those who delegate these entirely. Your tech fluency is increasingly a prerequisite for corporate VP roles.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Hotel Asset Management and Ownership Advisory Consulting',
    description: 'Hotel asset managers (representing owner interests vs. operator interests) earn $150–300K+ at institutional hotel investment firms. Your operational background is the primary qualification — building basic understanding of hotel valuation and capital expenditure planning opens this track.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 10,
    deadline: '60 days',
    priority: 'medium',
  }
);

const revenue_manager_hospitality: BracketPool = pool(
  {
    title: 'Document RevPAR Index Improvement and Competitive Set Performance',
    description: 'Compile your revenue management performance: RGI (Revenue Generation Index) improvement, ADR growth vs. comp set, occupancy optimization, and any new distribution channels activated. Revenue managers with documented competitive performance have the most transferable skillset in hospitality operations.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 17,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Certify as Certified Revenue Management Executive (CRME)',
    description: 'Hospitality Sales and Marketing Association International (HSMAI) CRME credential is the industry standard for revenue management professionals. CRME holders access multi-property, regional, and corporate revenue director roles that are unavailable to non-credentialed analysts.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 16,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Corporate Revenue Director and Revenue Tech Vendor Roles',
    description: 'Corporate revenue directors at hotel management companies (Aimbridge, Arlo, Interstate) manage multi-property portfolios at 25–40% higher compensation than property-level roles. Revenue tech vendors (IDeaS, Duetto, Atomize) actively recruit experienced practitioners for sales engineering and customer success.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 22,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Total Revenue Management Expertise Beyond Rooms (F&B, Spa, Events)',
    description: 'Total Revenue Management (TRM) — optimizing F&B, spa, parking, and event revenue alongside rooms — is the expanding definition of the role. Revenue managers who can model and optimize non-rooms revenue access senior director and VP titles that rooms-only specialists cannot.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 12,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Airline and Car Rental Revenue Management Optionality',
    description: 'Revenue management expertise transfers well to airline yield management, car rental RM, and short-term rental (Airbnb, VRBO) platform revenue optimization roles. These adjacent industries offer different employer risk profiles and frequently pay higher than hotel chains.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 9,
    deadline: '30 days',
    priority: 'medium',
  }
);

const executive_chef: BracketPool = pool(
  {
    title: 'Document Food Cost %, Labor Efficiency, and Menu Revenue Contribution',
    description: 'Compile your culinary financial record: food cost percentage vs. budget, labor cost as % of food revenue, menu engineering outcomes (highest-margin items as % of mix), and any revenue generated from signature programs (chef\'s tables, pop-ups, events). Executive chefs without these metrics cannot negotiate with ownership.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Build Personal Culinary Brand Through Media, Competitions, and Mentorship',
    description: 'Executive chefs with external recognition — media appearances, competition wins (James Beard nominations, Michelin recognition, TV appearances), and visible mentorship of industry talent — command 30–60% compensation premiums and career resilience that anonymous kitchen operators lack entirely.',
    layerFocus: 'career_resilience',
    riskReductionPct: 18,
    deadline: '30 days',
    priority: 'high',
  },
  {
    title: 'Target Food Tech Companies, Culinary Consulting, and Corporate Campus Dining',
    description: 'Food tech companies (Impossible Foods, Eat Just, Konscious Foods), culinary consulting, and corporate campus dining (Google, Apple, Facebook food programs) recruit experienced executive chefs at salaries 30–50% higher than independent restaurant kitchens with far more job stability.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 21,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Develop Food Product Development and CPG Advisory Capabilities',
    description: 'CPG food companies and restaurant chains consistently need executive chefs with R&D and product development expertise. Chef-consultant roles for menu development and food product formulation earn $150–300/day and leverage your culinary expertise in a format that is immune to kitchen closure risk.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 11,
    deadline: '45 days',
    priority: 'medium',
  },
  {
    title: 'Explore Restaurant Ownership, Micro-Format Concepts, and Ghost Kitchen Strategy',
    description: 'Ghost kitchens and delivery-only restaurant formats significantly reduce the capital risk of ownership. Experienced executive chefs who build equity through ownership or revenue-share ghost kitchen arrangements create income and asset protection that employment alone cannot provide.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '60 days',
    priority: 'medium',
  }
);

const events_manager: BracketPool = pool(
  {
    title: 'Compile Event Revenue, Attendee Satisfaction, and Budget Performance Record',
    description: 'Document your event portfolio: total event revenue managed, budget-to-actuals record, Net Promoter Score from attendee surveys, and any repeat booking rates. Events managers who quantify their financial stewardship have 3× the negotiation leverage of those who can only describe events they\'ve executed.',
    layerFocus: 'negotiation_intelligence',
    riskReductionPct: 14,
    deadline: '5 days',
    priority: 'high',
  },
  {
    title: 'Pursue CMP (Certified Meeting Professional) or CSEP Designation',
    description: 'Events Industry Council CMP is the globally recognized standard for meetings and events professionals. CMP holders access corporate event director, association management, and global events leadership roles that are unavailable to uncredentialed events coordinators.',
    layerFocus: 'skill_portfolio',
    riskReductionPct: 15,
    deadline: '90 days',
    priority: 'high',
  },
  {
    title: 'Target Corporate Event Strategy and Global Employee Experience Roles',
    description: 'Corporate events directors at large companies (tech, finance, pharma) earn 40–60% more than hospitality venue events managers. Your event production expertise translates directly — the pivot is from third-party to in-house. Apply to Head of Events and Employee Experience Director openings at scale companies.',
    layerFocus: 'escape_path_optimizer',
    riskReductionPct: 20,
    deadline: '10 days',
    priority: 'critical',
  },
  {
    title: 'Build Hybrid/Virtual Event Technology Expertise and Platform Mastery',
    description: 'Proficiency in virtual event platforms (Hopin, ON24, Cvent, Bizzabo) and hybrid event production positions you for a permanent role in corporate events — hybrid events are now standard, not pandemic-era stopgaps. Organizers without hybrid production experience are increasingly passed over for senior roles.',
    layerFocus: 'tech_stack_obsolescence',
    riskReductionPct: 11,
    deadline: '30 days',
    priority: 'medium',
  },
  {
    title: 'Develop Experiential Marketing and Brand Activation Expertise',
    description: 'Experiential marketing agencies (Jack Morton, George P. Johnson, Freeman) hire events professionals for brand activation and experiential campaigns at 25–40% compensation premiums over venue-side roles. Your logistics and production expertise is directly valued.',
    layerFocus: 'role_adjacency',
    riskReductionPct: 8,
    deadline: '45 days',
    priority: 'medium',
  }
);

// ─── MAIN EXPORTS ─────────────────────────────────────────────────────────────

export const ACTION_DB_INSURANCE_MEDIA_HOSPITALITY: Record<string, BracketPool> = {
  // Insurance
  underwriter_property_casualty,
  actuarial_analyst,
  claims_adjuster,
  insurance_product_manager,
  // Real Estate
  real_estate_analyst,
  property_manager,
  proptech_product_manager,
  // Media & Entertainment
  journalist_reporter,
  game_designer,
  content_creator,
  streaming_product_manager,
  // Hospitality
  hotel_general_manager,
  revenue_manager_hospitality,
  executive_chef,
  events_manager,
};

export const ALIAS_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY: Record<string, string> = {
  // Insurance
  'Underwriter': 'underwriter_property_casualty',
  'P&C Underwriter': 'underwriter_property_casualty',
  'Property Casualty Underwriter': 'underwriter_property_casualty',
  'Commercial Lines Underwriter': 'underwriter_property_casualty',
  'Senior Underwriter': 'underwriter_property_casualty',
  'Actuarial Analyst': 'actuarial_analyst',
  'Actuary': 'actuarial_analyst',
  'Pricing Actuary': 'actuarial_analyst',
  'Reserving Actuary': 'actuarial_analyst',
  'Claims Adjuster': 'claims_adjuster',
  'Claims Analyst': 'claims_adjuster',
  'Claims Specialist': 'claims_adjuster',
  'Senior Claims Adjuster': 'claims_adjuster',
  'Insurance Product Manager': 'insurance_product_manager',
  'Carrier Product Manager': 'insurance_product_manager',
  // Real Estate
  'Real Estate Analyst': 'real_estate_analyst',
  'Commercial Real Estate Analyst': 'real_estate_analyst',
  'Investment Analyst Real Estate': 'real_estate_analyst',
  'CRE Analyst': 'real_estate_analyst',
  'Property Manager': 'property_manager',
  'Commercial Property Manager': 'property_manager',
  'Residential Property Manager': 'property_manager',
  'Portfolio Manager Real Estate': 'property_manager',
  'PropTech Product Manager': 'proptech_product_manager',
  'Real Estate Product Manager': 'proptech_product_manager',
  'Property Technology PM': 'proptech_product_manager',
  // Media
  'Journalist': 'journalist_reporter',
  'Reporter': 'journalist_reporter',
  'News Reporter': 'journalist_reporter',
  'Staff Writer': 'journalist_reporter',
  'Correspondent': 'journalist_reporter',
  'Game Designer': 'game_designer',
  'Level Designer': 'game_designer',
  'Systems Designer': 'game_designer',
  'Narrative Designer': 'game_designer',
  'Content Creator': 'content_creator',
  'YouTuber': 'content_creator',
  'Social Media Creator': 'content_creator',
  'Influencer': 'content_creator',
  'Streaming Product Manager': 'streaming_product_manager',
  'OTT Product Manager': 'streaming_product_manager',
  'Video Product Manager': 'streaming_product_manager',
  // Hospitality
  'Hotel General Manager': 'hotel_general_manager',
  'GM Hotel': 'hotel_general_manager',
  'Hotel Manager': 'hotel_general_manager',
  'General Manager Hospitality': 'hotel_general_manager',
  'Revenue Manager': 'revenue_manager_hospitality',
  'Hotel Revenue Manager': 'revenue_manager_hospitality',
  'Director of Revenue Management': 'revenue_manager_hospitality',
  'Executive Chef': 'executive_chef',
  'Head Chef': 'executive_chef',
  'Chef de Cuisine': 'executive_chef',
  'Events Manager': 'events_manager',
  'Event Manager': 'events_manager',
  'Meeting Planner': 'events_manager',
  'Corporate Events Manager': 'events_manager',
};

export const CANONICAL_GROUP_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY: Record<string, string> = {
  underwriter_property_casualty: 'underwriter_property_casualty',
  actuarial_analyst: 'actuarial_analyst',
  claims_adjuster: 'claims_adjuster',
  insurance_product_manager: 'insurance_product_manager',
  real_estate_analyst: 'real_estate_analyst',
  property_manager: 'property_manager',
  proptech_product_manager: 'proptech_product_manager',
  journalist_reporter: 'journalist_reporter',
  game_designer: 'game_designer',
  content_creator: 'content_creator',
  streaming_product_manager: 'streaming_product_manager',
  hotel_general_manager: 'hotel_general_manager',
  revenue_manager_hospitality: 'revenue_manager_hospitality',
  executive_chef: 'executive_chef',
  events_manager: 'events_manager',
};

export const DEMAND_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY: Record<string, {
  demandIndex: number;
  demandTrend: 'surging' | 'rising' | 'stable' | 'declining' | 'falling';
  jobOpeningsTrend: 'surging' | 'rising' | 'stable' | 'declining' | 'falling';
  aiSubstitutionRisk: number;
  topHiringLocations: string[];
  averageDaysToFill: number;
  remoteWorkFeasibility: 'high' | 'medium' | 'low';
  dataAsOf: string;
}> = {
  underwriter_property_casualty: {
    demandIndex: 72,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Dallas', 'Atlanta', 'Mumbai', 'Singapore'],
    averageDaysToFill: 38,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  actuarial_analyst: {
    demandIndex: 84,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.20,
    topHiringLocations: ['New York', 'Chicago', 'Hartford', 'London', 'Zurich', 'Mumbai', 'Singapore'],
    averageDaysToFill: 58,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  claims_adjuster: {
    demandIndex: 65,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.38,
    topHiringLocations: ['US nationwide', 'India (Bangalore, Hyderabad, Pune)', 'UK', 'Australia'],
    averageDaysToFill: 25,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  insurance_product_manager: {
    demandIndex: 74,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.18,
    topHiringLocations: ['New York', 'London', 'Singapore', 'Chicago', 'Bangalore'],
    averageDaysToFill: 42,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  real_estate_analyst: {
    demandIndex: 68,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['New York', 'Chicago', 'London', 'Singapore', 'Dubai', 'Mumbai', 'Hong Kong'],
    averageDaysToFill: 35,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  property_manager: {
    demandIndex: 67,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.22,
    topHiringLocations: ['US Metro Areas', 'UK', 'Australia', 'UAE', 'India Tier 1 Cities'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  proptech_product_manager: {
    demandIndex: 78,
    demandTrend: 'rising',
    jobOpeningsTrend: 'surging',
    aiSubstitutionRisk: 0.16,
    topHiringLocations: ['New York', 'San Francisco', 'London', 'Tel Aviv', 'Bangalore', 'Berlin'],
    averageDaysToFill: 48,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  journalist_reporter: {
    demandIndex: 48,
    demandTrend: 'declining',
    jobOpeningsTrend: 'falling',
    aiSubstitutionRisk: 0.42,
    topHiringLocations: ['New York', 'Washington DC', 'London', 'Delhi', 'Mumbai', 'Singapore', 'Hong Kong'],
    averageDaysToFill: 45,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  game_designer: {
    demandIndex: 70,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.22,
    topHiringLocations: ['San Francisco', 'Seattle', 'Austin', 'Montreal', 'London', 'Warsaw', 'Singapore'],
    averageDaysToFill: 38,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  content_creator: {
    demandIndex: 64,
    demandTrend: 'stable',
    jobOpeningsTrend: 'stable',
    aiSubstitutionRisk: 0.38,
    topHiringLocations: ['Los Angeles', 'New York', 'London', 'Mumbai', 'Dubai', 'Singapore', 'Remote'],
    averageDaysToFill: 21,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  streaming_product_manager: {
    demandIndex: 76,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.16,
    topHiringLocations: ['Los Angeles', 'New York', 'San Francisco', 'London', 'Mumbai', 'Singapore'],
    averageDaysToFill: 45,
    remoteWorkFeasibility: 'high',
    dataAsOf: '2026-Q1',
  },
  hotel_general_manager: {
    demandIndex: 68,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.14,
    topHiringLocations: ['Dubai', 'Singapore', 'US Metro Areas', 'India Tier 1', 'London', 'Paris'],
    averageDaysToFill: 45,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  revenue_manager_hospitality: {
    demandIndex: 74,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.28,
    topHiringLocations: ['Dubai', 'London', 'New York', 'Singapore', 'India Tier 1', 'Las Vegas'],
    averageDaysToFill: 35,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
  executive_chef: {
    demandIndex: 66,
    demandTrend: 'stable',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.10,
    topHiringLocations: ['New York', 'London', 'Dubai', 'Singapore', 'Paris', 'Los Angeles', 'Mumbai'],
    averageDaysToFill: 35,
    remoteWorkFeasibility: 'low',
    dataAsOf: '2026-Q1',
  },
  events_manager: {
    demandIndex: 69,
    demandTrend: 'rising',
    jobOpeningsTrend: 'rising',
    aiSubstitutionRisk: 0.22,
    topHiringLocations: ['New York', 'London', 'Dubai', 'Singapore', 'Bangalore', 'Chicago', 'Las Vegas'],
    averageDaysToFill: 28,
    remoteWorkFeasibility: 'medium',
    dataAsOf: '2026-Q1',
  },
};

export const COMPENSATION_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY: Record<string, {
  bands: { '0-2': number; '3-5': number; '6-9': number; '10-14': number; '15+': number };
  currency: 'USD' | 'INR';
  salaryTrend: 'rising' | 'stable' | 'falling';
  inrBands?: { '0-2': number; '3-5': number; '6-9': number; '10-14': number; '15+': number };
}> = {
  underwriter_property_casualty: {
    bands: { '0-2': 62000, '3-5': 82000, '6-9': 108000, '10-14': 138000, '15+': 175000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 700000, '3-5': 1200000, '6-9': 2200000, '10-14': 3800000, '15+': 6500000 },
  },
  actuarial_analyst: {
    bands: { '0-2': 80000, '3-5': 108000, '6-9': 148000, '10-14': 198000, '15+': 260000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 900000, '3-5': 1700000, '6-9': 3500000, '10-14': 6500000, '15+': 12000000 },
  },
  claims_adjuster: {
    bands: { '0-2': 48000, '3-5': 62000, '6-9': 80000, '10-14': 100000, '15+': 122000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 500000, '3-5': 800000, '6-9': 1400000, '10-14': 2400000, '15+': 4000000 },
  },
  insurance_product_manager: {
    bands: { '0-2': 88000, '3-5': 115000, '6-9': 148000, '10-14': 180000, '15+': 220000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1200000, '3-5': 2200000, '6-9': 4000000, '10-14': 7000000, '15+': 11000000 },
  },
  real_estate_analyst: {
    bands: { '0-2': 70000, '3-5': 92000, '6-9': 120000, '10-14': 155000, '15+': 200000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 800000, '3-5': 1400000, '6-9': 2600000, '10-14': 4500000, '15+': 8000000 },
  },
  property_manager: {
    bands: { '0-2': 52000, '3-5': 68000, '6-9': 88000, '10-14': 110000, '15+': 138000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 1000000, '6-9': 1800000, '10-14': 3200000, '15+': 5500000 },
  },
  proptech_product_manager: {
    bands: { '0-2': 95000, '3-5': 128000, '6-9': 162000, '10-14': 198000, '15+': 245000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1400000, '3-5': 2600000, '6-9': 4800000, '10-14': 8000000, '15+': 14000000 },
  },
  journalist_reporter: {
    bands: { '0-2': 42000, '3-5': 58000, '6-9': 78000, '10-14': 98000, '15+': 125000 },
    currency: 'USD',
    salaryTrend: 'falling',
    inrBands: { '0-2': 400000, '3-5': 650000, '6-9': 1100000, '10-14': 1900000, '15+': 3500000 },
  },
  game_designer: {
    bands: { '0-2': 68000, '3-5': 90000, '6-9': 118000, '10-14': 148000, '15+': 185000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 800000, '3-5': 1400000, '6-9': 2500000, '10-14': 4500000, '15+': 8500000 },
  },
  content_creator: {
    bands: { '0-2': 38000, '3-5': 62000, '6-9': 95000, '10-14': 145000, '15+': 210000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 400000, '3-5': 700000, '6-9': 1400000, '10-14': 2800000, '15+': 6000000 },
  },
  streaming_product_manager: {
    bands: { '0-2': 100000, '3-5': 135000, '6-9': 170000, '10-14': 210000, '15+': 260000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 1500000, '3-5': 2800000, '6-9': 5500000, '10-14': 9000000, '15+': 15000000 },
  },
  hotel_general_manager: {
    bands: { '0-2': 65000, '3-5': 90000, '6-9': 120000, '10-14': 158000, '15+': 205000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 800000, '3-5': 1500000, '6-9': 3000000, '10-14': 5500000, '15+': 10000000 },
  },
  revenue_manager_hospitality: {
    bands: { '0-2': 58000, '3-5': 78000, '6-9': 102000, '10-14': 130000, '15+': 165000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 700000, '3-5': 1200000, '6-9': 2300000, '10-14': 4000000, '15+': 7000000 },
  },
  executive_chef: {
    bands: { '0-2': 52000, '3-5': 72000, '6-9': 98000, '10-14': 130000, '15+': 175000 },
    currency: 'USD',
    salaryTrend: 'stable',
    inrBands: { '0-2': 600000, '3-5': 1000000, '6-9': 2000000, '10-14': 3800000, '15+': 7500000 },
  },
  events_manager: {
    bands: { '0-2': 48000, '3-5': 65000, '6-9': 85000, '10-14': 108000, '15+': 135000 },
    currency: 'USD',
    salaryTrend: 'rising',
    inrBands: { '0-2': 500000, '3-5': 850000, '6-9': 1600000, '10-14': 3000000, '15+': 5500000 },
  },
};

export const NEGOTIATION_ADDITIONS_INSURANCE_MEDIA_HOSPITALITY: Record<string, {
  primaryLeverage: string;
  scriptTemplate: string;
  alternativeLeverage: string[];
  leverageScore: number;
  bestTiming: string;
}> = {
  underwriter_property_casualty: {
    primaryLeverage: 'Book profitability record and broker relationship portfolio',
    scriptTemplate: 'My book has generated a [X]% combined ratio over the past [Y] years — [Z] points better than the division average — while growing premium by [W]%. My broker relationships represent $[M] in exclusive submission flow that is not accessible without my personal relationships. Replacing me mid-cycle would cost an estimated [Q] months of production disruption. To maintain this performance, I need [ask].',
    alternativeLeverage: ['Specialty line expertise that is difficult to source externally', 'Broker trust relationships that are personal and not transferable to a successor', 'Loss trend knowledge specific to the company\'s historical book composition'],
    leverageScore: 65,
    bestTiming: 'After strong profitable year; before broker relationship season; at renewal cycle',
  },
  actuarial_analyst: {
    primaryLeverage: 'Exam progression scarcity and model ownership',
    scriptTemplate: 'As a [Associate/Fellow] with [X] exams completed and [Y] in progress, I sit in a structurally scarce talent pool. The pricing models and reserve analyses I maintain represent $[M] of annual balance sheet integrity. The average time to replace an actuary at my exam level in this market is 6–9 months. To continue progressing through my fellowship and delivering on these models, I need [ask].',
    alternativeLeverage: ['Regulatory filing knowledge and relationship with state insurance departments', 'Model documentation that is company-specific and requires onboarding months to understand', 'Actuarial function that is personally operated with limited knowledge transfer'],
    leverageScore: 78,
    bestTiming: 'After passing each exam; during year-end reserve setting; before regulatory filing seasons',
  },
  actuarial_analyst_senior: {
    primaryLeverage: 'Fellow-level credential and pricing model ownership',
    scriptTemplate: 'As a credentialed Fellow, my actuarial models underpin $[X]M in annual reserve adequacy decisions. My expertise in [specialty line/area] is not available in the current talent market at any reasonable cost or timeline. To sustain our actuarial function through this period, I need [ask].',
    alternativeLeverage: ['Regulatory relationship and filing history that creates transition risk', 'Pricing model IP embedded in systems that require my continued authorship', 'External actuarial opinion signatory responsibility that cannot be quickly transferred'],
    leverageScore: 84,
    bestTiming: 'Before reserve-setting season; during regulatory filing cycles',
  },
  hotel_general_manager: {
    primaryLeverage: 'RevPAR competitive index performance and team continuity value',
    scriptTemplate: 'My hotel has maintained a RevPAR Index of [X] — [Y] points above our competitive set — while achieving a [Z]% GOP margin over the past [N] years. My leadership team, many of whom were hired and developed by me, would face significant retention risk under a GM transition. A leadership change would likely cost [Q]% in RevPAR during the transition. To protect these results through this period, I need [ask].',
    alternativeLeverage: ['Ownership relationship and investor trust built over years of performance', 'Brand relationship history with franchisor if applicable', 'Pre-booked group business and contracts signed on my personal credit and reputation'],
    leverageScore: 63,
    bestTiming: 'After strong quarter RevPAR performance; before peak booking season; before owner meetings',
  },
  revenue_manager_hospitality: {
    primaryLeverage: 'RGI performance record and channel optimization knowledge',
    scriptTemplate: 'My revenue management strategy has grown our RGI from [X] to [Y] over [N] months while optimizing ADR by [Z]% — outpacing our compset by [W] points. The rate strategy architecture, OTA relationships, and distribution mix I\'ve built represent institutional knowledge that would take 3–4 months to transfer effectively. To protect our revenue trajectory through [season/cycle], I need [ask].',
    alternativeLeverage: ['OTA relationship history and rate parity track record', 'Revenue forecasting models calibrated to property-specific demand patterns', 'Channel mix and direct booking conversion architecture that is person-dependent'],
    leverageScore: 62,
    bestTiming: 'Before peak booking windows; after strong RevPAR quarter; during budget season',
  },
  journalist_reporter: {
    primaryLeverage: 'Source network and audience relationships that do not transfer to a replacement',
    scriptTemplate: 'My source network in [beat area] — built over [X] years — is my own and moves with me if I leave. My coverage generates [Y] unique monthly readers and [Z] social shares per piece, well above the newsroom average. My audience won\'t follow a replacement — they\'ll follow me. To keep this coverage where it belongs, I need [ask].',
    alternativeLeverage: ['Exclusive access to specific sources that are personal relationships', 'Audience following that is built around personal brand rather than masthead', 'Active investigative projects whose source trust would be lost in a transition'],
    leverageScore: 52,
    bestTiming: 'After breaking a significant story; during contract renewal periods',
  },
  game_designer: {
    primaryLeverage: 'Core loop ownership and live-ops system knowledge',
    scriptTemplate: 'I designed and own the [core systems] driving [X]% of our DAU engagement and [Y]% of our monetization. The balance parameters, progression systems, and live-ops calendar I\'ve developed are deeply embedded in our game economy — transitioning this ownership mid-season would risk [Z] weeks of revenue impact during the handoff. To protect our live-ops continuity, I need [ask].',
    alternativeLeverage: ['Player community relationships and content creator relationships built personally', 'Game economy knowledge that lives only in my institutional memory', 'Active development relationships with partner studios that are person-specific'],
    leverageScore: 62,
    bestTiming: 'Before major content release cycles; during live-ops season; after strong engagement metrics',
  },
  executive_chef: {
    primaryLeverage: 'Menu IP, team retention risk, and food cost management record',
    scriptTemplate: 'The recipes, sourcing relationships, and culinary identity I\'ve built here are mine — they move with me if I leave. My kitchen team, most of whom were recruited and trained by me, would face significant turnover risk under a new chef. A chef transition would likely add 3–5 points to food cost during the [N]-month ramp period. To protect the kitchen\'s stability and profitability, I need [ask].',
    alternativeLeverage: ['Supplier and purveyors relationships that are personal and built over years', 'Event and catering client relationships that are chef-specific', 'Food critic and media relationships that generate press for the establishment'],
    leverageScore: 58,
    bestTiming: 'After positive press coverage or awards; before high-season operations; at contract renewal',
  },
  proptech_product_manager: {
    primaryLeverage: 'Platform adoption metrics and real estate industry relationship network',
    scriptTemplate: 'My product has grown from [X] to [Y] assets under management on our platform while improving net revenue retention from [A]% to [B]%. My relationships with [major real estate company] and [institutional investor] are personal — their commitment to our platform is contingent on my continued product leadership. A PM transition at this stage would risk [Z] months of delay on our [next feature/partnership]. To sustain this growth, I need [ask].',
    alternativeLeverage: ['Real estate industry credibility that took years to build with skeptical institutional clients', 'Product roadmap knowledge and customer commitment that exists only in your relationships', 'Investor-facing product narrative and KPI ownership that is currently person-dependent'],
    leverageScore: 70,
    bestTiming: 'After customer milestone; before fundraising rounds; at contract renewal',
  },
};
