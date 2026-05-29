import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!;

/** Maps plan+type to Stripe Price ID. Frontend sends { plan, billing_cycle }. */
const PRICE_MAP: Record<string, string> = {
  'starter_founding':   'price_1TX2zp2LDL4FOJhEvpaUe6sa',
  'starter_standard':   'price_1TcSFV2LDL4FOJhEsUm1W7Ro',
  'landlord_founding':  'price_1TcSLU2LDL4FOJhEamxB9g97',
  'landlord_standard':  'price_1TcSNa2LDL4FOJhEguNEJjhd',
  'portfolio_founding': 'price_1TcSPs2LDL4FOJhEJS7VUati',
  'portfolio_standard': 'price_1TcSRK2LDL4FOJhEIXd9FLKP',
};

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Step 1: Authenticate the caller via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return _err(401, 'Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const sb = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return _err(401, 'Invalid or expired session token');
    }

    // Step 2: Parse request body
    const body = await req.json().catch(() => ({}));

    // Support two calling conventions:
    // A) { price_id: 'price_xxx' }  — direct price ID (legacy)
    // B) { plan: 'starter', billing_cycle: 'monthly' } — plan name (current landlord.html)
    let priceId: string = body.price_id ?? '';

    if (!priceId && body.plan) {
      // Determine founding vs standard based on user metadata or default to founding
      // First 100 users get founding price — use founding as default for now
      const priceType = body.price_type ?? 'founding';
      const key = `${body.plan}_${priceType}`;
      priceId = PRICE_MAP[key] ?? PRICE_MAP[`${body.plan}_founding`] ?? '';
    }

    if (!priceId || !priceId.startsWith('price_')) {
      return _err(400, `Invalid or missing price_id. Received: "${priceId}"`);
    }

    // Step 3: Validate price ID is one of ours
    const validPrices = new Set(Object.values(PRICE_MAP));
    if (!validPrices.has(priceId)) {
      return _err(400, 'Unrecognised price_id');
    }

    // Step 4: Create Stripe Checkout Session
    const origin = req.headers.get('origin') ?? 'https://rentsafeai.co.uk';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/landlord.html?checkout=success`,
      cancel_url:  `${origin}/landlord.html?checkout=cancelled`,
      metadata: { user_id: user.id },
      customer_email: user.email,
      subscription_data: {
        trial_period_days: 30,
        metadata: { user_id: user.id },
      },
    });

    console.log('[stripe-checkout] Session created:', session.id, 'price:', priceId, 'user:', user.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-checkout] Unhandled error:', msg);
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
