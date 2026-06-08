// AIReplacementAnalysis.tsx — AI displacement analysis from HybridResult
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

export function AIReplacementAnalysis({ scoreResult }: Props) {
  const d1Dim = scoreResult.dimensions?.find(d => d.key === 'D1');
  const d1Score = d1Dim?.score ?? null;
  const tech = scoreResult.techStackObsolescence;
  const skillFit = scoreResult.skillPortfolioFit;

  const exposureColor = d1Score !== null
    ? (d1Score > 70 ? '#ef4444' : d1Score > 45 ? '#f59e0b' : '#10b981')
    : 'rgba(255,255,255,0.5)';

  const TASK_CATEGORIES = [
    { label: 'Data Entry & Processing', exposure: 95, automated: true },
    { label: 'Report Generation', exposure: 80, automated: true },
    { label: 'Pattern Recognition', exposure: 75, automated: true },
    { label: 'Customer Inquiry Routing', exposure: 70, automated: false },
    { label: 'Complex Problem Solving', exposure: 25, automated: false },
    { label: 'Stakeholder Negotiation', exposure: 15, automated: false },
    { label: 'Creative Strategy', exposure: 18, automated: false },
    { label: 'Cross-team Leadership', exposure: 12, automated: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>
          AI Replacement Analysis
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Task-level exposure to AI automation based on your role category.
        </div>
      </div>

      {/* D1 Score */}
      {d1Score !== null && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '20px 24px',
          borderRadius: 14,
          background: `${exposureColor}10`,
          border: `1px solid ${exposureColor}33`,
        }}>
          <div style={{ fontWeight: 800, fontSize: 48, color: exposureColor, lineHeight: 1 }}>
            {Math.round(d1Score)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              AI Displacement Score (D1)
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {d1Score > 70
                ? '🚨 High exposure — immediate upskilling recommended'
                : d1Score > 45
                ? '⚠️ Moderate exposure — build AI augmentation skills now'
                : '✅ Well-protected — continue staying ahead of AI adoption'}
            </div>
          </div>
        </div>
      )}

      {/* Tech stack signal */}
      {tech && (
        <div className="card-premium" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>
            Tech Stack Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: tech.primaryStackStatus === 'OBSOLETE' ? 'rgba(239,68,68,0.15)' :
                          tech.primaryStackStatus === 'LEGACY' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
              color: tech.primaryStackStatus === 'OBSOLETE' ? '#ef4444' :
                     tech.primaryStackStatus === 'LEGACY' ? '#f59e0b' : '#10b981',
              fontWeight: 700,
              fontSize: 12,
            }}>
              {tech.primaryStackStatus}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{tech.stackHealthLabel}</span>
          </div>
          {tech.bridgeSkillPriority.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              Priority bridge skills: {tech.bridgeSkillPriority.slice(0, 4).join(' · ')}
            </div>
          )}
        </div>
      )}

      {/* Task exposure matrix */}
      <div className="card-premium" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 14 }}>
          Task Exposure Matrix
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TASK_CATEGORIES.map((task, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{task.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {task.automated && (
                    <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>AUTO</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: task.exposure > 60 ? '#ef4444' : task.exposure > 35 ? '#f59e0b' : '#10b981' }}>
                    {task.exposure}%
                  </span>
                </div>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.exposure}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  style={{
                    height: '100%',
                    borderRadius: 2,
                    background: task.exposure > 60 ? '#ef4444' : task.exposure > 35 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Exposure % = likelihood this task type is partially or fully automated by 2027
        </div>
      </div>

      {/* Early warning signals */}
      {tech && (tech.primaryStackStatus === 'OBSOLETE' || tech.primaryStackStatus === 'LEGACY') && (
        <div style={{
          padding: '14px 18px',
          borderRadius: 12,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
              Early Warning: Tech Stack Obsolescence
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              Your primary tech stack is classified as {tech.primaryStackStatus.toLowerCase()}.
              Companies typically begin replacing workers with {tech.primaryStackStatus.toLowerCase()} skills
              12–24 months before full automation. Begin bridge skill development now.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
