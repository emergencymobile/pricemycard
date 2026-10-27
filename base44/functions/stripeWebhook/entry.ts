import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

// Stripe webhook handler — keeps PremiumSubscription records in sync with
// Stripe subscription lifecycle events. Validates the Stripe signature on
// every request, then creates/updates/cancels the matching entity record
// via the service role (no user auth — webhooks are server-to-server).

async function verifyStripeSignature(body, signatureHeader, secret) {
  if (!signatureHeader || !secret) return null;
  const parts = {};
  signatureHeader.split(',').forEach((p) => {
    const [k, v] = p.split('=');
    parts[k] = v;
  });
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return null;

  const signedPayload = timestamp + '.' + body;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (expected !== v1) return null;

  // Optional replay protection — reject events older than 5 minutes.
  const ageMs = Date.now() - parseInt(timestamp, 10) * 1000;
  if (ageMs > 5 * 60 * 1000) return null;

  return JSON.parse(body);
}

async function fetchSubscription(secretKey, subscriptionId) {
  const res = await fetch('https://api.stripe.com/v1/subscriptions/' + subscriptionId, {
    headers: {
      'Authorization': 'Bearer ' + secretKey,
      'Stripe-Version': '2025-10-29.clover',
    },
  });
  return res.json();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const secretKey = secrets.get('STRIPE_SECRET_KEY');
    const webhookSecret = secrets.get('STRIPE_WEBHOOK_SECRET');

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    const event = await verifyStripeSignature(body, signature, webhookSecret);
    if (!event) return Response.json({ error: 'Invalid signature' }, { status: 400 });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        if (!userId || !subscriptionId) break;

        const sub = await fetchSubscription(secretKey, subscriptionId);
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        const existing = await base44.asServiceRole.entities.PremiumSubscription.filter(
          { user_id: userId }, '-created_date', 1,
        );
        if (existing.length > 0) {
          await base44.asServiceRole.entities.PremiumSubscription.update(existing[0].id, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: sub.status || 'active',
            current_period_end: periodEnd,
          });
        } else {
          await base44.asServiceRole.entities.PremiumSubscription.create({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: sub.status || 'active',
            current_period_end: periodEnd,
            plan: 'premium_search',
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const existing = await base44.asServiceRole.entities.PremiumSubscription.filter(
          { stripe_subscription_id: sub.id }, '-created_date', 1,
        );
        if (existing.length > 0) {
          await base44.asServiceRole.entities.PremiumSubscription.update(existing[0].id, {
            status: sub.status,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const existing = await base44.asServiceRole.entities.PremiumSubscription.filter(
          { stripe_subscription_id: sub.id }, '-created_date', 1,
        );
        if (existing.length > 0) {
          await base44.asServiceRole.entities.PremiumSubscription.update(existing[0].id, {
            status: 'canceled',
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}