// CopilotMessage.tsx — Single message bubble (user or copilot)
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { CopilotMessage as Msg } from '../../hooks/useCopilot';

interface Props {
  message: Msg;
}

function renderMarkdown(text: string) {
  // Bold **text** and preserve newlines — minimal subset
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function CopilotMessageBubble({ message }: Props) {
  const navigate = useNavigate();
  const isUser = message.role === 'user';

  if (message.isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--cyan) 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🤖</div>
        <div style={{
          padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 10,
        alignItems: 'flex-end',
        maxWidth: '100%',
      }}
    >
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--cyan) 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🤖</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '75%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Bubble */}
        <div style={{
          padding: '10px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser
            ? 'linear-gradient(135deg, var(--cyan) 0%, #06b6d4 100%)'
            : 'rgba(255,255,255,0.06)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
          color: isUser ? '#000' : 'rgba(255,255,255,0.85)',
          fontSize: 14,
          lineHeight: 1.6,
          wordBreak: 'break-word',
        }}>
          {isUser ? message.text : renderMarkdown(message.text)}
        </div>

        {/* Tool card deeplink */}
        {!isUser && message.toolCard && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate(message.toolCard!.toolRoute)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)',
              cursor: 'pointer', textAlign: 'left', width: 'fit-content',
              color: 'var(--cyan)', fontSize: 13, fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.08)')}
          >
            <span>{message.toolCard.emoji}</span>
            <span>Open {message.toolCard.toolName}</span>
            <ArrowRight size={13} />
          </motion.button>
        )}

        {/* Timestamp */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', paddingLeft: isUser ? 0 : 2, paddingRight: isUser ? 2 : 0 }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}
