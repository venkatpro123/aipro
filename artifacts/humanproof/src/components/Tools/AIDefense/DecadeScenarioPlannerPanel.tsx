// DecadeScenarioPlannerPanel.tsx — Phase 9 / P15 (Build For Next Decade)
// Lazy-loaded. Shows 3/5/10-year bear/base/bull risk scenarios + agentic roadmap.
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, ArrowRight } from 'lucide-react';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import {
  computeDecadeScenarios,
  type DecadeScenario,
  type ScenarioPlanInput,
} from '../../../services/scenarioPlanService';
import { ConfidenceSourceBadge } from '../../shared/ConfidenceSourceBadge';

function buildInput(hr: HybridResult): ScenarioPlanInput {
  return {
    currentScore: hr.total ?? 50,
    macroRiskTier: (hr as any).macroRisk?.tier ?? null,
    contagionProbability: hr.peerContagion ? hr.peerContagion.contagionScore / 100 : null,
    primaryCohort: (hr as any).collapseStage?.cohort ?? null,
    freeCashFlowMargin: (hr as any).financialHealth?.freeCashFlowMargin ?? null,
    revenueGrowthYoY: (hr as any).financialHealth?.revenueGrowthYoY ?? null,
    personalizationContext: {},
  };
}

const HORIZON_LABEL = { 3: '3-Year', 5: '5-Year', 10: '10-Year' } as const;
const HORIZON_COLOR = { 3: 'var(--cyan)', 5: '#a78bfa', 10: '#f59e0b' } as const;

function ScenarioCard({ scenario }: { scenario: DecadeScenario }) {
  const label = HORIZON_LABEL[scenario.horizonYears];
  const color = HORIZON_COLOR[scenario.horizonYears];
  const baseScore = scenario.score;
  const bearScore = scenario.worstScore;
  const bullScore = scenario.bestScore;

  const scoreColor = (s: number) =>
    s >= 65 ? '#ef4444' : s >= 40 ? '#f59e0b' : '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: scenario.horizonYears * 0.04 }}
      style={{
        padding: '18px 20px', borderRadius: 12,
        background: `${color}06`,
        border: `1px solid ${color}20`,
      }}
    >
      {/* Horizon header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800,
          background: `${color}15`, color,
          fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.08em',
        }}>
          {label}
        </div>
        <ConfidenceSourceBadge source="MODELED" size="sm" />
      </div>

      {/* Bear / Base / Bull scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Bear', score: bearScore, icon: TrendingDown, prob: scenario.worstProbability },
          { label: 'Base', score: baseScore, icon: Minus, prob: scenario.probability },
          { label: 'Bull', score: bullScore, icon: TrendingUp, prob: scenario.bestProbability },
        ].map(({ label: sLabel, score, icon: Icon, prob }) => (
          <div key={sLabel} style={{
            padding: '10px 8px', borderRadius: 8, textAlign: 'center' as const,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <Icon size={12} color={sLabel === 'Bear' ? '#ef4444' : sLabel === 'Bull' ? '#10b981' : 'rgba(255,255,255,0.4)'} />
            </div>
            <div style={{
              fontSize: '1.3rem', fontWeight: 800, lineHeight: 1,
              color: scoreColor(score),
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {score}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, fontWeight: 700 }}>
              {sLabel}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
              {Math.round(prob * 100)}% prob
            </div>
          </div>
        ))}
      </div>

      {/* Agentic collaboration roadmap */}
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 8 }}>
          AGENTIC ROADMAP
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {scenario.agenticCollaborationRoadmap.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <ArrowRight size={10} style={{ color, flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function DecadeScenarioPlannerPanel() {
  const { state } = useLayoff();
  const hr = state.scoreResult as HybridResult | null;

  const scenarios = useMemo(() => {
    if (!hr) return [];
    return computeDecadeScenarios(buildInput(hr));
  }, [hr]);

  if (!hr) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
        Run your first audit to generate decade scenarios.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 4 }}>
          DECADE SCENARIO PLANNER
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          3, 5 & 10-Year Career Horizons
        </div>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Compounding projections of your current risk trajectory. Bear/base/bull scores reflect macro regime shifts and AI adoption pace. All figures are MODELED — directional, not predictive.
        </div>
      </div>

      {scenarios.map(s => (
        <ScenarioCard key={s.horizonYears} scenario={s} />
      ))}
    </div>
  );
}
