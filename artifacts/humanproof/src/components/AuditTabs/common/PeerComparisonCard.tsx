// PeerComparisonCard.tsx — Beast Mode V3 Tab 2
//
// Peer Comparison: ranks the user's company against sector peers by layoff risk.
// Sources:
//   result.peerContagion.peerLayoffEvents  → peer layoff data
//   result.peerContagion.similarCompanies  → peer list with risk signals
//   companyData.name                       → current company
//   result.total                           → current company score
//
// Only renders when peerContagion has at least 3 peers with risk scores.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { TabProps } from './types';

interface PeerEntry {
  name: string;
  riskScore: number;         // 0–100
  isCurrentCompany: boolean;
  signal?: string;           // brief signal label
}

function riskTier(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Critical', color: '#dc2626' };
  if (score >= 55) return { label: 'High',     color: '#f97316' };
  if (score >= 35) return { label: 'Moderate', color: '#f59e0b' };
  return                   { label: 'Low',      color: '#10b981' };
}

interface PeerComparisonCardProps {
  result: TabProps['result'];
  companyData: TabProps['companyData'];
}

export const PeerComparisonCard: React.FC<PeerComparisonCardProps> = ({ result, companyData }) => {
  const r  = result as any;
  const cd = companyData as any;

  const peers: PeerEntry[] = useMemo(() => {
    const currentName  = (cd?.name ?? r.companyName ?? '').toLowerCase();
    const currentScore = result.total;

    // Try peerContagion.peerLayoffEvents first (has the richest data)
    const peerEvents: any[] = r.peerContagion?.peerLayoffEvents ?? [];
    const peerList:   any[] = r.peerContagion?.similarCompanies ?? r.peerContagion?.peers ?? [];

    const out: PeerEntry[] = [];

    // Add current company first
    if (currentName) {
      out.push({
        name: cd?.name ?? r.companyName ?? 'Your Company',
        riskScore: currentScore,
        isCurrentCompany: true,
      });
    }

    // From peerLayoffEvents
    peerEvents.slice(0, 6).forEach((p: any) => {
      const name = String(p.company ?? p.name ?? '');
      if (!name || name.toLowerCase() === currentName) return;
      if (out.some(e => e.name.toLowerCase() === name.toLowerCase())) return;
      // Estimate risk score: recent layoff = high risk, use workerPct if available
      const layoffPct = p.percentCut ?? p.workerPercent ?? 0;
      const riskEst = Math.min(95, 45 + layoffPct * 0.8 + (p.isRecent ? 15 : 0));
      out.push({
        name,
        riskScore: Math.round(riskEst),
        isCurrentCompany: false,
        signal: p.percentCut ? `${p.percentCut}% workforce cut` : p.headline ? p.headline.slice(0, 40) : undefined,
      });
    });

    // From peerList (may have riskScore directly)
    peerList.slice(0, 6).forEach((p: any) => {
      const name = String(p.company ?? p.name ?? p.companyName ?? '');
      if (!name || name.toLowerCase() === currentName) return;
      if (out.some(e => e.name.toLowerCase() === name.toLowerCase())) return;
      const rs = p.riskScore ?? p.score ?? p.layoffRiskScore ?? null;
      if (rs == null) return;
      out.push({
        name,
        riskScore: Math.round(Math.min(99, Math.max(1, Number(rs)))),
        isCurrentCompany: false,
        signal: p.signal ?? p.trend ?? undefined,
      });
    });

    if (out.length < 3) return [];

    // Sort: current company pinned — then by risk score descending
    const [current, ...rest] = out;
    rest.sort((a, b) => b.riskScore - a.riskScore);
    return [current, ...rest].slice(0, 7);
  }, [result, companyData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (peers.length < 3) return null;

  const maxScore = Math.max(...peers.map(p => p.riskScore), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}
      >
        <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
        <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'var(--alpha-text-55)' }}>
          Peer Risk Comparison
        </span>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}
        >
          {peers.length} companies
        </span>
      </div>

      {/* Peer bars */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {peers.map((peer, i) => {
          const tier  = riskTier(peer.riskScore);
          const barPct = (peer.riskScore / maxScore) * 100;

          return (
            <motion.div
              key={peer.name}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + i * 0.04 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {peer.isCurrentCompany && (
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.25)' }}
                    >
                      YOU
                    </span>
                  )}
                  <span
                    className="text-[11px] font-semibold truncate"
                    style={{ color: peer.isCurrentCompany ? 'var(--alpha-text-92)' : 'var(--alpha-text-55)' }}
                  >
                    {peer.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {peer.signal && (
                    <span className="text-[9px] hidden sm:block" style={{ color: 'var(--alpha-text-25)' }}>
                      {peer.signal.length > 30 ? peer.signal.slice(0, 28) + '…' : peer.signal}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-black px-1.5 py-0.5 rounded"
                    style={{ background: tier.color + '18', color: tier.color }}
                  >
                    {peer.riskScore}
                  </span>
                  <span className="text-[9px] w-14 text-right" style={{ color: tier.color + 'cc' }}>
                    {tier.label}
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--alpha-bg-06)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barPct}%` }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
                  className="h-1.5 rounded-full"
                  style={{
                    background: peer.isCurrentCompany
                      ? `linear-gradient(90deg, #22d3ee, ${tier.color})`
                      : tier.color,
                    opacity: peer.isCurrentCompany ? 1 : 0.6,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        className="px-4 py-2"
        style={{ borderTop: '1px solid var(--alpha-bg-06)' }}
      >
        <p className="text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>
          Risk scores estimated from layoff signals, hiring trends, and financial indicators.
        </p>
      </div>
    </motion.div>
  );
};

export default PeerComparisonCard;
