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
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Users, LineChart, AlertTriangle, Clock } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';
import type { CompanyData } from '../../../data/companyDatabase';
import {
  compressWorkforceSignal,
  compressFinancialSignal,
  chipToneColor,
  type CompressedSignal,
  type VerdictLabel,
} from '../../../services/signalCompressionService';
import TierBadge from './TierBadge';
// v39.0 C5: industry baseline freshness label
import { getIndustryRiskStalenessLabel } from '../../../data/industryRiskData';

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
  unknown:            'No data',
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
        stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
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
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color: signal.tone }} />
      <span className="text-[9px] font-bold tracking-wider uppercase truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>
        {signal.headline}
      </span>
    </div>
    <p className="text-[11px] font-black leading-tight" style={{ color: signal.tone }}>
      {VERDICT_LABEL[signal.verdict]}
    </p>
    <p className="text-[10px] leading-snug truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
      {signal.rationale}
    </p>
  </div>
);

const ChipRow: React.FC<{ signal: CompressedSignal }> = ({ signal }) =>
  signal.chips.length === 0 ? null : (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {signal.chips.map((c, i) => {
        const tone = chipToneColor(c.tone);
        return (
          <span
            key={`${c.label}-${i}`}
            className="signal-chip text-[10px] px-2 py-0.5 rounded-md font-semibold"
            data-tone={hexToTone(tone)}
          >
            {c.label}: {c.value}
          </span>
        );
      })}
    </div>
  );

export const CompanyPulseCard: React.FC<Props> = ({ result, companyData, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const workforce = React.useMemo(() => compressWorkforceSignal(result, companyData), [result, companyData]);
  const financial = React.useMemo(() => compressFinancialSignal(result, companyData), [result, companyData]);
  const headline  = pickHeadline(workforce, financial);

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
    ? `Workforce: ${VERDICT_LABEL[workforce.verdict]} · Financial: ${VERDICT_LABEL[financial.verdict]}`
    : liveAttemptedButEmpty
      ? 'Attempted live + DB — no signal returned. Likely upstream rate-limit; retrying in background.'
      : 'No attempt made — company isn\'t in our intelligence layer yet.';

  // v40.0 audit fix: surface heuristic/stale freshness so users know when
  // the analysis is based on historical baselines rather than live data.
  const freshnessTier = result.unifiedFreshness?.tier;
  const freshnessDisclosure = freshnessTier === 'heuristic'
    ? { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)',
        text: 'Analysis based on historical baselines — no live data retrieved for this company.' }
    : freshnessTier === 'stale'
    ? { icon: Clock, color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.20)',
        text: 'Partial live data. Score supplemented with cached historical baselines.' }
    : null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${open ? tone + '35' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.18s ease',
      }}
    >
      {/* v40.0: Heuristic / stale freshness disclosure banner */}
      {freshnessDisclosure && (() => {
        const { icon: Icon, color, bg, border, text } = freshnessDisclosure;
        return (
          <div
            className="px-3 pt-3 pb-0"
          >
            <div
              className="signal-card flex items-start gap-2 px-3 py-2 rounded-xl mb-2"
              data-tone={freshnessTier === 'heuristic' ? 'amber' : 'slate'}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
              <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {text}
              </p>
            </div>
          </div>
        );
      })()}
      {/* Headline row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
      >
        <Ring pct={ringPct} color={tone} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: tone }} />
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Company Pulse
            </span>
            <TierBadge tier={1} />
            <span
              className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: tone + '22', color: tone, border: `1px solid ${tone}35` }}
            >
              {verdict.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] leading-snug truncate" style={{ color: 'rgba(255,255,255,0.70)' }}>
            {summary}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
        </motion.div>
      </button>

      {/* Sub-verdict chips — always visible */}
      <div className="px-3 pb-3 flex gap-2">
        <SubVerdictChip signal={workforce} icon={Users} />
        <SubVerdictChip signal={financial} icon={LineChart} />
      </div>

      {/* v39.0 C5: industry baseline data freshness — only render when ≥ 60d old */}
      {(() => {
        const freshness = getIndustryRiskStalenessLabel();
        if (!freshness.isStale) return null;
        const color = freshness.ageDays > 120 ? '#f97316' : '#f59e0b';
        return (
          <div
            className="signal-card mx-3 mb-3 px-2.5 py-1.5 rounded-lg flex items-center gap-2"
            data-tone={freshness.ageDays > 120 ? 'orange' : 'amber'}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: color }}
            />
            <span className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {freshness.label}
            </span>
          </div>
        );
      })()}

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
              <div className="signal-card rounded-xl p-3" data-tone={hexToTone(workforce.tone)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className="w-3.5 h-3.5" style={{ color: workforce.tone }} />
                  <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Workforce evidence
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {workforce.rationale}
                </p>
                <ChipRow signal={workforce} />
              </div>

              <div className="signal-card rounded-xl p-3" data-tone={hexToTone(financial.tone)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <LineChart className="w-3.5 h-3.5" style={{ color: financial.tone }} />
                  <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Financial evidence
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {financial.rationale}
                </p>
                <ChipRow signal={financial} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanyPulseCard;
