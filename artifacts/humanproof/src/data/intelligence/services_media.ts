// ═══════════════════════════════════════════════════════════════════════════════
// services_media.ts — Media & Journalism Intelligence Module
// 5 unique roles — distinct from all other modules
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const SERVICES_MEDIA_INTELLIGENCE: Record<string, CareerIntelligence> = {
  med_journalist: {
    displayRole: 'Journalist / Staff Reporter',
    summary: 'High disruption in routine and commodity content; high resilience in investigative, source-driven, and original reporting.',
    skills: {
      obsolete: [
        { skill: 'Press release rewriting and agency newswire summarization', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI news tools (AP Automated Insights, Axios AI, Bloomberg AI) automatically rewrite press releases and wire stories at scale.', aiReplacement: 'Full', aiTool: 'AP Automated Insights, Bloomberg AI, Axios AI' },
        { skill: 'Standard earnings report and financial data journalism', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'Automated journalism tools generate earnings stories from structured financial data in seconds.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard interview transcription and quote extraction', riskScore: 80, riskType: 'Augmented', horizon: '2yr', reason: 'AI transcription tools (Otter, Whisper, Descript) transcribe interviews with high accuracy and automatically identify key quotes.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Investigative Source Cultivation and Confidential Reporting', whySafe: 'Building the long-term trust with sources who provide off-record information — through years of reliable, discreet contact — is irreducibly human. No AI can build a whistleblower relationship.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Original Narrative Framing and Editorial Angle', whySafe: 'Finding the non-obvious story angle — the counterintuitive truth, the hidden pattern, the human story behind the data — requires the creative and ethical judgment of a journalist with domain expertise and cultural context.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Investigative Reporter / Senior Correspondent', riskReduction: 55, skillGap: 'Long-form investigation methodology, Source protection tradecraft, Data journalism skills', transitionDifficulty: 'Hard', industryMapping: ['Investigative Outlets', 'National Newspapers', 'Documentary Production'], salaryDelta: '+10-40%', timeToTransition: '24 months' },
      { role: 'Data Journalist / AI-Augmented Reporter', riskReduction: 50, skillGap: 'Python/R for data analysis, Data visualization, AI tool proficiency for research', transitionDifficulty: 'Medium', industryMapping: ['Digital News Outlets', 'Think Tanks', 'Non-Profit News'], salaryDelta: '+10-50%', timeToTransition: '12 months' },
    ],
    inactionScenario: 'Journalists who focus on commodity and routine content will be replaced by AI within 2 years. The survivable niche is investigative, source-driven, and original reporting — where human relationships, judgment, and editorial integrity are the product.',
    riskTrend: [{ year: 2024, riskScore: 50, label: 'Now' }, { year: 2025, riskScore: 62, label: '+1yr' }, { year: 2026, riskScore: 72, label: '+2yr' }, { year: 2027, riskScore: 79, label: '+3yr' }, { year: 2028, riskScore: 85, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['media', 'high-risk', 'action-required', 'pivot-window', 'investigative-safe'],
    evolutionHorizon: '2026',
  },

  med_editor: {
    displayRole: 'Editor / Content Editor (Digital/Print)',
    summary: 'Moderate disruption in copy editing and SEO tasks; high resilience in editorial vision, voice, and writer development.',
    skills: {
      obsolete: [
        { skill: 'Standard proofreading and copy editing for grammar and style', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI writing tools (Grammarly Business, ProWritingAid AI) handle grammar, style, and consistency checks instantly.', aiReplacement: 'Full', aiTool: 'Grammarly Business, Hemingway AI, ProWritingAid' },
        { skill: 'SEO metadata and keyword optimization', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI SEO tools auto-generate optimized metadata, headers, and keyword density recommendations for all content.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard headline optimization and A/B testing selection', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI headline tools generate and predict performance of headline variants using engagement data.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Editorial Vision and Publication Voice Direction', whySafe: 'Defining what a publication stands for — which stories to pursue, which angles to take, how the brand\'s voice should evolve — requires human editorial judgment shaped by values, audience understanding, and cultural context.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Writer Coaching and Talent Development', whySafe: 'Developing a journalist\'s skills — identifying their blind spots, pushing them on difficult stories, building their confidence in their own voice — is an irreducibly human mentorship function.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Editorial Director / Editor-in-Chief', riskReduction: 30, skillGap: 'Revenue and business model literacy, C-suite stakeholder management, Cross-platform strategy', transitionDifficulty: 'Hard', industryMapping: ['News Media', 'Publishing', 'Content Agencies'], salaryDelta: '+30-100%', timeToTransition: '36 months' },
      { role: 'Content Strategy Director', riskReduction: 40, skillGap: 'Content performance analytics, AI tools integration, Audience development strategy', transitionDifficulty: 'Medium', industryMapping: ['Digital Media', 'Brand Content Studios', 'Agencies'], salaryDelta: '+20-60%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Editors who focus on copy and SEO tasks will be replaced by AI tools. The survivable positioning is editorial leadership and writer development — where the human voice, values, and judgment are the product that audiences trust.',
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 48, label: '+1yr' }, { year: 2026, riskScore: 57, label: '+2yr' }, { year: 2027, riskScore: 64, label: '+3yr' }, { year: 2028, riskScore: 70, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['media', 'moderate-risk', 'editorial-safe', 'pivot-window', 'leadership-premium'],
    evolutionHorizon: '2027',
  },

  med_reporter: {
    displayRole: 'Beat Reporter / News Reporter',
    summary: 'High disruption in routine coverage; resilience in source relationships, on-the-ground reporting, and original investigation.',
    skills: {
      obsolete: [
        { skill: 'Routine meeting and event coverage from published agendas', riskScore: 94, riskType: 'Automatable', horizon: '1yr', reason: 'AI can generate standard meeting coverage reports from public agendas and minutes.', aiReplacement: 'Full' },
        { skill: 'Standard research and background compilation from public sources', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI research tools compile background, context, and related coverage from public sources instantly.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard data-driven local story from public datasets', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI data journalism tools can identify patterns in public datasets and generate story leads automatically.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Beat Source Relationship and Trust Building', whySafe: 'The police chief who calls you first, the politician who gives you the off-record context, the community leader who trusts you with their story — these relationships are built over years and are irreplaceable.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Physical On-the-Ground Presence Reporting', whySafe: 'Being at the scene — during a fire, a protest, a trial — gathering sensory detail, eyewitness accounts, and the atmosphere that makes readers feel they were there, requires physical human presence.', longTermValue: 95, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Senior Investigative Reporter / Senior Correspondent', riskReduction: 55, skillGap: 'Long-form investigation, Source protection, Freedom of Information expertise', transitionDifficulty: 'Hard', industryMapping: ['National Media', 'Investigative Outlets', 'Documentary'], salaryDelta: '+10-50%', timeToTransition: '24 months' },
      { role: 'Community Engagement Journalist / Audience Reporter', riskReduction: 40, skillGap: 'Community organizing, Social media strategy, Newsletter monetization', transitionDifficulty: 'Low', industryMapping: ['Local Media', 'Independent Journalism', 'Non-Profit News'], salaryDelta: '-10-30% (transition cost)', timeToTransition: '12 months' },
    ],
    inactionScenario: 'Beat reporters covering routine events without developing source networks or investigative skills will be replaced by AI in 2-3 years. The source relationships built on a beat are the only thing AI cannot generate.',
    riskTrend: [{ year: 2024, riskScore: 48, label: 'Now' }, { year: 2025, riskScore: 59, label: '+1yr' }, { year: 2026, riskScore: 68, label: '+2yr' }, { year: 2027, riskScore: 75, label: '+3yr' }, { year: 2028, riskScore: 81, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['media', 'high-risk', 'action-required', 'source-driven', 'pivot-window'],
    evolutionHorizon: '2026',
  },

  med_podcast: {
    displayRole: 'Podcast Host / Podcast Producer',
    summary: 'Moderate disruption in production workflow; high resilience in host personality, audience trust, and interview chemistry.',
    skills: {
      obsolete: [
        { skill: 'Standard episode transcript editing and cleanup', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI podcast tools (Descript AI, Riverside AI) automatically transcribe, clean, and edit episode audio.', aiReplacement: 'Full', aiTool: 'Descript AI, Riverside AI, Adobe Podcast' },
        { skill: 'Episode show notes and chapter markers generation', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools automatically generate show notes, timestamps, and SEO descriptions from episode transcripts.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Social media clip selection and highlight creation', riskScore: 78, riskType: 'Augmented', horizon: '2yr', reason: 'AI tools (Opus Clip, Vidyo.ai) automatically identify viral moments and generate optimized short-form clips.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Host Personality and Audience Parasocial Trust', whySafe: 'Podcast listeners tune in for the host\'s voice, perspective, humor, and personality — the ongoing parasocial relationship that makes podcasting uniquely resilient. An AI host with the same voice is not the same thing.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Live Interview Chemistry and Guest Relationship Building', whySafe: 'The ability to put a guest at ease, ask the follow-up that reveals the real story, and navigate a conversation toward unexpected depth — requires irreducibly human social intelligence.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Podcast Network Executive / Head of Audio Content', riskReduction: 35, skillGap: 'Content strategy, Advertising and sponsorship sales, Talent development', transitionDifficulty: 'Hard', industryMapping: ['Podcast Networks', 'Audio Streaming (Spotify, Apple)', 'Media Companies'], salaryDelta: '+40-120%', timeToTransition: '36 months' },
      { role: 'Corporate Podcast Strategist / B2B Content Creator', riskReduction: 45, skillGap: 'Enterprise content strategy, Internal communications, Audience development for B2B', transitionDifficulty: 'Medium', industryMapping: ['Agencies', 'Enterprises', 'Consulting Firms'], salaryDelta: '+20-80%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Podcast producers who rely only on production quality will be outcompeted by AI-assisted production. The survivable value is the host\'s unique voice, perspective, and audience trust — which must be built and protected as the primary asset.',
    riskTrend: [{ year: 2024, riskScore: 32, label: 'Now' }, { year: 2025, riskScore: 40, label: '+1yr' }, { year: 2026, riskScore: 48, label: '+2yr' }, { year: 2027, riskScore: 54, label: '+3yr' }, { year: 2028, riskScore: 60, label: '+4yr' }],
    confidenceScore: 92,
    contextTags: ['media', 'moderate-risk', 'personality-driven', 'human-touch', 'pivot-window'],
    evolutionHorizon: '2028',
  },

  med_broadcast: {
    displayRole: 'Broadcast Journalist / TV News Presenter',
    summary: 'High disruption in scripted and pre-recorded formats; high resilience in live, on-camera, and trusted anchor roles.',
    skills: {
      obsolete: [
        { skill: 'Scripted reader delivery for pre-recorded news segments', riskScore: 85, riskType: 'Automatable', horizon: '2yr', reason: 'AI video news presenters (Synthesia, HeyGen) deliver scripted pre-recorded segments with synthetic anchors. Some regional outlets already use them.', aiReplacement: 'Full', aiTool: 'Synthesia, HeyGen, Colossyan' },
        { skill: 'Standard weather and traffic segment scripting', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI-generated weather graphics and automated scripts deliver standard forecasts without human on-screen talent.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard interview question preparation from briefing notes', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI tools generate comprehensive interview question sets from background research and briefing materials.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Live Breaking News Anchoring Under Pressure', whySafe: 'Managing a live broadcast during a developing crisis — improvising, filling time, making editorial judgments in real-time without a script — requires human broadcasting composure that AI presenters cannot replicate.', longTermValue: 97, difficulty: 'Very High' },
        { skill: 'Trusted Public News Anchor Persona and Audience Relationship', whySafe: 'The trusted anchor whose face viewers associate with reliable information during a national crisis — whose credibility is the product of decades of on-screen integrity — cannot be replaced by a synthetic presenter.', longTermValue: 98, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Senior News Anchor / Chief News Correspondent', riskReduction: 30, skillGap: 'On-camera gravitas development, Live breaking news expertise, Investigative journalism credibility', transitionDifficulty: 'Hard', industryMapping: ['National TV Networks', 'International News (BBC, Al Jazeera, CNN)'], salaryDelta: '+20-100%', timeToTransition: '60 months' },
      { role: 'Media Trainer / Executive Communications Coach', riskReduction: 50, skillGap: 'Coaching methodology, Executive client relations, Media strategy advisory', transitionDifficulty: 'Medium', industryMapping: ['PR Agencies', 'Consultancies', 'Self-Employed'], salaryDelta: '+20-80%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Broadcast journalists in scripted, pre-recorded, or routine segment roles will be the first to be replaced by AI presenters. Survival requires building the live anchoring credibility and audience trust that makes a human face irreplaceable.',
    riskTrend: [{ year: 2024, riskScore: 40, label: 'Now' }, { year: 2025, riskScore: 50, label: '+1yr' }, { year: 2026, riskScore: 60, label: '+2yr' }, { year: 2027, riskScore: 67, label: '+3yr' }, { year: 2028, riskScore: 73, label: '+4yr' }],
    confidenceScore: 93,
    contextTags: ['media', 'high-risk', 'live-safe', 'action-required', 'pivot-window'],
    evolutionHorizon: '2027',
  },
};
