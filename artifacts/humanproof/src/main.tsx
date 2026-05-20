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
  // v40.0 security FIX-6: build DOM with createElement + textContent instead
  // of innerHTML string concatenation. Although `missing` is currently derived
  // from the hardcoded REQUIRED_ENV_VARS list (safe), this pattern is hardened
  // for the future — if someone later adds user-derived values to the missing
  // list, the safe DOM construction prevents an XSS path from being introduced.
  while (root.firstChild) root.removeChild(root.firstChild);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0a0a;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;';

  const card = document.createElement('div');
  card.style.cssText = 'max-width:560px;background:#171717;border:1px solid #ef4444;border-radius:12px;padding:32px;';

  const tag = document.createElement('div');
  tag.style.cssText = 'color:#ef4444;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;';
  tag.textContent = 'Configuration error';

  const heading = document.createElement('h1');
  heading.style.cssText = 'font-size:20px;font-weight:600;margin:0 0 12px 0;';
  heading.textContent = 'App cannot start';

  const intro = document.createElement('p');
  intro.style.cssText = 'color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 16px 0;';
  intro.textContent = 'The following required environment variables are missing or empty:';

  const list = document.createElement('ul');
  list.style.cssText = 'color:#fca5a5;font-family:ui-monospace,SFMono-Regular,monospace;font-size:13px;margin:0 0 16px 0;padding-left:20px;';
  for (const k of missing) {
    const li = document.createElement('li');
    li.textContent = k; // textContent prevents any HTML injection from variable names
    list.appendChild(li);
  }

  const help = document.createElement('p');
  help.style.cssText = 'color:rgba(255,255,255,0.55);font-size:13px;line-height:1.6;margin:0;';
  help.textContent = 'For Vercel deploys: set these under Project Settings → Environment Variables and trigger a redeploy. For local dev: copy .env.example to .env.local and fill in your Supabase project URL + anon key.';

  card.appendChild(tag);
  card.appendChild(heading);
  card.appendChild(intro);
  card.appendChild(list);
  card.appendChild(help);
  wrapper.appendChild(card);
  root.appendChild(wrapper);
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

// v40.0: Core Web Vitals tracking — fires after page load, non-blocking.
// Uses Function constructor to avoid the TypeScript import() call restriction
// on unknown packages (web-vitals is an optional soft dep, not in tsconfig paths).
void import('./services/analyticsService').then(({ track }) => {
  // Dynamic require via globalThis.eval to stay TS-clean when web-vitals is absent.
  const tryVitals = new Function('track', `
    return import('web-vitals').then(function(v) {
      var m = { onCLS:'CLS', onFID:'FID', onLCP:'LCP', onTTFB:'TTFB', onINP:'INP' };
      Object.keys(m).forEach(function(fn) {
        if (typeof v[fn] === 'function') {
          v[fn](function(e) { track('web_vital', { metric: m[fn], value: Math.round(e.value) }); });
        }
      });
    }).catch(function() {});
  `);
  void (tryVitals as (t: typeof track) => Promise<void>)(track);
}).catch(() => { /* analytics service unavailable — non-fatal */ });

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
// Schedule the 842KB career-intelligence corpus for idle prefetch.
// Dynamic import — career-intelligence is NOT a static dependency of the main
// bundle. requestIdleCallback(timeout=3000ms) fires at most 3s after idle
// so the chunk is in browser cache before the user reaches the audit form.
// ensureCareerIntelligenceLoaded() in fetchAuditData() is a no-op if the
// prefetch completed first.
(() => {
  const schedule =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (cb: () => void) =>
          (window as Window & { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => void })
            .requestIdleCallback(cb, { timeout: 3000 })
      : (cb: () => void) => setTimeout(cb, 100);
  schedule(() => {
    void import('./data/intelligence/index').then(
      ({ ensureCareerIntelligenceLoaded }) => ensureCareerIntelligenceLoaded(),
    );
  });
})();

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
