// modern_tech_roles_actions.ts — v40.0 Modern Role Intelligence
// 6 new role groups: AI PM, MLOps/ML Platform, Revenue Operations, Head of Growth,
// Chief of Staff, Strategy & Operations — covering 88+ unmapped modern job titles
// that previously fell through to generic "Generic guidance" fallback actions.

type ActionItem = {
  title: string;
  description: string;
  layerFocus?: string;
  riskReductionPct?: number;
  deadline?: string;
  priority?: string;
};
type BracketPool = Record<string, Record<string, ActionItem[]>>;

function pool(
  jc: ActionItem, mc: ActionItem, sc: ActionItem, h: ActionItem, m: ActionItem,
): BracketPool {
  return {
    junior:    { critical: [jc], high: [h], moderate: [m], low: [m] },
    mid:       { critical: [mc], high: [h], moderate: [m], low: [m] },
    senior:    { critical: [sc], high: [h], moderate: [m], low: [m] },
    principal: { critical: [sc], high: [h], moderate: [m], low: [m] },
  };
}

export const ACTION_DB_MODERN_TECH_ROLES: Record<string, BracketPool> = {

  // ── AI Product Manager ────────────────────────────────────────────────────
  ai_pm: pool(
    {
      title: 'Launch a Public AI Feature Case Study This Week to Signal PM Depth',
      description: 'AI PMs at the junior level are indistinguishable without artifacts. Build and publish a 2-page PM case study (Medium or Substack) documenting a real AI feature: problem statement, model selection rationale (why Claude 4.6 vs GPT-5 vs Gemini 2.5 for this use case), evaluation metrics you would have used (BLEU, precision/recall, user satisfaction), and latency/cost trade-off analysis. Include a mock PRD section on responsible AI considerations (EU AI Act compliance, bias auditing). Companies like Intercom, Notion, and Harvey actively read PM candidates\' writing samples before scheduling screens.',
      layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Schedule 5 Recruiter Conversations at AI-Native Companies This Week',
      description: 'AI PM roles have a 60-day average fill time vs. 90 days for traditional PM roles — companies are actively hiring but the funnel is competitive. Target: Anthropic (AI Safety PM), Harvey (legal AI), Glean (enterprise AI), Sierra (customer AI), Anysphere/Cursor (developer AI). Mid-level AI PMs with 3-5 years of experience + LLM product launches clear $230K–$310K base in 2026. Message 5 recruiters directly on LinkedIn with a one-paragraph "I shipped [X] AI feature, here\'s the metric impact" hook.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 32, deadline: '7 days — outreach window', priority: 'Critical',
    },
    {
      title: 'Create an AI Product Strategy Document and Present It to Your VP',
      description: 'Senior AI PMs protect their role by owning the AI roadmap — not just individual features. Build a 10-slide AI product strategy: (1) current AI feature landscape at your company, (2) customer pain points that AI can uniquely solve (hallucination risk, latency, compliance), (3) build vs. buy vs. fine-tune analysis for 3 model families (Anthropic Claude, OpenAI GPT, Google Gemini), (4) a 6-month roadmap with success metrics. Use Anthropic\'s prompt caching benchmark data and OpenAI\'s Batch API cost curves in your analysis. Present to your VP within 3 weeks — owning the internal AI narrative is the strongest retention signal.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Get Anthropic or Google AI Product Management Certified',
      description: 'Anthropic\'s PM certification program and Google\'s AI Product Manager certificate (available through Coursera, $49/month) are now treated as table stakes by AI-native companies screening PM candidates. Complete whichever your network doesn\'t yet associate with you. The Anthropic program includes hands-on Claude API exercises, safety red-teaming, and responsible-scaling evaluation — directly referenced in their PM interview rubrics.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Document Your AI Feature\'s Core Business Metrics in a One-Pager',
      description: 'AI PMs who can concisely articulate: "we launched [feature], it moved [metric] by [X]% within [N] days, here is the model, latency, cost, and safety story" are dramatically more hireable. Create a one-pager. If your company restricts sharing specifics, create a redacted/anonymized version that preserves the structure.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 18, deadline: '14 days', priority: 'Medium',
    },
  ),

  // ── MLOps / ML Platform Engineer ──────────────────────────────────────────
  ml_platform: pool(
    {
      title: 'Build and Ship a Public MLOps Pipeline Demo This Week',
      description: 'MLOps engineers without a public artifact are evaluated purely on company prestige. Build a public GitHub repo containing an end-to-end ML pipeline: data versioning (DVC or Delta Lake), experiment tracking (MLflow or Weights & Biases free tier), model registry, and a CI/CD deployment to a free-tier cloud (Hugging Face Spaces, Railway, or Modal). Use a small but non-trivial model (LoRA fine-tuned Llama 3 or a HuggingFace BERT variant). Write up the architecture in a README with cost and latency benchmarks. Companies screening junior MLOps candidates (Databricks, Weights & Biases, Modal, Astronomer) explicitly ask for public pipelines.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn the Databricks Certified MLOps Professional Certification',
      description: 'The Databricks Certified MLOps Professional exam ($200, 2-hour online) is now the most widely recognized MLOps certification and is explicitly listed as a screening criterion at Databricks, Snowflake, and most data platform companies. Study track: Databricks Academy\'s ML Professional course (free with trial) + the MLOps Zoomcamp (free). Mid-level MLOps engineers with this cert see 22% higher response rates from inbound recruiter outreach based on LinkedIn job seeker data. Schedule the exam within 30 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Architect a Platform Migration Plan and Present It Internally',
      description: 'Senior ML platform engineers protect their role by owning the infrastructure roadmap. Build a 6-month ML platform migration proposal: current state (legacy training infrastructure, model deployment bottlenecks, data pipeline latency), target state (Ray / Kubeflow / Vertex AI / SageMaker trade-off analysis with real cost numbers), and execution plan. Senior MLOps engineers at hyperscalers (Google, AWS, Azure) clear $280K–$380K — running a single external loop gives you leverage for an internal comp reset.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 42, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Get KubeFlow or Ray AIR Certified and Add It to Your Profile',
      description: 'KubeFlow (CNCF) and Ray AIR (Anyscale) certifications signal production-level distributed ML experience. The Ray AIR certification ($295) is now required for roles at Anyscale, Netflix (Ray user), Uber (PyTorch + Ray), and Bay Area ML infrastructure teams. Study: Ray AIR docs + Anyscale Academy free courses (12 hours).',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Reduce Model Inference Latency or Training Cost by 20% and Document It',
      description: 'MLOps engineers who can show quantified infrastructure wins (e.g. "reduced model serving P95 latency from 820ms to 340ms using ONNX + TensorRT + async batching" or "cut weekly GPU training cost from $18K to $9K via spot instances + gradient checkpointing") are dramatically more defensible. Build this artifact this quarter.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
    },
  ),

  // ── Revenue Operations Manager ────────────────────────────────────────────
  rev_ops: pool(
    {
      title: 'Build a Revenue Operations Dashboard in Salesforce + Tableau/Looker This Week',
      description: 'Junior RevOps professionals are most exposed when they cannot demonstrate ownership of a production system. Build a full-funnel pipeline dashboard in Salesforce CRM + Tableau or Looker (free developer editions) showing: lead-to-opportunity conversion rate, ACV by segment, sales cycle velocity, and churn contribution by cohort. Publish the schema design and a screenshot walkthrough on LinkedIn. Companies hiring junior RevOps ($70K–$95K) screen for Salesforce Administrator certification + dashboard ownership. Schedule the Salesforce Admin exam ($200) within 30 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Run a Sales Process Audit and Deliver a Win/Loss Analysis to Leadership',
      description: 'Mid-level RevOps professionals protect their roles by delivering insights leadership cannot get elsewhere. Conduct a 90-day win/loss analysis using your CRM data: identify the top 3 deal-stage dropout patterns, the fastest-converting ICP segments, and the rep behaviors correlated with >120% quota attainment. Present a 2-page memo to VP Sales or CRO. This single deliverable positions you as the person who "knows where the revenue is leaking" — the hardest role to eliminate.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Design and Implement a RevOps Tech Stack Consolidation Plan',
      description: 'Senior RevOps leaders at SaaS companies ($50M–$500M ARR) who own the GTM tech stack (Salesforce, Outreach, Gong, 6sense, Clari, ZoomInfo) and drive consolidation decisions are among the hardest roles to reduce. Build a tech stack audit: current tool spend, overlap analysis, ROI by tool (revenue influenced ÷ contract cost), and a 6-month consolidation roadmap with projected savings. RevOps Directors at $100M+ ARR companies earn $150K–$220K — if you are below that band, running an external RevOps Director loop gives you a comp reset anchor.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 40, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Earn Salesforce Revenue Cloud Certification to Signal GTM System Expertise',
      description: 'Salesforce Revenue Cloud (CPQ + Billing) certification ($200 exam) is the highest-signal RevOps credential for candidates targeting SaaS companies ($20M–$500M ARR). Salesforce CPQ skills appear in 68% of senior RevOps job postings at Series B+ companies. Study: Salesforce Trailhead Revenue Cloud trail (free, 15 hours) + Trailhead Superbadge for CPQ.',
      layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Document the Revenue Impact of a Recent RevOps Initiative',
      description: 'RevOps professionals who can quantify their impact ("I redesigned the lead routing logic, reducing average response time from 4 hours to 12 minutes, and lifted lead-to-SQL conversion by 18 points") are dramatically more hireable. Write a one-paragraph impact summary for each initiative in the last 12 months. These are your interview stories.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 16, deadline: '14 days', priority: 'Medium',
    },
  ),

  // ── Head of Growth / Growth Lead ──────────────────────────────────────────
  growth: pool(
    {
      title: 'Run a 7-Day Growth Experiment and Publish the Results',
      description: 'Junior growth professionals without a public portfolio of experiments are evaluated on company prestige alone. Design, run, and publish a growth experiment this week: an A/B test on a landing page (use Google Optimize or PostHog free tier), a SEO content cluster test, or a referral loop mechanic. Document hypothesis, design, results (even negative), and learning. Post the write-up on LinkedIn and tag it with "growth experiment." YC companies and Series A startups actively hire junior growth candidates who can demonstrate the scientific rigor to run controlled experiments, not just optimize existing funnels.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Audit Your Current Growth Loop and Present a 90-Day Plan to Leadership',
      description: 'Mid-level growth practitioners protect their role by owning the narrative on why the current growth rate is what it is and what the next step-change requires. Build a 2-page growth audit: acquisition channel efficiency (CAC by channel, payback period), activation funnel drop-off analysis, retention cohort curves, and monetization leverage. Present a 90-day plan with 3 prioritized experiments and expected impact ranges. This is also your best asset for a Series B or Series C growth lead search.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Establish a Market-Rate Anchor by Running Growth VP Conversations at 2 Companies',
      description: 'Head of Growth / VP Growth roles at Series B–D companies ($20M–$150M ARR) earn $200K–$280K base + meaningful equity in 2026. If you are managing a team and have owned a growth channel from 0→scale, you are likely underpaid. Run conversations at 2 companies this quarter: one B2B SaaS (OpenView Ventures portfolio is a good list) and one B2C consumer app. The external offer does not need to be accepted — it gives you a negotiation anchor for your current comp and equity refresh.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 40, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Complete the Reforge Growth Series to Signal Practitioner-Level Depth',
      description: 'Reforge (reforge.com, $2,000/year or ~$500/course) is now the most respected growth practitioner certification among Series A–D companies and top growth teams (Airbnb, Duolingo, HubSpot, Notion). Alumni status on your LinkedIn profile significantly increases recruiter inbound from growth-focused companies. Prioritize: "Reforge Growth Series" or "Product Strategy" depending on where your gap is.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Document Your Best Growth Win as a 2-Paragraph Case Study',
      description: 'Growth professionals who can state: "I owned [channel], grew it from [X] to [Y] over [Z] months, here is the specific thing that unlocked the step-change, here is the CAC before and after" are dramatically more hireable than those who list "grew revenue by 3x." Write this now. It is your most valuable interview asset and your best LinkedIn headline.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  // ── Chief of Staff ────────────────────────────────────────────────────────
  chief_of_staff: pool(
    {
      title: 'Produce an Unsolicited Strategy Memo for Your Exec This Week',
      description: 'Junior Chiefs of Staff who wait to be assigned work are the first cut. The role earns its position by surfacing information and analysis the executive cannot get from their direct reports. Write a 2-page unsolicited strategy memo this week: identify a decision the exec is delaying or a process consuming disproportionate meeting time, synthesize the data, and propose a clear recommendation with trade-offs. Deliver it proactively. This is the behavior pattern that converts a 12-month CoS role into an operational leadership track.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Run the Annual Planning Process and Own the Cross-Functional Alignment',
      description: 'Mid-level Chiefs of Staff protect their role by owning the institutional processes that would break without them. Take explicit ownership of the annual planning cycle: compile departmental OKR submissions, surface resource conflicts, facilitate the cross-functional prioritization meeting, and distribute the final plan with accountability owners. Then document the process so it can be repeated. "The CoS designed our operating cadence" is a career-defining credential for the next VP Operations or COO role.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Schedule Conversations With 3 Former Chiefs of Staff About Their Transitions',
      description: 'Senior CoS roles (3+ years) typically end in one of three ways: VP Ops/Strategy promotion internally, a functional VP role externally, or an MBA → Associate Program. The average CoS tenure is 18–30 months. If you are past 18 months, the transition conversation should already be happening with your exec. Reach out on LinkedIn to 3 former Chiefs of Staff (search "former chief of staff" + company stage/size) and schedule 30-minute conversations about their transition paths. This gives you a realistic benchmark for timing and comp expectations.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 36, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Map Your Desired Post-CoS Role and Build the Credential Gap Plan',
      description: 'The CoS role is a launchpad, not a destination. Identify the specific post-CoS role you want (VP Strategy, VP Operations, General Manager, COO track) and map the credential gap. Most transitions require either: a functional revenue-ownership credential (P&L responsibility), a public board or advisory role, or an MBA from a T15 program. Build a 12-month credential roadmap now, before the transition conversation happens with your exec.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 22, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Produce a Weekly Exec Briefing That Makes Themselves More Effective',
      description: 'The best single retention mechanism for a CoS is making the exec materially more effective each week. Build a weekly briefing format: top 5 decisions that need the exec\'s input (with pre-work done), top 3 external signals (competitor move, customer feedback, talent market change) relevant to their decisions, and 1 emerging risk with a proposed mitigation. Deliver it every Monday by 9am. This makes your departure cost-prohibitive.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  // ── Strategy and Operations ───────────────────────────────────────────────
  strategy_ops: pool(
    {
      title: 'Build a Market Sizing and Entry Strategy Memo This Week',
      description: 'Junior Strategy & Ops professionals are hired for structured thinking and quantitative rigor. Build a 4-page market sizing memo for a market adjacent to your company\'s core: TAM/SAM/SOM using both top-down (industry reports) and bottom-up (unit economics × addressable accounts) methods, competitive landscape mapping, and a 3-scenario entry strategy with 12-month P&L projections. Post the framework (redacted company-specific data) on LinkedIn or Substack. McKinsey, BCG, and Bain screen for this type of structured output even when hiring from non-traditional backgrounds.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Own a Cross-Functional Initiative From Diagnosis to Results',
      description: 'Mid-level Strategy & Ops professionals are most defensible when they have end-to-end ownership of a visible business outcome — not just analysis. Identify one initiative where you can own the full cycle: problem definition, cross-functional stakeholder alignment, implementation project management, and metric outcome. "I diagnosed the churn driver, aligned sales and customer success on the fix, shipped the process change, and moved net retention from 94% to 102%" is a career-defining story.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Run a VP Strategy Loop at 2 Companies to Establish Market-Rate Comp',
      description: 'Senior Strategy & Ops leaders (4+ years, cross-functional ownership) at Series C+ companies earn $180K–$260K base in 2026. Management consulting (McKinsey, BCG, Bain) senior associates/engagement managers earn $195K–$230K. If you are below market, running conversations at 2 comparable companies gives you an external anchor for internal comp negotiation. Target: Sequoia-backed B2B SaaS ($50M–$300M ARR) for industry comps and one consulting firm (McKinsey, BCG, Parthenon-EY) for consulting comps.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 40, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Complete a Data Analysis Project in Python + SQL and Publish It',
      description: 'Strategy & Ops professionals who can self-serve on data (Python pandas + SQL, at minimum) are dramatically more defensible and hireable than those who rely entirely on data analysts. Complete the Mode Analytics SQL tutorial (free) and build a 1-page analysis of a public dataset (Y Combinator company database, Kaggle startup datasets). Publish it on GitHub. This is now a baseline expectation at Series B+ companies.',
      layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Document the Strategic Recommendation You Made That Had a Measurable Outcome',
      description: 'Strategy & Ops professionals who can articulate "I identified [problem], built the analysis, presented the recommendation, and the company made [decision] which resulted in [metric outcome]" are twice as hireable as those who describe inputs ("I built 15 decks this quarter"). Write this story for your top 2 recommendations in the last 18 months. These are your interview anchors.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

};
