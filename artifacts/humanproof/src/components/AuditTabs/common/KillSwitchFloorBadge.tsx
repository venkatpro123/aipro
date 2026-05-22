// KillSwitchFloorBadge.tsx
// Inline badge shown on the score ring when a kill-switch floor overrides the
// formula score. Discloses "Floor: 78 → Formula: 54" so users understand why
// the displayed score differs from the raw model output.

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  activatedKillSwitches: string[];
  killSwitchFloors: Record<string, number>;
  /** Pre-floor formula score. Pass (result as any)._formulaScorePreFloor ?? result.total */
  formulaScore: number;
  className?: string;
}

const KS_LABELS: Record<string, string> = {
  confirmed_recent_layoff_news:      'Confirmed layoff news',
  financial_distress_triad:          'Financial distress triad',
  pre_layoff_precursor:              'Pre-layoff precursor',
  pre_layoff_precursor_inferred:     'Pre-layoff (inferred)',
  warn_act_filing:                   'WARN Act filing',
  stealth_layoff_floor:              'Stealth layoff detected',
};

const KillSwitchFloorBadge: React.FC<Props> = ({
  activatedKillSwitches,
  killSwitchFloors,
  formulaScore,
  className = '',
}) => {
  if (!activatedKillSwitches?.length) return null;

  const floors = killSwitchFloors ?? {};
  const floorValues = Object.values(floors);
  if (!floorValues.length) return null;

  // Winning floor = highest value (hard floors — no sigmoid ambiguity).
  const winningFloor = Math.max(...floorValues);

  // Build tooltip: every fired switch listed with its floor value.
  const details = activatedKillSwitches
    .map(ks => `${KS_LABELS[ks] ?? ks}: floor ${floors[ks] ?? '?'}`)
    .join(' · ');

  const extraCount = activatedKillSwitches.length - 1;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${className}`}
      style={{
        background: 'rgba(249,115,22,0.15)',
        border: '1px solid rgba(249,115,22,0.40)',
      }}
      title={`Score floored to ${winningFloor} (formula: ${formulaScore}). Active floors: ${details}`}
    >
      <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: '#f97316' }} />
      <span
        className="text-[10px] font-mono font-semibold whitespace-nowrap"
        style={{ color: '#f97316' }}
      >
        Floor: {winningFloor} → Formula: {formulaScore}
        {extraCount > 0 && (
          <span style={{ opacity: 0.75 }}> +{extraCount} more</span>
        )}
      </span>
    </div>
  );
};

export default KillSwitchFloorBadge;
