// AnalysisView.tsx — Analysis Mode shell
//
// 4-tab middle layer between Guidance and Beast Mode.
// Answers: What is happening? Why? How serious? What next? What to do?
//
// Tabs: Summary | Company | Protection | Action Plan
// Navigation: sticky pill tab bar (desktop) + portal bottom nav (mobile) + swipe
// Each tab is lazy-loaded. The shell mirrors Beast Mode nav patterns exactly.

import React, { Suspense, lazy, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Building2, Shield, Zap } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { TabErrorBoundary } from '../common/TabErrorBoundary';
import { CardSkeleton } from '../../Skeletons/CardSkeleton';
import { SummaryTabSkeleton } from '../../Skeletons/SummaryTabSkeleton';
import { riskColor, riskLabel } from '../../../lib/riskTokens';

// Lazy-load each tab for code-splitting
const AnalysisSummaryTab    = lazy(() => import('./analysis/AnalysisSummaryTab').then(m => ({ default: m.AnalysisSummaryTab ?? m.default })));
const AnalysisCompanyTab    = lazy(() => import('./analysis/AnalysisCompanyTab').then(m => ({ default: m.AnalysisCompanyTab ?? m.default })));
const AnalysisProtectionTab = lazy(() => import('./analysis/AnalysisProtectionTab').then(m => ({ default: m.AnalysisProtectionTab ?? m.default })));
const AnalysisActionsTab    = lazy(() => import('./analysis/AnalysisActionsTab').then(m => ({ default: m.AnalysisActionsTab ?? m.default })));

export interface AnalysisViewProps {
  result: HybridResult;
  companyData: CompanyData;
  emergencyMode: boolean;
  onSwitchToBeast: () => void;
}

type AnalysisTabKey = 'summary' | 'company' | 'protection' | 'actions';

interface TabConfig {
  value: AnalysisTabKey;
  label: string;
  shortLabel: string;
  Icon: React.ElementType;
}

const ANALYSIS_TABS: TabConfig[] = [
  { value: 'summary',    label: 'Summary',     shortLabel: 'Summary', Icon: TrendingUp },
  { value: 'company',    label: 'Company',     shortLabel: 'Company', Icon: Building2 },
  { value: 'protection', label: 'Protection',  shortLabel: 'Protect', Icon: Shield },
  { value: 'actions',    label: 'Action Plan', shortLabel: 'Actions', Icon: Zap },
];

const GenericTabSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 py-1">
    {[0, 1, 2, 3].map(i => (
      <CardSkeleton key={i} height={i === 0 ? 80 : 56} rounded="16px" />
    ))}
  </div>
);

// ── Desktop pill tab bar ──────────────────────────────────────────────────────

const AnalysisDesktopTabBar: React.FC<{
  active: AnalysisTabKey;
  onChange: (v: AnalysisTabKey) => void;
}> = ({ active, onChange }) => (
  <div
    role="tablist"
    aria-label="Analysis sections"
    className="hidden sm:flex items-center gap-1 px-2 py-2 overflow-x-auto"
    style={{
      background: 'rgba(9,12,20,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}
  >
    {ANALYSIS_TABS.map(({ value, label, Icon }) => {
      const isActive = value === active;
      return (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(value)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap"
          style={{
            background: isActive ? 'rgba(0,212,224,0.12)' : 'transparent',
            border: `1px solid ${isActive ? 'rgba(0,212,224,0.30)' : 'transparent'}`,
            color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.50)',
          }}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-[12px] font-semibold">{label}</span>
        </button>
      );
    })}
  </div>
);

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

const AnalysisMobileBottomNav: React.FC<{
  active: AnalysisTabKey;
  onChange: (v: AnalysisTabKey) => void;
}> = ({ active, onChange }) => (
  createPortal(
    <div
      role="tablist"
      aria-label="Analysis sections"
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
      {ANALYSIS_TABS.map(({ value, label, shortLabel, Icon }) => {
        const isActive = value === active;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={label}
            onClick={() => onChange(value)}
            className="flex-1 flex flex-col items-center justify-center relative"
            style={{
              color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.42)',
              minHeight: 58,
              padding: '8px 2px 6px',
              transition: 'color 0.18s ease',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="analysis-tab-pill"
                className="absolute inset-x-1 rounded-xl"
                style={{
                  top: 4, bottom: 4,
                  background: 'rgba(0,212,224,0.10)',
                  border: '1px solid rgba(0,212,224,0.22)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              />
            )}
            <div className="relative z-10 mb-0.5">
              <motion.div
                animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Icon style={{ width: isActive ? 22 : 20, height: isActive ? 22 : 20 }} strokeWidth={isActive ? 2.2 : 1.6} />
              </motion.div>
            </div>
            <span className="relative z-10 font-semibold leading-none" style={{ fontSize: 9.5 }}>
              {shortLabel}
            </span>
          </button>
        );
      })}
    </div>,
    document.body,
  )
);

// ── Main export ───────────────────────────────────────────────────────────────

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  result, companyData, emergencyMode, onSwitchToBeast,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTabKey>('summary');

  const handleTabChange = useCallback((val: AnalysisTabKey) => {
    setActiveTab(val);
  }, []);

  const TABS_ORDER: AnalysisTabKey[] = ['summary', 'company', 'protection', 'actions'];

  const swipeBind = useDrag(({ last, movement: [mx, my], cancel }) => {
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

  const tabProps = { result, companyData, emergencyMode, onSwitchToBeast };

  return (
    <div className="flex flex-col">
      {/* Tab bar — sticky, below the main header */}
      <div
        className="sticky top-[48px] z-30"
        style={{
          background: 'rgba(9,12,20,0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <AnalysisDesktopTabBar active={activeTab} onChange={handleTabChange} />
      </div>

      {/* Tab content */}
      <div {...swipeBind()} style={{ touchAction: 'pan-y' }}>
        <AnimatePresence>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
          >
            {activeTab === 'summary' && (
              <TabErrorBoundary tabLabel="Summary">
                <Suspense fallback={<SummaryTabSkeleton />}>
                  <AnalysisSummaryTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
            {activeTab === 'company' && (
              <TabErrorBoundary tabLabel="Company">
                <Suspense fallback={<GenericTabSkeleton />}>
                  <AnalysisCompanyTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
            {activeTab === 'protection' && (
              <TabErrorBoundary tabLabel="Protection">
                <Suspense fallback={<GenericTabSkeleton />}>
                  <AnalysisProtectionTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
            {activeTab === 'actions' && (
              <TabErrorBoundary tabLabel="Action Plan">
                <Suspense fallback={<GenericTabSkeleton />}>
                  <AnalysisActionsTab {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile bottom nav */}
      <AnalysisMobileBottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
};

export default AnalysisView;
