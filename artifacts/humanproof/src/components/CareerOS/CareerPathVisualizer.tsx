// CareerPathVisualizer.tsx — Phase 4 (R9 Career Graph, R15 Five-Year Arc, R16 GPS)
//
// Renders the top escape path as a visual horizontal SVG journey.
// Three nodes max: Current → Waypoint → Target.
// Data comes from hr.escapePaths.paths[0] — no new service needed.
//
// Placed inside FiveYearArcPanel below the Year 1/3/5 milestones.

import { motion } from 'framer-motion';
import { MapPin, Target, Compass } from 'lucide-react';
import { useLayoff } from '../../context/LayoffContext';
import type { HybridResult } from '../../types/hybridResult';
import type { EscapeStep } from '../../services/escapePathOptimizer';

interface PathNode {
  id: string;
  label: string;
  stage: 'current' | 'waypoint' | 'target';
  timelineLabel: string;
}

interface PathEdge {
  fromId: string;
  toId: string;
  actionLabel: string;
  effort: 'Low' | 'Medium' | 'High';
}

const EFFORT_COLORS: Record<string, string> = {
  Low:    '#10b981',
  Medium: '#f59e0b',
  High:   '#ef4444',
};

const STAGE_COLORS: Record<string, string> = {
  current: 'var(--cyan)',
  waypoint: '#a78bfa',
  target:   '#10b981',
};

function NodeIcon({ stage, size = 14 }: { stage: PathNode['stage']; size?: number }) {
  if (stage === 'current') return <MapPin size={size} style={{ color: 'var(--cyan)' }} />;
  if (stage === 'target')  return <Target size={size} style={{ color: '#10b981' }} />;
  return <Compass size={size} style={{ color: '#a78bfa' }} />;
}

export function CareerPathVisualizer() {
  const { state } = useLayoff();
  const hr = state.scoreResult as HybridResult | null;
  if (!hr) return null;

  const topPath = hr.escapePaths?.paths?.[0];
  if (!topPath) return null;

  const roleTitle = (hr as any).roleTitle ?? (hr as any).role ?? 'Your Role';

  // EscapeStep[] — use action string from each step
  const firstStep: EscapeStep | undefined = topPath.steps?.[0];

  // Build the three nodes
  const nodes: PathNode[] = [
    {
      id: 'current',
      label: roleTitle,
      stage: 'current',
      timelineLabel: 'Now',
    },
  ];

  // Waypoint — use first step action as the midpoint label if available
  if (firstStep) {
    nodes.push({
      id: 'waypoint',
      label: firstStep.timeframe,   // e.g. "This week" / "30 days"
      stage: 'waypoint',
      timelineLabel: firstStep.timeframe,
    });
  }

  // Target — escape path title + timeToImpact (already a string like "3–6 months")
  nodes.push({
    id: 'target',
    label: topPath.title,
    stage: 'target',
    timelineLabel: topPath.timeToImpact,
  });

  // Build edges
  const edges: PathEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const step: EscapeStep | undefined = topPath.steps?.[i];
    const actionLabel = step?.action ?? 'Progress toward target';
    const effort: 'Low' | 'Medium' | 'High' = step?.effort ?? topPath.effort ?? 'Medium';
    edges.push({
      fromId: nodes[i].id,
      toId: nodes[i + 1].id,
      actionLabel,
      effort,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      style={{
        marginTop: 18,
        paddingTop: 18,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: 'rgba(16,185,129,0.6)', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          ESCAPE PATH · {topPath.title}
        </span>
      </div>

      {/* Horizontal journey — nodes connected by edges */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 0,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {nodes.map((node, i) => (
          <div key={node.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Node */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, minWidth: 80, maxWidth: 110,
            }}>
              {/* Icon circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `${STAGE_COLORS[node.stage]}18`,
                border: `2px solid ${STAGE_COLORS[node.stage]}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <NodeIcon stage={node.stage} />
              </div>
              {/* Label */}
              <div style={{
                fontSize: '0.7rem', fontWeight: 700,
                color: STAGE_COLORS[node.stage],
                textAlign: 'center', lineHeight: 1.3,
              }}>
                {node.label}
              </div>
              {/* Timeline label */}
              <div style={{
                fontSize: '0.63rem', color: 'rgba(255,255,255,0.25)',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 600,
              }}>
                {node.timelineLabel}
              </div>
            </div>

            {/* Edge (connector) between nodes */}
            {i < nodes.length - 1 && edges[i] && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                flex: 1, minWidth: 60, paddingTop: 14,
              }}>
                {/* Dashed line */}
                <div style={{
                  height: 2, width: '100%',
                  background: `repeating-linear-gradient(90deg, ${EFFORT_COLORS[edges[i].effort]} 0px, ${EFFORT_COLORS[edges[i].effort]} 6px, transparent 6px, transparent 12px)`,
                  borderRadius: 2,
                  marginBottom: 4,
                }} />
                {/* Effort badge */}
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700,
                  color: EFFORT_COLORS[edges[i].effort],
                  background: `${EFFORT_COLORS[edges[i].effort]}15`,
                  border: `1px solid ${EFFORT_COLORS[edges[i].effort]}30`,
                  borderRadius: 4, padding: '1px 5px',
                  fontFamily: 'var(--font-mono, monospace)',
                  whiteSpace: 'nowrap',
                }}>
                  {edges[i].effort} effort
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Potential reduction callout */}
      {topPath.estimatedScoreDrop != null && (
        <div style={{
          marginTop: 12, fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          Potential risk reduction:{' '}
          <span style={{ color: '#10b981', fontWeight: 700 }}>
            −{topPath.estimatedScoreDrop} pts
          </span>
        </div>
      )}
    </motion.div>
  );
}
