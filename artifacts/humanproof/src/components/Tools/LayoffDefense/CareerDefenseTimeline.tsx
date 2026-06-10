// CareerDefenseTimeline.tsx — Career Defense Memory (Problem #9)
// Shows: started monitoring date, risk then vs now, actions completed, skills added, improvement %

import { useEffect, useMemo } from 'react';
import type { HybridResult } from '../../../types/hybridResult';

// ── localStorage keys (all prefixed hp_) ────────────────────────────────────

const KEY_FIRST_AUDIT_DATE   = 'hp_first_audit_date';
const KEY_BASELINE_SCORE     = 'hp_audit_baseline_score';
const KEY_COMPLETED_ACTIONS  = 'hp_completed_actions';
const KEY_ACTION_OUTCOMES    = 'hp_action_outcomes';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readFirstAuditDate(): string | null {
  try { return localStorage.getItem(KEY_FIRST_AUDIT_DATE); }
  catch { return null; }
}

function writeFirstAuditDate(iso: string): void {
  try { localStorage.setItem(KEY_FIRST_AUDIT_DATE, iso); } catch { }
}

function readBaselineScore(): number | null {
  try {
    const raw = localStorage.getItem(KEY_BASELINE_SCORE);
    if (raw === null) return null;
    const n = parseFloat(raw);
    return isFinite(n) ? n : null;
  } catch { return null; }
}

function writeBaselineScore(score: number): void {
  try { localStorage.setItem(KEY_BASELINE_SCORE, String(score)); } catch { }
}

function readCompletedActions(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_COMPLETED_ACTIONS) ?? '[]') as string[]; }
  catch { return []; }
}

interface ActionOutcome {
  actionId:  string;
  outcomeId: string;
  date:      string;
}

function readActionOutcomes(): ActionOutcome[] {
  try { return JSON.parse(localStorage.getItem(KEY_ACTION_OUTCOMES) ?? '[]') as ActionOutcome[]; }
  catch { return []; }
}

/** Format ISO date string as "Apr 2026" */
function formatMonthYear(iso: string): string {
  try {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return 'Unknown';
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return 'Unknown'; }
}

/** Days between two ISO date strings */
function daysBetween(earlierIso: string, laterIso: string): number {
  try {
    const ms = new Date(laterIso).getTime() - new Date(earlierIso).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  } catch { return 0; }
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  scoreResult: HybridResult;
}

export function CareerDefenseTimeline({ scoreResult }: Props) {
  const currentScore = scoreResult.total ?? 0;
  const todayIso     = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // On first render: record first audit date and baseline score if not yet stored.
  useEffect(() => {
    if (!readFirstAuditDate()) {
      writeFirstAuditDate(todayIso);
    }
    if (readBaselineScore() === null) {
      writeBaselineScore(currentScore);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive display values (read-only after init guard above has run)
  const firstAuditDate   = readFirstAuditDate() ?? todayIso;
  const baselineScore    = readBaselineScore()  ?? currentScore;
  const completedActions = readCompletedActions();
  const actionOutcomes   = readActionOutcomes();

  const daysActive       = daysBetween(firstAuditDate, todayIso);
  const isFirstSession   = daysActive === 0;
  const improvement      = baselineScore - currentScore; // positive = risk went down
  const completedCount   = completedActions.length;
  const positiveOutcomes = actionOutcomes.filter(o => o.outcomeId !== 'no_change').length;

  // ── Styles ────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    height: 48,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.13em',
    color: 'rgba(255,255,255,0.35)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const dividerStyle: React.CSSProperties = {
    width: 1,
    height: 20,
    background: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  };

  const chipStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 8px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };

  const chipLabelStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: 600,
  };

  const chipValueStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.85)',
  };

  // ── First-session state ───────────────────────────────────────────────────

  if (isFirstSession) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>CAREER DEFENSE ACTIVE</span>
        <div style={dividerStyle} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 6,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>
            First session — baseline recorded
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 4, padding: '1px 5px',
          }}>
            {Math.round(currentScore)}
          </span>
        </div>
      </div>
    );
  }

  // ── Active-session chips ──────────────────────────────────────────────────

  const improvementPositive = improvement > 0;
  const improvementColor    = improvementPositive ? '#10b981' : improvement < 0 ? '#ef4444' : 'rgba(255,255,255,0.45)';
  const arrow               = improvementPositive ? '▼' : improvement < 0 ? '▲' : '→';

  return (
    <div style={containerStyle}>
      {/* Label */}
      <span style={labelStyle}>CAREER DEFENSE ACTIVE</span>
      <div style={dividerStyle} />

      {/* Chip 1 — Started date */}
      <div style={chipStyle}>
        <span style={chipLabelStyle}>Started</span>
        <span style={chipValueStyle}>{formatMonthYear(firstAuditDate)}</span>
      </div>

      {/* Chip 2 — Risk then → now */}
      <div style={{ ...chipStyle, gap: 4 }}>
        <span style={chipLabelStyle}>Risk</span>
        <span style={{ ...chipValueStyle, color: 'rgba(255,255,255,0.5)' }}>
          {Math.round(baselineScore)}
        </span>
        <span style={{ fontSize: 10, color: improvementColor, fontWeight: 800 }}>
          {arrow}
        </span>
        <span style={{ ...chipValueStyle, color: improvementPositive ? '#10b981' : improvement < 0 ? '#ef4444' : 'rgba(255,255,255,0.85)' }}>
          {Math.round(currentScore)}
        </span>
      </div>

      {/* Chip 3 — Actions done */}
      <div style={chipStyle}>
        <span style={{ ...chipValueStyle, color: '#60a5fa' }}>{completedCount}</span>
        <span style={chipLabelStyle}>actions done</span>
        {positiveOutcomes > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: '#10b981',
            background: 'rgba(16,185,129,0.1)', borderRadius: 3, padding: '1px 4px',
          }}>
            {positiveOutcomes} +ve
          </span>
        )}
      </div>

      {/* Chip 4 — Net improvement */}
      <div style={{
        ...chipStyle,
        border: `1px solid ${improvementPositive ? 'rgba(16,185,129,0.2)' : improvement < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
        background: improvementPositive ? 'rgba(16,185,129,0.06)' : improvement < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
      }}>
        <span style={chipLabelStyle}>Net</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: improvementColor }}>
          {improvement > 0 ? '-' : improvement < 0 ? '+' : ''}{Math.abs(Math.round(improvement))} pts
        </span>
        <span style={{ fontSize: 9, color: improvementColor, fontWeight: 600 }}>
          {improvementPositive ? 'improved' : improvement < 0 ? 'worsened' : 'stable'}
        </span>
      </div>

      {/* Days active badge — spacer right edge */}
      <span style={{
        marginLeft: 'auto',
        fontSize: 9,
        color: 'rgba(255,255,255,0.2)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        paddingLeft: 4,
      }}>
        Day {daysActive}
      </span>
    </div>
  );
}
