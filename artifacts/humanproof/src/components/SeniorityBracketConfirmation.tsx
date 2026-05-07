// SeniorityBracketConfirmation.tsx
//
// Wraps deriveSeniorityBracket output with a one-time user confirmation step.
//
// STATE MACHINE
// ─────────────
//   pending   → first encounter; show "Is this right?" prompt
//   picking   → user clicked "Adjust"; show all-bracket grid
//   confirmed → user clicked "Yes, that's right"; show compact badge
//   overridden→ user picked a different bracket; show compact + "Adjusted" badge
//
// PERSISTENCE
// ───────────
//   Choice is written to localStorage key hp_seniority_bracket_{workTypeKey}.
//   On remount (page refresh / tab switch) the stored choice is replayed and
//   onBracketResolved fires immediately — no re-prompting.
//   If derivedBracket changes (user re-runs audit with different inputs), stored
//   state is ignored and the prompt reappears.
//
// ANALYTICS
// ─────────
//   Every confirmation and override is inserted into seniority_bracket_overrides.
//   The was_override column distinguishes "confirmed derived" (was_override=false)
//   from "user picked differently" (was_override=true).
//   Admin query: SELECT * FROM bracket_override_rates WHERE override_rate_pct > 20;
//   Any row returned indicates a systematic derivation error for that bracket.

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Check, ChevronDown, X } from 'lucide-react';
import {
  BRACKET_ORDER,
  BRACKET_LABELS,
  type SeniorityBracket,
} from '@/services/seniorityActionEngine';
import { supabase } from '@/utils/supabase';

// ── Display names used in the confirmation headline ──────────────────────────

const BRACKET_HEADLINE: Record<SeniorityBracket, string> = {
  junior:    'Junior / Early-Career',
  mid:       'Mid-Level',
  senior:    'Senior',
  principal: 'Principal / Executive',
};

// ── localStorage helpers ──────────────────────────────────────────────────────

interface StoredBracketState {
  status:           'confirmed' | 'overridden';
  derivedBracket:   SeniorityBracket;
  effectiveBracket: SeniorityBracket;
  confirmedAt:      number;
}

function lsKey(workTypeKey: string): string {
  return `hp_seniority_bracket_${workTypeKey.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
}

function readStored(workTypeKey: string): StoredBracketState | null {
  try {
    const raw = localStorage.getItem(lsKey(workTypeKey));
    return raw ? (JSON.parse(raw) as StoredBracketState) : null;
  } catch { return null; }
}

function writeStored(workTypeKey: string, s: StoredBracketState): void {
  try { localStorage.setItem(lsKey(workTypeKey), JSON.stringify(s)); } catch { /* ignore */ }
}

function clearStored(workTypeKey: string): void {
  try { localStorage.removeItem(lsKey(workTypeKey)); } catch { /* ignore */ }
}

// ── Session ID (for override frequency analytics) ────────────────────────────

function getSessionId(): string {
  const KEY = 'hp_session_id';
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(KEY, id);
    return id;
  } catch { return 'unknown'; }
}

// ── Supabase logging (fire-and-forget) ───────────────────────────────────────

function logBracketEvent(
  originalBracket: SeniorityBracket,
  effectiveBracket: SeniorityBracket,
  workTypeKey: string,
  riskScore: number,
): void {
  if (!supabase) return;
  supabase
    .from('seniority_bracket_overrides')
    .insert({
      session_id:         getSessionId(),
      original_bracket:   originalBracket,
      overridden_bracket: effectiveBracket,
      was_override:       originalBracket !== effectiveBracket,
      work_type_key:      workTypeKey,
      risk_score:         riskScore,
    })
    .then(() => {}, () => {}); // ignore errors
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface SeniorityBracketConfirmationProps {
  derivedBracket:     SeniorityBracket;
  signals:            string[];
  workTypeKey:        string;
  riskScore:          number;
  /** Called immediately on mount if a stored choice exists, and after any
   *  new user confirmation or override. Parent uses this to drive downstream
   *  recommendation generation. */
  onBracketResolved:  (bracket: SeniorityBracket) => void;
}

type UIState = 'pending' | 'picking' | 'confirmed' | 'overridden';

export const SeniorityBracketConfirmation: React.FC<SeniorityBracketConfirmationProps> = ({
  derivedBracket,
  signals,
  workTypeKey,
  riskScore,
  onBracketResolved,
}) => {
  const [uiState, setUIState]               = useState<UIState>('pending');
  const [effectiveBracket, setEffective]    = useState<SeniorityBracket>(derivedBracket);

  // On mount: replay any stored choice (same derivedBracket only)
  useEffect(() => {
    const stored = readStored(workTypeKey);
    if (stored && stored.derivedBracket === derivedBracket) {
      setUIState(stored.status);
      setEffective(stored.effectiveBracket);
      onBracketResolved(stored.effectiveBracket);
    }
    // derivedBracket changed → treat as fresh audit, stay pending
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workTypeKey, derivedBracket]);

  const confirm = useCallback(() => {
    const state: StoredBracketState = {
      status: 'confirmed', derivedBracket,
      effectiveBracket: derivedBracket, confirmedAt: Date.now(),
    };
    writeStored(workTypeKey, state);
    setEffective(derivedBracket);
    setUIState('confirmed');
    onBracketResolved(derivedBracket);
    logBracketEvent(derivedBracket, derivedBracket, workTypeKey, riskScore);
  }, [derivedBracket, workTypeKey, riskScore, onBracketResolved]);

  const applyOverride = useCallback((bracket: SeniorityBracket) => {
    const state: StoredBracketState = {
      status: 'overridden', derivedBracket,
      effectiveBracket: bracket, confirmedAt: Date.now(),
    };
    writeStored(workTypeKey, state);
    setEffective(bracket);
    setUIState('overridden');
    onBracketResolved(bracket);
    logBracketEvent(derivedBracket, bracket, workTypeKey, riskScore);
  }, [derivedBracket, workTypeKey, riskScore, onBracketResolved]);

  const reset = useCallback(() => {
    clearStored(workTypeKey);
    setEffective(derivedBracket);
    setUIState('pending');
    onBracketResolved(derivedBracket);
  }, [derivedBracket, workTypeKey, onBracketResolved]);

  // ── Pending: "Is this right?" prompt ──────────────────────────────────────
  if (uiState === 'pending') {
    return (
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-4 mb-4">
        <div className="flex items-start gap-3">
          <Brain className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground mb-1">
              Based on your inputs, we've classified you as:
            </p>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-black text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2.5 py-1 rounded-lg">
                {BRACKET_HEADLINE[derivedBracket]}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mb-1 leading-relaxed">
              Based on: {signals.join(' · ')}
            </p>
            <p className="text-[11px] text-muted-foreground mb-3">
              This classification shapes your action plan recommendations.
              Does this match your role level?
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={confirm}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Yes, that's right
              </button>
              <button
                type="button"
                onClick={() => setUIState('picking')}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-muted-foreground hover:bg-white/10 hover:text-[var(--text)] transition-colors"
              >
                No, adjust
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Picking: bracket grid ──────────────────────────────────────────────────
  if (uiState === 'picking') {
    return (
      <div className="rounded-xl border border-white/15 bg-white/[0.03] p-4 mb-4">
        <div className="flex items-start gap-3">
          <Brain className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-muted-foreground">Select your actual role level:</p>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => setUIState('pending')}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRACKET_ORDER.map(bracket => {
                const isDerived  = bracket === derivedBracket;
                const isSelected = bracket === effectiveBracket;
                return (
                  <button
                    key={bracket}
                    type="button"
                    onClick={() => applyOverride(bracket)}
                    className="flex flex-col items-start p-2.5 rounded-lg border text-left transition-all"
                    style={{
                      borderColor: isDerived ? 'var(--violet, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                      background:  isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <span className="text-xs font-bold text-[var(--text)] leading-tight">
                      {BRACKET_HEADLINE[bracket]}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      {BRACKET_LABELS[bracket].match(/\(([^)]+)\)/)?.[1] ?? ''}
                    </span>
                    {isDerived && (
                      <span className="mt-1 text-[8px] font-black uppercase tracking-wider text-violet-400">
                        derived
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmed / Overridden: compact badge ─────────────────────────────────
  const isOverridden = uiState === 'overridden';
  return (
    <div className="rounded-xl border border-white/10 p-4 mb-4 bg-white/[0.03]">
      <div className="flex items-start gap-3">
        <Brain className="w-4 h-4 flex-shrink-0 mt-0.5 text-violet-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-muted-foreground">Actions calibrated for</span>
            <span className="text-xs font-black text-violet-300 bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 rounded">
              {BRACKET_LABELS[effectiveBracket]}
            </span>
            {isOverridden ? (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                Adjusted
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                Confirmed
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
            {isOverridden
              ? `Adjusted from ${BRACKET_LABELS[derivedBracket]}. Recommendations reflect ${BRACKET_LABELS[effectiveBracket]} expectations.`
              : `Based on: ${signals.join(' · ')}`}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={reset}
              className="text-[10px] px-2.5 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-[var(--text)] transition-colors font-mono"
            >
              {isOverridden ? `Reset to derived (${BRACKET_LABELS[derivedBracket]})` : 'Reconsider'}
            </button>
            <button
              type="button"
              onClick={() => setUIState('picking')}
              className="text-[10px] px-2.5 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-[var(--text)] transition-colors font-mono"
            >
              Change bracket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
