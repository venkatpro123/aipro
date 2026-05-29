// RiskUpdateBanner.tsx — Wave 1.4 Breaking News → Re-Audit Bridge
//
// Slides in from top when breaking news triggers potential re-analysis.
// Previously: breakingNewsBroker.ts polls every 30 min, triggers NOTHING.
//
// This banner:
//   1. Appears when BreakingNewsBanner detects a company signal
//   2. Shows the news headline with a "Updating your score..." indicator
//   3. Auto-dismiss with "N risk pts — see what changed"
//   4. CTA: "Re-analyze now" triggers a fresh audit

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, X, RefreshCw } from 'lucide-react';

interface Props {
  companyName: string;
  headline: string;
  onReanalyze: () => void;
  onDismiss: () => void;
  isReanalyzing?: boolean;
}

export const RiskUpdateBanner: React.FC<Props> = ({
  companyName, headline, onReanalyze, onDismiss, isReanalyzing = false,
}) => {
  const [pulse, setPulse] = useState(true);

  // Stop pulsing after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="rounded-xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(34,211,238,0.10), rgba(34,211,238,0.04))',
          border: '1px solid rgba(34,211,238,0.28)',
        }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          {/* Live indicator */}
          <div className="relative flex-shrink-0">
            <Radio className="w-4 h-4" style={{ color: '#22d3ee' }} />
            {pulse && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ background: 'rgba(34,211,238,0.25)' }}
              />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black tracking-[0.16em] mb-0.5" style={{ color: 'rgba(34,211,238,0.65)' }}>
              NEW SIGNAL DETECTED · {companyName.toUpperCase()}
            </p>
            <p className="text-[11px] font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>
              {headline}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={onReanalyze}
            disabled={isReanalyzing}
            className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex-shrink-0 transition-all hover:scale-[1.03]"
            style={{
              background: 'rgba(34,211,238,0.18)',
              color: '#22d3ee',
              border: '1px solid rgba(34,211,238,0.35)',
              opacity: isReanalyzing ? 0.6 : 1,
            }}
          >
            {isReanalyzing ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                Update score
              </>
            )}
          </button>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="flex-shrink-0 opacity-35 hover:opacity-70 transition-opacity"
          >
            <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.80)' }} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RiskUpdateBanner;
