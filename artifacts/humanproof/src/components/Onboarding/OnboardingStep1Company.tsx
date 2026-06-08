// OnboardingStep1Company.tsx — Step 1: Current company + role
import { Building2, Briefcase } from 'lucide-react';

export interface Step1Data {
  companyName: string;
  roleTitle: string;
}

interface Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
}

const ROLE_SUGGESTIONS = [
  'Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer',
  'Marketing Manager', 'Financial Analyst', 'HR Business Partner',
  'Operations Manager', 'Sales Executive', 'DevOps Engineer',
];

export function OnboardingStep1Company({ data, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Where do you work?
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          We'll assess layoff risk, AI exposure, and market demand specific to your company and role.
        </p>
      </div>

      {/* Company name */}
      <div>
        <label style={labelStyle}>
          <Building2 size={13} style={{ display: 'inline', marginRight: 5 }} />
          Company Name
        </label>
        <input
          autoFocus
          value={data.companyName}
          onChange={e => onChange({ ...data, companyName: e.target.value })}
          placeholder="e.g. Google, Infosys, Deloitte…"
          style={inputStyle}
        />
      </div>

      {/* Role title */}
      <div>
        <label style={labelStyle}>
          <Briefcase size={13} style={{ display: 'inline', marginRight: 5 }} />
          Your Role / Job Title
        </label>
        <input
          value={data.roleTitle}
          onChange={e => onChange({ ...data, roleTitle: e.target.value })}
          placeholder="e.g. Senior Software Engineer"
          style={inputStyle}
        />
        {/* Role suggestions */}
        {data.roleTitle.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {ROLE_SUGGESTIONS.map(r => (
              <button
                key={r}
                onClick={() => onChange({ ...data, roleTitle: r })}
                style={suggestionStyle}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview of what we'll analyze */}
      {data.companyName && data.roleTitle && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
          fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
        }}>
          We'll analyze <strong style={{ color: 'var(--text)' }}>{data.roleTitle}</strong> at{' '}
          <strong style={{ color: 'var(--text)' }}>{data.companyName}</strong> — including layoff risk,
          AI displacement exposure, market demand, and compensation benchmarks.
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 15,
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
};

const suggestionStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
  fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
};
