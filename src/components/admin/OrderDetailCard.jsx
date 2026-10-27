import React from "react";
import { User, MapPin, Package, CreditCard, Truck, Ticket, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatAED } from "@/lib/format";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
  refunded: "bg-gray-100 text-gray-700",
};

export default function OrderDetailCard({ order, users, onStatusChange }) {
  const buyer = users.find(u => u.id === order.buyer_id);
  const seller = users.find(u => u.id === order.seller_id);
  const created = order.created_date ? new Date(order.created_date).toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div className="bg-secondary rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{order.listing_title || "Untitled listing"}</p>
          <p className="text-xs text-muted-foreground font-mono">#{order.id?.slice(-8)}</p>
          {created && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" /> {created}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}>{order.status}</Badge>
          <Select value={order.status} onValueChange={v => onStatusChange(order.id, v)}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["pending", "paid", "shipped", "delivered", "completed", "cancelled", "returned", "refunded"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-background/40 rounded-lg p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5"><Package className="w-3 h-3" /> Item ({order.quantity || 1}×)</span>
          <span className="font-medium">{formatAED(order.price || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5"><Truck className="w-3 h-3" /> Shipping</span>
          <span className="font-medium">{formatAED(order.shipping_cost || 0)}</span>
        </div>
        {!!order.tax && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatAED(order.tax)}</span>
          </div>
        )}
        {!!order.discount && (
          <div className="flex justify-between text-emerald-400">
            <span className="flex items-center gap-1.5"><Ticket className="w-3 h-3" /> Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
            <span className="font-medium">−{formatAED(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5 border-t border-border/50">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-bold text-foreground">{formatAED(order.total || 0)}</span>
        </div>
      </div>

      {/* Buyer & Seller */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground flex items-center gap-1.5 mb-1"><User className="w-3 h-3" /> Buyer</p>
          <p className="font-medium truncate">{buyer?.full_name || buyer?.email || "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground flex items-center gap-1.5 mb-1"><User className="w-3 h-3" /> Seller</p>
          <p className="font-medium truncate">{seller?.full_name || seller?.email || "—"}</p>
        </div>
      </div>

      {/* Tracking */}
      {order.tracking_number && (
        <div className="text-xs">
          <p className="text-muted-foreground flex items-center gap-1.5 mb-0.5"><Truck className="w-3 h-3" /> Tracking</p>
          <p className="font-mono font-medium">{order.tracking_number}</p>
        </div>
      )}

      {/* Shipping address */}
      {order.shipping_address && (
        <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <p className="font-medium text-foreground flex items-center gap-1.5 mb-1.5"><MapPin className="w-3.5 h-3.5" /> Ship to</p>
          <div className="space-y-0.5">
            <p className="text-foreground font-medium">{order.shipping_address.full_name}</p>
            <p>{order.shipping_address.line1}</p>
            {order.shipping_address.line2 && <p>{order.shipping_address.line2}</p>}
            <p>{order.shipping_address.city}{order.shipping_address.state ? `, ${order.shipping_address.state}` : ""} {order.shipping_address.postal_code}</p>
            <p>{order.shipping_address.country}</p>
            {order.shipping_address.phone && <p className="pt-1">📞 {order.shipping_address.phone}</p>}
          </div>
        </div>
      )}

      {!order.shipping_address && (
        <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground italic">
          No shipping address provided
        </div>
      )}
    </div>
  );
}