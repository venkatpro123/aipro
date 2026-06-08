import { motion } from "framer-motion";
import { AlertTriangle, Info, X, ArrowRight } from "lucide-react";
import type { MonitoringFeedItem } from "../../types/careerOS";

const CATEGORY_LABELS: Record<MonitoringFeedItem['category'], string> = {
  company: "Company",
  role: "Role",
  market: "Market",
  personal: "Personal",
};

const CATEGORY_COLORS: Record<MonitoringFeedItem['category'], string> = {
  company: "#ef4444",
  role: "#f97316",
  market: "#f59e0b",
  personal: "var(--cyan)",
};

const SEVERITY_COLORS: Record<MonitoringFeedItem['severity'], string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  INFO: "var(--cyan)",
};

function SeverityBadge({ severity }: { severity: MonitoringFeedItem['severity'] }) {
  const color = SEVERITY_COLORS[severity];
  return (
    <span style={{
      padding: "1px 7px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 800,
      letterSpacing: "0.1em", fontFamily: "var(--font-mono)",
      background: `${color}14`, border: `1px solid ${color}35`, color,
    }}>
      {severity}
    </span>
  );
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

interface SignalAlertCardProps {
  item: MonitoringFeedItem;
  onDismiss: (id: string) => void;
  animate?: boolean;
}

export function SignalAlertCard({ item, onDismiss, animate = true }: SignalAlertCardProps) {
  const catColor = CATEGORY_COLORS[item.category];
  const sevColor = SEVERITY_COLORS[item.severity];

  const card = (
    <div style={{
      background: `${catColor}06`,
      border: `1px solid ${catColor}20`,
      borderLeft: `3px solid ${sevColor}`,
      borderRadius: 10, padding: "12px 14px",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        {item.severity === 'INFO'
          ? <Info size={16} style={{ color: sevColor }} />
          : <AlertTriangle size={16} style={{ color: sevColor }} />
        }
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <SeverityBadge severity={item.severity} />
          <span style={{
            padding: "1px 7px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 700,
            background: `${catColor}14`, border: `1px solid ${catColor}30`, color: catColor,
          }}>
            {CATEGORY_LABELS[item.category]}
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--text-3)", marginLeft: "auto" }}>
            {item.source} · {relativeTime(item.timestamp)}
          </span>
        </div>

        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.4, marginBottom: 4 }}>
          {item.headline}
        </div>

        {item.detail && (
          <div style={{ fontSize: "0.78rem", color: "var(--text-2)", lineHeight: 1.4 }}>
            {item.detail}
          </div>
        )}

        {item.toolLink && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: item.toolLink!.replace(/^\//, '') } }))}
            style={{
              marginTop: 8, background: "none", border: "none", color: catColor,
              fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            Take action <ArrowRight size={11} />
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(item.id)}
        style={{
          flexShrink: 0, background: "none", border: "none", cursor: "pointer",
          color: "var(--text-3)", padding: 2, borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "color 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
        title="Dismiss signal"
        aria-label="Dismiss signal"
      >
        <X size={14} />
      </button>
    </div>
  );

  if (!animate) return card;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      {card}
    </motion.div>
  );
}
