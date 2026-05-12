// supabaseClient.ts
// Server-side Supabase client. Uses service_role key — bypasses RLS for INSERT
// into scrape_jobs, breaking_news_events, live_signals_v2, etc.
//
// NEVER expose this client to the frontend. The service_role key is in
// `fly secrets` and must not leave the Fly.io machine.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { config } from './config.js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as any },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    },
  });
  return _client;
}
