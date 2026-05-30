// AuditLoader.tsx — unified loading state for all audit pipeline stages.
// Replaces SpyLoadingState, EnsembleLoadingState, and TabLoader.
// All styling via CSS utility classes from index.css Phase 1E.

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface Props {
  /** -1=spinner only, 0-5=pipeline stage index */
  stage: number;
  companyName?: string;
  limitedDataMode?: boolean;
  limitedDataReason?: string;
}

const STAGES = [
  { icon: '⚡', short: 'Company',    text: 'Resolving company identity…',       sub: 'Entity resolution · exchange lookup · alias matching',   state: 'scanning'    },
  { icon: '📡', short: 'Market',     text: 'Fetching live financial signals…',  sub: 'Yahoo Finance · SEC filings · Finnhub API',              state: 'scanning'    },
  { icon: '🔍', short: 'Peers',      text: 'Scanning job market activity…',     sub: 'Adzuna · LinkedIn · Naukri · hiring velocity signals',   state: 'scanning'    },
  { icon: '📋', short: 'Role',       text: 'Checking regulatory filings…',      sub: 'WARN Act · SEC EDGAR · public financial disclosures',    state: 'processing'  },
  { icon: '🧠', short: 'Synthesis',  text: 'Running 54-layer intelligence…',    sub: 'Comparing 200+ peer companies · role displacement model', state: 'processing' },
  { icon: '✓',  short: 'Prediction', text: 'Finalizing confidence model…',      sub: 'Bayesian calibration · confidence intervals',            state: 'done'        },
] as const;

const FACTOIDS = [
  'Checking 12 RSS news sources…',
  'Comparing 200+ peer companies…',
  'Applying sector contagion model…',
  'Running AI displacement scoring…',
  'Calculating empirical calibration…',
  'Cross-referencing layoff history…',
  'Scanning 30 live swarm signals…',
  'Resolving industry classification…',
];

// Map legacy 0-4 ensembleStage → 0-5 AuditLoader stage
export const mapEnsembleStage = (s: number): number => {
  const MAP = [0, 1, 3, 4, 5];
  return MAP[Math.min(Math.max(s, 0), MAP.length - 1)];
};

export const AuditLoader: React.FC<Props> = ({ stage, companyName, limitedDataMode, limitedDataReason }) => {
  const [factoidIdx, setFactoidIdx] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const iv = setInterval(() => setFactoidIdx(i => (i + 1) % FACTOIDS.length), 2400);
    return () => clearInterval(iv);
  }, []);

  // Spinner-only variant for tab Suspense fallbacks
  if (stage === -1) {
    return (
      <div className="audit-loader" style={{ minHeight: 200 }}>
        <div className="w-7 h-7 rounded-full border-2 border-[rgba(0,212,224,0.15)] border-t-[var(--cyan)] animate-spin" />
        <p className="audit-loader-stage-text">Loading…</p>
      </div>
    );
  }

  const clamped = Math.min(Math.max(stage, 0), STAGES.length - 1);
  const current = STAGES[clamped];

  return (
    <div className="audit-loader">
      {companyName && (
        <AnimatePresence>
          <motion.p
            className="audit-loader-company"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            Analyzing <span className="company-highlight">{companyName}</span>
          </motion.p>
        </AnimatePresence>
      )}

      {/* Stage icon */}
      <div className={`audit-loader-icon ${current.state}`}>
        {current.icon}
      </div>

      {/* Stage text — fades between stages */}
      <AnimatePresence mode="wait">
        <motion.p
          key={clamped}
          className="audit-loader-stage-text"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.22 }}
        >
          {current.text}
        </motion.p>
      </AnimatePresence>

      {/* Global Intelligence Assembly — the pipeline constructing the result.
          Fill advances per stage; signal particles flow toward the prediction
          and collapse on the final stage (the loader→score hand-off). */}
      <div className={`intel-assembly${clamped >= STAGES.length - 1 ? ' converging' : ''}`}>
        <div className="intel-assembly-track">
          <div
            className="intel-assembly-fill"
            style={{ width: `${(clamped / (STAGES.length - 1)) * 100}%` }}
          />
          {!reduce && [0, 1, 2].map(p => (
            <span
              key={p}
              className="intel-particle"
              style={{ animationDelay: `${p * 0.7}s` }}
            />
          ))}
        </div>
        <div className="intel-assembly-nodes">
          {STAGES.map((s, i) => (
            <div
              key={i}
              className={`intel-assembly-node${i === clamped ? ' active' : i < clamped ? ' done' : ''}`}
            >
              <span className="intel-assembly-node-dot" />
              <span className="intel-assembly-node-label">{s.short}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rotating factoid */}
      <AnimatePresence mode="wait">
        <motion.p
          key={factoidIdx}
          className="audit-loader-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {current.sub}
        </motion.p>
      </AnimatePresence>

      {/* Limited data banner */}
      {limitedDataMode && (
        <div className="signal-card" data-tone="amber" style={{ maxWidth: 380, textAlign: 'left' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>LIMITED PUBLIC DATA</p>
          <p style={{ fontSize: '0.7rem', opacity: 0.85 }}>
            {limitedDataReason ?? 'No public exchange listing, WARN Act, or SEC filings. Analysis uses registry, news, and hiring signals.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditLoader;
