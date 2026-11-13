// Supabase Edge Function: email a parent after a PIN lockout.
//
// Mail is sent through the same single Gmail sender used by Supabase Auth.
// No custom domain or third-party email account is required.
//
// Required function secrets:
//   SMTP_USERNAME           the Gmail address that sends the alert
//   SMTP_PASSWORD           a Gmail app password (2-Step Verification required)
//   SECURITY_ALERT_FROM     the same address, optionally with a display name
// Optional:
//   SMTP_HOST               defaults to smtp.gmail.com
//   SMTP_PORT               defaults to 465 (Supabase blocks ports 25 and 587)
//   SMTP_SECURE             defaults to true
//   SECURITY_ALERT_REPLY_TO support@example.com
//
// The recipient always comes from the authenticated Supabase user. The client
// never supplies an email address, PIN, PIN hash, token or API key. The database
// event id is the deduplication key, so retries are less likely to duplicate mail.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@^9';

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

function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

// Provider errors can echo the recipient address. Keep the useful text but
// never persist or return an unmasked address in diagnostics.
function sanitizeProviderMessage(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (email) => maskEmail(email));
}

function formatDuration(seconds: number): string {
  const safe = Math.max(1, Math.floor(seconds));
  if (safe < 60) return `${safe} second${safe === 1 ? '' : 's'}`;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (!remainder) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return `${minutes}m ${remainder}s`;
}

function formatEventTime(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'long',
      timeZone: 'UTC',
    }).format(date);
    return formatted.includes('UTC') ? formatted : `${formatted} UTC`;
  } catch {
    return date.toISOString();
  }
}

type AlertEvent = {
  id: string;
  eventAt: string;
  recipientMasked: string;
  failedAttempts?: number;
  lockoutSeconds?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'Sign in as a parent first.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey) {
    console.error('[pin-security-alert] Supabase runtime env is missing');
    return json({ ok: false, error: 'The email function is not configured correctly.' }, 503);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) {
    return json({ ok: false, error: 'Sign in as a parent with a registered email first.' }, 401);
  }

  const smtpHost = Deno.env.get('SMTP_HOST')?.trim() || 'smtp.gmail.com';
  const smtpPort = Number(Deno.env.get('SMTP_PORT')?.trim() || 465);
  const smtpSecure = (Deno.env.get('SMTP_SECURE')?.trim() || 'true').toLowerCase() !== 'false';
  const smtpUser = Deno.env.get('SMTP_USERNAME')?.trim();
  const smtpPass = Deno.env.get('SMTP_PASSWORD')?.trim();
  const from = Deno.env.get('SECURITY_ALERT_FROM')?.trim();
  if (!smtpUser || !smtpPass || !from) {
    console.error('[pin-security-alert] Gmail SMTP secrets are missing', {
      hasUsername: Boolean(smtpUser),
      hasPassword: Boolean(smtpPass),
      hasFrom: Boolean(from),
      recipient: maskEmail(user.email),
    });
    return json(
      {
        ok: false,
        code: 'not_configured',
        error:
          'Email alerts are not configured. Add SMTP_USERNAME, SMTP_PASSWORD and SECURITY_ALERT_FROM as Supabase Edge Function secrets.',
      },
      503
    );
  }

  const fromAddress = from.match(/<([^>]+)>/)?.[1]?.trim() ?? from;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress)) {
    console.error('[pin-security-alert] SECURITY_ALERT_FROM is not a valid sender address');
    return json(
      {
        ok: false,
        code: 'not_configured',
        error: 'SECURITY_ALERT_FROM must be a valid sender address, for example KidsFlix.Aio Security <parent@gmail.com>.',
      },
      503
    );
  }
  if (fromAddress.toLowerCase() !== smtpUser.toLowerCase()) {
    console.error('[pin-security-alert] SECURITY_ALERT_FROM must match SMTP_USERNAME for Gmail');
    return json(
      {
        ok: false,
        code: 'not_configured',
        error: 'SECURITY_ALERT_FROM must be the same Gmail address as SMTP_USERNAME.',
      },
      503
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'test' ? 'test' : 'lockout';
  const requestedEventId = typeof body?.eventId === 'string' ? body.eventId : null;

  let event: AlertEvent;
  let deduplicated = false;

  if (mode === 'test') {
    const { data, error } = await supabase.rpc('create_pin_security_test_alert');
    if (error) {
      console.error('[pin-security-alert] could not create test event', error.code ?? 'unknown');
      return json({ ok: false, error: 'Could not prepare the test email.' }, 500);
    }
    const claim = data as { allowed?: boolean; reason?: string; eventId?: string; eventAt?: string; recipientMasked?: string; retryAfterSeconds?: number } | null;
    if (!claim?.allowed || !claim.eventId) {
      if (claim?.reason === 'rate_limited') {
        return json(
          {
            ok: false,
            code: 'rate_limited',
            error: `Please wait ${claim.retryAfterSeconds ?? 30} seconds before sending another test email.`,
            retryAfterSeconds: claim.retryAfterSeconds ?? 30,
          },
          429
        );
      }
      return json({ ok: false, code: claim?.reason ?? 'not_allowed', error: 'No registered parent email is available.' }, 409);
    }
    event = {
      id: claim.eventId,
      eventAt: claim.eventAt ?? new Date().toISOString(),
      recipientMasked: claim.recipientMasked ?? maskEmail(user.email),
    };
  } else {
    const { data, error } = await supabase.rpc('claim_pin_security_alert', {
      p_event_id: requestedEventId,
    });
    if (error) {
      console.error('[pin-security-alert] could not claim alert', error.code ?? 'unknown');
      return json({ ok: false, error: 'Could not prepare the security alert.' }, 500);
    }
    const claim = data as
      | {
          allowed?: boolean;
          reason?: string;
          eventId?: string;
          failedAttempts?: number;
          lockoutSeconds?: number;
          eventAt?: string;
          recipientMasked?: string;
          retryAfterSeconds?: number;
        }
      | null;

    if (!claim?.allowed) {
      if (claim?.reason === 'already_sent') {
        deduplicated = true;
        return json(
          {
            ok: true,
            status: 'accepted',
            deduplicated: true,
            eventId: claim.eventId ?? null,
            recipientMasked: maskEmail(user.email),
            deliveryConfirmed: false,
          },
          200
        );
      }
      if (claim?.reason === 'in_progress') {
        return json({ ok: false, code: 'in_progress', error: 'This alert is already being sent.', eventId: claim.eventId ?? null }, 409);
      }
      if (claim?.reason === 'retry_wait') {
        return json(
          {
            ok: false,
            code: 'rate_limited',
            error: `The failed alert can be retried in ${claim.retryAfterSeconds ?? 30} seconds.`,
            retryAfterSeconds: claim.retryAfterSeconds ?? 30,
            eventId: claim.eventId ?? null,
          },
          429
        );
      }
      if (claim?.reason === 'retry_exhausted') {
        return json({ ok: false, code: 'retry_exhausted', error: 'This alert reached its retry limit.', eventId: claim.eventId ?? null }, 409);
      }
      return json({ ok: false, code: claim?.reason ?? 'not_locked', error: 'There is no new PIN lockout to report.' }, 409);
    }

    event = {
      id: String(claim.eventId),
      eventAt: claim.eventAt ?? new Date().toISOString(),
      recipientMasked: claim.recipientMasked ?? maskEmail(user.email),
      failedAttempts: Math.max(1, Math.floor(Number(claim.failedAttempts) || 0)),
      lockoutSeconds: Math.max(1, Math.floor(Number(claim.lockoutSeconds) || 0)),
    };
  }

  const isTest = mode === 'test';
  const failedAttempts = isTest ? 0 : Math.max(1, event.failedAttempts ?? 0);
  const lockoutSeconds = isTest ? 0 : Math.max(1, event.lockoutSeconds ?? 0);
  const duration = formatDuration(lockoutSeconds);
  const eventTime = formatEventTime(event.eventAt);
  const recipient = user.email;
  const subject = isTest
    ? 'KidsFlix.Aio — Test Security Email'
    : 'KidsFlix.Aio — Parent Account Security Alert';

  const text = isTest
    ? [
        'Hello,',
        '',
        'This is a test of the KidsFlix.Aio parent account security alert system.',
        '',
        `Time: ${eventTime}`,
        'No PIN lockout occurred and no account changes were made.',
        '',
        'If you received this message but did not request it, you can ignore it or contact support.',
        'The parent PIN, password, authentication tokens and API keys are never included in security emails.',
        '',
        'KidsFlix.Aio Security',
      ].join('\n')
    : [
        'Hello,',
        '',
        'Multiple incorrect parent PIN attempts occurred on your KidsFlix.Aio parent account, and the parent area was temporarily locked.',
        '',
        `Time: ${eventTime}`,
        `Failed attempts: ${failedAttempts}`,
        `Lockout duration: ${duration} (${lockoutSeconds} seconds)`,
        '',
        'The lockout applies to every parent-PIN screen and survives closing or restarting the app.',
        'For your safety, the PIN itself is never included in this email or stored in alert logs.',
        '',
        'If this was you, you can try again when the countdown ends.',
        'If this was not you, wait for the lockout to finish, then open the Parent Dashboard and change the parent PIN. Also review your parent account password and sign out of devices you do not recognize.',
        '',
        'KidsFlix.Aio Security',
      ].join('\n');

  const details = isTest
    ? `<p style="margin:20px 0 8px"><strong>This is a test.</strong> No PIN lockout occurred and no account changes were made.</p>`
    : `<table style="border-collapse:collapse;width:100%;background:#f6f3ff;border-radius:10px;padding:16px">
        <tr><td style="padding:8px 12px;color:#666">Time</td><td style="padding:8px 12px;font-weight:bold">${escapeHtml(eventTime)}</td></tr>
        <tr><td style="padding:8px 12px;color:#666">Failed attempts</td><td style="padding:8px 12px;font-weight:bold">${failedAttempts}</td></tr>
        <tr><td style="padding:8px 12px;color:#666">Lockout duration</td><td style="padding:8px 12px;font-weight:bold">${escapeHtml(duration)} (${lockoutSeconds} seconds)</td></tr>
      </table>
      <p style="margin:20px 0 8px">The lockout applies to every parent-PIN screen and survives closing or restarting the app.</p>
      <p style="margin:0 0 8px"><strong>For your safety, the PIN itself is never included in this email or stored in alert logs.</strong></p>
      <p style="margin:16px 0 0;color:#555">If this was you, you can try again when the countdown ends. If this was not you, wait for the lockout to finish, then change the parent PIN in the Parent Dashboard. Also review your parent account password and sign out of devices you do not recognize.</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#241447">
      <div style="font-size:13px;letter-spacing:1px;color:#7C4DFF;font-weight:bold;margin-bottom:8px">KIDSFLIX.AIO</div>
      <h2 style="margin:0 0 8px">${isTest ? 'Security email test' : 'Parent account security alert'}</h2>
      <p style="color:#555;margin:0 0 20px">${
        isTest
          ? 'This message confirms that KidsFlix.Aio can send security alerts to your registered parent email.'
          : 'Repeated incorrect parent PIN attempts temporarily locked the parent area.'
      }</p>
      ${details}
      <p style="margin:16px 0 0;color:#555">${
        isTest
          ? 'If you did not request this test, you can ignore it.'
          : 'If this activity was not authorized, secure the account as described above.'
      }</p>
      <p style="margin:20px 0 0;color:#888;font-size:12px">KidsFlix.Aio Security</p>
    </div>`;

  const replyTo = Deno.env.get('SECURITY_ALERT_REPLY_TO')?.trim();
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 15_000,
  });

  let info: { messageId?: string; response?: string; accepted?: unknown[]; rejected?: unknown[] };
  try {
    info = await transport.sendMail({
      from,
      to: recipient,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
      // Gmail does not provide an idempotency key. Reusing the event id in the
      // Message-ID gives retries the best chance of being treated as duplicates.
      messageId: `<kidsflix-${event.id}@gmail.com>`,
      headers: { 'X-KidsFlix-Event': event.id },
    });
  } catch (error) {
    const code = String((error as { code?: string }).code ?? 'smtp_error').slice(0, 100);
    const message = sanitizeProviderMessage(
      error instanceof Error ? error.message : 'Gmail rejected the email.'
    ).slice(0, 2000);
    console.error('[pin-security-alert] SMTP send failed', {
      eventId: event.id,
      recipient: event.recipientMasked,
      code,
    });
    const recorded = await recordResult(supabase, {
      eventId: event.id,
      accepted: false,
      code,
      message,
      retryAfterSeconds: 30,
    });
    return json(
      {
        ok: false,
        code,
        error: message,
        eventId: event.id,
        recipientMasked: event.recipientMasked,
        retryable: true,
        diagnosticsRecorded: recorded,
      },
      502
    );
  }

  const providerMessageId = info.messageId || `kidsflix-${event.id}@gmail.com`;
  const providerResponse = {
    messageId: providerMessageId,
    response: sanitizeProviderMessage(String(info.response ?? '')).slice(0, 500),
    acceptedCount: Array.isArray(info.accepted) ? info.accepted.length : null,
    rejectedCount: Array.isArray(info.rejected) ? info.rejected.length : null,
  };
  const recorded = await recordResult(supabase, {
    eventId: event.id,
    accepted: true,
    providerMessageId,
    providerResponse,
  });

  console.log('[pin-security-alert] Gmail accepted', {
    eventId: event.id,
    recipient: event.recipientMasked,
    providerMessageId,
    diagnosticsRecorded: recorded,
    kind: isTest ? 'test' : 'lockout',
  });

  return json({
    ok: true,
    status: 'accepted',
    deduplicated,
    eventId: event.id,
    providerMessageId,
    recipientMasked: event.recipientMasked,
    deliveryConfirmed: false,
    diagnosticsRecorded: recorded,
    message: 'Gmail accepted the email. Inbox delivery is not tracked; check the inbox and Spam folder.',
  });
});

async function recordResult(
  supabase: SupabaseClient<any, any, any>,
  args: {
    eventId: string;
    accepted: boolean;
    providerMessageId?: string;
    providerResponse?: Record<string, unknown>;
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
  }
): Promise<boolean> {
  const { error } = await supabase.rpc('complete_pin_security_alert', {
    p_event_id: args.eventId,
    p_accepted: args.accepted,
    p_provider_message_id: args.providerMessageId ?? null,
    p_provider_response: args.providerResponse ?? null,
    p_error_code: args.code ?? null,
    p_error_message: args.message ?? null,
    p_retry_after_seconds: args.retryAfterSeconds ?? 30,
  });
  if (error) {
    console.error('[pin-security-alert] could not record delivery result', {
      eventId: args.eventId,
      code: error.code ?? 'unknown',
    });
    return false;
  }
  return true;
}
