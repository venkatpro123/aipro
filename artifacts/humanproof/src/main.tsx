import "./imports.css";
import "./index.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n";
import { registerServiceWorker } from "./services/pwaService";
import { preloadStaticData } from "./services/db/staticDataService";
// DEBT-5 — install the OTLP HTTP log sink. No-op when
// VITE_OTEL_EXPORTER_OTLP_ENDPOINT is absent, so this is safe in every
// environment. When the env is set, every structured log record from
// shared/logger.ts is batched + POSTed to the configured collector.
import { installOtlpSinkIfConfigured } from "./infrastructure/otlpExporter";
import { primeFlags } from "./config/featureFlags";
import { resolveTenantId } from "./config/tenantContext";
import { createLogger } from "./shared/logger";

// v21.0 — Sweep stale "feature unconfigured" degradation events from prior
// builds that incorrectly attributed opt-in features (WARN, proxy-macro) as
// runtime errors. Without this, the user sees "Company Intelligence DB error"
// banners until they clear their session storage.
import { pruneFeatureUnconfiguredEvents } from "./services/apiDegradationMonitor";
pruneFeatureUnconfiguredEvents();

// v21.0 — Startup env-var validation. Without these, the app silently degrades
// to heuristic-only scoring and the user has no idea why the OSINT signals
// (stock, news, hiring) are missing. Loud failure beats silent decay.
//
// v35.1.1 — switched from console.error to a hard-fail render: a missing
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY means every audit and every
// dashboard query will fail in ways the user reads as "the platform is
// broken." Showing a clear bootstrap error tells them (and ops) exactly
// what to fix instead of letting them stare at "NO DATA" for minutes.
const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

const findMissingRequiredEnv = (): string[] => {
  const env = (import.meta as any).env ?? {};
  return REQUIRED_ENV_VARS.filter((k) => !env[k] || String(env[k]).trim().length === 0);
};

const renderBootstrapError = (missing: string[]): void => {
  const root = document.getElementById('root');
  if (!root) return;
  // Plain-DOM render — must NOT depend on React or any service that itself
  // needs the missing env. The fallback in index.html will already have
  // shown a generic loading spinner; we replace it with a specific error.
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0a0a;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;">
      <div style="max-width:560px;background:#171717;border:1px solid #ef4444;border-radius:12px;padding:32px;">
        <div style="color:#ef4444;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Configuration error</div>
        <h1 style="font-size:20px;font-weight:600;margin:0 0 12px 0;">App cannot start</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 16px 0;">
          The following required environment variables are missing or empty:
        </p>
        <ul style="color:#fca5a5;font-family:ui-monospace,SFMono-Regular,monospace;font-size:13px;margin:0 0 16px 0;padding-left:20px;">
          ${missing.map((k) => `<li>${k}</li>`).join('')}
        </ul>
        <p style="color:rgba(255,255,255,0.55);font-size:13px;line-height:1.6;margin:0;">
          For Vercel deploys: set these under <code>Project Settings → Environment Variables</code> and trigger a redeploy.
          For local dev: copy <code>.env.example</code> to <code>.env.local</code> and fill in your Supabase project URL + anon key.
        </p>
      </div>
    </div>
  `;
};

const assertRequiredEnv = (): void => {
  const missing = findMissingRequiredEnv();
  if (missing.length === 0) return;
  // eslint-disable-next-line no-console
  console.error(
    `[main] Missing required env vars: ${missing.join(', ')}. ` +
    `OSINT, persistence, and edge-function calls will not work. Aborting boot.`,
  );
  renderBootstrapError(missing);
  // Throw so the rest of main.tsx (which calls into Supabase via primeFlags,
  // resolveTenantId, preloadStaticData) doesn't run and produce a cascade
  // of secondary errors that obscure the root cause.
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
};
assertRequiredEnv();

registerServiceWorker();

// ── Production-readiness bootstrap ────────────────────────────────────────
//
// Order matters:
//   1. OTLP sink BEFORE any logger.info() so the first structured logs
//      ship.
//   2. primeFlags() so the first audit doesn't pay the snapshot-fetch
//      cost AND the OTel SDK has flag state if it needs to sample
//      conditionally.
//   3. resolveTenantId() fire-and-forget so the tenant cache is warm
//      before the user opens the audit form.
installOtlpSinkIfConfigured();
const bootLog = createLogger({ service: 'app-bootstrap' });
bootLog.info('app.boot.start', {
  release: ((import.meta as { env?: { VITE_RELEASE_VERSION?: string } }).env?.VITE_RELEASE_VERSION) ?? 'unknown',
});
void primeFlags().catch((err) => bootLog.warn('app.boot.prime_flags_failed', { error: err }));
void resolveTenantId().catch(() => undefined);

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
