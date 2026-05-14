// EventSearchPanel.tsx
// Full-text search across composed scraper events (company_events index in
// Meilisearch). Queries Meilisearch directly from the browser using a
// search-only API key — never the master key.
//
// Gracefully renders an empty disabled state when Meilisearch is not yet
// provisioned (VITE_MEILISEARCH_HOST or VITE_MEILISEARCH_SEARCH_KEY missing).
// This way the audit dashboard never crashes; the panel just sits inert
// until ops sets the env vars.
//
// Wired into the audit dashboard for a "Search past events" UX: a user can
// type "Infosys workforce reduction 2026" and pull back the fused events
// across all sources, with source URLs to drill into.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ExternalLink, Loader2 } from 'lucide-react';

interface EventHit {
  id:            string;
  companyName:   string;
  eventType:     string;
  eventDate:     string;
  headline:      string;
  percentCut:    number | null;
  affectedCount: number | null;
  confidence:    number;
  sources?:      Array<{ name: string; authority: number; url?: string }>;
}

const MEILI_HOST  = (import.meta as any).env?.VITE_MEILISEARCH_HOST as string | undefined;
const MEILI_KEY   = (import.meta as any).env?.VITE_MEILISEARCH_SEARCH_KEY as string | undefined;
const MEILI_INDEX = 'company_events';

const isMeiliConfigured = Boolean(MEILI_HOST && MEILI_KEY);

/** Exported so callers can hide the entire panel + its containing block when
 *  Meilisearch isn't provisioned. Showing a "configuration error" callout in
 *  production reads as "the platform is broken" — better to omit the surface
 *  entirely until the env vars are set. */
export const isEventSearchAvailable = (): boolean => isMeiliConfigured;

async function searchEvents(query: string, signal: AbortSignal): Promise<EventHit[]> {
  if (!isMeiliConfigured) return [];
  const res = await fetch(`${MEILI_HOST!.replace(/\/$/, '')}/indexes/${MEILI_INDEX}/search`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MEILI_KEY}`,
    },
    body: JSON.stringify({
      q:          query,
      limit:      10,
      sort:       ['eventDate:desc'],
      attributesToRetrieve: [
        'id', 'companyName', 'eventType', 'eventDate', 'headline',
        'percentCut', 'affectedCount', 'confidence', 'sources',
      ],
    }),
  });
  if (!res.ok) throw new Error(`meilisearch HTTP ${res.status}`);
  const data = await res.json();
  return (data?.hits ?? []) as EventHit[];
}

function confidenceTone(conf: number): { label: string; cls: string } {
  if (conf >= 0.70) return { label: 'High',   cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' };
  if (conf >= 0.40) return { label: 'Medium', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' };
  return                  { label: 'Low',    cls: 'text-slate-300 bg-slate-500/10 border-slate-500/30' };
}

export function EventSearchPanel(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<EventHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search — 350ms after the user stops typing
  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!isMeiliConfigured) return;
    if (debouncedQuery.length < 2) {
      setHits([]);
      setError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const results = await searchEvents(debouncedQuery, ctrl.signal);
        setHits(results);
      } catch (err: any) {
        if (err?.name !== 'AbortError') setError(err?.message ?? 'search failed');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [debouncedQuery]);

  if (!isMeiliConfigured) {
    return (
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 text-slate-400">
        <div className="flex items-center gap-2 text-sm">
          <Search className="w-4 h-4 opacity-50" />
          <span>Event search is disabled — Meilisearch not configured.</span>
        </div>
        <div className="text-xs mt-1 opacity-60">
          Set <code className="px-1 py-0.5 rounded bg-slate-800">VITE_MEILISEARCH_HOST</code> and{' '}
          <code className="px-1 py-0.5 rounded bg-slate-800">VITE_MEILISEARCH_SEARCH_KEY</code> to enable.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
      <label className="block">
        <span className="text-xs font-medium text-slate-300 mb-1.5 inline-flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Search past events
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "infosys workforce reduction 2026"'
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
        />
      </label>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-rose-400">{error}</div>
      )}

      {!loading && !error && debouncedQuery.length >= 2 && hits.length === 0 && (
        <div className="mt-3 text-xs text-slate-500">No events match.</div>
      )}

      {hits.length > 0 && (
        <ul className="mt-3 space-y-2">
          {hits.map((hit) => {
            const tone = confidenceTone(hit.confidence);
            const primarySource = hit.sources?.[0];
            return (
              <li key={hit.id} className="rounded-lg border border-slate-700/40 bg-slate-950/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100 text-sm">{hit.companyName}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{hit.eventType.replace('_', ' ')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tone.cls}`}>{tone.label}</span>
                      <span className="text-[10px] text-slate-500">{hit.eventDate}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1 line-clamp-2">{hit.headline}</div>
                    {(hit.percentCut || hit.affectedCount) && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        {hit.percentCut ? <span>{hit.percentCut}% cut</span> : null}
                        {hit.percentCut && hit.affectedCount ? <span> · </span> : null}
                        {hit.affectedCount ? <span>{hit.affectedCount.toLocaleString()} affected</span> : null}
                      </div>
                    )}
                    {hit.sources && hit.sources.length > 0 && (
                      <div className="mt-1.5 text-[10px] text-slate-500">
                        Sources: {hit.sources.map(s => s.name).join(', ')}
                      </div>
                    )}
                  </div>
                  {primarySource?.url && (
                    <a
                      href={primarySource.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Source
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
