// LearningOutcomeTracker.tsx — Post-course feedback modal
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { recordLearningOutcome } from '../../services/feedbackEngine';

interface Props {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle?: string;
  onSaved?: () => void;
}

const QUESTIONS = [
  {
    key: 'skillPracticed' as const,
    label: 'Did you practice this skill?',
    yes: 'Applied it at work or in a project',
    no: 'Not yet',
  },
  {
    key: 'resumeUpdated' as const,
    label: 'Did you update your resume / LinkedIn?',
    yes: 'Added this skill / course',
    no: 'Not yet',
  },
  {
    key: 'confidenceImproved' as const,
    label: 'Did your confidence improve?',
    yes: 'Yes, I feel more capable',
    no: 'About the same',
  },
];

type Answers = {
  skillPracticed: boolean | null;
  resumeUpdated: boolean | null;
  confidenceImproved: boolean | null;
};

export function LearningOutcomeTracker({ open, onClose, courseId, courseTitle, onSaved }: Props) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Answers>({ skillPracticed: null, resumeUpdated: null, confidenceImproved: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const allAnswered = Object.values(answers).every(v => v !== null);

  const handleSave = async () => {
    if (!user || !allAnswered) return;
    setSaving(true);
    const ok = await recordLearningOutcome({
      userId: user.id,
      courseId,
      courseTitle,
      skillPracticed: answers.skillPracticed!,
      resumeUpdated: answers.resumeUpdated!,
      confidenceImproved: answers.confidenceImproved!,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSaved?.();
      setTimeout(() => { setSaved(false); onClose(); }, 1800);
    }
  };

  const reset = () => {
    setAnswers({ skillPracticed: null, resumeUpdated: null, confidenceImproved: null });
    setSaved(false);
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="card-premium"
            style={{ width: '100%', maxWidth: 420, padding: '24px 24px 20px' }}
          >
            {saved ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '24px 0' }}
              >
                <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>Outcome recorded!</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>Thanks for sharing. Your results improve recommendations for everyone.</div>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <BookOpen size={16} color="var(--cyan)" />
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Course Outcome</div>
                    </div>
                    {courseTitle && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {courseTitle}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { reset(); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 18 }}>
                  3 quick questions to track your learning progress.
                </div>

                {/* Questions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  {QUESTIONS.map(q => (
                    <div key={q.key}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{q.label}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setAnswers(a => ({ ...a, [q.key]: true }))}
                          style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            border: `1.5px solid ${answers[q.key] === true ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                            background: answers[q.key] === true ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                            color: answers[q.key] === true ? '#10b981' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {q.yes}
                        </button>
                        <button
                          onClick={() => setAnswers(a => ({ ...a, [q.key]: false }))}
                          style={{
                            flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            border: `1.5px solid ${answers[q.key] === false ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            background: answers[q.key] === false ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                            color: answers[q.key] === false ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {q.no}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { reset(); onClose(); }} style={cancelBtnStyle}>Skip</button>
                  <button
                    onClick={handleSave}
                    disabled={!allAnswered || saving}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none',
                      cursor: allAnswered && !saving ? 'pointer' : 'default',
                      background: allAnswered ? 'var(--cyan)' : 'rgba(255,255,255,0.12)',
                      color: allAnswered ? '#000' : 'rgba(255,255,255,0.3)',
                      fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
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

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
  background: 'transparent', color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: 13,
};
