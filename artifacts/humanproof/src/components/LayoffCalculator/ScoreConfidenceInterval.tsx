import React, { useState } from "react";

interface Props {
  score: number;
  dataQuality: "live" | "partial" | "fallback";
  isSeeded?: boolean;
  modelsUsed?: string[];
}

// Margin of error driven by actual data quality signals
// seeded + live: ±6  |  seeded + partial: ±9  |  unseeded / fallback: ±15
const computeMargin = (
  dataQuality: "live" | "partial" | "fallback",
  isSeeded: boolean,
  modelCount: number
): number => {
  if (isSeeded && dataQuality === "live" && modelCount >= 3) return 6;
  if (isSeeded && dataQuality === "partial") return 9;
  if (!isSeeded && dataQuality === "live") return 11;
  if (dataQuality === "fallback") return 15;
  return 12;
};

const qualityMeta: Record<"live" | "partial" | "fallback", {
  label: string;
  color: string;
  detail: string;
}> = {
  live: {
    label: "Live data",
    color: "#10b981",
    detail:
      "Your score uses live company OSINT, seeded role intelligence, and 3+ AI models. This is the highest-accuracy data path.",
  },
  partial: {
    label: "Partial data",
    color: "#f59e0b",
    detail:
      "Some signals (e.g. role exposure or AI ensemble) fell back to estimated values. Score is reliable but the margin is wider.",
  },
  fallback: {
    label: "Estimated",
    color: "#6b7280",
    detail:
      "Company data was unavailable and role may be un-seeded. Score is computed from industry and role-category averages — treat as directional.",
  },
};

/**
 * ScoreConfidenceInterval — phase 2 enhancement
 * Displays "72 ± 9" inline below the animated ring score, communicating
 * epistemic honesty rather than false-precision single numbers.
 * A hover tooltip explains what drives the margin.
 */
export const ScoreConfidenceInterval: React.FC<Props> = ({
  score,
  dataQuality,
  isSeeded = false,
  modelsUsed = [],
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const margin = computeMargin(dataQuality, isSeeded, modelsUsed.length);
  const lo = Math.max(0, score - margin);
  const hi = Math.min(99, score + margin);
  const meta = qualityMeta[dataQuality];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
        position: "relative",
      }}
    >
      {/* ── Interval display ── */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--alpha-bg-04)",
          border: "1px solid var(--alpha-bg-08)",
          borderRadius: 20,
          padding: "4px 14px",
          cursor: "help",
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: "0.9rem",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {lo}–{hi}
        </span>
        <span
          style={{
            fontSize: "0.78rem",
            color: "#6b7280",
          }}
        >
          confidence range
        </span>
        {/* Quality dot */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: meta.color,
            boxShadow: `0 0 6px ${meta.color}80`,
          }}
        />
        <span
          style={{
            fontSize: "0.7rem",
            color: meta.color,
            fontWeight: 600,
          }}
        >
          {meta.label}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#4b5563" }}>ⓘ</span>
      </div>

      {/* ── Tooltip ── */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            background: "rgba(10,15,25,0.97)",
            border: "1px solid var(--alpha-bg-08)",
            borderRadius: 10,
            padding: "14px 18px",
            maxWidth: 320,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: meta.color,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            What drives the ±{margin} pt margin?
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#9ba5b4",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {meta.detail}
          </p>
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--alpha-bg-06)",
              fontSize: "0.72rem",
              color: "#4b5563",
            }}
          >
            <strong style={{ color: "#6b7280" }}>Seeded role data:</strong>{" "}
            {isSeeded ? "✓ Yes — high fidelity" : "✗ Estimated from industry averages"}
            {modelsUsed.length > 0 && (
              <>
                <br />
                <strong style={{ color: "#6b7280" }}>AI models:</strong>{" "}
                {modelsUsed.length} model{modelsUsed.length !== 1 ? "s" : ""} reached
                consensus
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
