// BrandedLoader.tsx — P3 Premium
//
// Replaces generic spinner with an animated HumanProof branded loader.
// Shows the logo dot with expanding pulse rings and a status message.
// Used as Suspense fallback and page transition indicator.

import React from 'react';
import { motion } from 'framer-motion';

interface BrandedLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { dot: 6, ring: 20, text: '9px', gap: 8 },
  md: { dot: 8, ring: 32, text: '10px', gap: 12 },
  lg: { dot: 10, ring: 44, text: '11px', gap: 16 },
};

export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
  message = 'Loading…',
  size = 'md',
}) => {
  const s = SIZES[size];

  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: size === 'lg' ? '30vh' : undefined }}>
      {/* Animated rings + dot */}
      <div className="relative flex items-center justify-center" style={{ width: s.ring * 2.5, height: s.ring * 2.5 }}>
        {/* Outer ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: s.ring * 2.2,
            height: s.ring * 2.2,
            border: '1px solid rgba(0,212,224,0.15)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: s.ring * 1.5,
            height: s.ring * 1.5,
            border: '1px solid rgba(0,212,224,0.25)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        {/* Inner ring */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: s.ring,
            height: s.ring,
            border: '1.5px solid rgba(0,212,224,0.40)',
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.8, 0.35, 0.8],
          }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        {/* Center dot */}
        <motion.div
          className="rounded-full"
          style={{
            width: s.dot,
            height: s.dot,
            background: 'var(--cyan, #00d4e0)',
            boxShadow: '0 0 12px rgba(0,212,224,0.4)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [
              '0 0 8px rgba(0,212,224,0.3)',
              '0 0 20px rgba(0,212,224,0.6)',
              '0 0 8px rgba(0,212,224,0.3)',
            ],
          }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      {/* Status text */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="font-medium"
        style={{
          fontSize: s.text,
          color: 'var(--alpha-text-35)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em',
        }}
      >
        {message}
      </motion.span>
    </div>
  );
};

export default BrandedLoader;
