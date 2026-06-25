/**
 * SkillFusionPanel.tsx — v45.0
 *
 * Displays skill combination analysis from skillFusionEngine.ts.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, TrendingUp, Clock, DollarSign, BookOpen,
  ChevronDown, ChevronUp, Zap, AlertTriangle, Flame
} from "lucide-react";
import type { SkillFusionResult, SkillCombo, SkillGapPath } from "@/services/skillFusionEngine";

interface SkillFusionPanelProps {
  fusion: SkillFusionResult;
  className?: string;
}

function ScarcityBadge({ level }: { level: SkillCombo['candidateScarcity'] }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    extreme:     { label: 'Extreme Scarcity', color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  },
    high:        { label: 'High Demand',      color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    moderate:    { label: 'Moderate',         color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
    competitive: { label: 'Competitive',      color: 'var(--alpha-text-35)', bg: 'var(--alpha-bg-06)' },
  };
  const c = config[level] ?? config.competitive;
  return (
    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-full uppercase"
      style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

function TrendBadge({ trend }: { trend: SkillCombo['demandTrend'] }) {
  const config: Record<string, { label: string; color: string }> = {
    exploding:  { label: '↑↑ Exploding', color: '#10b981' },
    growing:    { label: '↑ Growing',    color: '#3b82f6' },
    stable:     { label: '→ Stable',     color: '#60a5fa' },
    saturating: { label: '↓ Saturating', color: '#f59e0b' },
  };
  const c = config[trend] ?? config.stable;
  return <span className="text-[10px] font-medium" style={{ color: c.color }}>{c.label}</span>;
}

function GapPathRow({ path, index }: { path: SkillGapPath; index: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }}
      className="rounded-lg p-2.5"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-blue-400/50" />
          <span className="text-xs font-medium text-white/75">{path.skill}</span>
        </div>
        <div className="flex items-center gap-2">
          {path.costUSD != null && (
            <div className="flex items-center gap-0.5">
              <DollarSign className="w-2.5 h-2.5 text-white/25" />
              <span className="text-[10px] text-white/40">{path.costUSD === 0 ? 'Free' : `$${path.costUSD}`}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5 text-white/25" />
            <span className="text-[10px] text-white/40">{path.estimatedWeeks}w</span>
          </div>
        </div>
      </div>
      {path.specificResource && (
        <div className="text-[11px] text-white/55">
          <span className="text-white/35">Top resource: </span>{path.specificResource}
        </div>
      )}
      {path.alternativeFree && (
        <div className="text-[10px] text-emerald-400/50 mt-0.5">Free alt: {path.alternativeFree}</div>
      )}
    </motion.div>
  );
}

function ComboCard({ combo, index, isHighlighted, highlightLabel }: {
  combo: SkillCombo;
  index: number;
  isHighlighted?: boolean;
  highlightLabel?: string;
}) {
  const [showPaths, setShowPaths] = useState(false);
  const premiumPct = Math.round(combo.salaryPremiumPct);
  const premiumColor = premiumPct >= 45 ? '#10b981' : premiumPct >= 25 ? '#3b82f6' : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-xl overflow-hidden`}
      style={{
        background: isHighlighted ? `${premiumColor}09` : 'rgba(255,255,255,0.035)',
        border: isHighlighted ? `1px solid ${premiumColor}30` : '1px solid var(--alpha-bg-08)',
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            {isHighlighted && highlightLabel && (
              <div className="text-[10px] font-bold tracking-widest mb-1 uppercase" style={{ color: premiumColor }}>
                {highlightLabel}
              </div>
            )}
            <div className="text-sm font-semibold text-white/90 leading-snug">{combo.label}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {combo.skills.map(skill => (
                <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ background: `${premiumColor}12`, color: `${premiumColor}CC` }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 text-center px-2 py-1.5 rounded-lg" style={{ background: `${premiumColor}15` }}>
            <div className="text-base font-bold" style={{ color: premiumColor }}>+{premiumPct}%</div>
            <div className="text-[10px] text-white/35 whitespace-nowrap">premium</div>
          </div>
        </div>

        <p className="text-xs text-white/60 leading-relaxed mb-2.5">{combo.description}</p>
        {combo.marketContext && (
          <p className="text-xs text-white/45 leading-relaxed mb-2.5 italic">{combo.marketContext}</p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <ScarcityBadge level={combo.candidateScarcity} />
          <TrendBadge trend={combo.demandTrend} />
        </div>

        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-white/25" />
            <span className="text-[11px] text-white/45">{combo.gapClosureWeeks}w to close gap</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-white/25" />
            <span className="text-[11px] text-white/45">Match: {combo.matchPercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-white/25" />
            <span className="text-[11px] text-white/45">ROI: {combo.roiScore}</span>
          </div>
        </div>

        {combo.gapClosurePath && combo.gapClosurePath.length > 0 && (
          <>
            <button onClick={() => setShowPaths(!showPaths)}
              className="flex items-center gap-1 mt-2.5 text-xs text-white/35 hover:text-white/60 transition-colors">
              {showPaths ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showPaths ? 'Hide gap paths' : `How to build this combo (${combo.gapClosurePath.length} resources)`}
            </button>

            <AnimatePresence>
              {showPaths && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-3 space-y-2">
                    {combo.gapClosurePath.map((path, i) => (
                      <GapPathRow key={path.skill} path={path} index={i} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

const SkillFusionPanel: React.FC<SkillFusionPanelProps> = ({ fusion, className = '' }) => {
  const [showSaturation, setShowSaturation] = useState(false);
  const [showEmerging, setShowEmerging] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4"
        style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.18)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/90">Skill Fusion Analysis</div>
            <div className="text-xs text-white/40">Skill combinations that command compound premiums</div>
          </div>
        </div>
        <p className="text-xs text-white/55 leading-relaxed">
          Individual skills are commoditized. The right <span className="text-violet-300/80 font-medium">skill combination</span> signals
          a rare profile that commands 25–55% premium over single-skill candidates.
        </p>
        {fusion.marketInsight && (
          <p className="mt-2 text-xs text-white/40 italic leading-relaxed">{fusion.marketInsight}</p>
        )}
      </motion.div>

      {/* Quick win */}
      <div className="rounded-xl p-3 flex items-start gap-2.5"
        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
        <div>
          <div className="text-xs font-semibold text-emerald-400/90 mb-0.5">Quickest win</div>
          <div className="text-sm font-medium text-white/85">{fusion.quickestWin.label}</div>
          <div className="text-xs text-white/50 mt-0.5">
            +{Math.round(fusion.quickestWin.salaryPremiumPct)}% premium · {fusion.quickestWin.gapClosureWeeks} weeks to achieve
          </div>
        </div>
      </div>

      {/* Highest ROI */}
      {fusion.highestROI.label !== fusion.quickestWin.label && (
        <div className="rounded-xl p-3 flex items-start gap-2.5"
          style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
          <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
          <div>
            <div className="text-xs font-semibold text-blue-400/90 mb-0.5">Highest ROI combo</div>
            <div className="text-sm font-medium text-white/85">{fusion.highestROI.label}</div>
            <div className="text-xs text-white/50 mt-0.5">
              +{Math.round(fusion.highestROI.salaryPremiumPct)}% premium · ROI score: {fusion.highestROI.roiScore}
            </div>
          </div>
        </div>
      )}

      {/* Top combos */}
      <div className="space-y-2.5">
        <div className="text-xs font-medium text-white/40 uppercase tracking-wide">Top Skill Combinations</div>
        {fusion.topCombos.map((combo, i) => (
          <ComboCard key={combo.id} combo={combo} index={i}
            isHighlighted={i === 0} highlightLabel={i === 0 ? '★ Recommended first' : undefined} />
        ))}
      </div>

      {/* Emerging combos (string list) */}
      {fusion.emergingCombos && fusion.emergingCombos.length > 0 && (
        <div>
          <button onClick={() => setShowEmerging(!showEmerging)}
            className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-left"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400/70" />
              <span className="text-sm font-medium text-white/70">
                {fusion.emergingCombos.length} emerging combos to watch
              </span>
            </div>
            {showEmerging ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
          </button>
          <AnimatePresence>
            {showEmerging && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pt-2 pb-3 space-y-1.5">
                  {fusion.emergingCombos.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Flame className="w-3 h-3 text-amber-400/50 flex-shrink-0" />
                      <span className="text-xs text-white/60">{name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Saturation warnings (string list) */}
      {fusion.skillSaturationWarnings && fusion.skillSaturationWarnings.length > 0 && (
        <div>
          <button onClick={() => setShowSaturation(!showSaturation)}
            className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-left"
            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.13)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400/60" />
              <span className="text-sm font-medium text-white/60">
                {fusion.skillSaturationWarnings.length} skills with oversupply warning
              </span>
            </div>
            {showSaturation ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
          </button>
          <AnimatePresence>
            {showSaturation && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pt-2 pb-3 space-y-1.5">
                  <p className="text-xs text-white/40 leading-relaxed mb-2">
                    These skills have more candidates than open roles. Pair them with a scarce skill to stand out.
                  </p>
                  {fusion.skillSaturationWarnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400/50" />
                      <span className="text-xs text-white/55">{warning}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SkillFusionPanel;
