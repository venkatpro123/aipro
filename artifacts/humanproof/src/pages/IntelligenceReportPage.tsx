// IntelligenceReportPage.tsx
// Intelligence Upgrade 5 — Monthly India AI Displacement Report
//
// Public page at /intelligence/report/:yearMonth (e.g. /intelligence/report/2026-05)
// Also /intelligence/report for the latest available report.
//
// This is the monthly media asset: a publicly linkable, sharable page.
// Rendered server-side from the monthly_reports table — no auth required.

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  ExternalLink, Share2, Calendar, BarChart2, Users,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoleSignalRow {
  role_key:      string;
  industry:      string;
  avg_score:     number;
  sample_size:   number;
  change_vs_30d?: number;
  improvement?:  number;
}

interface CompanyChange {
  company_name:        string;
  industry:            string;
  risk_score:          number;
  change_date:         string;
  current_stage_label: string;
}

interface TransitionStory {
  from_role:         string;
  to_role:           string;
  salary_change_pct: number;
  transition_months: number;
  transition_period: string;
}

interface PredictionUpdate {
  company_role:   string;
  swarm_score:    number;
  actual_outcome: number;
  accuracy_score: number;
  recorded_at:    string;
}

interface ReportPayload {
  generated_at:        string;
  year_month:          string;
  top_risk_roles:      RoleSignalRow[];
  most_improved:       RoleSignalRow[];
  company_changes:     CompanyChange[];
  transition_story:    TransitionStory | null;
  prediction_updates:  PredictionUpdate[];
  metadata:            { total_audits_this_month: number; total_opt_in_users: number; year_month: string };
}

interface MonthlyReport {
  year_month:   string;
  payload:      ReportPayload;
  generated_at: string;
  sent_at:      string | null;
  email_count:  number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonthName(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatRole(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function ScoreBadge({ score }: { score: number }) {
  const bg    = score >= 65 ? 'bg-red-500/15 text-red-400 border-red-500/25'
               : score >= 45 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
               : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
  return (
    <span className={`font-mono font-black text-sm px-2 py-0.5 rounded border ${bg}`}>
      {score}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number | undefined }) {
  if (delta == null) return <span className="text-muted-foreground font-mono text-xs">—</span>;
  if (delta > 0.5)  return <span className="text-red-400 font-mono text-xs font-bold">▲ {delta.toFixed(1)}</span>;
  if (delta < -0.5) return <span className="text-emerald-400 font-mono text-xs font-bold">▼ {Math.abs(delta).toFixed(1)}</span>;
  return <span className="text-muted-foreground font-mono text-xs">— 0</span>;
}

// ── Report sections ───────────────────────────────────────────────────────────

function RoleTable({ title, rows, colorClass, showImprovement = false }: {
  title: string;
  rows: RoleSignalRow[];
  colorClass: string;
  showImprovement?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-5 mb-4">
        <div className={`text-xs font-black uppercase tracking-widest mb-3 ${colorClass}`}>{title}</div>
        <p className="text-muted-foreground text-sm">No roles meet the minimum sample threshold this month.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-3 border-b border-white/8">
        <span className={`text-xs font-black uppercase tracking-widest ${colorClass}`}>{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Role</th>
              <th className="px-4 py-2 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Industry</th>
              <th className="px-4 py-2 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Score</th>
              <th className="px-4 py-2 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {showImprovement ? 'Improvement' : 'Δ 30d'}
              </th>
              <th className="px-4 py-2 text-right text-[10px] text-muted-foreground uppercase tracking-wider font-bold">n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-text-1">{formatRole(r.role_key)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.industry}</td>
                <td className="px-4 py-3 text-center"><ScoreBadge score={r.avg_score} /></td>
                <td className="px-4 py-3 text-center">
                  {showImprovement
                    ? <DeltaBadge delta={r.improvement != null ? -r.improvement : undefined} />
                    : <DeltaBadge delta={r.change_vs_30d} />
                  }
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground text-xs font-mono">n={r.sample_size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntelligenceReportPage() {
  const { yearMonth } = useParams<{ yearMonth?: string }>();
  const navigate       = useNavigate();

  const [report,    setReport]    = useState<MonthlyReport | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [allYearMonths, setAllYearMonths] = useState<string[]>([]);

  // Load list of available reports for the archive nav
  useEffect(() => {
    supabase
      .from('monthly_reports')
      .select('year_month')
      .order('year_month', { ascending: false })
      .limit(24)
      .then(({ data }) => {
        if (data) setAllYearMonths(data.map((r: any) => r.year_month));
      });
  }, []);

  // Load the target report
  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = yearMonth
      ? supabase.from('monthly_reports').select('*').eq('year_month', yearMonth).single()
      : supabase.from('monthly_reports').select('*').order('year_month', { ascending: false }).limit(1).single();

    query.then(({ data, error: err }) => {
      if (err || !data) {
        setError(err?.message ?? 'Report not found');
      } else {
        setReport(data as MonthlyReport);
        // If loaded via /intelligence/report, redirect to canonical URL
        if (!yearMonth && data.year_month) {
          navigate(`/intelligence/report/${data.year_month}`, { replace: true });
        }
      }
      setLoading(false);
    });
  }, [yearMonth, navigate]);

  const payload = report?.payload;
  const monthName = payload ? formatMonthName(payload.year_month) : '';

  // Build share URL for og meta
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/intelligence/report/${payload?.year_month ?? ''}`
    : '';

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `India AI Displacement Report — ${monthName}`,
        url:   shareUrl,
        text:  `Which India tech roles are most at risk this month? HumanProof monthly intelligence report.`,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert('Report URL copied to clipboard');
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page-wrap" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ maxWidth: 760, paddingTop: 80 }}>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            Loading report…
          </div>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="page-wrap" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ maxWidth: 760, paddingTop: 80 }}>
          <h1 className="text-2xl font-black mb-3">Report Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {yearMonth
              ? `No report for ${yearMonth} yet. Reports are generated on the first Monday of each month.`
              : 'No reports have been generated yet.'}
          </p>
          <Link to="/intelligence" className="text-cyan-400 text-sm hover:underline">
            ← Community Intelligence Dashboard
          </Link>
          {allYearMonths.length > 0 && (
            <div className="mt-8">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">Available Reports</div>
              <div className="flex flex-wrap gap-2">
                {allYearMonths.map(ym => (
                  <Link key={ym} to={`/intelligence/report/${ym}`}
                    className="text-xs font-mono px-2 py-1 rounded bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-colors">
                    {ym}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Report render ─────────────────────────────────────────────────────────

  return (
    <div className="page-wrap" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ maxWidth: 760 }}>

        {/* og meta (injected via React Helmet equivalent — head tags) */}
        <title>India AI Displacement Report — {monthName} | HumanProof</title>

        {/* Archive nav */}
        {allYearMonths.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-6 pt-8">
            {allYearMonths.map(ym => (
              <Link key={ym} to={`/intelligence/report/${ym}`}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                  ym === payload.year_month
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                }`}>
                {ym}
              </Link>
            ))}
          </div>
        )}

        {/* Header */}
        <div style={{ paddingTop: allYearMonths.length <= 1 ? 40 : 0, marginBottom: 32 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Monthly Intelligence Report
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-1">
                India AI Displacement Report
              </h1>
              <div className="text-lg font-bold text-muted-foreground">{monthName}</div>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors text-muted-foreground"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Audits Analysed', value: payload.metadata.total_audits_this_month.toLocaleString(), icon: BarChart2 },
              { label: 'Top Risk Roles',  value: payload.top_risk_roles.length.toString(),                   icon: TrendingUp },
              { label: 'Most Improved',   value: payload.most_improved.length.toString(),                    icon: TrendingDown },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="glass-panel rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</span>
                </div>
                <div className="font-black font-mono text-xl text-text-1">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top risk roles */}
        <RoleTable
          title="▲ Highest Risk Roles This Month"
          rows={payload.top_risk_roles}
          colorClass="text-red-400"
        />

        {/* Most improved */}
        <RoleTable
          title="▼ Most Improved Roles vs Last Month"
          rows={payload.most_improved}
          colorClass="text-emerald-400"
          showImprovement
        />

        {/* Company watch */}
        {payload.company_changes.length > 0 && (
          <div className="glass-panel rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-white/8">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Company Watch — Elevated Risk Signals
              </span>
            </div>
            <div className="divide-y divide-white/5">
              {payload.company_changes.map((c, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-bold text-sm text-text-1">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.industry} · {c.current_stage_label} · Updated {c.change_date.split('T')[0]}
                    </div>
                  </div>
                  <ScoreBadge score={c.risk_score} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verified transition story */}
        {payload.transition_story && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                Verified Career Transition This Month
              </span>
            </div>
            <div className="text-sm text-text-1 leading-relaxed">
              <strong>{formatRole(payload.transition_story.from_role)}</strong>
              {' → '}
              <strong>{formatRole(payload.transition_story.to_role)}</strong>
              {' in '}
              <strong>{payload.transition_story.transition_months} months</strong>.
              {' Salary change: '}
              <strong className={payload.transition_story.salary_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {payload.transition_story.salary_change_pct >= 0 ? '+' : ''}
                {payload.transition_story.salary_change_pct}%
              </strong>
              {' vs prior role. Period: '}
              {payload.transition_story.transition_period}.
            </div>
          </div>
        )}

        {/* Prediction updates */}
        {payload.prediction_updates.length > 0 && (
          <div className="glass-panel rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-white/8">
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">
                Prediction Ledger — New Outcomes This Month
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-2 text-left text-muted-foreground uppercase tracking-wider font-bold">Company · Role</th>
                    <th className="px-4 py-2 text-center text-muted-foreground uppercase tracking-wider font-bold">Model Score</th>
                    <th className="px-4 py-2 text-center text-muted-foreground uppercase tracking-wider font-bold">Outcome</th>
                    <th className="px-4 py-2 text-center text-muted-foreground uppercase tracking-wider font-bold">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.prediction_updates.map((p, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-mono text-text-2">{p.company_role}</td>
                      <td className="px-4 py-2.5 text-center"><ScoreBadge score={Math.round(p.swarm_score)} /></td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={p.actual_outcome >= 50 ? 'text-red-400' : 'text-emerald-400'}>
                          {p.actual_outcome >= 50 ? 'Layoff occurred' : 'Stable'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">
                        {(p.accuracy_score * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CTA to full platform */}
        <div className="glass-panel rounded-xl p-6 text-center mb-8">
          <h3 className="font-black text-base mb-2">Run Your Personal AI Displacement Audit</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto leading-relaxed">
            The aggregate report shows sector trends. Your personal audit shows your specific risk —
            including your company's financial signals, your role's displacement trajectory, and a 36-month salary forecast.
          </p>
          <a href="/calculator"
            className="inline-block bg-cyan-500 text-black font-black text-sm px-6 py-2.5 rounded-lg hover:bg-cyan-400 transition-colors">
            Start Free Audit →
          </a>
        </div>

        {/* Footer metadata */}
        <div className="border-t border-white/8 pt-5 pb-10 text-xs text-muted-foreground leading-relaxed">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <span>Generated: {new Date(report?.generated_at ?? '').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {report?.sent_at && <span>Emailed to: {report.email_count ?? 0} subscribers</span>}
            <span>Audits this month: {payload.metadata.total_audits_this_month.toLocaleString()}</span>
          </div>
          <p className="mt-3 opacity-60">
            Data sourced from anonymised opt-in audit submissions. Individual scores are never shared.
            Aggregate patterns require n≥20 per role-industry cell. This report is for informational purposes only.
          </p>
          <div className="flex gap-4 mt-3">
            <Link to="/intelligence" className="text-cyan-400 hover:underline">Intelligence Dashboard</Link>
            <Link to="/predictions" className="text-cyan-400 hover:underline">Prediction Ledger</Link>
            <Link to="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
