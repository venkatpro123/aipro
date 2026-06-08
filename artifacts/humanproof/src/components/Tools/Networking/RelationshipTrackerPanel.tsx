// RelationshipTrackerPanel.tsx — Manual contact tracker stored in career_network_contacts
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  company: string;
  relationship_type: string;
  last_contact_date: string | null;
  notes: string;
}

const RELATIONSHIP_TYPES = ['former_manager', 'peer', 'recruiter', 'mentor', 'sponsor'];

const DAYS_SINCE = (dateStr: string | null): number => {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
};

export function RelationshipTrackerPanel() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', relationship_type: 'peer', last_contact_date: '', notes: '' });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.resolve(
      supabase
        .from('career_network_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ).then(({ data, error }) => {
      if (error) { setFetchError(true); } else { setContacts((data as Contact[]) ?? []); }
      setLoading(false);
    }).catch(() => { setFetchError(true); setLoading(false); });
  }, [user]);

  const save = async () => {
    if (!user || !form.name.trim()) return;
    const { data } = await supabase
      .from('career_network_contacts')
      .insert({ ...form, user_id: user.id, last_contact_date: form.last_contact_date || null })
      .select()
      .single();
    if (data) { setContacts(c => [data as Contact, ...c]); setAdding(false); setForm({ name: '', company: '', relationship_type: 'peer', last_contact_date: '', notes: '' }); }
  };

  const remove = async (id: string) => {
    await supabase.from('career_network_contacts').delete().eq('id', id);
    setContacts(c => c.filter(x => x.id !== id));
  };

  const overdue = contacts.filter(c => DAYS_SINCE(c.last_contact_date) > 90);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Relationship Tracker</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            Track key contacts and stay ahead of outreach timing.
          </div>
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: 13,
          }}
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>New Contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([['name', 'Name *'], ['company', 'Company']] as [keyof typeof form, string][]).map(([k, label]) => (
              <div key={k}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
                <input
                  value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Relationship</div>
              <select
                value={form.relationship_type}
                onChange={e => setForm(f => ({ ...f, relationship_type: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13 }}
              >
                {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Last Contact</div>
              <input
                type="date"
                value={form.last_contact_date}
                onChange={e => setForm(f => ({ ...f, last_contact_date: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Notes</div>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--cyan)', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
          <AlertCircle size={16} color="#ef4444" />
          <span><strong style={{ color: '#ef4444' }}>{overdue.length} contact{overdue.length > 1 ? 's' : ''}</strong> overdue for outreach (90+ days since last contact)</span>
        </div>
      )}

      {/* Contact list */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading contacts…</div>
      ) : fetchError ? (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#ef4444' }}>
          Failed to load contacts. Check your connection and refresh.
        </div>
      ) : contacts.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          No contacts yet. Add your first contact to start tracking your network.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map(c => {
            const daysSince = DAYS_SINCE(c.last_contact_date);
            const isOverdue = daysSince > 90;
            return (
              <div key={c.id} className="card-premium" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: isOverdue ? '1px solid rgba(239,68,68,0.3)' : undefined }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.name}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4 }}>
                      {c.relationship_type?.replace('_', ' ')}
                    </span>
                  </div>
                  {c.company && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{c.company}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: isOverdue ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                    {c.last_contact_date ? `${daysSince}d ago` : 'Never contacted'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`Remove ${c.name} from contacts`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.3)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
