// investment_banking_pe_vc_actions.ts — v38.0 Phase 2C
// 18 Investment Banking / Private Equity / Venture Capital roles — relationship-driven,
// deal-execution-driven, judgment-driven; very low AI substitution risk (0.04-0.10).
// IB analyst pipeline is hyper-competitive (78-82 demand, 90+ supply); PE/VC principal+
// levels show acute scarcity (88-94 demand) due to limited fund seats and carry economics.

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

const A_FIN_NETWORKING: BracketPool = pool(
  { title: 'Cultivate 3 Tier-1 Finance Recruiters Within 14 Days', description: 'CPI (Capstone Partners), Glocap, SearchOne, and Selby Jennings dominate IB associate-to-VP lateral placements; Heidrick & Struggles and Russell Reynolds own MD/Partner searches; Amity Search and Henkel Search Partners control PE associate hiring out of 2-year banking programs. Send a tight 200-word intro with deal sheet attached. Even passive registration with 2 of these firms generates 4-8 outbound calls per quarter when comparable seats open. Re-engage every 90 days even when not actively looking.', layerFocus: 'L4 · Network', riskReductionPct: 18, deadline: '14 days', priority: 'High' },
  { title: 'Build a Curated Deal Sheet PDF (3 Live + 5 Closed Deals)', description: 'A 2-page deal sheet (live mandates with anonymized identifiers, closed deals with size/role/your specific contribution) is the single most-requested artifact in lateral IB/PE recruiting. Include EV, sector, financing structure, your specific contribution (model build vs. CIM authoring vs. management presentation). Update quarterly. PE recruiters at Glocap and Amity will not move a candidate without this artifact.', layerFocus: 'L3 · Reputation', riskReductionPct: 22, deadline: '21 days', priority: 'High' },
  { title: 'Maintain Active Pipeline With 2 Headhunter Firms + 1 Mentor MD', description: 'At senior levels (VP+, principal+), the recruiting market is fully relationship-mediated. Heidrick & Struggles, Russell Reynolds, Spencer Stuart, and Korn Ferry control 80%+ of MD/partner-level moves. A standing quarterly coffee with one MD-level mentor inside a bulge bracket or top PE firm is the single highest-yield career capital investment. The mentor relationship typically delivers 1-2 inbound MD-level approaches per year.', layerFocus: 'L4 · Network', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
  { title: 'Refresh Your LinkedIn With Specific Sector + Product Tags', description: 'Recruiters at Glocap, Selby Jennings, and CPI search LinkedIn by very specific tags: "leveraged finance," "TMT M&A," "growth equity healthcare," "secondaries," "sponsor coverage." Add every product/sector you have executed in. Add "Open to opportunities" private signal so external recruiters can ping you. Single update typically triples inbound recruiter outreach within 21 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 14, deadline: '5 days', priority: 'Medium' },
  { title: 'Attend 1 Sector Conference Per Quarter for Deal-Sourcing Visibility', description: 'Goldman Sachs TMT Conference, JPMorgan Healthcare Conference, RBC Capital Markets Industrials, SuperReturn (PE), NVCA Summit (VC), Milken Conference — these are where senior bankers and PE/VC partners assess junior talent in real time. A 5-minute hallway introduction at SuperReturn often converts to a coffee meeting and a recruiting touch within 60 days. Budget $3-8K/year.', layerFocus: 'L4 · Network', riskReductionPct: 12, deadline: '90 days', priority: 'Medium' },
);

// ── ACTION_DB_INVESTMENT_BANKING_PE_VC ───────────────────────────────────────

export const ACTION_DB_INVESTMENT_BANKING_PE_VC: Record<string, BracketPool> = {

  ib_analyst: pool(
    { title: 'Lock In a PE Recruiting Track Within 90 Days of Start Date', description: 'PE on-cycle recruiting kicks off 6-9 months into the analyst program. The window closes fast — by month 9, top buyside seats at Blackstone, KKR, Apollo, Carlyle, TPG, Bain Capital, Warburg Pincus, Advent are filled. Register with Henkel Search, Amity, CPI, SG Partners, Ratio Advisors, and Oxbridge within 90 days of starting. Submit deal sheet by month 5. Practice LBO modeling daily — Wall Street Prep + Training The Street + 50 practice cases.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Lateral to a Better Bank or Stronger Group Within 18 Months', description: 'Analyst-to-analyst lateral moves are the single fastest path to upgrade your bank tier (e.g., middle market → Evercore/Centerview, regional → Goldman/Morgan Stanley) and accelerate buyside exits. Best window: 12-18 months in. Use SearchOne, CPI, and Glocap for IB lateral. Target Evercore M&A, Centerview, Moelis, PJT Partners, Lazard — elite boutiques out-pay bulge brackets and have stronger PE placement rates.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Optimize Year-2 Performance Ranking + Bonus', description: 'Top-bucket analysts (top 25-33%) receive 40-60% bonus premium over average + first pick of buyside recruiting referrals. Drivers: own a deal end-to-end, build the strongest staffing relationships with VPs/MDs, become the go-to modeler for the group. Document specific contributions (deals worked, EV, your role) for the ranking conversation. This single performance arc compounds over 5+ years of compensation.', layerFocus: 'L1 · Performance', riskReductionPct: 28, deadline: '180 days', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  ib_associate_ma: pool(
    { title: 'Negotiate Specific Sector Coverage (TMT, Healthcare, FIG) by Year 1', description: 'Generalist associates have weaker PE/corp-dev exits than sector specialists. Negotiate placement into TMT, healthcare, FIG, or consumer/retail M&A within the first 12 months as associate. Sector specialization 2x your buyside recruiting yield because PE funds increasingly hire by vertical (Vista/Thoma Bravo = software, Bain Cap healthcare team, Apollo industrials). Frame the request around groups you have shown affinity for in deal staffing.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Build VP Sponsor Relationships at 3 Firms (Internal + 2 External)', description: 'Associate-to-VP transition is gated by the "sponsor" relationship — a senior VP/D who fights for your promotion. Cultivate 1 strong internal sponsor through repeated late-night execution + 2 external VP relationships at competitors (Evercore, Centerview, Moelis, PJT, Lazard, Houlihan Lokey). The external relationships generate lateral offers when promotion timing slips — a credible $50K-$150K compensation lever every cycle.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn CFA L2 or Pursue Executive MBA Track for VP Optionality', description: 'CFA Level 2 ($1,200 + ~300 study hours) signals analytical rigor for buyside exits. For corp-dev/strategy pivots, a part-time MBA at Wharton/Booth/Columbia ($150-225K, 2-year evening or executive) unlocks operator/CFO tracks. Both create optionality at the VP decision point (year 3-4) when partnership-track vs. PE vs. corp-dev becomes the fork.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  ib_vp_ma: pool(
    { title: 'Originate 3+ Sole-Authored Pitches to MD-Level Promotion Track', description: 'VP-to-Director/ED promotion is gated by demonstrated origination — pitch decks you authored end-to-end that converted to live mandates. Document 3+ pitches where you led the analytical work and pitch process. The conversion to MD typically requires 1-2 sole-originated mandates as VP. Without origination evidence, you stall at VP indefinitely; the MD-track conversation cannot start.', layerFocus: 'L1 · Performance', riskReductionPct: 36, deadline: '180 days', priority: 'Critical' },
    { title: 'Develop 5 Industry Client Relationships Independent of Your MD', description: 'VPs who own client relationships independent of their MD are promotion-track candidates; VPs who execute MD-sourced deals are replaceable. Cultivate 5 director/CFO-level relationships at 5 mid-cap companies in your sector through deal post-mortems, sector reports, quarterly check-ins. These relationships become the "book" you carry to a competitor for a Director/ED offer at $400K+ base.', layerFocus: 'L4 · Network', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Engage Heidrick & Russell Reynolds for Director/ED Lateral Optionality', description: 'At the VP-to-Director transition, executive search firms (Heidrick & Struggles, Russell Reynolds, Spencer Stuart, Korn Ferry) control the lateral market. Even if you intend to stay, a documented Director offer from a competitor (Lazard, Houlihan Lokey, Jefferies, Moelis) at $350-425K base is the strongest possible promotion-cycle leverage. Initiate conversations 6 months before your firm\'s promotion cycle.', layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  ib_director_ma: pool(
    { title: 'Convert 2+ Repeat Client Mandates Into MD Promotion Evidence', description: 'Director/ED-to-MD promotion requires demonstrated revenue ownership — typically $15-25M+ in fees over 2 years from clients you sourced or independently re-mandated. Document your origination ledger: pitches led, mandates won, fees generated, client retention. The MD partnership-track conversation is fundamentally about replacing fee revenue if you leave; without your own ledger, the conversation does not happen.', layerFocus: 'L1 · Performance', riskReductionPct: 38, deadline: '12 months', priority: 'Critical' },
    { title: 'Build a Discrete Sector Franchise (Top-3 Banker in Your Sub-Sector)', description: 'MDs at Goldman, Morgan Stanley, JPMorgan, BofA, Evercore, and Centerview are sector franchise owners — "the cybersecurity M&A banker," "the medical device coverage MD." Pick a sub-sector (vertical SaaS, MedTech consumables, BPO services), publish a quarterly sector update, attend the 2-3 dominant conferences, and become known as the top-3 banker by 25+ company CFOs/CEOs. This is the moat that protects MD-level compensation through downturns.', layerFocus: 'L3 · Reputation', riskReductionPct: 34, deadline: '18 months', priority: 'Critical' },
    { title: 'Build Optionality With PE Operating Partner / Corp Dev Head Tracks', description: 'Director/ED level is the optimal pivot window to PE operating partner ($500K-1.5M total comp + carry) or F500 Corp Dev Head ($400-700K + equity). PE firms (Blackstone, KKR, Apollo, Bain Capital) hire bankers at this exact level into portfolio operating roles. Engage Glocap, Henkel, and Heidrick for these pivots. The pivot is far harder post-MD because comp expectations diverge.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  ib_md_ma: pool(
    { title: 'Document Your Annual Fee Production Ledger for Comp Cycle Leverage', description: 'MD compensation is a direct function of personally attributed fee production. Maintain a quarterly ledger: deals closed, fee attribution (origination vs. execution credit), repeat-client revenue, cross-sell to ECM/DCM/leveraged finance. At year-end comp conversation, the ledger is the entire negotiation. Without it, your guarantee/bonus discussion is determined by your group head\'s memory and politics.', layerFocus: 'L1 · Performance', riskReductionPct: 38, deadline: '30 days', priority: 'Critical' },
    { title: 'Cultivate a Heidrick or Russell Reynolds Standing Relationship', description: 'MD lateral moves (bulge bracket → boutique, BB → BB, or BB → PE-sponsored advisory) are 100% search-firm mediated. Heidrick & Struggles, Russell Reynolds, Spencer Stuart, and Korn Ferry maintain a continuous quiet market for MD seats. A standing relationship — quarterly call, candid market intelligence, occasional referral — is what generates a credible alternative offer when your guarantee year ends. Without it, you negotiate your year-end from a position of zero alternatives.', layerFocus: 'L4 · Network', riskReductionPct: 36, deadline: '30 days', priority: 'Critical' },
    { title: 'Build PE Senior Advisor / Board Seat Optionality', description: 'MDs with 15+ years of sector expertise can negotiate PE senior advisor roles ($150-400K retainer + carry tail) and 1-2 public board seats ($200-400K cash + equity per board). Each seat is a portable income stream uncorrelated to your firm\'s comp cycle. This is the ultimate MD-level hedge: 2 boards + 1 senior advisor role = $700K-1.2M of income that survives any firm departure.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '12 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  ecm_banker: pool(
    { title: 'Pursue Series 79 + 63 + SIE; Pivot to Equity Derivatives or Convertibles', description: 'Pure IPO/follow-on ECM is highly cyclical — 2022 and 2023 ECM volumes were down 65-75% from 2021. Pivot to equity derivatives, convertible bonds, or block trading desk to broaden product. Series 79 + 63 + SIE are mandatory; advanced product knowledge (Greeks, ASR mechanics, accelerated bookbuild) differentiates from generalist ECM coverage and protects through ECM volume downturns.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Build Mutual Fund / Hedge Fund Buy-Side Coverage Relationships', description: 'ECM bankers who own buy-side relationships (Fidelity, T. Rowe Price, Wellington, Capital Group, top long-only hedge funds) are 2-3x more valuable than execution-only ECMs. Build a portable allocation book — 20+ named PMs you can reach for IPO allocations and follow-on demand. This portable book is what makes you lateral-able to a competitor at $50-150K premium.', layerFocus: 'L4 · Network', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Cross-Product Origination With M&A and Leveraged Finance', description: 'ECM specialists who cross-sell into M&A, leveraged finance, and PE-sponsor coverage are dramatically more valuable than pure ECM. Build standing relationships with M&A coverage MDs and sponsor coverage to participate in IPO mandates for PE exits and dual-track sales. Joint origination credit on PE-exit IPOs is the highest-margin ECM revenue.', layerFocus: 'L1 · Performance', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  dcm_banker: pool(
    { title: 'Specialize in Leveraged Finance or High-Grade Corporate Bonds', description: 'Generalist DCM is being commoditized by syndicate desks; the survivors specialize in either (a) leveraged finance / private credit origination, or (b) investment-grade structured products (hybrid capital, perpetuals, sustainability-linked notes). Pick a specialty within 24 months. Top leveraged finance shops (JPMorgan LevFin, BofA LevFin, Credit Suisse/UBS LevFin) pay 25-40% premium to vanilla DCM.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop Private Credit Fund Relationships (Ares, Blackstone, Apollo)', description: 'Private credit is the highest-growth segment in fixed income — Ares, Blackstone Credit, Apollo Credit, Golub, Antares, Owl Rock are deploying $1.5T+ in private debt. DCM bankers who own these LP relationships pivot directly into private credit funds at $300-500K base + carry. Initiate 5 standing PM relationships within 12 months.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Earn CFA L2 + Series 79 / 63 for Senior DCM Track', description: 'CFA L2 demonstrates the credit analysis depth that distinguishes senior DCM from rates/swaps execution. Combined with Series 79/63/SIE, this opens senior origination roles at $300-450K base. Self-study path: Schweser + 300 hours over 6 months. The CFA charter (L3 complete) further unlocks credit research / fund management exits.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  leveraged_finance_banker: pool(
    { title: 'Build Direct Sponsor Coverage Relationships With 5 Top PE Firms', description: 'LevFin bankers who own sponsor relationships (Blackstone, KKR, Apollo, Carlyle, TPG, Bain Capital, Warburg, Advent, Vista, Thoma Bravo) at the principal/MD level are the most-recruited specialty in IB. JPMorgan LevFin, BofA LevFin, Credit Suisse/UBS Lev, Goldman LevFin, and Jefferies LevFin compete fiercely for sponsor-relationship bankers. A relationship at 5 top sponsors = $100-200K lateral premium.', layerFocus: 'L4 · Network', riskReductionPct: 36, deadline: '12 months', priority: 'Critical' },
    { title: 'Pivot to Direct Lending / Private Credit Fund at Principal Level', description: 'Senior LevFin bankers (VP/D) pivot directly into Ares, Blackstone Credit, Apollo Hybrid Value, Golub, Antares, Owl Rock, Sixth Street, Bain Capital Credit at $400-700K base + carry. Private credit fund seats out-pay bank LevFin by 30-50% in good years and carry compounding upside. Engage Glocap, Henkel, and Selby Jennings for principal-level credit fund moves.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Master CLO + Direct Lending Structures for Senior Specialization', description: 'Senior LevFin bankers who deeply understand CLO mechanics (warehousing, ramp-up, equity tranches) and direct lending (unitranche, SLP, second lien) command 25-40% premium over generalists. Self-study path: Moody\'s CLO research + S&P direct lending reports + 5 closed deal post-mortems with senior MDs. The structural expertise is what distinguishes principal-track from execution-level LevFin.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  restructuring_banker: pool(
    { title: 'Earn CFA L3 + Build a Cyclical Deal Pipeline for Downturn Premium', description: 'Restructuring is counter-cyclical — Houlihan Lokey, Lazard, Moelis, PJT Partners, Evercore Restructuring, and Rothschild dominate this market and pay 20-40% premium during downturns. CFA L3 plus closed restructuring engagements (DIP financing, 363 sales, Chapter 11 advisory) is the credential bar. Restructuring bankers are the only IB sub-sector that prospers during recessions — your downturn hedge is built-in.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Develop Creditor-Side and Debtor-Side Mandate Optionality', description: 'Top restructuring MDs work both sides — debtor advisory and creditor (bondholder/lender) advisory. Build creditor-side relationships with the top distressed funds (Elliott, Oaktree, Centerbridge, Silver Point, Anchorage, GSO/Blackstone Credit). The dual-side capability is what distinguishes principal-track restructuring from execution-level.', layerFocus: 'L4 · Network', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Distressed Fund Pivot Track', description: 'Senior restructuring bankers (VP/D) pivot directly into Elliott Management, Oaktree, Centerbridge, Silver Point, Mudrick, Anchorage at $400-650K base + carry. Distressed fund seats out-pay bank restructuring at the principal level and provide the strongest possible recession-period income hedge. Engage Glocap and Amity for distressed buyside moves.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  fig_banker: pool(
    { title: 'Build Insurance + Specialty Finance Dual Coverage', description: 'FIG is fragmented — banks, insurance, asset management, fintech, specialty finance. The highest-growth sub-sectors are insurance (M&A + alternative reinsurance) and specialty finance (BDCs, mortgage REITs, consumer credit platforms). Senior FIG bankers who dual-cover insurance + specialty finance are 2-3x more valuable than bank-only coverage as bank M&A has structurally slowed. Build 5 CFO-level relationships in each sub-sector.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Pivot to Strategic / Corp Dev at a Large Insurer or Specialty Lender', description: 'FIG bankers at the VP/D level pivot to Corp Dev / Strategy at AIG, MetLife, Prudential, Travelers, Hartford, or specialty lenders (Apollo / Athene, KKR / Global Atlantic, Brookfield / American Equity) at $300-500K base + bonus + equity. The transition typically requires 2-3 closed insurance M&A deals as the credibility bar.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop a Repeat-Client Franchise With 3 Anchor Insurance Companies', description: 'FIG MDs are valuable to the extent they hold the lead-banker relationship at 2-3 anchor insurance clients. Cultivate the CFO + Head of Strategy at 3 mid-cap insurers, deliver quarterly strategic updates (capital deployment options, M&A landscape), and become the default first call for M&A or capital raise mandates. This is the franchise-level moat.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '18 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  pe_associate: pool(
    { title: 'Lock In a Principal-Track Promotion or Transition to Operating Role by Year 3', description: 'PE Associate is a 2-3 year terminal position at most funds — the up-or-out filter to Vice President / Principal is fierce. Top firms (Blackstone, KKR, Apollo, Carlyle, TPG, Bain Capital, Warburg, Advent, Vista, Thoma Bravo, Silver Lake) promote ~30-50% of associates. By month 18, have the explicit promotion-track conversation with your deal team senior. If not on track, pivot to (a) growth equity, (b) portfolio company operating role, (c) MBA + return to PE post-MBA, or (d) corp dev. Do not wait until year 3.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '6 months', priority: 'Critical' },
    { title: 'Lead 2+ Deal Sourcing or Diligence Work-Streams Independently', description: 'PE associates who lead deal sourcing or LBO modeling independently are principal-track; associates who execute partner-sourced deals are replaceable. Document 2+ deals where you led origination outreach (sourcing CIM, outreach to management, IC memo authorship) and 2+ where you led the buy-side diligence work-streams (commercial DD coordination, financial DD review, accounting DD review). This portfolio is the explicit IC-presentation credential.', layerFocus: 'L1 · Performance', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Earn CFA L2 or Pursue Top-3 MBA for Post-Associate Optionality', description: 'For associates not on the direct principal track, MBA at Harvard/Stanford/Wharton/Booth/Columbia is the standard re-entry path back to PE at the VP level ($300-450K base + bonus + carry). HBS/GSB acceptance is the gold standard. Submit applications during associate year 2 for matriculation in year 3. Total cost ~$250K but pays back in 18-24 months at the VP level.', layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  pe_principal: pool(
    { title: 'Build a Direct Sourcing Track Record (2+ Owned Deals to IC)', description: 'Principal-to-Partner promotion is gated by demonstrated deal sourcing — investments you originated independently of the firm\'s established sponsor relationships. Document 2+ deals where you led origination from cold outreach through close. PE partner economics (full carry participation) require this evidence; without it, you stall at principal indefinitely. Engage CFO + CEO networks in your sector for direct sourcing.', layerFocus: 'L1 · Performance', riskReductionPct: 36, deadline: '12 months', priority: 'Critical' },
    { title: 'Secure Carry Participation on 3+ Funds for Compensation Trajectory', description: 'Principal compensation is increasingly back-loaded into carry. By year 3 as principal, you should have carry allocations on 3+ active funds + the current fund. Track your share of each fund\'s carry pool and the projected exit timing. If the carry trajectory is below partner-level economics, this is the leverage point for a lateral move to a competitor offering full partner-track carry.', layerFocus: 'L5 · Negotiation', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Cultivate LP Relationships for Future Fundraising Optionality', description: 'Senior principals who can credibly raise their own fund or lead next-fund fundraising have dramatically more compensation leverage and exit optionality. Build standing relationships with 10+ institutional LPs (CalPERS, CalSTRS, OTPP, GIC, Temasek, Abu Dhabi Investment Authority, top university endowments). These relationships also enable independent sponsor / sole-GP fund launches.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '18 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  pe_partner: pool(
    { title: 'Negotiate Specific Carry Points + GP Commitment for Next Fund', description: 'PE Partner compensation is dominated by carry economics — base + bonus are typically <30% of total comp at $1B+ funds. At each fund close, the negotiation is: specific carry points (typical partner = 50-200 bps of 20% carry), GP commitment dollars (typical partner = $1-5M), and management company equity if applicable. These terms compound across 2-3 fund vintages and determine your $20-100M+ career carry economics.', layerFocus: 'L5 · Negotiation', riskReductionPct: 38, deadline: '90 days — pre-fund-close', priority: 'Critical' },
    { title: 'Build a Personal Franchise / Vertical Within the Firm', description: 'Partners with a discrete franchise (the "healthcare partner," the "industrials partner," the "tech partner") carry far more compensation leverage and survive fund cycles. Without a discrete franchise, partners are replaceable mid-cycle. Document your franchise: deals attributed, portfolio companies under your active board oversight, sector relationships, sourcing channels. The franchise is your moat.', layerFocus: 'L3 · Reputation', riskReductionPct: 34, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Spinout / Independent Sponsor Optionality', description: 'Senior PE partners increasingly spin out to form independent sponsors or new funds. Build optionality: 10+ standing LP relationships, 2-3 portfolio CEOs willing to anchor a spinout, an attorney relationship (Kirkland & Ellis, Simpson Thacher, Paul Weiss) on retainer for spinout structuring. Even if you stay, the spinout option is the strongest possible compensation leverage in the partner negotiation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  growth_equity_principal: pool(
    { title: 'Build Anchor CEO/Founder Relationships in 2 Verticals', description: 'Growth equity (General Atlantic, Insight Partners, TA Associates, Summit Partners, JMI Equity, Bain Capital Ventures, Goldman Growth) is sourcing-driven. Senior principals build standing relationships with 50+ founders and 20+ CEOs in 2 verticals to generate proprietary deal flow. Without owned sourcing channels, growth equity principals are replaceable by junior associates.', layerFocus: 'L4 · Network', riskReductionPct: 34, deadline: '12 months', priority: 'Critical' },
    { title: 'Lead 2+ Growth Investments to IC Approval Independently', description: 'Growth equity principal-to-partner promotion requires 2+ investments led independently (sourcing, diligence, IC presentation, board oversight post-close). Document each investment: sourcing channel, diligence work-streams, IC memo authorship, ARR growth post-investment, board role. This is the partner-track credential — without it, you stall at principal indefinitely.', layerFocus: 'L1 · Performance', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Crossover Optionality With Late-Stage VC and Public-Equity Crossover Funds', description: 'Late-stage growth crosses over with VC (Sequoia Growth, A16Z Growth, Lightspeed Growth) and public-equity crossover funds (Coatue, Tiger Global, D1 Capital, Whale Rock). Senior growth principals laterally move across this category at $400-700K base + carry. Engage Glocap, Henkel, and Amity for crossover roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  vc_associate: pool(
    { title: 'Build a Public Founder-Facing Investor Brand Within 18 Months', description: 'VC associates without public founder-facing brand are invisible to top founders and stall at the associate level. Publish 1 substantive piece per month (sector deep-dive, market map, infrastructure investment thesis) on Substack/Twitter. Top funds (Sequoia, A16Z, Benchmark, Founders Fund, Index, Accel, Lightspeed, GV, Bessemer) increasingly hire principals based on inbound founder pull. The brand also creates VC associate-to-partner promotion track evidence.', layerFocus: 'L3 · Reputation', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Source 2+ Investments Independently for Promotion Track', description: 'VC associate-to-principal promotion is gated by demonstrated independent sourcing — investments you sourced (typically via founder relationship or cold outreach) that the partnership funded. Most VC associates source zero qualified deals in their 2-3 year tenure. 2+ sourced deals puts you in the top 10% of VC associates and is the explicit promotion credential.', layerFocus: 'L1 · Performance', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Operator Optionality for Post-Associate Pivot', description: 'VC associate-to-operator pivots (PM/BD/COS at a portfolio company) are increasingly the second-best path when partnership promotion is unclear. The portfolio operating role typically pays $200-350K base + equity that can compound to $1-5M over 3-5 years and creates the founder/operator credentials for return to VC at the partner level. Engage your portfolio company CEOs proactively.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  vc_principal: pool(
    { title: 'Lead 3+ Investments to IC With Sole Sourcing + Sole Sponsorship', description: 'VC principal-to-partner promotion requires 3+ investments where you (a) sourced the deal independently, (b) sponsored the IC presentation, and (c) own the board seat. Without this evidence, partners cannot defend your carry allocation in the next-fund discussion. Top funds (Sequoia, A16Z, Benchmark, Founders Fund) explicitly track sourced-and-led deal counts as the partner-track metric.', layerFocus: 'L1 · Performance', riskReductionPct: 36, deadline: '12 months', priority: 'Critical' },
    { title: 'Negotiate Carry Allocation on Next Fund + GP Commit', description: 'At the principal-to-partner transition, the negotiation is: specific carry points on the next fund, GP commitment requirement (typical partner $1-3M), and partnership equity. Engage independent counsel (Cooley, Gunderson, Goodwin Procter) to review the LP agreement before signing. The carry economics determine your $5-30M career upside on next 2 fund vintages — this is not a casual negotiation.', layerFocus: 'L5 · Negotiation', riskReductionPct: 34, deadline: '60 days', priority: 'Critical' },
    { title: 'Build Spinout / Solo-GP Optionality for Lateral Leverage', description: 'Senior VC principals are increasingly spinning out as solo-GPs (Founders Fund alumni, Sequoia alumni, A16Z alumni). Build optionality: 10+ standing LP relationships, 2-3 anchor founders who would back your fund, an attorney relationship for fund formation. Even if you stay, solo-GP optionality is the strongest possible leverage in partner-track negotiation.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  vc_partner: pool(
    { title: 'Negotiate Next-Fund Carry Points + GP Commit Like It Is the Last Negotiation', description: 'VC partner economics compound across 2-3 fund vintages and create $10-200M+ lifetime carry outcomes. At each fund close, negotiate: carry points (typical partner 50-200 bps of 20-30% carry), GP commitment ($1-5M for top partners), management company equity, vesting / cliff terms, departure economics. Engage independent counsel separately from the firm. The terms set at fund-close determine the rest of your career economics.', layerFocus: 'L5 · Negotiation', riskReductionPct: 38, deadline: '90 days — pre-fund-close', priority: 'Critical' },
    { title: 'Build a Public Brand at the Partner Level (Podcast, Newsletter, Conference)', description: 'Top VC partners (Marc Andreessen, Brian Singerman, Bill Gurley, Mike Maples, Fred Wilson) operate as media properties — podcast hosts, newsletter authors, conference speakers. The public brand creates founder pull at the firm level, drives next-fund LP demand, and creates spinout optionality. Invest 4-8 hours/week in your public brand. This is the highest-ROI activity for senior VC partners after sourcing.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Solo-GP / Spinout Fund Optionality', description: 'Senior VC partners (especially at megafunds) increasingly spin out to launch solo-GP funds with $50-300M of LP commitments anchored by the partner\'s personal track record. Build solo-GP optionality: 10+ anchor LPs, audited track record, 2-3 anchor founder commitments. Even if you stay at your current firm, spinout optionality is the strongest possible leverage in next-fund negotiations.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),

  secondaries_principal: pool(
    { title: 'Build LP Network at Top 30 Institutional LP-Side Sellers', description: 'Secondaries (Ardian, Lexington / Franklin, HarbourVest, Coller, Goldman PEG Secondaries, Blackstone Strategic Partners, AlpInvest) is fundamentally an information-asymmetry business — knowing which LP wants liquidity 6 months before the sale. Build standing relationships with 30+ LP CIOs at pension funds, sovereign wealth funds, university endowments, and family offices. This LP network is the moat.', layerFocus: 'L4 · Network', riskReductionPct: 34, deadline: '12 months', priority: 'Critical' },
    { title: 'Specialize in GP-Led Secondaries (Continuation Funds, Tender Offers)', description: 'GP-led secondaries (continuation vehicles, tender offers, single-asset secondaries) is the highest-growth segment within secondaries — 60%+ of secondaries volume by 2026. Senior principals who lead continuation vehicle transactions are dramatically more valuable than LP-side specialists. Lead 2+ continuation fund transactions for partner-track promotion evidence.', layerFocus: 'L1 · Performance', riskReductionPct: 32, deadline: '18 months', priority: 'Critical' },
    { title: 'Negotiate Carry Allocation + Build Spinout Optionality', description: 'Secondaries partner economics rival traditional buyout partner economics ($5-50M lifetime carry on top funds). At principal-to-partner transition, negotiate specific carry points + GP commit. Top firms (Ardian, Lexington, HarbourVest, Coller) compete fiercely for proven secondaries talent — engage Glocap, Amity, and Henkel for lateral pricing benchmarks 6 months before any partner-track discussion.', layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    A_FIN_NETWORKING.senior.high[0], A_FIN_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_INVESTMENT_BANKING_PE_VC: Record<string, { canonicalKey: string; displayRole: string }> = {
  'investment banking analyst': { canonicalKey: 'ib_analyst', displayRole: 'Investment Banking Analyst' },
  'ib analyst': { canonicalKey: 'ib_analyst', displayRole: 'IB Analyst' },
  'first year analyst': { canonicalKey: 'ib_analyst', displayRole: 'First-Year Investment Banking Analyst' },
  'banking analyst': { canonicalKey: 'ib_analyst', displayRole: 'Investment Banking Analyst' },
  'm&a analyst': { canonicalKey: 'ib_analyst', displayRole: 'M&A Analyst' },
  'investment banking associate': { canonicalKey: 'ib_associate_ma', displayRole: 'Investment Banking Associate' },
  'ib associate': { canonicalKey: 'ib_associate_ma', displayRole: 'IB Associate' },
  'm&a associate': { canonicalKey: 'ib_associate_ma', displayRole: 'M&A Associate' },
  'investment banking vp': { canonicalKey: 'ib_vp_ma', displayRole: 'Investment Banking Vice President' },
  'ib vp': { canonicalKey: 'ib_vp_ma', displayRole: 'IB VP' },
  'vice president investment banking': { canonicalKey: 'ib_vp_ma', displayRole: 'VP, Investment Banking' },
  'm&a vp': { canonicalKey: 'ib_vp_ma', displayRole: 'M&A Vice President' },
  'investment banking director': { canonicalKey: 'ib_director_ma', displayRole: 'Investment Banking Director' },
  'ib director': { canonicalKey: 'ib_director_ma', displayRole: 'IB Director' },
  'executive director investment banking': { canonicalKey: 'ib_director_ma', displayRole: 'Executive Director, Investment Banking' },
  'm&a director': { canonicalKey: 'ib_director_ma', displayRole: 'M&A Director' },
  'investment banking managing director': { canonicalKey: 'ib_md_ma', displayRole: 'Investment Banking Managing Director' },
  'ib md': { canonicalKey: 'ib_md_ma', displayRole: 'IB Managing Director' },
  'managing director m&a': { canonicalKey: 'ib_md_ma', displayRole: 'Managing Director, M&A' },
  'm&a md': { canonicalKey: 'ib_md_ma', displayRole: 'M&A Managing Director' },
  'ecm banker': { canonicalKey: 'ecm_banker', displayRole: 'Equity Capital Markets Banker' },
  'equity capital markets': { canonicalKey: 'ecm_banker', displayRole: 'ECM Banker' },
  'ecm associate': { canonicalKey: 'ecm_banker', displayRole: 'ECM Associate' },
  'ipo banker': { canonicalKey: 'ecm_banker', displayRole: 'IPO Banker' },
  'dcm banker': { canonicalKey: 'dcm_banker', displayRole: 'Debt Capital Markets Banker' },
  'debt capital markets': { canonicalKey: 'dcm_banker', displayRole: 'DCM Banker' },
  'dcm associate': { canonicalKey: 'dcm_banker', displayRole: 'DCM Associate' },
  'bond banker': { canonicalKey: 'dcm_banker', displayRole: 'Bond Banker' },
  'leveraged finance banker': { canonicalKey: 'leveraged_finance_banker', displayRole: 'Leveraged Finance Banker' },
  'levfin banker': { canonicalKey: 'leveraged_finance_banker', displayRole: 'LevFin Banker' },
  'leveraged finance associate': { canonicalKey: 'leveraged_finance_banker', displayRole: 'Leveraged Finance Associate' },
  'sponsor coverage banker': { canonicalKey: 'leveraged_finance_banker', displayRole: 'Sponsor Coverage Banker' },
  'restructuring banker': { canonicalKey: 'restructuring_banker', displayRole: 'Restructuring Banker' },
  'restructuring associate': { canonicalKey: 'restructuring_banker', displayRole: 'Restructuring Associate' },
  'distressed advisory': { canonicalKey: 'restructuring_banker', displayRole: 'Distressed Advisory Banker' },
  'chapter 11 advisor': { canonicalKey: 'restructuring_banker', displayRole: 'Chapter 11 Advisor' },
  'fig banker': { canonicalKey: 'fig_banker', displayRole: 'FIG Banker' },
  'financial institutions group banker': { canonicalKey: 'fig_banker', displayRole: 'Financial Institutions Group Banker' },
  'fig associate': { canonicalKey: 'fig_banker', displayRole: 'FIG Associate' },
  'insurance m&a banker': { canonicalKey: 'fig_banker', displayRole: 'Insurance M&A Banker' },
  'pe associate': { canonicalKey: 'pe_associate', displayRole: 'Private Equity Associate' },
  'private equity associate': { canonicalKey: 'pe_associate', displayRole: 'Private Equity Associate' },
  'buyout associate': { canonicalKey: 'pe_associate', displayRole: 'Buyout Associate' },
  'lbo associate': { canonicalKey: 'pe_associate', displayRole: 'LBO Associate' },
  'pe principal': { canonicalKey: 'pe_principal', displayRole: 'Private Equity Principal' },
  'private equity principal': { canonicalKey: 'pe_principal', displayRole: 'Private Equity Principal' },
  'pe vice president': { canonicalKey: 'pe_principal', displayRole: 'Private Equity VP' },
  'pe vp': { canonicalKey: 'pe_principal', displayRole: 'Private Equity VP' },
  'pe partner': { canonicalKey: 'pe_partner', displayRole: 'Private Equity Partner' },
  'private equity partner': { canonicalKey: 'pe_partner', displayRole: 'Private Equity Partner' },
  'private equity managing director': { canonicalKey: 'pe_partner', displayRole: 'Private Equity Managing Director' },
  'pe md': { canonicalKey: 'pe_partner', displayRole: 'Private Equity Managing Director' },
  'growth equity principal': { canonicalKey: 'growth_equity_principal', displayRole: 'Growth Equity Principal' },
  'growth equity vp': { canonicalKey: 'growth_equity_principal', displayRole: 'Growth Equity Vice President' },
  'growth investor': { canonicalKey: 'growth_equity_principal', displayRole: 'Growth Equity Investor' },
  'late stage investor': { canonicalKey: 'growth_equity_principal', displayRole: 'Late-Stage Growth Investor' },
  'vc associate': { canonicalKey: 'vc_associate', displayRole: 'Venture Capital Associate' },
  'venture capital associate': { canonicalKey: 'vc_associate', displayRole: 'Venture Capital Associate' },
  'venture associate': { canonicalKey: 'vc_associate', displayRole: 'Venture Associate' },
  'vc analyst': { canonicalKey: 'vc_associate', displayRole: 'Venture Capital Analyst' },
  'vc principal': { canonicalKey: 'vc_principal', displayRole: 'Venture Capital Principal' },
  'venture capital principal': { canonicalKey: 'vc_principal', displayRole: 'Venture Capital Principal' },
  'vc vp': { canonicalKey: 'vc_principal', displayRole: 'Venture Capital Vice President' },
  'venture principal': { canonicalKey: 'vc_principal', displayRole: 'Venture Principal' },
  'vc partner': { canonicalKey: 'vc_partner', displayRole: 'Venture Capital Partner' },
  'venture capital partner': { canonicalKey: 'vc_partner', displayRole: 'Venture Capital Partner' },
  'general partner': { canonicalKey: 'vc_partner', displayRole: 'Venture Capital General Partner' },
  'gp venture': { canonicalKey: 'vc_partner', displayRole: 'Venture General Partner' },
  'secondaries principal': { canonicalKey: 'secondaries_principal', displayRole: 'Secondaries Principal' },
  'private equity secondaries': { canonicalKey: 'secondaries_principal', displayRole: 'Private Equity Secondaries Principal' },
  'secondaries investor': { canonicalKey: 'secondaries_principal', displayRole: 'Secondaries Investor' },
  'continuation fund principal': { canonicalKey: 'secondaries_principal', displayRole: 'Continuation Fund Principal' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_INVESTMENT_BANKING_PE_VC: Record<string, string> = {
  ib_analyst: 'ib_analyst',
  ib_associate_ma: 'ib_associate_ma',
  ib_vp_ma: 'ib_vp_ma',
  ib_director_ma: 'ib_director_ma',
  ib_md_ma: 'ib_md_ma',
  ecm_banker: 'ecm_banker',
  dcm_banker: 'dcm_banker',
  leveraged_finance_banker: 'leveraged_finance_banker',
  restructuring_banker: 'restructuring_banker',
  fig_banker: 'fig_banker',
  pe_associate: 'pe_associate',
  pe_principal: 'pe_principal',
  pe_partner: 'pe_partner',
  growth_equity_principal: 'growth_equity_principal',
  vc_associate: 'vc_associate',
  vc_principal: 'vc_principal',
  vc_partner: 'vc_partner',
  secondaries_principal: 'secondaries_principal',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_INVESTMENT_BANKING_PE_VC: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  ib_analyst:              { roleKey: 'ib_analyst',              roleName: 'Investment Banking Analyst',           demandIndex: 80, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 30,  yoyJobOpeningsChange: 4,   topHiringLocations: ['New York NY', 'San Francisco CA', 'Charlotte NC', 'Chicago IL', 'London'],                aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'IB analyst PIPELINE is hyper-competitive: 80 demand vs 95+ supply ratio. M&A volumes recovering 2026 but bulge bracket headcount discipline persists. Career velocity = top-bucket ranking + PE on-cycle within 9 months.' },
  ib_associate_ma:         { roleKey: 'ib_associate_ma',         roleName: 'M&A Associate',                        demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 55,  yoyJobOpeningsChange: 12,  topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Hong Kong', 'Chicago IL'],                  aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'M&A associate demand recovering — sponsor activity + cross-border up YoY. Sector-specialized associates 2x more recruited than generalists.' },
  ib_vp_ma:                { roleKey: 'ib_vp_ma',                roleName: 'M&A Vice President',                   demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 85,  yoyJobOpeningsChange: 16,  topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Hong Kong'],                                  aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'VP-level demand strong; replacement cost 6+ months. Elite boutiques (Centerview, PJT, Moelis) competing aggressively with bulge brackets.' },
  ib_director_ma:          { roleKey: 'ib_director_ma',          roleName: 'M&A Director / Executive Director',    demandIndex: 80, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 6,   topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Hong Kong'],                                  aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Director/ED seats limited but PE-portfolio operating partner pivots create steady lateral flow.' },
  ib_md_ma:                { roleKey: 'ib_md_ma',                roleName: 'M&A Managing Director',                demandIndex: 75, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 160, yoyJobOpeningsChange: 3,   topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Hong Kong'],                                  aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'MD-level openings rare; market is fully relationship-mediated via Heidrick/Russell Reynolds. Search-firm openings 6-12 months on average.' },
  ecm_banker:              { roleKey: 'ecm_banker',              roleName: 'Equity Capital Markets Banker',        demandIndex: 70, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65,  yoyJobOpeningsChange: 22,  topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Hong Kong'],                                  aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'IPO market recovery driving acute ECM rehiring after 2022-23 layoffs. Equity derivatives and convertibles especially short-staffed.' },
  dcm_banker:              { roleKey: 'dcm_banker',              roleName: 'Debt Capital Markets Banker',          demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 50,  yoyJobOpeningsChange: 5,   topHiringLocations: ['New York NY', 'London', 'Hong Kong', 'Charlotte NC'],                                       aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'DCM generalist commoditizing; private credit pivots increasingly common. Investment grade origination steady.' },
  leveraged_finance_banker:{ roleKey: 'leveraged_finance_banker',roleName: 'Leveraged Finance Banker',             demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 70,  yoyJobOpeningsChange: 24,  topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Chicago IL'],                                  aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'LevFin acutely short — PE sponsor activity + private credit growth driving aggressive hiring at JPMorgan/BofA/CS-UBS/Goldman.' },
  restructuring_banker:    { roleKey: 'restructuring_banker',    roleName: 'Restructuring Banker',                 demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 75,  yoyJobOpeningsChange: 28,  topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'London'],                                    aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Restructuring counter-cyclical and currently extreme demand — defaults rising, distressed pipeline at Houlihan/Lazard/PJT/Moelis acutely staffed.' },
  fig_banker:              { roleKey: 'fig_banker',              roleName: 'Financial Institutions Group Banker',  demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 60,  yoyJobOpeningsChange: 7,   topHiringLocations: ['New York NY', 'Charlotte NC', 'London', 'San Francisco CA'],                                aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'Bank M&A slowed; insurance + specialty finance sub-sectors growing. Dual-coverage FIG bankers in shortage.' },
  pe_associate:            { roleKey: 'pe_associate',            roleName: 'Private Equity Associate',             demandIndex: 82, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 50,  yoyJobOpeningsChange: 6,   topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Chicago IL', 'London'],                  aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'PE associate on-cycle remains extreme competition; top-30 PE firms hire ~250 associates/year vs. 5000+ qualified IB applicants.' },
  pe_principal:            { roleKey: 'pe_principal',            roleName: 'Private Equity Principal',             demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 14,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'London', 'Hong Kong'],                    aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'PE principal+ acutely scarce; promotion track narrow + spinout activity creating turnover at megafunds.' },
  pe_partner:              { roleKey: 'pe_partner',              roleName: 'Private Equity Partner',               demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 180, yoyJobOpeningsChange: 10,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'London'],                                  aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'PE partner seats extremely rare; market is essentially zero-supply with negotiated lateral comp typically 50-200 bps carry + $1-5M GP commit.' },
  growth_equity_principal: { roleKey: 'growth_equity_principal', roleName: 'Growth Equity Principal',              demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95,  yoyJobOpeningsChange: 18,  topHiringLocations: ['San Francisco CA', 'New York NY', 'Boston MA', 'Austin TX', 'London'],                    aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Growth equity (Insight, General Atlantic, TA, Summit, Bain Cap Ventures) actively expanding; crossover funds also recruiting senior talent.' },
  vc_associate:            { roleKey: 'vc_associate',            roleName: 'Venture Capital Associate',            demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 45,  yoyJobOpeningsChange: 2,   topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Boston MA', 'London'],                    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'VC associate market stable; megafund expansion balanced by 2022-23 retrenchment. Top funds hire 30-50 associates/year vs 8000+ qualified applicants.' },
  vc_principal:            { roleKey: 'vc_principal',            roleName: 'Venture Capital Principal',            demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 100, yoyJobOpeningsChange: 16,  topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Boston MA'],                                aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'VC principal scarce; sourced-and-led track record is the explicit bar. Solo-GP spinouts also creating senior turnover.' },
  vc_partner:              { roleKey: 'vc_partner',              roleName: 'Venture Capital Partner',              demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 200, yoyJobOpeningsChange: 8,   topHiringLocations: ['San Francisco CA', 'New York NY', 'Boston MA', 'London'],                                  aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'VC partner seats negotiated 1:1; market is fully relationship-mediated. Solo-GP spinouts ($50-300M anchored funds) increasingly the path.' },
  secondaries_principal:   { roleKey: 'secondaries_principal',   roleName: 'Secondaries Principal',                demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 30,  topHiringLocations: ['New York NY', 'San Francisco CA', 'London', 'Paris'],                                       aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'Secondaries acutely understaffed — GP-led / continuation vehicle volume up 60%+ YoY. Ardian/Lexington/HarbourVest/Coller/Blackstone Strategic Partners hiring aggressively.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────
// NOTE: All figures are 2026 US BASE SALARY ONLY (carry/bonus excluded).
// Total comp materially exceeds base — see calibrationNote on each demand entry
// and the brief calibration table below:
//   ib_analyst:        base $115-145K  +  bonus $80-110K        = $195-255K total
//   ib_associate_ma:   base $200-275K  +  bonus $150-275K       = $350-550K total
//   ib_vp_ma:          base $325-425K  +  bonus $250-475K       = $575-900K total
//   ib_md_ma:          base $500-700K  +  bonus $500K-$2.5M     = $1-3M+ total
//   pe_associate:      base $185-225K  +  bonus $100-200K + carry tail $0-50K = $285-475K total
//   pe_principal:      base $300-450K  +  bonus $250-650K + carry $200K-$1M   = $750K-$2M total
//   pe_partner:        base $500-900K  +  bonus $500K-$3M + carry $1-15M+     = highly variable
//   vc_associate:      base $135-225K  +  bonus $30-100K        = $165-325K total
//   vc_partner:        base $400-750K  +  variable carry economics

export const COMPENSATION_ADDITIONS_INVESTMENT_BANKING_PE_VC: Record<string, Record<string, number>> = {
  ib_analyst:              { '0-2': 115_000, '2-5': 140_000, '5-10': 155_000, '10-15': 170_000, '15+': 185_000 },
  ib_associate_ma:         { '0-2': 200_000, '2-5': 250_000, '5-10': 290_000, '10-15': 320_000, '15+': 345_000 },
  ib_vp_ma:                { '0-2': 300_000, '2-5': 350_000, '5-10': 400_000, '10-15': 440_000, '15+': 475_000 },
  ib_director_ma:          { '0-2': 380_000, '2-5': 425_000, '5-10': 475_000, '10-15': 510_000, '15+': 545_000 },
  ib_md_ma:                { '0-2': 475_000, '2-5': 550_000, '5-10': 625_000, '10-15': 680_000, '15+': 725_000 },
  ecm_banker:              { '0-2': 165_000, '2-5': 225_000, '5-10': 305_000, '10-15': 405_000, '15+': 510_000 },
  dcm_banker:              { '0-2': 160_000, '2-5': 215_000, '5-10': 290_000, '10-15': 380_000, '15+': 475_000 },
  leveraged_finance_banker:{ '0-2': 175_000, '2-5': 245_000, '5-10': 335_000, '10-15': 440_000, '15+': 560_000 },
  restructuring_banker:    { '0-2': 175_000, '2-5': 240_000, '5-10': 335_000, '10-15': 445_000, '15+': 570_000 },
  fig_banker:              { '0-2': 165_000, '2-5': 225_000, '5-10': 305_000, '10-15': 405_000, '15+': 510_000 },
  pe_associate:            { '0-2': 185_000, '2-5': 215_000, '5-10': 235_000, '10-15': 255_000, '15+': 270_000 },
  pe_principal:            { '0-2': 300_000, '2-5': 360_000, '5-10': 410_000, '10-15': 440_000, '15+': 460_000 },
  pe_partner:              { '0-2': 500_000, '2-5': 625_000, '5-10': 760_000, '10-15': 855_000, '15+': 920_000 },
  growth_equity_principal: { '0-2': 250_000, '2-5': 310_000, '5-10': 370_000, '10-15': 410_000, '15+': 445_000 },
  vc_associate:            { '0-2': 135_000, '2-5': 175_000, '5-10': 205_000, '10-15': 220_000, '15+': 230_000 },
  vc_principal:            { '0-2': 245_000, '2-5': 305_000, '5-10': 365_000, '10-15': 405_000, '15+': 440_000 },
  vc_partner:              { '0-2': 400_000, '2-5': 500_000, '5-10': 625_000, '10-15': 720_000, '15+': 770_000 },
  secondaries_principal:   { '0-2': 275_000, '2-5': 335_000, '5-10': 395_000, '10-15': 435_000, '15+': 465_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_INVESTMENT_BANKING_PE_VC: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  ib_analyst: {
    strongOpener: 'I\'d like to discuss my year-end ranking and bonus in context of my deal sheet this year: [X live mandates, Y closed deals, Z sole-modeler responsibility on $XB transaction]. The top-bucket bonus differential at the analyst level is the foundation for buyside recruiting outcomes.',
    leverageContext: 'My deal contribution: [specific deals, your role, sole modeler / sole CIM author / sole management presentation lead]. Replacement cost is structurally high at top-bucket given PE on-cycle pulling top analysts. Top-tier elite boutiques (Evercore, Centerview, Moelis, PJT, Lazard) actively recruiting analysts at this exact career point.',
    countersScript: 'I\'m asking for top-bucket ranking + bonus of $X (per the 75th percentile at the bulge bracket / elite boutique market). If the ranking is set, then I\'d like a documented exposure to [specific sector / specific MD\'s deal team] for the next 6 months to position for PE recruiting.',
    walkAwayLine: 'I have an active lateral conversation with [Evercore / Centerview / Moelis / PJT / Lazard] and Glocap/CPI is tracking 4 active PE on-cycle seats for me. I\'d prefer to stay through year-2 here, but the ranking and bonus need to reflect the deal contribution.',
  },
  ib_associate_ma: {
    strongOpener: 'I\'d like to align my comp and group placement with my deal contribution: [X mandates as primary associate, Y client meetings led, Z pitch decks authored]. I\'m at the inflection point for VP-track promotion and want to discuss the sector specialization conversation.',
    leverageContext: 'My specific contributions: [closed deals with EV, your sole-authored work, repeat-client relationships you built]. Replacement cost is 6+ months given the M&A volume recovery. Top elite boutiques (Centerview, PJT, Moelis, Evercore) recruiting associates at $250-300K base + bonus.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile elite boutique), bonus of $Y (matches sector-strong associate at our firm), explicit placement in [TMT / healthcare / FIG] for the next 12 months, and a documented VP-track conversation in 6 months.',
    walkAwayLine: 'I have an inbound from [Centerview / PJT / Moelis / Evercore] at $X above current. The deal exposure here has been strong — I want to continue but need group placement + comp alignment.',
  },
  ib_vp_ma: {
    strongOpener: 'After [X sole-originated mandates, Y client relationships independent of my MD, Z pitches converted to live engagements], I\'d like to discuss the Director-track promotion timeline and comp alignment.',
    leverageContext: 'My origination ledger: [pitch deck count, conversion rate, client relationships, sole-attributed mandates]. Replacement cost for a VP with origination evidence + sector relationships is 9+ months. Heidrick / Russell Reynolds are quietly searching for Director-level seats at [Lazard / Houlihan Lokey / Jefferies / Moelis] at $400-475K base + 75-100% bonus.',
    countersScript: 'I\'m asking for base of $X (matches Director-level at competitor firm), bonus target of Y%, documented Director-track promotion in next cycle, and explicit sole-attribution credit on the next 3 mandates I originate.',
    walkAwayLine: 'I have a documented Director offer from [Lazard / Houlihan Lokey / Jefferies / Moelis] at $X base. I have enjoyed the work here — the next 90 days need to produce real promotion-track and comp movement.',
  },
  ib_director_ma: {
    strongOpener: 'I\'d like to discuss the MD partnership-track conversation. My fee production ledger: $X fees over the last 24 months across [Y mandates, Z repeat clients]. I am operating at the MD revenue level and want to align comp + title.',
    leverageContext: 'Fee attribution: [origination credit / execution credit / cross-sell to ECM/DCM/LevFin]. Replacement cost for a Director with my client book is 12+ months and immediate fee disruption. Heidrick / Russell Reynolds / Spencer Stuart / Korn Ferry are actively searching for MD seats at [bulge bracket / elite boutique / PE-sponsored advisory] at $600-800K base + 100-200% bonus.',
    countersScript: 'I\'m asking for MD title in the next cycle with base of $X (matches MD market 75th percentile), guarantee structure for year-1 MD ($Y all-in), and explicit franchise designation in [my sub-sector] with the headcount to build out the practice.',
    walkAwayLine: 'I have a documented MD-track offer from [bulge bracket / elite boutique] and a senior advisor offer from [PE firm] at substantially higher all-in. The franchise I have built belongs to me — I want to grow it here, but the MD economics need to materialize.',
  },
  ib_md_ma: {
    strongOpener: 'I want to discuss my year-end comp and guarantee structure in context of fee production: $X attributed fees this year, repeat-client revenue of $Y, cross-sell credit on $Z to other products. My fee ledger places me in the [top quartile / top decile] of MDs at this firm.',
    leverageContext: 'My franchise: [specific repeat clients, sector designation, cross-product cross-sell, junior team developed]. Replacement cost: 12+ months of disrupted client coverage and immediate fee loss of $Y. Heidrick / Russell Reynolds maintain continuous market for MD seats at [bulge bracket / elite boutique / PE-sponsored advisory] with guarantees of $1.5-3M for proven franchises.',
    countersScript: 'I\'m asking for guarantee structure of $X for year-1 (matches my franchise valuation in the search market), full sole-attribution on my repeat clients, and budget for [junior team headcount / sector conference participation / two more analysts]. I\'d also like to negotiate the partnership equity discussion.',
    walkAwayLine: 'I have a guarantee offer of $X from [bulge bracket / elite boutique / PE-sponsored advisory] for year-1 plus a sign-on package of $Y. My franchise is portable and the search-market valuation is clear. The path forward here needs to match or close the gap meaningfully.',
  },
  leveraged_finance_banker: {
    strongOpener: 'I want to discuss my comp in context of sponsor coverage relationships I have built: [X PE firms where I am the lead LevFin contact, Y deals closed this year, $Z financing volume]. Sponsor-relationship LevFin bankers are the most-recruited specialty in IB right now.',
    leverageContext: 'My sponsor relationships: [Blackstone / KKR / Apollo / Carlyle / TPG / Bain Capital / Warburg / Advent / Vista / Thoma Bravo at the principal/MD level]. JPMorgan LevFin, BofA LevFin, Credit Suisse/UBS Lev, Goldman LevFin, and Jefferies LevFin compete aggressively for this exact profile at $300-450K base + 75-100% bonus.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile sponsor-relationship LevFin), bonus target of Y%, and explicit sole-attribution credit on the next 5 sponsor mandates I source. I\'d also like to discuss a private credit fund secondment as a long-term optionality.',
    walkAwayLine: 'Ares, Blackstone Credit, Apollo Hybrid Value, and Golub have approached me at $X base + carry. The sponsor relationships are portable — I have enjoyed building them here but need the comp to match the market.',
  },
  restructuring_banker: {
    strongOpener: 'I\'d like to discuss my comp in context of the current restructuring cycle and my engagement load: [X live mandates, Y closed engagements, $Z fee attribution]. Restructuring is counter-cyclical and we are entering peak demand.',
    leverageContext: 'My contributions: [specific engagements, debtor-side vs creditor-side mix, distressed fund relationships built]. Houlihan Lokey, Lazard, Moelis, PJT Partners, Evercore Restructuring, and Rothschild are competing aggressively for proven restructuring bankers — current cycle premium 25-40% over normalized M&A.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile at the top-5 restructuring firms), bonus target of Y%, and travel/conference budget for distressed-investor coverage (Elliott, Oaktree, Centerbridge, Silver Point conferences). Plus explicit sole-attribution credit on next 3 mandates I source.',
    walkAwayLine: 'I have a documented offer from [Houlihan Lokey / Lazard / Moelis / PJT / Evercore Restructuring] at $X plus a distressed fund inbound from [Elliott / Oaktree / Centerbridge]. The cycle premium is real — I need to capture it.',
  },
  pe_associate: {
    strongOpener: 'I\'d like to discuss the principal-track promotion timeline + carry allocation conversation. My deal contribution this year: [X deals as primary associate, Y diligence work-streams led independently, Z investments where I authored the IC memo].',
    leverageContext: 'Specific contributions: [closed investments, your role, post-close board involvement, value-creation work-streams owned]. Replacement cost: 6-9 months for a PE associate with my deal record. Glocap / Henkel / Amity are tracking principal-track seats at [Blackstone / KKR / Apollo / Carlyle / TPG / Bain Capital / Warburg / Advent / Vista / Thoma Bravo] at $250-330K base + 80-150% bonus + carry tail.',
    countersScript: 'I\'m asking for base of $X (75th percentile at top-30 PE firms), bonus target of Y%, explicit carry allocation on the current fund ($Z notional, 5-15 bps of 20%), and documented principal-track promotion conversation in the next 12 months.',
    walkAwayLine: 'I have an active principal-track conversation with [Blackstone / KKR / Apollo / Carlyle] and an HBS / GSB acceptance as the alternative path. The work here has been strong — I need explicit promotion-track + carry to stay.',
  },
  pe_principal: {
    strongOpener: 'I want to discuss carry allocation on the next fund and the partner-track promotion timeline. My sourcing track record: [X investments I sourced independently, Y closed, Z under active board oversight]. I\'m operating at the partner level.',
    leverageContext: 'My sourcing channels: [specific CEO/CFO relationships, sector intelligence sources, repeat-deal flow patterns]. Replacement cost: 12+ months for a principal with sourced-deal evidence. Heidrick / Glocap / Henkel / Amity are tracking partner-track seats at [megafunds and growth equity] at $400-650K base + $750K-$1.5M bonus + 50-150 bps carry.',
    countersScript: 'I\'m asking for base of $X (matches partner-track principal at peer megafund), bonus target of Y%, explicit carry allocation of Z bps of 20% on the next fund close, and documented partner-track promotion in the next 18 months. Plus the right to participate in the fund GP commit on partner economics.',
    walkAwayLine: 'I have a partner-track offer from [peer megafund / growth equity firm] with [50-200 bps carry, $1-3M GP commit, partnership equity]. My deal flow is portable through the CEO relationships I have built. I want to stay but the partner-track economics need to crystallize.',
  },
  pe_partner: {
    strongOpener: 'I want to discuss the next-fund close — specifically my carry allocation, GP commitment, and the partnership economics. My fund-life contribution: [X investments led, Y exits realized, $Z carry-eligible MOIC, sector franchise built].',
    leverageContext: 'My fund contribution: [specific investments, MOIC realized, sector franchise, junior partners developed, LP relationships owned]. Replacement cost: 18+ months and immediate carry-allocation reshuffling. Heidrick / Russell Reynolds / Spencer Stuart maintain continuous quiet market for proven PE partners at peer megafunds. Spinout to launch my own fund is the alternative — 10+ LP relationships and 2-3 anchor portfolio CEOs already in place.',
    countersScript: 'I\'m asking for carry allocation of X bps of 20-30% on the next fund, GP commit of $Y aligned with partner economics, management company equity participation, vesting/cliff terms aligned with senior partners, and clear departure economics (carry vesting, tail rights). I want independent counsel to review the LP agreement separately.',
    walkAwayLine: 'I have explicit lateral conversations with [peer megafund] at [specific carry terms] and have built credible spinout optionality with [X LP commitments + Y portfolio CEO anchors]. The next-fund economics here need to match the alternatives or the spinout becomes the path.',
  },
  growth_equity_principal: {
    strongOpener: 'I\'d like to discuss carry allocation + partner-track timing. My investment record: [X investments led independently, $Y deployed, current ARR growth metrics in active portfolio companies].',
    leverageContext: 'My founder relationships: [50+ founders in 2 verticals, 20+ CEOs in active dialogue, proprietary deal flow channels]. Replacement cost: 9-12 months. Glocap / Henkel / Amity are tracking partner-track seats at [General Atlantic, Insight Partners, TA Associates, Summit Partners, JMI Equity, Bain Capital Ventures, Goldman Growth, Coatue, Tiger, D1, Whale Rock] at $400-650K base + carry.',
    countersScript: 'I\'m asking for base of $X (partner-track growth principal 75th percentile), bonus target of Y%, explicit carry allocation on the next fund of Z bps, and documented partner-track promotion conversation in 12 months.',
    walkAwayLine: 'I have active conversations with [peer growth fund / crossover fund] at partner-track economics. The founder relationships are portable through my vertical brand — the path forward here needs to crystallize within 60 days.',
  },
  vc_principal: {
    strongOpener: 'I want to discuss carry allocation + partner promotion timing. My sourced-and-led track record: [X investments where I led sourcing + IC sponsorship + post-close board seat, Y current portfolio companies, Z founder relationships in 2 verticals].',
    leverageContext: 'My founder pull: [public investor brand, sourced inbound founder volume, portfolio company performance markers]. Replacement cost: 12+ months and disruption to active board commitments. Top funds (Sequoia, A16Z, Benchmark, Founders Fund, Index, Accel, Lightspeed, GV, Bessemer) negotiate partner-track at 50-200 bps carry. Solo-GP fund launch alternative — I have 8 standing LP relationships and 2 anchor founders ready.',
    countersScript: 'I\'m asking for base of $X (partner-track principal at peer fund), bonus target of Y%, explicit carry allocation of Z bps of 20-30% on the next fund close, and documented partner promotion in next 12 months. Plus independent legal counsel to review the partnership agreement.',
    walkAwayLine: 'I have a partner-track conversation at [peer top-tier fund] and credible solo-GP launch optionality with $X of LP commitments anchored. The next-fund economics here need to crystallize or the alternative path becomes the default.',
  },
  vc_partner: {
    strongOpener: 'I want to discuss next-fund close terms — specifically my carry points, GP commitment, management company equity, and vesting structure. My fund-life contribution: [X investments led, Y exits realized, $Z DPI generated, public brand built].',
    leverageContext: 'My fund contribution: [investments, exits, DPI, founder brand, junior partners mentored]. Replacement cost: 18+ months. Heidrick / Russell Reynolds maintain continuous quiet market for proven VC partners. Solo-GP fund launch is the alternative — I have $X of LP soft commits and 3 anchor founders ready to back a debut fund of $100-200M.',
    countersScript: 'I\'m asking for carry allocation of X bps of 20-30% on the next fund, GP commit of $Y aligned with partner economics, management company equity participation, vesting/cliff aligned with senior partners, clear departure terms (carry vesting + tail). Independent counsel will review the LP agreement separately.',
    walkAwayLine: 'I have explicit lateral conversations at peer megafund + credible solo-GP launch optionality with $X LP commitments. The next-fund economics here need to align with the alternatives or I will pursue the spinout path.',
  },
  secondaries_principal: {
    strongOpener: 'I want to discuss carry allocation + partner-track timing. My track record: [X GP-led transactions led, $Y volume, Z LP-side liquidity matches sourced, continuation vehicle leadership].',
    leverageContext: 'My LP network: [30+ institutional LP relationships, named CIO contacts at top pension funds / sovereign wealth funds / endowments]. Replacement cost: 12+ months. Ardian, Lexington/Franklin, HarbourVest, Coller, Goldman PEG Secondaries, Blackstone Strategic Partners, AlpInvest are competing aggressively for proven secondaries talent. Continuation vehicle expertise is the scarcest specialty.',
    countersScript: 'I\'m asking for base of $X (75th percentile at top-5 secondaries firms), bonus target of Y%, explicit carry allocation on the next fund of Z bps, and documented partner-track promotion in next 12 months.',
    walkAwayLine: 'I have active conversations with [Ardian / Lexington / HarbourVest / Coller / Blackstone Strategic Partners] at partner-track economics. The LP relationships are portable — the path forward here needs to match within 60 days.',
  },
  ecm_banker: {
    strongOpener: 'I\'d like to align my comp with the 2026 ECM market recovery. My contribution this year: [X IPOs led, Y follow-ons executed, Z buy-side allocation relationships built].',
    leverageContext: 'My buy-side relationships: [Fidelity / T. Rowe Price / Wellington / Capital Group / top long-only PMs]. Replacement cost: 6+ months for an ECM banker with portable allocation book. JPMorgan ECM, BofA ECM, Goldman ECM, and Morgan Stanley ECM all rebuilding aggressively post-2022/23 cuts.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile ECM at peer bulge bracket), bonus target of Y%, and explicit cross-product origination credit on PE-exit IPOs sourced through sponsor coverage relationships.',
    walkAwayLine: 'I have an inbound from [JPMorgan / BofA / Goldman / Morgan Stanley ECM] at $X plus a hedge fund capital introduction role inbound. The allocation book is portable — I need the comp to match.',
  },
  fig_banker: {
    strongOpener: 'I\'d like to discuss my comp in context of my insurance + specialty finance dual coverage. My deal record: [X insurance M&A engagements, Y specialty finance mandates, Z anchor CFO relationships built].',
    leverageContext: 'My anchor clients: [3 mid-cap insurer CFOs, 2 specialty lender Head of Strategy contacts]. Insurance M&A volume up YoY; specialty finance growth driving aggressive FIG hiring. Replacement cost: 9+ months. Goldman FIG, Morgan Stanley FIG, JPMorgan FIG, BofA FIG, Lazard FIG, Houlihan Lokey FIG all hiring dual-coverage bankers.',
    countersScript: 'I\'m asking for base of $X (75th percentile FIG at peer bulge bracket / elite boutique), bonus target of Y%, and explicit franchise designation in [insurance / specialty finance] for next 12 months.',
    walkAwayLine: 'I have an inbound from [Goldman FIG / Lazard FIG / Houlihan Lokey FIG] plus a Corp Dev / Strategy inbound from [AIG / MetLife / Prudential / Apollo-Athene / KKR-Global Atlantic] at $X. The anchor client relationships are portable — comp needs to match.',
  },
};
