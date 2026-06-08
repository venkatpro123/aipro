// PeerComparisonInsight.tsx — Phase 9: Anonymized peer cohort comparison
// k-anonymity enforced: only shown when cohort ≥ 20 users
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { fetchUserProfile } from '../../services/userProfileService';
import { getPeerComparisonInsight, type PeerComparisonInsight as PeerData } from '../../services/proactiveInsightEngine';

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function PercentileBar({ percentile }: { percentile: number }) {
  // 0 = best (lowest risk), 100 = worst (highest risk)
  const color = percentile <= 30 ? '#10b981' : percentile <= 60 ? '#f59e0b' : '#ef4444';
  const label = percentile <= 30 ? 'Top performer' : percentile <= 60 ? 'Average' : 'Needs attention';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Your rank in cohort</span>
        <span style={{ fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        {/* Gradient track */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)', opacity: 0.25 }} />
        {/* User marker */}
        <motion.div
          initial={{ left: '50%' }}
          animate={{ left: `${percentile}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: -2, width: 10, height: 10, borderRadius: '50%',
            background: color, border: '2px solid var(--bg)', transform: 'translateX(-50%)',
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
        <span>Lowest risk</span>
        <span>Highest risk</span>
      </div>
    </div>
  );
}

interface Props {
  /** Compact mode for embedding in cards */
  compact?: boolean;
}

export function PeerComparisonInsight({ compact = false }: Props) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [data, setData] = useState<PeerData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentScore = (state.scoreResult as any)?.total ?? null;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchUserProfile();
        const peer = await getPeerComparisonInsight(user.id, profile, currentScore);
        if (!cancelled) setData(peer);
      } catch { /* non-fatal */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, currentScore]);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={14} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Peer Comparison
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Lock size={10} style={{ color: 'rgba(255,255,255,0.25)' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Anonymized</span>
        </div>
      </div>

      {loading ? (
        <div style={{ height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      ) : !data || !data.hasEnoughData ? (
        <div style={{ padding: '14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
            Peer comparison data builds as more users complete audits.
            Requires a cohort of 20+ to ensure anonymity.
          </p>
        </div>
      ) : (
        <>
          {/* Cohort label */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Comparing you against <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{data.cohortSize} anonymized professionals</strong>
            <br />
            <span style={{ fontSize: 10 }}>{data.cohortLabel}</span>
          </div>

          {/* Percentile bar */}
          <PercentileBar percentile={data.percentileRank} />

          {/* Top action stat */}
          {!compact && data.avgScoreReduction > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                Peers who completed{' '}
                <strong style={{ color: '#10b981' }}>{data.topActionForCohort}</strong>{' '}
                reduced their risk score by an avg of{' '}
                <strong style={{ color: '#10b981' }}>{data.avgScoreReduction} pts</strong>.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (compact) return <motion.div variants={itemVariant}>{content}</motion.div>;

  return (
    <motion.div variants={itemVariant} className="card-premium" style={{ padding: '20px 22px' }}>
      {content}
    </motion.div>
  );
}
