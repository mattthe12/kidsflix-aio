// Supabase Edge Function: email a parent after a PIN lockout.
// Deploy: supabase functions deploy pin-security-alert
// Secrets:
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set SECURITY_ALERT_FROM="KidsFlix Security <security@your-verified-domain>"
//   optional reply-to: supabase secrets set SECURITY_ALERT_REPLY_TO=support@your-domain
//
// The raw PIN/hash is never sent to or logged by this function. The recipient
// comes from the authenticated account, and the database RPC atomically rate
// limits alerts to one per 15 minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

function formatDuration(seconds: number): string {
  const safe = Math.max(1, Math.floor(seconds));
  if (safe < 60) return `${safe} second${safe === 1 ? '' : 's'}`;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (!remainder) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `${minutes}m ${remainder}s`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('SECURITY_ALERT_FROM');
  if (!resendKey || !from) {
    return json({ error: 'Email alert service is not configured.' }, 503);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.email) {
    return json({ error: 'Sign in as a parent first.' }, 401);
  }

  const { data: claim, error: claimError } = await supabase.rpc('claim_pin_security_alert');
  if (claimError) {
    console.error('[pin-security-alert] could not claim alert', claimError.code ?? 'unknown');
    return json({ error: 'Could not prepare the security alert.' }, 500);
  }
  if (!claim || typeof claim !== 'object' || !(claim as { allowed?: boolean }).allowed) {
    const reason = (claim as { reason?: string } | null)?.reason;
    if (reason === 'rate_limited') {
      return json({ ok: false, reason: 'rate_limited' }, 429);
    }
    return json({ ok: false, reason: reason ?? 'not_locked' }, 409);
  }

  const data = claim as {
    failedAttempts?: number;
    lockoutSeconds?: number;
    lastFailureAt?: string;
  };
  const failedAttempts = Math.max(1, Math.floor(Number(data.failedAttempts) || 0));
  const lockoutSeconds = Math.max(1, Math.floor(Number(data.lockoutSeconds) || 0));
  const duration = formatDuration(lockoutSeconds);
  const time = new Date().toISOString();
  const parentEmail = userData.user.email;
  const subject = `KidsFlix parent PIN lockout — ${failedAttempts} failed attempts`;
  const text = [
    'Hello,',
    '',
    'The KidsFlix parent area was locked after repeated incorrect parent-PIN attempts.',
    '',
    `Time: ${time}`,
    `Failed attempts: ${failedAttempts}`,
    `Lockout duration: ${duration} (${lockoutSeconds} seconds)`,
    '',
    'The lockout applies to every parent-PIN screen and survives closing or restarting the app.',
    'For safety, the PIN itself is never included in this email or stored in alert logs.',
    '',
    'If this was you, you can try again when the countdown ends. If it was not you, wait for the lockout to finish, then change the parent PIN from the parent dashboard.',
    '',
    'KidsFlix Security',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#241447">
      <h2 style="margin:0 0 8px">KidsFlix parent security alert</h2>
      <p style="color:#555;margin:0 0 20px">Repeated incorrect parent-PIN attempts locked the parent area.</p>
      <table style="border-collapse:collapse;width:100%;background:#f6f3ff;border-radius:10px;padding:16px">
        <tr><td style="padding:8px 12px;color:#666">Time</td><td style="padding:8px 12px;font-weight:bold">${escapeHtml(time)}</td></tr>
        <tr><td style="padding:8px 12px;color:#666">Failed attempts</td><td style="padding:8px 12px;font-weight:bold">${failedAttempts}</td></tr>
        <tr><td style="padding:8px 12px;color:#666">Lockout duration</td><td style="padding:8px 12px;font-weight:bold">${escapeHtml(duration)} (${lockoutSeconds} seconds)</td></tr>
      </table>
      <p style="margin:20px 0 8px">The lockout applies to every parent-PIN screen and survives closing or restarting the app.</p>
      <p style="margin:0 0 8px"><strong>For safety, the PIN itself is never included in this email or stored in alert logs.</strong></p>
      <p style="margin:16px 0 0;color:#555">If this was you, you can try again when the countdown ends. If it was not you, wait for the lockout to finish, then change the parent PIN from the parent dashboard.</p>
      <p style="margin:20px 0 0;color:#888;font-size:12px">KidsFlix Security</p>
    </div>`;

  const replyTo = Deno.env.get('SECURITY_ALERT_REPLY_TO');
  const idempotencyKey = `pin-lockout/${userData.user.id}/${data.lastFailureAt ?? time}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: [parentEmail],
      subject,
      text,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    // Do not log the response body: it can contain the recipient address.
    console.error('[pin-security-alert] email provider failed', response.status);
    return json({ error: 'Could not send the security alert.' }, 502);
  }

  return json({ ok: true });
});
