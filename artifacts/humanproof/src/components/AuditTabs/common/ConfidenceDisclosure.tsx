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
      return 'This read is calibrated against 200+ real layoff outcomes.';
    case 'live_developing':
      return 'Calibrated on a growing set of real outcomes — accuracy improves as more come in.';
    default:
      return 'We lean on cautious estimates while real outcomes accumulate — deliberately conservative, not alarmist.';
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
      text: 'No live data this run — the analysis draws on historical sector averages.',
    });
  } else if (freshnessTier === 'stale') {
    caveats.push({
      icon: Clock,
      color: 'rgba(255,255,255,0.55)',
      text: 'Some signals are cached — the read uses live data supplemented by recent baselines.',
    });
  }

  if (lowDataWarning) {
    caveats.push({
      icon: Info,
      color: '#f59e0b',
      text: `${lowDataWarning.missingCount} important signal${lowDataWarning.missingCount > 1 ? 's' : ''} couldn't be confirmed — the score is held to a ${Math.round(lowDataWarning.capAt * 100)}% confidence cap until they're in.`,
    });
  }

  if (conflictCount > 0) {
    caveats.push({
      icon: AlertTriangle,
      color: '#f97316',
      text: `${conflictCount} signal${conflictCount > 1 ? 's' : ''} pointed different directions — we widened the range rather than pick a side.`,
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
      title="How confident is this read?"
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
          No data-quality flags this run — live signals resolved cleanly and nothing conflicted.
        </p>
      )}
    </AdaptiveBlock>
  );
};

export default ConfidenceDisclosure;
