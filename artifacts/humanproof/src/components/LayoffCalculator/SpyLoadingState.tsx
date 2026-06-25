// SpyLoadingState.tsx — Neural-network intelligence-scan loader.
// Delegates to NeuralAuditLoader. Props preserved for backwards-compatibility.

import React from 'react';
import { NeuralAuditLoader } from './NeuralAuditLoader';
import { mapEnsembleStage } from './AuditLoader';

interface Props {
  stage: number;
  companyName?: string;
  roleTitle?: string;       // accepted but not forwarded
  agentCount?: number;      // accepted but not forwarded
  limitedDataMode?: boolean;
  limitedDataReason?: string;
  /** Wave 9.4: Skip the full globe animation on slow connections / reduced-motion.
   *  Shows a lightweight text-only loading state instead. */
  skipAnimation?: boolean;
}

// Lightweight text-only loader for slow connections / reduced-motion
const SimpleLoader: React.FC<{ companyName?: string; stage: number }> = ({ companyName, stage }) => {
  const STAGE_LABELS = [
    'Initializing analysis…',
    'Collecting live signals…',
    'Processing intelligence…',
    'Finalizing your report…',
  ];
  const label = STAGE_LABELS[Math.min(stage, STAGE_LABELS.length - 1)];
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        background: '#0b1020',
        color: 'var(--alpha-text-85)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '3px solid rgba(0,212,224,0.12)',
          borderTopColor: '#00d4e0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em' }}>
        {companyName ? `Analyzing ${companyName}` : 'Analyzing your risk…'}
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--alpha-text-45)' }}>
        {label}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export const SpyLoadingState: React.FC<Props> = ({
  stage,
  companyName,
  limitedDataMode,
  limitedDataReason,
  skipAnimation = false,
}) => {
  if (skipAnimation) {
    return <SimpleLoader companyName={companyName} stage={stage} />;
  }
  return (
    <NeuralAuditLoader
      stage={mapEnsembleStage(stage)}
      companyName={companyName}
      limitedDataMode={limitedDataMode}
      limitedDataReason={limitedDataReason}
    />
  );
};

export default SpyLoadingState;
