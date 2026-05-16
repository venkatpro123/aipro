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

import React, { Suspense, lazy, useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Building2, Shield, Zap, Radio, Info } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';
import { useDashboardAdaptation } from '../../../hooks/useDashboardAdaptation';
import EmergencyModeBanner from '../common/EmergencyModeBanner';

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

// ── Score color helpers ───────────────────────────────────────────────────────

const riskColor = (s: number) =>
  s >= 75 ? '#dc2626' : s >= 55 ? '#f97316' : s >= 35 ? '#f59e0b' : '#10b981';

const riskLabel = (s: number) =>
  s >= 75 ? 'CRITICAL' : s >= 55 ? 'HIGH' : s >= 35 ? 'MODERATE' : 'LOW';

// ── Tab loader ────────────────────────────────────────────────────────────────

const TabLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="w-8 h-8 rounded-full border-2 border-[rgba(0,212,224,0.12)] border-t-[var(--cyan,#00d4e0)] animate-spin mb-4" />
    <p className="text-[10px] tracking-[0.3em] font-mono" style={{ color: 'rgba(0,212,224,0.5)' }}>
      LOADING…
    </p>
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
    shortLabel: 'Brief',
    Icon: TrendingUp,
    getBadge: (r) => {
      const c = riskColor(r.total);
      return { text: riskLabel(r.total), color: c };
    },
  },
  {
    value: 'company',
    label: 'Company',
    shortLabel: 'Co.',
    Icon: Building2,
    getBadge: (r: any) => {
      const warnActive = r.warnSignal?.hasActiveWARN === true;
      if (warnActive) return { text: 'WARN', color: '#dc2626' };
      const rounds = r.companyData?.layoffRounds ?? 0;
      if (rounds >= 2) return { text: `${rounds}× layoffs`, color: '#f97316' };
      const hiringFreeze = r.hiringSignal?.trend === 'frozen' || r.companyData?._hiringPostingTrend === 'frozen';
      if (hiringFreeze) return { text: 'frozen', color: '#f97316' };
      return null;
    },
  },
  {
    value: 'protection',
    label: 'Protection',
    shortLabel: 'You',
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
    label: 'Action Plan',
    shortLabel: 'Act',
    Icon: Zap,
    getBadge: (r) => {
      const critical = (r.recommendations ?? []).filter(rec => rec.priority === 'Critical').length;
      return critical > 0 ? { text: `${critical} critical`, color: '#dc2626' } : null;
    },
  },
  {
    value: 'intel',
    label: 'Intelligence',
    shortLabel: 'Intel',
    Icon: Radio,
    getBadge: (r) => {
      const live = r.signalQuality?.liveSignals ?? 0;
      return live > 0 ? { text: `${live} live`, color: '#10b981' } : null;
    },
  },
  // v39.0 A6: Transparency / methodology — answers "how was this calculated?"
  {
    value: 'transparency',
    label: 'Methodology',
    shortLabel: 'How?',
    Icon: Info,
    getBadge: (r: any) => {
      const conf = r.confidencePercent ?? 0;
      if (conf < 60) return { text: 'low conf', color: '#f97316' };
      return null;
    },
  },
];

// ── Sticky company header ─────────────────────────────────────────────────────

const StickyCompanyHeader: React.FC<{
  companyName: string;
  score: number;
  visible: boolean;
}> = ({ companyName, score, visible }) => {
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
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-3 flex-shrink-0"
            style={{ background: color + '22', border: `1px solid ${color}40` }}
          >
            <span className="text-[12px] font-black" style={{ color }}>{score}</span>
            <span className="text-[9px] font-bold tracking-wide" style={{ color: color + 'cc' }}>
              {riskLabel(score)}
            </span>
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
              className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
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

const MobileBottomNav: React.FC<{
  active: TabValue;
  onChange: (v: TabValue) => void;
  result: HybridResult;
}> = ({ active, onChange, result }) => (
  <div
    className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center"
    style={{
      background: 'rgba(9,12,20,0.96)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}
  >
    {TAB_CONFIG.map(({ value, shortLabel, Icon, getBadge }) => {
      const isActive = value === active;
      const badge    = getBadge?.(result);
      const color    = isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.45)';
      return (
        <button
          key={value}
          onClick={() => onChange(value)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors"
          style={{ color }}
        >
          {isActive && (
            <motion.div
              layoutId="mobile-nav-active"
              className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
              style={{ background: 'var(--cyan,#00d4e0)' }}
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

export const LayoffAuditDashboardV3: React.FC<Props> = (props) => {
  const { result, companyData } = props;
  const adaptation = useDashboardAdaptation(result, companyData);
  const [activeTab, setActiveTab] = useState<TabValue>(adaptation.defaultTab as TabValue);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleTabChange = (val: TabValue) => {
    setActiveTab(val);
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

        {/* ── Sticky company header + tab bar ──────────────────────────────── */}
        <div className="sticky top-0 z-40">
          <StickyCompanyHeader
            companyName={companyData?.name ?? result.companyName ?? 'Company'}
            score={result.total}
            visible={showStickyHeader}
          />
          <DesktopTabBar
            active={activeTab}
            onChange={handleTabChange}
            result={result}
          />
        </div>

        {/* ── Emergency banner — pinned above tab content ──────────────────── */}
        {adaptation.showEmergencyBanner && (
          <div className="px-4 pt-3 sm:px-0">
            <EmergencyModeBanner
              result={result}
              onJumpToActions={() => handleTabChange('actions')}
            />
          </div>
        )}

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
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
              <Suspense fallback={<TabLoader />}>
                <SummaryTab {...tabProps} />
              </Suspense>
            )}
            {activeTab === 'company' && (
              <Suspense fallback={<TabLoader />}>
                <IntelligenceTab {...tabProps} />
              </Suspense>
            )}
            {activeTab === 'protection' && (
              <Suspense fallback={<TabLoader />}>
                <ProtectionTab {...tabProps} />
              </Suspense>
            )}
            {activeTab === 'actions' && (
              <Suspense fallback={<TabLoader />}>
                <ActionsTab {...tabProps} />
              </Suspense>
            )}
            {activeTab === 'intel' && (
              <Suspense fallback={<TabLoader />}>
                <AnalysisTab {...tabProps} />
              </Suspense>
            )}
            {/* v39.0 A6: TransparencyTab — methodology, data provenance, signal attribution. */}
            {activeTab === 'transparency' && (
              <Suspense fallback={<TabLoader />}>
                <TransparencyTab {...tabProps} />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>

        <MobileBottomNav
          active={activeTab}
          onChange={handleTabChange}
          result={result}
        />
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
