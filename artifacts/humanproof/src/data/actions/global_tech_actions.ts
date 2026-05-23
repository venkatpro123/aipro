// global_tech_actions.ts — GAP-P03-B
//
// Global (non-India) equivalents for the 9 core tech role pools that were
// previously only defined with India-market content (Naukri, ₹LPA salary
// ranges, India company names) in actionPersonalizationEngine.ts.
//
// SERVED TO: users where region !== 'IN' and region !== 'India'.
// INDIA USERS: continue receiving the India-specific pools (unchanged).
//
// Follows the same pool(jc, mc, sc, h, m) pattern as cloud_platform_actions.ts:
//   jc = junior critical | mc = mid critical | sc = senior critical
//   h  = high risk (all seniorities) | m = moderate risk (all seniorities)
//
// Design principle: every action answers "What exactly should I do Monday?"
//   - Named certification (not "get certified" — "complete AWS SAA, $330")
//   - Named companies to target (Stripe, Anthropic, Google — not "top companies")
//   - Specific numbers (salary delta, callback rate lift, time-to-proficiency)
//   - Time-boxed commitment

type BracketPool = Record<string, Record<string, Array<{ title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string }>>>;

function pool(
  jc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  mc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  sc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  h:  { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  m:  { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
): BracketPool {
  return {
    junior:    { critical: [jc], high: [h], moderate: [m], low: [m] },
    mid:       { critical: [mc], high: [h], moderate: [m], low: [m] },
    senior:    { critical: [sc], high: [h], moderate: [m], low: [m] },
    principal: { critical: [sc], high: [h], moderate: [m], low: [m] },
  };
}

export const ACTION_DB_GLOBAL_TECH: Record<string, BracketPool> = {

  // ── SOFTWARE ENGINEER (Global) ────────────────────────────────────────────────
  swe: pool(
    {
      title: 'Ship an AI-Integrated Feature to GitHub and Apply to 3 AI-First Companies',
      description: 'Rebuild one feature from your current project using GitHub Copilot or Claude API as the coding layer. Push to a public GitHub repo with a README explaining what you built, what AI generated vs what you verified, and the test coverage. Junior engineers with public AI-integration repos receive 2.8× more recruiter contacts. Then apply this week to: (1) a Series B+ AI startup on Y Combinator\'s Jobs board; (2) a hyperscaler team (AWS, GCP, Azure) hiring junior engineers via their university programs; (3) one product company in your city via LinkedIn Easy Apply. 3 applications, not eventually — this week.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Lead Your Team\'s AI Tool Evaluation and Update Your LinkedIn Today',
      description: 'Raise your hand this week: "I\'d like to lead our evaluation of Cursor/GitHub Copilot/Claude Code." Run a 2-week A/B comparing velocity. Publish the results as an internal doc and a LinkedIn post. Mid-level engineers who own AI tool adoption are classified as "architecture-ready" and are the last cut in restructuring. Simultaneously: update your LinkedIn headline to "Backend Engineer | Python, Go | LLM Integration | 5yr" and message 3 technical recruiters. Template: "Hi [Name], I\'m a [role] exploring [type] roles. Would value a 15-min call if you have relevant openings." At your seniority + risk level, a recruiter pipeline is non-optional.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '48 hours — volunteer; 14 days — publish', priority: 'Critical',
    },
    {
      title: 'Schedule a Skip-Level and Accept the Next Recruiter Call — Both This Week',
      description: 'At senior level, your primary protection is relationship capital with decision-makers. Message your manager\'s manager: "I\'d value 30 minutes to share what I\'m building and understand the team\'s strategic direction for H2." This is a visibility conversation, not a job preservation conversation. Simultaneously: update your LinkedIn and accept the next inbound recruiter message — treat it as a market data point. Senior engineers with updated profiles receive 6× more recruiter contact. Each call tells you your current market rate — irreplaceable intelligence. Levels.fyi shows staff/senior engineer comp bands for your city; know your number before any performance review.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '5 days', priority: 'Critical',
    },
    {
      title: 'Quantify 3 Resume Achievements and Publish One Technical LinkedIn Post',
      description: 'Identify 3 projects you shipped and quantify them — not lines of code. Use these templates: "Reduced API latency by X% by implementing Y," "Automated Z manual steps saving N hours/week," "Shipped feature used by N active users." Add all 3 to your resume and LinkedIn profile today. Then write a 1,000-word technical post about a real problem you solved: "How we reduced our API p99 latency from 800ms to 120ms using Redis pipeline batching." Mid-level engineers with 2+ published technical posts receive 3× more inbound recruiter contact.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '7 days', priority: 'High',
    },
    {
      title: 'Own One Cross-Functional AI Initiative and Write an AI Governance ADR',
      description: 'Identify an AI use case that spans your team and one adjacent team (ML + Backend: integrate model serving; Backend + Data: build feature pipeline). Propose it in a one-page doc. Get buy-in. Ship a v1 in 60 days. Cross-functional ownership is your primary path to senior and the signal that makes you the last person cut. Also write an ADR (Architectural Decision Record): "When to Use AI Code Generation vs Human Review — Engineering Standards." Engineers who own AI quality standards are classified as critical knowledge. 4 hours to write, months of protection.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '60 days', priority: 'Medium',
    },
  ),

  // ── DATA SCIENTIST (Global) ───────────────────────────────────────────────────
  data_scientist: pool(
    {
      title: 'Deploy an End-to-End ML Service on GitHub — Not Just a Notebook',
      description: 'The market is saturated with data scientists who have Kaggle notebooks. Differentiate: build a project with FastAPI serving a scikit-learn or HuggingFace model, dockerized, deployed to Render.com (free tier) or Hugging Face Spaces. Topic: anything with a real use case — churn prediction, price forecasting, document classification. Push to GitHub with a live demo link. This is now the interview baseline for ML roles above $70k. Engineers with live-deployed ML services receive 3× more serious offers than those with only notebooks. 15–20 hours over a weekend.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Earn the Google Professional ML Engineer Cert and Lead an LLM Integration Project',
      description: 'Google PMLE ($200 exam, 2–3 months prep via Google Cloud Skills Boost free tier) is the highest-signal ML certification globally for production ML pipeline skills (data prep → training → serving → monitoring). Data scientists with PMLE earn 25–35% more in compensation surveys. Start the learning path this week. Simultaneously: identify one internal process to automate with an LLM (document extraction, support classification, code review). Draft a 1-page proposal, present it, own the implementation. Mid-level data scientists who lead LLM integrations are reclassified as "AI engineers" — the role being created, not eliminated.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days — cert; 14 days — propose LLM project', priority: 'Critical',
    },
    {
      title: 'Open-Source Contribution to a Major ML Framework and Staff Role Search',
      description: 'Contribute a meaningful PR to scikit-learn, HuggingFace Transformers, or PyTorch — a bug fix, new estimator, or documentation improvement that passes review. A merged PR to a top-10 GitHub ML repo is a permanent credential that hiring committees at Anthropic, Google DeepMind, OpenAI, and Meta FAIR recognize. Simultaneously launch a targeted staff DS / senior ML engineer search: Levels.fyi for comp benchmarking; LinkedIn for companies with open req; direct outreach to engineering managers at target companies. Staff ML roles offer $220k–$380k TC at tier-1 companies.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Set Up MLflow or Weights & Biases Experiment Tracking in Your Current Projects',
      description: 'MLflow (open-source) or W&B (free tier) for experiment tracking is the signal separating "notebook data scientist" from "production ML engineer." Set up MLflow locally, integrate it into your last 3 projects, add the tracking URI to your GitHub repos. Companies at $100k+ salary bands now filter for MLOps skills in technical screens. 4 hours of setup, then use it on everything. This single line on your resume — "MLflow experiment tracking, model registry across N experiments" — changes how your CV is read.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Complete the dbt Fundamentals Course and Build a Domain Analytics Portfolio',
      description: 'The analytics engineer role (dbt + Snowflake/BigQuery) is the fastest-growing data specialty and pays $130k–$180k at Series B+ companies. dbt Fundamentals is free at courses.getdbt.com (6 hours). Build one project transforming a public dataset (NYC taxi, Stack Overflow survey, or your domain\'s open data) into a dbt project with models, tests, and documentation deployed to a free Snowflake trial. This portfolio piece bridges data science into the analytics engineering track that is in shortage.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 14, deadline: '30 days', priority: 'Medium',
    },
  ),

  // ── ML ENGINEER (Global) ──────────────────────────────────────────────────────
  ml_engineer: pool(
    {
      title: 'Ship a Production ML Service with FastAPI + MLflow and Deploy It Publicly',
      description: 'Build an end-to-end ML service: model training with MLflow experiment tracking, FastAPI serving endpoint, Docker container, deployed to Render.com or Hugging Face Spaces (both free tier). Include a model card documenting training data, metrics, and limitations. ML engineers with live deployed services receive 3× more senior ML role offers than those with only notebooks. Document the inference latency, throughput, and memory footprint — the three production metrics that separate candidates in interviews. 15–20 hours over 2 weekends.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Own the ML Platform Initiative at Your Company — Feature Store, Model Registry, or Serving Layer',
      description: 'Mid-level ML engineers who own internal platform initiatives (MLflow model registry, Feast feature store, unified serving layer, or a Ray Serve deployment) are classified as infrastructure-critical — the last profile cut in restructuring. Pitch the initiative to your manager this week, assign yourself as tech lead, and deliver an internal demo within 30 days. Scope it small: one model registry + one automated retraining pipeline. Internal platform ownership creates the visibility that external certifications cannot. Salary uplift for ML platform engineers vs generalist ML: 30–50% at Series C+.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Earn AWS ML Specialty or GCP PMLE and Launch a Fractional ML Advisory Practice',
      description: 'AWS Certified Machine Learning Specialty ($300 exam, 3–4 months prep via A Cloud Guru or Udemy) validates cloud-native ML deployment skills that command $180k–$260k at staff level. Complete one chapter per week. Simultaneously: traditional industries (healthcare, legal, manufacturing, retail) are adopting ML and have no internal expertise. Offer a 4-hour engagement: ML strategy assessment and use-case roadmap. One retainer at $3,000–$8,000/month builds financial resilience and external credibility that accelerates your next full-time negotiation.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '21 days — first advisory outreach; 90 days — cert', priority: 'Critical',
    },
    {
      title: 'Transition from Classical ML to LLM Fine-tuning and RAG Pipeline Engineering',
      description: 'The market for classical ML generalist roles is compressing. LLM fine-tuning (LoRA/QLoRA via HuggingFace PEFT) and RAG pipeline engineers are in shortage at $150k–$220k. Complete the HuggingFace PEFT course (free at huggingface.co/learn) and build one fine-tuned model on a domain-specific dataset (open medical QA, legal reasoning, code generation). This bridges classical ML expertise to the highest-demand ML specialty. Push the model card and training code to Hugging Face Hub — recruiters from Anthropic, Cohere, and AI21 Labs source from there.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Build an LLM Evaluation Framework for Your Current ML System',
      description: 'Implement RAGAS (for RAG systems) or a custom eval harness for your production model. Track three metrics: answer faithfulness, context relevance, and latency percentiles across model versions. Publish the evaluation methodology as an internal RFC. ML engineers who own quality gates are the last to be cut when models increasingly write their own code — the humans who evaluate correctness become the irreplaceable layer.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
    },
  ),

  // ── AI ENGINEER (Global) ──────────────────────────────────────────────────────
  ai_engineer: pool(
    {
      title: 'Build and Deploy a Production LLM Application with Full Observability',
      description: 'Build an LLM application using LangChain or LlamaIndex with: prompt versioning (Langfuse, open-source), output evaluation (RAGAS for RAG apps, DeepEval for general), cost tracking per request, and fallback logic when the primary model hits rate limits. AI engineers who demonstrate production-grade LLM observability receive 4× more serious offers. Deploy it publicly (Render, Hugging Face Spaces, or Vercel) with a usage demo. Include a README with architecture diagram, cost-per-query, and latency numbers. This is now the baseline artifact for AI engineer interviews at companies building with LLMs.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Own Your Team\'s LLM Evaluation and AI Safety Framework',
      description: 'Mid-level AI engineers who own the evaluation infrastructure become unglamorous but indispensable — they block hallucinations from reaching production and own the quality gate. Write a team policy: what evals must pass before deployment, what safety tests run on every prompt change, how regressions are tracked (use W&B or Langfuse for free). Present it at the next sprint review. Companies at Series B+ now require LLM evaluation before shipping — owning this makes you the last engineer cut when the team shrinks. One merged PR to EleutherAI\'s lm-evaluation-harness or PromptBench opens doors at Anthropic, Google DeepMind, and OpenAI.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
    },
    {
      title: 'Publish Production LLM Reliability Research and Pursue a Founding AI Engineer Role',
      description: 'Senior AI engineers who publish detailed post-mortems or analysis of production LLM failure modes (hallucination in domain X, context-length cliff effects, agentic loop failures, prompt injection attack surfaces) become the reference point companies call before building. A single well-cited post on the Anthropic Alignment Forum, LessWrong, or the ACL Anthology creates career optionality that compensation packages cannot match. Start with a 1,500-word case study from your production experience. Simultaneously: Founding AI Engineer roles at seed/Series A AI companies offer $200k–$350k + 0.5–2% equity — source them via Cerebral Valley job board and AI Grant newsletter.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '21 days — draft', priority: 'Critical',
    },
    {
      title: 'Contribute a Meaningful PR to an LLM Evaluation or AI Safety OSS Project',
      description: 'Contribute to EleutherAI\'s lm-evaluation-harness, HELM (Stanford), or Microsoft\'s PromptBench. Contribution types that get merged: new benchmark tasks, evaluation metrics, model adapter integrations, or documentation. AI engineers with verified contributions to evaluation frameworks are considered for founding engineer and research engineering roles at AI companies ($250k–$400k TC at Anthropic, OpenAI, Google DeepMind). One merged PR is the proof point. Start by filing a good-first-issue bug fix — most maintainers respond within 48 hours.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Get Certified on AWS Bedrock or Google Vertex AI and Build a Multi-Model Demo',
      description: 'AWS Certified Machine Learning Specialty ($300) validates cloud-native AI deployment skills. Build a multi-model comparison app (Claude vs GPT-4o vs Gemini on the same prompt set) using Bedrock and Vertex AI. Instrument it with LangSmith or Langfuse for cost and latency tracking. This demo is the technical interview artifact that distinguishes "built a chatbot with OpenAI API" from "designed production AI infrastructure." Deployed demos on cloud platforms generate more inbound than any certification alone.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
    },
  ),

  // ── CLOUD ARCHITECT (Global) ──────────────────────────────────────────────────
  cloud_architect: pool(
    {
      title: 'Earn AWS Solutions Architect Associate ($330) — Book the Exam This Week',
      description: 'Go to aws.amazon.com/certification and book the AWS Solutions Architect Associate exam ($330). This is the single highest-ROI cloud certification globally — 72% of cloud architect job postings mention it specifically. Prep: Adrian Cantrill\'s SAA-C03 course ($40 on his site, best-reviewed for 2024–2025) or Stephane Maarek\'s Udemy course ($15 on sale). Study 1.5 hours/day for 6 weeks. Engineers with active SAA certification receive 40% more callback rates on LinkedIn and Indeed for cloud roles. Book the exam today — the scheduling forces a completion date.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days — book; 60 days — pass', priority: 'Critical',
    },
    {
      title: 'Earn AWS Solutions Architect Professional ($400) and Own a Production Migration Project',
      description: 'AWS Solutions Architect Professional ($400 exam, 3–4 months prep) is the credential that separates architects from senior architects at $140k–$200k bands. Use Tutorials Dojo\'s practice exams ($15, highest quality) and AWS official prep courses on Skill Builder (free). Simultaneously: propose and lead a real migration project — on-prem to cloud, monolith to microservices, or multi-cloud redundancy. Cloud architects with documented migration case studies (architecture diagram + cost savings achieved) command $30k–$60k salary premium over those with only credentials.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days — exam; 14 days — propose project', priority: 'Critical',
    },
    {
      title: 'Publish a Multi-Cloud Architecture Decision Record and Target Staff Architect Roles',
      description: 'Write a detailed ADR or RFC: "Multi-Cloud Redundancy vs Cost Efficiency Trade-off for [Your Industry] Workloads." Include your actual cost analysis, latency measurements, and organizational complexity assessment. Publish it as a LinkedIn article. Senior cloud architects who publish real architectural trade-off analyses receive 5× more direct outreach from enterprise companies. Simultaneously target staff architect roles at hyperscalers (AWS Solutions Architect, GCP Customer Engineer) — these roles pay $200k–$320k TC with equity and have high hiring velocity in 2026.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Lead a FinOps Audit and Propose a 20%+ Cloud Cost Reduction',
      description: 'Cloud cost optimization (FinOps) is the highest-visibility, most measurable cloud architecture responsibility. Use AWS Cost Explorer or GCP Billing dashboard to identify top 5 cost drivers. Propose 3 concrete reductions: right-sizing over-provisioned instances (Compute Optimizer), switching idle workloads to Spot/Preemptible, and decommissioning unused EBS volumes or snapshots. One successful FinOps initiative — "saved $X/month" — is the measurable portfolio item that separates architects from senior engineers in hiring conversations and performance reviews.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Automate Your Infrastructure Deployment with Terraform or AWS CDK',
      description: 'If your cloud infrastructure is still click-ops or partially manual, modernizing to Infrastructure-as-Code is the single highest-leverage skill investment for cloud architects in 2026. Complete the HashiCorp Terraform Associate certification ($70, exam.hashicorp.com) — prep takes 20 hours via Andrew Brown\'s free FreeCodeCamp course. Then migrate one manually managed environment to Terraform. IaC-fluent architects earn 20–30% more and are significantly more employable as companies standardize on IaC for compliance and auditability.',
      layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '45 days', priority: 'Medium',
    },
  ),

  // ── DEVOPS / SRE (Global) ────────────────────────────────────────────────────
  devops: pool(
    {
      title: 'Earn the CKA Certification ($395 via cncf.io) — Book the Exam This Week',
      description: 'The Certified Kubernetes Administrator ($395 from cncf.io, includes 2 free retakes) is the highest-leverage DevOps/SRE certification globally — 58% of cloud-native job postings mention Kubernetes competency. Prep: Mumshad Mannambeth\'s CKA Udemy course ($15 on sale) + Killer.sh (2 simulator sessions included with exam purchase). Study 1.5 hours/day for 5 weeks. DevOps engineers with CKA certification receive 52% more callbacks on LinkedIn for roles at $120k+ salary band. Book the exam this week — the date forces commitment.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '30 days — book; 60 days — pass', priority: 'Critical',
    },
    {
      title: 'Own a GitOps Migration and Earn AWS DevOps Professional ($400)',
      description: 'Mid-level DevOps engineers who own a GitOps migration (ArgoCD or Flux CD) to replace imperative CI/CD pipelines are classified as platform-critical. Propose and lead the migration for one application — it takes 2 sprints and creates a repeatable pattern the team adopts. Document the before/after deployment frequency and lead time reduction. These DORA metrics are the interview artifact that moves you from "DevOps engineer" to "platform lead." Simultaneously: AWS DevOps Professional ($400 exam, Adrian Cantrill course $40) validates CI/CD and IaC skills that command $150k–$200k at cloud-native companies.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '14 days — propose; 90 days — cert', priority: 'Critical',
    },
    {
      title: 'Build and Document an Internal Developer Platform with Measurable DORA Metrics',
      description: 'Senior DevOps/SRE engineers differentiate through platform-level impact, not individual deployments. Build an Internal Developer Platform (IDP) using Backstage.io (open-source, CNCF graduated) that surfaces: service health, deployment frequency, and runbook links in one pane. Instrument DORA metrics — deployment frequency, lead time for changes, MTTR, change failure rate — using DORA DevOps Research benchmarks as the target. Engineers who can present "I improved deployment frequency from biweekly to daily across 12 services" close staff DevOps roles at $180k–$280k TC that others cannot.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Implement Chaos Engineering and Publish Your Steady-State Hypothesis',
      description: 'Chaos engineering (Chaos Monkey, LitmusChaos for K8s, or AWS Fault Injection Simulator) is the highest-signal SRE practice — engineers who design failure experiments have a quantifiably different reliability mindset. Pick one critical service, define a steady-state hypothesis ("99th percentile latency stays below 200ms under 2× normal load"), run the experiment, fix the failures found. Publish the post-mortem as a LinkedIn article or internal RFC. SRE candidates with documented chaos engineering experience close $50k–$80k higher than generalist DevOps engineers.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Automate One Manual Operational Runbook with a Self-Healing Script',
      description: 'Every DevOps engineer has runbooks that are manually executed. Pick one: database failover, certificate rotation, scaling response, or on-call triage. Automate it with a Lambda + EventBridge rule, a Kubernetes operator, or a GitHub Actions workflow. Operational automation reduces toil and creates a demonstrable portfolio artifact. Engineers who reduce toil by 30%+ get promoted and retained; engineers who maintain toil are eventually replaced by the automation they delayed.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '21 days', priority: 'Medium',
    },
  ),

  // ── PLATFORM ENGINEER (Global) ───────────────────────────────────────────────
  platform_engineer: pool(
    {
      title: 'Build a Kubernetes Operator or Helm Chart and Publish It to ArtifactHub',
      description: 'Junior platform engineers differentiate through public GitOps artifacts. Build a Kubernetes Operator using the Operator SDK (Go) or Kopf (Python) that automates a real operational task: automated certificate rotation, database backup scheduling, or self-healing pod recovery. Alternatively, publish a production-quality Helm chart with values schema, tests, and README to ArtifactHub.io. Public artifacts are verifiable proof of Kubernetes competency that hiring managers at Datadog, Grafana Labs, and HashiCorp actively look for on GitHub. 12–15 hours.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Deploy Backstage.io Internal Developer Portal and Publish the DORA Metric Improvement',
      description: 'Mid-level platform engineers who build Internal Developer Platforms are classified as infrastructure-critical — the last cut when restructuring. Deploy Backstage.io (CNCF graduated, free, 1-week setup) surfacing: service catalog, tech docs, CI/CD pipeline status, and on-call integration. Instrument DORA metrics before and after: deployment frequency and lead time for changes are the ROI proof. A "deployed Backstage for 15 teams, improved deployment frequency from weekly to daily" case study closes staff platform engineer roles at $170k–$250k TC that generalist DevOps engineers cannot reach.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Open-Source a Crossplane Composition or ArgoCD ApplicationSet and Target Staff Platform Roles',
      description: 'Senior platform engineers differentiate through public platform engineering artifacts. Publish a Crossplane Composition that provisions a fully-configured EKS cluster (IRSA + ALB controller + Karpenter) in one CR — or an ArgoCD ApplicationSet generator for multi-tenant cluster fleets. Pair with a blog post documenting the design trade-offs between GitOps approaches. This portfolio signals platform-engineering maturity that pulls Staff/Principal-level offers ($220k–$380k TC) at Datadog, Snowflake, Stripe, and HashiCorp. Search roles on Levels.fyi + company career pages directly.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Lead a Karpenter + Spot Instance Cost Optimization to 40%+ Compute Reduction',
      description: 'Karpenter (AWS) or Cluster Autoscaler with spot pools (GCP/Azure) routinely cuts compute spend 40–65%. Instrument the noisiest workload in your cluster with Goldilocks for right-sizing recommendations, then deploy Karpenter NodePools with diversified spot capacity. Document the dollar savings in a 1-page memo to your engineering director with before/after compute cost screenshots. FinOps-fluent platform engineers are the #1 talent shortage at every cloud-native company — this single project is worth a promotion cycle and closes the gap to staff compensation.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Subscribe to Platform Engineering Weekly and Implement One Developer Experience Improvement',
      description: 'Platform engineering evolves fast — Kubernetes 1.30+ features (sidecar containers GA, ValidatingAdmissionPolicy CEL, in-place pod resize), new CNCF graduated projects, and IDP tooling shift quarterly. Subscribe to Platform Engineering Weekly (platformengineering.org), KubeWeekly (lwkd.info), and CNCF TechTalks. Then pick one developer friction point from your retro backlog and eliminate it: pre-configured dev environments (Devcontainers), automated test environment provisioning, or unified observability tooling. Engineers who reduce developer friction by 20%+ are the most protected in headcount reviews.',
      layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
    },
  ),

  // ── QA ENGINEER / SDET (Global) ──────────────────────────────────────────────
  qa_engineer: pool(
    {
      title: 'Earn ISTQB Foundation ($180 at isqi.org) and Build a Playwright Automation Framework',
      description: 'ISTQB Certified Tester Foundation Level ($180 via isqi.org or recognized national boards) is recognized at 97% of companies globally and required for QA roles at financial and regulated-industry companies. Prep: Official ISTQB Glossary + Foundation Level syllabus (both free) — 20 hours to study. Then build a Playwright test framework from scratch: page object model, test data management, parallel execution across browsers, and CI/CD integration via GitHub Actions. QA engineers with ISTQB + a public Playwright framework repo receive 40% more callbacks for SDET roles above $90k. Selenium is declining; Playwright (Microsoft-maintained) is the 2026 standard.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Transition from Manual QA to SDET — Build an Automation Framework for Your Team',
      description: 'Mid-level QA engineers who own the automation framework are protected; those who do only manual testing are the first cut. This week: propose a test automation initiative for one product area. Use Playwright (web) or Appium (mobile) with a page object model, CI pipeline integration, and test reporting dashboard. Present it to your engineering lead with an ROI estimate: "This framework will reduce regression testing time from 3 days to 4 hours." Engineers who quantify QA automation ROI in business terms are reclassified as SDETs, a role that commands $30k–$50k more and has significantly lower layoff risk.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Write a Business-Cased Proposal for AI-Powered Test Generation and Lead Principal SDET Search',
      description: 'Senior QA engineers differentiate by driving investment decisions, not just executing test plans. Write a proposal: "By implementing AI test generation (Copilot for Tests, Diffblue, or CodiumAI), we can reduce test authoring time by 60% and increase coverage from 45% to 72%. ROI: recovered in 2.1 months." Present it to your VP Engineering. Engineers who drive business-cased technology investments are classified as strategic — a high-retention profile. Simultaneously: Principal SDET / Quality Engineering Director roles pay $160k–$240k at Series C+ companies. Source via LinkedIn and Levels.fyi; your proposal is the interview artifact.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 35, deadline: '14 days — proposal; 30 days — present', priority: 'Critical',
    },
    {
      title: 'Implement Contract Testing with Pact and Write a LinkedIn Technical Post',
      description: 'Consumer-driven contract testing (Pact.io, open-source) prevents integration failures in microservices architectures — the failure mode that causes the most production incidents. Introduce Pact to one consumer-provider pair in your system. Document the caught bugs in a LinkedIn technical post: "We eliminated 3 classes of integration failures using Pact contract testing — here\'s how." QA engineers with contract testing experience are considered for senior SDET roles at companies scaling from monolith to microservices — a perpetual hiring market.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Analyze and Document One Quarter\'s Production Incidents by Root Cause',
      description: 'Build a quality intelligence document: pull your last quarter\'s production incidents, classify by root cause (UI regression, API contract break, data pipeline failure, infrastructure event), and identify the top 3 systemic gaps. Present it as a quality brief to engineering leadership. QA engineers who can translate test metrics into business-risk language — "we had 8 incidents caused by untested API changes, costing X engineering hours each" — are reclassified as Quality Strategists. This shift in framing is what separates protected from cut QA in restructuring.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
    },
  ),

  // ── DATA ANALYST (Global) ─────────────────────────────────────────────────────
  data_analyst: pool(
    {
      title: 'Complete dbt Fundamentals (Free) and Build a Public dbt + Snowflake Portfolio Project',
      description: 'dbt Fundamentals is free at courses.getdbt.com (6 hours, self-paced, certificate awarded). Combined with a free Snowflake 30-day trial, build a public dbt project transforming a real dataset (NYC taxi trips, Stack Overflow survey, or your industry\'s open data) into layered models (staging, intermediate, marts) with tests and documentation deployed to dbt docs. Analytics engineers with a public dbt project close roles at $100k–$140k that pure analysts cannot reach. The dbt + Snowflake combination is the #1 requested skills pairing in analytics job postings for 2026.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Earn Tableau Desktop Specialist ($250) or Microsoft PL-300 Power BI ($165) and Lead a BI Initiative',
      description: 'Tableau Desktop Specialist ($250 at tableau.com/learn/certification, free prep via Tableau Public tutorials) or Microsoft PL-300 Power BI Data Analyst ($165 via Microsoft Learn) are the two highest-demand BI certifications globally. Prep time: 30–40 hours for either. Then propose and lead a BI initiative at your company: "I\'d like to build a self-service reporting layer so product and operations teams can answer their own questions without engineering tickets." Mid-level analysts who eliminate the analytics bottleneck are reclassified as analytics leads — a protected profile in restructuring.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '45 days — cert; 14 days — propose', priority: 'Critical',
    },
    {
      title: 'Transition to Analytics Engineering: Python + dbt + Airflow Stack and Staff Role Search',
      description: 'Senior data analysts who can build data pipelines (Airflow or Prefect), transform data with dbt, and serve it via a semantic layer (dbt Semantic Layer or Cube.js) are reclassified as analytics engineers — a role paying $140k–$190k vs $90k–$130k for pure analysts. Complete the Astronomer Academy\'s Airflow Fundamentals course (free, 8 hours). Build one Airflow DAG that ingests, transforms via dbt, and loads to a Snowflake or BigQuery mart. This full-stack analytical pipeline is the interview artifact for staff analytics engineer roles at Stripe, Airbnb, Snowflake, and dbt Labs.',
      layerFocus: 'L3 · Role Displacement', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Build a Python Pandas Automation Script for a Report Your Team Manually Updates',
      description: 'Every analyst team has a weekly report that takes 2–4 hours to compile manually. Automate it: use Python pandas to pull from the source (Postgres/Snowflake/Google Sheets via API), compute the metrics, and output to a formatted Excel or Google Sheet. The script takes one weekend to write. ROI: recovers its build time in 3 runs. Data analysts who automate their team\'s manual work are classified as force multipliers — the first to be promoted and last to be cut in budget reviews. Push the script to a private GitHub repo and reference it in performance reviews.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '14 days', priority: 'High',
    },
    {
      title: 'Write One SQL Optimization Case Study and Present It at a Team Meeting',
      description: 'Find one slow query in your production analytics environment (>30 seconds in Snowflake or BigQuery). Use EXPLAIN ANALYZE to identify the bottleneck — missing index, Cartesian join, or unnecessary aggregation. Fix it and document the before/after execution plan and query time. Present the case study at your next team meeting or 1:1. Data analysts who demonstrate SQL optimization skills — not just querying, but production performance — are automatically considered for senior analyst and analytics engineer roles that generalists cannot access. This 4-hour investment opens a $30k–$50k higher salary bracket.',
      layerFocus: 'L3 · Skills', riskReductionPct: 14, deadline: '14 days', priority: 'Medium',
    },
  ),

};
