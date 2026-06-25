// SkillDependencyGraph.tsx — P3 Visual Intelligence
//
// Visual skill prerequisite/dependency graph showing how skills
// relate to each other. Renders as a horizontal flow diagram
// with nodes (skills) and directed edges (prerequisites).
// Data derived from safe + at_risk skills in career intelligence.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export interface SkillNode {
  id: string;
  label: string;
  tier: 'foundation' | 'intermediate' | 'advanced';
  status: 'safe' | 'at_risk' | 'evolving';
  value?: number;
}

export interface SkillEdge {
  from: string;
  to: string;
}

interface SkillDependencyGraphProps {
  nodes: SkillNode[];
  edges: SkillEdge[];
  title?: string;
  className?: string;
}

const TIER_X: Record<string, number> = { foundation: 0, intermediate: 1, advanced: 2 };
const STATUS_COLOR: Record<string, string> = {
  safe: '#10b981',
  at_risk: '#f59e0b',
  evolving: '#7c3aed',
};

export const SkillDependencyGraph: React.FC<SkillDependencyGraphProps> = ({
  nodes,
  edges,
  title = 'SKILL DEPENDENCIES',
  className,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const tiers = useMemo(() => {
    const grouped: Record<string, SkillNode[]> = { foundation: [], intermediate: [], advanced: [] };
    for (const node of nodes) {
      (grouped[node.tier] ?? grouped.intermediate).push(node);
    }
    return grouped;
  }, [nodes]);

  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    return new Set(
      edges
        .filter(e => e.from === hoveredNode || e.to === hoveredNode)
        .map(e => `${e.from}-${e.to}`),
    );
  }, [hoveredNode, edges]);

  if (nodes.length < 2) return null;

  const TIER_LABELS = ['Foundation', 'Growth', 'Advanced'];
  const COL_W = 130;
  const ROW_H = 40;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={className}
    >
      <p
        className="text-[9px] font-black tracking-[0.14em] uppercase mb-2.5"
        style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </p>

      <div
        className="rounded-xl overflow-x-auto px-4 py-4"
        style={{
          background: 'var(--alpha-bg-04)',
          border: '1px solid var(--alpha-bg-08)',
          scrollbarWidth: 'none',
        }}
      >
        {/* Tier headers */}
        <div className="flex gap-4 mb-3" style={{ minWidth: COL_W * 3 }}>
          {TIER_LABELS.map((label, i) => (
            <div key={label} className="flex-1 text-center">
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--alpha-text-25)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Node columns with connections */}
        <div className="flex gap-4 relative" style={{ minWidth: COL_W * 3 }}>
          {['foundation', 'intermediate', 'advanced'].map((tier, colIdx) => (
            <div key={tier} className="flex-1 flex flex-col gap-2">
              {(tiers[tier] ?? []).map((node, rowIdx) => {
                const color = STATUS_COLOR[node.status] ?? '#00d4e0';
                const isHovered = hoveredNode === node.id;
                const isConnected = hoveredNode
                  ? edges.some(e =>
                      (e.from === hoveredNode && e.to === node.id) ||
                      (e.to === hoveredNode && e.from === node.id),
                    )
                  : false;
                const dimmed = hoveredNode !== null && !isHovered && !isConnected;

                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: dimmed ? 0.3 : 1, x: 0 }}
                    transition={{ delay: colIdx * 0.05 + rowIdx * 0.03 }}
                    className="rounded-lg px-2.5 py-2 cursor-pointer"
                    style={{
                      background: isHovered ? `${color}18` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isHovered || isConnected ? `${color}40` : 'rgba(255,255,255,0.05)'}`,
                      transition: 'all 150ms ease-out',
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: color, opacity: 0.7 }}
                      />
                      <span
                        className="text-[10px] font-semibold truncate"
                        style={{ color: isHovered ? color : 'rgba(255,255,255,0.60)' }}
                      >
                        {node.label}
                      </span>
                    </div>
                    {node.value != null && (
                      <span className="text-[8px] font-mono mt-0.5 block" style={{ color: `${color}88` }}>
                        {node.status === 'at_risk' ? `${node.value}% risk` : `${node.value}% value`}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Edge indicators between columns */}
        {edges.length > 0 && (
          <div className="flex items-center justify-around mt-2 px-8">
            {[0, 1].map(i => (
              <ChevronRight
                key={i}
                className="w-3 h-3"
                style={{ color: 'var(--alpha-text-25)' }}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 justify-center">
          {[{ label: 'Safe', color: '#10b981' }, { label: 'At Risk', color: '#f59e0b' }, { label: 'Evolving', color: '#7c3aed' }].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: l.color, opacity: 0.6 }} />
              <span className="text-[8px]" style={{ color: 'var(--alpha-text-30)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SkillDependencyGraph;
