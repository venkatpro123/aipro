// DataQualityBanner.tsx
// Shows data freshness, confidence interval, and source quality at top of OverviewTab.

import React from "react";
import { ShieldCheck, AlertTriangle, Activity, Database } from "lucide-react";

interface FreshnessReport {
  avgSignalAge: number;    // days
  oldestSignalAge: number; // days
  percentLive: number;     // 0-1
  percentHeuristic: number; // 0-1
}

interface Props {
  freshnessReport: FreshnessReport;
  confidencePercent: number;
  confidenceInterval: { low: number; high: number };
  hasConflicts: boolean;
  conflictCount: number;
  primarySource: "live" | "db" | "hybrid";
  overridesApplied: string[];
}

const sourceLabel: Record<string, string> = {
  live:   "Live OSINT",
  db:     "Intelligence DB",
  hybrid: "Hybrid (Live + DB)",
};

const sourceColor: Record<string, string> = {
  live:   "var(--cyan)",
  db:     "var(--amber)",
  hybrid: "var(--emerald)",
};

export const DataQualityBanner: React.FC<Props> = ({
  freshnessReport,
  confidencePercent,
  confidenceInterval,
  hasConflicts,
  conflictCount,
  primarySource,
  overridesApplied,
}) => {
  const isStale = freshnessReport.avgSignalAge > 30;
  const isLow   = confidencePercent < 55;

  if (!hasConflicts && !isStale && !isLow && overridesApplied.length === 0) {
    return null; // No banner needed — data is clean
  }

  const borderAccent = isLow || isStale ? "rgba(245,158,11,0.30)" : "rgba(0,212,224,0.20)";
  const leftAccent   = isLow || isStale ? "var(--amber)" : "var(--cyan)";

  return (
    <div
      role="status"
      aria-label="Data quality summary"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        padding: "12px 16px",
        borderRadius: "var(--radius-xl)",
        border: `1px solid ${borderAccent}`,
        borderLeft: `3px solid ${leftAccent}`,
        background: isLow || isStale ? "rgba(245,158,11,0.05)" : "rgba(0,212,224,0.04)",
        backdropFilter: "blur(12px)",
        marginBottom: 16,
        alignItems: "center",
      }}
    >
      {/* Confidence pill */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <ShieldCheck
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: isLow ? "var(--amber)" : "var(--emerald)" }}
        />
        <span style={{ color: isLow ? "var(--amber)" : "var(--emerald)" }}>
          {confidencePercent}% confidence
        </span>
        <span className="opacity-50 font-normal">
          ({confidenceInterval.low}–{confidenceInterval.high} range)
        </span>
      </div>

      {/* Source */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <Database
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: sourceColor[primarySource] ?? "var(--text-2)" }}
        />
        <span style={{ color: sourceColor[primarySource] ?? "var(--text-2)" }}>
          {sourceLabel[primarySource] ?? primarySource}
        </span>
      </div>

      {/* Live signal % */}
      <div className="flex items-center gap-2 text-xs">
        <Activity className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">
          {Math.round(freshnessReport.percentLive * 100)}% live ·{" "}
          {freshnessReport.avgSignalAge}d avg age
        </span>
      </div>

      {/* Conflict / override warnings */}
      {(hasConflicts || overridesApplied.length > 0) && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--amber)" }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {hasConflicts && (
            <span>{conflictCount} signal conflict{conflictCount !== 1 ? "s" : ""}</span>
          )}
          {hasConflicts && overridesApplied.length > 0 && (
            <span className="opacity-40">·</span>
          )}
          {overridesApplied.length > 0 && (
            <span>{overridesApplied.length} override{overridesApplied.length !== 1 ? "s" : ""} applied</span>
          )}
        </div>
      )}

      {/* Stale data */}
      {isStale && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--orange)" }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Oldest signal {freshnessReport.oldestSignalAge}d — re-audit for freshness</span>
        </div>
      )}
    </div>
  );
};

export default DataQualityBanner;
