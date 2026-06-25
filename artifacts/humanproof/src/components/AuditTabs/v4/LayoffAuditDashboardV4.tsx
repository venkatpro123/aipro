// LayoffAuditDashboardV4.tsx — P1 (3-tab collapse)
//
// Collapses the 6-tab V3 information architecture into 3 decision-driven tabs,
// driven by the orchestrator (signalOrchestrator) so the dashboard reads like
// one continuously-thinking AI rather than a stack of equal-weight panels:
//
//   1. My Risk      — the AI's read (ReasoningSpineCard, inside SummaryTab) +
//                     score + drivers + actions; company deep-dive collapsed below.
//   2. Take Action  — the action plan, primary-move-led; career protection below.
//   3. Explore      — deep intelligence (risk math, scenarios); methodology below.
//
// IMPORTANT (non-breaking): this re-parents the EXISTING tab components
// unmodified — SummaryTab, IntelligenceTab (Company), ProtectionTab, ActionsTab,
// AnalysisTab (Deep Intel), TransparencyTab (Methodology). Nothing is rebuilt.
// The secondary section in each tab is wrapped in AdaptiveBlock (collapsed by
// default) for progressive disclosure — every former tab's content stays
// reachable. Gated behind getDashboardVariant() ('v3' default), so V3 remains
// the production path until V4 is validated.
//
// Mirrors V3's shell mechanics: useDashboardAdaptationV4 + pickDefaultTabV4 for
// the urgency-aware landing tab, sticky header, desktop pill bar, mobile portal
// nav, Alt+1–3 keyboard nav, swipe, emergency banner, and the live banner suite.

import React, { Suspense, lazy, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Compass, Building2, LifeBuoy, Info } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';
import { TabErrorBoundary } from '../common/TabErrorBoundary';
import { useDashboardAdaptationV4, type TabKeyV4 } from '../../../hooks/useDashboardAdaptation';
import AdaptiveBlock from '../common/AdaptiveBlock';
import EmergencyModeBanner from '../common/EmergencyModeBanner';
import { AICommentary } from '../common/AICommentary';
import { riskColor, riskLabel } from '../../../lib/riskTokens';
import { track } from '../../../services/analyticsService';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { supabase as _supabase } from '../../../utils/supabase';
import { IntelligenceUpdateBanner } from '../../IntelligenceUpdateBanner';
import { SummaryTabSkeleton } from '../../Skeletons/SummaryTabSkeleton';
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

// Lazy-load each reused tab — preserves V3's code-splitting (same chunks).
const SummaryTab      = lazy(() => import('../v3/SummaryTab').then(m => ({ default: m.SummaryTab ?? m.default })));
const AnalysisTab     = lazy(() => import('../v3/AnalysisTab').then(m => ({ default: m.AnalysisTab })));
const ProtectionTab   = lazy(() => import('../v3/ProtectionTab').then(m => ({ default: m.ProtectionTab })));
const ActionsTab      = lazy(() => import('../v3/ActionsTab').then(m => ({ default: m.ActionsTab })));
const IntelligenceTab = lazy(() => import('../v3/IntelligenceTab').then(m => ({ default: m.IntelligenceTab })));
const TransparencyTab = lazy(() => import('../TransparencyTab').then(m => ({ default: m.TransparencyTab })));

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  onRetake: () => void;
  onDownload?: () => void;
  onRecalculate?: () => void;
  auditStage?: string;
}

const GenericTabSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 py-1">
    {[0, 1, 2, 3].map(i => (
      <CardSkeleton key={i} height={i === 0 ? 80 : 56} rounded="16px" />
    ))}
  </div>
);

// ── Tab configuration (3 tabs) ─────────────────────────────────────────────────

interface TabConfigV4 {
  value:      TabKeyV4;
  label:      string;
  shortLabel: string;
  Icon:       React.ElementType;
  getBadge?:  (r: HybridResult) => { text: string; color: string } | null;
}

const TAB_CONFIG: TabConfigV4[] = [
  {
    value: 'risk',
    label: 'My Risk',
    shortLabel: 'Risk',
    Icon: Shield,
    getBadge: (r) => ({ text: riskLabel(r.total), color: riskColor(r.total) }),
  },
  {
    value: 'actions',
    label: 'Take Action',
    shortLabel: 'Action',
    Icon: Zap,
    getBadge: (r) => {
      const critical = (r.recommendations ?? []).filter(rec => rec.priority === 'Critical').length;
      return critical > 0 ? { text: `${critical}!`, color: '#dc2626' } : null;
    },
  },
  {
    value: 'explore',
    label: 'Explore',
    shortLabel: 'Explore',
    Icon: Compass,
    getBadge: (r) => {
      const live = r.signalQuality?.liveSignals ?? 0;
      return live > 0 ? { text: `${live}`, color: '#10b981' } : null;
    },
  },
];

const TAB_ORDER: TabKeyV4[] = ['risk', 'actions', 'explore'];

// Map legacy V3 navigate-event tab keys onto the V4 tabs so child panels that
// dispatch `hp.dashboard.navigate` (e.g. SummaryTab's "Open Action Plan" or
// "View all signal weights") still route correctly under the 3-tab shell.
const LEGACY_TAB_TO_V4: Record<string, TabKeyV4> = {
  summary: 'risk',
  company: 'risk',
  risk: 'risk',
  protection: 'actions',
  actions: 'actions',
  intel: 'explore',
  transparency: 'explore',
  explore: 'explore',
};

// Reverse map for components (e.g. AICommentary) keyed on the V3 TabValue taxonomy:
// surface each V4 tab's primary/open legacy tab.
const V4_TO_LEGACY_TAB: Record<TabKeyV4, 'summary' | 'company' | 'protection' | 'actions' | 'intel' | 'transparency'> = {
  risk: 'summary',
  actions: 'actions',
  explore: 'intel',
};

// ── Sticky company header ─────────────────────────────────────────────────────

const StickyCompanyHeader: React.FC<{ companyName: string; score: number; visible: boolean }> = ({
  companyName, score, visible,
}) => {
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
            borderBottom: '1px solid var(--alpha-bg-08)',
          }}
        >
          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--alpha-text-85)' }} title={companyName}>
            {companyName}
          </p>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-3 flex-shrink-0"
            style={{ background: color + '22', border: `1px solid ${color}40` }}
          >
            <span className="text-[12px] font-black" style={{ color }}>{score}</span>
            <span className="text-[10px] font-bold tracking-wide" style={{ color: color + 'cc' }}>{riskLabel(score)}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Desktop pill tab bar ──────────────────────────────────────────────────────

const DesktopTabBar: React.FC<{ active: TabKeyV4; onChange: (v: TabKeyV4) => void; result: HybridResult }> = ({
  active, onChange, result,
}) => (
  <div
    data-tab-bar
    role="tablist"
    aria-label="Dashboard sections"
    className="hidden sm:flex items-center gap-1 px-2 py-2 overflow-x-auto"
    style={{ background: 'rgba(9,12,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--alpha-bg-08)' }}
  >
    {TAB_CONFIG.map(({ value, label, Icon, getBadge }) => {
      const isActive = value === active;
      const badge = getBadge?.(result);
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
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: badge.color + '22', color: badge.color }}>
              {badge.text}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

// ── Mobile bottom navigation ──────────────────────────────────────────────────

const FEATURE_NAV_CSS = `
@media (max-width: 768px) {
  body.hp-feature-page .mobile-bottom-nav { display: none !important; }
}
`;

const MobileBottomNav: React.FC<{ active: TabKeyV4; onChange: (v: TabKeyV4) => void; result: HybridResult }> = ({
  active, onChange, result,
}) => {
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

  return createPortal(
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[999] flex items-stretch"
      style={{
        background: 'rgba(7,10,18,0.97)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--alpha-bg-08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        minHeight: 58,
      }}
    >
      {TAB_CONFIG.map(({ value, label, shortLabel, Icon, getBadge }) => {
        const isActive = value === active;
        const badge = getBadge?.(result);
        return (
          <button
            key={value}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label} tab${badge ? `: ${badge.text}` : ''}`}
            onClick={() => onChange(value)}
            className="flex-1 flex flex-col items-center justify-center relative"
            style={{ color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.42)', minHeight: 58, padding: '8px 2px 6px', transition: 'color 0.18s ease' }}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-tab-pill-v4"
                className="absolute inset-x-1 rounded-xl"
                style={{ top: 4, bottom: 4, background: 'rgba(0,212,224,0.10)', border: '1px solid rgba(0,212,224,0.22)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              />
            )}
            <div className="relative z-10 mb-0.5">
              <motion.div animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
                <Icon style={{ width: isActive ? 22 : 20, height: isActive ? 22 : 20 }} strokeWidth={isActive ? 2.2 : 1.6} />
              </motion.div>
              {badge && (() => {
                const isLong = badge.text.length > 3;
                return isLong ? (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: badge.color, boxShadow: `0 0 6px ${badge.color}aa` }} />
                ) : (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center font-black whitespace-nowrap"
                    style={{ background: badge.color, color: '#fff', fontSize: 9, lineHeight: 1, boxShadow: `0 0 6px ${badge.color}88` }}
                  >
                    {badge.text}
                  </span>
                );
              })()}
            </div>
            <span className="relative z-10 font-semibold leading-none" style={{ fontSize: 9.5, letterSpacing: isActive ? '0.02em' : '0' }}>
              {shortLabel}
            </span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
};

// ── Collapsed secondary section (progressive disclosure) ───────────────────────
// Wraps a reused tab in an AdaptiveBlock so its (heavy, lazy) content only
// mounts when the user expands it.

const SecondarySection: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tabLabel: string;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, tabLabel, children }) => (
  <AdaptiveBlock title={title} subtitle={subtitle} icon={icon} tier={3} defaultOpen={false} flush>
    <TabErrorBoundary tabLabel={tabLabel}>
      <Suspense fallback={<GenericTabSkeleton />}>
        <div className="px-4 py-4 sm:px-3">{children}</div>
      </Suspense>
    </TabErrorBoundary>
  </AdaptiveBlock>
);

// ── Main dashboard ────────────────────────────────────────────────────────────

export const LayoffAuditDashboardV4: React.FC<Props> = (props) => {
  const { result, companyData } = props;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [, forceRerender] = useState(0);
  const [intelligenceUpdate, setIntelligenceUpdate] = useState<IntelligenceUpdateResult | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try { return !!sessionStorage.getItem('hp.iu.dismissed'); } catch { return false; }
  });
  const [reEngagementTrigger, setReEngagementTrigger] = useState<ReEngagementTrigger | null>(() => {
    try { return evaluateReEngagementTrigger(result.companyName, result.total); } catch { return null; }
  });
  const [reEngagementDismissed, setReEngagementDismissed] = useState(false);
  const [riskUpdateBanner, setRiskUpdateBanner] = useState<{ headline: string; company: string } | null>(null);
  const [isRiskReanalyzing, setIsRiskReanalyzing] = useState(false);

  useEffect(() => {
    const currentCompany = (companyData?.name ?? result.companyName ?? '').toLowerCase();
    if (!currentCompany) return;
    const unsub = onNewLayoffEvent((evt) => {
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
      if (session?.user) load();
    });
    const onStorage = (e: StorageEvent) => {
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

  const adaptation = useDashboardAdaptationV4(result, companyData, userProfile);
  const [activeTab, setActiveTab] = useState<TabKeyV4>(adaptation.defaultTab);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [userChangedTab, setUserChangedTab] = useState(false);
  useEffect(() => {
    if (!userChangedTab) setActiveTab(adaptation.defaultTab);
  }, [adaptation.defaultTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current?.parentElement ?? window;
    const onScroll = () => {
      const scrollY = el === window ? window.scrollY : (el as HTMLElement).scrollTop;
      setShowStickyHeader(scrollY > 80);
    };
    (el as EventTarget).addEventListener('scroll', onScroll, { passive: true });
    return () => (el as EventTarget).removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = () => { props.onRecalculate?.(); };
    window.addEventListener('hp.quickCapture.completed', handler);
    return () => window.removeEventListener('hp.quickCapture.completed', handler);
  }, [props.onRecalculate]);

  useEffect(() => {
    if (result?.companyName) {
      markAuditComplete(result.companyName);
      clearReEngagementState();
      setReEngagementDismissed(true);
    }
  }, [result]);

  useEffect(() => {
    if (bannerDismissed || !result?.companyName) return;
    const timer = setTimeout(async () => {
      try {
        const update = await checkForIntelligenceUpdates(result.companyName ?? companyData?.name ?? '', result.total);
        if (update.shouldPromptReaudit) setIntelligenceUpdate(update);
      } catch { /* non-critical */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab navigation — map legacy V3 tab keys onto the 3 V4 tabs.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab && typeof detail.tab === 'string') {
        const mapped = LEGACY_TAB_TO_V4[detail.tab];
        if (mapped) setActiveTab(mapped);
      }
    };
    window.addEventListener('hp.dashboard.navigate', handler as EventListener);
    return () => window.removeEventListener('hp.dashboard.navigate', handler as EventListener);
  }, []);

  const handleTabChange = (val: TabKeyV4) => {
    setUserChangedTab(true);
    track('tab_switched', {
      from: activeTab,
      to: val,
      score: result.total,
      confidence: result.confidencePercent,
      freshness_tier: result.unifiedFreshness?.tier,
      variant: 'v4',
    });
    setActiveTab(val);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Keyboard nav — Alt+1–3 + arrow keys on the tab bar.
  useEffect(() => {
    const isEditableTarget = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable || !!t.closest('[contenteditable]');
    };
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= TAB_ORDER.length) {
          e.preventDefault();
          handleTabChange(TAB_ORDER[n - 1]);
        }
      }
      if (document.activeElement?.closest('[data-tab-bar]')) {
        const idx = TAB_ORDER.indexOf(activeTab);
        if (e.key === 'ArrowRight') handleTabChange(TAB_ORDER[(idx + 1) % TAB_ORDER.length]);
        else if (e.key === 'ArrowLeft') handleTabChange(TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab]);

  // Mobile swipe — left → next, right → prev.
  const swipeBind = useDrag(({ last, movement: [mx, my], cancel }) => {
    if (Math.abs(my) > Math.abs(mx)) { cancel(); return; }
    if (!last) return;
    const threshold = 60;
    const idx = TAB_ORDER.indexOf(activeTab);
    if (mx < -threshold && idx < TAB_ORDER.length - 1) handleTabChange(TAB_ORDER[idx + 1]);
    else if (mx > threshold && idx > 0) handleTabChange(TAB_ORDER[idx - 1]);
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

        <div className="sticky top-0 z-40">
          <StickyCompanyHeader
            companyName={companyData?.name ?? result.companyName ?? 'Company'}
            score={result.total}
            visible={showStickyHeader}
          />
          <DesktopTabBar active={activeTab} onChange={handleTabChange} result={result} />
        </div>

        {riskUpdateBanner && (
          <div className="px-4 pt-3 sm:px-0">
            <RiskUpdateBanner
              companyName={riskUpdateBanner.company}
              headline={riskUpdateBanner.headline}
              isReanalyzing={isRiskReanalyzing}
              onReanalyze={() => {
                setIsRiskReanalyzing(true);
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

        {reEngagementTrigger && !reEngagementDismissed && !intelligenceUpdate?.shouldPromptReaudit && (
          <div className="px-4 pt-3 sm:px-0">
            <div className="rounded-xl flex items-start gap-3 px-3 py-2.5" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold" style={{ color: '#22d3ee' }}>{reEngagementTrigger.headline}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-50)' }}>{reEngagementTrigger.subtext}</p>
              </div>
              {props.onRecalculate && (
                <button
                  onClick={() => { setReEngagementDismissed(true); clearReEngagementState(); props.onRecalculate?.(); }}
                  className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:scale-[1.03]"
                  style={{ background: 'rgba(34,211,238,0.14)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.28)' }}
                >
                  {reEngagementTrigger.ctaLabel}
                </button>
              )}
              <button
                onClick={() => setReEngagementDismissed(true)}
                className="flex-shrink-0 opacity-35 hover:opacity-70 transition-opacity text-[10px] px-1"
                style={{ color: 'var(--alpha-text-70)' }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {adaptation.showEmergencyBanner && (
          <div className="px-4 pt-3 sm:px-0">
            <EmergencyModeBanner result={result} onJumpToActions={() => handleTabChange('actions')} />
          </div>
        )}

        <div {...swipeBind()} style={{ touchAction: 'pan-y' }}>
          <AnimatePresence>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="px-4 pt-4 sm:px-0 sm:pt-0 flex flex-col gap-4"
              style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* ── My Risk — AI read + score + drivers; company deep-dive collapsed ── */}
              {activeTab === 'risk' && (
                <>
                  <TabErrorBoundary tabLabel="My Risk">
                    <Suspense fallback={<SummaryTabSkeleton />}>
                      <SummaryTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                  <SecondarySection title="Company deep-dive" subtitle="Ground truth, market signals & hiring" icon={Building2} tabLabel="Company">
                    <IntelligenceTab {...tabProps} />
                  </SecondarySection>
                </>
              )}

              {/* ── Take Action — action plan; career protection collapsed ── */}
              {activeTab === 'actions' && (
                <>
                  <TabErrorBoundary tabLabel="Take Action">
                    <Suspense fallback={<GenericTabSkeleton />}>
                      <ActionsTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                  <SecondarySection title="Career protection" subtitle="Skills, mobility & contingency planning" icon={LifeBuoy} tabLabel="Protection">
                    <ProtectionTab {...tabProps} />
                  </SecondarySection>
                </>
              )}

              {/* ── Explore — deep intelligence; methodology collapsed ── */}
              {activeTab === 'explore' && (
                <>
                  <TabErrorBoundary tabLabel="Explore">
                    <Suspense fallback={<GenericTabSkeleton />}>
                      <AnalysisTab {...tabProps} />
                    </Suspense>
                  </TabErrorBoundary>
                  <SecondarySection title="Methodology & data provenance" subtitle="How this was calculated · sources & confidence" icon={Info} tabLabel="Methodology">
                    <TransparencyTab {...tabProps} />
                  </SecondarySection>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <MobileBottomNav active={activeTab} onChange={handleTabChange} result={result} />

        <AICommentary activeTab={V4_TO_LEGACY_TAB[activeTab]} result={result} />
        <ActionCelebrationToast />
      </div>
    </GlobalErrorBoundary>
  );
};

export default LayoffAuditDashboardV4;
