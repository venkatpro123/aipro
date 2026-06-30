// VisualRiskDriversMap.tsx — Phase 1 Visual Content Transformation
//
// Visual risk driver breakdown replacing the text-heavy TopDriversStrip.
// Shows risk dimensions as a visual stacked-bar + node map so users understand
// the COMPOSITION of their risk at a glance — without reading a paragraph.
//
// Layout:
//   • Horizontal stacked bar — weighted contribution of each driver
//   • Driver node row — each dimension as a color-coded chip with score bar
//   • Interactive: tap a chip to expand the "why" reasoning

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface DriverItem {
  key:   string;
  label: string;
  score: number;  // 0–100
  why?:  string;  // one-sentence explanation
  weight?: number; // 0-1 contribution weight (optional)
}

interface Props {
  drivers: DriverItem[];
  title?: string;
}

function driverColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 55) return '#f97316';
  if (score >= 35) return '#f59e0b';
  return '#10b981';
}

function driverBg(score: number): string {
  if (score >= 75) return 'rgba(220,38,38,0.08)';
  if (score >= 55) return 'rgba(249,115,22,0.07)';
  if (score >= 35) return 'rgba(245,158,11,0.07)';
  return 'rgba(16,185,129,0.07)';
}

function driverBorder(score: number): string {
  if (score >= 75) return 'rgba(220,38,38,0.22)';
  if (score >= 55) return 'rgba(249,115,22,0.20)';
  if (score >= 35) return 'rgba(245,158,11,0.18)';
  return 'rgba(16,185,129,0.18)';
}

export const VisualRiskDriversMap: React.FC<Props> = ({ drivers, title = 'RISK DRIVERS' }) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!drivers || drivers.length === 0) return null;

  // Total score for normalizing stacked bar widths
  const totalScore = drivers.reduce((s, d) => s + d.score, 0) || 1;

  return (
    <motion.div
      className="vrd-wrap"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Section label */}
      <p className="vrd-section-label">{title}</p>

      {/* Stacked risk composition bar */}
      <div className="vrd-stack-bar" aria-label="Risk driver composition">
        {drivers.map((d, i) => {
          const width = (d.score / totalScore) * 100;
          const color  = driverColor(d.score);
          return (
            <motion.button
              key={d.key}
              type="button"
              title={`${d.label}: ${d.score}`}
              className="vrd-stack-segment"
              style={{
                width: `${width}%`,
                background: color,
                opacity: expanded === d.key ? 1 : 0.72,
                borderRight: i < drivers.length - 1 ? '1px solid var(--alpha-bg-08)' : 'none',
                filter: expanded === d.key ? `drop-shadow(0 0 4px ${color}88)` : undefined,
              }}
              onClick={() => setExpanded(expanded === d.key ? null : d.key)}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </div>

      {/* Driver nodes */}
      <div className="vrd-nodes">
        {drivers.map((d, i) => {
          const color  = driverColor(d.score);
          const bg     = driverBg(d.score);
          const border = driverBorder(d.score);
          const isOpen = expanded === d.key;

          return (
            <motion.div
              key={d.key}
              className="vrd-node"
              style={{ background: bg, borderColor: border }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04, duration: 0.30 }}
            >
              {/* Node header */}
              <button
                type="button"
                className="vrd-node-header"
                onClick={() => setExpanded(isOpen ? null : d.key)}
                aria-expanded={isOpen}
              >
                {/* Score badge */}
                <span
                  className="vrd-score-badge"
                  style={{ color, background: `${color}14`, borderColor: `${color}28` }}
                >
                  {d.score}
                </span>

                {/* Label */}
                <span className="vrd-node-label">{d.label}</span>

                {/* Mini bar */}
                <div className="vrd-mini-bar-wrap">
                  <motion.div
                    className="vrd-mini-bar-fill"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.score}%` }}
                    transition={{ delay: 0.20 + i * 0.05, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                {d.why && (
                  <ChevronDown
                    className={`vrd-chevron${isOpen ? ' vrd-chevron--open' : ''}`}
                  />
                )}
              </button>

              {/* Expandable reason */}
              <AnimatePresence initial={false}>
                {isOpen && d.why && (
                  <motion.div
                    className="vrd-node-reason"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.20 }}
                  >
                    <p className="vrd-reason-text">{d.why}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default VisualRiskDriversMap;
