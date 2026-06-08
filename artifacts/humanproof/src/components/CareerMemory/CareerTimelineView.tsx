// CareerTimelineView.tsx — Chronological timeline of all career events
import { motion } from 'framer-motion';
import type { TimelineEvent } from '../../services/careerMemoryService';

interface Props {
  events: TimelineEvent[];
  loading?: boolean;
}

const EVENT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  audit:    { emoji: '📊', color: 'rgba(0,212,255,0.6)',    bg: 'rgba(0,212,255,0.08)'    },
  action:   { emoji: '✓',  color: 'rgba(16,185,129,0.7)',   bg: 'rgba(16,185,129,0.08)'   },
  decision: { emoji: '🧭', color: 'rgba(167,139,250,0.7)',  bg: 'rgba(167,139,250,0.08)'  },
  outcome:  { emoji: '🏆', color: 'rgba(245,158,11,0.7)',   bg: 'rgba(245,158,11,0.08)'   },
};

function ScorePill({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: `${color}18`, color, border: `1px solid ${color}33`, marginLeft: 6,
    }}>
      {Math.round(score)}
    </span>
  );
}

export function CareerTimelineView({ events, loading }: Props) {
  if (loading) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
        Loading timeline…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0', fontSize: 13 }}>
        No career events yet. Run your first audit or record a career decision to start building your timeline.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((ev, i) => {
        const cfg = EVENT_CONFIG[ev.type] ?? EVENT_CONFIG.action;
        const isLast = i === events.length - 1;
        const dateStr = new Date(ev.date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        });

        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.6) }}
            style={{ display: 'flex', gap: 12 }}
          >
            {/* Spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', marginTop: 2,
                background: cfg.bg, border: `1.5px solid ${cfg.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, flexShrink: 0,
              }}>
                {cfg.emoji}
              </div>
              {!isLast && (
                <div style={{ width: 1.5, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4, marginBottom: 4 }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingTop: 4, paddingBottom: isLast ? 0 : 20, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>
                  {ev.title}
                </span>
                {ev.type === 'audit' && ev.score !== undefined && (
                  <ScorePill score={ev.score} />
                )}
              </div>
              {ev.subtitle && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{ev.subtitle}</div>
              )}
              {ev.type === 'decision' && ev.metadata?.notes && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginTop: 2 }}>
                  "{String(ev.metadata.notes)}"
                </div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{dateStr}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
