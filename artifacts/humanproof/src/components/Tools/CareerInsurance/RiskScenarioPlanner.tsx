// RiskScenarioPlanner.tsx — 3-scenario financial planner
import { useState } from 'react';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

interface Scenario {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  incomeMultiplier: number;
  timelineMonths: number;
  actions: string[];
}

export function RiskScenarioPlanner({ scoreResult }: Props) {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const currentScore = scoreResult?.total ?? 50;
  const runway = scoreResult?.financialRunway?.runwayMonths ?? 4;

  const SCENARIOS: Scenario[] = [
    {
      id: 'best',
      label: 'Best Case',
      description: 'Market recovers, you land a role within 60 days with 10–20% salary increase.',
      icon: <TrendingUp size={20} />,
      color: '#10b981',
      incomeMultiplier: 1.15,
      timelineMonths: 2,
      actions: [
        'Apply to 5 target companies per week',
        'Activate your referral network immediately',
        'Negotiate a sign-on bonus to offset any gap',
        'Ask for extended start date to maximize final paycheck',
      ],
    },
    {
      id: 'base',
      label: 'Base Case',
      description: 'Steady search, land a comparable role in 3–5 months at similar compensation.',
      icon: <Minus size={20} />,
      color: '#f59e0b',
      incomeMultiplier: 1.0,
      timelineMonths: 4,
      actions: [
        'Set a weekly application target (min. 10 applications/week)',
        'Upskill during the gap to strengthen your candidacy',
        'Cut discretionary spending by 20% to preserve runway',
        'Consider contract work to extend runway while searching',
      ],
    },
    {
      id: 'worst',
      label: 'Worst Case',
      description: 'Extended search (6–9 months), possibly requiring a lateral or slight downgrade.',
      icon: <TrendingDown size={20} />,
      color: '#ef4444',
      incomeMultiplier: 0.9,
      timelineMonths: 8,
      actions: [
        'Activate emergency budget — cut all non-essentials',
        'Apply broadly including lateral moves and adjacent industries',
        'Consider short-term consulting or freelance to bridge income',
        `With ${runway.toFixed(0)} months runway, you have ${Math.max(0, runway - 2).toFixed(0)} months before critical action needed`,
      ],
    },
  ];

  const active = SCENARIOS.find(s => s.id === activeScenario);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Risk Scenario Planner
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Model three scenarios based on your current risk score ({Math.round(currentScore)}) and runway ({runway.toFixed(1)} months).
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {SCENARIOS.map(scenario => (
          <div
            key={scenario.id}
            className="card-premium"
            style={{
              padding: 18,
              cursor: 'pointer',
              border: activeScenario === scenario.id ? `1px solid ${scenario.color}` : undefined,
              transition: 'all 0.2s',
            }}
            onClick={() => setActiveScenario(activeScenario === scenario.id ? null : scenario.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ color: scenario.color }}>{scenario.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{scenario.label}</div>
              <div style={{
                marginLeft: 'auto',
                background: `${scenario.color}22`,
                color: scenario.color,
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 4,
              }}>
                ~{scenario.timelineMonths}mo search
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
              {scenario.description}
            </div>

            {activeScenario === scenario.id && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em' }}>
                  RECOMMENDED ACTIONS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {scenario.actions.map((action, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                      <span style={{ color: scenario.color, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        lineHeight: 1.6,
      }}>
        💡 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Prepare for the worst, plan for the best.</strong>{' '}
        Having a detailed action plan for each scenario reduces decision fatigue during a stressful job search.
        Click a scenario above to expand its action plan.
      </div>
    </div>
  );
}
