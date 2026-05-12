// costCuttingAgent.ts
// Company Signal — Real cost-cutting and hiring freeze language in news.
// SECURE: NewsAPI is called via the proxy-live-signals Edge Function (server-side).
// No VITE_NEWSAPI_KEY in the browser bundle.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { supabase } from '../../../../utils/supabase';

const COST_TERMS = ['hiring freeze', 'cost cut', 'belt tighten', 'spending cut', 'budget cut', 'slash costs', 'cost reduction'];

const hasCostLanguage = (title: string, description: string): boolean => {
  const text = `${title} ${description}`.toLowerCase();
  return COST_TERMS.some(term => text.includes(term));
};

const heuristicCostCut = (input: SwarmInput): number => {
  const cd = input.companyData;
  const revenueDecline = (cd.revenueGrowthYoY ?? 0) < -5;
  const hasLayoffs     = (cd.layoffsLast24Months?.length ?? 0) > 0;
  const stockDrop      = (cd.stock90DayChange ?? 0) < -15;

  const signals = [revenueDecline, hasLayoffs, stockDrop].filter(Boolean).length;
  if (signals >= 3) return 0.85;
  if (signals === 2) return 0.65;
  if (signals === 1) return 0.42;
  return 0.20;
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  try {
    const { data, error } = await supabase.functions.invoke('proxy-live-signals', {
      body: { action: 'news', companyName: input.companyName },
    });

    if (!error && data?.newsData) {
      const articles: any[] = data.newsData.articles ?? data.newsData.items ?? [];
      const costArticles = articles.filter(a => hasCostLanguage(a.title ?? '', a.description ?? a.content ?? ''));
      const count = costArticles.length;

      let signal: number;
      if (count >= 5)      signal = 0.90;
      else if (count >= 3) signal = 0.72;
      else if (count >= 1) signal = 0.52;
      else                 signal = 0.15;

      return {
        agentId:    'costCuttingAgent',
        category:   'company',
        signal,
        confidence: 0.78,
        sourceType: 'live-api',
        ageInDays:  0,
        metadata:   { articlesFound: count, totalFetched: articles.length, windowDays: 30 },
      };
    }
  } catch (e: any) {
    console.warn('[costCuttingAgent] proxy failed:', e.message);
  }

  const signal = heuristicCostCut(input);
  return {
    agentId:    'costCuttingAgent',
    category:   'company',
    signal,
    confidence: 0.55,
    sourceType: 'heuristic',
    ageInDays:  7,
    metadata:   { fallback: true },
  };
};

export const costCuttingAgent: AgentFn = { id: 'costCuttingAgent', run };
