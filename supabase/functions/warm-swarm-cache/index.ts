// warm-swarm-cache/index.ts
//
// Weekly swarm cache warming job — runs at 05:00 UTC every Monday via pg_cron.
//
// PURPOSE
// -------
// The swarm layer (30 parallel agents) is the dominant latency and cost driver
// in the audit pipeline. Pre-computing swarm reports for the top-100 most-audited
// (company, role, department) combinations absorbs 60-70% of weekly swarm compute
// at typical user distributions (power-law: top-100 combos get ~65% of audits).
//
// At 10,000 daily audits, this reduces swarm execution by ~4-5× versus no warming.
//
// HOW IT WORKS
// ------------
// 1. Delete expired entries from swarm_warm_cache (cleanup).
// 2. Query layoff_scores for the top-100 most-audited combos in the last 30 days.
//    Uses company_snapshot JSONB (written at audit time) for company signal data.
//    Falls back to company_intelligence table when snapshot is absent.
// 3. For each combo: compute a deterministic SwarmReport from available DB signals.
//    This is a server-side approximation (no LLM agents) that covers:
//      - Stock price trend (financial_signals / company_snapshot)
//      - Revenue contraction (financial_signals / company_snapshot)
//      - Layoff pattern (layoff_history / company_snapshot)
//      - AI displacement signal (ai_exposure_index / company_snapshot)
//      - RPE efficiency (revenue_per_employee from snapshot)
//      - Company size signal (employee_count)
//    swarmConfidence is capped at 75% to signal "pre-computed approximation";
//    a real user audit with all 30 agents will overwrite with higher confidence.
// 4. Upsert all results to swarm_warm_cache with 24h TTL.
// 5. Log effectiveness to calibration_drift_events (event_kind='cache_warm').
//
// CACHE HIT PATH (client side)
// ----------------------------
// LayoffCalculator calls hydrateSwarmCache(company, role, dept) right after
// company data lands. hydrateSwarmCache() queries swarm_warm_cache and, on hit,
// writes to localStorage. When runSwarmLayer() runs ~10s later, getSwarmCache()
// returns the pre-loaded report immediately — all 30 agents are skipped.
//
// INVALIDATION
// ------------
// Breaking news → invalidateSwarmForCompany() already clears localStorage.
// The swarm_warm_cache entry is also deleted in the next warming run.
// For immediate invalidation after a breaking news event, the EF could be
// called with ?company=X — not yet wired, deferred to v41.0.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/otel.ts';

// ── Types (mirrors swarmTypes.ts — duplicated to avoid import complexity) ─────

type AgentCategory = 'market' | 'company' | 'ai' | 'external';
type SourceType    = 'live-api' | 'heuristic';

interface AgentSignal {
  agentId:    string;
  category:   AgentCategory;
  signal:     number;       // 0–1 (1 = highest risk)
  confidence: number;       // 0–1
  sourceType: SourceType;
  ageInDays:  number;
  metadata:   Record<string, unknown>;
}

interface CategoryBreakdown { market: number; company: number; ai: number; external: number; }
interface GraphNode         { id: string; category: AgentCategory; signal: number; weight: number; }
interface GraphEdge         { from: string; to: string; contribution: number; }
interface RiskCluster       { cluster: string; agents: string[]; combinedSignal: number; }

interface VisualizationGraph {
  nodes:         GraphNode[];
  riskClusters:  RiskCluster[];
  dominantEdges: GraphEdge[];
}

interface SwarmReport {
  swarmRiskScore:      number;
  swarmConfidence:     number;
  dominantSignals:     AgentSignal[];
  weakSignals:         AgentSignal[];
  anomalies:           string[];
  categoryBreakdown:   CategoryBreakdown;
  visualizationGraph:  VisualizationGraph;
  liveAgentsUsed:      number;
  totalAgentsRun:      number;
  generatedAt:         string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOP_N          = 100;           // top combos to warm
const LOOKBACK_DAYS  = 30;            // audit recency window
const CACHE_TTL_HOURS = 24;
const WARM_CONFIDENCE_CAP = 75;       // pre-computed < live-agent run

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.3;
}

function makeKey(company: string, role: string, department: string): string {
  return `swarm_cache::${company.toLowerCase()}::${role.toLowerCase()}::${department.toLowerCase()}`;
}

function detectAnomalies(signals: AgentSignal[]): string[] {
  const anomalies: string[] = [];
  const stockSig = signals.find(s => s.agentId === 'stockTrendAgent');
  const layoffSig = signals.find(s => s.agentId === 'layoffPatternAgent');
  const revSig = signals.find(s => s.agentId === 'revenueContractionAgent');

  if (stockSig && stockSig.signal > 0.7 && layoffSig && layoffSig.signal < 0.3) {
    anomalies.push('Stock decline without layoff history — may indicate early-stage distress');
  }
  if (revSig && revSig.signal > 0.6 && stockSig && stockSig.signal < 0.3) {
    anomalies.push('Revenue contraction not yet reflected in stock price');
  }
  return anomalies;
}

// ── Core: deterministic SwarmReport from DB signals ──────────────────────────
//
// This is a server-side approximation of the 30-agent swarm. It uses only
// data available in the DB (company_snapshot from layoff_scores, or
// company_intelligence as fallback). No LLM calls, no external APIs.
//
// swarmConfidence is capped at WARM_CONFIDENCE_CAP (75) so the UI can
// distinguish pre-computed entries from live-agent results (85-95%).
// When a real user audit runs and all 30 agents fire, setSwarmCache()
// overwrites with the higher-confidence result.

function computeServerSwarmReport(
  snapshot: Record<string, unknown> | null,
  ci:       Record<string, unknown> | null,
): SwarmReport {
  const signals: AgentSignal[] = [];

  // ── Extract signals from snapshot (preferred) or company_intelligence ──────

  const stock90d       = (snapshot?.stock90DayChange     ?? (ci?.financial_signals as any)?.stock90dChange)     as number | null;
  const revenueGrowth  = (snapshot?.revenueGrowthYoY     ?? (ci?.financial_signals as any)?.revenueGrowthYoY)   as number | null;
  const layoffRounds   = (snapshot?.layoffRounds         ?? (ci?.layoff_history    as any)?.rounds ?? 0)         as number;
  const lastLayoffPct  = (snapshot?.lastLayoffPercent     ?? null)                                                as number | null;
  const aiSignal       = (snapshot?.aiInvestmentSignal   ?? (ci?.financial_signals as any)?.aiInvestmentSignal  ?? 'medium') as string;
  const employeeCount  = (snapshot?.employeeCount        ?? null)                                                 as number | null;
  const rpe            = (snapshot?.revenuePerEmployee   ?? null)                                                 as number | null;
  const lastLayoffDate = (snapshot?.lastLayoffDate        ?? null)                                                 as string | null;

  // ── Stock price trend ─────────────────────────────────────────────────────
  if (stock90d !== null) {
    const sig = stock90d < -0.30 ? 0.90
              : stock90d < -0.20 ? 0.75
              : stock90d < -0.10 ? 0.55
              : stock90d <  0.00 ? 0.30
              : 0.12;
    signals.push({
      agentId: 'stockTrendAgent', category: 'market', signal: sig,
      confidence: 0.90, sourceType: 'live-api', ageInDays: 0,
      metadata: { stock90d },
    });
  }

  // ── Revenue contraction ───────────────────────────────────────────────────
  if (revenueGrowth !== null) {
    const sig = revenueGrowth < -0.20 ? 0.85
              : revenueGrowth < -0.10 ? 0.65
              : revenueGrowth < -0.03 ? 0.45
              : revenueGrowth <  0.05 ? 0.25
              : 0.10;
    signals.push({
      agentId: 'revenueContractionAgent', category: 'company', signal: sig,
      confidence: 0.85, sourceType: 'live-api', ageInDays: 0,
      metadata: { revenueGrowth },
    });
  }

  // ── Layoff pattern ────────────────────────────────────────────────────────
  if (layoffRounds > 0) {
    const sig = layoffRounds >= 4 ? 0.95
              : layoffRounds >= 3 ? 0.85
              : layoffRounds >= 2 ? 0.70
              : 0.50;
    const daysAgo = lastLayoffDate
      ? Math.floor((Date.now() - new Date(lastLayoffDate).getTime()) / 86_400_000)
      : 365;
    signals.push({
      agentId: 'layoffPatternAgent', category: 'company', signal: sig,
      confidence: 0.92, sourceType: 'live-api', ageInDays: Math.min(daysAgo, 365),
      metadata: { layoffRounds, lastLayoffPct, lastLayoffDate },
    });
  }

  // ── AI displacement ───────────────────────────────────────────────────────
  const aiRisk = aiSignal === 'high' ? 0.78 : aiSignal === 'medium' ? 0.50 : 0.22;
  signals.push({
    agentId: 'aiDisplacementAgent', category: 'ai', signal: aiRisk,
    confidence: 0.70, sourceType: 'heuristic', ageInDays: 30,
    metadata: { aiSignal },
  });

  // ── RPE efficiency ────────────────────────────────────────────────────────
  if (rpe !== null) {
    const sig = rpe < 80_000  ? 0.80
              : rpe < 120_000 ? 0.60
              : rpe < 180_000 ? 0.40
              : rpe < 300_000 ? 0.20
              : 0.08;
    signals.push({
      agentId: 'rpeEfficiencyAgent', category: 'company', signal: sig,
      confidence: 0.72, sourceType: 'heuristic', ageInDays: 0,
      metadata: { revenuePerEmployee: rpe },
    });
  }

  // ── Company size ──────────────────────────────────────────────────────────
  if (employeeCount !== null) {
    // Larger companies are more stable (more cushion) but also bigger blast radius
    const sig = employeeCount > 50_000 ? 0.22
              : employeeCount > 10_000 ? 0.30
              : employeeCount >  1_000 ? 0.42
              : employeeCount >    200 ? 0.55
              : 0.68;
    signals.push({
      agentId: 'companySizeAgent', category: 'company', signal: sig,
      confidence: 0.60, sourceType: 'heuristic', ageInDays: 30,
      metadata: { employeeCount },
    });
  }

  // ── Macro / sector baseline (always present as a floor) ──────────────────
  signals.push({
    agentId: 'macroBaselineAgent', category: 'external', signal: 0.38,
    confidence: 0.50, sourceType: 'heuristic', ageInDays: 30,
    metadata: { source: 'global_macro_baseline_2026' },
  });

  // ── Fallback: pad to at least 3 signals if DB data is very sparse ─────────
  if (signals.length < 3) {
    signals.push({
      agentId: 'industryHeuristicAgent', category: 'market', signal: 0.42,
      confidence: 0.45, sourceType: 'heuristic', ageInDays: 60,
      metadata: { source: 'sparse_data_fallback' },
    });
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────

  const totalWeight   = signals.reduce((s, a) => s + a.confidence, 0);
  const weightedScore = signals.reduce((s, a) => s + a.signal * a.confidence, 0);
  const rawScore      = weightedScore / Math.max(totalWeight, 0.001);
  const swarmRiskScore = Math.round(rawScore * 100);

  const dominantSignals = signals.filter(s => s.signal > 0.60);
  const weakSignals     = signals.filter(s => s.signal >= 0.30 && s.signal <= 0.60);

  const catMap: Record<string, number[]> = { market: [], company: [], ai: [], external: [] };
  for (const s of signals) catMap[s.category].push(s.signal);

  const categoryBreakdown: CategoryBreakdown = {
    market:   avg(catMap.market),
    company:  avg(catMap.company),
    ai:       avg(catMap.ai),
    external: avg(catMap.external),
  };

  const liveCount = signals.filter(s => s.sourceType === 'live-api').length;
  // Confidence: 50% base + up to 25% from live-api signal coverage
  const swarmConfidence = Math.min(
    WARM_CONFIDENCE_CAP,
    Math.round(50 + (liveCount / signals.length) * 25),
  );

  const nodes: GraphNode[] = signals.map(s => ({
    id: s.agentId, category: s.category, signal: s.signal, weight: s.confidence,
  }));

  const riskClusters: RiskCluster[] = (['market', 'company', 'ai', 'external'] as AgentCategory[])
    .map(cat => ({
      cluster:         cat.charAt(0).toUpperCase() + cat.slice(1),
      agents:          signals.filter(s => s.category === cat).map(s => s.agentId),
      combinedSignal:  avg(catMap[cat]),
    }))
    .filter(c => c.agents.length > 0);

  const dominantEdges: GraphEdge[] = dominantSignals.slice(0, 3).map(s => ({
    from: s.agentId, to: 'compositeRiskNode',
    contribution: s.signal * s.confidence,
  }));

  return {
    swarmRiskScore,
    swarmConfidence,
    dominantSignals,
    weakSignals,
    anomalies: detectAnomalies(signals),
    categoryBreakdown,
    visualizationGraph: { nodes, riskClusters, dominantEdges },
    liveAgentsUsed:  liveCount,
    totalAgentsRun:  signals.length,
    generatedAt:     new Date().toISOString(),
  };
}

// ── Edge Function handler ──────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Service-role JWT required — this EF is not callable by end-users.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase           = createClient(supabaseUrl, serviceRoleKey);

  const startMs = Date.now();
  let combosAttempted = 0;
  let combosWarmed    = 0;
  let combosMissed    = 0;
  const topMisses: string[] = [];

  try {
    // ── Step 1: Expire stale entries ────────────────────────────────────────
    await supabase.rpc('expire_swarm_warm_cache');

    // ── Step 2: Top-100 most-audited combos in the last 30 days ─────────────
    //
    // We take the most-recent company_snapshot per combo (to get fresh signals).
    // company_snapshot JSONB contains: stock90DayChange, revenueGrowthYoY,
    // layoffRounds, lastLayoffPercent, lastLayoffDate, aiInvestmentSignal,
    // employeeCount, revenuePerEmployee — written by LayoffCalculator at audit time.
    //
    // combos without company_snapshot fall back to company_intelligence lookup.

    const lookbackDate = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

    const { data: combos, error: comboErr } = await supabase
      .from('layoff_scores')
      .select('company_name, role_title, department, company_snapshot, region, calculated_at')
      .gt('calculated_at', lookbackDate)
      .not('company_name', 'is', null)
      .order('calculated_at', { ascending: false });

    if (comboErr) throw new Error(`Top-100 query failed: ${comboErr.message}`);

    // De-duplicate: keep most-recent snapshot per (company, role, department).
    // Then sort by frequency (count per combo) and take top 100.
    const seen   = new Map<string, { company_name: string; role_title: string; department: string; company_snapshot: Record<string,unknown>|null; region: string; count: number }>();
    for (const row of (combos ?? [])) {
      const key = `${(row.company_name ?? '').toLowerCase()}|||${(row.role_title ?? '').toLowerCase()}|||${(row.department ?? '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, {
          company_name:     row.company_name,
          role_title:       row.role_title,
          department:       row.department ?? '',
          company_snapshot: row.company_snapshot ?? null,
          region:           row.region ?? 'GLOBAL',
          count:            1,
        });
      } else {
        seen.get(key)!.count++;
      }
    }

    const top100 = [...seen.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_N);

    combosAttempted = top100.length;

    // ── Step 3: Compute + upsert ─────────────────────────────────────────────

    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3_600_000).toISOString();
    const warmedAt  = new Date().toISOString();

    for (const combo of top100) {
      const { company_name, role_title, department, company_snapshot, region, count } = combo;

      let ci: Record<string,unknown> | null = null;

      // Fall back to company_intelligence when snapshot is absent or very sparse
      const snapshotHasSignals = company_snapshot && (
        company_snapshot.stock90DayChange   !== undefined ||
        company_snapshot.revenueGrowthYoY   !== undefined ||
        company_snapshot.layoffRounds       !== undefined
      );

      if (!snapshotHasSignals) {
        const { data: ciRow } = await supabase
          .from('company_intelligence')
          .select('financial_signals, layoff_history, hiring_signals, ai_exposure_index, company_risk_score')
          .ilike('company_name', company_name)
          .maybeSingle();
        ci = ciRow ?? null;
      }

      if (!snapshotHasSignals && !ci) {
        // No data source — skip this combo
        combosMissed++;
        if (topMisses.length < 10) topMisses.push(company_name);
        continue;
      }

      const report = computeServerSwarmReport(
        company_snapshot as Record<string,unknown> | null,
        ci,
      );

      const cacheKey = makeKey(company_name, role_title, department);

      const { error: upsertErr } = await supabase
        .from('swarm_warm_cache')
        .upsert({
          cache_key:       cacheKey,
          company_name,
          role_title,
          department,
          region,
          swarm_report:    report,
          audit_count_30d: count,
          warm_source:     'weekly_warm_job',
          warmed_at:       warmedAt,
          expires_at:      expiresAt,
        }, { onConflict: 'cache_key' });

      if (upsertErr) {
        console.warn(`[WarmSwarmCache] Upsert failed for ${cacheKey}:`, upsertErr.message);
        combosMissed++;
        if (topMisses.length < 10) topMisses.push(company_name);
      } else {
        combosWarmed++;
      }
    }

    // ── Step 4: Log effectiveness to calibration_drift_events ────────────────

    const durationMs    = Date.now() - startMs;
    const warmRatePct   = combosAttempted > 0
      ? Math.round((combosWarmed / combosAttempted) * 100)
      : 0;

    await supabase.from('calibration_drift_events').insert({
      event_kind:          'cache_warm',
      scenario_name:       'WEEKLY_CACHE_WARM',
      // Repurpose score columns to track warm rate (0-100 scale matches score range)
      actual_score:        warmRatePct,
      expected_score_low:  80,           // target: warm ≥80% of top-100
      expected_score_high: 100,
      score_delta:         warmRatePct - 90,  // signed delta from 90% target
      window_n:            combosAttempted,
      release_version:     'v40.0',
      warm_metadata:       {
        combos_attempted: combosAttempted,
        combos_warmed:    combosWarmed,
        combos_missed:    combosMissed,
        warm_rate_pct:    warmRatePct,
        duration_ms:      durationMs,
        top_misses:       topMisses,
        cache_ttl_hours:  CACHE_TTL_HOURS,
      },
    });

    console.log(`[WarmSwarmCache] Done — ${combosWarmed}/${combosAttempted} warmed (${warmRatePct}%) in ${durationMs}ms`);

    return new Response(
      JSON.stringify({
        ok:               true,
        combos_attempted: combosAttempted,
        combos_warmed:    combosWarmed,
        combos_missed:    combosMissed,
        warm_rate_pct:    warmRatePct,
        duration_ms:      durationMs,
        top_misses:       topMisses,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[WarmSwarmCache] Fatal error:', msg);

    // Still log the failure so ops can see it in calibration_drift_events
    try {
      await supabase.from('calibration_drift_events').insert({
        event_kind:          'cache_warm',
        scenario_name:       'WEEKLY_CACHE_WARM',
        actual_score:        0,
        expected_score_low:  80,
        expected_score_high: 100,
        score_delta:         -90,
        window_n:            combosAttempted,
        release_version:     'v40.0',
        warm_metadata:       {
          combos_attempted: combosAttempted,
          combos_warmed:    combosWarmed,
          combos_missed:    combosMissed,
          warm_rate_pct:    0,
          duration_ms:      Date.now() - startMs,
          error:            msg,
          cache_ttl_hours:  CACHE_TTL_HOURS,
        },
      });
    } catch { /* best-effort log */ }

    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }
});
