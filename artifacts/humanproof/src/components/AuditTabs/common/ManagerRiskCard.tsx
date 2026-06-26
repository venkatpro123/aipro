import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Users, TrendingDown } from 'lucide-react';
import type { ManagerRiskResult, ManagerRiskPatternType } from '../../../services/managerRiskEngine';

interface Props {
  managerRisk: ManagerRiskResult;
}

const PATTERN_CONFIG: Record<ManagerRiskPatternType, {
  icon: typeof AlertTriangle;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  label: string;
}> = {
  exodus_signal: {
    icon: AlertTriangle,
    bgClass: 'bg-red-950/40',
    borderClass: 'border-red-500/60',
    badgeClass: 'bg-red-500/20 text-red-300 border border-red-500/30',
    label: 'Leadership Exodus',
  },
  high_risk: {
    icon: TrendingDown,
    bgClass: 'bg-orange-950/30',
    borderClass: 'border-orange-500/50',
    badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    label: 'Manager Departure',
  },
  concerning: {
    icon: Users,
    bgClass: 'bg-amber-950/20',
    borderClass: 'border-amber-500/40',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    label: 'Chain Instability',
  },
  clean: {
    icon: Users,
    bgClass: 'bg-emerald-950/10',
    borderClass: 'border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    label: 'Stable',
  },
};

export function ManagerRiskCard({ managerRisk }: Props) {
  if (managerRisk.patternType === 'clean') return null;

  // BUG-FIX: Safe fallback in case an unknown patternType is passed (future-proof)
  const cfg = PATTERN_CONFIG[managerRisk.patternType] ?? PATTERN_CONFIG['concerning'];
  const Icon = cfg.icon;
  const upliftPct = Math.round(managerRisk.layoffProbabilityUplift * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-xl border p-4 ${cfg.bgClass} ${cfg.borderClass} mb-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${cfg.badgeClass} shrink-0`}>
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[var(--text)]">Reporting Chain Risk</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
            {upliftPct > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                +{upliftPct}% risk uplift
              </span>
            )}
          </div>

          <p className="text-xs text-gray-300 leading-relaxed mb-3">
            {managerRisk.interpretation}
          </p>

          {managerRisk.recommendedActions.length > 0 && (
            <div className="space-y-1">
              {managerRisk.recommendedActions.slice(0, 3).map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] mt-0.5 text-gray-500">▶</span>
                  <span className="text-[11px] text-gray-400 leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          )}

          {managerRisk.isInHighRiskWindow && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[11px] text-red-400">
                In high-risk window — act within {managerRisk.timeToActionDays} days
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
