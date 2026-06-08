// OutreachPlannerPanel.tsx — Weekly outreach plan generator
import { useMemo } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

interface OutreachTask {
  day: string;
  contactType: string;
  action: string;
  template: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

function buildWeeklyPlan(net: HybridResult['networkLeverage']): OutreachTask[] {
  const tier = net?.networkTier ?? 'FUNCTIONAL';
  const base: OutreachTask[] = [
    { day: 'Monday',    contactType: 'Former Manager',   action: 'Send reconnect message',           template: 'Hi [Name], hope you\'re well! I\'m exploring new opportunities in [space] and would love 15 mins to catch up.',           priority: 'HIGH'   },
    { day: 'Tuesday',   contactType: 'Peer / Colleague', action: 'LinkedIn comment + DM',             template: 'I saw your post on [topic] — really insightful. Would love to chat this week if you have 20 mins.',                      priority: 'HIGH'   },
    { day: 'Wednesday', contactType: 'Recruiter',        action: 'Targeted recruiter outreach',       template: 'Hi [Name], I\'m a [title] selectively exploring new roles. Your specialty in [domain] caught my eye.',                   priority: 'MEDIUM' },
    { day: 'Thursday',  contactType: 'Mentor / Advisor', action: 'Ask for intro or perspective',      template: 'Hi [Name], I\'m in active search mode. Do you know anyone at [target company] you could connect me with?',             priority: 'MEDIUM' },
    { day: 'Friday',    contactType: 'Alumni Network',   action: 'Post to alumni Slack/LinkedIn',     template: 'Selectively exploring [role] opportunities. If you\'re at a company hiring in this space, I\'d love to connect.',       priority: 'LOW'    },
  ];

  // Add extra tasks for sparse/minimal networks
  if (tier === 'SPARSE' || tier === 'MINIMAL') {
    base.push({ day: 'Weekend', contactType: 'Community', action: 'Join and engage in 2 Slack/Discord communities', template: 'Introduce yourself in #introductions channel. Engage genuinely before asking for anything.', priority: 'MEDIUM' });
  }

  return base;
}

const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };

export function OutreachPlannerPanel({ scoreResult }: Props) {
  const net = scoreResult.networkLeverage;
  const plan = useMemo(() => buildWeeklyPlan(net), [net]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Weekly Outreach Planner</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your personalized weekly outreach schedule. Consistency beats intensity — 5 contacts/week compounds over time.
        </div>
      </div>

      {net && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
          Network tier <strong style={{ color: 'var(--cyan)' }}>{net.networkTier}</strong> · Target{' '}
          <strong style={{ color: 'var(--cyan)' }}>{net.applicationChannelSplit?.warmReferral ?? 30}% warm applications</strong>{' '}
          this week · Est. first referral in <strong style={{ color: 'var(--cyan)' }}>{net.timeToFirstReferral ?? '2–3 weeks'}</strong>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plan.map((task, i) => (
          <div key={i} className="card-premium" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--cyan)', minWidth: 80 }}>{task.day}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[task.priority], background: `${PRIORITY_COLORS[task.priority]}18`, padding: '2px 8px', borderRadius: 4 }}>
                  {task.priority}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{task.contactType}</div>
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>{task.action}</div>
            <div style={{
              fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic',
              background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 12px',
              border: '1px solid var(--border)',
            }}>
              "{task.template}"
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
        * Outreach plan adapts based on your network strength tier. Upgrade your tier by adding contacts in the Relationship Tracker tab.
      </div>
    </div>
  );
}
