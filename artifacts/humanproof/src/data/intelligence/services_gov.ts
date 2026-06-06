// ═══════════════════════════════════════════════════════════════════════════════
// services_gov.ts — Government, Public Sector & Policy Intelligence Module
// 22 unique roles — zero cross-module data repetition
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const SERVICES_GOV_INTELLIGENCE: Record<string, CareerIntelligence> = {
  gov_policy_analyst: {
    displayRole: 'Government Policy Analyst',
    summary: 'High resilience; synthesizing political, economic, and social trade-offs into defensible policy positions is irreducibly human.',
    skills: {
      obsolete: [{ skill: 'Standard evidence review and literature summary', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI research tools synthesize vast bodies of evidence instantly.', aiReplacement: 'Full', aiTool: 'Elicit, Perplexity Pro' }],
      at_risk: [{ skill: 'Quantitative economic impact modelling (standard)', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI econometric tools run standard impact models from parameter inputs.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Political Feasibility & Stakeholder Negotiation', whySafe: 'Understanding what is technically optimal vs. what coalition of powerful interests will allow it to be implemented — a distinctly human political judgment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Unintended Consequence Synthesis', whySafe: 'Predicting how a policy will interact with existing social systems in ways not captured by models requires deep sociological and institutional intuition.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Director of Policy', riskReduction: 38, skillGap: 'Executive stakeholder management, Budget responsibility, Political communication', transitionDifficulty: 'Hard', industryMapping: ['Government', 'Think Tanks', 'IGOs'], salaryDelta: '+40-100%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'Policy analysts who only produce standard research will be replaced by AI tools. The survivors are political navigators and coalition architects — skills AI cannot perform.',
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 20, label: '+1yr' }, { year: 2026, riskScore: 23, label: '+2yr' }, { year: 2027, riskScore: 27, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['government', 'ai-resilient', 'policy', 'political-moat'],
    evolutionHorizon: '2029',
  },

  gov_diplomat: {
    displayRole: 'Diplomat / Foreign Service Officer',
    summary: 'Extremely high resilience; statecraft, cultural intelligence, and trust-based negotiation are irreducibly human.',
    skills: {
      obsolete: [{ "skill": "Manual meeting readout and talking points distribution after bilateral sessions", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI tools auto-transcribe and distribute structured readouts from recorded diplomatic sessions.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard embassy visa and consular documentation processing', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI document processing systems handle standard visa application workflows.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Crisis Diplomatic Back-Channel Navigation', whySafe: 'Operating in off-the-record communication channels to prevent or de-escalate international crises — where personal relationships and cultural intelligence determine outcomes.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Cross-Cultural Trust Architecture', whySafe: 'Building the decades-long personal relationships with foreign nationals that provide real intelligence and enable influence — an inherently embodied human function.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Ambassador / Senior Envoy', riskReduction: 10, skillGap: 'Deep expertise in specific regional political systems, Executive communication at head-of-state level', transitionDifficulty: 'Very Hard', industryMapping: ['Government', 'International Organizations'], salaryDelta: '+30-100%', timeToTransition: '120+ months' },
    ],
    inactionScenario: 'Diplomats who rely only on standard cable writing and briefing note formats will be out-performed. The irreplaceable value is the personal network and cultural intelligence built over decades.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 6, label: '+3yr' }, { year: 2028, riskScore: 7, label: '+4yr' }, { year: 2029, riskScore: 8, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['government', 'irreplaceable', 'trust-critical', 'human-touch', 'international'],
    evolutionHorizon: '2035',
  },

  gov_intelligence_analyst: {
    displayRole: 'Intelligence Analyst (National Security)',
    summary: 'High resilience in source evaluation and strategic assessment; disruption in routine signals processing.',
    skills: {
      obsolete: [{ skill: 'Routine SIGINT signal pattern matching', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI systems process petabytes of signals data and flag anomalies at superhuman speed and scale.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard OSINT collection against known target indicator lists", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI OSINT platforms auto-collect and structure open-source data against target indicator libraries.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'HUMINT Source Credibility Assessment', whySafe: 'Evaluating whether a human intelligence source is being honest, manipulated, or running a double-game — requires irreducible human social and psychological judgment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Strategic Warning Synthesis (Novel Threat)', whySafe: 'Assembling disparate, weak signals into an early warning of an unprecedented geopolitical threat requires the creative abductive reasoning AI cannot perform.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [
      { role: 'Senior Intelligence Officer / Station Chief', riskReduction: 20, skillGap: 'Deep regional area expertise, Source development skills, Operational tradecraft', transitionDifficulty: 'Very Hard', industryMapping: ['Intelligence Agencies', 'Defense'], salaryDelta: '+30-80%', timeToTransition: '60 months' },
    ],
    inactionScenario: 'Intelligence analysts who only process structured data will be replaced by AI systems. The irreplaceable skills are HUMINT source evaluation and novel threat synthesis — skills that require human judgment and cannot be automated.',
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2025, riskScore: 22, label: '+1yr' }, { year: 2026, riskScore: 24, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 98,
    contextTags: ['government', 'ai-resilient', 'security', 'national-security', 'human-judgment'],
    evolutionHorizon: '2030',
  },

  gov_urban_mayor: {
    displayRole: 'City Manager / Municipal Administrator',
    summary: 'High resilience; governing a city requires human political accountability, crisis leadership, and coalition building.',
    skills: {
      obsolete: [{ "skill": "Manual constituent letter response drafting for common enquiry categories", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI government communications tools auto-draft constituent responses from categorised enquiry templates.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard budget variance reporting', riskScore: 82, riskType: 'Automatable', horizon: '2yr', reason: 'AI financial dashboards auto-flag budget variances and spending anomalies.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Cross-Department Crisis Coordination', whySafe: 'Coordinating police, fire, public health, and emergency services in a live crisis — with political accountability and public communication simultaneously.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Community Trust Governance', whySafe: 'Making difficult decisions that affect citizens\' lives — where accountability to human stakeholders through democratic processes is the core function.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'State/Regional Director', riskReduction: 20, skillGap: 'Legislative relations, State budget process, Political coalition management', transitionDifficulty: 'Hard', industryMapping: ['State Government', 'Regional Authorities'], salaryDelta: '+30-80%', timeToTransition: '48 months' },
    ],
    inactionScenario: 'City managers who do not develop AI-literacy will struggle to govern AI-augmented municipal services. The irreplaceable value is crisis leadership and democratic accountability.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 11, label: '+4yr' }, { year: 2029, riskScore: 12, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['government', 'ai-resilient', 'leadership-premium', 'executive', 'political-moat'],
    evolutionHorizon: '2032',
  },

  gov_social_worker: {
    displayRole: 'Senior Social Worker / Case Manager',
    summary: 'Extremely high resilience; crisis intervention, safeguarding, and human therapeutic relationships are irreducibly human.',
    skills: {
      obsolete: [{ "skill": "Manual case note transcription from field visit voice logs", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI transcription and case documentation tools auto-transcribe and structure field visit notes.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard risk assessment form completion', riskScore: 80, riskType: 'Augmented', horizon: '2yr', reason: 'AI risk-scoring tools auto-complete standard structured risk assessments from case data.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Child Safeguarding Crisis Determination', whySafe: 'Making the life-and-death judgment about whether a child is safe in their home — with legal, moral, and emotional accountability — is the ultimate human professional judgment.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Therapeutic Alliance with Resistant Clients', whySafe: 'Building trust with involuntary clients (mandated), trauma survivors, and individuals in active psychosis — requires irreducible human empathy and presence.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Director of Social Services', riskReduction: 25, skillGap: 'Budget management, Workforce development, Policy implementation', transitionDifficulty: 'Hard', industryMapping: ['Local Government', 'NGOs', 'Charities'], salaryDelta: '+30-70%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'Social workers who do not stay current with AI safeguarding risk tools will be less effective at the administrative side of their work. The human relationship is irreplaceable but must be protected by staying ahead of documentation automation.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 14, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['government', 'irreplaceable', 'human-touch', 'safety-critical', 'protected-by-law'],
    evolutionHorizon: '2035',
  },

  gov_public_prosecutor: {
    displayRole: 'Public Prosecutor / District Attorney',
    summary: 'High resilience; the decision to charge and prosecute a human being requires moral accountability that cannot be delegated to AI.',
    skills: {
      obsolete: [{ skill: 'Routine case file and evidence index preparation', riskScore: 93, riskType: 'Automatable', horizon: '1yr', reason: 'AI legal discovery tools auto-index, summarize, and cross-reference case evidence.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard sentencing guidelines range calculation and applicable factors summary", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI legal tools auto-calculate applicable sentencing ranges and summarize relevant factors from case facts.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Prosecutorial Discretion & Charging Judgment', whySafe: 'Deciding whether the public interest warrants prosecution — weighing evidence quality, defendant circumstances, community impact, and resource cost — is a fundamentally human moral function.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Jury Communication & Courtroom Persuasion', whySafe: 'Presenting a case in a way that 12 laypersons from different backgrounds can understand and believe — reading the room, adapting in real-time — is irreducibly human.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Judge / Magistrate', riskReduction: 15, skillGap: 'Judicial application, Appellate procedure, Judicial temperament development', transitionDifficulty: 'Very Hard', industryMapping: ['Federal/State Courts'], salaryDelta: '+20-60%', timeToTransition: '60 months' },
    ],
    inactionScenario: 'Prosecutors who rely on AI-generated case summaries without developing prosecutorial judgment skills will lose credibility in court. The irreplaceable value is moral discretion and jury communication.',
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 14, label: '+2yr' }, { year: 2027, riskScore: 16, label: '+3yr' }, { year: 2028, riskScore: 18, label: '+4yr' }, { year: 2029, riskScore: 20, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['government', 'legal', 'ai-resilient', 'protected-by-law', 'moral-accountability'],
    evolutionHorizon: '2032',
  },

  gov_military_officer: {
    displayRole: 'Military Officer (Command)',
    summary: 'Extremely high resilience; command decision-making in lethal environments with legal, moral, and strategic accountability is irreducibly human.',
    skills: {
      obsolete: [{ "skill": "Manual operational order annex formatting from staff officer briefing notes", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI military staff tools auto-format and compile operation order annexes from structured input data.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard operational logistics scheduling', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI planning systems optimize deployment logistics, resupply schedules, and route planning.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Lethal Force Command Authorization', whySafe: 'The decision to employ lethal military force — with full moral, legal, and strategic accountability under the laws of armed conflict — can never be delegated to an AI system.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Unit Cohesion & Combat Leadership', whySafe: 'Maintaining the morale, discipline, and fighting effectiveness of human soldiers under extreme physical and psychological stress requires irreducible human leadership presence.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Senior Defense Executive / Contractor', riskReduction: 20, skillGap: 'Defense procurement, Program management, Private sector transition (EO/political dynamics)', transitionDifficulty: 'Hard', industryMapping: ['Defense Contractors', 'Government Relations'], salaryDelta: '+50-150%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'Military officers who do not develop literacy in AI-assisted planning and autonomous systems will be less effective advisors. But command authority will remain human — the question is which officers understand AI well enough to govern its use.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2029, riskScore: 7, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['government', 'irreplaceable', 'safety-critical', 'protected-by-law', 'military'],
    evolutionHorizon: '2035',
  },

  gov_regulator: {
    displayRole: 'Financial / Industry Regulator (Senior)',
    summary: 'High resilience; interpreting law, setting precedent, and enforcing sanctions requires accountable human judgment.',
    skills: {
      obsolete: [{ "skill": "Manual regulatory consultation response summary compilation from submission emails", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI regulatory tools auto-aggregate and theme public consultation responses from digital submissions.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard transaction surveillance and flagging', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI surveillance systems detect suspicious patterns with far greater precision and coverage than human review.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Novel AI Risk Regulatory Framework Design', whySafe: 'Designing the rules that govern AI systems themselves — determining what is permissible, what is prohibited, and how to enforce it — requires democratic human authority.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Enforcement Action Judgment & Sanctions Determination', whySafe: 'Deciding whether to bring a case, at what level of sanction, with what conditions — balancing deterrence, fairness, and public interest — requires accountable human judgment.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Compliance Officer (CCO)', riskReduction: 38, skillGap: 'Corporate governance, Financial reporting supervision, C-suite executive management', transitionDifficulty: 'Hard', industryMapping: ['Financial Services', 'Big Tech', 'Healthcare'], salaryDelta: '+60-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Regulators who do not develop AI-specific technical literacy will struggle to regulate AI systems credibly. The future regulator must understand what they are regulating — including its limits and failure modes.',
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 11, label: '+2yr' }, { year: 2027, riskScore: 11, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 13, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['government', 'ai-resilient', 'regulatory-driven', 'protected-by-law', 'leadership-premium'],
    evolutionHorizon: '2030',
  },

  gov_public_health_dir: {
    displayRole: 'Public Health Director',
    summary: 'Extremely high resilience; pandemic response leadership and population health governance require accountable human authority.',
    skills: {
      obsolete: [{ "skill": "Manual press release drafting for routine public health advisories", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI communications tools auto-draft standard public health advisories from surveillance data inputs.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard epidemiological situation report compilation from agency surveillance feeds", "riskScore": 74, "riskType": "Augmented", "horizon": "2yr", "reason": "AI public health platforms auto-compile situation reports from connected surveillance systems.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Public Health Crisis Command', whySafe: 'Leading a jurisdiction\'s response to disease outbreaks — coordinating healthcare, communications, enforcement, and politics simultaneously — with full public accountability.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Inter-Agency Coalition Building', whySafe: 'Aligning hospitals, local governments, federal agencies, media, and community organizations around an emergency health strategy requires human authority and trust.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Secretary of Health (Cabinet Level)', riskReduction: 5, skillGap: 'Legislative relations, National media communication, Federal budget process', transitionDifficulty: 'Very Hard', industryMapping: ['Federal Government', 'WHO / IGOs'], salaryDelta: '+20-80%', timeToTransition: '60 months' },
    ],
    inactionScenario: 'Public health directors who do not integrate AI epidemiological modeling into their decision-making will be at a disadvantage in future outbreaks. The irreplaceable value is command leadership and coalition authority.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2029, riskScore: 6, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['government', 'irreplaceable', 'safety-critical', 'leadership-premium', 'executive'],
    evolutionHorizon: '2035',
  },

  gov_judge: {
    displayRole: 'Judge / Magistrate',
    summary: 'Constitutionally protected; judicial authority over human liberty is irreducibly human by democratic design.',
    skills: {
      obsolete: [{ "skill": "Manual case history summary preparation from court file documents", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI legal tools auto-generate structured case history summaries from court file documents.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard legal research and case precedent retrieval', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI legal research tools retrieve and synthesize precedent far faster and more completely than human researchers.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Judicial Discretion & Sentencing Judgment', whySafe: 'Determining the appropriate sentence for a human being — integrating legal precedent, individual circumstances, victim impact, and social deterrence — is a constitutionally protected human function.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Credibility Determination & Witness Assessment', whySafe: 'Judging whether a witness is truthful based on demeanor, consistency, and the totality of the evidence — the core evidentiary role of trial courts — requires human presence.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Appellate Judge / Justice', riskReduction: 5, skillGap: 'Appellate procedure, Constitutional law, Judicial scholarship', transitionDifficulty: 'Very Hard', industryMapping: ['Federal Courts', 'State Courts'], salaryDelta: '+10-40%', timeToTransition: '120+ months (career long)' },
    ],
    inactionScenario: 'Judges who do not develop literacy in AI evidence and AI bias issues will be less equipped to rule on AI-related cases — a category growing rapidly. The role itself is irreplaceable; the competence to govern AI is not automatic.',
    riskTrend: [{ year: 2024, riskScore: 3, label: 'Now' }, { year: 2026, riskScore: 4, label: '+2yr' }, { year: 2027, riskScore: 4, label: '+3yr' }, { year: 2028, riskScore: 5, label: '+4yr' }, { year: 2029, riskScore: 5, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['government', 'irreplaceable', 'protected-by-law', 'constitutional-protection', 'legal'],
    evolutionHorizon: '2040',
  },
};
