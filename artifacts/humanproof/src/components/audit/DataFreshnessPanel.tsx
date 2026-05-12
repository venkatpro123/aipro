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
}

function freshnessLabel(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: "Live",         color: "text-emerald-400" };
  if (score >= 0.4) return { label: "Partially Live", color: "text-amber-400" };
  if (score >= 0.1) return { label: "Mostly Cached",  color: "text-orange-400" };
  return              { label: "Static Fallback",  color: "text-rose-400" };
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

      {/* Static fallback badge */}
      {isStaticFallback && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
          <span>
            <strong className="font-semibold">Static Fallback Active</strong> — all live APIs
            unavailable. Intelligence is sourced from bundled static data.
            Confidence has been capped at 35%.
          </span>
        </div>
      )}
    </div>
  );
};

export default DataFreshnessPanel;
