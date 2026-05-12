// layerNarrativeFormatter.ts — v15.0
// Replaces hardcoded D_DIMENSIONS narratives with explanations composed
// from the actual top driver signals for the user's company/role.
// Falls back to the static narrative when provenance data is unavailable.

import type { DimensionProvenanceData, SubSignalEntry } from '../services/dimensionProvenance';

export interface LayerNarrativeContext {
  dimKey: string;
  fullLabel: string;
  score: number;
  provenance: DimensionProvenanceData | null;
  fallback: string;
  /** Company name to inject into company-level layer narratives (L1, L2, D7, D8). */
  companyName?: string;
}

// Dimensions whose risk reflects company-level signals, not role-level.
const COMPANY_LEVEL_DIMS = new Set(['L1', 'L2', 'D7', 'D8']);

const DIRECTION = (score: number): 'low' | 'mid' | 'high' =>
  score < 35 ? 'low' : score < 65 ? 'mid' : 'high';

const RISK_VERB = (score: number): string =>
  score < 35 ? 'protective' : score < 65 ? 'mixed' : 'elevated';

const formatSignalValue = (sig: SubSignalEntry): string => {
  if (sig.isMissing) return 'unavailable';
  // Trim verbose values for inline use; surfaced fully in the provenance popover.
  return sig.value.length > 36 ? `${sig.value.slice(0, 33)}…` : sig.value;
};

const summariseSources = (signals: SubSignalEntry[]): string => {
  const live = signals.filter((s) => s.isLive && !s.isMissing).length;
  const total = signals.length;
  if (live === 0) return 'static-data';
  if (live === total) return 'live signals';
  return `${live}/${total} live`;
};

// Pick the top-N most informative signals: prefer live & non-missing; then
// preserve insertion order (provenance returns them in priority order).
const topSignals = (signals: SubSignalEntry[], n = 3): SubSignalEntry[] => {
  const live = signals.filter((s) => s.isLive && !s.isMissing);
  if (live.length >= n) return live.slice(0, n);
  const rest = signals.filter((s) => !s.isLive && !s.isMissing);
  return [...live, ...rest].slice(0, n);
};

export function formatLayerNarrative(ctx: LayerNarrativeContext): string {
  const { dimKey, fullLabel, score, provenance, fallback, companyName } = ctx;

  // No provenance data — fall back to the legacy static narrative so the UI
  // remains stable while the audit pipeline populates this layer.
  if (!provenance || provenance.subSignals.length === 0) return fallback;

  const dir = DIRECTION(score);
  const verb = RISK_VERB(score);
  const top = topSignals(provenance.subSignals, 3);
  const sourceMix = summariseSources(provenance.subSignals);

  if (top.length === 0) return fallback;

  // Compose: lead with the dimension verdict, then cite the top driver signals
  // verbatim so the reader can verify the explanation against the popover.
  const driverPhrases = top
    .map((s) => `${s.displayName} ${s.isMissing ? '(unavailable)' : `at ${formatSignalValue(s)}`}`)
    .join('; ');

  // Company-level layers reference the actual company name for specificity.
  const companyPrefix = COMPANY_LEVEL_DIMS.has(dimKey) && companyName
    ? `For ${companyName}: `
    : '';

  // Direction-specific framing keeps the narrative consistent with the score
  // tier without inventing facts beyond what the signals show.
  const lead = companyPrefix +
    (dir === 'high'
      ? `${fullLabel} is ${verb} (${score}/100).`
      : dir === 'mid'
        ? `${fullLabel} sits in the moderate band (${score}/100).`
        : `${fullLabel} is ${verb} (${score}/100).`);

  return `${lead} Top drivers: ${driverPhrases}. Source mix: ${sourceMix}. Dimension weight in the composite formula: ${provenance.weightLabel}.`;
}

// Convenience overload for legacy call sites that already have the score and
// a static fallback string but have not threaded provenance through yet.
export function formatLayerNarrativeOrFallback(
  dimKey: string,
  fullLabel: string,
  score: number,
  fallback: string,
  provenance: DimensionProvenanceData | null,
  companyName?: string,
): string {
  return formatLayerNarrative({ dimKey, fullLabel, score, provenance, fallback, companyName });
}
