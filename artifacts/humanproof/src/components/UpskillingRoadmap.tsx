import { useState, useEffect, useCallback } from "react";
import { useHumanProof } from "../context/HumanProofContext";
import { useAuth } from "../context/AuthContext";
import { getRiskLabel, parseDurationToHours } from "../utils/riskCalculations";
import { roadmapAPI } from "../utils/apiClient";
import {
  getCoursesForSkill,
  getJobRoleRoadmap,
  getDifficultyDots,
  Course,
  RoadmapPhase,
} from "../data/courseDatabase";

type Intent = "protect" | "pivot" | null;

// Section 4.4 — Roadmap progress tracking
const ROADMAP_PROGRESS_KEY = "hp_roadmap_progress";

interface RoadmapProgress {
  completedCourses: string[]; // course title strings
  completedMilestones: string[];
}

function loadProgress(): RoadmapProgress {
  try {
    const raw = localStorage.getItem(ROADMAP_PROGRESS_KEY);
    return raw
      ? JSON.parse(raw)
      : { completedCourses: [], completedMilestones: [] };
  } catch {
    return { completedCourses: [], completedMilestones: [] };
  }
}

function saveProgress(p: RoadmapProgress) {
  localStorage.setItem(ROADMAP_PROGRESS_KEY, JSON.stringify(p));
}

// Section 4.3 — Industry-specific fallback skill sets
// When no skills are in the user's portfolio, use industry-specific examples
const INDUSTRY_FALLBACK_SKILLS: Record<
  string,
  Array<{
    id: number;
    name: string;
    category: string;
    riskScore: number;
    trend: "rising" | "stable" | "declining";
  }>
> = {
  Finance: [
    {
      id: 2001,
      name: "Financial reporting",
      category: "Technical",
      riskScore: 87,
      trend: "rising",
    },
    {
      id: 2002,
      name: "Bookkeeping",
      category: "Technical",
      riskScore: 94,
      trend: "rising",
    },
    {
      id: 2003,
      name: "Financial modelling",
      category: "Analytical",
      riskScore: 68,
      trend: "rising",
    },
  ],
  Accounting: [
    {
      id: 2010,
      name: "Payroll processing",
      category: "Technical",
      riskScore: 94,
      trend: "rising",
    },
    {
      id: 2011,
      name: "Tax preparation",
      category: "Technical",
      riskScore: 91,
      trend: "rising",
    },
    {
      id: 2012,
      name: "Invoice processing",
      category: "Technical",
      riskScore: 94,
      trend: "rising",
    },
  ],
  Legal: [
    {
      id: 2020,
      name: "Legal research",
      category: "Technical",
      riskScore: 92,
      trend: "rising",
    },
    {
      id: 2021,
      name: "Contract drafting",
      category: "Technical",
      riskScore: 87,
      trend: "rising",
    },
    {
      id: 2022,
      name: "Compliance documentation",
      category: "Technical",
      riskScore: 76,
      trend: "rising",
    },
  ],
  Technology: [
    {
      id: 2030,
      name: "Code generation",
      category: "Technical",
      riskScore: 93,
      trend: "rising",
    },
    {
      id: 2031,
      name: "Manual QA testing",
      category: "Technical",
      riskScore: 91,
      trend: "rising",
    },
    {
      id: 2032,
      name: "SQL querying",
      category: "Technical",
      riskScore: 71,
      trend: "rising",
    },
  ],
  Marketing: [
    {
      id: 2040,
      name: "SEO content creation",
      category: "Technical",
      riskScore: 88,
      trend: "rising",
    },
    {
      id: 2041,
      name: "Social media content",
      category: "Technical",
      riskScore: 88,
      trend: "rising",
    },
    {
      id: 2042,
      name: "Email campaign creation",
      category: "Technical",
      riskScore: 90,
      trend: "rising",
    },
  ],
  Healthcare: [
    {
      id: 2050,
      name: "Clinical documentation",
      category: "Technical",
      riskScore: 72,
      trend: "rising",
    },
    {
      id: 2051,
      name: "Medical coding",
      category: "Technical",
      riskScore: 95,
      trend: "rising",
    },
    {
      id: 2052,
      name: "Patient scheduling",
      category: "Technical",
      riskScore: 87,
      trend: "rising",
    },
  ],
  Education: [
    {
      id: 2060,
      name: "Lesson plan writing",
      category: "Technical",
      riskScore: 71,
      trend: "rising",
    },
    {
      id: 2061,
      name: "Report writing",
      category: "Technical",
      riskScore: 87,
      trend: "rising",
    },
    {
      id: 2062,
      name: "Assessment design",
      category: "Analytical",
      riskScore: 54,
      trend: "stable",
    },
  ],
  Analytics: [
    {
      id: 2070,
      name: "Data cleaning",
      category: "Technical",
      riskScore: 88,
      trend: "rising",
    },
    {
      id: 2071,
      name: "Dashboard creation",
      category: "Technical",
      riskScore: 74,
      trend: "rising",
    },
    {
      id: 2072,
      name: "Report generation",
      category: "Technical",
      riskScore: 87,
      trend: "rising",
    },
  ],
  Creative: [
    {
      id: 2080,
      name: "Image creation",
      category: "Creative",
      riskScore: 95,
      trend: "rising",
    },
    {
      id: 2081,
      name: "Copywriting (ads)",
      category: "Creative",
      riskScore: 88,
      trend: "rising",
    },
    {
      id: 2082,
      name: "Social media graphics",
      category: "Creative",
      riskScore: 85,
      trend: "rising",
    },
  ],
  "People Ops": [
    {
      id: 2090,
      name: "CV/resume screening",
      category: "Technical",
      riskScore: 95,
      trend: "rising",
    },
    {
      id: 2091,
      name: "Offer letter drafting",
      category: "Technical",
      riskScore: 84,
      trend: "rising",
    },
    {
      id: 2092,
      name: "Interview scheduling",
      category: "Technical",
      riskScore: 91,
      trend: "rising",
    },
  ],
  // Generic default
  default: [
    {
      id: 1001,
      name: "Data entry",
      category: "Technical",
      riskScore: 97,
      trend: "rising",
    },
    {
      id: 1002,
      name: "Report writing",
      category: "Technical",
      riskScore: 87,
      trend: "rising",
    },
    {
      id: 1003,
      name: "Market research",
      category: "Analytical",
      riskScore: 89,
      trend: "rising",
    },
  ],
};

// ── Learning Hub resource strip ──────────────────────────────
interface HubResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  language: string;
  languageLabel: string;
  isFree: string;
  level: string;
  durationHours: number | null;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  zh: "🇨🇳",
  hi: "🇮🇳",
  pt: "🇧🇷",
  ar: "🇸🇦",
};
const LEVEL_COLORS: Record<string, string> = {
  beginner: "#00FF9F",
  intermediate: "#fbbf24",
  advanced: "#ff7043",
};

function LiveResourcesStrip({
  roleKey,
  riskScore,
}: {
  roleKey: string;
  riskScore: number;
}) {
  const [resources, setResources] = useState<HubResource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!roleKey) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    setLoading(true);
    const riskLevel =
      riskScore >= 80 ? "critical" : riskScore >= 65 ? "high" : "moderate";
    fetch(
      `/api/resources?roleKey=${encodeURIComponent(roleKey)}&riskLevel=${riskLevel}&limit=3`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((d) => setResources(d.data ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("LiveResourcesStrip fetch failed:", err);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [roleKey, riskScore]);

  if (loading)
    return (
      <div
        style={{
          padding: "10px 0",
          fontSize: "0.75rem",
          color: "var(--text3)",
        }}
      >
        Loading free resources…
      </div>
    );
  if (resources.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "0.65rem",
          color: "var(--cyan)",
          letterSpacing: "0.06em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        🌐 Free from Learning Hub
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {resources.map((r) => (
          <a
            key={r.id}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <div
              style={{
                background: "rgba(0,245,255,0.04)",
                border: "1px solid rgba(0,245,255,0.12)",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--cyan)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "rgba(0,245,255,0.12)")
              }
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "var(--text1)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    marginBottom: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: "0.72rem",
                    color: "var(--text3)",
                  }}
                >
                  <span>{r.provider}</span>
                  <span
                    style={{ color: LEVEL_COLORS[r.level] || "var(--text3)" }}
                  >
                    {r.level}
                  </span>
                  {r.durationHours && <span>⏱ {r.durationHours}h</span>}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "1rem" }}>
                  {LANGUAGE_FLAGS[r.language] ?? "🌐"}
                </span>
                <span
                  style={{
                    background: "rgba(0,255,159,0.12)",
                    color: "#00FF9F",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 12,
                  }}
                >
                  FREE
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function UpskillingRoadmap({
  onNavigate,
}: {
  onNavigate?: (tab: string) => void;
}) {
  const { state } = useHumanProof();
  const { user } = useAuth();
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [intentMap, setIntentMap] = useState<Record<string, Intent>>({});
  const [progressSynced, setProgressSynced] = useState(false);
  const [progress, setProgress] = useState<RoadmapProgress>(loadProgress());

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!user || progressSynced) return;

    const jobIdValue = state.jobId || state.jobTitle;
    if (!jobIdValue) return;

    const roleKey = jobIdValue.toString().toLowerCase().trim();
    if (!roleKey) return;

    roadmapAPI
      .syncFromCloud(roleKey)
      .then((cloudData) => {
        if (cloudData) {
          setProgress({
            completedCourses: cloudData.completed_courses || [],
            completedMilestones: cloudData.completed_milestones || [],
          });
          saveProgress({
            completedCourses: cloudData.completed_courses || [],
            completedMilestones: cloudData.completed_milestones || [],
          });
        }
        setProgressSynced(true);
      })
      .catch(() => {
        setProgressSynced(true);
      });
  }, [user, state.jobId, state.jobTitle]);

  const setIntent = (skillName: string, intent: Intent) =>
    setIntentMap((prev) => ({ ...prev, [skillName]: intent }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const syncToCloud = useCallback(async () => {
    if (!user) return;
    const jobIdValue = state.jobId || state.jobTitle;
    if (!jobIdValue) return;
    const roleKey = jobIdValue.toString().toLowerCase().trim();
    if (!roleKey) return;

    await roadmapAPI.updateProgress(roleKey, {
      completed_courses: progress.completedCourses,
      completed_milestones: progress.completedMilestones,
    });
  }, [user, state.jobId, state.jobTitle, progress]);

  // Section 4.4 — Toggle course completion
  const toggleCourse = (courseTitle: string) => {
    const updated = progress.completedCourses.includes(courseTitle)
      ? {
          ...progress,
          completedCourses: progress.completedCourses.filter(
            (c) => c !== courseTitle,
          ),
        }
      : {
          ...progress,
          completedCourses: [...progress.completedCourses, courseTitle],
        };
    setProgress(updated);
    saveProgress(updated);
    syncToCloud();
    if (!progress.completedCourses.includes(courseTitle)) {
      showToast(`✓ "${courseTitle}" marked as complete!`);
    }
  };

  const toggleMilestone = (milestone: string) => {
    const updated = progress.completedMilestones.includes(milestone)
      ? {
          ...progress,
          completedMilestones: progress.completedMilestones.filter(
            (m) => m !== milestone,
          ),
        }
      : {
          ...progress,
          completedMilestones: [...progress.completedMilestones, milestone],
        };
    setProgress(updated);
    saveProgress(updated);
    syncToCloud();
  };

  const topRiskySkills = [...state.skillBreakdown]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  // Section 4.3 — Use industry-specific fallback
  const industryFallback = state.industry
    ? INDUSTRY_FALLBACK_SKILLS[state.industry] ||
      INDUSTRY_FALLBACK_SKILLS["default"]
    : INDUSTRY_FALLBACK_SKILLS["default"];

  const isUsingFallback = topRiskySkills.length === 0;
  const skillsToShow = isUsingFallback ? industryFallback : topRiskySkills;

  const totalHours = skillsToShow.reduce((sum, s) => {
    const courses = getCoursesForSkill(s.name);
    return (
      sum +
      courses.reduce((acc, c) => acc + parseDurationToHours(c.duration), 0)
    );
  }, 0);

  const jobIdValue = state.jobId || state.jobTitle;
  const validatedJobId =
    jobIdValue && typeof jobIdValue === "string" && jobIdValue.trim().length > 0
      ? jobIdValue
      : null;
  const jobRoleRoadmap = validatedJobId
    ? getJobRoleRoadmap(validatedJobId)
    : null;
  const currentRoadmap: RoadmapPhase[] | null = jobRoleRoadmap;
  const score = state.skillRiskScore ?? state.jobRiskScore;

  // Section 4.4 — Completion stats for role-specific roadmap
  const totalRoadmapCourses =
    currentRoadmap?.reduce((t, p) => t + p.courses.length, 0) || 0;
  const totalRoadmapMilestones =
    currentRoadmap?.reduce((t, p) => t + p.milestones.length, 0) || 0;
  const completedCourseCount = totalRoadmapCourses
    ? currentRoadmap!.reduce(
        (t, p) =>
          t +
          p.courses.filter((c) => progress.completedCourses.includes(c.title))
            .length,
        0,
      )
    : 0;
  const completedMilestoneCount = totalRoadmapMilestones
    ? currentRoadmap!.reduce(
        (t, p) =>
          t +
          p.milestones.filter((m) => progress.completedMilestones.includes(m))
            .length,
        0,
      )
    : 0;
  const completionPct = totalRoadmapCourses
    ? Math.round(
        ((completedCourseCount + completedMilestoneCount) /
          (totalRoadmapCourses + totalRoadmapMilestones)) *
          100,
      )
    : 0;

  const handleStartWeek1 = () => {
    const startDate = new Date();
    const weekGoals = currentRoadmap
      ? currentRoadmap[0].milestones
      : skillsToShow.slice(0, 1).map((s) => `Start upskilling in ${s.name}`);
    localStorage.setItem(
      "hp_roadmap_start",
      JSON.stringify({
        startDate,
        weekGoals,
        jobId: state.jobId || state.jobTitle,
        score,
      }),
    );
    showToast("Week 1 goals saved! Check back in 7 days to track progress.");
  };

  return (
    <div
      style={{
        padding: "40px 0",
        maxWidth: 900,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 1000,
            background: "var(--bg-card)",
            border: "1px solid var(--emerald)",
            borderRadius: 10,
            padding: "12px 20px",
            color: "var(--emerald)",
            fontFamily: "var(--mono)",
            fontSize: "0.85rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            maxWidth: 360,
          }}
        >
          ✓ {toast}
        </div>
      )}

      <div className="reveal" style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 4,
                height: 32,
                background: "var(--yellow)",
                borderRadius: 2,
              }}
            />
            <h2
              style={{
                fontFamily: "var(--mono)",
                fontSize: "1.5rem",
                color: "var(--yellow)",
              }}
            >
              90-Day Upskilling Roadmap
            </h2>
          </div>
          {/* Section 4.4 — Completion progress badge */}
          {currentRoadmap && totalRoadmapCourses > 0 && (
            <div
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.3)",
                borderRadius: 20,
                padding: "4px 16px",
                fontFamily: "var(--mono)",
                fontSize: "0.72rem",
                color: "var(--yellow)",
              }}
            >
              {completionPct}% complete · {completedCourseCount}/
              {totalRoadmapCourses} courses
            </div>
          )}
        </div>
        <p
          style={{ color: "var(--text2)", fontSize: "0.9rem", marginLeft: 16 }}
        >
          {jobRoleRoadmap
            ? `Role-specific roadmap for your position. Total estimated time: ${currentRoadmap?.reduce((t, p) => t + p.courses.reduce((a, c) => a + parseDurationToHours(c.duration), 0), 0) || 0} hours.`
            : `Personalised plan targeting your ${skillsToShow.length} highest-risk skills. Total estimated time: ${totalHours} hours.`}
        </p>
      </div>

      {isUsingFallback && (
        <div
          style={{
            padding: "14px 18px",
            border: "1px solid rgba(251,191,36,0.3)",
            borderRadius: 10,
            background: "rgba(251,191,36,0.08)",
            color: "#FCD34D",
            fontSize: "0.875rem",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>
            ⚠ Showing {state.industry || "example"} skills — complete your Skill
            Risk Calculator for a personalised plan.
          </span>
          <button
            onClick={() => onNavigate?.("skill-risk")}
            style={{
              background: "none",
              border: "1px solid rgba(251,191,36,0.5)",
              color: "#FCD34D",
              borderRadius: 6,
              padding: "4px 12px",
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Skill Risk Calculator →
          </button>
        </div>
      )}

      {/* Section 4.4 — Progress bar for role roadmap */}
      {jobRoleRoadmap && totalRoadmapCourses > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                color: "var(--text2)",
              }}
            >
              Roadmap Progress
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                color: "var(--yellow)",
              }}
            >
              {completionPct}%
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "var(--alpha-bg-08)",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${completionPct}%`,
                background: "var(--yellow)",
                borderRadius: 2,
                transition: "width 0.4s",
              }}
            />
          </div>
        </div>
      )}

      {jobRoleRoadmap && (
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
              color: "var(--yellow)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 16,
            }}
          >
            Role-Specific Roadmap
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobRoleRoadmap.map((phase, pi) => {
              const isOpen = expandedPhase === pi;
              const phaseCoursesCompleted = phase.courses.filter((c) =>
                progress.completedCourses.includes(c.title),
              ).length;
              const phaseMilestonesCompleted = phase.milestones.filter((m) =>
                progress.completedMilestones.includes(m),
              ).length;
              const phaseComplete =
                phaseCoursesCompleted === phase.courses.length &&
                phaseMilestonesCompleted === phase.milestones.length;
              return (
                <div
                  key={pi}
                  style={{
                    background: phaseComplete
                      ? "rgba(0,255,159,0.04)"
                      : "var(--alpha-bg-04)",
                    border: `1px solid ${phaseComplete ? "rgba(0,255,159,0.3)" : "rgba(251,191,36,0.2)"}`,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => setExpandedPhase(isOpen ? null : pi)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 20px",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "0.7rem",
                          color: phaseComplete
                            ? "var(--emerald)"
                            : "var(--yellow)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 4,
                        }}
                      >
                        {phaseComplete ? "✓ " : ""}
                        {phase.phase} · {phase.weeks}
                      </div>
                      <div style={{ color: "var(--text)", fontWeight: 600 }}>
                        {phase.focus}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "0.7rem",
                          color: "var(--text2)",
                        }}
                      >
                        {phaseCoursesCompleted}/{phase.courses.length} courses
                      </span>
                      <div
                        style={{
                          color: "var(--text2)",
                          transition: "transform 0.2s",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                        }}
                      >
                        ▾
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div
                      style={{
                        padding: "0 20px 20px",
                        borderTop: "1px solid rgba(251,191,36,0.1)",
                      }}
                    >
                      <div style={{ paddingTop: 16, marginBottom: 12 }}>
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "0.65rem",
                            color: "var(--text2)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 8,
                          }}
                        >
                          Week Goals
                        </div>
                        {phase.milestones.map((m, mi) => {
                          const done = progress.completedMilestones.includes(m);
                          return (
                            <div
                              key={mi}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                marginBottom: 6,
                                cursor: "pointer",
                              }}
                              onClick={() => toggleMilestone(m)}
                            >
                              <span
                                style={{
                                  color: done
                                    ? "var(--emerald)"
                                    : "var(--yellow)",
                                  marginTop: 2,
                                  flexShrink: 0,
                                }}
                              >
                                {done ? "◆" : "◇"}
                              </span>
                              <span
                                style={{
                                  color: done ? "var(--text2)" : "var(--text)",
                                  fontSize: "0.8rem",
                                  textDecoration: done
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {m}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {phase.courses.map((course: Course, ci: number) => {
                          const done = progress.completedCourses.includes(
                            course.title,
                          );
                          return (
                            <div
                              key={ci}
                              style={{
                                background: done
                                  ? "rgba(0,255,159,0.06)"
                                  : "var(--alpha-bg-04)",
                                borderRadius: 10,
                                padding: "14px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 16,
                                flexWrap: "wrap",
                                border: done
                                  ? "1px solid rgba(0,255,159,0.2)"
                                  : "none",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div
                                  style={{
                                    color: done
                                      ? "var(--emerald)"
                                      : "var(--text)",
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                    marginBottom: 4,
                                  }}
                                >
                                  {done && "✓ "}
                                  {course.title}
                                </div>
                                <div
                                  style={{
                                    color: "var(--text2)",
                                    fontSize: "0.8rem",
                                    marginBottom: 6,
                                  }}
                                >
                                  {course.description}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 12,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "var(--mono)",
                                      fontSize: "0.7rem",
                                      color: "var(--text2)",
                                    }}
                                  >
                                    📚 {course.provider}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "var(--mono)",
                                      fontSize: "0.7rem",
                                      color: "var(--text2)",
                                    }}
                                  >
                                    ⏱ {course.duration}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "var(--mono)",
                                      fontSize: "0.7rem",
                                      color: "var(--emerald)",
                                    }}
                                  >
                                    ↑ {course.skillImpact}
                                  </span>
                                  {course.difficulty && (
                                    <span
                                      style={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.7rem",
                                        color: "var(--text2)",
                                        letterSpacing: "0.05em",
                                      }}
                                      title={course.difficulty}
                                    >
                                      {getDifficultyDots(course.difficulty)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-end",
                                  gap: 8,
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: "1rem",
                                    color: "var(--text)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {course.price}
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  {/* Section 4.4 — Mark complete toggle */}
                                  <button
                                    onClick={() => toggleCourse(course.title)}
                                    style={{
                                      background: done
                                        ? "rgba(0,255,159,0.15)"
                                        : "transparent",
                                      border: `1px solid ${done ? "var(--emerald)" : "var(--border)"}`,
                                      color: done
                                        ? "var(--emerald)"
                                        : "var(--text2)",
                                      borderRadius: 6,
                                      padding: "4px 10px",
                                      fontFamily: "var(--mono)",
                                      fontSize: "0.65rem",
                                      cursor: "pointer",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {done ? "✓ Done" : "Mark Done"}
                                  </button>
                                  <a
                                    href={course.affiliateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: "var(--violet)",
                                      color: "white",
                                      textDecoration: "none",
                                      borderRadius: 6,
                                      padding: "6px 14px",
                                      fontFamily: "var(--mono)",
                                      fontSize: "0.7rem",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.06em",
                                    }}
                                  >
                                    Enrol →
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!jobRoleRoadmap && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {skillsToShow.map((skill, i) => {
            const { label, cssVar } = getRiskLabel(skill.riskScore);
            const courses = getCoursesForSkill(skill.name);
            const isExpanded = expandedSkill === skill.name;
            return (
              <div
                key={skill.id}
                style={{
                  background: "var(--alpha-bg-04)",
                  border: `1px solid ${cssVar}40`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() =>
                    setExpandedSkill(isExpanded ? null : skill.name)
                  }
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "18px 24px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 16 }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${cssVar}20`,
                        border: `1px solid ${cssVar}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--mono)",
                        fontSize: "0.8rem",
                        color: cssVar,
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          color: "var(--text)",
                          fontWeight: 600,
                          fontSize: "1rem",
                        }}
                      >
                        {skill.name}
                      </div>
                      <div
                        style={{
                          color: "var(--text2)",
                          fontSize: "0.8rem",
                          marginTop: 2,
                        }}
                      >
                        {skill.category} · {courses.length} courses available
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "1.4rem",
                          fontWeight: 700,
                          color: cssVar,
                        }}
                      >
                        {skill.riskScore}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: cssVar }}>
                        {label}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "var(--text2)",
                        fontSize: "1.2rem",
                        transition: "transform 0.2s",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                      }}
                    >
                      ▾
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${cssVar}20`,
                      padding: "0 24px 24px",
                    }}
                  >
                    <div style={{ paddingTop: 20 }}>
                      {intentMap[skill.name] == null ? (
                        <div
                          style={{ textAlign: "center", padding: "16px 0 8px" }}
                        >
                          <div
                            style={{
                              color: "var(--text2)",
                              fontSize: "0.8rem",
                              marginBottom: 16,
                            }}
                          >
                            What's your goal for{" "}
                            <strong style={{ color: "var(--text)" }}>
                              {skill.name}
                            </strong>
                            ?
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              justifyContent: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() => setIntent(skill.name, "protect")}
                              style={{
                                background: "rgba(0,245,255,0.1)",
                                border: "1px solid var(--cyan)",
                                color: "var(--cyan)",
                                borderRadius: 8,
                                padding: "10px 22px",
                                fontFamily: "var(--mono)",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              🛡 Protect this skill
                            </button>
                            <button
                              onClick={() => setIntent(skill.name, "pivot")}
                              style={{
                                background: "rgba(251,191,36,0.1)",
                                border: "1px solid var(--yellow)",
                                color: "var(--yellow)",
                                borderRadius: 8,
                                padding: "10px 22px",
                                fontFamily: "var(--mono)",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              ↗ Pivot away from it
                            </button>
                          </div>
                        </div>
                      ) : intentMap[skill.name] === "pivot" ? (
                        <div
                          style={{
                            background: "rgba(251,191,36,0.06)",
                            border: "1px solid rgba(251,191,36,0.25)",
                            borderRadius: 10,
                            padding: "18px 20px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--yellow)",
                              fontFamily: "var(--mono)",
                              fontSize: "0.75rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: 10,
                            }}
                          >
                            ↗ Pivot Strategy
                          </div>
                          <p
                            style={{
                              color: "var(--text2)",
                              fontSize: "0.82rem",
                              lineHeight: 1.6,
                              margin: "0 0 12px",
                            }}
                          >
                            Instead of competing with AI on{" "}
                            <strong style={{ color: "var(--text)" }}>
                              {skill.name}
                            </strong>
                            , focus on roles that{" "}
                            <em>govern, audit, and direct</em> AI output in this
                            domain.
                          </p>
                          <button
                            onClick={() => setIntent(skill.name, null)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text2)",
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <div
                              style={{
                                color: "var(--cyan)",
                                fontFamily: "var(--mono)",
                                fontSize: "0.7rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                              }}
                            >
                              🛡 Protection roadmap
                            </div>
                            <button
                              onClick={() => setIntent(skill.name, null)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--text2)",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Change goal
                            </button>
                          </div>
                          {courses.map((course: Course, ci: number) => {
                            const done = progress.completedCourses.includes(
                              course.title,
                            );
                            return (
                              <div
                                key={ci}
                                style={{
                                  background: done
                                    ? "rgba(0,255,159,0.06)"
                                    : "var(--alpha-bg-04)",
                                  borderRadius: 10,
                                  padding: "16px 18px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 16,
                                  flexWrap: "wrap",
                                  border: done
                                    ? "1px solid rgba(0,255,159,0.2)"
                                    : "none",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <div
                                    style={{
                                      color: done
                                        ? "var(--emerald)"
                                        : "var(--text)",
                                      fontWeight: 600,
                                      fontSize: "0.9rem",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {done && "✓ "}
                                    {course.title}
                                  </div>
                                  <div
                                    style={{
                                      color: "var(--text2)",
                                      fontSize: "0.8rem",
                                      marginBottom: 6,
                                    }}
                                  >
                                    {course.description}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 12,
                                      flexWrap: "wrap",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.7rem",
                                        color: "var(--text2)",
                                      }}
                                    >
                                      📚 {course.provider}
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.7rem",
                                        color: "var(--text2)",
                                      }}
                                    >
                                      ⏱ {course.duration}
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.7rem",
                                        color: "var(--emerald)",
                                      }}
                                    >
                                      ↑ {course.skillImpact}
                                    </span>
                                    {course.difficulty && (
                                      <span
                                        style={{
                                          fontFamily: "var(--mono)",
                                          fontSize: "0.7rem",
                                          color: "var(--text2)",
                                          letterSpacing: "0.05em",
                                        }}
                                        title={course.difficulty}
                                      >
                                        {getDifficultyDots(course.difficulty)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    gap: 8,
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontFamily: "var(--mono)",
                                      fontSize: "1rem",
                                      color: "var(--text)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {course.price}
                                  </div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button
                                      onClick={() => toggleCourse(course.title)}
                                      style={{
                                        background: done
                                          ? "rgba(0,255,159,0.15)"
                                          : "transparent",
                                        border: `1px solid ${done ? "var(--emerald)" : "var(--border)"}`,
                                        color: done
                                          ? "var(--emerald)"
                                          : "var(--text2)",
                                        borderRadius: 6,
                                        padding: "4px 10px",
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.65rem",
                                        cursor: "pointer",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                      }}
                                    >
                                      {done ? "✓ Done" : "Mark Done"}
                                    </button>
                                    <a
                                      href={course.affiliateUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        background: "var(--violet)",
                                        color: "white",
                                        textDecoration: "none",
                                        borderRadius: 6,
                                        padding: "6px 14px",
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.7rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                      }}
                                    >
                                      Enrol →
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Live free resources from Learning Hub */}
                          <LiveResourcesStrip
                            roleKey={skill.id?.toString() ?? skill.name}
                            riskScore={skill.riskScore}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={handleStartWeek1}
          style={{
            background: "var(--yellow)",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "12px 32px",
            fontFamily: "var(--mono)",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Start Week 1 →
        </button>
        <div
          style={{ marginTop: 10, fontSize: "0.75rem", color: "var(--text2)" }}
        >
          Saves your Week 1 goals locally. Check back in 7 days.
        </div>
        {/* Link to multilingual Learning Hub */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => onNavigate?.("skill-risk")}
            style={{
              background: "none",
              border: "1px solid rgba(0,245,255,0.25)",
              borderRadius: 8,
              padding: "8px 20px",
              color: "var(--cyan)",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🌐 Browse 200+ free multilingual resources in the Learning Hub
          </button>
        </div>
      </div>
    </div>
  );
}
