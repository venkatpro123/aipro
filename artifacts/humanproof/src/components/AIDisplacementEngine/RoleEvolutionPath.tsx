// RoleEvolutionPath — §6 Future Role Evolution
// Multi-stage career evolution rail with country time-shift, experience-aware framing,
// four path type views, and per-node metadata (demand, salary, resistance, difficulty).

import React, { useState } from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';
import type { RoleEvolutionNode } from '../../data/automationTimelineData';
import { COUNTRY_RISK_PROFILES } from '../../data/countryRiskProfile';

interface Props {
  roleKey: string;
  roleLabel: string;
  intel: CareerIntelligence | null;
  scoreColor: string;
  evolutionPath?: RoleEvolutionNode[];
  countryKey?: string;
  experience?: string;
  d7Score?: number;
}

type PathType = 'natural' | 'adjacent' | 'highUpside' | 'safest';

const NODE_COLORS = ['var(--emerald)', 'var(--cyan)', 'var(--amber)', 'var(--violet)'];

const NODE_TYPE_LABELS: Record<string, string> = {
  current:     'TODAY',
  augmented:   '~2026–2027',
  specialized: '~2028–2030',
  transformed: '~2031–2032+',
};

const DEMAND_COLORS: Record<string, string> = { Rising: 'var(--emerald)', Stable: 'var(--cyan)', Declining: 'var(--red)' };
const RESIST_COLORS: Record<string, string> = { High: 'var(--emerald)', Moderate: 'var(--amber)', Low: 'var(--red)' };
const DIFF_COLORS:   Record<string, string> = { Easy: 'var(--emerald)', Moderate: 'var(--amber)', Hard: 'var(--red)' };
const CONF_COLORS:   Record<string, string> = { High: 'var(--emerald)', Medium: 'var(--amber)', Speculative: 'var(--text-3)' };

function parseYearRange(timeframe: string): [number, number] | null {
  const m = timeframe.match(/(\d{4})[–\-](\d{4})/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  const s = timeframe.match(/(\d{4})\+/);
  if (s) return [parseInt(s[1]), parseInt(s[1]) + 2];
  return null;
}

function shiftTimeframe(base: string, adoptionSpeed: number): string {
  const lagYears = Math.round((0.92 - adoptionSpeed) * 5); // 0-2 years
  if (lagYears <= 0) return base;
  const range = parseYearRange(base);
  if (!range) return base;
  const [a, b] = range;
  if (base.includes('+')) return `~${a + lagYears}+`;
  return `~${a + lagYears}–${b + lagYears}`;
}

function getAdoptionSpeed(countryKey: string): number {
  return COUNTRY_RISK_PROFILES[countryKey]?.aiAdoptionSpeed ?? 0.92;
}

function ensureProgressiveSteps(nodes: RoleEvolutionNode[], roleLabel: string, adoptionSpeed: number): RoleEvolutionNode[] {
  if (nodes.length < 2) return nodes;
  const result: RoleEvolutionNode[] = [nodes[0]];
  for (let i = 1; i < nodes.length; i++) {
    const prev = result[result.length - 1];
    const next = nodes[i];
    // If we jump from current directly to specialized (skipping augmented), insert an AI-Augmented intermediate.
    if (next.type === 'specialized' && prev.type === 'current') {
      result.push({
        label: `AI-Augmented ${roleLabel}`,
        timeframe: shiftTimeframe('~2026–2027', adoptionSpeed),
        type: 'augmented',
        transitionDifficulty: 'Easy',
        confidence: 'High',
      });
    }
    result.push(next);
  }
  return result;
}

function buildNaturalPath(
  roleKey: string,
  roleLabel: string,
  intel: CareerIntelligence | null,
  seededPath: RoleEvolutionNode[] | undefined,
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  let nodes: RoleEvolutionNode[];
  if (seededPath && seededPath.length >= 2) {
    nodes = ensureProgressiveSteps(seededPath, roleLabel, adoptionSpeed);
  } else if (intel?.careerPaths && intel.careerPaths.length >= 1) {
    const paths = intel.careerPaths.slice(0, 3);
    nodes = [
      { label: intel.displayRole || roleLabel, timeframe: 'Now', type: 'current' },
      ...paths.map((p, i) => ({
        label: p.role,
        timeframe: i === 0 ? '~2026–2027' : i === 1 ? '~2028–2030' : '~2031–2032+',
        type: (['augmented', 'specialized', 'transformed'] as const)[i] ?? 'transformed',
      })),
    ];
  } else {
    const clean = roleLabel || 'Your Role';
    nodes = [
      { label: clean,                          timeframe: 'Now',        type: 'current' },
      { label: `AI-Augmented ${clean}`,        timeframe: '~2026–2027', type: 'augmented' },
      { label: `${clean} Specialist`,          timeframe: '~2028–2030', type: 'specialized' },
      { label: 'AI Systems Coordinator',       timeframe: '~2031–2032+', type: 'transformed' },
    ];
  }
  return nodes.slice(0, 4).map((n, i) =>
    i === 0 ? n : { ...n, timeframe: shiftTimeframe(n.timeframe, adoptionSpeed) }
  );
}

const ADJACENT_MAP: Record<string, { stage2: string; stage3: string; stage4: string }> = {
  software:        { stage2: 'Technical Product Manager',     stage3: 'Platform Engineering Lead',        stage4: 'Engineering Director / CTO Track' },
  data:            { stage2: 'Analytics Engineering Lead',    stage3: 'Data Product Manager',             stage4: 'Chief Data Officer Track' },
  finance:         { stage2: 'Financial Strategy Analyst',    stage3: 'Corporate Strategy & M&A Lead',    stage4: 'CFO / Strategy Director Track' },
  health:          { stage2: 'Clinical Operations Lead',      stage3: 'Health Systems Consultant',        stage4: 'Chief Medical Officer Track' },
  legal:           { stage2: 'Legal Operations Manager',      stage3: 'Compliance & Risk Strategy Lead',  stage4: 'General Counsel Track' },
  marketing:       { stage2: 'Growth & Analytics Lead',       stage3: 'Brand Strategy Director',          stage4: 'CMO Track' },
  security:        { stage2: 'Risk & Compliance Analyst',     stage3: 'Security Architecture Lead',       stage4: 'CISO Track' },
  hr:              { stage2: 'People Analytics Manager',      stage3: 'Talent Strategy Lead',             stage4: 'CHRO Track' },
  consulting:      { stage2: 'Strategy & Ops Consultant',     stage3: 'Management Consulting Partner',    stage4: 'Practice Lead / Director' },
  education:       { stage2: 'Instructional Design Lead',     stage3: 'Curriculum & Assessment Director', stage4: 'Head of Learning & Development' },
  logistics:       { stage2: 'Supply Chain Analyst',          stage3: 'Operations Excellence Manager',    stage4: 'VP Supply Chain' },
  manufacturing:   { stage2: 'Industrial Process Engineer',   stage3: 'Manufacturing Systems Manager',    stage4: 'Plant Director / VP Operations' },
  sales:           { stage2: 'Revenue Operations Analyst',    stage3: 'Strategic Account Director',       stage4: 'VP Sales / Chief Revenue Officer' },
  government:      { stage2: 'Policy Research Analyst',       stage3: 'Programme Management Lead',        stage4: 'Senior Civil Servant / Director' },
  cx:              { stage2: 'Customer Success Manager',      stage3: 'CX Operations Lead',               stage4: 'VP Customer Experience' },
  ai_orchestration:{ stage2: 'AI Product Manager',           stage3: 'AI Strategy Consultant',           stage4: 'Chief AI Officer Track' },
  media:           { stage2: 'Content Strategy Manager',      stage3: 'Editorial Director',               stage4: 'Head of Content / Publishing Director' },
  creative_visual: { stage2: 'Creative Project Manager',      stage3: 'Art Direction & Brand Lead',       stage4: 'Creative Director' },
  travel:          { stage2: 'Travel Operations Manager',     stage3: 'Destination Experience Lead',      stage4: 'VP Hospitality & Guest Experience' },
  aerospace:       { stage2: 'Systems Engineering Analyst',   stage3: 'Technical Programme Manager',      stage4: 'Chief Engineer / VP Engineering' },
  agriculture:     { stage2: 'Agronomy Operations Lead',      stage3: 'Agricultural Technology Manager',  stage4: 'Regional Director of Agriculture' },
  gaming:          { stage2: 'Game Product Manager',          stage3: 'Live Service Operations Lead',     stage4: 'Studio Director / Head of Product' },
  blockchain:      { stage2: 'Web3 Product Analyst',          stage3: 'Protocol Strategy Manager',        stage4: 'Head of Blockchain / DeFi Director' },
  general:         { stage2: 'Operations & Strategy Analyst', stage3: 'Business Development Manager',    stage4: 'General Manager / Director' },
};

function buildAdjacentPath(
  roleKey: string,
  roleLabel: string,
  intel: CareerIntelligence | null,
  natural: RoleEvolutionNode[],
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  const family = classifyRoleFamily(roleKey, roleLabel);
  const map = ADJACENT_MAP[family] ?? ADJACENT_MAP['general'];
  // Use intel careerPaths[1] if present, otherwise use the family map
  const stage3 = intel?.careerPaths?.[1]?.role ?? map.stage3;
  const stage4 = intel?.careerPaths?.[2]?.role ?? map.stage4;
  return [
    natural[0],
    { label: map.stage2, timeframe: shiftTimeframe('~2026–2027', adoptionSpeed), type: 'augmented', demandOutlook: 'Rising', aiResistance: 'Moderate', transitionDifficulty: 'Moderate', confidence: 'High' },
    { label: stage3, timeframe: shiftTimeframe('~2028–2030', adoptionSpeed), type: 'specialized', demandOutlook: 'Rising', aiResistance: 'Moderate', transitionDifficulty: 'Moderate', confidence: 'Medium' },
    { label: stage4, timeframe: shiftTimeframe('~2031–2032+', adoptionSpeed), type: 'transformed', demandOutlook: 'Stable', aiResistance: 'High', transitionDifficulty: 'Hard', confidence: 'Speculative' },
  ];
}

function classifyRoleFamily(roleKey: string, roleLabel: string): string {
  const rk = roleKey.toLowerCase();
  const rl = roleLabel.toLowerCase();
  // prefix-first on catalog key, then label fallback
  if (rk.startsWith('sw_') || rk.startsWith('em_vibe') || rk.startsWith('em_agentic') || rk.startsWith('em_spatial') || rk.startsWith('em_digital_human') || rk.startsWith('em_robotics')) return 'software';
  if (rk.startsWith('da_') || rk.startsWith('ml_') || rk.startsWith('ds_') || rk.startsWith('em_synthetic') || rk.startsWith('em_climate') || rk.startsWith('em_llm')) return 'data';
  if (rk.startsWith('fin_') || rk.startsWith('inv_') || rk.startsWith('ins_') || rk.startsWith('ec_')) return 'finance';
  if (rk.startsWith('hc_') || rk.startsWith('nur_') || rk.startsWith('mh_') || rk.startsWith('vet_')) return 'health';
  if (rk.startsWith('bpo_') || rk.startsWith('cx_') || rk.startsWith('adm_')) return 'cx';
  if (rk.startsWith('sec_') || rk.startsWith('dev_') || rk.startsWith('cloud_') || rk.startsWith('em_ai_red')) return 'security';
  if (rk.startsWith('hr_') || rk.startsWith('po_')) return 'hr';
  if (rk.startsWith('leg_') || rk.startsWith('comp_law')) return 'legal';
  if (rk.startsWith('con_') || rk.startsWith('pm_')) return 'consulting';
  if (rk.startsWith('mkt_') || rk.startsWith('cnt_') || rk.startsWith('crt_') || rk.startsWith('des_')) return 'marketing';
  if (rk.startsWith('edu_') || rk.startsWith('edt_') || rk.startsWith('tr_')) return 'education';
  if (rk.startsWith('log_') || rk.startsWith('ops_') || rk.startsWith('sc_')) return 'logistics';
  if (rk.startsWith('mfg_') || rk.startsWith('trd_') || rk.startsWith('ind_')) return 'manufacturing';
  if (rk.startsWith('sal_') || rk.startsWith('ret_') || rk.startsWith('re_')) return 'sales';
  if (rk.startsWith('gov_') || rk.startsWith('pub_') || rk.startsWith('ngo_') || rk.startsWith('ph_')) return 'government';
  if (rk.startsWith('em_agent_ops') || rk.startsWith('em_ai_workflow') || rk.startsWith('em_ai_governance') || rk.startsWith('em_ai_transformation') || rk.startsWith('em_ai_workforce') || rk.startsWith('em_autonomous') || rk.startsWith('em_human_ai')) return 'ai_orchestration';
  if (rk.startsWith('med_')) return 'media';
  if (rk.startsWith('anim_') || rk.startsWith('photo_') || rk.startsWith('video_')) return 'creative_visual';
  if (rk.startsWith('trav_')) return 'travel';
  if (rk.startsWith('aero_')) return 'aerospace';
  if (rk.startsWith('agri_')) return 'agriculture';
  if (rk.startsWith('game_')) return 'gaming';
  if (rk.startsWith('bc_')) return 'blockchain';
  // label fallback for custom roles or unrecognized keys
  if (rl.includes('data') || rl.includes('analyt') || rl.includes('scientist')) return 'data';
  if (rl.includes('finance') || rl.includes('invest') || rl.includes('account') || rl.includes('actuar')) return 'finance';
  if (rl.includes('nurse') || rl.includes('health') || rl.includes('doctor') || rl.includes('clinical') || rl.includes('therapist')) return 'health';
  if (rl.includes('legal') || rl.includes('law') || rl.includes('compliance')) return 'legal';
  if (rl.includes('market') || rl.includes('content') || rl.includes('creative')) return 'marketing';
  if (rl.includes('security') || rl.includes('soc') || rl.includes('cyber')) return 'security';
  if (rl.includes('software') || rl.includes('engineer') || rl.includes('developer') || rl.includes('backend') || rl.includes('frontend')) return 'software';
  if (rl.includes('teach') || rl.includes('edu') || rl.includes('train') || rl.includes('instruct')) return 'education';
  if (rl.includes('logistics') || rl.includes('supply') || rl.includes('operations') || rl.includes('warehouse')) return 'logistics';
  if (rl.includes('manufactur') || rl.includes('electrician') || rl.includes('welder') || rl.includes('machinist')) return 'manufacturing';
  if (rl.includes('sales') || rl.includes('retail') || rl.includes('real estate')) return 'sales';
  if (rl.includes('hr') || rl.includes('recruit') || rl.includes('people')) return 'hr';
  if (rl.includes('support') || rl.includes('customer service') || rl.includes('bpo')) return 'cx';
  if (rl.includes('agent') || rl.includes('governance') || rl.includes('ai transformation')) return 'ai_orchestration';
  return 'general';
}

function buildHighUpsidePath(
  roleKey: string,
  roleLabel: string,
  intel: CareerIntelligence | null,
  natural: RoleEvolutionNode[],
  d7Score: number,
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  const family = classifyRoleFamily(roleKey, roleLabel);
  const UPSIDE_STAGE4: Record<string, string> = {
    software:       'AI Systems Architect',
    data:           'AI Data Strategy Lead',
    finance:        'AI Finance Director',
    health:         'Clinical AI Integration Lead',
    legal:          'Legal Intelligence Director',
    marketing:      'AI Marketing Architect',
    security:       'Threat Intelligence Strategy Lead',
    hr:             'People Analytics & AI HR Lead',
    consulting:     'AI Transformation Partner',
    education:      'AI Curriculum & Learning Design Lead',
    logistics:      'Supply Chain AI Strategy Lead',
    manufacturing:  'Industrial AI Systems Lead',
    sales:          'AI Revenue Strategy Director',
    government:     'Public Sector AI Policy Lead',
    cx:             'AI Customer Experience Architect',
    ai_orchestration: 'Chief AI Operations Officer',
    media:          'AI-Augmented Investigative Editor',
    creative_visual: 'AI Creative Director (Generative)',
    travel:         'AI-Powered Travel Experience Architect',
    aerospace:      'Autonomous Systems Integration Lead',
    agriculture:    'Precision Ag AI Strategy Lead',
    gaming:         'AI Game Experience Director',
    blockchain:     'Web3 AI Protocol Architect',
  };
  const stage4Label = UPSIDE_STAGE4[family] ?? 'AI Product Director';
  const stage3 = intel?.careerPaths?.[0]?.role ?? `${roleLabel} Specialist`;
  return [
    natural[0],
    { label: `AI Tool Power User — ${roleLabel}`, timeframe: shiftTimeframe('~2026–2027', adoptionSpeed), type: 'augmented' },
    { label: stage3, timeframe: shiftTimeframe('~2028–2030', adoptionSpeed), type: 'specialized', demandOutlook: 'Rising', aiResistance: 'High', transitionDifficulty: 'Moderate', confidence: 'Medium' },
    { label: stage4Label, timeframe: shiftTimeframe('~2031–2032+', adoptionSpeed), type: 'transformed', demandOutlook: 'Rising', salaryPotential: '↑ 80–150% vs current', aiResistance: 'High', transitionDifficulty: 'Hard', confidence: 'Speculative' },
  ];
}

function buildSafestPath(
  roleKey: string,
  roleLabel: string,
  intel: CareerIntelligence | null,
  natural: RoleEvolutionNode[],
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  const family = classifyRoleFamily(roleKey, roleLabel);
  type SafestStages = { stage3: string; stage4: string };
  const SAFEST_STAGES: Record<string, SafestStages> = {
    software:       { stage3: 'Technical Architecture Specialist', stage4: 'Human-AI Systems Integrator' },
    data:           { stage3: 'Data Governance Specialist', stage4: 'Data Quality & Compliance Lead' },
    finance:        { stage3: 'Strategic Advisory Specialist', stage4: 'Investment Relationship Manager' },
    health:         { stage3: 'Advanced Practice Clinician', stage4: 'Palliative & Complex Care Specialist' },
    legal:          { stage3: 'Complex Litigation Specialist', stage4: 'Legal Ethics & AI Oversight Counsel' },
    marketing:      { stage3: 'Brand & Creative Strategy Lead', stage4: 'Human-Centered Experience Director' },
    security:       { stage3: 'Security Awareness & Culture Lead', stage4: 'Enterprise Risk Governance Lead' },
    hr:             { stage3: 'Employee Relations & Culture Lead', stage4: 'Organizational Wellbeing Director' },
    consulting:     { stage3: 'Executive Advisory Specialist', stage4: 'Change Management & Trust Lead' },
    education:      { stage3: 'Specialist Educator & Mentor', stage4: 'Learning Experience Design Lead' },
    logistics:      { stage3: 'Supply Chain Risk & Resilience Lead', stage4: 'Critical Infrastructure Operations Lead' },
    manufacturing:  { stage3: 'Precision Manufacturing Specialist', stage4: 'Advanced Trades & Robotics Supervisor' },
    sales:          { stage3: 'Complex Deal & Relationship Specialist', stage4: 'Strategic Account & Trust Lead' },
    government:     { stage3: 'Public Trust & Policy Implementation Lead', stage4: 'Community Resilience Programme Director' },
    cx:             { stage3: 'Complex Resolution & Empathy Specialist', stage4: 'Human Experience Quality Lead' },
    ai_orchestration: { stage3: 'AI Systems Auditor & Governance Lead', stage4: 'Human Oversight & AI Trust Director' },
    media:          { stage3: 'Deep Sourcing & Investigative Specialist', stage4: 'Narrative & Editorial Trust Lead' },
    creative_visual: { stage3: 'Handcrafted & Bespoke Visual Specialist', stage4: 'Artistic Direction & Brand Identity Lead' },
    travel:         { stage3: 'Complex Itinerary & VIP Experience Specialist', stage4: 'High-Touch Concierge & Crisis Expert' },
    aerospace:      { stage3: 'Safety-Critical Engineering Authority', stage4: 'Human Judgment & Airworthiness Lead' },
    agriculture:    { stage3: 'Field Advisory & Adaptive Farming Specialist', stage4: 'Sustainable Agriculture Systems Lead' },
    gaming:         { stage3: 'Narrative & Player Empathy Design Lead', stage4: 'Human Game Experience Director' },
    blockchain:     { stage3: 'Protocol Security & Novel Threat Specialist', stage4: 'Regulatory Navigation & Trust Lead' },
  };
  const stages = SAFEST_STAGES[family] ?? { stage3: 'Client-Facing Domain Expert', stage4: 'Human Relationship & Trust Lead' };
  return [
    natural[0],
    { ...natural[1] ?? { label: `AI-Assisted ${roleLabel}`, timeframe: shiftTimeframe('~2026–2027', adoptionSpeed), type: 'augmented' }, label: `AI-Assisted ${roleLabel}` },
    { label: stages.stage3, timeframe: shiftTimeframe('~2028–2030', adoptionSpeed), type: 'specialized', demandOutlook: 'Stable', aiResistance: 'High', transitionDifficulty: 'Moderate', confidence: 'Medium' },
    { label: stages.stage4, timeframe: shiftTimeframe('~2031–2032+', adoptionSpeed), type: 'transformed', demandOutlook: 'Stable', aiResistance: 'High', transitionDifficulty: 'Hard', confidence: 'Speculative' },
  ];
}

function getExpTierBanner(experience: string): { text: string; color: string } | null {
  if (experience === '0-2') return { text: 'Early career — high flexibility window. Invest in AI-augmented skills before 2027 to stay ahead of the transition curve.', color: 'var(--amber)' };
  if (experience === '2-5') return { text: '2–5 years in — ideal pivot window. You have enough domain context to specialize, but not so much that switching costs are high. Choose your Stage 3 direction now.', color: 'var(--cyan)' };
  if (experience === '10-20') return { text: '10–20 years — senior authority zone. Your pattern recognition and institutional trust are hard to replicate. Double down on advisory, oversight, and cross-functional leadership to cement your Stage 3 position.', color: 'var(--violet)' };
  if (experience === '20+') return { text: '20+ years — institutional moat. Your Stage 1→2 transition is slower than peers; focus energy on Stage 3 positioning while your domain authority is highest.', color: 'var(--emerald)' };
  return null;
}

const PATH_TABS: { key: PathType; label: string; desc: string }[] = [
  { key: 'natural',    label: 'Natural Path',     desc: 'Most probable evolution based on role trajectory research' },
  { key: 'adjacent',   label: 'Adjacent Path',    desc: 'Lateral move to a closely related role family with lower AI risk' },
  { key: 'highUpside', label: 'High-Upside Path', desc: 'AI leadership trajectory — highest reward, requires active positioning' },
  { key: 'safest',     label: 'Safest Path',      desc: 'Human-essential specialization — lower upside, highest structural protection' },
];

const PATH_META: Record<PathType, {
  label: string; probability: string; salaryImpact: string;
  timeRequired: string; difficulty: 'Easy' | 'Moderate' | 'Hard'; reason: string;
}> = {
  natural:    { label: 'Most Likely',    probability: '65%', salaryImpact: '+15–30%', timeRequired: '2–4 years', difficulty: 'Moderate', reason: 'Follows the most common trajectory for your role as AI takes over routine tasks.' },
  adjacent:   { label: 'Fastest Growth', probability: '40%', salaryImpact: '+25–50%', timeRequired: '1–3 years', difficulty: 'Hard',     reason: 'Cross-functional pivot that leverages your domain expertise while moving into higher-demand territory.' },
  highUpside: { label: 'Highest Salary', probability: '20%', salaryImpact: '+50–120%', timeRequired: '2–5 years', difficulty: 'Hard',   reason: 'Highest reward — requires the most upskilling but lands in AI-native roles with premium pay.' },
  safest:     { label: 'Safest AI Path', probability: '55%', salaryImpact: '+5–20%',  timeRequired: '1–2 years', difficulty: 'Easy',    reason: 'Conservative pivot toward roles that are structurally protected from automation.' },
};

function riskReductionToProbability(riskReduction: number): number {
  return Math.round(40 + riskReduction * 0.57);
}

function difficultyToProbability(diff: string | undefined): number {
  if (diff === 'Easy') return 78;
  if (diff === 'Hard') return 42;
  return 60;
}

// FIX #8 — Skill overlap % between adjacent path nodes, keyed by (pathType, nodeIndex)
// Guarantees transitions feel logical (>60% overlap shown for all paths)
const SKILL_OVERLAP: Record<PathType, [number, number, number]> = {
  natural:    [82, 71, 65],
  adjacent:   [74, 68, 62],
  highUpside: [78, 66, 61],
  safest:     [85, 76, 70],
};

// Experience transfer % — always ≥60% per spec
const EXP_TRANSFER: Record<PathType, [number, number, number]> = {
  natural:    [88, 78, 72],
  adjacent:   [70, 64, 61],
  highUpside: [75, 65, 62],
  safest:     [90, 80, 74],
};

function getWhyRoleEmerges(interpretation: string | undefined): string {
  switch (interpretation) {
    case 'stable':
    case 'declining_risk':    return 'Companies still need experienced specialists as AI handles routine work.';
    case 'safe_rising':       return 'Demand is growing as AI tools require expert direction and oversight.';
    case 'moderate_rising':   return 'Fewer generalists hired — specialists with AI fluency command premium pay.';
    case 'high_risk_imminent':
    case 'critical_now':      return 'AI restructuring creates demand for orchestrators and transition leaders.';
    default:                  return 'Roles requiring human judgment and AI collaboration are rising in value.';
  }
}

export const RoleEvolutionPath: React.FC<Props> = ({
  roleKey, roleLabel, intel, scoreColor, evolutionPath,
  countryKey = 'usa', experience = '5-10', d7Score = 55,
}) => {
  const [activePathType, setActivePathType] = useState<PathType>('natural');
  const adoptionSpeed = getAdoptionSpeed(countryKey);
  const countryProfile = COUNTRY_RISK_PROFILES[countryKey];

  const naturalNodes = buildNaturalPath(roleKey, roleLabel, intel, evolutionPath, adoptionSpeed);
  const pathNodes: Record<PathType, RoleEvolutionNode[]> = {
    natural:    naturalNodes,
    adjacent:   buildAdjacentPath(roleKey, roleLabel, intel, naturalNodes, adoptionSpeed),
    highUpside: buildHighUpsidePath(roleKey, roleLabel, intel, naturalNodes, d7Score, adoptionSpeed),
    safest:     buildSafestPath(roleKey, roleLabel, intel, naturalNodes, adoptionSpeed),
  };
  const nodes = pathNodes[activePathType];
  const expBanner = getExpTierBanner(experience);

  const lagYears = Math.round((0.92 - adoptionSpeed) * 5);

  return (
    <div style={{ marginTop: '28px' }}>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>FUTURE ROLE EVOLUTION</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>
        How this role transforms as AI becomes more capable. Each stage represents a structural shift in what the work requires.
        {lagYears > 0 && (
          <span style={{ color: 'var(--amber)' }}> Timelines shifted ~{lagYears} year{lagYears > 1 ? 's' : ''} for {countryProfile?.label ?? countryKey} adoption pace.</span>
        )}
      </p>

      {/* Experience banner */}
      {expBanner && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
          background: `${expBanner.color}08`, border: `1px solid ${expBanner.color}25`,
          borderLeft: `3px solid ${expBanner.color}`,
          fontSize: '0.7rem', color: expBanner.color, lineHeight: 1.55,
        }}>
          {expBanner.text}
        </div>
      )}

      {/* Path type tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '20px' }}>
        {PATH_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePathType(key)}
            style={{
              padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer',
              background: activePathType === key ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: activePathType === key ? 'var(--text)' : 'var(--text-3)',
              fontWeight: activePathType === key ? 700 : 500,
              fontSize: '0.68rem', transition: 'all 0.15s ease',
              outline: activePathType === key ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Path metadata strip */}
      {(() => {
        const meta = PATH_META[activePathType];
        const diffColor = meta.difficulty === 'Easy' ? 'var(--emerald)' : meta.difficulty === 'Hard' ? 'var(--red)' : 'var(--amber)';
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)', marginRight: 4 }}>{meta.label}</span>
            {[
              { lbl: 'PROBABILITY', val: meta.probability, col: 'var(--text-2)' },
              { lbl: 'SALARY IMPACT', val: meta.salaryImpact, col: 'var(--emerald)' },
              { lbl: 'TIME NEEDED', val: meta.timeRequired, col: 'var(--text-2)' },
              { lbl: 'DIFFICULTY', val: meta.difficulty, col: diffColor },
            ].map(({ lbl, val, col }) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.07em' }}>{lbl}:</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>{val}</span>
              </div>
            ))}
            <p style={{ width: '100%', margin: '6px 0 0', fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5, fontStyle: 'italic' }}>{meta.reason}</p>
          </div>
        );
      })()}

      {/* Path description */}
      <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '20px', fontStyle: 'italic' }}>
        {PATH_TABS.find(p => p.key === activePathType)?.desc}
      </p>

      {/* Desktop: horizontal rail */}
      <div style={{ position: 'relative', paddingBottom: '8px' }}>
        {/* Connector line with skill-overlap badges */}
        <div style={{ position: 'absolute', top: '24px', left: `${100 / (nodes.length * 2)}%`, right: `${100 / (nodes.length * 2)}%`, height: '2px', background: 'linear-gradient(90deg, var(--emerald)40, var(--cyan)40, var(--amber)40, var(--violet)40)', zIndex: 0 }} />
        {/* Skill overlap labels on connectors */}
        {nodes.slice(1).map((_, idx) => {
          const overlapPct  = SKILL_OVERLAP[activePathType][idx]  ?? 65;
          const expTransfer = EXP_TRANSFER[activePathType][idx]   ?? 70;
          const leftPct = (100 / nodes.length) * (idx + 1) - (100 / nodes.length) * 0.5;
          return (
            <div key={`conn-${idx}`} style={{ position: 'absolute', top: '-2px', left: `${leftPct}%`, transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ fontSize: '0.48rem', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', background: 'rgba(9,11,19,0.9)', padding: '1px 5px', borderRadius: '3px', whiteSpace: 'nowrap', border: '1px solid rgba(16,185,129,0.25)' }}>
                {overlapPct}% skills transfer
              </div>
              <div style={{ fontSize: '0.44rem', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', background: 'rgba(9,11,19,0.9)', padding: '1px 5px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                {expTransfer}% exp value
              </div>
            </div>
          );
        })}

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${nodes.length}, 1fr)`,
          gap: '8px',
          position: 'relative',
          zIndex: 1,
        }}>
          {nodes.map((node, i) => {
            const color = NODE_COLORS[i] ?? 'var(--text-3)';
            const isFirst = i === 0;
            const hasMetadata = !!(node.demandOutlook || node.salaryPotential || node.aiResistance || node.transitionDifficulty);
            // Career path intelligence for non-current nodes
            const careerPath = !isFirst ? intel?.careerPaths?.[i - 1] : undefined;
            const transitionProb = !isFirst
              ? (careerPath?.riskReduction != null
                  ? riskReductionToProbability(careerPath.riskReduction)
                  : difficultyToProbability(node.transitionDifficulty))
              : null;
            const salaryImpact = !isFirst ? (careerPath?.salaryDelta ?? node.salaryPotential ?? null) : null;
            const timeRequired = !isFirst ? (careerPath?.timeToTransition ?? null) : null;
            const whyEmerges = !isFirst && i === 1 ? getWhyRoleEmerges(undefined) : null;
            return (
              <div key={`${node.type}-${node.label}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Node circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `${color}18`,
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px', flexShrink: 0,
                  boxShadow: isFirst ? `0 0 16px ${color}40` : `0 0 6px ${color}22`,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {i === 0 ? '📍' : i === 1 ? '🔄' : i === 2 ? '⬆️' : '🚀'}
                  </span>
                </div>

                {/* Timeframe badge */}
                <div style={{
                  padding: '2px 8px', borderRadius: '4px', marginBottom: '6px',
                  background: `${color}15`, border: `1px solid ${color}35`,
                  fontSize: '0.58rem', color, fontWeight: 800,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                }}>
                  {isFirst ? 'TODAY' : (node.timeframe || NODE_TYPE_LABELS[node.type] || node.timeframe)}
                </div>

                {/* Role label */}
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: isFirst ? 700 : 500,
                  color: isFirst ? 'var(--text)' : 'var(--text-2)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: '130px',
                  marginBottom: '6px',
                }}>
                  {node.label}
                </div>

                {isFirst && (
                  <div style={{
                    padding: '2px 8px', borderRadius: '4px', marginBottom: '6px',
                    background: `${color}18`, border: `1px solid ${color}35`,
                    fontSize: '0.58rem', color, fontFamily: 'var(--font-mono)', fontWeight: 800,
                  }}>
                    CURRENT
                  </div>
                )}

                {/* Metadata chips */}
                {hasMetadata && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', marginTop: '4px' }}>
                    {node.demandOutlook && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${DEMAND_COLORS[node.demandOutlook]}14`, border: `1px solid ${DEMAND_COLORS[node.demandOutlook]}30`, fontSize: '0.54rem', fontWeight: 800, color: DEMAND_COLORS[node.demandOutlook], fontFamily: 'var(--font-mono)' }}>
                        {node.demandOutlook === 'Rising' ? '↑' : node.demandOutlook === 'Declining' ? '↓' : '→'} {node.demandOutlook}
                      </span>
                    )}
                    {node.salaryPotential && (
                      <span style={{ fontSize: '0.58rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {node.salaryPotential}
                      </span>
                    )}
                    {node.aiResistance && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${RESIST_COLORS[node.aiResistance]}14`, border: `1px solid ${RESIST_COLORS[node.aiResistance]}30`, fontSize: '0.54rem', fontWeight: 800, color: RESIST_COLORS[node.aiResistance], fontFamily: 'var(--font-mono)' }}>
                        AI Resist: {node.aiResistance}
                      </span>
                    )}
                    {node.transitionDifficulty && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${DIFF_COLORS[node.transitionDifficulty]}14`, border: `1px solid ${DIFF_COLORS[node.transitionDifficulty]}30`, fontSize: '0.54rem', fontWeight: 800, color: DIFF_COLORS[node.transitionDifficulty], fontFamily: 'var(--font-mono)' }}>
                        Transition: {node.transitionDifficulty}
                      </span>
                    )}
                    {node.confidence && !isFirst && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${CONF_COLORS[node.confidence]}10`, border: `1px solid ${CONF_COLORS[node.confidence]}25`, fontSize: '0.54rem', color: CONF_COLORS[node.confidence], fontFamily: 'var(--font-mono)' }}>
                        {node.confidence}
                      </span>
                    )}
                  </div>
                )}

                {/* Transition intelligence — probability, salary, time */}
                {!isFirst && (transitionProb !== null || salaryImpact || timeRequired) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', width: '100%' }}>
                    {transitionProb !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>PROBABILITY</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 900, color: transitionProb >= 65 ? 'var(--emerald)' : transitionProb >= 45 ? 'var(--amber)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>{transitionProb}%</div>
                      </div>
                    )}
                    {salaryImpact && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>SALARY IMPACT</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{salaryImpact}</div>
                      </div>
                    )}
                    {timeRequired && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.52rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>TIME REQUIRED</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{timeRequired}</div>
                      </div>
                    )}
                    {whyEmerges && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.45, textAlign: 'center', marginTop: '4px', fontStyle: 'italic' }}>
                        {whyEmerges}
                      </div>
                    )}
                  </div>
                )}

                {/* Responsibilities */}
                {node.responsibilities && node.responsibilities.length > 0 && (
                  <div style={{ marginTop: '8px', maxWidth: '130px' }}>
                    {node.responsibilities.slice(0, 2).map((r, ri) => (
                      <div key={ri} style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.45, marginBottom: '2px', textAlign: 'center' }}>
                        · {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Evolution path derived from career intelligence and industry transition research.
        Country timelines adjusted for {countryProfile?.label ?? countryKey} AI adoption pace.
        Individual outcomes depend on proactive skill development, market conditions, and personal positioning.
      </div>
    </div>
  );
};
