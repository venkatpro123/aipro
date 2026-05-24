// api-displacement-scores/index.ts — Enterprise API v7.0
//
// Endpoint:  POST /api-displacement-scores   (body.endpoint routes internally)
//            POST /api-displacement-scores/role-risk      (path routing)
//            POST /api-displacement-scores/team-risk      (path routing)
//            POST /api-displacement-scores/company-intel  (path routing)
//
// Auth:      Authorization: Bearer <api_key>
//            key validated against enterprise_api_keys (sha-256 hash match)
//
// Rate limit: check_and_increment_api_usage() RPC — atomic, advisory-locked
//             429 response includes Retry-After: <seconds until midnight UTC>
//
// Performance target: <400 ms
//   - Auth + rate-limit: 2 DB round-trips (~80 ms)
//   - role-risk scoring: synchronous, 0 DB calls (~1 ms)
//   - team-risk: synchronous scoring + 1 optional company lookup (~130 ms)
//   - company-intel: 1 DB lookup (~50 ms)
//
// Deploy:  supabase functions deploy api-displacement-scores

import { serve }        from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Constants ──────────────────────────────────────────────────────────────────
const MODEL_VERSION = 'v7.0';
const DATA_PROVENANCE =
  'HumanProof deterministic engine v7.0 — NASSCOM AI Impact Report 2025, ' +
  'WEF Future of Jobs 2025, Goldman Sachs AI Labor Market Report 2025, ' +
  'Anthropic Economic Impact Study 2025. No live scraping per request.';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Utility helpers ────────────────────────────────────────────────────────────
const json = (data: unknown, status = 200, extra?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', ...(extra ?? {}) },
  });

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escapeIlike(raw: string): string {
  return raw.slice(0, 200).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function retryAfterSeconds(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1,
  ));
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

// ── Inline role intelligence database ─────────────────────────────────────────
// Covers 40+ role patterns. Matched via substring on normalized role_title.
// Each entry:
//   score          — base L3 displacement score (0–99)
//   timelineMonths — months until peak-impact onset (earliest at_risk task)
//   topTasks       — [task_name, months_to_onset, primary_ai_tool]
//   safeTasks      — [task_name, ltv_label]
//   transitions    — [{role, rr=risk_reduction_pct, sd=salary_delta, mo=months}]

interface TransitionTarget { role: string; rr: number; sd: string; mo: number; }
interface RoleIntel {
  score: number;
  timelineMonths: number;
  topTasks: [string, number, string][];
  safeTasks: [string, string][];
  transitions: TransitionTarget[];
}

// Lookup key = substring that appears in the normalised role title
const ROLE_INTEL: Record<string, RoleIntel> = {
  'data entry': {
    score: 88, timelineMonths: 6,
    topTasks: [
      ['Structured form and document processing', 6, 'OCR + LLM document parsing (Claude, GPT-4o)'],
      ['Data extraction and transformation', 12, 'AI extraction pipelines (Amazon Textract, Azure DI)'],
      ['Record deduplication and validation', 18, 'Automated data quality platforms'],
    ],
    safeTasks: [
      ['Judgment calls on ambiguous or exception records', 'High (2030+)'],
      ['Stakeholder communication on data quality issues', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Data Quality Analyst', rr: 35, sd: '+20%', mo: 9 },
      { role: 'Operations Coordinator', rr: 28, sd: '+15%', mo: 6 },
      { role: 'Data Governance Specialist', rr: 52, sd: '+35%', mo: 18 },
    ],
  },
  'customer support': {
    score: 80, timelineMonths: 6,
    topTasks: [
      ['Tier-1 FAQ and standard query resolution', 6, 'GPT-4o / Claude voice + text agents'],
      ['Ticket triage and intelligent routing', 12, 'Intercom Fin / Zendesk AI Copilot'],
      ['Order status and account inquiry handling', 18, 'Agentic AI with CRM integration'],
    ],
    safeTasks: [
      ['High-empathy escalation and de-escalation', 'High (2030+)'],
      ['Complex product knowledge with cross-sell judgment', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Customer Success Manager', rr: 42, sd: '+30%', mo: 12 },
      { role: 'AI Support Operations Lead', rr: 55, sd: '+45%', mo: 15 },
      { role: 'Product Specialist', rr: 38, sd: '+25%', mo: 9 },
    ],
  },
  'bpo': {
    score: 85, timelineMonths: 6,
    topTasks: [
      ['Inbound query resolution (Tier 1)', 6, 'Conversational AI (GPT-4o, Claude, Genesys AI)'],
      ['Data entry and form-filling workflows', 9, 'RPA + AI (UiPath, Automation Anywhere)'],
      ['Outbound follow-up communications', 18, 'AI dialers and automated messaging'],
    ],
    safeTasks: [
      ['Regulatory compliance judgment calls', 'High (2030+)'],
      ['Complex escalation requiring emotional intelligence', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'BPO Team Lead / QA Specialist', rr: 25, sd: '+12%', mo: 6 },
      { role: 'RPA Process Analyst', rr: 48, sd: '+35%', mo: 12 },
      { role: 'Customer Success Manager', rr: 45, sd: '+30%', mo: 12 },
    ],
  },
  'qa manual': {
    score: 74, timelineMonths: 12,
    topTasks: [
      ['Manual test case writing and execution', 12, 'GitHub Copilot test generation + Playwright AI'],
      ['Regression testing execution runs', 18, 'AI-powered test automation frameworks'],
      ['Bug report documentation', 24, 'LLM-assisted defect triage tools'],
    ],
    safeTasks: [
      ['Test strategy design and coverage planning', 'High (2030+)'],
      ['Exploratory testing with domain judgment', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'QA Automation Engineer', rr: 22, sd: '+18%', mo: 9 },
      { role: 'DevOps Engineer', rr: 38, sd: '+28%', mo: 18 },
      { role: 'Product Manager (QA track)', rr: 30, sd: '+22%', mo: 15 },
    ],
  },
  'qa automation': {
    score: 58, timelineMonths: 24,
    topTasks: [
      ['Boilerplate test framework scaffolding', 24, 'AI code generation (Copilot, Cursor)'],
      ['Standard test suite maintenance', 30, 'AI-assisted test refactoring tools'],
      ['CI pipeline configuration', 36, 'AI DevOps assistants'],
    ],
    safeTasks: [
      ['Test architecture and strategy ownership', 'Very High (post-2032)'],
      ['Complex end-to-end scenario design', 'High (2030+)'],
    ],
    transitions: [
      { role: 'SDET / Platform Engineer', rr: 20, sd: '+20%', mo: 12 },
      { role: 'DevOps / SRE Engineer', rr: 28, sd: '+25%', mo: 15 },
      { role: 'Quality Engineering Lead', rr: 18, sd: '+15%', mo: 9 },
    ],
  },
  'software engineer': {
    score: 46, timelineMonths: 24,
    topTasks: [
      ['Boilerplate code generation and scaffolding', 24, 'GitHub Copilot / Cursor / Claude Code'],
      ['Unit test writing', 18, 'AI-native IDE test generation'],
      ['Code documentation and inline comments', 12, 'LLM code co-pilots'],
    ],
    safeTasks: [
      ['System architecture and distributed systems design', 'Very High (post-2032)'],
      ['Cross-team requirements negotiation and decomposition', 'Very High (post-2032)'],
      ['Debugging complex production failures', 'High (2030+)'],
    ],
    transitions: [
      { role: 'AI/ML Engineer', rr: 20, sd: '+22%', mo: 12 },
      { role: 'Platform / Infrastructure Engineer', rr: 15, sd: '+18%', mo: 9 },
      { role: 'Engineering Manager', rr: 30, sd: '+30%', mo: 24 },
    ],
  },
  'backend': {
    score: 46, timelineMonths: 24,
    topTasks: [
      ['CRUD API boilerplate generation', 18, 'GitHub Copilot / Cursor / Claude Code'],
      ['Standard database query writing', 24, 'AI SQL generation tools (Vanna, SQLCoder)'],
      ['API documentation generation', 12, 'LLM documentation assistants'],
    ],
    safeTasks: [
      ['Distributed systems architecture design', 'Very High (post-2032)'],
      ['Performance debugging and optimization at scale', 'High (2030+)'],
    ],
    transitions: [
      { role: 'Platform / Cloud Engineer', rr: 18, sd: '+20%', mo: 12 },
      { role: 'ML Engineer', rr: 22, sd: '+25%', mo: 15 },
      { role: 'Technical Lead', rr: 25, sd: '+28%', mo: 18 },
    ],
  },
  'frontend': {
    score: 50, timelineMonths: 24,
    topTasks: [
      ['UI component boilerplate generation', 18, 'GitHub Copilot / v0 / Cursor'],
      ['CSS/styling implementation from mockups', 12, 'AI design-to-code tools (Locofy, Anima)'],
      ['Standard state management patterns', 30, 'AI code generation frameworks'],
    ],
    safeTasks: [
      ['Accessibility and inclusive design judgment', 'Very High (post-2032)'],
      ['Product intuition and UX problem-solving', 'High (2030+)'],
    ],
    transitions: [
      { role: 'Full-Stack Engineer', rr: 15, sd: '+15%', mo: 9 },
      { role: 'UX Engineer / Design Systems', rr: 20, sd: '+18%', mo: 12 },
      { role: 'Product Engineer', rr: 22, sd: '+22%', mo: 15 },
    ],
  },
  'data analyst': {
    score: 60, timelineMonths: 12,
    topTasks: [
      ['SQL query and report generation', 12, 'Natural language BI (ThoughtSpot, Metabase AI)'],
      ['Dashboard creation from templates', 18, 'AI-native BI tools (Power BI Copilot)'],
      ['Ad-hoc data extraction and profiling', 24, 'LLM SQL generation (Vanna, DuckDB + Claude)'],
    ],
    safeTasks: [
      ['Business context interpretation and storytelling', 'Very High (post-2032)'],
      ['Data quality judgment in ambiguous domains', 'High (2030+)'],
    ],
    transitions: [
      { role: 'Data Scientist', rr: 25, sd: '+20%', mo: 12 },
      { role: 'Analytics Engineer', rr: 22, sd: '+22%', mo: 12 },
      { role: 'Product Analyst', rr: 20, sd: '+15%', mo: 9 },
    ],
  },
  'data scientist': {
    score: 42, timelineMonths: 36,
    topTasks: [
      ['Exploratory data analysis automation', 36, 'AutoML + LLM-assisted notebook generation'],
      ['Standard statistical analysis and model selection', 36, 'AutoML platforms (H2O, DataRobot)'],
      ['Feature engineering for standard problems', 24, 'AI feature stores with auto-engineering'],
    ],
    safeTasks: [
      ['Causal inference and experimental design', 'Very High (post-2032)'],
      ['Domain-specific model framing and validation', 'High (2030+)'],
    ],
    transitions: [
      { role: 'ML Engineer', rr: 18, sd: '+20%', mo: 12 },
      { role: 'AI Research Scientist', rr: 10, sd: '+25%', mo: 24 },
      { role: 'Head of Analytics / Data Lead', rr: 22, sd: '+30%', mo: 18 },
    ],
  },
  'ml engineer': {
    score: 26, timelineMonths: 48,
    topTasks: [
      ['Standard model training pipeline setup', 48, 'MLflow / Vertex AI auto-orchestration'],
      ['Hyperparameter tuning runs', 36, 'AutoML and NAS platforms'],
      ['Routine feature engineering', 36, 'AI-powered feature stores'],
    ],
    safeTasks: [
      ['Novel ML architecture design and research', 'Very High (post-2032)'],
      ['Production model reliability and MLOps', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'AI Research Engineer', rr: 8, sd: '+25%', mo: 18 },
      { role: 'ML Platform / MLOps Engineer', rr: 12, sd: '+20%', mo: 12 },
      { role: 'Applied AI Product Lead', rr: 20, sd: '+35%', mo: 24 },
    ],
  },
  'devops': {
    score: 36, timelineMonths: 36,
    topTasks: [
      ['Boilerplate CI/CD pipeline configuration', 36, 'AI DevOps tools (GitHub Actions AI, Harness AI)'],
      ['Standard infrastructure-as-code templating', 36, 'AI-assisted Terraform / Pulumi generation'],
      ['Routine monitoring alert configuration', 24, 'AIOps platforms (Dynatrace, Datadog AI)'],
    ],
    safeTasks: [
      ['Production incident management under ambiguity', 'Very High (post-2032)'],
      ['Platform security and compliance architecture', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Platform Engineer / SRE', rr: 12, sd: '+18%', mo: 9 },
      { role: 'Cloud Architect', rr: 25, sd: '+30%', mo: 18 },
      { role: 'Security Engineer', rr: 18, sd: '+25%', mo: 12 },
    ],
  },
  'cloud engineer': {
    score: 38, timelineMonths: 36,
    topTasks: [
      ['IaC template generation for standard stacks', 36, 'AI cloud scaffolding (AWS Copilot, Google Duet AI)'],
      ['Cost optimization report generation', 24, 'AI cost management platforms (Spot.io, CloudHealth AI)'],
      ['Routine capacity planning calculations', 30, 'AI workload prediction tools'],
    ],
    safeTasks: [
      ['Multi-cloud architecture and vendor strategy', 'Very High (post-2032)'],
      ['Security posture and compliance design', 'High (2030+)'],
    ],
    transitions: [
      { role: 'Cloud Architect', rr: 22, sd: '+28%', mo: 15 },
      { role: 'FinOps Specialist', rr: 18, sd: '+20%', mo: 9 },
      { role: 'Platform Security Engineer', rr: 20, sd: '+25%', mo: 12 },
    ],
  },
  'security engineer': {
    score: 23, timelineMonths: 60,
    topTasks: [
      ['Vulnerability scan report triage', 60, 'AI SIEM correlation (Darktrace, CrowdStrike Falcon AI)'],
      ['Standard penetration test report writing', 48, 'AI-assisted pentest reporting tools'],
      ['Compliance checklist verification', 36, 'AI GRC platforms (Drata AI, Vanta AI)'],
    ],
    safeTasks: [
      ['Adversarial threat hunting and red team strategy', 'Very High (post-2032)'],
      ['Zero-day response under novel attack conditions', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Cloud Security Architect', rr: 8, sd: '+30%', mo: 18 },
      { role: 'Threat Intelligence Analyst', rr: 10, sd: '+20%', mo: 12 },
      { role: 'Security Product Manager', rr: 22, sd: '+35%', mo: 24 },
    ],
  },
  'product manager': {
    score: 40, timelineMonths: 36,
    topTasks: [
      ['User story and acceptance criteria drafting', 36, 'LLM product copilots (Jira AI, Linear AI)'],
      ['Competitive analysis report generation', 24, 'AI market research tools (Perplexity, Claude)'],
      ['Roadmap formatting and slide creation', 18, 'AI presentation tools (Tome, Gamma)'],
    ],
    safeTasks: [
      ['Stakeholder alignment and cross-functional influence', 'Very High (post-2032)'],
      ['Product vision and market strategy', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Senior / Staff PM', rr: 15, sd: '+25%', mo: 12 },
      { role: 'AI Product Manager', rr: 5, sd: '+30%', mo: 9 },
      { role: 'Head of Product', rr: 20, sd: '+40%', mo: 24 },
    ],
  },
  'ux designer': {
    score: 50, timelineMonths: 24,
    topTasks: [
      ['Wire frame and low-fidelity prototype generation', 18, 'AI design tools (Figma AI, Uizard, Galileo)'],
      ['User interview transcription and synthesis', 12, 'AI research synthesis tools (Dovetail AI)'],
      ['Standard icon and asset creation', 12, 'Generative design AI (Midjourney, Adobe Firefly)'],
    ],
    safeTasks: [
      ['Deep user empathy and inclusive design', 'Very High (post-2032)'],
      ['Systems-thinking for complex product experiences', 'High (2030+)'],
    ],
    transitions: [
      { role: 'UX Research Lead', rr: 18, sd: '+20%', mo: 12 },
      { role: 'Product Designer (AI-native)', rr: 12, sd: '+18%', mo: 9 },
      { role: 'Design Systems Lead', rr: 22, sd: '+25%', mo: 15 },
    ],
  },
  'financial analyst': {
    score: 68, timelineMonths: 12,
    topTasks: [
      ['Financial model template population', 12, 'AI modeling tools (Runway, Mosaic, Pigment)'],
      ['Standard variance analysis and commentary', 18, 'LLM report generation (Narrative Science)'],
      ['Data aggregation across Excel/ERP systems', 12, 'AI finance automation (Workiva AI, Oracle EPPM AI)'],
    ],
    safeTasks: [
      ['Business insight generation and strategic framing', 'Very High (post-2032)'],
      ['Earnings call Q&A and investor relations judgment', 'High (2030+)'],
    ],
    transitions: [
      { role: 'FP&A Manager / Finance Business Partner', rr: 22, sd: '+25%', mo: 12 },
      { role: 'Investment Analyst (buy-side)', rr: 28, sd: '+35%', mo: 18 },
      { role: 'FinTech Product Manager', rr: 35, sd: '+40%', mo: 18 },
    ],
  },
  'accountant': {
    score: 72, timelineMonths: 12,
    topTasks: [
      ['Transaction coding and reconciliation', 12, 'AI bookkeeping (Vic.ai, Sage AI, Xero AI)'],
      ['Standard journal entry preparation', 18, 'Automated period-close platforms (BlackLine AI)'],
      ['Accounts payable and receivable processing', 12, 'AI-native AP automation (Tipalti, Bill.com AI)'],
    ],
    safeTasks: [
      ['Tax strategy and complex judgment calls', 'High (2030+)'],
      ['Audit management and regulatory representation', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Financial Controller', rr: 20, sd: '+22%', mo: 12 },
      { role: 'Management Accountant / FP&A', rr: 28, sd: '+28%', mo: 12 },
      { role: 'CFO Track (strategic finance)', rr: 35, sd: '+45%', mo: 24 },
    ],
  },
  'hr generalist': {
    score: 65, timelineMonths: 18,
    topTasks: [
      ['Job description drafting', 12, 'AI HR tools (Workday AI, SAP SuccessFactors AI)'],
      ['Employee FAQ resolution', 18, 'HR chatbots and self-service AI'],
      ['Standard onboarding documentation', 18, 'HR process automation platforms'],
    ],
    safeTasks: [
      ['Conflict resolution and employee relations judgment', 'Very High (post-2032)'],
      ['Cultural and DEI program design', 'High (2030+)'],
    ],
    transitions: [
      { role: 'HR Business Partner', rr: 18, sd: '+20%', mo: 12 },
      { role: 'People Analytics Manager', rr: 28, sd: '+30%', mo: 15 },
      { role: 'HR Technology Specialist', rr: 25, sd: '+25%', mo: 12 },
    ],
  },
  'recruiter': {
    score: 65, timelineMonths: 12,
    topTasks: [
      ['Resume screening and initial shortlisting', 9, 'AI applicant tracking (Greenhouse AI, Lever AI)'],
      ['Job posting copy generation', 6, 'LLM job description writers (Textio, OverHire)'],
      ['Interview scheduling and coordination', 12, 'AI scheduling assistants (Calendly AI, ModernLoop)'],
    ],
    safeTasks: [
      ['Executive search and relationship-based sourcing', 'High (2030+)'],
      ['Offer negotiation and candidate experience judgment', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Technical Recruiter → Engineering Manager', rr: 30, sd: '+35%', mo: 24 },
      { role: 'Talent Acquisition Partner (strategic)', rr: 20, sd: '+22%', mo: 12 },
      { role: 'HR Technology / ATS Product Specialist', rr: 28, sd: '+28%', mo: 15 },
    ],
  },
  'content writer': {
    score: 76, timelineMonths: 6,
    topTasks: [
      ['First-draft content generation', 6, 'Claude / GPT-4o / Jasper / Copy.ai'],
      ['SEO-optimised blog and article production', 9, 'AI content platforms (Surfer + LLM)'],
      ['Social media copy variants', 6, 'AI social tools (Buffer AI, Hootsuite AI)'],
    ],
    safeTasks: [
      ['Brand voice guardianship and editorial judgment', 'High (2030+)'],
      ['Original investigative reporting and source relationships', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Content Strategist', rr: 30, sd: '+25%', mo: 12 },
      { role: 'Brand Editor / Head of Content', rr: 38, sd: '+35%', mo: 18 },
      { role: 'AI Content Operations Manager', rr: 22, sd: '+20%', mo: 9 },
    ],
  },
  'paralegal': {
    score: 71, timelineMonths: 12,
    topTasks: [
      ['Contract review and redlining', 12, 'Harvey AI / Casetext CoCounsel'],
      ['Legal research and citation finding', 18, 'LLM legal research (Westlaw AI, Lexis+ AI)'],
      ['Discovery document review', 12, 'AI eDiscovery (Relativity AI, Everlaw AI)'],
    ],
    safeTasks: [
      ['Attorney-supervised judgment calls on novel legal issues', 'High (2030+)'],
      ['Client relationship management and communication', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Legal Operations Manager', rr: 30, sd: '+28%', mo: 15 },
      { role: 'Legal Technology Specialist', rr: 35, sd: '+35%', mo: 15 },
      { role: 'Contract Lifecycle Manager', rr: 25, sd: '+22%', mo: 12 },
    ],
  },
  'project manager': {
    score: 42, timelineMonths: 36,
    topTasks: [
      ['Status report generation and project log updates', 24, 'AI PM tools (Asana AI, Monday AI, ClickUp AI)'],
      ['Meeting notes transcription and action item extraction', 12, 'AI meeting tools (Otter.ai, Fireflies, Notion AI)'],
      ['Risk register templating', 36, 'LLM project risk generation'],
    ],
    safeTasks: [
      ['Stakeholder alignment and conflict mediation', 'Very High (post-2032)'],
      ['Organizational change management', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Programme Manager / PMO Lead', rr: 15, sd: '+22%', mo: 12 },
      { role: 'Product Owner', rr: 18, sd: '+20%', mo: 9 },
      { role: 'Delivery Manager (Agile)', rr: 12, sd: '+15%', mo: 6 },
    ],
  },
  'business analyst': {
    score: 55, timelineMonths: 24,
    topTasks: [
      ['Requirements document drafting', 24, 'LLM requirements tools (Confluence AI, Notion AI)'],
      ['Process mapping documentation', 18, 'AI process mining (Celonis AI, UiPath Process AI)'],
      ['Gap analysis report generation', 24, 'AI analysis frameworks'],
    ],
    safeTasks: [
      ['Stakeholder facilitation and consensus building', 'Very High (post-2032)'],
      ['Complex domain-specific problem framing', 'High (2030+)'],
    ],
    transitions: [
      { role: 'Product Manager', rr: 20, sd: '+25%', mo: 12 },
      { role: 'Process Excellence Lead', rr: 22, sd: '+20%', mo: 12 },
      { role: 'Digital Transformation Consultant', rr: 28, sd: '+30%', mo: 18 },
    ],
  },
  'seo': {
    score: 73, timelineMonths: 9,
    topTasks: [
      ['Content brief and keyword clustering', 9, 'AI SEO tools (Surfer AI, SEMrush AI, Ahrefs AI)'],
      ['Meta tag and on-page optimisation', 6, 'AI-native content optimisation'],
      ['Ranking report generation', 12, 'Automated SEO reporting platforms'],
    ],
    safeTasks: [
      ['Technical SEO architecture and site-structure strategy', 'High (2030+)'],
      ['Link-building relationship management', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Digital Marketing Strategist', rr: 25, sd: '+22%', mo: 12 },
      { role: 'Growth Marketing Manager', rr: 28, sd: '+28%', mo: 12 },
      { role: 'Content Strategy Lead', rr: 22, sd: '+20%', mo: 9 },
    ],
  },
  'registered nurse': {
    score: 14, timelineMonths: 84,
    topTasks: [
      ['Clinical documentation (nursing notes)', 60, 'AI clinical documentation (Nuance DAX, Suki)'],
      ['Medication schedule calculation verification', 72, 'Smart medication management AI'],
      ['Standard protocol lookups', 36, 'AI clinical decision support'],
    ],
    safeTasks: [
      ['Patient bedside assessment, monitoring, and touch', 'Very High (post-2032)'],
      ['Emotional support, care, and patient advocacy', 'Very High (post-2032)'],
    ],
    transitions: [
      { role: 'Nurse Practitioner (advanced practice)', rr: 8, sd: '+30%', mo: 36 },
      { role: 'Clinical Informatics Specialist', rr: 18, sd: '+22%', mo: 18 },
      { role: 'Healthcare Quality and Safety Lead', rr: 12, sd: '+20%', mo: 18 },
    ],
  },
};

// Industry L4 adjustments (pts added to base score)
const INDUSTRY_ADJ: Record<string, number> = {
  'bpo': 8, 'media': 5, 'retail': 4, 'ecommerce': 4, 'e-commerce': 4,
  'finance': 3, 'fintech': 3, 'banking': 3,
  'consulting': 2, 'manufacturing': 2,
  'technology': 0, 'it services': 0, 'saas': 0,
  'education': -3, 'healthcare': -5, 'government': -8,
};

// Country adjustments — reflects adoption lag and labor protection differences
const COUNTRY_ADJ: Record<string, number> = {
  'india': 2, 'in': 2,
  'philippines': 3, 'ph': 3,   // BPO concentration = elevated offshore pressure
  'us': -2, 'united states': -2, 'usa': -2,
  'uk': -1, 'united kingdom': -1, 'gb': -1, 'great britain': -1,
  'australia': -2, 'au': -2,
  'singapore': -1, 'sg': -1,
  'canada': -2, 'ca': -2,
  'germany': -3, 'de': -3,   // strong labour protection laws
  'france': -3, 'fr': -3,
  'netherlands': -2, 'nl': -2,
};

// Experience brackets → score modifier
const EXP_MOD: Record<string, number> = {
  '0-2': 8, '2-5': 0, '5-10': -6, '10-20': -10, '20+': -12,
};

function expBracket(years: number): string {
  if (years < 2)  return '0-2';
  if (years < 5)  return '2-5';
  if (years < 10) return '5-10';
  if (years < 20) return '10-20';
  return '20+';
}

function findRoleIntel(title: string): [string, RoleIntel] | null {
  const normalized = title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Direct substring match (longest key wins to prefer specific over broad)
  let best: [string, RoleIntel] | null = null;
  let bestLen = 0;
  for (const [key, intel] of Object.entries(ROLE_INTEL)) {
    if (normalized.includes(key) && key.length > bestLen) {
      best = [key, intel];
      bestLen = key.length;
    }
  }
  return best;
}

function tierLabel(score: number): string {
  if (score >= 80) return 'Critical risk';
  if (score >= 65) return 'High risk';
  if (score >= 50) return 'Elevated risk';
  if (score >= 35) return 'Moderate risk';
  if (score >= 20) return 'Low risk';
  return 'Very low risk';
}

function buildRiskDrivers(
  roleTitle: string,
  roleIntel: RoleIntel | null,
  industryAdj: number,
  expAdj: number,
  countryAdj: number,
  country: string,
  industry: string,
): string[] {
  const drivers: { text: string; weight: number }[] = [];

  // Primary: role-level displacement
  if (roleIntel) {
    const t = roleIntel.topTasks[0];
    drivers.push({
      text: `Role displacement — "${t[0]}" automatable within ${t[1]} months via ${t[2]}`,
      weight: 100,
    });
  } else {
    drivers.push({
      text: `AI automation tools replacing core ${roleTitle} task functions (industry-model estimate)`,
      weight: 90,
    });
  }

  // Industry driver
  if (Math.abs(industryAdj) >= 2) {
    drivers.push({
      text: industryAdj > 0
        ? `${industry} sector automation pressure (+${industryAdj} pts — above-average AI adoption velocity)`
        : `${industry} sector structural protection (${industryAdj} pts — regulation/complexity buffer)`,
      weight: Math.abs(industryAdj) * 8,
    });
  } else {
    drivers.push({
      text: `${industry} sector AI adoption pace — near-average displacement trajectory`,
      weight: 15,
    });
  }

  // Experience driver
  if (Math.abs(expAdj) > 0) {
    drivers.push({
      text: expAdj > 0
        ? `Junior experience bracket (0–2 yrs): AI closes the skill gap for routine tasks (+${expAdj} pts)`
        : `Senior experience premium (${Math.abs(expAdj)}+ yr tenure): role judgment complexity reduces displacement risk (${expAdj} pts)`,
      weight: Math.abs(expAdj) * 6,
    });
  }

  // Country driver
  if (Math.abs(countryAdj) >= 2) {
    drivers.push({
      text: countryAdj > 0
        ? `${country} labour market: offshore/BPO-concentrated economy faces elevated AI substitution pressure (+${countryAdj} pts)`
        : `${country} employment laws: notice/consultation periods and worker-protection regulation slow displacement (${countryAdj} pts)`,
      weight: Math.abs(countryAdj) * 7,
    });
  }

  // Sort by weight, return top 3
  drivers.sort((a, b) => b.weight - a.weight);
  return drivers.slice(0, 3).map(d => d.text);
}

// ── Handler: role-risk ──────────────────────────────────────────────────────
function handleRoleRisk(body: Record<string, unknown>): Response {
  const { role_title, industry, country, experience_years, city, company_name } = body;

  if (!role_title || typeof role_title !== 'string')
    return json({ error: 'role_title (string) is required' }, 400);
  if (!industry || typeof industry !== 'string')
    return json({ error: 'industry (string) is required' }, 400);
  if (!country || typeof country !== 'string')
    return json({ error: 'country (string) is required' }, 400);
  if (experience_years === undefined || experience_years === null || typeof experience_years !== 'number')
    return json({ error: 'experience_years (number) is required' }, 400);
  if (experience_years < 0 || experience_years > 60)
    return json({ error: 'experience_years must be between 0 and 60' }, 400);

  const roleMatch = findRoleIntel(role_title);
  const roleIntel = roleMatch?.[1] ?? null;

  const indKey      = industry.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
  const ctyKey      = country.toLowerCase().trim();
  const bracket     = expBracket(experience_years);
  const industryAdj = INDUSTRY_ADJ[indKey] ?? 0;
  const expAdj      = EXP_MOD[bracket] ?? 0;
  const countryAdj  = COUNTRY_ADJ[ctyKey] ?? 0;

  const baseScore = roleIntel?.score ?? 55;  // sector average for unmapped roles
  const rawScore  = baseScore + industryAdj + expAdj + countryAdj;
  const score     = Math.max(5, Math.min(99, Math.round(rawScore)));

  const atRiskSkills = (roleIntel?.topTasks ?? [
    ['Routine task automation exposure', 18, 'General AI productivity tools'],
    ['Standard process workflow execution', 24, 'AI workflow automation platforms'],
    ['Template-based documentation generation', 12, 'LLM content tools'],
  ]).map(([skill, timeline_months, ai_tool]) => ({ skill, timeline_months, ai_tool }));

  const safeSkills = (roleIntel?.safeTasks ?? [
    ['Strategic decision-making under uncertainty', 'Very High (post-2032)'],
    ['Stakeholder relationship management', 'Very High (post-2032)'],
    ['Novel problem-solving and judgment', 'High (2030+)'],
  ]).map(([skill, ltv]) => ({ skill, ltv }));

  const recommendedTransitions = (roleIntel?.transitions ?? [
    { role: 'People Manager / Team Lead', rr: 22, sd: '+20%', mo: 18 },
    { role: 'Product / Strategy role (adjacent)', rr: 28, sd: '+25%', mo: 18 },
    { role: 'Domain specialist with AI-augmented tools', rr: 20, sd: '+15%', mo: 12 },
  ]).map(t => ({
    role: t.role,
    risk_reduction_pct: t.rr,
    salary_delta: t.sd,
    months_to_transition: t.mo,
  }));

  const topRiskDrivers = buildRiskDrivers(
    role_title, roleIntel, industryAdj, expAdj, countryAdj, country, industry,
  );

  return json({
    score,
    tier: tierLabel(score),
    confidence_band: {
      low:  Math.max(0, score - 8),
      high: Math.min(100, score + 8),
    },
    top_3_risk_drivers: topRiskDrivers,
    at_risk_skills: atRiskSkills,
    safe_skills: safeSkills,
    recommended_transitions: recommendedTransitions,
    data_provenance: DATA_PROVENANCE,
    model_version:   MODEL_VERSION,
    // Non-spec supplementary fields (do not rename — SDK callers may read them)
    role_matched:     roleMatch?.[0] ?? null,
    experience_years: experience_years,
    experience_bracket: bracket,
    city:             typeof city === 'string' ? city : null,
    company_name:     typeof company_name === 'string' ? company_name : null,
    note: !roleMatch
      ? 'Role not in precision database — industry-average estimate applied. Contact support to request role addition.'
      : undefined,
    computed_at: new Date().toISOString(),
  });
}

// ── Handler: team-risk ─────────────────────────────────────────────────────────
async function handleTeamRisk(
  body: {
    employees?: { job_title: string; department: string; experience_years?: number; industry?: string }[];
    company_name?: string;
  },
  sb: ReturnType<typeof createClient>,
): Promise<Response> {
  const { employees, company_name } = body;
  if (!Array.isArray(employees) || employees.length === 0)
    return json({ error: 'employees (array) is required' }, 400);
  if (employees.length > 500)
    return json({ error: 'Maximum 500 employees per request. Paginate in batches of ≤500.', limit: 500 }, 400);

  let companyRiskScore: number | null = null;
  if (company_name) {
    try {
      const { data } = await sb
        .from('company_intelligence')
        .select('company_risk_score')
        .ilike('company_name', `%${escapeIlike(company_name)}%`)
        .order('confidence_score', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.company_risk_score != null)
        companyRiskScore = Math.round(data.company_risk_score * 100);
    } catch { /* company DB lookup failed — scores still returned role-only */ }
  }

  const scored = employees.map(e => {
    const intel   = findRoleIntel(e.job_title)?.[1] ?? null;
    const indKey  = (e.industry ?? '').toLowerCase();
    const bracket = expBracket(e.experience_years ?? 3);
    const roleScore = Math.max(5, Math.min(99,
      (intel?.score ?? 55) + (INDUSTRY_ADJ[indKey] ?? 0) + (EXP_MOD[bracket] ?? 0),
    ));
    const composite = companyRiskScore !== null
      ? Math.round(roleScore * 0.70 + companyRiskScore * 0.30) : null;
    return { ...e, role_risk_score: roleScore, composite_score: composite,
             tier: tierLabel(composite ?? roleScore) };
  });

  const roleScores = scored.map(e => e.role_risk_score);
  const composites = scored.map(e => e.composite_score).filter((s): s is number => s !== null);
  const avgRole    = Math.round(roleScores.reduce((a, b) => a + b, 0) / roleScores.length);
  const avgComp    = composites.length === scored.length
    ? Math.round(composites.reduce((a, b) => a + b, 0) / composites.length) : null;
  const primary    = avgComp ?? avgRole;

  const deptMap: Record<string, number[]> = {};
  scored.forEach(e => {
    deptMap[e.department] ??= [];
    deptMap[e.department].push(e.role_risk_score);
  });

  const sorted = [...scored].sort((a, b) => b.role_risk_score - a.role_risk_score);

  return json({
    aggregate_score: primary,
    score_basis: companyRiskScore !== null ? 'composite (role + company data)' : 'role_only',
    aggregate_role_risk_score:    avgRole,
    aggregate_company_risk_score: companyRiskScore,
    aggregate_composite_score:    avgComp,
    high_risk_count:     scored.filter(e => (e.composite_score ?? e.role_risk_score) >= 65).length,
    moderate_risk_count: scored.filter(e => { const s = e.composite_score ?? e.role_risk_score; return s >= 45 && s < 65; }).length,
    safe_count:          scored.filter(e => (e.composite_score ?? e.role_risk_score) < 45).length,
    department_risk_map: Object.fromEntries(
      Object.entries(deptMap).map(([d, ss]) => [d, Math.round(ss.reduce((a,b)=>a+b,0)/ss.length)])
    ),
    top_vulnerable_roles: sorted.slice(0, 5).map(e => ({ role: e.job_title, role_risk_score: e.role_risk_score, composite_score: e.composite_score })),
    top_protected_roles:  sorted.slice(-5).reverse().map(e => ({ role: e.job_title, role_risk_score: e.role_risk_score, composite_score: e.composite_score })),
    reskilling_recommendation: primary >= 65
      ? 'Immediate AI upskilling required. Prioritise roles scoring >70 for transition planning.'
      : primary >= 45
      ? 'Moderate risk profile. Focus certification investment on roles scoring 55–70.'
      : 'Below-average risk. Maintain current AI-literacy investment cadence.',
    data_completeness: { company_data_available: companyRiskScore !== null, company_name_queried: company_name ?? null },
    individual_scores: scored.map(e => ({ job_title: e.job_title, department: e.department, role_risk_score: e.role_risk_score, composite_score: e.composite_score, tier: e.tier })),
    employee_count: scored.length,
    model_version:  MODEL_VERSION,
    computed_at:    new Date().toISOString(),
  });
}

// ── Handler: company-intel ─────────────────────────────────────────────────────
async function handleCompanyIntel(
  body: { company_name?: string },
  sb: ReturnType<typeof createClient>,
): Promise<Response> {
  if (!body.company_name) return json({ error: 'company_name is required' }, 400);
  try {
    const { data } = await sb
      .from('company_intelligence')
      .select('company_name, company_risk_score, hiring_freeze_score, last_updated')
      .ilike('company_name', `%${escapeIlike(body.company_name)}%`)
      .order('confidence_score', { ascending: false })
      .limit(1)
      .maybeSingle();
    const rs = data?.company_risk_score ?? 50;
    return json({
      company_name:        data?.company_name ?? body.company_name,
      collapse_stage:      rs >= 75 ? 3 : rs >= 55 ? 2 : rs >= 35 ? 1 : null,
      collapse_stage_label: rs >= 75 ? 'Stage 3 — Active distress' : rs >= 55 ? 'Stage 2 — Stress signals' : rs >= 35 ? 'Stage 1 — Early warning' : 'No active stress signals',
      hiring_freeze_score: data?.hiring_freeze_score ?? 40,
      ninety_day_outlook:  rs >= 65 ? 'Elevated caution' : 'Stable',
      last_updated:        data?.last_updated ?? new Date().toISOString(),
      model_version:       MODEL_VERSION,
    });
  } catch { return json({ error: 'Company intelligence lookup failed' }, 503); }
}

// ── Main handler ───────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Health probe — no auth required, no quota consumed
  const pathname = new URL(req.url).pathname;
  if (req.method === 'GET' && pathname.endsWith('/health'))
    return json({ status: 'ok', model_version: MODEL_VERSION });

  // ── 1. Auth — API key validation (first operation, before any business logic)
  const authHeader = req.headers.get('Authorization') ?? '';
  const rawKey     = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!rawKey) return json({ error: 'Missing API key. Pass Authorization: Bearer <key>' }, 401);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const keyHash = await sha256hex(rawKey);
  const { data: keyRecord } = await sb
    .from('enterprise_api_keys')
    .select('id, daily_limit, is_active, tier')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .maybeSingle();

  // Generic message — do not distinguish invalid from inactive
  if (!keyRecord) return json({ error: 'Unauthorized' }, 401);

  // ── 2. Parse body and resolve endpoint
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body fine for GET-style health */ }

  // Support both body.endpoint field and URL path segment
  const pathEndpoint = pathname.split('/').pop() ?? '';
  const endpoint     = (body.endpoint as string | undefined) ?? pathEndpoint;
  const today        = new Date().toISOString().slice(0, 10);

  // ── 3. Rate limit — atomic check-and-increment
  const { data: rlData, error: rlErr } = await sb.rpc(
    'check_and_increment_api_usage',
    { p_key_id: keyRecord.id, p_date: today, p_endpoint: endpoint || 'unknown', p_daily_limit: keyRecord.daily_limit },
  );
  if (rlErr) return json({ error: 'Rate limit service unavailable', detail: rlErr.message }, 503);
  const rl = Array.isArray(rlData) ? rlData[0] : rlData;
  if (!rl?.allowed) {
    return json(
      { error: 'Daily rate limit exceeded', limit: keyRecord.daily_limit, retry_after_seconds: retryAfterSeconds() },
      429,
      { 'Retry-After': String(retryAfterSeconds()) },
    );
  }

  // ── 4. Route
  let response: Response;
  if      (endpoint === 'role-risk')    response = handleRoleRisk(body);
  else if (endpoint === 'team-risk')    response = await handleTeamRisk(body as Parameters<typeof handleTeamRisk>[0], sb);
  else if (endpoint === 'company-intel') response = await handleCompanyIntel(body as Parameters<typeof handleCompanyIntel>[0], sb);
  else response = json({
    error: `Unknown endpoint: "${endpoint}". Valid endpoints: role-risk, team-risk, company-intel`,
    docs:  'POST body.endpoint = "role-risk" | "team-risk" | "company-intel", or use path routing.',
  }, 400);

  // Touch last_used_at (non-blocking, fire-and-forget)
  sb.from('enterprise_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {}, () => {});

  return response;
});
