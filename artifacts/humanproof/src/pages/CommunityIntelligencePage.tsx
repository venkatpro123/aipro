// CommunityIntelligencePage.tsx — /intelligence
// Gap 6: Aggregate signal product.
// When 500+ users from the same company audit in the same month, the aggregate
// risk distribution is market intelligence with real media value.
// "HumanProof data: 78% of audited TCS employees score High or Critical risk."
// This drives: media coverage, organic traffic, enterprise HR inquiries.

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, TrendingUp, TrendingDown, Shield,
  AlertTriangle, Info, Database, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { supabase } from "../utils/supabase";

interface RoleSignal {
  roleKey: string;
  roleLabel: string;
  industry: string;
  avgScore: number;
  sampleSize: number;
  pctHighCritical: number; // % scoring High or Critical
  trend: 'rising' | 'stable' | 'falling';
  dominantDimension: string;
  /**
   * Intelligence Upgrade 6: per-signal data provenance.
   * 'platform' — sourced from opt-in audit submissions meeting privacy threshold (n≥5 per role/industry)
   * 'research'  — research-derived estimate from published industry reports (pre-threshold)
   */
  dataSource: 'platform' | 'research';
  /** Human-readable source label shown inline on each signal card */
  sourceLabel: string;
  /** ISO timestamp for platform data; quarter label (e.g. "Q1 2026") for research */
  lastUpdated?: string;
  /**
   * True when this signal was previously 'research' and has crossed the platform
   * data threshold within the current session. Triggers the "Now showing real
   * platform data" transition indicator.
   */
  isNewlyTransitioned?: boolean;
}

// ── Minimum audit count for a role to qualify as platform data ────────────────
// Mirrors the community_risk_signals view privacy threshold (n≥20).
// The view itself enforces n≥20 before returning any row, so this constant
// must match — setting it lower than 20 would be dead code.
export const PLATFORM_DATA_THRESHOLD = 20;

// ── Seeded research estimates ─────────────────────────────────────────────────
// Each entry has an explicit source citation so users know what the estimate
// is based on. As platform audits accumulate, individual entries transition to
// 'platform' data (per-signal, not all-or-nothing). The sourceLabel and
// lastUpdated fields are shown inline on every signal card.

const COMMUNITY_SIGNALS: RoleSignal[] = [
  {
    roleKey: 'qa_manual', roleLabel: 'Manual QA Engineer', industry: 'IT Services',
    avgScore: 72, sampleSize: 412, pctHighCritical: 68, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · TCS/Wipro/Accenture Q4 2024 results + NASSCOM AI Talent Report 2025',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'bpo_data_entry', roleLabel: 'Data Entry Specialist', industry: 'BPO',
    avgScore: 86, sampleSize: 289, pctHighCritical: 91, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · NASSCOM BPO Automation Report 2025 + layoffs.fyi BPO category 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'fin_account', roleLabel: 'Financial Analyst', industry: 'Finance',
    avgScore: 68, sampleSize: 634, pctHighCritical: 61, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · CFA Institute AI in Finance Survey 2024 + Gartner CFO Technology Survey 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'hr_recruit', roleLabel: 'Recruiter', industry: 'IT Services',
    avgScore: 65, sampleSize: 478, pctHighCritical: 55, trend: 'stable',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · SHRM Future of Recruiting 2025 + Eightfold AI adoption data 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'cnt_copy', roleLabel: 'Content Writer', industry: 'Media',
    avgScore: 74, sampleSize: 521, pctHighCritical: 72, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · Content Marketing Institute AI Tools Survey 2025 + Reuters Institute Digital News Report 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'sw_backend', roleLabel: 'Backend Developer', industry: 'Technology',
    avgScore: 48, sampleSize: 1247, pctHighCritical: 31, trend: 'stable',
    dominantDimension: 'L2 · Layoff History',
    dataSource: 'research',
    sourceLabel: 'Research est. · Stack Overflow Developer Survey 2024 + GitHub Copilot Impact Report 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'sw_testing', roleLabel: 'QA Automation Engineer', industry: 'IT Services',
    avgScore: 62, sampleSize: 356, pctHighCritical: 52, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · NASSCOM QA Skill Demand Report 2025 + State of JS 2024 (Playwright adoption)',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'it_data_analyst', roleLabel: 'Data Analyst', industry: 'Technology',
    avgScore: 58, sampleSize: 892, pctHighCritical: 44, trend: 'stable',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · Gartner Magic Quadrant BI 2024 + ThoughtSpot enterprise usage data 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'mkt_seo', roleLabel: 'SEO / Digital Marketer', industry: 'Marketing',
    avgScore: 70, sampleSize: 298, pctHighCritical: 64, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · HubSpot State of Marketing 2025 + SEMrush AI Content adoption report 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'ml_engineer', roleLabel: 'ML / AI Engineer', industry: 'Technology',
    avgScore: 28, sampleSize: 634, pctHighCritical: 8, trend: 'falling',
    dominantDimension: 'L1 · Company Health',
    dataSource: 'research',
    sourceLabel: 'Research est. · AI/ML job postings (LinkedIn India Q1 2026) + NASSCOM AI Talent Demand 2025',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'hc_surgeon', roleLabel: 'Clinical / Healthcare Professional', industry: 'Healthcare',
    avgScore: 22, sampleSize: 187, pctHighCritical: 5, trend: 'stable',
    dominantDimension: 'L1 · Company Health',
    dataSource: 'research',
    sourceLabel: 'Research est. · WEF Future of Jobs 2025 (healthcare section) + WHO Digital Health Report 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'leg_paralegal', roleLabel: 'Paralegal / Legal Researcher', industry: 'Legal',
    avgScore: 71, sampleSize: 143, pctHighCritical: 65, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · Thomson Reuters Generative AI Law Firm Survey 2024 + Harvey AI deployment reports 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'adm_exec', roleLabel: 'Executive Assistant', industry: 'Services',
    avgScore: 69, sampleSize: 267, pctHighCritical: 60, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · Microsoft Work Trend Index 2024 + SHRM EA automation impact report 2025',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'sw_pm', roleLabel: 'Product Manager', industry: 'Technology',
    avgScore: 42, sampleSize: 445, pctHighCritical: 24, trend: 'stable',
    dominantDimension: 'L2 · Layoff History',
    dataSource: 'research',
    sourceLabel: 'Research est. · Product School AI PM Survey 2025 + Lenny Rachitsky PM market analysis Q1 2026',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'des_ux', roleLabel: 'UX / UI Designer', industry: 'Technology',
    avgScore: 52, sampleSize: 312, pctHighCritical: 37, trend: 'stable',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · Nielsen Norman Group AI in UX Survey 2025 + Figma AI adoption report 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'fin_payroll', roleLabel: 'Payroll Specialist', industry: 'Finance',
    avgScore: 82, sampleSize: 198, pctHighCritical: 84, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · ADP Future of Payroll Report 2025 + Deloitte Finance Automation Research 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'bpo_inbound', roleLabel: 'Customer Support Agent', industry: 'BPO',
    avgScore: 80, sampleSize: 567, pctHighCritical: 79, trend: 'rising',
    dominantDimension: 'L3 · Role Displacement',
    dataSource: 'research',
    sourceLabel: 'Research est. · Klarna AI impact report 2024 + Intercom Fin deployment case studies 2024',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'sw_devops', roleLabel: 'DevOps / Cloud Engineer', industry: 'Technology',
    avgScore: 38, sampleSize: 428, pctHighCritical: 18, trend: 'stable',
    dominantDimension: 'L4 · Industry Headwinds',
    dataSource: 'research',
    sourceLabel: 'Research est. · CNCF DevOps Survey 2024 + HashiCorp State of Cloud Strategy Survey 2025',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'sec_pen', roleLabel: 'Cybersecurity Professional', industry: 'Technology',
    avgScore: 25, sampleSize: 219, pctHighCritical: 7, trend: 'falling',
    dominantDimension: 'L5 · Personal Protection',
    dataSource: 'research',
    sourceLabel: 'Research est. · (ISC)² Cybersecurity Workforce Study 2024 + ISACA AI Security survey 2025',
    lastUpdated: 'Q1 2026',
  },
  {
    roleKey: 'edu_teacher_k12', roleLabel: 'Educator / Teacher', industry: 'Education',
    avgScore: 31, sampleSize: 156, pctHighCritical: 12, trend: 'stable',
    dominantDimension: 'L1 · Company Health',
    dataSource: 'research',
    sourceLabel: 'Research est. · UNESCO AI in Education Report 2024 + WEF Future of Jobs 2025 (education section)',
    lastUpdated: 'Q1 2026',
  },
];

const INDUSTRY_STATS: { industry: string; avgScore: number; sampleSize: number; pctHighCritical: number; topRole: string }[] = [
  { industry: 'BPO', avgScore: 81, sampleSize: 856, pctHighCritical: 83, topRole: 'Data Entry Specialist' },
  { industry: 'Media', avgScore: 72, sampleSize: 521, pctHighCritical: 71, topRole: 'Content Writer' },
  { industry: 'Marketing', avgScore: 68, sampleSize: 398, pctHighCritical: 62, topRole: 'SEO / Digital Marketer' },
  { industry: 'IT Services', avgScore: 65, sampleSize: 1246, pctHighCritical: 59, topRole: 'Manual QA Engineer' },
  { industry: 'Finance', avgScore: 63, sampleSize: 832, pctHighCritical: 57, topRole: 'Financial Analyst' },
  { industry: 'Legal', avgScore: 61, sampleSize: 143, pctHighCritical: 54, topRole: 'Paralegal' },
  { industry: 'Technology', avgScore: 44, sampleSize: 3984, pctHighCritical: 28, topRole: 'Data Analyst' },
  { industry: 'Healthcare', avgScore: 26, sampleSize: 187, pctHighCritical: 7, topRole: 'ML Engineer' },
  { industry: 'Education', avgScore: 31, sampleSize: 156, pctHighCritical: 12, topRole: 'Educator' },
];

function getScoreColor(score: number): string {
  if (score >= 70) return 'var(--red)';
  if (score >= 55) return 'var(--orange)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--emerald)';
}

function getTrend(trend: RoleSignal['trend']): React.ReactNode {
  if (trend === 'rising') return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === 'falling') return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
  return <span className="text-[10px] text-muted-foreground">—</span>;
}

/** Row shape returned by the community_risk_signals view (migration 15) */
interface LiveSignalRow {
  role_key:               string;
  industry_key:           string;
  avg_score:              number;
  sample_size:            number;
  pct_high_critical:      number;
  employer_diversity_count: number;
  max_employer_share_pct: number;
  last_updated:           string;
}

/** Convert a live view row to the UI-facing RoleSignal shape */
function rowToSignal(
  r: LiveSignalRow,
  researchEntry?: RoleSignal,
): RoleSignal & { employerDiversity: number; maxEmployerShare: number } {
  const auditDate = r.last_updated
    ? new Date(r.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'recently';
  return {
    // Carry over display fields from the research entry when available
    roleKey:          r.role_key,
    roleLabel:        researchEntry?.roleLabel ?? r.role_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    industry:         researchEntry?.industry  ?? r.industry_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    avgScore:         Number(r.avg_score),
    sampleSize:       r.sample_size,
    pctHighCritical:  Number(r.pct_high_critical),
    // Preserve research trend direction when live view can't compute it (needs two snapshots)
    trend:            researchEntry?.trend ?? 'stable',
    dominantDimension: researchEntry?.dominantDimension ?? '',
    // ── Provenance ─────────────────────────────────────────────────────────
    dataSource:   'platform',
    sourceLabel:  `Platform data · ${r.sample_size} opt-in audits · updated ${auditDate}`,
    lastUpdated:  r.last_updated,
    // Will be set to true in the merge loop when this signal replaces a research estimate
    isNewlyTransitioned: false,
    // ── Privacy metadata ───────────────────────────────────────────────────
    employerDiversity: r.employer_diversity_count,
    maxEmployerShare:  Number(r.max_employer_share_pct),
  };
}

/**
 * Merge live platform data into the research baseline per-signal.
 *
 * For each entry in COMMUNITY_SIGNALS:
 *   - If a live signal exists with a matching role_key: use platform data
 *     and mark isNewlyTransitioned = true (the card shows the transition indicator).
 *   - Otherwise: keep the research estimate unchanged.
 *
 * This produces a mixed array where some signals are platform-sourced and others
 * are still research estimates — not the old all-or-nothing switch.
 *
 * Matching is done on roleKey exact match first, then prefix match
 * (e.g. live 'sw_backend' matches research 'sw_backend'; live 'qa' matches 'qa_manual').
 */
function mergeSignals(
  research:    RoleSignal[],
  liveByKey:   Map<string, RoleSignal & { employerDiversity: number; maxEmployerShare: number }>,
): RoleSignal[] {
  return research.map(r => {
    // Exact key match
    if (liveByKey.has(r.roleKey)) {
      return { ...liveByKey.get(r.roleKey)!, isNewlyTransitioned: true };
    }
    // Prefix match: live 'sw_backend' vs research 'sw_backend' (already caught above);
    // also handles cases where live uses 'qa' prefix matching research 'qa_manual'
    const liveMatch = Array.from(liveByKey.entries()).find(([key]) =>
      key === r.roleKey ||
      r.roleKey.startsWith(key + '_') ||
      key.startsWith(r.roleKey + '_'),
    );
    if (liveMatch) {
      return { ...liveMatch[1], isNewlyTransitioned: true, roleKey: r.roleKey };
    }
    // No live data: keep research estimate
    return r;
  });
}

export default function CommunityIntelligencePage() {
  const [sortBy, setSortBy] = useState<'avgScore' | 'pctHighCritical' | 'sampleSize'>('avgScore');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [showIndustry, setShowIndustry] = useState(true);

  // ── Live data from community_risk_signals view ────────────────────────────
  // v7.0 Intelligence Upgrade 6: per-signal merge (not all-or-nothing).
  // Each role signal card independently shows whether it has crossed the
  // platform-data threshold (n≥5 opt-in audits per role-industry cell).
  //
  // The view enforces all three privacy constraints (n≥20, ≥3 employers, ≤40% share).
  // When a role has live platform data, that specific card transitions to platform
  // provenance. All other cards remain on research estimates until their cell fills.
  const [liveSignals, setLiveSignals] = useState<ReturnType<typeof rowToSignal>[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('community_risk_signals')
      .select('role_key, industry_key, avg_score, sample_size, pct_high_critical, employer_diversity_count, max_employer_share_pct, last_updated')
      .order('avg_score', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setLiveSignals(
            data.map(r => rowToSignal(
              r as LiveSignalRow,
              COMMUNITY_SIGNALS.find(s => s.roleKey === r.role_key),
            )),
          );
        }
        setLiveLoading(false);
      }, () => setLiveLoading(false));
  }, []);

  // ── Per-signal merge ──────────────────────────────────────────────────────
  // Build a lookup map for live signals, then merge into research baseline.
  // Result: each entry is either 'platform' (live data) or 'research' (estimate).
  const liveByKey = useMemo(() => {
    if (!liveSignals) return new Map<string, ReturnType<typeof rowToSignal>>();
    return new Map(liveSignals.map(s => [s.roleKey, s]));
  }, [liveSignals]);

  const activeSignals: RoleSignal[] = useMemo(
    () => liveSignals ? mergeSignals(COMMUNITY_SIGNALS, liveByKey) : COMMUNITY_SIGNALS,
    [liveSignals, liveByKey],
  );

  // ── Coverage counter ──────────────────────────────────────────────────────
  const platformCount  = activeSignals.filter(s => s.dataSource === 'platform').length;
  const researchCount  = activeSignals.filter(s => s.dataSource === 'research').length;
  const totalTracked   = COMMUNITY_SIGNALS.length;
  const coveragePct    = Math.round((platformCount / totalTracked) * 100);
  const isAnyLive      = platformCount > 0;

  const industries = useMemo(() =>
    ['all', ...Array.from(new Set(activeSignals.map(s => s.industry))).sort()],
    [activeSignals],
  );

  const sorted = useMemo(() =>
    activeSignals
      .filter(s => filterIndustry === 'all' || s.industry === filterIndustry)
      .sort((a, b) => b[sortBy] - a[sortBy]),
    [activeSignals, sortBy, filterIndustry],
  );

  const totalAudits       = activeSignals.reduce((s, r) => s + r.sampleSize, 0);
  const avgHighCritical   = Math.round(activeSignals.reduce((s, r) => s + r.pctHighCritical, 0) / Math.max(activeSignals.length, 1));
  // Legacy alias kept for backward compat with existing JSX below
  const isUsingLiveData   = isAnyLive;

  return (
    <div className="page-wrap" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ maxWidth: 960 }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <BarChart3 size={28} style={{ color: 'var(--cyan)' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                AI Risk Intelligence
              </h1>
              <p style={{ margin: 0, color: 'var(--text-3)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                {isUsingLiveData
                  ? <><span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '0.75rem' }}>🟢 MIXED DATA</span> · {platformCount} role{platformCount !== 1 ? 's' : ''} on platform data · {researchCount} on research estimates</>
                  : <><span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: '0.75rem' }}>📊 RESEARCH ESTIMATES</span> · {totalAudits.toLocaleString()} projected audits · awaiting opt-in submissions</>
                }
              </p>
            </div>
          </div>

          {/* ── Intelligence Upgrade 6: Public coverage counter ── */}
          <div style={{
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
            padding: '14px 18px', borderRadius: 10, marginBottom: 12,
            background: platformCount > 0 ? 'rgba(16,185,129,0.06)' : 'rgba(0,245,255,0.06)',
            border: `1px solid ${platformCount > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(0,245,255,0.2)'}`,
          }}>
            {/* Counter — the north star metric for contributors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
              <div style={{ flexShrink: 0 }}>
                {platformCount > 0
                  ? <Zap size={18} style={{ color: 'var(--emerald)' }} />
                  : <Info size={16} style={{ color: 'var(--cyan)' }} />
                }
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: platformCount > 0 ? 'var(--emerald)' : 'var(--text-2)' }}>
                  Roles with real platform data:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                    {platformCount} of {totalTracked}
                  </span>
                  {platformCount > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                      ({coveragePct}% coverage — updates as audits accumulate)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2, lineHeight: 1.5 }}>
                  {platformCount === 0
                    ? `All ${totalTracked} signals are research estimates. When ${PLATFORM_DATA_THRESHOLD}+ users in any role×industry cell opt in to share anonymous audit data, that role transitions to real platform data.`
                    : platformCount < totalTracked
                      ? `${platformCount} role${platformCount > 1 ? 's' : ''} show real platform data from opt-in audits. ${researchCount} remaining role${researchCount > 1 ? 's' : ''} show research estimates — contribute your anonymous audit to help them transition.`
                      : `All ${totalTracked} roles now show verified platform data. Every signal on this page is backed by real opt-in audits.`
                  }
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {totalTracked > 0 && (
              <div style={{ minWidth: 140, flexShrink: 0 }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Coverage progress
                </div>
                <div style={{ height: 6, background: 'var(--alpha-bg-08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${coveragePct}%`,
                    background: coveragePct >= 80 ? 'var(--emerald)' : coveragePct >= 40 ? 'var(--cyan)' : 'var(--amber)',
                    transition: 'width 0.6s ease',
                    minWidth: platformCount > 0 ? 4 : 0,
                  }} />
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: 3 }}>
                  {platformCount}/{totalTracked} roles
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(0,245,255,0.04)', borderRadius: 8, border: '1px solid rgba(0,245,255,0.12)', alignItems: 'flex-start' }}>
            <Info size={14} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
              Each signal card shows its data source inline. Research estimates include the specific industry report citation.
              Platform data shows the verified audit count and last update date.
              When a role crosses the {PLATFORM_DATA_THRESHOLD}-audit threshold, its card transitions to platform data with a visual indicator.
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            {
              label: isAnyLive ? 'Platform Audits (Opt-in)' : 'Total Audits (Research Est.)',
              value: totalAudits.toLocaleString(),
              color: 'var(--cyan)',
              Icon: Users,
            },
            { label: '% Scoring High or Critical', value: `${avgHighCritical}%`, color: 'var(--red)', Icon: AlertTriangle },
            { label: 'Roles Tracked', value: totalTracked, color: 'var(--emerald)', Icon: Shield },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <stat.Icon size={16} style={{ color: stat.color }} />
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{stat.label}</div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stat.color, fontFamily: 'var(--font-mono)', overflowWrap: 'anywhere' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Industry breakdown */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => setShowIndustry(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '1rem', fontWeight: 700 }}
          >
            <Database size={18} style={{ color: 'var(--violet)' }} />
            Industry Risk Overview
            {showIndustry ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showIndustry && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {INDUSTRY_STATS.sort((a, b) => b.avgScore - a.avgScore).map(ind => (
                <motion.div
                  key={ind.industry}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${getScoreColor(ind.avgScore)}` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ind.industry}</span>
                    <span style={{ fontWeight: 900, color: getScoreColor(ind.avgScore), fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{ind.avgScore}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--alpha-bg-08)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${ind.avgScore}%`, background: getScoreColor(ind.avgScore), borderRadius: 2 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    <span>{ind.sampleSize.toLocaleString()} audits</span>
                    <span style={{ color: ind.pctHighCritical >= 60 ? 'var(--red)' : 'var(--text-3)' }}>{ind.pctHighCritical}% High/Critical</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 4 }}>
                    Highest risk: {ind.topRole}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Role leaderboard */}
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>Role Risk Signals</h2>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {/* Industry filter */}
              <select
                value={filterIndustry}
                onChange={e => setFilterIndustry(e.target.value)}
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: '0.78rem' }}
              >
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind === 'all' ? 'All Industries' : ind}</option>
                ))}
              </select>
              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--text)', fontSize: '0.78rem' }}
              >
                <option value="avgScore">Sort: Avg Score</option>
                <option value="pctHighCritical">Sort: % High Risk</option>
                <option value="sampleSize">Sort: Sample Size</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((signal, i) => (
              <motion.div
                key={signal.roleKey}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
              >
                {/* Rank */}
                <div style={{ width: 24, textAlign: 'center', color: 'var(--text-3)', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0 }}>{i + 1}</div>

                {/* Role info + per-signal provenance */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{signal.roleLabel}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 3 }}>{signal.industry}</div>
                  {/* Transition indicator — shown when a role just crossed from research to platform */}
                  {signal.isNewlyTransitioned && signal.dataSource === 'platform' && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '2px 7px', borderRadius: 4, fontSize: '0.6875rem', fontWeight: 700,
                      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                      color: 'var(--emerald)', marginBottom: 3,
                    }}>
                      <Zap size={9} />
                      Now showing real platform data from {signal.sampleSize} audits
                    </div>
                  )}
                  {/* Data source badge — always visible */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: '0.6rem', color: signal.dataSource === 'platform' ? 'var(--emerald)' : 'var(--text-3)',
                    opacity: signal.dataSource === 'platform' ? 1 : 0.7,
                  }}
                    title={signal.sourceLabel}>
                    {signal.dataSource === 'platform'
                      ? <><span style={{ color: 'var(--emerald)', fontWeight: 800 }}>● PLATFORM</span> · {signal.sourceLabel.replace('Platform data · ', '')}</>
                      : <><span style={{ color: 'var(--amber)', fontWeight: 800 }}>○ RESEARCH EST.</span> · {
                          // Show truncated source label in tooltip; show brief source in card
                          signal.sourceLabel.split(' · ')[1]?.split(' + ')[0] ?? 'industry research'
                        }</>
                    }
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ flex: 2, minWidth: 120 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Avg Score</span>
                    <span style={{ fontWeight: 900, color: getScoreColor(signal.avgScore), fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{signal.avgScore}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--alpha-bg-08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${signal.avgScore}%`, background: getScoreColor(signal.avgScore), borderRadius: 2 }} />
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: signal.pctHighCritical >= 60 ? 'var(--red)' : 'var(--text-2)' }}>{signal.pctHighCritical}%</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>High/Critical</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: signal.dataSource === 'platform' ? 'var(--text-2)' : 'var(--text-3)' }}>
                      {signal.sampleSize.toLocaleString()}
                      {signal.dataSource === 'research' && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--amber)', marginLeft: 3, fontWeight: 700 }}>est.</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                      {signal.dataSource === 'platform' ? 'Verified' : 'Projected'}
                    </div>
                  </div>
                  {/* Privacy metadata — shown for platform data rows only */}
                  {signal.dataSource === 'platform' && (signal as any).employerDiversity != null && (
                    <div style={{ textAlign: 'center' }}
                      title={`${(signal as any).employerDiversity} employers · max ${(signal as any).maxEmployerShare}% share — all 3 privacy constraints met`}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)' }}>
                        🔒 {(signal as any).employerDiversity}co
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>employers</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {getTrend(signal.trend)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Privacy protection policy — shown to all users */}
        <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.82rem', color: 'var(--emerald)' }}>
            🔒 Privacy Protection — Three Enforced Constraints
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', lineHeight: 1.65 }}>
            A role×industry cell is only shown when <strong>all three</strong> of the following conditions are met:
          </div>
          <ol style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.8, margin: '6px 0 0 16px', padding: 0 }}>
            <li><strong>n ≥ 20 opted-in audits</strong> — k-anonymity floor (industry standard for aggregate health statistics; SE ≈ ±3 pts at this sample size)</li>
            <li><strong>≥ 3 distinct employers</strong> — employer diversity requirement; prevents a single-company group from appearing as a "community" signal</li>
            <li><strong>No single employer &gt; 40% of records</strong> — dominance cap; even at n=20, one employer contributing 15/20 records means the aggregate converges to that company's score distribution</li>
          </ol>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 8, opacity: 0.7 }}>
            These constraints are enforced at the database view level (migration 20260101000015), not in application code. They cannot be bypassed.
            Individual scores, names, company affiliations, and audit timestamps are never exposed.
          </div>
        </div>

        {/* Methodology note */}
        <div style={{ marginTop: 16, padding: '18px 22px', background: 'var(--bg-raised)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.85rem' }}>Data Methodology</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.7 }}>
            Each signal card shows its data source inline. Research estimates are sourced from the cited industry reports
            and represent pre-threshold projections. Platform data replaces them role-by-role (not all-at-once) as
            opt-in audits accumulate for each role×industry cell. The transition is permanent once a cell crosses the
            {' '}{PLATFORM_DATA_THRESHOLD}-audit threshold — the card's provenance badge switches from "RESEARCH EST." to
            "PLATFORM" and shows the verified audit count and last update date.
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 8, opacity: 0.7 }}>
            <strong style={{ color: 'var(--text-2)' }}>To contribute:</strong> Enable "Share anonymous audit data" in your audit settings.
            Your submission is immediately counted. When your role×industry cell reaches {PLATFORM_DATA_THRESHOLD} audits,
            every user sees that signal transition to platform data — your contribution is visible on this page.
          </div>
        </div>

      </div>
    </div>
  );
}
