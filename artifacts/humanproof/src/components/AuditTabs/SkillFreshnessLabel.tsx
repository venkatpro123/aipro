// SkillFreshnessLabel.tsx
// Answers: "Is this skill demand data live, stale, or a static estimate?"
//
// Three states — EXACT thresholds:
//
//   ≤ 7 days  →  🟢 Live  (green)
//     Copy: "Live · {N}d ago" (tooltip: "Naukri/LinkedIn via weekly scrape. {count} roles")
//
//   8–90 days →  🟡 {N} days old  (amber)
//     Copy: "📅 {N}d ago" (tooltip: "Stale relative to weekly scrape. Data from {date}.")
//     THE LIVE BADGE DISAPPEARS ON DAY 8, NOT DAY 7. Day 7 is the last day the
//     live badge is shown.
//
//   > 90 days →  🔴 Stale  (red)
//     Copy: "⚠ Stale · {N}d" (tooltip: "Data older than 90 days — verify manually.")
//
//   No live data →  No badge (static estimate used, labeled inline in skill card)
//
// The fallback to static data is NEVER silent. When demandLive is absent,
// skill cards show "Demand data: research estimate (not live)" in a muted label.

import React from 'react';
import type { SkillDemandLive } from '../../data/intelligence/types';
import { SKILL_DEMAND_LIVE_MAX_DAYS, SKILL_DEMAND_STALE_MAX_DAYS, getSkillFreshnessStatus } from '../../services/skillDemandService';

interface Props {
  demandLive: SkillDemandLive | undefined;
  /** Show the role-level job count next to the badge */
  showCount?: boolean;
}

function formatCount(count: number | null): string {
  if (count === null) return '—';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SkillFreshnessLabel: React.FC<Props> = ({ demandLive, showCount = true }) => {
  // No live data — static estimate, labeled explicitly (never silent)
  if (!demandLive) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/60 font-mono"
        title="Demand data: research estimate (not sourced from live job boards)"
      >
        📊 Research est.
      </span>
    );
  }

  const { ageInDays, liveJobCount, dataAsOf, demandTrend } = demandLive;
  const status = getSkillFreshnessStatus(ageInDays);

  const trendArrow = demandTrend === 'surging' ? '↑↑'
    : demandTrend === 'growing'    ? '↑'
    : demandTrend === 'contracting' ? '↓'
    : '→';

  const countSuffix = showCount && liveJobCount !== null
    ? ` · ${formatCount(liveJobCount)} roles`
    : '';

  // delta90d badge — shown alongside the freshness label when available
  const deltaBadge = demandLive.delta90d != null
    ? (demandLive.delta90d > 0
        ? <span className="text-emerald-400/80">↑{demandLive.delta90d.toLocaleString()}</span>
        : demandLive.delta90d < 0
          ? <span className="text-red-400/80">↓{Math.abs(demandLive.delta90d).toLocaleString()}</span>
          : <span className="text-muted-foreground">→0</span>)
    : null;

  if (status === 'live') {
    // ── 🟢 Live badge — ageInDays ≤ 7 ──────────────────────────────────────
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
        title={`Naukri/LinkedIn via weekly scrape. Data from ${formatDate(dataAsOf)}.${liveJobCount != null ? ` ${liveJobCount.toLocaleString()} active India postings.` : ''}${demandLive.delta90d != null ? ` 90d delta: ${demandLive.delta90d > 0 ? '+' : ''}${demandLive.delta90d} roles.` : ''}`}
      >
        🟢 Live {trendArrow} · {ageInDays}d ago{countSuffix}{deltaBadge && <>{' '}{deltaBadge}</>}
      </span>
    );
  }

  if (status === 'stale') {
    // ── 🟡 Amber label — ageInDays 8–90 ─────────────────────────────────────
    // THE LIVE BADGE DISAPPEARS HERE — day 8 is the first day this amber label appears.
    return (
      <span
        className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
        title={`Stale relative to weekly scrape (>${SKILL_DEMAND_LIVE_MAX_DAYS} days). Data from ${formatDate(dataAsOf)}. Awaiting next Monday refresh.`}
      >
        📅 {ageInDays}d old{countSuffix}
      </span>
    );
  }

  // ── 🔴 Very stale — ageInDays > 90 ──────────────────────────────────────
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/80 border border-red-500/20"
      title={`Data older than ${SKILL_DEMAND_STALE_MAX_DAYS} days (${ageInDays}d). Demand figures may not reflect current market. Verify on Naukri/LinkedIn directly.`}
    >
      ⚠ Stale · {ageInDays}d
    </span>
  );
};

/**
 * Panel-level fallback notice — shown at the top of a skill panel when
 * ALL skills in that panel have no live data (no cache entry for this role).
 * Prevents silent fallback: the user must know the data is not live.
 */
export const SkillPanelStaticNotice: React.FC = () => (
  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mb-3 px-1">
    <span>📊</span>
    <span>
      Skill demand data: research estimate (Q1 2026 manual review).
      Live Naukri/LinkedIn counts load when the weekly refresh runs.
    </span>
  </div>
);
