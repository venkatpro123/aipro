// observabilityConfig.ts — WS14
//
// Validates the runtime OTLP endpoint against the production CSP
// `connect-src` allowlist at boot. Without this gate, a misconfigured
// `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` env var produces a silent failure:
// the browser blocks the request with a CSP violation, the OTLP
// exporter sees a network error, the dead-letter queue fills, and the
// telemetry signal goes black with no obvious symptom in the SPA.
//
// The fix is structurally simple: parse the env var, compare its host
// to the CSP allowlist, log a structured warning in production (or
// throw in dev so the developer sees it immediately).
//
// Why this matters at the v35.1 scale: if a future operator points
// telemetry at a new vendor without also updating vercel.json's CSP,
// they will not realise the move silently lost their telemetry for
// hours/days. This file is the canary.

import { envVar } from './env';
import { createLogger } from '../shared/logger';

const log = createLogger({ service: 'observability-config' });

/**
 * The set of hosts authorised by the production CSP `connect-src`
 * directive (see artifacts/humanproof/vercel.json). Keep this list in
 * sync with the CSP; the lint rule on vercel.json catches manual drift.
 *
 * Patterns:
 *   - leading `*.` matches any subdomain (axiom.co, eu.axiom.co, etc).
 *   - exact host matches exact-only.
 */
const CSP_CONNECT_SRC_HOSTS = [
  '*.supabase.co',
  '*.axiom.co',
  '*.honeycomb.io',
  '*.datadoghq.com',
  'openrouter.ai',
  'google.serper.dev',
  'api.deepseek.com',  // dev fallback in aiProxy.ts (VITE_DEEPSEEK_API_KEY)
  'api.groq.com',      // dev fallback in aiProxy.ts (VITE_GROQ_API_KEY)
];

function matchesAllowlist(host: string): boolean {
  for (const pattern of CSP_CONNECT_SRC_HOSTS) {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2); // '*.axiom.co' → 'axiom.co'
      if (host === suffix || host.endsWith('.' + suffix)) return true;
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}

export interface ObservabilityValidationResult {
  ok: boolean;
  endpoint: string | null;
  /** The parsed host, or null if the endpoint is unset. */
  host: string | null;
  /** False ONLY when an endpoint IS set but its host fails the allowlist. */
  permittedByCsp: boolean;
  /** Human-readable diagnostic. */
  reason: string;
}

/**
 * Validates the runtime OTLP endpoint against the CSP allowlist.
 *
 * Behaviour matrix:
 *   - endpoint unset → ok=true, permittedByCsp=true ("no telemetry, no CSP problem")
 *   - endpoint set + host allowed → ok=true, permittedByCsp=true
 *   - endpoint set + host blocked → ok=false, permittedByCsp=false
 *     → in dev: this function THROWS so the developer sees it immediately
 *     → in prod: returns the result; caller decides (we log a warning)
 *   - endpoint malformed (not a valid URL) → ok=false, permittedByCsp=false
 *
 * Call once during app bootstrap, alongside primeFlags() and
 * installOtlpSinkIfConfigured(). The intent is fail-fast in development.
 */
export function validateObservabilityConfig(opts: { throwInDev?: boolean } = {}): ObservabilityValidationResult {
  const endpoint = envVar('VITE_OTEL_EXPORTER_OTLP_ENDPOINT') ?? null;
  if (!endpoint) {
    return { ok: true, endpoint: null, host: null, permittedByCsp: true, reason: 'no_endpoint_configured' };
  }

  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    const result: ObservabilityValidationResult = {
      ok: false,
      endpoint,
      host: null,
      permittedByCsp: false,
      reason: 'malformed_url',
    };
    handleFailure(result, opts.throwInDev ?? true);
    return result;
  }

  const host = parsed.host;
  const allowed = matchesAllowlist(host);
  const result: ObservabilityValidationResult = {
    ok: allowed,
    endpoint,
    host,
    permittedByCsp: allowed,
    reason: allowed ? 'allowed' : 'host_not_in_csp_connect_src',
  };
  if (!allowed) handleFailure(result, opts.throwInDev ?? true);
  return result;
}

function handleFailure(result: ObservabilityValidationResult, throwInDev: boolean): void {
  const env = envVar('VITE_ENVIRONMENT');
  const message =
    `OTLP endpoint "${result.endpoint}" host="${result.host}" is NOT in the production CSP connect-src ` +
    `allowlist. The browser will block the request with a CSP violation and telemetry will silently fail. ` +
    `Either update artifacts/humanproof/vercel.json's connect-src directive OR change the endpoint to an ` +
    `allowed host (${CSP_CONNECT_SRC_HOSTS.join(', ')}).`;

  if (env === 'development' && throwInDev) {
    throw new Error(`[observability-config] ${message}`);
  }
  log.warn('csp_block_likely', {
    endpoint: result.endpoint,
    host: result.host,
    reason: result.reason,
    allowlist: CSP_CONNECT_SRC_HOSTS,
    message,
  });
}

/**
 * Test seam: override the allowlist for a single test run.
 */
export function __setAllowlistForTesting(list: string[]): () => void {
  const prev = CSP_CONNECT_SRC_HOSTS.slice();
  CSP_CONNECT_SRC_HOSTS.length = 0;
  CSP_CONNECT_SRC_HOSTS.push(...list);
  return () => {
    CSP_CONNECT_SRC_HOSTS.length = 0;
    CSP_CONNECT_SRC_HOSTS.push(...prev);
  };
}
