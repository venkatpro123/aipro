// RaisePlannerPanel.tsx — Raise probability, ask amount, and timing
import { useState } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

function computeRaiseProbability(tenure: number, perf: string, cascadeStage: string): number {
  let base = 50;
  if (tenure >= 2) base += 15;
  if (tenure >= 3) base += 10;
  if (perf === 'top') base += 20;
  else if (perf === 'above_average') base += 10;
  else if (perf === 'below_average') base -= 20;
  if (cascadeStage === 'PAY_FREEZE' || cascadeStage === 'PAY_CUT') base -= 30;
  if (cascadeStage === 'PRE_LAYOFF') base -= 40;
  return Math.max(5, Math.min(90, base));
}

export function RaisePlannerPanel({ scoreResult }: Props) {
  const comp = scoreResult.compensationRisk;
  const neg = scoreResult.negotiationIntelligence;

  const [tenure, setTenure] = useState('1.5');
  const [perf, setPerf] = useState('average');
  const [currentSalary, setCurrentSalary] = useState('');

  const probability = computeRaiseProbability(
    parseFloat(tenure) || 1.5,
    perf,
    comp?.cascadeStage ?? 'NORMAL',
  );

  const askPct = perf === 'top' ? 15 : perf === 'above_average' ? 10 : 7;
  const current = parseFloat(currentSalary) || 0;
  const askAmount = Math.round(current * askPct / 100);

  const probColor = probability >= 60 ? '#10b981' : probability >= 35 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Raise Planner</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Calculate your raise probability, recommended ask, and optimal timing.
        </div>
      </div>

      {/* Inputs */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Your Situation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>TENURE (YEARS)</div>
            <input
              type="number"
              value={tenure}
              onChange={e => setTenure(e.target.value)}
              step="0.5"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>PERFORMANCE TIER</div>
            <select
              value={perf}
              onChange={e => setPerf(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13 }}
            >
              <option value="top">Top Performer</option>
              <option value="above_average">Above Average</option>
              <option value="average">Average</option>
              <option value="below_average">Below Average</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>CURRENT SALARY ($)</div>
            <input
              type="number"
              value={currentSalary}
              onChange={e => setCurrentSalary(e.target.value)}
              placeholder="e.g. 120000"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <div className="card-premium" style={{ padding: 14, textAlign: 'center', background: 'transparent' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>CASCADE STAGE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: comp?.cascadeStage === 'NORMAL' ? '#10b981' : '#f59e0b' }}>
              {comp?.cascadeStageLabel ?? 'Normal'}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div className="card-premium" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600 }}>RAISE PROBABILITY</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: probColor }}>{probability}%</div>
        </div>
        <div className="card-premium" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600 }}>RECOMMENDED ASK</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cyan)' }}>+{askPct}%</div>
          {askAmount > 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>(+${askAmount.toLocaleString()})</div>}
        </div>
        <div className="card-premium" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600 }}>OPTIMAL TIMING</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            {neg?.timingWindow ?? (comp?.cascadeStage === 'NORMAL' ? 'Anytime — request now' : 'Wait for next review cycle')}
          </div>
        </div>
      </div>

      {/* Talking points */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Raise Conversation Framework</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { step: 'Request a dedicated 1:1', note: '"I\'d love to discuss my career trajectory and compensation — do you have 30 mins this week?"' },
            { step: 'Lead with impact, not time', note: '"In the past year, I\'ve delivered [X impact]. I want to align my comp to reflect this."' },
            { step: 'State your number confidently', note: `"Based on my contributions and market data, I'm targeting a ${askPct}% increase to $${current ? Math.round(current * (1 + askPct / 100)).toLocaleString() : '[target]'}."` },
            { step: 'Have a counter ready', note: '"If base isn\'t possible right now, I\'m open to discussing a signing bonus or earlier review."' },
            { step: 'Follow up in writing', note: 'Send a thank-you email summarizing the conversation and any commitments made.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', borderLeft: '2px solid var(--cyan)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{i + 1}. {item.step}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
