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
  reason?: string;
  survivalMonths?: number;
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

// ── 90-day role-specific project action ──────────────────────────────────────
function getRoleProjectAction(roleKey: string, roleLabel: string, expTier: ExpTier, platform: string): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  const isEntry = expTier === 'entry' || expTier === 'early';

  if (rl.startsWith('sw_') || rl.startsWith('em_vibe') || rl.startsWith('em_agentic') || rl.startsWith('em_spatial') || rl.includes('software') || rl.includes('developer'))
    return isEntry
      ? { title: 'Ship one AI-integrated side project and publish it publicly', detail: 'Build something that uses an AI API (Claude, GPT-4, Gemini) as a core feature — not just a wrapper. Deployed projects with real users are the fastest signal of AI-native capability to hiring managers. Put it on GitHub and your portfolio.', riskReduction: 7, protectionIncrease: 12, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '10–20 hrs total', roi: 'High' }
      : { title: 'Lead an AI tooling decision at your employer — own the evaluation and rollout', detail: 'Propose, evaluate, and own the introduction of one AI development tool (Copilot, Cursor, Claude Code) to your team. Being the person who brought in the tool — not the person who resisted it — repositions you as an AI multiplier rather than a displacement target.', riskReduction: 7, protectionIncrease: 12, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–8 hrs/week', roi: 'High' };

  if (rl.startsWith('da_') || rl.startsWith('ml_') || rl.startsWith('ds_') || rl.includes('data') || rl.includes('analyst') || rl.includes('scientist'))
    return isEntry
      ? { title: 'Build one end-to-end analysis project that uses an LLM for insight generation', detail: 'Pick a public dataset and build an analysis that incorporates LLM-generated narratives or anomaly explanations alongside your SQL/Python work. Post it on GitHub or Kaggle. AI-augmented analysis is the new baseline expectation for data roles.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '10–15 hrs total', roi: 'High' }
      : { title: 'Shift 20% of your reporting work onto AI tools and redeploy that time to strategic insight', detail: 'Use AI tools (Tableau GPT, Power BI Copilot, Claude) to automate your most routine reporting tasks. Then proactively fill the freed time with higher-value analysis: forecasting, anomaly investigation, business decision support. Make this shift visible to your manager.', riskReduction: 7, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  if (rl.startsWith('fin_') || rl.startsWith('inv_') || rl.startsWith('ins_') || rl.includes('finance') || rl.includes('financial') || rl.includes('invest'))
    return isEntry
      ? { title: 'Build proficiency in one AI financial research tool and document 3 use cases', detail: 'Get hands-on with Bloomberg AI, AlphaSense, or Kensho. Document 3 concrete examples where it saved you time or surfaced insights you would have missed. Early-career finance professionals who can demonstrate AI tool fluency are significantly more hireable.', riskReduction: 6, protectionIncrease: 10, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '8–12 hrs total', roi: 'High' }
      : { title: 'Shift from data-gathering to interpretation: use AI for the former, own the latter', detail: 'Deliberately offload data gathering, model runs, and report templating to AI tools. Reinvest that time in client advisory, strategic recommendations, and stakeholder communication — the work AI cannot do. Make this shift explicit in your next review conversation.', riskReduction: 7, protectionIncrease: 12, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  if (rl.startsWith('hc_') || rl.startsWith('nur_') || rl.startsWith('mh_') || rl.startsWith('vet_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('clinical') || rl.includes('therapist'))
    return isEntry
      ? { title: 'Complete training on the AI documentation or clinical support tools used at your institution', detail: 'Most health systems are rolling out AI documentation (Nuance DAX, Ambience, Epic AI). Getting certified or formally trained on these tools positions you as a clinical AI champion rather than a resistant observer — a significant career differentiator early in your career.', riskReduction: 4, protectionIncrease: 9, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '8–16 hrs total', roi: 'High' }
      : { title: 'Become the clinical AI literacy lead for your unit or department', detail: 'Volunteer to evaluate, pilot, or train colleagues on one AI clinical tool. Clinicians who bridge AI capability and patient care are among the most protected professionals in healthcare. This positioning is most credible when you initiate it, not when you are assigned to it.', riskReduction: 5, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('bpo_') || rl.startsWith('cx_') || rl.startsWith('adm_') || rl.includes('support') || rl.includes('customer service'))
    return isEntry
      ? { title: 'Volunteer to test and give feedback on any AI tool your team is piloting', detail: 'If your team is rolling out AI chat, AI call summarization, or any automation, be the person who volunteers to test it first. Early adopters become the internal experts, which is the most direct path to an AI operations or AI training role.', riskReduction: 6, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '2–4 hrs/week', roi: 'High' }
      : { title: 'Redesign one process: map where AI handles it, where humans should remain, and propose the new flow', detail: 'Pick one support process your team runs. Design the human-AI hybrid version: which steps does the bot handle, where does escalation happen, what human judgment is required. Propose this to your manager. Process redesigners are the roles least likely to be automated.', riskReduction: 7, protectionIncrease: 12, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('sec_') || rl.startsWith('dev_') || rl.startsWith('cloud_') || rl.includes('security') || rl.includes('devops') || rl.includes('sre') || rl.includes('cloud'))
    return isEntry
      ? { title: 'Build a portfolio project using a SOAR or AI security tool', detail: 'Set up a free tier of Microsoft Sentinel, Splunk SIEM, or CrowdStrike Falcon sandbox. Document a detection rule you built or an incident you investigated. Security professionals who can demonstrate AI tool competence are in severe shortage globally.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '10–20 hrs total', roi: 'High' }
      : { title: 'Lead the evaluation or integration of one AI security tool at your employer', detail: 'Propose to evaluate one AI security platform (Microsoft Sentinel, Darktrace, Vectra). Own the proof-of-concept. The professionals who own AI tool selection decisions are the last to be displaced by them.', riskReduction: 7, protectionIncrease: 12, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };

  if (rl.startsWith('hr_') || rl.startsWith('po_') || rl.includes('recruiter') || rl.includes('talent') || rl.includes('human resources'))
    return isEntry
      ? { title: 'Get certified on one AI recruiting or HRIS platform and document what it can and cannot do', detail: 'Platforms like Eightfold, Beamery, or LinkedIn Recruiter AI all have learning paths. Document 3 concrete cases where AI helped and 3 where human judgment was essential. This shapes your role as an AI-literacy resource on your team.', riskReduction: 5, protectionIncrease: 10, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '8–12 hrs total', roi: 'High' }
      : { title: 'Design and run one AI-augmented hiring or engagement process at your employer', detail: 'Propose running one recruiting or engagement workflow with AI tools handling screening or scheduling, while you own the human-judgment layer. Demonstrate the efficiency gain. HR professionals who can design human-AI hybrid workflows are the future of the function.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('leg_') || rl.startsWith('comp_law') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('paralegal') || rl.includes('compliance'))
    return isEntry
      ? { title: 'Use Harvey AI or CoCounsel on a real research task and write up where it was right and wrong', detail: 'Access a free trial or employer account of Harvey AI or Thomson Reuters CoCounsel. Run a real legal research question through it. Document where it was accurate, where it hallucinated, and what human review caught. This practitioner-level AI literacy is what firms are hiring for.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '6–10 hrs total', roi: 'High' }
      : { title: 'Develop and share an internal AI tool usage policy for your practice group', detail: 'Draft a one-page guidance document: which AI legal tools are approved, which tasks are appropriate, what human review is required. Position yourself as the AI governance voice in your team. Lawyers who set AI policy are never replaced by it.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('con_') || rl.startsWith('pm_') || rl.includes('consultant') || rl.includes('strategy') || rl.includes('product_manager') || rl.includes('program_manager'))
    return isEntry
      ? { title: 'Build a market research report using AI tools and document where human synthesis added value', detail: 'Use Perplexity, Claude, or a research AI to compile a competitive landscape. Then write up the analysis yourself — and explicitly note where AI surfaced facts but your synthesis made the recommendation. This is the consulting value chain in the AI era.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '8–12 hrs total', roi: 'High' }
      : { title: 'Lead one AI-augmented client deliverable: use AI for research, own the recommendation', detail: 'On your next engagement, systematically use AI for data gathering, slide drafting, and research synthesis. Document the time saved and the places where your judgment shaped the final recommendation. Consultants who demonstrate this hybrid productivity are in high demand.', riskReduction: 7, protectionIncrease: 12, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('mkt_') || rl.startsWith('cnt_') || rl.startsWith('crt_') || rl.startsWith('des_') || rl.includes('marketing') || rl.includes('content') || rl.includes('creative') || rl.includes('design'))
    return isEntry
      ? { title: 'Build a portfolio piece using AI creative tools that demonstrates your direction — not just generation', detail: 'Use Midjourney, Runway, or Adobe Firefly to generate raw output — then refine, direct, and publish the final result with a write-up of your creative decision-making process. The portfolio piece should show what you changed and why. Direction is the skill; generation is the tool.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '8–15 hrs total', roi: 'High' }
      : { title: 'Run one campaign where AI handles production and you measure the quality gap your direction fills', detail: 'Use AI for first-draft copy, visuals, or variants. Document the specific creative decisions where your direction — brand instinct, audience nuance, quality judgment — changed the final output. This is your evidence that AI amplifies rather than replaces your value.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('edu_') || rl.startsWith('edt_') || rl.startsWith('tr_') || rl.includes('teacher') || rl.includes('professor') || rl.includes('instructor') || rl.includes('trainer'))
    return isEntry
      ? { title: 'Design one lesson or training module that integrates AI tools and document what students learned differently', detail: 'Build one lesson using Khanmigo, MagicSchool AI, or a custom GPT as a learning aid. Document what students were able to do or understand differently with AI support versus without. This practitioner evidence shapes your positioning as an AI-forward educator.', riskReduction: 4, protectionIncrease: 8, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '6–10 hrs total', roi: 'High' }
      : { title: 'Lead an AI literacy initiative for your students or colleagues and measure the outcome', detail: 'Design and run a structured session on using AI tools responsibly in your domain — for students, colleagues, or faculty. Educators who build AI literacy in others are more valuable than educators who merely use AI themselves.', riskReduction: 5, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('log_') || rl.startsWith('ops_') || rl.startsWith('sc_') || rl.includes('logistics') || rl.includes('supply_chain') || rl.includes('operations'))
    return isEntry
      ? { title: 'Document and map one supply chain process end-to-end with AI automation opportunities identified', detail: 'Pick one process (demand forecasting, inventory replenishment, supplier communication) and map every step. Mark which steps AI can handle, which need human judgment. Bring this map to your manager. Process mapping with AI opportunity identification is a high-value, low-risk project at any level.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '8–12 hrs total', roi: 'High' }
      : { title: 'Evaluate and propose one AI optimization tool for your supply chain or ops function', detail: 'Research AI tools for your top operational bottleneck (Blue Yonder, o9, Kinaxis for planning; Symbotic or Geek+ for warehouse). Write a 1-page proposal. Operations professionals who drive AI adoption rather than resist it are more valuable than those who are replaced by it.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('med_') || rl.includes('journalist') || rl.includes('reporter') || rl.includes('editor'))
    return isEntry
      ? { title: 'Build a data journalism project using AI for research aggregation while you own the editorial angle', detail: 'Use AI tools to aggregate public data (FRED, SEC filings, government datasets) on a topic you care about. Write the editorial story yourself — the angle, the framing, the sourcing. Publish it. Data journalism with AI is the fastest-growing differentiator in early-career media.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '10–15 hrs total', roi: 'High' }
      : { title: 'Develop an AI-assisted investigation methodology and document what human judgment made irreplaceable', detail: 'Use AI tools for background research, FOIA synthesis, or document review on a real story. Document explicitly: which leads came from AI, which from sources, which editorial decisions changed the direction. This methodology becomes your professional differentiator in the AI content era.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('anim_') || rl.startsWith('photo_') || rl.startsWith('video_') || rl.includes('animation') || rl.includes('visual') || rl.includes('photographer'))
    return isEntry
      ? { title: 'Create one piece that combines AI generation with your artistic direction and publish the process', detail: 'Use Midjourney, Runway, or Adobe Firefly for raw generation — then direct, select, and refine the result into a finished work. Publish both the final piece and a process breakdown showing your creative decisions. This demonstrates direction capability, not just tool usage.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '8–15 hrs total', roi: 'High' }
      : { title: 'Establish your workflow for AI-assisted production and document your creative direction layer', detail: 'Formalize how you use AI tools in your production process. Document the specific creative decisions — style choices, mood direction, quality gates — that you make after generation. Share this workflow publicly. Art directors who have a documented AI collaboration process are in high demand.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('trav_') || rl.includes('travel') || rl.includes('hospitality') || rl.includes('hotel') || rl.includes('concierge'))
    return isEntry
      ? { title: 'Get trained on one AI booking or guest management platform used in your sector', detail: 'Amadeus, Sabre, or your hotel\'s property management system likely has an AI layer. Request formal training or self-study the AI features. Travel professionals who understand how AI booking platforms work — and where they fail — are more valuable than those who are displaced by them.', riskReduction: 4, protectionIncrease: 8, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '8–12 hrs total', roi: 'High' }
      : { title: 'Design one service experience where AI handles logistics and you own the human relationship layer', detail: 'Identify one service journey (group trip, event, VIP stay) and redesign it explicitly: AI handles research, availability, routing; you handle relationship, customization, crisis. Document the model and propose it to your team as the future-of-service template.', riskReduction: 5, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('aero_') || rl.includes('aerospace') || rl.includes('avionics') || rl.includes('aviation'))
    return isEntry
      ? { title: 'Complete training on one AI-assisted engineering or maintenance tool used in your organization', detail: 'Digital twin platforms (Siemens, ANSYS), predictive maintenance AI (GE Aviation, Safran), or AI structural analysis tools — most aerospace organizations have at least one. Getting trained and certified on these tools positions you as an AI-literate engineer rather than a resistance point.', riskReduction: 4, protectionIncrease: 9, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '10–20 hrs total', roi: 'High' }
      : { title: 'Lead a digital twin or AI simulation evaluation for one system or component at your organization', detail: 'Propose evaluating a digital twin or AI simulation tool for one specific engineering challenge. Own the proof-of-concept. Aerospace engineers who champion AI tools — while owning the safety validation judgment — are the most protected professionals in the field.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };

  if (rl.startsWith('agri_') || rl.includes('agronomy') || rl.includes('precision ag') || rl.includes('crop'))
    return isEntry
      ? { title: 'Get trained on one precision agriculture AI platform used in your region', detail: 'Trimble Ag, John Deere Operations Center, Climate Corp (now Sustainability by Bayer), or Granular — most large farm operations use at least one. Getting certified or formally trained on these tools positions you as a precision ag specialist rather than a field operator.', riskReduction: 4, protectionIncrease: 8, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '8–15 hrs total', roi: 'High' }
      : { title: 'Design and document a hybrid AI + field judgment advisory protocol for one crop challenge', detail: 'Pick one recurring challenge (irrigation timing, disease identification, yield variance). Design the protocol explicitly: what the AI platform recommends, what field observation adds, when you override. This documented hybrid methodology is your professional differentiator in the precision ag era.', riskReduction: 5, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('game_') || rl.includes('game') || rl.includes('gaming'))
    return isEntry
      ? { title: 'Ship one game prototype using AI tools for assets and code, owning the design and player experience', detail: 'Use Unity Muse or GitHub Copilot for code, Midjourney or Stable Diffusion for art, Inworld AI for NPCs. Ship a playable prototype. The portfolio piece should demonstrate game design judgment — what you kept, what you changed, why. That judgment is your career differentiator.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '15–25 hrs total', roi: 'High' }
      : { title: 'Lead an AI tools evaluation for one area of your game production pipeline', detail: 'Propose evaluating AI tools for a specific pipeline step (asset generation, NPC dialogue, QA automation, procedural level design). Own the pilot and document what it accelerated, what human judgment it required, and where it failed. AI pipeline leads are the future of game production.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–8 hrs/week', roi: 'High' };

  if (rl.startsWith('bc_') || rl.includes('blockchain') || rl.includes('web3') || rl.includes('crypto') || rl.includes('smart contract'))
    return isEntry
      ? { title: 'Complete an AI-assisted smart contract audit on a public contract and publish your findings', detail: 'Use Slither, MythX, or OpenZeppelin Defender to run AI-assisted analysis on a real deployed contract. Document what the tools flagged, what they missed, and what your manual review caught. Published audit notes are the fastest credibility-builder in Web3 security.', riskReduction: 5, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '10–15 hrs total', roi: 'High' }
      : { title: 'Develop an AI audit integration protocol for your team\'s security review process', detail: 'Design a formal protocol for how AI audit tools (Slither, MythX, OpenZeppelin Defender) integrate with your human security review. Document what the AI catches, what it misses, and the review steps required. Teams with documented AI + human security processes are the standard for high-value protocols.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('gov_') || rl.startsWith('pub_') || rl.startsWith('ngo_') || rl.includes('government') || rl.includes('public sector') || rl.includes('policy') || rl.includes('nonprofit'))
    return isEntry
      ? { title: 'Map one public program or policy workflow to identify AI-automatable steps and propose improvements', detail: 'Pick one process your team runs (application review, report generation, public communication). Document which steps AI tools could handle and propose a pilot. Early-career public sector professionals who bring AI process literacy are rare and immediately valuable.', riskReduction: 4, protectionIncrease: 8, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '8–12 hrs total', roi: 'High' }
      : { title: 'Lead an AI policy or procurement evaluation for one function in your organization', detail: 'Propose evaluating AI tools for one specific government or nonprofit use case: case management, benefit eligibility, grant review. Lead the stakeholder consultation and write the assessment. Public sector AI evaluators are in severe shortage and near-zero displacement risk.', riskReduction: 5, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('sal_') || rl.startsWith('ret_') || rl.startsWith('re_') || rl.includes('sales') || rl.includes('account exec') || rl.includes('business dev') || rl.includes('real estate'))
    return isEntry
      ? { title: 'Use AI tools for every pre-call research task and track how it changes your conversion rate', detail: 'Use Claude, Perplexity, or LinkedIn AI to research prospects, personalize outreach, and prepare for calls. Track your conversion rate before and after. Sales professionals who demonstrate AI-augmented productivity are more promotable than those who rely on volume alone.', riskReduction: 5, protectionIncrease: 9, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '30 min/day', roi: 'High' }
      : { title: 'Design a team AI sales process: AI for research and prep, you for relationship and close', detail: 'Formalize the workflow: AI handles prospect research, email personalization, and follow-up scheduling; you own the relationship conversation and close judgment. Document the model and share it with your team. Sales leaders who can articulate this hybrid model are the most promotable.', riskReduction: 6, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('mfg_') || rl.startsWith('trd_') || rl.startsWith('ind_') || rl.includes('manufacturing') || rl.includes('electrician') || rl.includes('welder') || rl.includes('machinist') || rl.includes('technician'))
    return isEntry
      ? { title: 'Get trained on the automated or AI-assisted systems in your facility and become the go-to operator', detail: 'Most modern manufacturing facilities have cobots, AI quality inspection, or predictive maintenance systems. Volunteer to be trained on whatever AI or automation system is in your facility. Trades professionals who can operate and maintain automated systems are the most protected in manufacturing.', riskReduction: 3, protectionIncrease: 8, effort: 'Medium', category: 'Skill', strategicImpact: 'High', timeRequired: '8–20 hrs total', roi: 'High' }
      : { title: 'Lead the adoption or optimization of one automated system in your facility', detail: 'Identify one cobot, quality AI, or predictive maintenance system in your facility and propose to own its optimization or training. Skilled trades professionals who can configure and optimize automation — rather than just operate alongside it — are near-irreplaceable.', riskReduction: 4, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–8 hrs/week', roi: 'High' };

  // Fallback for all other roles
  return isEntry
    ? { title: 'Seek out one AI-adjacent project at your current employer', detail: `Volunteer to be on any team piloting an AI tool, automation workflow, or data project. Early-career professionals who build AI project experience now have a structural advantage over peers who wait. Use ${platform} to research what\'s happening in your domain.`, riskReduction: 6, protectionIncrease: 10, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–8 hrs/week extra', roi: 'High' }
    : { title: 'Shift 20% of your work toward AI-resistant, judgment-intensive tasks', detail: `Deliberately seek stakeholder-facing, strategic, and complexity-intensive work. Negotiate with your manager to own one higher-order deliverable. This repositions you in the role before the market does — and makes the repositioning visible to decision-makers. Use ${platform}.`, riskReduction: 7, protectionIncrease: 11, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };
}

// ── Threshold: role-specific parallel income / pivot action ───────────────────
function getRoleThresholdAction(roleKey: string, roleLabel: string, d7Score: number, thresholdNear: boolean | null): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  const urgentPrefix = thresholdNear ? 'With the major shift approaching in ~3 years, urgency is real. ' : '';

  if (d7Score <= 30) {
    // Low structural risk — monitor mode regardless of role
    return { title: 'Set a quarterly AI capability review for your domain', detail: 'Your role has strong structural protection. Maintain a quarterly review habit: what can AI do in your field now that it could not 6 months ago? Staying informed early gives you maximum lead time to adapt before the market forces the choice.', riskReduction: 2, protectionIncrease: 6, effort: 'Low', category: 'Positioning', strategicImpact: 'Medium', timeRequired: '2 hrs/quarter', roi: 'Moderate' };
  }

  if (d7Score > 75) {
    // High structural risk — role-specific pivot action
    if (rl.startsWith('bpo_') || rl.startsWith('cx_') || rl.includes('data entry') || rl.includes('customer service'))
      return { title: 'Begin training for a human-AI operations or CX quality role now', detail: `${urgentPrefix}The routine tiers of your role are being automated fastest. Begin building skills in AI operations, QA, or process design: these are the roles that survive when the front-line volume tier is handled by AI. SHRM, Coursera, and your current employer's internal mobility programs are your path.`, riskReduction: 15, protectionIncrease: 25, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' };
    if (rl.startsWith('fin_account') || rl.startsWith('fin_tax') || rl.includes('accountant') || rl.includes('bookkeep'))
      return { title: 'Begin transitioning toward advisory, FP&A, or AI audit oversight — not pure compliance work', detail: `${urgentPrefix}Standard accounting and tax preparation are the highest-displacement finance tasks. Begin building advisory skills: financial planning, CFO-level communication, and AI audit oversight. These are the functions AI augments rather than replaces. CPA firms and FP&A teams are hiring for these specifically.`, riskReduction: 14, protectionIncrease: 23, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' };
    if (rl.startsWith('sw_') || rl.startsWith('web_') || rl.includes('software') || rl.includes('developer') || rl.includes('frontend') || rl.includes('backend'))
      return { title: 'Begin repositioning from code execution to system architecture and AI orchestration', detail: `${urgentPrefix}Code generation AI is moving fastest in your layer of the stack. The protected tier is above execution: system design, AI orchestration, product architecture, and engineering leadership. Begin taking on one architecture or AI integration responsibility now while your current role provides the platform.`, riskReduction: 15, protectionIncrease: 24, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' };
    if (rl.startsWith('med_') || rl.includes('journalist') || rl.includes('reporter') || rl.includes('content'))
      return { title: 'Begin building an original investigative or long-form niche that AI cannot replicate', detail: `${urgentPrefix}Commodity content and routine journalism are being automated. The survivable niche is original, source-driven, investigative work with a distinct authorial identity. Begin building a specific beat — a company, an issue, a geography — that you own deeply. That ownership is your displacement shield.`, riskReduction: 14, protectionIncrease: 22, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' };
    // Generic high-risk pivot
    return { title: 'Begin building a parallel income stream or adjacent role capability now', detail: `${urgentPrefix}Begin generating any income — freelance, consulting, training — from an AI-resilient adjacent skill. This is the single highest-ROI action for your risk profile at this exposure level.`, riskReduction: 15, protectionIncrease: 25, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '10+ hrs/week', roi: 'Exceptional' };
  }

  // Moderate structural risk (d7Score 30–75) — role-specific deepening
  if (rl.startsWith('hc_') || rl.startsWith('nur_') || rl.startsWith('mh_') || rl.startsWith('vet_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('clinical') || rl.includes('therapist'))
    return { title: 'Deepen your clinical specialization into the areas AI diagnostic tools cannot reach', detail: 'AI is strongest in pattern recognition on structured data. It is weakest in complex multi-system presentations, rare conditions, trauma-informed care, and high-empathy interventions. Deliberately deepen your expertise in one of these protected areas before the market compresses opportunity.', riskReduction: 10, protectionIncrease: 20, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };
  if (rl.startsWith('leg_') || rl.startsWith('comp_law') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('attorney'))
    return { title: 'Develop a specialization in AI law, data privacy, or a practice area with growing regulatory complexity', detail: 'The most protected legal work involves novel legal questions AI tools cannot research: AI liability, data governance, emerging regulatory frameworks. Begin building expertise in one of these areas. The supply of lawyers with genuine AI domain expertise is far below demand.', riskReduction: 10, protectionIncrease: 20, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };
  if (rl.startsWith('sec_') || rl.startsWith('dev_') || rl.startsWith('cloud_') || rl.includes('security') || rl.includes('devops') || rl.includes('sre'))
    return { title: 'Build deep expertise in AI security, LLM threat modeling, or autonomous system incident response', detail: 'AI is creating entirely new attack surfaces that human security experts must defend. LLM prompt injection, agentic system misalignment, and model extraction are categories where there is near-zero AI capability to defend and near-infinite human demand. This is the most protected frontier of security work.', riskReduction: 10, protectionIncrease: 21, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };
  if (rl.startsWith('con_') || rl.startsWith('pm_') || rl.includes('consultant') || rl.includes('strategy') || rl.includes('product_manager'))
    return { title: 'Build credibility in AI strategy or AI implementation consulting — the fastest-growing adjacent specialty', detail: 'Every company is trying to implement AI and most are doing it wrong. Consultants and product managers who can lead AI strategy, change management, and implementation — not just pitch it — are the most protected professionals in your function. Begin accumulating evidence: one AI project led, one methodology developed, one case study published.', riskReduction: 10, protectionIncrease: 20, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };
  // Generic moderate
  return { title: 'Build deep expertise in one uniquely human, AI-resistant capability in your field', detail: 'The pre-threshold window is your best time to establish credibility in protected areas. Pick one skill — complex stakeholder management, domain-specific judgment, physical-presence work, or novel problem-solving — and systematically deepen it before the market compresses opportunity.', riskReduction: 10, protectionIncrease: 20, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };
}

// ── Threshold: role-specific external presence action ────────────────────────
function getRoleExternalPresenceAction(roleKey: string, roleLabel: string, platform: string, expTier: ExpTier): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  const isSenior = expTier === 'senior' || expTier === 'principal';

  if (rl.startsWith('sw_') || rl.startsWith('em_') || rl.includes('software') || rl.includes('developer') || rl.includes('engineer'))
    return { title: isSenior ? 'Publish technical writing or give a conference talk on a system you designed' : 'Build and publish an open-source project or technical blog in your specialization', detail: `External technical reputation is your insurance policy against single-employer dependency. A GitHub repo, a published article, or a conference talk that demonstrates your specific expertise creates inbound opportunities rather than requiring outbound job searching. Use ${platform} to find your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  if (rl.startsWith('fin_') || rl.startsWith('inv_') || rl.startsWith('ins_') || rl.includes('finance') || rl.includes('invest'))
    return { title: isSenior ? 'Publish a market commentary or investment thesis publicly under your name' : 'Write and publish one financial analysis or market note on LinkedIn or Substack', detail: `Finance professionals with a public body of written analysis are significantly more resilient to employer-specific layoffs. Your published thinking creates inbound career opportunities and demonstrates the judgment that AI tools cannot replicate. Use ${platform} to reach your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  if (rl.startsWith('hc_') || rl.startsWith('nur_') || rl.startsWith('mh_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('clinical') || rl.includes('therapist'))
    return { title: isSenior ? 'Publish a clinical case report, policy commentary, or professional education piece' : 'Contribute to a clinical community, publication, or professional association in your specialty', detail: `Clinical professionals with external professional presence — published work, conference presentations, association leadership — are significantly more resilient to institutional restructuring. Your expertise becomes portable rather than employer-dependent. Use ${platform} to find your community.`, riskReduction: 9, protectionIncrease: 17, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  if (rl.startsWith('leg_') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('attorney'))
    return { title: isSenior ? 'Write a legal commentary or brief on an emerging regulatory area in your practice' : 'Publish a client briefing note or legal analysis in a trade publication or LinkedIn', detail: `Lawyers with a public record of clear thinking on complex legal questions attract clients and opportunities independently of their firm. One well-researched commentary on an emerging AI, data, or regulatory issue can be the most effective business development and career protection investment at any level.`, riskReduction: 9, protectionIncrease: 17, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  if (rl.startsWith('mkt_') || rl.startsWith('cnt_') || rl.startsWith('crt_') || rl.startsWith('des_') || rl.includes('marketing') || rl.includes('content') || rl.includes('creative') || rl.includes('design'))
    return { title: isSenior ? 'Build a public portfolio of campaigns or creative work that demonstrates your strategic judgment' : 'Publish your creative process and decision-making, not just the finished work', detail: `Creative professionals who explain their decisions — why this approach, why this angle, what the brief required — demonstrate irreplaceable judgment. The work itself is increasingly generatable; the thinking behind it is not. Use ${platform} to build your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '3–5 hrs/week', roi: 'High' };

  if (rl.startsWith('edu_') || rl.startsWith('edt_') || rl.startsWith('tr_') || rl.includes('teacher') || rl.includes('professor') || rl.includes('instructor') || rl.includes('trainer'))
    return { title: isSenior ? 'Publish your pedagogy: a curriculum framework, teaching methodology, or case study' : 'Share lesson design and student outcomes publicly in education communities', detail: `Educators with a public record of effective pedagogy attract institutional partnerships, consulting opportunities, and speaking invitations independently of any single employer. Your documented methodology becomes portable expertise. Use ${platform} to reach your education community.`, riskReduction: 9, protectionIncrease: 17, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '3–4 hrs/week', roi: 'High' };

  if (rl.startsWith('con_') || rl.startsWith('pm_') || rl.includes('consultant') || rl.includes('strategy') || rl.includes('product_manager'))
    return { title: isSenior ? 'Publish a methodology or case study from a project you led — without naming the client' : 'Write and publish your analysis of a business problem you solved, with lessons learned', detail: `Consultants and product managers with public case studies and methodologies generate inbound consulting and advisory opportunities that are independent of any single employer. Your documented thinking is your most portable career asset. Use ${platform} to build your professional audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  // Generic fallback
  return { title: 'Build visible expertise outside your current employer', detail: `Create content, speak at events, or contribute to professional communities. External reputation insulates you from single-employer dependency and creates optionality that internal-only careers cannot. Use ${platform} to find your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };
}

// ── Threshold: role-specific proactive transition evaluation ──────────────────
function getRoleTransitionAction(roleKey: string, roleLabel: string, expTier: ExpTier, platform: string): ActionCard {
  const rl = (roleKey || roleLabel || '').toLowerCase();
  const isSenior = expTier === 'senior' || expTier === 'principal';

  if (rl.startsWith('bpo_') || rl.startsWith('cx_') || rl.startsWith('adm_') || rl.includes('data entry') || rl.includes('customer service') || rl.includes('support'))
    return { title: 'Map and apply to AI operations, quality assurance, or process design roles proactively', detail: `The transition from front-line BPO/support to AI operations or QA is the most natural path from your current role. These roles require exactly your domain knowledge plus AI tool fluency. Proactive positioning — before the automation wave forces it — gives you negotiating leverage and a non-emergency timeline. Use ${platform} to identify target roles now.`, riskReduction: 18, protectionIncrease: 28, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  if (rl.startsWith('fin_account') || rl.startsWith('fin_tax') || rl.includes('accountant') || rl.includes('bookkeep'))
    return { title: 'Research and apply to FP&A, controllership, or CFO-adjacent roles with AI tool fluency', detail: `The transition from compliance accounting to advisory finance is the best-protected path from your current function. FP&A, financial business partnering, and AI audit oversight are the roles that survive when routine compliance is automated. ${isSenior ? 'At your seniority, this pivot carries the highest optionality value.' : 'Building these skills now positions you for a lateral move before the market forces it.'} Use ${platform}.`, riskReduction: 18, protectionIncrease: 28, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  if (rl.startsWith('sw_') || rl.startsWith('web_') || rl.includes('software') || rl.includes('developer') || rl.includes('frontend') || rl.includes('backend'))
    return { title: 'Evaluate roles in AI engineering, platform architecture, or engineering leadership proactively', detail: `The best transition from code execution roles is upward: AI/ML engineering, platform engineering, or engineering management. These tiers sit above the code generation layer being automated. ${isSenior ? 'At your seniority, you have the credibility to make this move in the next 12 months.' : 'Proactive targeting now gives you 12–18 months to build the bridge before market pressure forces it.'} Use ${platform}.`, riskReduction: 18, protectionIncrease: 28, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  if (rl.startsWith('hc_') || rl.startsWith('nur_') || rl.startsWith('mh_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('clinical') || rl.includes('therapist'))
    return { title: 'Evaluate clinical AI leadership, health informatics, or specialized clinical roles proactively', detail: `Clinical AI leadership, health informatics, and specialized high-acuity roles are the most protected career trajectories from your current position. The supply of clinicians with AI literacy is far below institutional demand. ${isSenior ? 'At your seniority, a clinical AI leadership or informatics pivot is both credible and immediately valuable.' : 'Building this direction now positions you ahead of the curve.'} Use ${platform}.`, riskReduction: 16, protectionIncrease: 26, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  if (rl.startsWith('mkt_') || rl.startsWith('cnt_') || rl.startsWith('crt_') || rl.includes('marketing') || rl.includes('content') || rl.includes('creative') || rl.includes('design'))
    return { title: 'Evaluate brand strategy, creative direction, or AI content operations roles proactively', detail: `The protected tier in your function is creative direction, brand strategy, and AI content quality oversight — not execution. ${isSenior ? 'At your seniority, you have the credibility to move into creative direction or strategy leadership.' : 'Proactively targeting these adjacent roles gives you 12–18 months to build the bridge.'} Use ${platform} to research target roles now.`, riskReduction: 17, protectionIncrease: 26, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  if (rl.startsWith('leg_') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('paralegal') || rl.includes('attorney'))
    return { title: 'Research AI law, data governance, or high-complexity litigation roles where AI tools are weakest', detail: `Legal work most protected from AI is in novel regulatory interpretation, complex litigation strategy, and emerging practice areas like AI law, data privacy, and technology transactions. ${isSenior ? 'At your seniority, a specialization shift in the next 12 months is credible and well-timed.' : 'Building a specialization track now positions you for a role that AI tools actively create demand for, not displace.'} Use ${platform}.`, riskReduction: 17, protectionIncrease: 26, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };

  // Generic fallback
  return { title: 'Evaluate roles in structurally growing, AI-resistant areas proactively', detail: `Map your current skills to roles where AI-resistant headcount is growing. ${isSenior ? 'At your seniority level, proactive role evaluation before you need to move is 3x more effective than reactive searching under pressure.' : 'Proactive positioning before the market forces change gives you negotiating leverage to move on your terms.'} Use ${platform} to research target roles now.`, riskReduction: 18, protectionIncrease: 28, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '6–10 hrs/week', roi: 'Exceptional' };
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

  const action90_2: ActionCard = getRoleProjectAction(roleKey, roleLabel, expTier, platform);

  const bufferMonths = salaryRange && (salaryRange === '200k+' || salaryRange === '100-200k') ? '6-month' : '3-month';
  const action90_3: ActionCard = { title: `Build a ${bufferMonths} emergency financial buffer`, detail: `Financial runway removes the desperation premium from career decisions. With ${bufferCurrency} in reserve, you can move on your terms — not under pressure. This is the most underrated career protection action.`, riskReduction: 0, protectionIncrease: 15, effort: 'High', category: 'Financial', strategicImpact: 'Critical', timeRequired: 'Ongoing', roi: 'Exceptional' };

  // ── Before threshold: pre-agentic positioning ──────────────────────────────
  let thresholdLabel: 'CRITICAL WINDOW' | 'PROACTIVE POSITIONING' | 'MONITORING MODE';
  let thresholdColor: string;
  if (d7Score > 75) { thresholdLabel = 'CRITICAL WINDOW'; thresholdColor = 'var(--red)'; }
  else if (d7Score >= 30) { thresholdLabel = 'PROACTIVE POSITIONING'; thresholdColor = 'var(--amber)'; }
  else { thresholdLabel = 'MONITORING MODE'; thresholdColor = 'var(--emerald)'; }

  const action_t1: ActionCard = getRoleThresholdAction(roleKey, roleLabel, d7Score, thresholdNear);

  const action_t2: ActionCard = getRoleExternalPresenceAction(roleKey, roleLabel, platform, expTier);

  const action_t3: ActionCard = getRoleTransitionAction(roleKey, roleLabel, expTier, platform);

  // ── 12-month: strategic repositioning ────────────────────────────────────────
  const action12_1: ActionCard = isHighRisk
    ? { title: 'Complete a full role-transition evaluation and pick your target tier', detail: `High AI risk means your current role's task profile will shift materially in 2–3 years. Spend this year systematically evaluating adjacent roles that are structurally protected: AI orchestration, domain expertise roles, or human-judgment-intensive positions. Map your transferable skills, identify the 2–3 target roles, and begin positioning now while your current role gives you credibility and income. Use ${platform} to research target role compensation and requirements.`, riskReduction: 14, protectionIncrease: 22, effort: 'High', category: 'Positioning', strategicImpact: 'Critical', timeRequired: '5–8 hrs/week', roi: 'Exceptional' }
    : isMedRisk
    ? { title: 'Establish yourself as the AI-augmented leader in your function', detail: `Medium risk means AI tools are changing your function but not eliminating your role. The 12-month window is your opportunity to be the person who shapes how your team adopts AI — not the person who waits to be told. Own one AI tool rollout, one process redesign, or one AI training initiative. Professionals who lead AI adoption are systematically the last to be displaced by it. Use ${platform} to find relevant professional communities.`, riskReduction: 10, protectionIncrease: 18, effort: 'High', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' }
    : { title: 'Deepen your domain expertise into areas AI cannot credibly enter', detail: 'Low AI risk gives you the luxury of strategic deepening rather than reactive pivoting. Use this 12-month window to go deeper into the most judgment-intensive, relationship-dependent, or physically-embodied parts of your field. The professionals who compound this advantage now will be the most protected when AI capabilities eventually expand further.', riskReduction: 6, protectionIncrease: 14, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };

  const action12_2: ActionCard = (() => {
    const rl = (roleKey || roleLabel || '').toLowerCase();
    const isSWE = rl.startsWith('sw_') || rl.includes('software') || rl.includes('developer') || rl.includes('engineer');
    const isData = rl.startsWith('da_') || rl.startsWith('ml_') || rl.startsWith('ds_') || rl.includes('data');
    const isFinance = rl.startsWith('fin_') || rl.startsWith('inv_') || rl.includes('finance') || rl.includes('financial');
    const isHC = rl.startsWith('hc_') || rl.startsWith('nur_') || rl.includes('nurse') || rl.includes('physician') || rl.includes('clinical');
    const isLegal = rl.startsWith('leg_') || rl.includes('legal') || rl.includes('lawyer') || rl.includes('attorney');
    const isCreative = rl.startsWith('mkt_') || rl.startsWith('des_') || rl.startsWith('cnt_') || rl.includes('marketing') || rl.includes('design') || rl.includes('creative');

    if (isSWE)   return { title: 'Build a public technical portfolio with at least one AI-integrated system', detail: `A GitHub portfolio showing real AI-integrated systems — not just CRUD apps — is the strongest signal in the engineering job market right now. Spend this year shipping one project that uses an LLM, an agent framework, or AI infrastructure (vector stores, embedding pipelines, evaluators). A deployed system with real usage data is worth more than any certification. Use ${platform} to benchmark against your target role requirements.`, riskReduction: 11, protectionIncrease: 19, effort: 'High', category: 'Positioning', strategicImpact: 'High', timeRequired: '6–8 hrs/week', roi: 'Exceptional' };
    if (isData)  return { title: 'Lead one end-to-end AI project that produces a measurable business decision', detail: `Data professionals who can close the loop from raw data to AI-generated insight to implemented business decision are significantly more protected than those who stop at the dashboard. Identify one project this year where you own the full chain — data, model, insight, and implementation. Document the business impact. Use ${platform} to research how this positions you vs. peers.`, riskReduction: 11, protectionIncrease: 18, effort: 'High', category: 'Positioning', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'Exceptional' };
    if (isFinance) return { title: 'Build a track record of AI-augmented advisory recommendations', detail: `Finance professionals who can document a track record of better recommendations made faster using AI tools are the most promotable and most protected in the field. Spend this year deliberately tracking: which analyses used AI tools, how much time was saved, and what additional advisory value you delivered with the freed capacity. This evidence becomes your strongest career asset. Use ${platform}.`, riskReduction: 10, protectionIncrease: 17, effort: 'High', category: 'Positioning', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };
    if (isHC)    return { title: 'Earn one advanced clinical specialization or AI clinical literacy credential', detail: 'The 12-month window is long enough to complete a subspecialty certification, a telehealth or informatics credential, or formal training in AI clinical decision support. Clinical professionals with documented specialization in areas AI tools cannot replicate — complex multi-system cases, trauma-informed care, rare disease — are the most protected tier in healthcare.', riskReduction: 9, protectionIncrease: 17, effort: 'High', category: 'Skill', strategicImpact: 'High', timeRequired: '5–8 hrs/week', roi: 'High' };
    if (isLegal) return { title: 'Develop a public-facing specialization in emerging law with an original body of written analysis', detail: 'AI law, data privacy, regulatory technology, and emerging liability frameworks are the fastest-growing legal practice areas — and the areas where AI research tools are weakest. Spend this year building a public record: two or three well-researched articles, one conference presentation, or a newsletter covering your specialization. Lawyers with a visible public record in emerging areas attract clients independently of their firm.', riskReduction: 10, protectionIncrease: 18, effort: 'High', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };
    if (isCreative) return { title: 'Establish a public portfolio that shows creative direction, not just execution', detail: `The 12-month horizon is long enough to build a meaningful body of work that demonstrates your creative judgment — not just your ability to use tools. Pick one creative challenge this year and document your full process: brief, direction decisions, execution, and outcome. Publish it. Creative directors who show their thinking are categorically more resilient than those who show only their output. Use ${platform} to find your audience.`, riskReduction: 10, protectionIncrease: 18, effort: 'High', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };
    return { title: 'Build one publicly visible proof of expertise in your most AI-resistant skill', detail: `A publication, case study, conference presentation, or open-source contribution that demonstrates your deepest, most judgment-intensive expertise creates career optionality that no job listing can provide. Spend this year producing one externally visible piece of work that shows the specific judgment AI cannot replicate in your field. Use ${platform} to identify where your audience is.`, riskReduction: 10, protectionIncrease: 17, effort: 'High', category: 'Network', strategicImpact: 'High', timeRequired: '4–6 hrs/week', roi: 'High' };
  })();

  const action12_3: ActionCard = { title: 'Build and activate a strategic professional network of 20+ target contacts', detail: `Network connections in roles 1–2 levels above yours and in adjacent AI-resilient functions are your most underrated career insurance. Spend the year making 2 new strategic connections per month — not random LinkedIn adds, but specific people whose career trajectories represent where you want to be. A warm network is the single most effective buffer against forced career transitions. Use ${platform} to identify your targets.`, riskReduction: 5, protectionIncrease: 14, effort: 'Medium', category: 'Network', strategicImpact: 'High', timeRequired: '2–3 hrs/week', roi: 'High' };

  const action12_4: ActionCard = { title: `Negotiate a ${isHighRisk ? 'skills-expansion or role-evolution' : 'strategic responsibility expansion'} into your next performance review`, detail: isHighRisk ? `High AI risk means waiting for your employer to redefine your role is a losing strategy. Before your next review cycle, propose a role evolution: one AI tool you will own, one process you will redesign, one strategic responsibility you will take on. Professionals who proactively reshape their role before it is reshaped for them retain agency and compensation leverage.` : `Your current protection level gives you negotiating leverage to expand strategically. Propose adding one AI-adjacent responsibility in your next review — a tool evaluation, an AI pilot project, or a cross-functional initiative. This positions you as an AI-forward leader without requiring a role change.`, riskReduction: 7, protectionIncrease: 13, effort: 'Medium', category: 'Positioning', strategicImpact: 'High', timeRequired: '3–5 hrs prep', roi: 'Exceptional' };

  const action12_5: ActionCard = { title: 'Run an annual career survival self-audit', detail: 'At the 12-month mark, re-assess: which tasks in your role have become more automated since you ran this report? Which skills have you built that did not exist in your profile a year ago? Which threats have materialized and which have not? Careers that survive AI disruption are managed actively, not passively. Schedule a quarterly 90-minute review of your task profile, market position, and AI capability changes in your sector.', riskReduction: 4, protectionIncrease: 10, effort: 'Low', category: 'Positioning', strategicImpact: 'High', timeRequired: '90 min/quarter', roi: 'High' };

  return {
    '30d': [action30_1, action30_2, action30_3],
    '90d': [action90_1, action90_2, action90_3],
    '12m': [action12_1, action12_2, action12_3, action12_4, action12_5],
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

  // Dedup within the active horizon only — each horizon is independent.
  // Cross-horizon dedup was the bug: a shared Set swallowed later horizons entirely.
  function dedupeActions(actions: ActionCard[]): ActionCard[] {
    const seen = new Set<string>();
    return actions.filter(a => {
      const key = a.title.toLowerCase().trim().slice(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const currentActions = dedupeActions(personalized[activeHorizon]);
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
      {/* Feature explanation banner */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-start',
        padding: '12px 14px', borderRadius: '8px', marginBottom: '16px',
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>🗺️</span>
        <div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', fontWeight: 700, lineHeight: 1.4 }}>
            Your personalised action plan
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            These actions are specific to your role, your experience level, and your country — not generic advice. Each tab gives you a different time horizon: what to do <strong style={{ color: 'var(--text-2)' }}>this month</strong>, what to build over the <strong style={{ color: 'var(--text-2)' }}>next 3 months</strong>, your <strong style={{ color: 'var(--text-2)' }}>12-month roadmap</strong>, and what to do <strong style={{ color: 'var(--text-2)' }}>before AI changes your role</strong> structurally. Each action shows how much it reduces your risk and how long it takes.
          </p>
        </div>
      </div>

      {/* Experience-tier callout */}
      {(() => {
        const expTier = getExpTier(experience);
        const expMessages: Record<ExpTier, string> = {
          entry:     "Because you're early in your career, these actions focus on building a durable skill foundation before the first wave of automation hits entry-level tasks.",
          early:     "Because you have 2–5 years of experience, these actions focus on deepening your specialization and building the contextual judgment AI tools still cannot replicate.",
          mid:       "Because you already have 5–10 years, you've seen architectural failures and organizational dynamics that AI cannot learn from code alone. These actions help you convert that into visible positioning.",
          senior:    "With 10–20 years, your edge is institutional trust and judgment. These actions focus on making that expertise visible and compounding your human-advantage moat.",
          principal: "At 20+ years, your experience is your most durable asset. These actions protect the relationship and judgment network that no AI system can replicate.",
        };
        return (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--cyan)', lineHeight: 1.6, margin: 0 }}>
              {expMessages[expTier]}
            </p>
          </div>
        );
      })()}

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

      {/* Impact statement — runway extension in human terms */}
      {(() => {
        const totalProtection = currentActions.reduce((s, a) => s + (a.protectionIncrease ?? 0), 0);
        const highCount = currentActions.filter(a => (a.protectionIncrease ?? 0) >= 8).length;
        const runwayMonthsEst = Math.round(totalProtection * 0.6);
        if (runwayMonthsEst < 1) return null;
        const runwayText = runwayMonthsEst >= 12
          ? `~${Math.round(runwayMonthsEst / 12 * 10) / 10} year${Math.round(runwayMonthsEst / 12 * 10) / 10 !== 1 ? 's' : ''}`
          : `~${runwayMonthsEst} month${runwayMonthsEst !== 1 ? 's' : ''}`;
        return (
          <div style={{
            padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
            background: `${scoreColor}08`, border: `1px solid ${scoreColor}22`,
            display: 'flex', gap: '10px', alignItems: 'center',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>📈</span>
            <div>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-1)' }}>
                Completing these {activeHorizon === '30d' ? '30-day' : activeHorizon === '90d' ? '90-day' : activeHorizon === '12m' ? '12-month' : 'threshold'} actions can extend your career runway by {runwayText}
              </span>
              {highCount > 0 && (
                <span style={{ fontSize: '0.68rem', color: scoreColor, marginLeft: '6px', fontWeight: 600 }}>
                  · {highCount} HIGH IMPACT action{highCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Action cards — all horizons use currentActions (never empty by design) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {currentActions.map((action) => (
          <ActionCardComponent key={action.title} action={action} scoreColor={scoreColor} />
        ))}
      </div>

      {/* 12-month: StrategicRoadmap appended below the action cards if intel available */}
      {activeHorizon === '12m' && intel && (
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.52rem', fontWeight: 800, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '14px' }}>FULL 12-MONTH STRATEGIC ROADMAP</div>
          <StrategicRoadmap intel={intel} experience={experience} scoreColor={scoreColor} score={score} />
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
  const [expanded, setExpanded] = React.useState(false);
  const effortC = EFFORT_COLORS[action.effort];
  const catC    = CAT_COLORS[action.category];
  const roiC    = action.roi ? ROI_COLORS[action.roi] : 'var(--text-3)';
  const survivalIncrease = Math.round(action.protectionIncrease * 0.4);
  // Impact level replaces fake-precise "+N months" badge
  const impactLevel = action.protectionIncrease >= 8 ? 'HIGH IMPACT'
    : action.protectionIncrease >= 5 ? 'MODERATE IMPACT'
    : 'FOUNDATIONAL';
  const impactColor = impactLevel === 'HIGH IMPACT' ? 'var(--emerald)'
    : impactLevel === 'MODERATE IMPACT' ? 'var(--cyan)' : 'var(--text-3)';
  // Extract reason: first sentence of detail, or use action.reason if provided
  const reason = action.reason ?? (action.detail.split('. ')[0] + '.');

  return (
    <div style={{
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
            {action.title}
          </div>
          <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ padding: '2px 7px', borderRadius: '4px', background: `${catC}15`, border: `1px solid ${catC}30`, fontSize: '0.58rem', fontWeight: 800, color: catC, fontFamily: 'var(--font-mono)' }}>
              {action.category.toUpperCase()}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${impactColor}12`, border: `1px solid ${impactColor}30`, fontSize: '0.6rem', fontWeight: 900, color: impactColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
              {impactLevel === 'FOUNDATIONAL' ? '●' : '▲'} {impactLevel}
            </span>
          </div>
        </div>

        {/* Why this protects you */}
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: `${scoreColor}08`, border: `1px solid ${scoreColor}20`, marginBottom: '10px' }}>
          <div style={{ fontSize: '0.56rem', fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '3px' }}>WHY THIS PROTECTS YOU</div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{reason}</p>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div style={{ padding: '4px 10px', borderRadius: '5px', background: `${effortC}08`, border: `1px solid ${effortC}20`, fontSize: '0.65rem', color: effortC, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            Difficulty: {action.effort}
          </div>
          {action.timeRequired && (
            <div style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              Time: {action.timeRequired}
            </div>
          )}
          {action.roi && (
            <div style={{ padding: '4px 10px', borderRadius: '5px', background: `${roiC}08`, border: `1px solid ${roiC}20`, fontSize: '0.65rem', color: roiC, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ROI: {action.roi}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          {expanded ? '▲ Hide detail' : '▼ Show full detail'}
        </button>
      </div>

      {/* Collapsible full detail */}
      {expanded && (
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: '0.73rem', color: 'var(--text-3)', lineHeight: 1.65, margin: 0 }}>
            {action.detail}
          </p>
        </div>
      )}
    </div>
  );
}
