// EarlyWarningFeed — 5-category detection network (Rule 3, 11)
// Shows detected evidence with Source · Date · Confidence tier per signal.
// Detection language only — NO prediction/probability framing.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Building2, Globe2, Zap, TrendingDown, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';
import { useLayoff } from '../../context/LayoffContext';
import { useBreakingNewsPoller } from '../../hooks/useBreakingNewsPoller';
import type { HybridResult } from '../../types/hybridResult';
import { DataSourceLabel, type DataSourceTier } from '../shared/DataSourceLabel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetectedSignal {
  id: string;
  description: string;
  detectedDate: string | null;    // ISO — when we detected this
  sourceName: string;
  sourceTier: DataSourceTier;
  severity: 'critical' | 'high' | 'info';
}

interface SignalCategory {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  signals: DetectedSignal[];
  lastChecked: string | null;     // ISO date of last data refresh
}

// ─── Signal extraction from HybridResult ─────────────────────────────────────

function buildCategories(hr: HybridResult, liveNewsCount: number, liveNewsDate: string | null): SignalCategory[] {
  const now = new Date().toISOString();

  // ── COMPANY HEALTH ──────────────────────────────────────────────────────────
  const companySignals: DetectedSignal[] = [];

  const stealth = (hr as any)._stealthSignal;
  if (stealth?.severity && stealth.severity !== 'STABLE') {
    companySignals.push({
      id: 'stealth',
      description: stealth.severity === 'SILENT_PURGE'
        ? `Silent headcount cut detected${stealth.percentCut ? ` (est. −${Math.round(stealth.percentCut)}%)` : ''} — no public announcement`
        : `Stealth headcount reduction signal: ${stealth.severity.replace(/_/g, ' ').toLowerCase()}`,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'Company headcount data',
      sourceTier: 'MODELED',
      severity: stealth.severity === 'SILENT_PURGE' ? 'critical' : 'high',
    });
  }

  if (hr.collapseStage && hr.collapseStage >= 2) {
    companySignals.push({
      id: 'collapse',
      description: `${hr.collapseStage} of 6 collapse indicators active${(hr as any).collapseStageReason ? ` — ${(hr as any).collapseStageReason}` : ''}`,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'Multi-signal pattern match',
      sourceTier: 'MODELED',
      severity: hr.collapseStage >= 3 ? 'critical' : 'high',
    });
  }

  const execMov = hr.executiveMovement;
  if (execMov?.isLeadershipExodus) {
    companySignals.push({
      id: 'exec',
      description: `Leadership exodus detected: ${execMov.departures.length} C-suite departure${execMov.departures.length > 1 ? 's' : ''} in 90 days`,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'LinkedIn / news cross-reference',
      sourceTier: 'MODELED',
      severity: 'critical',
    });
  } else if ((execMov?.departures?.length ?? 0) > 0 && (execMov?.riskSignalStrength ?? 0) > 40) {
    const dep = execMov!.mostAlarmingDeparture;
    companySignals.push({
      id: 'exec-single',
      description: dep
        ? `${dep.role} executive departed (${dep.daysAgo}d ago) — ${execMov!.interpretation}`
        : execMov!.interpretation,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'LinkedIn / news',
      sourceTier: 'MODELED',
      severity: 'high',
    });
  }

  const hv = (hr as any).headcountVelocity;
  if (hv?.trend === 'declining' && (hv?.recentChangePercent ?? 0) < -5) {
    companySignals.push({
      id: 'headcount-velocity',
      description: `Headcount declining ${Math.abs(Math.round(hv.recentChangePercent ?? 0))}% (${hv.periodLabel ?? 'recent months'})`,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'LinkedIn headcount data',
      sourceTier: 'MEASURED',
      severity: 'high',
    });
  }

  // ── PEER SECTOR ─────────────────────────────────────────────────────────────
  const peerSignals: DetectedSignal[] = [];

  const peer = hr.peerContagion;
  if (peer && (peer.directCompetitorCuts > 0 || peer.adjacentPeerCuts > 0)) {
    const total = peer.directCompetitorCuts + peer.adjacentPeerCuts;
    peerSignals.push({
      id: 'peer-layoffs',
      description: `${total} layoff event${total > 1 ? 's' : ''} in your industry${peer.waveStartDate ? ` (wave began ${formatDateShort(peer.waveStartDate)})` : ''}`,
      detectedDate: peer.waveStartDate ?? now,
      sourceName: 'Layoff database cross-reference',
      sourceTier: 'MEASURED',
      severity: peer.waveIntensity === 'PEAK' || peer.waveIntensity === 'ACTIVE' || peer.directCompetitorCuts >= 3 ? 'critical' : 'high',
    });
    if (peer.estimatedPropagationDays != null) {
      peerSignals.push({
        id: 'peer-propagation',
        description: `Pattern match: similar companies cut within ${peer.estimatedPropagationDays} days of wave start`,
        detectedDate: now,
        sourceName: 'Wave propagation analysis',
        sourceTier: 'MODELED',
        severity: 'high',
      });
    }
  }

  if (liveNewsCount > 0) {
    peerSignals.push({
      id: 'news',
      description: `${liveNewsCount} relevant news event${liveNewsCount > 1 ? 's' : ''} detected for your company/sector`,
      detectedDate: liveNewsDate ?? now,
      sourceName: 'News RSS aggregation',
      sourceTier: 'ESTIMATED',
      severity: 'info',
    });
  }

  // ── MARKET SHIFTS ───────────────────────────────────────────────────────────
  const marketSignals: DetectedSignal[] = [];

  const hiring = hr.hiringSignal;
  if (hiring) {
    if (hiring.userDeptIsFrozen) {
      marketSignals.push({
        id: 'dept-freeze',
        description: `Hiring freeze detected in your department${hiring.frozenDepartments.length > 1 ? ` (${hiring.frozenDepartments.join(', ')})` : ''}`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: `Hiring connectors (${hiring.hiringMarket ?? 'market'})`,
        sourceTier: hiring.signalConfidence >= 70 ? 'MEASURED' : 'MODELED',
        severity: 'critical',
      });
    } else if (hiring.overallTrend === 'declining' || hiring.riskLevel === 'HIGH') {
      marketSignals.push({
        id: 'hiring-decline',
        description: `Hiring declining company-wide — ${hiring.interpretation}`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: `Hiring data (${hiring.hiringMarket ?? 'market'})`,
        sourceTier: hiring.signalConfidence >= 70 ? 'MEASURED' : 'MODELED',
        severity: 'high',
      });
    }
  }

  const liquidity = (hr as any).jobMarketLiquidity;
  if (liquidity?.roleLiquidityScore != null && liquidity.roleLiquidityScore < 35) {
    marketSignals.push({
      id: 'liquidity',
      description: `Job market liquidity low for your role (score ${Math.round(liquidity.roleLiquidityScore)}/100) — fewer open positions than usual`,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'Job board aggregation',
      sourceTier: 'MODELED',
      severity: 'high',
    });
  }

  const macro = (hr as any).macroEconomicRisk;
  if (macro?.sectorRecessProbability != null && macro.sectorRecessProbability > 0.4) {
    marketSignals.push({
      id: 'macro',
      description: `Macro headwind detected in your sector — ${macro.narrative ?? 'elevated sector recession signals'}`,
      detectedDate: hr.calculatedAt ?? now,
      sourceName: 'BLS / FRED macro data',
      sourceTier: 'MEASURED',
      severity: macro.sectorRecessProbability > 0.6 ? 'critical' : 'high',
    });
  }

  // ── SKILL DEMAND ────────────────────────────────────────────────────────────
  const skillSignals: DetectedSignal[] = [];

  const skills = hr.skillPortfolioFit;
  if (skills) {
    (skills.surgingSkills ?? []).slice(0, 3).forEach((s, i) => {
      skillSignals.push({
        id: `skill-up-${i}`,
        description: `"${s.skill}" demand rising — now required in more matching JDs (demand score: ${Math.round(s.demandScore)})`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: 'Job posting analysis',
        sourceTier: 'MODELED',
        severity: 'info',
      });
    });
    (skills.decliningSkills ?? []).slice(0, 2).forEach((s, i) => {
      skillSignals.push({
        id: `skill-down-${i}`,
        description: `"${s.skill}" demand declining — frequency dropping in your target roles`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: 'Job posting analysis',
        sourceTier: 'MODELED',
        severity: 'info',
      });
    });
    const atRiskSkills = [
      ...(skills.surgingSkills ?? []),
      ...(skills.stableSkills ?? []),
      ...(skills.decliningSkills ?? []),
    ].filter(s => s.automatabilityRisk > 0.55);
    if (atRiskSkills.length > 0) {
      skillSignals.push({
        id: 'at-risk-skills',
        description: `${atRiskSkills.length} skill${atRiskSkills.length > 1 ? 's' : ''} in your profile at high automation risk: ${atRiskSkills.slice(0, 3).map(s => s.skill).join(', ')}`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: 'AI displacement model',
        sourceTier: 'MODELED',
        severity: atRiskSkills.length >= 3 ? 'high' : 'info',
      });
    }
  }

  // ── COMPENSATION GAP ────────────────────────────────────────────────────────
  const compSignals: DetectedSignal[] = [];

  const comp = hr.compensationRisk;
  if (comp) {
    if (comp.payPosition === 'BELOW_MARKET' || comp.payPosition === 'HIGHLY_BELOW_MARKET') {
      compSignals.push({
        id: 'comp-gap',
        description: `Pay gap detected: ${comp.marketDeltaPct != null ? `${Math.abs(Math.round(comp.marketDeltaPct))}% below market median` : 'below market'} for your role and location`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: comp.payPosition === 'HIGHLY_BELOW_MARKET' ? 'Glassdoor / BLS salary data' : 'Salary benchmarks',
        sourceTier: comp.payPosition === 'HIGHLY_BELOW_MARKET' ? 'MEASURED' : 'MODELED',
        severity: comp.payPosition === 'HIGHLY_BELOW_MARKET' ? 'high' : 'info',
      });
    }
    if (comp.cascadeStage === 'PAY_FREEZE' || comp.cascadeStage === 'PAY_CUT' || comp.cascadeStage === 'PRE_LAYOFF') {
      compSignals.push({
        id: 'comp-cascade',
        description: `Compensation cascade stage: "${comp.cascadeStageLabel}" — ${comp.cascadeStage === 'PRE_LAYOFF' ? 'companies at this stage have historically cut within 6 months' : 'watch for further signals'}`,
        detectedDate: hr.calculatedAt ?? now,
        sourceName: 'Compensation pattern analysis',
        sourceTier: 'MODELED',
        severity: comp.cascadeStage === 'PRE_LAYOFF' ? 'critical' : 'high',
      });
    }
  }

  return [
    { key: 'company',      label: 'Company Health',     Icon: Building2,    signals: companySignals, lastChecked: hr.calculatedAt ?? now },
    { key: 'peer',         label: 'Peer Sector',         Icon: Globe2,       signals: peerSignals,    lastChecked: liveNewsDate ?? hr.calculatedAt ?? now },
    { key: 'market',       label: 'Market Shifts',       Icon: TrendingDown, signals: marketSignals,  lastChecked: hr.calculatedAt ?? now },
    { key: 'skills',       label: 'Skill Demand',        Icon: Zap,          signals: skillSignals,   lastChecked: hr.calculatedAt ?? now },
    { key: 'compensation', label: 'Compensation Gap',    Icon: DollarSign,   signals: compSignals,    lastChecked: hr.calculatedAt ?? now },
  ];
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function severityColor(s: DetectedSignal['severity']): string {
  if (s === 'critical') return '#ef4444';
  if (s === 'high') return '#f59e0b';
  return 'rgba(0,245,255,0.7)';
}

// ─── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({ cat, defaultOpen }: { cat: SignalCategory; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const count = cat.signals.length;
  const worst = cat.signals.find(s => s.severity === 'critical') ? 'critical'
    : cat.signals.find(s => s.severity === 'high') ? 'high'
    : count > 0 ? 'info' : null;
  const headerColor = worst === 'critical' ? '#ef4444' : worst === 'high' ? '#f59e0b' : worst === 'info' ? 'rgba(0,245,255,0.7)' : '#10b981';

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${count > 0 ? (worst === 'critical' ? 'rgba(239,68,68,0.2)' : worst === 'high' ? 'rgba(245,158,11,0.18)' : 'rgba(0,245,255,0.12)') : 'rgba(255,255,255,0.07)'}`,
      background: count > 0
        ? (worst === 'critical' ? 'rgba(239,68,68,0.04)' : worst === 'high' ? 'rgba(245,158,11,0.03)' : 'rgba(0,245,255,0.02)')
        : 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        type="button"
        disabled={count === 0}
        aria-label={`${cat.label}${count > 0 ? `, ${count} signal${count > 1 ? 's' : ''}, ${open ? 'collapse' : 'expand'}` : ', all clear'}`}
        onClick={() => count > 0 && setOpen(o => !o)}
        onFocus={e => count > 0 && ((e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px rgba(255,255,255,0.15)')}
        onBlur={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: count > 0 ? 'pointer' : 'default',
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          textAlign: 'left', outline: 'none',
        }}
      >
        <cat.Icon size={14} style={{ color: headerColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>
          {cat.label}
        </span>

        {count > 0 ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 5,
            background: worst === 'critical' ? 'rgba(239,68,68,0.12)' : worst === 'high' ? 'rgba(245,158,11,0.12)' : 'rgba(0,245,255,0.08)',
            fontSize: '0.68rem', fontWeight: 800, color: headerColor,
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            {count} signal{count > 1 ? 's' : ''}
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#10b981' }}>
            <CheckCircle2 size={12} />
            All clear
          </span>
        )}

        {count > 0 && (
          open
            ? <ChevronDown size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            : <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        )}
      </button>

      {/* Signals list */}
      <AnimatePresence>
        {open && count > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cat.signals.map(sig => (
                <div key={sig.id} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.25)',
                  border: `1px solid ${severityColor(sig.severity)}22`,
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div
                      aria-label={`Severity: ${sig.severity}`}
                      role="img"
                      style={{
                        width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        background: severityColor(sig.severity),
                        boxShadow: `0 0 5px ${severityColor(sig.severity)}60`,
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
                      {sig.description}
                    </span>
                  </div>
                  <div style={{ paddingLeft: 14 }}>
                    <DataSourceLabel
                      tier={sig.sourceTier}
                      sourceName={sig.sourceName}
                      date={sig.detectedDate}
                      compact
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EarlyWarningFeed() {
  const { state } = useLayoff();
  const hr = state.scoreResult as HybridResult | null;
  const { currentMatches, isPolling, forcePoll } = useBreakingNewsPoller(state.companyName ?? undefined);
  void forcePoll; // available for refresh button

  if (!hr) {
    return (
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        background: 'rgba(0,245,255,0.03)', borderRadius: 14,
        border: '1px solid rgba(0,245,255,0.1)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>
          No audit data yet
        </div>
        <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.45)' }}>
          Run a career audit to activate the Early Warning Network — we monitor 5 signal categories automatically.
        </div>
      </div>
    );
  }

  const liveNewsDate: string | null = null;
  const categories = buildCategories(hr, currentMatches.length, liveNewsDate);
  const totalSignals = categories.reduce((sum, c) => sum + c.signals.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
            Early Warning Network
          </h2>
          {totalSignals > 0 ? (
            <span style={{
              padding: '2px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontFamily: 'var(--font-mono, monospace)',
            }}>
              {totalSignals} detected
            </span>
          ) : (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
              color: '#10b981',
            }}>
              <CheckCircle2 size={11} />
              All clear
            </span>
          )}
          {isPolling && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.65rem', color: 'var(--cyan)',
              fontFamily: 'var(--font-mono, monospace)', fontWeight: 600,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', background: 'var(--cyan)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              LIVE
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono, monospace)' }}>
          5 categories monitored · refreshed every 60s
        </div>
      </div>

      {/* Signal count summary */}
      {totalSignals > 0 && (
        <div style={{
          marginBottom: 14, padding: '8px 14px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{totalSignals} signals detected</span>
          {' '}across {categories.filter(c => c.signals.length > 0).length} categories.
          {' '}These are detected evidence, not predictions — each signal has a source and date.
        </div>
      )}

      {/* Category rows — critical/high categories open by default */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.map(cat => {
          const hasCritical = cat.signals.some(s => s.severity === 'critical');
          const hasHigh = cat.signals.some(s => s.severity === 'high');
          return (
            <CategoryRow
              key={cat.key}
              cat={cat}
              defaultOpen={hasCritical || hasHigh}
            />
          );
        })}
      </div>
    </div>
  );
}
