// Supabase Edge Function: Stripe webhook → subscriptions in Postgres.
// Deploy WITHOUT JWT verification (Stripe signs the payload instead):
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
// Then add the function URL as a Stripe webhook endpoint for:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!signature || !secret) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error('[stripe-webhook] signature failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const upsert = async (
    accountId: string,
    plan: string,
    status: string,
    customerId: string | null,
    periodEnd: number | null
  ) => {
    const { error } = await admin.from('parent_settings').upsert({
      account_id: accountId,
      plan,
      subscription_status: status,
      stripe_customer_id: customerId,
      trial_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('[stripe-webhook] upsert failed', error);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const accountId = session.metadata?.account_id;
      if (!accountId) break;
      const subscription = session.subscription
        ? await stripe.subscriptions.retrieve(String(session.subscription))
        : null;
      await upsert(
        accountId,
        session.metadata?.plan ?? 'monthly',
        'active',
        String(session.customer ?? '') || null,
        subscription?.current_period_end ?? null
      );
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const accountId = sub.metadata?.account_id;
      if (!accountId) break;
      const status =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : sub.status === 'active' || sub.status === 'trialing'
            ? sub.status === 'trialing'
              ? 'trialing'
              : 'active'
            : 'past_due';
      await upsert(
        accountId,
        sub.metadata?.plan ?? 'monthly',
        status,
        String(sub.customer ?? '') || null,
        sub.current_period_end ?? null
      );
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
