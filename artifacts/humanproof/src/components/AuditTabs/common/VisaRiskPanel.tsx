import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, AlertTriangle, Scale, DollarSign, Lightbulb } from 'lucide-react';
import type { VisaRiskResult, VisaRiskLevel } from '../../../services/visaRiskEngine';
import { computeGratuity } from '../../../data/endOfServiceGratuity';

interface Props {
  visaRisk: VisaRiskResult;
  /** ISO country code for gratuity computation (AE, SA, QA, BH, OM, KW). */
  countryCode?: string;
  /** Tenure years for gratuity computation — required to surface the formula. */
  tenureYears?: number;
}

const LEVEL_CONFIG: Record<VisaRiskLevel, {
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  label: string;
  icon: typeof Shield;
}> = {
  NONE:     { bgClass: '', borderClass: '', badgeClass: '', label: '', icon: Shield },
  LOW:      { bgClass: 'bg-blue-950/20', borderClass: 'border-blue-500/30', badgeClass: 'bg-blue-500/10 text-blue-400', label: 'Low', icon: Shield },
  MODERATE: { bgClass: 'bg-amber-950/20', borderClass: 'border-amber-500/40', badgeClass: 'bg-amber-500/20 text-amber-300', label: 'Moderate', icon: Clock },
  HIGH:     { bgClass: 'bg-orange-950/30', borderClass: 'border-orange-500/50', badgeClass: 'bg-orange-500/20 text-orange-300', label: 'High', icon: AlertTriangle },
  CRITICAL: { bgClass: 'bg-red-950/40', borderClass: 'border-red-500/60', badgeClass: 'bg-red-500/20 text-red-300', label: 'Critical', icon: AlertTriangle },
};

export function VisaRiskPanel({ visaRisk, countryCode, tenureYears }: Props) {
  if (!visaRisk.shouldDisplay) return null;

  // BUG-FIX: Safe fallback in case an unknown risk level is passed (future-proof)
  const cfg = LEVEL_CONFIG[visaRisk.overallVisaRisk] ?? LEVEL_CONFIG['MODERATE'];
  const Icon = cfg.icon;

  // MENA gratuity: surface statutory end-of-service entitlement so users can fold it
  // into their effective runway calculation rather than counting savings alone.
  const gratuity = countryCode && tenureYears != null && tenureYears > 0
    ? computeGratuity(countryCode, tenureYears)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 mb-4 ${cfg.bgClass} ${cfg.borderClass}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${cfg.badgeClass}`}>
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Legal disclaimer — first item in panel so it is always visible before any guidance */}
          <div className="flex items-start gap-2 px-3 py-2.5 mb-3 rounded-lg bg-amber-950/30 border border-amber-500/20">
            <Scale size={12} className="text-amber-400/80 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[10px] text-amber-200/70 leading-relaxed m-0">
              <span className="font-semibold text-amber-300/90">General information only — not legal advice.</span>{' '}
              Immigration law changes frequently and varies by jurisdiction. Grace periods, AC21
              eligibility, and employer-of-record options should be verified with a qualified
              immigration attorney before any employment decision.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-sm font-semibold text-white">Visa / Work Authorization Risk</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${cfg.badgeClass} border-current/20`}>
              {cfg.label} Risk
            </span>
            {visaRisk.gracePeriodDays > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                {visaRisk.gracePeriodDays}-day grace period
              </span>
            )}
          </div>

          {/* Dependency bar */}
          <div className="mb-3">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1">
              <span>Employer dependency</span>
              <span>{visaRisk.dependencyScore}/100</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${visaRisk.dependencyScore}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  visaRisk.dependencyScore > 75 ? 'bg-red-500' :
                  visaRisk.dependencyScore > 50 ? 'bg-orange-500' :
                  'bg-amber-400'
                }`}
              />
            </div>
          </div>

          {/* Key risks */}
          {visaRisk.keyRisks.length > 0 && (
            <div className="space-y-1 mb-3">
              {visaRisk.keyRisks.map((risk, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-red-400 text-[11px] mt-0.5">⚠</span>
                  <span className="text-[11px] text-gray-300">{risk}</span>
                </div>
              ))}
            </div>
          )}

          {/* Immediate actions */}
          {visaRisk.immediateActions.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-1">
              <span className="text-[11px] font-medium text-gray-400">Immediate actions:</span>
              {visaRisk.immediateActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 text-[10px] mt-0.5">▶</span>
                  <span className="text-[11px] text-gray-300">{action}</span>
                </div>
              ))}
            </div>
          )}

          {/* Available options — escape paths / transition programs */}
          {visaRisk.availableOptions && visaRisk.availableOptions.length > 0 && (
            <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb size={11} className="text-teal-400 shrink-0" aria-hidden="true" />
                <span className="text-[11px] font-medium text-teal-300">Options available to you:</span>
              </div>
              {visaRisk.availableOptions.map((opt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-teal-400 text-[10px] mt-0.5">◆</span>
                  <span className="text-[11px] text-teal-100/90">{opt}</span>
                </div>
              ))}
            </div>
          )}

          {visaRisk.portabilityProtected && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-emerald-400 text-xs">✓</span>
              <span className="text-[11px] text-emerald-400">AC21 portability applies — GC transfer is protected</span>
            </div>
          )}

          {gratuity && gratuity.effectiveBufferMonths > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                <div className="p-1.5 rounded-md bg-emerald-500/10 shrink-0">
                  <DollarSign size={12} className="text-emerald-400" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-semibold text-emerald-300">
                      End-of-service gratuity entitlement
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium">
                      ≈ {gratuity.effectiveBufferMonths.toFixed(1)} months runway
                    </span>
                    <span className="text-[9px] uppercase tracking-wide text-emerald-400/60 font-medium">
                      MEASURED
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100/80 leading-relaxed m-0 mb-1.5">
                    {gratuity.disclosureText}
                  </p>
                  <p className="text-[10px] text-emerald-200/60 leading-relaxed m-0">
                    Statute: {gratuity.statuteRef}. This is a lump-sum termination benefit
                    that materially extends your effective runway — fold it into your
                    risk-appetite classification alongside savings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {gratuity && gratuity.effectiveBufferMonths === 0 && tenureYears != null && tenureYears > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/10 border border-amber-500/15">
                <Scale size={11} className="text-amber-400/70 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed m-0">
                  {gratuity.disclosureText}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
