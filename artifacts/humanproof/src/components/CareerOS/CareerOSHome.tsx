import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useLayoff } from "../../context/LayoffContext";
import { computeProfileCompleteness, completenessColor } from "../../services/profileCompletenessEngine";
import { fetchUserProfile } from "../../services/userProfileService";
import { getCareerMemorySummary } from "../../services/careerMemoryService";
import { useAuth } from "../../context/AuthContext";
import { CareerRiskWidget } from "./CareerRiskWidget";
import { BiggestThreatWidget } from "./BiggestThreatWidget";
import { BiggestOpportunityWidget } from "./BiggestOpportunityWidget";
import { MonitoringFeedWidget } from "./MonitoringFeedWidget";
import { RecommendedToolWidget } from "./RecommendedToolWidget";
import { AIAmplificationWidget } from "./AIAmplificationWidget";
import { TodaysIntelligenceBrief } from "./TodaysIntelligenceBrief";
import { CareerMemorySummaryCard } from "../CareerMemory/CareerMemorySummaryCard";
import { FeedbackSummaryPanel } from "../Feedback/FeedbackSummaryPanel";
import { CareerHealthScoreWidget } from "../Intelligence/CareerHealthScoreWidget";
import { PersonalizedPredictionPanel } from "../Intelligence/PersonalizedPredictionPanel";
import { WeeklyCareerBriefCard } from "../Intelligence/WeeklyCareerBriefCard";
import { CareerMomentAlert } from "../Intelligence/CareerMomentAlert";
import { ReAuditPromptCard } from "../Intelligence/ReAuditPromptCard";
import { FiveYearArcPanel } from "./FiveYearArcPanel";
import { OutcomeInsightPanel } from "./OutcomeInsightPanel";
import { evaluateReEngagementTrigger } from "../../services/reEngagementService";
import { detectAdaptationTriggers, type AdaptationTrigger } from "../../services/adaptationTriggerService";
import { useAutopilotAlerts } from "../../hooks/useAutopilotAlerts";
import { syncTwinFromProfile } from "../../services/careerTwinService";
import { ProgressTrackerWidget } from "./ProgressTrackerWidget";
import { MissionCard } from "./MissionCard";
import { EarlyWarningStrip } from "./EarlyWarningStrip";
import { AdaptationVelocityBadge } from "./AdaptationVelocityBadge";
import { CareerResultsPanel } from "./CareerResultsPanel";
import { QuickFeedbackBanner } from "./QuickFeedbackBanner";
import { FeedbackLoopStatus } from "./FeedbackLoopStatus";
import { RecordOutcomeModal } from "./RecordOutcomeModal";
import { AdaptationLoopStatus } from "./AdaptationLoopStatus";
import { CareerGraphInsights } from "./CareerGraphInsights";
import { orchestrate } from "../../services/orchestration/signalOrchestrator";
import { getCohortOutcomeStats, tenureBandFromYears } from "../../services/cohortOutcomesAggregator";
import type { HybridResult } from "../../types/hybridResult";
import type { UserProfile } from "../../services/userProfileService";

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "var(--text-3)",
        letterSpacing: "0.1em", textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const, fontFamily: "var(--font-mono, monospace)",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.5 }} />
    </div>
  );
}

// ─── Tool quick-launch ────────────────────────────────────────────────────────

const TOOL_LINKS = [
  { label: "Layoff Defense", to: "/tools/layoff-defense", icon: "🛡️" },
  { label: "AI Defense", to: "/tools/ai-defense", icon: "🤖" },
  { label: "Market Intel", to: "/tools/market-intel", icon: "📊" },
  { label: "Career Strategy", to: "/tools/strategy", icon: "🗺️" },
] as const;

function ToolQuickLaunch() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
      {TOOL_LINKS.map((tool) => (
        <Link
          key={tool.to}
          to={tool.to}
          style={{
            display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6,
            padding: "14px 10px", background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)", borderRadius: 10,
            textDecoration: "none", color: "var(--text-2)",
            fontSize: "0.78rem", fontWeight: 600, transition: "all 150ms ease", textAlign: "center" as const,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)";
            (e.currentTarget as HTMLElement).style.color = "var(--cyan)";
            (e.currentTarget as HTMLElement).style.background = "rgba(0,245,255,0.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
          }}
        >
          <span style={{ fontSize: 20 }}>{tool.icon}</span>
          <span>{tool.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ─── First-time "Start Here" card ─────────────────────────────────────────────

function StartHereCard() {
  const PREVIEWS = [
    { icon: "🎯", title: "Career Readiness", desc: "How prepared you are — not just how at-risk you are. Higher is better." },
    { icon: "📋", title: "Weekly Mission", desc: "One specific action per week, with a clear reason and consequence if skipped." },
    { icon: "⚡", title: "Early Warnings", desc: "Detected signals — stealth headcount cuts, market shifts, peer layoffs." },
  ];

  return (
    <motion.div variants={itemVariants}>
      <div className="card-premium" style={{
        padding: "40px 36px", textAlign: "center",
        background: "linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(0,245,255,0.2)", borderRadius: 16, marginBottom: 24,
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🎯</div>
        <h2 style={{
          fontSize: "clamp(1.3rem, 3vw, 1.7rem)", fontFamily: "var(--font-display)",
          fontWeight: 800, color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em",
        }}>
          Your Career Adaptation OS is ready
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-2)", margin: "0 auto 28px", maxWidth: 480, lineHeight: 1.6 }}>
          Run your first audit to unlock real-time career readiness scoring, your weekly mission, and continuous adaptation monitoring.
        </p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "terminal" } }))}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--cyan)", color: "#000", fontWeight: 800,
            fontSize: "0.95rem", padding: "13px 28px", borderRadius: 10,
            border: "none", cursor: "pointer", transition: "opacity 150ms ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        >
          Run Career Audit →
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 36, textAlign: "left" as const }}>
          {PREVIEWS.map((p) => (
            <div key={p.title} style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "16px 18px",
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{p.icon}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", marginBottom: 5 }}>{p.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-3)", lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CareerOSHome() {
  const { state } = useLayoff();
  const { user } = useAuth();
  const navigate = useNavigate();
  const hasResult = state.scoreResult !== null;

  const [reEngageBanner, setReEngageBanner] = useState<{ headline: string; subtext: string } | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number | null>(null);
  const [memorySummary, setMemorySummary] = useState<import('../../services/careerMemoryService').CareerMemorySummary | null>(null);
  const [adaptationTriggers, setAdaptationTriggers] = useState<AdaptationTrigger[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [peerBenchmark, setPeerBenchmark] = useState<{ n: number; avgPtsGain: number } | null>(null);
  const [recordOutcomeOpen, setRecordOutcomeOpen] = useState(false);
  const [outcomeVersion, setOutcomeVersion] = useState(0);
  const { unreadCount: autopilotUnreadCount } = useAutopilotAlerts();

  // ── Profile + memory + twin sync ──
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchUserProfile(),
      getCareerMemorySummary(user.id),
    ]).then(([profile, summary]) => {
      setUserProfile(profile);
      setMemorySummary(summary);
      const { score } = computeProfileCompleteness(
        profile, summary,
        !!state.companyName && !!state.roleTitle,
      );
      setCompletenessScore(score);

      const hr = state.scoreResult as HybridResult | null;
      if (profile && hr && hr.total != null) {
        void syncTwinFromProfile(profile, hr);
      }
    }).catch(() => {/* offline */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.companyName, state.roleTitle, state.scoreResult]);

  // ── Re-engagement banner ──
  useEffect(() => {
    if (!state.companyName || !state.scoreResult) return;
    const score = (state.scoreResult as any)?.total ?? null;
    if (score === null) return;
    try {
      const result = evaluateReEngagementTrigger(state.companyName, score);
      if (result && result.type !== 'none') {
        setReEngageBanner({ headline: result.headline, subtext: result.subtext });
      }
    } catch {/* offline */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.companyName]);

  // ── Adaptation triggers ──
  useEffect(() => {
    if (!state.scoreResult) { setAdaptationTriggers([]); return; }
    const hr = state.scoreResult as HybridResult;
    const completedIds: string[] = [];
    try {
      const raw = sessionStorage.getItem('hp_completed_actions');
      if (raw) completedIds.push(...JSON.parse(raw));
    } catch { /* ignore */ }
    const triggers = detectAdaptationTriggers(hr, completedIds, hr.calculatedAt ?? null, []);
    setAdaptationTriggers(triggers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scoreResult]);

  // ── Primary move (weekly mission) — computed from signal orchestrator ──
  const orchestratedFeed = useMemo(() => {
    if (!state.scoreResult) return null;
    try {
      return orchestrate(state.scoreResult as HybridResult, undefined, userProfile);
    } catch {
      return null;
    }
  }, [state.scoreResult, userProfile]);

  const primaryMove = orchestratedFeed?.primaryMove ?? null;
  const primaryMoveActionId = primaryMove?.action.id ?? primaryMove?.action.title ?? null;

  // ── Peer benchmark for MissionCard — cohort data for the primary action ──
  useEffect(() => {
    if (!state.scoreResult || !primaryMoveActionId) return;
    const hr = state.scoreResult as HybridResult;
    const roleKey = (hr as any)?.roleKey ?? (hr as any)?.role ?? 'unknown';
    const band = tenureBandFromYears(userProfile?.yearsExperience ?? 5);
    getCohortOutcomeStats(roleKey, band, primaryMoveActionId)
      .then(stats => {
        if (stats && stats.count >= 5) {
          setPeerBenchmark({ n: stats.count, avgPtsGain: Math.round(stats.avgRiskReduction) });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryMoveActionId, userProfile?.yearsExperience]);

  // ── Derived readiness values for GPS bar ──
  const hr = state.scoreResult as HybridResult | null;
  const riskScore = hr?.total ?? 0;
  const readiness = 100 - riskScore;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 80px" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          CAREER GPS HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ padding: "28px 0 20px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{
              fontSize: "clamp(1.4rem, 4vw, 2rem)", fontFamily: "var(--font-display)",
              fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em",
            }}>
              HumanProof
            </h1>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 6,
              background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)",
              fontSize: "0.72rem", fontWeight: 700, color: "var(--cyan)",
              letterSpacing: "0.1em", fontFamily: "var(--font-mono, monospace)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)",
                display: "inline-block", animation: "pulse 1.8s ease-in-out infinite", flexShrink: 0,
              }} />
              CAREER GPS
            </div>
          </div>
          <div style={{
            fontSize: "0.75rem", fontWeight: 500, color: "var(--text-3)",
            fontFamily: "var(--font-mono, monospace)", alignSelf: "center",
          }}>
            {formatTodayDate()}
          </div>
        </div>

        {/* GPS status bar — Role · Readiness · Velocity */}
        {hasResult && hr && (
          <div style={{
            marginTop: 14, display: "flex", flexWrap: "wrap",
            gap: "4px 16px", fontSize: "0.74rem", fontFamily: "var(--font-mono, monospace)",
            alignItems: "center",
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>YOU ARE</span>
            <span style={{ color: "var(--text-2)", fontWeight: 600 }}>
              {state.roleTitle ? `${state.roleTitle} ` : ''}{state.companyName ? `@ ${state.companyName}` : "your current role"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>READINESS</span>
            <span style={{ fontWeight: 800, color: readiness >= 60 ? '#10b981' : readiness >= 40 ? '#f59e0b' : '#ef4444' }}>
              {readiness}
            </span>
            <AdaptationVelocityBadge scoreResult={hr} compact />
            {(() => {
              const targetPath = (hr as any)?.escapePaths?.paths?.[0]?.title ?? null;
              return targetPath ? (
                <>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>TARGET</span>
                  <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{targetPath}</span>
                </>
              ) : null;
            })()}
          </div>
        )}
      </motion.div>

      {/* ── Today's Intelligence Brief (system voice, compact) ── */}
      <TodaysIntelligenceBrief />

      {/* ── 14-day feedback banner — shown when action is due a follow-up ── */}
      <QuickFeedbackBanner />

      {/* ── Re-engagement banner ── */}
      {reEngageBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 16, padding: "10px 16px", borderRadius: 8,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
            fontSize: "0.82rem", color: "#f59e0b", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span>⏰</span>
          <span>
            <span style={{ fontWeight: 700 }}>{reEngageBanner.headline}</span>
            {reEngageBanner.subtext && (
              <span style={{ fontWeight: 400, opacity: 0.8, marginLeft: 6 }}>{reEngageBanner.subtext}</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setReEngageBanner(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(245,158,11,0.5)", cursor: "pointer", fontSize: "1rem" }}
          >×</button>
        </motion.div>
      )}

      <motion.div variants={containerVariants} initial="hidden" animate="visible">

        {/* ══════════════════════════════════════════════════════════════════════
            ABOVE FOLD — MISSION CARD (dominant, full-width) — Rule 5
        ══════════════════════════════════════════════════════════════════════ */}
        {!hasResult ? (
          <StartHereCard />
        ) : (
          <>
            {/* Career Moment Alert — urgent system flags */}
            <CareerMomentAlert />

            {/* Adaptation triggers */}
            {adaptationTriggers.map(trigger => (
              <motion.div
                key={trigger.type}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginBottom: 12, padding: '10px 14px', borderRadius: 8,
                  background: trigger.severity === 'critical' ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${trigger.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.18)'}`,
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem',
                }}
              >
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>
                  {trigger.severity === 'critical' ? '🚨' : '⚠️'}
                </span>
                <span style={{ color: trigger.severity === 'critical' ? '#ef4444' : 'rgba(255,255,255,0.65)', lineHeight: 1.4, flex: 1 }}>
                  {trigger.message}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/terminal')}
                  style={{
                    flexShrink: 0, background: 'none',
                    border: `1px solid ${trigger.severity === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.35)'}`,
                    borderRadius: 6, color: trigger.severity === 'critical' ? '#ef4444' : '#f59e0b',
                    fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {trigger.ctaLabel} →
                </button>
              </motion.div>
            ))}

            {/* MISSION CARD — dominant single-action above fold (Rules 1, 4, 5) */}
            <motion.div variants={itemVariants} style={{ marginBottom: 14 }}>
              {primaryMove ? (
                <MissionCard
                  primaryMove={primaryMove}
                  riskScore={riskScore}
                  peerBenchmark={peerBenchmark}
                  onHelp={() => navigate('/tools/strategy')}
                  onSkip={() => navigate('/monitor')}
                />
              ) : (
                // Fallback when no primary move is computed yet
                <div className="card-premium" style={{
                  padding: "24px 28px",
                  border: "1px solid rgba(0,245,255,0.2)",
                  background: "rgba(0,245,255,0.03)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
                    Computing your weekly mission…
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/terminal')}
                    style={{
                      background: "var(--cyan)", color: "#000", border: "none", borderRadius: 8,
                      padding: "10px 22px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Run New Audit →
                  </button>
                </div>
              )}
            </motion.div>

            {/* EARLY WARNING STRIP — compact detection strip (Rule 3, 11) */}
            {hr && (
              <motion.div variants={itemVariants}>
                <EarlyWarningStrip scoreResult={hr} adaptationTriggers={adaptationTriggers} />
              </motion.div>
            )}

            {/* Re-audit nudge */}
            <ReAuditPromptCard />

            {/* ── PROGRESS + RESULTS SECTION ── */}
            <motion.div variants={itemVariants} style={{ marginBottom: 28 }}>
              <SectionLabel label="Your Progress" />
              <ProgressTrackerWidget />
              <div style={{ marginTop: 16 }}>
                <CareerResultsPanel
                  onRecordOutcome={() => setRecordOutcomeOpen(true)}
                  refreshKey={outcomeVersion}
                />
              </div>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════════
                BELOW FOLD — DEEP INTELLIGENCE
            ══════════════════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
              <SectionLabel label="Career Readiness Score" />
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: 14, marginBottom: 14,
              }}>
                <CareerRiskWidget />
                <RecommendedToolWidget />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
              <SectionLabel label="Signals" />

              <WeeklyCareerBriefCard />

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                gap: 14, marginBottom: 14,
              }}>
                <BiggestThreatWidget />
                <BiggestOpportunityWidget />
              </div>

              <MonitoringFeedWidget />

              <div style={{ marginTop: 14 }}>
                <AIAmplificationWidget />
              </div>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════════
                CAREER SYSTEM
            ══════════════════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants}>
              <SectionLabel label="Your Career System" />

              <ToolQuickLaunch />

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                gap: 14, marginBottom: 14,
              }}>
                <CareerHealthScoreWidget />
                <PersonalizedPredictionPanel />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FiveYearArcPanel />
              </div>

              <div style={{ marginBottom: 14 }}>
                <OutcomeInsightPanel />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FeedbackLoopStatus />
              </div>

              {/* ADAPTATION LOOP — Rule 11: visible 6-stage loop status (Phase 5) */}
              <div style={{ marginBottom: 14 }}>
                <AdaptationLoopStatus scoreResult={hr} primaryMove={primaryMove} />
              </div>

              {/* CAREER GRAPH INSIGHTS — Rule 9/18: cohort outcome patterns (Phase 5) */}
              <div style={{ marginBottom: 14 }}>
                <CareerGraphInsights userProfile={userProfile} />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                gap: 14,
              }}>
                <div>
                  <CareerMemorySummaryCard />
                  {completenessScore !== null && (
                    <div style={{
                      marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "6px 12px", borderRadius: 6,
                      background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
                      fontSize: "0.75rem",
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>System Readiness</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: completenessColor(completenessScore) }}>
                          {completenessScore}%
                        </span>
                        <Link to="/tools/career-twin" style={{ color: "var(--cyan)", textDecoration: "none", fontSize: "0.72rem", fontWeight: 700 }}>
                          → Career Twin
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-premium" style={{ padding: "20px 22px" }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "var(--text-3)",
                    textTransform: "uppercase" as const, letterSpacing: "0.1em",
                    marginBottom: 14, fontFamily: "var(--font-mono, monospace)",
                  }}>
                    Action Feedback &amp; ROI
                  </div>
                  <FeedbackSummaryPanel compact />
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ── Bottom nav strip ── */}
        <motion.div variants={itemVariants} style={{ marginTop: 32, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Run New Audit", path: "/terminal", badge: 0 },
            { label: "Monitor Signals", path: "/monitor", badge: autopilotUnreadCount },
            { label: "All Tools", path: "/tools", badge: 0 },
            { label: "Career Settings", path: "/settings", badge: 0 },
          ].map((link) => (
            <button
              type="button"
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 8,
                color: "var(--text-2)", fontSize: "0.8rem", fontWeight: 600,
                padding: "7px 16px", cursor: "pointer", transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)";
                (e.currentTarget as HTMLElement).style.color = "var(--cyan)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
              }}
            >
              {link.label}
              {link.badge > 0 && (
                <span style={{
                  marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800,
                }}>
                  {link.badge > 9 ? "9+" : link.badge}
                </span>
              )}
              {" →"}
            </button>
          ))}
        </motion.div>
      </motion.div>

      <RecordOutcomeModal
        open={recordOutcomeOpen}
        onClose={() => setRecordOutcomeOpen(false)}
        onRecorded={() => setOutcomeVersion(v => v + 1)}
      />
    </div>
  );
}
