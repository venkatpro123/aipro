import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Component,
} from "react";
import type { ReactNode, ErrorInfo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useHumanProof } from "../context/HumanProofContext";
import SkillRiskCalculator from "../components/SkillRiskCalculator";
import HumanIrreplacibilityIndex from "../components/HumanIrreplacibilityIndex";
import ScoreDriftTracker, {
  ScoreDriftBanner,
  PlotScoreInversionBanner,
} from "../components/ScoreDriftTracker";
import { LayoffCalculator } from "../components/LayoffCalculator/LayoffCalculator";
import UpskillingRoadmap from "../components/UpskillingRoadmap";
import HumanEdgeJournal from "../components/HumanEdgeJournal";
import ResilienceBadge from "../components/ResilienceBadge";
import DailyChallenge from "../components/DailyChallenge";
import DisplacementForecast from "../components/DisplacementForecast";
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

const TABS = [
  { id: "risk-calculators", label: "Risk Tools", icon: "🎯", desc: "Oracle + Audit" },
  { id: "skill-matrix",     label: "Skill Health", icon: "🧠", desc: "Threat matrix" },
  { id: "hii",              label: "Human Value", icon: "✨", desc: "Irreplaceability" },
  { id: "protocol",         label: "Action Plan", icon: "🗺️", desc: "Upskill roadmap" },
  { id: "edge-log",         label: "Journal", icon: "📓", desc: "Daily log" },
  { id: "drift",            label: "Progress", icon: "📈", desc: "Score drift" },
  { id: "forecast",         label: "Forecast", icon: "📡", desc: "Future risk" },
];

const STALE_DAYS = 90;
const SESSION_DRIFT_KEY = "hp_drift_banner_seen_session";

export default function ToolsPage() {
  const { state, dispatch } = useHumanProof();
  const [activeTab, setActiveTab] = useState<string>(
    state.activeToolTab || "risk-calculators",
  );
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(
    new Set([state.activeToolTab || "risk-calculators"]),
  );
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

  const QUICK_ACTIONS = [
    {
      id: "risk-oracle",
      tab: "risk-calculators",
      icon: "🎯",
      title: "Risk Oracle",
      subtitle: "6-Dimension AI Displacement Analysis",
      desc: "Analyze your role across automation potential, market headwinds, industry exposure, and 3 more vectors.",
      color: "var(--cyan)",
      colorDim: "rgba(0,213,224,0.08)",
      colorBorder: "rgba(0,213,224,0.2)",
    },
    {
      id: "layoff-audit",
      tab: "risk-calculators",
      icon: "📉",
      title: "Layoff Audit",
      subtitle: "Company-Specific Risk Assessment",
      desc: "Run a 30-agent swarm intelligence audit on any company to surface real layoff probability signals.",
      color: "var(--amber)",
      colorDim: "rgba(245,158,11,0.07)",
      colorBorder: "rgba(245,158,11,0.2)",
    },
  ];

  return (
    <div className="page-wrap" style={{ background: "var(--bg)" }}>
      <div className="container" style={{ maxWidth: 1280 }}>

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
                ● LIVE · NODE CONNECTIVITY
              </span>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
                fontWeight: 900,
                letterSpacing: '-0.05em',
                lineHeight: 1,
                color: 'var(--text)',
                marginBottom: '8px',
              }}>
                MY DASHBOARD
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', fontWeight: 500 }}>
                AI displacement intelligence across thousands of global roles
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

        {/* ── Quick Launch Cards ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="quick-launch-grid"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => switchTab(action.tab)}
              className="quick-launch-card"
              style={{
                '--ql-color': action.color,
                '--ql-dim': action.colorDim,
                '--ql-border': action.colorBorder,
              } as React.CSSProperties}
            >
              <div className="quick-launch-icon">{action.icon}</div>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                    {action.title}
                  </span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: action.color, opacity: 0.9 }}>
                    {action.subtitle}
                  </span>
                </div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', lineHeight: 1.55, margin: 0 }}>
                  {action.desc}
                </p>
              </div>
              <div className="quick-launch-arrow" style={{ color: action.color }}>→</div>
            </button>
          ))}
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

        {/* ── Tab Strip ─────────────────────────────────────────────────── */}
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
                      {tab.id === "risk-calculators" && (
                        <RiskCalculatorsView onSwitchTab={switchTab} />
                      )}
                      {tab.id === "layoff-audit" && (
                        <LayoffCalculator onSwitchTab={switchTab} />
                      )}
                      {tab.id === "skill-matrix" && (
                        <SkillRiskCalculator onNavigate={switchTab} />
                      )}
                      {tab.id === "hii" && <HumanIrreplacibilityIndex />}
                      {tab.id === "protocol" && <UpskillingRoadmap />}
                      {tab.id === "edge-log" && <HumanEdgeJournal />}
                      {tab.id === "drift" && (
                        <>
                          <PlotScoreInversionBanner />
                          <ResilienceBadge />
                          <ScoreDriftTracker />
                        </>
                      )}
                      {tab.id === "forecast" && (
                        <DisplacementForecast onNavigate={switchTab} />
                      )}
                    </TabErrorBoundary>
                  )}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>
      </div>

      <DailyChallenge onNavigateJournal={() => switchTab("edge-log")} />

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
