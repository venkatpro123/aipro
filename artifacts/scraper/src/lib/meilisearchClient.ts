// meilisearchClient.ts
// Wraps the Meilisearch client with a singleton + a "guard mode" that turns
// the indexer into a no-op when MEILISEARCH_HOST is not configured. This lets
// the scraper run perfectly fine on a $9/mo Fly.io setup that doesn't yet have
// Meilisearch — search just isn't available until you provision it.

import { MeiliSearch, type Index } from 'meilisearch';
import { config } from './config.js';
import type { ScraperEvent } from './types.js';

const EVENTS_INDEX = 'company_events';

let _client: MeiliSearch | null = null;
let _eventsIndex: Index | null = null;
let _initPromise: Promise<void> | null = null;

function getClient(): MeiliSearch | null {
  if (!config.meilisearch.enabled) return null;
  if (_client) return _client;
  _client = new MeiliSearch({
    host:   config.meilisearch.host,
    apiKey: config.meilisearch.apiKey,
  });
  return _client;
}

async function ensureIndex(): Promise<Index | null> {
  const client = getClient();
  if (!client) return null;
  if (_eventsIndex) return _eventsIndex;
  if (_initPromise) {
    await _initPromise;
    return _eventsIndex;
  }

  _initPromise = (async () => {
    try {
      const idx = client.index(EVENTS_INDEX);
      // Idempotent — Meilisearch ignores if settings already match.
      await idx.updateSettings({
        searchableAttributes: ['headline', 'companyName', 'eventType', 'sources'],
        filterableAttributes: ['companyName', 'eventType', 'industry', 'region', 'eventDate'],
        sortableAttributes: ['eventDate'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      }).catch(() => { /* idx may not exist yet on first call; created on first push */ });
      _eventsIndex = idx;
    } catch (err: any) {
      console.warn('[meilisearch] init failed:', err?.message);
      _eventsIndex = null;
    }
  })();

  await _initPromise;
  return _eventsIndex;
}

/**
 * Push a composed ScraperEvent into Meilisearch. No-op if Meili is not
 * configured — caller should always treat indexing as best-effort.
 */
export async function indexEvent(event: ScraperEvent): Promise<void> {
  if (!config.meilisearch.enabled) return;
  try {
    const idx = await ensureIndex();
    if (!idx) return;
    await idx.addDocuments([event], { primaryKey: 'id' });
  } catch (err: any) {
    console.warn('[meilisearch] indexEvent failed:', err?.message);
  }
}
