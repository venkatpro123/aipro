// NegotiationCoachPanel.tsx — Negotiation scripts and BATNA calculator from NegotiationIntelligenceResult
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const LEVERAGE_COLORS: Record<string, string> = {
  STRONG:   '#10b981',
  MODERATE: '#f59e0b',
  WEAK:     '#f97316',
  NONE:     '#ef4444',
};

export function NegotiationCoachPanel({ scoreResult }: Props) {
  const neg = scoreResult.negotiationIntelligence;

  if (!neg || !neg.shouldDisplay) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
        Run a full audit to generate your personalized negotiation strategy.
        Negotiation intelligence requires profile data (salary, runway, tenure).
      </div>
    );
  }

  const leverageColor = LEVERAGE_COLORS[neg.leverageRating] ?? '#f59e0b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Negotiation Coach</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Personalized negotiation scripts and strategy based on your leverage position.
        </div>
      </div>

      {/* Leverage overview */}
      <div style={{ padding: '20px 24px', borderRadius: 14, background: `${leverageColor}10`, border: `1px solid ${leverageColor}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>LEVERAGE RATING</div>
            <div style={{ fontWeight: 800, fontSize: 28, color: leverageColor }}>{neg.leverageRating}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>SCORE</div>
            <div style={{ fontWeight: 800, fontSize: 28, color: 'var(--text)' }}>{Math.round(neg.leverageScore)}/100</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>TIMING WINDOW</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{neg.timingWindow}</div>
          </div>
        </div>
      </div>

      {/* Recommended tactic + specific ask */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8 }}>RECOMMENDED TACTIC</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{neg.recommendedTactic}</div>
        </div>
        <div className="card-premium" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8 }}>SPECIFIC ASK</div>
          <div style={{ fontSize: 13, color: leverageColor, fontWeight: 600, lineHeight: 1.5 }}>{neg.specificAsk}</div>
        </div>
      </div>

      {/* BATNA */}
      <div className="card-premium" style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>BATNA STRENGTH</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{neg.batnaStrength}</div>
      </div>

      {/* Email scripts */}
      {neg.emailScripts && neg.emailScripts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Email Scripts</div>
          {neg.emailScripts.map((script, i) => (
            <div key={i} className="card-premium" style={{ padding: 20, borderLeft: `3px solid ${leverageColor}` }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: leverageColor, marginBottom: 4 }}>
                {i === 0 ? 'Opening Email' : 'Counter Email'}
              </div>
              {script.subject && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                  Subject: <em style={{ color: 'rgba(255,255,255,0.6)' }}>{script.subject}</em>
                </div>
              )}
              <pre style={{
                fontSize: 12, color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre-wrap',
                fontFamily: 'inherit', lineHeight: 1.6, margin: 0,
              }}>{script.body}</pre>
            </div>
          ))}
        </div>
      )}

      {/* Red lines */}
      {neg.redLines && neg.redLines.length > 0 && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#ef4444', marginBottom: 10 }}>⚠ Red Lines — Avoid These</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {neg.redLines.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 8 }}>
                <span style={{ color: '#ef4444' }}>✗</span> {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
