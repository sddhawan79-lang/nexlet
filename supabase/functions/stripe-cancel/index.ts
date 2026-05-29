import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

// ─── HANDLER ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Step 1: Authenticate caller via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return _err(401, 'Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) return _err(401, 'Invalid or expired session token');

    // Step 2: Look up the user's subscription
    const { data: sub, error: dbError } = await sb
      .from('stripe_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .single();

    if (dbError || !sub) return _err(404, 'No active subscription found');
    if (sub.status === 'canceled') return _err(400, 'Subscription is already canceled');

    // Step 3: Set cancel_at_period_end = true (cancels at end of billing period)
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Step 4: Update local DB
    await sb.from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    console.log('[stripe-cancel] Scheduled cancellation for user:', user.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-cancel] Error:', msg);
    return _err(500, 'Internal server error: ' + msg);
  }
});

// ─── HELPER ──────────────────────────────────────────────────────────────────

function _err(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
