// CareerOSMemoryPanel.tsx — Phase 1 (Career OS)
// Shows monitoring history, career arc narrative, and pattern warnings.
// Reads only from careerMemoryService — no new services, no new DB tables.
// Calls onPatternsDetected so parent can wire pattern boosts into action ranking.

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCareerMemorySummary,
  getCareerTimeline,
  detectRepeatedPatterns,
  buildCareerArcNarrative,
  type CareerMemorySummary,
  type PatternDetection,
} from '../../services/careerMemoryService';

interface Props {
  onPatternsDetected?: (hasInaction: boolean, hasPlateau: boolean) => void;
}

export function CareerOSMemoryPanel({ onPatternsDetected }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CareerMemorySummary | null>(null);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [narrative, setNarrative] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      getCareerMemorySummary(user.id),
      getCareerTimeline(user.id),
    ]).then(([sum, events]) => {
      if (cancelled) return;
      const pats = detectRepeatedPatterns(events);
      const arc = buildCareerArcNarrative(sum, pats);
      setSummary(sum);
      setPatterns(pats);
      setNarrative(arc);
      onPatternsDetected?.(
        pats.some(p => p.patternType === 'repeated_inaction'),
        pats.some(p => p.patternType === 'plateau'),
      );
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading || !summary?.hasData) return null;

  const since = summary.firstAuditDate
    ? new Date(summary.firstAuditDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const deltaStr = summary.scoreDelta != null
    ? summary.scoreDelta > 0
      ? { label: `+${Math.abs(summary.scoreDelta)} pts`, color: '#ef4444', dir: '↑' }
      : summary.scoreDelta < 0
      ? { label: `−${Math.abs(summary.scoreDelta)} pts`, color: '#10b981', dir: '↓' }
      : { label: 'stable', color: 'rgba(255,255,255,0.35)', dir: '→' }
    : null;

  return (
    <div style={{
      padding: '13px 18px', borderRadius: 10, marginBottom: 14,
      background: 'rgba(0,245,255,0.015)', border: '1px solid rgba(0,245,255,0.08)',
    }}>

      {/* Header: label + stats chips */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, marginBottom: narrative || patterns.length > 0 ? 10 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.27)',
            letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            CAREER MEMORY
          </span>
          {since && (
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono, monospace)' }}>
              Since {since}
            </span>
          )}
          {deltaStr && (
            <span style={{
              padding: '1px 7px', borderRadius: 4, fontSize: '0.67rem', fontWeight: 700,
              color: deltaStr.color, background: `${deltaStr.color}12`,
              border: `1px solid ${deltaStr.color}28`, fontFamily: 'var(--font-mono, monospace)',
            }}>
              Risk {deltaStr.dir} {deltaStr.label}
            </span>
          )}
          {summary.actionsCompleted > 0 && (
            <span style={{
              padding: '1px 7px', borderRadius: 4, fontSize: '0.67rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-mono, monospace)',
            }}>
              {summary.actionsCompleted} action{summary.actionsCompleted !== 1 ? 's' : ''} done
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}>
          {summary.auditCount} audit{summary.auditCount !== 1 ? 's' : ''} · {summary.daysMonitored}d
        </span>
      </div>

      {/* Arc narrative — 1-2 sentences from buildCareerArcNarrative */}
      {narrative && (
        <p style={{
          margin: '0 0 10px', fontSize: '0.79rem', color: 'rgba(255,255,255,0.48)', lineHeight: 1.55,
        }}>
          {narrative}
        </p>
      )}

      {/* Pattern warnings — only shown when patterns are detected */}
      {patterns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {patterns.map((p, i) => {
            const color = p.patternType === 'repeated_inaction' ? '#ef4444'
              : p.patternType === 'plateau' ? '#f59e0b'
              : 'rgba(255,255,255,0.4)';
            const label = p.patternType === 'repeated_inaction' ? 'INACTION PATTERN'
              : p.patternType === 'plateau' ? 'SCORE PLATEAU'
              : 'PATTERN';
            return (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 7,
                background: `${color}08`, border: `1px solid ${color}20`,
                display: 'flex', alignItems: 'flex-start', gap: 9,
              }}>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 800, color, letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const, fontFamily: 'var(--font-mono, monospace)',
                  flexShrink: 0, paddingTop: 2, whiteSpace: 'nowrap' as const,
                }}>
                  {label}
                </span>
                <div>
                  <div style={{ fontSize: '0.76rem', color, fontWeight: 600, marginBottom: 2 }}>
                    {p.whatHappened}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
                    {p.whyItMatters}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
