// PatternMatchCard.tsx — v8.0
//
// Renders a verified historical precedent card.
// Data comes entirely from HISTORICAL_PATTERNS database — never LLM prose.
//
// v8.0 improvements:
//   1. roleFit prop: renders a "Your role is AFFECTED / PROTECTED / NEUTRAL"
//      chip so the user immediately knows whether this pattern applies to them
//      specifically — not just their company.
//   2. Immediate recommended response shown ABOVE the fold (no click required).
//      The most actionable information was previously behind "See response strategy".
//   3. Audience reframe extended to all pattern categories, not just India
//      offshore patterns. Every category now reframes for the user's region
//      and role fit so the interpretation is always for THIS reader.
//   4. Affected/protected role lists always check whether the user's role
//      appears and highlight it.

import React, { useState } from 'react';
import type { HistoricalPattern } from '../data/historicalPatterns';

interface PatternMatchCardProps {
  pattern: HistoricalPattern;
  overlapScore?: number;  // 0–1, optional — shown as a confidence meter
  /** The user's region — used to frame patterns for the right audience. */
  userRegion?: string;
  /**
   * Role alignment score from the matcher:
   *   +1  = user's role is documented in pattern.affectedRoles
   *   -1  = user's role is documented in pattern.protectedRoles
   *    0  = role is neutral to this pattern
   * When undefined (older call sites) no chip is shown.
   */
  roleFit?: number;
  /** The user's exact role title — used to highlight matching rows. */
  userRoleTitle?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  india_it_automation:      'India IT / Automation',
  big_tech_efficiency:      'Big Tech Efficiency',
  saas_startup_contraction: 'SaaS / Startup',
  role_ai_displacement:     'Role AI Displacement',
  sector_wave:              'Sector Wave',
  company_lifecycle:        'Company Lifecycle',
  eu_industrial_automation: 'EU Industrial',
  uk_fintech_correction:    'UK Fintech',
  apac_tech_contraction:    'APAC Tech',
  latam_consolidation:      'LatAm',
  global_telecom_reduction: 'Global Telecom',
  apac_resource_automation: 'APAC Resources',
};

const REGION_FLAG: Record<string, string> = {
  India: '🇮🇳', US: '🇺🇸', Global: '🌐', UK: '🇬🇧',
  Germany: '🇩🇪', Singapore: '🇸🇬', Australia: '🇦🇺', Canada: '🇨🇦',
  Japan: '🇯🇵', LatAm: '🌎', UAE: '🇦🇪',
};

// ── Audience reframe per category ─────────────────────────────────────────────
// The same event looks different to a user on the disrupted side vs. the
// protected side vs. a user in a different region entirely. Each category
// gets a function that produces a contextualised interpretation for THIS reader.

function buildAudienceReframe(
  pattern: HistoricalPattern,
  userRegion: string | undefined,
  roleFit: number | undefined,
): string | null {
  const regionStr = (userRegion ?? '').toLowerCase();

  // ── Role-fit driven reframes (highest priority — most personalised) ─────────
  if (roleFit === -1) {
    // User is in the PROTECTED tier for this pattern — most docs on this card
    // describe someone else's problem. Be explicit.
    return `Your role category appears in the documented PROTECTED tier for this pattern — meaning roles like yours survived or grew through it. The pattern still signals instability at ${pattern.historicalCompanies[0]?.name ?? 'this type of company'}, but the typical mechanism described here targets a different segment of the workforce. Watch the overall company signals, but the role-specific threat is lower.`;
  }

  if (roleFit === 1) {
    const firstAffected = pattern.affectedRoles[0] ?? 'roles like yours';
    return `Your role category matches the AFFECTED tier documented in this pattern ("${firstAffected}"). The historical cases below are direct precedents for your situation. Treat the outcome timelines as your planning horizon, not background context.`;
  }

  // ── Category-specific region-aware reframes ─────────────────────────────────
  const { category } = pattern;
  const userInIndia = regionStr.includes('india') || regionStr === 'in';

  if (category === 'india_it_automation') {
    const isOffshore = /offshore|gcc|pivot|global capabilit/i.test(
      `${pattern.patternName} ${pattern.summary}`,
    );
    if (isOffshore) {
      return userInIndia
        ? 'You sit on the receiving side of this shift — India GCC headcount is growing. Position for in-demand GCC openings while the build-out continues.'
        : `${userRegion ? `As a ${userRegion}-based professional, you` : 'If you are based outside India, you'} sit on the exposed side of this shift. Treat the documented cases as your early-warning timeline and start a parallel search now.`;
    }
    if (!userInIndia && userRegion) {
      return `This pattern is India-market specific. If your company runs a significant India delivery centre, the signal still applies to headcount there — which may affect your team indirectly. If you are ${userRegion}-based with no India delivery dependency, treat this as low-relevance context.`;
    }
  }

  if (category === 'big_tech_efficiency') {
    if (!regionStr.includes('us') && !regionStr.includes('us') && userRegion && !['US', 'Global'].includes(userRegion)) {
      return `This pattern is primarily documented at US-HQ Big Tech companies (FAANG / Meta / Alphabet / Microsoft tier). If your company is a local subsidiary, the parent's efficiency cycle typically reaches international offices 3–6 months after the US announcement. Monitor parent company earnings calls for headcount language.`;
    }
    return null; // neutral for US users
  }

  if (category === 'eu_industrial_automation') {
    if (!regionStr.includes('eu') && !regionStr.includes('german') && !regionStr.includes('europ')) {
      return `This pattern documents European industrial automation (primarily Germany, automotive sector). It is less directly applicable to non-EU roles but signals the global trajectory for industrial and manufacturing roles — especially as US and APAC auto OEMs follow the same efficiency path.`;
    }
    return null;
  }

  if (category === 'uk_fintech_correction') {
    const inUk = regionStr.includes('uk') || regionStr.includes('brit') || regionStr.includes('london');
    if (!inUk && userRegion) {
      return `This pattern is UK fintech specific (FCA regulatory environment, BNPL correction). If you are ${userRegion}-based, the mechanism differs — but the over-valuation → unit-economics correction cycle has played out in similar fintech markets (US, India, SEA). The outcome timelines are a useful reference for the compression phase.`;
    }
    return null;
  }

  if (category === 'role_ai_displacement') {
    // Globally relevant — no region caveat needed, but highlight if user is neutral
    return `This is a role-function pattern, not a company or geography pattern — it applies wherever this role is practised. The documented cases span multiple regions. If you hold a similar role title, review the affected/protected lists below to locate your specific function.`;
  }

  if (category === 'saas_startup_contraction') {
    if (userRegion && !['US', 'Global'].includes(userRegion)) {
      return `This pattern originates in US SaaS / venture-backed startups but propagated globally through 2022–2024 as investor sentiment contracted across all markets. The funding dynamics and efficiency-first pivot are directly applicable to VC-backed companies in ${userRegion} that raised at 2021 valuations.`;
    }
    return null;
  }

  if (category === 'company_lifecycle') {
    // Universal — no regional caveat
    return null;
  }

  if (category === 'apac_tech_contraction') {
    const inApac = /singapore|australia|japan|korea|hong.?kong|apac|sea|southeast/i.test(regionStr);
    if (!inApac && userRegion) {
      return `This pattern is APAC-specific. If you are ${userRegion}-based, the direct trigger (APAC regional funding contraction) may not apply, but the pattern's underlying mechanism — over-hiring during growth then sharp correction — is universal.`;
    }
    return null;
  }

  return null;
}

// ── Highlight a role row if it overlaps with the user's role title ────────────
function roleOverlaps(roleLabel: string, userRoleTitle: string | undefined): boolean {
  if (!userRoleTitle) return false;
  const label = roleLabel.toLowerCase();
  const user = userRoleTitle.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const tokens = user.split(/\s+/).filter(t => t.length >= 3);
  return tokens.some(t => label.includes(t));
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PatternMatchCard: React.FC<PatternMatchCardProps> = ({
  pattern,
  overlapScore,
  userRegion,
  roleFit,
  userRoleTitle,
}) => {
  const [expanded, setExpanded] = useState(false);

  const audienceReframe = buildAudienceReframe(pattern, userRegion, roleFit);
  const pctMatch = overlapScore != null ? Math.round(overlapScore * 100) : null;
  const matchColor = pctMatch != null
    ? pctMatch >= 75 ? 'var(--emerald)'
    : pctMatch >= 50 ? 'var(--amber)'
    : 'var(--text-3)'
    : 'var(--cyan)';

  // Role alignment chip config
  const roleFitChip =
    roleFit === 1  ? { label: 'YOUR ROLE IS AFFECTED',  bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   color: '#ef4444' } :
    roleFit === -1 ? { label: 'YOUR ROLE IS PROTECTED', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)',  color: '#10b981' } :
    roleFit === 0  ? { label: 'NEUTRAL FOR YOUR ROLE',  bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', color: 'var(--alpha-text-35)' } :
    null;

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${matchColor}`,
        borderRadius: 10,
        padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category pill + match meter + role-fit chip */}
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

            {/* Role alignment chip — new in v8.0 */}
            {roleFitChip && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em',
                textTransform: 'uppercase', padding: '2px 7px', borderRadius: 4,
                background: roleFitChip.bg, border: `1px solid ${roleFitChip.border}`,
                color: roleFitChip.color,
              }}>
                {roleFitChip.label}
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

      {/* Audience reframe — personalised interpretation for THIS reader.
          Shown above the fold because it's the most user-specific signal. */}
      {audienceReframe && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 10px',
            borderRadius: 8,
            background: roleFit === -1 ? 'rgba(16,185,129,0.07)'
                       : roleFit === 1  ? 'rgba(239,68,68,0.07)'
                       : 'rgba(0,212,224,0.06)',
            border: `1px solid ${
              roleFit === -1 ? 'rgba(16,185,129,0.22)'
            : roleFit === 1  ? 'rgba(239,68,68,0.22)'
            : 'rgba(0,212,224,0.18)'}`,
          }}
        >
          <div style={{
            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: 3,
            color: roleFit === -1 ? 'var(--emerald)' : roleFit === 1 ? '#ef4444' : '#00d4e0',
          }}>
            What this means for you
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{audienceReframe}</div>
        </div>
      )}

      {/* Immediate response — shown above the fold (was previously hidden
          behind "See response strategy" requiring a click). The most
          actionable data should never require expansion. */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 5,
        }}>
          ↑ This Week — What Worked
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
          {pattern.recommendedResponse.immediate}
        </p>
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
            { label: 'Typical',    value: pattern.outcomeTimeline.typical,    color: 'var(--amber)' },
            { label: 'Best case',  value: pattern.outcomeTimeline.best_case,  color: 'var(--emerald)' },
            { label: 'Worst case', value: pattern.outcomeTimeline.worst_case, color: 'var(--red)' },
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

      {/* Expandable detail: medium-term response + role impact */}
      {expanded && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5 }}>
              1–3 Month Moves
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 8px' }}>
              {pattern.recommendedResponse.short_term}
            </p>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>
              3–12 Month Positioning
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5, margin: 0 }}>
              {pattern.recommendedResponse.medium_term}
            </p>
          </div>

          {/* Roles affected / protected — highlight user's role if matched */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--red)', marginBottom: 3 }}>
                Most Affected
              </div>
              {pattern.affectedRoles.slice(0, 4).map((r, i) => {
                const highlight = roleOverlaps(r, userRoleTitle);
                return (
                  <div key={i} style={{
                    fontSize: '0.65rem', lineHeight: 1.4,
                    color: highlight ? '#ef4444' : 'var(--text-2)',
                    fontWeight: highlight ? 800 : 400,
                  }}>
                    {highlight ? '→ ' : '· '}{r}
                  </div>
                );
              })}
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--emerald)', marginBottom: 3 }}>
                Protected / Growing
              </div>
              {pattern.protectedRoles.slice(0, 4).map((r, i) => {
                const highlight = roleOverlaps(r, userRoleTitle);
                return (
                  <div key={i} style={{
                    fontSize: '0.65rem', lineHeight: 1.4,
                    color: highlight ? '#10b981' : 'var(--text-2)',
                    fontWeight: highlight ? 800 : 400,
                  }}>
                    {highlight ? '→ ' : '· '}{r}
                  </div>
                );
              })}
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
        {expanded ? '↑ Show less' : '↓ See 1–12 month strategy + role impact'}
      </button>

      {/* Evidence note — always visible */}
      <div style={{ marginTop: 8, fontSize: '0.6rem', color: 'var(--text-3)', borderTop: '1px solid var(--border)', paddingTop: 6, lineHeight: 1.4 }}>
        <span style={{ fontWeight: 700 }}>Evidence: </span>{pattern.evidenceNote}
      </div>
    </div>
  );
};
