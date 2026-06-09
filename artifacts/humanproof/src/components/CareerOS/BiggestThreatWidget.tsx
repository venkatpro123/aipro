import { motion } from "framer-motion";
import { AlertOctagon, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLayoff } from "../../context/LayoffContext";
import type { HybridResult } from "../../types/hybridResult";
import { ConfidenceSourceBadge } from "../shared/ConfidenceSourceBadge";
import { tierFromConfidence } from "../shared/DataSourceLabel";

const DIM_LABELS: Record<string, string> = {
  D1: "AI Displacement",
  D2: "Skills Obsolescence",
  D3: "Company Amplification",
  D4: "Industry Risk",
  D5: "Country Context",
  D6: "Experience Discount",
  D7: "Personal Factors",
  D8: "Calibration",
  L1: "Layoff Recency",
  L2: "Layoff Severity",
  L3: "Hiring Freeze",
  L4: "Revenue Shock",
  L5: "Leadership Exodus",
};

interface DimEntry { key: string; score: number; narrative?: string }

function extractTopDimension(hr: HybridResult): DimEntry | null {
  const breakdown = (hr as any).breakdown as Record<string, number> | null;
  if (!breakdown) return null;
  let topKey = "";
  let topVal = 0;
  for (const [k, v] of Object.entries(breakdown)) {
    if (typeof v === "number" && v > topVal) { topKey = k; topVal = v; }
  }
  if (!topKey) return null;
  const narrative = (hr as any).intelligenceBrief?.topRiskNarrative ?? null;
  // breakdown values are 0–1 scale; convert to 0–100 for display
  return { key: topKey, score: Math.round(topVal * 100), narrative };
}

export function BiggestThreatWidget() {
  const { state } = useLayoff();
  const { scoreResult } = state;
  const navigate = useNavigate();

  if (!scoreResult) {
    return (
      <motion.div
        className="card-premium"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, minHeight: 160, justifyContent: "center", alignItems: "center", textAlign: "center" }}
      >
        <Lock size={24} style={{ color: "var(--text-3)" }} />
        <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Run an audit to reveal your biggest threat</div>
        <button
          type="button"
          onClick={() => navigate('/terminal', { state: { newAudit: true } })}
          style={{
            background: "var(--cyan)", color: "#000", border: "none", borderRadius: 7,
            padding: "7px 16px", fontSize: "0.76rem", fontWeight: 800, cursor: "pointer",
          }}
        >
          Run Audit →
        </button>
      </motion.div>
    );
  }

  const hr = scoreResult as HybridResult;
  const dim = extractTopDimension(hr);

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="label-xs" style={{ color: "var(--text-3)" }}>BIGGEST THREAT</div>
        <AlertOctagon size={16} style={{ color: "#ef4444" }} />
      </div>

      {dim ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{
              fontSize: "2rem", fontFamily: "var(--font-display)", fontWeight: 800,
              color: "#ef4444", lineHeight: 1,
            }}>
              {dim.score}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                {DIM_LABELS[dim.key] ?? dim.key}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <div className="label-xs" style={{ color: "var(--text-3)" }}>Risk Dimension {dim.key}</div>
                <ConfidenceSourceBadge source={tierFromConfidence(hr.confidencePercent ?? null)} />
              </div>
            </div>
          </div>

          {dim.narrative && (
            <div style={{
              fontSize: "0.79rem", color: "var(--text-2)", lineHeight: 1.5,
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 8, padding: "10px 12px",
            }}>
              {dim.narrative.slice(0, 120)}{dim.narrative.length > 120 ? "…" : ""}
            </div>
          )}

          <button
            onClick={() => navigate('/terminal', { state: { newAudit: true } })}
            style={{
              background: "transparent", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
              color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, padding: "6px 0",
              cursor: "pointer", width: "100%", transition: "all 150ms",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            View Breakdown →
          </button>
        </>
      ) : (
        <div style={{ fontSize: "0.8rem", color: "var(--text-3)", padding: "12px 0" }}>
          Breakdown data unavailable for this audit.
        </div>
      )}
    </motion.div>
  );
}
