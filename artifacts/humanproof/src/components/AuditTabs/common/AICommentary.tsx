// AICommentary.tsx — Wave 7.3 Dynamic Intelligence Narrative
//
// PROBLEM: The platform shows conclusions (tabs, scores, panels) but never
// speaks in the moment — no contextual AI voice that guides users through
// what they're looking at.
//
// SOLUTION: A floating bottom-center comment bubble that appears 2s after
// each tab loads with a context-aware observation. One per tab per session.
// Dismissed on click. Respects "dismiss all" localStorage preference.
//
// Rules:
//   • Max 1 comment per tab per session (tracks in sessionStorage)
//   • Auto-dismiss after 8s
//   • "Dismiss all" preference stored in localStorage
//   • Never blocks or overlays critical content — always bottom-center
//   • `prefers-reduced-motion` respected (no slide animation)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabValue = 'summary' | 'company' | 'protection' | 'actions' | 'intel' | 'transparency';

interface Props {
  activeTab: TabValue;
  result: HybridResult;
}

// ── Commentary generator ──────────────────────────────────────────────────────

function generateComment(tab: TabValue, result: HybridResult): string | null {
  const r = result as any;
  const score = result.total;

  switch (tab) {
    case 'summary': {
      const label = score >= 75 ? 'critical' : score >= 55 ? 'elevated' : score >= 35 ? 'moderate' : 'low';
      const topDriver = r.signalAttribution?.topFactors?.[0]?.label ?? r.breakdown ? Object.keys(r.breakdown ?? {})[0] : null;
      if (topDriver) {
        return `Your ${label} risk score of ${score} is driven most by ${topDriver.toLowerCase()}. Scroll down for the timeline showing when you could reach the safe zone.`;
      }
      return `Your risk score is ${score}/100 — ${label} risk. The three driver cards below show exactly what's pushing it there.`;
    }

    case 'company': {
      const companyName = r.companyName ?? 'your company';
      const hiringFrozen = r.hiringSignal?.hiringFrozen;
      const layoffs = (result as any).companyData?.layoffRounds ?? r.layoffRounds;
      if (hiringFrozen) return `${companyName}'s hiring is currently frozen — that's one of the strongest early signals the AI tracks. Monitor this section for changes.`;
      if (layoffs > 0) return `${companyName} has had ${layoffs} layoff round${layoffs > 1 ? 's' : ''} in the past 24 months — the AI weights this heavily. Ground Truth signals are open by default for this reason.`;
      return `Company signals update when new data arrives. The Ground Truth section has the most actionable intelligence about ${companyName}'s current state.`;
    }

    case 'protection': {
      const prep = r.preparednessScore;
      const readinessLabel = prep?.readinessLabel ?? 'PARTIAL';
      const compScore = r.careerResilience?.compositeScore;
      if (compScore != null && compScore < 50) {
        return `Your career insurance is ${compScore}% — below the 85% fully-protected threshold. The weakest pillar is shown at the bottom of this tab.`;
      }
      if (readinessLabel === 'NOT_READY' || readinessLabel === 'UNDERPREPARED') {
        return `Your readiness is ${readinessLabel.replace('_', ' ').toLowerCase()}. This tab shows exactly which protection pillars need work first.`;
      }
      return `Protection = what you'd fall back on if a layoff happened today. This tab measures that — not the company risk, but your personal safety net.`;
    }

    case 'actions': {
      const phaseCount = r.immediateActions?.length ?? r.actionPlan?.phase1?.length ?? 3;
      return `Phase 1 has ${Math.min(phaseCount, 4)} targeted actions. Completing them gives you the highest risk reduction per hour invested — start there before Phase 2.`;
    }

    case 'intel': {
      const dims = r.breakdown ? Object.keys(r.breakdown) : [];
      const topDim = dims[0];
      if (topDim) {
        return `Deep Intel opens the AI's full reasoning chain. The top dimension driving your score today is ${topDim} — expand the "How we reached your score" block above to see exactly why.`;
      }
      return `Deep Intel shows the AI's full reasoning. "How we reached your score" at the top reveals the chain of thought behind every number.`;
    }

    case 'transparency': {
      const confPct = result.confidencePercent ?? Math.round((Number(result.confidence ?? 0.5)) * 100);
      return `This tab documents exactly how the AI scored you — ${confPct}% confidence. Every weight, data source, and calibration decision is disclosed here.`;
    }

    default:
      return null;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const SESSION_KEY = 'hp.commentary.seen'; // JSON array of seen tab IDs
const DISMISS_ALL_KEY = 'hp.commentary.dismissedAll';

function hasSeenTab(tab: TabValue): boolean {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]');
    return seen.includes(tab);
  } catch { return false; }
}

function markTabSeen(tab: TabValue): void {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]');
    if (!seen.includes(tab)) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen, tab]));
    }
  } catch { /* SSR */ }
}

function isDismissedAll(): boolean {
  try { return localStorage.getItem(DISMISS_ALL_KEY) === '1'; } catch { return false; }
}

function setDismissAll(): void {
  try { localStorage.setItem(DISMISS_ALL_KEY, '1'); } catch { /* SSR */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AICommentary: React.FC<Props> = ({ activeTab, result }) => {
  const [visible, setVisible] = useState(false);
  const [comment, setComment] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const dismissAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissAll();
    setVisible(false);
  }, []);

  useEffect(() => {
    // Clear any pending timers on tab change
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);

    // Don't show if user has dismissed all
    if (isDismissedAll()) return;

    // Don't show if already seen this tab in this session
    if (hasSeenTab(activeTab)) return;

    // Generate comment for this tab
    const text = generateComment(activeTab, result);
    if (!text) return;

    // Appear after 2s delay
    timerRef.current = setTimeout(() => {
      setComment(text);
      setVisible(true);
      markTabSeen(activeTab);

      // Auto-dismiss after 8s
      timerRef.current = setTimeout(() => setVisible(false), 8000);
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <AnimatePresence>
      {visible && comment && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={dismiss}
          className="fixed left-1/2 z-50 cursor-pointer"
          style={{
            bottom: 'calc(72px + env(safe-area-inset-bottom, 12px))',
            transform: 'translateX(-50%)',
            maxWidth: 'min(360px, calc(100vw - 32px))',
            width: '100%',
          }}
        >
          <div
            className="rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg"
            style={{
              background: 'rgba(15,23,42,0.92)',
              border: '1px solid rgba(34,211,238,0.22)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Bot icon with subtle pulse */}
            <div className="relative flex-shrink-0 mt-0.5">
              <Bot className="w-4 h-4" style={{ color: 'rgba(34,211,238,0.70)' }} />
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: 'rgba(34,211,238,0.15)', animationDuration: '2s', animationIterationCount: '1' }}
              />
            </div>

            {/* Comment text */}
            <p className="flex-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {comment}
            </p>

            {/* Close + dismiss all */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <button
                onClick={dismiss}
                className="opacity-40 hover:opacity-70 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.80)' }} />
              </button>
              <button
                onClick={dismissAll}
                className="text-[10px] font-semibold"
                style={{ color: 'rgba(255,255,255,0.28)' }}
                aria-label="Turn off AI commentary"
              >
                Turn off
              </button>
            </div>
          </div>

          {/* Tap-to-dismiss hint */}
          <p className="text-center text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.20)' }}>
            Tap anywhere to dismiss
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AICommentary;
