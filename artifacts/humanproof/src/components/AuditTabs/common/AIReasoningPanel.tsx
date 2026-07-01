// AIReasoningPanel.tsx — Phase 1 enhanced with visual reasoning flow
//
// Now leads with a visual "dimension flow scorecard" — users see at a glance
// which 3 dimensions drive the score and their relative weight. The existing
// text accordion remains as an optional "deep dive" layer.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Info, GitMerge } from 'lucide-react';

interface DimensionReasoning {
  label: string;           // "Company Financial Health"
  shortKey: string;        // "L1" or "D1"
  score: number;           // 0–100
  weight: number;          // 0–1 (contribution weight)
  reasoning: string;       // "Revenue declining 8% QoQ. PE ratio 42× (elevated)."
  conclusion: string;      // "When revenue falls and PE is high, cost cuts follow."
  evidenceType: 'live' | 'regulatory' | 'heuristic' | 'derived';
  dataPoint?: string;      // Specific number or fact: "Revenue: −8% QoQ"
}

interface Props {
  // Can be built from HybridResult breakdown + signalAttribution
  dimensions: DimensionReasoning[];
  finalScore: number;
  confidencePercent: number;
  primaryDataSources?: string[];
  topInsight?: string;     // One-line synthesis
}

const EVIDENCE_CONFIG = {
  live:       { color: 'var(--color-emerald-text)', label: 'Live data'       },
  regulatory: { color: 'var(--color-cyan-text)', label: 'Official filings' },
  heuristic:  { color: 'var(--color-amber500-text)', label: 'Estimated'     },
  derived:    { color: 'var(--color-violet-text)', label: 'Calculated'      },
};

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return 'var(--color-orange-text)';
  if (score >= 35) return 'var(--color-amber500-text)';
  return 'var(--color-emerald-text)';
}

const DimensionRow: React.FC<{ dim: DimensionReasoning; rank: number; isFirst: boolean }> = ({
  dim, rank, isFirst,
}) => {
  const [open, setOpen] = useState(isFirst);
  const color = scoreColor(dim.score);
  const evCfg = EVIDENCE_CONFIG[dim.evidenceType] ?? EVIDENCE_CONFIG.heuristic;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${isFirst ? 'rgba(34,211,238,0.20)' : 'var(--alpha-bg-06)'}` }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 text-left"
        style={{ background: isFirst ? 'rgba(34,211,238,0.04)' : 'var(--alpha-bg-04)' }}
      >
        {/* Rank badge */}
        <span
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{
            background: isFirst ? 'rgba(34,211,238,0.18)' : 'var(--alpha-bg-06)',
            color: isFirst ? '#22d3ee' : 'var(--alpha-text-35)',
          }}
        >
          {rank + 1}
        </span>

        {/* Dimension info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--alpha-text-85)' }}>
              {dim.label}
            </p>
            <span className="text-[10px] font-bold px-1 py-0.5 rounded"
              style={{ background: `${evCfg.color}12`, color: evCfg.color, border: `1px solid ${evCfg.color}25` }}>
              {evCfg.label}
            </span>
          </div>
          {!open && dim.dataPoint && (
            <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--alpha-text-35)' }}>
              {dim.dataPoint}
            </p>
          )}
        </div>

        {/* Score + weight */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span className="text-[14px] font-black" style={{ color }}>{dim.score}</span>
            <p className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
              {Math.round(dim.weight * 100)}% wt
            </p>
          </div>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--alpha-text-30)' }} />
            : <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--alpha-text-30)' }} />
          }
        </div>
      </button>

      {/* Expanded reasoning */}
      {open && (
        <div
          className="px-4 pb-3 pt-2"
          style={{ background: isFirst ? 'rgba(34,211,238,0.02)' : 'transparent' }}
        >
          {dim.dataPoint && (
            <div className="mb-2 px-2 py-1 rounded-lg inline-flex"
              style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
              <span className="text-[10px] font-bold" style={{ color }}>
                📊 {dim.dataPoint}
              </span>
            </div>
          )}
          <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: 'var(--alpha-text-55)' }}>
            {dim.reasoning}
          </p>
          <div className="flex items-start gap-1.5">
            <span className="text-[10px] font-black flex-shrink-0 mt-0.5" style={{ color: 'var(--color-cyan-text)' }}>→</span>
            <p className="text-[10px] italic leading-snug" style={{ color: 'rgba(34,211,238,0.72)' }}>
              {dim.conclusion}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Visual Reasoning Flow ─────────────────────────────────────────────────────
// Shows dimensions as nodes → weighted arrows → final score node.
// Replaces the visual gap that previously forced users to read 3 text blocks
// just to understand which factors matter.

const ReasoningFlowViz: React.FC<{
  dims: DimensionReasoning[];
  finalScore: number;
  confidencePercent: number;
}> = ({ dims, finalScore, confidencePercent }) => {
  const finalColor = scoreColor(finalScore);
  // Calculate weight percentages for bar widths
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0) || 1;

  return (
    <motion.div
      className="rfv-wrap"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Dimension nodes */}
      <div className="rfv-nodes">
        {dims.map((dim, i) => {
          const color  = scoreColor(dim.score);
          const wtPct  = Math.round((dim.weight / totalWeight) * 100);
          const evCfg  = EVIDENCE_CONFIG[dim.evidenceType] ?? EVIDENCE_CONFIG.heuristic;

          return (
            <motion.div
              key={dim.shortKey}
              className="rfv-node"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.28 }}
            >
              {/* Score circle */}
              <div className="rfv-score-ring" style={{ '--rfv-color': color } as React.CSSProperties}>
                <svg viewBox="0 0 40 40" className="rfv-ring-svg">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--alpha-bg-06)" strokeWidth="3" />
                  <motion.circle
                    cx="20" cy="20" r="16"
                    fill="none" stroke={color} strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - dim.score / 100) }}
                    transition={{ delay: 0.20 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '20px 20px' }}
                  />
                </svg>
                <span className="rfv-ring-score" style={{ color }}>{dim.score}</span>
              </div>

              {/* Label + meta */}
              <div className="rfv-node-info">
                <p className="rfv-node-label">{dim.label}</p>
                <div className="rfv-node-meta">
                  <span className="rfv-ev-badge" style={{ color: evCfg.color, background: `${evCfg.color}14`, borderColor: `${evCfg.color}25` }}>
                    {evCfg.label}
                  </span>
                  <span className="rfv-wt-badge">{wtPct}% wt</span>
                </div>

                {/* Weight bar */}
                <div className="rfv-wt-bar-track">
                  <motion.div
                    className="rfv-wt-bar-fill"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${wtPct}%` }}
                    transition={{ delay: 0.30 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Arrow + final score */}
      <motion.div
        className="rfv-final"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.40, duration: 0.35 }}
      >
        <div className="rfv-arrow">
          <GitMerge className="w-5 h-5" style={{ color: 'var(--alpha-text-25)' }} />
        </div>
        <div className="rfv-final-score" style={{ '--rfv-final-color': finalColor } as React.CSSProperties}>
          <span className="rfv-final-num" style={{ color: finalColor }}>{finalScore}</span>
          <span className="rfv-final-label">COMBINED</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AIReasoningPanel: React.FC<Props> = ({
  dimensions, finalScore, confidencePercent, primaryDataSources = [], topInsight,
}) => {
  if (dimensions.length === 0) return null;

  const top3 = dimensions.slice(0, 3);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4" style={{ color: 'rgba(34,211,238,0.60)' }} />
        <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: 'var(--alpha-text-35)' }}>
          WHY THIS SCORE
        </p>
      </div>

      {/* Top insight */}
      {topInsight && (
        <p className="text-[11px] leading-relaxed italic" style={{ color: 'var(--alpha-text-50)' }}>
          "{topInsight}"
        </p>
      )}

      {/* ── VISUAL FLOW DIAGRAM ─────────────────────────────────────────────── */}
      <ReasoningFlowViz dims={top3} finalScore={finalScore} confidencePercent={confidencePercent} />

      {/* Collapsible detailed reasoning */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}
        onClick={() => setShowDetail(v => !v)}
      >
        <p className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--alpha-text-30)' }}>
          DETAILED REASONING
        </p>
        {showDetail
          ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--alpha-text-25)' }} />
          : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--alpha-text-25)' }} />
        }
      </button>

      {showDetail && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.20 }}
          className="space-y-1.5 overflow-hidden"
        >
          {top3.map((dim, i) => (
            <DimensionRow key={dim.shortKey} dim={dim} rank={i} isFirst={i === 0} />
          ))}
        </motion.div>
      )}

      {/* Score combination footer */}
      {primaryDataSources.length > 0 && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}
        >
          <Info className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'var(--alpha-text-25)' }} />
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
            Sources: {primaryDataSources.join(' + ')}
          </p>
        </div>
      )}
    </motion.div>
  );
};

// ── Helper: build DimensionReasoning from HybridResult ────────────────────────
// Used in AnalysisTab to construct the panel from raw result data.

export function buildDimensionsFromResult(result: any): DimensionReasoning[] {
  const bd = result.breakdown ?? {};
  const dims: DimensionReasoning[] = [];

  // L1 — Company financial health
  if (bd.L1 != null) {
    const score = Math.round(bd.L1 * 100);
    const revGrowth = result.companyData?.revenueGrowthYoY;
    const pe = result.companyData?.peRatio;
    dims.push({
      label: 'Company Financial Health',
      shortKey: 'L1',
      score,
      weight: 0.30,
      reasoning: [
        revGrowth != null ? `Revenue growth: ${revGrowth > 0 ? '+' : ''}${(revGrowth * 100).toFixed(1)}% YoY.` : null,
        pe != null ? `P/E ratio: ${pe.toFixed(1)}× (${pe > 30 ? 'elevated — market expects cuts' : 'within normal range'}).` : null,
        result.hiringSignal ? `Hiring signal detected.` : null,
      ].filter(Boolean).join(' ') || 'Financial health signals analyzed from available data.',
      conclusion: score >= 70
        ? 'Declining financials are the primary leading indicator of headcount decisions.'
        : score >= 50
        ? 'Financial signals show moderate stress — monitoring recommended.'
        : 'Financial health appears stable — not a primary risk driver.',
      evidenceType: result._liveDataCoverage?.overallSource === 'live' ? 'live' : 'heuristic',
      dataPoint: revGrowth != null ? `Revenue: ${revGrowth > 0 ? '+' : ''}${(revGrowth * 100).toFixed(1)}% vs. last year` : undefined,
    });
  }

  // L2 — Layoff history recency
  if (bd.L2 != null) {
    const score = Math.round(bd.L2 * 100);
    const rounds = result.companyData?.layoffRounds ?? 0;
    dims.push({
      label: 'Layoff History & Recency',
      shortKey: 'L2',
      score,
      weight: 0.20,
      reasoning: rounds > 0
        ? `${rounds} layoff round${rounds > 1 ? 's' : ''} detected in the past 24 months. Recent layoffs significantly increase probability of follow-on reduction.`
        : 'No confirmed layoff rounds detected in recent data.',
      conclusion: score >= 65
        ? 'Companies that layoff once are 3× more likely to reduce again within 12 months.'
        : 'No strong layoff precedent — reduces near-term probability.',
      evidenceType: rounds > 0 ? 'live' : 'heuristic',
      dataPoint: rounds > 0 ? `${rounds} layoff round${rounds > 1 ? 's' : ''} in 24mo` : undefined,
    });
  }

  // L3 — Role displacement risk
  if (bd.L3 != null) {
    const score = Math.round(bd.L3 * 100);
    dims.push({
      label: 'Role Displacement Risk',
      shortKey: 'L3',
      score,
      weight: 0.18,
      reasoning: 'AI automation exposure and market demand shifts assessed for this specific role category.',
      conclusion: score >= 60
        ? 'Your role has moderate-to-high AI exposure. Building adjacent skills is the primary hedge.'
        : 'Your role is relatively protected from near-term displacement.',
      evidenceType: 'derived',
    });
  }

  // Sort by impact (score × weight, descending)
  dims.sort((a, b) => (b.score * b.weight) - (a.score * a.weight));

  return dims.slice(0, 3);
}

export default AIReasoningPanel;
