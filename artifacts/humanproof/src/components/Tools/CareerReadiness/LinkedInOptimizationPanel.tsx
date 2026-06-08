// LinkedInOptimizationPanel.tsx — LinkedIn profile optimization checklist
import { useState } from 'react';
import { CheckCircle, Circle, Save, ExternalLink } from 'lucide-react';
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

const LINKEDIN_CHECKLIST: CheckItem[] = [
  { id: 'headline_ai',    label: 'Headline includes AI angle',     description: 'e.g. "Product Manager | AI Product Strategy | SaaS".',        points: 20 },
  { id: 'summary_human',  label: 'Summary showcases human skills', description: 'Empathy, judgment, creativity — what AI can\'t replicate.',    points: 15 },
  { id: 'photo',          label: 'Professional headshot',          description: 'Profiles with photos get 21× more views.',                     points: 10 },
  { id: 'open_to_work',   label: '"Open to Work" set (if needed)',  description: 'Enable discreetly — only visible to recruiters if preferred.',  points: 10 },
  { id: 'skills_updated', label: 'Skills section up to date',      description: 'At least 10 skills including AI/automation tools.',            points: 15 },
  { id: 'recommendations', label: '3+ recommendations',            description: 'Social proof from managers or senior colleagues.',              points: 15 },
  { id: 'recent_activity', label: 'Posted in last 30 days',        description: 'Regular activity signals availability and expertise.',          points: 10 },
  { id: 'connections',    label: '500+ connections',               description: 'LinkedIn SSI score improves dramatically above 500.',           points: 5  },
];

function computeScore(checked: Set<string>): number {
  const total = LINKEDIN_CHECKLIST.reduce((s, i) => s + i.points, 0);
  const earned = LINKEDIN_CHECKLIST.filter(i => checked.has(i.id)).reduce((s, i) => s + i.points, 0);
  return Math.round((earned / total) * 100);
}

export function LinkedInOptimizationPanel({ scoreResult }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const score = computeScore(checked);
  const color = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';

  const networkScore = scoreResult?.networkLeverage?.networkScore;

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_profiles').upsert({
          user_id: user.id,
          linkedin_readiness_score: score,
        }, { onConflict: 'user_id' });
      }
    } catch { /* ignore */ }
    setSaved(true);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          LinkedIn Optimization
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Score your LinkedIn profile for recruiter visibility and AI-era positioning.
        </div>
      </div>

      {networkScore !== undefined && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span>Network leverage score from your audit: <strong style={{ color: 'var(--cyan)' }}>{Math.round(networkScore)}/100</strong></span>
          {networkScore < 40 && <span style={{ color: '#f59e0b' }}>— LinkedIn optimization will directly improve this.</span>}
        </div>
      )}

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
            {score >= 80 ? 'Highly Optimized' : score >= 55 ? 'Partially Optimized' : 'Needs Optimization'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {checked.size} of {LINKEDIN_CHECKLIST.length} items completed
          </div>
        </div>
        <button
          onClick={save}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LINKEDIN_CHECKLIST.map(item => {
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
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: isDone ? '#a78bfa' : 'var(--text)' }}>
                  {item.label}
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>+{item.points} pts</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
