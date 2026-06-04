// NeuralAuditLoader.tsx — v5.0 — HumanProof Predictive Intelligence Engine
//
// A complete enterprise-grade AI intelligence visualization. Every element
// communicates that a powerful prediction engine is actively processing
// millions of live signals to generate personalized layoff-risk intelligence.
//
// Architecture:
//   LAYER 0 — Environment: starfield, aurora, hex-grid, scanlines, vignette
//   LAYER 1 — Top command bar: live signal counter, phase pipeline, anomaly alert
//   LAYER 2 — Intelligence ticker: scrolling real-time signal feed (dual-row)
//   LAYER 3 — 3-column intelligence body:
//               LEFT  — Signal Ingestion Rail (8 sources) + Throughput Meter
//               CENTER — Neural Canvas (6-layer deep net, intake streams,
//                         sweep beam, activation packets, risk core) +
//                         AI Reasoning Pipeline (4-stage waterfall) +
//                         Status / Meta panel
//               RIGHT — Pattern Detection Feed + Confidence Gauges (3)
//   LAYER 4 — Corner HUDs (TL/TR/BL/BR) with live telemetry
//   LAYER 5 — Anomaly flash overlay (brief red burst on anomaly detect)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ── Props (drop-in compatible with previous version) ──────────────────────────
interface Props {
  stage: number;
  companyName?: string;
  limitedDataMode?: boolean;
  limitedDataReason?: string;
}

// ── Signal ingestion rail (left column) ──────────────────────────────────────
const SECTORS = [
  { id: '01', name: 'Financial Health',     base: 0.88, warn: false },
  { id: '02', name: 'Workforce Telemetry',  base: 0.76, warn: false },
  { id: '03', name: 'Layoff Disclosures',   base: 0.71, warn: true  },
  { id: '04', name: 'AI Adoption Rate',     base: 0.82, warn: true  },
  { id: '05', name: 'Leadership Exits',     base: 0.54, warn: false },
  { id: '06', name: 'Earnings Sentiment',   base: 0.63, warn: false },
  { id: '07', name: 'Hiring Velocity',      base: 0.49, warn: true  },
  { id: '08', name: 'Internal Mobility',    base: 0.58, warn: false },
];

// ── AI reasoning pipeline stages ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'P1', label: 'Signal Harvesting',     sub: 'SEC·WARN·LinkedIn·Glassdoor' },
  { id: 'P2', label: 'Anomaly Detection',     sub: 'z-score·IQR·isolation forest' },
  { id: 'P3', label: 'Risk Correlation',      sub: 'cross-layer·temporal·causal'  },
  { id: 'P4', label: 'Prediction Synthesis',  sub: 'Bayesian·ensemble·confidence' },
];

// ── Status messages shown in rotating sequence ────────────────────────────────
const STATUS_MESSAGES = [
  'Initialising neural prediction engine…',
  'Harvesting 4.2M live signal streams · global',
  'Ingesting SEC 8-K filings · WARN Act notices',
  'Embedding company financial-health vectors',
  'Propagating activations through 6 hidden layers',
  'Detecting hidden restructuring patterns…',
  'Correlating workforce telemetry + market signals',
  'Cross-referencing 14,237 leadership-exit events',
  'Modeling layoff probability distributions',
  'Back-propagating Bayesian confidence weights',
  'Resolving downstream exposure cascades',
  'Validating against 4,200+ historical layoff events',
  'Calibrating prediction confidence intervals…',
  'Synthesising personalised career-risk intelligence',
];

// ── Pattern detection feed (right column) ────────────────────────────────────
const PATTERN_CALLOUTS = [
  { t: 'PATTERN · hiring-freeze precursor',    sev: 'high'   },
  { t: 'PATTERN · budget-cut signature',       sev: 'high'   },
  { t: 'PATTERN · silent restructuring',       sev: 'crit'   },
  { t: 'PATTERN · exec-exit cascade',          sev: 'crit'   },
  { t: 'PATTERN · sector contagion',           sev: 'med'    },
  { t: 'PATTERN · AI displacement vector',     sev: 'high'   },
  { t: 'CLUSTER · peer-layoff correlation',    sev: 'med'    },
  { t: 'ANOMALY · headcount divergence',       sev: 'crit'   },
  { t: 'SIGNAL  · earnings-miss follow-on',    sev: 'high'   },
  { t: 'CLUSTER · hiring-velocity collapse',   sev: 'med'    },
  { t: 'ANOMALY · C-suite equity sell-down',   sev: 'crit'   },
  { t: 'PATTERN · intern-offer retraction',    sev: 'med'    },
];

// ── Dual-row live ticker ──────────────────────────────────────────────────────
const TICKER_ROW1 = [
  { name: 'MSFT · Workforce',     v: 81, tone: 'alert'   },
  { name: 'AMZN · Hiring',        v: 44, tone: 'warn'    },
  { name: 'META · Layoffs',       v: 77, tone: 'alert'   },
  { name: 'GOOG · AI Adoption',   v: 88, tone: 'alert'   },
  { name: 'AAPL · Internal Mob',  v: 62, tone: 'neutral' },
  { name: 'NVDA · Earnings',      v: 91, tone: 'alert'   },
  { name: 'IBM  · Exits',         v: 54, tone: 'warn'    },
  { name: 'ORCL · Disclosures',   v: 73, tone: 'warn'    },
  { name: 'TSLA · Reduction',     v: 85, tone: 'alert'   },
  { name: 'NFLX · Restructure',   v: 67, tone: 'warn'    },
];
const TICKER_ROW2 = [
  { name: 'Fin·Health Global',    v: 72, tone: 'warn'    },
  { name: 'AI·Displacement',      v: 86, tone: 'alert'   },
  { name: 'WARN Act · Q2',        v: 68, tone: 'warn'    },
  { name: 'Tech Sector · Risk',   v: 79, tone: 'alert'   },
  { name: 'VC Funding · Δ',       v: 41, tone: 'neutral' },
  { name: 'Job Postings · Δ',     v: 38, tone: 'neutral' },
  { name: 'Layoff Velocity',      v: 83, tone: 'alert'   },
  { name: 'Macro Sentiment',      v: 55, tone: 'warn'    },
  { name: 'Hiring Freeze Index',  v: 76, tone: 'alert'   },
  { name: 'Equity Signals',       v: 61, tone: 'neutral' },
];

const PHASES = ['Harvest', 'Embed', 'Reason', 'Converge'];

function stageToInitialPhase(s: number) { return s <= 1 ? 1 : s <= 4 ? 2 : 3; }

function buildTickerItems(src: typeof TICKER_ROW1) {
  return Array.from({ length: 24 }, (_, i) => {
    const s = src[i % src.length];
    const v = Math.max(28, Math.min(98, s.v + Math.round((Math.random() - 0.5) * 14)));
    return { name: s.name, v, tone: s.tone };
  });
}

// ── Scoped CSS ────────────────────────────────────────────────────────────────
const NEURAL_CSS = `
/* ── root shell ── */
.nal-root{position:fixed;inset:0;overflow:hidden;
  background:radial-gradient(ellipse 120% 80% at 50% 0%,#071428 0%,#040c1e 35%,#020610 70%,#010309 100%);
  font-family:"Inter",-apple-system,system-ui,sans-serif;color:#e9f3ff;letter-spacing:.01em;z-index:9999;
  height:100vh;height:100dvh;display:flex;flex-direction:column}

/* ── background layers ── */
.nal-stars{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.nal-aurora{position:absolute;inset:0;z-index:0;pointer-events:none;mix-blend-mode:screen;
  background:
    radial-gradient(62% 44% at 18% 20%,rgba(79,180,255,.18),transparent 62%),
    radial-gradient(52% 38% at 82% 80%,rgba(155,100,255,.16),transparent 58%),
    radial-gradient(44% 32% at 58% 108%,rgba(60,220,180,.12),transparent 62%),
    radial-gradient(30% 24% at 90% 12%,rgba(255,120,80,.08),transparent 52%);
  animation:nalAurora 22s ease-in-out infinite alternate}
@keyframes nalAurora{from{transform:translate3d(0,0,0) scale(1);opacity:.82}to{transform:translate3d(-2%,1.5%,0) scale(1.07);opacity:1}}
.nal-hexgrid{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.38;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='48'%3E%3Cpolygon points='28,2 54,14 54,34 28,46 2,34 2,14' fill='none' stroke='rgba(80,160,255,0.22)' stroke-width='0.6'/%3E%3C/svg%3E");
  background-size:56px 48px;
  mask-image:radial-gradient(ellipse at 50% 46%,transparent 12%,rgba(0,0,0,.55) 40%,rgba(0,0,0,.85) 64%,transparent 90%);
  -webkit-mask-image:radial-gradient(ellipse at 50% 46%,transparent 12%,rgba(0,0,0,.55) 40%,rgba(0,0,0,.85) 64%,transparent 90%);
  animation:nalGrid 11s ease-in-out infinite}
@keyframes nalGrid{0%,100%{opacity:.38;transform:scale(1)}50%{opacity:.55;transform:scale(1.012)}}
.nal-vignette{position:absolute;inset:0;z-index:6;pointer-events:none;
  background:radial-gradient(ellipse at 50% 46%,transparent 30%,rgba(2,4,12,.6) 100%)}
.nal-scanlines{position:absolute;inset:0;z-index:6;pointer-events:none;opacity:.35;mix-blend-mode:overlay;
  background-image:repeating-linear-gradient(to bottom,rgba(80,160,255,.03) 0,rgba(80,160,255,.03) 1px,transparent 1px,transparent 3px)}

/* ── top command bar ── */
.nal-topbar{
  position:relative;z-index:8;flex:0 0 auto;
  display:flex;align-items:center;gap:10px;
  padding:8px 16px;margin:10px auto 0;
  border-radius:999px;
  background:rgba(6,14,30,.72);backdrop-filter:blur(20px) saturate(160%);
  border:1px solid rgba(80,160,255,.22);box-shadow:0 6px 28px rgba(0,0,0,.5),0 0 0 1px rgba(80,160,255,.06);
  font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap;
  max-width:calc(100vw - 24px);overflow:hidden;isolation:isolate;
  animation:nalRise .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes nalRise{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.nal-crest{width:22px;height:22px;border-radius:50%;flex-shrink:0;overflow:hidden;position:relative;
  background:radial-gradient(circle at 32% 28%,#d0f0ff 0%,#5fc8ff 30%,#1760a0 68%,#051830 100%);
  box-shadow:0 0 16px rgba(95,200,255,.65),inset 0 0 7px rgba(255,255,255,.5)}
.nal-crest-sheen{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0deg,rgba(255,255,255,.5) 28deg,transparent 80deg);
  animation:nalSpin 3.5s linear infinite}
@keyframes nalSpin{to{transform:rotate(360deg)}}
.nal-engine-label{color:#e9f3ff;font-size:11px;letter-spacing:.20em;text-transform:uppercase;font-weight:700}
.nal-engine-label em{font-style:normal;color:rgba(95,200,255,.6);font-weight:400;margin-left:7px;letter-spacing:.14em}
.nal-bar-div{width:1px;height:16px;background:rgba(80,160,255,.28);flex-shrink:0}
.nal-phases{display:flex;align-items:center;gap:7px;font-size:9.5px;letter-spacing:.17em;text-transform:uppercase;color:rgba(233,243,255,.30)}
.nal-phase{display:flex;align-items:center;gap:4px;transition:color .4s ease}
.nal-phase .pd{width:5px;height:5px;border-radius:50%;background:rgba(80,160,255,.20);transition:.4s}
.nal-phase+.nal-phase::before{content:"";width:12px;height:1px;background:rgba(80,160,255,.22);margin-right:2px}
.nal-phase.active{color:#d0f0ff}.nal-phase.active .pd{background:#5fc8ff;box-shadow:0 0 10px #5fc8ff}
.nal-phase.done{color:rgba(233,243,255,.58)}.nal-phase.done .pd{background:#4fe0c0}
/* live signal counter */
.nal-sigcount{margin-left:auto;display:flex;align-items:center;gap:7px;
  font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.10em}
.nal-sigcount .sc-dot{width:6px;height:6px;border-radius:50%;background:#4fe0c0;box-shadow:0 0 9px #4fe0c0;animation:nalBlink 1.3s ease-in-out infinite}
@keyframes nalBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}
.nal-sigcount .sc-val{color:#4fe0c0;font-weight:700}
.nal-sigcount .sc-lbl{color:rgba(233,243,255,.38)}

/* ── dual ticker ── */
.nal-tickers{position:relative;z-index:7;flex:0 0 auto;
  display:flex;flex-direction:column;gap:3px;margin:6px 0 0;
  max-width:100%;overflow:hidden}
.nal-ticker-row{height:22px;overflow:hidden;
  background:rgba(6,14,30,.5);backdrop-filter:blur(10px) saturate(140%);
  border-top:1px solid rgba(80,160,255,.10);border-bottom:1px solid rgba(80,160,255,.10);
  mask-image:linear-gradient(to right,transparent,#000 6%,#000 94%,transparent);
  -webkit-mask-image:linear-gradient(to right,transparent,#000 6%,#000 94%,transparent)}
.nal-ticker-row .ttrack{display:flex;align-items:center;gap:28px;
  font-family:"JetBrains Mono",monospace;font-size:9.5px;color:rgba(233,243,255,.55);
  white-space:nowrap;padding-left:100%;animation:nalTick1 70s linear infinite}
.nal-ticker-row.r2 .ttrack{animation:nalTick2 58s linear infinite reverse}
@keyframes nalTick1{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes nalTick2{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.nal-ticker-row .tsig{display:inline-flex;align-items:center;gap:7px}
.nal-ticker-row .tsig-sig.alert{color:#ff6680;font-weight:700}
.nal-ticker-row .tsig-sig.warn{color:#ffb547;font-weight:600}
.nal-ticker-row .tsig-sig.neutral{color:#5fc8ff;font-weight:500}
.nal-ticker-row .tsep{color:rgba(80,160,255,.20);font-size:7px}

/* ── corner HUDs ── */
.nal-hud{position:absolute;z-index:8;display:flex;align-items:center;gap:6px;
  font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.15em;text-transform:uppercase;
  color:rgba(233,243,255,.45)}
.nal-hud .tick{width:12px;height:1px;background:rgba(80,160,255,.5)}
.nal-hud .v{color:#5fc8ff}.nal-hud .vr{color:#ff6680}.nal-hud .va{color:#ffb547}
.nal-hud.tl{top:50px;left:14px}.nal-hud.tr{top:50px;right:14px}
.nal-hud.bl{bottom:12px;left:14px}.nal-hud.br{bottom:12px;right:14px}

/* ── body ── */
.nal-body{
  position:relative;z-index:2;flex:1 1 0;min-height:0;
  display:flex;flex-direction:row;align-items:stretch;
  padding:4px 10px calc(6px + env(safe-area-inset-bottom,0px));gap:8px;overflow:hidden}
.nal-left-col{flex:0 0 222px;display:flex;flex-direction:column;gap:7px;min-height:0;overflow:hidden}
.nal-center-col{flex:1 1 0;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;gap:7px;overflow:hidden}
.nal-right-col{flex:0 0 204px;display:flex;flex-direction:column;gap:7px;min-height:0;overflow:hidden}

/* ── card ── */
.nal-card{
  background:rgba(6,14,30,.6);
  border:1px solid rgba(80,160,255,.15);border-radius:13px;
  backdrop-filter:blur(12px) saturate(140%);
  box-shadow:0 4px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.04)}

/* ── signal ingestion rail ── */
.nal-sector-rail{flex:1 1 auto;min-height:0;padding:9px 11px;display:flex;flex-direction:column;gap:5px;overflow:hidden}
.nal-rhead{display:flex;align-items:center;justify-content:space-between;font-size:10px;
  letter-spacing:.12em;text-transform:uppercase;color:rgba(233,243,255,.50);margin-bottom:3px}
.nal-live{display:flex;align-items:center;gap:5px;color:#4fe0c0;font-size:9px;letter-spacing:.10em}
.nal-live .pulse{width:5px;height:5px;border-radius:50%;background:#4fe0c0;box-shadow:0 0 8px #4fe0c0;animation:nalBlink 1.4s ease-in-out infinite}
.nal-srow{display:grid;grid-template-columns:20px 1fr 32px;align-items:center;gap:5px;font-size:10.5px;color:rgba(233,243,255,.72)}
.nal-srow .si{font-family:"JetBrains Mono",monospace;font-size:8.5px;color:rgba(80,160,255,.65)}
.nal-srow .sn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}
.nal-srow .sv{text-align:right;font-family:"JetBrains Mono",monospace;font-size:10px;color:#5fc8ff;font-weight:600}
.nal-srow .sbar{grid-column:1/-1;height:2.5px;border-radius:2px;background:rgba(80,160,255,.1);overflow:hidden;position:relative}
.nal-srow .sbar i{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,#5fc8ff,#4fe0c0);transition:width .5s cubic-bezier(.4,0,.2,1)}
.nal-srow.warn .sv{color:#ffb547}
.nal-srow.warn .sbar i{background:linear-gradient(90deg,#ffb547,#ff6680)}
.nal-srow.warn .si{color:rgba(255,181,71,.7)}

/* ── throughput meter ── */
.nal-throughput{padding:10px 12px;display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.nal-tp-row{display:flex;align-items:baseline;justify-content:space-between}
.nal-tp-val{font-family:"JetBrains Mono",monospace;font-size:20px;font-weight:800;color:#e9f3ff;line-height:1}
.nal-tp-unit{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(80,160,255,.6);margin-left:4px}
.nal-tp-badge{font-family:"JetBrains Mono",monospace;font-size:8px;color:#4fe0c0;padding:1px 5px;border-radius:4px;border:1px solid rgba(79,224,192,.35);background:rgba(79,224,192,.08)}
.nal-tp-spark{height:28px;display:flex;align-items:flex-end;gap:1.5px}
.nal-tp-spark i{flex:1;background:linear-gradient(180deg,#5fc8ff,rgba(95,200,255,.12));border-radius:1px;transition:height .22s ease;min-height:2px}
.nal-tp-lbl{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.11em;text-transform:uppercase;color:rgba(233,243,255,.35)}

/* ── neural canvas composition ── */
.nal-composition{flex-shrink:0;position:relative;z-index:2;
  --nal-avh:calc(100vh - 230px);--nal-avh:calc(100dvh - 230px);
  width:min(100%,calc(var(--nal-avh)*1.38),960px);
  aspect-ratio:1.38;align-self:center;display:grid;place-items:center;overflow:hidden}
.nal-halo{position:absolute;inset:2%;border-radius:24px;
  background:
    radial-gradient(ellipse at 72% 50%,rgba(255,120,80,.09) 0%,transparent 44%),
    radial-gradient(ellipse at 28% 50%,rgba(60,220,180,.09) 0%,transparent 44%),
    radial-gradient(ellipse at 50% 50%,rgba(80,160,255,.10) 0%,rgba(155,100,255,.05) 38%,transparent 62%);
  filter:blur(12px);animation:nalHalo 7s ease-in-out infinite;pointer-events:none}
@keyframes nalHalo{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
.nal-net-canvas{position:absolute;inset:0;width:100%;height:100%}

/* ── AI reasoning pipeline (below canvas) ── */
.nal-pipeline{flex-shrink:0;width:min(100%,580px);display:flex;align-items:stretch;gap:0;
  border-radius:10px;overflow:hidden;border:1px solid rgba(80,160,255,.16);
  box-shadow:0 4px 16px rgba(0,0,0,.3)}
.nal-pstage{flex:1;padding:7px 9px;background:rgba(6,14,30,.7);position:relative;overflow:hidden;
  display:flex;flex-direction:column;gap:2px;border-right:1px solid rgba(80,160,255,.12)}
.nal-pstage:last-child{border-right:none}
.nal-pstage.active{background:rgba(10,22,46,.9)}
.nal-pstage.active::before{content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(95,200,255,.06),transparent);pointer-events:none}
.nal-pstage .ps-id{font-family:"JetBrains Mono",monospace;font-size:8px;color:rgba(80,160,255,.5);letter-spacing:.16em;margin-bottom:1px}
.nal-pstage.active .ps-id{color:#5fc8ff}
.nal-pstage .ps-label{font-size:9.5px;font-weight:700;color:rgba(233,243,255,.7);line-height:1.2}
.nal-pstage.active .ps-label{color:#e9f3ff}
.nal-pstage .ps-sub{font-family:"JetBrains Mono",monospace;font-size:8px;color:rgba(233,243,255,.30);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nal-pstage.active .ps-sub{color:rgba(95,200,255,.55)}
.nal-pstage .ps-bar{height:2px;border-radius:1px;background:rgba(80,160,255,.12);margin-top:4px;overflow:hidden}
.nal-pstage.active .ps-bar::after{content:"";display:block;height:100%;width:70%;border-radius:1px;
  background:linear-gradient(90deg,transparent,#5fc8ff,#4fe0c0,transparent);
  animation:nalBar 1.4s ease-in-out infinite}
.nal-pstage.done .ps-bar::after{content:"";display:block;height:100%;width:100%;border-radius:1px;background:#4fe0c0}
@keyframes nalBar{0%{transform:translateX(-120%)}100%{transform:translateX(180%)}}

/* ── status panel ── */
.nal-panel{flex-shrink:0;width:min(100%,580px);padding:11px 16px;
  box-shadow:0 8px 32px rgba(0,0,0,.4)}
.nal-panel-row{display:flex;align-items:center;gap:9px;margin-bottom:3px}
.nal-dot{width:7px;height:7px;border-radius:50%;background:#4fe0c0;box-shadow:0 0 10px #4fe0c0;animation:nalBlink 1.3s ease-in-out infinite}
.nal-label{font-size:13px;font-weight:700;color:#e9f3ff}
.nal-status-text{font-size:10.5px;color:rgba(233,243,255,.58);font-family:"JetBrains Mono",monospace;min-height:14px;transition:opacity .3s}
.nal-meta-row{display:flex;justify-content:space-between;gap:6px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(80,160,255,.10)}
.nal-meta-item{display:flex;flex-direction:column;gap:1px;min-width:0}
.nal-meta-item .mv{font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:800;color:#5fc8ff;line-height:1}
.nal-meta-item .ml{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.10em;text-transform:uppercase;color:rgba(233,243,255,.35)}
/* accuracy / confidence badge */
.nal-conf-row{display:flex;align-items:center;gap:8px;margin-top:6px}
.nal-conf-bar{flex:1;height:4px;border-radius:2px;background:rgba(80,160,255,.12);overflow:hidden;position:relative}
.nal-conf-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:2px;transition:width .8s cubic-bezier(.4,0,.2,1)}
.nal-conf-lbl{font-family:"JetBrains Mono",monospace;font-size:9px;color:#4fe0c0;letter-spacing:.08em;white-space:nowrap}

/* ── pattern detection feed ── */
.nal-patterns{padding:9px 11px;display:flex;flex-direction:column;gap:5px;flex:0 0 auto;overflow:hidden}
.nal-prow{display:flex;align-items:center;gap:7px;
  font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.03em;
  color:rgba(233,243,255,.62);animation:nalPin .45s ease both;line-height:1.3}
@keyframes nalPin{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
.nal-prow .pd{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.nal-prow.sev-crit .pd{background:#ff6680;box-shadow:0 0 8px #ff6680}
.nal-prow.sev-high .pd{background:#ffb547;box-shadow:0 0 7px #ffb547}
.nal-prow.sev-med  .pd{background:#9b7bff;box-shadow:0 0 6px #9b7bff}
.nal-prow .pt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nal-prow.sev-crit .pt{color:rgba(255,102,128,.85)}
.nal-prow.sev-high .pt{color:rgba(255,181,71,.85)}

/* ── confidence gauges ── */
.nal-gauges{display:flex;flex-direction:column;gap:7px;padding:4px 0}
.nal-gauge{display:flex;align-items:center;gap:9px;padding:8px 11px}
.nal-ring{position:relative;width:48px;height:48px;flex-shrink:0}
.nal-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.nal-gval{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:800;color:#e9f3ff}
.nal-glabel{font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(80,160,255,.55)}
.nal-gname{font-size:10.5px;font-weight:700;color:#e9f3ff;margin-top:1px;line-height:1.2}
.nal-gsub{font-size:8.5px;color:rgba(233,243,255,.38);margin-top:1px}

/* ── anomaly flash ── */
.nal-anomaly-flash{position:absolute;inset:0;z-index:20;pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,rgba(255,50,80,.08),transparent 65%);
  border:1px solid rgba(255,50,80,.22);border-radius:0;
  opacity:0;animation:nalAnomalyFlash 1.4s ease-out both}
@keyframes nalAnomalyFlash{0%{opacity:1}100%{opacity:0}}

/* ── responsiveness ── */
@media(max-width:1080px){.nal-right-col{display:none}.nal-composition{aspect-ratio:1.24}}
@media(max-width:720px){.nal-left-col{display:none}.nal-composition{aspect-ratio:1;width:min(100%,calc(var(--nal-avh)),520px)}}
@media(max-width:480px){.nal-tickers .r2{display:none}.nal-pipeline{display:none}}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export const NeuralAuditLoader: React.FC<Props> = ({
  stage,
  companyName,
  limitedDataMode,
  limitedDataReason,
}) => {
  const netRef   = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [statusText,    setStatusText]    = useState(STATUS_MESSAGES[0]);
  const [signals,       setSignals]       = useState(0);
  const [companies,     setCompanies]     = useState(0);
  const [events,        setEvents]        = useState(0);
  const [confidence,    setConfidence]    = useState(0);
  const [patternsFound, setPatternsFound] = useState(0);
  const [throughput,    setThroughput]    = useState(0);
  const [spark,         setSpark]         = useState<number[]>(() => Array.from({ length: 26 }, () => 0.2 + Math.random() * 0.5));
  const [clock,         setClock]         = useState('00:00:00 UTC');
  const [sectorVals,    setSectorVals]    = useState(() => SECTORS.map(() => 0));
  const [patternFeed,   setPatternFeed]   = useState<{ t: string; sev: string; id: number }[]>([]);
  const [g1, setG1] = useState(0);
  const [g2, setG2] = useState(0);
  const [g3, setG3] = useState(0);
  const [activePhase,   setActivePhase]   = useState(() => stageToInitialPhase(stage));
  const [activePipeline,setActivePipeline]= useState(0);
  const [confPct,       setConfPct]       = useState(0);
  const [anomalyKey,    setAnomalyKey]    = useState(0); // increment to re-trigger flash
  const [ticker1] = useState(() => buildTickerItems(TICKER_ROW1));
  const [ticker2] = useState(() => buildTickerItems(TICKER_ROW2));

  const labelText = companyName
    ? `Analysing ${companyName} — Predictive Intelligence Active`
    : 'Layoff Audit · Neural Prediction Engine';

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
    const iv = setInterval(() => {
      mi = (mi + 1) % STATUS_MESSAGES.length;
      setStatusText(STATUS_MESSAGES[mi]);
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  // live signal counter (climbs to ~9M per "cycle" then resets)
  useEffect(() => {
    let si = 0, co = 0, ev = 0;
    const iv = setInterval(() => {
      si += Math.round(210000 + Math.random() * 280000);
      co  = Math.min(14237, co + Math.round(140 + Math.random() * 310));
      ev  = Math.min(4200,  ev + Math.round(8   + Math.random() * 22));
      if (si > 9_800_000) { si = 1_100_000 + Math.round(Math.random() * 500000); }
      setSignals(si); setCompanies(co); setEvents(ev);
    }, 85);
    return () => clearInterval(iv);
  }, []);

  // confidence ramp (0 → 94% over ~12s)
  useEffect(() => {
    let c = 0;
    const iv = setInterval(() => {
      c = Math.min(94, c + 0.9 + Math.random() * 0.8);
      setConfidence(Math.round(c));
      setConfPct(c / 94);
    }, 120);
    return () => clearInterval(iv);
  }, []);

  // throughput sparkline
  useEffect(() => {
    const iv = setInterval(() => {
      const base = 1.8 + Math.sin(Date.now() / 1300) * 0.6 + Math.random() * 0.45;
      setThroughput(base);
      setSpark(prev => {
        const next = prev.slice(1);
        next.push(Math.max(0.06, Math.min(1, (base - 0.9) / 1.8 + (Math.random() - 0.5) * 0.15)));
        return next;
      });
    }, 260);
    return () => clearInterval(iv);
  }, []);

  // UTC clock
  useEffect(() => {
    const tick = () => {
      const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // sector bars (live jitter toward base)
  useEffect(() => {
    const iv = setInterval(() => {
      setSectorVals(prev => prev.map((v, i) => {
        const s = SECTORS[i];
        const target = Math.min(0.99, Math.max(0.05,
          s.base + Math.sin(Date.now() / (3000 + s.base * 900)) * 0.07 + (Math.random() - 0.5) * 0.022));
        return v + (target - v) * 0.09;
      }));
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // pattern detection feed + anomaly flashes
  useEffect(() => {
    let pid = 0;
    const iv = setInterval(() => {
      const src = PATTERN_CALLOUTS[Math.floor(Math.random() * PATTERN_CALLOUTS.length)];
      if (src.sev === 'crit') {
        setPatternsFound(n => n + 1);
        setAnomalyKey(k => k + 1);
      } else if (src.sev === 'high') {
        setPatternsFound(n => n + 1);
      }
      setPatternFeed(prev => [{ t: src.t, sev: src.sev, id: pid++ }, ...prev].slice(0, 6));
    }, 1600);
    return () => clearInterval(iv);
  }, []);

  // gauges
  useEffect(() => {
    let _g1 = 0, _g2 = 0, _g3 = 0;
    const iv = setInterval(() => {
      const t = Date.now() / 1000;
      _g1 += (0.92 + Math.sin(t * 0.55) * 0.025      - _g1) * 0.05;
      _g2 += (0.64 + Math.sin(t * 0.38 + 1.1) * 0.09 - _g2) * 0.05;
      _g3 += (0.88 + Math.sin(t * 0.72 + 2.3) * 0.04 - _g3) * 0.05;
      setG1(_g1); setG2(_g2); setG3(_g3);
    }, 55);
    return () => clearInterval(iv);
  }, []);

  // phase + pipeline rotation
  useEffect(() => {
    const iv1 = setInterval(() => setActivePhase(p => p + 1 >= PHASES.length ? 1 : p + 1), 5800);
    const iv2 = setInterval(() => setActivePipeline(p => (p + 1) % PIPELINE_STAGES.length), 2400);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, []);

  // ── Canvas: deep neural network engine ────────────────────────────────────

  useEffect(() => {
    let raf = 0, destroyed = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const hexA = (hex: string, a: number) => {
      const h = hex.replace('#', '');
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a.toFixed(3)})`;
    };

    // ── Starfield ────────────────────────────────────────────────────────────
    const sCvs = starsRef.current;
    const sCtx = sCvs?.getContext('2d');
    let sW = 0, sH = 0;
    type Star = { x: number; y: number; r: number; a: number; tw: number; sp: number; c: string };
    let stars: Star[] = [];
    const STAR_COLORS = ['#b0d8ff', '#d0f0ff', '#fff8e0', '#ffd0d8', '#d0ffe8'];
    function sizeStars() {
      if (!sCvs || !sCtx) return;
      sW = window.innerWidth; sH = window.innerHeight;
      sCvs.width = sW * dpr; sCvs.height = sH * dpr;
      sCvs.style.width = sW + 'px'; sCvs.style.height = sH + 'px';
      sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(300, Math.round((sW * sH) / 8500));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * sW, y: Math.random() * sH,
        r: Math.random() * 1.15 + 0.18,
        a: Math.random() * 0.55 + 0.12,
        tw: Math.random() * Math.PI * 2,
        sp: 0.35 + Math.random() * 1.1,
        c: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      }));
    }
    function drawStars(t: number) {
      if (!sCtx) return;
      sCtx.clearRect(0, 0, sW, sH);
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.0011 * s.sp + s.tw);
        sCtx.beginPath();
        sCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        sCtx.fillStyle = `rgba(${s.c === '#b0d8ff' ? '176,216,255' : s.c === '#d0f0ff' ? '208,240,255' : s.c === '#fff8e0' ? '255,248,224' : s.c === '#ffd0d8' ? '255,208,216' : '208,255,232'},${(s.a * tw).toFixed(3)})`;
        sCtx.fill();
      }
    }

    // ── Neural network engine ─────────────────────────────────────────────────
    const nCvs = netRef.current;
    const nCtx = nCvs?.getContext('2d');
    if (!nCvs || !nCtx) return;

    // 7-layer architecture: signals → embed → reason × 3 → predict → risk core
    const LAYERS: { count: number; label: string; tone: 'in' | 'hidden' | 'reason' | 'out' }[] = [
      { count: 8,  label: 'SIGNALS',  tone: 'in'     },
      { count: 11, label: 'EMBED',    tone: 'hidden'  },
      { count: 14, label: 'REASON-1', tone: 'reason'  },
      { count: 10, label: 'REASON-2', tone: 'reason'  },
      { count: 12, label: 'REASON-3', tone: 'reason'  },
      { count: 5,  label: 'PREDICT',  tone: 'hidden'  },
      { count: 1,  label: 'RISK',     tone: 'out'     },
    ];

    const TONE: Record<string, string> = {
      in:     '#4fe0c0',
      hidden: '#5fc8ff',
      reason: '#9b7bff',
      out:    '#ff6680',
    };

    type Node  = { x: number; y: number; r: number; tone: string; pulse: number; base: number; li: number };
    type Edge  = { a: Node; b: Node; w: number; cx: number; cy: number };
    type Pulse = { edge: Edge; t: number; sp: number; col: string; size: number };
    type Intake = { x: number; y: number; tx: number; ty: number; t: number; sp: number; col: string };
    // Intelligence stream: a labelled data packet crossing the whole width
    type Stream = { y: number; t: number; sp: number; label: string; col: string };

    let W = 0, H = 0, cx = 0, cy = 0;
    let nodes: Node[][] = [];
    let edges: Edge[] = [];
    let pulses: Pulse[] = [];
    let intake: Intake[] = [];
    let streams: Stream[] = [];
    let nextPulse = 0, nextIntake = 0, nextStream = 0;
    let coreBurst = 0;

    const STREAM_LABELS = [
      'SEC·8K·FILING', 'WARN·ACT·NOTICE', 'LINKEDIN·SIGNAL',
      'GLASSDOOR·FEED', 'LAYOFF.FYI·EVENT', 'EARNINGS·CALL',
      'JOB·POSTING·Δ', 'HEADCOUNT·VECTOR', 'EQUITY·SIGNAL',
    ];

    function size() {
      const rect = nCvs!.getBoundingClientRect();
      W = Math.max(rect.width, 60); H = Math.max(rect.height, 60);
      cx = W / 2; cy = H / 2;
      nCvs!.width = W * dpr; nCvs!.height = H * dpr;
      nCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      nodes = []; edges = []; pulses = []; intake = []; streams = [];
      const padX = W * 0.10, usableW = W - padX * 2;
      const gapX = usableW / (LAYERS.length - 1);
      LAYERS.forEach((layer, li) => {
        const lx = padX + gapX * li;
        const col: Node[] = [];
        const cnt = layer.count;
        const spanH = H * (cnt > 10 ? 0.84 : 0.70);
        const startY = (H - spanH) / 2;
        const gapY = cnt > 1 ? spanH / (cnt - 1) : 0;
        for (let i = 0; i < cnt; i++) {
          const y = cnt > 1 ? startY + gapY * i : H / 2;
          col.push({
            x: lx, y, li,
            r: layer.tone === 'out' ? 13 : layer.tone === 'in' ? 5.5 : 4,
            tone: layer.tone, pulse: 0, base: 0.28 + Math.random() * 0.32,
          });
        }
        nodes.push(col);
      });
      // Sparse curved synapses — each node connects to 2–4 next-layer nodes
      for (let li = 0; li < nodes.length - 1; li++) {
        for (const a of nodes[li]) {
          const targets = [...nodes[li + 1]].sort(() => Math.random() - 0.5)
            .slice(0, 2 + Math.floor(Math.random() * 3));
          for (const b of targets) {
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const bow = (Math.random() - 0.5) * Math.min(64, Math.abs(b.y - a.y) * 0.5 + 16);
            edges.push({ a, b, w: 0.12 + Math.random() * 0.88, cx: mx, cy: my + bow });
          }
        }
      }
    }

    function spawnPulse() {
      const e = edges[Math.floor(Math.random() * edges.length)];
      if (!e) return;
      const col = TONE[e.b.tone] ?? TONE.hidden;
      pulses.push({ edge: e, t: 0, sp: 0.014 + Math.random() * 0.022, col, size: 1.4 + Math.random() * 1.2 });
    }

    function spawnIntake() {
      const inputs = nodes[0];
      if (!inputs?.length) return;
      const target = inputs[Math.floor(Math.random() * inputs.length)];
      const side = Math.random();
      let x = 0, y = 0;
      if      (side < 0.5)  { x = -12; y = Math.random() * H; }
      else if (side < 0.75) { x = Math.random() * W * 0.35; y = -12; }
      else                  { x = Math.random() * W * 0.35; y = H + 12; }
      intake.push({ x, y, tx: target.x, ty: target.y, t: 0, sp: 0.018 + Math.random() * 0.026, col: TONE.in });
    }

    function spawnStream() {
      const y = H * 0.12 + Math.random() * H * 0.76;
      const label = STREAM_LABELS[Math.floor(Math.random() * STREAM_LABELS.length)];
      const col = [TONE.in, TONE.hidden, TONE.reason][Math.floor(Math.random() * 3)];
      streams.push({ y, t: 0, sp: 0.004 + Math.random() * 0.004, label, col });
    }

    function qpt(e: Edge, t: number) {
      const mt = 1 - t;
      return {
        x: mt * mt * e.a.x + 2 * mt * t * e.cx + t * t * e.b.x,
        y: mt * mt * e.a.y + 2 * mt * t * e.cy + t * t * e.b.y,
      };
    }

    function draw(now: number) {
      nCtx!.clearRect(0, 0, W, H);

      // ── Data streams (horizontal intelligence flows behind the net) ─────────
      if (!reduceMotion && now >= nextStream) {
        if (streams.length < 5) spawnStream();
        nextStream = now + 800 + Math.random() * 1200;
      }
      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i];
        s.t += s.sp;
        if (s.t >= 1) { streams.splice(i, 1); continue; }
        const x = -120 + s.t * (W + 240);
        const a = Math.min(1, Math.min(s.t * 5, (1 - s.t) * 5)) * 0.35;
        // line
        nCtx!.beginPath();
        nCtx!.moveTo(x - 60, s.y); nCtx!.lineTo(x, s.y);
        const lg = nCtx!.createLinearGradient(x - 60, 0, x, 0);
        lg.addColorStop(0, hexA(s.col, 0));
        lg.addColorStop(1, hexA(s.col, a));
        nCtx!.strokeStyle = lg; nCtx!.lineWidth = 1; nCtx!.stroke();
        // label tag
        nCtx!.font = `500 7.5px "JetBrains Mono",monospace`;
        nCtx!.fillStyle = hexA(s.col, a * 1.8);
        nCtx!.textAlign = 'left';
        nCtx!.fillText(s.label, x + 4, s.y + 3);
        // head dot
        nCtx!.beginPath(); nCtx!.arc(x, s.y, 2, 0, Math.PI * 2);
        nCtx!.fillStyle = hexA(s.col, Math.min(1, a * 3));
        nCtx!.shadowColor = s.col; nCtx!.shadowBlur = 6; nCtx!.fill(); nCtx!.shadowBlur = 0;
      }

      // ── Pattern-detection sweep beam ──────────────────────────────────────
      const beamAng = (now * 0.00038) % (Math.PI * 2);
      const sweepR = Math.max(W, H) * 0.68;
      {
        const grad = nCtx!.createConicGradient ? nCtx!.createConicGradient(beamAng, cx, cy) : null;
        if (grad) {
          grad.addColorStop(0, 'rgba(155,123,255,0.12)');
          grad.addColorStop(0.045, 'rgba(155,123,255,0.018)');
          grad.addColorStop(1, 'rgba(155,123,255,0)');
          nCtx!.fillStyle = grad;
          nCtx!.beginPath(); nCtx!.moveTo(cx, cy);
          nCtx!.arc(cx, cy, sweepR, beamAng, beamAng + 0.55);
          nCtx!.closePath(); nCtx!.fill();
        }
      }

      // ── Curved synapses ────────────────────────────────────────────────────
      for (const e of edges) {
        nCtx!.beginPath();
        nCtx!.moveTo(e.a.x, e.a.y);
        nCtx!.quadraticCurveTo(e.cx, e.cy, e.b.x, e.b.y);
        nCtx!.strokeStyle = `rgba(80,160,255,${(0.018 + e.w * 0.04).toFixed(3)})`;
        nCtx!.lineWidth = 0.5;
        nCtx!.stroke();
      }

      // ── Raw signal intake streams (edge → input layer) ─────────────────────
      if (!reduceMotion && now >= nextIntake) {
        const burst = 4 + Math.floor(Math.random() * 5);
        for (let i = 0; i < burst; i++) spawnIntake();
        nextIntake = now + 55 + Math.random() * 80;
      }
      for (let i = intake.length - 1; i >= 0; i--) {
        const p = intake[i];
        p.t += p.sp;
        if (p.t >= 1) {
          const inputs = nodes[0];
          let best = inputs[0], bd = Infinity;
          for (const n of inputs) { const d = Math.hypot(n.x - p.tx, n.y - p.ty); if (d < bd) { bd = d; best = n; } }
          best.pulse = Math.min(1, best.pulse + 0.55);
          intake.splice(i, 1); continue;
        }
        const ease = p.t * p.t;
        const x = p.x + (p.tx - p.x) * ease;
        const y = p.y + (p.ty - p.y) * ease;
        const px = p.x + (p.tx - p.x) * Math.max(0, ease - 0.07);
        const py = p.y + (p.ty - p.y) * Math.max(0, ease - 0.07);
        nCtx!.beginPath(); nCtx!.moveTo(px, py); nCtx!.lineTo(x, y);
        nCtx!.strokeStyle = hexA(p.col, 0.45); nCtx!.lineWidth = 1; nCtx!.lineCap = 'round'; nCtx!.stroke();
        nCtx!.beginPath(); nCtx!.arc(x, y, 1.4, 0, Math.PI * 2);
        nCtx!.fillStyle = hexA(p.col, 0.88); nCtx!.shadowColor = p.col; nCtx!.shadowBlur = 7; nCtx!.fill(); nCtx!.shadowBlur = 0;
      }

      // ── Activation packets (synapse travellers) ────────────────────────────
      if (now >= nextPulse) {
        const burst = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < burst; i++) spawnPulse();
        nextPulse = now + 60 + Math.random() * 95;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.sp;
        if (p.t >= 1) {
          p.edge.b.pulse = Math.min(1.5, p.edge.b.pulse + 0.6);
          if (p.edge.b.tone === 'out') coreBurst = 1;
          pulses.splice(i, 1); continue;
        }
        const cur  = qpt(p.edge, p.t);
        const prev = qpt(p.edge, Math.max(0, p.t - 0.10));
        nCtx!.beginPath(); nCtx!.moveTo(prev.x, prev.y); nCtx!.lineTo(cur.x, cur.y);
        nCtx!.strokeStyle = hexA(p.col, 0.65); nCtx!.lineWidth = 1.6; nCtx!.lineCap = 'round'; nCtx!.stroke();
        nCtx!.beginPath(); nCtx!.arc(cur.x, cur.y, p.size, 0, Math.PI * 2);
        nCtx!.fillStyle = p.col; nCtx!.shadowColor = p.col; nCtx!.shadowBlur = 10; nCtx!.fill(); nCtx!.shadowBlur = 0;
      }

      // ── Neuron glows ──────────────────────────────────────────────────────
      for (let li = 0; li < nodes.length; li++) {
        for (const nd of nodes[li]) {
          nd.pulse *= 0.92;
          const breathe = 0.5 + 0.5 * Math.sin(now * 0.0018 + nd.y * 0.04 + nd.li * 0.8);
          const a = Math.min(1, nd.base * (0.52 + breathe * 0.42) + nd.pulse * 0.65);
          const col = TONE[nd.tone] ?? TONE.hidden;
          const rr = nd.r * (1 + nd.pulse * 0.45);
          // outer glow
          const g = nCtx!.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, rr * 4);
          g.addColorStop(0, hexA(col, a * 0.45)); g.addColorStop(1, hexA(col, 0));
          nCtx!.fillStyle = g;
          nCtx!.beginPath(); nCtx!.arc(nd.x, nd.y, rr * 4, 0, Math.PI * 2); nCtx!.fill();
          // core dot
          nCtx!.beginPath(); nCtx!.arc(nd.x, nd.y, rr, 0, Math.PI * 2);
          nCtx!.fillStyle = hexA(col, Math.min(1, a + 0.28));
          nCtx!.shadowColor = col; nCtx!.shadowBlur = 5 + nd.pulse * 14; nCtx!.fill(); nCtx!.shadowBlur = 0;
        }
      }

      // ── Risk convergence core ──────────────────────────────────────────────
      const core = nodes[nodes.length - 1]?.[0];
      if (core) {
        coreBurst *= 0.94;
        const col = TONE.out;
        // burst ring on prediction resolve
        if (coreBurst > 0.02) {
          const br = core.r + 6 + (1 - coreBurst) * 30;
          nCtx!.beginPath(); nCtx!.arc(core.x, core.y, br, 0, Math.PI * 2);
          nCtx!.strokeStyle = hexA(col, coreBurst * 0.55); nCtx!.lineWidth = 1.5 + coreBurst * 2; nCtx!.stroke();
        }
        // slow concentric rings (3)
        for (let k = 0; k < 3; k++) {
          const rr = core.r + 10 + k * 11 + Math.sin(now * 0.0022 + k) * 3.5;
          nCtx!.beginPath(); nCtx!.arc(core.x, core.y, rr, 0, Math.PI * 2);
          nCtx!.strokeStyle = hexA(col, 0.22 - k * 0.055); nCtx!.lineWidth = 1; nCtx!.stroke();
        }
        // rotating tick ring
        const tickN = 40;
        for (let k = 0; k < tickN; k++) {
          const ang = (k / tickN) * Math.PI * 2 + now * 0.00055;
          const r0 = core.r + 24, r1 = r0 + (k % 4 === 0 ? 6 : k % 2 === 0 ? 3.5 : 2);
          nCtx!.beginPath();
          nCtx!.moveTo(core.x + Math.cos(ang) * r0, core.y + Math.sin(ang) * r0);
          nCtx!.lineTo(core.x + Math.cos(ang) * r1, core.y + Math.sin(ang) * r1);
          nCtx!.strokeStyle = hexA(col, 0.30); nCtx!.lineWidth = 1; nCtx!.stroke();
        }
        // bright core fill
        const cg = nCtx!.createRadialGradient(core.x, core.y, 0, core.x, core.y, core.r * 2.6);
        cg.addColorStop(0, hexA(col, 0.92)); cg.addColorStop(0.5, hexA(col, 0.38)); cg.addColorStop(1, hexA(col, 0));
        nCtx!.fillStyle = cg; nCtx!.beginPath(); nCtx!.arc(core.x, core.y, core.r * 2.6, 0, Math.PI * 2); nCtx!.fill();
        nCtx!.beginPath(); nCtx!.arc(core.x, core.y, core.r, 0, Math.PI * 2);
        nCtx!.fillStyle = '#fff'; nCtx!.shadowColor = col; nCtx!.shadowBlur = 22; nCtx!.fill(); nCtx!.shadowBlur = 0;
      }

      // ── Layer labels ──────────────────────────────────────────────────────
      nCtx!.font = '600 8.5px "JetBrains Mono",monospace';
      nCtx!.textAlign = 'center';
      LAYERS.forEach((layer, li) => {
        const x = nodes[li]?.[0]?.x ?? 0;
        nCtx!.fillStyle = 'rgba(233,243,255,0.32)';
        nCtx!.fillText(layer.label, x, H - 4);
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
    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const signalDisplay = signals >= 1e6 ? `${(signals / 1e6).toFixed(2)}M` : signals >= 1e3 ? `${(signals / 1e3).toFixed(0)}K` : String(signals);
  const C = 163.36;
  const g1off = C * (1 - g1), g2off = C * (1 - g2), g3off = C * (1 - g3);

  return createPortal(
    <div className="nal-root" role="status" aria-label="Analysing workforce intelligence with neural prediction engine">
      <canvas className="nal-stars" ref={starsRef} aria-hidden="true" />
      <div className="nal-aurora"    aria-hidden="true" />
      <div className="nal-hexgrid"   aria-hidden="true" />
      <div className="nal-scanlines" aria-hidden="true" />
      <div className="nal-vignette"  aria-hidden="true" />

      {/* Anomaly flash overlay — re-keyed to re-trigger animation */}
      {anomalyKey > 0 && (
        <div key={anomalyKey} className="nal-anomaly-flash" aria-hidden="true" />
      )}

      {/* ── Top command bar ── */}
      <div className="nal-topbar" aria-hidden="true">
        <span className="nal-crest"><span className="nal-crest-sheen" /></span>
        <span className="nal-engine-label">
          Layoff Audit
          <em>Predictive Intelligence Engine · v5.0</em>
        </span>
        <span className="nal-bar-div" />
        <div className="nal-phases">
          {PHASES.map((ph, i) => (
            <div key={ph} className={`nal-phase${i < activePhase ? ' done' : i === activePhase ? ' active' : ''}`}>
              <span className="pd" />{ph}
            </div>
          ))}
        </div>
        <div className="nal-sigcount">
          <span className="sc-dot" />
          <span className="sc-val">{signalDisplay}</span>
          <span className="sc-lbl">signals/live</span>
        </div>
      </div>

      {/* ── Dual intelligence ticker ── */}
      <div className="nal-tickers" aria-hidden="true">
        <div className="nal-ticker-row r1">
          <div className="ttrack">
            {[...ticker1, ...ticker1].map((s, i) => (
              <React.Fragment key={i}>
                <span className="tsig">
                  <span className={`tsig-sig ${s.tone}`}>{s.name}</span>
                  <span style={{ color: '#e9f3ff' }}>{s.v}%</span>
                </span>
                {i < ticker1.length * 2 - 1 && <span className="tsep">▸</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="nal-ticker-row r2">
          <div className="ttrack">
            {[...ticker2, ...ticker2].map((s, i) => (
              <React.Fragment key={i}>
                <span className="tsig">
                  <span className={`tsig-sig ${s.tone}`}>{s.name}</span>
                  <span style={{ color: '#e9f3ff' }}>{s.v}%</span>
                </span>
                {i < ticker2.length * 2 - 1 && <span className="tsep">▸</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── Corner HUDs ── */}
      <div className="nal-hud tl" aria-hidden="true"><span className="tick" /><span>LAYOFF AUDIT · NEURAL NET</span></div>
      <div className="nal-hud tr" aria-hidden="true"><span>INFERENCE · TIER-4 · 7-LAYER</span><span className="tick" /></div>
      <div className="nal-hud bl" aria-hidden="true">
        <span className="tick" />
        <span className="vr">{patternsFound}</span>
        <span>ANOMALIES DETECTED</span>
      </div>
      <div className="nal-hud br" aria-hidden="true">
        <span className="va">{confidence}%</span>
        <span>CONF</span>
        <span className="tick" />
        <span className="v">{clock}</span>
      </div>

      {/* ── 3-column intelligence body ── */}
      <div className="nal-body">

        {/* LEFT — Signal Ingestion Rail */}
        <div className="nal-left-col" aria-hidden="true">
          <div className="nal-card nal-sector-rail">
            <div className="nal-rhead">
              <span>Signal Ingestion</span>
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

          {/* Throughput meter */}
          <div className="nal-card nal-throughput">
            <div className="nal-tp-row">
              <span>
                <span className="nal-tp-val">{throughput.toFixed(2)}</span>
                <span className="nal-tp-unit">M/s</span>
              </span>
              <span className="nal-tp-badge">LIVE</span>
            </div>
            <div className="nal-tp-spark">
              {spark.map((v, i) => <i key={i} style={{ height: `${Math.round(v * 100)}%` }} />)}
            </div>
            <div className="nal-tp-lbl">Signals processed / second</div>
          </div>
        </div>

        {/* CENTER — Neural canvas + pipeline + status */}
        <div className="nal-center-col">
          <div className="nal-composition">
            <div className="nal-halo" aria-hidden="true" />
            <canvas className="nal-net-canvas" ref={netRef} aria-hidden="true" />
          </div>

          {/* AI Reasoning Pipeline */}
          <div className="nal-pipeline" aria-hidden="true">
            {PIPELINE_STAGES.map((ps, i) => (
              <div
                key={ps.id}
                className={`nal-pstage${i === activePipeline ? ' active' : i < activePipeline ? ' done' : ''}`}
              >
                <div className="ps-id">{ps.id}</div>
                <div className="ps-label">{ps.label}</div>
                <div className="ps-sub">{ps.sub}</div>
                <div className="ps-bar" />
              </div>
            ))}
          </div>

          {/* Status panel */}
          <div className="nal-card nal-panel">
            <div className="nal-panel-row">
              <span className="nal-dot" aria-hidden="true" />
              <span className="nal-label">{labelText}</span>
            </div>
            <div className="nal-status-text" aria-live="polite">
              {limitedDataMode ? (limitedDataReason ?? 'Running with limited data…') : statusText}
            </div>
            {/* Confidence bar */}
            <div className="nal-conf-row" aria-hidden="true">
              <div className="nal-conf-bar">
                <i style={{ width: `${confPct * 100}%`, background: `linear-gradient(90deg,#5fc8ff,#4fe0c0)` }} />
              </div>
              <span className="nal-conf-lbl">{confidence}% confidence</span>
            </div>
            {/* Meta counters */}
            <div className="nal-meta-row" aria-hidden="true">
              <div className="nal-meta-item">
                <span className="mv">{signalDisplay}</span>
                <span className="ml">Signals</span>
              </div>
              <div className="nal-meta-item">
                <span className="mv">{companies.toLocaleString()}</span>
                <span className="ml">Companies</span>
              </div>
              <div className="nal-meta-item">
                <span className="mv">{events.toLocaleString()}</span>
                <span className="ml">Events</span>
              </div>
              <div className="nal-meta-item">
                <span className="mv" style={{ color: patternsFound > 2 ? '#ff6680' : '#5fc8ff' }}>{patternsFound}</span>
                <span className="ml">Anomalies</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Pattern feed + Confidence gauges */}
        <div className="nal-right-col" aria-hidden="true">
          <div className="nal-card nal-patterns">
            <div className="nal-rhead">
              <span>Pattern Detection</span>
              <span className="nal-live"><span className="pulse" />Scan</span>
            </div>
            {patternFeed.length === 0 && (
              <div className="nal-prow sev-med"><span className="pd" /><span className="pt">scanning…</span></div>
            )}
            {patternFeed.map((p) => (
              <div key={p.id} className={`nal-prow sev-${p.sev}`}>
                <span className="pd" />
                <span className="pt">{p.t}</span>
              </div>
            ))}
          </div>

          <div className="nal-card nal-gauges">
            {[
              { id: 'nalG1', off: g1off, val: `${Math.round(g1 * 100)}%`, label: 'INDEX 01', name: 'Prediction Confidence', sub: 'Bayesian · ensemble',     c1: '#5fc8ff', c2: '#4fe0c0' },
              { id: 'nalG2', off: g2off, val: (g2 * 10).toFixed(1),       label: 'INDEX 02', name: 'Layoff Risk Index',      sub: '7-day rolling avg',       c1: '#ffb547', c2: '#ff6680' },
              { id: 'nalG3', off: g3off, val: `${Math.round(g3 * 100)}%`, label: 'INDEX 03', name: 'Signal Clarity',         sub: 'SNR · multi-source',      c1: '#9b7bff', c2: '#5fc8ff' },
            ].map(g => (
              <div className="nal-gauge" key={g.id}>
                <div className="nal-ring">
                  <svg viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(80,160,255,.12)" strokeWidth="4.5" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={`url(#${g.id})`} strokeWidth="4.5"
                      strokeLinecap="round" strokeDasharray="163.36"
                      strokeDashoffset={g.off} style={{ transition: 'stroke-dashoffset .7s ease' }} />
                    <defs>
                      <linearGradient id={g.id} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor={g.c1} />
                        <stop offset="100%" stopColor={g.c2} />
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

export default NeuralAuditLoader;
