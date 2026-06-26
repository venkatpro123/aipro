// SafePivotRolesCard.tsx — v audit UX
//
// Shows the top 3 adjacent roles with risk score deltas from roleAdjacency.
// Answers the critical career question: "Where can I move to reduce my risk?"
//
// Data source: result.roleAdjacency (RoleAdjacencyResult from roleAdjacencyEngine.ts)
// Previously computed but never surfaced in any UI. Added to Protection tab.
//
// Design:
//   - 3 cards, one per adjacent role (1-hop paths first, best 2-hop if <3 adjacent)
//   - Each card shows: role title, score delta, time to pivot, adjacency strength
//   - Colour coded: strong adjacency = emerald, moderate = cyan, weak = amber

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, Clock, Star } from 'lucide-react';

interface AdjacencyNode {
  targetRoleKey: string;
  targetRoleLabel: string;
  estimatedScoreAtTarget: number;
  scoreReduction: number;
  skillBridgeRequired: string[];
  timeToQualifiedWeeks: number;
  marketDemandScore: number;
  adjacencyStrength: 'strong' | 'moderate' | 'weak';
  riskReductionPerWeek: number;
}

interface TwoHopPath {
  bridgeRoleLabel: string;
  destinationRoleLabel: string;
  totalTimeWeeks: number;
  scoreAtDestination: number;
  scoreReduction: number;
  riskReductionPerWeek: number;
}

export interface SafePivotRolesCardProps {
  roleAdjacency: {
    resolvedOracleKey: string;
    adjacentRoles: AdjacencyNode[];
    twoHopPaths: TwoHopPath[];
    recommendedFocusPath: string;
  };
  currentScore: number;
  currentRoleLabel?: string;
}

const STRENGTH_CONFIG = {
  strong:   { color: 'var(--color-emerald-text)', label: 'Strong match', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.22)' },
  moderate: { color: 'var(--color-cyan-text)', label: 'Moderate match', bg: 'rgba(34,211,238,0.07)', border: 'rgba(34,211,238,0.20)' },
  weak:     { color: 'var(--color-amber500-text)', label: 'Stretch pivot', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.20)' },
};

const fmtWeeks = (w: number) =>
  w <= 4  ? `~${w} wks`
  : w <= 16 ? `~${Math.round(w / 4)} mo`
  : `~${Math.round(w / 4)} mo`;

export const SafePivotRolesCard: React.FC<SafePivotRolesCardProps> = ({
  roleAdjacency,
  currentScore,
  currentRoleLabel,
}) => {
  if (!roleAdjacency) return null;

  // Take top 3 adjacent roles sorted by riskReductionPerWeek (best ROI first).
  // Suppress roles with negligible ROI so we never show "saves you 0 pts/week".
  const topRoles = [...(roleAdjacency.adjacentRoles ?? [])]
    .filter(r => (r.riskReductionPerWeek ?? 0) > 0.1)
    .sort((a, b) => b.riskReductionPerWeek - a.riskReductionPerWeek)
    .slice(0, 3);

  if (topRoles.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        borderRadius: 16,
        background: 'var(--alpha-bg-04)',
        border: '1px solid var(--alpha-bg-08)',
        padding: '14px 16px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <TrendingDown size={13} style={{ color: 'var(--color-emerald-text)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-emerald-text)', fontFamily: 'var(--font-mono)' }}>
            Safe Pivot Roles
          </p>
          <p style={{ fontSize: '0.68rem', color: 'var(--alpha-text-45)', marginTop: 1 }}>
            Roles where you can significantly lower your risk
          </p>
        </div>
      </div>

      {/* Role cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topRoles.map((role, i) => {
          const cfg = STRENGTH_CONFIG[role.adjacencyStrength] ?? STRENGTH_CONFIG.moderate;
          const delta = role.scoreReduction;
          const targetScore = role.estimatedScoreAtTarget;

          return (
            <div
              key={role.targetRoleKey}
              style={{
                borderRadius: 12,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                padding: '10px 12px',
              }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i === 0 && (
                      <span title="Best ROI pivot" style={{ display: 'inline-flex', flexShrink: 0 }}><Star size={10} style={{ color: 'var(--color-amber-text)' }} /></span>
                    )}
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--alpha-text-85)', lineHeight: 1.3 }}>
                      {role.targetRoleLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: cfg.color, fontWeight: 600, letterSpacing: '0.06em' }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Score delta chip */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--alpha-text-45)', fontFamily: 'var(--font-mono)' }}>
                      {currentScore}
                    </span>
                    <ArrowRight size={10} style={{ color: 'var(--alpha-text-30)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-emerald-text)', fontFamily: 'var(--font-mono)' }}>
                      {targetScore}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--color-emerald-text)', fontWeight: 700 }}>
                    −{delta} risk pts
                  </span>
                </div>
              </div>

              {/* Metadata row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} style={{ color: 'var(--alpha-text-35)' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--alpha-text-50)' }}>
                    {fmtWeeks(role.timeToQualifiedWeeks)} to pivot
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--alpha-text-35)' }}>
                  {role.riskReductionPerWeek.toFixed(1)} pts/week ROI
                </span>
              </div>

              {/* Skill bridge (top 2 skills needed) */}
              {role.skillBridgeRequired?.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {role.skillBridgeRequired.slice(0, 3).map(skill => (
                    <span
                      key={skill}
                      style={{
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'var(--alpha-bg-06)',
                        color: 'var(--alpha-text-50)',
                        border: '1px solid var(--alpha-bg-08)',
                      }}
                    >
                      +{skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommended path narrative */}
      {roleAdjacency.recommendedFocusPath && (
        <p style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--alpha-text-45)', lineHeight: 1.5, fontStyle: 'italic' }}>
          {roleAdjacency.recommendedFocusPath}
        </p>
      )}
    </motion.div>
  );
};

export default SafePivotRolesCard;
