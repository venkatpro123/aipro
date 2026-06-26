import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { getEffectiveCommunityShare } from "../../services/gdprService";
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
import { LayoffAuditDashboardV3, isTabsV3Enabled } from "../AuditTabs/v3/LayoffAuditDashboardV3";
// P1: V4 (3-tab orchestrator-led shell) is now flag-gated via uiFlags.getDashboardVariant().
// Lazy-loaded so the V4 chunk only downloads when the flag resolves 'v4' — V3 stays the
// default and its bundle is unchanged when the flag is off.
const LayoffAuditDashboardV4 = lazy(() =>
  import("../AuditTabs/v4/LayoffAuditDashboardV4").then((m) => ({ default: m.LayoffAuditDashboardV4 })),
);
import { getDashboardVariant } from "../../config/uiFlags";
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
import { useAdaptivePerformance } from "../../hooks/useAdaptivePerformance";
import { supabase } from "../../utils/supabase";
// WS11 + WS14 — every edge invocation carries the per-audit request_id
// via x-request-id. runAudit mints a fresh id at the entry point so
// all invokeEdgeFunction calls inside the pipeline reach the same trace.
import { invokeEdgeFunction, runAudit } from "../../infrastructure/requestId";
import { scoreSyncService } from "../../services/scoreSyncService";
import {
  getCareerIntelligence,
  CareerIntelligence,
} from "../../data/intelligence/index";
import { getAutoDeducedDepartment } from "../../data/oracleRoleIndex";
import { countryCodeToD5Key } from "../../data/companyDatabase";
import { injectLayoffEvent } from "../../data/layoffNewsCache";
import { recordScore, buildL4SnapshotFields } from "../../services/scoreDeltaService";
import { detectCollapseStage, getCollapseStagePrecision } from "../../services/collapsePredictor";
import { PipelineTimer } from "../../services/pipelineTimer";
import { CachedResultBanner } from "./CachedResultBanner";
import { BreakingNewsBanner } from "./BreakingNewsBanner";
import { useBreakingNewsPoller } from "../../hooks/useBreakingNewsPoller";
import { getApiQuotaStatus, ApiQuotaStatus, CircuitApiName, CIRCUIT_API_LABELS, resetAllOpenCircuits } from "../../services/apiCircuitBreaker";
// WS0 — shadow runner gates legacy-vs-candidate engine comparison behind
// `ws0_shadow_runner` flag. Internally invokes auditDataPipeline.fetchAuditData
// when the flag is off, so downstream consumers see the legacy shape.
import { runWithShadow } from "../../services/engineShadowRunner";
// WS7 — server-authoritative score trajectory. Falls through when
// `ws7_server_score_trajectory` flag is off.
import { appendScoreEntry } from "../../services/serverScoreTrajectory";
// DEBT-10 — per-user token-bucket rate limit on audit submissions.
import { consumeToken } from "../../infrastructure/rateLimiter";
import { toast } from "sonner";
import { startBackgroundRefresh } from "../../services/liveRefreshService";
import { resolveRoleInput } from "../../services/roleResolution";
// Wave 3.1 + 3.3 — Emotional OS reveal + celebration components
import { AuditRevealScreen } from "../AuditReveal/AuditRevealScreen";
import { ScoreImprovementCelebration } from "../AuditReveal/ScoreImprovementCelebration";
import { WhatChangedCard } from "../AuditReveal/WhatChangedCard";
import { LiveSignalStatusBanner } from "../audit/LiveSignalStatusBanner";
import { HybridResult } from "../../types/hybridResult";
import { useHumanProof } from "../../context/HumanProofContext";
import {
  ProgressiveQuorumPanel,
  type QuorumState,
  type QuorumStatus,
  type QuorumCompanyData,
  buildLimitedDataBanner,
} from "./ProgressiveQuorumPanel";
import { hydrateSwarmCache } from "../../services/swarm/swarmCache";

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
        return { bg: "rgba(16,185,129,0.95)", Icon: CheckCircle2 };
      case "error":
        return { bg: "rgba(239,68,68,0.95)", Icon: XCircle };
      case "warning":
        return { bg: "rgba(245,158,11,0.95)", Icon: AlertTriangle };
      case "info":
        return { bg: "rgba(59,130,246,0.95)", Icon: Info };
    }
  };
  const { bg, Icon } = getStyle();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 10000,
        background: bg,
        color: "var(--text)",
        padding: "12px 20px",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        animation: "fadeIn 0.3s ease-in",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <Icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} /> {message}
    </div>
  );
};

// Derives the user's job-market region for the ms:: market-specific cache key.
// Priority: localCurrencyCode (explicit user setting) → metroArea slug → metro slug → company region.
// This ensures a Bengaluru Microsoft SDE gets ms::microsoft::sw_backend::IN (India hiring data)
// rather than ms::microsoft::sw_backend::US (SF counts, USD salaries).
const CURRENCY_TO_REGION: Record<string, string> = {
  INR: 'IN', USD: 'US', GBP: 'GB', SGD: 'SG', EUR: 'EU',
  PHP: 'PH', AED: 'AE', SAR: 'SA', MYR: 'MY', HKD: 'HK',
  AUD: 'AU', CAD: 'CA', JPY: 'JP', KRW: 'KR', BRL: 'BR',
  MXN: 'MX', NZD: 'NZ', CHF: 'CH', ZAR: 'ZA', NGN: 'NG',
};
const METRO_TO_REGION: Record<string, string> = {
  bangalore: 'IN', bengaluru: 'IN', mumbai: 'IN', delhi: 'IN', hyderabad: 'IN',
  chennai: 'IN', pune: 'IN', kolkata: 'IN', ahmedabad: 'IN', noida: 'IN', gurgaon: 'IN',
  san_francisco: 'US', new_york: 'US', seattle: 'US', austin: 'US', chicago: 'US',
  boston: 'US', los_angeles: 'US', denver: 'US', dallas: 'US', atlanta: 'US',
  london: 'GB', manchester: 'GB', berlin: 'DE', munich: 'DE', frankfurt: 'DE',
  singapore: 'SG', sydney: 'AU', melbourne: 'AU', toronto: 'CA', vancouver: 'CA',
  dubai: 'AE', manila: 'PH', kuala_lumpur: 'MY', hong_kong: 'HK',
  tokyo: 'JP', seoul: 'KR', sao_paulo: 'BR', mexico_city: 'MX',
};

function resolveUserMarketRegion(
  profile: { localCurrencyCode?: string | null; metroArea?: string | null; metro?: string | null } | null,
  companyRegion: string | null | undefined,
): string | undefined {
  if (profile?.localCurrencyCode) {
    const r = CURRENCY_TO_REGION[profile.localCurrencyCode];
    if (r) return r;
  }
  const metroSlug = (profile?.metroArea ?? profile?.metro ?? '').toLowerCase().replace(/[\s-]/g, '_');
  if (metroSlug) {
    const r = METRO_TO_REGION[metroSlug];
    if (r) return r;
  }
  return companyRegion ?? undefined;
}

export const LayoffCalculator: React.FC<Props> = ({ onSwitchTab }) => {
  const { state, dispatch } = useLayoff();
  const { userProfile, profileVersion } = useHumanProof();
  // Wave 9.4: detect slow connections / low-end devices to reduce animation cost
  const perf = useAdaptivePerformance();
  // v39.0 A4 — track the profileVersion observed at the time of the latest
  // audit. When the live `profileVersion` exceeds this, the profile has
  // changed since the last audit and we should refresh.
  const lastAuditedProfileVersionRef = React.useRef<number | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [lastScoreInputs, setLastScoreInputs] = useState<ScoreInputs | null>(
    null,
  );
  // 0=idle, 1=engine+agents running, 2=gemini synthesizing, 3=done
  const [ensembleStage, setEnsembleStage] = useState(0);

  // ── Progressive quorum disclosure ──────────────────────────────────────────
  // Tracks which data quorum classes have resolved during calculation.
  // financial + layoff resolve when company data loads (~10s).
  // hiring resolves when the swarm completes (~20-30s).
  // ProgressiveQuorumPanel renders partial cards as each class settles,
  // eliminating the blank 45-second wait for private companies.
  const QUORUM_IDLE: QuorumState = {
    financial: 'pending', layoff: 'pending', hiring: 'pending',
    companyData: undefined, limitedDataBanner: null,
  };
  const [quorumState, setQuorumState] = useState<QuorumState>(QUORUM_IDLE);
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

  // ── Wave 3.1: Audit reveal state ──────────────────────────────────────────
  // revealActive = true when a fresh audit completes and the reveal screen
  // should be shown before the dashboard. Immediately false on skip/complete.
  const [revealActive, setRevealActive] = useState(false);
  // Wave 3.3: Score improvement celebration
  const [celebrationState, setCelebrationState] = useState<{
    previousScore: number;
    currentScore: number;
  } | null>(null);
  // Wave 6.6: What changed card state
  const [whatChangedState, setWhatChangedState] = useState<{
    previousScore: number;
    currentScore: number;
    daysSinceLastAudit: number;
  } | null>(null);

  // ── BUG FIX: Double-submit guard ─────────────────────────────────────────
  const isSubmitting = useRef(false);

  // ── Section 13.2: always-current scoreRequestId ref ──────────────────────
  // The background refresh callback closes over this ref rather than over
  // state.scoreRequestId directly. This avoids the stale-closure problem:
  // the ref is updated on every render via the effect below, so the callback
  // always sees the scoreRequestId that was live when it fires — not the
  // value captured when the effect was first set up.
  const scoreRequestIdRef = useRef<number>(state.scoreRequestId ?? 0);
  useEffect(() => {
    scoreRequestIdRef.current = state.scoreRequestId ?? 0;
  }, [state.scoreRequestId]);

  // ── Force-refresh state — set by CachedResultBanner "Recalculate" button ──
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [apiQuotaStatus, setApiQuotaStatus] = useState<Record<CircuitApiName, ApiQuotaStatus> | null>(null);

  // ── Live Scraper Gate — shown on first audit when company data is stale ────
  // The gate triggers live scraping, polls for completion, then calls the
  // resolve function so handleCalculate continues into the audit pipeline.
  const [scraperGateActive, setScraperGateActive] = useState(false);
  const scraperGateResolveRef = useRef<(() => void) | null>(null);

  // ── Dashboard-open RSS poll ──────────────────────────────────────────────
  // When the user opens a dashboard (hasCompletedAssessment=true), this hook
  // polls the three breaking-news feeds for the current company. Per-company
  // 15-min throttle means switching companies always polls the new one.
  // onBreakingNewsMatched fires only for the currently displayed company.
  const { forcePoll: forceBreakingNewsPoll } = useBreakingNewsPoller(
    state.hasCompletedAssessment ? (state.companyName ?? null) : null,
    {
      onBreakingNewsMatched: () => {
        // The BreakingNewsBanner subscribes to onNewLayoffEvent() and will
        // appear automatically when injectLayoffEvent() is called by the poller.
        // No explicit state update needed here — the banner renders itself.
      },
    },
  );
  // Expose forcePoll on the force-refresh handler so the "Recalculate" button
  // in the banner also triggers a fresh RSS poll before re-running the audit.
  const handleForceBreakingNewsPoll = forceBreakingNewsPoll;

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
    // Use faster refresh cadence for unknown companies — their only non-heuristic
    // signals come from live scraping, so retrying sooner improves accuracy.
    const isUnknownCo = (state.scoreResult as any)?._liveDataCoverage?.overallSource === 'heuristic'
      || ((state.companyData as any)?.source ?? '').includes('Fallback');

    // Section 13.2: capture scoreRequestId at the moment this refresh session
    // starts (i.e. when this effect runs). Each result the service delivers will
    // carry this same capturedId. The callback compares it against the always-
    // current scoreRequestIdRef; if they differ, a new calculation has started
    // since this refresh was initiated and the result is stale.
    const capturedId = scoreRequestIdRef.current;
    const initialScore = typeof (state.scoreResult as any)?.total === 'number'
      ? (state.scoreResult as any).total as number
      : undefined;
    const cancel = startBackgroundRefresh(inputs, (fresh) => {
      if (fresh.requestId !== scoreRequestIdRef.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[BackgroundRefresh] Discarding stale result', {
            resultRequestId: fresh.requestId,
            currentRequestId: scoreRequestIdRef.current,
          });
        }
        return;
      }
      dispatch({ type: 'SET_SCORE_RESULT', payload: fresh.result });
      setApiQuotaStatus(getApiQuotaStatus());
    }, isUnknownCo, capturedId, initialScore);
    return cancel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasCompletedAssessment, state.companyName, state.roleTitle]);

  const handleForceRefresh = async () => {
    setIsForceRefreshing(true);
    // Force a fresh RSS poll before re-running the audit so the breaking-news
    // event that triggered this recalculation is reflected in the new score.
    handleForceBreakingNewsPoll();
    try {
      await handleCalculate(true);
    } finally {
      setIsForceRefreshing(false);
    }
  };

  // v39.0 A4 — Profile-save → re-audit trigger.
  // When the user updates their profile (visa, runway, dependents, region)
  // in `ProfileSetupModal`, the context bumps `profileVersion`. We retrigger
  // the audit IFF an audit has already completed, the user-factors-bearing
  // inputs are still present, and the modal is closed. Without this,
  // profile changes silently failed to update the dashboard.
  React.useEffect(() => {
    if (lastAuditedProfileVersionRef.current === null) {
      // First mount — record the version observed at the time of the next
      // audit (set inside handleCalculate / runAuditPipelineDrivenCalculation).
      lastAuditedProfileVersionRef.current = profileVersion;
      return;
    }
    if (
      profileVersion > lastAuditedProfileVersionRef.current &&
      state.hasCompletedAssessment &&
      !state.isCalculating &&
      state.companyName &&
      state.roleTitle
    ) {
      lastAuditedProfileVersionRef.current = profileVersion;
      // Force a fresh fetch so the new profile signal is reflected in
      // personalRiskAdjuster, careerContingencyPlan, scenarioPlan, etc.
      void handleCalculate(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVersion]);

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
    const _baseUserFactors =
      state.userFactors || {
        tenureYears: 1.5,
        careerYears: 1.5,
        isUniqueRole: false,
        // Seed from UserProfile so returning users don't reset to "average" each session.
        // LayoffInputForm state takes priority once the form has been submitted.
        performanceTier: (userProfile?.performanceTier ?? "average") as "top" | "average" | "below" | "unknown",
        hasRecentPromotion: false,
        hasKeyRelationships: false,
      };
    // Merge profile fields captured by ProfileQuickCapture (visa, runway, dependents)
    // and any other saved profile data into userFactors so the pipeline has them.
    // Form-submitted values in _baseUserFactors take priority over profile defaults;
    // profile fields only fill slots that the form left empty (undefined / falsy).
    const userFactors = {
      ..._baseUserFactors,
      ...(userProfile?.yearsExperience != null     ? { careerYears:          userProfile.yearsExperience }     : {}),
      ...(userProfile?.visaStatus          != null && !((_baseUserFactors as any).visaStatus)
                                                   ? { visaStatus:           userProfile.visaStatus as any }           : {}),
      ...(userProfile?.savingsMonthsRunway != null && !((_baseUserFactors as any).financialRunwayMonths)
                                                   ? { financialRunwayMonths: userProfile.savingsMonthsRunway } : {}),
      ...(userProfile?.hasDependents       != null && !((_baseUserFactors as any).hasDependents != null)
                                                   ? { hasDependents:        userProfile.hasDependents }        : {}),
      // Preparedness-specific fields: priorJobChanges and priorLayoffSurvived live
      // in UserProfile but were never merged into userFactors, so the preparedness
      // engine always saw null for both — Career Clarity and Market Positioning
      // pillars lost these signals for every user.
      ...(userProfile?.priorJobChanges   != null && !((_baseUserFactors as any).priorJobChanges != null)
                                                   ? { priorJobChanges:      userProfile.priorJobChanges }      : {}),
      ...(userProfile?.priorLayoffSurvived != null && !((_baseUserFactors as any).priorLayoffSurvived != null)
                                                   ? { priorLayoffSurvived:  userProfile.priorLayoffSurvived }  : {}),
      // savingsMonthsRunway is the profile field name; pipeline reads it as-is
      // (distinct from financialRunwayMonths which is the form field name above).
      ...(userProfile?.savingsMonthsRunway != null && !((_baseUserFactors as any).savingsMonthsRunway != null)
                                                   ? { savingsMonthsRunway:  userProfile.savingsMonthsRunway }  : {}),
      // Skill portfolio fields: selfRatedSkills and targetSkills were stored in
      // UserProfile but never merged into userFactors. The skillPortfolioFit engine
      // read uf14.userSkills (non-existent) and always got [] — falling back to the
      // generic "add your skills" placeholder for every user. The skillGapIntelligence
      // engine also checked uf17.selfRatedSkills which was always undefined.
      ...(userProfile?.selfRatedSkills?.length && !((_baseUserFactors as any).selfRatedSkills?.length)
                                                   ? { selfRatedSkills:      userProfile.selfRatedSkills }       : {}),
      ...(userProfile?.targetSkills?.length    && !((_baseUserFactors as any).targetSkills?.length)
                                                   ? { targetSkills:         userProfile.targetSkills }          : {}),
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

    // WS0 — Resolve user id non-blockingly for the shadow runner. The runner
    // writes an audit_shadow_comparison row when ws0_shadow_runner is in
    // shadow/canary/production mode; user_id is used solely for RLS scoping
    // (anonymous audits write user_id=NULL and rely on service_role reads).
    let shadowUserId: string | null = null;
    try {
      const { data: { session: shadowSession } } = await supabase.auth.getSession();
      shadowUserId = shadowSession?.user?.id ?? null;
    } catch {
      // Ignore — anonymous flow still proceeds via legacy passthrough.
    }

    // DEBT-10 — Rate-limit gate.
    //
    // Token-bucket per (audit bucket, user). Anonymous sessions use a
    // stable browser-local anon id so a single misbehaving tab cannot
    // burn through the shared pool. Authenticated users get full
    // capacity per the policy in rate_limit_policies.
    //
    // On rejection we show a toast with the retry hint and abort the
    // submission BEFORE running the heavy pipeline.
    const rateLimitSubject =
      shadowUserId ??
      (() => {
        try {
          let anon = localStorage.getItem('hp_anon_id');
          if (!anon) {
            anon = `anon_${Math.random().toString(36).slice(2, 12)}`;
            localStorage.setItem('hp_anon_id', anon);
          }
          return anon;
        } catch {
          return 'anon_fallback';
        }
      })();
    const rateResult = await consumeToken('audit', rateLimitSubject);
    if (!rateResult.allowed) {
      const wait = Math.max(1, Math.ceil(rateResult.retryAfterMs / 1000));
      toast.warning('Too many audits', {
        description: `Please wait ${wait}s before submitting again.`,
        duration: 6000,
      });
      setEnsembleStage(0);
      return;
    }

    const shadowRun = await runWithShadow(
      {
        companyName: state.companyName || "Unknown",
        roleTitle,
        department: effectiveDepartment,
        userFactors,
        oracleKey: effectiveOracleKey ?? undefined,
        financialRunwayMonths: (userFactors as any).financialRunwayMonths ?? 0,
      },
      { userId: shadowUserId },
    );

    const pipelineResult = shadowRun.userFacingResult;
    const companyData = shadowRun.companyData;
    const source = shadowRun.source;

    dispatch({ type: "SET_COMPANY_DATA", payload: companyData });
    setLiveSignalCount(pipelineResult.signalQuality.liveSignals ?? 0);
    setHeuristicSignalCount(pipelineResult.signalQuality.heuristicSignals ?? 0);

    // ── Progressive quorum: fire financial + layoff as soon as company data lands ──
    {
      const qcd: QuorumCompanyData = companyData as QuorumCompanyData;
      const hasFinancial = qcd.revenueGrowthYoY != null || qcd.stock90DayChange != null;
      const financialStatus: QuorumStatus = !qcd.isPublic ? 'unavailable' : 'resolved';
      const layoffStatus: QuorumStatus = !qcd.isPublic && (qcd.layoffRounds ?? 0) === 0 && (qcd.layoffsLast24Months?.length ?? 0) === 0 ? 'unavailable' : 'resolved';
      setQuorumState({
        financial: hasFinancial ? 'resolved' : financialStatus,
        layoff:    layoffStatus,
        hiring:    'pending',
        companyData: qcd,
        limitedDataBanner: buildLimitedDataBanner(qcd),
      });
    }

    // ── Swarm cache hydration — fire immediately when company data lands ─────
    // hydrateSwarmCache() queries swarm_warm_cache (populated by the Monday
    // 05:00 UTC warm-swarm-cache EF) and writes the pre-computed SwarmReport
    // into localStorage. When runSwarmLayer() checks getSwarmCache() ~10s
    // later, it gets a cache hit and skips all 30 agents — 4-5× speedup for
    // top-100 combos. Non-blocking: we await it just before the ensemble call.
    const swarmHydratePromise = hydrateSwarmCache(
      companyData.name,
      roleTitle,
      effectiveDepartment,
    );

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

    // Await hydration before the ensemble starts — it almost certainly resolved
    // during the Oracle + session-cache setup above (~100ms Supabase SELECT vs
    // the ~2-3s of other setup work). Never throws (safe fallback in hydrateSwarmCache).
    await swarmHydratePromise;

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
      knowledgeType: (userFactors as any).knowledgeType,
      performanceTier: userFactors.performanceTier,
      hasRecentPromotion: userFactors.hasRecentPromotion,
      hasKeyRelationships: userFactors.hasKeyRelationships,
      region: resolveUserMarketRegion(userProfile, companyData.region),
      forceRefresh,
      onSwarmComplete: () => {
        swarmDone = true;
        setEnsembleStage(2);
        // Progressive quorum: hiring signal resolves when swarm completes
        setQuorumState(prev => ({
          ...prev,
          hiring: 'resolved',
          companyData: prev.companyData
            ? { ...prev.companyData, ...(companyData as QuorumCompanyData) }
            : (companyData as QuorumCompanyData),
        }));
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

    // BUG-08: allSettled — a failed oracle lookup must not abort the shadow ensemble result.
    const [oracleSettled, shadowSettled] = await Promise.allSettled([
      oraclePromise,
      shadowPromise,
    ]);
    const resolvedOracle  = oracleSettled.status  === 'fulfilled' ? oracleSettled.value  : null;
    const shadowEnsemble  = shadowSettled.status  === 'fulfilled' ? shadowSettled.value  : null;
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
      resolvedPattern:           (shadowEnsemble as any)?.resolvedPattern           ?? pipelineResult.resolvedPattern,
      patternMatchOverlapScore:  (shadowEnsemble as any)?.patternMatchOverlapScore  ?? pipelineResult.patternMatchOverlapScore,
      agentStatus: (shadowEnsemble as any)?.agentStatus ?? pipelineResult.agentStatus,
      meta: {
        ...pipelineResult.meta,
        calculationMode: `${pipelineResult.meta?.calculationMode ?? "CONSENSUS_HYBRID"}+UI_PIPELINE`,
      },
    };

    dispatch({ type: "SET_SCORE_RESULT", payload: mergedResult });

    // ── Wave 3.1 + 3.3: Reveal and celebration logic ─────────────────────
    {
      const newScore = mergedResult.total ?? 0;
      // Check for previous score in sessionStorage (before this audit)
      let prevScore: number | null = null;
      let prevTs: number | null = null;
      try {
        const raw = sessionStorage.getItem("hp_last_score_session");
        if (raw) {
          const prev = JSON.parse(raw);
          if (prev?.result?.total != null && prev?.ts != null) {
            prevScore = prev.result.total;
            prevTs = prev.ts;
          }
        }
      } catch { /* ignore */ }

      const isFirstAudit = prevScore === null;
      const daysSince = prevTs ? Math.round((Date.now() - prevTs) / 86400000) : 0;

      if (isFirstAudit) {
        // First audit: show reveal screen (skip if revealSeen already set in this session)
        const alreadySeen = sessionStorage.getItem("hp_reveal_seen");
        if (!alreadySeen) {
          setRevealActive(true);
          sessionStorage.setItem("hp_reveal_seen", "1");
        }
      } else if (prevScore != null) {
        // Re-audit: show what changed card
        setWhatChangedState({ previousScore: prevScore, currentScore: newScore, daysSinceLastAudit: daysSince });
        // Celebrate meaningful improvement (≥ 3 pts better)
        if (prevScore - newScore >= 3) {
          setCelebrationState({ previousScore: prevScore, currentScore: newScore });
        }
      }
    }

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
      }).then(async report => {
        if (report.stage || (report.departmentRisks && report.departmentRisks.length > 0)) {
          // GAP-A04: fetch empirical precision for the detected stage (best-effort)
          const precData = report.stage
            ? await getCollapseStagePrecision(report.stage).catch(() => null)
            : null;

          dispatch({
            type: "SET_SCORE_RESULT",
            payload: {
              ...mergedResult,
              ...(report.stage ? { collapseStage: report.stage } : {}),
              departmentFreezeScore: report.userDepartmentFreezeScore ?? null,
              collapseStageConfidence: report.stage ? report.signalConfidence : null,
              collapsePrecisionStatus: report.stage ? 'uncalibrated_placeholder' : undefined,
              ...(report.stage && precData ? {
                collapsePredictor: {
                  stage: report.stage,
                  stageConfidence: report.signalConfidence,
                  stagePrecision: precData.precision,
                  stageBasedOnNEvents: precData.nEvents,
                  stagePrecisionLabel: precData.precisionLabel,
                  stageFprLabel: precData.fprLabel,
                  stageHorizonDays: precData.horizonDays,
                  stageGateStatus: precData.gateStatus,
                },
              } : {}),
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
        stock90DayChange:  companyData.stock90DayChange ?? null,
        revenueGrowthYoY:  companyData.revenueGrowthYoY ?? null,
        layoffRounds:      companyData.layoffRounds ?? 0,
        lastLayoffPercent: companyData.lastLayoffPercent ?? null,
        // Most recent confirmed layoff date — used by L2 attribution recency weight
        lastLayoffDate:    companyData.layoffsLast24Months?.[0]?.date ?? null,
        aiInvestmentSignal: companyData.aiInvestmentSignal ?? "medium",
        employeeCount:     companyData.employeeCount,
        revenuePerEmployee: companyData.revenuePerEmployee,
        // v40.0 — L4 attribution: parent / GCC / peer-contagion specifics
        // so explainDimensionDelta produces spec-exact driver text instead
        // of generic "sector headwinds worsened".
        ...buildL4SnapshotFields(mergedResult as any),
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
        const allowCommunityShare = getEffectiveCommunityShare();
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
          // Snapshot of company signals at scoring time — required for server-side
          // delta attribution on multi-device users (localStorage doesn't travel).
          company_snapshot: {
            stock90DayChange:   companyData.stock90DayChange ?? null,
            revenueGrowthYoY:   companyData.revenueGrowthYoY ?? null,
            layoffRounds:       companyData.layoffRounds ?? 0,
            lastLayoffPercent:  companyData.lastLayoffPercent ?? null,
            lastLayoffDate:     companyData.layoffsLast24Months?.[0]?.date ?? null,
            aiInvestmentSignal: companyData.aiInvestmentSignal ?? 'medium',
          },
        });

        // WS7 — Server-authoritative score trajectory (Audit Issue #13).
        //
        // Persists this audit to the score_trajectory table so the trajectory
        // engine can compute direction signals from a stable, device-
        // independent history. Gated by `ws7_server_score_trajectory`;
        // appendScoreEntry returns early when the flag is off, so the
        // legacy localStorage path runs unchanged.
        void appendScoreEntry({
          userId: session.user.id,
          companyCanonicalName: (companyData as { canonicalName?: string }).canonicalName ?? companyData.name ?? state.companyName,
          auditSessionId: null,
          score: mergedResult.total,
          tier: mergedResult.tier.label,
          confidencePct: mergedResult.confidencePercent ?? null,
          cohort: ((mergedResult as unknown) as { cohortClassification?: { primaryCohort?: string } }).cohortClassification?.primaryCohort ?? null,
          archetype: ((mergedResult as unknown) as { archetype?: string }).archetype ?? null,
          engineVersion: 'v35.0',
          inputs: {
            roleTitle: state.roleTitle ?? '',
            department: effectiveDepartment ?? '',
            country: (userFactors as { country?: string }).country ?? '',
          },
        }).catch(() => {
          // Trajectory append is non-blocking — its failure must not affect audit UX.
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

    // ── Section 13.2: mint a new scoreRequestId for this calculation ───────
    // Any background refresh result that captured an older scoreRequestId will
    // be rejected when its callback fires. The synchronous ref increment ensures
    // the check in the background refresh callback sees the new ID immediately,
    // even before the React state update from BUMP_SCORE_REQUEST_ID propagates.
    dispatch({ type: 'BUMP_SCORE_REQUEST_ID' });
    scoreRequestIdRef.current += 1;

    // ── Live Scraper Gate ──────────────────────────────────────────────────
    // On first-run (not forceRefresh), check whether this company was scraped
    // recently. If not, trigger the scraper and show the gate UI — the audit
    // pipeline only starts once the gate calls onReady (jobs done or timeout).
    // This guarantees the first result is based on live data, not stale cache.
    const company = (state.companyName ?? '').trim();
    if (!forceRefresh && company.length >= 2) {
      const isFresh = await checkDataFreshness(company).catch(() => false);
      if (!isFresh) {
        // v32: trigger scraper with audit_blocking priority so the Fly.io
        // workers jump the BullMQ queue (priority=1) and use 5-attempt/3s-backoff
        // retries. Without this flag, audit-time scrapes share a queue with
        // 10-min cron polls and inherit 60s backoffs — burning the 45s budget.
        void triggerScraperForCompany(company, { priority: 'audit_blocking' }).then(r => {
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
    setQuorumState(QUORUM_IDLE);
    setDataQuality("live");
    setOracleResult(null);
    setCareerIntelligence(null);

    // BUG-C4 FIX: Track data quality locally through each OSINT branch then
    // refine after ensemble resolves — avoids stale React async state closure.
    let computedQuality: "live" | "partial" | "fallback" = "fallback";

    try {
      try {
        // WS14 — wrap the pipeline execution in runAudit so every edge
        // function call inside (fetch-company-data, compute-oracle,
        // calculate-hybrid-risk, proxy-live-signals, …) sees the same
        // request_id via currentRequestId() → invokeEdgeFunction →
        // x-request-id header → edge withRun → pipeline_runs.
        await runAudit('user-calculate', async () => {
          await runAuditPipelineDrivenCalculation(forceRefresh);
        });
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

        // WS11 — request_id propagation via invokeEdgeFunction wrapper.
        // Response shape is wide and partially undocumented (legacy EF
        // returns data + source + dataFreshness + …) — `any` matches the
        // legacy `supabase.functions.invoke()` ergonomics.
        const { data, error } = await invokeEdgeFunction<any>(
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
              if (import.meta.env.DEV) console.log(`[LayoffCalc] Supabase HIT: "${resolved.name}" (ratio=${matchResult.matchRatio.toFixed(2)}, exact=${matchResult.isExactMatch})`);

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
        // BUG-08: allSettled — a slow role_exposure_data query must not abort industry data.
        const [indSettled, roleSettled] = await Promise.allSettled([
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
        const indRes  = indSettled.status  === 'fulfilled' ? indSettled.value  : { data: null, error: null };
        const roleRes = roleSettled.status === 'fulfilled' ? roleSettled.value : { data: null, error: null };

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
        userFactors: (() => {
          const base = state.userFactors || {
            tenureYears: 1.5,
            isUniqueRole: false,
            performanceTier: (userProfile?.performanceTier ?? "average") as "top" | "average" | "below" | "unknown",
            hasRecentPromotion: false,
            hasKeyRelationships: false,
          };
          // Merge profile fields (visa, runway, dependents) captured by
          // ProfileQuickCapture. Form values in `base` take priority; profile
          // fields only fill slots the form left empty.
          return {
            ...base,
            ...(userProfile?.yearsExperience != null      ? { careerYears:           userProfile.yearsExperience }     : {}),
            ...(userProfile?.visaStatus          != null && !((base as any).visaStatus)
                                                          ? { visaStatus:            userProfile.visaStatus as any }           : {}),
            ...(userProfile?.savingsMonthsRunway != null && !((base as any).financialRunwayMonths)
                                                          ? { financialRunwayMonths: userProfile.savingsMonthsRunway }  : {}),
            ...(userProfile?.hasDependents       != null && !((base as any).hasDependents != null)
                                                          ? { hasDependents:         userProfile.hasDependents }        : {}),
            ...(userProfile?.priorJobChanges   != null && !((base as any).priorJobChanges != null)
                                                          ? { priorJobChanges:       userProfile.priorJobChanges }      : {}),
            ...(userProfile?.priorLayoffSurvived != null && !((base as any).priorLayoffSurvived != null)
                                                          ? { priorLayoffSurvived:   userProfile.priorLayoffSurvived }  : {}),
            ...(userProfile?.savingsMonthsRunway != null && !((base as any).savingsMonthsRunway != null)
                                                          ? { savingsMonthsRunway:   userProfile.savingsMonthsRunway }  : {}),
            ...(userProfile?.selfRatedSkills?.length && !((base as any).selfRatedSkills?.length)
                                                          ? { selfRatedSkills:       userProfile.selfRatedSkills }      : {}),
            ...(userProfile?.targetSkills?.length    && !((base as any).targetSkills?.length)
                                                          ? { targetSkills:          userProfile.targetSkills }         : {}),
          };
        })(),
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

      // ── Progressive quorum: fire financial + layoff once companyData is known ──
      {
        const qcd: QuorumCompanyData = companyData as QuorumCompanyData;
        const hasFinancial = qcd.revenueGrowthYoY != null || qcd.stock90DayChange != null;
        const financialStatus: QuorumStatus = !qcd.isPublic ? 'unavailable' : 'resolved';
        const layoffStatus: QuorumStatus =
          !qcd.isPublic && (qcd.layoffRounds ?? 0) === 0 && (qcd.layoffsLast24Months?.length ?? 0) === 0
            ? 'unavailable'
            : 'resolved';
        setQuorumState({
          financial: hasFinancial ? 'resolved' : financialStatus,
          layoff: layoffStatus,
          hiring: 'pending',
          companyData: qcd,
          limitedDataBanner: buildLimitedDataBanner(qcd),
        });
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
            // WS11 — request_id propagation via invokeEdgeFunction.
            // OracleResult body shape — typed as `any` to match the
            // legacy ergonomics; downstream cast to OracleResult.
            return invokeEdgeFunction<any>('compute-oracle', { body: oracleBody })
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
        knowledgeType: (inputs.userFactors as any).knowledgeType,
        performanceTier: inputs.userFactors.performanceTier,
        hasRecentPromotion: inputs.userFactors.hasRecentPromotion,
        hasKeyRelationships: inputs.userFactors.hasKeyRelationships,
        roleExposureOverride: fetchedRoleExposure,
        region: resolveUserMarketRegion(userProfile, companyData.region),
        _timer: _calcTimer,
        forceRefresh,
        onSwarmComplete: () => {
          swarmDone = true;
          setEnsembleStage(2);
          // Progressive quorum: hiring signal resolves when swarm completes
          setQuorumState(prev => ({
            ...prev,
            hiring: 'resolved',
            companyData: prev.companyData
              ? { ...prev.companyData, ...(companyData as QuorumCompanyData) }
              : (companyData as QuorumCompanyData),
          }));
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
        // BUG-08: allSettled — an oracle failure must not abort the ensemble result.
        // The outer catch still handles ensemble failure → deterministic engine fallback.
        const [ensembleSettled, oracleSettled2] = await Promise.allSettled([
          analysisPromise,
          oraclePromise,
        ]);
        ensembleResult = ensembleSettled.status === 'fulfilled' ? ensembleSettled.value : (() => { throw ensembleSettled.reason; })();
        resolvedOracle = oracleSettled2.status  === 'fulfilled' ? oracleSettled2.value  : null;
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
                // GAP-A04: forward internal signal quality + precision status
                collapseStageConfidence: report.stage ? report.signalConfidence : null,
                collapsePrecisionStatus: report.stage ? 'uncalibrated_placeholder' : undefined,
              },
            });
          }
        }).catch(() => { /* collapse detection is best-effort */ });
      }

      // ── Record score with L1-L5 breakdown for delta attribution ──────────────
      // This enables "why did your score change?" for returning Layoff Audit users.
      // MUST run for every completed audit — including companies not in the oracle DB.
      // The previous guard `if (bd && state.oracleKey)` was wrong: when oracleKey is
      // null (unknown company), the most accurate ensemble score was never recorded.
      // A returning user who audited an unknown company twice would never see attribution
      // because the first audit produced no history entry to diff against.
      const bd = ensembleResult.breakdown;
      if (bd) {
        recordScore({
          roleKey: oracleRoleKey,  // defined at line ~1062 as state.oracleKey || 'generic'
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
          companySnapshot: {
            stock90DayChange:   companyData.stock90DayChange ?? null,
            revenueGrowthYoY:   companyData.revenueGrowthYoY ?? null,
            layoffRounds:       companyData.layoffRounds ?? 0,
            lastLayoffPercent:  companyData.lastLayoffPercent ?? null,
            lastLayoffDate:     companyData.layoffsLast24Months?.[0]?.date ?? null,
            aiInvestmentSignal: companyData.aiInvestmentSignal ?? 'medium',
            employeeCount:      companyData.employeeCount,
            revenuePerEmployee: companyData.revenuePerEmployee,
            // v40.0 — L4 attribution. ensembleResult may not carry the full
            // pipeline metadata (parentPropagation, peerContagion, indiaRiskEnrichment)
            // — when absent the helper returns an empty object and L4 falls back
            // to generic text. Safe degradation.
            ...buildL4SnapshotFields(ensembleResult as any),
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
            company_snapshot: {
              stock90DayChange:   companyData.stock90DayChange ?? null,
              revenueGrowthYoY:   companyData.revenueGrowthYoY ?? null,
              layoffRounds:       companyData.layoffRounds ?? 0,
              lastLayoffPercent:  companyData.lastLayoffPercent ?? null,
              lastLayoffDate:     companyData.layoffsLast24Months?.[0]?.date ?? null,
              aiInvestmentSignal: companyData.aiInvestmentSignal ?? 'medium',
            },
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
      // Verbose primary error log — the previous behaviour was a bare `console.error(e)`
      // which printed `Error` with no context. We now log the message, stack, and
      // a tagged prefix so the browser console search can find these quickly.
      const primaryMsg = e instanceof Error ? e.message : String(e);
      const primaryStack = e instanceof Error ? e.stack : undefined;
      console.error('[AuditPipeline] PRIMARY path failed:', { message: primaryMsg, stack: primaryStack, error: e });

      // ── HIERARCHICAL FALLBACK: Post-Generation Recovery ──────────────
      // If the cloud ensemble fails, we attempt a seamless fallback to the
      // local 2000+ company intelligence database before giving up.
      try {
        if (import.meta.env.DEV) console.log("[AuditPipeline] Ensemble failed, attempting local DB fallback...");
        const fallbackCD = resolveCompanyData(state.companyName || "")
          || createUnknownCompanyFallback(state.companyName || "Unknown", state.roleTitle ?? null, (state as any).industry ?? null);
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
        // Both primary AND fallback failed — surface BOTH so users can diagnose.
        const fbMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        const fbStack = fallbackError instanceof Error ? fallbackError.stack : undefined;
        console.error('[AuditPipeline] FALLBACK path also failed:', {
          fallbackMessage: fbMsg,
          fallbackStack: fbStack,
          fallbackError,
          // Repeat primary context here so users only need to copy ONE log entry.
          primaryMessage: primaryMsg,
          primaryStack,
        });
        dispatch({
          type: "SHOW_TOAST",
          payload: {
            // Surface the actual underlying error so the user can either fix
            // (e.g. network issue) or copy the message into a bug report.
            // Truncate aggressively — the full stack lives in the console.
            message: `Analysis failed: ${fbMsg.slice(0, 140)}`,
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
                color: "var(--text)",
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

      {/* Single loading animation for both the live-scraper gate phase and the
          compute phase. The LiveScraperGate promise still resolves in the
          background; we just no longer show a separate UI for it. */}
      {(scraperGateActive || state.isCalculating) && (
        <SpyLoadingState
          stage={scraperGateActive ? 0 : ensembleStage}
          companyName={state.companyName}
          roleTitle={state.roleTitle}
          agentCount={30}
          limitedDataMode={(state.companyData as any)?._limitedDataMode ?? false}
          limitedDataReason={(state.companyData as any)?._limitedDataReason ?? undefined}
          skipAnimation={perf.isLowPerformance}
        />
      )}
      {/* Invisible gate — resolves the scraper promise without showing a second UI */}
      {scraperGateActive && (
        <div className="hidden-gate">
          <LiveScraperGate
            company={state.companyName ?? ''}
            roleTitle={state.roleTitle ?? ''}
            onReady={() => {
              scraperGateResolveRef.current?.();
              scraperGateResolveRef.current = null;
            }}
          />
        </div>
      )}

      {state.isCalculating && !scraperGateActive && quorumState.financial !== 'pending' && (
        <ProgressiveQuorumPanel quorum={quorumState} />
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

      {/* Circuit-open banner — covers scraped data APIs.
          Primary APIs (yahoo-finance, naukri): open circuit = real degradation,
          always shown regardless of genuineApiSignals.
          Secondary APIs (sec-edgar, warn-act, bse):
          only shown when genuineApiSignals = 0 (primary sources also failed).
          Each open API shows "Cached N hours ago" when cached data is available —
          never silently serve stale data as live. */}
      {state.hasCompletedAssessment &&
        !state.isCalculating &&
        apiQuotaStatus &&
        (() => {
          const coverage      = (state.scoreResult as any)?._liveDataCoverage;
          const genuineSignals = coverage?.genuineApiSignals ?? null;
          const primaryAlsoFailed = genuineSignals === 0 || genuineSignals === null;

          // Primary scraped APIs — always actionable when open
          const PRIMARY_APIS: CircuitApiName[] = ['yahoo-finance-us', 'naukri'];
          // Secondary — only surface when primaries also failed
          const FALLBACK_APIS: CircuitApiName[] = ['sec-edgar', 'warn-act', 'bse'];

          const openPrimary  = PRIMARY_APIS.filter(api => apiQuotaStatus[api]?.state === 'OPEN');
          const openFallback = FALLBACK_APIS.filter(api => apiQuotaStatus[api]?.state === 'OPEN');

          const showPrimary  = openPrimary.length > 0;
          const showFallback = openFallback.length > 0 && primaryAlsoFailed;

          if (!showPrimary && !showFallback) return null;

          const formatEntry = (api: CircuitApiName) => {
            const s = apiQuotaStatus[api];
            const label = CIRCUIT_API_LABELS[api] ?? api;
            return s?.cachedAgeLabel
              ? `${label} — Cached ${s.cachedAgeLabel}`
              : `${label} — no cached data`;
          };

          return (
            <div className="max-w-4xl mx-auto px-4 mb-3 flex flex-col gap-2">
              {showPrimary && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  <span className="mt-0.5 text-base flex-shrink-0">⛔</span>
                  <div className="min-w-0">
                    <span className="font-semibold text-red-100">Primary data source{openPrimary.length > 1 ? 's' : ''} unavailable</span>
                    <ul className="mt-1 space-y-0.5">
                      {openPrimary.map(api => (
                        <li key={api} className="text-red-300/90 font-mono text-xs">
                          {formatEntry(api)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-red-300/70 text-xs">
                      Circuit open after 3 consecutive failures. Probe will retry in 5 minutes.
                      Scores are based on cached or heuristic data — not live signals.
                    </p>
                  </div>
                </div>
              )}
              {showFallback && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <span className="mt-0.5 text-base flex-shrink-0">⚠</span>
                  <div className="min-w-0">
                    <span className="font-semibold text-amber-100">Fallback API{openFallback.length > 1 ? 's' : ''} also unavailable</span>
                    <ul className="mt-1 space-y-0.5">
                      {openFallback.map(api => (
                        <li key={api} className="text-amber-300/80 font-mono text-xs">
                          {formatEntry(api)}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-amber-300/60 text-xs">
                      All data sources are degraded. Score confidence is reduced — recalculate when connectivity is restored.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* Live signal status banner — shows data coverage tier and live vs DB breakdown */}
      {state.hasCompletedAssessment &&
        state.scoreResult &&
        !state.isCalculating && (state.scoreResult as any)._liveDataCoverage && (
          <div className="max-w-4xl mx-auto px-4 mb-3">
            <LiveSignalStatusBanner
              coverage={(state.scoreResult as any)._liveDataCoverage}
              freshnessScore={(state.scoreResult as any)._dataFreshnessScore}
              degradationReason={(state.scoreResult as any).degradationReason ?? null}
              degradationDetail={(state.scoreResult as any).degradationDetail ?? null}
              quorumInsufficient={
                (state.scoreResult as any)._quorumInsufficient
                ?? ((state.companyData as any) ?? {})._quorumInsufficient
                ?? false
              }
              quorumPositiveClassCount={
                (state.scoreResult as any)._quorumPositiveClassCount
                ?? ((state.companyData as any) ?? {})._quorumPositiveClassCount
                ?? undefined
              }
              structuralNote={
                (state.scoreResult as any)._quorumStructuralNote
                ?? ((state.companyData as any) ?? {})._quorumStructuralNote
                ?? null
              }
              onRetry={() => {
                resetAllOpenCircuits();
                void handleCalculate(true);
              }}
            />
          </div>
        )}

      {/* Wave 3.1: Audit Reveal Screen — shown once per fresh audit */}
      {revealActive && state.scoreResult && (
        <AuditRevealScreen
          score={(state.scoreResult as any).total ?? 0}
          tier={(state.scoreResult as any).tier ?? { label: 'Unknown', color: 'var(--color-slate400-text)' }}
          companyName={state.companyName ?? 'Your Company'}
          liveSignalCount={(state.scoreResult as any).signalQuality?.liveSignals ?? 0}
          confidencePercent={(state.scoreResult as any).confidencePercent ?? 0}
          firstActionTitle={(state.scoreResult as any).immediateActions?.[0]?.title
            ?? (state.scoreResult as any).topActions?.[0]?.title
            ?? (state.scoreResult as any).actions?.[0]?.title}
          firstActionEffort={(state.scoreResult as any).immediateActions?.[0]?.effort
            ?? (state.scoreResult as any).topActions?.[0]?.timeEstimate}
          onRevealComplete={() => setRevealActive(false)}
        />
      )}

      {/* Wave 6.6: What Changed Card — shown on re-audits */}
      {whatChangedState && !state.isCalculating && state.hasCompletedAssessment && (
        <div className="max-w-4xl mx-auto px-4 mb-3">
          <WhatChangedCard
            previousScore={whatChangedState.previousScore}
            currentScore={whatChangedState.currentScore}
            daysSinceLastAudit={whatChangedState.daysSinceLastAudit}
            onDismiss={() => setWhatChangedState(null)}
          />
        </div>
      )}

      {/* Wave 3.3: Score Improvement Celebration */}
      {celebrationState && !state.isCalculating && (
        <ScoreImprovementCelebration
          previousScore={celebrationState.previousScore}
          currentScore={celebrationState.currentScore}
          onDismiss={() => setCelebrationState(null)}
        />
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
          const STAGE_LABELS: Record<number, string> = {
            1: 'Acquiring workforce intelligence…',
            2: 'Reconciling live market signals…',
          };
          const commonProps = { result: hybridResult, companyData: companyDataFallback, onRetake: handleRetake, onRecalculate: handleForceRefresh, auditStage: STAGE_LABELS[ensembleStage] };
          // P1: flag-gated coexistence. Default 'v3' (4-tab, current production). When
          // uiFlags resolves 'v4' (env VITE_DASHBOARD_V4=1 or localStorage 'hp.ui.dashboard'),
          // render the orchestrator-led 3-tab shell. V3 path is byte-identical when flag off.
          if (getDashboardVariant() === "v4") {
            return (
              <Suspense fallback={<LayoffAuditDashboardV3 {...commonProps} />}>
                <LayoffAuditDashboardV4 {...commonProps} />
              </Suspense>
            );
          }
          return <LayoffAuditDashboardV3 {...commonProps} />;
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
