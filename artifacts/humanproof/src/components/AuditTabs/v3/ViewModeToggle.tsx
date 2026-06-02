// ViewModeToggle.tsx
//
// Two-segment animated pill toggle that switches between Guidance Mode
// (compressed expert-advisor view) and Intelligence Mode (full 6-tab analysis).
//
// Design:
//   • Animated selection indicator using framer-motion layoutId so the active
//     pill slides smoothly between segments rather than cutting.
//   • Emergency de-emphasis: when score ≥ 80 or WARN active, the toggle dims
//     to 50% opacity and shows a "Focus mode" tooltip — still usable but
//     visually deprioritised so the user stays focused on the critical state.
//   • Compact: ~130px wide, lives in the sticky header above the tab bar.

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Zap } from 'lucide-react';
import type { ViewMode } from '../../../hooks/useViewMode';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onToggle: () => void;
  emergencyMode?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onToggle,
  emergencyMode = false,
}) => {
  const segments: { value: ViewMode; label: string; Icon: React.ElementType }[] = [
    { value: 'guidance', label: 'Guided',     Icon: Eye },
    { value: 'beast',    label: 'Beast Mode', Icon: Zap },
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
              onClick={onToggle}
              aria-pressed={isActive}
              aria-label={`Switch to ${label} mode`}
              className="relative flex items-center gap-1.5 px-3 py-1 rounded-full z-10 transition-colors"
              style={{
                color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
              }}
            >
              {/* Animated selection pill — slides under the active segment */}
              {isActive && (
                <motion.span
                  layoutId="view-mode-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#00d4e0', zIndex: -1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                />
              )}
              <Icon
                className="w-3 h-3 flex-shrink-0"
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
