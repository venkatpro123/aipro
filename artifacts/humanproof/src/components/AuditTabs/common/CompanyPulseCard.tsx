// CompanyPulseCard.tsx — v34.0 UX redesign
//
// The Tier-1 unified company verdict card. Subsumes the previous two cards
// (WorkforceStabilityCard + FinancialHealthCard) into ONE executive-summary
// block at the top of the Company tab. Removes redundancy and gives the user
// a single "is this company in trouble?" answer in one scan.
//
// Render model:
//   • Single headline row — strongest verdict between Workforce & Financial
//   • Two side-by-side sub-verdict chips ("Workforce: distressed" / "Financial:
//     mixed") drilling into the underlying CompressedSignal
//   • Tap-to-expand — reveals full Workforce + Financial details inline
//
// This block carries a Tier 1 badge because it answers the "is the company
// safe?" question that drives 80% of user intent.

import React, { useState } from 'react';
import { useStaggeredReveal } from '../../../hooks/useStaggeredReveal';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Users, LineChart, Briefcase, Hash } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import {
  compressWorkforceSignal,
  compressFinancialSignal,
  chipToneColor,
  type CompressedSignal,
  type VerdictLabel,
} from '../../../services/signalCompressionService';
import { useIntelligencePulse } from '../../ui/useIntelligencePulse';

interface Props {
  result: HybridResult;
  /** Audit result includes companyData as a sibling field, NOT nested.
   *  Pass it here so the compressors can read the actual headcount /
   *  layoffRounds / stock / etc. — without it the verdict is always "No data". */
  companyData?: CompanyData;
  defaultOpen?: boolean;
}

// Map VERDICT_TONE hex strings → semantic data-tone attribute value
const hexToTone = (hex: string): string => {
  if (hex === '#dc2626' || hex.startsWith('#ef4')) return 'red';
  if (hex === '#f97316') return 'orange';
  if (hex === '#f59e0b' || hex.startsWith('#eab')) return 'amber';
  if (hex === '#10b981' || hex.startsWith('#34d')) return 'emerald';
  if (hex.startsWith('#00d') || hex.startsWith('#06b')) return 'cyan';
  if (hex.startsWith('#a78') || hex.startsWith('#8b5') || hex.startsWith('#7c3')) return 'violet';
  return 'slate';
};

const VERDICT_LABEL: Record<VerdictLabel, string> = {
  critical:           'Critical',
  distressed:         'Distressed',
  softening:          'Softening',
  stable:             'Stable',
  healthy:            'Healthy',
  'stable-confirmed': 'Stable',
  'data-unavailable': 'Unverified',
  unknown:            'Awaiting Data',
};

// Pick the more severe of two signals for the headline.
// Tie-break 1: live source wins over db/heuristic.
// Tie-break 2: a (workforce) wins over b (financial).
function pickHeadline(a: CompressedSignal, b: CompressedSignal): CompressedSignal {
  if (a.severity !== b.severity) return a.severity > b.severity ? a : b;
  if (a.sourceKind === 'live' && b.sourceKind !== 'live') return a;
  if (b.sourceKind === 'live' && a.sourceKind !== 'live') return b;
  return a; // workforce wins final tie
}

const Ring: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 60 }) => {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--alpha-bg-06)" strokeWidth={3} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

const SubVerdictChip: React.FC<{
  signal: CompressedSignal;
  icon: React.ElementType;
}> = ({ signal, icon: Icon }) => (
  <div
    className="signal-card flex-1 rounded-xl p-2.5 min-w-0"
    data-tone={hexToTone(signal.tone)}
  >
    <div className="flex items-start gap-1.5 mb-1">
      <Icon className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: signal.tone }} />
      {/* No truncate — "Workforce Stability" / "Financial Health" don't fit a
          single line in a half-width mobile chip; wrapping beats clipping mid-word. */}
      <span className="text-[10px] font-bold tracking-wider uppercase leading-tight" style={{ color: 'var(--alpha-text-45)' }}>
        {signal.headline}
      </span>
    </div>
    <p className="text-[11px] font-black leading-tight" style={{ color: signal.tone }}>
      {VERDICT_LABEL[signal.verdict]}
    </p>
    {signal.verdict !== 'unknown' && signal.verdict !== 'data-unavailable' && (
      <p className="text-[10px] leading-snug truncate mt-0.5" style={{ color: 'var(--alpha-text-50)' }}>
        {signal.rationale}
      </p>
    )}
  </div>
);

// Wave 6.2: stagger chip arrival so signals feel "live" rather than a static dump.
// Respects prefers-reduced-motion by passing delayMs=0 when motion is reduced.
const ChipRow: React.FC<{ signal: CompressedSignal }> = ({ signal }) => {
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visibleChips = useStaggeredReveal(signal.chips, prefersReduced ? 0 : 75);
  if (signal.chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {visibleChips.map((c, i) => {
        const tone = chipToneColor(c.tone);
        return (
          <span
            key={`${c.label}-${i}`}
            className="signal-chip text-[10px] px-2 py-0.5 rounded-md font-semibold"
            data-tone={hexToTone(tone)}
            style={{ opacity: 1, animation: prefersReduced ? undefined : 'fadeIn 0.18s ease-out' }}
          >
            {c.label}: {c.value}
          </span>
        );
      })}
      {/* Inline keyframe — avoids external CSS file */}
      {!prefersReduced && (
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }`}</style>
      )}
    </div>
  );
};

// ── Headcount formatter ───────────────────────────────────────────────────────
// Renders a human-readable count: 1,234 → "1.2K", 234,000 → "234K", etc.
function formatHeadcount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// ── Identity resolver ─────────────────────────────────────────────────────────
// Resolves company name, industry, and headcount from every available source,
// prioritising live data over DB over fallback text.
interface CompanyIdentity {
  name:      string | null;
  industry:  string | null;
  headcount: number | null;
  headcountSource: 'live' | 'db' | null;
}

function resolveIdentity(result: HybridResult, companyData?: CompanyData): CompanyIdentity {
  const r = result as any;

  // ── Name ────────────────────────────────────────────────────────────────────
  const name =
    companyData?.name?.trim()        ||
    r.companyName?.trim()            ||
    r.companyData?.name?.trim()      ||
    null;

  // ── Industry ─────────────────────────────────────────────────────────────────
  const industry =
    companyData?.industry?.trim()    ||
    r.companyData?.industry?.trim()  ||
    r.industryKey?.trim()            ||
    null;

  // ── Headcount ────────────────────────────────────────────────────────────────
  // Priority: live Yahoo Finance count > DB workforce_count > employeeCount
  const liveCount: number | null =
    r.headcountVelocity?.currentHeadcount           ??
    r.companyData?.workforce_count                   ??
    (companyData as any)?.workforce_count            ??
    null;

  const dbCount: number | null =
    companyData?.employeeCount > 0 ? companyData!.employeeCount : null;

  const headcount       = liveCount ?? dbCount ?? null;
  const headcountSource = liveCount != null ? 'live' : dbCount != null ? 'db' : null;

  return { name, industry, headcount, headcountSource };
}

export const CompanyPulseCard: React.FC<Props> = ({ result, companyData, defaultOpen = false }) => {
  // Only auto-open when there's real data to show; unknown/awaiting verdicts add no value when expanded
  const hasRealData = (sig: CompressedSignal) => sig.verdict !== 'unknown' && sig.verdict !== 'data-unavailable';
  const scanning = useIntelligencePulse();
  const identity  = React.useMemo(() => resolveIdentity(result, companyData), [result, companyData]);
  const workforce = React.useMemo(() => compressWorkforceSignal(result, companyData), [result, companyData]);
  const financial = React.useMemo(() => compressFinancialSignal(result, companyData), [result, companyData]);
  const headline  = pickHeadline(workforce, financial);
  const [open, setOpen] = useState(() => defaultOpen && (hasRealData(workforce) || hasRealData(financial)));

  // ring percentage = max severity of the two
  const ringPct = Math.max(workforce.severity, financial.severity);

  // v35.1.1 — distinguish "live signals attempted but empty" from "platform
  // never tried." Both render verdict='unknown', but the empty-but-attempted
  // case is typically a Yahoo / RSS / Glassdoor rate-limit or anti-bot block
  // — NOT a platform fault. Showing the same "NO DATA — we do not yet have
  // live company signals" copy in both states reads as "the platform is
  // broken" to users.
  //
  // Detection signal: liveDataService populates missingDataFallbacks /
  // degradedSignalClasses whenever a live class was attempted but returned
  // empty. Either array having entries means we DID try; the upstream just
  // returned nothing.
  const fallbackCount = result.signalQuality?.missingDataFallbacks?.length ?? 0;
  const degradedCount = result.signalQuality?.degradedSignalClasses?.length ?? 0;
  const liveAttemptedButEmpty = headline.verdict === 'unknown' && (fallbackCount > 0 || degradedCount > 0);

  // v39.0 F1 — When the platform attempted live signals but got nothing back,
  // shift the verdict label from "No data" (slate, reads as platform fault)
  // to "Data unavailable" (amber, reads as upstream rate-limit).
  // The CompressedSignal still carries verdict='unknown' for downstream
  // logic; we only swap the LABEL + TONE for the chip render here.
  const displayVerdict: VerdictLabel = liveAttemptedButEmpty ? 'data-unavailable' : headline.verdict;
  const tone = liveAttemptedButEmpty ? '#f59e0b' : headline.tone;
  const verdict = VERDICT_LABEL[displayVerdict];

  // One-line summary that captures both signals
  const summary = headline.verdict !== 'unknown'
    ? `Staff: ${VERDICT_LABEL[workforce.verdict]} · Finances: ${VERDICT_LABEL[financial.verdict]}`
    : liveAttemptedButEmpty
      ? 'We tried to get current information but couldn\'t right now. We\'ll keep trying.'
      : 'We don\'t have information on this company yet.';

  return (
    <div
      className={`rounded-2xl overflow-hidden intel-scan${scanning ? ' is-scanning' : ''}`}
      style={{
        background: 'var(--alpha-bg-04)',
        border: `1px solid ${open ? tone + '35' : 'var(--alpha-bg-08)'}`,
        transition: 'border-color 0.18s ease',
      }}
    >
      {/* Headline row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <Ring pct={ringPct} color={tone} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tone }} />
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--alpha-text-50)' }}>
              Company Situation
            </span>
            <span
              className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: tone + '22', color: tone, border: `1px solid ${tone}35` }}
            >
              {verdict.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] leading-snug truncate" style={{ color: 'var(--alpha-text-70)' }}>
            {summary}
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

      {/* ── Company identity row — name / industry / headcount ────────────── */}
      {(identity.name || identity.industry || identity.headcount != null) && (
        <div
          className="mx-3 mb-3 rounded-xl px-3 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1.5"
          style={{
            background: 'var(--alpha-bg-04)',
            border: '1px solid var(--alpha-bg-08)',
          }}
        >
          {/* Company Name */}
          {identity.name && (
            <div className="flex items-start gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(0,212,224,0.10)' }}
              >
                <Building2 className="w-3 h-3" style={{ color: 'var(--color-cyan-text)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--alpha-text-30)' }}>
                  Company
                </p>
                <p className="text-[12px] font-bold leading-snug truncate" style={{ color: 'var(--alpha-text-92)' }}
                   title={identity.name}>
                  {identity.name}
                </p>
              </div>
            </div>
          )}

          {/* Industry */}
          {identity.industry && (
            <div className="flex items-start gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(139,92,246,0.12)' }}
              >
                <Briefcase className="w-3 h-3" style={{ color: 'var(--color-violet-text)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--alpha-text-30)' }}>
                  Industry
                </p>
                <p className="text-[12px] font-bold leading-snug truncate" style={{ color: 'var(--alpha-text-85)' }}
                   title={identity.industry}>
                  {identity.industry}
                </p>
              </div>
            </div>
          )}

          {/* Headcount */}
          {identity.headcount != null && (
            <div className="flex items-start gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(16,185,129,0.10)' }}
              >
                <Hash className="w-3 h-3" style={{ color: 'var(--color-emerald500-text)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: 'var(--alpha-text-30)' }}>
                  Headcount
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-[12px] font-bold leading-snug" style={{ color: 'var(--alpha-text-85)' }}>
                    {formatHeadcount(identity.headcount)}
                  </p>
                  {identity.headcountSource === 'live' && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-emerald500-text)', border: '1px solid rgba(16,185,129,0.25)' }}
                    >
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-verdict chips — always visible */}
      <div className="px-3 pb-3 flex gap-2">
        <SubVerdictChip signal={workforce} icon={Users} />
        <SubVerdictChip signal={financial} icon={LineChart} />
      </div>

      {/* Drill-down */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="drill"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
            style={{ borderTop: `1px solid ${tone}20` }}
          >
            <div className="p-3 space-y-3">
              {hasRealData(workforce) && (
                <div className="signal-card rounded-xl p-3" data-tone={hexToTone(workforce.tone)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Users className="w-3.5 h-3.5" style={{ color: workforce.tone }} />
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--alpha-text-50)' }}>
                      Staffing details
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-70)' }}>
                    {workforce.rationale}
                  </p>
                  <ChipRow signal={workforce} />
                </div>
              )}

              {hasRealData(financial) && (
                <div className="signal-card rounded-xl p-3" data-tone={hexToTone(financial.tone)}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <LineChart className="w-3.5 h-3.5" style={{ color: financial.tone }} />
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--alpha-text-50)' }}>
                      Money details
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-70)' }}>
                    {financial.rationale}
                  </p>
                  <ChipRow signal={financial} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanyPulseCard;
