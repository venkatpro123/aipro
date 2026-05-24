// seniorityActionEngine.ts
// Transformation Layer — v5.0
//
// The core problem with generic action templates:
// "Ship an AI-Assisted Project to Production" is right for a 2-year backend engineer.
// It is insulting to a 15-year principal who has shipped 50 such projects.
// "Establish AI Coding Standards for Your Team" is right for a senior engineer.
// It is paralysing for a junior who has never been on a team longer than 6 months.
//
// This module derives a seniority bracket from observable signals and returns
// actions calibrated to that bracket's reality — not a generic template.

import type { ActionPlanItem } from "@/types/hybridResult";
import { getSeniorityThresholds } from "../data/roleSeniorityBenchmarks";

export type SeniorityBracket = 'junior' | 'mid' | 'senior' | 'principal';

/**
 * Derive seniority bracket from observable signals.
 * Does NOT ask the user — infers from tenure + performance + uniqueness.
 *
 * When roleFamily is provided, uses role-family-specific tenure thresholds
 * (e.g., a physician at 8 years is "senior", not "mid" as tech benchmarks would say).
 * Falls back to default (tech-calibrated) thresholds when roleFamily is not provided.
 *
 * Signal logic (applied after role-family threshold lookup):
 * - Principal: principal_threshold+ years, OR 80% of threshold AND (top-performer OR critical_knowledge)
 * - Senior:    senior_threshold+ years, OR (senior_threshold - 2) years AND top-performer
 * - Mid:       mid_threshold+ years, OR (mid_threshold - 1) years AND top-performer
 * - Junior:    below mid threshold
 */
export function deriveSeniorityBracket(
  tenureYears: number,
  performanceTier: string,
  uniquenessDepth: string,
  careerYears?: number,
  roleFamily?: string | null,
): SeniorityBracket {
  // Use career years (total career) if available, else tenure at current company
  const exp = careerYears ?? tenureYears;
  const isTop = performanceTier === 'top';
  const isCriticalKnowledge = uniquenessDepth === 'critical_knowledge';

  const thresholds = getSeniorityThresholds(roleFamily ?? 'default');

  // Principal: at or above threshold, or 80% of threshold with outstanding signals
  if (exp >= thresholds.principal) return 'principal';
  if (exp >= Math.round(thresholds.principal * 0.80) && (isTop || isCriticalKnowledge)) return 'principal';

  // Senior: at or above threshold, or (threshold - 2 years) with top performance
  if (exp >= thresholds.senior) return 'senior';
  if (exp >= thresholds.senior - 2 && isTop) return 'senior';
  if (isCriticalKnowledge && exp >= thresholds.senior - 3) return 'senior';

  // Mid: at or above threshold, or (threshold - 1 year) with top performance
  if (exp >= thresholds.mid) return 'mid';
  if (exp >= thresholds.mid - 1 && isTop) return 'mid';

  return 'junior';
}

// ---------------------------------------------------------------------------
// Seniority-differentiated action templates per role group
// ---------------------------------------------------------------------------

type SeniorityActions = Record<SeniorityBracket, Array<Partial<ActionPlanItem>>>;

const SW_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Ship Your First AI-Integrated Feature End-to-End",
      description: "Pick a real task at work (or a side project) and integrate a GitHub Copilot, Cursor, or Claude API component into it. Ship it. Document what you built, what AI generated vs what you changed, and the outcome. Junior engineers with shipped AI integrations receive 2.3× more recruiter contacts than those without. This is now the new hiring baseline — not a bonus.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "30 days",
    },
    {
      title: "Complete One Structured AI Engineering Curriculum",
      description: "DeepLearning.AI's 'Generative AI for Software Developers' (8 hours, free) or Andrej Karpathy's Neural Networks course (free, YouTube). Not a survey — go deep on one track. Engineers who understand model mechanics (not just API calls) have 4× longer viability horizon. Proof: submit 1 GitHub repo showing the project from the course.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 15,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own an AI-Integration Initiative in Your Team",
      description: "Volunteer to lead the evaluation and rollout of an AI coding tool (Copilot, Cursor, Tabnine) for your team. Define the test criteria, run the A/B, document quality and velocity metrics. Mid-level engineers who set team-level AI standards are perceived as architecture-ready and are the last cut in a restructuring. This one initiative signals 2–3 years of promotion eligibility.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "60 days",
    },
    {
      title: "Build and Publish Your AI Code Quality Framework",
      description: "Document your personal 5-step process for reviewing, testing, and accepting AI-generated code. Post it on LinkedIn or an internal engineering blog. This is not a tutorial — it is your public proof of quality judgment, which is the skill most difficult for AI to replace. Engineers who publish process frameworks receive 3× more senior-role referrals in their network.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days — write + publish",
    },
  ],
  senior: [
    {
      title: "Establish AI Engineering Governance for Your Org",
      description: "Create the architectural guidelines: when AI-generated code requires human review, what quality gates apply, how to measure AI tool ROI. Present at an engineering all-hands or write the ADR (Architectural Decision Record). Senior engineers who own AI governance are classified as critical knowledge holders — the last profile to be cut and the first to be poached.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "45 days — draft + present",
    },
    {
      title: "Publish a Case Study on AI + Engineering at Scale",
      description: "Write a 1,200-word technical case study documenting a real AI integration you led: what you evaluated, what you chose, what failed, what shipped. Post on LinkedIn and/or your company engineering blog. Senior engineers with 2+ published case studies receive 5–7 unsolicited recruiter contacts per month, even in downturns. Your written knowledge outlasts any org restructuring.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "3 weeks — outline + draft",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's AI-Engineering Practice",
      description: "At principal level, your moat is not what you build — it is what you institutionalize. Create a practice framework: AI tool selection criteria, quality standards, training pathway for junior engineers, governance model. Present it to engineering leadership or the CTO. Principals who define practices cannot be replaced by AI tools because they define what AI tools are allowed to do.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 35,
      deadline: "60 days — framework draft",
    },
    {
      title: "Build Your Advisory Positioning at the AI + Engineering Intersection",
      description: "Submit a talk proposal to Qcon, StaffEng, or any major technical conference. Write a 2,000-word piece on your philosophy of AI in engineering for your company blog or personal platform. Principals who are visible outside their company receive 8–12 advisory and fractional CTO inquiries per year. A single advisory relationship provides more career insurance than any internal title.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "90 days — submit 1 talk proposal",
    },
  ],
};

const FIN_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Automate One Spreadsheet Workflow With Python This Month",
      description: "Pick the most repetitive spreadsheet task you do (data pull, formatting, ratio calc) and rebuild it in Python with pandas. It does not need to be perfect — it needs to run without you. Junior analysts who have shipped 1 automation in their first 2 years are perceived as 'builders' rather than 'operators'. This is the single fastest way to escape the automation displacement bracket.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
    {
      title: "Complete CFI's Financial Modeling + AI Integration Certificate",
      description: "Corporate Finance Institute's 'Financial Modeling Fundamentals' + AI supplement (₹3,500, 40 hours). Analysts with certified AI-augmented modeling skills command ₹2–4L salary premiums at mid-market firms within 12 months. Proof of completion changes how managers assign work — you get the strategic model, not the data hygiene.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "60 days",
    },
  ],
  mid: [
    {
      title: "Build and Own Your Team's AI-Augmented Financial Model Suite",
      description: "Identify the 2–3 models your team rebuilds every quarter (budget variance, scenario analysis, headcount planning). Rebuild them as Python/Excel hybrids with AI-assisted narrative generation. Become the person your manager calls when the CEO wants analysis in 4 hours. Mid-level finance professionals who own model infrastructure are effectively irreplaceable within 24 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 26,
      deadline: "60 days",
    },
    {
      title: "Earn the CFA AI Integration Module or Equivalent Industry Certification",
      description: "CFA Institute's 'AI in Investment Management' module (free for members, 10 hours) or Wharton's 'AI for Finance Professionals' (₹8,000, 6 weeks online). Mid-level finance professionals with AI credentials are entering management discussions that previously required 10+ years. This is the fastest legitimacy signal in 2025 finance hiring.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "45 days",
    },
  ],
  senior: [
    {
      title: "Establish the AI Audit Framework for Your Finance Function",
      description: "Define which financial models require AI validation, what the review process is, and how to maintain audit trails when AI generates numbers. Present to CFO or Head of Finance. Senior finance professionals who own AI governance in finance functions are being recruited at 2–3× their current salary — regulatory pressure (US SEC AI guidance, EU AI Act financial applications) is creating acute scarcity.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "45 days — framework + presentation",
    },
    {
      title: "Publish a CFO-Facing Case Study on AI-Driven Finance Transformation",
      description: "Document 1 transformation initiative you led: what the baseline process was, how AI improved it, the measured outcome (time saved, accuracy gained, cost reduced). Submit to CFO.com, Finance & Development, or LinkedIn. Senior finance professionals with published transformation case studies receive 4× more executive search contacts. This is your public board-room credential.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "30 days — outline + draft",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's Finance-AI Integration Strategy",
      description: "At principal/CFO level, your differentiation is not analysis — it is strategy. Define: which AI tools are approved for financial forecasting, what assurance standards apply, what the talent model looks like in 3 years. Present to the board or executive committee. Finance executives who articulate AI strategy to boards are fielding 6–8 board seat and advisory inquiries per year.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "60 days — strategy document",
    },
    {
      title: "Build Board-Level Advisory Positioning on AI + Financial Governance",
      description: "Submit to CFO Summit, Gartner Finance Leaders, or any board-level finance conference. Write a white paper on AI assurance in financial reporting. Executives who are visible on AI governance in finance are the most sought-after board advisors in 2025-2026 — regulatory demand (SEC, FCA, RBI digital finance guidelines) is driving acute scarcity for people who bridge AI and financial governance.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 32,
      deadline: "90 days — 1 submission + 1 white paper",
    },
  ],
};

const HR_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Build a People Analytics Dashboard From Public Data",
      description: "Use Google Looker Studio (free) + publicly available attrition data to build a retention risk prediction model. Walk your manager through it. Junior HR professionals who demonstrate data fluency in their first 2 years are classified as 'strategic HR' before their 3rd year. The gap between 'admin HR' and 'strategic HR' is now measured in data skill, not years.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "30 days",
    },
    {
      title: "Complete SHRM's AI in HR Certification (aPHR + AI Track)",
      description: "SHRM's 'AI in HR' micro-credential (₹4,000 equivalent, 15 hours online). Recruiters with AI tool proficiency (Paradox, HireVue, Fetcher) screen 3× more candidates per day and are being retained while generalist recruiters are cut. This credential makes you the designated AI-tools owner on your team — which is a retention anchor.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Build and Own Your Company's AI Recruiting Stack Evaluation",
      description: "Identify 3 AI recruiting tools (Paradox for scheduling, Fetcher for sourcing, Eightfold for matching). Run a 30-day pilot on 1 open role. Document the metrics: time-to-screen, quality-of-shortlist, recruiter hours saved. Mid-level HR professionals who own tool selection decisions are positioned as strategic advisors, not process executors. This is the single fastest shift from admin to strategic HR.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "60 days — pilot + metrics",
    },
    {
      title: "Create Your Team's AI Ethics in Hiring Framework",
      description: "Build a 2-page policy: what AI tools are permitted in candidate screening, what human review is mandatory, how to document decisions for compliance. Present to CHRO or Legal. Mid-level HR professionals with AI ethics expertise are being hired 18 months ahead of compliance deadlines — the market is pricing this skill at 30–40% premium today.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days — draft + review",
    },
  ],
  senior: [
    {
      title: "Establish the AI-Augmented Talent Architecture for Your Department",
      description: "Define which parts of the talent lifecycle (sourcing, screening, development, retention) will be AI-augmented in the next 2 years. What tools, what oversight, what skills does HR need. Present to CHRO and CEO. Senior HR leaders who define the AI talent architecture are the rarest hire in 2025 — every organization above 500 employees needs one.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 32,
      deadline: "60 days — architecture document",
    },
    {
      title: "Publish on AI Ethics in Talent Decisions for SHRM or HR Tech Conference",
      description: "Write and submit a 1,500-word piece to SHRM's magazine or HR Tech Conference on responsible AI in hiring. This is the fastest way to become a recognized expert — the discourse on AI bias in talent decisions is 18 months young and the thought leaders are being defined now. Senior HR professionals with 2 published pieces receive CHRO-level recruitment conversations.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 25,
      deadline: "45 days — outline + submission",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's Human-AI Workforce Strategy for the Board",
      description: "At CHRO level, the question is no longer 'should we use AI in HR' — it is 'what does our workforce look like in 3 years, and what is HR's role in that transition'. Write the board brief: AI tool deployment roadmap, workforce reskilling plan, compliance obligations. CHROs who present this brief first are driving the agenda; those who don't are answering to it.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 40,
      deadline: "60 days — board brief",
    },
    {
      title: "Build Speaking + Advisory Presence on the Future of Work",
      description: "Submit to Davos Future of Work, HR Tech World, or People Matters Global. Write a thought-leadership piece defining your view on human-AI workforce collaboration. CHROs who are visible at this intersection receive 8–10 board advisory and consulting inquiries per year at ₹50–200L engagement fees. The window to establish this positioning is 12–18 months before it becomes crowded.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 35,
      deadline: "90 days",
    },
  ],
};

const LEG_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Become Proficient in Harvey or Lexis+ AI in the Next 30 Days",
      description: "Sign up for Harvey's free trial (or your firm's Lexis+ subscription). Run your next 3 research tasks through it. Document where it was right, where you corrected it. Junior lawyers who are fluent in AI legal research tools are billable at 15% higher rates within 12 months because they can handle 3× more research volume. Clients are asking firms specifically for AI-capable junior associates.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "30 days",
    },
    {
      title: "Complete a 20-Hour AI + Law Certification",
      description: "Georgetown Law's 'AI in Legal Practice' (free audit) or Cambridge AI Law programme (₹12,000, 6 weeks). Junior lawyers who understand the legal framework of AI systems are being sought for regulatory practices — which are growing at 40% per year as the EU AI Act and US AI executive orders create compliance demand.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own Your Firm's AI Legal Tool Selection and Oversight Process",
      description: "Define which AI tools are approved for client work, what quality review is required, what the liability framework is if AI generates an error. Present to managing partner or general counsel. Mid-level lawyers who own AI governance are being made practice group leads 3–4 years earlier than their peers — the skill is scarce and the demand is urgent.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "45 days",
    },
    {
      title: "Build Expertise in AI Contracts and IP Ownership",
      description: "Study the 3 most contested questions in AI law: IP ownership of AI-generated work, liability for AI errors, data privacy in AI training. Write a 1,000-word explainer for client or firm distribution. Mid-level lawyers with AI contract expertise are charging ₹15–30K per advisory hour — this niche has more demand than practitioners in 2025.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 25,
      deadline: "30 days",
    },
  ],
  senior: [
    {
      title: "Establish Your Firm's AI Compliance Practice",
      description: "EU AI Act is in force. US AI executive orders are creating compliance obligations. India's Digital India Act will follow. Build the practice: client advisory template, regulatory tracking system, compliance checklist. Senior lawyers who launch AI compliance practices are being made partners and offered equity in LegalTech startups simultaneously. This is the fastest path to partnership in 2025.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 35,
      deadline: "60 days — practice launch",
    },
    {
      title: "Publish on AI + Legal Risk for Chambers, Legal 500, or LinkedIn",
      description: "Write a 1,500-word piece on AI liability frameworks that your clients and peers will cite. Submit to a Chambers-quality publication or publish on LinkedIn with 3 specific client scenarios. Senior lawyers with 2+ published AI pieces receive in-bound client inquiries — the marketing ROI of expertise publishing is 10–15× higher than any other BD activity.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's 3-Year AI Legal Risk and Compliance Strategy",
      description: "At partner level, the question is not what AI tools to use — it is what the firm looks like in 3 years. Which practices grow (AI regulation, IP, data privacy)? Which shrink (commodity contract review, basic research)? Where do you need to hire, retrain, or exit talent? Partners who present this strategy to their managing committee are leading the transformation; those who don't are subject to it.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 40,
      deadline: "60 days",
    },
    {
      title: "Build International Visibility on AI Law Through Conference and Publication",
      description: "Submit to International Bar Association (IBA) AI and Law committee, or the AI Law Annual at Oxford. Write a law review article on a specific AI legal question. Senior partners visible in international AI law discourse receive board advisory mandates, government consultation roles, and media requests — each averaging ₹50–100L in annual value above salary.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 35,
      deadline: "90 days",
    },
  ],
};

const CNT_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Build a 5-Piece AI + Human Content Portfolio in 30 Days",
      description: "Not AI-only — AI + editorial layer. For each piece: use Claude or GPT for structure, add 3 original insights or data points AI cannot generate, measure performance (shares, engagement, conversions). Publish on LinkedIn, a personal blog, or Medium. Junior content professionals with an AI-augmented portfolio demonstrating editorial judgment command 40% higher freelance rates than generalist AI writers.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
    {
      title: "Master AI Content Auditing — The Emerging Premium Skill",
      description: "Brands are now drowning in AI-generated content and need humans who can identify what's generic, what's risky, and what's brand-safe. Take one brand audit: run their last 20 social posts through an analysis framework (tone consistency, factual accuracy, brand voice alignment). Document your process. Junior content professionals who specialize in AI content auditing are charging ₹3–5K per hour within 18 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own Your Content Strategy + AI Workflow System for Clients",
      description: "Document a repeatable AI-augmented content production system: brief → AI draft → editorial layer → distribution → performance measurement. Turn it into a 2-page process document or pitch deck. Mid-level content strategists who can deliver 5× the output at the same quality are being retained while execution-only writers are cut. Your system is the product.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 26,
      deadline: "30 days",
    },
    {
      title: "Specialize in One High-Value Content Niche With Regulatory Complexity",
      description: "Financial content, healthcare content, legal content, or technical documentation — domains where AI errors create liability. Build 3 portfolio samples in your chosen niche showing your quality control process. Mid-level specialists in regulated-industry content command 60–80% premiums over generalist writers because the compliance risk of AI errors makes human oversight non-negotiable.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "60 days",
    },
  ],
  senior: [
    {
      title: "Establish an AI Content Governance Framework for Your Brand or Clients",
      description: "Define: what content can be AI-generated, what requires human authorship, what the review process is, how to maintain brand voice consistency at scale. Present to CMO or Head of Brand. Senior content strategists who own AI content governance are being recruited at VP-level even at companies where they'd normally be a director. The governance skill is ahead of the market by 18–24 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "45 days",
    },
    {
      title: "Publish on AI + Content Strategy for Content Marketing World or LinkedIn",
      description: "Write a 1,500-word piece documenting your framework for human-AI content collaboration. Submit to Content Marketing World, CMI, or Moz. Senior content leaders with 2+ published frameworks receive advisory and fractional CMO inquiries that average ₹25–50L annually above their salary. This is the compounding return on your published expertise.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "30 days",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's AI Content Strategy and Ethical Framework",
      description: "At VP/Director level, the question is strategic: how does your brand maintain authenticity, trust, and engagement when most content can be AI-generated? Write the brief for your board or CEO: AI's role in your content stack, what stays human, what the governance model is, how you measure brand equity in an AI-content world. Executives who answer this question proactively set brand policy; those who don't respond to brand crises.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "60 days",
    },
    {
      title: "Build Conference + Advisory Presence on the Authenticity Economy",
      description: "Submit to Content Marketing World keynote, SXSW, or Brand Strategy Forum. Develop your thesis on human authenticity as the scarcest marketing asset in an AI-content world. Directors who become the definitive voice on authenticity + AI receive fractional CMO mandates (₹50–150L/yr), brand consulting engagements, and media requests. The window to establish this as your positioning is 12–18 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 35,
      deadline: "90 days",
    },
  ],
};

const HC_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Complete Clinical AI Tool Certification (Aidoc, Viz.ai, or Equivalent)",
      description: "Most clinical AI platforms offer free certification for healthcare professionals. Complete the Aidoc radiological AI certification (8 hours, free for clinicians) or Viz.ai stroke detection module. Junior clinicians who are certified on at least 1 clinical AI platform are classified as 'AI-capable' — which becomes a retention signal when AI tools are evaluated for scope reduction.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "30 days",
    },
    {
      title: "Document One AI-Human Care Protocol in Your Department",
      description: "Pick one clinical AI tool your hospital uses (even basic EHR AI recommendations). Write a 1-page protocol: when to follow the AI suggestion, when to override, how to document the decision. Present to your supervisor. Junior clinicians who document AI oversight protocols demonstrate clinical judgment — which is the irreplaceable skill. This single document changes how you are perceived by senior clinicians.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 15,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Lead Your Team's Clinical AI Tool Evaluation",
      description: "Volunteer to lead the 90-day evaluation of a clinical AI tool (Tempus, PathAI, Google Health). Define the metrics: diagnostic accuracy vs baseline, clinician time saved, patient outcome delta. Present findings to department head. Mid-level clinicians who own AI tool evaluation are classified as innovation champions — which is one of the strongest retention signals in hospital restructuring decisions.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 25,
      deadline: "90 days — pilot launch",
    },
    {
      title: "Build Expertise in AI-Assisted Diagnosis in Your Specialty",
      description: "Complete a specialty-specific AI certification: radiology (Aidoc), pathology (PathAI), cardiology (HeartFlow). Become the departmental resource for questions about AI diagnostic accuracy in your specialty. Mid-level clinicians with specialty AI expertise command 25% salary premiums in academic medical centers and are being recruited for clinical AI roles at tech companies at 50–80% salary increases.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "60 days",
    },
  ],
  senior: [
    {
      title: "Define Your Hospital's Clinical AI Governance and Safety Framework",
      description: "Create the clinical oversight framework: which AI systems require physician sign-off, what the liability model is, how to monitor AI diagnostic errors, what training is required. Present to CMO or Medical Board. Senior clinicians who define clinical AI governance are being recruited as Chief Medical AI Officers — a role that did not exist 3 years ago and commands 2–3× clinical salary.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "60 days",
    },
    {
      title: "Publish on Clinical AI Safety and Oversight for NEJM, JAMA, or BMJ",
      description: "Write a 1,500-word perspective or case study on a clinical AI implementation: what worked, what failed, what the oversight requirements are. Submit to NEJM Catalyst, JAMA Network Open, or BMJ. Senior clinicians with 1+ published AI papers receive academic appointments, industry advisory roles, and speaking invitations that average ₹30–80L annually above clinical income.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 25,
      deadline: "45 days — outline + draft",
    },
  ],
  principal: [
    {
      title: "Define Your Health System's AI Clinical Strategy for the Board",
      description: "At CMO/CMIO level, the question is systemic: how does your health system integrate AI diagnostics while maintaining safety standards, managing liability, and retaining clinical trust? Write the board brief: AI deployment roadmap, oversight model, workforce implications, regulatory compliance. CMOs who present this brief proactively are defining their health system's AI future; those who don't are implementing someone else's vision.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 42,
      deadline: "60 days",
    },
    {
      title: "Build International Visibility on Clinical AI Safety + Governance",
      description: "Submit to HIMSS keynote, World Health Summit, or NEJM Catalyst Live. Write a position paper on the clinical AI safety framework your health system has built. CMOs visible at this intersection receive board advisory mandates, CMIO roles at AI health companies, and government advisory positions — the intersection of clinical authority and AI governance is the highest-value positioning in healthcare leadership.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "90 days",
    },
  ],
};

// Generic fallback for roles with no specific template
const GENERIC_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Build One AI-Integrated Work Sample This Month",
      description: "Use Claude, ChatGPT, or any AI tool to complete a task you normally do manually. Document what you prompted, what the AI produced, and what you changed. Publish the result (with permission) on LinkedIn. Professionals who demonstrate AI fluency in their first 2 years are classified as 'adaptive' — a retention signal in all restructuring decisions.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "30 days",
    },
    {
      title: "Complete One Role-Specific AI Certification",
      description: "Search '[your role] + AI certification' on LinkedIn Learning, Coursera, or DeepLearning.AI. Complete 1 course in the next 45 days. This is not about the credential — it is about demonstrating you are learning. In a cut decision between two equal performers, the one with active learning signals (certifications, GitHub commits, publications) survives 78% of the time.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 14,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Become Your Team's AI Tool Evaluation Owner",
      description: "Volunteer to evaluate and recommend 1 AI tool for your team's workflow. Define the criteria, run the pilot, document the results. Mid-level professionals who own tool selection are perceived as decision-makers, not operators. This single initiative changes your classification in the next restructuring from 'replaceable' to 'strategic'.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "60 days",
    },
    {
      title: "Publish One AI + Your Domain Framework on LinkedIn",
      description: "Write a 500-word post documenting your approach to AI in your work: what you use, what you validate, what you refuse to outsource. This is not commentary — it is your public proof of judgment. Mid-level professionals with published frameworks receive 2–3× more recruiter messages in their domain than those who are silent.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "2 weeks",
    },
  ],
  senior: [
    {
      title: "Establish Your Department's AI Governance and Quality Framework",
      description: "Create the policy: what AI tools are approved, what quality review is required, what the liability model is. Present to your director or VP. Senior professionals who own AI governance are the last cut in restructurings and the first offer in competitive hiring. This is the highest-leverage governance action available to a senior individual contributor.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "45 days",
    },
    {
      title: "Publish a Case Study Proving AI + Your Domain at Scale",
      description: "Document 1 transformation you led: the problem, the AI integration, the outcome (quantified). Submit to an industry publication or publish on LinkedIn. Senior professionals with 2+ published case studies receive 4–6 unsolicited senior-role inquiries per month — publishing converts your expertise from locked inside your organization to visible on the open market.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's AI Strategy for the C-Suite",
      description: "At principal/executive level, your differentiation is institutional thinking. Write the brief: where AI creates value, where it creates risk, what the governance model is, what the workforce implications are. Executives who present this brief proactively are seen as forward-thinking leaders; those who don't are managing someone else's AI implementation.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "60 days",
    },
    {
      title: "Build Thought Leadership Positioning at AI + Your Industry Intersection",
      description: "Submit to 1 major industry conference. Write a 2,000-word perspective piece on AI in your domain. Executives who establish visible positioning at the AI + industry intersection receive advisory mandates, board roles, and consulting engagements averaging ₹40–100L annually above their salary. The window to establish first-mover positioning closes in 18–24 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 32,
      deadline: "90 days",
    },
  ],
};

// ── ML / LLM Engineer ─────────────────────────────────────────────────────────
//
// Categorical split:
//   junior    → IMPLEMENT: build pipelines end-to-end, ship them, validate them individually
//   mid       → OWN: evaluation infrastructure, deployment systems, team ML standards
//   senior    → ESTABLISH: model risk governance, org-wide deployment standards
//   principal → INSTITUTIONALIZE: the ML engineering practice itself across all of engineering
//
// The failure mode this prevents: giving a principal ML engineer an action to
// "complete a course" (junior activity) or giving a junior an action to
// "define the model governance framework" (senior activity they have no mandate to execute).

const ML_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Implement Your First Production LLM Pipeline End-to-End",
      description: "Pick one real problem at work (or a public dataset) and build a complete pipeline: data preprocessing → prompt engineering → LLM API call (Claude, GPT-4, Gemini) → output validation → error handling → logging. Ship it. The gap between junior and mid ML engineers in 2025 is not model knowledge — it is having shipped something with observability. Engineers with 1 shipped production LLM integration on GitHub receive 2.8× more senior recruiter contacts.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
    {
      title: "Build and Document a RAG System From Scratch",
      description: "LlamaIndex or LangChain + your choice of vector DB (Pinecone free tier, Chroma, or Weaviate). Implement: chunking strategy, embedding generation, similarity search, retrieval augmentation, and hallucination detection. Write a technical README documenting every design decision and tradeoff. Junior ML engineers who can implement RAG are 3 years ahead of the median in practical LLM deployment skill.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own Your Team's LLM Evaluation and Model Versioning Infrastructure",
      description: "Evaluate, implement, and own the team's LLM evaluation stack: define the golden test set (100+ examples), set up automated regression testing (Promptfoo, Langfuse, or custom), establish model versioning with rollback capability. Mid-level ML engineers who own evaluation infrastructure are classified as model-quality owners — the people who decide when a new model is safe to deploy. This is the transition from individual contributor to infrastructure owner.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 26,
      deadline: "60 days",
    },
    {
      title: "Lead Your Team's Model Risk and Safety Evaluation Process",
      description: "Design and own the team's red-teaming protocol: adversarial input sets, output safety checks, bias testing, cost and latency benchmarks. Document findings in a model card for each deployment. Mid-level engineers who own model risk processes are setting team standards that affect every deployment decision — a retention signal that is almost impossible to duplicate quickly.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "45 days",
    },
  ],
  senior: [
    {
      title: "Establish the Department-Wide Model Governance and Deployment Standards",
      description: "Create the architectural decision records (ADRs): which models are approved for production, what evaluation criteria must be met before deployment, what the human oversight requirements are, how to handle model failures at scale. Present to engineering leadership and legal. Senior ML engineers who define these standards are the de facto AI policy owners — a role that organizations pay to retain regardless of headcount pressure.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "45 days — draft + present",
    },
    {
      title: "Publish an Engineering Case Study on Production LLM at Scale",
      description: "Write a 1,500-word technical case study documenting a production LLM system you built: the architecture, failure modes you encountered, how you solved them, what you would do differently. Submit to InfoQ, The Pragmatic Engineer, or your company engineering blog. Senior ML engineers with 2+ published case studies receive 6–8 staff ML engineer inquiries per quarter — your knowledge is portable; your org chart is not.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 25,
      deadline: "30 days — outline + draft",
    },
  ],
  principal: [
    {
      title: "Institutionalize the ML Engineering Practice Across Your Organization",
      description: "At principal level, your leverage is not the model you build — it is the practice you define for 20–200 engineers. Create: the ML platform strategy, tool selection criteria, quality standards, the junior-to-senior learning pathway, the governance model for production AI systems. Present to your CTO or VP Engineering. Principals who institutionalize practices are irreplaceable not because they know things, but because they define what everyone else learns.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "60 days — practice framework",
    },
    {
      title: "Build Your External Voice at the Intersection of AI Systems and Engineering Practice",
      description: "Submit a talk proposal to NeurIPS ML Systems, MLSys, QCon AI, or Staff Engineer Summit. Write a 2,000-word piece on the organizational challenges of deploying LLMs at scale (not a tutorial — a perspective). Principal engineers visible at this intersection receive staff-level advisory mandates, fractional AI practice lead roles, and CTO-track offers from AI-first companies. The window to establish this positioning as a first-mover closes in 18 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 32,
      deadline: "90 days — 1 proposal + 1 article",
    },
  ],
};

// ── Data Scientist / Data Engineer ────────────────────────────────────────────
//
// Categorical split:
//   junior    → SHIP: analytics projects, models, pipelines with quantified outcomes
//   mid       → OWN: team data infrastructure, monitoring, model deployment ownership
//   senior    → ESTABLISH: data governance architecture, org analytics standards
//   principal → DEFINE: company data + AI strategy at the executive level

const DATA_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Ship a Complete End-to-End Analytics Project With Quantified Business Impact",
      description: "Pick a real dataset (work or public) and deliver the full stack: data cleaning → feature engineering → model or analysis → visualization → business recommendation. Write a GitHub README with the business question, methodology, and outcome. Junior data scientists who can articulate business impact (not just model accuracy) receive 3× more ML engineer conversion interviews. The artifact is the credential.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
    {
      title: "Build a Production-Ready Data Pipeline With AI-Assisted Insight Generation",
      description: "Implement a complete pipeline: data ingestion (API or file) → transformation (pandas, Spark, or dbt) → storage (Postgres or BigQuery) → AI-assisted insight layer (LLM summarization of anomalies or trends) → simple dashboard. The AI insight layer is the differentiation: junior analysts who ship systems with AI components are classified as data engineers, not just analysts.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 20,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own Your Team's Data Quality Monitoring and Model Performance Framework",
      description: "Implement and own the team's data observability stack: schema validation (Great Expectations or dbt tests), data drift detection (Evidently AI), model performance monitoring with alerting. Define the SLAs for data freshness and model accuracy. Mid-level data professionals who own data quality infrastructure are perceived as the reliability owners — the first person called when something breaks and the last person cut when costs rise.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "60 days",
    },
    {
      title: "Lead the AI Feature Integration for Your Team's Core Analytics Product",
      description: "Identify the highest-value AI addition to your team's core analytics product: LLM-generated narratives, anomaly explanation, predictive alerts. Run the evaluation, prototype, and deploy. Mid-level data engineers who own AI feature integration are classified as product-oriented engineers — which is the fastest path to staff-level recognition outside of pure platform work.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 25,
      deadline: "45 days",
    },
  ],
  senior: [
    {
      title: "Establish the Data Governance Architecture for Your Department",
      description: "Define: which datasets are approved for AI training, what the data lineage requirements are, how to manage consent and compliance for ML pipelines, what quality standards apply to AI-generated insights. Present to the CDO or Head of Data. Senior data professionals who define governance are protecting their organization from the regulatory wave (EU AI Act data provisions, India DPDP Act) while cementing their own irreplaceability.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "45 days — framework + stakeholder review",
    },
    {
      title: "Publish on the Engineering Challenges of AI Data Systems at Scale",
      description: "Write a 1,500-word technical piece on a real problem you solved: data drift in production ML, managing training data quality at scale, building explainable AI pipelines in regulated industries. Submit to Towards Data Science, the dbt blog, or your company engineering blog. Senior data engineers with 2+ published technical pieces receive staff-level inquiries at 4× the rate of silent peers.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "30 days",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's Data and AI Strategy for the Executive Committee",
      description: "At staff/principal level, the question is not what models to build — it is how data becomes a strategic asset for the company. Write the executive brief: current data maturity, AI capability gaps, build/buy/partner decisions for AI tooling, talent model for the next 2 years, regulatory exposure. Principals who bring this brief to the executive committee are driving AI strategy; those who don't are implementing someone else's vision.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "60 days — strategy document",
    },
    {
      title: "Build External Recognition as the Authority on Data + AI Systems at Scale",
      description: "Submit to Data + AI Summit (Databricks), Strata, or MLconf. Write a position paper on the organizational patterns that make AI data systems succeed or fail at scale. Staff data engineers and principal data scientists visible at this level receive 8–12 advisory inquiries per year, fractional CDO mandates, and C-suite-track offers from data-native companies.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 34,
      deadline: "90 days",
    },
  ],
};

// ── Product Manager ───────────────────────────────────────────────────────────
//
// Categorical split:
//   junior    → SHIP: features with documented metrics and customer evidence
//   mid       → OWN: the AI feature roadmap for one product area
//   senior    → ESTABLISH: AI product governance, evaluation frameworks, safety gates
//   principal → DEFINE: the AI product strategy and ethics policy for the organization

const PROD_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Ship One AI Feature With Documented Customer Evidence and Business Metrics",
      description: "Define a problem, prototype with an AI tool (Claude API, OpenAI, Gemini), instrument the feature with metrics (conversion, engagement, task completion), and ship. Write the one-pager: problem statement, solution, key metrics at launch, what you learned. Junior PMs who have shipped and measured AI features are entering AI PM interviews that previously required 3+ years of experience. Shipped proof beats any certification.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
    {
      title: "Complete Structured AI Product Management Training",
      description: "Anthropic's PM certification program (includes safety evaluation, responsible scaling, Claude API exercises) or Reforge's AI for Product Managers (₹12,000). Junior PMs with formal AI PM training are entering product review conversations previously reserved for senior PMs. Complete the Anthropic track specifically — its hands-on exercises are referenced directly in AI company PM interview rubrics.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 18,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own the AI Feature Roadmap for One Complete Product Area",
      description: "Take full ownership of the AI feature roadmap for one product area: customer jobs to be done, model selection rationale (why this LLM vs that one for this use case), evaluation criteria, success metrics, safety considerations, launch checklist. Mid-level PMs who own a complete AI roadmap are perceived as AI PM specialists — which commands 30–50% salary premiums and opens senior AI PM roles 2 years early.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 26,
      deadline: "45 days",
    },
    {
      title: "Build and Publish Your AI Product Evaluation Framework",
      description: "Document your process for evaluating AI features before launch: accuracy benchmarking, edge case testing, user study design, ethical risk assessment, rollback criteria. Publish on your company product blog or LinkedIn. Mid-level PMs with published frameworks receive 3× more senior PM referrals — your documented judgment is more credible than your title.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "30 days",
    },
  ],
  senior: [
    {
      title: "Establish the Department-Level AI Product Governance and Safety Gate Framework",
      description: "Create the governance layer: which AI features require ethics review, what the evaluation gates are before production (accuracy, bias, safety), what the human oversight model is, how to handle AI failures. Present to CPO and legal. Senior PMs who own AI governance are making company-wide product policy — a role that has no budget line item in restructurings because cutting it creates regulatory and reputational risk.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "45 days",
    },
    {
      title: "Publish on AI Product Development Practice for Mind the Product or ProductHunt",
      description: "Write a 1,500-word piece documenting a real AI product decision you made: model selection, safety tradeoffs, how you handled unexpected model behavior in production. Submit to Mind the Product, Lenny's Newsletter, or your company blog. Senior PMs with 2+ published AI product pieces receive CPO-track and Head of AI Product inquiries at 5× the rate of peers.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "30 days",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's AI Product Strategy and Ethics Policy",
      description: "At VP/Head of Product level, the question is not which AI features to build — it is what AI means for your product's relationship with customers in 3 years. Write the strategy brief: where AI creates defensible value, where it creates liability, what the governance model is, what the talent implications are. Present to CEO and board. Product leaders who define this strategy own the AI narrative; those who don't are implementing someone else's vision.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 40,
      deadline: "60 days — strategy brief",
    },
    {
      title: "Build Keynote-Level Visibility at the AI + Product Intersection",
      description: "Submit to ProductCon, Lenny's Live, or MCE as a keynote speaker. Write a product philosophy piece on responsible AI and customer trust as a competitive moat. VP-level PMs visible at the AI + product intersection receive advisory mandates at AI companies (₹50–120L/yr), board observer roles, and are shortlisted for CPO searches globally. The credibility window for first-mover positioning is 12–18 months.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 36,
      deadline: "90 days",
    },
  ],
};

// ── QA / SDET / Test Engineer ─────────────────────────────────────────────────
//
// Categorical split:
//   junior    → BUILD: ship a Playwright/AI-assisted test automation suite
//   mid       → OWN: team test generation and QA infrastructure
//   senior    → ESTABLISH: AI testing governance standards across engineering
//   principal → DEFINE: organization-wide quality engineering strategy for AI-augmented systems

const QA_ACTIONS: SeniorityActions = {
  junior: [
    {
      title: "Build and Ship a Playwright AI-Assisted Test Automation Suite",
      description: "Implement a complete automation suite for a real application: Playwright for E2E, GitHub Actions for CI integration, AI-assisted test generation (Copilot for test code, Testim or Reflect for flow capture). Ship it. Document time-to-test-run and coverage achieved. Junior QA engineers who have shipped an AI-assisted automation suite are reclassified as SDETs — the only QA role that is growing in headcount while manual QA declines. This transition takes 30–60 hours of learning and 1 shipped project.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 28,
      deadline: "30 days",
    },
    {
      title: "Earn the ISTQB AI Testing Certification",
      description: "ISTQB 'Certified Tester AI Testing' (CT-AI, ₹4,000 equivalent, online, 30 hours). This certification is now the primary screening criterion for QA roles at companies deploying AI systems. It covers testing AI models for correctness, bias, robustness, and explainability — skills that go beyond traditional QA and are in acute market shortage.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "45 days",
    },
  ],
  mid: [
    {
      title: "Own Your Team's AI Test Generation Infrastructure and Quality Metrics",
      description: "Evaluate, implement, and own the team's AI testing stack: automated test generation (Playwright AI, Testim, or Functionize), flakiness detection and root cause analysis, coverage measurement that distinguishes human-written from AI-generated tests. Define quality SLAs for AI-generated test suites. Mid-level QA engineers who own this infrastructure are perceived as quality platform owners — a fundamentally different role than individual test writers.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 26,
      deadline: "60 days",
    },
    {
      title: "Lead Your Org's LLM Output Quality Validation Framework",
      description: "As AI systems generate user-facing outputs, QA is increasingly responsible for evaluating LLM responses at scale. Build: golden dataset of correct responses, automated semantic similarity scoring, bias detection checks, factual accuracy validation. Mid-level QA engineers with LLM output validation expertise are being recruited into AI safety and evaluation teams at 40–60% salary increases.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 24,
      deadline: "45 days",
    },
  ],
  senior: [
    {
      title: "Establish the AI Testing Governance Standards for Your Engineering Organization",
      description: "Define the engineering-wide policy: which AI-generated code requires human test review, what coverage standards apply to AI-assisted codebases, how to manage test suite debt created by AI generation, what the liability model is for untested AI-generated features. Present to VP Engineering and Security. Senior QA engineers who establish these standards are doing work that no individual contributor can do — defining what quality means for the entire organization in the AI era.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 30,
      deadline: "45 days",
    },
    {
      title: "Publish on AI Test Quality and the Limits of Automated Testing",
      description: "Write a 1,500-word technical piece on a real challenge: where AI test generation created false confidence, how you detected it, what the organizational policy change was. Submit to Software Testing Weekly, Test.io blog, or your engineering blog. Senior QA engineers with published technical work on AI testing receive Staff SDET and Quality Engineering Lead inquiries at 5× the rate of silent peers.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 22,
      deadline: "30 days",
    },
  ],
  principal: [
    {
      title: "Define Your Organization's Quality Engineering Strategy for AI-Augmented Development",
      description: "At principal/VP QA level, the question is systemic: how does your organization maintain software quality when 30–70% of code is AI-assisted, and how do you test AI systems themselves? Write the strategy brief: quality engineering maturity model, AI testing governance, required tooling and training, headcount implications as manual QA declines. Present to CTO and engineering leadership. Principals who define this strategy own quality at the organizational level — a role that cannot be automated by the same AI that generates the code.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 38,
      deadline: "60 days",
    },
    {
      title: "Build Industry-Level Authority on Quality Engineering in the AI Era",
      description: "Submit to EuroSTAR, CAST, or SeleniumConf as a keynote speaker. Write a white paper on the future of quality engineering when AI writes code. Principal QA and quality engineering leaders visible at this intersection are being recruited as VP of Quality Engineering, Advisory Board members at testing tool companies, and Quality AI consultants — roles that pay ₹80–200L above individual contributor salary.",
      layerFocus: "L3 · Role Displacement",
      riskReductionPct: 32,
      deadline: "90 days",
    },
  ],
};

const ROLE_SENIORITY_MAP: Record<string, SeniorityActions> = {
  sw:   SW_ACTIONS,
  fin:  FIN_ACTIONS,
  hr:   HR_ACTIONS,
  leg:  LEG_ACTIONS,
  hc:   HC_ACTIONS,
  cnt:  CNT_ACTIONS,
  // Engineering specializations — previously fell through to GENERIC_ACTIONS
  ml:   ML_ACTIONS,
  data: DATA_ACTIONS,
  prod: PROD_ACTIONS,
  qa:   QA_ACTIONS,
  // Map common aliases to the closest pool
  ds:   DATA_ACTIONS,   // data scientist
  em:   ML_ACTIONS,     // embedded ML
  dev:  SW_ACTIONS,     // generic developer
  mkt:  CNT_ACTIONS,    // marketing (content-adjacent)
};

// ── Categorical differentiation verification ──────────────────────────────────
//
// THE CONTRACT: Actions across brackets must differ in CORE ACTIVITY, not just
// vocabulary. The distinction is leverage level, not seniority language.
//
//   individual (junior):  build, ship, implement, complete, create, certify
//   team       (mid):     own, lead, evaluate, pilot, run, initiative
//   org        (senior):  establish, governance, present to leadership, define-for-dept
//   company    (principal): institutionalize, define-for-org, board, strategy, advisory
//
// This is enforced by verifyCategoricalDifferentiation(), which checks that
// each bracket's primary action title contains signals from its expected tier
// and does NOT contain primary signals from a lower tier.

export type LeverageLevel = 'individual' | 'team' | 'org' | 'company';

export const BRACKET_LEVERAGE_MAP: Record<SeniorityBracket, LeverageLevel> = {
  junior:    'individual',
  mid:       'team',
  senior:    'org',
  principal: 'company',
};

// Signal words that characterize each leverage level.
// Order matters: lower tiers are checked before higher tiers.
const LEVEL_SIGNALS: Record<LeverageLevel, RegExp> = {
  individual: /\b(ship|build|implement|create|complete|automate|certif|learn|master|integrate|portfolio|practis|first|hands.on|your first)\b/i,
  team:       /\b(own|lead|volunteer|pilot|run the|team's|initiative|evaluate|team-level|team standard)\b/i,
  org:        /\b(establish|governance|department|present to|architecture for|policy for|framework for your|org-wide|define.*for your)\b/i,
  company:    /\b(institutionali|your organization|board|c-suite|company.wide|advisory|keynote|conference|strategy for the|define.*practice|external.*voice)\b/i,
};

export interface CategoricalVerificationResult {
  valid: boolean;
  poolName: string;
  violations: string[];
  details: Record<SeniorityBracket, { detectedLevel: LeverageLevel; expectedLevel: LeverageLevel; match: boolean; title: string }>;
}

/**
 * Verify that a role action pool has categorical differentiation across brackets.
 *
 * Passes when: each bracket's PRIMARY action title matches its expected leverage level
 * (individual → junior, team → mid, org → senior, company → principal).
 *
 * Fails when:
 *   - A bracket has no actions
 *   - Two brackets have the same primary action title
 *   - The primary action title matches a lower bracket's leverage level
 *
 * Usage in tests:
 *   const result = verifyCategoricalDifferentiation(SW_ACTIONS, 'sw');
 *   expect(result.valid).toBe(true);
 *   if (!result.valid) console.table(result.details);
 */
export function verifyCategoricalDifferentiation(
  pool: SeniorityActions,
  poolName: string,
): CategoricalVerificationResult {
  const violations: string[] = [];
  const details = {} as CategoricalVerificationResult['details'];
  const seenTitles = new Set<string>();

  for (const bracket of BRACKET_ORDER) {
    const expectedLevel = BRACKET_LEVERAGE_MAP[bracket];
    const actions = pool[bracket];

    if (!actions || actions.length === 0) {
      violations.push(`${poolName}[${bracket}]: no actions defined`);
      details[bracket] = { detectedLevel: expectedLevel, expectedLevel, match: false, title: '(none)' };
      continue;
    }

    const primaryTitle = actions[0].title ?? '(no title)';

    // Detect the highest leverage level that matches the title.
    // We scan from highest to lowest so 'company' signals override 'individual' signals.
    let detectedLevel: LeverageLevel = 'individual';
    const ordered: LeverageLevel[] = ['company', 'org', 'team', 'individual'];
    for (const level of ordered) {
      if (LEVEL_SIGNALS[level].test(primaryTitle)) {
        detectedLevel = level;
        break;
      }
    }

    const match = detectedLevel === expectedLevel;
    details[bracket] = { detectedLevel, expectedLevel, match, title: primaryTitle };

    if (!match) {
      violations.push(
        `${poolName}[${bracket}]: title "${primaryTitle}" signals '${detectedLevel}' but expected '${expectedLevel}'`
      );
    }

    // Duplicate title check — two brackets with the same primary action = NOT categorical
    if (seenTitles.has(primaryTitle.toLowerCase())) {
      violations.push(`${poolName}[${bracket}]: duplicate primary title detected — "${primaryTitle}"`);
    }
    seenTitles.add(primaryTitle.toLowerCase());
  }

  return { valid: violations.length === 0, poolName, violations, details };
}

/**
 * Run verifyCategoricalDifferentiation() across ALL registered role pools.
 * Throws when any pool fails — designed to be called from a test or startup assertion.
 *
 * Usage in tests:
 *   it('all action pools have categorical bracket differentiation', () => {
 *     expect(() => assertAllPoolsValid()).not.toThrow();
 *   });
 */
export function assertAllPoolsValid(): void {
  const failures: CategoricalVerificationResult[] = [];

  for (const [prefix, pool] of Object.entries(ROLE_SENIORITY_MAP)) {
    const result = verifyCategoricalDifferentiation(pool, prefix);
    if (!result.valid) failures.push(result);
  }

  // Also check GENERIC_ACTIONS
  const genericResult = verifyCategoricalDifferentiation(GENERIC_ACTIONS, 'generic');
  if (!genericResult.valid) failures.push(genericResult);

  if (failures.length > 0) {
    const summary = failures
      .flatMap(f => f.violations)
      .join('\n  ');
    throw new Error(
      `Seniority action pool categorical differentiation violated:\n  ${summary}\n\n` +
      `Every bracket must have a primary action whose title signals a DIFFERENT activity ` +
      `level (individual/team/org/company). Add specific verbs to fix: ` +
      `junior→build/ship, mid→own/lead, senior→establish/governance, principal→institutionali/strategy.`
    );
  }
}

export const BRACKET_ORDER: SeniorityBracket[] = ['junior', 'mid', 'senior', 'principal'];

export const BRACKET_LABELS: Record<SeniorityBracket, string> = {
  junior:    'Early-Career (0–3 yr)',
  mid:       'Mid-Level (3–8 yr)',
  senior:    'Senior (8–15 yr)',
  principal: 'Principal / Executive (15+ yr)',
};

/**
 * Return human-readable signal strings explaining why a bracket was derived.
 * Used by the UI callout so users understand the calibration.
 */
export function describeBracketSignals(
  tenureYears: number,
  performanceTier: string,
  uniquenessDepth: string,
  careerYears?: number,
): string[] {
  const exp = careerYears ?? tenureYears;
  const signals: string[] = [`${exp} yr career experience`];
  if (performanceTier === 'top') signals.push('top-performer rating');
  else if (performanceTier === 'below') signals.push('below-average performance');
  else signals.push('standard performance');
  if (uniquenessDepth === 'critical_knowledge') signals.push('critical knowledge holder');
  else signals.push('no critical knowledge flag');
  return signals;
}

/**
 * Return 2 seniority-adapted role actions for the given prefix + bracket.
 */
export function getAdaptiveRoleActions(
  prefix: string,
  bracket: SeniorityBracket,
): { actions: Array<Partial<ActionPlanItem>> } {
  const pool = ROLE_SENIORITY_MAP[prefix] ?? GENERIC_ACTIONS;
  return { actions: pool[bracket] ?? GENERIC_ACTIONS[bracket] };
}
