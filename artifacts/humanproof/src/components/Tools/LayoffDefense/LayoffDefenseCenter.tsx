// LayoffDefenseCenter.tsx — Active Career Defence System
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import { DefenseCommandPanel } from './DefenseCommandPanel';
import { DefensePriorityEngine } from './DefensePriorityEngine';
import { DefenseStrategyPlan } from './DefenseStrategyPlan';
import { RiskSimulator } from './RiskSimulator';
import { CompanyWatchlistPanel } from './CompanyWatchlistPanel';
import { RiskForecast } from './RiskForecast';

const TABS = [
  { id: 'priority',  label: 'Priority Actions'  },
  { id: 'plan',      label: 'Defence Plan'       },
  { id: 'simulator', label: 'Simulator'          },
  { id: 'watchlist', label: 'Watchlist'          },
  { id: 'forecast',  label: 'Forecast'           },
];

export function LayoffDefenseCenter() {
  const [activeTab, setActiveTab] = useState('priority');
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as import('../../../types/hybridResult').HybridResult | null;

  if (!scoreResult) {
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
          ranked actions, a personalised roadmap, and continuous monitoring.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Command panel — always visible above all tabs ─────────────────── */}
      <DefenseCommandPanel scoreResult={scoreResult} />

      {/* ── Tab navigation ────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{
          display: 'flex', gap: 4,
          background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4,
          border: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto',
        }}>
          {TABS.map(t => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              style={{
                padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
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

        <TabsContent value="plan">
          <DefenseStrategyPlan scoreResult={scoreResult} />
        </TabsContent>

        <TabsContent value="simulator">
          <RiskSimulator scoreResult={scoreResult} />
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
