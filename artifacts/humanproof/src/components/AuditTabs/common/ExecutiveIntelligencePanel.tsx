// ExecutiveIntelligencePanel.tsx — Wave 8.1
//
// Only renders for detected executive users (C-suite, VP, Director, Founder,
// Staff+/Principal). Shows executive-specific intelligence unavailable to IC roles:
//   1. Headline + tier badge
//   2. Severance calculator (weeks + USD range, negotiation levers)
//   3. Non-compete risk meter
//   4. Board pressure signal (when applicable)
//   5. Equity vest urgency alert (when applicable)
//   6. Priority executive actions (top 5, urgency-sorted)
//
// Placed in ActionsTab as the first T1 block when isExecutive === true.
// Collapses to a chip otherwise — never visible to non-executive users.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, ChevronDown, ChevronUp, Shield, AlertTriangle,
  Scale, Users, TrendingUp, CheckCircle, Clock, Key,
} from 'lucide-react';
import type { ExecutiveIntelligenceResult } from '../../../services/executiveIntelligenceEngine';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  intelligence: ExecutiveIntelligenceResult;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  c_suite:   'C-SUITE',
  vp:        'VP-LEVEL',
  director:  'DIRECTOR',
  founder:   'FOUNDER',
  senior_ic: 'STAFF / PRINCIPAL',
};

function urgencyColor(u: 'critical' | 'high' | 'medium' | string): string {
  if (u === 'critical') return '#ef4444';
  if (u === 'high')     return '#f97316';
  return '#f59e0b';
}

function ncRiskColor(score: number): string {
  if (score >= 65) return '#f97316';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ icon: React.ElementType; label: string; color?: string }> = ({
  icon: Icon, label, color = 'rgba(255,255,255,0.35)',
}) => (
  <div className="flex items-center gap-1.5 mb-2">
    <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
    <p className="text-[10px] font-black tracking-[0.14em] uppercase" style={{ color }}>
      {label}
    </p>
  </div>
);

const ActionRow: React.FC<{
  action: ExecutiveIntelligenceResult['priorityActions'][number];
  index: number;
}> = ({ action, index }) => {
  const [open, setOpen] = useState(index === 0);
  const color = urgencyColor(action.urgency);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${color}18` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span
          className="flex-shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded uppercase"
          style={{ background: `${color}14`, color, border: `1px solid ${color}25` }}
        >
          {action.urgency}
        </span>
        <p className="flex-1 text-[10px] font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.80)' }}>
          {action.title}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{action.timeEstimate}</span>
          {open
            ? <ChevronUp className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.30)' }} />
            : <ChevronDown className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.30)' }} />
          }
        </div>
      </button>
      {open && (
        <div className="px-3 pb-2.5 pt-0.5">
          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
            {action.rationale}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const ExecutiveIntelligencePanel: React.FC<Props> = ({ intelligence }) => {
  const [open, setOpen] = useState(true);

  if (!intelligence.isExecutive) return null;

  const tierLabel = TIER_LABELS[intelligence.executiveTier ?? ''] ?? 'EXECUTIVE';
  const nc = intelligence.nonCompeteRisk;
  const sv = intelligence.severance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(139,92,246,0.05)',
        border: '1px solid rgba(139,92,246,0.22)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div
          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.14)' }}
        >
          <Briefcase className="w-4 h-4" style={{ color: '#a78bfa' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] font-black tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>
              EXECUTIVE INTELLIGENCE
            </p>
            <span
              className="text-[7px] font-black px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(139,92,246,0.16)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.30)' }}
            >
              {tierLabel}
            </span>
          </div>
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.48)' }}>
            {intelligence.headline}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.28)' }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.28)' }} />
        }
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="exec-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.20 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 pt-0 space-y-4"
              style={{ borderTop: '1px solid rgba(139,92,246,0.12)' }}
            >

              {/* Equity urgency alert */}
              {intelligence.equityUrgency !== 'none' && (
                <div
                  className="rounded-xl px-3.5 py-3 mt-3"
                  style={{
                    background: intelligence.equityUrgency === 'critical'
                      ? 'rgba(239,68,68,0.07)'
                      : 'rgba(249,115,22,0.07)',
                    border: `1px solid ${intelligence.equityUrgency === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(249,115,22,0.25)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Key className="w-3 h-3" style={{ color: intelligence.equityUrgency === 'critical' ? '#ef4444' : '#f97316' }} />
                    <p className="text-[10px] font-black tracking-wide"
                      style={{ color: intelligence.equityUrgency === 'critical' ? '#ef4444' : '#f97316' }}>
                      EQUITY VEST ALERT — {intelligence.equityUrgency.toUpperCase()}
                    </p>
                  </div>
                  <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {intelligence.equityUrgency === 'critical'
                      ? 'Unvested equity vests within 3 months. Any restructuring announcement before then forfeits it. Negotiate accelerated vest or retention bonus immediately.'
                      : 'Equity vest approaching within 12 months at elevated company risk. Proactive retention negotiation now secures this income before leverage shifts.'}
                  </p>
                </div>
              )}

              {/* 2-col grid: Severance + NC Risk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {/* Severance */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <SectionTitle icon={Scale} label="Severance range" color="#22d3ee" />
                  <p className="text-[18px] font-black" style={{ color: '#22d3ee' }}>
                    {sv.estimatedUsdRange}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {sv.minWeeks}–{sv.maxWeeks} weeks base salary
                  </p>
                  <p className="text-[10px] mt-1.5 italic leading-snug" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    First offer is rarely final at this level — negotiate.
                  </p>
                </div>

                {/* Non-compete risk */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <SectionTitle icon={Shield} label="Non-compete risk" color={ncRiskColor(nc.riskScore)} />
                  <p className="text-[18px] font-black" style={{ color: ncRiskColor(nc.riskScore) }}>
                    {nc.riskScore}/100
                  </p>
                  <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.40)' }}>
                    {nc.riskScore >= 60 ? 'High — attorney review recommended' : nc.riskScore >= 40 ? 'Moderate — review terms carefully' : 'Low — limited enforcement jurisdiction'}
                  </p>
                </div>
              </div>

              {/* Board pressure */}
              {intelligence.boardPressureScore >= 45 && (
                <div
                  className="rounded-xl px-3.5 py-3"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <SectionTitle icon={Users} label="Board pressure" />
                    <span className="text-[10px] font-black" style={{ color: urgencyColor(intelligence.boardPressureScore >= 75 ? 'critical' : intelligence.boardPressureScore >= 50 ? 'high' : 'medium') }}>
                      {intelligence.boardPressureScore}/100
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                    {intelligence.boardPressureNarrative}
                  </p>
                  {intelligence.successorThreatNarrative && (
                    <div className="flex items-start gap-1.5 mt-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                      <p className="text-[10px] italic leading-snug" style={{ color: '#f59e0b80' }}>
                        {intelligence.successorThreatNarrative}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Negotiation levers (collapsible) */}
              {sv.negotiationLevers.length > 0 && (
                <div>
                  <SectionTitle icon={TrendingUp} label="Severance negotiation levers" />
                  <div className="space-y-1">
                    {sv.negotiationLevers.slice(0, 4).map((lever, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" style={{ color: 'rgba(34,211,238,0.50)' }} />
                        <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {lever}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority executive actions */}
              {intelligence.priorityActions.length > 0 && (
                <div>
                  <SectionTitle icon={Clock} label="Your executive priority actions" color="#a78bfa" />
                  <div className="space-y-1.5">
                    {intelligence.priorityActions.map((action, i) => (
                      <ActionRow key={i} action={action} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* NC assessment */}
              <div
                className="rounded-xl px-3.5 py-2.5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  <span className="font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>Non-compete: </span>
                  {nc.assessment}
                </p>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Executive intelligence is based on your self-reported title, tenure, and compensation band.
                Severance ranges reflect market norms for your tier, not legal advice. Consult an employment
                attorney before making any decisions based on these estimates.
              </p>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExecutiveIntelligencePanel;
