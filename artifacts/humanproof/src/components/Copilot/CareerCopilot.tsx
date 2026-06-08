// CareerCopilot.tsx — Full copilot chat UI
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useLayoff } from '../../context/LayoffContext';
import { useAuth } from '../../context/AuthContext';
import type { HybridResult } from '../../types/hybridResult';
import { useCopilot } from '../../hooks/useCopilot';
import { CopilotMessageBubble } from './CopilotMessage';
import { CopilotInput } from './CopilotInput';
import { CopilotSuggestions } from './CopilotSuggestions';
import { fetchUserProfile, type UserProfile } from '../../services/userProfileService';

export function CareerCopilot() {
  const { state } = useLayoff();
  const { user } = useAuth();
  const scoreResult = state.scoreResult as HybridResult | null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserProfile().then(setUserProfile).catch(() => {});
  }, [user?.id]);

  const ctx = {
    hybridResult: scoreResult,
    userProfile,
  };

  const { messages, isThinking, suggestions, sendMessage, clearMessages, sendSuggestion } = useCopilot(ctx, user?.id);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isThinking]);

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 0 16px 0', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--cyan) 0%, #7c3aed 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Career Copilot</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {scoreResult ? `Score ${Math.round(scoreResult.total)}/100 · ${scoreResult.tier?.label ?? 'Analyzing'}` : 'No audit yet — ask anything to get started'}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 6 }}
            title="Clear conversation"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Message thread */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '20px 0', display: 'flex',
          flexDirection: 'column', gap: 16, minHeight: 0,
        }}
      >
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '40px 20px' }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
              Hi{user?.email ? `, ${user.email.split('@')[0]}` : ''}! I'm your Career Copilot.
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              {scoreResult
                ? `I have your audit data. Ask me anything about your risk, salary, strategy, skills, or next steps.`
                : `I'll help you navigate your career risk and opportunities. Run your first audit to unlock personalized answers.`}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <CopilotMessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
      </div>

      {/* Suggestion chips — shown only when few messages */}
      {(isEmpty || messages.length <= 4) && (() => {
        const lastCopilotMsg = [...messages].reverse().find(m => m.role === 'copilot' && !m.isThinking);
        const lastIntent = lastCopilotMsg?.intent;
        const label = lastIntent && lastIntent !== 'llm' && lastIntent !== 'fallback'
          ? 'Follow-up questions'
          : 'Suggested questions';
        return (
          <div style={{ padding: '12px 0', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </div>
            <CopilotSuggestions
              suggestions={suggestions}
              onSelect={sendSuggestion}
              disabled={isThinking}
              lastIntent={lastIntent}
            />
          </div>
        );
      })()}

      {/* Input */}
      <div style={{ flexShrink: 0, paddingTop: 8 }}>
        <CopilotInput onSend={sendMessage} disabled={isThinking} />
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 8 }}>
          Powered by your live career data · Session memory preserved
        </div>
      </div>
    </div>
  );
}
