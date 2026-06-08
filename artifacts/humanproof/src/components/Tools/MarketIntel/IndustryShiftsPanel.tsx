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

const INDUSTRY_FLOWS: IndustryFlow[] = [
  { source: 'Traditional Media', target: 'AI Content / Creator Tech', intensity: 'HIGH', workers: '~50K', driver: 'AI content generation replacing editorial roles' },
  { source: 'Traditional Finance', target: 'Fintech / Crypto', intensity: 'MODERATE', workers: '~30K', driver: 'Digital payment and DeFi growth attracting talent' },
  { source: 'Retail Banking', target: 'Embedded Finance / SaaS', intensity: 'MODERATE', workers: '~25K', driver: 'Branch closures + digital product growth' },
  { source: 'Legacy IT Services', target: 'Cloud / Platform Engineering', intensity: 'HIGH', workers: '~80K', driver: 'Cloud migration displacing on-prem specialization' },
  { source: 'Ad Tech', target: 'AI Marketing Tools', intensity: 'MODERATE', workers: '~20K', driver: 'Programmatic AI replacing manual campaign management' },
  { source: 'Healthcare Admin', target: 'Healthcare AI / Telehealth', intensity: 'LOW', workers: '~15K', driver: 'Digitization of patient records and scheduling' },
];

const INTENSITY_CONFIG = {
  HIGH:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',     border: 'rgba(239,68,68,0.3)'     },
  MODERATE: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',    border: 'rgba(245,158,11,0.3)'    },
  LOW:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)',    border: 'rgba(16,185,129,0.3)'    },
};

export function IndustryShiftsPanel({ scoreResult }: Props) {
  const peerContagion = scoreResult.peerContagion;
  const userSector = scoreResult.roleMarketDemand?.snapshot?.roleName ?? '';

  const flows = useMemo(() => {
    if (!peerContagion) return INDUSTRY_FLOWS;
    // Elevate flows matching user's sector
    return [...INDUSTRY_FLOWS].sort((a, b) => {
      const aMatch = a.source.toLowerCase().includes(userSector.toLowerCase()) ? -1 : 0;
      const bMatch = b.source.toLowerCase().includes(userSector.toLowerCase()) ? -1 : 0;
      return aMatch - bMatch;
    });
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
          return (
            <div
              key={i}
              className="card-premium"
              style={{ padding: '16px 18px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{flow.source}</span>
                <ArrowRight size={16} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{flow.target}</span>
                <div style={{
                  marginLeft: 'auto',
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  color: cfg.color,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                }}>
                  {flow.intensity}
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
        * Industry shift estimates based on LinkedIn Workforce Report, BLS data, and peer contagion analysis · Q1 2026
      </div>
    </div>
  );
}
