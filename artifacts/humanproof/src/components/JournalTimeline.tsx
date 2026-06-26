// PHASE-3: Timeline View Component
// File: artifacts/humanproof/src/components/JournalTimeline.tsx
// Human Edge Journal - Calendar-style timeline

import { useMemo } from "react";
import type { JournalEntry } from "./HumanEdgeJournal";
import { dimensionLabels, Dimension } from "../data/quizQuestions";

interface JournalTimelineProps {
  entries: JournalEntry[];
  onEntryClick?: (entry: JournalEntry) => void;
}

const dimColors: Record<Dimension, string> = {
  empathic: "var(--cyan)",
  moral: "var(--violet-light)",
  creative: "var(--emerald)",
  physical: "var(--orange)",
  social: "var(--yellow)",
  contextual: "var(--red)",
};

export default function JournalTimeline({
  entries,
  onEntryClick,
}: JournalTimelineProps) {
  // Group entries by month
  const byMonth = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};

    entries.forEach((entry) => {
      const month = entry.date.substring(0, 7); // YYYY-MM
      if (!groups[month]) {
        groups[month] = [];
      }
      groups[month].push(entry);
    });

    // Sort months descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, monthEntries]) => ({
        month,
        label: formatMonthLabel(month),
        entries: monthEntries.sort((a, b) => a.date.localeCompare(b.date)),
      }));
  }, [entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontFamily: "var(--mono)",
          fontSize: "0.8rem",
          color: "var(--text2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 20,
        }}
      >
        Timeline View
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {byMonth.map(({ month, label, entries: monthEntries }) => (
          <div key={month}>
            {/* Month Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.75rem",
                  color: "var(--emerald)",
                  fontWeight: 600,
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: "var(--border)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.6875rem",
                  color: "var(--text2)",
                }}
              >
                {monthEntries.length}{" "}
                {monthEntries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            {/* Entries for month */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                paddingLeft: 12,
                borderLeft: "2px solid var(--border)",
              }}
            >
              {monthEntries.map((entry) => {
                const dimColor = dimColors[entry.dimension];
                return (
                  <div
                    key={entry.id}
                    onClick={() => onEntryClick?.(entry)}
                    style={{
                      padding: "12px 16px",
                      background: "var(--alpha-bg-04)",
                      border: `1px solid ${dimColor}20`,
                      borderRadius: 8,
                      cursor: onEntryClick ? "pointer" : "default",
                      transition: "background 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            color: "var(--text)",
                            marginBottom: 4,
                          }}
                        >
                          {entry.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text2)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 300,
                          }}
                        >
                          {entry.body.substring(0, 80)}...
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: `${dimColor}15`,
                            color: dimColor,
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {dimensionLabels[entry.dimension].split(" ")[0]}
                        </span>
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            color: "var(--text2)",
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {entry.date.split("-")[2]}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
}
