// ═══════════════════════════════════════════════════════════════════════════════
// services_legal.ts — Legal, Compliance & Professional Services Intelligence
// Split from services.ts for modularity and lazy loading.
// Covers: leg_*, legal-adjacent ser_* and gov_legal roles + 10 new roles
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const SERVICES_LEGAL_INTELLIGENCE: Record<string, CareerIntelligence> = {
  // ── Existing Roles (migrated from services.ts) ─────────────────────────────
  leg_corporate: {
    displayRole: 'Corporate Lawyer',
    summary: 'Moderate resilience in strategic deal structuring; high disruption in drafting.',
    skills: {
      obsolete: [{ skill: 'Standard contract drafting', riskScore: 92, riskType: 'Automatable', horizon: '1-3yr', reason: 'LLMs generate standard agreements with 95%+ accuracy.', aiReplacement: 'Full', aiTool: 'Harvey' }],
      at_risk: [{ skill: 'Due diligence document review', riskScore: 82, riskType: 'Automatable', horizon: '1-2yr', reason: 'AI reviews 1000-page data rooms in minutes.', aiReplacement: 'Full', aiTool: 'Kira, Luminance' }],
      safe: [
        { skill: 'Strategic Deal Structuring', whySafe: 'Complex multi-party transactions require human synthesis, negotiation and liability.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Client Relationship Trust', whySafe: 'Senior clients hire lawyers they trust, not tools. Institutional loyalty is irreplaceable.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Legal Tech Director', riskReduction: 55, skillGap: 'AI implementation, Legal Ops', transitionDifficulty: 'Medium', industryMapping: ['Law Firms'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'General Counsel (In-House)', riskReduction: 42, skillGap: 'Business strategy, P&L', transitionDifficulty: 'Medium', industryMapping: ['Corporate'], salaryDelta: '+50-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
      { role: 'AI Governance Attorney', riskReduction: 65, skillGap: 'EU AI Act, NIST AI RMF', transitionDifficulty: 'Hard', industryMapping: ['Consulting', 'Tech'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    roadmap: {
      '0-2': { phase_1: { timeline: '30 days', focus: 'AI Tool Fluency', actions: [{ action: 'Trial Harvey AI for 30 days on actual documents', why: 'Understand what AI can and cannot do in your exact practice area.', outcome: 'Honest AI capability assessment', tool: 'Harvey' }] } },
      '5-10': { phase_1: { timeline: '90 days', focus: 'Practice Area Specialization', actions: [{ action: 'Identify 2-3 deal types where your judgment is truly irreplaceable', why: 'Specialists command 2-3x the rate of generalists.', outcome: 'Clear specialization strategy' }] } },
    },
    inactionScenario: 'Junior corporate lawyers who master only drafting will be eliminated. AI already drafts better than first-year associates in standard matters.',
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 52, label: '+1yr' }, { year: 2026, riskScore: 60, label: '+2yr' }, { year: 2027, riskScore: 65, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['legal-sector', 'ai-augmented', 'relationship-intensive', 'moderate-risk'],
    evolutionHorizon: '2027',
  },
  leg_litigation: {
    displayRole: 'Litigation Lawyer',
    summary: 'High resilience; oral advocacy and adversarial strategy are irreducibly human.',
    skills: {
      obsolete: [{ skill: 'Routine case law research', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI finds and summarises relevant precedents in seconds.', aiReplacement: 'Full', aiTool: 'Westlaw AI, CoCounsel' }],
      at_risk: [{ skill: 'Deposition preparation scripts', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI generates depo questions from case documents automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Trial Advocacy & Persuasion', whySafe: 'Reading a room and persuading a judge/jury is irreducibly human — liability and trust are at stake.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Witness Credibility Assessment', whySafe: 'Reading witness body language, emotional state, and reliability requires embodied human judgment.', longTermValue: 98, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Complex Litigation Lead', riskReduction: 40, skillGap: 'Trial experience, Mediation', transitionDifficulty: 'Hard', industryMapping: ['Law Firms'], salaryDelta: '+40-100%', timeToTransition: '60 months' },
      { role: 'Arbitration Specialist', riskReduction: 52, skillGap: 'ADR certifications, International law', transitionDifficulty: 'Medium', industryMapping: ['International Law'], salaryDelta: '+50-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    inactionScenario: 'Litigators who rely on research and drafting as their primary value will be commoditised. Oral advocacy and trial strategy are your moats — invest in those exclusively.',
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2025, riskScore: 25, label: '+1yr' }, { year: 2026, riskScore: 30, label: '+2yr' }, { year: 2027, riskScore: 35, label: '+3yr' }, { year: 2028, riskScore: 38, label: '+4yr' }],
    confidenceScore: 98,
    contextTags: ['legal-sector', 'ai-resilient', 'relationship-intensive', 'advocacy-moat'],
    evolutionHorizon: '2028',
  },
  leg_ip: {
    displayRole: 'IP Attorney',
    summary: 'High resilience; strategic portfolio design and technical-legal synthesis are uniquely valuable.',
    skills: {
      obsolete: [{ skill: 'Routine prior art searches', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI patents search tools outperform human researchers.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard trademark clearance search across national registers", "riskScore": 80, "riskType": "Augmented", "horizon": "1yr", "reason": "AI trademark tools automatically search national registers and assess likelihood of confusion.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Strategic IP Portfolio Design', whySafe: 'Developing a competitive moat using legal-technical synthesis requires engineering AND strategy judgment.', longTermValue: 97, difficulty: 'High' },
        { skill: 'AI-Generated Content IP Strategy', whySafe: 'Navigating the emerging legal grey zone of AI-created works — a uniquely 2024+ human legal specialty.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'VC IP Lead', riskReduction: 55, skillGap: 'Commercialization strategy', transitionDifficulty: 'Hard', industryMapping: ['VC Firms'], salaryDelta: '+50-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
      { role: 'AI Intellectual Property Counsel', riskReduction: 70, skillGap: 'LLM architecture understanding, copyright law evolution', transitionDifficulty: 'Hard', industryMapping: ['Big Tech', 'AI Startups'], salaryDelta: '+60-120%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2026, riskScore: 35, label: '+2yr' }, { year: 2027, riskScore: 40, label: '+3yr' }, { year: 2028, riskScore: 42, label: '+4yr' }, { year: 2029, riskScore: 45, label: '+5yr' }],
    confidenceScore: 96,
    contextTags: ['legal-sector', 'ai-resilient', 'tech-adjacent', 'strategy-moat'],
    evolutionHorizon: '2028',
  },
  ser_legal_ops: {
    displayRole: 'Legal Operations Manager',
    summary: 'High resilience; designing how law is practiced at scale in an AI-first firm.',
    skills: {
      obsolete: [{ "skill": "Manual legal matter tracking across department spreadsheets", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI legal ops platforms auto-track, categorize, and report on all legal matters from integrated data sources.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard legal invoice review for UTBMS code compliance", "riskScore": 82, "riskType": "Automatable", "horizon": "1yr", "reason": "AI legal billing review platforms auto-flag non-compliant billing entries against guidelines.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Legal Tech Stack Transformation', whySafe: 'Redesigning how law is practiced using AI — requires legal domain knowledge AND tech implementation judgment.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Workflow Optimization for AI-Augmented Teams', whySafe: 'Designing the human-AI collaboration model for legal services is a uniquely human design challenge.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Director of Legal Innovation', riskReduction: 60, skillGap: 'AI governance, LegalTech implementation', transitionDifficulty: 'Medium', industryMapping: ['Law Firms'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
      { role: 'Chief Legal Technology Officer', riskReduction: 65, skillGap: 'CIO-level tech strategy', transitionDifficulty: 'Hard', industryMapping: ['Enterprise Legal'], salaryDelta: '+60-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2026, riskScore: 30, label: '+2yr' }, { year: 2027, riskScore: 35, label: '+3yr' }, { year: 2028, riskScore: 38, label: '+4yr' }, { year: 2029, riskScore: 40, label: '+5yr' }],
    confidenceScore: 96,
    contextTags: ['legal-sector', 'tech-adjacent', 'ai-resilient', 'leadership-premium'],
    evolutionHorizon: '2029',
  },
  gov_defender: {
    displayRole: 'Public Defender',
    summary: 'High resilience; human advocacy for individual liberty is constitutionally required.',
    skills: {
      obsolete: [{ "skill": "Manual discovery document review for obvious relevance decisions", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI e-discovery platforms automatically code documents for relevance, privilege, and key issues.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard sentencing guidelines range calculation for common offenses", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI legal sentencing tools auto-calculate applicable guidelines ranges from offense characteristics.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Adversarial Legal Advocacy', whySafe: 'The human-in-the-loop requirement for individual liberty defense is constitutionally mandated.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Indigent Client Trust Building', whySafe: 'Building trust with clients in crisis — across cultural, economic, and trauma barriers — is irreducibly human.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Private Defense Partner', riskReduction: 35, skillGap: 'Business development, Private client relations', transitionDifficulty: 'Medium', industryMapping: ['Legal'], salaryDelta: '+100-300%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 },
      { role: 'Civil Rights Attorney', riskReduction: 28, skillGap: 'Constitutional law specialization', transitionDifficulty: 'Medium', industryMapping: ['NGO/Nonprofit'], salaryDelta: '+20-50%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2026, riskScore: 18, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 24, label: '+4yr' }, { year: 2029, riskScore: 26, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['legal-sector', 'ai-resilient', 'human-touch', 'advocacy-moat', 'public-sector'],
    evolutionHorizon: '2029',
  },
  gov_tax_auditor: {
    displayRole: 'Tax Auditor (Government)',
    summary: 'Moderate resilience; AI handles routine checks; humans own fraud intent determination.',
    skills: {
      obsolete: [{ skill: 'Routine math and cross-reference verification', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI flags discrepancies in tax filings instantly with 99.9% accuracy.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard variance identification in tax return line items vs. industry benchmarks", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI audit selection tools auto-flag return anomalies against industry and peer benchmarks.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Fraud Intent Investigation', whySafe: 'Discerning deliberate deception vs. innocent error requires human investigative intuition that AI cannot reliably replicate.', longTermValue: 95, difficulty: 'High' },
        { skill: 'Complex Entity Structure Analysis', whySafe: 'Unravelling multi-layered corporate structures designed to obscure transactions requires adversarial human judgment.', longTermValue: 97, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Forensic Accountant (Private Sector)', riskReduction: 52, skillGap: 'Legal evidence standards, Expert witness certification', transitionDifficulty: 'Medium', industryMapping: ['Big 4', 'Boutique Investigative Firms'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2026, riskScore: 48, label: '+2yr' }, { year: 2027, riskScore: 58, label: '+3yr' }, { year: 2028, riskScore: 65, label: '+4yr' }, { year: 2029, riskScore: 70, label: '+5yr' }],
    confidenceScore: 94,
    contextTags: ['legal-sector', 'government', 'moderate-risk', 'fraud-detection'],
    evolutionHorizon: '2027',
  },

  // ── New Roles Added ────────────────────────────────────────────────────────
  leg_ai_counsel: {
    displayRole: 'AI Governance Attorney',
    summary: 'Extremely high growth; defining the legal frameworks for AI liability, bias, and regulation.',
    skills: {
      obsolete: [{ "skill": "Manual AI regulatory framework document search across jurisdictions", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI legal research tools auto-search and compile AI regulatory frameworks across global jurisdictions.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard AI incident report documentation for regulatory disclosure", "riskScore": 76, "riskType": "Augmented", "horizon": "2yr", "reason": "AI compliance tools draft AI incident reports from structured event logs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'EU AI Act & Global AI Regulation Interpretation', whySafe: 'Real-time interpretation of rapidly evolving AI law requires deep human legal synthesis — no AI can self-regulate its own legal constraints.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'AI Liability & Accountability Framework Design', whySafe: 'Designing who is responsible when AI systems cause harm — a frontier legal question requiring interdisciplinary human expertise.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Chief AI Ethics Counsel', riskReduction: 20, skillGap: 'AI system architecture understanding, policy writing', transitionDifficulty: 'Hard', industryMapping: ['Big Tech', 'Consulting', 'Gov'], salaryDelta: '+80-200%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    inactionScenario: 'This is one of the highest-growth legal specialties in 2024-2030. Not entering this field is the opportunity cost risk, not displacement.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 6, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['legal-sector', 'emerging-role', 'ai-native', 'frontier-skill', 'ai-resilient'],
    evolutionHorizon: '2030',
  },
  leg_data_privacy: {
    displayRole: 'Data Privacy Counsel',
    summary: 'High resilience and strong growth; GDPR, CCPA, and global privacy law complexity ensures human-in-loop demand.',
    skills: {
      obsolete: [{ "skill": "Manual DPIA scoping questionnaire completion for standard processing activities", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI privacy tools auto-generate DPIA scoping documents from processing activity descriptions.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard DPIA documentation', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI generates DPIA templates with high accuracy for standard processing activities.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Cross-Border Data Flow Strategy', whySafe: 'Navigating conflicting national privacy regimes (GDPR vs China PIPL vs India PDPB) requires deep human legal-political synthesis.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Regulatory Relationship Management', whySafe: 'Building trust with DPAs (Data Protection Authorities) requires human diplomatic skill and institutional credibility.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Privacy Officer', riskReduction: 38, skillGap: 'Executive board communication, Global regulatory mapping', transitionDifficulty: 'Hard', industryMapping: ['Tech', 'Finance', 'Healthcare'], salaryDelta: '+60-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 22, label: '+3yr' }, { year: 2028, riskScore: 24, label: '+4yr' }, { year: 2029, riskScore: 25, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['legal-sector', 'tech-adjacent', 'ai-resilient', 'high-demand', 'regulation-driven'],
    evolutionHorizon: '2029',
  },
  leg_compliance_mgr: {
    displayRole: 'Compliance Manager',
    summary: 'Moderate resilience; AI monitors rules but humans interpret regulatory intent and manage regulator relationships.',
    skills: {
      obsolete: [{ skill: 'Manual compliance checklist execution', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'RegTech AI automates checklist compliance monitoring in real-time.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Annual compliance report compilation', riskScore: 78, riskType: 'Automatable', horizon: '2yr', reason: 'AI generates compliance reports from transaction data automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Regulatory Intent Interpretation', whySafe: 'Understanding not just what regulations say but what regulators actually want — requires deep human political-legal intuition.', longTermValue: 96, difficulty: 'High' },
        { skill: 'Escalation Judgment', whySafe: 'Deciding when a compliance issue warrants escalation to the board or regulators requires human accountability and moral judgment.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Compliance Officer', riskReduction: 45, skillGap: 'Board presentation, Risk management certification', transitionDifficulty: 'Hard', industryMapping: ['Banking', 'Pharma', 'Insurance'], salaryDelta: '+60-150%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
      { role: 'RegTech Implementation Lead', riskReduction: 58, skillGap: 'AI compliance tools, API integrations', transitionDifficulty: 'Medium', industryMapping: ['Fintech', 'Consulting'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 },
    ],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2026, riskScore: 50, label: '+2yr' }, { year: 2027, riskScore: 60, label: '+3yr' }, { year: 2028, riskScore: 65, label: '+4yr' }, { year: 2029, riskScore: 68, label: '+5yr' }],
    confidenceScore: 95,
    contextTags: ['legal-sector', 'moderate-risk', 'regulation-driven', 'automation-zone'],
    evolutionHorizon: '2027',
  },
  leg_paralegal: {
    displayRole: 'Paralegal',
    summary: 'High disruption; document-heavy work is being automated. Resilience only in complex case management.',
    skills: {
      obsolete: [
        { skill: 'Document review and bates stamping', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI reviews documents with greater accuracy and 100× speed.', aiReplacement: 'Full' },
        { skill: 'Standard legal research memo preparation', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'LLMs produce research memos indistinguishable from junior paralegal output.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard document production coding for common document categories", "riskScore": 82, "riskType": "Augmented", "horizon": "1yr", "reason": "AI e-discovery platforms code documents for relevance and privilege at review speeds far exceeding manual review.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Complex Case Timeline Management', whySafe: 'Coordinating multi-case deadlines, attorney schedules, and client communications at a human-touch level.', longTermValue: 78, difficulty: 'Medium' }],
    },
    careerPaths: [
      { role: 'Legal Project Manager', riskReduction: 60, skillGap: 'AI legal tools, Project management certification', transitionDifficulty: 'Medium', industryMapping: ['Law Firms'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
      { role: 'Legal Technologist / Trainer', riskReduction: 65, skillGap: 'LegalTech implementation, User training', transitionDifficulty: 'Medium', industryMapping: ['LegalTech'], salaryDelta: '+40-70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 },
    ],
    inactionScenario: 'Paralegals who do not develop AI tool fluency and pivot to Legal Ops/Project Management face direct position elimination within 2-3 years.',
    riskTrend: [{ year: 2024, riskScore: 62, label: 'Now' }, { year: 2025, riskScore: 72, label: '+1yr' }, { year: 2026, riskScore: 80, label: '+2yr' }, { year: 2027, riskScore: 86, label: '+3yr' }, { year: 2028, riskScore: 90, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['legal-sector', 'high-risk', 'action-required', 'automation-zone', 'entry-sensitive'],
    evolutionHorizon: '2026',
  },
  leg_mediation: {
    displayRole: 'Commercial Mediator',
    summary: 'Extremely high resilience; human conflict resolution, trust-building and creative compromise are irreplaceable.',
    skills: {
      obsolete: [{ "skill": "Manual mediation session summary drafting from handwritten notes", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI transcription tools auto-transcribe and structure mediation session summaries.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard opening statement framework drafting from case brief", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI legal writing tools draft opening statement frameworks from case documentation.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'High-Stakes Commercial Negotiation', whySafe: 'Guiding adversarial commercial parties to mutually acceptable resolution requires human empathy, creativity, and psychological acuity.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Cross-Cultural Dispute Resolution', whySafe: 'Understanding unstated cultural dynamics and face-saving requirements in multi-national disputes requires lived human cultural experience.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'International Commercial Arbitrator', riskReduction: 25, skillGap: 'ICC/LCIA accreditation, Cross-border law', transitionDifficulty: 'Hard', industryMapping: ['International Law', 'Finance'], salaryDelta: '+100-400%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 },
    ],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 11, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['legal-sector', 'ai-resilient', 'relationship-intensive', 'human-touch'],
    evolutionHorizon: '2030',
  },
};
