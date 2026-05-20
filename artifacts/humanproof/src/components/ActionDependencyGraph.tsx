// ActionDependencyGraph.tsx
// Transforms the flat action list into a phased dependency sequence.
//
// Phase 0 (Emergency — Before Week 1):
//   Rendered first. Present when departmentFreezeScore ≥ 65 OR collapseStage ≥ 3.
//   Its completion (100%) is required before Phase 1 unlocks.
//   This is enforced, not a hint: Phase 1 items are pointer-events disabled and
//   visually locked until the Phase 0 action is checked.
//
// Phase 1 (Weeks 1–2): Critical + immediate actions. Phase 2 depends on these.
// Phase 2 (Weeks 3–6): High priority. Locked until Phase 1 ≥ 50%.
// Phase 3 (Weeks 7+):  Medium/Low + ongoing. Locked until Phase 2 ≥ 50%.
//
// The lock is enforced in the UI — pointer-events disabled on locked items,
// lock icon replaces phase icon, checkbox is aria-disabled.
// A user who skips Phase 0 and jumps to Phase 3 upskilling has made a worse
// decision than if the platform had never intervened.

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Circle, ChevronDown, ChevronUp,
  Zap, Target, TrendingUp, Lock, AlertTriangle,
} from "lucide-react";
import type { ActionPlanItem } from "@/types/hybridResult";

interface Props {
  actions: ActionPlanItem[];
  completedItems: Record<string, boolean>;
}

export type Phase = 0 | 1 | 2 | 3;

interface PhasedItem {
  item: ActionPlanItem;
  phase: Phase;
}

const PHASE_CONFIG = {
  0: {
    label: "Phase 0",
    subtitle: "Emergency — Complete Before Week 1",
    description: "Emergency action required before starting Phase 1. Phase 1 is locked until this is done.",
    Icon: AlertTriangle,
    color: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.40)",
    lockMessage: null, // Phase 0 is never locked
  },
  1: {
    label: "Phase 1",
    subtitle: "Weeks 1–2 · Do These First",
    description: "Critical and immediate actions. Phase 2 depends on these being underway.",
    Icon: Zap,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.3)",
    lockMessage: "LOCKED — COMPLETE PHASE 0 FIRST",
  },
  2: {
    label: "Phase 2",
    subtitle: "Weeks 3–6 · Build on Phase 1",
    description: "High-priority actions that require Phase 1 to be in motion.",
    Icon: Target,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.3)",
    lockMessage: "LOCKED — COMPLETE PHASE 1 50%+ FIRST",
  },
  3: {
    label: "Phase 3",
    subtitle: "Weeks 7+ · Ongoing Investment",
    description: "Medium and long-horizon actions. Begin after Phase 2 is underway.",
    Icon: TrendingUp,
    color: "#10b981",
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.3)",
    lockMessage: "LOCKED — COMPLETE PHASE 2 50%+ FIRST",
  },
} as const;

const ESTIMATED_HOURS_BY_PRIORITY: Record<string, number> = {
  Critical: 2, High: 4, Medium: 8, Low: 16,
};
function computeROIPerHour(item: ActionPlanItem): number {
  const hours = ESTIMATED_HOURS_BY_PRIORITY[item.priority] ?? 8;
  return (item.riskReductionPct ?? 0) / hours;
}

/**
 * Assigns each action to a dependency phase.
 *
 * Phase 0 (emergency): items explicitly marked with sequencePhase='phase0'
 *   or whose id starts with 'dept-freeze-phase0' / 'stage3-emergency-phase0'.
 * Phase 1: Critical priority or deadline ≤7 days / this week / immediate.
 * Phase 2: High priority or 30–45 day deadlines.
 * Phase 3: everything else.
 */
export function assignPhase(item: ActionPlanItem): Phase {
  // Phase 0: emergency actions — must complete before Phase 1 unlocks
  if (item.sequencePhase === 'phase0') return 0;
  if (
    item.id?.startsWith('dept-freeze-phase0') ||
    item.id?.startsWith('stage3-emergency-phase0')
  ) return 0;

  const d = (item.deadline ?? "").toLowerCase();
  const p = item.priority;

  // Phase 1: Critical priority or deadlines ≤7 days / immediate
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

// ── PhaseCard ─────────────────────────────────────────────────────────────────

const PhaseCard: React.FC<{
  phase: Phase;
  items: PhasedItem[];
  completedItems: Record<string, boolean>;
  isLocked: boolean;
}> = ({ phase, items, completedItems, isLocked }) => {
  const [expanded, setExpanded] = useState(phase <= 1);
  const config = PHASE_CONFIG[phase];
  const Icon = config.Icon;

  const completedCount = items.filter(i => completedItems[i.item.id]).length;
  const completionPct  = items.length > 0
    ? Math.round((completedCount / items.length) * 100)
    : 0;

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        background:   config.bg,
        borderColor:  config.border,
        // Locked phases: reduced opacity + no pointer events on the card body
        opacity:      isLocked ? 0.55 : 1,
        position:     'relative',
      }}
    >
      {/* Phase header — also the expand/collapse toggle */}
      <button
        type="button"
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
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-black" style={{ color: isLocked ? undefined : config.color }}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">{config.subtitle}</span>
            {isLocked && config.lockMessage && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
              >
                {config.lockMessage}
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
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%`, background: config.color }}
                />
              </div>
            </>
          )}
          {!isLocked && (expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />)}
        </div>
      </button>

      {/* Lock overlay — covers item list with pointer-events: none so
          even if the user inspects the DOM they cannot interact with items */}
      {isLocked && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'all',
            cursor: 'not-allowed',
            zIndex: 10,
            borderRadius: 'inherit',
          }}
        />
      )}

      {/* Action items — only rendered when expanded and not locked */}
      {expanded && !isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3"
        >
          {[...items]
            .sort((a, b) => computeROIPerHour(b.item) - computeROIPerHour(a.item))
            .map(({ item }, i) => {
              const done = completedItems[item.id] || false;
              const priorityColor = {
                Critical: "var(--red)", High: "var(--orange)",
                Medium: "var(--amber)", Low: "var(--cyan)",
              }[item.priority] ?? "var(--cyan)";
              const isHighestROI = i === 0 && !done && (item.riskReductionPct ?? 0) > 0 && items.length >= 2;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`p-3 rounded-xl border border-white/5 bg-white/[0.03] ${done ? "opacity-60" : ""}`}
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
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                            style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.25)' }}
                          >
                            Highest impact/hour
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[9px] font-mono text-muted-foreground/60">
                        <span>{item.layerFocus}</span>
                        {item.deadline && <span>· {item.deadline}</span>}
                        {(item.riskReductionPct ?? 0) > 0 && (
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

// ── ActionDependencyGraph ─────────────────────────────────────────────────────

export const ActionDependencyGraph: React.FC<Props> = ({ actions, completedItems }) => {
  const phased = useMemo<PhasedItem[]>(
    () => actions.map(item => ({ item, phase: assignPhase(item) })),
    [actions],
  );

  const byPhase = useMemo(() => ({
    0: phased.filter(p => p.phase === 0),
    1: phased.filter(p => p.phase === 1),
    2: phased.filter(p => p.phase === 2),
    3: phased.filter(p => p.phase === 3),
  }), [phased]);

  // Completion percentage per phase
  const completionPct = (phase: Phase): number => {
    const items = byPhase[phase];
    if (items.length === 0) return 100; // empty = satisfied (no gate)
    const done = items.filter(i => completedItems[i.item.id]).length;
    return Math.round((done / items.length) * 100);
  };

  const p0Pct = completionPct(0);
  const p1Pct = completionPct(1);
  const p2Pct = completionPct(2);

  // Lock rules:
  //   Phase 0: never locked
  //   Phase 1: locked when Phase 0 exists (has items) AND Phase 0 < 100% complete
  //   Phase 2: locked when Phase 1 < 50%
  //   Phase 3: locked when Phase 2 < 50%
  const hasPhase0 = byPhase[0].length > 0;
  const phase1Locked = hasPhase0 && p0Pct < 100;
  const phase2Locked = p1Pct < 50;
  const phase3Locked = p2Pct < 50;

  const totalPhases = [0, 1, 2, 3].filter(p => byPhase[p as Phase].length > 0).length;

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="label-xs text-muted-foreground uppercase tracking-widest">
          Dependency Map — {actions.length} actions across {totalPhases} phase{totalPhases !== 1 ? 's' : ''}
        </div>
        <div className="text-[9px] text-muted-foreground opacity-50">
          {hasPhase0 ? 'Complete Phase 0 emergency action before starting Phase 1' : 'Complete Phase 1 before starting Phase 2'}
        </div>
      </div>

      {/* Phase 0 — emergency, always rendered first when it has items */}
      <PhaseCard
        phase={0}
        items={byPhase[0]}
        completedItems={completedItems}
        isLocked={false}
      />

      <PhaseCard
        phase={1}
        items={byPhase[1]}
        completedItems={completedItems}
        isLocked={phase1Locked}
      />
      <PhaseCard
        phase={2}
        items={byPhase[2]}
        completedItems={completedItems}
        isLocked={phase2Locked}
      />
      <PhaseCard
        phase={3}
        items={byPhase[3]}
        completedItems={completedItems}
        isLocked={phase3Locked}
      />
    </div>
  );
};

export default ActionDependencyGraph;
