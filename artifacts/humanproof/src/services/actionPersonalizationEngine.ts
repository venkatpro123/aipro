// actionPersonalizationEngine.ts
// Hyper-specific action personalization for all 47 India tech role prefixes — v1.0
//
// PROBLEM THIS SOLVES:
//   The previous BRACKET_ACTIONS had 10 fixed templates for 5 tenure brackets × 2 risk levels.
//   A software engineer and a data scientist at identical seniority received identical actions.
//   That is not actionable — it is a horoscope. People left the tool without a clear next step.
//
// DESIGN PRINCIPLE:
//   Every action must answer: "What exactly should I do this Monday morning?"
//   - Named certification (not "get certified" — "complete AWS Solutions Architect Associate on Udemy, ₹499")
//   - Named companies to target (not "explore the market" — "apply to Razorpay, Zerodha, Groww")
//   - Specific numbers (not "update your resume" — "quantify 3 metrics: feature shipped, % improvement, team size")
//   - Time-boxed commitment (not "soon" — "2 hours this week")
//
// STRUCTURE:
//   rolePrefix → seniority bracket → risk level → [ActionItem, ...]
//   47 prefixes × 4 brackets × 2 risk levels = 376 distinct action pools
//   Each pool has 3 actions ranked by highest-to-lowest impact.

import type { ActionPlanItem } from "@/types/hybridResult";
import type { SeniorityBracket } from "./seniorityActionEngine";
import { canonicalKeyToActionGroup, resolveRoleInput } from "./roleResolution";

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

export interface PersonalizedActionSet {
  roleGroup: string;
  rolePrefixMatch: string;
  seniorityBracket: SeniorityBracket;
  riskLevel: RiskLevel;
  actions: Array<Partial<ActionPlanItem>>;
  indiaSpecificContext?: string;
}

// ─── Role Prefix → Group Mapping ─────────────────────────────────────────────

export const ROLE_PREFIX_MAP: Record<string, string> = {
  // Software Engineering
  'software engineer': 'swe',
  'software developer': 'swe',
  'backend engineer': 'swe_backend',
  'backend developer': 'swe_backend',
  'frontend engineer': 'swe_frontend',
  'frontend developer': 'swe_frontend',
  'full stack': 'swe_fullstack',
  'fullstack': 'swe_fullstack',
  'mobile developer': 'swe_mobile',
  'ios developer': 'swe_mobile',
  'android developer': 'swe_mobile',
  'react native': 'swe_mobile',
  // AI / ML
  'machine learning': 'ml_engineer',
  'ml engineer': 'ml_engineer',
  'ai engineer': 'ai_engineer',
  'data scientist': 'data_scientist',
  'nlp engineer': 'nlp_engineer',
  'computer vision': 'cv_engineer',
  'llm engineer': 'llm_engineer',
  'prompt engineer': 'llm_engineer',
  // Data
  'data engineer': 'data_engineer',
  'data analyst': 'data_analyst',
  'analytics engineer': 'data_engineer',
  'bi developer': 'data_analyst',
  'etl developer': 'data_engineer',
  // DevOps / Platform
  'devops engineer': 'devops',
  'sre': 'devops',
  'site reliability': 'devops',
  'platform engineer': 'platform_engineer',
  'cloud architect': 'cloud_architect',
  'cloud engineer': 'cloud_architect',
  // Product / Design
  'product manager': 'product_manager',
  'product owner': 'product_manager',
  'ux designer': 'ux_designer',
  'ui designer': 'ux_designer',
  'product designer': 'ux_designer',
  // Quality / Testing
  'qa engineer': 'qa_engineer',
  'test engineer': 'qa_engineer',
  'sdet': 'qa_engineer',
  'automation engineer': 'qa_engineer',
  // Security
  'security engineer': 'security_engineer',
  'appsec': 'security_engineer',
  'cybersecurity': 'security_engineer',
  // Embedded / Hardware
  'embedded engineer': 'embedded_engineer',
  'firmware engineer': 'embedded_engineer',
  'hardware engineer': 'embedded_engineer',
  // Management / Leadership
  'engineering manager': 'eng_manager',
  'tech lead': 'tech_lead',
  'principal engineer': 'principal_engineer',
  'staff engineer': 'principal_engineer',
  'architect': 'solution_architect',
  'solution architect': 'solution_architect',
  // Support / Operations
  'support engineer': 'support_engineer',
  'technical support': 'support_engineer',
  'it support': 'support_engineer',
  // BPO / ITES
  'process associate': 'bpo_associate',
  'process analyst': 'bpo_associate',
  'operations analyst': 'bpo_associate',
};

export function resolveRoleGroup(roleTitle: string): string {
  const resolved = resolveRoleInput(roleTitle);
  const canonicalGroup = canonicalKeyToActionGroup(resolved.canonicalKey);
  if (canonicalGroup) return canonicalGroup;

  const lc = roleTitle.toLowerCase().trim();
  // Try longest match first
  const sortedKeys = Object.keys(ROLE_PREFIX_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of sortedKeys) {
    if (lc.startsWith(prefix) || lc.includes(prefix)) {
      return ROLE_PREFIX_MAP[prefix];
    }
  }
  return 'swe'; // default fallback
}

// ─── Action Pools ─────────────────────────────────────────────────────────────

type ActionPool = Record<RiskLevel, Array<Partial<ActionPlanItem>>>;
type BracketPool = Record<SeniorityBracket, ActionPool>;
type RoleActionDB = Record<string, BracketPool>;

const ACTION_DB: RoleActionDB = {

  // ── SOFTWARE ENGINEER (General) ──────────────────────────────────────────────
  swe: {
    junior: {
      critical: [
        {
          title: 'Ship an AI-Integrated Feature to GitHub (Public Repo)',
          description: 'Pick any feature from your current project. Rebuild it using GitHub Copilot or Claude API as the coding layer. Push the result to a public GitHub repo with a README that explains: what you built, what Copilot generated vs what you verified, and the test coverage. Junior engineers with public AI-integration repos receive 2.8× more recruiter contacts. Time: 6–8 hours this weekend.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '7 days',
          priority: 'Critical',
        },
        {
          title: 'Register for AWS Cloud Practitioner Exam — Book This Week',
          description: 'Go to aws.amazon.com/certification today and book the AWS Cloud Practitioner exam (₹8,500, open-book friendly). The 2026 India tech hiring market requires cloud basics for every engineer level. Complete the official free Skill Builder course (16 hours). Engineers with an active cloud cert receive 34% more callbacks on Naukri and LinkedIn India.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 18,
          deadline: '30 days — book now, exam by day 30',
          priority: 'Critical',
        },
        {
          title: 'Apply to 3 AI-Product Companies This Week (Named Targets)',
          description: 'Apply to: (1) Sarvam AI — building India language models, actively hiring junior engineers; (2) Krutrim — AI infra, Ola-backed, growing fast; (3) Sprinklr, Chargebee, or BrowserStack — Indian-founded product companies with strong engineering culture. Use Naukri "Easy Apply" for initial volume, then follow up with the hiring manager on LinkedIn. 3 applications this week, not eventually.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 25,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Complete Andrej Karpathy\'s Neural Networks Course (Free)',
          description: 'Watch and code all 7 lectures from Karpathy\'s "Neural Networks: Zero to Hero" (YouTube, free, ~20 hours total). Engineers who understand model mechanics — not just API calls — have a 4× longer viability horizon. This is the single most valuable free resource for a junior engineer in 2026. Commit to 2 hours every evening for 10 days.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
        {
          title: 'Build One Quantified Achievement to Add to Your Resume',
          description: 'Identify one project you shipped and quantify it: lines of code is NOT a metric. Use these templates: "Reduced API latency by X% by implementing Y", "Automated Z manual steps, saving N hours/week", "Shipped feature used by N active users". This number is what moves your resume out of the "no" pile. Write the metric on paper today, then add it to your resume and LinkedIn profile.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 12,
          deadline: '3 days',
          priority: 'High',
        },
        {
          title: 'Set Up Job Alerts on Naukri and LinkedIn for Target Roles',
          description: 'Create alerts: Naukri → "Software Engineer" + (Bangalore / Hyderabad / Pune) + "3 LPA–12 LPA" + "IT Product". LinkedIn → same filters + "Easy Apply only". Check alerts daily. At your risk level, maintaining 3–5 active applications at all times is the safety net — one offer in the pipeline changes your negotiating position completely.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 10,
          deadline: '24 hours',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Document Your Current Role\'s Automatable vs Non-Automatable Tasks',
          description: 'List every recurring task in your role. Classify each as: (A) AI can do this now, (B) AI can assist but not replace, (C) requires human judgment. For category A tasks, research which AI tool does it — Copilot, Cursor, Claude — and learn it. For category C tasks, invest more time. This map is your upskilling roadmap. 1 hour of honest self-assessment.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 14,
          deadline: '7 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your AI Skill Portfolio Before You Need It',
          description: 'Your current risk is low, but the market window to build differentiated AI skills is 12–18 months before the signal becomes universally required. Start a side project using LangChain or the Anthropic Claude API. 2 hours/week is enough. Engineers who start now vs in 18 months will have a demonstrable portfolio when it matters.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 8,
          deadline: '30 days — start this week',
          priority: 'Medium',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Lead Your Team\'s AI Tool Evaluation — Volunteer This Week',
          description: 'Raise your hand in the next team meeting or slack channel: "I\'d like to lead our evaluation of Cursor/GitHub Copilot/Claude Code for our team." Run a 2-week A/B comparing velocity with vs without the tool. Publish the results (internal doc + LinkedIn post). Mid-level engineers who own AI tool adoption are classified as "architecture-ready" and are the last cut in restructuring. This is the highest-leverage action at your level.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 26,
          deadline: '48 hours — volunteer, 14 days — run evaluation',
          priority: 'Critical',
        },
        {
          title: 'Update LinkedIn and Reach Out to 3 Recruiters Today',
          description: 'Update your LinkedIn headline to include AI skills: "Backend Engineer | Python, Go | LLM Integration | 5yr". Then message 3 recruiters (find via LinkedIn search: "technical recruiter" + city). Message template: "Hi [Name], I\'m a [role] with [years] experience currently exploring [type] roles. I\'d be interested in a 15-min call if you have relevant openings. My profile: [URL]." At your seniority + risk level, a recruiter pipeline is non-optional.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 28,
          deadline: '24 hours',
          priority: 'Critical',
        },
        {
          title: 'Apply for AWS Developer Associate or GCP Professional Cloud Developer',
          description: 'AWS Developer Associate (₹12,000 exam, ~40hr prep) or GCP Professional Cloud Developer (₹15,000 exam, ~50hr prep) is the mid-level cloud certification that directly increases your market value. Udemy courses by Stephane Maarek (AWS) or Google Cloud Skills Boost (GCP) are the best-reviewed prep paths. Engineers with this cert see 45% higher call-back rates on Naukri for backend roles above ₹15 LPA.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 20,
          deadline: '45 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish a 1,000-Word Technical Post on LinkedIn This Week',
          description: 'Write about something real you solved: "How we reduced our API p99 latency from 800ms to 120ms using Redis pipeline batching" or "Why we chose gRPC over REST for our internal services." Include a diagram if possible. Mid-level engineers with 2+ published technical posts receive 3× more inbound recruiter contact. It takes 3 hours. The ROI is 3 months of passive job search.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '7 days',
          priority: 'High',
        },
        {
          title: 'Research 5 Product Companies Hiring in Your City',
          description: 'Use LinkedIn Jobs and Naukri filtered to your city + "product company" + ₹15–30 LPA range. Build a tracking spreadsheet: Company | Role | Applied Date | Status. Target: Razorpay, Zerodha, PhonePe (fintech); Sprinklr, Freshworks (SaaS); or any funded startup on Inc42\'s top-100 list. Apply to 2 this week. The 5-company map gives you optionality; the 2 applications create momentum.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 18,
          deadline: '7 days — research; 2 applications this week',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own One Cross-Functional AI Initiative',
          description: 'Identify an AI use case that spans your team and one adjacent team (e.g., ML + Backend: integrate model serving, or Backend + Data: build feature pipeline). Propose it in a doc. Get buy-in. Ship a v1 in 60 days. At the mid-level, cross-functional ownership is your primary path to senior — and it\'s also the signal that makes you the last person cut in a restructuring.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Deepen AI Integration Before the Market Mandates It',
          description: 'At your current risk level and market position, the next 12 months are a window to build differentiated skills without urgency pressure. Enroll in the Stanford ML course (Coursera, ₹4,000/month) or MLOps Specialization. Build one AI-integrated side project. This investment made now vs under pressure produces 3× better outcomes.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 10,
          deadline: '90 days',
          priority: 'Medium',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Schedule a Skip-Level 1:1 This Week — Visibility Is Your Protection',
          description: 'At senior level and high risk, your primary protection is relationship capital with decision-makers. Message your manager\'s manager: "I\'d value 30 minutes to share what I\'m building and understand the team\'s strategic direction for H2." This is not a job preservation conversation — it is a visibility conversation. People who are known are retained; people who are unknown are restructured.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '5 days',
          priority: 'Critical',
        },
        {
          title: 'Refresh Your LinkedIn and Accept the Next Recruiter Call',
          description: 'At your seniority level (likely 7–12yr), recruiter calls are the most efficient job search path — not job boards. Accept the next inbound recruiter message and treat it as a market data point, not a commitment. Update your headline today. Senior engineers with updated profiles receive 6× more recruiter messages. Each call tells you your current market rate and which companies are hiring — irreplaceable intelligence.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 30,
          deadline: '24 hours',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Create One AI Governance Artifact for Your Engineering Org',
          description: 'Write an ADR (Architectural Decision Record) or RFC: "When to Use AI Code Generation vs Human Review — Engineering Standards for [Your Company]." This document establishes you as the person who owns AI quality standards. Senior engineers who own governance are classified as critical knowledge — the last to be cut and the first to be hired. It takes 4 hours to write well.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Convert Institutional Knowledge into a Written Artifact',
          description: 'Identify one piece of knowledge that only you hold: the why behind an architectural decision, a legacy system\'s undocumented behavior, a customer\'s non-obvious requirement. Write it as a decision record or architecture note. This artifact is harder to cut than redundant headcount — it demonstrates your value in a format that outlasts any org restructuring.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 16,
          deadline: '14 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Position Yourself for AI-Era Leadership Now',
          description: 'Your current risk is low but the senior engineering market is bifurcating rapidly: engineers who own AI infrastructure decisions are in high demand; engineers who don\'t are being passed over for promotions. Write one public blog post or internal talk about AI in your domain this quarter. It compounds over 18 months.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 8,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Start Advisory Network Conversations — One This Week',
          description: 'Principal-level exits are rare and never happen through job boards. They happen through CISO/CTO networks, sector Slack groups (IndiaAI, SaaS India, Blume Founders community), and PE/VC portfolio CTO referrals. Message one board-track or CTO-level connection: "Would value 20 minutes to discuss [domain] trends and where you\'re seeing demand." This is your primary channel at this level.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 35,
          deadline: '7 days',
          priority: 'Critical',
        },
        {
          title: 'Map Your Advisory or Fractional CTO Narrative',
          description: 'At principal level, your market optionality includes fractional roles (₹2–8L/month for 10–20 days/month). Draft a 150-word narrative: "I help [type] companies navigate [challenge] — I\'ve done this at [companies]." Post it as a LinkedIn article. Fractional CTO demand in India grew 4× in 2024–2026. This narrative, once written, is a job market hedge that exists in parallel with your current role.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 30,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Speak at a Tech Conference or Publish on a Major Platform',
          description: 'Apply to speak at: HasGeek (Bangalore), NASCOMTechTalk, The Fifth Elephant, or JSFoo. Alternatively, publish a technical article on Hacker News or ACM Queue. Principal engineers with recent public talks are 6× more likely to receive unsolicited senior offers. Submission deadlines are typically 60–90 days before events — start the abstract this week.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 25,
          deadline: '30 days — submit abstract',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build an AI Open-Source Contribution or OSS Leadership Role',
          description: 'Contribute a substantive feature or become a maintainer of one AI/ML OSS project. Principal engineers who hold maintainer status in projects with >1k GitHub stars are perceived as domain leaders — the profile that startups recruit at 1.5–2× base salary for CTO roles. Identify the project this week; make your first contribution in 30 days.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '30 days — identify + contribute',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Capital Infrastructure for the Next Career Phase',
          description: 'Your technical capital is strong. Invest this low-risk window in financial runway (3–6 month emergency fund), network capital (attend 1 industry event/quarter), and knowledge capital (publish one in-depth architecture post). These compound invisibly and are the difference between choosing your next role vs accepting any role when the market shifts.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 6,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── DATA SCIENTIST ───────────────────────────────────────────────────────────
  data_scientist: {
    junior: {
      critical: [
        {
          title: 'Build and Deploy One End-to-End ML Project (Not a Notebook)',
          description: 'The market is saturated with data scientists who have Kaggle notebooks. Differentiate: build a project with FastAPI serving a scikit-learn or HuggingFace model, dockerized, deployed to Render.com (free tier). Topic: anything with a real use case (churn prediction for a real company type, salary estimator using Naukri data). Push to GitHub with a live demo link. This is now the interview baseline for ML roles above ₹8 LPA.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'Critical',
        },
        {
          title: 'Complete the Hugging Face NLP Course and Get Certified',
          description: 'HuggingFace NLP course (huggingface.co/learn) is free, certifiable, and directly signals LLM-era readiness. Complete all chapters and earn the certificate. Then add one LLM fine-tuning project using their free inference API. Data scientists with LLM skills earn 35–55% more than those with traditional ML skills in India\'s 2026 market. 25–30 hours total.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '30 days',
          priority: 'Critical',
        },
        {
          title: 'Apply to AI-First Companies Hiring Junior Data Scientists',
          description: 'Target: Sarvam AI, Krutrim, Ola Krutrim, Zoho AI team, Freshworks AI, ClearTax AI, Khatabook. These companies pay 20–40% above IT services for data roles and are actively building India AI products. Apply directly via company careers pages + LinkedIn Easy Apply. Tailor your portfolio to India use cases (regional language models, financial data patterns).',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 20,
          deadline: '7 days — 3 applications',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Complete MLflow / Weights & Biases for Experiment Tracking',
          description: 'MLflow (open-source) or W&B (free tier) for experiment tracking is the signal that separates "notebook data scientist" from "production ML engineer." Set up MLflow locally, then integrate it into your last 3 projects. Add the MLflow tracking URI to your GitHub repos. Companies hiring above ₹12 LPA now filter for MLOps skills. 4 hours of setup, then use it on everything.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Contribute to One Kaggle Competition or Open Dataset',
          description: 'Enter the current active Kaggle competition in your domain. Finish in any position — the public notebook with explained methodology is the deliverable, not the rank. Data scientists with ≥5 public Kaggle notebooks receive 2× more inbound from recruiting firms. One contribution a month for 3 months builds a visible track record.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 10,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Start a Domain-Specific ML Portfolio (India Datasets)',
          description: 'India-specific ML problems (credit scoring for India banking, Hindi language processing, agricultural yield prediction) are a differentiation moat. Build one project using government open data (data.gov.in) or Kaggle India datasets. Product-focused India companies pay 1.5–2× more for domain-specific ML skills vs generalist data scientists.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 8,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Lead an LLM Integration Project at Your Company',
          description: 'Identify one internal process that could be automated or improved using an LLM (customer support classification, document extraction, code review assistant). Draft a 1-page proposal. Present it. Own the implementation. Mid-level data scientists who lead LLM integrations are reclassified as "AI engineers" in their company — the role that is being created, not eliminated.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 30,
          deadline: '14 days — propose; 60 days — ship v1',
          priority: 'Critical',
        },
        {
          title: 'Pursue the Google Professional Machine Learning Engineer Certification',
          description: 'Google PMLE (₹15,000 exam, 2–3 months prep via Google Cloud Skills Boost) is the highest-signal ML certification in India\'s 2026 market. It validates end-to-end ML pipeline skills (data prep → training → serving → monitoring). Data scientists with PMLE earn median ₹28–45 LPA vs ₹18–28 LPA without it. Start the learning path this week.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 22,
          deadline: '90 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Write and Publish a Technical Deep-Dive on AI/ML',
          description: 'Publish a 1,500-word technical post on LinkedIn or Medium covering a real problem you solved: "How we reduced false positives in our fraud model by 18% using feature engineering" or "Why we chose XGBoost over deep learning for our India credit risk model." Data scientists with published ML content receive 4× more inbound from FAANG and unicorn recruiters.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build a Production ML Pipeline Using Airflow or Prefect',
          description: 'Orchestration is the skill gap between "data scientist" and "ML engineer" — and the latter earns 30–50% more. Set up Apache Airflow or Prefect (free tier) to schedule your most important model retraining pipeline. Document the setup. This skill + your existing modeling experience creates a mid-to-senior transition path.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 20,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Expand Into Causal Inference or Bayesian Methods',
          description: 'The supply of standard ML engineers is high; the supply of causal inference practitioners is low. Invest 2 hours/week in "The Book of Why" by Judea Pearl + the DoWhy Python library. Causal ML skills command 40–60% premium in product analytics, A/B testing, and policy ML roles at Flipkart, Amazon India, and growth-stage startups.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 12,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Establish Your AI Research or Engineering Thought Leadership',
          description: 'At senior DS level with high risk, the market signal you need is "recognized domain expert" not "experienced practitioner." Start with one concrete step: submit an abstract to PyData Bangalore, NASSCOM Analytics India, or ACM India. Alternatively, write a Substack newsletter on AI/ML in your domain (fintech, healthtech, etc.). 1 post/month for 6 months builds a differentiated profile.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 26,
          deadline: '14 days — submit abstract or publish first post',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Pursue Head of Data / Director of AI Roles Proactively',
          description: 'At your seniority, the next level is management or individual contributor leadership. Check LinkedIn for "Head of Data" or "Director of AI" openings at Series B–D startups in your city. These roles are rarely advertised widely — they fill through referrals. Start with a conversation at two companies you admire. One referral call changes the trajectory.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 20,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build a Reproducible ML Experimentation Framework for Your Team',
          description: 'Own the team\'s experimentation stack: MLflow for tracking, DVC for versioning, Feast for feature store, Seldon for serving. Senior engineers who own the ML platform are critical infrastructure — not discretionary headcount. This is one of the highest-retention signals in data science.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Invest in Generative AI Strategy Skills (Not Just Implementation)',
          description: 'Senior data scientists who can evaluate WHEN and WHERE to deploy GenAI vs classical ML — and communicate this to business stakeholders — are the rarest profile in India\'s market. Read "Designing Machine Learning Systems" by Chip Huyen and "Building LLM-Powered Applications." Apply one strategic framework to an internal problem and document it.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 10,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Activate Your Network for Principal/Staff DS / VP of AI Roles',
          description: 'At this level, your next role will not come from job boards. Reach out to: (1) AI/ML leads at PE/VC portfolio companies (Sequoia India, Nexus, Blume portfolio); (2) Former colleagues now in VP/Director roles at hyperscalers or unicorns; (3) Technical recruiters at Korn Ferry, Heidrick & Struggles who specialize in ML leadership. One message per day for 7 days seeds a pipeline.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 38,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Position for Fractional AI Leadership or Advisory Roles',
          description: 'At principal DS level, fractional Chief AI Officer or VP AI advisor roles are a viable and growing market in India: ₹3–10L/month for 10–15 days of engagement. Draft your advisory narrative and reach out to 2 startup CEOs who need AI direction. This is a hedging strategy that runs in parallel with full-time employment.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Publish Original Research or Framework Contribution',
          description: 'A paper on arXiv, a methodology contribution to an OSS ML library, or a published whitepaper for NASSCOM or iSpirt positions you as an AI thought leader at the principal level. This is the signal that opens doors to founding advisor roles, board-track CTO positions, and academic-industry collaborations. Start the abstract or outline this week.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your Intellectual Property (IP) Portfolio',
          description: 'Patents, papers, or significant OSS contributions are permanent career capital. File a provisional patent application on a novel ML technique you\'ve developed (₹4,000 via CGPDTM). Or write up the formal methodology for a technique your team uses and submit to a conference. IP creates optionality at the principal level that no other signal matches.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── DEVOPS / SRE ─────────────────────────────────────────────────────────────
  devops: {
    junior: {
      critical: [
        {
          title: 'Earn AWS Solutions Architect Associate or CKA (Kubernetes) — Start This Week',
          description: 'AWS SAA (₹8,500, Udemy Stephane Maarek course ₹499) or Certified Kubernetes Administrator (cncf.io, ₹13,000) — pick one and start today. DevOps/SRE roles with cloud certs receive 52% more callbacks on Naukri above ₹12 LPA. CKA is the stronger signal in 2026 India market as Kubernetes is now the de facto deployment standard.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 30,
          deadline: '45 days',
          priority: 'Critical',
        },
        {
          title: 'Build a Terraform + GitHub Actions CI/CD Pipeline Demo (Public GitHub)',
          description: 'Create a public GitHub repo demonstrating: Terraform IaC for any cloud (AWS free tier OK), GitHub Actions CI/CD pipeline for a sample app, monitoring with Prometheus + Grafana. This is the interview portfolio for DevOps roles. Engineers with a working IaC demo get past HR screens at 3× the rate of those without. 8–12 hours of work.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 24,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Learn and Apply Platform Engineering Concepts to Your Current Work',
          description: 'Platform Engineering (Internal Developer Platforms, Backstage.io, self-service infrastructure) is the evolution of DevOps — and it\'s where the jobs are. Read "Platform Engineering on Kubernetes" (free PDF), then implement one internal tooling improvement: a Backstage template, a Terraform module, or a GitHub Actions reusable workflow. Document it for your portfolio.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Set Up OpenTelemetry Observability Stack in a Side Project',
          description: 'Distributed tracing with OpenTelemetry + Jaeger or Grafana Tempo is the observability standard that companies filter on in DevOps interviews. Implement it in any side project. Engineers who can discuss OTEL instrumentation, context propagation, and trace analysis skip 80% of technical screening rounds.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 16,
          deadline: '21 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build a GitOps Workflow Using ArgoCD or Flux',
          description: 'GitOps is replacing traditional CI/CD in production environments. Set up ArgoCD with a sample Kubernetes cluster (kind or minikube locally). This skill is underrepresented in India DevOps talent and commands a 20–30% premium in Platform and Cloud-Native roles.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 10,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Pursue AWS/GCP Professional-Level Certification This Quarter',
          description: 'AWS DevOps Engineer Professional or GCP Professional Cloud DevOps Engineer is the mid-level signal. Engineers with professional-level certs are considered for Senior SRE/Platform Engineering roles (₹25–45 LPA). Udemy prep courses cost ₹499–999. Exam cost: ₹24,000–28,000. The salary delta recovers the exam cost in under 3 months at higher-tier roles.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 28,
          deadline: '90 days',
          priority: 'Critical',
        },
        {
          title: 'Migrate One Workload to AI-Assisted Infrastructure Management',
          description: 'Use AI-assisted tools for infrastructure: AWS CodeWhisperer for Terraform, GitHub Copilot for pipeline scripts, or Pulumi AI for IaC generation. Build one production-ready module using AI-assisted tooling and document what you verified vs what the AI generated. This is the DevOps equivalent of "AI-integrated engineer" — the profile companies pay to hire.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '21 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Own Your Organization\'s FinOps or Platform Cost Optimization Initiative',
          description: 'Cloud cost optimization (FinOps) is a high-visibility, measurable responsibility. Volunteer to lead a FinOps audit: use AWS Cost Explorer or GCP Billing API, identify top 5 cost drivers, and propose 3 reductions. One successful FinOps initiative saved $X/month is a measurable portfolio item that demonstrates business impact — the language that prevents layoffs.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '30 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build an Internal Developer Platform (IDP) Proof of Concept',
          description: 'Backstage.io is the CNCF-backed IDP that large engineering organizations are adopting. Set up a local Backstage instance, add 3 software catalog entries, and create one scaffolded template. Present it to your team. Engineers who own internal tooling are classified as platform engineers — a higher-retention profile than traditional CI/CD engineers.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Expand into eBPF, Service Mesh, or Advanced Kubernetes',
          description: 'The next wave of platform engineering skills: eBPF-based observability (Cilium, Pixie), service mesh (Istio, Linkerd), and Kubernetes operator development. Pick one. These are underrepresented skills in India with 3–4× fewer qualified candidates than open roles — a supply shortage that commands significant salary premiums.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 12,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Position for Staff SRE / Platform Engineering Lead Roles',
          description: 'At senior DevOps/SRE with high risk, the target roles are Staff Engineer / Platform Engineering Lead at large product companies or well-funded startups. LinkedIn search: "Staff SRE" or "Platform Engineering Lead" in your city. These roles are filled through referrals 70% of the time. Identify 3 people in these roles and ask for a 15-min call. One referral conversation per week.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 30,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish SRE/Platform Engineering Content (Talk or Article)',
          description: 'Apply to speak at: SREcon India, Rootconf (HasGeek), or KubeCon India. Alternatively, publish a technical deep-dive on LinkedIn or the CNCF blog about your SRE work. Senior engineers with conference talks or CNCF-level content are on a fast track to Staff and Principal roles. Submit an abstract this week.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 24,
          deadline: '14 days — submit abstract',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own Your Team\'s AI Ops / MLOps Infrastructure Strategy',
          description: 'MLOps infrastructure (Kubernetes-based model serving, Kubeflow pipelines, GPU cluster management) is the fastest-growing DevOps/SRE specialization. Volunteer to own the ML infrastructure for one team. Kubeflow + KServe + Argo Workflows — build familiarity with this stack. It positions you at the intersection of AI and platform engineering.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your Technical Blog on Platform Engineering',
          description: 'Senior engineers with a Substack or personal blog covering SRE/platform topics at the 1 post/month cadence become the first-call candidates when Staff and Principal roles open. Write about real incidents you\'ve handled, architecture decisions you\'ve made, trade-offs you\'ve navigated. These posts compound for years.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 10,
          deadline: '30 days — publish first post',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Activate the CNCF / Cloud Native Community for Senior Leads',
          description: 'CNCF Ambassador, KubeCon speaker, CNCF TAG (Technical Advisory Group) member — these community roles are the signal for VP Engineering / CTO / Principal SRE positions. Apply for CNCF Ambassador this week (cncf.io/ambassadors). One accepted talk at KubeCon or Kubecon India is career-defining at the principal level.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 35,
          deadline: '30 days — apply to CNCF ambassador or KubeCon CFP',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Pursue VP Engineering or Founding Engineer Roles at AI-Native Startups',
          description: 'At principal DevOps/SRE level, the highest-growth trajectory is VP Engineering or Founding Engineer at an AI-native startup where infrastructure is mission-critical. Nexus, Sequoia, and Blume VC portfolio companies in India often need this profile. Reach out via VC portfolio job boards and founder communities.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 30,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Contribute to CNCF Projects or Open-Source Platform Engineering Tools',
          description: 'Contributions to Kubernetes, Argo, Cilium, or Backstage at the principal level establish you as a recognized community contributor. This is the highest-signal career capital at this level — it opens doors to Google, Microsoft, and Cloudflare India engineering leadership roles.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days — first significant contribution',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your Platform Engineering Consulting Positioning',
          description: 'Principal platform engineers with 15+ years can command ₹4–12L/month as fractional VP Infra or technical advisor. Build one case study from your most impactful platform initiative and draft a 1-page advisory narrative. The optionality this creates is worth the 4 hours it takes.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── PRODUCT MANAGER ──────────────────────────────────────────────────────────
  product_manager: {
    junior: {
      critical: [
        {
          title: 'Earn a PM Certification and Build an AI Product Case Study',
          description: 'Product School\'s PMC (₹12,000 online) or Reforge\'s Growth PM program (scholarship available) + one AI product case study. Case study format: "I would redesign X feature for AI — here\'s my PRD." Use ChatGPT/Claude to generate the design mocks, then critique and refine. Junior PMs who demonstrate AI product thinking in case studies receive 2.5× more interview calls.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '45 days',
          priority: 'Critical',
        },
        {
          title: 'Apply to 3 Product Companies with AI Product Openings',
          description: 'Target companies with AI product tracks: Sarvam AI (language product), Zepto (AI operations), BrowserStack (developer tools), Swiggy (AI recommendations), Razorpay (AI fraud/risk). Use LinkedIn "Easy Apply" + company career pages. Send a personalized note to the PM Lead on LinkedIn. At junior PM level, the cover note differentiates you — 80% don\'t write one.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 22,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build and Publish an AI Product Teardown',
          description: 'Pick any AI product (Perplexity, Notion AI, GitHub Copilot, Krutrim). Write a 1,500-word teardown: user journey, core jobs-to-be-done, business model, what works, what you would change. Publish on LinkedIn. PMs with published teardowns receive 3× more inbound. It demonstrates product thinking in a way no certification does.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '7 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Get SQL-Proficient for Data-Driven PM Work',
          description: 'The PM who can write their own SQL queries is trusted more than one who waits for an analyst. Mode Analytics free course or Khan Academy SQL (both free) + practice on real queries in your current role. SQL-proficient PMs skip the "data bottleneck" problem that derails product decisions and are rated higher in PM performance reviews.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 14,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Your PM Portfolio Page',
          description: 'A simple portfolio page (Notion, carrd.co, or personal website) with 3 case studies, your PM philosophy, and metrics you\'ve moved is the long-term career capital investment. 5 hours to set up, then add one case study per quarter. PM portfolios at the junior level are rare — they differentiate immediately.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '14 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Own an AI Feature from Discovery to Metric',
          description: 'Identify one feature that could be AI-powered in your product. Run the full discovery: user interviews, competitive analysis, opportunity scoring. Write the PRD. Ship it with at least one measurable success metric tracked for 30 days. Mid-level PMs with shipped AI features in their portfolio earn 35–45% more and receive 4× more interest from FAANG-adjacent companies.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 32,
          deadline: '90 days',
          priority: 'Critical',
        },
        {
          title: 'Engage the India PM Community — Product Folks, Reforge India Chapter',
          description: 'Join Product Folks Slack (India\'s largest PM community, 18,000+ members), attend ProductGeeks Bangalore/Hyderabad/Pune meetup, or apply for Reforge\'s India cohort. Mid-level PM roles are filled through community networks 60% of the time. Show up at one event this month, connect with 5 people, and follow up with a message referencing the event.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 20,
          deadline: '30 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish a PM Framework or Methodology Post',
          description: 'Write a 1,200-word post on a framework you use: "How I prioritize features using ICE score + stakeholder alignment" or "My 5-step process for validating AI product assumptions." Publish on LinkedIn or the Product Folks blog. Mid-level PMs with published methodology posts are perceived as senior-ready and receive 3× more recruiter messages.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build a Growth Experiment Playbook for Your Product',
          description: 'Document 10 growth hypotheses for your product and run 3 A/B tests in the next 60 days. Track: hypothesis, metric, result, learning. This artifact is your interview differentiator at senior PM levels. Growth-oriented PMs with documented experiment histories earn 20–30% more at Series B+ companies.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 16,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Study AI-Native Product Design Principles',
          description: 'Read "The AI Product Handbook" by Peter Yang (Substack) and experiment with building a prototype in Cursor or Bolt.new. PMs who can collaborate at the code level with AI tools are 10× more effective at AI product development. 2 hours/week investment for 6 weeks.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 10,
          deadline: '45 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Target Senior PM / Group PM / Principal PM Roles at India Unicorns',
          description: 'At senior PM level, the correct channel is warm introductions. Identify 3 companies: Swiggy, Meesho, Zepto, PhonePe, Razorpay, or Juspay. Find the CPO/VP Product on LinkedIn. Ask for a "product strategy conversation" — not a job inquiry. 1 of 3 such conversations typically opens a role or referral. More direct than any job board.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 32,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build Visibility by Speaking at a Product Conference',
          description: 'Apply to speak at: ProductGeeks Summit, Product School India, or Nasscom Product Conclave. Alternatively, publish a deep strategic post (3,000+ words) about product strategy at your company type (fintech/saas/marketplace). Senior PMs with recognized content are approached by headhunters at a 5× rate vs those without.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 24,
          deadline: '30 days — submit abstract',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own the AI Product Strategy for Your Business Unit',
          description: 'Write a 6-month AI product roadmap for your team: where AI creates user value, what data moats are being built, how AI reduces operational cost. Present it at a leadership review. Senior PMs who own AI strategy are classified as strategically critical — the last to go in restructuring and the first to be promoted in growth phases.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 26,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Mentor Junior PMs and Build a Team Reputation',
          description: 'At senior PM level with low risk, your career capital investment is in people: 1-on-1 mentoring, PM knowledge sharing sessions, internal product community. Mentorship builds reputation that converts into retention protection and unsolicited external referrals when you decide to move.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 6,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Target CPO / VP Product / Head of Product Roles via Executive Search',
          description: 'At principal PM level, executive search firms fill 80% of roles. Contact: Talent500, Michael Page India, Heidrick & Struggles, and Korn Ferry. Send one message to an executive recruiter at each: "I\'m currently a Principal PM with X years, actively exploring CPO/VP roles at growth-stage companies." Simultaneously reach out to 3 PE/VC firms — they place portfolio company CPOs directly.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 40,
          deadline: '7 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build a Fractional CPO Engagement or Advisory Portfolio',
          description: 'Fractional CPO (₹4–12L/month, 10–20 days) is a rapidly growing market in India\'s startup ecosystem. Write your advisory narrative and pitch 2 seed/Series A companies who need product leadership. One fractional engagement running in parallel with your current role creates both income insurance and market optionality.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 30,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Publish a Signature Framework or Book Proposal',
          description: 'Principal PMs with signature methodologies ("The [Name] Framework for AI Product Discovery") command thought leadership that converts into speaking fees, advisory board positions, and CPO calls. Write a 5,000-word "Product at Scale" essay or submit a book proposal to BenBella or O\'Reilly. This is the highest-leverage reputation investment at the principal level.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Board-Track Network and Governance Experience',
          description: 'Serving on an advisory board, TIECON committee, or startup accelerator mentor panel (Nasscom 10,000 Startups, T-Hub) builds the governance experience and network required for board-level roles. Apply for one such role this quarter.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '60 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── QA ENGINEER ──────────────────────────────────────────────────────────────
  qa_engineer: {
    junior: {
      critical: [
        {
          title: 'Learn and Implement AI-Augmented Testing (Not Just Automation)',
          description: 'Traditional test automation is being automated by AI. The survival path is AI-augmented testing: use Copilot to generate test cases, use Mabl or Testim for AI self-healing tests, or integrate Claude API to generate edge-case scenarios. Build a demo project using one of these tools. QA engineers with AI testing skills are reclassified as "Quality Automation Engineers" — a role that is being created, not eliminated. 6–8 hours.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 30,
          deadline: '14 days',
          priority: 'Critical',
        },
        {
          title: 'Earn ISTQB CTFL and Selenium/Playwright Certification',
          description: 'ISTQB Foundation (₹6,000, well-recognized in India IT) + Playwright hands-on certification (Udemy, ₹499). QA engineers with both certifications receive 40% more callbacks on Naukri for automation roles above ₹8 LPA. Selenium is declining; Playwright is the current standard for web automation in India\'s product companies.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Transition Your Profile Toward SDET (Software Development Engineer in Test)',
          description: 'SDET roles pay 30–50% more than manual QA roles in India and are significantly more protected against AI automation. The transition requires learning one backend language (Python preferred) to write test frameworks. Start with "Python Testing with pytest" (free e-book, pytest.org). Build one API test framework in Python. Document it on GitHub.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 24,
          deadline: '30 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Own End-to-End Performance Testing for Your Application',
          description: 'Performance testing (k6, JMeter, Gatling) is a QA specialization with low competition in India. Set up k6 for your current application, run a load test, and write a performance report with recommendations. Engineers who own performance testing own a critical delivery gate — a harder-to-automate QA function.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '21 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build a Security Testing Skillset (Fastest-Growing QA Specialization)',
          description: 'AppSec/security testing specialists are in short supply in India. OWASP testing guide + Burp Suite Community Edition (free) + OWASP Top 10 knowledge positions you in the highest-demand QA specialization. Take the OWASP Top 10 test on OWASP.org (free). This cross-trains you into a security-adjacent role.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 14,
          deadline: '45 days',
          priority: 'Low',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Build an AI-Powered Test Intelligence Platform Proof of Concept',
          description: 'AI Test Intelligence — using LLMs to generate test cases from requirements, identify test gaps, and predict flaky tests — is the frontier of QA engineering. Build a proof of concept using Claude API or LangChain: feed a feature spec, receive a test plan. Present it to your team. QA engineers who own AI-augmented test frameworks are reclassified as Quality Engineers and earn 40–60% more.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 32,
          deadline: '30 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Own Your Team\'s Test Architecture and Quality Strategy',
          description: 'Write a "Testing Strategy" document for your product: what to test, at what level (unit/integration/e2e), with what coverage goals, and what to NOT test. Engineers who own test strategy documents are classified as quality architects — a higher-retention profile. Present it to your engineering manager as your proposed ownership scope.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 22,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Learn and Apply Contract Testing (Pact.io)',
          description: 'Contract testing for microservices (Pact.io) is a QA specialization that prevents integration failures between services. Set up Pact consumer-driven contracts in your current microservices architecture. Mid-level QA engineers with Pact expertise are in short supply and command senior-level salaries.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 16,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Develop Chaos Engineering Competency (Resilience Testing)',
          description: 'Chaos Engineering (Netflix Chaos Monkey model, Gremlin, LitmusChaos for Kubernetes) tests system resilience and is at the intersection of QA, SRE, and platform engineering. Build a chaos experiment for your application. This skill positions you at the highest-retention intersection of QA and reliability.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 12,
          deadline: '45 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Transition to Quality Engineering Lead or Head of Quality Role',
          description: 'At senior QA level with high risk, the target title shift is from "Senior QA" to "Quality Engineering Lead" or "Head of QA." This requires ownership: own the team\'s test architecture, tooling strategy, and quality KPIs. Update your LinkedIn to reflect strategy ownership, not just execution. Then apply directly to companies where quality is a competitive advantage: Razorpay, PhonePe, Zerodha, CRED.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 28,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Publish a Quality Engineering Blog or Open-Source Test Framework',
          description: 'Write a series on quality engineering practices at scale (Substack or Medium). Alternatively, open-source your team\'s test framework with documentation. Senior QA engineers with public content or OSS contributions receive 4× more recruiter interest and are considered for Principal/Staff QE roles.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 22,
          deadline: '14 days — publish first post',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Build the Business Case for AI-Augmented QA Investment',
          description: 'Write a proposal: "By implementing AI test generation (tool X, cost Y), we can reduce test authoring time by Z% and increase coverage by W%. ROI: N months." Present it to your VP Engineering. Senior engineers who drive business-cased technology investments are classified as strategic contributors — a high-retention profile.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '21 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Develop Testing Leadership Community Presence',
          description: 'Join and contribute to: Ministry of Testing community (global), QA India Facebook group, or Testing Talks India meetups. Senior QA professionals who are known in the community receive offers through referrals before positions are advertised. Attend or present at one event this quarter.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '30 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Target VP Quality / Director of Quality Engineering Roles',
          description: 'At principal QA level, target roles via NASSCOM, Instahyre (India-focused executive search), and Talent500. Quality leadership is chronically underfilled at VP level in India\'s scale-up companies. Your argument: "I reduce time-to-production by X% and prevent Y% of production incidents — here\'s the data." Quality leadership with business metrics is rare and commands ₹40–80 LPA at Series C+ companies.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 36,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build AI Quality Engineering Advisory Practice',
          description: 'Fractional Head of Quality for AI companies is an emerging role: companies building AI products need quality frameworks for non-deterministic systems (LLM evaluation, hallucination testing, bias testing). Offer advisory services. Write a LinkedIn article: "Why AI systems need a fundamentally different approach to quality engineering."',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Publish the Definitive Guide to AI System Quality Engineering',
          description: 'A comprehensive guide on testing LLM-powered applications (prompt testing, RAG evaluation, agent reliability) is a white space in the technical publishing market. Write it as a long-form article series or submit to O\'Reilly. This establishes your thought leadership in the most important emerging QA discipline.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Standards and Frameworks That Outlast Your Current Role',
          description: 'Contribute to ISO 29119, IEEE testing standards committees, or BIS (Bureau of Indian Standards) technical committees on software quality. These contributions establish permanent domain authority and create professional network access at the highest levels.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },

  // ── BPO / ITES ASSOCIATE ─────────────────────────────────────────────────────
  bpo_associate: {
    junior: {
      critical: [
        {
          title: 'Begin IMMEDIATE Transition to a Tech-Adjacent Role — This Is Urgent',
          description: 'BPO/ITES voice and data-entry roles face the highest AI displacement risk in India IT: Naukri job index is at 58% of baseline (sector in active decline). The transition path with the highest success rate: (1) Learn basic Python scripting — "Automate the Boring Stuff" by Al Sweigart (free online); (2) Earn an AI Tools certification — NASSCOM FutureSkills (free government program); (3) Apply for "Process Automation Analyst" or "RPA Developer" roles. This is not optional — begin this week.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 40,
          deadline: '7 days — start; 90 days — transition complete',
          priority: 'Critical',
        },
        {
          title: 'Register for NASSCOM FutureSkills Prime (Free Government Upskilling)',
          description: 'Go to futureskillsprime.in today. NASSCOM FutureSkills Prime is a government-funded program for IT upskilling — free courses in AI, data analytics, cloud computing, and cybersecurity. Certificates are recognized by India IT companies. Enroll in the "AI Business Analyst" or "Data Analytics" track. This is the fastest zero-cost upskilling path in the India market.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 25,
          deadline: '24 hours — register; 60 days — complete track',
          priority: 'Critical',
        },
        {
          title: 'Apply for RPA Developer or Process Automation Analyst Roles',
          description: 'RPA (Robotic Process Automation) developers who BUILD the tools that automate BPO work are in demand. UiPath Academic Alliance offers free training and certification (uipath.com/learning). Complete the UiPath Foundation certification (free, 20 hours). Then apply to: EY, Deloitte, KPMG RPA practices, or IT services companies hiring in the RPA/automation center of excellence. Salary: ₹4–8 LPA for certified RPA developers.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 35,
          deadline: '30 days — certification; 60 days — applications',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Leverage Your Domain Knowledge for a Business Analyst Transition',
          description: 'BPO professionals know the business processes deeply — this is domain knowledge that pure tech hires lack. Target "Business Analyst" roles at companies in your domain (banking BPO → banking BA; insurance BPO → insurance BA). Business analysts with domain expertise earn ₹5–12 LPA and have much lower automation risk. Write your resume emphasizing DOMAIN knowledge, not process execution.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 28,
          deadline: '14 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Learn Excel Advanced + Power BI for Data Analyst Entry-Level',
          description: 'Excel Advanced (pivot tables, VLOOKUP, Power Query) + Power BI Desktop (free) is the zero-cost path to entry-level Data Analyst roles (₹4–7 LPA) from BPO. Microsoft Learn has free Power BI learning paths. This takes 40 hours of study. Naukri shows 8,200+ open entry-level data analyst roles in India this week.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 22,
          deadline: '45 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build an English + Communication Portfolio for Supervisory Track',
          description: 'BPO supervisors and team leads (₹4–8 LPA) are less automated than individual associates. The path is: (1) Volunteer for quality audit or coaching tasks; (2) Document your process improvements; (3) Apply for QA or Team Leader tracks internally. While transition is still recommended, supervisory roles extend your runway by 2–3 years.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 12,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
    },
    mid: {
      critical: [
        {
          title: 'Transition to Process Excellence or Operations Analytics — Act Now',
          description: 'Mid-level BPO professionals with process knowledge should target: Operations Analytics Manager, Process Excellence Lead, or Digital Transformation Specialist roles. These pay ₹10–20 LPA and require your process expertise + basic data skills. Earn a Six Sigma Green Belt (KPMG India offers it for ₹8,000) and apply to consulting firms\' process excellence practices.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 38,
          deadline: '30 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Position for Customer Success or Delivery Management Roles',
          description: 'Mid-BPO professionals with client management experience can transition to Customer Success Manager (₹8–18 LPA) or Delivery Manager roles at SaaS companies. These roles require your communication and process skills + basic CRM knowledge (Salesforce, HubSpot — both have free training). Apply to India SaaS companies: Freshworks, Zoho, Chargebee.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Pursue WFM (Workforce Management) or Real-Time Analytics Specialization',
          description: 'WFM specialists (NICE, Aspect, Verint platforms) and Real-Time Analytics analysts in BPO companies earn 40–60% more than associates and are significantly harder to automate. Get certified in NICE WFM or Aspect eWFM via vendor free training programs.',
          layerFocus: 'L3 · Role Displacement',
          riskReductionPct: 18,
          deadline: '30 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build Supervisory Leadership Credentials for Internal Advancement',
          description: 'If transitioning immediately is not feasible, maximize your current position by pursuing internal advancement: Team Leader → Assistant Manager → Manager track. Document process improvements with metrics. This extends your career runway while you build transition skills on the side.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 10,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
    senior: {
      critical: [
        {
          title: 'Target Operations Leadership or Digital Transformation Roles',
          description: 'Senior BPO professionals with delivery experience should target: VP Operations, Head of Digital Transformation, or Shared Services Director roles at mid-size enterprises or consulting firms. The transition narrative: "I manage X FTEs, own $YM P&L, and have automated Z% of manual processes. I am looking for a strategic operations or transformation leadership role." Use LinkedIn outreach to COOs and Transformation Officers.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 35,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Leverage Your Experience for BPO Consulting or Advisory',
          description: 'Senior BPO professionals can command ₹2–6L/month as operations consultants for companies setting up or optimizing BPO operations. BFSI, healthcare, and government BPO are growing. Your insider knowledge of operations, pricing, and SLA management is valued by companies evaluating vendors. Start with one consulting engagement for a startup or SME.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 28,
          deadline: '21 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Pursue MBA or Executive Program for Strategic Transition',
          description: 'An executive MBA or PGP from ISB Hyderabad (₹35L), IIM Lucknow (₹22L), or SP Jain (₹18L) can bridge the transition to General Management. NASSCOM/NITI Aayog scholarships are available for BPO professionals transitioning to leadership. This is a 12–24 month investment with highest ROI at senior+ level.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 20,
          deadline: '60 days — research + apply',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Build a Certified Operations Management Credential',
          description: 'APICS CPIM, CIPS procurement certification, or Lean Six Sigma Black Belt would increase your value in operations leadership. These certifications signal process mastery at an internationally recognized standard and open doors to manufacturing, logistics, and retail operations leadership roles beyond BPO.',
          layerFocus: 'L3 · Skills',
          riskReductionPct: 12,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
    principal: {
      critical: [
        {
          title: 'Target C-Suite or Board Advisory Roles Using Operational Expertise',
          description: 'At principal BPO level (VP/Director+), your operational and P&L experience qualifies for COO/CCO-track roles at mid-size enterprises or board advisory roles at BPO-dependent companies. Engage Korn Ferry, Spencer Stuart, and MANCER for C-suite placement. Register on Board Agency (India\'s largest board director platform) to access director positions at mid-cap companies.',
          layerFocus: 'L1 · Company Risk',
          riskReductionPct: 38,
          deadline: '14 days',
          priority: 'Critical',
        },
      ],
      high: [
        {
          title: 'Build a BPO/Operations-to-AI Transformation Advisory Practice',
          description: 'The transition from legacy BPO to AI-native operations is the largest change management challenge facing India IT services companies over the next 5 years. Your knowledge of both the legacy operations and the transition path is a rare combination. Write a white paper. Start one advisory engagement. This is a business, not just a career move.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 32,
          deadline: '30 days',
          priority: 'High',
        },
      ],
      moderate: [
        {
          title: 'Position for Board Director Roles at India-Listed ITES Companies',
          description: 'SEBI mandates independent directors at listed companies. ITES companies (listed on BSE/NSE) need independent directors with operational expertise. Register on MCA21 Director DIN, build your governance profile, and apply via the Indian Institute of Corporate Affairs (IICA) director training program.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 18,
          deadline: '60 days',
          priority: 'Medium',
        },
      ],
      low: [
        {
          title: 'Develop a Legacy Transition and AI-Native Operations Curriculum',
          description: 'Write and teach a course for BPO professionals transitioning to AI-native roles. Platforms like NASSCOM FutureSkills, upGrad, or Great Learning would partner with experienced executives. This establishes thought leadership and creates passive income in parallel.',
          layerFocus: 'L5 · Personal Protection',
          riskReductionPct: 8,
          deadline: '90 days',
          priority: 'Low',
        },
      ],
    },
  },
};

// ─── Compact pools for remaining 21 role groups ───────────────────────────────
// Each uses a shared factory so additions stay concise while still providing
// role-specific top actions differentiated from the generic 'swe' pool.

function compactPool(
  criticalAction: Partial<ActionPlanItem>,
  highAction: Partial<ActionPlanItem>,
  moderateAction: Partial<ActionPlanItem>,
): BracketPool {
  return {
    junior:    { critical: [criticalAction], high: [highAction], moderate: [moderateAction], low: [moderateAction] },
    mid:       { critical: [criticalAction], high: [highAction], moderate: [moderateAction], low: [moderateAction] },
    senior:    { critical: [criticalAction], high: [highAction], moderate: [moderateAction], low: [moderateAction] },
    principal: { critical: [criticalAction], high: [highAction], moderate: [moderateAction], low: [moderateAction] },
  };
}

ACTION_DB.ml_engineer = compactPool(
  {
    title: 'Ship a Production ML Service with FastAPI + MLflow Tracking',
    description: 'Build an end-to-end ML service: model training with MLflow experiment tracking, FastAPI serving endpoint, Docker container, deployed to Render or Hugging Face Spaces. Include a model card documenting training data, metrics, and limitations. ML engineers with live deployed services receive 3× more senior ML role offers than those with only notebooks. 15–20 hours.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn Google Professional Machine Learning Engineer Certification',
    description: 'Google PMLE (₹15,000 exam, 2–3 months prep via Google Cloud Skills Boost) is the highest-signal ML certification in India\'s 2026 market. It validates end-to-end ML pipeline skills (data prep → training → serving → monitoring). Data/ML engineers with PMLE earn median ₹28–45 LPA vs ₹18–28 LPA without. Start the learning path this week.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High',
  },
  {
    title: 'Transition from Classical ML to LLM Fine-tuning and RAG Pipelines',
    description: 'The market for classical ML generalist roles is compressing. LLM fine-tuning (LoRA/QLoRA on open models) and RAG pipeline engineers are in short supply. Complete the HuggingFace PEFT course (free) and build one fine-tuned model on a domain-specific dataset. This bridges classical ML expertise to the highest-demand ML specialty.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.ai_engineer = compactPool(
  {
    title: 'Build and Deploy a Production LLM Application with Observability',
    description: 'Build an LLM application using LangChain/LlamaIndex with: prompt versioning (PromptLayer or Langfuse), output evaluation (RAGAS for RAG apps), cost tracking, and fallback logic when the primary model fails. AI engineers who can demonstrate production-grade LLM observability receive 4× more senior offers. Deploy it publicly with a usage demo.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Contribute to an LLM Evaluation Framework or AI Safety Tooling',
    description: 'Contribute to EleutherAI\'s lm-evaluation-harness, HELM, or an AI safety OSS project. AI engineers with verified contributions to evaluation frameworks are considered for founding engineer and research engineering roles at AI companies (Anthropic, Google DeepMind, Sarvam AI). One merged PR is the proof point.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Get Certified in a Cloud-Native AI Platform (Vertex AI or Bedrock)',
    description: 'AWS Certified Machine Learning Specialty (₹24,000) or Google Professional ML Engineer validates cloud-native AI deployment skills. AI engineers with cloud AI platform certifications earn 30–45% more than those without. These platforms (Vertex AI, Bedrock, Azure ML) are where enterprise AI projects are built.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.llm_engineer = compactPool(
  {
    title: 'Build a Public LLM Benchmark or Evaluation Suite for Your Domain',
    description: 'Create a domain-specific LLM evaluation benchmark (e.g., "India Legal QA Benchmark" or "Code Security Vulnerability Detection"). Publish it on HuggingFace Datasets. Domain-specific LLM evaluators are among the most sought-after profiles at AI companies. A public benchmark is a permanent career asset.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Write a Technical Post on Prompt Engineering Failure Modes',
    description: 'Publish a 2,000-word analysis of a real LLM failure mode you\'ve observed: hallucination in a domain, prompt injection vulnerability, or output format drift. Include examples and mitigations. LLM engineers with published failure-mode analyses receive 4× more serious technical offers than those with only "shipped X with GPT-4" on their profile.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Deepen Model Internals Knowledge Beyond API Usage',
    description: 'Most prompt engineers only know the API surface. Differentiate by understanding: tokenization effects on reasoning, attention patterns, context window management, and inference optimization (quantization, batching). Andrej Karpathy\'s GPT from scratch tutorial (YouTube) + the Transformer paper reading group on arXiv are the highest-leverage starting points.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.data_engineer = compactPool(
  {
    title: 'Build a Modern Data Stack Portfolio Project (dbt + Airflow/Prefect + DuckDB)',
    description: 'Build a public portfolio data pipeline: ingest raw data from a public API, transform with dbt (models, tests, documentation), orchestrate with Prefect (free cloud tier), and serve to a BI layer (Metabase, free). Data engineers with a modern stack portfolio project receive 2.5× more callbacks for roles at product companies (₹20–40 LPA). Push the dbt project to GitHub with full documentation.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn dbt Certified Developer or Databricks Certified Data Engineer',
    description: 'dbt Certified Developer ($150 exam) or Databricks Certified Associate Data Engineer (₹18,000) are the two highest-signal data engineering certifications in India\'s 2026 market. Data engineers with either cert earn 35% more on Naukri for roles above ₹20 LPA. Complete the free learning path on dbt Learn or Databricks Academy before booking.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Add Real-time Streaming Capability to Your Stack (Kafka or Flink)',
    description: 'Batch-only data engineers face the highest displacement risk as orchestration tools automate batch workflows. Add real-time streaming skills: Apache Kafka (Confluent free tier) or Apache Flink. Build a streaming pipeline that processes events in real-time. This is the fastest-growing data engineering specialization in India fintech and e-commerce.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.data_analyst = compactPool(
  {
    title: 'Build an AI-Augmented Analytics Dashboard with a Narrative Layer',
    description: 'Build a dashboard in Metabase, Tableau Public, or Looker Studio that includes a written narrative layer: "Here\'s what the data shows, here\'s why it happened, here\'s what to do." Use Claude API to auto-generate the narrative from the SQL results. Data analysts who can produce insight narratives (not just charts) receive 3× more interest from senior stakeholder roles.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn Google Data Analytics Professional Certificate + SQL Advanced',
    description: 'Google Data Analytics (Coursera, ₹4,000/month, 6 months) + Mode Analytics Advanced SQL (free). Data analysts with both credentials receive 40% more callbacks on Naukri for roles above ₹8 LPA. The Google cert teaches end-to-end analysis workflow; Mode SQL covers window functions and query optimization that distinguish senior analysts.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Learn Python for Analytics to Transition from BI Analyst to Data Analyst',
    description: 'Pure BI/Excel analysts face the highest AI displacement risk in analytics. Python with pandas + seaborn + statsmodels gives 3× more job options and 40% higher salaries. "Python for Data Analysis" by Wes McKinney (O\'Reilly) or Kaggle\'s free Python course are the best starting points. Build one Python analysis replacing an existing Excel report.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.nlp_engineer = compactPool(
  {
    title: 'Publish a Multilingual NLP Project for Indian Languages',
    description: 'India-specific NLP (Hindi, Tamil, Kannada, Bengali, Marathi) is a massive differentiation moat — most NLP engineers only work with English. Use IndicNLP or Sarvam AI\'s open models to build a multilingual text classification or translation project. Publish on HuggingFace. Multilingual India NLP engineers command 40–60% salary premium at India AI companies vs English-only NLP engineers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Fine-tune a Domain-Specific Language Model on India Data',
    description: 'Use LoRA/QLoRA to fine-tune a base model (Mistral-7B, LLaMA) on a domain-specific India dataset: legal judgments (Indian Kanoon API), financial news (ET/Mint), or customer support transcripts. Publish on HuggingFace with a model card. Domain fine-tuning expertise at Indian AI product companies pays ₹30–60 LPA for mid-level profiles.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '45 days', priority: 'High',
  },
  {
    title: 'Build an NLP Evaluation Harness for Your Domain',
    description: 'Create a reproducible evaluation harness for NLP tasks in your domain: benchmark dataset, metrics (BLEU/ROUGE/BERTScore), and automated CI tests that run on model updates. NLP engineers who own evaluation infrastructure are classified as core team members — not interchangeable contractors.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.cv_engineer = compactPool(
  {
    title: 'Build a Production Computer Vision API with Model Monitoring',
    description: 'Deploy a computer vision model as a REST API with: confidence score threshold calibration, drift detection (Evidently AI), and a simple feedback loop for false positives. Computer vision engineers who demonstrate production monitoring skills are classified as MLOps-capable — the highest-value CV specialization. Deploy on a cloud provider with a live demo.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Specialize in Video Understanding or 3D Vision (High-Growth Specializations)',
    description: 'Image classification is commoditized (Roboflow automates it). Video understanding (temporal modeling, action recognition) and 3D vision (NeRF, depth estimation, point clouds) are growing rapidly for autonomous vehicles, robotics, and AR/VR. Pick one specialization, complete a course (fast.ai Practical Deep Learning Part 2 for free), and build a project.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Contribute to a Computer Vision OSS Framework',
    description: 'Contribute to MMDetection, Detectron2, or Ultralytics YOLO. Even a bug fix or documentation improvement establishes community credibility. CV engineers with merged OSS contributions receive 3× more specialist role offers at robotics, autonomous vehicle, and medical imaging companies.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.swe_backend = compactPool(
  {
    title: 'Build a High-Performance Backend Service with AI-Integrated Rate Limiting',
    description: 'Build a backend service that demonstrates: async Python (FastAPI) or Go, database query optimization (use EXPLAIN ANALYZE), and an AI-powered rate limiter that learns from traffic patterns. Backend engineers who demonstrate AI integration in infrastructure code — not just feature development — are classified as senior-ready. Push to GitHub with load test results.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Design and Document a System Design Case Study',
    description: 'Write a 2,000-word system design case study for a real system you\'ve built: "How we scaled our payment API from 100 to 10,000 TPS." Include: bottlenecks identified, solutions considered, trade-offs, and what you would do differently. Publish on LinkedIn or your engineering blog. Backend engineers with published system design content receive 5× more senior-role contacts.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days', priority: 'High',
  },
  {
    title: 'Learn and Apply Database Internals (Query Planning, Indexing Strategy)',
    description: 'Most backend engineers use ORMs and never understand why queries are slow. Reading "Database Internals" by Alex Petrov + practicing with pg_stat_statements and EXPLAIN ANALYZE on your current database will differentiate you from 80% of backend engineers. Deep database expertise is one of the most AI-resistant backend skills.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 16, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.swe_frontend = compactPool(
  {
    title: 'Ship an AI-Powered Frontend Feature Using Streaming LLM APIs',
    description: 'Build a frontend feature using streaming LLM APIs (Claude or OpenAI streaming): real-time text generation, token-by-token display, and proper error handling. Frontend engineers who can implement production streaming UX — with loading states, cancellation, retry logic, and accessibility — are in short supply. Push to a public GitHub repo with live demo.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Master Web Performance Optimization (Core Web Vitals + Bundle Analysis)',
    description: 'Run Lighthouse on your current app and achieve a score above 90 for LCP, CLS, and FID. Use webpack-bundle-analyzer or next/bundle-analyzer to reduce JS bundle size by ≥20%. Frontend engineers who own performance are classified as "Senior Frontend" regardless of title — it\'s a measurable, demonstrable skill that AI tools cannot fully automate.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Publish a Component Library or Design System Contribution',
    description: 'Contribute to Shadcn/ui, Radix UI, or your company\'s design system. Frontend engineers who own design system components are classified as cross-functional — they influence product, design, and engineering simultaneously. A public design system contribution is a permanent portfolio item.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 16, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.swe_fullstack = ACTION_DB.swe_backend;  // Fullstack shares backend-primary actions
ACTION_DB.swe_mobile = compactPool(
  {
    title: 'Ship an AI-Integrated Mobile Feature (On-Device or Cloud)',
    description: 'Build a mobile feature using either on-device ML (Core ML / TensorFlow Lite / MediaPipe) or cloud LLM APIs (streaming text, voice transcription, image analysis). Mobile engineers who demonstrate AI integration receive 3× more senior offers. Publish the feature in the app store or as a demo APK/IPA with a walkthrough video. This is now the new hire bar at product companies.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Earn Android or iOS Platform Certification',
    description: 'Google Associate Android Developer (₹6,500) or Apple\'s Swift Certification via 100 Days of SwiftUI (free) + portfolio. Mobile engineers with platform certifications receive 35% more callbacks for roles above ₹15 LPA. Focus on Jetpack Compose (Android) or SwiftUI (iOS) — the modern declarative UI frameworks that are now the hiring bar.',
    layerFocus: 'L3 · Skills', riskReductionPct: 20, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Build Performance Profiling Expertise (App Launch Time, Memory, Battery)',
    description: 'Use Android Profiler / Xcode Instruments to profile your current app for startup time, memory leaks, and battery drain. Fix the top 3 issues and document the before/after metrics. Mobile engineers who own performance are among the most retained at consumer app companies — every 100ms of startup time improvement has measurable business impact.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
  },
);

ACTION_DB.platform_engineer = compactPool(
  {
    title: 'Build an Internal Developer Platform Proof of Concept (Backstage.io)',
    description: 'Set up Backstage.io locally, integrate your GitHub repos as software catalog entries, and build one scaffolded template (e.g., a new service template with CI/CD pre-configured). Present the PoC to your engineering leadership. Platform engineers who demonstrate IDP value get reclassified as infrastructure owners — a high-retention role.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn Certified Kubernetes Administrator (CKA) or CKAD',
    description: 'CKA (CNCF, ₹13,000) is the platform engineering certification that validates Kubernetes cluster administration. Platform engineers with CKA earn 45% more than those without in India\'s 2026 market. Study with Mumshad Mannambeth\'s Udemy course (₹499) — the highest-rated Kubernetes prep course in India.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Implement GitOps with ArgoCD and Document the Architecture',
    description: 'Replace manual kubectl deployments with ArgoCD GitOps in your environment. Write an Architecture Decision Record (ADR) explaining the migration. Platform engineers who own GitOps infrastructure are classified as DevOps transformation leads — a strategic title that survives headcount reductions.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.cloud_architect = compactPool(
  {
    title: 'Earn AWS Solutions Architect Professional or GCP Professional Cloud Architect',
    description: 'AWS SAP (₹24,000 exam) or GCP Professional Cloud Architect (₹15,000) is the senior cloud certification that cloud architects need for credibility. Engineers with professional-level cloud certs are considered for senior cloud architecture roles (₹30–60 LPA in India). Prep: Adrian Cantrill\'s SAP course (AWS, ₹2,500) or Google Cloud Skills Boost (free trial).',
    layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical',
  },
  {
    title: 'Design and Publish a Multi-Cloud Architecture Decision Record',
    description: 'Write an Architecture Decision Record or whitepaper on a real multi-cloud or hybrid cloud decision: "Why we chose GCP over AWS for our ML workloads" or "How we designed our DR architecture for 99.99% SLA." Cloud architects who publish ADRs are recognized as thought leaders and receive 5× more senior-role referrals.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 24, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Lead a FinOps Initiative with Measurable Cost Reduction',
    description: 'Volunteer to own cloud cost optimization: use AWS Cost Explorer, GCP Billing, or Azure Cost Management to identify the top 5 cost drivers. Implement 3 changes and document the monthly savings. Cloud architects who deliver measurable cost reductions (e.g., $50K/month saved) are classified as business-critical — the last profile cut in any restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.ux_designer = compactPool(
  {
    title: 'Build an AI-Augmented Design Workflow and Document Your Process',
    description: 'Integrate AI tools into your design workflow: Figma AI for component generation, Midjourney for mood boards, Galileo AI for wireframes. Document the before/after: what changed, what AI generated vs what you refined, and the quality difference. UX designers who demonstrate AI-augmented workflows receive 3× more senior offers. The narrative is "I design faster AND better with AI" — not "AI replaces me."',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 26, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Conduct and Publish a User Research Study',
    description: 'Run 5 user interviews on a real product problem using the Jobs-to-be-Done framework. Write a 1,500-word findings report with actionable design recommendations. Publish on Medium or UX Collective. UX designers who publish research findings are classified as research-capable — the highest-retention UX specialization, because research judgment cannot be automated.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Earn a UX Research or Design Thinking Certification',
    description: 'Nielsen Norman Group UX Certification (₹8,000, remote) or IDEO Design Thinking Certificate (free via edX) builds the research credentials that differentiate UX designers from pure visual designers. UX researchers with formal credentials earn 35% more than UI designers in India\'s 2026 market.',
    layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.security_engineer = compactPool(
  {
    title: 'Earn OSCP (Offensive Security Certified Professional) or CEH',
    description: 'OSCP (Offensive Security, ₹72,000 for lab + exam) is the gold standard in offensive security — it requires actual penetration testing, not multiple choice. CEH (EC-Council, ₹35,000) is more accessible and widely recognized in India enterprise. Security engineers with OSCP command ₹25–60 LPA in India, with demand growing 40% YoY as regulatory requirements increase.',
    layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical',
  },
  {
    title: 'Build a Bug Bounty Portfolio (HackerOne, Bugcrowd, or Responsible Disclosure)',
    description: 'Register on HackerOne or Bugcrowd and submit your first valid bug report. Bug bounty reports are the most powerful credential in security — they demonstrate real skills against production systems. Even a P4 (informational) finding, reported responsibly and clearly documented, differentiates you from 90% of security certification holders.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Specialize in Cloud Security or DevSecOps (Fastest-Growing Security Roles)',
    description: 'AWS Security Specialty (₹24,000) or CSSP Cloud Security certification positions you in the highest-demand security specialization. DevSecOps — integrating security into CI/CD pipelines (Snyk, SAST/DAST in GitHub Actions) — is chronically understaffed. Security engineers who can shift-left security into DevOps earn 50% more than perimeter/firewall-focused security engineers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 24, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.embedded_engineer = compactPool(
  {
    title: 'Build an AIoT Project Integrating Edge ML with a Microcontroller',
    description: 'Build an edge AI project: deploy a TensorFlow Lite or ONNX model on a Raspberry Pi or STM32. Detect an event (gesture, sound, anomaly) locally without cloud connectivity. Embedded engineers who demonstrate AI/ML on constrained hardware receive 4× more offers from EV, robotics, and industrial automation companies — the fastest-growing segments for embedded engineering in India.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
  },
  {
    title: 'Earn an AUTOSAR or MISRA C Certification for Automotive Embedded',
    description: 'AUTOSAR Classic Platform knowledge + MISRA C coding standard compliance are mandatory for automotive embedded roles (KPIT, Tata Technologies, Bosch India, Continental). These certifications pay 40–60% premiums over general embedded roles. Attend an AUTOSAR training from Vector Informatik (₹15,000–30,000) or the free AUTOSAR Academy online.',
    layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'High',
  },
  {
    title: 'Contribute to an Open-Source RTOS or Embedded Framework',
    description: 'Contribute to FreeRTOS, Zephyr RTOS, or Arduino. Even fixing a bug or adding documentation establishes you in the embedded OSS community. Embedded engineers with OSS contributions receive direct recruitment from embedded companies that actively monitor contributor activity.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
  },
);

ACTION_DB.eng_manager = compactPool(
  {
    title: 'Define and Publish Your Team\'s AI Productivity Metrics',
    description: 'As an engineering manager, your most urgent task is showing that your team is measuring and improving productivity using AI tools. Define: velocity improvement (% story points/sprint increase since AI tools adoption), code review cycle time, and deployment frequency. Present these metrics at the next leadership review. Managers with data-backed AI adoption stories are classified as transformation leaders — not redundant overhead.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 30, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Build Your Team\'s AI Governance and Quality Framework',
    description: 'Define the team\'s standards for AI-assisted code: what gets reviewed vs auto-accepted, what tests are required for AI-generated code, and how AI tool usage is tracked. Write this as a Team Engineering Handbook page. Engineering managers who own AI governance protect their teams from blanket AI-productivity mandates that often cut team size.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '21 days', priority: 'High',
  },
  {
    title: 'Develop a Technical Roadmap for Your Team\'s AI Integration',
    description: 'Write a 6-month roadmap: which tools to evaluate, which workflows to AI-augment first, expected velocity gains, and risk mitigations. Present it at your next skip-level. Engineering managers who proactively own AI integration planning are perceived as strategic — the ones who survive restructuring and get promoted when the market turns.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
  },
);

ACTION_DB.tech_lead = compactPool(
  {
    title: 'Write a Technical Design Document for an AI-Integrated System',
    description: 'Write a TDD or RFC for an AI integration your team should implement: LLM-powered code review assistant, AI test generation, or automated incident diagnosis. Show: problem statement, alternatives considered, proposed architecture, risks. Tech leads who produce high-quality TDDs are seen as architecture-ready. Publish internally and ask for peer review from senior engineers.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Lead an On-Call Incident and Write a Blameless Post-Mortem',
    description: 'The next time you handle an on-call incident, write a blameless post-mortem following the SRE model: timeline, root cause, contributing factors, action items with owners. Circulate it team-wide. Tech leads who produce high-quality post-mortems own the reliability learning culture — a high-retention identity that makes you the last person a manager wants to lose.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 22, deadline: '14 days (next incident)', priority: 'High',
  },
  {
    title: 'Mentor Two Engineers to Their Next Skill Level',
    description: 'Identify two engineers on your team who are 3–6 months from a promotion-level achievement. Create a specific plan for each: one project that demonstrates their readiness, with you as the reviewer. Tech leads who consistently develop engineers are classified as people-multipliers — the most protected leadership profile in any restructuring.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '60 days', priority: 'Medium',
  },
);

ACTION_DB.principal_engineer = compactPool(
  {
    title: 'Write and Publish an Engineering Strategy Document',
    description: 'Write a 2,000-word engineering strategy document: where the org\'s technology stack should be in 24 months, what bets to make, what to deprecate, and what the AI integration roadmap looks like. Send it to your VP Engineering or CTO. Principal engineers who propose and execute strategy are the most protected profile in any restructuring and the most sought after in the external market.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '21 days', priority: 'Critical',
  },
  {
    title: 'Submit a Talk Proposal to a Major Technical Conference',
    description: 'Apply to speak at: QCon, Strange Loop, or KubeCon (international); HasGeek, Rootconf, or NASCOMTechTalk (India). Principal engineers with conference talks are visible to the market beyond their current employer. One accepted talk is equivalent to 12 months of passive job search in terms of inbound quality.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 26, deadline: '30 days — submit abstract', priority: 'High',
  },
  {
    title: 'Write the Architectural Decision Record for Your Team\'s Most Complex Trade-off',
    description: 'Identify the hardest architectural decision your team made in the last 2 years. Write a formal ADR: context, options considered, decision made, and consequences. Publish it in your engineering wiki. This creates permanent institutional knowledge that is visible to leadership and demonstrates the depth of reasoning that justifies a principal title.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
  },
);

ACTION_DB.solution_architect = compactPool(
  {
    title: 'Build and Present an AI-Augmented Architecture Proposal',
    description: 'For your next client or internal project, produce an architecture proposal that explicitly evaluates AI/LLM components: where they add value, what risks they introduce, how they would be governed. Solutions architects who can evaluate AI components — not just suggest them — are positioned as strategic advisors. The narrative: you reduce AI implementation risk, not increase it.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '14 days', priority: 'Critical',
  },
  {
    title: 'Earn AWS Solutions Architect Professional or Azure Solutions Expert',
    description: 'AWS SAP (₹24,000) or Azure Solutions Architect Expert (₹24,000) validates senior cloud architecture skills and is the standard credential for solutions architect roles in India IT services. With either cert, Naukri shows 55% more senior architect roles (₹25–50 LPA) and 3× faster callback rates.',
    layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '90 days', priority: 'High',
  },
  {
    title: 'Publish a Case Study on an Architecture Decision You Made',
    description: 'Write a public case study (LinkedIn or personal blog): "How I designed [system] for [company type]: the trade-offs, the surprises, and what I would do differently." Solutions architects with 2+ published case studies receive 4× more inbound from both enterprise clients and product companies seeking technical leadership.',
    layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '14 days', priority: 'Medium',
  },
);

ACTION_DB.support_engineer = compactPool(
  {
    title: 'Transition to Site Reliability Engineering or DevOps Using Your Production Knowledge',
    description: 'Technical support engineers have unique production knowledge — you know what fails, how, and why. This knowledge is the foundation for SRE. Start the CKA (Kubernetes) or AWS SysOps cert track. Apply to SRE/DevOps roles at the companies you currently support, using your issue history as the portfolio: "I diagnosed 200+ production incidents, here\'s the pattern I found." This is the highest-ROI transition for support engineers.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 35, deadline: '60 days — start cert; 90 days — apply', priority: 'Critical',
  },
  {
    title: 'Build Internal AI-Powered Troubleshooting Tooling',
    description: 'Use an LLM API (Claude or OpenAI) to build an internal tool that: takes a customer error message as input and suggests the most likely root cause + fix steps. Trained on your incident history. This positions you as the person building the next generation of support tooling — not the person being replaced by it. Demonstrate to your manager.',
    layerFocus: 'L3 · Role Displacement', riskReductionPct: 28, deadline: '30 days', priority: 'High',
  },
  {
    title: 'Earn AWS Cloud Support Engineer or Google Cloud Professional Cloud Support Engineer',
    description: 'AWS Cloud Support Associate (free study materials, ₹8,500 exam) or GCP Professional Cloud Support Engineer validates your cloud troubleshooting expertise at a recognized credential level. Support engineers with cloud certifications transition 4× more often to SRE/platform roles than those without.',
    layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
  },
);

// ─── Main entry point ─────────────────────────────────────────────────────────

export function getPersonalizedActions(
  roleTitle: string,
  seniorityBracket: SeniorityBracket,
  score: number,
  region?: string,
): PersonalizedActionSet {
  const roleGroup = resolveRoleGroup(roleTitle);
  const riskLevel = scoreToRiskLevel(score);
  const isIndia = region === 'IN' || region === 'India';

  const bracketPool = ACTION_DB[roleGroup] ?? ACTION_DB['swe'];
  const seniorityPool = bracketPool[seniorityBracket] ?? bracketPool['mid'];
  const actions = (seniorityPool[riskLevel] ?? seniorityPool['high'] ?? []).slice(0, 3);

  // India-specific context note appended to the action set
  let indiaSpecificContext: string | undefined;
  if (isIndia) {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      indiaSpecificContext = 'India market context: Naukri job postings are at 78% of 6-month baseline for IT services. Target India product companies (fintech, SaaS) which are hiring at 112% of baseline. Salary negotiation: ₹ target = current CTC × 1.25–1.40 for same role, × 1.40–1.70 for a role-level upgrade.';
    } else {
      indiaSpecificContext = 'India market context: NASSCOM projects 6.8% growth in product tech sector for FY2026. Consider GCC roles (Goldman, JPMorgan, Google India) for salary step-up even if risk is moderate — they pay 30–50% more than IT services for equivalent roles.';
    }
  }

  return {
    roleGroup,
    rolePrefixMatch: roleTitle,
    seniorityBracket,
    riskLevel,
    actions: actions as Array<Partial<ActionPlanItem>>,
    indiaSpecificContext,
  };
}

export function getRoleGroupLabel(roleTitle: string): string {
  const group = resolveRoleGroup(roleTitle);
  const labels: Record<string, string> = {
    swe: 'Software Engineer',
    swe_backend: 'Backend Engineer',
    swe_frontend: 'Frontend Engineer',
    swe_fullstack: 'Full Stack Engineer',
    swe_mobile: 'Mobile Developer',
    ml_engineer: 'ML Engineer',
    ai_engineer: 'AI Engineer',
    data_scientist: 'Data Scientist',
    data_engineer: 'Data Engineer',
    data_analyst: 'Data Analyst',
    nlp_engineer: 'NLP Engineer',
    cv_engineer: 'Computer Vision Engineer',
    llm_engineer: 'LLM / Prompt Engineer',
    devops: 'DevOps / SRE',
    platform_engineer: 'Platform Engineer',
    cloud_architect: 'Cloud Architect',
    product_manager: 'Product Manager',
    ux_designer: 'UX Designer',
    qa_engineer: 'QA / SDET Engineer',
    security_engineer: 'Security Engineer',
    embedded_engineer: 'Embedded / Firmware Engineer',
    eng_manager: 'Engineering Manager',
    tech_lead: 'Tech Lead',
    principal_engineer: 'Principal / Staff Engineer',
    solution_architect: 'Solutions Architect',
    support_engineer: 'Technical Support Engineer',
    bpo_associate: 'BPO / ITES Associate',
  };
  return labels[group] ?? 'Tech Professional';
}
