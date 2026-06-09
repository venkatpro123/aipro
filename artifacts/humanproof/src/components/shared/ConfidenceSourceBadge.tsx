// ConfidenceSourceBadge — compact trust pill for inline use on score figures.
// Thin wrapper over DataSourceLabel compact mode with a simplified API.
// Use: <ConfidenceSourceBadge source="MODELED" /> next to any score or metric.
import { DataSourceLabel, type DataSourceTier } from './DataSourceLabel';

export type ConfidenceSource = DataSourceTier;

interface Props {
  source: ConfidenceSource;
  /** 'sm' = compact pill (default), 'md' = full label with source name slot */
  size?: 'sm' | 'md';
  sourceName?: string;
}

export function ConfidenceSourceBadge({ source, size = 'sm', sourceName }: Props) {
  return (
    <DataSourceLabel
      tier={source}
      sourceName={sourceName}
      compact={size === 'sm'}
    />
  );
}
