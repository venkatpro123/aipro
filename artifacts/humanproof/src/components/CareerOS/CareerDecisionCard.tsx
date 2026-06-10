// CareerDecisionCard.tsx — Phase 3 (Career OS)
// Renders the explicit stay/leave verdict computed by generateCareerDecision().
//
// Visibility rules:
//   LEAVE_NOW             → always show (red)
//   LEAVE_WITHIN_90_DAYS  → always show (amber)
//   STAY_AND_DEFEND       → always show (blue)
//   STAY_AND_MONITOR      → show only when score >= 40 (green); hidden when score < 40
//     (below 40 means low risk — no need to surface a monitoring card)

import { useState } from "react";
import type { HybridResult } from "../../types/hybridResult";
import type { CareerDecision } from "../../services/strategySynthesisEngine";

interface Props {
  hr: HybridResult;
}

const VERDICT_CONFIG = {
  LEAVE_NOW: {
    label: "LEAVE NOW",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.28)",
    accentBg: "rgba(239,68,68,0.12)",
    accentBorder: "rgba(239,68,68,0.35)",
    icon: "🔴",
    urgencyChip: "CRITICAL",
  },
  LEAVE_WITHIN_90_DAYS: {
    label: "LEAVE WITHIN 90 DAYS",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.28)",
    accentBg: "rgba(245,158,11,0.1)",
    accentBorder: "rgba(245,158,11,0.3)",
    icon: "🟡",
    urgencyChip: "HIGH",
  },
  STAY_AND_DEFEND: {
    label: "STAY & DEFEND",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.22)",
    accentBg: "rgba(59,130,246,0.08)",
    accentBorder: "rgba(59,130,246,0.25)",
    icon: "🔵",
    urgencyChip: "MODERATE",
  },
  STAY_AND_MONITOR: {
    label: "STAY & MONITOR",
    color: "#10b981",
    bg: "rgba(16,185,129,0.05)",
    border: "rgba(16,185,129,0.2)",
    accentBg: "rgba(16,185,129,0.07)",
    accentBorder: "rgba(16,185,129,0.22)",
    icon: "🟢",
    urgencyChip: "LOW",
  },
} as const;

export function CareerDecisionCard({ hr }: Props) {
  const [expanded, setExpanded] = useState(false);
  const decision = (hr as any).careerDecision as CareerDecision | undefined;
  const score = hr.total ?? 0;

  if (!decision) return null;

  // Hide low-urgency monitor card for genuinely safe profiles
  if (decision.verdict === "STAY_AND_MONITOR" && score < 40) return null;

  const cfg = VERDICT_CONFIG[decision.verdict];

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "18px 20px",
        borderRadius: 13,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: expanded ? 16 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "rgba(255,255,255,0.27)", letterSpacing: "0.13em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono, monospace)" }}>
            SYSTEM RECOMMENDATION
          </span>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: "0.71rem",
              fontWeight: 800,
              color: cfg.color,
              background: cfg.accentBg,
              border: `1px solid ${cfg.accentBorder}`,
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.05em",
            }}
          >
            {cfg.icon} {cfg.label}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 5,
              fontSize: "0.62rem",
              fontWeight: 700,
              color: cfg.color,
              background: `${cfg.color}10`,
              border: `1px solid ${cfg.color}28`,
              fontFamily: "var(--font-mono, monospace)",
              opacity: 0.75,
            }}
          >
            {decision.confidence}% · {decision.confidenceKind.toUpperCase()}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          style={{
            background: "none",
            border: `1px solid ${cfg.border}`,
            borderRadius: 6,
            color: cfg.color,
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "3px 10px",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            transition: "opacity 0.15s",
            opacity: 0.72,
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "0.72")}
        >
          {expanded ? "▲ Less" : "▾ Details"}
        </button>
      </div>

      {/* Primary reason — always visible */}
      <div
        style={{
          marginTop: expanded ? 0 : 12,
          fontSize: "0.86rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.5,
        }}
      >
        {decision.primaryReason}
      </div>

      {/* Recommended timeline — always visible */}
      <div
        style={{
          marginTop: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 7,
          background: cfg.accentBg,
          border: `1px solid ${cfg.accentBorder}`,
          fontSize: "0.76rem",
          fontWeight: 700,
          color: cfg.color,
        }}
      >
        ▶ {decision.recommendedTimeline}
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Supporting facts */}
          {decision.topSupportingFacts.length > 0 && (
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "rgba(255,255,255,0.26)", letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>
                Why the system says this
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {decision.topSupportingFacts.map((fact, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ flexShrink: 0, marginTop: 6, width: 4, height: 4, borderRadius: "50%", background: cfg.color, display: "inline-block", opacity: 0.6 }} />
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.52)", lineHeight: 1.5 }}>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Counter-argument */}
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono, monospace)", marginBottom: 6 }}>
              Opposing argument
            </div>
            <div style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.44)", lineHeight: 1.5 }}>
              {decision.opposingArgument}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
