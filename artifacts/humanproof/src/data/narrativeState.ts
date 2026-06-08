// narrativeState.ts — Single master narrative. All sections derive text from this.
// Prevents contradictions between Executive Summary, timeline, action plan, and peer comparison.

import type { ScoreResult } from './riskFormula';
import type { MasterIntelligence } from './masterIntelligenceEngine';

export interface NarrativeState {
  headline: string;
  riskLabel: 'high risk' | 'moderate risk' | 'resilient' | 'well-protected';
  riskTier: 'critical' | 'high' | 'moderate' | 'low';
  primaryThreat: string;
  primaryStrength: string;
  timeHorizon: string;          // "2–3 years" | "4–6 years" | "7+ years"
  urgencyLevel: 'critical' | 'high' | 'moderate' | 'low';
  actionVerb: string;           // "Pivot now" | "Upskill urgently" | "Evolve your role" | "Stay ahead"
  actionCTA: string;            // one-sentence call to action
  peerContext: string;          // "Among your peers, you rank..." sentence
  trajectoryHeader: string;     // for consequences timeline header
}

const DIMENSION_LABELS: Record<string, string> = {
  D1: 'task automatability',
  D2: 'AI tool maturity',
  D3: 'human amplification',
  D4: 'experience shield',
  D5: 'country exposure',
  D6: 'social capital moat',
};

function findTopThreat(result: ScoreResult): { key: string; label: string; score: number; reason: string } {
  // Threat dimensions: high score = high risk
  const threats = result.dimensions.filter(d => ['D1', 'D2', 'D5'].includes(d.key));
  const top = threats.reduce((a, b) => (b.score > a.score ? b : a), threats[0] ?? result.dimensions[0]);
  return {
    key: top?.key ?? 'D1',
    label: DIMENSION_LABELS[top?.key ?? 'D1'] ?? 'task automatability',
    score: top?.score ?? 50,
    reason: top?.reason ?? '',
  };
}

function findTopStrength(result: ScoreResult): { key: string; label: string; score: number; reason: string } {
  // Shield dimensions: lower score = stronger protection
  const shields = result.dimensions.filter(d => ['D3', 'D4', 'D6'].includes(d.key));
  const top = shields.reduce((a, b) => (a.score < b.score ? a : b), shields[0] ?? result.dimensions[0]);
  return {
    key: top?.key ?? 'D4',
    label: DIMENSION_LABELS[top?.key ?? 'D4'] ?? 'experience shield',
    score: top?.score ?? 50,
    reason: top?.reason ?? '',
  };
}

function buildPrimaryThreat(threat: ReturnType<typeof findTopThreat>): string {
  if (threat.key === 'D1') {
    if (threat.score >= 75) return 'The majority of your daily tasks are within current AI capability — your role\'s core execution layer is directly automatable';
    if (threat.score >= 55) return 'A significant portion of your tasks overlap with what AI tools can now handle — execution-layer risk is real and growing';
    return 'Some routine tasks in your role are automatable, though your strategic work remains protected';
  }
  if (threat.key === 'D2') {
    if (threat.score >= 75) return 'AI tools in your sector have reached high maturity — purpose-built automation is already replacing your role\'s task categories in peer companies';
    if (threat.score >= 55) return 'AI tools are actively maturing in your sector — companies are beginning to substitute AI for your role\'s lower-complexity work';
    return 'AI tools in your industry are developing rapidly, creating medium-term pressure on your task categories';
  }
  if (threat.key === 'D5') {
    if (threat.score >= 70) return 'Your market faces elevated AI adoption speed and offshoring pressure — both compound your displacement risk beyond global averages';
    return 'Your local market conditions add meaningful context to your AI exposure — demand and adoption dynamics differ from global benchmarks';
  }
  return threat.reason || 'Automation pressure across your role\'s core task categories is the primary risk factor';
}

function buildPrimaryStrength(strength: ReturnType<typeof findTopStrength>, result: ScoreResult): string {
  if (strength.key === 'D3') {
    if (strength.score <= 20) return 'Your role requires high cognitive complexity, judgment, and contextual reasoning — the exact capabilities AI cannot reliably replicate';
    if (strength.score <= 40) return 'Complex decision-making and human judgment are central to your work, providing meaningful insulation from automation';
    return 'Your work involves human amplification factors that slow displacement compared to more routine roles';
  }
  if (strength.key === 'D4') {
    if (strength.score <= 25) return 'Your experience creates a strong institutional and knowledge moat — pattern recognition and contextual judgment built over years that AI cannot compress into model weights';
    if (strength.score <= 45) return 'Your years of experience provide a meaningful buffer — senior professionals are displaced later and adapt faster than early-career peers';
    return 'Your experience provides some protection in the transition period, giving you time to reposition';
  }
  if (strength.key === 'D6') {
    if (strength.score <= 25) return 'Your professional network and relationship capital are durable career assets — social moats compound over time and are invisible to AI systems';
    return 'Your professional relationships and reputation represent a genuine career moat that pure AI cannot replicate';
  }
  return strength.reason || 'Your human-only capabilities represent a genuine competitive advantage against automation';
}

export function buildNarrativeState(intel: MasterIntelligence, result: ScoreResult): NarrativeState {
  const score      = intel.totalRisk;
  const survival   = intel.survivalPct;
  const [sLo, sHi] = intel.survivalRange;

  const threat   = findTopThreat(result);
  const strength = findTopStrength(result);

  // ── Risk classification ─────────────────────────────────────────────────
  const riskLabel: NarrativeState['riskLabel'] =
    score >= 70 ? 'high risk' :
    score >= 50 ? 'moderate risk' :
    score >= 30 ? 'resilient' :
    'well-protected';

  const riskTier: NarrativeState['riskTier'] =
    score >= 75 ? 'critical' :
    score >= 55 ? 'high' :
    score >= 35 ? 'moderate' :
    'low';

  const urgencyLevel: NarrativeState['urgencyLevel'] = riskTier;

  // ── Action verb ─────────────────────────────────────────────────────────
  const actionVerb =
    riskTier === 'critical' ? 'Pivot now' :
    riskTier === 'high'     ? 'Upskill urgently' :
    riskTier === 'moderate' ? 'Evolve your role' :
    'Stay ahead';

  // ── Time horizon ────────────────────────────────────────────────────────
  const timeHorizon =
    riskTier === 'critical' ? '1–2 years' :
    riskTier === 'high'     ? '2–4 years' :
    riskTier === 'moderate' ? '4–7 years' :
    '7+ years';

  // ── Headline ────────────────────────────────────────────────────────────
  const headline =
    riskTier === 'critical'
      ? `Your role is in the high-displacement zone — ${sLo}–${sHi}% survival probability over the next ${timeHorizon} without action`
      : riskTier === 'high'
      ? `You face real AI pressure — ${sLo}–${sHi}% career survival window, with meaningful improvement available if you act in ${timeHorizon}`
      : riskTier === 'moderate'
      ? `Your role has moderate AI exposure — ${sLo}–${sHi}% survival probability with a ${timeHorizon} window to optimize your position`
      : `Your role is well-insulated against AI displacement — ${sLo}–${sHi}% survival probability over ${timeHorizon}`;

  // ── Action CTA ──────────────────────────────────────────────────────────
  const actionCTA =
    riskTier === 'critical'
      ? `Start your transition plan this week — your window for proactive positioning is closing faster than most roles`
      : riskTier === 'high'
      ? `The next 90 days of deliberate upskilling will have more impact on your career trajectory than the next 3 years of status quo work`
      : riskTier === 'moderate'
      ? `Position yourself as the AI-augmented version of your role now — before it becomes the baseline expectation`
      : `Invest in deepening your human-only edge to widen the gap AI cannot close`;

  // ── Peer context ────────────────────────────────────────────────────────
  const peerContext =
    riskTier === 'critical'
      ? `Among your peers, you are in the most exposed segment — AI adoption is moving fastest for your role category`
      : riskTier === 'high'
      ? `Among your peers, you are in a high-risk segment — your survival probability is below the average for your role group`
      : riskTier === 'moderate'
      ? `Among your peers, you hold a roughly average position — but active upskilling separates the top tier from the rest`
      : `Among your peers, you rank in the protected segment — your role and experience profile gives you an above-average resilience floor`;

  // ── Trajectory header ────────────────────────────────────────────────────
  const trajectoryHeader = `IF YOU ${actionVerb.toUpperCase()} — YOUR ${timeHorizon} TRAJECTORY`;

  return {
    headline,
    riskLabel,
    riskTier,
    primaryThreat: buildPrimaryThreat(threat),
    primaryStrength: buildPrimaryStrength(strength, result),
    timeHorizon,
    urgencyLevel,
    actionVerb,
    actionCTA,
    peerContext,
    trajectoryHeader,
  };
}
