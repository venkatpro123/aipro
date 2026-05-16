// insurance_real_estate_finance_actions.ts — v38.0 Phase 2C
// 17 high-impact roles across Insurance (12), and Real Estate Finance (5).
// Insurance roles emphasize actuarial-society credentials (SOA FSA, CAS FCAS), reinsurance specialty,
// catastrophe modeling, captive structures, and insurtech disruption.
// Real estate finance emphasizes CRE asset mgmt, debt origination, REIT research, opportunistic deals.

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

const A_INSURANCE_NETWORK: BracketPool = pool(
  { title: 'Attend Your Sector\'s 2 Most Important Industry Conferences This Year', description: 'For actuaries: SOA Annual Meeting + CAS Annual Meeting are the canonical hiring venues — chief actuaries at Munich Re, Swiss Re, RGA, AIG, and Travelers attend and bring open headcount with them. For brokers/underwriters: RIMS RISKWORLD + APCIA Annual Meeting. For reinsurance specialists: Monte Carlo Rendez-Vous (September) and Baden-Baden (October) are where the placement and renewal conversations happen. Travel budget $4-6K per conference but converts to 2-3 senior recruiter contacts each.', layerFocus: 'L4 · Network', riskReductionPct: 16, deadline: '90 days — register before deadline', priority: 'High' },
  { title: 'Join the SOA/CAS/CPCU LinkedIn Communities + Local Chapter', description: 'The actuarial and risk-management communities are tight — local SOA/CAS chapter events (often free or under $50) are where senior actuaries at the top reinsurers (Munich Re, Swiss Re, Hannover Re, SCOR) and primary carriers (Chubb, Travelers, Hartford, Liberty Mutual) recruit. CPCU Society chapters serve the broader risk management community. Attend 1 event/quarter. Active chapter members get inbound recruiter calls.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Get Listed on Specialized Insurance Recruiter Rosters', description: 'Pauly Group, Jacobson Group, Ezra Penland, and DW Simpson are the dominant specialty actuarial/insurance recruiters. A 30-min intake call gets you on their roster — they ping you when sector roles open at $200K+. They cover Munich Re, Swiss Re, Berkshire Hathaway Re, AIG, Travelers, Chubb, Allstate, Progressive, Hartford, Zurich, Allianz, and Lloyd\'s syndicates (Beazley, Hiscox, Markel, W.R. Berkley, Arch). Senior placements have 8-15% commission so they work hard.', layerFocus: 'L4 · Network', riskReductionPct: 22, deadline: '14 days', priority: 'High' },
  { title: 'Publish a Specialty Brief in The Actuary Magazine or Risk & Insurance', description: 'A single byline in The Actuary (SOA), Actuarial Review (CAS), Risk & Insurance, or Insurance Journal positions you as a thought leader. Topic ideas: PFAS reserving, climate cat modeling for parametric, MGA platform economics, captive trends in mid-market. Editor lead time: 90 days. Even a co-authored piece converts to LinkedIn DMs from senior hiring managers.', layerFocus: 'L3 · Reputation', riskReductionPct: 18, deadline: '90 days', priority: 'Medium' },
  { title: 'Audit LinkedIn Profile for Specific Insurance Technologies and Lines', description: 'Recruiters search for specific tools (AXIS, Prophet, SLOPE, MoSes, Igloo Cloud, ResQ, FIS Insurance Risk Suite) and lines of business (workers comp, D&O, cyber, parametric, surety). Listing your specific reserving system, cat model (RMS, AIR, KCC), and primary line generates 3-4x more recruiter outreach. Add "Open to opportunities" if comfortable.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

const A_RE_FINANCE_NETWORK: BracketPool = pool(
  { title: 'Attend ULI Fall Meeting + NAREIT REITweek Investor Conference', description: 'ULI Fall Meeting (October) is where CRE capital markets, asset management, and development professionals at Blackstone, Brookfield, Starwood, Tishman Speyer, Hines, JLL, and CBRE recruit. NAREIT REITweek (June) is the canonical venue for the public REIT cohort (Prologis, Public Storage, AvalonBay, Welltower, Vornado, Realty Income, Equity Residential). Each conference reliably produces 2-3 senior recruiter contacts. Budget $3-5K each.', layerFocus: 'L4 · Network', riskReductionPct: 16, deadline: '90 days', priority: 'High' },
  { title: 'Join the CRE Finance Council (CREFC) + Pension Real Estate Association', description: 'CREFC is the canonical venue for CRE debt professionals — Blackstone Real Estate Debt, KKR Real Estate Credit, Apollo CRE, Brookfield Real Estate Income all participate. PREA serves the institutional LP community (pension funds, sovereign wealth, endowments) which is the source of allocations to GPs. Membership $750-2,500/year but pays back via 1-2 inbound recruiter contacts annually.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '30 days', priority: 'Medium' },
  { title: 'Build Relationships with Specialized Real Estate Recruiters', description: 'Ferguson Partners, RETS Associates, Crown Advisors, and SearchWise specialize in CRE/REIT placements. A 30-min intake gets you on their senior roster for roles at Blackstone, Brookfield, Starwood Capital, Tishman Speyer, Hines, KKR Real Estate, Apollo Real Estate. Most senior CRE roles ($250K+) flow through these specialists vs. public job boards.', layerFocus: 'L4 · Network', riskReductionPct: 22, deadline: '14 days', priority: 'High' },
  { title: 'Publish a Sector or Strategy Brief on LinkedIn or in NREI / Bisnow', description: 'A "what we\'re seeing in the [office distress / industrial supply / data center thesis] market" post on LinkedIn — or a contributed byline at National Real Estate Investor or Bisnow — establishes thought leadership. CRE is small-world; senior hiring managers read the same publications. One published thesis can produce 5-10 inbound recruiter and LP contacts over a year.', layerFocus: 'L3 · Reputation', riskReductionPct: 18, deadline: '60 days', priority: 'Medium' },
  { title: 'Audit LinkedIn Profile for Specific CRE Sub-strategies and Tools', description: 'Recruiters search for specific strategies (opportunistic, value-add, core-plus, debt, mezzanine), sectors (industrial, multifamily, data center, life science, self-storage), and tools (Argus Enterprise, Yardi, Cougar, Dealpath, VTS). Listing your specific sub-strategy + asset class + underwriting tool generates 3-4x more recruiter outreach.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_INSURANCE_RE_FINANCE ───────────────────────────────────────────

export const ACTION_DB_INSURANCE_RE_FINANCE: Record<string, BracketPool> = {

  life_actuary: pool(
    { title: 'Complete the Next Actuarial Exam in the FSA Pathway Within 6 Months', description: 'The SOA exam cascade (P, FM, IFM, LTAM, STAM, SRM, FAM, PA) is the ironclad differentiator. Every additional exam adds $7-12K to base offer; FSA fellowship (5+ exams + Fellowship Admissions Course) adds $30-50K. Self-study via Coaching Actuaries ADAPT ($150-250/mo) + ACTEX manual. Schedule the exam at registration to force the deadline. Employer typically reimburses fees + study hours for actively-progressing candidates.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '6 months — register now', priority: 'Critical' },
    { title: 'Pivot from Pure Reserving to ALM / Hedging or Inforce Management', description: 'Reserving roles are facing the most AI/automation pressure within life actuarial. ALM (asset-liability management), hedging, and inforce management are the highest-paid sub-specialties ($200K-$320K at major carriers — Prudential, MetLife, New York Life, Northwestern Mutual, MassMutual). Propose an internal rotation; build hedging knowledge via SOA Webcast Series on VA hedging.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to Reinsurance Pricing Roles at RGA, Swiss Re, Munich Re', description: 'Reinsurance pricing is the highest-paid life actuarial specialty ($220K-$380K at FSA level). RGA (Reinsurance Group of America) is the largest pure-play life reinsurer; Swiss Re and Munich Re run substantial life reinsurance books. The work pays a premium because the pricing complexity (cohort mortality, longevity, lapse) is higher than primary carrier reserving. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  pc_actuary: pool(
    { title: 'Complete the Next CAS Exam in the FCAS Pathway', description: 'The CAS exam cascade (MAS-I, MAS-II, Exam 5, 6, 7, 8, 9 plus online courses) is the differentiator. ACAS adds $25-40K to base; FCAS fellowship adds $50-80K vs. ACAS at senior level. Self-study via Coaching Actuaries ADAPT + The Infinite Actuary courses. Schedule the exam to force the deadline. Top P&C carriers (Travelers, Chubb, Hartford, Liberty Mutual, Progressive, Allstate, W.R. Berkley, Arch) all reimburse exam fees + study time.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '6 months', priority: 'Critical' },
    { title: 'Pivot from Personal Lines Reserving to Commercial Pricing or Cat Reserving', description: 'Personal auto and homeowners pricing is facing the most pricing AI/ML disruption (Progressive, Allstate, GEICO have aggressive ML pricing teams). Commercial lines pricing (D&O, cyber, environmental) and catastrophe reserving (climate-driven losses) are protected and pay 20-30% more. Propose a transition; FCAS holders in commercial cyber pricing earn $250K-$380K at AIG, Chubb, Beazley, Hiscox, Coalition.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to Reinsurance Broker Analytics at Aon, Guy Carpenter, Howden', description: 'Reinsurance broker analytics teams at Aon Reinsurance Solutions, Guy Carpenter, Howden Re, McGill Re, and TigerRisk pay 15-25% more than carrier reserving roles for FCAS-track talent. The work spans treaty pricing, cat modeling, and structure optimization. Apply within 14 days; senior reinsurance broker analysts at FCAS level earn $230K-$360K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  reinsurance_pricing_actuary: pool(
    { title: 'Master Both Treaty and Facultative Pricing Plus Structuring Analytics', description: 'Reinsurance pricing actuaries who own both treaty (quota share, surplus, XOL) and facultative pricing plus structuring/optimization analytics earn the highest premiums ($280-380K at FCAS senior). Build a reference Excel/R model spanning a quota share, a per-risk XOL, and a cat XOL — share with hiring managers as a portfolio piece. Munich Re, Swiss Re, Hannover Re, SCOR, RGA, Berkshire Hathaway Re/Gen Re, Renaissance Re all hire at this level.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue the CAS Reinsurance Specialty + Get Bermuda or London Market Exposure', description: 'A 1-2 year rotation to Bermuda (Renaissance Re, Hiscox Bermuda, Validus, AXIS Capital) or London (Lloyd\'s syndicates — Beazley, Hiscox, Markel, MAP Underwriting) adds $40-60K of permanent comp uplift and dramatic career resilience. The Bermuda+London market is where complex placements and casualty reinsurance pricing concentrates.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to TPC Pricing Roles at Reinsurance Brokers (Aon, Guy Carpenter)', description: 'Aon Reinsurance Solutions, Guy Carpenter Analytics, Howden Re, McGill Re, and TigerRisk pay senior FCAS reinsurance pricing actuaries $260K-$420K — typically 15-25% above carrier-side. The work is intellectually broader (multi-client portfolio optimization). Apply within 14 days; Monte Carlo Rendez-Vous and Baden-Baden are the in-person network venues.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  catastrophe_modeler: pool(
    { title: 'Master Both RMS (Moody\'s) and AIR (Verisk) Plus a Third Model (KCC or ICEYE)', description: 'Multi-model proficiency is the single highest-leverage skill in cat modeling. Cert pathways: RMS RiskBrowser/RMS One certifications; Verisk Touchstone certifications; KCC RiskInsight. Climate parametric specialists add ICEYE or CoreLogic. Multi-model + climate-overlay specialists earn $200-260K at top carriers and reinsurance broker analytics teams (Aon Impact Forecasting, Guy Carpenter MetaRisk).', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Specialize in Climate-Adjusted / Forward-Looking Cat Modeling', description: 'Forward-looking, climate-conditioned cat modeling (vs. historical-event-based) is the fastest-growing cat-modeling specialty. Publish a writeup on your blog or LinkedIn applying climate-conditioned hazard curves to a specific peril (FL hurricane, CA wildfire, Gulf flood). This positions you for $230K+ senior climate-cat roles at Munich Re, Swiss Re Climate Solutions, ICEYE, Jupiter Intelligence, Climavision.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Reinsurance Broker Analytics or Parametric Insurtech', description: 'Reinsurance broker cat modeling teams (Aon Impact Forecasting, Guy Carpenter, Howden Re) and parametric insurtechs (Descartes Underwriting, Arbol, Skyline Partners, Floodbase) pay senior cat modelers $230-300K. Apply within 21 days; the parametric market is growing 30-50% YoY due to climate risk demand.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  captive_insurance_manager: pool(
    { title: 'Build Expertise Across the Top 4 Captive Domiciles (Vermont, Bermuda, Cayman, Guernsey)', description: 'Senior captive managers who can navigate Vermont (#1 US domicile by captive count), Bermuda (largest by premium volume), Cayman (segregated portfolios), and Guernsey (UK/Europe access) are the highest-paid. Visit each regulator and attend captive conferences (VCIA, World Captive Forum, Cayman Captive Forum, Guernsey Insurance Forum). Domicile choice for a captive is a major value-add; senior managers with multi-domicile expertise earn $200-265K.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Earn the ACI (Associate in Captive Insurance) + CPCU Plus Sector Specialization', description: 'ACI from ICCIE (International Center for Captive Insurance Education) is the gold-standard captive credential; CPCU adds broader risk management context. Sector specialization (healthcare, construction, financial institutions) adds $30-50K. Build relationships with the big captive management firms (Marsh Captive Solutions, Aon Captive & Insurance Management, Artex, USA Risk Group).', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    { title: 'Apply to Captive Management Firms or Build a Niche Consulting Practice', description: 'The major captive managers (Marsh, Aon, Artex, USA Risk Group, Hylant Global Captive Solutions, Strategic Risk Solutions) hire senior captive managers at $180-240K base + bonus. A niche consulting practice (medical stop-loss, contractor liability, cyber captives) can generate $300K+ in fee revenue for an established practitioner.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'High' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  health_underwriter_senior: pool(
    { title: 'Pivot Away from Routine Individual Health Underwriting Within 12 Months', description: 'Individual and small-group health underwriting is the highest-displacement underwriting specialty — Lemonade/Hippo-style insurtechs, Oscar, Bright Health, Cigna, and Aetna have all deployed ML models that replace 60-80% of routine medical underwriting decisions. Pivot paths: stop-loss medical (specialty group benefits), complex large-case underwriting, or carrier-side risk consulting. Pivot within 12 months — the displacement curve is accelerating.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '12 months', priority: 'Critical' },
    { title: 'Specialize in Medical Stop-Loss or Complex Large-Case Underwriting', description: 'Medical stop-loss (Sun Life, Tokio Marine HCC, Symetra, Voya, BCS Financial) and complex large-case underwriting (HMS Insurance, Cigna VIP, Aetna Strategic Underwriting) are protected from AI/insurtech disruption because the cases require deep clinical judgment + relationship management with brokers. Senior underwriters in these specialties earn $175-220K — 30-50% above routine medical underwriting.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn the FAHM, HIA, or CLU/ChFC Plus Health Insurtech Exposure', description: 'FAHM (Fellow, Academy of Health Underwriters), HIA (Health Insurance Associate), or CLU/ChFC with health focus add credibility for senior moves. Spending 6-12 months at a health insurtech (Hippo, Bind/Surest, Oscar, Bright Health, Lemonade) — even contract — adds modern ML/automation context that traditional carrier underwriters lack.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '12 months', priority: 'High' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  claims_executive: pool(
    { title: 'Own the Complex Claims Portfolio (Catastrophic, Litigation, Reinsurance-Recoverable)', description: 'Routine claims adjusting is facing 40-55% AI displacement (Lemonade Maya, Hippo, Tractable, Snapsheet have automated routine auto + homeowners). Complex claims (cat events, litigation defense, large-loss with reinsurance recoverable) require senior judgment and are protected. Negotiate ownership of your carrier\'s top-50 claims portfolio. Senior complex-claims executives at Chubb, Travelers, AIG, Liberty Mutual, Zurich earn $200-245K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '120 days', priority: 'Critical' },
    { title: 'Pursue the SCLA, AIC-M Plus a Litigation / Subrogation Specialty', description: 'SCLA (Senior Claim Law Associate), AIC-M (Management) is the senior claims executive credential. Pair with a litigation defense specialty (D&O, cyber, large-casualty) or subrogation/recovery focus. Senior litigation-claims executives at AIG, Zurich, Allianz, Chubb earn $180-245K and are largely AI-resistant.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '180 days', priority: 'High' },
    { title: 'Apply to TPA (Third Party Administrator) Executive Roles or Specialty Reinsurance Claims', description: 'Top TPAs (Sedgwick, Crawford & Company, Gallagher Bassett, ESIS) hire senior claims executives at $170-235K. Specialty reinsurance claims at Swiss Re, Munich Re, RenaissanceRe, Hannover Re for large-loss recovery and aggregations earn similar. Apply within 21 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'High' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  insurance_broker_commercial: pool(
    { title: 'Build and Document a Portable Book of Business Worth $1M+ in Annual Commissions', description: 'Commercial broker career resilience is determined almost entirely by book portability. Document client relationships, renewal history, and BOR (Broker of Record) agreements. A $1M+ commission book is the threshold for moving to a top-3 broker (Marsh McLennan, Aon, WTW, Gallagher, Lockton, HUB, Brown & Brown) at 50-65% commission split (vs. 30-40% at entry-tier). Senior commercial brokers with portable books earn $250-450K total comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in a High-Growth Line: Cyber, D&O, or Specialty Casualty', description: 'Cyber insurance (Coalition, At-Bay, Resilience, Cowbell, Beazley) is growing 30%+ YoY with severe broker shortage. D&O for late-stage tech and IPO candidates remains a premium specialty. Specialty casualty (environmental, transportation, energy) pays premium commissions. Specializing in one of these lines + earning the CPCU or RPLU adds $80-150K to annual commission income.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Negotiate Partnership / Equity at Your Current Brokerage or Move to a Producer-Owned Firm', description: 'Producer-owned brokerages (Lockton, USI, Higginbotham, Hilb Group) offer equity participation that compounds over 5-10 years to $1-3M+ wealth on top of commissions. If your current firm is publicly-traded (Marsh, Aon, WTW, Gallagher, BRO), negotiate equity grants or commission split improvement to 60%+. Don\'t stay at 30-40% split as a senior producer.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  mga_executive: pool(
    { title: 'Negotiate Direct Equity Participation in the MGA Platform', description: 'MGA economics flow primarily to equity holders. Top MGA platforms (At-Bay, Coalition, Cowbell, Foxquilt, Embroker, Vouch, Newfront, Trean, Skyward Specialty) are increasingly owned by PE or insurtech investors. Negotiate direct equity (not just stock options) as part of MGA executive compensation; equity in a successful MGA can generate $2-10M wealth on a 5-7 year exit (insurer acquisition, IPO, or sale to Markel, Arch, Berkshire, Fairfax).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    { title: 'Build Direct Capacity Relationships with Lloyd\'s Syndicates and Top Specialty Carriers', description: 'MGA executives who own direct underwriting capacity relationships with Lloyd\'s syndicates (Beazley, Hiscox, MAP, Apollo, Tokio Marine Kiln, Brit) and top US specialty carriers (W.R. Berkley, Arch, Markel, Argo, Hamilton, Hiscox USA) are the most valuable hires. Build these relationships personally over 12-18 months by attending Lloyd\'s of London week, RIMS, and reinsurance conferences.', layerFocus: 'L4 · Network', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Specialize in a High-Growth MGA Vertical: Cyber, Parametric, Climate, or Embedded', description: 'Cyber MGAs (Coalition, At-Bay, Resilience, Cowbell), parametric MGAs (Descartes Underwriting, Arbol, Skyline Partners), climate adaptation MGAs, and embedded insurance MGAs (Cover Genius, Boost, Bolttech) are the growth verticals. Apply to MGA exec roles in these areas — total comp at senior MGA exec level is $250-450K plus platform equity.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '21 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  insurtech_product_manager: pool(
    { title: 'Build Both Underwriting and Distribution Product Expertise', description: 'Insurtech PMs who own both underwriting product (pricing, risk selection, ML models) and distribution product (broker portals, embedded checkout, customer onboarding) are the most senior-impactful. Pure-distribution PMs face commoditization; underwriting-product PMs at companies like Lemonade, Hippo, Root, Coalition Cyber, At-Bay, Resilience, Cowbell, Branch, Kin earn $200-275K + significant equity.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Negotiate Refresh Equity Grants Annually — Especially at Pre-IPO Insurtechs', description: 'Insurtech equity grants front-load — initial 4-year grants vest fully but refreshes are negotiated annually. PMs at Coalition Cyber, At-Bay, Resilience, Cowbell, Branch, Vouch should negotiate annual refreshes of 25-50% of initial grant to maintain meaningful equity exposure. A $50-150K/year refresh stream compounds significantly at IPO or acquisition.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    { title: 'Apply to Carrier-Sponsored Innovation Roles or Specialty Insurtechs', description: 'Carrier-sponsored innovation arms (Travelers Ventures, Chubb Studios, AIG Innovation, Allianz X, Munich Re HSB) and specialty insurtechs hire senior PMs at $200-275K. The carrier-sponsored route offers more stability than pure venture-backed; the specialty insurtech route offers more equity upside. Apply within 21 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'High' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  surplus_lines_specialist: pool(
    { title: 'Earn the RPLU (Registered Professional Liability Underwriter) + Document a Portable Book', description: 'RPLU from PLUS (Professional Liability Underwriting Society) is the senior credential for E&S/surplus lines. Combined with a documented portable book of $1M+ in premium, the credential opens senior specialty broker/wholesale roles at $175-260K + commission. Surplus lines is in a hardening market — placements with capacity at Lloyd\'s syndicates (Beazley, Hiscox, Markel, Hamilton), W.R. Berkley, Arch, Argo are at premium.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in a Hardening-Market Specialty: Cyber, Cannabis, Habitational, Coastal Property', description: 'Hardening-market specialties pay the highest commissions in 2026 — cyber, cannabis, habitational/multifamily, coastal property, transportation, environmental. Specializing in one and developing direct underwriter relationships at the top capacity providers (Lloyd\'s syndicates, W.R. Berkley, Arch, Markel) generates $200-300K+ commission income.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Top Wholesale Brokerage Firms (RT Specialty, CRC, AmWINS, Burns & Wilcox)', description: 'The top 4 wholesale brokers — RT Specialty, CRC Group, AmWINS, Burns & Wilcox — pay senior surplus lines specialists $150-210K base + commission with total comp $250-400K at senior level. Apply within 14 days; the wholesale market is in chronic talent shortage.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'High' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  parametric_insurance_analyst: pool(
    { title: 'Master Index Construction and Climate Hazard Data (NOAA, ECMWF, ICEYE, Floodbase)', description: 'Parametric pricing is fundamentally about index construction. Master NOAA weather data, ECMWF reanalysis, ICEYE flood radar, Floodbase, Jupiter Intelligence climate projections, plus the major cat models (RMS Climate, AIR Touchstone climate views). Senior parametric analysts who own both index design and basis-risk minimization earn $180-235K at Descartes Underwriting, Arbol, Skyline Partners, Floodbase, Swiss Re Corporate Solutions.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in a Specific Peril × Region: Hurricane Caribbean, Drought Africa, Earthquake Latin America', description: 'Parametric placements are deeply specialty — a senior analyst is typically known for "Hurricane Caribbean basis risk" or "Asian typhoon parametric" rather than generalist. Build deep expertise in 1-2 peril × region combinations. Publish a writeup on basis-risk minimization for your specialty. This positions you as the go-to specialist for that placement.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Parametric Insurtechs and Reinsurance Broker Climate Teams', description: 'Pure-play parametric: Descartes Underwriting (cyber, climate, supply chain), Arbol (climate), Skyline Partners (parametric Lloyd\'s), Floodbase. Reinsurance broker climate teams: Aon Climate Solutions, Guy Carpenter Climate, Howden Climate. Reinsurer climate units: Swiss Re Public Sector, Munich Re Climate. Apply within 21 days; parametric is one of the fastest-growing insurance specialties.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'Critical' },
    A_INSURANCE_NETWORK.senior.high[0], A_INSURANCE_NETWORK.junior.moderate[0],
  ),

  cre_asset_manager: pool(
    { title: 'Own a Full Lifecycle Asset in Your Portfolio — Acquisition, Business Plan, Disposition', description: 'CRE asset managers who can point to "I owned the lifecycle of Property X — modeled acquisition at $150M, executed business plan resulting in $30M NOI growth, exited at $250M for 20% IRR" are the most promotable. If you only own operational asset mgmt, negotiate ownership of one full-cycle deal. This becomes the bridge to Director / Managing Director at Blackstone, Brookfield, Starwood Capital, Tishman Speyer, Hines.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Specialize in a Sector with Tailwinds: Industrial, Data Center, Life Science, Self-Storage', description: 'Office is in structural decline; retail is bifurcated. Industrial (Prologis, Duke Realty subsidiary), data centers (Digital Realty, Equinix), life science (Alexandria Real Estate), self-storage (Public Storage, Extra Space), and select multifamily (Sun Belt) are the tailwind sectors. Specialize in one — sector-specialist senior asset managers earn $250-360K + carry vs. $180-240K for generalists.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate Carry Participation in the Next Vintage of Your Firm\'s Fund', description: 'Asset manager total comp at top CRE firms is dominated by carry — at a 20% promote on a $2B fund, senior asset managers can earn $2-8M over the fund life. Negotiate explicit carry participation (1-3 bps of fund) when joining or at promotion. Senior MD asset managers at Blackstone, Brookfield, Starwood Capital, Tishman Speyer, Hines, Carlyle Real Estate, Westbrook Partners earn $300-500K cash + $1-5M annual carry expectation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    A_RE_FINANCE_NETWORK.senior.high[0], A_RE_FINANCE_NETWORK.junior.moderate[0],
  ),

  cre_debt_origination: pool(
    { title: 'Build a Portable Book of Sponsor Relationships Worth $500M+ in Annual Originations', description: 'CRE debt origination is fundamentally about portable sponsor relationships. Document your top-20 sponsor relationships, year-over-year origination volume, and pipeline. A $500M+ originations book is the threshold for moving to top CRE debt funds (Blackstone Real Estate Debt, KKR Real Estate Credit, Apollo CRE, Brookfield Real Estate Income, Mesa West, ACORE Capital, Madison Realty) at $300-500K base + significant production bonus.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in a Hot Debt Strategy: Construction, Bridge, Mezzanine, or Distressed', description: 'The 2026 CRE debt market favors specialty over generalist: construction lending (less competition; banks pulled back), bridge/transitional (rates stabilizing, refi wave), mezzanine and pref equity (capital stack gap-fillers), and distressed/special situations (office, retail) are the highest-margin strategies. Specializing adds $100-200K in annual production bonus vs. generalist originators.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Move to a Direct-Lending Debt Fund vs. a CMBS Conduit', description: 'CMBS conduit origination compensation has compressed materially since the 2008/2020 cycles; direct-lending debt funds (Blackstone Real Estate Debt, KKR Real Estate Credit, Apollo, Brookfield, Mesa West, ACORE, Madison Realty, TPG Real Estate Finance) pay significantly more — $300-450K base + production bonus of $200-500K. Apply within 21 days; the refi wave creates active hiring.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '21 days', priority: 'Critical' },
    A_RE_FINANCE_NETWORK.senior.high[0], A_RE_FINANCE_NETWORK.junior.moderate[0],
  ),

  reit_research_analyst: pool(
    { title: 'Build Sector-Specialist Coverage in 1-2 REIT Sub-sectors', description: 'Generalist REIT coverage is commoditizing; sector specialists in industrial (Prologis, FirstIndustrial), data centers (Digital Realty, Equinix), healthcare (Welltower, Ventas, Healthpeak), self-storage (Public Storage, Extra Space), multifamily (AvalonBay, Equity Residential, Camden), and life science (Alexandria, BioMed) earn 30-50% above generalists. Specialize within 6 months; produce a deep sector primer note for distribution.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop Buy-Side Skills (DCF, NAV, Forward FFO) Beyond Sell-Side Models', description: 'REIT research is increasingly buy-side oriented (long-only mutual funds, hedge funds, private REITs). Build proficiency in NAV (vs. sell-side FFO multiple), forward AFFO walk, capex-intensity adjustments, and same-store NOI granularity. This positions you for buy-side analyst roles at top REIT mutual funds (Cohen & Steers, Heitman, Principal REI, AEW, Brookfield Public Securities, CenterSquare) at $200-340K + bonus.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Buy-Side REIT Funds or Public REIT Investor Relations Roles', description: 'Buy-side REIT specialist roles at Cohen & Steers, Heitman, Principal Real Estate, AEW, Brookfield Public Securities, CenterSquare pay senior analysts $200-340K. Public REIT IR/strategy roles at Prologis, AvalonBay, Equity Residential, Welltower, Realty Income pay $175-265K. Apply within 21 days; the buy-side REIT specialist market has structural shortage.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'Critical' },
    A_RE_FINANCE_NETWORK.senior.high[0], A_RE_FINANCE_NETWORK.junior.moderate[0],
  ),

  opportunistic_re_investor: pool(
    { title: 'Build a Personal Deal Pipeline of 5+ Distressed / Opportunistic Situations Per Quarter', description: 'Opportunistic CRE is a deal-pipeline business. Senior opportunistic investors track 5-10 distressed/forced-sale situations per quarter — office repositioning in major markets, distressed retail to multifamily conversion, hotel-to-multifamily, life sci spec dev unsold inventory. Document the pipeline; this is the differentiator between $200K associates and $400K+ VP/Principal at Blackstone Real Estate Opportunistic, Brookfield Strategic RE, Starwood Distressed Opps, Cerberus, Oaktree Real Estate, KKR Real Estate Opportunistic.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate Explicit Carry Participation at Your Current Fund or Move to Get It', description: 'Opportunistic RE total comp is dominated by carry. A 20% promote on a $5B opportunistic fund with 12% IRR generates ~$1B in carry pool over 8-10 years. Senior VP/Principal opportunistic investors should negotiate 5-15 bps of fund-level carry — equating to $2.5M-$7.5M expected carry over fund life. If your current firm won\'t commit carry, move to one that will.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to Top Opportunistic / Distressed Funds (Blackstone, Brookfield, Starwood, Cerberus, Oaktree)', description: 'The active hiring opportunistic CRE funds in 2026: Blackstone Real Estate Opportunistic, Brookfield Strategic Real Estate Partners, Starwood Distressed Opportunities, Cerberus Institutional Real Estate, Oaktree Real Estate Opportunities, KKR Real Estate Opportunistic, Bain Capital Real Estate, Carlyle Real Estate Partners. Apply within 14 days; the distressed CRE cycle (office, retail) is generating active hiring.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_RE_FINANCE_NETWORK.senior.high[0], A_RE_FINANCE_NETWORK.junior.moderate[0],
  ),

  gp_lp_relations_associate: pool(
    { title: 'Build Deep Relationships with 20+ LPs Across Pension, Sovereign, Endowment, Family Office', description: 'GP/LP relations is fundamentally a relationship business. Senior IR/LP relations associates own active relationships with 20-50 institutional LPs — major pension funds (CalPERS, CalSTRS, NYSCRF, OTPP, CPP, GIC), sovereign wealth (ADIA, GIC, Mubadala, Norges Bank), endowments (Harvard, Yale, Princeton, Stanford), and family offices. Build personal LP relationships over 18-24 months — these relationships are the asset that travels.', layerFocus: 'L4 · Network', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Master the Full LP Documentation Stack (PPM, Subscription Docs, Side Letters, MFN, ILPA Reporting)', description: 'Senior LP relations associates own the full institutional documentation stack — PPM drafting, side letter negotiation, MFN compliance, ILPA reporting standards, AIFMD/SEC compliance, waterfall mechanics (Euro vs American, IRR/MOIC hurdles, catch-up, GP commitment). Master each element. This skill set is the differentiator for senior IR roles at top GPs ($200-275K + bonus).', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Senior IR Roles at Top RE Funds or Move to Direct LP Side', description: 'Top RE GPs hiring senior IR/LP relations: Blackstone, Brookfield, Starwood Capital, KKR, Apollo, Carlyle, Bain, Oaktree, TPG Real Estate, Hines Capital. Pay scale $200-280K + bonus. Alternative: direct LP side — pension fund / sovereign / endowment real estate teams — typically pay slightly less in cash but more stable and offer LP-side career path. Apply within 21 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '21 days', priority: 'High' },
    A_RE_FINANCE_NETWORK.senior.high[0], A_RE_FINANCE_NETWORK.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_INSURANCE_RE_FINANCE: Record<string, { canonicalKey: string; displayRole: string }> = {
  'life actuary': { canonicalKey: 'life_actuary', displayRole: 'Life Actuary' },
  'life insurance actuary': { canonicalKey: 'life_actuary', displayRole: 'Life Insurance Actuary' },
  'fsa life': { canonicalKey: 'life_actuary', displayRole: 'FSA Life Actuary' },
  'individual life actuary': { canonicalKey: 'life_actuary', displayRole: 'Individual Life Actuary' },
  'pc actuary': { canonicalKey: 'pc_actuary', displayRole: 'P&C Actuary' },
  'property casualty actuary': { canonicalKey: 'pc_actuary', displayRole: 'Property & Casualty Actuary' },
  'p&c actuary': { canonicalKey: 'pc_actuary', displayRole: 'P&C Actuary' },
  'fcas': { canonicalKey: 'pc_actuary', displayRole: 'FCAS Actuary' },
  'acas': { canonicalKey: 'pc_actuary', displayRole: 'ACAS Actuary' },
  'reinsurance pricing actuary': { canonicalKey: 'reinsurance_pricing_actuary', displayRole: 'Reinsurance Pricing Actuary' },
  'reinsurance actuary': { canonicalKey: 'reinsurance_pricing_actuary', displayRole: 'Reinsurance Actuary' },
  'treaty pricing actuary': { canonicalKey: 'reinsurance_pricing_actuary', displayRole: 'Treaty Pricing Actuary' },
  'reinsurance broker analyst': { canonicalKey: 'reinsurance_pricing_actuary', displayRole: 'Reinsurance Broker Analyst' },
  'catastrophe modeler': { canonicalKey: 'catastrophe_modeler', displayRole: 'Catastrophe Modeler' },
  'cat modeler': { canonicalKey: 'catastrophe_modeler', displayRole: 'Cat Modeler' },
  'catastrophe risk analyst': { canonicalKey: 'catastrophe_modeler', displayRole: 'Catastrophe Risk Analyst' },
  'rms analyst': { canonicalKey: 'catastrophe_modeler', displayRole: 'RMS Cat Modeler' },
  'air worldwide analyst': { canonicalKey: 'catastrophe_modeler', displayRole: 'AIR Cat Modeler' },
  'captive insurance manager': { canonicalKey: 'captive_insurance_manager', displayRole: 'Captive Insurance Manager' },
  'captive manager': { canonicalKey: 'captive_insurance_manager', displayRole: 'Captive Manager' },
  'captive consultant': { canonicalKey: 'captive_insurance_manager', displayRole: 'Captive Consultant' },
  'health underwriter': { canonicalKey: 'health_underwriter_senior', displayRole: 'Health Underwriter' },
  'health underwriter senior': { canonicalKey: 'health_underwriter_senior', displayRole: 'Senior Health Underwriter' },
  'medical underwriter': { canonicalKey: 'health_underwriter_senior', displayRole: 'Medical Underwriter' },
  'group health underwriter': { canonicalKey: 'health_underwriter_senior', displayRole: 'Group Health Underwriter' },
  'claims executive': { canonicalKey: 'claims_executive', displayRole: 'Claims Executive' },
  'claims manager': { canonicalKey: 'claims_executive', displayRole: 'Claims Manager' },
  'senior claims handler': { canonicalKey: 'claims_executive', displayRole: 'Senior Claims Handler' },
  'complex claims executive': { canonicalKey: 'claims_executive', displayRole: 'Complex Claims Executive' },
  'commercial insurance broker': { canonicalKey: 'insurance_broker_commercial', displayRole: 'Commercial Insurance Broker' },
  'insurance broker commercial': { canonicalKey: 'insurance_broker_commercial', displayRole: 'Commercial Insurance Broker' },
  'commercial lines producer': { canonicalKey: 'insurance_broker_commercial', displayRole: 'Commercial Lines Producer' },
  'commercial insurance producer': { canonicalKey: 'insurance_broker_commercial', displayRole: 'Commercial Insurance Producer' },
  'mga executive': { canonicalKey: 'mga_executive', displayRole: 'MGA Executive' },
  'managing general agent': { canonicalKey: 'mga_executive', displayRole: 'Managing General Agent' },
  'mga president': { canonicalKey: 'mga_executive', displayRole: 'MGA President' },
  'mga underwriter executive': { canonicalKey: 'mga_executive', displayRole: 'MGA Underwriting Executive' },
  'insurtech product manager': { canonicalKey: 'insurtech_product_manager', displayRole: 'Insurtech Product Manager' },
  'insurtech pm': { canonicalKey: 'insurtech_product_manager', displayRole: 'Insurtech PM' },
  'insurance product manager': { canonicalKey: 'insurtech_product_manager', displayRole: 'Insurance Product Manager' },
  'surplus lines specialist': { canonicalKey: 'surplus_lines_specialist', displayRole: 'Surplus Lines Specialist' },
  'e&s broker': { canonicalKey: 'surplus_lines_specialist', displayRole: 'E&S Broker' },
  'excess and surplus broker': { canonicalKey: 'surplus_lines_specialist', displayRole: 'Excess & Surplus Broker' },
  'wholesale insurance broker': { canonicalKey: 'surplus_lines_specialist', displayRole: 'Wholesale Insurance Broker' },
  'parametric insurance analyst': { canonicalKey: 'parametric_insurance_analyst', displayRole: 'Parametric Insurance Analyst' },
  'parametric analyst': { canonicalKey: 'parametric_insurance_analyst', displayRole: 'Parametric Analyst' },
  'parametric underwriter': { canonicalKey: 'parametric_insurance_analyst', displayRole: 'Parametric Underwriter' },
  'climate insurance analyst': { canonicalKey: 'parametric_insurance_analyst', displayRole: 'Climate Insurance Analyst' },
  'cre asset manager': { canonicalKey: 'cre_asset_manager', displayRole: 'CRE Asset Manager' },
  'commercial real estate asset manager': { canonicalKey: 'cre_asset_manager', displayRole: 'Commercial Real Estate Asset Manager' },
  'real estate asset manager': { canonicalKey: 'cre_asset_manager', displayRole: 'Real Estate Asset Manager' },
  'cre portfolio manager': { canonicalKey: 'cre_asset_manager', displayRole: 'CRE Portfolio Manager' },
  'cre debt origination': { canonicalKey: 'cre_debt_origination', displayRole: 'CRE Debt Originator' },
  'cre originator': { canonicalKey: 'cre_debt_origination', displayRole: 'CRE Originator' },
  'commercial real estate lender': { canonicalKey: 'cre_debt_origination', displayRole: 'CRE Lender' },
  'real estate debt originator': { canonicalKey: 'cre_debt_origination', displayRole: 'Real Estate Debt Originator' },
  'reit research analyst': { canonicalKey: 'reit_research_analyst', displayRole: 'REIT Research Analyst' },
  'reit analyst': { canonicalKey: 'reit_research_analyst', displayRole: 'REIT Analyst' },
  'real estate equity analyst': { canonicalKey: 'reit_research_analyst', displayRole: 'Real Estate Equity Analyst' },
  'reit equity research': { canonicalKey: 'reit_research_analyst', displayRole: 'REIT Equity Research Analyst' },
  'opportunistic re investor': { canonicalKey: 'opportunistic_re_investor', displayRole: 'Opportunistic Real Estate Investor' },
  'opportunistic real estate investor': { canonicalKey: 'opportunistic_re_investor', displayRole: 'Opportunistic RE Investor' },
  'distressed real estate investor': { canonicalKey: 'opportunistic_re_investor', displayRole: 'Distressed Real Estate Investor' },
  'value add re investor': { canonicalKey: 'opportunistic_re_investor', displayRole: 'Value-Add RE Investor' },
  'gp lp relations associate': { canonicalKey: 'gp_lp_relations_associate', displayRole: 'GP/LP Relations Associate' },
  'investor relations real estate': { canonicalKey: 'gp_lp_relations_associate', displayRole: 'Real Estate Investor Relations Associate' },
  'real estate ir': { canonicalKey: 'gp_lp_relations_associate', displayRole: 'Real Estate IR Associate' },
  'lp relations real estate': { canonicalKey: 'gp_lp_relations_associate', displayRole: 'LP Relations (Real Estate)' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_INSURANCE_RE_FINANCE: Record<string, string> = {
  life_actuary: 'life_actuary',
  pc_actuary: 'pc_actuary',
  reinsurance_pricing_actuary: 'reinsurance_pricing_actuary',
  catastrophe_modeler: 'catastrophe_modeler',
  captive_insurance_manager: 'captive_insurance_manager',
  health_underwriter_senior: 'health_underwriter_senior',
  claims_executive: 'claims_executive',
  insurance_broker_commercial: 'insurance_broker_commercial',
  mga_executive: 'mga_executive',
  insurtech_product_manager: 'insurtech_product_manager',
  surplus_lines_specialist: 'surplus_lines_specialist',
  parametric_insurance_analyst: 'parametric_insurance_analyst',
  cre_asset_manager: 'cre_asset_manager',
  cre_debt_origination: 'cre_debt_origination',
  reit_research_analyst: 'reit_research_analyst',
  opportunistic_re_investor: 'opportunistic_re_investor',
  gp_lp_relations_associate: 'gp_lp_relations_associate',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_INSURANCE_RE_FINANCE: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  life_actuary:                  { roleKey: 'life_actuary',                  roleName: 'Life Actuary',                          demandIndex: 76, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 75,  yoyJobOpeningsChange: 6,   topHiringLocations: ['Hartford CT', 'New York NY', 'Des Moines IA', 'Chicago IL', 'Boston MA'],                  aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'FSA-level life actuaries protected by SOA credential moat + regulated work; ALM/hedging specialty premium.' },
  pc_actuary:                    { roleKey: 'pc_actuary',                    roleName: 'P&C Actuary',                           demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 80,  yoyJobOpeningsChange: 14,  topHiringLocations: ['Hartford CT', 'New York NY', 'Chicago IL', 'Bermuda', 'Boston MA'],                       aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'FCAS pipeline chronically tight; commercial/cyber/cat pricing protected. Bonus typically 15-25% base; performance shares at carriers.' },
  reinsurance_pricing_actuary:   { roleKey: 'reinsurance_pricing_actuary',   roleName: 'Reinsurance Pricing Actuary',           demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95,  yoyJobOpeningsChange: 18,  topHiringLocations: ['Bermuda', 'New York NY', 'Zurich', 'Munich', 'Hartford CT', 'London'],                     aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Reinsurance pricing acutely scarce; broker analytics teams competing aggressively. Bonus 20-40% base + share programs at Munich/Swiss/RGA.' },
  catastrophe_modeler:           { roleKey: 'catastrophe_modeler',           roleName: 'Catastrophe Modeler',                   demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 85,  yoyJobOpeningsChange: 32,  topHiringLocations: ['Bermuda', 'New York NY', 'London', 'Boston MA', 'San Francisco CA', 'Zurich'],            aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Climate-driven surge — IPCC physical risk + insured-loss escalation driving 30%+ demand growth. Variable comp 15-30% base.' },
  captive_insurance_manager:     { roleKey: 'captive_insurance_manager',     roleName: 'Captive Insurance Manager',             demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65,  yoyJobOpeningsChange: 16,  topHiringLocations: ['Burlington VT', 'Bermuda', 'Cayman Islands', 'Guernsey', 'New York NY', 'Hartford CT'],   aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'Corp self-insurance acceleration (cyber, healthcare) driving captive formation; 10%+ YoY new domiciles. Bonus 15-25% base.' },
  health_underwriter_senior:     { roleKey: 'health_underwriter_senior',     roleName: 'Senior Health Underwriter',             demandIndex: 58, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable', timeToFillDays: 35,  yoyJobOpeningsChange: -14, topHiringLocations: ['Hartford CT', 'Minneapolis MN', 'Atlanta GA', 'Indianapolis IN', 'Bangalore'],             aiSubstitutionRisk: 0.50, dataQuarter: '2026-Q1', calibrationNote: 'Routine medical underwriting displaced by Hippo/Lemonade/Oscar ML. Stop-loss + complex large-case protected. Pivot urgency high.' },
  claims_executive:              { roleKey: 'claims_executive',              roleName: 'Claims Executive',                      demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 50,  yoyJobOpeningsChange: 2,   topHiringLocations: ['Hartford CT', 'Chicago IL', 'New York NY', 'Atlanta GA', 'Bangalore'],                     aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Routine claims (auto/homeowners) facing 40-55% automation; complex/litigation claims protected. Senior executive pay 15-25% bonus.' },
  insurance_broker_commercial:   { roleKey: 'insurance_broker_commercial',   roleName: 'Commercial Insurance Broker',           demandIndex: 75, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 55,  yoyJobOpeningsChange: 10,  topHiringLocations: ['New York NY', 'Chicago IL', 'Houston TX', 'Atlanta GA', 'San Francisco CA', 'Boston MA'],   aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Relationship-driven; cyber and D&O brokers in acute shortage. Total comp dominated by commission split (30-65% of revenue produced).' },
  mga_executive:                 { roleKey: 'mga_executive',                 roleName: 'MGA Executive',                         demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 75,  yoyJobOpeningsChange: 22,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Chicago IL', 'Atlanta GA', 'London', 'Bermuda'],         aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'MGA platform formation (cyber, parametric, embedded) at record pace. Equity participation in MGA platform is the largest comp lever.' },
  insurtech_product_manager:     { roleKey: 'insurtech_product_manager',     roleName: 'Insurtech Product Manager',             demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 48,  yoyJobOpeningsChange: 18,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Austin TX', 'Boston MA', 'Tel Aviv'],                    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Cyber + parametric + embedded insurtech driving hiring. Equity grants at Coalition, At-Bay, Resilience, Cowbell substantial.' },
  surplus_lines_specialist:      { roleKey: 'surplus_lines_specialist',      roleName: 'Surplus Lines Specialist',              demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 42,  yoyJobOpeningsChange: 15,  topHiringLocations: ['New York NY', 'Houston TX', 'Atlanta GA', 'Dallas TX', 'Chicago IL', 'Los Angeles CA'],     aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'E&S hardening market driving placement complexity. Cyber, cannabis, coastal, habitational specialty in shortage. Commission-rich comp.' },
  parametric_insurance_analyst:  { roleKey: 'parametric_insurance_analyst',  roleName: 'Parametric Insurance Analyst',          demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 75,  yoyJobOpeningsChange: 35,  topHiringLocations: ['New York NY', 'Bermuda', 'London', 'Zurich', 'San Francisco CA', 'Paris'],                  aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Climate-adaptation demand; parametric placements growing 30-50% YoY. Descartes/Arbol/Floodbase aggressively hiring.' },
  cre_asset_manager:             { roleKey: 'cre_asset_manager',             roleName: 'CRE Asset Manager',                     demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 70,  yoyJobOpeningsChange: 4,   topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Dallas TX', 'San Francisco CA', 'Atlanta GA'], aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Sector-specialist (industrial, data center, life sci) protected; office asset mgmt under pressure. Total comp dominated by carry.' },
  cre_debt_origination:          { roleKey: 'cre_debt_origination',          roleName: 'CRE Debt Originator',                   demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 62,  yoyJobOpeningsChange: 16,  topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Dallas TX', 'San Francisco CA'],            aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Refi wave + bank pullback driving direct-lending fund hiring. Production bonus often 1.5-3x base for top originators.' },
  reit_research_analyst:         { roleKey: 'reit_research_analyst',         roleName: 'REIT Research Analyst',                 demandIndex: 68, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 55,  yoyJobOpeningsChange: 0,   topHiringLocations: ['New York NY', 'Los Angeles CA', 'Boston MA', 'Chicago IL', 'San Francisco CA'],            aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Sell-side coverage commoditizing; buy-side sector specialists premium. Bonus 30-80% base at top funds.' },
  opportunistic_re_investor:     { roleKey: 'opportunistic_re_investor',     roleName: 'Opportunistic Real Estate Investor',    demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 85,  yoyJobOpeningsChange: 18,  topHiringLocations: ['New York NY', 'Los Angeles CA', 'Dallas TX', 'San Francisco CA', 'London', 'Singapore'],   aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Distressed CRE cycle (office, retail) generating active hiring. Total comp dominated by carry; 5-15 bps fund-level carry common.' },
  gp_lp_relations_associate:     { roleKey: 'gp_lp_relations_associate',     roleName: 'GP/LP Relations Associate',             demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 50,  yoyJobOpeningsChange: 12,  topHiringLocations: ['New York NY', 'Los Angeles CA', 'San Francisco CA', 'Chicago IL', 'London', 'Hong Kong'],    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'Fundraising-cycle driven; institutional LP relationships are the differentiator. Bonus 30-60% base + small carry allocations at senior level.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_INSURANCE_RE_FINANCE: Record<string, Record<string, number>> = {
  life_actuary:                  { '0-2': 92_000,  '2-5': 135_000, '5-10': 185_000, '10-15': 250_000, '15+': 320_000 },
  pc_actuary:                    { '0-2': 95_000,  '2-5': 140_000, '5-10': 195_000, '10-15': 265_000, '15+': 340_000 },
  reinsurance_pricing_actuary:   { '0-2': 105_000, '2-5': 155_000, '5-10': 215_000, '10-15': 290_000, '15+': 365_000 },
  catastrophe_modeler:           { '0-2': 92_000,  '2-5': 125_000, '5-10': 165_000, '10-15': 215_000, '15+': 255_000 },
  captive_insurance_manager:     { '0-2': 88_000,  '2-5': 120_000, '5-10': 158_000, '10-15': 210_000, '15+': 260_000 },
  health_underwriter_senior:     { '0-2': 72_000,  '2-5': 95_000,  '5-10': 130_000, '10-15': 165_000, '15+': 195_000 },
  claims_executive:              { '0-2': 78_000,  '2-5': 105_000, '5-10': 145_000, '10-15': 195_000, '15+': 240_000 },
  insurance_broker_commercial:   { '0-2': 65_000,  '2-5': 105_000, '5-10': 165_000, '10-15': 230_000, '15+': 305_000 },
  mga_executive:                 { '0-2': 95_000,  '2-5': 145_000, '5-10': 215_000, '10-15': 295_000, '15+': 375_000 },
  insurtech_product_manager:     { '0-2': 110_000, '2-5': 150_000, '5-10': 195_000, '10-15': 240_000, '15+': 275_000 },
  surplus_lines_specialist:      { '0-2': 72_000,  '2-5': 105_000, '5-10': 145_000, '10-15': 180_000, '15+': 210_000 },
  parametric_insurance_analyst:  { '0-2': 88_000,  '2-5': 120_000, '5-10': 155_000, '10-15': 195_000, '15+': 232_000 },
  cre_asset_manager:             { '0-2': 105_000, '2-5': 155_000, '5-10': 215_000, '10-15': 285_000, '15+': 355_000 },
  cre_debt_origination:          { '0-2': 110_000, '2-5': 170_000, '5-10': 245_000, '10-15': 350_000, '15+': 445_000 },
  reit_research_analyst:         { '0-2': 105_000, '2-5': 150_000, '5-10': 210_000, '10-15': 275_000, '15+': 335_000 },
  opportunistic_re_investor:     { '0-2': 130_000, '2-5': 200_000, '5-10': 285_000, '10-15': 390_000, '15+': 495_000 },
  gp_lp_relations_associate:     { '0-2': 85_000,  '2-5': 125_000, '5-10': 170_000, '10-15': 215_000, '15+': 255_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_INSURANCE_RE_FINANCE: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  life_actuary: {
    strongOpener: 'I want to discuss my compensation in the context of my SOA exam progression and the ALM/hedging work I\'ve led this year. With [X exams complete / FSA designation / specific ALM project outcomes], my market is materially above current.',
    leverageContext: 'Per the DW Simpson 2026 actuarial salary survey, FSA-level life actuaries at my experience level earn $X at 75th percentile. Pure reserving talent is being squeezed by automation; ALM/hedging/inforce specialists command the premium. Replacement cost: 12+ months minimum for a comparable FSA with my specialty.',
    countersScript: 'I\'m asking for base of $X (75th percentile per DW Simpson), bonus target of Y% (peer carriers pay 15-25%), and a documented progression path to AVP/VP Actuarial within 18 months. If full base adjustment isn\'t available, I\'ll accept a meaningful retention RSU + 6-month review.',
    walkAwayLine: 'I have approaches from [RGA / Munich Re / Swiss Re reinsurance pricing] at base $X above current. I\'d prefer to continue the ALM work here, but the gap to market is now meaningful.',
  },
  pc_actuary: {
    strongOpener: 'I\'d like to align my compensation with the 2026 FCAS-track P&C actuarial market. My exam progression [ACAS / on FCAS pathway with X exams complete], plus the commercial cyber/D&O/cat pricing work I\'ve led, position me at the senior reserves/pricing actuary tier.',
    leverageContext: 'Per the Ezra Penland 2026 P&C compensation survey, FCAS-track senior actuaries in commercial specialty lines earn $X-$Y at the 75th percentile. Commercial cyber and parametric pricing actuaries are in acute shortage at AIG, Chubb, Beazley, Coalition, At-Bay. Replacement cost: 9-12 months.',
    countersScript: 'I\'m asking for base of $X (75th percentile FCAS-track commercial specialty), bonus target Y%, and exam fee + study time reimbursement for the remaining CAS exams. Plus performance share allocation if employer offers it (Travelers, Chubb, Hartford do).',
    walkAwayLine: 'I have inbound from [Aon Reinsurance Solutions / Guy Carpenter / W.R. Berkley / Arch] at materially higher comp. I\'d like to continue here — but I need to see real movement.',
  },
  reinsurance_pricing_actuary: {
    strongOpener: 'Reinsurance pricing actuaries with treaty + facultative + structuring experience are sub-1,000 globally. I want to align my comp with that scarcity — particularly given my track record on [specific large placements / specialty book pricing / cat XOL design].',
    leverageContext: 'Per the Ezra Penland 2026 reinsurance compensation report, senior reinsurance pricing actuaries at FCAS level earn $X at top reinsurers (Munich Re, Swiss Re, Hannover Re, SCOR, RGA, RenaissanceRe). Reinsurance broker analytics (Aon, Guy Carpenter, Howden Re, McGill Re) pay 15-25% above carrier. Replacement: 12+ months.',
    countersScript: 'I\'m asking for base of $X (75th percentile per Ezra Penland), bonus target of 25-35%, Bermuda/London rotation budget, and Monte Carlo Rendez-Vous + Baden-Baden travel allocation each renewal cycle.',
    walkAwayLine: 'I have direct approaches from [Munich Re Bermuda / RenaissanceRe / Guy Carpenter Analytics] at base $X above current plus structurally higher bonus. I\'d like to continue here but the gap is now material.',
  },
  catastrophe_modeler: {
    strongOpener: 'Cat modelers with multi-model proficiency (RMS, AIR, KCC) plus climate-adjusted modeling expertise are in extreme shortage as climate-driven insured losses escalate. I want to align my compensation with that.',
    leverageContext: 'Per the DW Simpson cat modeling survey, senior multi-model cat modelers earn $X at the 75th percentile. Climate-cat specialists at Munich Re Climate, Swiss Re Climate Solutions, Aon Impact Forecasting, Guy Carpenter Climate, and ICEYE/Jupiter Intelligence are in 4:1 demand-to-supply ratio. Replacement: 9-12 months.',
    countersScript: 'I\'m asking for base of $X (75th percentile), bonus target of 15-25%, RMS/AIR/KCC certification renewal budget, plus 2-3 climate-related conference allowances annually (Reinsurance Climate Risk Forum, RAA, Verisk Insurance Conference).',
    walkAwayLine: 'I have inbound from [ICEYE / Jupiter Intelligence / Aon Impact Forecasting / Munich Re Climate Solutions] at material premium to current. I\'d like to continue here but need movement.',
  },
  insurance_broker_commercial: {
    strongOpener: 'I\'d like to discuss commission split and total comp structure. My book — [list specific size / revenue / renewal retention] — is now at a level where peer brokerages pay 50-65% commission split vs. my current Y%.',
    leverageContext: 'Per Reagan Consulting 2026 broker compensation survey, producers with my book size at top-3 brokerages (Marsh, Aon, WTW, Gallagher, Lockton, HUB, Brown & Brown) operate at 50-65% commission split with full equity participation. Lockton and USI specifically offer producer-owned equity. My book is portable; BORs can be migrated.',
    countersScript: 'I\'m asking for commission split adjustment to X%, equity participation (or commission floor + bonus), and dedicated account executive support for my book. If full split adjustment isn\'t feasible, I want a documented path to equity at 12-month review.',
    walkAwayLine: 'I have term sheets from [Lockton / USI / Higginbotham] with explicit equity participation and X% commission split. The work here has been excellent — but the long-term economics are now material.',
  },
  mga_executive: {
    strongOpener: 'I want to discuss equity participation in the MGA platform. Cash comp is one dimension; the wealth event is platform equity at exit. My contribution to [GWP growth / loss ratio performance / capacity relationships] is now at the level where equity is the appropriate structure.',
    leverageContext: 'MGA platforms (Coalition, At-Bay, Resilience, Cowbell, Vouch, Foxquilt, Embroker) routinely grant senior executives 0.5-2% direct equity (not just options) with PE-backed liquidity. The MGA acquisition wave (Markel, Arch, Berkshire, Fairfax acquisitions) has generated $5-50M wealth events for senior MGA executives.',
    countersScript: 'I\'m asking for direct equity grant of X% (vs options), base of $Y, bonus target of Z%, plus accelerated vesting on change of control. If direct equity isn\'t available, I\'ll accept profit-share at Y% of GWP-tied performance.',
    walkAwayLine: 'I have an inbound from [competitor cyber MGA / parametric MGA] with explicit X% equity grant and accelerated vesting. The work here is mission I believe in — but the long-term economics need to align.',
  },
  insurtech_product_manager: {
    strongOpener: 'I want to discuss refresh equity. My initial grant has substantially vested; my contribution to [specific product launches / GWP attached / loss ratio / customer growth] warrants refresh aligned with my impact.',
    leverageContext: 'Per Levels.fyi insurtech PM data, senior insurtech PMs at Coalition, At-Bay, Resilience, Cowbell, Branch, Vouch routinely receive annual refresh grants of 25-50% of initial. The refresh compounds materially through IPO/acquisition. Replacement cost: 6-9 months for a PM with my specific underwriting product experience.',
    countersScript: 'I\'m asking for refresh equity grant of $X (50% of initial), base of $Y (75th percentile), bonus target Z%, and signing accelerator on next milestone if you can\'t adjust base immediately.',
    walkAwayLine: 'I have inbound from [Coalition / Resilience / At-Bay] with refresh grant of $X and base adjustment. I\'d prefer to continue here, but I need refresh equity to maintain meaningful upside.',
  },
  cre_asset_manager: {
    strongOpener: 'After leading [lifecycle of Property X / sector strategy for industrial-data center / value-add execution for portfolio Y], I\'d like to discuss carry participation in the next fund vintage.',
    leverageContext: 'Per the Ferguson Partners 2026 CRE compensation survey, senior asset managers at top-tier firms (Blackstone, Brookfield, Starwood Capital, Tishman Speyer, Hines) operate on cash base of $X plus carry of 1-3 bps of fund. A 2 bps allocation on a $3B fund with 18% IRR generates $X carry. Sector specialists (industrial, data center, life sci) command premium.',
    countersScript: 'I\'m asking for explicit carry allocation in the next vintage (X bps), base of $Y, bonus target Z%. If carry isn\'t available immediately, I want a documented path with specific milestones for vintage N+1.',
    walkAwayLine: 'I have approaches from [Blackstone / Brookfield / KKR Real Estate / specific sector-focused operator] with explicit carry participation. The work here has been excellent — but carry economics are essential for senior CRE.',
  },
  cre_debt_origination: {
    strongOpener: 'My origination volume of $X this year — across [sponsor relationships, product types] — is at the level where top debt funds compete aggressively. I want to align my production bonus structure and base.',
    leverageContext: 'Per the Ferguson Partners 2026 CRE debt compensation survey, senior originators with $500M+ annual origination volume at direct-lending debt funds (Blackstone Real Estate Debt, KKR Real Estate Credit, Apollo CRE, Brookfield Real Estate Income, Mesa West, ACORE, Madison Realty) operate on production bonus of 1.5-3x base. My book of sponsor relationships is portable.',
    countersScript: 'I\'m asking for base of $X, production bonus formula tied to origination volume + loan performance (Y bps of originated balance), and dedicated execution team. Plus carry participation in the firm\'s direct-lending fund if applicable.',
    walkAwayLine: 'I have term sheets from [Mesa West / ACORE / Madison Realty / direct-lending debt fund] with materially higher production bonus structure. I\'d like to continue here — but the economics need to align with peer firms.',
  },
  reit_research_analyst: {
    strongOpener: 'I want to discuss compensation in the context of my sector-specialist coverage of [industrial / data center / life science / multifamily / self-storage / healthcare] REITs. Sector specialists command premium over generalist coverage in 2026.',
    leverageContext: 'Per the Greenwich Associates 2026 buy-side analyst survey, sector-specialist REIT analysts at top buy-side funds (Cohen & Steers, Heitman, Principal Real Estate, AEW, Brookfield Public Securities, CenterSquare) earn $X at the 75th percentile with bonus of 60-100% base. My published coverage and call accuracy on [specific names] supports the premium.',
    countersScript: 'I\'m asking for base of $X, bonus target Y% (sector-specialist premium), research budget for site visits and management meetings, and Bloomberg/factual research subscription. Plus path to PM or Senior Research Director within 24 months.',
    walkAwayLine: 'I have approaches from [Cohen & Steers / Heitman / Principal REI / CenterSquare] at base $X above current plus structurally higher bonus. I\'d like to continue here but the gap to specialist buy-side is meaningful.',
  },
  opportunistic_re_investor: {
    strongOpener: 'After leading [X opportunistic deals / Y distressed acquisitions / specific large transactions] generating Z IRR/MOIC, I want to discuss explicit carry participation in the next fund vintage.',
    leverageContext: 'Per the Ferguson Partners 2026 opportunistic RE compensation survey, senior VPs/Principals at top opportunistic funds (Blackstone Real Estate Opportunistic, Brookfield Strategic, Starwood Distressed, Cerberus, Oaktree Real Estate, KKR Real Estate Opportunistic) operate on cash base of $X plus 5-15 bps of fund carry. A 10 bps allocation on a $5B fund with 18% IRR generates $5-8M carry over fund life.',
    countersScript: 'I\'m asking for explicit carry allocation of X bps in the next vintage, base of $Y, bonus target Z%. If carry isn\'t available now, I want a documented path with deal-attribution milestones for vintage N+1.',
    walkAwayLine: 'I have approaches from [Brookfield Strategic / Cerberus / Oaktree / KKR Real Estate] with explicit carry participation in their current vintage. Carry economics are essential — I need to see movement here.',
  },
  gp_lp_relations_associate: {
    strongOpener: 'My LP relationships — [specific names: CalPERS, OTPP, GIC, Norges, Yale, Harvard, family offices] — and the capital raised this cycle position me at the senior IR level. I want to discuss carry participation in fund N+1 and base.',
    leverageContext: 'Per the Hodes Weill 2026 GP/IR compensation survey, senior IR/LP relations at top RE GPs (Blackstone, Brookfield, Starwood, KKR, Apollo) operate on base of $X plus bonus 40-60% plus small carry allocations (0.25-1 bps) at senior IR/director level. My LP relationships are portable; LPs will follow me to the next platform.',
    countersScript: 'I\'m asking for base of $X, bonus target Y%, small carry allocation in next fund vintage (0.5 bps), and dedicated junior IR support. Plus title elevation to Director / Principal IR within 12 months.',
    walkAwayLine: 'I have inbound from [competitor RE GP / institutional LP side / IR boutique] with carry participation and director-level title. I\'d like to continue here — but the IR career arc needs explicit carry and title.',
  },
};
