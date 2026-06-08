// CareerMemorySummaryCard.tsx — Compact summary shown on /os home
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getCareerMemorySummary } from '../../services/careerMemoryService';
import type { CareerMemorySummary } from '../../services/careerMemoryService';

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function CareerMemorySummaryCard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CareerMemorySummary | null>(null);

  useEffect(() => {
    if (!user) return;
    getCareerMemorySummary(user.id).then(setSummary);
  }, [user]);

  if (!summary) return null;

  if (!summary.hasData) {
    return (
      <motion.div
        variants={cardVariant}
        className="card-premium"
        style={{ padding: '16px 18px', gridColumn: '1 / -1' }}
      >
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Career Memory
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Run your first audit to start building your career timeline.
        </div>
      </motion.div>
    );
  }

  const { firstAuditDate, daysMonitored, actionsCompleted, scoreDelta, currentScore, scoreAtFirstAudit } = summary;

  const deltaColor = scoreDelta === null ? 'rgba(255,255,255,0.5)' : scoreDelta < 0 ? '#10b981' : scoreDelta > 0 ? '#ef4444' : 'rgba(255,255,255,0.5)';
  const deltaSign = scoreDelta !== null && scoreDelta > 0 ? '+' : '';
  const sinceDate = firstAuditDate ? new Date(firstAuditDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

  return (
    <motion.div
      variants={cardVariant}
      className="card-premium"
      style={{ padding: '16px 20px', gridColumn: '1 / -1' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Career Memory
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
            Protecting your career since <strong style={{ color: 'var(--text)' }}>{sinceDate}</strong>
            {daysMonitored > 0 && <span style={{ color: 'rgba(255,255,255,0.35)' }}> · {daysMonitored} days monitored</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {scoreDelta !== null && scoreAtFirstAudit !== null && currentScore !== null && (
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Score Trend</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: deltaColor }}>
              {deltaSign}{Math.round(scoreDelta)} pts
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {Math.round(scoreAtFirstAudit)} → {Math.round(currentScore)}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Actions Done</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{actionsCompleted}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Decisions</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--cyan)' }}>{summary.decisionsRecorded}</div>
        </div>
      </div>
    </motion.div>
  );
}
