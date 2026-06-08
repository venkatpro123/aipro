import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  Star,
  Globe,
  Clock,
  BookMarked,
  Zap,
  Target,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LearningOutcomeTracker } from "../components/Feedback/LearningOutcomeTracker";

// Fallback resources when API is unavailable (expanded 50+ courses)
const FALLBACK_RESOURCES: Resource[] = [
  {
    id: "fb1",
    title: "Introduction to Prompt Engineering",
    provider: "DeepLearning.AI",
    level: "beginner" as const,
    durationHours: 2,
    isFree: "yes" as const,
    language: "en",
    tags: ["ai", "prompts"],
    url: "https://www.deeplearning.ai/short-courses/prompt-engineering",
  },
  {
    id: "fb2",
    title: "AI For Everyone",
    provider: "Coursera",
    level: "beginner" as const,
    durationHours: 6,
    isFree: "yes" as const,
    language: "en",
    tags: ["ai", "basics"],
    url: "https://www.coursera.org/learn/ai-for-everyone",
  },
  {
    id: "fb3",
    title: "Machine Learning Specialization",
    provider: "Stanford Online",
    level: "intermediate" as const,
    durationHours: 40,
    isFree: "audit" as const,
    language: "en",
    tags: ["ml", "ai"],
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
  },
  {
    id: "fb4",
    title: "Python for Data Science",
    provider: "IBM",
    level: "beginner" as const,
    durationHours: 12,
    isFree: "yes" as const,
    language: "en",
    tags: ["python", "data"],
    url: "https://www.coursera.org/learn/python-for-data-science",
  },
  {
    id: "fb5",
    title: "AWS Cloud Practitioner",
    provider: "AWS",
    level: "beginner" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["aws", "cloud"],
    url: "https://aws.amazon.com/training/",
  },
  {
    id: "fb6",
    title: "Kubernetes in 3 Hours",
    provider: "Kubernetes",
    level: "intermediate" as const,
    durationHours: 3,
    isFree: "yes" as const,
    language: "en",
    tags: ["k8s", "cloud"],
    url: "https://kubernetes.io/docs/tutorials/",
  },
  {
    id: "fb7",
    title: "SQL for Data Analysis",
    provider: "Udacity",
    level: "beginner" as const,
    durationHours: 4,
    isFree: "yes" as const,
    language: "en",
    tags: ["sql", "data"],
    url: "https://www.udacity.com/course/sql-for-data-analysis",
  },
  {
    id: "fb8",
    title: "UX Design Fundamentals",
    provider: "Google",
    level: "beginner" as const,
    durationHours: 6,
    isFree: "yes" as const,
    language: "en",
    tags: ["ux", "design"],
    url: "https://www.coursera.org/learn/ux-design-fundamentals",
  },
  {
    id: "fb9",
    title: "Cybersecurity Essentials",
    provider: "Cisco",
    level: "beginner" as const,
    durationHours: 15,
    isFree: "yes" as const,
    language: "en",
    tags: ["security", "cyber"],
    url: "https://www.coursera.org/learn/cybersecurity",
  },
  {
    id: "fb10",
    title: "Data Visualization with Tableau",
    provider: "Tableau",
    level: "intermediate" as const,
    durationHours: 4,
    isFree: "yes" as const,
    language: "en",
    tags: ["viz", "tableau"],
    url: "https://www.tableau.com/learn/training",
  },
  {
    id: "fb11",
    title: "Leadership Skills",
    provider: "LinkedIn Learning",
    level: "intermediate" as const,
    durationHours: 2,
    isFree: "yes" as const,
    language: "en",
    tags: ["leadership", "management"],
    url: "https://www.linkedin.com/learning/leadership-foundations",
  },
  {
    id: "fb12",
    title: "Project Management Professional",
    provider: "PMI",
    level: "intermediate" as const,
    durationHours: 30,
    isFree: "scholarship" as const,
    language: "en",
    tags: ["pmp", "project"],
    url: "https://www.pmi.org/certifications/project-management-professional",
  },
  {
    id: "fb13",
    title: "Advanced Python Programming",
    provider: "Udemy",
    level: "advanced" as const,
    durationHours: 20,
    isFree: "no" as const,
    language: "en",
    tags: ["python", "programming"],
    url: "https://www.udemy.com/course/advanced-python-programming",
  },
  {
    id: "fb14",
    title: "SQL Database Management",
    provider: "MySQL",
    level: "intermediate" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["sql", "database"],
    url: "https://dev.mysql.com/doc/",
  },
  {
    id: "fb15",
    title: "React Frontend Development",
    provider: "Meta",
    level: "intermediate" as const,
    durationHours: 30,
    isFree: "audit" as const,
    language: "en",
    tags: ["react", "frontend"],
    url: "https://www.coursera.org/learn/react-front-end",
  },
  {
    id: "fb16",
    title: "Blockchain Development",
    provider: "Ethereum",
    level: "advanced" as const,
    durationHours: 25,
    isFree: "yes" as const,
    language: "en",
    tags: ["blockchain", "web3"],
    url: "https://ethereum.org/developers/",
  },
  {
    id: "fb17",
    title: "Data Structures & Algorithms",
    provider: "Harvard CS50",
    level: "intermediate" as const,
    durationHours: 35,
    isFree: "yes" as const,
    language: "en",
    tags: ["dsa", "programming"],
    url: "https://cs50.harvard.edu/",
  },
  {
    id: "fb18",
    title: "Cloud Architecture on GCP",
    provider: "Google Cloud",
    level: "advanced" as const,
    durationHours: 15,
    isFree: "yes" as const,
    language: "en",
    tags: ["gcp", "cloud"],
    url: "https://cloud.google.com/training",
  },
  {
    id: "fb19",
    title: "DevOps Engineering",
    provider: "AWS",
    level: "advanced" as const,
    durationHours: 20,
    isFree: "yes" as const,
    language: "en",
    tags: ["devops", "aws"],
    url: "https://aws.amazon.com/devops/",
  },
  {
    id: "fb20",
    title: "Mobile App Development",
    provider: "Google Flutter",
    level: "intermediate" as const,
    durationHours: 18,
    isFree: "yes" as const,
    language: "en",
    tags: ["mobile", "flutter"],
    url: "https://flutter.dev/docs",
  },
  {
    id: "fb21",
    title: "Artificial Intelligence Ethics",
    provider: "Stanford Online",
    level: "intermediate" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["ai", "ethics"],
    url: "https://online.stanford.edu/ai-ethics",
  },
  {
    id: "fb22",
    title: "Product Management",
    provider: "Product School",
    level: "intermediate" as const,
    durationHours: 12,
    isFree: "yes" as const,
    language: "en",
    tags: ["product", "management"],
    url: "https://productschool.com/",
  },
  {
    id: "fb23",
    title: "Technical Writing",
    provider: "Google",
    level: "beginner" as const,
    durationHours: 4,
    isFree: "yes" as const,
    language: "en",
    tags: ["writing", "documentation"],
    url: "https://developers.google.com/tech-writing",
  },
  {
    id: "fb24",
    title: "Machine Learning Engineering",
    provider: "DeepLearning.AI",
    level: "advanced" as const,
    durationHours: 45,
    isFree: "audit" as const,
    language: "en",
    tags: ["ml", "engineering"],
    url: "https://www.deeplearning.ai/learn",
  },
  {
    id: "fb25",
    title: "Cybersecurity Fundamentals",
    provider: "CompTIA",
    level: "beginner" as const,
    durationHours: 12,
    isFree: "no" as const,
    language: "en",
    tags: ["security", "comptia"],
    url: "https://www.comptia.org/training",
  },
  {
    id: "fb26",
    title: "Full Stack Web Development",
    provider: "freeCodeCamp",
    level: "beginner" as const,
    durationHours: 300,
    isFree: "yes" as const,
    language: "en",
    tags: ["web", "fullstack"],
    url: "https://www.freecodecamp.org/",
  },
  {
    id: "fb27",
    title: "Data Analysis with Excel",
    provider: "Microsoft",
    level: "beginner" as const,
    durationHours: 6,
    isFree: "yes" as const,
    language: "en",
    tags: ["excel", "data"],
    url: "https://learn.microsoft.com/excel",
  },
  {
    id: "fb28",
    title: "Business Analytics",
    provider: "Wharton",
    level: "intermediate" as const,
    durationHours: 20,
    isFree: "audit" as const,
    language: "en",
    tags: ["business", "analytics"],
    url: "https://www.coursera.org/learn/wharton-analytics",
  },
  {
    id: "fb29",
    title: "Network Security",
    provider: "Cisco",
    level: "intermediate" as const,
    durationHours: 15,
    isFree: "yes" as const,
    language: "en",
    tags: ["network", "security"],
    url: "https://www.cisco.com/c/security",
  },
  {
    id: "fb30",
    title: "Agile Project Management",
    provider: "Scrum Alliance",
    level: "beginner" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["agile", "scrum"],
    url: "https://www.scrumalliance.org/",
  },
  {
    id: "fb31",
    title: "UI/UX Design Principles",
    provider: "Adobe",
    level: "beginner" as const,
    durationHours: 10,
    isFree: "yes" as const,
    language: "en",
    tags: ["ui", "ux"],
    url: "https://www.adobe.com/products/xd.html",
  },
  {
    id: "fb32",
    title: "Digital Marketing Strategy",
    provider: "HubSpot",
    level: "beginner" as const,
    durationHours: 6,
    isFree: "yes" as const,
    language: "en",
    tags: ["marketing", "digital"],
    url: "https://academy.hubspot.com/",
  },
  {
    id: "fb33",
    title: "Cloud Security",
    provider: "(ISC)²",
    level: "advanced" as const,
    durationHours: 20,
    isFree: "no" as const,
    language: "en",
    tags: ["cloud", "security"],
    url: "https://www.isc2.org/",
  },
  {
    id: "fb34",
    title: "Leadership in Tech",
    provider: "LinkedIn",
    level: "intermediate" as const,
    durationHours: 4,
    isFree: "yes" as const,
    language: "en",
    tags: ["leadership", "management"],
    url: "https://www.linkedin.com/learning/leadership-in-tech",
  },
  {
    id: "fb35",
    title: "System Design",
    provider: "O'Reilly",
    level: "advanced" as const,
    durationHours: 12,
    isFree: "no" as const,
    language: "en",
    tags: ["system", "design"],
    url: "https://www.oreilly.com/",
  },
  {
    id: "fb36",
    title: "Docker & Containers",
    provider: "Docker",
    level: "intermediate" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["docker", "containers"],
    url: "https://docs.docker.com/",
  },
  {
    id: "fb37",
    title: "Kubernetes Administration",
    provider: "CNCF",
    level: "advanced" as const,
    durationHours: 15,
    isFree: "yes" as const,
    language: "en",
    tags: ["kubernetes", "k8s"],
    url: "https://kubernetes.io/docs/",
  },
  {
    id: "fb38",
    title: "Data Visualization with D3.js",
    provider: "D3",
    level: "advanced" as const,
    durationHours: 10,
    isFree: "yes" as const,
    language: "en",
    tags: ["d3", "visualization"],
    url: "https://d3js.org/",
  },
  {
    id: "fb39",
    title: "Python for Automation",
    provider: "Automate",
    level: "beginner" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["python", "automation"],
    url: "https://automatetheboringstuff.com/",
  },
  {
    id: "fb40",
    title: "Machine Learning with TensorFlow",
    provider: "Google",
    level: "advanced" as const,
    durationHours: 25,
    isFree: "yes" as const,
    language: "en",
    tags: ["tensorflow", "ml"],
    url: "https://www.tensorflow.org/learn",
  },
  {
    id: "fb41",
    title: "Cloud Computing Fundamentals",
    provider: "IBM Cloud",
    level: "beginner" as const,
    durationHours: 6,
    isFree: "yes" as const,
    language: "en",
    tags: ["cloud", "fundamentals"],
    url: "https://www.ibm.com/cloud/learn",
  },
  {
    id: "fb42",
    title: "API Design Best Practices",
    provider: "Restful",
    level: "intermediate" as const,
    durationHours: 4,
    isFree: "yes" as const,
    language: "en",
    tags: ["api", "rest"],
    url: "https://restfulapi.net/",
  },
  {
    id: "fb43",
    title: "Software Testing",
    provider: "ISTQB",
    level: "beginner" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["testing", "qa"],
    url: "https://www.istqb.org/",
  },
  {
    id: "fb44",
    title: "Version Control with Git",
    provider: "GitHub",
    level: "beginner" as const,
    durationHours: 3,
    isFree: "yes" as const,
    language: "en",
    tags: ["git", "version-control"],
    url: "https://docs.github.com/",
  },
  {
    id: "fb45",
    title: "Microservices Architecture",
    provider: "Spring",
    level: "advanced" as const,
    durationHours: 12,
    isFree: "yes" as const,
    language: "en",
    tags: ["microservices", "architecture"],
    url: "https://spring.io/microservices",
  },
  {
    id: "fb46",
    title: "Data Science Capstone",
    provider: "Kaggle",
    level: "intermediate" as const,
    durationHours: 15,
    isFree: "yes" as const,
    language: "en",
    tags: ["kaggle", "data-science"],
    url: "https://www.kaggle.com/",
  },
  {
    id: "fb47",
    title: "Ethical Hacking",
    provider: "EC-Council",
    level: "advanced" as const,
    durationHours: 20,
    isFree: "no" as const,
    language: "en",
    tags: ["hacking", "security"],
    url: "https://www.eccouncil.org/",
  },
  {
    id: "fb48",
    title: "Natural Language Processing",
    provider: "Hugging Face",
    level: "advanced" as const,
    durationHours: 18,
    isFree: "yes" as const,
    language: "en",
    tags: ["nlp", "ai"],
    url: "https://huggingface.co/learn",
  },
  {
    id: "fb49",
    title: "Computer Vision",
    provider: "OpenCV",
    level: "advanced" as const,
    durationHours: 20,
    isFree: "yes" as const,
    language: "en",
    tags: ["cv", "ai"],
    url: "https://opencv.org/courses/",
  },
  {
    id: "fb50",
    title: "Cloud Finance",
    provider: "FinOps",
    level: "intermediate" as const,
    durationHours: 8,
    isFree: "yes" as const,
    language: "en",
    tags: ["finops", "cloud"],
    url: "https://www.finops.org/",
  },
];

interface Resource {
  id: string;
  title: string;
  provider: string;
  level: "beginner" | "intermediate" | "advanced";
  durationHours?: number;
  isFree: "yes" | "audit" | "scholarship" | "no";
  language: string;
  languageLabel?: string;
  targetDimension?: string;
  tags?: string[];
  url?: string;
}

interface GeneratedPath {
  id: string;
  title: string;
  description: string;
  resources: {
    resource: { title: string; provider: string; level: string; url?: string };
    orderIndex: number;
    isRequired: boolean;
  }[];
}

const LEVEL_COLOR: Record<string, string> = {
  beginner: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  intermediate: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  advanced: "text-rose-400 border-rose-500/20 bg-rose-500/5",
};

const DIM_FILTERS = [
  { key: "", label: "ALL SOURCES" },
  { key: "D1", label: "⚡ AUTOMATION" },
  { key: "D3", label: "🔄 AMPLIFICATION" },
  { key: "D6", label: "🤝 NETWORK MOAT" },
  { key: "general", label: "🌐 GENERAL" },
];

export const LearningHubPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [total, setTotal] = useState(0);
  const [progress, setProgress] = useState<
    Record<string, { status: string; isBookmarked: boolean }>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dimFilter, setDimFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "generate" | "bookmarks">(
    "all",
  );

  const [roleKeyInput, setRoleKeyInput] = useState("");
  const [generatedPath, setGeneratedPath] = useState<GeneratedPath | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<{ courseId: string; courseTitle: string } | null>(null);
  const [generateError, setGenerateError] = useState("");

  const urlRoleKey = location.state?.roleKey || "";
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResources = useCallback(
    async (query: string, dim: string, level: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "18" });
        if (query) params.set("q", query);
        if (dim) params.set("dimension", dim);
        if (level) params.set("level", level);
        const res = await fetch(`/api/learning/resources?${params}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.data ?? []);
        setResources(items);
        setTotal(data.pagination?.total ?? items.length);
      } catch (err) {
        setResources([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": user.id,
      };
      const res = await fetch("/api/learning/progress", { headers });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, { status: string; isBookmarked: boolean }> =
          {};
        for (const p of data.data ?? [])
          map[p.resourceId] = {
            status: p.status,
            isBookmarked: p.isBookmarked,
          };
        setProgress(map);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(
      () => fetchResources(searchQuery || urlRoleKey, dimFilter, levelFilter),
      searchQuery ? 350 : 0,
    );
    return () => {
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
    };
  }, [searchQuery, dimFilter, levelFilter, urlRoleKey, fetchResources]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleMarkComplete = async (resourceId: string) => {
    if (!user) return;
    const current = progress[resourceId]?.status;
    const newStatus = current === "completed" ? "in_progress" : "completed";
    setProgress((v) => ({
      ...v,
      [resourceId]: { ...v[resourceId], status: newStatus },
    }));
    try {
      await fetch(`/api/learning/resources/${resourceId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setProgress((v) => ({
        ...v,
        [resourceId]: { ...v[resourceId], status: current ?? "not_started" },
      }));
    }
    // Trigger outcome tracker when newly marking as complete
    if (newStatus === "completed") {
      const res = resources.find(r => r.id === resourceId);
      setOutcomeModal({ courseId: resourceId, courseTitle: res?.title ?? resourceId });
    }
  };

  const handleBookmark = async (resourceId: string) => {
    if (!user) return;
    const current = progress[resourceId]?.isBookmarked;
    setProgress((v) => ({
      ...v,
      [resourceId]: { ...v[resourceId], isBookmarked: !current },
    }));
    try {
      await fetch(`/api/learning/resources/${resourceId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ isBookmarked: !current }),
      });
    } catch {}
  };

  const handleGeneratePath = async () => {
    const roleKey = roleKeyInput.trim() || urlRoleKey || "software_engineer";
    setGenerating(true);
    setGenerateError("");
    setGeneratedPath(null);
    try {
      const res = await fetch("/api/learning-paths/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGeneratedPath(data.data ?? data);
    } catch (e: any) {
      setGenerateError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-wrap" style={{ background: "var(--bg)" }}>
      <div className="container" style={{ maxWidth: 1280 }}>
        {/* Premium Header */}
        <div className="section-hero reveal" style={{ marginBottom: '48px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
          <div>
            <div className="badge badge-cyan" style={{ marginBottom: '16px' }}>
              Resilience Node
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 4.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 0.95, marginBottom: '16px' }}>
              ADAPTATION <br />
              <span className="gradient-text-cyan" style={{ fontStyle: 'italic' }}>
                REPOSITORY
              </span>
            </h1>
            <p style={{ color: 'var(--text-2)', fontWeight: 500, maxWidth: 480, lineHeight: 1.6 }}>
              Curated intelligence for high-density human skills — leadership,
              empathy, and strategic synthesis.
            </p>
          </div>

          {user && (
            <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div>
                <div className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>
                  Absorbed
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>
                  {
                    Object.values(progress).filter(
                      (p) => p.status === "completed",
                    ).length
                  }
                </div>
              </div>
              <div style={{ width: 1, height: 48, background: 'var(--border)' }} />
              <div>
                <div className="label-xs" style={{ marginBottom: '8px', color: 'var(--text-3)' }}>
                  Bookmarked
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--cyan)' }}>
                  {Object.values(progress).filter((p) => p.isBookmarked).length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cyber Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '48px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
          {[
            { key: "all", icon: BookOpen, label: "DATABASE" },
            { key: "generate", icon: Sparkles, label: "AI PATH" },
            { key: "bookmarks", icon: BookMarked, label: "SAVED" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === key ? '2px solid var(--cyan)' : '2px solid transparent',
                color: activeTab === key ? 'var(--text)' : 'var(--text-2)',
                fontSize: '0.85rem',
                fontWeight: activeTab === key ? 800 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                marginBottom: '-1px'
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* ── SEARCH & FILTERS ── */}
        {activeTab === "all" && (
          <div style={{ marginBottom: '40px' }}>
            <div className="input-wrap reveal" style={{ marginBottom: '24px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="SCAN://LEADERSHIP_EMPATHY_STRATEGY..."
                className="input"
                style={{ paddingLeft: '48px', fontFamily: 'var(--font-mono)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="reveal" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {DIM_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setDimFilter(dimFilter === f.key ? "" : f.key)}
                  className={`badge ${dimFilter === f.key ? 'badge-cyan' : 'badge-ghost'}`}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── RESOURCE GRID ── */}
        {activeTab === "all" &&
          (loading ? (
            <div className="grid-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="skeleton"
                  style={{ height: 280, borderRadius: 'var(--radius-lg)' }}
                />
              ))}
            </div>
          ) : (
            <div className="grid-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="card card-hover reveal flex flex-col"
                  style={{ display: 'flex', flexDirection: 'column', padding: '32px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <span
                      className={`badge ${resource.level === 'beginner' ? 'badge-emerald' : resource.level === 'intermediate' ? 'badge-amber' : 'badge-red'}`}
                    >
                      {resource.level}
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleBookmark(resource.id)}
                        className="btn-icon"
                        style={{ color: progress[resource.id]?.isBookmarked ? 'var(--amber)' : 'var(--text-3)' }}
                      >
                        <Star size={18} fill={progress[resource.id]?.isBookmarked ? "currentColor" : "none"} />
                      </button>
                      {user && (
                        <button
                          onClick={() => handleMarkComplete(resource.id)}
                          className="btn-icon"
                          style={{ color: progress[resource.id]?.status === "completed" ? 'var(--emerald)' : 'var(--text-3)' }}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px', lineHeight: 1.25 }}>
                    {resource.title}
                  </h3>
                  <p className="label-xs" style={{ color: 'var(--text-3)', marginBottom: '32px' }}>
                    {resource.provider}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-2)' }}>
                      {resource.durationHours && (
                        <span className="label-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {resource.durationHours}H
                        </span>
                      )}
                      <span className="label-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={12} /> {resource.language.toUpperCase()}
                      </span>
                    </div>
                    <a
                      href={resource.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label-xs"
                      style={{ color: 'var(--cyan)', fontWeight: 800, textDecoration: 'none' }}
                    >
                      ACCESS →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {/* ── AI PATH GENERATOR ── */}
        {activeTab === "generate" && (
          <div className="reveal" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="card" style={{ padding: '48px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <Sparkles size={24} style={{ color: 'var(--cyan)' }} />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900 }}>
                  AI AGENTIC PATHWAY
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="input-wrap">
                  <label className="input-label">Target Occupational Key</label>
                  <input
                    type="text"
                    value={roleKeyInput || urlRoleKey}
                    onChange={(e) => setRoleKeyInput(e.target.value)}
                    className="input"
                    placeholder="ROLE://SOFTWARE_ARCHITECT"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {generateError && (
                  <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', color: 'var(--red)', fontSize: '0.85rem', fontWeight: 600 }}>
                    ERROR: {generateError}
                  </div>
                )}
                <button
                  onClick={handleGeneratePath}
                  disabled={generating}
                  className="btn btn-primary btn-full btn-lg"
                >
                  {generating ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      INITIALIZING SYNTHESIS...
                    </>
                  ) : (
                    <>
                      <Zap size={16} /> GENERATE PATHWAY
                    </>
                  )}
                </button>
              </div>
            </div>

            {generatedPath && (
              <div className="card reveal" style={{ padding: '40px', background: 'rgba(0,240,255,0.02)', border: '1px solid rgba(0,240,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                  <Target size={24} style={{ color: 'var(--cyan)' }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900 }}>{generatedPath.title}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {generatedPath.resources.map((item, i) => (
                    <div
                      key={i}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px', background: 'var(--bg-raised)' }}
                    >
                      <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,240,255,0.1)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>
                          {item.resource.title}
                        </div>
                        <div className="label-xs" style={{ color: 'var(--text-3)' }}>
                          {item.resource.provider} · {item.resource.level}
                        </div>
                      </div>
                      <a
                        href={item.resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        ACCESS
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learning outcome tracker modal — fires when a course is marked complete */}
      {outcomeModal && (
        <LearningOutcomeTracker
          open={!!outcomeModal}
          onClose={() => setOutcomeModal(null)}
          courseId={outcomeModal.courseId}
          courseTitle={outcomeModal.courseTitle}
          onSaved={() => setOutcomeModal(null)}
        />
      )}
    </div>
  );
};
