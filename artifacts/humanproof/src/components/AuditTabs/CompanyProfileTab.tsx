// CompanyProfileTab.tsx
// Company health and market position data — Answers "How is my company doing?"
// Displays: Company identity, hiring pulse, financial health, layoff history,
//           industry benchmarks, department news, live signal feed, collapse prediction.

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, AlertCircle, BarChart4, Calendar,
  Building2, Activity, Rss, MapPin, Users, Briefcase, Globe,
  Coins, Hash, Snowflake, Flame, Minus, DollarSign, Percent,
  ShieldAlert, ChevronRight, Clock, Newspaper,
} from "lucide-react";
import { SectionHeader } from "./common/SectionHeader";
import { CollapsibleSection } from "./common/CollapsibleSection";
import { CollapseSignalCard } from "./CollapseSignalCard";
import { useAdaptiveSystem } from "@/hooks/useAdaptiveSystem";
import type { TabProps } from "./common/types";
import type { CompanyData } from "@/data/companyDatabase";
// v14.0 intelligence panels
import MASignalPanel from "./common/MASignalPanel";
import LeadershipTransitionPanel from "./common/LeadershipTransitionPanel";
import HeadcountVelocityPanel from "./common/HeadcountVelocityPanel";
// v16.0 intelligence panels
import WARNSignalPanel from "./common/WARNSignalPanel";
import BLSMacroPanel from "./common/BLSMacroPanel";
import SECEnhancedPanel from "./common/SECEnhancedPanel";
import GlassdoorVelocityPanel from "./common/GlassdoorVelocityPanel";
import ExecutiveDeparturePatternPanel from "./common/ExecutiveDeparturePatternPanel";
import { ParentRiskCard } from "./common/ParentRiskCard";

// ── Industry benchmark baselines ─────────────────────────────────────────────
const INDUSTRY_BENCHMARKS: Record<string, {
  revenuePerEmployee: number;
  avgLayoffRate: number;
  aiAdoptionPct: number;
  cashRunwayMonths: number;
  growthOutlook: string;
}> = {
  Technology:    { revenuePerEmployee: 500000, avgLayoffRate: 8.2,  aiAdoptionPct: 72, cashRunwayMonths: 24, growthOutlook: "Moderate" },
  Finance:       { revenuePerEmployee: 650000, avgLayoffRate: 5.1,  aiAdoptionPct: 58, cashRunwayMonths: 36, growthOutlook: "Stable" },
  Healthcare:    { revenuePerEmployee: 280000, avgLayoffRate: 3.2,  aiAdoptionPct: 41, cashRunwayMonths: 28, growthOutlook: "Growing" },
  Retail:        { revenuePerEmployee: 180000, avgLayoffRate: 10.5, aiAdoptionPct: 45, cashRunwayMonths: 12, growthOutlook: "Declining" },
  Manufacturing: { revenuePerEmployee: 320000, avgLayoffRate: 6.8,  aiAdoptionPct: 55, cashRunwayMonths: 18, growthOutlook: "Stable" },
  Media:         { revenuePerEmployee: 240000, avgLayoffRate: 14.2, aiAdoptionPct: 68, cashRunwayMonths: 14, growthOutlook: "Declining" },
  Education:     { revenuePerEmployee: 130000, avgLayoffRate: 2.1,  aiAdoptionPct: 35, cashRunwayMonths: 20, growthOutlook: "Stable" },
  Consulting:    { revenuePerEmployee: 420000, avgLayoffRate: 7.3,  aiAdoptionPct: 62, cashRunwayMonths: 22, growthOutlook: "Stable" },
  Legal:         { revenuePerEmployee: 380000, avgLayoffRate: 4.0,  aiAdoptionPct: 48, cashRunwayMonths: 30, growthOutlook: "Moderate" },
  default:       { revenuePerEmployee: 380000, avgLayoffRate: 7.0,  aiAdoptionPct: 52, cashRunwayMonths: 20, growthOutlook: "Moderate" },
};

const getBenchmark = (industry: string) =>
  INDUSTRY_BENCHMARKS[industry] ?? INDUSTRY_BENCHMARKS.default;

const getAuthoritativeSignal = (
  result: TabProps["result"],
  key: string,
) => result.authoritativeSignals?.[key] ?? result.consensusSnapshot?.authoritativeSignals?.[key];

const deriveCompanyProvenance = (
  result: TabProps["result"],
  companyData: CompanyData,
): { sourceLabel: string; sourceDetail: string; ageDays: number } => {
  const primarySignals = [
    getAuthoritativeSignal(result, "stock90DayChange"),
    getAuthoritativeSignal(result, "stock_90d_change"),
    getAuthoritativeSignal(result, "revenueGrowthYoY"),
    getAuthoritativeSignal(result, "revenue_yoy"),
    getAuthoritativeSignal(result, "layoffRounds"),
    getAuthoritativeSignal(result, "layoff_rounds"),
  ].filter(Boolean);

  if (primarySignals.length > 0) {
    const liveCount = primarySignals.filter((signal) => signal?.source === "live").length;
    const degraded = primarySignals.some((signal) => signal?.freshnessState !== "fresh");
    const ageDays = Math.max(...primarySignals.map((signal) => signal?.freshnessDays ?? 0));
    if (liveCount > 0) {
      return {
        sourceLabel: degraded ? "Live + Degraded" : "Canonical Live",
        sourceDetail: `${liveCount}/${primarySignals.length} primary signals are live authoritative sources`,
        ageDays,
      };
    }

    return {
      sourceLabel: "Canonical DB",
      sourceDetail: "Primary company metrics are coming from authoritative DB provenance",
      ageDays,
    };
  }

  const ageMs = Date.now() - new Date(companyData.lastUpdated ?? new Date().toISOString()).getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / 86400000));
  const fallback = companyData.source?.toLowerCase().includes("fallback");
  return {
    sourceLabel: fallback ? "Fallback Snapshot" : "Legacy Source String",
    sourceDetail: fallback
      ? "No canonical provenance found for primary company signals"
      : "Displaying legacy source metadata because canonical signal provenance is unavailable",
    ageDays,
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const REGION_LABEL: Record<string, string> = {
  US: "United States", EU: "Europe", IN: "India",
  APAC: "Asia-Pacific", GLOBAL: "Global", UK: "United Kingdom",
  CA: "Canada", AU: "Australia", SG: "Singapore",
};

const formatHeadcount = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

const formatMarketCap = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "—";
  // Yahoo Finance returns raw USD; BSE returns crores INR (much smaller scale).
  // Treat values < 1e6 as crores INR (convert to approx USD billions at ~0.012).
  if (n < 1e6 && n > 0) return `₹${n.toLocaleString()}Cr`;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
};

// ── Company Identity Card ─────────────────────────────────────────────────────

const CompanyIdentityCard: React.FC<{
  companyData: CompanyData;
  provenance: { sourceLabel: string; sourceDetail: string; ageDays: number };
}> = ({ companyData, provenance }) => {
  type IdentityField = { label: string; value: string; icon: React.ReactNode; hint?: string };
  const fields: IdentityField[] = [
    { label: "Industry", value: companyData.industry || "—", icon: <Building2 className="w-4 h-4 text-blue-400" /> },
    { label: "Region / HQ", value: REGION_LABEL[companyData.region] ?? companyData.region ?? "—", icon: <MapPin className="w-4 h-4 text-violet-400" /> },
    { label: "Headcount", value: formatHeadcount(companyData.employeeCount), icon: <Users className="w-4 h-4 text-emerald-400" />, hint: companyData.employeeCount != null ? `${companyData.employeeCount.toLocaleString()} employees on record` : undefined },
    { label: "Listing", value: companyData.isPublic ? `Public${companyData.ticker ? ` · ${companyData.ticker}` : ""}` : "Private", icon: <Hash className="w-4 h-4 text-cyan-400" /> },
    ...(companyData.marketCap != null ? [{ label: "Market Cap", value: formatMarketCap(companyData.marketCap), icon: <Coins className="w-4 h-4 text-amber-400" />, hint: "From upstream financial connector" }] : []),
    ...((companyData as any).peRatio != null ? [{ label: "P/E Ratio", value: `${((companyData as any).peRatio as number).toFixed(1)}×`, icon: <TrendingUp className="w-4 h-4 text-sky-400" />, hint: "Price-to-earnings ratio from Finnhub / Yahoo Finance" }] : []),
    ...((companyData as any).lastFundingRound ? [{ label: "Last Funding", value: `${(companyData as any).lastFundingRound}${(companyData as any).monthsSinceLastFunding != null ? ` · ${(companyData as any).monthsSinceLastFunding} mo ago` : ""}`, icon: <Briefcase className="w-4 h-4 text-pink-400" /> }] : []),
  ];

  // Company initial avatar gradient (seeded by name)
  const initial = (companyData.name ?? '?')[0].toUpperCase();
  const INDUSTRY_GRADIENTS: Record<string, string> = {
    technology: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
    finance:    'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    healthcare: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    retail:     'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    manufacturing:'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
  };
  const industryKey = (companyData.industry ?? '').toLowerCase().split(' ')[0];
  const avatarGradient = INDUSTRY_GRADIENTS[industryKey] ?? 'linear-gradient(135deg, #00d4e0 0%, #7c3aed 100%)';

  // Quick financial metrics strip
  const revGrowth = companyData.revenueGrowthYoY;
  const stockChange = companyData.stock90DayChange;
  const layoffRounds = companyData.layoffRounds ?? 0;
  const provenanceColor = provenance.ageDays > 90 ? '#ef4444' : provenance.ageDays > 30 ? '#f59e0b' : '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      className="glass-panel-heavy shadow-xl"
      style={{ borderRadius: '16px', overflow: 'hidden' }}
    >
      {/* Main identity header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-start gap-4">
          {/* Company avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '12px', flexShrink: 0,
            background: avatarGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900,
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            {initial}
          </div>

          {/* Name + industry */}
          <div className="flex-1 min-w-0">
            <h4 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800,
              letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text)', margin: 0,
            }}>
              {companyData.name}
            </h4>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-3)',
              marginTop: '4px', lineHeight: 1.3,
            }}>
              {companyData.industry}
              {companyData.region ? ` · ${REGION_LABEL[companyData.region] ?? companyData.region}` : ""}
              {companyData.employeeCount ? ` · ${formatHeadcount(companyData.employeeCount)} employees` : ""}
            </p>
          </div>

          {/* Source badge */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 800,
              color: provenance.sourceLabel === "Canonical Live" ? '#10b981'
                : provenance.sourceLabel === "Canonical DB" ? '#06b6d4'
                : '#f59e0b',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px', padding: '3px 8px',
              letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>
              {provenance.sourceLabel}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
              color: provenanceColor, marginTop: '4px',
            }}>
              {provenance.ageDays}d old {provenance.ageDays > 30 ? '⚠' : '✓'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick metrics strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          {
            label: 'Revenue Growth (annual)',
            value: revGrowth != null ? `${revGrowth > 0 ? '+' : ''}${revGrowth}%` : '—',
            color: revGrowth == null ? 'var(--text-3)' : revGrowth >= 0 ? '#10b981' : '#ef4444',
            icon: revGrowth != null ? (revGrowth >= 0 ? '▲' : '▼') : '—',
          },
          {
            label: 'Stock 90d',
            value: stockChange != null ? `${stockChange > 0 ? '+' : ''}${stockChange}%` : '—',
            color: stockChange == null ? 'var(--text-3)' : stockChange >= 0 ? '#10b981' : '#ef4444',
            icon: stockChange != null ? (stockChange >= 0 ? '▲' : '▼') : '—',
          },
          {
            label: 'Layoff Rounds',
            value: `${layoffRounds}`,
            color: layoffRounds === 0 ? '#10b981' : layoffRounds === 1 ? '#f59e0b' : '#ef4444',
            icon: layoffRounds > 0 ? '⚠' : '✓',
          },
          {
            label: 'Public',
            value: companyData.isPublic ? (companyData.ticker ?? 'Yes') : 'Private',
            color: 'var(--text-2)',
            icon: companyData.isPublic ? '◎' : '◉',
          },
        ].map((m, i) => (
          <div
            key={m.label}
            style={{
              padding: '12px 16px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <div className="data-label" style={{ marginBottom: '4px' }}>{m.label}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900,
              letterSpacing: '-0.03em', color: m.color, lineHeight: 1,
            }}>
              {m.icon !== '—' && m.icon !== '◎' && m.icon !== '◉' && m.icon !== '⚠' && m.icon !== '✓'
                ? `${m.icon} ` : ''}{m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Identity fields grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-0">
        {fields.map((f, i) => (
          <div
            key={f.label}
            className="flex items-start gap-3"
            title={f.hint}
            style={{
              padding: '12px 16px',
              borderRight: (i % 3 !== 2) ? '1px solid rgba(255,255,255,0.05)' : 'none',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{
              padding: '6px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>{f.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="data-label">{f.label}</div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700,
                color: 'var(--text-2)', marginTop: '2px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {f.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Hiring Pulse ──────────────────────────────────────────────────────────────

interface HiringPulseSignal {
  freezeScore: number | null;
  postingTrend: "growing" | "stable" | "declining" | "frozen" | "unknown" | null;
  estimatedOpenings: number | null;
  isLive: boolean;
  roleTitle: string;
  companySpecificRoleRisk: number | null;
  /** Which geographic hiring market's connectors ran (india/us/uk/sg/au/ca/de/latam/mena).
   *  Null when signal is heuristic-only. */
  hiringMarket: string | null;
}

const HiringPulseCard: React.FC<{ signal: HiringPulseSignal; companyName: string }> = ({ signal, companyName }) => {
  const trendIcon = signal.postingTrend === "growing"
    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
    : signal.postingTrend === "declining" || signal.postingTrend === "frozen"
      ? <TrendingDown className="w-4 h-4 text-rose-400" />
      : <Minus className="w-4 h-4 text-muted-foreground" />;

  const freezeBadge = signal.freezeScore == null
    ? { label: "No live data", color: "text-muted-foreground", icon: <Minus className="w-4 h-4" /> }
    : signal.freezeScore >= 0.6
      ? { label: `${Math.round(signal.freezeScore * 100)}/100 — High freeze`, color: "text-rose-400", icon: <Snowflake className="w-4 h-4 text-rose-400" /> }
      : signal.freezeScore >= 0.3
        ? { label: `${Math.round(signal.freezeScore * 100)}/100 — Moderate`, color: "text-amber-400", icon: <Snowflake className="w-4 h-4 text-amber-400" /> }
        : { label: `${Math.round(signal.freezeScore * 100)}/100 — Active hiring`, color: "text-emerald-400", icon: <Flame className="w-4 h-4 text-emerald-400" /> };

  return (
    <div className="hiring-pulse-card glass-panel-heavy p-[var(--space-6)] shadow-xl">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)]"><Briefcase className="w-5 h-5" /></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold tracking-tight">Hiring Pulse</h4>
          <p className="text-[11px] text-muted-foreground">
            {signal.isLive
              ? `Live job-board scrape${signal.hiringMarket ? ` · ${signal.hiringMarket.toUpperCase()} market` : ""}`
              : "Heuristic baseline (not live)"}
          </p>
        </div>
        {signal.hiringMarket && (
          <span
            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: signal.isLive ? 'rgba(34,211,238,0.12)' : 'rgba(148,163,184,0.12)',
              color: signal.isLive ? '#22d3ee' : '#94a3b8',
              border: `1px solid ${signal.isLive ? 'rgba(34,211,238,0.3)' : 'rgba(148,163,184,0.25)'}`,
            }}
          >
            {signal.hiringMarket.toUpperCase()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-3)]">
        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5">{freezeBadge.icon}<span className="label-xs text-muted-foreground">Hiring Freeze Score</span></div>
          <div className={`text-base font-black tracking-tight mt-1 ${freezeBadge.color}`}>{freezeBadge.label}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5">{trendIcon}<span className="label-xs text-muted-foreground">Posting Trend ({signal.roleTitle})</span></div>
          <div className="text-base font-black tracking-tight mt-1 capitalize">{signal.postingTrend ?? "unknown"}</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5"><Hash className="w-4 h-4 text-cyan-400" /><span className="label-xs text-muted-foreground">Open Roles (live count)</span></div>
          <div className="text-base font-black tracking-tight mt-1">
            {signal.estimatedOpenings != null ? signal.estimatedOpenings.toLocaleString() : <span className="text-muted-foreground">— (live API not active)</span>}
          </div>
        </div>
      </div>

      {signal.companySpecificRoleRisk != null && (
        <div className="mt-4 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold tracking-tight">
            <AlertCircle className="w-3.5 h-3.5" />
            Company-specific role-risk: {Math.round(signal.companySpecificRoleRisk * 100)}/100
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {signal.companySpecificRoleRisk >= 0.6
              ? `Internally, ${companyName} weights ${signal.roleTitle} as a higher-cut-risk role than the global baseline.`
              : signal.companySpecificRoleRisk <= 0.35
                ? `${companyName} treats ${signal.roleTitle} as a protected role vs. sector baseline.`
                : `${companyName}'s internal weighting of ${signal.roleTitle} is aligned with the global baseline.`}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Financial Health Dossier ───────────────────────────────────────────────────

interface FinancialMetric {
  label: string;
  value: string | number;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  description?: string;
  benchmark?: string;
  benchmarkDelta?: "above" | "below" | "on-par";
}

const FinancialHealthDossier: React.FC<{
  companyName: string;
  companyData: CompanyData;
}> = ({ companyName, companyData }) => {
  const bench = getBenchmark(companyData.industry);

  const metrics: FinancialMetric[] = useMemo(() => {
    const m: FinancialMetric[] = [];

    if (companyData.revenueGrowthYoY != null) {
      m.push({
        label: "Revenue Growth (annual)",
        value: `${companyData.revenueGrowthYoY > 0 ? "+" : ""}${companyData.revenueGrowthYoY}%`,
        trend: companyData.revenueGrowthYoY > 0 ? "up" : companyData.revenueGrowthYoY < 0 ? "down" : "neutral",
        icon: <BarChart4 className="w-4 h-4 text-blue-400" />,
        description: "Year-over-year revenue trajectory vs. sector",
        benchmark: `Sector median: ~${bench.growthOutlook} outlook`,
        benchmarkDelta: companyData.revenueGrowthYoY > 10 ? "above" : companyData.revenueGrowthYoY < -5 ? "below" : "on-par",
      });
    }

    if (companyData.revenuePerEmployee != null) {
      const rpe = companyData.revenuePerEmployee;
      const delta = ((rpe - bench.revenuePerEmployee) / bench.revenuePerEmployee) * 100;
      m.push({
        label: "Revenue Per Employee",
        value: `$${(rpe / 1000).toFixed(0)}K`,
        trend: rpe > bench.revenuePerEmployee ? "up" : "down",
        icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
        description: "Workforce efficiency vs. industry standard",
        benchmark: `Industry avg: $${(bench.revenuePerEmployee / 1000).toFixed(0)}K`,
        benchmarkDelta: delta > 10 ? "above" : delta < -10 ? "below" : "on-par",
      });
    }

    if (companyData.aiInvestmentSignal) {
      const signalMap: Record<string, { label: string; score: number }> = {
        "very-high": { label: "Very High · Aggressive AI buildout", score: 95 },
        "high":      { label: "High · Active AI integration",      score: 75 },
        "medium":    { label: "Medium · Exploratory AI pilots",     score: 50 },
        "low":       { label: "Low · Minimal AI investment",        score: 25 },
      };
      const sig = signalMap[companyData.aiInvestmentSignal] ?? { label: companyData.aiInvestmentSignal, score: 50 };
      m.push({
        label: "AI Investment Signal",
        value: sig.label,
        trend: sig.score >= 75 ? "up" : "neutral",
        icon: <Activity className="w-4 h-4 text-cyan-400" />,
        description: `AI adoption maturity vs. sector avg ${bench.aiAdoptionPct}%`,
        benchmark: `Sector AI adoption: ${bench.aiAdoptionPct}%`,
        benchmarkDelta: sig.score > bench.aiAdoptionPct ? "above" : "below",
      });
    }

    if (companyData.stock90DayChange != null) {
      const chg = companyData.stock90DayChange;
      m.push({
        label: "Stock 90-Day Change",
        value: `${chg > 0 ? "+" : ""}${chg}%`,
        trend: chg > 0 ? "up" : chg < -5 ? "down" : "neutral",
        icon: <Percent className="w-4 h-4 text-violet-400" />,
        description: chg < -20 ? "Severe drawdown — investor confidence hit" : chg > 20 ? "Strong rally — positive market re-rating" : "Within normal volatility range",
        benchmarkDelta: chg > 5 ? "above" : chg < -10 ? "below" : "on-par",
      });
    }

    if (companyData.layoffRounds != null) {
      const rounds = companyData.layoffRounds;
      m.push({
        label: "Layoff Rounds (24 mo)",
        value: rounds === 0 ? "None" : rounds,
        trend: rounds === 0 ? "up" : rounds >= 2 ? "down" : "neutral",
        icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
        description: rounds >= 3 ? "Chronic restructuring pattern detected" : rounds >= 2 ? "Repeat reductions signal structural issues" : rounds === 1 ? "Single round — watch for follow-up" : "No documented reductions",
        benchmark: `Sector avg: ${bench.avgLayoffRate}% annual attrition`,
        benchmarkDelta: rounds === 0 ? "above" : rounds >= 2 ? "below" : "on-par",
      });
    }

    // Add industry median fallback if all live fields missing
    if (m.length === 0) {
      m.push(
        { label: "Revenue Per Employee", value: `~$${(bench.revenuePerEmployee / 1000).toFixed(0)}K (sector est.)`, trend: "neutral", icon: <DollarSign className="w-4 h-4 text-emerald-400" />, description: "Industry median estimate — no live financial data available" },
        { label: "AI Adoption Rate", value: `~${bench.aiAdoptionPct}% (sector avg)`, trend: "neutral", icon: <Activity className="w-4 h-4 text-cyan-400" />, description: "Sector-level AI adoption baseline" },
        { label: "Cash Runway (sector)", value: `~${bench.cashRunwayMonths} months`, trend: "neutral", icon: <Clock className="w-4 h-4 text-amber-400" />, description: "Typical cash runway for this sector" },
      );
    }

    return m;
  }, [companyData, bench]);

  const benchmarkColor = (d?: "above" | "below" | "on-par") =>
    d === "above" ? "text-emerald-400" : d === "below" ? "text-rose-400" : "text-muted-foreground";

  // Raw hex values — used for alpha-compositing in backgrounds/borders (CSS vars can't have hex-alpha suffix)
  const metricColors = ['#10b981', '#00d4e0', '#f59e0b', '#ef4444', '#7c3aed', '#a78bfa'];

  return (
    <div className="glass-panel-heavy shadow-xl" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.07]">
        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(0,212,224,0.10)', color: 'var(--cyan)' }}>
          <BarChart4 className="w-4 h-4" />
        </div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          Financial Health Dossier
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2" style={{ padding: '4px' }}>
        {metrics.map((metric, i) => {
          const accentColor = metricColors[i % metricColors.length];
          const trendColor = metric.trend === 'up' ? '#10b981' : metric.trend === 'down' ? '#ef4444' : 'var(--text-3)';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, ease: [0.34, 1.56, 0.64, 1] }}
              className="group"
              style={{
                padding: '16px',
                borderRadius: '12px',
                margin: '4px',
                background: `${accentColor}12`,
                border: `1px solid ${accentColor}28`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}
              whileHover={{ boxShadow: `0 4px 20px ${accentColor}22` } as any}
            >
              {/* Top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accentColor, opacity: 0.5 }} />

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="data-label mb-2">{metric.label}</div>
                  <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900,
                      letterSpacing: '-0.04em', lineHeight: 1,
                      color: metric.trend === 'up' ? '#10b981' : metric.trend === 'down' ? '#ef4444' : accentColor,
                    }}>
                      {metric.value}
                    </span>
                    {metric.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#10b981' }} />}
                    {metric.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />}
                  </div>
                  {metric.description && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.4, marginBottom: '4px' }}>
                      {metric.description}
                    </p>
                  )}
                  {metric.benchmark && (
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 800,
                      color: metric.benchmarkDelta === 'above' ? '#10b981' : metric.benchmarkDelta === 'below' ? '#ef4444' : 'var(--text-3)',
                      letterSpacing: '0.06em',
                    }}>
                      {metric.benchmarkDelta === 'above' ? '▲ Above' : metric.benchmarkDelta === 'below' ? '▼ Below' : '≈'} {metric.benchmark}
                    </div>
                  )}
                </div>
                <div style={{
                  padding: '8px', borderRadius: '10px',
                  background: `${accentColor}12`,
                  border: `1px solid ${accentColor}20`,
                  flexShrink: 0, opacity: 0.8,
                }}>
                  {metric.icon}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ── Layoff Timeline ───────────────────────────────────────────────────────────

interface LayoffEvent {
  date: string;
  count: number;
  percentage: number;
  department?: string;
  severity: "minor" | "moderate" | "major";
  isEstimated?: boolean;   // true when % is a default floor, not a confirmed figure
}

const LayoffTimeline: React.FC<{ events: LayoffEvent[]; companyName: string }> = ({ events, companyName }) => {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getSeverityColor = (s: LayoffEvent["severity"]) =>
    s === "major" ? "#ef4444" : s === "moderate" ? "#f97316" : "#f59e0b";

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short" });

  const patternLabel = events.length >= 3
    ? `Chronic restructuring`
    : events.length === 2
      ? "Repeat reductions"
      : events.length === 1
        ? "Single event"
        : null;

  return (
    <div className="glass-panel-heavy shadow-xl" style={{ borderRadius: '16px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.07]">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h4 className="data-label" style={{ color: 'var(--text-2)', letterSpacing: '0.14em' }}>
          LAYOFF HISTORY
        </h4>
        {patternLabel && events.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 800,
            padding: '2px 8px', borderRadius: '4px',
            background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {patternLabel}
          </span>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {events.length === 0 ? (
          <div style={{
            padding: '14px 16px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.20)',
          }}>
            <div className="data-label" style={{ color: '#10b981', marginBottom: '4px' }}>✓ STABILITY INDEX: HIGH</div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
              No documented workforce reductions in the primary 24-month tracking window. This is a meaningful protective signal.
            </p>
          </div>
        ) : (
          <div>
            {/* Horizontal timeline strip */}
            <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: '8px' }}>
              {/* Timeline connector line */}
              <div style={{
                position: 'absolute', top: '22px', left: '0', right: '0',
                height: '2px', background: 'rgba(255,255,255,0.07)',
                zIndex: 0,
              }} />
              <div style={{
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                minWidth: 'min-content', paddingTop: '0', position: 'relative', zIndex: 1,
              }}>
                {sorted.map((event, i) => {
                  const sColor = getSeverityColor(event.severity);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
                      style={{ flexShrink: 0, width: '160px' }}
                    >
                      {/* Timeline dot */}
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: sColor,
                        boxShadow: `0 0 12px ${sColor}60`,
                        margin: '0 auto 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: i === sorted.length - 1 ? 'pulse-live 2s ease-in-out infinite' : 'none',
                        zIndex: 2, position: 'relative',
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                      </div>

                      {/* Event chip */}
                      <div style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${sColor}30`,
                        background: `${sColor}08`,
                      }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 800, color: sColor, marginBottom: '4px' }}>
                          {formatDate(event.date)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2, marginBottom: '4px' }}>
                          {event.isEstimated
                            ? 'Documented'
                            : event.percentage > 0
                              ? `${event.percentage}% cut`
                              : 'Undisclosed'}
                        </div>
                        {event.isEstimated && (
                          <div className="data-label" style={{ opacity: 0.55, fontSize: '0.6rem', marginBottom: '4px' }}>
                            scale undisclosed
                          </div>
                        )}
                        {event.count > 0 && (
                          <div className="data-label" style={{ opacity: 0.6 }}>{event.count.toLocaleString()} roles</div>
                        )}
                        {event.department && (
                          <div className="data-label" style={{ marginTop: '4px', opacity: 0.5 }}>{event.department}</div>
                        )}
                        <div style={{
                          marginTop: '6px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 900,
                          padding: '1px 6px', borderRadius: '3px',
                          background: `${sColor}15`, color: sColor,
                          display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>
                          {event.isEstimated ? 'confirmed' : event.severity}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {/* Timeline end arrow */}
                <div style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', paddingTop: '14px',
                }}>
                  <div style={{
                    width: '20px', height: '2px', background: 'rgba(255,255,255,0.15)',
                  }} />
                  <div style={{
                    width: 0, height: 0,
                    borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                    borderLeft: '6px solid rgba(255,255,255,0.15)',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Industry Benchmark Card ───────────────────────────────────────────────────

interface BenchmarkData {
  metric: string;
  company: number;
  industry: number;
  percentile?: number;
  label?: string;
}

const IndustryBenchmarkCard: React.FC<{
  industryName: string;
  benchmarks: BenchmarkData[];
}> = ({ industryName, benchmarks }) => {
  return (
    <div className="glass-panel p-5">
      <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        Industry Benchmarks · <span className="text-cyan-400">{industryName}</span>
      </h4>

      {benchmarks.length === 0 ? (
        <div className="text-xs text-muted-foreground p-4 text-center">No benchmark data available for this industry.</div>
      ) : (
        <div className="space-y-4">
          {benchmarks.map((bm, i) => {
            const delta = bm.company - bm.industry;
            const normalizedDelta = delta / Math.max(1, bm.industry);
            const isPositive = delta >= 0;
            const isSignificant = Math.abs(normalizedDelta) > 0.1;

            return (
              <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5">
                <div className="text-xs text-muted-foreground mb-1">{bm.metric}</div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black">{bm.label ?? bm.company.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">vs. {bm.industry.toFixed(1)} industry avg</span>
                  </div>
                  {bm.percentile !== undefined && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-black"
                      style={{
                        background: bm.percentile > 50 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        color: bm.percentile > 50 ? "var(--emerald)" : "var(--red)",
                      }}
                    >
                      {bm.percentile}th %ile
                    </span>
                  )}
                </div>
                <div className="h-1.5 bg-white/5 rounded-full relative overflow-visible">
                  <div className="absolute h-full w-0.5 bg-white/20" style={{ left: "50%" }} />
                  <div
                    className="absolute w-3 h-3 rounded-full border-2 border-[var(--bg)] -top-[3px]"
                    style={{
                      background: isSignificant ? (isPositive ? "var(--emerald)" : "var(--red)") : "var(--text-3)",
                      left: `${Math.max(2, Math.min(98, 50 + normalizedDelta * 100))}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                  <span>Worse</span><span>Better</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Department News Panel ─────────────────────────────────────────────────────

interface NewsItem {
  title: string;
  date: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral" | "warning";
  highlights: string[];
  tag?: string;
}

const getSentimentColor = (s: NewsItem["sentiment"]) =>
  s === "positive" ? "var(--emerald)" : s === "negative" ? "var(--red)" : s === "warning" ? "var(--amber)" : "var(--text-3)";

const DepartmentNewsPanel: React.FC<{ news: NewsItem[]; department: string; companyName: string }> = ({
  news, department, companyName,
}) => {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="glass-panel p-5">
      <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Rss className="w-4 h-4 text-muted-foreground" />
        Department Intel · {department || companyName}
      </h4>

      {news.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6 opacity-60">
          No department-level signals detected in current tracking window.
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 bg-white/5 rounded-xl border border-white/5"
              style={{ borderLeft: `3px solid ${getSentimentColor(item.sentiment)}` }}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="text-sm font-semibold leading-tight">{item.title}</div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.tag && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-black uppercase"
                      style={{ background: `${getSentimentColor(item.sentiment)}22`, color: getSentimentColor(item.sentiment) }}>
                      {item.tag}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1 mb-2">
                {item.highlights.map((h, j) => (
                  <p key={j} className="text-xs text-muted-foreground flex gap-1.5">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-50" />
                    {h}
                  </p>
                ))}
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2">
                <span className="font-mono opacity-70">{item.source}</span>
                <span>{formatDate(item.date)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Live Signal Feed ──────────────────────────────────────────────────────────

interface SignalEvent {
  timestamp: string;
  source: string;
  type: "financial" | "news" | "social" | "job-market" | "ai-adoption";
  content: string;
  impact: "high" | "medium" | "low";
}

const LiveSignalFeed: React.FC<{ signals: SignalEvent[] }> = ({ signals }) => {
  const getImpactColor = (i: SignalEvent["impact"]) =>
    i === "high" ? "var(--red)" : i === "medium" ? "var(--amber)" : "var(--emerald)";

  const getTypeIcon = (t: SignalEvent["type"]) => {
    if (t === "financial") return <BarChart4 className="w-3 h-3" />;
    if (t === "news") return <Newspaper className="w-3 h-3" />;
    if (t === "job-market") return <Building2 className="w-3 h-3" />;
    if (t === "ai-adoption") return <Activity className="w-3 h-3" />;
    return <Rss className="w-3 h-3" />;
  };

  const formatTs = (ts: string) => {
    try {
      return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return ts; }
  };

  if (!signals || signals.length === 0) {
    return (
      <div className="glass-panel p-5">
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />Live Signal Feed
        </h4>
        <p className="text-sm text-muted-foreground text-center py-4 opacity-60">
          No real-time signals available. Run audit with a known public company for live data.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5">
      <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />Live Signal Feed
        <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
          {signals.length} SIGNALS
        </span>
      </h4>
      <div className="space-y-2">
        {signals.map((sig, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="p-2.5 bg-white/5 rounded-lg text-xs flex items-start gap-2.5 border border-white/5"
          >
            <div
              className="p-1.5 rounded-full mt-0.5 flex-shrink-0"
              style={{ background: `${getImpactColor(sig.impact)}18` }}
            >
              <span style={{ color: getImpactColor(sig.impact) }}>{getTypeIcon(sig.type)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium leading-relaxed">{sig.content}</div>
              <div className="flex justify-between items-center mt-1 text-muted-foreground opacity-70">
                <span className="font-mono">{sig.source}</span>
                <span>{formatTs(sig.timestamp)}</span>
              </div>
            </div>
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 uppercase"
              style={{ background: `${getImpactColor(sig.impact)}15`, color: getImpactColor(sig.impact) }}
            >
              {sig.impact}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ── Intelligent Heuristic Signal Generator ────────────────────────────────────
// Generates contextually accurate signals from available company + industry data
// when live API data is absent.

const buildIntelligentSignals = (
  companyData: CompanyData,
  resultWorkTypeKey: string,
  result?: import('./common/types').TabProps['result'],
): SignalEvent[] => {
  const signals: SignalEvent[] = [];
  const bench = getBenchmark(companyData.industry);
  const now = new Date().toISOString();
  const fetchedAt = companyData.lastUpdated ?? now;

  const patched = companyData as typeof companyData & {
    _hiringFreezeScore?: number;
    _hiringPostingTrend?: string;
    _hiringIsLive?: boolean;
    _hiringDisclosure?: string;
    _naukriOpenings?: number | null;
    _linkedinOpenings?: number | null;
    _liveNewsSentiment?: number;
    _isStock90dApproximate?: boolean;
    _layoffsDatasetUnavailable?: boolean;
  };

  // Stock signal — label clearly distinguishes live Yahoo Finance data from stale DB values
  if (companyData.stock90DayChange != null) {
    const chg = companyData.stock90DayChange;
    const direction = chg > 0 ? "rallied" : chg < 0 ? "fell" : "held flat";
    const magnitude = Math.abs(chg) > 25
      ? `extreme ${chg > 0 ? "rally" : "drawdown"} — investors repricing the business model`
      : Math.abs(chg) > 15 ? `significant ${chg > 0 ? "uptrend" : "drawdown"} — guidance change likely`
      : Math.abs(chg) > 5 ? `${chg > 0 ? "uptrend" : "downtrend"} — within normal range`
      : "essentially flat — no market-moving event";
    const isApprox = patched._isStock90dApproximate;
    // Determine the actual data source from reconciliation metadata rather than
    // always defaulting to "AlphaVantage" even for stale DB values.
    const authStock = (result as any)?.authoritativeSignals?.stock90DayChange
      ?? (result as any)?.consensusSnapshot?.authoritativeSignals?.stock90DayChange;
    const isLiveStock = authStock?.source === 'live';
    const exchange = isApprox
      ? "BSE proxy (52w estimate ±10pt)"
      : isLiveStock
        ? (companyData.region === "IN" ? "Yahoo Finance / BSE" : "Yahoo Finance (live)")
        : companyData.isPublic
          ? "Company Intelligence DB (cached)"
          : "Private valuation estimate";
    signals.push({
      timestamp: fetchedAt,
      source: exchange,
      type: "financial",
      content: `${companyData.ticker ?? companyData.name} ${direction} ${chg > 0 ? "+" : ""}${chg}% over 90 days${isApprox ? " (approximate)" : ""} — ${magnitude}`,
      impact: Math.abs(chg) > 15 ? "high" : Math.abs(chg) > 5 ? "medium" : "low",
    });
  }

  // Revenue signal
  if (companyData.revenueGrowthYoY != null) {
    const yoy = companyData.revenueGrowthYoY;
    const verdict = yoy >= 20 ? "well above sector — pricing power intact"
      : yoy >= 5 ? "tracking sector median — stable"
      : yoy >= 0 ? "decelerating — watch the next two quarters"
      : yoy >= -10 ? "contracting — cost-cutting cycles typically follow"
      : "sharp contraction — restructuring is the most common response";
    signals.push({
      timestamp: fetchedAt,
      source: "Filings + analyst consensus",
      type: "financial",
      content: `Revenue ${yoy > 0 ? "+" : ""}${yoy}% (annual) — ${verdict}`,
      impact: yoy < -10 ? "high" : yoy < 0 ? "medium" : "low",
    });
  }

  // Revenue per employee vs benchmark
  if (companyData.revenuePerEmployee != null) {
    const rpe = companyData.revenuePerEmployee;
    const pctAbove = ((rpe - bench.revenuePerEmployee) / bench.revenuePerEmployee * 100).toFixed(0);
    const isAbove = rpe >= bench.revenuePerEmployee;
    signals.push({
      timestamp: fetchedAt,
      source: "Internal efficiency model",
      type: "financial",
      content: `Revenue/employee $${(rpe / 1000).toFixed(0)}K — ${isAbove ? `${pctAbove}% above` : `${Math.abs(Number(pctAbove))}% below`} ${companyData.industry} sector average ($${(bench.revenuePerEmployee / 1000).toFixed(0)}K). ${isAbove ? "Lean workforce signals resilience." : "Staffing inefficiency may trigger rationalization."}`,
      impact: isAbove ? "low" : "medium",
    });
  }

  // AI adoption signal
  if (companyData.aiInvestmentSignal) {
    const aiSignalMap: Record<string, { verdict: string; impact: SignalEvent["impact"] }> = {
      "very-high": { verdict: "Aggressive AI buildout. Roles without AI integration skills face accelerated displacement.", impact: "high" },
      "high":      { verdict: "Active AI integration. Roles not using AI tools will likely face scope reduction in 12–18 months.", impact: "medium" },
      "medium":    { verdict: "Exploratory AI pilots. No immediate displacement risk, but upskilling window is open now.", impact: "low" },
      "low":       { verdict: "Minimal AI investment. Sector-level AI competition may still force change despite company lag.", impact: "low" },
    };
    const s = aiSignalMap[companyData.aiInvestmentSignal];
    if (s) {
      signals.push({
        timestamp: fetchedAt,
        source: "AI investment intelligence",
        type: "ai-adoption",
        content: `AI signal: ${companyData.aiInvestmentSignal.replace("-", " ")} — ${s.verdict}`,
        impact: s.impact,
      });
    }
  }

  // Hiring posting trend — label source as live (Serper via Edge Function) or heuristic
  if (patched._hiringPostingTrend) {
    const trend = patched._hiringPostingTrend;
    const freeze = patched._hiringFreezeScore;
    const isHiringLive = patched._hiringIsLive === true;
    const verdict = trend === "declining"
      ? "open-roles count shrinking — hiring freeze likely in effect"
      : trend === "growing"
        ? "open-roles count rising — active expansion, protective signal"
        : "open-roles steady — no clear expansion or contraction";
    const freezeNote = freeze != null && freeze > 0.6 ? ` (freeze-score ${Math.round(freeze * 100)}/100 — high)` : "";
    const countNote = isHiringLive
      ? (() => {
          const parts: string[] = [];
          if (patched._naukriOpenings != null)  parts.push(`Naukri: ${patched._naukriOpenings}`);
          if (patched._linkedinOpenings != null) parts.push(`LinkedIn: ${patched._linkedinOpenings}`);
          return parts.length ? ` [${parts.join(', ')}]` : '';
        })()
      : '';
    const dataSource = isHiringLive
      ? "Serper/Naukri+LinkedIn (live)"
      : `Heuristic baseline — ${patched._hiringDisclosure ?? "Q1 2026 static prior, not live"}`;
    signals.push({
      timestamp: fetchedAt,
      source: dataSource,
      type: "job-market",
      content: `${resultWorkTypeKey.replace(/_/g, " ")} postings: ${verdict}${freezeNote}${countNote}`,
      impact: trend === "declining" ? "high" : "medium",
    });
  }

  // Layoff history signal
  const lastLayoff = (companyData.layoffsLast24Months ?? [])[0] as
    | { date: string; percentCut: number; source?: string } | undefined;
  if (lastLayoff) {
    const dateLabel = new Date(lastLayoff.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const isEstimatedPct = typeof lastLayoff.source === 'string' && lastLayoff.source.includes('breaking_news') && lastLayoff.percentCut <= 5;
    const cutPhrase = isEstimatedPct ? "headcount (scale undisclosed — workforce reduction confirmed)"
      : lastLayoff.percentCut > 0 ? `${lastLayoff.percentCut}% of staff`
      : "headcount (size undisclosed)";
    const totalRounds = companyData.layoffRounds ?? 1;
    const pattern = totalRounds >= 3
      ? `Pattern: ${totalRounds} rounds in 24 months — chronic restructuring`
      : totalRounds === 2
        ? "Two rounds in 24 months — second wave confirms a structural reduction"
        : "First public round — watch for follow-up within 9 months (60% base rate)";
    signals.push({
      timestamp: lastLayoff.date,
      source: lastLayoff.source ?? companyData.source ?? "Public records",
      type: "news",
      content: `${dateLabel}: ${cutPhrase} reduced. ${pattern}`,
      impact: totalRounds >= 3 || lastLayoff.percentCut >= 10 ? "high" : "medium",
    });
  }

  // News sentiment: sentimentSignal is 0–1 (higher = more negative/risky layoff coverage).
  // Previously interpreted as -1 to +1 which caused all thresholds to fire incorrectly
  // (value is always ≥ 0, so "strongly negative" and "tilting negative" never fired).
  if (patched._liveNewsSentiment != null) {
    const s = patched._liveNewsSentiment as number; // 0 = no coverage, 1 = max coverage
    const verdict = s >= 0.8 ? "high-volume layoff coverage — multiple independent sources"
      : s >= 0.5 ? "moderate layoff coverage — restructuring language present"
      : s >= 0.2 ? "low layoff coverage — isolated mentions"
      : "minimal layoff coverage — no significant signals";
    const riskLevel = s >= 0.5 ? "high" : s >= 0.2 ? "medium" : "low";
    signals.push({
      timestamp: fetchedAt,
      source: "News-aggregator NLP",
      type: "news",
      content: `News layoff signal: ${Math.round(s * 100)}/100 — ${verdict}`,
      impact: riskLevel as SignalEvent["impact"],
    });
  }

  // Industry-level AI headwind even when no live data
  if (signals.length < 2) {
    signals.push({
      timestamp: now,
      source: "Sector intelligence model",
      type: "ai-adoption",
      content: `${companyData.industry} sector AI adoption rate: ~${bench.aiAdoptionPct}%. Companies in this sector are investing an average $${Math.round(bench.revenuePerEmployee * 0.04 / 1000)}K per employee in AI tooling annually.`,
      impact: bench.aiAdoptionPct > 60 ? "medium" : "low",
    });
    signals.push({
      timestamp: now,
      source: "Workforce data model",
      type: "job-market",
      content: `${companyData.industry} sector average annual attrition: ${bench.avgLayoffRate}%. Typical cash runway for sector: ~${bench.cashRunwayMonths} months. ${bench.growthOutlook} growth outlook.`,
      impact: bench.avgLayoffRate > 10 ? "medium" : "low",
    });
  }

  return signals;
};

// ── Intelligent Department News Generator ────────────────────────────────────

const buildDepartmentNews = (
  companyData: CompanyData,
  department: string,
): NewsItem[] => {
  const items: NewsItem[] = [];
  const layoffs = (companyData.layoffsLast24Months ?? []) as Array<{ date: string; percentCut: number; source?: string }>;
  const employeeCount = companyData.employeeCount ?? 1000;
  const bench = getBenchmark(companyData.industry);

  // Real layoff events
  for (const ev of layoffs.slice(0, 3)) {
    const evSource = ev.source ?? companyData.source ?? "Public records";
    const isRegulatory = /SEC|WARN|EDGAR|10-K|8-K/i.test(evSource);
    const headline = isRegulatory
      ? `${evSource} disclosure: workforce reduction filed${ev.percentCut > 0 ? ` (~${ev.percentCut}% of staff)` : ""}`
      : ev.percentCut > 0
        ? `${ev.percentCut}% workforce cut reported by ${evSource}`
        : `Layoff event reported by ${evSource}`;
    const peopleAffected = ev.percentCut > 0
      ? `~${Math.round(employeeCount * ev.percentCut / 100).toLocaleString()} of ${employeeCount.toLocaleString()} roles affected`
      : "Affected count not disclosed in this filing";
    items.push({
      title: headline,
      date: ev.date,
      source: evSource,
      sentiment: "negative",
      tag: "LAYOFF",
      highlights: [
        peopleAffected,
        isRegulatory
          ? "Regulatory filing — legally required disclosure, highest signal confidence"
          : `Reported via ${evSource} — cross-verify with primary source if mission-critical`,
      ],
    });
  }

  // AI investment signal news
  if (companyData.aiInvestmentSignal === "very-high" || companyData.aiInvestmentSignal === "high") {
    items.push({
      title: `${companyData.name} accelerating AI deployment across ${department || "core business units"}`,
      date: companyData.lastUpdated ?? new Date().toISOString(),
      source: companyData.source ?? "Intelligence model",
      sentiment: "warning",
      tag: "AI SIGNAL",
      highlights: [
        `AI investment signal rated "${companyData.aiInvestmentSignal}" — above sector baseline of ${bench.aiAdoptionPct}% adoption`,
        `Roles in ${department || companyData.industry} performing routine or automatable tasks are most exposed to workflow AI substitution`,
        "Recommended action: Identify tasks AI is already doing in adjacent companies and proactively shift to oversight + strategy work",
      ],
    });
  }

  // Revenue contraction signal
  if (companyData.revenueGrowthYoY != null && companyData.revenueGrowthYoY < -5) {
    items.push({
      title: `${companyData.name} revenue contracting — cost reduction likely to follow`,
      date: companyData.lastUpdated ?? new Date().toISOString(),
      source: "Financial model",
      sentiment: "negative",
      tag: "FINANCIAL",
      highlights: [
        `Revenue down ${Math.abs(companyData.revenueGrowthYoY)}% this year — well below ${bench.growthOutlook} sector outlook`,
        "Revenue contractions of this magnitude historically precede workforce reductions within 1–2 quarters",
        `Based on ${employeeCount.toLocaleString()} headcount and current revenue/employee ratio`,
      ],
    });
  }

  // Positive signal when no issues
  if (items.length === 0) {
    items.push({
      title: `${companyData.name} — no material negative signals in current tracking window`,
      date: new Date().toISOString(),
      source: "Intelligence model",
      sentiment: "positive",
      tag: "STABLE",
      highlights: [
        "No documented layoffs, regulatory filings, or financial distress signals in the 24-month window",
        `${companyData.industry} sector context: ${bench.growthOutlook} growth outlook, ${bench.avgLayoffRate}% average annual attrition`,
        "Continued monitoring recommended — sector AI adoption at ~" + bench.aiAdoptionPct + "% could shift this picture within 12–18 months",
      ],
    });
  }

  return items;
};

// ── CompanyProfileTab main ────────────────────────────────────────────────────

export const CompanyProfileTab: React.FC<TabProps> = ({ result, companyData }) => {
  const { width } = useAdaptiveSystem();
  const provenance = useMemo(
    () => deriveCompanyProvenance(result, companyData),
    [result, companyData],
  );

  const layoffEvents: LayoffEvent[] = useMemo(() => {
    if (!companyData.layoffsLast24Months?.length) return [];
    return companyData.layoffsLast24Months.map((l: any) => {
      // Events from breaking_news_events with null percent_cut default to 5%
      // floor — flag these as estimated so the UI shows "Documented · % undisclosed"
      // rather than a misleading precise figure.
      const isBreakingNews = typeof l.source === 'string' && l.source.includes('breaking_news');
      const isEstimated = isBreakingNews && l.percentCut <= 5;
      const displayPct = isEstimated ? 0 : l.percentCut;  // 0 triggers "Documented" label in JSX
      return {
        date: l.date,
        count: l.percentCut > 5 && companyData.employeeCount
          ? Math.round(companyData.employeeCount * (l.percentCut / 100))
          : 0,
        percentage: displayPct,
        severity: isEstimated ? "moderate"
          : l.percentCut > 10 ? "major"
          : l.percentCut > 3  ? "moderate"
          : "minor",
        isEstimated,
        department: Array.isArray(l.affectedDepartments) && l.affectedDepartments.length
          ? l.affectedDepartments.join(', ')
          : typeof l.department === 'string' ? l.department : undefined,
      };
    });
  }, [companyData]);

  const bench = getBenchmark(companyData.industry);

  const benchmarkData: BenchmarkData[] = useMemo(() => {
    const bms: BenchmarkData[] = [];
    if (companyData.revenuePerEmployee != null) {
      const rpe = companyData.revenuePerEmployee;
      const pct = Math.round(50 + ((rpe - bench.revenuePerEmployee) / bench.revenuePerEmployee) * 50);
      bms.push({
        metric: "Revenue Per Employee",
        company: rpe / 1000,
        industry: bench.revenuePerEmployee / 1000,
        label: `$${(rpe / 1000).toFixed(0)}K`,
        percentile: Math.min(99, Math.max(1, pct)),
      });
    }
    if (companyData.layoffRounds != null) {
      const rounds = companyData.layoffRounds;
      // sector context: show the actual documented avg attrition rate, not a
      // meaningless rounds proxy computed by dividing % by 10.
      bms.push({
        metric: "Layoff Rounds (24 mo) vs Sector Stability",
        company: rounds,
        // Use 1.0 as the neutral "industry average" reference so the bar position
        // reflects round count relative to one expected round, not an arbitrary rate.
        industry: 1.0,
        label: rounds === 0 ? "None" : `${rounds} round${rounds !== 1 ? 's' : ''}`,
        percentile: rounds === 0 ? 85 : rounds === 1 ? 55 : rounds === 2 ? 30 : 15,
      });
    }
    bms.push({
      metric: "AI Adoption Score",
      company: { "very-high": 95, "high": 75, "medium": 50, "low": 25 }[companyData.aiInvestmentSignal ?? "medium"] ?? 50,
      industry: bench.aiAdoptionPct,
      percentile: companyData.aiInvestmentSignal === "very-high" ? 90 : companyData.aiInvestmentSignal === "high" ? 70 : 40,
    });
    return bms;
  }, [companyData, bench]);

  // Map oracle keys → camelCase roleRiskMap keys from company_intelligence DB.
  // roleRiskMap only has 6 canonical roles; everything else falls back to the
  // closest proxy. This table is exhaustive across all known oracle key namespaces.
  const ORACLE_TO_ROLE_RISK_KEY: Record<string, string> = {
    // Software Engineering
    sw_backend:          'softwareEngineer',
    sw_frontend:         'softwareEngineer',
    sw_fullstack:        'softwareEngineer',
    sw_mobile:           'softwareEngineer',
    sw_devops:           'softwareEngineer',
    sw_sre:              'softwareEngineer',
    sw_platform:         'softwareEngineer',
    sw_embedded:         'softwareEngineer',
    sw_security:         'softwareEngineer',
    sw_qa:               'softwareEngineer',
    // Data & ML
    sw_data:             'dataScientist',
    sw_ml:               'dataScientist',
    sw_ai:               'dataScientist',
    ds_analyst:          'dataScientist',
    ds_engineer:         'dataScientist',
    ds_scientist:        'dataScientist',
    bi_analyst:          'dataScientist',
    // Product & Program Management
    pm_product:          'productManager',
    pm_program:          'productManager',
    pm_technical:        'productManager',
    pm_growth:           'productManager',
    // Design
    design_ux:           'designer',
    design_ui:           'designer',
    design_product:      'designer',
    design_brand:        'designer',
    design_content:      'designer',
    // HR & People
    hr_recruiter:        'hrRecruiter',
    hr_generalist:       'hrRecruiter',
    hr_talent:           'hrRecruiter',
    hr_hrbp:             'hrRecruiter',
    hr_comp:             'hrRecruiter',
    // Sales & Customer Success
    sales_ae:            'sales',
    sales_sdr:           'sales',
    sales_bdr:           'sales',
    sales_csm:           'sales',
    sales_se:            'sales',
    sales_partner:       'sales',
    // Finance — closest proxy is sales (both are business-facing roles)
    finance_analyst:     'sales',
    finance_fp:          'sales',
    finance_accounting:  'sales',
    // Legal — proxy to sales (both are non-technical support roles)
    legal_counsel:       'sales',
    legal_paralegal:     'sales',
    // Executive — proxy to productManager (strategy-facing)
    exec_vp:             'productManager',
    exec_director:       'productManager',
    exec_cto:            'productManager',
    exec_cpo:            'productManager',
    // Operations & Support
    ops_generalist:      'hrRecruiter',
    ops_analyst:         'dataScientist',
    support_cs:          'sales',
    support_technical:   'softwareEngineer',
    // Marketing — proxy to sales
    mktg_content:        'sales',
    mktg_demand:         'sales',
    mktg_brand:          'designer',
  };

  const hiringPulseSignal: HiringPulseSignal = useMemo(() => {
    const patched = companyData as any;
    const roleRiskMap = patched.roleRiskMap ?? {};
    const riskKey = ORACLE_TO_ROLE_RISK_KEY[result.workTypeKey] ?? result.workTypeKey;
    const companySpecificRoleRisk =
      roleRiskMap[riskKey] ?? roleRiskMap[result.workTypeKey] ?? null;

    return {
      freezeScore:            patched._hiringFreezeScore ?? null,
      postingTrend:           patched._hiringPostingTrend ?? null,
      estimatedOpenings:      patched._estimatedRoleOpenings ?? null,
      isLive:                 patched._hiringIsLive === true,
      roleTitle:              result.workTypeKey || "this role",
      companySpecificRoleRisk,
      hiringMarket:           patched._hiringMarket ?? null,
    };
  }, [companyData, result.workTypeKey]);

  const liveSignals = useMemo(
    () => buildIntelligentSignals(companyData, result.workTypeKey, result),
    [companyData, result.workTypeKey, result],
  );

  const departmentNews = useMemo(
    () => buildDepartmentNews(companyData, result.workTypeKey),
    [companyData, result.workTypeKey],
  );

  return (
    <section aria-labelledby="company-profile-heading" className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Company Identity */}
        <div className="mb-6">
          <CompanyIdentityCard companyData={companyData as any} provenance={provenance} />
        </div>

        {/* Hiring Pulse */}
        <div className="mb-6">
          <HiringPulseCard signal={hiringPulseSignal} companyName={companyData.name} />
        </div>

        {/* D8 AI Efficiency Restructuring indicator — shown when D8 signal fires.
            Informs the user that even though this company looks financially healthy,
            the combination of high AI investment + prior cuts + growing revenue
            matches the pattern seen in profitable companies that cut for AI productivity. */}
        {(() => {
          const ai = companyData.aiInvestmentSignal ?? 'medium';
          const rev = companyData.revenueGrowthYoY ?? null;
          const rounds = companyData.layoffRounds ?? 0;
          const isEfficiencyPattern =
            (ai === 'high' || ai === 'very-high') &&
            rounds > 0 &&
            rev !== null && rev > 0;
          if (!isEfficiencyPattern) return null;
          return (
            <div className="mb-4 p-3 rounded-xl border border-violet-500/25 bg-violet-500/6 flex items-start gap-2">
              <span className="text-violet-400 text-sm flex-shrink-0 mt-0.5">⚡</span>
              <div>
                <p className="text-xs font-semibold text-violet-300 leading-snug">
                  AI efficiency restructuring pattern detected
                </p>
                <p className="text-[10px] text-violet-300/60 mt-1 leading-relaxed">
                  {companyData.name} shows {ai} AI investment, {rev > 0 ? '+' : ''}{rev}% revenue growth,
                  and {rounds} prior layoff round{rounds !== 1 ? 's' : ''}. This matches the pattern
                  of profitable companies that reduce headcount specifically for AI productivity gains
                  rather than financial distress. D8 signal active — see Transparency tab for methodology.
                </p>
              </div>
            </div>
          );
        })()}

        {/* Financial Health Dossier */}
        <div className="mb-6">
          <SectionHeader
            title="Financial Health Dossier"
            description="Key financial indicators with sector benchmarks — revenue trajectory, workforce efficiency, AI investment, stock performance, and layoff patterns."
          />
          <FinancialHealthDossier companyName={result.companyName ?? ""} companyData={companyData} />
        </div>

        {/* Layoff History — primary, full width */}
        <div className="mb-6">
          <SectionHeader
            title="Layoff History"
            description="Documented workforce reductions in the past 24 months with severity, scale, and pattern analysis."
          />
          <LayoffTimeline events={layoffEvents} companyName={result.companyName ?? ""} />
        </div>

        {/* Company Collapse Prediction */}
        <div className="mb-6">
          <SectionHeader
            title="Company Collapse Prediction"
            description="AI-driven early warning system — detects Stage 1–3 distress signals with 6–18 month lead time using 15+ financial and behavioral markers."
          />
          <CollapseSignalCard
            companyName={companyData.name}
            industry={companyData.industry}
            roleTitle={result.workTypeKey}
            stock90dChange={companyData.stock90DayChange}
            aiInvestmentSignal={companyData.aiInvestmentSignal}
            layoffRounds={companyData.layoffRounds}
            mostRecentLayoffDate={companyData.layoffsLast24Months?.[0]?.date ?? null}
            filingDelinquent={false}
            precisionData={result.collapsePredictor ?? undefined}
            stealthSignal={(result as any)._stealthSignal ?? undefined}
          />
        </div>

        {/* ParentRiskCard — conditional on parentPropagation (subsidiary detection) */}
        {(result as any).parentPropagation && (result as any).parentPropagation.propagationRisk?.level !== 'negligible' && (
          <div className="mb-6">
            <ParentRiskCard parentPropagation={(result as any).parentPropagation} />
          </div>
        )}

        {/* ── Advanced Signals — collapsed by default ─────────────────────────
            8+ deeper intelligence panels. Users who want to investigate
            further can expand. Not shown by default to reduce scroll fatigue. */}
        <CollapsibleSection
          title="Advanced Signals"
          description="Leadership, headcount velocity, M&A, regulatory filings, and market signals (8 panels)"
          defaultOpen={false}
        >
          <div className="space-y-6">

            {/* Industry Benchmarks */}
            <div>
              <SectionHeader
                title="Industry Benchmarks"
                description="How this company compares to its sector peers on efficiency, AI adoption, and workforce stability."
              />
              <IndustryBenchmarkCard industryName={companyData.industry ?? result.industryKey} benchmarks={benchmarkData} />
            </div>

            {/* Department News */}
            <DepartmentNewsPanel
              news={departmentNews}
              department={result.workTypeKey}
              companyName={result.companyName ?? companyData.name}
            />

            {/* Live Signal Feed */}
            <div>
              <SectionHeader
                title="Live Signal Feed"
                description="Live data from financial reports, job boards, AI trends, and layoff patterns."
              />
              <LiveSignalFeed signals={liveSignals} />
            </div>

            {/* M&A Risk Signal — only shown when an M&A event is detected */}
            {(result as any).maRisk && (result as any).maRisk.maEventType !== 'NONE' && (
              <div>
                <SectionHeader
                  title="M&A Risk Intelligence"
                  description="Merger, acquisition, and PE ownership signals that drive headcount restructuring — covering 40% of major layoffs in 2023–2025."
                />
                <MASignalPanel maRisk={(result as any).maRisk} />
              </div>
            )}

            {/* Leadership Transition Risk — shown when score >= 30 */}
            {(result as any).leadershipTransitionRisk && (result as any).leadershipTransitionRisk.leadershipRiskScore >= 30 && (
              <div>
                <SectionHeader
                  title="Leadership Stability Intelligence"
                  description="CEO tenure, CFO departure, and senior leader clustering signals — the strongest company-level early warning system for restructuring."
                />
                <LeadershipTransitionPanel leadershipRisk={(result as any).leadershipTransitionRisk} />
              </div>
            )}

            {/* Headcount Velocity — shown when risk score >= 25 */}
            {(result as any).headcountVelocity && (result as any).headcountVelocity.headcountRiskScore >= 25 && (
              <div>
                <SectionHeader
                  title="Headcount Velocity Intelligence"
                  description="Contractor ratio trends, job posting velocity, and net headcount momentum — 30–90 day leading indicators of layoffs."
                />
                <HeadcountVelocityPanel headcount={(result as any).headcountVelocity} />
              </div>
            )}

            {/* Ground-truth regulatory and market signals */}
            <div className="space-y-3">
              <WARNSignalPanel warnSignal={(result as any).warnSignal} />
              <BLSMacroPanel blsMacroSignal={(result as any).blsMacroSignal} />
              <SECEnhancedPanel secEnhancedSignals={(result as any).secEnhancedSignals} />
              <GlassdoorVelocityPanel glassdoorVelocity={(result as any).glassdoorVelocity} />
              <ExecutiveDeparturePatternPanel executiveDeparturePattern={(result as any).executiveDeparturePattern} />
            </div>

          </div>
        </CollapsibleSection>
      </motion.div>
    </section>
  );
};

export default CompanyProfileTab;
