// AIReadinessAnalysis.tsx — AI readiness scoring from HybridResult dimensions
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const AI_TOOLS_CHECKLIST = [
  { tool: 'ChatGPT / Claude',       category: 'LLM Productivity'       },
  { tool: 'GitHub Copilot',         category: 'Code Assistance'         },
  { tool: 'Midjourney / DALL·E',    category: 'Visual AI'               },
  { tool: 'Perplexity AI',          category: 'Research AI'             },
  { tool: 'Notion AI / Grammarly',  category: 'Writing AI'              },
  { tool: 'Zapier / Make',          category: 'Workflow Automation'      },
  { tool: 'Cursor / Codeium',       category: 'AI Dev Environment'       },
];

const SURVIVAL_FACTORS = [
  { label: 'Judgment & Decision Making',  description: 'Contextual decisions AI cannot make alone',       protected: true  },
  { label: 'Stakeholder Management',      description: 'Building trust and navigating org politics',       protected: true  },
  { label: 'Creative Problem Solving',    description: 'Novel solutions to undefined problems',            protected: true  },
  { label: 'Emotional Intelligence',      description: 'Empathy, conflict resolution, team dynamics',      protected: true  },
  { label: 'Routine Data Processing',     description: 'Repetitive analysis now handled by AI',            protected: false },
  { label: 'Template Report Writing',     description: 'Standard reports increasingly auto-generated',     protected: false },
];

export function AIReadinessAnalysis({ scoreResult }: Props) {
  const d1Score = scoreResult.dimensions?.find(d => d.key === 'D1')?.score ?? null;
  const d2Score = scoreResult.dimensions?.find(d => d.key === 'D2')?.score ?? null;
  const tech = scoreResult.techStackObsolescence;

  const protectionScore = d1Score !== null ? Math.max(0, 100 - d1Score) : null;
  const color = protectionScore !== null
    ? (protectionScore >= 65 ? '#10b981' : protectionScore >= 45 ? '#f59e0b' : '#ef4444')
    : 'rgba(255,255,255,0.5)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          AI Readiness Analysis
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your current protection score and survival factors against AI displacement.
        </div>
      </div>

      {/* Protection score */}
      {protectionScore !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '20px 24px',
          borderRadius: 14,
          background: `${color}10`,
          border: `1px solid ${color}33`,
        }}>
          <div style={{ fontWeight: 800, fontSize: 48, color, lineHeight: 1 }}>
            {Math.round(protectionScore)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              Career Protection Score
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {protectionScore >= 65 ? 'Well protected — keep augmenting with AI tools' :
               protectionScore >= 45 ? 'Moderate protection — build human-only strengths' :
               'Low protection — urgent action needed'}
            </div>
          </div>
        </div>
      )}

      {/* D1 and D2 */}
      {(d1Score !== null || d2Score !== null) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {d1Score !== null && (
            <div className="card-premium" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>AI DISPLACEMENT (D1)</div>
              <div style={{ fontWeight: 800, fontSize: 28, color: d1Score > 60 ? '#ef4444' : '#10b981' }}>{Math.round(d1Score)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{d1Score > 60 ? 'High exposure' : 'Well protected'}</div>
            </div>
          )}
          {d2Score !== null && (
            <div className="card-premium" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>SKILLS OBSOLESCENCE (D2)</div>
              <div style={{ fontWeight: 800, fontSize: 28, color: d2Score > 60 ? '#ef4444' : '#10b981' }}>{Math.round(d2Score)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{d2Score > 60 ? 'Upskill urgently' : 'Skills current'}</div>
            </div>
          )}
        </div>
      )}

      {/* Survival factors */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>
          Survival Factors
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SURVIVAL_FACTORS.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: f.protected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${f.protected ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
                fontSize: 11,
              }}>
                {f.protected ? '✓' : '⚠'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: f.protected ? '#10b981' : 'rgba(255,255,255,0.6)' }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{f.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI tool adoption checklist */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
          AI Tool Adoption Checklist
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
          Using these tools reduces AI displacement risk — you become the operator, not the replaced.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AI_TOOLS_CHECKLIST.map(item => (
            <div key={item.tool} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: '1px solid var(--border)',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
              }} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.tool}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>— {item.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
