// DataFreshnessPanel.tsx
// Shows live signal coverage, per-source age, and static-fallback status.
// Rendered in TransparencyTab alongside SignalAttributionWaterfall.

import React from "react";
import { Clock, Wifi, WifiOff, Database } from "lucide-react";

interface DataFreshnessPanelProps {
  /** 0–1 ratio from reconcileCompanySignals: share of signals that are fresh+live */
  dataFreshnessScore?: number;
  /** Reconciliation summary from liveDataService */
  reconciliationSummary?: {
    liveWonKeys: string[];
    dbWonKeys: string[];
    degradedKeys?: string[];
  };
  /** CompanyData.lastUpdated or live signal fetch timestamp */
  lastUpdated?: string | null;
  /** Whether the DB row was flagged as stale (> 7d) */
  staleDb?: boolean;
  /** Age in days of the DB row, if stale */
  dbAgeDays?: number | null;
  /**
   * The DB quality tier floor applied when the 45s quorum ceiling fired.
   * null when live data was available (floor not needed).
   * When set, the badge names the floor value so users know 62% ≠ genuine evidence.
   */
  liveUnavailableFloor?: number | null;
  /** DB reliability tier that produced the floor — A/B/C/D. */
  dbReliabilityTier?: 'A' | 'B' | 'C' | 'D' | null;
  /**
   * Max wall-clock ms between scrape job enqueue and worker pickup for this
   * audit session. Null when no user_triggered jobs have started yet.
   * When > 5 000 ms: renders an amber "queue is busy" advisory.
   */
  scrapeJobQueueTimeMs?: number | null;
}

function freshnessLabel(score: number): { label: string; color: string } {
  // v32: labels align with the quorum model. "Static Fallback" is replaced by
  // "Live Unavailable" — the audit pipeline only renders this when live quorum
  // could not be reached within the 45s ceiling.
  if (score >= 0.7) return { label: "Live (Quorum Reached)", color: "text-emerald-400" };
  if (score >= 0.4) return { label: "Live (Partial)",        color: "text-amber-400" };
  if (score >= 0.1) return { label: "Live (Limited)",        color: "text-orange-400" };
  return              { label: "Live Unavailable",           color: "text-rose-400" };
}

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (mins  >= 1) return `${mins}m ago`;
  return "just now";
}

export const DataFreshnessPanel: React.FC<DataFreshnessPanelProps> = ({
  dataFreshnessScore,
  reconciliationSummary,
  lastUpdated,
  staleDb,
  dbAgeDays,
  liveUnavailableFloor,
  dbReliabilityTier,
  scrapeJobQueueTimeMs,
}) => {
  const score = dataFreshnessScore ?? 0;
  const pct   = Math.round(score * 100);
  const { label, color } = freshnessLabel(score);

  const liveCount  = reconciliationSummary?.liveWonKeys.length  ?? 0;
  const dbCount    = reconciliationSummary?.dbWonKeys.length    ?? 0;
  const totalCount = liveCount + dbCount;

  const isStaticFallback = score < 0.1;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
        <Clock className="w-4 h-4 text-blue-400" />
        Data Freshness
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">Live Signal Coverage</span>
          <span className={`font-semibold ${color}`}>{pct}% — {label}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score >= 0.7 ? "bg-emerald-400" :
              score >= 0.4 ? "bg-amber-400"   :
              score >= 0.1 ? "bg-orange-400"  :
              "bg-rose-400"
            }`}
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>

      {/* Signal count breakdown */}
      {totalCount > 0 && (
        <div className="flex gap-4 text-xs text-white/60">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{liveCount} live signal{liveCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>{dbCount} DB signal{dbCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="text-xs text-white/50">
          Last fetched: <span className="text-white/70">{ageLabel(lastUpdated)}</span>
        </div>
      )}

      {/* Stale DB warning */}
      {staleDb && dbAgeDays != null && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
          <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
          <span>
            Company profile from DB row ~{dbAgeDays} day{dbAgeDays !== 1 ? "s" : ""} old —
            live rescrape may not have run yet.
          </span>
        </div>
      )}

      {/* Scrape queue backpressure advisory — shown when the scrape worker took
          > 5 s to pick up a user-triggered job. This is not an error: the worker
          eventually started and results are still accurate. The advisory prevents
          users from thinking a delay means the score is wrong. */}
      {scrapeJobQueueTimeMs != null && scrapeJobQueueTimeMs > 5_000 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
          <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
          <span>
            Scraping queue was busy — worker pickup took{" "}
            <span className="font-semibold">
              {scrapeJobQueueTimeMs >= 60_000
                ? `${Math.round(scrapeJobQueueTimeMs / 1_000)}s`
                : `${(scrapeJobQueueTimeMs / 1_000).toFixed(1)}s`}
            </span>
            . Results may be slightly delayed but are still accurate.
          </span>
        </div>
      )}

      {/* Live-unavailable badge. When the 45s quorum ceiling fires without quorum,
          confidence is anchored to the DB quality tier floor — not evidence acquired
          during this session. Show the specific tier and floor so "62% confidence"
          is clearly labelled as a DB-quality floor, not a genuine evidence score. */}
      {isStaticFallback && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 space-y-1.5">
          <div className="flex items-start gap-2 text-xs text-rose-300">
            <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
            <span>
              <strong className="font-semibold">Live Intelligence Unavailable</strong> —
              live sources did not respond within the quorum window (45s ceiling reached).
            </span>
          </div>
          {liveUnavailableFloor != null && dbReliabilityTier != null ? (
            <div className="flex items-center gap-2 flex-wrap pl-5 text-xs">
              <span className="text-white/40">Confidence anchored to:</span>
              <span
                className="font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(244,63,94,0.15)',
                  color: '#fda4af',
                  border: '1px solid rgba(244,63,94,0.30)',
                }}
              >
                DB Tier {dbReliabilityTier} floor — {Math.round(liveUnavailableFloor * 100)}%
              </span>
              <span className="text-white/35 leading-tight">
                This reflects database record completeness, not signals collected today.
              </span>
            </div>
          ) : (
            <p className="pl-5 text-xs text-rose-200/60">
              Score reflects best-available DB evidence; confidence is a quality floor, not an evidence score.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DataFreshnessPanel;
