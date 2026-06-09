// DataSourceLabel — trust chip for every intelligence data point (Rule 17)
// Shows SOURCE / CONFIDENCE / DATE so users can evaluate the evidence.
// Renders nothing when source is unknown and compact=true (fail silent in dense UIs).

export type DataSourceTier = 'MEASURED' | 'MODELED' | 'ESTIMATED';

export interface DataSourceMeta {
  /** Evidence quality tier */
  tier: DataSourceTier;
  /** Where the data came from (e.g. "SEC 8-K", "Glassdoor", "BLS", "Heuristic model") */
  sourceName?: string;
  /** ISO date string of when this data was collected/computed */
  date?: string | null;
  /** Sample size backing the estimate (shown when N ≥ 5) */
  sampleSize?: number | null;
}

interface Props extends DataSourceMeta {
  compact?: boolean;
}

const TIER_STYLE: Record<DataSourceTier, { color: string; bg: string; border: string }> = {
  MEASURED:  { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)'  },
  MODELED:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)'  },
  ESTIMATED: { color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DataSourceLabel({ tier, sourceName, date, sampleSize, compact }: Props) {
  const style = TIER_STYLE[tier];

  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '1px 6px', borderRadius: 4,
        background: style.bg, border: `1px solid ${style.border}`,
        fontSize: '0.62rem', fontWeight: 700, color: style.color,
        fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        {tier}
        {sourceName && <span style={{ fontWeight: 400, opacity: 0.7 }}>· {sourceName}</span>}
        {date && <span style={{ fontWeight: 400, opacity: 0.6 }}>· {formatDate(date)}</span>}
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 5,
        background: style.bg, border: `1px solid ${style.border}`,
        fontSize: '0.65rem', fontWeight: 700, color: style.color,
        fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.06em',
      }}>
        {tier}
      </span>
      {sourceName && (
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>
          {sourceName}
        </span>
      )}
      {date && (
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, monospace)' }}>
          {formatDate(date)}
        </span>
      )}
      {sampleSize != null && sampleSize >= 5 && (
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, monospace)' }}>
          N={sampleSize}
        </span>
      )}
    </div>
  );
}

/** Derive the tier from a confidence percent (0–100). */
export function tierFromConfidence(confidencePercent: number | null | undefined): DataSourceTier {
  if (confidencePercent == null) return 'ESTIMATED';
  if (confidencePercent >= 70) return 'MEASURED';
  if (confidencePercent >= 45) return 'MODELED';
  return 'ESTIMATED';
}
