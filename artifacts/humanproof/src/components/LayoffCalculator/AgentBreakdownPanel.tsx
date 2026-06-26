// AgentBreakdownPanel.tsx
// Shows all 30 swarm agents with their individual signals and weighting explanation
// Addresses user confusion about high agent signals vs low final score

import React, { useMemo } from "react";

interface AgentSignalDisplay {
  agentId: string;
  category: string;
  signal: number; // Raw signal (0-1)
  signalPercent: number; // As percentage (0-100)
  confidence: number;
  sourceType: string;
  ageInDays: number;
  categoryWeight: number;
  finalContribution: number; // After all weighting
}

interface Props {
  signals: AgentSignalDisplay[];
  swarmScore: number;
  categoryBreakdown: {
    market: number;
    company: number;
    ai: number;
    external: number;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  market: 'var(--color-emerald-text)',
  company: 'var(--color-orange-text)',
  ai: "#a78bfa",
  external: "#60a5fa",
};

const CATEGORY_LABELS: Record<string, string> = {
  market: "Market Signals",
  company: "Company Signals",
  ai: "AI Signals",
  external: "External Signals",
};

const getCategoryWeight = (category: string): number => {
  const weights: Record<string, number> = {
    market: 0.32,
    company: 0.3,
    ai: 0.22,
    external: 0.16,
  };
  return weights[category] || 0.25;
};

export const AgentBreakdownPanel: React.FC<Props> = ({
  signals,
  swarmScore,
  categoryBreakdown,
}) => {
  const sortedBySignal = useMemo(() => {
    return [...signals].sort((a, b) => b.signalPercent - a.signalPercent);
  }, [signals]);

  const highRiskAgents = sortedBySignal.filter((s) => s.signalPercent >= 60);
  const mediumRiskAgents = sortedBySignal.filter(
    (s) => s.signalPercent >= 40 && s.signalPercent < 60,
  );
  const lowRiskAgents = sortedBySignal.filter((s) => s.signalPercent < 40);

  return (
    <div
      style={{
        background: "rgba(10, 15, 25, 0.95)",
        border: "1px solid rgba(0, 245, 255, 0.15)",
        borderRadius: "12px",
        padding: "20px",
        marginTop: "20px",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(0, 245, 255, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.2rem" }}>🔍</span>
          <span
            style={{
              color: "#00F5FF",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "1px",
            }}
          >
            AGENT SIGNAL BREAKDOWN
          </span>
        </div>
        <span style={{ color: "var(--alpha-text-50)", fontSize: "0.7rem" }}>
          {signals.length} agents analyzed
        </span>
      </div>

      {/* Category Weights Explanation */}
      <div
        style={{
          background: "rgba(0, 245, 255, 0.05)",
          border: "1px solid rgba(0, 245, 255, 0.1)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px",
          fontSize: "0.75rem",
        }}
      >
        <div style={{ color: "#00F5FF", marginBottom: "8px", fontWeight: 600 }}>
          ⚠️ WHY HIGH SIGNALS DON'T ALWAYS MEAN HIGH RISK
        </div>
        <div style={{ color: "var(--alpha-text-70)", lineHeight: 1.5 }}>
          Each agent is weighted by category (Market 32%, Company 30%, AI 22%,
          External 16%). Related agents compete in clusters, reducing their
          individual impact. Time decay also reduces older signals. Final score
          reflects aggregated, weighted consensus.
        </div>
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <span
              key={key}
              style={{
                fontSize: "0.65rem",
                color: CATEGORY_COLORS[key],
                background: `${CATEGORY_COLORS[key]}15`,
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {label}: {(getCategoryWeight(key) * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>

      {/* High Risk Agents */}
      {highRiskAgents.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              color: 'var(--color-red-text)',
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "1px",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🔴 HIGH RISK SIGNALS ({highRiskAgents.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {highRiskAgents.map((agent) => (
              <div
                key={agent.agentId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{
                    color: CATEGORY_COLORS[agent.category] || "#6b7280",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    minWidth: "100px",
                  }}
                >
                  {agent.agentId}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: "4px",
                      background: "var(--alpha-text-25)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${agent.signalPercent}%`,
                        background: 'var(--color-red-text)',
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>
                <span
                  style={{
                    color: 'var(--color-red-text)',
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    minWidth: "45px",
                    textAlign: "right",
                  }}
                >
                  {agent.signalPercent}%
                </span>
                <span
                  style={{
                    color: "var(--alpha-text-35)",
                    fontSize: "0.6rem",
                    minWidth: "50px",
                  }}
                >
                  w: {(agent.categoryWeight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medium Risk Agents */}
      {mediumRiskAgents.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              color: 'var(--color-amber500-text)',
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            🟡 MEDIUM RISK SIGNALS ({mediumRiskAgents.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {mediumRiskAgents.map((agent) => (
              <div
                key={agent.agentId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  borderRadius: "4px",
                }}
              >
                <span
                  style={{
                    color: CATEGORY_COLORS[agent.category],
                    fontSize: "0.65rem",
                  }}
                >
                  {agent.agentId}
                </span>
                <span
                  style={{
                    color: 'var(--color-amber500-text)',
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  {agent.signalPercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0, 245, 255, 0.1)",
        }}
      >
        {Object.entries(categoryBreakdown).map(([cat, val]) => (
          <div
            key={cat}
            style={{
              textAlign: "center",
              padding: "8px",
              background: `${CATEGORY_COLORS[cat]}10`,
              border: `1px solid ${CATEGORY_COLORS[cat]}30`,
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                color: CATEGORY_COLORS[cat],
                fontSize: "0.6rem",
                marginBottom: "4px",
              }}
            >
              {CATEGORY_LABELS[cat]}
            </div>
            <div
              style={{
                color:
                  val >= 50 ? 'var(--color-red-text)' : val >= 30 ? 'var(--color-amber500-text)' : 'var(--color-emerald-text)',
                fontSize: "1rem",
                fontWeight: 700,
              }}
            >
              {val}%
            </div>
          </div>
        ))}
      </div>

      {/* Final Score */}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(0, 245, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: "var(--alpha-text-50)", fontSize: "0.75rem" }}>
          WEIGHTED SWARM SCORE
        </span>
        <span
          style={{
            color:
              swarmScore >= 50
                ? 'var(--color-red-text)'
                : swarmScore >= 30
                  ? 'var(--color-amber500-text)'
                  : 'var(--color-emerald-text)',
            fontSize: "1.2rem",
            fontWeight: 700,
          }}
        >
          {swarmScore}/100
        </span>
      </div>
    </div>
  );
};

// Helper to transform raw signals to display format
export const transformSignalsForDisplay = (
  signals: any[],
  categoryBreakdown: any,
): AgentSignalDisplay[] => {
  const categoryWeights: Record<string, number> = {
    market: 0.32,
    company: 0.3,
    ai: 0.22,
    external: 0.16,
  };

  return signals.map((s) => ({
    agentId: s.agentId,
    category: s.category,
    signal: s.signal,
    signalPercent: Math.round(s.signal * 100),
    confidence: s.confidence,
    sourceType: s.sourceType,
    ageInDays: s.ageInDays,
    categoryWeight: categoryWeights[s.category] || 0.25,
    finalContribution: s.signal * (categoryWeights[s.category] || 0.25),
  }));
};

export default AgentBreakdownPanel;
