import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// CON FIX: Use sensible defaults instead of throwing errors for missing env vars
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

// v40.0: configure Vite via the function form so we get the `command` parameter
// ('build' for `vite build`, 'serve' for `vite dev`). This is more reliable than
// checking process.env.NODE_ENV because Vercel and other CI environments don't
// always set NODE_ENV before invoking the build.
export default defineConfig(({ command }) => {
  const isProduction = command === 'build';

  return {
  base: basePath,
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // v40.0: strip console.log/info/debug from production builds.
    // Preserves console.warn and console.error so genuine warnings/errors still
    // surface for users running with DevTools open (e.g., reporting bugs).
    minify: 'esbuild',
    target: 'es2020',
    // v40.0: never emit source maps to production — they leak source code and
    // increase deploy size. Enable explicitly via VITE_SOURCEMAP=1 when triaging.
    sourcemap: process.env.VITE_SOURCEMAP === '1',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Career intelligence corpus — 842KB raw / 187KB gzip.
          //
          // LAZY CHUNK: career-intelligence contains only the corpus data files
          // (corpusData.ts + the 12 industry modules). These are accessed
          // exclusively via dynamic import() from intelligence/index.ts, so
          // the chunk is NOT loaded until ensureCareerIntelligenceLoaded() is
          // called. The requestIdleCallback prefetch in main.tsx triggers the
          // load after 3s of idle — typically before the user reaches the form.
          //
          // intelligence/index.ts (lookup tables, resolver functions) and its
          // small utility siblings are statically imported and stay in the
          // audit-route bundle via default chunking. They are ~30KB combined.
          //
          // Why separate?  If index.ts were in the same chunk as corpusData.ts,
          // the entire 842KB spread would execute the moment the chunk loaded —
          // defeating the lazy initialization at the Rollup module-evaluation level.
          const CORPUS_DATA_BASENAMES = new Set([
            'corpusData', 'tech', 'finance', 'healthcare', 'industry', 'creative',
            'services_legal', 'services_hr', 'services', 'emerging',
            'services_gov', 'services_edu', 'services_retail',
          ]);
          if (id.includes('/data/intelligence/')) {
            const basename = id.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
            if (CORPUS_DATA_BASENAMES.has(basename)) {
              return 'career-intelligence';
            }
            // index.ts, types.ts, countryIntelligenceModifier.ts,
            // contentVariantEngine.ts — small statics, let Rollup bundle them
            // into the audit-route chunk via default heuristics.
            return undefined;
          }
          // oracleRoleIndex.ts — iterates MASTER_CAREER_INTELLIGENCE but is
          // imported by LaoffInputForm (lazy audit route). Default chunking
          // keeps it alongside the audit route code, not in the data chunk,
          // to avoid creating a static import chain into career-intelligence.
          // The stale-cache guard in oracleRoleIndex.ts rebuilds when corpus loads.
          // Vendor libs — framer-motion is split for lazy-load savings;
          // everything else stays in one vendor chunk to avoid the circular
          // vendor <-> vendor-react initialization order crash
          // (React.forwardRef undefined on Radix/router init).
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
            // Gesture + intersection libs are small but only needed on interactive pages
            if (id.includes('@use-gesture') || id.includes('react-intersection-observer')) return 'vendor-interaction';
            // Skeleton loader — tiny, separate for cache stability
            if (id.includes('react-loading-skeleton')) return 'vendor-ui';
            // Animation & virtualization libs — loaded on demand
            if (id.includes('@number-flow') || id.includes('number-flow')) return 'vendor-animation';
            if (id.includes('@tanstack/react-virtual')) return 'vendor-virtual';
            if (id.includes('@formkit/auto-animate')) return 'vendor-animation';
            return 'vendor';
          }
        },
      },
    },
  },
  // BUG-09 FIX: Inject build timestamp so DATA_LAST_UPDATED reflects real build date
  define: {
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  // v40.0: drop console.log/info/debug at build time via esbuild.
  // Uses vite's `command === 'build'` so the strip ALWAYS happens for production
  // builds regardless of whether NODE_ENV is explicitly set in the CI environment.
  // Keeps console.warn and console.error for production observability.
  esbuild: {
    drop: isProduction ? ['debugger'] : [],
    pure: isProduction
      ? ['console.log', 'console.info', 'console.debug', 'console.trace']
      : [],
  },
  server: {
    port,
    host: "0.0.0.0",
    // v40.0: explicit allowlist instead of `true`. Production traffic goes through
    // Vercel which already validates the Host header at the platform edge, so this
    // setting only affects local dev. The allowlist prevents DNS-rebinding-style
    // attacks against locally-running dev servers.
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.replit.dev',
      '.replit.app',
      '.vercel.app',
      '.humanshield.com',
      '.humanproof.com',
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.replit.dev',
      '.replit.app',
      '.vercel.app',
      '.humanshield.com',
      '.humanproof.com',
    ],
  },
  };
});
