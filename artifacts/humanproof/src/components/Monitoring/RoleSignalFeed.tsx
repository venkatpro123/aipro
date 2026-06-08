import { AnimatePresence } from "framer-motion";
import { Briefcase, TrendingDown, TrendingUp } from "lucide-react";
import { SignalAlertCard } from "./SignalAlertCard";
import { useRoleSignalPoller } from "../../hooks/useRoleSignalPoller";
import type { MonitoringFeedItem } from "../../types/careerOS";

interface RoleSignalFeedProps {
  items: MonitoringFeedItem[];
  onDismiss: (id: string) => void;
}

export function RoleSignalFeed({ items, onDismiss }: RoleSignalFeedProps) {
  const roleItems = items.filter(i => i.category === 'role');
  const { deltas } = useRoleSignalPoller();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Role dimension deltas from poller */}
      {deltas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            DIMENSION CHANGES SINCE LAST AUDIT
          </div>
          {deltas.map(d => (
            <div key={`delta-${d.dimension}`} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: d.direction === 'increased' ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)",
              border: `1px solid ${d.direction === 'increased' ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)" }}>{d.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                  {d.previousScore.toFixed(1)} → {d.currentScore.toFixed(1)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {d.direction === 'increased'
                  ? <TrendingUp size={16} style={{ color: "#ef4444" }} />
                  : <TrendingDown size={16} style={{ color: "#10b981" }} />}
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.82rem", fontWeight: 800,
                  color: d.direction === 'increased' ? "#ef4444" : "#10b981",
                }}>
                  {d.direction === 'increased' ? '+' : ''}{d.delta.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role signal feed */}
      {roleItems.length === 0 && deltas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: "0.84rem" }}>
          <Briefcase size={24} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
          No role signals — run an audit to enable role intelligence monitoring
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {roleItems.map(item => (
              <SignalAlertCard key={item.id} item={item} onDismiss={onDismiss} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
