// CareerInsuranceCenter.tsx — Tool 4: Career Insurance Center
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import { EmergencyFundPlanner } from './EmergencyFundPlanner';
import { RunwayCalculator } from './RunwayCalculator';
import { RiskScenarioPlanner } from './RiskScenarioPlanner';
import { IncomeProtectionPanel } from './IncomeProtectionPanel';

const TABS = [
  { id: 'emergency',  label: 'Emergency Fund'   },
  { id: 'runway',     label: 'Runway Calculator' },
  { id: 'scenarios',  label: 'Scenarios'         },
  { id: 'protection', label: 'Income Protection' },
];

export function CareerInsuranceCenter() {
  const [activeTab, setActiveTab] = useState('emergency');
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as import('../../../types/hybridResult').HybridResult | null;

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
              background: activeTab === t.id ? '#10b981' : 'transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="emergency">  <EmergencyFundPlanner scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="runway">     <RunwayCalculator scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="scenarios">  <RiskScenarioPlanner scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="protection"> <IncomeProtectionPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
