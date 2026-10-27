import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Admin-only: approve or deny a pending access request. On approval, grants
// the user premium access by creating/updating a PremiumSubscription record
// with status "active" and plan "granted_access" (no Stripe subscription).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { request_id, action } = body;
    if (!request_id || !['approve', 'deny'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const request = await base44.asServiceRole.entities.AccessRequest.get(request_id);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });

    if (action === 'approve') {
      await base44.asServiceRole.entities.AccessRequest.update(request_id, { status: 'approved' });

      // Grant premium access — only possible when the request has a linked user
      // (logged-in requester). Anonymous (email-only) requests are marked
      // approved so the admin can manually invite or follow up by email.
      if (request.user_id) {
        const existing = await base44.asServiceRole.entities.PremiumSubscription.filter(
          { user_id: request.user_id }, '-created_date', 1
        );
        if (existing.length > 0) {
          await base44.asServiceRole.entities.PremiumSubscription.update(existing[0].id, {
            status: 'active',
            plan: 'granted_access',
          });
        } else {
          await base44.asServiceRole.entities.PremiumSubscription.create({
            user_id: request.user_id,
            status: 'active',
            plan: 'granted_access',
            stripe_subscription_id: 'granted_' + request.user_id,
          });
        }
      }
    } else {
      await base44.asServiceRole.entities.AccessRequest.update(request_id, { status: 'denied' });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}