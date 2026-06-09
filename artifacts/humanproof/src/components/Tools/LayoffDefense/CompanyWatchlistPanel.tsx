// CompanyWatchlistPanel.tsx — Watchlist with company intelligence profiles
import { useState, useEffect } from 'react';
import { Plus, X, Building, AlertTriangle, CheckCircle } from 'lucide-react';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../../../services/monitoringService';
import { supabase } from '../../../utils/supabase';

interface CompanySignal {
  company_name: string;
  headline: string;
  confidence: string;
  event_date: string;
}

interface CompanyIntelligence {
  company_name: string;
  recent_layoff_count: number | null;
  total_open_roles: number | null;
  hiring_velocity_score: number | null;
  market_cap_usd: number | null;
  confidence_score: number | null;
  is_public: boolean | null;
  data_quality_tier: string | null;
}

// Derive a simple stability tier from intelligence data
function getStabilityTier(ci: CompanyIntelligence): {
  label: string; color: string; bg: string; border: string;
} {
  const layoffs = ci.recent_layoff_count ?? 0;
  const hiring  = ci.hiring_velocity_score ?? 0.5;

  if (layoffs > 2 || hiring < 0.2)
    return { label: 'At Risk',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)' };
  if (layoffs > 0 || hiring < 0.5)
    return { label: 'Caution',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
  if (hiring >= 0.7)
    return { label: 'Hiring',   color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
  return   { label: 'Stable',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)' };
}

function formatMarketCap(usd: number | null): string {
  if (!usd) return '—';
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(1)}T`;
  if (usd >= 1e9)  return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6)  return `$${(usd / 1e6).toFixed(0)}M`;
  return `$${usd.toLocaleString()}`;
}

export function CompanyWatchlistPanel() {
  const [watchlist,    setWatchlist]    = useState<string[]>([]);
  const [signals,      setSignals]      = useState<CompanySignal[]>([]);
  const [intelligence, setIntelligence] = useState<CompanyIntelligence[]>([]);
  const [newCompany,   setNewCompany]   = useState('');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [expandedCo,   setExpandedCo]   = useState<string | null>(null);

  useEffect(() => {
    getWatchlist()
      .then(list => {
        setWatchlist(list);
        setLoading(false);
        if (list.length > 0) {
          fetchSignals(list);
          fetchIntelligence(list);
        }
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  async function fetchSignals(list: string[]) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from('breaking_news_events')
      .select('company_name, headline, confidence, event_date')
      .in('company_name', list)
      .gte('event_date', sevenDaysAgo)
      .order('event_date', { ascending: false })
      .limit(20);
    setSignals((data as CompanySignal[]) ?? []);
  }

  async function fetchIntelligence(list: string[]) {
    const { data } = await supabase
      .from('verified_company_intelligence')
      .select('company_name, recent_layoff_count, total_open_roles, hiring_velocity_score, market_cap_usd, confidence_score, is_public, data_quality_tier')
      .in('company_name', list)
      .limit(10);
    setIntelligence((data as CompanyIntelligence[]) ?? []);
  }

  async function handleAdd() {
    const name = newCompany.trim();
    if (!name || watchlist.includes(name) || watchlist.length >= 5) return;
    await addToWatchlist(name);
    const updated = [...watchlist, name];
    setWatchlist(updated);
    setNewCompany('');
    fetchSignals(updated);
    fetchIntelligence(updated);
  }

  async function handleRemove(name: string) {
    await removeFromWatchlist(name);
    const updated = watchlist.filter(c => c !== name);
    setWatchlist(updated);
    setSignals(signals.filter(s => s.company_name !== name));
    setIntelligence(intelligence.filter(ci => ci.company_name !== name));
  }

  const intelligenceMap = Object.fromEntries(intelligence.map(ci => [ci.company_name, ci]));

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Company Watchlist
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Track up to 5 companies. See their stability, hiring activity, and layoff signals.
        </div>
      </div>

      {/* Add company */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={newCompany}
          onChange={e => setNewCompany(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a company (e.g. Google, Infosys…)"
          disabled={watchlist.length >= 5}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 14px',
            color: 'var(--text)',
            fontSize: 14,
          }}
        />
        <button
          onClick={handleAdd}
          disabled={watchlist.length >= 5 || !newCompany.trim()}
          style={{
            background: '#ef4444', border: 'none', borderRadius: 8,
            padding: '10px 16px', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600,
            opacity: watchlist.length >= 5 || !newCompany.trim() ? 0.5 : 1,
          }}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
          Failed to load watchlist. Check your connection and try refreshing.
        </div>
      )}

      {watchlist.length === 0 && !loading && !error && (
        <div style={{
          textAlign: 'center', padding: '40px 24px',
          background: 'rgba(255,255,255,0.02)', borderRadius: 12,
          border: '1px dashed var(--border)', color: 'rgba(255,255,255,0.4)', fontSize: 14,
        }}>
          <Building size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Add companies to monitor their stability and layoff signals</div>
        </div>
      )}

      {/* ── Company intelligence cards ──────────────────────────────────────── */}
      {watchlist.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
            COMPANY INTELLIGENCE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {watchlist.map(co => {
              const ci = intelligenceMap[co];
              const stability = ci ? getStabilityTier(ci) : null;
              const expanded  = expandedCo === co;

              return (
                <div key={co} className="card-premium" style={{ overflow: 'hidden' }}>
                  {/* Header row */}
                  <button
                    type="button"
                    onClick={() => setExpandedCo(expanded ? null : co)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {/* Stability badge */}
                    {stability ? (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                        background: stability.bg, border: `1px solid ${stability.border}`, color: stability.color,
                        letterSpacing: '0.06em', flexShrink: 0,
                      }}>
                        {stability.label}
                      </span>
                    ) : (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 9,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.3)', flexShrink: 0,
                      }}>
                        No data
                      </span>
                    )}

                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{co}</span>

                    {/* Quick stats */}
                    {ci && (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, monospace)', flexShrink: 0 }}>
                        {ci.total_open_roles != null ? `${ci.total_open_roles.toLocaleString()} roles` : '—'}
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleRemove(co); }}
                      aria-label={`Remove ${co} from watchlist`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', lineHeight: 1, padding: 0, flexShrink: 0 }}
                    >
                      <X size={14} />
                    </button>

                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      {expanded ? '▲' : '▾'}
                    </span>
                  </button>

                  {/* Expanded intelligence detail */}
                  {expanded && ci && (
                    <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginTop: 12 }}>
                        {[
                          {
                            label: 'Market Cap',
                            value: formatMarketCap(ci.market_cap_usd),
                            color: 'rgba(255,255,255,0.7)',
                          },
                          {
                            label: 'Open Roles',
                            value: ci.total_open_roles != null ? ci.total_open_roles.toLocaleString() : '—',
                            color: ci.total_open_roles && ci.total_open_roles > 500 ? '#10b981' : 'rgba(255,255,255,0.7)',
                          },
                          {
                            label: 'Hiring Velocity',
                            value: ci.hiring_velocity_score != null ? `${Math.round(ci.hiring_velocity_score * 100)}%` : '—',
                            color: ci.hiring_velocity_score != null
                              ? ci.hiring_velocity_score >= 0.6 ? '#10b981'
                              : ci.hiring_velocity_score < 0.3 ? '#ef4444' : '#f59e0b'
                              : 'rgba(255,255,255,0.7)',
                          },
                          {
                            label: 'Recent Layoffs',
                            value: ci.recent_layoff_count != null ? `${ci.recent_layoff_count} rounds` : '—',
                            color: ci.recent_layoff_count && ci.recent_layoff_count > 0 ? '#ef4444' : '#10b981',
                          },
                          {
                            label: 'Data Quality',
                            value: ci.data_quality_tier ?? '—',
                            color: 'rgba(255,255,255,0.5)',
                          },
                        ].map(stat => (
                          <div key={stat.label} style={{
                            padding: '10px 12px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: '0.07em', marginBottom: 4 }}>
                              {stat.label.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: stat.color, fontFamily: 'var(--font-mono, monospace)' }}>
                              {stat.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Confidence footer */}
                      {ci.confidence_score != null && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                          Data confidence: {Math.round(ci.confidence_score * 100)}%
                          {ci.is_public === false && ' · Private company — data may be estimated'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded but no intelligence found */}
                  {expanded && !ci && (
                    <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                      No intelligence profile found. The company may not be in our database yet.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent signals ──────────────────────────────────────────────────── */}
      {signals.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
            RECENT SIGNALS (7 days)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signals.map((s, i) => (
              <div key={i} className="card-premium" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  {s.confidence === 'high'
                    ? <AlertTriangle size={16} color="#ef4444" />
                    : <CheckCircle size={16} color="#f59e0b" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 2 }}>{s.headline}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {s.company_name} · {s.event_date} · confidence: {s.confidence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {watchlist.length > 0 && signals.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          <CheckCircle size={28} style={{ marginBottom: 10, color: '#10b981' }} />
          <div>No layoff signals detected in the past 7 days for your watchlist.</div>
        </div>
      )}
    </div>
  );
}
