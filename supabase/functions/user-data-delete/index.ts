// user-data-delete/index.ts
// GDPR Article 17 — right to erasure ("right to be forgotten").
//
// Deletes all personal data for the authenticated user from:
//   - layoff_scores
//   - score_trajectory
//   - user_prediction_outcomes (bypasses the upo_no_delete RLS policy
//     via the SECURITY DEFINER delete_user_data_gdpr() function)
//   - user_profiles
//
// Creates a permanent audit record in user_data_deletion_requests so the
// 30-day SLA (GDPR Art. 12.3) can be monitored and confirmed.
//
// Security model:
//   - User must present a valid JWT (RLS confirms identity)
//   - The EF validates the JWT, extracts user_id, and calls the
//     SECURITY DEFINER RPC — the user never calls the RPC directly
//   - The RPC runs as the function owner (postgres) to bypass table-level
//     delete restrictions (necessary for user_prediction_outcomes)
//
// Response:
//   { request_id, completed_at, tables_cleared: { table: rowCount, ... } }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/otel.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'POST required.' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Authenticate with the user's JWT to confirm identity
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired session.' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  // Optional: parse confirmation token from body
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  // Require explicit confirmation phrase to prevent accidental deletion
  const confirmation = (body.confirmation as string | undefined) ?? '';
  if (confirmation.toLowerCase().trim() !== 'delete my data') {
    return new Response(
      JSON.stringify({
        error: 'Confirmation required.',
        hint: 'Send { "confirmation": "delete my data" } in the request body.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const userId     = user.id;
  const userEmail  = user.email ?? null;

  // Hash email for audit trail (SHA-256, not stored plain)
  let emailSha256: string | null = null;
  if (userEmail) {
    try {
      const encoded = new TextEncoder().encode(userEmail.toLowerCase());
      const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
      emailSha256 = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch { /* non-fatal */ }
  }

  // Call the SECURITY DEFINER function via service_role client
  // (the RPC bypasses table-level RLS restrictions)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await adminClient.rpc('delete_user_data_gdpr', {
      p_user_id:         userId,
      p_email_sha256:    emailSha256,
      p_deletion_method: 'user_self_service',
    });

    if (error) throw new Error(`RPC error: ${error.message}`);

    // Also delete the Supabase Auth user account (hard delete from auth.users)
    // This cascades to all tables with ON DELETE CASCADE FK on auth.users.
    // Done AFTER the RPC so the audit record is created first.
    const { error: authDeleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteErr) {
      // Non-fatal: the data has been deleted even if the auth record fails.
      console.warn('[user-data-delete] Auth user delete failed:', authDeleteErr.message);
    }

    return new Response(
      JSON.stringify({
        ok:           true,
        message:      'All personal data has been deleted. Your account has been closed.',
        gdpr_article: 'Art. 17 GDPR — right to erasure',
        request_id:   (data as Record<string, unknown>)?.request_id ?? null,
        completed_at: (data as Record<string, unknown>)?.completed_at ?? new Date().toISOString(),
        tables_cleared: (data as Record<string, unknown>)?.tables_cleared ?? {},
        confirmation_notice:
          'You will not receive an email confirmation as your account (and email address) '
          + 'has been permanently deleted. If you need a deletion certificate, contact '
          + 'privacy@humanproof.ai within 30 days with your former user ID: ' + userId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[user-data-delete] Fatal:', msg);
    return new Response(
      JSON.stringify({
        error:   'Deletion failed. Your data has NOT been deleted.',
        detail:  msg,
        contact: 'privacy@humanproof.ai',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }
});
