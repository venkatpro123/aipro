// ScenarioExplorer.tsx — v8.0
//
// CRITICAL BUG FIX: The component previously expected { bearCase, baseCase, bullCase }
// but the engine (scenarioPlanService.ts Layer 50) produces { worstCase, baseCase, bestCase }.
// Field name mismatch → scenarios were blank / showing hardcoded fallbacks for every user.
//
// Additional mismatches fixed:
//   - Engine: ScenarioOutcome.score + ScenarioOutcome.recommendedActions: string[]
//   - UI expected: scoreIn6Months + actions: { title, effort, riskReductionPct }[]
//   - planningHorizonMonths and dominantUncertainty were computed but never surfaced.
//
// The normalizer now handles ALL formats:
//   1. Engine native: { worstCase, baseCase, bestCase } with score + recommendedActions
//   2. Old enriched: { bearCase, baseCase, bullCase } with scoreIn6Months + actions
//   3. Legacy flat: { bear, base, bull } with flat scalar fields

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';

interface ScenarioAction {
  title: string;
  effort?: string;
  riskReductionPct?: number;
}

interface Scenario {
  label: 'Bear' | 'Base' | 'Bull';
  probability: number;
  scoreIn6Months: number;
  keyAssumption: string;
  narrative?: string;
  actions?: ScenarioAction[];
}

interface ScenarioPlanResult {
  // Engine-native fields (scenarioPlanService produces these)
  worstCase?: { score?: number; probability?: number; triggerConditions?: string[]; recommendedActions?: string[]; keyAssumption?: string };
  baseCase?:  { score?: number; probability?: number; triggerConditions?: string[]; recommendedActions?: string[]; keyAssumption?: string; narrative?: string; actions?: ScenarioAction[] };
  bestCase?:  { score?: number; probability?: number; triggerConditions?: string[]; recommendedActions?: string[]; keyAssumption?: string };
  // Enriched UI fields (old path — still supported for backward-compat)
  bearCase?:  { score?: number; scoreIn6Months?: number; probability?: number; narrative?: string; keyAssumption?: string; actions?: ScenarioAction[] };
  bullCase?:  { score?: number; scoreIn6Months?: number; probability?: number; narrative?: string; keyAssumption?: string; actions?: ScenarioAction[] };
  // Legacy flat format
  bear?: { score?: number; probability?: number; narrative?: string; keyAssumption?: string; assumption?: string };
  base?: { score?: number; probability?: number; narrative?: string; keyAssumption?: string; assumption?: string; actions?: ScenarioAction[] };
  bull?: { score?: number; probability?: number; narrative?: string; keyAssumption?: string; assumption?: string };
  // Meta fields — were computed but never shown
  planningHorizonMonths?: number;
  dominantUncertainty?: string;
  scenarioSpread?: number;
}

interface Props {
  scenario: ScenarioPlanResult;
  currentScore: number;
}

type ScenarioKey = 'bear' | 'base' | 'bull';

// Convert any raw scenario object (engine-native, enriched, or legacy) into a
// normalised Scenario for display.
function normalizeScenario(
  raw: any,
  label: 'Bear' | 'Base' | 'Bull',
  defaultProbability: number,
): Scenario | null {
  if (!raw) return null;

  // scoreIn6Months: prefer named scoreIn6Months, then score (engine-native), then fallback
  const scoreIn6Months: number =
    raw.scoreIn6Months ??
    raw.score ??
    (label === 'Bear' ? 65 : label === 'Bull' ? 30 : 50);

  // Probability
  const probability = raw.probability ?? defaultProbability;

  // Key assumption
  const keyAssumption =
    raw.keyAssumption ??
    raw.assumption ??
    (raw.triggerConditions?.[0] ?? '');

  // Narrative: use explicit narrative, or build from triggerConditions
  const narrative =
    raw.narrative ??
    raw.description ??
    (Array.isArray(raw.triggerConditions) && raw.triggerConditions.length > 0
      ? `Key triggers: ${raw.triggerConditions.slice(0, 2).join('; ')}.`
      : '');

  // Actions: support both structured { title, effort, riskReductionPct } and plain string[]
  let actions: ScenarioAction[] = [];
  if (Array.isArray(raw.actions) && raw.actions.length > 0) {
    actions = raw.actions.map((a: any) =>
      typeof a === 'string' ? { title: a } : a,
    );
  } else if (Array.isArray(raw.recommendedActions) && raw.recommendedActions.length > 0) {
    actions = raw.recommendedActions.map((s: string) => ({ title: s }));
  }

  return { label, probability, scoreIn6Months, keyAssumption, narrative, actions };
}

const SCENARIO_CONFIG = {
  bear: { icon: TrendingDown, accent: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.28)', tag: 'BEAR CASE' },
  base: { icon: Minus,        accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)', tag: 'BASE CASE' },
  bull: { icon: TrendingUp,   accent: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.22)', tag: 'BULL CASE' },
};

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

function scoreDeltaLabel(current: number, projected: number): string {
  const diff = projected - current;
  if (Math.abs(diff) <= 2) return '≈ unchanged';
  return diff > 0 ? `+${diff} pts (worsening)` : `${diff} pts (improving)`;
}

export const ScenarioExplorer: React.FC<Props> = ({ scenario, currentScore }) => {
  const [active, setActive] = useState<ScenarioKey>('base');

  // Normalise from ALL three possible formats.
  // Engine-native: worstCase/baseCase/bestCase map to bear/base/bull.
  const scenarios: Record<ScenarioKey, Scenario | null> = {
    bear: normalizeScenario(scenario.bearCase ?? scenario.worstCase ?? scenario.bear, 'Bear', 0.25),
    base: normalizeScenario(scenario.baseCase ?? scenario.base, 'Base', 0.52),
    bull: normalizeScenario(scenario.bullCase ?? scenario.bestCase ?? scenario.bull, 'Bull', 0.23),
  };

  const available = (Object.keys(scenarios) as ScenarioKey[]).filter(k => scenarios[k] !== null);
  if (available.length === 0) return null;

  const activeScenario = scenarios[active];
  const activeCfg = SCENARIO_CONFIG[active];
  const ActiveIcon = activeCfg.icon;

  // Ensure probabilities sum to ~100% — engine may not normalise across the three
  const totalProb = available.reduce((s, k) => s + (scenarios[k]?.probability ?? 0), 0);
  const normalisedProb = (key: ScenarioKey) => {
    const raw = scenarios[key]?.probability ?? 0;
    return totalProb > 0 ? Math.round((raw / totalProb) * 100) : Math.round(raw * 100);
  };

  return (
    <div className="space-y-3">
      {/* Meta: planning horizon + dominant uncertainty — previously never shown */}
      {(scenario.planningHorizonMonths || scenario.dominantUncertainty) && (
        <div className="flex flex-wrap items-center gap-2">
          {scenario.planningHorizonMonths && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--alpha-text-50)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              {scenario.planningHorizonMonths}-month horizon
            </span>
          )}
          {scenario.dominantUncertainty && (
            <p className="text-[10px] flex-1" style={{ color: 'var(--alpha-text-45)' }}>
              <span style={{ color: 'var(--alpha-text-30)' }}>Key variable: </span>
              {scenario.dominantUncertainty}
            </p>
          )}
        </div>
      )}

      {/* Scenario tabs — probabilities now normalised so they sum correctly */}
      <div className="flex gap-2 overflow-x-auto">
        {available.map(key => {
          const s = scenarios[key]!;
          const cfg = SCENARIO_CONFIG[key];
          const isActive = key === active;
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
              style={{
                background: isActive ? cfg.bg : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? cfg.border : 'rgba(255,255,255,0.07)'}`,
                minWidth: 90,
              }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: isActive ? cfg.accent : 'rgba(255,255,255,0.35)' }} />
              <p className="text-[10px] font-black" style={{ color: isActive ? cfg.accent : 'rgba(255,255,255,0.40)' }}>
                {cfg.tag}
              </p>
              <p className="text-[11px] font-black" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}>
                {normalisedProb(key)}%
              </p>
            </button>
          );
        })}
      </div>

      {/* Active scenario content */}
      <AnimatePresence mode="wait">
        {activeScenario && (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.20 }}
          >
            <div
              className="rounded-xl px-4 py-3 mb-2"
              style={{ background: activeCfg.bg, border: `1px solid ${activeCfg.border}` }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ActiveIcon className="w-4 h-4" style={{ color: activeCfg.accent }} />
                  <span className="text-[10px] font-black tracking-widest" style={{ color: activeCfg.accent }}>
                    {activeCfg.tag}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                    Score in {scenario.planningHorizonMonths ?? 6} months
                  </p>
                  <p className="text-[18px] font-black" style={{ color: scoreColor(activeScenario.scoreIn6Months) }}>
                    {activeScenario.scoreIn6Months}
                  </p>
                </div>
              </div>

              {/* Score trajectory with delta label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold" style={{ color: 'var(--alpha-text-45)' }}>{currentScore}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${activeScenario.scoreIn6Months}%`,
                      background: scoreColor(activeScenario.scoreIn6Months),
                    }}
                  />
                </div>
                <span className="text-[11px] font-black" style={{ color: scoreColor(activeScenario.scoreIn6Months) }}>
                  {activeScenario.scoreIn6Months}
                </span>
              </div>
              <p className="text-[10px] mb-2" style={{ color: 'var(--alpha-text-35)' }}>
                {scoreDeltaLabel(currentScore, activeScenario.scoreIn6Months)}
              </p>

              {/* Key assumption */}
              {activeScenario.keyAssumption && (
                <div
                  className="rounded-lg px-2.5 py-2 mb-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--alpha-text-25)' }}>KEY ASSUMPTION</p>
                  <p className="text-[10px]" style={{ color: 'var(--alpha-text-55)' }}>{activeScenario.keyAssumption}</p>
                </div>
              )}

              {/* Narrative */}
              {activeScenario.narrative && (
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--alpha-text-50)' }}>
                  {activeScenario.narrative}
                </p>
              )}
            </div>

            {/* Actions for this scenario */}
            {(activeScenario.actions?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2 px-1" style={{ color: 'var(--alpha-text-25)' }}>
                  RECOMMENDED ACTIONS — {activeCfg.tag}
                </p>
                <div className="space-y-1.5">
                  {activeScenario.actions!.slice(0, 5).map((action, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-[10px] font-black flex-shrink-0 mt-0.5" style={{ color: activeCfg.accent }}>
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                          {action.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {action.effort && (
                            <span className="text-[10px]" style={{ color: 'var(--alpha-text-30)' }}>{action.effort}</span>
                          )}
                          {(action.riskReductionPct ?? 0) > 0 && (
                            <span className="text-[10px]" style={{ color: 'rgba(16,185,129,0.60)' }}>
                              −{action.riskReductionPct}% risk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No actions fallback */}
            {(activeScenario.actions?.length ?? 0) === 0 && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--alpha-text-30)' }} />
                <p className="text-[10px]" style={{ color: 'var(--alpha-text-35)' }}>
                  Scenario-specific actions unavailable — see the action plan for recommended next steps.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioExplorer;
