// implicitOutcomeDetector.ts — v16.0
// Implicit outcome detection — identifies probable layoff events for users
// WITHOUT requiring them to self-report.
//
// Current system: schedule-outcome-prompts sends a check-in prompt at 30/90/180
// days. This is passive and gets low response rates (~8% in v15.0 data).
//
// This service cross-references the user's company against confirmed layoff event
// sources (WARN filings, layoffs.fyi, news cache) to automatically assign a
// probable outcome label and — when confidence is high enough — send a single
// 1-tap confirmation prompt instead of an open-ended question.
//
// Pipeline note: all data arrives via the `knownLayoffEvents` parameter.
// This service makes no network calls.

// ─── Public types ────────────────────────────────────────────────────────────

export type ImplicitOutcomeSignal =
  | 'warn_match'          // company filed a WARN notice after the audit date
  | 'layoffs_fyi_match'   // company appeared on layoffs.fyi after the audit date
  | 'news_layoff_match'   // news cache has a confirmed layoff story post-audit
  | 're_audit_trigger'    // user ran a new audit at a different company (not implemented here)
  | 'no_signal';          // no implicit signal found

export interface ImplicitOutcomeDetection {
  userId: string;
  auditSessionId: string;
  companyName: string;
  /** ISO date of the original audit */
  auditDate: string;
  detectedSignal: ImplicitOutcomeSignal;
  /** 0–1: confidence that the detected signal accurately reflects the user's situation */
  signalConfidence: number;
  estimatedOutcome: 'likely_laid_off' | 'likely_retained' | 'likely_resigned' | 'unclear';
  /** ISO date when this detection was produced */
  detectionDate: string;
  /** Whether to show the user a 1-tap confirmation prompt */
  shouldPromptUser: boolean;
  /** The confirmation prompt message to surface in the UI */
  promptMessage: string;
  /** Explanation of the detection source (shown in analytics / audit trail) */
  groundTruthNote: string;
}

export interface LayoffEventRef {
  companyName: string;
  /** ISO date of the layoff announcement / filing */
  eventDate: string;
  confirmedSource: 'warn' | 'layoffs_fyi' | 'news_cache';
  affectedCount: number | null;
  percentCut: number | null;
}

// ─── Fuzzy company name matching ──────────────────────────────────────────────

/**
 * Normalizes a raw company name for comparison:
 *   • Lowercase
 *   • Removes legal suffixes (Inc, Corp, Ltd, LLC, PLC, GmbH, Pvt, Co, etc.)
 *   • Strips non-alphanumeric characters
 *   • Collapses whitespace
 */
function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(
      /\b(inc|corp|ltd|llc|limited|pvt|co|plc|gmbh|ag|sa|bv|oy|ab|nv|srl|holdings?|group|international)\b\.?/g,
      '',
    )
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance between two strings (lightweight, no external deps).
 * Used for the "almost the same" prefix check.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Build a 2-row DP matrix (memory-efficient)
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,          // deletion
        prev[j - 1] + cost,   // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Returns true when `searchName` and `eventCompany` are likely the same company.
 *
 * Rules (applied after normalization):
 *   1. Exact match after normalization.
 *   2. One name contains the other (handles "Google" vs "Google LLC").
 *   3. Levenshtein-lite: if the absolute length difference < 3 AND the first
 *      5 characters match → accept (handles minor typos / trailing punctuation).
 */
export function fuzzyMatchCompanyName(
  searchName: string,
  eventCompany: string,
): boolean {
  const a = normalizeForMatch(searchName);
  const b = normalizeForMatch(eventCompany);

  if (!a || !b) return false;

  // Rule 1: exact match
  if (a === b) return true;

  // Rule 2: containment (handles "Google" ↔ "Google Cloud")
  if (a.includes(b) || b.includes(a)) return true;

  // Rule 3: Levenshtein-lite
  const lenDiff = Math.abs(a.length - b.length);
  const firstFiveMatch =
    a.slice(0, 5) === b.slice(0, 5) && a.length >= 5 && b.length >= 5;
  if (lenDiff < 3 && firstFiveMatch) return true;

  return false;
}

// ─── Signal priority ordering ─────────────────────────────────────────────────

/** Lower index = higher priority when multiple signals exist */
const SIGNAL_PRIORITY: ImplicitOutcomeSignal[] = [
  'warn_match',
  'layoffs_fyi_match',
  'news_layoff_match',
  'no_signal',
];

interface MatchedEvent {
  signal: ImplicitOutcomeSignal;
  confidence: number;
  event: LayoffEventRef;
}

// ─── Prompt message builder ───────────────────────────────────────────────────

function buildPromptMessage(
  signal: ImplicitOutcomeSignal,
  companyName: string,
): string {
  switch (signal) {
    case 'warn_match':
      return `We detected that ${companyName} filed a WARN notice. Did this affect you? (tap to confirm)`;
    case 'layoffs_fyi_match':
      return `${companyName} appeared in layoff reports after your audit. Were you impacted?`;
    case 'news_layoff_match':
      return `We saw news of layoffs at ${companyName}. Did you experience a job change?`;
    default:
      return '';
  }
}

// ─── Ground truth note builder ───────────────────────────────────────────────

function buildGroundTruthNote(
  signal: ImplicitOutcomeSignal,
  event: LayoffEventRef | null,
): string {
  if (!event) {
    return 'No layoff event reference found matching this company and post-audit date window.';
  }

  const sourceName =
    event.confirmedSource === 'warn'
      ? 'WARN Act filing'
      : event.confirmedSource === 'layoffs_fyi'
      ? 'layoffs.fyi database entry'
      : 'news cache article';

  const sizeNote =
    event.affectedCount != null
      ? `, affecting ~${event.affectedCount.toLocaleString()} employees`
      : event.percentCut != null
      ? `, ~${event.percentCut}% of workforce`
      : '';

  return (
    `Implicit signal: ${sourceName} for ${event.companyName} on ${event.eventDate}${sizeNote}. ` +
    `Signal type: ${signal}. Detection is probabilistic — user confirmation required for ground-truth labeling.`
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Detects implicit outcome signals for a given user + audit session by
 * cross-referencing the company against known post-audit layoff events.
 *
 * @param userId           The user's ID (for the returned record).
 * @param auditSessionId   The audit session being evaluated.
 * @param companyName      The company the user audited.
 * @param auditDate        ISO date string of the original audit.
 * @param knownLayoffEvents  All available LayoffEventRef records; this function
 *                           filters them — callers pass the full set.
 */
export function detectImplicitOutcome(
  userId: string,
  auditSessionId: string,
  companyName: string,
  auditDate: string,
  knownLayoffEvents: LayoffEventRef[],
): ImplicitOutcomeDetection {
  const detectionDate = new Date().toISOString();

  // ── Step 1: Filter to events that match the company ───────────────────────
  const companyMatches = knownLayoffEvents.filter(event =>
    fuzzyMatchCompanyName(companyName, event.companyName),
  );

  // ── Step 2: Filter to events that occurred AFTER the auditDate ────────────
  const postAuditEvents = companyMatches.filter(event => event.eventDate > auditDate);

  if (postAuditEvents.length === 0) {
    return {
      userId,
      auditSessionId,
      companyName,
      auditDate,
      detectedSignal: 'no_signal',
      signalConfidence: 0,
      estimatedOutcome: 'unclear',
      detectionDate,
      shouldPromptUser: false,
      promptMessage: '',
      groundTruthNote: buildGroundTruthNote('no_signal', null),
    };
  }

  // ── Step 3: Map events to MatchedEvent candidates ─────────────────────────
  const candidates: MatchedEvent[] = postAuditEvents.map(event => {
    let signal: ImplicitOutcomeSignal;
    let confidence: number;

    switch (event.confirmedSource) {
      case 'warn':
        signal = 'warn_match';
        confidence = 0.95;
        break;
      case 'layoffs_fyi':
        signal = 'layoffs_fyi_match';
        confidence = 0.90;
        break;
      case 'news_cache':
        signal = 'news_layoff_match';
        confidence = 0.75;
        break;
      default:
        signal = 'no_signal';
        confidence = 0;
    }

    return { signal, confidence, event };
  });

  // ── Step 4: Pick the highest-priority (most authoritative) signal ─────────
  candidates.sort(
    (a, b) =>
      SIGNAL_PRIORITY.indexOf(a.signal) - SIGNAL_PRIORITY.indexOf(b.signal),
  );

  const best = candidates[0];

  // ── Step 5: Build and return the result ───────────────────────────────────
  const shouldPromptUser = best.signal !== 'no_signal' && best.confidence >= 0.70;
  const promptMessage     = buildPromptMessage(best.signal, companyName);
  const groundTruthNote   = buildGroundTruthNote(best.signal, best.event);

  // Estimate outcome — we lean toward likely_laid_off for all positive signals
  // because this detector is specifically cross-referencing post-audit layoff events.
  const estimatedOutcome: ImplicitOutcomeDetection['estimatedOutcome'] =
    best.signal !== 'no_signal' ? 'likely_laid_off' : 'unclear';

  return {
    userId,
    auditSessionId,
    companyName,
    auditDate,
    detectedSignal: best.signal,
    signalConfidence: best.confidence,
    estimatedOutcome,
    detectionDate,
    shouldPromptUser,
    promptMessage,
    groundTruthNote,
  };
}
