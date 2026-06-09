// OnboardingStep4Financial.tsx — Step 4: Financial safety net
// Extracted field set from ProfileSetupModal financial step.
import { DollarSign } from 'lucide-react';

export interface Step4Data {
  monthlySalaryUsd: number | null;
  savingsMonthsRunway: number | null;
  hasEquityVesting: boolean;
  equityVestMonths: number | null;
  hasDependents: boolean;
}

interface Props {
  data: Step4Data;
  onChange: (data: Step4Data) => void;
}

const RUNWAY_OPTIONS = [
  { label: '< 1 month',  value: 0.5 },
  { label: '1–3 months', value: 2   },
  { label: '3–6 months', value: 4.5 },
  { label: '6–12 months', value: 9  },
  { label: '1–2 years',  value: 18  },
  { label: '2+ years',   value: 30  },
];

const SALARY_BUCKETS = [
  { label: '< $2K/mo',  value: 1500  },
  { label: '$2–4K/mo',  value: 3000  },
  { label: '$4–7K/mo',  value: 5500  },
  { label: '$7–12K/mo', value: 9500  },
  { label: '$12–20K/mo', value: 16000 },
  { label: '$20K+/mo',  value: 25000 },
];

export function OnboardingStep4Financial({ data, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DollarSign size={16} color="var(--cyan)" />
          </div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Financial Safety Net
          </h2>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
          This shapes your risk horizon, contingency plans, and negotiation leverage.
          Approximate answers work fine.
        </p>
      </div>

      {/* Monthly salary */}
      <div>
        <label style={labelStyle}>Monthly Take-Home (approx. USD)</label>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {SALARY_BUCKETS.map(b => (
            <button
              key={b.value}
              onClick={() => onChange({ ...data, monthlySalaryUsd: b.value })}
              style={pillStyle(data.monthlySalaryUsd === b.value)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>
          Used only for financial runway estimates — not stored in plain text
        </div>
      </div>

      {/* Savings runway */}
      <div>
        <label style={labelStyle}>Savings Runway (if income stopped today)</label>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {RUNWAY_OPTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => onChange({ ...data, savingsMonthsRunway: r.value })}
              style={pillStyle(data.savingsMonthsRunway === r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equity vesting */}
      <div>
        <label style={labelStyle}>Unvested Equity / Stock</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Yes, I have unvested equity', val: true }, { label: 'No / Not applicable', val: false }].map(opt => (
            <button
              key={String(opt.val)}
              onClick={() => onChange({ ...data, hasEquityVesting: opt.val, equityVestMonths: opt.val ? data.equityVestMonths : null })}
              style={{ ...pillStyle(data.hasEquityVesting === opt.val), flex: 1 }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {data.hasEquityVesting && (
          <div style={{ marginTop: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 8 }}>Months until next significant vest</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {[1, 3, 6, 12, 18, 24].map(m => (
                <button
                  key={m}
                  onClick={() => onChange({ ...data, equityVestMonths: m })}
                  style={pillStyle(data.equityVestMonths === m)}
                >
                  {m} mo
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dependents */}
      <div>
        <label style={labelStyle}>Financial Dependents</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Yes (children, parents, etc.)', val: true }, { label: 'No dependents', val: false }].map(opt => (
            <button
              key={String(opt.val)}
              onClick={() => onChange({ ...data, hasDependents: opt.val })}
              style={{ ...pillStyle(data.hasDependents === opt.val), flex: 1 }}
            >
              {opt.label}
            </button>
          ))}
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
