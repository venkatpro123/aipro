// PsychologicalFramingPanel — §9 Psychological Framing
// "Current Safety ≠ Future Immunity" — two questions answered honestly.
// No panic, no false reassurance.

import React from 'react';
import type { AgenticTier } from '../../services/agenticExposureEngine';

interface Props {
  score: number;
  agenticTier: AgenticTier;
  impactTimeline: 'short' | 'medium' | 'long';
  verdict: string;
  d7Score?: number; // D7 Agentic Disruption Potential (0-100)
}

interface Framing {
  todayExposure: string;   // Q1: How exposed am I today?
  futureExposure: string;  // Q2: How exposed could I become?
  agency: string;
}

function buildFraming(
  score: number,
  agenticTier: AgenticTier,
  impactTimeline: string,
  verdict: string,
  d7Score: number,
): Framing {
  const timingPhrase = impactTimeline === 'short'
    ? 'the next 2–4 years'
    : impactTimeline === 'medium'
    ? 'the next 4–7 years'
    : 'a longer 7–10 year horizon';

  // Q1: Today's exposure
  const todayMap: Record<string, string> = {
    'AI-Resistant': `Your role sits in a structurally protected position today. The skills and judgment required for your work remain difficult for current AI to replicate, and market demand continues to support career growth in this area. Current safety is real — but it reflects today's AI capabilities, not tomorrow's.`,
    'Resilient':    `Your role carries moderate AI disruption risk at present. AI tools are beginning to automate portions of your workflow, but human oversight, contextual judgment, and professional relationships continue to create meaningful career value. Today's picture is manageable.`,
    'Exposed':      `Your role is experiencing elevated AI-driven disruption pressure. A growing proportion of routine tasks can now be automated by current AI tools, which is affecting hiring patterns and role definitions in some markets. The risk today is real.`,
    'Critical Risk':`Your role is in a critically exposed position with current AI systems. Widespread automation of the most common tasks in this work has already begun, and the pace of capability deployment is accelerating. Immediate repositioning is warranted.`,
  };
  const todayExposure = todayMap[verdict] ?? todayMap['Resilient'];

  // Q2: Future exposure — conditioned on D7
  let futureExposure: string;
  if (d7Score > 75) {
    futureExposure = `Over ${timingPhrase}, this role faces significant structural exposure to autonomous AI systems capable of executing complete workflows without human supervision. The core workflows that define this role today could be substantially automated if agentic AI crosses enterprise adoption thresholds — an event that is uncertain in timing but structurally plausible. Current safety does not guarantee future immunity here.`;
  } else if (d7Score > 55) {
    futureExposure = `Over ${timingPhrase}, agentic AI systems are expected to take on a meaningful portion of the routine execution tasks in this role. The change will likely feel gradual at first, then accelerate once capability thresholds are crossed. The roles that survive will look different from the roles that exist today — requiring deeper judgment, broader context, and uniquely human qualities.`;
  } else if (d7Score > 30) {
    futureExposure = `Over ${timingPhrase}, AI capabilities are expected to shift how this work is done — automating supporting workflows while human expertise drives higher-order value. The degree of structural impact depends on how quickly autonomous AI reaches enterprise adoption thresholds. This role has meaningful structural protection, but no career is immune over a long enough horizon.`;
  } else {
    futureExposure = `Over ${timingPhrase}, structural AI disruption may affect supporting workflows, but the core of this role depends on capabilities — physical presence, interpersonal trust, nuanced judgment — that autonomous AI systems are unlikely to replicate in this timeframe. Structural protection is strong. The caveat: "strong" is not "absolute," and the landscape continues to evolve.`;
  }

  // Agency paragraph
  const agencyHigh = `Current safety does not guarantee future immunity. The professionals who will be least affected are not necessarily the most technically skilled — they are the ones who begin adapting before the market forces them to. The action plan in this report gives you concrete steps to build protection now, while the window remains open.`;
  const agencyMed  = `Current safety does not guarantee future immunity, but the transition ahead is manageable with proactive positioning. Your expertise, professional relationships, and domain knowledge are durable assets. The most important move is to understand specifically where your structural risk sits and to begin shifting your work profile toward AI-resilient areas before changes arrive.`;
  const agencyLow  = `Your role is in a relatively protected position today, and structural protection is expected to persist. Even so, no career is immune from structural change over a long enough horizon. The best approach is to stay informed, monitor the signals in your sector, and continue building the uniquely human capabilities that remain consistently valuable regardless of AI adoption pace.`;

  let agency: string;
  if (agenticTier === 'EXTREME' || agenticTier === 'SEVERE' || score >= 65) {
    agency = agencyHigh;
  } else if (agenticTier === 'HIGH' || score >= 45 || d7Score > 60) {
    agency = agencyMed;
  } else {
    agency = agencyLow;
  }

  return { todayExposure, futureExposure, agency };
}

export const PsychologicalFramingPanel: React.FC<Props> = ({
  score, agenticTier, impactTimeline, verdict, d7Score = 55,
}) => {
  const framing = buildFraming(score, agenticTier, impactTimeline, verdict, d7Score);

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
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            padding: '3px 10px', borderRadius: '4px',
            background: 'rgba(0,212,224,0.1)', border: '1px solid rgba(0,212,224,0.25)',
            fontSize: '0.6rem', fontWeight: 800, color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
          }}>
            CURRENT SAFETY ≠ FUTURE IMMUNITY
          </div>
        </div>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', margin: 0 }}>
          Honest structural assessment — two questions answered · No panic, no false reassurance
        </p>
      </div>

      {/* Three sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Q1 */}
        <div>
          <div style={{
            fontSize: '0.58rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700,
          }}>
            QUESTION 1 — HOW EXPOSED AM I TODAY?
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.75, margin: 0 }}>
            {framing.todayExposure}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Q2 */}
        <div>
          <div style={{
            fontSize: '0.58rem', color: d7Score > 60 ? 'var(--amber)' : 'var(--cyan)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700,
          }}>
            QUESTION 2 — HOW EXPOSED COULD I BECOME?
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.75, margin: 0 }}>
            {framing.futureExposure}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Agency */}
        <div>
          <div style={{
            fontSize: '0.58rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em', marginBottom: '6px', fontWeight: 700,
          }}>
            YOUR STRATEGIC ADVANTAGE
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.75, margin: 0 }}>
            {framing.agency}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: '20px', paddingTop: '14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.62rem', color: 'var(--text-3)', lineHeight: 1.5,
      }}>
        This assessment reflects probabilistic structural trends based on AI capability research and industry adoption data. It separates current observable risk (today's AI tools) from future structural exposure (agentic AI threshold scenarios). Neither outcome is guaranteed — decisions remain yours to make with full information.
      </div>
    </div>
  );
};
