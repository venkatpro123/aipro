import React from 'react';

interface Action {
  priority: number;
  title: string;
  body: string;
  timeToComplete: string;
  link: string | null;
}

const actionsByTier: Record<string, Action[]> = {
  red: [
    {
      priority: 1,
      title: 'Update your CV this week',
      body: 'Even if you stay, a strong CV is your best insurance. Focus on quantified achievements from the last 12 months.',
      timeToComplete: '2–3 hours',
      link: null,
    },
    {
      priority: 2,
      title: 'Activate your professional network now',
      body: "Message 5 former colleagues this week. Don't ask for a job — reconnect. Referrals are 5× more effective than cold applications.",
      timeToComplete: '30 minutes',
      link: null,
    },
    {
      priority: 3,
      title: 'Open accounts at 3 job platforms today',
      body: 'LinkedIn, Indeed, and one specialist board for your field. Set up job alerts for your target role.',
      timeToComplete: '45 minutes',
      link: null,
    },
  ],
  orange: [
    {
      priority: 1,
      title: 'Become more visible inside your company',
      body: 'Present in a team meeting, volunteer for a cross-functional project, or write an internal post. Visible employees are harder to cut.',
      timeToComplete: 'Ongoing',
      link: null,
    },
    {
      priority: 2,
      title: 'Start building an external skill credential',
      body: 'Enrol in one course that moves you toward a lower-risk skill set. We recommend courses that improve your score directly.',
      timeToComplete: '1–2 months',
      link: 'roadmap',
    },
    {
      priority: 3,
      title: 'Check your severance and notice rights',
      body: 'Know your contract terms, garden leave policy, and notice period. Understanding your safety net reduces panic.',
      timeToComplete: '1 hour',
      link: null,
    },
  ],
  amber: [
    {
      priority: 1,
      title: 'Document your impact for the next review cycle',
      body: 'Keep a "wins log" of things you shipped, problems you solved, and value you created. Quantify wherever possible.',
      timeToComplete: '10 min/week',
      link: 'journal',
    },
    {
      priority: 2,
      title: 'Strengthen one at-risk skill this quarter',
      body: 'Your score shows moderate exposure. Investing 4 hours/week in a skill that AI cannot easily replicate will protect your position.',
      timeToComplete: '4 hrs/week',
      link: 'roadmap',
    },
    {
      priority: 3,
      title: 'Set a monthly score check-in reminder',
      body: 'Your risk score updates when market conditions change. Set a reminder to check every 4 weeks.',
      timeToComplete: '2 minutes',
      link: null,
    },
  ],
};

interface Props {
  score: number;
  tierColor: string;
  role: string;
  onSwitchTab?: (tabId: string) => void;
}

export const LayoffActionPlan: React.FC<Props> = ({ score, tierColor, role, onSwitchTab }) => {
  const effectiveTier = tierColor === 'amber' || tierColor === 'orange' || tierColor === 'red' ? tierColor : null;
  if (!effectiveTier) return null;

  const actions = actionsByTier[effectiveTier] || [];

  const getTierHex = (c: string) => {
    const map: Record<string, string> = { red: 'var(--color-red-text)', orange: 'var(--color-orange-text)', amber: 'var(--color-amber500-text)' };
    return map[c] || 'var(--color-amber500-text)';
  };
  const tierHex = getTierHex(tierColor);

  return (
    <div
      className="layoff-actions"
      role="region"
      aria-label="Action plan"
      style={{
        marginTop: '32px',
        background: 'var(--alpha-bg-04)',
        border: '1px solid var(--alpha-bg-08)',
        borderRadius: '12px',
        padding: '24px',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text)', fontSize: '1.2rem' }}>
        ⚡ Immediate Action Plan
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {actions.map((action, i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg2, #111827)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `4px solid ${tierHex}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>
                {action.priority}. {action.title}
              </h4>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-gray-custom-text)',
                  background: 'var(--alpha-bg-08)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {action.timeToComplete}
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--color-gray300-text)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {action.body}
            </p>
            {action.link && onSwitchTab && (
              <button
                onClick={() => onSwitchTab(action.link!)}
                aria-label={`Go to ${action.link}`}
                style={{
                  marginTop: '12px',
                  background: 'transparent',
                  border: `1px solid ${tierHex}`,
                  color: tierHex,
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Go to {action.link} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
