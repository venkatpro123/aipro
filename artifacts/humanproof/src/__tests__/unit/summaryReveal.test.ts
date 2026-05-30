// summaryReveal.test.ts — orchestrator-gated Summary disclosure classifier
//
// Pure, render-free unit tests for classifySummaryReveal. The classifier decides,
// for each supporting *evidence* block on the Summary tab, whether it renders
// inline (material now), folds into the single "Full breakdown" disclosure, or is
// hidden entirely. We assert the buckets directly — no React, no DOM.

import { describe, it, expect } from 'vitest';
import {
  classifySummaryReveal,
  derivePrimaryGroups,
  type SummaryRevealFacts,
} from '../../components/AuditTabs/v3/summaryReveal';
import type { OrchestratedFeed, RankedSignal } from '../../services/orchestration/signalOrchestrator';
import type { SignalGroup } from '../../components/AuditTabs/v3/summaryReveal';

// Minimal RankedSignal for a given group — only `signal.group` is read.
function rankedOfGroup(group: SignalGroup): RankedSignal {
  return {
    signal: { group } as RankedSignal['signal'],
    relevanceScore: 50,
    profileAdjustment: 0,
    adjustmentReasons: [],
  };
}

// A feed whose `primary` set carries exactly the supplied signal groups.
function feedWithPrimaryGroups(groups: SignalGroup[]): OrchestratedFeed {
  return { primary: groups.map(rankedOfGroup) } as OrchestratedFeed;
}

// Default facts: all base guards satisfied so bucket movement is driven purely
// by the orchestrator ranking + mode (override per test).
function mkFacts(overrides: Partial<SummaryRevealFacts> = {}): SummaryRevealFacts {
  return {
    mode: 'monitoring',
    score: 50,
    hasActiveWARN: false,
    personalModifierPresent: true,
    personalModifierMaterial: false,
    hasInactionConsequence: true,
    timeToSafetyEligible: true,
    ...overrides,
  };
}

describe('derivePrimaryGroups', () => {
  it('returns an empty set for an absent feed', () => {
    expect(derivePrimaryGroups(undefined).size).toBe(0);
  });

  it('collects the distinct groups present in feed.primary', () => {
    const groups = derivePrimaryGroups(feedWithPrimaryGroups(['company', 'market', 'company']));
    expect(groups.has('company')).toBe(true);
    expect(groups.has('market')).toBe(true);
    expect(groups.has('career')).toBe(false);
  });
});

describe('classifySummaryReveal — folding without orchestrator support', () => {
  it('folds every evidence block into "deep" when nothing is ranked primary', () => {
    // Empty primary set, calm (monitoring) mode, no materiality — the slimmest case.
    const cls = classifySummaryReveal(feedWithPrimaryGroups([]), mkFacts());
    expect(cls.deep.has('companyPulse')).toBe(true);
    expect(cls.deep.has('opportunity')).toBe(true);
    expect(cls.deep.has('personalRisk')).toBe(true);
    expect(cls.deep.has('timeToSafety')).toBe(true);
    expect(cls.deep.has('inactionCost')).toBe(true);
    expect(cls.deep.has('missingData')).toBe(true);
    // Nothing surfaced inline.
    expect(cls.evidenceInline.size).toBe(0);
  });

  it('handles an absent feed by treating primary groups as empty', () => {
    const cls = classifySummaryReveal(undefined, mkFacts());
    expect(cls.deep.has('companyPulse')).toBe(true);
    expect(cls.evidenceInline.size).toBe(0);
  });
});

describe('classifySummaryReveal — orchestrator-ranked → inline', () => {
  it('surfaces CompanyPulse inline when the company signal is ranked primary', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups(['company']), mkFacts());
    expect(cls.evidenceInline.has('companyPulse')).toBe(true);
    expect(cls.deep.has('companyPulse')).toBe(false);
  });

  it('surfaces Opportunity inline when market is primary and score < 75', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups(['market']), mkFacts({ score: 50 }));
    expect(cls.evidenceInline.has('opportunity')).toBe(true);
  });

  it('surfaces PersonalRisk inline when career is primary even if the delta is sub-material', () => {
    const cls = classifySummaryReveal(
      feedWithPrimaryGroups(['career']),
      mkFacts({ personalModifierMaterial: false }),
    );
    expect(cls.evidenceInline.has('personalRisk')).toBe(true);
  });
});

describe('classifySummaryReveal — materiality thresholds (independent of ranking)', () => {
  it('surfaces CompanyPulse inline on an active WARN filing', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups([]), mkFacts({ hasActiveWARN: true }));
    expect(cls.evidenceInline.has('companyPulse')).toBe(true);
  });

  it('surfaces PersonalRisk inline when the adjustment is material', () => {
    const cls = classifySummaryReveal(
      feedWithPrimaryGroups([]),
      mkFacts({ personalModifierMaterial: true }),
    );
    expect(cls.evidenceInline.has('personalRisk')).toBe(true);
  });
});

describe('classifySummaryReveal — mode gates', () => {
  it('hides Opportunity in emergency mode (no upside framing mid-crisis)', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups(['market']), mkFacts({ mode: 'emergency' }));
    expect(cls.hidden.has('opportunity')).toBe(true);
    expect(cls.evidenceInline.has('opportunity')).toBe(false);
  });

  it('hides Opportunity once the score is safe (>= 75)', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups(['market']), mkFacts({ score: 80 }));
    expect(cls.hidden.has('opportunity')).toBe(true);
  });

  it('surfaces crisis evidence inline in emergency/elevated modes', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups([]), mkFacts({ mode: 'emergency' }));
    expect(cls.evidenceInline.has('timeToSafety')).toBe(true);
    expect(cls.evidenceInline.has('inactionCost')).toBe(true);
    // CompanyPulse is also forced open in emergency.
    expect(cls.evidenceInline.has('companyPulse')).toBe(true);
  });

  it('folds crisis evidence in calm modes (monitoring/stable)', () => {
    const cls = classifySummaryReveal(feedWithPrimaryGroups([]), mkFacts({ mode: 'stable' }));
    expect(cls.deep.has('timeToSafety')).toBe(true);
    expect(cls.deep.has('inactionCost')).toBe(true);
  });
});

describe('classifySummaryReveal — base-guard suppression → hidden', () => {
  it('hides PersonalRisk when no modifier is present', () => {
    const cls = classifySummaryReveal(
      feedWithPrimaryGroups(['career']),
      mkFacts({ personalModifierPresent: false }),
    );
    expect(cls.hidden.has('personalRisk')).toBe(true);
    expect(cls.evidenceInline.has('personalRisk')).toBe(false);
    expect(cls.deep.has('personalRisk')).toBe(false);
  });

  it('hides TimeToSafety when ineligible and InactionCost when no consequence', () => {
    const cls = classifySummaryReveal(
      feedWithPrimaryGroups([]),
      mkFacts({ mode: 'emergency', timeToSafetyEligible: false, hasInactionConsequence: false }),
    );
    expect(cls.hidden.has('timeToSafety')).toBe(true);
    expect(cls.hidden.has('inactionCost')).toBe(true);
  });
});
