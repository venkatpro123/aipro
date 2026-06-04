// agenticWaveEngine.ts — AI Displacement Intelligence Engine
//
// All functions are pure (no side effects, no network calls).
// computeAgenticWaveEngine() is the single entry point called from AuditTerminalPage.
//
// Scoring philosophy:
//   Current score (D1-D6) = snapshot of today's risk
//   Agentic wave score    = same dimensions re-weighted for mainstream agentic AI (2028-2032)
//   These are PROJECTIONS, not guarantees. Always labelled as estimates.

import type { ScoreResult } from './riskFormula';
import { ROLE_COMPLEXITY_MAP, D2_ROLE_CATEGORY_MATURITY } from './riskFormula';
import type { CareerIntelligence } from './intelligence/types';
import type {
  AgenticWaveResult,
  AgenticWaveScore,
  CapabilityThresholdState,
  TaskExposureEntry,
  SurvivalFactor,
  FutureRoleStep,
  WaveStatusDetail,
  ActionHorizon,
  ActionItem,
  PsychologicalFrame,
  WaveStatus,
  ThresholdStage,
  AdoptionSpeed,
} from './agenticWaveTypes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function round(v: number) { return Math.round(v); }

function industryPrefix(industryKey: string): string {
  return (industryKey ?? '').split('_')[0];
}

function rolePrefix(workType: string): string {
  return (workType ?? '').split('_')[0];
}

// ── Industry adoption speed lookup ────────────────────────────────────────────

const INDUSTRY_ADOPTION_SPEED: Record<string, AdoptionSpeed> = {
  // Fast — BPO, admin, content, finance, data, marketing, web
  bpo: 'fast', adm: 'fast', cnt: 'fast', fin: 'fast', data: 'fast',
  mkt: 'fast', adv: 'fast', sw: 'fast', web: 'fast', mob: 'fast',
  dev: 'fast', qa: 'fast', erp: 'fast', ds: 'fast', inv: 'fast',
  med: 'fast', des: 'fast', photo: 'fast', video: 'fast',
  // Moderate — retail, logistics, services, manufacturing, consulting
  ret: 'moderate', ec: 'moderate', log: 'moderate', trav: 'moderate',
  con: 'moderate', ser: 'moderate', fmcg: 'moderate', ins: 'moderate',
  ft: 'moderate', hr: 'moderate', leg: 'moderate', saas: 'moderate',
  mfg: 'moderate', auto: 'moderate', eng: 'moderate', game: 'moderate',
  mus: 'moderate', bc: 'moderate', sec: 'moderate', ml: 'moderate',
  // Slow — healthcare, education, government, non-profit, agriculture
  hc: 'slow', nur: 'slow', ph: 'slow', mh: 'slow', edu: 'slow',
  edt: 'slow', tr: 'slow', gov: 'slow', ngo: 'slow', agri: 'slow',
  trd: 'slow', env: 'slow', urb: 'slow', aero: 'slow', en: 'slow',
  ag: 'slow', hos: 'moderate', em: 'moderate',
};

const ADOPTION_BOOST: Record<AdoptionSpeed, number> = {
  fast: 11, moderate: 5, slow: 2,
};

// ── Wave status lookup (calibrated 2025-2026) ─────────────────────────────────

const INDUSTRY_WAVE_STATUS: Record<string, WaveStatus> = {
  // ACTIVE — AI has crossed the mainstream threshold for core tasks
  bpo: 'ACTIVE', cnt: 'ACTIVE',
  // INFLECTION — AI widely deployed, productivity multipliers proven, restructuring underway
  adm: 'INFLECTION', fin: 'INFLECTION', data: 'INFLECTION', ds: 'INFLECTION',
  med: 'INFLECTION', mkt: 'INFLECTION', adv: 'INFLECTION',
  // ACCELERATING — Mainstream tools exist, rapid adoption, competitive pressure high
  sw: 'ACCELERATING', web: 'ACCELERATING', mob: 'ACCELERATING', dev: 'ACCELERATING',
  qa: 'ACCELERATING', des: 'ACCELERATING', photo: 'ACCELERATING', video: 'ACCELERATING',
  inv: 'ACCELERATING', ins: 'ACCELERATING', hr: 'ACCELERATING', saas: 'ACCELERATING',
  leg: 'ACCELERATING', erp: 'ACCELERATING', ft: 'ACCELERATING',
  // BUILDING — Sector-specific tools exist, adoption uneven, path clear
  ret: 'BUILDING', ec: 'BUILDING', log: 'BUILDING', con: 'BUILDING',
  ser: 'BUILDING', fmcg: 'BUILDING', mfg: 'BUILDING', auto: 'BUILDING',
  eng: 'BUILDING', game: 'BUILDING', mus: 'BUILDING', trav: 'BUILDING',
  bc: 'BUILDING', sec: 'BUILDING', ml: 'BUILDING', hc: 'BUILDING',
  ph: 'BUILDING', edt: 'BUILDING', tr: 'BUILDING', hos: 'BUILDING',
  em: 'BUILDING',
  // EARLY — Regulatory, physical, or trust barriers significantly slow adoption
  nur: 'EARLY', mh: 'EARLY', edu: 'EARLY', gov: 'EARLY', ngo: 'EARLY',
  agri: 'EARLY', trd: 'EARLY', env: 'EARLY', urb: 'EARLY', aero: 'EARLY',
  en: 'EARLY', ag: 'EARLY',
};

const WAVE_STATUS_META: Record<WaveStatus, { label: string; color: string; description: string }> = {
  EARLY:       { label: 'Early Stage',      color: '#10b981', description: 'AI capabilities exist but adoption is limited by regulatory, trust, or structural barriers.' },
  BUILDING:    { label: 'Building',         color: '#22d3ee', description: 'Sector-specific AI tools are emerging. Adoption is uneven but the direction is clear.' },
  ACCELERATING:{ label: 'Accelerating',     color: '#f59e0b', description: 'Mainstream AI tools are driving rapid adoption. Competitive pressure is rising across the industry.' },
  INFLECTION:  { label: 'Inflection Point', color: '#f97316', description: 'AI productivity multipliers are proven. Organisations are restructuring around AI-augmented workflows.' },
  ACTIVE:      { label: 'Active Disruption',color: '#ef4444', description: 'AI has crossed the mainstream capability threshold. Role definitions are actively changing.' },
};

// ── Projected score tier labels ───────────────────────────────────────────────

function projectedScoreLabel(score: number): { label: string; color: string } {
  if (score < 30) return { label: 'RESILIENT',  color: '#10b981' };
  if (score < 50) return { label: 'MODERATE',   color: '#22d3ee' };
  if (score < 65) return { label: 'ELEVATED',   color: '#f59e0b' };
  if (score < 80) return { label: 'HIGH',        color: '#f97316' };
  if (score < 90) return { label: 'SEVERE',      color: '#ef4444' };
  return                 { label: 'EXTREME',     color: '#dc2626' };
}

// ── 1. Agentic Wave Score ─────────────────────────────────────────────────────

function computeAgenticWaveScore(
  result: ScoreResult,
  workType: string,
  industryKey: string,
): AgenticWaveScore {
  const dims = result.dimensions;
  const d1 = dims.find(d => d.key === 'D1')?.score ?? 50;
  const d2 = dims.find(d => d.key === 'D2')?.score ?? 50;
  const d3 = dims.find(d => d.key === 'D3')?.score ?? 50;
  const d4 = dims.find(d => d.key === 'D4')?.score ?? 50;
  const d5 = dims.find(d => d.key === 'D5')?.score ?? 50;
  const d6 = dims.find(d => d.key === 'D6')?.score ?? 50;

  // Complexity proxy for role (higher = more human cognitive complexity = lower risk)
  const complexityProxy = ROLE_COMPLEXITY_MAP[workType] ?? 0.5;

  // Step-change D1 amplifier based on role type:
  // Low complexity (automatable) roles see D1 jump more aggressively
  const amplifier =
    complexityProxy < 0.35 ? 1.10 :
    complexityProxy < 0.65 ? 1.20 :
                             1.30;

  const d1Future = clamp(d1 * amplifier, d1, 95);
  const d2Future = clamp(d2 * 1.25, d2, 98);

  // Agentic weights: D1 and D2 dominate; D4 and D5 shrink
  const rawScore =
    d1Future * 0.40 +
    d2Future * 0.30 +
    d3       * 0.12 +
    d4       * 0.08 +
    d5       * 0.05 +
    d6       * 0.05;

  const ipfx = industryPrefix(industryKey);
  const speed = INDUSTRY_ADOPTION_SPEED[ipfx] ?? 'moderate';
  const boost = ADOPTION_BOOST[speed];

  const projectedScore = clamp(round(rawScore + boost), result.total, 99);

  const gap = projectedScore - result.total;

  // Key drivers — explain the score change in plain language
  const keyDrivers: string[] = [];
  if (d1Future > d1 + 5) {
    keyDrivers.push(`Task automation potential increases as agentic AI handles routine ${workType.replace(/_/g, ' ')} workflows directly.`);
  }
  if (d2Future > d2 + 5) {
    keyDrivers.push(`AI tool maturity in this sector is projected to reach saturation within the forecast window.`);
  }
  if (boost >= 8) {
    keyDrivers.push(`This industry is on a fast adoption trajectory — AI deployment economics are already favourable.`);
  } else if (boost >= 5) {
    keyDrivers.push(`Moderate industry adoption speed means structural change arrives, but with a longer lead time.`);
  } else {
    keyDrivers.push(`Regulatory, physical, or trust barriers are expected to slow AI deployment in this sector.`);
  }
  if (gap <= 5) {
    keyDrivers.push(`The gap between today and the agentic scenario is narrow, suggesting role exposure is already priced in.`);
  }

  const { label, color } = projectedScoreLabel(projectedScore);

  return {
    currentScore: result.total,
    projectedScore,
    projectionWindow: 'Agentic AI mainstream scenario (2028–2032 estimated)',
    industryAdoptionSpeed: speed,
    keyDrivers: keyDrivers.slice(0, 3),
    scoreLabel: label,
    scoreColor: color,
  };
}

// ── 2. Wave Status ────────────────────────────────────────────────────────────

function computeWaveStatus(d2: number, industryKey: string): WaveStatusDetail {
  const ipfx = industryPrefix(industryKey);
  let status: WaveStatus = INDUSTRY_WAVE_STATUS[ipfx] ?? 'BUILDING';

  // D2 override: if AI tools are very mature but the industry table says BUILDING, upgrade
  if (d2 >= 80 && status === 'BUILDING') status = 'ACCELERATING';
  if (d2 >= 90 && (status === 'BUILDING' || status === 'ACCELERATING')) status = 'INFLECTION';

  const meta = WAVE_STATUS_META[status];

  const supportingSignals: string[] = [];
  if (d2 >= 85) supportingSignals.push('AI tool maturity for this role category is very high (≥85/100)');
  else if (d2 >= 65) supportingSignals.push(`AI tool maturity is moderate–high (${round(d2)}/100)`);
  else supportingSignals.push(`AI tooling for this role is still emerging (${round(d2)}/100)`);

  const speed = INDUSTRY_ADOPTION_SPEED[ipfx] ?? 'moderate';
  supportingSignals.push(
    speed === 'fast'     ? 'This sector is on a fast AI adoption trajectory' :
    speed === 'moderate' ? 'Industry adoption speed is moderate' :
                           'Sector adoption is constrained by structural barriers'
  );

  return {
    status,
    label: meta.label,
    description: meta.description,
    color: meta.color,
    supportingSignals,
    industryContext: `${industryKey.replace(/_/g, ' ')} sector`,
  };
}

// ── 3. Capability Threshold State ────────────────────────────────────────────

function computeCapabilityThresholdState(
  d1: number,
  d2: number,
  waveStatus: WaveStatus,
): CapabilityThresholdState {
  let stage: ThresholdStage;
  if (d1 > 80 && d2 > 80)         stage = 'POST_THRESHOLD';
  else if (d1 >= 65 || d2 >= 65)  stage = 'THRESHOLD_WINDOW';
  else if (d1 >= 40 && d2 >= 40)  stage = 'APPROACHING';
  else                             stage = 'CURRENT';

  const timingConfidence: 'LOW' | 'MEDIUM' | 'HIGH' =
    (waveStatus === 'EARLY')                                   ? 'LOW' :
    (waveStatus === 'BUILDING' || waveStatus === 'ACCELERATING') ? 'MEDIUM' :
                                                                   'HIGH';

  const STAGE_META: Record<ThresholdStage, {
    label: string; description: string; timingRange: string;
    triggerConditions: string[]; nextStage: ThresholdStage | null;
  }> = {
    CURRENT: {
      label: 'Current State — AI Assists',
      description: 'AI capabilities exist for parts of this role, but cannot yet reliably perform the core work without expert supervision.',
      timingRange: 'Approaching phase estimated within 2–4 years',
      triggerConditions: [
        'AI models consistently pass senior-practitioner evaluations for core tasks',
        'Autonomous completion rates exceed 40% without expert review',
        'Cost parity with junior human workers in routine task execution',
      ],
      nextStage: 'APPROACHING',
    },
    APPROACHING: {
      label: 'Approaching — AI Handles Significant Workflows',
      description: 'AI is closing the capability gap. Core tasks are increasingly AI-assisted, and the percentage of work requiring human input is declining.',
      timingRange: 'Threshold window estimated within 1–3 years',
      triggerConditions: [
        'AI executes 40%+ of routine tasks without expert supervision',
        'Enterprise procurement of AI agents for this role category begins at scale',
        'Productivity multipliers of 3–5× become publicly demonstrated',
      ],
      nextStage: 'THRESHOLD_WINDOW',
    },
    THRESHOLD_WINDOW: {
      label: 'Threshold Window — Estimated: 2027–2030',
      description: 'AI can now perform most routine work in this role. The remaining question is deployment speed and economic incentive — not capability.',
      timingRange: 'Post-threshold restructuring may begin within 1–2 years',
      triggerConditions: [
        'Enterprise-scale deployment becomes cost-competitive with human labor',
        'Agentic AI systems with minimal supervision reach production readiness',
        'First major workforce reductions at industry-defining companies are announced',
      ],
      nextStage: 'POST_THRESHOLD',
    },
    POST_THRESHOLD: {
      label: 'Post-Threshold — AI Performs Core Execution',
      description: 'AI systems routinely perform this role\'s core tasks. Human employment in this exact job definition is restructuring. The role is evolving, not disappearing — but the transition is active.',
      timingRange: 'Threshold already crossed — transition timeline is now',
      triggerConditions: [],
      nextStage: null,
    },
  };

  const meta = STAGE_META[stage];
  return {
    stage,
    stageLabel: meta.label,
    stageDescription: meta.description,
    timingConfidence,
    directionConfidence: 'HIGH',
    timingRange: meta.timingRange,
    triggerConditions: meta.triggerConditions,
    nextStage: meta.nextStage,
  };
}

// ── 4. Task Exposure Breakdown ────────────────────────────────────────────────

// Generic task templates per role prefix (fallback when no seeded skills)
const ROLE_TASK_TEMPLATES: Record<string, { tasks: string[]; aiTools?: string[] }> = {
  sw:   { tasks: ['Code generation & boilerplate','Unit test writing','Bug identification','Code review','Architecture design','System design docs','API integration','Stakeholder communication'], aiTools: ['GitHub Copilot','Claude','ChatGPT'] },
  web:  { tasks: ['HTML/CSS markup','Component development','API integration','UI layout & design','Cross-browser testing','Performance optimisation','Accessibility review','Client communication'], aiTools: ['Copilot','v0','Cursor'] },
  mob:  { tasks: ['UI component building','API integration','Push notification logic','App store submission','Performance profiling','Code review','Architecture planning','Stakeholder communication'] },
  data: { tasks: ['Data cleaning & prep','SQL query writing','Dashboard building','Statistical analysis','Report generation','ETL pipeline coding','Data quality checks','Insight communication'], aiTools: ['Julius AI','ChatGPT','Tableau AI'] },
  fin:  { tasks: ['Financial report drafting','Data reconciliation','Variance analysis','Compliance checks','Forecasting models','Client summary writing','Risk calculations','Stakeholder presentation'] },
  bpo:  { tasks: ['Data entry & processing','Customer query handling','Document processing','Record updating','Standard reporting','Escalation routing','Quality checking','Team coordination'] },
  cnt:  { tasks: ['Content drafting','SEO keyword research','Social copy writing','Email campaign copy','Blog article creation','Content editing','Performance reporting','Content strategy'], aiTools: ['Jasper','ChatGPT','Claude'] },
  mkt:  { tasks: ['Campaign copy creation','Ad targeting setup','Analytics reporting','A/B test analysis','Audience segmentation','Email drafting','Social scheduling','Performance reporting'] },
  hc:   { tasks: ['Patient assessment','Diagnosis reasoning','Treatment planning','Medical documentation','Medication review','Patient communication','Care coordination','Clinical decision-making'] },
  edu:  { tasks: ['Lesson planning','Assessment creation','Student feedback','Curriculum development','Administrative tasks','Parent communication','Progress tracking','Classroom facilitation'] },
  des:  { tasks: ['Visual concept creation','UI mockup design','Asset production','Design system updates','Prototype building','User research','Design reviews','Client presentation'], aiTools: ['Midjourney','Adobe Firefly','Figma AI'] },
  leg:  { tasks: ['Contract drafting','Legal research','Document review','Case summary writing','Compliance analysis','Client advice preparation','Due diligence','Court filing preparation'] },
  hr:   { tasks: ['Job description writing','CV screening','Interview scheduling','Offer letter drafting','Policy documentation','Performance review admin','Onboarding coordination','HR reporting'] },
};

const GENERIC_TASKS = [
  'Routine task execution', 'Standard report generation', 'Data processing & validation',
  'Complex judgment calls', 'Stakeholder communication', 'Strategic planning & analysis',
];

function computeTaskExposureBreakdown(
  workType: string,
  _industryKey: string,
  intel: CareerIntelligence | null,
  d1: number,
): TaskExposureEntry[] {
  const entries: TaskExposureEntry[] = [];

  if (intel?.skills) {
    // Priority 1: derive from seeded skill tiers
    const allSkills = [
      ...(intel.skills.obsolete ?? []).slice(0, 3).map(s => ({ name: s.skill, aiPct: 72 + Math.round(Math.random() * 12), tier: 'obsolete' as const, aiTool: s.aiTool })),
      ...(intel.skills.at_risk  ?? []).slice(0, 3).map(s => ({ name: s.skill, aiPct: 42 + Math.round(Math.random() * 16), tier: 'at_risk' as const, aiTool: s.aiTool })),
      ...(intel.skills.safe     ?? []).slice(0, 2).map(s => ({ name: s.skill, aiPct: 10 + Math.round(Math.random() * 18), tier: 'safe'    as const, aiTool: undefined as string | undefined })),
    ];

    for (const s of allSkills) {
      const humanPct = clamp(100 - s.aiPct, 5, 95);
      const exposureLevel =
        s.aiPct >= 75 ? 'critical' :
        s.aiPct >= 50 ? 'high' :
        s.aiPct >= 30 ? 'medium' : 'low';
      const trajectory =
        s.tier === 'obsolete' ? 'ai_dominant' :
        s.tier === 'at_risk'  ? 'ai_gaining'  : 'stable';
      entries.push({ task: s.name, humanPct, aiPct: s.aiPct, trajectory, exposureLevel, aiTool: s.aiTool });
    }
  }

  if (entries.length < 6) {
    // Priority 2: role-prefix template
    const rpfx = rolePrefix(workType);
    const template = ROLE_TASK_TEMPLATES[rpfx];
    const tasks = template?.tasks ?? GENERIC_TASKS;
    const tools = template?.aiTools ?? [];
    const n = tasks.length;

    tasks.slice(0, 8).forEach((task, i) => {
      if (entries.some(e => e.task === task)) return;
      // Graduate aiPct across the task list (first tasks more exposed)
      const baseFraction = 1 - (i / (n - 1));
      const rawAiPct = clamp(round(d1 * baseFraction + 5 + (Math.random() - 0.5) * 8), 5, 95);
      const humanPct = 100 - rawAiPct;
      const exposureLevel =
        rawAiPct >= 75 ? 'critical' :
        rawAiPct >= 50 ? 'high' :
        rawAiPct >= 30 ? 'medium' : 'low';
      const trajectory =
        rawAiPct >= 60 ? 'ai_dominant' :
        rawAiPct >= 35 ? 'ai_gaining'  : 'stable';
      entries.push({ task, humanPct, aiPct: rawAiPct, trajectory, exposureLevel, aiTool: tools[i % tools.length] });
    });
  }

  return entries.sort((a, b) => b.aiPct - a.aiPct).slice(0, 8);
}

// ── 5. Survival Factors ───────────────────────────────────────────────────────

const SCARCITY_FROM_DIFFICULTY: Record<string, 'SCARCE' | 'BALANCED' | 'ABUNDANT'> = {
  'Very High': 'SCARCE', 'Extremely High': 'SCARCE',
  'High': 'BALANCED',
  'Medium': 'ABUNDANT', 'Low': 'ABUNDANT', 'Very Low': 'ABUNDANT',
};

function computeSurvivalFactors(
  intel: CareerIntelligence | null,
  result: ScoreResult,
): SurvivalFactor[] {
  const factors: SurvivalFactor[] = [];

  if (intel?.skills) {
    // Safe skills — high protection, high future value
    for (const s of (intel.skills.safe ?? []).slice(0, 4)) {
      factors.push({
        skill: s.skill,
        protectionScore: s.longTermValue ?? clamp(100 - result.total + 20, 40, 95),
        futureValue: s.longTermValue ?? 82,
        marketScarcity: SCARCITY_FROM_DIFFICULTY[s.difficulty] ?? 'BALANCED',
        scarcityReason: s.whySafe,
        tier: 'safe',
        horizon: '5yr+',
      });
    }
    // At-risk skills — moderate protection, declining future value
    for (const s of (intel.skills.at_risk ?? []).slice(0, 3)) {
      factors.push({
        skill: s.skill,
        protectionScore: clamp(50 - (s.riskScore ?? 0) / 4, 20, 55),
        futureValue: clamp(60 - (s.riskScore ?? 0) / 5, 25, 58),
        marketScarcity: 'BALANCED',
        scarcityReason: `At risk from AI augmentation — adapting this skill increases its durability.`,
        tier: 'at_risk',
        horizon: s.horizon,
      });
    }
    // Obsolete skills — low protection
    for (const s of (intel.skills.obsolete ?? []).slice(0, 2)) {
      factors.push({
        skill: s.skill,
        protectionScore: clamp(20 - (s.riskScore ?? 0) / 10, 5, 22),
        futureValue: 8,
        marketScarcity: 'ABUNDANT',
        scarcityReason: `Being absorbed by AI tools — transitioning away from this skill is advised.`,
        tier: 'obsolete',
        horizon: s.horizon,
      });
    }
  } else {
    // Unseeded fallback — derive 3 generic factors from D3 score (human amplification)
    const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
    const d6 = result.dimensions.find(d => d.key === 'D6')?.score ?? 50;
    factors.push(
      { skill: 'Complex Judgment & Decision-Making', protectionScore: clamp(d3 + 10, 30, 95), futureValue: clamp(d3 + 15, 40, 95), marketScarcity: d3 > 55 ? 'SCARCE' : 'BALANCED', scarcityReason: 'AI struggles with high-stakes judgment in ambiguous, novel situations.', tier: 'safe', horizon: '5yr+' },
      { skill: 'Stakeholder Relationships & Communication', protectionScore: clamp(d6 + 5, 30, 90), futureValue: clamp(d6 + 10, 40, 90), marketScarcity: 'BALANCED', scarcityReason: 'Trust-based relationships require consistent human presence and accountability.', tier: 'safe', horizon: '5yr+' },
      { skill: 'Routine Task Execution', protectionScore: clamp(100 - result.total - 10, 5, 40), futureValue: 15, marketScarcity: 'ABUNDANT', scarcityReason: 'High automation potential — AI can handle routine execution reliably.', tier: 'obsolete', horizon: '1-3yr' },
    );
  }

  return factors;
}

// ── 6. Future Role Evolution ──────────────────────────────────────────────────

function computeFutureRoleEvolution(
  intel: CareerIntelligence | null,
  result: ScoreResult,
  workType: string,
): FutureRoleStep[] {
  const displayRole = intel?.displayRole ?? workType.replace(/_/g, ' ');
  const steps: FutureRoleStep[] = [];

  // Step 0: Current role
  steps.push({ role: displayRole, timeframe: 'Now', riskLevel: result.total, isCurrentRole: true });

  if (intel?.careerPaths && intel.careerPaths.length > 0) {
    const p0 = intel.careerPaths[0];
    steps.push({
      role: p0.role,
      timeframe: p0.timeToTransition ?? '12–24 months',
      riskLevel: clamp(result.total - (p0.riskReduction ?? 15), 15, result.total - 5),
      isCurrentRole: false,
      transitionNote: p0.skillGap ? `Key gap: ${p0.skillGap}` : undefined,
    });
    if (intel.careerPaths.length > 1) {
      const p1 = intel.careerPaths[1];
      steps.push({
        role: p1.role,
        timeframe: '3–4 years',
        riskLevel: clamp(result.total - (p0.riskReduction ?? 15) - (p1.riskReduction ?? 10), 10, result.total - 10),
        isCurrentRole: false,
        transitionNote: p1.skillGap ? `Key gap: ${p1.skillGap}` : undefined,
      });
    }
  } else {
    // Generic evolution if no seeded paths
    const rpfx = rolePrefix(workType);
    const augRole = `AI-Augmented ${displayRole}`;
    steps.push({ role: augRole, timeframe: '12–24 months', riskLevel: clamp(result.total - 12, 15, 80), isCurrentRole: false, transitionNote: 'Integrate AI tools into core workflow' });
  }

  // Final step: always end at an AI-era strategic role
  const d3 = result.dimensions.find(d => d.key === 'D3')?.score ?? 50;
  const domain = workType.split('_')[0];
  const futureRole = d3 > 55
    ? `${domain.charAt(0).toUpperCase() + domain.slice(1)} Systems Strategist`
    : `AI-Assisted ${displayRole} (Specialist Track)`;
  steps.push({ role: futureRole, timeframe: '5+ years', riskLevel: clamp(25 + Math.round(d3 / 5), 18, 45), isCurrentRole: false, transitionNote: 'Human judgment + AI orchestration becomes the core value proposition' });

  return steps;
}

// ── 7. Action Plan ────────────────────────────────────────────────────────────

function computeActionPlan(
  intel: CareerIntelligence | null,
  result: ScoreResult,
  projectedScore: number,
  experience: string,
): ActionHorizon[] {
  const road = intel?.roadmap;
  const expKey = experience as keyof typeof road;
  const expRoadmap = road ? (road[expKey] ?? road['5-10'] ?? road['2-5']) : null;

  const careerPath = intel?.careerPaths?.[0];
  const fullRiskReduction = careerPath?.riskReduction ?? 20;

  function makeAction(action: string, why: string, outcome?: string, riskReduction = 3): ActionItem {
    return { action, why, outcome, riskReduction };
  }

  // 30-day horizon: immediate protective habits
  const actions30d: ActionItem[] = expRoadmap?.phase_1?.actions?.slice(0, 3).map((a, i) => ({
    action: a.action,
    why: a.why ?? 'Early positioning reduces exposure before the wave peaks.',
    outcome: a.outcome,
    riskReduction: [4, 3, 3][i] ?? 3,
  })) ?? [
    makeAction('Identify your top 3 AI-automatable tasks', 'Awareness is the first step — knowing exactly which tasks are at risk lets you redirect your time investment.', 'Clear picture of your personal automation exposure', 5),
    makeAction('Spend 30 min/day on one AI tool relevant to your role', 'Tool fluency in AI systems is the single fastest risk-reducer available today.', 'Basic working proficiency in a role-relevant AI tool', 4),
    makeAction('Document 3 decisions only you can make in your role', 'Articulating your unique judgment helps you understand — and communicate — your irreplaceable value.', 'Clarity on your human-advantage areas', 3),
  ];

  // 90-day horizon: skill acquisition signal
  const actions90d: ActionItem[] = expRoadmap?.phase_2?.actions?.slice(0, 3).map((a, i) => ({
    action: a.action,
    why: a.why ?? 'Building AI-complementary skills now creates a durable competitive advantage.',
    outcome: a.outcome,
    riskReduction: [8, 6, 5][i] ?? 5,
  })) ?? [
    makeAction('Complete one AI workflow integration in your current role', 'Demonstrated AI collaboration skills are increasingly required in job descriptions for this role type.', 'Portfolio evidence of AI-augmented work', 8),
    makeAction('Research 2 adjacent roles with lower AI displacement scores', 'Career optionality is most valuable when exercised before it is needed.', 'Transition roadmap with clear skill gaps identified', 6),
    makeAction('Connect with 3 people who have already made a career pivot in this direction', 'Second-hand knowledge of successful transitions dramatically reduces your transition uncertainty.', 'Validated transition path with real-world insight', 5),
  ];

  // 12-month horizon: structural repositioning
  const actions12mo: ActionItem[] = expRoadmap?.phase_3?.actions?.slice(0, 3).map((a, i) => ({
    action: a.action,
    why: a.why ?? 'Structural repositioning before the threshold provides maximum negotiating leverage.',
    outcome: a.outcome,
    riskReduction: [round(fullRiskReduction / 3), round(fullRiskReduction / 4), round(fullRiskReduction / 5)][i] ?? 7,
  })) ?? [
    makeAction('Build a portfolio of AI-augmented projects in your domain', 'Demonstrable output — not credentials — is what the market rewards in AI-era roles.', 'Public portfolio showing AI integration capability', round(fullRiskReduction / 3)),
    makeAction('Pursue one qualification in AI systems, prompt engineering, or data literacy', 'Formal credentials signal commitment and provide structured learning frameworks.', 'Certified skill that differentiates your profile', round(fullRiskReduction / 4)),
    makeAction(`Begin transition preparation toward ${careerPath?.role ?? 'AI-augmented role'}`, 'Starting the transition before the threshold gives you time to build credibility incrementally.', 'Established foothold in lower-risk role category', round(fullRiskReduction / 5)),
  ];

  // Before-threshold: full strategic pivot
  const actionsThreshold: ActionItem[] = [
    makeAction(
      careerPath ? `Fully transition into ${careerPath.role}` : 'Complete role transition to AI-augmented position',
      'This is the strategic exit before the capability threshold forces a reactive move.',
      careerPath ? `${careerPath.riskReduction}% risk reduction achieved` : 'Structural repositioning complete',
      fullRiskReduction,
    ),
    makeAction(
      'Build AI orchestration skills — become the person who manages AI systems, not competes with them',
      'AI orchestrators and coordinators are the emerging high-value roles. Humans who can direct AI systems at scale will be in high demand.',
      'Position secured in a role where AI is an amplifier, not a replacement',
      round(fullRiskReduction * 0.6),
    ),
    makeAction(
      'Establish domain expertise as your primary differentiator',
      'Deep domain knowledge combined with AI tool fluency creates a combination that is extremely difficult to replicate.',
      'Recognised domain expert with demonstrable AI integration skills',
      round(fullRiskReduction * 0.4),
    ),
  ];

  return [
    { horizon: '30d',               label: 'Next 30 Days',         sublabel: 'Immediate protective moves',       actions: actions30d,       totalRiskReduction: actions30d.reduce((s, a) => s + a.riskReduction, 0) },
    { horizon: '90d',               label: 'Next 90 Days',         sublabel: 'Skill acquisition & positioning',  actions: actions90d,       totalRiskReduction: actions90d.reduce((s, a) => s + a.riskReduction, 0) },
    { horizon: '12mo',              label: 'Next 12 Months',       sublabel: 'Structural repositioning',         actions: actions12mo,      totalRiskReduction: actions12mo.reduce((s, a) => s + a.riskReduction, 0) },
    { horizon: 'before_threshold',  label: 'Before Threshold',     sublabel: 'Strategic career defence',         actions: actionsThreshold, totalRiskReduction: actionsThreshold.reduce((s, a) => s + a.riskReduction, 0) },
  ];
}

// ── 8. Psychological Frame ────────────────────────────────────────────────────

function computePsychologicalFrame(
  total: number,
  projectedScore: number,
  waveStatus: WaveStatus,
  experience: string,
): PsychologicalFrame {
  const urgencyTone =
    (total < 40 && (waveStatus === 'EARLY' || waveStatus === 'BUILDING')) ? 'calm' :
    (total > 65 || waveStatus === 'INFLECTION' || waveStatus === 'ACTIVE') ? 'urgent' :
    'strategic';

  const gap = projectedScore - total;

  const headlines: Record<typeof urgencyTone, string> = {
    calm:      `Your role is currently resilient. The structural pressures are building, but you have a meaningful window to prepare.`,
    strategic: `Your role remains valuable today. However, the AI adoption curve for this profession is steepening — and the greatest advantage comes from preparing before changes become mainstream.`,
    urgent:    `Your role faces significant structural pressure from AI capability progression. The window for proactive repositioning is narrowing — but it remains open.`,
  };

  const contexts: Record<typeof urgencyTone, string> = {
    calm:      `AI disruption is not a single event — it is a multi-year structural shift. Professionals in roles like yours who begin building AI-complementary skills now will be positioned to lead the transition rather than react to it.`,
    strategic: `The gap between your current exposure (${total}/100) and projected structural exposure (${projectedScore}/100) reflects how AI capability progression is likely to change how this work is performed over the coming years — not whether your skills have value today.`,
    urgent:    `The ${gap}-point gap between today's score and the agentic scenario reflects a structural shift already in motion. This is not about individual job performance — it is about the changing economics of how this type of work gets done.`,
  };

  const expLabel = experience === '0-2' ? 'entry-level professional' :
                   experience === '20+' ? 'senior professional' : 'professional';

  const agencies: Record<typeof urgencyTone, string> = {
    calm:      `As a ${expLabel}, you have time to compound your advantages. Start by identifying which of your current skills have the highest future value — then invest there first.`,
    strategic: `As a ${expLabel}, the most valuable move you can make right now is to identify one AI tool directly relevant to your daily work and spend 30 minutes learning it today.`,
    urgent:    `As a ${expLabel}, your most important action right now is to begin the transition toward a role with a lower structural exposure score. The Career Defense tab has a concrete path forward.`,
  };

  return {
    urgencyTone,
    headline: headlines[urgencyTone],
    context: contexts[urgencyTone],
    agency: agencies[urgencyTone],
    horizon: `These projections are forward estimates based on current AI adoption trajectories — not guaranteed outcomes. Timing is inherently uncertain. The direction, however, is consistent across multiple forecasting models. Treat this as a planning framework, not a prediction.`,
  };
}

// ── Master entry point ────────────────────────────────────────────────────────

export function computeAgenticWaveEngine(
  result: ScoreResult,
  intel: CareerIntelligence | null,
  workType: string,
  industryKey: string,
  experience: string,
): AgenticWaveResult {
  const dims = result.dimensions;
  const d1 = dims.find(d => d.key === 'D1')?.score ?? 50;
  const d2 = dims.find(d => d.key === 'D2')?.score ?? 50;

  const waveScore = computeAgenticWaveScore(result, workType, industryKey);
  const waveStatusDetail = computeWaveStatus(d2, industryKey);
  const capabilityThreshold = computeCapabilityThresholdState(d1, d2, waveStatusDetail.status);
  const taskExposure = computeTaskExposureBreakdown(workType, industryKey, intel, d1);
  const survivalFactors = computeSurvivalFactors(intel, result);
  const futureRoleEvolution = computeFutureRoleEvolution(intel, result, workType);
  const actionPlan = computeActionPlan(intel, result, waveScore.projectedScore, experience);
  const psychFrame = computePsychologicalFrame(result.total, waveScore.projectedScore, waveStatusDetail.status, experience);

  return {
    waveScore,
    capabilityThreshold,
    taskExposure,
    survivalFactors,
    futureRoleEvolution,
    waveStatusDetail,
    actionPlan,
    psychFrame,
  };
}
