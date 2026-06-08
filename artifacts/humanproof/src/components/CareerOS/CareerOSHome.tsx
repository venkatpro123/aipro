import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useLayoff } from "../../context/LayoffContext";
import { computeProfileCompleteness, completenessColor } from "../../services/profileCompletenessEngine";
import { fetchUserProfile } from "../../services/userProfileService";
import { getCareerMemorySummary } from "../../services/careerMemoryService";
import { useAuth } from "../../context/AuthContext";
import { CareerRiskWidget } from "./CareerRiskWidget";
import { BiggestThreatWidget } from "./BiggestThreatWidget";
import { BiggestOpportunityWidget } from "./BiggestOpportunityWidget";
import { TodaysMissionWidget } from "./TodaysMissionWidget";
import { MonitoringFeedWidget } from "./MonitoringFeedWidget";
import { RecommendedToolWidget } from "./RecommendedToolWidget";
import { TodaysIntelligenceBrief } from "./TodaysIntelligenceBrief";
import { CareerMemorySummaryCard } from "../CareerMemory/CareerMemorySummaryCard";
import { FeedbackSummaryPanel } from "../Feedback/FeedbackSummaryPanel";
import { CareerHealthScoreWidget } from "../Intelligence/CareerHealthScoreWidget";
import { PersonalizedPredictionPanel } from "../Intelligence/PersonalizedPredictionPanel";
import { WeeklyCareerBriefCard } from "../Intelligence/WeeklyCareerBriefCard";
import { CareerMomentAlert } from "../Intelligence/CareerMomentAlert";
import { evaluateReEngagementTrigger } from "../../services/reEngagementService";

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── Section label component ──────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "var(--border)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// ─── Tool quick-launch button ─────────────────────────────────────────────────

const TOOL_LINKS = [
  { label: "Layoff Defense", to: "/tools/layoff-defense", icon: "🛡️" },
  { label: "AI Defense", to: "/tools/ai-defense", icon: "🤖" },
  { label: "Market Intel", to: "/tools/market-intel", icon: "📊" },
  { label: "Career Strategy", to: "/tools/strategy", icon: "🗺️" },
] as const;

function ToolQuickLaunch() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
        marginBottom: 20,
      }}
    >
      {TOOL_LINKS.map((tool) => (
        <Link
          key={tool.to}
          to={tool.to}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "14px 10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            textDecoration: "none",
            color: "var(--text-2)",
            fontSize: "0.78rem",
            fontWeight: 600,
            transition: "all 150ms ease",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)";
            (e.currentTarget as HTMLElement).style.color = "var(--cyan)";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(0,245,255,0.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--border)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.03)";
          }}
        >
          <span style={{ fontSize: 20 }}>{tool.icon}</span>
          <span>{tool.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ─── First-time user "Start Here" state ──────────────────────────────────────

function StartHereCard() {
  const PREVIEWS = [
    {
      icon: "⚡",
      title: "Risk Score",
      desc: "Real-time layoff probability based on your company, role, and market signals.",
    },
    {
      icon: "📋",
      title: "Action Plan",
      desc: "A prioritized daily mission tailored to your exact situation and risk tier.",
    },
    {
      icon: "🗺️",
      title: "Opportunity Map",
      desc: "Your best escape paths and how reachable each one is from your current position.",
    },
  ];

  return (
    <motion.div variants={itemVariants}>
      <div
        className="card-premium"
        style={{
          padding: "40px 36px",
          textAlign: "center",
          background:
            "linear-gradient(135deg, rgba(0,245,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(0,245,255,0.2)",
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 36,
            marginBottom: 16,
          }}
        >
          🎯
        </div>
        <h2
          style={{
            fontSize: "clamp(1.3rem, 3vw, 1.7rem)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            color: "var(--text)",
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          Your career command center is ready
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-2)",
            margin: "0 auto 28px",
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          Run your first audit to unlock real-time risk scoring, personalized
          action plans, and continuous career monitoring.
        </p>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("navigate", { detail: { page: "terminal" } })
            )
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--cyan)",
            color: "#000",
            fontWeight: 800,
            fontSize: "0.95rem",
            padding: "13px 28px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "opacity 150ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
        >
          Run Career Audit →
        </button>

        {/* Preview cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 36,
            textAlign: "left",
          }}
        >
          {PREVIEWS.map((p) => (
            <div
              key={p.title}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{p.icon}</div>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: 5,
                }}
              >
                {p.title}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-3)", lineHeight: 1.5 }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function formatTodayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isMonday(): boolean {
  return new Date().getDay() === 1;
}

export function CareerOSHome() {
  const { state } = useLayoff();
  const { user } = useAuth();
  const hasResult = state.scoreResult !== null;
  const [reEngageBanner, setReEngageBanner] = useState<{ headline: string; subtext: string } | null>(null);
  const [completenessScore, setCompletenessScore] = useState<number | null>(null);

  // Load profile completeness for the "Your Career System" chip
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchUserProfile(),
      getCareerMemorySummary(user.id),
    ]).then(([profile, summary]) => {
      const { score } = computeProfileCompleteness(
        profile,
        summary,
        !!state.companyName && !!state.roleTitle,
      );
      setCompletenessScore(score);
    }).catch(() => {/* offline — ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.companyName, state.roleTitle]);

  useEffect(() => {
    if (!state.companyName || !state.scoreResult) return;
    const score = (state.scoreResult as any)?.total ?? null;
    if (score === null) return;
    try {
      const result = evaluateReEngagementTrigger(state.companyName, score);
      if (result && result.type !== 'none') {
        setReEngageBanner({ headline: result.headline, subtext: result.subtext });
      }
    } catch {/* offline — ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.companyName]);

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 16px 80px",
      }}
    >
      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ padding: "32px 0 28px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                color: "var(--text)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              HumanProof
            </h1>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(0,245,255,0.1)",
                border: "1px solid rgba(0,245,255,0.25)",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--cyan)",
                letterSpacing: "0.1em",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {/* LIVE pulsing dot */}
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--cyan)",
                display: "inline-block",
                animation: "pulse 1.8s ease-in-out infinite",
                flexShrink: 0,
              }} />
              AI CAREER OS
            </div>
          </div>
          {/* Current date — OS personality */}
          <div style={{
            fontSize: "0.75rem", fontWeight: 500,
            color: "var(--text-3)",
            fontFamily: "var(--font-mono, monospace)",
            alignSelf: "center",
          }}>
            {formatTodayDate()}
          </div>
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.88rem",
            color: "var(--text-3)",
            fontWeight: 400,
          }}
        >
          Monitor · Detect · Recommend · Execute · Measure
        </p>
      </motion.div>

      {/* ── Today's Intelligence Brief (system voice) ── */}
      <TodaysIntelligenceBrief />

      {/* ── Re-engagement banner (appears when system detects check-in needed) ── */}
      {reEngageBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 16,
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            fontSize: "0.82rem",
            color: "#f59e0b",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
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
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "rgba(245,158,11,0.5)", cursor: "pointer", fontSize: "1rem",
            }}
          >
            ×
          </button>
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1 — YOUR SITUATION ("RIGHT NOW")
            3-column command bar
        ════════════════════════════════════════════════════════════════════ */}
        <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
          <SectionLabel label="Right Now" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 14,
              paddingTop: 3,
              borderTop: "2px solid",
              borderImage: "linear-gradient(90deg, var(--cyan), transparent) 1",
            }}
          >
            <CareerRiskWidget />
            <TodaysMissionWidget />
            <RecommendedToolWidget />
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════════════
            FIRST-TIME USER: No score result yet
            Show "Start Here" card instead of sections 2 + 3
        ════════════════════════════════════════════════════════════════════ */}
        {!hasResult ? (
          <StartHereCard />
        ) : (
          <>
            {/* ── Career Moment Alert — urgent moments from proactiveInsightEngine ── */}
            <CareerMomentAlert />

            {/* ════════════════════════════════════════════════════════════════════
                SECTION 2 — WHAT'S MOVING ("SIGNALS")
            ════════════════════════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants} style={{ marginBottom: 32 }}>
              <SectionLabel label="Signals" />

              {/* Weekly Career Brief — shown on Mondays or when data available */}
              {isMonday() && <WeeklyCareerBriefCard />}

              {/* Threat + Opportunity 2-col grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <BiggestThreatWidget />
                <BiggestOpportunityWidget />
              </div>

              {/* Full-width monitoring feed */}
              <MonitoringFeedWidget />
            </motion.div>

            {/* ══════════════════════════════════════════════════════════════
                SECTION 3 — YOUR CAREER SYSTEM (bottom)
            ══════════════════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants}>
              <SectionLabel label="Your Career System" />

              {/* Tool quick-launch 4-col row */}
              <ToolQuickLaunch />

              {/* Health + Prediction side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <CareerHealthScoreWidget />
                <PersonalizedPredictionPanel />
              </div>

              {/* Memory + Feedback side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <CareerMemorySummaryCard />
                  {/* System Readiness chip */}
                  {completenessScore !== null && (
                    <div style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 12px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      fontSize: "0.75rem",
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                        System Readiness
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: completenessColor(completenessScore) }}>
                          {completenessScore}%
                        </span>
                        <Link
                          to="/tools/career-twin"
                          style={{ color: "var(--cyan)", textDecoration: "none", fontSize: "0.72rem", fontWeight: 700 }}
                        >
                          → Career Twin
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-premium" style={{ padding: "20px 22px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 14,
                      fontFamily: "var(--font-mono, monospace)",
                    }}
                  >
                    Action Feedback &amp; ROI
                  </div>
                  <FeedbackSummaryPanel compact />
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ── Bottom nav strip ── */}
        <motion.div
          variants={itemVariants}
          style={{
            marginTop: 32,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Full Audit Report", route: "terminal" },
            { label: "Monitor Signals", route: "monitor" },
            { label: "All Tools", route: "tools" },
            { label: "Career Settings", route: "settings" },
          ].map((link) => (
            <button
              type="button"
              key={link.route}
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("navigate", {
                    detail: { page: link.route },
                  })
                )
              }
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-2)",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "7px 16px",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--cyan)";
                (e.currentTarget as HTMLElement).style.color = "var(--cyan)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
              }}
            >
              {link.label} →
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
