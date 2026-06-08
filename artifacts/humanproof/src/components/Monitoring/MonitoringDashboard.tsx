import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Briefcase, Globe2, User, Settings2, Radio, RefreshCw } from "lucide-react";
import { useMonitoringFeed } from "../../hooks/useMonitoringFeed";
import { CompanySignalFeed } from "./CompanySignalFeed";
import { RoleSignalFeed } from "./RoleSignalFeed";
import { MarketSignalFeed } from "./MarketSignalFeed";
import { PersonalSignalFeed } from "./PersonalSignalFeed";
import { MonitoringSettingsPanel } from "./MonitoringSettingsPanel";
import { SignalAlertCard } from "./SignalAlertCard";

type MonitoringTab = 'all' | 'company' | 'role' | 'market' | 'personal' | 'settings';

interface TabConfig {
  id: MonitoringTab;
  label: string;
  icon: React.ReactNode;
  category?: string;
}

const TABS: TabConfig[] = [
  { id: 'all',      label: 'All Signals', icon: <Radio size={15} /> },
  { id: 'company',  label: 'Company',     icon: <Building2 size={15} />, category: 'company' },
  { id: 'role',     label: 'Role',        icon: <Briefcase size={15} />, category: 'role' },
  { id: 'market',   label: 'Market',      icon: <Globe2 size={15} />,    category: 'market' },
  { id: 'personal', label: 'Personal',    icon: <User size={15} />,      category: 'personal' },
  { id: 'settings', label: 'Settings',    icon: <Settings2 size={15} /> },
];

export function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('all');
  const { items, isLoading, watchlist, dismiss, refetch, countByCategory } = useMonitoringFeed();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefetch = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const getCategoryCount = (cat: string) => countByCategory[cat] ?? 0;
  const totalCount = items.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: "28px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{
              margin: 0, fontSize: "clamp(1.4rem, 3.5vw, 2rem)",
              fontFamily: "var(--font-display)", fontWeight: 800,
              color: "var(--text)", letterSpacing: "-0.02em",
            }}>
              Monitoring
            </h1>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#10b981", letterSpacing: "0.08em" }}>LIVE</span>
            </div>
            {totalCount > 0 && (
              <span style={{
                padding: "2px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 800,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444",
              }}>
                {totalCount} active
              </span>
            )}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--text-3)" }}>
            Company · Role · Market · Personal — signals refreshed every 60s
          </p>
        </div>

        <button
          onClick={handleRefetch}
          disabled={isRefreshing}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text-2)", padding: "8px 14px",
            fontSize: "0.8rem", fontWeight: 600, cursor: isRefreshing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, transition: "all 150ms",
          }}
          onMouseEnter={e => { if (!isRefreshing) { (e.currentTarget as HTMLElement).style.borderColor = "var(--cyan)"; (e.currentTarget as HTMLElement).style.color = "var(--cyan)"; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </motion.div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2,
        borderBottom: "1px solid var(--border)", marginBottom: 20,
      }}>
        {TABS.map(tab => {
          const count = tab.category ? getCategoryCount(tab.category) : (tab.id === 'all' ? totalCount : 0);
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: "8px 8px 0 0",
                background: active ? "rgba(0,245,255,0.08)" : "transparent",
                border: "none", borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
                color: active ? "var(--cyan)" : "var(--text-3)",
                fontSize: "0.82rem", fontWeight: active ? 700 : 500,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 150ms",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
            >
              {tab.icon}
              {tab.label}
              {count > 0 && (
                <span style={{
                  padding: "0 5px", borderRadius: 10, fontSize: "0.63rem", fontWeight: 800,
                  background: active ? "rgba(0,245,255,0.18)" : "rgba(239,68,68,0.12)",
                  color: active ? "var(--cyan)" : "#ef4444",
                  minWidth: 18, textAlign: "center",
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-3)" }}>
              <div style={{ fontSize: "0.85rem" }}>Loading signals…</div>
            </div>
          ) : activeTab === 'all' ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", margin: "0 auto 12px", boxShadow: "0 0 10px #10b981" }} />
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>All Clear</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>No active signals across any category</div>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map(item => (
                    <SignalAlertCard key={item.id} item={item} onDismiss={dismiss} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          ) : activeTab === 'company' ? (
            <CompanySignalFeed items={items} watchlist={watchlist} onDismiss={dismiss} onWatchlistChange={() => refetch()} />
          ) : activeTab === 'role' ? (
            <RoleSignalFeed items={items} onDismiss={dismiss} />
          ) : activeTab === 'market' ? (
            <MarketSignalFeed items={items} onDismiss={dismiss} />
          ) : activeTab === 'personal' ? (
            <PersonalSignalFeed items={items} onDismiss={dismiss} />
          ) : (
            <div className="card-premium" style={{ padding: 24 }}>
              <MonitoringSettingsPanel />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
