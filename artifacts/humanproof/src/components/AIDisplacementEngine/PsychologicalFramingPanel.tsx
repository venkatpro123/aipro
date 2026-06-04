// PsychologicalFramingPanel — §9 Psychological Framing
// Honest prose narrative. No panic, no false reassurance.

import React from 'react';
import type { AgenticTier } from '../../services/agenticExposureEngine';

interface Props {
  score: number;
  agenticTier: AgenticTier;
  impactTimeline: 'short' | 'medium' | 'long';
  verdict: string;
}

interface Framing {
  current: string;
  structural: string;
  agency: string;
}

function buildFraming(score: number, agenticTier: AgenticTier, impactTimeline: string, verdict: string): Framing {
  const timingPhrase = impactTimeline === 'short'
    ? 'the next 2–4 years'
    : impactTimeline === 'medium'
    ? 'the next 4–7 years'
    : 'a longer 7–10 year horizon';

  // Current reality paragraph
  const currentMap: Record<string, string> = {
    RESILIENT: `Your role sits in a structurally protected position today. The skills and judgment required for your work remain difficult for AI to replicate, and market demand continues to support career growth in this area.`,
    MODERATE:  `Your role carries moderate AI disruption risk at present. AI tools are beginning to automate portions of your workflow, but human oversight, contextual judgment, and professional relationships continue to create meaningful career value.`,
    ELEVATED:  `Your role is experiencing elevated AI-driven disruption pressure. A growing proportion of routine tasks can now be automated by current AI tools, which is affecting hiring patterns in some markets.`,
    HIGH:      `Your role faces high AI disruption risk in the current environment. Core workflows are increasingly within reach of existing AI systems, and organizational restructuring is already occurring in parts of this sector.`,
    CRITICAL:  `Your role is in a critically exposed position. Widespread AI automation of the most common tasks in this work has already begun, and the pace of capability deployment is accelerating.`,
  };
  const currentText = currentMap[verdict] ?? currentMap['MODERATE'];

  // Structural shift paragraph
  let structural: string;
  if (agenticTier === 'EXTREME' || agenticTier === 'SEVERE') {
    structural = `Looking ahead, this role faces significant structural transformation over ${timingPhrase}. Autonomous AI systems — capable of completing multi-step workflows without human intervention — are advancing in capabilities that directly apply to this work. This isn't a distant risk: the structural exposure is real and the preparation window is finite.`;
  } else if (agenticTier === 'HIGH') {
    structural = `Over ${timingPhrase}, agentic AI systems are expected to take on a meaningful portion of the routine execution tasks in this role. The change will likely feel gradual at first, then accelerate rapidly once capability thresholds are crossed. The roles that survive will look different from the roles that exist today.`;
  } else {
    structural = `Over ${timingPhrase}, AI capabilities are expected to shift how this work is done — augmenting human capacity rather than replacing it outright. The professionals who thrive will be those who actively integrate AI tools and focus their energy on work that is genuinely difficult to automate.`;
  }

  // Agency paragraph
  const agencyHigh = `The greatest advantage available to you right now is preparation time. The professionals who will be least affected are not necessarily the most technically skilled — they are the ones who begin adapting before the market forces them to. Use the action plan in this report to build concrete protection now.`;
  const agencyMed  = `The transition ahead is manageable with proactive positioning. Your expertise, professional relationships, and domain knowledge are durable assets. The most important move is to understand specifically where your risk sits and to begin shifting your work profile toward AI-resistant areas before the structural changes arrive.`;
  const agencyLow  = `Your role is in a relatively protected position, but no career is immune from structural change over a long enough horizon. The best approach is to stay informed, monitor the warning signals in your sector, and continue building the uniquely human capabilities that remain consistently valuable.`;

  let agency: string;
  if (agenticTier === 'EXTREME' || agenticTier === 'SEVERE' || score >= 65) {
    agency = agencyHigh;
  } else if (agenticTier === 'HIGH' || score >= 45) {
    agency = agencyMed;
  } else {
    agency = agencyLow;
  }

  return { current: currentText, structural, agency };
}

export const PsychologicalFramingPanel: React.FC<Props> = ({ score, agenticTier, impactTimeline, verdict }) => {
  const framing = buildFraming(score, agenticTier, impactTimeline, verdict);

  return (
    <div style={{
      marginTop: '28px',
      padding: '28px',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--cyan)' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{
          padding: '3px 10px', borderRadius: '4px',
          background: 'rgba(0,212,224,0.1)', border: '1px solid rgba(0,212,224,0.25)',
          fontSize: '0.6rem', fontWeight: 800, color: 'var(--cyan)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
        }}>
          INTELLIGENCE BRIEF
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
          Honest assessment — no panic, no false reassurance
        </span>
      </div>

      {/* Three paragraphs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { label: 'CURRENT REALITY', text: framing.current, color: 'var(--text)' },
          { label: 'STRUCTURAL CONTEXT', text: framing.structural, color: 'var(--text-2)' },
          { label: 'YOUR ADVANTAGE', text: framing.agency, color: 'var(--text-2)' },
        ].map(({ label, text, color }) => (
          <div key={label}>
            <div style={{
              fontSize: '0.58rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700,
            }}>
              {label}
            </div>
            <p style={{ fontSize: '0.82rem', color, lineHeight: 1.75, margin: 0 }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: '20px', paddingTop: '14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5,
      }}>
        This assessment reflects probabilistic structural trends based on AI capability research and industry adoption data. It separates current observable risk from future structural exposure. Neither outcome is guaranteed — decisions remain yours to make with full information.
      </div>
    </div>
  );
};
