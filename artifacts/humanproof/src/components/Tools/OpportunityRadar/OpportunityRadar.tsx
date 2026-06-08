// OpportunityRadar.tsx — Tool 9: Opportunity Radar (3-tab layout)
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import { HiringDetectionPanel } from './HiringDetectionPanel';
import { CompanyTargetingPanel } from './CompanyTargetingPanel';
import { MarketAlertsPanel } from './MarketAlertsPanel';

const TABS = [
  { id: 'hiring',    label: 'Hiring Detection'   },
  { id: 'targeting', label: 'Company Targets'    },
  { id: 'alerts',    label: 'Market Alerts'      },
];

export function OpportunityRadar() {
  const [activeTab, setActiveTab] = useState('hiring');
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;

  if (!scoreResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(245,158,11,0.05)', borderRadius: 16, border: '1px solid rgba(245,158,11,0.15)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Run your first audit to unlock Opportunity Radar</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
          Opportunity detection is personalized to your role and sector.
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <TabsTrigger key={t.id} value={t.id} style={{
            padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
            color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.6)',
            background: activeTab === t.id ? '#f59e0b' : 'transparent',
          }}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="hiring">    <HiringDetectionPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="targeting"> <CompanyTargetingPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="alerts">    <MarketAlertsPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
