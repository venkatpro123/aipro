// SignalHeatGrid.tsx — Phase 1 Visual Content Transformation
//
// Visual signal heatmap replacing text-heavy company signal panels.
// Each cell = one risk signal, colored by intensity.
// Users scan the grid and immediately see which signals are lit red
// before reading a single label.
//
// Layout: responsive grid of signal cells, sorted by strength descending.
// Each cell shows: signal name, strength bar, value chip.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown } from 'lucide-react';

export interface SignalCell {
  key:      string;
  label:    string;
  value?:   string;       // e.g. "-8% QoQ", "3 rounds"
  strength: number;       // 0–100, drives color intensity
  category: 'financial' | 'workforce' | 'market' | 'leadership' | 'regulatory' | 'sentiment';
  detail?:  string;       // one-sentence explanation shown on expand
}

interface Props {
  signals: SignalCell[];
  title?: string;
  showCategories?: boolean;
}

const CAT_COLORS: Record<string, { accent: string; label: string }> = {
  financial:  { accent: '#ef4444', label: 'Financial'  },
  workforce:  { accent: '#f97316', label: 'Workforce'  },
  market:     { accent: '#f59e0b', label: 'Market'     },
  leadership: { accent: '#8b5cf6', label: 'Leadership' },
  regulatory: { accent: '#22d3ee', label: 'Regulatory' },
  sentiment:  { accent: '#10b981', label: 'Sentiment'  },
};

function strengthColor(s: number): string {
  if (s >= 80) return '#dc2626';
  if (s >= 60) return '#f97316';
  if (s >= 40) return '#f59e0b';
  if (s >= 20) return '#22d3ee';
  return '#10b981';
}

function strengthBg(s: number): string {
  const c = strengthColor(s);
  const opacity = 0.04 + (s / 100) * 0.12;
  return `${c}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}

function strengthBorder(s: number): string {
  const c = strengthColor(s);
  const opacity = 0.12 + (s / 100) * 0.16;
  return `1px solid ${c}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}

const SignalCellCard: React.FC<{ cell: SignalCell; delay: number }> = ({ cell, delay }) => {
  const [open, setOpen] = useState(false);
  const color  = strengthColor(cell.strength);
  const catCfg = CAT_COLORS[cell.category] ?? { accent: '#64748b', label: cell.category };

  return (
    <motion.div
      className="shg-cell"
      style={{
        background: strengthBg(cell.strength),
        border: strengthBorder(cell.strength),
      }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Strength bar — top edge color fill */}
      <div className="shg-cell-bar">
        <motion.div
          className="shg-cell-bar-fill"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${cell.strength}%` }}
          transition={{ delay: delay + 0.12, duration: 0.50, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="shg-cell-body">
        {/* Category dot + label */}
        <div className="shg-cell-cat">
          <div className="shg-cat-dot" style={{ background: catCfg.accent }} />
          <span className="shg-cat-label">{catCfg.label}</span>
        </div>

        {/* Signal label */}
        <p className="shg-signal-label">{cell.label}</p>

        {/* Value chip + strength number */}
        <div className="shg-cell-footer">
          {cell.value && (
            <span className="shg-value-chip" style={{ color, background: `${color}14`, borderColor: `${color}28` }}>
              {cell.value}
            </span>
          )}
          <span className="shg-strength-num" style={{ color }}>
            {cell.strength}
          </span>
        </div>

        {/* Expand detail */}
        {cell.detail && (
          <button
            type="button"
            className="shg-expand-btn"
            onClick={() => setOpen(v => !v)}
          >
            <ChevronDown className={`w-2.5 h-2.5 transition-transform${open ? ' rotate-180' : ''}`} />
          </button>
        )}

        <AnimatePresence initial={false}>
          {open && cell.detail && (
            <motion.p
              className="shg-detail-text"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {cell.detail}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const CATEGORY_ORDER = ['financial', 'workforce', 'leadership', 'regulatory', 'market', 'sentiment'] as const;

export const SignalHeatGrid: React.FC<Props> = ({
  signals,
  title = 'SIGNAL INTELLIGENCE',
  showCategories = false,
}) => {
  if (!signals || signals.length === 0) return null;

  const sorted = [...signals].sort((a, b) => b.strength - a.strength);

  // Average strength for summary bar
  const avgStrength = Math.round(signals.reduce((s, c) => s + c.strength, 0) / signals.length);
  const hotCount    = signals.filter(s => s.strength >= 65).length;

  // Group by category if showCategories
  const byCategory = showCategories
    ? CATEGORY_ORDER.reduce((acc, cat) => {
        const cells = sorted.filter(s => s.category === cat);
        if (cells.length) acc[cat] = cells;
        return acc;
      }, {} as Record<string, SignalCell[]>)
    : null;

  return (
    <div className="shg-wrap">

      {/* Header */}
      <div className="shg-header">
        <Activity className="w-3.5 h-3.5 shg-header-icon" />
        <p className="shg-header-label">{title}</p>
        <div className="shg-header-summary">
          <span className="shg-avg-label">AVG</span>
          <span className="shg-avg-num" style={{ color: strengthColor(avgStrength) }}>{avgStrength}</span>
          {hotCount > 0 && (
            <span className="shg-hot-badge">{hotCount} HOT</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="shg-legend">
        {[
          { label: 'Low',      color: '#10b981', range: '0–20'  },
          { label: 'Moderate', color: '#22d3ee', range: '21–40' },
          { label: 'Elevated', color: '#f59e0b', range: '41–60' },
          { label: 'High',     color: '#f97316', range: '61–80' },
          { label: 'Critical', color: '#dc2626', range: '80+'   },
        ].map(({ label, color, range }) => (
          <div key={label} className="shg-legend-item">
            <div className="shg-legend-dot" style={{ background: color }} />
            <span className="shg-legend-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      {byCategory
        ? Object.entries(byCategory).map(([cat, cells]) => (
            <div key={cat} className="shg-category-section">
              <p className="shg-category-label" style={{ color: CAT_COLORS[cat]?.accent ?? 'var(--alpha-text-35)' }}>
                {CAT_COLORS[cat]?.label ?? cat}
              </p>
              <div className="shg-grid">
                {cells.map((cell, i) => (
                  <SignalCellCard key={cell.key} cell={cell} delay={i * 0.04} />
                ))}
              </div>
            </div>
          ))
        : (
          <div className="shg-grid">
            {sorted.map((cell, i) => (
              <SignalCellCard key={cell.key} cell={cell} delay={i * 0.035} />
            ))}
          </div>
        )
      }
    </div>
  );
};

export default SignalHeatGrid;
