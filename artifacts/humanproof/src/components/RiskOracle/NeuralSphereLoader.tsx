// NeuralSphereLoader.tsx — Risk Oracle cinematic "Neural Displacement Engine"
// ─────────────────────────────────────────────────────────────────────────────
// A deliberately DIFFERENT experience from the Layoff Audit globe
// (GlobeAuditLoader / OracleGlobeLoader). Where that one is a flat cyan
// radar-scan HUD, this is a holographic VIOLET/MAGENTA "neural prediction brain":
//
//   • A true 3D rotating WIREFRAME sphere (lat/long great-circle mesh) rendered
//     on canvas with depth-cued line alpha + a sweeping scan band.
//   • The nine Risk-Oracle processing engines ORBIT the sphere as glowing nodes;
//     as each activates it fires an animated NEURAL PULSE toward the core.
//   • Separate themed components: <PhasePipeline>, <NeuralSphereCanvas>,
//     <EngineStack>, <SynthesisConsole> — own `nse-` CSS namespace + `nse-css` id.
//
// Props mirror the old loader so AuditTerminalPage's stage driver is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stage: number;          // 0..8 sequential build-up across the 9 engines
  roleLabel?: string;
  industryLabel?: string;
  countryLabel?: string;
}

// ── The nine Risk-Oracle processing engines (orbit + stack) ────────────────────
// `d` is the dimension tie-in shown as a tag; order = activation order.
const ENGINES = [
  { id: '01', name: 'AI Risk Analysis Engine',          d: 'CORE',  warn: false },
  { id: '02', name: 'Automation Trend Analysis',        d: 'D1',    warn: true  },
  { id: '03', name: 'Industry Impact Detection',        d: 'D2',    warn: false },
  { id: '04', name: 'Job Role Vulnerability Assessment',d: 'D3',    warn: true  },
  { id: '05', name: 'Career Stability Forecasting',     d: 'D4',    warn: false },
  { id: '06', name: 'Global Workforce Monitoring',      d: 'D5',    warn: false },
  { id: '07', name: 'Layoff Signal Correlation',        d: 'D6',    warn: true  },
  { id: '08', name: 'Economic Intelligence Processing', d: 'MACRO', warn: false },
  { id: '09', name: 'Confidence Validation Systems',    d: 'CONF',  warn: false },
];

const PHASES = ['Ingest', 'Assess', 'Model', 'Forecast'];

function stageToPhase(s: number) {
  return Math.min(PHASES.length - 1, Math.max(0, Math.floor(s / 2.25)));
}

// Per-stage status line, personalized with the user's selections.
function buildStatus(role?: string, industry?: string, country?: string): string[] {
  const r = role || 'your role';
  const ind = industry || 'your sector';
  const c = country || 'global markets';
  return [
    'Spinning up the neural displacement engine…',
    `Mapping automation exposure for ${r}…`,
    `Modeling AI-tool maturity across ${ind}…`,
    `Probing the human-amplification moat of ${r}…`,
    'Projecting your career-stability trajectory…',
    `Sweeping ${c} labour-market signals…`,
    'Correlating global layoff & hiring pressure…',
    'Fusing macro-economic intelligence…',
    'Calibrating displacement confidence…',
  ];
}

// ── Scoped CSS (violet / magenta / indigo holographic theme) ───────────────────

const NSE_CSS = `
.nse-root{position:fixed;inset:0;z-index:9999;overflow:hidden;height:100vh;height:100dvh;
  background:radial-gradient(ellipse at 50% 38%,#1c0b35 0%,#120824 42%,#070313 78%,#040109 100%);
  color:#ece7ff;font-family:"Inter",-apple-system,system-ui,sans-serif;letter-spacing:.01em;
  display:flex;flex-direction:column;align-items:center;
  --nse-vio:#a855f7;--nse-vio2:#c084fc;--nse-mag:#e879f9;--nse-mag2:#f5d0fe;--nse-ind:#818cf8;
  --nse-amber:#ffb86b;--nse-mut:rgba(236,231,255,.5)}

/* background layers */
.nse-bg-aurora{position:absolute;inset:0;z-index:0;pointer-events:none;mix-blend-mode:screen;
  background:radial-gradient(50% 38% at 24% 22%,rgba(168,85,247,.26),transparent 60%),
             radial-gradient(46% 34% at 80% 76%,rgba(232,121,249,.22),transparent 60%),
             radial-gradient(40% 30% at 60% 108%,rgba(129,140,248,.18),transparent 60%);
  animation:nseAurora 16s ease-in-out infinite alternate}
@keyframes nseAurora{from{transform:translate3d(0,0,0) scale(1);opacity:.85}to{transform:translate3d(-2%,1.5%,0) scale(1.06);opacity:1}}
.nse-bg-grid{position:absolute;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(to right,rgba(168,85,247,.06) 1px,transparent 1px),
                   linear-gradient(to bottom,rgba(168,85,247,.06) 1px,transparent 1px);
  background-size:54px 54px;
  mask-image:radial-gradient(ellipse at 50% 46%,transparent 14%,rgba(0,0,0,.7) 46%,rgba(0,0,0,.92) 68%,transparent 92%);
  -webkit-mask-image:radial-gradient(ellipse at 50% 46%,transparent 14%,rgba(0,0,0,.7) 46%,rgba(0,0,0,.92) 68%,transparent 92%);
  animation:nseGrid 9s ease-in-out infinite}
@keyframes nseGrid{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.8;transform:scale(1.015)}}
.nse-vignette{position:absolute;inset:0;z-index:6;pointer-events:none;
  background:radial-gradient(ellipse at 50% 46%,transparent 38%,rgba(4,1,9,.62) 100%)}
.nse-scan{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:.5;mix-blend-mode:overlay;
  background-image:repeating-linear-gradient(to bottom,rgba(192,132,252,.03) 0,rgba(192,132,252,.03) 1px,transparent 1px,transparent 3px)}

/* header */
.nse-header{position:relative;z-index:7;display:flex;align-items:center;gap:14px;margin-top:18px;
  padding:8px 16px;border-radius:999px;background:rgba(28,11,53,.55);backdrop-filter:blur(16px) saturate(150%);
  border:1px solid rgba(192,132,252,.24);box-shadow:0 8px 34px rgba(120,40,200,.30);
  font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;
  animation:nseRise .7s cubic-bezier(.2,.8,.2,1) both}
@keyframes nseRise{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.nse-mark{position:relative;width:18px;height:18px;border-radius:50%;flex:0 0 auto;
  background:radial-gradient(circle at 35% 30%,#fbe8ff,#e879f9 38%,#7c3aed 72%,#2a0a52 100%);
  box-shadow:0 0 14px rgba(232,121,249,.7),inset 0 0 6px rgba(255,255,255,.5)}
.nse-mark-core{position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(232,121,249,.4);animation:nsePing 2.4s ease-out infinite}
@keyframes nsePing{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.7);opacity:0}}
.nse-title{font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:700;color:#f3e8ff}
.nse-title em{font-style:normal;font-weight:400;color:rgba(192,132,252,.7);margin-left:8px;letter-spacing:.16em}
.nse-divider{width:1px;height:16px;background:rgba(192,132,252,.28)}
.nse-phases{display:flex;align-items:center;gap:9px;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:rgba(236,231,255,.32)}
.nse-phase{display:flex;align-items:center;gap:5px;transition:color .4s ease}
.nse-phase .pd{width:5px;height:5px;border-radius:50%;background:rgba(192,132,252,.22);transition:.4s}
.nse-phase+.nse-phase::before{content:"";width:13px;height:1px;background:rgba(192,132,252,.25);margin-right:3px}
.nse-phase.on{color:#f3e8ff}.nse-phase.on .pd{background:#e879f9;box-shadow:0 0 10px #e879f9}
.nse-phase.done{color:rgba(236,231,255,.6)}.nse-phase.done .pd{background:#818cf8}

/* center stage */
.nse-stage{position:relative;z-index:2;flex:1 1 0;width:100%;min-height:0;display:grid;place-items:center}
.nse-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.nse-core{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;
  pointer-events:none;text-shadow:0 0 18px rgba(168,85,247,.7)}
.nse-core-pct{font-family:"JetBrains Mono",monospace;font-size:34px;font-weight:800;line-height:1;
  background:linear-gradient(180deg,#f5d0fe,#c084fc 60%,#818cf8);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 12px rgba(192,132,252,.55))}
.nse-core-sub{margin-top:6px;font-family:"JetBrains Mono",monospace;font-size:8.5px;letter-spacing:.34em;text-transform:uppercase;color:rgba(192,132,252,.7)}

/* engine stack (docked left) */
.nse-stack{position:absolute;left:18px;top:50%;transform:translateY(-50%);z-index:7;width:248px;max-width:36vw;
  padding:14px 14px 12px;border-radius:16px;background:rgba(24,10,46,.55);backdrop-filter:blur(18px) saturate(150%);
  border:1px solid rgba(192,132,252,.2);box-shadow:0 10px 40px rgba(90,30,160,.35);
  font-family:"JetBrains Mono",monospace;animation:nseRise .7s cubic-bezier(.2,.8,.2,1) .15s both}
.nse-stack-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;
  font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:rgba(192,132,252,.6)}
.nse-live{display:flex;align-items:center;gap:5px;color:#86efac}
.nse-live i{width:5px;height:5px;border-radius:50%;background:#86efac;box-shadow:0 0 8px #86efac;animation:nseBlink 1.4s ease-in-out infinite}
@keyframes nseBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
.nse-erow{display:grid;grid-template-columns:16px 1fr auto;gap:7px;align-items:center;padding:5px 0;
  opacity:.4;transition:opacity .45s ease}
.nse-erow.on,.nse-erow.done{opacity:1}
.nse-erow .ei{font-size:8px;color:rgba(192,132,252,.35);font-variant-numeric:tabular-nums}
.nse-erow.on .ei{color:#e879f9}
.nse-erow .en{font-size:10px;color:#ece7ff;line-height:1.15}
.nse-erow.warn.on .en{color:#ffb86b}
.nse-erow .es{width:13px;height:13px;display:grid;place-items:center;border-radius:50%;flex:0 0 auto;
  border:1px solid rgba(192,132,252,.25)}
.nse-erow.done .es{background:#7c3aed;border-color:#a855f7;box-shadow:0 0 8px rgba(168,85,247,.6)}
.nse-erow.done .es::after{content:"";width:4px;height:7px;border:solid #fff;border-width:0 1.5px 1.5px 0;transform:rotate(45deg) translate(-0.5px,-1px)}
.nse-erow.on .es{border-color:#e879f9;box-shadow:0 0 9px rgba(232,121,249,.7)}
.nse-erow.on .es i{width:5px;height:5px;border-radius:50%;background:#e879f9;animation:nseBlink 1s ease-in-out infinite}
.nse-erow .ebar{grid-column:1/-1;height:2px;border-radius:99px;background:rgba(192,132,252,.12);overflow:hidden;position:relative}
.nse-erow .ebar>i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;width:8%;
  background:linear-gradient(90deg,#a855f7,#e879f9);box-shadow:0 0 8px #c084fc;transition:width .6s cubic-bezier(.4,0,.2,1)}
.nse-erow.warn .ebar>i{background:linear-gradient(90deg,#ffb86b,#f472b6)}
.nse-erow.done .ebar>i{width:100%}
.nse-erow.on .ebar>i{width:64%;animation:nsePulseBar 1.4s ease-in-out infinite}
@keyframes nsePulseBar{0%,100%{opacity:.75}50%{opacity:1}}

/* synthesis console (bottom-center) */
.nse-console{position:relative;z-index:7;width:min(560px,calc(100vw - 28px));margin-bottom:20px;
  padding:14px 22px 13px;border-radius:18px;text-align:center;
  background:linear-gradient(180deg,rgba(30,12,56,.66),rgba(22,9,42,.58)),radial-gradient(120% 70% at 0% 0%,rgba(192,132,252,.12),transparent 60%);
  backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(192,132,252,.22);
  box-shadow:0 12px 44px rgba(80,24,150,.4),inset 0 1px 0 rgba(255,255,255,.06);
  animation:nseRise .7s cubic-bezier(.2,.8,.2,1) .25s both}
.nse-con-eng{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.3em;text-transform:uppercase;color:rgba(192,132,252,.6);margin-bottom:7px;
  display:flex;align-items:center;justify-content:center;gap:8px}
.nse-con-eng .tag{color:#e879f9}
.nse-con-name{font-size:15px;font-weight:700;color:#f8f3ff;letter-spacing:.01em;min-height:20px}
.nse-con-status{font-size:11.5px;color:rgba(236,231,255,.66);margin-top:4px;min-height:16px;transition:opacity .3s ease}
.nse-con-bar{position:relative;height:3px;border-radius:99px;background:rgba(192,132,252,.12);overflow:hidden;margin-top:10px}
.nse-con-bar>i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#818cf8,#a855f7,#e879f9);box-shadow:0 0 10px rgba(192,132,252,.7);transition:width .7s cubic-bezier(.4,0,.2,1)}
.nse-con-bar::after{content:"";position:absolute;inset:0;width:30%;border-radius:99px;background:linear-gradient(90deg,transparent,rgba(245,208,254,.7),transparent);animation:nseShimmer 2s ease-in-out infinite}
@keyframes nseShimmer{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}
.nse-con-meta{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:9px;
  font-family:"JetBrains Mono",monospace;font-size:9px;color:rgba(236,231,255,.34);font-variant-numeric:tabular-nums;letter-spacing:.05em}
.nse-con-meta b{color:rgba(192,132,252,.85);font-weight:600}

/* corner HUDs */
.nse-hud{position:absolute;z-index:5;color:rgba(192,132,252,.22);font-family:"JetBrains Mono",monospace;
  font-size:9px;letter-spacing:.2em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
.nse-hud .tk{width:14px;height:1px;background:currentColor}
.nse-hud.tl{top:14px;left:14px}.nse-hud.tr{top:14px;right:14px}.nse-hud.bl{bottom:12px;left:14px}.nse-hud.br{bottom:12px;right:14px}
.nse-hud .v{color:rgba(236,231,255,.6)}

/* responsive */
@media(max-width:880px){
  .nse-stack{display:none}
}
@media(max-width:560px){
  .nse-hud.tl,.nse-hud.tr{display:none}
  .nse-header .nse-divider,.nse-phases{display:none}
  .nse-core-pct{font-size:28px}
  .nse-console{padding:12px 16px}
}
@media(prefers-reduced-motion:reduce){
  .nse-bg-aurora,.nse-bg-grid,.nse-mark-core,.nse-con-bar::after{animation:none}
}
`;

// ── Phase pipeline (top) ───────────────────────────────────────────────────────

const PhasePipeline: React.FC<{ active: number }> = ({ active }) => (
  <div className="nse-phases">
    {PHASES.map((p, i) => (
      <div key={p} className={`nse-phase${i < active ? ' done' : i === active ? ' on' : ''}`}>
        <span className="pd" />{p}
      </div>
    ))}
  </div>
);

// ── Engine stack (left dock) ───────────────────────────────────────────────────

const EngineStack: React.FC<{ stage: number }> = ({ stage }) => (
  <div className="nse-stack" aria-hidden="true">
    <div className="nse-stack-head">
      <span>Processing Engines</span>
      <span className="nse-live"><i />Live</span>
    </div>
    {ENGINES.map((e, i) => {
      const state = i < stage ? 'done' : i === stage ? 'on' : 'pending';
      return (
        <div key={e.id} className={`nse-erow ${state}${e.warn ? ' warn' : ''}`}>
          <span className="ei">{e.id}</span>
          <span className="en">{e.name}</span>
          <span className="es">{state === 'on' ? <i /> : null}</span>
          <span className="ebar"><i /></span>
        </div>
      );
    })}
  </div>
);

// ── Neural sphere canvas (true 3D wireframe + orbiting engine nodes) ────────────

const NeuralSphereCanvas: React.FC<{ stage: number }> = ({ stage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef  = useRef(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Surface particles (stable random lat/lon)
    const PARTS = Array.from({ length: 130 }, () => ({
      lat: (Math.random() - 0.5) * Math.PI,
      lon: Math.random() * Math.PI * 2,
      r: 0.6 + Math.random() * 1.6,
    }));

    const TILT = 0.42; // x-axis tilt (radians)
    let t = 0;
    let raf = 0;

    // rotate(Y) then rotate(X by TILT); returns screen + depth z (z>0 = front)
    const project = (lat: number, lon: number, R: number, cx: number, cy: number, ry: number) => {
      const X = Math.cos(lat) * Math.cos(lon);
      const Y = Math.sin(lat);
      const Z = Math.cos(lat) * Math.sin(lon);
      const x1 = X * Math.cos(ry) + Z * Math.sin(ry);
      const z1 = -X * Math.sin(ry) + Z * Math.cos(ry);
      const y2 = Y * Math.cos(TILT) - z1 * Math.sin(TILT);
      const z2 = Y * Math.sin(TILT) + z1 * Math.cos(TILT);
      return { x: cx + x1 * R, y: cy + y2 * R, z: z2 };
    };

    const draw = () => {
      t += reduce ? 0 : 0.016;
      const cx = w / 2, cy = h / 2;
      const R = Math.max(70, Math.min(w, h) * 0.27);
      const ry = t * 0.34;
      const st = stageRef.current;
      const prog = Math.min(1, (st + 1) / ENGINES.length);

      ctx.clearRect(0, 0, w, h);

      // ── core glow ──
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
      core.addColorStop(0, `rgba(245,208,254,${0.22 + prog * 0.20})`);
      core.addColorStop(0.35, 'rgba(168,85,247,0.14)');
      core.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.fill();

      // ── meridians ──
      const SEG = 46;
      for (let m = 0; m < 12; m++) {
        const lon0 = (m / 12) * Math.PI * 2;
        let prev: { x: number; y: number; z: number } | null = null;
        for (let s = 0; s <= SEG; s++) {
          const lat = -Math.PI / 2 + (s / SEG) * Math.PI;
          const p = project(lat, lon0, R, cx, cy, ry);
          if (prev) {
            const za = (prev.z + p.z) / 2;
            const a = 0.10 + Math.max(0, za) * 0.34;
            ctx.strokeStyle = `rgba(168,85,247,${a.toFixed(3)})`;
            ctx.lineWidth = za > 0 ? 0.9 : 0.5;
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
          prev = p;
        }
      }
      // ── parallels ──
      for (let pl = -2; pl <= 2; pl++) {
        const lat0 = (pl / 3) * (Math.PI / 2);
        let prev: { x: number; y: number; z: number } | null = null;
        for (let s = 0; s <= SEG; s++) {
          const lon = (s / SEG) * Math.PI * 2;
          const p = project(lat0, lon, R, cx, cy, ry);
          if (prev) {
            const za = (prev.z + p.z) / 2;
            const a = 0.08 + Math.max(0, za) * 0.30;
            ctx.strokeStyle = `rgba(129,140,248,${a.toFixed(3)})`;
            ctx.lineWidth = za > 0 ? 0.8 : 0.45;
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
          prev = p;
        }
      }

      // ── sweeping scan band (a bright moving parallel) ──
      const scanLat = Math.sin(t * 0.7) * (Math.PI / 2) * 0.92;
      let sprev: { x: number; y: number; z: number } | null = null;
      for (let s = 0; s <= SEG; s++) {
        const lon = (s / SEG) * Math.PI * 2;
        const p = project(scanLat, lon, R, cx, cy, ry);
        if (sprev) {
          const za = (sprev.z + p.z) / 2;
          if (za > -0.1) {
            ctx.strokeStyle = `rgba(245,208,254,${(0.25 + Math.max(0, za) * 0.6).toFixed(3)})`;
            ctx.lineWidth = 1.6;
            ctx.shadowBlur = 8; ctx.shadowColor = '#e879f9';
            ctx.beginPath(); ctx.moveTo(sprev.x, sprev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
        sprev = p;
      }

      // ── surface particles ──
      for (const pt of PARTS) {
        const p = project(pt.lat, pt.lon + t * 0.34, R, cx, cy, ry);
        if (p.z <= 0) continue; // front hemisphere only
        const a = 0.25 + p.z * 0.7;
        ctx.fillStyle = `rgba(245,208,254,${a.toFixed(3)})`;
        ctx.shadowBlur = 6; ctx.shadowColor = '#e879f9';
        ctx.beginPath(); ctx.arc(p.x, p.y, pt.r * (0.6 + p.z * 0.6), 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── orbiting engine nodes + neural pulse links ──
      const orbitRx = R * 1.62, orbitRy = R * 0.62;
      const N = ENGINES.length;
      const nodes = ENGINES.map((e, i) => {
        const ang = (i / N) * Math.PI * 2 + t * 0.22;
        const nx = cx + Math.cos(ang) * orbitRx;
        const ny = cy + Math.sin(ang) * orbitRy;
        const depth = Math.sin(ang); // -1 behind .. +1 front
        return { e, i, nx, ny, depth, ang };
      }).sort((a, b) => a.depth - b.depth); // back first

      // faint orbit ellipse
      ctx.strokeStyle = 'rgba(129,140,248,0.16)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(cx, cy, orbitRx, orbitRy, 0, 0, Math.PI * 2); ctx.stroke();

      for (const node of nodes) {
        const active = node.i <= st;
        const isCurrent = node.i === st;
        const dz = (node.depth + 1) / 2; // 0..1
        const baseR = 2.2 + dz * 2.2;
        const col = node.e.warn ? '255,184,107' : '232,121,249';

        // neural link to core for activated engines
        if (active) {
          const linkA = isCurrent ? 0.6 : 0.22;
          const grad = ctx.createLinearGradient(node.nx, node.ny, cx, cy);
          grad.addColorStop(0, `rgba(${col},${linkA})`);
          grad.addColorStop(1, 'rgba(192,132,252,0.05)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = isCurrent ? 1.5 : 0.8;
          ctx.beginPath(); ctx.moveTo(node.nx, node.ny); ctx.lineTo(cx, cy); ctx.stroke();

          // traveling pulse dot (node → core)
          const pp = ((t * (isCurrent ? 0.9 : 0.4)) + node.i * 0.37) % 1;
          const px = node.nx + (cx - node.nx) * pp;
          const py = node.ny + (cy - node.ny) * pp;
          ctx.fillStyle = `rgba(245,208,254,${(1 - pp) * (isCurrent ? 1 : 0.6)})`;
          ctx.shadowBlur = 10; ctx.shadowColor = `rgba(${col},1)`;
          ctx.beginPath(); ctx.arc(px, py, isCurrent ? 2.6 : 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        // node glow
        const pulse = isCurrent ? 1 + Math.sin(t * 4) * 0.28 : 1;
        const r = baseR * pulse;
        ctx.shadowBlur = active ? 14 : 4;
        ctx.shadowColor = `rgba(${col},${active ? 1 : 0.4})`;
        ctx.fillStyle = active ? `rgba(${col},${0.65 + dz * 0.35})` : `rgba(${col},${0.18 + dz * 0.18})`;
        ctx.beginPath(); ctx.arc(node.nx, node.ny, r, 0, Math.PI * 2); ctx.fill();
        if (active) {
          ctx.fillStyle = `rgba(255,255,255,${0.7 * pulse})`;
          ctx.beginPath(); ctx.arc(node.nx, node.ny, r * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // ── outer atmosphere rim ──
      ctx.strokeStyle = `rgba(192,132,252,${0.12 + prog * 0.12})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="nse-canvas" aria-hidden="true" />;
};

// ── Synthesis console (bottom) ─────────────────────────────────────────────────

const SynthesisConsole: React.FC<{
  engine: typeof ENGINES[number];
  status: string;
  pct: number;
  datasets: number;
  signals: number;
  markets: number;
}> = ({ engine, status, pct, datasets, signals, markets }) => (
  <div className="nse-console">
    <div className="nse-con-eng">
      <span className="tag">{engine.d}</span>
      <span>· Active Engine {engine.id}/09</span>
    </div>
    <div className="nse-con-name">{engine.name}</div>
    <div className="nse-con-status" aria-live="polite">{status}</div>
    <div className="nse-con-bar"><i style={{ width: `${pct}%` }} /></div>
    <div className="nse-con-meta">
      <span><b>{datasets.toLocaleString()}</b> datasets</span>
      <span><b>{signals.toLocaleString()}</b> signals</span>
      <span><b>{markets}</b>/7 markets</span>
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

export const NeuralSphereLoader: React.FC<Props> = ({ stage, roleLabel, industryLabel, countryLabel }) => {
  const messages = useState(() => buildStatus(roleLabel, industryLabel, countryLabel))[0];
  const [datasets, setDatasets] = useState(0);
  const [signals, setSignals]   = useState(0);
  const [markets, setMarkets]   = useState(0);
  const [clock, setClock]       = useState('00:00:00 UTC');

  const clamped = Math.min(Math.max(stage, 0), ENGINES.length - 1);
  const engine  = ENGINES[clamped];
  const status  = messages[Math.min(clamped, messages.length - 1)];
  const pct     = Math.min(100, Math.round(((clamped + 1) / ENGINES.length) * 100));
  const phase   = stageToPhase(clamped);

  // CSS injection
  useEffect(() => {
    const id = 'nse-css';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = NSE_CSS;
      document.head.appendChild(el);
    }
    return () => document.getElementById('nse-css')?.remove();
  }, []);

  // animated telemetry counters
  useEffect(() => {
    let d = 0, s = 0, m = 0;
    const iv = setInterval(() => {
      d = Math.min(2480000, d + Math.round(30000 + Math.random() * 54000));
      s = Math.min(9120000, s + Math.round(94000 + Math.random() * 88000));
      if (Math.random() < 0.07) m = Math.min(7, m + 1);
      setDatasets(d); setSignals(s); setMarkets(m);
      if (d >= 2480000 && s >= 9120000 && m >= 7) setTimeout(() => { d = 0; s = 0; m = 0; }, 1600);
    }, 120);
    return () => clearInterval(iv);
  }, []);

  // UTC clock
  useEffect(() => {
    const tick = () => {
      const dt = new Date(), p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(dt.getUTCHours())}:${p(dt.getUTCMinutes())}:${p(dt.getUTCSeconds())} UTC`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  return createPortal(
    <div className="nse-root" role="status" aria-label="Analyzing global labour-market intelligence">
      <div className="nse-bg-aurora" aria-hidden="true" />
      <div className="nse-bg-grid" aria-hidden="true" />
      <div className="nse-scan" aria-hidden="true" />

      <header className="nse-header">
        <span className="nse-mark"><span className="nse-mark-core" /></span>
        <span className="nse-title">Risk Oracle <em>Neural Displacement Engine</em></span>
        <span className="nse-divider" />
        <PhasePipeline active={phase} />
      </header>

      <div className="nse-stage">
        <NeuralSphereCanvas stage={clamped} />
        <div className="nse-core" aria-hidden="true">
          <span className="nse-core-pct">{pct}%</span>
          <span className="nse-core-sub">Synthesizing</span>
        </div>
      </div>

      <EngineStack stage={clamped} />

      <SynthesisConsole
        engine={engine}
        status={status}
        pct={pct}
        datasets={datasets}
        signals={signals}
        markets={markets}
      />

      <div className="nse-hud tl" aria-hidden="true"><span className="tk" /><span>RISK ORACLE · NEURAL NET</span></div>
      <div className="nse-hud tr" aria-hidden="true"><span>DISPLACEMENT · D1–D6</span><span className="tk" /></div>
      <div className="nse-hud bl" aria-hidden="true"><span className="tk" /><span>ROLE INTELLIGENCE · GLOBAL</span></div>
      <div className="nse-hud br" aria-hidden="true"><span className="v">{clock}</span><span className="tk" /></div>

      <div className="nse-vignette" aria-hidden="true" />
    </div>,
    document.body,
  );
};

export default NeuralSphereLoader;
