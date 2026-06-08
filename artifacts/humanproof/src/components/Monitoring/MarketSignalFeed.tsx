import { AnimatePresence } from "framer-motion";
import { Globe2 } from "lucide-react";
import { SignalAlertCard } from "./SignalAlertCard";
import type { MonitoringFeedItem } from "../../types/careerOS";

interface MarketSignalFeedProps {
  items: MonitoringFeedItem[];
  onDismiss: (id: string) => void;
}

export function MarketSignalFeed({ items, onDismiss }: MarketSignalFeedProps) {
  const marketItems = items.filter(i => i.category === 'market');

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {marketItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: "0.84rem" }}>
          <Globe2 size={24} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
          No market alerts — macro conditions appear stable for your sector
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {marketItems.map(item => (
              <SignalAlertCard key={item.id} item={item} onDismiss={onDismiss} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
