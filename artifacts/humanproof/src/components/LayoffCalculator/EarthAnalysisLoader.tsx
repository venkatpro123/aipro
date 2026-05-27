// EarthAnalysisLoader.tsx — Cinematic Earth AI Analysis Animation
//
// Replaces the text-only AuditLoader with a premium global-intelligence
// visualization: a rotating Earth with orbital rings, a radar scan sweep,
// and a Canvas-based particle signal network overlaid on the globe surface.
//
// Visual layers (bottom → top):
//   1. .earth-loader-shell   — deep-space radial gradient container
//   2. Company name pill
//   3. .earth-globe-wrap     — SVG globe + orbit rings + scan sweep + canvas
//   4. Stage headline (AnimatePresence key={stage})
//   5. Rotating factoid (AnimatePresence key={factoidIdx})
//   6. 6-dot pipeline progress track
//   7. Limited-data banner (conditional)
//
// Props match AuditLoader exactly for zero-friction drop-in replacement.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  /** 0-5 = pipeline stage index. -1 not used here (AuditLoader handles it). */
  stage: number;
  companyName?: string;
  limitedDataMode?: boolean;
  limitedDataReason?: string;
}

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGE_META = [
  { icon: '⚡', text: 'Resolving company identity…',       short: 'Identity',   sub: 'Entity resolution · exchange lookup · alias matching' },
  { icon: '📡', text: 'Fetching live financial signals…',  short: 'Financials', sub: 'Yahoo Finance · SEC filings · Finnhub API' },
  { icon: '🔍', text: 'Scanning job market activity…',     short: 'Jobs',       sub: 'Adzuna · LinkedIn · Naukri · hiring velocity' },
  { icon: '📋', text: 'Checking regulatory filings…',      short: 'Filings',    sub: 'WARN Act · SEC EDGAR · public disclosures' },
  { icon: '🧠', text: 'Running 54-layer intelligence…',    short: 'AI Engine',  sub: '200+ peer companies · role displacement model' },
  { icon: '✓',  text: 'Finalizing confidence model…',      short: 'Complete',   sub: 'Bayesian calibration · confidence intervals' },
] as const;

const FACTOIDS = [
  'Scanning 12 global RSS news sources…',
  'Benchmarking against 200+ peer companies…',
  'Applying sector contagion model…',
  'Running AI displacement scoring…',
  'Computing empirical risk calibration…',
  'Cross-referencing layoff history…',
  'Processing 30 live swarm signals…',
  'Resolving industry classification…',
  'Mapping global hiring velocity…',
  'Correlating WARN Act filings…',
];

// ── Globe SVG ────────────────────────────────────────────────────────────────
// Pure inline SVG: sphere gradient + lat/lon grid + continent blobs +
// atmosphere rim. No external assets, no network requests.

const GlobeSVG: React.FC = () => (
  <svg
    viewBox="0 0 280 280"
    className="earth-globe-svg"
    aria-hidden="true"
    role="img"
    aria-label="Rotating Earth globe — AI data analysis in progress"
  >
    <defs>
      {/* Main sphere body */}
      <radialGradient id="eal-globe-body" cx="38%" cy="34%" r="62%">
        <stop offset="0%"   stopColor="#1a3a5c" />
        <stop offset="30%"  stopColor="#0e2240" />
        <stop offset="65%"  stopColor="#071526" />
        <stop offset="88%"  stopColor="#040d18" />
        <stop offset="100%" stopColor="#020810" />
      </radialGradient>

      {/* Atmosphere / rim light */}
      <radialGradient id="eal-atmos" cx="50%" cy="50%" r="50%">
        <stop offset="72%"  stopColor="transparent" />
        <stop offset="90%"  stopColor="rgba(0,180,210,0.10)" />
        <stop offset="100%" stopColor="rgba(0,212,224,0.22)" />
      </radialGradient>

      {/* Continent fill — subtle ocean-to-land */}
      <radialGradient id="eal-land" cx="50%" cy="40%" r="60%">
        <stop offset="0%"   stopColor="rgba(20,180,160,0.28)" />
        <stop offset="100%" stopColor="rgba(0,140,120,0.16)" />
      </radialGradient>

      {/* Specular highlight */}
      <radialGradient id="eal-spec" cx="36%" cy="30%" r="40%">
        <stop offset="0%"   stopColor="rgba(255,255,255,0.09)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>

      {/* Soft glow filter for continent shapes */}
      <filter id="eal-land-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      {/* Atmosphere blur/glow */}
      <filter id="eal-atmos-glow" x="-8%" y="-8%" width="116%" height="116%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>

      {/* Clip to sphere */}
      <clipPath id="eal-sphere-clip">
        <circle cx="140" cy="140" r="128" />
      </clipPath>
    </defs>

    {/* ── Sphere base ── */}
    <circle cx="140" cy="140" r="128" fill="url(#eal-globe-body)" />

    {/* ── Latitude grid lines (6) ── */}
    <g clipPath="url(#eal-sphere-clip)" opacity="0.35">
      {/* equator */}
      <ellipse cx="140" cy="140" rx="128" ry="14" fill="none" stroke="rgba(0,212,224,0.22)" strokeWidth="0.8" />
      {/* 30°N */}
      <ellipse cx="140" cy="108" rx="111" ry="11" fill="none" stroke="rgba(0,212,224,0.14)" strokeWidth="0.6" />
      {/* 60°N */}
      <ellipse cx="140" cy="76"  rx="64"  ry="6"  fill="none" stroke="rgba(0,212,224,0.10)" strokeWidth="0.5" />
      {/* 30°S */}
      <ellipse cx="140" cy="172" rx="111" ry="11" fill="none" stroke="rgba(0,212,224,0.14)" strokeWidth="0.6" />
      {/* 60°S */}
      <ellipse cx="140" cy="204" rx="64"  ry="6"  fill="none" stroke="rgba(0,212,224,0.10)" strokeWidth="0.5" />
    </g>

    {/* ── Longitude grid lines (6) ── */}
    <g clipPath="url(#eal-sphere-clip)" opacity="0.30">
      <ellipse cx="140" cy="140" rx="10"  ry="128" fill="none" stroke="rgba(0,212,224,0.16)" strokeWidth="0.7" />
      <ellipse cx="140" cy="140" rx="60"  ry="128" fill="none" stroke="rgba(0,212,224,0.12)" strokeWidth="0.6" />
      <ellipse cx="140" cy="140" rx="100" ry="128" fill="none" stroke="rgba(0,212,224,0.10)" strokeWidth="0.6" />
      <ellipse cx="140" cy="140" rx="118" ry="128" fill="none" stroke="rgba(0,212,224,0.08)" strokeWidth="0.5" />
      <ellipse cx="140" cy="140" rx="126" ry="128" fill="none" stroke="rgba(0,212,224,0.06)" strokeWidth="0.5" />
    </g>

    {/* ── Continent blobs (simplified polygons) ── */}
    <g clipPath="url(#eal-sphere-clip)" filter="url(#eal-land-glow)">
      {/* Eurasia */}
      <path
        d="M 130 72 C 145 65 175 68 195 75 C 210 80 218 92 215 105
           C 212 118 202 128 190 132 C 178 136 165 133 155 127
           C 145 121 138 110 132 100 C 126 90 120 82 130 72 Z"
        fill="url(#eal-land)"
        opacity="0.85"
      />
      {/* India subcontinent */}
      <path
        d="M 175 128 C 183 130 190 138 188 150 C 186 162 176 170 168 165
           C 160 160 158 148 162 138 C 165 130 170 126 175 128 Z"
        fill="url(#eal-land)"
        opacity="0.75"
      />
      {/* Africa */}
      <path
        d="M 130 130 C 140 125 154 128 158 140 C 162 152 160 172 152 184
           C 144 196 132 198 124 188 C 116 178 116 160 120 148
           C 123 138 124 134 130 130 Z"
        fill="url(#eal-land)"
        opacity="0.78"
      />
      {/* Americas (partial — near right horizon) */}
      <path
        d="M 40 88 C 52 82 66 86 72 98 C 78 110 74 128 66 138
           C 58 148 46 148 38 140 C 30 132 28 114 32 102
           C 34 94 34 92 40 88 Z"
        fill="url(#eal-land)"
        opacity="0.65"
      />
      {/* South America */}
      <path
        d="M 52 150 C 62 145 74 150 78 162 C 82 174 78 192 68 200
           C 58 208 46 204 42 194 C 38 184 40 166 46 158
           C 48 154 48 153 52 150 Z"
        fill="url(#eal-land)"
        opacity="0.60"
      />
      {/* Australia */}
      <path
        d="M 200 170 C 210 165 222 168 226 178 C 230 188 224 200 214 204
           C 204 208 194 202 192 192 C 190 182 194 174 200 170 Z"
        fill="url(#eal-land)"
        opacity="0.62"
      />
    </g>

    {/* ── Specular highlight (top-left glow) ── */}
    <circle cx="140" cy="140" r="128" fill="url(#eal-spec)" />

    {/* ── Atmosphere rim (blurred glow ring outside sphere) ── */}
    <circle
      cx="140" cy="140" r="131"
      fill="none"
      stroke="rgba(0,212,224,0.28)"
      strokeWidth="4"
      filter="url(#eal-atmos-glow)"
    />

    {/* ── Atmosphere overlay ── */}
    <circle cx="140" cy="140" r="128" fill="url(#eal-atmos)" />
  </svg>
);

// ── Canvas particle signal system ────────────────────────────────────────────
// 14 signal nodes drift within the globe circle. Connected arcs appear when
// two nodes come within range. Occasional "burst" arcs animate along a path.
// Fully GPU-composited: canvas uses willReadFrequently=false, all drawing
// via globalAlpha + shadowBlur (compositor-only properties).

interface SignalNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  radius: number;
}

const NUM_NODES = 14;
const GLOBE_R   = 110;  // ~canvas half-width, inside sphere boundary
const CX        = 140;  // canvas center X (matches SVG viewBox)
const CY        = 140;  // canvas center Y

function createNodes(w: number, h: number): SignalNode[] {
  const cx = w / 2;
  const cy = h / 2;
  const r  = (w / 280) * GLOBE_R;
  const nodes: SignalNode[] = [];
  for (let i = 0; i < NUM_NODES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * r * 0.85;
    nodes.push({
      x:      cx + Math.cos(angle) * dist,
      y:      cy + Math.sin(angle) * dist,
      vx:     (Math.random() - 0.5) * 0.32,
      vy:     (Math.random() - 0.5) * 0.32,
      phase:  Math.random() * Math.PI * 2,
      radius: 1.8 + Math.random() * 2.2,
    });
  }
  return nodes;
}

const GlobeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const nodesRef  = useRef<SignalNode[]>([]);
  const tRef      = useRef(0);
  const burstRef  = useRef<{ a: number; b: number; progress: number } | null>(null);
  const burstTimerRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = w / 280; // match SVG viewBox scale
    const cx  = w / 2;
    const cy  = h / 2;
    const gR  = scale * GLOBE_R;

    ctx.clearRect(0, 0, w, h);
    tRef.current += 0.016;
    const t = tRef.current;

    const nodes = nodesRef.current;

    // ── Move nodes, bounce inside globe sphere ──
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      const dx = n.x - cx;
      const dy = n.y - cy;
      if (Math.hypot(dx, dy) > gR * 0.88) {
        const angle = Math.atan2(dy, dx);
        n.vx = -Math.abs(n.vx) * Math.cos(angle) - 0.05;
        n.vy = -Math.abs(n.vy) * Math.sin(angle) - 0.05;
        // nudge back in
        const clamp = gR * 0.87;
        n.x = cx + Math.cos(angle) * clamp;
        n.y = cy + Math.sin(angle) * clamp;
      }
    }

    // ── Draw connection arcs between nearby nodes ──
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const maxDist = scale * 78;
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.30;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          // perpendicular control point for slight arc
          const perpX = midX + (b.y - a.y) * 0.22;
          const perpY = midY - (b.x - a.x) * 0.22;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(perpX, perpY, b.x, b.y);
          ctx.strokeStyle = `rgba(0,212,224,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.7 * scale;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }
    }

    // ── Draw "burst" arc (animated data trail between two random nodes) ──
    burstTimerRef.current++;
    if (burstTimerRef.current > 110 && !burstRef.current) {
      // Trigger new burst
      const a = Math.floor(Math.random() * nodes.length);
      let b = Math.floor(Math.random() * nodes.length);
      while (b === a) b = Math.floor(Math.random() * nodes.length);
      burstRef.current = { a, b, progress: 0 };
      burstTimerRef.current = 0;
    }

    if (burstRef.current) {
      const { a: ai, b: bi, progress } = burstRef.current;
      const a = nodes[ai];
      const b = nodes[bi];

      if (a && b) {
        const p = Math.min(progress, 1);
        const endX = a.x + (b.x - a.x) * p;
        const endY = a.y + (b.y - a.y) * p;
        const midX = (a.x + endX) / 2;
        const midY = (a.y + endY) / 2;
        const perpX = midX + (endY - a.y) * 0.3;
        const perpY = midY - (endX - a.x) * 0.3;

        const grad = ctx.createLinearGradient(a.x, a.y, endX, endY);
        grad.addColorStop(0,   'rgba(0,212,224,0.0)');
        grad.addColorStop(0.3, 'rgba(0,212,224,0.6)');
        grad.addColorStop(1,   'rgba(0,212,224,0.9)');

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(perpX, perpY, endX, endY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4 * scale;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00d4e0';
        ctx.stroke();
        ctx.shadowBlur = 0;

        burstRef.current.progress += 0.022;
        if (progress >= 1) burstRef.current = null;
      } else {
        burstRef.current = null;
      }
    }

    // ── Draw signal nodes (pulsing dots) ──
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00d4e0';
    for (const n of nodes) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.8 + n.phase);
      const r     = n.radius * scale * pulse;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,224,${(pulse * 0.82).toFixed(3)})`;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas to its displayed size (CSS handles responsive scaling)
    const size = canvas.offsetWidth || 280;
    canvas.width  = size;
    canvas.height = size;
    nodesRef.current = createNodes(size, size);

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="earth-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// ── Pipeline progress track ───────────────────────────────────────────────────

const Pipeline: React.FC<{ stage: number }> = ({ stage }) => (
  <div className="earth-loader-pipeline" role="progressbar" aria-valuenow={stage} aria-valuemin={0} aria-valuemax={5}>
    {STAGE_META.map((s, i) => {
      const isDone   = i < stage;
      const isActive = i === stage;
      return (
        <React.Fragment key={i}>
          <div className="earth-pipeline-step">
            <div
              className={`earth-pipeline-dot${isActive ? ' active' : isDone ? ' done' : ''}`}
              title={s.text}
            />
            <span className={`earth-pipeline-label${isActive ? ' active' : isDone ? ' done' : ''}`}>
              {s.short}
            </span>
          </div>
          {i < STAGE_META.length - 1 && (
            <div className={`earth-pipeline-connector${isDone ? ' done' : ''}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const EarthAnalysisLoader: React.FC<Props> = ({
  stage,
  companyName,
  limitedDataMode,
  limitedDataReason,
}) => {
  const [factoidIdx, setFactoidIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setFactoidIdx(i => (i + 1) % FACTOIDS.length), 2400);
    return () => clearInterval(iv);
  }, []);

  const clamped = Math.min(Math.max(stage, 0), STAGE_META.length - 1);
  const current = STAGE_META[clamped];

  return (
    <motion.div
      className="earth-loader-shell"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Company name */}
      {companyName && (
        <motion.p
          className="earth-loader-company"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.1 }}
        >
          Analyzing <span>{companyName}</span>
        </motion.p>
      )}

      {/* Globe + orbit rings + scan sweep + canvas signals */}
      <motion.div
        className="earth-globe-wrap"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        {/* SVG globe */}
        <GlobeSVG />

        {/* Orbit rings */}
        <div className="earth-orbit-wrap" aria-hidden="true">
          <div className="earth-orbit-ring" />
          <div className="earth-orbit-ring" />
          <div className="earth-orbit-ring" />
        </div>

        {/* Radar scan sweep */}
        <div className="earth-scan-sweep" aria-hidden="true" />

        {/* Canvas signal network */}
        <GlobeCanvas />
      </motion.div>

      {/* Stage headline — fades between stages */}
      <AnimatePresence mode="wait">
        <motion.p
          key={clamped}
          className="earth-loader-stage-text"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.22 }}
        >
          {current.icon} {current.text}
        </motion.p>
      </AnimatePresence>

      {/* Rotating factoid */}
      <AnimatePresence mode="wait">
        <motion.p
          key={factoidIdx}
          className="earth-loader-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38 }}
        >
          {FACTOIDS[factoidIdx]}
        </motion.p>
      </AnimatePresence>

      {/* 6-stage pipeline progress */}
      <Pipeline stage={clamped} />

      {/* Limited data banner */}
      {limitedDataMode && (
        <motion.div
          className="earth-loader-limited"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.3 }}
        >
          <p className="earth-loader-limited-title">LIMITED PUBLIC DATA</p>
          <p className="earth-loader-limited-body">
            {limitedDataReason ??
              'No public exchange listing, WARN Act, or SEC filings found. Analysis uses registry, news, and hiring signals.'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EarthAnalysisLoader;
