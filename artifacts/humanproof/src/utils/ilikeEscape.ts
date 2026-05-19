// ilikeEscape.ts
// v40 hardening: shared helper that neutralises PostgREST `ilike()`
// metacharacters before user input is interpolated into a pattern.
//
// PostgREST treats `%` and `_` as wildcards inside `ilike` filters.
// Without escaping, a caller can pass `_oogle` to widen a match to any
// 6-character company name ending in "oogle", or `%` to match anything.
//
// We escape backslash FIRST (otherwise downstream escapes double-escape),
// then `%` and `_`. The string is length-capped to bound query cost; short
// codes like "TCS" or "ORCL" pass through unchanged.
//
// Mirrors the same helper used in the Edge Functions (api-displacement-scores,
// fetch-company-data) so client + server share one source of truth.

export const ILIKE_ESCAPE_MAX_LEN = 200;

export function escapeIlike(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw
    .slice(0, ILIKE_ESCAPE_MAX_LEN)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
