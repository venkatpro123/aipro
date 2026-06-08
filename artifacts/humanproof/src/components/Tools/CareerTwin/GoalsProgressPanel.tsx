// GoalsProgressPanel.tsx — Career goals tracker stored in user_profiles.career_goals
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Trash2, Check } from 'lucide-react';

interface Goal {
  id: string;
  type: 'role' | 'comp' | 'company' | 'skill' | 'other';
  title: string;
  targetDate: string;
  progress: number;
  completed: boolean;
}

const GOAL_TYPES = ['role', 'comp', 'company', 'skill', 'other'] as const;
const TYPE_LABELS: Record<string, string> = { role: '🎯 Role', comp: '💰 Comp', company: '🏢 Company', skill: '📚 Skill', other: '✨ Other' };

export function GoalsProgressPanel() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Goal, 'id' | 'completed'>>({ type: 'role', title: '', targetDate: '', progress: 0 });

  const loadGoals = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_profiles').select('career_goals').eq('user_id', user.id).single();
    setGoals((data?.career_goals as Goal[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadGoals(); }, [user]);

  const saveGoals = async (updated: Goal[]) => {
    if (!user) return;
    await supabase.from('user_profiles').upsert({ user_id: user.id, career_goals: updated }, { onConflict: 'user_id' });
  };

  const addGoal = async () => {
    if (!form.title.trim()) return;
    const newGoal: Goal = { ...form, id: crypto.randomUUID(), completed: false };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await saveGoals(updated);
    setAdding(false);
    setForm({ type: 'role', title: '', targetDate: '', progress: 0 });
  };

  const updateProgress = async (id: string, progress: number) => {
    const updated = goals.map(g => g.id === id ? { ...g, progress, completed: progress >= 100 } : g);
    setGoals(updated);
    await saveGoals(updated);
  };

  const removeGoal = async (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    await saveGoals(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Goals & Progress</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Track your career goals and measure progress toward each one.
          </div>
        </div>
        <button onClick={() => setAdding(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: 13 }}>
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {adding && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>New Goal</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>TYPE</div>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Goal['type'] }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: 'var(--text)', fontSize: 13 }}>
                {GOAL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>TARGET DATE</div>
              <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>GOAL *</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Get promoted to Staff Engineer by Dec 2026" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={addGoal} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>Loading goals…</div>
      ) : goals.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
          No career goals set yet. Add your first goal to start tracking progress.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map(g => (
            <div key={g.id} className="card-premium" style={{ padding: 18, opacity: g.completed ? 0.65 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {g.completed && <Check size={14} color="#10b981" />}
                    <span style={{ fontWeight: 600, fontSize: 14, color: g.completed ? '#10b981' : 'var(--text)', textDecoration: g.completed ? 'line-through' : 'none' }}>{g.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {TYPE_LABELS[g.type]}{g.targetDate && ` · Target: ${new Date(g.targetDate).toLocaleDateString()}`}
                  </div>
                </div>
                <button onClick={() => removeGoal(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.3)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={g.progress}
                  onChange={e => updateProgress(g.id, parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--cyan)' }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: g.completed ? '#10b981' : 'var(--cyan)', minWidth: 36, textAlign: 'right' }}>{g.progress}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${g.progress}%`, background: g.completed ? '#10b981' : 'var(--cyan)', transition: 'width 0.3s' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
