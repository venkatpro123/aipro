import NumberFlow, { type Format } from "@number-flow/react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  format?: Format;
  className?: string;
  prefix?: string;
  suffix?: string;
  /** Skip animation on the first render */
  respectMotionPreference?: boolean;
}

/**
 * Animated digit-rolling number display powered by @number-flow/react.
 * Use for scores, percentages, counters, and any live-updating metrics.
 *
 * Usage:
 *   <AnimatedNumber value={score} suffix="%" className="score-massive" />
 */
export function AnimatedNumber({
  value,
  format,
  className,
  prefix,
  suffix,
  respectMotionPreference = true,
}: AnimatedNumberProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-0.5", className)}>
      {prefix && (
        <span className="opacity-70 text-[0.6em] font-bold tracking-widest uppercase">
          {prefix}
        </span>
      )}
      <NumberFlow
        value={value}
        format={format}
        respectMotionPreference={respectMotionPreference}
        style={{ fontVariantNumeric: "tabular-nums" }}
      />
      {suffix && (
        <span className="opacity-70 text-[0.6em] font-bold tracking-widest uppercase ml-0.5">
          {suffix}
        </span>
      )}
    </span>
  );
}

/** Convenience: percentage display (0–100, rendered as "42%") */
export function AnimatedPercent({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      format={{ style: "percent", maximumFractionDigits: 0 }}
      className={className}
    />
  );
}

/** Convenience: compact currency (e.g. "$1.2M") */
export function AnimatedCurrency({
  value,
  currency = "USD",
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      format={{ style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }}
      className={className}
    />
  );
}

/** Score ring variant — massive animated number with optional glow color */
export function AnimatedScore({
  value,
  color,
  className,
}: {
  value: number;
  color?: "cyan" | "amber" | "red" | "green";
  className?: string;
}) {
  const colorClass = color
    ? ({
        cyan: "metric-value-cyan",
        amber: "metric-value-amber",
        red: "metric-value-red",
        green: "metric-value-green",
      }[color] ?? "")
    : "";

  return (
    <AnimatedNumber
      value={Math.round(value)}
      format={{ maximumFractionDigits: 0 }}
      className={cn("metric-value score-animated", colorClass, className)}
    />
  );
}
