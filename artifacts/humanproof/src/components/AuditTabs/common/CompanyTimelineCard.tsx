// CompanyTimelineCard.tsx — Beast Mode V3 Tab 2
//
// Company Story: chronological timeline of significant events (layoffs, hires,
// leadership changes, financial news) showing the company narrative arc.
// Sources:
//   result.layoffEvents / result.derivedLayoffEvents → workforce events
//   result.layoffRounds (companyData)               → confirmed rounds
//   result.warnSignal                               → legal filings
//   result.executiveMovement                        → leadership changes
//   companyData.recentLayoffCount / date            → latest signal
//
// Renders when at least 2 events exist. Sorted newest-first.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, TrendingUp, TrendingDown, AlertTriangle, UserMinus, Briefcase } from 'lucide-react';
import type { TabProps } from './types';

interface TimelineEvent {
  id: string;
  date: string;       // ISO or human-readable
  dateMs: number;     // for sorting
  type: 'layoff' | 'hiring' | 'leadership' | 'financial' | 'warn' | 'expansion';
  label: string;
  detail?: string;
  severity: 'critical' | 'warning' | 'neutral' | 'positive';
}

function eventColor(type: TimelineEvent['type'], severity: TimelineEvent['severity']): string {
  if (severity === 'critical') return '#dc2626';
  if (severity === 'warning')  return '#f97316';
  if (severity === 'positive') return '#10b981';
  const typeColors: Record<TimelineEvent['type'], string> = {
    layoff:     '#f97316',
    hiring:     '#10b981',
    leadership: '#a78bfa',
    financial:  '#22d3ee',
    warn:       '#dc2626',
    expansion:  '#10b981',
  };
  return typeColors[type] ?? '#94a3b8';
}

function eventIcon(type: TimelineEvent['type']): React.ElementType {
  const icons: Record<TimelineEvent['type'], React.ElementType> = {
    layoff:     UserMinus,
    hiring:     Briefcase,
    leadership: TrendingDown,
    financial:  TrendingUp,
    warn:       AlertTriangle,
    expansion:  Building2,
  };
  return icons[type] ?? Building2;
}

function formatEventDate(dateMs: number): string {
  if (!dateMs || isNaN(dateMs)) return '';
  const d = new Date(dateMs);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

function parseDateMs(val: string | number | null | undefined): number {
  if (!val) return 0;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

interface CompanyTimelineCardProps {
  result: TabProps['result'];
  companyData: TabProps['companyData'];
}

export const CompanyTimelineCard: React.FC<CompanyTimelineCardProps> = ({ result, companyData }) => {
  const r = result as any;
  const cd = companyData as any;

  const events: TimelineEvent[] = useMemo(() => {
    const out: TimelineEvent[] = [];

    // 1. WARN Act filing
    if (r.warnSignal?.hasActiveWARN) {
      const dt = parseDateMs(r.warnSignal?.filingDate ?? r.warnSignal?.date);
      out.push({
        id: 'warn-0',
        date: r.warnSignal?.filingDate ?? 'Recent',
        dateMs: dt || Date.now() - 30 * 24 * 60 * 60 * 1000,
        type: 'warn',
        label: 'WARN Act Filing',
        detail: r.warnSignal?.workerCount
          ? `${r.warnSignal.workerCount.toLocaleString()} workers — 60-day legal advance notice`
          : 'Legal 60-day advance notice filed',
        severity: 'critical',
      });
    }

    // 2. Confirmed layoff rounds (layoffsLast24Months is the array; layoffRounds is a count)
    const rawRounds = cd?.layoffsLast24Months ?? r.layoffsLast24Months ?? cd?.layoffRounds ?? r.layoffRounds ?? [];
    const rounds: any[] = Array.isArray(rawRounds) ? rawRounds : [];
    rounds.forEach((round: any, i: number) => {
      const dt = parseDateMs(round.date ?? round.announcedDate);
      if (!dt) return;
      const pct = typeof round.percentCut === 'number' ? ` (${round.percentCut}% of workforce)` : '';
      out.push({
        id: `round-${i}`,
        date: round.date ?? round.announcedDate ?? '',
        dateMs: dt,
        type: 'layoff',
        label: `Layoff Round${pct}`,
        detail: round.source ? `Source: ${round.source}` : undefined,
        severity: (round.percentCut ?? 0) >= 15 ? 'critical' : 'warning',
      });
    });

    // 3. Derived layoff events from news
    const derivedEvents: any[] = r.derivedLayoffEvents ?? r.layoffEvents ?? [];
    derivedEvents.slice(0, 4).forEach((ev: any, i: number) => {
      const dt = parseDateMs(ev.date ?? ev.publishedAt);
      if (!dt) return;
      // Don't duplicate confirmed rounds (date within 7 days)
      const isDup = out.some(e => e.type === 'layoff' && Math.abs(e.dateMs - dt) < 7 * 24 * 60 * 60 * 1000);
      if (isDup) return;
      out.push({
        id: `derived-${i}`,
        date: ev.date ?? ev.publishedAt ?? '',
        dateMs: dt,
        type: 'layoff',
        label: ev.headline ?? ev.title ?? 'Workforce Reduction Signal',
        detail: ev.source ? `via ${ev.source}` : undefined,
        severity: 'warning',
      });
    });

    // 4. Executive movement / leadership changes
    const execMovement = r.executiveMovement;
    if (execMovement?.recentChanges?.length > 0) {
      execMovement.recentChanges.slice(0, 2).forEach((change: any, i: number) => {
        const dt = parseDateMs(change.date);
        out.push({
          id: `exec-${i}`,
          date: change.date ?? 'Recent',
          dateMs: dt || Date.now() - 60 * 24 * 60 * 60 * 1000,
          type: 'leadership',
          label: `${change.type === 'departure' ? 'Leadership Departure' : 'Leadership Change'}${change.role ? ` — ${change.role}` : ''}`,
          detail: change.name ?? undefined,
          severity: change.type === 'departure' ? 'warning' : 'neutral',
        });
      });
    }

    // 5. Hiring signal — positive event if recent hiring momentum
    if (r.hiringMomentum?.trend === 'increasing' || r.hiringSignal?.openRolesCount > 50) {
      out.push({
        id: 'hiring-0',
        date: 'Current',
        dateMs: Date.now() - 14 * 24 * 60 * 60 * 1000,
        type: 'hiring',
        label: 'Active Hiring Momentum',
        detail: r.hiringSignal?.openRolesCount
          ? `${r.hiringSignal.openRolesCount.toLocaleString()} open roles detected`
          : 'Positive hiring signals observed',
        severity: 'positive',
      });
    }

    // Sort newest first, deduplicate by proximity
    out.sort((a, b) => b.dateMs - a.dateMs);
    return out.slice(0, 8);
  }, [result, companyData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (events.length < 2) return null;

  const companyName = cd?.name ?? r.companyName ?? 'This company';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-08)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--alpha-bg-06)' }}
      >
        <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22d3ee' }} />
        <span className="text-[11px] font-black tracking-[0.08em] uppercase" style={{ color: 'var(--alpha-text-55)' }}>
          Company Story
        </span>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(34,211,238,0.10)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.22)' }}
        >
          {events.length} events
        </span>
        <p className="ml-auto text-[10px]" style={{ color: 'var(--alpha-text-25)' }}>{companyName}</p>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 flex flex-col gap-0">
        {events.map((ev, i) => {
          const color = eventColor(ev.type, ev.severity);
          const Icon  = eventIcon(ev.type);
          const isLast = i === events.length - 1;

          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              className="flex gap-3"
            >
              {/* Spine line + dot */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: color + '18', border: `1.5px solid ${color}55`, marginTop: 2 }}
                >
                  <Icon className="w-2.5 h-2.5" style={{ color }} />
                </div>
                {!isLast && (
                  <div
                    className="flex-1 mt-1"
                    style={{ width: 1, background: 'var(--alpha-bg-08)', minHeight: 16 }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-3'}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-[11px] font-semibold leading-snug" style={{ color: 'var(--alpha-text-85)' }}>
                    {ev.label}
                  </p>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--alpha-text-30)', fontFamily: 'var(--font-mono)' }}>
                    {ev.dateMs ? formatEventDate(ev.dateMs) : ev.date}
                  </span>
                </div>
                {ev.detail && (
                  <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--alpha-text-35)' }}>
                    {ev.detail}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CompanyTimelineCard;
