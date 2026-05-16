// consulting_marketing_cx_actions.ts — v37.0 Multi-Industry Role Intelligence
// Phase 2: Consulting (12 roles) + Marketing (18 roles) + Customer Experience (10 roles) = 40 roles

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

export const ACTION_DB_CONSULTING_MARKETING_CX: Record<string, BracketPool> = {

  // ── CONSULTING ROLES ──────────────────────────────────────────────────────

  management_consultant: pool(
    {
      title: 'Build a Case-Ready Problem-Solving Portfolio on LinkedIn',
      description: 'Junior consultants who publish case breakdowns (anonymized) of real client problems they worked on receive 4× more lateral interview requests. Write 2 LinkedIn articles per month: (1) a structured problem-framing post (situation → complication → question → hypothesis), (2) a data-driven insight from a client sector. Firms like McKinsey and Bain actively source from consultants who demonstrate public analytical communication.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '14 days — first article', priority: 'Critical',
    },
    {
      title: 'Own an Internal Practice Area or Capability Initiative Before Staffing Uncertainty',
      description: 'Mid-level consultants who own internal knowledge assets (sector knowledge base, methodology, training program) are last to be rolled off during slow periods. Pitch to your practice lead: "I\'ll build the [AI strategy / supply chain resilience / digital operations] knowledge hub for our practice." Internal thought leadership creates staffing priority on new engagements regardless of the engagement pipeline.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '14 days — pitch', priority: 'Critical',
    },
    {
      title: 'Transition to Independent Advisory Practice Using Your Client Relationships',
      description: 'Senior consultants who have managed client relationships directly can launch an independent advisory practice. Former clients pay $250–$500/hour for access to expertise without the Big 3 overhead markup. Start by contacting 5 former clients and asking: "Would you benefit from an ongoing advisory relationship at X/month?" 3 retainer clients at $5,000–$10,000/month generates $180,000–$360,000/year with 80% margin.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 45, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Pursue PMP or Six Sigma Black Belt to Access Operations Consulting Market',
      description: 'PMP-certified consultants access a broader staffing market (government, healthcare operations, manufacturing) that pure strategy consultants cannot. PMI PMP exam: $555, 75% pass rate, 35 contact hours prerequisite. Six Sigma Black Belt (ASQ, $588) opens manufacturing and supply chain advisory. Both certifications add $15,000–$25,000 to consulting day rates.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Register on Catalant, Toptal, or Expert Networks for Independent Consulting Access',
      description: 'Catalant, Toptal, Expert360, and AlixPartners expert network provide access to Fortune 500 consulting projects at $150–$450/hour for independent consultants. Registration is free; acceptance requires 5+ years consulting experience. A project from Catalant every 6 weeks provides income diversification independent of your primary employer.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 20, deadline: '7 days', priority: 'Medium',
    },
  ),

  strategy_consultant: pool(
    {
      title: 'Develop a Sector Specialization White Paper for Thought Leadership',
      description: 'Strategy consultants without published thought leadership are undifferentiated from the 50,000+ consultants globally. Write a 2,000-word white paper on your sector\'s biggest strategic disruption in 2026 (AI adoption patterns, supply chain reconfiguration, consumer behavior shift). Publish on LinkedIn and distribute to 5 journalists who cover the sector. Thought leaders receive 60% of their project pipeline through inbound rather than firm staffing.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 30, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Build a Fractional CSO or Strategy Director Practice for Mid-Market Companies',
      description: 'Mid-market companies ($20M–$200M revenue) need strategic planning support but cannot afford McKinsey or BCG. A fractional Chief Strategy Officer engagement at $8,000–$15,000/month (10–15 hours/week) is the sweet spot. Offering annual strategic planning support, M&A diligence, and competitive analysis, 3 fractional clients generate $288,000–$540,000/year. Source clients through CEO peer networks and YPO/EO forums.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Corporate Strategy Director Role at a Fortune 500 Company',
      description: 'Corporate Strategy Directors ($180,000–$320,000 base + bonus + equity) at Fortune 500 companies combine consulting career leverage with employment stability. These roles typically require 4–8 years consulting experience at MBB or Big 4 + top MBA. LinkedIn shows 400+ openings currently. Apply to 3 this week — in-house strategy roles provide equity upside impossible in consulting.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn a CFA or Chartered Financial Analyst Level I for Finance Strategy Access',
      description: 'Strategy consultants with CFA credentials access the highest-paid strategy advisory market (activist investor advisory, PE portfolio strategy, corporate treasury strategy). CFA Level I prep: 300 hours, $1,000 exam fee, 40% pass rate. CFA-credentialed strategy consultants earn $40,000–$80,000/year premium in financial sector advisory.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '6 months — register now', priority: 'High',
    },
    {
      title: 'Apply to 2 Expert Networks (GLG, Guidepoint) for Immediate Income Diversification',
      description: 'Expert networks (GLG, Guidepoint, Third Bridge) pay $200–$600/hour for 1-hour expert consultations with hedge funds and PE firms on your sector. Register on GLG (gerson.com) and Guidepoint this week. Approval takes 3–7 days. 5 consultations per month generates $12,000–$36,000/year of income diversification with minimal time commitment.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 20, deadline: '7 days', priority: 'Medium',
    },
  ),

  technology_consultant: pool(
    {
      title: 'Obtain Cloud Architect Certification (AWS/GCP/Azure) for Premium Rate Access',
      description: 'Technology consultants with cloud architect certifications (AWS Solutions Architect Professional, $300; GCP Professional Cloud Architect, $200; Azure Solutions Architect, $165) earn $250–$450/hour as independent consultants vs $120–$180/hour without. Complete the highest-demand cert for your client base this month. AWS SAP is preferred for enterprise accounts; GCP for data/ML-heavy clients.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Build an AI Implementation Practice for Traditional Enterprise Clients',
      description: 'Enterprise companies (manufacturing, financial services, healthcare, retail) need technology consultants who can implement AI tools in legacy environments — without the $800,000 minimum McKinsey engagement. Position yourself as an AI implementation specialist for mid-market ($50M–$500M) companies at $250–$400/hour. Build a repeatable AI readiness assessment framework and land 2 clients within 60 days.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Specialize in SAP S/4HANA, Salesforce, or ServiceNow Implementation for Scarcest Skills',
      description: 'SAP S/4HANA implementation consultants earn $200–$450/hour with no bench time — demand exceeds supply 3:1. Salesforce Certified Technical Architects earn $300–$600/hour. ServiceNow Certified Master Architect is the single scarcest technology consulting credential ($800/year consulting rates). Pick the platform most aligned to your current client base and pursue the highest certification level available.',
      layerFocus: 'L3 · Skills', riskReductionPct: 40, deadline: '30 days — begin', priority: 'Critical',
    },
    {
      title: 'Apply to Top System Integrators (Deloitte Tech, PwC Advisory, KPMG Tech) for Career Stability',
      description: 'Boutique technology consulting firms face higher revenue concentration risk than Big 4 advisory practices. Big 4 technology consulting pays $130,000–$250,000 base with significantly higher project pipeline stability. Apply to Deloitte Technology, PwC Advisory, Accenture Technology Consulting, or KPMG Advisory technology practice this week.',
      layerFocus: 'L1 · Company Risk', riskReductionPct: 30, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Register on Toptal or Andela for Immediate Consulting Pipeline',
      description: 'Toptal technology consulting marketplace places senior consultants in 48 hours at $150–$350/hour. Andela places senior technology consultants in enterprise companies at $120–$250/hour. Register on both this week. Approval requires a technical assessment (2–3 hours) and interview. These platforms provide immediate income backup independent of your current firm.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '7 days', priority: 'Medium',
    },
  ),

  independent_advisor: pool(
    {
      title: 'Build a Specific Advisory Offer Package and Publish It on LinkedIn',
      description: 'Independent advisors who define their offer explicitly ("I help Series A SaaS companies build their first revenue operations process. 90-day engagement, fixed fee of $X") receive 5× more inbound than those who say "available for consulting." Write your advisory offer in 3 sentences and publish it on LinkedIn. Offer specificity creates trust and eliminates scope ambiguity for clients.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Launch a Substack or Podcast to Build an Inbound Consulting Audience',
      description: 'Independent advisors who publish a weekly email newsletter (Substack, free to start) focused on their domain expertise generate 2–3 inbound client inquiries per month after 6 months. A 1,000-subscriber list in your specialty generates more qualified leads than any cold outreach. First post: the 3 biggest mistakes companies in your sector make when they try to solve [your specific problem].',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Develop an Advisory Board Seat Strategy for 5 Non-Competing Companies',
      description: 'Independent advisors serving on 3–5 advisory boards earn $1,000–$10,000/month in cash or equity per board seat with minimal time commitment (4–8 hours/month). Advisory board seats at startups typically grant 0.1–0.5% equity. Apply to 5 startups in your domain this month via AngelList Venture or direct LinkedIn outreach to founders. Board positions create income that is fully independent of any single consulting client.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Join Clarity.fm for Immediate Pay-Per-Minute Expert Consulting Revenue',
      description: 'Clarity.fm pays independent advisors $1–$10/minute for on-demand expert advice calls. A registered expert with 50 reviews earns $300–$600/hour equivalent. Registration is free. This creates an immediate supplemental income stream and builds a public track record of expertise that supports your core advisory practice.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 18, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Create a Group Advisory Program to Serve 10 Clients at 2× Individual Rate Efficiency',
      description: 'Running a monthly group advisory call (8–12 participants, $500–$1,500/month each) generates $48,000–$216,000/year for 2 hours of monthly preparation and 1 hour of live delivery. Cohort model works best for founders, operators, or professionals sharing similar challenges. Use Circle.so ($49/month) for community and Zoom for calls.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
    },
  ),

  // ── MARKETING ROLES ──────────────────────────────────────────────────────

  digital_marketing_manager: pool(
    {
      title: 'Build a Campaign Performance Dashboard with Attribution Reporting',
      description: 'Digital marketers who cannot demonstrate clear attribution (which campaigns drove which revenue) are the first cut when budgets compress. Build a Google Looker Studio dashboard this week connecting your ad accounts, CRM, and revenue data. Present attribution data to leadership monthly. Marketers with demonstrable ROI attribution face 40% lower layoff risk than those managing campaigns without clear revenue linkage.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn Google Analytics 4 Certification and Meta Blueprint Certification',
      description: 'GA4 certification (Google, free, 4 hours) and Meta Blueprint Professional (Meta, $150) are the two most commonly required digital marketing credentials. Completing both in the next 14 days signals technical currency and reduces the "AI-replaceable generalist" classification. Pair with a Google Ads Search Certification (free) to cover the complete digital marketing credential stack.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build a Freelance Portfolio on 2 Platforms for Income Independence',
      description: 'Digital marketing managers can build freelance income (Upwork, $85–$175/hour; Fiverr Pro, $200–$500/project) that generates $40,000–$80,000/year working 10–15 hours/week alongside primary employment. This income creates a financial buffer and demonstrates market value independent of your current employer. Start with Upwork: complete your profile, take 3 skill assessments, and submit 5 proposals this week.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Develop AI Marketing Tool Expertise (Jasper, Copy.ai, Midjourney) for Premium Positioning',
      description: 'Digital marketers who can implement AI content tools (Jasper AI for copy, Midjourney for creative, Runway for video) and measure their impact on campaign performance are classified as technology-forward — not replaceable by AI. Complete Jasper AI certification (free, 3 hours) and produce a case study showing how AI tools reduced your team\'s content production time by 40%+.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Join DMI or AMA for Professional Network and Job Market Access',
      description: 'Digital Marketing Institute (DMI) membership ($30/month) provides access to the DMI job board, recruiter network, and 45+ continuing education courses. American Marketing Association (AMA) provides local chapter networking with marketing leadership at companies actively hiring. Both provide access to positions before they reach public job boards.',
      layerFocus: 'L5 · Network', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  growth_marketing_manager: pool(
    {
      title: 'Document Your Full-Funnel Growth Model and CAC/LTV Metrics',
      description: 'Growth marketers who cannot articulate their customer acquisition cost (CAC), lifetime value (LTV), payback period, and organic vs paid channel mix are classified as campaign managers — not growth strategists. Build a 1-page growth model this week: CAC by channel, LTV by cohort, and 90-day trajectory. Present it to your CEO or CMO as a strategic asset. Growth teams with documented models face 35% lower elimination risk in budget cuts.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Run an A/B Test Program With Statistical Significance Documentation',
      description: 'Growth managers who maintain an active experiment roadmap (3–5 concurrent A/B tests, tracking statistical significance) demonstrate the systematic approach that distinguishes growth from marketing. Use Optimizely (enterprise) or VWO ($399/month) for A/B testing infrastructure. Document your test results with confidence intervals and present the program to your board or investors as a systematic growth engine.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Transition to a VP Growth or CMO Role at a Series B+ Company',
      description: 'Growth managers with documented CAC/LTV improvement (20%+ CAC reduction, 30%+ LTV increase) are valued at $180,000–$350,000 total comp at Series B+ companies. Apply to 3 VP Growth roles at Series B/C SaaS companies this week via First Round Network, a16z Jobs, or LinkedIn. Growth leadership roles at venture-backed companies carry equity upside unavailable in large corp roles.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn CXL Institute Growth Marketing Certification',
      description: 'CXL Institute\'s Growth Marketing Minidegree ($999) covers the complete growth framework: acquisition, activation, retention, referral, and revenue (AARRR). CXL-certified growth marketers receive 2.4× more recruiter contacts than uncertified peers. The program takes 4–6 weeks part-time.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build a Consulting Practice Around Your Growth Framework for Startups',
      description: 'Early-stage companies ($1M–$5M ARR) need fractional growth expertise and pay $5,000–$12,000/month. Your documented growth playbook is a consulting product. Offer a "90-day growth audit and roadmap" for $8,000–$15,000 to 2–3 startups. Source clients via AngelList Venture, YC alumni network, or LinkedIn to startup founders.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'Medium',
    },
  ),

  seo_specialist: pool(
    {
      title: 'Document Your Organic Revenue Attribution and Build a Portfolio of Rankings',
      description: 'SEO specialists who cannot demonstrate revenue impact (not just rankings) are classified as an overhead cost. Build your case this week: export Google Search Console data showing revenue-correlated queries, calculate the organic revenue you generate (sessions × conversion rate × AOV), and present this as a P&L line, not a traffic report. SEO specialists who own revenue attribution face 45% lower budget cut risk.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Develop Programmatic SEO Expertise and Build a Live Demo Site',
      description: 'Programmatic SEO (building 10,000–1,000,000 targeted landing pages using structured data) is growing 200% annually and commands $120–$200/hour as a specialist skill. Build a programmatic SEO demo site (niche: local services, products, or comparisons) with 500+ pages indexed and traffic growing. This becomes your portfolio piece for high-value agency and enterprise clients.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Transition to SEO Team Lead or Organic Growth Director Role',
      description: 'SEO specialists who have consistently grown organic traffic 30%+ year-over-year qualify for SEO Team Lead ($95,000–$135,000) and Organic Growth Director ($130,000–$185,000) roles. These roles manage teams and strategy rather than execution — protecting against AI-driven task automation. Apply to 3 senior SEO roles this week and position your track record as a growth strategist, not a technical executor.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Build a Technical SEO Specialization (Core Web Vitals, JavaScript SEO, Log Analysis)',
      description: 'Technical SEO specialists (Core Web Vitals optimization, JavaScript rendering, structured data, log file analysis) earn $95–$175/hour as consultants and face lower automation risk than content-focused SEO. Complete Google\'s Web Dev Fundamentals and Screaming Frog training (free) to build a technical SEO credential stack.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Join Ahrefs Academy and Semrush Academy for Free SEO Certifications',
      description: 'Ahrefs Academy and Semrush Academy offer free certifications that are industry-standard credentials in SEO. Complete both (4–6 hours total) and add them to your LinkedIn profile. Employers use these as baseline screening criteria — missing them creates unnecessary friction in job searches.',
      layerFocus: 'L3 · Skills', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

  product_marketing_manager: pool(
    {
      title: 'Document a Positioning Win: Before/After Win Rate or Pipeline Improvement',
      description: 'Product marketers who can quantify their positioning impact (win rate improved X%, pipeline increased Y%, competitive win rate from Z% to Z%+8%) are classified as revenue-generating, not overhead. Run a win/loss analysis this week using your CRM data. Build a 1-page impact brief: "Before my positioning work, win rate was X. After, Y. Revenue impact: $Z." This document is your retention and negotiation asset.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Own a Product Launch End-to-End as Your Signature Project',
      description: 'Product marketers who have led a significant product launch (with measurable outcomes: X% faster ramp, Y% of pipeline generated, Z customers acquired at launch) have the most portable and impressive credential in PMM. Volunteer to lead your next product launch even outside your assigned scope. A documented launch with quantified results is worth more than any certification in PMM job markets.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '30 days — volunteer now', priority: 'Critical',
    },
    {
      title: 'Transition to VP Product Marketing or CMO Track at a Series B+ Company',
      description: 'Senior PMMs at $130,000–$200,000 who have led launches and built competitive intelligence programs qualify for VP Product Marketing ($180,000–$320,000 + equity). Apply to 3 Series B/C companies this week. The CMO pipeline increasingly runs through product marketing at tech companies — your customer and market expertise is the rarest skill combination.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Complete Pragmatic Marketing PMC Certification',
      description: 'Pragmatic Marketing\'s PMC (Pragmatic Marketing Certified, $1,500) is the most recognized product marketing credential in B2B SaaS. It signals understanding of the complete product commercialization process. PMC-certified marketers earn 22% more on average and receive 3× more recruiter contacts for senior PMM roles.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build an AI Competitive Intelligence System Using Perplexity and Klue',
      description: 'Product marketers who build and operate competitive intelligence systems (using Klue or Crayon for automated competitive tracking + Perplexity AI for synthesis) are classified as strategic infrastructure. Present a monthly competitive brief to your executive team. This positions you as an intelligence function, not a campaign function — the former is retained, the latter is cut first.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '14 days', priority: 'Medium',
    },
  ),

  content_marketing_manager: pool(
    {
      title: 'Build a Content ROI Report: Organic Revenue Attributed to Your Content',
      description: 'Content marketers who cannot demonstrate revenue attribution are classified as a cost center. Run an attribution analysis this week: which content pieces are in the buyer\'s journey of your closed deals (via CRM touchpoint data)? What\'s the organic traffic value in CAC savings? Present a content ROI report showing "Content program saves $X in paid acquisition per month." This changes your classification from overhead to strategic investment.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Develop an AI-Augmented Content Production System That 5× Your Output',
      description: 'Content teams that integrate AI (Claude/GPT-4 for research and drafting, Midjourney for visuals, ElevenLabs for audio) can produce 5× more content at the same quality. Build a documented AI content workflow this week and demonstrate it to your CMO. Marketers who have built AI-augmented workflows are "AI managers" — not candidates for AI replacement. Produce a case study: "How we increased content output 5× without adding headcount."',
      layerFocus: 'L3 · Skills', riskReductionPct: 40, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Content Strategist or Head of Content Role at a Media Company or Large Brand',
      description: 'Content marketing managers who have built a content program from scratch (editorial calendar, SEO strategy, distribution, performance metrics) qualify for Content Strategist ($90,000–$130,000) and Head of Content ($120,000–$185,000) roles. Apply to 3 positions this week — media companies (The Motley Fool, Dotdash Meredith, G2) and large brands (HubSpot, Salesforce, Adobe) hire senior content leaders regularly.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 30, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn HubSpot Content Marketing Certification and Google Digital Marketing Certification',
      description: 'HubSpot Content Marketing Certification (free, 6 hours) and Google Digital Marketing & E-commerce Certificate (Coursera, $49/month) are the most commonly filtered-for credentials in content marketing job postings. Both take under 2 weeks to complete. Add them to LinkedIn immediately.',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Build a Newsletter or Podcast Side Project in Your Niche',
      description: 'Content marketers with a personal media property (Substack newsletter 1,000+ subscribers, or podcast 500+ downloads/episode) demonstrate content creation mastery independently. A personal property also creates direct audience access that is a consulting pipeline. Start publishing weekly in your specialty vertical.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '14 days', priority: 'Medium',
    },
  ),

  brand_manager: pool(
    {
      title: 'Quantify Brand Equity Impact Through NPS, Share-of-Voice, or Brand Recall Metrics',
      description: 'Brand managers who cannot connect brand investment to business outcomes face the highest budget-cut risk in marketing organizations. Commission a brand health survey (SurveyMonkey $X or Brand24 for share-of-voice data) and present a quarterly brand equity scorecard: NPS trend, brand recall vs competitors, sentiment score. Present this as a forward-looking leading indicator, not a backward-looking vanity metric.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Lead a Brand Architecture or Brand Extension Project for Internal Visibility',
      description: 'Brand managers who lead strategic brand projects (brand refreshes, sub-brand architecture, international market adaptation) are classified as strategic assets. Pitch a brand architecture review to your CMO this week — even if your current role doesn\'t include it. Ownership of a strategic brand project creates protection beyond what campaign management provides.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Transition to Brand Strategy Director Role at an Agency or CPG Company',
      description: 'Senior brand managers with 5+ years of P&L ownership or brand campaign leadership qualify for Brand Strategy Director ($110,000–$180,000) at creative agencies and CPG companies. Creative agencies actively recruit brand strategists who have "client side" experience. Apply to Wunderman Thompson, Ogilvy, and 1 CPG company this week.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 28, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Complete ANA (Association of National Advertisers) Brand Management Certificate',
      description: 'ANA Brand Management Certificate ($995, 16 hours) is the recognized credential for brand professionals seeking senior-level positioning. It covers brand equity measurement, positioning strategy, and portfolio management — exactly the skills that differentiate brand managers from marketing coordinators.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build a Social Listening and Brand Sentiment Monitoring System',
      description: 'Brandwatch, Sprout Social, or Mention social listening tools ($99–$299/month) create a real-time brand health monitoring capability. Building and presenting monthly brand sentiment reports to leadership establishes you as the brand intelligence function — a role that is protected because discontinuing it creates information risk.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  chief_marketing_officer: pool(
    {
      title: 'Build a Board-Facing Revenue Marketing Dashboard That CMOs Rarely Provide',
      description: 'CMOs who present at board level with revenue-connected data (pipeline contributed by marketing, CAC by channel, brand equity trends, marketing-attributable revenue) are 3× more likely to be retained during leadership transitions. Build a board-ready marketing dashboard this week using Databox or Looker Studio. Present it at your next board meeting even if not specifically invited — ask your CEO for 10 minutes. Boards that understand marketing\'s P&L contribution protect the CMO function.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build a CMO Network of 5 Peer CMOs for Reference and Opportunity Sharing',
      description: 'CMO displacement is common during private equity acquisitions and CEO transitions. Your fastest protection is a network of peer CMOs who will provide references and share open opportunities before they go public. Join CMO Alliance or SaaStr CMO Circle and attend 1 event this month. 70% of CMO placements are via referral.',
      layerFocus: 'L5 · Network', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Develop a Fractional CMO Practice for 3 Additional Revenue Streams',
      description: 'CMOs can serve 3–5 companies simultaneously as a Fractional CMO ($10,000–$20,000/month each, 20–30 hours/month per client). Fractional CMO practices generate $360,000–$1,200,000/year with no employer dependency. Register on Toptal CMO network or cmolist.com to begin receiving inbound client requests.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 45, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Pursue a Board Director Role as a Marketing/Consumer Expert',
      description: 'CMOs with brand building, digital transformation, or consumer insight experience are sought-after board directors. Boards specifically need marketing expertise they cannot buy from financial or operational backgrounds. Register with Women Corporate Directors (WCD) or National Association of Corporate Directors (NACD) Board Candidate database. A board seat provides $70,000–$200,000/year and diversified income.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Lead an AI Marketing Transformation Initiative to Signal Forward Relevance',
      description: 'CMOs who lead AI marketing transformation (AI-powered creative generation, predictive analytics for spend optimization, personalization at scale) are classified as essential architects of future marketing. Pitch a 90-day "AI Marketing Modernization" initiative to your CEO this week with a specific business case: cost savings, conversion improvements, and speed-to-market gains.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days', priority: 'Medium',
    },
  ),

  // ── CUSTOMER EXPERIENCE (CX) ROLES ──────────────────────────────────────

  customer_support_specialist: pool(
    {
      title: 'Build an AI-Augmented Support Workflow to Demonstrate Tool Mastery',
      description: 'Customer support specialists who can configure and manage AI support tools (Intercom Fin, Zendesk AI, Freshdesk Freddy AI) are classified as "AI supervisors" — not candidates for AI replacement. Learn the AI configuration layer of your current support platform this week. Write a 1-page proposal showing how AI tools can handle 40% of tickets while you focus on complex escalations and quality review.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 40, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Move into Technical Support or Tier 2 to Escape Tier 1 Automation Risk',
      description: 'Basic tier-1 customer support (password resets, FAQ answers, billing inquiries) is the highest AI displacement risk function in business. Tier 2 technical support (troubleshooting, integrations, escalated issues) faces 60% lower automation risk. Apply for an internal move to Tier 2 or Technical Support Specialist this week. Technical knowledge is the protection against tier-1 automation.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn a Customer Service Excellence Certification and CCXP Designation',
      description: 'Customer Experience Professional (CCXP, $395) is the most recognized CX credential and qualifies you for CX Analyst and CX Manager positions ($65,000–$95,000). It demonstrates process and strategic understanding beyond ticket handling. Complete CXPA\'s study guide and register for the next exam cycle. This is the certification that moves you from support specialist to CX professional.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Develop Specialized Skills in Voice of Customer (VoC) Analysis',
      description: 'VoC analysts ($65,000–$95,000) analyze NPS, CSAT, and qualitative feedback to generate actionable insights. Complete the CXPA VoC certification path and learn SQL for basic data analysis (Mode Analytics free SQL tutorial, 4 hours). VoC analysis roles are 3× less vulnerable to automation than front-line support.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Join Support Driven Community and CXPA for Job Market Access',
      description: 'Support Driven (supportdriven.com) is the largest community for customer support professionals with active job boards, mentorship, and career resources. CXPA (Customer Experience Professionals Association) provides access to CX leadership roles. Both memberships cost under $200/year and provide access to positions before public posting.',
      layerFocus: 'L5 · Network', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

  customer_experience_director: pool(
    {
      title: 'Build a CX ROI Model Connecting Experience Metrics to Revenue Retention',
      description: 'CX Directors who cannot demonstrate revenue impact of their CX investments (NPS improvement → churn reduction → ARR retained) face the highest C-suite pressure during budget cycles. Build a CX ROI model this week: a 1-point NPS improvement = X% churn reduction = $Y ARR protected. Present this at your next executive meeting. CX leaders who own revenue retention metrics are reclassified from overhead to P&L contributors.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Lead a CX Transformation Initiative That Eliminates Your Organization\'s Top Failure Mode',
      description: 'CX Directors who own the resolution of a systemic customer failure (the #1 complaint category, the primary churn reason, the most frequent escalation path) are protected by the business value of that problem statement. Identify your top failure mode from NPS verbatim data and pitch a cross-functional resolution project you own. Solving a $500,000+ ARR churn driver creates institutional protection.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 40, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Pursue CCO (Chief Customer Officer) Role at a Series B/C SaaS Company',
      description: 'CX Directors with 5+ years and demonstrable NPS improvements and churn reduction programs qualify for CCO roles ($200,000–$380,000 + equity) at Series B/C companies. CCO roles are growing 35% annually as SaaS companies recognize that retention is the P&L. Apply to 3 CCO or VP Customer Experience roles this week via LinkedIn or Chief Customer Officer Alliance job board.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Obtain CCXP Certification and CXPA Board Involvement',
      description: 'Certified Customer Experience Professional (CCXP) is the required credential for senior CX roles at enterprise companies. CXPA board or committee involvement (free, requires CCXP) creates direct connections to CX leadership openings that are rarely publicly posted. Senior CX leadership roles are filled 65% through referral from the CXPA network.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build a Digital CX / AI-Augmented Support Strategy for Your Organization',
      description: 'CX Directors who build AI-augmented support strategies (chatbot architecture, AI escalation routing, predictive churn models) are positioned as future-of-work architects rather than traditional service managers. Present a 12-month "AI + Human CX" strategy to your leadership team that shows how AI tools handle volume growth without headcount increase.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days', priority: 'Medium',
    },
  ),

  community_manager: pool(
    {
      title: 'Build Measurable Community Metrics Dashboard Tied to Product and Revenue Goals',
      description: 'Community managers whose work cannot be tied to business outcomes (product adoption, support deflection, revenue attribution, NPS contribution) are the first role eliminated in budget compression. Build a community metrics dashboard this week: monthly active community members, support ticket deflection rate (questions answered in community vs support), product feedback items acted on, and referral signups from community. These metrics reframe community from "social" to "business infrastructure."',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Transition to Community-Led Growth Strategist for Product Companies',
      description: 'Community-Led Growth (CLG) Strategists ($90,000–$140,000) architect community programs that directly generate product signups and revenue. This positioning is significantly more protected than "community manager" in budget discussions. Apply the CLG framework (Community-Led Growth Institute free curriculum) to your current program and reposition yourself with a CLG title and strategy in your next review.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 32, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Build a Personal Brand as a Community Strategy Expert on LinkedIn',
      description: 'Senior community managers who publish insights on community building (engagement frameworks, churn prevention strategies, NPS improvement through community programs) receive 3× more inbound opportunities than those who don\'t. Post 3 community strategy insights per week on LinkedIn and engage with Dani Zacarias, Carrie Melissa Jones, and David Spinks — the top community thought leaders whose audiences are community job markets.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 25, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Earn Community Manager Certification from CMX Academy',
      description: 'CMX Academy\'s Community Manager certification ($399) is the recognized credential for community professionals. It covers community strategy, metrics frameworks, and moderation at scale. CMX-certified community managers receive significantly more attention from enterprise hiring managers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Join CMX Hub and Orbit Community for Job Market Access and Peer Support',
      description: 'CMX Hub (50,000+ community professionals) maintains active job boards and mentorship programs specifically for community managers. Orbit Community provides access to developer-led community roles, which pay 30–40% more than B2C community roles. Both are free to join.',
      layerFocus: 'L5 · Network', riskReductionPct: 15, deadline: '7 days', priority: 'Medium',
    },
  ),

  cx_operations_manager: pool(
    {
      title: 'Implement a Workforce Management System to Document Operational Impact',
      description: 'CX Operations Managers who implement and optimize workforce management tools (Verint, NICE, Playvox) demonstrate measurable operational impact: schedule adherence improvement, SLA achievement, cost-per-contact reduction. Document your implementation: "WFM implementation reduced support labor cost by $X and improved SLA from Y% to Z%." This is the operational equivalent of sales closing a deal — concrete, quantifiable, and protective.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Lead an AI Deflection Program That Reduces Support Volume 20-30%',
      description: 'CX Operations Managers who implement AI deflection programs (chatbot, knowledge base AI, self-service expansion) that measurably reduce contact volume are reclassified from "support overhead" to "cost transformation engineers." Implement Intercom Fin AI, Zendesk AI, or a knowledge base optimization project and document the contact volume reduction with before/after data.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 42, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Pursue Director of CX Operations or VP Customer Operations Role',
      description: 'CX Operations Managers with Zendesk Admin, Salesforce Service Cloud, or contact center technology expertise qualify for Director of CX Operations ($120,000–$175,000) and VP Customer Operations ($150,000–$250,000) roles. Apply to 3 senior operations roles at fast-growing SaaS or e-commerce companies this week. Contact center operations management is one of the most in-demand leadership functions in 2026.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Obtain Zendesk Administrator Certification and Salesforce Service Cloud Consultant',
      description: 'Zendesk Administrator certification (free, 3 hours) and Salesforce Service Cloud Consultant ($200) are the two most requested CX operations technical credentials. Together they open Senior CX Ops and Director roles at companies using these platforms. Both can be completed within 30 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Build a CSAT/CES Feedback Loop That Closes the Loop with Product',
      description: 'CX Operations Managers who build structured feedback loops (customer complaints → product roadmap input → closed loop notification to customers) are positioned as strategic cross-functional leaders. A documented closed-loop process shows tangible product improvement impact and elevates your role from operational to strategic in executive perception.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'Medium',
    },
  ),

};

// ── ALIAS MAP ADDITIONS ────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_CONSULTING_MARKETING_CX: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Consulting
  'management consultant': { canonicalKey: 'management_consultant', displayRole: 'Management Consultant' },
  'consultant': { canonicalKey: 'management_consultant', displayRole: 'Consultant' },
  'business consultant': { canonicalKey: 'management_consultant', displayRole: 'Business Consultant' },
  'senior consultant': { canonicalKey: 'management_consultant', displayRole: 'Senior Consultant' },
  'strategy consultant': { canonicalKey: 'strategy_consultant', displayRole: 'Strategy Consultant' },
  'strategic consultant': { canonicalKey: 'strategy_consultant', displayRole: 'Strategic Consultant' },
  'tech consultant': { canonicalKey: 'technology_consultant', displayRole: 'Technology Consultant' },
  'technology consultant': { canonicalKey: 'technology_consultant', displayRole: 'Technology Consultant' },
  'it consultant': { canonicalKey: 'technology_consultant', displayRole: 'IT Consultant' },
  'independent advisor': { canonicalKey: 'independent_advisor', displayRole: 'Independent Advisor' },
  'fractional coo': { canonicalKey: 'independent_advisor', displayRole: 'Fractional COO' },
  'fractional cmo': { canonicalKey: 'chief_marketing_officer', displayRole: 'Fractional CMO' },
  'fractional consultant': { canonicalKey: 'independent_advisor', displayRole: 'Fractional Consultant' },
  // Marketing
  'digital marketing manager': { canonicalKey: 'digital_marketing_manager', displayRole: 'Digital Marketing Manager' },
  'digital marketer': { canonicalKey: 'digital_marketing_manager', displayRole: 'Digital Marketer' },
  'online marketing manager': { canonicalKey: 'digital_marketing_manager', displayRole: 'Online Marketing Manager' },
  'growth marketing manager': { canonicalKey: 'growth_marketing_manager', displayRole: 'Growth Marketing Manager' },
  'growth manager': { canonicalKey: 'growth_marketing_manager', displayRole: 'Growth Manager' },
  'head of growth': { canonicalKey: 'growth_marketing_manager', displayRole: 'Head of Growth' },
  'vp growth': { canonicalKey: 'growth_marketing_manager', displayRole: 'VP Growth' },
  'seo specialist': { canonicalKey: 'seo_specialist', displayRole: 'SEO Specialist' },
  'seo manager': { canonicalKey: 'seo_specialist', displayRole: 'SEO Manager' },
  'search engine optimization': { canonicalKey: 'seo_specialist', displayRole: 'SEO Specialist' },
  'product marketing manager': { canonicalKey: 'product_marketing_manager', displayRole: 'Product Marketing Manager' },
  'pmm': { canonicalKey: 'product_marketing_manager', displayRole: 'Product Marketing Manager' },
  'product marketer': { canonicalKey: 'product_marketing_manager', displayRole: 'Product Marketer' },
  'content marketing manager': { canonicalKey: 'content_marketing_manager', displayRole: 'Content Marketing Manager' },
  'content manager': { canonicalKey: 'content_marketing_manager', displayRole: 'Content Manager' },
  'content strategist': { canonicalKey: 'content_marketing_manager', displayRole: 'Content Strategist' },
  'brand manager': { canonicalKey: 'brand_manager', displayRole: 'Brand Manager' },
  'brand strategist': { canonicalKey: 'brand_manager', displayRole: 'Brand Strategist' },
  'cmo': { canonicalKey: 'chief_marketing_officer', displayRole: 'Chief Marketing Officer' },
  'chief marketing officer': { canonicalKey: 'chief_marketing_officer', displayRole: 'Chief Marketing Officer' },
  'vp marketing': { canonicalKey: 'chief_marketing_officer', displayRole: 'VP Marketing' },
  'head of marketing': { canonicalKey: 'chief_marketing_officer', displayRole: 'Head of Marketing' },
  // CX
  'customer support specialist': { canonicalKey: 'customer_support_specialist', displayRole: 'Customer Support Specialist' },
  'customer support representative': { canonicalKey: 'customer_support_specialist', displayRole: 'Customer Support Representative' },
  'support agent': { canonicalKey: 'customer_support_specialist', displayRole: 'Support Agent' },
  'customer service representative': { canonicalKey: 'customer_support_specialist', displayRole: 'Customer Service Representative' },
  'customer experience director': { canonicalKey: 'customer_experience_director', displayRole: 'Customer Experience Director' },
  'cx director': { canonicalKey: 'customer_experience_director', displayRole: 'CX Director' },
  'vp customer experience': { canonicalKey: 'customer_experience_director', displayRole: 'VP Customer Experience' },
  'community manager': { canonicalKey: 'community_manager', displayRole: 'Community Manager' },
  'cx operations manager': { canonicalKey: 'cx_operations_manager', displayRole: 'CX Operations Manager' },
  'customer operations manager': { canonicalKey: 'cx_operations_manager', displayRole: 'Customer Operations Manager' },
  'support operations': { canonicalKey: 'cx_operations_manager', displayRole: 'Support Operations Manager' },
};

// ── CANONICAL → ACTION GROUP ADDITIONS ────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_CONSULTING_MARKETING_CX: Record<string, string> = {
  management_consultant: 'management_consultant',
  strategy_consultant: 'strategy_consultant',
  technology_consultant: 'technology_consultant',
  risk_management_consultant: 'management_consultant',
  financial_advisory_consultant: 'strategy_consultant',
  hr_consultant: 'management_consultant',
  organizational_development_consultant: 'management_consultant',
  change_management_specialist: 'management_consultant',
  consultant_partner: 'independent_advisor',
  principal_consultant: 'independent_advisor',
  independent_advisor: 'independent_advisor',
  fractional_coo: 'independent_advisor',
  digital_marketing_manager: 'digital_marketing_manager',
  content_marketing_manager: 'content_marketing_manager',
  seo_specialist: 'seo_specialist',
  social_media_manager: 'content_marketing_manager',
  paid_media_specialist: 'digital_marketing_manager',
  brand_manager: 'brand_manager',
  growth_marketing_manager: 'growth_marketing_manager',
  product_marketing_manager: 'product_marketing_manager',
  email_marketing_specialist: 'digital_marketing_manager',
  marketing_analyst: 'digital_marketing_manager',
  public_relations_manager: 'brand_manager',
  communications_director: 'brand_manager',
  content_strategist: 'content_marketing_manager',
  copywriter: 'content_marketing_manager',
  technical_writer: 'content_marketing_manager',
  creative_director: 'brand_manager',
  campaign_manager: 'digital_marketing_manager',
  chief_marketing_officer: 'chief_marketing_officer',
  customer_support_specialist: 'customer_support_specialist',
  customer_success_manager_cx: 'customer_experience_director',
  cx_operations_manager: 'cx_operations_manager',
  quality_assurance_cx: 'cx_operations_manager',
  customer_experience_director: 'customer_experience_director',
  voice_of_customer_analyst: 'cx_operations_manager',
  community_manager: 'community_manager',
  trust_safety_analyst: 'cx_operations_manager',
  tier_2_technical_support: 'customer_support_specialist',
  support_team_lead: 'cx_operations_manager',
  chatbot_ai_trainer: 'cx_operations_manager',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_CONSULTING_MARKETING_CX: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  management_consultant: {
    roleKey: 'management_consultant', roleName: 'Management Consultant',
    demandIndex: 68, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 5,
    topHiringLocations: ['New York NY', 'Chicago IL', 'Washington DC', 'Boston MA', 'San Francisco CA'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'Big 3 firms stable; boutique consulting consolidating. AI tools compressing junior analyst layers.',
  },
  strategy_consultant: {
    roleKey: 'strategy_consultant', roleName: 'Strategy Consultant',
    demandIndex: 70, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 60, yoyJobOpeningsChange: 8,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Chicago IL', 'Austin TX'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Senior strategy roles growing; junior consultant roles under AI pressure for research/analysis tasks.',
  },
  technology_consultant: {
    roleKey: 'technology_consultant', roleName: 'Technology Consultant',
    demandIndex: 78, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 18,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Chicago IL', 'Washington DC'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'AI implementation consulting surging. SAP S/4HANA and Salesforce specialists chronically scarce.',
  },
  independent_advisor: {
    roleKey: 'independent_advisor', roleName: 'Independent Advisor / Fractional Executive',
    demandIndex: 75, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 25, yoyJobOpeningsChange: 28,
    topHiringLocations: ['Remote', 'New York NY', 'San Francisco CA', 'Austin TX', 'Miami FL'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Fractional executive market grew 180% 2022–2026. Startups prefer fractional to full-time overhead.',
  },
  digital_marketing_manager: {
    roleKey: 'digital_marketing_manager', roleName: 'Digital Marketing Manager',
    demandIndex: 70, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 32, yoyJobOpeningsChange: 3,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Los Angeles CA', 'Austin TX', 'Chicago IL'],
    aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1',
    calibrationNote: 'AI tools automating campaign setup and reporting. Attribution analysis and strategic oversight roles protected.',
  },
  growth_marketing_manager: {
    roleKey: 'growth_marketing_manager', roleName: 'Growth Marketing Manager',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 16,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Seattle WA', 'Los Angeles CA'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'SaaS expansion driving growth marketing demand. Specialists with CAC/LTV ownership in shortage.',
  },
  seo_specialist: {
    roleKey: 'seo_specialist', roleName: 'SEO Specialist / Manager',
    demandIndex: 68, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 28, yoyJobOpeningsChange: -5,
    topHiringLocations: ['Remote', 'New York NY', 'Los Angeles CA', 'Chicago IL', 'Austin TX'],
    aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1',
    calibrationNote: 'AI content tools compressing content-focused SEO demand. Technical SEO and programmatic SEO roles growing.',
  },
  product_marketing_manager: {
    roleKey: 'product_marketing_manager', roleName: 'Product Marketing Manager',
    demandIndex: 74, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 14,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Boston MA'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'PMM demand strong in B2B SaaS. Senior PMMs who own positioning and launch outcomes most protected.',
  },
  content_marketing_manager: {
    roleKey: 'content_marketing_manager', roleName: 'Content Marketing Manager',
    demandIndex: 65, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 28, yoyJobOpeningsChange: -8,
    topHiringLocations: ['Remote', 'New York NY', 'San Francisco CA', 'Austin TX', 'Chicago IL'],
    aiSubstitutionRisk: 0.42, dataQuarter: '2026-Q1',
    calibrationNote: 'AI writing tools reducing generalist content headcount. AI-augmented content strategists and editors in demand.',
  },
  brand_manager: {
    roleKey: 'brand_manager', roleName: 'Brand Manager',
    demandIndex: 65, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 38, yoyJobOpeningsChange: 2,
    topHiringLocations: ['New York NY', 'Chicago IL', 'Los Angeles CA', 'Cincinnati OH', 'Atlanta GA'],
    aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1',
    calibrationNote: 'CPG brand manager demand stable. AI compressing junior/coordinator brand roles. Strategic brand leadership protected.',
  },
  chief_marketing_officer: {
    roleKey: 'chief_marketing_officer', roleName: 'Chief Marketing Officer',
    demandIndex: 62, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 110, yoyJobOpeningsChange: 5,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Chicago IL', 'Boston MA'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'CMO tenure averaging 2.8 years — high turnover creates demand. Revenue-connected CMOs most retained.',
  },
  customer_support_specialist: {
    roleKey: 'customer_support_specialist', roleName: 'Customer Support Specialist',
    demandIndex: 58, demandTrend: 'declining', jobOpeningsTrend: 'declining', salaryTrend: 'stable',
    timeToFillDays: 18, yoyJobOpeningsChange: -12,
    topHiringLocations: ['Remote', 'Austin TX', 'Salt Lake City UT', 'Phoenix AZ', 'Bengaluru India'],
    aiSubstitutionRisk: 0.52, dataQuarter: '2026-Q1',
    calibrationNote: 'AI chatbots handling 35–60% of Tier 1 volume at leading tech companies. Tier 2 technical support growing.',
  },
  customer_experience_director: {
    roleKey: 'customer_experience_director', roleName: 'Customer Experience Director',
    demandIndex: 72, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 20,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Austin TX', 'Chicago IL', 'Seattle WA'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'CX leadership demand rising as companies prioritize retention. NPS-to-revenue linkage making CX a P&L function.',
  },
  community_manager: {
    roleKey: 'community_manager', roleName: 'Community Manager',
    demandIndex: 65, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'stable',
    timeToFillDays: 30, yoyJobOpeningsChange: 5,
    topHiringLocations: ['Remote', 'San Francisco CA', 'New York NY', 'Austin TX', 'Los Angeles CA'],
    aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1',
    calibrationNote: 'Community-Led Growth positioning elevating community manager roles beyond social media management.',
  },
  cx_operations_manager: {
    roleKey: 'cx_operations_manager', roleName: 'CX Operations Manager',
    demandIndex: 70, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 40, yoyJobOpeningsChange: 15,
    topHiringLocations: ['Remote', 'Austin TX', 'New York NY', 'Chicago IL', 'Salt Lake City UT'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'AI deflection programs require ops managers who can configure and optimize AI tools. This role is growing.',
  },
};

// ── COMPENSATION ADDITIONS ─────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_CONSULTING_MARKETING_CX: Record<string, Record<string, number>> = {
  management_consultant: { '0-2': 85_000, '2-5': 115_000, '5-10': 160_000, '10-15': 220_000, '15+': 290_000 },
  strategy_consultant: { '0-2': 90_000, '2-5': 125_000, '5-10': 175_000, '10-15': 240_000, '15+': 320_000 },
  technology_consultant: { '0-2': 95_000, '2-5': 130_000, '5-10': 175_000, '10-15': 230_000, '15+': 295_000 },
  independent_advisor: { '0-2': 80_000, '2-5': 120_000, '5-10': 180_000, '10-15': 260_000, '15+': 360_000 },
  digital_marketing_manager: { '0-2': 65_000, '2-5': 80_000, '5-10': 100_000, '10-15': 125_000, '15+': 155_000 },
  growth_marketing_manager: { '0-2': 75_000, '2-5': 95_000, '5-10': 125_000, '10-15': 160_000, '15+': 200_000 },
  seo_specialist: { '0-2': 55_000, '2-5': 70_000, '5-10': 90_000, '10-15': 115_000, '15+': 140_000 },
  product_marketing_manager: { '0-2': 85_000, '2-5': 110_000, '5-10': 140_000, '10-15': 175_000, '15+': 215_000 },
  content_marketing_manager: { '0-2': 55_000, '2-5': 70_000, '5-10': 88_000, '10-15': 108_000, '15+': 130_000 },
  brand_manager: { '0-2': 65_000, '2-5': 82_000, '5-10': 105_000, '10-15': 130_000, '15+': 160_000 },
  chief_marketing_officer: { '0-2': 175_000, '2-5': 220_000, '5-10': 280_000, '10-15': 360_000, '15+': 450_000 },
  customer_support_specialist: { '0-2': 42_000, '2-5': 52_000, '5-10': 62_000, '10-15': 72_000, '15+': 82_000 },
  customer_experience_director: { '0-2': 120_000, '2-5': 150_000, '5-10': 185_000, '10-15': 230_000, '15+': 285_000 },
  community_manager: { '0-2': 52_000, '2-5': 65_000, '5-10': 80_000, '10-15': 98_000, '15+': 118_000 },
  cx_operations_manager: { '0-2': 70_000, '2-5': 88_000, '5-10': 110_000, '10-15': 135_000, '15+': 165_000 },
};

// ── NEGOTIATION SCRIPT ADDITIONS ──────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_CONSULTING_MARKETING_CX: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  management_consultant: {
    strongOpener: 'I\'ve led $X in client engagements this year with an average client satisfaction score of Y, and I\'d like to discuss how my compensation reflects that contribution and my market value.',
    leverageContext: 'My client relationships generate $X in annual revenue for the firm. Replacing my client contact at this stage of the engagement would create transition risk that exceeds a year of the compensation adjustment I\'m requesting.',
    countersScript: 'I\'m asking for a base adjustment to $X, consistent with what comparable firms pay for my level and utilization. I\'m also interested in a clear promotion timeline — I\'d like to understand the criteria for principal/partner advancement.',
    walkAwayLine: 'I\'ve been in conversations with a boutique strategy firm and an in-house strategy team. I\'d prefer to continue building here, but I need the compensation to match my contribution.',
  },
  growth_marketing_manager: {
    strongOpener: 'I\'d like to share my growth performance data before we discuss compensation. In the past [timeframe], I\'ve reduced CAC by X%, increased LTV by Y%, and generated $Z in attributable pipeline.',
    leverageContext: 'The growth program I\'ve built is responsible for $X of our current ARR. Interrupting it for a 3-6 month search, ramp, and rebuild would cost more than a compensation adjustment.',
    countersScript: 'I\'m requesting a total compensation adjustment to $X, aligned with what comparable growth managers earn at companies at our ARR. I\'d also like equity acceleration tied to the growth milestones I\'ve already delivered.',
    walkAwayLine: 'I have a VP Growth opportunity at a Series B company with equity that would generate significantly more total comp. I\'d rather stay and build on the momentum here, but I need the compensation to reflect market rate.',
  },
  chief_marketing_officer: {
    strongOpener: 'I\'ve put together a board-ready summary of marketing\'s revenue contribution this quarter: $X in pipeline influenced, $Y in customer acquisition, and a CAC improvement of Z% versus prior year.',
    leverageContext: 'The brand equity we\'ve built, the demand generation programs, and the customer acquisition infrastructure I\'ve created took 18 months to build and would take at least 12 months to rebuild under a new leader — with significant revenue risk during that period.',
    countersScript: 'I\'m asking for total compensation of $X, including a meaningful equity refresh given the value I\'ve created. This is consistent with what CMOs at companies at our revenue stage command.',
    walkAwayLine: 'I\'ve been approached by two other companies seeking CMOs with my background. I\'m committed to this company\'s success but need the compensation to reflect both the market and the value I\'ve already created here.',
  },
  customer_experience_director: {
    strongOpener: 'I\'ve prepared a CX ROI summary: since implementing our new experience programs, NPS has improved by X points, churn has reduced by Y%, and we\'ve protected $Z in ARR from at-risk accounts.',
    leverageContext: 'The retention program I\'ve built directly protects $X in annual recurring revenue. Any disruption to this program during a leadership transition creates immediate churn risk.',
    countersScript: 'I\'m requesting a base adjustment to $X and a quarterly bonus tied to NPS and churn metrics I directly influence. This structure aligns my incentives with the business outcomes I\'m accountable for.',
    walkAwayLine: 'I have an offer from a Series C company for a VP Customer Experience role with equity. I\'d prefer to continue building here if we can close the compensation gap.',
  },
};
