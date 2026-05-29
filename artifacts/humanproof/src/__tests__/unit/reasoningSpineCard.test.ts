// reasoningSpineCard.test.tsx — P1
//
// Render tests for the ReasoningSpineCard (the surface for the orchestrator feed).
// We use react-dom/server renderToStaticMarkup (no @testing-library dependency,
// fully deterministic) and assert on the always-rendered content:
//   • the spine line
//   • the primary-move title + rationale
//   • the infeasibility warning when feasibleForProfile === false (and its
//     absence when feasible)
//   • graceful render when primaryMove === null
//   • the confidence badge derived from trace.confidence
//
// The collapsed reasoning-trace step bodies live inside AdaptiveBlock (which
// renders closed by default, so their text is intentionally NOT in static
// markup); the trace header + confidence badge are asserted instead.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReasoningSpineCard from '../../components/AuditTabs/common/ReasoningSpineCard';
import type { OrchestratedFeed, PrimaryMove } from '../../services/orchestration/signalOrchestrator';
import type { ActionPlanItem } from '../../types/hybridResult';

function mkAction(overrides: Partial<ActionPlanItem> = {}): ActionPlanItem {
  return {
    id: 'a1',
    title: 'Refresh your resume and reach 3 recruiters',
    description: 'desc',
    priority: 'High',
    layerFocus: 'L1',
    riskReductionPct: 12,
    deadline: '14 days',
    ...overrides,
  };
}

function mkFeed(overrides: Partial<OrchestratedFeed> = {}): OrchestratedFeed {
  const base = {
    primary: [],
    overflow: [],
    primaryMove: {
      action: mkAction(),
      rationale: 'Highest risk-reduction per hour given your timeline.',
      feasibleForProfile: true,
    } as PrimaryMove,
    spine: 'Workforce signals are softening — prepare actively. Next: refresh your resume.',
    trace: {
      observation: 'Workforce Stability: softening (headcount −6%)',
      inference: 'Hiring is contracting faster than attrition.',
      relevance: 'Your visa timeline means you cannot wait out a downturn.',
      conclusion: 'Prepare actively.',
      move: 'Refresh your resume and reach 3 recruiters.',
      confidence: 'Confidence: 72% (live)',
    },
    // The card does not read these pass-throughs — cast to keep the test focused.
    intel: {} as OrchestratedFeed['intel'],
    profileSignals: {} as OrchestratedFeed['profileSignals'],
    meta: { cap: 3, signalCount: 4, usedProfile: true },
  };
  return { ...base, ...overrides } as OrchestratedFeed;
}

describe('ReasoningSpineCard', () => {
  it('renders the spine line and the AI-voice header', () => {
    const html = renderToStaticMarkup(React.createElement(ReasoningSpineCard, { feed: mkFeed() }));
    expect(html).toContain('Workforce signals are softening');
    expect(html).toContain('AI Read');
  });

  it('renders the primary move title and rationale', () => {
    const html = renderToStaticMarkup(React.createElement(ReasoningSpineCard, { feed: mkFeed() }));
    expect(html).toContain('Refresh your resume and reach 3 recruiters');
    expect(html).toContain('Highest risk-reduction per hour');
  });

  it('shows the infeasibility warning when feasibleForProfile is false', () => {
    const feed = mkFeed({
      primaryMove: {
        action: mkAction({ title: 'Complete a 12-week certification' }),
        rationale: 'Long-term skill bet.',
        feasibleForProfile: false,
      },
    });
    const html = renderToStaticMarkup(React.createElement(ReasoningSpineCard, { feed }));
    expect(html).toContain('constrained by your situation');
  });

  it('omits the warning when the move is feasible', () => {
    const html = renderToStaticMarkup(React.createElement(ReasoningSpineCard, { feed: mkFeed() }));
    expect(html).not.toContain('constrained by your situation');
  });

  it('renders without crashing and still shows the spine when primaryMove is null', () => {
    const feed = mkFeed({ primaryMove: null });
    const html = renderToStaticMarkup(React.createElement(ReasoningSpineCard, { feed }));
    expect(html).toContain('Workforce signals are softening');
    // No move block → no warning, no move title from the default action.
    expect(html).not.toContain('constrained by your situation');
  });

  it('renders the reasoning-trace block header and a confidence badge', () => {
    const html = renderToStaticMarkup(React.createElement(ReasoningSpineCard, { feed: mkFeed() }));
    expect(html).toContain('How the AI reasoned');
    // Badge strips the "Confidence:" prefix.
    expect(html).toContain('72% (live)');
  });
});
