// PhaseProgressSystem.tsx — Wave 4.1 Behavioral Execution Layer
//
// PROBLEM: Zero action persistence. Users can't track what they've done.
// No re-engagement. No progress visualization. No phase-unlock motivation.
//
// SOLUTION: A 3-phase progressive unlock system where:
//   - Phase 1 (this week): 3 critical quick-win actions
//   - Phase 2 (this month): unlocks when Phase 1 complete
//   - Phase 3 (this quarter): unlocks when Phase 2 complete
//
// Wave 1.3 upgrade: State syncs to Supabase for cross-device persistence.
// localStorage remains the optimistic layer for instant response.
// On mount: syncCompletionsFromServer() merges DB state into local.
//
// Integration: placed at the top of ActionsTab, above the existing ActionMatrix.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Lock, ChevronDown, ChevronUp, Zap, Calendar, BarChart3, Clock,
} from 'lucide-react';
import type { ActionPlanItem } from '../../../types/hybridResult';
import { recordStreakActivity } from '../../../services/streakService';
import {
  loadCompletionsLocal,
  markActionComplete,
  unmarkActionComplete,
  syncCompletionsFromServer,
} from '../../../services/actionCompletionService';
import { syncCohortFeedbackFromServer } from '../../../services/cohortFeedbackService';

interface Props {
  actions: ActionPlanItem[];
  companyName?: string;
  onActionComplete?: (actionId: string, completedCount: number) => void;
  /** Current audit score — passed through to actionCompletionService for telemetry */
  currentScore?: number;
}

type Phase = 1 | 2 | 3;

// Split actions into phases based on sequencePhase or priority
function phaseActions(actions: ActionPlanItem[]): [ActionPlanItem[], ActionPlanItem[], ActionPlanItem[]] {
  const phase1: ActionPlanItem[] = [];
  const phase2: ActionPlanItem[] = [];
  const phase3: ActionPlanItem[] = [];

  actions.forEach(a => {
    const sp = (a as any).sequencePhase ?? '';
    if (sp === 'day1' || sp === 'week1' || a.priority === 'Critical') {
      if (phase1.length < 4) phase1.push(a);
      else phase2.push(a);
    } else if (sp === 'month1' || a.priority === 'High') {
      if (phase2.length < 5) phase2.push(a);
      else phase3.push(a);
    } else {
      phase3.push(a);
    }
  });

  // Fill phase 1 to at least 3 items if not enough critical/day1 actions
  if (phase1.length < 3 && phase2.length > 0) {
    while (phase1.length < 3 && phase2.length > 0) {
      phase1.push(phase2.shift()!);
    }
  }

  return [phase1.slice(0, 4), phase2.slice(0, 5), phase3.slice(0, 6)];
}

// ── CheckItem Component ───────────────────────────────────────────────────────

const CheckItem: React.FC<{
  action: ActionPlanItem;
  isCompleted: boolean;
  onToggle: () => void;
  phaseUnlocked: boolean;
}> = ({ action, isCompleted, onToggle, phaseUnlocked }) => {
  const priorityColor =
    action.priority === 'Critical' ? '#dc2626' :
    action.priority === 'High'     ? '#f97316' :
    action.priority === 'Medium'   ? '#f59e0b' : '#10b981';

  return (
    <motion.div
      layout
      className="flex items-start gap-3 py-2.5 border-b"
      style={{
        borderColor: 'rgba(255,255,255,0.05)',
        opacity: phaseUnlocked ? 1 : 0.4,
      }}
    >
      {/* Checkbox — min 44×44px touch target (Wave 9.3)
           Spring-bounce animation on check: scale 0 → 1.2 → 1.0 over 0.28s */}
      <button
        onClick={phaseUnlocked ? onToggle : undefined}
        disabled={!phaseUnlocked}
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          cursor: phaseUnlocked ? 'pointer' : 'not-allowed',
          minWidth: 44,
          minHeight: 44,
          marginTop: -10,   // compensate for the extra height so it doesn't shift layout
          marginBottom: -10,
          marginLeft: -10,
          paddingLeft: 10,
          paddingRight: 4,
        }}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        <motion.div
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
          animate={{
            borderColor: isCompleted ? '#10b981' : `${priorityColor}50`,
            background:  isCompleted ? '#10b981' : 'transparent',
            scale: isCompleted ? [1, 1.22, 1.0] : 1,
          }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Check className="w-3 h-3" style={{ color: '#fff' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold leading-snug"
          style={{
            color: isCompleted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
        >
          {action.title}
        </p>
        {!isCompleted && action.description && (
          <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {action.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${priorityColor}15`, color: priorityColor }}>
            {action.priority}
          </span>
          {(action as any).effortBadge && (
            <span className="text-[10px]" style={{ color: 'rgba(34,211,238,0.55)' }}>
              <Clock className="w-2.5 h-2.5 inline mr-0.5" />
              {(action as any).effortBadge}
            </span>
          )}
          {action.riskReductionPct > 0 && (
            <span className="text-[10px]" style={{ color: 'rgba(16,185,129,0.55)' }}>
              −{action.riskReductionPct}% risk
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Phase Block ───────────────────────────────────────────────────────────────

const PHASE_CONFIG = {
  1: { label: 'THIS WEEK',    icon: Zap,      accent: '#dc2626', desc: 'Critical foundation'    },
  2: { label: 'THIS MONTH',   icon: Calendar, accent: '#f97316', desc: 'Build momentum'          },
  3: { label: 'THIS QUARTER', icon: BarChart3, accent: '#f59e0b', desc: 'Strategic positioning'  },
};

const PhaseBlock: React.FC<{
  phase: Phase;
  actions: ActionPlanItem[];
  completedIds: Set<string>;
  unlocked: boolean;
  defaultOpen: boolean;
  onToggle: (id: string) => void;
  completedCount: number;
  /** When true, plays a brief "Phase N Unlocked!" flash animation on mount */
  justUnlocked?: boolean;
}> = ({ phase, actions, completedIds, unlocked, defaultOpen, onToggle, completedCount, justUnlocked }) => {
  const [open, setOpen] = useState(defaultOpen);
  // Auto-open when this is the just-unlocked phase so the user sees their new actions
  useEffect(() => {
    if (justUnlocked && unlocked) setOpen(true);
  }, [justUnlocked, unlocked]);

  const cfg = PHASE_CONFIG[phase];
  const Icon = cfg.icon;
  const total = actions.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const isComplete = completedCount === total && total > 0;

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{
        background: unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
        border: `1px solid ${unlocked ? `${cfg.accent}30` : 'rgba(255,255,255,0.06)'}`,
        filter: unlocked ? 'none' : 'saturate(0)',
      }}
    >
      {/* Phase unlock celebration flash — appears for 1.8s when a phase first unlocks */}
      <AnimatePresence>
        {justUnlocked && unlocked && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 px-4 py-2"
            style={{
              background: `linear-gradient(90deg, ${cfg.accent}18, ${cfg.accent}08)`,
              borderBottom: `1px solid ${cfg.accent}25`,
            }}
          >
            <span className="text-[11px]" role="img" aria-label="unlocked">🔓</span>
            <span className="text-[10px] font-black" style={{ color: cfg.accent }}>
              PHASE {phase} UNLOCKED!
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {cfg.desc} — {total} new action{total !== 1 ? 's' : ''} available
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Phase header */}
      <button
        onClick={() => unlocked && setOpen(o => !o)}
        disabled={!unlocked}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ cursor: unlocked ? 'pointer' : 'not-allowed' }}
      >
        {/* Phase icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}30` }}
        >
          {unlocked ? (
            <Icon className="w-4 h-4" style={{ color: cfg.accent }} />
          ) : (
            <Lock className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
          )}
        </div>

        {/* Phase info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-[0.15em]"
              style={{ color: unlocked ? cfg.accent : 'rgba(255,255,255,0.25)' }}>
              PHASE {phase}: {cfg.label}
            </span>
            {isComplete && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981' }}>
                ✓ DONE
              </span>
            )}
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {unlocked ? cfg.desc : `Complete Phase ${phase - 1} to unlock`}
          </p>
        </div>

        {/* Progress + toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {unlocked && (
            <span className="text-[10px] font-bold" style={{ color: cfg.accent }}>
              {completedCount}/{total}
            </span>
          )}
          {unlocked && (open
            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.30)' }} />
            : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.30)' }} />
          )}
        </div>
      </button>

      {/* Progress bar */}
      {unlocked && (
        <div className="h-1 mx-4 rounded-full mb-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: cfg.accent }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Action list */}
      <AnimatePresence>
        {unlocked && open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-3 pt-1"
          >
            {actions.map(action => (
              <CheckItem
                key={action.id}
                action={action}
                isCompleted={completedIds.has(action.id)}
                onToggle={() => onToggle(action.id)}
                phaseUnlocked={unlocked}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main Export ───────────────────────────────────────────────────────────────

export const PhaseProgressSystem: React.FC<Props> = ({ actions, companyName, onActionComplete, currentScore }) => {
  // Wave 1.3: Start from localStorage (instant), then merge server state on mount
  const [completedIds, setCompletedIds] = useState<Set<string>>(loadCompletionsLocal);
  const [phase1, phase2, phase3] = phaseActions(actions);

  // Wave 1.3: Sync from Supabase once on mount — merges any completions from other devices
  useEffect(() => {
    syncCompletionsFromServer().then(state => {
      if (state.source === 'synced') {
        setCompletedIds(new Set(state.completedIds));
      }
    }).catch(() => { /* non-fatal — localStorage state remains */ });
    // Cohort feedback aggregate refresh — public read, so this runs regardless
    // of auth state. Updates the local cache that getPersonalizedActions()
    // reads on the NEXT audit; it does not change actions already rendered
    // in this session.
    syncCohortFeedbackFromServer().catch(() => { /* non-fatal */ });
  }, []);

  const p1Completed = phase1.filter(a => completedIds.has(a.id)).length;
  const p2Completed = phase2.filter(a => completedIds.has(a.id)).length;
  const p3Completed = phase3.filter(a => completedIds.has(a.id)).length;

  const phase1Unlocked = true;
  const phase2Unlocked = p1Completed >= Math.max(1, Math.ceil(phase1.length * 0.5));
  const phase3Unlocked = p2Completed >= Math.max(1, Math.ceil(phase2.length * 0.5));

  // Phase unlock celebration: track whether each phase just transitioned to unlocked
  // within this session. useRef gives us previous values without re-rendering.
  const prevP2Unlocked = useRef(phase2Unlocked);
  const prevP3Unlocked = useRef(phase3Unlocked);
  const [phase2JustUnlocked, setPhase2JustUnlocked] = useState(false);
  const [phase3JustUnlocked, setPhase3JustUnlocked] = useState(false);

  useEffect(() => {
    if (!prevP2Unlocked.current && phase2Unlocked) {
      setPhase2JustUnlocked(true);
      // Clear the flash after 4s so it doesn't persist forever
      const t = setTimeout(() => setPhase2JustUnlocked(false), 4000);
      return () => clearTimeout(t);
    }
    prevP2Unlocked.current = phase2Unlocked;
  }, [phase2Unlocked]);

  useEffect(() => {
    if (!prevP3Unlocked.current && phase3Unlocked) {
      setPhase3JustUnlocked(true);
      const t = setTimeout(() => setPhase3JustUnlocked(false), 4000);
      return () => clearTimeout(t);
    }
    prevP3Unlocked.current = phase3Unlocked;
  }, [phase3Unlocked]);

  const totalCompleted = p1Completed + p2Completed + p3Completed;

  const handleToggle = useCallback((id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Wave 1.3: background Supabase delete
        unmarkActionComplete(id).catch(() => {});
      } else {
        next.add(id);
        onActionComplete?.(id, next.size);
        // Wave 4.4: record weekly streak activity whenever an action is completed
        try { recordStreakActivity(); } catch { /* non-fatal */ }
        // Wave 1.3: background Supabase upsert with optional score telemetry
        markActionComplete(id, { scoreAtCompletion: currentScore }).catch(() => {});
      }
      return next;
    });
  }, [onActionComplete, currentScore]);

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Overall progress header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ACTION PROGRESS
          </p>
          {companyName && (
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              {companyName} · {totalCompleted} completed
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="text-[11px] font-black px-2.5 py-1 rounded-xl"
            style={{ background: 'rgba(34,211,238,0.10)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.22)' }}
          >
            {totalCompleted} / {actions.length}
          </div>
        </div>
      </div>

      {/* Phase 1 — always unlocked */}
      {phase1.length > 0 && (
        <PhaseBlock
          phase={1}
          actions={phase1}
          completedIds={completedIds}
          unlocked={phase1Unlocked}
          defaultOpen={true}
          onToggle={handleToggle}
          completedCount={p1Completed}
        />
      )}

      {/* Phase 2 — unlocked when ≥50% of Phase 1 done */}
      {phase2.length > 0 && (
        <PhaseBlock
          phase={2}
          actions={phase2}
          completedIds={completedIds}
          unlocked={phase2Unlocked}
          defaultOpen={phase2Unlocked && p1Completed >= phase1.length}
          onToggle={handleToggle}
          completedCount={p2Completed}
          justUnlocked={phase2JustUnlocked}
        />
      )}

      {/* Phase 3 — unlocked when ≥50% of Phase 2 done */}
      {phase3.length > 0 && (
        <PhaseBlock
          phase={3}
          actions={phase3}
          completedIds={completedIds}
          unlocked={phase3Unlocked}
          defaultOpen={false}
          onToggle={handleToggle}
          completedCount={p3Completed}
          justUnlocked={phase3JustUnlocked}
        />
      )}
    </div>
  );
};

export default PhaseProgressSystem;
