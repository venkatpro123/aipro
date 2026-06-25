// Section6_FutureRoleEvolution — Career path chain showing role progression.

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Star } from 'lucide-react';
import type { FutureRoleStep } from '../../data/agenticWaveTypes';
import { getScoreColor } from '../../data/riskFormula';

interface Props {
  steps: FutureRoleStep[];
}

export const Section6_FutureRoleEvolution: React.FC<Props> = ({ steps }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{
        fontSize: 10, color: 'var(--alpha-text-35)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em', padding: '7px 12px', borderRadius: 8,
        background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)',
      }}>
        CAREER EVOLUTION PATH — How this role is likely to transform over time. Based on AI capability trajectories and career intelligence data.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
        {steps.map((step, i) => {
          const scoreColor = getScoreColor(step.riskLevel);
          const isLast = i === steps.length - 1;
          return (
            <React.Fragment key={i}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: i * 0.09 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '16px 18px', borderRadius: 14,
                  background: step.isCurrentRole ? 'rgba(0,212,224,0.07)' : 'rgba(255,255,255,0.03)',
                  border: step.isCurrentRole ? '1px solid rgba(0,212,224,0.25)' : '1px solid var(--alpha-bg-08)',
                }}
              >
                {/* Node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${scoreColor}18`,
                    border: `2px solid ${scoreColor}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: step.isCurrentRole ? `0 0 12px ${scoreColor}44` : 'none',
                  }}>
                    {step.isCurrentRole
                      ? <Star size={13} style={{ color: scoreColor }} />
                      : <span style={{ fontSize: 10, fontWeight: 800, color: scoreColor, fontFamily: 'var(--font-mono)' }}>{step.riskLevel}</span>
                    }
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: step.isCurrentRole ? 800 : 700, color: step.isCurrentRole ? 'var(--cyan,#22d3ee)' : 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                      {step.role}
                    </span>
                    {step.isCurrentRole && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--cyan,#22d3ee)', padding: '1px 6px', borderRadius: 4, background: 'rgba(0,212,224,0.12)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--alpha-text-45)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{step.timeframe}</span>
                    {!step.isCurrentRole && (
                      <span style={{ fontSize: 10, color: scoreColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Risk: {step.riskLevel}/100</span>
                    )}
                  </div>
                  {step.transitionNote && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--alpha-text-45)', lineHeight: 1.5 }}>
                      {step.transitionNote}
                    </div>
                  )}
                </div>
              </motion.div>

              {!isLast && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 30, margin: '2px 0' }}>
                  <ArrowDown size={14} style={{ color: 'var(--alpha-text-25)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: 'var(--alpha-text-25)', lineHeight: 1.6, fontStyle: 'italic' }}>
        Role evolution paths are forward projections based on AI capability research and observed industry transitions. Individual trajectories depend on skill investment, timing, and organisational context.
      </div>
    </div>
  );
};

export default Section6_FutureRoleEvolution;
