// EmergencyFundPlanner.tsx — Emergency fund planning with runway targets
import { useState } from 'react';
import { DollarSign, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

export function EmergencyFundPlanner({ scoreResult }: Props) {
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');

  const expenses = parseFloat(monthlyExpenses) || 0;
  const savings = parseFloat(currentSavings) || 0;

  const runwayMonths = expenses > 0 ? savings / expenses : 0;
  const targetMonths = 6;
  const shortfall = Math.max(0, expenses * targetMonths - savings);
  const monthlySavingsTarget = shortfall > 0 ? Math.ceil(shortfall / 12) : 0;

  const existingRunway = scoreResult?.financialRunway?.runwayMonths ?? null;

  const runwayColor = runwayMonths >= 6 ? '#10b981' : runwayMonths >= 3 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Emergency Fund Planner
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Calculate your financial runway and what you need to reach a 6-month safety net.
        </div>
      </div>

      {existingRunway !== null && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 20,
        }}>
          Your audit estimated <strong style={{ color: '#10b981' }}>{existingRunway.toFixed(1)} months</strong> of financial runway.
          Refine below with your actual numbers.
        </div>
      )}

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
            MONTHLY EXPENSES (USD)
          </label>
          <div style={{ position: 'relative' }}>
            <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="number"
              value={monthlyExpenses}
              onChange={e => setMonthlyExpenses(e.target.value)}
              placeholder="3000"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px 10px 32px',
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
            CURRENT SAVINGS (USD)
          </label>
          <div style={{ position: 'relative' }}>
            <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="number"
              value={currentSavings}
              onChange={e => setCurrentSavings(e.target.value)}
              placeholder="10000"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px 10px 32px',
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {expenses > 0 && (
        <>
          {/* Runway result */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '20px 24px',
            borderRadius: 14,
            background: `${runwayColor}10`,
            border: `1px solid ${runwayColor}33`,
            marginBottom: 20,
          }}>
            <div style={{ fontWeight: 800, fontSize: 42, color: runwayColor, lineHeight: 1 }}>
              {runwayMonths.toFixed(1)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                months of runway
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {runwayMonths >= 6
                  ? '✓ You have a strong safety net (6+ months)'
                  : runwayMonths >= 3
                  ? '⚠ Approaching the safe threshold — build toward 6 months'
                  : '🚨 Critical — under 3 months is a high-risk position'}
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div className="card-premium" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>TARGET (6 months)</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
                ${(expenses * targetMonths).toLocaleString()}
              </div>
            </div>
            <div className="card-premium" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>CURRENT SAVINGS</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
                ${savings.toLocaleString()}
              </div>
            </div>
            <div className="card-premium" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>GAP TO FILL</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: shortfall > 0 ? '#ef4444' : '#10b981' }}>
                {shortfall > 0 ? `$${shortfall.toLocaleString()}` : 'None ✓'}
              </div>
            </div>
          </div>

          {shortfall > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '16px 18px',
              borderRadius: 12,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <TrendingUp size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>
                  Recommended savings target: ${monthlySavingsTarget.toLocaleString()}/month
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  At this rate you'll reach a 6-month emergency fund in 12 months.
                  Even $500/month progress is meaningful — start now.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!monthlyExpenses && (
        <div style={{
          textAlign: 'center',
          padding: '40px 24px',
          color: 'rgba(255,255,255,0.3)',
          fontSize: 14,
        }}>
          Enter your monthly expenses above to calculate your financial runway.
        </div>
      )}
    </div>
  );
}
