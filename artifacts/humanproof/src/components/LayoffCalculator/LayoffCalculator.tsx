import React, { useState, useRef, useEffect } from "react";
import { useLayoff } from "../../context/LayoffContext";
import { LayoffInputForm } from "./LayoffInputForm";
import { LayoffScoreDisplay } from "./LayoffScoreDisplay";
import {
  calculateLayoffScore,
  simulateScenario,
  createUnknownCompanyFallback,
  ScoreInputs,
  ScenarioOverrides,
} from "../../services/layoffScoreEngine";
import { runFullEnsembleAnalysis } from "../../services/ensemble/ensembleOrchestrator";
import { LayoffActionPlan } from "./LayoffActionPlan";
import { layoffNewsCache } from "../../data/layoffNewsCache";
import { AgentNetworkDisplay } from "./AgentNetworkDisplay";
import {
  AgentBreakdownPanel,
  transformSignalsForDisplay,
} from "./AgentBreakdownPanel";
import { DisplacementTrajectoryPanel } from "./DisplacementTrajectoryPanel";
import { OracleResult } from "../../services/DisplacementTrajectoryEngine";
import { OracleInsightsPanel } from "./OracleInsightsPanel";
import { ScoreConfidenceInterval } from "./ScoreConfidenceInterval";
import { WhatIfSkillSimulator } from "./WhatIfSkillSimulator";
import { KeyRiskDriversPanel } from "./KeyRiskDriversPanel";
import { LayoffAuditDashboard } from "./LayoffAuditDashboard";
import { LayoffAuditDashboardV3, isTabsV3Enabled } from "../AuditTabs/v3/LayoffAuditDashboardV3";
import { mapToHybridResult } from "../../utils/hybridResultMapper";
import { resolveCompanyData } from "../../data/companyIntelligenceBridge";
import { markCompanyRecentlyAudited } from "../audit/RealtimeSignalToast";
import { triggerScraperForCompany, checkDataFreshness } from "../../services/scraperTrigger";
import { LiveScraperGate } from "../audit/LiveScraperGate";
import { COMPANY_INTELLIGENCE_DB } from "../../data/companyIntelligenceDB";
import { CompanyData } from "../../data/companyDatabase";
import { getCompanySync as getCompanyByName, getAllIndustryRisk } from "../../services/db/staticDataService";
import { queryCompanyIntelligenceWithMatch } from "../../services/companyIntelligenceService";
import { IndustryRisk } from "../../data/industryRiskData";
import { RoleExposure } from "../../data/roleExposureData";
import { saveLayoffScore } from "../../services/scoreStorageService";
import { LayoffAlertBanner } from "./LayoffAlertBanner";
import { LayoffShareCard } from "./LayoffShareCard";
import { LayoffScoreHistory } from "./LayoffScoreHistory";
import { LayoffScenarioPanel } from "./LayoffScenarioPanel";
import { RecommendationPanel } from "./RecommendationPanel";
import { MissionBriefing, recommendationsToMissions } from "./MissionBriefing";
import { SpyLoadingState } from "./SpyLoadingState";
import { supabase } from "../../utils/supabase";
import { scoreSyncService } from "../../services/scoreSyncService";
import {
  getCareerIntelligence,
  CareerIntelligence,
} from "../../data/intelligence/index";
import { getAutoDeducedDepartment } from "../../data/oracleRoleIndex";
import { countryCodeToD5Key } from "../../data/companyDatabase";
import { injectLayoffEvent } from "../../data/layoffNewsCache";
import { recordScore } from "../../services/scoreDeltaService";
import { detectCollapseStage } from "../../services/collapsePredictor";
import { PipelineTimer } from "../../services/pipelineTimer";
import { CachedResultBanner } from "./CachedResultBanner";
import { BreakingNewsBanner } from "./BreakingNewsBanner";
import { getApiQuotaStatus, ApiQuotaStatus, CircuitApiName } from "../../services/apiCircuitBreaker";
import { fetchAuditData } from "../../services/auditDataPipeline";
import { startBackgroundRefresh } from "../../services/liveRefreshService";
import { resolveRoleInput } from "../../services/roleResolution";
import { HybridResult } from "../../types/hybridResult";

interface Props {
  /** Optional: passed from ToolsPage so action plan links can switch tabs */
  onSwitchTab?: (tabId: string) => void;
}

// ── Helper: derive experience bracket from tenure years ───────────────────────
const deriveExperience = (tenureYears: number): string => {
  if (tenureYears < 2) return "0-2";
  if (tenureYears < 5) return "2-5";
  if (tenureYears < 10) return "5-10";
  if (tenureYears < 15) return "10-15";
  return "15+";
};

// Toast notification — replaces alert()
const Toast: React.FC<{
  message: string;
  type: "success" | "error" | "info" | "warning";
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Determine styles and icon based on type
  const getStyle = () => {
    switch (type) {
      case "success":
        return { bg: "rgba(16,185,129,0.95)", icon: "✓" };
      case "error":
        return { bg: "rgba(239,68,68,0.95)", icon: "✗" };
      case "warning":
        return { bg: "rgba(245,158,11,0.95)", icon: "⚠" };
      case "info":
        return { bg: "rgba(59,130,246,0.95)", icon: "ℹ" };
    }
  };
  const { bg, icon } = getStyle();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 10000,
        background: bg,
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        animation: "fadeIn 0.3s ease-in",
      }}
    >
      {icon} {message}
    </div>
  );
};

export const LayoffCalculator: React.FC<Props> = ({ onSwitchTab }) => {
  const { state, dispatch } = useLayoff();
  const [showShareCard, setShowShareCard] = useState(false);
  const [lastScoreInputs, setLastScoreInputs] = useState<ScoreInputs | null>(
    null,
  );
  // 0=idle, 1=engine+agents running, 2=gemini synthesizing, 3=done
  const [ensembleStage, setEnsembleStage] = useState(0);
  // Data quality flag: 'live' | 'partial' | 'fallback'
  const [dataQuality, setDataQuality] = useState<
    "live" | "partial" | "fallback"
  >("live");
  // Truthful signal counts tracked from OSINT + liveDataService
  const [liveSignalCount, setLiveSignalCount] = useState(0);
  const [heuristicSignalCount, setHeuristicSignalCount] = useState(0);
  // ── [TRAJECTORY] Oracle result for Displacement Trajectory panel ──────────
  const [oracleResult, setOracleResult] = useState<OracleResult | null>(null);
  // ── [INTEL] Local CareerIntelligence for OracleInsightsPanel ─────────────
  const [careerIntelligence, setCareerIntelligence] =
    useState<CareerIntelligence | null>(null);

  // ── BUG FIX: Double-submit guard ─────────────────────────────────────────
  const isSubmitting = useRef(false);

  // ── Force-refresh state — set by CachedResultBanner "Recalculate" button ──
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [apiQuotaStatus, setApiQuotaStatus] = useState<Record<CircuitApiName, ApiQuotaStatus> | null>(null);

  // ── Live Scraper Gate — shown on first audit when company data is stale ────
  // The gate triggers live scraping, polls for completion, then calls the
  // resolve function so handleCalculate continues into the audit pipeline.
  const [scraperGateActive, setScraperGateActive] = useState(false);
  const scraperGateResolveRef = useRef<(() => void) | null>(null);

  // ── Supabase Realtime for breaking_news_events is handled by useCompanySignalSubscription
  // inside LayoffAuditDashboard (rendered when hasCompletedAssessment=true). That hook
  // does client-side name matching (Realtime doesn't support ilike filters), injects into
  // layoffNewsCache, and fires the BreakingNewsBanner listener. Maintaining a second channel
  // here with an unsupported `ilike` filter caused duplicate subscriptions and silent failures.

  // ── ARCHITECTURE: Session result cache ────────────────────────────────────
  // Key = companyName + roleKey + experience + country hash (10-min TTL)
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const buildCacheKey = (
    company: string,
    roleKey: string,
    exp: string,
    country: string,
  ) => `hp_score_cache__${company.toLowerCase()}_${roleKey}_${exp}_${country}`;

  // Restore last cached result on mount (so page refresh re-surfaces last session)
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hp_last_score_session");
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (!cached?.result || !cached?.ts) return;
      if (Date.now() - cached.ts > CACHE_TTL_MS) return;
      // Only restore if calculator is idle and has no result yet
      if (!state.hasCompletedAssessment && !state.isCalculating) {
        dispatch({ type: "SET_SCORE_RESULT", payload: cached.result });
        // SET_INPUTS accepts a partial payload for companyName and roleTitle
        dispatch({
          type: "SET_INPUTS",
          payload: {
            companyName: cached.companyName ?? null,
            roleTitle: cached.roleTitle ?? null,
          },
        });
        if (cached.dataQuality) setDataQuality(cached.dataQuality);
        if (cached.oracleResult) setOracleResult(cached.oracleResult);
        if (cached.careerIntel) setCareerIntelligence(cached.careerIntel);
      }
    } catch {
      /* sessionStorage unavailable — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Refresh circuit breaker status after each completed assessment so the banner is accurate
  React.useEffect(() => {
    if (state.hasCompletedAssessment) {
      setApiQuotaStatus(getApiQuotaStatus());
    }
  }, [state.hasCompletedAssessment, state.scoreResult]);

  // Background refresh — re-audits every 30 minutes while result is on screen
  React.useEffect(() => {
    if (!state.hasCompletedAssessment || !state.companyName || !state.roleTitle || !state.userFactors) return;
    const inputs = {
      companyName: state.companyName,
      roleTitle:   state.roleTitle,
      department:  state.department || '',
      userFactors: state.userFactors,
    };
    const cancel = startBackgroundRefresh(inputs, ({ result }) => {
      dispatch({ type: 'SET_SCORE_RESULT', payload: result });
      setApiQuotaStatus(getApiQuotaStatus());
    });
    return cancel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasCompletedAssessment, state.companyName, state.roleTitle]);

  const handleForceRefresh = async () => {
    setIsForceRefreshing(true);
    try {
      await handleCalculate(true);
    } finally {
      setIsForceRefreshing(false);
    }
  };

  const runAuditPipelineDrivenCalculation = async (
    forceRefresh = false,
  ): Promise<void> => {
    // Mark this company as "recently audited" so the Realtime toast watcher
    // fires for any breaking_news_events INSERT against it in the next 24h.
    if (state.companyName && state.companyName.trim().length >= 2) {
      markCompanyRecentlyAudited(state.companyName.trim());
    }

    const roleTitle = state.roleTitle || "Employee";
    const resolvedRole = resolveRoleInput(roleTitle, { oracleKey: state.oracleKey });
    const effectiveOracleKey = resolvedRole.canonicalKey ?? state.oracleKey ?? null;
    const effectiveDepartment =
      state.department ||
      (effectiveOracleKey ? getAutoDeducedDepartment(effectiveOracleKey) : "Operations");
    const userFactors =
      state.userFactors || {
        tenureYears: 1.5,
        careerYears: 1.5,
        isUniqueRole: false,
        performanceTier: "average" as const,
        hasRecentPromotion: false,
        hasKeyRelationships: false,
      };

    dispatch({
      type: "SET_INPUTS",
      payload: {
        oracleKey: effectiveOracleKey,
        department: effectiveDepartment,
      },
    });

    // When recalculating after breaking news, clear the last-session snapshot so the
    // stale result isn't restored from storage if the page refreshes mid-calculation.
    if (forceRefresh) {
      try { sessionStorage.removeItem('hp_last_score_session'); } catch { /* ignore */ }
    }

    setEnsembleStage(1);
    const { result: pipelineResult, companyData, source } = await fetchAuditData({
      companyName: state.companyName || "Unknown",
      roleTitle,
      department: effectiveDepartment,
      userFactors,
      oracleKey: effectiveOracleKey ?? undefined,
      financialRunwayMonths: (userFactors as any).financialRunwayMonths ?? 0,
    });

    dispatch({ type: "SET_COMPANY_DATA", payload: companyData });
    setLiveSignalCount(pipelineResult.signalQuality.liveSignals ?? 0);
    setHeuristicSignalCount(pipelineResult.signalQuality.heuristicSignals ?? 0);

    const pipelineQuality: "live" | "partial" | "fallback" =
      source === "live" && (pipelineResult.signalQuality.hardFailures?.length ?? 0) === 0
        ? "live"
        : source === "fallback"
          ? "fallback"
          : "partial";
    setDataQuality(pipelineQuality);

    const localIntel = effectiveOracleKey ? getCareerIntelligence(effectiveOracleKey) : null;
    if (localIntel) setCareerIntelligence(localIntel);

    const careerExp =
      userFactors?.careerYears ?? userFactors.tenureYears;
    const oracleExp = deriveExperience(careerExp);
    const d5CountryKey = countryCodeToD5Key(companyData.region || "GLOBAL");
    const _industryMap = getAllIndustryRisk();
    const _industryRaw = (companyData.industry ?? '').trim();
    // Alias map for common DB/OSINT industry name variants that don't match
    // the canonical keys in industryRiskData (e.g. "Information Technology" → "Technology")
    const _industryAliases: Record<string, string> = {
      'information technology': 'Technology', 'software': 'Technology',
      'saas': 'Technology', 'technology services': 'IT Services',
      'engineering it services': 'IT Services', 'bfsi': 'Financial Services',
      'finance': 'Financial Services', 'banking & finance': 'Banking',
      'banking and finance': 'Banking', 'pharma': 'Biotech/Pharma',
      'pharmaceuticals': 'Biotech/Pharma', 'healthcare services': 'Healthcare',
      'e-commerce': 'E-commerce', 'ecommerce': 'E-commerce',
      'fintech': 'FinTech', 'edtech': 'EdTech', 'healthtech': 'HealthTech',
      'food tech': 'Food Tech', 'quick commerce': 'Quick Commerce',
    };
    const _lc = _industryRaw.toLowerCase();
    const industryData: IndustryRisk | undefined =
      _industryMap[_industryRaw] ??
      _industryMap[_industryRaw.replace(/\b\w/g, c => c.toUpperCase())] ??
      _industryMap[_lc] ??
      (_industryAliases[_lc] ? _industryMap[_industryAliases[_lc]] : undefined);
    const oracleBody = {
      roleKey: effectiveOracleKey || "generic",
      industry: companyData.industry,
      experience: oracleExp,
      country: d5CountryKey,
    };

    const cacheKey = buildCacheKey(
      companyData.name,
      effectiveOracleKey || "generic",
      oracleExp,
      d5CountryKey,
    );

    // forceRefresh (triggered by breaking-news "Recalculate" toast) bypasses the
    // Oracle session cache so the new event is incorporated into the fresh score.
    let cachedOracleResult: OracleResult | null = null;
    if (!forceRefresh) {
      try {
        const rawCache = sessionStorage.getItem(cacheKey);
        if (rawCache) {
          const { value, ts } = JSON.parse(rawCache);
          if (Date.now() - ts < CACHE_TTL_MS) cachedOracleResult = value;
        }
      } catch {
        /* ignore */
      }
    }

    const oraclePromise = cachedOracleResult
      ? Promise.resolve(cachedOracleResult)
      : supabase.functions
          .invoke("compute-oracle", { body: oracleBody })
          .then(({ data, error }) => {
            if (error || !data || !Array.isArray(data.dimensions)) {
              console.warn("[Oracle] compute-oracle failed:", error?.message);
              return null;
            }
            try {
              sessionStorage.setItem(
                cacheKey,
                JSON.stringify({ value: data, ts: Date.now() }),
              );
            } catch {
              /* quota exceeded */
            }
            return data as OracleResult;
          })
          .catch((err) => {
            console.warn("[Oracle] Edge Function unreachable:", err);
            return null;
          });

    let swarmDone = false;
    const shadowPromise = runFullEnsembleAnalysis({
      companyName: companyData.name,
      companyData,
      industry: companyData.industry,
      industryData,
      roleTitle,
      department: effectiveDepartment,
      tenureYears: userFactors.tenureYears,
      isUniqueRole: userFactors.isUniqueRole,
      uniquenessDepth: userFactors.uniquenessDepth,
      performanceTier: userFactors.performanceTier,
      hasRecentPromotion: userFactors.hasRecentPromotion,
      hasKeyRelationships: userFactors.hasKeyRelationships,
      forceRefresh,
      onSwarmComplete: () => {
        swarmDone = true;
        setEnsembleStage(2);
      },
    }).catch((err) => {
      console.warn("[Ensemble] Shadow path failed:", err);
      return null;
    });

    const stageTimer = setTimeout(() => {
      if (!swarmDone) {
        setEnsembleStage((prev) => (prev < 2 ? 2 : prev));
      }
    }, 4000);

    const [resolvedOracle, shadowEnsemble] = await Promise.all([
      oraclePromise,
      shadowPromise,
    ]);
    clearTimeout(stageTimer);
    if (resolvedOracle) setOracleResult(resolvedOracle);
    setEnsembleStage(3);

    const mergedResult: HybridResult = {
      ...pipelineResult,
      primaryRiskDriver: (shadowEnsemble as any)?.primaryRiskDriver ?? pipelineResult.primaryRiskDriver,
      sixMonthInactionConsequence: (shadowEnsemble as any)?.sixMonthInactionConsequence ?? pipelineResult.sixMonthInactionConsequence,
      oneActionThisWeek: (shadowEnsemble as any)?.oneActionThisWeek ?? pipelineResult.oneActionThisWeek,
      whatChangesRiskMost: (shadowEnsemble as any)?.whatChangesRiskMost ?? pipelineResult.whatChangesRiskMost,
      estimatedTimeline: (shadowEnsemble as any)?.estimatedTimeline ?? pipelineResult.estimatedTimeline,
      keyProtectiveFactor: (shadowEnsemble as any)?.keyProtectiveFactor ?? pipelineResult.keyProtectiveFactor,
      scenarioArchetype: (shadowEnsemble as any)?.scenarioArchetype ?? pipelineResult.scenarioArchetype,
      scenarioArchetypeLabel: (shadowEnsemble as any)?.scenarioArchetypeLabel ?? pipelineResult.scenarioArchetypeLabel,
      indiaSpecificInsight: (shadowEnsemble as any)?.indiaSpecificInsight ?? pipelineResult.indiaSpecificInsight,
      confidenceNote: (shadowEnsemble as any)?.confidenceNote ?? pipelineResult.confidenceNote,
      resolvedPattern: (shadowEnsemble as any)?.resolvedPattern ?? pipelineResult.resolvedPattern,
      agentStatus: (shadowEnsemble as any)?.agentStatus ?? pipelineResult.agentStatus,
      meta: {
        ...pipelineResult.meta,
        calculationMode: `${pipelineResult.meta?.calculationMode ?? "CONSENSUS_HYBRID"}+UI_PIPELINE`,
      },
    };

    dispatch({ type: "SET_SCORE_RESULT", payload: mergedResult });

    if (companyData.name && !companyData.source?.includes("Fallback") && !companyData.source?.includes("Unknown")) {
      detectCollapseStage({
        companyName: companyData.name,
        industry: companyData.industry || "Technology",
        roleTitle,
        stock90dChange: companyData.stock90DayChange,
        aiInvestmentSignal: companyData.aiInvestmentSignal ?? "medium",
        layoffRounds: companyData.layoffRounds ?? 0,
        mostRecentLayoffDate: companyData.layoffsLast24Months?.[0]?.date ?? null,
        filingDelinquent: false,
        userDepartment: effectiveDepartment,
      }).then(report => {
        if (report.stage || (report.departmentRisks && report.departmentRisks.length > 0)) {
          dispatch({
            type: "SET_SCORE_RESULT",
            payload: {
              ...mergedResult,
              ...(report.stage ? { collapseStage: report.stage } : {}),
              departmentFreezeScore: report.userDepartmentFreezeScore ?? null,
            },
          });
        }
      }).catch(() => { /* best effort */ });
    }

    recordScore({
      roleKey: effectiveOracleKey || "generic",
      industryKey: companyData.industry || "Technology",
      countryKey: d5CountryKey,
      experience: oracleExp,
      score: mergedResult.total,
      timestamp: Date.now(),
      isGrounded: pipelineQuality === "live",
      breakdown: {
        L1: mergedResult.breakdown.L1,
        L2: mergedResult.breakdown.L2,
        L3: mergedResult.breakdown.L3,
        L4: mergedResult.breakdown.L4,
        L5: mergedResult.breakdown.L5,
        ...((mergedResult.breakdown as any).D6 != null ? { D6: (mergedResult.breakdown as any).D6 } : {}),
        ...((mergedResult.breakdown as any).D7 != null ? { D7: (mergedResult.breakdown as any).D7 } : {}),
      },
      companyName: companyData.name,
      companySnapshot: {
        stock90DayChange: companyData.stock90DayChange ?? null,
        revenueGrowthYoY: companyData.revenueGrowthYoY ?? null,
        layoffRounds: companyData.layoffRounds ?? 0,
        lastLayoffPercent: companyData.lastLayoffPercent ?? null,
        aiInvestmentSignal: companyData.aiInvestmentSignal ?? "medium",
        employeeCount: companyData.employeeCount,
        revenuePerEmployee: companyData.revenuePerEmployee,
      },
    });

    dispatch({
      type: "SHOW_TOAST",
      payload: {
        message: `Audit pipeline complete · ${mergedResult.confidencePercent}% confidence · ${mergedResult.signalQuality.liveSignals} live signals`,
        type: "success",
      },
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id && state.companyName && state.roleTitle) {
        const allowCommunityShare = (() => {
          try { return localStorage.getItem('hp_community_share') === '1'; } catch { return false; }
        })();
        await supabase.from("layoff_scores").insert({
          user_id: session.user.id,
          company_name: state.companyName,
          role_title: state.roleTitle,
          department: effectiveDepartment,
          score: mergedResult.total,
          tier: mergedResult.tier.label,
          tier_color: mergedResult.tier.color,
          confidence: mergedResult.confidence,
          breakdown: mergedResult.breakdown,
          models_used: shadowEnsemble ? (shadowEnsemble as any).modelsUsed ?? [] : [],
          data_quality: pipelineQuality,
          calculated_at: new Date().toISOString(),
          allow_community_share: allowCommunityShare,
        });

        scoreSyncService.setUserId(session.user.id);
        scoreSyncService.syncFromLocal([{
          source: "layoff",
          score: mergedResult.total,
          plot_score: mergedResult.total,
          data_version: "v2",
          app_version: "2.0",
          metadata: {
            company: state.companyName,
            role: state.roleTitle,
            tier: mergedResult.tier.label,
            dataQuality: pipelineQuality,
          },
        }]).catch(() => {});
      }
    } catch (syncError) {
      console.warn("[Layoff] Server score sync failed:", syncError);
    }

    try {
      sessionStorage.setItem(
        "hp_last_score_session",
        JSON.stringify({
          result: mergedResult,
          companyName: state.companyName,
          roleTitle: state.roleTitle,
          dataQuality: pipelineQuality,
          oracleResult: resolvedOracle ?? null,
          careerIntel: localIntel ?? null,
          ts: Date.now(),
        }),
      );
    } catch {
      /* ignore */
    }
  };

  const handleCalculate = async (forceRefresh = false) => {
    // ── BUG FIX: Prevent concurrent submissions ────────────────────────────
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    // ── Live Scraper Gate ──────────────────────────────────────────────────
    // On first-run (not forceRefresh), check whether this company was scraped
    // recently. If not, trigger the scraper and show the gate UI — the audit
    // pipeline only starts once the gate calls onReady (jobs done or timeout).
    // This guarantees the first result is based on live data, not stale cache.
    const company = (state.companyName ?? '').trim();
    if (!forceRefresh && company.length >= 2) {
      const isFresh = await checkDataFreshness(company).catch(() => false);
      if (!isFresh) {
        // Trigger scraper (fire-and-forget — gate polls independently)
        void triggerScraperForCompany(company).then(r => {
          if (r.state === 'queued') console.info(`[Gate] queued ${r.jobsBuilt} jobs for ${company}`);
          else if (r.state === 'error') console.info('[Gate] scraper unreachable (gate will timeout gracefully):', r.message);
        });

        // Show gate and wait for it to call onReady
        await new Promise<void>(resolve => {
          scraperGateResolveRef.current = resolve;
          setScraperGateActive(true);
        });
        setScraperGateActive(false);
      }
    }

    dispatch({ type: "SET_CALCULATING", payload: true });
    setEnsembleStage(0);
    setDataQuality("live");
    setOracleResult(null);
    setCareerIntelligence(null);

    // BUG-C4 FIX: Track data quality locally through each OSINT branch then
    // refine after ensemble resolves — avoids stale React async state closure.
    let computedQuality: "live" | "partial" | "fallback" = "fallback";

    try {
      try {
        await runAuditPipelineDrivenCalculation(forceRefresh);
        return;
      } catch (pipelineError) {
        console.warn(
          "[AuditPipeline] UI pipeline path failed, falling back to legacy submit path:",
          pipelineError,
        );
      }

      let companyData: CompanyData | null = null;
      let companyFallback: CompanyData | null = state.companyData || null;

      if (state.companyName) {
        // Fetch dynamic data from OSINT Edge Function for ALL companies
        const reqBody: any = { companyName: state.companyName };
        if (state.companyData?.source === "User Input") {
          reqBody.employeeCount = state.companyData.employeeCount;
          reqBody.isPublic = state.companyData.isPublic;
          reqBody.industry = state.companyData.industry;
        }

        const { data, error } = await supabase.functions.invoke(
          "fetch-company-data",
          { body: reqBody },
        );

        if (data && !error && data.data) {
          const osintData = data.data;

          const resolvedIsPublic = Boolean(
            osintData.is_public === true || osintData.is_public === "true",
          );

          const resolvedLayoffs: { date: string; percentCut: number }[] =
            Array.isArray(osintData.recent_layoffs)
              ? osintData.recent_layoffs.map((l: any) => ({
                  date: l.date ?? new Date().toISOString(),
                  // Use 0 for unknown severity — fabricating 5% inflates L2 scoring
                  percentCut:
                    typeof l.percent_cut === "number" ? l.percent_cut : 0,
                }))
              : osintData.recent_layoff_news
                ? [
                    {
                      date: new Date().toISOString(),
                      // Only use a real percent if the DB stored one; 0 = undisclosed
                      percentCut: osintData.last_layoff_percent ?? 0,
                    },
                  ]
                : [];

          const resolvedLayoffRounds =
            typeof osintData.layoff_rounds === "number"
              ? osintData.layoff_rounds
              : resolvedLayoffs.length;

          const resolvedRevPerEmp: number =
            typeof osintData.revenue_per_employee === "number"
              ? osintData.revenue_per_employee
              : osintData.annual_revenue && osintData.employee_count
                ? Math.round(
                    osintData.annual_revenue / osintData.employee_count,
                  )
                : 150_000;

          companyData = {
            name: osintData.company_name,
            ticker: osintData.ticker ?? osintData.stock_ticker,
            isPublic: resolvedIsPublic,
            industry: osintData.industry || "Technology",
            region: osintData.region ?? osintData.country_code ?? "GLOBAL",
            employeeCount: osintData.employee_count || 500,
            revenueGrowthYoY: osintData.revenue_yoy ?? null,
            stock90DayChange: osintData.stock_90d_change ?? null,
            layoffsLast24Months: resolvedLayoffs,
            layoffRounds: resolvedLayoffRounds,
            lastLayoffPercent:
              osintData.last_layoff_percent ??
              (resolvedLayoffs.length > 0
                ? resolvedLayoffs[0].percentCut
                : null),
            revenuePerEmployee: resolvedRevPerEmp,
            aiInvestmentSignal: osintData.ai_investment_signal ?? "medium",
            source: data.source || "Live OSINT Database",
            lastUpdated: osintData.last_updated ?? new Date().toISOString(),
          };

          // ── BUG-C3 FIX: Inject live layoff news from OSINT into runtime cache ──
          // This makes `newsRisk` (L2) active for any company the OSINT layer returns
          // layoff data for, not just the 3 companies seeded in layoffNewsCache.
          if (
            companyData.layoffsLast24Months &&
            companyData.layoffsLast24Months.length > 0
          ) {
            const latestLayoff = companyData.layoffsLast24Months[0];
            injectLayoffEvent({
              companyName: companyData.name,
              date: latestLayoff.date,
              headline: `${companyData.name} reduced headcount by ${latestLayoff.percentCut}% — live OSINT signal`,
              percentCut: latestLayoff.percentCut,
              source: companyData.source || "Live OSINT",
              url: "",
              affectedDepartments: ["All Departments"],
            });
          }

          // ── BUG-C4 FIX: Track data quality as local var — will be refined after ensemble ──
          const hasRichData =
            companyData.revenueGrowthYoY !== null ||
            companyData.layoffsLast24Months.length > 0;
          computedQuality = hasRichData ? "live" : "partial";
          setDataQuality(computedQuality);

          // Count actual live fields returned by the edge function
          const osint = data.data;
          const osintLiveCount =
            (osint.stock_90d_change     != null ? 1 : 0) +
            (osint.revenue_growth_yoy   != null ? 1 : 0) +
            (osint.recent_layoff_news            ? 1 : 0) +
            (osint.employee_count       != null ? 1 : 0) +
            (osint.revenue_per_employee != null ? 1 : 0);
          setLiveSignalCount(osintLiveCount);
          setHeuristicSignalCount(Math.max(0, 7 - osintLiveCount));

          dispatch({
            type: "SHOW_TOAST",
            payload: {
              message: `Live data loaded — ${data.source ?? "OSINT"}`,
              type: "success",
            },
          });

          if (data?.dataFreshness?.stale) {
            dispatch({
              type: "SHOW_TOAST",
              payload: {
                message: `Data is stale (${data.dataFreshness.staleThresholdHours}h SLA) — confidence has been reduced`,
                type: "warning",
              },
            });
          }
        } else {
          console.warn("[LayoffCalc] OSINT Edge Function unavailable — querying Supabase 2000-company table");
          // ── Resolution order when OSINT fails ─────────────────────────────
          // 1. Supabase company_intelligence (2000+ companies, always try first)
          // 2. Legacy static DB (58 companies, code-side)
          // 3. Hard fallback (±30pt warning shown)
          let resolved: CompanyData | null = null;

          try {
            const matchResult = await queryCompanyIntelligenceWithMatch(state.companyName || "");
            if (matchResult) {
              resolved   = matchResult.companyData;
              companyData = resolved;
              setDataQuality("partial");
              setLiveSignalCount(0);
              setHeuristicSignalCount(7);
              console.log(`[LayoffCalc] Supabase HIT: "${resolved.name}" (ratio=${matchResult.matchRatio.toFixed(2)}, exact=${matchResult.isExactMatch})`);

              // Surface mismatch warning when the fuzzy-matched name differs from what the user typed.
              // matchRatio 0.50–0.79: different entity, show amber warning.
              // matchRatio < 0.50: rejected by confidence gate, falls through to fallback.
              if (!matchResult.isExactMatch && matchResult.matchedCompanyName && matchResult.matchRatio < 0.80) {
                dispatch({
                  type: "SHOW_TOAST",
                  payload: {
                    message: `Matched to "${matchResult.matchedCompanyName}" — confirm this is the correct entity before submitting`,
                    type: "warning",
                  },
                });
              }
            }
          } catch (supabaseErr) {
            console.warn("[LayoffCalc] Supabase intelligence lookup failed:", supabaseErr);
          }

          if (!resolved) {
            // Static DB final fallback
            companyData = companyFallback || getCompanyByName(state.companyName || "");
          }

          setDataQuality(companyData ? "partial" : "fallback");
        }
      }

      if (!companyData) {
        companyData = {
          name: state.companyName || "Unknown",
          isPublic: false,
          industry: "Technology",
          region: "GLOBAL",
          employeeCount: 500,
          revenueGrowthYoY: null,
          stock90DayChange: null,
          layoffsLast24Months: [],
          layoffRounds: 0,
          lastLayoffPercent: null,
          revenuePerEmployee: 150000,
          aiInvestmentSignal: "medium",
          source: "Fallback",
          lastUpdated: new Date().toISOString(),
        };
        computedQuality = "fallback";
        setDataQuality("fallback");
      }

      let fetchedIndustryData: IndustryRisk | undefined;
      let fetchedRoleExposure: RoleExposure | undefined;

      try {
        const [indRes, roleRes] = await Promise.all([
          supabase
            .from("industry_risk_data")
            .select("*")
            .eq("sector_name", companyData.industry)
            .maybeSingle(),
          supabase
            .from("role_exposure_data")
            .select("*")
            .ilike("role_title", state.roleTitle || "")
            .maybeSingle(),
        ]);

        if (indRes.data) {
          fetchedIndustryData = {
            baselineRisk: indRes.data.baseline_risk,
            aiAdoptionRate: indRes.data.ai_adoption_rate,
            growthOutlook: indRes.data.growth_outlook,
            avgLayoffRate2025: indRes.data.avg_layoff_rate_2025,
          };
        }
        if (roleRes.data) {
          fetchedRoleExposure = {
            aiRisk: roleRes.data.ai_risk,
            layoffRisk: roleRes.data.layoff_risk,
            demandTrend: roleRes.data.demand_trend,
          };
        }
      } catch (e) {
        console.warn("Failed to fetch dynamic risk tables", e);
      }

      const industryData: IndustryRisk | undefined =
        fetchedIndustryData || getAllIndustryRisk()[companyData.industry];

      const inputs: ScoreInputs = {
        companyData,
        industryData,
        roleTitle: state.roleTitle || "Employee",
        department: state.department || "Operations",
        userFactors: state.userFactors || {
          tenureYears: 1.5,
          isUniqueRole: false,
          performanceTier: "average",
          hasRecentPromotion: false,
          hasKeyRelationships: false,
        },
        roleExposureOverride: fetchedRoleExposure,
      };
      setLastScoreInputs(inputs);

      // ── [INTELLIGENCE] Resolve oracle role key: prefer context key set by form,
      //    fall back to experience-based derivation for manual text input.
      const oracleRoleKey = state.oracleKey || "generic";

      // ── BUG-C1 FIX: Use total career experience (careerYears) for D4/Oracle
      //    bracket, NOT company tenure. A 15-yr veteran who joined 1yr ago should
      //    NOT be classified as junior ("0-2" bracket).
      const careerExp =
        inputs.userFactors?.careerYears ?? inputs.userFactors.tenureYears;
      const oracleExp = deriveExperience(careerExp);

      // ── BUG-M1 FIX: Normalise region/country to COUNTRY_RISK_PROFILES key
      //    OSINT populates companyData.region with codes like "IN", "US", "EU".
      //    countryCodeToD5Key() maps them to "india", "usa", "germany" etc.
      //    which match the keys used in COUNTRY_RISK_PROFILES for D5 scoring.
      const rawRegion = companyData.region || "GLOBAL";
      const d5CountryKey = countryCodeToD5Key(rawRegion);

      // ── [INTELLIGENCE] Load CareerIntelligence from local DB immediately ──
      const localIntel = getCareerIntelligence(oracleRoleKey);
      if (localIntel) setCareerIntelligence(localIntel);

      // ── [INTELLIGENCE] Auto-derive department if not already set ─────────
      if (!inputs.department && oracleRoleKey !== "generic") {
        inputs.department = getAutoDeducedDepartment(oracleRoleKey);
      }

      // ── BUG FIX: Stage 1 — Swarm + engine firing ─────────────────────────
      setEnsembleStage(1);

      // ── Pipeline timing — shared across all async stages ─────────────────
      // fetchAuditData (called above) started a new timer. Retrieve it so we can
      // pass it into the ensemble and Oracle calls.
      // We create a new timer here since fetchAuditData is not called in this branch.
      const _calcTimer = PipelineTimer.start(companyData.name);

      // ── [TRAJECTORY] Fire Oracle via compute-oracle Edge Function ────────
      const oracleBody = {
        roleKey: oracleRoleKey,
        industry: companyData.industry,
        experience: oracleExp,
        country: d5CountryKey,
      };

      // Check session cache first
      const cacheKey = buildCacheKey(
        companyData.name,
        oracleRoleKey,
        oracleExp,
        d5CountryKey,
      );
      let cachedOracleResult: OracleResult | null = null;
      try {
        const rawCache = sessionStorage.getItem(cacheKey);
        if (rawCache) {
          const { value, ts } = JSON.parse(rawCache);
          if (Date.now() - ts < CACHE_TTL_MS) cachedOracleResult = value;
        }
      } catch { /* ignore */ }

      const oraclePromise = cachedOracleResult
        ? Promise.resolve(cachedOracleResult)
        : (() => {
            _calcTimer.mark('oracle_start');
            return supabase.functions.invoke('compute-oracle', { body: oracleBody })
              .then(({ data, error }) => {
                _calcTimer.mark('oracle_end');
                if (error || !data || !Array.isArray(data.dimensions)) {
                  console.warn('[Oracle] compute-oracle failed:', error?.message);
                  return null;
                }
                try {
                  sessionStorage.setItem(cacheKey, JSON.stringify({ value: data, ts: Date.now() }));
                } catch { /* quota exceeded */ }
                setOracleResult(data as OracleResult);
                return data as OracleResult;
              })
              .catch((err) => {
                _calcTimer.mark('oracle_end');
                console.warn('[Oracle] Edge Function unreachable:', err);
                return null;
              });
          })();

      // ── BUG FIX: Stage transitions driven by orchestrator callbacks ─────────
      // We start the analysis and trigger stage 2 based on swarm completion
      let swarmDone = false;
      const analysisPromise = runFullEnsembleAnalysis({
        companyName: companyData.name,
        companyData,
        industry: companyData.industry,
        industryData,
        roleTitle: inputs.roleTitle,
        department: inputs.department,
        tenureYears: inputs.userFactors.tenureYears,
        isUniqueRole: inputs.userFactors.isUniqueRole,
        uniquenessDepth: inputs.userFactors.uniquenessDepth,
        performanceTier: inputs.userFactors.performanceTier,
        hasRecentPromotion: inputs.userFactors.hasRecentPromotion,
        hasKeyRelationships: inputs.userFactors.hasKeyRelationships,
        roleExposureOverride: fetchedRoleExposure,
        _timer: _calcTimer,
        forceRefresh,
        onSwarmComplete: () => {
          swarmDone = true;
          setEnsembleStage(2);
        },
      });

      // Fallback stage advance after 4s if swarm completes very quickly (no callback yet)
      const stageTimer = setTimeout(() => {
        // BUG-B2 FIX: Use functional update to avoid stale closure of ensembleStage
        if (!swarmDone) {
          setEnsembleStage((prev) => (prev < 2 ? 2 : prev));
        }
      }, 4000);

      // Await both in parallel — ensemble drives the main result, oracle enriches it
      let ensembleResult: any;
      let resolvedOracle: any;

      try {
        [ensembleResult, resolvedOracle] = await Promise.all([
          analysisPromise,
          oraclePromise,
        ]);
      } catch (err) {
        console.warn(
          "[Ensemble] Critical failure, falling back to deterministic engine:",
          err,
        );
        // BUG-E4 FIX: Manual fallback to deterministic engine if ensemble crashes
        const engineOnly = calculateLayoffScore(inputs);
        ensembleResult = {
          score: engineOnly.score,
          confidence: 45,
          confidencePercent: 45,
          tier: engineOnly.tier,
          breakdown: engineOnly.breakdown,
          recommendations: engineOnly.recommendations,
          modelsUsed: [],
          isFallback: true, // Flag for UI to show "Limited Mode"
        };
        resolvedOracle = null;
      }

      clearTimeout(stageTimer);

      // Stage 3: Done — result is ready
      setEnsembleStage(3);

      // ── BUG-C4 FIX: Refine dataQuality AFTER both promises resolve ─────────
      // Previously dataQuality was set during OSINT (before ensemble ran).
      // Now we upgrade it based on actual ensemble quality: if Oracle succeeded
      // AND 3+ models responded, we have genuine live data. Otherwise downgrade.
      const finalQuality: "live" | "partial" | "fallback" =
        resolvedOracle && (ensembleResult.modelsUsed?.length ?? 0) >= 3
          ? "live"
          : (ensembleResult.modelsUsed?.length ?? 0) >= 2
            ? computedQuality === "fallback"
              ? "fallback"
              : "partial"
            : computedQuality;
      setDataQuality(finalQuality);

      // ── ENHANCEMENT: Enhance result with dataQuality + oracle + career intel ─
      const enrichedResult = {
        ...ensembleResult,
        dataQuality: finalQuality,
        oracleResult: resolvedOracle ?? undefined,
        careerIntelligence: localIntel ?? undefined,
      };

      dispatch({ type: "SET_SCORE_RESULT", payload: enrichedResult });

      // ── Pipeline timing — mark pipeline_end and emit full report ──────────
      _calcTimer.mark('pipeline_end');
      const _timingReport = _calcTimer.report();
      // Mark first_render on next animation frame (after React commit)
      requestAnimationFrame(() => {
        _calcTimer.mark('first_render');
      });

      // ── Priority 5: Async collapse detection — patches collapseStage into result ──
      // Runs non-blocking so dashboard loads immediately; stage appears within ~1s.
      // Only runs for known companies (not fallback) to avoid meaningless results.
      if (companyData.name && !companyData.source?.includes('Fallback') && !companyData.source?.includes('Unknown')) {
        detectCollapseStage({
          companyName: companyData.name,
          industry: companyData.industry || 'Technology',
          roleTitle: inputs.roleTitle,
          stock90dChange: companyData.stock90DayChange,
          aiInvestmentSignal: companyData.aiInvestmentSignal ?? 'medium',
          layoffRounds: companyData.layoffRounds ?? 0,
          mostRecentLayoffDate: companyData.layoffsLast24Months?.[0]?.date ?? null,
          filingDelinquent: false,
          userDepartment: inputs.department,
        }).then(report => {
          if (report.stage || (report.departmentRisks && report.departmentRisks.length > 0)) {
            // v6.0: Also propagate the user's department freeze score for Fix 7
            const userDeptFreeze = report.userDepartmentFreezeScore ?? null;
            dispatch({
              type: "SET_SCORE_RESULT",
              payload: {
                ...enrichedResult,
                ...(report.stage ? { collapseStage: report.stage } : {}),
                departmentFreezeScore: userDeptFreeze,
              },
            });
          }
        }).catch(() => { /* collapse detection is best-effort */ });
      }

      // ── Record score with L1-L5 breakdown for delta attribution ──────────────
      // This enables "why did your score change?" for returning Layoff Audit users.
      const bd = ensembleResult.breakdown;
      if (bd && state.oracleKey) {
        recordScore({
          roleKey: state.oracleKey,
          industryKey: companyData.industry || 'Technology',
          countryKey: d5CountryKey,
          experience: oracleExp,
          score: ensembleResult.score,
          timestamp: Date.now(),
          isGrounded: finalQuality === 'live',
          breakdown: { L1: bd.L1, L2: bd.L2, L3: bd.L3, L4: bd.L4, L5: bd.L5,
                       ...(bd.D6 != null ? { D6: bd.D6 } : {}),
                       ...(bd.D7 != null ? { D7: bd.D7 } : {}) },
          companyName: companyData.name,
          // v6.0 Fix 3: Store company snapshot so delta attribution can reference actual values
          companySnapshot: {
            stock90DayChange: companyData.stock90DayChange ?? null,
            revenueGrowthYoY: companyData.revenueGrowthYoY ?? null,
            layoffRounds: companyData.layoffRounds ?? 0,
            lastLayoffPercent: companyData.lastLayoffPercent ?? null,
            aiInvestmentSignal: companyData.aiInvestmentSignal ?? 'medium',
            employeeCount: companyData.employeeCount,
            revenuePerEmployee: companyData.revenuePerEmployee,
          },
        });
      }

      const modelCount = ensembleResult.modelsUsed?.length || 1;
      const liveAgents = ensembleResult.swarmReport?.liveAgentsUsed ?? 0;
      const swarmInfo = liveAgents > 0 ? ` · ${liveAgents} live signals` : "";
      dispatch({
        type: "SHOW_TOAST",
        payload: {
          message:
            modelCount >= 4
              ? `4-model ensemble · ${ensembleResult.confidencePercent}% confidence${swarmInfo}`
              : `Analysis complete · ${ensembleResult.confidence} confidence`,
          type: "success",
        },
      });

      // ── ENHANCEMENT: Server-side score sync for authenticated users ──────────
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.id && state.companyName && state.roleTitle) {
          // BUG-05 FIX: Use finalQuality (local const) not dataQuality state —
          // React state is async; dataQuality may be stale at this point in the closure.
          const allowCommunityShare = (() => {
            try { return localStorage.getItem('hp_community_share') === '1'; } catch { return false; }
          })();
          await supabase.from("layoff_scores").insert({
            user_id: session.user.id,
            company_name: state.companyName,
            role_title: state.roleTitle,
            department: state.department || "",
            score: ensembleResult.score,
            tier: ensembleResult.tier.label,
            tier_color: ensembleResult.tier.color,
            confidence: ensembleResult.confidence,
            breakdown: ensembleResult.breakdown,
            models_used: ensembleResult.modelsUsed,
            data_quality: finalQuality,
            calculated_at: new Date().toISOString(),
            allow_community_share: allowCommunityShare,
          });

          // Non-blocking score_history sync via scoreSyncService
          scoreSyncService.setUserId(session.user.id);
          scoreSyncService.syncFromLocal([{
            source: "layoff",
            score: ensembleResult.score,
            plot_score: ensembleResult.score,
            data_version: "v2",
            app_version: "2.0",
            metadata: {
              company: state.companyName,
              role: state.roleTitle,
              tier: ensembleResult.tier.label,
              dataQuality: finalQuality,
            },
          }]).catch(() => {});
        }
      } catch (syncError) {
        console.warn("[Layoff] Server score sync failed:", syncError);
      }

      // ── ARCHITECTURE: Persist result to sessionStorage for page-refresh recovery
      try {
        sessionStorage.setItem(
          "hp_last_score_session",
          JSON.stringify({
            result: enrichedResult,
            companyName: state.companyName,
            roleTitle: state.roleTitle,
            dataQuality: finalQuality,
            oracleResult: resolvedOracle ?? null,
            careerIntel: localIntel ?? null,
            ts: Date.now(),
          }),
        );
      } catch {
        /* quota exceeded — ignore */
      }
    } catch (e) {
      console.error(e);

      // ── HIERARCHICAL FALLBACK: Post-Generation Recovery ──────────────
      // If the cloud ensemble fails, we attempt a seamless fallback to the
      // local 2000+ company intelligence database before giving up.
      try {
        console.log("[AuditPipeline] Ensemble failed, attempting local DB fallback...");
        const fallbackCD = resolveCompanyData(state.companyName || "") || createUnknownCompanyFallback(state.companyName || "Unknown");
        const engineOnly = calculateLayoffScore({
          companyData: fallbackCD,
          roleTitle: state.roleTitle || "Unknown",
          department: state.department || "",
          userFactors: state.userFactors || { tenureYears: 3, isUniqueRole: false, performanceTier: "average", hasRecentPromotion: false, hasKeyRelationships: false }
        });

        const fallbackResult = {
          ...engineOnly,
          ensembleScore: engineOnly.score,
          engineScore: engineOnly.score,
          modelsUsed: [],
          isFallback: true,
          dataQuality: "fallback" as const
        };

        dispatch({ type: "SET_SCORE_RESULT", payload: fallbackResult });
        setDataQuality("fallback");
        setEnsembleStage(3);
        
        dispatch({
          type: "SHOW_TOAST",
          payload: {
            message: "Using local intelligence database fallback.",
            type: "success",
          },
        });
        return;
      } catch (fallbackError) {
        dispatch({
          type: "SHOW_TOAST",
          payload: {
            message: "Analysis failed — please try again.",
            type: "error",
          },
        });
      }
    } finally {
      // ── BUG FIX: ALWAYS reset isCalculating, success or failure ──────────
      dispatch({ type: "SET_CALCULATING", payload: false });
      isSubmitting.current = false;
    }
  };

  const handleSave = () => {
    if (state.scoreResult && state.companyName && state.roleTitle) {
      saveLayoffScore(
        state.scoreResult,
        state.companyName,
        state.roleTitle,
        state.department || "",
      );
      dispatch({ type: "INCREMENT_SAVE_COUNTER" });
      dispatch({
        type: "SHOW_TOAST",
        payload: { message: "Score saved to your history!", type: "success" },
      });
    }
  };

  const handleShare = () => {
    setShowShareCard(true);
  };

  const handleRetake = () => {
    dispatch({ type: "RESET" });
    setLastScoreInputs(null);
    isSubmitting.current = false;
  };

  const handleScenarioSimulate = (overrides: ScenarioOverrides) => {
    if (!lastScoreInputs) return null;
    return simulateScenario(lastScoreInputs, overrides);
  };

  return (
    <div className="layoff-calculator-wrapper" style={{ padding: "24px 0" }}>
      {!state.hasCompletedAssessment && !state.isCalculating && (
        <>
          <LayoffAlertBanner />
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h1
              style={{
                fontSize: "2.5rem",
                color: "#fff",
                marginBottom: "8px",
                fontWeight: 700,
              }}
            >
              Layoff Risk Estimator
            </h1>
            <p
              style={{
                color: "#9ba5b4",
                fontSize: "1.1rem",
                maxWidth: "480px",
                margin: "0 auto",
              }}
            >
              Know your layoff risk before it knows you. Powered by real company
              signals, role data, and market trends.
            </p>
          </div>
          <LayoffInputForm onNext={handleCalculate} />
        </>
      )}

      {scraperGateActive && (
        <LiveScraperGate
          company={state.companyName ?? ''}
          roleTitle={state.roleTitle ?? ''}
          onReady={() => {
            scraperGateResolveRef.current?.();
            scraperGateResolveRef.current = null;
          }}
        />
      )}

      {state.isCalculating && !scraperGateActive && (
        <SpyLoadingState
          stage={ensembleStage}
          companyName={state.companyName}
          roleTitle={state.roleTitle}
          agentCount={30}
        />
      )}

      {/* Cache-hit banner — shown when result is from 1h localStorage cache */}
      {state.hasCompletedAssessment &&
        state.scoreResult &&
        !state.isCalculating &&
        (state.scoreResult as any).fromCache && (
          <div className="max-w-4xl mx-auto px-4 mb-2">
            <CachedResultBanner
              cachedAt={(state.scoreResult as any).cachedAt}
              onForceRefresh={handleForceRefresh}
              isRefreshing={isForceRefreshing}
            />
          </div>
        )}

      {/* Breaking news banner — appears mid-session when injectLayoffEvent fires */}
      {state.hasCompletedAssessment && !state.isCalculating && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <BreakingNewsBanner
            currentCompanyName={state.companyName ?? null}
            onForceRefresh={handleForceRefresh}
            isRefreshing={isForceRefreshing}
          />
        </div>
      )}

      {/* Circuit-open banner — shown when live APIs are unavailable (circuit OPEN) */}
      {state.hasCompletedAssessment &&
        !state.isCalculating &&
        apiQuotaStatus &&
        Object.entries(apiQuotaStatus).some(([, s]) => s.state === 'OPEN') && (
          <div className="max-w-4xl mx-auto px-4 mb-3">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <span className="mt-0.5 text-base">⚠</span>
              <div>
                <span className="font-semibold text-amber-100">Live market data temporarily unavailable</span>
                <span className="ml-2 text-amber-300/80">
                  {Object.entries(apiQuotaStatus)
                    .filter(([, s]) => s.state === 'OPEN')
                    .map(([api, s]) =>
                      `${api}${s.cachedAgeLabel ? ` (cached ${s.cachedAgeLabel})` : ''}`
                    ).join(', ')} — showing cached intelligence. Resets automatically.
                </span>
              </div>
            </div>
          </div>
        )}

      {state.hasCompletedAssessment &&
        state.scoreResult &&
        !state.isCalculating && (() => {
          const hybridResult = mapToHybridResult(
            state.scoreResult,
            state.companyData || (state.scoreResult as any).companyData || { name: state.companyName || "Unknown", industry: "Technology", region: "GLOBAL", employeeCount: 500, isPublic: false, revenuePerEmployee: 150000, aiInvestmentSignal: "medium", source: "Fallback", lastUpdated: new Date().toISOString() },
            {
              roleTitle: state.roleTitle || "",
              department: state.department || "",
              tenureYears: state.userFactors?.tenureYears || 3,
              oracleKey: state.oracleKey,
              experience: deriveExperience(state.userFactors?.careerYears ?? state.userFactors?.tenureYears ?? 3)
            },
            dataQuality,
            liveSignalCount,
            heuristicSignalCount,
          );
          const companyDataFallback = state.companyData || (state.scoreResult as any).companyData || { name: state.companyName || "Unknown", industry: "Technology", region: "GLOBAL", employeeCount: 500, isPublic: false, revenuePerEmployee: 150000, aiInvestmentSignal: "medium", source: "Fallback", lastUpdated: new Date().toISOString() };
          const commonProps = { result: hybridResult, companyData: companyDataFallback, onRetake: handleRetake };
          return isTabsV3Enabled()
            ? <LayoffAuditDashboardV3 {...commonProps} />
            : <LayoffAuditDashboard {...commonProps} />;
        })()}

      {showShareCard && state.scoreResult && (
        <LayoffShareCard
          score={(state.scoreResult as any).score ?? (state.scoreResult as any).total}
          tier={state.scoreResult.tier}
          companyName={state.companyName || "Unknown"}
          roleTitle={state.roleTitle || "Unknown"}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {state.showToast && (
        <Toast
          message={state.showToast.message}
          type={state.showToast.type}
          onClose={() => dispatch({ type: "HIDE_TOAST" })}
        />
      )}
    </div>
  );
};
