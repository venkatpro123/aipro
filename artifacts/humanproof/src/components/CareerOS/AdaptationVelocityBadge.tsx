// AdaptationVelocityBadge — shows career readiness direction and rate of change
// Readiness = 100 - riskScore, so risk velocity signs are inverted for display.
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HybridResult } from '../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
  compact?: boolean;
}

export function AdaptationVelocityBadge({ scoreResult, compact }: Props) {
  const riskVelocity = scoreResult.scoreTrajectory?.velocityPtsPerMonth ?? null;

  // Positive risk velocity = readiness declining (bad); negative = readiness improving (good)
  const readinessVelocity = riskVelocity != null ? -riskVelocity : null;
  const isImproving = readinessVelocity != null && readinessVelocity > 0.5;
  const isDeclining = readinessVelocity != null && readinessVelocity < -0.5;

  const color = isImproving ? '#10b981' : isDeclining ? '#ef4444' : 'rgba(255,255,255,0.35)';
  const Icon = isImproving ? TrendingUp : isDeclining ? TrendingDown : Minus;
  const label = isImproving
    ? `↑ +${Math.abs(readinessVelocity!).toFixed(1)}/mo`
    : isDeclining
    ? `↓ ${Math.abs(readinessVelocity!).toFixed(1)}/mo`
    : 'Stable';

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        fontSize: '0.7rem', fontWeight: 700, color,
        fontFamily: 'var(--font-mono, monospace)',
      }}>
        <Icon size={10} />
        {label}
      </span>
    );
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 6,
      background: `${color}12`,
      border: `1px solid ${color}30`,
      fontSize: '0.72rem', fontWeight: 700, color,
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <Icon size={11} />
      <span>
        {isImproving ? 'IMPROVING' : isDeclining ? 'DECLINING' : 'STABLE'}
        {readinessVelocity != null && Math.abs(readinessVelocity) > 0.5
          ? ` ${Math.abs(readinessVelocity).toFixed(1)}/mo`
          : ''}
      </span>
    </div>
  );
}
