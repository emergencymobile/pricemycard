import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const LOW_STOCK_THRESHOLD = 3;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Reject anonymous callers — this function creates seller notifications
    // via asServiceRole and must only run for logged-in users (the workflow
    // engine invokes it with a service-role token).
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    if (!orderId) return Response.json({ error: 'order_id required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order || !order.seller_id) return Response.json({ ok: true, skipped: true });

    // 1. "Item sold" notification to the seller
    await base44.asServiceRole.entities.Notification.create({
      user_id: order.seller_id,
      type: "item_sold",
      title: "Your item was purchased",
      body: `"${order.listing_title || 'Your listing'}" was just purchased.`,
      link: "/orders",
      related_id: `sale:${order.id}`,
    }).catch(() => {});

    // 2. Low-stock check: group the seller's active listings by category and
    // notify for any category whose total quantity is under the threshold.
    const listings = await base44.asServiceRole.entities.Listing.filter(
      { created_by_id: order.seller_id, status: "active" }
    );

    const byCategory = {};
    (listings || []).forEach((l) => {
      const cat = l.category || "Uncategorized";
      byCategory[cat] = (byCategory[cat] || 0) + (l.quantity || 1);
    });

    // Dedup: skip a low-stock notification if one for the same category was
    // sent to this seller in the last 24 hours (avoids spam on repeated sales).
    const recent = await base44.asServiceRole.entities.Notification.filter(
      { user_id: order.seller_id, type: "system" },
      "-created_date",
      100
    );
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentLowStockKeys = new Set(
      (recent || [])
        .filter((n) => {
          if (!(n.related_id || "").startsWith("lowstock:")) return false;
          return new Date(n.created_date).getTime() >= oneDayAgo;
        })
        .map((n) => n.related_id)
    );

    for (const [category, qty] of Object.entries(byCategory)) {
      if (qty < LOW_STOCK_THRESHOLD) {
        const key = `lowstock:${category}`;
        if (recentLowStockKeys.has(key)) continue;
        await base44.asServiceRole.entities.Notification.create({
          user_id: order.seller_id,
          type: "system",
          title: "Low stock alert",
          body: `You have only ${qty} item${qty === 1 ? "" : "s"} left in ${category}. Consider restocking.`,
          link: "/dashboard",
          related_id: key,
        }).catch(() => {});
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}