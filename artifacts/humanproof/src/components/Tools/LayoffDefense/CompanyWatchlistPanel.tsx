// CompanyWatchlistPanel.tsx — Watchlist manager with live signal display
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

export function CompanyWatchlistPanel() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [signals, setSignals] = useState<CompanySignal[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatchlist().then(list => {
      setWatchlist(list);
      setLoading(false);
      if (list.length > 0) fetchSignals(list);
    });
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

  async function handleAdd() {
    const name = newCompany.trim();
    if (!name || watchlist.includes(name) || watchlist.length >= 5) return;
    await addToWatchlist(name);
    const updated = [...watchlist, name];
    setWatchlist(updated);
    setNewCompany('');
    fetchSignals(updated);
  }

  async function handleRemove(name: string) {
    await removeFromWatchlist(name);
    const updated = watchlist.filter(c => c !== name);
    setWatchlist(updated);
    setSignals(signals.filter(s => s.company_name !== name));
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Company Watchlist
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Track up to 5 companies for layoff signals. Updated daily.
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
            background: '#ef4444',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            opacity: watchlist.length >= 5 || !newCompany.trim() ? 0.5 : 1,
          }}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {watchlist.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '40px 24px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: '1px dashed var(--border)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
        }}>
          <Building size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div>Add companies to monitor their layoff signals</div>
        </div>
      )}

      {/* Watchlist chips */}
      {watchlist.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {watchlist.map(co => (
            <div key={co} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 13,
              color: 'var(--text)',
            }}>
              {co}
              <button
                onClick={() => handleRemove(co)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', lineHeight: 1 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 10 }}>
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
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
        }}>
          <CheckCircle size={28} style={{ marginBottom: 10, color: '#10b981' }} />
          <div>No layoff signals detected in the past 7 days for your watchlist.</div>
        </div>
      )}
    </div>
  );
}
