// FinancialHealthCard.tsx — v33 signal-compression component
//
// Consolidates four financial sub-signals into one block:
//   • Stock 90-day trend (public cos)
//   • Revenue growth YoY
//   • Funding stage + months-since-last-round (private cos)
//   • SEC enhanced signals (8-K filings, going-concern flags)
//
// Headline = single financial-health verdict ring (Healthy / Mixed / Weak / Distressed).
// Tap to expand → reveals each underlying signal.

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, ChevronDown } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  result: HybridResult;
  defaultOpen?: boolean;
}

interface VerdictMeta {
  label: string;
  color: string;
  rationale: string;
  ring: number;
}

function computeVerdict(result: HybridResult): VerdictMeta {
  const r = result as any;
  const stock     = r.companyData?.stock90DayChange ?? null;
  const revYoy    = r.companyData?.revenueGrowthYoY ?? null;
  const isPublic  = r.companyData?.isPublic === true;
  const fundingStage    = r.companyData?.lastFundingStage ?? null;
  const monthsSinceRaise = r.companyData?.monthsSinceLastRaise ?? null;
  const secMaterial = r.secEnhancedSignals?.has8kMaterialEvent === true
                   || r.secEnhancedSignals?.goingConcernFlag === true;

  let score = 0;
  const reasons: string[] = [];

  if (isPublic) {
    if (typeof stock === 'number') {
      if (stock <= -30)      { score += 35; reasons.push(`Stock ${stock}% (90d)`); }
      else if (stock <= -15) { score += 22; reasons.push(`Stock ${stock}% (90d)`); }
      else if (stock <= -5)  { score += 10; reasons.push(`Stock ${stock}% (90d)`); }
      else if (stock >= 15)  { reasons.push(`Stock +${stock}% (90d)`); }
    }
    if (typeof revYoy === 'number') {
      if (revYoy <= -10)     { score += 22; reasons.push(`Revenue ${revYoy}% YoY`); }
      else if (revYoy < 0)   { score += 12; reasons.push(`Revenue ${revYoy}% YoY`); }
      else if (revYoy >= 10) { reasons.push(`Revenue +${revYoy}% YoY`); }
    }
  } else {
    // Private — funding-stage signals dominate
    if (typeof monthsSinceRaise === 'number') {
      if (monthsSinceRaise >= 24)      { score += 28; reasons.push(`${monthsSinceRaise}mo since last raise`); }
      else if (monthsSinceRaise >= 18) { score += 18; reasons.push(`${monthsSinceRaise}mo since last raise`); }
      else if (monthsSinceRaise >= 12) { score += 8;  reasons.push(`${monthsSinceRaise}mo since last raise`); }
    }
    if (fundingStage === 'bootstrapped') { score += 5; }
  }

  if (secMaterial) { score += 25; reasons.push('SEC material event filed'); }

  // No data? Surface honestly.
  if (stock == null && revYoy == null && fundingStage == null && monthsSinceRaise == null && !secMaterial) {
    return { label: 'No data', color: '#64748b', rationale: 'Live financial signals unavailable for this company.', ring: 0 };
  }

  const ring = Math.min(100, score || 5);
  if (score >= 50)  return { label: 'Distressed', color: '#dc2626', rationale: reasons.join(' · ') || 'Multiple financial distress signals.', ring };
  if (score >= 25)  return { label: 'Weak',       color: '#f97316', rationale: reasons.join(' · ') || 'Mixed signals — caution.', ring };
  if (score >= 10)  return { label: 'Mixed',      color: '#f59e0b', rationale: reasons.join(' · ') || 'Some softening, mostly OK.', ring };
  return              { label: 'Healthy',     color: '#10b981', rationale: reasons.length ? reasons.join(' · ') : 'Financial signals nominal.', ring };
}

const Ring: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 56 }) => {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
};

const MiniChip: React.FC<{ label: string; value: string; tone: string }> = ({ label, value, tone }) => (
  <div className="flex flex-col items-start px-2.5 py-1.5 rounded-lg flex-shrink-0"
    style={{ background: tone + '15', border: `1px solid ${tone}30` }}>
    <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: tone + 'cc' }}>{label}</span>
    <span className="text-[11px] font-bold leading-tight" style={{ color: 'var(--alpha-text-85)' }}>{value}</span>
  </div>
);

export const FinancialHealthCard: React.FC<Props> = ({ result, defaultOpen = false }) => {
  const r = result as any;
  const [open, setOpen] = React.useState(defaultOpen);

  const verdict = computeVerdict(result);
  const stock      = r.companyData?.stock90DayChange ?? null;
  const revYoy     = r.companyData?.revenueGrowthYoY ?? null;
  const marketCap  = r.companyData?.marketCap ?? null;
  const peRatio    = r.companyData?.peRatio ?? null;
  const isPublic   = r.companyData?.isPublic === true;
  const fundingStage     = r.companyData?.lastFundingStage ?? null;
  const monthsSinceRaise = r.companyData?.monthsSinceLastRaise ?? null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${open ? verdict.color + '35' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.2s',
      }}
    >
      <button onClick={() => setOpen(o => !o)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
        <Ring pct={verdict.ring} color={verdict.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <LineChart className="w-3.5 h-3.5 flex-shrink-0" style={{ color: verdict.color }} />
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--alpha-text-50)' }}>
              Financial Health
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full ml-auto"
              style={{ background: verdict.color + '22', color: verdict.color }}>
              {verdict.label.toUpperCase()}
            </span>
          </div>
          <p className="text-[11px] leading-snug truncate" style={{ color: 'var(--alpha-text-55)' }}>
            {verdict.rationale}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} className="flex-shrink-0">
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--alpha-text-30)' }} />
        </motion.div>
      </button>

      {/* Always-visible chips */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {isPublic && typeof stock === 'number' && (
          <MiniChip label="Stock 90d" value={`${stock > 0 ? '+' : ''}${stock}%`}
            tone={stock < -10 ? '#dc2626' : stock < 0 ? '#f97316' : '#10b981'} />
        )}
        {typeof revYoy === 'number' && (
          <MiniChip label="Revenue YoY" value={`${revYoy > 0 ? '+' : ''}${revYoy}%`}
            tone={revYoy < 0 ? '#f97316' : '#10b981'} />
        )}
        {!isPublic && typeof monthsSinceRaise === 'number' && (
          <MiniChip label="Runway" value={`${monthsSinceRaise}mo`}
            tone={monthsSinceRaise >= 18 ? '#f97316' : '#10b981'} />
        )}
        {!isPublic && fundingStage && (
          <MiniChip label="Stage" value={fundingStage} tone="#06b6d4" />
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="drill"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
            style={{ borderTop: `1px solid ${verdict.color}20` }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
              <DrillCell title={isPublic ? 'Stock trend' : 'Funding stage'} tone="#06b6d4">
                <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
                  {isPublic
                    ? `${stock != null ? `${stock > 0 ? '+' : ''}${stock}% (90d)` : 'No live stock data'}`
                    + (marketCap ? ` · Market cap: ${formatLargeNum(marketCap)}` : '')
                    + (peRatio ? ` · P/E: ${peRatio}` : '')
                    : `${fundingStage ?? 'Unknown stage'}${monthsSinceRaise != null ? ` · ${monthsSinceRaise}mo since last raise` : ''}`}
                </p>
              </DrillCell>
              <DrillCell title="Revenue trajectory" tone={typeof revYoy === 'number' && revYoy < 0 ? '#f97316' : '#10b981'}>
                <p className="text-[11px]" style={{ color: 'var(--alpha-text-70)' }}>
                  {typeof revYoy === 'number'
                    ? `${revYoy > 0 ? '+' : ''}${revYoy}% YoY`
                    : 'No revenue YoY signal available'}
                </p>
              </DrillCell>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DrillCell: React.FC<{ title: string; tone: string; children: React.ReactNode }> = ({ title, tone, children }) => (
  <div className="rounded-xl px-3 py-2.5"
    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${tone}25` }}>
    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: tone + 'cc' }}>{title}</p>
    {children}
  </div>
);

function formatLargeNum(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default FinancialHealthCard;
