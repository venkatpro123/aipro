// MissionBriefing.tsx
// Mission briefing format for recommendations
// Phase 4: Mission Briefing Format

import React from "react";

interface MissionObjective {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  briefing: string;
  deadline: string;
  successCriteria: string;
  sourceAgents?: string[];
  /** Estimated risk-score reduction if this action is completed */
  riskReductionPct?: number;
}

interface Props {
  objectives: MissionObjective[];
}

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#f59e0b",
    LOW: "#10b981",
  };
  return colors[priority] || "#6b7280";
};

const getPriorityStamp = (priority: string): string => {
  const stamps: Record<string, string> = {
    CRITICAL: "🔴 CRITICAL MISSION",
    HIGH: "🟠 HIGH PRIORITY",
    MEDIUM: "🟡 STANDARD",
    LOW: "🟢 ROUTINE",
  };
  return stamps[priority] || priority;
};

const getPriorityBadge = (priority: string): string => {
  const badges: Record<string, string> = {
    CRITICAL: "🔴",
    HIGH: "🟠",
    MEDIUM: "🟡",
    LOW: "🟢",
  };
  return badges[priority] || "⚪";
};

export const MissionBriefing: React.FC<Props> = ({ objectives }) => {
  if (!objectives || objectives.length === 0) {
    return (
      <div
        style={{
          background: "rgba(10, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "center",
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>✅</div>
        <div style={{ color: "#10b981", fontWeight: 700, marginBottom: "8px" }}>
          ALL OBJECTIVES COMPLETE
        </div>
        <div style={{ color: "var(--alpha-text-55)", fontSize: "0.85rem" }}>
          Your risk profile is stable. Continue monitoring.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(10, 15, 25, 0.95)",
        border: "1px solid rgba(0, 245, 255, 0.15)",
        borderRadius: "12px",
        padding: "20px",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(0, 245, 255, 0.1)",
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>🎯</span>
        <div>
          <div
            style={{
              color: "#00F5FF",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "1px",
            }}
          >
            MISSION BRIEFING
          </div>
          <div
            style={{
              color: "var(--alpha-text-50)",
              fontSize: "0.7rem",
            }}
          >
            RECOMMENDED ACTIONS // {objectives.length} OBJECTIVES
          </div>
        </div>
      </div>

      {/* Objectives List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {objectives.map((obj, index) => {
          const color = getPriorityColor(obj.priority);
          const isCritical = obj.priority === "CRITICAL";

          return (
            <div
              key={obj.id || index}
              style={{
                background: isCritical
                  ? `${color}08`
                  : "var(--alpha-bg-04)",
                border: `1px solid ${color}${isCritical ? '50' : '30'}`,
                borderLeft: isCritical ? `3px solid ${color}` : undefined,
                borderRadius: "8px",
                padding: "16px",
                position: "relative",
                overflow: "hidden",
                boxShadow: isCritical ? `0 0 18px ${color}10` : undefined,
              }}
            >
              {/* Priority stamp — top-right */}
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "12px",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: color,
                  letterSpacing: "1px",
                  padding: "2px 8px",
                  border: `1px solid ${color}40`,
                  borderRadius: "4px",
                  background: `${color}10`,
                }}
              >
                {getPriorityStamp(obj.priority)}
              </div>

              {/* Risk reduction badge — bottom-right, only when actionable */}
              {typeof obj.riskReductionPct === 'number' && obj.riskReductionPct > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    right: "12px",
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.30)",
                    borderRadius: "6px",
                    padding: "2px 9px",
                    fontSize: "0.62rem",
                    color: "#10b981",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  ↓ −{obj.riskReductionPct}pt risk
                </div>
              )}

              {/* Mission ID */}
              <div
                style={{
                  color: "var(--alpha-text-35)",
                  fontSize: "0.65rem",
                  letterSpacing: "1px",
                  marginBottom: "8px",
                }}
              >
                /// MISSION OBJECTIVE: {getPriorityBadge(obj.priority)}{" "}
                {String(index + 1).padStart(2, "0")}
              </div>

              {/* Title */}
              <div
                style={{
                  color: "#fff",
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: "10px",
                  paddingRight: "80px",
                }}
              >
                {obj.title}
              </div>

              {/* Briefing */}
              <div
                style={{
                  color: "var(--alpha-text-70)",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  marginBottom: "12px",
                }}
              >
                {obj.briefing}
              </div>

              {/* Meta Info */}
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  fontSize: "0.75rem",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--alpha-bg-06)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span style={{ color: "var(--alpha-text-35)" }}>⏱</span>
                  <span style={{ color }}>DEADLINE: {obj.deadline}</span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span style={{ color: "var(--alpha-text-35)" }}>✓</span>
                  <span style={{ color: "var(--alpha-text-70)" }}>
                    SUCCESS: {obj.successCriteria}
                  </span>
                </div>
              </div>

              {/* Source Agents */}
              {obj.sourceAgents && obj.sourceAgents.length > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "0.7rem",
                    color: "var(--alpha-text-35)",
                  }}
                >
                  <span style={{ marginRight: "6px" }}>📡</span>
                  INTELLIGENCE SOURCE: {obj.sourceAgents.join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid rgba(0, 245, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.65rem",
          color: "var(--alpha-text-30)",
          letterSpacing: "1px",
        }}
      >
        <span>HP-INTEL // MISSION CONTROL</span>
        <span>{new Date().toISOString().replace("T", " ").slice(0, 16)}Z</span>
      </div>
    </div>
  );
};

// Helper to convert recommendations to mission objectives
export const recommendationsToMissions = (
  recommendations: {
    id: string;
    title: string;
    description: string;
    priority: string;
    layerFocus: string;
    riskReductionPct?: number;
    deadline?: string;
  }[],
): MissionObjective[] => {
  const priorityMap: Record<string, MissionObjective['priority']> = {
    Critical: "CRITICAL",
    High:     "HIGH",
    Medium:   "MEDIUM",
    Low:      "LOW",
  };

  const successMap: Record<string, string> = {
    CRITICAL: "Activate job search: 3 applications + network outreach sent",
    HIGH:     "Resume updated and submitted to 2+ external roles",
    MEDIUM:   "Complete upskill course or stakeholder meeting confirmed",
    LOW:      "Quarterly skill review scheduled",
  };

  return recommendations.map((rec, idx) => {
    const mappedPriority = priorityMap[rec.priority] || "MEDIUM";
    return {
      id:              rec.id || `mission-${idx}`,
      priority:        mappedPriority,
      title:           rec.title,
      briefing:        rec.description,
      deadline:        rec.deadline || (mappedPriority === 'CRITICAL' ? '7 days' : mappedPriority === 'HIGH' ? '14 days' : mappedPriority === 'MEDIUM' ? '30 days' : '90 days'),
      successCriteria: successMap[mappedPriority] || "Complete objective",
      riskReductionPct: rec.riskReductionPct ?? undefined,
      sourceAgents:    [
        rec.layerFocus
          ? `${rec.layerFocus.substring(0, 12).toUpperCase()}-LAYER`
          : "ENGINE-5L",
      ],
    };
  });
};

export default MissionBriefing;
