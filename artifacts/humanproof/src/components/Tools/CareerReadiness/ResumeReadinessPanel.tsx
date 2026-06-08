// ResumeReadinessPanel.tsx — ATS + AI resume readiness scoring
import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Save } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult | null;
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  points: number;
}

const RESUME_CHECKLIST: CheckItem[] = [
  { id: 'ats_keywords',    label: 'ATS-optimized keywords',         description: 'Role-specific keywords appear in the first 200 words.',   points: 15 },
  { id: 'quantified',      label: 'Quantified achievements',        description: 'At least 3 metrics (%, $, #) in the experience section.',  points: 20 },
  { id: 'ai_tools',        label: 'AI tools mentioned',             description: 'At least 2 AI/automation tools listed in skills section.',  points: 15 },
  { id: 'linkedin_url',    label: 'LinkedIn URL present',           description: 'Clickable LinkedIn URL in the header/contact block.',       points: 10 },
  { id: 'action_verbs',    label: 'Strong action verbs',            description: 'Each bullet starts with a past-tense action verb.',         points: 10 },
  { id: 'no_photos',       label: 'Photo-free for US/UK markets',   description: 'No photos or personal details that trigger ATS rejection.',  points: 5  },
  { id: 'one_page',        label: '1–2 pages (for <10 yrs exp)',     description: 'Concise length appropriate for your experience level.',     points: 10 },
  { id: 'recent_dates',    label: 'Dates are current and clear',    description: 'Employment gaps are explained; dates use MM/YYYY format.',   points: 10 },
  { id: 'tailored',        label: 'Tailored for target role',       description: 'Resume headline/summary matches the target job description.', points: 5 },
];

function computeScore(checked: Set<string>): number {
  const total = RESUME_CHECKLIST.reduce((s, i) => s + i.points, 0);
  const earned = RESUME_CHECKLIST.filter(i => checked.has(i.id)).reduce((s, i) => s + i.points, 0);
  return Math.round((earned / total) * 100);
}

export function ResumeReadinessPanel({ scoreResult }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const score = computeScore(checked);
  const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_profiles').upsert({
          user_id: user.id,
          resume_readiness_score: score,
        }, { onConflict: 'user_id' });
      }
    } catch { /* ignore */ }
    setSaving(false);
    setSaved(true);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Resume Readiness
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Self-assessment checklist to score your resume's market readiness.
        </div>
      </div>

      {/* Score ring */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '20px 24px',
        borderRadius: 14,
        background: `${color}10`,
        border: `1px solid ${color}33`,
        marginBottom: 24,
      }}>
        <div style={{ fontWeight: 800, fontSize: 48, color, lineHeight: 1 }}>{score}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            {score >= 80 ? 'Market Ready' : score >= 55 ? 'Needs Work' : 'Not Ready'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Resume readiness score · {checked.size} of {RESUME_CHECKLIST.length} items completed
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            marginLeft: 'auto',
            background: '#a78bfa',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Save size={14} /> {saved ? 'Saved!' : 'Save Score'}
        </button>
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {RESUME_CHECKLIST.map(item => {
          const isDone = checked.has(item.id);
          return (
            <div
              key={item.id}
              className="card-premium"
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                border: isDone ? '1px solid rgba(167,139,250,0.4)' : undefined,
              }}
              onClick={() => toggle(item.id)}
            >
              {isDone
                ? <CheckCircle size={18} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
                : <Circle size={18} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: isDone ? '#a78bfa' : 'var(--text)' }}>
                  {item.label}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>+{item.points} pts</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
