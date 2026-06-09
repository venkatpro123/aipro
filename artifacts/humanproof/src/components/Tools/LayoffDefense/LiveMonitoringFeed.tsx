// LiveMonitoringFeed.tsx — Phase 8: Continuous Monitoring
// Subscribes to the orchestrator bus and renders a live 24h delta feed.
// Groups signals by category; shows net risk effect estimate.

import { useState, useEffect } from 'react';
import { useOrchestratorBus } from '../../../hooks/useOrchestratorBus';
import type { RankedSignal } from '../../../services/orchestration/signalOrchestrator';

interface SignalGroup {
  category: string;
  icon:     string;
  signals:  RankedSignal[];
}

function categorise(signals: RankedSignal[]): SignalGroup[] {
  const groups: Record<string, RankedSignal[]> = {};

  for (const rs of signals) {
    const src = rs.signal?.sourceKind ?? 'unknown';
    let cat = 'Market';
    if (/company|layoff|hiring|employer/i.test(src))  cat = 'Company';
    else if (/sector|industry|ai|automation/i.test(src)) cat = 'AI / Industry';
    else if (/macro|economic|rate|gdp/i.test(src))    cat = 'Macro';
    else if (/career|skill|network|job/i.test(src))   cat = 'Career';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(rs);
  }

  const ICONS: Record<string, string> = {
    Company:      '🏢',
    'AI / Industry': '🤖',
    Macro:        '🌐',
    Career:       '🎯',
    Market:       '📊',
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

// ── Component ──────────────────────────────────────────────────────────────────

export function LiveMonitoringFeed() {
  const feed = useOrchestratorBus();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (feed) setLastUpdated(new Date());
  }, [feed]);

  if (!feed) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px 24px',
        background: 'rgba(255,255,255,0.02)', borderRadius: 12,
        border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>
          Connecting to live feed…
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          The signal orchestrator is initialising. This usually takes a few seconds.
        </div>
      </div>
    );
  }

  const signals = feed.primary ?? [];
  const groups  = categorise(signals);
  const effect  = estimatedEffect(signals);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginBottom: 3 }}>
            LIVE MONITORING
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            Real-time signals affecting your career risk
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 6px #10b981',
          }} />
          <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>LIVE</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Net effect chip */}
      <div style={{
        padding: '10px 16px', borderRadius: 10,
        background: effect.dir === 'up' ? 'rgba(239,68,68,0.06)' : effect.dir === 'down' ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${effect.dir === 'up' ? 'rgba(239,68,68,0.18)' : effect.dir === 'down' ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.06)'}`,
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
      }}>
        <span style={{ fontSize: 20 }}>
          {effect.dir === 'up' ? '📈' : effect.dir === 'down' ? '📉' : '➡️'}
        </span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
            {effect.dir === 'flat'
              ? 'No significant net risk change'
              : `Estimated ${effect.pts} pt ${effect.dir === 'up' ? 'risk increase' : 'risk reduction'} from current signals`}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            {feed.trace?.conclusion ?? `${signals.length} active signals`}
          </div>
        </div>
      </div>

      {/* Signal groups */}
      {groups.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 32, fontSize: 13, color: 'rgba(255,255,255,0.35)',
        }}>
          No signals detected in the current monitoring window.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups.map(group => {
          const isOpen     = openGroup === group.category;
          const topTier    = Math.min(...group.signals.map(s => s.signal?.tier ?? 4));
          const tierInfo   = tierLabel(topTier);

          return (
            <div key={group.category}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.category)}
                style={{
                  width: '100%', background: isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{group.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', flex: 1 }}>
                  {group.category}
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                  color: tierInfo.color,
                  background: `${tierInfo.color}15`,
                  border: `1px solid ${tierInfo.color}30`,
                  letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  {tierInfo.text}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {group.signals.length} signal{group.signals.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  {isOpen ? '▲' : '▾'}
                </span>
              </button>

              {isOpen && (
                <div style={{
                  borderRadius: '0 0 10px 10px',
                  border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none',
                  background: 'rgba(255,255,255,0.01)',
                  padding: '8px 0',
                }}>
                  {group.signals.map((rs, i) => {
                    const t = tierLabel(rs.signal?.tier ?? 4);
                    return (
                      <div key={i} style={{
                        padding: '8px 16px',
                        borderBottom: i < group.signals.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <span style={{
                          padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 800,
                          color: t.color, background: `${t.color}15`, border: `1px solid ${t.color}25`,
                          flexShrink: 0, marginTop: 1, letterSpacing: '0.05em',
                        }}>
                          T{rs.signal?.tier ?? '?'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                            {rs.signal?.headline ?? 'Signal'}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
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

      {/* Footer */}
      <div style={{ marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.5 }}>
        LIVE DATA · Signals are processed and ranked by the orchestration pipeline. Tier 1 = most impactful.
      </div>
    </div>
  );
}
