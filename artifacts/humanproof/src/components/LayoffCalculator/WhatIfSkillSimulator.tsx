import React, { useState, useMemo } from "react";
import { CareerIntelligence } from "../../data/intelligence/types";

interface Props {
  careerIntelligence: CareerIntelligence;
  currentScore: number;
}

interface SimulatedSkill {
  name: string;
  scoreDelta: number;  // negative = risk reduction (good)
  reason: string;
  difficulty: string;
}

/**
 * WhatIfSkillSimulator — Phase 2 Enhancement
 *
 * "What if I learned X?" — lets users select a safe skill from their role's
 * seeded intelligence and instantly see an estimated score delta.
 *
 * Formula:
 *   delta = -round((skill.longTermValue / 100) × 12)
 *   e.g. longTermValue=85 → -10pt reduction in risk
 *
 * The delta is directional/estimated, not a precise recalculation.
 * It's shown with appropriate epistemic language ("estimated reduction").
 */
export const WhatIfSkillSimulator: React.FC<Props> = ({
  careerIntelligence,
  currentScore,
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [showPanel, setShowPanel] = useState(false);

  // Build the skill option list from safe skills in the role's intel.
  // CareerIntelligence.skills.safe is a SafeSkill[] — use whySafe and longTermValue.
  const safeSkills: SimulatedSkill[] = useMemo(() => {
    const safes = careerIntelligence?.skills?.safe;
    if (!safes || !Array.isArray(safes)) return [];
    return safes.slice(0, 8).map((s) => ({
      name: s.skill,
      // Delta formula: higher longTermValue = bigger risk reduction
      scoreDelta: -Math.round(((s.longTermValue ?? 60) / 100) * 12),
      reason: s.whySafe ?? `${s.skill} is an AI-resistant, high-demand skill for this role`,
      difficulty: s.difficulty ?? 'Medium',
    }));
  }, [careerIntelligence]);

  const selected = safeSkills.find((s) => s.name === selectedSkill);
  const projectedScore = selected
    ? Math.max(1, currentScore + selected.scoreDelta)
    : currentScore;
  const reduction = selected ? Math.abs(selected.scoreDelta) : 0;
  const bgColor =
    projectedScore < 35
      ? 'var(--color-emerald-text)'
      : projectedScore < 55
        ? 'var(--color-amber500-text)'
        : 'var(--color-red-text)';

  if (safeSkills.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 24,
        background: "rgba(0,245,255,0.04)",
        border: "1px solid rgba(0,245,255,0.15)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* ── Header (collapsible) ── */}
      <button
        onClick={() => setShowPanel((p) => !p)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "var(--cyan)",
            }}
          >
            🔬 What-If Skill Simulator
          </span>
          <span
            style={{
              background: "rgba(0,245,255,0.12)",
              color: "var(--cyan)",
              borderRadius: 20,
              padding: "1px 8px",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            NEW
          </span>
        </div>
        <span style={{ color: "var(--text-3)", fontSize: "0.9rem" }}>
          {showPanel ? "▲" : "▼"}
        </span>
      </button>

      {showPanel && (
        <div style={{ padding: "4px 18px 18px" }}>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-2)",
              margin: "0 0 16px",
              lineHeight: 1.5,
            }}
          >
            Select a skill below to simulate how adding it to your profile
            would affect your risk score. Results are estimated, not
            recalculated.
          </p>

          {/* ── Skill selector ── */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="whatif-skill-select"
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--text-3)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Select a skill to learn
            </label>
            <select
              id="whatif-skill-select"
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              style={{
                width: "100%",
                background: "var(--alpha-bg-06)",
                border: "1px solid var(--alpha-bg-08)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#e5e7eb",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <option value="" style={{ background: "var(--bg-card)" }}>
                — Pick a skill —
              </option>
              {safeSkills.map((s) => (
                <option
                  key={s.name}
                  value={s.name}
                  style={{ background: "var(--bg-card)" }}
                >
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* ── Simulation result ── */}
          {selected && (
            <div
              style={{
                background: "var(--alpha-bg-04)",
                border: "1px solid var(--alpha-bg-08)",
                borderRadius: 10,
                padding: 16,
                animation: "fadeIn 0.25s ease-in",
              }}
            >
              {/* Score comparison */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                  marginBottom: 14,
                }}
              >
                {/* Current */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "2.2rem",
                      fontWeight: 800,
                      color: 'var(--color-red-text)',
                      fontFamily: "monospace",
                      lineHeight: 1,
                    }}
                  >
                    {currentScore}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 4,
                    }}
                  >
                    Current
                  </div>
                </div>

                {/* Arrow */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ color: 'var(--color-emerald-text)', fontSize: "1.4rem" }}>→</span>
                  <span
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      color: 'var(--color-emerald-text)',
                      borderRadius: 20,
                      padding: "1px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    −{reduction} pts
                  </span>
                </div>

                {/* Projected */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "2.2rem",
                      fontWeight: 800,
                      color: bgColor,
                      fontFamily: "monospace",
                      lineHeight: 1,
                    }}
                  >
                    {projectedScore}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 4,
                    }}
                  >
                    With skill
                  </div>
                </div>
              </div>

              {/* Progress bar showing delta */}
              <div
                style={{
                  height: 6,
                  background: "var(--alpha-bg-08)",
                  borderRadius: 3,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${projectedScore}%`,
                    background: bgColor,
                    borderRadius: 3,
                    transition: "width 0.5s ease-out",
                  }}
                />
              </div>

              {/* Skill reason */}
              <div
                style={{
                  background: "rgba(16,185,129,0.07)",
                  border: "1px solid rgba(16,185,129,0.18)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-2)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  <strong style={{ color: 'var(--color-emerald-text)' }}>Why this helps: </strong>
                  {selected.reason}
                </p>
              </div>

              <p
                style={{
                  fontSize: "0.68rem",
                  color: "var(--alpha-text-30)",
                  textAlign: "center",
                  margin: "10px 0 0",
                  fontStyle: "italic",
                }}
              >
                *Estimated directional reduction — actual impact depends on
                proficiency level and market context.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
