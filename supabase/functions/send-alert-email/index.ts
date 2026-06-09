// send-alert-email/index.ts
//
// Minimal Resend email wrapper for critical Career OS autopilot alerts.
// Called by evaluate-autopilot-signals EF via fetch() for each critical alert.
//
// Payload:
//   { userId, alertId, headline, body, actionRoute, actionLabel, appUrl }
//
// On success: marks user_autopilot_alerts.delivered_email = true.
//
// Required env vars:
//   RESEND_API_KEY             — Resend API key
//   SUPABASE_URL               — project URL
//   SUPABASE_SERVICE_ROLE_KEY  — service role (reads auth.users.email)
//   FROM_EMAIL                 — sender address, e.g. "HumanShield <noreply@humanshield.app>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { withRun } from '../_shared/otel.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface AlertEmailPayload {
  userId: string;
  alertId: string;
  headline: string;
  body: string | null;
  actionRoute: string | null;
  actionLabel: string | null;
  appUrl: string;
}

Deno.serve((req) =>
  withRun('send-alert-email', req, async (_run) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    let payload: AlertEmailPayload;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { userId, alertId, headline, body, actionRoute, actionLabel, appUrl } = payload;
    if (!userId || !alertId || !headline) {
      return json({ error: 'Missing required fields: userId, alertId, headline' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ── 1. Resolve email address from auth.users ──────────────────────────────
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId);
    if (userErr || !userData?.user?.email) {
      console.error('[send-alert-email] could not resolve email for user', userId, userErr?.message);
      return json({ error: 'User email not found' }, 404);
    }

    const recipientEmail = userData.user.email;
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'HumanShield <noreply@humanshield.app>';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('[send-alert-email] RESEND_API_KEY not configured');
      return json({ error: 'Email service not configured' }, 503);
    }

    // ── 2. Build email ────────────────────────────────────────────────────────
    const actionUrl = actionRoute ? `${appUrl}${actionRoute}` : appUrl;
    const ctaLabel = actionLabel ?? 'Open Career OS';

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#111118;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:8px;height:8px;background:#00d4ff;border-radius:50%;display:inline-block;margin-right:8px;"></div>
                <span style="font-weight:900;font-size:18px;color:#ffffff;letter-spacing:-0.04em;">HumanShield</span>
              </div>
            </td>
          </tr>
          <!-- Alert badge -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <span style="display:inline-block;padding:4px 10px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:20px;font-size:11px;font-weight:700;color:#f87171;letter-spacing:0.06em;text-transform:uppercase;">
                Critical Alert
              </span>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding:12px 32px 0;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.3;">
                ${headline}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:16px 32px 0;">
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.7;">
                ${body ?? 'Your Career OS has detected a signal that requires your attention.'}
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:28px 32px;">
              <a href="${actionUrl}"
                 style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#00d4ff,#38bdf8);border-radius:10px;font-weight:800;font-size:14px;color:#000000;text-decoration:none;letter-spacing:-0.01em;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);line-height:1.6;">
                You're receiving this because you have Career OS alerts enabled.
                <a href="${appUrl}/settings" style="color:rgba(255,255,255,0.3);text-decoration:underline;">Manage alerts</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ── 3. Send via Resend ────────────────────────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `[Career OS Alert] ${headline}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => 'unknown');
      console.error('[send-alert-email] Resend error', resendRes.status, errText);
      return json({ error: 'Email delivery failed', detail: errText }, 502);
    }

    // ── 4. Mark delivered ─────────────────────────────────────────────────────
    await supabase
      .from('user_autopilot_alerts')
      .update({ delivered_email: true })
      .eq('id', alertId);

    return json({ status: 'sent', to: recipientEmail });
  }),
);
