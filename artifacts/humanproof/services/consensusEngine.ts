// consensusEngine.ts
// Central resolver that merges DB + Live + Swarm signals with conflict detection.
// Outputs a ConsensedSignalSet that the Scoring Engine consumes.

import {
  signalIntegrityService,
  ProvenancedSignal,
  ResolvedSignal,
  SignalConflict,
} from "./signalIntegrity/signalIntegrityService";
import { SwarmReport, SwarmAgentOutput } from "../services/swarm/swarmTypes";

export interface ConsensusSignalSet {
  // Company Health signals (L1 inputs)
  revenueGrowth: ResolvedSignal; // normalized 0–1 (0 = high growth, 1 = declining)
  stockTrend: ResolvedSignal; // 0–1 (0 = uptrend, 1 = downtrend)
  fundingHealth: ResolvedSignal; // 0–1 (0 = well-funded, 1 = cash-strapped)
  overstaffing: ResolvedSignal; // 0–1 (0 = lean, 1 = overstaffed)
  companySize: ResolvedSignal; // 0–1 (0 = small/agile, 1 = large/bureaucratic)

  // Layoff History signals (L2 inputs)
  recentLayoffRecency: ResolvedSignal; // 0–1 (0 = recent, 1 = distant)
  layoffFrequency: ResolvedSignal; // 0–1 (0 = none, 1 = frequent)
  layoffSeverity: ResolvedSignal; // 0–1 (0 = light, 1 = deep cuts)
  sectorContagion: ResolvedSignal; // 0–1 (0 = isolated, 1 = industry wave)
  departmentNews: ResolvedSignal; // 0–1 (0 = no dept news, 1 = direct mention)

  // Role Exposure signals (L3 inputs)
  automationRisk: ResolvedSignal; // 0–1 (task automatability)
  aiToolMaturity: ResolvedSignal; // 0–1 (how mature AI tools are for this role)
  humanAmplification: ResolvedSignal; // 0–1 (0 = high amplification/low risk, 1 = low amplification/high risk)

  // Market Conditions (L4 inputs)
  industryBaseline: ResolvedSignal; // 0–1 (industry baseline risk)
  aiAdoptionRate: ResolvedSignal; // 0–1 (how fast AI is adopting in this industry)
  growthOutlook: ResolvedSignal; // 0–1 (0 = growing, 1 = declining/volatile)

  // Employee Factors (L5 inputs) — these come from user, not signals
  // But we can add company tenure profile as signal
  averageTenure: ResolvedSignal; // 0–1 (0 = long avg tenure = stable, 1 = high turnover)

  // Global flags
  overallConfidence: number; // 0–1 aggregate confidence
  conflictLevel: "none" | "low" | "medium" | "high" | "critical";
  allConflicts: SignalConflict[];
  freshnessReport: {
    oldestSignalAge: number;
    avgSignalAge: number;
    percentLive: number; // % of signals from live API
    percentHeuristic: number;
    // Absolute counts so downstream code doesn't have to back-calculate
    // signal totals from percentages. Previously the hybrid engine multiplied
    // `percentLive * 17` (a magic number that approximated the dimension
    // count) — but the actual resolved-signal list is the only authoritative
    // source, and the magic number was off-by-N when signals were added or
    // removed.
    totalSignalCount: number;
    liveSignalCount: number;
    heuristicSignalCount: number;
  };
}

export class ConsensusEngine {
  /**
   * Main entry point: given company context + optional swarm report,
   * resolve all signals into a coherent, conflict-aware consensus set.
   */
  async resolve({
    companyId,
    dbData,
    liveSignals,
    swarmReport,
    roleTitle,
    department,
  }: {
    companyId: string;
    dbData: any; // CompanyData from resolveCompanyData
    liveSignals: any[]; // raw live_signals_v2 rows
    swarmReport?: SwarmReport;
    roleTitle: string;
    department: string;
  }): Promise<ConsensusSignalSet> {
    // ── STEP 1: Categorize live signals by type ─────────────────────────
    const byType = new Map<string, ProvenancedSignal[]>();
    for (const ls of liveSignals) {
      const normalized = this.normalizeLiveSignal(ls);
      if (!byType.has(normalized.type)) byType.set(normalized.type, []);
      byType.get(normalized.type)!.push(normalized);
    }

    // ── STEP 2: Extract swarm verdicts per signal category ─────────────────
    const swarmVerdictsBySignal = new Map<string, SwarmAgentOutput[]>();
    if (swarmReport) {
      for (const agentOutput of swarmReport.agentOutputs) {
        const sigType = this.mapAgentToSignalType(agentOutput.agentId);
        if (!byType.has(sigType)) continue; // only process signals we care about
        if (!swarmVerdictsBySignal.has(sigType))
          swarmVerdictsBySignal.set(sigType, []);
        swarmVerdictsBySignal.get(sigType)!.push(agentOutput);
      }
    }

    // ── STEP 3: Resolve each signal via signalIntegrityService ─────────────
    const resolve = async (
      signalType: string,
      dbSig: ProvenancedSignal | null,
    ): Promise<ResolvedSignal> => {
      const liveSigArray = byType.get(signalType) || [];
      const swarmVerdicts = swarmVerdictsBySignal.get(signalType) || [];
      return await signalIntegrityService.resolveSignal(
        signalType,
        dbSig,
        liveSigArray,
        swarmVerdicts,
      );
    };

    // Map companyData fields → ProvenancedSignal (DB source)
    const dbSignals = this.dbDataToProvenancedSignals(dbData);

    // Resolve in parallel
    const [
      revenueGrowth,
      stockTrend,
      fundingHealth,
      overstaffing,
      companySize,
      recentLayoffRecency,
      layoffFrequency,
      layoffSeverity,
      sectorContagion,
      departmentNews,
      automationRisk,
      aiToolMaturity,
      humanAmplification,
      industryBaseline,
      aiAdoptionRate,
      growthOutlook,
      averageTenure,
    ] = await Promise.all([
      resolve("revenueGrowth", dbSignals.revenueGrowth),
      resolve("stock90DayChange", dbSignals.stock90DayChange),
      resolve("fundingHealth", dbSignals.fundingHealth),
      resolve("overstaffing", dbSignals.overstaffing),
      resolve("companySize", dbSignals.companySize),
      resolve("recentLayoffRecency", dbSignals.recentLayoffRecency),
      resolve("layoffFrequency", dbSignals.layoffFrequency),
      resolve("layoffSeverity", dbSignals.layoffSeverity),
      resolve("sectorContagion", dbSignals.sectorContagion),
      resolve("departmentNews", dbSignals.departmentNews),
      resolve("automationRisk", dbSignals.automationRisk),
      resolve("aiToolMaturity", dbSignals.aiToolMaturity),
      resolve("humanAmplification", dbSignals.humanAmplification),
      resolve("industryBaseline", dbSignals.industryBaseline),
      resolve("aiAdoptionRate", dbSignals.aiAdoptionRate),
      resolve("growthOutlook", dbSignals.growthOutlook),
      resolve("averageTenure", dbSignals.averageTenure),
    ]);

    // ── STEP 4: Aggregate conflict metadata ──────────────────────────────
    const allConflicts: SignalConflict[] = [
      ...revenueGrowth.conflicts,
      ...stockTrend.conflicts,
      ...recentLayoffRecency.conflicts,
      ...departmentNews.conflicts,
    ];

    const conflictLevel = this.computeConflictLevel(allConflicts);

    // ── STEP 5: Compute freshness stats ─────────────────────────────────
    const allResolved = [
      revenueGrowth,
      stockTrend,
      fundingHealth,
      overstaffing,
      companySize,
      recentLayoffRecency,
      layoffFrequency,
      layoffSeverity,
      sectorContagion,
      departmentNews,
      automationRisk,
      aiToolMaturity,
      humanAmplification,
      industryBaseline,
      aiAdoptionRate,
      growthOutlook,
      averageTenure,
    ];

    const ages = allResolved.map((r) => r.stalenessDays);
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;
    const oldest = Math.max(...ages);
    const totalSignalCount = allResolved.length;
    const liveSignalCount = allResolved.filter(
      (r) => r.primarySource === "live",
    ).length;
    const heuristicSignalCount = allResolved.filter(
      (r) => r.primarySource === "hybrid" || r.primarySource === "db",
    ).length;
    const percentLive =
      totalSignalCount > 0 ? liveSignalCount / totalSignalCount : 0;
    const percentHeuristic =
      totalSignalCount > 0 ? heuristicSignalCount / totalSignalCount : 0;

    // Aggregate confidence: arithmetic mean of individual confidences, penalized
    // by conflicts. (Comment used to claim "harmonic mean" but the formula was
    // a geometric mean — Nth root of the product. The geometric mean has a
    // pathological zero-absorbing property: a single signal returning
    // confidence=0 collapses the aggregate to 0 regardless of how confident the
    // other 16 signals were. That made one missing source mask all others, and
    // produced "Confidence: 10%" labels for companies where the engine had
    // perfectly good data on everything except, say, MCA filings. Arithmetic
    // mean degrades smoothly: one zero among N signals costs ~1/N, which is the
    // correct penalty when sources are roughly equally weighted.)
    //
    // Two additional factors layer on the base mean:
    //   • Per-signal staleness: a fresh signal contributes its full confidence,
    //     a 45-day-old signal contributes 30% of it (linear in between, clamped
    //     at 0.3). Previously stalenessDays was computed but never affected the
    //     score — a 45-day-old layoffs history signal carried the same weight
    //     as today's stock close.
    //   • Heuristic-share penalty: when every signal fell back to DB defaults
    //     (revenueGrowth ?? 0.5 etc), the aggregate is artificially propped up
    //     by neutral midpoints. Subtract a flat penalty proportional to how
    //     much of the consensus was heuristic (max -10% at 100% heuristic).
    const sumConf = allResolved.reduce(
      (sum, r) => sum + r.confidence * Math.max(0.3, 1 - r.stalenessDays / 45),
      0,
    );
    const baseConf = allResolved.length > 0 ? sumConf / allResolved.length : 0.5;
    const conflictPenalty  = allConflicts.length * 0.08; // -8% per conflict
    const heuristicPenalty = percentHeuristic * 0.10;     // up to -10% at 100% heuristic
    const overallConfidence = Math.max(
      0.1,
      Math.min(0.95, baseConf - conflictPenalty - heuristicPenalty),
    );

    return {
      revenueGrowth,
      stockTrend,
      fundingHealth,
      overstaffing,
      companySize,
      recentLayoffRecency,
      layoffFrequency,
      layoffSeverity,
      sectorContagion,
      departmentNews,
      automationRisk,
      aiToolMaturity,
      humanAmplification,
      industryBaseline,
      aiAdoptionRate,
      growthOutlook,
      averageTenure,
      overallConfidence,
      conflictLevel,
      allConflicts,
      freshnessReport: {
        oldestSignalAge: oldest,
        avgSignalAge: Math.round(avgAge),
        percentLive,
        percentHeuristic,
        totalSignalCount,
        liveSignalCount,
        heuristicSignalCount,
      },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private normalizeLiveSignal(raw: any): ProvenancedSignal {
    // Map live_signals_v2 row + metadata into ProvenancedSignal
    const type = raw.signal_type;
    let value = raw.signal_value; // already 0–1 from ingestion pipeline

    // Some signals need transformation
    if (type === "stock_price" || type === "stock_90d_change") {
      // Convert % return to normalized 0–1 (negative returns = higher risk)
      // raw_value is e.g. "-15.2" for -15%
      const pct = parseFloat(raw.raw_value) / 100; // now -0.15
      value = this.normalizeSignedPercentage(pct);
    }

    if (type === "recent_layoff_news") {
      // raw_value is article count or sentiment score 0–1 already
    }

    return {
      value,
      source: raw.source_name, // 'alpha_vantage', 'newsapi', etc.
      timestamp: raw.signal_timestamp || raw.fetched_at,
      rawValue: raw.raw_value,
      confidence: raw.confidence,
      decayRate: raw.decay_rate || this.getDefaultDecay(type),
      evidence: raw.evidence ? JSON.parse(raw.evidence) : [],
    };
  }

  private dbDataToProvenancedSignals(
    db: any,
  ): Record<string, ProvenancedSignal> {
    // Convert CompanyData fields into ProvenancedSignal with 'db' source
    const now = new Date();
    const dbTs = new Date(db.lastUpdated || now).toISOString();

    return {
      revenueGrowth: {
        value:
          db.revenueGrowthYoY !== null
            ? this.mapRevenueGrowth(db.revenueGrowthYoY)
            : 0.5,
        source: "db",
        timestamp: dbTs,
        confidence: db.source === "Fallback" ? 0.3 : 0.6,
        decayRate: 0.01, // quarterly data decays slowly
      },
      stock90DayChange: {
        value:
          db.stock90DayChange !== null
            ? this.mapStockTrend(db.stock90DayChange)
            : 0.5,
        source: "db",
        timestamp: dbTs,
        confidence: db.isPublic ? 0.6 : 0.3,
        decayRate: 0.1,
      },
      // ... map all L1-L5 inputs similarly
      // Note: These are provisional until live signals override
    };
  }

  private mapRevenueGrowth(yoy: number): number {
    if (yoy < -20) return 0.95;
    if (yoy < -10) return 0.85;
    if (yoy < 0) return 0.72;
    if (yoy < 5) return 0.55;
    if (yoy < 10) return 0.42;
    if (yoy < 20) return 0.3;
    if (yoy < 30) return 0.18;
    return 0.1;
  }

  private mapStockTrend(change90Day: number): number {
    if (change90Day < -30) return 0.95;
    if (change90Day < -15) return 0.8;
    if (change90Day < -5) return 0.6;
    if (change90Day < 5) return 0.42;
    if (change90Day < 15) return 0.28;
    if (change90Day < 30) return 0.15;
    return 0.08;
  }

  private normalizeSignedPercentage(pct: number): number {
    // -0.2 → 0.8 (bad), +0.2 → 0.2 (good)
    return Math.max(0, Math.min(1, 0.5 - pct / 2));
    // e.g., -30% drop → 0.5 - (-0.3/2)=0.5+0.15=0.65 (high risk)
    // +30% rise → 0.5 - 0.15=0.35 (low risk)
  }

  private getDefaultDecay(signalType: string): number {
    const config = this.SIGNAL_CONFIG[signalType];
    return config ? config.defaultDecayRate : 0.05;
  }

  private computeConflictLevel(
    conflicts: SignalConflict[],
  ): "none" | "low" | "medium" | "high" | "critical" {
    if (conflicts.length === 0) return "none";
    const severities = conflicts.map((c) => c.severity);
    if (severities.includes("critical")) return "critical";
    if (severities.includes("high")) return "high";
    if (conflicts.length >= 3) return "high";
    return "medium";
  }

  private mapAgentToSignalType(agentId: string): string {
    // Map agent ID → signal type it validates
    const mapping: Record<string, string> = {
      stockVolatilityAgent: "stock90DayChange",
      revenueGrowthAgent: "revenueGrowth",
      recentLayoffAgent: "recentLayoffRecency",
      costCuttingAgent: "layoffFrequency",
      sectorContagionAgent: "sectorContagion",
      // ... map others
    };
    return mapping[agentId] || "default";
  }
}

export const consensusEngine = new ConsensusEngine();
