// HiringDetectionPanel.tsx — Companies actively hiring from breaking_news_events + headcount signals
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { TrendingUp } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface HiringSignal {
  company: string;
  signal: string;
  date: string;
  source: string;
}

const HIRING_KEYWORDS = ['hiring', 'expansion', 'new roles', 'headcount', 'growing team', 'open positions', 'recruiter'];

export function HiringDetectionPanel({ scoreResult }: Props) {
  const [signals, setSignals] = useState<HiringSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const hv = scoreResult.headcountVelocity;

  useEffect(() => {
    supabase
      .from('breaking_news_events')
      .select('company_name, headline, published_at, source_url')
      .or(HIRING_KEYWORDS.map(k => `headline.ilike.%${k}%`).join(','))
      .order('published_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setSignals((data ?? []).map((d: any) => ({
          company: d.company_name,
          signal: d.headline,
          date: d.published_at ? new Date(d.published_at).toLocaleDateString() : 'Unknown',
          source: d.source_url ? new URL(d.source_url).hostname.replace('www.', '') : 'Unknown',
        })));
        setLoading(false);
      }, () => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Hiring Detection</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Companies with active hiring signals detected from news and market data.
        </div>
      </div>

      {/* Your company's hiring velocity */}
      {hv && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>Your Company's Hiring Velocity</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>HEADCOUNT TREND</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: hv.headcountTrend === 'GROWING' ? '#10b981' : hv.headcountTrend === 'DECLINING' || hv.headcountTrend === 'DECLINING_SHARPLY' ? '#ef4444' : '#f59e0b' }}>
                {hv.headcountTrend}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>POSTING VELOCITY</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{hv.postingVelocity}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>NET MOMENTUM</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: hv.netHeadcountMomentum === 'POSITIVE' ? '#10b981' : hv.netHeadcountMomentum === 'NEGATIVE' ? '#ef4444' : '#f59e0b' }}>
                {hv.netHeadcountMomentum}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live hiring signals */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Loading hiring signals…</div>
      ) : signals.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
          No active hiring signals in the feed right now. Check back after the next news refresh.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {signals.map((sig, i) => (
            <div key={i} className="card-premium" style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <TrendingUp size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{sig.company}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{sig.date}</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.4 }}>{sig.signal}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>via {sig.source}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
