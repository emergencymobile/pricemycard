import React, { useState, useEffect } from "react";
import { Users, Package, ShoppingBag, Flag, Tag, Megaphone, Star as StarIcon, BarChart3, DollarSign, TrendingUp, Globe, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { formatAED } from "@/lib/format";
import ReportedListings from "@/components/admin/ReportedListings";
import OrderDetailCard from "@/components/admin/OrderDetailCard";
import AccessRequests from "@/components/admin/AccessRequests";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [searchActivity, setSearchActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({ code: "", discount_type: "percentage", discount_value: "", min_order: "", max_uses: "" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "", type: "info" });
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [u, l, o, c, a, sa] = await Promise.all([
          base44.entities.User.list("-created_date", 50),
          base44.entities.Listing.list("-created_date", 50),
          base44.entities.Order.list("-created_date", 50),
          base44.entities.Coupon.list("-created_date", 20),
          base44.entities.Announcement.list("-created_date", 10),
          base44.entities.SearchActivity.list("-created_date", 500),
        ]);
        setUsers(u); setListings(l); setOrders(o); setCoupons(c); setAnnouncements(a); setSearchActivity(sa);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const toggleFeatured = async (listing) => {
    await base44.entities.Listing.update(listing.id, { is_featured: !listing.is_featured });
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, is_featured: !l.is_featured } : l));
  };

  const deleteListing = async (listing) => {
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    await base44.entities.Listing.delete(listing.id);
    setListings(prev => prev.filter(l => l.id !== listing.id));
    toast({ title: "Listing deleted" });
  };

  const updateOrderStatus = async (id, status) => {
    await base44.entities.Order.update(id, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast({ title: "Order updated" });
  };

  const createCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) return;
    const c = await base44.entities.Coupon.create({
      ...newCoupon,
      code: newCoupon.code.toUpperCase(),
      discount_value: Number(newCoupon.discount_value),
      min_order: Number(newCoupon.min_order) || 0,
      max_uses: Number(newCoupon.max_uses) || 999,
    });
    setCoupons(prev => [c, ...prev]);
    setNewCoupon({ code: "", discount_type: "percentage", discount_value: "", min_order: "", max_uses: "" });
    toast({ title: "Coupon created!" });
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.body) return;
    const a = await base44.entities.Announcement.create(newAnnouncement);
    setAnnouncements(prev => [a, ...prev]);
    setNewAnnouncement({ title: "", body: "", type: "info" });
    toast({ title: "Announcement created!" });
  };

  const totalRevenue = orders.filter(o => ["paid", "shipped", "delivered", "completed"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);
  const activeListings = listings.filter(l => l.status === "active").length;
  // Guests who entered the website. The platform sets created_by_id to
  // "anonymous" for unauthenticated users, so we match that explicitly.
  const guestVisits = searchActivity.filter(a => a.activity_type === "visit" && (!a.created_by_id || a.created_by_id === "anonymous")).length;

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl mb-8">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { icon: Users, label: "Users", val: users.length, color: "text-blue-600" },
          { icon: Package, label: "Active Listings", val: activeListings, color: "text-emerald-600" },
          { icon: ShoppingBag, label: "Orders", val: orders.length, color: "text-purple-600" },
          { icon: DollarSign, label: "Revenue", val: formatAED(totalRevenue), color: "text-orange-600" },
          { icon: Globe, label: "Guest Visits", val: guestVisits, color: "text-cyan-600" },
        ].map(s => (
          <div key={s.label} className="bg-secondary rounded-xl p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="font-display font-bold text-xl">{s.val}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="access">Access Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-secondary rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge>{u.role || "user"}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="listings">
          {listings.some(l => l.needs_review) && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-amber-300">{listings.filter(l => l.needs_review).length} listing(s) need manual naming — auto-naming couldn't read the card.</p>
            </div>
          )}
          <div className="space-y-2">
            {listings.map(l => (
              <div key={l.id} className="bg-secondary rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    {l.title}
                    {l.needs_review && <Badge className="bg-amber-500 text-black text-[10px]">Needs Review</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{l.player_name} · {formatAED(l.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px]">{l.status}</Badge>
                  <div className="flex items-center gap-1">
                    <Switch checked={l.is_featured} onCheckedChange={() => toggleFeatured(l)} />
                    <Label className="text-xs">Featured</Label>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteListing(l)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="space-y-3">
            {orders.map(o => (
              <OrderDetailCard key={o.id} order={o} users={users} onStatusChange={updateOrderStatus} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coupons">
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-sm mb-3">Create Coupon</h3>
            <div className="grid sm:grid-cols-5 gap-3">
              <Input value={newCoupon.code} onChange={e => setNewCoupon(c => ({ ...c, code: e.target.value }))} placeholder="CODE" className="rounded-lg" />
              <Select value={newCoupon.discount_type} onValueChange={v => setNewCoupon(c => ({ ...c, discount_type: v }))}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">AED</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" value={newCoupon.discount_value} onChange={e => setNewCoupon(c => ({ ...c, discount_value: e.target.value }))} placeholder="Value" className="rounded-lg" />
              <Input type="number" value={newCoupon.min_order} onChange={e => setNewCoupon(c => ({ ...c, min_order: e.target.value }))} placeholder="Min order" className="rounded-lg" />
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={createCoupon}>Create</Button>
            </div>
          </div>
          <div className="space-y-2">
            {coupons.map(c => (
              <div key={c.id} className="bg-secondary rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono font-bold text-sm">{c.code}</p>
                  <p className="text-xs text-muted-foreground">{c.discount_type === "percentage" ? c.discount_value + "%" : formatAED(c.discount_value)} off · {c.uses_count || 0} uses</p>
                </div>
                <Badge className={c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100"}>{c.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-sm mb-3">Create Announcement</h3>
            <div className="space-y-3">
              <Input value={newAnnouncement.title} onChange={e => setNewAnnouncement(a => ({ ...a, title: e.target.value }))} placeholder="Title" className="rounded-lg" />
              <Textarea value={newAnnouncement.body} onChange={e => setNewAnnouncement(a => ({ ...a, body: e.target.value }))} placeholder="Message..." className="rounded-lg" />
              <div className="flex gap-2">
                <Select value={newAnnouncement.type} onValueChange={v => setNewAnnouncement(a => ({ ...a, type: v }))}>
                  <SelectTrigger className="w-32 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" onClick={createAnnouncement}>Publish</Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="bg-secondary rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm">{a.title}</p>
                  <Badge className="text-[10px]">{a.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <ReportedListings />
        </TabsContent>

        <TabsContent value="access">
          <AccessRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
}