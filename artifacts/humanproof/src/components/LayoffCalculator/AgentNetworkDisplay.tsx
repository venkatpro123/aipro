// AgentNetworkDisplay.tsx
// Visual representation of the 30-agent swarm intelligence network
// Phase 3: Agent Network Visualization

import React, { useState, useEffect } from "react";

interface Agent {
  id: string;
  category: "market" | "company" | "ai" | "external";
  signal: number;
  label: string;
  status: "active" | "complete" | "pending";
}

// Agent naming convention (creates "3000 agents" feeling)
const AGENT_REGISTRY: { category: string; prefix: string; count: number }[] = [
  { category: "market", prefix: "ALPHA", count: 8 },
  { category: "company", prefix: "BRAVO", count: 8 },
  { category: "ai", prefix: "CHARLIE", count: 8 },
  { category: "external", prefix: "DELTA", count: 6 },
];

const generateAgents = (): Agent[] => {
  const agents: Agent[] = [];
  AGENT_REGISTRY.forEach(({ category, prefix, count }) => {
    for (let i = 1; i <= count; i++) {
      agents.push({
        id: `${prefix}-${i}`,
        category: category as Agent["category"],
        signal: 0,
        label: `${prefix}-${i}`,
        status: "pending",
      });
    }
  });
  return agents;
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    market: "#10b981",
    company: "#f97316",
    ai: "#a78bfa",
    external: "#60a5fa",
  };
  return colors[category] || "#6b7280";
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    market: "Market Signals",
    company: "Company Signals",
    ai: "AI Signals",
    external: "External Signals",
  };
  return labels[category] || category;
};

interface Props {
  activeAgents?: number;
  signalsIntercepted?: number;
  categoryBreakdown?: {
    market: number;
    company: number;
    ai: number;
    external: number;
  };
  dominantSignals?: { agentId: string; signal: number; category: string }[];
}

export const AgentNetworkDisplay: React.FC<Props> = ({
  activeAgents = 30,
  signalsIntercepted = 45,
  categoryBreakdown,
  dominantSignals = [],
}) => {
  const [agents, setAgents] = useState<Agent[]>(generateAgents());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Simulate agent activation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAgents((prev) =>
        prev.map((agent, i) => ({
          ...agent,
          status: i < activeAgents ? "complete" : "pending",
          signal: i < activeAgents ? Math.random() * 0.5 + 0.3 : 0,
        })),
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [activeAgents]);

  const categoryCounts = agents.reduce(
    (acc, agent) => {
      if (agent.status === "complete") {
        acc[agent.category] = (acc[agent.category] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalActive = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        background: "rgba(10, 15, 25, 0.95)",
        border: "1px solid rgba(0, 245, 255, 0.15)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
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
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#00F5FF",
              boxShadow: "0 0 15px #00F5FF",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: "#00F5FF",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "1px",
            }}
          >
            SWARM INTELLIGENCE NETWORK
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              padding: "4px 10px",
              fontSize: "0.7rem",
              background:
                viewMode === "grid" ? "rgba(0, 245, 255, 0.2)" : "transparent",
              border: "1px solid",
              borderColor:
                viewMode === "grid" ? "#00F5FF" : "rgba(255,255,255,0.1)",
              color: viewMode === "grid" ? "#00F5FF" : "rgba(255,255,255,0.5)",
              borderRadius: "4px",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            GRID
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "4px 10px",
              fontSize: "0.7rem",
              background:
                viewMode === "list" ? "rgba(0, 245, 255, 0.2)" : "transparent",
              border: "1px solid",
              borderColor:
                viewMode === "list" ? "#00F5FF" : "rgba(255,255,255,0.1)",
              color: viewMode === "list" ? "#00F5FF" : "rgba(255,255,255,0.5)",
              borderRadius: "4px",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            LIST
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div
        className="agent-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            background: "rgba(0, 245, 255, 0.05)",
            border: "1px solid rgba(0, 245, 255, 0.1)",
            borderRadius: "8px",
            padding: "12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.65rem",
              marginBottom: "4px",
              letterSpacing: "1px",
            }}
          >
            DEPLOYED
          </div>
          <div
            style={{ color: "#00F5FF", fontSize: "1.4rem", fontWeight: 700 }}
          >
            {totalActive}/30
          </div>
        </div>
        <div
          style={{
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.1)",
            borderRadius: "8px",
            padding: "12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.65rem",
              marginBottom: "4px",
              letterSpacing: "1px",
            }}
          >
            SIGNALS
          </div>
          <div
            style={{ color: "#10b981", fontSize: "1.4rem", fontWeight: 700 }}
          >
            {signalsIntercepted}
          </div>
        </div>
        <div
          style={{
            background: "rgba(167, 139, 250, 0.05)",
            border: "1px solid rgba(167, 139, 250, 0.1)",
            borderRadius: "8px",
            padding: "12px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.65rem",
              marginBottom: "4px",
              letterSpacing: "1px",
            }}
          >
            NETWORK
          </div>
          <div
            style={{ color: "#a78bfa", fontSize: "1.4rem", fontWeight: 700 }}
          >
            3000+
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown && (
        <div
          className="agent-category-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {Object.entries(categoryBreakdown).map(([cat, val]) => (
            <div
              key={cat}
              className="agent-category-cell"
              style={{
                background: `${getCategoryColor(cat)}10`,
                border: `1px solid ${getCategoryColor(cat)}30`,
                borderRadius: "6px",
                padding: "8px 10px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: getCategoryColor(cat),
                  fontSize: "0.65rem",
                  marginBottom: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {getCategoryLabel(cat)}
              </div>
              <div
                style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}
              >
                {val}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Display */}
      {viewMode === "grid" ? (
        <div
          className="agent-node-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "6px",
          }}
        >
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                background:
                  agent.status === "complete"
                    ? `${getCategoryColor(agent.category)}15`
                    : "rgba(255,255,255,0.02)",
                border: `1px solid ${agent.status === "complete" ? getCategoryColor(agent.category) : "rgba(255,255,255,0.05)"}`,
                borderRadius: "4px",
                padding: "6px 8px",
                textAlign: "center",
                opacity: agent.status === "pending" ? 0.3 : 1,
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  color:
                    agent.status === "complete"
                      ? getCategoryColor(agent.category)
                      : "rgba(255,255,255,0.3)",
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  marginBottom: "2px",
                }}
              >
                {agent.id}
              </div>
              {agent.status === "complete" && (
                <div
                  style={{
                    height: "3px",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${agent.signal * 100}%`,
                      background: getCategoryColor(agent.category),
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {agents
            .filter((a) => a.status === "complete")
            .map((agent) => (
              <div
                key={agent.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: getCategoryColor(agent.category),
                  }}
                />
                <span style={{ color: "#fff", fontWeight: 600, flex: 1 }}>
                  {agent.id}
                </span>
                <span
                  style={{
                    color: getCategoryColor(agent.category),
                    fontWeight: 600,
                  }}
                >
                  {(agent.signal * 100).toFixed(0)}%
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Dominant Signals */}
      {dominantSignals.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(0, 245, 255, 0.1)",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.65rem",
              marginBottom: "8px",
              letterSpacing: "1px",
            }}
          >
            /// THREAT VECTORS IDENTIFIED ///
          </div>
          {dominantSignals.slice(0, 5).map((sig, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
                fontSize: "0.75rem",
              }}
            >
              <span
                style={{
                  color: getCategoryColor(sig.category),
                  fontWeight: 700,
                }}
              >
                {sig.agentId}
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
              <span
                style={{
                  color:
                    sig.signal >= 0.6
                      ? "#ef4444"
                      : sig.signal >= 0.4
                        ? "#f59e0b"
                        : "#10b981",
                }}
              >
                {(sig.signal * 100).toFixed(0)}% risk signal
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 15px #00F5FF; }
          50% { opacity: 0.5; box-shadow: 0 0 8px #00F5FF; }
        }
      `}</style>
    </div>
  );
};

export default AgentNetworkDisplay;
