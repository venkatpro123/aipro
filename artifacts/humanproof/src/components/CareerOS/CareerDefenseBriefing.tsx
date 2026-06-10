// CareerDefenseBriefing.tsx — Career OS: Daily Career Defense Briefing
//
// The daily habit loop. A feed of dated, causal defense events — each with a
// signed protection-score impact — that answers "Am I safer today than
// yesterday?" Generated from the Twin trajectories + monitoring + score change.
//
// Self-contained: builds its own briefing from the HybridResult on mount and
// renders the verdict, the net protection impact, the event feed, and today's
// defensive actions. Renders nothing until an audit exists.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchUserProfile } from "../../services/userProfileService";
import { buildCareerDefenseBriefing, type CareerDefenseBriefing as Briefing, type CareerDefenseEvent } from "../../services/careerDefenseBriefingService";
import type { HybridResult } from "../../types/hybridResult";

interface Props {
  hr: HybridResult | null;
  companyName: string | null;
}

const TONE: Record<CareerDefenseEvent["tone"], { color: string; dot: string }> = {
  positive: { color: "#10b981", dot: "🟢" },
  neutral:  { color: "rgba(255,255,255,0.5)", dot: "⚪" },
  warning:  { color: "#f59e0b", dot: "🟡" },
  critical: { color: "#ef4444", dot: "🔴" },
};

const CATEGORY_LABEL: Record<CareerDefenseEvent["category"], string> = {
  score: "RISK", ai: "AI", market: "MARKET", skill: "SKILLS",
  company: "COMPANY", financial: "FINANCIAL", opportunity: "OPPORTUNITY",
};

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function CareerDefenseBriefing({ hr, companyName }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  useEffect(() => {
    if (!hr) { setBriefing(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const profile = user ? await fetchUserProfile().catch(() => null) : null;
        const b = await buildCareerDefenseBriefing(hr, profile, companyName);
        if (!cancelled) setBriefing(b);
      } catch {
        if (!cancelled) setBriefing(null);
      }
    })();
    return () => { cancelled = true; };
  }, [hr, companyName, user]);

  if (!hr || !briefing) return null;

  const verdictMeta = briefing.verdict === "safer"
    ? { color: "#10b981", label: "SAFER TODAY", icon: "🛡️" }
    : briefing.verdict === "exposed"
      ? { color: "#ef4444", label: "EXPOSURE UP", icon: "⚠️" }
      : { color: "#f59e0b", label: "HOLDING STEADY", icon: "📊" };

  const net = briefing.netProtectionImpact;

  return (
    <div style={{ marginBottom: 16, padding: "18px 20px", borderRadius: 13, background: `linear-gradient(135deg, ${verdictMeta.color}08 0%, rgba(255,255,255,0.01) 100%)`, border: `1px solid ${verdictMeta.color}22` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "rgba(255,255,255,0.27)", letterSpacing: "0.13em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono, monospace)" }}>
            DAILY DEFENSE BRIEFING
          </span>
          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono, monospace)" }}>{todayLabel()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: "0.66rem", fontWeight: 800, color: verdictMeta.color, background: `${verdictMeta.color}16`, border: `1px solid ${verdictMeta.color}30`, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.05em" }}>
            {verdictMeta.icon} {verdictMeta.label}
          </span>
          {net !== 0 && (
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: net > 0 ? "#10b981" : "#ef4444", fontFamily: "var(--font-mono, monospace)" }}>
              {net > 0 ? "+" : ""}{net} pts
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontSize: "0.86rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.5, marginBottom: briefing.events.length > 0 ? 14 : 0 }}>
        {briefing.summary}
      </div>

      {/* Event feed */}
      {briefing.events.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {briefing.events.map(ev => {
            const tone = TONE[ev.tone];
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => ev.toolLink && navigate(ev.toolLink)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 11, textAlign: "left", width: "100%",
                  padding: "10px 12px", borderRadius: 9, cursor: ev.toolLink ? "pointer" : "default",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => { if (ev.toolLink) (e.currentTarget as HTMLElement).style.borderColor = `${tone.color}40`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
              >
                <span style={{ fontSize: 11, flexShrink: 0, marginTop: 2 }}>{tone.dot}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", fontFamily: "var(--font-mono, monospace)" }}>
                      {CATEGORY_LABEL[ev.category]}
                    </span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.78)", lineHeight: 1.35 }}>{ev.headline}</span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.45 }}>{ev.detail}</div>
                  <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)", marginTop: 4, fontFamily: "var(--font-mono, monospace)" }}>{ev.evidence}</div>
                </div>
                <span style={{ flexShrink: 0, fontSize: "0.78rem", fontWeight: 800, color: ev.protectionImpact > 0 ? "#10b981" : "#ef4444", fontFamily: "var(--font-mono, monospace)" }}>
                  {ev.protectionImpact > 0 ? "+" : ""}{ev.protectionImpact}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Today's defense actions */}
      {briefing.defenseActions.length > 0 && (
        <div style={{ padding: "11px 14px", borderRadius: 9, background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.12)" }}>
          <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "var(--cyan)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8, fontFamily: "var(--font-mono, monospace)" }}>
            Today's Defense Actions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {briefing.defenseActions.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, fontSize: "0.7rem", fontWeight: 800, color: "var(--cyan)", fontFamily: "var(--font-mono, monospace)", marginTop: 1 }}>{i + 1}.</span>
                <span style={{ fontSize: "0.79rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.45 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
