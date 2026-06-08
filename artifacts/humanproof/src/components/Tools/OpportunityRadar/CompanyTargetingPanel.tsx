// CompanyTargetingPanel.tsx — Build a target company list (up to 20)
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Trash2, Star } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface TargetCompany {
  id: string;
  company_name: string;
  opportunity_score: number | null;
  added_at: string;
}

export function CompanyTargetingPanel({ scoreResult }: Props) {
  const { user } = useAuth();
  const [targets, setTargets] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_target_companies')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .then(({ data }) => { setTargets((data as TargetCompany[]) ?? []); setLoading(false); });
  }, [user]);

  const addCompany = async () => {
    if (!user || !input.trim() || targets.length >= 20) return;
    setAdding(true);
    const { data } = await supabase
      .from('user_target_companies')
      .insert({ user_id: user.id, company_name: input.trim() })
      .select()
      .single();
    if (data) setTargets(t => [data as TargetCompany, ...t]);
    setInput('');
    setAdding(false);
  };

  const remove = async (id: string) => {
    await supabase.from('user_target_companies').delete().eq('id', id);
    setTargets(t => t.filter(x => x.id !== id));
  };

  const total = scoreResult.total ?? 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Company Targeting</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Build your target company list. Max 20 companies. Add the companies you most want to work at.
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{targets.length}/20</div>
      </div>

      {/* Context from audit */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
        Your current risk score is <strong style={{ color: total > 65 ? '#ef4444' : total > 40 ? '#f59e0b' : '#10b981' }}>{Math.round(total)}</strong>.{' '}
        {total > 65 ? 'Prioritize companies with stable fundamentals and active hiring.' : 'You have good positioning — target ambitious moves.'}
      </div>

      {/* Add input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCompany()}
          placeholder="Company name (e.g. Stripe, Notion, Figma)"
          disabled={targets.length >= 20}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13,
          }}
        />
        <button
          onClick={addCompany}
          disabled={!input.trim() || targets.length >= 20 || adding}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: targets.length >= 20 ? 'rgba(255,255,255,0.1)' : 'var(--cyan)',
            color: targets.length >= 20 ? 'rgba(255,255,255,0.4)' : '#000',
            fontWeight: 700, fontSize: 13,
          }}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Target list */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading targets…</div>
      ) : targets.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          No target companies yet. Add the companies you want to work at next.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((co, i) => (
            <div key={co.id} className="card-premium" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Star size={14} color={i < 3 ? '#f59e0b' : 'rgba(255,255,255,0.2)'} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{co.company_name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  Added {new Date(co.added_at).toLocaleDateString()}
                  {i < 3 && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>Top priority</span>}
                </div>
              </div>
              <button onClick={() => remove(co.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.3)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
        💡 Research each target company on LinkedIn, Glassdoor, and Levels.fyi before applying.
        Build a warm contact at each company for 5–10× higher interview chances.
      </div>
    </div>
  );
}
