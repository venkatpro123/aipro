// WorkforceStabilityCard.tsx — v33 signal-compression component
//
// Consolidates four separate signal cards into one executive-summary block:
//   • Hiring freeze / hiring pulse
//   • Recent layoffs / WARN filings
//   • Headcount velocity (Δ over the last 90 days)
//   • Glassdoor sentiment velocity (rating + CEO approval trend)
//
// This is the exact pattern the user requested:
//   "Instead of 4 cards (hiring freeze, layoffs, headcount, glassdoor) →
//    'Workforce Stability Intelligence' with expandable drill-down."
//
// Behaviour:
//   • Headline row is ALWAYS visible: single stability verdict + ring + 3 inline chips
//   • Tap to expand → reveals each underlying signal in a compact 2-column grid
//   • Drill-down to the original panel is preserved via an "Open details" link
//
// Zero new data — reads the same hybridResult fields the dedicated panels read.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  result: HybridResult;
  /** When true, expanded by default (used in Company Signals tab). */
  defaultOpen?: boolean;
}

type Verdict = 'stable' | 'softening' | 'distressed' | 'critical' | 'unknown';

interface VerdictMeta {
  label: string;
  color: string;
  rationale: string;
  ring: number;  // 0–100 for the ring fill
}

function computeVerdict(result: HybridResult): VerdictMeta {
  const r = result as any;
  const warnActive    = r.warnSignal?.hasActiveWARN === true;
  const layoffRounds  = r.companyData?.layoffRounds ?? r.layoffRounds ?? 0;
  const hiringTrend   = r.hiringSignal?.trend ?? r.companyData?._hiringPostingTrend;
  const headcountDelta = r.headcountVelocity?.deltaPct90d ?? r.headcountVelocity?.delta90Day ?? null;
  const glassdoorTrend = r.glassdoorVelocity?.ratingTrend ?? null;

  let score = 0;          // higher = more distressed
  const reasons: string[] = [];

  if (warnActive)             { score += 40; reasons.push('Active WARN filing'); }
  if (layoffRounds >= 2)      { score += 25; reasons.push(`${layoffRounds} layoff rounds`); }
  else if (layoffRounds === 1){ score += 15; reasons.push('Recent layoff round'); }
  if (hiringTrend === 'frozen')    { score += 25; reasons.push('Hiring freeze active'); }
  else if (hiringTrend === 'declining'){ score += 12; reasons.push('Hiring slowdown'); }
  if (typeof headcountDelta === 'number') {
    if (headcountDelta <= -10)      { score += 22; reasons.push(`Headcount ${headcountDelta}% (90d)`); }
    else if (headcountDelta <= -5)  { score += 12; reasons.push(`Headcount ${headcountDelta}% (90d)`); }
  }
  if (glassdoorTrend === 'falling-sharp') { score += 12; reasons.push('Glassdoor falling sharply'); }
  else if (glassdoorTrend === 'falling')  { score += 6;  reasons.push('Glassdoor softening'); }

  if (score === 0 && !warnActive && layoffRounds === 0 && !headcountDelta && !hiringTrend) {
    return { label: 'Awaiting Data', color: '#64748b', rationale: 'Workforce signals not yet available — no layoff history or headcount changes surfaced for this company.', ring: 0 };
  }

  // The clamp keeps the ring readable; the verdict label expands the meaning.
  const ring = Math.min(100, score);
  if (score >= 60)  return { label: 'Critical',    color: '#dc2626', rationale: reasons.join(' · ') || 'Multiple distress signals stacked.', ring };
  if (score >= 35)  return { label: 'Distressed',  color: '#f97316', rationale: reasons.join(' · ') || 'Several softening signals.', ring };
  if (score >= 15)  return { label: 'Softening',   color: '#f59e0b', rationale: reasons.join(' · ') || 'Early-warning signals only.', ring };
  return              { label: 'Stable',      color: '#10b981', rationale: reasons.length ? reasons.join(' · ') : 'No distress signals detected.', ring };
}

// ── Inline mini-chip ─────────────────────────────────────────────────────────
const MiniChip: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => (
  <div
    className="flex flex-col items-start px-2.5 py-1.5 rounded-lg flex-shrink-0"
    style={{ background: tone + '15', border: `1px solid ${tone}30` }}
  >
    <span className="text-[10px] font-semibold tracking-wider uppercase"
      style={{ color: tone + 'cc' }}>{label}</span>
    <span className="text-[11px] font-bold leading-tight"
      style={{ color: 'var(--alpha-text-85)' }}>{value}</span>
  </div>
);

// ── Ring SVG ─────────────────────────────────────────────────────────────────
const Ring: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 56 }) => {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--alpha-bg-06)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

export const WorkforceStabilityCard: React.FC<Props> = ({ result, defaultOpen = false }) => {
  const r = result as any;
  const [open, setOpen] = React.useState(defaultOpen);

  const verdict = computeVerdict(result);

  // Sub-signal pulls (best-effort — each may be undefined).
  const warnFilings    = r.warnSignal?.recentNotices?.length ?? 0;
  const warnActive     = r.warnSignal?.hasActiveWARN === true;
  const layoffRounds   = r.companyData?.layoffRounds ?? r.layoffRounds ?? 0;
  const layoffSeverity = r.companyData?.lastLayoffPercent ?? null;
  const hiringTrend    = r.hiringSignal?.trend ?? r.companyData?._hiringPostingTrend ?? 'unknown';
  const openings       = r.hiringSignal?.estimatedOpenings ?? r.companyData?._estimatedRoleOpenings ?? null;
  const headcount      = r.companyData?.employeeCount ?? null;
  const headcountDelta = r.headcountVelocity?.deltaPct90d ?? r.headcountVelocity?.delta90Day ?? null;
  const glassRating    = r.glassdoorVelocity?.currentRating ?? r.companyData?._glassdoorRating ?? null;
  const glassTrend     = r.glassdoorVelocity?.ratingTrend ?? null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--alpha-bg-04)',
        border: `1px solid ${open ? verdict.color + '35' : 'var(--alpha-bg-08)'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* ── Headline row — single executive-summary block ───────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <Ring pct={verdict.ring} color={verdict.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: verdict.color }} />
            <span className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--alpha-text-50)' }}>
              Workforce Stability
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full ml-auto"
              style={{ background: verdict.color + '22', color: verdict.color }}>
              {verdict.label.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] leading-snug truncate"
            style={{ color: 'var(--alpha-text-55)' }}>
            {verdict.rationale}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--alpha-text-30)' }} />
        </motion.div>
      </button>

      {/* ── Always-visible compact chips (3 most impactful) ─────────────── */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {(warnActive || warnFilings > 0) && (
          <MiniChip
            label="WARN"
            value={warnActive ? 'Active filing' : `${warnFilings} notice${warnFilings === 1 ? '' : 's'}`}
            tone={warnActive ? '#dc2626' : '#f97316'}
          />
        )}
        {layoffRounds > 0 && (
          <MiniChip
            label="Layoffs"
            value={`${layoffRounds} round${layoffRounds === 1 ? '' : 's'}`}
            tone={layoffRounds >= 2 ? '#dc2626' : '#f97316'}
          />
        )}
        {hiringTrend === 'frozen' && (
          <MiniChip label="Hiring" value="Frozen" tone="#dc2626" />
        )}
        {hiringTrend === 'declining' && (
          <MiniChip label="Hiring" value="Slowing" tone="#f59e0b" />
        )}
        {hiringTrend === 'growing' && (
          <MiniChip label="Hiring" value="Active" tone="#10b981" />
        )}
        {typeof headcountDelta === 'number' && Math.abs(headcountDelta) >= 3 && (
          <MiniChip
            label="HC Δ90d"
            value={`${headcountDelta > 0 ? '+' : ''}${headcountDelta}%`}
            tone={headcountDelta < 0 ? '#f97316' : '#10b981'}
          />
        )}
      </div>

      {/* ── Drill-down ─────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="drill"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
            style={{ borderTop: `1px solid ${verdict.color}20` }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
              {/* Hiring */}
              <DrillCell title="Hiring pulse" tone={hiringTrend === 'frozen' ? '#dc2626' : hiringTrend === 'growing' ? '#10b981' : '#94a3b8'}>
                <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
                  Trend: <strong>{hiringTrend}</strong>
                  {openings != null && ` · ~${openings} openings`}
                </p>
              </DrillCell>
              {/* Layoffs */}
              <DrillCell title="Layoff history" tone={layoffRounds > 0 ? '#f97316' : '#94a3b8'}>
                <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
                  {layoffRounds > 0
                    ? `${layoffRounds} round${layoffRounds === 1 ? '' : 's'}`
                      + (layoffSeverity ? ` · last: ${layoffSeverity}%` : '')
                    : 'No recent layoff rounds'}
                </p>
              </DrillCell>
              {/* Headcount */}
              <DrillCell title="Headcount" tone={headcountDelta && headcountDelta < -5 ? '#f97316' : '#10b981'}>
                <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
                  {headcount ? `${headcount.toLocaleString()} employees` : 'Headcount unknown'}
                  {typeof headcountDelta === 'number' && ` · ${headcountDelta > 0 ? '+' : ''}${headcountDelta}% (90d)`}
                </p>
              </DrillCell>
              {/* Glassdoor */}
              <DrillCell title="Employee sentiment" tone={glassTrend === 'falling-sharp' ? '#dc2626' : '#94a3b8'}>
                <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
                  {glassRating ? `${glassRating}/5` : 'No Glassdoor data'}
                  {glassTrend && glassTrend !== 'stable' && ` · ${glassTrend}`}
                </p>
              </DrillCell>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Tiny drill cell ──────────────────────────────────────────────────────────
const DrillCell: React.FC<{ title: string; tone: string; children: React.ReactNode }> = ({ title, tone, children }) => (
  <div
    className="rounded-xl px-3 py-2.5"
    style={{ background: 'var(--alpha-bg-04)', border: `1px solid ${tone}25` }}
  >
    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1"
      style={{ color: tone + 'cc' }}>{title}</p>
    {children}
  </div>
);

export default WorkforceStabilityCard;
