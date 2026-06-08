// OfferAnalysisPanel.tsx — Score an offer vs. market + give accept/negotiate/decline recommendation
import { useState, useMemo } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface OfferInputs {
  base: string;
  bonus: string;
  equity: string;
  benefits: string;
}

function scoreOffer(inputs: OfferInputs, market: HybridResult['compensationRisk']): { score: number; verdict: 'ACCEPT' | 'NEGOTIATE' | 'DECLINE'; reasons: string[] } {
  const base = parseFloat(inputs.base) || 0;
  const bonus = parseFloat(inputs.bonus) || 0;
  const equity = parseFloat(inputs.equity) || 0;
  const benefits = parseFloat(inputs.benefits) || 0;

  if (base === 0) return { score: 0, verdict: 'NEGOTIATE', reasons: ['Enter offer details to get analysis'] };

  const totalComp = base + bonus * 0.7 + equity * 0.5 + benefits * 0.5;
  const median = market?.estimatedMarketMedian ?? base;
  const vsMarket = ((base - median) / median) * 100;

  let score = 50;
  const reasons: string[] = [];

  if (vsMarket > 15) { score += 20; reasons.push(`Base is ${Math.round(vsMarket)}% above market — strong`); }
  else if (vsMarket > 0) { score += 10; reasons.push(`Base is ${Math.round(vsMarket)}% above market median`); }
  else if (vsMarket > -10) { score += 0; reasons.push(`Base is near market median — room to negotiate`); }
  else { score -= 15; reasons.push(`Base is ${Math.round(Math.abs(vsMarket))}% below market — push back`); }

  if (equity > 0) { score += 10; reasons.push('Equity component adds upside'); }
  if (bonus > base * 0.15) { score += 8; reasons.push('Above-average bonus target'); }
  if (benefits > 5000) { score += 5; reasons.push('Strong benefits package'); }

  const cascade = market?.cascadeStage;
  if (cascade === 'PRE_LAYOFF' || cascade === 'PAY_CUT') { score -= 20; reasons.push('⚠️ Company comp cascade in warning zone — negotiate upfront'); }

  score = Math.max(0, Math.min(100, score));
  const verdict = score >= 70 ? 'ACCEPT' : score >= 45 ? 'NEGOTIATE' : 'DECLINE';

  return { score, verdict, reasons };
}

const VERDICT_CONFIG = {
  ACCEPT:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  label: 'Strong Offer — Consider Accepting'     },
  NEGOTIATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  label: 'Negotiation Opportunity — Push Back'    },
  DECLINE:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   label: 'Below Market — Decline or Negotiate Hard'},
};

export function OfferAnalysisPanel({ scoreResult }: Props) {
  const [inputs, setInputs] = useState<OfferInputs>({ base: '', bonus: '', equity: '', benefits: '' });

  const analysis = useMemo(() => scoreOffer(inputs, scoreResult.compensationRisk), [inputs, scoreResult.compensationRisk]);
  const cfg = VERDICT_CONFIG[analysis.verdict];

  const field = (key: keyof OfferInputs, label: string, hint: string) => (
    <div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>$</span>
        <input
          type="number"
          placeholder={hint}
          value={inputs[key]}
          onChange={e => setInputs(i => ({ ...i, [key]: e.target.value }))}
          style={{ width: '100%', paddingLeft: 24, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{hint}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Offer Analysis</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Enter an offer to get an accept / negotiate / decline recommendation vs. your market benchmark.
        </div>
      </div>

      {/* Inputs */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>Offer Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('base',     'Base Salary (annual)',   'e.g. 120000')}
          {field('bonus',    'Target Bonus (annual)',  'e.g. 15000')}
          {field('equity',   'Equity Value (annual)',  'e.g. 10000 (RSU vesting / 4)')}
          {field('benefits', 'Benefits Value (annual)','e.g. 8000 (healthcare + 401k)')}
        </div>
      </div>

      {/* Verdict */}
      {inputs.base && (
        <div style={{ padding: '20px 24px', borderRadius: 14, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 48, color: cfg.color, lineHeight: 1 }}>{Math.round(analysis.score)}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: cfg.color }}>{analysis.verdict}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{cfg.label}</div>
            </div>
          </div>
          {analysis.reasons.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {analysis.reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', display: 'flex', gap: 8 }}>
                  <span style={{ color: cfg.color }}>·</span> {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Negotiation tips */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>Negotiation Quick Tips</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Never accept on the first call — always say "I need a few days to review"',
            'Ask for the total comp package in writing before negotiating',
            'Lead with gratitude, then pivot: "I\'m excited — and I want to make this work. Can we talk about base?"',
            'Counter 10–15% above what you\'d accept; they\'ll meet you in the middle',
            'If base is firm, negotiate signing bonus, remote flexibility, or earlier review date',
          ].map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', display: 'flex', gap: 8, lineHeight: 1.5 }}>
              <span style={{ color: 'var(--cyan)', flexShrink: 0 }}>→</span> {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
