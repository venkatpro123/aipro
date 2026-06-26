import React from 'react';
import { GATES, GatedFeature } from '../services/subscriptionService';

interface Props {
  feature: GatedFeature;
  urgency?: string;
  teaser?: React.ReactNode;
  variant?: 'overlay' | 'inline';
  onUpgrade?: () => void;
}

export const GateCard: React.FC<Props> = ({
  feature, urgency, teaser, variant = 'inline', onUpgrade,
}) => {
  const gate = GATES[feature];
  if (!gate) return null;

  const handleUpgrade = () => {
    if (onUpgrade) { onUpgrade(); return; }
    try {
      window.location.href = `/pricing?gate=${feature}`;
    } catch {}
  };

  if (variant === 'overlay') {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px' }}>
        {teaser && (
          <div style={{
            filter: 'blur(8px)', opacity: 0.55, pointerEvents: 'none',
            userSelect: 'none', padding: '16px',
          }}>
            {teaser}
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(8,10,20,0.55) 0%, rgba(8,10,20,0.92) 100%)',
          backdropFilter: 'blur(2px)', padding: '24px', textAlign: 'center',
        }}>
          <GateContent gate={gate} urgency={urgency} onClick={handleUpgrade} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: '16px 0', padding: '24px',
      background: 'linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(168,85,247,0.08) 100%)',
      border: '1px solid rgba(0,245,255,0.25)',
      borderRadius: '14px', textAlign: 'center',
    }}>
      {teaser && (
        <div style={{
          marginBottom: '16px', filter: 'blur(6px)', opacity: 0.5,
          pointerEvents: 'none', userSelect: 'none',
        }}>
          {teaser}
        </div>
      )}
      <GateContent gate={gate} urgency={urgency} onClick={handleUpgrade} />
    </div>
  );
};

const GateContent: React.FC<{
  gate: (typeof GATES)[GatedFeature];
  urgency?: string;
  onClick: () => void;
}> = ({ gate, urgency, onClick }) => (
  <>
    {urgency && (
      <div style={{
        display: 'inline-block', padding: '4px 12px', marginBottom: '12px',
        background: 'rgba(239,68,68,0.2)', color: '#ef4444',
        borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700,
        border: '1px solid rgba(239,68,68,0.4)',
      }}>
        ⚠ {urgency}
      </div>
    )}
    <h3 style={{ color: 'var(--text)', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>
      🔒 {gate.gateTitle}
    </h3>
    <p style={{ color: '#9ba5b4', fontSize: '0.95rem', margin: '0 0 20px', maxWidth: '440px' }}>
      {gate.gateSubtitle}
    </p>
    <button
      onClick={onClick}
      style={{
        padding: '14px 32px', fontSize: '1rem', fontWeight: 600,
        color: '#0A0A14',
        background: 'linear-gradient(90deg, #00F5FF 0%, #A855F7 100%)',
        border: 'none', borderRadius: '10px', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,245,255,0.3)',
      }}
    >
      Unlock — {gate.priceLabel}
    </button>
  </>
);
