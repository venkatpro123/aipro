// scrapingOrchestrator.ts
// Central scraping coordinator — launches all intelligence scrapers concurrently,
// merges results, and enriches CompanyData with zero API-key dependencies.
//
// SCRAPING PRIORITY:
//   Tier 1 (Primary)  — direct scraping, no API keys: Yahoo Finance, Google News RSS,
//                        Bing News RSS, HN, Reddit, Naukri API, Bing job search,
//                        Indeed HTML, career pages, Wikipedia, Glassdoor
//   Tier 2 (Backup)   — free-tier API keys: GNews (100/day), FMP (optional)
//   Tier 3 (Last resort) — paid API keys: NewsAPI (100/day), Serper (paid)
//
// APIs are NEVER primary. The system runs fully without any API key.

import { fetchScrapedEnrichment, ScrapedCompanyEnrichment } from './dataConnectors/scrapingHubConnector';
import type { CompanyData } from '../data/companyDatabase';

export interface ScrapingOrchestratorResult {
  enrichment:        ScrapedCompanyEnrichment;
  /** Resolved employee count — Wikipedia wins if DB is null or stale */
  resolvedHeadcount: number | null;
  /** Career page signals converted to a hiring freeze score supplement */
  careerFreezeSignal: number | null;
  /** Whether the career page detected an active hiring freeze */
  hiringFreezeDetected: boolean;
  /** Glassdoor sentiment score (0 = bad, 1 = great) based on rating + CEO approval */
  glassdoorSentiment: number | null;
  /** Enrichment sources that succeeded (for provenance display) */
  activeSources:     string[];
  fetchedAt:         string;
}

/** Converts Glassdoor rating (0–5) + CEO approval (0–100%) into a 0–1 sentiment score. */
function computeGlassdoorSentiment(rating: number | null, ceoApproval: number | null): number | null {
  if (rating == null && ceoApproval == null) return null;
  const ratingScore   = rating       != null ? rating / 5 : null;
  const ceoScore      = ceoApproval  != null ? ceoApproval / 100 : null;
  if (ratingScore != null && ceoScore != null) return (ratingScore * 0.6 + ceoScore * 0.4);
  return ratingScore ?? ceoScore;
}

/** Maps career page signals into a hiring freeze score supplement (0 = normal, 1 = frozen). */
function careerSignalsToFreezeScore(signals: string[], jobCount: number | null): number {
  if (signals.includes('freeze_detected'))   return 0.9;
  if (signals.includes('no_openings'))       return 0.85;
  if (signals.includes('very_low_postings')) return 0.6;
  if (jobCount != null && jobCount < 10)     return 0.5;
  return 0;
}

/**
 * runScrapingPipeline — launches all enrichment scrapers concurrently.
 * Called at the START of the audit pipeline (not after DB resolution) so
 * scraped data is available before scoring begins.
 */
export async function runScrapingPipeline(
  companyName: string,
  existingHeadcount: number | null,
): Promise<ScrapingOrchestratorResult> {
  const fetchedAt = new Date().toISOString();

  // Launch enrichment scraping (career page + Wikipedia + Glassdoor)
  const enrichment = await fetchScrapedEnrichment(companyName).catch((): ScrapedCompanyEnrichment => ({
    wikiEmployeeCount: null, careerHiringActive: null, careerJobCount: null,
    careerSignals: [], glassdoorRating: null, glassdoorReviews: null,
    glassdoorCeoApproval: null, hasData: false, fetchedAt, errors: ['scrape timeout'],
  }));

  // Headcount resolution: Wikipedia > existing DB value
  // Only use Wikipedia when the DB has no headcount (null) or headcount is clearly wrong
  const resolvedHeadcount = (() => {
    const wiki = enrichment.wikiEmployeeCount;
    if (wiki != null && wiki > 0) {
      // Sanity check: Wikipedia count should be within 10x of DB count if DB exists
      if (existingHeadcount != null && existingHeadcount > 0) {
        const ratio = wiki / existingHeadcount;
        if (ratio < 0.1 || ratio > 10) return existingHeadcount; // too divergent → trust DB
      }
      return wiki;
    }
    return existingHeadcount;
  })();

  const freezeScore = careerSignalsToFreezeScore(enrichment.careerSignals, enrichment.careerJobCount);
  const hiringFreezeDetected = freezeScore >= 0.6;
  const glassdoorSentiment   = computeGlassdoorSentiment(enrichment.glassdoorRating, enrichment.glassdoorCeoApproval);

  const activeSources: string[] = [];
  if (enrichment.wikiEmployeeCount != null)  activeSources.push('wikipedia');
  if (enrichment.careerJobCount    != null)  activeSources.push('career-page');
  if (enrichment.glassdoorRating   != null)  activeSources.push('glassdoor');

  return {
    enrichment, resolvedHeadcount, careerFreezeSignal: freezeScore > 0 ? freezeScore : null,
    hiringFreezeDetected, glassdoorSentiment, activeSources, fetchedAt,
  };
}

/**
 * applyScrapingEnrichment — merges ScrapingOrchestratorResult into CompanyData.
 * Called after runScrapingPipeline resolves; mutates companyData in place.
 */
export function applyScrapingEnrichment(
  companyData: CompanyData,
  result: ScrapingOrchestratorResult,
): void {
  // Apply Wikipedia headcount only when current value is null or zero
  if (result.resolvedHeadcount != null && (!companyData.employeeCount || companyData.employeeCount < 1)) {
    (companyData as any)._wikiHeadcountApplied = true;
    companyData.employeeCount = result.resolvedHeadcount;
  }

  // Attach Glassdoor sentiment for downstream scoring layers
  if (result.glassdoorSentiment != null) {
    (companyData as any)._glassdoorSentiment = result.glassdoorSentiment;
    (companyData as any)._glassdoorRating    = result.enrichment.glassdoorRating;
  }

  // Attach career page freeze signal
  if (result.careerFreezeSignal != null) {
    (companyData as any)._careerPageFreezeScore = result.careerFreezeSignal;
    (companyData as any)._careerHiringActive    = result.enrichment.careerHiringActive;
  }

  // Track which scraping sources enriched this result
  (companyData as any)._scrapingSources = result.activeSources;
  (companyData as any)._scrapingFetchedAt = result.fetchedAt;
}
