// CertificationPage.tsx — /certification
// Market Implementation 2 — v4.0
// HumanProof AI-Safe Professional certification system.
//
// Three required components (in sequence):
//   1. Upskilling roadmap completion: all Phase 1+2 Intensive track actions checked
//   2. Skill assessment: pass 3 of 5 role-category assessments (70% threshold)
//   3. Transition story: 300+ word verified submission
//
// Certification → digital badge at /verify/[badge-id]
// LinkedIn share → each share reaches 300-500 connections at 4% CTR = 12-20 trial users

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Award, CheckCircle, Circle, Clock, Star,
  Shield, BookOpen, FileText, Share2, ExternalLink,
  Lock, Zap,
} from "lucide-react";
import { supabase } from "../utils/supabase";

type CertStep = 'roadmap' | 'assessment' | 'story' | 'complete';

interface CertStatus {
  roadmapComplete: boolean;
  assessmentsPassed: number; // out of 5
  storySubmitted: boolean;
  storyVerified: boolean;
  badgeId?: string;
  issuedAt?: string;
  expiresAt?: string;
}

const ROLE_ASSESSMENTS = [
  { id: 'tech',       label: 'Technology & AI',    questions: 20, passing: 14 },
  { id: 'finance',    label: 'Finance & Analytics', questions: 20, passing: 14 },
  { id: 'legal',      label: 'Legal & Compliance',  questions: 20, passing: 14 },
  { id: 'healthcare', label: 'Healthcare & Life Sciences', questions: 20, passing: 14 },
  { id: 'creative',   label: 'Creative & Content',  questions: 20, passing: 14 },
];

// ── 100 Certification Assessment Questions (v6.0 Market Implementation 2) ────
// 20 questions per category × 5 categories = 100 total.
// Each question tests applied knowledge of AI displacement dynamics — not trivia.
// Multiple choice, 4 options, 1 correct. Explanation shown after submission.

interface AssessmentQuestion {
  id: string;
  category: 'tech' | 'finance' | 'legal' | 'healthcare' | 'creative';
  question: string;
  options: [string, string, string, string]; // A, B, C, D
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // ── Technology & AI (20 questions) ────────────────────────────────────────
  {
    id: 'tech-01',
    category: 'tech',
    question: 'A manual QA engineer currently spends 80% of their time writing and executing regression test cases. What is the most accurate characterisation of their near-term displacement risk?',
    options: ['Low — testing requires human judgment that AI cannot replicate', 'High — structured test execution is one of the most automatable tasks in software', 'Moderate — AI tools only automate unit testing, not integration testing', 'Low — companies need more testers as software complexity increases'],
    correct: 'B',
    explanation: 'Structured regression test execution is among the most fully automatable tasks in software development. Tools like TestRigor and Playwright AI execute structured test cases autonomously. The human-protected layer is test strategy, edge-case identification, and acceptance criteria definition — not execution.',
  },
  {
    id: 'tech-02',
    category: 'tech',
    question: 'Which of the following software engineering skills has the HIGHEST long-term value (LTV) in an AI-dominated development environment?',
    options: ['Ability to write boilerplate CRUD APIs quickly', 'Expertise in prompt engineering for code generation', 'Distributed systems architecture and cross-context technical judgment', 'Proficiency with a specific programming language syntax'],
    correct: 'C',
    explanation: 'Distributed systems architecture requires cross-context judgment across 10+ variables simultaneously — failure modes, latency budgets, consistency tradeoffs, network partitions — in novel combinations that have no established solution. This cannot be parameterised for AI generation. Language syntax and CRUD patterns are being automated at high rates.',
  },
  {
    id: 'tech-03',
    category: 'tech',
    question: 'A backend engineer at a company with a "very-high" AI investment signal has the same role title as one at a company with a "low" AI investment signal. How should their displacement risk scores compare?',
    options: ['Identical — role displacement risk depends only on the role, not the company', 'The very-high AI investment engineer scores higher — faster tool deployment increases role risk', 'The low AI investment engineer scores higher — they face more competitive pressure', 'Cannot be compared without knowing each engineer\'s performance tier'],
    correct: 'B',
    explanation: 'Companies with very-high AI investment deploy automation tools faster than sector average. The same role at Anthropic (very-high AI) faces accelerated L3 displacement vs the same role at a traditional firm with low AI investment. HumanProof applies a +25% relative L3 amplification for very-high AI investment companies.',
  },
  {
    id: 'tech-04',
    category: 'tech',
    question: 'A QA engineer wants to reduce their 18-month displacement risk. They have 8 hours per week available. Which action delivers the highest risk-reduction-per-hour?',
    options: ['Study for a Project Management certification (40 hours total)', 'Build a Playwright AI automation framework for a real project (8–12 hours)', 'Read blog posts about AI trends in software testing (2 hours/week)', 'Complete a manual testing masterclass to deepen existing skills (20 hours)'],
    correct: 'B',
    explanation: 'The hiring bar for AI-augmented QA roles is a public GitHub repo showing AI-integrated test automation. 8–12 hours of focused execution produces the exact artifact that moves the needle — it is the proof point that separates candidates who get callbacks. Certifications and blog reading are inputs; the repo is the output that hiring managers evaluate.',
  },
  {
    id: 'tech-05',
    category: 'tech',
    question: 'Which dimension of a layoff risk score is most likely to DECREASE when a software engineer adds GitHub Copilot to their daily workflow?',
    options: ['L1 — Company Financial Health', 'L2 — Layoff History', 'L3 — Role Displacement Risk', 'L4 — Market Conditions'],
    correct: 'C',
    explanation: 'L3 measures role displacement risk. When an engineer demonstrates AI tool proficiency, their position in the augmentation window shifts — they become the human who directs and validates AI output rather than the role being replaced by it. L1 and L2 are company-level signals unaffected by individual skill development.',
  },
  {
    id: 'tech-06',
    category: 'tech',
    question: 'A DevOps engineer is told their department has a "Critical Freeze" hiring signal (freeze score 82%). Their company is in Stage 2 collapse. What is the appropriate response timeline?',
    options: ['Begin transition planning in 12–18 months when the company situation is clearer', 'Begin transition planning immediately — department freeze signals precede company announcements by 6–8 weeks', 'Wait for an official announcement before updating the CV to avoid premature decisions', 'Ignore the department signal — only company-wide layoff announcements are reliable'],
    correct: 'B',
    explanation: 'Department-level freeze signals historically precede company-wide announcements by 6–8 weeks. At Stage 2 with a Critical Freeze department signal, the competitive advantage is updating the CV before hundreds of same-company candidates flood the market simultaneously. Pre-announcement applications have 3–4× the callback rate of post-announcement applications.',
  },
  {
    id: 'tech-07',
    category: 'tech',
    question: 'What does a WhatIf skill simulator\'s 5-point risk reduction for fully developing a "Distributed Systems Architecture" skill (LTV 98/100) represent?',
    options: ['A guaranteed 5-point score reduction on the next audit', 'The approximate L3-mediated impact through the engine\'s composite formula, holding all other dimensions constant', 'The total career-level impact of acquiring this skill', 'An overestimate — the simulator always shows optimistic results'],
    correct: 'B',
    explanation: 'The WhatIf simulator applies an L3 delta via the engine\'s canonical formula (L3 weight 0.20, weight sum 1.10, normalization required). It shows the approximate score impact if L3 alone improves, holding L1, L2, L4, L5, D6, D7 constant. It is a directional estimate, not a guarantee — other dimensions may change simultaneously.',
  },
  {
    id: 'tech-08',
    category: 'tech',
    question: 'A 15-year principal engineer at a tech company asks "what should I do this week to reduce my displacement risk?" Which answer is most appropriate for their seniority level?',
    options: ['Build a side project using GitHub Copilot to demonstrate AI fluency', 'Define the organization\'s AI engineering practice — what gets reviewed, what quality gates apply', 'Complete an AWS certification to demonstrate cloud skills', 'Update their LinkedIn profile with recent projects'],
    correct: 'B',
    explanation: 'Principal engineers\' moat is not what they build — it is what they institutionalize. Creating the AI engineering governance framework (when AI-generated code requires review, what quality gates apply, how to measure ROI) converts their judgment into organizational standards that cannot be replaced. Side projects and certifications are junior-level signals at the principal bracket.',
  },
  {
    id: 'tech-09',
    category: 'tech',
    question: 'What is the key difference between an "Automatable" and an "Augmented" skill risk classification?',
    options: ['Automatable skills will be replaced entirely; Augmented skills will be enhanced by AI but still require human oversight', 'Automatable skills take longer to replace; Augmented skills are replaced immediately', 'There is no practical difference — both will be replaced within 5 years', 'Augmented skills are more valuable than Automatable skills in all cases'],
    correct: 'A',
    explanation: 'Automatable skills face full replacement — the AI performs the task end-to-end without human involvement (e.g., CRUD API boilerplate generation). Augmented skills require human oversight, judgment, or context that AI cannot yet provide (e.g., performance optimization where AI profiles but humans decide the architectural tradeoff). Augmented skills have a 2-5 year horizon before potential full automation.',
  },
  {
    id: 'tech-10',
    category: 'tech',
    question: 'A backend engineer\'s displacement risk score jumped from 52 to 61 since their last audit 3 months ago. Which explanation is MOST LIKELY to be the primary driver?',
    options: ['Their tenure at the company decreased (impossible — tenure only increases)', 'Their company\'s AI investment signal increased or a new AI tool reached production maturity for their role', 'Their L5 personal protection score dropped because they did not get a promotion', 'L4 industry headwinds increased because more companies in their sector cut'],
    correct: 'B',
    explanation: 'A 9-point score increase in 3 months primarily reflects changes in L3 (role displacement) or D2 (AI tool maturity). A company increasing AI investment from "medium" to "high" applies a +12% relative L3 amplification. New AI tool releases for the backend engineering domain also increase L3. L5 tenure only increases with time; L4 rarely changes 9 points in 3 months.',
  },
  {
    id: 'tech-11',
    category: 'tech',
    question: 'What does the empirical calibration multiplier of 1.11 on L2 (Layoff History) mean?',
    options: ['The system inflates L2 scores by 11% to make predictions more conservative', 'Historical regression showed L2 was systematically under-weighted — layoff history is a stronger predictor than the raw model implied', 'L2 is the most important dimension and receives priority weighting', 'The calibration multiplier corrects for a data quality issue in the layoffs database'],
    correct: 'B',
    explanation: 'The 1.11 calibration multiplier was derived from logistic regression on 200 historical layoff events. The regression coefficient β₂ = 0.312 (highest of all layers) revealed that layoff history was a stronger predictor of future layoffs than the raw score implied. The 1.11 multiplier corrects this systematic under-weighting. L3 received a 0.93 multiplier (slightly over-weighted in the original model).',
  },
  {
    id: 'tech-12',
    category: 'tech',
    question: 'Which company characteristic most directly amplifies a software role\'s L3 displacement risk beyond the industry baseline?',
    options: ['High employee count (above 10,000)', 'Very-high AI investment signal (frontier AI deployment)', 'Public company status (regulatory transparency)', 'Multiple rounds of layoffs in the past 24 months'],
    correct: 'B',
    explanation: 'The AI Investment Amplification applies a +25% relative L3 increase for very-high AI investment companies. TCS with very-high AI investment gets a higher L3 than the same role at a company with low investment, because faster internal deployment means roles are automated sooner. Multiple layoffs primarily drive L2, not L3.',
  },
  {
    id: 'tech-13',
    category: 'tech',
    question: 'A QA engineer is considering three career transitions: (1) QA Automation Engineer, (2) Data Engineer, (3) AI/LLM Systems Engineer. Which has the highest 12-month success rate based on market intelligence data?',
    options: ['AI/LLM Systems Engineer (38%)', 'Data Engineer (60%)', 'QA Automation Engineer (65%)', 'All three are approximately equal'],
    correct: 'C',
    explanation: 'QA to QA Automation Engineer has a 65% success rate in 12 months — the highest of commonly tracked transitions from QA roles. This is because the skill gap is bridgeable (Python, Playwright, CI/CD), the market is large (8,400 India openings), and the proof artifact (GitHub automation framework) is achievable in 6–12 hours. AI/LLM Systems Engineer has a 38% rate because the bar is higher.',
  },
  {
    id: 'tech-14',
    category: 'tech',
    question: 'What is the "augmentation window" for a backend engineer?',
    options: ['The time available to build skills before AI tools fully replace backend development', 'The period during which AI augments the execution layer of the role but human judgment still drives value', 'The window during which developers can adopt AI tools without management approval', 'The 6-month period after a layoff announcement when engineers can reskill'],
    correct: 'B',
    explanation: 'The augmentation window is the period where AI absorbs repetitive, structured tasks but human oversight, architecture decisions, and cross-context judgment remain valuable. For backend engineers, this window is 18–36 months at current adoption rates. Engineers who own the AI layer during this window maintain leverage; those who wait face accelerated commoditisation when the window closes.',
  },
  {
    id: 'tech-15',
    category: 'tech',
    question: 'A data scientist\'s role has a riskTrend showing scores rising from 46 in 2024 to a projected 65 by 2028. What is the most useful interpretation of this trend?',
    options: ['The data scientist will definitely be displaced by 2028', 'AI capability in this domain is advancing; skills not upgraded during this period will face accelerating redundancy', 'The score jump is too large to be reliable — the model is probably overestimating', 'The trend confirms data science is safe because even 65/100 is below the high-risk threshold'],
    correct: 'B',
    explanation: 'The riskTrend shows advancing AI capability in the domain. A 19-point rise over 4 years means standard data science tasks (data prep, standard model fitting, routine EDA) are being automated. The appropriate response is not panic but strategic positioning: move toward the tasks that remain human-dependent (model interpretation, business context, novel problem framing) before the window closes.',
  },
  {
    id: 'tech-16',
    category: 'tech',
    question: 'What is the recommended proof point for a mid-level backend engineer pursuing an AI/LLM Systems Engineer transition?',
    options: ['Completing the DeepLearning.AI LLM specialization certificate', 'A GitHub repository containing a production-grade LLM application with eval framework, token budget management, and fallback logic', 'A LinkedIn post describing interest in AI/ML engineering', 'A Kaggle competition result in the top 20%'],
    correct: 'B',
    explanation: 'The hiring bar for AI/LLM Systems Engineer at companies like Flipkart, Swiggy, and Anthropic is a production-grade system — not a tutorial. The repo must demonstrate: eval framework (not just accuracy), token budget management, fallback logic when models fail, and measurable quality metrics. Certificates and Kaggle results do not pass the screen without a demonstrable system.',
  },
  {
    id: 'tech-17',
    category: 'tech',
    question: 'How does the AUGMENT strategy archetype differ from the RESKILL archetype?',
    options: ['AUGMENT is for senior professionals; RESKILL is for junior professionals', 'AUGMENT enhances the current role using AI tools; RESKILL transitions to a fundamentally different role', 'AUGMENT requires more time investment than RESKILL', 'There is no meaningful difference — both involve learning new skills'],
    correct: 'B',
    explanation: 'AUGMENT is triggered when augmentation potential is high (the current role benefits significantly from AI tools). The strategy is to become the AI-capable version of the same role — 2× productivity using AI tools, then negotiate a new title reflecting expanded scope. RESKILL is triggered when capital is too limited to leverage current assets; it involves acquiring a new skill set for a different role entirely.',
  },
  {
    id: 'tech-18',
    category: 'tech',
    question: 'A "Department Freeze Score" of 82% for a software engineering department means what?',
    options: ['82% of engineers in the department are at risk of layoff', 'The department is in Critical Freeze status — hiring paused and headcount reduction likely', '82% of job postings in this department have been filled', 'The department head has approved a budget freeze for 82% of projects'],
    correct: 'B',
    explanation: 'The department freeze score is derived from Naukri job posting volume changes and hiring signals. A score of 80+ indicates Critical Freeze status — not just a hiring pause but an active reduction signal. Departments historically enter Critical Freeze status 6–8 weeks before company-wide announcements. This score is the most specific risk signal the system can provide.',
  },
  {
    id: 'tech-19',
    category: 'tech',
    question: 'What does a security engineering department\'s −0.06 L3 adjustment represent?',
    options: ['Security roles face 6% lower AI displacement risk than the global role baseline', 'Security engineering has 6% fewer job postings than other departments', '6% of security roles have been automated in the past year', 'Security budgets have increased by 6% industry-wide'],
    correct: 'A',
    explanation: 'The department-context L3 adjustment modifies role displacement risk based on the nature of the department\'s work. Security engineering requires ongoing human judgment (threat modeling, incident response, novel attack surface analysis) that is structurally harder to automate. The −0.06 relative reduction means a security engineer\'s L3 score is 6% lower than the same role in a generic engineering department.',
  },
  {
    id: 'tech-20',
    category: 'tech',
    question: 'A 7-year backend engineer at a Stage 1 company wants to know when to start their transition. The base timeline at their score (68/100) suggests 12–18 months. Stage 1 compression factor is 0.75. What is their adjusted window?',
    options: ['12–18 months (Stage 1 compression has negligible effect)', '9–13.5 months', '4–6 months', '3–4 months (Stage 1 = equivalent to Stage 3 urgency)'],
    correct: 'B',
    explanation: 'Stage 1 compression factor is 0.75. 12 months × 0.75 = 9 months; 18 months × 0.75 = 13.5 months. The adjusted window is 9–13.5 months. This is meaningfully shorter than the base timeline — early warning signals indicate the window is compressing. Acting within the adjusted timeline rather than the base timeline preserves the competitive advantage of proactive preparation.',
  },

  // ── Finance & Analytics (20 questions) ───────────────────────────────────
  {
    id: 'fin-01',
    category: 'finance',
    question: 'A financial analyst spends 60% of their time building Excel-based monthly reports. Which AI capability most directly threatens this task?',
    options: ['Natural language processing for customer sentiment analysis', 'LLM-driven ERP report generation and structured data narrative automation', 'Computer vision for document scanning', 'Reinforcement learning for trading strategies'],
    correct: 'B',
    explanation: 'Modern ERP systems with AI narrative generation can produce standard financial reports (variance analysis, budget vs actuals, headcount summaries) from structured data automatically. The risk is not AI "replacing" the analyst — it is that the 60% of time currently spent on report building becomes a 5-minute task, reducing headcount requirements per team by 40–60%.',
  },
  {
    id: 'fin-02',
    category: 'finance',
    question: 'What is the most actionable first step for a junior financial analyst (2 years experience) to reduce their displacement risk?',
    options: ['Earn a CFA Level 1 certification', 'Automate one existing spreadsheet workflow with Python and document the process', 'Request a transfer to a higher-value function within finance', 'Study for an MBA to move into management'],
    correct: 'B',
    explanation: 'Automating one spreadsheet workflow with Python produces the proof of capability that changes manager perception from "operator" to "builder." The documentation of time savings (e.g., "reduced monthly close from 4 hours to 8 minutes") is the credential that differentiates in a layoff decision. CFA and MBA are longer horizon investments that do not address immediate displacement.',
  },
  {
    id: 'fin-03',
    category: 'finance',
    question: 'A revenue-per-employee figure of $28,000 at an Indian IT services company — is this a positive or negative signal for L1 (Company Financial Health)?',
    options: ['Negative — far below global technology benchmarks ($380K+ at Google)', 'Positive — appropriate for Indian IT services given PPP adjustments and labor cost structures', 'Neutral — revenue-per-employee is irrelevant for service companies', 'Negative — any revenue-per-employee below $100K indicates financial stress'],
    correct: 'B',
    explanation: 'PPP normalization is critical for Indian IT services. An Indian company with $28,000 revenue per employee is comparing against an Indian salary median of $6,000–12,000 annually — the productivity ratio is healthy. Comparing directly to Google\'s $380,000 without PPP adjustment would systematically over-score every Indian IT company. HumanProof applies a ~0.35× PPP multiplier for IN-region companies.',
  },
  {
    id: 'fin-04',
    category: 'finance',
    question: 'What does "revenue deceleration" mean as a layoff risk signal, and why is it more useful than absolute revenue growth?',
    options: ['It means revenue is declining, which is always a bad signal', 'A company growing at 5% when it grew at 40% previously signals market saturation — the gap drives cost-reduction pressure', 'Revenue deceleration is a lagging indicator and less useful than forward guidance', 'It only matters for public companies where quarterly comparisons are available'],
    correct: 'B',
    explanation: 'Revenue deceleration — a growth rate declining from 40% to 5% — signals that the business model has hit market saturation. Companies with overstaffed teams hired for 40% growth now have costs built for a business that no longer exists. This structural mismatch is what drives restructuring, not absolute decline. The empirical calibration shows revenue growth is a strong L1 predictor (β₁ = 0.248).',
  },
  {
    id: 'fin-05',
    category: 'finance',
    question: 'A conservative financial profile user (2-month emergency fund, 2 dependents) is shown a career transition to "CFO Advisor" requiring 18 months-to-first-income. What should the system do?',
    options: ['Show the path with a warning label', 'Hide the path — it requires an income gap that exceeds the user\'s available runway', 'Show the path with an adjusted success rate of 0%', 'Recommend the path as high-priority because of the salary premium'],
    correct: 'B',
    explanation: 'Conservative profiles filter out career paths where months_to_first_income exceeds available runway divided by 2. With a 2-month runway, only paths with ≤1 month to first income are shown. Showing incompatible paths creates false hope and practical harm — a conservative user who begins a CFO Advisor transition without the runway runs out of funds before reaching the first paycheck.',
  },
  {
    id: 'fin-06',
    category: 'finance',
    question: 'An auditor\'s highest-risk obsolete skill is "transaction vouching" (riskScore 98/100). What is the AI mechanism driving this?',
    options: ['AI tools can review all transactions simultaneously rather than human 5% sampling', 'AI replaces the need for audits entirely', 'Transaction vouching requires creative judgment that AI now possesses', 'Cloud accounting systems have eliminated transactions requiring manual vouching'],
    correct: 'A',
    explanation: 'Traditional audit methodology uses 5% transaction sampling because full testing is economically infeasible for humans. AI audit tools test 100% of transactions against known risk patterns, flagging anomalies with higher precision than sampling. The human auditor\'s role shifts from vouching transactions to interpreting anomalies and providing professional judgment on complex cases — not executing the sampling.',
  },
  {
    id: 'fin-07',
    category: 'finance',
    question: 'What does the "trapezoid integration" in the Salary At Risk Panel compute?',
    options: ['The exact salary the user will earn if they do not adapt', 'The total income over 36 months under each scenario (no action, partial adaptation, full transition)', 'The tax liability on compensation changes during career transitions', 'The compounding effect of salary increases in the full transition scenario'],
    correct: 'B',
    explanation: 'Trapezoid integration computes the area under each salary trajectory over 36 months — the total income across all time periods. This produces the "inaction cost" figure: total income under full transition minus total income under no action = monetary cost of not adapting. The trapezoid formula uses adjacent point averages × 3-month intervals to avoid over-counting endpoints.',
  },
  {
    id: 'fin-08',
    category: 'finance',
    question: 'Which financial signal combination most strongly indicates an imminent layoff (Stage 3)?',
    options: ['Revenue growing at 5% with stable headcount', 'C-suite departures (2 in 12 months) + stock decline > 30% + salary delay reports', 'Hiring freeze + AI investment signal = high', 'Revenue per employee declining slowly over 4 quarters'],
    correct: 'B',
    explanation: 'Stage 3 imminent risk requires converging signals: C-suite departures indicate panic exits before public announcement, stock decline > 30% signals market pricing of existential risk, and salary delay reports mean the company cannot meet payroll obligations. This combination historically precedes announcement by 1–6 months. A hiring freeze alone is Stage 2, not Stage 3.',
  },
  {
    id: 'fin-09',
    category: 'finance',
    question: 'What is the correct interpretation of "months_to_first_income: 8" on a career path card for a function pivot?',
    options: ['The transition takes 8 months total', 'The user can expect approximately 8 months before receiving their first paycheck in the new role', 'The user will have zero income for exactly 8 months', 'The market research was based on 8-month observation windows'],
    correct: 'B',
    explanation: 'months_to_first_income is the expected number of months from beginning the transition to receiving the first paycheck in the new role — not necessarily zero income throughout. Some users freelance, some work part-time, some have severance bridging this window. It is the expected elapsed time to placement, not a guaranteed income gap. Conservative profiles use this to filter paths that exceed their financial runway.',
  },
  {
    id: 'fin-10',
    category: 'finance',
    question: 'A senior finance professional has 22/25 delivery capital and 4/25 network capital. What does the capital prerequisite system recommend?',
    options: ['Activate network immediately using the delivery record as a conversation hook', 'Write 3 quantified impact bullets first, then activate network', 'Build knowledge capital to 18+ before any outreach', 'No prerequisite needed — delivery capital above 20 overrides network gaps'],
    correct: 'B',
    explanation: 'The prerequisite system detects a dominant-weak pillar gap > 15 points (delivery 22 vs network 4 = 18-point gap). For delivery dominant + network weak, Phase 0 requires: "Write 3 impact bullets: I shipped X, which drove Y (measured). Cold applications convert at 2% without quantified delivery; your delivery record is the lever — document it before outreach." The Phase 0 prevents executing the right strategy in the wrong order.',
  },
  {
    id: 'fin-11',
    category: 'finance',
    question: 'Why does L3 (Role Displacement Risk) have an empirical calibration multiplier of 0.93 (slightly under 1.0)?',
    options: ['L3 was found to be the most important predictor of layoffs', 'Regression analysis showed L3 was slightly over-weighted — role displacement is a 12–24 month signal, not a 3-month signal', 'The 0.93 multiplier corrects for data quality issues in role exposure data', 'L3 receives lower weight because it is the most subjective dimension'],
    correct: 'B',
    explanation: 'The regression coefficient β₃ = 0.178 for L3 was lower than expected. The insight: role displacement (AI automating your tasks) is a slow-moving signal that predicts 12–24 month risk more accurately than 3-month risk. Companies cut for financial stress (L1) and layoff rhythm (L2) much faster than they cut for role displacement. L3 was slightly over-weighted in the original model.',
  },
  {
    id: 'fin-12',
    category: 'finance',
    question: 'A financial analyst asks: "Will adding Python skills reduce my 18-month displacement probability?" The correct framing of the answer is:',
    options: ['Yes, Python is the most important skill for financial analysts', 'Python reduces L3 (role displacement) partially — but L1 and L2 company signals are more predictive of 18-month outcomes', 'No — individual skills do not affect displacement probability', 'Only if the Python skills are demonstrated through a public portfolio project'],
    correct: 'B',
    explanation: 'L3 contributes 18% to the composite score with a 0.93 calibration multiplier. Even maxing out L3 improvement through Python cannot overcome a deteriorating L1 (financial health) or L2 (layoff history) at the same company. The AUC-ROC of 0.81 on the model shows that company-level signals (L1, L2) dominate individual skill signals (L3) for 18-month displacement prediction.',
  },
  {
    id: 'fin-13',
    category: 'finance',
    question: 'What is the "cost of inaction" figure shown in the Overview tab?',
    options: ['The exact salary loss if the user is laid off', 'The estimated income difference between acting now (full transition) and doing nothing over 36 months, calculated from the user\'s risk score bracket and annual income', 'The cost of the HumanProof platform subscription over 36 months', 'The total economic impact of AI displacement on the finance sector'],
    correct: 'B',
    explanation: 'The inaction cost is the 36-month income gap between the full-transition trajectory and the no-action trajectory, computed by trapezoid integration using getTrajParams(). The no-action income floor at M36 depends on the risk bracket: score ≥ 80 → 52% remaining (high-automation India cohort, source: AER-2020 + ROW-2024), score ≥ 65 → 62% remaining (source: BLS-2024 displaced worker data), score ≥ 45 → 72%, score < 45 → 85%. These replaced the previous developer-estimated riskFactor table (0.50/0.38/0.26) which was inconsistent with the trajectory model.',
  },
  {
    id: 'fin-14',
    category: 'finance',
    question: 'Paytm has a collapse stage 2 signal with stock down 52%, C-suite changes of 3 in 12 months, and recent RBI regulatory action. A financial analyst at Paytm has a score of 68. What should their action plan recommend first?',
    options: ['Start a Python certification course (3 months)', 'Update CV and begin transition planning — the Stage 2 signal compresses the 12-18 month window to 6-9 months', 'Request a transfer to a different department', 'Wait for the RBI situation to stabilize before making career decisions'],
    correct: 'B',
    explanation: 'Stage 2 compression factor is 0.50. A 12-18 month baseline becomes 6-9 months. With 3 C-suite changes, stock decline, and regulatory pressure, the Stage 2 characterization is credible and the compressed timeline is accurate. The action plan should show the Phase 0 department freeze action (if applicable) and the score-based urgent action: begin transition planning within the compressed window.',
  },
  {
    id: 'fin-15',
    category: 'finance',
    question: 'Which financial metric best predicts a company\'s likelihood of layoffs in the next 12 months, based on regression analysis of 200 events?',
    options: ['Absolute revenue growth rate', 'Stock price level (absolute)', 'Revenue growth rate trend (deceleration) combined with revenue per employee vs sector median', 'Number of years since last major restructuring'],
    correct: 'C',
    explanation: 'The combined signal of revenue growth deceleration AND overstaffing (revenue per employee below sector median) is the strongest L1 predictor. Revenue growth alone is insufficient — a company growing at 5% with healthy productivity ratios is not at risk. The combination identifies companies that hired for a growth trajectory they can no longer sustain, creating structural overstaffing that drives restructuring.',
  },
  {
    id: 'fin-16',
    category: 'finance',
    question: 'What is the correct success rate for the FP&A AI Analyst transition from a standard financial analyst role?',
    options: ['22% (low, driven by competition)', '48% (moderate, achievable with dedicated effort)', '75% (high, market demand is strong)', '90% (very high, this is the primary career path)'],
    correct: 'B',
    explanation: 'The FP&A AI Analyst transition from standard financial analyst has a 48% 12-month success rate. This reflects that: the skill gap is bridgeable (Python + AI modeling is learnable), but the market is selective (hiring managers want a real deployed model, not just Python knowledge). 48% with dedicated effort reflects the reality that about half of committed transitioners land within 12 months.',
  },
  {
    id: 'fin-17',
    category: 'finance',
    question: 'A CFO wants to understand why HumanProof shows different risk scores for two financial analysts at the same company with identical seniority. What is the most likely cause?',
    options: ['The system has a random variance component to prevent gaming', 'The analysts have different department assignments — one in Operations (L3 +0.05) and one in Legal (L3 +0.04) creates score differences through department context adjustment', 'One analyst has more connections on LinkedIn', 'The scoring is identical — this cannot happen'],
    correct: 'B',
    explanation: 'The department context adjustment applies different L3 deltas based on the nature of the department\'s work. A financial analyst in Operations faces +0.05 L3 adjustment (higher automation exposure); one in Legal faces +0.04. Additionally, performance tier, uniqueness depth, and tenure differences all affect L5. Two analysts at the same company with the same role title but different departments and personal factors will have meaningfully different scores.',
  },
  {
    id: 'fin-18',
    category: 'finance',
    question: 'The Prediction Ledger shows "Forward-looking accuracy: 62.5%." What does this number specifically measure?',
    options: ['The percentage of all predictions (including retroactive) that were correct', 'The percentage of forward-looking predictions that were confirmed, divided by completed predictions only (excluding monitoring entries)', 'The overall model AUC-ROC score', 'The percentage of users whose predicted risk score matched their actual employment outcome'],
    correct: 'B',
    explanation: 'Forward-looking accuracy = confirmed predictions / (confirmed + refuted predictions). Monitoring entries (predictions still in their window) are NOT counted. This prevents inflation from unresolved predictions. Retroactive calibration entries are explicitly excluded. The honest disclosure is: "5 confirmed of 8 completed predictions = 62.5%, with N predictions still in the monitoring window."',
  },
  {
    id: 'fin-19',
    category: 'finance',
    question: 'A risk analyst\'s score delta shows L1 increased 8 points. The previous snapshot shows stock90DayChange: +5% and the current snapshot shows stock90DayChange: -22%. What should the driver text say?',
    options: ['Company financial signals have worsened — see details', 'Stock 90-day return worsened from +5% to -22%, the primary driver of the 8-point L1 increase', 'Your risk has increased — consider updating your CV', 'Multiple financial signals have changed'],
    correct: 'B',
    explanation: 'The v6.0 delta attribution requirement is that driver text references actual field values when snapshots are available: "Stock 90-day return worsened from +5% to -22%." This is traceable (you can verify the stock price), specific (it names the signal and its direction), and non-speculative (it does not invent other possible drivers). Generic "financial signals have worsened" text is insufficient.',
  },
  {
    id: 'fin-20',
    category: 'finance',
    question: 'A conservative financial analyst (2-month runway) is shown a career path to "Private Equity Associate" requiring 24 months-to-first-income and 6 months of income dip. What is the correct system behavior?',
    options: ['Show it with a high-priority label because of the salary premium', 'Filter it out — 24 months-to-first-income exceeds the 50% of runway threshold for conservative profiles', 'Show it with a reduced success rate of 5%', 'Show it but disable the call-to-action button'],
    correct: 'B',
    explanation: 'Conservative profile career path filtering: paths where months_to_first_income exceeds runway_months / 2 are hidden. With 2 months runway, only paths with ≤1 month to first income are shown. A note displays: "N paths hidden — require an income gap not compatible with your financial profile. Increase emergency fund to see them." This prevents financial harm from showing aspirational paths that cannot be executed.',
  },

  // ── Legal & Compliance (20 questions) ────────────────────────────────────
  {
    id: 'leg-01',
    category: 'legal',
    question: 'A junior legal associate spends 70% of their time on contract review and legal research. What is the correct characterisation of their displacement risk?',
    options: ['Low — legal work requires professional judgment that cannot be automated', 'High — contract review and legal research are among the most directly addressable tasks for current AI legal tools', 'Moderate — AI can assist but requires a qualified lawyer to approve all output', 'None — legal work is regulated and AI cannot be used without bar authority'],
    correct: 'B',
    explanation: 'Harvey, Lexis+ AI, and similar tools already perform first-pass contract review and legal research at speeds 10-20× faster than junior associates. The displacement risk is high specifically because these tasks are structured, repetitive, and have clear quality criteria — exactly the profile that AI tools handle well. The protected layer is client relationships, novel legal strategy, and court advocacy.',
  },
  {
    id: 'leg-02',
    category: 'legal',
    question: 'A senior corporate lawyer asks "what is my single most valuable asset in an AI-dominant legal market?" Which answer is most accurate?',
    options: ['Their law degree and bar admission', 'Their ability to research precedents faster than peers', 'Their client relationships and trust capital — the irreducible element in legal engagement', 'Their expertise in contract drafting software'],
    correct: 'C',
    explanation: 'Client relationships are structurally irreplaceable in legal services. A client hires a specific lawyer, not an anonymous service. AI can draft the contract but cannot replicate the trust developed through years of working together, understanding client-specific risk tolerance, or being accountable for advice. The LEVERAGE archetype is correct for senior lawyers: activate relationships before any other action.',
  },
  {
    id: 'leg-03',
    category: 'legal',
    question: 'The EU AI Act creates a compliance obligation for companies using AI in high-risk applications. What does this mean for legal professionals\' displacement risk?',
    options: ['It increases displacement risk because AI compliance work will be automated too', 'It creates a significant demand surge for lawyers who understand AI systems — a tailwind against displacement', 'It has no effect on legal professional displacement — compliance is handled by IT departments', 'It decreases legal budgets and therefore reduces demand for lawyers'],
    correct: 'B',
    explanation: 'The EU AI Act, US AI executive orders, and India\'s upcoming Digital India Act create acute demand for lawyers who can advise on AI system classification, compliance obligations, and liability frameworks. This is a regulatory tailwind against displacement: lawyers with AI governance expertise are being recruited at 30-40% premiums, and the demand currently exceeds the supply of qualified practitioners.',
  },
  {
    id: 'leg-04',
    category: 'legal',
    question: 'What is the hiring bar for a mid-level lawyer transitioning to an AI Governance and Compliance specialty?',
    options: ['Completion of a 2-day AI and law certificate course', 'A documented case study applying AI governance frameworks to a real client situation, plus at least one AI regulation overview published', 'Passing the CISA certification (Certified Information Systems Auditor)', 'LinkedIn endorsements from AI-focused colleagues'],
    correct: 'B',
    explanation: 'The AI governance specialisation requires evidence of applied judgment — not just theoretical knowledge. A documented case study showing how the lawyer applied EU AI Act classification to a specific system, plus a published overview that demonstrates public expertise, is the hiring signal. Certificate courses show awareness; case studies show capability.',
  },
  {
    id: 'leg-05',
    category: 'legal',
    question: 'A paralegal\'s riskTrend shows displacement scores rising from 48 to a projected 68 by 2027. What is driving this trend?',
    options: ['Fewer legal disputes leading to reduced demand for paralegals', 'AI tools are automating the structured research, document review, and filing tasks that constitute most paralegal work', 'Law firms are outsourcing paralegal work to lower-cost jurisdictions', 'Regulatory changes are reducing the scope of paralegal authority'],
    correct: 'B',
    explanation: 'Paralegal work has a high component of structured, repeatable tasks: document review, case file organisation, contract summaries, deadline tracking, filing preparation. AI document review tools (Kira, Luminance) and AI legal research tools (Lexis+ AI, Harvey) directly automate these categories. The projected 68 by 2027 reflects anticipated enterprise deployment of these tools at scale.',
  },
  {
    id: 'leg-06',
    category: 'legal',
    question: 'Which of the following legal specialisations has the lowest AI displacement risk and why?',
    options: ['Contract drafting — highly structured and template-driven', 'Court advocacy and litigation strategy — requires real-time judgment, interpersonal persuasion, and accountability', 'Legal research and precedent analysis — well-documented and searchable', 'Standard regulatory compliance filing — checklist-driven and rule-based'],
    correct: 'B',
    explanation: 'Court advocacy requires real-time judgment about how a judge or jury is responding, adaptive strategy under time pressure, and personal accountability that the client and court assign to a named individual. It also involves irreducibly human elements: interpersonal trust, physical presence, and the moral weight of legal representation. Contract drafting and compliance filing are highly automatable.',
  },
  {
    id: 'leg-07',
    category: 'legal',
    question: 'A law firm\'s managing partner wants to establish AI governance for client work. What should the governance framework address first?',
    options: ['Which AI tools are approved for use, what quality review is required, and what the liability model is for AI errors', 'How to negotiate contracts with AI vendors', 'Whether AI tools comply with data protection regulations', 'The pricing model for AI-assisted legal services'],
    correct: 'A',
    explanation: 'Effective AI governance in legal practice requires three pillars: (1) approved tool list with qualification criteria, (2) mandatory quality review standards for AI-generated output before client delivery, and (3) a clear liability model that defines who is professionally responsible when AI generates an error. Without these, firms face negligence claims and bar discipline. This framework is what senior lawyers who own AI governance deliver.',
  },
  {
    id: 'leg-08',
    category: 'legal',
    question: 'What does "Professional Skepticism" mean as a safe skill for auditors and legal professionals?',
    options: ['The ability to doubt everything, including client statements', 'The exercised professional judgment to question the completeness and accuracy of evidence, considering alternative explanations — a skill requiring accumulated domain intuition', 'Scepticism about AI tools in the workplace', 'Formal cross-examination technique taught in law school'],
    correct: 'B',
    explanation: 'Professional skepticism in legal and audit contexts means the trained capacity to recognise when evidence is insufficient, when a narrative is implausible given your domain experience, and when to probe deeper before accepting a conclusion. This requires accumulated intuition from hundreds of similar cases — it cannot be parameterised for AI. It is the human judgment layer that sits above the AI-automatable execution.',
  },
  {
    id: 'leg-09',
    category: 'legal',
    question: 'A critical knowledge holder (a lawyer who is the sole expert on a firm\'s largest client relationship) receives advice to "document everything thoroughly." Why is this advice potentially counterproductive?',
    options: ['Documentation is unnecessary for experienced professionals', 'Comprehensive documentation accelerates knowledge transfer to the firm — reducing the lawyer\'s institutional uniqueness and protection', 'Clients prefer undocumented relationships for confidentiality', 'Documentation prevents billing for the relationship-building time'],
    correct: 'B',
    explanation: 'For critical knowledge holders, the inaction scenario analysis is explicit: "The highest-ROI action is NOT to document your knowledge further — that accelerates its transfer to the company\'s ownership. The highest-ROI action is to use your institutional authority to build a new domain of expertise before the migration cycle completes." Thorough documentation increases replaceability; building a new expertise domain extends career capital.',
  },
  {
    id: 'leg-10',
    category: 'legal',
    question: 'A law firm is considering whether to invest in AI contract review tools. From a displacement risk perspective, which outcome most benefits individual lawyers at the firm?',
    options: ['Reject AI tools to protect current billing hours', 'Adopt AI tools AND train every lawyer to supervise, validate, and enhance AI output — creating a productivity multiplier rather than a headcount reduction', 'Adopt AI tools and reduce junior lawyer headcount to capture efficiency gains', 'Delay the decision until the industry consensus is clearer'],
    correct: 'B',
    explanation: 'The firms that create the most individual protection are those where every lawyer becomes an AI-capable practitioner — supervising AI output, catching errors, adding the judgment layer that AI cannot provide. Firms that use AI tools purely for headcount reduction eventually face quality crises as the human oversight layer is too thin. Individual lawyers who own the AI supervision role are the last to be reduced.',
  },
  {
    id: 'leg-11',
    category: 'legal',
    question: 'What makes the "AI Contracts and IP Ownership" niche particularly valuable for mid-level lawyers right now?',
    options: ['AI contracts are more lucrative than traditional contracts', 'The legal framework for AI IP ownership is unsettled — human judgment required to navigate novel questions with no established precedent', 'AI contracts are simpler to draft and can be completed faster', 'Regulatory requirement mandates AI contract specialists at all law firms'],
    correct: 'B',
    explanation: 'The three contested questions — IP ownership of AI-generated work, liability for AI errors, data privacy in AI training — have no settled legal answers. Courts and legislatures are still developing frameworks. Lawyers who specialize in these areas now are defining the practice while it is being built. This is the rarest and most valuable combination: high demand, no established answer, and human judgment is the only resource that matters.',
  },
  {
    id: 'leg-12',
    category: 'legal',
    question: 'A legal associate has been using Harvey for contract review for 6 months. What is the most valuable proof point they can produce from this experience?',
    options: ['The number of contracts reviewed using Harvey', 'A documented quality framework: where Harvey was right, where they corrected it, and what review criteria they developed from the pattern', 'A Harvey usage certificate', 'Client testimonials about faster contract delivery'],
    correct: 'B',
    explanation: 'The hiring signal is not "I use Harvey" — everyone will use Harvey. The signal is "I developed a quality framework for Harvey output in [specific contract type]: here are the 5 categories where Harvey makes systematic errors, here is my correction process, here is the quality gate I established." This is the judgment layer that converts tool usage into professional expertise that has market value.',
  },
  {
    id: 'leg-13',
    category: 'legal',
    question: 'What is the correct uniqueness depth filter for a "Domain Knowledge Advisor" career path (institutional expert converting domain knowledge into advisory)?',
    options: ['"all" — shown to every user', '"generic_and_specialist" — not appropriate for generic roles', '"critical_only" — only relevant to critical knowledge holders', '"specialist_and_critical" — relevant to specialists and critical knowledge holders but not generic roles'],
    correct: 'C',
    explanation: 'The Domain Knowledge Advisor path converts irreplaceable institutional knowledge directly into a consulting engagement. This path is only relevant to critical knowledge holders — the path description ("uses institutional knowledge directly") is meaningless for generic roles. Showing it to generic role holders would create confusion about eligibility and expectation mismatches.',
  },
  {
    id: 'leg-14',
    category: 'legal',
    question: 'Which legal role has the LOWEST displacement risk and why?',
    options: ['Legal Operations Manager — oversees AI tools and processes', 'Contract Management Specialist — focuses on structured document review', 'General Counsel at a Board Level — accountable for organizational legal risk and board relationships', 'Intellectual Property Filing Specialist — files patents and trademarks'],
    correct: 'C',
    explanation: 'General Counsel at board level combines irreplaceable accountability (the board holds a named individual responsible for legal risk), institutional relationships (the CEO and board trust a specific person, not a service), and strategic judgment (advising on transactions, regulatory posture, and enterprise risk). IP filing and contract management have high automation rates. Legal Operations is mid-risk as governance is increasingly systematized.',
  },
  {
    id: 'leg-15',
    category: 'legal',
    question: 'A law firm partner is considering a "LEVERAGE" versus "PLATFORM" archetype strategy. Their network capital is 20/25 and knowledge capital is 22/25. What does the hybrid archetype recommendation suggest?',
    options: ['Use LEVERAGE exclusively — it is always superior for senior lawyers', 'Use PLATFORM exclusively — knowledge should be published before activation', 'LEVERAGE primary (activate relationships now) + PLATFORM secondary (publish one proof point to give network something concrete to share)', 'Wait for a single archetype to be clearly dominant before acting'],
    correct: 'C',
    explanation: 'When primary = LEVERAGE and knowledge ≥ 15, a secondary PLATFORM archetype is detected. The hybrid sequence: "Weeks 1–2: execute Phase 0 of both simultaneously. Weeks 3–6: LEVERAGE activates conversations (15 minimum) while PLATFORM publishes first artifact. Week 7+: LEVERAGE conversations reference the PLATFORM artifact." The published piece converts network outreach from a cold ask to a reference conversation.',
  },
  {
    id: 'leg-16',
    category: 'legal',
    question: 'A legal associate is reviewing a contract using an AI tool. The AI flags a limitation of liability clause as "standard market practice." What is the appropriate professional response?',
    options: ['Accept the AI\'s characterisation — it has reviewed thousands of contracts', 'Verify independently against current market practice in this specific jurisdiction and deal type before advising the client', 'Reject the AI\'s input — AI cannot assess market practice', 'Ask the senior partner to review without flagging the AI input source'],
    correct: 'B',
    explanation: 'This tests professional skepticism in an AI-augmented context. "Standard market practice" varies by jurisdiction, deal type, counterparty sophistication, and current market conditions. AI tools generalise from training data; market practice changes. The professional response is to verify independently — not to accept or reject the AI output wholesale, but to use it as a starting point for informed professional judgment.',
  },
  {
    id: 'leg-17',
    category: 'legal',
    question: 'Which of these legal tasks is MOST protected from AI automation and why?',
    options: ['First-pass employment contract review', 'Strategic advice on a merger\'s regulatory approval pathway', 'Standard NDA preparation', 'Legal research on whether a specific clause has been upheld in court'],
    correct: 'B',
    explanation: 'Strategic advice on a merger\'s regulatory approval pathway requires: understanding the specific regulators\' current political priorities, the acquirer\'s track record with regulators, the target company\'s industry context, and the client\'s risk tolerance for protracted review — all synthesized into a recommendation that the partner is personally accountable for. This is irreducibly human strategic judgment.',
  },
  {
    id: 'leg-18',
    category: 'legal',
    question: 'A lawyer\'s profile shows "functional_specialist" uniqueness depth. What inaction scenario framing is most accurate?',
    options: ['Your knowledge is irreplaceable — you have 18–36 months of full protection', 'Your specialist expertise provides moderate protection, but within 18–24 months the company can source AI-capable specialists from the market', 'Your skills are generic — displacement is imminent within 12 months', 'Specialists are immune to displacement — focus on other risk factors'],
    correct: 'B',
    explanation: 'Functional specialist uniqueness provides protection for 18–24 months — not permanent and not immediate. The protection erodes as AI capability in the specific domain advances and as companies build training programmes for AI-augmented replacement profiles. The action is to transition the specialisation to the AI-adjacent layer (governance, oversight, interpretation) before the specialist moat is replicated.',
  },
  {
    id: 'leg-19',
    category: 'legal',
    question: 'What does "peer contagion" mean in the context of L4 (Industry Headwinds) for a legal professional?',
    options: ['Other lawyers at the same firm leaving for better opportunities', 'Multiple peer law firms in the same sector announcing workforce reductions in the past 180 days', 'Law school graduates flooding the market with lower-cost services', 'Clients moving work from external to in-house counsel'],
    correct: 'B',
    explanation: 'Peer contagion in L4 measures how many comparable companies in the same sector have had layoffs in the past 180 days. When 3+ peer law firms (or legal departments at comparable companies) announce cuts, it signals sector-wide restructuring driven by common pressures — AI automation, market contraction, or cost optimisation mandates from parent companies. This sector-level signal amplifies individual company risk.',
  },
  {
    id: 'leg-20',
    category: 'legal',
    question: 'A legal professional has a score of 72 and is "below average" performance. Their company is showing Stage 2 signals. What action should the system prioritise?',
    options: ['Recommend a 6-month intensive upskilling programme in AI governance', 'Activate the performance-collapse strategy override: find next role first, reskill second, with suppressUpskilling = true', 'Recommend networking with 3 senior lawyers per month', 'Focus on delivering exceptional work to improve performance tier first'],
    correct: 'B',
    explanation: 'The performance-collapse override activates when performanceTier = "below" AND (collapseStage ≥ 2 OR score ≥ 70). The override suppresses long-horizon upskilling actions because a 6-month programme cannot close the risk gap in the available time window. The correct sequence: find the next role first (begin active job search this week), reskill in the next role when there is more stability. The override headline: "Your situation requires immediate action — upskilling alone cannot close the gap."',
  },

  // ── Healthcare & Life Sciences (20 questions) ──────────────────────────────
  {
    id: 'hc-01',
    category: 'healthcare',
    question: 'A radiologist reviews 40 CT scans per day. An AI diagnostic tool is deployed that provides a first-pass assessment with 94% accuracy for routine findings. What is the most accurate risk characterisation?',
    options: ['High displacement risk — the AI handles 94% of cases autonomously', 'Moderate risk — the radiologist\'s role shifts from primary reader to AI supervisor + complex case specialist', 'Low risk — legal liability requires a physician to read every scan', 'No risk — AI tools in radiology are not yet clinically validated'],
    correct: 'B',
    explanation: 'The correct framing is role transformation, not replacement. The radiologist becomes the quality assurance layer for AI output on routine cases, and the sole practitioner for complex, ambiguous, or high-stakes cases. The risk is moderate because headcount requirements typically decrease (one radiologist can supervise AI across more scans), but the skill set becomes more specialist, not redundant. Radiologists who understand AI diagnostic systems are better positioned than those who resist them.',
  },
  {
    id: 'hc-02',
    category: 'healthcare',
    question: 'Which clinical skill has the HIGHEST long-term value (LTV) for a physician in an AI-augmented healthcare environment?',
    options: ['Memorising clinical guidelines and treatment protocols', 'Patient communication and shared decision-making under uncertainty', 'Fast and accurate data entry into EHR systems', 'Reading standard diagnostic reports'],
    correct: 'B',
    explanation: 'Patient communication under uncertainty requires emotional intelligence, cultural sensitivity, the ability to convey complex probabilistic information, and the trust that accumulates through the patient-physician relationship over time. This cannot be replicated by AI. Clinical guideline recall and data entry are automatable; shared decision-making under uncertainty is structurally human.',
  },
  {
    id: 'hc-03',
    category: 'healthcare',
    question: 'A nurse asks about the displacement risk of "standard vital signs monitoring." What is the correct assessment?',
    options: ['Low risk — vital signs monitoring requires continuous clinical judgment', 'High risk — IoT monitoring devices and AI alert systems have replaced continuous human monitoring for standard vital signs in most hospital settings', 'No risk — nurses are legally required to perform all vital signs monitoring manually', 'Moderate risk — only in ICU settings are monitoring systems deployed'],
    correct: 'B',
    explanation: 'Standard vital signs monitoring (blood pressure, temperature, pulse oximetry, heart rate) is one of the most fully automated clinical tasks. IoT monitors and AI alert systems handle continuous monitoring; nurses are alerted for deviations. The protected tasks are clinical interpretation of complex patterns, patient assessment beyond numerical values, and care coordination requiring human judgment.',
  },
  {
    id: 'hc-04',
    category: 'healthcare',
    question: 'A clinical pharmacist is at the standard mid-career experience level and wants to reduce their displacement risk. What is the most appropriate strategy archetype?',
    options: ['RESKILL — pharmacy is being fully automated', 'AUGMENT — become the AI-capable version of pharmacy: clinical decision support, AI drug interaction review, antimicrobial stewardship', 'LEVERAGE — activate relationships with physician referral networks', 'PLATFORM — publish clinical pharmacy research to establish thought leadership'],
    correct: 'B',
    explanation: 'Pharmacists with 5–10 years and high augmentation potential (AI tools augment rather than replace clinical judgment) should pursue AUGMENT: master clinical decision support systems, AI drug interaction tools, and antimicrobial stewardship analytics. The goal is to demonstrate 2× productivity and transition from dispensing-focused to clinical advisory-focused — the AI-augmented pharmacist who commands a higher scope and salary.',
  },
  {
    id: 'hc-05',
    category: 'healthcare',
    question: 'What is the primary value of a "AI-Human Care Protocol" document created by a junior clinician?',
    options: ['It satisfies a regulatory requirement for AI tool documentation', 'It demonstrates clinical judgment about when to follow AI suggestions and when to override — the decision-making layer that cannot be automated', 'It shows proficiency with AI tools to employers', 'It reduces the time spent in AI tool training sessions'],
    correct: 'B',
    explanation: 'The protocol document is valuable because it requires the clinician to articulate: when AI diagnostic suggestions can be accepted, when clinical context changes the appropriate response, what documentation is required for an override, and how to communicate uncertainty to patients. This exercise builds the explicit clinical judgment that is the irreplaceable human layer — and demonstrates it to supervisors in a tangible form.',
  },
  {
    id: 'hc-06',
    category: 'healthcare',
    question: 'A Chief Medical Information Officer (CMIO) needs to define their hospital system\'s clinical AI strategy. Which outcome most demonstrates successful execution?',
    options: ['Deploying 5 AI diagnostic tools across departments', 'A board-approved framework: which AI systems are deployed, what clinical oversight is required, what the liability model is, and how workforce implications are managed over 3 years', 'Reducing diagnostic errors by 10% using AI tools', 'Completing training programmes for all clinical staff on AI tool usage'],
    correct: 'B',
    explanation: 'CMIO-level differentiation is not deployment or training — it is strategy. The board brief demonstrates the capacity to: map AI tool deployment to organizational risk appetite, define the clinical oversight model that protects against liability, anticipate workforce changes, and communicate a multi-year vision. CMIOs who present this brief define the health system\'s AI future; those who only execute implementations are subject to others\' strategies.',
  },
  {
    id: 'hc-07',
    category: 'healthcare',
    question: 'AI pathology tools can detect certain cancer biomarkers with 97% accuracy. A pathologist argues this represents a complete replacement of their role. Why is this incorrect?',
    options: ['97% accuracy is too low for clinical use', 'The 3% error rate in cancer diagnostics represents catastrophic failure modes requiring human oversight; complex cases, novel presentations, and diagnostic uncertainty still require expert human judgment', 'AI pathology tools are not yet approved by regulatory agencies', 'Pathologists are protected by their medical license requirements'],
    correct: 'B',
    explanation: 'In high-stakes diagnostic contexts, 97% accuracy still means 3% errors — which in cancer pathology means missed diagnoses or false positives that lead to wrong treatment. The human pathologist provides oversight for: cases that fall outside AI training distribution, novel biomarker presentations, disagreements between AI systems, and the professional accountability that regulatory frameworks assign to a named individual. The role transforms, it does not disappear.',
  },
  {
    id: 'hc-08',
    category: 'healthcare',
    question: 'A healthcare professional\'s L5 (Employee Factors) score is 0.18. What uniqueness depth classification produced this score?',
    options: ['generic (0.58)', 'functional_specialist (0.38)', 'critical_knowledge (0.18)', 'cannot be determined from the score alone'],
    correct: 'C',
    explanation: 'The UNIQUENESS_SCORES mapping is exact: generic = 0.58, functional_specialist = 0.38, critical_knowledge = 0.18. An L5 contribution of 0.18 from the uniqueness dimension indicates a critical_knowledge classification — an individual with irreplaceable institutional knowledge (a specific specialty, a critical patient relationship, or a unique operational role) that cannot be immediately replaced.',
  },
  {
    id: 'hc-09',
    category: 'healthcare',
    question: 'What is the most accurate description of AI\'s impact on clinical nursing tasks over the next 5 years?',
    options: ['Full replacement — AI will perform all nursing functions autonomously', 'Automation of routine monitoring and documentation; significant demand increase for complex patient assessment, care coordination, and patient education', 'No significant impact — nursing is inherently hands-on and physical', 'Mixed impact — some nursing tasks will be automated but the overall headcount will remain stable'],
    correct: 'B',
    explanation: 'The 5-year outlook for nursing is task transformation, not role elimination. Routine vital signs monitoring, standard medication administration reminders, and basic documentation will be automated. The demand growth is in complex patient assessment (interpreting AI alerts in clinical context), care coordination across providers, and patient education — tasks requiring presence, trust, and judgment.',
  },
  {
    id: 'hc-10',
    category: 'healthcare',
    question: 'What is the "collapse stage" designation for a hospital system showing: 3 C-suite departures in 12 months, stock down 40%, and CEO acknowledgment of financial challenges?',
    options: ['Stage 1 — Early Warning (AI efficiency language without corroborating events)', 'Stage 2 — Active Risk (hiring freeze + workforce reductions)', 'Stage 3 — Imminent Risk (C-suite departures + significant stock decline + leadership signals)', 'No stage — hospitals are too complex for collapse stage classification'],
    correct: 'C',
    explanation: 'Stage 3 imminent risk requires converging signals: 3 C-suite departures in 12 months (mass exits before public announcement), stock down 40% (market pricing existential risk), and CEO acknowledgment (leadership loss of confidence). This combination historically precedes a major restructuring announcement within 1–6 months. Healthcare organisations are not immune — Byju\'s, a prominent example, exhibited identical signals before collapse.',
  },
  {
    id: 'hc-11',
    category: 'healthcare',
    question: 'A healthcare IT professional wants to transition to "Chief Medical AI Officer." What is the most important proof point they can produce?',
    options: ['A certification in healthcare data management', 'A published case study: what AI system was deployed, what clinical oversight model was created, what outcomes were measured', 'Vendor training completion certificates for 3 AI clinical tools', 'A whitepaper on AI trends in healthcare'],
    correct: 'B',
    explanation: 'The Chief Medical AI Officer role requires demonstrated institutional deployment experience, not theoretical knowledge. A case study showing: the specific AI system (with technical details), the clinical oversight protocol that was created, the metrics used to validate safety, and the outcomes achieved — this is the evidence of judgment in action. Vendor certificates and trend papers show awareness, not deployment capability.',
  },
  {
    id: 'hc-12',
    category: 'healthcare',
    question: 'A nurse with "critical_knowledge" uniqueness depth (sole expert on a hospital\'s legacy patient care coordination system) is advised to "document everything to preserve institutional knowledge." Why is this counterproductive advice?',
    options: ['Documentation takes too much time away from patient care', 'Comprehensive documentation transfers the institutional knowledge to the hospital\'s ownership, reducing the nurse\'s uniqueness and protection window', 'Documentation violates patient privacy regulations', 'The hospital already has documentation standards that should not be duplicated'],
    correct: 'B',
    explanation: 'For critical knowledge holders, thorough documentation accelerates the migration of their unique knowledge to the institution — precisely the process that ends their protection window. The advice from v6.0: "The highest-ROI action is to use your institutional authority to build a new domain of expertise before the migration cycle completes. Documentation accelerates its transfer to the company\'s ownership."',
  },
  {
    id: 'hc-13',
    category: 'healthcare',
    question: 'What does an "income_dip_months: 3" on a healthcare career path mean for a conservative-profile nurse?',
    options: ['The nurse will have no income for exactly 3 months', 'Approximately 3 months of income below 90% of the baseline salary is expected during the transition', 'The transition takes 3 months longer than standard', 'The nurse\'s benefits will be reduced for 3 months after starting the new role'],
    correct: 'B',
    explanation: 'income_dip_months is the number of months where income is expected to be below 90% of the starting baseline — not necessarily zero. In healthcare transitions, this often means a period between roles, lower starting salary at a new position, or part-time work during credentialing. A conservative nurse with 2 months runway cannot afford a 3-month income dip path — the system should filter this path from their view.',
  },
  {
    id: 'hc-14',
    category: 'healthcare',
    question: 'A hospital radiology department shows a freeze score of 78%. A radiologist at this hospital asks how to interpret this for their personal risk.',
    options: ['78% means 78% of radiologists will be cut', 'The freeze score indicates hiring has significantly slowed (Freeze status: 55–79%) — a structural reduction signal that precedes announcements by 6–8 weeks on average', 'Freeze scores only apply to non-clinical staff', 'A 78% freeze score means the AI tool deployment has replaced 78% of work volume'],
    correct: 'B',
    explanation: 'A freeze score of 78% means the department is in "Freeze" status (55–79% threshold). This indicates a significant hiring slowdown and often precedes headcount reduction announcements by 6–8 weeks. For the radiologist, it means: do not wait for the announcement — update CV now, activate network this week, and treat the transition timeline as compressed by 50% (Stage 2 factor applied to the base timeline).',
  },
  {
    id: 'hc-15',
    category: 'healthcare',
    question: 'Which type of healthcare professional has the most favourable long-term outlook in an AI-augmented environment?',
    options: ['Professionals whose work is purely diagnostic and data-driven', 'Professionals whose work centres on patient relationships, complex care coordination, and irreducible human presence', 'Professionals who specialize in AI tool operation', 'Professionals working in the most highly regulated specialties'],
    correct: 'B',
    explanation: 'The safest healthcare roles are those where human presence is structurally irreplaceable: the physical examination, the patient-family communication in crisis situations, the care coordination across complex multi-system conditions, and the interpersonal trust that is the foundation of therapeutic relationships. Pure diagnostic and data-driven work (reading scans, interpreting lab values) is most at risk.',
  },
  {
    id: 'hc-16',
    category: 'healthcare',
    question: 'A medical device company employs clinical affairs specialists who write regulatory submissions. What is the correct uniqueness depth for a specialist who has written 30 FDA 510k submissions and knows the specific reviewers\' preferences?',
    options: ['generic — regulatory writing follows a standard template', 'functional_specialist — expertise is valuable but can be learned by a replacement', 'critical_knowledge — the accumulated knowledge of specific reviewer preferences and submission history is irreplaceable in the short term', 'cannot be determined without more information'],
    correct: 'C',
    explanation: 'A specialist who has developed a deep understanding of specific FDA reviewers\' priorities, the submission history of the company\'s product portfolio, and the negotiation patterns that have worked with this regulator holds critical knowledge. A replacement cannot access this tacit knowledge from documentation — it requires years of direct interaction to develop. This qualifies as critical_knowledge uniqueness depth.',
  },
  {
    id: 'hc-17',
    category: 'healthcare',
    question: 'AI clinical decision support tools are deployed at a hospital. A hospitalist physician who previously relied on their memory of clinical guidelines finds that AI tools now surface the relevant guideline instantly. What is the correct career response?',
    options: ['Resist using the AI tools to maintain independence', 'Shift focus from guideline recall to clinical judgment: the interpretation of guidelines in the specific context of this patient, with these comorbidities, in this clinical situation', 'Build deeper guideline memorisation to stay ahead of AI capabilities', 'Ignore the change — clinical judgment was always the primary skill'],
    correct: 'B',
    explanation: 'When AI eliminates the need for a previously valued task (guideline recall), the career response is to move to the task that AI cannot perform: applying the guideline to a specific patient context. The irreplaceable clinical layer is not knowing what the guideline says — it is knowing when the guideline does not apply, when the patient\'s unique situation requires deviation, and how to communicate that decision to the patient and team.',
  },
  {
    id: 'hc-18',
    category: 'healthcare',
    question: 'What is the most accurate description of the L4 (Market Conditions) dimension for a healthcare professional in India?',
    options: ['Low risk — healthcare is always in demand', 'Varies significantly by specialty: primary care faces commoditisation pressure; specialist and technology-adjacent roles face growing demand', 'High risk — hospital systems in India are cutting costs broadly', 'Not applicable — L4 is only meaningful for technology professionals'],
    correct: 'B',
    explanation: 'L4 for healthcare in India is highly specialty-specific. Telemedicine has commoditised primary consultations, creating cost pressure on general practitioners. But specialist roles (cardiologists, oncologists, neurologists), clinical AI specialists, and precision medicine practitioners face growing demand from an expanding middle-class patient population. The industry-level L4 aggregates these divergent trends.',
  },
  {
    id: 'hc-19',
    category: 'healthcare',
    question: 'A hospital system is implementing AI diagnostics at scale. Which governance gap represents the highest liability risk?',
    options: ['Incomplete AI vendor documentation', 'No defined process for when AI diagnostic output should be overridden — creating diagnostic errors with no accountable review trail', 'No training programme for clinical staff on AI tools', 'No budget for AI tool maintenance'],
    correct: 'B',
    explanation: 'The most critical governance gap is the absence of a defined override protocol. When AI provides a diagnostic recommendation and a physician or nurse deviates from it — or accepts it against clinical instinct — without a documented process, the liability framework is unclear. Regulatory bodies require a named individual accountable for the diagnostic decision. The override protocol is what makes AI-augmented diagnosis defensible.',
  },
  {
    id: 'hc-20',
    category: 'healthcare',
    question: 'A healthcare professional has score 78 and is told the city of Bangalore offers a +22% salary premium for their target role. What does this mean in the context of the salary at-risk panel?',
    options: ['A 22% salary increase is guaranteed if they move to Bangalore', 'The full transition trajectory in the salary model is adjusted to include the estimated Bangalore premium — showing a higher income ceiling in the full-transition scenario', 'All healthcare professionals in Bangalore earn 22% more', 'The statistic is not shown to healthcare professionals — only tech and finance'],
    correct: 'B',
    explanation: 'The city salary premium is incorporated into the full transition trajectory endpoint: fullTransitionM36Premium = 1.40 + cityPremium. The chart annotation shows "Full transition path includes estimated +22% Bangalore salary premium" so users understand the geographic component of the income improvement. It is a model estimate from market data, not a guarantee.',
  },

  // ── Creative & Content (20 questions) ────────────────────────────────────
  {
    id: 'crt-01',
    category: 'creative',
    question: 'A content writer producing SEO blog articles faces which level of displacement risk from AI content generation tools?',
    options: ['Low — original content requires human creativity that AI cannot replicate', 'High — structured SEO content (keyword-targeted, formulaic structure, information assembly) is one of the most successfully automated content types', 'Moderate — AI can assist but cannot match human writing quality', 'Low — brands require human authors for credibility and legal accountability'],
    correct: 'B',
    explanation: 'SEO blog articles have a predictable structure (keyword density, heading hierarchy, information assembly from sources) that AI tools handle effectively. This is among the highest-displacement content categories. The protected layer is content requiring original reporting, brand-specific voice with accumulated audience trust, cultural sensitivity, and conceptual creativity that cannot be generated from existing training data.',
  },
  {
    id: 'crt-02',
    category: 'creative',
    question: 'What differentiates an "AI + Human" content portfolio from a pure AI-generated portfolio?',
    options: ['The AI + Human portfolio took longer to produce', 'The AI + Human portfolio contains 3 original insights, proprietary data points, or specific examples per piece that AI cannot generate — plus measurable performance metrics showing audience response', 'The AI + Human portfolio uses a disclosure label', 'The AI + Human portfolio was produced using a subscription AI tool'],
    correct: 'B',
    explanation: 'The AI + Human content model: use Claude/GPT for structure and first draft, then add 3 original insights or data points that AI cannot access (proprietary research, specific interviews, first-hand experience). Performance metrics (engagement, conversions, shares) prove the audience found value in the human addition. This is the proof of editorial judgment — the skill that cannot be commoditised.',
  },
  {
    id: 'crt-03',
    category: 'creative',
    question: 'A brand is experiencing "AI content erosion" — their content output has doubled using AI tools but audience engagement has halved. What does this demonstrate?',
    options: ['AI content tools are unreliable and should be discontinued', 'Volume without authentic brand voice does not generate audience engagement — the human editorial layer that creates distinctiveness cannot be automated', 'SEO algorithms have changed and no longer reward frequent publication', 'The AI tools being used are not state-of-the-art'],
    correct: 'B',
    explanation: 'This is the "authenticity economy" dynamic: audiences have a high sensitivity to generic AI content even when they cannot identify it technically. The engagement collapse reflects the erosion of the brand\'s distinctive voice and the trust that accumulated from human-authored content. The human content strategist who can maintain audience trust while scaling AI-assisted production is the scarce resource.',
  },
  {
    id: 'crt-04',
    category: 'creative',
    question: 'Which content specialisation has the LOWEST displacement risk and why?',
    options: ['Standard ad copywriting — high volume, formulaic', 'Brand narrative strategy for cultural moments — requires deep cultural intelligence and original conceptual thinking', 'Social media caption writing — short, structured, high volume', 'Product description writing — factual, structured, templated'],
    correct: 'B',
    explanation: 'Brand narrative strategy for cultural moments requires the ability to identify which cultural signals are relevant to a specific brand\'s audience, how to frame them authentically, and when cultural association would be inappropriate. This requires accumulated cultural intelligence, brand voice knowledge, and original conceptual thinking — not information synthesis. It is the task with the highest irreducibility and the highest market premium.',
  },
  {
    id: 'crt-05',
    category: 'creative',
    question: 'A mid-level content strategist wants to establish an AI content governance framework. What must it contain to be professionally credible?',
    options: ['A list of prohibited AI tools', 'Three pillars: what content is permitted to use AI generation, what editorial quality review process is mandatory, and how brand voice consistency is maintained at scale', 'A single approval workflow for all AI-generated content', 'An AI tool training programme for the content team'],
    correct: 'B',
    explanation: 'The content governance framework must address the three structural questions: what is the AI role (generation vs assistance vs review), what is the human oversight process (editorial checklist, voice audit, factual verification), and how brand consistency is maintained across high-volume AI output. Without these three pillars, the "framework" is a list of suggestions rather than a governance system.',
  },
  {
    id: 'crt-06',
    category: 'creative',
    question: 'A content writer has a high delivery capital score (23/25) but very low network capital (5/25). What does the capital prerequisite recommend?',
    options: ['Activate network immediately using delivery record', 'Write 3 quantified impact bullets documenting delivered results (reach, engagement, conversions) before beginning network outreach — delivery capital is the lever; network activation without proof converts at <2%', 'Build knowledge capital to 18+ first', 'No prerequisite needed — delivery capital overrides network gaps'],
    correct: 'B',
    explanation: 'Delivery dominant + network weak: the prerequisite is "write 3 impact bullets with measurable outcomes." In content, this means: "I wrote X that reached Y people and drove Z conversions." This converts the outreach from "I am a content writer looking for opportunities" to "I wrote a piece that reached 50K professionals in fintech — I thought you\'d find it relevant." The delivery metric is the conversation opener.',
  },
  {
    id: 'crt-07',
    category: 'creative',
    question: 'What does "AI content auditing" mean as a career specialisation, and why is it growing?',
    options: ['Checking AI tools for software bugs and errors', 'The professional practice of reviewing AI-generated content for brand safety, factual accuracy, legal compliance, and brand voice alignment — driven by brand liability concerns', 'Auditing AI company financial statements', 'Reviewing competitor AI content strategies'],
    correct: 'B',
    explanation: 'Brands generating high volumes of AI content face: hallucination risks (factually wrong claims), brand safety risks (AI generating content inconsistent with brand values), and legal risks (AI reproducing copyrighted content or making false claims). The AI content auditor provides the systematic quality governance that brands need before publishing at scale. This is a growing specialisation because the liability risk is real and the tool-only approach cannot address it.',
  },
  {
    id: 'crt-08',
    category: 'creative',
    question: 'A graphic designer uses AI image generation tools extensively. Which of their skills has the HIGHEST long-term value?',
    options: ['Prompt engineering for image generation', 'Brand identity system design — creating the visual language that defines how a brand communicates across all contexts', 'Technical proficiency with design software (Figma, Illustrator)', 'Stock image sourcing and licensing'],
    correct: 'B',
    explanation: 'Brand identity system design requires: understanding the brand\'s strategic positioning, cultural context, target audience psychology, and competitive landscape — then translating this into a coherent visual language that works across unlimited contexts. This is original conceptual thinking grounded in deep brand knowledge. Prompt engineering and software proficiency are skills that will commoditise as tools improve; brand strategy is structurally irreplaceable.',
  },
  {
    id: 'crt-09',
    category: 'creative',
    question: 'A content strategist with 11 years of experience and network capital of 20/25 is evaluated for an archetype. Which archetype is selected and why?',
    options: ['RESKILL — content roles are high-risk', 'PLATFORM — knowledge capital should be published first', 'LEVERAGE — 10+ years with network ≥ 18 triggers the relationship-activation archetype', 'AUGMENT — content augmentation potential is high'],
    correct: 'C',
    explanation: 'LEVERAGE is triggered when: experienceYears ≥ 10 AND networkCapital ≥ 18. At 11 years with 20/25 network capital, the conditions are met. LEVERAGE strategy: activate existing relationships before any other action, because warm referrals close 6× faster than cold applications. The specific action: contact top 5 network relationships with a genuine conversation request (not a job ask) within 3 weeks.',
  },
  {
    id: 'crt-10',
    category: 'creative',
    question: 'What is the most important distinction between a "content system" and "content samples" as a portfolio element?',
    options: ['Systems take longer to create than samples', 'A content system shows the repeatable workflow (brief → AI generation → editorial layer → distribution → measurement) that scales quality at volume; samples show individual outputs that could be one-off quality', 'Systems are only relevant for teams, not individual contributors', 'Samples are more impressive because they show final outputs'],
    correct: 'B',
    explanation: 'In AI-era content hiring, what differentiates is not "I can write good content" (anyone can produce good samples) but "I can run a system that consistently produces good content at scale." The system demonstrates: process design, quality control, AI direction capability, and measurement — exactly what a content team lead or agency partner needs to see to hire someone into a strategic role.',
  },
  {
    id: 'crt-11',
    category: 'creative',
    question: 'A UX designer\'s at-risk skill "User journey mapping from standard templates" has riskScore 72/100. What is the primary AI capability threatening this skill?',
    options: ['AI systems can conduct user research independently', 'AI tools can generate multiple journey map variants from brief inputs — what previously took 8 hours now takes 30 minutes', 'AI design tools have replaced Figma and similar UX software', 'User journey maps are no longer needed in modern design processes'],
    correct: 'B',
    explanation: 'Journey map generation from structured inputs (user goal, touchpoints, system constraints) is exactly the type of systematic synthesis that LLM tools handle well. The 8-hour to 30-minute compression means UX designers who primarily create journey maps face a significant productivity displacement. The protected work is the research and synthesis that informs the journey map inputs — the human-to-human interviews, the interpretation of qualitative data, and the design decision-making.',
  },
  {
    id: 'crt-12',
    category: 'creative',
    question: 'A marketing manager has the AUGMENT archetype selected. Their score is 55/100. What is Phase 1 of the AUGMENT roadmap?',
    options: ['Build 3 marketing case studies demonstrating ROI', 'Master 2–3 AI marketing tools (e.g., Jasper for content, Persado for email, HubSpot AI for analytics) to demonstrate 2× productivity improvement in core tasks', 'Network with 5 senior marketing leaders', 'Complete a Google Analytics certification'],
    correct: 'B',
    explanation: 'AUGMENT Phase 1: "Master the 2–3 transformative AI tools for your function. Spend 8–10 hours per week for 6 weeks building genuine proficiency — not surface-level familiarity. Goal: you can perform your core tasks 2× faster using AI assistance than your colleagues can without it." The 2× productivity demonstration is the milestone that unlocks Phase 2 (demonstrate the multiplier) and Phase 3 (title/scope negotiation).',
  },
  {
    id: 'crt-13',
    category: 'creative',
    question: 'A SEO specialist has "SEO keyword research automation" as an obsolete skill (riskScore 95/100). What should their action plan include?',
    options: ['Switch to a different career field immediately', 'Transition to AI-supervised SEO strategy: use AI tools for keyword research, add human judgment for competitive context, brand voice alignment, and content strategy that AI tools cannot derive from keyword data alone', 'Resist AI tools and emphasise manual SEO expertise as a differentiator', 'Learn to use the specific AI tool replacing keyword research'],
    correct: 'B',
    explanation: 'The correct response to an obsolete skill is to move up the value chain to the human-judgment layer above it. AI tools generate keyword lists; the human strategic layer decides which keywords align with brand positioning, which competitive battles to pick, and how to build topical authority over time. The SEO specialist who understands AI tools\' output AND applies strategic context is the AI-augmented version of the role.',
  },
  {
    id: 'crt-14',
    category: 'creative',
    question: 'What is the minimum word count for the "oneActionThisWeek" LLM response field when a returning user has a stable score (score delta < 4)?',
    options: ['40 words', '80 words', '100 words', '120 words'],
    correct: 'D',
    explanation: 'For stable returning users, the LLM question priority puts "oneActionThisWeek" first with a minimum of 120 words — the highest minimum across all contexts for this field. The rationale: stable users need execution-focused, specific actions that reference real market data (career path openings, hiring bar requirements) to create momentum. A 120-word minimum ensures the response includes specific steps, a proof point, and market grounding.',
  },
  {
    id: 'crt-15',
    category: 'creative',
    question: 'A junior content writer asks whether a LinkedIn post about their AI writing workflow constitutes a "publishable proof of expertise." What is the correct evaluation?',
    options: ['Yes — any published content counts as a proof point', 'Only if it documents a specific insight with measurable context: what process they developed, what problem it solved, and ideally what outcome it produced', 'No — proof points require formal publication venues', 'Only if the post receives 100+ likes'],
    correct: 'B',
    explanation: 'A LinkedIn post counts as a proof point when it contains: (1) a specific, non-obvious insight (not "AI is changing content writing"), (2) a documented process or decision the writer made, and (3) ideally a measurable context (even if approximate: "this approach to AI editing reduced my review time by half"). Generic AI commentary does not constitute proof of expertise — specificity is what differentiates expert content from awareness content.',
  },
  {
    id: 'crt-16',
    category: 'creative',
    question: 'A creative director at a media company has "Influencer Partnership Strategy" as a safe skill with LTV 88/100. What makes this skill structurally protected?',
    options: ['Influencer marketing will always require human coordination', 'Selecting influencers requires understanding cultural authenticity, audience trust dynamics, and brand alignment — judgment about human credibility that cannot be extracted from follower counts or engagement metrics', 'Legal compliance in influencer agreements requires human oversight', 'The relationships are personal and cannot be transferred to AI systems'],
    correct: 'B',
    explanation: 'Influencer selection at the expert level is about cultural authenticity — whether this person\'s values, audience trust, and content style genuinely align with the brand\'s strategic positioning. AI can surface engagement metrics and audience demographics; it cannot evaluate the quality of the trust relationship between creator and audience, or whether an association would create long-term brand equity or short-term noise. This judgment is human.',
  },
  {
    id: 'crt-17',
    category: 'creative',
    question: 'What does "content niche with regulatory complexity" mean as a displacement protection strategy?',
    options: ['Creating content that mentions regulatory topics', 'Specialising in industries where content errors create legal liability (financial, healthcare, legal) — where AI output requires mandatory human expert review because errors have consequences', 'Working at a company with strong regulatory compliance', 'Producing regulatory filings and compliance documents'],
    correct: 'B',
    explanation: 'In regulated industries, AI content errors are not just quality problems — they are liability problems. A financial services firm cannot publish AI-generated investment advice without a compliance review. A pharma company cannot publish AI-generated clinical content without medical review. Specialists who provide the expert review layer for regulated-domain content face growing demand and significant salary premiums because the liability of getting it wrong cannot be automated away.',
  },
  {
    id: 'crt-18',
    category: 'creative',
    question: 'A creative professional\'s peer percentile shows: score 70, 82nd percentile among content writers. What does this mean?',
    options: ['70% of content writers have higher scores', '82% of content writers in the research dataset score lower than 70 — placing this writer in the higher-risk cohort of their peer group', 'The score of 70 is above average for creative professionals', 'The writer is in the top 18% for creative talent'],
    correct: 'B',
    explanation: 'The 82nd percentile means 82% of content writers in the distribution have LOWER scores — this writer has a HIGHER risk than 82% of their peers. The peer percentile is a risk comparison, not a talent ranking. For content writers, whose median score is approximately 70 (from the distribution data), an 82nd percentile placement indicates the writer is among the higher-risk content professionals — likely due to a specialisation in high-automation content types.',
  },
  {
    id: 'crt-19',
    category: 'creative',
    question: 'What is the "authenticity economy" and why does it represent a career opportunity for experienced content professionals?',
    options: ['A marketing trend where authentic content performs better', 'The emerging premium on genuinely human-created content as AI-generated content floods channels — audiences and brands are developing sensitivity to AI-generated generic content and paying premiums for authentic human perspective', 'The economic model of freelance content creation', 'A social media platform algorithm change favouring authentic creators'],
    correct: 'B',
    explanation: 'As AI content volume increases, audience sensitivity to authentic vs generic content grows. Brands that relied purely on AI-generated volume are experiencing engagement collapse. The authenticity premium — the market value of genuine human perspective, cultural intelligence, and original conceptual thinking — is rising as the commodity content price falls. Experienced content professionals who can articulate and deliver this human value layer are entering a premium market.',
  },
  {
    id: 'crt-20',
    category: 'creative',
    question: 'A principal-level creative director is asked to articulate their value in an AI-content world. Which statement best represents the correct strategic positioning?',
    options: ['"I write better content than AI"', '"I build the systems, standards, and brand strategy frameworks that make AI content worth publishing — and I take board-level accountability for the brand voice outcomes"', '"I use AI tools more effectively than other creative directors"', '"I can produce content 5× faster using AI tools"'],
    correct: 'B',
    explanation: 'At principal/VP level, the differentiation is not execution speed or tool proficiency — it is strategy and accountability. The principal creative director defines what quality means, builds the governance systems that maintain it at scale, and is personally accountable to the board for brand voice outcomes. This is institutional thinking that cannot be replaced by AI tools — it is the human judgment that determines what AI tools are permitted to produce.',
  },
];

const CERT_REQUIREMENTS = [
  {
    id: 'roadmap',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Complete Upskilling Roadmap',
    description: 'Mark all Phase 1 and Phase 2 actions as complete in your Action Plan (Intensive track).',
    detail: 'Requires all Critical and High priority actions to be checked off.',
    color: 'var(--cyan)',
  },
  {
    id: 'assessment',
    icon: <Shield className="w-5 h-5" />,
    title: 'Pass 3 of 5 Skill Assessments',
    description: 'Each assessment is 20 questions for your role category. Passing threshold: 70% (14/20).',
    detail: 'Assessments are graded automatically. You may retake a failed assessment once per 14 days.',
    color: 'var(--violet)',
  },
  {
    id: 'story',
    icon: <FileText className="w-5 h-5" />,
    title: 'Submit Verified Transition Story',
    description: 'Minimum 300 words describing what you changed, what you learned, and your measurable outcome.',
    detail: 'Reviewed by a platform reviewer within 5 business days. Must describe a real, completed change.',
    color: 'var(--emerald)',
  },
];

function formatExpiry(issuedAt: string): string {
  const d = new Date(issuedAt);
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CertificationPage() {
  const [certStatus] = useState<CertStatus>({
    roadmapComplete: false,
    assessmentsPassed: 0,
    storySubmitted: false,
    storyVerified: false,
  });
  const [storyText, setStoryText] = useState('');
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [storySubmitted, setStorySubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<CertStep>('roadmap');

  const requirementsMet = certStatus.roadmapComplete &&
    certStatus.assessmentsPassed >= 3 &&
    certStatus.storyVerified;

  const overallProgress = useMemo(() => {
    let pts = 0;
    if (certStatus.roadmapComplete) pts += 33;
    if (certStatus.assessmentsPassed >= 3) pts += 34;
    if (certStatus.storyVerified) pts += 33;
    return pts;
  }, [certStatus]);

  const handleStorySubmit = async () => {
    if (storyText.trim().length < 300) return;
    setStorySubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('certification_stories').insert({
        user_id: session?.user?.id,
        story_text: storyText.trim(),
        word_count: storyText.trim().split(/\s+/).length,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      });
      setStorySubmitted(true);
    } catch { /* ignore — store locally */ }
    setStorySubmitting(false);
  };

  return (
    <div className="page-wrap" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ maxWidth: 880 }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Award size={32} style={{ color: 'var(--amber)' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                AI-Safe Professional Certification
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '0.875rem' }}>
                Verified career resilience credential · Renewable annually · LinkedIn badge included
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Certification Progress</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: requirementsMet ? 'var(--emerald)' : 'var(--cyan)', fontSize: '1.1rem' }}>
                {overallProgress}%
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--alpha-bg-06)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1 }}
                style={{ height: '100%', background: requirementsMet ? 'var(--emerald)' : 'var(--cyan)', borderRadius: 3 }}
              />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}>
          {CERT_REQUIREMENTS.map((req, i) => {
            const isComplete =
              (req.id === 'roadmap' && certStatus.roadmapComplete) ||
              (req.id === 'assessment' && certStatus.assessmentsPassed >= 3) ||
              (req.id === 'story' && certStatus.storyVerified);
            return (
              <div key={req.id}
                style={{ background: 'var(--bg-raised)', border: `1px solid ${isComplete ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '18px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ padding: 10, borderRadius: 10, background: `${req.color}15`, color: req.color, flexShrink: 0 }}>
                  {req.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>{req.title}</h4>
                    {isComplete
                      ? <CheckCircle size={16} style={{ color: 'var(--emerald)' }} />
                      : <Circle size={16} style={{ color: 'var(--text-3)', opacity: 0.4 }} />}
                  </div>
                  <p style={{ margin: '0 0 6px', color: 'var(--text-3)', fontSize: '0.8rem', lineHeight: 1.65 }}>{req.description}</p>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.72rem', opacity: 0.7 }}>{req.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assessments grid */}
        <div style={{ marginBottom: 36 }}>
          <h3 style={{ fontWeight: 800, marginBottom: 16 }}>Skill Assessments</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {ROLE_ASSESSMENTS.map(a => {
              const isPassed = false; // would come from user data
              return (
                <div key={a.id} style={{ background: 'var(--bg-raised)', border: `1px solid ${isPassed ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.label}</span>
                    {isPassed
                      ? <CheckCircle size={16} style={{ color: 'var(--emerald)' }} />
                      : <Lock size={14} style={{ color: 'var(--text-3)', opacity: 0.4 }} />}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 10 }}>
                    {a.questions} questions · Pass threshold: {a.passing}/{a.questions} ({Math.round(a.passing / a.questions * 100)}%)
                  </div>
                  <button
                    style={{ width: '100%', padding: '8px', background: isPassed ? 'rgba(16,185,129,0.1)' : 'var(--alpha-bg-05)', border: `1px solid ${isPassed ? 'rgba(16,185,129,0.25)' : 'var(--alpha-bg-10)'}`, borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: isPassed ? 'var(--emerald)' : 'var(--text-2)' }}>
                    {isPassed ? '✓ Passed' : 'Take Assessment'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transition story submission */}
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px', marginBottom: 36 }}>
          <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>Transition Story</h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.7 }}>
            Describe what you changed in your career, what you learned during the process, and what your measurable outcome was. Minimum 300 words. This is reviewed by a platform reviewer within 5 business days.
          </p>
          {storySubmitted ? (
            <div style={{ padding: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: 'var(--emerald)', fontSize: '0.85rem' }}>
              ✓ Story submitted — awaiting reviewer approval (typically 3–5 business days).
            </div>
          ) : (
            <>
              <textarea
                rows={6}
                placeholder="Tell your transition story: what specifically did you change? What skills did you build? What was the measurable outcome (new role, salary change, reduced displacement risk)?"
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', background: 'var(--alpha-bg-04)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.875rem', resize: 'vertical', lineHeight: 1.7 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ fontSize: '0.78rem', color: storyText.length >= 300 ? 'var(--emerald)' : 'var(--amber)' }}>
                  {storyText.trim().split(/\s+/).filter(Boolean).length} / 300 words minimum
                </span>
                <button
                  disabled={storyText.trim().split(/\s+/).length < 300 || storySubmitting}
                  onClick={handleStorySubmit}
                  style={{ padding: '8px 20px', borderRadius: 8, background: storyText.trim().split(/\s+/).length >= 300 ? 'var(--cyan)' : 'var(--alpha-bg-05)', color: storyText.trim().split(/\s+/).length >= 300 ? '#000' : 'var(--text-3)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', border: 'none' }}>
                  {storySubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Badge section */}
        <div style={{ background: requirementsMet ? 'rgba(16,185,129,0.06)' : 'var(--bg-raised)', border: `1px solid ${requirementsMet ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Award size={24} style={{ color: requirementsMet ? 'var(--emerald)' : 'var(--text-3)', opacity: requirementsMet ? 1 : 0.4 }} />
            <h3 style={{ margin: 0, fontWeight: 800 }}>
              {requirementsMet ? 'Your Certification Badge' : 'Badge Locked — Complete All 3 Requirements'}
            </h3>
          </div>
          {requirementsMet ? (
            <>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 16 }}>
                <Award size={48} style={{ color: 'var(--emerald)', marginBottom: 12 }} />
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--emerald)', marginBottom: 4 }}>
                  HumanProof AI-Safe Professional 2026
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                  Verified by HumanProof Intelligence Platform · Expires {formatExpiry(new Date().toISOString())}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'rgba(10,102,194,0.15)', border: '1px solid rgba(10,102,194,0.3)', borderRadius: 8, color: '#0a66c2', fontWeight: 700, cursor: 'pointer' }}>
                  <Share2 size={14} /> Share on LinkedIn
                </button>
                <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--alpha-bg-05)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontWeight: 700, cursor: 'pointer' }}>
                  <ExternalLink size={14} /> View Public Badge
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', margin: 0, lineHeight: 1.7 }}>
              Complete all 3 requirements above to earn your HumanProof AI-Safe Professional badge. The badge includes a verification URL, expiry date, and a LinkedIn share button that pre-fills your achievement post.
            </p>
          )}
        </div>

        {/* Renewal info */}
        <div style={{ marginTop: 24, padding: '16px 20px', background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-2)' }}>Annual Renewal (₹5,999/year):</strong> Complete an updated audit showing the same or lower risk score, pass 2 updated assessments, and submit a 150-word story update. Renewal automatically activates before expiry.
        </div>

      </div>
    </div>
  );
}
