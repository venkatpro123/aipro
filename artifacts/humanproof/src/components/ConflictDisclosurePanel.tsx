// ConflictDisclosurePanel.tsx
// Shows conflicting signals when data sources disagree, explaining impact on score.

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface ConflictingSignal {
  signalType: string;
  descriptions: string[];
  severity: "low" | "medium" | "high" | "critical";
  conflictingSources: Array<{
    source: string;
    value: number;
    timestamp: string;
  }>;
  recommendedResolution?: string;
}

interface Props {
  conflicts: ConflictingSignal[];
  overrides: string[];
  overallImpact: "score_increased" | "reduced_confidence" | "none";
}

const severityColor: Record<string, string> = {
  low:      "var(--cyan)",
  medium:   "var(--amber)",
  high:     "var(--orange)",
  critical: "var(--red)",
};

const impactMessage: Record<string, string> = {
  score_increased:    "Conflicts resolved by kill-switch overrides — score may be elevated.",
  reduced_confidence: "Conflicts reduced confidence interval. Score is accurate but less certain.",
  none:               "",
};

export const ConflictDisclosurePanel: React.FC<Props> = ({
  conflicts,
  overrides,
  overallImpact,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!conflicts.length) return null;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: "rgba(245,158,11,0.3)",
        background:  "rgba(245,158,11,0.05)",
      }}
    >
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--amber)" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--amber)" }}>
              {conflicts.length} Signal Conflict{conflicts.length !== 1 ? "s" : ""} Detected
            </div>
            {overallImpact !== "none" && (
              <div className="text-xs opacity-70 mt-0.5" style={{ color: "var(--amber)" }}>
                {impactMessage[overallImpact]}
              </div>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Detail rows */}
      {expanded && (
        <div className="border-t border-[var(--alpha-bg-10)] divide-y divide-[var(--alpha-bg-05)]">
          {conflicts.map((c, i) => {
            const color = severityColor[c.severity] ?? "var(--text-2)";
            return (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wide"
                    style={{
                      background: `${color}22`,
                      color,
                    }}
                  >
                    {c.severity}
                  </span>
                  <span className="text-sm font-semibold">{c.signalType}</span>
                </div>

                {/* Conflicting source values */}
                {c.conflictingSources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {c.conflictingSources.map((src, j) => (
                      <div
                        key={j}
                        className="text-xs px-2 py-1 rounded-lg border"
                        style={{
                          background: "var(--alpha-bg-04)",
                          borderColor: "var(--alpha-bg-08)",
                          color:        "var(--text-2)",
                        }}
                      >
                        <span className="font-semibold text-[var(--alpha-text-70)]">{src.source}</span>
                        {" · "}
                        <span>{src.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Descriptions */}
                {c.descriptions.map((d, j) => (
                  <p key={j} className="text-xs text-muted-foreground leading-relaxed">
                    {d}
                  </p>
                ))}

                {/* Resolution hint */}
                {c.recommendedResolution && (
                  <p className="text-xs italic" style={{ color }}>
                    Recommended: {c.recommendedResolution}
                  </p>
                )}
              </div>
            );
          })}

          {/* Applied overrides list */}
          {overrides.length > 0 && (
            <div className="p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Kill-Switch Overrides Applied
              </div>
              <div className="flex flex-wrap gap-2">
                {overrides.map((ov, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color:      "var(--red)",
                      border:     "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    {ov}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConflictDisclosurePanel;
