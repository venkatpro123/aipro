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
import { computeCareerTrajectories, type CareerTwinModel, type CareerTrajectory } from "../../services/careerTwinTrajectoryService";
import { fetchUserProfile, type UserProfile } from "../../services/userProfileService";
import type { HybridResult } from "../../types/hybridResult";

const ACCENT = "#a78bfa";

interface CareerTwinPanelProps {
  /** Current audit result — drives the live 8-trajectory model. */
  hr?: HybridResult | null;
}

// ── One living trajectory row: value bar, direction, 6-mo projection, drivers ──
function TrajectoryRow({ t }: { t: CareerTrajectory }) {
  const [open, setOpen] = useState(false);
  const statusColor = t.status === "strong" ? "#10b981" : t.status === "weak" ? "#ef4444" : "#f59e0b";
  // Favorable motion = risk falling OR opportunity rising.
  const favorable = (t.isRisk && t.direction === "falling") || (!t.isRisk && t.direction === "rising");
  const adverse = (t.isRisk && t.direction === "rising") || (!t.isRisk && t.direction === "falling");
  const arrow = t.direction === "stable" ? "→" : t.direction === "rising" ? "↑" : "↓";
  const arrowColor = favorable ? "#10b981" : adverse ? "#ef4444" : "rgba(255,255,255,0.35)";
  const projDelta = t.projection6mo - t.currentValue;

  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.82)" }}>{t.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: arrowColor }}>{arrow} {t.momentumLabel}</span>
          </div>
        </div>
        <span style={{ fontSize: 17, fontWeight: 800, color: statusColor, fontFamily: "var(--font-mono, monospace)", flexShrink: 0 }}>
          {t.currentValue}
        </span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11, padding: "0 0 0 4px", flexShrink: 0 }}
          aria-label={`Why ${t.label}`}
        >
          {open ? "▲" : "Why?"}
        </button>
      </div>

      {/* Value bar with a projection marker */}
      <div style={{ position: "relative", height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "visible", marginBottom: 4 }}>
        <div style={{ width: `${t.currentValue}%`, height: "100%", background: statusColor, borderRadius: 4 }} />
        <span
          title={`Projected in 6 months: ${t.projection6mo}`}
          style={{
            position: "absolute", top: -2, left: `calc(${t.projection6mo}% - 1px)`,
            width: 2, height: 10, background: "rgba(255,255,255,0.5)", borderRadius: 1,
          }}
        />
      </div>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.32)", fontFamily: "var(--font-mono, monospace)" }}>
        6-mo projection: {t.projection6mo}{projDelta !== 0 ? ` (${projDelta > 0 ? "+" : ""}${projDelta})` : " (flat)"}
      </div>

      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 5 }}>
          {t.drivers.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0, marginTop: 6, width: 3, height: 3, borderRadius: "50%", background: statusColor, opacity: 0.6 }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.45 }}>{d}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

export function CareerTwinPanel({ hr }: CareerTwinPanelProps = {}) {
  const { user } = useAuth();
  const [living, setLiving] = useState<TwinLivingState | null>(null);
  const [loop, setLoop] = useState<IntelligenceLoopState | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [model, setModel] = useState<CareerTwinModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([loadTwinLivingState(), getIntelligenceLoopState(user.id), fetchUserProfile()])
      .then(([ls, lp, pf]) => {
        if (cancelled) return;
        setLiving(ls);
        setLoop(lp);
        setProfile(pf);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  // Recompute the living 8-trajectory model whenever the audit result, profile,
  // or score history changes. Pure derivation — no I/O.
  useEffect(() => {
    if (!hr) { setModel(null); return; }
    try {
      setModel(computeCareerTrajectories(hr, profile, living?.scoreHistory ?? []));
    } catch {
      setModel(null);
    }
  }, [hr, profile, living]);

  if (loading) {
    return <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0", fontSize: 14 }}>Loading your Career Twin…</div>;
  }

  // Nothing to show only when there is neither a live model nor any history.
  if (!user || (!model && (!living || living.scoreHistory.length === 0))) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", background: "rgba(167,139,250,0.05)", borderRadius: 16, border: "1px solid rgba(167,139,250,0.15)" }}>
        <div style={{ fontSize: 38, marginBottom: 14 }}>🧬</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 8 }}>Your Career Twin is just getting started</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
          Run an audit to bring your Twin to life. It then learns from every action and outcome and gets more precise over time.
        </div>
      </div>
    );
  }

  const tier = living ? HEALTH_TIERS[living.twinHealth] : null;
  const scores = living?.scoreHistory.map(h => h.score) ?? [];
  const hasSparkline = scores.length >= 2;
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const trend = !hasSparkline ? "stable" : lastScore < firstScore ? "improving" : lastScore > firstScore ? "worsening" : "stable";
  const trendColor = trend === "improving" ? "#10b981" : trend === "worsening" ? "#ef4444" : "rgba(255,255,255,0.4)";

  const rateEntries = Object.entries(living?.outcomeSuccessRates ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const overallColor = model?.overallDirection === "improving" ? "#10b981" : model?.overallDirection === "deteriorating" ? "#ef4444" : "#f59e0b";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Intro */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 6 }}>Living Career Twin</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
          A digital model of your career across eight trajectories — continuously updated, each one explainable.
        </div>
      </div>

      {/* ── The living model: 8 trajectories (Rule #3) ── */}
      {model && (
        <div className="card-premium" style={{ padding: 18, borderColor: `${overallColor}33` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              Twin Trajectories
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: overallColor }}>
              {model.overallDirection === "improving" ? "↑ strengthening" : model.overallDirection === "deteriorating" ? "↓ under pressure" : "→ holding"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: 14 }}>{model.headline}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 9 }}>
            {model.trajectories.map(t => <TrajectoryRow key={t.key} t={t} />)}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
            Each trajectory is derived from the engines in your latest audit. The marker on each bar is the 6-month projection at the current rate. Tap "Why?" for the drivers.
          </div>
        </div>
      )}

      {/* Twin health gauge */}
      {living && tier && (
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
      )}

      {/* Score trajectory */}
      {hasSparkline && living && (
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
      )}

      {/* Action success rates */}
      {living && (
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
      )}

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
