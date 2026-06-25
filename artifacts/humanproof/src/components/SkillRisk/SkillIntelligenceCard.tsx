import React from "react";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  Skill,
  SkillInsight,
  RiskFactors,
  SubSkill,
} from "../../types/skillRisk";

interface Props {
  skill: Skill;
  insight: SkillInsight;
  isHydrating?: boolean;
}

const FactorGauge = ({ label, value, color, icon: Icon }: any) => (
  <div style={{ marginBottom: 16 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text2)",
          fontSize: "0.75rem",
          fontFamily: "var(--mono)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <Icon size={14} />
        {label}
      </div>
      <span
        style={{
          color:
            value > 70
              ? "var(--red)"
              : value > 30
                ? "var(--cyan)"
                : "var(--emerald)",
          fontFamily: "var(--mono)",
          fontSize: "0.8rem",
          fontWeight: 600,
        }}
      >
        {value}%
      </span>
    </div>
    <div
      style={{
        height: 6,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          boxShadow: `0 0 10px ${color}44`,
          transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  </div>
);

export const SkillIntelligenceCard: React.FC<Props> = ({
  skill,
  insight,
  isHydrating,
}) => {
  const factors = skill.factors || insight?.factors;
  const subSkills = skill.subSkills || insight?.subSkills || [];

  if (isHydrating) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(0,245,255,0.1)",
            borderTopColor: "var(--cyan)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <div
          style={{
            color: "var(--cyan)",
            fontFamily: "var(--mono)",
            fontSize: "0.8rem",
            textTransform: "uppercase",
          }}
        >
          Hydrating Decision Intelligence...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        animation: "fadeIn 0.5s ease-out",
      }}
    >
      {/* Top Bar: Core Score */}
      <div
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid var(--alpha-bg-06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              color: "var(--text)",
              fontWeight: 600,
            }}
          >
            {skill.name}
          </h3>
          <div
            style={{ color: "var(--text2)", fontSize: "0.8rem", marginTop: 4 }}
          >
            {skill.category} • {insight?.source || "Standard Analysis"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text2)",
              textTransform: "uppercase",
              marginBottom: 4,
              fontFamily: "var(--mono)",
            }}
          >
            Risk Score
          </div>
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              lineHeight: 1,
              color:
                skill.riskScore > 70
                  ? "var(--red)"
                  : skill.riskScore > 30
                    ? "var(--cyan)"
                    : "var(--emerald)",
              fontFamily: "var(--mono)",
            }}
          >
            {skill.riskScore}
          </div>
          {/* Score Explanation Badge */}
          <div
            style={{
              fontSize: "0.6rem",
              color: "var(--text2)",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
              justifyContent: "flex-end",
            }}
          >
            <AlertCircle size={10} />
            {skill.riskScore > 70
              ? "High automation risk"
              : skill.riskScore > 30
                ? "Moderate exposure"
                : "Human-centric role"}
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0 }}
      >
        {/* Left Side: Analysis & Factors */}
        <div
          style={{
            padding: 32,
            borderRight: "1px solid var(--alpha-bg-06)",
          }}
        >
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--cyan)",
                fontSize: "0.75rem",
                fontFamily: "var(--mono)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              <Zap size={14} />
              Intelligence Analysis
            </div>
            <p
              style={{
                color: "var(--text)",
                fontSize: "0.95rem",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {insight?.threat ||
                "Deep analysis of market displacement and automation vectors pending..."}
            </p>
            {insight?.why_protected && (
              <p
                style={{
                  color: "var(--emerald)",
                  fontSize: "0.9rem",
                  marginTop: 12,
                  fontStyle: "italic",
                }}
              >
                <ShieldCheck
                  size={14}
                  style={{
                    display: "inline",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                {insight.why_protected}
              </p>
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text2)",
                fontSize: "0.75rem",
                fontFamily: "var(--mono)",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <Activity size={14} />
              Risk Factors Breakdown
            </div>
            {factors ? (
              <>
                <FactorGauge
                  label="Automation Feasibility"
                  value={factors.automation}
                  color="var(--red)"
                  icon={Activity}
                />
                <FactorGauge
                  label="Human Judgment Req."
                  value={factors.judgment}
                  color="var(--cyan)"
                  icon={ShieldCheck}
                />
                <FactorGauge
                  label="Physical / Embodied"
                  value={factors.physical}
                  color="var(--emerald)"
                  icon={Layers}
                />
                <FactorGauge
                  label="Creative Originality"
                  value={factors.creativity}
                  color="var(--violet)"
                  icon={Sparkles}
                />
              </>
            ) : (
              <div
                style={{
                  padding: 16,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  color: "var(--text2)",
                  textAlign: "center",
                }}
              >
                Factors pending hydration...
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Decomposition & Action */}
        <div style={{ padding: 32, background: "rgba(255,255,255,0.01)" }}>
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text2)",
                fontSize: "0.75rem",
                fontFamily: "var(--mono)",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <Layers size={14} />
              Skill Decomposition
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {subSkills.map((sub: SubSkill, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 8,
                    border: "1px solid var(--alpha-bg-06)",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                    {sub.name}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 4,
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${sub.riskScore}%`,
                          background:
                            sub.riskScore > 70
                              ? "var(--red)"
                              : sub.riskScore > 30
                                ? "var(--cyan)"
                                : "var(--emerald)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "var(--mono)",
                        color: "var(--text2)",
                        minWidth: 24,
                      }}
                    >
                      {sub.riskScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,245,255,0.05)",
              border: "1px solid rgba(0,245,255,0.1)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--cyan)",
                fontSize: "0.75rem",
                fontFamily: "var(--mono)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              <ShieldCheck size={14} />
              Strategic Pivot
            </div>
            <p
              style={{
                color: "var(--text)",
                fontSize: "0.9rem",
                lineHeight: 1.5,
                margin: 0,
                fontWeight: 500,
              }}
            >
              {insight?.pivot || "Assessing strategic repositioning options..."}
            </p>
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(0,245,255,0.1)",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  fontFamily: "var(--mono)",
                }}
              >
                Next Action Step
              </div>
              <div
                style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
              >
                <ChevronRight
                  size={14}
                  color="var(--cyan)"
                  style={{ marginTop: 2 }}
                />
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--cyan)",
                    fontWeight: 600,
                  }}
                >
                  {insight?.action || "Awaiting ensemble consensus..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
