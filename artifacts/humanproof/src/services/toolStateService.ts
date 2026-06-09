// toolStateService.ts — generic per-user per-tool JSON persistence
// Writes to user_tool_state via Supabase. Falls back to localStorage
// for unauthenticated users or when Supabase is unavailable.
//
// Usage:
//   const state = await loadToolState<CompensationToolState>('compensation');
//   await saveToolState('compensation', { ...state, savedOffers: [...] });

import { supabase } from '../utils/supabase';

const LS_PREFIX = 'hp.tool.';

// ── Public API ─────────────────────────────────────────────────────────────────

export async function loadToolState<T>(toolKey: string): Promise<T | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return loadLocalToolState<T>(toolKey);

  try {
    const { data, error } = await supabase
      .from('user_tool_state')
      .select('state_json')
      .eq('user_id', session.user.id)
      .eq('tool_key', toolKey)
      .maybeSingle();

    if (error) throw error;
    return (data?.state_json ?? null) as T | null;
  } catch {
    return loadLocalToolState<T>(toolKey);
  }
}

export async function saveToolState<T>(toolKey: string, state: T): Promise<void> {
  // Always write to localStorage as immediate fallback
  writeLocalToolState(toolKey, state);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  try {
    await supabase
      .from('user_tool_state')
      .upsert(
        { user_id: session.user.id, tool_key: toolKey, state_json: state as object },
        { onConflict: 'user_id,tool_key' },
      );
  } catch {
    // Non-fatal — localStorage copy is the fallback
  }
}

// ── localStorage helpers ────────────────────────────────────────────────────

function lsKey(toolKey: string): string {
  return `${LS_PREFIX}${toolKey}`;
}

function loadLocalToolState<T>(toolKey: string): T | null {
  try {
    const raw = localStorage.getItem(lsKey(toolKey));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLocalToolState<T>(toolKey: string, state: T): void {
  try {
    localStorage.setItem(lsKey(toolKey), JSON.stringify(state));
  } catch {
    // Storage full — non-fatal
  }
}
