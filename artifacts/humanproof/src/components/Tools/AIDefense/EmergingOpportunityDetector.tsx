// EmergingOpportunityDetector.tsx — Emerging role opportunities from AI shift
import type { HybridResult } from '../../../types/hybridResult';
import { TrendingUp, ArrowRight } from 'lucide-react';

interface Props {
  scoreResult: HybridResult;
}

const EMERGING_ROLES = [
  { title: 'AI Product Manager',         demandGrowth: '+67%', salaryRange: '$130K–$200K', effort: 'Medium'  },
  { title: 'Prompt Engineer',            demandGrowth: '+120%', salaryRange: '$95K–$160K', effort: 'Low'     },
  { title: 'AI Safety Specialist',       demandGrowth: '+89%', salaryRange: '$140K–$220K', effort: 'High'    },
  { title: 'ML Operations Engineer',     demandGrowth: '+74%', salaryRange: '$120K–$190K', effort: 'High'    },
  { title: 'AI Workflow Consultant',     demandGrowth: '+55%', salaryRange: '$100K–$160K', effort: 'Medium'  },
  { title: 'Human-AI Collaboration Lead',demandGrowth: '+48%', salaryRange: '$110K–$175K', effort: 'Medium'  },
  { title: 'Data Labeling / RLHF Trainer',demandGrowth: '+38%', salaryRange: '$60K–$95K',  effort: 'Low'     },
];

export function EmergingOpportunityDetector({ scoreResult }: Props) {
  const marketDemand = scoreResult.roleMarketDemand;
  const d1Score = scoreResult.dimensions?.find(d => d.key === 'D1')?.score ?? 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          Emerging Role Opportunities
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          AI is creating new roles adjacent to yours. Identify your highest-value pivot targets.
        </div>
      </div>

      {marketDemand && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
            Your Current Role Demand Signal
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>DEMAND INDEX</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--cyan)' }}>
                {Math.round(marketDemand.adjustedDemandIndex ?? marketDemand.snapshot?.demandIndex ?? 50)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>SEARCH RUNWAY</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                ~{marketDemand.jobSearchRunwayWeeks ?? '8–12'} weeks
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>AI DISPLACEMENT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: d1Score > 60 ? '#ef4444' : '#10b981' }}>
                D1: {Math.round(d1Score)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
        High-Growth AI-Adjacent Roles
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 16, marginTop: -8 }}>
        Roles growing fastest due to the AI transformation — all accessible with upskilling.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {EMERGING_ROLES.map((role, i) => (
          <div key={i} className="card-premium" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <TrendingUp size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{role.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                {role.salaryRange} · Effort to pivot: {role.effort}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#10b981', flexShrink: 0 }}>
              {role.demandGrowth}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '14px 18px',
        borderRadius: 12,
        background: 'rgba(0,212,255,0.06)',
        border: '1px solid rgba(0,212,255,0.15)',
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--cyan)' }}>Your transition path:</strong>{' '}
        With AI displacement score of {Math.round(d1Score)}, pivoting to an AI-augmenting role within 12 months
        is {d1Score > 60 ? 'strongly recommended' : 'a smart career insurance move'}.
        Start with the Futureproof Roadmap tab to close skill gaps.
      </div>
    </div>
  );
}
