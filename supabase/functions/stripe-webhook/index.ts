import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

/** Maps Stripe Price IDs to plan names for the stripe_subscriptions table. */
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TX2zp2LDL4FOJhEvpaUe6sa': 'starter',   // starter_founding  £4.99
  'price_1TcSFV2LDL4FOJhEsUm1W7Ro': 'starter',   // starter_standard  £7.99
  'price_1TcSLU2LDL4FOJhEamxB9g97': 'landlord',  // landlord_founding £11.99
  'price_1TcSNa2LDL4FOJhEguNEJjhd': 'landlord',  // landlord_standard £18.99
  'price_1TcSPs2LDL4FOJhEJS7VUati': 'portfolio', // portfolio_founding £23.99
  'price_1TcSRK2LDL4FOJhEIXd9FLKP': 'portfolio', // portfolio_standard £39.99
};

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

/** Service-role client — bypasses RLS so the webhook can write to stripe_subscriptions */
const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

// ─── CORS HEADERS ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return _err(400, 'Missing stripe-signature header');

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', msg);
    return _err(400, 'Webhook signature verification failed: ' + msg);
  }

  console.log('[stripe-webhook] Event:', event.type);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) { console.warn('No user_id in metadata'); break; }

        const subId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price.id ?? '';
        const planName = PRICE_TO_PLAN[priceId] ?? 'starter';

        const { error } = await sb.from('stripe_subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subId,
          price_id: priceId,
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          plan_name: planName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (error) console.error('[stripe-webhook] upsert error:', error);
        else console.log('[stripe-webhook] Subscription created for user:', userId, 'plan:', planName);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id ?? '';
        const planName = PRICE_TO_PLAN[priceId] ?? 'starter';

        const { error } = await sb.from('stripe_subscriptions')
          .update({
            price_id: priceId,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            plan_name: planName,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) console.error('[stripe-webhook] update error:', error);
        else console.log('[stripe-webhook] Subscription updated:', sub.id, 'plan:', planName);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await sb.from('stripe_subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) console.error('[stripe-webhook] delete error:', error);
        else console.log('[stripe-webhook] Subscription canceled:', sub.id);
        break;
      }

      default:
        console.log('[stripe-webhook] Unhandled event type:', event.type);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Handler error:', msg);
    return _err(500, 'Internal server error: ' + msg);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
});

// ─── HELPER ──────────────────────────────────────────────────────────────────

function _err(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
