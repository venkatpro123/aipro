import { useState, useEffect, useMemo, useRef } from "react";
import { dimensionLabels, Dimension } from "../data/quizQuestions";
import { useHumanProof } from "../context/HumanProofContext";
import { useAuth } from "../context/AuthContext";
import { useJournalSync, useJournalCloudStatus } from "../hooks/useJournalSync";
import JournalTimeline from "./JournalTimeline";

// IMPLEMENTATION-PLAN: Section 5.3 — Extended JournalEntry to snapshot all three scores at creation time
// + PHASE-0: Added timestamps, linked entities support, storage recovery, character limits, tag sanitization
// + PHASE-2: Added createdAt for precise timing, streak calculation
export interface JournalEntry {
  id: string;
  date: string;
  createdAt: string;
  dimension: Dimension;
  title: string;
  body: string;
  tags: string[];
  humanScore: number | null;
  jobRiskScore: number | null;
  skillRiskScore: number | null;
  assessmentDate: string | null;
  linkedCourseId?: string;
  linkedRoadmapItemId?: string;
}

const STORAGE_KEY = "hp_journal_entries";
const JOURNAL_MAX_ENTRIES = 500;
const JOURNAL_WARN_AT = 450;
const TITLE_MAX = 200;
const BODY_MAX = 10000;
const TAG_MAX = 30;

const sanitizeTags = (input: string): string[] => {
  return input
    .split(",")
    .map((t) => t.trim().replace(/[#,;]/g, ""))
    .filter(Boolean)
    .slice(0, 10);
};

const validateEntry = (e: any): e is JournalEntry =>
  !!(e?.id && e?.date && e?.dimension && e?.title && e?.body);

const migrateEntry = (e: any): JournalEntry => ({
  id: e.id,
  date: e.date || new Date().toISOString().split("T")[0],
  createdAt: e.createdAt || new Date().toISOString(),
  dimension: e.dimension || "empathic",
  title: e.title || "",
  body: e.body || "",
  tags: Array.isArray(e.tags) ? e.tags : [],
  humanScore: e.humanScore ?? null,
  jobRiskScore: e.jobRiskScore ?? null,
  skillRiskScore: e.skillRiskScore ?? null,
  assessmentDate: e.assessmentDate ?? null,
});

const loadEntries = (): JournalEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return parsed.filter(validateEntry).map(migrateEntry);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

const saveEntries = (
  entries: JournalEntry[],
): { success: boolean; pruned?: number } => {
  let toSave = entries;
  let pruned = 0;
  if (toSave.length > JOURNAL_MAX_ENTRIES) {
    toSave = toSave.slice(0, JOURNAL_MAX_ENTRIES - 50);
    pruned = entries.length - toSave.length;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return { success: true, pruned: pruned || undefined };
  } catch {
    if (toSave.length > 50) {
      toSave = toSave.slice(0, Math.floor(toSave.length * 0.7));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        return { success: true, pruned: entries.length - toSave.length };
      } catch {
        return { success: false };
      }
    }
    return { success: false };
  }
};

const exportJSON = (
  entries: JournalEntry[],
  dimensions: Record<string, number>,
) => {
  const data = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    userDimensions: dimensions,
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date,
      createdAt: e.createdAt,
      dimension: e.dimension,
      title: e.title,
      body: e.body,
      tags: e.tags,
      scores: {
        human: e.humanScore,
        jobRisk: e.jobRiskScore,
        skillRisk: e.skillRiskScore,
      },
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `human-edge-journal-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const calculateStreaks = (
  entries: JournalEntry[],
): { current: number; longest: number; lastEntryDate: string } => {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) return { current: 0, longest: 0, lastEntryDate: "" };
  let current = 0,
    longest = 0,
    temp = 1;
  const today = new Date().toISOString().split("T")[0];
  current =
    (new Date(today).getTime() - new Date(sorted[0].date).getTime()) /
      86400000 <=
    1
      ? 1
      : 0;
  for (let i = 1; i < sorted.length; i++) {
    if (
      (new Date(sorted[i - 1].date).getTime() -
        new Date(sorted[i].date).getTime()) /
        86400000 ===
      1
    )
      temp++;
    else {
      longest = Math.max(longest, temp);
      temp = 1;
    }
  }
  longest = Math.max(longest, temp);
  return { current, longest, lastEntryDate: sorted[0].date };
};

const dimColors: Record<Dimension, string> = {
  empathic: "var(--cyan)",
  moral: "var(--violet-light)",
  creative: "var(--emerald)",
  physical: "var(--orange)",
  social: "var(--yellow)",
  contextual: "var(--red)",
};

const DIMENSION_INSIGHTS: Record<Dimension, string> = {
  empathic:
    "your greatest competitive advantage is emotional intelligence — the ability to read and respond to human states that AI cannot model.",
  moral:
    "your documented edge is ethical judgment — the capacity to navigate complexity, value conflicts, and accountability in ways AI cannot replicate.",
  creative:
    "your edge is creative intuition — the ability to generate original ideas, make unexpected connections, and take imaginative leaps beyond data.",
  physical:
    "your edge is embodied presence — your physical impact, spatial awareness, and in-person authority create value AI has no equivalent for.",
  social:
    "your edge is social influence — your ability to build trust, persuade, and shift group dynamics is deeply human and fundamentally irreplaceable.",
  contextual:
    "your edge is contextual wisdom — the accumulated institutional knowledge, relationships, and situational judgment that took years to build.",
};

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
type FormState = {
  dimension: Dimension;
  title: string;
  body: string;
  tags: string;
};
const EMPTY_FORM: FormState = {
  dimension: "empathic",
  title: "",
  body: "",
  tags: "",
};

export default function HumanEdgeJournal({
  onNavigate,
}: {
  onNavigate?: (tab: string) => void;
}) {
  const { state } = useHumanProof();
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterDim, setFilterDim] = useState<Dimension | "all">("all");

  // Cloud Sync Integration
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    synced: number;
    lastSync: number;
  } | null>(null);
  const { isConfigured } = useJournalSync(entries, {
    userId: user?.id,
    onSyncComplete: (res) =>
      setSyncStatus({ ...res, lastSync: Date.now() }),
  });
  const { loadFromCloud } = useJournalCloudStatus();
  const [isHydrating, setIsHydrating] = useState(false);

  const [filterTag, setFilterTag] = useState("");
  const [searchText, setSearchText] = useState("");
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const streakData = useMemo(() => calculateStreaks(entries), [entries]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const isDirtyRef = useRef(false);
  const [isDirtyDisplay, setIsDirtyDisplay] = useState(false);

  useEffect(() => {
    const local = loadEntries();
    setEntries(local);

    // If local is empty and user is authed, try hydration from cloud
    if (local.length === 0 && user && isConfigured) {
      setIsHydrating(true);
      loadFromCloud()
        .then((cloudEntries) => {
          if (cloudEntries.length > 0) {
            setEntries(cloudEntries);
            saveEntries(cloudEntries);
          }
        })
        .finally(() => setIsHydrating(false));
    }
  }, [user, isConfigured]);
  useEffect(() => {
    if (
      entries.length >= JOURNAL_WARN_AT &&
      entries.length < JOURNAL_MAX_ENTRIES
    )
      setStorageWarning(`Approaching limit: ${entries.length}/500 entries`);
    else if (entries.length >= JOURNAL_MAX_ENTRIES)
      setStorageWarning(
        `Storage full: ${entries.length} entries (oldest pruned)`,
      );
    else setStorageWarning(null);
  }, [entries.length]);

  const existingTags = useMemo(
    () => [...new Set(entries.flatMap((e) => e.tags))].sort(),
    [entries],
  );
  const dimensionFrequency = useMemo(
    () =>
      entries.reduce(
        (acc, e) => {
          acc[e.dimension] = (acc[e.dimension] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [entries],
  );
  const topDimension = useMemo(
    () =>
      Object.entries(dimensionFrequency).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0] as Dimension | undefined,
    [dimensionFrequency],
  );
  const distinctDimensionsTagged = useMemo(
    () => Object.keys(dimensionFrequency).length,
    [dimensionFrequency],
  );

  const updateForm = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    isDirtyRef.current = true;
    setIsDirtyDisplay(true);
  };
  const handleBackdropClick = () => {
    if (isDirtyRef.current) {
      if (window.confirm("You have unsaved changes. Discard this entry?"))
        closeModal();
    } else closeModal();
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingEntryId(null);
    setForm(EMPTY_FORM);
    isDirtyRef.current = false;
    setIsDirtyDisplay(false);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const tags = sanitizeTags(form.tags);
    if (editingEntryId) {
      const updated = entries.map((e) =>
        e.id === editingEntryId
          ? {
              ...e,
              dimension: form.dimension,
              title: form.title.trim().slice(0, TITLE_MAX),
              body: form.body.trim().slice(0, BODY_MAX),
              tags,
            }
          : e,
      );
      const result = saveEntries(updated);
      setEntries(updated);
      if (result.pruned)
        setStorageWarning(
          `Storage full: ${updated.length} entries (oldest pruned)`,
        );
    } else {
      const newEntry: JournalEntry = {
        id: uuid(),
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        dimension: form.dimension,
        title: form.title.trim().slice(0, TITLE_MAX),
        body: form.body.trim().slice(0, BODY_MAX),
        tags,
        humanScore: state.humanScore,
        jobRiskScore: state.jobRiskScore,
        skillRiskScore: state.skillRiskScore,
        assessmentDate: state.lastUpdated,
      };
      const updated = [newEntry, ...entries];
      const result = saveEntries(updated);
      setEntries(updated);
      if (result.pruned)
        setStorageWarning(
          `Storage full: ${updated.length} entries (oldest pruned)`,
        );
    }
    closeModal();
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setForm({
      dimension: entry.dimension,
      title: entry.title,
      body: entry.body,
      tags: entry.tags.join(", "),
    });
    isDirtyRef.current = false;
    setIsDirtyDisplay(false);
    setShowModal(true);
  };
  const deleteEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  };
  const openNewEntry = () => {
    setEditingEntryId(null);
    setForm(EMPTY_FORM);
    isDirtyRef.current = false;
    setIsDirtyDisplay(false);
    setShowModal(true);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(0, 245, 255);
    doc.text("HumanProof — My Human Edge Report", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(144, 144, 170);
    doc.text(
      `Generated ${new Date().toLocaleDateString()}  ·  ${entries.length} moments logged`,
      20,
      30,
    );
    let y = 45;
    filtered.forEach((entry, i) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(13);
      doc.setTextColor(232, 232, 240);
      doc.text(`${i + 1}. ${entry.title}`, 20, y);
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(144, 144, 170);
      const scoreLine = [
        entry.date,
        dimensionLabels[entry.dimension],
        entry.humanScore ? `Human: ${entry.humanScore}` : "",
        entry.jobRiskScore ? `Job Risk: ${entry.jobRiskScore}` : "",
        entry.skillRiskScore ? `Skill Risk: ${entry.skillRiskScore}` : "",
      ]
        .filter(Boolean)
        .join("  ·  ");
      doc.text(scoreLine, 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 210);
      const lines = doc.splitTextToSize(entry.body, 170);
      lines.forEach((line: string) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 6;
      });
      if (entry.tags.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(`Tags: ${entry.tags.join(", ")}`, 20, y);
        y += 5;
      }
      y += 8;
      doc.setDrawColor(50, 50, 80);
      doc.line(20, y - 4, 190, y - 4);
    });
    doc.save("my-human-edge-report.pdf");
  };

  const filtered = entries.filter((e) => {
    const dimOk = filterDim === "all" || e.dimension === filterDim;
    const tagOk =
      !filterTag ||
      e.tags.some((t) => t.toLowerCase().includes(filterTag.toLowerCase()));
    const searchOk =
      !searchText ||
      e.title.toLowerCase().includes(searchText.toLowerCase()) ||
      e.body.toLowerCase().includes(searchText.toLowerCase());
    return dimOk && tagOk && searchOk;
  });

  return (
    <div style={{ padding: "40px 0", maxWidth: 900, margin: "0 auto" }}>
      <div
        className="reveal"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
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
                background: "var(--emerald)",
                borderRadius: 2,
              }}
            />
            <h2
              style={{
                fontFamily: "var(--mono)",
                fontSize: "1.5rem",
                color: "var(--emerald)",
              }}
            >
              Human Edge Journal
            </h2>
          </div>
          <p
            style={{
              color: "var(--text2)",
              fontSize: "0.9rem",
              marginLeft: 16,
            }}
          >
            You've logged{" "}
            <strong style={{ color: "var(--text)" }}>{entries.length}</strong>{" "}
            human-edge moment{entries.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {entries.length > 0 && (
            <>
              <button
                onClick={() => exportJSON(entries, state.humanDimensions)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border2)",
                  color: "var(--text2)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontFamily: "var(--mono)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Export JSON
              </button>
              <button
                onClick={exportPDF}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border2)",
                  color: "var(--text2)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontFamily: "var(--mono)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Export PDF
              </button>
            </>
          )}
          <button
            onClick={openNewEntry}
            style={{
              background: "var(--emerald)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            + New Entry
          </button>
        </div>
      </div>

      {/* Sync Status Bar */}
      {user && isConfigured && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 16,
            opacity: 0.6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: syncStatus?.success ? "var(--emerald)" : "var(--border)",
              boxShadow: syncStatus?.success
                ? "0 0 8px var(--emerald)"
                : "none",
            }}
          />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.65rem",
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {isHydrating
              ? "Downloading from cloud..."
              : syncStatus?.success
                ? `Cloud Synced (${syncStatus.synced} items)`
                : "Cloud Sync Enabled"}
          </span>
        </div>
      )}

      {storageWarning && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 8,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <span
            style={{
              color: "var(--yellow)",
              fontSize: "0.85rem",
              fontFamily: "var(--mono)",
            }}
          >
            {storageWarning}
          </span>
        </div>
      )}
      {streakData.current > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(0,245,255,0.06)",
            border: "1px solid rgba(0,245,255,0.2)",
            borderRadius: 8,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>🔥</span>
          <span
            style={{
              color: "var(--cyan)",
              fontSize: "0.8rem",
              fontFamily: "var(--mono)",
            }}
          >
            Current: {streakData.current} day
            {streakData.current !== 1 ? "s" : ""}
          </span>
          <span
            style={{
              color: "var(--text2)",
              fontSize: "0.8rem",
              fontFamily: "var(--mono)",
            }}
          >
            Longest: {streakData.longest}
          </span>
        </div>
      )}

      {entries.length >= 8 && distinctDimensionsTagged >= 3 && topDimension && (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(0,255,159,0.06)",
            border: "1px solid rgba(0,255,159,0.2)",
            borderRadius: 10,
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>🧠</span>
          <div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                color: "var(--emerald)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              Your Human Edge Pattern — {dimensionFrequency[topDimension]}{" "}
              entries in {dimensionLabels[topDimension]}
            </div>
            <div
              style={{
                color: "var(--text)",
                fontSize: "0.875rem",
                lineHeight: 1.6,
              }}
            >
              Your journal shows {entries.length} entries, most in{" "}
              <strong style={{ color: dimColors[topDimension] }}>
                {dimensionLabels[topDimension]}
              </strong>
              . This pattern suggests {DIMENSION_INSIGHTS[topDimension]}
            </div>
          </div>
        </div>
      )}

      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}
      >
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search entries…"
          style={{
            flex: 1,
            minWidth: 180,
            background: "var(--alpha-bg-04)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--text)",
            fontFamily: "var(--body)",
            fontSize: "0.85rem",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "8px 12px",
              background:
                viewMode === "list"
                  ? "rgba(0,245,255,0.1)"
                  : "var(--alpha-bg-04)",
              border: `1px solid ${viewMode === "list" ? "var(--cyan)" : "var(--border)"}`,
              borderRadius: "8px 0 0 8px",
              color: viewMode === "list" ? "var(--cyan)" : "var(--text2)",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            style={{
              padding: "8px 12px",
              background:
                viewMode === "timeline"
                  ? "rgba(0,245,255,0.1)"
                  : "var(--alpha-bg-04)",
              border: `1px solid ${viewMode === "timeline" ? "var(--cyan)" : "var(--border)"}`,
              borderRadius: "0 8px 8px 0",
              color: viewMode === "timeline" ? "var(--cyan)" : "var(--text2)",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Timeline
          </button>
        </div>
        <select
          value={filterDim}
          onChange={(e) => setFilterDim(e.target.value as Dimension | "all")}
          style={{
            background: "var(--alpha-bg-04)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--text)",
            fontFamily: "var(--body)",
            fontSize: "0.85rem",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="all">All Dimensions</option>
          {(Object.keys(dimensionLabels) as Dimension[]).map((d) => (
            <option key={d} value={d}>
              {dimensionLabels[d]}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          placeholder="Filter by tag…"
          style={{
            minWidth: 140,
            background: "var(--alpha-bg-04)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--text)",
            fontFamily: "var(--body)",
            fontSize: "0.85rem",
            outline: "none",
          }}
        />
      </div>

      {viewMode === "list" ? (
        filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "var(--alpha-bg-04)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✍️</div>
            <div
              style={{ color: "var(--text)", fontWeight: 500, marginBottom: 8 }}
            >
              {entries.length === 0
                ? "Start your human edge story"
                : "No matching entries"}
            </div>
            <div
              style={{
                color: "var(--text2)",
                fontSize: "0.875rem",
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              {entries.length === 0
                ? "Log moments where your human skills made a real difference — empathy, judgment, creativity, presence."
                : "Try different search terms or clear your filters."}
            </div>
            {entries.length === 0 && (
              <button
                onClick={openNewEntry}
                style={{
                  marginTop: 20,
                  background: "var(--emerald)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontFamily: "var(--mono)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                Log First Moment
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((entry) => {
              const dimColor = dimColors[entry.dimension];
              return (
                <div
                  key={entry.id}
                  style={{
                    background: "var(--alpha-bg-04)",
                    border: `1px solid ${dimColor}30`,
                    borderRadius: 12,
                    padding: "20px 24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "var(--text)",
                          fontWeight: 600,
                          fontSize: "1rem",
                          marginBottom: 6,
                        }}
                      >
                        {entry.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 10px",
                            borderRadius: 4,
                            background: `${dimColor}15`,
                            color: dimColor,
                            border: `1px solid ${dimColor}40`,
                          }}
                        >
                          {dimensionLabels[entry.dimension]}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text2)",
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {entry.date}
                        </span>
                        {entry.humanScore != null ? (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text2)",
                              fontFamily: "var(--mono)",
                            }}
                          >
                            Human: {entry.humanScore}
                          </span>
                        ) : (
                          <button
                            onClick={() => onNavigate?.("quiz")}
                            style={{
                              background: "none",
                              border: "1px solid rgba(0,245,255,0.3)",
                              color: "var(--cyan)",
                              borderRadius: 6,
                              padding: "2px 10px",
                              fontFamily: "var(--mono)",
                              fontSize: "0.65rem",
                              cursor: "pointer",
                              letterSpacing: "0.03em",
                            }}
                          >
                            Take the Human Index quiz →
                          </button>
                        )}
                        {entry.jobRiskScore != null && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "rgba(0,245,255,0.5)",
                              fontFamily: "var(--mono)",
                            }}
                          >
                            Job Risk: {entry.jobRiskScore}
                          </span>
                        )}
                        {entry.skillRiskScore != null && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "rgba(167,139,250,0.5)",
                              fontFamily: "var(--mono)",
                            }}
                          >
                            Skill Risk: {entry.skillRiskScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleEdit(entry)}
                        style={{
                          background: "none",
                          border: "1px solid var(--border)",
                          color: "var(--text2)",
                          cursor: "pointer",
                          fontSize: "0.7rem",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontFamily: "var(--mono)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                        title="Edit entry"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text2)",
                          cursor: "pointer",
                          fontSize: "1rem",
                          opacity: 0.5,
                          padding: "4px 8px",
                        }}
                        title="Delete entry"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <p
                    style={{
                      color: "var(--text2)",
                      fontSize: "0.875rem",
                      lineHeight: 1.7,
                      margin: "10px 0",
                    }}
                  >
                    {entry.body}
                  </p>
                  {entry.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 8,
                      }}
                    >
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "var(--alpha-bg-06)",
                            color: "var(--text2)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            )
          </div>
        )
      ) : null}

      {viewMode === "timeline" && filtered.length > 0 && (
        <JournalTimeline entries={filtered} onEntryClick={handleEdit} />
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleBackdropClick();
          }}
        >
          <div
            style={{
              background: "#0F0F2A",
              border: "1px solid var(--border2)",
              borderRadius: 16,
              padding: 32,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--mono)",
                  color: "var(--emerald)",
                  fontSize: "1rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {editingEntryId
                  ? "Edit Human Edge Moment"
                  : "New Human Edge Moment"}
              </h3>
              <button
                onClick={handleBackdropClick}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text2)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Dimension
                </label>
                <select
                  value={form.dimension}
                  onChange={(e) =>
                    updateForm({ dimension: e.target.value as Dimension })
                  }
                  style={{
                    width: "100%",
                    background: "var(--alpha-bg-06)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "var(--text)",
                    fontFamily: "var(--body)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                >
                  {(
                    Object.entries(dimensionLabels) as [Dimension, string][]
                  ).map(([d, label]) => (
                    <option key={d} value={d}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder="e.g. Resolved team conflict under pressure"
                  style={{
                    width: "100%",
                    background: "var(--alpha-bg-06)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "var(--text)",
                    fontFamily: "var(--body)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    fontSize: "0.65rem",
                    color:
                      form.title.length > TITLE_MAX
                        ? "var(--rose)"
                        : "var(--text2)",
                    fontFamily: "var(--mono)",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {form.title.length}/{TITLE_MAX}
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  What happened?
                </label>
                <textarea
                  value={form.body}
                  onChange={(e) => updateForm({ body: e.target.value })}
                  placeholder="Describe the moment where your human skills made a difference…"
                  rows={5}
                  style={{
                    width: "100%",
                    background: "var(--alpha-bg-06)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "var(--text)",
                    fontFamily: "var(--body)",
                    fontSize: "0.875rem",
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.6,
                  }}
                />
                <div
                  style={{
                    fontSize: "0.65rem",
                    color:
                      form.body.length > BODY_MAX
                        ? "var(--rose)"
                        : "var(--text2)",
                    fontFamily: "var(--mono)",
                    marginTop: 4,
                    textAlign: "right",
                  }}
                >
                  {form.body.length}/{BODY_MAX}
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Tags (comma separated)
                </label>
                <input
                  list="tag-suggestions"
                  type="text"
                  value={form.tags}
                  onChange={(e) => updateForm({ tags: e.target.value })}
                  placeholder="e.g. leadership, conflict resolution"
                  style={{
                    width: "100%",
                    background: "var(--alpha-bg-06)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    color: "var(--text)",
                    fontFamily: "var(--body)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                />
                <datalist id="tag-suggestions">
                  {existingTags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
              {isDirtyDisplay && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "rgba(251,191,36,0.7)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  ● Unsaved changes
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  onClick={handleBackdropClick}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--text2)",
                    borderRadius: 8,
                    padding: "11px",
                    fontFamily: "var(--mono)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    flex: 2,
                    background: "var(--emerald)",
                    color: "var(--bg)",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px",
                    fontFamily: "var(--mono)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {editingEntryId ? "Save Changes" : "Save Moment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
