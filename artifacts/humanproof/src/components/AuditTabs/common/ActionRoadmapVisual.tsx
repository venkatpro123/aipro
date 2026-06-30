// ActionRoadmapVisual.tsx — Phase 1 Visual Content Transformation
//
// Visual 3-phase roadmap replacing text action rows in the Actions tab.
// Users see their priorities as a spatial, time-bucketed journey rather than
// a flat list of text. Layout:
//
//   [THIS WEEK] ──── [THIS MONTH] ──── [NEXT 90 DAYS]
//   [card][card]     [card][card]       [card][card]
//
// Each action card shows: color-coded priority bar, title, risk reduction badge,
// effort badge, and deadline. Text is minimal — visuals communicate first.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Target, TrendingDown, ChevronDown, Radio, Calendar } from 'lucide-react';

export interface ActionItem {
  id?: string;
  title: string;
  description?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  riskReductionPct?: number;
  effortBadge?: string;
  deadline?: string;
  hasLiveEvidence?: boolean;
  rationale?: string;
}

interface BucketConfig {
  key: 'week' | 'month' | 'quarter';
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  glowColor: string;
}

const BUCKETS: BucketConfig[] = [
  {
    key: 'week',
    label: 'This Week',
    sublabel: 'Critical + High priority',
    Icon: Zap,
    accentColor: '#dc2626',
    accentBg: 'rgba(220,38,38,0.07)',
    accentBorder: 'rgba(220,38,38,0.18)',
    glowColor: 'rgba(220,38,38,0.12)',
  },
  {
    key: 'month',
    label: 'This Month',
    sublabel: 'Medium priority',
    Icon: Calendar,
    accentColor: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.06)',
    accentBorder: 'rgba(245,158,11,0.16)',
    glowColor: 'rgba(245,158,11,0.10)',
  },
  {
    key: 'quarter',
    label: 'Next 90 Days',
    sublabel: 'Long horizon',
    Icon: Target,
    accentColor: '#22d3ee',
    accentBg: 'rgba(34,211,238,0.06)',
    accentBorder: 'rgba(34,211,238,0.16)',
    glowColor: 'rgba(34,211,238,0.08)',
  },
];

const PRIORITY_COLOR: Record<string, string> = {
  Critical: '#dc2626',
  High:     '#f97316',
  Medium:   '#f59e0b',
  Low:      '#22d3ee',
};

const ActionCard: React.FC<{
  item: ActionItem;
  delay: number;
  accentColor: string;
}> = ({ item, delay, accentColor }) => {
  const [open, setOpen] = useState(false);
  const pColor = PRIORITY_COLOR[item.priority] ?? accentColor;
  const hasDetail = !!item.description || !!item.rationale;

  return (
    <motion.div
      className="arm-card"
      style={{
        '--arm-accent': pColor,
        '--arm-border': `${pColor}22`,
        '--arm-bar':    pColor,
      } as React.CSSProperties}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.30, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Priority bar — left edge */}
      <div className="arm-card-bar" />

      {/* Card body */}
      <div className="arm-card-body">
        {/* Title row */}
        <div className="arm-card-title-row">
          <p className="arm-card-title">{item.title}</p>
          {item.hasLiveEvidence && (
            <span className="arm-live-badge">
              <Radio className="w-2 h-2" />
              LIVE
            </span>
          )}
        </div>

        {/* Badges row */}
        <div className="arm-card-badges">
          {typeof item.riskReductionPct === 'number' && item.riskReductionPct > 0 && (
            <span className="arm-badge arm-badge--risk">
              <TrendingDown className="w-2.5 h-2.5" />
              -{item.riskReductionPct}%
            </span>
          )}
          {item.effortBadge && (
            <span className="arm-badge arm-badge--effort">{item.effortBadge}</span>
          )}
          {item.deadline && (
            <span className="arm-badge arm-badge--deadline">
              <Clock className="w-2.5 h-2.5" />
              {item.deadline}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        {hasDetail && (
          <button
            type="button"
            className="arm-expand-btn"
            onClick={() => setOpen(v => !v)}
          >
            <ChevronDown className={`w-3 h-3 transition-transform${open ? ' rotate-180' : ''}`} />
            <span>{open ? 'Less' : 'Why this?'}</span>
          </button>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {item.rationale && (
                <p className="arm-detail-text">{item.rationale}</p>
              )}
              {item.description && !item.rationale && (
                <p className="arm-detail-text">{
                  item.description.match(/[^.!?]+[.!?]+/)?.[0]?.trim() ?? item.description
                }</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

interface Props {
  thisWeek:  ActionItem[];
  thisMonth: ActionItem[];
  next90:    ActionItem[];
}

export const ActionRoadmapVisual: React.FC<Props> = ({ thisWeek, thisMonth, next90 }) => {
  const bucketItems: Record<string, ActionItem[]> = {
    week:    thisWeek,
    month:   thisMonth,
    quarter: next90,
  };

  const hasAny = thisWeek.length + thisMonth.length + next90.length > 0;
  if (!hasAny) return null;

  return (
    <div className="arm-wrap">
      {/* Section label */}
      <div className="arm-header">
        <Target className="w-3.5 h-3.5" style={{ color: 'var(--alpha-text-35)' }} />
        <p className="arm-header-label">ACTION ROADMAP</p>
      </div>

      {/* Bucket columns */}
      <div className="arm-columns">
        {BUCKETS.map((bucket, bi) => {
          const items = bucketItems[bucket.key];
          if (items.length === 0) return null;
          const { Icon } = bucket;

          return (
            <motion.div
              key={bucket.key}
              className="arm-column"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: bi * 0.08, duration: 0.30 }}
            >
              {/* Column header */}
              <div
                className="arm-column-header"
                style={{
                  background: bucket.accentBg,
                  borderColor: bucket.accentBorder,
                  '--col-accent': bucket.accentColor,
                } as React.CSSProperties}
              >
                <Icon className="w-3.5 h-3.5 arm-col-icon" />
                <div className="flex-1 min-w-0">
                  <p className="arm-col-label">{bucket.label}</p>
                  <p className="arm-col-sub">{bucket.sublabel}</p>
                </div>
                <span className="arm-col-count">{items.length}</span>
              </div>

              {/* Action cards */}
              <div className="arm-column-cards">
                {items.map((item, idx) => (
                  <ActionCard
                    key={item.id ?? `${bucket.key}-${idx}`}
                    item={item}
                    delay={0.10 + bi * 0.06 + idx * 0.05}
                    accentColor={bucket.accentColor}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionRoadmapVisual;
