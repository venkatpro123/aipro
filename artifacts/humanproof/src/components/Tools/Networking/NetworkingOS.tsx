// NetworkingOS.tsx — Tool 6: Networking Operating System (4-tab layout)
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import { NetworkMapPanel } from './NetworkMapPanel';
import { RelationshipTrackerPanel } from './RelationshipTrackerPanel';
import { ReferralIntelligencePanel } from './ReferralIntelligencePanel';
import { OutreachPlannerPanel } from './OutreachPlannerPanel';

const TABS = [
  { id: 'map',      label: 'Network Map'     },
  { id: 'tracker',  label: 'Contact Tracker' },
  { id: 'referral', label: 'Referral Intel'  },
  { id: 'outreach', label: 'Outreach Planner'},
];

export function NetworkingOS() {
  const [activeTab, setActiveTab] = useState('map');
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;

  if (!scoreResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(168,139,250,0.05)', borderRadius: 16, border: '1px solid rgba(168,139,250,0.15)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🌐</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Run your first audit to unlock Networking OS</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
          Network intelligence is personalized to your role, industry, and network tier.
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
            background: activeTab === t.id ? '#a78bfa' : 'transparent',
          }}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="map">      <NetworkMapPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="tracker">  <RelationshipTrackerPanel /></TabsContent>
      <TabsContent value="referral"> <ReferralIntelligencePanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="outreach"> <OutreachPlannerPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
