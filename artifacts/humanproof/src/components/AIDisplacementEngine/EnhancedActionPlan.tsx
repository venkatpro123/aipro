// EnhancedActionPlan — §8 Personal Action Plan
// Fully personalized: role + country + experience + D7 conditioned.
// 4 time horizons + OutcomeSimulationPanel.

import React, { useState } from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';
import type { TrajectoryResult } from '../../services/DisplacementTrajectoryEngine';
import type { AutomationTimeline } from '../../data/automationTimelineData';
import { StrategicRoadmap } from '../StrategicRoadmap';
import { OutcomeSimulationPanel } from './OutcomeSimulationPanel';
import { getCountryCluster } from '../../data/intelligence/countryIntelligenceModifier';

interface Props {
  intel: CareerIntelligence | null;
  experience: string;
  score: number;
  trajectory: TrajectoryResult | null;
  scoreColor: string;
  salaryRange?: string;
  countryKey?: string;
  industryKey?: string;
  roleKey?: string;
  d7Score?: number;
  automationTimeline?: AutomationTimeline | null;
}

type Horizon = '30d' | '90d' | '12m' | 'threshold';
type ExpTier = 'entry' | 'early' | 'mid' | 'senior' | 'principal';

interface ActionCard {
  title: string;
  detail: string;
  riskReduction: number;
  protectionIncrease: number;
  effort: 'Low' | 'Medium' | 'High';
  category: 'Skill' | 'Network' | 'Positioning' | 'Financial';
  strategicImpact?: 'Critical' | 'High' | 'Medium' | 'Low';
  timeRequired?: string;
  roi?: 'Exceptional' | 'High' | 'Moderate' | 'Low';
}

const EFFORT_COLORS = { Low: 'var(--emerald)', Medium: 'var(--amber)', High: 'var(--red)' };
const CAT_COLORS = { Skill: 'var(--cyan)', Network: 'var(--violet)', Positioning: 'var(--amber)', Financial: 'var(--emerald)' };
const IMPACT_COLORS = { Critical: 'var(--red)', High: 'var(--amber)', Medium: 'var(--cyan)', Low: 'var(--text-3)' };
const ROI_COLORS = { Exceptional: 'var(--emerald)', High: 'var(--cyan)', Moderate: 'var(--amber)', Low: 'var(--text-3)' };

function getExpTier(experience: string): ExpTier {
  if (experience === '0-2')  return 'entry';
  if (experience === '2-5')  return 'early';
  if (experience === '5-10') return 'mid';
  if (experience === '10-20')return 'senior';
  return 'principal';
}

function getCountryPlatformNote(countryKey: string): { platform: string; certNote: string; bufferCurrency: string } {
  const cluster = getCountryCluster(countryKey);
  if (cluster === 'south_asia')   return { platform: 'LinkedIn India, Naukri, Instahyre', certNote: 'NASSCOM FutureSkills or Coursera (India pricing)', bufferCurrency: '₹3–6L' };
  if (cluster === 'north_america')return { platform: 'LinkedIn, Glassdoor, Levels.fyi', certNote: 'Coursera, LinkedIn Learning, or vendor certs', bufferCurrency: '$15k–$30k' };
  if (cluster === 'europe')       return { platform: 'LinkedIn, XING (DE), Jobteaser', certNote: 'EU AI Act awareness + vendor AI certs', bufferCurrency: '€10k–€25k' };
  if (cluster === 'gcc')          return { platform: 'LinkedIn, Bayt, GulfTalent', certNote: 'Vendor certs (Microsoft, AWS)', bufferCurrency: 'AED 30k–60k' };
  if (cluster === 'sea')          return { platform: 'LinkedIn, JobStreet, MyCareersFuture', certNote: 'Coursera or AWS/Google certs', bufferCurrency: 'SGD 10k–25k' };
  return { platform: 'LinkedIn, local job boards', certNote: 'Coursera or vendor AI certifications', bufferCurrency: '3–6 months salary' };
}

function getRoleFirst30DayAction(roleKey: string, roleLabel: string): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();

  // Software / engineering — sw_*, em_vibe_coder, em_agentic_sys_designer, em_spatial_computing_dev
  const isSWE = rl.startsWith('sw_') || rl.startsWith('em_vibe') || rl.startsWith('em_agentic') || rl.startsWith('em_spatial') || rl.startsWith('em_digital_human') || rl.startsWith('em_robotics') || rl.includes('swe') || rl.includes('software') || rl.includes('developer') || rl.includes('frontend') || rl.includes('backend') || rl.includes('fullstack');
  if (isSWE)
    return { title: 'Audit which of your recent work an LLM could generate without you', detail: 'Review your last 10 pull requests or tasks. Score each: could Claude Code or Cursor have written this with a good prompt? The ones that score "yes" are your highest-displacement tasks. The ones that score "no" are your moat. This audit becomes your personalized repositioning roadmap.', riskReduction: 4, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Data / ML / AI — da_*, ml_*, ds_*, em_synthetic_data_eng, em_climate_ai_analyst
  const isData = rl.startsWith('da_') || rl.startsWith('ml_') || rl.startsWith('ds_') || rl.startsWith('em_synthetic') || rl.startsWith('em_climate') || rl.startsWith('em_llm') || rl.startsWith('em_ai_') || rl.includes('data_analyst') || rl.includes('data_scientist') || rl.includes('machine_learning');
  if (isData)
    return { title: 'Document the business decisions that required your data interpretation — not just the output', detail: 'Your non-displaceable value is not producing charts; it is translating ambiguous data into decisions under uncertainty. Review your last 5 analyses: where did you catch something a dashboard would have missed? Where did context, business knowledge, or instinct matter more than the number? That list is your moat.', riskReduction: 4, protectionIncrease: 8, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Finance / accounting / investment — fin_*, inv_*, ins_*, ec_*
  const isFinance = rl.startsWith('fin_') || rl.startsWith('inv_') || rl.startsWith('ins_') || rl.startsWith('ec_') || rl.includes('financial') || rl.includes('finance') || rl.includes('invest') || rl.includes('account') || rl.includes('actuar');
  if (isFinance)
    return { title: 'Identify which of your analyses required contextual judgment no AI prompted', detail: 'Review your last 5 major deliverables. For each, ask: what decision or insight required your knowledge of organizational context, relationship dynamics, or business strategy that no AI tool could have surfaced from the data alone? Document these moments — they define your non-displaceable value.', riskReduction: 4, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Healthcare / nursing / mental health / medical — hc_*, nur_*, mh_*, vet_*
  const isHealthcare = rl.startsWith('hc_') || rl.startsWith('nur_') || rl.startsWith('mh_') || rl.startsWith('vet_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('doctor') || rl.includes('clinical') || rl.includes('therapist') || rl.includes('pharmacist');
  if (isHealthcare)
    return { title: 'Map the clinical tasks where your physical presence was irreplaceable this week', detail: 'Identify 3 patient interactions this week that required your physical presence, touch, or in-person emotional attunement. Document what would have been lost without you in the room. This is not just a resilience exercise — it is also career positioning evidence for the AI-augmented clinical era.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs', roi: 'Moderate' };

  // BPO / customer support / CX — bpo_*, cx_*, adm_*
  const isBPO = rl.startsWith('bpo_') || rl.startsWith('cx_') || rl.startsWith('adm_') || rl.includes('customer_support') || rl.includes('support') || rl.includes('customer service');
  if (isBPO)
    return { title: 'Document your 5 highest-complexity escalation cases', detail: 'Write up the 5 most complex customer situations you resolved that required genuine human judgment — emotional intelligence, regulatory nuance, or multi-system context. These cases are your displacement shield: they demonstrate irreplaceable capability no AI system handles today.', riskReduction: 4, protectionIncrease: 8, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–4 hrs total', roi: 'High' };

  // Security / DevOps / Cloud / Infra — sec_*, dev_*, cloud_*
  const isSecOps = rl.startsWith('sec_') || rl.startsWith('dev_') || rl.startsWith('cloud_') || rl.startsWith('em_ai_red') || rl.includes('security') || rl.includes('devops') || rl.includes('sre') || rl.includes('cloud') || rl.includes('infra');
  if (isSecOps)
    return { title: 'Document your last 3 incidents: what would an AI have missed?', detail: 'Write up your last 3 production incidents or security events. For each, identify the specific moment where human pattern recognition, cross-system context, or organizational judgment was decisive. This documentation is your proof of non-displaceable value — and becomes your strongest career positioning asset.', riskReduction: 4, protectionIncrease: 9, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–4 hrs', roi: 'High' };

  // HR / People — hr_*, po_*
  const isHR = rl.startsWith('hr_') || rl.startsWith('po_') || rl.includes('human resources') || rl.includes('recruiter') || rl.includes('talent');
  if (isHR)
    return { title: 'Map your highest-trust, most human-sensitive interactions from the past month', detail: 'List every conversation in the past 30 days that required genuine empathy, confidentiality, or conflict navigation. These interactions — performance conversations, sensitive exits, wellbeing check-ins — are where AI tools categorically fail and you are irreplaceable. Documenting this pattern is your repositioning evidence.', riskReduction: 3, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Legal — leg_*, comp_law
  const isLegal = rl.startsWith('leg_') || rl.startsWith('comp_law') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('attorney') || rl.includes('paralegal') || rl.includes('compliance');
  if (isLegal)
    return { title: 'Identify the judgment calls in your last 5 matters that required case-specific strategy', detail: 'Review your last 5 matters or compliance cases. For each, document the moment where legal strategy, risk calibration, or relationship context — not just research — determined the outcome. Those moments are what AI legal research tools cannot replicate and what clients are actually paying for.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  // Consulting / strategy — con_*, pm_*
  const isConsulting = rl.startsWith('con_') || rl.startsWith('pm_') || rl.includes('consultant') || rl.includes('strategy') || rl.includes('management') || rl.includes('program_manager') || rl.includes('product_manager');
  if (isConsulting)
    return { title: 'Document the stakeholder dynamics that determined your last 3 project outcomes', detail: 'In consulting and strategy, the analysis is rarely the hardest part — the navigation is. Write up the last 3 projects: where did stakeholder trust, political context, or relationship capital determine what was actually implemented? That navigation skill is your irreplaceable advantage in the AI era.', riskReduction: 3, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Marketing / content / creative — mkt_*, cnt_*, crt_*, des_*
  const isMarketing = rl.startsWith('mkt_') || rl.startsWith('cnt_') || rl.startsWith('crt_') || rl.startsWith('des_') || rl.includes('marketing') || rl.includes('content') || rl.includes('creative') || rl.includes('design') || rl.includes('copywriter');
  if (isMarketing)
    return { title: 'Map the creative decisions this month where brand instinct, not templates, drove results', detail: 'AI tools can generate infinite content variants — but brand coherence, audience intuition, and creative risk-taking require a human with deep context. Document 3 creative decisions from the past month where your judgment, not a prompt, shaped the output. That judgment is your positioning evidence.', riskReduction: 3, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  // Education — edu_*, edt_*, tr_*
  const isEducation = rl.startsWith('edu_') || rl.startsWith('edt_') || rl.startsWith('tr_') || rl.includes('teacher') || rl.includes('professor') || rl.includes('instructor') || rl.includes('trainer') || rl.includes('educator');
  if (isEducation)
    return { title: 'Document the student breakthroughs that required your personal intervention', detail: 'Identify 3 moments from the past term where a student\'s progress depended on your specific intervention — recognizing a struggle, adapting your explanation, or providing emotional support. These moments are where teaching is categorically irreplaceable. They are also your professional differentiation narrative.', riskReduction: 2, protectionIncrease: 5, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs', roi: 'Moderate' };

  // Logistics / supply chain / ops — log_*, ops_*, sc_*
  const isLogistics = rl.startsWith('log_') || rl.startsWith('ops_') || rl.startsWith('sc_') || rl.includes('logistics') || rl.includes('supply_chain') || rl.includes('operations') || rl.includes('warehouse');
  if (isLogistics)
    return { title: 'Document the supply chain exceptions you resolved that systems flagged but could not solve', detail: 'Every logistics role has moments where the system raises an alert but the resolution requires calling a supplier, understanding a seasonal pattern, or reading a relationship. Collect your last 5 of those moments. They define the human-essential layer of your role that process automation cannot capture.', riskReduction: 4, protectionIncrease: 8, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Manufacturing / trades / industrial — mfg_*, trd_*, ind_*
  const isManufacturing = rl.startsWith('mfg_') || rl.startsWith('trd_') || rl.startsWith('ind_') || rl.includes('manufacturing') || rl.includes('electrician') || rl.includes('plumber') || rl.includes('machinist') || rl.includes('welder') || rl.includes('technician');
  if (isManufacturing)
    return { title: 'Document 3 physical problem-solving moments this month that required hands-on expertise', detail: 'Skilled trades and manufacturing have the highest natural protection against AI displacement — but only when that expertise is visible and documented. Write up 3 situations where your physical presence, tactile judgment, or on-the-job experience resolved something no sensor or AI model could have. This is your career positioning record.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs', roi: 'Moderate' };

  // Sales / retail / real estate — sal_*, ret_*, re_*
  const isSales = rl.startsWith('sal_') || rl.startsWith('ret_') || rl.startsWith('re_') || rl.includes('sales') || rl.includes('account_exec') || rl.includes('business_dev') || rl.includes('retail') || rl.includes('real_estate');
  if (isSales)
    return { title: 'Identify which of your closed deals required relationship capital that AI cannot replicate', detail: 'Review your last 10 deals or customer interactions. Which closed because of your specific relationship, your personal credibility, or the trust you built over time? Those are your irreplaceable contributions — and the foundation of your non-displaceable positioning in an AI-assisted sales environment.', riskReduction: 3, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Government / public sector / NGO — gov_*, pub_*, ngo_*, ph_*
  const isGovPublic = rl.startsWith('gov_') || rl.startsWith('pub_') || rl.startsWith('ngo_') || rl.startsWith('ph_') || rl.includes('government') || rl.includes('public_sector') || rl.includes('nonprofit') || rl.includes('policy');
  if (isGovPublic)
    return { title: 'Map the stakeholder relationships that make your policy or program work actually move', detail: 'In public sector and NGO work, execution depends on coalition-building and trust that no AI system can forge. Document the key relationships you maintain that translate plans into outcomes. This network is your irreplaceable asset — and your career insurance.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  // AI orchestration / governance / transformation — em_agent_ops, em_ai_workflow, em_ai_governance, em_ai_transformation, em_ai_workforce
  const isAIOrch = rl.startsWith('em_agent_ops') || rl.startsWith('em_ai_workflow') || rl.startsWith('em_ai_governance') || rl.startsWith('em_ai_transformation') || rl.startsWith('em_ai_workforce') || rl.startsWith('em_autonomous') || rl.startsWith('em_human_ai') || rl.includes('agent operations') || rl.includes('ai governance') || rl.includes('ai transformation');
  if (isAIOrch)
    return { title: 'Document the AI system failures or misalignments you caught and corrected this month', detail: 'Human-AI orchestration roles derive their value from catching what AI systems get wrong — hallucinations, misaligned incentives, edge cases, and trust failures. Document 3 moments this month where your oversight changed an AI-generated output. This is your proof of irreplaceable supervisory value in the agentic era.', riskReduction: 2, protectionIncrease: 8, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Media / journalism — med_*
  const isMedia = rl.startsWith('med_');
  if (isMedia)
    return { title: 'Document the investigative insights from your last 3 stories that no AI could have found', detail: 'Your non-displaceable value is source relationships, editorial instinct, and the original angles you see that no AI generates from a prompt. Write up your last 3 stories: which facts came from a human source who trusted you personally? Which editorial angles emerged from field observation rather than data? That record is your positioning evidence in the AI content era.', riskReduction: 3, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Animation / photography / video — anim_*, photo_*, video_*
  const isCreativeVisual = rl.startsWith('anim_') || rl.startsWith('photo_') || rl.startsWith('video_');
  if (isCreativeVisual)
    return { title: 'Identify the creative decisions this month where your artistic direction — not execution — made the difference', detail: 'AI tools can generate infinite visual variants; what they cannot do is decide which one is right for this client, this brand, this emotional moment. Document 3 creative decisions from the past month where your judgment — not a prompt — shaped the final output. That judgment is your career moat.', riskReduction: 3, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  // Travel / hospitality — trav_*
  const isTravel = rl.startsWith('trav_');
  if (isTravel)
    return { title: 'Document your last 5 complex client situations that required personal knowledge AI couldn\'t provide', detail: 'AI travel tools handle standard bookings well. Your value is the judgment call when an itinerary breaks down, the local knowledge that saved a trip, the personal relationship that got a client a room during a sold-out week. Document 5 of these situations. They define the irreplaceable layer of your role.', riskReduction: 3, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  // Aerospace — aero_*
  const isAerospace = rl.startsWith('aero_');
  if (isAerospace)
    return { title: 'Document the safety-critical judgment calls you made this month that simulation couldn\'t resolve', detail: 'Simulation and AI tools flag anomalies — but the physical inspection instinct, the multi-system context awareness, and the safety sign-off judgment are yours. Write up 3 situations this month where your on-the-ground expertise changed the outcome of an AI-flagged issue. These are your irreplaceable credentials.', riskReduction: 2, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // Agriculture — agri_*
  const isAgriculture = rl.startsWith('agri_');
  if (isAgriculture)
    return { title: 'Map the field observations this season where your on-the-ground judgment changed what the model recommended', detail: 'Precision ag tools give recommendations — but local soil variability, microclimate patterns, and farmer relationship context require human judgment. Document 3 cases this season where your field observation led you to deviate from the automated recommendation, and why that was right. This is your advisory value record.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs', roi: 'Moderate' };

  // Gaming — game_*
  const isGaming = rl.startsWith('game_');
  if (isGaming)
    return { title: 'Audit your last sprint: which creative decisions required player empathy that no tool could have made?', detail: 'AI tools generate assets, code, and dialogue — but the judgment about what makes a moment feel fun, fair, or emotionally resonant requires someone who has played games, felt frustration, and understands player psychology. Document 3 decisions from your last sprint where that empathy drove the design. That is your irreplaceable contribution.', riskReduction: 3, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  // Blockchain — bc_*
  const isBlockchain = rl.startsWith('bc_');
  if (isBlockchain)
    return { title: 'Document the protocol security or regulatory judgment calls from your last project that automated tools missed', detail: 'AI code audit tools catch known vulnerability patterns. Your value is the novel threat reasoning, the regulatory interpretation for an emerging protocol, and the cross-chain integration decisions that have no prior precedent. Document 3 cases where your judgment went beyond what automated tools flagged. This is your positioning evidence in a rapidly AI-augmented space.', riskReduction: 3, protectionIncrease: 7, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–3 hrs', roi: 'High' };

  // generic fallback
  return { title: 'Audit your task profile for AI replaceability', detail: 'List your 10 most frequent daily tasks and score each on AI replaceability (1 = fully replaceable, 5 = fully human-essential). This creates your personal displacement map and reveals exactly where to invest your repositioning energy.', riskReduction: 3, protectionIncrease: 5, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'High' };
}

function getRoleCertAction(roleKey: string, roleLabel: string, countryKey: string, expTier: ExpTier): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  const { certNote } = getCountryPlatformNote(countryKey);
  let certTitle = 'Complete one role-relevant AI tool proficiency credential';
  let certDetail = `Earning an AI tool certification signals adaptability and builds real capability. Use ${certNote} as your primary resource.`;

  // Software / engineering — sw_*, em_vibe_coder, em_agentic_sys_designer, em_spatial_computing_dev
  if (rl.startsWith('sw_') || rl.startsWith('em_vibe') || rl.startsWith('em_agentic') || rl.startsWith('em_spatial') || rl.startsWith('em_digital_human') || rl.startsWith('em_robotics') || rl.includes('swe') || rl.includes('software') || rl.includes('developer') || rl.includes('frontend') || rl.includes('backend'))
    { certTitle = 'Earn a GitHub Copilot or Claude API developer credential'; certDetail = `Complete GitHub's Copilot certification or build a project using the Claude API. AI-native coding is the new baseline for senior engineers. Use ${certNote}.`; }

  // Data / ML — da_*, ml_*, ds_*, em_synthetic_data_eng, em_climate_ai_analyst
  else if (rl.startsWith('da_') || rl.startsWith('ml_') || rl.startsWith('ds_') || rl.startsWith('em_synthetic') || rl.startsWith('em_climate') || rl.startsWith('em_llm') || rl.includes('data_analyst') || rl.includes('data_scientist') || rl.includes('machine_learning'))
    { certTitle = 'Complete a dbt + LLM pipeline or Snowflake ML certification'; certDetail = `Data professionals who can orchestrate AI-powered pipelines command a significant premium. DBT Core certification + one LLM tool integration project demonstrates both skill and adaptability. Use ${certNote}.`; }

  // Finance / accounting / investment — fin_*, inv_*, ins_*, ec_*
  else if (rl.startsWith('fin_') || rl.startsWith('inv_') || rl.startsWith('ins_') || rl.startsWith('ec_') || rl.includes('financial') || rl.includes('finance') || rl.includes('invest') || rl.includes('actuar') || rl.includes('accounting'))
    { certTitle = 'Earn Bloomberg AI Terminal or AlphaSense proficiency'; certDetail = `Analysts who master AI-augmented research tools are 3-5x more productive than peers who do not. Bloomberg AI and AlphaSense both offer training tracks. This directly compresses displacement risk on your most automatable tasks. Use ${certNote}.`; }

  // Healthcare — hc_*, nur_*, mh_*, vet_*
  else if (rl.startsWith('hc_') || rl.startsWith('nur_') || rl.startsWith('mh_') || rl.startsWith('vet_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('doctor') || rl.includes('clinical') || rl.includes('therapist') || rl.includes('pharmacist'))
    { certTitle = 'Complete clinical AI documentation training (Epic AI or Nuance DAX)'; certDetail = `Clinical AI literacy — understanding how ambient documentation and AI co-pilot tools work — positions you as a clinical AI champion rather than a resistant observer. Your hospital likely offers Epic-adjacent training. Use ${certNote}.`; }

  // BPO / customer support — bpo_*, cx_*, adm_*
  else if (rl.startsWith('bpo_') || rl.startsWith('cx_') || rl.startsWith('adm_') || rl.includes('customer_support') || rl.includes('support') || rl.includes('customer service'))
    { certTitle = 'Complete an AI CX design certification (Salesforce Einstein or Intercom AI)'; certDetail = `Understanding how AI tools you work alongside are architected transforms you from someone AI replaces into someone who configures and improves it. Salesforce and Intercom both offer free certifications. Use ${certNote}.`; }

  // Security / DevOps / Cloud — sec_*, dev_*, cloud_*, em_ai_red_teamer
  else if (rl.startsWith('sec_') || rl.startsWith('dev_') || rl.startsWith('cloud_') || rl.startsWith('em_ai_red') || rl.includes('security') || rl.includes('devops') || rl.includes('sre') || rl.includes('cloud') || rl.includes('infra') || rl.includes('soc'))
    { certTitle = 'Complete a SOAR platform or Security AI tool certification'; certDetail = `Proficiency in platforms like XSIAM, Microsoft Sentinel, or Security Copilot transforms you from a target of AI displacement into an AI security systems operator. Vendors offer free learning paths. Use ${certNote}.`; }

  // HR / People — hr_*, po_*
  else if (rl.startsWith('hr_') || rl.startsWith('po_') || rl.includes('human resources') || rl.includes('recruiter') || rl.includes('talent'))
    { certTitle = 'Earn a SHRM AI in HR or LinkedIn Talent Insights certification'; certDetail = `HR professionals who can leverage AI for talent analytics and candidate matching position themselves as strategic enablers rather than administrative processors. SHRM and LinkedIn both offer AI-focused HR credentials. Use ${certNote}.`; }

  // Legal — leg_*, comp_law
  else if (rl.startsWith('leg_') || rl.startsWith('comp_law') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('attorney') || rl.includes('paralegal') || rl.includes('compliance'))
    { certTitle = 'Complete a legal AI tools proficiency program (Harvey AI or Thomson Reuters CoCounsel)'; certDetail = `Legal AI literacy — understanding how LLM legal research tools work, where they hallucinate, and how to supervise their outputs — is the fastest-growing differentiator in law. Thomson Reuters and Harvey both offer practitioner training. Use ${certNote}.`; }

  // Consulting / strategy / PM — con_*, pm_*
  else if (rl.startsWith('con_') || rl.startsWith('pm_') || rl.includes('consultant') || rl.includes('strategy') || rl.includes('program_manager') || rl.includes('product_manager'))
    { certTitle = 'Complete a strategic AI applications course (McKinsey AI or PwC AI Academy)'; certDetail = `Consultants who can lead AI implementation engagements — not just pitch them — command 30-40% fee premiums. McKinsey, PwC, and Coursera all offer practitioner-level AI strategy credentials. This directly widens your moat. Use ${certNote}.`; }

  // Marketing / content / creative — mkt_*, cnt_*, crt_*, des_*
  else if (rl.startsWith('mkt_') || rl.startsWith('cnt_') || rl.startsWith('crt_') || rl.startsWith('des_') || rl.includes('marketing') || rl.includes('content') || rl.includes('creative') || rl.includes('design') || rl.includes('copywriter'))
    { certTitle = 'Earn a Meta AI Creative Tools or Google AI for Marketing certification'; certDetail = `Marketers who can direct AI creative tools — rather than be replaced by them — command premium rates. Meta Blueprint and Google Skillshop both offer free AI marketing credentials. Creative direction + AI fluency is the winning combination. Use ${certNote}.`; }

  // Education — edu_*, edt_*, tr_*
  else if (rl.startsWith('edu_') || rl.startsWith('edt_') || rl.startsWith('tr_') || rl.includes('teacher') || rl.includes('professor') || rl.includes('instructor') || rl.includes('trainer'))
    { certTitle = 'Complete an AI in Education certification (Google for Education AI or Coursera Teaching in the Age of AI)'; certDetail = `Educators who integrate AI tools into their pedagogy — rather than resist them — are better positioned in both institutional roles and the growing EdTech market. Google and Coursera both offer relevant credentials. Use ${certNote}.`; }

  // Logistics / operations / supply chain — log_*, ops_*, sc_*
  else if (rl.startsWith('log_') || rl.startsWith('ops_') || rl.startsWith('sc_') || rl.includes('logistics') || rl.includes('supply_chain') || rl.includes('operations'))
    { certTitle = 'Earn an APICS CSCP or SAP AI Supply Chain certification'; certDetail = `Operations professionals who can implement and supervise AI-optimized supply chain systems are in high demand as companies automate routing and inventory decisions. APICS CSCP and SAP both offer practitioner credentials. Use ${certNote}.`; }

  // Manufacturing / trades — mfg_*, trd_*, ind_*
  else if (rl.startsWith('mfg_') || rl.startsWith('trd_') || rl.startsWith('ind_') || rl.includes('manufacturing') || rl.includes('electrician') || rl.includes('machinist') || rl.includes('welder') || rl.includes('technician'))
    { certTitle = 'Complete an industrial automation or PLC programming certification'; certDetail = `Skilled trades professionals who can also operate, program, and maintain automated systems — PLCs, cobots, CNC programming — become indispensable in the hybrid human-machine factory. NIMS or vendor (Fanuc, Siemens) certifications add immediate market value. Use ${certNote}.`; }

  // Sales / business development — sal_*, biz_*
  else if (rl.startsWith('sal_') || rl.startsWith('biz_') || rl.includes('sales') || rl.includes('account_exec') || rl.includes('business_dev'))
    { certTitle = 'Complete a Salesforce Einstein AI or HubSpot AI Sales certification'; certDetail = `Sales professionals who can configure, use, and pitch AI-augmented CRM tools close deals faster and demonstrate more value to employers. Both Salesforce and HubSpot offer free AI sales certifications. Use ${certNote}.`; }

  // AI orchestration / governance / transformation — em_agent_ops, em_ai_workflow, em_ai_governance, em_ai_transformation
  else if (rl.startsWith('em_agent_ops') || rl.startsWith('em_ai_workflow') || rl.startsWith('em_ai_governance') || rl.startsWith('em_ai_transformation') || rl.startsWith('em_ai_workforce') || rl.startsWith('em_autonomous') || rl.startsWith('em_human_ai') || rl.includes('agent operations') || rl.includes('ai governance') || rl.includes('ai transformation'))
    { certTitle = 'Earn an AI governance or responsible AI certification (IEEE, CAIDP, or Coursera AI Ethics)'; certDetail = `AI orchestration roles require credibility in both technical AI fluency and governance frameworks. IEEE's CertifAIEd program and Coursera AI Ethics offer practitioner-level credentials that directly support your advisory positioning. Use ${certNote}.`; }

  // Media / journalism — med_*
  else if (rl.startsWith('med_'))
    { certTitle = 'Complete a data journalism or AI-assisted reporting certification'; certDetail = `Journalists who can use AI tools to investigate data at scale — while maintaining editorial integrity — are more valuable than ever. Reuters Institute Journalism AI, Google News Initiative, and Knight Center all offer practitioner courses. Use ${certNote}.`; }

  // Animation / photography / video — anim_*, photo_*, video_*
  else if (rl.startsWith('anim_') || rl.startsWith('photo_') || rl.startsWith('video_'))
    { certTitle = 'Complete an AI creative tools certification (Adobe Firefly Professional or Runway Gen-3 Creator Course)'; certDetail = `Creative professionals who can direct, edit, and quality-control AI-generated assets are 3–5× more productive and harder to replace. Adobe's Firefly certification and Runway's Gen-3 creator course both offer practitioner-level credentials. Use ${certNote}.`; }

  // Travel / hospitality — trav_*
  else if (rl.startsWith('trav_'))
    { certTitle = 'Complete a travel AI tools certification (Amadeus AI Travel or Sabre AI platform training)'; certDetail = `Travel professionals who understand AI booking platforms — how they work, where they fail, and when human judgment matters — are better positioned as the industry automates. Amadeus and Sabre both offer practitioner training paths. Use ${certNote}.`; }

  // Aerospace — aero_*
  else if (rl.startsWith('aero_'))
    { certTitle = 'Complete an AI-assisted engineering tools course (Siemens NX AI, ANSYS AI, or digital twin fundamentals)'; certDetail = `Aerospace engineers who can work alongside AI simulation and digital twin tools — running, interpreting, and questioning AI outputs — are significantly more valuable than those who resist them. Siemens, ANSYS, and Altair all offer practitioner certification paths. Use ${certNote}.`; }

  // Agriculture — agri_*
  else if (rl.startsWith('agri_'))
    { certTitle = 'Complete a precision agriculture AI certification (Trimble Ag or John Deere Operations Center training)'; certDetail = `Agronomists and farm managers who can work with AI precision agriculture platforms — interpreting sensor data, supervising automated recommendations, and advising on AI-assisted decisions — are the next generation of the field. Trimble and John Deere both offer practitioner paths. Use ${certNote}.`; }

  // Gaming — game_*
  else if (rl.startsWith('game_'))
    { certTitle = 'Complete a generative AI for game development course (Unity Muse, Unreal MetaHuman, or Inworld AI creator certification)'; certDetail = `Game developers who can use and direct AI tools for asset creation, NPC behavior, and procedural generation are significantly more productive and versatile. Unity, Epic, and Inworld AI all offer practitioner-level paths. Use ${certNote}.`; }

  // Blockchain — bc_*
  else if (rl.startsWith('bc_'))
    { certTitle = 'Complete an advanced smart contract security or AI audit tools certification (Trail of Bits training or OpenZeppelin Defender)'; certDetail = `Blockchain professionals who can work with AI-assisted audit tools — while understanding their limits — command a significant premium in the security-conscious Web3 space. Trail of Bits, OpenZeppelin, and Cyfrin all offer practitioner security credentials. Use ${certNote}.`; }

  return { title: certTitle, detail: certDetail, riskReduction: 8, protectionIncrease: 14, effort: 'Medium', category: 'Skill', strategicImpact: 'Critical', timeRequired: '40–60 hrs total', roi: 'Exceptional' };
}

function buildPersonalizedActions(
  roleKey: string,
  roleLabel: string,
  experience: string,
  score: number,
  countryKey: string,
  industryKey: string,
  d7Score: number,
  salaryRange: string | undefined,
  trajectory: TrajectoryResult | null,
): Record<Horizon, ActionCard[]> {
  const expTier = getExpTier(experience);
  const isHighRisk = score >= 65;
  const isMedRisk = score >= 45;
  const crossoverYr = trajectory?.displacementCrossover ?? null;
  const thresholdNear = crossoverYr && parseInt(crossoverYr, 10) - new Date().getFullYear() <= 3;
  const { platform, bufferCurrency } = getCountryPlatformNote(countryKey);

  // ── 30-day: defensive ─────────────────────────────────────────────────────
  const action30_1 = getRoleFirst30DayAction(roleKey, roleLabel);

  const action30_2: ActionCard = expTier === 'entry' || expTier === 'early'
    ? { title: 'Try one AI productivity tool in your daily workflow', detail: `Spend 20–30 minutes daily using an AI tool (ChatGPT, Claude, Copilot) for your actual work tasks. At ${expTier === 'entry' ? 'entry' : 'early'} career stage, AI proficiency is not just protective — it is increasingly a hiring prerequisite.`, riskReduction: 5, protectionIncrease: 9, effort: 'Low', category: 'Skill', strategicImpact: 'High', timeRequired: '30 min/day', roi: 'Exceptional' }
    : expTier === 'senior' || expTier === 'principal'
    ? { title: 'Document and publish your domain expertise externally', detail: `At ${expTier} level, institutional knowledge is your primary moat — but only if it is visible externally. Write one article, give one talk, or contribute to one community this month. External reputation insulates from single-employer dependency. Use ${platform}.`, riskReduction: 3, protectionIncrease: 10, effort: 'Low', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs', roi: 'High' }
    : { title: 'Connect with 3 people in adjacent or more AI-resistant roles', detail: `Network with colleagues in roles on the less-automated side of your evolution path now, while your current role gives you credibility. Use ${platform} to identify and reach out.`, riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Network', strategicImpact: 'Medium', timeRequired: '2–3 hrs', roi: 'Moderate' };

  const action30_3: ActionCard = { title: 'Deliberately shift one routine task toward AI-resistant work', detail: 'Identify one task in your current workload you can replace with higher-judgment, more human-essential work. Even a 10% shift in task profile begins repositioning you before the market forces it.', riskReduction: 3, protectionIncrease: 5, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '1–2 hrs/week', roi: 'Moderate' };

  // ── 90-day: capability upgrade ────────────────────────────────────────────
  const action90_1 = getRoleCertAction(roleKey, roleLabel, countryKey, expTier);

  const action90_2: ActionCard = expTier === 'entry' || expTier === 'early'
    ? { title: 'Seek out one AI-adjacent project at your current employer', detail: 'Volunteer to be on any team piloting an AI tool, automation workflow, or data project. Early-career professionals who build AI project experience now have a structural advantage over peers who wait.', riskReduction: 6, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–8 hrs/week extra', roi: 'High' }
    : { title: 'Shift 20% of your work toward AI-resistant, judgment-intensive tasks', detail: 'Deliberately seek stakeholder-facing, strategic, and complexity-intensive work. Negotiate with your manager to own one higher-order deliverable. This repositions you in the role before the market does — and makes the repositioning visible to decision-makers.', riskReduction: 7, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  const bufferMonths = salaryRange && (salaryRange === '200k+' || salaryRange === '100-200k') ? '6-month' : '3-month';
  const action90_3: ActionCard = { title: `Build a ${bufferMonths} emergency financial buffer`, detail: `Financial runway removes the desperation premium from career decisions. With ${bufferCurrency} in reserve, you can move on your terms — not under pressure. This is the most underrated career protection action.`, riskReduction: 0, protectionIncrease: 15, effort: 'High', category: 'Financial', strategicImpact: 'Critical', timeRequired: 'Ongoing', roi: 'Exceptional' };

  // ── Before threshold: pre-agentic positioning ──────────────────────────────
  let thresholdLabel: 'CRITICAL WINDOW' | 'PROACTIVE POSITIONING' | 'MONITORING MODE';
  let thresholdColor: string;
  if (d7Score > 75) { thresholdLabel = 'CRITICAL WINDOW'; thresholdColor = 'var(--red)'; }
  else if (d7Score >= 30) { thresholdLabel = 'PROACTIVE POSITIONING'; thresholdColor = 'var(--amber)'; }
  else { thresholdLabel = 'MONITORING MODE'; thresholdColor = 'var(--emerald)'; }

  const action_t1: ActionCard = d7Score > 75
    ? { title: 'Begin building a parallel income stream or adjacent role capability now', detail: `With your role carrying high structural exposure (D7: ${d7Score}/100), the pre-threshold window is your most valuable asset. ${thresholdNear ? 'With the threshold approaching in ~3 years, urgency is real. ' : ''}Begin generating any income — freelance, consulting, training — from an AI-resilient adjacent skill. This is the single highest-ROI action for your risk profile.`, riskReduction: 15, protectionIncrease: 25, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' }
    : d7Score >= 30
    ? { title: 'Build deep expertise in one uniquely human, AI-resistant capability', detail: 'The pre-threshold window is your best time to establish credibility in protected areas. Pick one skill — complex stakeholder management, domain-specific judgment, physical presence — and systematically deepen it before the market compresses opportunity.', riskReduction: 10, protectionIncrease: 20, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' }
    : { title: 'Monitor AI capability developments in your domain quarterly', detail: 'Your role has strong structural protection. Maintain a quarterly review habit: what can AI do in your field now that it could not 6 months ago? Staying informed early gives you maximum lead time to adapt if the landscape shifts.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2 hrs/quarter', roi: 'Moderate' };

  const action_t2: ActionCard = { title: 'Build visible expertise outside your current employer', detail: `Create content, speak at events, or contribute to open communities. External reputation insulates you from single-employer dependency and creates optionality that internal-only careers cannot. Use ${platform} to find your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  const action_t3: ActionCard = { title: 'Evaluate roles in structurally growing areas proactively', detail: `Map your current skills to roles in sectors with growing AI-resistant headcount. ${expTier === 'senior' || expTier === 'principal' ? 'At your seniority level, proactive role evaluation before you need to move is 3x more effective than reactive searching under pressure.' : 'Proactive positioning before the market forces change gives you the negotiating leverage to move on your terms.'} Use ${platform} to research target roles now.`, riskReduction: 18, protectionIncrease: 28, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  return {
    '30d': [action30_1, action30_2, action30_3],
    '90d': [action90_1, action90_2, action90_3],
    '12m': [],
    'threshold': [action_t1, action_t2, action_t3],
  };
}

export const EnhancedActionPlan: React.FC<Props> = ({
  intel, experience, score, trajectory, scoreColor, salaryRange,
  countryKey = 'usa', industryKey = '', roleKey = '', d7Score = 55, automationTimeline,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('30d');

  const roleLabel = intel?.displayRole ?? roleKey;
  const crossoverYr = trajectory?.displacementCrossover;
  const crossoverNum = crossoverYr ? (parseInt(crossoverYr, 10) || 0) : 0;
  const thresholdLabel = crossoverYr && crossoverNum > 0
    ? `Before ${crossoverNum - 1}–${crossoverYr}`
    : 'Before Threshold';

  const personalized = buildPersonalizedActions(
    roleKey, roleLabel, experience, score, countryKey, industryKey, d7Score, salaryRange, trajectory,
  );

  // D7 threshold badge
  let d7Badge: { label: string; color: string } | null = null;
  if (d7Score > 75)      d7Badge = { label: 'CRITICAL WINDOW', color: 'var(--red)' };
  else if (d7Score >= 30) d7Badge = { label: 'PROACTIVE POSITIONING', color: 'var(--amber)' };
  else                    d7Badge = { label: 'MONITORING MODE', color: 'var(--emerald)' };

  const horizons: { key: Horizon; label: string }[] = [
    { key: '30d',       label: 'Next 30 Days' },
    { key: '90d',       label: 'Next 90 Days' },
    { key: '12m',       label: 'Next 12 Months' },
    { key: 'threshold', label: thresholdLabel },
  ];

  const currentActions = personalized[activeHorizon];
  const allActions = [
    ...personalized['30d'],
    ...personalized['90d'],
    ...personalized['threshold'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <h3 className="label-xs" style={{ margin: 0, color: 'var(--text-3)' }}>PERSONAL ACTION PLAN</h3>
        {d7Badge && (
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${d7Badge.color}12`, border: `1px solid ${d7Badge.color}30`, fontSize: '0.58rem', fontWeight: 800, color: d7Badge.color, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
            {d7Badge.label}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '20px', lineHeight: 1.5 }}>
        Role-specific, experience-aware, country-calibrated actions ordered by strategic impact. Each action shows estimated risk reduction and future protection gain.
      </p>

      {/* Horizon tab pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {horizons.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveHorizon(key)}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeHorizon === key ? scoreColor : 'rgba(255,255,255,0.05)',
              color: activeHorizon === key ? '#000' : 'rgba(255,255,255,0.5)',
              fontWeight: 700, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 12-month: use StrategicRoadmap */}
      {activeHorizon === '12m' ? (
        intel ? (
          <StrategicRoadmap intel={intel} experience={experience} scoreColor={scoreColor} score={score} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {personalized['90d'].map((action) => (
              <ActionCardComponent key={action.title} action={{ ...action, riskReduction: action.riskReduction + 5, protectionIncrease: action.protectionIncrease + 8 }} scoreColor={scoreColor} />
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-3)' }}>
              No specific actions for this horizon.
            </div>
          ) : (
            currentActions.map((action) => (
              <ActionCardComponent key={action.title} action={action} scoreColor={scoreColor} />
            ))
          )}
        </div>
      )}

      {/* Priority note */}
      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Risk Reduction and Protection Increase are estimated based on research into upskilling, career positioning, and AI adaptation outcomes. Individual results vary by execution quality and market conditions.
      </div>

      {/* Outcome Simulation — always shown */}
      {trajectory && automationTimeline && (
        <OutcomeSimulationPanel
          timeline={automationTimeline}
          trajectory={trajectory}
          score={score}
          d7Score={d7Score}
          experience={experience}
          actions={allActions}
        />
      )}
    </div>
  );
};

function ActionCardComponent({ action, scoreColor }: { action: ActionCard; scoreColor: string }) {
  const effortC = EFFORT_COLORS[action.effort];
  const catC    = CAT_COLORS[action.category];
  const impactC = action.strategicImpact ? IMPACT_COLORS[action.strategicImpact] : 'var(--text-3)';
  const roiC    = action.roi ? ROI_COLORS[action.roi] : 'var(--text-3)';

  return (
    <div style={{
      padding: '16px 20px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {action.title}
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${catC}15`, border: `1px solid ${catC}30`, fontSize: '0.58rem', fontWeight: 800, color: catC, fontFamily: 'var(--font-mono)' }}>
            {action.category.toUpperCase()}
          </span>
          <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${effortC}15`, border: `1px solid ${effortC}30`, fontSize: '0.58rem', fontWeight: 800, color: effortC, fontFamily: 'var(--font-mono)' }}>
            {action.effort.toUpperCase()} EFFORT
          </span>
          {action.strategicImpact && (
            <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${impactC}12`, border: `1px solid ${impactC}28`, fontSize: '0.58rem', fontWeight: 800, color: impactC, fontFamily: 'var(--font-mono)' }}>
              {action.strategicImpact.toUpperCase()} IMPACT
            </span>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.73rem', color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
        {action.detail}
      </p>

      {/* Metrics row */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {action.riskReduction > 0 && (
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.65rem', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            Risk Reduction: −{action.riskReduction} pts
          </div>
        )}
        <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.65rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          Protection +{action.protectionIncrease}%
        </div>
        {action.timeRequired && (
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            ⏱ {action.timeRequired}
          </div>
        )}
        {action.roi && (
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: `${roiC}08`, border: `1px solid ${roiC}20`, fontSize: '0.65rem', color: roiC, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            ROI: {action.roi}
          </div>
        )}
      </div>
    </div>
  );
}
