import { CareerIntelligence } from './types.ts';

export const FINANCE_INTELLIGENCE: Record<string, CareerIntelligence> = {
  fin_account: {
    displayRole: 'Accountant',
    summary: 'High resilience in advisory and tax strategy; high disruption in routine bookkeeping.',
    skills: {
      obsolete: [{ skill: 'Routine bookkeeping', riskScore: 94, riskType: 'Automatable', horizon: '1-2yr', reason: 'ERP systems with AI auto-categorize 99% of transactions.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard financial statements', riskScore: 78, riskType: 'Augmented', horizon: '1-3yr', reason: 'AI generates statements; humans verify compliance.', aiReplacement: 'Partial' }],
      safe: [{ skill: 'Strategic Tax Advisory', whySafe: 'Navigating global tax intent requires human wisdom.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'CFO Advisor', riskReduction: 58, skillGap: 'Business strategy, Capital planning', transitionDifficulty: 'Hard', industryMapping: ['SME'], salaryDelta: '+50-100%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 41, label: '+1yr' }, { year: 2026, riskScore: 48, label: '+2yr' }, { year: 2027, riskScore: 54, label: '+3yr' }, { year: 2028, riskScore: 60, label: '+4yr' }],
    confidenceScore: 94,
  },
  fin_audit: {
    displayRole: 'Auditor',
    summary: 'High resilience in procedural judgment; extreme disruption in data verification.',
    skills: {
      obsolete: [{ skill: 'Transaction vouching', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI tests 100% of transactions vs 5% human sampling.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard internal control testing for low-risk processes", "riskScore": 82, "riskType": "Automatable", "horizon": "2yr", "reason": "AI audit tools auto-run continuous controls testing on transaction logs, reducing need for manual sampling.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Professional Skepticism', whySafe: 'Challenging management requires human authority.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Auditor', riskReduction: 62, skillGap: 'CISA, bias checking', transitionDifficulty: 'Hard', industryMapping: ['Big 4'], salaryDelta: '+40-70%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 48, label: 'Now' }, { year: 2025, riskScore: 54, label: '+1yr' }, { year: 2026, riskScore: 59, label: '+2yr' }, { year: 2027, riskScore: 65, label: '+3yr' }, { year: 2028, riskScore: 70, label: '+4yr' }],
    confidenceScore: 94,
  },
  inv_ibanking: {
    displayRole: 'Investment Banker (Associate)',
    summary: 'High resilience in deal negotiation; high disruption in pitchbook prep.',
    skills: {
      obsolete: [{ skill: 'Pitchbook generation', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI auto-populates market maps and transaction history.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard precedent transaction and comparable company analysis", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI financial analysis platforms auto-pull and normalize comps from databases in minutes.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Client Relationship Management', whySafe: 'Winning the mandate requires human trust.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Private Equity Associate', riskReduction: 50, skillGap: 'Operations, Portfolio management', transitionDifficulty: 'Hard', industryMapping: ['Buy-side'], salaryDelta: '+50-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 30, label: 'Now' }, { year: 2025, riskScore: 36, label: '+1yr' }, { year: 2026, riskScore: 41, label: '+2yr' }, { year: 2027, riskScore: 47, label: '+3yr' }, { year: 2028, riskScore: 52, label: '+4yr' }],
    confidenceScore: 95,
  },
  fin_tax: {
    displayRole: 'Tax Specialist',
    summary: 'High resilience in complex filing; disruption in standard compliance.',
    skills: {
      obsolete: [{ skill: 'Standard individual tax prep', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI auto-files standard returns.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard corporate tax return preparation for routine structures", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI tax compliance platforms auto-prepare returns from financial data for standard entities.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Controversial Tax Position Defense', whySafe: 'Defending positions before authorities requires ethical weight.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Global Tax Strategist', riskReduction: 60, skillGap: 'Cross-border reg', transitionDifficulty: 'Hard', industryMapping: ['Enterprise'], salaryDelta: '+30-60%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 41, label: '+1yr' }, { year: 2026, riskScore: 47, label: '+2yr' }, { year: 2027, riskScore: 52, label: '+3yr' }, { year: 2028, riskScore: 58, label: '+4yr' }],
    confidenceScore: 94,
  },
  fin_wealth: {
    displayRole: 'Wealth Manager',
    summary: 'High resilience due to trust and empathy requirements.',
    skills: {
      obsolete: [{ skill: 'Standard asset allocation', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'Robo-advisors optimize standard risk profiles.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard portfolio rebalancing to model allocation", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI robo-advisor systems auto-rebalance portfolios to target allocations with tax-loss harvesting.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Behavioral Coaching & Empathy', whySafe: 'Navigating family inheritance dynamics and panic prevention.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Holistic Life Planner', riskReduction: 55, skillGap: 'Psychology, Estate planning', transitionDifficulty: 'Medium', industryMapping: ['Wealth'], salaryDelta: '+20-50%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 29, label: '+1yr' }, { year: 2026, riskScore: 33, label: '+2yr' }, { year: 2027, riskScore: 36, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }],
    confidenceScore: 96,
  },
  fin_fp_analyst: {
    displayRole: 'FP&A Analyst',
    summary: 'Moderate resilience; resilience in strategic scenario modeling.',
    skills: {
      obsolete: [{ skill: 'Budget variance reporting', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI auto-identifies variances.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard monthly variance analysis reporting", "riskScore": 82, "riskType": "Automatable", "horizon": "1yr", "reason": "AI FP&A platforms auto-generate variance commentary from financial data against budget.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Scenario Synthesis', whySafe: 'Interpreting non-linear business threats into financial models.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Strategic Finance Lead', riskReduction: 52, skillGap: 'Business strategy', transitionDifficulty: 'Medium', industryMapping: ['Corporate'], salaryDelta: '+30-60%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 32, label: 'Now' }, { year: 2025, riskScore: 38, label: '+1yr' }, { year: 2026, riskScore: 44, label: '+2yr' }, { year: 2027, riskScore: 49, label: '+3yr' }, { year: 2028, riskScore: 55, label: '+4yr' }],
    confidenceScore: 94,
  },
  inv_equity_res: {
    displayRole: 'Equity Research',
    summary: 'High disruption in info-aggregation; resilience in novel insight generation.',
    skills: {
      obsolete: [{ skill: 'Earnings call summarization', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI summarizes earnings in seconds.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard earnings model updates from reported financials", "riskScore": 80, "riskType": "Automatable", "horizon": "1yr", "reason": "AI research tools auto-populate earnings models from structured financial report data.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Variant Perception Generation', whySafe: 'Developing non-consensus views based on human intuition.', longTermValue: 98, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Portfolio Manager (Active)', riskReduction: 58, skillGap: 'Risk management', transitionDifficulty: 'Hard', industryMapping: ['Asset Management'], salaryDelta: '+50-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 40, label: 'Now' }, { year: 2025, riskScore: 47, label: '+1yr' }, { year: 2026, riskScore: 54, label: '+2yr' }, { year: 2027, riskScore: 61, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 96,
  },
  fin_underwriter: {
    displayRole: 'Insurance Underwriter',
    summary: 'Extreme disruption in standard risk; resilience in bespoke risks.',
    skills: {
      obsolete: [{ skill: 'Standard risk assessment', riskScore: 99, riskType: 'Automatable', horizon: '1yr', reason: 'AI models predict loss ratios 50% better for standard risk.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard risk scoring for clean applications with complete data", "riskScore": 82, "riskType": "Augmented", "horizon": "2yr", "reason": "AI underwriting engines score standard applications automatically using predictive models.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Bespoke Cyber/Catastrophe Risk', whySafe: 'Pricing risks where no historical data exists.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Risk Tech Architect', riskReduction: 65, skillGap: 'Data science', transitionDifficulty: 'Hard', industryMapping: ['InsurTech'], salaryDelta: '+30-70%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 55, label: 'Now' }, { year: 2025, riskScore: 63, label: '+1yr' }, { year: 2026, riskScore: 72, label: '+2yr' }, { year: 2027, riskScore: 80, label: '+3yr' }, { year: 2028, riskScore: 88, label: '+4yr' }],
    confidenceScore: 98,
  },
  fin_credit_analyst: {
    displayRole: 'Credit Analyst',
    summary: 'High disruption in standard scoring; resilience in complex commercial credit.',
    skills: {
      obsolete: [{ skill: 'Routine retail credit scoring', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI analyzes credit files instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard financial ratio calculation and covenant compliance checking", "riskScore": 84, "riskType": "Automatable", "horizon": "1yr", "reason": "AI credit analysis platforms auto-calculate ratios and flag covenant breaches from financial statements.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Commercial Credit Synthesis', whySafe: 'Assessing idiosyncratic business risk.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Senior Commercial Underwriter', riskReduction: 52, skillGap: 'Portfolio risk strategy', transitionDifficulty: 'Medium', industryMapping: ['Banking'], salaryDelta: '+30-60%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 44, label: '+1yr' }, { year: 2026, riskScore: 50, label: '+2yr' }, { year: 2027, riskScore: 56, label: '+3yr' }, { year: 2028, riskScore: 62, label: '+4yr' }],
    confidenceScore: 96,
  },
  fin_banking_ops: {
    displayRole: 'Banking Operations Manager',
    summary: 'Extreme disruption in back-office processing; resilience in platform transformation.',
    skills: {
      obsolete: [{ skill: 'Transaction reconciliation', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI handles settlements and auto-reconciles breaks.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard payment reconciliation and exception flagging", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI reconciliation systems match and auto-resolve payment exceptions with near-zero manual review.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Operational Resilience & Transformation', whySafe: 'Redesigning core systems.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'FinTech Platform Director', riskReduction: 65, skillGap: 'API-led architecture', transitionDifficulty: 'Hard', industryMapping: ['FinTech'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 52, label: 'Now' }, { year: 2025, riskScore: 60, label: '+1yr' }, { year: 2026, riskScore: 69, label: '+2yr' }, { year: 2027, riskScore: 77, label: '+3yr' }, { year: 2028, riskScore: 85, label: '+4yr' }],
    confidenceScore: 98,
  },
  fin_pe: {
    displayRole: 'Private Equity Associate',
    summary: 'High resilience in complex deal negotiation.',
    skills: {
      obsolete: [{ "skill": "Manual deal sourcing spreadsheet management and CRM hygiene", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI deal sourcing platforms auto-populate and maintain deal pipelines from news and financial databases.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard portfolio company financial KPI monitoring", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI portfolio monitoring platforms auto-collect and benchmark KPIs against industry comparators.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Portfolio Operational Turnaround', whySafe: 'Implementing human-centric operational changes in companies.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Principal / Deal Partner', riskReduction: 45, skillGap: 'Deal sourcing', transitionDifficulty: 'Hard', industryMapping: ['Buy-side'], salaryDelta: '+200-500%', timeToTransition: '60 months' }],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 25, label: '+1yr' }, { year: 2026, riskScore: 29, label: '+2yr' }, { year: 2027, riskScore: 32, label: '+3yr' }, { year: 2028, riskScore: 35, label: '+4yr' }],
    confidenceScore: 97,
  },
  fin_vc: {
    displayRole: 'Venture Capital Analyst',
    summary: 'Moderate resilience; extreme disruption in early-stage due diligence.',
    skills: {
      obsolete: [{ "skill": "Manual cap table maintenance across multiple portfolio companies", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI cap table management platforms auto-maintain ownership and dilution calculations from transaction data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard pitch deck screening and market size validation", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI deal flow tools auto-screen pitches for market size, team signals, and traction patterns.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Founder Character Assessment', whySafe: 'Evaluating the "grit" and pivot-potential of first-time founders.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Growth Equity Investor', riskReduction: 55, skillGap: 'Growth metrics', transitionDifficulty: 'Medium', industryMapping: ['Buy-side'], salaryDelta: '+50-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 32, label: 'Now' }, { year: 2025, riskScore: 37, label: '+1yr' }, { year: 2026, riskScore: 41, label: '+2yr' }, { year: 2027, riskScore: 46, label: '+3yr' }, { year: 2028, riskScore: 50, label: '+4yr' }],
    confidenceScore: 95,
  },
  fin_quant: {
    displayRole: 'Quantitative Analyst',
    summary: 'High resilience in algorithmic innovation.',
    skills: {
      obsolete: [{ "skill": "Manual data cleaning of raw market data feeds for obvious errors", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI data quality tools auto-detect and correct standard market data anomalies in real-time.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard backtesting of momentum and mean-reversion strategies", "riskScore": 76, "riskType": "Augmented", "horizon": "2yr", "reason": "AI quant platforms auto-run vectorized backtests on standard strategy templates from parameter inputs.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Novel Systematic Strategy Design', whySafe: 'Designing zero-day trading strategies.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Director of Systematic Trading', riskReduction: 60, skillGap: 'Risk management', transitionDifficulty: 'Hard', industryMapping: ['Hedge Funds'], salaryDelta: '+100-400%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 21, label: '+1yr' }, { year: 2026, riskScore: 24, label: '+2yr' }, { year: 2027, riskScore: 27, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }],
    confidenceScore: 98,
  },
  fin_mergers: {
    displayRole: 'M&A Advisor',
    summary: 'High resilience in deal closing.',
    skills: {
      obsolete: [{ "skill": "Manual data room document organisation and index creation", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI due diligence platforms auto-classify, index, and surface key documents from data room uploads.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard synergy analysis for similar industry combinations", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI M&A tools generate synergy estimates from historical comparable integrations.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Deal Closing & Multi-Party Synergy', whySafe: 'Negotiating the human and cultural integration of two giant entities.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Chief Strategy Officer', riskReduction: 55, skillGap: 'Operational strategy', transitionDifficulty: 'Hard', industryMapping: ['Enterprise'], salaryDelta: '+100-200%', timeToTransition: '48 months' }],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2025, riskScore: 23, label: '+1yr' }, { year: 2026, riskScore: 26, label: '+2yr' }, { year: 2027, riskScore: 29, label: '+3yr' }, { year: 2028, riskScore: 32, label: '+4yr' }],
    confidenceScore: 98,
  },
  fin_crypto: {
    displayRole: 'Crypto Analyst',
    summary: 'High resilience in protocol logic.',
    skills: {
      obsolete: [{ "skill": "Manual transaction volume aggregation across chain explorers", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "Blockchain analytics APIs consolidate and normalise on-chain data automatically across chains.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard on-chain address clustering and exchange tagging", "riskScore": 80, "riskType": "Automatable", "horizon": "1yr", "reason": "Blockchain analytics platforms automate address clustering and entity attribution using ML.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Decentralized Protocol Governance Synthesis', whySafe: 'Analyzing the complex human-incentive alignment in novel DAO structures.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'DeFi Portfolio Architect', riskReduction: 65, skillGap: 'Smart contract security', transitionDifficulty: 'Hard', industryMapping: ['Web3'], salaryDelta: '+50-200%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 21, label: '+1yr' }, { year: 2026, riskScore: 23, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 97,
  },
  fin_forensic: {
    displayRole: 'Forensic Accountant / Fraud Investigator',
    summary: 'High resilience due to the adversary-based nature of fraud and the requirement for non-linear investigative intuition; disruption in routine pattern matching.',
    skills: {
      obsolete: [{ skill: 'Standard transaction anomaly matching', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI-agents identify 99% of routine anomalies in structured ledger data instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard journal entry analysis for common fraud patterns (round numbers, weekend entries)", "riskScore": 82, "riskType": "Automatable", "horizon": "1yr", "reason": "AI forensic accounting tools auto-flag journal entries matching known fraud indicators.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Adversarial Intuition & Fraud Reconstruction', whySafe: 'Reconstructing the "intent" behind complex, human-led multi-party evasion schemes.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Chief Audit Executive (CAE)', riskReduction: 45, skillGap: 'Enterprise risk governance, board relations', transitionDifficulty: 'Hard', industryMapping: ['Big 4 / Gov'], salaryDelta: '+50-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 15, label: '+1yr' }, { year: 2026, riskScore: 17, label: '+2yr' }, { year: 2027, riskScore: 20, label: '+3yr' }, { year: 2028, riskScore: 22, label: '+4yr' }],
    confidenceScore: 99,
  },
  fin_actuary: {
    displayRole: 'Actuary / Risk Modeler',
    summary: 'High resilience in multi-decade risk synthesis; disruption in standard morbidity/mortality table calculation.',
    skills: {
      obsolete: [{ skill: 'Standard mortality/morbidity table calculation', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI models predict cohort risk 100x more accurately based on real-time wearable data.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard reserve adequacy testing on stable loss development patterns", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI actuarial tools auto-run development triangle analysis and reserve tests on standard portfolios.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Long-Tail Tail-Risk Synthesis', whySafe: 'Developing capital reserves for "black swan" climate or biological events without historical baselines.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Chief Risk Officer (CRO)', riskReduction: 55, skillGap: 'Strategic finance, capital markets', transitionDifficulty: 'Hard', industryMapping: ['Insurance / Banking'], salaryDelta: '+100-250%', timeToTransition: '60 months' }],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 28, label: '+1yr' }, { year: 2026, riskScore: 33, label: '+2yr' }, { year: 2027, riskScore: 40, label: '+3yr' }, { year: 2028, riskScore: 45, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['finance-sector', 'ai-resilient', 'quantitative', 'long-tail-risk'],
  },

  // ── New Finance Roles ─────────────────────────────────────────────────────────
  fin_cfo: {
    displayRole: 'Chief Financial Officer (CFO)',
    summary: 'Extremely high resilience; stewardship of enterprise capital allocation and investor trust is irreducibly human.',
    skills: {
      obsolete: [{ "skill": "Manual board pack compilation from department financial submissions", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI FP&A tools auto-consolidate financial submissions and generate board-ready reporting packs.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Routine financial close consolidation', riskScore: 82, riskType: 'Automatable', horizon: '2yr', reason: 'AI-led close automation reduces manual consolidation by 80%+.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Investor & Board Trust Management', whySafe: 'Communicating financial strategy and uncertainty credibly to boards and capital markets is irreducibly human.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Enterprise Capital Allocation Strategy', whySafe: 'Deciding where to invest company capital — balancing growth, risk, and stakeholder expectations — requires human wisdom under uncertainty.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Executive Chairman / Board Director', riskReduction: 20, skillGap: 'Governance, M&A leadership, Stakeholder relations', transitionDifficulty: 'Very Hard', industryMapping: ['All sectors'], salaryDelta: '+50-300%', timeToTransition: '60 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 11, label: '+3yr' }, { year: 2028, riskScore: 13, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['finance-sector', 'ai-resilient', 'leadership-premium', 'executive', 'trust-critical'],
    evolutionHorizon: '2030',
  },
  fin_esg_analyst: {
    displayRole: 'ESG & Sustainable Finance Analyst',
    summary: 'High growth; companies need humans to navigate the rapidly shifting ESG disclosure and investment landscape.',
    skills: {
      obsolete: [{ "skill": "Manual ESG data collection from company sustainability reports", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI ESG data platforms auto-extract and normalise metrics from sustainability PDFs and filings.", "aiReplacement": "Full", "aiTool": "Clarity AI, MSCI ESG AI" }],
      at_risk: [{ skill: 'Standard ESG data aggregation', riskScore: 78, riskType: 'Augmented', horizon: '2yr', reason: 'AI ESG platforms aggregate and normalize sustainability data automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Double Materiality Assessment', whySafe: 'Determining which ESG factors are financially material AND which financial activities create material impact — requires human multi-stakeholder synthesis.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Greenwashing Risk Detection', whySafe: 'Identifying when corporate ESG disclosure language misrepresents actual impact requires adversarial human judgment.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head of Sustainable Investing', riskReduction: 35, skillGap: 'SFDR/CSRD frameworks, TCFD, Portfolio decarbonization strategy', transitionDifficulty: 'Hard', industryMapping: ['Asset Managers', 'Banks', 'Consulting'], salaryDelta: '+40-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 16, label: '+2yr' }, { year: 2027, riskScore: 15, label: '+3yr' }, { year: 2028, riskScore: 14, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['finance-sector', 'ai-resilient', 'esg', 'regulation-driven', 'high-demand'],
    evolutionHorizon: '2029',
  },
  fin_regtech: {
    displayRole: 'RegTech Implementation Lead',
    summary: 'High growth; implementing AI-powered regulatory compliance systems is itself a human-led transformation role.',
    skills: {
      obsolete: [{ "skill": "Manual AML transaction alert dispositions for standard low-risk patterns", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI AML triage tools auto-dispose low-risk alert patterns based on trained classification models.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard SAR narrative drafting from structured transaction data", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI compliance tools auto-generate SAR narratives from flagged transaction patterns.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Regulatory Technology Vendor Assessment', whySafe: 'Evaluating RegTech tools for accuracy, regulatory fit, and auditability requires human regulatory domain expertise.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Regulatory Change Impact Mapping', whySafe: 'Translating new regulatory requirements into system and process changes requires human legal-technical synthesis.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Compliance Technology Officer', riskReduction: 40, skillGap: 'CTO-level skills + compliance expertise + program management', transitionDifficulty: 'Hard', industryMapping: ['Banks', 'Insurance', 'FinTech'], salaryDelta: '+60-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 11, label: '+2yr' }, { year: 2027, riskScore: 11, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['finance-sector', 'ai-resilient', 'tech-adjacent', 'regulation-driven', 'high-demand'],
    evolutionHorizon: '2028',
  },
  fin_treasury: {
    displayRole: 'Corporate Treasurer',
    summary: 'High resilience in capital structure and FX strategy; disruption in routine cash management.',
    skills: {
      obsolete: [{ skill: 'Manual daily cash positioning', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'Treasury management systems auto-position cash across entities.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard cash position forecasting over 30-day horizon", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI treasury platforms auto-generate 30-day cash forecasts from bank feeds and AR/AP aging.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Capital Structure Optimization', whySafe: 'Balancing debt, equity, and hybrid instruments given market conditions, covenants, and rating agency expectations — requires strategic financial judgment.', longTermValue: 98, difficulty: 'High' },
        { skill: 'FX Macro Risk Strategy', whySafe: 'Designing hedging programs that reflect the company\'s strategic risk appetite across multiple currencies — not just mechanical hedging.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'CFO of Mid-Cap Company', riskReduction: 38, skillGap: 'P&L ownership, Investor relations, M&A experience', transitionDifficulty: 'Hard', industryMapping: ['Corporate All Sectors'], salaryDelta: '+50-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2026, riskScore: 33, label: '+2yr' }, { year: 2027, riskScore: 38, label: '+3yr' }, { year: 2028, riskScore: 42, label: '+4yr' }, { year: 2029, riskScore: 45, label: '+5yr' }],
    confidenceScore: 96,
    contextTags: ['finance-sector', 'moderate-risk', 'capital-markets', 'strategy-moat'],
    evolutionHorizon: '2027',
  },
  fin_family_office: {
    displayRole: 'Family Office Investment Director',
    summary: 'Extremely high resilience; managing multi-generational wealth requires irreplaceable human relationship and succession expertise.',
    skills: {
      obsolete: [{ "skill": "Manual investment statement data entry from custodian PDFs", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI document extraction tools pull structured investment data from custodian statements automatically.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard consolidated reporting across custodian statements", "riskScore": 80, "riskType": "Automatable", "horizon": "1yr", "reason": "Family office aggregation platforms auto-consolidate reporting from multiple custodians into unified dashboards.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Multi-Generational Wealth Transition', whySafe: 'Navigating the emotional, relational, and financial complexity of transferring wealth across family generations — a uniquely human advisory function.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Bespoke Alternative Asset Sourcing', whySafe: 'Accessing private market deal flow through UHNW human networks is relationship-dependent — AI cannot build the trust that creates deal access.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Founder of Single-Family Office', riskReduction: 10, skillGap: 'Principal finance experience, UHNW relationship development, Tax/Estate architecture', transitionDifficulty: 'Very Hard', industryMapping: ['Ultra-High Net Worth'], salaryDelta: '+200-1000%', timeToTransition: '60+ months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 8, label: '+2yr' }, { year: 2027, riskScore: 9, label: '+3yr' }, { year: 2028, riskScore: 10, label: '+4yr' }, { year: 2029, riskScore: 10, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['finance-sector', 'ai-resilient', 'trust-critical', 'relationship-intensive', 'executive'],
    evolutionHorizon: '2030',
  },
  fin_hedge_pm: {
    displayRole: 'Hedge Fund Portfolio Manager',
    summary: 'High resilience in systematic strategy innovation; disruption in fundamental long-only stock picking.',
    skills: {
      obsolete: [{ "skill": "Manual portfolio exposure report generation", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI portfolio systems auto-generate multi-dimensional exposure reports from position data in real-time.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard long-only equity selection', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI stock selection models outperform average active managers.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Novel Systematic Alpha Research', whySafe: 'Discovering new market anomalies before others exploit them requires creative hypothesis generation that exceeds current AI research capability.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Investor Relations & Capital Raising', whySafe: 'Convincing institutional investors to commit $100M+ requires human trust, track record presentation, and relationship depth — all irreducibly human.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Fund Founder / CIO', riskReduction: 20, skillGap: 'Capital raising, Operational infrastructure, Regulatory setup', transitionDifficulty: 'Very Hard', industryMapping: ['Hedge Funds'], salaryDelta: '+Unlimited (P&L share)', timeToTransition: '60+ months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2026, riskScore: 30, label: '+2yr' }, { year: 2027, riskScore: 35, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }, { year: 2029, riskScore: 44, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['finance-sector', 'ai-resilient', 'quantitative', 'strategy-moat', 'capital-markets'],
    evolutionHorizon: '2028',
  },
  fin_market_risk: {
    displayRole: 'Market Risk Manager',
    summary: 'Moderate resilience; disruption in routine VaR calculation; resilience in stress scenario design.',
    skills: {
      obsolete: [{ skill: 'Standard VaR calculation and reporting', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'Risk platforms calculate VaR, ES, and DV01 automatically in real-time.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard VaR calculation on linear product portfolios", "riskScore": 82, "riskType": "Automatable", "horizon": "1yr", "reason": "Risk engines auto-calculate VaR on standard portfolios using historical simulation or parametric methods.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Novel Stress Scenario Architecture', whySafe: 'Designing stress scenarios for risks that have never happened before — pandemics, geopolitical shocks, quantum hacking — requires human imagination.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Regulatory Risk Model Validation', whySafe: 'Validating that risk models meet SR 11-7 standards requires human accountable judgment about model limitations.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Risk Officer (CRO)', riskReduction: 38, skillGap: 'Board communication, Enterprise risk framework design', transitionDifficulty: 'Hard', industryMapping: ['Banks', 'Asset Managers', 'Insurance'], salaryDelta: '+80-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 42, label: '+1yr' }, { year: 2026, riskScore: 52, label: '+2yr' }, { year: 2027, riskScore: 60, label: '+3yr' }, { year: 2028, riskScore: 66, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['finance-sector', 'moderate-risk', 'quantitative', 'regulatory-driven'],
    evolutionHorizon: '2027',
  },
  fin_mortgage_broker: {
    displayRole: 'Mortgage Broker',
    summary: 'High disruption in standard loans; resilience in complex cases and high-value client relationships.',
    skills: {
      obsolete: [{ skill: 'Standard rate shopping across lenders', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI instantly compares rates across hundreds of lenders.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard mortgage rate comparison and lender matrix prep", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI mortgage comparison platforms auto-match borrower profiles to optimal lender products in real-time.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Complex Credit Structuring (Self-Employed, Near-Prime)', whySafe: 'Getting approval for edge-case borrowers requires human lender relationship and creative product knowledge.', longTermValue: 95, difficulty: 'High' },
        { skill: 'High-Net-Worth Jumbo & Investment Property Strategy', whySafe: 'Structuring $5M+ property financing with optimal tax and liquidity trade-offs requires human advisory depth.', longTermValue: 94, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Private Wealth Mortgage Strategist', riskReduction: 52, skillGap: 'UHNW client management, Commercial real estate finance', transitionDifficulty: 'Medium', industryMapping: ['Private Banking', 'Real Estate Finance'], salaryDelta: '+40-100%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    inactionScenario: 'Standard mortgage brokers will face direct competition from AI lending platforms within 3 years. Pivot to complex/UHNW lending or lose market position.',
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 55, label: '+1yr' }, { year: 2026, riskScore: 65, label: '+2yr' }, { year: 2027, riskScore: 74, label: '+3yr' }, { year: 2028, riskScore: 80, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['finance-sector', 'high-risk', 'action-required', 'automation-zone', 'pivot-window'],
    evolutionHorizon: '2026',
  },
  fin_financial_planner: {
    displayRole: 'Certified Financial Planner (CFP)',
    summary: 'Moderate to high resilience; AI manages porfolios, humans manage life planning and behavioral coaching.',
    skills: {
      obsolete: [{ skill: 'Routine portfolio rebalancing', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'Robo-advisors rebalance automatically at near-zero cost.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard financial plan generation for common life stages", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI financial planning tools auto-generate comprehensive plans from client questionnaire inputs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Life Event Behavioral Coaching', whySafe: 'Guiding clients through divorce, inheritance, retirement anxiety, or job loss with financial decisions — requires human empathy and trust.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Multi-Generational Estate & Legacy Planning', whySafe: 'Designing the financial legacy to reflect a family\'s values, relationships, and goals requires uniquely human understanding.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Holistic Wealth Advisor (HNW Specialist)', riskReduction: 48, skillGap: 'Estate planning, Business succession, Tax strategy depth', transitionDifficulty: 'Medium', industryMapping: ['RIA Firms', 'Private Banking'], salaryDelta: '+40-120%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
    ],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 32, label: '+1yr' }, { year: 2026, riskScore: 38, label: '+2yr' }, { year: 2027, riskScore: 44, label: '+3yr' }, { year: 2028, riskScore: 48, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['finance-sector', 'moderate-risk', 'trust-critical', 'human-touch', 'behavioral-coaching'],
    evolutionHorizon: '2027',
  },
  fin_transfer_pricing: {
    displayRole: 'Transfer Pricing Specialist',
    summary: 'High resilience; complex multi-jurisdiction intercompany pricing is one of the hardest tax problems to automate.',
    skills: {
      obsolete: [{ "skill": "Manual comparable uncontrolled price (CUP) database search", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI transfer pricing tools auto-search global royalty and transaction databases for CUP comparables.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard comparable company benchmark search', riskScore: 82, riskType: 'Automatable', horizon: '2yr', reason: 'AI databases automatically identify transfer pricing comparables.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Intercompany Transaction Defensibility Design', whySafe: 'Designing transfer prices that survive multinational tax authority challenges requires creative adversarial tax reasoning.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'BEPS Pillar 2 Implementation Strategy', whySafe: 'Adapting multinational tax structures to the global minimum 15% effective rate — navigating country-by-country rule carve-outs — is frontier tax engineering.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Head of Global Tax', riskReduction: 38, skillGap: 'BEPS framework mastery, Advance Pricing Agreement negotiation experience', transitionDifficulty: 'Hard', industryMapping: ['Big 4', 'Multinationals'], salaryDelta: '+50-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2026, riskScore: 26, label: '+2yr' }, { year: 2027, riskScore: 30, label: '+3yr' }, { year: 2028, riskScore: 34, label: '+4yr' }, { year: 2029, riskScore: 38, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['finance-sector', 'ai-resilient', 'regulation-driven', 'quantitative', 'international-tax'],
    evolutionHorizon: '2028',
  },
  fin_private_credit: {
    displayRole: 'Private Credit Analyst',
    summary: 'High resilience; underwriting illiquid, bespoke loans requires human credit judgment AI lacks sufficient data for.',
    skills: {
      obsolete: [{ "skill": "Manual loan covenant compliance monitoring from borrower financials", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI loan monitoring platforms auto-extract covenant metrics from borrower financial packages and flag breaches.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard covenant compliance monitoring', riskScore: 80, riskType: 'Augmented', horizon: '2yr', reason: 'Portfolio monitoring platforms flag covenant breaches automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Distressed Credit Situations Underwriting', whySafe: 'Assessing the recovery value of a distressed company requires human synthesis of operations, management quality, legal position, and market dynamics.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Sponsor Relationship Management (PE Backed Deals)', whySafe: 'Maintaining the trust relationships with PE sponsors that generate repeat deal flow is a fundamentally human network function.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Managing Director, Private Credit', riskReduction: 30, skillGap: 'Portfolio monitoring, Restructuring experience, IR skills', transitionDifficulty: 'Hard', industryMapping: ['Private Credit Funds', 'BDCs'], salaryDelta: '+80-200%', timeToTransition: '48 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 23, label: '+3yr' }, { year: 2028, riskScore: 26, label: '+4yr' }, { year: 2029, riskScore: 29, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['finance-sector', 'ai-resilient', 'capital-markets', 'relationship-intensive', 'bespoke-risk'],
    evolutionHorizon: '2029',
  },
};

