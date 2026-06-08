// CareerDecisionRecorder.tsx — Modal form to record career decisions
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { recordCareerDecision } from '../../services/careerMemoryService';
import type { CareerDecision } from '../../services/careerMemoryService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type DecisionType = CareerDecision['decisionType'];

const DECISION_TYPES: { value: DecisionType; label: string; description: string }[] = [
  { value: 'stayed',     label: 'Stayed',     description: 'Chose to remain in current role'    },
  { value: 'left',       label: 'Left',        description: 'Left the company or role'           },
  { value: 'promoted',   label: 'Promoted',    description: 'Got promoted or took on more scope' },
  { value: 'pivoted',    label: 'Pivoted',     description: 'Changed career track or industry'   },
  { value: 'negotiated', label: 'Negotiated',  description: 'Negotiated salary, offer, or terms' },
  { value: 'other',      label: 'Other',       description: 'Another significant career decision' },
];

export function CareerDecisionRecorder({ open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [decisionType, setDecisionType] = useState<DecisionType>('stayed');
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [decidedAt, setDecidedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    const result = await recordCareerDecision({
      userId: user.id,
      decisionType,
      companyName: companyName.trim() || undefined,
      roleTitle: roleTitle.trim() || undefined,
      decidedAt,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!result) {
      setError('Failed to save. Please try again.');
      return;
    }
    onSaved?.();
    onClose();
    setCompanyName(''); setRoleTitle(''); setNotes('');
    setDecisionType('stayed');
  };

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
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Record Career Decision</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Build your career timeline
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Decision type pills */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                Decision Type
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DECISION_TYPES.map(dt => (
                  <button
                    key={dt.value}
                    onClick={() => setDecisionType(dt.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1.5px solid ${decisionType === dt.value ? 'var(--cyan)' : 'rgba(255,255,255,0.12)'}`,
                      background: decisionType === dt.value ? 'rgba(0,212,255,0.12)' : 'transparent',
                      color: decisionType === dt.value ? 'var(--cyan)' : 'rgba(255,255,255,0.55)',
                      transition: 'all 0.15s',
                    }}
                    title={dt.description}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
              {decisionType && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                  {DECISION_TYPES.find(d => d.value === decisionType)?.description}
                </div>
              )}
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Company</label>
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Google"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Role</label>
                  <input
                    value={roleTitle}
                    onChange={e => setRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Engineer"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Date</label>
                <input
                  type="date"
                  value={decidedAt}
                  onChange={e => setDecidedAt(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What was the context? What factors influenced your decision?"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'none', height: 'auto', lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>
            )}

            {/* Actions */}
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
                {saving ? 'Saving…' : 'Save Decision'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5,
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
