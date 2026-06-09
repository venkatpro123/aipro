// FiveYearArcPanel.tsx — Rule 15: Obsess Over Next 5 Years
// Shows Year 1 / Year 3 / Year 5 milestones derived from the user's current score,
// escape paths, and career velocity so the OS thinks in career time not just today.
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useLayoff } from "../../context/LayoffContext";
import type { HybridResult } from "../../types/hybridResult";
import { CareerPathVisualizer } from "./CareerPathVisualizer";

interface Milestone {
  horizon: "1 Year" | "3 Years" | "5 Years";
  headline: string;
  subtext: string;
  status: "critical" | "moderate" | "good" | "strong";
}

function statusColor(status: Milestone["status"]): string {
  return (
    status === "critical" ? "#ef4444"
    : status === "moderate" ? "#f97316"
    : status === "good" ? "#eab308"
    : "#10b981"
  );
}

function buildMilestones(hr: HybridResult): Milestone[] {
  const score = hr.total ?? 50;
  const velocity = hr.careerVelocity?.velocityScore ?? 50;
  const runway = hr.financialRunway?.runwayMonths ?? hr.userFinancialRunway?.runwayMonths ?? null;
  const firstPath = hr.escapePaths?.paths?.[0];
  const aiScore = hr.dimensions?.find(d => d.key === 'D1')?.score ?? 50;
  const roleTitle = (hr as any).roleTitle ?? (hr as any).role ?? 'your role';

  // ── Year 1 ────────────────────────────────────────────────────────────────
  let y1Headline: string;
  let y1Sub: string;
  let y1Status: Milestone["status"];

  if (score >= 75) {
    y1Status = "critical";
    y1Headline = "Stabilize and survive the transition";
    y1Sub = `At ${score}% risk, Year 1 is about creating options — not optimizing. Build your escape runway, complete emergency financial reserves, and land 2+ external offers.`;
  } else if (score >= 50) {
    y1Status = "moderate";
    y1Headline = "Reduce risk and build leverage";
    y1Sub = `Your risk is elevated. Year 1: complete the top 3 actions, bring your risk score below 50, and build 2 new skill credentials so you control the narrative in negotiations.`;
  } else if (velocity >= 60) {
    y1Status = "moderate";
    y1Headline = "Accelerate before the plateau compounds";
    y1Sub = `Your company risk is low but career velocity is slow. Year 1: take visible wins, request a stretch role, or ship a project that puts your name in front of leadership.`;
  } else {
    y1Status = "good";
    y1Headline = "Compound your current strong position";
    y1Sub = `You're well-positioned. Year 1: deepen AI fluency, build your external reputation (content, talks, network), and negotiate the next compensation jump from a position of strength.`;
  }

  // ── Year 3 ────────────────────────────────────────────────────────────────
  let y3Headline: string;
  let y3Sub: string;
  let y3Status: Milestone["status"];

  if (firstPath) {
    y3Status = score >= 60 ? "moderate" : "good";
    const effort = firstPath.effort ?? "manageable";
    const targetRole = (firstPath as any).targetRole ?? (firstPath as any).title ?? "the identified opportunity";
    y3Headline = `Move into: ${typeof targetRole === 'string' ? targetRole : 'your strongest escape path'}`;
    y3Sub = `Your best path has ${effort} effort required. Year 3 target: complete the transition, establish yourself in the new domain, and be earning at or above your current total comp.`;
  } else if (aiScore > 60) {
    y3Status = "critical";
    y3Headline = "AI displacement peaks in your current role";
    y3Sub = `D1 score is ${Math.round(aiScore)}/100. By Year 3, the AI displacement curve in ${roleTitle} will be steeper. The transition window is Year 1–2 — waiting until Year 3 costs you leverage.`;
  } else {
    y3Status = "good";
    y3Headline = "Senior IC or first leadership role";
    y3Sub = `With your current trajectory, Year 3 is the natural inflection point to Principal / Staff / Head-of depending on your track. Start positioning now — leadership roles fill 12–18 months in advance.`;
  }

  // ── Year 5 ────────────────────────────────────────────────────────────────
  let y5Headline: string;
  let y5Sub: string;
  let y5Status: Milestone["status"] = "strong";

  if (runway !== null && runway < 3 && score >= 70) {
    y5Status = "critical";
    y5Headline = "Financial independence requires addressing runway first";
    y5Sub = `With ${runway} months of runway today, Year 5 financial security starts with the next 90 days — build the emergency fund to 6 months before any other goal.`;
  } else if (aiScore > 70) {
    y5Status = "moderate";
    y5Headline = "AI-native operator or domain expert";
    y5Sub = `In 5 years, roles like ${roleTitle} will be 50–70% AI-augmented. The winners will be those who become the human decision layer on top of AI systems — not those who compete with them.`;
  } else {
    y5Headline = "Domain authority + financial optionality";
    y5Sub = `Year 5 goal: you are known in your domain, you have 12+ months of financial runway, you have 3+ offers available at any time, and you choose your next move — not respond to a forced change.`;
  }

  return [
    { horizon: "1 Year", headline: y1Headline, subtext: y1Sub, status: y1Status },
    { horizon: "3 Years", headline: y3Headline, subtext: y3Sub, status: y3Status },
    { horizon: "5 Years", headline: y5Headline, subtext: y5Sub, status: y5Status },
  ];
}

export function FiveYearArcPanel() {
  const { state } = useLayoff();
  const hr = state.scoreResult as HybridResult | null;

  if (!hr) return null;

  const milestones = buildMilestones(hr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "rgba(234,179,8,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <TrendingUp size={14} style={{ color: "#eab308" }} />
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(234,179,8,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            5-YEAR ARC
          </div>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginTop: 1 }}>
            Where your career is heading
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {milestones.map((m, i) => {
          const color = statusColor(m.status);
          return (
            <div key={m.horizon} style={{ display: "flex", gap: 14 }}>
              {/* Left: connector line + dot */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: color,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 8px ${color}55`,
                  flexShrink: 0, marginTop: 4,
                }} />
                {i < milestones.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.08)", minHeight: 24, marginTop: 4 }} />
                )}
              </div>

              {/* Right: content */}
              <div style={{ paddingBottom: i < milestones.length - 1 ? 20 : 0 }}>
                <div style={{
                  display: "inline-block",
                  fontSize: "0.68rem", fontWeight: 700,
                  color: color,
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  borderRadius: 5, padding: "1px 7px",
                  fontFamily: "var(--font-mono, monospace)",
                  marginBottom: 6,
                }}>
                  {m.horizon}
                </div>
                <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.35, marginBottom: 5 }}>
                  {m.headline}
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
                  {m.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rule 9+16: Career Path Visualizer — escape path as visual journey */}
      <CareerPathVisualizer />
    </motion.div>
  );
}
