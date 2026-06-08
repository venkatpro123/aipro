// CopilotSuggestions.tsx — Contextual question chips
import { motion } from 'framer-motion';

interface Props {
  suggestions: string[];
  onSelect: (q: string) => void;
  disabled?: boolean;
}

export function CopilotSuggestions({ suggestions, onSelect, disabled }: Props) {
  if (!suggestions.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {suggestions.map((q, i) => (
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
