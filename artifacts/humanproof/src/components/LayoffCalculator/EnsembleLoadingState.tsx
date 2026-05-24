// EnsembleLoadingState.tsx
// Premium multi-step loading UI shown during the 3-8 second ensemble analysis.

import React, { useEffect, useState } from 'react';

interface Props {
  stage: number; // 0 = starting, 1 = agents running, 2 = gemini synthesizing, 3 = done
}

interface Step {
  key: string;
  label: string;
  detail: string;
  activeFrom: number; // stage when this step becomes "active"
  doneFrom:   number; // stage when this step shows ✓
}

const STEPS: Step[] = [
  { key: 'swarm',    label: 'Swarm Intelligence Layer firing',           detail: '30 agents · Yahoo Finance · RSS feeds · FRED live signals', activeFrom: 0, doneFrom: 1 },
  { key: 'engine',   label: 'Running 5-layer deterministic analysis',    detail: 'Company health · role exposure · market signals',           activeFrom: 0, doneFrom: 1 },
  { key: 'gemma',    label: 'DeepSeek scanning company signals',         detail: 'OSINT · financial stress · AI adoption threat',             activeFrom: 1, doneFrom: 2 },
  { key: 'deepseek', label: 'DeepSeek analyzing financial patterns',     detail: 'Revenue risk · sector contagion · market cycle',            activeFrom: 1, doneFrom: 2 },
  { key: 'llama',    label: 'AI validating role & department risk',      detail: 'Automation exposure · tenure analysis · dept cuts',         activeFrom: 1, doneFrom: 2 },
  { key: 'gemini',   label: 'Gemini synthesizing all results',           detail: 'Outlier detection · consensus scoring · confidence',        activeFrom: 2, doneFrom: 3 },
];

const MODEL_COLORS: Record<string, string> = {
  swarm:    '#10b981',
  engine:   '#00F5FF',
  gemma:    '#a78bfa',
  deepseek: '#34d399',
  llama:    '#f97316',
  gemini:   '#60a5fa',
};

export const EnsembleLoadingState: React.FC<Props> = ({ stage }) => {
  const [dots, setDots] = useState('');

  // Animated dots for active steps
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(iv);
  }, []);

  const modelsCount = STEPS.filter(s => stage >= s.doneFrom).length;

  return (
    <div style={{
      maxWidth: '500px',
      margin: '60px auto',
      padding: '40px 32px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      animation: 'fadeIn 0.4s ease-in',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(0,245,255,0.08)',
          border: '1px solid rgba(0,245,255,0.2)',
          borderRadius: '24px',
          padding: '8px 20px',
          marginBottom: '20px',
        }}>
          <span style={{ width: '8px', height: '8px', background: '#00F5FF', borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite' }} />
          <span style={{ color: '#00F5FF', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            4-AI ENSEMBLE ACTIVE
          </span>
        </div>
        <h2 style={{ color: '#fff', margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700 }}>
          Analysing your risk profile
        </h2>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>
          {modelsCount === STEPS.length
            ? 'All models complete — finalising score'
            : `${modelsCount} of ${STEPS.length} checks complete${dots}`}
        </p>
      </div>

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {STEPS.map(step => {
          const isDone   = stage >= step.doneFrom;
          const isActive = stage >= step.activeFrom && !isDone;
          const isPending = stage < step.activeFrom;
          const color = MODEL_COLORS[step.key];

          return (
            <div key={step.key} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: isActive ? `${color}10` : isDone ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: `1px solid ${isActive ? `${color}30` : isDone ? 'rgba(255,255,255,0.05)' : 'transparent'}`,
              transition: 'all 0.3s ease',
              opacity: isPending ? 0.35 : 1,
            }}>
              {/* Status dot */}
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDone ? color : isActive ? `${color}20` : 'rgba(255,255,255,0.05)',
                border: isActive ? `2px solid ${color}` : `2px solid ${isDone ? color : 'rgba(255,255,255,0.1)'}`,
                animation: isActive ? 'pulse 1.2s ease-in-out infinite' : 'none',
              }}>
                {isDone && <span style={{ color: '#000', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                {isActive && <span style={{ width: '8px', height: '8px', background: color, borderRadius: '50%' }} />}
              </div>

              {/* Label + detail */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: isDone ? '#9ba5b4' : isActive ? '#fff' : '#4b5563',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: '2px',
                }}>
                  {step.label}
                  {isActive && <span style={{ color: color }}>{dots}</span>}
                </div>
                <div style={{ color: '#4b5563', fontSize: '0.78rem' }}>{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Analysis progress</span>
          <span style={{ color: '#9ba5b4', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {Math.round((modelsCount / STEPS.length) * 100)}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(modelsCount / STEPS.length) * 100}%`,
            background: 'linear-gradient(90deg, #00F5FF, #7C3AFF)',
            borderRadius: '2px',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <p style={{ color: '#374151', fontSize: '0.72rem', marginTop: '16px', textAlign: 'center' }}>
          Average analysis time: 4–8 seconds · Results cached for 24 hours
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
