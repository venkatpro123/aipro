import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { LiquidAIBackground } from "./components/LiquidAIBackground";
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  MoreHorizontal,
  ShieldCheck,
  GraduationCap,
  Award,
  Settings,
  LogOut,
  LogIn,
  Sun,
  Moon,
  ArrowUpRight,
} from "lucide-react";

// Pages — critical loads
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

// Pages — lazy-loaded (career-intelligence chunk 187KB gzip)
const AuditTerminalPage = lazy(() => import("./pages/AuditTerminalPage"));
const ToolsPage = lazy(() => import("./pages/ToolsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const SafeCareersPage = lazy(() =>
  import("./pages/SafeCareersPage").then((m) => ({ default: m.SafeCareersPage })),
);
const CareerDetailPage = lazy(() =>
  import("./pages/CareerDetailPage").then((m) => ({ default: m.CareerDetailPage })),
);
const LearningHubPage = lazy(() =>
  import("./pages/LearningHubPage").then((m) => ({ default: m.LearningHubPage })),
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
import { ProfileSetupModal } from "./components/ProfileSetupModal";
import { LayoffProvider } from "./context/LayoffContext";
import { AuthProvider } from "./context/AuthContext";
import { digestAPI } from "./utils/apiClient";
import { useAuth } from "./context/AuthContext";
import { AuthModal } from "./components/AuthModal";
import { ToastProvider } from "./components/Toast";
import { RealtimeSignalToast } from "./components/audit/RealtimeSignalToast";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { useCloudSync } from "./hooks/useCloudSync";
import { useBreakingNewsPoller } from "./hooks/useBreakingNewsPoller";
import { syncCircuitStateFromSupabase, resetAllOpenCircuits } from "./services/apiCircuitBreaker";
import { getScoreHistory } from "./utils/scoreStorage";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { LanguageSelector } from "./components/LanguageSelector";
import { applyWhiteLabelCssVars, getWhiteLabelConfig } from "./services/whiteLabelService";
import { page as trackPage, identify } from "./services/analyticsService";
import { Toaster as SonnerToaster } from "./components/ui/sonner";

// ─── Page Loader ─────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <span className="label-xs" style={{ color: "var(--text-3)" }}>Loading module…</span>
      </div>
    </div>
  );
}

// ─── Scroll To Top ────────────────────────────────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("vis")),
      { threshold: 0.08 },
    );
    const observe = () =>
      document.querySelectorAll(".reveal:not(.vis)").forEach((el) => observer.observe(el));
    observe();
    setTimeout(observe, 400);
    const main = document.querySelector("main") || document.body;
    const mo = new MutationObserver(observe);
    mo.observe(main, { childList: true, subtree: true });
    return () => { observer.disconnect(); mo.disconnect(); };
  }, [location.pathname]);

  return null;
}

// ─── Nav helpers ──────────────────────────────────────────────────────────────
// "Research" (root path "/") removed from the visible nav per product
// decision. The root route still works for direct-URL hits and brand-logo
// clicks; it just doesn't get an explicit nav entry. If brought back later,
// re-add the matching entry to BOTH lists below.
// Navigation simplified to two primary surfaces only.
// Other routes (/intelligence, /safe-careers, /learning-hub, /certification)
// remain accessible via direct URL but are no longer surfaced in the nav.
const NAV_ITEMS = [
  { to: "/terminal",    label: "Layoff Audit" },
  { to: "/leaderboard", label: "Risk Oracle"  },
];

const MOBILE_PRIMARY = [
  { to: "/terminal",    label: "Layoff Audit", Icon: LayoutDashboard },
  { to: "/leaderboard", label: "Risk Oracle",  Icon: TrendingUp      },
];

// Secondary nav items — appear in the "More" slide-up sheet.
// Adding these surfaces pages that were previously only reachable via direct URL on mobile.
const MOBILE_MORE: Array<{ to: string; label: string; Icon: React.ElementType }> = [
  { to: "/safe-careers",  label: "Safe Careers",  Icon: ShieldCheck    },
  { to: "/learning-hub",  label: "Learning Hub",  Icon: GraduationCap  },
  { to: "/settings",      label: "Settings",      Icon: Settings       },
];

function useIsActive() {
  const location = useLocation();
  return (to: string) => {
    if (to === "/" && location.pathname === "/") return true;
    if (to !== "/" && location.pathname.startsWith(to)) return true;
    return false;
  };
}

// ─── Theme Toggle Icon ────────────────────────────────────────────────────────
function ThemeIcon({ isDark }: { isDark: boolean }) {
  return isDark
    ? <Sun size={15} strokeWidth={2} />
    : <Moon size={15} strokeWidth={2} />;
}

// ─── Desktop/Tablet Navigation ────────────────────────────────────────────────
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
  const [scrolled, setScrolled] = useState(false);
  const isActive = useIsActive();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="nav-root" style={{ zIndex: 1000 }}>
      <nav className={`nav-inner${scrolled ? " scrolled" : ""}`}>
        {/* Logo */}
        <Link to="/" className="nav-logo" style={{ textDecoration: "none" }}>
          <span className="nav-logo-dot" />
          HumanShield
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links" style={{ listStyle: "none", display: "flex", alignItems: "center", gap: "2px" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to);
            return (
              <li key={item.to} style={{ position: "relative" }}>
                {/* Framer Motion layoutId pill — slides between nav items */}
                {active && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="nav-active-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  />
                )}
                <Link
                  to={item.to}
                  className={`nav-link${active ? " active" : ""}`}
                  style={{ textDecoration: "none", position: "relative", zIndex: 1 }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="nav-actions">
          {/* Desktop actions */}
          <div className="nav-desktop-actions">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              <ThemeIcon isDark={isDark} />
            </button>
            {user ? (
              <>
                {/* Premium user avatar pill */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px 4px 4px",
                  borderRadius: "var(--radius-full)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--cyan) 0%, #7c3aed 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#000",
                    flexShrink: 0,
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.02em",
                  }}>
                    {(user.email?.[0] ?? "U").toUpperCase()}
                  </div>
                  <span className="nav-user-email" style={{ margin: 0 }}>
                    {user.email?.split("@")[0]}
                  </span>
                </div>
                <Link to="/settings" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                  Settings
                </Link>
                <button onClick={() => signOut()} className="btn btn-ghost btn-sm">
                  Sign out
                </button>
              </>
            ) : (
              <button onClick={onAuthOpen} className="btn btn-primary btn-sm shimmer-sweep">
                Get Access
              </button>
            )}
          </div>

          {/* Mobile compact bar — theme + auth pill only (bottom nav handles routing) */}
          <div className="nav-mobile-actions">
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              <ThemeIcon isDark={isDark} />
            </button>
            {user ? (
              <Link
                to="/settings"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--cyan) 0%, #7c3aed 100%)",
                  color: "#000",
                  textDecoration: "none",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                }}
                aria-label="Settings"
              >
                {(user.email?.[0] ?? "U").toUpperCase()}
              </Link>
            ) : (
              <button
                onClick={onAuthOpen}
                className="btn btn-primary btn-sm"
                style={{ height: 34, padding: "0 14px", fontSize: "0.78rem" }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────
function MobileBottomNav({
  isDark,
  toggleTheme,
  onAuthOpen,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  onAuthOpen: () => void;
}) {
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = useIsActive();
  const location = useLocation();

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {MOBILE_PRIMARY.map(({ to, label, Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`bottom-nav-item${active ? " active" : ""}`}
              style={{ textDecoration: "none" }}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(8);
              }}
            >
              <motion.div
                className="bottom-nav-icon-wrap"
                animate={active ? { scale: 1.10, y: -3 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </motion.div>
              <span className="bottom-nav-label">{label}</span>
            </Link>
          );
        })}
        {MOBILE_MORE.length > 0 && (
          <button
            className={`bottom-nav-item${moreOpen ? " active" : ""}`}
            onClick={() => {
              setMoreOpen((p) => !p);
              if (navigator.vibrate) navigator.vibrate(8);
            }}
            aria-label="More navigation"
            aria-expanded={moreOpen}
          >
            <motion.div
              className="bottom-nav-icon-wrap"
              animate={moreOpen ? { scale: 1.10, y: -3 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <MoreHorizontal size={20} strokeWidth={1.8} />
            </motion.div>
            <span className="bottom-nav-label">More</span>
          </button>
        )}
      </nav>

      {/* More Sheet Overlay */}
      {moreOpen && (
        <>
          <div
            className="more-overlay"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="more-sheet" role="dialog" aria-label="More options">
            <div className="more-sheet-handle" />
            <p className="more-sheet-title">More pages</p>

            {/* Icon grid — secondary nav items */}
            <div className="more-sheet-grid">
              {MOBILE_MORE.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`more-sheet-icon-item${isActive(to) ? " active" : ""}`}
                  style={{ textDecoration: "none" }}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon size={22} strokeWidth={1.8} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            <div className="more-sheet-divider" />
            <p className="more-sheet-title" style={{ paddingBottom: 8 }}>Settings</p>

            {/* Theme row */}
            <button className="more-sheet-row" onClick={toggleTheme}>
              {isDark
                ? <Sun size={18} strokeWidth={1.8} style={{ color: "var(--amber)", flexShrink: 0 }} />
                : <Moon size={18} strokeWidth={1.8} style={{ color: "var(--cyan)", flexShrink: 0 }} />
              }
              <span style={{ flex: 1 }}>{isDark ? "Light mode" : "Dark mode"}</span>
            </button>

            {/* Auth rows */}
            {user ? (
              <>
                <Link
                  to="/settings"
                  className="more-sheet-row"
                  style={{ textDecoration: "none" }}
                  onClick={() => setMoreOpen(false)}
                >
                  <Settings size={18} strokeWidth={1.8} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>Settings</span>
                  <ArrowUpRight size={14} style={{ color: "var(--text-3)" }} />
                </Link>
                <button
                  className="more-sheet-row"
                  onClick={() => { signOut(); setMoreOpen(false); }}
                >
                  <LogOut size={18} strokeWidth={1.8} style={{ color: "var(--red)", flexShrink: 0 }} />
                  <span style={{ flex: 1, color: "var(--red)" }}>Sign out</span>
                </button>
              </>
            ) : (
              <button
                className="more-sheet-row"
                onClick={() => { onAuthOpen(); setMoreOpen(false); }}
              >
                <LogIn size={18} strokeWidth={1.8} style={{ color: "var(--cyan)", flexShrink: 0 }} />
                <span style={{ flex: 1, color: "var(--cyan)" }}>Sign in / Get Access</span>
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function AppFooter() {
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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

  const footerLinks = {
    platform: [
      { to: "/terminal",     label: "Risk Oracle"   },
      { to: "/learning-hub", label: "Learning Hub"  },
      { to: "/safe-careers", label: "Safe Careers"  },
      { to: "/leaderboard",  label: "Risk Index"    },
      { to: "/about",        label: "About"         },
    ],
    legal: [
      { to: "/privacy",   label: "Privacy Policy" },
      { to: "/terms",     label: "Terms of Use"   },
      { to: "/audit-log", label: "Audit Log"      },
      { to: "/blog",      label: "Blog"           },
      { to: "/contact",   label: "Contact"        },
    ],
  };

  return (
    <footer className="footer-root">
      <div className="container">
        {/* Top divider with gradient */}
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,212,224,0.2) 30%, rgba(255,255,255,0.06) 50%, rgba(0,212,224,0.2) 70%, transparent)",
          marginBottom: 56,
        }} />

        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: "48px",
            marginBottom: "48px",
          }}
        >
          {/* Brand col */}
          <div>
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                textDecoration: "none",
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                background: "var(--cyan)",
                borderRadius: "50%",
                display: "block",
                boxShadow: "0 0 10px var(--cyan)",
              }} />
              <span style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "1.05rem",
                color: "var(--text)",
                letterSpacing: "-0.04em",
              }}>
                HumanShield
              </span>
            </Link>
            <p style={{
              color: "var(--text-2)",
              fontSize: "0.875rem",
              lineHeight: 1.75,
              maxWidth: 300,
              marginBottom: 24,
            }}>
              The high-fidelity standard for career protection in the AI era.
              Powered by frontier AI systems and verified global research.
            </p>

            {/* Newsletter form */}
            <form onSubmit={handleSubscribe} style={{ display: "flex", maxWidth: 300, gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
                style={{ flex: 1, fontSize: "0.82rem", height: 42, padding: "0 14px" }}
              />
              <button
                type="submit"
                disabled={subStatus === "loading"}
                style={{
                  background: subStatus === "success" ? "var(--emerald)" : "var(--text)",
                  color: "var(--bg)",
                  padding: "0 16px",
                  height: 42,
                  borderRadius: "var(--radius-lg)",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  border: "none",
                  flexShrink: 0,
                  transition: "all 250ms var(--ease-out)",
                  letterSpacing: "-0.01em",
                }}
              >
                {subStatus === "loading" ? "…" : subStatus === "success" ? "✓ Done" : "Subscribe"}
              </button>
            </form>
            {subStatus === "error" && (
              <p style={{ color: "var(--red)", fontSize: "0.75rem", marginTop: 8 }}>
                Failed. Please try again.
              </p>
            )}
          </div>

          {/* Platform links */}
          <div>
            <h4 className="label-xs" style={{ marginBottom: 20, color: "var(--text-3)" }}>Platform</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {footerLinks.platform.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    style={{
                      color: "var(--text-2)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "color 150ms",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="label-xs" style={{ marginBottom: 20, color: "var(--text-3)" }}>Legal</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {footerLinks.legal.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    style={{
                      color: "var(--text-2)",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      transition: "color 150ms",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <span style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>
            © {new Date().getFullYear()} HumanShield · All rights reserved
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="badge badge-cyan">
              <span style={{ width: 5, height: 5, background: "var(--cyan)", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 4px var(--cyan)" }} />
              Live · Q1 2026 Dataset
            </div>
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

  useEffect(() => { applyWhiteLabelCssVars(getWhiteLabelConfig()); }, []);

  useEffect(() => {
    if (user?.id) identify(user.id, { email: user.email });
  }, [user?.id]);

  useEffect(() => {
    const location = window.location.pathname;
    trackPage(location, { path: location });
  }, []);

  // Speculative prefetch of audit chunk after idle
  useEffect(() => {
    const prefetch = () => { import("./pages/AuditTerminalPage"); };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 3000);
    return () => clearTimeout(id);
  }, []);

  useCloudSync({ userId: user?.id, enabled: !!user, scoreEntries: getScoreHistory() });
  useBreakingNewsPoller();
  useEffect(() => {
    // Bug-2 fix: sync from Supabase FIRST, then reset open circuits.
    //
    // Previous order was wrong:
    //   resetAllOpenCircuits() → clears localStorage to CLOSED
    //   syncCircuitStateFromSupabase() → reads Supabase OPEN state → overwrites local CLOSED
    // Result: the reset had zero effect — Supabase's stale OPEN state won every time.
    //
    // Correct order:
    //   syncCircuitStateFromSupabase() → merges Supabase state into localStorage
    //   resetAllOpenCircuits() → NOW clears the merged state (including any stale OPENs)
    //
    // This is safe: any circuits that should be OPEN will re-open naturally after
    // 3 new consecutive failures. The EF auth is now fixed, and Yahoo Finance crumb
    // fetching is fixed — so the old spurious failures won't recur.
    syncCircuitStateFromSupabase()
      .catch(() => {})
      .finally(() => {
        resetAllOpenCircuits();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    setIsDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("light", !next);
      return next;
    });
  };

  const openAuth = () => setIsAuthOpen(true);

  return (
    <GlobalErrorBoundary>
    <div style={{ minHeight: "100vh", color: "var(--text)", position: "relative" }}>
      <LiquidAIBackground />
      <ScrollToTop />
      <NavigationBridge />

      <AppNav isDark={isDark} toggleTheme={toggleTheme} onAuthOpen={openAuth} />

      <main id="main-content" style={{ position: "relative", zIndex: 1 }}>
        <GlobalErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"                              element={<HomePage />} />
              <Route path="/calculator"                    element={<AuditTerminalPage />} />
              <Route path="/terminal"                      element={<ToolsPage />} />
              <Route path="/safe-careers"                  element={<SafeCareersPage />} />
              <Route path="/career/:id"                    element={<CareerDetailPage />} />
              <Route path="/learning-hub"                  element={<LearningHubPage />} />
              <Route path="/audit-log"                     element={<AuditLogPage />} />
              <Route path="/products"                      element={<ProductsPage />} />
              <Route path="/pricing"                       element={<PricingPage />} />
              <Route path="/about"                         element={<AboutPage />} />
              <Route path="/contact"                       element={<ContactPage />} />
              <Route path="/privacy"                       element={<PrivacyPage />} />
              <Route path="/terms"                         element={<TermsPage />} />
              <Route path="/blog"                          element={<BlogPage />} />
              <Route path="/settings"                      element={<SettingsPage />} />
              <Route path="/team"                          element={<TeamDashboardPage />} />
              <Route path="/leaderboard"                   element={<LeaderboardPage />} />
              <Route path="/predictions"                   element={<PredictionLedgerPage />} />
              <Route path="/intelligence"                  element={<CommunityIntelligencePage />} />
              <Route path="/intelligence/report"           element={<IntelligenceReportPage />} />
              <Route path="/intelligence/report/:yearMonth"element={<IntelligenceReportPage />} />
              <Route path="/certification"                 element={<CertificationPage />} />
              <Route path="*"                              element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </GlobalErrorBoundary>
      </main>

      <PWAInstallPrompt />
      <AppFooter />

      {/* Mobile bottom nav — hidden on ≥769px via CSS */}
      <MobileBottomNav isDark={isDark} toggleTheme={toggleTheme} onAuthOpen={openAuth} />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <SonnerToaster position="bottom-right" richColors closeButton />
    </div>
    </GlobalErrorBoundary>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      {/* v40.0 a11y FIX-9: skip-to-main-content link. Visible only on keyboard
          focus (via Tailwind sr-only + focus:not-sr-only). Keyboard users can
          jump straight to the main content area instead of tabbing through
          all the nav links. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:bg-cyan-500 focus:text-black focus:px-4 focus:py-2 focus:rounded focus:font-bold"
      >
        Skip to main content
      </a>
      <HumanProofProvider>
        <ProfileSetupModal />
        <LayoffProvider>
          <ToastProvider>
            {/* Listens to breaking_news_events INSERTs and toasts the user
                when a recently-audited company has a new layoff event. */}
            <RealtimeSignalToast />
            <AppContent />
          </ToastProvider>
        </LayoffProvider>
      </HumanProofProvider>
    </Router>
  );
}

export default App;
