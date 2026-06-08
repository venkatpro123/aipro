import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Target, Loader2 } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useLayoff } from "../../context/LayoffContext";
import type { HybridResult, ActionPlanItem } from "../../types/hybridResult";

interface MissionAction {
  id: string;
  title: string;
  effort: string;
  priority: string;
}

const PRIORITY_RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function extractSmartMission(
  scoreResult: HybridResult | null,
  completedIds: Set<string>,
): { top: MissionAction | null; next: MissionAction | null } {
  if (!scoreResult) return { top: null, next: null };
  const actions: ActionPlanItem[] | undefined = scoreResult.actionItems;
  if (!actions || actions.length === 0) return { top: null, next: null };

  // Filter completed, sort by priority DESC then prefer Low-effort among ties
  const effortRank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };
  const uncompleted = actions
    .filter(a => !completedIds.has(a.id))
    .sort((a, b) => {
      const pd = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
      if (pd !== 0) return pd;
      return (effortRank[a.effortBadge ?? 'Medium'] ?? 1) - (effortRank[b.effortBadge ?? 'Medium'] ?? 1);
    });

  const toMission = (item: ActionPlanItem): MissionAction => ({
    id: item.id,
    title: item.title,
    effort: item.effortBadge ?? item.deadline ?? 'Medium',
    priority: item.priority,
  });

  return {
    top: uncompleted[0] ? toMission(uncompleted[0]) : null,
    next: uncompleted[1] ? toMission(uncompleted[1]) : null,
  };
}

export function TodaysMissionWidget() {
  const { state } = useLayoff();
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkedDB, setCheckedDB] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const hr = state.scoreResult as HybridResult | null;
  const score = (hr as any)?.total ?? null;
  const { top: action, next: nextAction } = extractSmartMission(hr, completedIds);
  const isUrgent = score !== null && score >= 70;

  const checkCompletion = useCallback(async () => {
    if (!action) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCheckedDB(true); return; }
      // Fetch all completed action IDs for this user to drive smart ordering
      const { data: allCompleted } = await supabase
        .from("action_completions")
        .select("action_id")
        .eq("user_id", user.id);
      if (allCompleted) {
        const ids = new Set(allCompleted.map((r: { action_id: string }) => r.action_id));
        setCompletedIds(ids);
        if (ids.has(action.id)) setCompleted(true);
      }
    } catch { /* offline or unauthed */ }
    setCheckedDB(true);
  }, [action]);

  useEffect(() => { checkCompletion(); }, [checkCompletion]);

  const toggleCompletion = async () => {
    if (!action || loading) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCompleted(c => !c);
        setLoading(false);
        return;
      }
      if (!completed) {
        await supabase.from("action_completions").upsert({
          user_id: user.id,
          action_id: action.id,
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id,action_id" });
        setCompleted(true);
      } else {
        await supabase.from("action_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("action_id", action.id);
        setCompleted(false);
      }
    } catch { /* offline — optimistic toggle */ setCompleted(c => !c); }
    setLoading(false);
  };

  const hasAudit = state.scoreResult != null;

  if (!action) {
    return (
      <motion.div
        className="card-premium"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, minHeight: 160, justifyContent: "center", alignItems: "center", textAlign: "center" }}
      >
        <Target size={24} style={{ color: "var(--text-3)" }} />
        <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
          {hasAudit
            ? "No action items generated for this audit — try re-running with more profile detail"
            : "Run your first audit to unlock today's mission"}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="label-xs" style={{ color: isUrgent ? "#f97316" : "var(--text-3)" }}>
          {isUrgent ? "⚡ URGENT MISSION" : "TODAY'S MISSION"}
        </div>
        <Target size={16} style={{ color: isUrgent ? "#f97316" : "var(--cyan)" }} />
      </div>

      <div
        onClick={toggleCompletion}
        style={{
          display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer",
          opacity: checkedDB ? 1 : 0.6, transition: "opacity 200ms",
        }}
        role="button"
        aria-pressed={completed}
      >
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          {loading ? (
            <Loader2 size={20} style={{ color: "var(--cyan)", animation: "spin 1s linear infinite" }} />
          ) : completed ? (
            <CheckCircle2 size={20} style={{ color: "#10b981" }} />
          ) : (
            <Circle size={20} style={{ color: "var(--text-3)" }} />
          )}
        </div>
        <div>
          <div style={{
            fontWeight: 600, fontSize: "0.92rem", color: "var(--text)",
            textDecoration: completed ? "line-through" : "none",
            opacity: completed ? 0.5 : 1, lineHeight: 1.4,
          }}>
            {isUrgent && !completed && (
              <span style={{ color: "#f97316", marginRight: 4 }}>⚡ Urgent:</span>
            )}
            {action.title}
          </div>
          <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
            <span style={{
              padding: "1px 7px", borderRadius: 5, fontSize: "0.7rem", fontWeight: 600,
              background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
              color: "var(--cyan)",
            }}>
              {action.effort} effort
            </span>
            <span style={{
              padding: "1px 7px", borderRadius: 5, fontSize: "0.7rem", fontWeight: 600,
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              color: "var(--text-3)",
            }}>
              Priority {action.priority}
            </span>
          </div>
        </div>
      </div>

      {nextAction && !completed && (
        <div style={{
          borderTop: "1px solid var(--border)", paddingTop: 12,
          fontSize: "0.75rem", color: "var(--text-3)",
          display: "flex", gap: 6, alignItems: "center",
        }}>
          <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>UP NEXT</span>
          <span style={{ color: "var(--text-2)" }}>{nextAction.title}</span>
        </div>
      )}

      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", color: "#10b981", fontWeight: 600,
          }}
        >
          ✓ Mission complete — great work! Check back tomorrow for your next action.
        </motion.div>
      )}
    </motion.div>
  );
}
