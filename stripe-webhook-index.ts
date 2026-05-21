/**
 * stripe-webhook/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives and processes Stripe webhook events.
 * Updates the stripe_subscriptions table in Supabase accordingly.
 *
 * IMPORTANT: Deploy with --no-verify-jwt
 *   Stripe calls this endpoint directly — it does NOT send a Supabase JWT.
 *   Security comes from verifying the Stripe-Signature header instead.
 *
 * Webhook events handled:
 *   checkout.session.completed      — new subscription created via Checkout
 *   customer.subscription.updated   — plan change, renewal, trial-to-paid
 *   customer.subscription.deleted   — subscription canceled/ended
 *
 * Secrets required:
 *   STRIPE_SECRET_KEY      sk_test_... (or sk_live_...)
 *   STRIPE_WEBHOOK_SECRET  whsec_...  (from Stripe Dashboard → Webhooks → Signing secret)
 *
 * Webhook URL (add this in Stripe Dashboard → Developers → Webhooks → Add endpoint):
 *   https://mahtcfukgzbonwibtsxz.supabase.co/functions/v1/stripe-webhook
 *
 * Subscribe to these events in the Stripe Dashboard:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *
 * Deploy command:
 *   Copy this file to supabase/functions/stripe-webhook/index.ts
 *   npx supabase functions deploy stripe-webhook --project-ref mahtcfukgzbonwibtsxz --no-verify-jwt
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ── CONFIG ───────────────────────────────────────────────────────────────────

const STRIPE_SECRET_KEY    = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

/** Maps Stripe Price IDs to plan names for the stripe_subscriptions table. */
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1TYw3tICNn8XxxhbIhMQ47XE': 'starter',
  'price_1TYwEuICNn8XxxhbXpY1bl1O': 'landlord',
  'price_1TYwIHICNn8Xxxhbw76LS7h5': 'portfolio',
};

// ── CLIENTS ──────────────────────────────────────────────────────────────────

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

// ── HANDLER ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {

  // ── Step 1: Verify the Stripe webhook signature ───────────────────────────
  //    This proves the request genuinely came from Stripe, not an attacker.
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', msg);
    // Return 400 so Stripe knows not to retry this delivery
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // ── Step 2: Process the event ─────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── New subscription created via the Checkout page ──────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process subscription checkouts (not one-time payments)
        if (session.mode !== 'subscription') break;

        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('[stripe-webhook] checkout.session.completed: metadata.user_id is missing');
          break;
        }

        // Retrieve the full subscription object to get period dates
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        const priceId = subscription.items.data[0].price.id;
        const planName = PRICE_TO_PLAN[priceId] ?? 'unknown';

        const { error } = await sb.from('stripe_subscriptions').upsert(
          {
            user_id:                userId,
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: subscription.id,
            stripe_price_id:        priceId,
            plan_name:              planName,
            status:                 subscription.status,
            current_period_start:   _ts(subscription.current_period_start),
            current_period_end:     _ts(subscription.current_period_end),
            cancel_at_period_end:   subscription.cancel_at_period_end,
            updated_at:             new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

        if (error) {
          console.error('[stripe-webhook] DB upsert error (checkout.session.completed):', error);
        } else {
          console.log('[stripe-webhook] Subscription created for user', userId, '— plan:', planName);
        }
        break;
      }

      // ── Subscription updated: renewal, plan change, trial end ────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await sb.from('stripe_subscriptions').update({
          status:               sub.status,
          stripe_price_id:      sub.items.data[0].price.id,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: _ts(sub.current_period_start),
          current_period_end:   _ts(sub.current_period_end),
          updated_at:           new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);

        if (error) {
          console.error('[stripe-webhook] DB update error (subscription.updated):', error);
        } else {
          console.log('[stripe-webhook] Subscription updated:', sub.id, '— status:', sub.status);
        }
        break;
      }

      // ── Subscription fully canceled / ended ──────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        const { error } = await sb.from('stripe_subscriptions').update({
          status:     'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);

        if (error) {
          console.error('[stripe-webhook] DB update error (subscription.deleted):', error);
        } else {
          console.log('[stripe-webhook] Subscription canceled:', sub.id);
        }
        break;
      }

      default:
        // Silently ignore events we haven't subscribed to handle
        console.debug('[stripe-webhook] Unhandled event type:', event.type);
        break;
    }

    // Always return 200 so Stripe marks the delivery as successful
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Event processing error:', msg, '| event type:', event.type);
    return new Response(JSON.stringify({ error: 'Event processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── HELPER ───────────────────────────────────────────────────────────────────

/** Converts a Unix timestamp (seconds) to an ISO 8601 string. */
function _ts(unix: number): string {
  return new Date(unix * 1000).toISOString();
}
