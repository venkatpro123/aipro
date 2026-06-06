// ═══════════════════════════════════════════════════════════════════════════════
// services_edu.ts — Education & Training Intelligence Module
// 15 unique roles — distinct from all other modules
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const SERVICES_EDU_INTELLIGENCE: Record<string, CareerIntelligence> = {
  edu_teacher_k12: {
    displayRole: 'K-12 Teacher (Core Subject)',
    summary: 'High resilience; classroom management, motivation, and developmental mentorship are irreducibly human functions.',
    skills: {
      obsolete: [{ skill: 'Standard lesson plan and worksheet creation', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI generates differentiated lesson plans, quizzes, and worksheets for any grade level and subject instantly.', aiReplacement: 'Full', aiTool: 'Khan Academy AI, Khanmigo, Teachable Machine' }],
      at_risk: [{ skill: 'Standard formative assessment and grading', riskScore: 80, riskType: 'Augmented', horizon: '2yr', reason: 'AI auto-grades objective assessments and provides feedback on written work with high accuracy.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Social-Emotional Learning (SEL) Facilitation', whySafe: 'Teaching students how to manage emotions, build relationships, and navigate conflict — through modelling and in-the-moment guidance — requires human presence and lived experience.', longTermValue: 99, difficulty: 'High' },
        { skill: 'Motivational & Developmental Mentorship', whySafe: 'Identifying what makes an individual child tick — and finding the precise moment and approach to unlock curiosity in a disengaged student — is irreducibly human.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'AI-Enhanced Curriculum Designer', riskReduction: 45, skillGap: 'Learning science, Instructional design, AI tools for education', transitionDifficulty: 'Medium', industryMapping: ['EdTech Platforms', 'School Districts'], salaryDelta: '+30-70%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'Teachers who resist AI adoption will be out-performed by AI-literate peers. The survivors will be AI-orchestrated mentors who spend all their time on the human skills AI cannot perform.',
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 22, label: '+2yr' }, { year: 2027, riskScore: 28, label: '+3yr' }, { year: 2028, riskScore: 32, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['education', 'ai-resilient', 'human-touch', 'social-emotional'],
    evolutionHorizon: '2028',
  },

  edu_university_prof: {
    displayRole: 'University Professor / Researcher',
    summary: 'Moderate resilience in standard teaching; very high resilience in novel research — only the frontier stays safe.',
    skills: {
      obsolete: [
        { skill: 'Standard undergraduate lecture content delivery', riskScore: 88, riskType: 'Automatable', horizon: '2yr', reason: 'AI tutoring systems (Khan Academy, Coursera AI) deliver personalized lecture content better than static lecturers.', aiReplacement: 'Full' },
        { skill: 'Standard literature review and citation management', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI research tools synthesize literature, identify gaps, and format citations automatically.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard undergraduate assessment rubric application for common assignment types", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI grading tools apply rubrics to student submissions and generate structured feedback at scale.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Novel Research Hypothesis Generation', whySafe: 'Identifying the non-obvious research questions at the frontier of a discipline — where no training data yet exists — requires human scientific creativity.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Dissertation Mentorship & Intellectual Development', whySafe: 'Shaping a graduate student\'s scientific identity, research philosophy, and professional network over 4-6 years is an inherently human mentorship function.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Research Officer (CRO)', riskReduction: 40, skillGap: 'Research commercialization, Grant strategy at institutional level, Industry partnership development', transitionDifficulty: 'Hard', industryMapping: ['Biotech', 'Tech Research Labs', 'Defense R&D'], salaryDelta: '+50-150%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'Professors who focus only on standard content delivery will be out-performed by AI tutoring. The survivable niche is novel frontier research and graduate mentorship — both of which require the human scientific mind.',
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 32, label: '+1yr' }, { year: 2026, riskScore: 40, label: '+2yr' }, { year: 2027, riskScore: 48, label: '+3yr' }, { year: 2028, riskScore: 55, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['education', 'moderate-risk', 'research', 'academic', 'pivot-window'],
    evolutionHorizon: '2027',
  },

  edu_school_principal: {
    displayRole: 'School Principal / Head Teacher',
    summary: 'Very high resilience; school leadership is community-embedded human governance.',
    skills: {
      obsolete: [{ "skill": "Manual staff meeting agenda preparation from department head email summaries", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI productivity tools auto-synthesize department inputs into structured meeting agendas.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard performance observation evidence compilation for teacher evaluation cycles", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI observation tools auto-structure and tag classroom observation notes for evaluation framework alignment.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Staff Performance & Professional Development Leadership', whySafe: 'Coaching and developing teaching staff — identifying individual growth needs, managing underperformance, building a coaching culture — is irreducibly human organizational leadership.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Community Trust & Parental Stakeholder Management', whySafe: 'Building the social contract between school and community — managing conflicts, communicating decisions, and maintaining public confidence — requires human accountability.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'District Superintendent / CEO of Academy Trust', riskReduction: 22, skillGap: 'Systems governance, Multi-school financial management, Political/regulatory navigation', transitionDifficulty: 'Hard', industryMapping: ['School Districts', 'Academy Trusts', 'Charter Networks'], salaryDelta: '+40-100%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'School principals who do not develop AI governance competency will struggle to manage AI tools being deployed in their schools. The human accountability and community trust role is irreplaceable — the challenge is leading AI adoption, not resisting it.',
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2026, riskScore: 9, label: '+2yr' }, { year: 2027, riskScore: 10, label: '+3yr' }, { year: 2028, riskScore: 12, label: '+4yr' }, { year: 2029, riskScore: 13, label: '+5yr' }],
    confidenceScore: 98,
    contextTags: ['education', 'ai-resilient', 'leadership-premium', 'human-touch', 'community-anchored'],
    evolutionHorizon: '2030',
  },

  edu_special_needs_teacher: {
    displayRole: 'Special Education Teacher (SPED)',
    summary: 'Extremely high resilience; supporting students with complex disabilities requires constant sensory, physical, and emotional human presence.',
    skills: {
      obsolete: [{ "skill": "Manual individualised support plan progress tracking in paper-based portfolios", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI special education platforms auto-track ISP goal progress from digital observation entries.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard IEP (Individualized Education Plan) documentation drafting', riskScore: 78, riskType: 'Augmented', horizon: '2yr', reason: 'AI tools draft IEP content from assessment data, but human oversight and legal accountability remain essential.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Adaptive Behavioral Intervention for Complex Disabilities', whySafe: 'Designing and implementing physical-world interventions for students with ASD, severe ADHD, or emotional-behavioral disorders — requires real-time sensory and emotional attunement AI cannot replicate.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Trauma-Informed Relationship Building', whySafe: 'Building trust with students who have experienced abuse, neglect, or severe trauma — creating the psychological safety that makes learning possible — is irreducibly human.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Director of Special Education Services', riskReduction: 28, skillGap: 'IDEA compliance, Budget management, Multi-district program design', transitionDifficulty: 'Hard', industryMapping: ['School Districts', 'Residential Centers', 'Government'], salaryDelta: '+30-80%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'SPED teachers who do not stay current with AI-assisted progress tracking tools will lose time to administrative tasks. The irreplaceable value — the physical, in-the-room therapeutic relationship — cannot be automated and must be protected.',
    riskTrend: [{ year: 2024, riskScore: 5, label: 'Now' }, { year: 2026, riskScore: 5, label: '+2yr' }, { year: 2027, riskScore: 6, label: '+3yr' }, { year: 2028, riskScore: 7, label: '+4yr' }, { year: 2029, riskScore: 8, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['education', 'irreplaceable', 'human-touch', 'safety-critical', 'disability-services'],
    evolutionHorizon: '2035',
  },

  edu_corporate_trainer: {
    displayRole: 'Corporate Trainer / Learning & Development Specialist',
    summary: 'High disruption in content creation; resilience only in facilitation, behavioral change, and culture transformation.',
    skills: {
      obsolete: [
        { skill: 'Standard PowerPoint-based training content creation', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI generates complete, visually polished training decks from text outlines in minutes.', aiReplacement: 'Full' },
        { skill: 'Standard compliance e-learning module development', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI-powered LMS platforms auto-generate compliance training content, quizzes, and certificates from regulatory documents.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard participant pre-assessment scoring for knowledge baseline determination", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI L&D tools auto-administer and score pre-assessments and generate knowledge gap reports.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Behavioral Change Program Design', whySafe: 'Designing a learning journey that actually changes how people think and behave — not just what they know — requires deep human psychology and organizational culture expertise.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Executive & Leadership Development Coaching', whySafe: 'Developing senior leaders — through challenge, reflection, and personalized feedback in a trust-based coaching relationship — is an inherently human developmental function.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Chief Learning Officer (CLO)', riskReduction: 38, skillGap: 'C-suite communication, L&D budget ownership, Strategic workforce planning', transitionDifficulty: 'Hard', industryMapping: ['Enterprise', 'Consulting Firms'], salaryDelta: '+60-150%', timeToTransition: '36 months' },
    ],
    inactionScenario: 'L&D professionals who focus on content production will be replaced entirely. The survivable niche is behavioral change design and executive coaching.',
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 55, label: '+1yr' }, { year: 2026, riskScore: 65, label: '+2yr' }, { year: 2027, riskScore: 74, label: '+3yr' }, { year: 2028, riskScore: 80, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['education', 'high-risk', 'action-required', 'automation-zone', 'pivot-window'],
    evolutionHorizon: '2026',
  },

  edu_instructional_designer: {
    displayRole: 'Instructional Designer (Digital Learning)',
    summary: 'Very high disruption in content assembly; resilience only in learning architecture strategy.',
    skills: {
      obsolete: [
        { skill: 'SCORM content packaging and LMS upload workflows', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI-powered authoring tools auto-generate SCORM-compliant content from source documents.', aiReplacement: 'Full' },
        { skill: 'Standard storyboarding for e-learning modules', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI generates complete storyboards and scripts from learning objectives in minutes.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard voice-over script readability analysis and reading time estimation", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI writing tools auto-analyze script readability and calculate narration duration estimates.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Adaptive Learning Path Architecture', whySafe: 'Designing a learning system that adapts each learner\'s journey based on competency evidence and performance data — requires deep pedagogy expertise to architect correctly.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Learning Experience Architect', riskReduction: 50, skillGap: 'AI-native LMS platforms (Docebo, Degreed), Data-driven learning analytics, Learning science research', transitionDifficulty: 'Medium', industryMapping: ['EdTech Platforms', 'Enterprise L&D'], salaryDelta: '+30-70%', timeToTransition: '12 months' },
    ],
    riskTrend: [{ year: 2024, riskScore: 50, label: 'Now' }, { year: 2025, riskScore: 63, label: '+1yr' }, { year: 2026, riskScore: 73, label: '+2yr' }, { year: 2027, riskScore: 80, label: '+3yr' }, { year: 2028, riskScore: 86, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['education', 'high-risk', 'rapid-automation', 'action-required', 'pivot-window'],
    evolutionHorizon: '2026',
  },

  edu_edtech_founder: {
    displayRole: 'EdTech Founder / Education Entrepreneur',
    summary: 'Very high resilience; building AI-native education products requires market insight, teacher trust, and product vision.',
    skills: {
      obsolete: [{ "skill": "Manual competitor feature comparison matrix maintenance in spreadsheets", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI product intelligence tools auto-update competitive feature matrices from product page monitoring.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard learning outcome effectiveness metric tracking from platform data", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI product analytics platforms track learning outcome metrics and surface effectiveness insights.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Teacher Trust & Classroom Reality Insight', whySafe: 'Understanding what teachers will actually adopt — and why most EdTech products fail in the classroom despite being technically impressive — requires deep human field research.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Pedagogy-Technology Integration Strategy', whySafe: 'Knowing when to use AI to augment human teaching vs. automate it — and designing products that respect learning science — requires hybrid human expertise.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Partner at Education-Focused VC Fund', riskReduction: 20, skillGap: 'Investment thesis, LP relations, Portfolio company support', transitionDifficulty: 'Very Hard', industryMapping: ['EdTech VC', 'Impact Investing'], salaryDelta: '+200-500%', timeToTransition: '48 months' },
    ],
    inactionScenario: 'EdTech founders who build AI tools without deep classroom understanding will fail. The irreplaceable insight is what teachers will actually adopt — and why most EdTech products fail despite being technically impressive.',
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2026, riskScore: 10, label: '+2yr' }, { year: 2027, riskScore: 9, label: '+3yr' }, { year: 2028, riskScore: 9, label: '+4yr' }, { year: 2029, riskScore: 10, label: '+5yr' }],
    confidenceScore: 97,
    contextTags: ['education', 'ai-resilient', 'ai-native', 'entrepreneurship', 'emerging-role'],
    evolutionHorizon: '2028',
  },
};
