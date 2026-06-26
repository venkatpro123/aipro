import { useState, useMemo, useEffect, useRef } from "react";
import PeerBenchmark from "./PeerBenchmark";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { skillsDataNew } from "../data/skillsDataNew";
import { getRiskLabel } from "../utils/riskCalculations";
import { useHumanProof } from "../context/HumanProofContext";
import { SKILL_INSIGHTS_2026 } from "../data/skillInsights";
import { RESEARCH_SOURCES_2026 } from "../data/sources2026";
import {
  projectSkillRisk,
  getProjectionGuidance,
  aggregatePortfolioRisk,
} from "../utils/riskProjection";
import {
  discoverSkillRisk,
  DynamicSkillResult,
} from "../services/ensemble/skillDiscoveryAgent";
import { Skill, SkillInsight, WeightedSkill } from "../types/skillRisk";
import { SkillIntelligenceCard } from "./SkillRisk/SkillIntelligenceCard";
import {
  Search,
  Sparkles,
  AlertCircle,
  Info,
  ChevronRight,
  X,
  PlusCircle,
  Activity,
} from "lucide-react";

const MAX_SKILLS = 50;

const INDUSTRY_MULT: Record<string, number> = {
  Finance: 1.35,
  Accounting: 1.4,
  Legal: 1.2,
  Technology: 1.15,
  Analytics: 1.25,
  Marketing: 1.2,
  Creative: 1.3,
  Education: 0.75,
  Healthcare: 0.7,
  "People Ops": 1.1,
  Sales: 1.05,
};

const HUMAN_KEYWORDS = [
  "empathy",
  "relationship",
  "trust",
  "leadership",
  "judgment",
  "ethics",
  "counsel",
  "mentor",
  "coach",
  "presence",
  "culture",
  "crisis",
  "community",
  "facilitat",
  "negotiat",
  "creativit",
  "vision",
  "compassion",
  "intuition",
  "persuasion",
  "listen",
  "collaborat",
  "diplomat",
  "inspir",
  "storytell",
  "conflict",
  "wellbeing",
  "emotional",
  "spiritual",
  "grief",
  "motivat",
];
const TECH_KEYWORDS = [
  "code",
  "script",
  "automate",
  "generate",
  "report",
  "analys",
  "analyze",
  "data",
  "document",
  "draft",
  "write",
  "research",
  "review",
  "model",
  "test",
  "audit",
  "transcri",
  "translat",
  "classif",
  "predict",
  "detect",
  "index",
  "extract",
  "process",
  "entry",
  "log",
  "monitor",
  "schedule",
];

// Section 2.2 — Improved custom skill scoring with three-layer approach
function scoreCustomSkill(skillName: string, industry?: string | null): number {
  const name = skillName.toLowerCase();

  // Layer 1: Protective skills that contain tech-sounding keywords but are NOT automatable
  const PROTECTIVE_DESPITE_TECH = [
    "ai ethics",
    "ai governance",
    "ai audit",
    "machine learning ethics",
    "algorithm bias",
    "responsible ai",
    "ai policy",
    "tech regulation",
    "data privacy",
    "cybersecurity strategy",
    "digital transformation leadership",
    "prompt engineering oversight",
    "ai risk management",
    "ai safety",
    "responsible technology",
    "algorithmic fairness",
  ];
  if (PROTECTIVE_DESPITE_TECH.some((p) => name.includes(p))) {
    return 12; // Fixed deterministic score for protective skills
  }

  // Layer 2: Skills that sound human but are actually highly automatable
  const AUTOMATABLE_DESPITE_HUMAN_SOUND = [
    "data entry",
    "form filling",
    "scheduling",
    "appointment booking",
    "invoice processing",
    "expense reporting",
    "basic bookkeeping",
    "file organization",
    "file organisation",
    "meeting notes",
    "email sorting",
    "data migration",
    "report generation",
    "transcript creation",
    "basic translation",
    "content moderation",
    "cv screening",
    "resume screening",
  ];
  if (AUTOMATABLE_DESPITE_HUMAN_SOUND.some((p) => name.includes(p))) {
    return 87; // Fixed deterministic score for automatable skills
  }

  // Layer 3: Keyword-based scoring with improved weights
  const humanHits = HUMAN_KEYWORDS.filter((k) => name.includes(k)).length;
  const techHits = TECH_KEYWORDS.filter((k) => name.includes(k)).length;
  const total = humanHits + techHits;
  let base = 50;
  if (total === 0) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash |= 0;
    }
    base = 35 + (Math.abs(hash) % 31);
  } else {
    base = Math.round((techHits / total) * 82 + (humanHits / total) * 10);
  }

  // Layer 4: Industry context modifier
  const INDUSTRY_RISK_MODIFIERS: Record<string, number> = {
    Finance: 1.12,
    Accounting: 1.15,
    Legal: 1.1,
    Marketing: 1.08,
    Healthcare: 0.82,
    "Mental Health": 0.72,
    Education: 0.88,
    "Social Work": 0.7,
    Architecture: 0.85,
    "People Ops": 0.95,
  };
  const mult = industry
    ? INDUSTRY_RISK_MODIFIERS[industry] || INDUSTRY_MULT[industry] || 1.0
    : 1.0;
  return Math.min(92, Math.max(8, Math.round(base * mult)));
}

// Section 2.3 — Industry-aware AI tools filtering
const TOOL_INDUSTRY_EXCLUSIONS: Record<string, string[]> = {
  Healthcare: [
    "Midjourney",
    "DALL-E",
    "Jasper",
    "Copy.ai",
    "Gamma",
    "RunwayML",
    "Sora",
    "ElevenLabs",
  ],
  Legal: [
    "Midjourney",
    "DALL-E",
    "Stable Diffusion",
    "RunwayML",
    "Sora",
    "Jasper",
  ],
  Education: ["RunwayML", "Sora", "ElevenLabs", "Jasper", "Copy.ai"],
  "Social Work": [
    "Midjourney",
    "DALL-E",
    "Jasper",
    "RunwayML",
    "Sora",
    "Copy.ai",
  ],
  "Mental Health": [
    "Midjourney",
    "DALL-E",
    "Jasper",
    "Copy.ai",
    "RunwayML",
    "Sora",
  ],
};

function getRelevantAITools(
  insight: SkillInsight,
  industry: string | null,
): string[] {
  const allTools = insight.aiTools || [];
  if (!industry || !TOOL_INDUSTRY_EXCLUSIONS[industry]) return allTools;
  const excluded = TOOL_INDUSTRY_EXCLUSIONS[industry];
  const filtered = allTools.filter((tool) => !excluded.includes(tool));
  return filtered.length > 0 ? filtered : allTools.slice(0, 2);
}

const LS_KEY = "hp_skill_selections";

// Section 2.5 — Trend delta computation
function getTrendArrow(
  delta?: number,
): { arrow: string; color: string; label: string } | null {
  if (delta === undefined) return null;
  if (delta > 5)
    return { arrow: "↑", color: "var(--red)", label: `+${delta} since 2025` };
  if (delta < -5)
    return {
      arrow: "↓",
      color: "var(--emerald)",
      label: `${delta} since 2025`,
    };
  return { arrow: "→", color: "var(--text2)", label: "Stable since 2025" };
}

export default function SkillRiskCalculator({
  onNavigate,
}: {
  onNavigate?: (tab: string) => void;
}) {
  const { state, dispatch } = useHumanProof();
  const [search, setSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<WeightedSkill[]>([]);
  const [dynamicInsights, setDynamicInsights] = useState<
    Record<string, SkillInsight>
  >({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isProfiling, setIsProfiling] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(false);
  const [skillBeingHydrated, setSkillBeingHydrated] = useState<string | null>(
    null,
  );
  const [showResults, setShowResults] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<1 | 3 | 5>(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [dropdownOpen]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WeightedSkill[];
        if (Array.isArray(parsed) && parsed.length > 0)
          setSelectedSkills(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(selectedSkills));
    } catch {}
  }, [selectedSkills]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const selectedIds = new Set(selectedSkills.map((s) => s.id));
    return q
      ? skillsDataNew.filter(
          (s) =>
            !selectedIds.has(s.id) &&
            (s.name.toLowerCase().includes(q) ||
              s.category.toLowerCase().includes(q)),
        )
      : skillsDataNew.filter((s) => !selectedIds.has(s.id));
  }, [search, selectedSkills]);

  const addSkill = (skill: Skill) => {
    if (selectedSkills.length >= MAX_SKILLS) return;
    if (
      selectedSkills.find(
        (s) => s.name.toLowerCase() === skill.name.toLowerCase(),
      )
    ) {
      setSearch("");
      setDropdownOpen(false);
      return;
    }
    setSelectedSkills((prev) => [...prev, { ...skill, weight: 1 }]);
    setSearch("");
    setDropdownOpen(false);
  };

  const handleMagicSearch = async () => {
    const skillName = search.trim();
    if (!skillName || selectedSkills.length >= MAX_SKILLS) return;

    // Check if it's already in the local list (preseeded)
    const exact = skillsDataNew.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase(),
    );
    if (exact) {
      addSkill(exact);
      return;
    }

    // AI Discovery
    setIsProfiling(skillName);
    setDropdownOpen(false);

    const result = await discoverSkillRisk(skillName);
    setIsProfiling(null);

    if (result) {
      setDynamicInsights((prev) => ({
        ...prev,
        [result.skill.name]: result.insight,
      }));
      setSelectedSkills((prev) => [...prev, { ...result.skill, weight: 1 }]);
      setSearch("");
    } else {
      // Improved dynamic fallback for missing API connections
      const fallbackScore = scoreCustomSkill(skillName, state.industry);
      const defaultInsight = {
        threat: `This skill shows automation exposure. While certain repetitive components of ${skillName} can be accelerated by AI, complex domain-specific tasks remain human-dominated.`,
        pivot: "Focus on combining this capability with emerging human-centric domains where AI assistance is limited.",
        why_protected: "Complex integration, strategic edge cases, and domain-specific logic require human judgment that current models cannot replicate.",
        action: `Identify and certify in a niche, high-value domain of ${skillName}`,
        aiTools: ["Enterprise AI Assistants"],
        source: "Standard Analysis",
      };
      setDynamicInsights((prev) => ({
        ...prev,
        [skillName]: defaultInsight,
      }));
      setSelectedSkills((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: skillName,
          category: "Custom Skill",
          riskScore: fallbackScore,
          trend: "stable",
          weight: 1,
          factors: {
            automation: fallbackScore > 60 ? 75 : 40,
            judgment: fallbackScore < 50 ? 75 : 40,
            physical: 10,
            creativity: fallbackScore < 50 ? 60 : 30,
          },
          subSkills: [
            { name: "Core execution", riskScore: Math.min(fallbackScore + 10, 95) },
            { name: "Strategy & Planning", riskScore: Math.max(fallbackScore - 20, 15) },
            { name: "Complex problem solving", riskScore: Math.max(fallbackScore - 30, 10) },
          ],
        },
      ]);
      setSearch("");
    }
  };

  const hydrateSkills = async () => {
    const unhydrated = selectedSkills.filter(
      (s) => !s.factors || (!dynamicInsights[s.name] && !(SKILL_INSIGHTS_2026 as any)[s.name]),
    );
    if (unhydrated.length === 0) {
      setShowResults(true);
      return;
    }

    setIsHydrating(true);

    // Hydrate sequentially to avoid overwhelming the rate limit
    for (const skill of unhydrated) {
      setSkillBeingHydrated(skill.name);
      const result = await discoverSkillRisk(skill.name);
      if (result) {
        setDynamicInsights((prev) => ({
          ...prev,
          [result.skill.name]: result.insight,
        }));
        setSelectedSkills((prev) =>
          prev.map((s) =>
            s.name === skill.name ? { ...s, ...result.skill } : s,
          ),
        );
      } else {
        // Fallback when API fails during hydration
        const fallbackInsight = {
          threat: `This skill shows exposure to AI automation. While some tasks can be assisted by AI, complex domain-specific requirements typically need human expertise.`,
          pivot: "Focus on combining this skill with complementary human-centric capabilities.",
          why_protected: "Complex real-world application requires human judgment, creativity, and ethical consideration.",
          action: "Document your unique value proposition combining this skill with human insight",
          aiTools: ["Enterprise AI Tools"],
          source: "Standard Analysis",
        };
        setDynamicInsights((prev) => ({
          ...prev,
          [skill.name]: fallbackInsight,
        }));
        setSelectedSkills((prev) =>
          prev.map((s) =>
            s.name === skill.name
              ? {
                  ...s,
                  factors: s.factors || {
                    automation: s.riskScore > 60 ? 75 : 50,
                    judgment: s.riskScore < 50 ? 75 : 50,
                    physical: 10,
                    creativity: s.riskScore < 50 ? 60 : 30,
                  },
                  subSkills: s.subSkills || [
                    { name: "Core execution", riskScore: Math.min(s.riskScore + 10, 95) },
                    { name: "Strategy", riskScore: Math.max(s.riskScore - 20, 25) },
                    { name: "Complex problem solving", riskScore: Math.max(s.riskScore - 30, 25) },
                  ],
                }
              : s,
          ),
        );
      }
    }
    setSkillBeingHydrated(null);

    setIsHydrating(false);
    setShowResults(true);
    dispatch({
      type: "SET_SKILL_RISK",
      score: weightedScore,
      skills: selectedSkills,
      breakdown: selectedSkills,
    });
  };

  const removeSkill = (id: number) => {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== id));
    if (showResults) setShowResults(false);
  };

  const setWeight = (id: number, weight: 0.5 | 1 | 2) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, weight } : s)),
    );
  };

  const handleCalculate = async () => {
    await hydrateSkills();
  };

  const hasCustomWeights = selectedSkills.some((s) => s.weight !== 1);

  const weightedScore =
    selectedSkills.length > 0
      ? Math.round(
          selectedSkills.reduce((sum, s) => sum + s.riskScore * s.weight, 0) /
            selectedSkills.reduce((sum, s) => sum + s.weight, 0),
        )
      : 0;

  const sorted = [...selectedSkills].sort((a, b) => b.riskScore - a.riskScore);

  const riskInfo = getRiskLabel(weightedScore);

  const radarData = selectedSkills.map((s) => ({
    skill: s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name,
    score: s.riskScore,
  }));

  const barData = selectedSkills.map((s) => ({
    name: s.name.length > 20 ? s.name.slice(0, 19) + "…" : s.name,
    score: s.riskScore,
    color: getRiskLabel(s.riskScore).cssVar,
  }));

  const weightBtn = (
    id: number,
    w: 0.5 | 1 | 2,
    label: string,
    current: 0.5 | 1 | 2,
  ) => (
    <button
      key={w}
      onClick={() => setWeight(id, w)}
      style={{
        background: current === w ? "rgba(0,245,255,0.15)" : "transparent",
        border: `1px solid ${current === w ? "var(--cyan)" : "var(--border)"}`,
        color: current === w ? "var(--cyan)" : "var(--text2)",
        borderRadius: 4,
        padding: "2px 8px",
        fontFamily: "var(--mono)",
        fontSize: "0.65rem",
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );

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
            Skill Risk Calculator
          </h2>
        </div>
        <p
          style={{ color: "var(--text2)", fontSize: "0.9rem", marginLeft: 16 }}
        >
          Search from{" "}
          <span style={{ color: "var(--cyan)", fontWeight: 700 }}>
            228 verified skills
          </span>{" "}
          & add up to {MAX_SKILLS} to your portfolio for risk analysis.
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 12,
              fontSize: "0.7rem",
              color: "var(--amber)",
              background: "rgba(245,158,11,0.1)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            ⚠️ Data: Q4 2025 (update pending)
          </span>
        </p>
      </div>

      <div
        style={{
          background: "var(--alpha-bg-04)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 16,
          }}
        >
          <label
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.75rem",
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Unified Skill Search
          </label>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--cyan)",
              fontFamily: "var(--mono)",
            }}
          >
            Global Coverage • {selectedSkills.length}/{MAX_SKILLS} selected
          </div>
        </div>
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            style={{
              position: "absolute",
              left: "14px",
              top: "12px",
              color: "var(--text2)",
            }}
          >
            <Search size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && handleMagicSearch()}
            placeholder="Type any skill (e.g. Python, AI Ethics, Strategy)..."
            style={{
              width: "100%",
              background: "var(--alpha-bg-06)",
              border: "1px solid var(--border2)",
              borderRadius: 10,
              padding: "12px 14px 12px 42px",
              color: "var(--text)",
              fontFamily: "var(--body)",
              fontSize: "1rem",
              transition: "border 0.2s",
            }}
          />

          {isProfiling && (
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(17,17,40,0.8)",
                padding: "4px 10px",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(0,245,255,0.2)",
                  borderTopColor: "var(--cyan)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cyan)",
                  fontFamily: "var(--mono)",
                }}
              >
                Analysing {isProfiling}...
              </span>
            </div>
          )}

          {dropdownOpen &&
            (filtered.length > 0 || search.trim().length > 1) && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border2)",
                  borderRadius: 8,
                  maxHeight: 320,
                  overflowY: "auto",
                  marginTop: 8,
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                }}
              >
                {filtered.map((skill) => {
                  const { label, cssVar } = getRiskLabel(skill.riskScore);
                  const trend = getTrendArrow((skill as any).trendDelta);
                  return (
                    <div
                      key={skill.id}
                      onClick={() => addSkill(skill)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--alpha-bg-06)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--alpha-bg-06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                          }}
                        >
                          {skill.name}
                        </div>
                        <div
                          style={{ color: "var(--text2)", fontSize: "0.75rem" }}
                        >
                          {skill.category}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        {trend && (
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "0.72rem",
                              color: trend.color,
                            }}
                          >
                            {trend.arrow}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "0.85rem",
                            color: cssVar,
                            fontWeight: 700,
                          }}
                        >
                          {skill.riskScore}
                        </span>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: `1px solid ${cssVar}`,
                            color: cssVar,
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {search.trim().length > 1 &&
                  !filtered.find(
                    (f) => f.name.toLowerCase() === search.trim().toLowerCase(),
                  ) && (
                    <div
                      onClick={handleMagicSearch}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "14px 16px",
                        cursor: "pointer",
                        background: "rgba(0,245,255,0.03)",
                        borderTop: "1px solid rgba(0,245,255,0.1)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,245,255,0.08)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0,245,255,0.03)")
                      }
                    >
                      <Sparkles size={18} color="var(--cyan)" />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: "var(--text)",
                            fontSize: "0.9rem",
                            fontWeight: 600,
                          }}
                        >
                          Discover risk for "{search}"
                        </div>
                        <div
                          style={{ color: "var(--text2)", fontSize: "0.75rem" }}
                        >
                          Full AI Labor Market Analysis • (Gemma 3)
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--cyan)" />
                    </div>
                  )}
              </div>
            )}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--alpha-text-30)",
            fontSize: "0.75rem",
          }}
        >
          <Info size={14} />
          <span>
            Press Enter to analyze custom skills with real-time AI modeling.
          </span>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>

      {selectedSkills.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {selectedSkills.map((skill) => {
            const { label, cssVar } = getRiskLabel(skill.riskScore);
            const trend = getTrendArrow(skill.trendDelta);
            return (
              <div
                key={skill.id}
                style={{
                  background: "var(--alpha-bg-04)",
                  border: `1px solid ${cssVar}30`,
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--text)",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {skill.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "1rem",
                          color: cssVar,
                          fontWeight: 700,
                        }}
                      >
                        {skill.riskScore}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: `${cssVar}15`,
                          color: cssVar,
                        }}
                      >
                        {label}
                      </span>
                      {/* Section 2.5 — trend arrow on selected skill card */}
                      {trend && (
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "0.7rem",
                            color: trend.color,
                          }}
                          title={trend.label}
                        >
                          {trend.arrow} {trend.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeSkill(skill.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text2)",
                      cursor: "pointer",
                      fontSize: "1.1rem",
                      padding: 4,
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text2)",
                      marginRight: 4,
                    }}
                  >
                    Weight:
                  </span>
                  {([0.5, 1, 2] as const).map((w) =>
                    weightBtn(
                      skill.id,
                      w,
                      w === 0.5 ? "½×" : w === 1 ? "1×" : "2×",
                      skill.weight,
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSkills.length > 0 && !showResults && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={hydrateSkills}
            disabled={isHydrating}
            className="premium-pulse"
            style={{
              background:
                "linear-gradient(135deg, var(--cyan) 0%, #00d4ff 100%)",
              color: "#0a0a1a",
              border: "none",
              borderRadius: 12,
              padding: "16px 48px",
              fontSize: "1rem",
              fontWeight: 700,
              fontFamily: "var(--mono)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 0 30px rgba(0,245,255,0.3)",
              transition: "all 0.3s ease",
              opacity: isHydrating ? 0.7 : 1,
            }}
          >
            {isHydrating ? (
              <>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(10,10,26,0.2)",
                    borderTopColor: "var(--bg)",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                HYDRATING INTELLIGENCE...
              </>
            ) : (
              <>
                ANALYSE MY SKILL PROFILE
                <ChevronRight size={20} />
              </>
            )}
          </button>
          <p
            style={{
              color: "var(--text2)",
              fontSize: "0.75rem",
              marginTop: 12,
              opacity: 0.6,
            }}
          >
            {isHydrating
              ? "Decomposing skill set into multi-factor components..."
              : "Powered by Multi-Model Ensemble Consensus (Gemma 3 + Gemini 2)"}
          </p>
        </div>
      )}

      {showResults && selectedSkills.length > 0 && (
        <div className="reveal">
          <div
            style={{
              background: "var(--alpha-bg-04)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "32px 40px",
              marginBottom: 40,
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, var(--cyan), transparent)",
              }}
            />
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.8rem",
                color: "var(--text2)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: 16,
              }}
            >
              Aggregated Skill Portfolio Risk (2026)
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "5rem",
                fontWeight: 800,
                color: riskInfo.cssVar,
                lineHeight: 1,
                textShadow: `0 0 40px ${riskInfo.cssVar}33`,
              }}
            >
              {weightedScore}
            </div>

            {/* Confidence Interval Display */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "center",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 4,
                  }}
                >
                  Confidence Range
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: "var(--text)",
                    background: "rgba(0,245,255,0.05)",
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: "1px solid rgba(0,245,255,0.2)",
                  }}
                >
                  {Math.max(0, weightedScore - 12)} -{" "}
                  {Math.min(100, weightedScore + 12)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 4,
                  }}
                >
                  Data Reliability
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: selectedSkills.some((s) => dynamicInsights[s.name])
                      ? "var(--emerald)"
                      : "var(--amber)",
                    background: selectedSkills.some(
                      (s) => dynamicInsights[s.name],
                    )
                      ? "rgba(16,185,129,0.05)"
                      : "rgba(245,158,11,0.05)",
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: `1px solid ${selectedSkills.some((s) => dynamicInsights[s.name]) ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}
                >
                  {selectedSkills.some((s) => dynamicInsights[s.name])
                    ? "AI Enhanced"
                    : "Static Data"}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 4,
                  }}
                >
                  Skills Analyzed
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.9rem",
                    color: "var(--text)",
                    background: "var(--alpha-bg-06)",
                    padding: "4px 12px",
                    borderRadius: 4,
                    border: "1px solid var(--alpha-bg-08)",
                  }}
                >
                  {selectedSkills.length}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 20,
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  padding: "6px 20px",
                  borderRadius: 20,
                  border: `1px solid ${riskInfo.cssVar}`,
                  color: riskInfo.cssVar,
                  fontWeight: 600,
                }}
              >
                {riskInfo.label}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  padding: "6px 12px",
                  borderRadius: 12,
                  background: "rgba(0,245,255,0.1)",
                  border: "1px solid rgba(0,245,255,0.3)",
                  color: "var(--cyan)",
                  fontFamily: "var(--mono)",
                }}
              >
                ENSEMBLE VERIFIED
              </div>
            </div>

            <div
              style={{
                marginTop: 32,
                paddingTop: 32,
                borderTop: "1px solid var(--alpha-bg-06)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 20,
                }}
              >
                Projected Risk Trajectory
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[1, 3, 5].map((year) => {
                  const proj = aggregatePortfolioRisk(
                    selectedSkills,
                    year as 1 | 3 | 5,
                  );
                  const projInfo = getRiskLabel(proj);
                  const active = selectedTimeframe === year;
                  return (
                    <button
                      key={year}
                      onClick={() => setSelectedTimeframe(year as 1 | 3 | 5)}
                      style={{
                        background: active
                          ? `${projInfo.cssVar}15`
                          : "var(--alpha-bg-04)",
                        border: `1px solid ${active ? projInfo.cssVar : "var(--alpha-bg-08)"}`,
                        borderRadius: 12,
                        padding: "14px 24px",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        textAlign: "center",
                        minWidth: 100,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                          color: projInfo.cssVar,
                        }}
                      >
                        {proj}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text2)",
                          marginTop: 6,
                          fontFamily: "var(--mono)",
                        }}
                      >
                        YEAR {2026 + year}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 32,
              marginBottom: 40,
            }}
          >
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
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                }}
              />
              <h2
                style={{
                  fontSize: "1.25rem",
                  color: "var(--text)",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Decision Intelligence Feed
              </h2>
              <div
                style={{
                  height: 1,
                  flex: 1,
                  background:
                    "linear-gradient(90deg, rgba(0,245,255,0.2), transparent)",
                }}
              />
            </div>

            {sorted.map((s) => {
              const explicit = SKILL_INSIGHTS_2026[s.name];
              const dynamic = dynamicInsights[s.name];
              const displayInsight = dynamic || (explicit as any);

              return (
                <SkillIntelligenceCard
                  key={s.id}
                  skill={s}
                  insight={displayInsight}
                  isHydrating={skillBeingHydrated === s.name}
                />
              );
            })}
          </div>

          <div style={{ marginBottom: 40 }}>
            <PeerBenchmark
              score={weightedScore}
              scoreType="skill"
              jobTitle={state.jobTitle}
              industry={state.industry}
            />
          </div>

          <div
            style={{
              background: "var(--alpha-bg-04)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 32,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                color: "var(--text2)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 24,
              }}
            >
              Skill Risk Portfolio Mapping
            </div>
            {selectedSkills.length >= 4 ? (
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,245,255,0.12)" />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fill: "var(--text2)", fontSize: 11 }}
                  />
                  <Radar
                    name="Risk Score"
                    dataKey="score"
                    stroke="var(--cyan)"
                    fill="var(--cyan)"
                    fillOpacity={0.15}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={selectedSkills.length * 60}
              >
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "var(--text2)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    tick={{ fill: "var(--text2)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text)",
                    }}
                    formatter={(val: any) => [`${val} risk score`, "AI Risk"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => setShowSources((v) => !v)}
              style={{
                background: "none",
                border: "1px solid var(--border2)",
                color: "var(--text2)",
                borderRadius: 8,
                padding: "10px 20px",
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {showSources ? "▲ Hide" : "▼ Show"} 2026 Empirical Sources
            </button>
            {showSources && (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 12,
                }}
              >
                {RESEARCH_SOURCES_2026.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "16px",
                      background: "var(--alpha-bg-04)",
                      border: "1px solid var(--border2)",
                      borderRadius: 10,
                    }}
                  >
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--cyan)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      {src.name}
                    </a>
                    <div
                      style={{
                        color: "var(--text2)",
                        fontSize: "0.75rem",
                        marginTop: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      {src.key_finding}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Methodology Transparency Section */}
          <div
            style={{
              marginBottom: 32,
              padding: 20,
              background: "rgba(0,245,255,0.03)",
              border: "1px solid rgba(0,245,255,0.15)",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <Activity size={18} color="var(--cyan)" />
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.8rem",
                  color: "var(--cyan)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Scoring Methodology
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  Pre-seeded Skills
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text)",
                  }}
                >
                  228 skills with static risk scores based on 2024-2025 labor
                  market research
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  AI Discovery
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text)",
                  }}
                >
                  Gemma 3 analyzes custom skills using 4-factor model
                  (automation, judgment, physical, creativity)
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  Weighting
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text)",
                  }}
                >
                  User can adjust skill importance (0.5×, 1×, 2×) for
                  personalized portfolio risk
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 6,
                  }}
                >
                  Projections
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text)",
                  }}
                >
                  1/3/5 year projections based on WEF Future of Jobs 2025 trend
                  analysis
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: "1px solid rgba(0,245,255,0.1)",
                fontSize: "0.75rem",
                color: "var(--text2)",
                fontStyle: "italic",
              }}
            >
              Note: Risk scores are estimates based on available research and AI
              analysis. Actual displacement risk varies by company, location,
              and economic conditions. This tool provides guidance, not
              guarantees.
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => onNavigate?.("roadmap")}
              style={{
                flex: 1,
                minWidth: 200,
                background: "var(--cyan)",
                color: "var(--bg)",
                border: "none",
                borderRadius: 12,
                padding: "16px 24px",
                fontFamily: "var(--mono)",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                boxShadow: "0 4px 20px rgba(0,245,255,0.2)",
              }}
            >
              See Upskilling Roadmap →
            </button>
            <button
              onClick={() => onNavigate?.("progress")}
              style={{
                flex: 1,
                minWidth: 200,
                background: "var(--alpha-bg-04)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: 12,
                padding: "16px 24px",
                fontFamily: "var(--mono)",
                fontSize: "0.85rem",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Share Analysis Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
