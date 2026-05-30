// motion.ts — HumanProof AI Signature Motion Language
//
// One motion identity for the perceived-intelligence layers. Motion must read
// DELIBERATE, PRECISE, ANALYTICAL, CONFIDENT — an intelligence platform, not a
// playful landing page. Therefore: smooth, controlled easing and critically /
// over-damped springs only. NO bounce, NO elastic, NO overshoot.
//
// These presets replace the spring-back easings (e.g. cubic-bezier with a >1
// overshoot control point, or low-damping springs) in the touched components.
// Import from here instead of hand-writing transitions so every new surface
// moves with the same signature.

import type { Transition } from 'framer-motion';

/**
 * Controlled-acceleration easing — the canonical HumanProof curve. Eases out
 * firmly with zero overshoot (matches the CSS `--ease-out` token).
 */
export const EASE_SIGNATURE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Symmetric ease for state crossfades (matches CSS `--ease-in-out`). */
export const EASE_INOUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** A precise, over-damped spring — settles without a single bounce. */
export const springPrecise: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 32,
  mass: 0.9,
};

/** Snappier variant for pointer-tracked tilt — still zero overshoot. */
export const springTilt: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 0.6,
};

/** Standard timed transition for fades / reveals. */
export const transitionBase: Transition = { duration: 0.32, ease: EASE_SIGNATURE };

/** Quick transition for micro-feedback (chips, labels). */
export const transitionFast: Transition = { duration: 0.2, ease: EASE_SIGNATURE };

/** Deliberate transition for the score-arc / instrument settle. */
export const transitionInstrument: Transition = { duration: 1.1, ease: EASE_SIGNATURE };

/**
 * A staggered "intelligence assembling" container preset — children resolve in
 * a steady, confident cadence (used by the loader + reveal). No spring bounce.
 */
export const staggerAssembly = (stagger = 0.08): Transition => ({
  staggerChildren: stagger,
  delayChildren: 0.05,
});

/** Reusable enter variant: rises a few px and resolves — never springs past. */
export const riseIn = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transitionBase },
  exit: { opacity: 0, y: -4, transition: transitionFast },
};
