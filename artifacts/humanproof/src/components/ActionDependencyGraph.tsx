// ActionDependencyGraph.tsx
// Enhancement 2: Transforms the flat action list into a phased dependency sequence.
// Phase 1 (Weeks 1–2): Critical + immediate actions — must be done first.
// Phase 2 (Weeks 3–6): High priority + 30-45 day actions — build on Phase 1.
// Phase 3 (Weeks 7+):  Medium/Low + ongoing — layer on top of Phase 2.
// This converts the action plan from a suggestion list into an executable project.

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Circle, ChevronDown, ChevronUp,
  Zap, Target, TrendingUp, Lock,
} from "lucide-react";
import type { ActionPlanItem } from "@/types/hybridResult";

interface Props {
  actions: ActionPlanItem[];
  completedItems: Record<string, boolean>;
}

type Phase = 1 | 2 | 3;

interface PhasedItem {
  item: ActionPlanItem;
  phase: Phase;
}

const PHASE_CONFIG = {
  1: {
    label: "Phase 1",
    subtitle: "Weeks 1–2 · Do These First",
    description: "Critical and immediate actions. Phase 2 depends on these being complete.",
    Icon: Zap,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.3)",
  },
  2: {
    label: "Phase 2",
    subtitle: "Weeks 3–6 · Build on Phase 1",
    description: "High-priority actions that require Phase 1 to be in motion.",
    Icon: Target,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.3)",
  },
  3: {
    label: "Phase 3",
    subtitle: "Weeks 7+ · Ongoing Investment",
    description: "Medium and long-horizon actions. Begin after Phase 2 is underway.",
    Icon: TrendingUp,
    color: "#10b981",
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.3)",
  },
} as const;

// Intelligence Upgrade 6: ROI per hour = riskReductionPct / estimated_hours
// Used to rank actions within each phase and flag the highest-ROI item.
const ESTIMATED_HOURS_BY_PRIORITY: Record<string, number> = {
  Critical: 2, High: 4, Medium: 8, Low: 16,
};
function computeROIPerHour(item: ActionPlanItem): number {
  const hours = ESTIMATED_HOURS_BY_PRIORITY[item.priority] ?? 8;
  return (item.riskReductionPct ?? 0) / hours;
}

export function assignPhase(item: ActionPlanItem): Phase {
  const d = (item.deadline ?? "").toLowerCase();
  const p = item.priority;

  // Phase 1: Critical priority or deadlines ≤7 days
  if (p === "Critical") return 1;
  if (/\b[1-7]\s*day/i.test(d)) return 1;
  if (/\bnow\b|\btoday\b|\bimmediate/i.test(d)) return 1;
  if (/\bthis week\b/i.test(d)) return 1;

  // Phase 2: High priority or 30–45 day deadlines
  if (p === "High") return 2;
  if (/\b(30|45)\s*day/i.test(d)) return 2;
  if (/\b[2-6]\s*week/i.test(d)) return 2;

  // Phase 3: everything else
  return 3;
}

const PhaseCard: React.FC<{
  phase: Phase;
  items: PhasedItem[];
  completedItems: Record<string, boolean>;
  phase1CompletionPct: number;
  phase2CompletionPct: number;
}> = ({ phase, items, completedItems, phase1CompletionPct, phase2CompletionPct }) => {
  const [expanded, setExpanded] = useState(phase === 1);
  const config = PHASE_CONFIG[phase];
  const Icon = config.Icon;

  const completedCount = items.filter(i => completedItems[i.item.id]).length;
  const completionPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  // Phase 2 locked until Phase 1 ≥50%; Phase 3 locked until Phase 2 ≥50%
  const isLocked =
    (phase === 2 && phase1CompletionPct < 50) ||
    (phase === 3 && phase2CompletionPct < 50);

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        background: config.bg,
        borderColor: config.border,
        opacity: isLocked ? 0.6 : 1,
      }}
    >
      {/* Phase header */}
      <button
        onClick={() => !isLocked && setExpanded(v => !v)}
        disabled={isLocked}
        className="w-full flex items-center gap-3 p-4 text-left"
        style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      >
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: `${config.color}20` }}
        >
          {isLocked
            ? <Lock className="w-4 h-4 text-muted-foreground" />
            : <Icon className="w-4 h-4" style={{ color: config.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-black" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">{config.subtitle}</span>
            {isLocked && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase">
                LOCKED — COMPLETE {phase === 2 ? "PHASE 1" : "PHASE 2"} 50%+ FIRST
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isLocked && (
            <>
              <span className="text-xs font-mono text-muted-foreground">
                {completedCount}/{items.length}
              </span>
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${completionPct}%`, background: config.color }}
                />
              </div>
            </>
          )}
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* Action items */}
      {expanded && !isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3"
        >
          {/* Intelligence Upgrade 6: Sort by ROI per hour within phase */}
          {[...items].sort((a, b) => computeROIPerHour(b.item) - computeROIPerHour(a.item)).map(({ item }, i) => {
            const done = completedItems[item.id] || false;
            const priorityColor = {
              Critical: "var(--red)", High: "var(--orange)",
              Medium: "var(--amber)", Low: "var(--cyan)",
            }[item.priority] ?? "var(--cyan)";
            const isHighestROI = i === 0 && !done && (item.riskReductionPct ?? 0) > 0;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`p-3 rounded-xl border border-white/5 bg-white/3 ${done ? "opacity-60" : ""}`}
                style={{ borderLeft: `3px solid ${priorityColor}` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {done
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : <Circle className="w-4 h-4 text-muted-foreground opacity-40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={`text-xs font-semibold leading-snug ${done ? "line-through" : ""}`}>
                        {item.title}
                      </p>
                      {isHighestROI && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                          style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.25)' }}>
                          Highest impact/hour
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[9px] font-mono text-muted-foreground/60">
                      <span>{item.layerFocus}</span>
                      {item.deadline && <span>·  {item.deadline}</span>}
                      {item.riskReductionPct > 0 && (
                        <span className="text-emerald-400">−{item.riskReductionPct}% risk</span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: `${priorityColor}15`, color: priorityColor }}
                  >
                    {item.priority}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export const ActionDependencyGraph: React.FC<Props> = ({ actions, completedItems }) => {
  const phased = useMemo<PhasedItem[]>(
    () => actions.map(item => ({ item, phase: assignPhase(item) })),
    [actions],
  );

  const byPhase = useMemo(() => ({
    1: phased.filter(p => p.phase === 1),
    2: phased.filter(p => p.phase === 2),
    3: phased.filter(p => p.phase === 3),
  }), [phased]);

  const completionPct = (phase: Phase): number => {
    const items = byPhase[phase];
    if (items.length === 0) return 100; // empty phase = "complete" for unlocking
    const done = items.filter(i => completedItems[i.item.id]).length;
    return Math.round((done / items.length) * 100);
  };

  const p1Pct = completionPct(1);
  const p2Pct = completionPct(2);

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="label-xs text-muted-foreground uppercase tracking-widest">
          Dependency Map — {actions.length} actions across 3 phases
        </div>
        <div className="text-[9px] text-muted-foreground opacity-50">
          Complete Phase 1 before starting Phase 2
        </div>
      </div>
      {([1, 2, 3] as Phase[]).map(phase => (
        <PhaseCard
          key={phase}
          phase={phase}
          items={byPhase[phase]}
          completedItems={completedItems}
          phase1CompletionPct={p1Pct}
          phase2CompletionPct={p2Pct}
        />
      ))}
    </div>
  );
};

export default ActionDependencyGraph;
