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
  const d3 = dimensions.find(d => d.key === 'D3')?.score ?? 50;
  const d4 = dimensions.find(d => d.key === 'D4')?.score ?? 50;
  const d6 = dimensions.find(d => d.key === 'D6')?.score ?? 50;

  const expRaw   = parseInt(experience.split('-')[0] || '5', 10);
  const expYears = isNaN(expRaw) ? 5 : expRaw;
  const seniorityBonus = Math.min(20, expYears * 1.5);

  const factors: FactorCard[] = [
    {
      name: 'Human Judgment & Creativity',
      icon: '🧠',
      description: 'Capacity for contextual reasoning, ethical judgment, and original thinking that AI cannot replicate.',
      protectionScore: d3,
      futureValueScore: Math.min(100, d3 + 15),
      marketScarcityScore: Math.min(100, d3 + 10),
      color: 'var(--violet)',
    },
    {
      name: 'Domain Experience Shield',
      icon: '🛡',
      description: 'Years of domain expertise, pattern recognition, and institutional knowledge that accumulates non-linearly.',
      protectionScore: d4,
      futureValueScore: Math.min(100, d4 + 10),
      marketScarcityScore: Math.min(100, d4 + Math.round(seniorityBonus)),
      color: 'var(--cyan)',
    },
    {
      name: 'Professional Network & Trust',
      icon: '🤝',
      description: 'Relationships, reputation, and trust built over time that enable collaboration, influence, and referrals.',
      protectionScore: d6,
      futureValueScore: Math.min(100, d6 + 20),
      marketScarcityScore: Math.min(100, d6 + 15),
      color: 'var(--emerald)',
    },
  ];

  // Add management factor if applicable
  if (hasManagement) {
    factors.push({
      name: 'Leadership & Team Direction',
      icon: '🎯',
      description: 'Ability to direct, motivate, and align human teams — becomes more valuable as AI handles execution.',
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
      name: 'AI Tool Proficiency',
      icon: '⚡',
      description: 'Ability to direct, evaluate, and amplify AI tools — transforms AI from a threat into a career multiplier.',
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

  return (
    <div>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>SURVIVAL FACTORS</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '24px', lineHeight: 1.5 }}>
        What protects you today and what will be most valuable after the agentic AI wave. Higher scores indicate stronger protection.
      </p>

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
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', width: '130px', flexShrink: 0 }}>Protection Score</span>
                <div style={{ flex: 1 }}>
                  <MiniBar value={factor.protectionScore} color={scarcityColor(factor.protectionScore)} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', width: '130px', flexShrink: 0 }}>Future Value Score</span>
                <div style={{ flex: 1 }}>
                  <MiniBar value={factor.futureValueScore} color={factor.color} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', width: '130px', flexShrink: 0 }}>Market Scarcity Score</span>
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
        Scores are derived from your D3–D6 Oracle dimensions and role intelligence data. Future Value projections assume large-scale agentic AI adoption by 2030–2032.
      </div>
    </div>
  );
};
