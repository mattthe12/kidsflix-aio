// Legacy Supabase Edge Function: receive Resend delivery events for security emails.
//
// Gmail SMTP does not emit delivery events, so this function is no longer used by
// the current single-sender setup. It is kept only so an existing deployed Resend
// webhook fails closed; do not configure a new webhook.
//
// Secret: RESEND_WEBHOOK_SECRET (the whsec_... signing secret from the Resend
// webhook settings). Configure the endpoint in Resend as:
//   https://<project-ref>.supabase.co/functions/v1/pin-security-webhook
// and subscribe to email.delivered, email.bounced, email.complained and
// email.failed.
//
// This function verifies the Svix signature before changing any delivery row.
// It never logs the recipient address or the raw webhook body.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/svix@1.24.0';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const EVENT_STATUS: Record<string, 'delivered' | 'bounced' | 'complained' | 'failed'> = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')?.trim();
  if (!secret) {
    console.error('[pin-security-webhook] RESEND_WEBHOOK_SECRET is missing');
    return json({ ok: false, error: 'Webhook is not configured.' }, 503);
  }

  const id = req.headers.get('svix-id') ?? '';
  const timestamp = req.headers.get('svix-timestamp') ?? '';
  const signature = req.headers.get('svix-signature') ?? '';
  if (!id || !timestamp || !signature) return json({ ok: false, error: 'Missing signature.' }, 401);

  const rawBody = await req.text();
  let payload: {
    type?: string;
    created_at?: string;
    data?: { email_id?: string; created_at?: string };
  };
  try {
    payload = new Webhook(secret).verify(rawBody, {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    }) as typeof payload;
  } catch {
    return json({ ok: false, error: 'Invalid signature.' }, 401);
  }

  const status = payload.type ? EVENT_STATUS[payload.type] : undefined;
  const emailId = payload.data?.email_id;
  if (!status || !emailId) return json({ ok: true, ignored: true });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    console.error('[pin-security-webhook] service credentials are missing');
    return json({ ok: false, error: 'Webhook storage is not configured.' }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const occurredAt = payload.data?.created_at ?? payload.created_at ?? new Date().toISOString();
  const { data, error } = await supabase.rpc('update_pin_security_alert_delivery', {
    p_provider_message_id: emailId,
    p_status: status,
    p_occurred_at: occurredAt,
  });

  if (error) {
    console.error('[pin-security-webhook] could not record delivery event', error.code ?? 'unknown');
    return json({ ok: false, error: 'Could not record delivery event.' }, 500);
  }

  return json({ ok: true, event: payload.type, ...(data && typeof data === 'object' ? data : {}) });
});
