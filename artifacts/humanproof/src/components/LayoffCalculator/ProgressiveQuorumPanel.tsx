// ProgressiveQuorumPanel.tsx
// Progressive quorum disclosure — eliminates the 45-second blank wait.
//
// Renders partial audit results as each quorum class resolves during calculation:
//   Financial quorum (L1): fires ~10s after submit (after company data loads)
//   Layoff quorum   (L2): fires simultaneously with financial
//   Hiring quorum   (L3): fires when swarm completes (~20-30s)
//
// For private companies (no public financial disclosure), both L1 and L2 show
// as 'unavailable' immediately with a context banner explaining what is and is
// not scoreable. This converts the "45-second blank + full result" UX into a
// "10-second partial + continuous update + full result" UX.
//
// Status hierarchy per quorum class:
//   pending     → skeleton bars, "Analyzing..." copy
//   resolved    → actual data signals (even absence-of-data is a resolved signal)
//   unavailable → structural gap (private company, no public disclosure required)

import React, { useEffect, useState } from 'react';

export type QuorumStatus = 'pending' | 'resolved' | 'unavailable';

export interface QuorumCompanyData {
  name: string;
  isPublic: boolean;
  region?: string | null;
  industry?: string | null;
  revenueGrowthYoY?: number | null;
  stock90DayChange?: number | null;
  layoffRounds?: number;
  layoffsLast24Months?: Array<{ date: string; percentCut: number }>;
  employeeCount?: number;
  revenuePerEmployee?: number;
  aiInvestmentSignal?: string | null;
  source?: string;
  // Hiring signals patched by connector
  _hiringPostingTrend?: string;
  _estimatedRoleOpenings?: number | null;
  _hiringIsLive?: boolean;
}

export interface QuorumState {
  financial: QuorumStatus;
  layoff:    QuorumStatus;
  hiring:    QuorumStatus;
  companyData?: QuorumCompanyData;
  /** Human-readable banner for private/limited data context — shown at panel top. */
  limitedDataBanner: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthsAgo(dateStr: string): number {
  return Math.max(0, Math.round(
    (Date.now() - new Date(dateStr).getTime()) / (30 * 24 * 60 * 60 * 1000)
  ));
}

function pctLabel(v: number | null | undefined, suffix = '%'): string {
  if (v == null) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}${suffix}`;
}

function revenueColor(v: number | null | undefined): string {
  if (v == null) return '#94a3b8';
  if (v >= 10) return '#10b981';
  if (v >= 0)  return '#22c55e';
  if (v >= -5) return '#f59e0b';
  return '#ef4444';
}

function stockColor(v: number | null | undefined): string {
  if (v == null) return '#94a3b8';
  if (v >= 5)   return '#10b981';
  if (v >= 0)   return '#22c55e';
  if (v >= -10) return '#f59e0b';
  return '#ef4444';
}

function layoffSeverityColor(rounds: number): string {
  if (rounds === 0)  return '#10b981';
  if (rounds === 1)  return '#f59e0b';
  if (rounds <= 3)   return '#f97316';
  return '#ef4444';
}

function hiringTrendColor(trend: string | undefined): string {
  switch (trend) {
    case 'growing':   return '#10b981';
    case 'stable':    return '#22c55e';
    case 'declining': return '#f97316';
    case 'frozen':    return '#ef4444';
    default:          return '#94a3b8';
  }
}

function hiringTrendLabel(trend: string | undefined): string {
  switch (trend) {
    case 'growing':   return 'Growing ↑';
    case 'stable':    return 'Stable →';
    case 'declining': return 'Declining ↓';
    case 'frozen':    return 'Frozen ⛔';
    default:          return 'Analyzing…';
  }
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow: React.FC<{ width?: string }> = ({ width = '80%' }) => (
  <div style={{
    height: '12px', width, borderRadius: '4px',
    background: 'rgba(255,255,255,0.06)',
    animation: 'shimmer 1.8s ease-in-out infinite',
    marginBottom: '8px',
  }} />
);

// ── Quorum card ───────────────────────────────────────────────────────────────

interface CardProps {
  title: string;
  icon: string;
  status: QuorumStatus;
  accentColor: string;
  children: React.ReactNode;
  visible: boolean; // fade-in trigger
}

const QuorumCard: React.FC<CardProps> = ({ title, icon, status, accentColor, children, visible }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), 80);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const borderColor = status === 'unavailable'
    ? 'rgba(148,163,184,0.20)'
    : status === 'resolved'
      ? `${accentColor}30`
      : 'rgba(255,255,255,0.06)';

  return (
    <div style={{
      flex: '1 1 0',
      minWidth: '200px',
      background: 'rgba(10,15,25,0.70)',
      border: `1px solid ${borderColor}`,
      borderRadius: '10px',
      padding: '14px 16px',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(8px)',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: accentColor, textTransform: 'uppercase' }}>
          {title}
        </span>
        {/* Status chip */}
        <span style={{
          marginLeft: 'auto',
          fontSize: '8px', fontWeight: 800, letterSpacing: '0.10em',
          padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
          background: status === 'unavailable' ? 'rgba(148,163,184,0.12)'
            : status === 'resolved' ? `${accentColor}18`
            : 'rgba(255,255,255,0.06)',
          color: status === 'unavailable' ? '#94a3b8'
            : status === 'resolved' ? accentColor
            : 'rgba(255,255,255,0.25)',
          border: `1px solid ${status === 'resolved' ? `${accentColor}30` : 'rgba(255,255,255,0.06)'}`,
        }}>
          {status === 'pending' ? '...' : status === 'resolved' ? 'Found' : 'N/A'}
        </span>
      </div>
      {children}
    </div>
  );
};

// ── Signal row ────────────────────────────────────────────────────────────────

const SignalRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#e2e8f0' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
    <span style={{ fontSize: '10px', color: 'var(--alpha-text-45)', letterSpacing: '0.04em' }}>{label}</span>
    <span style={{ fontSize: '11px', fontWeight: 600, color, fontFamily: 'monospace' }}>{value}</span>
  </div>
);

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  quorum: QuorumState;
}

export const ProgressiveQuorumPanel: React.FC<Props> = ({ quorum }) => {
  const { financial, layoff, hiring, companyData: cd, limitedDataBanner } = quorum;
  const panelVisible = financial !== 'pending' || layoff !== 'pending';

  const [panelShow, setPanelShow] = useState(false);
  useEffect(() => {
    if (panelVisible) {
      const t = setTimeout(() => setPanelShow(true), 120);
      return () => clearTimeout(t);
    }
  }, [panelVisible]);

  if (!panelVisible) return null;

  const layoffRounds = cd?.layoffRounds ?? 0;
  const lastLayoff   = cd?.layoffsLast24Months?.[0];
  const hiringTrend  = cd?._hiringPostingTrend;
  const hiringCount  = cd?._estimatedRoleOpenings;

  return (
    <div style={{
      maxWidth: '760px',
      margin: '0 auto 24px auto',
      padding: '0 16px',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      opacity: panelShow ? 1 : 0,
      transform: panelShow ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      {/* Section label */}
      <div style={{
        fontSize: '8px', fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(0,245,255,0.50)',
        textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '2px',
      }}>
        ◈ Partial intelligence — updating live
      </div>

      {/* Limited data / private company banner */}
      {limitedDataBanner && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.30)',
          borderRadius: '8px', padding: '10px 14px',
          marginBottom: '12px', fontSize: '10px', lineHeight: '1.6', color: '#fcd34d',
        }} role="status" aria-live="polite">
          <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>ℹ</span>
          <span style={{ color: '#fde68a', opacity: 0.90 }}>{limitedDataBanner}</span>
        </div>
      )}

      {/* Three quorum cards */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

        {/* ── Financial (L1) ────────────────────────────────────────────────── */}
        <QuorumCard
          title="Financial Health"
          icon="💹"
          status={financial}
          accentColor="#10b981"
          visible={financial !== 'pending'}
        >
          {financial === 'pending' && (
            <>
              <SkeletonRow width="90%" />
              <SkeletonRow width="70%" />
              <SkeletonRow width="60%" />
            </>
          )}
          {financial === 'unavailable' && (
            <div style={{ fontSize: '10px', color: 'var(--alpha-text-35)', lineHeight: '1.6' }}>
              No public financial disclosures available.
              {cd && !cd.isPublic && (
                <span style={{ display: 'block', marginTop: '4px', color: '#94a3b8' }}>
                  Private company — L1 scored at neutral baseline.
                </span>
              )}
            </div>
          )}
          {financial === 'resolved' && (
            <>
              <SignalRow
                label="Revenue growth YoY"
                value={pctLabel(cd?.revenueGrowthYoY)}
                color={revenueColor(cd?.revenueGrowthYoY)}
              />
              <SignalRow
                label="Stock 90d change"
                value={pctLabel(cd?.stock90DayChange)}
                color={stockColor(cd?.stock90DayChange)}
              />
              {cd?.revenuePerEmployee && (
                <SignalRow
                  label="Revenue / employee"
                  value={`$${(cd.revenuePerEmployee / 1000).toFixed(0)}k`}
                  color={cd.revenuePerEmployee >= 200000 ? '#10b981' : cd.revenuePerEmployee >= 100000 ? '#f59e0b' : '#ef4444'}
                />
              )}
              {cd?.revenueGrowthYoY == null && cd?.stock90DayChange == null && (
                <div style={{ fontSize: '10px', color: 'var(--alpha-text-30)', marginTop: '4px' }}>
                  Financial data not found — L1 uses sector baseline.
                </div>
              )}
            </>
          )}
        </QuorumCard>

        {/* ── Layoff History (L2) ────────────────────────────────────────────── */}
        <QuorumCard
          title="Layoff History"
          icon="📋"
          status={layoff}
          accentColor={layoffRounds >= 2 ? '#ef4444' : layoffRounds === 1 ? '#f97316' : '#10b981'}
          visible={layoff !== 'pending'}
        >
          {layoff === 'pending' && (
            <>
              <SkeletonRow width="85%" />
              <SkeletonRow width="65%" />
            </>
          )}
          {layoff === 'unavailable' && (
            <div style={{ fontSize: '10px', color: 'var(--alpha-text-35)', lineHeight: '1.6' }}>
              No layoff history data available for this company.
              <span style={{ display: 'block', marginTop: '4px', color: '#94a3b8' }}>
                L2 scored at neutral baseline.
              </span>
            </div>
          )}
          {layoff === 'resolved' && (
            <>
              <SignalRow
                label="Layoff rounds (24mo)"
                value={layoffRounds === 0 ? 'None detected' : `${layoffRounds} round${layoffRounds > 1 ? 's' : ''}`}
                color={layoffSeverityColor(layoffRounds)}
              />
              {lastLayoff && (
                <>
                  <SignalRow
                    label="Most recent"
                    value={`${monthsAgo(lastLayoff.date)} months ago`}
                    color={monthsAgo(lastLayoff.date) <= 6 ? '#ef4444' : monthsAgo(lastLayoff.date) <= 18 ? '#f97316' : '#94a3b8'}
                  />
                  {lastLayoff.percentCut > 0 && (
                    <SignalRow
                      label="Headcount cut"
                      value={`${lastLayoff.percentCut.toFixed(0)}%`}
                      color={lastLayoff.percentCut >= 10 ? '#ef4444' : '#f97316'}
                    />
                  )}
                </>
              )}
              {layoffRounds === 0 && !lastLayoff && (
                <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                  No layoffs found — positive L2 signal.
                </div>
              )}
            </>
          )}
        </QuorumCard>

        {/* ── Hiring Signal (L3) ────────────────────────────────────────────── */}
        <QuorumCard
          title="Hiring Signal"
          icon="📡"
          status={hiring}
          accentColor="#7c3aed"
          visible={true} // always visible — shows pending state
        >
          {hiring === 'pending' && (
            <div style={{ fontSize: '10px', color: 'var(--alpha-text-35)', lineHeight: '1.7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{
                  display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                  background: '#7c3aed', animation: 'pulse-q 1.4s ease-in-out infinite',
                }} />
                <span>Scanning job boards…</span>
              </div>
              <SkeletonRow width="75%" />
              <SkeletonRow width="55%" />
            </div>
          )}
          {hiring === 'resolved' && (
            <>
              <SignalRow
                label="Posting trend"
                value={hiringTrendLabel(hiringTrend)}
                color={hiringTrendColor(hiringTrend)}
              />
              {hiringCount != null && hiringCount > 0 && (
                <SignalRow
                  label="Est. open roles"
                  value={hiringCount >= 1000 ? `${(hiringCount / 1000).toFixed(1)}k` : String(hiringCount)}
                  color="#94a3b8"
                />
              )}
              {!hiringTrend && (
                <div style={{ fontSize: '10px', color: 'var(--alpha-text-30)', marginTop: '4px' }}>
                  No public hiring data — L3 uses sector baseline.
                </div>
              )}
            </>
          )}
        </QuorumCard>
      </div>

      {/* Partial score hint — shown when financial+layoff both resolved, hiring still pending */}
      {financial !== 'pending' && layoff !== 'pending' && hiring === 'pending' && (
        <div style={{
          marginTop: '10px', padding: '8px 14px',
          background: 'rgba(0,245,255,0.04)',
          border: '1px solid rgba(0,245,255,0.10)',
          borderRadius: '8px', fontSize: '10px',
          color: 'var(--alpha-text-35)', lineHeight: '1.5',
        }}>
          <span style={{ color: 'rgba(0,245,255,0.50)', fontWeight: 700 }}>◈ </span>
          Company and role signals resolved. Incorporating job market data and 30-agent swarm…
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes pulse-q {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
};

// ── Builder: derive limited-data banner from company data ─────────────────────

const DE_REGIONS = new Set(['DE', 'AT', 'CH', 'DACH']);

export function buildLimitedDataBanner(cd: QuorumCompanyData): string | null {
  if (cd.isPublic) return null;

  const region = (cd.region ?? '').toUpperCase();

  if (DE_REGIONS.has(region)) {
    return (
      `Private company — no public financial disclosure required in Germany. ` +
      `This score reflects: role AI displacement (D1-D3), personal protection (D4), ` +
      `sector headwinds (L4). Company financial health (L1) and layoff history (L2) ` +
      `are unavailable without mandatory disclosure.`
    );
  }

  // Generic private company banner
  const countryNote =
    region === 'IN' ? 'This includes most Indian Pvt Ltd companies not listed on BSE/NSE.' :
    region === 'SG' ? 'Private Limited companies in Singapore do not file public accounts.' :
    region === 'US' ? 'Private US companies have no SEC disclosure obligations.' :
    region === 'GB' ? 'UK private limited companies file abridged accounts only.' :
    '';

  return (
    `Private company — no public financial disclosures available. ` +
    `Score reflects role AI displacement (D1-D3), personal protection (D4), and sector headwinds (L4). ` +
    `${countryNote ? countryNote + ' ' : ''}` +
    `Company financial health (L1) and layoff history (L2) scored at neutral baseline.`
  );
}
