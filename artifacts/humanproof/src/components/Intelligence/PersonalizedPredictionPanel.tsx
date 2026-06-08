// PersonalizedPredictionPanel.tsx — Phase 9: 90-day score forecast panel
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLayoff } from '../../context/LayoffContext';
import { generatePersonalizedPrediction, type PersonalizedPrediction } from '../../services/proactiveInsightEngine';

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface Props {
  /** When rendered inside an existing tab section (no card wrapper needed) */
  inline?: boolean;
}

function Gauge({ current, projected, low, high }: { current: number; projected: number; low: number; high: number }) {
  const width = 200;
  const height = 60;
  const toX = (v: number) => (v / 100) * width;

  const currentX = toX(current);
  const projX = toX(projected);
  const lowX = toX(low);
  const highX = toX(high);

  const projColor = projected < current ? '#10b981' : projected > current ? '#ef4444' : '#f59e0b';

  return (
    <svg width={width} height={height + 20} style={{ overflow: 'visible' }}>
      {/* Track */}
      <rect x={0} y={20} width={width} height={8} rx={4} fill="rgba(255,255,255,0.08)" />

      {/* CI band */}
      <rect x={lowX} y={20} width={highX - lowX} height={8} rx={0} fill={`${projColor}20`} />

      {/* Current */}
      <circle cx={currentX} cy={24} r={6} fill="rgba(255,255,255,0.6)" />
      <text x={currentX} y={14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">Now</text>
      <text x={currentX} y={44} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.5)">{current}</text>

      {/* Projected */}
      <circle cx={projX} cy={24} r={7} fill={projColor} />
      <text x={projX} y={14} textAnchor="middle" fontSize={9} fill={projColor} fontWeight="bold">90d</text>
      <text x={projX} y={44} textAnchor="middle" fontSize={9} fill={projColor} fontWeight="bold">{projected}</text>
    </svg>
  );
}

export function PersonalizedPredictionPanel({ inline = false }: Props) {
  const { user } = useAuth();
  const { state } = useLayoff();
  const [pred, setPred] = useState<PersonalizedPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  const currentScore = (state.scoreResult as any)?.total ?? null;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const p = await generatePersonalizedPrediction(user.id, currentScore);
        if (!cancelled) setPred(p);
      } catch { /* non-fatal */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, currentScore]);

  const TrendIcon = pred?.trend === 'improving' ? TrendingUp : pred?.trend === 'worsening' ? TrendingDown : Minus;
  const trendColor = pred?.trend === 'improving' ? '#10b981' : pred?.trend === 'worsening' ? '#ef4444' : '#f59e0b';

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {pred && <TrendIcon size={14} style={{ color: trendColor }} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          90-Day Projection
        </span>
      </div>

      {loading ? (
        <div style={{ height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
      ) : !pred ? (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Run your first audit to see a prediction.</p>
      ) : (
        <>
          {/* Score gauge */}
          {currentScore !== null && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
              <Gauge
                current={currentScore}
                projected={pred.projectedScore}
                low={pred.confidenceLow}
                high={pred.confidenceHigh}
              />
            </div>
          )}

          {/* Projection callout */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            background: `${trendColor}10`,
            border: `1px solid ${trendColor}25`,
          }}>
            <TrendIcon size={18} style={{ color: trendColor, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: trendColor }}>
                {pred.projectedScore}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
                  projected risk score
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {pred.confidenceLow}–{pred.confidenceHigh} confidence range ·{' '}
                {new Date(pred.projectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Narrative */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0 }}>
            {pred.driverNarrative}
          </p>

          {!pred.hasEnoughData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              <Info size={11} />
              Complete 2+ audits for a tighter confidence range.
            </div>
          )}
        </>
      )}
    </div>
  );

  if (inline) return <motion.div variants={itemVariant}>{content}</motion.div>;

  return (
    <motion.div variants={itemVariant} className="card-premium" style={{ padding: '20px 22px' }}>
      {content}
    </motion.div>
  );
}
