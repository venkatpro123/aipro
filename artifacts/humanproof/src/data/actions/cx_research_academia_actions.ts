// cx_research_academia_actions.ts — v38.0 Phase 2 Supplement
// 14 roles: 6 Customer Support Scale (enterprise/ops/WFM/AI-training/KB/VoC) +
//           8 Research & Academia (postdoc/lab-director/sci-policy/tech-transfer/
//           commercialization/think-tank/independent/sci-journalism)
// NOTE: customer_support_specialist, customer_experience_director, community_manager,
//       cx_operations_manager already exist in consulting_marketing_cx_actions.ts

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

// ── Shared networking action for CX support roles ────────────────────────────

const A_CX_NETWORKING: BracketPool = pool(
  { title: 'Earn HDI Support Center Analyst (HDI-SCA) Certification', description: 'HDI-SCA ($295) is the baseline credential for customer support professionals recognized by enterprise hiring managers. The certification covers ITIL-aligned support practices, escalation management, and SLA adherence — content directly tested in technical support interviews. Study time: 2-3 weeks. Pair with the HDI practice exam bundle ($45) for a first-pass result.', layerFocus: 'L3 · Skills', riskReductionPct: 12, deadline: '30 days', priority: 'Medium' },
  { title: 'Join the CXPA Community and Target CCXP Certification', description: 'The Customer Experience Professionals Association (CXPA) community provides a direct pipeline to senior CX roles at Salesforce, Zendesk, Medallia, and Qualtrics. The CCXP credential (Certified Customer Experience Professional, $395 exam) is the gold-standard certification — 78% of CCXP holders report a salary increase within 12 months of earning it. Attend 2 CXPA virtual events per quarter.', layerFocus: 'L4 · Network', riskReductionPct: 16, deadline: '90 days', priority: 'Medium' },
  { title: 'Build a Personal CX Metrics Portfolio with NPS/CSAT/CES Benchmarks', description: 'Senior CX professionals who can present quantified outcomes — "reduced ticket re-open rate 34%, lifted CSAT from 72 to 88 in 9 months, reduced average handle time 18% via Intercom AI" — earn 25-40% more than peers with equivalent tenure. Document your top 5 metric improvements. Use Medallia or Qualtrics data exports as evidence. Publish a LinkedIn article presenting one benchmark story.', layerFocus: 'L3 · Reputation', riskReductionPct: 18, deadline: '21 days', priority: 'Medium' },
  { title: 'Audit LinkedIn for Specific Platform Certifications and Metrics Language', description: 'CX hiring managers search by platform: Zendesk Admin ($500 cert), Salesforce Service Cloud Consultant ($200 exam), Freshdesk, ServiceNow CSM, Medallia, Qualtrics XM. Add each platform you have hands-on certification or deployment experience with. Include metrics language: CSAT, CES, NPS, FCR, AHT, MTTR. Triples recruiter outreach within 30 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
  { title: 'Target a Zendesk / Salesforce Service Cloud Partner or Consultancy Role', description: 'CX platform partners (Zendesk Premier Partners, Salesforce SIs like Accenture, Slalom, Cognizant) pay 20-35% above enterprise end-user roles and provide exposure to 5-10x more implementations. Apply to 2-3 partner firms this week — they continuously hire experienced CX platform operators for consulting roles at $95K-$160K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
);

// ── Shared networking action for Research & Academia roles ───────────────────

const A_RESEARCH_NETWORKING: BracketPool = pool(
  { title: 'Submit an NSF Graduate Research Fellowship (GRFP) or Small Research Grant Proposal', description: 'The NSF GRFP ($37K/year stipend for 3 years) is the career-defining early-career credential for US research careers. Even rejection generates formal peer reviewer feedback — a rare developmental resource. Applications open annually in October; statement review by a senior mentors is essential. This investment pays 10x in academic job market differentiation.', layerFocus: 'L3 · Reputation', riskReductionPct: 18, deadline: '6 months — plan now', priority: 'Medium' },
  { title: 'Build a Public Research Portfolio on GitHub + Google Scholar + ORCID', description: 'A complete ORCID profile, Google Scholar page, and GitHub repo (for code/data from papers) makes you 3x more discoverable to industry recruiters and grant program managers at NSF, NIH, and DARPA. Upload preprints to arXiv, bioRxiv, or SSRN immediately upon acceptance. Researchers with >500 Google Scholar citations are favored in NSF review panels.', layerFocus: 'L3 · Visibility', riskReductionPct: 14, deadline: '7 days', priority: 'Medium' },
  { title: 'Attend 1 National Conference and Present Poster or Talk', description: 'Conference presentations at IEEE, ACM, AAAS Annual Meeting, or your field\'s flagship conference are the primary networking mechanism in research careers. Even a poster presentation — not just oral talks — places you in front of hiring committee members, program managers, and industry labs (Argonne, Oak Ridge, MIT Lincoln Lab). Submit an abstract this cycle.', layerFocus: 'L4 · Network', riskReductionPct: 16, deadline: '90 days', priority: 'Medium' },
  { title: 'Connect with 3 Technology Transfer Office (TTO) or Research Commercialization Professionals', description: 'University TTOs, National Lab CRADAs, and SBIR/STTR program officers are the gateway to research commercialization careers (technology transfer specialist, licensing manager, venture development director). These professionals are perpetually understaffed and actively welcome conversations with researchers exploring the transition. AUTM membership ($150) provides the directory.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Publish a Preprint on arXiv / bioRxiv / SSRN Within 30 Days of Completing Manuscript', description: 'Preprint publication immediately before or concurrent with journal submission establishes priority, generates citations 6-18 months earlier than print publication, and feeds Google Scholar/ORCID metrics. This habit compounds: researchers who consistently preprint accumulate 30-50% more citations per paper than non-preprinters per a 2024 PLOS ONE study.', layerFocus: 'L3 · Reputation', riskReductionPct: 10, deadline: '30 days', priority: 'Medium' },
);

// ── ACTION_DB_CX_RESEARCH_ACADEMIA ───────────────────────────────────────────

export const ACTION_DB_CX_RESEARCH_ACADEMIA: Record<string, BracketPool> = {

  enterprise_support_engineer: pool(
    { title: 'Earn Zendesk Support Administrator Certification and Build a Demo Portfolio', description: 'The Zendesk Support Administrator cert ($500) + Salesforce Service Cloud Administrator ($200) combination is the baseline credential bar for enterprise support engineer roles at SaaS companies. Pair with hands-on demo environments (free Zendesk sandbox + Salesforce developer org). Document 3 complex routing/automation configurations on GitHub. This portfolio converts a tier-1 support background into an enterprise-facing technical role at $80K-$105K.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Transition from Support to Solutions Engineering Track', description: 'Enterprise support engineers with deep product and API knowledge are the natural pipeline for solutions engineering roles ($120K-$185K). Document 5 complex customer technical resolutions involving API calls, webhooks, or custom integrations. Apply specifically to "Solutions Engineer — Customer Success" roles at Zendesk, Salesforce, Freshdesk, Intercom, or ServiceNow. This track pays 40-60% more than senior support individual contributor paths.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Master Gong / Chorus Conversation Intelligence and Publish a Support Analytics Methodology', description: 'Enterprise support engineers who can quantify their impact using Gong conversation intelligence, CSAT trend analysis, and Zendesk Explore dashboards earn $130K-$150K at senior levels. Build a personal methodology doc: how you use conversation intelligence to identify top contact reasons, reduce repeat contacts, and inform product feedback loops. This becomes a portfolio piece for senior enterprise support + escalation roles.', layerFocus: 'L3 · Reputation', riskReductionPct: 24, deadline: '45 days', priority: 'High' },
    A_CX_NETWORKING.senior.high[0], A_CX_NETWORKING.junior.moderate[0],
  ),

  support_operations_director: pool(
    { title: 'Lead a Contact Center AI/Automation Transformation Initiative', description: 'Support Operations Directors who can demonstrate having led an AI deflection program — deploying Intercom Fin AI, Salesforce Einstein, or Kustomer AI to deflect 20-40% of ticket volume — are earning $155K-$195K and being recruited aggressively by Series B+ SaaS companies. Document the ROI: tickets deflected, CSAT delta, cost savings, headcount avoided. Present it as a board-level business case.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Obtain COPC Coordinator Certification and Implement COPC Standards', description: 'COPC Inc. certification ($2,500-$5,000) is the gold-standard operational excellence framework for enterprise contact centers. Directors with COPC Coordinator certification earn 20-30% above uncertified peers and are specifically sought by BPOs (Teleperformance, Concentrix), enterprise in-house centers, and CX platform vendors for VP/Director roles. COPC certification also opens consulting advisory paths at $300/hr+.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Expertise in Verint or NICE Workforce Optimization Platforms', description: 'Verint Workforce Management (WFM) and NICE CXone are the dominant enterprise contact center platforms — proficiency in either opens Director+ roles at large enterprise. Obtain Verint Certification or NICE CXone Administrator credential. This is the specific technical differentiator for Operations Director roles above $150K.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_CX_NETWORKING.senior.high[0], A_CX_NETWORKING.senior.moderate[0],
  ),

  workforce_management_analyst_cx: pool(
    { title: 'Earn Verint Workforce Management Certification', description: 'Verint WFM and NICE CXone are the dominant contact center WFM platforms. Verint Workforce Management certification ($500-$1,500 via Verint University) is the credential bar. WFM analysts with certified platform expertise earn $78K-$105K versus $62K-$75K for uncertified peers. Start with Verint University free modules to assess the self-study path.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '60 days', priority: 'Critical' },
    { title: 'Build a Forecasting Accuracy Portfolio Using Historical Staffing Data', description: 'Contact center WFM roles are increasingly measured on forecast accuracy (MAPE < 5% is gold-standard). Build a portfolio piece: using Excel or Python, demonstrate a multi-week staffing forecast model that accounts for seasonality, campaign volume spikes, and attrition. Publish the methodology (anonymized data) on LinkedIn. This converts a reactive schedule-filler into a strategic WFM analyst worth $15K-$20K more.', layerFocus: 'L3 · Reputation', riskReductionPct: 22, deadline: '45 days', priority: 'High' },
    { title: 'Transition to WFM Analyst at a BPO or CX Outsourcing Firm', description: 'BPOs (Teleperformance, Concentrix, TTEC) and CX platform vendors (Zendesk, Salesforce, NICE) are the highest-paying WFM employers. Senior WFM analysts at Concentrix earn $90K-$110K versus $65K-$80K in most enterprise in-house roles. Apply to 3 BPO/vendor WFM roles this week — they have continuous hiring pipelines.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '14 days', priority: 'Critical' },
    A_CX_NETWORKING.senior.high[0], A_CX_NETWORKING.junior.moderate[0],
  ),

  chatbot_ai_trainer: pool(
    { title: 'Build a Conversational AI Training Portfolio with Real LLM Fine-tuning Examples', description: 'AI trainers who can demonstrate RLHF annotation work, prompt engineering for support bots (Intercom Fin AI, Kustomer AI, Salesforce Einstein), and chatbot intent taxonomy design are being hired at $90K-$130K by Zendesk, Intercom, Salesforce, and dedicated AI training platforms (Scale AI, Surge AI). Build a portfolio: a documented chatbot intent taxonomy (50+ intents), 10 annotated conversation examples, and a published article on AI training methodology.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '45 days', priority: 'Critical' },
    { title: 'Earn a Prompt Engineering or Conversational AI Certification', description: 'The Andrew Ng "Prompt Engineering for Developers" (DeepLearning.AI, free) + Google\'s "Conversational AI with Dialogflow" ($300) + OpenAI Applied AI course is the 2026 credential stack for chatbot AI trainers. Pair with documentation of your Intercom Fin AI or Freshdesk AI training workflows. This stack adds $18K-$28K to base offer at AI-first CX companies.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply to AI Training Roles at Dedicated AI Data Platforms', description: 'Scale AI, Surge AI, Appen, and Remotasks pay $85K-$140K for experienced conversational AI trainers with quality assurance expertise. These companies also provide career ladder progression to AI/ML program manager and quality lead roles. Apply to 3 roles this week — the market for structured AI trainers is surging 60-80% YoY in 2026.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '7 days', priority: 'Critical' },
    A_CX_NETWORKING.senior.high[0], A_CX_NETWORKING.junior.moderate[0],
  ),

  knowledge_base_specialist: pool(
    { title: 'Earn a Content Strategy or Technical Writing Certification', description: 'The STC (Society for Technical Communication) Certified Professional Technical Communicator (CPTC, $300) or Google Technical Writing certificate (free) plus a documentation platform certification (Confluence, Guru, Notion) provides the credential stack. Knowledge base specialists with documented platform expertise earn $72K-$88K versus $55K-$65K for unqualified peers. Prioritize the CPTC if you plan to advance to a content strategy or technical documentation manager path.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'Critical' },
    { title: 'Build a Measurable Self-Service Deflection Portfolio', description: 'Knowledge base specialists who can quantify their impact — "improved self-serve resolution rate from 28% to 51%, reducing tier-1 ticket volume by 2,800/month" — earn 30-40% more than peers without metrics. Use Zendesk Guide analytics, Salesforce Service Cloud knowledge reports, or Freshdesk Analytics to extract deflection data. Build a portfolio document and publish 1 LinkedIn article on self-service optimization methodology.', layerFocus: 'L3 · Reputation', riskReductionPct: 20, deadline: '30 days', priority: 'High' },
    { title: 'Transition to a Content Operations or Knowledge Management Platform Role', description: 'Knowledge base specialists who move to knowledge management platform vendors (Guru, Confluence, Notion, Helpjuice) or CX platform KM teams (Zendesk Guide, Salesforce Knowledge) earn 30-50% more. These vendor roles typically include better equity, remote flexibility, and career advancement to KM program manager ($85K-$110K). Apply to 2 vendor-side KM roles this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '14 days', priority: 'High' },
    A_CX_NETWORKING.senior.high[0], A_CX_NETWORKING.junior.moderate[0],
  ),

  voice_of_customer_analyst: pool(
    { title: 'Earn Qualtrics XM or Medallia Certified Associate Credential', description: 'Qualtrics XM Certification ($395) or Medallia Certified Partner credential is the baseline for VoC analyst roles above $90K. Both platforms have official certification programs. Qualtrics XM Institute also offers a free CX professional certification. VoC analysts with platform certifications are hired preferentially by BFSI, healthcare, and retail enterprise — the three largest buyers of Medallia and Qualtrics.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Build a Closed-Loop VoC Methodology and Present an Outcome Story', description: 'The top differentiator in VoC analyst hiring is proven closed-loop feedback experience: capturing NPS/CSAT/CES, routing to the right team, tracking resolution, and demonstrating improvement. Document 1 closed-loop case study: survey deployment → insight → action → measured outcome improvement. Present it in your LinkedIn profile summary. Senior VoC analysts with closed-loop evidence earn $105K-$130K.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '30 days', priority: 'Critical' },
    { title: 'Apply to Qualtrics / Medallia / Satmetrix Partner or Vendor Roles', description: 'VoC analysts who move to platform vendors (Qualtrics XM Success Team, Medallia Customer Success) earn $115K-$140K plus equity, versus $80K-$100K at most enterprise end-user companies. Qualtrics and Medallia are both aggressively hiring experienced VoC practitioners for CS and solutions roles. Apply to 2 vendor-side roles this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '14 days', priority: 'High' },
    A_CX_NETWORKING.senior.high[0], A_CX_NETWORKING.junior.moderate[0],
  ),

  postdoctoral_researcher: pool(
    { title: 'Apply for NIH NRSA F32 or NSF Postdoctoral Fellowship (Alternative to Standard Postdoc)', description: 'The NIH NRSA F32 Individual Postdoctoral Fellowship ($56K-$68K stipend + $10.5K institutional allowance) and NSF Postdoctoral Research Fellowships ($72K-$82K) pay dramatically more than most academic postdoc positions and provide independent project control — critical for faculty application competitiveness. The application process for F32 (due Nov/March cycles) starts 6 months prior. Your specific aims should be co-developed with your faculty mentor.', layerFocus: 'L3 · Reputation', riskReductionPct: 24, deadline: '6 months — plan immediately', priority: 'Critical' },
    { title: 'Build a First-Author Publication Record in Nature/Science/Cell or Flagship Field Journals', description: 'The brutal reality of the academic job market in 2026: a Nature/Science/Cell first-author paper is worth 20-30 standard journal papers in faculty search committee deliberations. Your postdoc time is most productively invested in one high-stakes project targeted at a flagship journal. Simultaneously publish supporting work to bioRxiv/arXiv to maintain citation count while the flagship is under review.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '24 months', priority: 'Critical' },
    { title: 'Develop an Industry Postdoc or R&D Scientist Parallel Track', description: 'Industry postdocs at pharma (Pfizer, Genentech, Merck), tech (Google DeepMind, Microsoft Research, IBM Research), and National Labs (Argonne, Oak Ridge, NREL, PNNL) pay $75K-$110K versus $56K-$68K on NIH scale, with far better industry conversion rates. Apply to 3 industry postdoc programs in parallel with academic positions. Industry postdoc → R&D scientist ($125K-$180K) is a reliably faster path to $100K+ than the academic tenure track.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '14 days', priority: 'Critical' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.junior.moderate[0],
  ),

  research_lab_director: pool(
    { title: 'Develop a Strategic Research Agenda Tied to NSF/NIH/DARPA Priority Areas', description: 'Lab directors who can articulate a 5-year research agenda aligned with NSF Big Ideas (e.g., Convergence Accelerators), NIH High Priority Research Areas, or DARPA program thrust areas can secure 3-5x larger grants than generalist researchers. Book a meeting with your NSF/NIH program officer this quarter — they will tell you exactly what the next priority funding cycle will target. Program officer relationships are the highest-ROI grant writing investment.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Submit a Multi-Investigator Center Grant (NIH P01/U01 or NSF Science and Technology Center)', description: 'Center grants (NIH P01 $3M-$10M, NSF STC $25M-$50M over 10 years) are the career-defining achievement for senior lab directors. They are also protection against budget cycles — a funded center is rarely eliminated mid-project. Begin pre-submission engagement with your program officer 18 months before the deadline. Co-PI collaborations with 3-5 labs are typically required.', layerFocus: 'L3 · Reputation', riskReductionPct: 36, deadline: '18 months — start now', priority: 'Critical' },
    { title: 'Build an Industry Partnership via CRADA, Sponsored Research Agreement, or SBIR Phase II', description: 'Lab directors with an active industry partnership portfolio (CRADAs with National Labs, sponsored research agreements, or SBIR Phase II co-PI roles) are dramatically more resilient to federal funding cuts. Industry-funded research ($200K-$2M contracts) also diversifies the revenue base and creates commercialization options. Identify 3 industry partners in your research area and schedule conversations this month.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'High' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.senior.moderate[0],
  ),

  science_policy_advisor: pool(
    { title: 'Apply for an AAAS Science & Technology Policy Fellowship', description: 'The AAAS S&T Policy Fellowship ($95K-$100K + benefits for 1-2 years) is the premier pathway from research into US federal science policy. Fellows are placed at federal agencies (NSF, NIH, DOE, DARPA, State Department, Congress). The application cycle opens in September with January interviews. Even unsuccessful applicants gain contacts with congressional science offices and agency program managers that open non-fellowship policy roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '4 months — application opens September', priority: 'Critical' },
    { title: 'Publish Science Policy Op-Eds in Science, Nature, or The Conversation', description: 'Science policy advisors who publish in policy-facing outlets (Science Magazine policy forum, Nature News & Comment, The Conversation, Issues in Science and Technology, Science & Diplomacy) build the public visibility that drives appointment to federal advisory committees (NSAC, BESAC, PCAST subcommittees). A Science policy forum piece reaches 250,000+ readers. Target 1 policy-focused publication per 6 months.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Join a RAND or Brookings Research Network', description: 'RAND Corporation, Brookings Institution, CSIS, FAS (Federation of American Scientists), and New America are the primary think tanks for science policy careers ($80K-$145K). All have visiting fellow, affiliated researcher, or non-resident senior fellow programs that create formal institutional affiliations without requiring relocation. These affiliations provide the institutional credibility required for congressional testimony and agency advisory committee appointments.', layerFocus: 'L4 · Network', riskReductionPct: 24, deadline: '90 days', priority: 'High' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.junior.moderate[0],
  ),

  technology_transfer_specialist: pool(
    { title: 'Earn the RTTP (Registered Technology Transfer Professional) Credential', description: 'RTTP ($600 exam + AUTM membership $300/year) is the gold-standard credential for technology transfer specialists — the equivalent of the CPA for the field. It signals mastery of Bayh-Dole Act compliance, CRADA agreements, licensing term structures, and invention disclosure workflows. RTTP holders earn $110K-$145K versus $80K-$100K for non-certified TTS professionals. Register for the AUTM Annual Meeting to accelerate study.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Licensing Negotiation Portfolio with Documented Deal Terms', description: 'Technology transfer specialists who can point to a specific licensing portfolio — "negotiated 12 exclusive/non-exclusive licenses, generating $2.8M in royalty revenue, including 2 pharma licenses with milestone provisions" — earn 35-50% more than peers without a documented deal track record. Work with your TTO director to formally claim co-credit on completed deals for portfolio documentation. This is the path to TTO Director ($145K-$200K).', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Join a SBIR/STTR Phase I Commercialization Effort as Co-PI or PI', description: 'Technology transfer specialists who understand SBIR/STTR Phase I ($256K) and Phase II ($1.7M) mechanisms from the applicant side — not just the university TTO side — earn premium placement at National Lab technology deployment offices (Argonne IL, ORNL, NREL, PNNL) and industry-aligned TTOs. Co-PI on 1 SBIR Phase I proposal demonstrates dual-side commercialization expertise that distinguishes you from pure licensing professionals.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '90 days', priority: 'High' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.junior.moderate[0],
  ),

  research_commercialization_manager: pool(
    { title: 'Build a Cross-Disciplinary Startup Formation Track Record', description: 'Research commercialization managers who have directly supported 3+ university spinout formations — from lab-to-company structure, founder team assembly, seed funding strategy, and NSF I-Corps completion — are in acute shortage at major research universities and National Labs. Document each spinout: sector, stage at first engagement, current status. This portfolio opens VP-level commercialization roles ($145K-$180K) and National Lab industry partnership director roles ($160K-$200K).', layerFocus: 'L3 · Reputation', riskReductionPct: 34, deadline: '180 days', priority: 'Critical' },
    { title: 'Complete NSF I-Corps Program and Become a Mentor', description: 'NSF I-Corps Teams program participation ($50K per team, no direct cost to the mentor) provides the lean startup customer discovery framework applied to deep tech. Completing I-Corps as a mentoring EL (Entrepreneurial Lead support) gives you a credential recognized by NCIIA, SBA, and every major university VPR office. I-Corps mentors earn $15K-$30K per cohort as program instructors at R1 universities.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to National Lab Technology Deployment or Commercialization Manager Roles', description: 'Argonne National Lab, Oak Ridge National Lab, NREL, PNNL, and MIT Lincoln Lab all have dedicated commercialization and technology deployment managers earning $130K-$180K with federal benefits. DOE National Labs are dramatically more stable employers than university VPR offices (dependent on grant funding). Apply to 2 National Lab commercialization manager roles this week.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.senior.moderate[0],
  ),

  think_tank_researcher: pool(
    { title: 'Publish a Policy-Focused Brief in a Brookings/RAND/CSIS/FAS Format', description: 'Think tanks hire based on publication track record and methodology fit — not credentials alone. Publishing 1-2 policy briefs in the Brookings-style format (5-8 pages, clear recommendations, non-partisan framing, executive summary) and distributing them via The Conversation or SSRN establishes the "think tank style" credentials. A brief cited in congressional testimony or a federal agency RFI immediately opens Associate Fellow paths.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply for Non-Resident Fellow or Visiting Scholar Affiliation', description: 'Brookings Institution, RAND, Urban Institute, New America, and CSIS offer non-resident senior fellow / visiting scholar affiliations (typically unpaid or nominally stipended) that provide institutional email, publication support, and event access. These affiliations create a formal credential while you continue academic or industry employment. Most require 1-2 relevant publications and a research agenda pitch. Apply to 2 programs this quarter.', layerFocus: 'L4 · Network', riskReductionPct: 24, deadline: '90 days', priority: 'Critical' },
    { title: 'Build Cross-Government and Hill Relationships via AAAS or APSA Congressional Fellowship', description: 'The AAAS S&T Policy Fellowship and APSA Congressional Fellowship ($56K stipend) place researchers in congressional offices and federal agencies for 1 year. Even without the fellowship, attending AAAS Forum on Science & Technology Policy and following up with congressional science staff creates relationships that open Think Tank → Government transitions ($95K-$145K) when administration changes create hiring cycles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '4 months', priority: 'High' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.junior.moderate[0],
  ),

  independent_researcher: pool(
    { title: 'Build a NIH R21 or NSF EAGER Exploratory Grant Portfolio', description: 'Independent researchers (without institutional affiliation) can apply for NIH R21 Exploratory/Developmental Research Grants ($275K over 2 years) through an institutional sponsor — many community colleges and 4-year universities will serve as sponsor institutions for a fee-for-service arrangement. NSF EAGER grants are similarly accessible. Securing 1 independent grant transforms your status from "unaffiliated researcher" to "PI" — critical for the next grant and publishing access.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Affiliate with a University as Adjunct, Collaborator, or Research Scientist', description: 'Independent researchers who secure an adjunct faculty, research scientist, or courtesy affiliate appointment gain institutional email access, library access (including Springer, Elsevier, Nature, ACS journals), and — critically — the ability to be listed as PI or Co-PI on federal grants. Contact 5 department chairs or research office directors at regional universities this week. These affiliations are often granted for minimal or no cost in exchange for expected grant overhead.', layerFocus: 'L4 · Network', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Diversify Revenue via Consulting, Expert Witness, or Science Communication Contracts', description: 'Independent researchers who rely on a single funding stream face catastrophic risk at grant expiration. Build 3 revenue streams: (1) a federal grant as anchor, (2) a $2K-$8K/month industry consulting retainer in your research domain, (3) expert witness engagements ($500-$1,500/hr in litigation contexts). The consulting retainer alone is often achievable within 90 days by reaching out to 10 industry contacts in your research area.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.junior.moderate[0],
  ),

  science_journalist: pool(
    { title: 'Build a Science Beat Specialization Portfolio in a High-Demand Area (AI, Climate, Biotech)', description: 'Science journalists with a demonstrable beat specialization in AI/ML, climate science, or biotechnology/genomics are in the top 20% of earnings for the field ($80K-$115K). Outlets paying premium for AI beat coverage in 2026 include MIT Technology Review ($75K-$105K staff), Ars Technica, Nature News, Science News, and The Atlantic Science section. Publish 5 articles in your target beat through freelance or contributor roles to build a beat portfolio.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply for AAAS Mass Media Fellowship or Knight Science Journalism Fellowship', description: 'The AAAS Mass Media Fellowship ($6,500 stipend for 10-week summer program at major news outlets) and MIT Knight Science Journalism Fellowship ($70K for 9 months at MIT) are the premier credentials for science journalists. Fellowship alumni are preferentially hired by Science, Nature News, NPR Science Friday, and major newspaper science desks at 30-50% salary premium over non-fellows. Application cycles open in October-November.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '4 months — plan now', priority: 'Critical' },
    { title: 'Develop a Science Communication Revenue Diversification Strategy', description: 'Staff science journalist positions at traditional outlets are declining 5-8% per year. The resilient path is revenue diversification: (1) staff role or long-term contract at a digital outlet (Ars Technica, The Conversation, MIT Technology Review), (2) Substack science newsletter (monetize at 500+ paid subscribers, $7-$12/month), (3) science communication consulting for universities and research institutes ($3K-$8K per press release package). Start building the newsletter while employed.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_RESEARCH_NETWORKING.senior.high[0], A_RESEARCH_NETWORKING.junior.moderate[0],
  ),

};

// ── ALIAS ADDITIONS ───────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_CX_RESEARCH_ACADEMIA: Record<string, { canonicalKey: string; displayRole: string }> = {
  // enterprise_support_engineer
  'enterprise support engineer':          { canonicalKey: 'enterprise_support_engineer', displayRole: 'Enterprise Support Engineer' },
  'technical support engineer':           { canonicalKey: 'enterprise_support_engineer', displayRole: 'Technical Support Engineer' },
  'enterprise technical support':         { canonicalKey: 'enterprise_support_engineer', displayRole: 'Enterprise Technical Support' },
  'customer support engineer':            { canonicalKey: 'enterprise_support_engineer', displayRole: 'Customer Support Engineer' },
  'tier 2 support engineer':              { canonicalKey: 'enterprise_support_engineer', displayRole: 'Tier 2 Support Engineer' },
  'tier 3 support engineer':              { canonicalKey: 'enterprise_support_engineer', displayRole: 'Tier 3 Support Engineer' },

  // support_operations_director
  'support operations director':          { canonicalKey: 'support_operations_director', displayRole: 'Support Operations Director' },
  'director of customer support':         { canonicalKey: 'support_operations_director', displayRole: 'Director of Customer Support' },
  'vp customer support':                  { canonicalKey: 'support_operations_director', displayRole: 'VP Customer Support' },
  'head of support operations':           { canonicalKey: 'support_operations_director', displayRole: 'Head of Support Operations' },
  'contact center director':              { canonicalKey: 'support_operations_director', displayRole: 'Contact Center Director' },

  // workforce_management_analyst_cx
  'workforce management analyst cx':      { canonicalKey: 'workforce_management_analyst_cx', displayRole: 'Workforce Management Analyst (CX)' },
  'wfm analyst':                          { canonicalKey: 'workforce_management_analyst_cx', displayRole: 'WFM Analyst' },
  'contact center wfm analyst':           { canonicalKey: 'workforce_management_analyst_cx', displayRole: 'Contact Center WFM Analyst' },
  'workforce planner cx':                 { canonicalKey: 'workforce_management_analyst_cx', displayRole: 'Workforce Planner (CX)' },
  'staffing analyst contact center':      { canonicalKey: 'workforce_management_analyst_cx', displayRole: 'Staffing Analyst (Contact Center)' },

  // chatbot_ai_trainer
  'chatbot ai trainer':                   { canonicalKey: 'chatbot_ai_trainer', displayRole: 'Chatbot AI Trainer' },
  'conversational ai trainer':            { canonicalKey: 'chatbot_ai_trainer', displayRole: 'Conversational AI Trainer' },
  'ai chatbot specialist':                { canonicalKey: 'chatbot_ai_trainer', displayRole: 'AI Chatbot Specialist' },
  'ai trainer support':                   { canonicalKey: 'chatbot_ai_trainer', displayRole: 'AI Trainer (Support)' },
  'nlp trainer':                          { canonicalKey: 'chatbot_ai_trainer', displayRole: 'NLP Trainer' },
  'bot trainer':                          { canonicalKey: 'chatbot_ai_trainer', displayRole: 'Bot Trainer' },

  // knowledge_base_specialist
  'knowledge base specialist':            { canonicalKey: 'knowledge_base_specialist', displayRole: 'Knowledge Base Specialist' },
  'knowledge management specialist':      { canonicalKey: 'knowledge_base_specialist', displayRole: 'Knowledge Management Specialist' },
  'self service content specialist':      { canonicalKey: 'knowledge_base_specialist', displayRole: 'Self-Service Content Specialist' },
  'technical documentation specialist':   { canonicalKey: 'knowledge_base_specialist', displayRole: 'Technical Documentation Specialist' },
  'help content writer':                  { canonicalKey: 'knowledge_base_specialist', displayRole: 'Help Content Writer' },

  // voice_of_customer_analyst
  'voice of customer analyst':            { canonicalKey: 'voice_of_customer_analyst', displayRole: 'Voice of Customer Analyst' },
  'voc analyst':                          { canonicalKey: 'voice_of_customer_analyst', displayRole: 'VoC Analyst' },
  'customer insights analyst':            { canonicalKey: 'voice_of_customer_analyst', displayRole: 'Customer Insights Analyst' },
  'cx research analyst':                  { canonicalKey: 'voice_of_customer_analyst', displayRole: 'CX Research Analyst' },
  'nps analyst':                          { canonicalKey: 'voice_of_customer_analyst', displayRole: 'NPS Analyst' },
  'customer feedback analyst':            { canonicalKey: 'voice_of_customer_analyst', displayRole: 'Customer Feedback Analyst' },

  // postdoctoral_researcher
  'postdoctoral researcher':              { canonicalKey: 'postdoctoral_researcher', displayRole: 'Postdoctoral Researcher' },
  'postdoc':                              { canonicalKey: 'postdoctoral_researcher', displayRole: 'Postdoctoral Researcher' },
  'postdoctoral fellow':                  { canonicalKey: 'postdoctoral_researcher', displayRole: 'Postdoctoral Fellow' },
  'postdoctoral associate':               { canonicalKey: 'postdoctoral_researcher', displayRole: 'Postdoctoral Associate' },
  'research associate postdoc':           { canonicalKey: 'postdoctoral_researcher', displayRole: 'Research Associate (Postdoc)' },

  // research_lab_director
  'research lab director':                { canonicalKey: 'research_lab_director', displayRole: 'Research Lab Director' },
  'principal investigator':               { canonicalKey: 'research_lab_director', displayRole: 'Principal Investigator (PI)' },
  'pi':                                   { canonicalKey: 'research_lab_director', displayRole: 'Principal Investigator' },
  'laboratory director':                  { canonicalKey: 'research_lab_director', displayRole: 'Laboratory Director' },
  'research director academia':           { canonicalKey: 'research_lab_director', displayRole: 'Research Director (Academia)' },
  'associate professor':                  { canonicalKey: 'research_lab_director', displayRole: 'Associate Professor / PI' },
  'full professor':                       { canonicalKey: 'research_lab_director', displayRole: 'Full Professor / PI' },

  // science_policy_advisor
  'science policy advisor':               { canonicalKey: 'science_policy_advisor', displayRole: 'Science Policy Advisor' },
  'science and technology policy analyst':{ canonicalKey: 'science_policy_advisor', displayRole: 'S&T Policy Analyst' },
  'federal science policy advisor':       { canonicalKey: 'science_policy_advisor', displayRole: 'Federal Science Policy Advisor' },
  'research policy analyst':              { canonicalKey: 'science_policy_advisor', displayRole: 'Research Policy Analyst' },
  'aaas fellow':                          { canonicalKey: 'science_policy_advisor', displayRole: 'AAAS S&T Policy Fellow' },

  // technology_transfer_specialist
  'technology transfer specialist':       { canonicalKey: 'technology_transfer_specialist', displayRole: 'Technology Transfer Specialist' },
  'licensing associate':                  { canonicalKey: 'technology_transfer_specialist', displayRole: 'Licensing Associate (TTO)' },
  'tech transfer officer':                { canonicalKey: 'technology_transfer_specialist', displayRole: 'Technology Transfer Officer' },
  'tto specialist':                       { canonicalKey: 'technology_transfer_specialist', displayRole: 'TTO Specialist' },
  'intellectual property licensing specialist': { canonicalKey: 'technology_transfer_specialist', displayRole: 'IP Licensing Specialist' },

  // research_commercialization_manager
  'research commercialization manager':   { canonicalKey: 'research_commercialization_manager', displayRole: 'Research Commercialization Manager' },
  'commercialization director research':  { canonicalKey: 'research_commercialization_manager', displayRole: 'Commercialization Director (Research)' },
  'venture development director':         { canonicalKey: 'research_commercialization_manager', displayRole: 'Venture Development Director' },
  'startup formation manager':            { canonicalKey: 'research_commercialization_manager', displayRole: 'Startup Formation Manager' },
  'innovation commercialization manager': { canonicalKey: 'research_commercialization_manager', displayRole: 'Innovation Commercialization Manager' },

  // think_tank_researcher
  'think tank researcher':                { canonicalKey: 'think_tank_researcher', displayRole: 'Think Tank Researcher' },
  'policy researcher':                    { canonicalKey: 'think_tank_researcher', displayRole: 'Policy Researcher' },
  'research fellow think tank':           { canonicalKey: 'think_tank_researcher', displayRole: 'Research Fellow (Think Tank)' },
  'senior fellow policy':                 { canonicalKey: 'think_tank_researcher', displayRole: 'Senior Fellow (Policy)' },
  'associate fellow':                     { canonicalKey: 'think_tank_researcher', displayRole: 'Associate Fellow' },
  'brookings researcher':                 { canonicalKey: 'think_tank_researcher', displayRole: 'Brookings Researcher' },
  'rand researcher':                      { canonicalKey: 'think_tank_researcher', displayRole: 'RAND Researcher' },

  // independent_researcher
  'independent researcher':               { canonicalKey: 'independent_researcher', displayRole: 'Independent Researcher' },
  'independent scientist':                { canonicalKey: 'independent_researcher', displayRole: 'Independent Scientist' },
  'unaffiliated researcher':              { canonicalKey: 'independent_researcher', displayRole: 'Independent Researcher' },
  'freelance researcher':                 { canonicalKey: 'independent_researcher', displayRole: 'Freelance Researcher' },
  'research consultant independent':      { canonicalKey: 'independent_researcher', displayRole: 'Independent Research Consultant' },

  // science_journalist
  'science journalist':                   { canonicalKey: 'science_journalist', displayRole: 'Science Journalist' },
  'science reporter':                     { canonicalKey: 'science_journalist', displayRole: 'Science Reporter' },
  'science writer':                       { canonicalKey: 'science_journalist', displayRole: 'Science Writer' },
  'technology reporter science':          { canonicalKey: 'science_journalist', displayRole: 'Science & Technology Reporter' },
  'science communicator journalist':      { canonicalKey: 'science_journalist', displayRole: 'Science Communicator' },
  'science editor':                       { canonicalKey: 'science_journalist', displayRole: 'Science Editor' },
};

// ── CANONICAL GROUP ADDITIONS ─────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_CX_RESEARCH_ACADEMIA: Record<string, string> = {
  enterprise_support_engineer:          'enterprise_support_engineer',
  support_operations_director:          'support_operations_director',
  workforce_management_analyst_cx:      'workforce_management_analyst_cx',
  chatbot_ai_trainer:                   'chatbot_ai_trainer',
  knowledge_base_specialist:            'knowledge_base_specialist',
  voice_of_customer_analyst:            'voice_of_customer_analyst',
  postdoctoral_researcher:              'postdoctoral_researcher',
  research_lab_director:                'research_lab_director',
  science_policy_advisor:               'science_policy_advisor',
  technology_transfer_specialist:       'technology_transfer_specialist',
  research_commercialization_manager:   'research_commercialization_manager',
  think_tank_researcher:                'think_tank_researcher',
  independent_researcher:               'independent_researcher',
  science_journalist:                   'science_journalist',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_CX_RESEARCH_ACADEMIA: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  enterprise_support_engineer:        { roleKey: 'enterprise_support_engineer',        roleName: 'Enterprise Support Engineer',        demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 32, yoyJobOpeningsChange: 6,   topHiringLocations: ['San Francisco CA', 'Austin TX', 'New York NY', 'Bangalore', 'Dublin'],                    aiSubstitutionRisk: 0.26, dataQuarter: '2026-Q1', calibrationNote: 'Enterprise support engineers with API/integration skills increasingly protected from AI displacement.' },
  support_operations_director:        { roleKey: 'support_operations_director',        roleName: 'Support Operations Director',        demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 52, yoyJobOpeningsChange: 4,   topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Chicago IL', 'Boston MA'],               aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Ops directors managing AI-deflection transformation are commanding premium over pure headcount managers.' },
  workforce_management_analyst_cx:    { roleKey: 'workforce_management_analyst_cx',    roleName: 'Workforce Management Analyst (CX)',  demandIndex: 66, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 28, yoyJobOpeningsChange: 2,   topHiringLocations: ['San Antonio TX', 'Tampa FL', 'Manila', 'Bangalore', 'Columbus OH'],                      aiSubstitutionRisk: 0.33, dataQuarter: '2026-Q1', calibrationNote: 'WFM automation tools (Verint AI, NICE) displacing manual forecasters; platform expertise essential.' },
  chatbot_ai_trainer:                 { roleKey: 'chatbot_ai_trainer',                 roleName: 'Chatbot AI Trainer',                 demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 22, yoyJobOpeningsChange: 68,  topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Remote', 'Boston MA'],                   aiSubstitutionRisk: 0.11, dataQuarter: '2026-Q1', calibrationNote: 'AI trainers build the AI — uniquely protected; demand surging with enterprise chatbot deployments.' },
  knowledge_base_specialist:          { roleKey: 'knowledge_base_specialist',          roleName: 'Knowledge Base Specialist',          demandIndex: 60, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable',  timeToFillDays: 20, yoyJobOpeningsChange: -10, topHiringLocations: ['Remote', 'Austin TX', 'New York NY', 'Chicago IL', 'Bangalore'],                          aiSubstitutionRisk: 0.40, dataQuarter: '2026-Q1', calibrationNote: 'AI writing tools (Notion AI, Confluence AI) displacing manual KB creation; strategic roles protected.' },
  voice_of_customer_analyst:          { roleKey: 'voice_of_customer_analyst',          roleName: 'Voice of Customer Analyst',          demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 30, yoyJobOpeningsChange: 5,   topHiringLocations: ['San Francisco CA', 'New York NY', 'Chicago IL', 'Austin TX', 'Boston MA'],               aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1', calibrationNote: 'VoC platform expertise (Medallia, Qualtrics) protects; pure survey-monkey analysts at risk.' },
  postdoctoral_researcher:            { roleKey: 'postdoctoral_researcher',            roleName: 'Postdoctoral Researcher',            demandIndex: 52, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 90, yoyJobOpeningsChange: -14, topHiringLocations: ['Boston MA', 'San Francisco CA', 'New York NY', 'San Diego CA', 'Cambridge MA'],           aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Academic job market structural contraction; federal research funding flat in real terms; industry postdoc paths expanding.' },
  research_lab_director:              { roleKey: 'research_lab_director',              roleName: 'Research Lab Director',              demandIndex: 62, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 180, yoyJobOpeningsChange: 0,  topHiringLocations: ['Boston MA', 'San Francisco CA', 'New York NY', 'Chicago IL', 'San Diego CA'],            aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Tenured PI market stable; industry R&D director market growing with pharma and AI labs.' },
  science_policy_advisor:             { roleKey: 'science_policy_advisor',             roleName: 'Science Policy Advisor',             demandIndex: 74, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 60, yoyJobOpeningsChange: 12,  topHiringLocations: ['Washington DC', 'Boston MA', 'New York NY', 'San Francisco CA', 'Chicago IL'],           aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'AI governance and biotech policy driving demand; AAAS fellowships oversubscribed 10:1.' },
  technology_transfer_specialist:     { roleKey: 'technology_transfer_specialist',     roleName: 'Technology Transfer Specialist',     demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 55, yoyJobOpeningsChange: 16,  topHiringLocations: ['Boston MA', 'San Francisco CA', 'San Diego CA', 'Chicago IL', 'Washington DC'],          aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'University TTOs expanding with AI/biotech IP wave; National Lab commercialization growing 15%+ YoY.' },
  research_commercialization_manager: { roleKey: 'research_commercialization_manager', roleName: 'Research Commercialization Manager',  demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 50, yoyJobOpeningsChange: 20,  topHiringLocations: ['Boston MA', 'San Francisco CA', 'New York NY', 'Chicago IL', 'Raleigh NC'],              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Deep tech startup wave + NSF I-Corps expansion driving commercialization manager demand at R1 universities and National Labs.' },
  think_tank_researcher:              { roleKey: 'think_tank_researcher',              roleName: 'Think Tank Researcher',              demandIndex: 66, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 75, yoyJobOpeningsChange: 3,   topHiringLocations: ['Washington DC', 'New York NY', 'Boston MA', 'Chicago IL', 'San Francisco CA'],           aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'Think tank market stable; AI policy analysts in high demand; domestic policy researchers facing funding pressure.' },
  independent_researcher:             { roleKey: 'independent_researcher',             roleName: 'Independent Researcher',             demandIndex: 55, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 120, yoyJobOpeningsChange: 0,  topHiringLocations: ['Remote', 'Boston MA', 'San Francisco CA', 'New York NY', 'Washington DC'],               aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Independent research income volatile and grant-dependent; AI augments productivity but institutional access remains gatekept.' },
  science_journalist:                 { roleKey: 'science_journalist',                 roleName: 'Science Journalist',                 demandIndex: 60, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 35, yoyJobOpeningsChange: -8,  topHiringLocations: ['New York NY', 'Washington DC', 'Boston MA', 'San Francisco CA', 'Remote'],                aiSubstitutionRisk: 0.33, dataQuarter: '2026-Q1', calibrationNote: 'Staff science journalism declining with print media; MIT Technology Review, Ars Technica digital roles growing; beat specialization essential.' },
};

// ── COMPENSATION ADDITIONS ────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_CX_RESEARCH_ACADEMIA: Record<string, Record<string, number>> = {
  enterprise_support_engineer:          { '0-2': 75_000,  '2-5': 98_000,  '5-10': 122_000, '10-15': 140_000, '15+': 150_000 },
  support_operations_director:          { '0-2': 110_000, '2-5': 138_000, '5-10': 168_000, '10-15': 185_000, '15+': 195_000 },
  workforce_management_analyst_cx:      { '0-2': 65_000,  '2-5': 78_000,  '5-10': 95_000,  '10-15': 105_000, '15+': 110_000 },
  chatbot_ai_trainer:                   { '0-2': 75_000,  '2-5': 98_000,  '5-10': 122_000, '10-15': 135_000, '15+': 140_000 },
  knowledge_base_specialist:            { '0-2': 55_000,  '2-5': 68_000,  '5-10': 82_000,  '10-15': 90_000,  '15+': 95_000  },
  voice_of_customer_analyst:            { '0-2': 75_000,  '2-5': 95_000,  '5-10': 115_000, '10-15': 128_000, '15+': 135_000 },
  postdoctoral_researcher:              { '0-2': 56_000,  '2-5': 62_000,  '5-10': 75_000,  '10-15': 95_000,  '15+': 110_000 },
  research_lab_director:                { '0-2': 120_000, '2-5': 155_000, '5-10': 190_000, '10-15': 225_000, '15+': 250_000 },
  science_policy_advisor:               { '0-2': 75_000,  '2-5': 95_000,  '5-10': 118_000, '10-15': 135_000, '15+': 145_000 },
  technology_transfer_specialist:       { '0-2': 80_000,  '2-5': 102_000, '5-10': 128_000, '10-15': 142_000, '15+': 150_000 },
  research_commercialization_manager:   { '0-2': 95_000,  '2-5': 122_000, '5-10': 152_000, '10-15': 168_000, '15+': 180_000 },
  think_tank_researcher:                { '0-2': 65_000,  '2-5': 85_000,  '5-10': 110_000, '10-15': 130_000, '15+': 145_000 },
  independent_researcher:               { '0-2': 55_000,  '2-5': 72_000,  '5-10': 95_000,  '10-15': 115_000, '15+': 130_000 },
  science_journalist:                   { '0-2': 45_000,  '2-5': 62_000,  '5-10': 82_000,  '10-15': 98_000,  '15+': 115_000 },
};

// ── NEGOTIATION ADDITIONS ─────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_CX_RESEARCH_ACADEMIA: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  support_operations_director: {
    strongOpener: 'I want to align my compensation with the 2026 Support Operations Director market, particularly given the AI deflection transformation I\'ve led. We\'ve deployed [Intercom Fin AI / Salesforce Einstein / Kustomer AI] and deflected [X%] of ticket volume, saving [$Y] annually while maintaining CSAT above [Z].',
    leverageContext: 'Per Gartner\'s 2026 CX Workforce Survey, Support Operations Directors who have led AI deflection programs are commanding $155K-$195K at comparable-stage companies. COPC-certified directors command an additional 20-30% premium. Replacing me mid-transformation would stall the deflection program and risk CSAT regression.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile for AI-transformation-experienced ops directors at our ACV/team-size tier), a performance bonus tied to deflection rate and CSAT targets, and a $5K annual certification budget for COPC renewal and Zendesk/Salesforce training.',
    walkAwayLine: 'I have an approach from [Teleperformance / Concentrix / a Series C SaaS] at $X above my current base. I\'ve built deep institutional knowledge of our support stack here — but the gap to market is meaningful.',
  },
  chatbot_ai_trainer: {
    strongOpener: 'I want to discuss my comp in the context of the conversational AI trainer market, which is growing 60-80% YoY in 2026. My work building and optimizing the [Intercom Fin / Salesforce Einstein / Kustomer] training datasets has directly driven our AI deflection rate from [X%] to [Y%].',
    leverageContext: 'Scale AI, Surge AI, and dedicated enterprise AI teams at Zendesk and Salesforce are hiring conversational AI trainers with quality assurance expertise at $105K-$140K. My training methodology documentation and deflection improvement results are directly marketable. Replacement cost: 3-5 months to find a trainer with comparable domain-specific training data expertise.',
    countersScript: 'I\'m asking for $X base (matches Scale AI and enterprise AI team 75th percentile for my experience level), a role title aligned with my seniority (Senior AI Trainer or AI Training Lead), and a $3K/year budget for prompt engineering and ML courses.',
    walkAwayLine: 'Scale AI and [enterprise AI teams at Salesforce / Intercom] have expressed interest at $X. I prefer to continue building institutional AI expertise here — but I need meaningful compensation alignment.',
  },
  research_lab_director: {
    strongOpener: 'I want to discuss my compensation package in the context of my lab\'s grant portfolio and research output. We\'ve secured [$X in grant funding this year], published [Y papers], trained [Z graduate students / postdocs], and established [industry partnerships / CRADA agreements]. I\'d like to align my compensation with peer PIs at comparable R1 institutions.',
    leverageContext: 'AAUP 2026 faculty salary data shows full professors with active NIH/NSF R01 portfolios at comparable institutions earn [$X-$Y]. Industry R&D Director equivalents earn $180K-$250K. My grant overhead alone generates [$Z] annually in indirect cost recovery for the institution. Replacing an active PI mid-grant cycle carries 18+ months of transition risk.',
    countersScript: 'I\'m requesting a salary increase to $X (matches the 75th percentile for comparable R1 PIs with my grant portfolio), a lab renovation commitment of $Y, a graduate student allocation of Z FTE, and a sabbatical timing commitment in my 7th year.',
    walkAwayLine: 'I\'ve received a preliminary conversation from [competing R1 / industry R&D lab / National Lab] at $X higher base and [better startup package / more direct research control]. I would prefer to continue the work we\'ve built here.',
  },
  technology_transfer_specialist: {
    strongOpener: 'I want to align my compensation with the 2026 technology transfer specialist market. This year I\'ve managed [X invention disclosures], negotiated [Y licenses], and generated [$Z in royalty revenue] for the institution — results that are directly trackable and above the institutional average.',
    leverageContext: 'AUTM 2026 salary survey shows RTTP-certified technology transfer specialists at comparable R1 institutions earn $110K-$142K. National Lab licensing managers earn $115K-$148K. My deal track record and platform relationships with [pharma / software / startup licensees] are difficult to replace quickly — typical TTO search cycles run 4-6 months.',
    countersScript: 'I\'m asking for $X base (75th percentile per AUTM survey), AUTM membership and annual meeting coverage ($2K/year), and a deal-completion bonus structure tied to royalty milestones above the office average.',
    walkAwayLine: 'I have a preliminary conversation with [University of X TTO / DOE National Lab commercialization office] at $X above current. I value the IP portfolio I\'ve built here — but I need to see market-aligned compensation.',
  },
  research_commercialization_manager: {
    strongOpener: 'I want to discuss my compensation in light of the research commercialization market and the direct outcomes I\'ve driven: [X spinouts formed, Y NSF I-Corps teams supported, $Z in SBIR Phase I awards to lab spinouts]. These outcomes are the highest-visibility deliverables for a VPR office in the current funding environment.',
    leverageContext: 'VPR offices at comparable R1 universities and DOE National Labs pay $130K-$180K for commercialization managers with active startup formation track records. The economic development value of [X] spinouts in our region — counting direct employment and licensing revenue — vastly exceeds my compensation cost. Replacement cost: 6-9 months.',
    countersScript: 'I\'m requesting $X base (75th percentile for R1 commercialization manager), a performance bonus tied to spinout formation metrics, budget for NSF I-Corps facilitator training, and a formal title progression path to Director of Commercialization within 18 months.',
    walkAwayLine: 'Argonne National Lab and [MIT / Stanford] TTO have approached me for commercialization director roles at $X higher total comp. I\'d like to find a path to market alignment here.',
  },
  science_policy_advisor: {
    strongOpener: 'I want to align my compensation with the 2026 science policy advisor market, particularly given the AI governance and emerging technology policy responsibilities I\'ve taken on. My work has directly influenced [federal agency rulemaking / congressional testimony / agency strategic plan].',
    leverageContext: 'AAAS S&T Policy Fellows earn $95K-$100K in their first year at federal agencies. RAND and Brookings senior researchers earn $115K-$145K. Think tank research directors earn $130K-$160K. My specific track record in [AI policy / biotech regulation / energy policy] is in acute demand as federal agencies respond to the AI governance challenge.',
    countersScript: 'I\'m asking for $X base (matches RAND/Brookings senior researcher equivalent for my seniority), a $4K/year publication and conference budget, and a 15% protected research time allocation for independent policy briefs.',
    walkAwayLine: 'I have a conversation with [Brookings / CSIS / RAND] for a senior research position at $X and better publication autonomy. I prefer the policy influence path available here — but I need compensation alignment.',
  },
  science_journalist: {
    strongOpener: 'I\'d like to discuss my compensation given my track record in [AI / climate / biotech] beat coverage and my audience metrics. My [articles / podcast / newsletter] generate [X page views / Y subscribers / Z engagements per month], which is in the top [percentile] for science reporters at this outlet.',
    leverageContext: 'MIT Technology Review staff writers with [AI / biotech] beat specialization earn $85K-$110K. The Conversation and Nature News pay $75K-$95K for specialist reporters with my credentials and audience reach. My content is among the highest-traffic on our platform — AI writing tools cannot replicate the source relationships and scientific credibility I\'ve built.',
    countersScript: 'I\'m asking for $X base (matches peer digital science outlets for my traffic and credibility tier), a $2K/year conference travel budget for beat source-building (AAAS Annual Meeting, NeurIPS), and a formal commitment to maintain my beat assignment through at least [specific coverage cycle].',
    walkAwayLine: 'MIT Technology Review and Ars Technica have expressed interest in my beat coverage at $X. I\'d prefer to continue the coverage I\'ve built here — but need to see meaningful movement.',
  },
  postdoctoral_researcher: {
    strongOpener: 'I want to discuss my stipend and research resource allocation in the context of my contributions and the current postdoc market. I\'ve [published X first-author papers, presented at Y conferences, written Z of the grant application]. The NIH NRSA scale and my institution\'s compensation study both indicate I\'m below the current market.',
    leverageContext: 'NIH NRSA scale for postdocs with my years of experience is $[X]. Industry postdocs at pharma and tech companies in my field pay $75K-$110K. My specific expertise in [technique / model system / data type] is directly relevant to our current grant aims — replacing me would cost 6+ months of experimental momentum.',
    countersScript: 'I\'m asking for a stipend at the NIH NRSA scale for my experience level ($[X]), a commitment to first-authorship on [specific upcoming manuscript], a $2K/year travel budget for conferences, and a letter of support for the F32 / NSF postdoctoral fellowship application.',
    walkAwayLine: 'I have an offer for an industry postdoc at $[X] with a clear R&D scientist conversion path. I find the academic research here compelling — but the compensation gap is meaningful.',
  },
  voice_of_customer_analyst: {
    strongOpener: 'I want to discuss my compensation in light of the VoC outcomes I\'ve driven this year: we moved NPS from [X to Y], CSAT from [A to B], and the closed-loop program I built has [reduced churn by Z%]. These are directly measurable business outcomes.',
    leverageContext: 'Qualtrics XM and Medallia CS/solutions roles pay $115K-$140K for VoC analysts with my platform certification and closed-loop methodology experience. Our direct competitors pay $105K-$130K for comparable roles. My Qualtrics XM certification and closed-loop program design are not quickly replaceable — typical search cycles run 3-4 months.',
    countersScript: 'I\'m asking for $X base (75th percentile for CCXP / Qualtrics-certified VoC analysts), a quarterly bonus tied to NPS/CSAT improvement targets, and a $2K/year certification budget for Qualtrics XM or Medallia renewals.',
    walkAwayLine: 'Qualtrics XM Success team and [Medallia / Satmetrix] have reached out at $X above current. I\'d prefer to continue building the VoC program here — but I need to see market-aligned compensation.',
  },
};
