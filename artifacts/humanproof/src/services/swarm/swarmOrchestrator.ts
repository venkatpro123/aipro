// swarmOrchestrator.ts
// Master parallel runner for all 30 swarm agents.
// Uses Promise.allSettled — no single agent failure breaks execution.
// Returns SwarmReport (aggregated) and caches it for 24h.

import { SwarmInput, SwarmReport } from './swarmTypes';
import { getSwarmCache, setSwarmCache } from './swarmCache';
import { aggregateSwarmResults } from './swarmAggregator';
import { savePrediction, recordAgentSignal, getAgentWeightMultiplier } from './swarmLearningStore';

// ── Market Signal Agents ──────────────────────────────────────────────────────
import { stockVolatilityAgent }   from './agents/marketSignals/stockVolatilityAgent';
import { revenueGrowthAgent }     from './agents/marketSignals/revenueGrowthAgent';
import { marketCapDropAgent }     from './agents/marketSignals/marketCapDropAgent';
import { piprAgent }              from './agents/marketSignals/piprAgent';
import { layoffVelocityAgent }    from './agents/marketSignals/layoffVelocityAgent';
import { fundingDryupAgent }      from './agents/marketSignals/fundingDryupAgent';
import { overstaffingRatioAgent } from './agents/marketSignals/overstaffingRatioAgent';
import { debtToEquityAgent }      from './agents/marketSignals/debtToEquityAgent';

// ── Company Signal Agents ─────────────────────────────────────────────────────
import { recentLayoffAgent }     from './agents/companySignals/recentLayoffAgent';
import { costCuttingAgent }      from './agents/companySignals/costCuttingAgent';
import { departmentRiskAgent }   from './agents/companySignals/departmentRiskAgent';
import { leadershipChurnAgent }  from './agents/companySignals/leadershipChurnAgent';
import { offshoreRiskAgent }     from './agents/companySignals/offshoreRiskAgent';
import { tenureRiskAgent }       from './agents/companySignals/tenureRiskAgent';
import { performanceAgent }      from './agents/companySignals/performanceAgent';
import { proRelationshipAgent }  from './agents/companySignals/proRelationshipAgent';

// ── AI Signal Agents ──────────────────────────────────────────────────────────
// AUDIT FIX: automationPotentialAgent, displacementTimelineAgent,
// roleObsolescenceAgent, aiReplacementPatternAgent all read input.roleTitle
// through different keyword tables (mean pairwise r ≈ 0.90, n_eff ≈ 1.08).
// Collapsed into single roleDisplacementAgent that uses the full
// CareerIntelligence database as a richer, more independent source.
import { roleDisplacementAgent }        from './agents/aiSignals/roleDisplacementAgent';
import { aiToolMaturityAgent }           from './agents/aiSignals/aiToolMaturityAgent';
import { augmentationOpportunityAgent }  from './agents/aiSignals/augmentationOpportunityAgent';
import { industryAiAdoptionAgent }       from './agents/aiSignals/industryAiAdoptionAgent';
import { skillDecayAgent }               from './agents/aiSignals/skillDecayAgent';

// ── External Signal Agents ────────────────────────────────────────────────────
import { macroRecessionAgent }    from './agents/externalSignals/macroRecessionAgent';
import { laborMarketTightAgent }  from './agents/externalSignals/laborMarketTightAgent';
import { sectorContagionAgent }   from './agents/externalSignals/sectorContagionAgent';
import { geoPoliticalRiskAgent }  from './agents/externalSignals/geoPoliticalRiskAgent';
import { regulatoryRiskAgent }    from './agents/externalSignals/regulatoryRiskAgent';
import { peerCompanyAgent }       from './agents/externalSignals/peerCompanyAgent';

// ── Agent Registry ────────────────────────────────────────────────────────────
const AGENT_REGISTRY = [
  // Market Signals
  stockVolatilityAgent, revenueGrowthAgent, marketCapDropAgent, piprAgent,
  layoffVelocityAgent, fundingDryupAgent, overstaffingRatioAgent, debtToEquityAgent,
  // Company Signals
  recentLayoffAgent, costCuttingAgent, departmentRiskAgent, leadershipChurnAgent,
  offshoreRiskAgent, tenureRiskAgent, performanceAgent, proRelationshipAgent,
  // AI Signals (4 → 1 after audit collapse; see roleDisplacementAgent.ts)
  roleDisplacementAgent, aiToolMaturityAgent, augmentationOpportunityAgent,
  industryAiAdoptionAgent, skillDecayAgent,
  // External Signals
  macroRecessionAgent, laborMarketTightAgent, sectorContagionAgent,
  geoPoliticalRiskAgent, regulatoryRiskAgent, peerCompanyAgent,
] as const;

// ── Master Runner ─────────────────────────────────────────────────────────────

export const runSwarmLayer = async (
  input: SwarmInput,
  forceRefresh = false
): Promise<SwarmReport> => {
  const { companyName, roleTitle, department } = input;

  // ── Cache check ──────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = getSwarmCache(companyName, roleTitle, department);
    if (cached) {
      console.log('[Swarm] Cache HIT — skipping 30 agents');
      return cached;
    }
  }

  console.log(`[Swarm] Firing ${AGENT_REGISTRY.length} agents in parallel...`);
  const startTime = Date.now();

  // ── Fire all 30 agents with per-agent timing — no single failure blocks ───
  const settled = await Promise.allSettled(
    AGENT_REGISTRY.map(async (agent) => {
      const agentStart = Date.now();
      const result = await agent.run(input);
      const agentMs = Date.now() - agentStart;
      return { ...result, _agentMs: agentMs, _agentId: (agent as any).agentId ?? agent.constructor?.name };
    })
  );

  const elapsed    = Date.now() - startTime;
  const fulfilled  = settled.filter(r => r.status === 'fulfilled').length;
  const rejected   = settled.filter(r => r.status === 'rejected').length;

  // Log per-agent timings so the slowest agent is identifiable
  const agentTimings = settled
    .filter(r => r.status === 'fulfilled')
    .map(r => ({ id: (r as any).value?._agentId ?? '?', ms: (r as any).value?._agentMs ?? 0 }))
    .sort((a, b) => b.ms - a.ms);
  const slowest = agentTimings[0];
  console.log(
    `[Swarm] ${fulfilled}/${AGENT_REGISTRY.length} agents resolved (${rejected} failed) in ${elapsed}ms` +
    (slowest ? ` | slowest: ${slowest.id} ${slowest.ms}ms` : ''),
  );
  // Surface timing data for the percentile report
  if (typeof sessionStorage !== 'undefined') {
    try {
      const key = 'hp_swarm_agent_timings';
      const prev = JSON.parse(sessionStorage.getItem(key) ?? '[]');
      prev.unshift({ ts: Date.now(), totalMs: elapsed, agents: agentTimings.slice(0, 5) });
      sessionStorage.setItem(key, JSON.stringify(prev.slice(0, 20)));
    } catch { /* quota exceeded */ }
  }

  // ── Extract successful signals ───────────────────────────────────────────
  const rawSignals = settled
    .map((r) => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean) as NonNullable<typeof settled[0] extends PromiseFulfilledResult<infer T> ? T : never>[];

  // ── BUG-07 FIX: apply learned weight multipliers before aggregation ────────
  // Agents that predicted accurately get boosted weight; poor performers get shrunk toward neutral
  const signals = rawSignals.map((s: any) => {
    const m = getAgentWeightMultiplier(s.agentId);
    const adjusted = m < 1.0
      ? s.signal * m + 0.5 * (1 - m)  // penalised agents shrink toward neutral 0.5
      : Math.min(0.99, s.signal * m);  // rewarded agents get a modest boost
    return { ...s, signal: adjusted };
  }) as any;

  // ── Aggregate into SwarmReport ───────────────────────────────────────────
  const report = aggregateSwarmResults(
    signals as any,
    fulfilled,
    AGENT_REGISTRY.length
  );

  // ── Cache and save to learning store ────────────────────────────────────
  setSwarmCache(companyName, roleTitle, department, report);
  savePrediction(companyName, roleTitle, report.swarmRiskScore, 0);
  // Persist each agent's signal so outcome-based weight updates work correctly
  signals.forEach((s: any) => recordAgentSignal(s, report.swarmRiskScore));

  return report;
};
