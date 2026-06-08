// CareerReadinessCenter.tsx — Tool 3: Career Readiness Center
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import { ResumeReadinessPanel } from './ResumeReadinessPanel';
import { LinkedInOptimizationPanel } from './LinkedInOptimizationPanel';
import { InterviewReadinessPanel } from './InterviewReadinessPanel';
import { PortfolioReadinessPanel } from './PortfolioReadinessPanel';
import { ReferralReadinessPanel } from './ReferralReadinessPanel';

const TABS = [
  { id: 'resume',    label: 'Resume'    },
  { id: 'linkedin',  label: 'LinkedIn'  },
  { id: 'interview', label: 'Interview' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'referral',  label: 'Referrals' },
];

export function CareerReadinessCenter() {
  const [activeTab, setActiveTab] = useState('resume');
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
              background: activeTab === t.id ? '#a78bfa' : 'transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="resume">    <ResumeReadinessPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="linkedin">  <LinkedInOptimizationPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="interview"> <InterviewReadinessPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="portfolio"> <PortfolioReadinessPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="referral">  <ReferralReadinessPanel scoreResult={scoreResult} /></TabsContent>
    </Tabs>
  );
}
