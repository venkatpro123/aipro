// LayoffAuditDashboardV3.tsx — v34.0 UX redesign
//
// 5-tab "decision-driven intelligence flow":
//   1. Summary       — Tier-1 critical intel (score, drivers, actions, pulse)
//   2. Company       — Pulse card + ground truth + market signals
//   3. Protection    — Personal career intelligence with adaptive ordering
//   4. Action Plan   — Contingency + matrix + emergency mode
//   5. Intelligence  — Risk math + scenarios + methodology / transparency
//
// New in v34:
//   • Adaptive default tab driven by useDashboardAdaptation (Emergency Mode
//     → actions, low-confidence → intel, stable → protection, otherwise →
//     summary)
//   • Persistent Emergency Mode banner pinned above tabs when score ≥ 75 or
//     WARN active
//   • First-audit detection inside Summary tab (FirstAuditWelcome)
//   • Each tab badge updates from the compressed-signal layer (CompanyPulse
//     verdict, preparedness score, critical action count, live signals)
//
// Mobile UX:
//   • Fixed bottom navigation bar — 5 icons + 1-word labels
//   • Sticky top bar with company name + score chip while scrolling
//   • Emergency banner stays visible above tabs (sticky behaviour)
//
// Desktop UX:
//   • Sticky pill tabs below sticky header
//   • Per-tab badge updates live based on signal state

import React, { Suspense, lazy, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Building2, Shield, Zap, X } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';
import { TabErrorBoundary } from '../common/TabErrorBoundary';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import EmergencyModeBanner from '../common/EmergencyModeBanner';
import { AICommentary } from '../common/AICommentary';
import { CareerCopilotButton } from '../../CareerCopilot';
import { riskColor, riskLabel } from '../../../lib/riskTokens';
import { track } from '../../../services/analyticsService';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { supabase as _supabase } from '../../../utils/supabase';
import { IntelligenceUpdateBanner } from '../../IntelligenceUpdateBanner';
// Wave 6.1: Layout-matched skeleton screens replace generic spinner fallbacks
import { SummaryTabSkeleton } from '../../Skeletons/SummaryTabSkeleton';
import { CompanyTabSkeleton } from '../../Skeletons/CompanyTabSkeleton';
import { CardSkeleton } from '../../Skeletons/CardSkeleton';
import {
  checkForIntelligenceUpdates,
  markAuditComplete,
  type IntelligenceUpdateResult,
} from '../../../services/continuousIntelligenceService';
import {
  evaluateReEngagementTrigger,
  clearReEngagementState,
  type ReEngagementTrigger,
} from '../../../services/reEngagementService';
import { ActionCelebrationToast } from '../../ActionCelebration/ActionCelebrationToast';
import { ScoreImprovementCelebration } from '../../AuditReveal/ScoreImprovementCelebration';
import { useSwipeGesture } from '../../../hooks/useSwipeGesture';
import { ReturnVisitPanel } from '../common/ReturnVisitPanel';
import { RiskUpdateBanner } from '../../RiskUpdateBanner';
import { onNewLayoffEvent } from '../../../data/layoffNewsCache';
import { getLayoffScoreHistory } from '../../../services/scoreStorageService';
import { checkAndUnlockAchievements } from '../../../services/achievementService';
import { loadCompletionsLocal } from '../../../services/actionCompletionService';

// ── View mode imports (Guidance / Intelligence toggle) ───────────────────────
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from './ViewModeToggle';
// GuidanceView is lazy-loaded so it never bloats the Intelligence/Analysis bundle.
const GuidanceView  = lazy(() => import('./GuidanceView').then(m => ({ default: m.GuidanceView ?? m.default })));
// AnalysisView is lazy-loaded — 4-tab middle-layer experience.
const AnalysisView  = lazy(() => import('./AnalysisView').then(m => ({ default: m.AnalysisView ?? m.default })));

// Lazy-load each tab. Code-splitting is critical for first-paint perf — the
// Action Plan tab alone is ~180kB gzipped because it includes the negotiation /
// scenario / contingency engines and animation surface.
const SummaryTab      = lazy(() => import('./SummaryTab').then(m => ({ default: m.SummaryTab ?? m.default })));
const AnalysisTab     = lazy(() => import('./AnalysisTab').then(m => ({ default: m.AnalysisTab })));
const ProtectionTab   = lazy(() => import('./ProtectionTab').then(m => ({ default: m.ProtectionTab })));
const ActionsTab      = lazy(() => import('./ActionsTab').then(m => ({ default: m.ActionsTab })));
const IntelligenceTab = lazy(() => import('./IntelligenceTab').then(m => ({ default: m.IntelligenceTab })));

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  onRetake: () => void;
  onDownload?: () => void;
  onRecalculate?: () => void;
  auditStage?: string;
}

type TabValue = 'summary' | 'company' | 'protection' | 'actions';

// riskColor and riskLabel are imported from lib/riskTokens.ts (v40.0).

// ── Tab loader ────────────────────────────────────────────────────────────────

// Wave 6.1: Generic skeleton fallback for tabs without a dedicated skeleton.
// Uses stacked CardSkeleton rows with shimmer — matches the dark glass aesthetic.
const GenericTabSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 py-1">
    {[0, 1, 2, 3].map(i => (
      <CardSkeleton key={i} height={i === 0 ? 80 : 56} rounded="16px" />
    ))}
  </div>
);

// ── Tab configuration ─────────────────────────────────────────────────────────

interface TabConfig {
  value:      TabValue;
  label:      string;
  shortLabel: string;
  Icon:       React.ElementType;
  getBadge?:  (r: HybridResult) => { text: string; color: string } | null;
}

const TAB_CONFIG: TabConfig[] = [
  { value: 'summary',    label: 'Summary',    shortLabel: 'Summary', Icon: TrendingUp },
  { value: 'company',   label: 'Company',    shortLabel: 'Company', Icon: Building2 },
  { value: 'protection', label: 'Skills',    shortLabel: 'Skills',  Icon: Shield },
  { value: 'actions',   label: 'Action Plan', shortLabel: 'Actions', Icon: Zap },
];

// ── Sticky company header ─────────────────────────────────────────────────────

const StickyCompanyHeader: React.FC<{
  companyName: string;
  score: number;
  visible: boolean;
  /** Optional right-side slot — used to host the ViewModeToggle inline. */
  rightSlot?: React.ReactNode;
}> = ({ companyName, score, visible, rightSlot }) => {
  const color = riskColor(score);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="sticky-dash-header"
        >
          <p className="text-[13px] font-semibold truncate text-token-1" title={companyName}>
            {companyName}
          </p>
          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
            <div
              className="score-chip-dyn flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ '--chip-color': color, '--chip-bg': `${color}22`, '--chip-border': `${color}40` } as React.CSSProperties}
            >
              <span className="text-[12px] font-black score-val">{score}</span>
              <span className="text-[10px] font-bold tracking-wide score-lbl">{riskLabel(score)}</span>
            </div>
            {/* ViewModeToggle injected here so it sits inline with the score chip,
                saving a full header row vs. a separate toggle bar below. */}
            {rightSlot}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Desktop pill tab bar ──────────────────────────────────────────────────────

const DesktopTabBar: React.FC<{
  active: TabValue;
  onChange: (v: TabValue) => void;
  result: HybridResult;
}> = ({ active, onChange, result }) => (
  <nav
    data-tab-bar
    aria-label="Dashboard sections"
    className="hidden sm:flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none nav-surface"
  >
    {TAB_CONFIG.map(({ value, label, Icon, getBadge }) => {
      const isActive = value === active;
      const badge    = getBadge?.(result);
      return (
        <button
          key={value}
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onChange(value)}
          className={`tab-btn ${isActive ? 'tab-btn--active' : ''}`}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[12px] font-semibold">{label}</span>
          {badge && (
            <span
              className="tab-badge-chip px-1.5 py-0.5 rounded-full"
              style={{ '--badge-color': badge.color, '--badge-bg': `${badge.color}22` } as React.CSSProperties}
            >
              {badge.text}
            </span>
          )}
        </button>
      );
    })}
  </nav>
);

// ── Mobile bottom navigation ──────────────────────────────────────────────────
// Injected as a <style> tag so we can suppress the global app bottom-nav
// (mobile-bottom-nav class) whenever this feature dashboard is mounted —
// belt-and-suspenders on top of the JS-level conditional in App.tsx.
const FEATURE_NAV_CSS = `
@media (max-width: 768px) {
  body.hp-feature-page .mobile-bottom-nav { display: none !important; }
}
`;

const MobileBottomNav: React.FC<{
  active: TabValue;
  onChange: (v: TabValue) => void;
  result: HybridResult;
}> = ({ active, onChange, result }) => {
  // Inject body class + CSS whenever this dashboard is mounted
  React.useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = FEATURE_NAV_CSS;
    document.head.appendChild(styleEl);
    document.body.classList.add('hp-feature-page');
    return () => {
      styleEl.remove();
      document.body.classList.remove('hp-feature-page');
    };
  }, []);

  // Render through a portal to document.body so the bar pins to the real
  // viewport bottom. Without this it lives inside `.page-wrap`, which has a
  // `transform` (pageEnter animation) that establishes a containing block —
  // turning `position:fixed` into "fixed relative to .page-wrap" and dropping
  // the bar ~49px below the fold (only a sliver visible).
  return createPortal(
    <nav
      aria-label="Dashboard sections"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[999] flex items-stretch nav-surface-heavy safe-area-bottom"
    >
      {TAB_CONFIG.map(({ value, label, shortLabel, Icon, getBadge }) => {
        const isActive = value === active;
        const badge    = getBadge?.(result);
        return (
          <button
            key={value}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${label}${badge ? `: ${badge.text}` : ''}`}
            onClick={() => onChange(value)}
            className={`tab-btn-mobile ${isActive ? 'tab-btn-mobile--active' : ''}`}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-tab-pill"
                className="tab-btn-mobile-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              />
            )}

            <div className="relative z-10 mb-[3px]">
              <motion.div
                animate={isActive ? { scale: 1.10, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Icon
                  className="tab-icon-size"
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
              </motion.div>
              {badge && (() => {
                const isLong = badge.text.length > 3;
                return isLong ? (
                  <span
                    className="tab-badge-dot absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                    style={{ '--badge-color': badge.color } as React.CSSProperties}
                  />
                ) : (
                  <span
                    className="tab-badge-chip absolute -top-1 -right-1.5 min-w-[13px] h-3.5 px-0.5 rounded-full flex items-center justify-center font-black whitespace-nowrap"
                    style={{ '--badge-color': badge.color, '--badge-bg': `${badge.color}22` } as React.CSSProperties}
                  >
                    {badge.text}
                  </span>
                );
              })()}
            </div>

            <span className="relative z-10 tab-label-mobile truncate w-full text-center">
              {shortLabel}
            </span>
          </button>
        );
      })}
    </nav>,
    document.body,
  );
};

// ── Main dashboard ────────────────────────────────────────────────────────────

export const LayoffAuditDashboardV3: React.FC<Props> = (props) => {
  const { result, companyData } = props;
  // v40.0 FIX-9: fetch profile for cross-device first-audit detection.
  // Also listens to auth state changes so a late login (user was anonymous,
  // then authenticates) triggers a re-fetch — without this, the profile is
  // never retrieved and cross-device first-audit detection silently fails.
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // v40.0 FIX-10: force a re-render when localStorage changes from another tab
  // so the first-audit welcome correctly hides if dismissed in another tab.
  const [, forceRerender] = useState(0);
  // Wave 7.1: continuous intelligence update banner state
  const [intelligenceUpdate, setIntelligenceUpdate] = useState<IntelligenceUpdateResult | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem('hp.iu.dismissed'); } catch { return false; }
  });
  // Wave 4.3: re-engagement trigger (day-7 / day-30 / day-90 nudges)
  const [reEngagementTrigger, setReEngagementTrigger] = useState<ReEngagementTrigger | null>(() => {
    try { return evaluateReEngagementTrigger(result.companyName, result.total); }
    catch { return null; }
  });
  const [reEngagementDismissed, setReEngagementDismissed] = useState(false);
  // Phase 18 Delight: score improvement celebration
  const [scoreCelebration, setScoreCelebration] = useState<{ prev: number; curr: number } | null>(null);
  // Wave 1.4: Risk update banner — fires when breakingNewsBroker injects a new event
  // for the user's current company. Shows a dismissible top banner with a re-analyze CTA.
  const [riskUpdateBanner, setRiskUpdateBanner] = useState<{ headline: string; company: string } | null>(null);
  const [isRiskReanalyzing, setIsRiskReanalyzing] = useState(false);
  useEffect(() => {
    const currentCompany = (companyData?.name ?? result.companyName ?? '').toLowerCase();
    if (!currentCompany) return;
    const unsub = onNewLayoffEvent((evt) => {
      // Only surface the banner if the event is for the user's current company
      const evtCompany = (evt.companyName ?? '').toLowerCase();
      if (!evtCompany || !currentCompany.includes(evtCompany.slice(0, 6))) return;
      setRiskUpdateBanner({ headline: evt.headline ?? 'New signal detected', company: companyData?.name ?? evt.companyName });
    });
    return unsub;
  }, [companyData?.name, result.companyName]);

  useEffect(() => {
    const load = () => fetchUserProfile().then(p => { if (p) setUserProfile(p); }).catch(() => {});
    load();
    const { data: { subscription } } = _supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) load(); // refetch profile whenever auth state has a user
    });
    const onStorage = (e: StorageEvent) => {
      // Cross-tab sync for first-audit-seen flag and quick-capture done flag
      if (e.key === 'hp.v34.firstAuditSeen' || e.key === 'hp.quickCapture.done') {
        forceRerender(n => n + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const adaptation = useDashboardAdaptation(result, companyData, userProfile);

  // ── Dual experience mode ──────────────────────────────────────────────────
  // 'guidance'  → compressed 5-section advisor view (default for new users)
  // 'analysis'  → 4-tab middle-layer experience
  // 'beast'     → full 6-tab intelligence command center for power users
  const { viewMode, setViewMode } = useViewMode();
  const isEmergency = result.total >= 80 || (result as any).warnSignal?.hasActiveWARN === true;

  const [activeTab, setActiveTab] = useState<TabValue>(adaptation.defaultTab as TabValue);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Refs for each beast-mode section — used for scroll-to-section navigation
  const beastSectionRefs = useRef<Partial<Record<TabValue, HTMLElement>>>({});

  // v40.0 FIX-13: sync activeTab when the adaptation's defaultTab changes.
  // useState only initializes once, so if profile loads late and changes the
  // adaptation mode (e.g., emergency → stable), the tab auto-switches to reflect
  // the correct default. Guard: only switch if the user hasn't manually changed tab.
  const [userChangedTab, setUserChangedTab] = useState(false);
  useEffect(() => {
    if (!userChangedTab) setActiveTab(adaptation.defaultTab as TabValue);
  }, [adaptation.defaultTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show sticky header once user scrolls past ~80px
  useEffect(() => {
    const el = scrollRef.current?.parentElement ?? window;
    const onScroll = () => {
      const scrollY = el === window
        ? window.scrollY
        : (el as HTMLElement).scrollTop;
      setShowStickyHeader(scrollY > 80);
    };
    (el as EventTarget).addEventListener('scroll', onScroll, { passive: true });
    return () => (el as EventTarget).removeEventListener('scroll', onScroll);
  }, []);

  // v40.0 FIX-10: when ProfileQuickCapture completes, trigger a recalculate so
  // the pipeline re-runs with the newly saved profile data and personalizedSet
  // is updated with role-specific actions instead of generic fallback ones.
  useEffect(() => {
    const handler = () => { props.onRecalculate?.(); };
    window.addEventListener('hp.quickCapture.completed', handler);
    return () => window.removeEventListener('hp.quickCapture.completed', handler);
  }, [props.onRecalculate]);

  // Wave 7.1: mark audit complete whenever result changes (new audit)
  // Wave 4.3: also clears the re-engagement cooldown so the next check is fresh
  useEffect(() => {
    if (result?.companyName) {
      markAuditComplete(result.companyName);
      clearReEngagementState();      // Fresh audit → no immediate re-engagement nudge
      setReEngagementDismissed(true); // Hide any currently-showing nudge
    }
    // Achievement checks + score improvement celebration
    try {
      const history = getLayoffScoreHistory();
      const prev = history.length >= 2 ? history[history.length - 2] : null;
      checkAndUnlockAchievements({
        auditCount: history.length,
        currentScore: result.total,
        previousScore: prev?.score,
      });
      // Phase 18: fire confetti celebration when score drops ≥ 3 points (lower = better)
      if (prev?.score != null && prev.score - result.total >= 3) {
        setScoreCelebration({ prev: prev.score, curr: result.total });
      }
    } catch {}
  }, [result]);

  // Wave 7.1: check for intelligence updates since last audit
  // Runs once on mount, after a 1.5s delay so the score reveal finishes first.
  // Skipped if the user already dismissed the banner this session.
  useEffect(() => {
    if (bannerDismissed || !result?.companyName) return;
    const timer = setTimeout(async () => {
      try {
        const update = await checkForIntelligenceUpdates(
          result.companyName ?? companyData?.name ?? '',
          result.total,
        );
        if (update.shouldPromptReaudit) {
          setIntelligenceUpdate(update);
        }
      } catch { /* non-critical — silently swallow */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // v39.0 F4 — listen for cross-tab navigation events so child panels (e.g.
  // SummaryTab's "View all signal weights" link) can request a tab switch
  // without taking a direct dependency on the dashboard's setActiveTab.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab && typeof detail.tab === 'string') {
        const tab = detail.tab as TabValue;
        // Only accept known tab values; ignore stray events.
        if (['summary', 'company', 'protection', 'actions'].includes(tab)) {
          setActiveTab(tab);
          const el = beastSectionRefs.current[tab];
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }
      }
    };
    window.addEventListener('hp.dashboard.navigate', handler as EventListener);
    return () => window.removeEventListener('hp.dashboard.navigate', handler as EventListener);
  }, []);

  // v40.0 keyboard navigation — Alt+1–6 for direct tab access; arrow keys
  // when focus is on the tab bar. Guard: never intercept keys when focus is
  // inside a text input, textarea, select, or contenteditable.
  useEffect(() => {
    const TABS: TabValue[] = ['summary', 'company', 'protection', 'actions'];
    const isEditableTarget = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' ||
        t.isContentEditable || !!t.closest('[contenteditable]');
    };
    const handler = (e: KeyboardEvent) => {
      // Don't intercept keys when the user is typing in a form field
      if (isEditableTarget(e.target)) return;
      // Alt+1 through Alt+6 — direct tab access
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= TABS.length) {
          e.preventDefault();
          handleTabChange(TABS[n - 1]);
        }
      }
      // Arrow keys when focus is within the tab bar
      if (document.activeElement?.closest('[data-tab-bar]')) {
        if (e.key === 'ArrowRight') {
          const idx = TABS.indexOf(activeTab);
          handleTabChange(TABS[(idx + 1) % TABS.length]);
        } else if (e.key === 'ArrowLeft') {
          const idx = TABS.indexOf(activeTab);
          handleTabChange(TABS[(idx - 1 + TABS.length) % TABS.length]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

  // IntersectionObserver: keep beast-mode tab bar in sync with scroll position
  useEffect(() => {
    if (viewMode !== 'beast') return;
    const BEAST_TABS: TabValue[] = ['summary', 'company', 'protection', 'actions'];
    const observers: IntersectionObserver[] = [];
    const ratioMap = new Map<TabValue, number>();

    BEAST_TABS.forEach(tab => {
      const el = beastSectionRefs.current[tab];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            ratioMap.set(tab, entry.intersectionRatio);
          } else {
            ratioMap.delete(tab);
          }
          if (ratioMap.size > 0) {
            const top = [...ratioMap.entries()].reduce((a, b) => a[1] >= b[1] ? a : b);
            setActiveTab(top[0]);
          }
        },
        { threshold: [0, 0.15, 0.5], rootMargin: '-100px 0px -40% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [viewMode]);

  const handleTabChange = (val: TabValue) => {
    setUserChangedTab(true);
    track('tab_switched', {
      from: activeTab,
      to: val,
      score: result.total,
      confidence: result.confidencePercent,
      freshness_tier: result.unifiedFreshness?.tier,
    });
    setActiveTab(val);
    const el = beastSectionRefs.current[val];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // Mobile swipe gesture for tab navigation
  const SWIPE_TABS: TabValue[] = ['summary', 'company', 'protection', 'actions'];
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => {
      const idx = SWIPE_TABS.indexOf(activeTab);
      if (idx < SWIPE_TABS.length - 1) handleTabChange(SWIPE_TABS[idx + 1]);
    },
    onSwipeRight: () => {
      const idx = SWIPE_TABS.indexOf(activeTab);
      if (idx > 0) handleTabChange(SWIPE_TABS[idx - 1]);
    },
  });

  const tabProps = useMemo(() => ({
    result, companyData,
    onRetake: props.onRetake,
    onDownload: props.onDownload,
    onRecalculate: props.onRecalculate,
    auditStage: props.auditStage,
  }), [result, companyData, props.onRetake, props.onDownload, props.onRecalculate, props.auditStage]);

  return (
    <GlobalErrorBoundary>
      <div className="flex flex-col" ref={scrollRef}>

        {/* ── Permanent top bar — always visible, sticks just below the floating
              global nav pill (.nav-root, fixed top:12px height:var(--nav-h)).
              top:0 here would tuck this bar directly behind that pill once the
              page scrolls, clipping the company name and tab labels. ─────── */}
        <div className="hp-sticky-bar">
          {/* Single row: company name (truncated) + score chip + mode toggle.
              On phones ≤480px the score label is hidden to prevent overflow. */}
          <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
            {/* Company name — takes available space, truncates cleanly */}
            <p
              className="flex-1 min-w-0 text-[13px] font-semibold truncate text-token-1"
              title={companyData?.name ?? result.companyName ?? 'Company'}
            >
              {companyData?.name ?? result.companyName ?? 'Company'}
            </p>

            {/* Score chip — hide the text label on smallest phones */}
            {(() => {
              const rc = riskColor(result.total);
              return (
                <div
                  className="score-chip-dyn flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
                  style={{ '--chip-color': rc, '--chip-bg': `${rc}22`, '--chip-border': `${rc}40` } as React.CSSProperties}
                >
                  <span className="text-[12px] font-black leading-none score-val">{result.total}</span>
                  <span className="hidden xs:inline text-[10px] font-bold tracking-wide score-lbl">
                    {riskLabel(result.total)}
                  </span>
                </div>
              );
            })()}

            {/* View mode toggle: Guided → Analysis → Beast */}
            <ViewModeToggle
              viewMode={viewMode}
              onSelect={setViewMode}
              emergencyMode={isEmergency}
              compact
            />
          </div>

          {/* Row 2: tab bar — only in Beast Mode, desktop/tablet only */}
          {viewMode === 'beast' && (
            <DesktopTabBar
              active={activeTab}
              onChange={handleTabChange}
              result={result}
            />
          )}
        </div>

        {/* ── Scroll-triggered sticky header (hidden — replaced by permanent top bar above) */}
        {/* Kept for future reference; set visible={false} so it never renders. */}
        <div className="hidden">
          <StickyCompanyHeader
            companyName={companyData?.name ?? result.companyName ?? 'Company'}
            score={result.total}
            visible={false}
          />
        </div>

        {/* ── Wave 1.4: Risk update banner — fires when breaking news injects a new event ── */}
        {riskUpdateBanner && (
          <div className="px-4 pt-3 sm:px-0">
            <RiskUpdateBanner
              companyName={riskUpdateBanner.company}
              headline={riskUpdateBanner.headline}
              isReanalyzing={isRiskReanalyzing}
              onReanalyze={() => {
                setIsRiskReanalyzing(true);
                // Trigger re-analysis, then clear banner when done
                setTimeout(() => {
                  props.onRecalculate?.();
                  setIsRiskReanalyzing(false);
                  setRiskUpdateBanner(null);
                }, 300);
              }}
              onDismiss={() => setRiskUpdateBanner(null)}
            />
          </div>
        )}

        {/* ── Wave 7.1: Intelligence update banner — new signals since last audit ── */}
        {intelligenceUpdate && !bannerDismissed && (
          <IntelligenceUpdateBanner
            update={intelligenceUpdate}
            companyName={companyData?.name ?? result.companyName ?? 'your company'}
            onRecalculate={props.onRecalculate}
            onDismiss={() => {
              setBannerDismissed(true);
              try { sessionStorage.setItem('hp.iu.dismissed', '1'); } catch { /* swallow */ }
            }}
          />
        )}

        {/* ── Wave 4.3: Re-engagement nudge (day-7/30/90) ─────────────────── */}
        {reEngagementTrigger && !reEngagementDismissed && !intelligenceUpdate?.shouldPromptReaudit && (
          <div className="px-4 pt-3 sm:px-0">
            <div className="reengagement-nudge flex items-start gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-cyan">
                  {reEngagementTrigger.headline}
                </p>
                <p className="text-[10px] mt-0.5 text-token-2">
                  {reEngagementTrigger.subtext}
                </p>
              </div>
              {props.onRecalculate && (
                <button
                  type="button"
                  onClick={() => {
                    setReEngagementDismissed(true);
                    clearReEngagementState();
                    props.onRecalculate?.();
                  }}
                  className="reengagement-nudge-cta"
                >
                  {reEngagementTrigger.ctaLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setReEngagementDismissed(true)}
                className="flex-shrink-0 opacity-35 hover:opacity-70 transition-opacity px-1 text-token-1"
                aria-label="Dismiss"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* ── Emergency banner — only shown in Beast Mode.
            Guidance and Analysis modes render their own inline emergency state.
            Showing both would double-stack two separate red emergency panels. */}
        {adaptation.showEmergencyBanner && viewMode === 'beast' && (
          <div className="px-4 pt-3 sm:px-0">
            <EmergencyModeBanner
              result={result}
              onJumpToActions={() => {
                handleTabChange('actions');
              }}
            />
          </div>
        )}

        {/* ── Return Visit Panel — shows "Welcome Back" for returning users ── */}
        {(() => {
          try {
            const history = getLayoffScoreHistory();
            const compName = companyData?.name ?? (result as any).companyName ?? '';
            const matching = history.filter(e => compName && e.companyName?.toLowerCase() === compName.toLowerCase());
            const last = matching.at(-1);
            if (last) {
              const daysSince = Math.max(1, Math.round((Date.now() - new Date(last.timestamp).getTime()) / 86400000));
              if (daysSince >= 1) {
                return (
                  <div className="px-4 pt-3 sm:px-0">
                    <ReturnVisitPanel
                      daysSince={daysSince}
                      scoreBefore={last.score}
                      scoreNow={result.total}
                      newSignals={intelligenceUpdate?.signalCount ?? 0}
                      companyName={compName || undefined}
                      completedActions={loadCompletionsLocal().size}
                      marketChanges={intelligenceUpdate?.topHeadline ? [{
                        label: 'Breaking news',
                        direction: 'up',
                        detail: intelligenceUpdate.topHeadline,
                      }] : undefined}
                    />
                  </div>
                );
              }
            }
          } catch {}
          return null;
        })()}

        {/* ── Content area — Guidance / Analysis / Beast ── */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div onTouchStart={swipeHandlers.onTouchStart} onTouchEnd={swipeHandlers.onTouchEnd}>
        <AnimatePresence mode="wait">
        {viewMode === 'guidance' ? (
          /* ── Guidance Mode ── */
          <motion.div
            key="guidance-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="hp-guidance-content px-3 pt-3 sm:px-0 sm:pt-0"
          >
            <TabErrorBoundary tabLabel="Guidance">
              <Suspense fallback={<SummaryTabSkeleton />}>
                <GuidanceView
                  result={result}
                  companyData={companyData}
                  emergencyMode={isEmergency}
                  onSwitchToBeast={() => {
                    setViewMode('beast');
                    setActiveTab('summary');
                    setUserChangedTab(true);
                  }}
                />
              </Suspense>
            </TabErrorBoundary>
          </motion.div>
        ) : viewMode === 'analysis' ? (
          /* ── Analysis Mode ── */
          <motion.div
            key="analysis-view"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="hp-analysis-content px-3 pt-3 sm:px-0 sm:pt-0"
          >
            <TabErrorBoundary tabLabel="Analysis">
              <Suspense fallback={<SummaryTabSkeleton />}>
                <AnalysisView
                  result={result}
                  companyData={companyData}
                  emergencyMode={isEmergency}
                  onSwitchToBeast={() => {
                    setViewMode('beast');
                    setActiveTab('summary');
                    setUserChangedTab(true);
                  }}
                />
              </Suspense>
            </TabErrorBoundary>
          </motion.div>
        ) : (
          /* ── Beast Mode: single-scroll command center — all 6 sections stacked ── */
          <>
            <div className="flex flex-col">
              {([
                { key: 'summary',    label: 'Summary',     Comp: SummaryTab,      Fallback: SummaryTabSkeleton },
                { key: 'company',    label: 'Company',     Comp: IntelligenceTab, Fallback: CompanyTabSkeleton },
                { key: 'protection', label: 'Skills',      Comp: ProtectionTab,   Fallback: GenericTabSkeleton },
                { key: 'actions',    label: 'Action Plan', Comp: ActionsTab,      Fallback: GenericTabSkeleton },
              ] as const).map(({ key, label, Comp, Fallback }, idx) => (
                <section
                  key={key}
                  id={`bm-${key}`}
                  ref={el => { if (el) beastSectionRefs.current[key] = el; }}
                  className={`hp-beast-content px-3 pt-3 sm:px-0 sm:pt-0${idx > 0 ? ' hp-section-divider' : ''}`}
                >
                  <TabErrorBoundary tabLabel={label}>
                    <Suspense fallback={<Fallback />}>
                      <Comp {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                </section>
              ))}
            </div>

            {/* Mobile bottom nav — scrolls to section on tap */}
            <MobileBottomNav
              active={activeTab}
              onChange={handleTabChange}
              result={result}
            />
          </>
        )}
        </AnimatePresence>

        </div>{/* end swipe gesture wrapper */}

        {/* ── Wave 7.3: AI Commentary — per-tab floating guidance bubble ──── */}
        {/* Fixed bottom-center overlay, appears 2s after tab load, 1× per session. */}
        {/* Only shown in Beast Mode — activeTab is not meaningful in Guidance Mode */}
        {viewMode === 'beast' && <AICommentary activeTab={activeTab} result={result} />}

        {/* ── Wave 3.4: Action completion celebration toast ─────────────── */}
        {/* Fixed bottom-right, appears when 'hp.action.milestone' fires.   */}
        <ActionCelebrationToast />

        {/* ── Phase 18 Delight: score improvement confetti ─────────────── */}
        {scoreCelebration && (
          <ScoreImprovementCelebration
            previousScore={scoreCelebration.prev}
            currentScore={scoreCelebration.curr}
            onDismiss={() => setScoreCelebration(null)}
          />
        )}

        {/* ── Phase 17: Career Copilot — contextual guidance panel ──────── */}
        <CareerCopilotButton context={{
          score: result.total,
          workTypeKey: result.workTypeKey,
          roleTitle: (result as any).roleTitle,
          industryKey: result.industryKey,
          tenureYears: result.tenureYears ?? undefined,
          companyName: result.companyName ?? (companyData as any)?.name,
          topDriverLabel: (result as any).strategySynthesis?.singleBiggestRisk,
          topAction: result.recommendations?.[0]?.title,
          skillGapCount: (result as any).skillGapIntelligence?.upskillPriority?.length,
          escapePaths: (result as any).escapeReport?.paths?.length,
        }} />

      </div>
    </GlobalErrorBoundary>
  );
};

export default LayoffAuditDashboardV3;

// v34 visibility fix:
// The v3 dashboard has been the active design target since v17, with
// v17→v34 of redesigns layered on top of it. The original env-gate
// (`VITE_TABS_V3 === '1'`) silently fell through to the legacy v1
// dashboard whenever the env var was missing or '0' — which is what
// happened in `.env` (`VITE_TABS_V3=0`), making every redesign
// invisible in dev and on Vercel. The gate is now hardcoded to true.
// Removing the call site is a follow-up; keeping the export with
// the new return value preserves back-compat for any caller still
// referencing it.
export const isTabsV3Enabled = (): boolean => true;
