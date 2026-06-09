// CareerStrategyStudio.tsx — Tool 8: Career Strategy Studio (4-tab layout)
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import { StayStrategyPanel } from './StayStrategyPanel';
import { ExitStrategyPanel } from './ExitStrategyPanel';
import { PromotionStrategyPanel } from './PromotionStrategyPanel';
import { TransitionStrategyPanel } from './TransitionStrategyPanel';
import { ScenarioPlannerPanel } from './ScenarioPlannerPanel';

const TABS = [
  { id: 'scenarios',  label: '5-Year Paths'    },
  { id: 'stay',       label: 'Stay Strategy'   },
  { id: 'exit',       label: 'Exit Paths'      },
  { id: 'promotion',  label: 'Promotion Plan'  },
  { id: 'transition', label: 'Career Pivot'    },
];

const STRATEGY_TAB_KEY = 'hp.strategy.tab';

export function CareerStrategyStudio() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(STRATEGY_TAB_KEY) ?? 'scenarios');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try { localStorage.setItem(STRATEGY_TAB_KEY, tab); } catch { /* storage unavailable */ }
  };
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;

  if (!scoreResult) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(167,139,250,0.05)', borderRadius: 16, border: '1px solid rgba(167,139,250,0.15)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Run your first audit to unlock Career Strategy Studio</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
          Strategy recommendations are personalized to your risk score, internal mobility, and career trajectory.
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
            background: activeTab === t.id ? '#a78bfa' : 'transparent',
          }}>{t.label}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="scenarios">  <ScenarioPlannerPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="stay">       <StayStrategyPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="exit">       <ExitStrategyPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="promotion">  <PromotionStrategyPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="transition"> <TransitionStrategyPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
