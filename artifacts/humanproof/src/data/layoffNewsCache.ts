// layoffNewsCache.ts
// Layoff event store — seeded with major known events, dynamically expandable at runtime via OSINT.
//
// Breaking-news cache invalidation: injectLayoffEvent() calls invalidateForCompany() so that
// the ensemble analysis cache (1h localStorage) is cleared for the affected company.
// This ensures that if a layoff event is discovered mid-session, the next re-submit
// runs fresh scoring instead of returning a stale cached result from before the news.

export interface LayoffNewsEvent {
  companyName: string;
  date: string;
  headline: string;
  percentCut: number;
  source: string;
  url: string;
  affectedDepartments: string[];
}

// ── Fallback seeded events (loaded from curated_layoff_events Supabase table at runtime) ──
// [AUDIT FIX]: These events were previously permanent hardcoded constants — any error
// in percentCut, date, or scope required a code deployment to correct. They are now
// FALLBACK values only, overridden by the curated_layoff_events table which admins
// can update without deployments. Call `loadCuratedLayoffEvents()` once per session.
export const layoffNewsCache: LayoffNewsEvent[] = [
  {
    companyName: 'Oracle',
    date: '2026-04-01',
    headline: 'Oracle begins laying off estimated 30,000 employees amid AI infrastructure spending concerns',
    percentCut: 21,
    source: 'Crunchbase News (seeded fallback — verify via curated_layoff_events)',
    url: 'https://news.crunchbase.com/',
    affectedDepartments: ['Sales', 'Marketing', 'HR', 'Finance'],
  },
  {
    companyName: 'Amazon',
    date: '2026-01-15',
    headline: 'Amazon lays off 16,000 employees to reduce management layers and reallocate to AI',
    percentCut: 1,
    source: 'TechCrunch (seeded fallback — verify via curated_layoff_events)',
    url: 'https://techcrunch.com/',
    affectedDepartments: ['Management', 'Sales', 'Operations'],
  },
  {
    companyName: 'Meta',
    date: '2026-01-10',
    headline: 'Meta cuts 1,500 employees from Reality Labs division',
    percentCut: 3,
    source: 'InformationWeek (seeded fallback — verify via curated_layoff_events)',
    url: 'https://www.informationweek.com/',
    affectedDepartments: ['VR/AR', 'Engineering', 'Research'],
  },
];

// ── Curated events loader — reads from managed Supabase table ────────────────
// Overrides/supplements the hardcoded fallback seeds above.
// Called once per session by auditDataPipeline.ts before the pipeline runs.
// Errors are non-fatal — the seeded fallback events remain active.

let _curatedLoaded = false; // prevent redundant loads in the same session

export const loadCuratedLayoffEvents = async (): Promise<void> => {
  if (_curatedLoaded) return;
  try {
    // Dynamic import to avoid circular dependencies at module init time
    const { supabase } = await import('../utils/supabase');
    // Fetch the most recent 100 curated events (admin-managed, ordered by recency).
    // No date filter — curated events remain relevant regardless of age and the
    // admin controls which events are active via the DB table.
    const { data, error } = await supabase
      .from('curated_layoff_events')
      .select('company_name,event_date,headline,percent_cut,source,source_url,affected_departments')
      .order('event_date', { ascending: false })
      .limit(100);

    if (error || !data) return;

    for (const row of data) {
      if (!row.company_name || !row.event_date) continue;
      // Use the managed table's values — they override whatever is seeded.
      // Remove the old seeded entry for this company+date combination first.
      const canon = canonicalName(row.company_name);
      const dateKey = String(row.event_date).slice(0, 10);
      const existingIdx = layoffNewsCache.findIndex(e => {
        return canonicalName(e.companyName) === canon &&
          (e.date ?? '').slice(0, 10) === dateKey;
      });
      const curatedEvent: LayoffNewsEvent = {
        companyName:         row.company_name,
        date:                dateKey,
        headline:            row.headline ?? '',
        percentCut:          typeof row.percent_cut === 'number' ? row.percent_cut : 0,
        source:              row.source ?? 'curated_layoff_events',
        url:                 row.source_url ?? '',
        affectedDepartments: Array.isArray(row.affected_departments) ? row.affected_departments : [],
      };
      if (existingIdx >= 0) {
        layoffNewsCache[existingIdx] = curatedEvent; // override seeded/stale entry
      } else {
        layoffNewsCache.push(curatedEvent);          // new event not in seeds
      }
    }
    _curatedLoaded = true;
  } catch {
    // Non-fatal — seeded fallbacks remain active
  }
};

// ── Dynamic injection — called by LayoffCalculator after OSINT resolves ─────

/** Subscribers notified when a new event is injected (e.g. to show breaking-news banner). */
type NewsListener = (event: LayoffNewsEvent) => void;
const _listeners: NewsListener[] = [];
export const onNewLayoffEvent = (fn: NewsListener): (() => void) => {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
};

/**
 * Normalise a company name to a canonical form for deduplication.
 * Maps known aliases to a single canonical key so "Google" and "Alphabet"
 * events on the same date don't double-inject.
 */
function canonicalName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  const lower = name.toLowerCase().trim();
  // Resolve aliases to their primary name
  for (const [primary, aliases] of Object.entries(COMPANY_ALIASES)) {
    if (lower === primary || aliases.includes(lower)) return primary;
  }
  // Strip common suffixes for dedup (Google LLC → google)
  return lower.replace(/\s+(inc|llc|ltd|limited|corp|corporation|technologies|technology|services|pvt|group|holdings)\.?$/i, '').trim();
}

/**
 * Inject a real-time layoff event from OSINT into the runtime cache.
 * Prevents duplicates by canonical company name + date key.
 * Also invalidates the ensemble analysis cache for this company so the next
 * submit re-runs scoring with the new event incorporated into newsRisk (L2).
 */
export const injectLayoffEvent = (event: LayoffNewsEvent): void => {
  // Reject malformed events — a missing companyName would corrupt lookupLayoffEvent's
  // filter and cause "Cannot read properties of undefined (reading 'toLowerCase')" in
  // the score engine.
  if (!event.companyName || typeof event.companyName !== 'string') return;

  const canon = canonicalName(event.companyName);
  if (!canon) return; // empty company name after canonicalisation — skip

  const key = `${canon}::${(event.date ?? '').slice(0, 10)}`;
  const exists = layoffNewsCache.some(e => {
    const eCanon = canonicalName(e.companyName);
    return `${eCanon}::${(e.date ?? '').slice(0, 10)}` === key;
  });
  if (!exists) {
    layoffNewsCache.push(event);
    // Invalidate analysis cache so the next submit sees the new event in scoring.
    // Lazy import avoids a circular dependency (analysisCache → supabase → ... → layoffNewsCache).
    import('../services/cache/analysisCache').then(({ invalidateForCompany }) => {
      invalidateForCompany(event.companyName);
    }).catch(() => { /* non-fatal */ });
    // Notify listeners (e.g. BreakingNewsBanner component)
    _listeners.forEach(fn => {
      try { fn(event); } catch { /* listener errors must not break injection */ }
    });
  }
};

/**
 * refreshFromNewsAPI — fetches live layoff headlines for a company and injects them.
 * Requires VITE_NEWSAPI_KEY. Returns count of events injected.
 */
export const refreshFromNewsAPI = async (companyName: string): Promise<number> => {
  const apiKey = (import.meta as any).env?.VITE_NEWSAPI_KEY as string | undefined;
  if (!apiKey) return 0;
  try {
    const thirty = new Date();
    thirty.setDate(thirty.getDate() - 30);
    const from = thirty.toISOString().split('T')[0];
    const q = encodeURIComponent(`"${companyName}" AND (layoff OR "job cuts" OR restructuring)`);
    const url = `https://newsapi.org/v2/everything?q=${q}&from=${from}&sortBy=publishedAt&language=en&pageSize=5&apiKey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return 0;
    const data = await res.json();
    if (data.status !== 'ok') return 0;
    let injected = 0;
    for (const article of (data.articles ?? [])) {
      const text = (article.title ?? '') + ' ' + (article.description ?? '');
      const lower = text.toLowerCase();
      if (lower.includes('layoff') || lower.includes('job cut') || lower.includes('restructur')) {
        const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
        injectLayoffEvent({
          companyName,
          date: (article.publishedAt ?? new Date().toISOString()).slice(0, 10),
          headline: article.title ?? '',
          // Use 0 (undisclosed) when no percentage is stated — 5% was fabricated
          percentCut: pctMatch ? parseFloat(pctMatch[1]) : 0,
          source: article.source?.name ?? 'NewsAPI',
          url: article.url ?? '',
          affectedDepartments: [],
        });
        injected++;
      }
    }
    return injected;
  } catch {
    return 0;
  }
};

// Common subsidiary/parent name aliases so "Google" finds "Alphabet" events and vice versa.
const COMPANY_ALIASES: Record<string, string[]> = {
  google:    ['alphabet', 'google llc', 'google inc'],
  alphabet:  ['google', 'google llc'],
  facebook:  ['meta', 'meta platforms'],
  meta:      ['facebook', 'meta platforms'],
  microsoft: ['microsoft corporation', 'msft'],
  amazon:    ['amazon.com', 'amazon web services', 'aws'],
  tcs:       ['tata consultancy services', 'tata consultancy'],
  infosys:   ['infosys limited', 'infosys bpo'],
  wipro:     ['wipro limited', 'wipro technologies'],
};

function resolveAliases(name: string | null | undefined): string[] {
  if (!name || typeof name !== 'string') return [];
  const lower = name.toLowerCase().trim();
  if (!lower) return [];
  const aliases = COMPANY_ALIASES[lower] ?? [];
  // Also check if the name is itself an alias
  const reverseMatches = Object.entries(COMPANY_ALIASES)
    .filter(([, vals]) => vals.includes(lower))
    .map(([key]) => key);
  return [lower, ...aliases, ...reverseMatches];
}

/**
 * Look up the most recent layoff event for a company (case-insensitive, alias-aware).
 */
export const lookupLayoffEvent = (companyName: string | null | undefined): LayoffNewsEvent | null => {
  if (!companyName) return null;
  const names = resolveAliases(companyName);
  if (names.length === 0) return null;
  const matches = layoffNewsCache
    .filter(e => {
      const eName = (e.companyName ?? '').toLowerCase();
      return eName.length > 0 && names.some(n => eName.includes(n) || n.includes(eName));
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return matches[0] ?? null;
};

/**
 * Check if any layoff event exists for a company (case-insensitive, alias-aware).
 */
export const hasLayoffEvent = (companyName: string): boolean => {
  return lookupLayoffEvent(companyName) !== null;
};
