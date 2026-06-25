import React, { useState, useEffect } from "react";
import { ScoreResult, ScoreBreakdown } from "../../services/layoffScoreEngine";
import { EnsembleResult } from "../../services/ensemble/ensembleOrchestrator";
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
import { CareerIntelligence } from "../../data/intelligence/types";
import { ScoreConfidenceInterval } from "./ScoreConfidenceInterval";
import { WhatIfSkillSimulator } from "./WhatIfSkillSimulator";
import { KeyRiskDriversPanel } from "./KeyRiskDriversPanel";

interface Props {
  result: ScoreResult | EnsembleResult;
  roleTitle: string;
  companyName: string;
  dataUpdatedDate?: string;
  // ── ENHANCEMENT: Data quality flag from LayoffCalculator ────────────────────
  dataQuality?: 'live' | 'partial' | 'fallback';
  // ── DISPLACEMENT TRAJECTORY props ─────────────────────────────────────
  oracleResult?: OracleResult | null;
  experience?: string;
  roleKey?: string;
  // ── ORACLE INTELLIGENCE props ──────────────────────────────────────────
  careerIntelligence?: CareerIntelligence | null;
  onSave: () => void;
  onShare: () => void;
  onRetake: () => void;
  onSwitchTab?: (tabId: string) => void;
}

// ── Type guard ───────────────────────────────────────────────────
const isEnsemble = (r: any): r is EnsembleResult => "ensembleScore" in r;

// ── Classification Badge (Spy-Themed) ─────────────────────────────────
const ClassificationBadge: React.FC<{
  score: number;
  companyName: string;
  roleTitle: string;
  timestamp: string;
}> = ({ score, companyName, roleTitle, timestamp }) => {
  // Determine classification based on score
  const getClassification = (s: number): { level: string; color: string } => {
    if (s >= 75) return { level: "TOP SECRET", color: "#ef4444" };
    if (s >= 55) return { level: "CONFIDENTIAL", color: "#f97316" };
    if (s >= 35) return { level: "RESTRICTED", color: "#f59e0b" };
    return { level: "UNCLASSIFIED", color: "#10b981" };
  };

  const classification = getClassification(score);

  return (
    <div
      style={{
        background: "rgba(10, 15, 25, 0.95)",
        border: `1px solid ${classification.color}40`,
        borderRadius: "8px",
        padding: "16px 20px",
        marginBottom: "24px",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}
    >
      {/* Classification Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          paddingBottom: "12px",
          borderBottom: `1px solid ${classification.color}20`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: classification.color,
              boxShadow: `0 0 10px ${classification.color}`,
            }}
          />
          <span
            style={{
              color: classification.color,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            {classification.level}
          </span>
        </div>
        <span
          style={{
            color: "var(--alpha-text-35)",
            fontSize: "0.65rem",
            letterSpacing: "1px",
          }}
        >
          HP-NETWORK SECURITY
        </span>
      </div>

      {/* Target Designation */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            color: "var(--alpha-text-50)",
            fontSize: "0.65rem",
            letterSpacing: "1px",
            marginBottom: "4px",
          }}
        >
          /// TARGET DESIGNATION ///
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: "1.1rem",
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          {companyName.toUpperCase()}
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.8rem",
            marginTop: "2px",
          }}
        >
          ROLE: {roleTitle.toUpperCase()}
        </div>
      </div>

      {/* Intel Timestamp */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.7rem",
          color: "var(--alpha-text-35)",
        }}
      >
        <span>INTEL TIMESTAMP</span>
        <span style={{ fontFamily: "monospace", color: "#00F5FF" }}>
          {timestamp}
        </span>
      </div>
    </div>
  );
};

// ── Accuracy Badge ────────────────────────────────────────────────
const AccuracyBadge: React.FC<{
  accuracyLabel: EnsembleResult["accuracyLabel"];
  confidencePercent: number;
  modelsUsed: string[];
}> = ({ accuracyLabel, confidencePercent, modelsUsed }) => {
  const colorMap: Record<string, string> = {
    teal: "#14b8a6",
    green: "#10b981",
    amber: "#f59e0b",
    gray: "#6b7280",
  };
  const c = colorMap[accuracyLabel.color] || "#6b7280";
  return (
    <div style={{ marginBottom: "20px", textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: `${c}15`,
          border: `1px solid ${c}40`,
          borderRadius: "24px",
          padding: "8px 18px",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            background: c,
            borderRadius: "50%",
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        />
        <span style={{ color: c, fontWeight: 600, fontSize: "0.85rem" }}>
          {accuracyLabel.label}
        </span>
        <span style={{ color: "#9ba5b4", fontSize: "0.8rem" }}>·</span>
        <span style={{ color: "#9ba5b4", fontSize: "0.8rem" }}>
          {confidencePercent}% confidence
        </span>
      </div>
      <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8rem" }}>
        {accuracyLabel.detail}
      </p>
      <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: "0.75rem" }}>
        Models:{" "}
        {modelsUsed
          .map(
            (m) =>
              ({
                engine: "Engine",
                "gemma-3-27b": "Gemma",
                "deepseek-v3": "DeepSeek",
                "llama-3.3-70b": "Llama",
                "gemini-2.0-flash": "Gemini",
              })[m] || m,
          )
          .join(" · ")}
      </p>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
};

// ── Swarm Intelligence Badge ──────────────────────────────────────────
const SwarmBadge: React.FC<{
  swarmScore: number;
  swarmConfidence: number;
  liveAgentsUsed: number;
  totalAgentsRun: number;
  categoryBreakdown: {
    market: number;
    company: number;
    ai: number;
    external: number;
  };
}> = ({
  swarmScore,
  swarmConfidence,
  liveAgentsUsed,
  totalAgentsRun,
  categoryBreakdown,
}) => {
  const isLive = liveAgentsUsed > 0;
  const accent = isLive ? "#10b981" : "#6b7280";
  const categories = [
    { label: "Market", val: categoryBreakdown.market },
    { label: "Company", val: categoryBreakdown.company },
    { label: "AI Risk", val: categoryBreakdown.ai },
    { label: "Macro", val: categoryBreakdown.external },
  ];
  return (
    <div
      style={{
        background: `${accent}10`,
        border: `1px solid ${accent}30`,
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              background: accent,
              borderRadius: "50%",
              animation: isLive ? "pulse 1.4s ease-in-out infinite" : "none",
            }}
          />
          <span
            style={{
              color: accent,
              fontWeight: 700,
              fontSize: "0.82rem",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Swarm Intelligence · {totalAgentsRun}/30 agents
          </span>
        </div>
        <span style={{ color: "#9ba5b4", fontSize: "0.8rem" }}>
          {isLive ? `⚡ ${liveAgentsUsed} live APIs` : "heuristic mode"}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        {categories.map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--alpha-bg-04)",
              borderRadius: "8px",
              padding: "6px 12px",
              textAlign: "center",
              flex: "1 1 60px",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "0.68rem",
                marginBottom: "2px",
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                color:
                  c.val >= 60 ? "#ef4444" : c.val >= 40 ? "#f59e0b" : "#10b981",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              {c.val}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.78rem",
          color: "#6b7280",
        }}
      >
        <span>
          Swarm risk score:{" "}
          <strong
            style={{
              color:
                swarmScore >= 65
                  ? "#ef4444"
                  : swarmScore >= 40
                    ? "#f59e0b"
                    : "#10b981",
            }}
          >
            {swarmScore}/100
          </strong>
        </span>
        <span>Confidence: {swarmConfidence}%</span>
      </div>
    </div>
  );
};

// ── Model Agreement Meter ─────────────────────────────────────────
const ModelAgreementMeter: React.FC<{
  modelAgreement: number;
  individualScores: EnsembleResult["individualScores"];
  hasOutlier: boolean;
  outlierModels: string[];
}> = ({ modelAgreement, individualScores, hasOutlier, outlierModels }) => {
  const modelShortName = (m: string) =>
    ({
      engine: "Engine",
      "gemma-3-27b": "Gemma",
      "deepseek-v3": "DeepSeek",
      "llama-3.3-70b": "Llama",
      "gemini-2.0-flash": "Gemini",
    })[m] || m;
  const scoreColor = (s: number) =>
    s >= 65 ? "#ef4444" : s >= 40 ? "#f59e0b" : "#10b981";
  const barColor =
    modelAgreement >= 80
      ? "#14b8a6"
      : modelAgreement >= 60
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      style={{
        background: "var(--alpha-bg-04)",
        border: "1px solid var(--alpha-bg-08)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span style={{ color: "#9ba5b4", fontSize: "0.85rem" }}>
          AI model consensus
        </span>
        <span
          style={{
            color: "#fff",
            fontWeight: 700,
            fontFamily: "monospace",
            fontSize: "0.95rem",
          }}
        >
          {modelAgreement}%
        </span>
      </div>
      <div
        style={{
          height: "6px",
          background: "var(--alpha-bg-08)",
          borderRadius: "3px",
          overflow: "hidden",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${modelAgreement}%`,
            background: barColor,
            borderRadius: "3px",
            transition: "width 1s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {individualScores.map((s) => (
          <div
            key={s.model}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "var(--alpha-bg-04)",
              border: `1px solid ${scoreColor(s.score)}30`,
              borderRadius: "8px",
              padding: "8px 12px",
              minWidth: "72px",
            }}
          >
            <span
              style={{
                color: "#9ba5b4",
                fontSize: "0.7rem",
                marginBottom: "4px",
              }}
            >
              {modelShortName(s.model)}
            </span>
            <span
              style={{
                color: scoreColor(s.score),
                fontWeight: 700,
                fontFamily: "monospace",
                fontSize: "1rem",
              }}
            >
              {Math.round(s.score)}%
            </span>
          </div>
        ))}
      </div>
      {hasOutlier && (
        <p
          style={{ margin: "12px 0 0", color: "#f59e0b", fontSize: "0.78rem" }}
        >
          ⚡ {outlierModels.map((m) => modelShortName(m)).join(", ")} flagged a
          different signal — Gemini synthesis applied to resolve.
        </p>
      )}
    </div>
  );
};

// ── AI Insight Cards ──────────────────────────────────────────────
const AIInsightCards: React.FC<{
  dominantRisk: string | null;
  keyProtection: string | null;
  timeHorizon: string | null;
  verificationNote: string | null;
  engineScore: number;
  ensembleScore: number;
}> = ({
  dominantRisk,
  keyProtection,
  timeHorizon,
  verificationNote,
  engineScore,
  ensembleScore,
}) => {
  const formatTimeHorizon = (h: string) =>
    ({
      "3months": "Next 3 months",
      "6months": "Next 6 months",
      "12months": "Within a year",
      beyond12months: "Beyond 12 months",
    })[h] || h;
  const adjustment = ensembleScore - engineScore;

  const cards = [
    dominantRisk && {
      id: "risk",
      emoji: "⚠",
      label: "Dominant risk",
      value: dominantRisk,
      borderColor: "#ef444440",
    },
    keyProtection && {
      id: "protect",
      emoji: "🛡",
      label: "Strongest protection",
      value: keyProtection,
      borderColor: "#10b98140",
    },
    timeHorizon && {
      id: "time",
      emoji: "⏱",
      label: "Risk window",
      value: formatTimeHorizon(timeHorizon),
      borderColor: "#a78bfa40",
    },
    verificationNote && {
      id: "ai",
      emoji: "◎",
      label: "AI synthesis",
      value: verificationNote,
      borderColor: "#60a5fa40",
    },
    Math.abs(adjustment) >= 3 && {
      id: "adj",
      emoji: adjustment > 0 ? "↑" : "↓",
      label: "Score adjustment vs engine",
      value: `${adjustment > 0 ? "+" : ""}${adjustment} points (AI consensus ${adjustment > 0 ? "higher" : "lower"} than deterministic engine)`,
      borderColor: "#f59e0b40",
    },
  ].filter(Boolean) as {
    id: string;
    emoji: string;
    label: string;
    value: string;
    borderColor: string;
  }[];

  if (!cards.length) return null;

  return (
    <div style={{ marginBottom: "24px" }}>
      <h4
        style={{
          color: "#9ba5b4",
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}
      >
        AI Insights
      </h4>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "10px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            style={{
              background: "var(--alpha-bg-04)",
              border: `1px solid ${card.borderColor}`,
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              {card.emoji} {card.label}
            </div>
            <div
              style={{ color: "#e5e7eb", fontSize: "0.9rem", lineHeight: 1.4 }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Animated counter for score reveal
//
// v15.0: Optional ciDelta surfaces the confidence interval directly on the
// hero ring as "{score}% ±N". When isEstimate is true (signal conflict, low
// freshness) the pill is replaced with "directional estimate" microcopy so
// users do not over-trust a precise number.
const AnimatedScore: React.FC<{
  target: number;
  color: string;
  size: number;
  ciDelta?: number;
  isEstimate?: boolean;
}> = ({ target, color, size, ciDelta, isEstimate }) => {
  const [current, setCurrent] = useState(0);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dashoffset = circumference - (current / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const getTierHex = (c: string) => {
    const map: Record<string, string> = {
      red: "#ef4444",
      orange: "#f97316",
      amber: "#f59e0b",
      green: "#10b981",
      teal: "#14b8a6",
    };
    return map[c] || "#14b8a6";
  };
  const hex = getTierHex(color);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
      role="img"
      aria-label={`Layoff risk score: ${target} percent`}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={hex}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: dashoffset,
            transition: "stroke 0.3s",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {current}%
        </span>
        <span
          style={{
            fontSize: "0.85rem",
            color: "#9ba5b4",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginTop: "4px",
          }}
        >
          layoff risk
        </span>
        {isEstimate ? (
          <span
            title="Signal conflicts or stale data widened the band — treat as directional"
            style={{
              marginTop: 6,
              fontSize: "0.7rem",
              color: "#f59e0b",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            directional estimate
          </span>
        ) : ciDelta != null && ciDelta > 0 ? (
          <span
            title={`Best estimate ${target}; with ~90% confidence the true value falls between ${Math.max(0, target - ciDelta)} and ${Math.min(100, target + ciDelta)}.`}
            style={{
              marginTop: 6,
              padding: "2px 8px",
              borderRadius: 12,
              background: "var(--alpha-bg-08)",
              fontSize: "0.78rem",
              color: "#cbd5e1",
              fontFamily: "var(--mono, ui-monospace, monospace)",
            }}
          >
            ±{ciDelta}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const layerDescriptions: Record<string, string> = {
  "Company health": "Financial strength, stock trend, and overstaffing signals from live OSINT",
  "Layoff history": "Recent layoffs, how many rounds, and sector-wide contagion signals",
  "Role exposure": "How automatable your specific role is and demand trend for your job",
  "Market conditions": "Industry-wide growth outlook and macro AI disruption pace",
  "Your profile": "Your tenure, performance, uniqueness, and internal relationships",
};

const LayerBar: React.FC<{ label: string; value: number; weight: string }> = ({
  label,
  value,
  weight,
}) => {
  const percentage = Math.round(value * 100);
  const [showTip, setShowTip] = React.useState(false);
  const getTierHex = (p: number) => {
    if (p > 70) return "#ef4444";
    if (p > 50) return "#f97316";
    if (p > 30) return "#f59e0b";
    return "#14b8a6";
  };
  const barColor = getTierHex(percentage);

  return (
    <div style={{ marginBottom: "16px", position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
          fontSize: "0.9rem",
        }}
      >
        <span
          style={{ color: "#d1d5db", cursor: "help", userSelect: "none" }}
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          {label}{" "}
          <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>
            ({weight})
          </span>
          {" "}<span style={{ color: "#4b5563", fontSize: "0.72rem" }}>ⓘ</span>
        </span>
        <span style={{ color: "#fff", fontFamily: "monospace" }}>
          {percentage}/100
        </span>
      </div>
      {showTip && layerDescriptions[label] && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: 50,
          background: "rgba(10,15,25,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "0.78rem",
          color: "#9ba5b4",
          maxWidth: "280px",
          lineHeight: 1.5,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {layerDescriptions[label]}
        </div>
      )}
      <div
        style={{
          height: "8px",
          background: "var(--alpha-text-25)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: barColor,
            borderRadius: "4px",
            transition: "width 1s ease-out",
          }}
        />
      </div>
    </div>
  );
};

const ProUpsellTrigger: React.FC<{ score: number }> = ({ score }) => {
  if (score < 55) return null;
  return (
    <div
      style={{
        marginTop: "32px",
        background:
          "linear-gradient(135deg, rgba(124,58,255,0.15), rgba(0,245,255,0.1))",
        border: "1px solid rgba(124,58,255,0.3)",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h3 style={{ margin: "0 0 16px", color: "#fff" }}>
        Your risk is elevated. Get your full protection plan.
      </h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 24px",
          textAlign: "left",
          color: "#d1d5db",
          fontSize: "0.95rem",
        }}
      >
        <li style={{ marginBottom: "8px" }}>
          ✨ Real-time alerts when your score changes
        </li>
        <li style={{ marginBottom: "8px" }}>
          ✨ Personalised 90-day job security plan
        </li>
        <li style={{ marginBottom: "8px" }}>✨ Monthly score recalculations</li>
        <li style={{ marginBottom: "8px" }}>
          ✨ PDF export — "My Layoff Risk Report"
        </li>
        <li>✨ Compare your score to 1,000s in your industry</li>
      </ul>
      <button
        style={{
          background: "var(--violet, #7C3AFF)",
          color: "#fff",
          border: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
        }}
      >
        Start Pro — $9/month →
      </button>
      <p
        style={{
          marginTop: "12px",
          marginBottom: 0,
          fontSize: "0.8rem",
          color: "#9ba5b4",
        }}
      >
        Cancel anytime. No commitments.
      </p>
    </div>
  );
};

// BUG-04 FIX: Show action plan for any elevated tier (amber=35+, orange=55+, red=75+)
// Tied to tier.color, not a raw score gate, so all amber/orange/red users get actions.
const shouldShowActionPlan = (tierColor: string): boolean => {
  return ["red", "orange", "amber"].includes(tierColor);
};

export const LayoffScoreDisplay: React.FC<Props> = ({
  result,
  roleTitle,
  companyName,
  dataUpdatedDate,
  dataQuality = 'live',
  oracleResult = null,
  experience = '5-10',
  roleKey = 'generic',
  careerIntelligence = null,
  onSave,
  onShare,
  onRetake,
  onSwitchTab,
}) => {
  const { score, tier, breakdown, disclaimer } = result;
  const ensembleData = isEnsemble(result) ? result : null;

  const relevantNews = React.useMemo(() => {
    if (!companyName) return undefined;
    const needle = companyName.toLowerCase();
    return layoffNewsCache.find(
      (n) => (n.companyName ?? '').toLowerCase() === needle,
    );
  }, [companyName]);

  const daysSinceUpdate = dataUpdatedDate
    ? Math.round(
        (Date.now() - new Date(dataUpdatedDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;
  const isStale = daysSinceUpdate > 7;

  const getTierHex = (c: string) => {
    const map: Record<string, string> = {
      red: "#ef4444",
      orange: "#f97316",
      amber: "#f59e0b",
      green: "#10b981",
      teal: "#14b8a6",
    };
    return map[c] || "#14b8a6";
  };
  const tierHex = getTierHex(tier.color);

  // Format timestamp for intel display
  const intelTimestamp =
    new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        animation: "fadeIn 0.5s ease-in",
      }}
    >
      {/* Classification Badge (Spy-Themed) */}
      <ClassificationBadge
        score={score}
        companyName={companyName}
        roleTitle={roleTitle}
        timestamp={intelTimestamp}
      />

      {/* ── ENHANCEMENT: Data Quality Warning Banner ───────────────────────── */}
      {dataQuality === 'fallback' && (
        <div
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "0.85rem",
            color: "#f59e0b",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
          <span>
            <strong>Limited company data available.</strong> We could not retrieve live financial signals for "{companyName}".
            Industry-average defaults were used — treat this score as a directional estimate, not a precise prediction.
          </span>
        </div>
      )}
      {dataQuality === 'partial' && (
        <div
          style={{
            background: "rgba(96,165,250,0.08)",
            border: "1px solid rgba(96,165,250,0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "20px",
            fontSize: "0.82rem",
            color: "#93c5fd",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>ℹ</span>
          <span>Some live data signals were unavailable. Score is based on available OSINT data + industry baselines.</span>
        </div>
      )}

      {relevantNews && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <h4
            style={{
              color: "#ef4444",
              margin: "0 0 8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠</span> Recent Layoff News Detected
          </h4>
          <p style={{ color: "#fff", margin: "0 0 8px", fontSize: "0.95rem" }}>
            {relevantNews.headline}
          </p>
          <div style={{ fontSize: "0.8rem", color: "#9ba5b4" }}>
            {new Date(relevantNews.date).toLocaleDateString()} ·{" "}
            {relevantNews.source}
          </div>
        </div>
      )}

      {isStale && (
        <div
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid #f59e0b",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
            fontSize: "0.85rem",
            color: "#f59e0b",
          }}
        >
          {/* BUG-B18 FIX: More explicit warning text for stale data */}
          <strong>Caution: Calibrated data is stale.</strong> This assessment was last refreshed {daysSinceUpdate} days ago. 
          Dynamic signals (layoffs, stock, growth) may no longer be accurate.
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <AnimatedScore
          target={score}
          color={tier.color}
          size={220}
          ciDelta={(() => {
            const ci = (result as any)?.confidenceInterval;
            if (!ci || typeof ci.low !== 'number' || typeof ci.high !== 'number') return undefined;
            return Math.round((ci.high - ci.low) / 2);
          })()}
          isEstimate={Boolean((result as any)?.confidenceInterval?.isEstimate)}
        />
        {/* ENHANCEMENT: Confidence interval below ring — epistemic honesty */}
        <ScoreConfidenceInterval
          score={score}
          dataQuality={dataQuality}
          isSeeded={Boolean((result as any).isSeeded ?? true)}
          modelsUsed={ensembleData?.modelsUsed ?? []}
        />
      </div>

      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: "20px",
            background: `${tierHex}18`,
            color: tierHex,
            border: `1px solid ${tierHex}`,
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          {tier.label}
        </div>
        <p
          style={{
            margin: 0,
            color: "#d1d5db",
            fontSize: "1.05rem",
            lineHeight: 1.5,
          }}
        >
          {tier.advice}
        </p>
      </div>

      {/* ── Ensemble accuracy badge (only shown when AI ensemble ran) ── */}
      {ensembleData && (
        <AccuracyBadge
          accuracyLabel={ensembleData.accuracyLabel}
          confidencePercent={ensembleData.confidencePercent}
          modelsUsed={ensembleData.modelsUsed}
        />
      )}

      {/* ── Swarm Intelligence Badge (live when API keys active) ── */}
      {ensembleData?.swarmReport && (
        <>
          <AgentNetworkDisplay
            activeAgents={ensembleData.swarmReport.totalAgentsRun}
            signalsIntercepted={ensembleData.swarmReport.totalAgentsRun * 3}
            categoryBreakdown={ensembleData.swarmReport.categoryBreakdown}
            dominantSignals={ensembleData.swarmReport.dominantSignals?.map(
              (s) => ({
                agentId: s.agentId,
                signal: s.signal,
                category: s.category,
              }),
            )}
          />
          <AgentBreakdownPanel
            signals={transformSignalsForDisplay(
              ensembleData.swarmReport.visualizationGraph?.nodes ||
                ensembleData.swarmReport.dominantSignals ||
                [],
              ensembleData.swarmReport.categoryBreakdown,
            )}
            swarmScore={ensembleData.swarmReport.swarmRiskScore}
            categoryBreakdown={ensembleData.swarmReport.categoryBreakdown}
          />
        </>
      )}

      {/* ── Model agreement meter ── */}
      {ensembleData && ensembleData.individualScores?.length > 0 && (
        <ModelAgreementMeter
          modelAgreement={ensembleData.modelAgreement}
          individualScores={ensembleData.individualScores}
          hasOutlier={ensembleData.hasOutlier}
          outlierModels={ensembleData.outlierModels}
        />
      )}

      {/* ── AI insight cards ── */}
      {ensembleData && (
        <AIInsightCards
          dominantRisk={ensembleData.dominantRisk}
          keyProtection={ensembleData.keyProtection}
          timeHorizon={ensembleData.timeHorizon}
          verificationNote={
            ensembleData.geminiSynthesis?.verificationNote ?? null
          }
          engineScore={ensembleData.engineScore}
          ensembleScore={ensembleData.ensembleScore}
        />
      )}

      {/* ── ORACLE INSIGHTS PANEL ─────────────────────────────────── */}
      {careerIntelligence && (
        <OracleInsightsPanel
          intelligence={careerIntelligence}
          roleKey={roleKey}
          experience={experience}
        />
      )}

      {/* ENHANCEMENT: What-If Skill Simulator — shown when seeded intel has safe skills */}
      {careerIntelligence && (
        <WhatIfSkillSimulator
          careerIntelligence={careerIntelligence}
          currentScore={score}
        />
      )}

      {/* ── DISPLACEMENT TRAJECTORY ─────────────────────────────────────── */}
      <DisplacementTrajectoryPanel
        currentScore={score}
        oracleResult={oracleResult}
        roleTitle={roleTitle}
        roleKey={roleKey}
        experience={experience}
        careerIntelligence={careerIntelligence}
      />

      {/* ── Data source row (fallback / legacy) ── */}
      <div
        style={{
          background: "var(--alpha-bg-04)",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#9ba5b4", fontSize: "0.85rem" }}>
          Data source:
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {ensembleData ? (
            <span
              style={{
                background: "rgba(0,245,255,0.15)",
                color: "#00F5FF",
                padding: "2px 10px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              4-AI ENSEMBLE
            </span>
          ) : (
            <span
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                color: "#10b981",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
            >
              LIVE OSINT
            </span>
          )}
          <strong style={{ color: "#fff" }}>{result.confidence}</strong>
          <span
            title="Based on AI ensemble analysis of public signals from 4 independent models."
            style={{ cursor: "help", color: "#6b7280" }}
          >
            ⓘ
          </span>
        </div>
      </div>

      {/* ── KEY RISK DRIVERS PANEL — FACT/INFERENCE/PREDICTION breakdown ── */}
      <KeyRiskDriversPanel
        breakdown={breakdown}
        roleTitle={roleTitle}
        companyName={companyName}
        dataQuality={dataQuality}
        dominantRisk={ensembleData?.dominantRisk}
        hasOutlier={ensembleData?.hasOutlier ?? false}
        outlierModels={ensembleData?.outlierModels ?? []}
        verificationNote={ensembleData?.geminiSynthesis?.verificationNote ?? null}
      />

      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ color: "#fff", marginBottom: "24px" }}>
          5-Layer Score Breakdown
        </h3>
        <LayerBar label="Company health" value={breakdown.L1} weight="30%" />
        <LayerBar label="Layoff history" value={breakdown.L2} weight="25%" />
        <LayerBar label="Role exposure" value={breakdown.L3} weight="20%" />
        <LayerBar label="Market conditions" value={breakdown.L4} weight="12%" />
        <LayerBar label="Your profile" value={breakdown.L5} weight="13%" />
      </div>

      {/* ── CONTROL SPLIT PANEL — Behavioural psychology: focus on what's changeable ── */}
      <div
        style={{
          marginBottom: "32px",
          border: "1px solid var(--alpha-bg-08)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "var(--alpha-bg-04)",
            padding: "12px 16px",
            borderBottom: "1px solid var(--alpha-bg-06)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#9ba5b4", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "monospace" }}>
            Risk Attribution Analysis
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.68rem",
              color: "#6b7280",
              fontFamily: "monospace",
            }}
          >
            Focus on what you can change
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {/* ── Left: External / Uncontrollable ── */}
          <div
            style={{
              padding: "16px",
              borderRight: "1px solid var(--alpha-bg-06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "1rem" }}>🌐</span>
              <span
                style={{
                  color: "#ef4444",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                External Factors
              </span>
            </div>
            <p
              style={{
                color: "#6b7280",
                fontSize: "0.72rem",
                margin: "0 0 12px",
                lineHeight: 1.5,
              }}
            >
              These signals reflect your company and market — outside your direct control.
            </p>
            {[
              { label: "Company health", val: Math.round(breakdown.L1 * 100), wt: "30%" },
              { label: "Layoff history", val: Math.round(breakdown.L2 * 100), wt: "25%" },
              { label: "Market conditions", val: Math.round(breakdown.L4 * 100), wt: "5%" },
            ].map(({ label, val, wt }) => {
              const c = val > 70 ? "#ef4444" : val > 50 ? "#f97316" : val > 30 ? "#f59e0b" : "#10b981";
              return (
                <div key={label} style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem",
                      marginBottom: "3px",
                    }}
                  >
                    <span style={{ color: "#9ba5b4" }}>{label} <span style={{ color: "#4b5563" }}>({wt})</span></span>
                    <span style={{ color: c, fontFamily: "monospace", fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ height: "4px", background: "var(--alpha-bg-06)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${val}%`, background: c, borderRadius: "2px", transition: "width 1s ease-out" }} />
                  </div>
                </div>
              );
            })}
            <div
              style={{
                marginTop: "10px",
                padding: "8px 10px",
                background: "rgba(239,68,68,0.06)",
                borderRadius: "6px",
                fontSize: "0.7rem",
                color: "#9ba5b4",
                lineHeight: 1.4,
              }}
            >
              💡 Watch for company news, earnings trends, and sector headlines — these shift your score the most.
            </div>
          </div>

          {/* ── Right: Within Your Control ── */}
          <div style={{ padding: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "12px",
              }}
            >
              <span style={{ fontSize: "1rem" }}>🧠</span>
              <span
                style={{
                  color: "#10b981",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                }}
              >
                Within Your Control
              </span>
            </div>
            <p
              style={{
                color: "#6b7280",
                fontSize: "0.72rem",
                margin: "0 0 12px",
                lineHeight: 1.5,
              }}
            >
              These factors respond directly to your choices. This is where to focus your energy.
            </p>
            {[
              { label: "Role exposure", val: Math.round(breakdown.L3 * 100), wt: "25%", action: "Learn AI tools for your domain" },
              { label: "Your profile", val: Math.round(breakdown.L5 * 100), wt: "15%", action: "Build relationships, seek promotion" },
            ].map(({ label, val, wt, action }) => {
              const c = val > 70 ? "#ef4444" : val > 50 ? "#f97316" : val > 30 ? "#f59e0b" : "#10b981";
              return (
                <div key={label} style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem",
                      marginBottom: "3px",
                    }}
                  >
                    <span style={{ color: "#9ba5b4" }}>{label} <span style={{ color: "#4b5563" }}>({wt})</span></span>
                    <span style={{ color: c, fontFamily: "monospace", fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ height: "4px", background: "var(--alpha-bg-06)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${val}%`, background: c, borderRadius: "2px", transition: "width 1s ease-out" }} />
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#4b5563", marginTop: "3px" }}>→ {action}</div>
                </div>
              );
            })}
            <div
              style={{
                marginTop: "10px",
                padding: "8px 10px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: "6px",
                fontSize: "0.7rem",
                color: "#9ba5b4",
                lineHeight: 1.4,
              }}
            >
              💡 A 20-point drop in Role Exposure can reduce your overall risk by up to 5 points. See the roadmap below.
            </div>
          </div>
        </div>
      </div>


      <p
        style={{
          fontSize: "0.8rem",
          color: "#6b7280",
          fontStyle: "italic",
          textAlign: "center",
          padding: "16px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          marginBottom: "32px",
        }}
      >
        {disclaimer}
      </p>

      {/* BUG-04 FIX: Show action plan based on tier color (amber/orange/red), not raw score gate */}
      {shouldShowActionPlan(tier.color) && (
        <LayoffActionPlan
          score={score}
          tierColor={tier.color}
          role={roleTitle}
          onSwitchTab={onSwitchTab}
        />
      )}

      <ProUpsellTrigger score={score} />

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "32px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onSave}
          aria-label="Save score to history"
          style={{
            flex: 1,
            padding: "12px",
            background: "rgba(0,245,255,0.1)",
            color: "var(--cyan, #00F5FF)",
            border: "1px solid rgba(0,245,255,0.3)",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Save to history
        </button>
        <button
          onClick={onShare}
          aria-label="Share score"
          style={{
            flex: 1,
            padding: "12px",
            background: "var(--cyan, #00F5FF)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          Share my score
        </button>
      </div>
      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <button
          onClick={onRetake}
          aria-label="Recalculate with different inputs"
          style={{
            background: "none",
            border: "none",
            color: "#9ba5b4",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Recalculate with different inputs
        </button>
      </div>
    </div>
  );
};
