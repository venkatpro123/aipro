// ProvenancePopover.tsx
// Info icon button + Radix Popover showing the full provenance chain for a
// single risk dimension. Placed inline next to each dimension score in
// RiskBreakdownTab so users can inspect sub-signals without switching tabs.
//
// LAYOUT (inside the popover)
// ─────────────────────────────────────────────────────────────────────────
//  L1 · Company Financial Vulnerability        Score 68/100 · w=30%
//  ─────────────────────────────────────────────────────────────────────
//  COMPUTED FROM
//
//  Stock 90-Day Change        −14%
//  ● LIVE  Alpha Vantage  ·  3h ago
//
//  Revenue Growth YoY         −2%
//  ● LIVE  BSE filing  ·  12 days ago
//
//  Revenue per Employee       $180K
//  ○ DB  Supabase DB  ·  45 days ago
//  ─────────────────────────────────────────────────────────────────────
//  2 of 5 sub-signals are live
//  Calibrated weighted avg of stock trend, revenue growth, ...

import React from 'react';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import type { DimensionProvenanceData } from '../services/dimensionProvenance';

// ── Score colour (mirrors RiskBreakdownTab logic) ──────────────────────────

const scoreColor = (s: number) => {
  if (s < 30) return 'var(--emerald)';
  if (s < 45) return 'var(--green)';
  if (s < 60) return 'var(--amber)';
  if (s < 75) return 'var(--orange)';
  return 'var(--red)';
};

// ── Source badge ────────────────────────────────────────────────────────────

const SourceBadge: React.FC<{ isLive: boolean; isMissing: boolean }> = ({
  isLive,
  isMissing,
}) => {
  if (isMissing) {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--amber)', opacity: 0.8,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--amber)', display: 'inline-block' }} />
        MISSING
      </span>
    );
  }
  if (isLive) {
    return (
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--emerald)',
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--emerald)', display: 'inline-block' }} />
        LIVE
      </span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-3)',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--text-3)', display: 'inline-block' }} />
      DB
    </span>
  );
};

// ── Sub-signal row ──────────────────────────────────────────────────────────

const SubSignalRow: React.FC<{ sig: DimensionProvenanceData['subSignals'][0] }> = ({ sig }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
    {/* Top line: name + value */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span
        style={{
          fontSize: 11, fontWeight: 600,
          color: sig.isMissing ? 'var(--text-3)' : 'var(--text)',
        }}
      >
        {sig.displayName}
      </span>
      <span
        style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
          color: sig.isMissing ? 'var(--text-3)' : 'var(--text)',
          marginLeft: 8,
        }}
      >
        {sig.value}
      </span>
    </div>
    {/* Bottom line: badge + source + age */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <SourceBadge isLive={sig.isLive} isMissing={sig.isMissing} />
      <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        {sig.source}
      </span>
      <span style={{ fontSize: 9, color: 'var(--text-3)', opacity: 0.6 }}>·</span>
      <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
        {sig.ageLabel}
      </span>
    </div>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────

interface ProvenancePopoverProps {
  provenance: DimensionProvenanceData;
  /** Full label string e.g. "Company Financial Vulnerability" */
  fullLabel: string;
}

export const ProvenancePopover: React.FC<ProvenancePopoverProps> = ({
  provenance,
  fullLabel,
}) => {
  const color = scoreColor(provenance.score);
  const { subSignals, liveCount, formulaNote } = provenance;
  const totalCount = subSignals.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={`View provenance for ${fullLabel}`}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 0, color: 'var(--text-3)',
            transition: 'color 150ms, background 150ms',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--cyan)';
            (e.currentTarget as HTMLElement).style.background = 'var(--cyan-5)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <Info style={{ width: 11, height: 11 }} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        style={{ width: 320, padding: 0, overflow: 'hidden' }}
        className="glass-panel"
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 14px 8px',
            borderBottom: '1px solid var(--border)',
            background: `${color}08`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <span
              style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.15em',
                color, padding: '1px 6px', borderRadius: 3,
                background: `${color}18`,
              }}
            >
              {provenance.dimKey}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              w = {provenance.weightLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'var(--font-mono)' }}>
              {provenance.score}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>/100</span>
            <span style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 4, fontWeight: 600 }}>
              {fullLabel}
            </span>
          </div>
        </div>

        {/* Sub-signals */}
        <div style={{ padding: '10px 14px 0' }}>
          <div
            style={{
              fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.18em',
              color: 'var(--text-3)', marginBottom: 10,
            }}
          >
            Computed from
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subSignals.map(sig => (
              <SubSignalRow key={sig.id} sig={sig} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 14px 10px',
            borderTop: '1px solid var(--border)',
            marginTop: 8,
          }}
        >
          {/* Live signal count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10, fontWeight: 700,
                color: liveCount > 0 ? 'var(--emerald)' : 'var(--text-3)',
              }}
            >
              {liveCount} of {totalCount} sub-signal{totalCount !== 1 ? 's' : ''} are live
            </span>
          </div>
          {/* Formula note */}
          <p
            style={{
              fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5, margin: 0,
            }}
          >
            {formulaNote}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
