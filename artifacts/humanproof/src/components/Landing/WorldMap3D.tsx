import { useEffect, useRef, useState } from "react";

/**
 * WorldMap3D — real world map with accurate country boundaries (d3-geo +
 * topojson countries-110m), rendered as SVG paths with a cyberpunk colour
 * treatment and a 3D perspective tilt. Animated monitoring pings are placed
 * at real geo-coordinates of major cities and projected onto the map.
 */

const VB_W = 900;
const VB_H = 460;

// Major monitoring hubs: [lon, lat, color, delayMs]
const HUBS: [number, number, string, number][] = [
  [-122.4, 37.8, "#00d4ff", 0],     // San Francisco
  [-74.0, 40.7, "#00d4ff", 500],    // New York
  [-99.1, 19.4, "#8b5cf6", 900],    // Mexico City
  [-46.6, -23.5, "#8b5cf6", 1300],  // São Paulo
  [-0.1, 51.5, "#00d4ff", 400],     // London
  [2.35, 48.85, "#38bdf8", 1700],   // Paris
  [13.4, 52.5, 'var(--color-emerald-text)', 1100],    // Berlin
  [55.3, 25.2, 'var(--color-amber500-text)', 700],     // Dubai
  [72.8, 19.0, "#00d4ff", 1500],    // Mumbai
  [103.8, 1.35, 'var(--color-emerald-text)', 300],    // Singapore
  [116.4, 39.9, 'var(--color-red-text)', 2000],   // Beijing
  [139.7, 35.7, 'var(--color-emerald-text)', 1900],   // Tokyo
  [151.2, -33.9, "#00d4ff", 800],   // Sydney
  [28.0, -26.2, 'var(--color-amber500-text)', 2200],   // Johannesburg
];

// Connection arcs between hub indices
const ARCS: [number, number][] = [
  [0, 1], [1, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 11], [11, 12], [4, 10],
];

interface Projected { x: number; y: number; }

export function WorldMap3D() {
  const [paths, setPaths] = useState<string[]>([]);
  const [graticule, setGraticule] = useState<string>("");
  const [hubPts, setHubPts] = useState<Projected[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const [{ geoNaturalEarth1, geoPath, geoGraticule10 }, { feature }] = await Promise.all([
        import("d3-geo"),
        import("topojson-client"),
      ]);

      let topo: any;
      try {
        const res = await fetch("/countries-110m.json");
        topo = await res.json();
      } catch {
        return; // leave abstract fallback if fetch fails
      }
      if (!mounted.current) return;

      const fc = feature(topo, topo.objects.countries) as any;

      const projection = geoNaturalEarth1()
        .fitExtent([[12, 12], [VB_W - 12, VB_H - 12]], fc);

      const pathGen = geoPath(projection);

      const countryPaths: string[] = fc.features
        .map((f: any) => pathGen(f))
        .filter((d: string | null): d is string => !!d);

      const grat = pathGen(geoGraticule10()) ?? "";

      const projHubs: Projected[] = HUBS.map(([lon, lat]) => {
        const p = projection([lon, lat]);
        return p ? { x: p[0], y: p[1] } : { x: -100, y: -100 };
      });

      setPaths(countryPaths);
      setGraticule(grat);
      setHubPts(projHubs);
    })();
    return () => { mounted.current = false; };
  }, []);

  return (
    <div className="hp-map3d-wrap">
      <div className="hp-map3d-inner">
        {/* HUD corners */}
        <span className="hp-map3d-corner tl" />
        <span className="hp-map3d-corner tr" />
        <span className="hp-map3d-corner bl" />
        <span className="hp-map3d-corner br" />
        {/* Scanline sweep */}
        <span className="hp-map3d-scan" />

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="hp-map3d-svg"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="hpMapCountry" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--hp-map-c1, rgba(0,212,255,0.18))" />
              <stop offset="100%" stopColor="var(--hp-map-c2, rgba(0,150,200,0.07))" />
            </linearGradient>
            <radialGradient id="hpMapGlow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="rgba(0,212,255,0.06)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="hpMapPing" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ambient glow */}
          <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#hpMapGlow)" />

          {/* graticule grid */}
          {graticule && (
            <path className="hp-map3d-grat" d={graticule} fill="none" stroke="rgba(0,212,255,0.05)" strokeWidth="0.5" />
          )}

          {/* real country boundaries */}
          <g className="hp-map3d-countries">
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="url(#hpMapCountry)"
                stroke="rgba(0,212,255,0.32)"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* connection arcs */}
          {hubPts.length > 0 && ARCS.map(([a, b], i) => {
            const p1 = hubPts[a], p2 = hubPts[b];
            if (!p1 || !p2) return null;
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 - Math.abs(p1.x - p2.x) * 0.16;
            return (
              <path
                key={`arc-${i}`}
                d={`M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`}
                fill="none"
                stroke="rgba(0,212,255,0.16)"
                strokeWidth="1"
                strokeDasharray="5 5"
              />
            );
          })}

          {/* monitoring pings */}
          {hubPts.map((p, i) => {
            const color = HUBS[i][2];
            const delay = HUBS[i][3];
            return (
              <g key={`hub-${i}`} filter="url(#hpMapPing)">
                <circle
                  cx={p.x} cy={p.y} r="6"
                  fill="none" stroke={color} strokeWidth="1" opacity="0.5"
                  className="hp-map3d-ring"
                  style={{ animationDelay: `${delay}ms` }}
                />
                <circle
                  cx={p.x} cy={p.y} r="2.6"
                  fill={color}
                  className="hp-map3d-dot"
                  style={{ animationDelay: `${delay}ms` }}
                />
              </g>
            );
          })}

          <text
            x={VB_W / 2} y={VB_H - 10} textAnchor="middle"
            fontSize="9" fill="var(--alpha-text-25)"
            fontFamily="'JetBrains Mono', monospace" letterSpacing="0.12em"
          >
            LIVE INTELLIGENCE MONITORING · 28+ COUNTRIES
          </text>
        </svg>

        {/* HUD status bar */}
        <div className="hp-map3d-hud">
          <span className="hp-map3d-hud-item"><span className="hp-map3d-live" />Live monitoring</span>
          <span className="hp-map3d-hud-item">{HUBS.length} active signal hubs</span>
          <span className="hp-map3d-hud-item">Real-time data</span>
        </div>
      </div>
    </div>
  );
}
