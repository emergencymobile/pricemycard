import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Allows a user (logged-in or guest) to request free access from the app
// owner instead of paying. Anti-spam: one pending request per user or email
// — if a pending or approved request already exists for that identifier, the
// submission is rejected. Device type is detected from the user agent and
// stored alongside the note. Uses asServiceRole so anonymous (guest) requests
// with no user_id can be created.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth is optional — guests can request access with just an email.
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const note = (body?.note || '').trim();
    if (!note || note.length < 10) {
      return Response.json({ error: 'Please write a note (at least 10 characters).' }, { status: 400 });
    }
    if (note.length > 1000) {
      return Response.json({ error: 'Note is too long (max 1000 characters).' }, { status: 400 });
    }

    // Email: prefer the provided email for guests, fall back to the logged-in user's email.
    const email = (body?.email || '').trim().toLowerCase();
    if (!user && !email) {
      return Response.json({ error: 'Please provide your email address.' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const userId = user?.id || null;
    const userEmail = email || (user?.email || '');

    // Anti-spam: reject if the user/email already has a pending or approved request.
    const filter = userId ? { user_id: userId } : { user_email: userEmail };
    const existing = await base44.asServiceRole.entities.AccessRequest.filter(
      filter, '-created_date', 10
    );
    const hasApproved = (existing || []).some(r => r.status === 'approved');
    const hasPending = (existing || []).some(r => r.status === 'pending');
    if (hasApproved) {
      return Response.json({ error: 'Your access has already been granted.' }, { status: 409 });
    }
    if (hasPending) {
      return Response.json({ error: 'You already have a pending request. Please wait for a response.' }, { status: 409 });
    }

    // Detect device type from the user agent.
    const ua = req.headers.get('user-agent') || '';
    let deviceType = 'desktop';
    if (/iPad|Tablet/i.test(ua)) deviceType = 'tablet';
    else if (/Mobile|Android|iPhone/i.test(ua)) deviceType = 'mobile';

    const request = await base44.asServiceRole.entities.AccessRequest.create({
      user_id: userId,
      user_email: userEmail,
      device_type: deviceType,
      note,
      status: 'pending',
    });

    return Response.json({ ok: true, request });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}