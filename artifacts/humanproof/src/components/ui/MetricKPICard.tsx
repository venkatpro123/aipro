// MetricKPICard.tsx — v10.0 Premium KPI card
// Large metric + sparkline + trend badge + gradient top accent.
// Used in QuickStatsRow (OverviewTab) and CompanyProfileTab.

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { SparklineMini } from "./SparklineMini";

interface MetricKPICardProps {
  label: string;
  value: string | number;
  accentColor?: string;          // top border gradient color (default cyan)
  sparkData?: number[];          // 5-8 data points for sparkline
  trend?: "up" | "down" | "flat" | null;
  trendLabel?: string;           // e.g. "+8 pts/30d" or "vs industry"
  hint?: string;                 // tooltip on hover
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  delay?: number;                // stagger delay in ms
  compact?: boolean;             // smaller padding
  className?: string;
  onClick?: () => void;
}

export const MetricKPICard: React.FC<MetricKPICardProps> = ({
  label,
  value,
  accentColor = "var(--cyan)",
  sparkData,
  trend,
  trendLabel,
  hint,
  icon: Icon,
  delay = 0,
  compact = false,
  className = "",
  onClick,
}) => {
  const trendColor = trend === "up" ? "#ef4444"
    : trend === "down" ? "#10b981"
    : "var(--text-3)";

  const TrendIcon = trend === "up" ? TrendingUp
    : trend === "down" ? TrendingDown
    : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000, ease: [0.34, 1.56, 0.64, 1] }}
      className={`metric-card ${className}`}
      style={{ "--metric-accent": accentColor } as React.CSSProperties}
      title={hint}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span className="data-label" style={{ color: "var(--text-3)" }}>
          {label}
        </span>
        {Icon && (
          <Icon
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: accentColor, opacity: 0.7 }}
          />
        )}
      </div>

      {/* Value + sparkline row */}
      <div className="flex items-end justify-between gap-2">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: delay / 1000 + 0.1 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? "1.4rem" : "1.75rem",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: accentColor,
          }}
        >
          {value}
        </motion.div>
        {sparkData && sparkData.length >= 2 && (
          <SparklineMini
            data={sparkData}
            color={accentColor}
            filled
            delay={delay + 200}
          />
        )}
      </div>

      {/* Trend badge */}
      {(trend || trendLabel) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay / 1000 + 0.35 }}
          className="flex items-center gap-1 mt-2"
        >
          <TrendIcon
            className="w-3 h-3 flex-shrink-0"
            style={{ color: trendColor }}
          />
          {trendLabel && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.62rem",
                fontWeight: 700,
                color: trendColor,
                letterSpacing: "0.05em",
              }}
            >
              {trendLabel}
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default MetricKPICard;
