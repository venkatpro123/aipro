// OpportunityPanel.tsx — Opportunity Engine (Phase 10)
// Equal emphasis on growth paths alongside risk.
// Derives 3–5 opportunities from MasterIntelligence — no hardcoded text.

import React, { useState } from 'react';
import type { MasterIntelligence } from '../../data/masterIntelligenceEngine';
import type { ScoreResult } from '../../data/riskFormula';
import { getRoleNarrative } from '../../data/roleNarratives';

interface Props {
  intel: MasterIntelligence;
  result: ScoreResult;
  roleKey: string;
  roleLabel: string;
  experience?: string;
}

interface Opportunity {
  icon: string;
  title: string;
  description: string;
  strength: 'strong' | 'moderate' | 'emerging';
  category: 'experience' | 'market' | 'skill' | 'transition' | 'ai-augment';
}

function buildOpportunities(
  intel: MasterIntelligence,
  result: ScoreResult,
  roleKey: string,
  experience: string,
): Opportunity[] {
  const opps: Opportunity[] = [];
  const roleNarrative = getRoleNarrative(roleKey);

  // ── Experience / Adaptability signal ────────────────────────────────────
  if (intel.adaptabilityScore >= 65) {
    opps.push({
      icon: '🎯',
      title: 'Your experience puts you in the top tier for AI-augmented transitions',
      description: `Professionals with your experience level (${experience} years) consistently outperform early-career peers in transition success rates — you have both the domain depth and career capital to reposition into adjacent AI-native roles.`,
      strength: 'strong',
      category: 'experience',
    });
  } else if (intel.adaptabilityScore >= 45) {
    opps.push({
      icon: '📈',
      title: 'Your experience provides a meaningful transition runway',
      description: `Your career tenure gives you pattern recognition and professional relationships that can be leveraged into AI-augmented roles in your field — the transition path is well-defined for professionals at your stage.`,
      strength: 'moderate',
      category: 'experience',
    });
  }

  // ── Market strength signal ────────────────────────────────────────────
  if (intel.marketStrength >= 60) {
    opps.push({
      icon: '🌍',
      title: 'Your market is actively hiring for AI-adjacent roles',
      description: `Your local market shows strong demand signals for professionals who bridge domain expertise with AI fluency — the hiring environment is working in your favor for upskilled versions of your current role.`,
      strength: 'strong',
      category: 'market',
    });
  } else if (intel.marketStrength >= 40) {
    opps.push({
      icon: '🌐',
      title: 'Global remote opportunity expands your addressable market',
      description: `Even if your local market faces AI pressure, the global demand for domain-expert AI practitioners is strong — remote work expansion means geography is no longer a ceiling on your career opportunities.`,
      strength: 'moderate',
      category: 'market',
    });
  }

  // ── Protection / Human edge signal ────────────────────────────────────
  if (intel.protectionScore >= 60) {
    opps.push({
      icon: '🛡️',
      title: 'Your human-only skills are the exact gap AI cannot fill',
      description: `Your role\'s highest-value dimensions — complex judgment, stakeholder trust, and contextual expertise — are precisely what AI systems consistently underperform on. This is your compounding advantage, not a static shield.`,
      strength: 'strong',
      category: 'skill',
    });
  }

  // ── AI augmentation opportunity ────────────────────────────────────────
  if (intel.exposureScore >= 50) {
    // High exposure = high opportunity to be AI-augmented leader
    opps.push({
      icon: '⚡',
      title: 'AI-augmented professionals in your field earn 25–35% more',
      description: `The fastest salary growth in your field is going to professionals who use AI tools to multiply their output — not those who compete against AI by working harder at the same tasks. This is the highest-return upskilling path available to you right now.`,
      strength: 'strong',
      category: 'ai-augment',
    });
  } else {
    opps.push({
      icon: '⚡',
      title: 'AI tools can multiply your specialist output — not replace it',
      description: `In roles with your complexity profile, AI tools function as force multipliers — handling routine research, formatting, and data processing so you can focus exclusively on the high-judgment work that commands a premium.`,
      strength: 'moderate',
      category: 'ai-augment',
    });
  }

  // ── Role-specific opportunities from narrative data ────────────────────
  if (roleNarrative?.uniqueOpportunities?.length) {
    const topOpp = roleNarrative.uniqueOpportunities[0];
    opps.push({
      icon: '🚀',
      title: topOpp.split(' — ')[0] ?? topOpp.slice(0, 60),
      description: topOpp,
      strength: 'emerging',
      category: 'transition',
    });
  }

  // ── Career path transitions from ScoreResult ──────────────────────────
  const careerPaths = result.safer_career_paths ?? [];
  if (careerPaths.length >= 1) {
    const topPath = careerPaths[0];
    opps.push({
      icon: '🔄',
      title: `Transition path: ${topPath.role}`,
      description: `This adjacent role reduces AI displacement risk by ~${topPath.risk_reduction_pct}% compared to your current position. ${topPath.skill_gap ? `Skill gap: ${topPath.skill_gap}.` : ''} Difficulty: ${topPath.transition_difficulty ?? 'Moderate'}.`,
      strength: (topPath.risk_reduction_pct ?? 0) >= 35 ? 'strong' : 'moderate',
      category: 'transition',
    });
  }

  return opps.slice(0, 5);
}

const STRENGTH_STYLES: Record<Opportunity['strength'], { color: string; bg: string; label: string }> = {
  strong:   { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'Strong Signal' },
  moderate: { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   label: 'Growing Signal' },
  emerging: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Emerging Signal' },
};

export const OpportunityPanel: React.FC<Props> = ({
  intel, result, roleKey, roleLabel, experience = '5-10',
}) => {
  const [expanded, setExpanded] = useState(false);
  const opportunities = buildOpportunities(intel, result, roleKey, experience);
  const visible = expanded ? opportunities : opportunities.slice(0, 3);

  return (
    <div style={{
      marginTop: '32px',
      padding: '24px 28px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(16,185,129,0.03)',
      border: '1px solid rgba(16,185,129,0.15)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            padding: '3px 10px', borderRadius: '6px',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
            fontSize: '0.58rem', fontWeight: 800, color: '#10b981',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
          }}>
            OPPORTUNITY ENGINE
          </div>
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: '4px' }}>
          Your Growth Paths & Career Leverage Points
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.55 }}>
          AI is reshaping {roleLabel} — but it\'s also creating new high-value positions for those who move first.
          These opportunities are specific to your profile, not generic career advice.
        </p>
      </div>

      {/* Opportunity cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {visible.map((opp, i) => {
          const style = STRENGTH_STYLES[opp.strength];
          return (
            <div key={i} style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: style.bg,
              border: `1px solid ${style.color}28`,
              borderLeft: `3px solid ${style.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }}>{opp.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3 }}>
                      {opp.title}
                    </div>
                    <div style={{
                      padding: '2px 8px', borderRadius: '5px',
                      background: `${style.color}15`, border: `1px solid ${style.color}30`,
                      fontSize: '0.55rem', fontWeight: 700, color: style.color,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', flexShrink: 0,
                    }}>
                      {style.label}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.55 }}>
                    {opp.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand toggle */}
      {opportunities.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginTop: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.68rem', color: '#10b981', fontWeight: 700,
            padding: '6px 0', display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          {expanded
            ? '↑ Show fewer opportunities'
            : `↓ View ${opportunities.length - 3} more opportunity${opportunities.length - 3 !== 1 ? 'ies' : 'y'}`}
        </button>
      )}

      {/* Footer note */}
      <div style={{
        marginTop: '16px', paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.5,
      }}>
        Opportunities are derived from your score dimensions — not generic career advice. Signal strength reflects confidence that this opportunity is accessible from your current position.
      </div>
    </div>
  );
};
