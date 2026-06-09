// RiskReductionPlanner.tsx — Defence Priority Engine + live signal echo
import { useState } from 'react';
import { DefensePriorityEngine } from './DefensePriorityEngine';
import type { HybridResult } from '../../../types/hybridResult';
import ProvenanceLabel, { provenanceKindFromSource } from '../../AuditTabs/common/ProvenanceLabel';
import { useOrchestratorBus } from '../../../hooks/useOrchestratorBus';

interface Props {
  scoreResult: HybridResult;
}

export function RiskReductionPlanner({ scoreResult }: Props) {
  const feed = useOrchestratorBus();
  const topSignals = feed?.primary.slice(0, 2) ?? [];
  const [showSignals, setShowSignals] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Defence Priority Engine
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Ranked actions by risk reduction impact. Complete the top card first.
        </div>
      </div>

      {/* Live signal echo strip */}
      {topSignals.length > 0 && (
        <div style={{
          marginBottom: 18, borderRadius: 9,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}>
          <button
            type="button"
            onClick={() => setShowSignals(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 14px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)',
              flexShrink: 0, boxShadow: '0 0 6px var(--cyan)',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', flex: 1 }}>
              {topSignals.length} live signal{topSignals.length !== 1 ? 's' : ''} affecting this view
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {showSignals ? '▲' : '▾'}
            </span>
          </button>

          {showSignals && (
            <div style={{ padding: '2px 14px 12px' }}>
              {topSignals.map((rs, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  paddingTop: 8, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                }}>
                  <span style={{
                    padding: '1px 5px', borderRadius: 3,
                    background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.18)',
                    fontSize: 9, fontWeight: 700, color: 'var(--cyan)',
                    fontFamily: 'var(--font-mono, monospace)', flexShrink: 0,
                  }}>
                    T{rs.signal.tier}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 1.4 }}>
                    {rs.signal.headline}
                  </span>
                  <ProvenanceLabel kind={provenanceKindFromSource(rs.signal.sourceKind)} size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DefensePriorityEngine scoreResult={scoreResult} />
    </div>
  );
}
