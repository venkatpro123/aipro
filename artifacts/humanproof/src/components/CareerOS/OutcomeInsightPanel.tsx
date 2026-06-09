// OutcomeInsightPanel.tsx — Rule 18: Outcome Monopoly
// Shows top actions ranked by MEASURED risk reduction from real user feedback data.
// Closes the loop: "You did X → your risk dropped Y points."
// Phase 5: adds cohort comparison row ("Users like you averaged X pts reduction")
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLayoff } from "../../context/LayoffContext";
import { getFeedbackSummary, type ActionROI } from "../../services/feedbackEngine";
import { getCohortOutcomeStats, type CohortOutcomeStats } from "../../services/cohortOutcomesAggregator";
import type { HybridResult } from "../../types/hybridResult";

export function OutcomeInsightPanel() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [top, setTop] = useState<ActionROI[]>([]);
  const [cohortStats, setCohortStats] = useState<Record<string, CohortOutcomeStats>>({});
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const hr = state.scoreResult as HybridResult | null;

  useEffect(() => {
    if (!user) { setChecked(true); return; }
    setLoading(true);
    getFeedbackSummary(user.id)
      .then(async s => {
        // Only show actions with a measured reduction > 0
        const effective = (s.topEffectiveActions ?? []).filter(a => a.reduction > 0);
        const displayed = effective.slice(0, 5);
        setTop(displayed);

        // Fetch cohort stats for each action (best-effort — non-blocking)
        const roleKey = (hr as any)?.roleKey ?? (hr as any)?.role ?? 'unknown';
        const yearsExp = (hr as any)?.yearsExperience ?? 5;
        const band = yearsExp < 2 ? '<2' : yearsExp < 5 ? '2-5' : yearsExp < 10 ? '5-10' : '10+';
        const statsMap: Record<string, CohortOutcomeStats> = {};
        await Promise.allSettled(
          displayed.map(async action => {
            const stats = await getCohortOutcomeStats(roleKey, band as any, action.actionId);
            if (stats && stats.count >= 3) statsMap[action.actionId] = stats;
          })
        );
        setCohortStats(statsMap);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setChecked(true); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Don't render until checked — avoids flash of "no data" on first load
  if (!checked || loading) return null;
  // Only show when there's real measured outcome data
  if (top.length === 0) return null;

  const maxReduction = Math.max(...top.map(a => a.reduction), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        borderRadius: 12,
        background: "rgba(16,185,129,0.04)",
        border: "1px solid rgba(16,185,129,0.15)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(16,185,129,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <BarChart2 size={14} style={{ color: "#10b981" }} />
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(16,185,129,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            WHAT'S ACTUALLY WORKING
          </div>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginTop: 1 }}>
            Top actions by measured risk reduction
          </div>
        </div>
        {/* Rule 17: MEASURED label — this is real outcome data, not modeled */}
        <span style={{
          marginLeft: "auto",
          fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.06em",
          color: "#10b981", background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 5, padding: "2px 7px",
          fontFamily: "var(--font-mono, monospace)",
        }}>
          MEASURED
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {top.map((action, i) => {
          const barWidth = (action.reduction / maxReduction) * 100;
          const completedDate = new Date(action.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <div key={action.actionId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-2)", fontWeight: 500, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {i + 1}. {action.actionText}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 800, color: "#10b981",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                    −{action.reduction.toFixed(1)}pts
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)" }}>
                    {completedDate}
                  </span>
                </div>
              </div>
              {/* Progress bar showing relative impact */}
              <div style={{
                height: 3, borderRadius: 2,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: `linear-gradient(90deg, #10b981, #34d399)`,
                    borderRadius: 2,
                  }}
                />
              </div>

              {/* Rule 18: Cohort comparison row — "Users like you averaged N pts" */}
              {cohortStats[action.actionId] && (() => {
                const cs = cohortStats[action.actionId];
                const confColor = cs.confidenceLevel === 'high' ? '#10b981' : cs.confidenceLevel === 'medium' ? '#f59e0b' : 'rgba(255,255,255,0.2)';
                return (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: "0.68rem", color: "rgba(255,255,255,0.3)",
                    fontFamily: "var(--font-mono, monospace)",
                    marginTop: 2,
                  }}>
                    <span>Users like you avg</span>
                    <span style={{ fontWeight: 700, color: confColor }}>
                      −{cs.avgRiskReduction.toFixed(1)}pts
                    </span>
                    <span style={{ color: confColor, opacity: 0.7 }}>
                      · {cs.confidenceLevel === 'high' ? 'High' : 'Moderate'} confidence · {cs.count} users
                    </span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <div style={{
        fontSize: "0.72rem",
        color: "rgba(255,255,255,0.25)",
        lineHeight: 1.5,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        paddingTop: 10,
      }}>
        Based on your actual audit scores before and after completing these actions. MEASURED = real observed outcomes, not predictions.
      </div>
    </motion.div>
  );
}
