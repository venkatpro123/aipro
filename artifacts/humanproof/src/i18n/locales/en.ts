export default {
  nav: {
    home: "Home",
    calculator: "Check My Risk",
    resources: "Resources",
    pricing: "Pricing",
    signIn: "Sign In",
  },
  home: {
    title: "AI Job Displacement Intelligence",
    subtitle:
      "The most comprehensive AI job displacement calculator — built on 2026 data from McKinsey, Goldman Sachs, WEF and 6 other top research institutions. Free. No signup.",
    cta: "Calculate My Risk",
    ctaSecondary: "View Resources",
    statWorkers: "Workers Analysed",
    statTimeline: "Avg Timeline",
    statJobs: "Jobs Analysed",
    statModel: "Risk Model",
  },
  calculator: {
    title: "AI Risk Calculator",
    jobPlaceholder: "Search your job title...",
    selectCountry: "Select your country",
    experience: "Years of experience",
    calculate: "Calculate My Risk",
    results: {
      score: "Risk Score",
      confidence: "Confidence",
      timeline: "Estimated Timeline",
    },
  },
  risk: {
    critical: "Critical Risk",
    high: "High Risk",
    moderate: "Moderate Risk",
    low: "Low Risk",
    safe: "AI-Resistant",
  },
  footer: {
    description:
      "The most rigorous AI displacement intelligence platform. Built on 2026 research data. Updated quarterly. Free calculator, always.",
    subscribe: "Subscribe",
    product: "Product",
    research: "Research",
    company: "Company",
  },
  // v40.0 — Tier B narrative localization. Only the SHELL strings (labels,
  // urgency, synthesis stems) are translated; the long-form numerical detail
  // remains in English on non-en locales until per-language translator review.
  // English is the source-of-truth that other locales fall back to.
  narrative: {
    urgency: {
      Immediate: "Immediate",
      High: "High",
      Moderate: "Moderate",
      Low: "Low",
    },
    archetype: {
      financial_distress_layoff: "Financial Distress",
      ai_efficiency_restructuring: "AI Efficiency Restructuring",
      role_displacement: "Role Displacement",
      sector_wave: "Sector Headwind",
      gcc_parent_contagion: "GCC Parent Contagion",
      india_it_bench_risk: "IT Services Bench Risk",
      individual_resilience_gap: "Individual Resilience Gap",
      low_risk_maintain: "Low Risk — Optimization Mode",
      eu_regulatory_restructuring: "EU Regulatory Restructuring",
      latam_funding_crisis: "LatAm Funding Crisis",
      apac_hyperscaler_localization: "APAC Hyperscaler Localization",
      us_gov_contract_risk: "US Government Contract Risk",
      fintech_regulatory_tightening: "Fintech Regulatory Tightening",
    },
    synthesisStem: {
      financial_distress_layoff:
        "Your company shows signs of financial distress. Key indicators point to elevated risk of headcount action in the coming months.",
      ai_efficiency_restructuring:
        "Your company is profitable but investing heavily in AI. The efficiency-restructuring pattern indicates planned substitution of roles — not financial distress.",
      role_displacement:
        "Your role faces direct pressure from AI automation. The risk is role-structural, independent of your company's financial position.",
      sector_wave:
        "Broad sector-level forces are pressuring your industry. The risk is larger than your individual company — it affects the entire category.",
      gcc_parent_contagion:
        "You're in a Global Capability Center whose overseas parent company is cutting. Parent-company cuts propagate to your region at 2-3× the parent rate.",
      india_it_bench_risk:
        "In India IT services, bench time over 60-90 days is the operational trigger for PIP. Proactive RM communication this week is the highest-ROI action.",
      individual_resilience_gap:
        "Your company is stable, but personal factors (generic profile, short tenure, low differentiation) make your role a priority in any relative restructuring.",
      low_risk_maintain:
        "All risk signals are in the manageable range. Optimization mode: invest in AI skills and financial reserves during this favorable window.",
      eu_regulatory_restructuring:
        "Your company faces EU regulatory pressure (AI Act, GDPR, DSA). The cuts are strategic reallocation toward compliance — not financial distress.",
      latam_funding_crisis:
        "LatAm startups without US funding runway face acute pressure. The risk is binary: close a funding round OR cut.",
      apac_hyperscaler_localization:
        "Your US-parent tech company is localizing APAC operations. Expat-heavy teams face replacement by local hires or relocation to lower-cost APAC nodes.",
      us_gov_contract_risk:
        "Federal budget cuts and continuing-resolution uncertainty are impacting government contractors. Internal program transfer is the first protection.",
      fintech_regulatory_tightening:
        "Central banks and regulators are tightening fintech oversight globally. Reallocation to compliance/risk/privacy roles within the company is the largest lever.",
    },
    disclaimer:
      "This narrative is model-generated. Numerical citations come from verified market data; the prose is deterministic and template-based. The English version remains the definitive source for review.",
  },
};
