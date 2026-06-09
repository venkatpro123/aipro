// WhatIfPanel.tsx — Interactive "What would my score be if…" simulator
// Wraps whatIfSimulatorService.computeWhatIf() with twin-aware scenario suggestions.
// Requires an active HybridResult (run an audit first).
import { useState, useMemo, useEffect } from 'react';
import { Sliders, TrendingDown, Info, Zap } from 'lucide-react';
import { useLayoff } from '../../../context/LayoffContext';
import { loadCareerTwin } from '../../../services/careerTwinService';
import { computeWhatIf } from '../../../services/whatIfSimulatorService';
import type { HybridResult } from '../../../types/hybridResult';
import type { ScoreBreakdown } from '../../../services/layoffScoreEngine';
import type { ActiveLever, WhatIfSimulationResult } from '../../../services/whatIfSimulatorService';
import type { CareerTwinState } from '../../../services/careerTwinService';

const ACCENT = '#a78bfa';

const LEVERS: { dimension: string; label: string; description: string }[] = [
  { dimension: 'L5', label: 'Strengthen key relationships', description: 'Performance + manager trust — fastest lever' },
  { dimension: 'D6', label: 'Adopt AI tools in your workflow', description: 'Reduces AI displacement exposure' },
  { dimension: 'L3', label: 'Build high-demand skills', description: 'Directly reduces role displacement risk' },
  { dimension: 'L1', label: 'Move to a healthier company', description: 'Requires a role change — high impact' },
  { dimension: 'L4', label: 'Target a growing industry', description: 'Industry switching — long timeline' },
];

function extractBreakdown(hr: HybridResult): ScoreBreakdown | null {
  const b = (hr as { scoreBreakdown?: ScoreBreakdown }).scoreBreakdown
    ?? (hr as { breakdown?: ScoreBreakdown }).breakdown;
  if (!b) return null;
  if (typeof b.L1 !== 'number') return null;
  return b;
}

function ScoreDeltaBadge({ delta }: { delta: number }) {
  const improved = delta < 0;
  const color = improved ? '#10b981' : delta > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)';
  const label = delta === 0 ? 'No change' : `${improved ? '↓' : '↑'}${Math.abs(delta)} pts`;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 12, fontWeight: 800,
    }}>
      {label}
    </span>
  );
}

export function WhatIfPanel() {
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;
  const [twin, setTwin] = useState<CareerTwinState | null>(null);
  const [activeLeverIds, setActiveLeverIds] = useState<Set<string>>(new Set());
  const [improvements, setImprovements] = useState<Record<string, number>>({});

  useEffect(() => { void loadCareerTwin().then(setTwin); }, []);

  const breakdown = scoreResult ? extractBreakdown(scoreResult) : null;
  const currentScore = scoreResult?.total ?? null;

  const activeLevers: ActiveLever[] = LEVERS
    .filter(l => activeLeverIds.has(l.dimension))
    .map(l => ({
      dimension: l.dimension,
      targetImprovement: improvements[l.dimension] ?? 0.5,
      label: l.label,
    }));

  const simulation: WhatIfSimulationResult | null = useMemo(() => {
    if (!breakdown || currentScore == null || activeLevers.length === 0) return null;
    return computeWhatIf({
      currentScore,
      breakdown,
      activeLevers,
    });
  }, [breakdown, currentScore, activeLevers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Twin-aware scenario suggestions: surface levers most relevant to user goals
  const suggestedLeverId = useMemo(() => {
    if (!twin?.goalsSnapshot?.primaryGoal) return 'L5';
    const goal = twin.goalsSnapshot.primaryGoal.toLowerCase();
    if (goal.includes('ai') || goal.includes('tech')) return 'D6';
    if (goal.includes('skill') || goal.includes('learn')) return 'L3';
    if (goal.includes('promot') || goal.includes('grow')) return 'L5';
    if (goal.includes('new company') || goal.includes('leave')) return 'L1';
    return 'L5';
  }, [twin]);

  const toggleLever = (dim: string) => {
    setActiveLeverIds(prev => {
      const next = new Set(prev);
      if (next.has(dim)) { next.delete(dim); } else { next.add(dim); }
      return next;
    });
  };

  if (!scoreResult || !breakdown) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(167,139,250,0.05)', borderRadius: 16, border: '1px solid rgba(167,139,250,0.15)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Run an audit to unlock What-If</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 340, margin: '0 auto' }}>
          Once you have a risk score, use this panel to explore how specific actions would change your score.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sliders size={15} color={ACCENT} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>What-If Simulator</div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Select actions below to see how they would change your risk score.
          {twin?.twinHealth !== 'sparse' && twin?.goalsSnapshot?.primaryGoal && (
            <span style={{ color: ACCENT }}>
              {' '}Based on your goal: <em>{twin.goalsSnapshot.primaryGoal}</em>
            </span>
          )}
        </div>
      </div>

      {/* Score comparison */}
      <div className="card-premium" style={{ padding: '20px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Current Score</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: currentScore >= 70 ? '#ef4444' : currentScore >= 50 ? '#f97316' : '#10b981', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {currentScore}
          </div>
        </div>
        {simulation && (
          <>
            <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.2)' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Simulated Score</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#10b981', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {simulation.simulatedScore}
              </div>
              <div style={{ marginTop: 8 }}>
                <ScoreDeltaBadge delta={simulation.scoreDelta} />
              </div>
            </div>
          </>
        )}
        {!simulation && (
          <div style={{ flex: 2, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            Select levers below to see your simulated score
          </div>
        )}
      </div>

      {/* Lever selector */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          Select Actions to Simulate
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LEVERS.map(lever => {
            const active = activeLeverIds.has(lever.dimension);
            const isSuggested = lever.dimension === suggestedLeverId && !active;
            return (
              <div
                key={lever.dimension}
                onClick={() => toggleLever(lever.dimension)}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${active ? ACCENT : isSuggested ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  background: active ? 'rgba(167,139,250,0.08)' : isSuggested ? 'rgba(167,139,250,0.04)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                  display: 'flex', gap: 12, alignItems: 'center',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${active ? ACCENT : 'rgba(255,255,255,0.2)'}`,
                  background: active ? ACCENT : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ fontSize: 11, color: '#000', fontWeight: 900 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {lever.label}
                    {isSuggested && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: 'rgba(167,139,250,0.15)', padding: '1px 6px', borderRadius: 10 }}>
                        Suggested for your goal
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{lever.description}</div>
                </div>
                {active && (
                  <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Effort: {Math.round((improvements[lever.dimension] ?? 0.5) * 100)}%</div>
                    <input
                      type="range" min={10} max={100} step={10}
                      value={Math.round((improvements[lever.dimension] ?? 0.5) * 100)}
                      onChange={e => setImprovements(prev => ({ ...prev, [lever.dimension]: parseInt(e.target.value) / 100 }))}
                      style={{ width: 80, accentColor: ACCENT }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulation details */}
      {simulation && (
        <div className="card-premium" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingDown size={15} color="#10b981" />
            Impact Breakdown
          </div>
          {simulation.dimensionImpacts.filter(d => d.pointsReduced > 0).map(d => (
            <div key={d.dimension} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{d.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>−{Math.round(d.pointsReduced)} pts</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <Zap size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Feasibility: {simulation.feasibilityScore}%
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              <Info size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {simulation.estimatedTimeToAchieve}
            </span>
          </div>
          {simulation.d8Gap && simulation.d8Gap > 0 && (
            <div style={{ fontSize: 11, color: 'rgba(249,115,22,0.7)', background: 'rgba(249,115,22,0.06)', borderRadius: 6, padding: '8px 10px' }}>
              ⚠ {Math.round(simulation.d8Gap)} pts from AI efficiency restructuring cannot be reduced by personal actions alone — a company or industry change would be needed.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
