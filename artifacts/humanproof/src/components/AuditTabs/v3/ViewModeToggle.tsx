// ViewModeToggle.tsx
//
// Three-segment animated pill toggle: Guided → Analysis → Beast Mode.
//
// Design:
//   • Animated selection indicator using framer-motion layoutId so the active
//     pill slides smoothly between segments rather than cutting.
//   • Emergency de-emphasis: when score ≥ 80 or WARN active, the toggle dims
//     to 50% opacity — still usable but visually deprioritised.
//   • Mobile: icon-only segments (≤ 480px) to save header space.
//   • Desktop: icon + label on each segment.

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, BarChart2, Zap } from 'lucide-react';
import type { ViewMode } from '../../../hooks/useViewMode';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  emergencyMode?: boolean;
  /** When true, renders icon-only segments regardless of screen width */
  compact?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onSelect,
  emergencyMode = false,
  compact = false,
}) => {
  const segments: { value: ViewMode; label: string; Icon: React.ElementType }[] = [
    { value: 'guidance', label: 'Guided',   Icon: Eye },
    { value: 'analysis', label: 'Analysis', Icon: BarChart2 },
    { value: 'beast',    label: 'Beast',    Icon: Zap },
  ];

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{ opacity: emergencyMode ? 0.5 : 1, transition: 'opacity 0.2s' }}
      title={emergencyMode ? 'Focus mode — switch views when ready' : undefined}
    >
      <div
        className="relative flex items-center rounded-full gap-0"
        style={{
          background: 'var(--alpha-bg-06)',
          border: '1px solid var(--alpha-bg-08)',
          padding: '2px',
        }}
      >
        {segments.map(({ value, label, Icon }) => {
          const isActive = viewMode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              aria-pressed={isActive}
              aria-label={`Switch to ${label} mode`}
              className="relative flex items-center justify-center rounded-full z-10 transition-colors"
              style={{
                color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                // Compact = icon-only: square 28px tap target
                // Full = icon + label with horizontal padding
                minWidth: compact ? 28 : undefined,
                height: 26,
                padding: compact ? '0 6px' : '0 10px',
                gap: compact ? 0 : 4,
                fontSize: '10px',
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="view-mode-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#00d4e0', zIndex: -1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                />
              )}
              <Icon
                style={{
                  width: 11,
                  height: 11,
                  flexShrink: 0,
                  color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                }}
              />
              {/* Show abbreviated label on phones, full label on larger screens */}
              {!compact && (
                <span className="vmt-label">{label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewModeToggle;
