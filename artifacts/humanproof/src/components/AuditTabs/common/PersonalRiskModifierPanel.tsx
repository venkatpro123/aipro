// PersonalRiskModifierPanel.tsx — v35.0 → v39.0 A5
//
// Shows the signed personal-circumstance modifier that was applied to the
// composite score after all 54 pipeline steps. Surfaces the "why" behind
// the score adjustment so users understand which personal factors moved
// their risk up or down relative to their company peers.
//
// v39.0 A5: lowered display threshold from |rawModifier| >= 2 to >= 0.5.
// Below 0.5 we now render an explicit "No personal adjustment applied"
// empty state listing the components that were evaluated. This restores
// the v35.0 transparency contract — previously, sub-2pt adjustments
// disappeared without explanation and broke user trust.

import React from 'react';
import { motion } from 'framer-motion';
import { User, ArrowUp, ArrowDown, Minus, CheckCircle2 } from 'lucide-react';
import type { PersonalRiskModifier } from '../../../services/personalRiskAdjusterService';
import AdaptiveBlock from './AdaptiveBlock';

interface Props {
  modifier: PersonalRiskModifier;
}

const PersonalRiskModifierPanel: React.FC<Props> = ({ modifier }) => {
  const { rawModifier, transparencyLines, components } = modifier;
  const absVal = Math.abs(rawModifier);

  // v39.0 A5: honest empty state when no meaningful adjustment fired.
  // Show the components that WERE considered so the user can trust that the
  // engine actually evaluated them rather than silently skipped them.
  if (absVal < 0.5) {
    const consideredComponents: string[] = [];
    if (components?.visaComponent !== undefined) consideredComponents.push('visa');
    if (components?.managerComponent !== undefined) consideredComponents.push('manager risk');
    if (components?.skillComponent !== undefined) consideredComponents.push('skill fit');
    if (components?.networkComponent !== undefined) consideredComponents.push('network leverage');
    if (components?.velocityComponent !== undefined) consideredComponents.push('career velocity');

    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <AdaptiveBlock
          title="Personal risk adjustment"
          subtitle="Your individual circumstances did not move the score"
          icon={User}
          tier={3}
          accentColor="#94a3b8"
          defaultOpen={false}
        >
          <div className="px-3 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.70)' }}>
                No personal adjustment applied (|delta| &lt; 0.5 pt)
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              We considered: {consideredComponents.length > 0 ? consideredComponents.join(', ') : 'visa, manager risk, skill fit, network, career velocity'}.
              Your profile signals were close enough to the cohort baseline that they did not measurably shift the score.
            </p>
          </div>
        </AdaptiveBlock>
      </motion.div>
    );
  }

  const isRisk       = rawModifier > 0;
  const accentColor  = isRisk ? '#f97316' : '#10b981';
  // v39.0 A5: tier scale honours the lowered threshold — anything >= 2 is
  // primary; 0.5–2 is secondary (was previously invisible).
  const tier         = absVal >= 4 ? 1 : absVal >= 2 ? 2 : 3;

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
