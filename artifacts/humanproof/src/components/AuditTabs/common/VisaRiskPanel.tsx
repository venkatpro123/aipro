import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import type { VisaRiskResult, VisaRiskLevel } from '../../../services/visaRiskEngine';

interface Props {
  visaRisk: VisaRiskResult;
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

export function VisaRiskPanel({ visaRisk }: Props) {
  if (!visaRisk.shouldDisplay) return null;

  // BUG-FIX: Safe fallback in case an unknown risk level is passed (future-proof)
  const cfg = LEVEL_CONFIG[visaRisk.overallVisaRisk] ?? LEVEL_CONFIG['MODERATE'];
  const Icon = cfg.icon;

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

          {visaRisk.portabilityProtected && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-emerald-400 text-xs">✓</span>
              <span className="text-[11px] text-emerald-400">AC21 portability applies — GC transfer is protected</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
