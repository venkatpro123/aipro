import { motion } from "framer-motion";
import { Shield, Zap } from "lucide-react";
import { useHumanProof } from "../../context/HumanProofContext";
import { ConfidenceSourceBadge } from "../shared/ConfidenceSourceBadge";

function getStrengthColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#f59e0b";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}

function getStrengthLabel(score: number): string {
  if (score >= 75) return "STRONG";
  if (score >= 55) return "GOOD";
  if (score >= 35) return "DEVELOPING";
  return "AT RISK";
}

export function CareerStrengthWidget() {
  const { state } = useHumanProof();
  const { humanScore, jobRiskScore } = state;

  // Blend HII (humanScore) + inverse of job risk as career strength proxy
  let strengthScore: number | null = null;
  if (humanScore != null && jobRiskScore != null) {
    strengthScore = Math.round(humanScore * 0.6 + (100 - jobRiskScore) * 0.4);
  } else if (humanScore != null) {
    strengthScore = Math.round(humanScore);
  } else if (jobRiskScore != null) {
    strengthScore = Math.round(100 - jobRiskScore);
  }

  const color = strengthScore != null ? getStrengthColor(strengthScore) : "var(--text-3)";

  const dims = [
    { label: "Human Index", value: humanScore != null ? Math.round(humanScore) : null },
    { label: "Market Fit", value: jobRiskScore != null ? Math.round(100 - jobRiskScore) : null },
  ];

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="label-xs" style={{ color: "var(--text-3)", marginBottom: 4 }}>CAREER STRENGTH</div>
        </div>
        <Shield size={18} style={{ color: strengthScore != null ? color : "var(--text-3)" }} />
      </div>

      {strengthScore != null ? (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "3.5rem", fontFamily: "var(--font-display)", fontWeight: 800,
              color, textShadow: `0 0 30px ${color}55`, lineHeight: 1,
            }}>
              {strengthScore}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
              <div className="label-xs" style={{ color, opacity: 0.8, letterSpacing: "0.14em" }}>
                {getStrengthLabel(strengthScore)}
              </div>
              <ConfidenceSourceBadge source="ESTIMATED" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dims.map(d => d.value != null && (
              <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>{d.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 60, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${d.value}%`, background: color,
                      borderRadius: 2, transition: "width 600ms ease",
                    }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-2)", minWidth: 24, textAlign: "right" }}>
                    {d.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Zap size={28} style={{ color: "var(--text-3)", marginBottom: 8 }} />
          <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
            Complete skill assessment to unlock
          </div>
        </div>
      )}
    </motion.div>
  );
}
