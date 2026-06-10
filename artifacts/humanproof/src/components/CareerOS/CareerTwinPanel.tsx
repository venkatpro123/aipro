// CareerTwinPanel.tsx — Phase 5 (Career OS)
//
// Visualizes the LIVING twin model — how it has evolved and what it has learned:
//   • Twin health tier (sparse → partial → rich) with the next-tier requirement
//   • Score trajectory sparkline from career_twin_state.audit_score_history
//   • Per-dimension action success rates from outcome_success_rates
//   • The intelligence loop's single "what the system needs this week" ask
//
// Self-contained: loads its own twin living-state + loop state on mount. Renders
// a sparse-state nudge when the twin has no history yet.

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { loadTwinLivingState, type TwinLivingState } from "../../services/careerTwinService";
import { getIntelligenceLoopState, type IntelligenceLoopState } from "../../services/intelligenceLoopService";

const ACCENT = "#a78bfa";

const DIM_LABELS: Record<string, string> = {
  L1: "Financial Resilience",
  L2: "Company Stability",
  L3: "AI Adaptation",
  L4: "Industry Position",
  L5: "Regional Mobility",
  D1: "AI Adaptation",
  D2: "Skill Portfolio",
  D3: "Company Signals",
  D4: "Performance",
  D5: "Network",
  D6: "Experience",
  D7: "Compensation",
  D8: "Market Demand",
};

const HEALTH_TIERS: Record<TwinLivingState["twinHealth"], { label: string; pct: number; color: string; next: string }> = {
  sparse:  { label: "Sparse",  pct: 33,  color: "#ef4444", next: "Add skills + a goal to reach Partial" },
  partial: { label: "Partial", pct: 66,  color: "#f59e0b", next: "Add financial context to reach Rich" },
  rich:    { label: "Rich",    pct: 100, color: "#10b981", next: "Fully populated — keep reporting outcomes" },
};

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 220, h = 44, pad = 4;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1];
  const first = points[0];
  // Risk score: rising = worse (red), falling = better (green)
  const lineColor = last > first ? "#ef4444" : last < first ? "#10b981" : ACCENT;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={coords.join(" ")} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => {
        const [x, y] = c.split(",");
        return <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 3 : 1.6} fill={lineColor} />;
      })}
    </svg>
  );
}

export function CareerTwinPanel() {
  const { user } = useAuth();
  const [living, setLiving] = useState<TwinLivingState | null>(null);
  const [loop, setLoop] = useState<IntelligenceLoopState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([loadTwinLivingState(), getIntelligenceLoopState(user.id)])
      .then(([ls, lp]) => {
        if (cancelled) return;
        setLiving(ls);
        setLoop(lp);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0", fontSize: 14 }}>Loading your Career Twin…</div>;
  }

  if (!user || !living || living.scoreHistory.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", background: "rgba(167,139,250,0.05)", borderRadius: 16, border: "1px solid rgba(167,139,250,0.15)" }}>
        <div style={{ fontSize: 38, marginBottom: 14 }}>🧬</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 8 }}>Your Career Twin is just getting started</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
          Run audits, complete actions, and report outcomes. The twin learns from each one and gets more precise over time.
        </div>
      </div>
    );
  }

  const tier = HEALTH_TIERS[living.twinHealth];
  const scores = living.scoreHistory.map(h => h.score);
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const trend = lastScore < firstScore ? "improving" : lastScore > firstScore ? "worsening" : "stable";
  const trendColor = trend === "improving" ? "#10b981" : trend === "worsening" ? "#ef4444" : "rgba(255,255,255,0.4)";

  const rateEntries = Object.entries(living.outcomeSuccessRates)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Intro */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 6 }}>Living Career Twin</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
          How your model has evolved and what it has learned works for you. Updated after every audit and outcome.
        </div>
      </div>

      {/* Twin health gauge */}
      <div className="card-premium" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Twin Health</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: tier.color }}>{tier.label}</span>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${tier.pct}%`, height: "100%", background: tier.color, borderRadius: 5, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)" }}>{tier.next}</div>
        {living.profileCompleteness != null && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            Profile completeness: <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{living.profileCompleteness}%</span>
            {" · "}Twin version <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{living.twinVersion}</span>
          </div>
        )}
      </div>

      {/* Score trajectory */}
      <div className="card-premium" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Risk Trajectory</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: trendColor }}>
            {trend === "improving" ? "↓ improving" : trend === "worsening" ? "↑ worsening" : "→ stable"}
            {" · "}{scores.length} audit{scores.length > 1 ? "s" : ""}
          </span>
        </div>
        <Sparkline points={scores} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          <span>{living.scoreHistory[0]?.date} · {firstScore}</span>
          <span>{living.scoreHistory[living.scoreHistory.length - 1]?.date} · {lastScore}</span>
        </div>
      </div>

      {/* Action success rates */}
      <div className="card-premium" style={{ padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 12 }}>
          What Works For You
        </div>
        {rateEntries.length === 0 ? (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
            Complete and rate 3+ actions and the twin will learn which kinds of moves actually move your score — then prioritize them.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rateEntries.map(([dim, rate]) => {
              const pct = Math.round(rate * 100);
              const c = pct >= 66 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
              return (
                <div key={dim}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{DIM_LABELS[dim] ?? dim}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: c }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
              Success rate = share of actions in each area you rated as helpful. The system now ranks higher-success areas first.
            </div>
          </div>
        )}
      </div>

      {/* Intelligence loop ask */}
      {loop && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, fontFamily: "var(--font-mono, monospace)" }}>
            What the system needs this week
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{loop.weeklyAsk}</div>
          {loop.nextRecommendedAuditDate && (
            <div style={{ marginTop: 8, fontSize: 12, color: loop.auditOverdue ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>
              {loop.auditOverdue
                ? "⚠ Re-audit recommended — your model is going stale."
                : `Next recommended audit: ${new Date(loop.nextRecommendedAuditDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
