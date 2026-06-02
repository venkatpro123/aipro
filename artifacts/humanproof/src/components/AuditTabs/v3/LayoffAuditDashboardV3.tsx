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
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Building2, Shield, Zap, Radio, Info } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';
import { TabErrorBoundary } from '../common/TabErrorBoundary';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import EmergencyModeBanner from '../common/EmergencyModeBanner';
import { AICommentary } from '../common/AICommentary';
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
import { RiskUpdateBanner } from '../../RiskUpdateBanner';
import { onNewLayoffEvent } from '../../../data/layoffNewsCache';

// ── View mode imports (Guidance / Intelligence toggle) ───────────────────────
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from './ViewModeToggle';
// GuidanceView is lazy-loaded so it never bloats the Intelligence Mode bundle.
const GuidanceView = lazy(() => import('./GuidanceView').then(m => ({ default: m.GuidanceView ?? m.default })));

// Lazy-load each tab. Code-splitting is critical for first-paint perf — the
// Action Plan tab alone is ~180kB gzipped because it includes the negotiation /
// scenario / contingency engines and animation surface.
const SummaryTab      = lazy(() => import('./SummaryTab').then(m => ({ default: m.SummaryTab ?? m.default })));
const AnalysisTab     = lazy(() => import('./AnalysisTab').then(m => ({ default: m.AnalysisTab })));
const ProtectionTab   = lazy(() => import('./ProtectionTab').then(m => ({ default: m.ProtectionTab })));
const ActionsTab      = lazy(() => import('./ActionsTab').then(m => ({ default: m.ActionsTab })));
const IntelligenceTab = lazy(() => import('./IntelligenceTab').then(m => ({ default: m.IntelligenceTab })));
// v39.0 A6: TransparencyTab — methodology / data provenance surface. Previously
// orphan-imported in AnalysisTab but never rendered. Wired as the 6th nav tab.
const TransparencyTab = lazy(() => import('../TransparencyTab').then(m => ({ default: m.TransparencyTab })));

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  onRetake: () => void;
  onDownload?: () => void;
  onRecalculate?: () => void;
  auditStage?: string;
}

type TabValue = 'summary' | 'company' | 'protection' | 'actions' | 'intel' | 'transparency';

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
  {
    value: 'summary',
    label: 'Summary',
    shortLabel: 'Summary',
    Icon: TrendingUp,
    getBadge: (r) => {
      const c = riskColor(r.total);
      return { text: riskLabel(r.total), color: c };
    },
  },
  {
    value: 'company',
    label: 'Company',
    shortLabel: 'Company',
    Icon: Building2,
    getBadge: (r: any) => {
      const warnActive = r.warnSignal?.hasActiveWARN === true;
      if (warnActive) return { text: 'WARN', color: '#dc2626' };
      const rounds = r.companyData?.layoffRounds ?? 0;
      if (rounds >= 2) return { text: `${rounds}×`, color: '#f97316' };
      const hiringFreeze = r.hiringSignal?.trend === 'frozen' || r.companyData?._hiringPostingTrend === 'frozen';
      if (hiringFreeze) return { text: 'frozen', color: '#f97316' };
      return null;
    },
  },
  {
    value: 'protection',
    label: 'Protection',
    shortLabel: 'Protect',
    Icon: Shield,
    getBadge: (r: any) => {
      const p = r.preparednessScore?.overallScore;
      if (typeof p !== 'number') return null;
      const color = p >= 75 ? '#10b981' : p >= 55 ? '#22d3ee' : p >= 35 ? '#f59e0b' : '#f97316';
      return { text: `${p}`, color };
    },
  },
  {
    value: 'actions',
    label: 'Act Now',
    shortLabel: 'Actions',
    Icon: Zap,
    getBadge: (r) => {
      const critical = (r.recommendations ?? []).filter(rec => rec.priority === 'Critical').length;
      return critical > 0 ? { text: `${critical}!`, color: '#dc2626' } : null;
    },
  },
  {
    value: 'intel',
    label: 'Deep Intel',
    shortLabel: 'Intel',
    Icon: Radio,
    getBadge: (r) => {
      const live = r.signalQuality?.liveSignals ?? 0;
      return live > 0 ? { text: `${live}`, color: '#10b981' } : null;
    },
  },
  // v39.0 A6: Transparency / methodology — answers "how was this calculated?"
  {
    value: 'transparency',
    label: 'Methodology',
    shortLabel: 'Method',
    Icon: Info,
    getBadge: (r: any) => {
      const conf = r.confidencePercent ?? 0;
      if (conf < 60) return { text: 'low', color: '#f97316' };
      return null;
    },
  },
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
          className="flex items-center justify-between px-4 py-2.5"
          style={{
            background: 'rgba(9,12,20,0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* v39.0 F7: native title attribute reveals the full company name
              on hover/long-press when the text truncates. Lightweight tooltip
              that works on mobile (long-press menu) without pulling in a
              Tooltip component dependency. */}
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            title={companyName}
          >
            {companyName}
          </p>
          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: color + '22', border: `1px solid ${color}40` }}
            >
              <span className="text-[12px] font-black" style={{ color }}>{score}</span>
              <span className="text-[10px] font-bold tracking-wide" style={{ color: color + 'cc' }}>
                {riskLabel(score)}
              </span>
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
  <div
    data-tab-bar
    role="tablist"
    aria-label="Dashboard sections"
    className="hidden sm:flex items-center gap-1 px-2 py-2 overflow-x-auto"
    style={{
      background: 'rgba(9,12,20,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}
  >
    {TAB_CONFIG.map(({ value, label, Icon, getBadge }) => {
      const isActive = value === active;
      const badge    = getBadge?.(result);
      return (
        <button
          key={value}
          role="tab"
          aria-selected={isActive}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onChange(value)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap relative"
          style={{
            background: isActive ? 'rgba(0,212,224,0.12)' : 'transparent',
            border: `1px solid ${isActive ? 'rgba(0,212,224,0.30)' : 'transparent'}`,
            color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.50)',
          }}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[12px] font-semibold">{label}</span>
          {badge && (
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: badge.color + '22', color: badge.color }}
            >
              {badge.text}
            </span>
          )}
        </button>
      );
    })}
  </div>
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
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[999] flex items-stretch"
      style={{
        background: 'rgba(7,10,18,0.97)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        minHeight: 58,
      }}
    >
      {TAB_CONFIG.map(({ value, label, shortLabel, Icon, getBadge }) => {
        const isActive = value === active;
        const badge    = getBadge?.(result);
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label} tab${badge ? `: ${badge.text}` : ''}`}
            onClick={() => onChange(value)}
            className="flex-1 flex flex-col items-center justify-center relative"
            style={{
              color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.42)',
              minHeight: 58,
              padding: '8px 2px 6px',
              transition: 'color 0.18s ease',
            }}
          >
            {/* Animated pill background for active tab */}
            {isActive && (
              <motion.div
                layoutId="mobile-tab-pill"
                className="absolute inset-x-1 rounded-xl"
                style={{
                  top: 4, bottom: 4,
                  background: 'rgba(0,212,224,0.10)',
                  border: '1px solid rgba(0,212,224,0.22)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              />
            )}

            {/* Icon with notification badge */}
            <div className="relative z-10 mb-0.5">
              <motion.div
                animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Icon
                  style={{ width: isActive ? 22 : 20, height: isActive ? 22 : 20 }}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
              </motion.div>
              {badge && (() => {
                // Tab buttons are only ~63px wide on mobile, so a wide word badge
                // (e.g. "MODERATE") overflows past the leftmost/rightmost tab edge.
                // For anything longer than 3 chars, collapse to a colored dot —
                // the severity is already encoded by the badge color. Short
                // badges (numbers, "2×", "low", "WARN") render as text.
                const isLong = badge.text.length > 3;
                return isLong ? (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{
                      background: badge.color,
                      boxShadow: `0 0 6px ${badge.color}aa`,
                    }}
                  />
                ) : (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center font-black whitespace-nowrap"
                    style={{
                      background: badge.color,
                      color: '#fff',
                      fontSize: 9,
                      lineHeight: 1,
                      boxShadow: `0 0 6px ${badge.color}88`,
                    }}
                  >
                    {badge.text}
                  </span>
                );
              })()}
            </div>

            {/* Label */}
            <span
              className="relative z-10 font-semibold leading-none"
              style={{ fontSize: 9.5, letterSpacing: isActive ? '0.02em' : '0' }}
            >
              {shortLabel}
            </span>
          </button>
        );
      })}
    </div>,
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
  // 'guidance' → compressed 5-section advisor view (default for new users)
  // 'beast'    → full 6-tab intelligence command center for power users
  const { viewMode, toggleViewMode } = useViewMode();
  const isEmergency = result.total >= 80 || (result as any).warnSignal?.hasActiveWARN === true;

  const [activeTab, setActiveTab] = useState<TabValue>(adaptation.defaultTab as TabValue);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        if (['summary', 'company', 'protection', 'actions', 'intel', 'transparency'].includes(tab)) {
          setActiveTab(tab);
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
    const TABS: TabValue[] = ['summary', 'company', 'protection', 'actions', 'intel', 'transparency'];
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

  const handleTabChange = (val: TabValue) => {
    setUserChangedTab(true); // user explicitly chose a tab — stop auto-syncing
    // v40.0: telemetry for tab navigation
    track('tab_switched', {
      from: activeTab,
      to: val,
      score: result.total,
      confidence: result.confidencePercent,
      freshness_tier: result.unifiedFreshness?.tier,
    });
    setActiveTab(val);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Mobile swipe gesture (left → next tab, right → prev tab) ─────────────
  // Only triggers on horizontal swipes that clearly outweigh vertical movement.
  // Threshold: 60px horizontal with at least 2:1 horizontal:vertical ratio.
  const TABS_ORDER: TabValue[] = ['summary', 'company', 'protection', 'actions', 'intel', 'transparency'];
  const swipeBind = useDrag(({ last, movement: [mx, my], cancel }) => {
    // Cancel if vertical movement dominates — let the user scroll
    if (Math.abs(my) > Math.abs(mx)) { cancel(); return; }
    if (!last) return;
    const threshold = 60;
    if (mx < -threshold) {
      const idx = TABS_ORDER.indexOf(activeTab);
      if (idx < TABS_ORDER.length - 1) handleTabChange(TABS_ORDER[idx + 1]);
    } else if (mx > threshold) {
      const idx = TABS_ORDER.indexOf(activeTab);
      if (idx > 0) handleTabChange(TABS_ORDER[idx - 1]);
    }
  }, { axis: 'lock', pointer: { touch: true } });

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

        {/* ── Permanent top bar — always visible, always at the top ─────────── */}
        {/* The ViewModeToggle MUST be visible immediately on page load.
            StickyCompanyHeader only appears after scroll, so we need a separate
            always-on top bar that shows the toggle at all times. */}
        <div
          className="sticky top-0 z-40"
          style={{
            background: 'rgba(9,12,20,0.95)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Row 1: permanent top bar — company name + score + mode toggle */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <p
              className="text-[13px] font-semibold truncate"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              title={companyData?.name ?? result.companyName ?? 'Company'}
            >
              {companyData?.name ?? result.companyName ?? 'Company'}
            </p>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              {/* Score chip */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: riskColor(result.total) + '22', border: `1px solid ${riskColor(result.total)}40` }}
              >
                <span className="text-[12px] font-black" style={{ color: riskColor(result.total) }}>{result.total}</span>
                <span className="text-[10px] font-bold tracking-wide" style={{ color: riskColor(result.total) + 'cc' }}>
                  {riskLabel(result.total)}
                </span>
              </div>
              {/* Mode toggle — always visible */}
              <ViewModeToggle
                viewMode={viewMode}
                onToggle={toggleViewMode}
                emergencyMode={isEmergency}
              />
            </div>
          </div>

          {/* Row 2: tab bar — only in Beast Mode */}
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
            <div
              className="rounded-xl flex items-start gap-3 px-3 py-2.5"
              style={{
                background: 'rgba(34,211,238,0.06)',
                border: '1px solid rgba(34,211,238,0.18)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold" style={{ color: '#22d3ee' }}>
                  {reEngagementTrigger.headline}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  {reEngagementTrigger.subtext}
                </p>
              </div>
              {props.onRecalculate && (
                <button
                  onClick={() => {
                    setReEngagementDismissed(true);
                    clearReEngagementState();
                    props.onRecalculate?.();
                  }}
                  className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:scale-[1.03]"
                  style={{ background: 'rgba(34,211,238,0.14)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.28)' }}
                >
                  {reEngagementTrigger.ctaLabel}
                </button>
              )}
              <button
                onClick={() => setReEngagementDismissed(true)}
                className="flex-shrink-0 opacity-35 hover:opacity-70 transition-opacity text-[10px] px-1"
                style={{ color: 'rgba(255,255,255,0.70)' }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Emergency banner — only shown in Beast Mode.
            In Guidance Mode, GuidanceView renders its own emergency layout
            (red banner + dominant action). Showing both would double-stack
            two separate red emergency panels for the same situation. */}
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

        {/* ── Content area — switches between Guidance Mode and Beast Mode ── */}
        {viewMode === 'guidance' ? (
          /* ── Guidance Mode: 5-section decision-oriented advisor experience ── */
          <div className="px-4 pt-4 sm:px-0 sm:pt-0" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            <TabErrorBoundary tabLabel="Guidance">
              <Suspense fallback={<SummaryTabSkeleton />}>
                <GuidanceView
                  result={result}
                  companyData={companyData}
                  emergencyMode={isEmergency}
                  onSwitchToBeast={() => {
                    toggleViewMode();         // switch to Beast Mode
                    setActiveTab('summary'); // land on summary tab — full picture first
                    setUserChangedTab(true);
                  }}
                />
              </Suspense>
            </TabErrorBoundary>
          </div>
        ) : (
          /* ── Beast Mode: full 6-tab intelligence command center — unchanged ── */
          <>
            {/* Tab content */}
            {/* v40.0 FIX-7: removed mode="wait" — was forcing exit-then-enter
                sequentially (~360ms blocking transition per tab switch). Parallel
                exit/enter feels snappier and avoids perceived lag on rapid clicks. */}
            {/* Swipe wrapper: gesture handler on a plain div to avoid onDrag type
                conflict between @use-gesture/react and framer-motion. */}
            <div {...swipeBind()} style={{ touchAction: 'pan-y' }}>
            <AnimatePresence>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="px-4 pt-4 sm:px-0 sm:pt-0"
                style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
              >
                {activeTab === 'summary' && (
                  <TabErrorBoundary tabLabel="Summary">
                    <Suspense fallback={<SummaryTabSkeleton />}>
                      <SummaryTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                )}
                {activeTab === 'company' && (
                  <TabErrorBoundary tabLabel="Company">
                    <Suspense fallback={<CompanyTabSkeleton />}>
                      <IntelligenceTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                )}
                {activeTab === 'protection' && (
                  <TabErrorBoundary tabLabel="Protection">
                    <Suspense fallback={<GenericTabSkeleton />}>
                      <ProtectionTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                )}
                {activeTab === 'actions' && (
                  <TabErrorBoundary tabLabel="Action Plan">
                    <Suspense fallback={<GenericTabSkeleton />}>
                      <ActionsTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                )}
                {activeTab === 'intel' && (
                  <TabErrorBoundary tabLabel="Intelligence">
                    <Suspense fallback={<GenericTabSkeleton />}>
                      <AnalysisTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                )}
                {/* v39.0 A6: TransparencyTab — methodology, data provenance, signal attribution. */}
                {activeTab === 'transparency' && (
                  <TabErrorBoundary tabLabel="Methodology">
                    <Suspense fallback={<GenericTabSkeleton />}>
                      <TransparencyTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                )}
              </motion.div>
            </AnimatePresence>
            </div>{/* /swipe wrapper */}

            {/* Mobile bottom nav — only in Beast Mode (Guidance Mode has no tabs) */}
            <MobileBottomNav
              active={activeTab}
              onChange={handleTabChange}
              result={result}
            />
          </>
        )}

        {/* ── Wave 7.3: AI Commentary — per-tab floating guidance bubble ──── */}
        {/* Fixed bottom-center overlay, appears 2s after tab load, 1× per session. */}
        <AICommentary activeTab={activeTab} result={result} />

        {/* ── Wave 3.4: Action completion celebration toast ─────────────── */}
        {/* Fixed bottom-right, appears when 'hp.action.milestone' fires.   */}
        <ActionCelebrationToast />

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
