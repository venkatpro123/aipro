// RiskSimulator.tsx — "What if" scenario cards for career decisions
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, Briefcase, Award, Building } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface Scenario {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  scoreImpact: (score: number) => number;
  color: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'new-job',
    icon: <Briefcase size={20} />,
    title: 'Switch to a new job',
    description: 'Estimated impact of changing to a similar role at a stable company.',
    scoreImpact: (s) => Math.max(s - 18, 5),
    color: '#10b981',
  },
  {
    id: 'promotion',
    icon: <Award size={20} />,
    title: 'Get promoted',
    description: 'Higher seniority typically reduces displacement risk significantly.',
    scoreImpact: (s) => Math.max(s - 12, 5),
    color: '#a78bfa',
  },
  {
    id: 'upskill',
    icon: <TrendingDown size={20} />,
    title: 'Complete AI skill sprint',
    description: '90-day AI augmentation upskilling reduces automation exposure.',
    scoreImpact: (s) => Math.max(s - 8, 5),
    color: 'var(--cyan)',
  },
  {
    id: 'bigger-co',
    icon: <Building size={20} />,
    title: 'Move to a larger company',
    description: 'Large enterprises with stable revenue tend to have lower layoff rates.',
    scoreImpact: (s) => Math.max(s - 10, 5),
    color: '#f59e0b',
  },
  {
    id: 'startup',
    icon: <TrendingUp size={20} />,
    title: 'Join an early-stage startup',
    description: 'Higher reward potential but elevated short-term displacement risk.',
    scoreImpact: (s) => Math.min(s + 15, 97),
    color: '#ef4444',
  },
];

export function RiskSimulator({ scoreResult }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const currentScore = scoreResult.total ?? 50;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Career Decision Simulator
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Explore how major career moves would affect your layoff risk score.
          Your current score: <strong style={{ color: 'var(--cyan)' }}>{Math.round(currentScore)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
        {SCENARIOS.map((scenario) => {
          const projected = Math.round(scenario.scoreImpact(currentScore));
          const delta = projected - Math.round(currentScore);
          const isActive = activeId === scenario.id;
          return (
            <div
              key={scenario.id}
              className="card-premium"
              style={{
                padding: 18,
                cursor: 'pointer',
                border: isActive ? `1px solid ${scenario.color}` : undefined,
                transition: 'all 0.2s',
              }}
              onClick={() => setActiveId(isActive ? null : scenario.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ color: scenario.color }}>{scenario.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{scenario.title}</div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
                {scenario.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>PROJECTED SCORE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: scenario.color }}>{projected}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>CHANGE</div>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: delta < 0 ? '#10b981' : '#ef4444',
                  }}>
                    {delta > 0 ? '+' : ''}{delta} pts
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                    }}>
                      {delta < 0
                        ? `This move could reduce your risk score by ${Math.abs(delta)} points. Consider exploring this path via the Career Readiness Center.`
                        : `This move increases risk by ${delta} points. Only pursue if you have sufficient financial runway (6+ months).`
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
