// CareerAlertCenter.tsx — Phase 4 (Career OS)
//
// The intelligent alert surface. Rules:
//   • Shows at most ONE alert at a time — the highest-severity undismissed one.
//   • Only escalates significant (CRITICAL/HIGH) signals; INFO stays in the feed.
//   • Leads with a causal score-change alert when the score moved meaningfully
//     since the last audit — "Risk increased BECAUSE [dimension]."
//   • Dismiss persists (via monitoring_alert_dismissals) so it does not nag.
//
// This component is self-contained: it builds its own MonitoringContext from the
// HybridResult, fetches the watchlist + dismissals + previous score, and renders
// nothing when there is no significant, undismissed alert.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMonitoringFeed,
  getDismissedAlertKeys,
  dismissAlert,
  getWatchlist,
  type MonitoringContext,
} from "../../services/monitoringService";
import {
  detectScoreChange,
  getPreviousAuditScore,
  type ScoreChangeEvent,
} from "../../services/scoreChangeDetectionService";
import type { MonitoringFeedItem } from "../../types/careerOS";
import type { HybridResult } from "../../types/hybridResult";

interface Props {
  hr: HybridResult | null;
  companyName: string | null;
}

const SEVERITY_STYLE: Record<MonitoringFeedItem["severity"], { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: { color: "#ef4444", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.3)", label: "CRITICAL" },
  HIGH:     { color: "#f59e0b", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.28)", label: "HIGH" },
  INFO:     { color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.22)", label: "INFO" },
};

// Map a causal score-change event into a synthetic top-of-feed alert.
function scoreChangeToAlert(evt: ScoreChangeEvent): MonitoringFeedItem | null {
  if (evt.changeType !== "significant" || evt.direction !== "up") return null; // only escalate worsening, significant moves
  return {
    id: `score-change-${evt.causalDimension}-${Math.round(evt.delta)}-${evt.currentScore}`,
    category: "role",
    severity: evt.delta >= 10 ? "CRITICAL" : "HIGH",
    headline: `Your risk score rose ${Math.abs(Math.round(evt.delta))} points since your last audit`,
    detail: evt.causalEvidence,
    source: "Score Change Detection",
    timestamp: new Date().toISOString(),
    toolLink: "/tools/layoff-defense",
    dismissed: false,
    interpretation: evt.primaryCause,
  };
}

export function CareerAlertCenter({ hr, companyName }: Props) {
  const navigate = useNavigate();
  const [topAlert, setTopAlert] = useState<MonitoringFeedItem | null>(null);
  const [dismissedLocally, setDismissedLocally] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hr) { setTopAlert(null); return; }
    let cancelled = false;

    (async () => {
      try {
        const [watchlist, dismissed, prev] = await Promise.all([
          getWatchlist(),
          getDismissedAlertKeys(),
          getPreviousAuditScore(),
        ]);
        if (cancelled) return;

        const ctx: MonitoringContext = {
          hybridResult: hr,
          watchlist: companyName ? Array.from(new Set([companyName, ...watchlist])) : watchlist,
          financialRunwayMonths: hr.financialRunwayMonths ?? null,
        };

        const feed = await getMonitoringFeed(ctx, dismissed);
        if (cancelled) return;

        // Build candidate list: causal score-change alert first (if any), then feed.
        const candidates: MonitoringFeedItem[] = [];
        const change = detectScoreChange(hr, prev?.score ?? null);
        if (change) {
          const changeAlert = scoreChangeToAlert(change);
          if (changeAlert && !dismissed.has(changeAlert.id)) candidates.push(changeAlert);
        }
        candidates.push(...feed.filter(a => a.severity !== "INFO"));

        const top = candidates.find(a => !dismissedLocally.has(a.id)) ?? null;
        setTopAlert(top);
      } catch {
        if (!cancelled) setTopAlert(null);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hr, companyName, dismissedLocally]);

  if (!topAlert) return null;

  const sev = SEVERITY_STYLE[topAlert.severity];

  const handleDismiss = () => {
    setDismissedLocally(prev => new Set(prev).add(topAlert.id));
    void dismissAlert(topAlert.id);
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "14px 18px",
        borderRadius: 12,
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      {/* Pulsing severity dot */}
      <span
        style={{
          flexShrink: 0,
          marginTop: 5,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: sev.color,
          display: "inline-block",
          animation: "pulse 2s ease-in-out infinite",
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
          <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "rgba(255,255,255,0.27)", letterSpacing: "0.13em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono, monospace)" }}>
            ALERT
          </span>
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 4,
              fontSize: "0.58rem",
              fontWeight: 800,
              color: sev.color,
              background: `${sev.color}16`,
              border: `1px solid ${sev.color}30`,
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.06em",
            }}
          >
            {sev.label}
          </span>
          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.24)", fontFamily: "var(--font-mono, monospace)" }}>
            {topAlert.source}
          </span>
        </div>

        <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "rgba(255,255,255,0.78)", lineHeight: 1.45, marginBottom: 4 }}>
          {topAlert.headline}
        </div>
        <div style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.48)", lineHeight: 1.5 }}>
          {topAlert.detail}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {topAlert.toolLink && (
            <button
              type="button"
              onClick={() => navigate(topAlert.toolLink!)}
              style={{
                background: sev.color,
                color: topAlert.severity === "INFO" ? "#fff" : "#000",
                border: "none",
                borderRadius: 7,
                padding: "6px 14px",
                fontSize: "0.76rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Take action →
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: 7,
              color: "rgba(255,255,255,0.4)",
              padding: "6px 12px",
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.11)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
