import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Truck, CheckCircle, XCircle, Clock, Star, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { formatAED } from "@/lib/format";
import { useToast } from "@/components/ui/use-toast";
import ReviewForm from "@/components/reviews/ReviewForm";

const STATUS_ICONS = { pending: Clock, paid: Package, shipped: Truck, delivered: CheckCircle, completed: CheckCircle, cancelled: XCircle, returned: XCircle, refunded: XCircle };
const STATUS_COLORS = { pending: "bg-yellow-100 text-yellow-700", paid: "bg-blue-100 text-blue-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-emerald-100 text-emerald-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700", returned: "bg-red-100 text-red-700", refunded: "bg-gray-100 text-gray-700" };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set());
  const { toast } = useToast();

  const load = async () => {
    try {
      const u = await base44.auth.me();
      const [o, myReviews] = await Promise.all([
        base44.entities.Order.filter({ buyer_id: u.id }, "-created_date"),
        base44.entities.Review.filter({ created_by_id: u.id }, "-created_date", 200),
      ]);
      setOrders(o);
      setReviewedOrderIds(new Set((myReviews || []).map((r) => r.order_id).filter(Boolean)));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-2">No orders yet</p>
          <p className="text-sm text-muted-foreground">When you buy cards, they'll appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const Icon = STATUS_ICONS[o.status] || Clock;
            const canReview = o.status === "completed";
            const alreadyReviewed = reviewedOrderIds.has(o.id);
            if (canReview && alreadyReviewed) return null;
            return (
              <div key={o.id} className="bg-secondary rounded-xl p-4">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-18 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image src={o.listing_image || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=130&fit=crop"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{o.listing_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Order #{o.id?.slice(-6)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-[10px] ${STATUS_COLORS[o.status]}`}>
                        <Icon className="w-3 h-3 mr-1" /> {o.status}
                      </Badge>
                      {o.tracking_number && <span className="text-xs text-muted-foreground">Tracking: {o.tracking_number}</span>}
                    </div>
                  </div>
                  <p className="font-display font-bold text-sm">{formatAED(o.total)}</p>
                </div>
                {canReview && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    {alreadyReviewed ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <Star className="w-3.5 h-3.5 fill-emerald-600" /> Review submitted
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs gap-1.5"
                        onClick={() => setReviewOrder(o)}
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Leave a Review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewOrder && (
        <ReviewForm
          order={reviewOrder}
          open={!!reviewOrder}
          onOpenChange={(v) => !v && setReviewOrder(null)}
          onSubmitted={() => {
            setReviewedOrderIds((prev) => new Set(prev).add(reviewOrder.id));
            toast({ title: "Thanks for your review!" });
          }}
        />
      )}
    </div>
  );
}