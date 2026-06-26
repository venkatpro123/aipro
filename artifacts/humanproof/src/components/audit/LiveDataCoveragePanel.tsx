// LiveDataCoveragePanel.tsx
// Detailed per-signal source attribution panel for the Transparency tab.
// Shows each intelligence signal's origin (live API / DB cache / static hardcode),
// age, and tier so users understand exactly how the audit score was built.

import React from 'react';
import { motion } from 'framer-motion';
import type { LiveDataCoverage } from './LiveSignalStatusBanner';

interface SignalRow {
  key:        string;
  label:      string;
  source:     'live' | 'db' | 'static' | 'degraded';
  sourceName: string;
  ageDays?:   number;
}

interface Props {
  coverage:         LiveDataCoverage | null | undefined;
  freshnessScore?:  number | null;
  companyName?:     string;
}

const SIGNAL_LABELS: Record<string, string> = {
  stock90DayChange:    'Stock Price (90-day)',
  revenueGrowthYoY:    'Revenue Growth (YoY)',
  employeeCount:       'Employee Headcount',
  layoffsLast24Months: 'Layoff History',
  layoffRounds:        'Layoff Round Count',
  hiringTrend:         'Hiring Activity',
  revenuePerEmployee:  'Revenue per Employee',
};

const SOURCE_CONFIG: Record<SignalRow['source'], { color: string; label: string; bg: string }> = {
  live:     { color: 'var(--color-cyan-text)', label: 'LIVE',     bg: 'rgba(34,211,238,0.08)' },
  db:       { color: 'var(--color-indigo-text)', label: 'DATABASE', bg: 'rgba(129,140,248,0.08)' },
  static:   { color: '#f97316', label: 'STATIC',   bg: 'rgba(249,115,22,0.08)' },
  degraded: { color: '#f59e0b', label: 'DEGRADED', bg: 'rgba(245,158,11,0.08)' },
};

function buildRows(coverage: LiveDataCoverage | null | undefined): SignalRow[] {
  if (!coverage) return [];
  const rows: SignalRow[] = [];

  const liveSet = new Set(coverage.liveWonKeys);
  const dbSet   = new Set(coverage.dbWonKeys);
  const degraded = new Set(coverage.degradedSignalClasses);

  for (const [key, label] of Object.entries(SIGNAL_LABELS)) {
    let source: SignalRow['source'] = 'static';
    let sourceName = 'Pre-seeded / hardcoded';

    if (liveSet.has(key)) {
      source = 'live';
      sourceName = 'Live API (this session)';
    } else if (dbSet.has(key)) {
      const isFinancialDegraded = degraded.has('financial') && (key === 'stock90DayChange' || key === 'revenueGrowthYoY');
      const isLayoffDegraded    = degraded.has('layoffs') && key.startsWith('layoff');
      source = (isFinancialDegraded || isLayoffDegraded) ? 'degraded' : 'db';
      sourceName = source === 'degraded' ? 'Database (stale / degraded)' : 'Database cache';
    }

    rows.push({ key, label, source, sourceName });
  }

  return rows;
}

export const LiveDataCoveragePanel: React.FC<Props> = ({ coverage, freshnessScore, companyName }) => {
  const rows    = buildRows(coverage);
  const liveCount   = rows.filter(r => r.source === 'live').length;
  const totalCount  = rows.length;
  const pct         = totalCount > 0 ? Math.round((liveCount / totalCount) * 100) : 0;
  const displayPct  = freshnessScore != null ? Math.round(freshnessScore * 100) : pct;

  const overallSource = coverage?.overallSource ?? 'unknown';
  const fetchedAt     = coverage?.fetchedAt;
  const ageMin        = fetchedAt ? Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60_000) : null;

  return (
    <div style={{
      borderRadius: '14px',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '20px',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
            Intelligence Signal Sources
          </div>
          {companyName && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {companyName} · scraped {ageMin !== null ? (ageMin < 1 ? 'just now' : `${ageMin}m ago`) : 'unknown'}
            </div>
          )}
        </div>
        {/* Coverage dial */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.4rem',
            color: displayPct >= 70 ? '#22d3ee' : displayPct >= 40 ? '#f59e0b' : '#ef4444',
          }}>
            {displayPct}%
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            live coverage
          </div>
        </div>
      </div>

      {/* Coverage bar */}
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--alpha-bg-06)', marginBottom: '16px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${displayPct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: '3px',
            background: displayPct >= 70 ? 'linear-gradient(90deg, #22d3ee, #6366f1)'
              : displayPct >= 40 ? 'linear-gradient(90deg, #f59e0b, #f97316)'
              : 'linear-gradient(90deg, #ef4444, #f97316)',
          }}
        />
      </div>

      {/* Signal rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {rows.map((row, i) => {
          const cfg = SOURCE_CONFIG[row.source];
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', borderRadius: '8px',
                background: cfg.bg,
                border: `1px solid ${cfg.color}20`,
              }}
            >
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text)' }}>
                {row.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 800,
                  letterSpacing: '0.06em', color: cfg.color,
                  padding: '1px 5px', borderRadius: '3px',
                  background: `${cfg.color}15`,
                }}>
                  {cfg.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-secondary)' }}>
                  {row.sourceName}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '14px', padding: '10px 12px',
        borderRadius: '8px', background: 'var(--alpha-bg-04)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--color-cyan-text)' }}>●</span> Live = scraped from external APIs this session
          {'  '}
          <span style={{ color: 'var(--color-indigo-text)' }}>●</span> Database = Supabase company_intelligence row
          {'  '}
          <span style={{ color: '#f97316' }}>●</span> Static = hardcoded baseline (pre-seeded)
        </div>
        {overallSource === 'heuristic' && (
          <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#f59e0b' }}>
            ⚠ Score calculated with fewer than 2 live API signals — treat as indicative.
            Live retry will run automatically.
          </div>
        )}
        {(coverage?.hardFailures?.length ?? 0) > 0 && (
          <div style={{ marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#ef4444' }}>
            API failures: {coverage?.hardFailures?.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};
