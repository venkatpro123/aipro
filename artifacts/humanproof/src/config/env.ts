// env.ts — DEBT-6 fix (typed configuration with validation)
//
// Single source of truth for environment variables. Validates with Zod
// at module load — missing or malformed env fails BOOT, not at the first
// audit request.
//
// Used by:
//   * Browser bundle      → reads import.meta.env (Vite injection)
//   * Edge functions      → reads Deno.env (a separate sister file in
//                           supabase/functions/_shared/env.ts mirrors
//                           this contract)
//   * Tests               → reads vi.stubEnv-injected values
//
// Anti-pattern this replaces: scattered `import.meta.env.X as string`
// reads across 30+ services. Each one silently coerces undefined to
// the string 'undefined' if the var is missing, which then propagates
// as a runtime URL fetch failure dozens of layers deep.

import { z } from 'zod';

// ── Schema ──────────────────────────────────────────────────────────────────

/**
 * Every variable the browser bundle is allowed to read. New variables
 * MUST be added here; the schema is the gate. Optional defaults are
 * specified per-variable so missing-but-non-critical vars do not block
 * boot in development.
 */
const EnvSchema = z.object({
  // ── Supabase ────────────────────────────────────────────────────────────
  VITE_SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .describe('Supabase project URL. When absent the supabase client falls back to a placeholder and auth is disabled.'),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(40)
    .optional()
    .describe('Supabase anon key. When absent, supabase client uses a placeholder.'),

  // ── Telemetry ───────────────────────────────────────────────────────────
  VITE_OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .optional()
    .describe('OTLP HTTP endpoint for span export. When absent, logger writes to console only.'),
  VITE_OTEL_SAMPLE_RATE: z
    .coerce.number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Fraction of successful spans to export. Errors always export at 1.0.'),

  // ── Feature flag overrides (dev / staging only) ─────────────────────────
  VITE_HP_FLAG_OVERRIDES: z
    .string()
    .optional()
    .describe('JSON object overriding feature flag modes. Only honoured when import.meta.env.DEV.'),

  // ── Engine knobs ────────────────────────────────────────────────────────
  VITE_SCORING_DECAY_ENABLED: z
    .enum(['0', '1'])
    .default('1')
    .describe('Layer-level signal decay. Set to "0" to revert to pre-v21 flat-weight scoring.'),

  // ── Build / environment ─────────────────────────────────────────────────
  VITE_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  VITE_RELEASE_VERSION: z
    .string()
    .default('v0.0.0-dev')
    .describe('Stamped onto every emitted span + analytics event for release correlation.'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

// ── Parse ───────────────────────────────────────────────────────────────────

function readRaw(): Record<string, unknown> {
  // Vite injects via import.meta.env. We read defensively so the same
  // module can be loaded by edge functions (in which case Deno.env
  // takes over via the sister file).
  if (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, unknown> }).env) {
    return (import.meta as { env: Record<string, unknown> }).env;
  }
  return {};
}

let cached: AppEnv | null = null;

/**
 * Returns the parsed, validated env. Lazy-initialised so a missing var
 * in a test file does not break unrelated imports.
 *
 * On parse failure (the schema rejects), this function THROWS a detailed
 * error describing every offending variable. Callers should NOT catch it
 * — bootstrap with a missing required var is a programming error.
 */
export function env(): AppEnv {
  if (cached) return cached;
  const raw = readRaw();
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  · ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = result.data;
  return cached;
}

/**
 * Convenience: read one env var. Auto-validates on first access via env().
 */
export function envVar<K extends keyof AppEnv>(key: K): AppEnv[K] {
  return env()[key];
}

/**
 * Test-only: reset the cache. Use after vi.stubEnv() to force re-read.
 */
export function __resetEnvForTesting(): void {
  cached = null;
}

/**
 * Test-only: inject a parsed env. Bypasses Zod validation; use only when
 * you've constructed a valid AppEnv directly.
 */
export function __setEnvForTesting(value: AppEnv): void {
  cached = value;
}

/**
 * Read parse-time errors WITHOUT throwing. Used by health checks /
 * startup screens that want to display a configuration error instead
 * of crashing the white-screen.
 */
export function envValidationErrors(): string[] | null {
  const raw = readRaw();
  const result = EnvSchema.safeParse(raw);
  if (result.success) return null;
  return result.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`);
}
