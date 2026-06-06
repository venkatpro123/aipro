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
      label: 'Private company — less public data available',
      impact: '±10 pts',
      reason: `${companyData?.name ?? 'This company'} doesn't file public financial reports. We're using news, hiring activity, and headcount instead.`,
      severity: 'high',
    });
  }

  // 2. Equity vest schedule not provided
  const hasEquity = uf.hasEquityVesting;
  const vestMonths = uf.equityVestMonths;
  if (hasEquity !== false && vestMonths == null) {
    items.push({
      id: 'equity-vest',
      label: 'No vesting schedule added',
      impact: '±5 pts',
      reason: 'Knowing when your equity vests helps us tell you whether to stay or go — and how to negotiate.',
      userAction: 'Add equity vest months in Profile',
      actionTab: 'profile',
      severity: 'medium',
    });
  }

  // 3. Personal profile mostly empty
  if (typeof personalFieldsFilled === 'number' && personalFieldsFilled < 3) {
    items.push({
      id: 'profile-empty',
      label: 'Your profile isn\'t complete yet',
      impact: '±8–25 pts',
      reason: 'Things like your visa, savings, and family situation change your personal risk a lot. Without them, we\'re only looking at the company side.',
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
        label: 'Visa status not added',
        impact: '±4 pts',
        reason: 'Your visa situation affects how much time you\'d have after a layoff — and what to do first.',
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
      label: `Some data is ${ageInDays} days old`,
      impact: '±3 pts',
      reason: 'We update hiring, news, and headcount data regularly. Data older than 2 weeks may not show what\'s happening right now.',
      severity: 'low',
    });
  }

  // 6. Low overall confidence
  const confPct = result?.confidencePercent ?? 0;
  if (confPct < 45 && items.length < 2) {
    items.push({
      id: 'low-confidence',
      label: 'Score is a rough guide — limited data available',
      impact: `±${Math.max(5, Math.round((60 - confPct) / 3))} pts`,
      reason: `We're only ${confPct}% confident in this score. Use it as a direction, not an exact number.`,
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
          <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {result?.confidencePercent ?? '?'}% confident ·{' '}
            <span style={{ color: headerColor }}>
              {items.length} gap{items.length !== 1 ? 's' : ''} in our data
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {highCount > 0 && (
            <AlertCircle className="w-3 h-3" style={{ color: '#f97316' }} />
          )}
          {open
            ? <ChevronUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
            : <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
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
              <p className="text-[10px] py-2 mb-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Here's what's missing — and how it affects your score:
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
                          <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            {item.label}
                          </span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${color}12`, color }}
                          >
                            {item.impact}
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.32)' }}>
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
