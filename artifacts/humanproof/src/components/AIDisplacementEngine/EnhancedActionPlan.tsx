// EnhancedActionPlan — §8 Personal Action Plan
// Time-horizoned action plan: 30-day / 90-day / 12-month / Before Threshold.

import React, { useState } from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';
import type { TrajectoryResult } from '../../services/DisplacementTrajectoryEngine';
import { StrategicRoadmap } from '../StrategicRoadmap';

interface Props {
  intel: CareerIntelligence | null;
  experience: string;
  score: number;
  trajectory: TrajectoryResult | null;
  scoreColor: string;
  salaryRange?: string;
}

type Horizon = '30d' | '90d' | '12m' | 'threshold';

interface ActionCard {
  title: string;
  detail: string;
  riskReduction: number;
  protectionIncrease: number;
  effort: 'Low' | 'Medium' | 'High';
  category: 'Skill' | 'Network' | 'Positioning' | 'Financial';
}

const EFFORT_COLORS = { Low: 'var(--emerald)', Medium: 'var(--amber)', High: 'var(--red)' };
const CAT_COLORS   = { Skill: 'var(--cyan)', Network: 'var(--violet)', Positioning: 'var(--amber)', Financial: 'var(--emerald)' };

function buildHeuristicActions(score: number, trajectory: TrajectoryResult | null, experience: string, salaryRange?: string): Record<Horizon, ActionCard[]> {
  const isHighRisk  = score >= 65;
  const isMedRisk   = score >= 45;
  const crossoverYr = trajectory?.displacementCrossover ?? null;
  const thresholdUrgency = crossoverYr && parseInt(crossoverYr, 10) - new Date().getFullYear() <= 3 ? 'near' : 'distant';

  return {
    '30d': [
      {
        title: 'Audit your automation exposure tasks',
        detail: 'List your 10 most frequent daily tasks and score each on AI replaceability. This creates your personal displacement map.',
        riskReduction: 3, protectionIncrease: 5,
        effort: 'Low', category: 'Positioning',
      },
      {
        title: 'Try one AI productivity tool for your role',
        detail: 'Spend 30 minutes daily using an AI tool in your workflow. Becoming a proficient AI user transforms you from threat-to-replaced to irreplaceable AI director.',
        riskReduction: 5, protectionIncrease: 8,
        effort: 'Low', category: 'Skill',
      },
      {
        title: 'Connect with 3 people in adjacent roles',
        detail: 'Network with roles in the "AI-augmented" tier of your evolution path now, while your current role gives you credibility.',
        riskReduction: 2, protectionIncrease: 6,
        effort: 'Low', category: 'Network',
      },
    ],
    '90d': [
      {
        title: 'Complete one AI-adjacent certification',
        detail: isHighRisk
          ? 'For high-risk roles, completing a relevant AI course signals adaptability to employers and builds real capability.'
          : 'Add one AI tool proficiency credential to distinguish yourself from peers who haven\'t adapted.',
        riskReduction: 8, protectionIncrease: 12,
        effort: 'Medium', category: 'Skill',
      },
      {
        title: 'Shift 20% of work toward AI-resistant tasks',
        detail: 'Deliberately seek stakeholder-facing, strategic, and judgment-intensive work. This repositions you in the role before the market does.',
        riskReduction: 7, protectionIncrease: 10,
        effort: 'Medium', category: 'Positioning',
      },
      {
        title: salaryRange && (salaryRange === '200k+' || salaryRange === '100-200k')
          ? 'Build a 6-month emergency financial buffer'
          : 'Build a 3-month emergency financial buffer',
        detail: 'Financial runway removes the desperation premium from career decisions. It gives you the power to move on your terms, not under pressure.',
        riskReduction: 0, protectionIncrease: 15,
        effort: 'High', category: 'Financial',
      },
    ],
    '12m': [],  // StrategicRoadmap fills this slot
    'threshold': [
      {
        title: isMedRisk
          ? 'Pursue a parallel income stream in an AI-adjacent skill'
          : 'Develop expertise in one uniquely human capability',
        detail: thresholdUrgency === 'near'
          ? 'With the threshold window approaching, begin building a secondary income source or adjacent role capability now. This creates options before the market narrows.'
          : 'Build depth in high-complexity, human-essential work. The pre-threshold window is your best time to establish credibility in protected areas.',
        riskReduction: 15, protectionIncrease: 25,
        effort: 'High', category: 'Positioning',
      },
      {
        title: 'Build visible expertise outside your current employer',
        detail: 'Create content, speak at events, or contribute to open communities. External reputation insulates you from single-employer dependency.',
        riskReduction: 10, protectionIncrease: 18,
        effort: 'Medium', category: 'Network',
      },
      {
        title: 'Evaluate roles in structurally growing areas',
        detail: 'Map your skills to roles in sectors with structural headcount growth. Proactive positioning is more effective than reactive pivoting under pressure.',
        riskReduction: 20, protectionIncrease: 30,
        effort: 'High', category: 'Positioning',
      },
    ],
  };
}

export const EnhancedActionPlan: React.FC<Props> = ({ intel, experience, score, trajectory, scoreColor, salaryRange }) => {
  const [activeHorizon, setActiveHorizon] = useState<Horizon>('30d');

  const heuristicActions = buildHeuristicActions(score, trajectory, experience, salaryRange);
  const crossoverYr = trajectory?.displacementCrossover;
  const crossoverNum = crossoverYr ? (parseInt(crossoverYr, 10) || 0) : 0;
  const thresholdLabel = crossoverYr && crossoverNum > 0
    ? `Before ${crossoverNum - 1}–${crossoverYr}`
    : 'Before Threshold';

  const horizons: { key: Horizon; label: string }[] = [
    { key: '30d',       label: 'Next 30 Days' },
    { key: '90d',       label: 'Next 90 Days' },
    { key: '12m',       label: 'Next 12 Months' },
    { key: 'threshold', label: thresholdLabel },
  ];

  const currentActions = heuristicActions[activeHorizon];

  return (
    <div>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>PERSONAL ACTION PLAN</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '20px', lineHeight: 1.5 }}>
        Time-horizoned actions ordered by strategic impact. Each action shows estimated risk reduction and future protection gain.
      </p>

      {/* Horizon tab pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
        {horizons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveHorizon(key)}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeHorizon === key ? scoreColor : 'rgba(255,255,255,0.05)',
              color: activeHorizon === key ? '#000' : 'rgba(255,255,255,0.5)',
              fontWeight: 700, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em', transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 12-month: use StrategicRoadmap */}
      {activeHorizon === '12m' ? (
        intel ? (
          <StrategicRoadmap intel={intel} experience={experience} scoreColor={scoreColor} score={score} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {heuristicActions['90d'].map((action) => (
              <ActionCardComponent key={action.title} action={{ ...action, riskReduction: action.riskReduction + 5, protectionIncrease: action.protectionIncrease + 8 }} scoreColor={scoreColor} />
            ))}
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-3)' }}>
              No specific actions for this horizon.
            </div>
          ) : (
            currentActions.map((action) => (
              <ActionCardComponent key={action.title} action={action} scoreColor={scoreColor} />
            ))
          )}
        </div>
      )}

      {/* Priority note */}
      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Risk Reduction and Protection Increase are estimated based on research into upskilling, career positioning, and AI adaptation outcomes. Individual results vary by execution quality and market conditions.
      </div>
    </div>
  );
};

function ActionCardComponent({ action, scoreColor }: { action: ActionCard; scoreColor: string }) {
  const effortC = EFFORT_COLORS[action.effort];
  const catC    = CAT_COLORS[action.category];

  return (
    <div style={{
      padding: '16px 20px', borderRadius: '10px',
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
          {action.title}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <span style={{
            padding: '2px 7px', borderRadius: '4px',
            background: `${catC}15`, border: `1px solid ${catC}30`,
            fontSize: '0.58rem', fontWeight: 800, color: catC, fontFamily: 'var(--font-mono)',
          }}>
            {action.category.toUpperCase()}
          </span>
          <span style={{
            padding: '2px 7px', borderRadius: '4px',
            background: `${effortC}15`, border: `1px solid ${effortC}30`,
            fontSize: '0.58rem', fontWeight: 800, color: effortC, fontFamily: 'var(--font-mono)',
          }}>
            {action.effort.toUpperCase()} EFFORT
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.73rem', color: 'var(--text-3)', lineHeight: 1.6, margin: '0 0 12px' }}>
        {action.detail}
      </p>

      {/* Impact metrics */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {action.riskReduction > 0 && (
          <div style={{
            padding: '4px 10px', borderRadius: '5px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '0.65rem', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 700,
          }}>
            Risk Reduction: −{action.riskReduction} pts
          </div>
        )}
        <div style={{
          padding: '4px 10px', borderRadius: '5px',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          fontSize: '0.65rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700,
        }}>
          Protection +{action.protectionIncrease}%
        </div>
      </div>
    </div>
  );
}
