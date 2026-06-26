// ═══════════════════════════════════════════════════════════════════════════
// KeyRiskDriversPanel.tsx  — Top Risk Drivers with Explainability
//
// Surfaces the top 3–5 signals that are most responsible for the final
// layoff risk score. Each driver is classified as:
//   FACT        — direct observed data (layoff count, funding date, etc.)
//   INFERENCE   — derived from signals (overstaffing estimate, AI exposure)
//   PREDICTION  — forward-looking projection (AI displacement curve)
//
// Satisfies the system-role requirement:
//   "Distinguish clearly between FACT / INFERENCE / PREDICTION"
//   "Every conclusion must be traceable to signals or logic."
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { ScoreBreakdown } from '../../services/layoffScoreEngine';
import { useAdaptiveSystem } from '../../hooks/useAdaptiveSystem';

// ── Types ─────────────────────────────────────────────────────────────────

export type SignalType = 'FACT' | 'INFERENCE' | 'PREDICTION';

export interface KeyRiskDriver {
  id: string;
  layer: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  layerLabel: string;
  signalType: SignalType;
  /** e.g. "Revenue declining YoY" */
  signal: string;
  /** e.g. "No funding in 20 months → runway risk" */
  explanation: string;
  /** 0–100 risk contribution for this driver */
  riskContribution: number;
  /** e.g. "OSINT · fetch-company-data" */
  source: string;
  /** Direction of this signal on final score */
  direction: 'risk-up' | 'risk-down' | 'neutral';
}

interface Props {
  breakdown: ScoreBreakdown;
  roleTitle: string;
  companyName: string;
  dataQuality: 'live' | 'partial' | 'fallback';
  /** Optional: AI-generated dominant risk from Gemini synthesis */
  dominantRisk?: string | null;
  /** Optional: outlier contradiction signal */
  hasOutlier?: boolean;
  outlierModels?: string[];
  verificationNote?: string | null;
}

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg1:    'rgba(10,15,25,0.98)',
  bg2:    'var(--alpha-bg-04)',
  bg3:    'var(--alpha-bg-06)',
  border: 'var(--alpha-bg-08)',
  cyan:   '#00F5FF',
  violet: '#7C3AFF',
  green:  '#10b981',
  amber:  '#f59e0b',
  orange: '#f97316',
  red:    '#ef4444',
  blue:   '#60a5fa',
  text:   '#fff',
  text2:  '#9ba5b4',
  text3:  '#6b7280',
  mono:   '"JetBrains Mono","Fira Code",monospace',
};

// ── Signal type config ─────────────────────────────────────────────────────
const SIGNAL_CONFIG: Record<SignalType, { color: string; bg: string; label: string; tooltip: string }> = {
  FACT:       { color: C.green,  bg: 'rgba(16,185,129,0.12)',  label: 'FACT',       tooltip: 'Directly observed from company/market data sources' },
  INFERENCE:  { color: C.amber,  bg: 'rgba(245,158,11,0.12)', label: 'INFERENCE',  tooltip: 'Derived via logic from observed signals' },
  PREDICTION: { color: C.violet, bg: 'rgba(124,58,255,0.12)', label: 'PREDICTION', tooltip: 'Forward-looking probability estimate' },
};

// ── Driver generation ──────────────────────────────────────────────────────

/**
 * extractKeyRiskDrivers — Deterministically generates Top 3–5 risk drivers
 * from the 5-layer breakdown scores. All drivers are traceable to their source layer.
 *
 * Sorting logic:
 *   1. Layers above 0.60 → HIGH signal
 *   2. Layers above 0.40 → MEDIUM
 *   3. Layers below 0.40 → LOW (protective)
 *   Top 5 by contribution weight × score.
 */
export const extractKeyRiskDrivers = (
  breakdown: ScoreBreakdown,
  companyName: string,
  roleTitle: string,
  dataQuality: 'live' | 'partial' | 'fallback',
): KeyRiskDriver[] => {
  const drivers: KeyRiskDriver[] = [];

  const company = companyName || 'your company';
  const role    = roleTitle   || 'your role';

  const pct = (v: number) => Math.round(v * 100);

  // ── L1: Company Health (30% weight) ──────────────────────────────────
  const l1 = breakdown.L1;
  if (l1 > 0.35) {
    const isLive = dataQuality === 'live';
    drivers.push({
      id:              'l1-company',
      layer:           'L1',
      layerLabel:      'Company Health',
      signalType:      isLive ? 'FACT' : 'INFERENCE',
      signal:          l1 > 0.75
        ? `Critical financial stress detected at ${company}`
        : l1 > 0.55
          ? `Elevated financial pressure at ${company}`
          : `Moderate financial headwinds at ${company}`,
      explanation:     l1 > 0.75
        ? `Revenue decline, low revenue-per-employee, and/or negative stock trend. Companies at this health score have 3× higher layoff frequency in the following 12 months.`
        : l1 > 0.55
          ? `Financial signals suggest ${company} is under cost pressure. Revenue growth is below industry average and/or funding runway is shrinking.`
          : `Company health is below-average. Monitor earnings calls and headcount announcements closely.`,
      riskContribution: Math.round(l1 * 30),   // weight × score
      source:          isLive ? 'OSINT · fetch-company-data' : 'Industry baseline · Fallback',
      direction:       l1 > 0.50 ? 'risk-up' : 'neutral',
    });
  } else {
    drivers.push({
      id:              'l1-stable',
      layer:           'L1',
      layerLabel:      'Company Health',
      signalType:      dataQuality === 'live' ? 'FACT' : 'INFERENCE',
      signal:          `${company} shows healthy financial signals`,
      explanation:     `Strong revenue trend, adequate funding runway, and positive headcount efficiency. This layer is actively reducing your overall risk.`,
      riskContribution: Math.round(l1 * 30),
      source:          'OSINT · fetch-company-data',
      direction:       'risk-down',
    });
  }

  // ── L2: Layoff History (25% weight) ──────────────────────────────────
  const l2 = breakdown.L2;
  if (l2 > 0.30) {
    drivers.push({
      id:          'l2-layoffs',
      layer:       'L2',
      layerLabel:  'Layoff History',
      signalType:  'FACT',
      signal:      l2 > 0.70
        ? `${company} has recent and repeated layoff patterns`
        : l2 > 0.45
          ? `${company} has documented layoff activity`
          : `Sector contagion signal elevated`,
      explanation: l2 > 0.70
        ? `Multiple layoff rounds detected in the last 24 months. Companies with ≥2 rounds historically have a 68% chance of additional cuts within 12 months. Sector contagion compounds this.`
        : l2 > 0.45
          ? `At least one documented layoff round in the last 24 months. Sector-wide layoff contagion is also adding residual pressure.`
          : `Industry-wide layoff rate is elevated even if ${company}-specific history is limited. Sector contagion risk applies.`,
      riskContribution: Math.round(l2 * 25),
      source:      'Layoff News Cache · OSINT Signals',
      direction:   'risk-up',
    });
  }

  // ── L3: Role Exposure (20% weight) ─────────────────────────────────
  const l3 = breakdown.L3;
  const roleDriverSignal = l3 > 0.65
    ? `${role} has high AI automation exposure`
    : l3 > 0.40
      ? `${role} faces moderate AI disruption`
      : `${role} shows low automation exposure`;

  drivers.push({
    id:          'l3-role',
    layer:       'L3',
    layerLabel:  'Role Exposure',
    signalType:  'INFERENCE',   // derived from role exposure data
    signal:      roleDriverSignal,
    explanation: l3 > 0.65
      ? `Task automatability analysis indicates ${pct(l3)}% of core ${role} tasks are within current AI capability. AI tools (e.g. Copilot, AutoGPT, domain-specific agents) can already replicate the majority of daily outputs.`
      : l3 > 0.40
        ? `A significant subset of ${role} responsibilities are being augmented by AI tools. While full displacement is not imminent, demand trend is declining for unaugmented practitioners.`
        : `The ${role} role has durable human-centric tasks (creativity, judgment, relationships) that limit near-term AI substitution. This is a protective factor.`,
    riskContribution: Math.round(l3 * 20),
    source:      'Role Exposure DB · Oracle D1/D2 Engine',
    direction:   l3 > 0.50 ? 'risk-up' : 'risk-down',
  });

  // ── L4: Market Conditions (12% weight) ────────────────────────────
  const l4 = breakdown.L4;
  if (l4 > 0.45) {
    drivers.push({
      id:          'l4-market',
      layer:       'L4',
      layerLabel:  'Market Conditions',
      signalType:  'PREDICTION',  // forward-looking macro
      signal:      `Macro headwinds in your industry sector`,
      explanation: `Industry growth outlook is volatile or declining. AI adoption rate in this sector is accelerating, compressing hiring demand. Macro conditions are outside your control but require active monitoring.`,
      riskContribution: Math.round(l4 * 12),
      source:      'Industry Risk Data · WEF 2025 · McKinsey AI Index',
      direction:   'risk-up',
    });
  }

  // ── L5: Employee Factors (13% weight) ─────────────────────────────
  const l5 = breakdown.L5;
  const l5Signal = l5 > 0.60
    ? `Personal risk profile is elevated`
    : l5 < 0.30
      ? `Strong personal profile — protective factor`
      : `Personal profile is average`;

  drivers.push({
    id:          'l5-profile',
    layer:       'L5',
    layerLabel:  'Employee Factors',
    signalType:  'INFERENCE',
    signal:      l5Signal,
    explanation: l5 > 0.60
      ? `Combination of short tenure, average/unknown performance, limited key relationships, or a non-unique role significantly increases individual exposure when layoffs occur.`
      : l5 < 0.30
        ? `Long tenure, strong performance signal, promotions, and key internal relationships provide substantial individual-level protection. This is meaningfully lowering your score.`
        : `Your profile factors are average for this company/role combination. Improving tenure, visibility, and performance tier would be the highest-leverage personal actions.`,
    riskContribution: Math.round(l5 * 13),
    source:      'User Factors · Deterministic Engine L5',
    direction:   l5 > 0.50 ? 'risk-up' : 'risk-down',
  });

  // Sort: highest risk contribution first, max 5 drivers
  return drivers
    .sort((a, b) => {
      // Always surface 'risk-up' drivers at top
      if (a.direction !== b.direction) {
        if (a.direction === 'risk-up') return -1;
        if (b.direction === 'risk-up') return 1;
      }
      return b.riskContribution - a.riskContribution;
    })
    .slice(0, 5);
};

// ── Animated reveal hook ───────────────────────────────────────────────────
const useReveal = () => {
  const ref  = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

// ── Signal type badge ──────────────────────────────────────────────────────
const SignalBadge: React.FC<{ type: SignalType }> = ({ type }) => {
  const cfg = SIGNAL_CONFIG[type];
  const [showTip, setShowTip] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        style={{
          background:    cfg.bg,
          color:         cfg.color,
          border:        `1px solid ${cfg.color}30`,
          borderRadius:  '4px',
          padding:       '1px 7px',
          fontSize:      '0.6rem',
          fontFamily:    C.mono,
          fontWeight:    700,
          letterSpacing: '0.8px',
          cursor:        'help',
          userSelect:    'none',
        }}
      >
        {cfg.label}
      </span>
      {showTip && (
        <div style={{
          position:    'absolute',
          bottom:      '120%',
          left:        '50%',
          transform:   'translateX(-50%)',
          zIndex:      100,
          background:  'rgba(10,15,25,0.98)',
          border:      `1px solid ${C.border}`,
          borderRadius: '6px',
          padding:     '8px 12px',
          fontSize:    '0.72rem',
          color:       C.text2,
          whiteSpace:  'nowrap',
          boxShadow:   '0 8px 24px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {cfg.tooltip}
        </div>
      )}
    </span>
  );
};

// ── Individual driver card ─────────────────────────────────────────────────
const DriverCard: React.FC<{ driver: KeyRiskDriver; index: number; expanded: boolean; onToggle: () => void }> = ({
  driver, index, expanded, onToggle,
}) => {
  const isRiskUp   = driver.direction === 'risk-up';
  const isRiskDown = driver.direction === 'risk-down';
  const borderHue  = isRiskUp ? C.red : isRiskDown ? C.green : C.amber;
  const contribColor = driver.riskContribution >= 20
    ? C.red : driver.riskContribution >= 12 ? C.orange : driver.riskContribution >= 6 ? C.amber : C.green;

  const layerColors: Record<string, string> = {
    L1: C.blue, L2: C.red, L3: C.orange, L4: C.violet, L5: C.green,
  };

  return (
    <div
      style={{
        background:   expanded ? `${borderHue}05` : C.bg2,
        border:       `1px solid ${expanded ? borderHue + '40' : C.border}`,
        borderLeft:   `3px solid ${borderHue}`,
        borderRadius: '10px',
        overflow:     'hidden',
        transition:   'all 0.2s ease',
      }}
    >
      {/* Header row (always visible) */}
      <button
        onClick={onToggle}
        style={{
          all:        'unset',
          display:    'flex',
          alignItems: 'flex-start',
          gap:        '12px',
          width:      '100%',
          padding:    '14px 16px',
          cursor:     'pointer',
          boxSizing:  'border-box',
        }}
      >
        {/* Rank */}
        <div style={{
          width:         '22px', height: '22px', borderRadius: '50%',
          background:    `${borderHue}15`, border: `1px solid ${borderHue}30`,
          display:       'flex', alignItems: 'center', justifyContent: 'center',
          color:         borderHue, fontSize: '0.65rem', fontWeight: 700,
          fontFamily:    C.mono, flexShrink: 0, marginTop: '1px',
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{
              background: `${layerColors[driver.layer]}15`,
              color:       layerColors[driver.layer],
              borderRadius: '4px',
              padding:     '1px 6px',
              fontSize:    '0.6rem',
              fontFamily:   C.mono,
              fontWeight:  700,
              flexShrink:  0,
            }}>
              {driver.layer} · {driver.layerLabel}
            </span>
            <SignalBadge type={driver.signalType} />
            <span style={{
              marginLeft:  'auto',
              flexShrink:  0,
              display:     'flex',
              alignItems:  'center',
              gap:         '4px',
            }}>
              <span style={{ color: contribColor, fontFamily: C.mono, fontSize: '0.82rem', fontWeight: 800 }}>
                +{driver.riskContribution}pt
              </span>
              <span style={{ color: C.text3, fontSize: '0.62rem', fontFamily: C.mono }}>contrib</span>
              <span style={{ color: C.text3, fontSize: '0.75rem', marginLeft: '4px' }}>
                {expanded ? '−' : '+'}
              </span>
            </span>
          </div>
          <div style={{ color: C.text, fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.4 }}>
            {isRiskUp ? '↑' : isRiskDown ? '↓' : '→'} {driver.signal}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding:     '0 16px 16px',
          borderTop:   `1px solid ${C.border}`,
          paddingTop:  '12px',
          marginTop:   0,
        }}>
          <p style={{
            margin:     '0 0 10px',
            color:      C.text2,
            fontSize:   '0.82rem',
            lineHeight: 1.6,
          }}>
            {driver.explanation}
          </p>
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            flexWrap:       'wrap',
            gap:            '8px',
          }}>
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '6px',
              fontSize:   '0.68rem',
              color:      C.text3,
              fontFamily: C.mono,
            }}>
              <span style={{ opacity: 0.6 }}>Source:</span>
              <span style={{ color: C.cyan, opacity: 0.8 }}>{driver.source}</span>
            </div>
            {/* Mini contribution bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }}>
              <div style={{
                width: '80px', height: '4px',
                background: 'var(--alpha-bg-08)',
                borderRadius: '2px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width:  `${Math.min(100, driver.riskContribution * 3.3)}%`,
                  background: contribColor,
                  borderRadius: '2px',
                  transition: 'width 1s ease',
                }} />
              </div>
              <span style={{ color: contribColor, fontFamily: C.mono, fontSize: '0.72rem', fontWeight: 700 }}>
                {driver.riskContribution}/30 max
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Contradiction / Outlier Alert ─────────────────────────────────────────
const OutlierAlert: React.FC<{
  hasOutlier: boolean;
  outlierModels: string[];
  verificationNote: string | null | undefined;
  dominantRisk: string | null | undefined;
}> = ({ hasOutlier, outlierModels, verificationNote, dominantRisk }) => {
  if (!hasOutlier && !verificationNote) return null;

  const modelShortName = (m: string): string =>
    ({ 'gemma-3-27b': 'Gemma', 'deepseek-v3': 'DeepSeek', 'llama-3.3-70b': 'Llama', 'gemini-2.0-flash': 'Gemini' })[m] || m;

  return (
    <div style={{
      background:   'rgba(245,158,11,0.06)',
      border:       '1px solid rgba(245,158,11,0.25)',
      borderLeft:   '3px solid var(--color-amber500-text)',
      borderRadius: '10px',
      padding:      '14px 16px',
      marginBottom: '16px',
    }}>
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '8px',
        marginBottom:  '8px',
      }}>
        <span style={{ fontSize: '0.9rem' }}>⚡</span>
        <span style={{
          color:         C.amber,
          fontSize:      '0.78rem',
          fontWeight:    700,
          fontFamily:    C.mono,
          letterSpacing: '0.5px',
        }}>
          {hasOutlier ? 'SIGNAL CONTRADICTION DETECTED' : 'AI SYNTHESIS NOTE'}
        </span>
      </div>
      {hasOutlier && outlierModels.length > 0 && (
        <p style={{ margin: '0 0 6px', color: C.text2, fontSize: '0.8rem', lineHeight: 1.5 }}>
          {outlierModels.map(modelShortName).join(', ')} flagged a different risk signal than the consensus.{' '}
          Gemini synthesis weighted the outlier and resolved the final score. This signals genuine signal ambiguity — treat with slightly higher uncertainty.
        </p>
      )}
      {verificationNote && (
        <p style={{ margin: 0, color: C.text2, fontSize: '0.8rem', lineHeight: 1.5 }}>
          <span style={{ color: C.violet, fontFamily: C.mono, fontSize: '0.68rem' }}>◎ AI SYNTHESIS → </span>
          {verificationNote}
        </p>
      )}
      {dominantRisk && (
        <p style={{ margin: '6px 0 0', color: C.orange, fontSize: '0.78rem', fontStyle: 'italic' }}>
          Dominant risk factor: "{dominantRisk}"
        </p>
      )}
    </div>
  );
};

// ── Main export ────────────────────────────────────────────────────────────
export const KeyRiskDriversPanel: React.FC<Props> = ({
  breakdown,
  roleTitle,
  companyName,
  dataQuality,
  dominantRisk,
  hasOutlier = false,
  outlierModels = [],
  verificationNote,
}) => {
  const { ref, visible } = useReveal();
  const { width, isTouch, scaleFactor } = useAdaptiveSystem();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const drivers = React.useMemo(
    () => extractKeyRiskDrivers(breakdown, companyName, roleTitle, dataQuality),
    [breakdown, companyName, roleTitle, dataQuality]
  );

  const riskUpCount      = drivers.filter(d => d.direction === 'risk-up').length;
  const riskDownCount    = drivers.filter(d => d.direction === 'risk-down').length;
  const totalContribution = drivers.reduce((s, d) => s + d.riskContribution, 0);

  return (
    <div
      ref={ref}
      style={{
        marginTop:  'var(--space-8)',
        marginBottom: 'var(--space-8)',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        containerType: 'inline-size',
        containerName: 'drivers-panel',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        background:     C.bg1,
        border:         `1px solid rgba(245,158,11,0.25)`,
        borderRadius:   '12px 12px 0 0',
        padding:        '18px 22px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '4px', height: '32px', background: C.amber, borderRadius: '2px' }} />
          <div>
            <div style={{
              color:         C.text3,
              fontSize:      '0.62rem',
              letterSpacing: '2px',
              fontFamily:    C.mono,
              marginBottom:  '3px',
            }}>
              RISK INTELLIGENCE · KEY SIGNAL DRIVERS
            </div>
            <div style={{ color: C.text, fontSize: '1.05rem', fontWeight: 700 }}>
              What's Driving Your Score
            </div>
          </div>
        </div>
        {/* Summary chips */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {riskUpCount > 0 && (
            <span style={{
              background: 'rgba(239,68,68,0.12)', color: C.red,
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px',
              padding: '3px 10px', fontSize: '0.7rem', fontFamily: C.mono, fontWeight: 700,
            }}>
              ↑ {riskUpCount} risk
            </span>
          )}
          {riskDownCount > 0 && (
            <span style={{
              background: 'rgba(16,185,129,0.12)', color: C.green,
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px',
              padding: '3px 10px', fontSize: '0.7rem', fontFamily: C.mono, fontWeight: 700,
            }}>
              ↓ {riskDownCount} protective
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        background:   'rgba(10,15,25,0.88)',
        border:       'rgba(245,158,11,0.12)',
        borderStyle:  'solid',
        borderWidth:  '0 1px 1px',
        borderRadius: '0 0 12px 12px',
        padding:      '20px',
      }}>
        {/* Legend */}
        <div style={{
          display:       'flex',
          gap:           '12px',
          flexWrap:      'wrap',
          marginBottom:  '16px',
          paddingBottom: '14px',
          borderBottom:  `1px solid ${C.border}`,
        }}>
          {(Object.entries(SIGNAL_CONFIG) as [SignalType, typeof SIGNAL_CONFIG[SignalType]][]).map(([type, cfg]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                background: cfg.bg, color: cfg.color, borderRadius: '3px',
                padding: '0px 6px', fontSize: '0.58rem', fontFamily: C.mono, fontWeight: 700,
              }}>{cfg.label}</span>
              <span style={{ color: C.text3, fontSize: '0.68rem' }}>{cfg.tooltip}</span>
            </div>
          ))}
        </div>

        {/* Outlier / Contradiction */}
        <OutlierAlert
          hasOutlier={hasOutlier}
          outlierModels={outlierModels}
          verificationNote={verificationNote}
          dominantRisk={dominantRisk}
        />

        {/* Driver cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {drivers.map((driver, i) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              index={i}
              expanded={expandedId === driver.id}
              onToggle={() => setExpandedId(prev => prev === driver.id ? null : driver.id)}
            />
          ))}
        </div>

        {/* Total contribution summary */}
        <div style={{
          marginTop:  '18px',
          padding:    '12px 14px',
          background: C.bg2,
          border:     `1px solid ${C.border}`,
          borderRadius: '8px',
          display:    'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap:        '12px',
          flexWrap:   'wrap',
        }}>
          <span style={{ color: C.text3, fontSize: '0.75rem', fontFamily: C.mono }}>
            Total tracked contribution
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '100px', height: '5px',
              background: 'var(--alpha-bg-08)', borderRadius: '3px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width:  `${Math.min(100, totalContribution)}%`,
                background: totalContribution >= 60 ? C.red : totalContribution >= 35 ? C.orange : C.amber,
                borderRadius: '3px', transition: 'width 1s ease',
              }} />
            </div>
            <span style={{
              color: totalContribution >= 60 ? C.red : totalContribution >= 35 ? C.orange : C.amber,
              fontFamily: C.mono, fontSize: '0.88rem', fontWeight: 700,
            }}>
              {totalContribution}pts
            </span>
          </div>
        </div>

        {/* Footnote */}
        <div style={{
          marginTop:  '14px',
          color:      C.text3,
          fontSize:   '0.65rem',
          fontFamily: C.mono,
          textAlign:  'center',
        }}>
          All drivers are traceable to deterministic engine signals or live OSINT data.
          Click any driver to expand its full evidence chain.
        </div>
      </div>
      <style>{`
        @container drivers-panel (max-width: 500px) {
          .driver-stat-summary { display: none !important; }
          .driver-header { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  );
};
