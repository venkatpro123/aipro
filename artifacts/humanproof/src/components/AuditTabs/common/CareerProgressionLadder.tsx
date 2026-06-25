// CareerProgressionLadder.tsx — Visual career escape path ladder
//
// Renders a single EscapePath as a vertical step-by-step ladder:
//   Current Position → Step 1 → Step 2 → Step 3 → Target Profile
// Shows tabs to switch between quickestWin / biggestLeverageMove / path[2].
// Zero inline styles — all via CSS ladder utility classes.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, TrendingDown, Zap, Target, ChevronDown, ChevronUp } from 'lucide-react';
import type { EscapePathReport, EscapePath } from '../../../services/escapePathOptimizer';

interface Props {
  escapePaths: EscapePathReport;
  currentScore: number;
}

const EFFORT_CLASS: Record<string, string> = {
  Low:    'action-badge-effort',
  Medium: 'action-badge-effort',
  High:   'action-badge-deadline',
};

function PathTab({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all ${
        active
          ? 'bg-[rgba(0,212,224,0.15)] text-cyan border border-[rgba(0,212,224,0.30)]'
          : 'text-token-3 border border-transparent hover:text-token-2'
      }`}
    >
      {label}
    </button>
  );
}

function LadderPath({ path, currentScore }: { path: EscapePath; currentScore: number }) {
  const targetScore = Math.max(0, currentScore - path.estimatedScoreDrop);
  const [rationaleOpen, setRationaleOpen] = useState(false);

  return (
    <div>
      {/* Path headline */}
      <div className="glass-card-md px-3 py-2.5 mb-3">
        <p className="text-[11px] font-semibold text-token-2 leading-relaxed">{path.headline}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="action-badge-risk flex items-center gap-1">
            <TrendingDown className="w-2.5 h-2.5" />
            -{path.estimatedScoreDrop}pt risk
          </span>
          <span className={EFFORT_CLASS[path.effort] ?? 'action-badge-effort'}>
            {path.effort} effort
          </span>
          <span className="text-token-3 text-[10px]">{path.timeToImpact}</span>
        </div>
      </div>

      {/* Ladder */}
      <div className="career-ladder pl-2">

        {/* Current position */}
        <div className="ladder-step">
          <div className="ladder-connector" />
          <div className="ladder-node ladder-node--active">
            <span>{currentScore}</span>
          </div>
          <div className="ladder-content">
            <p className="ladder-title">Current position</p>
            <p className="ladder-meta">Risk score {currentScore}/100</p>
            <span className="ladder-badge ladder-badge--active">NOW</span>
          </div>
        </div>

        {/* Steps */}
        {path.steps.map((step, i) => (
          <div key={i} className="ladder-step">
            <div className="ladder-connector" />
            <div className="ladder-node ladder-node--future">
              <span>{i + 1}</span>
            </div>
            <div className="ladder-content">
              <p className="ladder-title">{step.action}</p>
              <p className="ladder-meta">{step.timeframe} · {step.effort} effort</p>
            </div>
          </div>
        ))}

        {/* Target */}
        <div className="ladder-step">
          <div className="ladder-node ladder-node--done">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div className="ladder-content">
            <p className="ladder-title">{path.title}</p>
            {path.targetProfile && (
              <p className="ladder-meta">{path.targetProfile}</p>
            )}
            <span className="ladder-badge ladder-badge--done">
              ~{targetScore} risk score
            </span>
          </div>
        </div>

      </div>

      {/* Rationale toggle */}
      <button
        type="button"
        onClick={() => setRationaleOpen(v => !v)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-token-3 mt-3 hover:text-token-2 transition-colors"
      >
        <Zap className="w-3 h-3" />
        Why this move
        {rationaleOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {rationaleOpen && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden text-[11px] leading-relaxed text-token-2 mt-1.5"
          >
            {path.rationale}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const CareerProgressionLadder: React.FC<Props> = ({ escapePaths, currentScore }) => {
  const tabs = [
    { label: 'Quickest win', path: escapePaths.quickestWin },
    { label: 'Biggest leverage', path: escapePaths.biggestLeverageMove },
    ...(escapePaths.paths[2] ? [{ label: 'Path 3', path: escapePaths.paths[2] }] : []),
  ].filter((t, i, arr) => arr.findIndex(x => x.path.id === t.path.id) === i);

  const [activeTab, setActiveTab] = useState(0);
  const selectedPath = tabs[activeTab]?.path ?? escapePaths.paths[0];

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="mono-section-label">CAREER ESCAPE ROUTES</p>
        <span className="text-[10px] text-token-3 flex items-center gap-1">
          <ArrowRight className="w-3 h-3" />
          up to -{escapePaths.totalPotentialReduction}pt potential
        </span>
      </div>

      {escapePaths.analystNote && (
        <p className="text-[11px] text-token-2 leading-relaxed mb-3">{escapePaths.analystNote}</p>
      )}

      {/* Path selector tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1.5 mb-4">
          {tabs.map((tab, i) => (
            <PathTab
              key={tab.path.id}
              label={tab.label}
              active={activeTab === i}
              onClick={() => setActiveTab(i)}
            />
          ))}
        </div>
      )}

      {/* Selected path ladder */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPath.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
        >
          <LadderPath path={selectedPath} currentScore={currentScore} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CareerProgressionLadder;
