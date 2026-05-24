// piprAgent.ts
// Market Signal — Public Interest / Press mentions sentiment.
//
// NewsAPI direct calls removed (exposed VITE_ key in browser bundle).
// Now routes through proxy-live-signals EF action=news — same pattern as
// recentLayoffAgent and costCuttingAgent. Falls back to heuristic on EF error.

import { AgentFn, AgentSignal, SwarmInput } from '../../swarmTypes';
import { invokeEdgeFunction } from '../../../../infrastructure/requestId';

const NEGATIVE_KEYWORDS = ['layoff', 'fired', 'bankrupt', 'debt', 'loss', 'decline', 'cut', 'crisis', 'restructur', 'downsize'];
const POSITIVE_KEYWORDS = ['growth', 'profit', 'expansion', 'hiring', 'record', 'milestone', 'invest'];

const heuristicPIPR = (input: SwarmInput): number => {
  const layoffs = input.companyData.layoffsLast24Months ?? [];
  if (layoffs.length >= 3) return 0.75;
  if (layoffs.length === 2) return 0.58;
  if (layoffs.length === 1) return 0.42;
  return 0.25;
};

const scoreSentiment = (articles: any[]): number => {
  if (articles.length === 0) return 0.30;
  let negCount = 0;
  let posCount = 0;
  for (const a of articles) {
    const text = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase();
    NEGATIVE_KEYWORDS.forEach(kw => { if (text.includes(kw)) negCount++; });
    POSITIVE_KEYWORDS.forEach(kw => { if (text.includes(kw)) posCount++; });
  }
  const total = negCount + posCount;
  if (total === 0) return 0.30;
  const negRatio = negCount / total;
  if (negRatio > 0.75) return 0.88;
  if (negRatio > 0.55) return 0.70;
  if (negRatio > 0.40) return 0.52;
  if (negRatio > 0.25) return 0.38;
  return 0.20;
};

const run = async (input: SwarmInput): Promise<AgentSignal> => {
  try {
    const { data, error } = await invokeEdgeFunction<any>('proxy-live-signals', {
      body: { action: 'news', companyName: input.companyName },
    });

    if (!error && data?.newsData) {
      const articles: any[] = data.newsData.articles ?? data.newsData.items ?? [];
      const signal = scoreSentiment(articles);
      return {
        agentId:    'piprAgent',
        category:   'market',
        signal,
        confidence: 0.65,
        sourceType: 'live-api',
        ageInDays:  0,
        metadata:   { articles: articles.length, windowDays: 30, source: 'proxy-live-signals/RSS' },
      };
    }
  } catch (e: any) {
    console.warn('[piprAgent] EF proxy failed:', e?.message);
  }

  const signal = heuristicPIPR(input);
  return {
    agentId:    'piprAgent',
    category:   'market',
    signal,
    confidence: 0.40,
    sourceType: 'heuristic',
    ageInDays:  7,
    metadata:   { fallback: true },
  };
};

export const piprAgent: AgentFn = { id: 'piprAgent', run };
