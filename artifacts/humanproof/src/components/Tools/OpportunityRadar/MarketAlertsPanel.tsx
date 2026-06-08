// MarketAlertsPanel.tsx — Rule-based market opportunity alerts from breaking_news_events
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { Bell, TrendingUp, Zap } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface MarketAlert {
  id: string;
  type: 'HIRING' | 'FUNDING' | 'EXPANSION' | 'OPPORTUNITY';
  company: string;
  headline: string;
  date: string;
  icon: typeof Bell;
  color: string;
}

const RULE_MAP = [
  { keywords: ['raised', 'funding', 'series', 'investment', 'million', 'billion'], type: 'FUNDING' as const, icon: Zap, color: '#a78bfa' },
  { keywords: ['hiring', 'expansion', 'open roles', 'headcount'], type: 'HIRING' as const, icon: TrendingUp, color: '#10b981' },
  { keywords: ['expanding', 'new office', 'new market', 'launch'], type: 'EXPANSION' as const, icon: Bell, color: '#f59e0b' },
];

export function MarketAlertsPanel({ scoreResult }: Props) {
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const market = scoreResult.roleMarketDemand;

  useEffect(() => {
    supabase
      .from('breaking_news_events')
      .select('id, company_name, headline, published_at')
      .order('published_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const parsed: MarketAlert[] = [];
        for (const row of data ?? []) {
          const headline = (row.headline ?? '').toLowerCase();
          const rule = RULE_MAP.find(r => r.keywords.some(k => headline.includes(k)));
          if (!rule) continue;
          parsed.push({
            id: row.id,
            type: rule.type,
            company: row.company_name,
            headline: row.headline,
            date: row.published_at ? new Date(row.published_at).toLocaleDateString() : '',
            icon: rule.icon,
            color: rule.color,
          });
          if (parsed.length >= 20) break;
        }
        setAlerts(parsed);
        setLoading(false);
      }, () => setLoading(false));
  }, []);

  const grouped = {
    FUNDING:   alerts.filter(a => a.type === 'FUNDING'),
    HIRING:    alerts.filter(a => a.type === 'HIRING'),
    EXPANSION: alerts.filter(a => a.type === 'EXPANSION'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Market Alerts</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Live opportunity signals: funding rounds, hiring surges, and market expansions in your orbit.
        </div>
      </div>

      {/* Role context */}
      {market && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          Tracking opportunities relevant to: <strong style={{ color: 'var(--cyan)' }}>{market.snapshot?.roleName ?? 'Your Role'}</strong>
          {' '}· Demand index <strong style={{ color: 'var(--cyan)' }}>{Math.round(market.adjustedDemandIndex)}</strong>
          {market._staleMonths && market._staleMonths > 3 && (
            <span style={{ marginLeft: 8, color: '#f59e0b' }}>· Data {market._staleMonths}mo old</span>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Loading market alerts…</div>
      ) : alerts.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
          No market opportunity alerts at this time. Check back after the next news refresh.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(['FUNDING', 'HIRING', 'EXPANSION'] as const).map(type => {
            const items = grouped[type];
            if (items.length === 0) return null;
            const rule = RULE_MAP.find(r => r.type === type)!;
            const Icon = rule.icon;
            return (
              <div key={type}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Icon size={14} color={rule.color} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: rule.color }}>{type} ({items.length})</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.slice(0, 6).map((alert, i) => (
                    <div key={i} className="card-premium" style={{ padding: '12px 16px', borderLeft: `2px solid ${rule.color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{alert.company}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{alert.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.4 }}>{alert.headline}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
        * Alerts sourced from public news. Funding = growth hiring likely within 60–90 days.
      </div>
    </div>
  );
}
