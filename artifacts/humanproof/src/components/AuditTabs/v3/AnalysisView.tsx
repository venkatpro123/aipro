// AnalysisView.tsx — Analysis Mode shell
//
// 4-section single-scroll layout. Tabs serve as anchor shortcuts that
// smooth-scroll to their section; IntersectionObserver keeps the active
// tab highlight in sync with the user's scroll position.
// No inline styles — all surfaces use CSS token-based utility classes
// so light/dark mode adapts automatically.

import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Building2, Shield, Zap } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { TabErrorBoundary } from '../common/TabErrorBoundary';
import { CardSkeleton } from '../../Skeletons/CardSkeleton';
import { SummaryTabSkeleton } from '../../Skeletons/SummaryTabSkeleton';

// Lazy-load each section for code-splitting
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
  { value: 'summary',    label: 'Overview',      shortLabel: 'Overview',  Icon: TrendingUp },
  { value: 'company',    label: 'Market Intel',  shortLabel: 'Intel',     Icon: Building2  },
  { value: 'protection', label: 'Your Edge',     shortLabel: 'Edge',      Icon: Shield     },
  { value: 'actions',    label: 'Action Plan',   shortLabel: 'Actions',   Icon: Zap        },
];

const BASE_HEADER_OFFSET = 100;

function getHeaderOffset(): number {
  if (typeof window === 'undefined') return BASE_HEADER_OFFSET;
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10);
  return BASE_HEADER_OFFSET + (Number.isFinite(navH) ? navH : 0) + 12;
}

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
  <nav
    aria-label="Analysis sections"
    className="hidden sm:flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none nav-surface"
  >
    {ANALYSIS_TABS.map(({ value, label, Icon }) => {
      const isActive = value === active;
      return (
        <button
          key={value}
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onChange(value)}
          className={`tab-btn ${isActive ? 'tab-btn--active' : ''}`}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{label}</span>
        </button>
      );
    })}
  </nav>
);

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

const AnalysisMobileBottomNav: React.FC<{
  active: AnalysisTabKey;
  onChange: (v: AnalysisTabKey) => void;
}> = ({ active, onChange }) => (
  createPortal(
    <nav
      aria-label="Analysis sections"
      className="analysis-mobile-nav sm:hidden fixed bottom-0 left-0 right-0 z-[999] flex items-stretch nav-surface-heavy safe-area-bottom"
    >
      {ANALYSIS_TABS.map(({ value, label, shortLabel, Icon }) => {
        const isActive = value === active;
        return (
          <button
            key={value}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            onClick={() => onChange(value)}
            className={`tab-btn-mobile ${isActive ? 'tab-btn-mobile--active' : ''}`}
          >
            {isActive && (
              <motion.div
                layoutId="analysis-tab-pill"
                className="tab-btn-mobile-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              />
            )}
            <div className="relative z-10 mb-0.5">
              <motion.div
                animate={isActive ? { scale: 1.10, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Icon
                  style={{ width: 'clamp(17px, 5vw, 20px)', height: 'clamp(17px, 5vw, 20px)' } as React.CSSProperties}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
              </motion.div>
            </div>
            <span className="relative z-10 tab-btn-mobile-label truncate w-full text-center">
              {shortLabel}
            </span>
          </button>
        );
      })}
    </nav>,
    document.body,
  )
);

// ── Section component map ─────────────────────────────────────────────────────

type SectionProps = AnalysisViewProps;

const SECTION_COMPONENTS: Record<AnalysisTabKey, React.ComponentType<SectionProps>> = {
  summary:    AnalysisSummaryTab as React.ComponentType<SectionProps>,
  company:    AnalysisCompanyTab as React.ComponentType<SectionProps>,
  protection: AnalysisProtectionTab as React.ComponentType<SectionProps>,
  actions:    AnalysisActionsTab as React.ComponentType<SectionProps>,
};

const SECTION_SKELETONS: Record<AnalysisTabKey, React.ReactNode> = {
  summary:    <SummaryTabSkeleton />,
  company:    <GenericTabSkeleton />,
  protection: <GenericTabSkeleton />,
  actions:    <GenericTabSkeleton />,
};

// ── Main export ───────────────────────────────────────────────────────────────

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  result, companyData, emergencyMode, onSwitchToBeast,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTabKey>('summary');
  const sectionRefs = useRef<Partial<Record<AnalysisTabKey, HTMLElement>>>({});

  const scrollToSection = useCallback((val: AnalysisTabKey) => {
    setActiveTab(val);
    const el = sectionRefs.current[val];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const [observerKey, setObserverKey] = useState(0);
  useEffect(() => {
    let prev = getHeaderOffset();
    const onResize = () => {
      const next = getHeaderOffset();
      if (next !== prev) { prev = next; setObserverKey(k => k + 1); }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const ratioMap = new Map<AnalysisTabKey, number>();

    ANALYSIS_TABS.forEach(({ value }) => {
      const el = sectionRefs.current[value];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            ratioMap.set(value, entry.intersectionRatio);
          } else {
            ratioMap.delete(value);
          }
          if (ratioMap.size > 0) {
            const top = [...ratioMap.entries()].reduce((a, b) => a[1] >= b[1] ? a : b);
            setActiveTab(top[0]);
          }
        },
        { threshold: [0, 0.15, 0.5], rootMargin: `-${getHeaderOffset()}px 0px -40% 0px` },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [observerKey]);

  const tabProps: AnalysisViewProps = { result, companyData, emergencyMode, onSwitchToBeast };

  return (
    <div className="flex flex-col">
      <div className="sticky top-[calc(var(--nav-h,72px)+56px)] sm:top-[calc(var(--nav-h,72px)+60px)] z-30">
        <AnalysisDesktopTabBar active={activeTab} onChange={scrollToSection} />
      </div>

      <div className="flex flex-col">
        {ANALYSIS_TABS.map(({ value, label }, idx) => {
          const SectionComponent = SECTION_COMPONENTS[value];
          return (
            <section
              key={value}
              id={`av-${value}`}
              ref={el => { if (el) sectionRefs.current[value] = el; }}
              className={idx > 0 ? 'border-t border-white/[0.06]' : undefined}
            >
              <TabErrorBoundary tabLabel={label}>
                <Suspense fallback={SECTION_SKELETONS[value]}>
                  <SectionComponent {...tabProps} />
                </Suspense>
              </TabErrorBoundary>
            </section>
          );
        })}
      </div>

      <AnalysisMobileBottomNav active={activeTab} onChange={scrollToSection} />
    </div>
  );
};

export default AnalysisView;
