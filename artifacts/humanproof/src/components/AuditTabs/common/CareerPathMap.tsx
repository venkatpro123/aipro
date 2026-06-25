// CareerPathMap.tsx — P2 Visual Storytelling
//
// Visual branching career path from current role to possible futures.
// Shows current position, pivot options, and target roles as an
// interactive node graph with connecting paths.
// Data source: roleAdjacency + careerPaths from intelligence data.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Zap, TrendingUp } from 'lucide-react';
import { riskColor } from '../../../lib/riskTokens';

interface PathNode {
  key: string;
  label: string;
  type: 'current' | 'pivot' | 'target' | 'stretch';
  demand?: number;
  riskDelta?: number;
  adjacencyStrength?: 'strong' | 'moderate' | 'weak';
  description?: string;
}

interface CareerPathMapProps {
  currentRole: string;
  currentScore: number;
  paths: PathNode[];
  className?: string;
}

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  current: { bg: 'rgba(0,212,224,0.12)', border: 'rgba(0,212,224,0.40)', text: 'var(--cyan)' },
  pivot:   { bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.35)', text: '#a78bfa' },
  target:  { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.35)', text: '#10b981' },
  stretch: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
};

const STRENGTH_LABEL: Record<string, string> = {
  strong: 'High match',
  moderate: 'Good match',
  weak: 'Stretch',
};

export const CareerPathMap: React.FC<CareerPathMapProps> = ({
  currentRole,
  currentScore,
  paths,
  className,
}) => {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  if (paths.length === 0) return null;

  const currentNode: PathNode = {
    key: 'current',
    label: currentRole,
    type: 'current',
  };

  const allNodes = [currentNode, ...paths.slice(0, 5)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={className}
    >
      <div className="flex items-center justify-between mb-2.5">
        <p
          className="text-[9px] font-black tracking-[0.14em] uppercase"
          style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
        >
          CAREER PATH MAP
        </p>
        <p className="text-[9px]" style={{ color: 'var(--alpha-text-25)' }}>
          {paths.length} path{paths.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div
        className="rounded-xl overflow-hidden px-4 py-4"
        style={{
          background: 'var(--alpha-bg-04)',
          border: '1px solid var(--alpha-bg-08)',
        }}
      >
        {/* Current role node (hub) */}
        <div className="flex justify-center mb-4">
          <div
            className="rounded-xl px-4 py-2.5 text-center"
            style={{
              background: NODE_COLORS.current.bg,
              border: `1.5px solid ${NODE_COLORS.current.border}`,
              minWidth: 140,
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--alpha-text-35)' }}>
              YOU ARE HERE
            </p>
            <p className="text-[12px] font-bold" style={{ color: NODE_COLORS.current.text }}>
              {currentRole}
            </p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: riskColor(currentScore) }}>
              Risk: {currentScore}/100
            </p>
          </div>
        </div>

        {/* Connector line */}
        <div className="flex justify-center mb-3">
          <div style={{ width: 1, height: 20, background: 'var(--alpha-bg-08)' }} />
        </div>

        {/* Path nodes */}
        <div className="flex flex-col gap-2">
          {paths.slice(0, 5).map((node, i) => {
            const colors = NODE_COLORS[node.type] ?? NODE_COLORS.pivot;
            const isExpanded = expandedNode === node.key;
            return (
              <motion.div
                key={node.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedNode(isExpanded ? null : node.key)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-left transition-all"
                  style={{
                    background: isExpanded ? colors.bg : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isExpanded ? colors.border : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Connector dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: colors.text, opacity: 0.6 }}
                    />

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: colors.text }}>
                        {node.label}
                      </p>
                      {node.adjacencyStrength && (
                        <p className="text-[9px]" style={{ color: 'var(--alpha-text-35)' }}>
                          {STRENGTH_LABEL[node.adjacencyStrength] ?? node.adjacencyStrength}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {node.demand != null && node.demand >= 60 && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)' }}>
                          <TrendingUp className="w-2.5 h-2.5" style={{ color: '#10b981' }} />
                          <span className="text-[8px] font-bold" style={{ color: '#10b981' }}>Hot</span>
                        </div>
                      )}
                      {node.riskDelta != null && (
                        <span className="text-[9px] font-bold" style={{ color: node.riskDelta < 0 ? '#10b981' : '#f59e0b' }}>
                          {node.riskDelta > 0 ? '+' : ''}{node.riskDelta}pt
                        </span>
                      )}
                      <ArrowRight className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && node.description && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-3.5 py-2 ml-5"
                  >
                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
                      {node.description}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default CareerPathMap;
