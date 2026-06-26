// SignalFreshnessDot.tsx — v15.0
// Inline dot indicator that renders next to a driver/signal label in the
// Analysis tab's driver list and the Intelligence tab's signal panels.
// Color encodes freshness; tooltip shows the precise age.

import {
  classifySignalFreshnessFromDate,
  type SignalFreshnessClass,
} from '../utils/dataFreshnessChecker';

interface Props {
  lastUpdated?: string | null;
  /** Bypass date parsing when the caller already classified the signal. */
  freshnessClass?: SignalFreshnessClass | null;
  size?: number;
  showLabel?: boolean;
}

const COLOR_BY_CLASS: Record<SignalFreshnessClass, string> = {
  fresh: 'var(--color-emerald-text)', // emerald
  mid:   'var(--color-amber500-text)', // amber
  stale: 'var(--color-red-text)', // red
};

const ageLabel = (lastUpdated?: string | null): string => {
  if (!lastUpdated) return 'Age unknown';
  const t = new Date(lastUpdated).getTime();
  if (isNaN(t)) return 'Age unknown';
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated 1 day ago';
  return `Updated ${days} days ago`;
};

export function SignalFreshnessDot({
  lastUpdated,
  freshnessClass,
  size = 8,
  showLabel = false,
}: Props) {
  const cls = freshnessClass ?? classifySignalFreshnessFromDate(lastUpdated);
  if (!cls) return null;

  const color = COLOR_BY_CLASS[cls];
  const tooltip = `${cls === 'fresh' ? 'Fresh' : cls === 'mid' ? 'Aging' : 'Stale'} — ${ageLabel(lastUpdated)}`;

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
    >
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 4px ${color}80`,
        }}
      />
      {showLabel && (
        <span style={{ fontSize: '0.6875rem', color, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {cls}
        </span>
      )}
    </span>
  );
}
