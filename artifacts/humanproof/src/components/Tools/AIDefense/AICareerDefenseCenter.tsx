// AICareerDefenseCenter.tsx — Tool 2: AI Career Defense (Phase 2: amplification framing)
// Phase E: twin writes on tab change so Career Twin learns from tool exploration.
import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { useLayoff } from '../../../context/LayoffContext';
import { useAuth } from '../../../context/AuthContext';
import { recordTwinDecision } from '../../../services/careerTwinService';
import { AIReplacementAnalysis } from './AIReplacementAnalysis';
import { AIReadinessAnalysis } from './AIReadinessAnalysis';
import { EmergingOpportunityDetector } from './EmergingOpportunityDetector';
import { SkillDemandTracker } from './SkillDemandTracker';
import { AIAmplificationRoadmap } from './AIAmplificationRoadmap';
import { CareerMoatPanel } from './CareerMoatPanel';
import { SurvivalStrategyPanel } from './SurvivalStrategyPanel';
import { TransformationRoadmap } from './TransformationRoadmap';
import { NextBestActionBar } from '../../shared/NextBestActionBar';

const DecadeScenarioPlannerPanel = lazy(() =>
  import('./DecadeScenarioPlannerPanel').then(m => ({ default: m.DecadeScenarioPlannerPanel })),
);

const TABS = [
  { id: 'replacement',   label: 'AI Threat'            },
  { id: 'moat',          label: 'Career Moat'          },
  { id: 'survival',      label: 'Survival Plan'        },
  { id: 'transformation',label: 'Transformation'       },
  { id: 'amplify',       label: 'AI Amplify'           },
  { id: 'skills',        label: 'Skill Demand'         },
  { id: 'readiness',     label: 'AI Readiness'         },
  { id: 'opportunities', label: 'Emerging Roles'       },
  { id: 'decade',        label: 'Decade Plan'          },
];

const AI_DEFENSE_TAB_KEY = 'hp.ai-defense.tab';

export function AICareerDefenseCenter() {
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem(AI_DEFENSE_TAB_KEY);
    // Guard against stale ids (e.g. removed 'roadmap') so a valid tab always renders.
    return stored && TABS.some(t => t.id === stored) ? stored : 'replacement';
  });
  const { user } = useAuth();
  const { state } = useLayoff();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try { localStorage.setItem(AI_DEFENSE_TAB_KEY, tab); } catch { /* storage unavailable */ }
    if (user?.id) {
      recordTwinDecision({
        userId: user.id,
        decisionType: 'other',
        notes: `AI Defense: explored ${tab} tab`,
        decidedAt: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
  };
  const scoreResult = state.scoreResult as import('../../../types/hybridResult').HybridResult | null;

  if (!scoreResult) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 24px',
        background: 'rgba(0,212,255,0.05)',
        borderRadius: 16,
        border: '1px solid rgba(0,212,255,0.15)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
          Run your first audit to unlock AI Defense
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 380, margin: '0 auto' }}>
          Your AI exposure analysis is personalized to your role and tech stack.
        </div>
      </div>
    );
  }

  return (
    <>
    {/* Decision spine (Rule 5): the single highest-impact AI-defense move right now */}
    <NextBestActionBar tool="ai-defense" hr={scoreResult} accent="#00d4e0" />
    <Tabs value={activeTab} onValueChange={handleTabChange}>
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
              background: activeTab === t.id ? 'var(--cyan)' : 'transparent',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="replacement">    <AIReplacementAnalysis scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="moat">           <CareerMoatPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="survival">       <SurvivalStrategyPanel scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="transformation"> <TransformationRoadmap scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="amplify">        <AIAmplificationRoadmap scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="skills">         <SkillDemandTracker scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="readiness">      <AIReadinessAnalysis scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="opportunities">  <EmergingOpportunityDetector scoreResult={scoreResult} /></TabsContent>
      <TabsContent value="decade">
        <Suspense fallback={<div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>Loading decade planner…</div>}>
          <DecadeScenarioPlannerPanel />
        </Suspense>
      </TabsContent>
    </Tabs>
    </>
  );
}
