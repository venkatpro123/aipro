import React, { Suspense, lazy, useState, useEffect, useCallback, useRef } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BarChart3, Building2, Brain, ListChecks, Shield, Compass,
} from "lucide-react";
import { HybridResult } from "../../types/hybridResult";
import { CompanyData } from "../../data/companyDatabase";
import { GlobalErrorBoundary } from "../GlobalErrorBoundary";
import { getDegradationState, type DegradationState } from "../../services/apiDegradationMonitor";
import { useCompanySignalSubscription } from "../../hooks/useCompanySignalSubscription";
import { useBreakingNewsPoller } from "../../hooks/useBreakingNewsPoller";
import WARNAlertBanner from "../WARNAlertBanner";
import FreshnessBadge from "../FreshnessBadge";
import { GdprConsentModal } from "../GdprConsentModal";
import {
  isEuUser,
  hasGdprConsent,
  enforceEuCommunityShareDefault,
  getEffectiveCommunityShare,
} from "../../services/gdprService";
import { supabase } from "../../utils/supabase";
import { useAuth } from "../../context/AuthContext";

// Lazy-loaded tab modules for performance
const OverviewTab = lazy(() => import("../AuditTabs/OverviewTab"));
const RiskBreakdownTab = lazy(() => import("../AuditTabs/RiskBreakdownTab"));
const CompanyProfileTab = lazy(() => import("../AuditTabs/CompanyProfileTab"));
const CareerSkillsTab = lazy(() => import("../AuditTabs/CareerSkillsTab"));
const ActionPlanTab = lazy(() => import("../AuditTabs/ActionPlanTab"));
const TransparencyTab = lazy(() => import("../AuditTabs/TransparencyTab"));
const StrategyTab = lazy(() => import("../AuditTabs/StrategyTab"));

interface Props {
  result: HybridResult;
  companyData: CompanyData;
  onRetake: () => void;
  onDownload?: () => void;
  /** Optional: trigger a score recalculation without a full page reload */
  onRecalculate?: () => void;
}

const TabLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-[var(--space-16)]">
    <div className="relative mb-6">
      <div className="w-10 h-10 rounded-full border-2 border-[var(--cyan)]/10 border-t-[var(--cyan)] animate-spin" />
      <div className="absolute inset-0 rounded-full" style={{ boxShadow: '0 0 20px rgba(0,212,224,0.2)' }} />
    </div>
    <p className="label-xs tracking-[0.3em]" style={{ color: 'rgba(0,212,224,0.6)' }}>LOADING INTELLIGENCE...</p>
  </div>
);

// Per-tab icon and badge configuration
const TAB_CONFIG = [
  { value: 'overview',        label: 'Overview',      Icon: LayoutDashboard, shortLabel: 'Overview' },
  { value: 'risk_breakdown',  label: 'Risk',          Icon: BarChart3,       shortLabel: 'Risk' },
  { value: 'company_profile', label: 'Company',       Icon: Building2,       shortLabel: 'Company' },
  { value: 'career_skills',   label: 'Career',        Icon: Brain,           shortLabel: 'Career' },
  { value: 'action_plan',     label: 'Action Plan',   Icon: ListChecks,      shortLabel: 'Actions' },
  { value: 'transparency',    label: 'Transparency',  Icon: Shield,          shortLabel: 'Data' },
  { value: 'strategy',        label: 'Strategy',      Icon: Compass,         shortLabel: 'Strategy' },
] as const;

type TabValue = typeof TAB_CONFIG[number]['value'];

function getTabBadge(value: TabValue, result: HybridResult): { count: number; color: string } | null {
  const score = result.total;
  const scoreColor = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 35 ? '#f59e0b' : '#10b981';
  switch (value) {
    case 'overview':
      return { count: score, color: scoreColor };
    case 'risk_breakdown':
      return { count: result.dimensions?.length ?? 5, color: 'var(--cyan)' };
    case 'company_profile':
      return result.signalQuality?.liveSignals > 0
        ? { count: result.signalQuality.liveSignals, color: 'var(--emerald)' }
        : null;
    case 'career_skills':
      return null;
    case 'action_plan': {
      const critical = result.recommendations?.filter(r => r.priority === 'Critical').length ?? 0;
      return critical > 0 ? { count: critical, color: '#ef4444' } : null;
    }
    case 'transparency': {
      const conflicts = result.signalQuality?.conflictingSignals?.length ?? 0;
      return conflicts > 0 ? { count: conflicts, color: '#f59e0b' } : null;
    }
    case 'strategy': {
      const urgency = (result as any).strategySynthesis?.urgencyLevel;
      if (urgency === 'CRITICAL') return { count: 1, color: '#ef4444' };
      if (urgency === 'HIGH') return { count: 1, color: '#f97316' };
      return null;
    }
    default:
      return null;
  }
}

const TabTrigger: React.FC<{
  value: TabValue;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge: { count: number; color: string } | null;
}> = ({ value, label, shortLabel, Icon, badge }) => (
  <Tabs.Trigger
    value={value}
    className="relative flex items-center gap-2 outline-none whitespace-nowrap group"
    style={{
      padding: '8px 14px',
      borderRadius: '10px',
      transition: 'all 200ms var(--ease-out)',
      color: 'rgba(255,255,255,0.42)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
    }}
  >
    {/* Active gradient background */}
    <div
      className="absolute inset-0 rounded-[10px] opacity-0 group-data-[state=active]:opacity-100 transition-opacity"
      style={{
        background: 'linear-gradient(135deg, rgba(0,212,224,0.14) 0%, rgba(0,212,224,0.06) 100%)',
        border: '1px solid rgba(0,212,224,0.25)',
        boxShadow: '0 0 20px rgba(0,212,224,0.12)',
      }}
    />

    {/* Icon */}
    <Icon
      className="w-3.5 h-3.5 flex-shrink-0 transition-all relative"
      style={{
        color: 'inherit',
        opacity: 0.7,
      } as React.CSSProperties}
    />

    {/* Label */}
    <span
      className="relative transition-colors"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        fontWeight: 800,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
      }}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </span>

    {/* Data badge */}
    {badge && (
      <span
        className="relative flex-shrink-0 tab-badge"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          fontWeight: 900,
          letterSpacing: '0.06em',
          padding: '1px 5px',
          borderRadius: '4px',
          background: `${badge.color}18`,
          color: badge.color,
          border: `1px solid ${badge.color}30`,
          lineHeight: 1.4,
          minWidth: '18px',
          textAlign: 'center',
        }}
      >
        {badge.count}
      </span>
    )}
  </Tabs.Trigger>
);

export const LayoffAuditDashboard: React.FC<Props> = ({
  result,
  companyData,
  onRetake,
  onDownload,
  onRecalculate,
}) => {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const prevTabRef = useRef<TabValue>('overview');

  const handleTabChange = (val: string) => {
    prevTabRef.current = activeTab;
    setActiveTab(val as TabValue);
  };

  // Directional slide direction based on tab index delta
  const tabIndex = TAB_CONFIG.findIndex(t => t.value === activeTab);
  const prevTabIndex = TAB_CONFIG.findIndex(t => t.value === prevTabRef.current);
  const slideDirection = tabIndex >= prevTabIndex ? 1 : -1;

  // ── GDPR consent gate — shown once for EU users before first interaction ────
  // enforceEuCommunityShareDefault() must run BEFORE reading hp_community_share
  // so EU users start with the correct opt-out default.
  const [showGdprModal, setShowGdprModal] = useState<boolean>(() => {
    try {
      enforceEuCommunityShareDefault();
      return isEuUser() && !hasGdprConsent();
    } catch { return false; }
  });

  const [communityShare, setCommunityShare] = useState<boolean>(() => {
    try { return getEffectiveCommunityShare(); } catch { return false; }
  });

  const handleCommunityToggle = () => {
    const next = !communityShare;
    setCommunityShare(next);
    try { localStorage.setItem('hp_community_share', next ? '1' : '0'); } catch { /* ignore */ }
  };

  // ── Retroactive community share ───────────────────────────────────────────
  // Calls update_community_share_consent RPC to backfill all historical audit
  // rows in one shot. Only available to authenticated users who have opted in.
  type RetroStatus = 'idle' | 'pending' | 'done' | 'error';
  const [retroStatus, setRetroStatus] = useState<RetroStatus>('idle');
  const [retroCount, setRetroCount] = useState(0);

  const handleRetroactiveShare = useCallback(async () => {
    if (!session || retroStatus === 'pending' || retroStatus === 'done') return;
    setRetroStatus('pending');
    try {
      const { data, error } = await supabase.rpc('update_community_share_consent', { p_enable: true });
      if (error) throw error;
      setRetroCount((data as { rows_updated: number })?.rows_updated ?? 0);
      setRetroStatus('done');
    } catch {
      setRetroStatus('error');
    }
  }, [session, retroStatus]);

  // Rate-limit transparency — reactive: re-reads every 30s.
  const [degradation, setDegradation] = useState<DegradationState>(() => getDegradationState());
  useEffect(() => {
    setDegradation(getDegradationState());
    const id = setInterval(() => setDegradation(getDegradationState()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Stable recalculate callback — passed to realtime subscription so toasts offer
  // a "Recalculate" button that re-runs the scoring engine without a full page reload.
  const stableRecalculate = useCallback(() => {
    onRecalculate?.();
  }, [onRecalculate]);

  // Subscribe to both company_intelligence UPDATEs and breaking_news_events INSERTs.
  // Pass companyData.name as dbCompanyName so the eq filter matches the exact DB row
  // (fixes the case-sensitivity bug when user typed a different case than the DB stores).
  useCompanySignalSubscription({
    companyName: result.companyName ?? companyData.name,
    dbCompanyName: companyData.name,
    onRefresh: stableRecalculate,
  });

  // Poll for breaking news on page load and whenever the active company changes.
  // v12.0: Auto-recalculate when breaking news matches the current company.
  // Guard: only recalculate when result is not from cache to prevent infinite loops.
  useBreakingNewsPoller(companyData.name, {
    onBreakingNewsMatched: (matches) => {
      if (matches.length > 0 && !result.fromCache) {
        stableRecalculate();
      }
    },
  });

  // Compute data staleness for the stale-data banner below
  const dataAgeDays = result.dataFreshness?.ageInDays ?? 0;
  const isFallbackSource = (companyData.source ?? '').toLowerCase().includes('fallback')
    || (companyData.source ?? '').toLowerCase().includes('unknown');
  const showStaleBanner = dataAgeDays > 30 || isFallbackSource;

  return (
    <>
    {/* GDPR consent modal — blocks interaction for EU users until consent saved */}
    {showGdprModal && (
      <GdprConsentModal onConsentSaved={() => {
        setShowGdprModal(false);
        // Re-read community share after consent saved
        try {
          setCommunityShare(localStorage.getItem('hp_community_share') === '1');
        } catch { /* ignore */ }
      }} />
    )}
    <div className="w-full max-w-7xl mx-auto pb-[var(--space-16)]" style={{ padding: '0 var(--space-6)' }}>

      {/* v22.0: real-time freshness badge — confirms continuous intelligence
          ingestion is feeding this company's score. Hidden when no recent
          events exist (i.e. the company has no breaking_news_events activity). */}
      <div className="mb-3 flex items-center justify-end">
        <FreshnessBadge companyName={result.companyName ?? companyData.name} />
      </div>

      {/* v17.0: WARN Act alert banner — sticky above all tabs when ground-truth filing is active */}
      {(result as any).warnSignal?.hasActiveWARN && (
        <WARNAlertBanner
          warnSignal={(result as any).warnSignal}
          companyName={result.companyName ?? companyData.name}
        />
      )}

      {/* v21.0: LOW_DATA banner — surfaces when 3+ critical signals are null or
          at heuristic defaults. Without this, an all-null input set yields a
          confident-looking MODERATE score (false positive). */}
      {result.signalQuality?.lowDataWarning && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/6 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-300">
              Low data confidence — {result.signalQuality.lowDataWarning.missingCount} critical signals are missing or unverified.
            </p>
            <p className="text-[10px] text-amber-400/70 mt-1">
              Confidence capped at {Math.round(result.signalQuality.lowDataWarning.capAt * 100)}%. The score uses sector and role baselines with limited company-specific evidence. Treat the result as directional, not definitive.
            </p>
          </div>
        </div>
      )}

      {/* [AUDIT FIX]: Stale data / fallback source banner — surfaced prominently so
          users know when the score is based on outdated DB snapshots rather than
          live company signals. Previously this information was buried in the
          Transparency tab which most users never visit. */}
      {showStaleBanner && (
        <div className="mb-4 rounded-xl border border-orange-500/30 bg-orange-500/6 px-4 py-3 flex items-start gap-3">
          <span className="text-orange-400 text-sm flex-shrink-0 mt-0.5">🕐</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-orange-300">
              {isFallbackSource
                ? 'Company not found in database — score uses sector and role baselines only.'
                : `Company data is ${dataAgeDays} days old — recent developments may not be reflected.`}
            </p>
            <p className="text-[10px] text-orange-400/70 mt-1">
              {isFallbackSource
                ? 'Financial health, layoff history, and company-specific risk signals are unavailable. The score reflects your industry sector risk and personal factors only. Consider verifying recent news before acting on this score.'
                : `The company intelligence snapshot was last updated ${dataAgeDays} days ago. If ${companyData.name} has had layoffs, leadership changes, or financial events since then, they are not in this score. Check the Company Profile tab for data age details.`}
            </p>
          </div>
          {onRecalculate && (
            <button
              onClick={onRecalculate}
              className="flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded border border-orange-500/30 text-orange-300 hover:bg-orange-500/10 transition-colors"
            >
              REFRESH
            </button>
          )}
        </div>
      )}

      {/* Rate-limit / quota degradation banner — reactive, updates every 30s */}
      {degradation.isDegraded && degradation.summary && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-300">{degradation.summary}</p>
            <p className="text-[10px] text-amber-400/70 mt-1">
              Score accuracy may be reduced — affected dimensions use heuristic fallbacks.
              {degradation.rateLimited.length > 0
                ? ' Quota resets at midnight UTC. No action needed.'
                : ' Retrying may succeed if the error was transient.'}
            </p>
            {/* Per-service detail */}
            {Object.keys(degradation.perService).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(degradation.perService).map(([svc, state]) => (
                  <span key={svc} className="text-[9px] font-mono px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-300">
                    {svc}: {state?.rateLimited ? '🔴 rate-limited' : '🟡 error'}
                    {degradation.sessionCounts?.[svc as keyof typeof degradation.sessionCounts] != null && (
                      <> · {degradation.sessionCounts[svc as keyof typeof degradation.sessionCounts]} req</>
                    )}
                  </span>
                ))}
              </div>
            )}
            {/* Proactive approaching-quota warning */}
            {degradation.approachingQuota.length > 0 && (
              <p className="text-[9px] text-amber-400/60 mt-1">
                ⚡ Approaching daily limit: {degradation.approachingQuota.map(s => {
                  const count = degradation.sessionCounts?.[s] ?? 0;
                  return `${s} (${count} req this session)`;
                }).join(', ')}. Score may fall back to heuristics soon.
              </p>
            )}
          </div>
        </div>
      )}

      <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="flex flex-col">
        {/* Navigation Bar — Sticky Rounded Pill with Data Badges */}
        <div className="sticky top-[var(--space-3)] z-50 mb-[var(--space-6)]">
          <div className="relative">
            {/* Fade masks for horizontal overflow */}
            <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--bg)] to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--bg)] to-transparent z-10 pointer-events-none" />

            <div
              className="overflow-x-auto no-scrollbar"
              style={{
                background: 'rgba(13,17,23,0.88)',
                backdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '14px',
                padding: '5px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
              }}
            >
              <Tabs.List className="flex items-center gap-1 min-w-max">
                {TAB_CONFIG.map(({ value, label, shortLabel, Icon }) => (
                  <TabTrigger
                    key={value}
                    value={value}
                    label={label}
                    shortLabel={shortLabel}
                    Icon={Icon}
                    badge={getTabBadge(value, result)}
                  />
                ))}
              </Tabs.List>
            </div>
          </div>
        </div>

        {/* Tab Contents
            Each Tabs.Content is always in the DOM — Radix manages show/hide via its
            internal Presence component. We do NOT use asChild or conditional rendering
            because that conflicts with Radix's hidden-attribute mechanism and prevents
            non-overview tabs from mounting. The motion.div inside each tab provides
            the entrance animation every time the tab becomes active. */}
        <div className="relative">

          <Tabs.Content value="overview" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <OverviewTab result={result} companyData={companyData} onRecalculate={onRecalculate ?? onRetake} onDownload={onDownload} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

          <Tabs.Content value="risk_breakdown" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="risk_breakdown"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <RiskBreakdownTab result={result} companyData={companyData} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

          <Tabs.Content value="company_profile" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="company_profile"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CompanyProfileTab result={result} companyData={companyData} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

          <Tabs.Content value="career_skills" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="career_skills"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CareerSkillsTab result={result} companyData={companyData} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

          <Tabs.Content value="action_plan" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="action_plan"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ActionPlanTab result={result} companyData={companyData} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

          <Tabs.Content value="transparency" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="transparency"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <TransparencyTab result={result} companyData={companyData} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

          <Tabs.Content value="strategy" className="outline-none">
            <GlobalErrorBoundary>
              <Suspense fallback={<TabLoader />}>
                <motion.div
                  key="strategy"
                  initial={{ opacity: 0, x: slideDirection * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <StrategyTab result={result} companyData={companyData} />
                </motion.div>
              </Suspense>
            </GlobalErrorBoundary>
          </Tabs.Content>

        </div>

        {/* Global Footer Controls — Oracle Branding */}
        <div className="mt-[var(--space-16)] flex flex-col items-center gap-[var(--space-4)]">
          {/* Community intelligence opt-in */}
          <div className="w-full max-w-lg rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleCommunityToggle}
              aria-label="Toggle community share"
              className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-200 ${communityShare ? 'bg-cyan-500' : 'bg-white/10'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${communityShare ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/70 leading-snug">
                Contribute anonymous score to community benchmarks
              </p>
              <p className="text-[10px] text-white/35 mt-0.5">
                {communityShare
                  ? 'Your score is included in the AI Risk Intelligence aggregate. No personal data is shared.'
                  : 'Help build accurate industry benchmarks — opt in to share your anonymous risk score.'}
              </p>
              {communityShare && session && retroStatus !== 'done' && (
                <button
                  type="button"
                  onClick={handleRetroactiveShare}
                  disabled={retroStatus === 'pending'}
                  className="mt-1.5 text-[10px] font-mono text-cyan-400/70 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {retroStatus === 'pending' ? '[ APPLYING… ]' : '[ SHARE MY PAST AUDITS ]'}
                </button>
              )}
              {retroStatus === 'done' && (
                <p className="mt-1.5 text-[10px] font-mono text-emerald-400/70">
                  ✓ {retroCount} past audit{retroCount !== 1 ? 's' : ''} now included in community benchmarks
                </p>
              )}
              {retroStatus === 'error' && (
                <p className="mt-1.5 text-[10px] font-mono text-red-400/60">
                  Failed — please try again
                </p>
              )}
            </div>
          </div>

           <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--border-2)] to-transparent" />
           <button
             onClick={onRetake}
             className="btn btn-secondary border-none text-[var(--text-3)] hover:text-[var(--text)] transition-colors text-[10px] font-mono tracking-widest uppercase"
           >
             [ TERMINATE SESSION & RESTART AUDIT ]
           </button>
        </div>
      </Tabs.Root>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
    </>
  );
};
