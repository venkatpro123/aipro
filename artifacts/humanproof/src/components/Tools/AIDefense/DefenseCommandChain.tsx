// DefenseCommandChain.tsx — AI Career Defense: the justification chain (Rules #1/#10/#12)
//
// No recommendation appears without justification. This renders the command
// chain behind any defense recommendation:
//   Threat → Impact → Probability → Timeline → Defense → Outcome → Confidence
// so the user never wonders "why am I seeing this?"

export interface CommandChain {
  threat: string;
  impact: string;
  probability?: string;
  timeline: string;
  defense: string;
  outcome: string;
  confidence: number;            // 0–100
  confidenceKind: 'measured' | 'modeled' | 'estimated';
}

const PROVENANCE_COLOR: Record<CommandChain['confidenceKind'], string> = {
  measured: '#10b981', modeled: '#60a5fa', estimated: '#f59e0b',
};

const ROWS: Array<{ key: keyof CommandChain; label: string; icon: string; color: string }> = [
  { key: 'threat', label: 'THREAT', icon: '⚠', color: '#ef4444' },
  { key: 'impact', label: 'IMPACT', icon: '◎', color: '#f97316' },
  { key: 'probability', label: 'PROBABILITY', icon: '%', color: '#a78bfa' },
  { key: 'timeline', label: 'TIMELINE', icon: '⏱', color: 'rgba(255,255,255,0.5)' },
  { key: 'defense', label: 'DEFENSE', icon: '🛡', color: '#00d4e0' },
  { key: 'outcome', label: 'OUTCOME', icon: '→', color: '#10b981' },
];

export function DefenseCommandChain({ chain }: { chain: CommandChain }) {
  const provColor = PROVENANCE_COLOR[chain.confidenceKind];
  return (
    <div style={{ borderRadius: 8, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ROWS.map(row => {
          const value = chain[row.key] as string | undefined;
          if (!value) return null;
          return (
            <div key={row.key} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, width: 78, fontSize: 9, fontWeight: 800, color: row.color, letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)', paddingTop: 1 }}>
                {row.icon} {row.label}
              </span>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.45 }}>{value}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)' }}>CONFIDENCE</span>
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 5, color: provColor, background: `${provColor}16`, border: `1px solid ${provColor}30`, fontFamily: 'var(--font-mono, monospace)' }}>
          {chain.confidence}% · {chain.confidenceKind.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
