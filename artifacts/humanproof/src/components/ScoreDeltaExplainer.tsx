// ScoreDeltaExplainer.tsx
// "Why did your score change?" — the highest re-engagement feature.
// When a returning user audits the same role, this panel breaks down EXACTLY
// which signals changed, by how many points, and why.
// Law: every number must trace to a real signal or be labeled as heuristic.

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  AlertTriangle, Shield, Cpu, BarChart, Users, Globe, Zap,
} from "lucide-react";
import type { ScoreDelta, DimensionDelta } from "../services/scoreDeltaService";

interface Props {
  delta: ScoreDelta;
  companyName?: string;
  daysAgo: number;
}

const DIM_ICONS: Record<string, React.ReactNode> = {
  L1: <BarChart className="w-3.5 h-3.5" />,
  L2: <AlertTriangle className="w-3.5 h-3.5" />,
  L3: <Cpu className="w-3.5 h-3.5" />,
  L4: <Globe className="w-3.5 h-3.5" />,
  L5: <Users className="w-3.5 h-3.5" />,
  D6: <Zap className="w-3.5 h-3.5" />,
  D7: <Shield className="w-3.5 h-3.5" />,
};

const DeltaBadge: React.FC<{ delta: number; size?: "sm" | "lg" }> = ({ delta, size = "sm" }) => {
  if (Math.abs(delta) < 1) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground font-mono font-bold"
        style={{ fontSize: size === "lg" ? "1rem" : "0.75rem" }}>
        <Minus className="w-3 h-3" /> No change
      </span>
    );
  }
  const isUp = delta > 0;
  const color = isUp ? "var(--red)" : "var(--emerald)";
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1 font-mono font-black"
      style={{ color, fontSize: size === "lg" ? "1.1rem" : "0.75rem" }}>
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3 h-3"} />
      {isUp ? "+" : ""}{delta} pts
    </span>
  );
};

const DimensionRow: React.FC<{ dim: DimensionDelta }> = ({ dim }) => {
  const [expanded, setExpanded] = useState(false);
  const isUp = dim.delta > 0;
  const color = isUp ? "var(--red)" : "var(--emerald)";

  return (
    <div
      className="rounded-lg border border-[var(--alpha-bg-05)] overflow-hidden cursor-pointer hover:border-[var(--alpha-bg-12)] transition-colors"
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span style={{ color }} className="flex-shrink-0">
          {DIM_ICONS[dim.key] ?? <Shield className="w-3.5 h-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate">{dim.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {dim.previous} → {dim.current}
          </div>
        </div>
        <DeltaBadge delta={dim.delta} />
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-3 space-y-2"
              style={{ borderTop: `1px solid ${color}18`, paddingTop: "8px" }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">{dim.driver}</p>
              {dim.counterfactual && (
                <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2">
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-1">
                    Counterfactual
                  </p>
                  <p className="text-xs text-cyan-300/80 leading-relaxed">{dim.counterfactual}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ScoreDeltaExplainer: React.FC<Props> = ({ delta, companyName, daysAgo }) => {
  const [showAll, setShowAll] = useState(false);

  if (Math.abs(delta.delta) < 1) {
    return (
      <div className="glass-panel p-4 rounded-xl flex items-center gap-3">
        <Minus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div>
          <div className="text-sm font-bold">Score unchanged since last audit</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Audited {daysAgo}d ago — all tracked signals are consistent with previous assessment.
          </div>
        </div>
      </div>
    );
  }

  const isRiskUp = delta.delta > 0;
  const headerColor = isRiskUp ? "var(--red)" : "var(--emerald)";
  const dims = delta.dimensionDeltas ?? [];
  const topDims = showAll ? dims : dims.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: `${headerColor}30`, background: `${headerColor}05` }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-5" style={{ borderBottom: `1px solid ${headerColor}15` }}>
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: `${headerColor}15` }}
        >
          {isRiskUp
            ? <TrendingUp className="w-5 h-5" style={{ color: headerColor }} />
            : <TrendingDown className="w-5 h-5" style={{ color: headerColor }} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="text-sm font-black">
              {isRiskUp ? "Risk increased" : "Risk improved"} since your last audit
            </span>
            <DeltaBadge delta={delta.delta} size="sm" />
          </div>
          <div className="text-xs text-muted-foreground">
            Previous score: <span className="font-mono font-bold">{delta.previous}</span>
            {" → "}
            Current: <span className="font-mono font-bold" style={{ color: headerColor }}>{delta.current}</span>
            {" · "}
            Last audited {daysAgo} days ago
            {companyName && ` · ${companyName}`}
          </div>
        </div>
      </div>

      {/* Dimension attribution */}
      {dims.length > 0 ? (
        <div className="p-4 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            Signal Attribution — What Changed
          </div>
          {topDims.map(dim => (
            <DimensionRow key={dim.key} dim={dim} />
          ))}
          {dims.length > 3 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full text-xs text-muted-foreground hover:text-[var(--cyan)] transition-colors py-1 font-mono"
            >
              {showAll ? "▲ Show fewer signals" : `▼ Show ${dims.length - 3} more signals`}
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 text-xs text-muted-foreground">
          Signal-level attribution requires a previous audit with breakdown data.
          Future audits will show the full change explanation.
        </div>
      )}

      {/* Summary statement */}
      <div
        className="px-4 py-3 text-xs leading-relaxed"
        style={{ background: `${headerColor}08`, borderTop: `1px solid ${headerColor}15` }}
      >
        {isRiskUp
          ? `Your risk increased ${Math.abs(delta.delta)} pts over ${daysAgo} days. The ${dims[0]?.label ?? "primary dimension"} is the dominant driver. Review the breakdown above to understand which specific signal changed and what you can do about it.`
          : `Your risk improved ${Math.abs(delta.delta)} pts over ${daysAgo} days. ${dims[0]?.label ?? "A key dimension"} contributed the most to this improvement. Continue the actions that drove this progress.`}
      </div>
    </motion.div>
  );
};

export default ScoreDeltaExplainer;
