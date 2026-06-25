// WARNAlertBanner.tsx — v17.0
// Full-width sticky banner rendered above the tab navigation when a WARN Act
// filing is active. This is a ground-truth signal (regulatory filing, not prediction)
// and must be visible across all 7 tabs — not buried in CompanyProfileTab.
// Dismissal stored in sessionStorage so it reappears on fresh audits.

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import type { WARNSignal } from '../services/warnActService';

interface Props {
  warnSignal: WARNSignal;
  companyName: string;
}

function getDismissKey(companyName: string): string {
  return `hp_warn_dismissed_${companyName.toLowerCase().replace(/\s+/g, '_')}`;
}

const WARNAlertBanner: React.FC<Props> = ({ warnSignal, companyName }) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const key = getDismissKey(companyName);
      setDismissed(sessionStorage.getItem(key) === '1');
    } catch {
      // sessionStorage unavailable (private mode) — show banner
    }
  }, [companyName]);

  if (!warnSignal.hasActiveWARN || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(getDismissKey(companyName), '1');
    } catch { /* ignore */ }
  };

  const daysLeft = warnSignal.daysUntilLayoff;
  const affected = warnSignal.totalAffectedCount;
  const locations = warnSignal.affectedLocations;

  const urgencyColor = daysLeft !== null && daysLeft <= 30 ? '#ef4444' : '#f97316';
  const urgencyBg    = daysLeft !== null && daysLeft <= 30
    ? 'rgba(239,68,68,0.12)'
    : 'rgba(249,115,22,0.10)';
  const urgencyBorder = daysLeft !== null && daysLeft <= 30
    ? 'rgba(239,68,68,0.45)'
    : 'rgba(249,115,22,0.38)';

  return (
    <div
      className="sticky top-0 z-50 w-full mb-4"
      style={{
        background: urgencyBg,
        borderBottom: `1px solid ${urgencyBorder}`,
        borderTop: `3px solid ${urgencyColor}`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="w-full max-w-7xl mx-auto flex items-start gap-3 px-4 py-3"
        style={{ maxWidth: '80rem' }}
      >
        {/* Pulsing icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle
            className="w-5 h-5 animate-pulse"
            style={{ color: urgencyColor }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className="text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: `${urgencyColor}20`,
                color: urgencyColor,
                border: `1px solid ${urgencyColor}40`,
              }}
            >
              WARN ACT FILED — GROUND TRUTH SIGNAL
            </span>
            {daysLeft !== null && daysLeft >= 0 && (
              <span
                className="text-xs font-bold"
                style={{ color: urgencyColor }}
              >
                {daysLeft === 0
                  ? 'Layoff effective TODAY'
                  : daysLeft === 1
                  ? '1 day until layoffs become effective'
                  : `${daysLeft} days until layoffs become effective`}
              </span>
            )}
            {daysLeft !== null && daysLeft < 0 && (
              <span className="text-xs font-bold" style={{ color: urgencyColor }}>
                Layoff date passed — verify current status
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--alpha-text-70)' }}>
            <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{companyName}</strong> has filed a
            WARN Act notice with state regulatory authorities.{' '}
            {affected > 0
              ? `${affected.toLocaleString()} workers are affected per the regulatory filing. `
              : ''}
            {locations.length > 0
              ? `Locations: ${locations.slice(0, 3).join(', ')}${locations.length > 3 ? ` +${locations.length - 3} more` : ''}.`
              : ''}
            {' '}This is a legally required notice, not a prediction — layoffs are confirmed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="https://www.dol.gov/agencies/eta/layoffs/warn"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition-colors"
            style={{
              color: urgencyColor,
              border: `1px solid ${urgencyColor}30`,
              background: `${urgencyColor}08`,
            }}
          >
            DOL.GOV <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss WARN Act alert"
            className="p-1.5 rounded transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WARNAlertBanner;
