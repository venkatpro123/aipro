import { AnimatePresence } from "framer-motion";
import { User } from "lucide-react";
import { SignalAlertCard } from "./SignalAlertCard";
import type { MonitoringFeedItem } from "../../types/careerOS";

interface PersonalSignalFeedProps {
  items: MonitoringFeedItem[];
  onDismiss: (id: string) => void;
}

export function PersonalSignalFeed({ items, onDismiss }: PersonalSignalFeedProps) {
  const personalItems = items.filter(i => i.category === 'personal');

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {personalItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: "0.84rem" }}>
          <User size={24} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
          No personal alerts — your career readiness indicators are on track
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {personalItems.map(item => (
              <SignalAlertCard key={item.id} item={item} onDismiss={onDismiss} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
