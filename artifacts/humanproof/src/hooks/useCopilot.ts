// useCopilot.ts — Conversation state management for Career Copilot
import { useState, useCallback, useEffect } from 'react';
import { answerQuestion, getSuggestedQuestions } from '../services/copilotService';
import type { CopilotContext } from '../services/copilotService';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'copilot';
  text: string;
  toolCard?: { toolName: string; toolRoute: string; emoji: string };
  intent?: string;
  timestamp: number;
  isThinking?: boolean;
}

const SESSION_KEY = 'hp_copilot_messages';
const MAX_MESSAGES = 40;

function loadSessionMessages(): CopilotMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CopilotMessage[]) : [];
  } catch {
    return [];
  }
}

function saveSessionMessages(msgs: CopilotMessage[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
  } catch {
    // storage full — ignore
  }
}

export function useCopilot(ctx: CopilotContext) {
  const [messages, setMessages] = useState<CopilotMessage[]>(loadSessionMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => getSuggestedQuestions(ctx));

  // Update suggestions when context changes (e.g. after audit)
  useEffect(() => {
    setSuggestions(getSuggestedQuestions(ctx));
  }, [ctx.hybridResult?.total]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const thinkingMsg: CopilotMessage = {
      id: `t-${Date.now()}`,
      role: 'copilot',
      text: '',
      timestamp: Date.now(),
      isThinking: true,
    };

    const withUser = (prev: CopilotMessage[]) => [...prev, userMsg, thinkingMsg];
    setMessages(withUser);
    setIsThinking(true);

    // Simulate brief thinking delay (250–600ms) so it doesn't feel instantaneous
    const delay = 250 + Math.random() * 350;
    await new Promise(r => setTimeout(r, delay));

    const response = answerQuestion(text, ctx);

    const copilotMsg: CopilotMessage = {
      id: `c-${Date.now()}`,
      role: 'copilot',
      text: response.text,
      toolCard: response.toolCard,
      intent: response.intent,
      timestamp: Date.now(),
    };

    setMessages(prev => {
      const filtered = prev.filter(m => !m.isThinking);
      const updated = [...filtered, copilotMsg];
      saveSessionMessages(updated);
      return updated;
    });
    setIsThinking(false);
  }, [ctx, isThinking]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const sendSuggestion = useCallback((q: string) => {
    sendMessage(q);
  }, [sendMessage]);

  return { messages, isThinking, suggestions, sendMessage, clearMessages, sendSuggestion };
}
