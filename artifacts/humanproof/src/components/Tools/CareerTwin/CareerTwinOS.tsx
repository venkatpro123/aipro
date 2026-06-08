// CareerTwinOS.tsx — Tool 10: Career Twin (5-tab layout)
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import { CareerProfilePanel } from './CareerProfilePanel';
import { SkillsInventoryPanel } from './SkillsInventoryPanel';
import { GoalsProgressPanel } from './GoalsProgressPanel';
import { PreferencesPanel } from './PreferencesPanel';
import { CareerHistoryPanel } from './CareerHistoryPanel';

const TABS = [
  { id: 'profile',     label: 'Profile'         },
  { id: 'skills',      label: 'Skills'           },
  { id: 'goals',       label: 'Goals'            },
  { id: 'preferences', label: 'Preferences'      },
  { id: 'history',     label: 'Career History'   },
];

const ACCENT = '#a78bfa';

export function CareerTwinOS() {
  const [activeTab, setActiveTab] = useState('profile');
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;

  return (
    <div>
      {/* Header summary */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: ACCENT, marginBottom: 4 }}>Career Twin</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
          Your persistent career model — profile, skills, goals, and history in one place. The more you complete, the more personalized every recommendation becomes.
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
          {TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} style={{
              padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
              color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.6)',
              background: activeTab === t.id ? ACCENT : 'transparent',
            }}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile">
          <CareerProfilePanel />
        </TabsContent>

        <TabsContent value="skills">
          {scoreResult ? (
            <SkillsInventoryPanel scoreResult={scoreResult} />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(167,139,250,0.05)', borderRadius: 16, border: '1px solid rgba(167,139,250,0.15)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Run an audit to populate your Skills Inventory</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
                Your skill portfolio assessment requires an active audit result.
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals">
          <GoalsProgressPanel />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesPanel />
        </TabsContent>

        <TabsContent value="history">
          <CareerHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
