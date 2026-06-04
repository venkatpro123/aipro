import { Link } from "wouter";
import { Activity, Scan, AlertTriangle } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="site-header-logo-icon">
            <Activity className="h-4 w-4 text-cyan" />
          </span>
          <span className="site-header-logo-text">
            Human<span className="text-cyan">Proof</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#system" className="transition hover:text-foreground">Platform</a>
          <a href="#tracking" className="transition hover:text-foreground">Intelligence</a>
          <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
          <a href="#enterprise" className="transition hover:text-foreground">Enterprise</a>
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-2.5">
          <a href="#system" className="site-header-oracle-btn hidden sm:inline-flex">
            <Scan size={14} className="text-cyan" />
            Risk Oracle
          </a>
          <a href="#cta" className="site-header-audit-btn shimmer-sweep">
            <AlertTriangle size={13} />
            Layoff Audit
          </a>
        </div>
      </div>
    </header>
  );
}
