// ═══════════════════════════════════════════════════════════════════════════
// OracleInsightsPanel.tsx — Deep Role Intelligence Panel
//
// Surfaces the full CareerIntelligence record from MASTER_CAREER_INTELLIGENCE
// inside the Layoff Audit result screen. Sections:
//   1. Role header (display name, summary, confidence, tags)
//   2. 5-year risk trend sparkline
//   3. Skill risk matrix (Obsolete / At-Risk / Safe)
//   4. Career transition paths
//   5. Inaction scenario warning
//   6. Seniority profile (risk by experience level)
//   7. Action roadmap (for user's experience bracket)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { CareerIntelligence, SkillRisk, SafeSkill, CareerPath } from '../../data/intelligence/types';
import { DimensionRadar } from '../DimensionRadar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdaptiveSystem } from '../../hooks/useAdaptiveSystem';

// ── Design tokens ─────────────────────────────────────────────────────────
const C = {
  bg1:    'rgba(10,15,25,0.98)',
  bg2:    'var(--alpha-bg-04)',
  bg3:    'var(--alpha-bg-06)',
  border: 'var(--alpha-bg-08)',
  borderHi: 'var(--alpha-bg-08)',
  cyan:   '#00F5FF',
  violet: '#7C3AFF',
  green:  '#10b981',
  amber:  '#f59e0b',
  orange: '#f97316',
  red:    '#ef4444',
  purple: '#a78bfa',
  text:   '#fff',
  text2:  '#9ba5b4',
  text3:  '#6b7280',
  mono:   '"JetBrains Mono","Fira Code",monospace',
};

// ── Prop types ────────────────────────────────────────────────────────────
interface Props {
  intelligence: CareerIntelligence;
  roleKey: string;
  experience?: string; // '0-2' | '2-5' | '5-10' | '10-15' | '15+'
}

// ── Section header ────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    color: C.text3, fontSize: '0.65rem', letterSpacing: '2px',
    textTransform: 'uppercase', fontFamily: C.mono, marginBottom: '12px',
    paddingBottom: '8px', borderBottom: `1px solid ${C.border}`,
  }}>
    {label}
  </div>
);

// ── Reveal on scroll ─────────────────────────────────────────────────────
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

// ── Mini sparkline ────────────────────────────────────────────────────────
const RiskSparkline: React.FC<{
  trend: { year: number; riskScore: number }[];
  threshold?: number;
}> = ({ trend, threshold = 65 }) => {
  if (!trend || trend.length < 2) return null;
  const W = 420, H = 80;
  const PAD = { left: 36, right: 8, top: 10, bottom: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (trend.length - 1)) * cW;
  const toY = (v: number) => PAD.top + cH - (v / 100) * cH;
  const path = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(t.riskScore).toFixed(1)}`).join(' ');
  const threshY = toY(threshold);

  const [gradId] = useState(() => `og-grad-${Math.random().toString(36).slice(2)}`);
  const lastScore = trend[trend.length - 1].riskScore;
  const lineColor = lastScore >= 70 ? C.red : lastScore >= 50 ? C.orange : lastScore >= 30 ? C.amber : C.green;

  const areaPath = [
    ...trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(t.riskScore).toFixed(1)}`),
    `L ${toX(trend.length - 1).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`,
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-label="Risk trend sparkline">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={toY(v)} x2={PAD.left + cW} y2={toY(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fill={C.text3} fontSize="9" fontFamily={C.mono}>{v}</text>
        </g>
      ))}
      <line x1={PAD.left} y1={threshY} x2={PAD.left + cW} y2={threshY} stroke={`${C.red}60`} strokeWidth="1" strokeDasharray="4 3" />
      <text x={PAD.left + cW + 2} y={threshY + 3} fill={C.red} fontSize="8" fontFamily={C.mono} opacity="0.6">65%</text>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {trend.map((t, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(t.riskScore)} r="4" fill={lineColor} />
          <text x={toX(i)} y={H - 4} textAnchor="middle" fill={C.text3} fontSize="9" fontFamily={C.mono}>{t.year}</text>
        </g>
      ))}
    </svg>
  );
};

// ── Skill risk badge ──────────────────────────────────────────────────────
const skillTypeColor = (type: string): string => {
  if (type === 'Automatable') return C.red;
  if (type === 'Augmented')   return C.amber;
  return C.green;
};

const horizonColor = (h: string): string => {
  if (h.includes('1')) return C.orange;
  if (h.includes('2')) return C.amber;
  return C.green;
};

// ── Skill Risk Matrix ─────────────────────────────────────────────────────
const SkillMatrix: React.FC<{ skills: CareerIntelligence['skills'] }> = ({ skills }) => {
  const [activeTab, setActiveTab] = useState<'obsolete' | 'at_risk' | 'safe'>('at_risk');

  const tabs: { key: 'obsolete' | 'at_risk' | 'safe'; label: string; color: string; count: number }[] = [
    { key: 'obsolete', label: '🔴 Obsolete',  color: C.red,   count: skills.obsolete?.length ?? 0 },
    { key: 'at_risk',  label: '🟡 At Risk',   color: C.amber, count: skills.at_risk?.length  ?? 0 },
    { key: 'safe',     label: '🟢 Safe',      color: C.green, count: skills.safe?.length     ?? 0 },
  ];

  const activeColor = tabs.find(t => t.key === activeTab)?.color ?? C.text2;

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: `1px solid ${activeTab === tab.key ? tab.color : C.border}`,
              background: activeTab === tab.key ? `${tab.color}12` : 'transparent',
              color:      activeTab === tab.key ? tab.color : C.text3,
              cursor:     'pointer',
              fontSize:   '0.78rem',
              fontFamily: C.mono,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
            <span style={{
              marginLeft: '6px', background: `${tab.color}22`,
              borderRadius: '10px', padding: '1px 6px',
              fontSize: '0.65rem', fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Active skill list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeTab === 'obsolete' && (skills.obsolete ?? []).map((s, i) => (
          <SkillRiskCard key={i} skill={s} type="obsolete" />
        ))}
        {activeTab === 'at_risk' && (skills.at_risk ?? []).map((s, i) => (
          <SkillRiskCard key={i} skill={s} type="at_risk" />
        ))}
        {activeTab === 'safe' && skills.safe.map((s, i) => (
          <SafeSkillCard key={i} skill={s} />
        ))}
        {(activeTab === 'obsolete' && !skills.obsolete?.length) ||
        (activeTab === 'at_risk'  && !skills.at_risk?.length)  ? (
          <div style={{ color: C.text3, fontSize: '0.82rem', fontStyle: 'italic', padding: '8px 0' }}>
            No skills flagged in this category.
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SkillRiskCard: React.FC<{ skill: SkillRisk; type: 'obsolete' | 'at_risk' }> = ({ skill, type }) => {
  const borderColor = type === 'obsolete' ? C.red : C.amber;
  return (
    <div className="card card-hover" style={{
      background: 'var(--alpha-bg-04)', border: `1px solid ${borderColor}20`,
      borderRadius: '12px', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: C.text, fontWeight: 700, fontSize: '0.9rem' }}>{skill.skill}</span>
        <span className={`badge ${type === 'obsolete' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.6rem' }}>
          {type === 'obsolete' ? 'OBSOLETE' : 'AT RISK'}
        </span>
      </div>
      <p style={{ color: C.text2, fontSize: '0.8rem', lineHeight: 1.5 }}>{skill.reason}</p>
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
        <span className="badge badge-ghost" style={{ fontSize: '0.6rem' }}>{skill.riskType}</span>
        <span className="badge badge-ghost" style={{ fontSize: '0.6rem' }}>{skill.horizon}</span>
        <span className="badge badge-ghost" style={{ fontSize: '0.6rem', color: C.violet }}>{skill.aiTool}</span>
      </div>
    </div>
  );
};

const SafeSkillCard: React.FC<{ skill: SafeSkill }> = ({ skill }) => (
  <div className="card card-hover" style={{
    background: 'rgba(16,185,129,0.03)', border: `1px solid rgba(16,185,129,0.15)`,
    borderRadius: '12px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '8px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: C.text, fontWeight: 700, fontSize: '0.9rem' }}>{skill.skill}</span>
      <span className="badge badge-emerald" style={{ fontSize: '0.6rem' }}>SAFE</span>
    </div>
    <p style={{ color: C.text2, fontSize: '0.8rem', lineHeight: 1.5 }}>{skill.whySafe}</p>
    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
      <span className="badge badge-ghost" style={{ fontSize: '0.6rem' }}>{skill.difficulty}</span>
      <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{skill.longTermValue}% value</span>
    </div>
  </div>
);

// ── Career Path Cards ─────────────────────────────────────────────────────
const difficultyColor = (d: string): string => {
  if (d === 'Easy')      return C.green;
  if (d === 'Medium')    return C.amber;
  if (d === 'Hard')      return C.orange;
  return C.red; // Very Hard
};

const CareerPathCards: React.FC<{ paths: CareerPath[] }> = ({ paths }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {paths.map((p, i) => {
      const dc = difficultyColor(p.transitionDifficulty);
      return (
        <div key={i} style={{
          background: C.bg2, border: `1px solid ${C.border}`,
          borderRadius: '10px', padding: '14px 16px',
          display: 'grid', gridTemplateColumns: '1fr auto',
          gap: '10px', alignItems: 'start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: C.text, fontWeight: 700, fontSize: '0.92rem' }}>→ {p.role}</span>
              <span style={{
                background: `${dc}15`, color: dc, borderRadius: '4px',
                padding: '2px 7px', fontSize: '0.62rem', fontFamily: C.mono,
              }}>
                {p.transitionDifficulty}
              </span>
            </div>
            <div style={{ color: C.text2, fontSize: '0.78rem', marginBottom: '4px' }}>
              <strong style={{ color: C.text3 }}>Skill gap: </strong>{p.skillGap}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
              {p.industryMapping?.map(ind => (
                <span key={ind} style={{ fontSize: '0.65rem', color: C.text3, background: C.bg3, borderRadius: '4px', padding: '2px 6px' }}>
                  {ind}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{
              background: `${C.green}15`, border: `1px solid ${C.green}30`,
              borderRadius: '6px', padding: '4px 10px',
              color: C.green, fontSize: '0.78rem', fontWeight: 700, fontFamily: C.mono,
              whiteSpace: 'nowrap',
            }}>
              -{p.riskReduction}% risk
            </div>
            <div style={{ color: C.amber, fontSize: '0.7rem', fontFamily: C.mono, whiteSpace: 'nowrap' }}>
              {p.salaryDelta}
            </div>
            <div style={{ color: C.text3, fontSize: '0.65rem', fontFamily: C.mono, whiteSpace: 'nowrap' }}>
              ⏱ {p.timeToTransition}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── Seniority Profile Table ──────────────────────────────────────────────
const SeniorityTable: React.FC<{
  seniority: NonNullable<CareerIntelligence['seniority']>;
  experience?: string;
}> = ({ seniority, experience }) => {
  const expToLevel: Record<string, string> = {
    '0-2': 'entry', '2-5': 'mid', '5-10': 'senior', '10-15': 'principal', '15+': 'executive',
  };
  const userLevel = expToLevel[experience || '5-10'] || 'mid';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {seniority.map((band) => {
        const isUser = band.level === userLevel;
        const deltaColor = band.riskDelta > 0 ? C.red : band.riskDelta < 0 ? C.green : C.text3;
        return (
          <div key={band.level} style={{
            background: isUser ? 'rgba(0,245,255,0.05)' : C.bg2,
            border: `1px solid ${isUser ? C.cyan + '40' : C.border}`,
            borderRadius: '8px', padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {isUser && (
                <span style={{ fontSize: '0.62rem', background: `${C.cyan}20`, color: C.cyan, borderRadius: '4px', padding: '2px 6px', fontFamily: C.mono }}>
                  YOU
                </span>
              )}
              <div>
                <span style={{ color: isUser ? C.text : C.text2, fontWeight: isUser ? 700 : 400, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  {band.level}
                </span>
                <span style={{ color: C.text3, fontSize: '0.72rem', marginLeft: '8px', fontFamily: C.mono }}>
                  {band.typicalYearsExp} yrs
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ color: deltaColor, fontFamily: C.mono, fontSize: '0.78rem', fontWeight: 700 }}>
                {band.riskDelta > 0 ? '+' : ''}{band.riskDelta}%
              </span>
              <span style={{ color: C.text3, fontSize: '0.7rem' }}>{band.salaryBand}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Roadmap phase ─────────────────────────────────────────────────────────
const RoadmapPhaseCard: React.FC<{
  phase: any;
  label: string;
  color: string;
  isLast?: boolean;
}> = ({ phase, label, color, isLast }) => (
  <div style={{ position: 'relative', paddingLeft: '32px', marginBottom: isLast ? 0 : '40px' }}>
    {/* Connector Line */}
    {!isLast && (
      <div style={{ 
        position: 'absolute', left: '10px', top: '24px', bottom: '-40px', 
        width: '2px', background: `linear-gradient(to bottom, ${color}, transparent)` 
      }} />
    )}
    {/* Dot */}
    <div style={{ 
      position: 'absolute', left: '0', top: '0', width: '22px', height: '22px', 
      borderRadius: '50%', background: C.bg1, border: `3px solid ${color}`,
      boxShadow: `0 0 10px ${color}40`, zIndex: 1
    }} />

    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}: {phase.focus}
        </h4>
        <div className="badge badge-ghost">{phase.timeline}</div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {phase.actions.map((action: any, i: number) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ marginTop: '4px', width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '4px' }}>{action.action}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{action.why}</p>
              {action.outcome && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  → PREDICTED OUTCOME: {action.outcome}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────
export const OracleInsightsPanel: React.FC<Props> = ({
  intelligence,
  roleKey,
  experience = '5-10',
}) => {
  const { ref, visible } = useReveal();
  const { width, isTouch, scaleFactor } = useAdaptiveSystem();
  const [expandedSections, setExpandedSections] = useState({
    skills: true,
    paths: true,
    inaction: true,
    seniority: false,
    roadmap: false,
  });

  const toggle = (key: keyof typeof expandedSections) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Pick roadmap for the user's experience bracket
  const roadmapBracket = (
    intelligence.roadmap?.[experience as keyof typeof intelligence.roadmap] ||
    intelligence.roadmap?.['2-5'] ||
    intelligence.roadmap?.['0-2']
  );

  const scoreColor = intelligence.confidenceScore && intelligence.confidenceScore >= 95
    ? C.green : intelligence.confidenceScore && intelligence.confidenceScore >= 85 ? C.amber : C.orange;

  const SectionToggle: React.FC<{ label: string; k: keyof typeof expandedSections; accent?: string }> = ({
    label, k, accent = C.cyan
  }) => (
    <button
      onClick={() => toggle(k)}
      style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: expandedSections[k] ? '14px' : '0',
        paddingBottom: '10px', borderBottom: `1px solid ${C.border}`,
        width: '100%', color: C.text2, fontSize: '0.72rem', letterSpacing: '1.5px',
        textTransform: 'uppercase', fontFamily: C.mono,
      }}
    >
      <span>{label}</span>
      <span style={{ color: accent, fontSize: '0.9rem', lineHeight: 1 }}>
        {expandedSections[k] ? '−' : '+'}
      </span>
    </button>
  );

  return (
    <div
      ref={ref}
      style={{
        marginTop: 'var(--space-8)',
        marginBottom: 'var(--space-8)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        containerType: 'inline-size',
        containerName: 'oracle-panel',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        background: C.bg1, border: `1px solid ${C.violet}30`,
        borderRadius: '12px 12px 0 0', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '4px', height: '36px', background: C.violet, borderRadius: '2px' }} />
          <div>
            <div style={{ color: C.text3, fontSize: '0.62rem', letterSpacing: '2px', fontFamily: C.mono, marginBottom: '3px' }}>
              ORACLE ENGINE · DEEP ROLE INTELLIGENCE
            </div>
            <div style={{ color: C.text, fontSize: '1.1rem', fontWeight: 700 }}>
              {intelligence.displayRole}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{
            background: `${scoreColor}15`, border: `1px solid ${scoreColor}35`,
            borderRadius: '6px', padding: '3px 10px',
            color: scoreColor, fontSize: '0.8rem', fontWeight: 700, fontFamily: C.mono,
          }}>
            {intelligence.confidenceScore ?? '—'}% confidence
          </div>
          {intelligence.evolutionHorizon && (
            <div style={{ color: C.text3, fontSize: '0.6rem', fontFamily: C.mono }}>
              Re-assess: {intelligence.evolutionHorizon}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        background: 'rgba(10,15,25,0.9)', border: `1px solid ${C.violet}18`,
        borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '24px',
      }}>
        {/* Summary & Radar Section */}
        <div className="oracle-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginBottom: '32px' }}>
          <div>
            <SectionLabel label="Displacement Analysis" />
            <p style={{ margin: '0 0 20px', color: C.text, fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6 }}>
              {intelligence.summary}
            </p>
            {/* Context tags */}
            {intelligence.contextTags && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {intelligence.contextTags.map(tag => (
                  <span key={tag} className="badge badge-indigo">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: 'var(--alpha-bg-04)', borderRadius: '20px', padding: '24px', border: '1px solid var(--border)' }}>
             <DimensionRadar 
               dimensions={[
                 { key: 'automation', label: 'Automation', score: intelligence.skills.obsolete?.length ? 85 : 40 },
                 { key: 'augmentation', label: 'Augmentation', score: intelligence.skills.at_risk?.length ? 70 : 30 },
                 { key: 'longevity', label: 'Longevity', score: intelligence.skills.safe?.length ? (intelligence.skills.safe.length * 10) : 50 },
                 { key: 'transition', label: 'Transition', score: intelligence.careerPaths?.length ? 60 : 20 },
                 { key: 'demand', label: 'Demand', score: intelligence.seniority?.find(l => l.level === 'mid')?.riskDelta ?? 50 },
                 { key: 'oversupply', label: 'Oversupply', score: 45 }
               ]}
               size={280}
             />
          </div>
        </div>

        {/* Seeded risk trend */}
        {intelligence.riskTrend && intelligence.riskTrend.length >= 2 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel label="Seeded Risk Trend (Oracle Data)" />
            <div style={{
              background: C.bg2, border: `1px solid ${C.border}`,
              borderRadius: '10px', padding: '16px 12px 8px', overflowX: 'auto',
            }}>
              <RiskSparkline trend={intelligence.riskTrend} />
            </div>
          </div>
        )}

        {/* ── Skill Risk Matrix ── */}
        <div style={{ marginBottom: '24px' }}>
          <SectionToggle label="Skill Risk Matrix" k="skills" accent={C.amber} />
          {expandedSections.skills && (
            <SkillMatrix skills={intelligence.skills} />
          )}
        </div>

        {/* ── Career Transition Paths ── */}
        {intelligence.careerPaths && intelligence.careerPaths.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionToggle label="Career Transition Paths" k="paths" accent={C.green} />
            {expandedSections.paths && (
              <CareerPathCards paths={intelligence.careerPaths} />
            )}
          </div>
        )}

        {/* ── Inaction Scenario ── */}
        {intelligence.inactionScenario && (
          <div style={{ marginBottom: '24px' }}>
            <SectionToggle label="Inaction Scenario — What Happens If You Do Nothing" k="inaction" accent={C.red} />
            {expandedSections.inaction && (
              <div style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                borderLeft: `3px solid ${C.red}`, borderRadius: '8px', padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
                  <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.86rem', lineHeight: 1.7 }}>
                    {intelligence.inactionScenario}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Seniority Profile ── */}
        {intelligence.seniority && intelligence.seniority.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionToggle label="Risk by Seniority Level" k="seniority" accent={C.cyan} />
            {expandedSections.seniority && (
              <SeniorityTable seniority={intelligence.seniority} experience={experience} />
            )}
          </div>
        )}

        {/* ── Action Roadmap ── */}
        {roadmapBracket && (
          <div style={{ marginBottom: '8px' }}>
            <SectionToggle label={`Strategic Action Roadmap — ${experience}`} k="roadmap" accent={C.violet} />
            {expandedSections.roadmap && (
              <div style={{ padding: '20px 0' }}>
                {roadmapBracket.phase_1 && (
                  <RoadmapPhaseCard phase={roadmapBracket.phase_1} label="Stabilize" color={C.cyan} />
                )}
                {roadmapBracket.phase_2 && (
                  <RoadmapPhaseCard phase={roadmapBracket.phase_2} label="Amplify" color={C.violet} />
                )}
                {roadmapBracket.phase_3 && (
                  <RoadmapPhaseCard phase={roadmapBracket.phase_3} label="Transition" color={C.amber} isLast />
                )}
              </div>
            )}
          </div>
        )}

      <style>{`
        @container oracle-panel (max-width: 600px) {
          .oracle-grid { grid-template-columns: 1fr !important; }
          .adaptive-hide { display: none; }
        }
        @container oracle-panel (min-width: 900px) {
          .oracle-grid { grid-template-columns: 1fr 340px !important; }
        }
      `}</style>
      {/* Footnote */}
      <div style={{
        marginTop: '20px', paddingTop: '14px', borderTop: `1px solid ${C.border}`,
        color: C.text3, fontSize: '0.68rem', fontFamily: C.mono, textAlign: 'center', lineHeight: 1.6,
      }}>
          Source: Risk Oracle Engine · MASTER_CAREER_INTELLIGENCE v4.0 · WEF Future of Jobs 2025
          {intelligence.evolutionHorizon && ` · Data valid until ${intelligence.evolutionHorizon}`}
        </div>
      </div>
    </div>
  );
};
