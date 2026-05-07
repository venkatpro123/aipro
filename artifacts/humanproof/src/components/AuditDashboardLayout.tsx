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
    <div className="audit-dashboard space-y-8" data-testid="audit-dashboard">
      <LiveSignalStatusBar status={liveStatus} />
      <OutcomeFeedbackPrompt companyRoleKey={companyRoleKey} predictionDate={result.meta.timestamp} />

      {/* Header / Breadcrumb — Sophisticated & Minimal */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60"
      >
        <span className="opacity-50">HumanShield</span>
        <span className="opacity-20">/</span>
        <span className="opacity-50">Audit Terminal</span>
        <span className="opacity-20">/</span>
        <span className="text-cyan">{roleLabel}{companySuffix}</span>
      </nav>

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
    <div className="space-y-6 py-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
        <div className="space-y-4">
          <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="h-40 bg-muted/30 rounded-xl animate-pulse" />
    </div>
  );
};

export default AuditDashboardLayout;
