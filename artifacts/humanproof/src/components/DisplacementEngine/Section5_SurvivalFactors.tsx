// Section5_SurvivalFactors — Per-skill protection analysis.
// Shows: protectionScore, futureValue, marketScarcity for each skill.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { SurvivalFactor } from '../../data/agenticWaveTypes';

interface Props {
  factors: SurvivalFactor[];
}

const TIER_META = {
  safe:     { icon: Shield,        color: 'var(--color-emerald-text)', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)',  label: 'PROTECTION ASSET' },
  at_risk:  { icon: AlertTriangle, color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', label: 'ADAPT NOW' },
  obsolete: { icon: XCircle,       color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.20)',  label: 'TRANSITION AWAY' },
};

const SCARCITY_COLORS: Record<string, string> = {
  SCARCE: 'var(--color-emerald-text)', BALANCED: 'var(--color-amber500-text)', ABUNDANT: 'var(--color-red-text)',
};

function MeterBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--alpha-bg-08)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
    </div>
  );
}

export const Section5_SurvivalFactors: React.FC<Props> = ({ factors }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const safe    = factors.filter(f => f.tier === 'safe');
  const atRisk  = factors.filter(f => f.tier === 'at_risk');
  const obsolete= factors.filter(f => f.tier === 'obsolete');
  const groups  = [
    { label: 'Protection Assets', items: safe },
    { label: 'Skills to Adapt', items: atRisk },
    { label: 'Transition Away', items: obsolete },
  ].filter(g => g.items.length > 0);

  let globalIdx = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map(factor => {
              const idx = globalIdx++;
              const meta = TIER_META[factor.tier];
              const Icon = meta.icon;
              const isOpen = expanded === idx;
              return (
                <motion.div
                  key={factor.skill}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: (idx % 4) * 0.06 }}
                  style={{ borderRadius: 12, background: meta.bg, border: `1px solid ${meta.border}`, overflow: 'hidden' }}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : idx)}
                    style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alpha-text-85)' }}>{factor.skill}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: meta.color, padding: '1px 6px', borderRadius: 4, background: `${meta.color}18`, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                          {meta.label}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: SCARCITY_COLORS[factor.marketScarcity], padding: '1px 6px', borderRadius: 4, background: `${SCARCITY_COLORS[factor.marketScarcity]}15`, fontFamily: 'var(--font-mono)' }}>
                          {factor.marketScarcity}
                        </span>
                        {isOpen ? <ChevronUp size={12} style={{ color: 'var(--alpha-text-35)' }} /> : <ChevronDown size={12} style={{ color: 'var(--alpha-text-35)' }} />}
                      </div>
                    </div>

                    {/* Score bars */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>PROTECTION</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: meta.color, fontFamily: 'var(--font-mono)' }}>{factor.protectionScore}</span>
                        </div>
                        <MeterBar value={factor.protectionScore} color={meta.color} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>FUTURE VALUE</span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--cyan,#22d3ee)', fontFamily: 'var(--font-mono)' }}>{factor.futureValue}</span>
                        </div>
                        <MeterBar value={factor.futureValue} color="var(--cyan,#22d3ee)" />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ padding: '0 14px 12px', borderTop: `1px solid ${meta.border}` }}
                    >
                      <p style={{ fontSize: 12, color: 'var(--alpha-text-55)', lineHeight: 1.65, margin: '10px 0 0' }}>
                        {factor.scarcityReason}
                      </p>
                      {factor.horizon && (
                        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--alpha-text-30)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                          Horizon: {factor.horizon}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Section5_SurvivalFactors;
