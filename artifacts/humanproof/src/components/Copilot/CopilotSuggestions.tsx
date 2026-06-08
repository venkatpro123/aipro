// CopilotSuggestions.tsx — Contextual question chips with post-intent follow-ups
import { motion } from 'framer-motion';

const INTENT_FOLLOWUPS: Record<string, string[]> = {
  layoff_risk:         ["What's my best escape path?", "How do I reduce this score?", "What should I do today?"],
  ai_displacement:     ["What skills protect me from AI?", "How future-proof is my role?"],
  salary_comp:         ["What's my negotiation leverage?", "How do I ask for a raise?", "Am I underpaid?"],
  leave_quit:          ["How much runway do I have?", "What's my top escape path?"],
  upskill_learn:       ["What certifications help most?", "How do I build a portfolio?"],
  financial_runway:    ["How do I extend my runway?", "What's my severance entitlement?"],
  job_search:          ["How do I get warm referrals?", "Which companies are hiring now?"],
  networking:          ["Who should I reach out to first?", "How do I get a warm intro?"],
  promotion_internal:  ["Am I in a golden window now?", "What skills do I need to move up?"],
  market_intel:        ["Where is demand highest for my role?", "When should I make my move?"],
  today_action:        ["What's next after this action?", "How long will this take?"],
};

interface Props {
  suggestions: string[];
  onSelect: (q: string) => void;
  disabled?: boolean;
  lastIntent?: string;
}

export function CopilotSuggestions({ suggestions, onSelect, disabled, lastIntent }: Props) {
  // If we have a last intent with follow-ups, prefer those; otherwise use default suggestions
  const chips = lastIntent && INTENT_FOLLOWUPS[lastIntent]
    ? INTENT_FOLLOWUPS[lastIntent]
    : suggestions;

  if (!chips.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {chips.map((q, i) => (
        <motion.button
          key={q}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => !disabled && onSelect(q)}
          disabled={disabled}
          style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.65)', cursor: disabled ? 'default' : 'pointer',
            whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit',
            opacity: disabled ? 0.5 : 1,
          }}
          onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.color = 'var(--cyan)'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
        >
          {q}
        </motion.button>
      ))}
    </div>
  );
}
