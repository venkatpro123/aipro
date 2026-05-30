// useTilt.ts — pointer-parallax depth for the perceived-intelligence layers.
//
// Tilts an element toward the cursor on separate Z-planes and tracks a fixed
// specular highlight. Pure presentation: transform + opacity only (GPU), spring
// damped with the HumanProof motion signature (no overshoot).
//
// Hard-gated: returns an inert binding when the user prefers reduced motion OR
// the pointer is coarse (touch). Depth is sugar, never required to read a value.

import { useEffect, useState } from 'react';
import {
  useSpring,
  useMotionTemplate,
  useReducedMotion,
  type MotionStyle,
  type MotionValue,
} from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { springTilt } from './motion';

export interface UseTiltOptions {
  /** Max rotation in degrees on each axis. */
  maxDeg?: number;
  /** Force-disable (e.g. while a card is collapsed). */
  disabled?: boolean;
  /** 3D perspective in px (defaults to the global --depth-perspective ≈ 900). */
  perspective?: number;
}

export interface UseTiltResult {
  /** Spread onto the tilting element: `{...bind()}`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind: (...args: any[]) => any;
  /** Motion style (rotateX/rotateY/perspective) — empty object when inert. */
  style: MotionStyle;
  /** Pointer-tracked specular gradient for an overlay layer. */
  glare: MotionValue<string>;
  /** Whether tilt is actually live (fine pointer + motion allowed). */
  active: boolean;
}

export function useTilt(options: UseTiltOptions = {}): UseTiltResult {
  const { maxDeg = 4, disabled = false, perspective = 900 } = options;
  const reduce = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const active = !disabled && !reduce && finePointer;

  // Springs settle without a bounce (springTilt is over-damped).
  const rotateX = useSpring(0, springTilt);
  const rotateY = useSpring(0, springTilt);
  const glareX = useSpring(50, springTilt);
  const glareY = useSpring(50, springTilt);

  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, var(--specular-strong), transparent 45%)`;

  const reset = () => {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  };

  const bind = useGesture(
    {
      onMove: ({ event }) => {
        const el = (event?.currentTarget ?? null) as HTMLElement | null;
        if (!el || typeof el.getBoundingClientRect !== 'function') return;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const pe = event as unknown as { clientX: number; clientY: number };
        const px = Math.min(1, Math.max(0, (pe.clientX - rect.left) / rect.width));
        const py = Math.min(1, Math.max(0, (pe.clientY - rect.top) / rect.height));
        rotateY.set((px - 0.5) * 2 * maxDeg);
        rotateX.set(-(py - 0.5) * 2 * maxDeg);
        glareX.set(px * 100);
        glareY.set(py * 100);
      },
      onHover: ({ hovering }) => {
        if (!hovering) reset();
      },
    },
    { enabled: active },
  );

  const style: MotionStyle = active
    ? { rotateX, rotateY, transformPerspective: perspective, transformStyle: 'preserve-3d' }
    : {};

  return { bind, style, glare, active };
}

export default useTilt;
