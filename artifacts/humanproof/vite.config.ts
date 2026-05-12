import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// CON FIX: Use sensible defaults instead of throwing errors for missing env vars
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Intelligence data — 371 role profiles, 842KB raw / 187KB gzip.
          // Splitting into its own chunk achieves three things:
          //   1. Cache-stable: hash only changes when role data changes, not on every deploy
          //   2. Absent from main chunk on landing page (AuditTerminalPage is now lazy)
          //   3. Loads in parallel with the app shell once the audit route is requested
          if (id.includes('/data/intelligence/') || id.includes('/data/oracleRoleIndex')) {
            return 'career-intelligence';
          }
          // Vendor libs — framer-motion is split for lazy-load savings;
          // everything else stays in one vendor chunk to avoid the circular
          // vendor <-> vendor-react initialization order crash
          // (React.forwardRef undefined on Radix/router init).
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-motion';
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
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Proxy API calls to the backend server during development
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
