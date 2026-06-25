// MissingDataCard.tsx — Wave 10.3 Data Absence Transparency
//
// PROBLEM: Platform shows "67% confidence" without disclosing WHAT data is
// missing. Users can't calibrate their trust without knowing the gaps.
//
// SOLUTION: A collapsible "What we don't know yet" card that:
//   • Derives missing-data items from existing HybridResult fields
//   • Shows: field name, score impact (±N pts), how to fill or why it's missing
//   • Only renders when ≥2 meaningful gaps exist (avoid noise for good data)
//   • Default collapsed — doesn't dominate SummaryTab
//
// Data sources (all existing fields, no new pipeline):
//   • companyData.isPublic → no SEC filings for private companies
//   • userFactors.hasEquityVesting / equityVestMonths → equity vest gap
//   • result.confidencePercent → overall low confidence signal
//   • dataFreshness.ageInDays → stale data
//   • personalFieldsFilled < 3 → personal profile empty
//   • visaStatus 'unknown' → visa dependency unclear

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MissingDataItem {
  id: string;
  label: string;           // "Private company — no SEC filings"
  impact: string;          // "±10 pts"
  reason: string;          // Why it's missing
  userAction?: string;     // "Add equity vest schedule in Profile"
  actionTab?: string;      // tab to navigate to for the action
  severity: 'high' | 'medium' | 'low';
}

interface Props {
  result: any;             // HybridResult as any — avoids import cycle
  companyData?: { isPublic?: boolean; name?: string };
  personalFieldsFilled?: number;
}

// ── Derive missing data items ─────────────────────────────────────────────────

export function deriveMissingDataItems(
  result: any,
  companyData?: { isPublic?: boolean; name?: string },
  personalFieldsFilled?: number,
): MissingDataItem[] {
  const items: MissingDataItem[] = [];
  const uf = result?.userFactors ?? {};

  // 1. Private company — no SEC / public filings
  if (companyData?.isPublic === false || result?.companyData?.isPublic === false) {
    items.push({
      id: 'private-company',
      label: 'Private company — no SEC filings',
      impact: '±10 pts',
      reason: `${companyData?.name ?? 'This company'} hasn't filed public financial disclosures. Financial health signals rely on news + LinkedIn + headcount proxies.`,
      severity: 'high',
    });
  }

  // 2. Equity vest schedule not provided
  const hasEquity = uf.hasEquityVesting;
  const vestMonths = uf.equityVestMonths;
  if (hasEquity !== false && vestMonths == null) {
    items.push({
      id: 'equity-vest',
      label: 'Equity vest schedule not provided',
      impact: '±5 pts',
      reason: 'Without vest timing, the model can\'t weight stay-vs-leave timing and negotiation leverage.',
      userAction: 'Add equity vest months in Profile',
      actionTab: 'profile',
      severity: 'medium',
    });
  }

  // 3. Personal profile mostly empty
  if (typeof personalFieldsFilled === 'number' && personalFieldsFilled < 3) {
    items.push({
      id: 'profile-empty',
      label: 'Personal risk factors not filled',
      impact: '±8–25 pts',
      reason: 'Visa status, financial runway, and family situation amplify or dampen company risk. Without them, score reflects company exposure only.',
      userAction: 'Fill out your profile',
      actionTab: 'profile',
      severity: 'high',
    });
  }

  // 4. Visa status unknown
  if (uf.visaStatus === 'unknown' || uf.visaStatus == null) {
    if ((personalFieldsFilled ?? 0) >= 2) {
      // Only add this if they've filled SOME profile fields but missed visa
      items.push({
        id: 'visa-unknown',
        label: 'Visa dependency not specified',
        impact: '±4 pts',
        reason: 'Work authorization status changes how much time you have if laid off and which actions matter most.',
        userAction: 'Add visa status in Profile',
        actionTab: 'profile',
        severity: 'medium',
      });
    }
  }

  // 5. Stale data
  const ageInDays = result?.dataFreshness?.ageInDays ?? 0;
  if (ageInDays >= 14) {
    items.push({
      id: 'stale-data',
      label: `Some signals are ${ageInDays} days old`,
      impact: '±3 pts',
      reason: 'Hiring, news, and headcount data refreshes on a rolling schedule. Signals older than 14 days may not reflect current conditions.',
      severity: 'low',
    });
  }

  // 6. Low overall confidence
  const confPct = result?.confidencePercent ?? 0;
  if (confPct < 45 && items.length < 2) {
    items.push({
      id: 'low-confidence',
      label: 'Low overall data confidence',
      impact: `±${Math.max(5, Math.round((60 - confPct) / 3))} pts`,
      reason: `Confidence is ${confPct}% — below the typical 60% threshold. The score is a direction indicator, not a precise measurement.`,
      severity: 'medium',
    });
  }

  return items;
}

// ── Component ─────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  high:   '#f97316',
  medium: '#f59e0b',
  low:    '#22d3ee',
};

export const MissingDataCard: React.FC<Props> = ({ result, companyData, personalFieldsFilled }) => {
  const [open, setOpen] = useState(false);
  const items = deriveMissingDataItems(result, companyData, personalFieldsFilled);

  // Only render when there are meaningful gaps (2+)
  if (items.length < 2) return null;

  const highCount = items.filter(i => i.severity === 'high').length;
  const headerColor = highCount > 0 ? '#f97316' : '#f59e0b';

  const handleActionClick = (item: MissingDataItem) => {
    if (!item.actionTab) return;
    if (item.actionTab === 'profile') {
      // Open ProfileSetupModal. Deep-link to the Financial step for equity/runway
      // fields, otherwise open at the Core step.
      const profileStep = item.id === 'equity-vest' ? 'financial' : 'core';
      window.dispatchEvent(new CustomEvent('hp.profile.open', { detail: { step: profileStep } }));
    } else {
      window.dispatchEvent(new CustomEvent('hp.dashboard.navigate', { detail: { tab: item.actionTab } }));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${headerColor}18`,
      }}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <EyeOff className="w-3 h-3 flex-shrink-0" style={{ color: `${headerColor}70` }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold" style={{ color: 'var(--alpha-text-35)' }}>
            CONFIDENCE: {result?.confidencePercent ?? '?'}% —{' '}
            <span style={{ color: headerColor }}>
              {items.length} data gap{items.length !== 1 ? 's' : ''} affecting this score
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {highCount > 0 && (
            <AlertCircle className="w-3 h-3" style={{ color: '#f97316' }} />
          )}
          {open
            ? <ChevronUp className="w-3 h-3" style={{ color: 'var(--alpha-text-25)' }} />
            : <ChevronDown className="w-3 h-3" style={{ color: 'var(--alpha-text-25)' }} />
          }
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="missing-data-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-3.5 pb-3 pt-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <p className="text-[10px] py-2 mb-2" style={{ color: 'var(--alpha-text-25)' }}>
                What we don't know yet — and how it affects your score:
              </p>
              <div className="space-y-2">
                {items.map(item => {
                  const color = SEVERITY_COLOR[item.severity];
                  return (
                    <div key={item.id} className="flex items-start gap-2">
                      <div
                        className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-55)' }}>
                            {item.label}
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${color}12`, color }}
                          >
                            {item.impact}
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--alpha-text-30)' }}>
                          {item.reason}
                        </p>
                        {item.userAction && (
                          <button
                            onClick={() => handleActionClick(item)}
                            className="text-[10px] font-bold mt-0.5 transition-opacity hover:opacity-80"
                            style={{ color: '#22d3ee' }}
                          >
                            → {item.userAction}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MissingDataCard;
