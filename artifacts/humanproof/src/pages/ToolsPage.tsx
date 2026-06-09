import { Suspense, lazy } from "react";
import { motion } from "framer-motion";

// Risk Oracle is a standalone 6-dimension AI displacement calculator.
// The Layoff Audit (LayoffCalculator) now routes directly to /os after completion
// and no longer has a report view — intelligence surfaces in the Career OS widgets.
const AuditTerminalPage = lazy(() => import('./AuditTerminalPage'));

export default function ToolsPage() {
  return (
    <div className="page-wrap" style={{ background: "var(--bg)" }}>
      <div className="container" style={{ maxWidth: 1280 }}>

        {/* Back to Career OS */}
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ minHeight: '60vh' }}
        >
          <Suspense fallback={null}>
            <AuditTerminalPage />
          </Suspense>
        </motion.div>

      </div>
    </div>
  );
}
