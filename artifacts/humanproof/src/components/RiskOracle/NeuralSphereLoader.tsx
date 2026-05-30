// NeuralSphereLoader.tsx — Risk Oracle cinematic "Neural Displacement Engine"
// ─────────────────────────────────────────────────────────────────────────────
// A distinct, professional experience for the Risk Oracle:
//
//   • A REAL rotating 3D Earth (d3-geo orthographic projection) with natural
//     ocean/land colours, true country borders (/countries-110m.json), a
//     graticule, day/night terminator shading and a specular sun-glint.
//   • Wrapped in a VIOLET/MAGENTA holographic HUD: the nine Risk-Oracle
//     processing engines ORBIT the planet as glowing nodes, each firing an
//     animated NEURAL PULSE toward the core as it activates.
//   • Advanced docks: <RegionTicker> (top feed), <DimensionTelemetry> (right,
//     live D1–D6 meters + confidence dial), <CoreRing> (segmented progress),
//     <EngineStack> (left), <SynthesisConsole> (bottom). Own `nse-` CSS
//     namespace + `nse-css` id, so it cannot collide with the Layoff globe.
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

// The six scored dimensions tracked in the right telemetry dock.
const DIMS = [
  { k: 'D1', n: 'Task Automatability', base: 0.82 },
  { k: 'D2', n: 'AI Tool Maturity',    base: 0.78 },
  { k: 'D3', n: 'Human Amplification', base: 0.46 },
  { k: 'D4', n: 'Experience Shield',   base: 0.52 },
  { k: 'D5', n: 'Country Exposure',    base: 0.69 },
  { k: 'D6', n: 'Social Capital Moat', base: 0.41 },
];

const TICKER_REGIONS = [
  'NORTH AMERICA', 'WESTERN EUROPE', 'SOUTH ASIA', 'EAST ASIA',
  'SOUTHEAST ASIA', 'MIDDLE EAST', 'LATAM', 'OCEANIA', 'AFRICA', 'NORDICS',
];
const TICKER_SIGNALS = ['Automation', 'AI Adoption', 'Hiring', 'Layoffs', 'Re-skilling', 'Wage Drift'];

function buildTicker() {
  return Array.from({ length: 16 }, (_, i) => {
    const reg = TICKER_REGIONS[i % TICKER_REGIONS.length];
    const sig = TICKER_SIGNALS[(i * 3) % TICKER_SIGNALS.length];
    const v = 28 + Math.round(Math.random() * 66);
    const tone = v >= 70 ? 'hi' : v >= 50 ? 'md' : 'lo';
    return { reg, sig, v, tone };
  });
}

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
/* ── region signal ticker (top, under header) ── */
.nse-ticker{position:relative;z-index:7;margin-top:10px;width:min(560px,calc(100vw - 28px));height:22px;overflow:hidden;border-radius:999px;
  background:rgba(24,10,46,.5);backdrop-filter:blur(12px) saturate(150%);border:1px solid rgba(192,132,252,.16);
  box-shadow:0 6px 24px rgba(80,24,150,.28);
  mask-image:linear-gradient(to right,transparent,#000 12%,#000 88%,transparent);
  -webkit-mask-image:linear-gradient(to right,transparent,#000 12%,#000 88%,transparent);
  animation:nseRise .7s cubic-bezier(.2,.8,.2,1) .2s both}
.nse-ticker .tk-lead{position:absolute;left:0;top:0;bottom:0;z-index:2;display:flex;align-items:center;gap:6px;padding:0 12px;
  background:linear-gradient(90deg,rgba(24,10,46,.96) 60%,transparent);font-family:"JetBrains Mono",monospace;
  font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:#e879f9}
.nse-ticker .tk-lead i{width:5px;height:5px;border-radius:50%;background:#e879f9;box-shadow:0 0 8px #e879f9;animation:nseBlink 1.3s ease-in-out infinite}
.nse-ticker .tk-track{position:absolute;top:0;bottom:0;display:flex;align-items:center;gap:30px;white-space:nowrap;
  font-family:"JetBrains Mono",monospace;font-size:9.5px;color:rgba(236,231,255,.62);padding-left:100%;animation:nseTick 42s linear infinite}
@keyframes nseTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nse-ticker .tk-sig{display:inline-flex;align-items:center;gap:7px}
.nse-ticker .tk-reg{color:rgba(192,132,252,.85)}
.nse-ticker .tk-v.hi{color:#ff8a8a;font-weight:600}.nse-ticker .tk-v.md{color:#ffb86b;font-weight:600}.nse-ticker .tk-v.lo{color:#86efac;font-weight:600}
.nse-ticker .tk-sep{color:rgba(192,132,252,.25)}

/* ── dimension telemetry dock (right) ── */
.nse-tele{position:absolute;right:18px;top:50%;transform:translateY(-50%);z-index:7;width:208px;max-width:32vw;
  padding:14px 14px 13px;border-radius:16px;background:rgba(24,10,46,.55);backdrop-filter:blur(18px) saturate(150%);
  border:1px solid rgba(129,140,248,.22);box-shadow:0 10px 40px rgba(60,40,170,.32);
  font-family:"JetBrains Mono",monospace;animation:nseRise .7s cubic-bezier(.2,.8,.2,1) .2s both}
.nse-tele-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px;
  font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:rgba(129,140,248,.7)}
.nse-tele-head .dot{width:5px;height:5px;border-radius:50%;background:#818cf8;box-shadow:0 0 8px #818cf8;animation:nseBlink 1.5s ease-in-out infinite}
.nse-drow{display:grid;grid-template-columns:24px 1fr 30px;gap:7px;align-items:center;padding:4px 0;font-size:9.5px}
.nse-drow .dk{color:#818cf8;font-variant-numeric:tabular-nums;font-size:8.5px}
.nse-drow .dn{color:rgba(236,231,255,.78);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nse-drow .dv{text-align:right;color:#c4b5fd;font-variant-numeric:tabular-nums}
.nse-drow .dbar{grid-column:1/-1;height:2px;border-radius:99px;background:rgba(129,140,248,.12);overflow:hidden;position:relative}
.nse-drow .dbar>i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#818cf8,#c084fc);box-shadow:0 0 7px #a78bfa;transition:width .5s cubic-bezier(.4,0,.2,1)}
.nse-tele-foot{margin-top:11px;padding-top:10px;border-top:1px solid rgba(129,140,248,.16);display:flex;align-items:center;gap:11px}
.nse-dial{position:relative;width:46px;height:46px;flex:0 0 auto}
.nse-dial svg{width:100%;height:100%;transform:rotate(-90deg)}
.nse-dial-v{position:absolute;inset:0;display:grid;place-items:center;font-size:11px;font-weight:700;color:#f3e8ff}
.nse-dial-meta .l{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:rgba(129,140,248,.7);margin-bottom:3px}
.nse-dial-meta .n{font-size:11px;color:#ece7ff;line-height:1.25}

/* ── concentric dimension ring around the core readout ── */
.nse-core-ring{position:absolute;inset:-34px;pointer-events:none}
.nse-core-ring svg{width:100%;height:100%;overflow:visible}
.nse-core-ring .seg{transition:stroke-opacity .5s ease}

@media(max-width:1180px){ .nse-tele{display:none} }
@media(max-width:880px){
  .nse-stack{display:none}
}
@media(max-width:560px){
  .nse-hud.tl,.nse-hud.tr{display:none}
  .nse-header .nse-divider,.nse-phases{display:none}
  .nse-ticker{height:20px}
}
@media(prefers-reduced-motion:reduce){
  .nse-bg-aurora,.nse-bg-grid,.nse-mark-core,.nse-con-bar::after,
  .nse-ticker .tk-track,.nse-tele-head .dot,.nse-live i{animation:none}
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

// ── Realistic 3D Earth canvas (d3-geo orthographic) + orbiting engine nodes ─────
// Renders a real rotating Earth — natural ocean/land colours, true country
// borders (from /countries-110m.json), graticule, day/night terminator shading
// and a specular sun-glint — then keeps the violet HUD identity by orbiting the
// nine engine nodes around it with neural pulses firing toward the planet core.

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

    let destroyed = false;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, cx = 0, cy = 0, R = 0;

    // d3 bits resolved after dynamic import
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let proj: any = null;
    let gpath: any = null;
    let grat: any = null;
    let countries: any = null;
    let landMass: any = null;
    const sphere: any = { type: 'Sphere' };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // natural earth palette + violet atmosphere to keep theme cohesion
    const COL = {
      ocean0: '#0a2742', ocean1: '#15466e',
      land0:  '#5bbf6a', land1:  '#2f7a44',   // green; mixed with tan via second fill
      tan:    'rgba(150,140,80,.30)',
      coast:  'rgba(190,255,205,.55)',
      border: 'rgba(20,40,30,.45)',
      grat:   'rgba(150,200,255,.12)',
      rim:    'rgba(192,132,252,.85)',         // violet atmosphere rim (theme)
    };
    let oceanGrad: CanvasGradient | null = null;
    let landGrad: CanvasGradient | null = null;

    const rebuildGradients = () => {
      oceanGrad = ctx.createRadialGradient(cx - R * .4, cy - R * .4, R * .1, cx, cy, R);
      oceanGrad.addColorStop(0, COL.ocean1); oceanGrad.addColorStop(1, COL.ocean0);
      landGrad = ctx.createRadialGradient(cx - R * .4, cy - R * .4, R * .1, cx, cy, R);
      landGrad.addColorStop(0, COL.land0); landGrad.addColorStop(1, COL.land1);
    };

    const fit = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2; cy = h / 2;
      R = Math.max(48, Math.min(w, h) * 0.17); // compact, refined globe
      if (proj) { proj.scale(R).translate([cx, cy]); rebuildGradients(); }
    };
    fit();
    window.addEventListener('resize', fit);

    let t = 0;

    const drawEarth = () => {
      if (!proj || !gpath) {
        // pre-load fallback: plain ocean sphere so there's never an empty frame
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = COL.ocean0; ctx.fill();
        return;
      }
      // Ocean sphere
      ctx.beginPath(); gpath(sphere); ctx.fillStyle = oceanGrad!; ctx.fill();
      // Graticule
      ctx.beginPath(); gpath(grat); ctx.strokeStyle = COL.grat; ctx.lineWidth = 0.6; ctx.stroke();
      // Land fill (merged land — natural green)
      if (landMass) {
        ctx.beginPath(); gpath(landMass); ctx.fillStyle = landGrad!; ctx.fill();
        // tan overlay for terrain variation
        ctx.beginPath(); gpath(landMass); ctx.fillStyle = COL.tan; ctx.fill();
      }
      // Country borders
      if (countries) {
        ctx.beginPath(); gpath(countries);
        ctx.strokeStyle = COL.border; ctx.lineWidth = 0.9; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.beginPath(); gpath(countries);
        ctx.strokeStyle = COL.coast; ctx.lineWidth = 0.5; ctx.stroke();
      }
      // Day/night terminator shade + specular sun-glint (clipped to sphere)
      ctx.save();
      ctx.beginPath(); gpath(sphere); ctx.clip();
      const shade = ctx.createRadialGradient(cx - R * .35, cy - R * .35, R * .2, cx + R * .18, cy + R * .18, R * 1.1);
      shade.addColorStop(0, 'rgba(0,5,15,0)'); shade.addColorStop(.55, 'rgba(0,5,15,0)'); shade.addColorStop(1, 'rgba(0,5,15,.6)');
      ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
      const sx = cx - R * .42, sy = cy - R * .42;
      const sp = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * .55);
      sp.addColorStop(0, 'rgba(220,240,255,.4)'); sp.addColorStop(.4, 'rgba(180,220,255,.1)'); sp.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = sp; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    };

    const draw = () => {
      if (destroyed) return;
      t += reduce ? 0 : 0.016;
      const st = stageRef.current;
      const prog = Math.min(1, (st + 1) / ENGINES.length);

      ctx.clearRect(0, 0, w, h);

      // outer atmosphere glow (violet, behind globe)
      const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5);
      glow.addColorStop(0, `rgba(168,85,247,${0.18 + prog * 0.12})`);
      glow.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

      // spin the globe
      if (proj && !reduce) proj.rotate([t * 14, -12]);

      drawEarth();

      // violet atmosphere rim
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = COL.rim; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(232,121,249,${0.14 + prog * 0.12})`; ctx.lineWidth = 2.4; ctx.stroke();

      // ── orbiting engine nodes + neural pulse links (theme identity) ──
      const orbitRx = R * 2.0, orbitRy = R * 0.8;
      const N = ENGINES.length;
      const nodes = ENGINES.map((e, i) => {
        const ang = (i / N) * Math.PI * 2 + t * 0.22;
        const nx = cx + Math.cos(ang) * orbitRx;
        const ny = cy + Math.sin(ang) * orbitRy;
        const depth = Math.sin(ang);
        return { e, i, nx, ny, depth, ang };
      }).sort((a, b) => a.depth - b.depth);

      ctx.strokeStyle = 'rgba(129,140,248,0.16)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(cx, cy, orbitRx, orbitRy, 0, 0, Math.PI * 2); ctx.stroke();

      for (const node of nodes) {
        const active = node.i <= st;
        const isCurrent = node.i === st;
        const dz = (node.depth + 1) / 2;
        const baseR = 2.2 + dz * 2.2;
        const col = node.e.warn ? '255,184,107' : '232,121,249';

        if (active) {
          const linkA = isCurrent ? 0.6 : 0.22;
          const grad = ctx.createLinearGradient(node.nx, node.ny, cx, cy);
          grad.addColorStop(0, `rgba(${col},${linkA})`);
          grad.addColorStop(1, 'rgba(192,132,252,0.05)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = isCurrent ? 1.5 : 0.8;
          ctx.beginPath(); ctx.moveTo(node.nx, node.ny); ctx.lineTo(cx, cy); ctx.stroke();

          const pp = ((t * (isCurrent ? 0.9 : 0.4)) + node.i * 0.37) % 1;
          const px = node.nx + (cx - node.nx) * pp;
          const py = node.ny + (cy - node.ny) * pp;
          ctx.fillStyle = `rgba(245,208,254,${(1 - pp) * (isCurrent ? 1 : 0.6)})`;
          ctx.shadowBlur = 10; ctx.shadowColor = `rgba(${col},1)`;
          ctx.beginPath(); ctx.arc(px, py, isCurrent ? 2.6 : 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

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

      raf = requestAnimationFrame(draw);
    };

    // start a fallback loop immediately; upgrade to real earth once d3 loads
    raf = requestAnimationFrame(draw);

    (async () => {
      try {
        const [
          { geoOrthographic, geoPath, geoGraticule10 },
          { feature: topoFeature },
        ] = await Promise.all([import('d3-geo'), import('topojson-client')]);
        if (destroyed) return;
        proj = geoOrthographic().clipAngle(90).scale(R).translate([cx, cy]);
        gpath = geoPath(proj, ctx);
        grat = geoGraticule10();
        rebuildGradients();
        const res = await fetch('/countries-110m.json');
        const topo = await res.json();
        if (destroyed) return;
        countries = topoFeature(topo, topo.objects.countries);
        landMass = topoFeature(topo, topo.objects.land);
      } catch { /* graceful: keep ocean-only sphere */ }
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
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

// ── Region signal ticker (top) ────────────────────────────────────────────────

const RegionTicker: React.FC = () => {
  const items = useState(buildTicker)[0];
  const loop = [...items, ...items];
  return (
    <div className="nse-ticker" aria-hidden="true">
      <div className="tk-lead"><i />Global Feed</div>
      <div className="tk-track">
        {loop.map((s, i) => (
          <React.Fragment key={i}>
            <span className="tk-sig">
              <span className="tk-reg">{s.reg}</span>
              <span>{s.sig}</span>
              <span className={`tk-v ${s.tone}`}>{s.v}%</span>
            </span>
            {i < loop.length - 1 && <span className="tk-sep">◆</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── Dimension telemetry dock (right) + confidence dial ─────────────────────────

const DimensionTelemetry: React.FC<{ stage: number; confidence: number }> = ({ stage, confidence }) => {
  // Each dimension "comes online" as the corresponding engine stage is reached.
  const [vals, setVals] = useState(() => DIMS.map(() => 0));
  useEffect(() => {
    const iv = setInterval(() => {
      setVals(prev => prev.map((v, i) => {
        // DIMS map to engine stages 1..6 (engine 0 is CORE synthesis).
        const online = stage >= i + 1;
        const target = online ? Math.min(0.99, DIMS[i].base + Math.sin(Date.now() / 1400 + i) * 0.05) : 0.05;
        return v + (target - v) * 0.12;
      }));
    }, 160);
    return () => clearInterval(iv);
  }, [stage]);

  const C = 2 * Math.PI * 19;
  const off = (C * (1 - confidence / 100)).toFixed(2);

  return (
    <div className="nse-tele" aria-hidden="true">
      <div className="nse-tele-head"><span>Dimension Signals</span><span className="dot" /></div>
      {DIMS.map((d, i) => {
        const pct = Math.round(vals[i] * 100);
        return (
          <div className="nse-drow" key={d.k}>
            <span className="dk">{d.k}</span>
            <span className="dn">{d.n}</span>
            <span className="dv">{pct}%</span>
            <span className="dbar"><i style={{ width: `${pct}%` }} /></span>
          </div>
        );
      })}
      <div className="nse-tele-foot">
        <div className="nse-dial">
          <svg viewBox="0 0 46 46">
            <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(129,140,248,.14)" strokeWidth="3.5" />
            <circle cx="23" cy="23" r="19" fill="none" stroke="url(#nseDialG)" strokeWidth="3.5"
              strokeLinecap="round" strokeDasharray={C.toFixed(2)} strokeDashoffset={off}
              style={{ transition: 'stroke-dashoffset .6s ease' }} />
            <defs>
              <linearGradient id="nseDialG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
          </svg>
          <div className="nse-dial-v">{confidence}%</div>
        </div>
        <div className="nse-dial-meta">
          <div className="l">Model</div>
          <div className="n">Confidence<br />Validation</div>
        </div>
      </div>
    </div>
  );
};

// ── Concentric dimension ring around the core % readout ────────────────────────

const CoreRing: React.FC<{ stage: number }> = ({ stage }) => (
  <div className="nse-core-ring" aria-hidden="true">
    <svg viewBox="0 0 100 100">
      {Array.from({ length: ENGINES.length }).map((_, i) => {
        const total = ENGINES.length;
        const gap = 4; // deg gap between segments
        const seg = 360 / total;
        const a0 = i * seg - 90 + gap / 2;
        const a1 = (i + 1) * seg - 90 - gap / 2;
        const r = 46;
        const rad = (d: number) => (d * Math.PI) / 180;
        const x0 = 50 + r * Math.cos(rad(a0)), y0 = 50 + r * Math.sin(rad(a0));
        const x1 = 50 + r * Math.cos(rad(a1)), y1 = 50 + r * Math.sin(rad(a1));
        const on = i <= stage;
        return (
          <path key={i} className="seg"
            d={`M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`}
            fill="none" stroke={on ? '#e879f9' : 'rgba(192,132,252,.18)'} strokeWidth={on ? 2.4 : 1.4}
            strokeLinecap="round" strokeOpacity={on ? 0.95 : 0.5}
            style={{ filter: on ? 'drop-shadow(0 0 4px rgba(232,121,249,.7))' : 'none' }} />
        );
      })}
    </svg>
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
  // Model confidence ramps as engines complete (40% → ~96%).
  const confidence = Math.min(96, 40 + Math.round((clamped / (ENGINES.length - 1)) * 56));

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

      <RegionTicker />

      <div className="nse-stage">
        <NeuralSphereCanvas stage={clamped} />
        <div className="nse-core" aria-hidden="true">
          <CoreRing stage={clamped} />
          <span className="nse-core-pct">{pct}%</span>
          <span className="nse-core-sub">Synthesizing</span>
        </div>
      </div>

      <EngineStack stage={clamped} />
      <DimensionTelemetry stage={clamped} confidence={confidence} />

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
