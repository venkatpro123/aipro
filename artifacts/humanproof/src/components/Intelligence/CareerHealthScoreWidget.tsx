// CareerHealthScoreWidget.tsx — Phase 9: Composite career health score with sparkline
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { fetchUserProfile } from '../../services/userProfileService';
import { computeCareerHealthScore, type CareerHealthScore } from '../../services/proactiveInsightEngine';

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function Sparkline({ history }: { history: Array<{ total: number }> }) {
  if (history.length < 2) return null;
  const vals = history.map(h => h.total);
  const min = Math.min(...vals) - 5;
  const max = Math.max(...vals) + 5;
  const range = max - min || 1;
  const W = 120, H = 36;
  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--cyan)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      <circle
        cx={parseFloat(points.split(' ').at(-1)!.split(',')[0])}
        cy={parseFloat(points.split(' ').at(-1)!.split(',')[1])}
        r={3}
        fill="var(--cyan)"
      />
    </svg>
  );
}

const COMPONENT_LABELS: Record<string, string> = {
  riskComponent: 'Risk Protection',
  actionComponent: 'Action Momentum',
  skillComponent: 'Skill Growth',
  financialComponent: 'Financial Resilience',
};

const COMPONENT_MAX: Record<string, number> = {
  riskComponent: 40,
  actionComponent: 20,
  skillComponent: 20,
  financialComponent: 20,
};

function ComponentBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 2 }}
        />
      </div>
    </div>
  );
}

export function CareerHealthScoreWidget() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [health, setHealth] = useState<CareerHealthScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchUserProfile();
        const score = await computeCareerHealthScore(
          user.id,
          (state.scoreResult as any) ?? null,
          profile,
        );
        if (!cancelled) setHealth(score);
      } catch {
        // non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, state.scoreResult]);

  const TrendIcon = health?.trend === 'up' ? TrendingUp : health?.trend === 'down' ? TrendingDown : Minus;
  const trendColor = health?.trend === 'up' ? '#10b981' : health?.trend === 'down' ? '#ef4444' : 'rgba(255,255,255,0.4)';
  const ringColor = !health ? 'rgba(255,255,255,0.15)'
    : health.total >= 70 ? '#10b981'
    : health.total >= 45 ? '#f59e0b'
    : '#ef4444';

  return (
    <motion.div variants={itemVariant} className="card-premium" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} style={{ color: 'var(--cyan)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Career Health
          </span>
        </div>
        {health && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: trendColor }}>
            <TrendIcon size={13} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {health.trend === 'up' ? 'Improving' : health.trend === 'down' ? 'Declining' : 'Stable'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      ) : !user ? (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Sign in to see your career health score.</p>
      ) : (
        <>
          {/* Score ring + sparkline */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Ring */}
              <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
                  <motion.circle
                    cx={32} cy={32} r={26}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - (health?.total ?? 0) / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: ringColor, lineHeight: 1 }}>
                    {health?.total ?? '—'}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: ringColor, lineHeight: 1 }}>
                  {health?.total ?? '—'}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/100</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Career Health Score</div>
              </div>
            </div>

            {health && health.history.length >= 2 && (
              <Sparkline history={health.history} />
            )}
          </div>

          {/* Component bars */}
          {health && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['riskComponent', 'actionComponent', 'skillComponent', 'financialComponent'] as const).map(key => (
                <ComponentBar
                  key={key}
                  label={COMPONENT_LABELS[key]}
                  value={health[key]}
                  max={COMPONENT_MAX[key]}
                />
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
