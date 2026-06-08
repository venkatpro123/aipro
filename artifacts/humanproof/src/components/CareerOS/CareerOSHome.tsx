import { motion } from "framer-motion";
import { CareerRiskWidget } from "./CareerRiskWidget";
import { CareerStrengthWidget } from "./CareerStrengthWidget";
import { BiggestThreatWidget } from "./BiggestThreatWidget";
import { BiggestOpportunityWidget } from "./BiggestOpportunityWidget";
import { TodaysMissionWidget } from "./TodaysMissionWidget";
import { MonitoringFeedWidget } from "./MonitoringFeedWidget";
import { RecommendedToolWidget } from "./RecommendedToolWidget";
import { CareerMemorySummaryCard } from "../CareerMemory/CareerMemorySummaryCard";
import { FeedbackSummaryPanel } from "../Feedback/FeedbackSummaryPanel";
// Phase 9 — Intelligence Amplification
import { WeeklyCareerBriefCard } from "../Intelligence/WeeklyCareerBriefCard";
import { CareerMomentAlert } from "../Intelligence/CareerMomentAlert";
import { CareerHealthScoreWidget } from "../Intelligence/CareerHealthScoreWidget";
import { PersonalizedPredictionPanel } from "../Intelligence/PersonalizedPredictionPanel";
import { PeerComparisonInsight } from "../Intelligence/PeerComparisonInsight";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function CareerOSHome() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ padding: "32px 0 24px" }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{
            fontSize: "clamp(1.5rem, 4vw, 2.2rem)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            color: "var(--text)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}>
            Career OS
          </h1>
          <div style={{
            padding: "3px 10px", borderRadius: 6, background: "rgba(0,245,255,0.1)",
            border: "1px solid rgba(0,245,255,0.25)", fontSize: "0.72rem",
            fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.1em",
            fontFamily: "var(--font-mono)",
          }}>
            COMMAND CENTER
          </div>
        </div>
        <p style={{
          margin: "8px 0 0", fontSize: "0.9rem", color: "var(--text-3)",
          fontWeight: 400, maxWidth: 540,
        }}>
          Monitor · Detect · Recommend · Execute · Measure
        </p>
      </motion.div>

      {/* Widget grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          gap: 16,
        }}
      >
        {/* Phase 9: Career moment banners — full-width, top of grid */}
        <CareerMomentAlert />

        {/* Phase 9: Weekly brief — Monday only / critical signals */}
        <WeeklyCareerBriefCard />

        {/* Row 1: Risk + Strength + Threat */}
        <CareerRiskWidget />
        <CareerStrengthWidget />
        <BiggestThreatWidget />

        {/* Row 2: Opportunity + Mission + Tool Rec */}
        <BiggestOpportunityWidget />
        <TodaysMissionWidget />
        <RecommendedToolWidget />

        {/* Phase 9: Career Health Score widget */}
        <CareerHealthScoreWidget />

        {/* Phase 9: 90-day prediction */}
        <PersonalizedPredictionPanel />

        {/* Phase 9: Peer comparison */}
        <PeerComparisonInsight />

        {/* Full-width monitoring feed */}
        <div style={{ gridColumn: "1 / -1" }}>
          <MonitoringFeedWidget />
        </div>

        {/* Career Memory summary */}
        <CareerMemorySummaryCard />

        {/* Feedback summary — pending thumbs prompts + ROI */}
        <div style={{ gridColumn: "1 / -1" }}>
          <div className="card-premium" style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Action Feedback &amp; ROI
            </div>
            <FeedbackSummaryPanel compact />
          </div>
        </div>
      </motion.div>

      {/* Quick nav strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        style={{
          marginTop: 28,
          display: "flex", gap: 10, flexWrap: "wrap",
        }}
      >
        {[
          { label: "Full Audit Report", route: "terminal" },
          { label: "Monitor Signals", route: "monitor" },
          { label: "All Tools", route: "tools" },
          { label: "Career Settings", route: "settings" },
        ].map(link => (
          <button
            key={link.route}
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: link.route } }))}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
              borderRadius: 8, color: "var(--text-2)", fontSize: "0.8rem", fontWeight: 600,
              padding: "7px 16px", cursor: "pointer", transition: "all 150ms",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)";
              (e.currentTarget as HTMLElement).style.color = "var(--cyan)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
          >
            {link.label} →
          </button>
        ))}
      </motion.div>
    </div>
  );
}
