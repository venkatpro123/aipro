import React from 'react';
import { Database, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { LiveSignalStatus } from '../services/liveSignalBanner';

interface Props {
  status: LiveSignalStatus;
}

const COLOR_MAP: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  green: { dot: '#10b981', text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' },
  amber: { dot: '#f59e0b', text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' },
  red:   { dot: '#ef4444', text: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.18)'  },
  gray:  { dot: 'var(--alpha-text-25)', text: 'var(--alpha-text-35)', bg: 'var(--alpha-bg-04)', border: 'var(--alpha-bg-08)' },
};

export const LiveSignalStatusBar: React.FC<Props> = ({ status }) => {
  // Only show when data quality is limited — no value in showing "Live data active"
  if (status.overallStatus === 'live') return null;

  const c = COLOR_MAP[status.statusColor] ?? COLOR_MAP.gray;

  const StatusIcon =
    status.overallStatus === 'unknown-company' ? ShieldAlert :
    status.statusColor === 'red'               ? Database : AlertTriangle;

  const shortLabel =
    status.overallStatus === 'partial'         ? 'Using partial data — some signals may be estimated' :
    status.overallStatus === 'heuristic'       ? 'Analysis based on industry estimates for this company' :
    status.overallStatus === 'unknown-company' ? 'Company not in our database — using role & industry averages' :
    'Analysis based on available signals';

  return (
    <div
      className="w-full"
      style={{ borderBottom: `1px solid ${c.border}`, background: c.bg }}
    >
      <div className="w-full flex items-center gap-2.5 px-4 py-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: c.dot }}
        />
        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.text }} />
        <span className="text-[11px] font-semibold flex-1 truncate" style={{ color: c.text }}>
          {shortLabel}
        </span>
      </div>
    </div>
  );
};
