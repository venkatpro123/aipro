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
      title: "Establish the AI-Augmented Talent Architecture for Your Organization",
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
      title: "Own Your Firm's AI Legal Tool Governance Framework",
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
      title: "Define Your Firm's or Client's 3-Year AI Legal Strategy",
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
      title: "Build Your Content Strategy + AI Workflow System for Clients",
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
      title: "Define Your Brand's AI Content Strategy and Ethical Framework",
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
      title: "Lead Your Department's Clinical AI Tool Evaluation",
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

const ROLE_SENIORITY_MAP: Record<string, SeniorityActions> = {
  sw: SW_ACTIONS,
  fin: FIN_ACTIONS,
  hr: HR_ACTIONS,
  leg: LEG_ACTIONS,
  hc: HC_ACTIONS,
  cnt: CNT_ACTIONS,
};

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
