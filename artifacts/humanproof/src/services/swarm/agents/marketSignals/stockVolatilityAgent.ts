// stockVolatilityAgent.ts
// Market Signal — 90-day stock price volatility index.
//
// SECURITY FIX: AlphaVantage is now called via the proxy-live-signals Edge
// Function (server-side). The VITE_ALPHAVANTAGE_KEY is no longer read from
// import.meta.env — that embedded the key in the JS bundle, exposing it to
// anyone who opened DevTools. All stock requests now route through the EF
// which holds the key in Supabase Secrets.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { supabase } from '../../../../utils/supabase';
import { invokeEdgeFunction } from '../../../../infrastructure/requestId';

const heuristicVolatility = (input: SwarmInput): number => {
  const cd = input.companyData;
  const change = cd.stock90DayChange ?? 0;
  if (Math.abs(change) > 30) return 0.90;
  if (Math.abs(change) > 20) return 0.75;
  if (Math.abs(change) > 10) return 0.55;
  if (Math.abs(change) > 5)  return 0.38;
  return 0.25;
};

const mapVolatilityToSignal = (annualisedVol: number): number => {
  if (annualisedVol > 0.60) return 0.95;
  if (annualisedVol > 0.45) return 0.80;
  if (annualisedVol > 0.30) return 0.62;
  if (annualisedVol > 0.20) return 0.42;
  if (annualisedVol > 0.12) return 0.25;
  return 0.12;
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  const ticker = input.companyData.stockTicker ?? (input.companyData as any).ticker ?? null;

  // ── Live path via server-side proxy (no key in browser) ──────────────────
  if (ticker && input.companyData.isPublic) {
    try {
      const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
        body: { action: 'stock', companyName: input.companyName, ticker },
      });

      if (!error && data?.stockData) {
        const sd = data.stockData;

        // Prefer pre-computed annualised volatility when the EF provides it.
        const annualisedVol: number | null = sd.stockVolatility ?? sd.annualisedVolatility ?? null;
        if (annualisedVol !== null && Number.isFinite(annualisedVol)) {
          return {
            agentId:    'stockVolatilityAgent',
            category:   'market',
            signal:     mapVolatilityToSignal(annualisedVol),
            confidence: 0.87,
            sourceType: 'live-api',
            ageInDays:  0,
            metadata:   { ticker, annualisedVol, source: 'proxy-live-signals/YahooFinance' },
          };
        }

        // Fall back to 90-day return from the EF if volatility not available.
        const change90d: number | null = sd.stock90DayChange ?? sd.returnPct90d ?? null;
        if (change90d !== null && Number.isFinite(change90d)) {
          const approxVol = Math.abs(change90d) / 100 / Math.sqrt(90 / 252);
          return {
            agentId:    'stockVolatilityAgent',
            category:   'market',
            signal:     mapVolatilityToSignal(approxVol),
            confidence: 0.78,
            sourceType: 'live-api',
            ageInDays:  0,
            metadata:   { ticker, change90d, approxVol, source: 'proxy-live-signals/YahooFinance', note: 'vol derived from 90d return' },
          };
        }

        if (data.stockData.rateLimited) {
          console.warn('[stockVolatilityAgent] Yahoo Finance rate-limited — heuristic fallback');
        }
      }

      if (error) {
        console.warn('[stockVolatilityAgent] proxy-live-signals error:', error.message);
      }
    } catch (e: any) {
      console.warn('[stockVolatilityAgent] proxy call failed:', e?.message);
    }
  }

  // ── Heuristic fallback (lower confidence explicitly signalled) ────────────
  const signal = heuristicVolatility(input);
  return {
    agentId:    'stockVolatilityAgent',
    category:   'market',
    signal,
    // Confidence is lower when company is public but we could not get live data
    // (suggests rate-limit or key misconfiguration) vs simply being private.
    confidence: input.companyData.isPublic ? 0.42 : 0.30,
    sourceType: 'heuristic',
    ageInDays:  1,
    metadata:   { usedField: 'stock90DayChange', fallback: true, ticker: ticker ?? 'none' },
  };
};

export const stockVolatilityAgent: AgentFn = { id: 'stockVolatilityAgent', run };
