// WeeklyCareerBriefCard.tsx — Phase 9: Monday weekly brief card on Career OS Home
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { getWeeklyCareerBrief, type WeeklyCareerBrief, type BriefSignal } from '../../services/proactiveInsightEngine';

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  INFO: 'var(--cyan)',
};

const TYPE_EMOJI: Record<string, string> = {
  layoff: '⚠️',
  hiring: '✅',
  market: '📊',
  ai: '🤖',
  personal: '👤',
};

function SignalRow({ signal }: { signal: BriefSignal }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{TYPE_EMOJI[signal.type] ?? '📡'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500, lineHeight: 1.4 }}>
          {signal.headline}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{signal.source}</div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        color: SEVERITY_COLOR[signal.severity] ?? 'var(--cyan)',
        padding: '2px 6px', borderRadius: 4,
        background: `${SEVERITY_COLOR[signal.severity] ?? 'var(--cyan)'}18`,
        border: `1px solid ${SEVERITY_COLOR[signal.severity] ?? 'var(--cyan)'}30`,
        flexShrink: 0,
      }}>
        {signal.severity}
      </span>
    </div>
  );
}

function isMonday(): boolean {
  return new Date().getDay() === 1;
}

export function WeeklyCareerBriefCard() {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [brief, setBrief] = useState<WeeklyCareerBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Always show on Monday; show on other days if there's critical data
  const shouldShow = isMonday() || (brief?.topSignals?.some(s => s.severity === 'CRITICAL') ?? false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const b = await getWeeklyCareerBrief(user.id, (state.scoreResult as any) ?? null);
        if (!cancelled) setBrief(b);
      } catch { /* non-fatal */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, state.scoreResult]);

  if (!user || loading || !shouldShow || !brief?.hasData) return null;

  const TrendIcon = brief.scoreTrend === 'improving' ? TrendingUp : brief.scoreTrend === 'worsening' ? TrendingDown : Minus;
  const trendColor = brief.scoreTrend === 'improving' ? '#10b981' : brief.scoreTrend === 'worsening' ? '#ef4444' : 'rgba(255,255,255,0.4)';

  return (
    <motion.div variants={itemVariant} style={{ gridColumn: '1 / -1' }}>
      <div className="card-premium" style={{ padding: '20px 22px', border: '1px solid rgba(0,212,255,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Newspaper size={15} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Weekly Career Brief
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
              · Week of {new Date(brief.weekStarting).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: trendColor }}>
            <TrendIcon size={13} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              Score {brief.scoreTrend === 'improving' ? `↓ ${Math.abs(brief.scoreDelta)}pts` : brief.scoreTrend === 'worsening' ? `↑ ${Math.abs(brief.scoreDelta)}pts` : 'stable'}
            </span>
          </div>
        </div>

        {/* Top signals */}
        {brief.topSignals.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {brief.topSignals.slice(0, expanded ? undefined : 2).map((s, i) => (
              <SignalRow key={i} signal={s} />
            ))}
            {brief.topSignals.length > 2 && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: 11, cursor: 'pointer', marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}
              >
                {expanded ? 'Show less' : `+${brief.topSignals.length - 2} more signals`}
                <ChevronRight size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
              </button>
            )}
          </div>
        )}

        {/* Priority action */}
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Priority this week
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            {brief.priorityAction}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
