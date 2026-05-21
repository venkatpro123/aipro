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

const KillSwitchFloorBadge: React.FC<Props> = ({
  activatedKillSwitches,
  killSwitchFloors,
  formulaScore,
  className = '',
}) => {
  if (!activatedKillSwitches?.length) return null;

  const floorValues = Object.values(killSwitchFloors ?? {});
  if (!floorValues.length) return null;

  const floorValue = Math.max(...floorValues);
  const reason = activatedKillSwitches.join(', ');

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${className}`}
      style={{
        background: 'rgba(249,115,22,0.15)',
        border: '1px solid rgba(249,115,22,0.40)',
      }}
      title={`A kill-switch raised this score to the floor value (${floorValue}) because: ${reason}`}
    >
      <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: '#f97316' }} />
      <span
        className="text-[10px] font-mono font-semibold whitespace-nowrap"
        style={{ color: '#f97316' }}
      >
        Floor: {floorValue} → Formula: {formulaScore}
      </span>
    </div>
  );
};

export default KillSwitchFloorBadge;
