// Tilt3D.tsx — thin wrapper that applies useTilt() to its children.
//
// Gives a surface genuine pointer-parallax depth + a fixed-light specular
// highlight, with zero effect under reduced-motion / coarse pointers. Used by
// the score instrument and the 3 hero cards only (restraint by design).

import React from 'react';
import { motion } from 'framer-motion';
import { useTilt } from './useTilt';

interface Tilt3DProps {
  /** Max tilt in degrees (defaults to the hero-card 4°). */
  maxDeg?: number;
  /** Disable tilt (e.g. collapsed card). */
  disabled?: boolean;
  /** Show the pointer-tracked specular glare overlay. */
  glare?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const Tilt3D: React.FC<Tilt3DProps> = ({
  maxDeg = 4,
  disabled = false,
  glare = true,
  className,
  style,
  children,
}) => {
  const { bind, style: tiltStyle, glare: glareBg, active } = useTilt({ maxDeg, disabled });

  return (
    <motion.div
      {...bind()}
      className={className}
      style={{ position: 'relative', ...style, ...tiltStyle }}
    >
      {children}
      {active && glare && (
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: glareBg,
            opacity: 0.6,
            mixBlendMode: 'soft-light',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
    </motion.div>
  );
};

export default Tilt3D;
