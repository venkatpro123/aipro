// OnboardingStep2Profile.tsx — Step 2: Experience, salary, visa status
import type { SalaryBand, VisaStatus } from '../../services/userProfileService';

export interface Step2Data {
  yearsExperience: number | null;
  salaryBand: SalaryBand | null;
  visaStatus: VisaStatus | null;
}

interface Props {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
}

const SALARY_OPTIONS: { value: SalaryBand; label: string }[] = [
  { value: '<50k',     label: 'Under $50K' },
  { value: '50-100k',  label: '$50K – $100K' },
  { value: '100-150k', label: '$100K – $150K' },
  { value: '150-250k', label: '$150K – $250K' },
  { value: '250k+',    label: '$250K+' },
];

const VISA_OPTIONS: { value: VisaStatus; label: string; note?: string }[] = [
  { value: 'citizen',             label: 'Citizen',              note: 'No visa dependency' },
  { value: 'permanent_resident',  label: 'Permanent Resident',   note: 'Green card / PR' },
  { value: 'h1b',                 label: 'H-1B',                 note: 'US work visa' },
  { value: 'l1',                  label: 'L-1',                  note: 'US intracompany' },
  { value: 'opt_stem',            label: 'OPT / STEM OPT',       note: 'US F-1 extension' },
  { value: 'uk_skilled_worker',   label: 'UK Skilled Worker',    note: 'UK Tier 2' },
  { value: 'eu_blue_card',        label: 'EU Blue Card',         note: 'EU work permit' },
  { value: 'singapore_ep',        label: 'Singapore EP',         note: 'Employment Pass' },
  { value: 'australia_482_tss',   label: 'Australia 482 TSS',    note: 'Skilled worker' },
  { value: 'canada_lmia_permit',  label: 'Canada LMIA',          note: 'Work permit' },
  { value: 'uae_employment_visa', label: 'UAE Employment Visa',  note: 'GCC work visa' },
  { value: 'japan_work_visa',     label: 'Japan Work Visa',      note: 'Specified skilled' },
];

const EXP_BRACKETS = [
  { label: '0–2 yrs', value: 1 },
  { label: '3–5 yrs', value: 4 },
  { label: '6–10 yrs', value: 8 },
  { label: '11–15 yrs', value: 13 },
  { label: '16+ yrs', value: 18 },
];

export function OnboardingStep2Profile({ data, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.75rem)', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Tell us about yourself
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          This personalizes your risk score, compensation benchmarks, and action plan.
        </p>
      </div>

      {/* Experience */}
      <div>
        <label style={labelStyle}>Years of Experience</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EXP_BRACKETS.map(b => (
            <button
              key={b.value}
              onClick={() => onChange({ ...data, yearsExperience: b.value })}
              style={pillStyle(data.yearsExperience === b.value)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Salary band */}
      <div>
        <label style={labelStyle}>Annual Salary (USD equivalent)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SALARY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...data, salaryBand: opt.value })}
              style={pillStyle(data.salaryBand === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
          Approximate — used only for compensation benchmarking
        </div>
      </div>

      {/* Visa status */}
      <div>
        <label style={labelStyle}>Work Authorization</label>
        <select
          value={data.visaStatus ?? ''}
          onChange={e => onChange({ ...data, visaStatus: (e.target.value || null) as VisaStatus | null })}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
            padding: '11px 14px', color: data.visaStatus ? 'var(--text)' : 'rgba(255,255,255,0.35)',
            fontSize: 14, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark',
          }}
        >
          <option value="">Select your work authorization…</option>
          {VISA_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}{opt.note ? ` — ${opt.note}` : ''}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
          Visa dependency significantly affects your risk profile and escape-path options
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10,
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  border: `1.5px solid ${active ? 'var(--cyan)' : 'rgba(255,255,255,0.12)'}`,
  background: active ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
  color: active ? 'var(--cyan)' : 'rgba(255,255,255,0.55)',
  transition: 'all 0.15s',
});
