// AuditDashboardLayout.tsx
// Top-level shell for the tabbed audit dashboard.
// Manages tab state, URL hash persistence, responsive layout, and lazy-loading.

import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import { AdaptiveLayout } from "@/components/ui/AdaptiveLayout";
import type { HybridResult } from "@/types/hybridResult";
import type { CompanyData } from "@/data/companyDatabase";
import { PremiumTabs } from "@/components/ui/PremiumTabs";
import { ScoreRing } from "@/components/ScoreRing";
import { DataQualityBanner } from "../../components/DataQualityBanner";
import { ConflictDisclosurePanel } from "../../components/ConflictDisclosurePanel";
import {
  ShieldCheck,
  BarChart3,
  Building2,
  Brain,
  CheckSquare,
  FileText,
} from "lucide-react";
import { LiveSignalStatusBar } from "./LiveSignalStatusBar";
import { OutcomeFeedbackPrompt } from "./OutcomeFeedbackPrompt";
import { computeLiveSignalStatus } from "../services/liveSignalBanner";
import { useBreakingNewsPoller } from "../hooks/useBreakingNewsPoller";
import { useCompanySignalSubscription } from "../hooks/useCompanySignalSubscription";

// Lazy-loaded tab panels (code-split for performance)
const OverviewTab = lazy(() => import("@/components/AuditTabs/OverviewTab"));
const RiskBreakdownTab = lazy(
  () => import("@/components/AuditTabs/RiskBreakdownTab"),
);
const CompanyProfileTab = lazy(
  () => import("@/components/AuditTabs/CompanyProfileTab"),
);
const CareerSkillsTab = lazy(
  () => import("@/components/AuditTabs/CareerSkillsTab"),
);
const ActionPlanTab = lazy(
  () => import("@/components/AuditTabs/ActionPlanTab"),
);
const TransparencyTab = lazy(
  () => import("@/components/AuditTabs/TransparencyTab"),
);

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

const TAB_VALUES = [
  "overview",
  "breakdown",
  "company",
  "career",
  "actions",
  "transparency",
] as const;

type TabValue = (typeof TAB_VALUES)[number];

interface TabItem {
  value: TabValue;
  label: string;
  icon: React.ReactNode;
}

const TAB_ITEMS: TabItem[] = [
  {
    value: "overview",
    label: "Overview",
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  {
    value: "breakdown",
    label: "Risk Factors",
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    value: "company",
    label: "Company Profile",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    value: "career",
    label: "Skills & Career",
    icon: <Brain className="w-4 h-4" />,
  },
  {
    value: "actions",
    label: "Action Plan",
    icon: <CheckSquare className="w-4 h-4" />,
  },
  {
    value: "transparency",
    label: "Transparency",
    icon: <FileText className="w-4 h-4" />,
  },
];


// ---------------------------------------------------------------------------

interface AuditDashboardLayoutProps {
  result: HybridResult;
  companyData: CompanyData | null;
  mode?: "ORACLE" | "AUDIT";
  onRecalculate?: () => void;
  onDownload?: () => void;
}

/**
 * AuditDashboardLayout — main orchestrator for the tabbed interface.
 *
 * Features:
 * - URL hash sync for deep linking & refresh persistence
 * - Responsive: desktop top tabs, mobile horizontal scrolling pills
 * - Lazy-loads tab contents via React.lazy + Suspense
 * - Accessible Radix Tabs with ARIA attributes
 */
export const AuditDashboardLayout: React.FC<AuditDashboardLayoutProps> = ({
  result,
  companyData,
  onRecalculate,
  onDownload,
  mode = "AUDIT",
}) => {
  const { width, isTouch, scaleFactor } = useAdaptiveSystem();
  const isMobile = width < 768;

  // Filter tabs based on mode
  const filteredTabItems = React.useMemo(() => {
    return TAB_ITEMS.filter((item) => {
      if (mode === "ORACLE" && item.value === "company") return false;
      if (mode === "AUDIT" && item.value === "career") return false;
      return true;
    });
  }, [mode]);

  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const hash = window.location.hash.slice(1);
    // Ensure initial tab is valid for the current mode
    const isValid = filteredTabItems.some((t) => t.value === hash);
    return isValid ? (hash as TabValue) : "overview";
  });

  // Sync tab changes to URL hash
  const handleTabChange = useCallback((value: string) => {
    const tab = value as TabValue;
    setActiveTab(tab);
    window.location.hash = tab;
    // TODO: analytics.trackTabView(tab) when available
  }, []);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (TAB_VALUES.includes(hash as TabValue)) {
        setActiveTab(hash as TabValue);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Breadcrumb context — workTypeKey uses underscores (it_data_analyst), not hyphens
  const roleLabel = result.workTypeKey
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const companySuffix = result.companyName ? ` @ ${result.companyName}` : "";
  const breadcrumb = `HumanProof / Audit Terminal / ${roleLabel}${companySuffix}`;

  const liveStatus = React.useMemo(() => computeLiveSignalStatus(result), [result]);
  const companyRoleKey = `${result.companyName?.toLowerCase() || 'unknown'}::${result.workTypeKey}`;

  // Poll breaking news for the current result's company each time the dashboard
  // opens. The hook is self-throttled (15min / session) so rapid re-renders don't
  // multiply requests. When a match is injected, BreakingNewsBanner fires via
  // the onNewLayoffEvent() listener in LayoffCalculator.
  useBreakingNewsPoller(result.companyName ?? null);

  // Subscribe to Supabase Realtime changes on company_intelligence for this company.
  // When the pipeline writes an updated signal, a Sonner toast fires with a
  // "Recalculate" action button that re-runs scoring in-place.
  useCompanySignalSubscription(result.companyName ?? null, onRecalculate);

  return (
    <div className="audit-dashboard space-y-6" data-testid="audit-dashboard">
      <LiveSignalStatusBar status={liveStatus} />
      <OutcomeFeedbackPrompt companyRoleKey={companyRoleKey} predictionDate={result.meta.timestamp} />

      {/* Premium Header Row — sticky with blur */}
      <div style={{
        position: "sticky",
        top: "calc(var(--nav-h) + 8px)",
        zIndex: 29,
        paddingBottom: 8,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <nav
            aria-label="Breadcrumb"
            style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: "0.70rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)" }}
          >
            <span style={{ opacity: 0.5 }}>HumanShield</span>
            <span style={{ opacity: 0.25, fontSize: "0.5rem" }}>◆</span>
            <span style={{ opacity: 0.5 }}>Audit Terminal</span>
            <span style={{ opacity: 0.25, fontSize: "0.5rem" }}>◆</span>
            <span style={{ color: "var(--cyan)", opacity: 0.9, textShadow: "0 0 12px rgba(0,212,224,0.35)" }}>{roleLabel}{companySuffix}</span>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-dot status-dot-live" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)" }}>Live</span>
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <PremiumTabs
        tabs={filteredTabItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        <div className="min-h-[400px]">
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === "overview" && (
              <OverviewTab
                result={result}
                companyData={companyData}
                onDownload={onDownload}
                onRecalculate={onRecalculate}
              />
            )}
            {activeTab === "breakdown" && (
              <RiskBreakdownTab result={result} companyData={companyData} />
            )}
            {activeTab === "company" && (
              <CompanyProfileTab result={result} companyData={companyData} />
            )}
            {activeTab === "career" && (
              <CareerSkillsTab result={result} companyData={companyData} />
            )}
            {activeTab === "actions" && (
              <ActionPlanTab result={result} companyData={companyData} />
            )}

            {activeTab === "transparency" && (
              <TransparencyTab result={result} companyData={companyData} />
            )}
          </Suspense>
        </div>

      </PremiumTabs>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

/**
 * TabSkeleton — generic loading placeholder shown while a tab panel is being lazy-loaded.
 * Matches approximate shape of tab content to prevent layout shift.
 */
const TabSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 py-6" aria-busy="true" aria-live="polite">
      {/* Header row skeleton */}
      <div className="skeleton-panel" style={{ height: 36, width: 220 }} />
      {/* Main 2-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="skeleton-panel" style={{ height: 280 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton-panel"
              style={{ height: 80, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
      {/* Bottom panel */}
      <div className="skeleton-panel" style={{ height: 160 }} />
    </div>
  );
};

export default AuditDashboardLayout;
