import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Records a daily price snapshot for a specific listing and returns its full
// price history. The listing price is read authoritatively as the service role
// (bypassing RLS) so clients cannot inject arbitrary prices into the history —
// only the listing's actual stored price is ever recorded. One snapshot per
// listing per day; the chart on the listing detail page builds over time.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listingId = (body?.listing_id || '').trim();
    if (!listingId) return Response.json({ error: 'listing_id required' }, { status: 400 });

    let listing;
    try {
      listing = await base44.asServiceRole.entities.Listing.get(listingId);
    } catch {
      return Response.json({ history: [] });
    }
    if (!listing) return Response.json({ history: [] });

    const today = new Date().toISOString().slice(0, 10);
    const history = await base44.asServiceRole.entities.ListingPriceHistory.filter(
      { listing_id: listingId },
      "date",
      500
    );

    if (listing.status === 'active' && listing.price > 0 && !history.some((h) => h.date === today)) {
      const snap = await base44.asServiceRole.entities.ListingPriceHistory.create({
        listing_id: listingId,
        price: listing.price,
        date: today,
      });
      history.push(snap);
    }

    history.sort((a, b) => a.date.localeCompare(b.date));
    return Response.json({ history });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}