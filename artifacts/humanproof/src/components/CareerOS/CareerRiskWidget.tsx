import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { useLayoff } from "../../context/LayoffContext";
import type { HybridResult } from "../../types/hybridResult";
import ScoreRing from "../ScoreRing";

function getRingColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score >= 50) return "#f97316";
  if (score >= 35) return "#f59e0b";
  return "#10b981";
}

function getTierLabel(score: number): string {
  if (score >= 75) return "CRITICAL";
  if (score >= 60) return "HIGH RISK";
  if (score >= 40) return "ELEVATED";
  if (score >= 20) return "MODERATE";
  return "LOW RISK";
}

export function CareerRiskWidget() {
  const { state } = useLayoff();
  const { scoreResult, companyName, roleTitle } = state;

  if (!scoreResult) {
    return (
      <motion.div
        className="card-premium"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, minHeight: 200, justifyContent: "center", alignItems: "center", textAlign: "center" }}
      >
        <AlertTriangle size={32} style={{ color: "var(--cyan)", opacity: 0.6 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 6 }}>No Audit Yet</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-3)", marginBottom: 16 }}>Run your first layoff audit to see your risk score here</div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "terminal" } }))}
            style={{
              background: "var(--cyan)", color: "#000", border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
            }}
          >
            Run First Audit →
          </button>
        </div>
      </motion.div>
    );
  }

  const hr = scoreResult as HybridResult;
  const score = hr.total ?? 0;
  const color = getRingColor(score);
  const delta = (hr as any).scoreDelta ?? null;

  // Use trajectoryPtsPerMonth if available; fall back to alertDrift computation
  const rawVelocity = (hr as any).trajectoryPtsPerMonth ?? null;
  const velocity: number | null = rawVelocity != null
    ? rawVelocity
    : state.alertDrift
      ? state.alertDrift.drift / Math.max(state.alertDrift.daysSince / 30, 1)
      : null;

  const TrendIcon = velocity == null ? Minus : velocity > 0 ? TrendingUp : TrendingDown;
  const trendColor = velocity == null ? "var(--text-3)" : velocity > 0 ? "#ef4444" : "#10b981";

  // Last-analyzed date from HybridResult or alertDrift
  const calcAt: string | null = (hr as any).calculatedAt ?? (hr as any).timestamp ?? null;
  const isStale = calcAt ? (Date.now() - new Date(calcAt).getTime()) > 30 * 24 * 60 * 60 * 1000 : false;
  const lastAnalyzedLabel = calcAt
    ? new Date(calcAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : state.alertDrift?.fromDate
      ? new Date(state.alertDrift.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="label-xs" style={{ color: "var(--text-3)", marginBottom: 4 }}>LAYOFF RISK</div>
          {companyName && <div style={{ fontSize: "0.82rem", color: "var(--text-2)", fontWeight: 500 }}>{companyName}{roleTitle ? ` · ${roleTitle}` : ""}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 700,
            color: trendColor, fontFamily: "var(--font-mono)",
          }}>
            <TrendIcon size={12} />
            {velocity != null ? `${Math.abs(velocity).toFixed(1)}/mo` : "Stable"}
          </div>
          {lastAnalyzedLabel && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: '0.65rem', color: isStale ? '#f59e0b' : 'rgba(255,255,255,0.25)',
            }}>
              <Clock size={9} />
              {isStale ? `Stale · ${lastAnalyzedLabel}` : lastAnalyzedLabel}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <ScoreRing score={score} color={color} size={140} isMobile scoreDelta={delta} velocityPtsPerMonth={velocity} />
      </div>

      <div style={{ textAlign: "center" }}>
        <span style={{
          display: "inline-block", padding: "3px 10px", borderRadius: 6,
          background: `${color}18`, border: `1px solid ${color}40`,
          fontSize: "0.7rem", fontWeight: 700, color, letterSpacing: "0.1em",
          fontFamily: "var(--font-mono)",
        }}>
          {getTierLabel(score)}
        </span>
      </div>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "terminal" } }))}
        style={{
          background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
          color: "var(--text-2)", fontSize: "0.78rem", fontWeight: 600, padding: "6px 0",
          cursor: "pointer", width: "100%", transition: "all 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--cyan)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
      >
        Full Audit →
      </button>
    </motion.div>
  );
}
