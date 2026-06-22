// AnalysisView.tsx — Analysis Mode shell
//
// 4-section single-scroll layout. Tabs serve as anchor shortcuts that
// smooth-scroll to their section; IntersectionObserver keeps the active
// tab highlight in sync with the user's scroll position.

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
  { value: 'summary',    label: 'Summary',     shortLabel: 'Summary', Icon: TrendingUp },
  { value: 'company',    label: 'Company',     shortLabel: 'Company', Icon: Building2 },
  { value: 'protection', label: 'Protection',  shortLabel: 'Protect', Icon: Shield },
  { value: 'actions',    label: 'Action Plan', shortLabel: 'Actions', Icon: Zap },
];

// Base offset: permanent top bar (~48px) + this tab bar (~48px). The floating
// global nav (.nav-root, fixed, height var(--nav-h)) sits above both sticky
// bars and must be added on top of this at read-time since --nav-h varies by
// breakpoint (0 on mobile where the nav is hidden, 72px on desktop).
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
      className="analysis-mobile-nav sm:hidden fixed bottom-0 left-0 right-0 z-[999] flex items-stretch"
      style={{
        background: 'rgba(7,10,18,0.97)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
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
              padding: '7px 1px 5px',
              transition: 'color 0.18s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="analysis-tab-pill"
                className="absolute rounded-xl"
                style={{
                  inset: '3px 2px',
                  background: 'rgba(0,212,224,0.10)',
                  border: '1px solid rgba(0,212,224,0.22)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              />
            )}
            <div className="relative z-10" style={{ marginBottom: 3 }}>
              <motion.div
                animate={isActive ? { scale: 1.10, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Icon
                  style={{
                    width: 'clamp(17px, 5vw, 20px)',
                    height: 'clamp(17px, 5vw, 20px)',
                  }}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
              </motion.div>
            </div>
            <span
              className="relative z-10 font-semibold leading-none truncate w-full text-center"
              style={{ fontSize: 'clamp(8px, 2.4vw, 10px)' }}
            >
              {shortLabel}
            </span>
          </button>
        );
      })}
    </div>,
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

  // Tab click → smooth-scroll to section (with immediate visual feedback in tab bar)
  const scrollToSection = useCallback((val: AnalysisTabKey) => {
    setActiveTab(val);
    const el = sectionRefs.current[val];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  // IntersectionObserver: keep tab bar in sync with the user's scroll position
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    // Map tab → latest intersection ratio so we can pick the topmost visible section
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
  }, []);

  const tabProps: AnalysisViewProps = { result, companyData, emergencyMode, onSwitchToBeast };

  return (
    <div className="flex flex-col">
      {/* Sticky tab bar — stacks below the permanent dashboard top bar, which
          itself sticks below the floating global nav (see getHeaderOffset). */}
      <div
        className="sticky top-[calc(var(--nav-h,72px)+56px)] sm:top-[calc(var(--nav-h,72px)+60px)] z-30"
        style={{
          background: 'rgba(9,12,20,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <AnalysisDesktopTabBar active={activeTab} onChange={scrollToSection} />
      </div>

      {/* All sections rendered as one continuous vertical stack */}
      <div className="flex flex-col">
        {ANALYSIS_TABS.map(({ value, label }, idx) => {
          const SectionComponent = SECTION_COMPONENTS[value];
          return (
            <section
              key={value}
              id={`av-${value}`}
              ref={el => { if (el) sectionRefs.current[value] = el; }}
              style={idx > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : undefined}
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

      {/* Mobile bottom nav — scrolls to section on tap */}
      <AnalysisMobileBottomNav active={activeTab} onChange={scrollToSection} />
    </div>
  );
};

export default AnalysisView;
