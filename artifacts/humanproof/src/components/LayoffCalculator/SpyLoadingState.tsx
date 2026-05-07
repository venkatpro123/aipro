// SpyLoadingState.tsx
// Premium spy-themed loading UI with intelligence network visualization
// Phase 1: Spy-Themed Loading Experience

import React, { useEffect, useState, useMemo } from "react";

interface Props {
  stage: number; // 0=initializing, 1=deploying, 2=analyzing, 3=synthesizing, 4=done
  companyName?: string;
  roleTitle?: string;
  agentCount?: number;
}

interface Phase {
  key: string;
  label: string;
  detail: string;
  icon: string;
}

const PHASES: Phase[] = [
  {
    key: "init",
    label: "INITIALIZING NETWORK",
    detail: "Activating intelligence infrastructure",
    icon: "⚡",
  },
  {
    key: "deploy",
    label: "DEPLOYING AGENTS",
    detail: "Sending 30+ field agents to target",
    icon: "🛫",
  },
  {
    key: "gather",
    label: "GATHERING INTELLIGENCE",
    detail: "Intercepting signals and data streams",
    icon: "📡",
  },
  {
    key: "analyze",
    label: "ANALYZING THREAT VECTORS",
    detail: "Cross-referencing market & company signals",
    icon: "🔍",
  },
  {
    key: "synthesize",
    label: "SYNTHESIZING REPORT",
    detail: "Compiling intelligence consensus",
    icon: "📋",
  },
];

const THREAT_LEVELS = [
  { max: 20, label: "MINIMAL THREAT", color: "#10b981", badge: "🟢" },
  { max: 35, label: "LOW THREAT", color: "#22c55e", badge: "🟢" },
  { max: 55, label: "MODERATE THREAT", color: "#eab308", badge: "🟡" },
  { max: 75, label: "ELEVATED THREAT", color: "#f97316", badge: "🟠" },
  { max: 100, label: "CRITICAL THREAT", color: "#ef4444", badge: "🔴" },
];

const getThreatLevel = (progress: number) => {
  return (
    THREAT_LEVELS.find((t) => progress <= t.max) ||
    THREAT_LEVELS[THREAT_LEVELS.length - 1]
  );
};

// Agent nodes for map visualization
const generateAgentNodes = (count: number) => {
  const nodes = [];
  const categories = ["market", "company", "ai", "external"];
  const categoryCount = Math.ceil(count / categories.length);

  let idx = 0;
  for (let cat = 0; cat < categories.length; cat++) {
    for (let i = 0; i < categoryCount && idx < count; i++) {
      nodes.push({
        id: `${categories[cat]}-${i}`,
        category: categories[cat],
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        delay: Math.random() * 2,
      });
      idx++;
    }
  }
  return nodes;
};

export const SpyLoadingState: React.FC<Props> = ({
  stage,
  companyName = "TARGET",
  roleTitle = "DESIGNATION",
  agentCount = 30,
}) => {
  const [signalsCollected, setSignalsCollected] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const [showTargetReveal, setShowTargetReveal] = useState(false);

  const agentNodes = useMemo(
    () => generateAgentNodes(agentCount),
    [agentCount],
  );

  // Simulate signal collection
  useEffect(() => {
    if (stage >= 1 && stage < 4) {
      const interval = setInterval(() => {
        setSignalsCollected((prev) => {
          const max = stage === 1 ? 30 : stage === 2 ? 60 : 90;
          return prev < max ? prev + Math.floor(Math.random() * 5) + 1 : max;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Simulate agent activation
  useEffect(() => {
    if (stage >= 1 && stage < 4) {
      const interval = setInterval(() => {
        setActiveAgents((prev) => {
          const target = stage === 1 ? 15 : stage === 2 ? 25 : 30;
          return prev < target ? prev + 1 : target;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [stage]);

  // Show target reveal animation
  useEffect(() => {
    if (companyName && companyName !== "TARGET") {
      const timer = setTimeout(() => setShowTargetReveal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [companyName]);

  const currentPhase = PHASES[Math.min(stage, PHASES.length - 1)];
  const progress = ((stage + 1) / (PHASES.length + 1)) * 100;
  const threat = getThreatLevel(progress);

  return (
    <div
      style={{
        maxWidth: "560px",
        margin: "40px auto",
        padding: "32px",
        background: "rgba(10, 15, 25, 0.95)",
        border: "1px solid rgba(0, 245, 255, 0.15)",
        borderRadius: "12px",
        boxShadow:
          "0 0 60px rgba(0, 245, 255, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}
    >
      {/* Header - Classification Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(0, 245, 255, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#00F5FF",
              boxShadow: "0 0 20px #00F5FF",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              color: "#00F5FF",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            {threat.badge} {threat.label}
          </span>
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.65rem",
            letterSpacing: "1px",
          }}
        >
          NETWORK SECURITY: ACTIVE
        </div>
      </div>

      {/* Target Designation */}
      {showTargetReveal && (
        <div
          style={{
            background: "rgba(0, 245, 255, 0.05)",
            border: "1px solid rgba(0, 245, 255, 0.2)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
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
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.75rem",
              marginTop: "4px",
            }}
          >
            ROLE: {roleTitle.toUpperCase()}
          </div>
        </div>
      )}

      {/* Agent Network Visualization */}
      <div
        style={{
          position: "relative",
          height: "180px",
          background:
            "radial-gradient(ellipse at center, rgba(0, 40, 60, 0.3) 0%, transparent 70%)",
          borderRadius: "8px",
          marginBottom: "24px",
          overflow: "hidden",
          border: "1px solid rgba(0, 245, 255, 0.1)",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
            linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
          `,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Center scan line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "0",
            right: "0",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.3), transparent)",
            animation: "scan 3s linear infinite",
          }}
        />

        {/* Agent nodes */}
        {agentNodes.map((node, i) => (
          <div
            key={node.id}
            style={{
              position: "absolute",
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: stage >= 1 ? "8px" : "0px",
              height: stage >= 1 ? "8px" : "0px",
              borderRadius: "50%",
              background:
                node.category === "market"
                  ? "#10b981"
                  : node.category === "company"
                    ? "#f97316"
                    : node.category === "ai"
                      ? "#a78bfa"
                      : "#60a5fa",
              boxShadow:
                stage >= 2
                  ? `0 0 12px ${node.category === "market" ? "#10b981" : node.category === "company" ? "#f97316" : node.category === "ai" ? "#a78bfa" : "#60a5fa"}`
                  : "none",
              opacity: i < activeAgents ? 1 : 0.2,
              transition: "all 0.5s ease",
              animation:
                i < activeAgents
                  ? `pulse-node ${2 + Math.random()}s ease-in-out infinite`
                  : "none",
            }}
          />
        ))}

        {/* Signal waves */}
        {stage >= 2 && (
          <>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "40px",
                height: "40px",
                border: "2px solid rgba(0, 245, 255, 0.3)",
                borderRadius: "50%",
                animation: "wave 2s ease-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "80px",
                height: "80px",
                border: "1px solid rgba(0, 245, 255, 0.2)",
                borderRadius: "50%",
                animation: "wave 2s ease-out infinite 0.5s",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "120px",
                height: "120px",
                border: "1px solid rgba(0, 245, 255, 0.1)",
                borderRadius: "50%",
                animation: "wave 2s ease-out infinite 1s",
              }}
            />
          </>
        )}

        {/* Stats overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            display: "flex",
            gap: "20px",
            fontSize: "0.7rem",
          }}
        >
          <div style={{ color: "rgba(255,255,255,0.5)" }}>
            <span style={{ color: "#10b981" }}>●</span> AGENTS: {activeAgents}/
            {agentCount}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)" }}>
            <span style={{ color: "#00F5FF" }}>◈</span> SIGNALS:{" "}
            {signalsCollected}
          </div>
        </div>
      </div>

      {/* v10.0: Data Intelligence Stream — live source bars */}
      {stage >= 1 && (
        <div style={{
          marginBottom: '20px',
          padding: '14px 16px',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(0,245,255,0.12)',
          borderRadius: '10px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 800,
            letterSpacing: '0.16em', color: 'rgba(0,245,255,0.6)',
            marginBottom: '10px', textTransform: 'uppercase',
          }}>
            ◈ Intelligence Data Streams
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Supabase Intelligence DB', delay: 0,    speed: 0.9, color: '#00d4e0' },
              { label: 'Financial Signals API',     delay: 200,  speed: 0.7, color: '#10b981' },
              { label: 'NewsAPI Sentiment',          delay: 400,  speed: 0.6, color: '#7c3aed' },
              { label: 'Layoffs.fyi Connector',     delay: 600,  speed: 0.8, color: '#f59e0b' },
              { label: 'SEC EDGAR Regulatory',      delay: 800,  speed: 0.5, color: '#06b6d4' },
              { label: 'Naukri Job Index',          delay: 1000, speed: 0.6, color: '#a78bfa' },
              { label: 'Swarm Analysis (30 agents)',delay: 1200, speed: 0.4, color: '#f97316' },
              { label: 'Intelligence Synthesis',    delay: 1600, speed: 0.3, color: '#ef4444' },
            ].map((src, i) => {
              const progress = Math.min(100, Math.max(0, ((stage - 1) * 25 + (i < 4 ? 30 : 10)) * src.speed));
              const status = progress >= 100 ? 'LIVE' : progress > 0 ? 'LOADING' : 'CACHED';
              return (
                <div key={src.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Source label */}
                  <div style={{
                    fontFamily: 'monospace', fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)',
                    width: '140px', flexShrink: 0, letterSpacing: '0.04em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {src.label}
                  </div>
                  {/* Fill bar */}
                  <div style={{
                    flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '2px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: src.color,
                      borderRadius: '2px',
                      boxShadow: progress > 0 ? `0 0 8px ${src.color}60` : 'none',
                      transition: `width ${1 / src.speed}s ease-out`,
                    }} />
                  </div>
                  {/* Status badge */}
                  <div style={{
                    fontFamily: 'monospace', fontSize: '0.5rem', fontWeight: 800,
                    color: status === 'LIVE' ? '#10b981' : status === 'LOADING' ? src.color : 'rgba(255,255,255,0.25)',
                    width: '44px', flexShrink: 0, letterSpacing: '0.08em',
                    textAlign: 'right',
                  }}>
                    {status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Phase Display */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>{currentPhase.icon}</span>
          <span
            style={{
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 600,
              letterSpacing: "1px",
            }}
          >
            {currentPhase.label}
          </span>
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.75rem",
            paddingLeft: "36px",
          }}
        >
          {currentPhase.detail}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "0.7rem",
          }}
        >
          <span
            style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "1px" }}
          >
            INTELLIGENCE GATHERED
          </span>
          <span
            style={{
              color: threat.color,
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            {Math.round(progress)}%
          </span>
        </div>
        <div
          style={{
            height: "6px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${threat.color}, rgba(0, 245, 255, 0.5))`,
              borderRadius: "3px",
              transition: "width 0.5s ease",
              boxShadow: `0 0 20px ${threat.color}40`,
            }}
          />
        </div>
      </div>

      {/* Phase Indicators */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          justifyContent: "center",
        }}
      >
        {PHASES.map((phase, i) => (
          <div
            key={phase.key}
            style={{
              width: i <= stage ? "24px" : "8px",
              height: "4px",
              borderRadius: "2px",
              background:
                i <= stage
                  ? phase.key === PHASES[stage].key
                    ? "#00F5FF"
                    : "#10b981"
                  : "rgba(255,255,255,0.1)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(0, 245, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.6rem",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "1px",
        }}
      >
        <span>
          NETWORK ID: HP-{Math.random().toString(36).substr(2, 6).toUpperCase()}
        </span>
        <span>{new Date().toISOString().replace("T", " ").slice(0, 19)}Z</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 20px #00F5FF; }
          50% { opacity: 0.5; box-shadow: 0 0 10px #00F5FF; }
        }
        @keyframes pulse-node {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 100%; }
        }
        @keyframes wave {
          0% { width: 40px; height: 40px; opacity: 0.8; }
          100% { width: 200px; height: 200px; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default SpyLoadingState;
