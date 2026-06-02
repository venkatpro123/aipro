// PeerBenchmarkPanel.tsx
// Enhancement 2: Real peer benchmark with anonymized score distribution.
// "Among 847 QA Engineers at large Indian IT firms, your score places you
// in the 68th percentile. The median is 69. The top 10% scored below 52."
// This drives two behaviors: moderate-risk users feel urgency; high-risk
// users find community and direction from peer actions.

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, BarChart3, TrendingDown, Award } from "lucide-react";

interface PeerBenchmarkData {
  roleLabel: string;
  companyTier: string;
  sampleSize: number;
  median: number;
  p10: number;   // top 10% scored BELOW this value (good)
  p25: number;   // top 25%
  p75: number;   // bottom 25%
  p90: number;   // bottom 10% scored ABOVE this (bad)
  userScore: number;
  percentile: number;  // what percentile the user is at (higher = more at-risk)
  topActionsFromPeers: string[];  // what the top 10% did
}

interface Props {
  roleKey: string;
  industryKey: string;
  score: number;
  experience: string;
}

// ── Seeded benchmark distributions ───────────────────────────────────────────
// RESEARCH ESTIMATES — NOT real platform audit data.
// These distributions were authored based on NASSCOM 2025, WEF Future of Jobs 2025,
// and McKinsey automation reports. The sample sizes (e.g. 847, 2341) are modelled
// projections, not counts of HumanProof platform audits. Current real audit count: 0.
// The UI must not imply these are live or user-generated statistics.
// Format: [p10, p25, median, p75, p90] = score values at those percentiles

type RoleBenchmark = {
  label: string;
  companyTier: string;
  sampleSize: number;
  distribution: [number, number, number, number, number]; // p10,p25,median,p75,p90
  topActions: string[];
};

const ROLE_BENCHMARKS: Record<string, RoleBenchmark> = {
  // ── Software Engineering ────────────────────────────────────────────────────
  // Covers sw_software_engineer, sw_backend, sw_frontend, sw_fullstack, etc.
  sw_software: {
    label: 'Software Engineers',
    companyTier: 'large tech companies',
    sampleSize: 3241,
    distribution: [32, 42, 54, 66, 78],
    topActions: [
      'Shipped AI-integrated features in existing codebase',
      'Built public portfolio of AI-assisted work (GitHub)',
      'Took on cross-team technical leadership roles',
    ],
  },
  sw_software_engineer: {
    label: 'Software Engineers',
    companyTier: 'large tech companies',
    sampleSize: 3241,
    distribution: [32, 42, 54, 66, 78],
    topActions: [
      'Shipped AI-integrated features in existing codebase',
      'Built public portfolio of AI-assisted work (GitHub)',
      'Took on cross-team technical leadership roles',
    ],
  },
  // ── QA / Testing ────────────────────────────────────────────────────────────
  sw_testing: {
    label: 'QA Engineers',
    companyTier: 'large Indian IT firms',
    sampleSize: 847,
    distribution: [52, 61, 69, 76, 84],
    topActions: [
      '8+ years experience + Python/Playwright proficiency',
      'Transitioned to AI testing oversight roles',
      'Built test automation frameworks using AI tools',
    ],
  },
  qa_auto: {
    label: 'Automation QA Engineers',
    companyTier: 'tech companies',
    sampleSize: 612,
    distribution: [45, 55, 64, 72, 80],
    topActions: [
      'Built expertise in AI-assisted test generation',
      'Moved into SDET/test architect roles',
      'Specialized in LLM output validation',
    ],
  },
  // ── Software Engineering ─────────────────────────────────────────────────
  sw_backend: {
    label: 'Backend Engineers',
    companyTier: 'tech companies globally',
    sampleSize: 2341,
    distribution: [28, 38, 47, 57, 68],
    topActions: [
      'Built production AI-assisted systems',
      'Specialized in AI evaluation and guardrails',
      'Moved into AI platform / infrastructure roles',
    ],
  },
  sw_frontend: {
    label: 'Frontend Engineers',
    companyTier: 'tech companies',
    sampleSize: 1892,
    distribution: [32, 41, 52, 62, 72],
    topActions: [
      'Specialized in AI-generated UI oversight',
      'Built multimodal interfaces',
      'Moved into design-engineering hybrid roles',
    ],
  },
  // ── Finance ─────────────────────────────────────────────────────────────
  fin_account: {
    label: 'Accountants & Finance Analysts',
    companyTier: 'Indian enterprises',
    sampleSize: 1204,
    distribution: [48, 58, 68, 76, 85],
    topActions: [
      'Python + AI finance tools proficiency',
      'Moved into FP&A strategy roles',
      'Built AI automation for reporting workflows',
    ],
  },
  fin_fp_analyst: {
    label: 'FP&A Analysts',
    companyTier: 'enterprises',
    sampleSize: 743,
    distribution: [42, 52, 63, 72, 80],
    topActions: [
      'AI-driven forecasting model expertise',
      'Cross-functional strategic advisory pivot',
      'CFO-track positioning',
    ],
  },
  // ── HR ──────────────────────────────────────────────────────────────────
  hr_recruit: {
    label: 'Recruiters',
    companyTier: 'IT and services firms',
    sampleSize: 934,
    distribution: [45, 56, 66, 74, 82],
    topActions: [
      'People analytics skills (SQL, Tableau)',
      'AI recruiter tool expertise',
      'Moved into talent intelligence roles',
    ],
  },
  hr_hrbp: {
    label: 'HR Business Partners',
    companyTier: 'large enterprises',
    sampleSize: 621,
    distribution: [38, 49, 58, 68, 76],
    topActions: [
      'Workforce AI change management certification',
      'Data-driven HR dashboard builds',
      'Strategic HRBP to CHR track',
    ],
  },
  // ── Data / Analytics ─────────────────────────────────────────────────────
  it_data_analyst: {
    label: 'Data Analysts',
    companyTier: 'tech and enterprises',
    sampleSize: 1876,
    distribution: [35, 46, 58, 68, 78],
    topActions: [
      'Python + ML proficiency',
      'Moved into data science or AI analyst roles',
      'Built AI-driven analytics products',
    ],
  },
  // ── Content / Media ──────────────────────────────────────────────────────
  cnt_copy: {
    label: 'Content Writers & Copywriters',
    companyTier: 'media and SaaS companies',
    sampleSize: 1123,
    distribution: [52, 64, 72, 80, 88],
    topActions: [
      'AI content strategy specialization',
      'Built AI-augmented content workflows',
      'Moved into editorial AI oversight',
    ],
  },
};

// Default distribution for unmapped roles (industry-general)
const DEFAULT_BENCHMARK: RoleBenchmark = {
  label: 'Professionals',
  companyTier: 'knowledge-work industries',
  sampleSize: 4218,
  distribution: [38, 48, 58, 68, 78],
  topActions: [
    'AI tool proficiency in primary work domain',
    'Cross-functional visibility and stakeholder ownership',
    'Active pivot into AI-adjacent roles',
  ],
};

function getRoleBenchmark(roleKey: string): RoleBenchmark {
  // Try exact match first.
  if (ROLE_BENCHMARKS[roleKey]) return ROLE_BENCHMARKS[roleKey];
  // Try 2-segment prefix (e.g. sw_software from sw_software_engineer).
  // Using only the first segment is too greedy — "sw" matches "sw_testing" (QA
  // Engineers) even for Software Engineers, creating a wildly wrong benchmark.
  const parts = roleKey.split('_');
  if (parts.length >= 2) {
    const twoSeg = `${parts[0]}_${parts[1]}`;
    if (ROLE_BENCHMARKS[twoSeg]) return ROLE_BENCHMARKS[twoSeg];
  }
  // Only fall back to a generic when no close match exists.
  return DEFAULT_BENCHMARK;
}

function safeDiv(num: number, den: number): number {
  return den !== 0 ? num / den : 0;
}

function computePercentile(score: number, distribution: [number, number, number, number, number]): number {
  const [p10, p25, median, p75, p90] = distribution;
  if (score <= p10) return 10;
  if (score <= p25) return Math.min(25, Math.round(10 + safeDiv(score - p10, p25 - p10) * 15));
  if (score <= median) return Math.min(50, Math.round(25 + safeDiv(score - p25, median - p25) * 25));
  if (score <= p75) return Math.min(75, Math.round(50 + safeDiv(score - median, p75 - median) * 25));
  if (score <= p90) return Math.min(90, Math.round(75 + safeDiv(score - p75, p90 - p75) * 15));
  return Math.min(99, Math.round(90 + Math.min(9, safeDiv(score - p90, 5))));
}

function getScoreColor(score: number): string {
  if (score < 35) return 'var(--emerald)';
  if (score < 55) return 'var(--amber)';
  if (score < 70) return 'var(--orange)';
  return 'var(--red)';
}

/**
 * Experience adjusts standing within the peer cohort. The benchmark distribution
 * is role-wide; two people with the same score but very different tenure are not
 * equally protected. Seniority is a mild protective signal against displacement
 * (institutional knowledge, relationships, harder to backfill), so we nudge the
 * displayed percentile DOWN (less at-risk) for senior bands and UP for juniors.
 * The shift is intentionally small (±6 pts max) so it refines rather than
 * overrides the score-driven percentile.
 * Returns a delta to ADD to the computed percentile (negative = better protected).
 */
function experiencePercentileShift(experience: string): number {
  const e = (experience ?? '').toLowerCase();
  if (/0-2|<\s*1|intern|entry|junior/.test(e)) return +6;   // earlier-career → more exposed
  if (/2-5|3-5/.test(e)) return +2;
  if (/5-10|6-10/.test(e)) return 0;                         // reference band
  if (/10-15|10-20/.test(e)) return -3;
  if (/15|20|25|principal|staff|director|vp|head|chief/.test(e)) return -6; // senior → better protected
  return 0;
}

/** A short industry qualifier appended to the cohort label, when known. */
function industryQualifier(industryKey: string): string {
  const k = (industryKey ?? '').toLowerCase();
  if (!k || k === 'default' || k === 'unknown') return '';
  const MAP: Array<[RegExp, string]> = [
    [/tech|software|saas|it_/, 'in tech'],
    [/financ|bank|fintech|insur/, 'in financial services'],
    [/health|pharma|biotech|medical/, 'in healthcare'],
    [/retail|ecommerce|commerce/, 'in retail/e-commerce'],
    [/manufactur|industrial|auto/, 'in manufacturing'],
    [/media|content|entertain/, 'in media'],
    [/consult|services|bpo|ites/, 'in services'],
    [/gov|public|edu|academ/, 'in public sector'],
    [/energy|utilit|oil|climate/, 'in energy'],
    [/telecom/, 'in telecom'],
  ];
  for (const [re, label] of MAP) if (re.test(k)) return label;
  return '';
}

export const PeerBenchmarkPanel: React.FC<Props> = ({ roleKey, industryKey, score, experience }) => {
  const bench = useMemo(() => getRoleBenchmark(roleKey), [roleKey]);
  const [p10, p25, median, p75, p90] = bench.distribution;

  // Score-driven percentile, then a small experience-aware adjustment so tenure
  // refines standing (was: experience prop accepted but never used).
  const basePercentile = useMemo(() => computePercentile(score, bench.distribution), [score, bench.distribution]);
  const percentile = useMemo(
    () => Math.min(99, Math.max(1, basePercentile + experiencePercentileShift(experience))),
    [basePercentile, experience],
  );
  const expShift = useMemo(() => experiencePercentileShift(experience), [experience]);
  const indQualifier = useMemo(() => industryQualifier(industryKey), [industryKey]);
  const scoreColor = getScoreColor(score);

  // Determine user's percentile label
  const percentileLabel =
    percentile <= 10 ? 'Top 10% — best protected cohort'
    : percentile <= 25 ? 'Top 25% — above average protection'
    : percentile <= 50 ? 'Middle 50% — near median risk'
    : percentile <= 75 ? 'Lower 25% — below median protection'
    : 'Bottom 10% — highest risk cohort';

  const percentileColor =
    percentile <= 25 ? 'var(--emerald)'
    : percentile <= 50 ? 'var(--amber)'
    : percentile <= 75 ? 'var(--orange)'
    : 'var(--red)';

  // Build bar chart: show distribution from p10-10 to p90+10 as a range bar
  const MIN_DISPLAY = Math.max(0, p10 - 10);
  const MAX_DISPLAY = Math.min(100, p90 + 10);
  // Guard against degenerate distributions (all same value)
  const range = Math.max(1, MAX_DISPLAY - MIN_DISPLAY);

  // Clamp to [0, 100]% to prevent positioning outside the bar
  const toBarPct = (v: number) => Math.min(100, Math.max(0, ((v - MIN_DISPLAY) / range) * 100));

  return (
    <div className="glass-panel-heavy rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-white/10">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Users className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black tracking-tight">Peer Benchmark</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bench.label}{indQualifier ? ` ${indQualifier}` : ''} at {bench.companyTier} · n≈{bench.sampleSize.toLocaleString()} (research estimate)
          </p>
        </div>
      </div>

      <div className="p-5">
        {/* Percentile statement */}
        <div className="mb-5">
          <div className="text-2xl font-black tracking-tight mb-1">
            <span style={{ color: percentileColor }}>{percentile}th percentile</span>
            <span className="text-base text-muted-foreground font-normal ml-2">risk ranking</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Based on a research model of approximately{" "}
            <strong>{bench.sampleSize.toLocaleString()}</strong> {bench.label} (research estimate, not platform data), your score of{" "}
            <strong style={{ color: scoreColor }}>{score}</strong> falls in the{" "}
            <strong style={{ color: percentileColor }}>{percentile}th percentile</strong> —{" "}
            {percentile > 50
              ? `above the modelled ${median} median.`
              : `below the modelled ${median} median.`}
          </p>
          {expShift !== 0 && (
            <p className="text-[10px] text-muted-foreground mt-1.5 opacity-75">
              {expShift < 0
                ? `Adjusted ${Math.abs(expShift)} pts safer for your seniority — tenure is a mild protective signal in this cohort.`
                : `Adjusted ${expShift} pts higher for earlier-career stage — less institutional protection than senior peers.`}
            </p>
          )}
        </div>

        {/* Distribution bar */}
        <div className="mb-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            Score Distribution
          </div>
          <div className="relative h-8">
            {/* Background track */}
            <div className="absolute inset-y-0 left-0 right-0 bg-white/5 rounded-full" />

            {/* IQR band (p25–p75) */}
            <motion.div
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8 }}
              className="absolute inset-y-1 rounded-full bg-white/10"
              style={{ left: `${toBarPct(p25)}%`, width: `${toBarPct(p75) - toBarPct(p25)}%`, transformOrigin: 'left' }}
            />

            {/* Median line */}
            <div className="absolute inset-y-0 w-0.5 bg-white/30"
              style={{ left: `${toBarPct(median)}%`, transform: 'translateX(-50%)' }} />

            {/* P10 label */}
            <div className="absolute -top-5 text-[9px] text-emerald-400 font-mono font-bold"
              style={{ left: `${toBarPct(p10)}%`, transform: 'translateX(-50%)' }}>{p10}</div>

            {/* Median label */}
            <div className="absolute -bottom-5 text-[9px] text-muted-foreground font-mono"
              style={{ left: `${toBarPct(median)}%`, transform: 'translateX(-50%)' }}>median {median}</div>

            {/* P90 label */}
            <div className="absolute -top-5 text-[9px] text-red-400 font-mono font-bold"
              style={{ left: `${toBarPct(p90)}%`, transform: 'translateX(-50%)' }}>{p90}</div>

            {/* User score pin */}
            <motion.div
              initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }}
              className="absolute inset-y-0 flex flex-col items-center justify-center"
              style={{ left: `${toBarPct(Math.min(MAX_DISPLAY, Math.max(MIN_DISPLAY, score)))}%`, transform: 'translateX(-50%)' }}>
              <div className="w-3 h-3 rounded-full border-2 border-white/80 z-10" style={{ background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }} />
            </motion.div>
          </div>

          <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-6">
            <span className="text-emerald-400">Best protected →</span>
            <span className="text-red-400">← Highest risk</span>
          </div>
        </div>

        {/* Distribution stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 text-center">
          {[
            { label: 'Top 10%', sublabel: 'scored below', value: p10, color: 'var(--emerald)' },
            { label: 'Median', sublabel: 'peer score', value: median, color: 'var(--amber)' },
            { label: 'Bottom 10%', sublabel: 'scored above', value: p90, color: 'var(--red)' },
          ].map(stat => (
            <div key={stat.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</div>
              <div className="text-[9px] text-muted-foreground opacity-60">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* What the top 10% did */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              What the top 10% of {bench.label} did differently
            </span>
          </div>
          <div className="space-y-1.5">
            {bench.topActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-emerald-400 font-bold flex-shrink-0">{i + 1}.</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerBenchmarkPanel;
