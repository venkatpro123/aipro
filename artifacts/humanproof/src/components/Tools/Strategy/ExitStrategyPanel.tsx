// ExitStrategyPanel.tsx — Top escape paths from EscapePathReport
import { motion } from 'framer-motion';
import type { HybridResult } from '../../../types/hybridResult';

interface Props {
  scoreResult: HybridResult;
}

const EFFORT_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
const CONFIDENCE_COLORS = { High: '#10b981', Medium: '#f59e0b', Low: '#ef4444' };
const TYPE_ICONS: Record<string, string> = {
  company_switch:      '🏢',
  role_pivot:          '↩️',
  skill_deepening:     '📚',
  industry_shift:      '🔄',
  seniority_advance:   '⬆️',
  ai_augmentation:     '🤖',
  location_shift:      '🌍',
};

export function ExitStrategyPanel({ scoreResult }: Props) {
  const report = scoreResult.escapePaths;

  if (!report || report.paths.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
        Run a full audit to generate your personalized exit paths.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Exit Strategy</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Your top 3 highest-leverage career moves, ranked by estimated risk score reduction.
        </div>
      </div>

      {/* Analyst note */}
      {report.analystNote && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--cyan)' }}>Analyst note:</strong> {report.analystNote}
        </div>
      )}

      {/* Path cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {report.paths.map((path, i) => (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card-premium"
            style={{ padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{TYPE_ICONS[path.type] ?? '→'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{path.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{path.primaryDimension}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 22, color: '#10b981' }}>−{path.estimatedScoreDrop}pts</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>risk reduction</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: 14 }}>{path.rationale}</div>

            {/* Meta chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: `${EFFORT_COLORS[path.effort] ?? '#f59e0b'}18`, color: EFFORT_COLORS[path.effort] ?? '#f59e0b' }}>
                {path.effort} effort
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                {path.timeToImpact}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: `${CONFIDENCE_COLORS[path.confidenceInEstimate] ?? '#f59e0b'}18`, color: CONFIDENCE_COLORS[path.confidenceInEstimate] ?? '#f59e0b' }}>
                {path.confidenceInEstimate} confidence
              </span>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {path.steps.map((step, si) => (
                <div key={si} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--cyan)' }}>{si + 1}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{step.action}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{step.timeframe}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              Target profile: {path.targetProfile}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Synergy combos */}
      {report.synergyCombinations && report.synergyCombinations.length > 0 && (
        <div className="card-premium" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>Synergy Combinations</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.synergyCombinations.map((combo, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                <strong style={{ color: '#a78bfa' }}>{combo.pathATitle}</strong> + <strong style={{ color: '#a78bfa' }}>{combo.pathBTitle}</strong>
                {' '}— combined {combo.effortLevel} effort, compound score reduction possible
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
