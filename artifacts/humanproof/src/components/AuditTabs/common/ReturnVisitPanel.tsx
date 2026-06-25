// ReturnVisitPanel.tsx — P1 Retention
//
// Comprehensive "Since Your Last Visit" panel for returning users.
// Combines market changes, score evolution, new signals, and
// recommended next actions into a visual summary card.
// Self-gates to null on first visit (no history).

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Activity, Zap,
  Globe, Building2, Shield, Clock,
} from 'lucide-react';
import { riskColor } from '../../../lib/riskTokens';
import { MilestoneIllustration } from '../../illustrations/AdditionalIllustrations';

interface MarketChange {
  label: string;
  direction: 'up' | 'down' | 'stable';
  detail: string;
}

interface ReturnVisitPanelProps {
  daysSince: number;
  scoreBefore?: number;
  scoreNow: number;
  completedActions?: number;
  newSignals?: number;
  marketChanges?: MarketChange[];
  companyName?: string;
}

export const ReturnVisitPanel: React.FC<ReturnVisitPanelProps> = ({
  daysSince,
  scoreBefore,
  scoreNow,
  completedActions = 0,
  newSignals = 0,
  marketChanges = [],
  companyName,
}) => {
  if (daysSince < 1) return null;

  const scoreDelta = scoreBefore != null ? scoreNow - scoreBefore : null;
  const hasScoreChange = scoreDelta != null && Math.abs(scoreDelta) >= 1;

  const greeting = useMemo(() => {
    if (daysSince >= 30) return `${daysSince} days since your last check`;
    if (daysSince >= 7) return `${Math.floor(daysSince / 7)} week${daysSince >= 14 ? 's' : ''} since your last check`;
    return `${daysSince} day${daysSince > 1 ? 's' : ''} since your last check`;
  }, [daysSince]);

  const summaryItems = useMemo(() => {
    const items: Array<{ icon: React.ElementType; text: string; color: string }> = [];

    if (hasScoreChange && scoreDelta != null) {
      items.push({
        icon: scoreDelta > 0 ? TrendingUp : TrendingDown,
        text: `Risk score ${scoreDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreDelta)} points`,
        color: scoreDelta > 0 ? '#ef4444' : '#10b981',
      });
    }

    if (completedActions > 0) {
      items.push({
        icon: Shield,
        text: `${completedActions} action${completedActions > 1 ? 's' : ''} completed`,
        color: '#10b981',
      });
    }

    if (newSignals > 0) {
      items.push({
        icon: Activity,
        text: `${newSignals} new signal${newSignals > 1 ? 's' : ''} detected`,
        color: '#f59e0b',
      });
    }

    if (marketChanges.length > 0) {
      items.push({
        icon: Globe,
        text: `${marketChanges.length} market change${marketChanges.length > 1 ? 's' : ''} since last visit`,
        color: '#22d3ee',
      });
    }

    return items;
  }, [hasScoreChange, scoreDelta, completedActions, newSignals, marketChanges]);

  if (summaryItems.length === 0 && daysSince < 7) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(0,212,224,0.04)',
        border: '1px solid rgba(0,212,224,0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,212,224,0.12)' }}
        >
          <Clock className="w-3 h-3" style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.12em] uppercase" style={{ color: 'var(--cyan)' }}>
            Welcome Back
          </p>
          <p className="text-[10px]" style={{ color: 'var(--alpha-text-45)' }}>
            {greeting}{companyName ? ` · ${companyName}` : ''}
          </p>
        </div>
      </div>

      {/* Summary items */}
      {summaryItems.length > 0 ? (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {summaryItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-center gap-2 py-1"
              >
                <Icon className="w-3 h-3 flex-shrink-0" style={{ color: item.color }} />
                <span className="text-[11px]" style={{ color: 'var(--alpha-text-55)' }}>
                  {item.text}
                </span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 pb-4 flex items-center gap-3">
          <MilestoneIllustration size={48} className="flex-shrink-0 opacity-70" />
          <p className="text-[11px] leading-snug" style={{ color: 'var(--alpha-text-45)' }}>
            Nothing's changed since your last check — your plan is still on track. Check back after your next action.
          </p>
        </div>
      )}

      {/* Score comparison strip */}
      {hasScoreChange && scoreBefore != null && (
        <div
          className="flex items-center justify-center gap-4 px-4 py-2.5"
          style={{ borderTop: '1px solid var(--alpha-bg-06)' }}
        >
          <div className="text-center">
            <p className="text-[9px] font-semibold uppercase" style={{ color: 'var(--alpha-text-25)' }}>Before</p>
            <p className="text-[16px] font-black" style={{ color: riskColor(scoreBefore), fontFamily: 'var(--font-mono)' }}>
              {scoreBefore}
            </p>
          </div>
          <div style={{ color: 'var(--alpha-text-25)', fontSize: 18 }}>→</div>
          <div className="text-center">
            <p className="text-[9px] font-semibold uppercase" style={{ color: 'var(--alpha-text-25)' }}>Now</p>
            <p className="text-[16px] font-black" style={{ color: riskColor(scoreNow), fontFamily: 'var(--font-mono)' }}>
              {scoreNow}
            </p>
          </div>
          <div
            className="px-2 py-1 rounded-lg text-[10px] font-bold"
            style={{
              background: scoreDelta! > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
              color: scoreDelta! > 0 ? '#ef4444' : '#10b981',
            }}
          >
            {scoreDelta! > 0 ? '+' : ''}{scoreDelta}pt
          </div>
        </div>
      )}

      {/* Market changes (if any) */}
      {marketChanges.length > 0 && (
        <div className="px-4 pb-3" style={{ borderTop: '1px solid var(--alpha-bg-06)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mt-2 mb-1.5" style={{ color: 'var(--alpha-text-25)' }}>
            Market Changes
          </p>
          {marketChanges.slice(0, 3).map((change, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <span style={{ color: change.direction === 'up' ? '#ef4444' : change.direction === 'down' ? '#10b981' : '#f59e0b', fontSize: 10 }}>
                {change.direction === 'up' ? '↑' : change.direction === 'down' ? '↓' : '→'}
              </span>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--alpha-text-55)' }}>{change.label}</p>
                <p className="text-[9px]" style={{ color: 'var(--alpha-text-35)' }}>{change.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ReturnVisitPanel;
