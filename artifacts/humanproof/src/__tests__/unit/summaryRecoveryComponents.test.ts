// summaryRecoveryComponents.test.ts — P2–P5 platform-transformation surfaces
//
// Render tests (renderToStaticMarkup — deterministic, no @testing-library) for
// the four new emotional-journey components:
//   • ConfidenceDisclosure   — progressive honesty (P2)
//   • ProgressNarrativeCard   — recovery loop / "since last visit" (P3/P8)
//   • SharpenScorePrompt      — cold-start capture as opportunity (P4/P9)
//   • StrategySpineCard       — single strategy voice (P5/P10)
//
// We assert on always-rendered content. AdaptiveBlock renders its body only when
// open, so for ConfidenceDisclosure we assert the header lead-line (always
// visible) and — when severe — the expanded caveats.

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfidenceDisclosure } from '../../components/AuditTabs/common/ConfidenceDisclosure';
import { ProgressNarrativeCard } from '../../components/AuditTabs/common/ProgressNarrativeCard';
import { SharpenScorePrompt } from '../../components/AuditTabs/common/SharpenScorePrompt';
import { StrategySpineCard } from '../../components/AuditTabs/common/StrategySpineCard';
import type { StrategySynthesisResult } from '../../services/strategySynthesisEngine';

const render = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('ConfidenceDisclosure (progressive honesty)', () => {
  it('leads with a confident, caveat-free line when nothing is off', () => {
    const html = render(
      React.createElement(ConfidenceDisclosure, {
        confPct: 82,
        confidenceLabel: 'High',
        confidenceColor: '#10b981',
        primarySource: 'live signals',
        calibrationMode: 'live_empirical',
        freshnessTier: 'live',
      }),
    );
    expect(html).toContain('How confident is this read?');
    expect(html).toContain('High read');
    expect(html).toContain('82%');
    // Calm, no "things worth knowing" pluralised caveat count.
    expect(html).not.toContain('worth knowing');
  });

  it('counts caveats in the lead line and opens (severe) on a hard failure', () => {
    const html = render(
      React.createElement(ConfidenceDisclosure, {
        confPct: 44,
        confidenceLabel: 'Developing',
        confidenceColor: '#f59e0b',
        primarySource: 'cached baseline',
        calibrationMode: 'bootstrap',
        hardFailures: ['Live stock feed unavailable — using last close'],
        freshnessTier: 'heuristic',
      }),
    );
    expect(html).toContain('worth knowing');
    // Severe → AdaptiveBlock defaultOpen → caveat body present in static markup.
    expect(html).toContain('Live stock feed unavailable');
    expect(html).toContain('historical sector averages');
  });
});

describe('ProgressNarrativeCard (recovery loop)', () => {
  it('renders nothing for a brand-new audit (no movement, no streak)', () => {
    const html = render(
      React.createElement(ProgressNarrativeCard, {
        scoreDelta: { delta30d: 0, direction: 'stable' },
        streakInfo: { currentStreak: 0, totalWeeksActive: 0, isAtRisk: false },
      }),
    );
    expect(html).toBe('');
  });

  it('celebrates an improving score as the work paying off', () => {
    const html = render(
      React.createElement(ProgressNarrativeCard, {
        scoreDelta: { delta30d: -6, direction: 'improving' },
        streakInfo: { currentStreak: 3, totalWeeksActive: 3, isAtRisk: false },
      }),
    );
    expect(html).toContain('Since your last visit');
    expect(html).toContain('down 6 pts');
    expect(html).toContain('work paying off');
    expect(html).toContain('3-week action streak');
  });

  it('reframes a worsening score as caught early', () => {
    const html = render(
      React.createElement(ProgressNarrativeCard, {
        scoreDelta: { delta30d: 4, direction: 'worsening' },
        streakInfo: { currentStreak: 1, totalWeeksActive: 2, isAtRisk: true },
      }),
    );
    expect(html).toContain('ticked up 4 pts');
    expect(html).toContain('Catching it early');
    // At-risk nudge present when streak >= 1 and isAtRisk.
    expect(html).toContain('keep your streak alive');
  });
});

describe('SharpenScorePrompt (cold-start as opportunity)', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom */ }
  });

  it('frames the missing profile as upside, not a deficiency', () => {
    const html = render(React.createElement(SharpenScorePrompt));
    expect(html).toContain('Make this your score');
    expect(html).toContain('±8–25 pts');
    expect(html).toContain('Sharpen my score');
  });

  it('renders nothing once quick-capture was completed within the TTL', () => {
    try {
      localStorage.setItem('hp.quickCapture.done', JSON.stringify({ ts: Date.now() }));
    } catch { /* jsdom */ }
    const html = render(React.createElement(SharpenScorePrompt));
    expect(html).toBe('');
  });
});

describe('StrategySpineCard (single strategy voice)', () => {
  function mkStrategy(overrides: Partial<StrategySynthesisResult> = {}): StrategySynthesisResult {
    return {
      overallStrategy: 'ACCELERATE_EXIT',
      strategyRationale: 'Risk is rising faster than your runway can absorb.',
      urgencyLevel: 'HIGH',
      phases: [],
      topPriorityAction: {
        id: 'p1',
        phase: 'PHASE_1_IMMEDIATE',
        title: 'Open 3 active conversations this week',
        description: 'd',
        rationale: 'Pipeline now beats a polished resume later.',
        roiScore: 88,
        timeHorizon: 'this week',
        sourceLayer: 'L1',
        isUrgent: true,
      },
      singleBiggestRisk: 'Waiting for certainty that will not arrive in time.',
      singleBiggestOpportunity: 'Your skills are in active demand in two adjacent sectors.',
      estimatedSafetyWindowDays: 45,
      competitivePositionStatement: 'You are ahead of 70% of peers in the same role.',
      psychologicalNegotiationTactics: [],
      promotionTimingNote: null,
      calibrationStatus: 'synthesis_v50',
      ...overrides,
    } as StrategySynthesisResult;
  }

  it('renders nothing when synthesis is absent', () => {
    const html = render(React.createElement(StrategySpineCard, { strategy: null }));
    expect(html).toBe('');
  });

  it('states the posture, the one move, and unifies window/risk/opportunity', () => {
    const html = render(React.createElement(StrategySpineCard, { strategy: mkStrategy() }));
    expect(html).toContain('Recommended Plan');
    expect(html).toContain('Start job hunting now');
    expect(html).toContain('Risk is rising faster');
    // The single first move.
    expect(html).toContain('Open 3 active conversations this week');
    // Unified beat — time-to-safety + risk + opportunity + standing.
    expect(html).toContain('weeks before things may change');
    expect(html).toContain('Waiting for certainty');
    expect(html).toContain('active demand in two adjacent sectors');
    expect(html).toContain('ahead of 70% of peers');
  });

  it('maps urgency to a human directive', () => {
    const html = render(
      React.createElement(StrategySpineCard, { strategy: mkStrategy({ urgencyLevel: 'CRITICAL' }) }),
    );
    expect(html).toContain('Act this week');
  });
});
