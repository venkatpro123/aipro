// dedupe.ts
// Helpers for computing stable, deterministic deduplication keys across the
// scraper pipeline. Same key = same logical event, even if discovered through
// different sources at different times.

import { createHash } from 'node:crypto';

/** Stable lower-cased company token used in dedupe keys. */
export function normaliseCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** sha256("company|source|date|contentHash") truncated to 24 chars. */
export function dedupeKey(parts: {
  company: string;
  source: string;
  date?: string;
  contentHash?: string;
}): string {
  const { company, source, date = '', contentHash = '' } = parts;
  const input = `${normaliseCompany(company)}|${source.toLowerCase()}|${date}|${contentHash}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 24);
}

/** Quick stable hash of an arbitrary string — used for content-change detection. */
export function quickHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}
