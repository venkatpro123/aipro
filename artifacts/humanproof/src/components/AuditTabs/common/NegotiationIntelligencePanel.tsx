import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, ChevronDown, ChevronUp } from 'lucide-react';
import type { NegotiationIntelligenceResult, NegotiationLeverageRating } from '../../../services/negotiationIntelligenceService';

interface Props {
  negotiation: NegotiationIntelligenceResult;
}

const RATING_CONFIG: Record<NegotiationLeverageRating, {
  bg: string; border: string; badge: string; label: string; barColor: string;
}> = {
  STRONG:   { bg: 'bg-emerald-950/25', border: 'border-emerald-500/40', badge: 'bg-emerald-500/15 text-emerald-300', label: 'Strong Leverage', barColor: '#10b981' },
  MODERATE: { bg: 'bg-blue-950/20',    border: 'border-blue-500/30',    badge: 'bg-blue-500/15 text-blue-300',    label: 'Moderate Leverage', barColor: '#3b82f6' },
  WEAK:     { bg: 'bg-amber-950/15',   border: 'border-amber-500/25',   badge: 'bg-amber-500/15 text-amber-300',  label: 'Weak Leverage',   barColor: '#f59e0b' },
  NONE:     { bg: '', border: '', badge: '', label: '', barColor: '' },
};

export function NegotiationIntelligencePanel({ negotiation }: Props) {
  const [showScripts, setShowScripts] = useState(false);
  const [showRisks, setShowRisks] = useState(false);

  if (!negotiation.shouldDisplay) return null;

  // BUG-FIX: Safe fallback for unexpected leverage rating values
  const cfg = RATING_CONFIG[negotiation.leverageRating] ?? RATING_CONFIG['WEAK'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 mb-4 ${cfg.bg} ${cfg.border}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Scale size={14} className="text-blue-400" />
        <span className="text-sm font-semibold text-white">Negotiation Intelligence</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Leverage bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
          <span>Leverage score</span>
          <span>{negotiation.leverageScore}/100</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${negotiation.leverageScore}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: cfg.barColor }}
          />
        </div>
      </div>

      {/* Tactic + ask */}
      <div className="p-3 rounded-lg bg-white/4 mb-3">
        <div className="text-[11px] font-medium text-gray-400 mb-1">{negotiation.recommendedTactic}</div>
        <div className="text-xs text-gray-200">{negotiation.specificAsk}</div>
      </div>

      {/* BATNA + timing */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-white/3 border border-white/5">
          <div className="text-[10px] text-gray-500 mb-0.5">Outside Option (BATNA)</div>
          <div className="text-[11px] text-gray-300">{negotiation.batnaStrength}</div>
        </div>
        <div className="p-2 rounded-lg bg-white/3 border border-white/5">
          <div className="text-[10px] text-gray-500 mb-0.5">Timing Window</div>
          <div className="text-[11px] text-gray-300 line-clamp-3">{negotiation.timingWindow}</div>
        </div>
      </div>

      {/* Scripts — collapsible */}
      {negotiation.scripts.length > 0 && (
        <div className="border-t border-white/5 pt-3">
          <button
            onClick={() => setShowScripts(!showScripts)}
            className="w-full flex items-center justify-between text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span>Conversation openers ({negotiation.scripts.length})</span>
            {showScripts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showScripts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {negotiation.scripts.map((script, i) => (
                  <div key={i} className="p-2 rounded bg-gray-800/60 text-[11px] text-gray-300 italic">
                    {script}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Risks + red lines — collapsible */}
      {(negotiation.risksToNegotiating.length > 0 || negotiation.redLines.length > 0) && (
        <div className="border-t border-white/5 pt-3 mt-3">
          <button
            onClick={() => setShowRisks(!showRisks)}
            className="w-full flex items-center justify-between text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span>Risks &amp; red lines</span>
            {showRisks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence>
            {showRisks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1"
              >
                {negotiation.risksToNegotiating.map((risk, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-[10px] mt-0.5">⚠</span>
                    <span className="text-[11px] text-gray-300">{risk}</span>
                  </div>
                ))}
                {negotiation.redLines.map((line, i) => (
                  <div key={`rl-${i}`} className="flex items-start gap-1.5">
                    <span className="text-red-400 text-[10px] mt-0.5">✗</span>
                    <span className="text-[11px] text-gray-300">{line}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
