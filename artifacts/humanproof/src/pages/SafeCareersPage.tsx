import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";

interface CareerStats {
  total: number;
  avgSalary: number;
  topSector: string;
}

interface Career {
  id: string;
  title: string;
  sector: string;
  growth_rate: string;
  avg_salary: number;
  human_factor: number;
  ai_resistance: "High" | "Very High" | "Critical";
  why_safe: string;
  skills: string[];
}

const RESISTANCE_MAP: Record<string, { color: string; bg: string }> = {
  Critical: { color: "var(--cyan)", bg: "var(--cyan-dim)" },
  "Very High": { color: "var(--emerald)", bg: "var(--emerald-dim)" },
  High: { color: "#818cf8", bg: "var(--violet-dim)" },
};

const FALLBACK_CAREERS: Career[] = [
  {
    id: "1",
    title: "Cybersecurity Analyst",
    sector: "Technology",
    growth_rate: "+32%",
    avg_salary: 112000,
    human_factor: 92,
    ai_resistance: "Critical",
    why_safe:
      "Zero-sum offense/defense game; AI cannot anticipate novel attack vectors",
    skills: ["Threat Hunting", "Incident Response", "Security Architecture"],
  },
  {
    id: "2",
    title: "Registered Nurse",
    sector: "Healthcare",
    growth_rate: "+6%",
    avg_salary: 82600,
    human_factor: 95,
    ai_resistance: "Critical",
    why_safe:
      "Hands-on patient care requires human touch and real-time clinical judgment",
    skills: ["Patient Assessment", "Clinical Decision Making"],
  },
  {
    id: "3",
    title: "Mental Health Counselor",
    sector: "Healthcare",
    growth_rate: "+15%",
    avg_salary: 52400,
    human_factor: 97,
    ai_resistance: "Critical",
    why_safe:
      "Deep emotional intelligence and therapeutic rapport cannot be replicated",
    skills: ["Therapeutic Techniques", "Crisis Intervention"],
  },
  {
    id: "4",
    title: "Special Education Teacher",
    sector: "Education",
    growth_rate: "+4%",
    avg_salary: 64000,
    human_factor: 94,
    ai_resistance: "Critical",
    why_safe: "Individualized accommodation require human judgment",
    skills: ["IEP Development", "Behavioral Support"],
  },
  {
    id: "5",
    title: "Physical Therapist",
    sector: "Healthcare",
    growth_rate: "+17%",
    avg_salary: 97000,
    human_factor: 93,
    ai_resistance: "Critical",
    why_safe: "Manual therapy requires physical embodiment",
    skills: ["Manual Therapy", "Movement Analysis"],
  },
  {
    id: "6",
    title: "AI Ethics Officer",
    sector: "Technology",
    growth_rate: "+45%",
    avg_salary: 145000,
    human_factor: 85,
    ai_resistance: "Very High",
    why_safe: "Governance and bias auditing require human accountability",
    skills: ["AI Governance", "Bias Auditing"],
  },
  {
    id: "7",
    title: "Social Worker",
    sector: "Healthcare",
    growth_rate: "+9%",
    avg_salary: 58000,
    human_factor: 82,
    ai_resistance: "Very High",
    why_safe: "Case management and advocacy require deep human empathy",
    skills: ["Case Management", "Advocacy"],
  },
  {
    id: "8",
    title: "Electrician",
    sector: "Trades",
    growth_rate: "+6%",
    avg_salary: 61000,
    human_factor: 88,
    ai_resistance: "Very High",
    why_safe: "Installation and troubleshooting require physical presence",
    skills: ["Electrical Installation", "Troubleshooting"],
  },
  {
    id: "9",
    title: "Plumber",
    sector: "Trades",
    growth_rate: "+5%",
    avg_salary: 64000,
    human_factor: 89,
    ai_resistance: "Very High",
    why_safe: "Pipe fitting requires manual dexterity",
    skills: ["Pipe Fitting", "Diagnostic Skills"],
  },
  {
    id: "10",
    title: "HVAC Technician",
    sector: "Trades",
    growth_rate: "+4%",
    avg_salary: 56000,
    human_factor: 86,
    ai_resistance: "Very High",
    why_safe: "System installation requires physical presence",
    skills: ["System Installation", "Refrigeration"],
  },
  {
    id: "11",
    title: "Pilot",
    sector: "Transportation",
    growth_rate: "+5%",
    avg_salary: 160000,
    human_factor: 82,
    ai_resistance: "Very High",
    why_safe: "Aircraft command requires human decision-making",
    skills: ["Flight Operations", "Emergency Response"],
  },
  {
    id: "12",
    title: "Attorney",
    sector: "Legal",
    growth_rate: "+4%",
    avg_salary: 145000,
    human_factor: 72,
    ai_resistance: "Very High",
    why_safe: "Courtroom advocacy requires human judgment",
    skills: ["Legal Strategy", "Litigation"],
  },
  {
    id: "13",
    title: "Data Scientist",
    sector: "Technology",
    growth_rate: "+36%",
    avg_salary: 130000,
    human_factor: 55,
    ai_resistance: "High",
    why_safe: "Model interpretation requires human context",
    skills: ["Statistical Analysis", "ML Modeling"],
  },
  {
    id: "14",
    title: "Product Manager",
    sector: "Technology",
    growth_rate: "+20%",
    avg_salary: 140000,
    human_factor: 58,
    ai_resistance: "High",
    why_safe: "Strategic roadmap requires human synthesis",
    skills: ["Product Strategy", "User Research"],
  },
  {
    id: "15",
    title: "UX Researcher",
    sector: "Technology",
    growth_rate: "+25%",
    avg_salary: 105000,
    human_factor: 60,
    ai_resistance: "High",
    why_safe: "Qualitative insights require human connection",
    skills: ["User Interviews", "Usability Testing"],
  },
  {
    id: "16",
    title: "HR Business Partner",
    sector: "People Ops",
    growth_rate: "+8%",
    avg_salary: 85000,
    human_factor: 68,
    ai_resistance: "High",
    why_safe: "Employee relations require emotional intelligence",
    skills: ["Employee Relations", "Conflict Resolution"],
  },
  {
    id: "17",
    title: "Cloud Solutions Architect",
    sector: "Technology",
    growth_rate: "+25%",
    avg_salary: 155000,
    human_factor: 58,
    ai_resistance: "High",
    why_safe: "System design requires architectural judgment",
    skills: ["System Architecture", "Cloud Strategy"],
  },
  {
    id: "18",
    title: "Financial Advisor",
    sector: "Finance",
    growth_rate: "+7%",
    avg_salary: 95000,
    human_factor: 65,
    ai_resistance: "High",
    why_safe: "Wealth planning requires fiduciary trust",
    skills: ["Wealth Planning", "Risk Assessment"],
  },
  {
    id: "19",
    title: "Marketing Director",
    sector: "Marketing",
    growth_rate: "+10%",
    avg_salary: 135000,
    human_factor: 62,
    ai_resistance: "High",
    why_safe: "Brand strategy requires human intuition",
    skills: ["Brand Strategy", "Creative Leadership"],
  },
  {
    id: "20",
    title: "Machine Learning Operations Engineer",
    sector: "Technology",
    growth_rate: "+45%",
    avg_salary: 145000,
    human_factor: 52,
    ai_resistance: "High",
    why_safe: "ML pipeline orchestration requires operational expertise",
    skills: ["MLOps", "Pipeline Orchestration"],
  },
];

const FALLBACK_STATS: CareerStats = {
  total: 20,
  avgSalary: 92000,
  topSector: "Technology",
};

export const SafeCareersPage: React.FC = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // BUG-08: allSettled — a stats endpoint failure must not prevent the careers list from loading.
      const [careersSettled, statsSettled] = await Promise.allSettled([
        fetch("/api/safe-careers"),
        fetch("/api/safe-careers/stats"),
      ]);
      if (careersSettled.status === 'rejected' || (careersSettled.status === 'fulfilled' && !careersSettled.value.ok)) {
        throw new Error("Careers API request failed");
      }
      const careersRes = careersSettled.value;
      // Stats are non-critical — a failed stats fetch degrades gracefully (page renders without stats).
      const statsRes = statsSettled.status === 'fulfilled' && statsSettled.value.ok ? statsSettled.value : null;

      const careersData = await careersRes.json();
      const statsData   = statsRes ? await statsRes.json().catch(() => null) : null;

      // Only use API data if it has entries, otherwise fallback
      if (careersData?.length > 0) {
        setCareers(careersData);
        setStats(statsData ?? FALLBACK_STATS);
      } else {
        setCareers(FALLBACK_CAREERS);
        setStats(FALLBACK_STATS);
      }
    } catch (err) {
      console.warn("API unavailable, using offline data:", err);
      // Use fallback data when API fails
      setCareers(FALLBACK_CAREERS);
      setStats(FALLBACK_STATS);
    } finally {
      setLoading(false);
    }
  };

  const sectors = [...new Set(careers.map((c) => c.sector))].sort();
  const filtered = careers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q) ||
      c.skills?.some((s) => s.toLowerCase().includes(q));
    const matchesSector = !selectedSector || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const visibleCareers = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="page-wrap" style={{ background: "var(--bg)" }}>
      <div className="container">
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "48px",
          }}
        >
          <div
            className="badge badge-ghost reveal"
            style={{ width: "fit-content" }}
          >
            Secure Protocol
          </div>
          <h1
            className="reveal"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 0.95,
            }}
          >
            Anti-Fragile
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--text) 0%, var(--text-3) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontStyle: "italic",
              }}
            >
              Careers.
            </span>
          </h1>
          <p
            className="reveal"
            style={{
              color: "var(--text-2)",
              maxWidth: 520,
              lineHeight: 1.7,
              fontWeight: 500,
            }}
          >
            Verified roles with maximum protection from current and projected AI
            automation cycles.
          </p>
        </div>

        {/* Stats Banner */}
        {stats && (
          <div
            className="reveal"
            style={{
              display: "flex",
              gap: "32px",
              flexWrap: "wrap",
              marginBottom: "48px",
            }}
          >
            <div
              className="card"
              style={{ padding: "20px 28px", display: "flex", gap: "24px" }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  className="stat-value"
                  style={{ fontSize: "1.75rem", color: "var(--text)" }}
                >
                  {stats.total}
                </div>
                <div className="stat-label">Safe Roles</div>
              </div>
              <div
                style={{
                  width: 1,
                  background: "var(--border)",
                  margin: "4px 0",
                }}
              />
              <div style={{ textAlign: "center" }}>
                <div
                  className="stat-value"
                  style={{ fontSize: "1.75rem", color: "var(--emerald)" }}
                >
                  ${(stats.avgSalary / 1000).toFixed(0)}k
                </div>
                <div className="stat-label">Avg. Salary</div>
              </div>
              {stats.topSector && (
                <>
                  <div
                    style={{
                      width: 1,
                      background: "var(--border)",
                      margin: "4px 0",
                    }}
                  />
                  <div style={{ textAlign: "center" }}>
                    <div
                      className="stat-value"
                      style={{
                        fontSize: "1.1rem",
                        color: "var(--cyan)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {stats.topSector}
                    </div>
                    <div className="stat-label">Top Sector</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "36px",
          }}
        >
          <div
            className="input-prefix-wrap reveal"
            style={{ flex: 1, minWidth: 240 }}
          >
            <Search size={16} className="input-prefix-icon" />
            <input
              type="text"
              placeholder="Search careers, sectors, skills..."
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="input reveal"
            style={{ width: "auto", minWidth: 180 }}
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Career Grid */}
        {loading ? (
          <div className="grid-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="skeleton"
                style={{ height: 240, borderRadius: "var(--radius-lg)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🔍</div>
            <h3
              style={{
                fontWeight: 700,
                marginBottom: "8px",
                fontSize: "1.1rem",
              }}
            >
              No results found
            </h3>
            <p style={{ color: "var(--text-2)", fontSize: "0.875rem" }}>
              Try a different search or clear filters.
            </p>
          </div>
        ) : (
          <div className="grid-3">
            {visibleCareers.map((career, i) => {
              const r =
                RESISTANCE_MAP[career.ai_resistance] || RESISTANCE_MAP["High"];
              const careerSlug = career.title
                .toLowerCase()
                .replace(/\s+/g, "-");
              return (
                <Link
                  key={career.id}
                  to={`/career/${career.id || careerSlug}`}
                  className={`card card-hover reveal reveal-delay-${(i % 3) + 1}`}
                  style={{
                    padding: "28px",
                    textDecoration: "none",
                    display: "block",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "20px",
                    }}
                  >
                    <span
                      className="badge"
                      style={{
                        color: r.color,
                        background: r.bg,
                        borderColor: `${r.color}33`,
                      }}
                    >
                      {career.ai_resistance}
                    </span>
                    <span
                      className="badge badge-ghost"
                      style={{ fontSize: "0.62rem" }}
                    >
                      {career.growth_rate}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      marginBottom: "4px",
                      lineHeight: 1.2,
                    }}
                  >
                    {career.title}
                  </h3>
                  <p
                    className="label-xs"
                    style={{ marginBottom: "16px", color: "var(--text-3)" }}
                  >
                    {career.sector}
                  </p>

                  {career.why_safe && (
                    <p
                      style={{
                        color: "var(--text-2)",
                        fontSize: "0.8rem",
                        lineHeight: 1.65,
                        marginBottom: "20px",
                      }}
                    >
                      {career.why_safe}
                    </p>
                  )}

                  {career.skills?.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginBottom: "24px",
                      }}
                    >
                      {career.skills.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="badge badge-ghost"
                          style={{ fontSize: "0.6rem" }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "16px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          className="stat-label"
                          style={{ marginBottom: "4px" }}
                        >
                          Human Factor
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 800,
                            fontSize: "1.1rem",
                            color: "var(--cyan)",
                          }}
                        >
                          {career.human_factor}%
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        style={{ color: "var(--text-3)", marginLeft: 8 }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {hasMore && !loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "48px",
              marginBottom: "80px",
            }}
          >
            <button
              onClick={() => setVisibleCount((prev) => prev + 12)}
              className="btn btn-premium reveal"
              style={{ padding: "16px 40px", fontSize: "0.9rem" }}
            >
              Load More Pathways
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
