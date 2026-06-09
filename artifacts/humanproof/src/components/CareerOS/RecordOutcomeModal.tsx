// RecordOutcomeModal — Rule 9 (Career Graph seed), Rule 2 (Outcome Monopoly)
// 3-tap capture of any career win. Feeds CareerResultsPanel and future Career Graph.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import {
  recordOutcomeEvent,
  type OutcomeEventType,
  OUTCOME_LABELS,
  OUTCOME_ICONS,
} from '../../services/careerOutcomeService';
import { useLayoff } from '../../context/LayoffContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onRecorded?: () => void;
}

const EVENT_TYPES: OutcomeEventType[] = [
  'salary_increase', 'promotion', 'job_change', 'layoff_avoided',
  'offer_received', 'negotiation_win', 'skill_certified', 'offer_declined',
];

const EVENT_PROMPTS: Record<OutcomeEventType, string> = {
  salary_increase:  'How much did your salary increase (optional)?',
  promotion:        'What title or level did you reach?',
  job_change:       'What is the new company or role?',
  layoff_avoided:   'What helped you avoid it (optional)?',
  skill_certified:  'Which skill or certification?',
  negotiation_win:  'What did you negotiate for?',
  offer_received:   'What company or role offered?',
  offer_declined:   'Why did you decline (optional)?',
};

export function RecordOutcomeModal({ open, onClose, onRecorded }: Props) {
  const { state } = useLayoff();
  const [step, setStep] = useState<'type' | 'detail' | 'done'>('type');
  const [selectedType, setSelectedType] = useState<OutcomeEventType | null>(null);
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep('type');
    setSelectedType(null);
    setDetail('');
    setSaving(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!selectedType) return;
    setSaving(true);
    const detailObj: Record<string, string> = {};
    if (detail.trim()) detailObj.note = detail.trim();

    await recordOutcomeEvent(selectedType, {
      companyName: state.companyName ?? undefined,
      roleTitle: state.roleTitle ?? undefined,
      details: detailObj,
    });

    setSaving(false);
    setStep('done');
    onRecorded?.();
    setTimeout(() => { handleClose(); }, 1800);
  }

  if (!open) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%', maxWidth: 460,
            background: 'var(--surface, #1a1a2e)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)' }}>
                CAREER GRAPH
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                Record a Career Win
              </div>
            </div>
            <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 20px 24px' }}>

            {step === 'done' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '24px 0' }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <Check size={22} color="#10b981" />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                  {selectedType ? OUTCOME_ICONS[selectedType] : '✅'} Recorded!
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                  {selectedType ? OUTCOME_LABELS[selectedType] : 'Career win'} added to your career story.
                </div>
              </motion.div>
            ) : step === 'type' ? (
              <>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>
                  What happened?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setSelectedType(type); setStep('detail'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '11px 13px', borderRadius: 9, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600,
                        textAlign: 'left' as const, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(0,245,255,0.06)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,245,255,0.25)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--cyan)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{OUTCOME_ICONS[type]}</span>
                      {OUTCOME_LABELS[type]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Detail step */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <span style={{ fontSize: 22 }}>{selectedType ? OUTCOME_ICONS[selectedType] : ''}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                    {selectedType ? OUTCOME_LABELS[selectedType] : ''}
                  </span>
                </div>

                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>
                  {selectedType ? EVENT_PROMPTS[selectedType] : 'Any details?'}
                </label>
                <textarea
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  placeholder="Optional — leave blank to skip"
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, resize: 'vertical' as const,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5,
                    boxSizing: 'border-box' as const,
                  }}
                />

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setStep('type')}
                    style={{
                      flex: '0 0 auto', padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 600,
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, cursor: saving ? 'default' : 'pointer',
                      background: saving ? 'rgba(16,185,129,0.3)' : '#10b981',
                      border: 'none', color: '#000', fontSize: '0.88rem', fontWeight: 800,
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Saving…' : 'Save to Career Story →'}
                  </button>
                </div>
              </>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
