// ViewModeToggle.tsx
//
// Three-segment animated pill toggle: Guided → Analysis → Beast Mode.
//
// Design:
//   • Animated selection indicator using framer-motion layoutId so the active
//     pill slides smoothly between segments rather than cutting.
//   • Emergency de-emphasis: when score ≥ 80 or WARN active, the toggle dims
//     to 50% opacity — still usable but visually deprioritised.
//   • ~180px wide to fit 3 labels. Lives in the sticky header.

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, BarChart2, Zap } from 'lucide-react';
import type { ViewMode } from '../../../hooks/useViewMode';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  emergencyMode?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onSelect,
  emergencyMode = false,
}) => {
  const segments: { value: ViewMode; label: string; Icon: React.ElementType }[] = [
    { value: 'guidance', label: 'Guided',   Icon: Eye },
    { value: 'analysis', label: 'Analysis', Icon: BarChart2 },
    { value: 'beast',    label: 'Beast',    Icon: Zap },
  ];

  return (
    <div
      className="flex items-center"
      style={{ opacity: emergencyMode ? 0.5 : 1, transition: 'opacity 0.2s' }}
      title={emergencyMode ? 'Focus mode — switch views when ready' : undefined}
    >
      <div
        className="relative flex items-center rounded-full p-0.5 gap-0"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
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
              className="relative flex items-center gap-1 px-2.5 py-1 rounded-full z-10 transition-colors"
              style={{
                color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
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
                className="w-2.5 h-2.5 flex-shrink-0"
                style={{ color: isActive ? '#000' : 'rgba(255,255,255,0.45)' }}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewModeToggle;
