import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  getScoreHistory,
  getScoreDrift,
  ScoreEntry,
  calculateEMA,
  classifyTrend,
  predictNextScore,
  detectAnomaly,
  exportHistoryJSON,
  exportHistoryCSV,
  getScoreGoal,
  setScoreGoal,
  calculateGoalProgress,
} from "../utils/scoreStorage";
import { KEY_REGISTRY } from "../data/riskData";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const DRIFT_THRESHOLD: Record<
  "job" | "skill" | "human-index" | string,
  number
> = {
  job: 4,
  skill: 6,
  "human-index": 8,
  default: 5,
};

// Section 6.1 — PlotScore inversion explanation banner component
export function PlotScoreInversionBanner() {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: "rgba(0,245,255,0.05)",
        border: "1px solid rgba(0,245,255,0.15)",
        borderRadius: 8,
        marginBottom: 16,
        fontSize: "0.78rem",
        color: "var(--text2)",
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: "var(--cyan)" }}>How to read this chart:</strong>{" "}
      The chart shows <em>AI resilience strength</em> — a higher score always
      means safer from displacement. Job Risk and Skill Risk scores are{" "}
      <strong style={{ color: "var(--text)" }}>inverted</strong> (plotScore =
      100 − riskScore) so all three source types share the same axis. The Human
      Index score is used directly (higher = more human). A rising line is
      always good.
    </div>
  );
}

export function ScoreDriftBanner({ onDismiss }: { onDismiss: () => void }) {
  const drift = getScoreDrift();
  const threshold = DRIFT_THRESHOLD["default"];
  if (!drift || Math.abs(drift.change) <= threshold) return null;

  const increased = drift.direction === "down"; // 'down' in plotScore = increased risk
  return (
    <div
      style={{
        background: increased ? "rgba(255,71,87,0.1)" : "rgba(0,255,159,0.1)",
        border: `1px solid ${increased ? "rgba(255,71,87,0.4)" : "rgba(0,255,159,0.4)"}`,
        borderRadius: 10,
        padding: "12px 20px",
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: "1.1rem" }}>{increased ? "⚠️" : "✅"}</span>
        <span style={{ color: "var(--text)", fontSize: "0.875rem" }}>
          Your AI resilience score{" "}
          {drift.direction === "up" ? "improved" : "declined"} by{" "}
          <strong
            style={{
              fontFamily: "var(--mono)",
              color: increased ? "var(--red)" : "var(--emerald)",
            }}
          >
            {Math.abs(drift.change)} points
          </strong>{" "}
          since {formatDate(drift.previousTimestamp)}.
          {increased && " Review the progress tab for next steps."}
        </span>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "var(--text2)",
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        ×
      </button>
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  job: "Job Risk",
  skill: "Skill Risk",
  "human-index": "Human Index",
};

const WHAT_CHANGED_TIPS: Record<string, { up: string; down: string }> = {
  job: {
    up: "Your job risk score improved — possible industry shift, governance changes, or a role with stronger social capital.",
    down: "Your job risk increased — AI tool maturity in your role area may have advanced since your last assessment.",
  },
  skill: {
    up: "Your skill risk dropped — upskilling into AI-resistant skills or a recalibration of your portfolio.",
    down: "Your skill exposure increased — AI now performs more tasks in your skill set. Prioritise D1-protected skills.",
  },
  "human-index": {
    up: "Your Human Index improved — stronger self-awareness of your empathic and contextual reasoning.",
    down: "Your Human Index declined — try reflecting more deeply in the quiz on experiential and moral reasoning.",
  },
};

export default function ScoreDriftTracker() {
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [showDataLossWarning, setShowDataLossWarning] = useState(false);
  const [showWhatChanged, setShowWhatChanged] = useState(false);

  useEffect(() => {
    const h = getScoreHistory();
    setHistory(h);

    // ARCH 2 FIX: One-time warning if score history is empty but other HP data exists
    // (signals history was cleared, not a first-time user)
    if (h.length === 0) {
      const hasOtherData = Boolean(
        localStorage.getItem(KEY_REGISTRY.JOURNAL_ENTRIES) ||
        localStorage.getItem(KEY_REGISTRY.ROADMAP_START) ||
        localStorage.getItem(KEY_REGISTRY.VISITED),
      );
      const hasWarned = Boolean(
        localStorage.getItem(KEY_REGISTRY.HISTORY_WARNED),
      );
      if (hasOtherData && !hasWarned) {
        setShowDataLossWarning(true);
        localStorage.setItem(KEY_REGISTRY.HISTORY_WARNED, "1");
      }
    }
  }, []);

  const drift = getScoreDrift();

  // UX FIX 4: Compute what changed from last two history entries
  const lastTwo = history.slice(-2);
  const prevEntry = lastTwo[0];
  const currEntry = lastTwo[1];
  const whatChangedSource = currEntry?.source ?? "job";
  const whatChangedTips =
    WHAT_CHANGED_TIPS[whatChangedSource] || WHAT_CHANGED_TIPS.job;
  const whatChangedTip = drift
    ? drift.direction === "up"
      ? whatChangedTips.up
      : whatChangedTips.down
    : "";

  const chartData = history.map((entry, i) => ({
    date: formatDate(entry.timestamp),
    plotScore: entry.plotScore,
    source: entry.source,
    index: i,
  }));

  const jobHistory = history.filter((h) => h.source === "job");
  const skillHistory = history.filter((h) => h.source === "skill");
  const humanHistory = history.filter((h) => h.source === "human-index");

  const roadmapRaw = localStorage.getItem("hp_roadmap_start");
  const roadmapStartTs = roadmapRaw
    ? (() => {
        try {
          const parsed = JSON.parse(roadmapRaw);
          return parsed.startDate ? new Date(parsed.startDate).getTime() : null;
        } catch {
          return null;
        }
      })()
    : null;
  const roadmapStartLabel = roadmapStartTs ? formatDate(roadmapStartTs) : null;

  const sourceCounts: Record<string, number> = {
    job: jobHistory.length,
    skill: skillHistory.length,
    "human-index": humanHistory.length,
  };

  const hasSinglePoint = history.length === 1;

  // Section 8.2 — 90-day staleness check
  const latestEntry = history.length > 0 ? history[history.length - 1] : null;
  const daysSinceLastScore = latestEntry
    ? Math.floor((Date.now() - latestEntry.timestamp) / (1000 * 60 * 60 * 24))
    : null;
  const isStale = daysSinceLastScore !== null && daysSinceLastScore > 90;

  return (
    <div style={{ padding: "40px 0", maxWidth: 900, margin: "0 auto" }}>
      <div className="reveal" style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 4,
              height: 32,
              background: "var(--cyan)",
              borderRadius: 2,
            }}
          />
          <h2
            style={{
              fontFamily: "var(--mono)",
              fontSize: "1.5rem",
              color: "var(--cyan)",
            }}
          >
            Score Drift Tracker
          </h2>
        </div>
        <p
          style={{ color: "var(--text2)", fontSize: "0.9rem", marginLeft: 16 }}
        >
          Track your human-proof strength over time. Higher = safer from
          displacement.
        </p>
      </div>

      {/* PHASE-1: Export buttons */}
      {history.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={exportHistoryJSON}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text2)",
              borderRadius: 6,
              padding: "6px 12px",
              fontFamily: "var(--mono)",
              fontSize: "0.7rem",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Export JSON
          </button>
          <button
            onClick={exportHistoryCSV}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text2)",
              borderRadius: 6,
              padding: "6px 12px",
              fontFamily: "var(--mono)",
              fontSize: "0.7rem",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Export CSV
          </button>
        </div>
      )}

      {/* ARCH 2 FIX: One-time warning if score history appears to have been cleared */}
      {showDataLossWarning && (
        <div
          style={{
            padding: "12px 18px",
            background: "rgba(255,71,87,0.08)",
            border: "1px solid rgba(255,71,87,0.3)",
            borderRadius: 10,
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: "var(--red)",
                fontSize: "0.875rem",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Score history may have been cleared
            </div>
            <div
              style={{
                color: "var(--text2)",
                fontSize: "0.8rem",
                lineHeight: 1.6,
              }}
            >
              It looks like your score history is empty, but other HumanProof
              data exists. This typically happens when browser storage is
              cleared. Complete any calculator to start rebuilding your history.
            </div>
          </div>
          <button
            onClick={() => setShowDataLossWarning(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text2)",
              cursor: "pointer",
              fontSize: "1.1rem",
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Section 8.2 — 90-day staleness warning */}
      {isStale && (
        <div
          style={{
            padding: "12px 18px",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 10,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "1rem" }}>⏰</span>
          <div style={{ color: "#FCD34D", fontSize: "0.875rem", flex: 1 }}>
            Your last assessment was{" "}
            <strong>{daysSinceLastScore} days ago</strong>. AI capabilities have
            likely shifted — retake your assessments for an accurate 2026
            picture.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href="#job-risk"
              style={{
                background: "none",
                border: "1px solid rgba(251,191,36,0.5)",
                color: "#FCD34D",
                borderRadius: 6,
                padding: "4px 12px",
                fontFamily: "var(--mono)",
                fontSize: "0.72rem",
                cursor: "pointer",
                textDecoration: "none",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Retake Job Risk →
            </a>
          </div>
        </div>
      )}

      {drift && (
        <div
          style={{
            background:
              Math.abs(drift.change) > DRIFT_THRESHOLD.default
                ? "rgba(255,71,87,0.06)"
                : "rgba(255,255,255,0.03)",
            border: `1px solid ${Math.abs(drift.change) > DRIFT_THRESHOLD.default ? "rgba(255,71,87,0.3)" : "var(--border)"}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.7rem",
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Latest Change · {SOURCE_LABELS[whatChangedSource] || "Assessment"}
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color:
                    drift.direction === "up" ? "var(--emerald)" : "var(--red)",
                }}
              >
                {drift.direction === "up" ? "+" : "-"}
                {drift.change}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                points {drift.direction === "up" ? "improved" : "declined"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "1.2rem",
                  color: "var(--text)",
                }}
              >
                {drift.previous} → {drift.latest}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                previous → current (raw score)
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", color: "var(--text)" }}>
                Since {formatDate(drift.previousTimestamp)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>
                {prevEntry && currEntry
                  ? `${formatDate(prevEntry.timestamp)} → ${formatDate(currEntry.timestamp)}`
                  : "last recorded score"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UX FIX 4: "What changed?" collapsible explainer panel */}
      {drift && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowWhatChanged((p) => !p)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text2)",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontFamily: "var(--mono)",
              padding: "6px 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            aria-expanded={showWhatChanged}
          >
            <span
              style={{
                fontSize: "0.65rem",
                transform: showWhatChanged ? "rotate(90deg)" : "none",
                transition: "transform 0.2s",
                display: "inline-block",
              }}
            >
              ▶
            </span>
            What changed?
          </button>
          {showWhatChanged && (
            <div
              style={{
                marginTop: 6,
                padding: "12px 16px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: "0.82rem",
                color: "var(--text2)",
                lineHeight: 1.7,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text)" }}>Source:</strong>{" "}
                {SOURCE_LABELS[whatChangedSource] || "Assessment"} score{" "}
                {drift.direction === "up" ? "improved" : "declined"} by{" "}
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    color:
                      drift.direction === "up"
                        ? "var(--emerald)"
                        : "var(--red)",
                  }}
                >
                  {drift.change} points
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text)" }}>Likely reason:</strong>{" "}
                {whatChangedTip}
              </div>
              <div
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text2)",
                  borderTop: "1px solid var(--alpha-bg-06)",
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                Note: HumanProof stores score totals, not dimension breakdowns.
                To see exactly what shifted, retake the corresponding assessment
                and compare your D1–D6 dimension bars.
              </div>
            </div>
          )}
        </div>
      )}

      {history.length >= 2 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                color: "var(--text2)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Human-Proof Strength Over Time
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text2)" }}>
              Higher = safer
            </div>
          </div>
          {/* Section 6.1 — PlotScore inversion explanation */}
          <PlotScoreInversionBanner />
          <ResponsiveContainer
            width="100%"
            height={240}
            aria-label="Line chart showing your human-proof strength over time"
          >
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--text2)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "var(--text2)", fontSize: 11 }}
                axisLine={{ stroke: "var(--border)" }}
                label={{
                  value: "AI resilience (higher = safer)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "var(--text2)", fontSize: 9 },
                  dx: 16,
                  dy: 80,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "#111128",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                }}
                formatter={(val: any) => [
                  `${val} (strength)`,
                  "Human-proof strength",
                ]}
              />
              {roadmapStartLabel && (
                <ReferenceLine
                  x={roadmapStartLabel}
                  stroke="rgba(251,191,36,0.6)"
                  strokeDasharray="4 4"
                  label={{
                    value: "📅 Roadmap start",
                    fill: "rgba(251,191,36,0.7)",
                    fontSize: 9,
                    position: "insideTopRight",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="plotScore"
                name="Human-proof strength"
                stroke="var(--cyan)"
                strokeWidth={2}
                dot={{ fill: "var(--cyan)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : hasSinglePoint ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 32,
            marginBottom: 24,
          }}
        >
          <PlotScoreInversionBanner />
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                color: "var(--text2)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              First Score Recorded
            </div>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(0,245,255,0.1)",
                border: "3px solid var(--cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontFamily: "var(--mono)",
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "var(--cyan)",
              }}
            >
              {history[0].plotScore}
            </div>
            <div
              style={{ color: "var(--text)", fontWeight: 500, marginBottom: 6 }}
            >
              Strength score · {formatDate(history[0].timestamp)}
            </div>
            <div
              style={{
                color: "var(--text2)",
                fontSize: "0.8rem",
                lineHeight: 1.6,
              }}
            >
              Complete another assessment to unlock your trend chart.
              <br />A second data point reveals whether your AI resilience is
              improving.
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 40,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>📊</div>
          <div
            style={{ color: "var(--text)", fontWeight: 500, marginBottom: 8 }}
          >
            No score history yet
          </div>
          <div style={{ color: "var(--text2)", fontSize: "0.875rem" }}>
            Complete a calculator to start tracking your human-proof strength
            over time.
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Job Safety",
            data: jobHistory,
            color: "var(--cyan)",
            source: "job" as const,
          },
          {
            label: "Skill Safety",
            data: skillHistory,
            color: "var(--violet-light)",
            source: "skill" as const,
          },
          {
            label: "Human Index",
            data: humanHistory,
            color: "var(--emerald)",
            source: "human-index" as const,
          },
        ].map(({ label, data, color, source }) => {
          const lastPlotScore =
            data.length > 0 ? data[data.length - 1].plotScore : null;
          const isLowConf = sourceCounts[source] < 3;
          return (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.65rem",
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                {label}
              </div>
              {lastPlotScore !== null ? (
                <>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "2rem",
                      fontWeight: 700,
                      color,
                    }}
                  >
                    {lastPlotScore}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text2)",
                      marginTop: 4,
                    }}
                  >
                    strength · {data.length} record
                    {data.length !== 1 ? "s" : ""}
                  </div>
                  {isLowConf && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: "0.7rem",
                        color: "#FCD34D",
                      }}
                    >
                      ⚠ Low confidence — complete more assessments
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    color: "var(--text2)",
                    fontSize: "0.8rem",
                    marginTop: 8,
                  }}
                >
                  —
                </div>
              )}
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: "14px 18px",
            background: "rgba(0,245,255,0.05)",
            border: "1px solid rgba(0,245,255,0.15)",
            borderRadius: 10,
            fontSize: "0.8rem",
            color: "var(--text2)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--cyan)" }}>Why scores drift:</strong> AI
          capability in specific sectors accelerates at different rates. Tool
          improvements in legal, finance, and creative AI are driving score
          increases in 2026. Upskilling into higher-judgment roles reliably
          reduces risk over time.
        </div>
      )}
    </div>
  );
}
