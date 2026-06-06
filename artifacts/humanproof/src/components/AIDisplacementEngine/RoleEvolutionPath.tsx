// RoleEvolutionPath — §6 Future Role Evolution
// Multi-stage career evolution rail with country time-shift, experience-aware framing,
// four path type views, and per-node metadata (demand, salary, resistance, difficulty).

import React, { useState } from 'react';
import type { CareerIntelligence } from '../../data/intelligence/types';
import type { RoleEvolutionNode } from '../../data/automationTimelineData';
import { COUNTRY_RISK_PROFILES } from '../../data/countryRiskProfile';

interface Props {
  roleKey: string;
  roleLabel: string;
  intel: CareerIntelligence | null;
  scoreColor: string;
  evolutionPath?: RoleEvolutionNode[];
  countryKey?: string;
  experience?: string;
  d7Score?: number;
}

type PathType = 'natural' | 'adjacent' | 'highUpside' | 'safest';

const NODE_COLORS = ['var(--emerald)', 'var(--cyan)', 'var(--amber)', 'var(--violet)'];

const NODE_TYPE_LABELS: Record<string, string> = {
  current:     'TODAY',
  augmented:   '~2026–2027',
  specialized: '~2028–2030',
  transformed: '~2031–2032+',
};

const DEMAND_COLORS: Record<string, string> = { Rising: 'var(--emerald)', Stable: 'var(--cyan)', Declining: 'var(--red)' };
const RESIST_COLORS: Record<string, string> = { High: 'var(--emerald)', Moderate: 'var(--amber)', Low: 'var(--red)' };
const DIFF_COLORS:   Record<string, string> = { Easy: 'var(--emerald)', Moderate: 'var(--amber)', Hard: 'var(--red)' };
const CONF_COLORS:   Record<string, string> = { High: 'var(--emerald)', Medium: 'var(--amber)', Speculative: 'var(--text-3)' };

function parseYearRange(timeframe: string): [number, number] | null {
  const m = timeframe.match(/(\d{4})[–\-](\d{4})/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  const s = timeframe.match(/(\d{4})\+/);
  if (s) return [parseInt(s[1]), parseInt(s[1]) + 2];
  return null;
}

function shiftTimeframe(base: string, adoptionSpeed: number): string {
  const lagYears = Math.round((0.92 - adoptionSpeed) * 5); // 0-2 years
  if (lagYears <= 0) return base;
  const range = parseYearRange(base);
  if (!range) return base;
  const [a, b] = range;
  if (base.includes('+')) return `~${a + lagYears}+`;
  return `~${a + lagYears}–${b + lagYears}`;
}

function getAdoptionSpeed(countryKey: string): number {
  return COUNTRY_RISK_PROFILES[countryKey]?.aiAdoptionSpeed ?? 0.92;
}

function buildNaturalPath(
  roleKey: string,
  roleLabel: string,
  intel: CareerIntelligence | null,
  seededPath: RoleEvolutionNode[] | undefined,
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  let nodes: RoleEvolutionNode[];
  if (seededPath && seededPath.length >= 2) {
    nodes = seededPath;
  } else if (intel?.careerPaths && intel.careerPaths.length >= 1) {
    const paths = intel.careerPaths.slice(0, 3);
    nodes = [
      { label: intel.displayRole || roleLabel, timeframe: 'Now', type: 'current' },
      ...paths.map((p, i) => ({
        label: p.role,
        timeframe: i === 0 ? '~2026–2027' : i === 1 ? '~2028–2030' : '~2031–2032+',
        type: (['augmented', 'specialized', 'transformed'] as const)[i] ?? 'transformed',
      })),
    ];
  } else {
    const clean = roleLabel || 'Your Role';
    nodes = [
      { label: clean,                          timeframe: 'Now',        type: 'current' },
      { label: `AI-Augmented ${clean}`,        timeframe: '~2026–2027', type: 'augmented' },
      { label: `${clean} Specialist`,          timeframe: '~2028–2030', type: 'specialized' },
      { label: 'AI Systems Coordinator',       timeframe: '~2031–2032+', type: 'transformed' },
    ];
  }
  return nodes.slice(0, 4).map((n, i) =>
    i === 0 ? n : { ...n, timeframe: shiftTimeframe(n.timeframe, adoptionSpeed) }
  );
}

function buildAdjacentPath(
  roleLabel: string,
  intel: CareerIntelligence | null,
  natural: RoleEvolutionNode[],
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  const paths = intel?.careerPaths ?? [];
  const stage3 = paths[1]?.role ?? `${roleLabel} Team Lead`;
  const stage4 = paths[2]?.role ?? 'Cross-Functional Product Lead';
  return [
    natural[0],
    natural[1] ?? { label: `AI-Augmented ${roleLabel}`, timeframe: shiftTimeframe('~2026–2027', adoptionSpeed), type: 'augmented' },
    { label: stage3, timeframe: shiftTimeframe('~2028–2030', adoptionSpeed), type: 'specialized' },
    { label: stage4, timeframe: shiftTimeframe('~2031–2032+', adoptionSpeed), type: 'transformed' },
  ];
}

function buildHighUpsidePath(
  roleLabel: string,
  intel: CareerIntelligence | null,
  natural: RoleEvolutionNode[],
  d7Score: number,
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  const rl = roleLabel.toLowerCase();
  let stage4Label = 'AI Product Director';
  if (rl.includes('data') || rl.includes('analyt'))  stage4Label = 'AI Data Strategy Lead';
  if (rl.includes('finance') || rl.includes('invest')) stage4Label = 'AI Finance Director';
  if (rl.includes('nurse') || rl.includes('health'))  stage4Label = 'Clinical AI Integration Lead';
  if (rl.includes('legal') || rl.includes('law'))    stage4Label = 'Legal Intelligence Director';
  if (rl.includes('market') || rl.includes('content')) stage4Label = 'AI Marketing Architect';
  if (rl.includes('security') || rl.includes('soc'))  stage4Label = 'Threat Intelligence Strategy Lead';
  const stage3 = intel?.careerPaths?.[0]?.role ?? `${roleLabel} Specialist`;
  return [
    natural[0],
    { label: `AI Tool Power User — ${roleLabel}`, timeframe: shiftTimeframe('~2026–2027', adoptionSpeed), type: 'augmented' },
    { label: stage3, timeframe: shiftTimeframe('~2028–2030', adoptionSpeed), type: 'specialized', demandOutlook: 'Rising', aiResistance: 'High', transitionDifficulty: 'Moderate', confidence: 'Medium' },
    { label: stage4Label, timeframe: shiftTimeframe('~2031–2032+', adoptionSpeed), type: 'transformed', demandOutlook: 'Rising', salaryPotential: '↑ 80–150% vs current', aiResistance: 'High', transitionDifficulty: 'Hard', confidence: 'Speculative' },
  ];
}

function buildSafestPath(
  roleLabel: string,
  intel: CareerIntelligence | null,
  natural: RoleEvolutionNode[],
  adoptionSpeed: number,
): RoleEvolutionNode[] {
  const rl = roleLabel.toLowerCase();
  let safestStage3 = 'Client-Facing Domain Expert';
  let safestStage4 = 'Human Relationship & Trust Lead';
  if (rl.includes('data'))    { safestStage3 = 'Data Governance Specialist'; safestStage4 = 'Data Quality & Compliance Lead'; }
  if (rl.includes('finance')) { safestStage3 = 'Strategic Advisory Specialist'; safestStage4 = 'Investment Relationship Manager'; }
  if (rl.includes('nurse'))   { safestStage3 = 'Advanced Practice Nurse'; safestStage4 = 'Palliative & Complex Care Specialist'; }
  if (rl.includes('security')){ safestStage3 = 'Security Awareness & Culture Lead'; safestStage4 = 'Enterprise Risk Governance Lead'; }
  return [
    natural[0],
    { ...natural[1] ?? { label: `AI-Assisted ${roleLabel}`, timeframe: shiftTimeframe('~2026–2027', adoptionSpeed), type: 'augmented' }, label: `AI-Assisted ${roleLabel}` },
    { label: safestStage3, timeframe: shiftTimeframe('~2028–2030', adoptionSpeed), type: 'specialized', demandOutlook: 'Stable', aiResistance: 'High', transitionDifficulty: 'Moderate', confidence: 'Medium' },
    { label: safestStage4,  timeframe: shiftTimeframe('~2031–2032+', adoptionSpeed), type: 'transformed', demandOutlook: 'Stable', aiResistance: 'High', transitionDifficulty: 'Hard', confidence: 'Speculative' },
  ];
}

function getExpTierBanner(experience: string): { text: string; color: string } | null {
  if (experience === '0-2') return { text: 'Early career — high flexibility window. Invest in AI-augmented skills before 2027 to stay ahead of the transition curve.', color: 'var(--amber)' };
  if (experience === '20+') return { text: '20+ years — institutional moat. Your Stage 1→2 transition is slower than peers; focus energy on Stage 3 positioning while your domain authority is highest.', color: 'var(--emerald)' };
  return null;
}

const PATH_TABS: { key: PathType; label: string; desc: string }[] = [
  { key: 'natural',    label: 'Natural Path',     desc: 'Most probable evolution based on role trajectory research' },
  { key: 'adjacent',   label: 'Adjacent Path',    desc: 'Lateral move to a closely related role family with lower AI risk' },
  { key: 'highUpside', label: 'High-Upside Path', desc: 'AI leadership trajectory — highest reward, requires active positioning' },
  { key: 'safest',     label: 'Safest Path',      desc: 'Human-essential specialization — lower upside, highest structural protection' },
];

export const RoleEvolutionPath: React.FC<Props> = ({
  roleKey, roleLabel, intel, scoreColor, evolutionPath,
  countryKey = 'usa', experience = '5-10', d7Score = 55,
}) => {
  const [activePathType, setActivePathType] = useState<PathType>('natural');
  const adoptionSpeed = getAdoptionSpeed(countryKey);
  const countryProfile = COUNTRY_RISK_PROFILES[countryKey];

  const naturalNodes = buildNaturalPath(roleKey, roleLabel, intel, evolutionPath, adoptionSpeed);
  const pathNodes: Record<PathType, RoleEvolutionNode[]> = {
    natural:    naturalNodes,
    adjacent:   buildAdjacentPath(roleLabel, intel, naturalNodes, adoptionSpeed),
    highUpside: buildHighUpsidePath(roleLabel, intel, naturalNodes, d7Score, adoptionSpeed),
    safest:     buildSafestPath(roleLabel, intel, naturalNodes, adoptionSpeed),
  };
  const nodes = pathNodes[activePathType];
  const expBanner = getExpTierBanner(experience);

  const lagYears = Math.round((0.92 - adoptionSpeed) * 5);

  return (
    <div style={{ marginTop: '28px' }}>
      <h3 className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>FUTURE ROLE EVOLUTION</h3>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.5 }}>
        How this role transforms as agentic AI matures. Each stage represents a structural shift in what the work requires.
        {lagYears > 0 && (
          <span style={{ color: 'var(--amber)' }}> Timelines shifted ~{lagYears} year{lagYears > 1 ? 's' : ''} for {countryProfile?.label ?? countryKey} adoption pace.</span>
        )}
      </p>

      {/* Experience banner */}
      {expBanner && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
          background: `${expBanner.color}08`, border: `1px solid ${expBanner.color}25`,
          borderLeft: `3px solid ${expBanner.color}`,
          fontSize: '0.7rem', color: expBanner.color, lineHeight: 1.55,
        }}>
          {expBanner.text}
        </div>
      )}

      {/* Path type tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '20px' }}>
        {PATH_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActivePathType(key)}
            style={{
              padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer',
              background: activePathType === key ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: activePathType === key ? 'var(--text)' : 'var(--text-3)',
              fontWeight: activePathType === key ? 700 : 500,
              fontSize: '0.68rem', transition: 'all 0.15s ease',
              outline: activePathType === key ? '1px solid rgba(255,255,255,0.15)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Path description */}
      <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: '20px', fontStyle: 'italic' }}>
        {PATH_TABS.find(p => p.key === activePathType)?.desc}
      </p>

      {/* Desktop: horizontal rail */}
      <div style={{ position: 'relative', paddingBottom: '8px' }}>
        {/* Connector line */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: `${100 / (nodes.length * 2)}%`,
          right: `${100 / (nodes.length * 2)}%`,
          height: '2px',
          background: 'linear-gradient(90deg, var(--emerald)40, var(--cyan)40, var(--amber)40, var(--violet)40)',
          zIndex: 0,
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${nodes.length}, 1fr)`,
          gap: '8px',
          position: 'relative',
          zIndex: 1,
        }}>
          {nodes.map((node, i) => {
            const color = NODE_COLORS[i] ?? 'var(--text-3)';
            const isFirst = i === 0;
            const hasMetadata = !!(node.demandOutlook || node.salaryPotential || node.aiResistance || node.transitionDifficulty);
            return (
              <div key={`${node.type}-${node.label}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Node circle */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `${color}18`,
                  border: `2px solid ${color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px', flexShrink: 0,
                  boxShadow: isFirst ? `0 0 16px ${color}40` : `0 0 6px ${color}22`,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>
                    {i === 0 ? '📍' : i === 1 ? '🔄' : i === 2 ? '⬆️' : '🚀'}
                  </span>
                </div>

                {/* Timeframe badge */}
                <div style={{
                  padding: '2px 8px', borderRadius: '4px', marginBottom: '6px',
                  background: `${color}15`, border: `1px solid ${color}35`,
                  fontSize: '0.58rem', color, fontWeight: 800,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                }}>
                  {isFirst ? 'TODAY' : (node.timeframe || NODE_TYPE_LABELS[node.type] || node.timeframe)}
                </div>

                {/* Role label */}
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: isFirst ? 700 : 500,
                  color: isFirst ? 'var(--text)' : 'var(--text-2)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: '130px',
                  marginBottom: '6px',
                }}>
                  {node.label}
                </div>

                {isFirst && (
                  <div style={{
                    padding: '2px 8px', borderRadius: '4px', marginBottom: '6px',
                    background: `${color}18`, border: `1px solid ${color}35`,
                    fontSize: '0.58rem', color, fontFamily: 'var(--font-mono)', fontWeight: 800,
                  }}>
                    CURRENT
                  </div>
                )}

                {/* Metadata chips */}
                {hasMetadata && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', marginTop: '4px' }}>
                    {node.demandOutlook && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${DEMAND_COLORS[node.demandOutlook]}14`, border: `1px solid ${DEMAND_COLORS[node.demandOutlook]}30`, fontSize: '0.54rem', fontWeight: 800, color: DEMAND_COLORS[node.demandOutlook], fontFamily: 'var(--font-mono)' }}>
                        {node.demandOutlook === 'Rising' ? '↑' : node.demandOutlook === 'Declining' ? '↓' : '→'} {node.demandOutlook}
                      </span>
                    )}
                    {node.salaryPotential && (
                      <span style={{ fontSize: '0.58rem', color: 'var(--emerald)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {node.salaryPotential}
                      </span>
                    )}
                    {node.aiResistance && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${RESIST_COLORS[node.aiResistance]}14`, border: `1px solid ${RESIST_COLORS[node.aiResistance]}30`, fontSize: '0.54rem', fontWeight: 800, color: RESIST_COLORS[node.aiResistance], fontFamily: 'var(--font-mono)' }}>
                        AI Resist: {node.aiResistance}
                      </span>
                    )}
                    {node.transitionDifficulty && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${DIFF_COLORS[node.transitionDifficulty]}14`, border: `1px solid ${DIFF_COLORS[node.transitionDifficulty]}30`, fontSize: '0.54rem', fontWeight: 800, color: DIFF_COLORS[node.transitionDifficulty], fontFamily: 'var(--font-mono)' }}>
                        Transition: {node.transitionDifficulty}
                      </span>
                    )}
                    {node.confidence && !isFirst && (
                      <span style={{ padding: '1px 7px', borderRadius: '4px', background: `${CONF_COLORS[node.confidence]}10`, border: `1px solid ${CONF_COLORS[node.confidence]}25`, fontSize: '0.54rem', color: CONF_COLORS[node.confidence], fontFamily: 'var(--font-mono)' }}>
                        {node.confidence}
                      </span>
                    )}
                  </div>
                )}

                {/* Responsibilities */}
                {node.responsibilities && node.responsibilities.length > 0 && (
                  <div style={{ marginTop: '8px', maxWidth: '130px' }}>
                    {node.responsibilities.slice(0, 2).map((r, ri) => (
                      <div key={ri} style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.45, marginBottom: '2px', textAlign: 'center' }}>
                        · {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div style={{
        marginTop: '20px', padding: '10px 14px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.65rem', color: 'var(--text-3)', lineHeight: 1.55,
      }}>
        Evolution path derived from career intelligence and industry transition research.
        Country timelines adjusted for {countryProfile?.label ?? countryKey} AI adoption pace.
        Individual outcomes depend on proactive skill development, market conditions, and personal positioning.
      </div>
    </div>
  );
};
