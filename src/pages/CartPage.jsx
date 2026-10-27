import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingCart, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { maskName } from "@/lib/maskName";
import { formatAED } from "@/lib/format";

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        const cart = await base44.entities.CartItem.filter({ user_id: user.id });
        setItems(cart);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const removeItem = async (id) => {
    await base44.entities.CartItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Item removed" });
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setChecking(true);
    try {
      const coupons = await base44.entities.Coupon.filter({ code: coupon.trim().toUpperCase(), is_active: true });
      if (coupons.length) {
        const c = coupons[0];
        const sub = subtotal;
        if (c.min_order && sub < c.min_order) { toast({ title: `Minimum order: ${formatAED(c.min_order)}`, variant: "destructive" }); setChecking(false); return; }
        const d = c.discount_type === "percentage" ? sub * (c.discount_value / 100) : c.discount_value;
        setDiscount(Math.min(d, sub));
        toast({ title: "Coupon applied!" });
      } else toast({ title: "Invalid coupon", variant: "destructive" });
    } catch { toast({ title: "Could not apply coupon", variant: "destructive" }); }
    setChecking(false);
  };

  const subtotal = items.reduce((s, i) => s + (i.listing_price || 0) * (i.quantity || 1), 0);
  const shipping = items.reduce((s, i) => s + (i.shipping_cost || 0), 0);
  const total = Math.max(0, subtotal + shipping - discount);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl mb-8">Shopping Cart ({items.length})</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium text-lg mb-2">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mb-6">Browse the marketplace to find cards you love</p>
          <Link to="/search"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Browse Cards</Button></Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 bg-secondary rounded-xl p-4">
                <Link to={`/listing/${item.listing_id}`} className="shrink-0 w-20 h-24 rounded-lg overflow-hidden bg-muted">
                  <Image src={item.listing_image || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&h=250&fit=crop"} alt="" className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/listing/${item.listing_id}`} className="font-medium text-sm hover:text-emerald-600 transition-colors truncate block">{maskName(item.listing_title)}</Link>
                  <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity || 1}</p>
                  <p className="font-display font-bold text-emerald-600 mt-2">{formatAED((item.listing_price || 0) * (item.quantity || 1))}</p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <div className="bg-secondary rounded-xl p-6 space-y-4 sticky top-20">
              <h3 className="font-semibold">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatAED(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping > 0 ? formatAED(shipping) : "Free"}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatAED(discount)}</span></div>}
                <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span>{formatAED(total)}</span></div>
              </div>

              <div className="flex gap-2">
                <Input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Coupon code" className="rounded-lg text-sm" />
                <Button variant="outline" size="sm" className="rounded-lg shrink-0" onClick={applyCoupon} disabled={checking}>
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                </Button>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12" onClick={() => navigate("/checkout")}>
                Checkout · {formatAED(total)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}