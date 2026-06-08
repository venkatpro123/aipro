// MarketIntelligenceCenter.tsx — Tool 5: Market Intelligence Center
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import { DemandScanner } from './DemandScanner';
import { MarketForecastPanel } from './MarketForecastPanel';
import { GeographicIntelPanel } from './GeographicIntelPanel';
import { HiringTrendsPanel } from './HiringTrendsPanel';
import { IndustryShiftsPanel } from './IndustryShiftsPanel';

const TABS = [
  { id: 'demand',    label: 'Role Demand'    },
  { id: 'forecast',  label: 'Forecast'       },
  { id: 'geo',       label: 'Geographic'     },
  { id: 'hiring',    label: 'Hiring Trends'  },
  { id: 'industry',  label: 'Industry Shifts' },
];

export function MarketIntelligenceCenter() {
  const [activeTab, setActiveTab] = useState('demand');
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as import('../../../types/hybridResult').HybridResult | null;

  if (!scoreResult) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'rgba(245,158,11,0.05)',
        borderRadius: 16,
        border: '1px solid rgba(245,158,11,0.15)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
          Run your first audit to unlock Market Intelligence
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
          Market intelligence is personalized to your role, sector, and location.
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList style={{
        display: 'flex',
        gap: 4,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 10,
        padding: 4,
        border: '1px solid var(--border)',
        marginBottom: 24,
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            style={{
              padding: '8px 14px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.6)',
              background: activeTab === t.id ? '#f59e0b' : 'transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="demand">   <DemandScanner scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="forecast"> <MarketForecastPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="geo">      <GeographicIntelPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="hiring">   <HiringTrendsPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="industry"> <IndustryShiftsPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
