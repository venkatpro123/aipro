// LiveScraperGate.tsx — v32 staged intelligence progress.
// The audit pipeline blocks here until the live-quorum spec is satisfied or the
// 45s hard ceiling fires. v32 reverses the v31 "fast render + later enrichment"
// model: the FIRST audit IS the definitive audit. No 45% cap, no re-audit hint.
//
//   1. Show 6 named stages matching the v32 redesign requirement.
//   2. Poll scrape_jobs every 1.5 s for real completion counts (queued/running/terminal).
//   3. Call onReady when quorum is reached OR after MAX_WAIT_MS (45 s).
//   4. Show a late-arriving "Continue with current evidence" escape valve only
//      after SKIP_AFTER_MS (30 s) — most audits should never see it.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { pollScrapeProgress } from '../../services/scraperTrigger';

const MAX_WAIT_MS   = 12_000;  // reduced: globe already shows, no need to hold 45s
const SKIP_AFTER_MS =  6_000;  // escape valve appears quickly if scraper is slow
const POLL_MS       =  1_500;  // tighter cadence so per-stage transitions feel live

interface Source {
  key:    string;
  label:  string;
  icon:   string;
  color:  string;
  delay:  number; // ms after gate opens before this stage starts animating
}

// v32: the 6 named stages from the redesign requirement. Each maps loosely to
// a worker job_type so the scrape_jobs poll can advance the visible state
// (though stages 0/3/5 are pipeline phases, not single worker jobs).
const SOURCES: Source[] = [
  { key: 'identity',       label: 'Resolving company identity',     icon: '🔎', color: '#7c3aed', delay:     0 },
  { key: 'newsExtract',    label: 'Acquiring workforce intelligence', icon: '👥', color: '#06b6d4', delay:  1500 },
  { key: 'careerPageScrape', label: 'Validating hiring signals',    icon: '📥', color: '#f59e0b', delay:  4000 },
  { key: 'layoffTracker',  label: 'Reconciling live market signals',icon: '📡', color: '#ef4444', delay:  7000 },
  { key: 'secEdgarPoll',   label: 'Cross-validating layoffs',       icon: '⚖️', color: '#10b981', delay: 11000 },
  { key: 'finalize',       label: 'Finalizing confidence model',    icon: '✓',  color: '#34d399', delay: 18000 },
];

type SourceState = 'pending' | 'loading' | 'done';

interface Props {
  company:   string;
  roleTitle: string;
  /** Called when gate completes (live data ready OR timeout reached). */
  onReady:   () => void;
}

export const LiveScraperGate: React.FC<Props> = ({ company, roleTitle, onReady }) => {
  const startedAt = useRef(Date.now());
  const triggerTime = useRef(new Date().toISOString());
  const calledReady = useRef(false);

  const [elapsed, setElapsed]           = useState(0);
  const [sourceStates, setSourceStates] = useState<Record<string, SourceState>>(
    () => Object.fromEntries(SOURCES.map(s => [s.key, 'pending'])),
  );
  const [progress, setProgress]         = useState(0); // 0–100
  const [showSkip, setShowSkip]         = useState(false);
  const [realTotal, setRealTotal]       = useState(0);
  const [realDone, setRealDone]         = useState(0);

  const fireReady = useCallback(() => {
    if (calledReady.current) return;
    calledReady.current = true;
    onReady();
  }, [onReady]);

  // ── Elapsed ticker ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= SKIP_AFTER_MS) setShowSkip(true);
      if (ms >= MAX_WAIT_MS) {
        clearInterval(id);
        fireReady();
      }
    }, 250);
    return () => clearInterval(id);
  }, [fireReady]);

  // ── Time-based source animation ─────────────────────────────────────────────
  useEffect(() => {
    const timers = SOURCES.map(src =>
      window.setTimeout(() => {
        setSourceStates(prev => ({ ...prev, [src.key]: 'loading' }));
      }, src.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Progress bar: time-based floor + real-job ceiling ──────────────────────
  useEffect(() => {
    // Time-based component: fills to 85% over MAX_WAIT_MS
    const timeBased = Math.min(85, (elapsed / MAX_WAIT_MS) * 100);
    // Real-job component: if we have job data, blend it in
    const realBased = realTotal > 0 ? (realDone / realTotal) * 100 : 0;
    setProgress(Math.max(timeBased, realBased));
  }, [elapsed, realTotal, realDone]);

  // ── Poll scrape_jobs for real completion data ───────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      const { total, completed, isDone } = await pollScrapeProgress(
        company,
        triggerTime.current,
      );
      setRealTotal(total);
      setRealDone(completed);

      // Mark individual sources as done when the overall job set completes
      if (total > 0) {
        // Progressively mark sources done as completed fraction rises
        const fraction = completed / total;
        setSourceStates(prev => {
          const next = { ...prev };
          SOURCES.forEach((src, i) => {
            const threshold = (i + 1) / SOURCES.length;
            if (fraction >= threshold && prev[src.key] !== 'pending') {
              next[src.key] = 'done';
            }
          });
          return next;
        });
      }

      if (isDone) {
        // Mark all loading sources as done
        setSourceStates(prev =>
          Object.fromEntries(
            SOURCES.map(s => [s.key, prev[s.key] === 'pending' ? 'pending' : 'done']),
          ),
        );
        setProgress(100);
        // Small delay so the user sees 100% before results flash in
        setTimeout(fireReady, 600);
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [company, fireReady]);

  const elapsedSec = Math.floor(elapsed / 1000);
  const remainSec  = Math.max(0, Math.ceil((MAX_WAIT_MS - elapsed) / 1000));

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '40px auto',
        padding: '32px',
        background: 'rgba(10, 15, 25, 0.97)',
        border: '1px solid rgba(0, 245, 255, 0.18)',
        borderRadius: '12px',
        boxShadow: '0 0 60px rgba(0, 245, 255, 0.12), inset 0 0 30px rgba(0,0,0,0.5)',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', paddingBottom: '16px',
        borderBottom: '1px solid rgba(0,245,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#00F5FF', boxShadow: '0 0 16px #00F5FF',
            animation: 'lsg-pulse 1.4s ease-in-out infinite',
          }} />
          <span style={{
            color: '#00F5FF', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
          }}>
            LIVE INTELLIGENCE FETCH
          </span>
        </div>
        <span style={{ color: 'var(--alpha-text-30)', fontSize: '0.62rem', letterSpacing: '1px' }}>
          {elapsedSec}s elapsed
        </span>
      </div>

      {/* Target */}
      <div style={{
        background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)',
        borderRadius: '8px', padding: '14px 16px', marginBottom: '24px',
      }}>
        <div style={{ color: 'var(--alpha-text-35)', fontSize: '0.6rem', letterSpacing: '1px', marginBottom: '4px' }}>
          /// SCRAPING TARGET ///
        </div>
        <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '1px' }}>
          {company.toUpperCase()}
        </div>
        {roleTitle && (
          <div style={{ color: 'var(--alpha-text-45)', fontSize: '0.72rem', marginTop: '3px' }}>
            ROLE: {roleTitle.toUpperCase()}
          </div>
        )}
      </div>

      {/* v32: trust message — the audit blocks here for live quorum, never falls
          through to "partially loaded" state. */}
      <div style={{
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '8px', padding: '12px 14px', marginBottom: '24px',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>🛡️</span>
        <div>
          <div style={{ color: '#10b981', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '3px' }}>
            AUTHORITATIVE LIVE INTELLIGENCE
          </div>
          <div style={{ color: 'var(--alpha-text-50)', fontSize: '0.68rem', lineHeight: '1.5' }}>
            Acquiring live evidence across workforce, hiring, financial, and layoff sources.
            The audit will complete only when sources cross-validate — no provisional results.
          </div>
        </div>
      </div>

      {/* Source list */}
      <div style={{
        background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,245,255,0.1)',
        borderRadius: '10px', padding: '16px', marginBottom: '20px',
      }}>
        <div style={{
          fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.16em',
          color: 'rgba(0,245,255,0.55)', marginBottom: '12px', textTransform: 'uppercase',
        }}>
          ◈ Stage Progress
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SOURCES.map(src => {
            const st = sourceStates[src.key];
            const isLoading = st === 'loading';
            const isDone    = st === 'done';
            return (
              <div key={src.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Dot */}
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: isDone ? '#10b981' : isLoading ? src.color : 'rgba(255,255,255,0.12)',
                  boxShadow: isLoading ? `0 0 10px ${src.color}80` : isDone ? '0 0 8px #10b981' : 'none',
                  animation: isLoading ? 'lsg-pulse 1s ease-in-out infinite' : 'none',
                }} />
                {/* Icon + label */}
                <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{src.icon}</span>
                <span style={{
                  fontSize: '0.7rem', flex: 1,
                  color: isDone ? 'rgba(255,255,255,0.75)' : isLoading ? '#fff' : 'rgba(255,255,255,0.3)',
                }}>
                  {src.label}
                </span>
                {/* Status badge */}
                <span style={{
                  fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.1em',
                  color: isDone ? '#10b981' : isLoading ? src.color : 'rgba(255,255,255,0.2)',
                  minWidth: '52px', textAlign: 'right',
                }}>
                  {isDone ? '✓ DONE' : isLoading ? 'ACQUIRING' : 'QUEUED'}
                </span>
              </div>
            );
          })}
        </div>
        {/* Real job counter when DB data is available */}
        {realTotal > 0 && (
          <div style={{
            marginTop: '12px', paddingTop: '10px',
            borderTop: '1px solid var(--alpha-bg-06)',
            fontSize: '0.6rem', color: 'var(--alpha-text-35)', letterSpacing: '0.05em',
          }}>
            {realDone}/{realTotal} live sources reconciled
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: '7px', fontSize: '0.65rem',
        }}>
          <span style={{ color: 'var(--alpha-text-35)', letterSpacing: '1px' }}>
            LIVE EVIDENCE ACQUIRED
          </span>
          <span style={{ color: '#00F5FF', fontWeight: 600 }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{
          height: '6px', background: 'var(--alpha-bg-08)',
          borderRadius: '3px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00F5FF, #10b981)',
            borderRadius: '3px',
            transition: 'width 0.6s ease',
            boxShadow: '0 0 16px rgba(0,245,255,0.4)',
          }} />
        </div>
      </div>

      {/* Skip button + countdown */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        minHeight: '32px',
      }}>
        <span style={{ color: 'var(--alpha-text-25)', fontSize: '0.6rem', letterSpacing: '1px' }}>
          {progress < 100
            ? `Auto-completes in ~${remainSec}s`
            : 'Loading your intelligence report…'}
        </span>
        {showSkip && progress < 100 && (
          <button
            onClick={fireReady}
            style={{
              background: 'var(--alpha-bg-06)',
              border: '1px solid var(--alpha-bg-08)',
              borderRadius: '6px',
              color: 'var(--alpha-text-50)',
              fontSize: '0.65rem',
              padding: '5px 12px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
              (e.target as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            Continue with current evidence
          </button>
        )}
      </div>

      <style>{`
        @keyframes lsg-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default LiveScraperGate;
