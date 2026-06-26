/**
 * CompetitivePositionPanel.tsx — v45.0
 *
 * Displays the user's competitive market position from competitivePositionEngine.ts.
 * The core UI is the percentile visualization with 6-dimension radar breakdown.
 *
 * Design:
 * - Percentile ring hero: large "59th percentile" display
 * - 6-dimension bars: skills / network / experience / visibility / certs / compensation
 * - Gap roadmap: ordered by ROI (percentile lift ÷ effort)
 * - Competitive edges: what the user does better than peers
 * - "Unique positioning" statement for the job search
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Target, TrendingUp, Users, BookOpen, Eye,
  DollarSign, Briefcase, ChevronDown, ChevronUp,
  ArrowUpRight, Zap, CheckCircle
} from "lucide-react";
import type {
  CompetitivePositionResult,
  CompetitiveDimension,
  GapCloseAction,
  CompetitiveEdge,
} from "@/services/competitivePositionEngine";

interface CompetitivePositionPanelProps {
  position: CompetitivePositionResult;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  skills:         <BookOpen className="w-3.5 h-3.5" />,
  network:        <Users className="w-3.5 h-3.5" />,
  experience:     <Briefcase className="w-3.5 h-3.5" />,
  visibility:     <Eye className="w-3.5 h-3.5" />,
  certifications: <Award className="w-3.5 h-3.5" />,
  compensation:   <DollarSign className="w-3.5 h-3.5" />,
};

const STATUS_CONFIG: Record<CompetitiveDimension['status'], { color: string; label: string }> = {
  ahead:        { color: 'var(--color-emerald-text)', label: 'Ahead'         },
  competitive:  { color: 'var(--color-blue500-text)', label: 'Competitive'   },
  gap:          { color: 'var(--color-amber500-text)', label: 'Gap'           },
  critical_gap: { color: 'var(--color-red-text)', label: 'Critical Gap'  },
};

const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
  top_tier:     { color: 'var(--color-emerald-text)', label: 'Top Tier'     },
  competitive:  { color: 'var(--color-blue500-text)', label: 'Competitive'  },
  average:      { color: 'var(--color-amber500-text)', label: 'Average'      },
  below_average:{ color: 'var(--color-orange-text)', label: 'Below Average' },
  critical:     { color: 'var(--color-red-text)', label: 'Critical'     },
};

// ─── Percentile ring ─────────────────────────────────────────────────────────

function PercentileRing({
  percentile,
  category,
}: {
  percentile: number;
  category: CompetitivePositionResult['percentileCategory'];
}) {
  const cat = CATEGORY_CONFIG[category];
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percentile / 100);

  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {/* Track */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--alpha-bg-06)" strokeWidth="6" />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke={cat.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 4px ${cat.color}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-[var(--alpha-text-85)]">{percentile}</div>
        <div className="text-[10px] text-[var(--alpha-text-40)] -mt-0.5">percentile</div>
      </div>
    </div>
  );
}

// ─── Dimension bar ────────────────────────────────────────────────────────────

function DimensionBar({ dim }: { dim: CompetitiveDimension }) {
  const status = STATUS_CONFIG[dim.status];
  const [tooltip, setTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
          <span style={{ color: status.color }} className="flex-shrink-0">
            {DIMENSION_ICONS[dim.key]}
          </span>
          <span className="text-xs text-[var(--alpha-text-60)] truncate">{dim.label.split(' ')[0]}</span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-[var(--alpha-bg-07)] relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${dim.userScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: status.color }}
          />
          {/* Benchmark marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 rounded-full"
            style={{ left: `${dim.benchmarkScore}%`, background: 'var(--alpha-text-25)' }}
          />
        </div>
        <span className="text-[11px] w-12 text-right font-medium" style={{ color: status.color }}>
          {dim.percentile}th
        </span>
        <span
          className="text-[10px] px-1 py-0.5 rounded-full hidden sm:block"
          style={{ color: status.color, background: `${status.color}12` }}
        >
          {status.label}
        </span>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 top-6 z-10 rounded-lg p-2.5 shadow-xl max-w-xs w-72"
            style={{ background: 'rgba(20,20,30,0.96)', border: '1px solid var(--alpha-bg-08)' }}
          >
            <p className="text-xs text-[var(--alpha-text-70)] mb-1">{dim.evidence}</p>
            <p className="text-[11px] text-[var(--alpha-text-45)]">{dim.improvementAction}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Gap action card ──────────────────────────────────────────────────────────

function GapActionCard({ gap, index }: { gap: GapCloseAction; index: number }) {
  const pctColor = gap.percentileImpact >= 12 ? 'var(--color-emerald-text)' : gap.percentileImpact >= 8 ? '#3b82f6' : 'var(--color-amber500-text)';

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: index < 4 ? '1px solid var(--alpha-bg-06)' : 'none' }}
    >
      {/* Priority number */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
        style={{ background: `${pctColor}15`, color: pctColor }}
      >
        {gap.priority}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-[var(--alpha-text-78)] leading-snug">{gap.action}</p>
          <div className="flex-shrink-0 text-right">
            <div className="text-sm font-bold" style={{ color: pctColor }}>+{gap.percentileImpact}pts</div>
            <div className="text-[10px] text-[var(--alpha-text-25)]">{gap.effortWeeks}w</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-[var(--alpha-text-35)]">{gap.deadline}</span>
          <span className="text-[10px] text-[var(--alpha-text-15)]">·</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-35)' }}
          >
            {gap.category}
          </span>
          <span className="text-[10px] text-[var(--alpha-text-15)]">·</span>
          <span className="text-[10px] text-[var(--alpha-text-35)]">ROI: {gap.roiScore.toFixed(1)}x</span>
        </div>
        <p className="text-xs text-[var(--alpha-text-40)] mt-1 leading-snug">{gap.expectedOutcome}</p>
      </div>
    </motion.div>
  );
}

// ─── Competitive edge card ────────────────────────────────────────────────────

function EdgeCard({ edge, index }: { edge: CompetitiveEdge; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-xl p-3 flex items-start gap-2.5"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}
    >
      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400/70" />
      <div>
        <div className="text-xs font-semibold text-emerald-400/80 mb-0.5">{edge.dimension}</div>
        <div className="text-sm text-[var(--alpha-text-70)]">{edge.userStrength}</div>
        <div className="text-xs text-[var(--alpha-text-40)] mt-0.5">vs. {edge.benchmarkMedian}</div>
        <div className="text-xs text-emerald-400/60 mt-1 leading-snug">{edge.advantage}</div>
      </div>
      {edge.percentileAdvantage > 0 && (
        <div
          className="flex-shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-emerald-text)' }}
        >
          +{edge.percentileAdvantage}pts
        </div>
      )}
    </motion.div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const CompetitivePositionPanel: React.FC<CompetitivePositionPanelProps> = ({
  position,
  className = '',
}) => {
  const [showAllGaps, setShowAllGaps] = useState(false);
  const [activeTab, setActiveTab] = useState<'gaps' | 'edges'>('gaps');

  const cat = CATEGORY_CONFIG[position.percentileCategory];
  const displayGaps = showAllGaps ? position.gaps : position.gaps.slice(0, 4);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hero: percentile + headline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4"
        style={{ background: `${cat.color}0A`, border: `1px solid ${cat.color}25` }}
      >
        <div className="flex items-center gap-4">
          <PercentileRing percentile={position.overallPercentile} category={position.percentileCategory} />
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-bold tracking-wider uppercase mb-1"
              style={{ color: cat.color }}
            >
              {cat.label}
            </div>
            <h3 className="text-sm font-semibold text-[var(--alpha-text-85)] leading-snug mb-1.5">
              {position.headline}
            </h3>
            <p className="text-xs text-[var(--alpha-text-55)] leading-relaxed">{position.narrative}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--alpha-text-25)]" />
              <span className="text-xs text-[var(--alpha-text-50)]">
                Target: <span className="font-semibold text-[var(--alpha-text-78)]">{position.targetPercentile}th percentile</span>
                &nbsp;in ~{position.estimatedWeeksToTarget} weeks
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dimension breakdown */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
      >
        <div className="text-xs font-medium text-[var(--alpha-text-40)] uppercase tracking-wide mb-3">
          6 Competitive Dimensions
          <span className="text-[var(--alpha-text-15)] ml-1.5 normal-case">(vertical line = benchmark median)</span>
        </div>
        <div className="space-y-2">
          {position.dimensions.map(dim => (
            <DimensionBar key={dim.key} dim={dim} />
          ))}
        </div>
      </div>

      {/* Benchmark reference */}
      <div
        className="rounded-xl p-3"
        style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}
      >
        <div className="text-[10px] font-medium text-[var(--alpha-text-25)] uppercase tracking-wide mb-1">Benchmark</div>
        <p className="text-xs text-[var(--alpha-text-50)] leading-relaxed">{position.benchmarkSummary}</p>
      </div>

      {/* Tabs: Gap Roadmap / Competitive Edges */}
      <div>
        <div className="flex items-center gap-1 mb-3 p-1 rounded-lg" style={{ background: 'var(--alpha-bg-04)' }}>
          {(['gaps', 'edges'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: activeTab === tab ? 'var(--alpha-bg-08)' : 'transparent',
                color: activeTab === tab ? 'var(--alpha-text-85)' : 'var(--alpha-text-35)',
              }}
            >
              {tab === 'gaps' ? `Gap Roadmap (${position.gaps.length})` : `Competitive Edges (${position.competitiveEdges.length})`}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'gaps' ? (
            <motion.div
              key="gaps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="rounded-2xl px-4 py-2"
                style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
              >
                <div className="text-[10px] text-[var(--alpha-text-25)] mt-2 mb-1">Sorted by ROI (percentile gain ÷ effort)</div>
                {displayGaps.map((gap, i) => (
                  <GapActionCard key={gap.gapKey} gap={gap} index={i} />
                ))}
                {position.gaps.length > 4 && (
                  <button
                    onClick={() => setShowAllGaps(!showAllGaps)}
                    className="flex items-center gap-1 mt-1 mb-2 text-xs text-[var(--alpha-text-35)] hover:text-[var(--alpha-text-60)] transition-colors"
                  >
                    {showAllGaps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAllGaps ? 'Show fewer' : `Show ${position.gaps.length - 4} more gaps`}
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edges"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {position.competitiveEdges.length === 0 ? (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: 'var(--alpha-bg-04)' }}
                >
                  <p className="text-sm text-[var(--alpha-text-40)]">
                    No clear advantages yet — closing the top gaps will create edges.
                  </p>
                </div>
              ) : (
                position.competitiveEdges.map((edge, i) => (
                  <EdgeCard key={edge.dimension} edge={edge} index={i} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unique positioning */}
      {position.uniquePositioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-3.5"
          style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.16)' }}
        >
          <div className="flex items-start gap-2.5">
            <Target className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-400/70" />
            <div>
              <div className="text-xs font-semibold text-violet-400/80 mb-1">Your Unique Positioning</div>
              <p className="text-sm text-[var(--alpha-text-70)] leading-relaxed">{position.uniquePositioning}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Data limitations footer */}
      {position.dataLimitations.length > 0 && (
        <div className="text-[10px] text-[var(--alpha-text-20)] space-y-0.5 pt-1">
          {position.dataLimitations.map((lim, i) => (
            <div key={i} className="flex items-start gap-1">
              <span>·</span>
              <span>{lim}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompetitivePositionPanel;
