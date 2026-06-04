// RoleEvolutionPath — §6 Future Role Evolution
// Horizontal career evolution rail showing how the role transforms over time.

import React from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';
import type { RoleEvolutionNode } from '../../data/automationTimelineData';

interface Props {
  roleKey: string;
  roleLabel: string;
  intel: CareerIntelligence | null;
  scoreColor: string;
  evolutionPath?: RoleEvolutionNode[];
}

const NODE_COLORS = ['var(--emerald)', 'var(--cyan)', 'var(--amber)', 'var(--violet)'];

const NODE_TYPE_LABELS: Record<string, string> = {
  current:     'TODAY',
  augmented:   '~2026–2027',
  specialized: '~2028–2030',
  transformed: '~2031–2032+',
};

function buildEvolutionPath(
  roleKey: string,
  roleLabel: string,
  intel: CareerIntelligence | null,
  seededPath?: RoleEvolutionNode[],
): RoleEvolutionNode[] {
  // 1. Use seeded ROLE_EVOLUTION_PATHS if available
  if (seededPath && seededPath.length >= 2) return seededPath;

  // 2. Derive from intel.careerPaths if available
  if (intel?.careerPaths && intel.careerPaths.length >= 1) {
    const paths = intel.careerPaths.slice(0, 3);
    const nodes: RoleEvolutionNode[] = [
      { label: intel.displayRole || roleLabel, timeframe: 'Now', type: 'current' },
      ...paths.map((p, i) => ({
        label: p.role,
        timeframe: i === 0 ? '~2026–2027' : i === 1 ? '~2028–2030' : '~2031–2032+',
        type: (['augmented', 'specialized', 'transformed'] as const)[i] ?? 'transformed',
      })),
    ];
    return nodes.slice(0, 4);
  }

  // 3. Generic fallback using role label
  const clean = roleLabel || 'Your Role';
  return [
    { label: clean,                          timeframe: 'Now',        type: 'current' },
    { label: `AI-Augmented ${clean}`,        timeframe: '~2026–2027', type: 'augmented' },
    { label: `${clean} Specialist`,          timeframe: '~2028–2030', type: 'specialized' },
    { label: 'AI Systems Coordinator',       timeframe: '~2031–2032+',type: 'transformed' },
  ];
}

export const RoleEvolutionPath: React.FC<Props> = ({ roleKey, roleLabel, intel, scoreColor, evolutionPath }) => {
  const nodes = buildEvolutionPath(roleKey, roleLabel, intel, evolutionPath);

  return (
    <div style={{ marginTop: '28px' }}>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>FUTURE ROLE EVOLUTION</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '24px', lineHeight: 1.5 }}>
        How this role is likely to transform as agentic AI capabilities mature. Each stage represents a structural shift in what the work requires.
      </p>

      {/* Desktop: horizontal rail */}
      <div style={{ position: 'relative', paddingBottom: '8px' }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: `${100 / (nodes.length * 2)}%`,
          right: `${100 / (nodes.length * 2)}%`,
          height: '2px',
          background: 'linear-gradient(90deg, var(--emerald)40, var(--cyan)40, var(--amber)40, var(--violet)40)',
          zIndex: 0,
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${nodes.length}, 1fr)`,
          gap: '8px',
          position: 'relative',
          zIndex: 1,
        }}>
          {nodes.map((node, i) => {
            const color = NODE_COLORS[i] ?? 'var(--text-3)';
            const isFirst = i === 0;
            return (
              <div key={`${node.type}-${node.label}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Node circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `${color}18`,
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px', flexShrink: 0,
                  boxShadow: isFirst ? `0 0 16px ${color}40` : `0 0 6px ${color}22`,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {i === 0 ? '📍' : i === 1 ? '🔄' : i === 2 ? '⬆️' : '🚀'}
                  </span>
                </div>

                {/* Timeframe badge */}
                <div style={{
                  padding: '2px 8px', borderRadius: '4px', marginBottom: '6px',
                  background: `${color}15`, border: `1px solid ${color}35`,
                  fontSize: '0.58rem', color, fontWeight: 800,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                }}>
                  {NODE_TYPE_LABELS[node.type] ?? node.timeframe}
                </div>

                {/* Role label */}
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: isFirst ? 700 : 500,
                  color: isFirst ? 'var(--text)' : 'var(--text-2)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: '120px',
                }}>
                  {node.label}
                </div>

                {isFirst && (
                  <div style={{
                    marginTop: '4px', padding: '2px 8px', borderRadius: '4px',
                    background: `${color}18`, border: `1px solid ${color}35`,
                    fontSize: '0.58rem', color, fontFamily: 'var(--font-mono)', fontWeight: 800,
                  }}>
                    CURRENT
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Evolution path is derived from career intelligence data and industry transition research. Individual outcomes depend on proactive skill development, market conditions, and personal positioning strategy.
      </div>
    </div>
  );
};
