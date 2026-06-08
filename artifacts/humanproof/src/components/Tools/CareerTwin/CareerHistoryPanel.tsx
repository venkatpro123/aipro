// CareerHistoryPanel.tsx — Timeline of past audit scores + completed actions
import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useLayoff } from '../../../context/LayoffContext';
import type { HybridResult } from '../../../types/hybridResult';

interface AuditEntry {
  id: string;
  score: number;
  company: string;
  role: string;
  created_at: string;
}

interface ActionEntry {
  id: string;
  action_text: string;
  completed_at: string;
}

export function CareerHistoryPanel() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('layoff_scores').select('id, score, company_name, role_title, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('action_completions').select('id, action_text, completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(20),
    ]).then(([auditRes, actionRes]) => {
      setAudits(((auditRes.data ?? []) as any[]).map(d => ({ id: d.id, score: d.score, company: d.company_name, role: d.role_title, created_at: d.created_at })));
      setActions(((actionRes.data ?? []) as any[]).map(d => ({ id: d.id, action_text: d.action_text, completed_at: d.completed_at })));
      setLoading(false);
    });
  }, [user]);

  const scoreResult = state.scoreResult as HybridResult | null;
  const currentScore = scoreResult?.total ?? null;

  const allEvents = [
    ...audits.map(a => ({ type: 'audit' as const, date: a.created_at, data: a })),
    ...actions.map(a => ({ type: 'action' as const, date: a.completed_at, data: a })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) return <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0' }}>Loading history…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Career History</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your audit scores, completed actions, and career decisions — in chronological order.
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div className="card-premium" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>TOTAL AUDITS</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--cyan)' }}>{audits.length}</div>
        </div>
        <div className="card-premium" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>ACTIONS DONE</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{actions.length}</div>
        </div>
        {currentScore !== null && audits.length > 1 && (
          <div className="card-premium" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>SCORE DELTA</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: currentScore < audits[audits.length - 1].score ? '#10b981' : '#ef4444' }}>
              {currentScore < audits[audits.length - 1].score ? '↓' : '↑'}{Math.abs(Math.round(currentScore - audits[audits.length - 1].score))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      {allEvents.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>
          No history yet. Complete your first audit to start building your career timeline.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {allEvents.map((ev, i) => (
            <div key={ev.data.id} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', marginTop: 2,
                  background: ev.type === 'audit' ? 'rgba(0,212,255,0.15)' : 'rgba(16,185,129,0.15)',
                  border: `2px solid ${ev.type === 'audit' ? 'rgba(0,212,255,0.4)' : 'rgba(16,185,129,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  {ev.type === 'audit' ? '📊' : '✓'}
                </div>
                {i < allEvents.length - 1 && <div style={{ width: 2, height: 32, background: 'rgba(255,255,255,0.06)', marginTop: 2 }} />}
              </div>
              <div style={{ paddingTop: 4, paddingBottom: 24, flex: 1 }}>
                {ev.type === 'audit' ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                      Audit: {(ev.data as AuditEntry).company} · <span style={{ color: (ev.data as AuditEntry).score > 65 ? '#ef4444' : (ev.data as AuditEntry).score > 40 ? '#f59e0b' : '#10b981' }}>Score {Math.round((ev.data as AuditEntry).score)}</span>
                    </div>
                    {(ev.data as AuditEntry).role && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{(ev.data as AuditEntry).role}</div>}
                  </>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>
                    ✓ {(ev.data as ActionEntry).action_text}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                  {new Date(ev.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
