// ProgressTrackerWidget.tsx — Phase 5 closed-loop progress widget
// Shows: Career Health Score + actions this week vs last week + score trajectory.
// Subscribes to hp:action-completed events to update without polling.
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Zap, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { computeCareerHealthScore } from '../../services/proactiveInsightEngine';
import { readServerTrajectory } from '../../services/serverScoreTrajectory';
import { loadCareerTwin } from '../../services/careerTwinService';
import { syncCompletionsFromServer } from '../../services/actionCompletionService';
import type { HybridResult } from '../../types/hybridResult';
import type { UserProfile } from '../../services/userProfileService';

interface Props {
  profile?: Partial<UserProfile> | null;
}

function TrajectoryIcon({ status }: { status: string }) {
  if (status === 'improving') return <TrendingDown size={14} style={{ color: '#10b981' }} />;
  if (status === 'worsening') return <TrendingUp size={14} style={{ color: '#ef4444' }} />;
  return <Minus size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />;
}

function HealthRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444';

  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={28} cy={28} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        <circle
          cx={28} cy={28} r={radius} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 13, fontWeight: 800, color,
      }}>
        {score}
      </div>
    </div>
  );
}

export function ProgressTrackerWidget({ profile }: Props) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const scoreResult = state.scoreResult as HybridResult | null;

  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [actionsThisWeek, setActionsThisWeek] = useState<number>(0);
  const [trajectoryStatus, setTrajectoryStatus] = useState<string>('insufficient_data');
  const [scoreDelta7d, setScoreDelta7d] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || !scoreResult) { setIsLoading(false); return; }

    try {
      const [healthResult, twin, trajectory, completions] = await Promise.all([
        computeCareerHealthScore(user.id, scoreResult, profile as UserProfile ?? null).catch(() => null),
        loadCareerTwin(),
        readServerTrajectory(user.id, 10),
        syncCompletionsFromServer(),
      ]);

      if (healthResult) setHealthScore(Math.round(healthResult.total));
      setActionsThisWeek(twin?.actionsCompletedThisWeek ?? completions.completedIds.size);

      if (trajectory.entries.length >= 2) {
        const latest = trajectory.entries[0]?.score ?? null;
        const weekAgo = trajectory.entries[trajectory.entries.length - 1]?.score ?? null;
        if (latest != null && weekAgo != null) {
          setScoreDelta7d(latest - weekAgo);
          setTrajectoryStatus(latest < weekAgo ? 'improving' : latest > weekAgo ? 'worsening' : 'stable');
        }
      }
    } catch { /* offline — keep stale state */ } finally {
      setIsLoading(false);
    }
  }, [user, scoreResult, profile]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Listen for action completion events to update the counter optimistically
  useEffect(() => {
    const handler = () => {
      setActionsThisWeek(prev => prev + 1);
    };
    window.addEventListener('hp:action-completed', handler);
    return () => window.removeEventListener('hp:action-completed', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="card-premium" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '60%', animation: 'pulse 1.6s ease-in-out infinite' }} />
            <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '40%', animation: 'pulse 1.6s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }
  if (!scoreResult) return null;

  const momentumLabel = trajectoryStatus === 'improving'
    ? 'Risk improving'
    : trajectoryStatus === 'worsening'
      ? 'Risk increasing'
      : 'Score stable';

  const deltaLabel = scoreDelta7d != null
    ? (scoreDelta7d > 0 ? `+${scoreDelta7d}pts` : `${scoreDelta7d}pts`) + ' (7d)'
    : null;

  return (
    <motion.div
      className="card-premium"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{ padding: '18px 20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="label-xs" style={{ color: 'var(--text-3)' }}>YOUR MOMENTUM</div>
        <Zap size={14} style={{ color: 'var(--cyan)' }} />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Career Health ring */}
        {healthScore != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HealthRing score={healthScore} />
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Career Health
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {healthScore >= 70 ? 'Strong position' : healthScore >= 50 ? 'Needs attention' : 'Take action now'}
              </div>
            </div>
          </div>
        )}

        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Actions this week */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: actionsThisWeek > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${actionsThisWeek > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CheckCircle2 size={16} style={{ color: actionsThisWeek > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {actionsThisWeek}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>actions this week</div>
          </div>
        </div>

        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Trajectory */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrajectoryIcon status={trajectoryStatus} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{momentumLabel}</div>
            {deltaLabel && (
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: scoreDelta7d! < 0 ? '#10b981' : scoreDelta7d! > 0 ? '#ef4444' : 'rgba(255,255,255,0.4)',
              }}>
                {deltaLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
