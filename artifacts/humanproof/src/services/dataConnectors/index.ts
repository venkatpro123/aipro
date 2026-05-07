// dataConnectors/index.ts
// Unified data connector orchestrator — combines BSE, NSE, layoffs.fyi, MCA, Naukri, RSS.
// All sources are free-tier; degrades gracefully when unavailable.

import { fetchBSECompanyData, findBSEScripCode } from './bseConnector';
import { fetchNSECompanyData, deriveRangePositionFromNSE } from './nsConnector';
import { getCompanyLayoffs, getSectorLayoffCount, isLayoffsDatasetAvailable } from './layoffsFyiConnector';
import { fetchMCACompanyInfo } from './mcaConnector';
import { fetchRoleDemandSignal } from './naukriConnector';
import { fetchCompanyNewsSignals } from './rssNewsConnector';
import { fetchIndiaPressSignals } from './indiaPressConnector';
import { fetchSecEdgar8KSignals } from './secEdgarConnector';
import { fetchWarnNotices } from './warnActConnector';

export interface EnrichedCompanySignals {
  companyName: string;
  // Financial
  /** True 90-day stock return (%). Null when no chart-grade source produced one. */
  stock90DayChange: number | null;
  /** Current price's position in the 52-week range, normalised to [-1, +1]. */
  rangePosition52w: number | null;
  revenueYoY: number | null;
  marketCapCr: number | null;
  peRatio: number | null;
  // Layoff
  confirmedLayoffRounds: number;
  mostRecentLayoffDate: string | null;
  mostRecentLayoffPct: number | null;
  sectorLayoff180d: number;           // peer companies laid off in 180 days
  /** Whether the layoffs dataset endpoint responded — distinguishes "no rows
   *  for this company" from "could not reach the dataset". */
  layoffsDatasetAvailable: boolean;
  // Corporate health
  mcaStatus: 'Active' | 'Struck Off' | 'Under Liquidation' | 'Dissolved' | 'Unknown';
  filingDelinquent: boolean;
  // Demand
  roleDemandTrend: 'rising' | 'stable' | 'falling';
  hiringFreezeScore: number;
  /**
   * `true` only when role-demand values came from a live API (Serper).
   * `false` when they came from `ROLE_DEMAND_BASE` static priors. Surface this
   * to the UI so heuristic baselines aren't presented as live job-market data.
   */
  roleDemandIsLive: boolean;
  /** Estimated open postings for this role at this company. Null when the
   *  Serper API did not run via proxy-live-signals. */
  estimatedOpenings: number | null;
  /** Naukri-specific count from Serper. Null when not live. */
  naukriOpenings: number | null;
  /** LinkedIn-specific count from Serper. Null when not live. */
  linkedinOpenings: number | null;
  // News sentiment
  newsSentimentScore: number;
  layoffNewsCount: number;
  // India press (moneycontrol/livemint/Inc42/YourStory/BS) — supplements RSS
  indiaPressLayoffCount: number;
  indiaPressSentimentScore: number;
  indiaPressReachable: boolean;
  // SEC EDGAR 8-K filings (US public companies)
  secEdgar8kLayoffFilings: number;
  secEdgarMostRecentFiling: string | null;
  secEdgarReachable: boolean;
  // WARN Act notices (US state filings)
  warnNoticeCount: number;
  warnAffectedTotal: number;
  warnMostRecentFiling: string | null;
  warnDatasetReachable: boolean;
  // Meta
  sourcesUsed: string[];
  fetchedAt: string;
}

export async function enrichCompanySignals(
  companyName: string,
  roleTitle: string,
  industry: string,
): Promise<EnrichedCompanySignals> {
  const sourcesUsed: string[] = [];

  // Run all 8 connectors in parallel using Promise.allSettled.
  //
  // WHY allSettled instead of Promise.all:
  //   Promise.all fails fast — if connector 3 throws, connectors 4-8 results are
  //   discarded even if they completed successfully. With 8 independent network
  //   sources, this is unacceptable: a Naukri site change shouldn't abort the
  //   BSE, MCA, RSS, and SEC EDGAR results that may have already resolved.
  //
  //   Promise.allSettled always collects every result regardless of individual
  //   failures. Rejected slots become { status: 'rejected', reason: Error } and
  //   we substitute the appropriate null/fallback value below.
  //
  // This is the correct primitive for a "best-effort multi-source enrichment"
  // pattern. Each connector is independently optional; none is on the critical path.
  const settled = await Promise.allSettled([
    findBSEScripCode(companyName),       // 0: bseCode
    getCompanyLayoffs(companyName),      // 1: layoffData
    fetchMCACompanyInfo(companyName),    // 2: mcaData
    fetchRoleDemandSignal(roleTitle, companyName), // 3: roleData
    fetchCompanyNewsSignals(companyName), // 4: newsData
    fetchIndiaPressSignals(companyName), // 5: indiaPressData
    fetchSecEdgar8KSignals(companyName), // 6: secData
    fetchWarnNotices(companyName),       // 7: warnData
  ]);

  // Extract values — rejected connectors fall back to null or their empty-state type.
  // Log rejections so they appear in production logs but never abort the pipeline.
  const unwrap = <T>(result: PromiseSettledResult<T>, name: string, fallback: T): T => {
    if (result.status === 'fulfilled') return result.value;
    console.warn(`[Connectors] ${name} failed:`, (result as PromiseRejectedResult).reason?.message ?? result);
    return fallback;
  };

  const bseCode       = unwrap(settled[0], 'findBSEScripCode',       null);
  const layoffData    = unwrap(settled[1], 'getCompanyLayoffs',       null);
  const mcaData       = unwrap(settled[2], 'fetchMCACompanyInfo',     null);
  const roleData      = unwrap(settled[3], 'fetchRoleDemandSignal',   { roleTitle, company: companyName, estimatedOpenings: null, naukriOpenings: null, linkedinOpenings: null, demandTrend: 'stable' as const, hiringFreezeScore: 0.35, source: 'Naukri Heuristic' as const, isLive: false, disclosure: 'Connector failed — heuristic baseline used', fetchedAt: new Date().toISOString() });
  const newsData      = unwrap(settled[4], 'fetchCompanyNewsSignals', { company: companyName, signals: [], negativeCount: 0, layoffSignalCount: 0, sentimentScore: 0, fetchedAt: new Date().toISOString() });
  const indiaPressData = unwrap(settled[5], 'fetchIndiaPressSignals', { company: companyName, signals: [], layoffSignalCount: 0, sentimentScore: 0, sourcesUsed: [], anyFeedReachable: false, fetchedAt: new Date().toISOString() });
  const secData       = unwrap(settled[6], 'fetchSecEdgar8KSignals',  { company: companyName, filingCount: 0, distinctEventDates: 0, mostRecentFiling: null, hits: [], edgarReachable: false, fetchedAt: new Date().toISOString() });
  const warnData      = unwrap(settled[7], 'fetchWarnNotices',        { company: companyName, notices: [], totalAffected: 0, mostRecentFiling: null, warnDataReachable: false, sourceUrl: null, fetchedAt: new Date().toISOString() });

  // BSE + NSE — attempt after scrip code resolved.
  // We track stock90DayChange (true quarterly return — null until a real chart
  // API is wired up) separately from rangePosition52w (current price vs 52-week
  // range), so the scoring engine doesn't conflate price *level* with price
  // *change*. Both connectors only expose the 52-week endpoints today, so the
  // stock90DayChange field stays null and the orchestrator should fall back to
  // the proxy-live-signals Supabase Edge Function (Yahoo v8 chart) for tickers.
  let stock90d: number | null = null;
  let rangePosition52w: number | null = null;
  const revenueYoY: number | null = null;
  let marketCap: number | null = null;
  let pe: number | null = null;

  if (bseCode) {
    const bse = await fetchBSECompanyData(bseCode);
    if (bse) {
      stock90d = bse.stock90DayChange; // currently null — see comment above
      rangePosition52w = bse.stock52wRangePosition;
      marketCap = bse.marketCap;
      pe = bse.peRatio;
      sourcesUsed.push('BSE India');
    }
  }

  // NSE — supplements with range-position when BSE failed
  if (rangePosition52w === null) {
    const nseTicker = companyName.toUpperCase().replace(/\s+/g, '');
    const nse = await fetchNSECompanyData(nseTicker);
    if (nse) {
      rangePosition52w = deriveRangePositionFromNSE(nse);
      pe = pe ?? nse.pe;
      sourcesUsed.push('NSE India');
    }
  }

  // Track layoffs.fyi availability separately from "found a row for this
  // company" — a clean DB and an unreachable DB look identical to a naive
  // caller, but they should produce different confidence levels.
  const layoffsAvailable = await isLayoffsDatasetAvailable();
  if (layoffData) sourcesUsed.push('layoffs.fyi');
  if (mcaData && mcaData.cin !== 'UNKNOWN' && mcaData.status !== 'Unknown') {
    sourcesUsed.push('MCA India');
  }
  sourcesUsed.push(roleData.source);
  if (newsData.signals.length > 0) sourcesUsed.push('News RSS/HN');
  if (indiaPressData.signals.length > 0) {
    for (const src of indiaPressData.sourcesUsed) sourcesUsed.push(`IndiaPress:${src}`);
  }
  if (secData.filingCount > 0) sourcesUsed.push('SEC EDGAR 8-K');
  if (warnData.notices.length > 0) sourcesUsed.push('WARN Act');

  const sectorCount = await getSectorLayoffCount(industry, 180);

  return {
    companyName,
    stock90DayChange: stock90d,
    rangePosition52w,
    revenueYoY,
    marketCapCr: marketCap,
    peRatio: pe,
    confirmedLayoffRounds: layoffData?.rounds ?? 0,
    mostRecentLayoffDate: layoffData?.mostRecentDate ?? null,
    mostRecentLayoffPct: layoffData?.mostRecentPct ?? null,
    sectorLayoff180d: sectorCount,
    layoffsDatasetAvailable: layoffsAvailable,
    mcaStatus: mcaData?.status ?? 'Unknown',
    filingDelinquent: mcaData?.filingDelinquent ?? false,
    roleDemandTrend: roleData.demandTrend,
    hiringFreezeScore: roleData.hiringFreezeScore,
    roleDemandIsLive: roleData.isLive,
    estimatedOpenings: roleData.estimatedOpenings,
    naukriOpenings:   (roleData as any).naukriOpenings   ?? null,
    linkedinOpenings: (roleData as any).linkedinOpenings ?? null,
    newsSentimentScore: newsData.sentimentScore,
    layoffNewsCount: newsData.layoffSignalCount,
    indiaPressLayoffCount: indiaPressData.layoffSignalCount,
    indiaPressSentimentScore: indiaPressData.sentimentScore,
    indiaPressReachable: indiaPressData.anyFeedReachable,
    secEdgar8kLayoffFilings: secData.filingCount,
    secEdgarMostRecentFiling: secData.mostRecentFiling,
    secEdgarReachable: secData.edgarReachable,
    warnNoticeCount: warnData.notices.length,
    warnAffectedTotal: warnData.totalAffected,
    warnMostRecentFiling: warnData.mostRecentFiling,
    warnDatasetReachable: warnData.warnDataReachable,
    sourcesUsed,
    fetchedAt: new Date().toISOString(),
  };
}
