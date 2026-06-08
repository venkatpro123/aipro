// SurvivalFactorsPanel — §5 Survival Factors
// Protection / Future Value / Market Scarcity per factor card.

import React from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';

interface Dimension {
  key: string;
  score: number;
  label?: string;
}

interface Props {
  dimensions: Dimension[];
  intel: CareerIntelligence | null;
  experience: string;
  scoreColor: string;
  hasManagement?: boolean;
}

interface FactorCard {
  name: string;
  icon: string;
  description: string;
  protectionScore: number;
  futureValueScore: number;
  marketScarcityScore: number;
  color: string;
}

function scarcityColor(v: number): string {
  if (v >= 75) return 'var(--emerald)';
  if (v >= 50) return 'var(--cyan)';
  if (v >= 30) return 'var(--amber)';
  return 'var(--red)';
}

function deriveFactors(
  dimensions: Dimension[],
  intel: CareerIntelligence | null,
  experience: string,
  hasManagement: boolean,
): FactorCard[] {
  // D3/D4/D6 are "exposure" dimensions: higher score = more AI risk.
  // Invert to get protection strength: 100 - score = how well this factor shields the user.
  const d3Raw = dimensions.find(d => d.key === 'D3')?.score ?? 50;
  const d4Raw = dimensions.find(d => d.key === 'D4')?.score ?? 50;
  const d6Raw = dimensions.find(d => d.key === 'D6')?.score ?? 50;
  const d3 = Math.max(5, 100 - d3Raw); // judgment protection
  const d4 = Math.max(5, 100 - d4Raw); // experience shield strength
  const d6 = Math.max(5, 100 - d6Raw); // network/reputation moat strength

  const expRaw   = parseInt(experience.split('-')[0] || '5', 10);
  const expYears = isNaN(expRaw) ? 5 : expRaw;
  const seniorityBonus = Math.min(20, expYears * 1.5);

  const factors: FactorCard[] = [
    {
      name: 'Judgment & Original Thinking',
      icon: '🧠',
      description: "Your ability to think through complex situations, make ethical calls, and come up with original ideas — things AI still can't do well.",
      protectionScore: d3,
      futureValueScore: Math.min(100, d3 + 15),
      marketScarcityScore: Math.min(100, d3 + 10),
      color: 'var(--violet)',
    },
    {
      name: 'Years of Deep Experience',
      icon: '🛡',
      description: "The deep knowledge and pattern recognition you've built up over years — the kind that can't be learned from a textbook or prompt.",
      protectionScore: d4,
      futureValueScore: Math.min(100, d4 + 10),
      marketScarcityScore: Math.min(100, d4 + Math.round(seniorityBonus)),
      color: 'var(--cyan)',
    },
    {
      name: 'Your Professional Relationships',
      icon: '🤝',
      description: "The professional relationships and reputation you've built — people trust you personally, which no AI can replicate.",
      protectionScore: d6,
      futureValueScore: Math.min(100, d6 + 20),
      marketScarcityScore: Math.min(100, d6 + 15),
      color: 'var(--emerald)',
    },
  ];

  // Add management factor if applicable
  if (hasManagement) {
    factors.push({
      name: 'Leading and Directing People',
      icon: '🎯',
      description: 'Your ability to lead, motivate, and coordinate people — this becomes more valuable as AI takes over the routine execution work.',
      protectionScore: Math.min(100, d6 + 15),
      futureValueScore: 85,
      marketScarcityScore: 78,
      color: 'var(--amber)',
    });
  }

  // Add safe skills from intel if available
  if (intel?.skills?.safe && intel.skills.safe.length > 0) {
    const topSafe = intel.skills.safe.slice(0, 2);
    topSafe.forEach(skill => {
      const ltv = skill.longTermValue ?? 70;
      factors.push({
        name: skill.skill,
        icon: '⚡',
        description: skill.whySafe,
        protectionScore: Math.min(100, ltv - 5),
        futureValueScore: ltv,
        marketScarcityScore: Math.min(100, ltv - 8),
        color: 'var(--cyan)',
      });
    });
  } else {
    // Generic AI-era skills as fallback
    factors.push({
      name: 'Using AI Tools Effectively',
      icon: '⚡',
      description: 'Your ability to use and direct AI tools well — this turns AI from a threat into your biggest career advantage.',
      protectionScore: 72,
      futureValueScore: 88,
      marketScarcityScore: 62,
      color: 'var(--cyan)',
    });
  }

  return factors;
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '2px', transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)', minWidth: '28px', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

export const SurvivalFactorsPanel: React.FC<Props> = ({ dimensions, intel, experience, scoreColor, hasManagement = false }) => {
  const factors = deriveFactors(dimensions, intel, experience, hasManagement);

  const d3Raw = dimensions.find(d => d.key === 'D3')?.score ?? 50;
  const d4Raw = dimensions.find(d => d.key === 'D4')?.score ?? 50;
  const d6Raw = dimensions.find(d => d.key === 'D6')?.score ?? 50;
  const allStrong = (100 - d3Raw) >= 70 && (100 - d4Raw) >= 70 && (100 - d6Raw) >= 70;

  return (
    <div>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>WHAT PROTECTS YOUR CAREER</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '24px', lineHeight: 1.5 }}>
        The skills and qualities that make you harder to replace — both today and as AI advances.
      </p>

      {allStrong && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '8px',
          background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🛡</span>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)', marginBottom: '3px' }}>
              Well protected across all three pillars
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
              Your judgment, experience, and professional relationships are all strong. Roles like yours tend to survive AI waves by evolving rather than being replaced — focus on staying ahead of the next shift, not catching up.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {factors.map((factor) => (
          <div
            key={factor.name}
            style={{
              padding: '16px 20px', borderRadius: '10px',
              background: `${factor.color}06`, border: `1px solid ${factor.color}22`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{factor.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
                  {factor.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  {factor.description}
                </div>
              </div>
            </div>

            {/* Three metric bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', width: '130px', flexShrink: 0 }}>Protects you today</span>
                <div style={{ flex: 1 }}>
                  <MiniBar value={factor.protectionScore} color={scarcityColor(factor.protectionScore)} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', width: '130px', flexShrink: 0 }}>Value in 2030</span>
                <div style={{ flex: 1 }}>
                  <MiniBar value={factor.futureValueScore} color={factor.color} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', width: '130px', flexShrink: 0 }}>Hard to replace</span>
                <div style={{ flex: 1 }}>
                  <MiniBar value={factor.marketScarcityScore} color={scarcityColor(factor.marketScarcityScore)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Based on your role, experience, and industry data. Future scores estimate how valuable each quality becomes as AI advances.
      </div>
    </div>
  );
};
