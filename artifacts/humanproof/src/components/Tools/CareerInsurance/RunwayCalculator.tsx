// RunwayCalculator.tsx — Interactive runway calculator with visa + sliders
import { useState, useMemo } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

export function RunwayCalculator({ scoreResult }: Props) {
  const [income, setIncome] = useState(6000);
  const [expenses, setExpenses] = useState(3000);
  const [savings, setSavings] = useState(15000);

  const visa = scoreResult?.visaRisk;
  const visaGraceMonths: number | null = (visa as any)?.gracePeriodMonths ?? null;

  const monthsToZero = useMemo(() => {
    const monthlyBurn = expenses - income;
    if (monthlyBurn <= 0) return Infinity;
    return Math.floor(savings / monthlyBurn);
  }, [income, expenses, savings]);

  const isPositiveCashFlow = income >= expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const color = monthsToZero > 12 || isPositiveCashFlow
    ? '#10b981'
    : monthsToZero > 6
    ? '#f59e0b'
    : '#ef4444';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Runway Calculator
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Drag the sliders to model your financial situation in real time.
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Monthly Income (USD)', value: income, setter: setIncome, min: 0, max: 30000, step: 500, color: '#10b981' },
          { label: 'Monthly Expenses (USD)', value: expenses, setter: setExpenses, min: 0, max: 20000, step: 250, color: '#ef4444' },
          { label: 'Current Savings (USD)', value: savings, setter: setSavings, min: 0, max: 200000, step: 1000, color: 'var(--cyan)' },
        ].map(slider => (
          <div key={slider.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{slider.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: slider.color }}>
                ${slider.value.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={slider.value}
              onChange={e => slider.setter(Number(e.target.value))}
              style={{ width: '100%', accentColor: slider.color }}
            />
          </div>
        ))}
      </div>

      {/* Result */}
      <div className="card-premium" style={{ padding: 24, textAlign: 'center', marginBottom: 20, borderColor: color }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.08em' }}>
          {isPositiveCashFlow ? 'SAVINGS RATE' : 'MONTHS UNTIL ZERO'}
        </div>
        <div style={{ fontWeight: 800, fontSize: 52, color, lineHeight: 1, marginBottom: 8 }}>
          {isPositiveCashFlow
            ? `${Math.round(savingsRate)}%`
            : monthsToZero === Infinity ? '∞' : monthsToZero}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          {isPositiveCashFlow
            ? `Positive cash flow — you\'re saving $${(income - expenses).toLocaleString()}/month`
            : `At current burn rate, savings depleted in ${monthsToZero} month${monthsToZero !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Visa grace period warning */}
      {visaGraceMonths !== null && !isPositiveCashFlow && monthsToZero < visaGraceMonths + 3 && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13,
          color: 'var(--text)',
          marginBottom: 20,
        }}>
          ⚠️ <strong>Visa consideration:</strong> Your visa grace period is approximately {visaGraceMonths} months.
          Your current runway ({monthsToZero} months) may not cover your job search window.
          Build at least {visaGraceMonths + 3} months of runway before transitioning.
        </div>
      )}

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Monthly Surplus', value: income - expenses, prefix: '$', color: income >= expenses ? '#10b981' : '#ef4444' },
          { label: 'Annual Savings', value: Math.max(0, (income - expenses) * 12), prefix: '$', color: '#10b981' },
          { label: 'Burn Rate', value: Math.max(0, expenses - income), prefix: '$', color: '#ef4444', suffix: '/mo' },
        ].map(m => (
          <div key={m.label} className="card-premium" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: m.color }}>
              {m.prefix}{m.value.toLocaleString()}{m.suffix ?? ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
