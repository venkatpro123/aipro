// LayoffDefenseCenter.tsx — Real-Time Career Defense Engine
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import { DefenseIntelligenceProvider, useDefenseIntelligence } from './DefenseIntelligenceContext';
import { CareerDefenseTimeline } from './CareerDefenseTimeline';
import { DefenseCommandPanel } from './DefenseCommandPanel';
import { DefenseReadinessPanel } from './DefenseReadinessPanel';
import { DefensePriorityEngine } from './DefensePriorityEngine';
import { DefenseStrategyPlan } from './DefenseStrategyPlan';
import { CareerDecisionSimulator } from './CareerDecisionSimulator';
import { ActionOutcomeTracker } from './ActionOutcomeTracker';
import { CompanyWatchlistPanel } from './CompanyWatchlistPanel';
import { RiskForecast } from './RiskForecast';
import { LiveMonitoringFeed } from './LiveMonitoringFeed';

const TABS = [
  { id: 'priority',   label: 'Priority Actions' },
  { id: 'readiness',  label: 'Readiness'        },
  { id: 'simulator',  label: 'Decisions'        },
  { id: 'plan',       label: 'Defence Plan'     },
  { id: 'monitoring', label: 'Monitoring'       },
  { id: 'outcomes',   label: 'Outcomes'         },
  { id: 'watchlist',  label: 'Watchlist'        },
  { id: 'forecast',   label: 'Forecast'         },
];

function NoAuditState() {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
      background: 'rgba(239,68,68,0.05)', borderRadius: 16,
      border: '1px solid rgba(239,68,68,0.15)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
        Run your first audit to unlock
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
        The Active Defence System analyses your personal risk profile and generates
        ranked actions, decision simulations, readiness scores, and continuous monitoring.
      </div>
    </div>
  );
}

function TabNavigationBridge({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { requestedTab, setRequestedTab } = useDefenseIntelligence();

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
      setRequestedTab(null); // clear after navigating
    }
  }, [requestedTab, setActiveTab, setRequestedTab]);

  return null;
}

function LayoffDefenseCenterInner({ scoreResult }: { scoreResult: HybridResult }) {
  const [activeTab, setActiveTab] = useState('priority');

  return (
    <div>
      <TabNavigationBridge setActiveTab={setActiveTab} />

      <CareerDefenseTimeline scoreResult={scoreResult} />
      <DefenseCommandPanel scoreResult={scoreResult} />

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{
          display: 'flex', gap: 4,
          background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4,
          border: '1px solid var(--border)', marginBottom: 24,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {TABS.map(t => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              style={{
                padding: '8px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
                flexShrink: 0,
                color:      activeTab === t.id ? '#000' : 'rgba(255,255,255,0.6)',
                background: activeTab === t.id ? '#ef4444' : 'transparent',
              }}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="priority">
          <DefensePriorityEngine scoreResult={scoreResult} />
        </TabsContent>

        <TabsContent value="readiness">
          <DefenseReadinessPanel scoreResult={scoreResult} />
        </TabsContent>

        <TabsContent value="simulator">
          <CareerDecisionSimulator scoreResult={scoreResult} />
        </TabsContent>

        <TabsContent value="plan">
          <DefenseStrategyPlan scoreResult={scoreResult} />
        </TabsContent>

        <TabsContent value="monitoring">
          <LiveMonitoringFeed scoreResult={scoreResult} />
        </TabsContent>

        <TabsContent value="outcomes">
          <ActionOutcomeTracker />
        </TabsContent>

        <TabsContent value="watchlist">
          <CompanyWatchlistPanel />
        </TabsContent>

        <TabsContent value="forecast">
          <RiskForecast scoreResult={scoreResult} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function LayoffDefenseCenter() {
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;

  if (!scoreResult) {
    return <NoAuditState />;
  }

  return (
    <DefenseIntelligenceProvider>
      <LayoffDefenseCenterInner scoreResult={scoreResult} />
    </DefenseIntelligenceProvider>
  );
}
