// actionHeadline.ts — turn a recommendation into a verb-first ACTION headline.
//
// PROBLEM (found in end-to-end user testing)
// Recommendation titles are written as the PROBLEM ("Internal Position
// Vulnerable", "Industry Headwinds", "Oracle's Finances Are Weakening"), while
// the actual instruction lives in the description. The orchestrator's "one move"
// surfaced `action.title`, so the single most important next step read as a
// diagnosis, not something the user could DO.
//
// SOLUTION
// A PURE function that extracts the imperative action from the description
// (first sentence starting with an action verb), falling back to the title only
// when it is itself imperative. Deterministic — no I/O, clock, or randomness.

interface ActionLike {
  title?: string;
  description?: string;
}

// Common action verbs that open an imperative instruction.
const IMPERATIVE_VERBS = [
  'add', 'build', 'map', 'reach', 'demonstrate', 'start', 'open', 'update',
  'activate', 'target', 'schedule', 'apply', 'document', 'negotiate', 'prepare',
  'set', 'convert', 'use', 'warm', 'contact', 'request', 'book', 'draft',
  'reduce', 'expand', 'secure', 'create', 'join', 'meet', 'review', 'refresh',
  'pitch', 'position', 'diversify', 'hedge', 'save', 'cut', 'line', 'lock',
  'identify', 'shadow', 'volunteer', 'publish', 'ship', 'learn', 'enroll',
  'find', 'research', 'pick', 'choose', 'explore', 'move', 'transition',
  'carry', 'offer', 'implement', 'integrate', 'compare', 'assess', 'calculate',
  'write', 'take', 'automate', 'specialize', 'commit',
];

const VERB_RE = new RegExp('^(?:' + IMPERATIVE_VERBS.join('|') + ')\\b', 'i');

function clampHeadline(s: string, max = 96): string {
  const t = s.replace(/\s+/g, ' ').trim().replace(/[.;:,]+$/, '');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[.;:,]+$/, '') + '…';
}

/**
 * Returns a verb-first action headline for a recommendation.
 *
 * Priority:
 *   1. Title, when it starts with an imperative verb — titles are hand-authored
 *      career-strategy headlines ("Write One SQL Optimization Case Study…"),
 *      while description sentences can be raw technical instructions ("Use
 *      EXPLAIN ANALYZE to identify the bottleneck…") that confuse users when
 *      shown as the standalone "one move."
 *   2. First imperative sentence from description — for diagnosis titles
 *      ("Industry Headwinds") that aren't actionable on their own.
 *   3. First description sentence or bare title as last resort.
 */
export function actionHeadline(item: ActionLike | null | undefined): string {
  const title = (item?.title ?? '').trim();
  const desc = (item?.description ?? '').trim();

  // Title is already an action ("Update your resume…", "Write One SQL…") — use it.
  if (VERB_RE.test(title)) return clampHeadline(title);

  // Title is a diagnosis ("Industry Headwinds") — extract from description.
  const sentences = desc
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const s of sentences) {
    if (VERB_RE.test(s)) return clampHeadline(s);
  }

  if (sentences.length > 0) return clampHeadline(sentences[0]);
  return title || 'Take your highest-impact next step';
}

export default actionHeadline;
