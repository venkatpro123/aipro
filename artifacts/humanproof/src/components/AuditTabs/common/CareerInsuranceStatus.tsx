// CareerInsuranceStatus.tsx — Wave 4.2 Career Insurance Tracking
//
// PROBLEM: careerInsuranceEngine computes a full resilience plan with 5 pillars
// but there's no persistent tracking UI. Users can't see their "insurance level"
// or what the weakest link is at a glance.
//
// SOLUTION: Always-visible status card at the bottom of ProtectionTab showing
// all 5 resilience pillars as compact progress bars. Overall "% insured" headline.
// When the user reaches 85%+: gamification unlock message.
//
// DATA SOURCE: result.careerResilience (CareerResilienceResult from careerResilienceEngine)
// which contains pillars[], compositeScore, criticalWeakness, and effectiveProtectionMonths.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, ArrowRight, Flame } from 'lucide-react';

interface ResiliencePillar {
  name: string;
  score: number;        // 0–100
  status: 'STRONG' | 'ADEQUATE' | 'WEAK' | 'CRITICAL';
  insight?: string;
  improvementAction?: string;
}

interface CareerResilienceResult {
  compositeScore: number;
  classification?: string;
  pillars: ResiliencePillar[];
  criticalWeakness?: ResiliencePillar;
  keyStrength?: ResiliencePillar;
  resilienceImprovementPlan?: string[];
  effectiveProtectionMonths?: number;
  resilienceHeadline?: string;
}

interface Props {
  resilience: CareerResilienceResult;
}

// ── Pillar config ─────────────────────────────────────────────────────────────

const PILLAR_ICONS: Record<string, string> = {
  'Financial Buffer': '💰',
  'Financial':        '💰',
  'Market Demand':    '📈',
  'Uniqueness':       '🎓',
  'Skills':           '🎓',
  'Network':          '🤝',
  'Escape Paths':     '🛤️',
  'Credentials':      '📋',
  'Readiness':        '📄',
  'Performance':      '⭐',
};

const STATUS_CONFIG = {
  STRONG:   { color: '#10b981', label: 'Strong',   barAlpha: '0.85' },
  ADEQUATE: { color: '#f59e0b', label: 'Adequate', barAlpha: '0.70' },
  WEAK:     { color: '#f97316', label: 'Weak',     barAlpha: '0.70' },
  CRITICAL: { color: '#dc2626', label: 'Critical', barAlpha: '0.85' },
};

function pillarIcon(name: string): string {
  for (const [key, icon] of Object.entries(PILLAR_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '🔹';
}

function insuranceGrade(score: number): { label: string; color: string; sub: string } {
  if (score >= 85) return { label: 'FULLY INSURED',   color: '#10b981', sub: 'Top 15% for career protection' };
  if (score >= 65) return { label: 'MOSTLY INSURED',  color: '#22d3ee', sub: 'Solid foundation — close the gaps below' };
  if (score >= 45) return { label: 'PARTIAL',         color: '#f59e0b', sub: 'Moderate protection — 2-3 pillars need work' };
  if (score >= 25) return { label: 'UNDERINSURED',    color: '#f97316', sub: 'Significant gaps — start with the weakest pillar' };
  return          { label: 'UNPROTECTED',    color: '#dc2626', sub: 'Immediate resilience building required' };
}

// ── Pillar Row ────────────────────────────────────────────────────────────────

const PillarRow: React.FC<{
  pillar: ResiliencePillar;
  isCritical: boolean;
  isTop: boolean;
}> = ({ pillar, isCritical, isTop }) => {
  const cfg = STATUS_CONFIG[pillar.status] ?? STATUS_CONFIG.ADEQUATE;
  const icon = pillarIcon(pillar.name);

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-xl"
      style={{
        background: isCritical ? `${cfg.color}0c` : 'transparent',
        border: isCritical ? `1px solid ${cfg.color}25` : '1px solid transparent',
      }}
    >
      {/* Icon */}
      <span className="text-base flex-shrink-0 w-6 text-center">{icon}</span>

      {/* Name + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[11px] font-semibold truncate"
            style={{ color: isCritical ? cfg.color : 'rgba(255,255,255,0.80)' }}
          >
            {pillar.name}
          </span>
          <span
            className="text-[10px] font-black ml-2 flex-shrink-0"
            style={{ color: cfg.color }}
          >
            {pillar.score}
          </span>
        </div>
        {/* Progress bar */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pillar.score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            style={{ background: cfg.color + (isCritical ? 'dd' : '88') }}
          />
        </div>
      </div>

      {/* Status badge */}
      <span
        className="text-[8px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
        style={{
          background: `${cfg.color}15`,
          color: cfg.color,
          border: `1px solid ${cfg.color}28`,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CareerInsuranceStatus: React.FC<Props> = ({ resilience }) => {
  const [expanded, setExpanded] = useState(false);

  const { compositeScore, pillars, criticalWeakness, effectiveProtectionMonths, resilienceImprovementPlan } = resilience;
  const grade = insuranceGrade(compositeScore);
  const isFullyInsured = compositeScore >= 85;

  // Show up to 3 pillars collapsed; all when expanded
  const visiblePillars = expanded ? pillars : pillars.slice(0, 3);

  // Target bar width as percentage of 85 (fully insured threshold)
  const targetPct = 85;
  const pctOfTarget = Math.min(100, Math.round((compositeScore / targetPct) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${isFullyInsured ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.09)'}` }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ background: isFullyInsured ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield
              className="w-4 h-4"
              style={{ color: isFullyInsured ? '#10b981' : 'rgba(255,255,255,0.45)' }}
            />
            <p className="text-[10px] font-black tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              CAREER INSURANCE STATUS
            </p>
          </div>
          {effectiveProtectionMonths != null && effectiveProtectionMonths > 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(34,211,238,0.10)', color: 'rgba(34,211,238,0.70)', border: '1px solid rgba(34,211,238,0.20)' }}>
              ~{effectiveProtectionMonths}mo protection
            </span>
          )}
        </div>

        {/* Overall score row */}
        <div className="flex items-end gap-3 mb-2">
          <div>
            <p className="text-[30px] font-black leading-none" style={{ color: grade.color }}>
              {compositeScore}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>/100</p>
          </div>
          <div className="flex-1 mb-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-black" style={{ color: grade.color }}>{grade.label}</p>
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                Target: {targetPct}%
              </p>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {/* Target marker at 85 */}
              <div
                className="absolute top-0 bottom-0 w-0.5"
                style={{ left: `${targetPct}%`, background: 'rgba(255,255,255,0.25)' }}
              />
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${compositeScore}%` }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
                style={{ background: `linear-gradient(90deg, ${grade.color}88, ${grade.color})` }}
              />
            </div>
            <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{grade.sub}</p>
          </div>
        </div>

        {/* Fully insured badge */}
        {isFullyInsured && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Flame className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
            <p className="text-[10px] font-semibold" style={{ color: '#10b981' }}>
              You're in the top 15% of career-protected professionals in your cohort.
            </p>
          </div>
        )}
      </div>

      {/* ── Pillars ────────────────────────────────────────────────────────── */}
      <div className="px-2 pt-2 pb-1">
        {visiblePillars.map(p => (
          <PillarRow
            key={p.name}
            pillar={p}
            isCritical={criticalWeakness?.name === p.name}
            isTop={resilience.keyStrength?.name === p.name}
          />
        ))}

        {pillars.length > 3 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-semibold mt-1"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Show less</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> +{pillars.length - 3} more pillars</>
            )}
          </button>
        )}
      </div>

      {/* ── Improvement plan ───────────────────────────────────────────────── */}
      {!isFullyInsured && criticalWeakness && (
        <div
          className="mx-3 mb-3 rounded-xl px-3 py-2.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[9px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
            WEAKEST PILLAR — CLOSE THIS FIRST
          </p>
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">{pillarIcon(criticalWeakness.name)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold mb-1" style={{ color: STATUS_CONFIG[criticalWeakness.status]?.color ?? '#f97316' }}>
                {criticalWeakness.name}: {criticalWeakness.score}/100
              </p>
              {resilienceImprovementPlan?.[0] && (
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: 'rgba(34,211,238,0.60)' }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {resilienceImprovementPlan[0]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CareerInsuranceStatus;
