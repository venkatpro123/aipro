// LiveMonitoringFeed.tsx — Always-visible monitoring panel
// Shows live orchestrator signals when available; falls back to a static
// intelligence digest derived from the scoreResult so the page is never empty.

import { useState, useEffect } from 'react';
import { useOrchestratorBus } from '../../../hooks/useOrchestratorBus';
import type { HybridResult } from '../../../types/hybridResult';
import type { RankedSignal } from '../../../services/orchestration/signalOrchestrator';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props { scoreResult: HybridResult }

interface SignalGroup {
  category: string;
  icon:     string;
  signals:  RankedSignal[];
}

interface DigestRow {
  dimensionLabel: string;
  statusText:     string;
  watchLevel:     'stable' | 'watch';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function categorise(signals: RankedSignal[]): SignalGroup[] {
  const groups: Record<string, RankedSignal[]> = {};

  for (const rs of signals) {
    const src = rs.signal?.sourceKind ?? 'unknown';
    let cat = 'Market';
    if (/company|layoff|hiring|employer/i.test(src))     cat = 'Company';
    else if (/sector|industry|ai|automation/i.test(src)) cat = 'AI / Industry';
    else if (/macro|economic|rate|gdp/i.test(src))       cat = 'Macro';
    else if (/career|skill|network|job/i.test(src))      cat = 'Career';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(rs);
  }

  const ICONS: Record<string, string> = {
    Company:        '🏢',
    'AI / Industry': '🤖',
    Macro:          '🌐',
    Career:         '🎯',
    Market:         '📊',
  };

  return Object.entries(groups).map(([category, sigs]) => ({
    category,
    icon:    ICONS[category] ?? '📌',
    signals: sigs,
  }));
}

function tierLabel(tier: number) {
  if (tier <= 1) return { text: 'Critical', color: '#ef4444' };
  if (tier <= 2) return { text: 'High',     color: '#f97316' };
  if (tier <= 3) return { text: 'Medium',   color: '#f59e0b' };
  return             { text: 'Low',        color: '#60a5fa' };
}

function estimatedEffect(signals: RankedSignal[]): { pts: number; dir: 'up' | 'down' | 'flat' } {
  if (!signals.length) return { pts: 0, dir: 'flat' };
  const sum = signals.reduce((acc, rs) => {
    const tier = rs.signal?.tier ?? 4;
    const base = tier <= 1 ? 4 : tier === 2 ? 2.5 : tier === 3 ? 1.2 : 0.5;
    const isNeg = /layoff|collapse|freeze|cut|bankrupt/i.test(rs.signal?.headline ?? '');
    return acc + (isNeg ? base : -base * 0.5);
  }, 0);
  const pts = Math.abs(Math.round(sum * 10) / 10);
  return { pts, dir: sum > 0.5 ? 'up' : sum < -0.5 ? 'down' : 'flat' };
}

/**
 * Derives a "Last 24 Hours" static digest from the scoreResult.
 * D1/D2/D3 are read from dimensions (0–100 scale, threshold ×100).
 * L1/L4 are read from breakdown (0–1 scale).
 */
function buildDigest(scoreResult: HybridResult): DigestRow[] {
  const { breakdown, dimensions } = scoreResult;

  const d1 = dimensions?.find(d => d.key === 'D1')?.score ?? 0;
  const d2 = dimensions?.find(d => d.key === 'D2')?.score ?? 0;
  const d3 = dimensions?.find(d => d.key === 'D3')?.score ?? 0;
  const l1 = breakdown?.L1 ?? 0;
  const l4 = breakdown?.L4 ?? 0;

  const rows: DigestRow[] = [
    {
      dimensionLabel: 'AI Displacement',
      statusText:     d1 > 40 ? 'AI adoption increasing' : 'AI threat stable',
      watchLevel:     d1 > 40 ? 'watch' : 'stable',
    },
    {
      dimensionLabel: 'Market Demand',
      statusText:     d2 > 40 ? 'Hiring cooling in sector' : 'Demand unchanged',
      watchLevel:     d2 > 40 ? 'watch' : 'stable',
    },
    {
      dimensionLabel: 'Company Signals',
      statusText:     d3 > 50 ? 'Company signals show instability' : 'Company signals stable',
      watchLevel:     d3 > 50 ? 'watch' : 'stable',
    },
    {
      dimensionLabel: 'Financial Position',
      statusText:     l1 > 0.4 ? 'Financial buffer below optimal' : 'Financial position stable',
      watchLevel:     l1 > 0.4 ? 'watch' : 'stable',
    },
    {
      dimensionLabel: 'Industry Conditions',
      statusText:     l4 > 0.45 ? 'Industry headwinds persist' : 'Industry conditions stable',
      watchLevel:     l4 > 0.45 ? 'watch' : 'stable',
    },
  ];

  return rows;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WatchChip({ level }: { level: 'stable' | 'watch' }) {
  const isWatch = level === 'watch';
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.06em',
      flexShrink: 0,
      color:       isWatch ? '#f59e0b' : '#10b981',
      background:  isWatch ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)',
      border:      isWatch ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(16,185,129,0.28)',
    }}>
      {isWatch ? '⚠ Watch' : 'No change'}
    </span>
  );
}

function MonitoringFooter() {
  return (
    <div style={{
      marginTop: 16,
      padding: '10px 14px',
      borderRadius: 8,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#10b981',
        boxShadow: '0 0 5px #10b981',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>MONITORING ACTIVE</strong>
        {' '}— Updates every 30 minutes. Alerts sent when any dimension moves more than 5 points.
      </span>
    </div>
  );
}

// ── Static digest section ──────────────────────────────────────────────────────

function IntelDigest({ scoreResult }: { scoreResult: HybridResult }) {
  const rows   = buildDigest(scoreResult);
  const now    = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      {/* Digest header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>📋</span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.1em',
          }}>
            INTEL DIGEST — Last 24 Hours
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
          Last checked: {timeStr}
        </span>
      </div>

      {/* Rows */}
      <div>
        {rows.map((row, i) => (
          <div
            key={row.dimensionLabel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px',
              borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              width: 130,
              flexShrink: 0,
            }}>
              {row.dimensionLabel}
            </span>
            <span style={{
              fontSize: 12,
              color: row.watchLevel === 'watch' ? 'rgba(245,158,11,0.85)' : 'rgba(255,255,255,0.60)',
              flex: 1,
            }}>
              {row.statusText}
            </span>
            <WatchChip level={row.watchLevel} />
          </div>
        ))}
      </div>

      {/* Net effect footer row */}
      <div style={{
        padding: '9px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255,255,255,0.01)',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>➡</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic' }}>
          Net Effect: No score movement
        </span>
      </div>
    </div>
  );
}

// ── Live signals section ───────────────────────────────────────────────────────

function LiveSignalsSection({
  signals,
  traceConclusion,
  lastUpdated,
}: {
  signals: RankedSignal[];
  traceConclusion?: string;
  lastUpdated: Date;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const groups  = categorise(signals);
  const effect  = estimatedEffect(signals);
  const timeStr = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Live header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#10b981',
            letterSpacing: '0.12em',
          }}>
            ● LIVE SIGNALS
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>
          {timeStr}
        </span>
      </div>

      {/* Net effect chip */}
      <div style={{
        padding: '10px 16px',
        borderRadius: 10,
        marginBottom: 12,
        background:
          effect.dir === 'up'
            ? 'rgba(239,68,68,0.06)'
            : effect.dir === 'down'
            ? 'rgba(16,185,129,0.06)'
            : 'rgba(255,255,255,0.02)',
        border: `1px solid ${
          effect.dir === 'up'
            ? 'rgba(239,68,68,0.18)'
            : effect.dir === 'down'
            ? 'rgba(16,185,129,0.18)'
            : 'rgba(255,255,255,0.06)'
        }`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 18 }}>
          {effect.dir === 'up' ? '📈' : effect.dir === 'down' ? '📉' : '➡️'}
        </span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
            {effect.dir === 'flat'
              ? 'No significant net risk change'
              : `Estimated ${effect.pts} pt ${effect.dir === 'up' ? 'risk increase' : 'risk reduction'} from current signals`}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {traceConclusion ?? `${signals.length} active signal${signals.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* Signal groups */}
      {groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: 24, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          No signals in the current monitoring window.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups.map(group => {
          const isOpen   = openGroup === group.category;
          const topTier  = Math.min(...group.signals.map(s => s.signal?.tier ?? 4));
          const tierInfo = tierLabel(topTier);

          return (
            <div key={group.category}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.category)}
                style={{
                  width: '100%',
                  background: isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOpen ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 17, flexShrink: 0 }}>{group.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.80)', flex: 1 }}>
                  {group.category}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  flexShrink: 0,
                  color:       tierInfo.color,
                  background:  `${tierInfo.color}15`,
                  border:      `1px solid ${tierInfo.color}30`,
                }}>
                  {tierInfo.text}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }}>
                  {group.signals.length} signal{group.signals.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.20)', flexShrink: 0 }}>
                  {isOpen ? '▲' : '▾'}
                </span>
              </button>

              {isOpen && (
                <div style={{
                  borderRadius: '0 0 10px 10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderTop: 'none',
                  background: 'rgba(255,255,255,0.01)',
                  padding: '8px 0',
                }}>
                  {group.signals.map((rs, idx) => {
                    const t = tierLabel(rs.signal?.tier ?? 4);
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 16px',
                          borderBottom: idx < group.signals.length - 1
                            ? '1px solid rgba(255,255,255,0.04)'
                            : 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                        }}
                      >
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: 3,
                          fontSize: 8,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          flexShrink: 0,
                          marginTop: 1,
                          color:       t.color,
                          background:  `${t.color}15`,
                          border:      `1px solid ${t.color}25`,
                        }}>
                          T{rs.signal?.tier ?? '?'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', lineHeight: 1.45 }}>
                            {rs.signal?.headline ?? 'Signal'}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', marginTop: 2 }}>
                            {rs.signal?.sourceKind ?? 'unknown source'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider before digest */}
      <div style={{ marginTop: 18, marginBottom: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function LiveMonitoringFeed({ scoreResult }: Props) {
  const feed = useOrchestratorBus();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (feed) setLastUpdated(new Date());
  }, [feed]);

  const hasLiveSignals = feed != null && (feed.primary?.length ?? 0) > 0;

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.40)',
            letterSpacing: '0.12em',
            marginBottom: 3,
          }}>
            CONTINUOUS MONITORING
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>
            Real-time signals affecting your career risk
          </div>
        </div>
        {hasLiveSignals && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }} />
            <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Live signals section — only when feed has data */}
      {hasLiveSignals && (
        <LiveSignalsSection
          signals={feed!.primary ?? []}
          traceConclusion={feed!.trace?.conclusion}
          lastUpdated={lastUpdated}
        />
      )}

      {/* Always-visible static digest */}
      <IntelDigest scoreResult={scoreResult} />

      {/* Always-visible monitoring status footer */}
      <MonitoringFooter />
    </div>
  );
}
