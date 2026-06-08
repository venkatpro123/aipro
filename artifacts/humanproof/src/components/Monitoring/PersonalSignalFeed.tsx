import { AnimatePresence, motion } from "framer-motion";
import { User, AlertTriangle, Battery, Network } from "lucide-react";
import { SignalAlertCard } from "./SignalAlertCard";
import { useLayoff } from "../../context/LayoffContext";
import type { MonitoringFeedItem } from "../../types/careerOS";
import type { HybridResult } from "../../types/hybridResult";

interface IntelligenceCard {
  id: string;
  icon: React.ReactNode;
  headline: string;
  detail: string;
  actionLabel: string;
  actionRoute: string;
  color: string;
}

function buildIntelligenceCards(hr: HybridResult | null): IntelligenceCard[] {
  if (!hr) return [];
  const cards: IntelligenceCard[] = [];

  // Skill decay warning
  const skillDecayRisk = (hr as any)?.skillPortfolioFit?.skillDecayRisk
    ?? (hr as any)?.skillPortfolio?.decayRisk
    ?? null;
  if (skillDecayRisk === 'HIGH' || skillDecayRisk === 'CRITICAL') {
    cards.push({
      id: 'skill-decay',
      icon: <AlertTriangle size={15} />,
      headline: 'Skill decay detected in your portfolio',
      detail: 'One or more of your core skills is becoming obsolete faster than average. Upskilling now reduces displacement risk by up to 18%.',
      actionLabel: 'View AI Defense',
      actionRoute: '/tools/ai-defense',
      color: '#f97316',
    });
  }

  // Financial runway warning
  const runwayMonths = (hr as any)?.financialRunway?.runwayMonths
    ?? (hr as any)?.financialContext?.runwayMonths
    ?? null;
  if (typeof runwayMonths === 'number' && runwayMonths < 6) {
    cards.push({
      id: 'runway-warning',
      icon: <Battery size={15} />,
      headline: `Only ${runwayMonths} month${runwayMonths === 1 ? '' : 's'} of runway`,
      detail: 'Your financial runway is below the recommended 6-month threshold. Strengthen your safety net before taking any career risks.',
      actionLabel: 'Career Insurance',
      actionRoute: '/tools/career-insurance',
      color: '#ef4444',
    });
  }

  // Network weakness warning
  const networkScore = hr.networkLeverage?.networkScore ?? null;
  if (typeof networkScore === 'number' && networkScore < 40) {
    cards.push({
      id: 'network-weak',
      icon: <Network size={15} />,
      headline: 'Network leverage is low',
      detail: 'People with strong networks find new roles 3× faster. Your current network score suggests limited visibility in the hidden job market.',
      actionLabel: 'Networking OS',
      actionRoute: '/tools/networking',
      color: '#f59e0b',
    });
  }

  return cards.slice(0, 3);
}

interface PersonalSignalFeedProps {
  items: MonitoringFeedItem[];
  onDismiss: (id: string) => void;
}

export function PersonalSignalFeed({ items, onDismiss }: PersonalSignalFeedProps) {
  const { state } = useLayoff();
  const personalItems = items.filter(i => i.category === 'personal');
  const hr = state.scoreResult as HybridResult | null;
  const intelligenceCards = personalItems.length === 0 ? buildIntelligenceCards(hr) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {personalItems.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {personalItems.map(item => (
              <SignalAlertCard key={item.id} item={item} onDismiss={onDismiss} />
            ))}
          </AnimatePresence>
        </div>
      ) : intelligenceCards.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", marginBottom: 2 }}>
            INTELLIGENCE FROM YOUR AUDIT DATA
          </div>
          <AnimatePresence>
            {intelligenceCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{
                  background: `${card.color}08`,
                  border: `1px solid ${card.color}25`,
                  borderLeft: `3px solid ${card.color}`,
                  borderRadius: 10, padding: "12px 14px",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}
              >
                <div style={{ color: card.color, flexShrink: 0, marginTop: 1 }}>{card.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--text)", marginBottom: 4, lineHeight: 1.3 }}>
                    {card.headline}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-2)", lineHeight: 1.45, marginBottom: 8 }}>
                    {card.detail}
                  </div>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: card.actionRoute.replace(/^\//, '') } }))}
                    style={{
                      background: "none", border: "none", color: card.color,
                      fontSize: "0.73rem", fontWeight: 700, cursor: "pointer", padding: 0,
                    }}
                  >
                    {card.actionLabel} →
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: "0.84rem" }}>
          <User size={24} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
          No personal alerts — your career readiness indicators are on track
        </div>
      )}
    </div>
  );
}
