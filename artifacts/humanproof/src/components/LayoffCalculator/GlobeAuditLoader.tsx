// GlobeAuditLoader.tsx — Full-screen cinematic globe intelligence-scan loader
// Uses d3-geo (npm) for real country borders + full HUD overlay design.

import React, { useEffect, useRef, useState } from 'react';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stage: number;
  companyName?: string;
  limitedDataMode?: boolean;
  limitedDataReason?: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const HUBS: { n: string; ll: [number, number] }[] = [
  { n: 'New York',      ll: [-74.0,  40.7] },
  { n: 'San Francisco', ll: [-122.4, 37.7] },
  { n: 'Sao Paulo',     ll: [-46.6, -23.5] },
  { n: 'London',        ll: [  -0.1, 51.5] },
  { n: 'Berlin',        ll: [  13.4, 52.5] },
  { n: 'Lagos',         ll: [   3.4,  6.5] },
  { n: 'Cairo',         ll: [  31.2, 30.0] },
  { n: 'Dubai',         ll: [  55.3, 25.3] },
  { n: 'Mumbai',        ll: [  72.9, 19.1] },
  { n: 'Singapore',     ll: [ 103.8,  1.3] },
  { n: 'Tokyo',         ll: [ 139.7, 35.7] },
  { n: 'Sydney',        ll: [ 151.2,-33.9] },
  { n: 'Moscow',        ll: [  37.6, 55.8] },
  { n: 'Seoul',         ll: [ 127.0, 37.6] },
];

const SECTORS = [
  { id: '01', name: 'Financial Data',     base: 0.88, warn: false },
  { id: '02', name: 'Workforce Data',     base: 0.76, warn: false },
  { id: '03', name: 'Layoff Disclosures', base: 0.71, warn: true  },
  { id: '04', name: 'AI Exposure',        base: 0.82, warn: true  },
  { id: '05', name: 'Leadership Exits',   base: 0.54, warn: false },
  { id: '06', name: 'Earnings Sentiment', base: 0.63, warn: false },
  { id: '07', name: 'Hiring Velocity',    base: 0.49, warn: false },
];

const STATUS_MESSAGES = [
  'Initializing prediction engine…',
  'Ingesting SEC 8-K · WARN filings',
  'Streaming workforce telemetry · global',
  'Indexing public company headcount',
  'Detecting layoff signal precursors',
  'Cross-referencing leadership exits',
  'Forecasting sector volatility · live',
  'Resolving downstream exposure clusters',
  'Modeling layoff probability vectors',
  'Validating against historical patterns',
  'Calibrating prediction confidence intervals',
  'Synthesizing layoff audit forecast',
];

const TICKER_SIGNALS = [
  { name: 'Financial Data',     base: 85, tone: 'alert'   },
  { name: 'Workforce Data',     base: 81, tone: 'alert'   },
  { name: 'Layoff Disclosures', base: 74, tone: 'warn'    },
  { name: 'AI Exposure',        base: 86, tone: 'alert'   },
  { name: 'Leadership Exits',   base: 52, tone: 'neutral' },
  { name: 'Earnings Sentiment', base: 58, tone: 'neutral' },
  { name: 'Hiring Velocity',    base: 67, tone: 'warn'    },
];

const TICKER_REGIONS = [
  'NEW YORK', 'SAN FRANCISCO', 'LONDON', 'BERLIN', 'TOKYO', 'SINGAPORE',
  'MUMBAI', 'DUBAI', 'SYDNEY', 'SEOUL', 'SAO PAULO', 'MOSCOW', 'CAIRO', 'LAGOS',
];

const SIGNAL_TYPES = [
  { code: '01', name: 'Financial Data',     base: 85 },
  { code: '02', name: 'Workforce Data',     base: 81 },
  { code: '03', name: 'Layoff Disclosures', base: 74 },
  { code: '04', name: 'AI Exposure',        base: 86 },
  { code: '05', name: 'Leadership Exits',   base: 52 },
  { code: '06', name: 'Earnings Sentiment', base: 58 },
  { code: '07', name: 'Hiring Velocity',    base: 67 },
];

const PHASES = ['Ingest', 'Detect', 'Model', 'Forecast'];

function stageToInitialPhase(s: number) { return s <= 1 ? 1 : s <= 4 ? 2 : 3; }

function buildTickerItems() {
  return Array.from({ length: 24 }, (_, i) => {
    const region = TICKER_REGIONS[Math.floor(Math.random() * TICKER_REGIONS.length)];
    const s = TICKER_SIGNALS[i % TICKER_SIGNALS.length];
    const value = Math.max(34, Math.min(97, s.base + Math.round((Math.random() - 0.5) * 18)));
    return { region, name: s.name, value, tone: s.tone };
  });
}

// ── CSS (scoped to .gal-root) ─────────────────────────────────────────────────

const GLOBE_CSS = `
/* ── root: full-screen fixed container ──────────────────── */
.gal-root{position:fixed;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 35%,#0a1b34 0%,#061224 40%,#03060d 100%);font-family:"Inter",-apple-system,system-ui,sans-serif;color:#e9f3ff;letter-spacing:.01em;z-index:9999}

/* ── background layers ──────────────────────────────────── */
.gal-stars{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.gal-aurora{position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(60% 40% at 22% 25%,rgba(111,216,255,.16),transparent 60%),radial-gradient(50% 35% at 78% 78%,rgba(155,123,255,.14),transparent 60%),radial-gradient(40% 30% at 50% 110%,rgba(79,224,192,.10),transparent 60%);animation:galAurora 18s ease-in-out infinite alternate;mix-blend-mode:screen}
@keyframes galAurora{from{transform:translate3d(0,0,0) scale(1);opacity:.85}to{transform:translate3d(-2%,1%,0) scale(1.05);opacity:1}}
.gal-nebula{position:absolute;inset:-10%;z-index:0;pointer-events:none;background:radial-gradient(35% 22% at 18% 62%,rgba(111,216,255,.22),transparent 70%),radial-gradient(30% 18% at 82% 22%,rgba(155,123,255,.20),transparent 70%),radial-gradient(28% 20% at 60% 88%,rgba(79,224,192,.14),transparent 70%);filter:blur(36px) saturate(125%);opacity:.85;animation:galNebula 38s ease-in-out infinite alternate;mix-blend-mode:screen}
@keyframes galNebula{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-3%,2%,0) scale(1.06)}100%{transform:translate3d(2%,-2%,0) scale(1.02)}}
.gal-gridmesh{position:absolute;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(to right,rgba(111,216,255,.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(111,216,255,.05) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse at 50% 50%,transparent 18%,rgba(0,0,0,.7) 45%,rgba(0,0,0,.9) 65%,transparent 92%);-webkit-mask-image:radial-gradient(ellipse at 50% 50%,transparent 18%,rgba(0,0,0,.7) 45%,rgba(0,0,0,.9) 65%,transparent 92%);animation:galGrid 9s ease-in-out infinite}
@keyframes galGrid{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.85;transform:scale(1.015)}}
.gal-vignette{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,transparent 40%,rgba(2,6,14,.55) 100%)}
.gal-scanlines{position:absolute;inset:0;z-index:5;pointer-events:none;background-image:repeating-linear-gradient(to bottom,rgba(111,216,255,.025) 0px,rgba(111,216,255,.025) 1px,transparent 1px,transparent 3px);mix-blend-mode:overlay;opacity:.5}

/* ── fixed top header area (topbar + ticker) ────────────── */
.gal-topbar{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:6;display:flex;align-items:center;gap:14px;padding:8px 14px;border-radius:999px;background:rgba(8,18,36,.6);backdrop-filter:blur(16px) saturate(140%);border:1px solid rgba(111,216,255,.18);box-shadow:0 8px 30px rgba(0,0,0,.45);font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;isolation:isolate;animation:galUIC 700ms cubic-bezier(.2,.8,.2,1) 80ms both}
@keyframes galUIC{from{opacity:0;transform:translate(-50%,8px) scale(.985)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
.gal-topbar .sheen{position:absolute;top:0;bottom:0;left:0;width:60%;transform:translateX(-100%) skewX(-22deg);background:linear-gradient(90deg,transparent,rgba(111,216,255,.1) 40%,rgba(255,255,255,.18) 50%,rgba(111,216,255,.1) 60%,transparent);animation:galSheen 9s ease-in-out infinite;pointer-events:none;z-index:0}
@keyframes galSheen{0%,30%{transform:translateX(-120%) skewX(-22deg)}55%,100%{transform:translateX(220%) skewX(-22deg)}}
.gal-crest{width:22px;height:22px;border-radius:50%;flex-shrink:0;overflow:hidden;position:relative;background:radial-gradient(circle at 35% 30%,#b9eaff 0%,#6fd8ff 35%,#1a5a8a 70%,#062136 100%);box-shadow:0 0 14px rgba(111,216,255,.6),inset 0 0 6px rgba(255,255,255,.5)}
.gal-crest-sheen{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg,rgba(255,255,255,.45) 30deg,transparent 90deg);animation:galSpin 4s linear infinite}
.gal-engine{color:#e9f3ff;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:600}
.gal-engine .sub{color:rgba(111,216,255,.55);font-weight:400;margin-left:6px}
.gal-divider{width:1px;height:18px;background:rgba(111,216,255,.22)}
.gal-phases{display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(233,243,255,.32)}
.gal-phase{display:flex;align-items:center;gap:6px;transition:color .4s ease}
.gal-phase .pdot{width:6px;height:6px;border-radius:50%;background:rgba(111,216,255,.2);transition:background .4s ease,box-shadow .4s ease}
.gal-phase+.gal-phase::before{content:"";width:18px;height:1px;background:rgba(111,216,255,.25);margin-right:4px}
.gal-phase.active{color:#e9f3ff}.gal-phase.active .pdot{background:#6fd8ff;box-shadow:0 0 10px #6fd8ff}
.gal-phase.done{color:rgba(233,243,255,.62)}.gal-phase.done .pdot{background:#4fe0c0}
.gal-ticker{position:absolute;top:66px;left:50%;transform:translateX(-50%);z-index:6;width:min(560px,calc(100vw - 24px));height:26px;overflow:hidden;border-radius:999px;background:rgba(8,18,36,.55);backdrop-filter:blur(12px) saturate(140%);border:1px solid rgba(111,216,255,.14);box-shadow:0 6px 24px rgba(0,0,0,.40);mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 10%,#000 90%,transparent);animation:galUIC 700ms cubic-bezier(.2,.8,.2,1) 160ms both}
.gal-ticker .tlead{position:absolute;left:0;top:0;bottom:0;z-index:2;padding:0 12px;display:flex;align-items:center;background:linear-gradient(90deg,rgba(8,18,36,.95) 65%,transparent);font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#ffb547;gap:6px}
.gal-ticker .tldot{width:5px;height:5px;border-radius:50%;background:#ffb547;box-shadow:0 0 8px #ffb547;animation:galDot 1.2s ease-in-out infinite}
.gal-ticker .ttrack{position:absolute;top:0;bottom:0;display:flex;align-items:center;gap:36px;font-family:"JetBrains Mono",monospace;font-size:10px;color:rgba(233,243,255,.62);white-space:nowrap;animation:galTick 60s linear infinite;padding-left:100%}
@keyframes galTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.gal-ticker .tsig{display:inline-flex;align-items:center;gap:8px}
.gal-ticker .tsig-sig.alert{color:#ff6680;font-weight:600}.gal-ticker .tsig-sig.warn{color:#ffb547;font-weight:600}.gal-ticker .tsig-sig.neutral{color:#6fd8ff;font-weight:600}
.gal-ticker .tsep{color:rgba(111,216,255,.25)}

/* ── 3-column body layout ─────────────────────────────── */
.gal-body{position:absolute;inset:0;top:100px;bottom:0;display:flex;flex-direction:row;align-items:stretch;padding:8px 12px 8px;gap:10px;z-index:2}
.gal-left-col{flex:0 0 234px;display:flex;flex-direction:column;gap:10px;min-height:0;min-width:0}
.gal-center-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;overflow:hidden}
.gal-right-col{flex:0 0 210px;display:flex;flex-direction:column;gap:8px;min-height:0;min-width:0}

/* ── globe composition: fills center-col, aspect-ratio 1:1 */
.gal-composition{position:relative;z-index:2;flex-shrink:0;width:min(100%,700px);max-height:calc(100vh - 200px);aspect-ratio:1;display:grid;place-items:center;animation:galFade 700ms cubic-bezier(.2,.8,.2,1) both}
@keyframes galFade{from{opacity:0}to{opacity:1}}
.gal-halo{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 50%,rgba(111,216,255,.20) 0%,rgba(111,216,255,.08) 28%,rgba(111,216,255,0) 55%);filter:blur(6px);animation:galHalo 6s ease-in-out infinite;pointer-events:none}
@keyframes galHalo{0%,100%{opacity:.85;transform:scale(1)}50%{opacity:1;transform:scale(1.03)}}
.gal-globe-canvas{position:absolute;width:58%;height:58%;border-radius:50%;box-shadow:0 0 22px 0 rgba(111,216,255,.55),0 0 60px 6px rgba(111,216,255,.32),0 0 140px 22px rgba(111,216,255,.14),0 0 260px 50px rgba(155,123,255,.08),inset 0 0 26px 2px rgba(111,216,255,.20)}
.gal-overlay-canvas{position:absolute;width:58%;height:58%;pointer-events:none}
.gal-orbits{position:absolute;inset:0;pointer-events:none;overflow:visible}
.gal-orbits svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.gal-orbit{transform-origin:50% 50%;transform-box:fill-box}
.gal-o1{animation:galSpin 22s linear infinite}.gal-o2{animation:galSpin 32s linear infinite reverse}.gal-o3{animation:galSpin 48s linear infinite}.gal-o4{animation:galSpin 14s linear infinite reverse}
@keyframes galSpin{to{transform:rotate(360deg)}}
.gal-scan-ring{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.gal-scan-ring-spin{transform-origin:50% 50%;transform-box:fill-box;animation:galSpin 7.5s linear infinite}
.gal-leaders{position:absolute;width:58%;height:58%;pointer-events:none;overflow:visible;z-index:2}
.gal-telemetry{position:absolute;width:58%;height:58%;pointer-events:none;z-index:2;overflow:visible}

/* ── telemetry float cards ──────────────────────────────── */
.gal-tcard{position:absolute;transform:translate(-50%,-50%);font-family:"JetBrains Mono",ui-monospace,monospace;font-size:9.5px;line-height:1.35;color:rgba(220,240,255,.92);background:rgba(8,18,36,.72);backdrop-filter:blur(8px) saturate(140%);border:1px solid rgba(111,216,255,.38);border-radius:4px;padding:6px 9px 7px;min-width:92px;letter-spacing:.06em;box-shadow:0 4px 18px rgba(0,0,0,.45);animation:galTIn .35s ease-out}
.gal-tcard.fading{animation:galTOut .45s ease-in forwards}
@keyframes galTIn{from{opacity:0;transform:translate(-50%,-50%) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes galTOut{from{opacity:1}to{opacity:0;transform:translate(-50%,-50%) scale(.92)}}
.gal-tcard .trow1{display:flex;align-items:center;gap:6px;font-weight:600;color:#6fd8ff;text-transform:uppercase;margin-bottom:3px}
.gal-tcard .tblip{width:5px;height:5px;border-radius:50%;background:#6fd8ff;box-shadow:0 0 6px #6fd8ff;animation:galDot 1.3s ease-in-out infinite}
.gal-tcard .tcoord{color:rgba(233,243,255,.62);margin-bottom:4px}
.gal-tcard .tmeter{width:100%;height:2px;border-radius:99px;background:rgba(111,216,255,.15);overflow:hidden;position:relative}
.gal-tcard .tmeter>i{position:absolute;top:0;left:0;height:100%;background:linear-gradient(90deg,#6fd8ff,#9b7bff);box-shadow:0 0 8px #6fd8ff}
.gal-tcard .tmeta{display:flex;justify-content:space-between;margin-top:4px;font-size:8.5px;color:rgba(111,216,255,.7)}
.gal-tcard .risk-high{color:#ff6680;font-weight:600}.gal-tcard .risk-warn{color:#ffb547;font-weight:600}.gal-tcard .risk-ok{color:#6fd8ff;font-weight:600}

/* ── sector rail (left column) ──────────────────────────── */
.gal-sector-rail{flex:1 1 0;min-height:0;overflow:hidden;padding:12px 14px 14px;border-radius:12px;background:rgba(8,18,36,.55);backdrop-filter:blur(14px) saturate(140%);border:1px solid rgba(111,216,255,.16);box-shadow:0 8px 30px rgba(0,0,0,.45);font-family:"JetBrains Mono",monospace;isolation:isolate;animation:galUI 700ms cubic-bezier(.2,.8,.2,1) 220ms both;position:relative}
@keyframes galUI{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.gal-sector-rail::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;background:linear-gradient(180deg,rgba(255,255,255,.08) 0%,transparent 22%,transparent 78%,rgba(111,216,255,.04) 100%)}
.gal-sector-rail>*{position:relative;z-index:1}
.gal-rhead{display:flex;justify-content:space-between;align-items:center;color:rgba(111,216,255,.55);font-size:9px;letter-spacing:.22em;text-transform:uppercase;margin-bottom:10px}
.gal-live{display:flex;align-items:center;gap:5px;color:#7af7c0}
.gal-live .pulse{width:5px;height:5px;border-radius:50%;background:#7af7c0;box-shadow:0 0 8px #7af7c0;animation:galDot 1.4s ease-in-out infinite}
.gal-srow{display:grid;grid-template-columns:14px 1fr 38px;gap:8px;align-items:center;padding:5px 0;font-size:10px;color:rgba(233,243,255,.62)}
.gal-srow .si{color:rgba(111,216,255,.18);font-size:8.5px;font-variant-numeric:tabular-nums}
.gal-srow .sn{color:#e9f3ff;letter-spacing:.04em}
.gal-srow .sbar{grid-column:1/-1;height:2px;background:rgba(111,216,255,.1);border-radius:99px;overflow:hidden;position:relative}
.gal-srow .sbar>i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#6fd8ff,#9b7bff);box-shadow:0 0 8px #6fd8ff;transition:width .6s cubic-bezier(.4,0,.2,1)}
.gal-srow.warn .sn{color:#ffb547}.gal-srow.warn .sbar>i{background:linear-gradient(90deg,#ffb547,#ff6680);box-shadow:0 0 8px #ffb547}
.gal-srow .sv{text-align:right;color:#6fd8ff;font-variant-numeric:tabular-nums;font-size:10px}.gal-srow.warn .sv{color:#ffb547}

/* ── spectrum (bottom of left column) ───────────────────── */
.gal-spectrum{flex:0 0 60px;overflow:hidden;padding:8px 12px 6px;border-radius:10px;background:rgba(8,18,36,.55);backdrop-filter:blur(14px) saturate(140%);border:1px solid rgba(111,216,255,.16);box-shadow:0 6px 24px rgba(0,0,0,.35);isolation:isolate;animation:galUI 700ms cubic-bezier(.2,.8,.2,1) 320ms both;position:relative}
.gal-spectrum-label{position:absolute;top:-6px;left:12px;background:rgba(8,18,36,.9);padding:0 6px;font-family:"JetBrains Mono",monospace;font-size:8.5px;letter-spacing:.18em;color:rgba(111,216,255,.55);text-transform:uppercase}

/* ── gauges (right column) ──────────────────────────────── */
.gal-gauges{display:flex;flex-direction:column;gap:8px;width:100%;animation:galUI 700ms cubic-bezier(.2,.8,.2,1) 260ms both}
.gal-gauge{padding:10px 12px;border-radius:12px;background:rgba(8,18,36,.55);backdrop-filter:blur(14px) saturate(140%);border:1px solid rgba(111,216,255,.16);box-shadow:0 8px 30px rgba(0,0,0,.45);font-family:"JetBrains Mono",monospace;display:grid;grid-template-columns:52px 1fr;gap:10px;align-items:center;position:relative;isolation:isolate}
.gal-gauge::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;background:linear-gradient(180deg,rgba(255,255,255,.08) 0%,transparent 22%,transparent 78%,rgba(111,216,255,.04) 100%)}
.gal-gauge>*{position:relative;z-index:1}
.gal-ring{position:relative;width:52px;height:52px}
.gal-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.gal-gval{position:absolute;inset:0;display:grid;place-items:center;font-size:14px;color:#e9f3ff;font-weight:600;letter-spacing:.02em}
.gal-glabel{font-size:8.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(111,216,255,.55);margin-bottom:4px}
.gal-gname{font-size:12px;color:#e9f3ff;font-weight:500;margin-bottom:4px}
.gal-gsub{font-size:9px;color:rgba(233,243,255,.32);letter-spacing:.06em}

/* ── status panel (bottom of center column) ─────────────── */
.gal-panel{flex-shrink:0;width:100%;max-width:480px;padding:14px 20px 12px;border-radius:16px;background:linear-gradient(180deg,rgba(10,22,42,.62),rgba(10,22,42,.55)),radial-gradient(120% 60% at 0% 0%,rgba(111,216,255,.10),transparent 60%);backdrop-filter:blur(18px) saturate(140%);border:1px solid rgba(111,216,255,.18);box-shadow:0 10px 40px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);isolation:isolate;animation:galUIC 700ms cubic-bezier(.2,.8,.2,1) 360ms both}
.gal-panel-row{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px}
.gal-dot{width:8px;height:8px;border-radius:50%;background:#6fd8ff;box-shadow:0 0 12px #6fd8ff,0 0 24px rgba(111,216,255,.5);animation:galDot 1.6s ease-in-out infinite;flex:0 0 auto}
.gal-label{font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(111,216,255,.55);font-weight:600}
.gal-status-text{font-size:13px;color:#e9f3ff;font-weight:500;min-height:18px;text-align:center;transition:opacity .35s ease}
.gal-bar{position:relative;height:3px;border-radius:99px;background:rgba(111,216,255,.10);overflow:hidden;margin-top:8px}
.gal-bar::after{content:"";position:absolute;inset:0;width:35%;border-radius:99px;background:linear-gradient(90deg,transparent,#6fd8ff,transparent);animation:galBar 2.4s ease-in-out infinite}
@keyframes galBar{0%{transform:translateX(-100%)}100%{transform:translateX(285%)}}
.gal-meta{display:flex;justify-content:center;align-items:center;gap:12px;font-size:10px;color:rgba(233,243,255,.32);margin-top:8px;font-variant-numeric:tabular-nums;letter-spacing:.06em;flex-wrap:wrap}
.gal-meta span+span::before{content:"·";color:rgba(111,216,255,.18);margin-right:12px}

/* ── corner HUDs (absolute within gal-root) ─────────────── */
.gal-hud{position:absolute;z-index:3;color:rgba(111,216,255,.18);font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
.gal-hud .tick{width:18px;height:1px;background:currentColor}
.gal-hud.tl{top:12px;left:12px}.gal-hud.tr{top:12px;right:12px}.gal-hud.bl{bottom:12px;left:12px}.gal-hud.br{bottom:12px;right:12px}
.gal-hud .v{color:rgba(233,243,255,.62)}
@keyframes galDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.65}}

/* ── RESPONSIVE BREAKPOINTS ─────────────────────────────── */

/* 1100px: hide left signal rail — center + right remain */
@media(max-width:1100px){
  .gal-left-col{display:none}
  .gal-composition{max-height:calc(100vh - 190px)}
}

/* 820px: stack body as column, gauges become top row */
@media(max-width:820px){
  .gal-body{flex-direction:column;padding:6px 8px 6px;gap:6px}
  .gal-left-col{display:none}
  .gal-right-col{order:-1;flex:0 0 auto;flex-direction:row;width:100%;justify-content:center;gap:6px}
  .gal-gauges{flex-direction:row;width:auto;gap:6px}
  .gal-gauge{flex:1;min-width:0;max-width:200px;grid-template-columns:40px 1fr;gap:8px;padding:8px 10px}
  .gal-ring{width:40px;height:40px}.gal-gval{font-size:11px}
  .gal-glabel,.gal-gsub{display:none}
  .gal-center-col{justify-content:flex-start}
  .gal-composition{max-height:calc(100vh - 240px);width:min(100%,580px)}
  .gal-panel{padding:10px 14px 10px;border-radius:12px}
  .gal-hud{display:none}
}

/* 560px: hide gauges, thin ticker, simplify topbar */
@media(max-width:560px){
  .gal-body{top:88px;padding:4px 6px 4px}
  .gal-right-col{display:none}
  .gal-topbar{top:8px;padding:6px 10px;gap:8px}
  .gal-engine .sub,.gal-divider,.gal-phases{display:none}
  .gal-ticker{top:52px;height:22px;width:calc(100vw - 16px)}
  .gal-composition{max-height:calc(100vh - 200px)}
  .gal-panel{border-radius:10px;padding:10px 12px 8px}
  .gal-meta{font-size:9px;gap:8px}
}

/* 400px: minimal — globe + panel only */
@media(max-width:400px){
  .gal-body{padding:2px 4px 2px}
  .gal-composition{max-height:calc(100vh - 180px)}
  .gal-status-text{font-size:11px}
  .gal-meta{display:none}
}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export const GlobeAuditLoader: React.FC<Props> = ({
  stage,
  companyName,
  limitedDataMode,
  limitedDataReason,
}) => {
  const globeRef   = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const starsRef   = useRef<HTMLCanvasElement>(null);
  const specRef    = useRef<HTMLCanvasElement>(null);
  const leadersRef = useRef<SVGSVGElement>(null);
  const telRef     = useRef<HTMLDivElement>(null);

  const [statusText, setStatusText] = useState(STATUS_MESSAGES[0]);
  const [companies,  setCompanies]  = useState(0);
  const [signals,    setSignals]    = useState(0);
  const [regions,    setRegions]    = useState(0);
  const [clock,      setClock]      = useState('00:00:00 UTC');
  const [sectorVals, setSectorVals] = useState(() => SECTORS.map(() => 0));
  const [g1, setG1] = useState(0);
  const [g2, setG2] = useState(0);
  const [g3, setG3] = useState(0);
  const [activePhase, setActivePhase] = useState(() => stageToInitialPhase(stage));
  const [tickerItems]                 = useState(buildTickerItems);

  const labelText = companyName
    ? `Analyzing ${companyName}`
    : 'Layoff Audit · Prediction Engine';

  // ── CSS injection ───────────────────────────────────────────────────────────
  useEffect(() => {
    const id = 'gal-css';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = GLOBE_CSS;
      document.head.appendChild(el);
    }
    return () => document.getElementById('gal-css')?.remove();
  }, []);

  // ── UI intervals ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mi = 0;
    const iv = setInterval(() => { mi = (mi + 1) % STATUS_MESSAGES.length; setStatusText(STATUS_MESSAGES[mi]); }, 2200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let co = 0, si = 0, re = 0;
    const iv = setInterval(() => {
      co = Math.min(14237, co + Math.round(180 + Math.random() * 360));
      si = Math.min(2840000, si + Math.round(34000 + Math.random() * 28000));
      if (Math.random() < 0.06) re = Math.min(7, re + 1);
      setCompanies(co); setSignals(si); setRegions(re);
      if (co >= 14237 && si >= 2840000 && re >= 7) setTimeout(() => { co = 0; si = 0; re = 0; }, 1800);
    }, 120);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const tick = () => {
      const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

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

  useEffect(() => {
    let _g1 = 0, _g2 = 0, _g3 = 0;
    const iv = setInterval(() => {
      const t = Date.now() / 1000;
      _g1 += (0.94 + Math.sin(t * 0.6) * 0.02   - _g1) * 0.05;
      _g2 += (0.62 + Math.sin(t * 0.4 + 1.2) * 0.08 - _g2) * 0.05;
      _g3 += (0.86 + Math.sin(t * 0.8 + 2.4) * 0.05 - _g3) * 0.05;
      setG1(_g1); setG2(_g2); setG3(_g3);
    }, 60);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setActivePhase(p => p + 1 >= PHASES.length ? 1 : p + 1), 5500);
    return () => clearInterval(iv);
  }, []);

  // ── Globe canvas animation ──────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;
    let animRaf = 0;

    async function init() {
      // ── dynamic import d3/topojson (separate code chunk) ──────────────────
      const [
        { geoOrthographic, geoPath, geoGraticule10, geoInterpolate },
        { feature: topoFeature },
      ] = await Promise.all([
        import('d3-geo'),
        import('topojson-client'),
      ]);

      if (destroyed) return;

      // Wait one frame so canvas elements have been laid out and sized
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      if (destroyed) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // ── Stars ──────────────────────────────────────────────────────────────
      const sCvs = starsRef.current;
      const sCtx = sCvs?.getContext('2d');
      let sW = 0, sH = 0;

      type Star    = { x:number;y:number;r:number;a:number;tw:number;sp:number;hue:string;hero:boolean };
      type Mote    = { x:number;y:number;r:number;vy:number;vx:number;a:number;phase:number };
      type Shooter = { x:number;y:number;vx:number;vy:number;bornAt:number;maxLife:number;tail:number };

      let stars: Star[] = [], motes: Mote[] = [], shooters: Shooter[] = [], nextShoot = 0;
      const HUES = ['rgba(190,220,255,','rgba(170,200,255,','rgba(220,235,255,','rgba(180,160,255,','rgba(160,230,220,'];

      function sizeStars() {
        if (!sCvs || !sCtx) return;
        sW = window.innerWidth; sH = window.innerHeight;
        sCvs.width = sW * dpr; sCvs.height = sH * dpr;
        sCvs.style.width = sW + 'px'; sCvs.style.height = sH + 'px';
        sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.min(360, Math.round((sW * sH) / 7500));
        stars = Array.from({ length: n }, () => {
          const hero = Math.random() < 0.06;
          return { x: Math.random()*sW, y: Math.random()*sH, r: hero ? (1.4+Math.random()*1.4) : (Math.random()*1.1+0.2), a: hero ? (0.7+Math.random()*0.3) : (Math.random()*0.55+0.15), tw: Math.random()*Math.PI*2, sp: 0.4+Math.random()*1.2, hue: HUES[Math.floor(Math.random()*HUES.length)], hero };
        });
        const mc = Math.min(60, Math.round((sW*sH)/36000));
        motes = Array.from({ length: mc }, () => ({ x:Math.random()*sW, y:Math.random()*sH, r:Math.random()*0.9+0.3, vy:0.08+Math.random()*0.16, vx:(Math.random()-0.5)*0.05, a:Math.random()*0.4+0.15, phase:Math.random()*Math.PI*2 }));
      }

      function drawStars(t: number) {
        if (!sCtx) return;
        sCtx.clearRect(0, 0, sW, sH);
        for (const m of motes) {
          m.y -= m.vy; m.x += m.vx + Math.sin(t*0.0006+m.phase)*0.08;
          if (m.y < -4) { m.y = sH+4; m.x = Math.random()*sW; }
          if (m.x < -4) m.x = sW+4; if (m.x > sW+4) m.x = -4;
          const fl = 0.5+0.5*Math.sin(t*0.002+m.phase);
          sCtx.beginPath(); sCtx.arc(m.x,m.y,m.r,0,Math.PI*2);
          sCtx.fillStyle = `rgba(140,210,255,${(m.a*fl).toFixed(3)})`; sCtx.fill();
        }
        for (const s of stars) {
          const tw = 0.55+0.45*Math.sin(t*0.0012*s.sp+s.tw), al = (s.a*tw).toFixed(3);
          if (s.hero) {
            const g = sCtx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*4);
            g.addColorStop(0,s.hue+al+')'); g.addColorStop(1,s.hue+'0)');
            sCtx.fillStyle = g; sCtx.beginPath(); sCtx.arc(s.x,s.y,s.r*4,0,Math.PI*2); sCtx.fill();
          }
          sCtx.beginPath(); sCtx.arc(s.x,s.y,s.r,0,Math.PI*2); sCtx.fillStyle = s.hue+al+')'; sCtx.fill();
        }
        if (t >= nextShoot) {
          const fl2 = Math.random()<0.5, y0=Math.random()*sH*0.55, x0=fl2?-40:sW+40;
          const ang = fl2 ? (Math.PI/6)+Math.random()*(Math.PI/8) : Math.PI-(Math.PI/6)-Math.random()*(Math.PI/8);
          const spd = 0.9+Math.random()*0.7;
          shooters.push({ x:x0,y:y0,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,bornAt:t,maxLife:900+Math.random()*500,tail:110+Math.random()*60 });
          nextShoot = t+2400+Math.random()*4200;
        }
        for (let i=shooters.length-1;i>=0;i--) {
          const sh=shooters[i], age=t-sh.bornAt;
          if (age>sh.maxLife){shooters.splice(i,1);continue;}
          sh.x+=sh.vx*16; sh.y+=sh.vy*16;
          if (sh.x<-100||sh.x>sW+100||sh.y>sH+100){shooters.splice(i,1);continue;}
          const tx=sh.x-sh.vx*sh.tail, ty=sh.y-sh.vy*sh.tail, lf=1-age/sh.maxLife;
          const gr=sCtx.createLinearGradient(tx,ty,sh.x,sh.y);
          gr.addColorStop(0,'rgba(180,230,255,0)'); gr.addColorStop(0.6,`rgba(180,230,255,${(0.35*lf).toFixed(3)})`); gr.addColorStop(1,`rgba(255,255,255,${(0.95*lf).toFixed(3)})`);
          sCtx.strokeStyle=gr; sCtx.lineWidth=1.4; sCtx.lineCap='round';
          sCtx.beginPath(); sCtx.moveTo(tx,ty); sCtx.lineTo(sh.x,sh.y); sCtx.stroke();
          sCtx.beginPath(); sCtx.arc(sh.x,sh.y,1.6,0,Math.PI*2);
          sCtx.fillStyle=`rgba(255,255,255,${(0.95*lf).toFixed(3)})`; sCtx.shadowColor='rgba(180,230,255,.9)'; sCtx.shadowBlur=8; sCtx.fill(); sCtx.shadowBlur=0;
        }
      }

      // ── Globe canvas ───────────────────────────────────────────────────────
      const gCvs = globeRef.current;
      const oCvs = overlayRef.current;
      const gctx = gCvs?.getContext('2d');
      const octx = oCvs?.getContext('2d');
      if (!gCvs || !oCvs || !gctx || !octx) return;

      let sz = 0, R = 0, cx = 0, cy = 0;

      // Build d3 projection + path renderers
      const proj  = geoOrthographic().clipAngle(90);
      const gpath = geoPath(proj, gctx);
      const opath = geoPath(proj, octx);
      const grat  = geoGraticule10();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sphere = { type: 'Sphere' } as any; // d3-geo Sphere — not a standard GeoJSON type

      const COL = {
        ocean0:'#0b2e52', ocean1:'#1a5585',
        land0:'#3dbe72',  land1:'#1e7040',  // vivid green — high contrast on dark ocean
        coast:'rgba(100,255,160,.92)',        // bright emerald coast line
        grat:'rgba(120,200,255,.15)',
        rim:'rgba(150,220,255,.88)', pulse:'rgba(111,216,255,1)',
        arc:'rgba(180,235,255,.95)', arcVi:'rgba(170,145,255,.95)', arcTeal:'rgba(120,240,210,.95)',
      };

      let oceanGrad: CanvasGradient, landGrad: CanvasGradient, shadeGrad: CanvasGradient;

      function rebuildGradients() {
        oceanGrad = gctx.createRadialGradient(cx-R*.4,cy-R*.4,R*.1,cx,cy,R);
        oceanGrad.addColorStop(0,COL.ocean1); oceanGrad.addColorStop(1,COL.ocean0);
        landGrad = gctx.createRadialGradient(cx-R*.4,cy-R*.4,R*.1,cx,cy,R);
        landGrad.addColorStop(0,COL.land0); landGrad.addColorStop(1,COL.land1);
        shadeGrad = gctx.createRadialGradient(cx-R*.35,cy-R*.35,R*.2,cx+R*.15,cy+R*.15,R*1.1);
        shadeGrad.addColorStop(0,'rgba(0,5,15,0)'); shadeGrad.addColorStop(.55,'rgba(0,5,15,0)'); shadeGrad.addColorStop(1,'rgba(0,5,15,.55)');
      }

      function fitGlobe() {
        const rect = gCvs.getBoundingClientRect();
        sz = Math.max(Math.min(rect.width, rect.height), 40);   // never 0
        gCvs.width  = sz * dpr; gCvs.height = sz * dpr;
        oCvs.width  = sz * dpr; oCvs.height = sz * dpr;
        oCvs.style.width  = sz + 'px'; oCvs.style.height = sz + 'px';
        gctx.setTransform(dpr,0,0,dpr,0,0);
        octx.setTransform(dpr,0,0,dpr,0,0);
        cx = sz/2; cy = sz/2; R = sz * 0.48;
        proj.scale(R).translate([cx, cy]);
        rebuildGradients();
        if (leadersRef.current) leadersRef.current.setAttribute('viewBox', `0 0 ${sz} ${sz}`);
      }

      // Load world atlas — served locally from /public so no CDN dependency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let countries: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let landMass: any  = null;
      try {
        const res  = await fetch('/countries-110m.json');
        const topo = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        countries = topoFeature(topo as any, (topo as any).objects.countries);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        landMass  = topoFeature(topo as any, (topo as any).objects.land);   // merged land fill
      } catch { /* draw ocean-only on failure — graceful degradation */ }

      if (destroyed) return;

      // Final fitGlobe after fetch — DOM is definitely painted now
      sizeStars();
      fitGlobe();

      function drawGlobe() {
        gctx.clearRect(0, 0, sz, sz);

        // ── Ocean sphere ───────────────────────────────────────────────────
        gctx.beginPath();
        gpath(sphere);
        gctx.fillStyle = oceanGrad;
        gctx.fill();

        // ── Graticule ──────────────────────────────────────────────────────
        gctx.beginPath();
        gpath(grat);
        gctx.strokeStyle = COL.grat;
        gctx.lineWidth   = 0.8;
        gctx.stroke();

        // ── Land fill (merged land shape — smoother fill) ──────────────────
        if (landMass) {
          gctx.beginPath();
          gpath(landMass);
          gctx.fillStyle = landGrad;
          gctx.fill();
        }
        // ── Country borders (individual country outlines) ──────────────────
        if (countries) {
          gctx.beginPath();
          gpath(countries);
          gctx.strokeStyle = COL.coast;
          gctx.lineWidth   = 1.2;
          gctx.lineJoin    = 'round';
          gctx.stroke();
        }

        // ── Terminator shading + specular ──────────────────────────────────
        gctx.save();
        gctx.beginPath(); gpath(sphere); gctx.clip();
        gctx.fillStyle = shadeGrad;
        gctx.fillRect(0, 0, sz, sz);
        const sx = cx - R*.42, sy = cy - R*.42;
        const sp = gctx.createRadialGradient(sx,sy,0,sx,sy,R*.55);
        sp.addColorStop(0,'rgba(220,240,255,.45)'); sp.addColorStop(.4,'rgba(180,220,255,.10)'); sp.addColorStop(1,'rgba(180,220,255,0)');
        gctx.fillStyle = sp; gctx.fillRect(0, 0, sz, sz);
        gctx.restore();

        // ── Atmosphere rim ─────────────────────────────────────────────────
        gctx.beginPath(); gpath(sphere);
        gctx.strokeStyle = COL.rim; gctx.lineWidth = 1.2; gctx.stroke();
      }

      function isVisible(ll: [number, number]): boolean {
        const [la, ph] = proj.rotate();
        const lr = la * Math.PI/180, pr = -ph * Math.PI/180;
        const lon = ll[0]*Math.PI/180 + lr, lat = ll[1]*Math.PI/180;
        return Math.cos(lat)*Math.cos(lon)*Math.cos(pr) + Math.sin(lat)*Math.sin(pr) > 0;
      }

      // ── Data arcs ──────────────────────────────────────────────────────────
      type Arc = {
        from: typeof HUBS[number]; to: typeof HUBS[number];
        start: number; duration: number; color: string;
        landed?: boolean; landAt?: number;
      };
      const arcs: Arc[] = [];
      const ARC_PAL = [COL.arc, COL.arcVi, COL.arcTeal];
      let nextArcAt = performance.now() + 200;

      function spawnArc(now: number) {
        const a = HUBS[Math.floor(Math.random()*HUBS.length)];
        let   b = HUBS[Math.floor(Math.random()*HUBS.length)];
        if (a === b) b = HUBS[(HUBS.indexOf(a)+1)%HUBS.length];
        arcs.push({ from:a, to:b, start:now, duration:2400+Math.random()*1800, color:ARC_PAL[Math.floor(Math.random()*3)] });
      }

      // ── Reticle ────────────────────────────────────────────────────────────
      let reticleHub: typeof HUBS[number] | null = null;
      let reticleAt = 0;

      function drawOverlay(now: number) {
        octx.clearRect(0, 0, sz, sz);

        // radar sweep — clip to sphere, then conic gradient or fallback wedge
        const sweepA = ((now - startTs) / 4000) * Math.PI * 2;
        octx.save();
        octx.beginPath(); opath(sphere); octx.clip();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (octx as any).createConicGradient === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sg = (octx as any).createConicGradient(sweepA, cx, cy);
          sg.addColorStop(0.00,'rgba(111,216,255,.28)');
          sg.addColorStop(0.06,'rgba(111,216,255,.10)');
          sg.addColorStop(0.18,'rgba(111,216,255,0)');
          sg.addColorStop(1.00,'rgba(111,216,255,0)');
          octx.fillStyle = sg; octx.fillRect(0, 0, sz, sz);
        } else {
          octx.save(); octx.translate(cx,cy); octx.rotate(sweepA);
          octx.beginPath(); octx.moveTo(0,0); octx.arc(0,0,R,0,Math.PI*.25); octx.closePath();
          octx.fillStyle='rgba(111,216,255,.18)'; octx.fill(); octx.restore();
        }
        octx.restore();

        // data arcs
        for (let i = arcs.length-1; i >= 0; i--) {
          const a = arcs[i];
          const t = (now - a.start) / a.duration;
          if (t >= 1.15) { arcs.splice(i,1); continue; }
          const ip    = geoInterpolate(a.from.ll, a.to.ll);
          const headT = Math.min(1, t), tailT = Math.max(0, headT - 0.34);
          for (let k = 0; k < 22; k++) {
            const f0 = tailT + (headT-tailT)*(k/22), f1 = tailT + (headT-tailT)*((k+1)/22);
            if (f1 <= 0 || f0 >= 1) continue;
            const mid = ip((f0+f1)/2) as [number,number];
            if (!isVisible(mid)) continue;
            const alpha = (k/22)**1.6;
            octx.beginPath();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            opath({ type:'LineString', coordinates:[ip(Math.max(0,f0)),ip(Math.min(1,f1))] } as any);
            octx.strokeStyle = a.color.replace(/[\d.]+\)$/g, (alpha*0.95).toFixed(3)+')');
            octx.lineWidth = 1.1 + alpha*1.4; octx.lineCap = 'round'; octx.stroke();
          }
          // arc head glow
          if (headT < 1 && isVisible(ip(headT) as [number,number])) {
            const p = proj(ip(headT)); if (p) {
              const gr = octx.createRadialGradient(p[0],p[1],0,p[0],p[1],9);
              gr.addColorStop(0, a.color); gr.addColorStop(1,'rgba(111,216,255,0)');
              octx.beginPath(); octx.arc(p[0],p[1],9,0,Math.PI*2); octx.fillStyle=gr; octx.fill();
            }
          }
          // landing pulse
          if (t > 0.99 && !a.landed) { a.landed=true; a.landAt=now; }
          if (a.landed && a.landAt) {
            const lt = (now-a.landAt)/900;
            if (lt < 1 && isVisible(a.to.ll)) {
              const p = proj(a.to.ll); if (p) {
                octx.beginPath(); octx.arc(p[0],p[1],4+lt*22,0,Math.PI*2);
                octx.strokeStyle=`rgba(111,216,255,${(1-lt).toFixed(3)})`; octx.lineWidth=1.2; octx.stroke();
              }
            }
          }
        }

        // hub pulse beacons
        for (let i = 0; i < HUBS.length; i++) {
          const h = HUBS[i]; if (!isVisible(h.ll)) continue;
          const p = proj(h.ll); if (!p) continue;
          const phase = (now/1800 + i*0.37) % 1;
          octx.beginPath(); octx.arc(p[0],p[1],2+phase*14,0,Math.PI*2);
          octx.strokeStyle=`rgba(111,216,255,${((1-phase)*.55).toFixed(3)})`; octx.lineWidth=0.9; octx.stroke();
          octx.beginPath(); octx.arc(p[0],p[1],1.6,0,Math.PI*2);
          octx.fillStyle=COL.pulse; octx.shadowColor=COL.pulse; octx.shadowBlur=6; octx.fill(); octx.shadowBlur=0;
        }

        // reticle crosshair — locks onto a visible hub
        if (!reticleHub || now-reticleAt > 1400) {
          const vis = HUBS.filter(h => isVisible(h.ll));
          if (vis.length) { reticleHub = vis[Math.floor(Math.random()*vis.length)]; reticleAt = now; }
        }
        if (reticleHub && isVisible(reticleHub.ll)) {
          const p = proj(reticleHub.ll); if (p) {
            const t2 = (now-reticleAt)/1400;
            const hs = t2 < 0.25 ? (1-t2/0.25)*8+12 : 12;
            const al2 = t2 < 0.85 ? 0.9 : (1-(t2-0.85)/0.15)*0.9;
            const leg = hs*0.45;
            octx.save(); octx.translate(p[0],p[1]);
            octx.strokeStyle=`rgba(255,235,130,${al2.toFixed(3)})`; octx.lineWidth=1.1;
            ([[-1,-1],[1,-1],[1,1],[-1,1]] as [number,number][]).forEach(([dx,dy]) => {
              octx.beginPath();
              octx.moveTo(dx*hs, dy*hs-dy*leg); octx.lineTo(dx*hs, dy*hs); octx.lineTo(dx*hs-dx*leg, dy*hs);
              octx.stroke();
            });
            octx.beginPath(); octx.moveTo(-3,0); octx.lineTo(3,0); octx.moveTo(0,-3); octx.lineTo(0,3); octx.stroke();
            octx.restore();
          }
        }
      }

      // ── Spectrum ────────────────────────────────────────────────────────────
      const spCvs = specRef.current;
      const spCtx = spCvs?.getContext('2d');
      let spW = 0, spH = 0;
      type SpecBar = { target:number; cur:number; phase:number; speed:number };
      let specBars: SpecBar[] = [];

      function sizeSpec() {
        if (!spCvs||!spCtx) return;
        const r = spCvs.getBoundingClientRect();
        spW = Math.max(r.width, 10); spH = Math.max(r.height, 10);
        spCvs.width = spW*dpr; spCvs.height = spH*dpr;
        spCtx.setTransform(dpr,0,0,dpr,0,0);
        specBars = Array.from({length:28},()=>({target:0.2+Math.random()*0.6,cur:0.2+Math.random()*0.6,phase:Math.random()*Math.PI*2,speed:0.0008+Math.random()*0.0014}));
      }
      sizeSpec();

      function drawSpectrum(t: number) {
        if (!spCtx) return;
        spCtx.clearRect(0,0,spW,spH);
        const n=specBars.length, gap=2, bw=(spW-gap*(n-1))/n;
        for (let i=0;i<n;i++) {
          const b=specBars[i];
          if (Math.random()<0.04) b.target=0.15+Math.random()*0.85;
          b.cur+=(b.target-b.cur)*0.12;
          const v=b.cur*(0.65+0.35*Math.sin(t*b.speed+b.phase));
          const h2=Math.max(2,v*spH), x=i*(bw+gap), y=spH-h2;
          const gr=spCtx.createLinearGradient(0,y,0,spH);
          gr.addColorStop(0,'rgba(111,216,255,.95)'); gr.addColorStop(.5,'rgba(155,123,255,.6)'); gr.addColorStop(1,'rgba(79,224,192,.25)');
          spCtx.fillStyle=gr; spCtx.fillRect(x,y,bw,h2);
        }
      }

      // ── Telemetry cards ─────────────────────────────────────────────────────
      const telEl = telRef.current;
      const svgEl = leadersRef.current;
      const SVG_NS = 'http://www.w3.org/2000/svg';
      type TCard = { hub:typeof HUBS[number]; angle:number; dist:number; card:HTMLDivElement; line:SVGLineElement; dot:SVGCircleElement; bornAt:number; maxLife:number; fading:boolean };
      const tcards: TCard[] = [];
      let nextTcard = performance.now() + 800;

      function spawnTcard(now: number) {
        if (!telEl||!svgEl) return;
        const tracked = new Set(tcards.map(c => c.hub.n));
        const cands   = HUBS.filter(h => isVisible(h.ll) && !tracked.has(h.n));
        if (!cands.length) return;
        const hub  = cands[Math.floor(Math.random()*cands.length)];
        const angle = (-Math.PI/3) + Math.random()*(Math.PI*1.3);
        const dist  = 70 + Math.random()*30;
        const sig   = SIGNAL_TYPES[Math.floor(Math.random()*SIGNAL_TYPES.length)];
        const val   = Math.max(30, Math.min(98, sig.base + Math.round((Math.random()-0.5)*18)));
        const tier  = val>=80?'HIGH':val>=60?'ELEV':'MOD';
        const tierCls = val>=80?'risk-high':val>=60?'risk-warn':'risk-ok';
        const card  = document.createElement('div');
        card.className = 'gal-tcard';
        card.innerHTML = `<div class="trow1"><span class="tblip"></span>Signal ${sig.code} · LIVE</div><div class="tcoord">${sig.name}</div><div class="tmeter"><i style="width:${val}%"></i></div><div class="tmeta"><span>${val}%</span><span class="${tierCls}">${tier}</span></div>`;
        telEl.appendChild(card);
        const line = document.createElementNS(SVG_NS,'line');
        line.setAttribute('stroke','rgba(111,216,255,.7)'); line.setAttribute('stroke-width','0.8'); line.setAttribute('stroke-dasharray','2 2');
        svgEl.appendChild(line);
        const dot = document.createElementNS(SVG_NS,'circle');
        dot.setAttribute('r','2'); dot.setAttribute('fill','rgba(111,216,255,1)');
        svgEl.appendChild(dot);
        tcards.push({ hub,angle,dist,card,line,dot,bornAt:now,maxLife:3400+Math.random()*1200,fading:false });
      }

      function updateTcards(now: number) {
        if (now >= nextTcard && tcards.filter(c=>!c.fading).length < 3) {
          spawnTcard(now); nextTcard = now+1400+Math.random()*1200;
        }
        for (let i=tcards.length-1;i>=0;i--) {
          const c=tcards[i];
          if (!isVisible(c.hub.ll)||now-c.bornAt>c.maxLife) {
            if (!c.fading) {
              c.fading=true; c.card.classList.add('fading');
              setTimeout(()=>{ c.card.remove(); c.line.remove(); c.dot.remove(); const idx=tcards.indexOf(c); if(idx>=0)tcards.splice(idx,1); }, 480);
            }
            continue;
          }
          const p=proj(c.hub.ll); if(!p) continue;
          const cx0=p[0]+Math.cos(c.angle)*c.dist, cy0=p[1]+Math.sin(c.angle)*c.dist;
          c.card.style.left=`${cx0}px`; c.card.style.top=`${cy0}px`;
          c.line.setAttribute('x1',String(p[0])); c.line.setAttribute('y1',String(p[1]));
          c.line.setAttribute('x2',String(cx0));  c.line.setAttribute('y2',String(cy0));
          c.dot.setAttribute('cx',String(p[0]));  c.dot.setAttribute('cy',String(p[1]));
        }
      }

      // ── Resize handler ──────────────────────────────────────────────────────
      const onResize = () => { sizeStars(); fitGlobe(); sizeSpec(); };
      window.addEventListener('resize', onResize);

      // ── Main loop ───────────────────────────────────────────────────────────
      let lambda = 0, lastTs = performance.now();
      const startTs = lastTs;

      function frame(now: number) {
        if (destroyed) return;
        const dt = now - lastTs; lastTs = now;
        lambda = (lambda + dt * 0.006) % 360;
        proj.rotate([lambda, -18, 0]);
        drawStars(now);
        drawGlobe();
        drawOverlay(now);
        drawSpectrum(now);
        updateTcards(now);
        if (now >= nextArcAt && arcs.length < 9) { spawnArc(now); nextArcAt = now+350+Math.random()*650; }
        animRaf = requestAnimationFrame(frame);
      }
      animRaf = requestAnimationFrame(frame);

      // store cleanup for resize
      return () => window.removeEventListener('resize', onResize);
    }

    let cleanupFn: (() => void) | undefined;
    init().then(fn => { cleanupFn = fn; }).catch(console.warn);

    return () => {
      destroyed = true;
      if (animRaf) cancelAnimationFrame(animRaf);
      cleanupFn?.();
      telRef.current?.querySelectorAll('.gal-tcard').forEach(n => n.remove());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gauge ring offsets ──────────────────────────────────────────────────────
  const CIRC = 2 * Math.PI * 26;
  const g1off = (CIRC * (1 - g1)).toFixed(2);
  const g2off = (CIRC * (1 - g2)).toFixed(2);
  const g3off = (CIRC * (1 - g3)).toFixed(2);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="gal-root" role="status" aria-label="Analyzing company data">
      {/* ── Background layers ── */}
      <canvas className="gal-stars" ref={starsRef} aria-hidden="true" />
      <div className="gal-aurora"   aria-hidden="true" />
      <div className="gal-nebula"   aria-hidden="true" />
      <div className="gal-gridmesh" aria-hidden="true" />
      <div className="gal-vignette"  aria-hidden="true" />
      <div className="gal-scanlines" aria-hidden="true" />

      {/* ── Top engine bar (absolute, centred) ── */}
      <div className="gal-topbar" aria-hidden="true">
        <span className="sheen" />
        <span className="gal-crest"><span className="gal-crest-sheen" /></span>
        <span className="gal-engine">Layoff Audit<span className="sub"> Prediction Engine · v4.2</span></span>
        <span className="gal-divider" />
        <div className="gal-phases">
          {PHASES.map((ph, i) => (
            <div key={ph} className={`gal-phase${i < activePhase ? ' done' : i === activePhase ? ' active' : ''}`}>
              <span className="pdot" />{ph}
            </div>
          ))}
        </div>
      </div>

      {/* Signal ticker */}
      <div className="gal-ticker" aria-hidden="true">
        <div className="tlead"><span className="tldot" />Layoff Forecasts</div>
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

      {/* ── Corner HUDs (absolute within gal-root) ── */}
      <div className="gal-hud tl" aria-hidden="true"><span className="tick"/><span>LAYOFF AUDIT · NODE ATL-07</span></div>
      <div className="gal-hud tr" aria-hidden="true"><span>PREDICTION · TIER-3</span><span className="tick"/></div>
      <div className="gal-hud bl" aria-hidden="true"><span className="tick"/><span>LIVE FORECAST · GLOBAL</span></div>
      <div className="gal-hud br" aria-hidden="true"><span className="v">{clock}</span><span className="tick"/></div>

      {/* ── 3-column body ── */}
      <div className="gal-body">

        {/* LEFT COLUMN — signal rail + spectrum */}
        <div className="gal-left-col" aria-hidden="true">
          <div className="gal-sector-rail">
            <div className="gal-rhead">
              <span>Company Signals</span>
              <span className="gal-live"><span className="pulse" />Live</span>
            </div>
            {SECTORS.map((s, i) => {
              const pct = Math.round((sectorVals[i] ?? 0) * 100);
              return (
                <div key={s.id} className={`gal-srow${s.warn ? ' warn' : ''}`}>
                  <span className="si">{s.id}</span>
                  <span className="sn">{s.name}</span>
                  <span className="sv">{pct}%</span>
                  <span className="sbar"><i style={{ width: `${pct}%` }} /></span>
                </div>
              );
            })}
          </div>
          <div className="gal-spectrum">
            <span className="gal-spectrum-label">Signal Stream</span>
            <canvas ref={specRef} style={{ width:'100%', height:'100%', display:'block' }} />
          </div>
        </div>

        {/* CENTER COLUMN — globe composition + status panel */}
        <div className="gal-center-col">
          <div className="gal-composition">
        <div className="gal-halo" aria-hidden="true" />

        {/* Orbital rings SVG */}
        <div className="gal-orbits" aria-hidden="true">
          <svg viewBox="-100 -100 200 200">
            <defs>
              <linearGradient id="galOrb1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgba(111,216,255,0)"/>
                <stop offset="50%"  stopColor="rgba(111,216,255,0.85)"/>
                <stop offset="100%" stopColor="rgba(111,216,255,0)"/>
              </linearGradient>
              <linearGradient id="galOrb2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgba(155,123,255,0)"/>
                <stop offset="50%"  stopColor="rgba(155,123,255,0.7)"/>
                <stop offset="100%" stopColor="rgba(155,123,255,0)"/>
              </linearGradient>
            </defs>
            <g className="gal-orbit gal-o1" transform="rotate(-12)">
              <ellipse cx="0" cy="0" rx="44" ry="11" fill="none" stroke="url(#galOrb1)" strokeWidth="0.45"/>
              <circle cx="44" cy="0" r="1.6" fill="rgba(111,216,255,1)"/>
            </g>
            <g className="gal-orbit gal-o2" transform="rotate(38)">
              <ellipse cx="0" cy="0" rx="48" ry="16" fill="none" stroke="url(#galOrb2)" strokeWidth="0.4"/>
              <circle cx="-48" cy="0" r="1.3" fill="rgba(155,123,255,.95)"/>
            </g>
            <g className="gal-orbit gal-o3" transform="rotate(75)">
              <ellipse cx="0" cy="0" rx="52" ry="40" fill="none" stroke="rgba(111,216,255,.18)" strokeWidth="0.3" strokeDasharray="0.6 3"/>
              <circle cx="52" cy="0" r="1" fill="rgba(111,216,255,.85)"/>
            </g>
            <g className="gal-orbit gal-o4" transform="rotate(8)">
              <ellipse cx="0" cy="0" rx="40" ry="6" fill="none" stroke="rgba(79,224,192,.45)" strokeWidth="0.35"/>
              <circle cx="40" cy="0" r="1.1" fill="rgba(79,224,192,1)"/>
            </g>
            <circle cx="0" cy="0" r="58" fill="none" stroke="rgba(111,216,255,.10)" strokeWidth="0.25" strokeDasharray="0.4 2"/>
          </svg>
        </div>

        {/* Earth globe canvas */}
        <canvas className="gal-globe-canvas"   ref={globeRef}   aria-hidden="true" />
        {/* Radar / arcs / hubs / reticle overlay */}
        <canvas className="gal-overlay-canvas" ref={overlayRef} aria-hidden="true" />

        {/* Scan ring */}
        <svg className="gal-scan-ring" viewBox="-100 -100 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="galScanGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#6fd8ff"/>
              <stop offset="55%"  stopColor="#9b7bff"/>
              <stop offset="100%" stopColor="#7af7c0"/>
            </linearGradient>
            <filter id="galScanGlow"><feGaussianBlur stdDeviation="1.2"/></filter>
          </defs>
          <circle cx="0" cy="0" r="61" fill="none" stroke="rgba(111,216,255,.10)" strokeWidth="0.5" strokeDasharray="0.4 2"/>
          <g className="gal-scan-ring-spin">
            <circle cx="0" cy="0" r="61" fill="none" stroke="url(#galScanGrad)" strokeWidth="0.9"
              strokeLinecap="round" filter="url(#galScanGlow)" pathLength="100" strokeDasharray="22 100" strokeDashoffset="0"/>
            <circle cx="0" cy="-61" r="1.5" fill="#7af7c0" filter="url(#galScanGlow)"/>
          </g>
        </svg>

        {/* Telemetry leader lines + floating cards */}
        <svg className="gal-leaders" ref={leadersRef}
          viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" />
        <div className="gal-telemetry" ref={telRef} aria-hidden="true" />
          </div>{/* end gal-composition */}

          {/* Status panel — directly below globe */}
          <div className="gal-panel">
            <div className="gal-panel-row">
              <span className="gal-dot" aria-hidden="true" />
              <span className="gal-label">{labelText}</span>
            </div>
            <div className="gal-status-text" aria-live="polite">
              {limitedDataMode ? (limitedDataReason ?? 'Running with limited data…') : statusText}
            </div>
            <div className="gal-bar" aria-hidden="true" />
            <div className="gal-meta" aria-hidden="true">
              <span>{companies.toLocaleString()} companies</span>
              <span>{(signals / 1e6).toFixed(2)}M signals</span>
              <span>{regions} / 7 regions</span>
            </div>
          </div>
        </div>{/* end gal-center-col */}

        {/* RIGHT COLUMN — gauge cluster */}
        <div className="gal-right-col" aria-hidden="true">
          <div className="gal-gauges">
            {[
              { id:'galG1', off:g1off, val:`${Math.round(g1*100)}%`, label:'Index 01', name:'Prediction Confidence', sub:'Bayesian · 12.4k features', c1:'#6fd8ff', c2:'#7af7c0' },
              { id:'galG2', off:g2off, val:(g2*10).toFixed(1),       label:'Index 02', name:'Layoff Risk Index',      sub:'7-day rolling · normalized', c1:'#ffb547', c2:'#ff6680' },
              { id:'galG3', off:g3off, val:`${Math.round(g3*100)}%`, label:'Index 03', name:'Forecast Signal',        sub:'SNR · multi-source fusion',  c1:'#9b7bff', c2:'#6fd8ff' },
            ].map(g => (
              <div className="gal-gauge" key={g.id}>
                <div className="gal-ring">
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
                  <div className="gal-gval">{g.val}</div>
                </div>
                <div>
                  <div className="gal-glabel">{g.label}</div>
                  <div className="gal-gname">{g.name}</div>
                  <div className="gal-gsub">{g.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>{/* end gal-right-col */}

      </div>{/* end gal-body */}
    </div>
  );
};

export default GlobeAuditLoader;
