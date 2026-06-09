// CompensationCenter.tsx — Tool 7: Compensation Intelligence Center (4-tab layout)
// Phase E: twin write on tab change (decisionType 'negotiated' — compensation is a negotiation signal).
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import { useAuth } from '../../../context/AuthContext';
import { recordTwinDecision } from '../../../services/careerTwinService';
import type { HybridResult } from '../../../types/hybridResult';
import { SalaryBenchmarkPanel } from './SalaryBenchmarkPanel';
import { OfferAnalysisPanel } from './OfferAnalysisPanel';
import { RaisePlannerPanel } from './RaisePlannerPanel';
import { NegotiationCoachPanel } from './NegotiationCoachPanel';

const TABS = [
  { id: 'benchmark',   label: 'Salary Benchmark'  },
  { id: 'offer',       label: 'Offer Analysis'     },
  { id: 'raise',       label: 'Raise Planner'      },
  { id: 'negotiation', label: 'Negotiation Coach'  },
];

export function CompensationCenter() {
  const [activeTab, setActiveTab] = useState('benchmark');
  const { user } = useAuth();
  const { state } = useLayoff();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (user?.id) {
      recordTwinDecision({
        userId: user.id,
        decisionType: 'negotiated',
        notes: `Compensation: explored ${tab} tab`,
        decidedAt: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
  };
  const scoreResult = state.scoreResult as HybridResult | null;

  if (!scoreResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(16,185,129,0.05)', borderRadius: 16, border: '1px solid rgba(16,185,129,0.15)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Run your first audit to unlock Compensation Intelligence</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
          Compensation benchmarks are personalized to your role, seniority, and location.
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <TabsTrigger key={t.id} value={t.id} style={{
            padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
            color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.6)',
            background: activeTab === t.id ? '#10b981' : 'transparent',
          }}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="benchmark">   <SalaryBenchmarkPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="offer">       <OfferAnalysisPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="raise">       <RaisePlannerPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="negotiation"> <NegotiationCoachPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
