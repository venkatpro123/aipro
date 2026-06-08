import { motion } from "framer-motion";
import { Shield, Bot, BookOpen, TrendingUp, Compass, ArrowRight } from "lucide-react";
import { useLayoff } from "../../context/LayoffContext";
import type { HybridResult } from "../../types/hybridResult";

interface ToolRec {
  icon: React.ReactNode;
  name: string;
  tagline: string;
  route: string;
  accentColor: string;
  reason: string;
}

function recommendTool(hr: HybridResult | null): ToolRec {
  if (!hr) {
    return {
      icon: <Compass size={22} />,
      name: "Layoff Audit",
      tagline: "Know your risk score",
      route: "/terminal",
      accentColor: "var(--cyan)",
      reason: "Start here — get your baseline risk score to unlock personalised recommendations",
    };
  }

  const total = hr.total ?? 0;
  const d1 = (hr as any).breakdown?.D1 ?? 0;
  const liquidity = (hr as any).jobMarketLiquidity?.score ?? 50;

  if (total >= 70) {
    return {
      icon: <Shield size={22} />,
      name: "Layoff Defense Center",
      tagline: "Reduce your risk right now",
      route: "/tools/layoff-defense",
      accentColor: "#ef4444",
      reason: `Your risk score is ${total} — this tool shows the exact levers to pull to bring it down`,
    };
  }
  if (d1 > 65) {
    return {
      icon: <Bot size={22} />,
      name: "AI Career Defense",
      tagline: "Protect against AI displacement",
      route: "/tools/ai-defense",
      accentColor: "#f97316",
      reason: `AI displacement risk is elevated (${Math.round(d1)}) — get your futureproofing roadmap`,
    };
  }
  if (liquidity < 40) {
    return {
      icon: <BookOpen size={22} />,
      name: "Career Readiness Center",
      tagline: "Get market-ready now",
      route: "/tools/career-readiness",
      accentColor: "#f59e0b",
      reason: "Job market liquidity is low — strengthen your resume, LinkedIn, and interview readiness",
    };
  }
  return {
    icon: <TrendingUp size={22} />,
    name: "Career Strategy Studio",
    tagline: "Plan your next move",
    route: "/tools/strategy",
    accentColor: "#10b981",
    reason: "Your risk is manageable — now is the time to map out your optimal career trajectory",
  };
}

export function RecommendedToolWidget() {
  const { state } = useLayoff();
  const tool = recommendTool(state.scoreResult as HybridResult | null);

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48 }}
      style={{
        padding: 24, display: "flex", flexDirection: "column", gap: 16,
        background: `linear-gradient(135deg, ${tool.accentColor}0a 0%, transparent 60%)`,
        borderColor: `${tool.accentColor}25`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="label-xs" style={{ color: "var(--text-3)" }}>RECOMMENDED FOR YOU</div>
        <div style={{ color: tool.accentColor }}>{tool.icon}</div>
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text)", marginBottom: 4 }}>
          {tool.name}
        </div>
        <div style={{ fontSize: "0.82rem", color: tool.accentColor, fontWeight: 600, marginBottom: 10 }}>
          {tool.tagline}
        </div>
        <div style={{
          fontSize: "0.8rem", color: "var(--text-2)", lineHeight: 1.5,
          background: `${tool.accentColor}0d`, border: `1px solid ${tool.accentColor}20`,
          borderRadius: 8, padding: "10px 12px",
        }}>
          {tool.reason}
        </div>
      </div>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: tool.route.replace("/", "") } }))}
        style={{
          background: tool.accentColor, color: "#000", border: "none", borderRadius: 10,
          padding: "10px 0", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer",
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, transition: "opacity 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        Launch Tool <ArrowRight size={15} />
      </button>
    </motion.div>
  );
}
