import { motion } from "framer-motion";
import { Sparkles, Lock, ArrowRight } from "lucide-react";
import { useLayoff } from "../../context/LayoffContext";
import type { HybridResult } from "../../types/hybridResult";

interface EscapePath {
  targetRole?: string;
  role?: string;
  scoreReduction?: number;
  effort?: string;
  demandScore?: number;
}

function extractTopEscapePath(hr: HybridResult): EscapePath | null {
  const paths = (hr as any).escapePaths as EscapePath[] | null;
  if (!paths || paths.length === 0) return null;
  return paths[0];
}

export function BiggestOpportunityWidget() {
  const { state } = useLayoff();
  const { scoreResult } = state;

  if (!scoreResult) {
    return (
      <motion.div
        className="card-premium"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, minHeight: 160, justifyContent: "center", alignItems: "center", textAlign: "center" }}
      >
        <Lock size={24} style={{ color: "var(--text-3)" }} />
        <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Run an audit to discover your top opportunity</div>
      </motion.div>
    );
  }

  const hr = scoreResult as HybridResult;
  const path = extractTopEscapePath(hr);

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.24 }}
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="label-xs" style={{ color: "var(--text-3)" }}>TOP OPPORTUNITY</div>
        <Sparkles size={16} style={{ color: "#10b981" }} />
      </div>

      {path ? (
        <>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 4 }}>
              {path.targetRole ?? path.role ?? "Career Pivot"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {path.scoreReduction != null && (
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                  background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
                  color: "#10b981", fontFamily: "var(--font-mono)",
                }}>
                  −{path.scoreReduction} risk pts
                </span>
              )}
              {path.effort && (
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600,
                  background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
                  color: "var(--text-2)",
                }}>
                  {path.effort} effort
                </span>
              )}
              {path.demandScore != null && (
                <span style={{
                  padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600,
                  background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
                  color: "var(--cyan)",
                }}>
                  {path.demandScore}% demand
                </span>
              )}
            </div>
          </div>

          <div style={{
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: "0.79rem", color: "var(--text-2)", lineHeight: 1.5 }}>
              This path reduces your layoff exposure while keeping your skills transferable.
            </div>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "terminal" } }))}
            style={{
              background: "transparent", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8,
              color: "#10b981", fontSize: "0.78rem", fontWeight: 600, padding: "6px 0",
              cursor: "pointer", width: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 6, transition: "all 150ms",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.08)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            Explore Escape Paths <ArrowRight size={13} />
          </button>
        </>
      ) : (
        <div style={{ fontSize: "0.8rem", color: "var(--text-3)", padding: "12px 0" }}>
          No escape path data yet. Re-run your audit for full intelligence.
        </div>
      )}
    </motion.div>
  );
}
