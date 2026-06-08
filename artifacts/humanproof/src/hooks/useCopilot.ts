// useCopilot.ts — Conversation state + LLM-powered answers with deterministic fallback
import { useState, useCallback, useEffect, useRef } from 'react';
import { answerQuestion, answerWithLLM, getSuggestedQuestions } from '../services/copilotService';
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

export function useCopilot(ctx: CopilotContext, userId?: string) {
  const [messages, setMessages] = useState<CopilotMessage[]>(loadSessionMessages);
  const [isThinking, setIsThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => getSuggestedQuestions(ctx));

  // Keep a ref to the latest messages so sendMessage can read history without
  // being a stale closure — avoids setMessages hacks
  const messagesRef = useRef<CopilotMessage[]>(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    setSuggestions(getSuggestedQuestions(ctx));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    setMessages(prev => [...prev, userMsg, thinkingMsg]);
    setIsThinking(true);

    // Build conversation history from the ref (includes new userMsg, excludes thinking)
    const history = [...messagesRef.current, userMsg]
      .filter(m => !m.isThinking)
      .map(m => ({ role: m.role as 'user' | 'copilot', text: m.text }));

    let response;
    if (userId) {
      response = await answerWithLLM(history, ctx, userId);
    } else {
      await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
      response = answerQuestion(text, ctx);
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, isThinking, userId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const sendSuggestion = useCallback((q: string) => {
    sendMessage(q);
  }, [sendMessage]);

  return { messages, isThinking, suggestions, sendMessage, clearMessages, sendSuggestion };
}
