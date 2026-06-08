// FutureProofingRoadmap.tsx — 90-day AI augmentation skill roadmap
// Phase 3 sprint is personalized using bridgeSkillPriority + role family from the audit.
import { useMemo } from 'react';
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

// Role-family to domain AI course mapping
const ROLE_AI_COURSES: Record<string, { name: string; resource: string; hours: number }[]> = {
  engineering:    [{ name: 'GitHub Copilot for Engineers', resource: 'GitHub Skills (free)', hours: 6 }, { name: 'LLM-Powered Development', resource: 'deeplearning.ai (free)', hours: 8 }, { name: 'AI in Software Architecture', resource: 'Coursera (free audit)', hours: 10 }],
  data:           [{ name: 'AI-Augmented Data Analysis', resource: 'Kaggle Learn (free)', hours: 8 }, { name: 'LLMs for Data Scientists', resource: 'deeplearning.ai (free)', hours: 6 }, { name: 'AI-Assisted Visualisation', resource: 'DataCamp (free trial)', hours: 6 }],
  finance:        [{ name: 'AI in Financial Analysis', resource: 'CFA Institute resources', hours: 8 }, { name: 'FinGPT & Quant AI', resource: 'GitHub (free)', hours: 6 }, { name: 'AI-Augmented Modelling', resource: 'Wall Street Prep', hours: 10 }],
  healthcare:     [{ name: 'AI for Clinical Decision Support', resource: 'Coursera Stanford (free audit)', hours: 8 }, { name: 'Medical AI Ethics & Oversight', resource: 'WHO AI course (free)', hours: 4 }, { name: 'AI-Assisted Documentation', resource: 'Epic AI Training', hours: 6 }],
  marketing:      [{ name: 'AI Copywriting & Content', resource: 'HubSpot Academy (free)', hours: 5 }, { name: 'AI-Driven Campaign Analytics', resource: 'Google Skillshop (free)', hours: 6 }, { name: 'Generative AI for Marketers', resource: 'Coursera (free audit)', hours: 6 }],
  sales:          [{ name: 'AI Sales Automation', resource: 'Salesforce Trailhead (free)', hours: 5 }, { name: 'AI Prospecting & Qualification', resource: 'HubSpot Academy (free)', hours: 5 }, { name: 'Conversation AI Analysis', resource: 'Gong Learning (free)', hours: 4 }],
  hr:             [{ name: 'AI in Talent Acquisition', resource: 'SHRM AI resources', hours: 5 }, { name: 'People Analytics Foundations', resource: 'Coursera (free audit)', hours: 6 }, { name: 'AI-Augmented HR Operations', resource: 'LinkedIn Learning', hours: 4 }],
  legal:          [{ name: 'AI Legal Research Tools', resource: 'Westlaw AI Training', hours: 6 }, { name: 'Contract AI Review', resource: 'LexisNexis Learning', hours: 5 }, { name: 'AI Ethics for Legal Professionals', resource: 'Harvard CyberLaw (free)', hours: 4 }],
  operations:     [{ name: 'AI Process Automation', resource: 'Coursera (free audit)', hours: 6 }, { name: 'Supply Chain AI', resource: 'MIT OpenCourseWare (free)', hours: 8 }, { name: 'AI-Augmented Operations Research', resource: 'edX (free audit)', hours: 6 }],
  design:         [{ name: 'Generative AI for Designers', resource: 'Adobe Firefly Academy (free)', hours: 5 }, { name: 'AI UX Research Tools', resource: 'Nielsen Norman Group', hours: 4 }, { name: 'Midjourney & DALL-E Workflows', resource: 'YouTube courses (free)', hours: 4 }],
  default:        [{ name: 'AI Product Management / Strategy', resource: 'Product School (free)', hours: 8 }, { name: 'AI Application in Your Domain', resource: 'Coursera specialization (audit free)', hours: 10 }, { name: 'Portfolio: AI-Augmented Project', resource: 'Build & publish on GitHub', hours: 10 }],
};

function getRoleFamily(scoreResult: HybridResult): string {
  const role = ((scoreResult as any).roleTitle ?? '').toLowerCase();
  if (/engineer|developer|software|backend|frontend|fullstack|devops|sre|architect/.test(role)) return 'engineering';
  if (/data|analyst|scientist|ml|machine learning|ai researcher/.test(role)) return 'data';
  if (/finance|accountant|cfo|controller|banking|investment|analyst/.test(role)) return 'finance';
  if (/doctor|nurse|physician|therapist|clinical|medical|health/.test(role)) return 'healthcare';
  if (/marketing|brand|content|seo|growth|demand gen/.test(role)) return 'marketing';
  if (/sales|account executive|ae|bdr|sdr|revenue/.test(role)) return 'sales';
  if (/hr|human resources|talent|recruiter|people/.test(role)) return 'hr';
  if (/legal|lawyer|attorney|counsel|compliance/.test(role)) return 'legal';
  if (/operations|ops|supply chain|logistics|procurement/.test(role)) return 'operations';
  if (/design|ux|ui|product designer|creative/.test(role)) return 'design';
  return 'default';
}

function buildSprints(scoreResult: HybridResult): Sprint[] {
  const stack = scoreResult.techStackObsolescence;
  const roleFamily = getRoleFamily(scoreResult);
  const bridgeSkills = stack?.bridgeSkillPriority ?? [];

  // Phase 3: domain-specific AI — personalized
  const phase3Skills = ROLE_AI_COURSES[roleFamily] ?? ROLE_AI_COURSES.default;
  // If audit produced bridge skill recommendations, inject top 1 into phase 3
  const augmentedPhase3 = [...phase3Skills];
  if (bridgeSkills.length > 0 && roleFamily !== 'default') {
    augmentedPhase3[1] = { name: `Bridge skill: ${bridgeSkills[0]}`, resource: 'Coursera / LinkedIn Learning', hours: 8 };
  }

  return [
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
      skills: augmentedPhase3,
    },
  ];
}

export function FutureProofingRoadmap({ scoreResult }: Props) {
  const stack = scoreResult.techStackObsolescence;
  const d1Score = scoreResult.dimensions?.find(d => d.key === 'D1')?.score ?? 50;
  const urgency = d1Score > 70 ? 'URGENT' : d1Score > 45 ? 'RECOMMENDED' : 'MAINTENANCE';
  const sprints = useMemo(() => buildSprints(scoreResult), [scoreResult]);
  const totalHours = sprints.flatMap(s => s.skills).reduce((sum, sk) => sum + sk.hours, 0);
  const roleFamily = getRoleFamily(scoreResult);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          90-Day Futureproof Roadmap
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Personalized AI skill sprint for <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{roleFamily !== 'default' ? roleFamily : 'your role'}</strong>. {totalHours}h total — roughly 7h/week.
        </div>
      </div>

      {/* Urgency banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 10,
        background: urgency === 'URGENT' ? 'rgba(239,68,68,0.1)' : urgency === 'RECOMMENDED' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
        border: `1px solid ${urgency === 'URGENT' ? 'rgba(239,68,68,0.3)' : urgency === 'RECOMMENDED' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
        fontSize: 13, color: 'var(--text)', display: 'flex', gap: 10, alignItems: 'center',
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
      {sprints.map((sprint, si) => (
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
