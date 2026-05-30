// PatternMatchCard.tsx
// Intelligence Upgrade 2 — v7.0
//
// Renders a verified historical precedent card.
// Data comes entirely from HISTORICAL_PATTERNS database — never LLM prose.
//
// Design contract:
//   - Shows patternName, summary, historical companies, outcome timeline, and
//     recommended response. Nothing is AI-generated at render time.
//   - The "source quality" note is always visible so users know this is backed data.
//   - The overlap score is shown as a meter so users can judge match strength.

import React, { useState } from 'react';
import type { HistoricalPattern } from '../data/historicalPatterns';

interface PatternMatchCardProps {
  pattern: HistoricalPattern;
  overlapScore?: number;  // 0-1, optional — shown as a confidence meter
  /** The user's region — used to frame offshoring patterns for the right audience. */
  userRegion?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  india_it_automation:    'India IT / Automation',
  big_tech_efficiency:    'Big Tech Efficiency',
  saas_startup_contraction: 'SaaS / Startup',
  role_ai_displacement:   'Role AI Displacement',
  sector_wave:            'Sector Wave',
  company_lifecycle:      'Company Lifecycle',
};

const REGION_FLAG: Record<string, string> = {
  India: '🇮🇳',
  US:    '🇺🇸',
  Global: '🌐',
};

export const PatternMatchCard: React.FC<PatternMatchCardProps> = ({ pattern, overlapScore, userRegion }) => {
  const [expanded, setExpanded] = useState(false);

  // Audience reframe — some patterns (e.g. US→India GCC offshoring) carry an
  // opportunity framing for one region that reads as irrelevant or misleading to
  // a user elsewhere. Reframe the takeaway for the actual reader so a US user
  // sees the threat side, not "opportunity for India-based professionals."
  const offshorePattern = pattern.category === 'india_it_automation'
    && /offshore|gcc|pivot|global capabilit/i.test(`${pattern.patternName} ${pattern.summary}`);
  const regionStr = (userRegion ?? '').toLowerCase();
  const userInIndia = regionStr.includes('india') || regionStr === 'in';
  const audienceReframe = offshorePattern
    ? (userInIndia
        ? 'You sit on the receiving side of this shift — India GCC headcount is growing. Position for in-demand GCC openings while the build-out continues.'
        : `${userRegion ? `As a ${userRegion}-based professional, you` : 'If you are based outside India, you'} sit on the exposed side of this shift — these are the roles being relocated offshore. Treat the documented cases as your early-warning timeline and start a parallel search now.`)
    : null;
  const pctMatch = overlapScore != null ? Math.round(overlapScore * 100) : null;
  const matchColor = pctMatch != null
    ? pctMatch >= 75 ? 'var(--emerald)'
    : pctMatch >= 50 ? 'var(--amber)'
    : 'var(--text-3)'
    : 'var(--cyan)';

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${matchColor}`,
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category pill + match meter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em',
              textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
              background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-3)',
            }}>
              {CATEGORY_LABELS[pattern.category] ?? pattern.category}
            </span>
            {pctMatch != null && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                background: `${matchColor}15`, border: `1px solid ${matchColor}30`,
                color: matchColor,
              }}>
                {pctMatch}% signal match
              </span>
            )}
            <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              Verified pattern
            </span>
          </div>

          <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3 }}>
            {pattern.patternName}
          </h4>
          <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
            {pattern.summary}
          </p>
        </div>
      </div>

      {/* Historical companies — always visible */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5 }}>
          Documented Cases
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {pattern.historicalCompanies.slice(0, expanded ? undefined : 2).map((co, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'var(--bg)', borderRadius: 6, padding: '6px 10px',
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-2)', whiteSpace: 'nowrap', minWidth: 90 }}>
                {REGION_FLAG[co.region] ?? ''} {co.name} ({co.year})
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.4 }}>
                {co.outcome}
                {co.signalLagMonths > 0 && (
                  <span style={{ color: 'var(--amber)', marginLeft: 4, fontWeight: 700 }}>
                    · {co.signalLagMonths}mo signal lag
                  </span>
                )}
              </span>
            </div>
          ))}
          {!expanded && pattern.historicalCompanies.length > 2 && (
            <button
              onClick={() => setExpanded(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--cyan)', textAlign: 'left', padding: '2px 0', fontFamily: 'inherit' }}
            >
              +{pattern.historicalCompanies.length - 2} more cases →
            </button>
          )}
        </div>
      </div>

      {/* Outcome timeline */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5 }}>
          Outcome Timeline
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { label: 'Typical',   value: pattern.outcomeTimeline.typical,    color: 'var(--amber)' },
            { label: 'Best case', value: pattern.outcomeTimeline.best_case,  color: 'var(--emerald)' },
            { label: 'Worst case',value: pattern.outcomeTimeline.worst_case, color: 'var(--red)' },
          ].map(t => (
            <div key={t.label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ fontSize: '0.58rem', fontWeight: 700, color: t.color, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended response — expandable */}
      {expanded && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5 }}>
              What Worked For People In This Situation
            </div>
            {[
              { label: 'This week',  value: pattern.recommendedResponse.immediate,    color: 'var(--cyan)' },
              { label: '1–3 months', value: pattern.recommendedResponse.short_term,   color: 'var(--amber)' },
              { label: '3–12 months',value: pattern.recommendedResponse.medium_term,  color: 'var(--text-2)' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: r.color, marginRight: 6 }}>{r.label}:</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Roles affected / protected */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--red)', marginBottom: 3 }}>Most Affected</div>
              {pattern.affectedRoles.slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-2)', lineHeight: 1.4 }}>· {r}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--emerald)', marginBottom: 3 }}>Protected / Growing</div>
              {pattern.protectedRoles.slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-2)', lineHeight: 1.4 }}>· {r}</div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Expand / collapse toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.68rem', color: 'var(--cyan)', padding: '2px 0',
          fontFamily: 'inherit', fontWeight: 600,
        }}
      >
        {expanded ? '↑ Show less' : '↓ See response strategy + role impact'}
      </button>

      {/* Audience reframe — interprets the pattern for THIS reader's region */}
      {audienceReframe && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: userInIndia ? 'rgba(16,185,129,0.07)' : 'rgba(249,115,22,0.07)',
            border: `1px solid ${userInIndia ? 'rgba(16,185,129,0.22)' : 'rgba(249,115,22,0.22)'}`,
          }}
        >
          <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: userInIndia ? 'var(--emerald)' : 'var(--orange)', marginBottom: 3 }}>
            What this means for you
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{audienceReframe}</div>
        </div>
      )}

      {/* Evidence note — always visible */}
      <div style={{ marginTop: 8, fontSize: '0.6rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: 6, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 700 }}>Evidence: </span>{pattern.evidenceNote}
      </div>
    </div>
  );
};
