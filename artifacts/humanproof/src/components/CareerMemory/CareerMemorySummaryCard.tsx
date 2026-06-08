// CareerMemorySummaryCard.tsx — Compact summary shown on /os home
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCareerMemorySummary } from '../../services/careerMemoryService';
import type { CareerMemorySummary } from '../../services/careerMemoryService';
import { fetchUserProfile } from '../../services/userProfileService';
import { computeProfileCompleteness, completenessColor } from '../../services/profileCompletenessEngine';
import { CareerProgressNarrative } from './CareerProgressNarrative';

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function CareerMemorySummaryCard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CareerMemorySummary | null>(null);
  const [readiness, setReadiness] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getCareerMemorySummary(user.id).then(s => {
      setSummary(s);
      // Compute completeness after we have both profile + summary
      fetchUserProfile().then(profile => {
        const { score } = computeProfileCompleteness(profile, s, s.hasData);
        setReadiness(score);
      }).catch(() => {
        const { score } = computeProfileCompleteness(null, s, s.hasData);
        setReadiness(score);
      });
    });
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

  const rColor = readiness !== null ? completenessColor(readiness) : 'rgba(255,255,255,0.3)';

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

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
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
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Audits Run</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>{summary.auditCount}</div>
        </div>
      </div>

      {/* Progress narrative — when there's meaningful history */}
      {summary.hasData && summary.actionsCompleted > 0 && (
        <CareerProgressNarrative summary={summary} />
      )}

      {/* System Readiness bar */}
      {readiness !== null && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Readiness
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: rColor }}>{readiness}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${readiness}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 2, background: rColor }}
            />
          </div>
          {readiness < 70 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              Complete your profile to improve recommendations →{' '}
              <Link
                to="/tools/career-twin"
                style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 700 }}
              >
                Career Twin
              </Link>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
