// LayoffAuditDashboardV3.tsx — v15.0
// 3-tab consolidated dashboard. Renders only when VITE_TABS_V3=1.
// v2 (7-tab) remains the default until parity is verified — see plan rollback note.
//
// This is intentionally minimal scaffolding: each v3 tab wraps the existing
// v2 tab components inside CollapsibleSection so users can switch in/out
// without losing access to any feature. The narrative-collapse design pass
// (pulling content out of nested tabs into a single hero flow) is a v15.1
// follow-up tracked in the plan file.

import React, { Suspense, lazy, useState, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutDashboard, ListChecks, Brain } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import { GlobalErrorBoundary } from '../../GlobalErrorBoundary';

const AnalysisTab     = lazy(() => import('./AnalysisTab').then(m => ({ default: m.AnalysisTab })));
const ActionsTab      = lazy(() => import('./ActionsTab').then(m => ({ default: m.ActionsTab })));
const IntelligenceTab = lazy(() => import('./IntelligenceTab').then(m => ({ default: m.IntelligenceTab })));

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  onRetake: () => void;
  onDownload?: () => void;
  onRecalculate?: () => void;
}

const TabLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-[var(--space-16)]">
    <div className="w-10 h-10 rounded-full border-2 border-[var(--cyan)]/10 border-t-[var(--cyan)] animate-spin mb-6" />
    <p className="label-xs tracking-[0.3em]" style={{ color: 'rgba(0,212,224,0.6)' }}>LOADING…</p>
  </div>
);

const TAB_CONFIG = [
  { value: 'analysis',     label: 'Analysis',     Icon: LayoutDashboard },
  { value: 'actions',      label: 'Actions',      Icon: ListChecks },
  { value: 'intelligence', label: 'Intelligence', Icon: Brain },
] as const;

type TabValue = typeof TAB_CONFIG[number]['value'];

export const LayoffAuditDashboardV3: React.FC<Props> = (props) => {
  const [activeTab, setActiveTab] = useState<TabValue>('analysis');
  const prevTabRef = useRef<TabValue>('analysis');

  return (
    <GlobalErrorBoundary>
      <Tabs.Root
        value={activeTab}
        onValueChange={(val) => {
          prevTabRef.current = activeTab;
          setActiveTab(val as TabValue);
        }}
        className="flex flex-col"
      >
        <Tabs.List className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.08)] mb-6 overflow-x-auto">
          {TAB_CONFIG.map(({ value, label, Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-[var(--cyan)] data-[state=active]:text-[var(--cyan)] hover:text-[var(--cyan)] transition-colors whitespace-nowrap"
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="analysis" className="outline-none">
          <Suspense fallback={<TabLoader />}>
            <AnalysisTab {...props} />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="actions" className="outline-none">
          <Suspense fallback={<TabLoader />}>
            <ActionsTab {...props} />
          </Suspense>
        </Tabs.Content>
        <Tabs.Content value="intelligence" className="outline-none">
          <Suspense fallback={<TabLoader />}>
            <IntelligenceTab {...props} />
          </Suspense>
        </Tabs.Content>
      </Tabs.Root>
    </GlobalErrorBoundary>
  );
};

export default LayoffAuditDashboardV3;

// Convenience flag check — keeps the gate logic in one place. Consumers can
// read this directly to decide whether to render V3 or the legacy V2 dashboard.
export const isTabsV3Enabled = (): boolean =>
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_TABS_V3 === '1';
