// SkillFreshnessLabel.tsx
// Answers: "Is this skill demand data live, stale, or a static estimate?"
//
// Badge hierarchy — checked top-to-bottom (scrape_status takes priority over ageInDays):
//
//   scrapeStatus = 'source_blocked'  →  🔴 Source blocked
//     Copy: "🔴 Source blocked · last ok: {date}" or "🔴 Source blocked · no prior data"
//     Distinguishes an anti-bot block from normal scheduled staleness.
//
//   scrapeStatus = 'rate_limited'    →  🟠 Rate limited
//     Copy: "🟠 Rate limited · {N}d old"
//
//   ageInDays ≤ 7 AND scrapeStatus = 'success' (or null legacy)
//                                    →  🟢 Live
//     Copy: "Live · {N}d ago" + trend arrow + count
//
//   ageInDays ≤ 7 AND scrapeStatus = 'parse_failed' | 'network_error'
//                                    →  🟡 Refresh issue
//     Shows last-known-good timestamp when available. Doesn't claim "Live".
//
//   ageInDays 8–90                   →  🟡 {N} days old  (amber scheduled staleness)
//     Copy: "📅 {N}d ago  · scheduled refresh"
//     THE LIVE BADGE DISAPPEARS ON DAY 8, NOT DAY 7.
//
//   ageInDays > 90                   →  🔴 Stale
//
//   scrapeStatus = 'no_key'          →  📊 Research est.
//   No demandLive                    →  📊 Research est.
//
// The fallback to static data is NEVER silent.

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

function lastGoodLabel(lastSuccessfulScrapeAt: string | null | undefined): string {
  if (!lastSuccessfulScrapeAt) return 'no prior successful refresh on record';
  const daysAgo = Math.round((Date.now() - new Date(lastSuccessfulScrapeAt).getTime()) / 86_400_000);
  return `last successful: ${formatDate(lastSuccessfulScrapeAt)} (${daysAgo}d ago)`;
}

export const SkillFreshnessLabel: React.FC<Props> = ({ demandLive, showCount = true }) => {
  if (!demandLive) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono"
        title="Demand data: research estimate (not sourced from live job boards)"
      >
        📊 Research est.
      </span>
    );
  }

  const { ageInDays, liveJobCount, dataAsOf, demandTrend, scrapeStatus, lastSuccessfulScrapeAt } = demandLive;

  // ── Priority 1: no Serper key configured ─────────────────────────────────
  if (scrapeStatus === 'no_key') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono"
        title="No Serper API key configured — refresh-market-intelligence EF runs in dry-run mode. Data is a research estimate."
      >
        📊 Research est.
      </span>
    );
  }

  // ── Priority 2: anti-bot block ────────────────────────────────────────────
  if (scrapeStatus === 'source_blocked') {
    const lastGood = lastGoodLabel(lastSuccessfulScrapeAt);
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
        title={`Source blocked by anti-bot protection — job board is refusing automated queries. ${lastGood}. Counts shown are from the last successful refresh.`}
      >
        🔴 Source blocked · {lastSuccessfulScrapeAt ? `last ok: ${formatDate(lastSuccessfulScrapeAt)}` : 'no prior data'}
      </span>
    );
  }

  // ── Priority 3: rate limited ──────────────────────────────────────────────
  if (scrapeStatus === 'rate_limited') {
    const lastGood = lastGoodLabel(lastSuccessfulScrapeAt);
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400/90 border border-orange-500/20"
        title={`Rate limited during last weekly refresh — refresh will retry next Monday. ${lastGood}. Counts shown are from the last successful refresh.`}
      >
        🟠 Rate limited · {ageInDays}d old
      </span>
    );
  }

  const status = getSkillFreshnessStatus(ageInDays);

  const trendArrow = demandTrend === 'surging'     ? '↑↑'
    : demandTrend === 'growing'    ? '↑'
    : demandTrend === 'contracting' ? '↓'
    : '→';

  const countSuffix = showCount && liveJobCount !== null
    ? ` · ${formatCount(liveJobCount)} roles`
    : '';

  const deltaBadge = demandLive.delta90d != null
    ? (demandLive.delta90d > 0
        ? <span className="text-emerald-400/80">↑{demandLive.delta90d.toLocaleString()}</span>
        : demandLive.delta90d < 0
          ? <span className="text-red-400/80">↓{Math.abs(demandLive.delta90d).toLocaleString()}</span>
          : <span className="text-muted-foreground">→0</span>)
    : null;

  // ── Priority 4: recent data but scrape failed (parse_failed / network_error) ──
  // ageInDays ≤ 7 but scrape didn't succeed — show amber "Refresh issue", not Live.
  if (status === 'live' && scrapeStatus && scrapeStatus !== 'success') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
        title={`Last refresh attempt failed (${scrapeStatus}). Data from ${formatDate(dataAsOf)}. ${lastGoodLabel(lastSuccessfulScrapeAt)}.`}
      >
        🟡 Refresh issue · {ageInDays}d old{countSuffix}
      </span>
    );
  }

  if (status === 'live') {
    // ── 🟢 Live — ageInDays ≤ 7 AND scrapeStatus = 'success' (or null/legacy) ─
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
        title={`Serper/Naukri via weekly scrape. Data from ${formatDate(dataAsOf)}.${liveJobCount != null ? ` ${liveJobCount.toLocaleString()} active postings.` : ''}${demandLive.delta90d != null ? ` 90d delta: ${demandLive.delta90d > 0 ? '+' : ''}${demandLive.delta90d} roles.` : ''}`}
      >
        🟢 Live {trendArrow} · {ageInDays}d ago{countSuffix}{deltaBadge && <>{' '}{deltaBadge}</>}
      </span>
    );
  }

  if (status === 'stale') {
    // ── 🟡 Amber — ageInDays 8–90 (normal scheduled staleness) ──────────────
    // THE LIVE BADGE DISAPPEARS HERE — day 8 is the first day this amber label appears.
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
        title={`${ageInDays} days since last refresh (>${SKILL_DEMAND_LIVE_MAX_DAYS}d). Data from ${formatDate(dataAsOf)}. Awaiting next Monday 06:00 UTC refresh.`}
      >
        📅 {ageInDays}d old · scheduled refresh{countSuffix}
      </span>
    );
  }

  // ── 🔴 Very stale — ageInDays > 90 ──────────────────────────────────────
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/80 border border-red-500/20"
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
