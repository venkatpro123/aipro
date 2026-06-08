// CareerOutcomeRecorder.tsx — Modal to record what actually happened after an audit
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { recordUserOutcome } from '../../services/outcomeService';
import type { OutcomeLabel } from '../../services/outcomeService';

interface AuditOption {
  id: string;
  company_name: string;
  role_title: string | null;
  predicted_score: number | null;
  audit_date: string;
  outcome_reported: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const OUTCOME_OPTIONS: { value: OutcomeLabel; label: string; description: string; color: string }[] = [
  { value: 'no_layoff',        label: 'Still Employed',   description: 'Continued in the same or similar role', color: '#10b981' },
  { value: 'voluntarily_left', label: 'Left Voluntarily', description: 'Resigned or accepted a new offer',       color: 'var(--cyan)' },
  { value: 'layoff_occurred',  label: 'Was Laid Off',     description: 'Position was eliminated or restructured', color: '#ef4444' },
  { value: 'other',            label: 'Other',            description: 'Retired, contract ended, or other',       color: '#f59e0b' },
];

export function CareerOutcomeRecorder({ open, onClose, onSaved }: Props) {
  const [audits, setAudits] = useState<AuditOption[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [outcome, setOutcome] = useState<OutcomeLabel>('no_layoff');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase
      .from('user_prediction_outcomes')
      .select('id, company_name, role_title, predicted_score, audit_date, outcome_reported')
      .order('audit_date', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const rows = (data ?? []) as AuditOption[];
        setAudits(rows);
        // Default to first unconfirmed audit
        const first = rows.find(r => !r.outcome_reported);
        if (first) setSelectedAuditId(first.id);
        else if (rows.length > 0) setSelectedAuditId(rows[0].id);
      });
  }, [open]);

  const handleSave = async () => {
    if (!selectedAuditId) {
      setError('Please select an audit.');
      return;
    }
    setSaving(true);
    setError('');
    const ok = await recordUserOutcome(selectedAuditId, outcome);
    setSaving(false);
    if (!ok) {
      setError('Failed to save. Please try again.');
      return;
    }
    onSaved?.();
    onClose();
  };

  const selectedAudit = audits.find(a => a.id === selectedAuditId);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="card-premium"
            style={{ width: '100%', maxWidth: 480, padding: '24px 24px 20px' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Record Outcome</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Help us improve predictions by sharing what happened
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {audits.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                Run your first audit to be able to record outcomes.
              </div>
            ) : (
              <>
                {/* Audit selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Which audit?</label>
                  <select
                    value={selectedAuditId}
                    onChange={e => setSelectedAuditId(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  >
                    {audits.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.company_name}{a.role_title ? ` · ${a.role_title}` : ''} — {new Date(a.audit_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {a.outcome_reported ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedAudit?.predicted_score != null && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>
                      Predicted risk score: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>{Math.round(selectedAudit.predicted_score)}</strong>
                      {selectedAudit.outcome_reported && (
                        <span style={{ color: '#10b981', marginLeft: 8 }}>Outcome already recorded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Outcome options */}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>What happened?</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {OUTCOME_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setOutcome(opt.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${outcome === opt.value ? opt.color : 'rgba(255,255,255,0.1)'}`,
                          background: outcome === opt.value ? `${opt.color}10` : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${opt.color}`,
                          background: outcome === opt.value ? opt.color : 'transparent',
                          transition: 'background 0.15s',
                        }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: outcome === opt.value ? opt.color : 'var(--text)' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{opt.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>
                  Your response is anonymous and helps calibrate predictions for everyone.
                </div>

                {error && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none', cursor: saving ? 'default' : 'pointer',
                      background: saving ? 'rgba(0,212,255,0.3)' : 'var(--cyan)',
                      color: '#000', fontWeight: 700, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Outcome'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
  background: 'transparent', color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: 13,
};
