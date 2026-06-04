// RiskCalculatorNeuralLoader.tsx — Neural intelligence engine for the
// HumanProof Risk Calculator. Visualizes the 6-dimension AI displacement
// scoring engine processing role, industry, country and experience signals.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  stage: number;
  roleLabel?: string;
  industryLabel?: string;
  countryLabel?: string;
}

// ── Signal sources (input layer) ───────────────────────────────────────────────
const SECTORS = [
  { id: 'D1', name: 'Task Automatability',  base: 0.82, warn: true  },
  { id: 'D2', name: 'AI Tool Maturity',     base: 0.78, warn: true  },
  { id: 'D3', name: 'Human Amplification',  base: 0.46, warn: false },
  { id: 'D4', name: 'Experience Shield',    base: 0.52, warn: false },
  { id: 'D5', name: 'Country Exposure',     base: 0.69, warn: true  },
  { id: 'D6', name: 'Social Capital Moat',  base: 0.41, warn: false },
  { id: 'RO', name: 'Role Vulnerability',   base: 0.74, warn: true  },
  { id: 'IN', name: 'Industry Pressure',    base: 0.67, warn: false },
];

const STATUS_MESSAGES = [
  'Initializing 6-dimension displacement engine…',
  'Mapping task automatability for your role…',
  'Modeling AI tool maturity across your sector…',
  'Analyzing agentic wave exposure vectors…',
  'Propagating activations through hidden layers…',
  'Mapping capability threshold state…',
  'Computing 2030 structural disruption exposure…',
  'Correlating country labour-market signals…',
  'Fusing experience-shield coefficients…',
  'Scoring social capital moat depth…',
  'Detecting task-level AI automation patterns…',
  'Validating against 8,400+ role assessments…',
  'Calibrating displacement confidence intervals…',
  'Synthesizing your AI displacement intelligence…',
];

const PATTERN_CALLOUTS = [
  'PATTERN · high task-automation exposure',
  'PATTERN · mature AI tooling in sector',
  'PATTERN · low human-amplification moat',
  'PATTERN · experience shield insufficient',
  'PATTERN · country adoption acceleration',
  'PATTERN · social capital gap detected',
  'CLUSTER · multi-dimension risk convergence',
  'ANOMALY · role-market divergence signal',
];

const TICKER_SIGNALS = [
  { name: 'Task Automatability', base: 82, tone: 'alert'   },
  { name: 'AI Tool Maturity',    base: 78, tone: 'alert'   },
  { name: 'Human Amplification', base: 46, tone: 'warn'    },
  { name: 'Experience Shield',   base: 52, tone: 'neutral' },
  { name: 'Country Exposure',    base: 69, tone: 'warn'    },
  { name: 'Social Capital',      base: 41, tone: 'neutral' },
  { name: 'Role Vulnerability',  base: 74, tone: 'alert'   },
  { name: 'Industry Pressure',   base: 67, tone: 'warn'    },
];

const PHASES = ['Ingest', 'Score', 'Model', 'Forecast'];

function stageToInitialPhase(s: number) { return s <= 1 ? 1 : s <= 4 ? 2 : 3; }

function buildTickerItems() {
  return Array.from({ length: 28 }, (_, i) => {
    const s = TICKER_SIGNALS[i % TICKER_SIGNALS.length];
    const value = Math.max(34, Math.min(97, s.base + Math.round((Math.random() - 0.5) * 18)));
    return { name: s.name, value, tone: s.tone };
  });
}

// ── CSS (scoped to .nal-root) ──────────────────────────────────────────────────
const NEURAL_CSS = `
.nal-root{position:fixed;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 32%,#0a1b34 0%,#061224 42%,#03060d 100%);font-family:"Inter",-apple-system,system-ui,sans-serif;color:#e9f3ff;letter-spacing:.01em;z-index:9999;height:100vh;height:100dvh}
.nal-stars{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.nal-aurora{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(60% 40% at 22% 25%,rgba(111,216,255,.16),transparent 60%),radial-gradient(50% 35% at 78% 78%,rgba(155,123,255,.14),transparent 60%),radial-gradient(40% 30% at 50% 110%,rgba(79,224,192,.10),transparent 60%);animation:nalAurora 18s ease-in-out infinite alternate;mix-blend-mode:screen}
@keyframes nalAurora{from{transform:translate3d(0,0,0) scale(1);opacity:.85}to{transform:translate3d(-2%,1%,0) scale(1.05);opacity:1}}
.nal-gridmesh{position:absolute;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(to right,rgba(111,216,255,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(111,216,255,.05) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse at 50% 50%,transparent 14%,rgba(0,0,0,.7) 42%,rgba(0,0,0,.9) 64%,transparent 92%);-webkit-mask-image:radial-gradient(ellipse at 50% 50%,transparent 14%,rgba(0,0,0,.7) 42%,rgba(0,0,0,.9) 64%,transparent 92%);animation:nalGrid 9s ease-in-out infinite}
@keyframes nalGrid{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.8;transform:scale(1.015)}}
.nal-vignette{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 38%,rgba(2,6,14,.55) 100%)}
.nal-scanlines{position:absolute;inset:0;z-index:5;pointer-events:none;background-image:repeating-linear-gradient(to bottom,rgba(111,216,255,.025) 0px,rgba(111,216,255,.025) 1px,transparent 1px,transparent 3px);mix-blend-mode:overlay;opacity:.5}

.nal-topbar{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:12px;padding:7px 14px;border-radius:999px;background:rgba(8,18,36,.6);backdrop-filter:blur(16px) saturate(140%);border:1px solid rgba(111,216,255,.18);box-shadow:0 8px 30px rgba(0,0,0,.45);font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;isolation:isolate}
.nal-crest{width:20px;height:20px;border-radius:50%;flex-shrink:0;overflow:hidden;position:relative;background:radial-gradient(circle at 35% 30%,#b9eaff 0%,#6fd8ff 35%,#1a5a8a 70%,#062136 100%);box-shadow:0 0 14px rgba(111,216,255,.6),inset 0 0 6px rgba(255,255,255,.5)}
.nal-crest-sheen{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg,rgba(255,255,255,.45) 30deg,transparent 90deg);animation:nalSpin 4s linear infinite}
@keyframes nalSpin{to{transform:rotate(360deg)}}
.nal-engine{color:#e9f3ff;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:600}
.nal-engine .sub{color:rgba(111,216,255,.55);font-weight:400;margin-left:6px}
.nal-divider{width:1px;height:16px;background:rgba(111,216,255,.22)}
.nal-phases{display:flex;align-items:center;gap:8px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(233,243,255,.32)}
.nal-phase{display:flex;align-items:center;gap:5px;transition:color .4s ease}
.nal-phase .pdot{width:5px;height:5px;border-radius:50%;background:rgba(111,216,255,.2);transition:background .4s ease,box-shadow .4s ease}
.nal-phase+.nal-phase::before{content:"";width:14px;height:1px;background:rgba(111,216,255,.25);margin-right:3px}
.nal-phase.active{color:#e9f3ff}.nal-phase.active .pdot{background:#6fd8ff;box-shadow:0 0 10px #6fd8ff}
.nal-phase.done{color:rgba(233,243,255,.62)}.nal-phase.done .pdot{background:#4fe0c0}

.nal-ticker{position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:7;width:min(620px,calc(100vw - 24px));height:24px;overflow:hidden;border-radius:999px;background:rgba(8,18,36,.55);backdrop-filter:blur(12px) saturate(140%);border:1px solid rgba(111,216,255,.14);box-shadow:0 6px 24px rgba(0,0,0,.40);mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent)}
.nal-ticker .tlead{position:absolute;left:0;top:0;bottom:0;z-index:2;padding:0 12px;display:flex;align-items:center;background:linear-gradient(90deg,rgba(8,18,36,.95) 65%,transparent);font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#ffb547;gap:6px}
.nal-ticker .tldot{width:5px;height:5px;border-radius:50%;background:#ffb547;box-shadow:0 0 8px #ffb547;animation:nalDot 1.2s ease-in-out infinite}
@keyframes nalDot{0%,100%{opacity:1}50%{opacity:.3}}
.nal-ticker .ttrack{position:absolute;top:0;bottom:0;display:flex;align-items:center;gap:36px;font-family:"JetBrains Mono",monospace;font-size:10px;color:rgba(233,243,255,.62);white-space:nowrap;animation:nalTick 64s linear infinite;padding-left:100%}
@keyframes nalTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nal-ticker .tsig{display:inline-flex;align-items:center;gap:8px}
.nal-ticker .tsig-sig.alert{color:#ff6680;font-weight:600}.nal-ticker .tsig-sig.warn{color:#ffb547;font-weight:600}.nal-ticker .tsig-sig.neutral{color:#6fd8ff;font-weight:600}
.nal-ticker .tsep{color:rgba(111,216,255,.25)}

.nal-hud{position:absolute;z-index:7;display:flex;align-items:center;gap:7px;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(233,243,255,.5)}
.nal-hud .tick{width:14px;height:1px;background:rgba(111,216,255,.5)}
.nal-hud .v{color:#6fd8ff}
.nal-hud.tl{top:46px;left:14px}.nal-hud.tr{top:46px;right:14px}
.nal-hud.bl{bottom:14px;left:14px}.nal-hud.br{bottom:14px;right:14px}

.nal-body{position:absolute;left:0;right:0;top:86px;bottom:0;overflow:hidden;display:flex;flex-direction:row;align-items:stretch;padding:6px 10px calc(8px + env(safe-area-inset-bottom,0px));gap:8px;z-index:2}
.nal-left-col{flex:0 0 230px;display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0;overflow:hidden}
.nal-center-col{flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;overflow:hidden}
.nal-right-col{flex:0 0 210px;display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0;overflow:hidden}

.nal-composition{flex-shrink:0;position:relative;z-index:2;--nal-avh:calc(100vh - 196px);--nal-avh:calc(100dvh - 196px);width:min(100%, calc(var(--nal-avh) * 1.35), 920px);aspect-ratio:1.35;align-self:center;display:grid;place-items:center;overflow:hidden}
.nal-halo{position:absolute;inset:4%;border-radius:28px;background:radial-gradient(ellipse at 70% 50%,rgba(255,138,92,.10) 0%,transparent 46%),radial-gradient(ellipse at 30% 50%,rgba(79,224,192,.10) 0%,transparent 46%),radial-gradient(ellipse at 50% 50%,rgba(111,216,255,.10) 0%,rgba(155,123,255,.05) 40%,transparent 64%);filter:blur(10px);animation:nalHalo 6s ease-in-out infinite;pointer-events:none}
@keyframes nalHalo{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.03)}}
.nal-net-canvas{position:absolute;inset:0;width:100%;height:100%}

/* left rail */
.nal-card{background:rgba(8,18,36,.55);border:1px solid rgba(111,216,255,.14);border-radius:14px;backdrop-filter:blur(10px)}
.nal-sector-rail{flex:1 1 auto;min-height:0;padding:10px 11px;display:flex;flex-direction:column;gap:6px;overflow:hidden}
.nal-rhead{display:flex;align-items:center;justify-content:space-between;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:rgba(233,243,255,.55);margin-bottom:2px}
.nal-live{display:flex;align-items:center;gap:5px;color:#4fe0c0}
.nal-live .pulse{width:5px;height:5px;border-radius:50%;background:#4fe0c0;box-shadow:0 0 8px #4fe0c0;animation:nalDot 1.4s ease-in-out infinite}
.nal-srow{display:grid;grid-template-columns:18px 1fr 30px;align-items:center;gap:6px;font-size:11px;color:rgba(233,243,255,.7)}
.nal-srow .si{font-family:"JetBrains Mono",monospace;font-size:9px;color:rgba(111,216,255,.6)}
.nal-srow .sn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nal-srow .sv{text-align:right;font-family:"JetBrains Mono",monospace;font-size:10px;color:#6fd8ff}
.nal-srow .sbar{grid-column:1/-1;height:3px;border-radius:2px;background:rgba(111,216,255,.1);overflow:hidden}
.nal-srow .sbar i{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,#6fd8ff,#4fe0c0);transition:width .4s ease}
.nal-srow.warn .sbar i{background:linear-gradient(90deg,#ffb547,#ff6680)}

/* throughput meter */
.nal-throughput{padding:11px 12px;display:flex;flex-direction:column;gap:7px}
.nal-tp-top{display:flex;align-items:baseline;justify-content:space-between}
.nal-tp-val{font-family:"JetBrains Mono",monospace;font-size:18px;font-weight:700;color:#e9f3ff;line-height:1}
.nal-tp-unit{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(111,216,255,.6)}
.nal-tp-spark{height:30px;display:flex;align-items:flex-end;gap:2px}
.nal-tp-spark i{flex:1;background:linear-gradient(180deg,#6fd8ff,rgba(111,216,255,.15));border-radius:1px;transition:height .25s ease;min-height:2px}
.nal-tp-label{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:rgba(233,243,255,.4)}

/* pattern detections feed */
.nal-patterns{padding:10px 11px;display:flex;flex-direction:column;gap:5px;overflow:hidden}
.nal-prow{display:flex;align-items:center;gap:7px;font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.04em;color:rgba(233,243,255,.66);animation:nalPin .5s ease both}
@keyframes nalPin{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
.nal-prow .pd{width:5px;height:5px;border-radius:50%;flex-shrink:0;background:#9b7bff;box-shadow:0 0 7px #9b7bff}
.nal-prow.hit .pd{background:#4fe0c0;box-shadow:0 0 7px #4fe0c0}
.nal-prow .pt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* right gauges */
.nal-gauges{display:flex;flex-direction:column;gap:8px}
.nal-gauge{display:flex;align-items:center;gap:10px;padding:9px 11px}
.nal-ring{position:relative;width:46px;height:46px;flex-shrink:0}
.nal-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.nal-gval{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:#e9f3ff}
.nal-glabel{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(111,216,255,.55)}
.nal-gname{font-size:11px;font-weight:600;color:#e9f3ff;margin-top:1px}
.nal-gsub{font-size:9px;color:rgba(233,243,255,.4);margin-top:1px}

/* center panel */
.nal-panel{flex-shrink:0;width:min(100%,560px);padding:12px 16px;box-shadow:0 10px 36px rgba(0,0,0,.4)}
.nal-panel-row{display:flex;align-items:center;gap:9px;margin-bottom:4px}
.nal-dot{width:7px;height:7px;border-radius:50%;background:#4fe0c0;box-shadow:0 0 10px #4fe0c0;animation:nalDot 1.3s ease-in-out infinite}
.nal-label{font-size:13px;font-weight:700;letter-spacing:.01em;color:#e9f3ff}
.nal-status-text{font-size:11px;color:rgba(233,243,255,.6);font-family:"JetBrains Mono",monospace;min-height:15px}
.nal-bar{height:3px;margin:9px 0 7px;border-radius:2px;background:rgba(111,216,255,.12);overflow:hidden;position:relative}
.nal-bar::after{content:"";position:absolute;inset:0;width:40%;border-radius:2px;background:linear-gradient(90deg,transparent,#6fd8ff,#9b7bff,transparent);animation:nalBar 1.6s ease-in-out infinite}
@keyframes nalBar{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
.nal-meta{display:flex;justify-content:space-between;gap:8px;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.04em;color:rgba(233,243,255,.45)}
.nal-meta b{color:#6fd8ff;font-weight:700}

@media(max-width:1024px){.nal-right-col{display:none}.nal-composition{aspect-ratio:1.2}}
@media(max-width:760px){.nal-left-col{display:none}.nal-composition{aspect-ratio:1;width:min(100%,calc(var(--nal-avh)),560px)}}
`;

export const RiskCalculatorNeuralLoader: React.FC<Props> = ({
  stage,
  roleLabel,
  industryLabel,
  countryLabel,
}) => {
  const netRef   = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);

  const [statusText, setStatusText] = useState(STATUS_MESSAGES[0]);
  const [signals,    setSignals]    = useState(0);
  const [companies,  setCompanies]  = useState(0);
  const [patternsFound, setPatternsFound] = useState(0);
  const [throughput, setThroughput] = useState(0);            // signals/sec, in thousands
  const [spark, setSpark] = useState<number[]>(() => Array.from({ length: 22 }, () => 0.2 + Math.random() * 0.5));
  const [clock,      setClock]      = useState('00:00:00 UTC');
  const [sectorVals, setSectorVals] = useState(() => SECTORS.map(() => 0));
  const [patternFeed, setPatternFeed] = useState<{ t: string; hit: boolean; id: number }[]>([]);
  const [g1, setG1] = useState(0);
  const [g2, setG2] = useState(0);
  const [g3, setG3] = useState(0);
  const [activePhase, setActivePhase] = useState(() => stageToInitialPhase(stage));
  const [tickerItems] = useState(buildTickerItems);

  const r = roleLabel || 'your role';
  const ind = industryLabel || 'your sector';
  const labelText = r !== 'your role' ? `Scoring displacement risk · ${r} · ${ind}` : 'Risk Calculator · Neural Displacement Engine';

  // CSS injection
  useEffect(() => {
    const id = 'nal-css';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = NEURAL_CSS;
      document.head.appendChild(el);
    }
    return () => document.getElementById(id)?.remove();
  }, []);

  // status rotation
  useEffect(() => {
    let mi = 0;
    const iv = setInterval(() => { mi = (mi + 1) % STATUS_MESSAGES.length; setStatusText(STATUS_MESSAGES[mi]); }, 2100);
    return () => clearInterval(iv);
  }, []);

  // live counters — signals climb into the millions, companies into thousands
  useEffect(() => {
    let si = 0, co = 0;
    const iv = setInterval(() => {
      si += Math.round(180000 + Math.random() * 240000);       // ~1.5–2.5M / sec perceived
      co = Math.min(14237, co + Math.round(120 + Math.random() * 280));
      if (si > 9_999_000) si = 1_200_000 + Math.round(Math.random() * 400000);
      setSignals(si); setCompanies(co);
    }, 90);
    return () => clearInterval(iv);
  }, []);

  // throughput meter + sparkline
  useEffect(() => {
    const iv = setInterval(() => {
      const base = 1.6 + Math.sin(Date.now() / 1400) * 0.5 + Math.random() * 0.4;  // M/s
      setThroughput(base);
      setSpark(prev => {
        const next = prev.slice(1);
        next.push(Math.max(0.08, Math.min(1, (base - 0.9) / 1.6 + (Math.random() - 0.5) * 0.18)));
        return next;
      });
    }, 280);
    return () => clearInterval(iv);
  }, []);

  // clock
  useEffect(() => {
    const tick = () => {
      const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // sector bars
  useEffect(() => {
    const iv = setInterval(() => {
      setSectorVals(prev => prev.map((v, i) => {
        const s = SECTORS[i];
        const target = Math.min(0.99, Math.max(0.05,
          s.base + Math.sin(Date.now() / (3200 + s.base * 1000)) * 0.06 + (Math.random() - 0.5) * 0.02));
        return v + (target - v) * 0.08;
      }));
    }, 220);
    return () => clearInterval(iv);
  }, []);

  // pattern-detection feed
  useEffect(() => {
    let pid = 0;
    const iv = setInterval(() => {
      const hit = Math.random() < 0.45;
      const t = PATTERN_CALLOUTS[Math.floor(Math.random() * PATTERN_CALLOUTS.length)];
      if (hit) setPatternsFound(n => n + 1);
      setPatternFeed(prev => [{ t, hit, id: pid++ }, ...prev].slice(0, 5));
    }, 1500);
    return () => clearInterval(iv);
  }, []);

  // gauges
  useEffect(() => {
    let _g1 = 0, _g2 = 0, _g3 = 0;
    const iv = setInterval(() => {
      const t = Date.now() / 1000;
      _g1 += (0.94 + Math.sin(t * 0.6) * 0.02       - _g1) * 0.05;
      _g2 += (0.62 + Math.sin(t * 0.4 + 1.2) * 0.08 - _g2) * 0.05;
      _g3 += (0.86 + Math.sin(t * 0.8 + 2.4) * 0.05 - _g3) * 0.05;
      setG1(_g1); setG2(_g2); setG3(_g3);
    }, 60);
    return () => clearInterval(iv);
  }, []);

  // phase rotation
  useEffect(() => {
    const iv = setInterval(() => setActivePhase(p => p + 1 >= PHASES.length ? 1 : p + 1), 5500);
    return () => clearInterval(iv);
  }, []);

  // ── Canvas: intelligence engine ────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0, destroyed = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const hexA = (hex: string, a: number) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
      return `rgba(${r},${g},${b},${a})`;
    };

    // Starfield ------------------------------------------------------------------
    const sCvs = starsRef.current;
    const sCtx = sCvs?.getContext('2d');
    let sW = 0, sH = 0;
    type Star = { x:number;y:number;r:number;a:number;tw:number;sp:number };
    let stars: Star[] = [];
    function sizeStars() {
      if (!sCvs || !sCtx) return;
      sW = window.innerWidth; sH = window.innerHeight;
      sCvs.width = sW * dpr; sCvs.height = sH * dpr;
      sCvs.style.width = sW + 'px'; sCvs.style.height = sH + 'px';
      sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(260, Math.round((sW * sH) / 10000));
      stars = Array.from({ length: n }, () => ({
        x: Math.random()*sW, y: Math.random()*sH,
        r: Math.random()*1.1 + 0.2, a: Math.random()*0.5 + 0.15,
        tw: Math.random()*Math.PI*2, sp: 0.4 + Math.random()*1.0,
      }));
    }
    function drawStars(t: number) {
      if (!sCtx) return;
      sCtx.clearRect(0, 0, sW, sH);
      for (const s of stars) {
        const tw = 0.55 + 0.45*Math.sin(t*0.0012*s.sp + s.tw);
        sCtx.beginPath(); sCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        sCtx.fillStyle = `rgba(180,210,255,${(s.a*tw).toFixed(3)})`; sCtx.fill();
      }
    }

    // Engine ---------------------------------------------------------------------
    const nCvs = netRef.current;
    const nCtx = nCvs?.getContext('2d');
    if (!nCvs || !nCtx) return;

    // Deep network: signal sources → 3 hidden reasoning layers → risk core
    const LAYERS: { count: number; label: string; tone: 'in'|'hidden'|'out' }[] = [
      { count: 8, label: 'SIGNALS',  tone: 'in' },
      { count: 11, label: 'EMBED',   tone: 'hidden' },
      { count: 13, label: 'REASON',  tone: 'hidden' },
      { count: 9, label: 'PATTERN',  tone: 'hidden' },
      { count: 5, label: 'FORECAST', tone: 'hidden' },
      { count: 1, label: 'RISK',     tone: 'out' },
    ];

    type Node = { x:number; y:number; r:number; tone:string; pulse:number; base:number; li:number };
    type Edge = { a:Node; b:Node; w:number; cx:number; cy:number };       // quadratic ctrl pt
    type Pulse = { edge:Edge; t:number; sp:number; col:string };
    type Intake = { x:number; y:number; tx:number; ty:number; t:number; sp:number; col:string };

    let W = 0, H = 0, cx = 0, cy = 0;
    let nodes: Node[][] = [];
    let edges: Edge[] = [];
    let pulses: Pulse[] = [];
    let intake: Intake[] = [];
    let nextPulse = 0, nextIntake = 0;
    let coreBurst = 0;        // 0..1 burst when a prediction resolves at the core

    const TONE: Record<string,string> = { in: '#4fe0c0', hidden: '#6fd8ff', out: '#ff8a5c' };

    function size() {
      const rect = nCvs!.getBoundingClientRect();
      W = Math.max(rect.width, 60); H = Math.max(rect.height, 60);
      cx = W / 2; cy = H / 2;
      nCvs!.width = W * dpr; nCvs!.height = H * dpr;
      nCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      nodes = []; edges = []; pulses = []; intake = [];
      const padX = W * 0.13, usableW = W - padX * 2;
      const gapX = usableW / (LAYERS.length - 1);
      LAYERS.forEach((layer, li) => {
        const lx = padX + gapX * li;
        const col: Node[] = [];
        const cnt = layer.count;
        const spanH = H * (cnt > 9 ? 0.82 : 0.7);
        const startY = (H - spanH) / 2;
        const gapY = cnt > 1 ? spanH / (cnt - 1) : 0;
        for (let i = 0; i < cnt; i++) {
          const y = cnt > 1 ? startY + gapY * i : H / 2;
          col.push({
            x: lx, y, li,
            r: layer.tone === 'out' ? 12 : layer.tone === 'in' ? 5.5 : 4,
            tone: layer.tone, pulse: 0, base: 0.32 + Math.random() * 0.3,
          });
        }
        nodes.push(col);
      });
      // sparse curved synapses (not fully-connected → cleaner, more "designed")
      for (let li = 0; li < nodes.length - 1; li++) {
        for (const a of nodes[li]) {
          // each node connects to 2–4 nodes in the next layer
          const targets = [...nodes[li + 1]].sort(() => Math.random() - 0.5)
            .slice(0, 2 + Math.floor(Math.random() * 3));
          for (const b of targets) {
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const bow = (Math.random() - 0.5) * Math.min(60, Math.abs(b.y - a.y) * 0.5 + 14);
            edges.push({ a, b, w: 0.15 + Math.random() * 0.85, cx: mx, cy: my + bow });
          }
        }
      }
    }

    function spawnPulse() {
      const e = edges[Math.floor(Math.random() * edges.length)];
      if (!e) return;
      const col = e.a.tone === 'in' ? TONE.in : e.b.tone === 'out' ? TONE.out : TONE.hidden;
      pulses.push({ edge: e, t: 0, sp: 0.016 + Math.random() * 0.02, col });
    }

    // a raw signal flying in from the screen edge into an input node
    function spawnIntake() {
      const inputs = nodes[0];
      if (!inputs?.length) return;
      const target = inputs[Math.floor(Math.random() * inputs.length)];
      const side = Math.random();
      let x = 0, y = 0;
      if (side < 0.5) { x = -10; y = Math.random() * H; }            // from left
      else if (side < 0.75) { x = Math.random() * W * 0.4; y = -10; } // top-left
      else { x = Math.random() * W * 0.4; y = H + 10; }              // bottom-left
      intake.push({ x, y, tx: target.x, ty: target.y, t: 0, sp: 0.02 + Math.random() * 0.025, col: TONE.in });
    }

    function qpt(e: Edge, t: number) {
      const mt = 1 - t;
      return {
        x: mt*mt*e.a.x + 2*mt*t*e.cx + t*t*e.b.x,
        y: mt*mt*e.a.y + 2*mt*t*e.cy + t*t*e.b.y,
      };
    }

    function draw(now: number) {
      nCtx!.clearRect(0, 0, W, H);

      // pattern-detection sweep beam (rotating, lights up nodes it crosses)
      const beamAng = (now * 0.0004) % (Math.PI * 2);
      const sweepR = Math.max(W, H) * 0.62;
      {
        const grad = nCtx!.createConicGradient
          ? nCtx!.createConicGradient(beamAng, cx, cy)
          : null;
        if (grad) {
          grad.addColorStop(0, 'rgba(155,123,255,0.10)');
          grad.addColorStop(0.04, 'rgba(155,123,255,0.015)');
          grad.addColorStop(1, 'rgba(155,123,255,0)');
          nCtx!.fillStyle = grad;
          nCtx!.beginPath(); nCtx!.moveTo(cx, cy);
          nCtx!.arc(cx, cy, sweepR, beamAng, beamAng + 0.5);
          nCtx!.closePath(); nCtx!.fill();
        }
      }

      // curved synapses
      for (const e of edges) {
        nCtx!.beginPath();
        nCtx!.moveTo(e.a.x, e.a.y);
        nCtx!.quadraticCurveTo(e.cx, e.cy, e.b.x, e.b.y);
        nCtx!.strokeStyle = `rgba(111,216,255,${(0.02 + e.w * 0.045).toFixed(3)})`;
        nCtx!.lineWidth = 0.55;
        nCtx!.stroke();
      }

      // intake signals streaming into input nodes
      if (!reduceMotion && now >= nextIntake) {
        const burst = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < burst; i++) spawnIntake();
        nextIntake = now + 60 + Math.random() * 90;
      }
      for (let i = intake.length - 1; i >= 0; i--) {
        const p = intake[i];
        p.t += p.sp;
        if (p.t >= 1) {
          // arrival lights up the input node
          const inputs = nodes[0];
          let best = inputs[0], bd = Infinity;
          for (const n of inputs) { const d = Math.abs(n.x - p.tx) + Math.abs(n.y - p.ty); if (d < bd) { bd = d; best = n; } }
          best.pulse = Math.min(1, best.pulse + 0.5);
          intake.splice(i, 1); continue;
        }
        const ease = p.t * p.t;
        const x = p.x + (p.tx - p.x) * ease;
        const y = p.y + (p.ty - p.y) * ease;
        const px = p.x + (p.tx - p.x) * Math.max(0, ease - 0.06);
        const py = p.y + (p.ty - p.y) * Math.max(0, ease - 0.06);
        nCtx!.beginPath(); nCtx!.moveTo(px, py); nCtx!.lineTo(x, y);
        nCtx!.strokeStyle = hexA(p.col, 0.4); nCtx!.lineWidth = 1; nCtx!.lineCap = 'round'; nCtx!.stroke();
        nCtx!.beginPath(); nCtx!.arc(x, y, 1.3, 0, Math.PI*2); nCtx!.fillStyle = hexA(p.col, 0.85); nCtx!.fill();
      }

      // activation packets through synapses
      if (now >= nextPulse) {
        const burst = 4 + Math.floor(Math.random() * 5);
        for (let i = 0; i < burst; i++) spawnPulse();
        nextPulse = now + 70 + Math.random() * 110;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.sp;
        if (p.t >= 1) {
          p.edge.b.pulse = Math.min(1.4, p.edge.b.pulse + 0.55);
          if (p.edge.b.tone === 'out') coreBurst = 1;     // a prediction resolved
          pulses.splice(i, 1); continue;
        }
        const cur = qpt(p.edge, p.t);
        const prev = qpt(p.edge, Math.max(0, p.t - 0.1));
        nCtx!.beginPath(); nCtx!.moveTo(prev.x, prev.y); nCtx!.lineTo(cur.x, cur.y);
        nCtx!.strokeStyle = hexA(p.col, 0.6); nCtx!.lineWidth = 1.5; nCtx!.lineCap = 'round'; nCtx!.stroke();
        nCtx!.beginPath(); nCtx!.arc(cur.x, cur.y, 1.9, 0, Math.PI*2);
        nCtx!.fillStyle = p.col; nCtx!.shadowColor = p.col; nCtx!.shadowBlur = 9; nCtx!.fill(); nCtx!.shadowBlur = 0;
      }

      // neurons
      for (let li = 0; li < nodes.length; li++) {
        for (const nd of nodes[li]) {
          nd.pulse *= 0.93;
          const breathe = 0.5 + 0.5 * Math.sin(now * 0.002 + nd.y * 0.05 + nd.li);
          const a = Math.min(1, nd.base * (0.55 + breathe * 0.4) + nd.pulse * 0.6);
          const col = TONE[nd.tone];
          const rr = nd.r * (1 + nd.pulse * 0.4);
          const g = nCtx!.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, rr * 3.6);
          g.addColorStop(0, hexA(col, a * 0.5)); g.addColorStop(1, hexA(col, 0));
          nCtx!.fillStyle = g;
          nCtx!.beginPath(); nCtx!.arc(nd.x, nd.y, rr * 3.6, 0, Math.PI*2); nCtx!.fill();
          nCtx!.beginPath(); nCtx!.arc(nd.x, nd.y, rr, 0, Math.PI*2);
          nCtx!.fillStyle = hexA(col, Math.min(1, a + 0.25));
          nCtx!.shadowColor = col; nCtx!.shadowBlur = 5 + nd.pulse * 12; nCtx!.fill(); nCtx!.shadowBlur = 0;
        }
      }

      // RISK CONVERGENCE CORE — the output node, rendered large with rings
      const core = nodes[nodes.length - 1]?.[0];
      if (core) {
        coreBurst *= 0.95;
        const col = TONE.out;
        // converging burst ring when a prediction resolves
        if (coreBurst > 0.02) {
          const br = core.r + 6 + (1 - coreBurst) * 26;
          nCtx!.beginPath(); nCtx!.arc(core.x, core.y, br, 0, Math.PI*2);
          nCtx!.strokeStyle = hexA(col, coreBurst * 0.6); nCtx!.lineWidth = 1.5 + coreBurst * 1.5; nCtx!.stroke();
        }
        // slow concentric rings
        for (let k = 0; k < 3; k++) {
          const rr = core.r + 9 + k * 10 + Math.sin(now * 0.0025 + k) * 3;
          nCtx!.beginPath(); nCtx!.arc(core.x, core.y, rr, 0, Math.PI*2);
          nCtx!.strokeStyle = hexA(col, 0.22 - k * 0.05); nCtx!.lineWidth = 1; nCtx!.stroke();
        }
        // rotating tick ring
        const tickN = 36;
        for (let k = 0; k < tickN; k++) {
          const ang = (k / tickN) * Math.PI * 2 + now * 0.0006;
          const r0 = core.r + 22, r1 = r0 + (k % 3 === 0 ? 5 : 2.5);
          nCtx!.beginPath();
          nCtx!.moveTo(core.x + Math.cos(ang) * r0, core.y + Math.sin(ang) * r0);
          nCtx!.lineTo(core.x + Math.cos(ang) * r1, core.y + Math.sin(ang) * r1);
          nCtx!.strokeStyle = hexA(col, 0.28); nCtx!.lineWidth = 1; nCtx!.stroke();
        }
        // bright core
        const cg = nCtx!.createRadialGradient(core.x, core.y, 0, core.x, core.y, core.r * 2.4);
        cg.addColorStop(0, hexA(col, 0.9)); cg.addColorStop(0.5, hexA(col, 0.4)); cg.addColorStop(1, hexA(col, 0));
        nCtx!.fillStyle = cg; nCtx!.beginPath(); nCtx!.arc(core.x, core.y, core.r * 2.4, 0, Math.PI*2); nCtx!.fill();
        nCtx!.beginPath(); nCtx!.arc(core.x, core.y, core.r, 0, Math.PI*2);
        nCtx!.fillStyle = '#fff'; nCtx!.shadowColor = col; nCtx!.shadowBlur = 18; nCtx!.fill(); nCtx!.shadowBlur = 0;
      }

      // layer labels
      nCtx!.font = '600 9px "JetBrains Mono", monospace';
      nCtx!.textAlign = 'center';
      LAYERS.forEach((layer, li) => {
        const x = nodes[li]?.[0]?.x ?? 0;
        nCtx!.fillStyle = 'rgba(233,243,255,0.38)';
        nCtx!.fillText(layer.label, x, H - 5);
      });
    }

    function frame(now: number) {
      if (destroyed) return;
      drawStars(now);
      draw(now);
      raf = requestAnimationFrame(frame);
    }
    function onResize() { sizeStars(); size(); }

    sizeStars();
    requestAnimationFrame(() => { if (!destroyed) { size(); raf = requestAnimationFrame(frame); } });
    window.addEventListener('resize', onResize);
    return () => { destroyed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  const C = 163.36;
  const g1off = C * (1 - g1), g2off = C * (1 - g2), g3off = C * (1 - g3);

  const signalsLabel = signals >= 1e6 ? `${(signals / 1e6).toFixed(2)}M` : signals.toLocaleString();

  return createPortal(
    <div className="nal-root" role="status" aria-label="Calculating AI displacement risk across 6 dimensions">
      <canvas className="nal-stars" ref={starsRef} aria-hidden="true" />
      <div className="nal-aurora"   aria-hidden="true" />
      <div className="nal-gridmesh" aria-hidden="true" />
      <div className="nal-vignette"  aria-hidden="true" />
      <div className="nal-scanlines" aria-hidden="true" />

      {/* Top engine bar */}
      <div className="nal-topbar" aria-hidden="true">
        <span className="nal-crest"><span className="nal-crest-sheen" /></span>
        <span className="nal-engine">Risk Calculator<span className="sub"> Neural Displacement Engine · v2.1</span></span>
        <span className="nal-divider" />
        <div className="nal-phases">
          {PHASES.map((ph, i) => (
            <div key={ph} className={`nal-phase${i < activePhase ? ' done' : i === activePhase ? ' active' : ''}`}>
              <span className="pdot" />{ph}
            </div>
          ))}
        </div>
      </div>

      {/* Live signal ticker */}
      <div className="nal-ticker" aria-hidden="true">
        <div className="tlead"><span className="tldot" />Dimensions</div>
        <div className="ttrack">
          {[...tickerItems, ...tickerItems].map((s, i) => (
            <React.Fragment key={i}>
              <span className="tsig">
                <span className={`tsig-sig ${s.tone}`}>{s.name}</span>
                <span style={{ color: '#e9f3ff' }}>{s.value}%</span>
              </span>
              {i < tickerItems.length * 2 - 1 && <span className="tsep">◆</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Corner HUDs */}
      <div className="nal-hud tl" aria-hidden="true"><span className="tick"/><span>RISK CALCULATOR · NEURAL NET</span></div>
      <div className="nal-hud tr" aria-hidden="true"><span>DISPLACEMENT · D1–D6</span><span className="tick"/></div>
      <div className="nal-hud bl" aria-hidden="true"><span className="tick"/><span>{patternsFound} PATTERNS DETECTED</span></div>
      <div className="nal-hud br" aria-hidden="true"><span className="v">{clock}</span><span className="tick"/></div>

      {/* 3-column body */}
      <div className="nal-body">
        {/* LEFT — input signals + throughput */}
        <div className="nal-left-col" aria-hidden="true">
          <div className="nal-card nal-sector-rail">
            <div className="nal-rhead">
              <span>Signal Sources</span>
              <span className="nal-live"><span className="pulse" />Live</span>
            </div>
            {SECTORS.map((s, i) => {
              const pct = Math.round((sectorVals[i] ?? 0) * 100);
              return (
                <div key={s.id} className={`nal-srow${s.warn ? ' warn' : ''}`}>
                  <span className="si">{s.id}</span>
                  <span className="sn">{s.name}</span>
                  <span className="sv">{pct}%</span>
                  <span className="sbar"><i style={{ width: `${pct}%` }} /></span>
                </div>
              );
            })}
          </div>
          <div className="nal-card nal-throughput">
            <div className="nal-tp-top">
              <span className="nal-tp-val">{throughput.toFixed(2)}<span className="nal-tp-unit"> M/s</span></span>
              <span className="nal-tp-label">Throughput</span>
            </div>
            <div className="nal-tp-spark">
              {spark.map((v, i) => <i key={i} style={{ height: `${Math.round(v * 100)}%` }} />)}
            </div>
            <div className="nal-tp-label">Signals processed per second</div>
          </div>
        </div>

        {/* CENTER — intelligence engine + status panel */}
        <div className="nal-center-col">
          <div className="nal-composition">
            <div className="nal-halo" aria-hidden="true" />
            <canvas className="nal-net-canvas" ref={netRef} aria-hidden="true" />
          </div>
          <div className="nal-card nal-panel">
            <div className="nal-panel-row">
              <span className="nal-dot" aria-hidden="true" />
              <span className="nal-label">{labelText}</span>
            </div>
            <div className="nal-status-text" aria-live="polite">{statusText}</div>
            <div className="nal-bar" aria-hidden="true" />
            <div className="nal-meta" aria-hidden="true">
              <span><b>{signalsLabel}</b> signals analyzed</span>
              <span><b>{companies.toLocaleString()}</b> roles assessed</span>
              <span><b>{patternsFound}</b> patterns</span>
            </div>
          </div>
        </div>

        {/* RIGHT — pattern feed + gauges */}
        <div className="nal-right-col" aria-hidden="true">
          <div className="nal-card nal-patterns">
            <div className="nal-rhead">
              <span>Pattern Detection</span>
              <span className="nal-live"><span className="pulse" />Scan</span>
            </div>
            {patternFeed.map((p) => (
              <div key={p.id} className={`nal-prow${p.hit ? ' hit' : ''}`}>
                <span className="pd" /><span className="pt">{p.t}</span>
              </div>
            ))}
            {patternFeed.length === 0 && <div className="nal-prow"><span className="pd" /><span className="pt">scanning…</span></div>}
          </div>
          <div className="nal-card nal-gauges">
            {[
              { id:'nalG1', off:g1off, val:`${Math.round(g1*100)}%`, label:'Index 01', name:'Displacement Confidence', sub:'Bayesian · 6-dimension model',  c1:'#6fd8ff', c2:'#7af7c0' },
              { id:'nalG2', off:g2off, val:(g2*10).toFixed(1),       label:'Index 02', name:'AI Exposure Index',       sub:'role × sector × country',       c1:'#ffb547', c2:'#ff6680' },
              { id:'nalG3', off:g3off, val:`${Math.round(g3*100)}%`, label:'Index 03', name:'Human Moat Signal',       sub:'amplification · experience',    c1:'#9b7bff', c2:'#6fd8ff' },
            ].map(g => (
              <div className="nal-gauge" key={g.id}>
                <div className="nal-ring">
                  <svg viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(111,216,255,.12)" strokeWidth="4"/>
                    <circle cx="32" cy="32" r="26" fill="none" stroke={`url(#${g.id})`} strokeWidth="4"
                      strokeLinecap="round" strokeDasharray="163.36"
                      strokeDashoffset={g.off} style={{ transition:'stroke-dashoffset .6s ease' }}/>
                    <defs>
                      <linearGradient id={g.id} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor={g.c1}/>
                        <stop offset="100%" stopColor={g.c2}/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="nal-gval">{g.val}</div>
                </div>
                <div>
                  <div className="nal-glabel">{g.label}</div>
                  <div className="nal-gname">{g.name}</div>
                  <div className="nal-gsub">{g.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RiskCalculatorNeuralLoader;
