// quant_asset_hedge_actions.ts — v38.0 Phase 3 (Finance Deep)
// 17 Quant Finance / Asset Management / Hedge Fund roles — high-impact, high-comp niches
// where AI augments (rather than displaces) judgment-driven, capital-allocating practitioners.

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

const A_QAH_NETWORKING: BracketPool = pool(
  { title: 'Publish 2 Working Papers on SSRN or arXiv q-fin', description: 'A short technical note (8-15 pages) on a microstructure observation, factor decomposition, or risk-model critique uploaded to SSRN or arXiv q-fin generates inbound from Citadel, Two Sigma, and Jane Street research recruiters within 30-60 days. Even modest topics (e.g., decay analysis on a published alpha factor) demonstrate publishable rigor and convert recruiter conversations into onsites.', layerFocus: 'L3 · Reputation', riskReductionPct: 18, deadline: '90 days', priority: 'Medium' },
  { title: 'Join the SSRN / arXiv q-fin / Quantitative Finance Stack Network', description: 'Active engagement on quant.stackexchange (10+ substantive answers), Quantopian community alumni Slack, and SSRN downloads of relevant papers (Avellaneda, Lopez de Prado, Kearns) builds credibility. Senior quants at DE Shaw, Hudson River Trading, and Jump Trading specifically reference SSRN authorship in hiring decisions. Comment on at least 2 papers/week.', layerFocus: 'L3 · Visibility', riskReductionPct: 16, deadline: '30 days', priority: 'Medium' },
  { title: 'Build Direct Relationships with 5 Recruiters at Top Quant Funds', description: 'Selby Jennings, Oxbridge Search, Glocap, Options Group, and Durlston Partners are the executive search firms covering Citadel, Citadel Securities, Two Sigma, Jane Street, Renaissance, DE Shaw, Hudson River Trading, Jump Trading, Tower, SIG, Susquehanna. Even informational calls calibrate market comp and surface unposted seats — every 18 months refresh these relationships.', layerFocus: 'L4 · Network', riskReductionPct: 22, deadline: '21 days', priority: 'High' },
  { title: 'Pursue or Maintain the CFA Charter (or Refresh CIPM for AM)', description: 'CFA Charter is the credential floor for senior PM and equity research seats at BlackRock, Vanguard, Fidelity, State Street, PIMCO, T. Rowe Price, Capital Group, Wellington, AllianceBernstein. Levels I-III cost ~$3,500 total + 900+ study hours. For seasoned practitioners, CIPM (performance measurement) is the secondary credential. Pure quant funds care less about CFA than PhD pedigree.', layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '12 months', priority: 'High' },
  { title: 'Audit Your LinkedIn for Specific Tooling, Books, and P&L Attribution', description: 'Buy-side recruiters search by specific stack: kdb+/q, Python (numpy/pandas/JAX), C++, Julia, R, Bloomberg Terminal, FactSet, MSCI Barra, Aladdin. PMs/analysts add book size, Sharpe ratio above benchmark, and P&L attribution (e.g., "managed $250M long-short book, Sharpe 1.8, 3-yr"). This single update typically triples inbound from buy-side recruiters within 30 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_QUANT_ASSET_HEDGE ──────────────────────────────────────────────

export const ACTION_DB_QUANT_ASSET_HEDGE: Record<string, BracketPool> = {

  quant_researcher: pool(
    { title: 'Publish Alpha Research on SSRN — Two Sigma / Citadel / Jane Street Pipeline', description: 'Publish 1-2 alpha-decay or factor-robustness papers on SSRN (no proprietary data needed — use Kenneth French library, CRSP via WRDS academic access, or pure simulation studies). Citadel GQS, Two Sigma research, and Jane Street Quant Research recruit aggressively from SSRN authors. Even at junior level a published paper converts a generic resume into a $250K+ research seat conversation.', layerFocus: 'L3 · Reputation', riskReductionPct: 38, deadline: '120 days', priority: 'Critical' },
    { title: 'Master Lopez de Prado MFML + Build a Reproducible Backtest Pipeline', description: 'Work through "Advances in Financial Machine Learning" (de Prado) and "Machine Learning for Asset Managers" cover-to-cover, then publish a reproducible backtest pipeline on GitHub (purged k-fold CV, combinatorial purged CV, fractional differentiation). Pair with a Python/numpy/pandas + JAX or PyTorch stack. This portfolio piece is the bridge to senior quant researcher seats at $400K+ total comp at Two Sigma, DE Shaw, AQR.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply Directly to Citadel GQS, Renaissance RIEF, Jane Street Quant Research', description: 'Citadel Global Quantitative Strategies, Renaissance Technologies (Medallion-adjacent RIEF), Jane Street Quant Research, and DE Shaw research arm pay senior quant researchers $400K-$1M+ total comp (base + perf). PhD physics/math/CS preferred at Renaissance and Citadel research. Apply directly via referrals from existing employees (LinkedIn alumni search) — recruiter pipeline is slower and lower-yield for senior research seats.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  quant_developer: pool(
    { title: 'Master kdb+/q and Publish a Public q Tutorial Series', description: 'kdb+/q remains the highest-leverage quant dev skill in 2026 — tick-data systems at Citadel Securities, Jane Street, Hudson River Trading, Tower Research, and Two Sigma run on kdb. A 10-post q tutorial blog series + a few public kdb+ utility libraries on GitHub converts a generic Python dev into a $300K+ quant dev seat. KX Academy offers free q courses; certified q developers add ~$30-50K to base.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    { title: 'Build a Low-Latency C++ or Rust Order-Book Replay Engine on GitHub', description: 'Publish a public C++ (or Rust) order-book replay + simulation engine on GitHub, with measured nanosecond-level latency profiles. Use ITCH/OUCH spec or LOBSTER NASDAQ data. Top market-makers (Jane Street, Citadel Securities, Hudson River Trading, Jump Trading, IMC, Optiver, Tower) hire C++ devs at $250K-$500K total comp specifically on demonstrated low-latency engineering capability.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to Pod Shops + Market Makers in Parallel — Citadel, Millennium, Jane Street, HRT, Jump', description: 'Senior quant devs at Citadel, Citadel Securities, Millennium, Jane Street, Hudson River Trading, Jump Trading, Tower Research, SIG, and Susquehanna earn $300K-$700K total comp. The role markets are tightly coupled — apply to 4-6 firms in parallel to maximize cross-offer leverage. PMs at pod shops (Millennium, Point72) own their dev hiring and move fast on referrals.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  algo_trader: pool(
    { title: 'Document a 12-Month P&L Track Record with Sharpe Attribution', description: 'A clean P&L track record (12+ months, ideally 24+) with Sharpe ratio, max drawdown, and strategy attribution is the strongest credential for senior algo trader seats. If you have a live book, prepare a one-pager with monthly returns, Sharpe (gross + net of costs), and alpha decomposition. If you trade prop only, simulate with verifiable timestamps. This single artifact is the gateway to $500K-$2M+ pod seats.', layerFocus: 'L3 · Reputation', riskReductionPct: 38, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply to Pod Shops with Capacity in Your Asset Class — Millennium, Citadel, Point72, Balyasny, ExodusPoint', description: 'Pod shops (Millennium, Citadel, Point72 Cubist, Balyasny, ExodusPoint, Verition, Walleye) allocate $100M-$1B+ books to PMs with proven Sharpe > 2. They hire continuously. Each pod is a P&L-attributed seat with claw-back provisions on losses. Apply directly via PM-level referrals. Top algo traders earn $200K-$350K base + $200K-$1.5M+ bonus.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '14 days', priority: 'Critical' },
    { title: 'Negotiate a Single-Name Book or Increased Capacity at Current Pod', description: 'If you\'re already in a pod, the highest-leverage move is negotiating increased book size or moving from a shared book to a single-name seat. Document last 12 months\' P&L and Sharpe. Pod-shop CIOs reward Sharpe > 2 with capacity increases at the 15-30% range. Capacity expansion compounds — a $200M → $400M book at 8% return is the difference between $1M and $3M+ in bonus.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  risk_quant: pool(
    { title: 'Master FRTB IMA + SA-CCR — The Post-Regulation Demand Driver', description: 'FRTB (Fundamental Review of Trading Book) and SA-CCR are driving acute hiring at all G-SIBs and large dealers. Senior risk quants who own FRTB IMA implementation, expected shortfall, and DRC modeling earn $250K-$400K. Read the BIS FRTB final rules + Hull "Risk Management and Financial Institutions" + publish 2 SSRN notes critiquing or implementing FRTB methodology. This is the highest-leverage risk quant specialization in 2026.', layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '120 days', priority: 'Critical' },
    { title: 'Pivot from Bank Risk to Buy-Side Risk Quant at Pod Shops', description: 'Risk quants at pod shops (Millennium Risk, Citadel Risk, Point72) earn 40-60% more than bank-side equivalents and own materially more interesting problems (cross-pod margining, capacity optimization, scenario stress). Apply within 14 days — these teams have continuous hiring funnels for FRTB / Basel III / margin-modeling experts.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Publish on CCAR / DFAST / Climate-Risk Scenario Methodology', description: 'Senior risk quants who can author scenario design (CCAR, DFAST, ECB climate stress) are dramatically valuable. Publish 2 SSRN papers on scenario severity calibration or climate transition risk modeling. This portfolio piece opens chief risk officer track or $350K+ head-of-modeling roles at large banks and asset managers like BlackRock Risk & Quant Analytics.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '180 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  market_making_engineer: pool(
    { title: 'Build Microstructure Expertise + Publish on Toxic Flow Identification', description: 'Market-making engineers who can author quote-skewing logic and toxic flow detection (VPIN, order-flow imbalance, adverse selection metrics) are the scarcest profile at Citadel Securities, Jane Street, Virtu, IMC, Optiver, Hudson River Trading, Jump Trading. Publish a public microstructure study (1-2 papers + GitHub backtest). Adds $50K-$120K to senior offers.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '120 days', priority: 'Critical' },
    { title: 'Master C++ Concurrency + Lock-Free Data Structures', description: 'Top market-makers compete on nanosecond latency. Master C++20 concurrency (std::atomic, lock-free queues, SPSC ring buffers), FPGA-adjacent low-latency patterns, and kernel-bypass networking (Solarflare/Onload, DPDK). Publish a public benchmark suite. This is the unique technical credential for $400K-$700K senior market-maker roles.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply Directly to Citadel Securities, Jane Street, HRT, Jump, Tower, SIG, IMC', description: 'The top US market-makers (Citadel Securities, Jane Street, Hudson River Trading, Jump Trading, Tower Research, SIG, Susquehanna, IMC US, Optiver US, Virtu) recruit continuously for execution / market-microstructure engineers. Senior practitioners earn $300K-$600K base + $200K-$1M+ bonus. Apply within 14 days via direct referral. Renaissance does not run a public market-making book.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  stat_arb_researcher: pool(
    { title: 'Publish a Cross-Sectional Equity Stat-Arb Backtest Following Lopez de Prado MFML Standards', description: 'A reproducible cross-sectional equity stat-arb backtest (purged k-fold CV, combinatorial purged CV, deflated Sharpe ratio) published on GitHub with an SSRN write-up is the strongest signal for senior stat-arb seats. Two Sigma, AQR, DE Shaw, and Renaissance RIEF specifically recruit stat-arb researchers from SSRN/arXiv authors. Total comp at senior: $400K-$1M.', layerFocus: 'L3 · Reputation', riskReductionPct: 36, deadline: '120 days', priority: 'Critical' },
    { title: 'Build Alpha Decay Analytics on a Portfolio of 30+ Published Anomalies', description: 'A public study tracking alpha decay across 30+ academic anomalies (momentum, value, profitability, low-vol, post-earnings drift, etc.) using CRSP/Compustat (academic WRDS) demonstrates rigorous research instincts. Pair with a Python/pandas/statsmodels stack. This portfolio piece converts a generic resume into a senior stat-arb research seat at $350K+.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Two Sigma, AQR, DE Shaw, Renaissance RIEF, Acadian, Bridgewater Pure Alpha', description: 'The classical stat-arb shops (Two Sigma, AQR, DE Shaw, Renaissance, Acadian, Bridgewater Pure Alpha) hire continuously for stat-arb research. Pod-shop quant pods (Citadel GQS, Millennium quant pods, Point72 Cubist) are an alternative path. Apply within 14 days — senior researchers earn $400K-$1M+ depending on book economics.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  portfolio_manager: pool(
    { title: 'Build a Bloomberg-Verified 36-Month Track Record with Attribution', description: 'A 36-month track record (live or pari-passu paper) with Bloomberg or FactSet verification, attribution by sector/factor/single-name, and Sharpe + max drawdown is the credential floor for senior PM seats at BlackRock, Fidelity, T. Rowe Price, Wellington, Capital Group, AllianceBernstein. Top PMs earn $500K-$5M+ total comp depending on fund AUM and perf bonus structure. CFA Charterholder strongly preferred.', layerFocus: 'L3 · Reputation', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Pivot from Long-Only to Multi-Manager / Pod Shop PM Seat', description: 'A pod-shop PM seat (Millennium, Citadel, Point72, Balyasny, ExodusPoint, Verition, Walleye) commands $1M-$10M+ on a successful book vs. $500K-$1.5M at a long-only AM. Pods are claw-back structured (losses recouped from future bonus). For PMs with Sharpe > 1.5 and clear style edge, the conversion typically produces a 3-5x comp uplift. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Negotiate Capacity Expansion + Carry-Linked Bonus Structure', description: 'For PMs in their seat, the highest-leverage move is capacity expansion + a documented carry-linked or P&L-share bonus structure. Document 36-month Sharpe, IR vs. benchmark, and AUM growth. Pod-shop CIOs reward Sharpe > 1.8 with 15-30% capacity increases. Carry-linked bonuses (typically 5-12% of P&L above benchmark) compound dramatically — every 25% book increase at flat Sharpe is a 25% bonus increase.', layerFocus: 'L5 · Negotiation', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  etf_specialist: pool(
    { title: 'Pivot from ETF Operations to ETF Capital Markets / Product Development', description: 'ETF specialists in pure operations (creation/redemption, AP management) face 30-40% automation pressure as iShares, Vanguard, and State Street systematize workflows. Pivot to ETF Capital Markets (AP relationship management, primary market quoting) or ETF Product Development (new launches at Invesco, iShares, SPDRs, ARK, Innovator, WisdomTree). Capital markets seats earn $150K-$280K + bonus.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '21 days', priority: 'Critical' },
    { title: 'Master Active ETF Launch Mechanics + Build a Product Launch Portfolio Piece', description: 'Active ETFs (ARK, Dimensional, Capital Group transparent active, JPMorgan active) are the highest-growth ETF segment. Senior ETF specialists who can author launch playbooks (regulatory, AP recruitment, seed capital, market-making relationships) earn premium offers at $200K+. Document a launch you led (or shadowed) for the portfolio piece.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    { title: 'Apply to iShares, Vanguard, State Street SPDR, Invesco, ARK, Innovator', description: 'The top US ETF issuers (iShares/BlackRock, Vanguard, State Street SPDR, Invesco, ARK, Innovator, WisdomTree, First Trust, JPMorgan, Capital Group) hire continuously for ETF specialists. Active ETF launches drive demand. Apply within 14 days at issuer + AP firms (Cantor, Susquehanna, Jane Street, Virtu — all have ETF capital markets teams).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  fixed_income_trader: pool(
    { title: 'Specialize in Credit + Document Sharpe with Sector Attribution', description: 'Fixed income traders specializing in credit (IG, HY, structured, EM) command higher comp than rates-only specialists. Document 24-month P&L with sector and rating-bucket attribution. Top firms: PIMCO, BlackRock Fundamental Fixed Income, AllianceBernstein, T. Rowe Price, Loomis Sayles, Brandywine. Senior credit traders earn $250K-$500K base + perf bonus.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Pivot to Multi-Strategy Credit at Pod Shops or Direct Lending', description: 'Pod shops (Millennium Credit, Citadel Credit, ExodusPoint, Brevan Howard) and direct lending platforms (Ares, Blue Owl, Sixth Street, Golub) compensate FI traders 50-100% above long-only AM. Senior pod traders earn $400K-$1.5M+ depending on book. Apply within 14 days via direct referral.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    { title: 'Build Relative-Value + Quant Credit Capability', description: 'Senior FI traders with quant credit + relative-value frameworks (basis trades, capital structure arb, CDS-bond basis) are dramatically more valuable than directional traders. Master KX/kdb+ for bond tick data, publish 1-2 SSRN notes on credit-curve analytics or capital structure trades. This portfolio piece is the bridge to $400K+ senior credit PM seats.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '120 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  equity_research_analyst: pool(
    { title: 'Earn the CFA Charter + Build a Buy-Side Pitch Portfolio', description: 'CFA Charter is the credential floor for senior buy-side equity research at BlackRock, Fidelity, T. Rowe Price, Wellington, Capital Group, AllianceBernstein. Build a 5-stock buy-side pitch portfolio (in the SumZero, Value Investors Club, or personal blog format) with explicit thesis, valuation framework, and catalysts. Top buy-side firms specifically scout SumZero and VIC. Senior analysts earn $150K-$275K base + $100K-$275K bonus.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Pivot from Sell-Side to Buy-Side or Pod-Shop Analyst Seat', description: 'Buy-side analysts earn 40-80% above sell-side equivalents and own materially more interesting work. Pod-shop fundamental analyst seats (Millennium, Citadel, Point72, Balyasny, ExodusPoint) compensate $200K-$400K base + carry on book P&L = $400K-$2M+. Sell-side equity research is contracting under MiFID II unbundling + AI augmentation of fundamental analysis (18-28% AI substitution pressure). Pivot within 12 months.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Publish a Differentiated Sector Framework on SumZero or VIC', description: 'A differentiated sector framework (e.g., unit-economics models for SaaS, capacity-cycle models for energy, channel-check methodology for consumer) published on SumZero / VIC / personal Substack is the strongest buy-side hiring signal. Top performers convert to $300K-$500K+ senior analyst seats within 18 months.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '120 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  multi_asset_strategist: pool(
    { title: 'Build a Public Multi-Asset Tactical Framework on Substack or SSRN', description: 'A multi-asset tactical framework (regime detection, cross-asset valuation, vol-targeted allocation) published on Substack/SSRN with monthly out-of-sample tracking is the strongest signal for senior multi-asset PM seats. Top firms: BlackRock GTAA, PIMCO MA, AllianceBernstein MA, Bridgewater All Weather, AQR Risk Parity. Senior PMs earn $300K-$700K + perf bonus.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '120 days', priority: 'Critical' },
    { title: 'Master Risk-Parity + Vol-Targeting + Tactical Overlay Frameworks', description: 'Senior multi-asset strategists own three frameworks: strategic asset allocation (mean-var, Black-Litterman, risk parity), vol targeting, and tactical overlays. Master Bridgewater\'s All Weather methodology + AQR risk parity + Goldman tactical signals. Publish a public Python/numpy implementation on GitHub. This portfolio is the bridge to $400K+ multi-asset PM seats.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to BlackRock GTAA, PIMCO Multi-Asset, AllianceBernstein, Bridgewater, AQR', description: 'BlackRock GTAA, PIMCO Multi-Asset, AllianceBernstein, Bridgewater, AQR, and pod-shop macro pods (Millennium, Citadel Macro, Brevan Howard) hire continuously for multi-asset strategists. Senior practitioners with rigorous frameworks earn $400K-$1M+. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  esg_analyst: pool(
    { title: 'Pivot from Pure ESG Screening to Climate-Risk Quant or Sustainable Investing PM', description: 'Pure ESG screening / data collection faces 22-32% automation pressure (MSCI ESG, Sustainalytics, Truvalue Labs already automate routine data). Senior ESG roles surviving the post-greenwashing softening combine climate-risk quant skills with PM/analyst track records. Pivot to climate-risk scenario modeling (TCFD, NGFS) or sustainable investing analyst track at BlackRock Sustainable, Wellington Climate, T. Rowe Price Impact.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '21 days', priority: 'Critical' },
    { title: 'Master MSCI ESG, Sustainalytics, and TCFD Scenario Methodology', description: 'Senior ESG analysts master MSCI ESG, Sustainalytics, ISS-ESG data, plus TCFD/NGFS climate scenarios and the SEC climate disclosure framework. Publish a public sector-level climate transition risk analysis (e.g., utilities or energy under NGFS Net Zero 2050). This portfolio piece converts ESG-data analyst into climate-risk PM track at $150K-$220K.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    { title: 'Apply to BlackRock Sustainable, Wellington Climate, T. Rowe Impact, PIMCO Climate, AllianceBernstein Responsible', description: 'The surviving senior ESG seats are at firms with genuine sustainable investing franchises: BlackRock Sustainable Investing, Wellington Climate Research, T. Rowe Impact, PIMCO Climate, AllianceBernstein Responsible Investing, Robeco, Generation IM. Apply within 14 days. Single-issue (pure climate or pure governance) specialists are more valuable than generalist ESG.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 24, deadline: '14 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  long_short_equity_analyst: pool(
    { title: 'Build a Verifiable Pitch Track Record on SumZero / VIC / Personal Substack', description: 'A verifiable 24-month long/short pitch track record (entry/exit timestamps, sized P&L) on SumZero, Value Investors Club, or personal Substack is the strongest signal for pod-shop and TMT-fund analyst seats. Top long/short funds (Citadel Surveyor, Point72, Balyasny, ExodusPoint, Millennium, Verition, Pershing Square, Greenlight, Third Point, Elliott) recruit aggressively from documented track records. Senior analysts earn $200K-$400K base + variable carry = $400K-$2M+.', layerFocus: 'L3 · Reputation', riskReductionPct: 36, deadline: '90 days', priority: 'Critical' },
    { title: 'Negotiate a Sub-PM / Single-Name Book at Current Fund', description: 'For senior L/S analysts, the highest-leverage move is negotiating a sub-PM seat (typically $50M-$200M book of single-name long/shorts with claw-back). Document 24-month pitch track record + idea-generation cadence. Sub-PM conversion typically produces 2-3x base + carry on book P&L. Single-name book is the path to MD-track partnership at L/S funds.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    { title: 'Apply Cross-Fund — Pod Shops + Activist + TMT-Specific Funds', description: 'Senior L/S analysts apply across three tracks: pod shops (Millennium, Citadel Surveyor, Point72, Balyasny, ExodusPoint), activist funds (Pershing Square, Third Point, Elliott, Trian, ValueAct), and sector-specialist funds (Coatue/Light Street/Whale Rock for TMT, Maverick Capital, Lone Pine for consumer). Apply within 14 days at all three tracks for max leverage.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  event_driven_analyst: pool(
    { title: 'Build a Merger Arb / Spinoff Track Record + Document Spread Capture', description: 'Event-driven analysts who can document spread capture across 20+ merger arb / spinoff / restructuring situations command premium offers. Document deal-by-deal P&L, days held, and IRR. Top event-driven funds: Pentwater, Magnetar, Sachem Head, HBK, Millstreet, Citadel Event Driven, Millennium Merger Arb. Senior analysts earn $200K-$400K base + variable bonus = $400K-$2M+.', layerFocus: 'L3 · Reputation', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Master Regulatory + Antitrust Frameworks for Cross-Border Deals', description: 'Senior event-driven analysts who master regulatory frameworks (FTC, EU Commission DG-COMP, China SAMR, CFIUS) command 30-40% premium because cross-border antitrust risk is the dominant P&L driver in 2026 merger arb. Document a public case study on a complex regulatory situation. Pair with Bloomberg M&A terminal + Mergermarket / Dealogic data.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '120 days', priority: 'High' },
    { title: 'Apply to Pentwater, Magnetar, Sachem Head, HBK, Citadel Event Driven, Millennium Merger Arb', description: 'The top event-driven shops (Pentwater, Magnetar Event Driven, Sachem Head, HBK, Millstreet, Citadel Event Driven, Millennium Merger Arb, Point72 Event Driven, Verition) hire continuously. Senior analysts with documented spread-capture track records earn $400K-$2M+. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  macro_trader: pool(
    { title: 'Document a Macro Track Record with Trade Theses + Cross-Asset Attribution', description: 'A macro trader\'s most valuable artifact is a 24-month track record with explicit pre-trade theses (rates view, currency view, equity index view) and cross-asset attribution. Document via timestamped Notion / Roam / personal Substack. Top macro funds: Bridgewater, Brevan Howard, Element Capital, Caxton, Tudor, Moore Capital, Rokos, Citadel Macro, Millennium Macro, ExodusPoint Macro. Senior macro traders earn $250K-$500K base + huge variable bonus = $500K-$10M+ for top performers.', layerFocus: 'L3 · Reputation', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Top Macro Funds + Pod-Shop Macro Pods', description: 'Apply across three tracks: classical macro funds (Bridgewater, Brevan Howard, Element, Caxton, Tudor, Moore, Rokos), pod-shop macro pods (Citadel Macro, Millennium Macro, ExodusPoint Macro, Balyasny Macro), and bank-prop replacements (Squarepoint, Capula). Senior macro traders with documented track records command $500K-$10M+. Apply within 14 days via direct referral.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '14 days', priority: 'Critical' },
    { title: 'Negotiate MD-Track Partnership or Sub-PM Seat with Claw-Back Carry Structure', description: 'Senior macro traders at top funds negotiate MD-track partnership or sub-PM seats with carry-share structures (typically 8-20% of book P&L with claw-back). For a $500M book at 12% return, that\'s $5M-$12M annual bonus. Document Sharpe > 2 + max drawdown < 12% as negotiation leverage.', layerFocus: 'L5 · Negotiation', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  distressed_credit_analyst: pool(
    { title: 'Build a Distressed Track Record Across Cap-Structure Arb + Restructuring Workouts', description: 'Distressed credit demand surged in 2026 as the rates cycle pivot drove default-cycle uptick. Senior distressed analysts who can document workout case studies (bonds, loans, equity stubs, post-reorg equity) command premium offers. Top distressed funds: Oaktree, Apollo Credit, Centerbridge, Silver Point, Anchorage, Davidson Kempner, King Street, Marathon, Elliott Distressed, Baupost. Senior analysts earn $200K-$380K base + $150K-$700K bonus.', layerFocus: 'L3 · Reputation', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    { title: 'Master Restructuring + Bankruptcy Framework (Chapter 11, Liability Management, DIP)', description: 'Senior distressed analysts master Chapter 11 mechanics (DIP financing, plan-of-reorganization economics, absolute priority deviation, equity stub valuation) and the modern liability management toolkit (uptier exchange, drop-down, J.Crew / Serta / Envision precedents). Read "Distressed Debt Analysis" (Moyer) + monitor Reorg Research. Publish 1-2 LME case studies for portfolio.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '120 days', priority: 'Critical' },
    { title: 'Apply to Oaktree, Apollo, Centerbridge, Silver Point, Davidson Kempner, King Street, Elliott', description: 'The top distressed credit funds hire continuously as the default cycle accelerates. Senior distressed analysts with restructuring + LME experience earn $400K-$1M+. Pod-shop distressed pods (Millennium Distressed, Citadel Credit, Point72 Distressed) are alternative tracks. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'High' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),

  special_situations_analyst: pool(
    { title: 'Build a Cross-Strategy Special-Sits Portfolio (Spinoffs, Activism, Stubs, Capital Structure)', description: 'Special situations analysts who cover the full opportunity set (spinoffs, post-bankruptcy equity, activist targets, capital structure arb, liquidations, SPAC arb, regulatory event plays) command premium offers. Document 24-month pitch portfolio across 5+ situation types with attribution. Top funds: Baupost, Elliott, Third Point, Pershing Square, ValueAct, JANA Partners, Mangrove, Sachem Head.', layerFocus: 'L3 · Reputation', riskReductionPct: 34, deadline: '90 days', priority: 'Critical' },
    { title: 'Master Activist Campaign Mechanics + Proxy-Fight Frameworks', description: 'Senior special-sits analysts master activist campaign mechanics (13D mechanics, proxy fight economics, advance notice bylaws, universal proxy card rules). Study the recent ValueAct / Salesforce, Pershing / Universal Music, and Elliott campaigns for framework. This expertise unlocks senior activist analyst seats at $300K-$500K base + carry.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '120 days', priority: 'High' },
    { title: 'Apply to Baupost, Elliott, Third Point, Pershing Square, ValueAct, JANA, Sachem Head', description: 'The top special situations / activist funds hire continuously for analysts with cross-strategy fluency. Senior analysts earn $400K-$2M+ depending on carry structure. Pod-shop special situations pods (Citadel Surveyor, Millennium, Verition, ExodusPoint) are alternative tracks. Apply within 14 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_QAH_NETWORKING.senior.high[0], A_QAH_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_QUANT_ASSET_HEDGE: Record<string, { canonicalKey: string; displayRole: string }> = {
  'quant researcher': { canonicalKey: 'quant_researcher', displayRole: 'Quantitative Researcher' },
  'quantitative researcher': { canonicalKey: 'quant_researcher', displayRole: 'Quantitative Researcher' },
  'alpha researcher': { canonicalKey: 'quant_researcher', displayRole: 'Alpha Researcher' },
  'quant research analyst': { canonicalKey: 'quant_researcher', displayRole: 'Quant Research Analyst' },
  'quant developer': { canonicalKey: 'quant_developer', displayRole: 'Quant Developer' },
  'quantitative developer': { canonicalKey: 'quant_developer', displayRole: 'Quantitative Developer' },
  'quant dev': { canonicalKey: 'quant_developer', displayRole: 'Quant Developer' },
  'trading systems engineer': { canonicalKey: 'quant_developer', displayRole: 'Trading Systems Engineer' },
  'algo trader': { canonicalKey: 'algo_trader', displayRole: 'Algorithmic Trader' },
  'algorithmic trader': { canonicalKey: 'algo_trader', displayRole: 'Algorithmic Trader' },
  'systematic trader': { canonicalKey: 'algo_trader', displayRole: 'Systematic Trader' },
  'quant trader': { canonicalKey: 'algo_trader', displayRole: 'Quantitative Trader' },
  'risk quant': { canonicalKey: 'risk_quant', displayRole: 'Risk Quant' },
  'quantitative risk analyst': { canonicalKey: 'risk_quant', displayRole: 'Quantitative Risk Analyst' },
  'market risk quant': { canonicalKey: 'risk_quant', displayRole: 'Market Risk Quant' },
  'frtb modeler': { canonicalKey: 'risk_quant', displayRole: 'FRTB Modeler' },
  'market making engineer': { canonicalKey: 'market_making_engineer', displayRole: 'Market Making Engineer' },
  'market maker': { canonicalKey: 'market_making_engineer', displayRole: 'Market Maker' },
  'execution trader': { canonicalKey: 'market_making_engineer', displayRole: 'Execution Trader' },
  'microstructure engineer': { canonicalKey: 'market_making_engineer', displayRole: 'Microstructure Engineer' },
  'stat arb researcher': { canonicalKey: 'stat_arb_researcher', displayRole: 'Statistical Arbitrage Researcher' },
  'statistical arbitrage researcher': { canonicalKey: 'stat_arb_researcher', displayRole: 'Statistical Arbitrage Researcher' },
  'stat arb quant': { canonicalKey: 'stat_arb_researcher', displayRole: 'Stat Arb Quant' },
  'portfolio manager': { canonicalKey: 'portfolio_manager', displayRole: 'Portfolio Manager' },
  'pm': { canonicalKey: 'portfolio_manager', displayRole: 'Portfolio Manager (PM)' },
  'investment manager': { canonicalKey: 'portfolio_manager', displayRole: 'Investment Manager' },
  'etf specialist': { canonicalKey: 'etf_specialist', displayRole: 'ETF Specialist' },
  'etf capital markets': { canonicalKey: 'etf_specialist', displayRole: 'ETF Capital Markets' },
  'etf product manager': { canonicalKey: 'etf_specialist', displayRole: 'ETF Product Manager' },
  'fixed income trader': { canonicalKey: 'fixed_income_trader', displayRole: 'Fixed Income Trader' },
  'credit trader': { canonicalKey: 'fixed_income_trader', displayRole: 'Credit Trader' },
  'rates trader': { canonicalKey: 'fixed_income_trader', displayRole: 'Rates Trader' },
  'bond trader': { canonicalKey: 'fixed_income_trader', displayRole: 'Bond Trader' },
  'equity research analyst': { canonicalKey: 'equity_research_analyst', displayRole: 'Equity Research Analyst' },
  'buy side equity analyst': { canonicalKey: 'equity_research_analyst', displayRole: 'Buy-Side Equity Analyst' },
  'sell side equity analyst': { canonicalKey: 'equity_research_analyst', displayRole: 'Sell-Side Equity Analyst' },
  'equity analyst': { canonicalKey: 'equity_research_analyst', displayRole: 'Equity Analyst' },
  'multi asset strategist': { canonicalKey: 'multi_asset_strategist', displayRole: 'Multi-Asset Strategist' },
  'asset allocator': { canonicalKey: 'multi_asset_strategist', displayRole: 'Asset Allocator' },
  'gtaa pm': { canonicalKey: 'multi_asset_strategist', displayRole: 'GTAA Portfolio Manager' },
  'esg analyst': { canonicalKey: 'esg_analyst', displayRole: 'ESG Analyst' },
  'sustainable investing analyst': { canonicalKey: 'esg_analyst', displayRole: 'Sustainable Investing Analyst' },
  'climate risk analyst': { canonicalKey: 'esg_analyst', displayRole: 'Climate Risk Analyst' },
  'long short equity analyst': { canonicalKey: 'long_short_equity_analyst', displayRole: 'Long/Short Equity Analyst' },
  'l s analyst': { canonicalKey: 'long_short_equity_analyst', displayRole: 'L/S Equity Analyst' },
  'hedge fund analyst': { canonicalKey: 'long_short_equity_analyst', displayRole: 'Hedge Fund Analyst' },
  'event driven analyst': { canonicalKey: 'event_driven_analyst', displayRole: 'Event-Driven Analyst' },
  'merger arb analyst': { canonicalKey: 'event_driven_analyst', displayRole: 'Merger Arb Analyst' },
  'risk arb analyst': { canonicalKey: 'event_driven_analyst', displayRole: 'Risk Arb Analyst' },
  'macro trader': { canonicalKey: 'macro_trader', displayRole: 'Macro Trader' },
  'global macro pm': { canonicalKey: 'macro_trader', displayRole: 'Global Macro PM' },
  'rates macro trader': { canonicalKey: 'macro_trader', displayRole: 'Rates Macro Trader' },
  'distressed credit analyst': { canonicalKey: 'distressed_credit_analyst', displayRole: 'Distressed Credit Analyst' },
  'distressed debt analyst': { canonicalKey: 'distressed_credit_analyst', displayRole: 'Distressed Debt Analyst' },
  'restructuring analyst': { canonicalKey: 'distressed_credit_analyst', displayRole: 'Restructuring Analyst' },
  'special situations analyst': { canonicalKey: 'special_situations_analyst', displayRole: 'Special Situations Analyst' },
  'activist analyst': { canonicalKey: 'special_situations_analyst', displayRole: 'Activist Analyst' },
  'spinoff analyst': { canonicalKey: 'special_situations_analyst', displayRole: 'Spinoff Analyst' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_QUANT_ASSET_HEDGE: Record<string, string> = {
  quant_researcher: 'quant_researcher', quant_developer: 'quant_developer',
  algo_trader: 'algo_trader', risk_quant: 'risk_quant',
  market_making_engineer: 'market_making_engineer', stat_arb_researcher: 'stat_arb_researcher',
  portfolio_manager: 'portfolio_manager', etf_specialist: 'etf_specialist',
  fixed_income_trader: 'fixed_income_trader', equity_research_analyst: 'equity_research_analyst',
  multi_asset_strategist: 'multi_asset_strategist', esg_analyst: 'esg_analyst',
  long_short_equity_analyst: 'long_short_equity_analyst', event_driven_analyst: 'event_driven_analyst',
  macro_trader: 'macro_trader', distressed_credit_analyst: 'distressed_credit_analyst',
  special_situations_analyst: 'special_situations_analyst',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_QUANT_ASSET_HEDGE: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  quant_researcher:           { roleKey: 'quant_researcher',           roleName: 'Quantitative Researcher',          demandIndex: 94, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 110, yoyJobOpeningsChange: 24, topHiringLocations: ['New York NY', 'Chicago IL', 'Stamford CT', 'London', 'Hong Kong'],            aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Acute Citadel/Jane Street/Two Sigma/Renaissance/DE Shaw demand. PhD physics/math/CS preferred. Comp = base $200-350K + bonus $150-500K. Top performers build the AI; not displaced by it.' },
  quant_developer:            { roleKey: 'quant_developer',            roleName: 'Quant Developer',                   demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 75,  yoyJobOpeningsChange: 22, topHiringLocations: ['New York NY', 'Chicago IL', 'Stamford CT', 'London', 'Singapore'],          aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'kdb+/q + C++ + Python stack at Citadel Securities, Jane Street, HRT, Jump, Tower, SIG, Susquehanna. Total comp $275-580K.' },
  algo_trader:                { roleKey: 'algo_trader',                roleName: 'Algorithmic Trader',                demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95,  yoyJobOpeningsChange: 18, topHiringLocations: ['New York NY', 'Chicago IL', 'Stamford CT', 'London', 'Hong Kong'],          aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Pod-shop seat market remains tight; Sharpe > 2 commands $200-350K base + $200K-1.5M+ bonus. Claw-back structure standard.' },
  risk_quant:                 { roleKey: 'risk_quant',                 roleName: 'Risk Quant',                        demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 70,  yoyJobOpeningsChange: 26, topHiringLocations: ['New York NY', 'London', 'Chicago IL', 'Frankfurt', 'Singapore'],            aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Post-FRTB regulation driving acute hiring at all G-SIBs and large asset managers. Buy-side pivot adds 40-60% comp uplift.' },
  market_making_engineer:     { roleKey: 'market_making_engineer',     roleName: 'Market Making Engineer',            demandIndex: 92, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 105, yoyJobOpeningsChange: 20, topHiringLocations: ['New York NY', 'Chicago IL', 'Amsterdam', 'London', 'Hong Kong'],            aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Citadel Securities, Jane Street, HRT, Jump, Tower, SIG, Susquehanna, IMC, Optiver, Virtu — chronic shortage of nanosecond-latency C++ specialists.' },
  stat_arb_researcher:        { roleKey: 'stat_arb_researcher',        roleName: 'Statistical Arbitrage Researcher',  demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 100, yoyJobOpeningsChange: 20, topHiringLocations: ['New York NY', 'Stamford CT', 'Chicago IL', 'London', 'Boston MA'],          aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Two Sigma, AQR, DE Shaw, Renaissance RIEF, Acadian recruit continuously. Capacity-constrained alpha; senior researchers $400K-$1M+.' },
  portfolio_manager:          { roleKey: 'portfolio_manager',          roleName: 'Portfolio Manager',                 demandIndex: 82, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 130, yoyJobOpeningsChange: 6,  topHiringLocations: ['New York NY', 'Boston MA', 'Stamford CT', 'San Francisco CA', 'London'],     aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Top long-only PMs $500K-$1.5M; pod-shop PMs $1M-$10M+ on successful book. CFA Charterholder strongly preferred. AUM consolidation favors top-quartile.' },
  etf_specialist:             { roleKey: 'etf_specialist',             roleName: 'ETF Specialist',                    demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 45,  yoyJobOpeningsChange: 8,  topHiringLocations: ['New York NY', 'San Francisco CA', 'Boston MA', 'Philadelphia PA', 'Chicago IL'], aiSubstitutionRisk: 0.36, dataQuarter: '2026-Q1', calibrationNote: 'Routine ETF operations under automation pressure; pivot to capital markets / product development (active ETFs). Issuers: iShares, Vanguard, SPDR, Invesco, ARK.' },
  fixed_income_trader:        { roleKey: 'fixed_income_trader',        roleName: 'Fixed Income Trader',               demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 85,  yoyJobOpeningsChange: 12, topHiringLocations: ['New York NY', 'Newport Beach CA', 'London', 'Boston MA', 'Stamford CT'],     aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1', calibrationNote: 'Credit specialists outpacing rates. PIMCO, BlackRock, AllianceBernstein, T. Rowe Price, Loomis Sayles. Pod-shop credit pods 50-100% comp uplift.' },
  equity_research_analyst:    { roleKey: 'equity_research_analyst',    roleName: 'Equity Research Analyst',           demandIndex: 76, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 60,  yoyJobOpeningsChange: 2,  topHiringLocations: ['New York NY', 'Boston MA', 'San Francisco CA', 'Baltimore MD', 'London'],    aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1', calibrationNote: 'Sell-side contracting under MiFID II + AI augmentation. Buy-side stable. Pod-shop fundamental analyst seats premium. CFA Charter preferred. Base $150-275K + bonus $100-275K.' },
  multi_asset_strategist:     { roleKey: 'multi_asset_strategist',     roleName: 'Multi-Asset Strategist',            demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 90,  yoyJobOpeningsChange: 12, topHiringLocations: ['New York NY', 'Boston MA', 'Newport Beach CA', 'Westport CT', 'London'],     aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'BlackRock GTAA, PIMCO MA, AllianceBernstein, Bridgewater, AQR. Risk-parity + vol-targeting + tactical overlay frameworks differentiator.' },
  esg_analyst:                { roleKey: 'esg_analyst',                roleName: 'ESG Analyst',                       demandIndex: 70, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable', timeToFillDays: 50,  yoyJobOpeningsChange: -6, topHiringLocations: ['New York NY', 'London', 'Amsterdam', 'San Francisco CA', 'Boston MA'],       aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1', calibrationNote: 'Post-greenwashing softening; data-collection automation pressure. Survivors pivot to climate-risk quant or single-issue specialist. BlackRock Sustainable, Wellington Climate, T. Rowe Impact.' },
  long_short_equity_analyst:  { roleKey: 'long_short_equity_analyst',  roleName: 'Long/Short Equity Analyst',         demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95,  yoyJobOpeningsChange: 16, topHiringLocations: ['New York NY', 'Stamford CT', 'Boston MA', 'San Francisco CA', 'London'],     aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Pod shops + activist + TMT-specific funds. Citadel Surveyor, Point72, Balyasny, ExodusPoint, Millennium, Pershing Square, Greenlight, Third Point. Base $200-400K + variable carry.' },
  event_driven_analyst:       { roleKey: 'event_driven_analyst',       roleName: 'Event-Driven Analyst',              demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 85,  yoyJobOpeningsChange: 15, topHiringLocations: ['New York NY', 'Stamford CT', 'Greenwich CT', 'Chicago IL', 'London'],         aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Merger arb / spinoff / restructuring market active. Pentwater, Magnetar, Sachem Head, HBK, Citadel Event Driven, Millennium Merger Arb. Regulatory expertise = premium.' },
  macro_trader:               { roleKey: 'macro_trader',               roleName: 'Macro Trader',                      demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 120, yoyJobOpeningsChange: 14, topHiringLocations: ['New York NY', 'Westport CT', 'London', 'Hong Kong', 'Singapore'],            aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Bridgewater, Brevan Howard, Element, Caxton, Tudor, Moore, Rokos, Citadel Macro, Millennium Macro, ExodusPoint Macro. Top performers $500K-$10M+. Carry-share standard.' },
  distressed_credit_analyst:  { roleKey: 'distressed_credit_analyst',  roleName: 'Distressed Credit Analyst',         demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 90,  yoyJobOpeningsChange: 22, topHiringLocations: ['New York NY', 'Greenwich CT', 'Stamford CT', 'Los Angeles CA', 'London'],   aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Rates cycle pivot driving default-cycle hiring. Oaktree, Apollo, Centerbridge, Silver Point, Davidson Kempner, King Street, Elliott Distressed, Baupost. Base $200-380K + bonus $150-700K.' },
  special_situations_analyst: { roleKey: 'special_situations_analyst', roleName: 'Special Situations Analyst',        demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95,  yoyJobOpeningsChange: 14, topHiringLocations: ['New York NY', 'Boston MA', 'Greenwich CT', 'San Francisco CA', 'London'],   aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Cross-strategy (spinoff, activism, stub, cap structure) generalists in demand. Baupost, Elliott, Third Point, Pershing Square, ValueAct, JANA, Sachem Head.' },
};

// ── COMPENSATION ADDITIONS (2026 US BASE only; carry/perf bonus separate per calibrationNote) ──

export const COMPENSATION_ADDITIONS_QUANT_ASSET_HEDGE: Record<string, Record<string, number>> = {
  quant_researcher:           { '0-2': 200_000, '2-5': 250_000, '5-10': 300_000, '10-15': 335_000, '15+': 365_000 },
  quant_developer:            { '0-2': 175_000, '2-5': 215_000, '5-10': 250_000, '10-15': 275_000, '15+': 295_000 },
  algo_trader:                { '0-2': 200_000, '2-5': 250_000, '5-10': 300_000, '10-15': 335_000, '15+': 365_000 },
  risk_quant:                 { '0-2': 140_000, '2-5': 175_000, '5-10': 220_000, '10-15': 265_000, '15+': 310_000 },
  market_making_engineer:     { '0-2': 200_000, '2-5': 260_000, '5-10': 325_000, '10-15': 380_000, '15+': 425_000 },
  stat_arb_researcher:        { '0-2': 200_000, '2-5': 250_000, '5-10': 305_000, '10-15': 340_000, '15+': 370_000 },
  portfolio_manager:          { '0-2': 250_000, '2-5': 325_000, '5-10': 400_000, '10-15': 460_000, '15+': 515_000 },
  etf_specialist:             { '0-2': 95_000,  '2-5': 130_000, '5-10': 170_000, '10-15': 210_000, '15+': 245_000 },
  fixed_income_trader:        { '0-2': 175_000, '2-5': 220_000, '5-10': 275_000, '10-15': 330_000, '15+': 380_000 },
  equity_research_analyst:    { '0-2': 150_000, '2-5': 185_000, '5-10': 225_000, '10-15': 255_000, '15+': 280_000 },
  multi_asset_strategist:     { '0-2': 165_000, '2-5': 210_000, '5-10': 260_000, '10-15': 305_000, '15+': 345_000 },
  esg_analyst:                { '0-2': 90_000,  '2-5': 120_000, '5-10': 155_000, '10-15': 185_000, '15+': 215_000 },
  long_short_equity_analyst:  { '0-2': 200_000, '2-5': 260_000, '5-10': 320_000, '10-15': 365_000, '15+': 405_000 },
  event_driven_analyst:       { '0-2': 195_000, '2-5': 255_000, '5-10': 315_000, '10-15': 360_000, '15+': 400_000 },
  macro_trader:               { '0-2': 250_000, '2-5': 325_000, '5-10': 400_000, '10-15': 460_000, '15+': 515_000 },
  distressed_credit_analyst:  { '0-2': 200_000, '2-5': 255_000, '5-10': 310_000, '10-15': 350_000, '15+': 385_000 },
  special_situations_analyst: { '0-2': 195_000, '2-5': 255_000, '5-10': 315_000, '10-15': 360_000, '15+': 400_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_QUANT_ASSET_HEDGE: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  quant_researcher: {
    strongOpener: 'I want to discuss my compensation in the context of senior quant researcher market rates in 2026. With [X SSRN/arXiv publications + Y deployed alpha factors with measurable P&L contribution], I\'m operating at the senior research level commanding $400K-$600K total comp at Citadel GQS / Two Sigma / Jane Street Quant Research.',
    leverageContext: 'Per Selby Jennings / Oxbridge Search 2026 quant comp benchmark, senior quant researchers with publication record + production alpha contribution earn $200-350K base + $150-500K bonus. My specific contributions: [factor X deployed at Y capacity / paper on Z published on SSRN / model improvement Sharpe lift]. Replacement cost: 9-12 months minimum for a researcher with my specific specialty.',
    countersScript: 'I\'m asking for $X base (75th percentile per benchmark), a meaningful bonus uplift tied to deployed-alpha P&L attribution, and protected research time (1 day/week + conference budget for NeurIPS / Real World Risk / SQA). If full base isn\'t possible, I\'ll accept a documented 6-month review with explicit comp triggers.',
    walkAwayLine: 'I have active conversations with [Citadel GQS / Two Sigma / Jane Street Quant Research / Renaissance] at substantially higher comp. I\'d prefer to continue the work we\'ve started here, but the gap to market is meaningful — I need to see real movement.',
  },
  quant_developer: {
    strongOpener: 'I\'d like to align my compensation with senior quant dev market rates. With my kdb+/q + C++/Python stack and [low-latency project / market-making system contribution / production tick database work], I\'m at the senior level commanding $300-450K total comp at Citadel Securities / Jane Street / HRT.',
    leverageContext: 'Senior quant devs with proven kdb+ + low-latency C++ experience are sub-3,000 globally per KX Academy / industry estimates. My contributions: [specific system, throughput/latency numbers, downtime SLOs achieved]. Replacement cost: 6-9 months. Jump, Tower, SIG, and Susquehanna are recruiting at $275-580K total comp for my profile.',
    countersScript: 'I\'m asking for $X base (75th percentile), a meaningful bonus pool participation tied to system-level P&L attribution, and budget for KX Academy advanced courses + conference attendance (kdb+ Forum, Real-Time Conf).',
    walkAwayLine: 'I have an offer from [Jane Street / Citadel Securities / HRT] at meaningfully higher total comp. The work here has been excellent — I need to see meaningful movement to stay.',
  },
  algo_trader: {
    strongOpener: 'After [X months/years] running my book with [Y Sharpe ratio above benchmark / Z% return / W max drawdown], I want to discuss capacity expansion and compensation alignment with the pod-shop algo trader market.',
    leverageContext: 'My P&L attribution this period: [specific Sharpe, max drawdown, return, capacity utilization]. Pod-shop benchmarks: Millennium / Citadel / Point72 PMs with Sharpe > 2 receive 15-30% capacity increases + carry-share bonus structure. Balyasny and ExodusPoint are actively recruiting at $300K-$500K base + 8-12% of P&L above hurdle.',
    countersScript: 'I\'m asking for capacity expansion from $X to $Y (per Sharpe-justified scaling), a documented carry-share structure on book P&L above hurdle, and protected research/data budget for new alpha sources.',
    walkAwayLine: 'I have inbound from [Millennium / Citadel / Point72 / Balyasny / ExodusPoint] at substantially higher total comp + larger book. The infrastructure here has been excellent — but I need to see real movement on capacity + carry.',
  },
  portfolio_manager: {
    strongOpener: 'I want to align my compensation with the 2026 PM market, given my [36-month Sharpe / IR vs. benchmark / AUM growth]. Top long-only PMs at peer firms (BlackRock / Fidelity / T. Rowe / Wellington) earn $500K-$1.5M+ total comp; pod-shop PMs with similar Sharpe earn $1M-$10M+.',
    leverageContext: 'My specific track record: [Sharpe X / IR Y / AUM growth Z / outperformance vs. benchmark]. CFA Charterholder + [tenure] + [book size] places me at the top quartile per the Morningstar / Greenwich Associates PM compensation surveys. Replacement cost: 12-18 months + likely client outflows during transition.',
    countersScript: 'I\'m asking for base of $X (75th percentile for peer-fund PMs with my AUM + Sharpe), an explicit carry-share or P&L-linked bonus structure (5-12% of book P&L above benchmark), and documented MD-track partnership path.',
    walkAwayLine: 'I have approaches from [pod shop X / peer firm Y / boutique multi-strategy Z] at substantially higher total comp with meaningful carry-share. The client relationships here matter to me — but the gap to market needs to close.',
  },
  long_short_equity_analyst: {
    strongOpener: 'After [X months] of documented pitch track record with [Y pitches / Z hit rate / W P&L attribution], I want to discuss progression to sub-PM seat or single-name book structure, plus comp alignment with senior L/S analyst market.',
    leverageContext: 'My contributions: [specific pitches, sized P&L, hit rate, idea-generation cadence]. Senior L/S analysts with documented track records at pod shops (Millennium / Citadel Surveyor / Point72 / Balyasny / ExodusPoint) earn $200-400K base + variable carry = $400K-$2M+. Sub-PM seats with $50M-$200M single-name books unlock $1M+ outcomes.',
    countersScript: 'I\'m asking for base of $X, a documented sub-PM track with $Y book at month 6/12, and an explicit carry-share structure (8-15% of book P&L) once sub-PM. If sub-PM track isn\'t available, I\'ll accept a meaningful base + bonus uplift with documented review in 6 months.',
    walkAwayLine: 'I have inbound from [pod shop / activist fund / sector specialist fund] with explicit sub-PM track + carry. The investment process here is something I value — but I need to see real progression to sub-PM seat.',
  },
  macro_trader: {
    strongOpener: 'I want to discuss MD-track partnership and compensation alignment, given my [24-36 month] macro track record: [Sharpe X, max drawdown Y, cross-asset attribution Z]. Top macro traders at peer funds (Bridgewater / Brevan Howard / Element / Rokos / Citadel Macro / Millennium Macro) earn $500K-$10M+ with carry-share structures.',
    leverageContext: 'Specific contributions: [pre-trade theses documented, P&L attribution by asset class, Sharpe sustained, drawdown discipline]. Replacement cost for a senior macro trader with my specific style edge: 12-24 months + likely loss of cross-asset book continuity. Element / Caxton / Tudor / Moore are actively recruiting senior macro at $250-500K base + 10-20% of book P&L.',
    countersScript: 'I\'m asking for base of $X (75th percentile per Selby Jennings macro benchmark), a documented carry-share structure of Y% of book P&L above hurdle with claw-back, MD-track partnership path documented at month 18, and protected research/data budget.',
    walkAwayLine: 'I have active conversations with [Brevan Howard / Element / Rokos / pod-shop macro pod] at substantially higher total comp + larger book + explicit MD-track. The platform here has been valuable — but the gap to market on carry is meaningful.',
  },
  distressed_credit_analyst: {
    strongOpener: 'I want to align my compensation with the senior distressed credit market in 2026. Given the rates-cycle pivot and acute hiring at Oaktree / Apollo / Centerbridge / Silver Point / Davidson Kempner / King Street, senior distressed analysts with restructuring + LME experience earn $400K-$1M+.',
    leverageContext: 'My contributions this period: [specific workouts, restructuring outcomes, LME case studies, IRR on situations]. Per the 2026 Greenwich Associates credit comp benchmark, senior distressed analysts with my profile earn $200-380K base + $150-700K bonus. Replacement cost: 9-12 months given workout depth.',
    countersScript: 'I\'m asking for base of $X, a meaningful bonus uplift tied to situation P&L attribution, and documented progression to PM-track partnership at month 24.',
    walkAwayLine: 'I have inbound from [Oaktree / Apollo Credit / Centerbridge / pod-shop credit pod] at substantially higher total comp. I value the team here — but the gap to market on senior distressed comp is meaningful.',
  },
  equity_research_analyst: {
    strongOpener: 'I\'d like to discuss my compensation in the context of the 2026 buy-side equity research market. With CFA Charter + [SumZero / VIC pitch portfolio / 36-month documented pitches], I\'m at the senior analyst level commanding $250-400K total comp at peer buy-side firms.',
    leverageContext: 'My contributions: [specific pitches, sized P&L attribution, sector framework published]. Buy-side equity analysts at BlackRock / Fidelity / T. Rowe / Wellington / Capital Group with my profile earn $150-275K base + $100-275K bonus. Pod-shop fundamental analyst seats add 50-100% comp uplift. Replacement cost: 9-12 months minimum.',
    countersScript: 'I\'m asking for base of $X (75th percentile), an explicit bonus structure tied to pitch P&L attribution, CFA cycle support, and documented sub-PM track at month 18 if pitches sustain.',
    walkAwayLine: 'I have inbound from [pod shop fundamental / peer buy-side firm / boutique L/S fund]. The platform here is something I value — but I need to see real movement on base + sub-PM progression.',
  },
  market_making_engineer: {
    strongOpener: 'I want to align my comp with the 2026 senior market-making engineer market. With my C++ low-latency stack + [microstructure expertise / FPGA-adjacent work / specific system contribution], I\'m at the senior level commanding $400K-$700K total comp at Citadel Securities / Jane Street / HRT / Jump.',
    leverageContext: 'Senior market-making engineers with proven nanosecond-latency work are the scarcest profile in finance. My specific contributions: [throughput, latency, toxic flow detection, P&L attribution to system improvements]. Replacement cost: 12+ months. Tower / SIG / Susquehanna / IMC / Optiver are recruiting at $300-600K base.',
    countersScript: 'I\'m asking for base of $X, bonus pool participation tied to system-level P&L attribution (typical 8-15% of attributed P&L), and budget for hardware/co-location experimentation.',
    walkAwayLine: 'I have an offer from [Citadel Securities / Jane Street / HRT / Jump] at meaningfully higher total comp. The team here is something I value — but the gap on base + bonus structure needs to close.',
  },
  stat_arb_researcher: {
    strongOpener: 'I\'d like to discuss compensation alignment with the senior stat-arb research market. With [Y published papers + Z deployed factors with measurable Sharpe contribution], I\'m at the senior level commanding $400K-$1M+ total comp at Two Sigma / AQR / DE Shaw / Renaissance RIEF.',
    leverageContext: 'My contributions: [specific factors deployed, Sharpe contribution, capacity utilization, deflated-Sharpe replication studies]. Per Selby Jennings 2026 quant benchmark, senior stat-arb researchers with publication record + production alpha earn $200-350K base + $150-500K bonus. Replacement cost: 9-15 months.',
    countersScript: 'I\'m asking for base of $X, a meaningful bonus pool participation tied to deployed-factor Sharpe contribution, protected research time (1 day/week + SSRN publication time), and conference budget.',
    walkAwayLine: 'I have active conversations with [Two Sigma / AQR / DE Shaw / Renaissance RIEF / Acadian] at substantially higher comp. I value the team here — but the gap on senior stat-arb comp is real.',
  },
  risk_quant: {
    strongOpener: 'I want to align my compensation with the senior risk quant market. With my FRTB IMA + SA-CCR + scenario design expertise, I\'m at the senior level commanding $250-400K total comp at peer G-SIBs and pod-shop risk teams.',
    leverageContext: 'Post-FRTB regulation is driving acute demand. My specific contributions: [IMA model implementation, expected shortfall calibration, DRC modeling, scenario design]. Replacement cost: 9-12 months. Pod-shop risk teams (Millennium / Citadel / Point72) compensate 40-60% above bank risk quant — direct leverage point.',
    countersScript: 'I\'m asking for base of $X (75th percentile per FRTB-experienced risk quant benchmark), bonus pool participation, and conference budget (PRMIA / GARP / Risk Magazine events).',
    walkAwayLine: 'I have inbound from [Millennium Risk / Citadel Risk / Point72 / peer G-SIB] at substantially higher total comp. The team here matters to me — but the gap to buy-side risk quant comp is meaningful.',
  },
  event_driven_analyst: {
    strongOpener: 'After [X months] of documented merger arb / event-driven track record with [Y spread capture / Z deal P&L], I want to discuss comp alignment with the senior event-driven analyst market.',
    leverageContext: 'My contributions: [specific deals worked, regulatory case studies, spread capture / IRR]. Senior event-driven analysts at Pentwater / Magnetar / Sachem Head / HBK / Citadel Event Driven / Millennium Merger Arb earn $200-400K base + variable carry = $400K-$2M+. Regulatory expertise (FTC / EU DG-COMP / CFIUS) adds 30-40% premium.',
    countersScript: 'I\'m asking for base of $X, an explicit carry-share structure on book P&L, and documented sub-PM track at month 18 if track record sustains.',
    walkAwayLine: 'I have inbound from [Pentwater / Magnetar / Sachem Head / pod-shop event-driven pod] at substantially higher total comp. I value the team here — but I need to see real movement on base + carry.',
  },
  special_situations_analyst: {
    strongOpener: 'After [X months] of cross-strategy special-sits pitch track record with [Y pitches / Z hit rate / W P&L attribution], I want to discuss compensation alignment with the senior special-sits market.',
    leverageContext: 'My contributions: [specific pitches across spinoff / activist / cap structure / stub situations]. Senior special-sits analysts at Baupost / Elliott / Third Point / Pershing Square / ValueAct / JANA / Sachem Head earn $200-400K base + variable carry = $400K-$2M+. Cross-strategy fluency commands 20-30% premium over single-strategy specialists.',
    countersScript: 'I\'m asking for base of $X, an explicit carry-share structure tied to pitch P&L attribution, and documented sub-PM / partner-track path at month 24.',
    walkAwayLine: 'I have inbound from [Baupost / Elliott / Third Point / pod-shop special-sits pod] at substantially higher total comp. The platform here is something I value — but the gap to senior special-sits comp is real.',
  },
};
