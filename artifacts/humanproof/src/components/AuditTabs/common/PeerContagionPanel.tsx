// PeerContagionPanel.tsx — v13.0
// Sector contagion visualization. Shown in TransparencyTab.

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Activity, Building2, Clock } from "lucide-react";
import type { PeerContagionResult } from "@/services/peerContagionEngine";

interface PeerContagionPanelProps {
  contagion: PeerContagionResult;
}

const INTENSITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  NONE:       { text: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.20)' },
  EARLY:      { text: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  SPREADING:  { text: 'var(--color-orange-text)', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)' },
  ACTIVE:     { text: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.30)' },
  PEAK:       { text: '#dc2626', bg: 'rgba(220,38,38,0.10)',   border: 'rgba(220,38,38,0.40)' },
};

const RISK_LABELS: Record<string, string> = {
  NEGLIGIBLE: 'NEGLIGIBLE', WATCH: 'WATCH', ELEVATED: 'ELEVATED', HIGH: 'HIGH', CRITICAL: 'CRITICAL',
};

const PeerContagionPanel: React.FC<PeerContagionPanelProps> = ({ contagion }) => {
  const colors = INTENSITY_COLORS[contagion.waveIntensity] ?? INTENSITY_COLORS.NONE;
  const noData = contagion.totalPeersMonitored === 0;

  return (
    <div className="rounded-2xl p-4" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: colors.text }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--alpha-text-85)' }}>Sector Contagion Wave</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${colors.text}15`, color: colors.text, border: `1px solid ${colors.text}28` }}>
            {contagion.waveIntensity}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--alpha-bg-06)', color: 'var(--alpha-text-45)' }}>
            {contagion.totalPeersMonitored} peers
          </span>
        </div>
      </div>

      {/* Wave narrative */}
      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--alpha-text-55)' }}>
        {contagion.waveNarrative}
      </p>

      {/* Metrics row */}
      {!noData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <div className="text-center rounded-lg p-2" style={{ background: 'var(--alpha-bg-04)' }}>
            <div className="text-sm font-black" style={{ color: contagion.directCompetitorCuts > 0 ? colors.text : 'var(--alpha-text-70)' }}>
              {contagion.directCompetitorCuts}
            </div>
            <div className="text-[10px] opacity-40 mt-0.5">Direct cuts</div>
          </div>
          <div className="text-center rounded-lg p-2" style={{ background: 'var(--alpha-bg-04)' }}>
            <div className="text-sm font-black" style={{ color: 'var(--alpha-text-70)' }}>
              {contagion.adjacentPeerCuts}
            </div>
            <div className="text-[10px] opacity-40 mt-0.5">Adjacent cuts</div>
          </div>
          <div className="text-center rounded-lg p-2" style={{ background: 'var(--alpha-bg-04)' }}>
            <div className="text-sm font-black" style={{ color: contagion.contagionScore > 30 ? colors.text : 'var(--alpha-text-70)' }}>
              {contagion.contagionScore}
            </div>
            <div className="text-[10px] opacity-40 mt-0.5">Contagion score</div>
          </div>
        </div>
      )}

      {/* Affected peers list */}
      {contagion.affectedPeers.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold tracking-wider mb-2" style={{ color: 'var(--alpha-text-30)' }}>
            PEERS THAT CUT ({contagion.affectedPeers.length})
          </p>
          <div className="space-y-1.5">
            {contagion.affectedPeers.slice(0, 5).map((peer, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: `${colors.text}15`, border: `1px solid ${colors.text}25` }}>
                  <Building2 className="w-3 h-3" style={{ color: colors.text }} />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium capitalize" style={{ color: 'var(--alpha-text-85)' }}>
                    {peer.companyName}
                  </span>
                  <span className="text-[10px] ml-2 opacity-40">
                    {peer.relationshipType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                  <Clock className="w-2.5 h-2.5" />
                  {peer.daysAgo}d ago
                  {peer.estimatedPercentCut > 0 && (
                    <span style={{ color: colors.text }}> ~{peer.estimatedPercentCut}%</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Propagation timeline */}
      {contagion.estimatedPropagationDays && (
        <div className="rounded-xl p-3 mb-3" style={{ background: `${colors.text}10`, border: `1px solid ${colors.text}20` }}>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{ color: colors.text }} />
            <span className="text-xs font-semibold" style={{ color: colors.text }}>
              Estimated propagation: ~{contagion.estimatedPropagationDays} days
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--alpha-text-50)' }}>
            Based on documented sector wave timing patterns (2022–2026)
          </p>
        </div>
      )}

      {/* Action implication */}
      <div className="rounded-lg p-3" style={{ background: 'var(--alpha-bg-04)' }}>
        <p className="text-[10px] font-bold tracking-wider mb-1.5" style={{ color: 'var(--alpha-text-30)' }}>
          ACTION IMPLICATION
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--alpha-text-55)' }}>
          {contagion.actionImplication}
        </p>
      </div>

      {contagion.waveIntensity !== 'NONE' && (
        <div className="mt-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" style={{ color: colors.text, opacity: 0.6 }} />
          <span className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
            Amplifier ×{contagion.scoreAmplifier.toFixed(2)} applied to company risk score
          </span>
        </div>
      )}
      {/* Audit v35: static-cache disclosure */}
      <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md" style={{
        background: 'rgba(148,163,184,0.06)',
        border: '1px solid rgba(148,163,184,0.18)',
      }}>
        <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.6)' }} />
        <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.7)' }}>
          Static peer graph · Curated layoff cache · Not real-time peer monitoring
        </p>
      </div>
      {/* Confidence disclosure — user-appropriate framing of model maturity.
          The full technical calibration detail lives in the Methodology tab. */}
      <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1 rounded-md" style={{
        background: 'var(--alpha-bg-04)',
        border: '1px solid var(--alpha-bg-08)',
      }}>
        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }} />
        <p className="text-[10px]" style={{ color: 'var(--alpha-text-30)' }}>
          {contagion.multipliersCalibrationStatus === 'developer_estimate'
            ? 'Peer contagion scores are directional — treat as a signal, not a precise measurement.'
            : `Peer contagion scores are based on ${contagion.decayEvidenceCount > 0 ? `${contagion.decayEvidenceCount} documented layoff events` : 'observed layoff patterns'}.`}
        </p>
      </div>
    </div>
  );
};

export default PeerContagionPanel;
