import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Edit, Trash2, Copy, Package, DollarSign, BarChart3, TrendingUp, Wand2 } from "lucide-react";
import AutoNameButton from "@/components/cards/AutoNameButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import { formatAED } from "@/lib/format";

const STATUS_COLORS = { draft: "bg-gray-100 text-gray-700", active: "bg-emerald-100 text-emerald-700", sold: "bg-blue-100 text-blue-700", paused: "bg-yellow-100 text-yellow-700" };

export default function Dashboard() {
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const [l, o] = await Promise.all([
          base44.entities.Listing.filter({ created_by_id: u.id }),
          base44.entities.Order.filter({ seller_id: u.id }),
        ]);
        setListings(l);
        setOrders(o);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const deleteListing = async (id) => {
    await base44.entities.Listing.update(id, { status: "deleted" });
    setListings(prev => prev.filter(l => l.id !== id));
    toast({ title: "Listing deleted" });
  };

  const duplicateListing = async (listing) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = listing;
    const newL = await base44.entities.Listing.create({ ...rest, status: "draft", title: `${rest.title} (Copy)` });
    setListings(prev => [newL, ...prev]);
    toast({ title: "Listing duplicated" });
  };

  const toggleStatus = async (listing) => {
    const newStatus = listing.status === "active" ? "paused" : "active";
    await base44.entities.Listing.update(listing.id, { status: newStatus });
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));
  };

  const totalSales = orders.filter(o => ["paid", "shipped", "delivered", "completed"].includes(o.status)).reduce((s, o) => s + o.total, 0);
  const activeCount = listings.filter(l => l.status === "active").length;
  const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your listings and sales</p>
        </div>
        <Link to="/sell"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"><Plus className="w-4 h-4" /> New Listing</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Package, label: "Active Listings", val: activeCount, color: "text-emerald-600" },
          { icon: DollarSign, label: "Total Sales", val: formatAED(totalSales), color: "text-blue-600" },
          { icon: BarChart3, label: "Total Views", val: totalViews, color: "text-purple-600" },
          { icon: TrendingUp, label: "Orders", val: orders.length, color: "text-orange-600" },
        ].map(s => (
          <div key={s.label} className="bg-secondary rounded-xl p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="font-display font-bold text-xl">{s.val}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="mb-6">
          <TabsTrigger value="listings">Listings ({listings.length})</TabsTrigger>
          <TabsTrigger value="orders">Sales ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {listings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">No listings yet</p>
              <Link to="/sell"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Create Your First Listing</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.filter(l => l.status !== "deleted").map(l => (
                <div key={l.id} className="flex gap-4 bg-secondary rounded-xl p-4 items-center">
                  <div className="w-14 h-18 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image src={l.images?.[0] || "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=100&h=130&fit=crop"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{l.title}</p>
                      <Badge className={`text-[10px] ${STATUS_COLORS[l.status] || "bg-gray-100"}`}>{l.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{l.player_name} · {l.team}</p>
                    <p className="font-display font-bold text-sm text-emerald-600 mt-1">{formatAED(l.price)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground mr-2"><Eye className="w-3 h-3 inline" /> {l.views || 0}</span>
                    <AutoNameButton listing={l} onNamed={(updated) => setListings(prev => prev.map(x => x.id === l.id ? { ...x, ...updated } : x))} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(l)}>
                      <Package className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateListing(l)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteListing(l.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="bg-secondary rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{o.listing_title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Order #{o.id?.slice(-6)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-sm">{formatAED(o.total)}</p>
                    <Badge className="text-[10px] mt-1">{o.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}