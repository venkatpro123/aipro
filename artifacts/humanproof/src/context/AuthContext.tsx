import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// v40 hardening: shared client-state cleanup. Called by `signOut()` and by
// the `onAuthStateChange` handler on cross-tab SIGNED_OUT events so both
// paths converge on the same scrub. Explicit allowlist — does not touch
// device-bound prefs (theme, language).
async function clearClientSessionState(): Promise<void> {
  if (typeof window === 'undefined') return;

  const localKeysToClear = [
    'hp.v34.firstAuditSeen',
    'hp.quickCapture.done',
    'hp_score_history',
    'hp_skill_selections',
    'hp_skill_breakdown',
    'hp_roadmap_start',
    'hp_roadmap_start_date',
    'hp_roadmap_progress',
    'hp_journal_entries',
    'hp_quiz_progress',
    'hp_score_goal',
    'hp_ever_completed_job',
    'hp_ever_completed_skill',
    'hp_ever_completed_hii',
    'humanproof_events_buffer',
  ];
  try {
    for (const k of localKeysToClear) localStorage.removeItem(k);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hp_ensemble_')) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch { /* private mode / quota — best effort */ }

  try {
    sessionStorage.removeItem('humanproof_distinct_id');
    sessionStorage.removeItem('humanproof_session_id');
  } catch { /* ignore */ }

  try {
    const req = indexedDB.deleteDatabase('humanproof-audit-cache');
    req.onerror = () => undefined;
  } catch { /* ignore */ }
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // v40 hardening: handle the full event taxonomy. Previously the
    // `_event` arg was ignored entirely — token expiry, password reset,
    // and remote sign-out (other tab / other device) all just silently
    // updated state. Now we (a) act on SIGNED_OUT in any tab by clearing
    // per-user client state so a shared device cannot carry over, and
    // (b) emit a global `hp.session.expired` event when a TOKEN_REFRESHED
    // resolved to a null session so service callers can stop pending work.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (typeof window === 'undefined') return;
      if (event === 'SIGNED_OUT') {
        // Cross-tab sign-out: clear state without re-calling supabase.auth.signOut.
        try { void clearClientSessionState(); } catch { /* ignore */ }
        try { window.dispatchEvent(new Event('hp.session.signed_out')); } catch { /* ignore */ }
      } else if (event === 'TOKEN_REFRESHED' && !nextSession) {
        try { window.dispatchEvent(new Event('hp.session.expired')); } catch { /* ignore */ }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // v40 hardening: when a user logs out we must clear *all* session-bound
  // client state. Previously only the Supabase token was revoked — the next
  // user on a shared device would inherit the prior user's audit cache,
  // score history, profile capture flags, analytics distinct_id, and the
  // realtime buffered-events queue. That is a privacy leak and produces
  // wrong personalization for the new user. Cleared keys are explicit
  // (no wildcard removeItem) so that genuinely device-bound prefs (like
  // a dark-mode setting) are preserved.
  const signOut = async () => {
    // Tear down any open realtime channels FIRST — otherwise the prior
    // user's WebSocket stays open under the old JWT until React unmounts
    // the subscribed components, which on a shared device can persist
    // across the next user's login until a hard nav.
    try { supabase.removeAllChannels(); } catch { /* ignore */ }
    await supabase.auth.signOut();
    await clearClientSessionState();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
