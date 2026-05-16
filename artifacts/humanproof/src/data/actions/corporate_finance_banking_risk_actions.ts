// corporate_finance_banking_risk_actions.ts — Phase 3 / v38.0
// 18 Corporate Finance / Treasury / Banking / Risk + Compliance roles.
// Corp Finance: CFO ladder, FP&A, Treasury, IR, Controllership, Corp Dev.
// Banking: Retail/Commercial RM, Credit, Wealth/Private Banking, Mortgage, Branch.
// Risk: Credit/Market/Op Risk, Model Validation (SR 11-7), BSA/AML, OFAC compliance.

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
  { title: 'Join AFP, FEI, and Sector-Specific Finance Communities', description: 'Sign up for the Association for Financial Professionals (AFP — $599/year, treasury/FP&A core community), Financial Executives International (FEI — controller/CFO track), and the Bank Administration Institute (BAI) for banking specifically. Members get early access to unfilled CFO/Treasurer/Controller searches 30-60 days before public listing. Attend the AFP Annual Conference (Boston/Las Vegas rotation) — that single event generates 4-6 recruiter contacts at TD Cowen, Goldman Sachs, JPM Treasury Services.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Public Track Record via Public-Company Filings', description: 'For corp finance professionals at public companies, your name in the 10-K (signing officer, certifying officer, IR contact) IS your portfolio. For private-company finance, build credibility via authored thought-leadership on LinkedIn — quarterly posts on FP&A maturity, working-capital optimization, or CFO-track topics. Recruiters at Korn Ferry, Heidrick & Struggles, and Spencer Stuart specifically search LinkedIn for these signals when filling Controller/VP Finance/CFO slates.', layerFocus: 'L3 · Visibility', riskReductionPct: 18, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue the Defining Credential for Your Track (CPA / CFA / FRM / CFP)', description: 'Corp Finance/Controllership = CPA (passing all 4 sections + 150 credit hours + 1 year experience). Investment side / Treasury / Corp Dev = CFA (3 levels, ~$3K total, 4 years). Risk = FRM (GARP, 2 levels, ~$1,800). Wealth Management = CFP (~$3K + experience). Each adds $20K-$40K to median compensation. Pick the right credential for your track and schedule the next exam window NOW — registration locks the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '6 months — register now', priority: 'High' },
  { title: 'Register on eFinancialCareers and Build a Recruiter Network', description: 'eFinancialCareers, Hunt Scanlon, and Russell Reynolds finance practice are the high-end finance/banking recruiter channels. Building relationships with 3-5 recruiters at boutique finance retained-search firms (vs. just contingency) is the single highest-leverage move for $200K+ roles. Recruiters introduce you to confidential CFO/Treasurer searches that never hit job boards.', layerFocus: 'L3 · Reputation', riskReductionPct: 16, deadline: '7 days', priority: 'Medium' },
  { title: 'Audit Your LinkedIn for Specific Systems and Frameworks', description: 'Recruiters search by specific finance systems: Workday Adaptive, Oracle EPM/Hyperion, SAP S/4HANA Finance, Anaplan, Pigment, Vena, OneStream, Blackline, FloQast. For banking: nCino, Salesforce Financial Services Cloud, Fiserv, FIS. For risk: SAS Risk Management, Moody\'s RiskFrontier, MSCI RiskMetrics, Numerix. List every tool with hands-on experience. Add "Open to finance/banking roles" signal. This single update typically triples recruiter outreach.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_CORPORATE_FINANCE_BANKING_RISK ─────────────────────────────────

export const ACTION_DB_CORPORATE_FINANCE_BANKING_RISK: Record<string, BracketPool> = {

  // ─── Corporate Finance / Treasury (6) ───────────────────────────────────────

  fpa_director: pool(
    { title: 'Migrate Off Excel-Only Stack — Master Anaplan, Pigment, or Workday Adaptive', description: 'Pure Excel-driven FP&A is the highest-displacement specialty in corp finance (model automation aggressive — GPT-finance copilots are eating routine variance walks and consolidations). FP&A directors who own a modern EPM platform (Anaplan, Pigment, Workday Adaptive Planning, Oracle EPM Cloud, OneStream) are 3x more valuable than spreadsheet-only directors. Get certified in one platform — Anaplan Model Builder ($395), Pigment Certified Builder (free), Adaptive Insights certification. Position yourself as "the FP&A leader who owns the modern stack."', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    { title: 'Own the Public-Co Quarterly Cycle — 10-Q/10-K Forecast Variance Discipline', description: 'FP&A Directors at public companies who own the analyst-consensus tracking + Street-vs-internal-forecast bridge during 10-Q/10-K cycles are on the explicit CFO succession ladder. Embed yourself in the IR + Controllership cross-functional team. Lead the consensus-bridge slide for next earnings. Document this work as "owned variance analytics on $X revenue base for 4 quarters consecutive" — this becomes a portable CV piece for Director of FP&A → VP FP&A → CFO at the next employer.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn the CPA+MBA Combo and Move Toward Deputy-CFO Track', description: 'The CFO ladder in public companies bifurcates: (1) Big 4 audit + CPA → Controller → CFO, (2) IB analyst → Corp Dev → VP Finance → CFO, (3) FP&A Director → VP FP&A → Deputy CFO → CFO. Track 3 requires CPA (or strong CFA) + MBA from a Tier-1 program (Wharton, Booth, Kellogg, Stern, Tuck) to compete for public-co CFO slates. Start the part-time/EMBA program this calendar year — by year 5 you\'re competitive for VP FP&A roles at $300K+. Without these credentials, the FP&A → CFO path stalls at director.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  treasurer: pool(
    { title: 'Own the Banking Relationship Slate — Reduce Counterparty Risk Post-SVB', description: 'Post-SVB collapse (March 2023), corporate treasurers who proactively diversified banking relationships beyond a single regional concentration are the most valuable hires. Build/document a 5-bank counterparty diversification — primary operating bank (JPM Chase / BofA / Wells), backup operating bank, sweep/MMF partner, FX/derivatives bank, and dedicated debt-capital-markets bank. This is the single most-asked-about credential in 2026 Treasurer interviews. Document the working capital impact, bank-fee reduction, and counterparty-exposure metric — this becomes the headline accomplishment for the next role.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Build Hedging + Capital-Markets Credentials (FX, IR Swaps, Debt Issuance)', description: 'Mid-cap+ corporate treasurers earn $250K-$400K base + bonus + equity ($375K-$650K total comp) when they own (a) FX hedging program, (b) interest-rate-derivative overlays for floating-debt portfolios, (c) capital-markets issuance experience (bonds, term loan B, revolver upsizes). Get hands-on with one of these annually. Partner with the bank syndicate desk at JPM / Goldman / BofA on the next debt issuance — your name on the offering circular is the credential.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn CTP and Position for Deputy-CFO Track', description: 'AFP\'s Certified Treasury Professional (CTP, $1,150 exam + AFP membership) is the gold-standard treasury credential. Combined with CPA or CFA, it positions you for VP Treasury → Deputy CFO at mid-cap+ public companies ($350K-$600K total comp). The treasurer-to-CFO path is the second-most-common public-company CFO origin (after Controllership). Target Russell 2000 / mid-cap public co Deputy CFO slates within 18-24 months.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  ir_director: pool(
    { title: 'Own the Investor Day Cycle and Build a Sell-Side Analyst Network', description: 'IR Directors at public companies who personally manage the relationships with all sell-side analysts covering the stock (Goldman, JPM, Morgan Stanley, BofA, Wells Fargo, Jefferies, etc.) are essentially un-replaceable mid-cycle. Build/document: (1) personal analyst-Rolodex of 12-20 analysts, (2) ownership of the next investor day from agenda → speaker prep → Q&A management, (3) consensus model accuracy — your "Street consistency" metric. Public-co IR talent is structurally short; this work makes you a $250K-$325K base + bonus + equity ($350K-$525K total) candidate at the next public company.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '180 days', priority: 'Critical' },
    { title: 'Build a Tier-1 Conference Circuit Presence (Goldman / JPM Tech + Healthcare)', description: 'The IR conference circuit is the deal-flow engine of the role — Goldman Sachs Communacopia + Technology Conference, JPMorgan Technology + Healthcare Conferences, Morgan Stanley TMT, BofA Global Industrials. IR Directors who personally manage their CEO/CFO\'s presence at 6-10 marquee conferences/year are in extreme demand. Submit your CEO for these conferences NOW (slots fill 90+ days out). Document the institutional 1-on-1 count per conference — this is the headline metric in IR Director comp negotiation.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Pursue NIRI Certification (CPIR or IRC) and Position for VP IR/Head of IR', description: 'NIRI\'s Investor Relations Charter (IRC, ~$1,500) is the credential bar for senior IR roles. Combined with CFA (the sell-side-side credential), positions you for VP IR / Head of IR at $300K-$450K base + bonus + equity at mid-cap+ public companies. Senior IR talent has structural shortage — every public co needs one. Apply within 14-30 days to 3 confidential VP IR searches via Korn Ferry, Heidrick, Egon Zehnder.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  deputy_cfo: pool(
    { title: 'Lead a Public-Company Sale Process, IPO, or Major M&A as Deputy CFO', description: 'Deputy CFOs who personally lead a sale process (advisor selection, data room, management presentations, definitive negotiation, regulatory closing) graduate to public-company CFO at the next employer 80%+ of the time. If your current employer is approaching a transaction window (PE-backed sale, IPO, strategic merger), explicitly volunteer to lead the workstream. If no transaction is on the horizon, propose a strategic-alternative analysis to the board chair as a self-development project. The "led-a-sale-process" credential is worth $200K-$400K in next-job total comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '180 days', priority: 'Critical' },
    { title: 'Own the SOX 404 Program End-to-End and Sign Sub-Certifications', description: 'Deputy CFOs at public companies who personally own Sox 404 compliance, sign quarterly sub-certifications to the CFO, and have a clean PCAOB inspection record on the audit are CFO-ready at mid-cap+ public companies. Document: (1) zero material weaknesses for X consecutive years, (2) reduction in significant-deficiency count, (3) external-auditor sign-off cadence. Combined with the CPA, this is the controllership-track Deputy CFO → public-co CFO bridge at $325K-$525K base ($500K-$1.2M total comp with equity).', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to 3 Confidential Public-Co CFO Searches Within 30 Days', description: 'Deputy CFOs in active succession pipelines have a 2-3 year competitive window — after that, hiring boards perceive the candidate as "passed over." Apply via Korn Ferry, Heidrick & Struggles, Spencer Stuart, Russell Reynolds finance practices to 3 confidential public-co CFO searches NOW. Even if the current succession plan promotes you internally, the external CFO-search engagement is a leverage event that accelerates the timeline by 6-12 months and raises the inside offer.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  corporate_development_director: pool(
    { title: 'Close a Marquee Strategic Acquisition (vs. Bolt-On) and Document End-to-End Leadership', description: 'Corp Dev Directors bifurcate into two tracks: (1) bolt-on / tuck-in acquisitions (lower-value, $50M-$300M deals), (2) large strategic M&A ($1B+ transformative deals). Track 2 is the path to Chief Strategy Officer / Head of Corp Dev / EVP Strategy at $400K-$800K base + carry/equity. Lead one large strategic deal end-to-end: target identification, banker engagement, board memos, NEC review, definitive negotiation, regulatory antitrust workstream (HSR, EU). Document personally — the "led $XB strategic acquisition" credential is portable across F500.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '180 days', priority: 'Critical' },
    { title: 'Build a Top-Tier Banker + Boutique-Advisor Relationship Slate', description: 'Corp Dev Directors who maintain personal relationships with M&A bankers at Goldman / Morgan Stanley / JPM / Centerview / Evercore / Lazard / PJT have proprietary deal flow — 30-50% of best deals come through banker-sourced "first looks" before broad processes. Schedule 1-2 quarterly check-ins with 8-12 senior bankers covering your industry. This relationship slate is the most-asked-about credential in Head of Corp Dev / EVP Strategy interviews.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue CFA + JD or CFA + MBA for VP/Head of Corp Dev Track', description: 'Senior corp dev (Head of Corp Dev / EVP Strategy / Chief Strategy Officer) typically requires CFA + MBA (Wharton/Booth/Kellogg/Stern) or CFA + JD for legal-heavy industries (life sciences, regulated industries). Begin the next credential cycle this calendar year. Combined with a marquee deal credential, positions for $400K-$650K base + bonus + equity at mid-cap+ public companies.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  controller_strategic: pool(
    { title: 'Drive a Major Accounting-Standard Implementation (ASC 842 / ASC 606 / CECL)', description: 'Strategic Controllers / Chief Accounting Officers who personally lead a major accounting-standard implementation (ASC 842 lease accounting, ASC 606 revenue recognition, CECL for financial institutions) are on the CFO-track at mid-cap+ public companies. Document end-to-end ownership: technical accounting memo authoring, external-auditor agreement, system implementation (Blackline / FloQast / Workiva), board audit committee presentations. This is the highest-leverage controllership credential, worth $200K-$350K in next-employer base comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Own the External Auditor Relationship and PCAOB Inspection Posture', description: 'Strategic Controllers / CAOs who personally own the external-auditor (Big 4 — Deloitte, EY, PwC, KPMG) engagement, manage scope/fee/timing negotiations, and have a clean PCAOB inspection record are on the public-co CFO succession ladder. Document: zero significant deficiencies, no PCAOB Part I findings, audit-fee discipline year-over-year. Combined with the CPA, this is the controllership-track CFO bridge at $275K-$425K base ($400K-$700K total).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Move From Private-Co Controller to Public-Co CAO Within 18 Months', description: 'Private-co Controllers (even at sophisticated PE-backed companies) hit a comp ceiling around $250K-$300K. Public-company CAOs at the same revenue scale earn $325K-$525K base + bonus + equity ($500K-$900K total). Make the public-co transition within the next 18-24 months. Position your CV around (a) SOX 404 readiness work even at a private co, (b) PCAOB-equivalent audit standards, (c) GAAP-vs-non-GAAP reconciliation discipline.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  // ─── Banking — Retail / Commercial (6) ──────────────────────────────────────

  relationship_manager_commercial: pool(
    { title: 'Build a $200M+ C&I Loan Portfolio With Cross-Sell Penetration >60%', description: 'Commercial Banking Relationship Managers at the large banks (JPM Chase Commercial, BofA Business Banking, Wells Fargo Commercial Banking, US Bank, PNC, Truist) bifurcate into two tracks: (1) book-of-business RMs measured by loan portfolio size + cross-sell ratio, (2) generalist RMs measured by activity. Track 1 commands $135K-$225K base + bonus and is structurally protected from digital displacement. Build a documented $200M+ C&I (Commercial & Industrial) loan book with 60%+ cross-sell penetration (treasury management, FX, capital markets, wealth referrals). This is the portable credential that moves with you to the next bank at 15-30% comp uplift.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in a Vertical (Healthcare, Tech, Manufacturing, CRE)', description: 'Generalist commercial RMs are the most-displaced tier of banking — fintech (Mercury, Brex, Rho, Ramp) and large-bank digital channels are eating routine relationships. Vertical specialists (Healthcare Banking at JPM, Technology Banking at Silicon Valley Bank / First Citizens, CRE specialists at Wells Fargo, Manufacturing/Industrials at PNC) are immune. Pick one vertical and commit. Industry-specific credit committee experience, lender-spec underwriting, and cross-sell partners (e.g., JPM Healthcare Investment Banking referrals) build the moat.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Position for SVP / Market President Track at Regional or Super-Regional', description: 'Senior RMs at the top of the book-of-business curve advance to Market President / Commercial Executive ($250K-$400K base + bonus + equity) at regional/super-regional banks (US Bank, PNC, Truist, Citizens, Fifth Third, KeyBank, Regions). Apply to 3 confidential Market Executive searches via Hunt Scanlon Bank Practice within 30 days. Even the search process is a leverage event for the next inside compensation review.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  commercial_credit_officer: pool(
    { title: 'Own End-to-End Credit Decisions on $50M+ Deals — Be the Approving Authority', description: 'Commercial Credit Officers split into two tiers: (1) underwriters who prepare credit memos (junior/mid track, $90K-$160K), (2) approving authorities who hold delegated lending limits ($50M+ individual approval, $150K-$240K base). Move to Tier 2 within 18-24 months. Document your individual approval authority limits, sole-approved-deal volume, and post-funding performance — defaults, classifications, charge-offs on your approved book. A clean credit record on a $500M+ approved portfolio is the credential.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Build Industry-Specialist Underwriting Expertise + RMA Designation', description: 'RMA (Risk Management Association) Credit Risk Certification ($1,200) is the gold-standard credit underwriting credential. Combined with industry-specialist underwriting expertise (healthcare cash-flow lending, technology banking SaaS metrics, CRE construction-to-perm, asset-based lending), positions you for Senior Credit Officer / Chief Credit Officer track at regional banks ($200K-$340K base).', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to 3 Chief Credit Officer Track Roles at Regional Banks', description: 'Chief Credit Officer at regional/super-regional banks (US Bank, PNC, Truist, Citizens, Fifth Third, KeyBank, Regions) is a $325K-$550K base + bonus + equity role. The succession pipeline is thin — most CCOs are 55+ and approaching retirement. Apply via Hunt Scanlon Bank Practice and confidential retained search. Even applying is a leverage event for inside promotion.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  wealth_manager_advisor: pool(
    { title: 'Earn the CFP and Build a Fee-Only Book of $50M-$150M AUM', description: 'Financial Advisors / Wealth Managers split into commission-based (high churn, displacement risk from robo-advisors at Vanguard PAS, Schwab Intelligent Portfolios, Wealthfront, Betterment) and fee-only fiduciary (protected, premium). The CFP (Certified Financial Planner — $3K total, ~$700/year renewal) is the fiduciary-track credential. Build to $50M-$150M AUM under fee-only (1% AUM fee = $500K-$1.5M annual recurring revenue). At Merrill / Morgan Stanley / UBS Wealth a $100M AUM book earns the FA $300K-$600K total comp via production grid + bonuses.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Maintain Series 7 + 63 + 65/66 Licenses and Build Portability', description: 'Series 7 (General Securities Representative — $300) + Series 63 (state) + Series 65 or 66 (advisory) is the licensing core. Critically, AUM and book of business ARE portable when transitioning between firms (subject to protocol-of-broker-recruitment and non-solicit terms). If you\'re at Merrill / Morgan Stanley Smith Barney / UBS / Wells Fargo Advisors / Edward Jones, your book follows you to a competitor with a 100-200% upfront transition deal (1-2x trailing-12 production). Document your T12 (trailing 12-month production) — this is your portability number.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Transition From Mass-Affluent to UHNW Practice (Move Up-Market)', description: 'Mass-affluent advisors ($250K-$1M client portfolios) face acute robo-advisor pressure (Vanguard PAS, Schwab Intelligent Portfolios, Wealthfront) — AI substitution risk 25-40%. UHNW practice ($10M+ client portfolios) is relationship-driven and immune (AI sub risk 5-10%). Plan the up-market transition over 18-24 months: target $10M+ households, add CIMA or CPWA credentials, build estate/tax/trust expertise via partners. Top UHNW advisors at Goldman Marcus / Morgan Stanley PWM / UBS / Merrill earn $500K-$2M+ total comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '180 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  private_banker: pool(
    { title: 'Build a $250M+ UHNW Client Book with $5M+ Average Relationship', description: 'Private Bankers at UHNW practices (JPM Private Bank, Goldman Marcus / Goldman Private Wealth, Morgan Stanley Private Wealth Management, UBS Wealth, BNY Mellon Wealth, Bessemer Trust, Northern Trust) command $200K-$450K base + production override ($400K-$1.2M total comp). The credential is a documented $250M+ AUM book with $5M+ average relationship size — these clients require human-judgment investment policy statements, trust/estate planning, family-office services, and credit/lending across the balance sheet. Position your CV around assets-and-credit (lending against margin, art, securities) — that\'s the private-banking moat.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Develop Trust / Estate / Family-Office Cross-Sell Capability', description: 'Private bankers who personally orchestrate trust services (corporate trustee designation), estate planning (with external attorney/tax partners), and family-office services (governance, next-gen education, philanthropy planning) are essentially impossible to replicate. Build a 5-partner referral network: estate attorney, CPA, insurance fiduciary, art advisor, philanthropy consultant. Document cross-sell penetration. This skill set is the difference between $250K and $700K total comp.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Goldman PWM / Morgan Stanley PWM / JPM Private Bank Senior Slates', description: 'Senior private bankers at the top firms (Goldman PWM, Morgan Stanley PWM, JPM Private Bank, UBS Wealth) earn $450K-$1.5M total comp. Each firm runs continuous selective hiring funnels for established practitioners with $250M+ books. Apply via Hunt Scanlon Wealth Practice or direct referral within 30 days. Book portability under the Protocol for Broker Recruitment makes the transition viable.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  mortgage_originator: pool(
    { title: 'Build a Realtor Referral Network + Move From Refi to Purchase Mix', description: 'Mortgage Originators are the highest-displacement role in banking — Rocket Mortgage, SoFi, Better.com, and large-bank digital origination (Chase, Wells Fargo digital) have eaten 40-60% of routine refinance volume. Routine MLO comp has collapsed and remains under acute pressure (AI sub risk 55-65%). The protected segment is purchase-money origination tied to a realtor referral network. Build/document a slate of 8-12 realtors providing recurring purchase referrals (avg $400K-$600K loan size, 1% origination fee = $4K-$6K commission). Pivot the mix to 70%+ purchase. This is the only sustainable MLO practice in 2026.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in Jumbo / Construction / Non-QM Niche', description: 'Conforming-loan origination is fully commoditized. The protected niches are: (1) jumbo loans ($1M+ portfolios), (2) construction-to-perm (manual underwriting, relationship-heavy), (3) non-QM bank-statement / asset-depletion (self-employed borrowers, private clients). Pick one niche and become the local expert. Partner with private banking / wealth management groups for warm referrals. Niche origination can sustain $150K-$300K total comp where commodity origination collapses to $60K-$110K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '180 days', priority: 'Critical' },
    { title: 'Plan the Pivot — to Wealth Advisor, Private Banker, or Loan Officer Manager', description: 'Mortgage origination is shrinking by 5-10% annually. Plan an 18-month pivot to (a) wealth advisor / CFP track (mortgage relationships are warm-lead source), (b) private banking (high-net-worth originators are recruited), (c) Loan Officer Sales Manager (managing other originators, $130K-$220K base + override). Don\'t wait until volume collapses. Start the pivot NOW.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  branch_manager_bank: pool(
    { title: 'Pivot Off Branch Operations Track — Apply to Commercial RM / Private Banker / Wealth', description: 'Branch managers are in structural decline (digital banking displacement, branch consolidation at JPM Chase / BofA / Wells / Citi — each closing 100-300 branches annually). AI sub risk 30-45%. The single highest-leverage move is lateral pivot to Commercial RM ($135K-$225K), Private Banker ($200K-$450K), or Wealth Advisor (production grid) within the same bank — these roles are HIRING while branch is contracting. Apply internally within 30 days to 3 such roles. Most banks have explicit internal-mobility programs to redeploy branch talent.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical' },
    { title: 'Build a Documented Cross-Sell + Production Track Record', description: 'Branch managers who own deposit growth + cross-sell penetration (mortgage referrals, wealth referrals, business banking) at top-quartile metrics are the protected tier. Document: deposit growth rate, branch deposit base ($X00M), cross-sell ratio, wealth referral conversion. This track record is the credential to either advance to District / Market Manager ($150K-$240K) or pivot to the higher-value roles above.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    { title: 'Build NMLS + Series 6/7/63 to Cross-Qualify for Mortgage or Wealth Roles', description: 'Cross-qualification (NMLS for mortgage, Series 6/7/63 for wealth) is the foundation for internal pivots. Most banks pay for these licenses. Get the licenses NOW so internal job postings to Wealth Advisor / Mortgage Sales Manager are accessible. This single move unlocks 5-10x the internal opportunity set.', layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  // ─── Risk + Compliance (6) ──────────────────────────────────────────────────

  credit_risk_analyst: pool(
    { title: 'Specialize in Credit Model Development (CECL / IFRS9 / PD-LGD-EAD)', description: 'Credit Risk Analysts split into two tracks: (1) credit-monitoring/reporting (commoditized, AI sub risk 25-30%, salary stagnation), (2) credit-model development (CECL for US banks, IFRS9 international, PD/LGD/EAD parameter estimation, stress-loss modeling for CCAR/DFAST). Track 2 is protected and growing — Basel III/IV implementation and CCAR/DFAST stress testing are mandatory at all US large banks ($100B+). Move toward credit model development by year 18-24 months. Tools: SAS Risk, Moody\'s RiskFrontier, Python scikit-learn for in-house models. Target $130K-$210K base.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn FRM (GARP) and PRM (PRMIA) for Credential Stack', description: 'FRM (Financial Risk Manager from GARP — 2 levels, ~$1,800 total) is the most-recognized risk credential. PRM (Professional Risk Manager from PRMIA — 4 modules) is the depth alternative. CFA Level 2-3 adds the asset-side rigor. Hold FRM + CFA Level 3 combo and command $180K-$260K at the senior credit risk analyst / VP credit risk level. Schedule the next FRM exam window NOW — November or May.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to Senior Credit Risk Roles at Large Banks (JPM, BofA, Citi, GS)', description: 'Senior credit risk analysts / VPs at the large US banks (JPM, BofA, Citi, Goldman Sachs, Wells Fargo, Morgan Stanley) earn $175K-$275K base + bonus ($250K-$400K total). The roles are well-protected (Basel III/IV + CCAR mandate stays). Apply within 30 days to 3 confidential senior credit risk searches. Even the application is a leverage event.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  market_risk_analyst: pool(
    { title: 'Master FRTB Implementation + Internal Models Approach (IMA vs. SBA)', description: 'FRTB (Fundamental Review of the Trading Book) implementation is the highest-demand market risk specialty in 2026 — every G-SIB and major bank is in active build-out. Choose your specialization: Internal Models Approach (IMA — sophisticated, ES-based, deep quant) vs. Standardized Approach (SBA — sensitivities-based, more rules-based). IMA specialists at JPM / Goldman / Morgan Stanley / Citi / BofA earn $180K-$280K base + bonus. Build hands-on experience with RWA computation, P&L attribution test, NMRF (Non-Modellable Risk Factors). This is THE protected market risk niche.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Build VaR + ES + Stress-Testing Production Expertise', description: 'Market risk analysts who own production VaR (Value-at-Risk), Expected Shortfall, and CCAR stress-testing pipelines (Murex, Numerix, RiskMetrics, MSCI, internal Python/R) are essentially un-replaceable mid-cycle. Document: production model coverage, ownership of model documentation (SR 11-7 model risk standard), regulator presentation history (Fed, OCC, FDIC, FINRA, PRA). This portfolio piece is the credential for VP Market Risk at $200K-$300K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn FRM + Energy / Commodities Specialization for Hedge Fund Pivot', description: 'Senior market risk analysts pivot to (a) bank VP/SVP roles ($200K-$300K base), or (b) hedge fund / prop trading risk roles ($250K-$500K total comp with bonus). The hedge fund pivot requires FRM + commodity/equity/credit specialization. Build the niche around either energy/commodities trading risk, equity derivatives risk, or credit derivatives risk. Apply to Citadel / Millennium / DE Shaw / Two Sigma risk teams once the specialization is documented.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  operational_risk_manager: pool(
    { title: 'Lead a Major Operational Risk Program (Cyber, Third-Party, Resilience)', description: 'Operational Risk Managers split into (a) routine RCSA / KRI reporting (commoditized, AI sub risk 25-30%), and (b) program leadership in cyber operational risk, third-party / vendor risk, operational resilience (DORA in EU, FFIEC in US). Track b is protected and growing — every G-SIB is investing heavily post-2020 outages and cyber events. Move to program leadership within 12-18 months. Document: program scope, regulator engagement (Fed/OCC), board-level operational-risk reporting. Target $180K-$260K base + bonus.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn FRM + CISA + ORM Certification Combo', description: 'FRM (GARP) + CISA (ISACA, $760) + ORM/PRM (operational risk module) is the credential stack for senior operational risk. ORM specialists earn $200K-$320K at senior-VP level at large banks. The CISA in particular bridges to cyber operational risk — the highest-growth niche.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to Head of Operational Risk Searches at Mid-Cap Banks / Insurers', description: 'Head of Operational Risk at mid-cap banks ($50B-$250B asset banks like Citizens, KeyBank, Fifth Third, Regions) and large insurers (Travelers, Hartford, Liberty Mutual) is a $250K-$400K base + bonus role. Pipeline is thin — most are 50+. Apply via Hunt Scanlon Risk Practice and Russell Reynolds within 30 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  model_risk_validator: pool(
    { title: 'Build Deep SR 11-7 Implementation Track Record', description: 'SR 11-7 (Fed/OCC Model Risk Management guidance) is the most durable regulatory mandate in banking — Model Risk Validators are the most-protected risk role (AI sub risk 10-18%). With AI/ML model proliferation in banking, validation backlogs are 6-12 months at all G-SIBs. Build/document: (a) validation count by model type (credit PD/LGD, market VaR/ES, fraud detection, AML transaction monitoring, deposit attrition), (b) regulator-presentation history, (c) specific findings → remediation closure. Target $180K-$265K base + bonus at the senior model validator level.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Specialize in AI/ML Model Validation (XGBoost, Random Forest, LLMs)', description: 'AI/ML model adoption in banking is creating acute validation shortage — every G-SIB has a 50-200 model AI/ML validation backlog. Validators with hands-on Python + scikit-learn + interpretability (SHAP, LIME) + fairness (AIF360) + LLM-validation (RAG hallucination testing, prompt-injection adversarial) are essentially un-replaceable. Build the niche over 90 days. Target staff/senior model validator at $230K-$320K base + bonus.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Pivot to Model Validation Consulting at Big 4 / Boutique', description: 'PwC Model Risk Practice, EY Model Risk, Deloitte Model Risk, and boutiques (Crowe, Protiviti) hire senior model validators at $200K-$320K base + utilization bonus. The consulting pivot is a 2-3x hedge against single-bank exposure and accelerates the specialization across multiple banks\' model portfolios. Apply within 30 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  bsa_aml_specialist: pool(
    { title: 'Pivot From Routine Transaction Monitoring to Investigations / Tuning', description: 'BSA/AML routine work — alert clearing, false-positive triage, basic SAR drafting — is the most-automated compliance niche (AI sub risk 42-55%). Refinitiv, LexisNexis Bridger, ComplyAdvantage, Verafin, Actimize Essentials are eating routine. The protected segment: (a) complex investigations (SAR/CTR with multi-party structuring, trade-based ML, virtual currency), (b) model tuning + scenario design (calibrating Actimize / Mantas / SAS AML rules to reduce false-positive rate while maintaining recall), (c) BSA Officer track (program leadership). Move to track b or c within 12 months. Target $110K-$180K base.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn CAMS + CFE for Investigations / BSA Officer Track', description: 'CAMS (ACAMS Certified Anti-Money Laundering Specialist — $1,495) is the BSA/AML credential bar. CFE (Certified Fraud Examiner) adds investigations depth. Combined with hands-on experience in complex SAR drafting, narratives, and regulatory exam response (FFIEC BSA/AML manual section 8), positions for BSA Officer at $150K-$240K base at community/regional banks or Deputy BSA Officer at large banks.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to BSA Officer / Head of AML Roles at Community / Regional Banks', description: 'BSA Officer roles at community banks (under $10B assets) and regional banks ($10-50B) are structurally short — the role is mandatory under BSA, and pipeline is thin. Compensation: $130K-$220K base + bonus. Apply within 30 days to 3-5 BSA Officer searches via banking-specific recruiters (Cowan Partners, BAI executive search, Hunt Scanlon Bank).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  ofac_compliance_specialist: pool(
    { title: 'Master OFAC SDN List + Sanctions Screening + 50% Rule Analysis', description: 'OFAC Compliance Specialists who own end-to-end sanctions program — SDN List screening (Refinitiv World-Check, LexisNexis Bridger, Dow Jones Risk & Compliance), 50% Rule analysis (entities owned 50%+ by SDN parties), sectoral sanctions (SSI list — Russia/Iran/etc.), facilitation/causation analysis — are essentially un-replaceable. Geopolitical tension (Russia, Iran, China secondary sanctions) is driving record-pace sanctions issuance via OFAC. Build/document specific case work (entity resolutions, license applications, voluntary self-disclosures). Target $130K-$210K base.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn CGSS + CRCM and Build Regulator-Presentation Track Record', description: 'CGSS (Certified Global Sanctions Specialist from ACAMS — $1,295) is the sanctions credential bar. CRCM (Certified Regulatory Compliance Manager from ABA) adds breadth. Combined with documented regulator engagement (OFAC voluntary self-disclosures, Fed/OCC exam responses on sanctions), positions for Head of Sanctions / Director of Sanctions at large banks at $200K-$340K base + bonus.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to Head of Sanctions / Director Sanctions Roles at G-SIBs', description: 'Head of Sanctions at G-SIBs (JPM, BofA, Citi, GS, MS, Wells, HSBC, Standard Chartered, Deutsche, BNP, Santander) is a $275K-$500K base + bonus role. Geopolitical risk + record OFAC enforcement (BNP $8.9B fine, Standard Chartered $1.1B, etc.) makes sanctions program leadership a top-5 compliance role. Apply via Hunt Scanlon Compliance Practice and Korn Ferry within 30 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Corporate Finance / Treasury
  'fpa director': { canonicalKey: 'fpa_director', displayRole: 'FP&A Director' },
  'fp&a director': { canonicalKey: 'fpa_director', displayRole: 'FP&A Director' },
  'director financial planning analysis': { canonicalKey: 'fpa_director', displayRole: 'Director Financial Planning & Analysis' },
  'vp fpa': { canonicalKey: 'fpa_director', displayRole: 'VP FP&A' },
  'treasurer': { canonicalKey: 'treasurer', displayRole: 'Treasurer' },
  'corporate treasurer': { canonicalKey: 'treasurer', displayRole: 'Corporate Treasurer' },
  'vp treasury': { canonicalKey: 'treasurer', displayRole: 'VP Treasury' },
  'assistant treasurer': { canonicalKey: 'treasurer', displayRole: 'Assistant Treasurer' },
  'ir director': { canonicalKey: 'ir_director', displayRole: 'Investor Relations Director' },
  'investor relations director': { canonicalKey: 'ir_director', displayRole: 'Investor Relations Director' },
  'head of investor relations': { canonicalKey: 'ir_director', displayRole: 'Head of Investor Relations' },
  'vp investor relations': { canonicalKey: 'ir_director', displayRole: 'VP Investor Relations' },
  'deputy cfo': { canonicalKey: 'deputy_cfo', displayRole: 'Deputy CFO' },
  'deputy chief financial officer': { canonicalKey: 'deputy_cfo', displayRole: 'Deputy Chief Financial Officer' },
  'svp finance': { canonicalKey: 'deputy_cfo', displayRole: 'SVP Finance' },
  'evp finance': { canonicalKey: 'deputy_cfo', displayRole: 'EVP Finance' },
  'corporate development director': { canonicalKey: 'corporate_development_director', displayRole: 'Corporate Development Director' },
  'corp dev director': { canonicalKey: 'corporate_development_director', displayRole: 'Corp Dev Director' },
  'head of corporate development': { canonicalKey: 'corporate_development_director', displayRole: 'Head of Corporate Development' },
  'vp corp dev': { canonicalKey: 'corporate_development_director', displayRole: 'VP Corporate Development' },
  'controller strategic': { canonicalKey: 'controller_strategic', displayRole: 'Strategic Controller' },
  'strategic controller': { canonicalKey: 'controller_strategic', displayRole: 'Strategic Controller' },
  'chief accounting officer': { canonicalKey: 'controller_strategic', displayRole: 'Chief Accounting Officer' },
  'cao accounting': { canonicalKey: 'controller_strategic', displayRole: 'CAO (Chief Accounting Officer)' },
  'vp controllership': { canonicalKey: 'controller_strategic', displayRole: 'VP Controllership' },

  // Banking — Retail / Commercial
  'relationship manager commercial': { canonicalKey: 'relationship_manager_commercial', displayRole: 'Commercial Banking Relationship Manager' },
  'commercial banking rm': { canonicalKey: 'relationship_manager_commercial', displayRole: 'Commercial Banking RM' },
  'commercial rm': { canonicalKey: 'relationship_manager_commercial', displayRole: 'Commercial RM' },
  'c&i relationship manager': { canonicalKey: 'relationship_manager_commercial', displayRole: 'C&I Relationship Manager' },
  'commercial credit officer': { canonicalKey: 'commercial_credit_officer', displayRole: 'Commercial Credit Officer' },
  'credit officer': { canonicalKey: 'commercial_credit_officer', displayRole: 'Credit Officer' },
  'underwriter commercial': { canonicalKey: 'commercial_credit_officer', displayRole: 'Commercial Underwriter' },
  'chief credit officer': { canonicalKey: 'commercial_credit_officer', displayRole: 'Chief Credit Officer' },
  'wealth manager': { canonicalKey: 'wealth_manager_advisor', displayRole: 'Wealth Manager' },
  'financial advisor': { canonicalKey: 'wealth_manager_advisor', displayRole: 'Financial Advisor' },
  'financial planner': { canonicalKey: 'wealth_manager_advisor', displayRole: 'Financial Planner' },
  'wealth manager advisor': { canonicalKey: 'wealth_manager_advisor', displayRole: 'Wealth Manager / Financial Advisor' },
  'cfp advisor': { canonicalKey: 'wealth_manager_advisor', displayRole: 'CFP Advisor' },
  'private banker': { canonicalKey: 'private_banker', displayRole: 'Private Banker' },
  'private wealth advisor': { canonicalKey: 'private_banker', displayRole: 'Private Wealth Advisor' },
  'uhnw advisor': { canonicalKey: 'private_banker', displayRole: 'UHNW Advisor' },
  'mortgage originator': { canonicalKey: 'mortgage_originator', displayRole: 'Mortgage Originator' },
  'mortgage loan officer': { canonicalKey: 'mortgage_originator', displayRole: 'Mortgage Loan Officer' },
  'mlo': { canonicalKey: 'mortgage_originator', displayRole: 'MLO (Mortgage Loan Officer)' },
  'loan officer mortgage': { canonicalKey: 'mortgage_originator', displayRole: 'Loan Officer (Mortgage)' },
  'branch manager bank': { canonicalKey: 'branch_manager_bank', displayRole: 'Bank Branch Manager' },
  'bank branch manager': { canonicalKey: 'branch_manager_bank', displayRole: 'Bank Branch Manager' },
  'branch manager': { canonicalKey: 'branch_manager_bank', displayRole: 'Branch Manager' },
  'market manager retail': { canonicalKey: 'branch_manager_bank', displayRole: 'Retail Market Manager' },

  // Risk + Compliance
  'credit risk analyst': { canonicalKey: 'credit_risk_analyst', displayRole: 'Credit Risk Analyst' },
  'credit risk manager': { canonicalKey: 'credit_risk_analyst', displayRole: 'Credit Risk Manager' },
  'cecl analyst': { canonicalKey: 'credit_risk_analyst', displayRole: 'CECL / IFRS9 Analyst' },
  'market risk analyst': { canonicalKey: 'market_risk_analyst', displayRole: 'Market Risk Analyst' },
  'market risk manager': { canonicalKey: 'market_risk_analyst', displayRole: 'Market Risk Manager' },
  'var analyst': { canonicalKey: 'market_risk_analyst', displayRole: 'VaR / Market Risk Analyst' },
  'frtb specialist': { canonicalKey: 'market_risk_analyst', displayRole: 'FRTB Specialist' },
  'operational risk manager': { canonicalKey: 'operational_risk_manager', displayRole: 'Operational Risk Manager' },
  'op risk manager': { canonicalKey: 'operational_risk_manager', displayRole: 'Op Risk Manager' },
  'enterprise risk manager': { canonicalKey: 'operational_risk_manager', displayRole: 'Enterprise Risk Manager' },
  'orm analyst': { canonicalKey: 'operational_risk_manager', displayRole: 'ORM Analyst' },
  'model risk validator': { canonicalKey: 'model_risk_validator', displayRole: 'Model Risk Validator' },
  'model validator': { canonicalKey: 'model_risk_validator', displayRole: 'Model Validator' },
  'mrm analyst': { canonicalKey: 'model_risk_validator', displayRole: 'MRM Analyst' },
  'sr 11-7 specialist': { canonicalKey: 'model_risk_validator', displayRole: 'SR 11-7 Model Risk Specialist' },
  'bsa aml specialist': { canonicalKey: 'bsa_aml_specialist', displayRole: 'BSA/AML Specialist' },
  'aml analyst': { canonicalKey: 'bsa_aml_specialist', displayRole: 'AML Analyst' },
  'bsa officer': { canonicalKey: 'bsa_aml_specialist', displayRole: 'BSA Officer' },
  'aml investigator': { canonicalKey: 'bsa_aml_specialist', displayRole: 'AML Investigator' },
  'financial crimes analyst': { canonicalKey: 'bsa_aml_specialist', displayRole: 'Financial Crimes Analyst' },
  'ofac compliance specialist': { canonicalKey: 'ofac_compliance_specialist', displayRole: 'OFAC Compliance Specialist' },
  'sanctions analyst': { canonicalKey: 'ofac_compliance_specialist', displayRole: 'Sanctions Analyst' },
  'sanctions specialist': { canonicalKey: 'ofac_compliance_specialist', displayRole: 'Sanctions Specialist' },
  'head of sanctions': { canonicalKey: 'ofac_compliance_specialist', displayRole: 'Head of Sanctions' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK: Record<string, string> = {
  fpa_director: 'fpa_director',
  treasurer: 'treasurer',
  ir_director: 'ir_director',
  deputy_cfo: 'deputy_cfo',
  corporate_development_director: 'corporate_development_director',
  controller_strategic: 'controller_strategic',
  relationship_manager_commercial: 'relationship_manager_commercial',
  commercial_credit_officer: 'commercial_credit_officer',
  wealth_manager_advisor: 'wealth_manager_advisor',
  private_banker: 'private_banker',
  mortgage_originator: 'mortgage_originator',
  branch_manager_bank: 'branch_manager_bank',
  credit_risk_analyst: 'credit_risk_analyst',
  market_risk_analyst: 'market_risk_analyst',
  operational_risk_manager: 'operational_risk_manager',
  model_risk_validator: 'model_risk_validator',
  bsa_aml_specialist: 'bsa_aml_specialist',
  ofac_compliance_specialist: 'ofac_compliance_specialist',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  fpa_director:                    { roleKey: 'fpa_director',                    roleName: 'FP&A Director',                       demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 52, yoyJobOpeningsChange: 4,   topHiringLocations: ['New York NY', 'San Francisco CA', 'Chicago IL', 'Boston MA', 'Atlanta GA'],         aiSubstitutionRisk: 0.34, dataQuarter: '2026-Q1', calibrationNote: 'FP&A under acute AI/copilot pressure on routine variance + consolidation work; modern EPM owners protected. Base $185-275K + $50-100K bonus.' },
  treasurer:                       { roleKey: 'treasurer',                       roleName: 'Treasurer',                            demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 88, yoyJobOpeningsChange: 12,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Charlotte NC', 'Chicago IL', 'Dallas TX'],         aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Post-SVB demand acute for diversified banking + hedging programs. Mid-cap+ base $250-400K + bonus + equity = $375-650K total comp.' },
  ir_director:                     { roleKey: 'ir_director',                     roleName: 'Investor Relations Director',          demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 75, yoyJobOpeningsChange: 14,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Chicago IL', 'Austin TX'],            aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Public-co IR supply tight — every public co needs one. Base $200-325K + bonus + equity = $300-525K total comp.' },
  deputy_cfo:                      { roleKey: 'deputy_cfo',                      roleName: 'Deputy CFO',                           demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 110, yoyJobOpeningsChange: 16, topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Chicago IL', 'Charlotte NC'],         aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Public-co CFO succession demand acute (boomer retirement wave). Mid-cap+ base $325-525K + bonus + equity = $500K-$1.2M total.' },
  corporate_development_director:  { roleKey: 'corporate_development_director',  roleName: 'Corporate Development Director',       demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 85, yoyJobOpeningsChange: 18,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Chicago IL', 'Los Angeles CA'],        aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Corp Dev demand strong; F500 active M&A pipelines + PE-backed roll-ups driving hiring. Base $225-375K + bonus + equity = $325-650K total.' },
  controller_strategic:            { roleKey: 'controller_strategic',            roleName: 'Strategic Controller / CAO',           demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 80, yoyJobOpeningsChange: 10,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Chicago IL', 'Charlotte NC'],         aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Public-co CAO supply structurally tight; SOX 404 + technical accounting expertise scarce. Base $275-425K + bonus + equity = $400-700K total.' },
  relationship_manager_commercial: { roleKey: 'relationship_manager_commercial', roleName: 'Commercial Banking RM',                demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 48, yoyJobOpeningsChange: 4,   topHiringLocations: ['New York NY', 'Charlotte NC', 'Chicago IL', 'Dallas TX', 'Atlanta GA'],                aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Large-bank RMs with book of business protected; generalist RMs displaced by digital + fintech. Large-bank base $135-225K + bonus.' },
  commercial_credit_officer:       { roleKey: 'commercial_credit_officer',       roleName: 'Commercial Credit Officer',            demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 52, yoyJobOpeningsChange: 5,   topHiringLocations: ['New York NY', 'Charlotte NC', 'Chicago IL', 'Dallas TX', 'Atlanta GA'],                aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1', calibrationNote: 'Approving authorities protected; junior underwriters AI-pressured. Base $115-210K junior tier, $200-340K CCO.' },
  wealth_manager_advisor:          { roleKey: 'wealth_manager_advisor',          roleName: 'Financial Advisor / Wealth Manager',   demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 40, yoyJobOpeningsChange: 2,   topHiringLocations: ['New York NY', 'San Francisco CA', 'Chicago IL', 'Dallas TX', 'Atlanta GA'],            aiSubstitutionRisk: 0.32, dataQuarter: '2026-Q1', calibrationNote: 'Mass-affluent advisors under robo-pressure (sub risk 25-40%); UHNW practice immune (sub risk 5-10%). Base $80-225K + production grid commission (highly variable).' },
  private_banker:                  { roleKey: 'private_banker',                  roleName: 'Private Banker',                       demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 62, yoyJobOpeningsChange: 8,   topHiringLocations: ['New York NY', 'San Francisco CA', 'Palm Beach FL', 'Greenwich CT', 'Los Angeles CA'],   aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'UHNW practice (Goldman PWM, MS PWM, JPM Private Bank, UBS Wealth, BNY Mellon) relationship-driven and immune. Base $200-450K + production override.' },
  mortgage_originator:             { roleKey: 'mortgage_originator',             roleName: 'Mortgage Originator',                  demandIndex: 54, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 25, yoyJobOpeningsChange: -18, topHiringLocations: ['Dallas TX', 'Phoenix AZ', 'Atlanta GA', 'Charlotte NC', 'Tampa FL'],                  aiSubstitutionRisk: 0.60, dataQuarter: '2026-Q1', calibrationNote: 'Acute decline — Rocket/SoFi/Better.com displacing routine originators. Niche (jumbo/construction/non-QM) survives. Base $50-110K + commission (highly variable).' },
  branch_manager_bank:             { roleKey: 'branch_manager_bank',             roleName: 'Bank Branch Manager',                  demandIndex: 58, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable',  timeToFillDays: 32, yoyJobOpeningsChange: -10, topHiringLocations: ['Dallas TX', 'Charlotte NC', 'Atlanta GA', 'Phoenix AZ', 'Tampa FL'],                  aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1', calibrationNote: 'Branch consolidation accelerating at all top-5 banks; pivot to RM/wealth/private banker essential. Base $75-145K.' },
  credit_risk_analyst:             { roleKey: 'credit_risk_analyst',             roleName: 'Credit Risk Analyst',                  demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 55, yoyJobOpeningsChange: 12,  topHiringLocations: ['New York NY', 'Charlotte NC', 'San Francisco CA', 'Chicago IL', 'Dallas TX'],         aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1', calibrationNote: 'CECL/IFRS9 + CCAR/DFAST stress testing protected; reporting commoditized. Model dev sub-niche demand 90. Base $115-210K.' },
  market_risk_analyst:             { roleKey: 'market_risk_analyst',             roleName: 'Market Risk Analyst',                  demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 60, yoyJobOpeningsChange: 14,  topHiringLocations: ['New York NY', 'Chicago IL', 'San Francisco CA', 'London', 'Hong Kong'],                aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'FRTB implementation driving acute IMA-specialist demand at all G-SIBs. Base $130-245K.' },
  operational_risk_manager:        { roleKey: 'operational_risk_manager',        roleName: 'Operational Risk Manager',             demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 55, yoyJobOpeningsChange: 10,  topHiringLocations: ['New York NY', 'Charlotte NC', 'Chicago IL', 'Boston MA', 'Dallas TX'],                 aiSubstitutionRisk: 0.26, dataQuarter: '2026-Q1', calibrationNote: 'Cyber-op-risk + third-party + resilience (DORA/FFIEC) niches protected; routine RCSA commoditized. Base $145-260K.' },
  model_risk_validator:            { roleKey: 'model_risk_validator',            roleName: 'Model Risk Validator',                 demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 78, yoyJobOpeningsChange: 24,  topHiringLocations: ['New York NY', 'Charlotte NC', 'San Francisco CA', 'Chicago IL', 'Boston MA'],         aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'SR 11-7 mandate stays; AI/ML model boom + LLM validation creating 6-12mo backlogs at all G-SIBs. Base $145-265K.' },
  bsa_aml_specialist:              { roleKey: 'bsa_aml_specialist',              roleName: 'BSA/AML Specialist',                   demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 42, yoyJobOpeningsChange: 3,   topHiringLocations: ['New York NY', 'Charlotte NC', 'Miami FL', 'Tampa FL', 'Phoenix AZ'],                  aiSubstitutionRisk: 0.48, dataQuarter: '2026-Q1', calibrationNote: 'Routine alert-clearing under acute automation pressure (Refinitiv/Actimize/ComplyAdvantage). BSA Officer + complex investigations protected. Base $85-180K.' },
  ofac_compliance_specialist:      { roleKey: 'ofac_compliance_specialist',      roleName: 'OFAC Compliance Specialist',           demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 58, yoyJobOpeningsChange: 22,  topHiringLocations: ['New York NY', 'Washington DC', 'Charlotte NC', 'Miami FL', 'San Francisco CA'],       aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1', calibrationNote: 'Geopolitical-driven sanctions issuance (Russia, Iran, China secondary) creating acute specialist demand at G-SIBs. Base $130-210K, Head of Sanctions $275-500K.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK: Record<string, Record<string, number>> = {
  // Base USD only (bonus/equity captured in calibrationNote)
  fpa_director:                    { '0-2': 125_000, '2-5': 155_000, '5-10': 195_000, '10-15': 240_000, '15+': 275_000 },
  treasurer:                       { '0-2': 145_000, '2-5': 185_000, '5-10': 245_000, '10-15': 320_000, '15+': 395_000 },
  ir_director:                     { '0-2': 135_000, '2-5': 165_000, '5-10': 220_000, '10-15': 280_000, '15+': 325_000 },
  deputy_cfo:                      { '0-2': 195_000, '2-5': 250_000, '5-10': 335_000, '10-15': 435_000, '15+': 525_000 },
  corporate_development_director:  { '0-2': 145_000, '2-5': 185_000, '5-10': 245_000, '10-15': 315_000, '15+': 375_000 },
  controller_strategic:            { '0-2': 155_000, '2-5': 200_000, '5-10': 270_000, '10-15': 355_000, '15+': 425_000 },
  relationship_manager_commercial: { '0-2': 85_000,  '2-5': 115_000, '5-10': 155_000, '10-15': 195_000, '15+': 225_000 },
  commercial_credit_officer:       { '0-2': 80_000,  '2-5': 108_000, '5-10': 145_000, '10-15': 180_000, '15+': 210_000 },
  wealth_manager_advisor:          { '0-2': 65_000,  '2-5': 95_000,  '5-10': 140_000, '10-15': 185_000, '15+': 225_000 },
  private_banker:                  { '0-2': 145_000, '2-5': 190_000, '5-10': 260_000, '10-15': 350_000, '15+': 450_000 },
  mortgage_originator:             { '0-2': 50_000,  '2-5': 65_000,  '5-10': 82_000,  '10-15': 95_000,  '15+': 110_000 },
  branch_manager_bank:             { '0-2': 75_000,  '2-5': 92_000,  '5-10': 112_000, '10-15': 130_000, '15+': 145_000 },
  credit_risk_analyst:             { '0-2': 90_000,  '2-5': 118_000, '5-10': 150_000, '10-15': 185_000, '15+': 210_000 },
  market_risk_analyst:             { '0-2': 105_000, '2-5': 138_000, '5-10': 175_000, '10-15': 215_000, '15+': 245_000 },
  operational_risk_manager:        { '0-2': 100_000, '2-5': 135_000, '5-10': 175_000, '10-15': 220_000, '15+': 260_000 },
  model_risk_validator:            { '0-2': 110_000, '2-5': 145_000, '5-10': 185_000, '10-15': 230_000, '15+': 265_000 },
  bsa_aml_specialist:              { '0-2': 70_000,  '2-5': 92_000,  '5-10': 118_000, '10-15': 150_000, '15+': 180_000 },
  ofac_compliance_specialist:      { '0-2': 88_000,  '2-5': 115_000, '5-10': 148_000, '10-15': 180_000, '15+': 210_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_CORPORATE_FINANCE_BANKING_RISK: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  fpa_director: {
    strongOpener: 'I\'d like to discuss my compensation in the context of my P&L ownership and modern-EPM transformation work this year. I\'ve owned forecasting and variance analytics on $X revenue, led the Anaplan/Pigment/Workday Adaptive migration, and now own the Street-vs-internal forecast bridge for earnings.',
    leverageContext: 'FP&A Directors with modern EPM stack ownership are in 3:1 demand-to-supply ratio (Robert Half + Korn Ferry 2026 finance compensation surveys). Replacement cost: 5-7 months to find a director who can both own quarterly cycle AND operate Anaplan/Pigment. My Street-consensus accuracy this year has been within X% — a track record that directly impacts the CFO\'s board credibility.',
    countersScript: 'I\'m asking for base of $X (75th percentile per Robert Half 2026 Salary Guide), bonus target of Y% (vs. current Z%), and equity refresh of $W to align with deputy-CFO succession track peers. If full base adjustment isn\'t possible this cycle, I\'ll accept a meaningful equity refresh plus a documented review at 6 months.',
    walkAwayLine: 'I\'ve had inbound conversations from two PE-backed portfolio cos and one public-co VP FP&A search at meaningfully higher comp. I want to continue building here, but I need to see real movement to stay aligned with market.',
  },
  treasurer: {
    strongOpener: 'I want to align my compensation with the corporate treasurer market in 2026. After leading our post-SVB banking diversification (now 5 counterparties with X% reduction in concentration risk), implementing the FX hedging overlay (Y bps cost savings), and personally leading the $XB debt issuance on the Goldman/JPM syndicate, I\'m operating at the public-co treasurer level.',
    leverageContext: 'Mid-cap+ corporate treasurers with capital-markets issuance experience are in acute shortage — AFP Treasury Compensation Benchmark 2026 shows median at $X base + $Y bonus + equity. My documented work this year directly impacts our cost of capital, working capital, and counterparty risk posture. Replacement cost: 6-9 months for a qualified successor.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile mid-cap treasurer per AFP 2026), bonus target of Y%, and equity refresh of $Z to align with Deputy CFO succession path peers. If full base adjustment isn\'t feasible, an equity refresh plus a 6-month documented review is acceptable.',
    walkAwayLine: 'I have an inbound conversation with a mid-cap public co for a VP Treasury role at substantially higher comp + equity. I\'d prefer to continue the post-SVB program here, but the gap needs to close.',
  },
  ir_director: {
    strongOpener: 'I\'d like to discuss my compensation in the context of my board exposure, investor-day leadership, and sell-side analyst relationships. I personally manage relationships with X analysts at Goldman/JPM/Morgan Stanley/BofA, I led the last investor day, and our Street-consensus accuracy has been within Y%.',
    leverageContext: 'Public-co IR Directors are in 2:1 demand-to-supply per NIRI 2026 compensation survey. Replacement cost: 4-6 months minimum, plus the period of weaker Street relationships during onboarding. The conference circuit relationships (Goldman Communacopia, JPM Technology + Healthcare conferences) are personal to me and accrue to next employer if I leave.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile per NIRI 2026), bonus target of Y%, and equity grant of $Z to align with public-co peers. Conference participation, NIRI annual membership, and IRC certification continuation should be employer-funded.',
    walkAwayLine: 'I have approaches from two public-co Head of IR searches via Korn Ferry. I\'ve enjoyed building the Street relationships here — but the gap to market is meaningful, and I need to see movement.',
  },
  deputy_cfo: {
    strongOpener: 'I want to discuss my comp package in the context of public-co CFO succession peers. This year I\'ve led the sale process / SOX 404 program / major debt issuance, signed sub-certifications to the CFO each quarter, and personally own the audit committee relationship. I\'m at the public-co CFO-ready level.',
    leverageContext: 'Per IANS / Korn Ferry CFO Compensation Benchmark 2026, Deputy CFOs at mid-cap public companies on the succession ladder earn base $X + bonus $Y + equity $Z. My specific track record — clean PCAOB inspection, zero significant deficiencies, $X.XB transaction leadership — puts me at the 75th percentile of pipeline candidates. Replacement cost: 9-12 months and a major disruption to succession planning.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile mid-cap Deputy CFO), bonus target of Y%, retention RSU grant of $W vesting over 4 years, and an explicit documented succession timeline (CFO promotion within 18-24 months on agreed metrics).',
    walkAwayLine: 'I have two confidential public-co CFO searches in process via Korn Ferry / Heidrick & Struggles at meaningfully higher base + equity. I\'d prefer to continue here on a clear succession path — but the path needs to be documented and the comp gap needs to close.',
  },
  corporate_development_director: {
    strongOpener: 'I\'d like to align my compensation with the senior corp dev market in 2026 — particularly given the $XB strategic acquisition I led this year (end-to-end: banker engagement, board memos, definitive negotiation, HSR/antitrust workstream, integration handoff).',
    leverageContext: 'Senior corp dev professionals with large-strategic-M&A leadership (vs. pure bolt-on) are in 3:1 demand ratio per Spencer Stuart Corp Dev Compensation Survey 2026. My personal banker relationship slate (Goldman/Morgan Stanley/JPM/Centerview/Evercore senior MDs) is portable and represents proprietary deal flow. Replacement cost: 6-9 months and a stalled deal pipeline.',
    countersScript: 'I\'m asking for base of $X (matches Head of Corp Dev 75th percentile), bonus target of Y%, deal carry / transaction bonus on closed deals (1-3% of advisor fee budget), and equity refresh of $Z to align with Chief Strategy Officer succession peers.',
    walkAwayLine: 'I have approaches from two PE-backed portfolio companies for Head of Corp Dev / EVP Strategy at substantially higher base + carry. The deal pipeline here has been excellent — I want to continue, but the comp gap to market is meaningful.',
  },
  controller_strategic: {
    strongOpener: 'I want to discuss my compensation in the context of my SOX 404 program ownership, technical accounting leadership, and external-auditor relationship. This year I personally signed sub-certifications, led the ASC 842 / ASC 606 / CECL implementation, and our PCAOB inspection record remains clean.',
    leverageContext: 'Strategic Controllers / CAOs at public companies with the credential stack (CPA + SOX 404 ownership + clean PCAOB record) are on the CFO succession ladder and command base $275-425K + bonus + equity = $400-700K total comp per Korn Ferry CFO Benchmark 2026. Replacement cost: 6-9 months minimum and elevated audit risk during transition.',
    countersScript: 'I\'m asking for base of $X (75th percentile public-co CAO), bonus target of Y%, retention equity grant of $W, and explicit succession-pipeline language to Deputy CFO within 18-24 months.',
    walkAwayLine: 'I have a confidential public-co CAO search in process via Korn Ferry at meaningfully higher base + equity. I want to continue the SOX program here on a clear succession path — but the comp and the path need to close to market.',
  },
  relationship_manager_commercial: {
    strongOpener: 'I want to discuss my compensation in the context of my book of business and cross-sell performance. I currently manage $XM in C&I loans with Y% cross-sell penetration, generating $Z in non-credit revenue. This book is portable under standard non-solicit terms.',
    leverageContext: 'Commercial Banking RMs with $200M+ books and 60%+ cross-sell penetration are recruited by all large banks (JPM Chase, BofA, Wells Fargo, US Bank, PNC, Truist) with 1.5-2x trailing-12 production transition deals. My specific industry vertical (healthcare / tech / manufacturing / CRE) is in acute hiring at competitors. Replacement cost to the bank: 12-18 months to rebuild the book.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile per RMA Compensation Survey 2026), bonus target of Y% of book revenue, and explicit credit-authority delegation increase to $Z to remove deal-cycle friction. Industry conference budget (BAI, RMA, industry verticals) should be employer-funded.',
    walkAwayLine: 'I have a transition offer from [competitor large bank] including a 1.5x T12 upfront. I want to stay — but the comp here needs to align with the market for my book size and cross-sell performance.',
  },
  wealth_manager_advisor: {
    strongOpener: 'I want to align my comp with my Series 7 book of business and production track record. My current AUM is $X under fee-only / fee-based, with T12 production of $Y. My CFP credential and fiduciary practice mix protect this book from robo-advisor displacement.',
    leverageContext: 'Per Cerulli Advisor Comp Study 2026, advisors with $50M+ AUM and CFP earn $X-$Y base + production grid. AUM is portable under Protocol for Broker Recruitment to Merrill / Morgan Stanley Smith Barney / UBS / Wells Fargo Advisors with 100-200% upfront transition deals (1-2x T12). My specific UHNW / fee-only segment commands the highest grid tier.',
    countersScript: 'I\'m asking for grid payout of X% on production (vs. current Y%), retention bonus of $Z over 4 years, and full-time client-service associate (CSA) dedicated to my book. Also need explicit fee-only platform support if firm currently restricts.',
    walkAwayLine: 'I have transition offers from [Merrill / Morgan Stanley / UBS / boutique RIA] including upfront deals of 150-200% of T12. The platform here has been good — but the economics for my book need to align with what competitors are offering.',
  },
  private_banker: {
    strongOpener: 'I\'d like to discuss my compensation in the context of my UHNW book and the production override. My book is $XM AUM across Y households with $Z average relationship, plus $W in lending commitments (margin, securities-backed, art lending). I\'ve closed N trust/estate relationships this year.',
    leverageContext: 'Senior private bankers with $250M+ UHNW books are recruited at Goldman PWM, Morgan Stanley PWM, JPM Private Bank, UBS Wealth, BNY Mellon Wealth with 1.5-2.5x T12 deals. UHNW book is highly portable under Protocol. My specific cross-sell mix (lending + trust + family office services) is hard to replicate. Replacement cost: 18-24 months to rebuild relationships of this size and complexity.',
    countersScript: 'I\'m asking for base of $X (matches private-bank 75th percentile), production override of Y%, retention grant of $Z over 4 years, and dedicated CSA + lending-officer pairing for my book.',
    walkAwayLine: 'I have confidential conversations with Goldman PWM and JPM Private Bank including upfront deals at 200% of T12. I\'d prefer to continue the platform work here — but the comp must align with the market for $XM UHNW books.',
  },
  model_risk_validator: {
    strongOpener: 'I want to align my compensation with the SR 11-7 model validation market in 2026. With the AI/ML model validation backlog at our institution, my specialty (credit PD/LGD validation + AI/ML interpretability + LLM hallucination testing) is essentially un-substitutable, and the regulatory mandate makes this role permanent.',
    leverageContext: 'Per GARP / PRMIA 2026 risk compensation surveys, senior model risk validators with AI/ML specialization earn base $X + bonus, total $Y. Validation backlogs at all G-SIBs (JPM/BofA/Citi/Goldman/Wells/Morgan Stanley) are 6-12 months, driving acute hiring. Replacement cost: 6-9 months for a qualified specialist, plus regulatory exposure during the gap.',
    countersScript: 'I\'m asking for base of $X (75th percentile per GARP 2026), bonus target of Y%, FRM + CFA renewal funded by employer, conference budget for GARP Annual / PRMIA Annual, and protected time for AI/ML / LLM validation research.',
    walkAwayLine: 'I have an inbound from PwC Model Risk Practice / EY Model Risk and one G-SIB senior validator opening at $X above current. The work here has built deep expertise — I want to continue but need market-rate comp.',
  },
  market_risk_analyst: {
    strongOpener: 'I\'d like to discuss my comp in the context of FRTB implementation and my Internal Models Approach (IMA) specialization. My specific work on RWA computation, P&L attribution test, NMRF classification, and ES-based capital is in acute demand at all G-SIBs.',
    leverageContext: 'Per GARP 2026 risk comp survey, senior market risk analysts with FRTB IMA specialization earn $X-$Y base + bonus. JPM / Goldman / Morgan Stanley / Citi / BofA all have active FRTB build-out and competing for IMA specialists. My specific track record (production VaR/ES ownership, regulator presentations) is portable.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile per GARP 2026), bonus target of Y%, FRM continuation funded, GARP/PRMIA conference budget, and explicit promotion path to VP Market Risk in 12-18 months.',
    walkAwayLine: 'I have approaches from two G-SIBs for senior market risk roles at meaningfully higher base + bonus. I\'ve enjoyed the FRTB work here — but the gap to market is meaningful.',
  },
  credit_risk_analyst: {
    strongOpener: 'I want to align my comp with the credit risk model development market in 2026. With CECL implementation discipline + CCAR/DFAST stress testing model ownership and my FRM credential, I\'m operating at the senior credit risk analyst level commanding $X+ in the market.',
    leverageContext: 'Senior credit risk analysts with model development (not just reporting) are protected from AI substitution and commanding 15-25% YoY salary growth per GARP 2026. My specific work (PD/LGD/EAD parameter estimation, stress-loss models, regulator engagement) is hard to replicate. JPM / BofA / Citi / Goldman / Wells / Morgan Stanley all hiring at $175-275K base.',
    countersScript: 'I\'m asking for base of $X (75th percentile per GARP 2026), bonus target of Y%, FRM + CFA renewal funded, conference budget for GARP / PRMIA Annual, and explicit promotion path to VP Credit Risk in 12-18 months.',
    walkAwayLine: 'I have an inbound from [G-SIB] for a senior credit risk role at $X above current. I\'d prefer to continue the CECL work here — but the gap needs to close.',
  },
  operational_risk_manager: {
    strongOpener: 'I\'d like to discuss my compensation in the context of my operational risk program leadership — specifically cyber operational risk, third-party / vendor risk, and operational resilience (DORA/FFIEC) work this year.',
    leverageContext: 'Per GARP / RMA 2026 compensation surveys, operational risk managers with cyber-op-risk + resilience program leadership earn $X-$Y base + bonus. All G-SIBs and large insurers (Travelers, Hartford, Liberty Mutual) are actively hiring at this level. My specific regulator engagement (Fed / OCC / state insurance regulators) and board-level reporting track record is portable.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile per GARP 2026), bonus target of Y%, FRM + CISA renewal funded, ORM/PRM module budget, and conference attendance at GARP Annual + Operational Risk Conference.',
    walkAwayLine: 'I have approaches from two mid-cap banks for Head of Operational Risk at significantly higher base + bonus. I want to continue building the program here — but the comp needs to align with market.',
  },
  ofac_compliance_specialist: {
    strongOpener: 'I want to align my comp with the sanctions compliance market in 2026. Geopolitical-driven sanctions issuance (Russia, Iran, China secondary sanctions) is creating acute specialist demand, and my specific OFAC + EU + UK + Asia sanctions expertise — including 50% Rule analysis, sectoral sanctions, and voluntary self-disclosure preparation — is essentially un-substitutable.',
    leverageContext: 'Per Hunt Scanlon Compliance Practice 2026 survey, senior OFAC compliance specialists at G-SIBs earn $X-$Y base + bonus. Head of Sanctions / Director Sanctions roles at JPM / BofA / Citi / Goldman / HSBC / Standard Chartered / Deutsche / BNP / Santander pay $275-500K base + bonus. My specific track record (regulator engagement, voluntary self-disclosure outcomes) is portable.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile per Hunt Scanlon 2026), bonus target of Y%, CGSS + CRCM continuation funded, ACAMS conference budget, and explicit promotion path to Director Sanctions / Head of Sanctions in 12-18 months.',
    walkAwayLine: 'I have an inbound from [G-SIB Head of Sanctions search] at meaningfully higher base + bonus. The work here has been important — but the comp gap to market is meaningful, especially given the geopolitical risk premium.',
  },
};
