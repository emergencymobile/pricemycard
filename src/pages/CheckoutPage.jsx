import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Loader2, Shield, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { maskName } from "@/lib/maskName";
import { formatAED } from "@/lib/format";

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "", full_name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "", phone: "", is_default: false });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const [cart, addr] = await Promise.all([
          base44.entities.CartItem.filter({ user_id: u.id }),
          base44.entities.Address.filter({ user_id: u.id }),
        ]);
        setCartItems(cart);
        setAddresses(addr);
        const def = addr.find(a => a.is_default);
        if (def) setSelectedAddress(def.id);
        else if (addr.length) setSelectedAddress(addr[0].id);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + (i.listing_price || 0) * (i.quantity || 1), 0);
  const shipping = cartItems.reduce((s, i) => s + (i.shipping_cost || 0), 0);
  const total = subtotal + shipping;

  const placeOrder = async () => {
    if (!selectedAddress) { toast({ title: "Please select a shipping address", variant: "destructive" }); return; }
    setProcessing(true);
    try {
      const addr = addresses.find(a => a.id === selectedAddress);
      for (const item of cartItems) {
        await base44.entities.Order.create({
          listing_id: item.listing_id, listing_title: item.listing_title, listing_image: item.listing_image,
          seller_id: item.seller_id, buyer_id: user.id,
          price: item.listing_price, shipping_cost: item.shipping_cost || 0,
          total: (item.listing_price * (item.quantity || 1)) + (item.shipping_cost || 0),
          quantity: item.quantity || 1,
          status: "pending",
          shipping_address: addr ? { full_name: addr.full_name, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, postal_code: addr.postal_code, country: addr.country, phone: addr.phone } : {},
        });
        await base44.entities.CartItem.delete(item.id);
      }
      toast({ title: "Order placed successfully!" });
      navigate("/orders");
    } catch { toast({ title: "Something went wrong", variant: "destructive" }); }
    setProcessing(false);
  };

  const saveNewAddress = async () => {
    if (!newAddr.full_name || !newAddr.line1 || !newAddr.city || !newAddr.country) { toast({ title: "Please fill required fields", variant: "destructive" }); return; }
    setSavingAddr(true);
    try {
      const a = await base44.entities.Address.create({ ...newAddr, user_id: user.id });
      setAddresses(prev => [...prev, a]);
      setSelectedAddress(a.id);
      setShowNewForm(false);
      setNewAddr({ label: "", full_name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "", phone: "", is_default: false });
      toast({ title: "Address saved!" });
    } catch { toast({ title: "Could not save address", variant: "destructive" }); }
    setSavingAddr(false);
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  if (cartItems.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl mb-8">Checkout</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Shipping Address */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Shipping Address</h3>
            {addresses.length > 0 && !showNewForm ? (
              <div className="space-y-3">
                <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select address" /></SelectTrigger>
                  <SelectContent>
                    {addresses.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.label || a.full_name} — {a.line1}, {a.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="rounded-lg gap-1 text-xs" onClick={() => setShowNewForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> Use a new address
                </Button>
              </div>
            ) : (
              <div className="bg-secondary rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{addresses.length > 0 ? "New address" : "Add shipping address"}</p>
                  {addresses.length > 0 && <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowNewForm(false)}>Cancel</button>}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">Full Name *</Label><Input value={newAddr.full_name} onChange={e => setNewAddr(f => ({ ...f, full_name: e.target.value }))} autoComplete="name" className="rounded-lg" /></div>
                  <div><Label className="text-xs mb-1 block">Label</Label><Input value={newAddr.label} onChange={e => setNewAddr(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Home" className="rounded-lg" /></div>
                </div>
                <div><Label className="text-xs mb-1 block">Address Line 1 *</Label><Input value={newAddr.line1} onChange={e => setNewAddr(f => ({ ...f, line1: e.target.value }))} autoComplete="address-line1" className="rounded-lg" /></div>
                <div><Label className="text-xs mb-1 block">Address Line 2</Label><Input value={newAddr.line2} onChange={e => setNewAddr(f => ({ ...f, line2: e.target.value }))} autoComplete="address-line2" className="rounded-lg" /></div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><Label className="text-xs mb-1 block">City *</Label><Input value={newAddr.city} onChange={e => setNewAddr(f => ({ ...f, city: e.target.value }))} autoComplete="address-level2" className="rounded-lg" /></div>
                  <div><Label className="text-xs mb-1 block">State</Label><Input value={newAddr.state} onChange={e => setNewAddr(f => ({ ...f, state: e.target.value }))} autoComplete="address-level1" className="rounded-lg" /></div>
                  <div><Label className="text-xs mb-1 block">Postal Code</Label><Input value={newAddr.postal_code} onChange={e => setNewAddr(f => ({ ...f, postal_code: e.target.value }))} autoComplete="postal-code" className="rounded-lg" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">Country *</Label><Input value={newAddr.country} onChange={e => setNewAddr(f => ({ ...f, country: e.target.value }))} autoComplete="country-name" className="rounded-lg" /></div>
                  <div><Label className="text-xs mb-1 block">Phone</Label><Input value={newAddr.phone} onChange={e => setNewAddr(f => ({ ...f, phone: e.target.value }))} autoComplete="tel" className="rounded-lg" /></div>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={saveNewAddress} disabled={savingAddr}>
                  {savingAddr ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save & Use This Address
                </Button>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Items ({cartItems.length})</h3>
            <div className="space-y-2">
              {cartItems.map(item => (
                <div key={item.id} className="bg-secondary rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={item.listing_image || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{maskName(item.listing_title)}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</p>
                  </div>
                  <p className="font-display font-bold text-sm">{formatAED((item.listing_price || 0) * (item.quantity || 1))}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-secondary rounded-xl p-6 space-y-4 sticky top-20">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatAED(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping > 0 ? formatAED(shipping) : "Free"}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold"><span>Total</span><span>{formatAED(total)}</span></div>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12" onClick={placeOrder} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />} Place Order
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" /> Secure checkout · Buyer protection
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}