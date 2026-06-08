// TaskExposureMatrix — §4 Task Exposure Analysis
// Temporal per-task risk matrix: 2026/2028/2030 risk %, Human Advantage,
// AI Capability Trend, Displacement Timeline, Confidence.
// Country/experience modulation applied to all values.

import React, { useState } from 'react';
import type { AutomationTimeline, TaskDetail, DriverNarrative } from '../../data/automationTimelineData';
import { COUNTRY_RISK_PROFILES } from '../../data/countryRiskProfile';

const WHY_AI: Record<string, string> = {
  'core':              'Pattern-based, repetitive, high training data availability — AI tools learn from millions of examples of this exact work.',
  'administrative':    'Structured workflow, rule-following, form-based — AI handles these faster and without fatigue.',
  'secondary':         'Templated output, well-defined process — AI generates drafts instantly from patterns.',
  'strategic':         'AI assists with synthesis and structuring, reducing the effort needed for analysis.',
  'human-interaction': 'Conversational in nature — AI chatbots and voice agents already attempt this work at scale.',
  'decision-making':   'AI can model scenarios and surface recommendations — humans still approve, but the work shrinks.',
  'creative':          'AI generates high volumes of variations quickly — volume tasks become automated.',
};

const WHY_HUMAN: Record<string, string> = {
  'core':              'Business logic, security implications, and edge-case judgment still require human accountability.',
  'administrative':    'Exception handling and judgment under ambiguity remain human responsibilities.',
  'secondary':         'Contextual nuance, relationship continuity, and quality curation require human involvement.',
  'strategic':         'Stakeholder dynamics, ethical calls, and organizational context cannot be captured by AI.',
  'human-interaction': 'Emotional attunement, genuine trust, and physical presence remain irreplaceable.',
  'decision-making':   'Accountability, lived experience, and organizational context drive the final call.',
  'creative':          'Artistic direction, style ownership, and original vision are distinctly human.',
};

interface Props {
  timeline: AutomationTimeline;
  d1Score: number;
  techStack?: string;
  countryKey?: string;
  experience?: string;
  d7Score?: number;
}

type GroupView = 'vulnerable' | 'defensible' | 'fastest' | 'human' | 'agentic';

const TASK_TYPE_COLORS: Record<TaskDetail['taskType'], string> = {
  'core':              'var(--red)',
  'secondary':         'var(--amber)',
  'administrative':    '#f97316',
  'strategic':         'var(--emerald)',
  'human-interaction': 'var(--cyan)',
  'decision-making':   'var(--violet)',
  'creative':          '#a78bfa',
};

const TREND_COLORS: Record<string, string> = {
  Rapid:    'var(--red)',
  Moderate: 'var(--amber)',
  Slow:     'var(--cyan)',
  Plateau:  'var(--emerald)',
};

const IMPACT_COLORS: Record<string, string> = {
  Critical: 'var(--red)',
  High:     'var(--amber)',
  Moderate: 'var(--cyan)',
  Low:      'var(--emerald)',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  High:       'var(--emerald)',
  Medium:     'var(--amber)',
  Speculative:'var(--text-3)',
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getExperienceModifier(experience: string): number {
  // Positive = reduces risk & increases human advantage (seniors are harder to replace)
  // Negative = increases risk (entry-level easier to replace)
  if (experience === '0-2') return -5;
  if (experience === '2-5') return -2;
  if (experience === '10-20') return +8;
  if (experience === '20+') return +12;
  return 0; // '5-10' mid — baseline
}

function getAdoptionLag(countryKey: string): number {
  const profile = COUNTRY_RISK_PROFILES[countryKey];
  if (!profile) return 0;
  return 1 - profile.aiAdoptionSpeed; // 0 for USA, ~0.3 for India
}

function applyCountryAndExpModifiers(
  tasks: TaskDetail[],
  countryKey: string,
  experience: string,
): TaskDetail[] {
  const lag = getAdoptionLag(countryKey);
  const expMod = getExperienceModifier(experience);
  return tasks.map(t => {
    // expMod > 0 for seniors: lowers AI risk scores, raises human advantage
    // expMod < 0 for entry-level: raises AI risk scores, lowers human advantage
    const adj2026 = Math.min(95, Math.max(2, t.risk2026 - expMod));
    const adj2028 = Math.min(95, Math.max(2, Math.round(lerp(t.risk2026, t.risk2028, 1 - lag * 0.5)) - expMod));
    const adj2030 = Math.min(95, Math.max(2, Math.round(lerp(t.risk2028, t.risk2030, 1 - lag * 0.4)) - expMod));
    const adjHuman = Math.min(98, Math.max(2, t.humanAdvantageScore + expMod));
    return { ...t, risk2026: adj2026, risk2028: adj2028, risk2030: adj2030, humanAdvantageScore: adjHuman };
  });
}

function buildHeuristicTasks(timeline: AutomationTimeline, d1Score: number): TaskDetail[] {
  const base = Math.min(88, Math.max(55, d1Score + 8));
  const tasks: TaskDetail[] = [];
  timeline.topTasksAtRisk.forEach((name, i) => {
    const r26 = Math.min(93, base - i * 4);
    tasks.push({
      name, taskType: 'core',
      risk2026: r26, risk2028: Math.min(93, r26 + 12), risk2030: Math.min(93, r26 + 20),
      humanAdvantageScore: Math.max(5, 100 - r26 - 10),
      aiCapabilityTrend: 'Rapid',
      displacementTimeline: r26 >= 70 ? 'Immediate' : '2–3 years',
      confidence: 'Medium',
    });
  });
  timeline.humanEssentialTasks.forEach((name, i) => {
    const h = Math.min(95, 75 + i * 3);
    const r26 = Math.max(5, 100 - h);
    tasks.push({
      name, taskType: 'human-interaction',
      risk2026: r26, risk2028: Math.min(50, r26 + 5), risk2030: Math.min(60, r26 + 10),
      humanAdvantageScore: h,
      aiCapabilityTrend: 'Slow',
      displacementTimeline: '7+ years',
      confidence: 'Medium',
    });
  });
  return tasks;
}

function buildHeuristicDriverNarratives(timeline: AutomationTimeline): DriverNarrative[] {
  const impactFromTier = (tier: string): 'Low' | 'Moderate' | 'High' | 'Critical' => {
    if (tier === 'very_high') return 'Critical';
    if (tier === 'high') return 'High';
    if (tier === 'moderate') return 'Moderate';
    return 'Low';
  };
  const curr = impactFromTier(timeline.riskTier);
  const FUTURE_STEP: Record<string, 'Low' | 'Moderate' | 'High' | 'Critical'> = { Low: 'Moderate', Moderate: 'High', High: 'Critical', Critical: 'Critical' };
  const fut = FUTURE_STEP[curr];
  return timeline.automationDrivers.map(driver => ({
    driver,
    currentImpact: curr,
    futureImpact: fut,
    reason: `${driver} is increasingly capable of handling ${timeline.topTasksAtRisk[0] ?? 'core tasks in this role'}, creating structural pressure on headcount and role definitions over the coming years.`,
  }));
}

function applyGroupView(tasks: TaskDetail[], view: GroupView): TaskDetail[] {
  const sorted = [...tasks];
  if (view === 'vulnerable')  return sorted.sort((a, b) => b.risk2028 - a.risk2028);
  if (view === 'defensible')  return sorted.sort((a, b) => b.humanAdvantageScore - a.humanAdvantageScore);
  if (view === 'fastest')     return sorted.sort((a, b) => (a.aiCapabilityTrend === 'Rapid' ? -1 : b.aiCapabilityTrend === 'Rapid' ? 1 : 0));
  if (view === 'human')       return sorted.sort((a, b) => {
    const human = ['strategic', 'human-interaction', 'decision-making'];
    const aH = human.includes(a.taskType) ? 1 : 0;
    const bH = human.includes(b.taskType) ? 1 : 0;
    return bH - aH || b.humanAdvantageScore - a.humanAdvantageScore;
  });
  // agentic
  return sorted.sort((a, b) => b.risk2030 - a.risk2030);
}

function RiskBar({ value, max = 95 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  let color = 'var(--emerald)';
  if (value >= 70) color = 'var(--red)';
  else if (value >= 45) color = 'var(--amber)';
  else if (value >= 25) color = 'var(--cyan)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.7s ease' }} />
      </div>
      <span style={{ fontSize: '0.62rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function Chip({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <span style={{
      padding: small ? '1px 6px' : '2px 7px',
      borderRadius: '4px',
      background: `${color}14`,
      border: `1px solid ${color}30`,
      fontSize: '0.55rem',
      fontWeight: 800,
      color,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

const GROUP_VIEWS: { key: GroupView; label: string }[] = [
  { key: 'vulnerable',  label: 'Most Vulnerable' },
  { key: 'defensible',  label: 'Most Defensible' },
  { key: 'fastest',     label: 'Fastest Changing' },
  { key: 'human',       label: 'Highest Human Value' },
  { key: 'agentic',     label: 'Highest AI Risk' },
];

// ── Role-specific task label overrides ───────────────────────────────────────
// When a catalog role (e.g. sw_frontend) aliases to a broader timeline entry
// (swe), these overrides relabel the top tasks so users see role-specific names
// rather than the generic SWE tasks. Values are [topAtRisk, humanEssential].
const ROLE_TASK_OVERRIDES: Record<string, { atRisk: string[]; human: string[]; drivers: string[] }> = {
  sw_frontend:  { atRisk: ['React component boilerplate generation', 'CSS/styling automation', 'Unit test scaffolding'], human: ['Complex state architecture decisions', 'Stakeholder UX requirement negotiation', 'Performance debugging across browsers'], drivers: ['GitHub Copilot / v0 / Cursor for UI gen', 'AI-driven component libraries (shadcn/AI)', 'LLM HTML/CSS/React synthesis'] },
  sw_backend:   { atRisk: ['CRUD endpoint generation', 'Database query writing', 'API documentation'], human: ['System scalability architecture', 'Security design decisions', 'Cross-team integration negotiation'], drivers: ['AI code generation (GitHub Copilot, Claude Code)', 'API-building AI agents', 'LLM SQL and schema generation'] },
  sw_fullstack: { atRisk: ['Full-stack boilerplate scaffolding', 'Routine API/DB integration', 'Unit and integration tests'], human: ['End-to-end system architecture', 'Product requirement clarification', 'Performance and cost optimization'], drivers: ['Cursor / Devin full-stack agents', 'LLM end-to-end code generation', 'No-code + AI hybrid platform growth'] },
  sw_devops:    { atRisk: ['CI/CD pipeline configuration', 'Infrastructure-as-code templates', 'Alert rule setup'], human: ['Incident diagnosis across complex distributed systems', 'Security policy architecture', 'Cost optimization strategy'], drivers: ['AI DevOps platforms (Pulumi AI, Terraform Copilot)', 'AIOps anomaly detection', 'Self-healing infrastructure agents'] },
  sw_arch:      { atRisk: ['Architecture documentation drafting', 'Standard pattern selection'], human: ['Stakeholder trade-off decisions', 'Novel system design for emerging requirements', 'Engineering org capability planning'], drivers: ['LLM architecture proposal generation', 'AI design pattern recommendation', 'Agentic system diagram generation'] },
  sw_cloud:     { atRisk: ['Cloud resource provisioning scripts', 'Standard IAM policy templates', 'Cost allocation tagging'], human: ['Multi-cloud strategy decisions', 'Security architecture under novel threats', 'Vendor negotiation'], drivers: ['AWS/Azure/GCP AI-native tools', 'Cloud cost optimization AI (Spot.io, Zesty)', 'Infrastructure AI agents'] },
  sw_testing:   { atRisk: ['Test case generation', 'Test script maintenance', 'Bug report writing'], human: ['Exploratory testing for novel user journeys', 'Test strategy for ambiguous requirements', 'Production incident triage'], drivers: ['AI test generation (Copilot, Testim AI)', 'Autonomous QA agents', 'LLM-powered regression suites'] },
  sw_ml:        { atRisk: ['Hyperparameter search', 'Feature engineering pipelines', 'Model evaluation scripts'], human: ['Novel architecture design', 'Business problem framing', 'Ethical AI deployment decisions'], drivers: ['AutoML platforms (Google AutoML, H2O)', 'AI model synthesis agents', 'Foundation model fine-tuning automation'] },
  web_react:    { atRisk: ['Component boilerplate generation', 'Styling and layout code', 'Hook scaffolding'], human: ['Complex state management architecture', 'Performance optimization judgment', 'Stakeholder UX alignment'], drivers: ['v0 / Cursor for React gen', 'AI-powered Figma-to-code (Anima, Locofy)', 'LLM component synthesis'] },
  web_wordpress:{ atRisk: ['Theme customization', 'Plugin configuration', 'SEO metadata generation'], human: ['Custom business logic plugins', 'Site performance architecture', 'Client requirement interpretation'], drivers: ['AI WordPress builders (Divi AI, Elementor AI)', 'LLM content generation', 'AI SEO plugins'] },
  mob_ios:      { atRisk: ['SwiftUI view boilerplate', 'Unit test generation', 'API client code'], human: ['App architecture decisions', 'App Store review strategy', 'Complex animation engineering'], drivers: ['Xcode AI (GitHub Copilot for Swift)', 'LLM SwiftUI generation', 'AI app testing (Appium AI)'] },
  mob_android:  { atRisk: ['Jetpack Compose boilerplate', 'Kotlin data class generation', 'Unit test scaffolding'], human: ['Architecture component decisions', 'Performance profiling', 'Multi-device compatibility strategy'], drivers: ['Android Studio AI (Gemini Code Assist)', 'LLM Kotlin generation', 'AI-powered UI testing'] },
  // ML/AI/Data
  ml_model:     { atRisk: ['Hyperparameter tuning runs', 'Model evaluation scripts', 'Feature engineering pipelines'], human: ['Novel architecture design', 'Problem framing from business context', 'Ethical deployment decisions'], drivers: ['AutoML (Google AutoML, H2O)', 'Foundation model fine-tuning automation', 'AI agent-based experimentation'] },
  ml_analytics: { atRisk: ['Standard dashboard creation', 'Scheduled report generation', 'SQL query writing'], human: ['Business insight interpretation', 'Stakeholder data storytelling', 'Metric design for novel business problems'], drivers: ['AI BI tools (Tableau GPT, Power BI Copilot)', 'Natural language to SQL (Text2SQL)', 'Automated insight generation'] },
  ml_etl:       { atRisk: ['Pipeline boilerplate generation', 'Data transformation scripts', 'Schema mapping'], human: ['Data quality strategy for novel sources', 'Cross-system architecture decisions', 'Business logic exception handling'], drivers: ['AI data pipeline builders (dbt AI, Fivetran AI)', 'LLM ETL code generation', 'Automated schema inference'] },
  // Security
  sec_pen:      { atRisk: ['Known vulnerability scanning', 'Standard report writing', 'Common exploit replication'], human: ['Novel attack chain discovery', 'Client debrief and remediation strategy', 'Zero-day research'], drivers: ['AI pentesting tools (Horizon3 NodeZero)', 'Autonomous vulnerability scanners', 'LLM exploit generation (limited)'] },
  sec_soc:      { atRisk: ['Tier-1 alert triage', 'Standard incident logging', 'Known IOC detection'], human: ['Novel attack investigation', 'Threat hunting across ambiguous signals', 'Escalation judgment'], drivers: ['AI SIEM (Microsoft Sentinel AI, Splunk AI)', 'Automated threat detection agents', 'LLM-assisted malware analysis'] },
  sec_grc:      { atRisk: ['Compliance checklist completion', 'Standard policy documentation', 'Risk registry updates'], human: ['Regulatory interpretation for novel frameworks', 'Board-level risk communication', 'Vendor risk negotiation'], drivers: ['RegTech AI (OneTrust AI, Vanta AI)', 'Automated audit platforms', 'AI policy generation tools'] },
  // Finance
  fin_account:  { atRisk: ['Journal entry processing', 'Bank reconciliation', 'Standard report generation'], human: ['Complex accounting judgments', 'Audit readiness strategy', 'Client advisory on unusual transactions'], drivers: ['AI accounting (Sage AI, QuickBooks AI)', 'Automated reconciliation platforms', 'LLM financial statement analysis'] },
  fin_tax:      { atRisk: ['Standard return preparation', 'Routine tax form filing', 'Deduction identification'], human: ['Complex multi-entity tax strategy', 'IRS audit representation', 'Cross-border tax structuring'], drivers: ['AI tax preparation (TurboTax AI, Thomson Reuters AI)', 'Automated compliance monitoring', 'LLM regulatory interpretation'] },
  fin_fp:       { atRisk: ['Standard variance analysis', 'Budget model templating', 'Dashboard report generation'], human: ['Strategic scenario planning', 'Board narrative and presentation', 'Novel forecast model design'], drivers: ['AI FP&A (Anaplan AI, Planful AI)', 'LLM financial narrative generation', 'Automated rolling forecast tools'] },
  fin_risk:     { atRisk: ['Standard risk model runs', 'Routine stress test execution', 'Report generation'], human: ['Novel risk factor identification', 'Board-level risk communication', 'Regulatory interpretation'], drivers: ['AI risk platforms (Moody\'s Analytics AI)', 'Automated stress testing engines', 'LLM risk narrative generation'] },
  // BPO / Admin
  bpo_inbound:  { atRisk: ['Standard query resolution', 'FAQ lookup and response', 'Call logging and wrap-up'], human: ['Complex complaint escalation', 'High-empathy customer de-escalation', 'Regulatory compliance in unusual cases'], drivers: ['Conversational AI (Salesforce Einstein, Zendesk AI)', 'Voice AI agents (Synthflow, Bland AI)', 'LLM knowledge base automation'] },
  bpo_chat:     { atRisk: ['Standard chat query handling', 'Product info lookups', 'Ticket creation'], human: ['Complex multi-party dispute resolution', 'Empathy-driven de-escalation', 'Novel exception handling'], drivers: ['AI chat agents (Intercom Fin, Drift AI)', 'LLM-powered chat automation', 'Intent classification AI'] },
  bpo_data_entry: { atRisk: ['Form data extraction', 'Document processing', 'Database updates'], human: ['Exception and anomaly resolution', 'Quality audit judgment', 'Process improvement design'], drivers: ['Intelligent Document Processing (IDP) — AWS Textract, ABBYY', 'RPA + AI (UiPath, Automation Anywhere)', 'LLM-powered OCR and extraction'] },
  adm_exec:     { atRisk: ['Calendar scheduling and coordination', 'Email triage and drafting', 'Travel booking'], human: ['Executive relationship management', 'Sensitive stakeholder communication', 'Strategic priority coordination'], drivers: ['AI executive assistants (Otter AI, Motion)', 'LLM email drafting (Superhuman AI)', 'Calendar AI scheduling (Reclaim, Clockwise)'] },
  // HR / Legal
  hr_recruit:   { atRisk: ['JD generation', 'Resume screening and shortlisting', 'Interview scheduling'], human: ['Final candidate culture-fit judgment', 'Candidate experience differentiation', 'Hiring manager alignment'], drivers: ['AI recruiting platforms (Eightfold, Beamery)', 'LLM resume scoring', 'AI sourcing (HireEZ, Seekout)'] },
  leg_paralegal: { atRisk: ['Contract clause extraction', 'Legal research and case law lookup', 'Document drafting from templates'], human: ['Nuanced case strategy', 'Client relationship management', 'Novel legal argument construction'], drivers: ['AI legal research (Harvey AI, Westlaw AI)', 'Contract review AI (Ironclad, Kira)', 'LLM document drafting'] },
  // Healthcare
  hc_doctor:    { atRisk: ['Clinical note documentation', 'Standard protocol lookups', 'Routine referral letters'], human: ['Complex diagnostic reasoning', 'Patient relationship and informed consent', 'Ambiguous case judgment'], drivers: ['AI clinical documentation (Nuance DAX, Ambience)', 'Diagnostic AI (Google Health AI)', 'LLM clinical decision support'] },
  hc_medical_coding: { atRisk: ['ICD code assignment from notes', 'Routine billing code mapping', 'Prior authorization forms'], human: ['Complex multi-diagnosis coding judgment', 'Audit defense', 'Payer dispute resolution'], drivers: ['AI medical coding (Maximus, Optum AI)', 'NLP-driven coding automation', 'Automated prior auth AI'] },
  nur_rn:       { atRisk: ['Clinical documentation', 'Medication schedule calculations', 'Standard protocol lookups'], human: ['Patient physical assessment', 'Emotional support and therapeutic presence', 'Rapid clinical judgment in ambiguous situations'], drivers: ['AI clinical documentation (Nuance DAX)', 'Smart infusion pumps with AI', 'Predictive deterioration AI'] },
  mh_therapist: { atRisk: ['Session note generation', 'Treatment plan templating', 'Outcome measure scoring'], human: ['Therapeutic alliance and empathic presence', 'Crisis risk assessment', 'Trauma-informed clinical judgment'], drivers: ['AI therapy platforms (Woebot — supplemental only)', 'LLM session note automation', 'AI outcome measurement tools'] },
  // Education
  edu_teach:    { atRisk: ['Lesson plan generation', 'Quiz and assessment creation', 'Routine grading of objective answers'], human: ['Classroom relationship and motivation', 'Adapting to individual student needs', 'Social-emotional learning'], drivers: ['AI lesson generators (Khanmigo, MagicSchool AI)', 'LLM curriculum tools', 'AI grading (Gradescope AI)'] },
  edu_higher:   { atRisk: ['Lecture outline generation', 'Standard assessment design', 'Academic writing feedback'], human: ['Original research direction', 'Mentorship and academic career guidance', 'Novel scholarly argument construction'], drivers: ['AI academic tools (ChatGPT, Perplexity)', 'LLM research synthesis', 'AI plagiarism and AI detection (Turnitin AI)'] },
  // Engineering / Manufacturing
  eng_civil:    { atRisk: ['Standard structural calculation verification', 'Drawing review checklists', 'Routine specification writing'], human: ['Site judgment and risk assessment', 'Novel design for unusual site conditions', 'Regulatory negotiation'], drivers: ['AI structural analysis (Autodesk AI, Bentley)', 'LLM specification generation', 'AI drawing review tools'] },
  mfg_quality:  { atRisk: ['Defect pattern detection', 'Inspection report generation', 'Standard SOP documentation'], human: ['Novel defect root cause analysis', 'Supplier quality negotiation', 'Complex process failure investigation'], drivers: ['Computer vision QC (Cognex AI, Landing AI)', 'AI statistical process control', 'Automated defect reporting'] },
  auto_ev:      { atRisk: ['Standard battery simulation runs', 'Routine test data analysis', 'Specification documentation'], human: ['Novel chemistry design decisions', 'Safety validation for novel architectures', 'Regulatory certification strategy'], drivers: ['AI battery simulation (Altair, ANSYS AI)', 'LLM materials research synthesis', 'Digital twin testing platforms'] },
  // Consulting / Strategy
  con_strategy: { atRisk: ['Market research aggregation', 'Standard slide deck drafting', 'Benchmark data compilation'], human: ['CEO-level strategic recommendation', 'Client relationship and trust building', 'Novel problem framing'], drivers: ['AI strategy tools (BCG X, McKinsey Lilli)', 'LLM research synthesis', 'AI presentation generators (Tome, Gamma)'] },
  con_mgmt:     { atRisk: ['Project status report generation', 'Standard methodology templating', 'Meeting summary drafting'], human: ['Client stakeholder management', 'Organizational change navigation', 'Novel problem-solving under ambiguity'], drivers: ['AI consulting tools (Bain AI, Accenture AI)', 'LLM deliverable generation', 'AI meeting tools (Otter, Fireflies)'] },
  // Retail / E-commerce
  ec_catalog:   { atRisk: ['Product description generation', 'Attribute tagging and categorization', 'Bulk image editing'], human: ['Brand voice quality judgment', 'Merchandising strategy for edge cases', 'Supplier negotiation for catalog gaps'], drivers: ['AI product content generation (Akeneo AI, Salsify AI)', 'LLM product description at scale', 'AI catalog classification tools'] },
  ret_floor:    { atRisk: ['Inventory lookup queries', 'Standard product recommendation scripts', 'Routine stock replenishment orders'], human: ['High-empathy customer experience', 'Escalation and complaint resolution', 'Visual merchandising judgment'], drivers: ['Retail AI (Amazon Just Walk Out, Zippin)', 'AI inventory replenishment', 'Conversational retail AI'] },
  // Marketing / SEO / Content
  mkt_seo:      { atRisk: ['Keyword research and clustering', 'Meta tag generation', 'Standard content brief writing'], human: ['Brand authority and link strategy', 'E-E-A-T content editorial judgment', 'Novel content angle ideation'], drivers: ['AI SEO platforms (Surfer SEO AI, Semrush AI)', 'LLM content generation at scale', 'Programmatic SEO automation'] },
  mkt_social_ads: { atRisk: ['Ad copy generation', 'A/B test variant creation', 'Audience segment setup'], human: ['Creative campaign concept ideation', 'Brand safety judgment on AI output', 'Performance narrative for clients'], drivers: ['Meta Advantage+ AI', 'Google Performance Max AI', 'LLM ad copy generation (Jasper, Copy.ai)'] },
  cnt_seo_content: { atRisk: ['SEO article drafting', 'Keyword stuffing optimization', 'Meta description writing'], human: ['Original research and primary source journalism', 'Brand voice differentiation', 'Expert interview synthesis'], drivers: ['LLM content generation (ChatGPT, Claude)', 'AI SEO content tools (Surfer, Frase)', 'Programmatic content at scale'] },
  cnt_blog:     { atRisk: ['Article outline generation', 'First draft writing', 'Social promotion copy'], human: ['Original reporting and expert sourcing', 'Distinctive authorial voice', 'Community engagement'], drivers: ['LLM writing tools (ChatGPT, Claude, Jasper)', 'AI long-form generators', 'Automated content workflows'] },
  // Supply chain / Logistics
  log_scm:      { atRisk: ['Demand forecast report generation', 'Supplier scorecard compilation', 'Standard RFQ templates'], human: ['Supplier relationship negotiation', 'Novel disruption response', 'Strategic sourcing decisions'], drivers: ['AI supply chain platforms (o9, Blue Yonder AI)', 'Predictive analytics AI', 'LLM procurement documentation'] },
  log_warehouse: { atRisk: ['Inventory count reconciliation', 'Standard pick-pack instruction', 'Shipping label generation'], human: ['Physical space optimization judgment', 'Handling novel damage/exception situations', 'Vendor selection for unusual items'], drivers: ['Warehouse robotics (Symbotic, 6 River Systems)', 'AI inventory optimization', 'Automated WMS routing'] },
  // Investment / Finance sub-types
  inv_equity:    { atRisk: ['Equity research report writing', 'Financial model templating', 'Market data aggregation'], human: ['Investment thesis development with qualitative judgment', 'Client relationship management', 'Deal sourcing through personal network'], drivers: ['AI equity research (Morgan Stanley AI, Bloomberg AI)', 'LLM financial analysis', 'Automated report generation'] },
  inv_portfolio: { atRisk: ['Portfolio rebalancing calculations', 'Performance attribution reports', 'Routine risk metrics'], human: ['Client investment strategy conversations', 'Novel portfolio construction under unusual constraints', 'Fee negotiation and retention'], drivers: ['AI portfolio management (Betterment AI, BlackRock Aladdin)', 'LLM client report generation', 'Automated rebalancing tools'] },
  inv_ib:        { atRisk: ['Financial model templates', 'Pitch deck boilerplate', 'Comparable company analysis'], human: ['Client relationship and deal origination', 'Complex negotiation and M&A judgment', 'Novel valuation for unusual assets'], drivers: ['AI deal support (Datasite AI, Kira)', 'LLM financial narrative generation', 'Automated CIM creation'] },
  inv_pe:        { atRisk: ['Portfolio company reporting', 'Due diligence data room review', 'Standard financial model updates'], human: ['Deal thesis and sector thesis', 'Management team assessment', 'Exit strategy negotiation'], drivers: ['AI due diligence (DealCloud AI, Datasite AI)', 'LLM industry research', 'Automated portfolio monitoring'] },
  inv_vc:        { atRisk: ['Startup research summarization', 'Standard term sheet templates', 'Portfolio company update reports'], human: ['Founder relationship and conviction building', 'Novel market thesis development', 'Syndication and co-investor relationships'], drivers: ['AI deal sourcing (Affinity AI, SignalFire)', 'LLM startup memo generation', 'Automated portfolio tracking'] },
  inv_quant:     { atRisk: ['Backtesting scripts', 'Standard factor model runs', 'Data cleaning pipelines'], human: ['Novel alpha signal research', 'Strategy risk judgment under regime change', 'Research agenda direction'], drivers: ['AI quant platforms (Kensho, Sentient Technologies)', 'LLM financial signal generation', 'Automated strategy testing agents'] },
  // Insurance
  ins_underwrite: { atRisk: ['Standard risk scoring from application data', 'Policy comparison and template selection', 'Routine renewal processing'], human: ['Complex commercial risk assessment with site visits', 'Fraud investigation', 'Client advisory on coverage gaps'], drivers: ['AI underwriting platforms (Cytora, Concirrus)', 'Claims automation (Tractable, Shift Technology)', 'Actuarial ML tools'] },
  ins_claims:    { atRisk: ['Claims form processing', 'Standard payout calculation', 'Routine status update communications'], human: ['Complex loss assessment with physical inspection', 'Fraud investigation and disputed claims', 'High-value claim negotiation'], drivers: ['AI claims processing (Tractable, Hover)', 'LLM claims communication', 'Computer vision damage assessment'] },
  ins_actuar:    { atRisk: ['Standard pricing model runs', 'Routine loss reserve calculations', 'Regulatory report generation'], human: ['Novel risk factor research', 'Board-level reserve judgment in volatile periods', 'Model design for emerging risk categories'], drivers: ['AI actuarial tools (Milliman AI, Willis Towers Watson AI)', 'ML risk pricing platforms', 'Automated reserve modeling'] },
  ins_broker:    { atRisk: ['Policy comparison and quoting', 'Standard coverage documentation', 'Renewal reminder workflows'], human: ['Complex client coverage strategy', 'Claims advocacy under dispute', 'Relationship-based book building'], drivers: ['AI broker platforms (Novidea, Applied AI)', 'Instant quoting AI', 'LLM policy comparison tools'] },
  ins_risk_mgr:  { atRisk: ['Risk register updates', 'Standard risk scoring', 'Compliance checklist tracking'], human: ['Enterprise risk strategy for novel exposures', 'Board risk communication', 'Vendor risk negotiation'], drivers: ['AI risk management platforms (Riskonnect AI, LogicGate)', 'LLM risk narrative generation', 'Automated risk monitoring'] },
  // Media / Journalism
  med_journalist: { atRisk: ['News aggregation and summarization', 'Basic fact-checking query lookups', 'SEO article drafting'], human: ['Investigative reporting and source cultivation', 'Editorial judgment and narrative framing', 'Original angle development on complex stories'], drivers: ['AI news writing (AP Automated Insights, Axios AI)', 'LLM content generation', 'AI video news generation (Synthesia)'] },
  med_editor:    { atRisk: ['Proofreading and copy editing', 'SEO optimization', 'Standard content brief writing'], human: ['Editorial vision and tone direction', 'Writer mentorship and feedback', 'Brand voice quality judgment'], drivers: ['AI editing tools (Grammarly AI, Hemingway AI)', 'LLM draft generation', 'Automated style enforcement'] },
  med_reporter:  { atRisk: ['Press release rewriting', 'Standard interview transcription', 'Basic data journalism charts'], human: ['Source relationship cultivation', 'On-the-ground physical reporting', 'Complex story investigation'], drivers: ['LLM article drafting', 'AI transcription (Otter, Whisper)', 'Automated newswire summarization'] },
  med_podcast:   { atRisk: ['Episode transcript editing', 'Show notes generation', 'Clip highlight selection'], human: ['Interviewer relationship and chemistry', 'Audience trust and community building', 'Original angle and guest selection'], drivers: ['AI podcast tools (Descript AI, Riverside AI)', 'LLM show notes generation', 'AI clip generation (Opus Clip)'] },
  med_broadcast: { atRisk: ['Script writing from wire reports', 'Standard weather/traffic summaries', 'Video caption generation'], human: ['Live on-camera judgment and presence', 'Audience relationship and trust', 'Breaking news improvisation'], drivers: ['AI news writing and TelePrompTer AI', 'Deepfake-free AI presenters (Synthesia)', 'Automated subtitle generation'] },
  // Animation / Creative Visual
  anim_2d:       { atRisk: ['In-between frame generation', 'Background color fills', 'Standard lip-sync animation'], human: ['Character performance direction', 'Creative storytelling decisions', 'Style development and artistic identity'], drivers: ['AI animation (Runway Gen-3, Pika, Kling)', 'AI in-betweening (CACANi AI)', 'LLM storyboard generation'] },
  anim_3d:       { atRisk: ['Rigging setup for standard characters', 'Texture generation from reference', 'Routine render queue management'], human: ['Character performance nuance', 'Art direction for visual consistency', 'Complex dynamic simulation decisions'], drivers: ['AI rigging tools (AccuRIG, Cascadeur)', 'Generative texture tools (Adobe Firefly, Stable Diffusion)', 'AI render optimization'] },
  anim_vfx:      { atRisk: ['Roto and matte extraction', 'Standard color grading passes', 'Basic compositing layers'], human: ['Creative supervisor direction', 'Novel effect design for unique sequences', 'Client vision interpretation'], drivers: ['AI roto (Runway, Topaz Labs)', 'AI VFX tools (After Effects AI, Nuke ML)', 'Generative background replacement'] },
  anim_motion:   { atRisk: ['Repetitive motion graphics templates', 'Data visualization animation', 'Icon and asset animation'], human: ['Brand motion identity design', 'Client creative brief interpretation', 'Novel kinetic concept ideation'], drivers: ['AI motion tools (Jitter AI, Rive AI)', 'LLM-to-animation tools', 'Generative motion graphics (Adobe Sensei)'] },
  // Photography
  photo_portrait: { atRisk: ['Background removal and replacement', 'Skin retouching and batch editing', 'Standard color grading'], human: ['Creative direction and shot composition', 'Client relationship and pose direction', 'Artistic vision and style development'], drivers: ['Adobe Firefly generative AI', 'AI portrait retouching (Luminar AI)', 'AI background replacement'] },
  photo_product: { atRisk: ['Background replacement for product shots', 'Batch color correction', 'Standard image variant creation'], human: ['Creative direction for brand identity', 'Prop and scene styling judgment', 'Client brief interpretation'], drivers: ['AI product photography (Photoroom, Booth AI)', 'Midjourney product image generation', 'AI background replacement at scale'] },
  photo_event:   { atRisk: ['Bulk photo culling and selection', 'Standard gallery export and delivery', 'Basic retouching workflows'], human: ['Physical presence and relationship at events', 'Candid moment anticipation', 'Client emotional storytelling'], drivers: ['AI photo culling (Aftershoot, Narrative Select)', 'AI editing batch tools', 'LLM album description generation'] },
  photo_edit:    { atRisk: ['Batch retouching tasks', 'Background removal', 'Color grading to preset'], human: ['Creative direction for complex composites', 'Brand-specific quality judgment', 'Novel effect design'], drivers: ['Adobe Firefly generative fill', 'AI editing (Luminar AI, Topaz)', 'Automated batch editing tools'] },
  // Travel / Hospitality
  trav_agent:    { atRisk: ['Standard itinerary planning', 'Flight and hotel booking', 'Loyalty program queries'], human: ['Complex multi-destination planning for special needs', 'Crisis management for disrupted travelers', 'High-touch concierge for premium clients'], drivers: ['AI travel planning (Google Trips AI, Layla AI)', 'Conversational booking agents', 'Automated itinerary builders'] },
  trav_hotel_mgr:{ atRisk: ['Revenue management standard pricing', 'Routine guest communication templates', 'Staff scheduling templates'], human: ['Guest experience recovery during complaints', 'Relationship building with repeat guests', 'Novel situation management'], drivers: ['AI hotel revenue management (Duetto, IDeaS)', 'Automated guest messaging (Revinate AI)', 'AI housekeeping scheduling'] },
  trav_guide:    { atRisk: ['Standard tour script delivery', 'Tourist FAQ responses', 'Basic itinerary logistics'], human: ['Authentic local knowledge and storytelling', 'Adapting to group dynamics and interests', 'Language and cultural interpretation'], drivers: ['AI travel guides (Google Lens tours)', 'AR tour apps (Bloomberg AR)', 'AI language translation at scale'] },
  trav_airline_ops: { atRisk: ['Standard check-in processing', 'Routine disruption notification messages', 'Baggage claim coordination'], human: ['Complex disruption management and rebooking', 'High-stress passenger de-escalation', 'Safety-critical on-ground decisions'], drivers: ['AI airline operations (Amadeus AI, SITA AI)', 'Automated check-in kiosks', 'AI disruption management tools'] },
  trav_event_planner: { atRisk: ['Venue research and shortlisting', 'Standard vendor email drafts', 'Event timeline templates'], human: ['Client vision interpretation and creative direction', 'Vendor relationship and negotiation', 'Real-time problem solving on event day'], drivers: ['AI event planning (Cvent AI, Splash AI)', 'LLM venue sourcing', 'Automated attendee communication'] },
  trav_concierge: { atRisk: ['Standard restaurant and activity recommendations', 'Routine booking confirmations', 'FAQ response handling'], human: ['Bespoke high-touch service for VIP guests', 'Personal relationship and trust building', 'Novel unusual request fulfillment'], drivers: ['AI concierge platforms (Angie Hospitality AI)', 'LLM recommendation engines', 'Conversational AI for guest services'] },
  // Aerospace
  aero_eng:      { atRisk: ['Simulation setup and routine parameter sweeps', 'Documentation and compliance report writing', 'Standard CAD model updates'], human: ['Novel failure mode investigation', 'Safety-critical design judgment', 'Cross-discipline system integration'], drivers: ['AI-assisted design (Airbus AI, Boeing Design AI)', 'Digital twin simulation (Siemens AI)', 'Generative design tools (Autodesk Generative)'] },
  aero_maint:    { atRisk: ['Standard inspection checklist execution', 'Routine maintenance log documentation', 'Parts inventory lookup'], human: ['Anomaly investigation requiring physical judgment', 'Airworthiness safety sign-off', 'Novel fault diagnosis'], drivers: ['Predictive maintenance AI (GE Aviation AI, Safran AI)', 'Computer vision inspection tools', 'Digital maintenance records AI'] },
  aero_sys:      { atRisk: ['Requirements document templating', 'Standard systems testing protocols', 'Routine integration verification'], human: ['Novel system architecture trade-off decisions', 'Safety validation for new designs', 'Stakeholder requirements negotiation'], drivers: ['AI systems engineering tools (IBM Engineering AI)', 'LLM requirements generation', 'Automated verification and validation'] },
  aero_avionics: { atRisk: ['Standard software test case execution', 'Routine bug documentation', 'Configuration management records'], human: ['Safety-critical software design decisions', 'Novel avionics architecture', 'DO-178C certification judgment'], drivers: ['AI avionics test tools', 'LLM code generation for embedded systems', 'AI certification support tools'] },
  aero_quality:  { atRisk: ['Standard AS9100 checklist audits', 'Routine non-conformance reports', 'Quality data trending reports'], human: ['Novel root cause analysis for complex defects', 'Supplier quality partnership development', 'Regulatory negotiation'], drivers: ['AI quality inspection (Cognex AI in aerospace)', 'Computer vision defect detection', 'AI audit documentation tools'] },
  // Agriculture
  agri_precision: { atRisk: ['Routine crop monitoring reports from sensor data', 'Standard fertilizer application scheduling', 'Yield projection reports'], human: ['Anomaly diagnosis from field observation', 'Adaptive decisions under unpredictable weather', 'Farmer relationship and advisory trust'], drivers: ['Precision ag AI (John Deere See & Spray, Trimble)', 'Drone crop analysis (DJI Agri AI)', 'AI crop disease detection (Plantix)'] },
  agri_agronomist: { atRisk: ['Standard soil test interpretation reports', 'Routine crop variety selection recommendations', 'Pest identification from images'], human: ['Complex integrated crop management advice', 'Farmer advisory relationship', 'Novel problem diagnosis in the field'], drivers: ['AI agronomy tools (Granular, Climate Corp)', 'LLM agronomic report generation', 'AI pest and disease prediction'] },
  agri_crop_mgr: { atRisk: ['Routine irrigation scheduling', 'Standard harvest logistics planning', 'Yield forecast updates'], human: ['Field judgment under variable conditions', 'Equipment and crew management decisions', 'Supplier relationship negotiation'], drivers: ['AI farm management platforms (Farmers Business Network AI)', 'Autonomous tractors (John Deere AutoPath)', 'AI harvest planning tools'] },
  // Gaming
  game_dev:      { atRisk: ['Boilerplate game code generation', 'Routine bug fix documentation', 'Asset integration scripting'], human: ['Creative vision for gameplay systems', 'Player experience intuition and playtesting', 'Cross-discipline creative direction'], drivers: ['AI game coding (Unity Muse, Unreal Copilot)', 'LLM game scripting', 'AI NPC behavior (Inworld AI)'] },
  game_design:   { atRisk: ['Level layout prototyping', 'Standard design document templating', 'Procedural content parameter tuning'], human: ['Player psychology and fun judgment', 'Narrative and emotional arc design', 'Balancing judgment for complex systems'], drivers: ['Procedural generation AI', 'LLM design document drafting', 'AI playtesting (Modl.ai)'] },
  game_art:      { atRisk: ['Asset resizing and variant creation', 'Texture map generation', 'Concept art rough generation'], human: ['Art direction and visual style leadership', 'Character design with cultural sensitivity', 'Brand-consistent quality judgment'], drivers: ['AI game art (Midjourney, Stable Diffusion)', 'Generative texture tools (Adobe Firefly)', 'AI concept art generation'] },
  game_writer:   { atRisk: ['NPC filler dialogue generation', 'Quest description templating', 'Lore document drafting'], human: ['Player narrative emotional arc', 'Character voice and motivation depth', 'Original world-building and mythology'], drivers: ['AI narrative tools (Inkle AI, LLM dialogue)', 'Inworld AI NPC generation', 'LLM lore and codex generation'] },
  game_qa:       { atRisk: ['Regression test script execution', 'Bug report template filling', 'Standard platform certification testing'], human: ['Exploratory edge-case discovery', 'Player experience empathy testing', 'Novel reproduction for complex bugs'], drivers: ['AI game testing (Modl.ai, GameDriver)', 'Automated regression suites', 'AI bug prediction tools'] },
  // Blockchain
  bc_dev:        { atRisk: ['Smart contract template generation', 'Boilerplate DApp frontend code', 'Routine on-chain data query scripts'], human: ['Protocol security design and edge-case review', 'Novel consensus mechanism architecture', 'Cross-chain integration judgment'], drivers: ['AI smart contract tools (OpenZeppelin AI, Slither)', 'LLM Solidity generation', 'AI code audit tools'] },
  bc_analyst:    { atRisk: ['On-chain transaction analysis reports', 'Standard token metrics dashboards', 'Routine wallet clustering analysis'], human: ['Novel threat and fraud pattern investigation', 'Market intelligence interpretation', 'Regulatory reporting judgment'], drivers: ['AI blockchain analytics (Chainalysis AI, Nansen AI)', 'LLM on-chain insight generation', 'Automated token analysis platforms'] },
  bc_legal:      { atRisk: ['Standard regulatory compliance templates', 'Token classification checklist reviews', 'Routine legal research lookups'], human: ['Novel regulatory interpretation for new protocols', 'Regulatory negotiation and advocacy', 'Cross-border legal strategy'], drivers: ['AI legal tools (Harvey AI for crypto)', 'LLM regulatory memo generation', 'AI compliance monitoring (ComplyAdvantage)'] },
  bc_strategy:   { atRisk: ['Whitepaper first draft generation', 'Standard ecosystem mapping research', 'Tokenomics model templates'], human: ['Ecosystem partnership strategy', 'Novel protocol positioning and differentiation', 'Community trust building and governance'], drivers: ['LLM whitepaper drafting', 'AI tokenomics modeling', 'LLM market research synthesis'] },
};

// Relabels taskDetails from an aliased timeline to be role-specific
function applyRoleTaskOverrides(tasks: TaskDetail[], roleKey: string, automationDrivers: string[]): { tasks: TaskDetail[]; drivers: typeof automationDrivers } {
  const override = ROLE_TASK_OVERRIDES[roleKey];
  if (!override) return { tasks, drivers: automationDrivers };
  // Replace name of top at-risk tasks with role-specific ones (by index, preserve risk values)
  const atRiskTasks = tasks.filter(t => ['core', 'secondary', 'administrative'].includes(t.taskType));
  const humanTasks  = tasks.filter(t => ['strategic', 'human-interaction', 'decision-making'].includes(t.taskType));
  const renamedAtRisk = atRiskTasks.map((t, i) => ({ ...t, name: override.atRisk[i] ?? t.name }));
  const renamedHuman  = humanTasks.map((t, i) => ({ ...t, name: override.human[i] ?? t.name }));
  const other = tasks.filter(t => !['core','secondary','administrative','strategic','human-interaction','decision-making'].includes(t.taskType));
  return { tasks: [...renamedAtRisk, ...renamedHuman, ...other], drivers: override.drivers };
}

export const TaskExposureMatrix: React.FC<Props> = ({
  timeline, d1Score, techStack, countryKey = 'usa', experience = '5-10', d7Score = 55,
}) => {
  const [activeView, setActiveView] = useState<GroupView>('vulnerable');

  const isSeeded = timeline.roleKey !== 'unknown'
    && (timeline.topTasksAtRisk.length > 0 || timeline.humanEssentialTasks.length > 0);

  const baseTasks: TaskDetail[] = timeline.taskDetails?.length
    ? timeline.taskDetails
    : buildHeuristicTasks(timeline, d1Score);

  // Apply role-specific task label overrides for catalog keys aliased to a broader entry
  // (e.g. sw_frontend → swe tasks get relabelled to frontend-specific names)
  const { tasks: overriddenTasks, drivers: overriddenDrivers } =
    applyRoleTaskOverrides(baseTasks, timeline.roleKey, timeline.automationDrivers);

  const tasks = applyCountryAndExpModifiers(overriddenTasks, countryKey, experience);
  const displayed = applyGroupView(tasks, activeView);

  // Build driver narratives: prefer seeded driverNarratives, then heuristic from
  // overridden driver names so the "why is this role changing" text is role-specific
  const driverNarratives: DriverNarrative[] = timeline.driverNarratives?.length
    ? timeline.driverNarratives
    : buildHeuristicDriverNarratives({ ...timeline, automationDrivers: overriddenDrivers });

  const countryProfile = COUNTRY_RISK_PROFILES[countryKey];
  const lag = getAdoptionLag(countryKey);
  const lagLabel = lag > 0.25 ? `~${Math.round(lag * 30)} months behind US adoption pace` : null;

  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const highCount = tasks.filter(t => t.risk2028 >= 65).length;
  const protCount = tasks.filter(t => t.humanAdvantageScore >= 70).length;
  const isHeuristic = !timeline.taskDetails?.length;

  // 4 spotlight tasks shown by default — each a distinct category (no overlap)
  const spotlightTasks = (() => {
    const seen = new Set<string>();
    const pick = (cand: TaskDetail | undefined, badge: string): (TaskDetail & { spotlightBadge: string }) | null => {
      if (!cand || seen.has(cand.name)) return null;
      seen.add(cand.name);
      return { ...cand, spotlightBadge: badge };
    };
    const mostVulnerable  = pick([...tasks].sort((a, b) => b.risk2026 - a.risk2026)[0], 'MOST VULNERABLE');
    const mostDefensible  = pick([...tasks].sort((a, b) => b.humanAdvantageScore - a.humanAdvantageScore)[0], 'MOST DEFENSIBLE');
    const fastestChanging = pick(
      [...tasks].filter(t => t.aiCapabilityTrend === 'Rapid').sort((a, b) => (b.risk2030 - b.risk2026) - (a.risk2030 - a.risk2026))[0]
      ?? [...tasks].sort((a, b) => (b.risk2030 - b.risk2026) - (a.risk2030 - a.risk2026))[0],
      'FASTEST CHANGING',
    );
    const humanTypes = ['strategic', 'decision-making', 'human-interaction'] as Array<TaskDetail['taskType']>;
    const highestHumanValue = pick(
      [...tasks].filter(t => humanTypes.includes(t.taskType)).sort((a, b) => b.humanAdvantageScore - a.humanAdvantageScore)[0]
      ?? [...tasks].sort((a, b) => b.humanAdvantageScore - a.humanAdvantageScore).find(t => !seen.has(t.name)),
      'HIGHEST HUMAN VALUE',
    );
    return [mostVulnerable, mostDefensible, fastestChanging, highestHumanValue].filter(Boolean) as (TaskDetail & { spotlightBadge: string })[];
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>TASK EXPOSURE ANALYSIS</h3>
        {isHeuristic && (
          <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
            HEURISTIC ESTIMATE
          </span>
        )}
        {lagLabel && (
          <span style={{ fontSize: '0.6rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', background: 'rgba(251,191,36,0.08)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.2)' }}>
            {lagLabel}
          </span>
        )}
      </div>

      {/* Feature explanation banner */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-start',
        padding: '12px 14px', borderRadius: '8px', marginBottom: '14px',
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>🔍</span>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', fontWeight: 700, lineHeight: 1.4 }}>
            What is this showing you?
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Every task in your role is scored for how much AI can do it by 2026, 2028, and 2030 — and how much human judgment it still requires. Tasks in red are where AI is moving fastest. Tasks in green are where you're hardest to replace. Use the filter buttons below to see your most vulnerable tasks, your safest ones, or the ones changing fastest.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '0.68rem', color: 'rgba(99,102,241,0.8)', fontWeight: 600 }}>
            Tip: Start with "Most Vulnerable" to see where to focus, then "Highest Human Value" to see what to protect.
          </p>
        </div>
      </div>

      {/* Summary badges — task count chip + category breakdown */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.68rem', color: 'var(--text-2)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          {tasks.length} tasks analyzed
        </div>
        <div style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '0.68rem', color: 'var(--red)', fontWeight: 700 }}>
          {highCount} at risk
        </div>
        <div style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.68rem', color: 'var(--emerald)', fontWeight: 700 }}>
          {protCount} protected
        </div>
        <div style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', fontSize: '0.68rem', color: 'var(--amber)', fontWeight: 700 }}>
          {tasks.filter(t => t.aiCapabilityTrend === 'Rapid').length} fast-changing
        </div>
      </div>

      {/* Group view tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
        {GROUP_VIEWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            style={{
              padding: '5px 11px', borderRadius: '5px', border: 'none', cursor: 'pointer',
              background: activeView === key ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: activeView === key ? 'var(--text)' : 'var(--text-3)',
              fontWeight: activeView === key ? 700 : 500,
              fontSize: '0.68rem', transition: 'all 0.15s ease',
              outline: activeView === key ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 80px', gap: '6px', alignItems: 'center', marginBottom: '8px', padding: '0 14px' }}>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase' }}>Task</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>2026</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>2028</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>2030</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Human</span>
        <span style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Trend</span>
      </div>

      {/* Task rows — spotlight (4) by default; expand to see all */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {(showAllTasks ? displayed : spotlightTasks).map((task) => {
          const spotlightBadge = (task as TaskDetail & { spotlightBadge?: string }).spotlightBadge;
          const typeColor  = TASK_TYPE_COLORS[task.taskType] ?? 'var(--text-3)';
          const trendColor = TREND_COLORS[task.aiCapabilityTrend] ?? 'var(--text-3)';
          const confColor  = CONFIDENCE_COLORS[task.confidence] ?? 'var(--text-3)';
          const isExpanded = expandedTask === task.name;
          const whyAI    = WHY_AI[task.taskType]    ?? 'High training data availability for this type of work.';
          const whyHuman = WHY_HUMAN[task.taskType] ?? 'Contextual judgment and accountability remain human.';
          const impactColor = task.risk2028 >= 65 ? 'var(--red)' : task.risk2028 >= 45 ? 'var(--amber)' : 'var(--emerald)';
          const impactLabel = task.risk2028 >= 65 ? 'HIGH' : task.risk2028 >= 45 ? 'MODERATE' : 'LOW';
          return (
            <div key={task.name} style={{
              borderRadius: '8px',
              background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
              overflow: 'hidden',
            }}>
              {/* Clickable header row */}
              <button
                type="button"
                onClick={() => setExpandedTask(isExpanded ? null : task.name)}
                aria-expanded={isExpanded ? 'true' : 'false'}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '10px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginRight: '2px' }}>{isExpanded ? '▼' : '▶'}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: '120px' }}>{task.name}</span>
                  {spotlightBadge && (
                    <span style={{ padding: '1px 6px', borderRadius: '3px', background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.28)', fontSize: '0.5rem', fontWeight: 900, color: 'rgba(99,102,241,0.9)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                      {spotlightBadge}
                    </span>
                  )}
                  <Chip label={task.taskType.toUpperCase().replace('-', ' ')} color={typeColor} small />
                  <Chip label={task.displacementTimeline} color={task.displacementTimeline === 'Immediate' ? 'var(--red)' : task.displacementTimeline === '2–3 years' ? 'var(--amber)' : task.displacementTimeline === '4–6 years' ? 'var(--cyan)' : 'var(--emerald)'} small />
                  <Chip label={task.confidence} color={confColor} small />
                </div>
                {/* Grid: 4 bars + trend chip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>2026 Risk</div>
                    <RiskBar value={task.risk2026} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>2028 Risk</div>
                    <RiskBar value={task.risk2028} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>2030 Risk</div>
                    <RiskBar value={task.risk2030} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.52rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>Human Adv.</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${task.humanAdvantageScore}%`, background: 'var(--emerald)', borderRadius: '3px', transition: 'width 0.7s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>{task.humanAdvantageScore}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>AI Trend</div>
                    <Chip label={task.aiCapabilityTrend.toUpperCase()} color={trendColor} small />
                  </div>
                </div>
              </button>

              {/* Expandable WHY block */}
              {isExpanded && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ fontSize: '0.56rem', fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '5px' }}>WHY AI CAN DO THIS</div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.55, margin: 0 }}>{whyAI}</p>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <div style={{ fontSize: '0.56rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '5px' }}>WHY HUMANS STILL MATTER</div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.55, margin: 0 }}>{whyHuman}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>CONFIDENCE</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)' }}>
                        {task.confidence
                          ? task.confidence
                          : task.risk2026 >= 75 ? 'High' : task.risk2026 >= 50 ? 'Medium' : 'Low'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>EXPECTED CHANGE WINDOW</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)' }}>{task.displacementTimeline}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.56rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '2px' }}>CAREER IMPACT</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: impactColor }}>{impactLabel}</div>
                    </div>
                  </div>
                  {/* Importance dimensions row */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {(() => {
                      const humanAdv = task.humanAdvantageScore;
                      const humanAdvLabel = humanAdv >= 70 ? `Strong (${humanAdv}/100)` : humanAdv >= 40 ? `Moderate (${humanAdv}/100)` : `Weak (${humanAdv}/100)`;
                      const humanAdvColor = humanAdv >= 70 ? 'var(--emerald)' : humanAdv >= 40 ? 'var(--amber)' : 'var(--red)';
                      const bizValueLabel = ['strategic','decision-making'].includes(task.taskType) ? 'High' : ['human-interaction','creative'].includes(task.taskType) ? 'Medium-High' : 'Medium';
                      const bizValueColor = bizValueLabel === 'High' ? 'var(--emerald)' : bizValueLabel === 'Medium-High' ? 'var(--cyan)' : 'var(--text-3)';
                      const cpv = humanAdv + (['strategic','decision-making','human-interaction','creative'].includes(task.taskType) ? 10 : 0);
                      const cpvLabel = cpv >= 75 ? 'High — build on this' : cpv >= 45 ? 'Moderate' : 'Low — seek to reduce';
                      const cpvColor = cpv >= 75 ? 'var(--emerald)' : cpv >= 45 ? 'var(--amber)' : 'var(--red)';
                      return (
                        <>
                          <div style={{ flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '2px' }}>YOUR HUMAN ADVANTAGE</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: humanAdvColor }}>{humanAdvLabel}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '2px' }}>BUSINESS VALUE</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: bizValueColor }}>{bizValueLabel}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: '140px' }}>
                            <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', marginBottom: '2px' }}>CAREER PROTECTION VALUE</div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: cpvColor }}>{cpvLabel}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand / collapse all tasks */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setShowAllTasks(prev => !prev)}
          style={{
            padding: '7px 18px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
            fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer',
          }}
        >
          {showAllTasks ? '▲ Show Spotlight Tasks' : `▼ View Full Task Library (${tasks.length} tasks)`}
        </button>
      </div>

      {/* Automation Drivers — WHY section */}
      <div style={{ padding: '16px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
        <div className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '14px' }}>AUTOMATION DRIVERS — WHY THIS ROLE IS CHANGING</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {driverNarratives.map((d) => {
            const currColor = IMPACT_COLORS[d.currentImpact] ?? 'var(--text-3)';
            const futColor  = IMPACT_COLORS[d.futureImpact]  ?? 'var(--text-3)';
            return (
              <div key={d.driver} style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.06)`, borderLeft: `2px solid ${futColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{d.driver}</span>
                  <Chip label={`NOW: ${d.currentImpact.toUpperCase()}`} color={currColor} small />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>→</span>
                  <Chip label={`FUTURE: ${d.futureImpact.toUpperCase()}`} color={futColor} small />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{d.reason}</p>
              </div>
            );
          })}
        </div>

        {/* Country regulatory context */}
        {countryProfile?.note && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)',
            borderLeft: '2px solid var(--amber)',
          }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '4px' }}>
              {(countryProfile.label || countryKey.toUpperCase())} MARKET CONTEXT
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.55, margin: 0 }}>{countryProfile.note}</p>
          </div>
        )}

        {techStack && (
          <div style={{ marginTop: '10px', fontSize: '0.68rem', color: 'var(--text-3)' }}>
            Your stack: <span style={{ color: 'var(--cyan)' }}>{techStack}</span>
          </div>
        )}
      </div>
    </div>
  );
};
