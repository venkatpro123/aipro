// ScenarioPlannerPanel — Rule 15: Year 1/3/5 three-path scenario planner (Phase 4)
// Three career paths: Current Trajectory / Adapt / AI Amplification
// Sources: scenarioPlan + careerVelocity + careerResilience from HybridResult.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Minus, TrendingDown, Zap, Rocket, ChevronDown, ChevronRight } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

type PathId = 'current' | 'adapt' | 'amplify';

interface YearSnapshot {
  year: 1 | 3 | 5;
  readiness: number;
  headline: string;
  keyMilestone: string;
}

interface CareerPath {
  id: PathId;
  label: string;
  tagline: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  description: string;
  snapshots: YearSnapshot[];
  requiredActions: string[];
  risk: 'low' | 'medium' | 'high';
}

// ── Path builders ─────────────────────────────────────────────────────────────

function buildCurrentPath(hr: HybridResult): CareerPath {
  const riskScore = hr.total ?? 50;
  const readiness = 100 - riskScore;
  const velocity = hr.careerVelocity?.velocityScore ?? 50;
  const aiScore = hr.dimensions?.find(d => d.key === 'D1')?.score ?? 40;

  // If doing nothing: risk compounds due to AI advancement + no adaptation
  const yr1 = Math.max(10, readiness - 3 + (velocity < 50 ? -5 : 0));
  const yr3 = Math.max(5, yr1 - 8 - Math.round(aiScore * 0.1));
  const yr5 = Math.max(5, yr3 - 10 - Math.round(aiScore * 0.15));

  return {
    id: 'current',
    label: 'Current Trajectory',
    tagline: 'Do nothing different',
    color: riskScore > 60 ? '#ef4444' : '#f59e0b',
    icon: Minus,
    description: 'Projected career health if you continue exactly as-is — no new skills, no action on detected signals.',
    snapshots: [
      { year: 1, readiness: yr1, headline: yr1 >= 60 ? 'Maintaining position' : 'Gradual erosion begins', keyMilestone: 'Peer catch-up accelerates — market moves faster than career' },
      { year: 3, readiness: yr3, headline: yr3 >= 50 ? 'Plateau risk elevated' : 'Significant gap opens', keyMilestone: 'AI-amplified peers command 20–40% compensation premium' },
      { year: 5, readiness: yr5, headline: yr5 >= 40 ? 'Manageable but constrained' : 'Critical career disadvantage', keyMilestone: 'Role commoditization is measurable — options narrow' },
    ],
    requiredActions: ['Nothing — this is the baseline'],
    risk: riskScore > 60 ? 'high' : riskScore > 35 ? 'medium' : 'low',
  };
}

function buildAdaptPath(hr: HybridResult): CareerPath {
  const riskScore = hr.total ?? 50;
  const readiness = 100 - riskScore;
  const scenario = hr.scenarioPlan;

  // Base case: follow the system's recommendations
  const baseScore = scenario?.baseCase?.score ?? riskScore;
  const yr1 = Math.min(95, Math.round(100 - (riskScore * 0.8)));
  const yr3 = Math.min(95, Math.round(100 - (baseScore * 0.65)));
  const yr5 = Math.min(95, yr3 + 8);

  const escapePath = hr.escapePaths?.paths?.[0];
  const targetRole = (escapePath as any)?.targetRole ?? (escapePath as any)?.title ?? 'target role';

  return {
    id: 'adapt',
    label: 'Adaptation Path',
    tagline: 'Follow the weekly missions',
    color: 'var(--cyan)',
    icon: TrendingUp,
    description: "Complete 2–3 recommended actions per month. Address detected risks before they compound. Build skills the market is asking for.",
    snapshots: [
      {
        year: 1,
        readiness: yr1,
        headline: yr1 >= 70 ? 'Strong foundation built' : 'Meaningful improvement',
        keyMilestone: escapePath ? `First steps toward ${targetRole}` : 'Risks addressed, options expanding',
      },
      {
        year: 3,
        readiness: yr3,
        headline: yr3 >= 70 ? 'Clear career optionality' : 'Competitive position',
        keyMilestone: 'Multiple offers available at any time — you choose, not respond',
      },
      {
        year: 5,
        readiness: yr5,
        headline: 'Domain authority + financial optionality',
        keyMilestone: '3+ offers available at any time · 12+ months runway · Known in your field',
      },
    ],
    requiredActions: [
      'Complete weekly mission every week',
      'Run re-audit every 30–60 days',
      scenario?.baseCase?.recommendedActions?.[0] ?? 'Build target skill portfolio',
      'Grow network by 2–3 quality connections/month',
    ],
    risk: 'low',
  };
}

function buildAmplifyPath(hr: HybridResult): CareerPath {
  const riskScore = hr.total ?? 50;
  const scenario = hr.scenarioPlan;
  const aiScore = hr.dimensions?.find(d => d.key === 'D1')?.score ?? 40;

  // Best case: fully AI-augmented + active job market positioning
  const bestScore = scenario?.bestCase?.score ?? Math.max(10, riskScore * 0.5);
  const yr1 = Math.min(95, Math.round(100 - (riskScore * 0.65)));
  const yr3 = Math.min(98, Math.round(100 - (bestScore * 0.5)));
  const yr5 = Math.min(98, yr3 + 5);

  return {
    id: 'amplify',
    label: 'AI Amplification Path',
    tagline: 'Become the AI-augmented version',
    color: '#a78bfa',
    icon: Zap,
    description: 'Adopt top AI tools for your role, build an AI-adjacent skill set, and position yourself as the human decision layer on top of AI systems.',
    snapshots: [
      {
        year: 1,
        readiness: yr1,
        headline: 'AI-native workflows established',
        keyMilestone: `${Math.round(3 + aiScore * 0.05)} AI tools adopted · 2–3× output velocity vs peers`,
      },
      {
        year: 3,
        readiness: yr3,
        headline: 'Recognised AI amplifier in your field',
        keyMilestone: 'Compensation premium 30–50% vs non-AI-augmented peers',
      },
      {
        year: 5,
        readiness: yr5,
        headline: 'Irreplaceable AI-human operator',
        keyMilestone: 'Domain expert + AI orchestration = role AI cannot replicate',
      },
    ],
    requiredActions: [
      'Adopt top 3 AI tools for your role this month',
      'Build visible AI-augmented output (share work, write, speak)',
      scenario?.bestCase?.recommendedActions?.[0] ?? 'Complete an AI certification',
      'Take one "AI + your domain" visible project every quarter',
    ],
    risk: 'low',
  };
}

// ── Readiness arc bar ─────────────────────────────────────────────────────────

function ReadinessArc({ snapshots, color }: { snapshots: YearSnapshot[]; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
      {snapshots.map((s, i) => (
        <div key={s.year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(4, (s.readiness / 100) * 40)}px` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', opacity: 0.7 + i * 0.1 }}
          />
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'var(--font-mono, monospace)' }}>
            Y{s.year}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Path card ─────────────────────────────────────────────────────────────────

function PathCard({ path, isSelected, onSelect }: { path: CareerPath; isSelected: boolean; onSelect: () => void }) {
  const Icon = path.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 12, cursor: 'pointer',
        background: isSelected ? `${path.color}10` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isSelected ? path.color + '40' : 'rgba(255,255,255,0.08)'}`,
        padding: '14px 16px', transition: 'all 0.2s',
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={14} color={path.color} />
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? path.color : 'var(--text)' }}>
          {path.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
          {path.tagline}
        </span>
      </div>

      <ReadinessArc snapshots={path.snapshots} color={path.color} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {path.snapshots.map(s => (
          <div key={s.year} style={{ textAlign: 'center' as const, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: path.color, fontFamily: 'var(--font-mono, monospace)' }}>
              {s.readiness}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)' }}>Year {s.year}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScenarioPlannerPanel({ scoreResult }: Props) {
  const [selected, setSelected] = useState<PathId>('adapt');
  const [showActions, setShowActions] = useState(false);

  const paths: CareerPath[] = [
    buildCurrentPath(scoreResult),
    buildAdaptPath(scoreResult),
    buildAmplifyPath(scoreResult),
  ];

  const selectedPath = paths.find(p => p.id === selected) ?? paths[1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#eab308', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 4 }}>
          CAREER SCENARIO PLANNER
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          Your 3 Career Paths
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Readiness score projections for Year 1, 3, and 5 across three strategies. Select a path to see the detail.
        </div>
      </div>

      {/* Three path cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {paths.map(path => (
          <PathCard
            key={path.id}
            path={path}
            isSelected={selected === path.id}
            onSelect={() => setSelected(path.id)}
          />
        ))}
      </div>

      {/* Detail panel for selected path */}
      <div style={{
        padding: '16px 18px', borderRadius: 12,
        background: `${selectedPath.color}06`,
        border: `1px solid ${selectedPath.color}25`,
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: selectedPath.color, letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 10 }}>
          {selectedPath.label.toUpperCase()} — YEAR BY YEAR
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selectedPath.snapshots.map((s, i) => (
            <div key={s.year} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `${selectedPath.color}15`, border: `1px solid ${selectedPath.color}30`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono, monospace)' }}>Y{s.year}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: selectedPath.color, lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>{s.readiness}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{s.headline}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{s.keyMilestone}</div>
              </div>
              {i < selectedPath.snapshots.length - 1 && (
                <div style={{
                  position: 'absolute', left: 34, height: 14,
                  width: 1, background: 'rgba(255,255,255,0.06)', marginTop: 36,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Required actions */}
        <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowActions(a => !a)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: selectedPath.color, fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.07em', fontFamily: 'var(--font-mono, monospace)',
              padding: 0,
            }}
          >
            <Rocket size={11} />
            WHAT THIS REQUIRES
            {showActions ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
          {showActions && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedPath.requiredActions.map((action, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: `${selectedPath.color}15`, border: `1px solid ${selectedPath.color}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 800, color: selectedPath.color,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
