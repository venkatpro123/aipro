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
import { User, ArrowUp, ArrowDown, Minus, CheckCircle2, Clock } from 'lucide-react';
import type { PersonalRiskModifier } from '../../../services/personalRiskAdjusterService';
import AdaptiveBlock from './AdaptiveBlock';

interface Props {
  modifier: PersonalRiskModifier;
}

// ── Visa Urgency Chip ─────────────────────────────────────────────────────────
// Spec-exact: "Your [STATUS] status increases effective urgency by [X]%.
//              Timeline reflects your grace period constraint."
// Rendered as a dedicated chip ABOVE the score-adjustment lines because it
// affects ACTION DEADLINES (not the score) — a conceptually different concern.
// Showing it inside the transparency list would bury it alongside score-pt items.

const VisaUrgencyChip: React.FC<{
  amplifier: number;
  statusLabel: string;
  gracePeriodDays?: number;
}> = ({ amplifier, statusLabel, gracePeriodDays }) => {
  const pct = Math.round((amplifier - 1.0) * 100);

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
      style={{
        background: 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.30)',
      }}
      aria-label={`Visa urgency: ${statusLabel} status increases effective urgency by ${pct}%`}
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-orange500-text)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold leading-tight mb-0.5" style={{ color: 'var(--color-orange500-text)' }}>
          Your {statusLabel} status increases effective urgency by {pct}%.
        </p>
        <p className="text-[10px] leading-snug" style={{ color: 'var(--alpha-text-55)' }}>
          {gracePeriodDays != null && gracePeriodDays > 0
            ? `Timeline reflects your ${gracePeriodDays}-day grace period constraint. Action deadlines are compressed proportionally.`
            : 'Status ends immediately on termination — no grace period. Action deadlines are compressed proportionally.'}
        </p>
      </div>
      <div
        className="flex-shrink-0 text-right"
        aria-label={`${pct}% urgency increase`}
      >
        <span className="text-[13px] font-black" style={{ color: 'var(--color-orange500-text)' }}>
          +{pct}%
        </span>
        <p className="text-[10px] font-mono" style={{ color: 'var(--alpha-text-30)' }}>
          urgency
        </p>
      </div>
    </div>
  );
};

const PersonalRiskModifierPanel: React.FC<Props> = ({ modifier }) => {
  const { rawModifier, transparencyLines, components, visaUrgencyAmplifier, visaStatusLabel, visaGracePeriodDays } = modifier;
  const absVal = Math.abs(rawModifier);

  // If visa urgency is active but score modifier is negligible, we still
  // need to show the visa chip — it affects deadlines, not the score.
  // Fall through to the full panel render even when absVal < 0.5 if visa chip fires.
  const showVisaChip = visaUrgencyAmplifier != null && visaUrgencyAmplifier > 1.0 && !!visaStatusLabel;

  // v39.0 A5: honest empty state when no meaningful adjustment fired.
  // Show the components that WERE considered so the user can trust that the
  // engine actually evaluated them rather than silently skipped them.
  if (absVal < 0.5 && !showVisaChip) {
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
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--color-slate400-text)' }} />
              <span className="text-[12px]" style={{ color: 'var(--alpha-text-70)' }}>
                No personal adjustment applied (|delta| &lt; 0.5 pt)
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-45)' }}>
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
          {/* Visa urgency chip — shown FIRST because it affects action deadlines,
              not the score. A dedicated chip surfaces this independently of the
              score-adjustment lines below. */}
          {visaUrgencyAmplifier != null && visaUrgencyAmplifier > 1.0 && visaStatusLabel && (
            <VisaUrgencyChip
              amplifier={visaUrgencyAmplifier}
              statusLabel={visaStatusLabel}
              gracePeriodDays={visaGracePeriodDays}
            />
          )}

          {/* Score modifier badge */}
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
            <span className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
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
                  style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}
                >
                  <div
                    className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: accentColor }}
                  />
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-70)' }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
            Calibration: developer estimate — pending regression on outcome data
          </p>
        </div>
      </AdaptiveBlock>
    </motion.div>
  );
};

export default PersonalRiskModifierPanel;
