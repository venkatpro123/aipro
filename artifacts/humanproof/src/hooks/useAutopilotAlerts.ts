// useAutopilotAlerts.ts — Realtime subscription + REST fetch for autopilot alerts.
//
// Subscribes to user_autopilot_alerts via Supabase Realtime so new alerts
// arrive instantly without polling. Also fetches existing unread alerts on mount.
//
// Mirrors the pattern in useCompanySignalSubscription.ts.

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export interface AutopilotAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'info';
  headline: string;
  body: string | null;
  action_route: string | null;
  action_label: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface UseAutopilotAlertsReturn {
  alerts: AutopilotAlert[];
  unreadCount: number;
  markRead: (alertId: string) => Promise<void>;
  dismiss: (alertId: string) => Promise<void>;
  isLoading: boolean;
}

const CHANNEL_ID = 'autopilot-alerts';

export function useAutopilotAlerts(): UseAutopilotAlertsReturn {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AutopilotAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch existing alerts on mount ────────────────────────────────────────
  const fetchAlerts = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_autopilot_alerts')
      .select('id,alert_type,severity,headline,body,action_route,action_label,is_read,is_dismissed,created_at,expires_at')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      // Filter out expired alerts client-side
      const now = Date.now();
      const valid = data.filter(a =>
        !a.expires_at || new Date(a.expires_at).getTime() > now
      );
      setAlerts(valid as AutopilotAlert[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    const userId = user.id;
    setIsLoading(true);
    void fetchAlerts(userId);

    // ── Realtime subscription ─────────────────────────────────────────────
    const channel = supabase
      .channel(CHANNEL_ID)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_autopilot_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newAlert = payload.new as AutopilotAlert;
          // Deduplicate and prepend
          setAlerts(prev => {
            if (prev.some(a => a.id === newAlert.id)) return prev;
            return [newAlert, ...prev];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_autopilot_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as AutopilotAlert;
          setAlerts(prev =>
            updated.is_dismissed
              ? prev.filter(a => a.id !== updated.id)
              : prev.map(a => (a.id === updated.id ? updated : a)),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, fetchAlerts]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markRead = useCallback(async (alertId: string) => {
    // Optimistic update
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, is_read: true } : a)));

    await supabase
      .from('user_autopilot_alerts')
      .update({ is_read: true })
      .eq('id', alertId);
  }, []);

  const dismiss = useCallback(async (alertId: string) => {
    // Optimistic update
    setAlerts(prev => prev.filter(a => a.id !== alertId));

    await supabase
      .from('user_autopilot_alerts')
      .update({ is_dismissed: true })
      .eq('id', alertId);
  }, []);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return { alerts, unreadCount, markRead, dismiss, isLoading };
}
