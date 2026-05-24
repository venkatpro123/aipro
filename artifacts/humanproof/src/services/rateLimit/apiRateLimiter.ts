// apiRateLimiter.ts
// Client-side rate limiter for the AI proxy (DeepSeek + Gemini via EF).
//
// The actual per-provider rate limits are enforced server-side by the EF.
// This client-side gate prevents the browser from hammering the EF unnecessarily
// during high-frequency UI interactions (e.g. swarm orchestrator bursts).
//
// Limits (conservative client-side guards — not the provider maximums):
//   supabase_osint : 120 EF calls/hr  — each call may internally use DeepSeek or Gemini
//   gemini         : 900/hr           — kept for direct calls not routed through EF
//   groq           : 500/hr           — kept for any future Groq integration

type ApiName = 'supabase_osint' | 'openrouter' | 'groq' | 'gemini';

interface LimitConfig {
  maxPerHour: number;
  storageKey: string;
}

const LIMITS: Record<ApiName, LimitConfig> = {
  supabase_osint: { maxPerHour: 120, storageKey: 'hp_rl_supabase_osint' }, // multi-model-analyze EF
  openrouter:     { maxPerHour: 120, storageKey: 'hp_rl_openrouter'     }, // legacy alias → same limit
  groq:           { maxPerHour: 500, storageKey: 'hp_rl_groq'           },
  gemini:         { maxPerHour: 900, storageKey: 'hp_rl_gemini'         },
};

interface RateRecord {
  count:     number;
  hourStart: number;
}

/**
 * Returns true if the API call is allowed, false if rate limit has been reached.
 * Always call this before making any AI agent request.
 *
 * Note: passing 'openrouter' is supported for backward compatibility and maps to
 * the supabase_osint limit (both track calls through the multi-model-analyze EF).
 */
export const checkRateLimit = (api: ApiName): boolean => {
  const limit  = LIMITS[api] ?? LIMITS['supabase_osint'];
  const hourMs = 60 * 60 * 1000;
  const now    = Date.now();

  let record: RateRecord = { count: 0, hourStart: now };
  try {
    const stored = localStorage.getItem(limit.storageKey);
    if (stored) record = JSON.parse(stored);
  } catch { /* ignore */ }

  // Reset counter if new hour window
  if (now - record.hourStart > hourMs) {
    record = { count: 1, hourStart: now };
    try { localStorage.setItem(limit.storageKey, JSON.stringify(record)); } catch { /* ignore */ }
    return true;
  }

  if (record.count >= limit.maxPerHour) {
    console.warn(`[RateLimit] ${api} blocked: ${record.count}/${limit.maxPerHour} this hour`);
    return false;
  }

  record.count++;
  try { localStorage.setItem(limit.storageKey, JSON.stringify(record)); } catch { /* ignore */ }
  return true;
};

/**
 * Returns stats for debugging / admin panels.
 */
export const getRateLimitStatus = (): Record<ApiName, { used: number; limit: number; resetIn: string }> => {
  const hourMs = 60 * 60 * 1000;
  const now    = Date.now();
  const result: any = {};

  for (const [api, cfg] of Object.entries(LIMITS) as [ApiName, LimitConfig][]) {
    let record: RateRecord = { count: 0, hourStart: now };
    try {
      const stored = localStorage.getItem(cfg.storageKey);
      if (stored) record = JSON.parse(stored);
    } catch { /* ignore */ }

    const msSinceReset = now - record.hourStart;
    const resetIn      = Math.max(0, hourMs - msSinceReset);
    const mins         = Math.ceil(resetIn / 60000);

    result[api] = {
      used:    record.count,
      limit:   cfg.maxPerHour,
      resetIn: `${mins}m`,
    };
  }
  return result;
};
