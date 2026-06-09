// AIAmplificationRoadmap — Rule 14: Become AI-augmented, not replaced (Phase 4)
// Shows: AI Readiness Score → role-specific top 5 tools → personalized learning plan.
// "Amplify" framing throughout — never "replacement" language.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, CheckCircle2, BookOpen } from 'lucide-react';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';
import { AI_TOOLS_BY_ROLE, detectRoleFamily, type AITool } from '../../../data/aiToolsByRole';
import {
  computeAILeverageScore,
  getProgressionLadder,
  type AIProgressionLevel,
} from '../../../services/aiAmplificationService';
import { ConfidenceSourceBadge } from '../../shared/ConfidenceSourceBadge';

interface Props {
  scoreResult: HybridResult;
}

const CATEGORY_COLORS = {
  automation:    { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'AUTOMATES'   },
  amplification: { color: 'var(--cyan)', bg: 'rgba(0,245,255,0.07)', label: 'AMPLIFIES' },
  research:      { color: '#a78bfa',  bg: 'rgba(167,139,250,0.08)', label: 'RESEARCH'   },
  creation:      { color: '#f59e0b',  bg: 'rgba(245,158,11,0.08)',  label: 'CREATES'    },
};

const LEVEL_COLOR: Record<AIProgressionLevel, string> = {
  Aware: 'rgba(255,255,255,0.3)',
  Experimenting: '#f59e0b',
  Integrating: 'var(--cyan)',
  Amplified: '#10b981',
};

function ToolCard({ tool, index, checked, onToggle }: {
  tool: AITool;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const catCfg = CATEGORY_COLORS[tool.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: '12px 14px', borderRadius: 10,
        background: checked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${checked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <button
          type="button"
          aria-label={`${checked ? 'Unadopt' : 'Adopt'} ${tool.name}`}
          onClick={onToggle}
          onFocus={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px rgba(16,185,129,0.5)'}
          onBlur={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, marginTop: 2, borderRadius: '50%', outline: 'none' }}
        >
          {checked
            ? <CheckCircle2 size={16} color="#10b981" />
            : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />
          }
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: checked ? '#10b981' : 'var(--text)' }}>
              {index + 1}. {tool.name}
            </span>
            <span style={{
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.06em',
              padding: '1px 6px', borderRadius: 4,
              background: catCfg.bg, color: catCfg.color,
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {catCfg.label}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 5 }}>
            {tool.useCase}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.68rem', color: '#10b981', fontWeight: 700,
            background: 'rgba(16,185,129,0.07)', padding: '1px 7px', borderRadius: 4,
          }}>
            <Zap size={9} />
            {tool.timeImpact}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const LS_ADOPTED_KEY = 'hp.ai.adopted_tools';

function loadAdopted(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_ADOPTED_KEY) ?? '[]') as string[]); }
  catch { return new Set(); }
}
function saveAdopted(s: Set<string>) {
  try { localStorage.setItem(LS_ADOPTED_KEY, JSON.stringify(Array.from(s))); } catch { /* quota */ }
}

export function AIAmplificationRoadmap({ scoreResult }: Props) {
  const { state } = useLayoff();
  const roleTitle = state.roleTitle ?? (scoreResult as any)?.roleTitle ?? '';
  const roleFamily = detectRoleFamily(roleTitle);
  const tools = AI_TOOLS_BY_ROLE[roleFamily] ?? AI_TOOLS_BY_ROLE.default;

  const [adopted, setAdopted] = useState<Set<string>>(loadAdopted);

  function toggleTool(name: string) {
    setAdopted(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      saveAdopted(next);
      return next;
    });
  }

  const adoptedToolNames = tools.filter(t => adopted.has(t.name)).map(t => t.name);
  const ampState = computeAILeverageScore(adoptedToolNames, scoreResult);
  const adjustedScore = ampState.leverageScore;
  const adjustedColor = adjustedScore >= 75 ? '#10b981' : adjustedScore >= 50 ? 'var(--cyan)' : adjustedScore >= 30 ? '#f59e0b' : '#ef4444';
  const ladder = getProgressionLadder();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* AI Leverage Score hero */}
      <div style={{
        padding: '20px 22px', borderRadius: 14,
        background: `${adjustedColor}08`, border: `1px solid ${adjustedColor}25`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
                AI LEVERAGE SCORE
              </span>
              <ConfidenceSourceBadge source="MODELED" size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: '2.5rem', color: adjustedColor, lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                {adjustedScore}
              </span>
              <span style={{
                padding: '3px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                background: `${adjustedColor}18`, color: adjustedColor,
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {ampState.progressionLevel}
              </span>
            </div>
          </div>
          {ampState.adoptedToolCount > 0 && (
            <div style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textAlign: 'center' as const,
            }}>
              <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1rem' }}>{ampState.adoptedToolCount}/{tools.length}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(16,185,129,0.6)', marginTop: 1 }}>tools adopted</div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${adjustedScore}%` }}
            transition={{ duration: 0.7 }}
            style={{ height: '100%', background: adjustedColor, borderRadius: 2 }}
          />
        </div>

        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
          {ampState.nextLevelRequirement}
        </div>
      </div>

      {/* 4-level progression ladder */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 12 }}>
          AMPLIFICATION LADDER
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {ladder.map((step) => {
            const isActive = step.level === ampState.progressionLevel;
            const isPast = ladder.indexOf(step) < ladder.findIndex(l => l.level === ampState.progressionLevel);
            const color = isPast ? '#10b981' : isActive ? LEVEL_COLOR[step.level] : 'rgba(255,255,255,0.2)';
            return (
              <div
                key={step.level}
                title={step.description}
                style={{
                  padding: '8px 6px', borderRadius: 7, textAlign: 'center' as const,
                  background: isActive ? `${color}12` : 'transparent',
                  border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color,
                  margin: '0 auto 5px',
                  boxShadow: isActive ? `0 0 6px ${color}` : 'none',
                }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color, letterSpacing: '0.04em' }}>
                  {step.level}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role context */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
      }}>
        <BookOpen size={12} />
        <span>
          Top AI amplification tools for{' '}
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
            {roleTitle || roleFamily} roles
          </span>
          {' '}— tick each one you've started using:
        </span>
      </div>

      {/* Tool cards — check off as you adopt them */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tools.map((tool, i) => (
          <ToolCard
            key={tool.name}
            tool={tool}
            index={i}
            checked={adopted.has(tool.name)}
            onToggle={() => toggleTool(tool.name)}
          />
        ))}
      </div>

      {/* Next step CTA */}
      <div style={{
        padding: '14px 16px', borderRadius: 10,
        background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)',
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', marginBottom: 6, letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)' }}>
          YOUR AI AMPLIFICATION NEXT STEPS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scoreResult.skillPortfolioFit?.retoolPriority?.slice(0, 3).map((skill, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowRight size={10} color="#a78bfa" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{skill}</span>
            </div>
          )) ?? (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
              Run an audit with your role and skills filled in to get personalized retool priorities.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
