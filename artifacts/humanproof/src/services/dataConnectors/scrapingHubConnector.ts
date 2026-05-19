// scrapingHubConnector.ts
// Calls the scrape action on proxy-live-signals EF for no-API-key company enrichment:
//   - Career page job count + hiring freeze detection
//   - Wikipedia employee count (infobox extraction)
//   - Glassdoor company rating, review count, CEO approval
//
// All sources require ZERO API keys — scraped directly from public pages server-side.
// Called concurrently with other data fetches in liveDataService.

import { supabase } from '../../utils/supabase';
import { invokeEdgeFunction } from '../../infrastructure/requestId';

export interface ScrapedCompanyEnrichment {
  /** Headcount from Wikipedia infobox — reliable for large public companies */
  wikiEmployeeCount:        number | null;
  /** Headcount from LinkedIn company page ("X employees on LinkedIn") */
  linkedinHeadcount:        number | null;
  /** Headcount inferred from career page text ("We're a team of X") */
  careerPageHeadcount:      number | null;
  /** Headcount from SEC EDGAR 10-K cover page annual filing */
  secEdgarHeadcount:        number | null;
  /** ISO timestamp when SEC EDGAR value was last filed */
  secEdgarFiledAt:          string | null;
  /** Career page: is hiring active (false = freeze detected or no postings) */
  careerHiringActive:       boolean | null;
  /** Career page: raw job posting count */
  careerJobCount:           number | null;
  /** Career page signals (freeze_detected, no_openings, very_low_postings) */
  careerSignals:            string[];
  /** Glassdoor overall company rating (0–5) */
  glassdoorRating:          number | null;
  /** Glassdoor total review count */
  glassdoorReviews:         number | null;
  /** Glassdoor CEO approval % */
  glassdoorCeoApproval:     number | null;
  /** Whether any scraped source returned meaningful data */
  hasData:                  boolean;
  fetchedAt:                string;
  errors:                   string[];
}

export async function fetchScrapedEnrichment(
  companyName: string,
  timeoutMs?: number,
): Promise<ScrapedCompanyEnrichment> {
  const empty: ScrapedCompanyEnrichment = {
    wikiEmployeeCount: null, linkedinHeadcount: null,
    careerPageHeadcount: null, secEdgarHeadcount: null, secEdgarFiledAt: null,
    careerHiringActive: null, careerJobCount: null,
    careerSignals: [], glassdoorRating: null, glassdoorReviews: null,
    glassdoorCeoApproval: null, hasData: false,
    fetchedAt: new Date().toISOString(), errors: [],
  };

  try {
    const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
      body: { action: 'scrape', companyName, timeoutMs },
    });

    if (error) {
      empty.errors.push(`scrape EF: ${error.message}`);
      return empty;
    }

    const sd = data?.scrapeData as {
      careerPage?: {
        hiringActive: boolean;
        jobCount: number | null;
        signals: string[];
        /** "We're a team of X" style inferred headcount. */
        inferredHeadcount?: number | null;
      } | null;
      wikiEmployeeCount?: number | null;
      /** "X employees on LinkedIn" reported by LinkedIn company page. */
      linkedinHeadcount?: number | null;
      /** SEC EDGAR 10-K annual filing headcount. */
      secEdgar?: { headcount: number | null; filedAt: string | null } | null;
      glassdoor?: { rating: number | null; reviewCount: number | null; ceoApproval: number | null } | null;
    } | null;

    if (!sd) return { ...empty, errors: [...empty.errors, 'scrape: no data returned'] };

    const enrichment: ScrapedCompanyEnrichment = {
      wikiEmployeeCount:    sd.wikiEmployeeCount ?? null,
      linkedinHeadcount:    sd.linkedinHeadcount ?? null,
      careerPageHeadcount:  sd.careerPage?.inferredHeadcount ?? null,
      secEdgarHeadcount:    sd.secEdgar?.headcount ?? null,
      secEdgarFiledAt:      sd.secEdgar?.filedAt ?? null,
      careerHiringActive:   sd.careerPage?.hiringActive ?? null,
      careerJobCount:       sd.careerPage?.jobCount ?? null,
      careerSignals:        sd.careerPage?.signals ?? [],
      glassdoorRating:      sd.glassdoor?.rating ?? null,
      glassdoorReviews:     sd.glassdoor?.reviewCount ?? null,
      glassdoorCeoApproval: sd.glassdoor?.ceoApproval ?? null,
      hasData: !!(
        sd.wikiEmployeeCount ||
        sd.linkedinHeadcount ||
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
