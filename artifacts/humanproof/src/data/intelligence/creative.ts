import { CareerIntelligence } from './types.ts';

export const CREATIVE_INTELLIGENCE: Record<string, CareerIntelligence> = {
  cnt_blog: {
    displayRole: 'Blogger / Content Writer',
    summary: 'High disruption in standard info-content; resilience in primary research and thought leadership.',
    skills: {
      obsolete: [{ skill: 'Standard info-content drafting', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'LLMs generate SEO articles with high accuracy.', aiReplacement: 'Full', aiTool: 'Jasper, Copy.ai' }],
      at_risk: [{ "skill": "Standard SEO meta description and title tag generation", "riskScore": 97, "riskType": "Automatable", "horizon": "1yr", "reason": "AI SEO tools generate meta descriptions and title tags from content at scale.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Primary Research & Interviews', whySafe: 'AI cannot perform original investigative reporting.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Content Operations Manager', riskReduction: 60, skillGap: 'Prompt engineering, Editorial QA', transitionDifficulty: 'Medium', industryMapping: ['Marketing Agencies'], salaryDelta: '+30–50%', timeToTransition: '6 months', months_to_first_income: 2, income_dip_months: 0 }],
    riskTrend: [{ year: 2024, riskScore: 70, label: 'Now' }, { year: 2025, riskScore: 76, label: '+1yr' }, { year: 2026, riskScore: 83, label: '+2yr' }, { year: 2027, riskScore: 89, label: '+3yr' }, { year: 2028, riskScore: 95, label: '+4yr' }],
    confidenceScore: 95,
  },
  des_graphic: {
    displayRole: 'Graphic Designer',
    summary: 'High disruption in execution; resilience in art direction.',
    skills: {
      obsolete: [{ skill: 'Logo variations production', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI generates variations in seconds.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Social media template resizing across format specifications", "riskScore": 96, "riskType": "Automatable", "horizon": "1yr", "reason": "AI design tools auto-resize and adapt designs across all social media format specifications.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Creative Direction & Brand Identity', whySafe: 'Developing a unique visual language requires human cultural intuition.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Art Director', riskReduction: 55, skillGap: 'Prompting', transitionDifficulty: 'Medium', industryMapping: ['Ad Agencies'], salaryDelta: '+25–45%', timeToTransition: '9 months', months_to_first_income: 3, income_dip_months: 1 }],
    riskTrend: [{ year: 2024, riskScore: 50, label: 'Now' }, { year: 2025, riskScore: 58, label: '+1yr' }, { year: 2026, riskScore: 66, label: '+2yr' }, { year: 2027, riskScore: 74, label: '+3yr' }, { year: 2028, riskScore: 82, label: '+4yr' }],
    confidenceScore: 92,
  },
  des_ux: {
    displayRole: 'UX/UI Designer',
    summary: 'Moderate resilience in research; high disruption in standard layout.',
    skills: {
      obsolete: [{ skill: 'Standard wireframe generation', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI generates wireframes from text.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard accessibility audit against WCAG 2.1 AA criteria", "riskScore": 82, "riskType": "Augmented", "horizon": "1yr", "reason": "AI accessibility tools auto-audit digital products against WCAG criteria and generate remediation reports.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Deep User Research & Empathy', whySafe: 'AI cannot replicate physiological nuances of user testing.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI UX Specialist', riskReduction: 58, skillGap: 'AI agent UX paradigms', transitionDifficulty: 'Medium', industryMapping: ['Product Development'], salaryDelta: '+30–60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 39, label: '+1yr' }, { year: 2026, riskScore: 44, label: '+2yr' }, { year: 2027, riskScore: 48, label: '+3yr' }, { year: 2028, riskScore: 52, label: '+4yr' }],
    confidenceScore: 95,
  },
  cnt_video: {
    displayRole: 'Video Editor',
    summary: 'Moderate resilience in creative storytelling.',
    skills: {
      obsolete: [{ skill: 'Rough cut assembly', riskScore: 92, riskType: 'Automatable', horizon: '1-2yr', reason: 'AI auto-selects best takes.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard colour grading using LUT matching to reference footage", "riskScore": 85, "riskType": "Augmented", "horizon": "1yr", "reason": "AI colour grading tools auto-match grade from reference footage using neural style transfer.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Emotional Storytelling', whySafe: 'Determining the "soul" of a cut to elicit specific emotion.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Workflow Post-Producer', riskReduction: 60, skillGap: 'Generative video tools', transitionDifficulty: 'Medium', industryMapping: ['Production Houses'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 49, label: '+1yr' }, { year: 2026, riskScore: 55, label: '+2yr' }, { year: 2027, riskScore: 62, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 94,
  },
  des_interior: {
    displayRole: 'Interior Designer',
    summary: 'Moderate resilience; high disruption in visualization.',
    skills: {
      obsolete: [{ "skill": "Manual material sample cutting and physical moodboard assembly", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI interior design tools generate digital moodboards and photorealistic visualizations from style inputs.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard furniture placement and 3D visualisation for common room layouts", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI interior design tools auto-furnish and visualize rooms from dimensions and style preferences.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Spatial Psychology', whySafe: 'Designing for environments for emotional well-being.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Immersive Experience Designer', riskReduction: 52, skillGap: 'IoT integration', transitionDifficulty: 'Medium', industryMapping: ['Residential'], salaryDelta: '+20-40%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 39, label: '+1yr' }, { year: 2026, riskScore: 44, label: '+2yr' }, { year: 2027, riskScore: 48, label: '+3yr' }, { year: 2028, riskScore: 52, label: '+4yr' }],
    confidenceScore: 92,
  },
  med_pr: {
    displayRole: 'PR Specialist',
    summary: 'High resilience in relationship management.',
    skills: {
      obsolete: [{ "skill": "Manual press clipping collection and physical archive maintenance", "riskScore": 98, "riskType": "Automatable", "horizon": "1yr", "reason": "AI media monitoring tools continuously scan and archive all relevant press coverage digitally and automatically.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard media monitoring and mention tracking across digital channels", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI media monitoring platforms auto-aggregate, classify, and sentiment-analyse brand mentions.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Relationship Moat', whySafe: 'Personal trust with journalists.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Crisis Strategy Lead', riskReduction: 45, skillGap: 'Crisis communication', transitionDifficulty: 'Hard', industryMapping: ['Corporate'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 32, label: '+1yr' }, { year: 2026, riskScore: 37, label: '+2yr' }, { year: 2027, riskScore: 41, label: '+3yr' }, { year: 2028, riskScore: 45, label: '+4yr' }],
    confidenceScore: 96,
  },
  cnt_social: {
    displayRole: 'Social Media Manager',
    summary: 'High disruption in production.',
    skills: {
      obsolete: [{ "skill": "Manual hashtag research and trend identification through manual platform browsing", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI social monitoring tools continuously track trending hashtags and emerging topics across all platforms.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard post scheduling and cross-platform content adaptation", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI social media management tools auto-schedule, reformat, and adapt content across platforms from a single brief.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Cultural Synthesis', whySafe: 'Identifying niche cultural moments.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Viral Strategy Director', riskReduction: 55, skillGap: 'Psychology', transitionDifficulty: 'Medium', industryMapping: ['Agencies'], salaryDelta: '+40-80%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 55, label: 'Now' }, { year: 2025, riskScore: 61, label: '+1yr' }, { year: 2026, riskScore: 68, label: '+2yr' }, { year: 2027, riskScore: 74, label: '+3yr' }, { year: 2028, riskScore: 80, label: '+4yr' }],
    confidenceScore: 94,
  },
  med_buyer: {
    displayRole: 'Media Buyer',
    summary: 'Extreme disruption in bidding.',
    skills: {
      obsolete: [{ "skill": "Manual media insertion order creation and vendor billing reconciliation", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI media management platforms auto-generate insertion orders and reconcile billing against delivery data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard programmatic campaign setup for defined audience segments", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI programmatic platforms auto-configure campaigns from audience and budget parameters.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Cross-Channel Strategic Allocation', whySafe: 'Deciding capital allocation based on macro-trends.', longTermValue: 92, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'MarTech Lead', riskReduction: 62, skillGap: 'Privacy tech', transitionDifficulty: 'Medium', industryMapping: ['Enterprise'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 65, label: 'Now' }, { year: 2025, riskScore: 72, label: '+1yr' }, { year: 2026, riskScore: 79, label: '+2yr' }, { year: 2027, riskScore: 85, label: '+3yr' }, { year: 2028, riskScore: 92, label: '+4yr' }],
    confidenceScore: 98,
  },
  cnt_journalist: {
    displayRole: 'Journalist',
    summary: 'High resilience in field-work.',
    skills: {
      obsolete: [{ "skill": "Manual government press release data extraction and basic summary writing", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI journalism tools auto-extract key facts from government releases and produce initial summaries.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard financial results earnings summary from press releases", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI journalism tools auto-generate earnings summaries from structured financial release data.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Investigative Source Cultivation', whySafe: 'Building trust with whistleblowers.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Strategic Intelligence Lead', riskReduction: 52, skillGap: 'OSINT', transitionDifficulty: 'Medium', industryMapping: ['Private Sector'], salaryDelta: '+40-100%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 41, label: '+1yr' }, { year: 2026, riskScore: 48, label: '+2yr' }, { year: 2027, riskScore: 54, label: '+3yr' }, { year: 2028, riskScore: 60, label: '+4yr' }],
    confidenceScore: 98,
  },
  art_director: {
    displayRole: 'Art Director',
    summary: 'High resilience in creative vision.',
    skills: {
      obsolete: [{ "skill": "Manual photo retouching for standard beauty and product image outputs", "riskScore": 96, "riskType": "Automatable", "horizon": "1yr", "reason": "AI retouching tools perform skin retouching and product image cleanup at scale without manual effort.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard image retouching and background removal for product photography", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI image editing tools perform background removal and retouching at scale automatically.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Aesthetic Moat & Vision', whySafe: 'Defining a unique visual language.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Chief Creative Officer (CCO)', riskReduction: 45, skillGap: 'Business strategy', transitionDifficulty: 'Very Hard', industryMapping: ['Agencies'], salaryDelta: '+100-300%', timeToTransition: '60 months' }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 21, label: '+1yr' }, { year: 2026, riskScore: 23, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 98,
  },
  des_fashion: {
    displayRole: 'Fashion Designer',
    summary: 'High resilience in physical construction.',
    skills: {
      obsolete: [{ "skill": "Standard garment tech pack production for unchanged carryover styles", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI fashion tools auto-generate tech packs for standard carryover styles from previous season templates.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard textile print repeat generation from pattern motifs", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI pattern generation tools create seamless textile repeats from single motif inputs.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Material Tactility', whySafe: 'Exploring novel physical fabric behaviors.', longTermValue: 97, difficulty: 'High' }],
    },
    careerPaths: [{ role: '3D Fashion Technologist', riskReduction: 55, skillGap: 'CLO 3D', transitionDifficulty: 'Medium', industryMapping: ['Digital Fashion'], salaryDelta: '+30-70%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 32, label: 'Now' }, { year: 2025, riskScore: 37, label: '+1yr' }, { year: 2026, riskScore: 41, label: '+2yr' }, { year: 2027, riskScore: 46, label: '+3yr' }, { year: 2028, riskScore: 50, label: '+4yr' }],
    confidenceScore: 95,
  },
  des_3d: {
    displayRole: '3D Artist',
    summary: 'High resilience in complex asset creation.',
    skills: {
      obsolete: [{ "skill": "Standard environmental scatter asset placement across large scene terrain", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI procedural scatter tools auto-place environment assets across terrain based on ecological rules.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard prop and environment asset retopology for game engines", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI retopology tools auto-generate game-ready, low-poly meshes from high-poly sculpts.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Hero Asset Organic Sculpting', whySafe: 'Developing highly unique, anatomically complex characters.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Technical Artist (AI)', riskReduction: 62, skillGap: 'Procedural generation', transitionDifficulty: 'Hard', industryMapping: ['Gaming'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 44, label: '+1yr' }, { year: 2026, riskScore: 50, label: '+2yr' }, { year: 2027, riskScore: 56, label: '+3yr' }, { year: 2028, riskScore: 62, label: '+4yr' }],
    confidenceScore: 96,
  },
  des_vfx: {
    displayRole: 'VFX Artist',
    summary: 'Moderate resilience.',
    skills: {
      obsolete: [{ "skill": "Manual frame-by-frame wire removal from clean plate footage", "riskScore": 93, "riskType": "Automatable", "horizon": "1yr", "reason": "AI wire and cable removal tools auto-clean wire rigs from footage across full shot lengths.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard rotoscoping and object removal for clean plate creation", "riskScore": 88, "riskType": "Augmented", "horizon": "1yr", "reason": "AI rotoscoping tools auto-mask and remove objects from footage with minimal manual frame correction.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Lighting Synthesis', whySafe: 'Ensuring seamless integration of physical and digital elements.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Virtual Production Supervisor', riskReduction: 58, skillGap: 'Unreal Engine', transitionDifficulty: 'Hard', industryMapping: ['Film'], salaryDelta: '+50-100%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 45, label: 'Now' }, { year: 2025, riskScore: 53, label: '+1yr' }, { year: 2026, riskScore: 60, label: '+2yr' }, { year: 2027, riskScore: 68, label: '+3yr' }, { year: 2028, riskScore: 75, label: '+4yr' }],
    confidenceScore: 94,
  },
  cnt_ux_writer: {
    displayRole: 'UX Writer',
    summary: 'Moderate resilience.',
    skills: {
      obsolete: [{ "skill": "Standard notification copy generation for standard in-app event types", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI product writing tools generate notification copy variants for standard app events from specification.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard error message and tooltip copy generation from technical specs", "riskScore": 88, "riskType": "Augmented", "horizon": "1yr", "reason": "AI writing assistants generate standard UI microcopy from technical specifications and style guide inputs.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Product Voice Strategy', whySafe: 'Designing the "personality" of a product.', longTermValue: 92, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Conversation Designer', riskReduction: 65, skillGap: 'VUI design', transitionDifficulty: 'Medium', industryMapping: ['Product'], salaryDelta: '+30-60%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 48, label: 'Now' }, { year: 2025, riskScore: 56, label: '+1yr' }, { year: 2026, riskScore: 63, label: '+2yr' }, { year: 2027, riskScore: 71, label: '+3yr' }, { year: 2028, riskScore: 78, label: '+4yr' }],
    confidenceScore: 92,
  },
  des_industrial: {
    displayRole: 'Industrial Designer',
    summary: 'High resilience in ergonomics.',
    skills: {
      obsolete: [{ "skill": "Standard product exploded-view technical illustration from CAD assembly", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI CAD tools auto-generate exploded-view technical illustrations from 3D assembly models.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard design for manufacturing (DFM) checklist review", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI DFM tools auto-analyse CAD models against manufacturing constraint rules and generate violation reports.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Ergonomic Human-Centric Innovation', whySafe: 'Designing physical interfaces that match the complex physiological reality.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Hardware Product Strategist', riskReduction: 60, skillGap: 'Market synthesis', transitionDifficulty: 'Hard', industryMapping: ['Consumer Tech'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 32, label: '+1yr' }, { year: 2026, riskScore: 37, label: '+2yr' }, { year: 2027, riskScore: 41, label: '+3yr' }, { year: 2028, riskScore: 45, label: '+4yr' }],
    confidenceScore: 96,
  },
  cnt_technical_writer: {
    displayRole: 'Technical Writer',
    summary: 'High disruption in API documentation.',
    skills: {
      obsolete: [{ "skill": "Standard FAQ content generation from product support ticket themes", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI support tools auto-generate FAQ articles from clusters of resolved support tickets.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard changelog and release notes generation from commit logs", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI tools auto-generate user-facing release notes from structured commit and PR data.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Strategic Knowledge Architecture', whySafe: 'Designing how complex technical knowledge is structured.', longTermValue: 95, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'AI Knowledge Graph Specialist', riskReduction: 65, skillGap: 'Semantic web', transitionDifficulty: 'Hard', industryMapping: ['Enterprise'], salaryDelta: '+40-100%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 45, label: 'Now' }, { year: 2025, riskScore: 53, label: '+1yr' }, { year: 2026, riskScore: 60, label: '+2yr' }, { year: 2027, riskScore: 68, label: '+3yr' }, { year: 2028, riskScore: 75, label: '+4yr' }],
    confidenceScore: 94,
  },
  med_film_director: {
    displayRole: 'Film / Creative Director',
    summary: 'High resilience due to the irreducibly human requirement for singular vision, emotional resonance, and high-stakes physical set leadership.',
    skills: {
      obsolete: [{ skill: 'Standard storyboard and camera-angle drafting', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI-driven previs tools generate cinematic storyboards from script notes instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard production schedule optimisation across department constraints", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI production management tools auto-optimise shoot schedules from location, cast, and department constraint data.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Unified Emotional Vision & Set Leadership', whySafe: 'Synthesizing 100s of human talents and technical constraints into a singular emotional journey.', longTermValue: 99, difficulty: 'Extremely High' }],
    },
    careerPaths: [{ role: 'Virtual Production Supervisor', riskReduction: 45, skillGap: 'Real-time rendering, LED volume lighting', transitionDifficulty: 'Medium', industryMapping: ['Film / Tech'], salaryDelta: '+50-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 15, label: '+1yr' }, { year: 2026, riskScore: 17, label: '+2yr' }, { year: 2027, riskScore: 20, label: '+3yr' }, { year: 2028, riskScore: 22, label: '+4yr' }],
    confidenceScore: 99,
  },
  med_music_composer: {
    displayRole: 'Music Composer / Sound Designer',
    summary: 'High resilience in complex scoring and novel sonic design; extreme disruption in routine stock/background music production.',
    skills: {
      obsolete: [{ skill: 'Standard background and library music production', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'Generative AI produces high-quality background tracks for any mood/bpm instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard stem mixing balance and loudness normalisation", "riskScore": 80, "riskType": "Augmented", "horizon": "2yr", "reason": "AI mastering tools auto-balance stems and normalise loudness to broadcast standards.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Emotional Narrative Scoring & Novel Synthesis', whySafe: 'Designing unique sonic identities that respond to the non-linear emotional arc of a story.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Immersive Audio Architect', riskReduction: 60, skillGap: 'Spatial audio, object-based mixing', transitionDifficulty: 'Medium', industryMapping: ['Gaming / XR'], salaryDelta: '+30-70%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 45, label: '+1yr' }, { year: 2026, riskScore: 52, label: '+2yr' }, { year: 2027, riskScore: 58, label: '+3yr' }, { year: 2028, riskScore: 65, label: '+4yr' }],
    confidenceScore: 96,
  },
  des_jewelry: {
    displayRole: 'Jewelry Designer / Goldsmith',
    summary: 'High resilience due to the extreme physical precision and material tactility of high-value gems and metals; disruption in standard 3D CAD modeling.',
    skills: {
      obsolete: [{ skill: 'Standard 3D ring/setting modeling', riskScore: 94, riskType: 'Automatable', horizon: '1styr', reason: 'AI-CAD auto-generates 100s of settings based on stone dimensions instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard stone certificate verification and provenance documentation", "riskScore": 74, "riskType": "Augmented", "horizon": "2yr", "reason": "Blockchain-based gem certification platforms auto-verify and log stone provenance from lab reports.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'High-Value Material Tactility & Hand-Setting', whySafe: 'The physical world "feel" and setting of precious stones in precious metals.', longTermValue: 99, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Luxury Bespoke Consultant', riskReduction: 52, skillGap: 'Gemstone sourcing, high-net-worth sales', transitionDifficulty: 'Medium', industryMapping: ['Luxury Goods'], salaryDelta: '+100-300%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 22, label: '+1yr' }, { year: 2026, riskScore: 25, label: '+2yr' }, { year: 2027, riskScore: 29, label: '+3yr' }, { year: 2028, riskScore: 32, label: '+4yr' }],
    confidenceScore: 98,
  },
  ent_scriptwriter: {
    displayRole: 'Scriptwriter / Screenwriter',
    summary: 'High disruption in routine dialogue; extreme resilience in complex structural narrative and human subtext.',
    skills: {
      obsolete: [{ skill: 'Routine soap/procedural dialogue', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'LLMs generate standard dialogue and scene structures with high fluency.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard character breakdown sheet generation from script analysis", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI script analysis tools auto-extract character breakdowns and scene summaries from formatted screenplays.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Subtextual Narrative Architecture', whySafe: 'Designing the "unspoken" emotional and thematic layers of a story.', longTermValue: 99, difficulty: 'Extremely High' }],
    },
    careerPaths: [{ role: 'Showrunner / Creative Producer', riskReduction: 55, skillGap: 'Executive mgmt, Budgeting', transitionDifficulty: 'Hard', industryMapping: ['Film'], salaryDelta: '+100-500%', timeToTransition: '48 months' }],
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 43, label: '+1yr' }, { year: 2026, riskScore: 52, label: '+2yr' }, { year: 2027, riskScore: 60, label: '+3yr' }, { year: 2028, riskScore: 68, label: '+4yr' }],
    confidenceScore: 96,
  },
  ent_lighting_des: {
    displayRole: 'Lighting Designer',
    summary: 'High resilience in physical world deployment and emotional atmosphere creation.',
    skills: {
      obsolete: [{ "skill": "Manual lighting paperwork circuit schedule completion from physical rig inspection", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI lighting control platforms auto-generate circuit schedules from networked fixture data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard lighting plot drafting for recurring venue configurations", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI theatrical lighting tools auto-generate plots from venue data and show type templates.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Atmospheric Emotional Palette Design', whySafe: 'Using light and shadow to manipulate human emotional response in physical spaces.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Virtual Production Lighting lead', riskReduction: 50, skillGap: 'Unreal Engine, Ray-tracing', transitionDifficulty: 'Hard', industryMapping: ['Tech / Media'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 14, label: '+1yr' }, { year: 2026, riskScore: 16, label: '+2yr' }, { year: 2027, riskScore: 18, label: '+3yr' }, { year: 2028, riskScore: 20, label: '+4yr' }],
    confidenceScore: 99,
  },
  ent_stage_mgr: {
    displayRole: 'Stage Manager',
    summary: 'High resilience; the "Command and Control" center of live performance.',
    skills: {
      obsolete: [{ "skill": "Manual calling script typing from director annotated rehearsal scripts", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI production tools auto-format calling scripts from annotated script files.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard prompt script and cue sheet formatting from director notes", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI production tools auto-format cue sheets and prompt scripts from production notes.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Live Crisis Orchestration', whySafe: 'Managing thousands of physical cues and human safety during a live performance.', longTermValue: 99, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Technical Director (Live Events)', riskReduction: 35, skillGap: 'Engineering, Systems info', transitionDifficulty: 'Medium', industryMapping: ['Entertainment'], salaryDelta: '+30%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2025, riskScore: 12, label: '+1yr' }, { year: 2026, riskScore: 14, label: '+2yr' }, { year: 2027, riskScore: 16, label: '+3yr' }, { year: 2028, riskScore: 18, label: '+4yr' }],
    confidenceScore: 99,
  },
  ent_talent_agent: {
    displayRole: 'Talent Agent',
    summary: 'Extremely high resilience; trust and network capital are the product.',
    skills: {
      obsolete: [{ "skill": "Manual client deal memo drafting from verbal negotiation summaries", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI legal drafting tools auto-generate deal memos from structured negotiation notes.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard contract redline comparison between submitted and precedent terms", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI contract review tools auto-redline talent contracts against precedent and flag non-standard terms.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Human Capital Valuation & Leverage', whySafe: 'Judging a human\'s "Star Power" and negotiating multi-million dollar contracts.', longTermValue: 99, difficulty: 'Extremely High' }],
    },
    careerPaths: [{ role: 'Personal Talent Manager / Partner', riskReduction: 45, skillGap: 'Venture architecture info', transitionDifficulty: 'Medium', industryMapping: ['Business'], salaryDelta: '+100-300%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 14, label: '+1yr' }, { year: 2026, riskScore: 16, label: '+2yr' }, { year: 2027, riskScore: 18, label: '+3yr' }, { year: 2028, riskScore: 20, label: '+4yr' }],
    confidenceScore: 98,
  },
  ent_casting_dir: {
    displayRole: 'Casting Director',
    summary: 'High resilience; the art of "Finding the Soul" of a role.',
    skills: {
      obsolete: [{ "skill": "Manual actor availability tracking via phone and email across agent contacts", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI casting platforms auto-track actor availability via integrated casting director communication tools.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard audition tape review pre-screening for technical quality", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI video screening tools auto-filter submissions for technical quality issues before director review.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Human Chemistry Synthesis', whySafe: 'Judging how two or more actors will physically and emotionally interact on screen.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Creative Executive', riskReduction: 50, skillGap: 'Business of film info', transitionDifficulty: 'Hard', industryMapping: ['Studios'], salaryDelta: '+40-80%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 21, label: '+1yr' }, { year: 2026, riskScore: 24, label: '+2yr' }, { year: 2027, riskScore: 27, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }],
    confidenceScore: 97,
  },
  ent_audio_eng_live: {
    displayRole: 'Audio Engineer (Live)',
    summary: 'High resilience in physical world psychoacoustics.',
    skills: {
      obsolete: [{ "skill": "Manual input list data entry and stage plot creation for tour advance", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI production advance tools auto-generate stage plots and input lists from show rider data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard frequency conflict identification in monitor mix builds", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI mixing assistants identify frequency masking conflicts in monitor mixes from spectral analysis.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Real-Time Psychoacoustic Tuning', whySafe: 'Mixing live sound for massive human crowds in acoustically complex physical spaces.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Acoustical Consultant', riskReduction: 45, skillGap: 'Physics degree info', transitionDifficulty: 'Very Hard', industryMapping: ['Architecture'], salaryDelta: '+50-100%', timeToTransition: '48 months' }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 23, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }],
    confidenceScore: 98,
  },
  ent_vo_artist: {
    displayRole: 'Voiceover Artist',
    summary: 'Moderate resilience; extreme disruption in routine commercial VO; resilience in high-stakes narration.',
    skills: {
      obsolete: [{ skill: 'Standard commercial taglines', riskScore: 99, riskType: 'Automatable', horizon: '1styr', reason: 'Synthetic voice clones are indistinguishable for short-form marketing.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard clean room audio noise floor editing and breath removal", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI audio restoration tools auto-remove noise floor, clicks, and breath sounds from voice recordings.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Sustained Narrative Performance', whySafe: 'The ability to carry a 20-hour audiobook or complex character with emotional consistency.', longTermValue: 92, difficulty: 'Medium' }],
    },
    careerPaths: [{ role: 'Performance Capture Actor', riskReduction: 55, skillGap: 'Motion capture tech info', transitionDifficulty: 'Medium', industryMapping: ['Gaming / Film'], salaryDelta: '+30%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 55, label: 'Now' }, { year: 2025, riskScore: 63, label: '+1yr' }, { year: 2026, riskScore: 72, label: '+2yr' }, { year: 2027, riskScore: 80, label: '+3yr' }, { year: 2028, riskScore: 88, label: '+4yr' }],
    confidenceScore: 92,
  },
  ent_scenic_artist: {
    displayRole: 'Scenic Artist',
    summary: 'High resilience; physical artistry in the built environment.',
    skills: {
      obsolete: [{ "skill": "Standard foam carving block layout cutting plans for repeated architectural details", "riskScore": 85, "riskType": "Automatable", "horizon": "2yr", "reason": "AI CNC routing tools cut foam carving blanks from digital templates automatically.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard paint mixing ratio calculation for colour matching", "riskScore": 70, "riskType": "Augmented", "horizon": "2yr", "reason": "AI colour matching tools calculate paint formulas from spectrophotometer readings.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Large-Scale Physical Finishes', whySafe: 'Applying artisanal physical world finishes to massive 3D sets.', longTermValue: 97, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Physical Production Designer', riskReduction: 40, skillGap: 'Budget management info', transitionDifficulty: 'Medium', industryMapping: ['Entertainment'], salaryDelta: '+40%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 23, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }],
    confidenceScore: 98,
  },
  ent_location_mgr: {
    displayRole: 'Location Manager',
    summary: 'High resilience; trust, permits, and physical world logistics.',
    skills: {
      obsolete: [{ "skill": "Manual location fee payment tracking across multiple daily rates in spreadsheets", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI production accounting tools auto-track location fees from signed deal memo data.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard location scouting image organisation and geo-tagging", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI photo management tools auto-geotag, categorise, and present location images for director review.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Institutional Permit Negotiation', whySafe: 'Securing legal and social trust with local communities and governments.', longTermValue: 98, difficulty: 'Medium' }],
    },
    careerPaths: [{ role: 'Unit Production Manager (UPM)', riskReduction: 42, skillGap: 'Union guild rules info', transitionDifficulty: 'Hard', industryMapping: ['Film'], salaryDelta: '+50%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 12, label: 'Now' }, { year: 2025, riskScore: 14, label: '+1yr' }, { year: 2026, riskScore: 16, label: '+2yr' }, { year: 2027, riskScore: 18, label: '+3yr' }, { year: 2028, riskScore: 20, label: '+4yr' }],
    confidenceScore: 99,
  },
  ent_film_editor: {
    displayRole: 'Film Editor (Strategic)',
    summary: 'Moderate resilience; high disruption in routine assembly; resilience in pacing and subtext.',
    skills: {
      obsolete: [{ skill: 'Standard multi-cam assembly', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI auto-switches multi-cam shots based on sound peaks and facial focus.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard dialogue edit clean-up (removing repeats and stumbles)", "riskScore": 80, "riskType": "Augmented", "horizon": "1yr", "reason": "AI audio editing tools auto-identify and suggest removal of duplicate takes, stumbles, and false starts.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Emotional Pacing & Rhythmic Subtext', whySafe: 'Using the "frame" to manipulate human heartbeat and emotional response.', longTermValue: 95, difficulty: 'Very High' }],
    },
    careerPaths: [{ role: 'Creative Director (Post)', riskReduction: 55, skillGap: 'VFX supervision info', transitionDifficulty: 'Hard', industryMapping: ['Advertising'], salaryDelta: '+40-80%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 34, label: '+1yr' }, { year: 2026, riskScore: 40, label: '+2yr' }, { year: 2027, riskScore: 46, label: '+3yr' }, { year: 2028, riskScore: 52, label: '+4yr' }],
    confidenceScore: 96,
  },
  ent_broadcast_eng: {
    displayRole: 'Broadcast Engineer',
    summary: 'High resilience; mission-critical infrastructure for live television.',
    skills: {
      obsolete: [{ "skill": "Manual broadcast signal path documentation update after each infrastructure change", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI network management platforms auto-update signal path documentation from system configuration changes.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard playout server monitoring and alert response", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI broadcast monitoring systems auto-detect playout errors and initiate failover procedures.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'RF & IP Distribution Continuity', whySafe: 'Managing high-stakes physical and cloud broadcast chains.', longTermValue: 99, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Streaming Platform Architect', riskReduction: 52, skillGap: 'Cloud CDN, Low-latency video', transitionDifficulty: 'Hard', industryMapping: ['Tech'], salaryDelta: '+50-100%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 22, label: '+2yr' }, { year: 2027, riskScore: 25, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 98,
  },
  ent_choreographer: {
    displayRole: 'Choreographer',
    summary: 'Extremely high resilience; physical world human motion design.',
    skills: {
      obsolete: [{ "skill": "Manual production call sheet cross-reference with dancer availability calendars", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI production management tools auto-cross-reference call sheets against company availability databases.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard movement notation transcription from rehearsal video", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI pose estimation tools auto-generate movement notation and skeletal data from video recordings.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Kinetic Human Storytelling', whySafe: 'Designing the physical world motion and interaction of multiple human bodies.', longTermValue: 99, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Movement Director (Mo-Cap)', riskReduction: 40, skillGap: 'Bio-mechanics info', transitionDifficulty: 'Medium', industryMapping: ['Gaming / VFX'], salaryDelta: '+40%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 8, label: 'Now' }, { year: 2025, riskScore: 10, label: '+1yr' }, { year: 2026, riskScore: 12, label: '+2yr' }, { year: 2027, riskScore: 13, label: '+3yr' }, { year: 2028, riskScore: 15, label: '+4yr' }],
    confidenceScore: 99,
  },
  ent_media_rights: {
    displayRole: 'Media Rights Manager',
    summary: 'Moderate resilience; high disruption in standard contract tracking.',
    skills: {
      obsolete: [{ skill: 'Standard usage-fee reconciliation', riskScore: 95, riskType: 'Automatable', horizon: '1styr', reason: 'Blockchain and AI automate rights tracking and micro-payments.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard rights window expiry monitoring and renewal flagging", "riskScore": 80, "riskType": "Automatable", "horizon": "1yr", "reason": "AI rights management platforms auto-flag approaching window expirations and generate renewal workflows.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'IP Strategy & Franchise Negotiation', whySafe: 'Navigating the complex multi-party institutional interests of high-value IP.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Franchise Business Lead', riskReduction: 55, skillGap: 'Global finance info', transitionDifficulty: 'Hard', industryMapping: ['Studios'], salaryDelta: '+100%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 32, label: 'Now' }, { year: 2025, riskScore: 39, label: '+1yr' }, { year: 2026, riskScore: 45, label: '+2yr' }, { year: 2027, riskScore: 52, label: '+3yr' }, { year: 2028, riskScore: 58, label: '+4yr' }],
    confidenceScore: 96,
  },
  ent_publicist: {
    displayRole: 'Publicist (Crisis/Celebrity)',
    summary: 'High resilience; trust, timing, and human influence.',
    skills: {
      obsolete: [{ "skill": "Manual press kit PDF compilation and distribution via email attachments", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI PR platforms generate and distribute digital press kits through media contact portals automatically.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard press release distribution and journalist contact list management", "riskScore": 85, "riskType": "Automatable", "horizon": "1yr", "reason": "AI PR platforms auto-distribute releases to curated journalist lists and track open and pickup rates.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Crisis Media Mitigation', whySafe: 'Navigating high-stakes human scandals with human-to-human relationships.', longTermValue: 99, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Reputation Strategist', riskReduction: 45, skillGap: 'Social sentiment data info', transitionDifficulty: 'Medium', industryMapping: ['Corporate'], salaryDelta: '+50%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 20, label: '+2yr' }, { year: 2027, riskScore: 23, label: '+3yr' }, { year: 2028, riskScore: 25, label: '+4yr' }],
    confidenceScore: 98,
  },
  ent_game_narrative: {
    displayRole: 'Game Narrative Designer',
    summary: 'High resilience; designing the complex "Choice-based" narrative architecture.',
    skills: {
      obsolete: [{ "skill": "Standard NPC ambient dialogue line generation for background characters", "riskScore": 95, "riskType": "Automatable", "horizon": "1yr", "reason": "AI dialogue generation tools create contextually appropriate ambient dialogue for non-key NPCs.", "aiReplacement": "Full" }],
      at_risk: [{ "skill": "Standard localization string extraction and format preparation", "riskScore": 80, "riskType": "Automatable", "horizon": "1yr", "reason": "AI localization tools auto-extract strings and prepare formatted files for translation workflows.", "aiReplacement": "Partial" }],
      safe: [{ skill: 'Player Agency Logic Synthesis', whySafe: 'Designing complex branching narratives that maintain thematic consistency.', longTermValue: 98, difficulty: 'High' }],
    },
    careerPaths: [{ role: 'Creative Director (Interactive)', riskReduction: 45, skillGap: 'Experience design info', transitionDifficulty: 'Hard', industryMapping: ['Metaverse / Tech'], salaryDelta: '+60%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 26, label: '+1yr' }, { year: 2026, riskScore: 30, label: '+2yr' }, { year: 2027, riskScore: 34, label: '+3yr' }, { year: 2028, riskScore: 38, label: '+4yr' }],
    confidenceScore: 97,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CREATIVE EXPANSION — 20 additional unique roles
  // ══════════════════════════════════════════════════════════════════════════

  des_arch_viz: {
    displayRole: 'Architectural Visualizer / Render Artist',
    summary: 'Very high disruption in standard visualization; AI generates photo-real renders in seconds.',
    skills: {
      obsolete: [
        { skill: 'Standard 3D architectural walkthrough rendering', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI real-time rendering tools generate photorealistic architectural walkthroughs from CAD files in minutes.', aiReplacement: 'Full', aiTool: 'Midjourney, Enscape, D5 Render AI' },
        { skill: 'Routine perspective elevation production', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI converts 2D floor plans into 3D perspectives automatically.', aiReplacement: 'Full' },
      ],
      at_risk: [{ "skill": "Standard exterior lighting simulation for common daytime conditions", "riskScore": 75, "riskType": "Augmented", "horizon": "2yr", "reason": "AI rendering tools auto-simulate realistic exterior lighting conditions from building coordinates and date/time.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Narrative Spatial Storytelling', whySafe: 'Designing a sequence of views that emotionally sells the experience of a space — not just shows it — requires human understanding of spatial psychology and client brief translation.', longTermValue: 94, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Virtual Production Environment Designer', riskReduction: 58, skillGap: 'Unreal Engine, Real-time environment lighting, Virtual production workflows', transitionDifficulty: 'Medium', industryMapping: ['Film / TV Production', 'Architecture Firms'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 60, label: 'Now' }, { year: 2025, riskScore: 72, label: '+1yr' }, { year: 2026, riskScore: 80, label: '+2yr' }, { year: 2027, riskScore: 86, label: '+3yr' }, { year: 2028, riskScore: 90, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['creative', 'high-risk', 'rapid-automation', 'action-required'],
  },

  cnt_newsletter_writer: {
    displayRole: 'Newsletter / Substack Writer',
    summary: 'Moderate resilience; individual voice and curated perspective survive; generic information newsletters do not.',
    skills: {
      obsolete: [{ skill: 'Curating general news link roundups with summaries', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI news aggregation tools curate and summarize any topic domain automatically with better coverage.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard newsletter subject line A/B testing variant creation", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI email tools generate multiple subject line variants and predict open rate performance.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Irreplaceable Point-of-View (POV) & Trusted Voice', whySafe: 'A specific human\'s perspective, lived experience, and earned authority on a topic is itself the monetizable product — something AI content cannot manufacture.', longTermValue: 99, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Media Entrepreneur / Paid Community Builder', riskReduction: 35, skillGap: 'Community management, Paid tier monetization, Sponsorship sales', transitionDifficulty: 'Medium', industryMapping: ['Independent Media', 'Creator Economy'], salaryDelta: '+50-500% (with scale)', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 50, label: '+1yr' }, { year: 2026, riskScore: 62, label: '+2yr' }, { year: 2027, riskScore: 72, label: '+3yr' }, { year: 2028, riskScore: 80, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['creative', 'moderate-risk', 'creator-economy', 'voice-premium'],
  },

  des_brand_strategist: {
    displayRole: 'Brand Strategist',
    summary: 'High resilience; connecting human cultural truth to commercial brand identity requires irreducible human cultural intelligence.',
    skills: {
      obsolete: [{ "skill": "Manual social listening data export and manual theme categorisation", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI social listening platforms auto-theme and categorise conversation data without manual export.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard competitive brand audit report production', riskScore: 78, riskType: 'Augmented', horizon: '2yr', reason: 'AI brand intelligence platforms auto-generate competitive analysis reports from public data.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Cultural Truth Mining for Brand Positioning', whySafe: 'Identifying the deep, non-obvious cultural tensions and human desires that a brand can authentically own — requires genuine human cultural anthropology expertise and intuition.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Brand Architecture Across Portfolio', whySafe: 'Designing the hierarchy of products, sub-brands, and master brands within a portfolio so they reinforce each other without cannibalizing — requires systems-level human brand judgment.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Chief Brand Officer (CBO)', riskReduction: 35, skillGap: 'P&L ownership, Category marketing, Executive communication', transitionDifficulty: 'Hard', industryMapping: ['CPG', 'Retail', 'Technology'], salaryDelta: '+80-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2025, riskScore: 24, label: '+1yr' }, { year: 2026, riskScore: 29, label: '+2yr' }, { year: 2027, riskScore: 34, label: '+3yr' }, { year: 2028, riskScore: 38, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['creative', 'ai-resilient', 'brand', 'strategic-moat'],
  },

  med_podcast_host: {
    displayRole: 'Podcast Host / Audio Journalist',
    summary: 'High resilience for unique human voices with earned authority; extreme disruption for generic content aggregators.',
    skills: {
      obsolete: [{ skill: 'Standard show notes and episode transcript writing', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'AI transcription and show note tools generate these automatically from audio files.', aiReplacement: 'Full', aiTool: 'Descript AI, Otter.ai' }],
      at_risk: [{ "skill": "Standard episode structure templating for interview formats", "riskScore": 68, "riskType": "Augmented", "horizon": "2yr", "reason": "AI podcast planning tools generate structured episode outlines and question banks from guest bios.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'The Authentic Interview: Eliciting Unexpected Disclosure', whySafe: 'The skill of making a high-profile guest say something they\'ve never said publicly — through earned trust, real-time listening, and human connection — is a rare, irreducible human performance.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [{ role: 'Media Network Founder / Creator Business CEO', riskReduction: 30, skillGap: 'Advertising sales, Content licensing, Paid subscription architecture', transitionDifficulty: 'Hard', industryMapping: ['Independent Media', 'Podcast Networks'], salaryDelta: '+100-1000%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 30, label: '+1yr' }, { year: 2026, riskScore: 40, label: '+2yr' }, { year: 2027, riskScore: 52, label: '+3yr' }, { year: 2028, riskScore: 62, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['creative', 'moderate-risk', 'creator-economy', 'voice-premium'],
  },

  des_product_designer: {
    displayRole: 'Product Designer (Physical Consumer Goods)',
    summary: 'High resilience in physical world sensory design and manufacturing constraint navigation.',
    skills: {
      obsolete: [{ skill: 'Standard CAD concept variation generation', riskScore: 93, riskType: 'Automatable', horizon: '1yr', reason: 'Generative AI CAD tools produce hundreds of design variants from dimensional and functional constraints.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard teardown analysis documentation from competitor products", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI product intelligence tools auto-generate competitive teardown analysis from specification databases.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Manufacturing Reality & Materials Expertise', whySafe: 'Understanding the real-world constraints of injection molding, machining tolerances, and material behavior under physical stress — and designing within them — requires hands-on physical world expertise.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Embodied Usability Research', whySafe: 'Observing how real humans physically interact with a product in real environments — capturing the subtle ergonomic failure modes that usability tools miss — requires human physical presence.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'VP of Hardware Design', riskReduction: 40, skillGap: 'Design leadership at team level, P&L management, Manufacturing partner management', transitionDifficulty: 'Hard', industryMapping: ['Consumer Hardware', 'MedTech', 'Automotive'], salaryDelta: '+50-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 35, label: '+1yr' }, { year: 2026, riskScore: 43, label: '+2yr' }, { year: 2027, riskScore: 51, label: '+3yr' }, { year: 2028, riskScore: 58, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['creative', 'moderate-risk', 'physical-world', 'hardware-design'],
  },

  med_esports_coach: {
    displayRole: 'Esports Coach / Performance Analyst',
    summary: 'High resilience; coaching human performers under competition pressure is irreducibly human despite the digital medium.',
    skills: {
      obsolete: [{ "skill": "Manual clip timestamping and labelling from review session VODs", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI coaching platforms auto-timestamp and label key gameplay events from VOD uploads.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard VOD review and basic stat analysis', riskScore: 78, riskType: 'Augmented', horizon: '2yr', reason: 'AI coaching platforms auto-analyze gameplay footage and generate statistical performance breakdowns.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Mental Performance Coaching Under Pressure', whySafe: 'Preparing a team of 18–25 year olds for the psychological pressure of a world championship — managing tilt, team conflict, and clutch performance — is irreducibly human sports psychology.', longTermValue: 98, difficulty: 'Very High' },
        { skill: 'Team Chemistry and Strategic Trust Architecture', whySafe: 'Building the interpersonal trust between 5 high-ego players that enables communication under 500ms reaction-time conditions — requires human relationship development expertise.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Director of Player Development (Esports Org)', riskReduction: 35, skillGap: 'Sports psychology formal training, Organizational esports management, Recruitment', transitionDifficulty: 'Medium', industryMapping: ['Esports Organizations', 'Gaming Publishers'], salaryDelta: '+40-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 20, label: 'Now' }, { year: 2025, riskScore: 24, label: '+1yr' }, { year: 2026, riskScore: 28, label: '+2yr' }, { year: 2027, riskScore: 34, label: '+3yr' }, { year: 2028, riskScore: 40, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['creative', 'ai-resilient', 'gaming', 'performance-coaching'],
  },

  des_motion_graphic: {
    displayRole: 'Motion Graphics Designer',
    summary: 'Moderate disruption; AI handles template-based work, but complex kinetic brand identity design is resilient.',
    skills: {
      obsolete: [{ skill: 'Standard lower third and transition template production', riskScore: 95, riskType: 'Automatable', horizon: '1yr', reason: 'AI motion template generators produce broadcast-ready lower thirds and transitions from brand assets instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard icon animation from static vector assets", "riskScore": 78, "riskType": "Augmented", "horizon": "2yr", "reason": "AI animation tools auto-generate natural motion for static icons from style reference inputs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Kinetic Brand Identity Design', whySafe: 'Designing the motion language of a brand — how a logo breathes, transitions, and emotes in a way that feels unmistakably "them" — requires deep design sensibility and brand understanding.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Creative Technologist (Realtime Motion)', riskReduction: 55, skillGap: 'TouchDesigner, Notch, Realtime generative art', transitionDifficulty: 'Hard', industryMapping: ['Live Events', 'Broadcast', 'Installations'], salaryDelta: '+40-80%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 45, label: 'Now' }, { year: 2025, riskScore: 55, label: '+1yr' }, { year: 2026, riskScore: 64, label: '+2yr' }, { year: 2027, riskScore: 72, label: '+3yr' }, { year: 2028, riskScore: 79, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['creative', 'moderate-risk', 'motion-design', 'automation-zone'],
  },

  med_influencer_mgr: {
    displayRole: 'Influencer Marketing Manager',
    summary: 'Moderate disruption; creator discovery is automated, but relationship management and brand-creator alignment survive.',
    skills: {
      obsolete: [{ skill: 'Manual influencer discovery and reach spreadsheet tracking', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI influencer platforms (Grin, Aspire) discover, analyze, and track influencers with far greater accuracy and scale.', aiReplacement: 'Full' }],
      at_risk: [{ skill: 'Standard campaign performance reporting', riskScore: 85, riskType: 'Automatable', horizon: '1yr', reason: 'AI campaign analytics auto-generate performance reports from platform APIs.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Creator Relationship & Long-Term Partnership Development', whySafe: 'Building the authentic, trusted, multi-year relationship with high-value creators — so they advocate genuinely vs. just accepting payment — is irreducibly human.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Creator Economy Revenue Lead', riskReduction: 48, skillGap: 'Creator fund management, Content licensing rights, Platform partnership strategy', transitionDifficulty: 'Medium', industryMapping: ['DTC Brands', 'Agencies', 'Creator Platforms'], salaryDelta: '+30-80%', timeToTransition: '12 months', months_to_first_income: 4, income_dip_months: 2 }],
    riskTrend: [{ year: 2024, riskScore: 42, label: 'Now' }, { year: 2025, riskScore: 52, label: '+1yr' }, { year: 2026, riskScore: 61, label: '+2yr' }, { year: 2027, riskScore: 69, label: '+3yr' }, { year: 2028, riskScore: 75, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['creative', 'moderate-risk', 'creator-economy', 'marketing'],
  },

  med_sports_agent: {
    displayRole: 'Sports Agent / Athlete Representative',
    summary: 'Very high resilience; negotiating the economic life of a human athlete requires irreducible trust and relationship capital.',
    skills: {
      obsolete: [{ "skill": "Manual media coverage tracking and clipping archiving for client profiles", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI media monitoring tools auto-track and archive all sports media coverage by athlete name.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard contract comparison and league benchmarking', riskScore: 82, riskType: 'Augmented', horizon: '2yr', reason: 'AI contract analytics tools benchmark athlete contract terms against market data automatically.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Athlete Trust & Career Vision Architecture', whySafe: 'Advising a professional athlete on the career decisions — team selection, brand deals, endorsements, life after sport — that shape their entire financial and personal future requires irreducible trusted advisor status.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Cross-Sport & Entertainment Brand Extension Negotiation', whySafe: 'Developing and negotiating an athlete\'s brand beyond sport — into media, business, and entertainment — requires connections, creativity, and human commercial vision.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Partner at Sports Management Firm', riskReduction: 20, skillGap: 'Business equity structuring, Deal flow in non-sport sectors', transitionDifficulty: 'Hard', industryMapping: ['Sports Agencies', 'Entertainment Companies'], salaryDelta: '+100-300%', timeToTransition: '48 months' }],
    riskTrend: [{ year: 2024, riskScore: 10, label: 'Now' }, { year: 2025, riskScore: 11, label: '+1yr' }, { year: 2026, riskScore: 12, label: '+2yr' }, { year: 2027, riskScore: 13, label: '+3yr' }, { year: 2028, riskScore: 15, label: '+4yr' }],
    confidenceScore: 98,
    contextTags: ['creative', 'ai-resilient', 'sports', 'trust-critical', 'relationship-moat'],
  },

  des_packaging_designer: {
    displayRole: 'Packaging Designer',
    summary: 'Moderate resilience; shelf psychology and material constraint expertise survive AI disruption in execution.',
    skills: {
      obsolete: [{ skill: 'Standard dieline and mockup generation from brief', riskScore: 93, riskType: 'Automatable', horizon: '1yr', reason: 'AI packaging design tools generate complete dielines and photorealistic mockups from product specifications instantly.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard competitive shelf audit photo documentation and basic annotation", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI retail analytics tools auto-capture and annotate shelf photos from store audit devices.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Retail Shelf-Standout Psychology', whySafe: 'Understanding how packaging competes for attention at 3 meters of shelf distance — color contrast, hierarchy, motion-cue, and shopper behavioral psychology — requires human retail observation expertise.', longTermValue: 95, difficulty: 'High' },
        { skill: 'Sustainable Packaging Architecture', whySafe: 'Navigating the complex trade-offs between material sustainability, cost, shelf-life requirements, and structural integrity — within real manufacturing constraints — requires multi-disciplinary human engineering judgment.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Sustainable Packaging Innovation Lead', riskReduction: 50, skillGap: 'Materials science basics, Circular economy design, ESG reporting', transitionDifficulty: 'Medium', industryMapping: ['CPG', 'Retail', 'FMCG'], salaryDelta: '+30-70%', timeToTransition: '18 months', months_to_first_income: 6, income_dip_months: 3 }],
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 48, label: '+1yr' }, { year: 2026, riskScore: 57, label: '+2yr' }, { year: 2027, riskScore: 64, label: '+3yr' }, { year: 2028, riskScore: 70, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['creative', 'moderate-risk', 'packaging', 'sustainable-design'],
  },

  ent_stand_up_comedian: {
    displayRole: 'Stand-Up Comedian / Live Performer',
    summary: 'Extremely high resilience; live human laughter is one of the most distinctly human experiences.',
    skills: {
      obsolete: [{ "skill": "Manual show recording transcription for set analysis and new material development", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI transcription tools auto-transcribe show recordings for set analysis with timestamps.", "aiReplacement": "Full", "aiTool": "Descript, Otter AI" }],
      at_risk: [{ "skill": "Standard one-liner joke refinement using A/B testing across social media", "riskScore": 65, "riskType": "Augmented", "horizon": "3yr", "reason": "AI content tools can A/B test joke framings on social media and surface high-engagement variants.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Real-Time Human Crowd Reading & Adaptation', whySafe: 'Reading a live audience\'s collective energy and adapting material in real-time — including crowd work and improvisation — is a live human social performance no AI can replicate in person.', longTermValue: 99, difficulty: 'Extremely High' },
        { skill: 'Personal Truth Comedy Architecture', whySafe: 'Mining the specific lived experiences, traumas, and observations of one person\'s human life into universal comedy — the creative act of stand-up — requires a human life to be lived first.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [{ role: 'TV Writer / Creator (Own Show)', riskReduction: 28, skillGap: 'TV pitch format, Showrunner development, Writers\' room dynamics', transitionDifficulty: 'Hard', industryMapping: ['TV Studios', 'Streaming Platforms'], salaryDelta: '+200-1000%', timeToTransition: '48 months' }],
    riskTrend: [{ year: 2024, riskScore: 3, label: 'Now' }, { year: 2026, riskScore: 4, label: '+2yr' }, { year: 2027, riskScore: 5, label: '+3yr' }, { year: 2028, riskScore: 6, label: '+4yr' }, { year: 2029, riskScore: 7, label: '+5yr' }],
    confidenceScore: 99,
    contextTags: ['creative', 'irreplaceable', 'physical-performance', 'human-touch'],
  },

  des_spatial_exp: {
    displayRole: 'Spatial / Experience Designer (Museum, Exhibition)',
    summary: 'High resilience; designing the emotional journey through physical space is a deeply human craft.',
    skills: {
      obsolete: [{ "skill": "Manual exhibition layout label typesetting and production specification preparation", "riskScore": 90, "riskType": "Automatable", "horizon": "1yr", "reason": "AI design tools auto-generate production-ready label layouts from exhibition content spreadsheets.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard 2D floor plan and wayfinding signage production', riskScore: 80, riskType: 'Automatable', horizon: '2yr', reason: 'AI spatial design tools auto-generate wayfinding systems and floor plan layouts from spatial dimensions.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Emotional Narrative Pacing Through Physical Space', whySafe: 'Designing how a visitor\'s emotional state transforms as they move through a sequence of physical environments — controlling revelation, rest, and climax — requires deep human spatial psychology.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [{ role: 'Experience Design Director (Theme Park / World Expo)', riskReduction: 35, skillGap: 'Large-scale project management, Budget governance, Contractor coordination', transitionDifficulty: 'Hard', industryMapping: ['Theme Parks', 'Events', 'Retail Environments'], salaryDelta: '+50-120%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 21, label: '+2yr' }, { year: 2027, riskScore: 24, label: '+3yr' }, { year: 2028, riskScore: 28, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['creative', 'ai-resilient', 'physical-world', 'experience-design'],
  },

  med_sports_broadcaster: {
    displayRole: 'Sports Broadcaster / Commentator',
    summary: 'Moderate resilience for unique voices; extreme disruption for commodity sports data narration.',
    skills: {
      obsolete: [{ skill: 'Standard sports statistics reading and simple narration', riskScore: 96, riskType: 'Automatable', horizon: '1yr', reason: 'AI sports commentary tools narrate live game statistics in real-time.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard pre-match statistical background research and talking point preparation", "riskScore": 76, "riskType": "Augmented", "horizon": "2yr", "reason": "AI sports intelligence tools auto-generate pre-match data packages and talking points from real-time statistics.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Spontaneous Story Synthesis in Live Moments', whySafe: 'Identifying and articulating the human story behind a sporting moment as it happens — the comeback, the heartbreak, the career-defining play — is a live human creative and emotional act.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Sports Media Executive / Content Director', riskReduction: 42, skillGap: 'Content strategy, Rights negotiation basics, Audience development', transitionDifficulty: 'Hard', industryMapping: ['Sports Networks', 'Streaming Platforms'], salaryDelta: '+40-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 32, label: 'Now' }, { year: 2025, riskScore: 42, label: '+1yr' }, { year: 2026, riskScore: 55, label: '+2yr' }, { year: 2027, riskScore: 65, label: '+3yr' }, { year: 2028, riskScore: 72, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['creative', 'moderate-risk', 'sports', 'media'],
  },

  cnt_ghostwriter: {
    displayRole: 'Ghostwriter / Executive Content Strategist',
    summary: 'Moderate resilience; capturing authentic human voice on high-stakes content (books, speeches) is a durable human service.',
    skills: {
      obsolete: [{ skill: 'Standard listicle and trade article ghost-writing', riskScore: 98, riskType: 'Automatable', horizon: '1yr', reason: 'LLMs produce trade articles and listicles indistinguishably from average ghostwriters.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard SEO keyword research and article outline generation for content briefs", "riskScore": 82, "riskType": "Augmented", "horizon": "1yr", "reason": "AI SEO tools auto-generate keyword-optimised article outlines from topic inputs.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Thought Leader Voice Capture & Book Architecture', whySafe: 'Extracting the unique ideas, stories, and authentic voice of a senior executive — and architecting them into a book that advances their career — requires deep human interview and editorial artistry.', longTermValue: 96, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Executive Communications Director', riskReduction: 52, skillGap: 'C-suite communications strategy, Crisis messaging, Board relations', transitionDifficulty: 'Hard', industryMapping: ['Large Corporates', 'Political Campaigns', 'PE Firms'], salaryDelta: '+60-150%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 48, label: 'Now' }, { year: 2025, riskScore: 60, label: '+1yr' }, { year: 2026, riskScore: 70, label: '+2yr' }, { year: 2027, riskScore: 78, label: '+3yr' }, { year: 2028, riskScore: 84, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['creative', 'high-risk', 'pivot-window', 'voice-premium', 'action-required'],
  },

  med_creative_director_adv: {
    displayRole: 'Creative Director (Advertising Agency)',
    summary: 'High resilience at strategic level; executional production roles below this level face extreme disruption.',
    skills: {
      obsolete: [{ "skill": "Manual competitor creative monitoring via manual advertising swipe file collection", "riskScore": 92, "riskType": "Automatable", "horizon": "1yr", "reason": "AI creative intelligence tools continuously monitor and catalogue competitor advertising across all channels.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard creative concept development for routine briefs', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI creative tools generate multiple campaign concepts from strategic briefs in minutes, replacing junior creative iterations.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Human Cultural Tension Identification for Breakthrough Campaigns', whySafe: 'Identifying the specific social tension — the thing people feel but no brand has said yet — that makes a campaign culturally resonant, not just visually attractive.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Client Vision Translation & High-Stakes Presentation', whySafe: 'Reading what a client really needs (vs. what they ask for) and presenting creative work in a way that builds their courage to take the risk — is an irreducibly human commercial psychology skill.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Chief Creative Officer (CCO) / ECD', riskReduction: 30, skillGap: 'Agency P&L management, Business development, Award strategy', transitionDifficulty: 'Hard', industryMapping: ['Advertising Agencies', 'Brand Consultancies'], salaryDelta: '+60-200%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 18, label: 'Now' }, { year: 2025, riskScore: 22, label: '+1yr' }, { year: 2026, riskScore: 26, label: '+2yr' }, { year: 2027, riskScore: 30, label: '+3yr' }, { year: 2028, riskScore: 35, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['creative', 'ai-resilient', 'advertising', 'leadership-premium', 'strategic-moat'],
  },

  des_typeface_designer: {
    displayRole: 'Typeface / Typography Designer',
    summary: 'Very high resilience; the micro-detail of letterform design requires decades of trained human perception.',
    skills: {
      obsolete: [{ "skill": "Manual font metrics testing table construction for cross-platform rendering checks", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI font testing tools auto-render and compare type metrics across platforms and rendering environments.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard variable font axis generation from masters', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI type tools auto-generate intermediate weights and variable font axes from drawn masters.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Letterform Optical Correction & Micro-Perception', whySafe: 'The trained human eye for optical illusions in letterform spacing, weight distribution, and curve behavior — developed over years of study — produces type that "feels right" in ways metrics cannot capture.', longTermValue: 99, difficulty: 'Extremely High' },
      ],
    },
    careerPaths: [{ role: 'Typography Art Director / Type Foundry Principal', riskReduction: 20, skillGap: 'Font licensing business, Variable font engineering, Enterprise type licensing', transitionDifficulty: 'Hard', industryMapping: ['Type Foundries', 'Brand Identity Agencies'], salaryDelta: '+40-100%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 15, label: 'Now' }, { year: 2025, riskScore: 18, label: '+1yr' }, { year: 2026, riskScore: 22, label: '+2yr' }, { year: 2027, riskScore: 26, label: '+3yr' }, { year: 2028, riskScore: 30, label: '+4yr' }],
    confidenceScore: 97,
    contextTags: ['creative', 'ai-resilient', 'craft-moat', 'perception-expertise'],
  },

  cnt_game_streamer: {
    displayRole: 'Gaming Content Creator / Streamer',
    summary: 'High resilience for top-tier personalities; extreme disruption for commodity gameplay content producers.',
    skills: {
      obsolete: [{ skill: 'Routine highlight clip compilation and editing', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI video tools auto-generate compelling highlight clips from hours of raw gameplay footage.', aiReplacement: 'Full' }],
      at_risk: [{ "skill": "Standard Twitch/YouTube thumbnail A/B optimisation via manual variant creation", "riskScore": 72, "riskType": "Augmented", "horizon": "2yr", "reason": "AI thumbnail generation tools create and auto-test multiple thumbnail variants for engagement.", "aiReplacement": "Partial" }],
      safe: [
        { skill: 'Live Parasocial Relationship Architecture', whySafe: 'Building the authentic, ongoing relationship with an audience that keeps them coming back — through genuine personality, shared experience, and community — is a distinctly human social function.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Creator-Founded Gaming Company / IP Owner', riskReduction: 35, skillGap: 'Business formation, IP licensing, Audience monetization platforms', transitionDifficulty: 'Hard', industryMapping: ['Gaming Companies', 'Creator Economy'], salaryDelta: '+200-∞%', timeToTransition: '36 months', months_to_first_income: 10, income_dip_months: 5 }],
    riskTrend: [{ year: 2024, riskScore: 25, label: 'Now' }, { year: 2025, riskScore: 35, label: '+1yr' }, { year: 2026, riskScore: 47, label: '+2yr' }, { year: 2027, riskScore: 58, label: '+3yr' }, { year: 2028, riskScore: 67, label: '+4yr' }],
    confidenceScore: 93,
    contextTags: ['creative', 'moderate-risk', 'gaming', 'creator-economy'],
  },

  med_music_supervisor: {
    displayRole: 'Music Supervisor (Film / TV / Advertising)',
    summary: 'Moderate resilience; music-picture emotional synchrony judgment is a deep human editorial skill.',
    skills: {
      obsolete: [{ "skill": "Manual temp track music replacement suggestion from composer pitches", "riskScore": 88, "riskType": "Automatable", "horizon": "1yr", "reason": "AI music search tools find production music options that acoustically match temp tracks from audio fingerprinting.", "aiReplacement": "Full" }],
      at_risk: [{ skill: 'Standard sync licensing paperwork and rights clearance', riskScore: 85, riskType: 'Automatable', horizon: '2yr', reason: 'AI rights management platforms automate licensing paperwork and clearance for standard rights combinations.', aiReplacement: 'Partial' }],
      safe: [
        { skill: 'Emotional Soundtrack Architecture for Picture', whySafe: 'Selecting music that amplifies a specific emotional moment in a scene — where the gap between "works" and "transcendent" is invisible to metrics but obvious to human feeling — requires deep emotional intelligence.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [{ role: 'Head of Music (Streaming Platform)', riskReduction: 40, skillGap: 'Catalog licensing strategy, Artist development, Music business finance', transitionDifficulty: 'Hard', industryMapping: ['Streaming Platforms', 'Gaming Companies', 'Ad Agencies'], salaryDelta: '+40-100%', timeToTransition: '24 months', months_to_first_income: 8, income_dip_months: 4 }],
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 36, label: '+1yr' }, { year: 2026, riskScore: 45, label: '+2yr' }, { year: 2027, riskScore: 54, label: '+3yr' }, { year: 2028, riskScore: 62, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['creative', 'moderate-risk', 'music', 'editorial-judgment'],
  },
};

