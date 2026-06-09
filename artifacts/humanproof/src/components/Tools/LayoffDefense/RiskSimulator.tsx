// RiskSimulator.tsx — Phase A: Personalized career decision simulator
// Replaces hardcoded deltas (-18, -12, -8, -10, +15) with actual
// scoreSensitivity.levers computed per-user by scoreSensitivityEngine.
// Each card now shows the real dimension this user should improve,
// the real projected score change, the action timeframe, and a
// provenance label so users understand the basis of each estimate.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HybridResult } from '../../../types/hybridResult';
import type { SensitivityLever } from '../../../services/scoreSensitivityEngine';
import ProvenanceLabel from '../../AuditTabs/common/ProvenanceLabel';
import type { ProvenanceKind } from '../../AuditTabs/common/ProvenanceLabel';
import { recordTwinDecision } from '../../../services/careerTwinService';
import { useAuth } from '../../../context/AuthContext';
import { ScoreExplainerPanel } from '../../shared/ScoreExplainerPanel';

interface Props {
  scoreResult: HybridResult;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PersonalizedScenario {
  id: string;
  title: string;
  description: string;
  projectedScore: number;
  delta: number;
  timeframe: string;
  feasibility: SensitivityLever['feasibility'];
  confidenceKind: ProvenanceKind;
  constraintFlag: string | null;
  synergyNote: string | null;
  color: string;
}

// ─── Confidence mapping ─────────────────────────────────────────────────────────

const CONFIDENCE_TO_PROVENANCE: Record<'High' | 'Medium' | 'Low', ProvenanceKind> = {
  High:   'measured',
  Medium: 'modeled',
  Low:    'estimated',
};

// One accent color per scenario slot (cycles)
const SLOT_COLORS = ['#10b981', 'var(--cyan)', '#a78bfa', '#f59e0b', '#ef4444'];

// ─── Fallback when scoreSensitivity is not yet computed ────────────────────────

const FALLBACK_SCENARIOS: PersonalizedScenario[] = [
  {
    id: 'run-audit',
    title: 'Complete your career audit',
    description: 'Run a full audit to see which specific career moves will most improve your risk score.',
    projectedScore: 50,
    delta: 0,
    timeframe: 'Now',
    feasibility: 'immediate',
    confidenceKind: 'estimated',
    constraintFlag: null,
    synergyNote: null,
    color: 'var(--cyan)',
  },
];

// ─── Pure helpers ───────────────────────────────────────────────────────────────

function deriveConstraintFlag(lever: SensitivityLever, hr: HybridResult): string | null {
  const visaDependent = !!((hr.visaRisk as any)?.isEmployerDependent);
  const runwayCritical = ((hr as any).financialRunwayMonths as number | undefined ?? 6) < 3;
  if (['L1', 'L2', 'D7'].includes(lever.dimension) && visaDependent) {
    return 'Employer change affects visa — plan authorization timeline first';
  }
  if (lever.feasibility === 'medium_term' && runwayCritical) {
    return 'Runway under 3 months — prioritize faster levers first';
  }
  return null;
}

function buildPersonalizedScenarios(hr: HybridResult): PersonalizedScenario[] {
  const sensitivity = hr.scoreSensitivity;
  if (!sensitivity?.levers?.length) return FALLBACK_SCENARIOS;

  return sensitivity.levers.slice(0, 5).map((lever, i) => ({
    id: lever.dimension,
    title: lever.dimensionLabel,
    description: lever.fastestAction,
    projectedScore: Math.max(5, Math.round(hr.total - lever.scoreDropIfImproved)),
    delta: lever.scoreDropIfImproved,
    timeframe: lever.actionTimeframe,
    feasibility: lever.feasibility,
    confidenceKind: CONFIDENCE_TO_PROVENANCE[lever.confidenceInEstimate],
    constraintFlag: deriveConstraintFlag(lever, hr),
    synergyNote: sensitivity.topSynergyCombos
      .find(c => c.levers.includes(lever.dimension as any))
      ?.rationale ?? null,
    color: SLOT_COLORS[i % SLOT_COLORS.length],
  }));
}

// ─── Main component ─────────────────────────────────────────────────────────────

export function RiskSimulator({ scoreResult }: Props) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const currentScore = scoreResult.total ?? 50;
  const scenarios = buildPersonalizedScenarios(scoreResult);
  const hasSensitivity = !!(scoreResult.scoreSensitivity?.levers?.length);

  function handleCardClick(scenario: PersonalizedScenario) {
    const isBecomingActive = activeId !== scenario.id;
    setActiveId(isBecomingActive ? scenario.id : null);

    // Fire-and-forget twin write when user activates a card (not deactivates)
    if (isBecomingActive && user?.id) {
      recordTwinDecision({
        userId: user.id,
        decisionType: 'other',
        notes: `Simulated: ${scenario.title}`,
        decidedAt: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Career Decision Simulator
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          {hasSensitivity
            ? <>Your highest-leverage career moves — ranked by actual impact on your score.
                Current risk: <strong style={{ color: 'var(--cyan)' }}>{Math.round(currentScore)}</strong>
              </>
            : <>Explore how major career moves affect your layoff risk score.
                Current risk: <strong style={{ color: 'var(--cyan)' }}>{Math.round(currentScore)}</strong>
              </>
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 12 }}>
        {scenarios.map((scenario) => {
          const isActive = activeId === scenario.id;
          return (
            <div
              key={scenario.id}
              className="card-premium"
              style={{
                padding: 18, cursor: 'pointer', transition: 'all 0.2s',
                border: isActive ? `1px solid ${scenario.color}` : undefined,
              }}
              onClick={() => handleCardClick(scenario)}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', lineHeight: 1.35 }}>
                  {scenario.title}
                </div>
                <ProvenanceLabel kind={scenario.confidenceKind} size="xs" />
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                {scenario.description.slice(0, 120)}{scenario.description.length > 120 ? '…' : ''}
              </div>

              {/* Score + delta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2, fontFamily: 'var(--font-mono, monospace)' }}>
                    PROJECTED RISK
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: scenario.color }}>
                    {scenario.projectedScore}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2, fontFamily: 'var(--font-mono, monospace)' }}>
                    CHANGE
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>
                    −{scenario.delta} pts
                  </div>
                </div>
              </div>

              {/* Chips row */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.2)',
                  color: 'var(--cyan)', fontFamily: 'var(--font-mono, monospace)',
                }}>
                  ⏱ {scenario.timeframe}
                </span>
                {scenario.constraintFlag && (
                  <span style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b', lineHeight: 1.4,
                  }}>
                    ⚠ {scenario.constraintFlag}
                  </span>
                )}
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      marginTop: 14, paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}>
                      {/* Full action description */}
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 10 }}>
                        {scenario.description}
                      </div>

                      {/* Synergy note */}
                      {scenario.synergyNote && (
                        <div style={{
                          padding: '8px 10px', borderRadius: 7, marginBottom: 10,
                          background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                          fontSize: 11, color: 'rgba(167,139,250,0.85)', lineHeight: 1.5,
                        }}>
                          💡 {scenario.synergyNote}
                        </div>
                      )}

                      {/* Score explainer */}
                      <ScoreExplainerPanel
                        scoreResult={scoreResult}
                        accentColor={scenario.color}
                        title="Score breakdown"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
