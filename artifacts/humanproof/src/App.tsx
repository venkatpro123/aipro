import { useState, useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
// import "./index.css"; // Removed to prevent PostCSS @import duplication
import { LiquidAIBackground } from "./components/LiquidAIBackground";

// Pages — critical loads (no intelligence data, renders fast on mobile)
import HomePage from "./pages/HomePage";
import PricingPage from "./pages/PricingPage";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { BlogPage } from "./pages/BlogPage";
import { ContactPage } from "./pages/ContactPage";
import NotFoundPage from "./pages/not-found";
import SettingsPage from "./pages/SettingsPage";
import TeamDashboardPage from "./pages/TeamDashboardPage";

// Pages — lazy-loaded
// AuditTerminalPage pulls the full intelligence module (371 roles, 842KB raw / 187KB gzip).
// Lazy-loading it removes that data from the initial bundle, saving ~430ms p95 TTI
// on 4G India. The Suspense fallback below shows a spinner until the chunk arrives.
const AuditTerminalPage = lazy(() => import("./pages/AuditTerminalPage"));
const ToolsPage = lazy(() => import("./pages/ToolsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const SafeCareersPage = lazy(() =>
  import("./pages/SafeCareersPage").then((m) => ({
    default: m.SafeCareersPage,
  })),
);
const CareerDetailPage = lazy(() =>
  import("./pages/CareerDetailPage").then((m) => ({
    default: m.CareerDetailPage,
  })),
);
const LearningHubPage = lazy(() =>
  import("./pages/LearningHubPage").then((m) => ({
    default: m.LearningHubPage,
  })),
);
const AuditLogPage = lazy(() =>
  import("./pages/AuditLogPage").then((m) => ({ default: m.AuditLogPage })),
);
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const PredictionLedgerPage = lazy(() => import("./pages/PredictionLedgerPage"));
const CommunityIntelligencePage = lazy(() => import("./pages/CommunityIntelligencePage"));
const CertificationPage = lazy(() => import("./pages/CertificationPage"));
const IntelligenceReportPage = lazy(() => import("./pages/IntelligenceReportPage"));

// Context & Components
import { HumanProofProvider } from "./context/HumanProofContext";
import { LayoffProvider } from "./context/LayoffContext";
import { AuthProvider } from "./context/AuthContext";
import { digestAPI } from "./utils/apiClient";
import { useAuth } from "./context/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { ToastProvider } from "./components/Toast";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { useCloudSync } from "./hooks/useCloudSync";
import { useBreakingNewsPoller } from "./hooks/useBreakingNewsPoller";
import { syncCircuitStateFromSupabase } from "./services/apiCircuitBreaker";
import { getScoreHistory } from "./utils/scoreStorage";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { LanguageSelector } from "./components/LanguageSelector";
import { applyWhiteLabelCssVars, getWhiteLabelConfig } from "./services/whiteLabelService";
import { track, page as trackPage, identify } from "./services/analyticsService";
import { getVariant, trackExposure } from "./services/experimentsService";
import { Toaster as SonnerToaster } from "./components/ui/sonner";

// ─── Page Loader ──────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <span className="label-xs text-[var(--text-3)]">Loading module...</span>
      </div>
    </div>
  );
}

// ─── Scroll To Top on route change ───────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

// ─── Navigation Bridge ────────────────────────────────────────────────────────
function NavigationBridge() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleNav = (e: any) => {
      if (typeof e.detail === "string") {
        navigate(`/${e.detail === "home" ? "" : e.detail}`);
      } else if (e.detail?.page) {
        const path = `/${e.detail.page === "home" ? "" : e.detail.page}`;
        navigate(path, { state: e.detail.params });
      }
    };
    window.addEventListener("navigate", handleNav);
    return () => window.removeEventListener("navigate", handleNav);
  }, [navigate]);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (e) => e.isIntersecting && e.target.classList.add("vis"),
        ),
      { threshold: 0.08 },
    );

    const observe = () =>
      document
        .querySelectorAll(".reveal:not(.vis)")
        .forEach((el) => observer.observe(el));
    observe();
    setTimeout(observe, 400);

    const main = document.querySelector("main") || document.body;
    const mo = new MutationObserver(observe);
    mo.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, [location.pathname]);

  return null;
}

// ─── Particle Canvas hook removed — replaced by LiquidAIBackground WebGL component ──

// ─── App Navigation ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/", label: "Research" },
  { to: "/terminal", label: "My Dashboard" },
  { to: "/leaderboard", label: "Risk Index" },
  { to: "/intelligence", label: "Intel" },
  { to: "/safe-careers", label: "Safe List" },
  { to: "/learning-hub", label: "Upskill" },
  { to: "/certification", label: "Certify" },
];

function AppNav({
  isDark,
  toggleTheme,
  onAuthOpen,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  onAuthOpen: () => void;
}) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const isActive = (to: string) => {
    if (to === "/" && location.pathname === "/") return true;
    if (to !== "/" && location.pathname.startsWith(to)) return true;
    return false;
  };

  return (
    <header className="nav-root" style={{ zIndex: 1000 }}>
      <nav className={`nav-inner${scrolled ? ' scrolled' : ''}`}>
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          <span className="nav-logo-dot" />
          HumanShield
        </Link>

        {/* Desktop nav */}
        <ul
          className="nav-links"
          style={{
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav-link ${isActive(item.to) ? "active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          {/* Desktop-only items */}
          <div className="nav-desktop-actions">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            {user ? (
              <>
                <span className="nav-user-email">{user.email?.split("@")[0]}</span>
                <Link to="/settings" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>Settings</Link>
                <button onClick={() => signOut()} className="btn btn-secondary btn-sm">Sign out</button>
              </>
            ) : (
              <button onClick={onAuthOpen} className="btn btn-primary btn-sm">Get Access</button>
            )}
          </div>

          {/* Mobile: theme + hamburger only */}
          <div className="nav-mobile-actions">
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              className="theme-toggle"
              id="mobile-menu-btn"
              onClick={() => setMobileOpen((p) => !p)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {mobileOpen ? (
                  <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                ) : (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-drawer" role="navigation" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className={`nav-link ${isActive(item.to) ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
          <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {user ? (
              <>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 4px' }}>{user.email}</span>
                <Link to="/settings" className="nav-link" style={{ textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>Settings</Link>
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="nav-link" style={{ textAlign: 'left', cursor: 'pointer' }}>Sign out</button>
              </>
            ) : (
              <button onClick={() => { onAuthOpen(); setMobileOpen(false); }} className="btn btn-primary btn-sm" style={{ width: '100%' }}>Get Access</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function AppFooter() {
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubStatus("loading");
    try {
      await digestAPI.subscribe(email);
      setSubStatus("success");
      setEmail("");
      setTimeout(() => setSubStatus("idle"), 3500);
    } catch {
      setSubStatus("error");
      setTimeout(() => setSubStatus("idle"), 3000);
    }
  };

  return (
    <footer className="footer-root">
      <div className="container">
        <div
          className="footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: '48px',
            marginBottom: '48px',
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--cyan)",
                  borderRadius: "50%",
                  display: "block",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontSize: "1rem",
                  color: "var(--text)",
                  letterSpacing: "-0.04em",
                }}
              >
                HumanShield
              </span>
            </div>
            <p
              style={{
                color: "var(--text-2)",
                fontSize: "0.875rem",
                lineHeight: 1.7,
                maxWidth: "320px",
                marginBottom: "24px",
              }}
            >
              The high-fidelity standard for career protection in the AI era.
              Powered by state-of-the-art frontier AI systems and verified
              global research.
            </p>
            <form
              onSubmit={handleSubscribe}
              style={{ display: "flex", maxWidth: "320px", gap: "8px" }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
                style={{ flex: 1, fontSize: "0.8rem", padding: "10px 14px" }}
              />
              <button
                type="submit"
                className="btn btn-black"
                disabled={subStatus === "loading"}
                style={{
                  background:
                    subStatus === "success" ? "var(--emerald)" : "var(--text)",
                  color: "var(--bg)",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  border: "none",
                  flexShrink: 0,
                  transition: "all 250ms",
                }}
              >
                {subStatus === "loading"
                  ? "..."
                  : subStatus === "success"
                    ? "✓"
                    : "Subscribe"}
              </button>
            </form>
            {subStatus === "error" && (
              <p
                style={{
                  color: "var(--red)",
                  fontSize: "0.75rem",
                  marginTop: "8px",
                }}
              >
                Failed. Try again.
              </p>
            )}
          </div>

          {/* Protocol links */}
          <div>
            <h4 className="label-xs" style={{ marginBottom: "20px" }}>
              Platform
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {[
              { to: "/terminal", label: "Risk Oracle" },
                { to: "/terminal", label: "Audit Terminal" },
                { to: "/learning-hub", label: "Learning Hub" },
                { to: "/safe-careers", label: "Safe Careers" },
                { to: "/about", label: "About" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    style={{
                      color: "var(--text-2)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      transition: "color 150ms",
                    }}
                    onMouseEnter={(e) =>
                      ((e.target as any).style.color = "var(--text)")
                    }
                    onMouseLeave={(e) =>
                      ((e.target as any).style.color = "var(--text-2)")
                    }
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="label-xs" style={{ marginBottom: "20px" }}>
              Legal
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {[
                { to: "/privacy", label: "Privacy Policy" },
                { to: "/terms", label: "Terms of Use" },
                { to: "/audit-log", label: "Audit Log" },
                { to: "/blog", label: "Blog" },
                { to: "/contact", label: "Contact" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    style={{
                      color: "var(--text-2)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      transition: "color 150ms",
                    }}
                    onMouseEnter={(e) =>
                      ((e.target as any).style.color = "var(--text)")
                    }
                    onMouseLeave={(e) =>
                      ((e.target as any).style.color = "var(--text-2)")
                    }
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>
            © {new Date().getFullYear()} HumanShield. All rights reserved.
          </span>
          <div className="badge badge-cyan">
            <span
              style={{
                width: 4,
                height: 4,
                background: "var(--cyan)",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            Live · Q1 2026 Dataset
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main App Content ─────────────────────────────────────────────────────────
function AppContent() {
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    applyWhiteLabelCssVars(getWhiteLabelConfig());
  }, []);

  useEffect(() => {
    if (user?.id) {
      identify(user.id, { email: user.email });
    }
  }, [user?.id]);

  useEffect(() => {
    const location = window.location.pathname;
    trackPage(location, { path: location });
  }, []);

  // Speculative prefetch of the audit chunk after 3s of idle time.
  // AuditTerminalPage is lazy-loaded, so the career-intelligence chunk (187KB gzip)
  // is not part of the initial bundle. On 4G India the download takes ~430ms —
  // prefetching it during idle time means the chunk is already in cache when the
  // user navigates to /calculator, eliminating the wait.
  // Uses requestIdleCallback when available (Chrome/Android); setTimeout fallback.
  useEffect(() => {
    const prefetch = () => { import("./pages/AuditTerminalPage"); };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 3000);
    return () => clearTimeout(id);
  }, []);

  // Background cloud sync for scores
  useCloudSync({
    userId: user?.id,
    enabled: !!user,
    scoreEntries: getScoreHistory(),
  });

  // Breaking news RSS poll — runs on every page load (self-throttled to 15min).
  useBreakingNewsPoller();

  // Sync circuit breaker state from Supabase once per page load.
  // Inherits any OPEN circuits triggered by other sessions or Edge Functions
  // (e.g. Alpha Vantage quota hit by another user → circuit already OPEN for us).
  useEffect(() => {
    syncCircuitStateFromSupabase().catch(() => { /* non-fatal */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    setIsDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("light", !next);
      return next;
    });
  };

  return (
    <div style={{ minHeight: '100vh', color: 'var(--text)', position: 'relative' }}>
      {/* Background: static CSS gradient — no animation, no WebGL */}
      <LiquidAIBackground />
      <ScrollToTop />
      <NavigationBridge />

      <AppNav
        isDark={isDark}
        toggleTheme={toggleTheme}
        onAuthOpen={() => setIsAuthOpen(true)}
      />

      <main style={{ position: "relative", zIndex: 1 }}>
        <GlobalErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/calculator" element={<AuditTerminalPage />} />
              <Route path="/terminal" element={<ToolsPage />} />
              <Route path="/safe-careers" element={<SafeCareersPage />} />
              <Route path="/career/:id" element={<CareerDetailPage />} />
              <Route path="/learning-hub" element={<LearningHubPage />} />
              <Route path="/audit-log" element={<AuditLogPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamDashboardPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/predictions" element={<PredictionLedgerPage />} />
              <Route path="/intelligence" element={<CommunityIntelligencePage />} />
              <Route path="/intelligence/report" element={<IntelligenceReportPage />} />
              <Route path="/intelligence/report/:yearMonth" element={<IntelligenceReportPage />} />
              <Route path="/certification" element={<CertificationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </GlobalErrorBoundary>
      </main>

      <PWAInstallPrompt />
      <AppFooter />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Sonner toast portal — used by useCompanySignalSubscription for action-button toasts */}
      <SonnerToaster position="bottom-right" richColors closeButton />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <AuthProvider>
        <HumanProofProvider>
          <LayoffProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </LayoffProvider>
        </HumanProofProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
