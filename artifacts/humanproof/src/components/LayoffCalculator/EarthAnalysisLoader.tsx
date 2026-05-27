// EarthAnalysisLoader.tsx — v3.0 Ultra-Realistic Rotating Earth
//
// Visual architecture (back → front):
//   1. Deep-space shell with star field
//   2. Atmosphere outer glow (blurred ring)
//   3. Ocean base (radial gradient sphere)
//   4. Scrolling panorama group (clipped to sphere):
//        a. Ocean depth texture
//        b. Latitude/longitude grid
//        c. Continent fills + soft glow
//        d. City lights (warm dots)
//   5. Polar ice caps (static — don't rotate)
//   6. Cloud layer (separate, slower rotation)
//   7. Terminator gradient (day/night boundary, static)
//   8. Specular highlight (top-left)
//   9. Atmospheric rim
//  10. Orbit rings + satellite dots
//  11. Canvas particle signal network
//  12. Stage UI (company name, stage text, pipeline, factoids)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  stage: number;
  companyName?: string;
  limitedDataMode?: boolean;
  limitedDataReason?: string;
}

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGE_META = [
  { icon: '⚡', text: 'Resolving company identity…',      short: 'Identity',   sub: 'Entity resolution · exchange lookup · alias matching' },
  { icon: '📡', text: 'Fetching live financial signals…', short: 'Financials', sub: 'Yahoo Finance · SEC filings · Finnhub API' },
  { icon: '🔍', text: 'Scanning job market activity…',    short: 'Jobs',       sub: 'Adzuna · LinkedIn · Naukri · hiring velocity' },
  { icon: '📋', text: 'Checking regulatory filings…',     short: 'Filings',    sub: 'WARN Act · SEC EDGAR · public disclosures' },
  { icon: '🧠', text: 'Running 59-layer intelligence…',   short: 'AI Engine',  sub: '200+ peer companies · Bayesian survival model' },
  { icon: '✓',  text: 'Finalizing confidence model…',     short: 'Complete',   sub: 'Bayesian calibration · confidence intervals' },
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
  'Running Bayesian survival model…',
  'Computing competitive position gaps…',
];

// ── Star field positions (static, pre-computed for consistency) ───────────────

const STARS: Array<{ x: number; y: number; r: number; o: number }> = [
  { x:5,  y:8,  r:0.9, o:0.7 }, { x:14, y:22, r:0.7, o:0.5 }, { x:22, y:5,  r:1.0, o:0.8 },
  { x:35, y:15, r:0.6, o:0.4 }, { x:48, y:3,  r:0.8, o:0.6 }, { x:58, y:19, r:0.7, o:0.5 },
  { x:68, y:8,  r:0.9, o:0.7 }, { x:75, y:25, r:0.6, o:0.4 }, { x:82, y:12, r:1.0, o:0.8 },
  { x:88, y:30, r:0.7, o:0.5 }, { x:93, y:5,  r:0.8, o:0.65}, { x:3,  y:42, r:0.6, o:0.4 },
  { x:8,  y:55, r:1.0, o:0.75}, { x:18, y:48, r:0.7, o:0.5 }, { x:28, y:62, r:0.8, o:0.6 },
  { x:92, y:48, r:0.9, o:0.7 }, { x:97, y:60, r:0.7, o:0.5 }, { x:6,  y:75, r:0.6, o:0.4 },
  { x:15, y:82, r:1.0, o:0.8 }, { x:25, y:90, r:0.8, o:0.6 }, { x:90, y:75, r:0.7, o:0.55},
  { x:96, y:85, r:0.9, o:0.7 }, { x:4,  y:92, r:0.6, o:0.4 }, { x:78, y:90, r:1.0, o:0.75},
  { x:70, y:82, r:0.7, o:0.5 }, { x:62, y:95, r:0.8, o:0.6 }, { x:52, y:88, r:0.6, o:0.45},
  { x:42, y:96, r:0.9, o:0.7 }, { x:32, y:89, r:0.7, o:0.5 }, { x:85, y:2,  r:0.8, o:0.6 },
];

// ── City light positions [panorama x (0-280), y, radius] ─────────────────────
// x = (lon + 180) * 280/360, y = (90 - lat) * 280/180

const CITY_LIGHTS: Array<{ x: number; y: number; r: number }> = [
  // Americas
  { x: 82,  y: 76,  r: 1.8 }, // New York
  { x: 78,  y: 89,  r: 1.6 }, // Los Angeles
  { x: 72,  y: 76,  r: 1.4 }, // Chicago
  { x: 64,  y: 82,  r: 1.3 }, // Dallas
  { x: 69,  y: 109, r: 1.5 }, // Mexico City
  { x: 106, y: 175, r: 1.6 }, // São Paulo
  { x: 100, y: 177, r: 1.4 }, // Rio
  { x: 93,  y: 197, r: 1.3 }, // Buenos Aires
  // Europe
  { x: 140, y: 60,  r: 2.0 }, // London
  { x: 142, y: 64,  r: 1.8 }, // Paris
  { x: 150, y: 60,  r: 1.7 }, // Berlin
  { x: 168, y: 52,  r: 1.8 }, // Moscow
  { x: 153, y: 74,  r: 1.5 }, // Milan
  { x: 163, y: 73,  r: 1.4 }, // Istanbul
  { x: 157, y: 70,  r: 1.3 }, // Vienna
  // Africa & Middle East
  { x: 165, y: 93,  r: 1.6 }, // Cairo
  { x: 170, y: 87,  r: 1.5 }, // Riyadh
  { x: 172, y: 95,  r: 1.4 }, // Dubai
  { x: 143, y: 130, r: 1.5 }, // Lagos
  { x: 173, y: 114, r: 1.3 }, // Nairobi
  // Asia
  { x: 200, y: 96,  r: 1.8 }, // Delhi
  { x: 197, y: 110, r: 1.7 }, // Mumbai
  { x: 204, y: 116, r: 1.5 }, // Bangalore/Chennai
  { x: 222, y: 125, r: 1.6 }, // Bangkok
  { x: 222, y: 139, r: 1.7 }, // Singapore
  { x: 231, y: 88,  r: 1.5 }, // Shanghai
  { x: 231, y: 78,  r: 1.8 }, // Beijing
  { x: 250, y: 85,  r: 1.9 }, // Tokyo
  { x: 264, y: 87,  r: 1.5 }, // Seoul
  // Australia
  { x: 259, y: 194, r: 1.6 }, // Sydney
  { x: 247, y: 190, r: 1.4 }, // Melbourne
];

// ── Continent path data (scrolling panorama: 0–280 = first frame) ─────────────
// Coordinates: x=(lon+180)*280/360, y=(90-lat)*280/180
// All continents are rendered twice (second copy at x+280) for seamless loop.

// North America (clockwise from Alaska)
const PATH_NA = `M 12,50 C 17,36 26,24 44,18 C 60,12 76,16 88,30
  L 92,46 C 91,56 89,66 87,74 C 85,80 82,90 78,107
  L 70,116 C 62,117 55,118 48,115 C 42,110 38,102 36,92
  C 32,78 26,64 18,54 Z`;

// South America
const PATH_SA = `M 82,118 C 90,114 100,114 108,122
  C 114,130 115,148 112,165 L 108,180
  C 103,200 96,222 90,232
  C 84,226 79,215 76,200
  C 70,178 68,152 72,132 Z`;

// Europe (continental, excl UK)
const PATH_EU = `M 131,89 C 130,79 131,66 134,57
  C 138,48 148,39 158,32 L 167,28
  C 165,38 163,50 162,60 L 161,68
  C 157,76 155,84 154,89
  C 149,93 142,90 138,84 Z`;

// UK (separate island)
const PATH_UK = `M 131,60 L 135,52 L 139,54 L 138,64 L 133,66 Z`;
const PATH_IRELAND = `M 128,60 L 131,56 L 132,62 L 128,64 Z`;

// Scandinavia (approximate peninsula + Finland)
const PATH_SCANDI = `M 142,57 C 144,50 147,42 150,38
  C 155,32 162,27 168,27 L 166,36
  C 162,44 162,54 162,60 L 160,66
  C 156,62 150,58 145,57 Z`;

// Africa
const PATH_AF = `M 127,82 C 140,78 156,78 170,82
  L 173,93 C 177,108 180,120 179,136
  L 173,158 C 167,178 160,196 152,203
  C 142,198 134,190 127,183
  C 122,170 121,148 122,128 L 123,106 Z`;

// Madagascar
const PATH_MADAG = `M 171,164 C 174,160 176,165 175,176
  C 174,184 170,186 168,182 C 166,176 168,168 171,164 Z`;

// Eurasia (large mainland blob)
const PATH_EURASIA = `M 166,82 C 176,72 190,62 205,57
  C 222,51 244,46 264,49
  L 270,57 C 267,68 262,80 256,90
  L 246,104 C 236,118 226,132 217,130
  C 206,124 200,114 195,106
  C 188,98 180,90 173,84 Z`;

// India subcontinent
const PATH_INDIA = `M 194,104 C 203,100 210,107 209,120
  C 208,130 202,136 197,131
  C 190,125 187,114 194,104 Z`;

// Arabian Peninsula
const PATH_ARABIA = `M 174,90 C 182,88 192,90 194,100
  C 192,108 186,122 178,122
  C 173,118 172,108 174,90 Z`;

// Indochina + Malaysia
const PATH_INDOCHINA = `M 232,108 C 238,103 244,108 244,118
  C 243,128 236,134 230,134
  C 225,130 224,120 232,108 Z`;

// Australia
const PATH_AU = `M 228,173 C 240,157 254,158 258,168
  C 262,178 260,196 254,204
  C 244,210 232,208 225,202
  C 220,194 222,184 228,173 Z`;

// New Zealand (two blobs)
const PATH_NZ_N = `M 267,178 L 273,180 L 272,188 L 266,186 Z`;
const PATH_NZ_S = `M 268,190 L 273,192 L 271,200 L 266,197 Z`;

// Japan (simplified strip)
const PATH_JAPAN = `M 261,74 C 265,70 272,72 272,78
  C 271,86 266,92 260,90
  C 257,86 258,78 261,74 Z`;

// Greenland
const PATH_GREENLAND = `M 98,23 C 108,12 122,16 127,26
  C 127,38 118,46 108,46
  C 99,44 94,34 98,23 Z`;

// Antarctica (bottom band)
const PATH_ANTARCTICA = `M 0,246 L 280,246 L 280,280 L 0,280 Z`;

// Cloud shapes (static x positions, animated translate)
const CLOUD_SHAPES = [
  `M 20,70 C 22,66 28,65 32,68 C 36,65 44,64 46,68 C 50,66 56,67 56,71 C 54,75 48,76 44,74 C 40,77 34,77 30,75 C 26,77 20,76 20,72 Z`,
  `M 80,42 C 83,38 90,37 93,41 C 98,38 106,38 107,43 C 110,42 114,43 114,47 C 112,51 106,52 102,50 C 97,53 89,53 85,50 C 81,52 79,49 80,44 Z`,
  `M 165,35 C 168,31 175,30 178,34 C 183,31 191,31 192,36 C 195,34 199,36 199,40 C 197,44 191,45 187,43 C 182,46 174,46 170,43 C 166,45 164,42 165,37 Z`,
  `M 218,95 C 221,91 228,90 231,94 C 236,91 244,91 245,96 C 248,94 252,96 252,100 C 250,104 244,105 240,103 C 235,106 227,106 223,103 C 219,105 217,102 218,97 Z`,
  `M 60,155 C 63,151 70,150 73,154 C 78,151 86,151 87,156 C 90,154 94,156 94,160 C 92,164 86,165 82,163 C 77,166 69,166 65,163 C 61,165 59,162 60,157 Z`,
  `M 120,180 C 123,176 130,175 133,179 C 138,176 146,176 147,181 C 150,179 154,181 154,185 C 152,189 146,190 142,188 C 137,191 129,191 125,188 C 121,190 119,187 120,182 Z`,
  `M 241,150 C 244,146 251,145 254,149 C 259,146 267,146 268,151 C 271,149 275,151 275,155 C 273,159 267,160 263,158 C 258,161 250,161 246,158 C 242,160 240,157 241,152 Z`,
];

// ── Globe SVG ─────────────────────────────────────────────────────────────────

interface ContinentGroupProps { offset: number }

const ContinentGroup: React.FC<ContinentGroupProps> = ({ offset }) => (
  <g transform={`translate(${offset}, 0)`}>
    {/* Ocean depth variation (subtle, inside sphere area) */}
    <rect x={0} y={120} width={280} height={40} fill="rgba(0,30,60,0.06)" />

    {/* Grid lines */}
    <g opacity={0.18} stroke="rgba(100,200,220,0.5)" strokeWidth={0.5} fill="none">
      {/* Latitude lines */}
      {[28, 56, 84, 112, 140, 168, 196, 224, 252].map(y => (
        <line key={y} x1={0} y1={y} x2={280} y2={y} />
      ))}
      {/* Longitude lines */}
      {[0, 35, 70, 105, 140, 175, 210, 245, 280].map(x => (
        <line key={x} x1={x} y1={0} x2={x} y2={280} />
      ))}
    </g>

    {/* Continents */}
    <g filter="url(#eal-land-glow)" opacity={0.92}>
      <path d={PATH_NA}          fill="url(#eal-land)" />
      <path d={PATH_SA}          fill="url(#eal-land)" />
      <path d={PATH_EU}          fill="url(#eal-land)" />
      <path d={PATH_UK}          fill="url(#eal-land)" />
      <path d={PATH_IRELAND}     fill="url(#eal-land)" />
      <path d={PATH_SCANDI}      fill="url(#eal-land)" />
      <path d={PATH_AF}          fill="url(#eal-land)" />
      <path d={PATH_MADAG}       fill="url(#eal-land)" opacity={0.85} />
      <path d={PATH_EURASIA}     fill="url(#eal-land)" />
      <path d={PATH_INDIA}       fill="url(#eal-land)" />
      <path d={PATH_ARABIA}      fill="url(#eal-land)" opacity={0.88} />
      <path d={PATH_INDOCHINA}   fill="url(#eal-land)" opacity={0.85} />
      <path d={PATH_AU}          fill="url(#eal-land)" />
      <path d={PATH_NZ_N}        fill="url(#eal-land)" opacity={0.75} />
      <path d={PATH_NZ_S}        fill="url(#eal-land)" opacity={0.75} />
      <path d={PATH_JAPAN}       fill="url(#eal-land)" opacity={0.80} />
      <path d={PATH_GREENLAND}   fill="url(#eal-ice)"  />
      <path d={PATH_ANTARCTICA}  fill="url(#eal-ice)"  />
    </g>

    {/* City lights (warm pinpoints) */}
    <g opacity={0.90}>
      {CITY_LIGHTS.map((c, i) => (
        <circle
          key={i}
          cx={c.x} cy={c.y} r={c.r}
          fill="rgba(255,225,100,0.95)"
          filter="url(#eal-city-glow)"
        />
      ))}
    </g>
  </g>
);

const GlobeSVG: React.FC = () => (
  <svg
    viewBox="0 0 280 280"
    className="earth-globe-svg"
    aria-hidden="true"
    role="img"
    aria-label="Rotating Earth globe — AI intelligence analysis in progress"
    style={{ overflow: 'visible' }}
  >
    <defs>
      {/* Ocean gradient */}
      <radialGradient id="eal-ocean" cx="38%" cy="34%" r="66%">
        <stop offset="0%"   stopColor="#0d2d50" />
        <stop offset="30%"  stopColor="#091e38" />
        <stop offset="65%"  stopColor="#051428" />
        <stop offset="88%"  stopColor="#030d1c" />
        <stop offset="100%" stopColor="#020810" />
      </radialGradient>

      {/* Land fill gradient */}
      <linearGradient id="eal-land" x1="0%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%"   stopColor="rgba(28,95,70,0.90)" />
        <stop offset="50%"  stopColor="rgba(22,78,55,0.85)" />
        <stop offset="100%" stopColor="rgba(16,62,42,0.80)" />
      </linearGradient>

      {/* Ice / snow fill */}
      <radialGradient id="eal-ice" cx="50%" cy="40%" r="60%">
        <stop offset="0%"   stopColor="rgba(220,238,255,0.95)" />
        <stop offset="100%" stopColor="rgba(190,220,245,0.80)" />
      </radialGradient>

      {/* Cloud fill */}
      <linearGradient id="eal-cloud" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
        <stop offset="100%" stopColor="rgba(235,245,255,0.35)" />
      </linearGradient>

      {/* Atmosphere overlay — blue rim light */}
      <radialGradient id="eal-atmos" cx="50%" cy="50%" r="50%">
        <stop offset="68%"  stopColor="transparent" />
        <stop offset="82%"  stopColor="rgba(30,140,230,0.06)" />
        <stop offset="90%"  stopColor="rgba(20,160,240,0.14)" />
        <stop offset="96%"  stopColor="rgba(10,180,250,0.28)" />
        <stop offset="100%" stopColor="rgba(0,200,255,0.42)" />
      </radialGradient>

      {/* Specular highlight */}
      <radialGradient id="eal-spec" cx="32%" cy="26%" r="42%">
        <stop offset="0%"   stopColor="rgba(255,255,255,0.12)" />
        <stop offset="60%"  stopColor="rgba(255,255,255,0.03)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>

      {/* Terminator gradient (day→night from left to right) */}
      <linearGradient id="eal-terminator" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="rgba(0,0,0,0.0)" />
        <stop offset="55%"  stopColor="rgba(0,0,0,0.0)" />
        <stop offset="72%"  stopColor="rgba(0,0,10,0.15)" />
        <stop offset="85%"  stopColor="rgba(0,0,15,0.40)" />
        <stop offset="100%" stopColor="rgba(0,0,20,0.60)" />
      </linearGradient>

      {/* Soft land glow filter */}
      <filter id="eal-land-glow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
        <feFlood floodColor="rgba(30,100,60,0.25)" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* City light glow */}
      <filter id="eal-city-glow" x="-200%" y="-200%" width="500%" height="500%">
        <feGaussianBlur stdDeviation="2.0" />
      </filter>

      {/* Atmosphere blur for outer rim */}
      <filter id="eal-atmos-blur" x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur stdDeviation="2.8" />
      </filter>

      {/* Sphere clip */}
      <clipPath id="eal-sphere-clip">
        <circle cx="140" cy="140" r="126" />
      </clipPath>
    </defs>

    {/* ── Stars (behind everything) ── */}
    <g opacity={1}>
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.x * 2.8} cy={s.y * 2.8}
          r={s.r}
          fill="white"
          opacity={s.o * 0.6}
        />
      ))}
    </g>

    {/* ── Outer atmosphere glow (blurred ring, behind sphere) ── */}
    <circle cx="140" cy="140" r="134"
      fill="none" stroke="rgba(0,160,255,0.35)" strokeWidth="8"
      filter="url(#eal-atmos-blur)"
    />

    {/* ── Ocean base ── */}
    <circle cx="140" cy="140" r="126" fill="url(#eal-ocean)" />

    {/* ── Scrolling continent panorama (clipped to sphere) ── */}
    <g clipPath="url(#eal-sphere-clip)">
      <g className="globe-panorama" style={{ willChange: 'transform' }}>
        <ContinentGroup offset={0} />
        <ContinentGroup offset={280} />
      </g>
    </g>

    {/* ── Polar ice caps (static, always at the poles) ── */}
    <g clipPath="url(#eal-sphere-clip)" opacity={0.88}>
      {/* North pole cap */}
      <ellipse cx="140" cy="20" rx="58" ry="22" fill="url(#eal-ice)" opacity={0.80} />
      {/* South pole cap */}
      <ellipse cx="140" cy="262" rx="68" ry="20" fill="url(#eal-ice)" opacity={0.85} />
    </g>

    {/* ── Cloud layer (separate, slower rotation) ── */}
    <g clipPath="url(#eal-sphere-clip)" opacity={0.55}>
      <g className="globe-clouds" style={{ willChange: 'transform' }}>
        {/* Two copies for seamless loop */}
        <g transform="translate(0,0)">
          {CLOUD_SHAPES.map((d, i) => (
            <path key={i} d={d} fill="url(#eal-cloud)" />
          ))}
        </g>
        <g transform="translate(280,0)">
          {CLOUD_SHAPES.map((d, i) => (
            <path key={i} d={d} fill="url(#eal-cloud)" />
          ))}
        </g>
      </g>
    </g>

    {/* ── Terminator (day/night gradient overlay) ── */}
    <circle cx="140" cy="140" r="126"
      fill="url(#eal-terminator)"
      clipPath="url(#eal-sphere-clip)"
    />

    {/* ── Specular highlight (top-left sunlight reflection) ── */}
    <circle cx="140" cy="140" r="126" fill="url(#eal-spec)" />

    {/* ── Atmospheric rim overlay ── */}
    <circle cx="140" cy="140" r="126" fill="url(#eal-atmos)" />

    {/* ── Thin limb darkening ring ── */}
    <circle
      cx="140" cy="140" r="124"
      fill="none"
      stroke="rgba(0,0,20,0.35)"
      strokeWidth="4"
      clipPath="url(#eal-sphere-clip)"
    />

    {/* ── Outer atmospheric scattering ring ── */}
    <circle
      cx="140" cy="140" r="130"
      fill="none"
      stroke="rgba(40,160,255,0.22)"
      strokeWidth="7"
      filter="url(#eal-atmos-blur)"
    />
  </svg>
);

// ── Orbit rings ───────────────────────────────────────────────────────────────

const OrbitRings: React.FC = () => (
  <div className="earth-orbit-wrap" aria-hidden="true">
    <div className="earth-orbit-ring earth-orbit-1">
      <div className="earth-orbit-satellite earth-orbit-sat-1" />
    </div>
    <div className="earth-orbit-ring earth-orbit-2">
      <div className="earth-orbit-satellite earth-orbit-sat-2" />
    </div>
    <div className="earth-orbit-ring earth-orbit-3" />
    <div className="earth-orbit-ring earth-orbit-4">
      <div className="earth-orbit-satellite earth-orbit-sat-4" />
    </div>
  </div>
);

// ── Canvas signal network ─────────────────────────────────────────────────────

interface SignalNode {
  x: number; y: number;
  vx: number; vy: number;
  phase: number; radius: number;
}

const NUM_NODES = 16;
const GLOBE_R   = 110;

function createNodes(w: number, h: number): SignalNode[] {
  const cx = w / 2;
  const cy = h / 2;
  const r  = (w / 280) * GLOBE_R;
  const nodes: SignalNode[] = [];
  for (let i = 0; i < NUM_NODES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * r * 0.82;
    nodes.push({
      x:      cx + Math.cos(angle) * dist,
      y:      cy + Math.sin(angle) * dist,
      vx:     (Math.random() - 0.5) * 0.28,
      vy:     (Math.random() - 0.5) * 0.28,
      phase:  Math.random() * Math.PI * 2,
      radius: 1.6 + Math.random() * 2.0,
    });
  }
  return nodes;
}

const GlobeCanvas: React.FC = () => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const nodesRef   = useRef<SignalNode[]>([]);
  const tRef       = useRef(0);
  const burstRef   = useRef<{ a: number; b: number; progress: number } | null>(null);
  const burstTimer = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = w / 280;
    const cx = w / 2;
    const cy = h / 2;
    const gR = scale * GLOBE_R;

    ctx.clearRect(0, 0, w, h);
    tRef.current += 0.016;
    const t = tRef.current;
    const nodes = nodesRef.current;

    // Move nodes inside globe sphere
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      const dx = n.x - cx;
      const dy = n.y - cy;
      if (Math.hypot(dx, dy) > gR * 0.86) {
        const angle = Math.atan2(dy, dx);
        n.vx = -Math.abs(n.vx) * Math.cos(angle) * 1.1;
        n.vy = -Math.abs(n.vy) * Math.sin(angle) * 1.1;
        const clamp = gR * 0.84;
        n.x = cx + Math.cos(angle) * clamp;
        n.y = cy + Math.sin(angle) * clamp;
      }
    }

    // Connection arcs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const maxDist = scale * 72;
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.28;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const perpX = midX + (b.y - a.y) * 0.20;
          const perpY = midY - (b.x - a.x) * 0.20;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(perpX, perpY, b.x, b.y);
          ctx.strokeStyle = `rgba(0,212,224,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.65 * scale;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      }
    }

    // Burst arc (animated data transmission)
    burstTimer.current++;
    if (burstTimer.current > 100 && !burstRef.current) {
      const a = Math.floor(Math.random() * nodes.length);
      let b = Math.floor(Math.random() * nodes.length);
      while (b === a) b = Math.floor(Math.random() * nodes.length);
      burstRef.current = { a, b, progress: 0 };
      burstTimer.current = 0;
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
        const perpX = midX + (endY - a.y) * 0.32;
        const perpY = midY - (endX - a.x) * 0.32;

        const grad = ctx.createLinearGradient(a.x, a.y, endX, endY);
        grad.addColorStop(0,   'rgba(0,212,224,0.0)');
        grad.addColorStop(0.3, 'rgba(0,212,224,0.5)');
        grad.addColorStop(1,   'rgba(0,240,255,0.95)');

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(perpX, perpY, endX, endY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6 * scale;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d4e0';
        ctx.stroke();
        ctx.shadowBlur = 0;

        burstRef.current.progress += 0.020;
        if (progress >= 1) burstRef.current = null;
      } else {
        burstRef.current = null;
      }
    }

    // Signal nodes (pulsing dots with glow)
    for (const n of nodes) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.6 + n.phase);
      const r     = n.radius * scale * pulse;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#00d4e0';
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,212,224,${(pulse * 0.82).toFixed(3)})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner bright core
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160,245,255,${(pulse * 0.9).toFixed(3)})`;
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

// ── Pipeline progress ─────────────────────────────────────────────────────────

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

      {/* Globe + orbit rings + canvas */}
      <motion.div
        className="earth-globe-wrap"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.60, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <GlobeSVG />
        <OrbitRings />
        <div className="earth-scan-sweep" aria-hidden="true" />
        <GlobeCanvas />
      </motion.div>

      {/* Stage headline */}
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

      {/* Pipeline */}
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
