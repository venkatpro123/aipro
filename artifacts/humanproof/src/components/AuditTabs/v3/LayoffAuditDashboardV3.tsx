// LayoffAuditDashboardV3.tsx — v33 UX redesign
//
// 5-tab "decision-driven intelligence flow" structure:
//   1. Summary       — Tier 1 critical intel: score, drivers, immediate actions, horizon
//   2. Company       — Workforce stability, financial health, ground-truth signals (compressed)
//   3. Protection    — Personal career intelligence: preparedness, skills, mobility, market
//   4. Action Plan   — Contingency plan + priority action matrix
//   5. Intelligence  — Live signals + sources + confidence + methodology
//
// Adaptive UX:
//   • Critical-risk users (score ≥ 75) land on Action Plan first — they need to act
//   • Other users land on Summary (default)
//
// Mobile UX:
//   • Fixed bottom navigation bar on screens ≤ 639px — icon + 1-word label
//   • Sticky top bar with company name + score chip while scrolling
//   • Tab content receives bottom padding to clear the fixed nav
//
// Desktop UX:
//   • Sticky horizontal pill tabs below the sticky header bar
//   • Score badge per tab
//   • Smooth opacity/Y transition between tabs

import React, { Suspense, lazy, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Building2, Shield, Zap, Radio } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';

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
}

type TabValue = 'summary' | 'company' | 'protection' | 'actions' | 'intel';

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
  value:     TabValue;
  label:     string;
  shortLabel: string;   // mobile label (1 word)
  Icon:      React.ElementType;
  getBadge?: (r: HybridResult) => { text: string; color: string } | null;
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
];

// v33: Adaptive default tab. Critical-risk users land on Action Plan — they
// need to act, not browse. Everyone else starts on Summary.
function pickDefaultTab(result: HybridResult): TabValue {
  if (result.total >= 75) return 'actions';
  return 'summary';
}

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
          <p className="text-[13px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
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
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap"
          style={{
            background: isActive ? 'rgba(0,212,224,0.12)' : 'transparent',
            border: `1px solid ${isActive ? 'rgba(0,212,224,0.30)' : 'transparent'}`,
            color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.45)',
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
      const color    = isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.35)';
      return (
        <button
          key={value}
          onClick={() => onChange(value)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors"
          style={{ color }}
        >
          {/* Active indicator dot */}
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
                className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full"
                style={{ background: badge.color }}
              />
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
  const [activeTab, setActiveTab] = useState<TabValue>(() => pickDefaultTab(result));
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTabRef = useRef<TabValue>(activeTab);

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

  const handleTabChange = (val: TabValue) => {
    lastTabRef.current = activeTab;
    setActiveTab(val);
    // Scroll to top of content on tab switch (mobile UX)
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tabProps = { result, companyData, onRetake: props.onRetake, onDownload: props.onDownload, onRecalculate: props.onRecalculate };

  return (
    <GlobalErrorBoundary>
      <div className="flex flex-col" ref={scrollRef}>

        {/* ── Sticky company header (appears after scroll) ──────────────── */}
        <div className="sticky top-0 z-40">
          <StickyCompanyHeader
            companyName={companyData?.name ?? result.companyName ?? 'Company'}
            score={result.total}
            visible={showStickyHeader}
          />

          {/* ── Desktop tab bar ──────────────────────────────────────────── */}
          <DesktopTabBar
            active={activeTab}
            onChange={handleTabChange}
            result={result}
          />
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            // On mobile, add bottom padding to clear the fixed bottom nav (56px)
            // and additional safe-area inset
            className="px-4 pt-4 sm:px-0 sm:pt-0"
            style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
          >
            {activeTab === 'summary' && (
              <Suspense fallback={<TabLoader />}>
                <SummaryTab {...tabProps} />
              </Suspense>
            )}
            {/* v33 routing:
                 'company'    → IntelligenceTab (rebuilt — company-facing live intel +
                                Workforce/Financial compressed cards + Ground Truth +
                                Market signals)
                 'protection' → ProtectionTab (new — career-protection signals)
                 'actions'    → ActionsTab (unchanged)
                 'intel'      → AnalysisTab (risk-math: dimensions, dual gauge,
                                prediction horizon, scenario fan + methodology) */}
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
          </motion.div>
        </AnimatePresence>

        {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
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

// Convenience flag — kept for backwards-compat with callers
export const isTabsV3Enabled = (): boolean =>
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_TABS_V3 === '1';
