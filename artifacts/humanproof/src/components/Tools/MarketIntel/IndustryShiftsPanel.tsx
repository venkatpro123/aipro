// IndustryShiftsPanel.tsx — Industry workforce flow using peer contagion data
import { useMemo } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface IndustryFlow {
  source: string;
  target: string;
  intensity: 'HIGH' | 'MODERATE' | 'LOW';
  workers: string;
  driver: string;
}

// Baseline industry flows — BLS/LinkedIn 2025. Sorted by relevance to user's sector.
const BASELINE_FLOWS: IndustryFlow[] = [
  { source: 'Traditional Media',    target: 'AI Content / Creator Tech',     intensity: 'HIGH',     workers: '~50K', driver: 'AI content generation replacing editorial roles' },
  { source: 'Legacy IT Services',   target: 'Cloud / Platform Engineering',  intensity: 'HIGH',     workers: '~80K', driver: 'Cloud migration displacing on-prem specialization' },
  { source: 'Traditional Finance',  target: 'Fintech / Crypto',              intensity: 'MODERATE', workers: '~30K', driver: 'Digital payment and DeFi growth attracting talent' },
  { source: 'Retail Banking',       target: 'Embedded Finance / SaaS',       intensity: 'MODERATE', workers: '~25K', driver: 'Branch closures + digital product growth' },
  { source: 'Ad Tech',              target: 'AI Marketing Tools',            intensity: 'MODERATE', workers: '~20K', driver: 'Programmatic AI replacing manual campaign management' },
  { source: 'Healthcare Admin',     target: 'Healthcare AI / Telehealth',    intensity: 'LOW',      workers: '~15K', driver: 'Digitization of patient records and scheduling' },
];

const INTENSITY_CONFIG = {
  HIGH:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',     border: 'rgba(239,68,68,0.3)'     },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',    border: 'rgba(245,158,11,0.3)'    },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)',    border: 'rgba(16,185,129,0.3)'    },
};

function isUserSectorMatch(flowText: string, userSector: string): boolean {
  if (!userSector) return false;
  const f = flowText.toLowerCase();
  const u = userSector.toLowerCase();
  return f.includes(u) || u.split(' ').some(word => word.length > 3 && f.includes(word));
}

export function IndustryShiftsPanel({ scoreResult }: Props) {
  const peerContagion = scoreResult.peerContagion;
  const userSector = scoreResult.roleMarketDemand?.snapshot?.roleName ?? '';

  const { flows, userMatchIndex } = useMemo(() => {
    const annotated = BASELINE_FLOWS.map(flow => ({
      ...flow,
      isUserSource: isUserSectorMatch(flow.source, userSector),
      isUserTarget: isUserSectorMatch(flow.target, userSector),
    }));

    // Override intensity for user's source industry using peer contagion wave
    const withLive = annotated.map(flow => {
      if (flow.isUserSource && peerContagion) {
        const wave = peerContagion.waveIntensity;
        const liveIntensity: IndustryFlow['intensity'] =
          wave === 'PEAK' || wave === 'ACTIVE' ? 'HIGH'
          : wave === 'SPREADING' ? 'MODERATE'
          : flow.intensity;
        return { ...flow, intensity: liveIntensity };
      }
      return flow;
    });

    // Sort: user's source sector first, then user's target, then by intensity
    const intensityOrder = { HIGH: 0, MODERATE: 1, LOW: 2 };
    const sorted = [...withLive].sort((a, b) => {
      if (a.isUserSource && !b.isUserSource) return -1;
      if (!a.isUserSource && b.isUserSource) return 1;
      if (a.isUserTarget && !b.isUserTarget) return -1;
      if (!a.isUserTarget && b.isUserTarget) return 1;
      return intensityOrder[a.intensity] - intensityOrder[b.intensity];
    });

    const matchIdx = sorted.findIndex(f => f.isUserSource || f.isUserTarget);
    return { flows: sorted, userMatchIndex: matchIdx };
  }, [peerContagion, userSector]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Industry Workforce Shifts
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Where workers are flowing — from declining industries into growth sectors. Use this to identify transition opportunities.
        </div>
      </div>

      {peerContagion && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: peerContagion.waveIntensity === 'PEAK' || peerContagion.waveIntensity === 'ACTIVE'
            ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 24,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}>
          {(peerContagion.waveIntensity === 'PEAK' || peerContagion.waveIntensity === 'ACTIVE') && (
            <AlertTriangle size={16} color="#ef4444" />
          )}
          Peer contagion wave intensity: <strong style={{ color: peerContagion.waveIntensity === 'PEAK' ? '#ef4444' : 'var(--cyan)' }}>
            {peerContagion.waveIntensity}
          </strong>
          {peerContagion.propagationRisk && (
            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>· Propagation risk: {peerContagion.propagationRisk}</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {flows.map((flow, i) => {
          const cfg = INTENSITY_CONFIG[flow.intensity];
          const isUserRelated = (flow as any).isUserSource || (flow as any).isUserTarget;
          return (
            <div
              key={i}
              className="card-premium"
              style={{ padding: '16px 18px', border: isUserRelated ? '1px solid rgba(0,212,255,0.3)' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: (flow as any).isUserSource ? 'var(--cyan)' : '#ef4444' }}>{flow.source}</span>
                <ArrowRight size={16} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: (flow as any).isUserTarget ? 'var(--cyan)' : '#10b981' }}>{flow.target}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isUserRelated && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--cyan)', background: 'rgba(0,212,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      YOUR SECTOR
                    </span>
                  )}
                  <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                    {flow.intensity}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <span>Estimated workers: <strong style={{ color: 'var(--text)' }}>{flow.workers}</strong></span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                {flow.driver}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        {userMatchIndex >= 0 && peerContagion
          ? '* Your sector intensity updated with live peer contagion data · baseline from BLS/LinkedIn 2025'
          : '* Baseline industry shift estimates from LinkedIn Workforce Report & BLS 2025 · run audit for live peer contagion data'}
      </div>
    </div>
  );
}
