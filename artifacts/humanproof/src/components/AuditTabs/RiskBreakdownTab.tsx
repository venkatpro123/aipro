// RiskBreakdownTab.tsx
// Detailed breakdown of risk dimensions — Answers "What dimensions are driving my risk?"
// Displays: 5/6 dimension score cards with narratives, radar, confidence interval,
//           key risk drivers, and data quality metrics.

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, BarChart, Clock, Activity, CheckSquare,
  TrendingUp, TrendingDown, DollarSign, Shield, Cpu,
  Globe, Briefcase, Users, Zap, Info,
} from "lucide-react";
import { DimensionRadar } from "@/components/DimensionRadar";
import { KeyRiskDriversPanel } from "@/components/LayoffCalculator/KeyRiskDriversPanel";
import { StatCard } from "./common/StatCard";
import { SectionHeader } from "./common/SectionHeader";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import { buildDimensionProvenance } from "../../services/dimensionProvenance";
import { formatLayerNarrativeOrFallback } from "../../utils/layerNarrativeFormatter";
import { SignalFreshnessDot } from "../SignalFreshnessDot";
import type { CompanyData } from "../../data/companyDatabase";
import type { TabProps } from "./common/types";
// v12.0
import { CareerPortfolioPanel } from "./common/CareerPortfolioPanel";
import { SignalAttributionWaterfall } from "./common/SignalAttributionWaterfall";
import { getEffectiveFormulaWeights } from "../../services/layoffScoreEngine";

// ---------------------------------------------------------------------------
// Dimension metadata — labels + weights + narrative generators
// ---------------------------------------------------------------------------

const getScoreColor = (score: number): string => {
  if (score < 30) return "var(--emerald)";
  if (score < 45) return "var(--green)";
  if (score < 60) return "var(--amber)";
  if (score < 75) return "var(--orange)";
  return "var(--red)";
};

interface DimMeta {
  label: string;
  fullLabel: string;
  weight: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  narrativeLow: string;
  narrativeMid: string;
  narrativeHigh: string;
}

const L_DIMENSIONS: Record<string, DimMeta> = {
  L1: {
    label: "Financial Health",
    fullLabel: "Company Financial Vulnerability",
    weight: 0.16, // COMPOSITE_FORMULA_WEIGHTS.L1_directFinancial
    icon: DollarSign,
    narrativeLow:  "Company financials are stable. Revenue per employee, growth trajectory, and cash position are within healthy bounds for the sector.",
    narrativeMid:  "Moderate financial stress detected. Revenue deceleration or elevated cost ratios suggest near-term cost-containment pressure.",
    narrativeHigh: "Significant financial distress signals present. Revenue contraction, high burn rate, or unfavorable efficiency ratios indicate restructuring risk within 12 months.",
  },
  L2: {
    label: "Layoff History",
    fullLabel: "Layoff & Workforce Instability",
    weight: 0.06, // COMPOSITE_FORMULA_WEIGHTS.L2_directLayoffHistory
    icon: Users,
    narrativeLow:  "No material layoff history in the 24-month window. Workforce stability is a positive retention signal.",
    narrativeMid:  "One documented workforce reduction on record. Single events carry ~60% base rate for a follow-up within 9 months.",
    narrativeHigh: "Repeated workforce reductions detected. Chronic restructuring patterns significantly elevate individual-level displacement probability.",
  },
  L3: {
    label: "Role Displacement",
    fullLabel: "AI Role Displacement Risk",
    weight: 0.18, // COMPOSITE_FORMULA_WEIGHTS.D1_taskAutomatability
    icon: Cpu,
    narrativeLow:  "Your role has strong structural protection against AI displacement. Human judgment, trust, and cross-context reasoning are core to value delivery.",
    narrativeMid:  "Moderate AI exposure in your role category. The execution layer is being augmented by AI, but oversight and strategy functions remain human-native.",
    narrativeHigh: "High task automatability in your role. AI tools are actively absorbing execution-layer work in this function across the market.",
  },
  L5: {
    label: "Regional Risk",
    fullLabel: "Regional & Macro Headwinds",
    weight: 0.18, // COMPOSITE_FORMULA_WEIGHTS.D4_experienceProtection
    icon: Globe,
    narrativeLow:  "Your geographic market has a favorable labor demand profile and moderate AI adoption pace relative to global peers.",
    narrativeMid:  "Regional labor market conditions present moderate headwinds — some demand softness or above-average tech-sector job cuts in your region.",
    narrativeHigh: "Elevated regional risk: high AI adoption rate, labor market softness, or sector concentration that amplifies displacement probability in your geography.",
  },
};

const D_DIMENSIONS: Record<string, DimMeta> = {
  D1: {
    label: "Task Automatability",
    fullLabel: "Task Automatability Score",
    weight: 0.35,
    icon: Cpu,
    narrativeLow:  "Less than 30% of your daily tasks can be fully automated by current AI systems. High judgment and context requirements protect your work.",
    narrativeMid:  "Roughly 40–60% of task volume is automatable with enterprise AI today. Protecting the judgment and synthesis layer is key.",
    narrativeHigh: "Over 65% of your task portfolio is automatable with current-generation AI. This is the primary driver of your risk score.",
  },
  D2: {
    label: "AI Tool Maturity",
    fullLabel: "AI Tool Deployment Maturity",
    weight: 0.25,
    icon: Zap,
    narrativeLow:  "AI tools targeting this role are in early-stage or experimental deployment — not yet enterprise-ready at scale.",
    narrativeMid:  "AI tools for this role are in active but uneven deployment. Some organizations are using them; full saturation is 2–4 years away.",
    narrativeHigh: "Mature, enterprise-deployed AI tools are actively absorbing tasks in this role category across thousands of organizations today.",
  },
  D3: {
    label: "Human Amplification",
    fullLabel: "Human Amplification Value",
    weight: 0.15,
    icon: Users,
    narrativeLow:  "High human amplification — AI tools strongly benefit from human oversight, empathy, and contextual judgment in this role. Low automation risk.",
    narrativeMid:  "Moderate human value-add. Some functions benefit from human oversight, but significant task volume can proceed without it.",
    narrativeHigh: "Low human amplification advantage. AI systems can operate many functions in this role with minimal human intervention.",
  },
  D4: {
    label: "Experience Shield",
    fullLabel: "Experience & Seniority Shield",
    weight: 0.10,
    icon: Shield,
    narrativeLow:  "Strong experience protection. Seniority, track record, and accumulated institutional knowledge provide significant displacement buffering.",
    narrativeMid:  "Moderate experience shield. Some protection from seniority, but execution-layer skills that AI targets may offset the advantage.",
    narrativeHigh: "Experience shield is limited for this role at your level. AI displacement risk applies regardless of tenure in execution-heavy functions.",
  },
  D6: {
    label: "Social Capital",
    fullLabel: "Social Capital & Network Moat",
    weight: 0.07,
    icon: Briefcase,
    narrativeLow:  "Strong network and stakeholder relationships provide meaningful protection — jobs are filled through warm referrals during downturns.",
    narrativeMid:  "Moderate professional network. Some insulation from relationships, but network density is below the level needed for proactive protection.",
    narrativeHigh: "Limited social capital signal for this role. Network moats are weak — active relationship building should be prioritized.",
  },
};

const getDimMeta = (key: string): DimMeta | null =>
  L_DIMENSIONS[key] ?? D_DIMENSIONS[key] ?? null;

const getNarrative = (meta: DimMeta, score: number): string => {
  if (score < 35) return meta.narrativeLow;
  if (score < 65) return meta.narrativeMid;
  return meta.narrativeHigh;
};

// ---------------------------------------------------------------------------
// LayerScoreCard — enhanced with narrative and change indicators
// ---------------------------------------------------------------------------

interface LayerScoreCardProps {
  dim: { key: string; label: string; score: number; weightCalibrationStatus?: 'regression_derived' | 'uncalibrated_estimate'; weightCalibratedAt?: string };
  weights: Record<string, number>;
  result: TabProps["result"];
  companyData: CompanyData | null;
}

// Raw hex values — used for alpha-compositing (background, border, glow).
// CSS variables cannot be combined with hex-alpha suffixes, so hex is required here.
const DIM_COLORS_HEX: Record<string, string> = {
  L1: '#00d4e0', L2: 'var(--color-amber500-text)', L3: '#7c3aed',
  L4: 'var(--color-emerald-text)', L5: 'var(--color-red-text)',
  D1: '#7c3aed', D2: '#a78bfa', D3: '#06b6d4',
  D4: 'var(--color-red-text)', D5: 'var(--color-emerald-text)',
  D6: '#06b6d4', D7: '#a78bfa', D8: '#f43f5e',
};

// CSS variable references — used for text color and SVG stroke (no alpha needed).
const DIM_COLOR_MAP: Record<string, string> = {
  L1: 'var(--chart-1)', L2: 'var(--chart-2)', L3: 'var(--chart-3)',
  L4: 'var(--chart-4)', L5: 'var(--chart-5)',
  D1: 'var(--chart-3)', D2: 'var(--chart-7)', D3: 'var(--chart-6)',
  D4: 'var(--chart-5)', D5: 'var(--chart-4)',
  D6: 'var(--chart-6)', D7: 'var(--chart-7)', D8: 'var(--chart-8)',
};

const LayerScoreCard: React.FC<LayerScoreCardProps> = ({ dim, weights, result, companyData }) => {
  const meta = getDimMeta(dim.key);
  const weight = weights[dim.key] ?? 0;
  const score = dim.score; // 0–100
  const riskColor = getScoreColor(score);
  const dimColor = DIM_COLOR_MAP[dim.key] ?? riskColor;      // CSS var — for text/stroke
  const dimHex   = DIM_COLORS_HEX[dim.key] ?? '#00d4e0';    // raw hex — for alpha backgrounds
  const weightPct = Math.round(weight * 100);
  const contribution = Math.round((score / 100) * weight * 100);
  const narrative = meta ? getNarrative(meta, score) : null;
  const Icon = meta?.icon ?? Activity;

  const verdictLabel = score < 35 ? "PROTECTED" : score < 65 ? "MODERATE" : "ELEVATED";
  const verdictColor = score < 35 ? "var(--emerald)" : score < 65 ? "var(--amber)" : "var(--red)";

  const provenance = React.useMemo(
    () => buildDimensionProvenance(dim.key, score, result, companyData),
    [dim.key, score, result, companyData],
  );

  // v15.0: Replace static low/mid/high narrative with one composed from the
  // actual top driver signals when provenance is available. The original
  // hardcoded narrative remains the graceful fallback so the UI never blanks.
  const composedNarrative = meta
    ? formatLayerNarrativeOrFallback(
        dim.key,
        meta.fullLabel,
        score,
        narrative ?? '',
        provenance,
        companyData?.name ?? (result as any).companyName ?? undefined,
      )
    : narrative;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group transition-all duration-300"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-5)",
        borderRadius: "var(--radius-xl)",
        gap: "var(--space-3)",
        border: `1px solid ${dimHex}30`,
        background: `${dimHex}0a`,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.25s var(--ease-out), border-color 0.25s",
      }}
      whileHover={{ boxShadow: `0 4px 24px ${dimHex}28` }}
    >
      {/* Top gradient accent stripe */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, ${dimColor} 0%, ${dimColor}40 100%)`,
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
      }} />

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
          {/* Dimension label */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground leading-tight">
              {meta?.fullLabel ?? dim.label}
            </span>
          </div>

          {/* Score + verdict badges */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2rem",
                fontWeight: 900,
                letterSpacing: "-0.05em",
                lineHeight: 1,
                color: riskColor,
              }}
            >
              {score}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-3)", opacity: 0.6 }}>/100</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                fontWeight: 900,
                padding: "2px 6px",
                borderRadius: "4px",
                background: `${verdictColor}15`,
                color: verdictColor,
                border: `1px solid ${verdictColor}30`,
                letterSpacing: "0.10em",
              }}
            >
              {verdictLabel}
            </span>
            {/* v15.0 — Per-layer freshness dot summarising signal age. */}
            {provenance && provenance.subSignals.length > 0 && (() => {
              const stale = provenance.subSignals.some((s) =>
                /(\d+)\s*day/.test(s.ageLabel) && Number(RegExp.$1) >= 30,
              );
              const aging = provenance.subSignals.some((s) =>
                /(\d+)\s*day/.test(s.ageLabel) && Number(RegExp.$1) >= 14,
              );
              const cls = stale ? 'stale' : aging ? 'mid' : 'fresh';
              return <SignalFreshnessDot freshnessClass={cls} />;
            })()}
          </div>
        </div>

        {/* Icon */}
        <div style={{
          padding: "8px",
          borderRadius: "10px",
          background: `${dimHex}18`,
          border: `1px solid ${dimHex}28`,
          flexShrink: 0,
          opacity: 0.7,
          transition: "opacity 0.2s",
        }} className="group-hover:opacity-100">
          <Icon className="w-4 h-4" style={{ color: dimColor }} />
        </div>
      </div>

      {/* Gradient progress bar */}
      <div className="gradient-bar-track">
        <motion.div
          className="gradient-bar"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: score / 100 }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.15 }}
          style={{
            height: "100%",
            borderRadius: "3px",
            background: `linear-gradient(90deg, ${dimHex}aa 0%, ${dimHex} 100%)`,
            boxShadow: `0 0 12px ${dimHex}55`,
            transformOrigin: "left center",
          }}
        />
      </div>

      {/* Weight + contribution row */}
      <div className="flex justify-between items-center flex-wrap gap-1" style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
        <span style={{ color: "var(--text-3)", textTransform: "uppercase" }}>
          Weight <span style={{ color: "var(--text-2)", fontWeight: 800, marginLeft: "4px" }}>{weightPct}%</span>
          {/* Calibration status badge — shows provenance of the weight value */}
        </span>
        <span style={{ color: "var(--text-3)", textTransform: "uppercase" }}>
          Contributes <span style={{ color: dimColor, fontWeight: 900, marginLeft: "4px" }}>+{contribution} pts</span>
        </span>
      </div>

      {/* Narrative */}
      {narrative && (
        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.7rem",
          color: "var(--text-3)",
          lineHeight: 1.6,
          borderTop: "1px solid var(--alpha-bg-06)",
          paddingTop: "var(--space-3)",
          marginTop: "2px",
        }}>
          {composedNarrative}
        </p>
      )}
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Score Summary Banner
// ---------------------------------------------------------------------------

const ScoreSummaryBanner: React.FC<{ result: TabProps["result"] }> = ({ result }) => {
  const dims = result.dimensions;
  const topRisk = [...dims].sort((a, b) => b.score - a.score)[0];
  const topProtective = [...dims].sort((a, b) => a.score - b.score)[0];
  const topRiskMeta = topRisk ? getDimMeta(topRisk.key) : null;
  const topProtMeta = topProtective ? getDimMeta(topProtective.key) : null;
  // Use hex values for alpha-compositing in backgrounds/borders
  const riskDimHex   = topRisk      ? (DIM_COLORS_HEX[topRisk.key]      ?? 'var(--color-red-text)') : 'var(--color-red-text)';
  const protDimHex   = topProtective ? (DIM_COLORS_HEX[topProtective.key] ?? 'var(--color-emerald-text)') : 'var(--color-emerald-text)';
  // CSS vars for text/stroke color properties
  const riskDimColor = topRisk      ? (DIM_COLOR_MAP[topRisk.key]      ?? 'var(--red)')     : 'var(--red)';
  const protDimColor = topProtective ? (DIM_COLOR_MAP[topProtective.key] ?? 'var(--emerald)') : 'var(--emerald)';

  if (!topRisk || !topProtective) return null;

  return (
    <div className="grid md:grid-cols-2 gap-3 mb-6">
      {/* Primary risk driver card */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          padding: '16px',
          borderRadius: '14px',
          border: `1px solid rgba(239,68,68,0.22)`,
          background: 'rgba(239,68,68,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--color-red-text)', opacity: 0.7 }} />
        <div className="flex items-start gap-3">
          <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-red-text)' }} />
          <div className="flex-1 min-w-0">
            <div className="data-label mb-1" style={{ color: 'var(--color-red-text)' }}>Primary Risk Driver</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900,
                letterSpacing: '-0.04em', lineHeight: 1, color: riskDimColor,
              }}>
                {topRisk.score}
              </span>
              <span className="data-label" style={{ opacity: 0.5 }}>/100</span>
            </div>
            <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-2)' }}>
              {topRiskMeta?.fullLabel ?? topRisk.label}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {topRiskMeta ? getNarrative(topRiskMeta, topRisk.score) : "Highest-scoring dimension in your profile."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Strongest protection card */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        style={{
          padding: '16px',
          borderRadius: '14px',
          border: `1px solid rgba(16,185,129,0.22)`,
          background: 'rgba(16,185,129,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--color-emerald-text)', opacity: 0.7 }} />
        <div className="flex items-start gap-3">
          <TrendingDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-emerald-text)' }} />
          <div className="flex-1 min-w-0">
            <div className="data-label mb-1" style={{ color: 'var(--color-emerald-text)' }}>Strongest Protection</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900,
                letterSpacing: '-0.04em', lineHeight: 1, color: protDimColor,
              }}>
                {topProtective.score}
              </span>
              <span className="data-label" style={{ opacity: 0.5 }}>/100</span>
            </div>
            <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-2)' }}>
              {topProtMeta?.fullLabel ?? topProtective.label}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {topProtMeta ? getNarrative(topProtMeta, topProtective.score) : "Lowest-scoring (most protected) dimension."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Score Confidence Interval display
// ---------------------------------------------------------------------------

const ScoreConfidenceInterval: React.FC<{
  score: number;
  confidenceInterval: { low: number; high: number };
  confidencePercent: number;
}> = ({ score, confidenceInterval, confidencePercent }) => {
  const { low, high } = confidenceInterval;
  const range = high - low;
  const halfRange = Math.round(range / 2);
  const color = getScoreColor(score / 100);
  const [showEpistemicNote, setShowEpistemicNote] = useState(false);

  return (
    <div className="glass-panel-heavy p-[var(--space-6)] rounded-xl border border-[var(--border-2)]">
      <div className="flex justify-between items-center mb-[var(--space-6)]">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="label-sm text-[var(--cyan)] tracking-[0.2em] font-black uppercase">Accuracy Range</div>
          <button
            type="button"
            onClick={() => setShowEpistemicNote(v => !v)}
            title="What does this interval mean?"
            aria-label="Explain confidence interval"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', color: showEpistemicNote ? 'var(--cyan)' : 'var(--alpha-text-35)', display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color 0.15s' }}
          >
            <Info size={12} />
          </button>
        </div>
      </div>

      {/* Epistemic uncertainty explanation — toggles on info click */}
      {showEpistemicNote && (
        <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            What does this range mean?
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', lineHeight: 1.65, color: 'var(--alpha-text-78)' }}>
            This range shows <strong style={{ color: 'var(--alpha-text-92)' }}>how much uncertainty</strong> exists in your score based on how complete and fresh the available data is.
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.65, color: 'var(--alpha-text-78)' }}>
            A ±{halfRange}pt interval means your true risk could be anywhere from{' '}
            <strong style={{ color: 'var(--alpha-text-92)', fontFamily: 'var(--font-mono)' }}>{low}</strong> to{' '}
            <strong style={{ color: 'var(--alpha-text-92)', fontFamily: 'var(--font-mono)' }}>{high}</strong>.
            The central number (<span style={{ fontFamily: 'var(--font-mono)', color }}>{score}</span>) is the best estimate given available signals. More data narrows this range.
          </p>
        </div>
      )}

      <div className="h-12 relative flex items-center mb-6 px-1">
        <div className="w-full bg-[var(--alpha-bg-05)] h-1.5 rounded-full relative">
          <motion.div
            className="absolute h-full rounded-full"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            style={{ left: `${low}%`, width: `${range}%`, backgroundColor: `${color}33`, originX: 0 }}
          />
          <div className="absolute h-6 w-[1px]" style={{ left: `${low}%`, top: "-10px", backgroundColor: "var(--border-2)" }}>
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">{low}%</div>
          </div>
          <div className="absolute h-6 w-[1px]" style={{ left: `${high}%`, top: "-10px", backgroundColor: "var(--border-2)" }}>
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-muted-foreground">{high}%</div>
          </div>
          <motion.div
            className="absolute h-8 w-1 flex flex-col items-center"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, type: "spring" }}
            style={{ left: `${score}%`, top: "-12px", transform: "translateX(-50%)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff] mb-1" />
            <div className="w-[2px] h-full bg-[var(--alpha-bg-08)]0" />
            <div className="mt-2 font-black text-xs" style={{ color }}>{score}%</div>
          </motion.div>
        </div>
      </div>

      {range > 30 ? (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-200/70">
            <strong>Wide range:</strong> Incomplete data means this score could shift significantly. Review the highest-scoring dimensions below before acting on this result.
          </p>
        </div>
      ) : (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-start gap-3">
          <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-emerald-200/70">
            <strong>Consistent signals:</strong> The range ({low}–{high}) is narrow — multiple independent signals agree, so this score is reliable.
          </p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Risk Dimension Trend Section (if riskTrend available)
// ---------------------------------------------------------------------------

const RiskTrendSection: React.FC<{ result: TabProps["result"] }> = ({ result }) => {
  const trend = result.riskTrend;
  if (!trend || trend.length < 2) return null;

  return (
    <div className="glass-panel p-5 rounded-xl mt-6">
      <div className="label-xs text-muted-foreground uppercase tracking-widest mb-4">Risk Trajectory</div>
      <div className="flex items-end gap-3 h-16">
        {trend.map((t, i) => {
          const val = t.score ?? (t as any).riskScore ?? 50;
          const color = getScoreColor(val / 100);
          const heightPct = Math.max(10, Math.min(100, val));
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <div className="text-[10px] font-black font-mono" style={{ color }}>{val}%</div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                className="w-full rounded-t-sm"
                style={{ background: `${color}44`, border: `1px solid ${color}66`, maxHeight: "48px", minHeight: "4px" }}
              />
              <div className="text-[10px] text-muted-foreground font-mono">{t.year}</div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Projected risk trajectory if current role trajectory continues without strategic intervention.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RiskBreakdownTab main component
// ---------------------------------------------------------------------------

export const RiskBreakdownTab: React.FC<TabProps> = ({ result, companyData }) => {
  const { width } = useAdaptiveSystem();
  const isMobile = width < 768;

  // D6 and D7 are always added to dimensions, so isOracle must check for D1-D4 specifically.
  // D5 (countryContext) is excluded from result.dimensions — country context enters via D1/L1.
  const isOracle = result.dimensions.some(d => ['D1','D2','D3','D4'].includes(d.key));

  // Authoritative formula weights — sourced from getEffectiveFormulaWeights() which
  // reads COMPOSITE_FORMULA_WEIGHTS and respects the D8 kill-switch flag.
  // DO NOT hardcode these; they drift from the engine as regression updates land.
  const weights = getEffectiveFormulaWeights();

  const radarDimensions = useMemo(() =>
    result.dimensions.map(dim => {
      const meta = getDimMeta(dim.key);
      return { key: dim.key, label: meta?.label ?? dim.label, score: dim.score };
    }),
    [result.dimensions],
  );

  const dataQualityLabel = result.signalQuality.liveSignals > 12
    ? "live" as const
    : result.signalQuality.liveSignals > 5
      ? "partial" as const
      : "fallback" as const;

  return (
    <section aria-labelledby="risk-breakdown-heading" className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* ── Primary / Protective driver summary ── */}
        <ScoreSummaryBanner result={result} />

        {/* ── Scoring Archetype Badge ── */}
        {result.engineArchetype && result.engineArchetype !== 'low_risk_maintain' && (
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border"
              style={{
                background: 'var(--amber)/10',
                borderColor: 'var(--amber)/30',
                color: 'var(--amber)',
              }}
            >
              {result.engineArchetype === 'india_it_bench_risk'         && 'Bench Risk Pattern'}
              {result.engineArchetype === 'financial_distress_layoff'   && 'Financial Distress Pattern'}
              {result.engineArchetype === 'ai_efficiency_restructuring' && 'AI Restructuring Pattern'}
              {result.engineArchetype === 'rapid_growth_hiring_reversal' && 'Hiring Reversal Pattern'}
              {result.engineArchetype === 'sector_contagion_spread'     && 'Sector Contagion Pattern'}
              {!['india_it_bench_risk','financial_distress_layoff','ai_efficiency_restructuring','rapid_growth_hiring_reversal','sector_contagion_spread'].includes(result.engineArchetype)
                && `${result.engineArchetype.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Pattern`}
            </div>
          </div>
        )}


        {/* ── Dimension Score Cards ── */}
        <div className="mb-6">
          <SectionHeader
            title="Risk Dimension Breakdown"
            description={`Your risk score of ${result.total}/100 is calculated across ${result.dimensions.length} weighted dimensions. Each card shows the raw score, contribution to total, and a data-grounded narrative explaining what's driving that dimension.`}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.dimensions.map(dim => (
              <LayerScoreCard
                key={dim.key}
                dim={dim}
                weights={weights}
                result={result}
                companyData={companyData ?? null}
              />
            ))}
          </div>
        </div>

        {/* ── Radar + Confidence ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col">
            <SectionHeader
              title="Dimension Radar"
              description="Each axis = one risk dimension. Larger filled area = higher overall risk. Asymmetric shapes indicate where to focus intervention."
            />
            <div className="flex-1 flex items-center justify-center p-4">
              <DimensionRadar
                dimensions={radarDimensions}
                size={isMobile ? 260 : 310}
                color="var(--cyan)"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <SectionHeader
              title="Accuracy Range"
              description="True risk range based on data completeness and signal coherence. Narrow range = reliable score. Wide range = act with caution."
            />
            <div className="flex-1">
              <ScoreConfidenceInterval
                score={result.total}
                confidenceInterval={result.confidenceInterval}
                confidencePercent={result.confidencePercent}
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="glass-panel p-4 rounded-lg">
                  <StatCard label="Signal Freshness" value={`${result.dataFreshness.ageInDays}d avg`} icon={Clock} />
                </div>
                <div className="glass-panel p-4 rounded-lg">
                  <StatCard label="Live Signals"
                    value={`${result.signalQuality.liveSignals} / ${Math.max(1, result.signalQuality.liveSignals + result.signalQuality.heuristicSignals)}`}
                    icon={Activity} />
                </div>
              </div>

              {/* Risk trend if available */}
              <RiskTrendSection result={result} />
            </div>
          </div>
        </div>

        {/* ── Key Risk Drivers — open by default ── */}
        <div className="mb-6">
          <SectionHeader
            title="Key Risk Drivers Analysis"
            description="The top signals contributing most to your score, classified as verified Facts, analytical Inferences, or forward-looking Predictions."
          />
          <KeyRiskDriversPanel
            breakdown={result.breakdown}
            roleTitle={result.workTypeKey}
            companyName={result.companyName ?? ""}
            dataQuality={dataQualityLabel}
          />
        </div>

        {/* v12.0: Career Portfolio — risk concentration visualization */}
        <div className="mt-6">
          <CareerPortfolioPanel result={result} />
        </div>

        {/* v17.0: Signal Attribution Waterfall — which signals drove the final score */}
        <div className="mt-6">
          <SignalAttributionWaterfall result={result} />
        </div>

      </motion.div>
    </section>
  );
};

export default RiskBreakdownTab;
