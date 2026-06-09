import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Component,
  lazy,
  Suspense,
} from "react";
import type { ReactNode, ErrorInfo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

import { useHumanProof } from "../context/HumanProofContext";
import { useLayoff } from "../context/LayoffContext";
import SkillRiskCalculator from "../components/SkillRiskCalculator";
import HumanIrreplacibilityIndex from "../components/HumanIrreplacibilityIndex";
import ScoreDriftTracker, {
  ScoreDriftBanner,
  PlotScoreInversionBanner,
} from "../components/ScoreDriftTracker";

// Lazy-loaded heavy tab components — split into separate chunks to keep peak
// build memory within Vercel's container limits. Each tab is its own chunk
// so the scoring engine (3MB) is processed separately during minification.
const LayoffCalculator = lazy(() =>
  import('../components/LayoffCalculator/LayoffCalculator').then(m => ({ default: m.LayoffCalculator }))
);
const AuditTerminalPage = lazy(() => import('./AuditTerminalPage'));
import UpskillingRoadmap from "../components/UpskillingRoadmap";
import HumanEdgeJournal from "../components/HumanEdgeJournal";
import ResilienceBadge from "../components/ResilienceBadge";
import DailyChallenge from "../components/DailyChallenge";
import RiskCalculatorsView from "../components/RiskCalculatorsView";
import {
  getScoreHistory,
  getEverCompletedFlags,
  hasLegacyVersionEntries,
} from "../utils/scoreStorage";
import {
  generateAssessmentSnapshot,
  generateShareableLink,
} from "../utils/assessmentExport";

class TabErrorBoundary extends Component<
  { tabId: string; children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { tabId: string; children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '48px', textAlign: 'center', maxWidth: 480, margin: '80px auto' }} className="card">
          <div style={{ fontSize: '2.5rem', marginBottom: '20px' }}>⚠️</div>
          <h3 style={{ color: 'var(--red)', fontWeight: 800, marginBottom: '8px' }}>
            {this.props.tabId} — Module Error
          </h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '24px', lineHeight: 1.65 }}>
            {this.state.error.message || "Unexpected exception in rendering thread."}
          </p>
          <button onClick={() => this.setState({ error: null })} className="btn btn-secondary btn-sm">
            Reload Module
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// v35.1.4 — dashboard pared to the two primary surfaces. The other tools
// (Skill Health, Human Value, Action Plan, Journal, Progress, Forecast)
// are still routable elsewhere in the app; they are simply not surfaced
// on this dashboard. Reintroduce here when the product needs them back.
const TABS = [
  { id: "layoff-audit", label: "Layoff Audit", icon: "📉", desc: "Company-specific risk audit" },
  { id: "risk-oracle",  label: "Risk Oracle",  icon: "🎯", desc: "6-dimension role displacement" },
];

const VALID_TAB_IDS = new Set(TABS.map(t => t.id));

const STALE_DAYS = 90;
const SESSION_DRIFT_KEY = "hp_drift_banner_seen_session";

const ONBOARDING_PREFILL_KEY = 'hp_onboarding_prefill';

export default function ToolsPage() {
  const { state, dispatch } = useHumanProof();
  const { dispatch: layoffDispatch } = useLayoff();
  const location = useLocation();
  const navigate = useNavigate();
  const fromOnboarding = (location.state as any)?.fromOnboarding === true;
  // v35.1.4 — if a user's persisted tab points to a removed surface, fall
  // back to the new default so the dashboard never renders an empty pane.
  const initialTab = state.activeToolTab && VALID_TAB_IDS.has(state.activeToolTab)
    ? state.activeToolTab
    : "layoff-audit";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set([initialTab]));
  const [showDriftBannerState, setShowDriftBannerState] = useState(false);
  const [showStalenessBanner, setShowStalenessBanner] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLegacyVersionBanner, setShowLegacyVersionBanner] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isStale = () => {
      const history = getScoreHistory();
      if (!history.length) return false;
      const latest = history[history.length - 1];
      return (Date.now() - latest.timestamp) / (1000 * 60 * 60 * 24) > STALE_DAYS;
    };
    setShowStalenessBanner(isStale());
  }, [activeTab]);

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem(SESSION_DRIFT_KEY);
    if (!alreadySeen && getScoreHistory().length >= 2) {
      setShowDriftBannerState(true);
      sessionStorage.setItem(SESSION_DRIFT_KEY, "1");
    }
  }, []);

  useEffect(() => {
    if (hasLegacyVersionEntries()) setShowLegacyVersionBanner(true);
  }, []);

  // Read onboarding prefill (company + role) and seed LayoffContext
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ONBOARDING_PREFILL_KEY);
      if (!raw) return;
      const { companyName, roleTitle } = JSON.parse(raw) as { companyName: string; roleTitle: string };
      if (companyName || roleTitle) {
        layoffDispatch({ type: 'SET_INPUTS', payload: { companyName: companyName || null, roleTitle: roleTitle || null } });
      }
      sessionStorage.removeItem(ONBOARDING_PREFILL_KEY);
    } catch { /* non-fatal */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTab) return;
      setActiveTab(tabId);
      setMountedTabs((prev) => new Set([...prev, tabId]));
      dispatch({ type: "SET_ACTIVE_TAB", tab: tabId });
      // Scroll tab content into view smoothly
      setTimeout(() => {
        tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    },
    [activeTab, dispatch],
  );

  const handleExport = useCallback(
    async (format: "json" | "pdf") => {
      if (format === "json") {
        const snapshot = generateAssessmentSnapshot(
          state.jobRiskScore,
          state.jobTitle,
          state.skillRiskScore,
          state.humanScore,
        );
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `hp-audit-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setToastMsg("📄 PDF generation coming in Q2 2026.");
        setTimeout(() => setToastMsg(null), 3000);
      }
      setShowExportMenu(false);
    },
    [state],
  );

  const completionCount =
    Object.values(getEverCompletedFlags()).filter(Boolean).length ||
    [state.jobRiskScore, state.skillRiskScore, state.humanScore].filter(
      (x) => x !== null,
    ).length;
  const completionPct = Math.round((completionCount / 3) * 100);

  return (
    <div className="page-wrap" style={{ background: "var(--bg)" }}>
      <div className="container" style={{ maxWidth: 1280 }}>

        {/* ── Back to Career OS ─────────────────────────────────────────── */}
        <div style={{ paddingTop: 16, paddingBottom: 4 }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: { page: "os" } }))}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
              padding: '4px 0', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cyan)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            ← Back to Career OS
          </button>
        </div>

        {/* ── Premium Dashboard Header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: '40px' }}
        >
          <div className="dashboard-header-row">
            <div>
              <span className="label-xs" style={{ color: 'var(--cyan)', display: 'block', marginBottom: '10px' }}>
                ● LIVE DATA ACTIVE
              </span>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                Career Audit Terminal
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 400 }}>
                Run a fresh audit to update your Career OS with live intelligence.
              </p>
            </div>

            <div className="dashboard-header-actions">
              {/* Module Progress Ring */}
              <div className="module-progress-card">
                <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none"
                      stroke={completionPct === 100 ? 'var(--emerald)' : 'var(--cyan)'}
                      strokeWidth="4"
                      strokeDasharray={`${(completionPct / 100) * 125.6} 125.6`}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                  </svg>
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900, color: completionPct === 100 ? 'var(--emerald)' : 'var(--cyan)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {completionPct}%
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
                    {completionCount}/3 Modules
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: '2px' }}>
                    {completionPct === 100 ? 'Assessment complete' : 'Complete all for full analysis'}
                  </div>
                </div>
              </div>

              {/* Export */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn btn-secondary btn-sm">
                  Export
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '4px',
                    minWidth: 140, zIndex: 100, boxShadow: 'var(--shadow-lg)',
                  }}>
                    <button onClick={() => handleExport('json')} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                      JSON Export
                    </button>
                    <button onClick={() => handleExport('pdf')} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                      PDF Report
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + "/" + generateShareableLink());
                  setToastMsg("✓ Link copied to clipboard");
                  setTimeout(() => setToastMsg(null), 2500);
                }}
                className="btn btn-primary btn-sm"
              >
                Share
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── System Banners ────────────────────────────────────────────── */}
        {(showStalenessBanner || showDriftBannerState || showLegacyVersionBanner) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {showStalenessBanner && (
              <div className="dashboard-banner banner-warning">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span>
                  <span>Data exceeds 90-day threshold — re-calibration recommended.</span>
                </div>
                <button onClick={() => setShowStalenessBanner(false)} style={{ opacity: 0.5, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
              </div>
            )}
            {showDriftBannerState && (
              <ScoreDriftBanner onDismiss={() => setShowDriftBannerState(false)} />
            )}
          </div>
        )}

        {/* ── Tab Strip (desktop) ───────────────────────────────────────── */}
        {/* Hidden on mobile via CSS; replaced by compact pill row below. */}
        <div className="dashboard-tabs-strip">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`dashboard-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              title={tab.desc}
            >
              <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
              <span className="tab-label-text">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Mobile-only compact tool switcher ────────────────────────── */}
        {/* Shown only on mobile (sm:hidden equivalent via inline style).  */}
        {/* Replaces the full dashboard-tabs-strip which is hidden at ≤768px. */}
        <div
          className="sm:hidden"
          style={{ display: 'flex', gap: 8, marginBottom: 16 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `1px solid ${isActive ? 'rgba(0,212,224,0.35)' : 'rgba(255,255,255,0.10)'}`,
                  background: isActive ? 'rgba(0,212,224,0.10)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? 'var(--cyan,#00d4e0)' : 'rgba(255,255,255,0.45)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  minHeight: 36,
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ───────────────────────────────────────────────── */}
        <div ref={tabContentRef} style={{ minHeight: '60vh' }}>
          <AnimatePresence mode="wait">
            {TABS.map((tab) => (
              activeTab === tab.id && (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {mountedTabs.has(tab.id) && (
                    <TabErrorBoundary tabId={tab.id}>
                      <Suspense fallback={null}>
                        {tab.id === "layoff-audit" && (
                          <LayoffCalculator
                            onSwitchTab={switchTab}
                            onAfterReveal={() => navigate('/os', { replace: true })}
                          />
                        )}
                        {tab.id === "risk-oracle" && <AuditTerminalPage />}
                      </Suspense>
                    </TabErrorBoundary>
                  )}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 'var(--toast-bottom, 32px)', left: '50%', transform: 'translateX(-50%)',
              zIndex: 10000, padding: '12px 24px',
              background: 'var(--text)', color: 'var(--bg)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

