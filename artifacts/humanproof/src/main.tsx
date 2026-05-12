import "./imports.css";
import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n";
import { registerServiceWorker } from "./services/pwaService";
import { preloadStaticData } from "./services/db/staticDataService";

// v21.0 — Sweep stale "feature unconfigured" degradation events from prior
// builds that incorrectly attributed opt-in features (WARN, proxy-macro) as
// runtime errors. Without this, the user sees "Company Intelligence DB error"
// banners until they clear their session storage.
import { pruneFeatureUnconfiguredEvents } from "./services/apiDegradationMonitor";
pruneFeatureUnconfiguredEvents();

// v21.0 — Startup env-var validation. Without these, the app silently degrades
// to heuristic-only scoring and the user has no idea why the OSINT signals
// (stock, news, hiring) are missing. Loud failure beats silent decay.
const assertRequiredEnv = (): void => {
  const env = (import.meta as any).env ?? {};
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];
  const missing = required.filter((k) => !env[k] || String(env[k]).trim().length === 0);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `[main] Missing required env vars: ${missing.join(', ')}. ` +
      `OSINT and persistence will not work. Verify your .env or deployment config.`,
    );
  }
};
assertRequiredEnv();

registerServiceWorker();

// Fire-and-forget: loads companies, industries, roles from Supabase into the
// in-memory cache so all synchronous getters (getCompanySync etc.) work
// instantly. Falls back to bundled TypeScript arrays if Supabase is offline.
preloadStaticData().catch(() => { /* fallback already handled inside */ });

try {
  createRoot(document.getElementById("root")!).render(
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  );
} catch (err: any) {
  // Synchronous render failure — log clearly so it shows in Vercel build/runtime logs
  // and surfaces in the browser console. The 12-second hs-boot fallback in index.html
  // will show a refresh prompt to the user.
  console.error('[main] createRoot.render() failed:', err?.message ?? err);
}
