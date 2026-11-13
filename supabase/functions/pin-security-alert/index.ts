// Supabase Edge Function: email a parent after a PIN lockout.
//
// Required function secrets:
//   RESEND_API_KEY          Resend API key (never put this in the browser)
//   SECURITY_ALERT_FROM     verified sender, e.g. "KidsFlix Security <security@example.com>"
// Optional:
//   SECURITY_ALERT_REPLY_TO support@example.com
//
// The recipient always comes from the authenticated Supabase user. The client
// never supplies an email address, PIN, PIN hash, token or API key. The database
// event id is the idempotency key, so retries do not produce duplicate emails.

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

function safeProviderResponse(response: Response, body: Record<string, unknown>) {
  return {
    httpStatus: response.status,
    id: typeof body.id === 'string' ? body.id : null,
    name: typeof body.name === 'string' ? body.name.slice(0, 100) : null,
  };
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

  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const from = Deno.env.get('SECURITY_ALERT_FROM')?.trim();
  if (!resendKey || !from) {
    console.error('[pin-security-alert] Resend secrets are missing', {
      hasResendKey: Boolean(resendKey),
      hasFrom: Boolean(from),
      recipient: maskEmail(user.email),
    });
    return json(
      {
        ok: false,
        code: 'not_configured',
        error:
          'Email alerts are not configured. Add RESEND_API_KEY and SECURITY_ALERT_FROM as Supabase Edge Function secrets.',
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
        error: 'SECURITY_ALERT_FROM must be a valid sender address, for example KidsFlix Security <security@example.com>.',
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
  const idempotencyKey = `kidsflix-security/${event.id}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        text,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Resend did not respond within 12 seconds.'
      : 'Could not reach Resend. Check the function network logs and try again.';
    console.error('[pin-security-alert] provider request failed', {
      eventId: event.id,
      recipient: event.recipientMasked,
      code: 'network_error',
    });
    const recorded = await recordResult(supabase, {
      eventId: event.id,
      accepted: false,
      code: 'network_error',
      message,
      retryAfterSeconds: 30,
    });
    return json(
      {
        ok: false,
        code: 'network_error',
        error: message,
        eventId: event.id,
        recipientMasked: event.recipientMasked,
        retryable: true,
        diagnosticsRecorded: recorded,
      },
      502
    );
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let providerBody: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') providerBody = parsed as Record<string, unknown>;
  } catch {
    providerBody = {};
  }

  if (!response.ok) {
    const code = String(providerBody.name ?? `http_${response.status}`).slice(0, 100);
    const message = sanitizeProviderMessage(
      String(providerBody.message ?? `Resend rejected the email with HTTP ${response.status}.`)
    ).slice(0, 2000);
    console.error('[pin-security-alert] provider rejected', {
      eventId: event.id,
      recipient: event.recipientMasked,
      httpStatus: response.status,
      code,
    });
    const recorded = await recordResult(supabase, {
      eventId: event.id,
      accepted: false,
      providerResponse: safeProviderResponse(response, providerBody),
      code,
      message,
      retryAfterSeconds: response.status === 429 ? 120 : 30,
    });
    return json(
      {
        ok: false,
        code,
        error: message,
        eventId: event.id,
        recipientMasked: event.recipientMasked,
        retryable: response.status === 429 || response.status >= 500,
        diagnosticsRecorded: recorded,
      },
      502
    );
  }

  const providerMessageId = typeof providerBody.id === 'string' ? providerBody.id : '';
  if (!providerMessageId) {
    const message = 'Resend returned success without a message id; delivery cannot be confirmed.';
    console.error('[pin-security-alert] provider response had no id', {
      eventId: event.id,
      recipient: event.recipientMasked,
      httpStatus: response.status,
    });
    const recorded = await recordResult(supabase, {
      eventId: event.id,
      accepted: false,
      providerResponse: safeProviderResponse(response, providerBody),
      code: 'missing_provider_id',
      message,
      retryAfterSeconds: 30,
    });
    return json(
      {
        ok: false,
        code: 'missing_provider_id',
        error: message,
        eventId: event.id,
        recipientMasked: event.recipientMasked,
        retryable: true,
        diagnosticsRecorded: recorded,
      },
      502
    );
  }

  const recorded = await recordResult(supabase, {
    eventId: event.id,
    accepted: true,
    providerMessageId,
    providerResponse: safeProviderResponse(response, providerBody),
  });

  console.log('[pin-security-alert] provider accepted', {
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
    message: 'Resend accepted the email. Inbox delivery is not confirmed until a delivery event or inbox check.',
  });
});

async function recordResult(
  supabase: ReturnType<typeof createClient>,
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
