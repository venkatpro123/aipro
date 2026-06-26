// ProvenanceLabel.tsx
//
// The MEASURED / MODELED / ESTIMATED contract, made visible.
//
// Every number HumanProof surfaces must trace to a real data source or carry
// one of these three labels. This component makes that contract legible to
// the user without cluttering the UI.
//
// Vocabulary:
//   MEASURED  — directly observed from a live or verified source
//               (stock price from Yahoo, headcount from SEC 10-K, WARN filing)
//   MODELED   — computed by our scoring formula from measured inputs
//               (the layoff risk score, L1–L5 dimensions, confidence interval)
//   ESTIMATED — sector/cohort baseline, not company-specific observation
//               (AI displacement % from roleIntelligence, heuristic industry risk,
//                uncalibrated placeholder constants, developer-estimated transition times)
//
// Usage:
//   <ProvenanceLabel kind="modeled" />                     — inline chip
//   <ProvenanceLabel kind="estimated" tooltip="..." />     — with hover context
//   <ProvenanceLabel kind="measured" source="Yahoo Finance" /> — with source name

import React from 'react';
import { getValueProvenance } from '../../../services/valueProvenance';

export type ProvenanceKind = 'measured' | 'modeled' | 'estimated';

// Maps internal signal provenance strings to user-facing kind.
// Call this at the boundary where you have `sourceKind` from the pipeline.
export function provenanceKindFromSource(
  sourceKind: 'live' | 'db' | 'heuristic' | 'user_input' | 'modeled' | 'calibrated' | string | undefined,
): ProvenanceKind {
  switch (sourceKind) {
    case 'live':
    case 'db':
    case 'user_input':
      return 'measured';
    case 'modeled':
    case 'calibrated':
      return 'modeled';
    case 'heuristic':
    default:
      return 'estimated';
  }
}

const CONFIG: Record<ProvenanceKind, {
  label: string;
  color: string;
  bg: string;
  border: string;
  title: string;
}> = {
  measured: {
    label: 'MEASURED',
    color: 'var(--color-emerald-text)',
    bg: 'rgba(52,211,153,0.10)',
    border: 'rgba(52,211,153,0.28)',
    title: 'Directly observed from a live or verified source (stock price, SEC filing, WARN notice, etc.)',
  },
  modeled: {
    label: 'MODELED',
    color: 'var(--color-blue400-text)',
    bg: 'rgba(96,165,250,0.10)',
    border: 'rgba(96,165,250,0.25)',
    title: 'Computed by HumanProof\'s scoring formula from measured inputs. The model has been calibrated against historical outcomes.',
  },
  estimated: {
    label: 'ESTIMATED',
    color: 'var(--color-amber-text)',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.28)',
    title: 'Sector or cohort baseline — not a live observation for this specific company or role. Treat with appropriate uncertainty.',
  },
};

interface Props {
  /**
   * Explicit provenance kind. Pass either `kind` directly OR `field` (auto-derived
   * via getValueProvenance). Passing both: `kind` wins.
   */
  kind?: ProvenanceKind;
  /**
   * Stable field identifier (e.g. 'stock_90d_change', 'preparedness_overall').
   * When provided, calls getValueProvenance(field, sourceKey) to derive kind +
   * sourceLabel. This is the preferred API — no per-component decision needed.
   */
  field?: string;
  /**
   * Source string passed to getValueProvenance for source-aware kind resolution
   * (e.g. a stock price is MEASURED from alpha-vantage but ESTIMATED from heuristic).
   */
  sourceKey?: string | null;
  /** Display label for the source — shown in tooltip. */
  source?: string;
  tooltip?: string;
  size?: 'xs' | 'sm';
  className?: string;
}

const ProvenanceLabel: React.FC<Props> = ({
  kind: explicitKind,
  field,
  sourceKey,
  source,
  tooltip,
  size = 'xs',
  className = '',
}) => {
  // Lazy import avoids circular dep: valueProvenance imports the ProvenanceKind type.
  // Resolving kind from field, when explicit kind not provided.
  let resolvedKind: ProvenanceKind = explicitKind ?? 'estimated';
  let resolvedSource: string | undefined = source;

  if (!explicitKind && field) {
    const p = getValueProvenance(field, sourceKey ?? undefined);
    resolvedKind = p.kind;
    resolvedSource = source ?? p.sourceLabel;
  }

  const cfg = CONFIG[resolvedKind];
  const title = tooltip ?? (resolvedSource ? `${cfg.title} — Source: ${resolvedSource}` : cfg.title);
  const fontSize = size === 'xs' ? '8px' : '9px';
  const px = size === 'xs' ? '5px' : '6px';
  const py = size === 'xs' ? '1px' : '2px';

  return (
    <span
      title={title}
      aria-label={`Data provenance: ${cfg.label}${source ? `, source: ${source}` : ''}`}
      className={`inline-flex items-center gap-1 rounded font-mono font-bold cursor-help select-none ${className}`}
      style={{
        fontSize,
        paddingLeft: px,
        paddingRight: px,
        paddingTop: py,
        paddingBottom: py,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        letterSpacing: '0.06em',
        verticalAlign: 'middle',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
      {/* "?" cue — makes the tooltip discoverable (users see ? and know to hover) */}
      <span style={{ fontSize: '0.6em', opacity: 0.55, fontWeight: 400, letterSpacing: 0, fontFamily: 'system-ui' }} aria-hidden="true">
        ?
      </span>
    </span>
  );
};

export default ProvenanceLabel;
