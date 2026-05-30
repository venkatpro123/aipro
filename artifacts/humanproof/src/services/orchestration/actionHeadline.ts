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
 * Returns a verb-first action headline for a recommendation. Prefers the first
 * imperative sentence in the description; falls back to an imperative title;
 * last resort is the (diagnosis) title so we never render empty.
 */
export function actionHeadline(item: ActionLike | null | undefined): string {
  const title = (item?.title ?? '').trim();
  const desc = (item?.description ?? '').trim();

  const sentences = desc
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const s of sentences) {
    if (VERB_RE.test(s)) return clampHeadline(s);
  }

  // Title is already an action ("Update your resume…") — use it.
  if (VERB_RE.test(title)) return clampHeadline(title);

  // No imperative found: prefer the first description sentence over a bare
  // diagnosis title (still more actionable context), else the title.
  if (sentences.length > 0) return clampHeadline(sentences[0]);
  return title || 'Take your highest-impact next step';
}

export default actionHeadline;
