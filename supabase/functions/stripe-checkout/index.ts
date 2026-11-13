// Supabase Edge Function: create a Stripe Checkout session for a parent account.
// Deploy: supabase functions deploy stripe-checkout --no-verify-jwt false
// Secrets: supabase secrets set STRIPE_SECRET_KEY=... STRIPE_PRICE_MONTHLY=... STRIPE_PRICE_YEARLY=... APP_URL=...
//
// The app never sees card data. Stripe returns to APP_URL and the webhook keeps
// the subscriptions table in sync.

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return json({ error: 'Stripe is not configured on this project.' }, 503);

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sign in as a parent first.' }, 401);

    const { plan } = await req.json().catch(() => ({ plan: 'monthly' }));
    const price =
      plan === 'yearly' ? Deno.env.get('STRIPE_PRICE_YEARLY') : Deno.env.get('STRIPE_PRICE_MONTHLY');
    if (!price) return json({ error: 'Stripe price IDs are missing.' }, 503);

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    const origin = Deno.env.get('APP_URL') ?? 'http://localhost:8081';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer_email: userData.user.email ?? undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { account_id: userData.user.id, plan: plan === 'yearly' ? 'yearly' : 'monthly' },
      subscription_data: {
        metadata: { account_id: userData.user.id, plan: plan === 'yearly' ? 'yearly' : 'monthly' },
      },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout]', err);
    return json({ error: 'Could not start checkout.' }, 500);
  }
});
