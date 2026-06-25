// CareerEvolutionTimeline.tsx — Phase 10 Career Evolution Map
//
// Temporal career roadmap: TODAY → NEXT MOVE → FUTURE POSITION → 2030 HORIZON.
// Data-driven from roleAdjacency (1-hop and 2-hop paths).

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, ArrowRight, Target, Compass, Telescope } from 'lucide-react';
import { riskColor } from '../../../lib/riskTokens';

interface TimelineNode {
  label: string;
  role: string;
  score: number | null;
  timeframe: string;
  skillBridge?: string[];
  icon: React.ElementType;
}

interface AdjacentRole {
  targetRoleKey?: string;
  targetRoleLabel?: string;
  estimatedScoreAtTarget?: number;
  scoreReduction?: number;
  skillBridgeRequired?: string[];
  timeToQualifiedWeeks?: number;
  adjacencyStrength?: string;
}

interface TwoHopPath {
  viaRoleLabel?: string;
  destinationLabel?: string;
  combinedScoreReduction?: number;
  totalWeeks?: number;
  viaSkills?: string[];
  destinationSkills?: string[];
}

export interface CareerEvolutionTimelineProps {
  currentRole: string;
  currentScore: number;
  adjacentRoles: AdjacentRole[];
  twoHopPaths?: TwoHopPath[];
  className?: string;
}

function buildNodes(
  currentRole: string,
  currentScore: number,
  adjacentRoles: AdjacentRole[],
  twoHopPaths: TwoHopPath[],
): TimelineNode[] {
  const nodes: TimelineNode[] = [];

  nodes.push({
    label: 'TODAY',
    role: currentRole,
    score: currentScore,
    timeframe: 'Current position',
    icon: MapPin,
  });

  const bestAdj = adjacentRoles
    .filter(a => a.adjacencyStrength === 'strong' || a.adjacencyStrength === 'moderate')
    .sort((a, b) => (b.scoreReduction ?? 0) - (a.scoreReduction ?? 0))[0];

  if (bestAdj) {
    const weeks = bestAdj.timeToQualifiedWeeks ?? 12;
    const timeframe = weeks <= 8 ? '~2 months' : weeks <= 16 ? '~3-4 months' : '~6 months';
    nodes.push({
      label: 'NEXT MOVE',
      role: bestAdj.targetRoleLabel ?? String(bestAdj.targetRoleKey ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      score: bestAdj.estimatedScoreAtTarget ?? (currentScore - (bestAdj.scoreReduction ?? 0)),
      timeframe,
      skillBridge: bestAdj.skillBridgeRequired?.slice(0, 2),
      icon: ArrowRight,
    });
  }

  const bestTwoHop = twoHopPaths
    .sort((a, b) => (b.combinedScoreReduction ?? 0) - (a.combinedScoreReduction ?? 0))[0];

  if (bestTwoHop) {
    const weeks = bestTwoHop.totalWeeks ?? 24;
    const timeframe = weeks <= 20 ? '~6 months' : weeks <= 40 ? '~9 months' : '~12 months';
    nodes.push({
      label: 'FUTURE POSITION',
      role: bestTwoHop.destinationLabel ?? 'Advanced Role',
      score: Math.max(0, currentScore - (bestTwoHop.combinedScoreReduction ?? 0)),
      timeframe,
      skillBridge: bestTwoHop.destinationSkills?.slice(0, 2),
      icon: Target,
    });
  }

  const projectedScore2030 = bestTwoHop
    ? Math.max(5, currentScore - (bestTwoHop.combinedScoreReduction ?? 0) - 10)
    : bestAdj
    ? Math.max(5, currentScore - (bestAdj.scoreReduction ?? 0) * 1.5)
    : Math.max(10, currentScore * 0.6);

  nodes.push({
    label: '2030 HORIZON',
    role: bestTwoHop?.destinationLabel ?? bestAdj?.targetRoleLabel ?? 'Evolved Role',
    score: Math.round(projectedScore2030),
    timeframe: 'With sustained action',
    icon: Telescope,
  });

  return nodes;
}

export const CareerEvolutionTimeline: React.FC<CareerEvolutionTimelineProps> = ({
  currentRole,
  currentScore,
  adjacentRoles,
  twoHopPaths = [],
  className,
}) => {
  if (adjacentRoles.length === 0) return null;

  const nodes = buildNodes(currentRole, currentScore, adjacentRoles, twoHopPaths);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Compass size={14} style={{ color: 'var(--alpha-text-35)' }} />
        <span
          className="text-[10px] font-black tracking-[0.14em] uppercase"
          style={{ color: 'var(--alpha-text-25)', fontFamily: 'var(--font-mono)' }}
        >
          CAREER EVOLUTION MAP
        </span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
        <div className="px-4 py-3">
          <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--alpha-text-70)' }}>
            Your Projected Career Trajectory
          </p>
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
            Based on adjacent roles, skill bridges, and AI disruption forecast
          </p>
        </div>

        <div className="relative px-4 pb-4">
          {/* Connecting line */}
          <div
            className="absolute left-[30px] top-0 bottom-4 w-px"
            style={{ background: 'linear-gradient(to bottom, rgba(0,212,224,0.4), rgba(16,185,129,0.3), rgba(16,185,129,0.1))' }}
          />

          {nodes.map((node, i) => {
            const Icon = node.icon;
            const color = node.score != null ? riskColor(node.score) : 'var(--cyan)';
            const isFirst = i === 0;
            const isLast = i === nodes.length - 1;

            return (
              <motion.div
                key={node.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="relative flex items-start gap-3 py-2.5"
              >
                {/* Node dot */}
                <div
                  className="relative z-10 w-[14px] h-[14px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: isFirst ? color : `${color}20`,
                    border: `2px solid ${color}`,
                    boxShadow: isFirst ? `0 0 12px ${color}40` : 'none',
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-black tracking-[0.12em] uppercase"
                      style={{ color: isFirst ? color : `${color}90`, fontFamily: 'var(--font-mono)' }}
                    >
                      {node.label}
                    </span>
                    <span className="text-[9px]" style={{ color: 'var(--alpha-text-25)' }}>
                      {node.timeframe}
                    </span>
                  </div>

                  <p
                    className="text-[12px] font-semibold leading-tight"
                    style={{ color: isFirst ? 'var(--alpha-text-85)' : 'var(--alpha-text-55)' }}
                  >
                    {node.role}
                  </p>

                  <div className="flex items-center gap-3 mt-1">
                    {node.score != null && (
                      <span className="text-[10px] font-bold" style={{ color }}>
                        Risk: {node.score}
                      </span>
                    )}
                    {!isFirst && node.score != null && (
                      <span className="text-[9px]" style={{ color: '#10b981' }}>
                        {currentScore - node.score > 0 ? `−${currentScore - node.score} pts` : ''}
                      </span>
                    )}
                  </div>

                  {node.skillBridge && node.skillBridge.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {node.skillBridge.map(skill => (
                        <span
                          key={skill}
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                          style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.20)' }}
                        >
                          +{skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CareerEvolutionTimeline;
