// AdaptiveBlock.tsx — v34.0 UX redesign
//
// A single collapsible section primitive used across all v34 tabs. Carries:
//   • Tier badge (visual indicator of the progressive-disclosure tier)
//   • Severity dot (when applicable — drives sort + emphasis)
//   • Open/close animation with prefers-reduced-motion fallback
//   • Sticky-feeling border that brightens on hover
//
// This standardises the "look" across Summary / Company / Protection / Action
// Plan / Intelligence tabs so a user's visual language stays constant.

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import TierBadge from './TierBadge';
import { track } from '../../../services/analyticsService';

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  tier?: 1 | 2 | 3 | 4 | 5;
  accentColor?: string;
  /** When true, opens by default. */
  defaultOpen?: boolean;
  /** Status text on the right of the header. */
  badge?: string;
  badgeColor?: string;
  /** Render the block as "no data" — disabled state. */
  empty?: boolean;
  /** When true, removes inner padding (for nesting). */
  flush?: boolean;
  children?: React.ReactNode;
}

export const AdaptiveBlock: React.FC<Props> = ({
  title, subtitle, icon: Icon, tier, accentColor = '#22d3ee',
  defaultOpen = false, badge, badgeColor, empty, flush, children,
}) => {
  const [open, setOpen] = useState(defaultOpen && !empty);
  const toggle = useCallback(() => {
    if (empty) return;
    setOpen(o => {
      track('panel_toggled', { panel: title, open: !o, tier });
      return !o;
    });
  }, [empty, title, tier]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${open ? accentColor + '35' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.18s ease',
      }}
    >
      <button
        onClick={toggle}
        disabled={empty}
        aria-expanded={open}
        className="w-full px-3 py-3 sm:px-4 sm:py-3.5 flex items-center gap-2 sm:gap-3 text-left min-h-[48px]"
        style={{ cursor: empty ? 'default' : 'pointer' }}
      >
        {/* Accent rail */}
        <div
          className="w-0.5 h-7 rounded-full flex-shrink-0"
          style={{ background: empty ? 'rgba(255,255,255,0.10)' : accentColor }}
        />
        {Icon && (
          <Icon
            className="w-4 h-4 flex-shrink-0"
            style={{ color: empty ? 'rgba(255,255,255,0.20)' : accentColor + 'cc' }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className="text-[12px] font-bold leading-tight sm:truncate"
              style={{ color: empty ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.85)' }}
            >
              {title}
            </p>
            {/* tier badge hidden — internal disclosure metadata, not user-facing */}
          </div>
          {(subtitle || empty) && (
            <div
              className="text-[10px] leading-tight mt-0.5 flex items-center gap-1"
              style={{ color: 'var(--alpha-text-35)' }}
            >
              {empty ? 'No data available' : subtitle}
            </div>
          )}
        </div>
        {badge && !empty && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: (badgeColor ?? accentColor) + '22',
              color: badgeColor ?? accentColor,
              border: `1px solid ${badgeColor ?? accentColor}35`,
            }}
          >
            {badge}
          </span>
        )}
        {!empty && (
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--alpha-text-30)' }} />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !empty && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className={flush ? '' : 'px-3 pt-3 pb-3 space-y-3'}
              style={{ borderTop: `1px solid ${accentColor}1f` }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdaptiveBlock;
