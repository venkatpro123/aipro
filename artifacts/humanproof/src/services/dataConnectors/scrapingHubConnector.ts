// scrapingHubConnector.ts
// Calls the scrape action on proxy-live-signals EF for no-API-key company enrichment:
//   - Career page job count + hiring freeze detection
//   - Wikipedia employee count (infobox extraction)
//   - Glassdoor company rating, review count, CEO approval
//
// All sources require ZERO API keys — scraped directly from public pages server-side.
// Called concurrently with other data fetches in liveDataService.

import { supabase } from '../../utils/supabase';

export interface ScrapedCompanyEnrichment {
  /** Headcount from Wikipedia infobox — reliable for large public companies */
  wikiEmployeeCount:   number | null;
  /** Career page: is hiring active (false = freeze detected or no postings) */
  careerHiringActive:  boolean | null;
  /** Career page: raw job posting count */
  careerJobCount:      number | null;
  /** Career page signals (freeze_detected, no_openings, very_low_postings) */
  careerSignals:       string[];
  /** Glassdoor overall company rating (0–5) */
  glassdoorRating:     number | null;
  /** Glassdoor total review count */
  glassdoorReviews:    number | null;
  /** Glassdoor CEO approval % */
  glassdoorCeoApproval: number | null;
  /** Whether any scraped source returned meaningful data */
  hasData:             boolean;
  fetchedAt:           string;
  errors:              string[];
}

export async function fetchScrapedEnrichment(
  companyName: string,
): Promise<ScrapedCompanyEnrichment> {
  const empty: ScrapedCompanyEnrichment = {
    wikiEmployeeCount: null, careerHiringActive: null, careerJobCount: null,
    careerSignals: [], glassdoorRating: null, glassdoorReviews: null,
    glassdoorCeoApproval: null, hasData: false,
    fetchedAt: new Date().toISOString(), errors: [],
  };

  try {
    const { data, error } = await supabase.functions.invoke('proxy-live-signals', {
      body: { action: 'scrape', companyName },
    });

    if (error) {
      empty.errors.push(`scrape EF: ${error.message}`);
      return empty;
    }

    const sd = data?.scrapeData as {
      careerPage?: { hiringActive: boolean; jobCount: number | null; signals: string[] } | null;
      wikiEmployeeCount?: number | null;
      glassdoor?: { rating: number | null; reviewCount: number | null; ceoApproval: number | null } | null;
    } | null;

    if (!sd) return { ...empty, errors: [...empty.errors, 'scrape: no data returned'] };

    const enrichment: ScrapedCompanyEnrichment = {
      wikiEmployeeCount:    sd.wikiEmployeeCount ?? null,
      careerHiringActive:   sd.careerPage?.hiringActive ?? null,
      careerJobCount:       sd.careerPage?.jobCount ?? null,
      careerSignals:        sd.careerPage?.signals ?? [],
      glassdoorRating:      sd.glassdoor?.rating ?? null,
      glassdoorReviews:     sd.glassdoor?.reviewCount ?? null,
      glassdoorCeoApproval: sd.glassdoor?.ceoApproval ?? null,
      hasData: !!(
        sd.wikiEmployeeCount ||
        sd.careerPage?.jobCount != null ||
        sd.glassdoor?.rating != null
      ),
      fetchedAt: data?.fetchedAt ?? new Date().toISOString(),
      errors:   data?.errors ?? [],
    };

    return enrichment;
  } catch (e: unknown) {
    empty.errors.push(`scrape EF exception: ${e instanceof Error ? e.message : String(e)}`);
    return empty;
  }
}
