// LayoffAuditDashboardV4.tsx — V4 UX redesign
//
// 3 primary tabs (My Risk · Take Action · Explore) + 2 header icon drawers
// (Profile drawer · Methodology drawer).
//
// Key improvements over V3:
//   • 6 tabs → 3 tabs: mobile nav drops from sub-7mm to ≥56px tap targets
//   • Methodology and Protection content move to slide-up drawers
//   • Emergency mode transforms the WHOLE layout (not just the default tab)
//   • Intelligence brief is the hero of Explore tab (not one of 6 equal blocks)
//   • FirstAuditWelcome moves to a Dialog modal (not inside results dashboard)
//   • Navigation events from child panels correctly map old tab names to drawers

import React, { Suspense, lazy, useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Zap, Brain, User, HelpCircle } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';
import { TabErrorBoundary } from '../common/TabErrorBoundary';
import {
  useDashboardAdaptationV4, markFirstAuditSeen,
  type TabKeyV4,
} from '../../../hooks/useDashboardAdaptation';
import EmergencyModeBanner from '../common/EmergencyModeBanner';
import { riskColor, riskLabel } from '../../../lib/riskTokens';
import { track } from '../../../services/analyticsService';
import { fetchUserProfile, type UserProfile } from '../../../services/userProfileService';
import { supabase as _supabase } from '../../../utils/supabase';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '../../ui/drawer';
import {
  Dialog, DialogContent,
} from '../../ui/dialog';
import { FirstAuditWelcome } from '../common/FirstAuditWelcome';

// ── Lazy-loaded tabs ──────────────────────────────────────────────────────────

const MyRiskTab   = lazy(() => import('./MyRiskTab').then(m => ({ default: m.MyRiskTab ?? m.default })));
const TakeActionTab = lazy(() => import('./TakeActionTab').then(m => ({ default: m.TakeActionTab ?? m.default })));
const ExploreTab  = lazy(() => import('./ExploreTab').then(m => ({ default: m.ExploreTab ?? m.default })));

// Drawer contents (lazy — only load when opened)
const ProtectionTab  = lazy(() => import('./ProtectionTab').then(m => ({ default: m.ProtectionTab })));
const TransparencyTab = lazy(() => import('../TransparencyTab').then(m => ({ default: m.TransparencyTab })));

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  onRetake?: () => void;
  onDownload?: () => void;
  onRecalculate?: () => void;
  auditStage?: string;
}

// ── Tab loader ────────────────────────────────────────────────────────────────

const TabLoader: React.FC = () => (
  <div className="audit-loader">
    <div className="w-7 h-7 rounded-full border-2 border-[rgba(0,212,224,0.12)] border-t-[var(--cyan)] animate-spin" />
    <p className="audit-loader-stage">Loading…</p>
  </div>
);

// ── Tab configuration (3 items) ───────────────────────────────────────────────

interface TabConfig {
  value:      TabKeyV4;
  label:      string;
  shortLabel: string;
  Icon:       React.ElementType;
  getBadge?:  (r: HybridResult) => { text: string; color: string } | null;
}

const TAB_CONFIG: TabConfig[] = [
  {
    value: 'risk',
    label: 'My Risk',
    shortLabel: 'Risk',
    Icon: TrendingUp,
    getBadge: (r) => {
      const c = riskColor(r.total);
      return { text: riskLabel(r.total), color: c };
    },
  },
  {
    value: 'actions',
    label: 'Take Action',
    shortLabel: 'Act',
    Icon: Zap,
    getBadge: (r) => {
      const critical = (r.recommendations ?? []).filter((rec: any) => rec.priority === 'Critical').length;
      return critical > 0 ? { text: `${critical} critical`, color: '#dc2626' } : null;
    },
  },
  {
    value: 'explore',
    label: 'Intelligence',
    shortLabel: 'Intel',
    Icon: Brain,
    getBadge: (r) => {
      const live = r.signalQuality?.liveSignals ?? 0;
      return live > 0 ? { text: `${live} live`, color: '#10b981' } : null;
    },
  },
];

// Maps old V3 tab names to V4 targets (tab switch or drawer open)
type V4Target = TabKeyV4 | 'profile-drawer' | 'methodology-drawer';
const TAB_ALIAS_MAP: Record<string, V4Target> = {
  transparency: 'methodology-drawer',
  protection:   'profile-drawer',
  profile:      'profile-drawer',
  company:      'risk',
  summary:      'risk',
  actions:      'actions',
  intel:        'explore',
  risk:         'risk',
  explore:      'explore',
};

// ── Sticky company header ─────────────────────────────────────────────────────

const StickyCompanyHeader: React.FC<{
  companyName: string;
  score: number;
  visible: boolean;
  isEmergency: boolean;
  onProfileOpen: () => void;
  onMethodologyOpen: () => void;
}> = ({ companyName, score, visible, isEmergency, onProfileOpen, onMethodologyOpen }) => {
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
            borderTop: isEmergency ? '3px solid #dc2626' : undefined,
          }}
        >
          <p
            className="text-[13px] font-semibold truncate"
            style={{ color: 'rgba(255,255,255,0.85)' }}
            title={companyName}
          >
            {companyName}
          </p>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {/* Profile drawer icon */}
            <button
              onClick={onProfileOpen}
              className="icon-btn w-7 h-7"
              aria-label="View profile & preparedness"
            >
              <User className="w-3.5 h-3.5" />
            </button>
            {/* Methodology drawer icon */}
            <button
              onClick={onMethodologyOpen}
              className="icon-btn w-7 h-7"
              aria-label="View methodology"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <div
              className="signal-chip flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: color + '1a', border: `1px solid ${color}35`, color }}
            >
              <span className="text-[12px] font-black">{score}</span>
              <span className="text-[9px] font-bold tracking-wide" style={{ opacity: 0.8 }}>
                {riskLabel(score)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Desktop pill tab bar (3 items) ────────────────────────────────────────────

const DesktopTabBar: React.FC<{
  active: TabKeyV4;
  onChange: (v: TabKeyV4) => void;
  result: HybridResult;
  isEmergency: boolean;
  onProfileOpen: () => void;
  onMethodologyOpen: () => void;
}> = ({ active, onChange, result, isEmergency, onProfileOpen, onMethodologyOpen }) => (
  <div
    data-tab-bar
    role="tablist"
    aria-label="Dashboard sections"
    className="hidden sm:flex items-center"
    style={{
      background: isEmergency ? 'rgba(30,6,6,0.95)' : 'rgba(9,12,20,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${isEmergency ? 'rgba(220,38,38,0.20)' : 'rgba(255,255,255,0.07)'}`,
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
    }}
  >
    {TAB_CONFIG.map(({ value, label, Icon, getBadge }) => {
      const isActive = value === active;
      const badge    = getBadge?.(result);
      const isActEmergency = isEmergency && value === 'actions';
      const btnClass = `audit-tab-btn${isActEmergency ? ' emergency' : isActive ? ' active' : ''}`;
      const isLiveBadge = badge?.color === '#10b981';
      return (
        <button
          key={value}
          role="tab"
          aria-selected={isActive}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onChange(value)}
          className={btnClass}
        >
          <Icon className="tab-icon w-3.5 h-3.5 flex-shrink-0" />
          <span className="tab-label-text">{label}</span>
          {badge && (
            <span className={`audit-tab-badge${isLiveBadge ? ' info' : ''}`}>
              {badge.text}
            </span>
          )}
        </button>
      );
    })}

    {/* Spacer + drawer icons */}
    <div className="flex-1" />
    <button
      onClick={onProfileOpen}
      className="icon-btn w-8 h-8"
      aria-label="View profile & preparedness"
      title="Profile & Career Signals"
    >
      <User className="w-3.5 h-3.5" />
    </button>
    <button
      onClick={onMethodologyOpen}
      className="icon-btn w-8 h-8"
      aria-label="View methodology"
      title="How This Score Was Calculated"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  </div>
);

// ── Mobile bottom nav (3 items — min 56px tap target) ─────────────────────────

const MobileBottomNav: React.FC<{
  active: TabKeyV4;
  onChange: (v: TabKeyV4) => void;
  result: HybridResult;
  isEmergency: boolean;
}> = ({ active, onChange, result, isEmergency }) => (
  <div
    role="tablist"
    aria-label="Dashboard sections"
    className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center"
    style={{
      background: 'rgba(9,12,20,0.96)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}
  >
    {TAB_CONFIG.map(({ value, label, shortLabel, Icon, getBadge }) => {
      const isActive = value === active;
      const badge    = getBadge?.(result);
      const isActEmergency = isEmergency && value === 'actions';
      const color = isActEmergency ? '#dc2626' : isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.45)';
      return (
        <button
          key={value}
          role="tab"
          aria-selected={isActive}
          aria-label={`${label} tab${badge ? `: ${badge.text}` : ''}`}
          onClick={() => onChange(value)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors"
          style={{ color, minHeight: 56 }}
        >
          {(isActive || isActEmergency) && (
            <motion.div
              layoutId="mobile-nav-active-v4"
              className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
              style={{ background: isActEmergency ? '#dc2626' : 'var(--cyan,#00d4e0)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            />
          )}
          <div className="relative">
            <Icon className="w-5 h-5" />
            {badge && (
              <span
                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: badge.color, color: '#fff', lineHeight: 1 }}
              >
                {badge.text.replace(' critical', '').replace(' live', '')}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">{shortLabel}</span>
        </button>
      );
    })}
  </div>
);

// ── Main dashboard ────────────────────────────────────────────────────────────

export const LayoffAuditDashboardV4: React.FC<Props> = (props) => {
  const { result, companyData } = props;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [, forceRerender] = useState(0);

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
  const isEmergency = adaptation.mode === 'emergency';

  const [activeTab, setActiveTab] = useState<TabKeyV4>(adaptation.defaultTab);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [userChangedTab, setUserChangedTab] = useState(false);

  // Drawer state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [methodologyDrawerOpen, setMethodologyDrawerOpen] = useState(false);

  // First-audit modal — dismissed once user has seen it
  const [firstAuditDismissed, setFirstAuditDismissed] = useState(!adaptation.showFirstAuditWelcome);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync default tab when adaptation mode changes (late profile load)
  useEffect(() => {
    if (!userChangedTab) setActiveTab(adaptation.defaultTab);
  }, [adaptation.defaultTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sticky header on scroll
  useEffect(() => {
    const el = scrollRef.current?.parentElement ?? window;
    const onScroll = () => {
      const scrollY = el === window ? window.scrollY : (el as HTMLElement).scrollTop;
      setShowStickyHeader(scrollY > 80);
    };
    (el as EventTarget).addEventListener('scroll', onScroll, { passive: true });
    return () => (el as EventTarget).removeEventListener('scroll', onScroll);
  }, []);

  // Quick-capture recalculate trigger
  useEffect(() => {
    const handler = () => { props.onRecalculate?.(); };
    window.addEventListener('hp.quickCapture.completed', handler);
    return () => window.removeEventListener('hp.quickCapture.completed', handler);
  }, [props.onRecalculate]);

  // Cross-component navigation events (V3 compatibility + new drawer events)
  useEffect(() => {
    const navHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const rawTab = typeof detail === 'string' ? detail : detail?.tab;
      if (!rawTab || typeof rawTab !== 'string') return;

      const target = TAB_ALIAS_MAP[rawTab] ?? rawTab;
      if (target === 'profile-drawer') {
        setProfileDrawerOpen(true);
      } else if (target === 'methodology-drawer') {
        setMethodologyDrawerOpen(true);
      } else if (target === 'risk' || target === 'actions' || target === 'explore') {
        handleTabChange(target as TabKeyV4);
      }
    };

    const drawerHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'profile') setProfileDrawerOpen(true);
      if (detail === 'methodology') setMethodologyDrawerOpen(true);
    };

    window.addEventListener('hp.dashboard.navigate', navHandler as EventListener);
    window.addEventListener('hp.dashboard.openDrawer', drawerHandler as EventListener);
    return () => {
      window.removeEventListener('hp.dashboard.navigate', navHandler as EventListener);
      window.removeEventListener('hp.dashboard.openDrawer', drawerHandler as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation: Alt+1/2/3 for 3 tabs
  useEffect(() => {
    const TABS: TabKeyV4[] = ['risk', 'actions', 'explore'];
    const isEditableTarget = (t: EventTarget | null): boolean => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable || !!t.closest('[contenteditable]');
    };
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= TABS.length) {
          e.preventDefault();
          handleTabChange(TABS[n - 1]);
        }
      }
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
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (val: TabKeyV4) => {
    setUserChangedTab(true);
    track('tab_switched', {
      from: activeTab,
      to: val,
      score: result.total,
      confidence: result.confidencePercent,
      freshness_tier: result.unifiedFreshness?.tier,
      dashboard_version: 'v4',
    });
    setActiveTab(val);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tabProps = useMemo(() => ({
    result,
    companyData,
    onDownload: props.onDownload,
    onRecalculate: props.onRecalculate,
    auditStage: props.auditStage,
    emergencyMode: isEmergency,
  }), [result, companyData, props.onDownload, props.onRecalculate, props.auditStage, isEmergency]);

  const criticalActionCount = (result.recommendations ?? []).filter((r: any) => r.priority === 'Critical').length;
  const liveSignalCount = result.signalQuality?.liveSignals ?? 0;
  const confPct = result.confidencePercent ?? 0;

  return (
    <GlobalErrorBoundary>
      {/* Emergency mode: 3px red top bar on entire dashboard */}
      <div
        className="flex flex-col"
        ref={scrollRef}
        style={isEmergency ? { borderTop: '3px solid #dc2626' } : {}}
      >
        {/* ── Sticky header + tab bar ─────────────────────────────────────── */}
        <div className="sticky top-0 z-40">
          <StickyCompanyHeader
            companyName={companyData?.name ?? (result as any).companyName ?? 'Company'}
            score={result.total}
            visible={showStickyHeader}
            isEmergency={isEmergency}
            onProfileOpen={() => setProfileDrawerOpen(true)}
            onMethodologyOpen={() => setMethodologyDrawerOpen(true)}
          />
          <DesktopTabBar
            active={activeTab}
            onChange={handleTabChange}
            result={result}
            isEmergency={isEmergency}
            onProfileOpen={() => setProfileDrawerOpen(true)}
            onMethodologyOpen={() => setMethodologyDrawerOpen(true)}
          />
        </div>

        {/* ── Emergency banner ─────────────────────────────────────────────── */}
        {adaptation.showEmergencyBanner && (
          <div className="px-4 pt-3 sm:px-0">
            <EmergencyModeBanner
              result={result}
              onJumpToActions={() => handleTabChange('actions')}
            />
          </div>
        )}

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="px-4 pt-4 sm:px-0 sm:pt-0"
            style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
          >
            {activeTab === 'risk' && (
              <TabErrorBoundary tabLabel="My Risk">
                <Suspense fallback={<TabLoader />}>
                  <MyRiskTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
            {activeTab === 'actions' && (
              <TabErrorBoundary tabLabel="Take Action">
                <Suspense fallback={<TabLoader />}>
                  <TakeActionTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
            {activeTab === 'explore' && (
              <TabErrorBoundary tabLabel="Explore">
                <Suspense fallback={<TabLoader />}>
                  <ExploreTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
          </motion.div>
        </AnimatePresence>

        <MobileBottomNav
          active={activeTab}
          onChange={handleTabChange}
          result={result}
          isEmergency={isEmergency}
        />

        {/* ── Profile drawer ────────────────────────────────────────────────── */}
        <Drawer open={profileDrawerOpen} onOpenChange={setProfileDrawerOpen} shouldScaleBackground={false}>
          <DrawerContent style={{ maxHeight: '92vh', overflowY: 'auto' }}>
            <DrawerHeader>
              <DrawerTitle>Your Profile & Career Signals</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8">
              <Suspense fallback={<TabLoader />}>
                <ProtectionTab result={result} companyData={companyData} />
              </Suspense>
            </div>
          </DrawerContent>
        </Drawer>

        {/* ── Methodology drawer ────────────────────────────────────────────── */}
        <Drawer open={methodologyDrawerOpen} onOpenChange={setMethodologyDrawerOpen} shouldScaleBackground={false}>
          <DrawerContent style={{ maxHeight: '92vh', overflowY: 'auto' }}>
            <DrawerHeader>
              <DrawerTitle>How This Score Was Calculated</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8">
              <Suspense fallback={<TabLoader />}>
                <TransparencyTab result={result} companyData={companyData} />
              </Suspense>
            </div>
          </DrawerContent>
        </Drawer>

        {/* ── First-audit welcome modal ─────────────────────────────────────── */}
        <Dialog
          open={!firstAuditDismissed}
          onOpenChange={(open) => {
            if (!open) {
              setFirstAuditDismissed(true);
              markFirstAuditSeen();
            }
          }}
        >
          <DialogContent>
            <FirstAuditWelcome
              liveSignalCount={liveSignalCount}
              criticalActionCount={criticalActionCount}
              confidencePercent={confPct}
              profileFieldsFilled={(() => {
                const uf = (result as any).userFactors ?? {};
                const fields = [
                  'visaStatus', 'savingsMonthsRunway', 'hasDependents', 'dualIncomeHousehold',
                  'priorLayoffSurvived', 'hasEquityVesting', 'equityVestMonths', 'metroArea',
                  'tenureYears', 'careerYears', 'performanceTier', 'monthlySalaryUsd',
                  'industryYears', 'priorJobChanges', 'selfRatedSkills',
                ];
                return fields.filter(f => uf[f] != null && uf[f] !== '' && uf[f] !== 'unknown').length;
              })()}
              onDismiss={() => {
                setFirstAuditDismissed(true);
                markFirstAuditSeen();
              }}
            />
          </DialogContent>
        </Dialog>

      </div>
    </GlobalErrorBoundary>
  );
};

export default LayoffAuditDashboardV4;

export const isTabsV4Enabled = (): boolean => true;
