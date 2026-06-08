// InterviewReadinessPanel.tsx — Role-specific interview prep + readiness scoring
import { useState } from 'react';
import { ChevronDown, ChevronRight, Save } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

interface QuestionGroup {
  category: string;
  questions: string[];
}

const UNIVERSAL_QUESTIONS: QuestionGroup[] = [
  {
    category: 'AI & Automation',
    questions: [
      'How are you using AI tools in your current role?',
      'What parts of your work do you think AI will automate next?',
      'Describe a time you automated a repetitive task.',
    ],
  },
  {
    category: 'Behavioral (STAR Method)',
    questions: [
      'Tell me about a time you had to adapt quickly to change.',
      'Describe a situation where you had to influence without authority.',
      'Give an example of a difficult decision you made with incomplete data.',
    ],
  },
  {
    category: 'Role-Specific Technical',
    questions: [
      'Walk me through your approach to a complex problem in your domain.',
      'How do you stay current with trends in your field?',
      'What\'s the most technically challenging project you\'ve worked on?',
    ],
  },
  {
    category: 'Company & Culture',
    questions: [
      'Why do you want to work at this company specifically?',
      'What do you know about our recent product/service launches?',
      'How do you handle disagreement with a manager?',
    ],
  },
];

export function InterviewReadinessPanel({ scoreResult }: Props) {
  const [expanded, setExpanded] = useState<string | null>('AI & Automation');
  const [score, setScore] = useState<number>(50);
  const [saved, setSaved] = useState(false);

  async function save() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_profiles').upsert({
          user_id: user.id,
          interview_readiness_score: score,
        }, { onConflict: 'user_id' });
      }
    } catch { /* ignore */ }
    setSaved(true);
  }

  const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Interview Readiness
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Practice key questions and self-rate your confidence. Your score is saved to track improvement.
        </div>
      </div>

      {/* Self-rating */}
      <div className="card-premium" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>
          Self-Rate Your Interview Confidence
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={e => { setScore(Number(e.target.value)); setSaved(false); }}
            style={{ flex: 1, accentColor: '#a78bfa' }}
          />
          <div style={{ fontWeight: 800, fontSize: 28, color, minWidth: 50, textAlign: 'right' }}>{score}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          <span>Not ready</span><span>Fully prepared</span>
        </div>
        <button
          onClick={save}
          style={{
            marginTop: 14,
            background: '#a78bfa',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Save size={14} /> {saved ? 'Score Saved!' : 'Save Score'}
        </button>
      </div>

      {/* Question bank */}
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>
        Question Bank
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {UNIVERSAL_QUESTIONS.map(group => {
          const isOpen = expanded === group.category;
          return (
            <div key={group.category} className="card-premium" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onClick={() => setExpanded(isOpen ? null : group.category)}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{group.category}</div>
                {isOpen ? <ChevronDown size={16} color="rgba(255,255,255,0.4)" /> : <ChevronRight size={16} color="rgba(255,255,255,0.4)" />}
              </div>
              {isOpen && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.questions.map((q, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.5,
                        borderLeft: '2px solid #a78bfa',
                      }}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
        💡 Use the STAR method (Situation, Task, Action, Result) for behavioral questions. Prepare 2 strong stories per category.
      </div>
    </div>
  );
}
