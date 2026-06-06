// ConfidenceDisclosure.tsx — P2 of the platform transformation ("progressive honesty")
//
// PROBLEM
// HumanProof's epistemic honesty is best-in-class, but on the first (most
// emotionally vulnerable) screen it was rendered as a STACK of separate caveat
// cards — confidence %, provenance label, low-data warning, signal-conflict
// alert, hard-failure alert, heuristic/stale freshness note, calibration note.
// For a frightened 11pm user, a wall of caveats reads as "this tool doesn't
// actually know" and erodes the very decision-confidence the reassurance line
// just built.
//
// SOLUTION
// One collapsible block that LEADS with a confident, plain-language one-liner
// (visible even when collapsed) and tucks the honest details one tap away.
// Severity-aware: opens by default only when something material is off
// (hard source failure or a fully heuristic baseline). Otherwise the user sees
// a calm "Strong read" line and can choose to look deeper.
//
// This does not hide anything — every caveat that previously rendered still
// renders, inside the disclosure. It just stops the honesty from shouting over
// the read at the worst possible moment.
//
// Pure presentational. SSR-safe. No data fetching, no Date.now.

import React from 'react';
import { AlertTriangle, Info, Clock, ShieldCheck, Gauge } from 'lucide-react';
import AdaptiveBlock from './AdaptiveBlock';

export interface ConfidenceDisclosureProps {
  /** Canonical confidence 0–100. */
  confPct: number;
  /** Canonical user-facing label (e.g. "High", "Developing") + color. */
  confidenceLabel: string;
  confidenceColor: string;
  /** Canonical primary source string (e.g. "live signals", "cached baseline"). */
  primarySource?: string;
  /** Calibration mode from modelCalibration.calibrationMode. */
  calibrationMode?: string;
  /** Low-data warning, if the pipeline capped confidence for missing signals. */
  lowDataWarning?: { code?: string; missingCount: number; capAt: number } | null;
  /** Count of conflicting signals (score widened). */
  conflictCount?: number;
  /** Hard live-source failures (some signals fell back to estimates). */
  hardFailures?: string[];
  /** Unified freshness tier: 'live' | 'mixed' | 'stale' | 'heuristic'. */
  freshnessTier?: string;
  /** Calibration-limited segment reason, if any. */
  calibrationLimitationReason?: string | null;
}

const ACCENT = '#22d3ee';

/** Humanised provenance copy — written for a scared user, not a reviewer. */
function provenanceLine(calibrationMode?: string): string {
  switch (calibrationMode) {
    case 'live_empirical':
      return 'This is based on 200+ real layoffs we studied.';
    case 'live_developing':
      return 'We\'re learning from real outcomes — accuracy improves over time.';
    default:
      return 'We\'re being cautious with estimates until we have more real data to learn from.';
  }
}

interface CaveatItem {
  icon: React.ElementType;
  color: string;
  text: string;
}

export const ConfidenceDisclosure: React.FC<ConfidenceDisclosureProps> = ({
  confPct,
  confidenceLabel,
  confidenceColor,
  primarySource,
  calibrationMode,
  lowDataWarning,
  conflictCount = 0,
  hardFailures = [],
  freshnessTier,
  calibrationLimitationReason,
}) => {
  // Build the honest caveat list (everything that used to be a separate card).
  const caveats: CaveatItem[] = [];

  if (freshnessTier === 'heuristic') {
    caveats.push({
      icon: AlertTriangle,
      color: '#f59e0b',
      text: 'No live company data this time — we used typical patterns for your industry.',
    });
  } else if (freshnessTier === 'stale') {
    caveats.push({
      icon: Clock,
      color: 'rgba(255,255,255,0.55)',
      text: 'Some data is recent, some is from our last check. Both are factored in.',
    });
  }

  if (lowDataWarning) {
    caveats.push({
      icon: Info,
      color: '#f59e0b',
      text: `${lowDataWarning.missingCount} important signal${lowDataWarning.missingCount > 1 ? 's' : ''} couldn't be confirmed — so we're capping our confidence at ${Math.round(lowDataWarning.capAt * 100)}% until we can.`,
    });
  }

  if (conflictCount > 0) {
    caveats.push({
      icon: AlertTriangle,
      color: '#f97316',
      text: `${conflictCount} signal${conflictCount > 1 ? 's' : ''} pointed in different directions — we widened the estimate rather than guess.`,
    });
  }

  if (hardFailures.length > 0) {
    for (const f of hardFailures) {
      caveats.push({ icon: AlertTriangle, color: '#dc2626', text: f });
    }
  }

  if (calibrationLimitationReason) {
    caveats.push({ icon: Info, color: '#f59e0b', text: calibrationLimitationReason });
  }

  const severe = hardFailures.length > 0 || freshnessTier === 'heuristic';
  const caveatCount = caveats.length;

  // Confident lead line — what the user sees WITHOUT expanding.
  const leadLine: string = caveatCount === 0
    ? `${confidenceLabel} read · ${confPct}%${primarySource ? ` · ${primarySource}` : ''}`
    : `${confidenceLabel} read · ${confPct}% · ${caveatCount} thing${caveatCount > 1 ? 's' : ''} worth knowing`;

  return (
    <AdaptiveBlock
      title="How sure are we about this score?"
      subtitle={leadLine}
      icon={severe ? Gauge : ShieldCheck}
      accentColor={severe ? '#f59e0b' : ACCENT}
      defaultOpen={severe}
      badge={`${confPct}%`}
      badgeColor={confidenceColor}
    >
      {/* Plain-language provenance — leads the expanded content on a calm note. */}
      <p className="text-[11.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
        {provenanceLine(calibrationMode)}
      </p>

      {caveats.length > 0 && (
        <div className="space-y-2 pt-1">
          {caveats.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}22` }}
            >
              <c.icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: c.color }} />
              <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.72)' }}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {caveats.length === 0 && (
        <p className="text-[11px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Everything checked out — signals were consistent and data was fresh.
        </p>
      )}
    </AdaptiveBlock>
  );
};

export default ConfidenceDisclosure;
