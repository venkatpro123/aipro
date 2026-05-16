// PersonalRiskModifierPanel.tsx — v35.0
//
// Shows the signed personal-circumstance modifier that was applied to the
// composite score after all 54 pipeline steps. Surfaces the "why" behind
// the score adjustment so users understand which personal factors moved
// their risk up or down relative to their company peers.
//
// Only rendered when |rawModifier| >= 2 to avoid surfacing noise-level adjustments.

import React from 'react';
import { motion } from 'framer-motion';
import { User, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { PersonalRiskModifier } from '../../../services/personalRiskAdjusterService';
import AdaptiveBlock from './AdaptiveBlock';

interface Props {
  modifier: PersonalRiskModifier;
}

const PersonalRiskModifierPanel: React.FC<Props> = ({ modifier }) => {
  const { rawModifier, transparencyLines } = modifier;
  const absVal = Math.abs(rawModifier);

  // Only display when adjustment is meaningful (|modifier| >= 2)
  if (absVal < 2) return null;

  const isRisk       = rawModifier > 0;
  const accentColor  = isRisk ? '#f97316' : '#10b981';
  const tier         = absVal >= 4 ? 1 : 2;

  const Icon = rawModifier > 0 ? ArrowUp : rawModifier < 0 ? ArrowDown : Minus;
  const dirLabel = rawModifier > 0
    ? `+${rawModifier} pts personal risk`
    : `${rawModifier} pts personal protection`;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <AdaptiveBlock
        title="Personal risk adjustment"
        subtitle="Your individual circumstances move the score beyond the company baseline"
        icon={User}
        tier={tier}
        accentColor={accentColor}
        defaultOpen={absVal >= 3}
      >
        <div className="px-3 pb-3 space-y-2">
          {/* Modifier badge */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: accentColor + '18', border: `1px solid ${accentColor}35` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="text-[13px] font-black" style={{ color: accentColor }}>
                {dirLabel}
              </span>
            </div>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              applied after company + role baseline
            </span>
          </div>

          {/* Transparency lines — one per fired component */}
          {transparencyLines.length > 0 && (
            <div className="space-y-1.5">
              {transparencyLines.map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: accentColor }}
                  />
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Calibration: developer estimate — pending regression on outcome data
          </p>
        </div>
      </AdaptiveBlock>
    </motion.div>
  );
};

export default PersonalRiskModifierPanel;
