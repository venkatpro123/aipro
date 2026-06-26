// FreelancerRiskPanel.tsx — Wave 8.4
//
// Renders freelancer / contractor / consultant specific risk intelligence.
// Only renders when isFreelancer === true (detected from job title).
//
// Layout:
//   1. Header with type badge + headline
//   2. Risk summary (client concentration alert)
//   3. 2-col grid: client concentration score + financial profile
//   4. Pipeline channels
//   5. Priority actions (expandable)
//
// Placed in ProtectionTab as a T2 block, before CareerInsuranceStatus.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ChevronDown, ChevronUp, AlertTriangle,
  DollarSign, FileText, Zap, CheckCircle, Shield,
  TrendingUp, Layers,
} from 'lucide-react';
import type { FreelancerIntelligenceResult } from '../../../services/freelancerIntelligenceEngine';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  intelligence: FreelancerIntelligenceResult;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  freelancer:   'FREELANCER',
  consultant:   'CONSULTANT',
  contractor:   'CONTRACTOR',
  agency_owner: 'AGENCY OWNER',
  solopreneur:  'SOLOPRENEUR',
};

function concentrationColor(tier: string): string {
  switch (tier) {
    case 'catastrophic': return '#ef4444';
    case 'high':         return '#f97316';
    case 'moderate':     return '#f59e0b';
    default:             return '#10b981';
  }
}

function urgencyColor(u: string): string {
  if (u === 'critical') return '#ef4444';
  if (u === 'high')     return '#f97316';
  return '#f59e0b';
}

function categoryIcon(cat: string): React.ElementType {
  const map: Record<string, React.ElementType> = {
    pipeline:    TrendingUp,
    financial:   DollarSign,
    legal:       FileText,
    positioning: Layers,
  };
  return map[cat] ?? CheckCircle;
}

// ── Sub-component: Action row ─────────────────────────────────────────────────

const ActionRow: React.FC<{
  action: FreelancerIntelligenceResult['priorityActions'][number];
  index: number;
}> = ({ action, index }) => {
  const [open, setOpen] = useState(index === 0);
  const color = urgencyColor(action.urgency);
  const CatIcon = categoryIcon(action.category);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--alpha-bg-04)', border: `1px solid ${color}18` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <CatIcon className="w-3 h-3 flex-shrink-0" style={{ color: `${color}80` }} />
        <p className="flex-1 text-[10px] font-semibold leading-snug" style={{ color: 'var(--alpha-text-85)' }}>
          {action.title}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>{action.timeEstimate}</span>
          {open
            ? <ChevronUp className="w-3 h-3" style={{ color: 'var(--alpha-text-25)' }} />
            : <ChevronDown className="w-3 h-3" style={{ color: 'var(--alpha-text-25)' }} />
          }
        </div>
      </button>
      {open && (
        <div className="px-3 pb-2.5 pt-0">
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
            {action.rationale}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const FreelancerRiskPanel: React.FC<Props> = ({ intelligence }) => {
  const [open, setOpen] = useState(true);

  if (!intelligence.isFreelancer) return null;

  const typeLabel = TYPE_LABELS[intelligence.freelancerType ?? ''] ?? 'INDEPENDENT';
  const cc = intelligence.clientConcentration;
  const fp = intelligence.financialProfile;
  const pd = intelligence.pipelineDiversification;
  const concentColor = concentrationColor(cc.tier);
  const isHighRisk = cc.tier === 'catastrophic' || cc.tier === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(99,102,241,0.05)',
        border: `1px solid ${isHighRisk ? `${concentColor}28` : 'rgba(99,102,241,0.22)'}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: isHighRisk ? `${concentColor}16` : 'rgba(99,102,241,0.14)' }}
        >
          <Users className="w-4 h-4" style={{ color: isHighRisk ? concentColor : '#818cf8' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] font-black tracking-wide" style={{ color: 'var(--alpha-text-85)' }}>
              FREELANCER INTELLIGENCE
            </p>
            <span
              className="text-[7px] font-black px-1.5 py-0.5 rounded"
              style={{
                background: isHighRisk ? `${concentColor}14` : 'rgba(99,102,241,0.16)',
                color: isHighRisk ? concentColor : '#818cf8',
                border: `1px solid ${isHighRisk ? `${concentColor}28` : 'rgba(99,102,241,0.30)'}`,
              }}
            >
              {typeLabel}
            </span>
          </div>
          <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
            {intelligence.headline}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--alpha-text-25)' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--alpha-text-25)' }} />
        }
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="fl-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.20 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 space-y-4"
              style={{ borderTop: '1px solid rgba(99,102,241,0.12)' }}
            >

              {/* Risk summary */}
              <div
                className="mt-3 rounded-xl px-3.5 py-3"
                style={{
                  background: `${concentColor}07`,
                  border: `1px solid ${concentColor}20`,
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: concentColor }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
                    {intelligence.riskSummary}
                  </p>
                </div>
              </div>

              {/* 2-col grid: concentration + financial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Client concentration */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className="w-3 h-3" style={{ color: concentColor }} />
                    <p className="text-[10px] font-black tracking-widest" style={{ color: concentColor }}>
                      CLIENT RISK
                    </p>
                  </div>
                  <p className="text-[18px] font-black capitalize" style={{ color: concentColor }}>
                    {cc.tier}
                  </p>
                  <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--alpha-text-35)' }}>
                    Concentration score: {cc.score}/100
                  </p>
                  <p className="text-[10px] mt-1.5 italic leading-snug" style={{ color: 'var(--alpha-text-25)' }}>
                    {cc.lossImpact}
                  </p>
                </div>

                {/* Financial profile */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign className="w-3 h-3" style={{ color: 'var(--color-cyan-text)' }} />
                    <p className="text-[10px] font-black tracking-widest" style={{ color: 'var(--alpha-text-35)' }}>
                      FINANCES
                    </p>
                  </div>
                  <p className="text-[16px] font-black" style={{ color: 'var(--color-cyan-text)' }}>
                    {fp.recommendedRunwayMonths}mo
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--alpha-text-35)' }}>
                    recommended runway
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--alpha-text-35)' }}>
                    Tax reserve: <span className="font-bold text-[#f59e0b]">{fp.taxReservePct}%</span> of each invoice
                  </p>
                  {fp.runwayGapMonths != null && fp.runwayGapMonths > 0 && (
                    <p className="text-[10px] mt-1 font-bold" style={{ color: '#f97316' }}>
                      Gap: {fp.runwayGapMonths}mo short
                    </p>
                  )}
                </div>
              </div>

              {/* Pipeline channels */}
              {pd.channels.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3 h-3" style={{ color: 'var(--color-indigo-text)' }} />
                    <p className="text-[10px] font-black tracking-widest" style={{ color: 'var(--alpha-text-35)' }}>
                      PIPELINE CHANNELS TO ACTIVATE
                    </p>
                  </div>
                  <div className="space-y-1">
                    {pd.channels.map((channel, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Zap className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(129,140,248,0.55)' }} />
                        <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
                          {channel}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rate benchmarking */}
              <div
                className="rounded-xl px-3.5 py-2.5"
                style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}
              >
                <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: 'var(--alpha-text-25)' }}>
                  RATE BENCHMARK
                </p>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
                  {fp.rateBenchmark}
                </p>
              </div>

              {/* Priority actions */}
              {intelligence.priorityActions.length > 0 && (
                <div>
                  <p className="text-[10px] font-black tracking-widest mb-2" style={{ color: 'var(--alpha-text-25)' }}>
                    YOUR FREELANCER PRIORITY ACTIONS
                  </p>
                  <div className="space-y-1.5">
                    {intelligence.priorityActions.map((action, i) => (
                      <ActionRow key={i} action={action} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Client recommendation */}
              <p className="text-[10px] leading-relaxed italic" style={{ color: 'var(--alpha-text-25)' }}>
                {cc.recommendation}
              </p>

              {/* Disclaimer */}
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-25)' }}>
                Freelancer intelligence is derived from your self-reported job title. Client concentration
                and financial estimates are modeled from typical patterns — add more profile data for
                sharper personalization. This is not financial or legal advice.
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FreelancerRiskPanel;
