// fuzzyCompanyMatch.ts — DEBT-4 (shared between frontend + edge functions)
//
// Canonical implementation of the fuzzy company-name matcher previously
// duplicated in:
//   * artifacts/humanproof/src/services/implicitOutcomeDetector.ts
//   * supabase/functions/outcome-ingestion/index.ts
//   * (any future caller)
//
// Both call sites now import from here. A bug fix lands in one place;
// every downstream gets it.
//
// PURE: no I/O, no environment imports. Safe to import from Deno
// edge functions and from the Vite browser bundle.

/** Words/suffixes stripped before comparison. */
const LEGAL_SUFFIX_RE =
  /\b(inc|corp|ltd|llc|limited|pvt|co|plc|gmbh|ag|sa|bv|oy|ab|nv|srl|holdings?|group|international)\b\.?/g;

/**
 * Normalises a raw company name for matching:
 *   * lowercases
 *   * strips legal suffixes (Inc, Corp, Ltd, LLC, PLC, GmbH, ...)
 *   * removes non-alphanumeric punctuation
 *   * collapses whitespace
 */
export function normalizeCompanyForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIX_RE, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns true when `searchName` and `eventCompany` are likely the same
 * company. The three-rule cascade balances false-positive risk against
 * "Google" vs "Google LLC" type aliases.
 */
export function fuzzyMatchCompanyName(searchName: string, eventCompany: string): boolean {
  const a = normalizeCompanyForMatch(searchName);
  const b = normalizeCompanyForMatch(eventCompany);
  if (!a || !b) return false;

  // Rule 1: exact match after normalisation
  if (a === b) return true;

  // Rule 2: containment (handles "Google" ↔ "Google Cloud")
  if (a.includes(b) || b.includes(a)) return true;

  // Rule 3: Levenshtein-lite — first 5 chars match AND length diff < 3
  const lenDiff = Math.abs(a.length - b.length);
  const firstFiveMatch = a.slice(0, 5) === b.slice(0, 5) && a.length >= 5 && b.length >= 5;
  if (lenDiff < 3 && firstFiveMatch) return true;

  return false;
}

/**
 * Full Levenshtein distance — kept for future stricter matchers (e.g.
 * cross-tenant fuzzy lookups). Not used by fuzzyMatchCompanyName today.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    [prev[0], curr[0]] = [curr[0] as number, prev[0] as number];
    // Swap-without-allocation: write prev's content from curr.
    for (let k = 0; k <= n; k++) prev[k] = curr[k] as number;
  }
  return prev[n] as number;
}
