import { AnimatePresence } from "framer-motion";
import { Building2, Plus, X, CheckCircle } from "lucide-react";
import { useState } from "react";
import { SignalAlertCard } from "./SignalAlertCard";
import { addToWatchlist, removeFromWatchlist } from "../../services/monitoringService";
import type { MonitoringFeedItem } from "../../types/careerOS";

interface CompanySignalFeedProps {
  items: MonitoringFeedItem[];
  watchlist: string[];
  onDismiss: (id: string) => void;
  onWatchlistChange: () => void;
}

export function CompanySignalFeed({ items, watchlist, onDismiss, onWatchlistChange }: CompanySignalFeedProps) {
  const [addInput, setAddInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const companyItems = items.filter(i => i.category === 'company');

  const handleAdd = async () => {
    const name = addInput.trim();
    if (!name || adding) return;
    setAdding(true);
    await addToWatchlist(name);
    setAddInput("");
    setAdding(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    onWatchlistChange();
  };

  const handleRemove = async (company: string) => {
    await removeFromWatchlist(company);
    onWatchlistChange();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Watchlist manager */}
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Building2 size={15} style={{ color: "var(--cyan)" }} />
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Company Watchlist</span>
          <span style={{
            padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 700,
            background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.2)", color: "var(--cyan)",
          }}>
            {watchlist.length}/5
          </span>
        </div>

        {watchlist.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {watchlist.map(co => (
              <div key={co} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-2)",
              }}>
                {co}
                <button
                  onClick={() => handleRemove(co)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0, display: "flex" }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {watchlist.length < 5 && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={addInput}
              onChange={e => setAddInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add company to watch..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "7px 12px", color: "var(--text)", fontSize: "0.82rem",
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addInput.trim()}
              style={{
                background: success ? "#10b981" : "var(--cyan)", color: "#000", border: "none",
                borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: "0.8rem",
                cursor: adding || !addInput.trim() ? "not-allowed" : "pointer",
                opacity: !addInput.trim() ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: 5, transition: "all 200ms",
              }}
            >
              {success ? <CheckCircle size={14} /> : <Plus size={14} />}
              {success ? "Added!" : "Watch"}
            </button>
          </div>
        )}
      </div>

      {/* Signal feed */}
      {companyItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: "0.84rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", margin: "0 auto 10px", boxShadow: "0 0 8px #10b981" }} />
          No company signals detected — your watchlist companies appear stable
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {companyItems.map(item => (
              <SignalAlertCard key={item.id} item={item} onDismiss={onDismiss} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
