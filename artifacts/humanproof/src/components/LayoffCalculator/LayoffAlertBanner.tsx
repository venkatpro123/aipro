import React, { useEffect, useState } from 'react';
import { detectScoreDrift, DriftResult } from '../../services/scoreStorageService';
import { useLayoff } from '../../context/LayoffContext';

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const LayoffAlertBanner: React.FC = () => {
  const { state, dispatch } = useLayoff();
  const [drift, setDrift] = useState<DriftResult | null>(null);

  useEffect(() => {
    // BUG-08 FIX applied here: pass current company + role so we only compare
    // scores for the same job, not the last two scores from any company in history.
    // Previously detectScoreDrift() was called without arguments, so a TCS score
    // followed by an Infosys score would incorrectly fire the banner.
    const companyName = state.companyName ?? undefined;
    const roleTitle   = state.roleTitle   ?? undefined;
    const detected = detectScoreDrift(companyName, roleTitle);
    if (detected) {
      setDrift(detected);
    }
    // Re-run when the displayed company/role changes (e.g. after force-refresh)
  }, [state.companyName, state.roleTitle]);

  if (!drift) return null;

  const isWorse = drift.direction === 'increased';
  const bannerColor = isWorse ? 'var(--orange, #ffb347)' : 'var(--emerald, #00FF9F)';
  const bgColor = isWorse ? 'rgba(255,165,0,0.1)' : 'rgba(0,255,159,0.1)';

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${bannerColor}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      maxWidth: '600px',
      margin: '0 auto 32px'
    }}>
      <div style={{ fontSize: '1.5rem', color: bannerColor, marginTop: '-2px' }}>
        {isWorse ? '⚠' : '↓'}
      </div>
      <div>
        <p style={{ margin: '0 0 4px', color: 'var(--text)', fontWeight: 600 }}>
          Your layoff risk {isWorse ? 'increased' : 'decreased'} by {Math.abs(drift.drift)} points since {formatDate(drift.fromDate)}
        </p>
        <p style={{ margin: '0 0 12px', color: 'var(--color-gray300-text)', fontSize: '0.9rem' }}>
          {isWorse
            ? `${drift.from}% → ${drift.to}% — market conditions or company signals have changed. See what's driving this.`
            : `${drift.from}% → ${drift.to}% — conditions improved. Keep building your safety net.`
          }
        </p>
        <button 
          onClick={() => setDrift(null)}
          aria-label="Dismiss alert"
          style={{
            background: 'transparent',
            border: `1px solid ${bannerColor}`,
            color: bannerColor,
            padding: '6px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
