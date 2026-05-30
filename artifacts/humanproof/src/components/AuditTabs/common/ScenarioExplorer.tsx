// ScenarioExplorer.tsx — Wave 5.4 Interactive Scenario Switching
//
// PROBLEM: scenarioPlan (L50) computes bear/base/bull 6-month scenarios
// with full action queues. UI renders a static narrative. Zero interactivity.
// Users can't explore "what if things get worse?" or "what's my upside?"
//
// SOLUTION: Interactive 3-tab explorer where switching scenarios updates
// both the description AND the recommended action list beneath it.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface ScenarioAction {
  title: string;
  effort?: string;
  riskReductionPct?: number;
}

interface Scenario {
  label: 'Bear' | 'Base' | 'Bull';
  probability: number;         // 0–1
  scoreIn6Months: number;
  keyAssumption: string;
  narrative?: string;
  actions?: ScenarioAction[];
}

interface ScenarioPlanResult {
  bearCase?: Scenario;
  baseCase?: Scenario;
  bullCase?: Scenario;
  // Legacy format — flat properties
  bear?: { score?: number; probability?: number; narrative?: string; keyAssumption?: string };
  base?: { score?: number; probability?: number; narrative?: string; keyAssumption?: string };
  bull?: { score?: number; probability?: number; narrative?: string; keyAssumption?: string };
  actions?: ScenarioAction[];
}

interface Props {
  scenario: ScenarioPlanResult;
  currentScore: number;
}

type ScenarioKey = 'bear' | 'base' | 'bull';

function normalizeScenario(raw: any, label: 'Bear' | 'Base' | 'Bull'): Scenario | null {
  if (!raw) return null;
  return {
    label,
    probability: raw.probability ?? (label === 'Base' ? 0.52 : label === 'Bear' ? 0.23 : 0.25),
    scoreIn6Months: raw.score ?? raw.scoreIn6Months ?? 50,
    keyAssumption: raw.keyAssumption ?? raw.assumption ?? '',
    narrative: raw.narrative ?? raw.description ?? '',
    actions: raw.actions ?? [],
  };
}

const SCENARIO_CONFIG = {
  bear: {
    icon: TrendingDown,
    accent: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.28)',
    tag: 'BEAR CASE',
  },
  base: {
    icon: Minus,
    accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.28)',
    tag: 'BASE CASE',
  },
  bull: {
    icon: TrendingUp,
    accent: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.22)',
    tag: 'BULL CASE',
  },
};

function scoreColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

export const ScenarioExplorer: React.FC<Props> = ({ scenario, currentScore }) => {
  const [active, setActive] = useState<ScenarioKey>('base');

  // Normalize both formats
  const scenarios: Record<ScenarioKey, Scenario | null> = {
    bear: normalizeScenario(scenario.bearCase ?? scenario.bear, 'Bear'),
    base: normalizeScenario(scenario.baseCase ?? scenario.base, 'Base'),
    bull: normalizeScenario(scenario.bullCase ?? scenario.bull, 'Bull'),
  };

  const available = (Object.keys(scenarios) as ScenarioKey[]).filter(k => scenarios[k] !== null);
  if (available.length === 0) return null;

  const activeScenario = scenarios[active];
  const activeCfg = SCENARIO_CONFIG[active];
  const ActiveIcon = activeCfg.icon;

  return (
    <div className="space-y-3">
      {/* Scenario tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {available.map(key => {
          const s = scenarios[key]!;
          const cfg = SCENARIO_CONFIG[key];
          const isActive = key === active;
          const Icon = cfg.icon;
          return (
            <button
              key={key}
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
                {Math.round(s.probability * 100)}%
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
            {/* Scenario header */}
            <div
              className="rounded-xl px-4 py-3 mb-2"
              style={{ background: activeCfg.bg, border: `1px solid ${activeCfg.border}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ActiveIcon className="w-4 h-4" style={{ color: activeCfg.accent }} />
                  <span className="text-[10px] font-black tracking-widest" style={{ color: activeCfg.accent }}>
                    {activeCfg.tag}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Score in 6 months</p>
                  <p className="text-[18px] font-black" style={{ color: scoreColor(activeScenario.scoreIn6Months) }}>
                    {activeScenario.scoreIn6Months}
                  </p>
                </div>
              </div>

              {/* Score trajectory */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.40)' }}>{currentScore}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(activeScenario.scoreIn6Months / 100) * 100}%`,
                      background: scoreColor(activeScenario.scoreIn6Months),
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span className="text-[11px] font-black" style={{ color: scoreColor(activeScenario.scoreIn6Months) }}>
                  {activeScenario.scoreIn6Months}
                </span>
              </div>

              {/* Key assumption */}
              {activeScenario.keyAssumption && (
                <div
                  className="rounded-lg px-2.5 py-2 mb-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>KEY ASSUMPTION</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.60)' }}>{activeScenario.keyAssumption}</p>
                </div>
              )}

              {/* Narrative */}
              {activeScenario.narrative && (
                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {activeScenario.narrative}
                </p>
              )}
            </div>

            {/* Recommended actions for this scenario */}
            {(activeScenario.actions?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-widest mb-2 px-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  RECOMMENDED ACTIONS FOR THIS SCENARIO
                </p>
                <div className="space-y-1.5">
                  {activeScenario.actions!.slice(0, 4).map((action, i) => (
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
                        <div className="flex items-center gap-2 mt-0.5">
                          {action.effort && (
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.32)' }}>{action.effort}</span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioExplorer;
