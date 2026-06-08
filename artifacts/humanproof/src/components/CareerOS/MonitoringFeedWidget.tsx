import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { useBreakingNewsPoller } from "../../hooks/useBreakingNewsPoller";
import { useLayoff } from "../../context/LayoffContext";
import type { MonitoringFeedItem } from "../../types/careerOS";
import type { BreakingNewsMatch } from "../../services/breakingNewsPoller";

function newsMatchToFeedItem(m: BreakingNewsMatch): MonitoringFeedItem {
  return {
    id: `news-${m.companyName}-${m.publishedAt instanceof Date ? m.publishedAt.getTime() : Date.now()}`,
    category: "company",
    severity: m.isPrimaryKeyword ? "HIGH" : "INFO",
    headline: m.headline,
    detail: m.companyName,
    source: m.source ?? "News",
    timestamp: m.publishedAt instanceof Date ? m.publishedAt.toISOString() : new Date().toISOString(),
    toolLink: "/terminal",
    dismissed: false,
  };
}

function SeverityIcon({ severity }: { severity: MonitoringFeedItem["severity"] }) {
  if (severity === "CRITICAL") return <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />;
  if (severity === "HIGH") return <AlertTriangle size={13} style={{ color: "#f97316", flexShrink: 0 }} />;
  return <Info size={13} style={{ color: "var(--cyan)", flexShrink: 0 }} />;
}

function severityBg(severity: MonitoringFeedItem["severity"]): string {
  if (severity === "CRITICAL") return "rgba(239,68,68,0.08)";
  if (severity === "HIGH") return "rgba(249,115,22,0.08)";
  return "rgba(0,245,255,0.05)";
}

function severityBorder(severity: MonitoringFeedItem["severity"]): string {
  if (severity === "CRITICAL") return "rgba(239,68,68,0.2)";
  if (severity === "HIGH") return "rgba(249,115,22,0.2)";
  return "rgba(0,245,255,0.12)";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  const mins = Math.floor(diff / 60_000);
  if (hrs > 24) return `${Math.floor(hrs / 24)}d ago`;
  if (hrs >= 1) return `${hrs}h ago`;
  if (mins >= 1) return `${mins}m ago`;
  return "just now";
}

export function MonitoringFeedWidget() {
  const { state } = useLayoff();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { currentMatches, isPolling } = useBreakingNewsPoller(state.companyName ?? undefined);

  const feedItems: MonitoringFeedItem[] = currentMatches
    .map(newsMatchToFeedItem)
    .filter(item => !dismissed.has(item.id))
    .slice(0, 5);

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.40 }}
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="label-xs" style={{ color: "var(--text-3)" }}>MONITORING FEED</div>
          {isPolling && (
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)",
              boxShadow: "0 0 6px var(--cyan)", animation: "pulse 1.5s ease-in-out infinite",
            }} />
          )}
        </div>
        <Radio size={15} style={{ color: isPolling ? "var(--cyan)" : "var(--text-3)" }} />
      </div>

      {feedItems.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "20px 0", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#10b981",
            boxShadow: "0 0 8px #10b981",
          }} />
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>
            All Clear
          </div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-3)" }}>
            {state.companyName
              ? `No critical signals for ${state.companyName}`
              : "Run an audit to start monitoring your company"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {feedItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: severityBg(item.severity),
                border: `1px solid ${severityBorder(item.severity)}`,
                borderRadius: 8, padding: "10px 12px",
                display: "flex", gap: 8, alignItems: "flex-start",
              }}
            >
              <SeverityIcon severity={item.severity} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "0.79rem", fontWeight: 600, color: "var(--text)",
                  lineHeight: 1.4, marginBottom: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {item.headline}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                  {item.detail} · {item.source} · {relativeTime(item.timestamp)}
                </div>
              </div>
              <button
                onClick={() => setDismissed(d => new Set([...d, item.id]))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: "1rem", lineHeight: 1, padding: 0, flexShrink: 0 }}
                title="Dismiss"
              >
                ×
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <button
        onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "monitor" } }))}
        style={{
          background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
          color: "var(--text-2)", fontSize: "0.78rem", fontWeight: 600, padding: "6px 0",
          cursor: "pointer", width: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 4, transition: "all 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--cyan)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
      >
        View All Signals <ChevronRight size={13} />
      </button>
    </motion.div>
  );
}
