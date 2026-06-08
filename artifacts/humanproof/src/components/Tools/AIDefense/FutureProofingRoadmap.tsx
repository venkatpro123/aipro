// FutureProofingRoadmap.tsx — 90-day AI augmentation skill roadmap
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface Sprint {
  phase: string;
  weeks: string;
  color: string;
  skills: { name: string; resource: string; hours: number }[];
}

const SPRINTS: Sprint[] = [
  {
    phase: 'Phase 1 — Foundation',
    weeks: 'Weeks 1–4',
    color: 'var(--cyan)',
    skills: [
      { name: 'Prompt Engineering Fundamentals', resource: 'deeplearning.ai (free)', hours: 8 },
      { name: 'ChatGPT for Your Role', resource: 'Coursera (free audit)', hours: 6 },
      { name: 'AI Workflow Automation', resource: 'Zapier Academy (free)', hours: 4 },
    ],
  },
  {
    phase: 'Phase 2 — Augmentation',
    weeks: 'Weeks 5–8',
    color: '#a78bfa',
    skills: [
      { name: 'AI-Assisted Data Analysis', resource: 'Google Data AI cert', hours: 10 },
      { name: 'Copilot in Your Domain Tools', resource: 'Microsoft Learn (free)', hours: 6 },
      { name: 'Building AI-Augmented Workflows', resource: 'Make.com Academy', hours: 5 },
    ],
  },
  {
    phase: 'Phase 3 — Differentiation',
    weeks: 'Weeks 9–12',
    color: '#10b981',
    skills: [
      { name: 'AI Product Management / Strategy', resource: 'Product School (free)', hours: 8 },
      { name: 'Domain-Specific AI Application', resource: 'Role-specific certification', hours: 12 },
      { name: 'Portfolio: AI-Augmented Project', resource: 'Build & publish', hours: 10 },
    ],
  },
];

export function FutureProofingRoadmap({ scoreResult }: Props) {
  const stack = scoreResult.techStackObsolescence;
  const d1Score = scoreResult.dimensions?.find(d => d.key === 'D1')?.score ?? 50;
  const urgency = d1Score > 70 ? 'URGENT' : d1Score > 45 ? 'RECOMMENDED' : 'MAINTENANCE';

  const totalHours = SPRINTS.flatMap(s => s.skills).reduce((sum, sk) => sum + sk.hours, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          90-Day Futureproof Roadmap
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          A structured AI augmentation skill sprint. {totalHours}h total — roughly 7h/week.
        </div>
      </div>

      {/* Urgency banner */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: urgency === 'URGENT' ? 'rgba(239,68,68,0.1)' : urgency === 'RECOMMENDED' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
        border: `1px solid ${urgency === 'URGENT' ? 'rgba(239,68,68,0.3)' : urgency === 'RECOMMENDED' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
        fontSize: 13,
        color: 'var(--text)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, color: urgency === 'URGENT' ? '#ef4444' : urgency === 'RECOMMENDED' ? '#f59e0b' : '#10b981' }}>
          {urgency}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>
          {urgency === 'URGENT'
            ? `AI displacement score ${Math.round(d1Score)} — start this sprint immediately.`
            : urgency === 'RECOMMENDED'
            ? `Moderate exposure — completing this sprint will materially reduce your risk.`
            : `Good standing — maintain your edge with continuous learning.`}
        </span>
      </div>

      {stack && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)',
          fontSize: 13, color: 'var(--text)',
        }}>
          <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Stack: {stack.primaryStackStatus}</span>
          {stack.bridgeSkillPriority.length > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 10 }}>
              Priority bridges: {stack.bridgeSkillPriority.slice(0, 3).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Sprint cards */}
      {SPRINTS.map((sprint, si) => (
        <div key={si} className="card-premium" style={{ padding: 20, borderLeft: `3px solid ${sprint.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: sprint.color }}>{sprint.phase}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sprint.weeks}</div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {sprint.skills.reduce((s, sk) => s + sk.hours, 0)}h total
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sprint.skills.map((sk, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{sk.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{sk.resource}</div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{sk.hours}h</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
        💡 Completing this sprint and adding the skills to your LinkedIn/resume typically reduces your AI displacement score by 8–15 points.
      </div>
    </div>
  );
}
