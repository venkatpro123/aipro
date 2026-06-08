// OutreachPlannerPanel.tsx — Role-aware weekly outreach plan generator
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

// Role-family detection (mirrors FutureProofingRoadmap logic)
function getRoleFamily(scoreResult: HybridResult): string {
  const role = ((scoreResult as any).roleTitle ?? '').toLowerCase();
  if (/engineer|developer|software|backend|frontend|fullstack|devops|sre|architect/.test(role)) return 'engineering';
  if (/data|analyst|scientist|ml|machine learning/.test(role)) return 'data';
  if (/finance|accountant|cfo|controller|banking|investment/.test(role)) return 'finance';
  if (/doctor|nurse|physician|therapist|clinical|medical/.test(role)) return 'healthcare';
  if (/marketing|brand|content|seo|growth/.test(role)) return 'marketing';
  if (/sales|account executive|ae|bdr|sdr|revenue/.test(role)) return 'sales';
  if (/hr|human resources|talent|recruiter|people/.test(role)) return 'hr';
  if (/legal|lawyer|attorney|counsel|compliance/.test(role)) return 'legal';
  if (/operations|ops|supply chain|logistics/.test(role)) return 'operations';
  if (/design|ux|ui|product designer/.test(role)) return 'design';
  if (/product manager|pm|product owner/.test(role)) return 'product';
  return 'general';
}

type RoleTemplates = {
  formerManager: string;
  peer: string;
  recruiter: string;
  mentor: string;
  alumni: string;
};

const ROLE_TEMPLATES: Record<string, RoleTemplates> = {
  engineering: {
    formerManager:  "Hi [Name], hope you're well! I'm selectively exploring senior engineering roles and would love 15 mins to reconnect and hear what your team is building.",
    peer:           "I saw your post on [topic] — great take. Would love to swap notes on [tech stack / company] this week if you have 20 mins.",
    recruiter:      "Hi [Name], I'm a [title] with [X] years in [stack]. I'm open to Principal/Staff-level roles and noticed your focus on engineering talent. Worth a quick chat?",
    mentor:         "Hi [Name], I'm in active job search mode and targeting [company/domain]. Would you be open to a 20-min call for your perspective on the market?",
    alumni:         "Hi! I'm a [role/stack] engineer selectively exploring new opportunities. If your team is hiring or you know someone who is, I'd love to connect.",
  },
  data: {
    formerManager:  "Hi [Name], I'm exploring senior data/analytics roles and would love to reconnect. Would you have 15 mins to catch up?",
    peer:           "Loved your recent post on [model/tool/project]. Would be great to compare notes — happy to share what I've been working on too.",
    recruiter:      "Hi [Name], I'm a [Data Scientist/ML Engineer] with expertise in [Python/SQL/LLMs]. Selectively open to new roles — worth a brief conversation?",
    mentor:         "Hi [Name], actively exploring my next data role. Your experience in [domain] is exactly what I'd love 20 mins of your time to discuss.",
    alumni:         "Hi! I'm a [title] in the data/ML space and selectively exploring new challenges. If you know of strong teams hiring, I'd love to hear about it.",
  },
  finance: {
    formerManager:  "Hi [Name], I'm exploring my next finance opportunity — particularly in [FP&A / IB / AM]. Would love 15 mins to catch up if you have time.",
    peer:           "Saw your post on [topic] — great insights. If you're open to a quick call, would love to hear how [company/sector] is performing from your vantage.",
    recruiter:      "Hi [Name], I'm a [CFA / finance title] with [X] years in [domain]. Selectively exploring buy-side / senior finance roles. Could we connect briefly?",
    mentor:         "Hi [Name], I'm in an active search in the finance space. Your track record in [sector/firm] would be hugely valuable — could I get 20 mins of your time?",
    alumni:         "Hi! I'm a [title] in finance actively exploring new opportunities. Would love to connect if your firm is hiring or you know someone in [sector].",
  },
  healthcare: {
    formerManager:  "Hi [Name], I'm exploring new clinical/healthcare opportunities and would love 15 mins to reconnect and hear what you're working on.",
    peer:           "Enjoyed your post on [topic / clinical update]. Would love to chat about the landscape — especially [specialty/setting] opportunities.",
    recruiter:      "Hi [Name], I'm a [RN / PA / physician / HIT specialist] with [X] years in [specialty]. Selectively open to new roles — worth a quick conversation?",
    mentor:         "Hi [Name], I'm considering a transition to [specialty/sector]. Your experience in [area] would be invaluable — could I get 20 mins of your time?",
    alumni:         "Hi! I'm a [title] in healthcare selectively exploring new roles. If you hear of strong opportunities in [specialty/sector], I'd love to know.",
  },
  marketing: {
    formerManager:  "Hi [Name], I'm exploring senior marketing roles and would love to reconnect. Would you have 15 mins to catch up on what you're building?",
    peer:           "Loved your campaign breakdown on [topic]. Would love to swap notes — I've been experimenting with [channel/strategy] and think you'd find it interesting.",
    recruiter:      "Hi [Name], I'm a [Growth / Brand / Demand Gen] marketer with [X] years driving [metric]. Selectively exploring new opportunities — worth a chat?",
    mentor:         "Hi [Name], I'm actively exploring my next marketing move. Your expertise in [growth/brand] is exactly the perspective I need — could we find 20 mins?",
    alumni:         "Hi! I'm a [title] in marketing selectively exploring new roles. If your team is hiring or you know of strong opportunities, I'd love to connect.",
  },
  sales: {
    formerManager:  "Hi [Name], exploring my next sales opportunity — ideally [SMB/Enterprise/SaaS]. Would love 15 mins to catch up and hear what your team is working on.",
    peer:           "Saw your post on [topic/quota attainment] — really resonated. Would love to swap pipeline strategies over a quick call this week.",
    recruiter:      "Hi [Name], I'm an AE/SDR/Sales Manager with a track record of [quota %] attainment in [segment]. Selectively exploring new roles — worth a brief chat?",
    mentor:         "Hi [Name], I'm in active job search mode targeting [company type / segment]. Your experience closing [deal type] would be incredibly helpful — 20 mins?",
    alumni:         "Hi! I'm a [title] in sales selectively exploring. If your org is hiring or you know a team scaling, I'd love to connect.",
  },
  hr: {
    formerManager:  "Hi [Name], I'm exploring my next HR/People ops role and would love to catch up for 15 mins. Would you have time this week?",
    peer:           "Great post on [topic — recruiting/culture]. I've been working on something similar — would love to compare approaches if you have 20 mins.",
    recruiter:      "Hi [Name], I'm an [HR/TA/L&D] professional with [X] years in [domain]. Selectively exploring new opportunities — worth a brief conversation?",
    mentor:         "Hi [Name], I'm in active search mode for HR leadership roles. Your experience building people teams at [company type] is exactly the input I need — 20 mins?",
    alumni:         "Hi! I'm a [title] in HR/People Ops selectively exploring. If you know of strong opportunities or leaders hiring in this space, I'd love to connect.",
  },
  legal: {
    formerManager:  "Hi [Name], I'm selectively exploring my next legal opportunity — in-house or [practice area]. Would love 15 mins to reconnect.",
    peer:           "Enjoyed your post on [topic / legal update]. Would love to swap perspectives on the market — particularly around [area].",
    recruiter:      "Hi [Name], I'm a [JD / attorney / GC] with [X] years in [practice area]. Selectively open to in-house or senior associate roles. Worth a quick chat?",
    mentor:         "Hi [Name], I'm actively evaluating my next legal move. Your experience at [firm/in-house] would be invaluable — could I get 20 mins of your time?",
    alumni:         "Hi! I'm a [title] in legal selectively exploring in-house opportunities. If you know of teams hiring or firms with interesting openings, I'd love to hear.",
  },
  operations: {
    formerManager:  "Hi [Name], I'm exploring senior ops or supply chain roles and would love to reconnect for 15 mins to catch up.",
    peer:           "Really liked your take on [topic — automation / process / logistics]. Would love to talk through how you've approached [problem] — quick call?",
    recruiter:      "Hi [Name], I'm an [Ops / Supply Chain / COO] professional with [X] years streamlining [domain]. Selectively open to new roles — worth a brief conversation?",
    mentor:         "Hi [Name], I'm in active search mode for operations leadership roles. Your scaling experience at [company] is the perspective I need — 20 mins?",
    alumni:         "Hi! I'm an [ops/supply chain] professional selectively exploring. If your company is scaling operations or you know of relevant openings, I'd love to connect.",
  },
  design: {
    formerManager:  "Hi [Name], I'm exploring senior design / UX roles and would love to reconnect. Would you have 15 mins to catch up?",
    peer:           "Loved your case study on [product/feature]. The [process/approach] was really thoughtful — would love to swap design war stories if you have 20 mins.",
    recruiter:      "Hi [Name], I'm a [UX/Product/Brand] designer with [X] years shipping [type of product]. Selectively open to new roles — worth a brief chat?",
    mentor:         "Hi [Name], I'm in active search mode for design leadership. Your product design work at [company] is the type of craft I aspire to — could I get 20 mins?",
    alumni:         "Hi! I'm a [title] in design selectively exploring new opportunities. If your team is hiring or you know of strong design roles, I'd love to hear about them.",
  },
  product: {
    formerManager:  "Hi [Name], I'm exploring senior PM roles — ideally [0-to-1 / platform / growth]. Would love 15 mins to catch up and hear what you're building.",
    peer:           "Enjoyed your post on [topic — roadmapping / discovery / metrics]. Would love to compare PM war stories over a quick call this week.",
    recruiter:      "Hi [Name], I'm a [Senior/Principal PM] with [X] years in [domain]. Selectively open to new roles — worth a brief conversation?",
    mentor:         "Hi [Name], I'm actively exploring my next PM move. Your experience taking [product/company] from [X to Y] is exactly the perspective I need — 20 mins?",
    alumni:         "Hi! I'm a [title] PM selectively exploring. If your company is hiring PMs or you know of teams with strong product culture, I'd love to connect.",
  },
  general: {
    formerManager:  "Hi [Name], hope you're well! I'm exploring new opportunities in [space] and would love 15 mins to catch up.",
    peer:           "I saw your post on [topic] — really insightful. Would love to chat this week if you have 20 mins.",
    recruiter:      "Hi [Name], I'm a [title] selectively exploring new roles. Your specialty in [domain] caught my eye — worth a quick chat?",
    mentor:         "Hi [Name], I'm in active search mode. Do you know anyone at [target company] you could connect me with?",
    alumni:         "Selectively exploring [role] opportunities. If you're at a company hiring in this space, I'd love to connect.",
  },
};

function buildWeeklyPlan(scoreResult: HybridResult): OutreachTask[] {
  const net = scoreResult.networkLeverage;
  const tier = net?.networkTier ?? 'FUNCTIONAL';
  const roleFamily = getRoleFamily(scoreResult);
  const t = ROLE_TEMPLATES[roleFamily] ?? ROLE_TEMPLATES.general;

  const base: OutreachTask[] = [
    { day: 'Monday',    contactType: 'Former Manager',   action: 'Send reconnect message',       template: t.formerManager, priority: 'HIGH'   },
    { day: 'Tuesday',   contactType: 'Peer / Colleague', action: 'LinkedIn comment + DM',         template: t.peer,          priority: 'HIGH'   },
    { day: 'Wednesday', contactType: 'Recruiter',        action: 'Targeted recruiter outreach',   template: t.recruiter,     priority: 'MEDIUM' },
    { day: 'Thursday',  contactType: 'Mentor / Advisor', action: 'Ask for intro or perspective',  template: t.mentor,        priority: 'MEDIUM' },
    { day: 'Friday',    contactType: 'Alumni Network',   action: 'Post to alumni Slack/LinkedIn', template: t.alumni,        priority: 'LOW'    },
  ];

  if (tier === 'SPARSE' || tier === 'MINIMAL') {
    base.push({
      day: 'Weekend',
      contactType: 'Community',
      action: 'Join and engage in 2 Slack/Discord communities',
      template: 'Introduce yourself in #introductions. Engage genuinely before asking for anything.',
      priority: 'MEDIUM',
    });
  }

  return base;
}

const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };

export function OutreachPlannerPanel({ scoreResult }: Props) {
  const net = scoreResult.networkLeverage;
  const roleFamily = getRoleFamily(scoreResult);
  const plan = useMemo(() => buildWeeklyPlan(scoreResult), [scoreResult]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Weekly Outreach Planner</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Role-tailored outreach for <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{roleFamily !== 'general' ? roleFamily : 'your role'}</strong>. 5 contacts/week compounds fast — consistency beats intensity.
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
        * Templates are personalized to your role family. Upgrade your network tier by adding contacts in the Relationship Tracker.
      </div>
    </div>
  );
}
