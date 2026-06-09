import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLayoff } from "../context/LayoffContext";

// LayoffCalculator — the full audit form + swarm pipeline + reveal screen.
// After reveal completes, onAfterReveal navigates to /os (Career OS).
const LayoffCalculator = lazy(() =>
  import("../components/LayoffCalculator/LayoffCalculator").then((m) => ({
    default: m.LayoffCalculator,
  }))
);

export default function AuditPage() {
  const navigate = useNavigate();
  const { dispatch } = useLayoff();

  // Reset the LayoffContext state every time the user navigates to this page
  // so they always see the input form, not the previous audit result.
  // Also clear sessionStorage caches that would otherwise skip the form:
  //  - hp_last_score_session: the 10-min result cache that auto-restores state
  //  - hp_reveal_seen: suppresses the reveal screen on repeat audits
  useEffect(() => {
    dispatch({ type: "RESET" });
    try {
      sessionStorage.removeItem("hp_last_score_session");
      sessionStorage.removeItem("hp_reveal_seen");
    } catch { /* storage unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page-wrap" style={{ background: "var(--bg)" }}>
      <div className="container" style={{ maxWidth: 1280 }}>

        {/* Back to Career OS */}
        <div style={{ paddingTop: 16, paddingBottom: 4 }}>
          <button
            onClick={() => navigate("/os")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600,
              padding: "4px 0", transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cyan)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            ← Back to Career OS
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ minHeight: "60vh" }}
        >
          <Suspense fallback={null}>
            <LayoffCalculator
              onAfterReveal={() => navigate("/os", { replace: true })}
            />
          </Suspense>
        </motion.div>

      </div>
    </div>
  );
}
