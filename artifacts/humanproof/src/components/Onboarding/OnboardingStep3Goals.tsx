// OnboardingStep3Goals.tsx — Step 3: Career goals selection
import { Target } from 'lucide-react';

export interface Step3Data {
  primaryGoal: string;
  urgency: 'immediate' | 'this_year' | 'exploring';
  concerns: string[];
}

interface Props {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
}

const GOALS = [
  { value: 'protect_job',      label: 'Protect my current job',       emoji: '🛡️' },
  { value: 'find_new_role',    label: 'Find a better role',           emoji: '🚀' },
  { value: 'negotiate_raise',  label: 'Negotiate a raise',            emoji: '💰' },
  { value: 'career_pivot',     label: 'Switch careers or industries', emoji: '🔄' },
  { value: 'future_proof',     label: 'Future-proof against AI',      emoji: '🤖' },
  { value: 'financial_safety', label: 'Build financial safety net',   emoji: '💼' },
];

const URGENCY_OPTIONS = [
  { value: 'immediate' as const, label: 'Urgent — acting now',       color: '#ef4444' },
  { value: 'this_year' as const, label: 'Planning for this year',    color: '#f59e0b' },
  { value: 'exploring' as const, label: 'Just exploring options',    color: '#10b981' },
];

const CONCERNS = [
  'Layoff risk',
  'AI replacing my role',
  'Stagnant salary',
  'Toxic environment',
  'Visa dependency',
  'Limited growth path',
  'Industry in decline',
  'Skills becoming obsolete',
];

export function OnboardingStep3Goals({ data, onChange }: Props) {
  const toggleConcern = (c: string) => {
    const next = data.concerns.includes(c)
      ? data.concerns.filter(x => x !== c)
      : [...data.concerns, c];
    onChange({ ...data, concerns: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          What matters most to you?
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          This focuses your action plan on what's actually relevant to your situation.
        </p>
      </div>

      {/* Primary goal */}
      <div>
        <label style={labelStyle}>
          <Target size={12} style={{ display: 'inline', marginRight: 5 }} />
          Primary Goal
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => onChange({ ...data, primaryGoal: g.value })}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${data.primaryGoal === g.value ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'}`,
                background: data.primaryGoal === g.value ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: data.primaryGoal === g.value ? 'var(--cyan)' : 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{g.emoji}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Urgency */}
      <div>
        <label style={labelStyle}>How urgent is this?</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {URGENCY_OPTIONS.map(u => (
            <button
              key={u.value}
              onClick={() => onChange({ ...data, urgency: u.value })}
              style={{
                padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${data.urgency === u.value ? u.color : 'rgba(255,255,255,0.12)'}`,
                background: data.urgency === u.value ? `${u.color}15` : 'rgba(255,255,255,0.03)',
                color: data.urgency === u.value ? u.color : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s',
              }}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Concerns — multi-select */}
      <div>
        <label style={labelStyle}>What are you concerned about? <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 400, textTransform: 'none' }}>(select all that apply)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {CONCERNS.map(c => {
            const active = data.concerns.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleConcern(c)}
                style={{
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${active ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.1)'}`,
                  background: active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.15s',
                }}
              >
                {active ? '✓ ' : ''}{c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
};
