import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';

// Premium Search subscription — Stripe Checkout session creator.
// Creates a Stripe Checkout session for the $4.99/month Premium Search plan
// and returns the hosted checkout URL. Requires an authenticated user so the
// subscription can be linked to their account via client_reference_id.

const PRICE_ID = 'price_1UJvXf07ZVVZyT0KrmFYCT6W';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Login required' }, { status: 401 });

    const secretKey = secrets.get('STRIPE_SECRET_KEY');
    const appId = secrets.get('BASE44_APP_ID');

    const body = await req.json().catch(() => ({}));
    const origin = (body?.origin || 'https://pricemycard.base44.app').replace(/\/$/, '');

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', PRICE_ID);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', origin + '/web-search?premium=success');
    params.append('cancel_url', origin + '/web-search?premium=cancelled');
    params.append('client_reference_id', user.id);
    if (appId) params.append('metadata[base44_app_id]', appId);
    params.append('metadata[user_id]', user.id);
    if (appId) params.append('subscription_data[metadata][base44_app_id]', appId);
    params.append('subscription_data[metadata][user_id]', user.id);
    params.append('subscription_data[trial_period_days]', '7');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Stripe-Version': '2025-10-29.clover',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session = await res.json();
    if (!res.ok) {
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}