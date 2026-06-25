// CalendarHeatmap.tsx — v10.0 12-month temporal risk heatmap
// Renders a strip of 12 colored cells, one per month, with animated entry.
// Each cell color represents a risk amplifier value (1.0=neutral, >1.1=red, <0.92=green).

import React, { useState } from "react";
import { motion } from "framer-motion";

interface MonthEntry {
  month: string;      // "Jan 2025"
  amplifier: number;  // 0.7–1.35 range
  label?: string;     // optional tooltip label e.g. "Q1 budget reset"
  isCurrent?: boolean;
}

interface CalendarHeatmapProps {
  months: MonthEntry[];
  className?: string;
}

function amplifierToColor(amp: number, isCurrent: boolean): { bg: string; border: string; text: string } {
  if (isCurrent) return { bg: "rgba(0,212,224,0.18)", border: "rgba(0,212,224,0.6)", text: "#00d4e0" };
  if (amp >= 1.15) return { bg: "rgba(239,68,68,0.35)",  border: "rgba(239,68,68,0.55)",  text: "#ef4444" };
  if (amp >= 1.08) return { bg: "rgba(249,115,22,0.28)", border: "rgba(249,115,22,0.45)", text: "#f97316" };
  if (amp >= 1.04) return { bg: "rgba(245,158,11,0.25)", border: "rgba(245,158,11,0.40)", text: "#f59e0b" };
  if (amp <= 0.88) return { bg: "rgba(16,185,129,0.28)", border: "rgba(16,185,129,0.45)", text: "#10b981" };
  if (amp <= 0.95) return { bg: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.25)", text: "#6ee7b7" };
  return { bg: "var(--alpha-bg-06)", border: "var(--alpha-bg-08)", text: "var(--text-3)" };
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ months, className = "" }) => {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);

  return (
    <div className={`w-full ${className}`} style={{ userSelect: "none" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "4px",
          width: "100%",
        }}
      >
        {months.map((m, i) => {
          const { bg, border, text } = amplifierToColor(m.amplifier, !!m.isCurrent);
          // Guard: month must be a string (MonthlyRiskEntry.month is a number — use monthLabel instead)
          const monthStr = typeof m.month === 'string' ? m.month : String(m.month);
          const shortMonth = monthStr.split(" ")[0].substring(0, 3);
          const isHigh = m.amplifier >= 1.08;
          const isLow = m.amplifier <= 0.92;

          return (
            <motion.div
              key={`${i}-${monthStr}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "relative" }}
              onMouseEnter={e => {
                const rect = (e.target as HTMLElement).closest('[data-heatmap-cell]')?.getBoundingClientRect()
                  ?? (e.target as HTMLElement).getBoundingClientRect();
                // Clamp so tooltip never goes above viewport
                const safeY = Math.max(70, rect.top);
                setTooltip({ idx: i, x: rect.left, y: safeY });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                data-heatmap-cell="1"
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: "6px",
                  padding: "6px 3px",
                  textAlign: "center",
                  cursor: "default",
                  outline: m.isCurrent ? `2px solid rgba(0,212,224,0.5)` : "none",
                  outlineOffset: "1px",
                  transition: "opacity 0.15s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Pulse overlay for current month */}
                {m.isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,212,224,0.08)",
                      animation: "breathe 3s ease-in-out infinite",
                      borderRadius: "inherit",
                    }}
                  />
                )}
                {/* Month abbreviation */}
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: text,
                  marginBottom: "3px",
                  lineHeight: 1,
                }}>
                  {shortMonth}
                </div>
                {/* Amplifier value or icon */}
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  color: text,
                  lineHeight: 1,
                }}>
                  {isHigh ? "▲" : isLow ? "▼" : "—"}
                </div>
              </div>

              {/* Tooltip */}
              {tooltip?.idx === i && (
                <div
                  style={{
                    position: "fixed",
                    left: tooltip.x,
                    top: tooltip.y - 68,
                    zIndex: 9999,
                    background: "rgba(7,9,15,0.96)",
                    border: `1px solid ${border}`,
                    borderRadius: "8px",
                    padding: "6px 10px",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 800, color: text }}>
                    {monthStr}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-2)", marginTop: 2 }}>
                    ×{m.amplifier.toFixed(2)} risk amplifier
                  </div>
                  {m.label && (
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.6rem", color: "var(--text-3)", marginTop: 2 }}>
                      {m.label}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2" style={{ paddingInline: "2px" }}>
        <div className="flex items-center gap-2">
          {[
            { color: "#ef4444", label: "High risk" },
            { color: "#f59e0b", label: "Elevated" },
            { color: "var(--alpha-text-30)", label: "Neutral" },
            { color: "#10b981", label: "Safe window" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", color: "var(--text-3)", letterSpacing: "0.06em" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.52rem", color: "var(--text-3)" }}>
          ▲ current
        </div>
      </div>
    </div>
  );
};

export default CalendarHeatmap;
