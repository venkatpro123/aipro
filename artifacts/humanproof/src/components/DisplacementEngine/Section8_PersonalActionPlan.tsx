// Section8_PersonalActionPlan — 4-horizon action cards with risk reduction %.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, TrendingDown, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { ActionHorizon } from '../../data/agenticWaveTypes';

interface Props {
  actionPlan: ActionHorizon[];
}

const HORIZON_STYLES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '30d':              { color: 'var(--color-cyan-text)', bg: 'rgba(34,211,238,0.07)',  border: 'rgba(34,211,238,0.22)',  icon: '◈' },
  '90d':              { color: 'var(--color-amber500-text)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.22)', icon: '◉' },
  '12mo':             { color: '#8b5cf6', bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.22)', icon: '⬡' },
  'before_threshold': { color: 'var(--color-red-text)', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.22)',  icon: '⬢' },
};

export const Section8_PersonalActionPlan: React.FC<Props> = ({ actionPlan }) => {
  const [openHorizon, setOpenHorizon] = useState<string>('30d');

  const totalReduction = actionPlan.reduce((s, h) => s + h.totalRiskReduction, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Total reduction banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 12,
        background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)',
      }}>
        <TrendingDown size={16} style={{ color: 'var(--color-emerald-text)', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-emerald-text)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Estimated Risk Reduction — Full Plan
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--alpha-text-85)', fontFamily: 'var(--font-mono)' }}>
            −{Math.min(totalReduction, 60)}% <span style={{ fontSize: 11, color: 'var(--alpha-text-35)', fontWeight: 400 }}>if all actions completed</span>
          </div>
        </div>
      </div>

      {/* Horizon accordion */}
      {actionPlan.map(horizon => {
        const style = HORIZON_STYLES[horizon.horizon] ?? HORIZON_STYLES['30d'];
        const isOpen = openHorizon === horizon.horizon;
        return (
          <div key={horizon.horizon} style={{ borderRadius: 14, background: style.bg, border: `1px solid ${style.border}`, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setOpenHorizon(isOpen ? '' : horizon.horizon)}
              style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, color: style.color }}>{style.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: style.color, lineHeight: 1.1 }}>{horizon.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--alpha-text-45)', marginTop: 2 }}>{horizon.sublabel}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-emerald-text)', fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
                    −{horizon.totalRiskReduction}%
                  </span>
                  {isOpen ? <ChevronUp size={14} style={{ color: 'var(--alpha-text-35)' }} /> : <ChevronDown size={14} style={{ color: 'var(--alpha-text-35)' }} />}
                </div>
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${style.border}` }}>
                    {horizon.actions.map((action, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: i * 0.05 }}
                        style={{ paddingTop: i === 0 ? 12 : 0 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                            background: `${style.color}18`, border: `1px solid ${style.color}35`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800, color: style.color, fontFamily: 'var(--font-mono)',
                            marginTop: 1,
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--alpha-text-85)', lineHeight: 1.3, marginBottom: 4 }}>
                              {action.action}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--alpha-text-50)', lineHeight: 1.6, marginBottom: 4 }}>
                              {action.why}
                            </div>
                            {action.outcome && (
                              <div style={{ fontSize: 10, color: 'var(--color-emerald-text)', fontStyle: 'italic', lineHeight: 1.4, marginBottom: 4 }}>
                                → {action.outcome}
                              </div>
                            )}
                            <div style={{ fontSize: 9, color: 'var(--color-emerald-text)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              −{action.riskReduction}% risk reduction
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div style={{ fontSize: 10, color: 'var(--alpha-text-25)', lineHeight: 1.6, fontStyle: 'italic' }}>
        Risk reduction estimates are indicative and represent the expected impact of these actions on overall displacement exposure. Actual results depend on execution quality, timing, and market conditions.
      </div>
    </div>
  );
};

export default Section8_PersonalActionPlan;
