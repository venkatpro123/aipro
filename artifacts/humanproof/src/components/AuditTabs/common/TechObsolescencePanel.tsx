// TechObsolescencePanel.tsx — Wave 2.2 Intelligence Surfacing
//
// PROBLEM: techStackObsolescence (L37) computes tech lifecycle risk (0–100)
// but has zero UI panel. Users with Java 8, Angular 1, or Perl in their
// stack get no signal about this critical career risk.

import React, { useState } from 'react';
import { Cpu, AlertTriangle, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

interface RiskyTech {
  name: string;
  yearsToObsolescence?: number;
  replacementTech?: string;
  learningCurveWeeks?: number;
  marketDemandTrend: 'rising' | 'stable' | 'declining' | 'collapsing';
  riskScore?: number; // 0–100
}

interface TechStackObsolescence {
  overallObsolescenceScore?: number; // 0–100
  riskyTechnologies?: RiskyTech[];
  modernizationPath?: string;
  urgentAction?: string;
  stackHealthLabel?: 'current' | 'aging' | 'at_risk' | 'critical';
}

interface Props {
  techStackObsolescence: TechStackObsolescence;
}

const TREND_CONFIG = {
  rising:    { color: '#10b981', icon: '↑', label: 'Growing'   },
  stable:    { color: '#94a3b8', icon: '→', label: 'Stable'    },
  declining: { color: '#f97316', icon: '↓', label: 'Declining' },
  collapsing:{ color: '#dc2626', icon: '↓↓','label': 'Collapsing' },
};

const HEALTH_CONFIG = {
  current:  { color: '#10b981', label: 'CURRENT STACK',  desc: 'Your tech stack is in good shape' },
  aging:    { color: '#f59e0b', label: 'AGING STACK',    desc: '1–2 technologies need modernization' },
  at_risk:  { color: '#f97316', label: 'AT RISK',        desc: 'Multiple technologies are declining' },
  critical: { color: '#dc2626', label: 'CRITICAL',       desc: 'Core tech is becoming obsolete' },
};

export const TechObsolescencePanel: React.FC<Props> = ({ techStackObsolescence }) => {
  const [expanded, setExpanded] = useState(false);
  const {
    overallObsolescenceScore,
    riskyTechnologies = [],
    modernizationPath,
    urgentAction,
    stackHealthLabel = 'aging',
  } = techStackObsolescence;

  const cfg = HEALTH_CONFIG[stackHealthLabel] ?? HEALTH_CONFIG.aging;
  const hasRiskyTech = riskyTechnologies.length > 0;

  if (!hasRiskyTech && overallObsolescenceScore == null) return null;

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
          >
            <Cpu className="w-3.5 h-3.5" style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              TECH STACK HEALTH
            </p>
            <span className="text-[10px] font-black" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>
        {overallObsolescenceScore != null && (
          <div className="text-right">
            <p className="text-[18px] font-black" style={{ color: cfg.color }}>
              {overallObsolescenceScore}
            </p>
            <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>obsolescence risk</p>
          </div>
        )}
      </div>

      {/* Obsolescence risk bar */}
      {overallObsolescenceScore != null && (
        <div className="h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${overallObsolescenceScore}%`,
              background: cfg.color,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      )}

      {/* Risky technologies */}
      {hasRiskyTech && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {riskyTechnologies.length} AT-RISK TECH{riskyTechnologies.length > 1 ? 'S' : ''}
            </p>
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[9px]"
              style={{ color: 'rgba(255,255,255,0.30)' }}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'collapse' : 'expand'}
            </button>
          </div>

          {/* Always show top tech */}
          {riskyTechnologies.slice(0, expanded ? 99 : 2).map((tech, i) => {
            const tc = TREND_CONFIG[tech.marketDemandTrend] ?? TREND_CONFIG.stable;
            return (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: tc.color, opacity: 0.7 }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.80)' }}>{tech.name}</p>
                    {tech.replacementTech && (
                      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        → {tech.replacementTech}
                        {tech.learningCurveWeeks && ` (${tech.learningCurveWeeks}wk to modernize)`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-[10px] font-bold" style={{ color: tc.color }}>
                    {tc.icon} {tc.label}
                  </span>
                  {tech.yearsToObsolescence != null && (
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      ~{tech.yearsToObsolescence}yr window
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Modernization path */}
      {modernizationPath && (
        <p className="text-[10px] leading-relaxed mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {modernizationPath}
        </p>
      )}

      {/* Urgent action */}
      {urgentAction && (
        <div
          className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2"
          style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.12)' }}
        >
          <TrendingUp className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#22d3ee', opacity: 0.7 }} />
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(34,211,238,0.75)' }}>
            {urgentAction}
          </p>
        </div>
      )}
    </div>
  );
};

export default TechObsolescencePanel;
