// CareerMemoryTimeline — Rule 6 (Career Memory), Phase 4
// "Your Career Story" — full visual timeline grouped by year.
// Merges: audits, actions, decisions (careerMemoryService) + outcome events (Phase 3).
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getCareerTimeline, type TimelineEvent } from '../../../services/careerMemoryService';
import { getOutcomeEvents, type CareerOutcomeEvent, OUTCOME_LABELS, OUTCOME_ICONS } from '../../../services/careerOutcomeService';
import { RecordOutcomeModal } from '../../CareerOS/RecordOutcomeModal';
import { CareerDecisionRecorder } from '../../CareerMemory/CareerDecisionRecorder';

// ── Type icons + colors ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  audit:    { color: 'var(--cyan)',    icon: '🔍', label: 'Audit'     },
  action:   { color: '#10b981',        icon: '✅', label: 'Action'    },
  decision: { color: '#a78bfa',        icon: '🧭', label: 'Decision'  },
  outcome:  { color: '#f59e0b',        icon: '🏆', label: 'Outcome'   },
};

// ── Unified event shape ───────────────────────────────────────────────────────

interface UnifiedEvent {
  id: string;
  type: 'audit' | 'action' | 'decision' | 'outcome';
  date: Date;
  title: string;
  subtitle?: string;
  detail?: string;
  score?: number;         // readiness at audit time (inverted for display)
}

function outcomeToUnified(e: CareerOutcomeEvent): UnifiedEvent {
  return {
    id: `outcome-${e.id}`,
    type: 'outcome',
    date: new Date(e.eventDate),
    title: `${OUTCOME_ICONS[e.eventType]} ${OUTCOME_LABELS[e.eventType]}`,
    subtitle: [e.roleTitle, e.companyName].filter(Boolean).join(' @ ') || undefined,
    detail: (e.details?.note as string | undefined),
  };
}

function timelineToUnified(e: TimelineEvent): UnifiedEvent {
  return {
    id: e.id,
    type: e.type as UnifiedEvent['type'],
    date: new Date(e.date),
    title: e.title,
    subtitle: e.subtitle,
    score: e.type === 'audit' && e.score != null ? Math.round(100 - e.score) : undefined, // readiness
    detail: e.type === 'audit' && e.score != null ? `Readiness: ${Math.round(100 - e.score)}` : undefined,
  };
}

function groupByYear(events: UnifiedEvent[]): Map<number, UnifiedEvent[]> {
  const map = new Map<number, UnifiedEvent[]>();
  for (const e of events) {
    const yr = e.date.getFullYear();
    const group = map.get(yr) ?? [];
    group.push(e);
    map.set(yr, group);
  }
  return map;
}

// ── Event item ────────────────────────────────────────────────────────────────

function EventItem({ event }: { event: UnifiedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.action;
  const dateStr = event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Dot */}
      <div style={{
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
        background: cfg.color, boxShadow: `0 0 6px ${cfg.color}55`,
        marginTop: 5,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
        <div
          style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: event.detail ? 'pointer' : 'default' }}
          onClick={() => event.detail && setExpanded(e => !e)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
              {event.title}
            </div>
            {event.subtitle && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {event.subtitle}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 1 }}>
            {event.score != null && (
              <span style={{
                fontFamily: 'var(--font-mono, monospace)', fontSize: '0.7rem', fontWeight: 700,
                color: event.score >= 60 ? '#10b981' : event.score >= 40 ? '#f59e0b' : '#ef4444',
              }}>
                {event.score}
              </span>
            )}
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}>
              {dateStr}
            </span>
            {event.detail && (
              expanded ? <ChevronDown size={11} color="rgba(255,255,255,0.3)" /> : <ChevronRight size={11} color="rgba(255,255,255,0.3)" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && event.detail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                marginTop: 6, padding: '8px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
              }}>
                {event.detail}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CareerMemoryTimeline() {
  const { user } = useAuth();
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const loadTimeline = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [timelineEvents, outcomeEvents] = await Promise.all([
        getCareerTimeline(user.id),
        getOutcomeEvents(user.id),
      ]);
      const all: UnifiedEvent[] = [
        ...timelineEvents.map(timelineToUnified),
        ...outcomeEvents.map(outcomeToUnified),
      ];
      all.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(all);

      // Auto-expand the current and previous year
      const currentYear = new Date().getFullYear();
      setExpandedYears(new Set([currentYear, currentYear - 1]));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadTimeline(); }, [loadTimeline]);

  const grouped = groupByYear(events);
  const years = Array.from(grouped.keys()).sort((a, b) => b - a);

  // Stats
  const auditCount   = events.filter(e => e.type === 'audit').length;
  const actionCount  = events.filter(e => e.type === 'action').length;
  const outcomeCount = events.filter(e => e.type === 'outcome').length;
  const audits = events.filter(e => e.type === 'audit');
  const firstAuditScore = audits.at(-1)?.score;
  const latestAuditScore = audits.at(0)?.score;
  const readinessDelta = (firstAuditScore != null && latestAuditScore != null && audits.length >= 2)
    ? latestAuditScore - firstAuditScore : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.1em', fontFamily: 'var(--font-mono, monospace)', marginBottom: 4 }}>
            CAREER STORY
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
            Your Career Timeline
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Every audit, completed action, decision, and milestone — in one place.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowDecisionModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
              color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700,
            }}
          >
            <Plus size={11} /> Decision
          </button>
          <button
            type="button"
            onClick={() => setShowOutcomeModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700,
            }}
          >
            <Plus size={11} /> Win
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 }}>
          {[
            { label: 'Audits', value: auditCount, color: 'var(--cyan)' },
            { label: 'Actions', value: actionCount, color: '#10b981' },
            { label: 'Wins', value: outcomeCount, color: '#f59e0b' },
            ...(readinessDelta !== null ? [{
              label: 'Readiness Δ',
              value: (readinessDelta > 0 ? '+' : '') + readinessDelta,
              color: readinessDelta > 0 ? '#10b981' : readinessDelta < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)',
            }] : []),
          ].map(stat => (
            <div key={stat.label} className="card-premium" style={{ padding: '10px 12px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 4 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline by year */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', textAlign: 'center', padding: '32px 0' }}>
          Loading your career story…
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 12, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Your career story starts here</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
            Run your first audit and complete actions to build a timeline of your career progress.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {years.map(year => {
            const yearEvents = grouped.get(year) ?? [];
            const isExpanded = expandedYears.has(year);

            return (
              <div key={year}>
                {/* Year header */}
                <button
                  type="button"
                  onClick={() => setExpandedYears(prev => {
                    const next = new Set(prev);
                    if (next.has(year)) next.delete(year); else next.add(year);
                    return next;
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 0', textAlign: 'left' as const,
                  }}
                >
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan)',
                    fontFamily: 'var(--font-mono, monospace)',
                    padding: '2px 8px', borderRadius: 5,
                    background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)',
                  }}>
                    {year}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>
                    {yearEvents.length} event{yearEvents.length > 1 ? 's' : ''}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  {isExpanded ? <ChevronDown size={12} color="rgba(255,255,255,0.25)" /> : <ChevronRight size={12} color="rgba(255,255,255,0.25)" />}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{
                        overflow: 'hidden', paddingLeft: 12,
                        borderLeft: '1px solid rgba(255,255,255,0.07)',
                        marginLeft: 4, marginBottom: 8,
                      }}
                    >
                      {yearEvents.map(event => (
                        <EventItem key={event.id} event={event} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <RecordOutcomeModal
        open={showOutcomeModal}
        onClose={() => setShowOutcomeModal(false)}
        onRecorded={loadTimeline}
      />
      <CareerDecisionRecorder
        open={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        onSaved={loadTimeline}
      />
    </div>
  );
}
