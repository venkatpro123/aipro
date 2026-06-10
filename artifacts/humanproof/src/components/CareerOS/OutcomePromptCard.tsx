// OutcomePromptCard.tsx — Phase 5 (Career OS)
//
// Closes the learning loop. When an audit is 30/90/180 days old and the user
// hasn't reported what happened, this surfaces a single low-friction prompt:
//   "30 days ago you audited Acme. What's happened since?"
// The answer feeds user_prediction_outcomes via recordExtendedOutcome(), which
// is the ground-truth signal that calibrates future predictions.
//
// Self-contained: fetches due prompts on mount, shows the most overdue one,
// advances to the next on answer, and renders null when nothing is due.

import { useEffect, useState } from "react";
import { fetchDuePrompts, recordExtendedOutcome, type DuePrompt, type OutcomeLabel } from "../../services/outcomeService";

const OUTCOME_OPTIONS: Array<{ label: string; value: OutcomeLabel; emoji: string }> = [
  { label: "Nothing yet",       value: "no_layoff",              emoji: "➖" },
  { label: "Recruiter interest", value: "interview_generated",   emoji: "📞" },
  { label: "Interviewing",      value: "interview_generated",    emoji: "💬" },
  { label: "Changed jobs",      value: "successful_transition",  emoji: "🚀" },
  { label: "Promoted",          value: "promoted",               emoji: "📈" },
  { label: "Was laid off",      value: "layoff_occurred",        emoji: "⚠️" },
];

export function OutcomePromptCard() {
  const [prompts, setPrompts] = useState<DuePrompt[]>([]);
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDuePrompts()
      .then(due => { if (!cancelled) setPrompts(due); })
      .catch(() => { /* no prompts — stays empty */ });
    return () => { cancelled = true; };
  }, []);

  if (dismissed || prompts.length === 0 || idx >= prompts.length) return null;

  const prompt = prompts[idx];

  const handleAnswer = async (value: OutcomeLabel) => {
    setSubmitting(true);
    try {
      await recordExtendedOutcome(prompt.audit_id, { outcomeLabel: value });
    } catch { /* best-effort — advance regardless so we don't trap the user */ }
    setSubmitting(false);
    // Advance to the next due prompt, or close out.
    if (idx + 1 < prompts.length) setIdx(idx + 1);
    else setDismissed(true);
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "16px 18px",
        borderRadius: 12,
        background: "rgba(16,185,129,0.05)",
        border: "1px solid rgba(16,185,129,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "rgba(16,185,129,0.8)", letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "var(--font-mono, monospace)" }}>
          📋 {prompt.prompt_milestone}-Day Check-in
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}
        >
          Later ✕
        </button>
      </div>

      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.78)", lineHeight: 1.45, marginBottom: 4 }}>
        {prompt.prompt_milestone} days ago you audited {prompt.company_name}
        {prompt.role_title ? ` (${prompt.role_title})` : ""}.
      </div>
      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>
        What's happened since? Your answer makes every future prediction sharper.
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {OUTCOME_OPTIONS.map(opt => (
          <button
            key={opt.label}
            type="button"
            disabled={submitting}
            onClick={() => handleAnswer(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 13px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.11)",
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              if (submitting) return;
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.4)";
              (e.currentTarget as HTMLElement).style.color = "#10b981";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.11)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
            }}
          >
            <span>{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {prompts.length > 1 && (
        <div style={{ marginTop: 10, fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono, monospace)" }}>
          {idx + 1} of {prompts.length} check-ins
        </div>
      )}
    </div>
  );
}
