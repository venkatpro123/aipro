// AIAmplificationWidget.tsx — Rule 14: Help humans work WITH AI, not against it.
// Shows 3 concrete AI-amplification moves personalized to the user's role/risk.
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { useLayoff } from "../../context/LayoffContext";
import { useNavigate } from "react-router-dom";
import type { HybridResult } from "../../types/hybridResult";

interface AmplificationMove {
  tool: string;
  howToUse: string;
  impact: string;
}

const ROLE_AMPLIFICATION: Record<string, AmplificationMove[]> = {
  software: [
    { tool: "GitHub Copilot", howToUse: "Write boilerplate 10× faster — spend saved time on system design", impact: "2–3× output velocity" },
    { tool: "Claude / GPT-4", howToUse: "Code review, documentation, PR description generation", impact: "Ship cleaner code faster" },
    { tool: "Cursor IDE", howToUse: "AI-native coding environment for complex refactors", impact: "Own the AI-native workflow others struggle with" },
  ],
  data: [
    { tool: "Julius AI", howToUse: "Natural language to data analysis — cut analysis time 70%", impact: "More time on insights, less on queries" },
    { tool: "NotebookLM", howToUse: "Synthesize research papers and internal docs at speed", impact: "Stay ahead of domain shifts" },
    { tool: "Claude Artifacts", howToUse: "Generate dashboards and visualizations from descriptions", impact: "Ship analyses 5× faster" },
  ],
  product: [
    { tool: "Claude / GPT-4", howToUse: "PRD drafts, user story generation, competitive analysis", impact: "10× faster documentation" },
    { tool: "Perplexity", howToUse: "Real-time market and competitor research with citations", impact: "Better-informed decisions faster" },
    { tool: "Notion AI", howToUse: "Roadmap synthesis and stakeholder update drafting", impact: "Reclaim 5+ hrs/week" },
  ],
  marketing: [
    { tool: "Claude / GPT-4", howToUse: "Content strategy, copy variants, A/B test ideas at scale", impact: "10× content throughput" },
    { tool: "Perplexity", howToUse: "Competitor and trend research in real-time", impact: "Stay ahead of market shifts" },
    { tool: "Runway / Midjourney", howToUse: "Visual content creation without a designer", impact: "Launch campaigns faster" },
  ],
  finance: [
    { tool: "Claude / GPT-4", howToUse: "Financial model explanation, scenario analysis narratives", impact: "Communicate insights faster" },
    { tool: "Julius AI", howToUse: "Automate Excel/Python analysis with natural language", impact: "Cut model-build time 60%" },
    { tool: "Perplexity", howToUse: "Earnings call synthesis and sector news distillation", impact: "Broader coverage, same hours" },
  ],
  default: [
    { tool: "Claude / GPT-4", howToUse: "Automate writing, summarization, and research tasks in your role", impact: "Reclaim 5–10 hrs/week" },
    { tool: "Perplexity", howToUse: "Real-time research with citations — replace 80% of search time", impact: "Faster, better-sourced decisions" },
    { tool: "NotebookLM", howToUse: "Synthesize long documents, reports, and transcripts in minutes", impact: "Read 10× more in the same time" },
  ],
};

function detectRoleFamily(hr: HybridResult | null): string {
  const role = ((hr as any)?.roleTitle ?? '').toLowerCase();
  if (/engineer|dev|software|backend|frontend|fullstack|sre|devops|ml\b|ai\b|data.sci/.test(role)) return 'software';
  if (/data|analyst|bi\b|analytics|scientist/.test(role)) return 'data';
  if (/product|pm\b|program/.test(role)) return 'product';
  if (/market|growth|content|brand|seo|demand/.test(role)) return 'marketing';
  if (/financ|account|fp&a|invest|banking|quant/.test(role)) return 'finance';
  return 'default';
}

export function AIAmplificationWidget() {
  const { state } = useLayoff();
  const navigate = useNavigate();
  const hr = state.scoreResult as HybridResult | null;

  const roleFamily = detectRoleFamily(hr);
  const moves = ROLE_AMPLIFICATION[roleFamily] ?? ROLE_AMPLIFICATION.default;
  const aiScore = hr?.dimensions?.find(d => d.key === 'D1')?.score ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      style={{
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(0,245,255,0.04) 100%)",
        border: "1px solid rgba(139,92,246,0.25)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(139,92,246,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={14} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(167,139,250,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI AMPLIFICATION
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginTop: 1 }}>
              Work with AI. Don't fight it.
            </div>
          </div>
        </div>
        {aiScore !== null && (
          <div style={{
            padding: "3px 8px", borderRadius: 6,
            background: aiScore > 60 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
            border: `1px solid ${aiScore > 60 ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
            fontSize: "0.7rem", fontWeight: 700,
            color: aiScore > 60 ? "#ef4444" : "#10b981",
            fontFamily: "var(--font-mono, monospace)",
          }}>
            D1: {Math.round(aiScore)}/100
          </div>
        )}
      </div>

      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
        The goal is not to resist AI — it's to become the person who uses it better than anyone else in your role.
      </div>

      {/* 3 amplification moves */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {moves.map((move, i) => (
          <div key={move.tool} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#a78bfa" }}>
                {i + 1}. {move.tool}
              </span>
              <span style={{
                fontSize: "0.68rem", fontWeight: 600,
                color: "#10b981",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: 5, padding: "1px 6px",
                fontFamily: "var(--font-mono, monospace)",
              }}>
                {move.impact}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
              {move.howToUse}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate('/tools/ai-defense')}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 8, padding: "8px 0",
          color: "#a78bfa", fontSize: "0.78rem", fontWeight: 700,
          cursor: "pointer", width: "100%",
          transition: "all 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.2)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.12)"; }}
      >
        Build your AI amplification plan <ArrowRight size={13} />
      </button>
    </motion.div>
  );
}
