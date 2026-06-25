// RiskCalculatorsView.tsx
// Unified view for all risk calculators under "Risk Calculators" tab
// Contains Risk Oracle and Layoff Audit

import React, { useState, lazy, Suspense } from "react";
import AuditTerminalPage from "../pages/AuditTerminalPage";

// Lazy-load LayoffCalculator: it pulls in the entire swarm pipeline + all data
// files (~4.4 MB minified). Deferring until the user clicks "Layoff Audit"
// cuts initial parse time to near-zero for users who only use the Risk Oracle.
const LayoffCalculator = lazy(() =>
  import("./LayoffCalculator/LayoffCalculator").then((m) => ({ default: m.LayoffCalculator }))
);

function LayoffAuditFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(0,245,255,0.2)', borderTopColor: '#00F5FF', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--alpha-text-35)', fontSize: '13px', margin: 0 }}>Loading swarm intelligence…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

type CalculatorType = "risk-oracle" | "layoff-audit";

interface Props {
  onSwitchTab?: (tabId: string) => void;
}

export const RiskCalculatorsView: React.FC<Props> = ({ onSwitchTab }) => {
  const [activeCalculator, setActiveCalculator] =
    useState<CalculatorType>("risk-oracle");

  const calculators: {
    id: CalculatorType;
    label: string;
    icon: string;
    desc: string;
  }[] = [
    {
      id: "risk-oracle",
      label: "Risk Oracle",
      icon: "🎯",
      desc: "6-dimension AI displacement risk analysis across thousands of roles and global markets",
    },
    {
      id: "layoff-audit",
      label: "Layoff Audit",
      icon: "📉",
      desc: "Company-specific layoff risk assessment with 30-agent swarm intelligence",
    },
  ];

  return (
    <div>
      {/* Calculator Selector Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        {calculators.map((calc) => (
          <button
            key={calc.id}
            onClick={() => setActiveCalculator(calc.id)}
            style={{
              padding: "12px 20px",
              borderRadius: "8px",
              border: `1px solid ${activeCalculator === calc.id ? "var(--cyan, #00F5FF)" : "var(--alpha-text-25)"}`,
              background:
                activeCalculator === calc.id
                  ? "rgba(0,245,255,0.1)"
                  : "transparent",
              color:
                activeCalculator === calc.id
                  ? "var(--cyan, #00F5FF)"
                  : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.9rem",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
          >
            <span>{calc.icon}</span>
            <span>{calc.label}</span>
          </button>
        ))}
      </div>

      {/* Active Calculator Description */}
      <div
        style={{
          marginBottom: "24px",
          padding: "16px",
          background: "rgba(0,245,255,0.05)",
          border: "1px solid rgba(0,245,255,0.1)",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            {calculators.find((c) => c.id === activeCalculator)?.icon}
          </span>
          <span
            style={{
              color: "#00F5FF",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "0.5px",
            }}
          >
            {calculators.find((c) => c.id === activeCalculator)?.label} ACTIVE
          </span>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.85rem",
            margin: 0,
          }}
        >
          {calculators.find((c) => c.id === activeCalculator)?.desc}
        </p>
      </div>

      {/* Render Active Calculator */}
      {activeCalculator === "risk-oracle" && <AuditTerminalPage />}
      {activeCalculator === "layoff-audit" && (
        <Suspense fallback={<LayoffAuditFallback />}>
          <LayoffCalculator onSwitchTab={onSwitchTab} />
        </Suspense>
      )}
    </div>
  );
};

export default RiskCalculatorsView;
