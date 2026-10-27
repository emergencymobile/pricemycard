import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Shield, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import CardGrid from "@/components/cards/CardGrid";
import CardRow from "@/components/home/CardRow";
import PopularCards from "@/components/home/PopularCards";
import PullToRefresh from "@/components/native/PullToRefresh";
import { motion } from "framer-motion";

const CATEGORIES = [
  { name: "Singles", icon: "⚡", desc: "Individual cards" },
  { name: "Lots", icon: "📦", desc: "Card bundles" },
  { name: "Boxes", icon: "🎁", desc: "Sealed boxes" },
  { name: "Packs", icon: "🃏", desc: "Card packs" },
  { name: "Memorabilia", icon: "🏆", desc: "Signed gear" },
];

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Listing.filter({ status: "active" }, "-created_date", 20)
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Track guest site visits (once per page load) for admin analytics.
  useEffect(() => {
    if (sessionStorage.getItem("visit_tracked")) return;
    sessionStorage.setItem("visit_tracked", "1");
    base44.entities.SearchActivity.create({ activity_type: "visit" }).catch(() => {});
  }, []);

  const refresh = async () => {
    try {
      const data = await base44.entities.Listing.filter({ status: "active" }, "-created_date", 20);
      setListings(data);
    } catch {}
  };

  // Only show listings that have at least one picture — listings without an
  // image render a placeholder tile, which we hide on the homepage.
  const withImages = listings.filter((l) => l.images?.length > 0);
  const featured = withImages.filter((l) => l.is_featured).slice(0, 8);
  const newest = withImages.slice(0, 12);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/web-search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const loadingSpinner = (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={refresh}>
      <div>
        {/* ===== Mobile hero ===== */}
        <section className="md:hidden px-4 pt-4 pb-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="font-display font-bold text-lg leading-tight text-center">
              Find any card's <span className="text-emerald-400">true value</span>
            </h1>
            <p className="text-[11px] text-muted-foreground text-center mt-1 mb-3">
              Live eBay prices · any player, any card
            </p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Messi, Haaland, Bellingham…"
                  className="w-full h-11 pl-9 pr-3 rounded-full bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <Button type="submit" className="h-11 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shrink-0">
                Search
              </Button>
            </form>
          </motion.div>
        </section>

        {/* ===== Desktop hero ===== */}
        <section className="hidden md:block relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 text-white">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1920&q=80')] bg-cover bg-center opacity-10" />
          <div className="relative max-w-4xl mx-auto px-4 py-32 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="font-display font-bold leading-tight mb-4 text-6xl">
                Find the <span className="text-emerald-400">True Market Value</span> of Any Soccer Card
              </h1>
              <p className="text-gray-300 text-xl mb-6 leading-relaxed max-w-2xl mx-auto">
                Search live active eBay listings for any player or card. See real asking prices, estimated values, and trends — your go-to reference for buying, selling, and trading.
              </p>
              <form onSubmit={handleSearch} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-1.5">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search any player (e.g. Messi, Haaland, Bellingham)"
                  className="flex-1 min-w-0 h-14 rounded-xl bg-white/10 border border-white/20 px-5 text-white text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="submit" className="h-14 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-8 text-base font-semibold whitespace-nowrap">
                  <Search className="w-5 h-5 mr-1.5" /> Search Market
                </Button>
              </form>
              <p className="text-xs text-gray-400 mt-4">Powered by live eBay listings · The smart way to price any card</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
              {[
                { label: "eBay Listings", val: "Millions" },
                { label: "Players", val: "Any" },
                { label: "Marketplace", val: listings.length > 0 ? `${listings.length}+` : "1,000+" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display font-bold text-3xl text-white">{s.val}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Trust Bar (desktop only) */}
        <section className="hidden md:block border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-16 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-600" /> Buyer Protection</div>
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-emerald-600" /> Tracked Shipping</div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-600" /> Secure Payments</div>
            </div>
          </div>
        </section>

        {/* ===== Mobile category chips ===== */}
        <section className="md:hidden">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                to={`/search?category=${cat.name}`}
                className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary border border-border text-xs font-medium whitespace-nowrap active:bg-secondary/70"
              >
                <span>{cat.icon}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        </section>

        {/* ===== Mobile content rows ===== */}
        <div className="md:hidden space-y-5 pb-4">
          {loading ? (
            loadingSpinner
          ) : (
            <>
              {featured.length > 0 && (
                <CardRow listings={featured} title="Featured Cards" subtitle="Hand-picked" viewAllLink="/search?featured=true" />
              )}
              <CardRow listings={newest} title="Newest Listings" subtitle="Just added" viewAllLink="/search?sort=newest" />
            </>
          )}
        </div>

        {/* ===== Desktop content ===== */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 py-12 space-y-16">
          <section>
            <h2 className="font-display font-bold text-2xl mb-6">Browse Categories</h2>
            <div className="grid grid-cols-5 gap-3">
              {CATEGORIES.map((cat) => (
                <Link key={cat.name} to={`/search?category=${cat.name}`}>
                  <motion.div whileHover={{ y: -2 }} className="bg-secondary hover:bg-secondary/80 rounded-xl p-4 text-center transition-colors h-full">
                    <span className="text-2xl">{cat.icon}</span>
                    <p className="font-medium text-sm mt-2">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.desc}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
          {loading ? (
            loadingSpinner
          ) : (
            <>
              {featured.length > 0 && (
                <CardGrid listings={featured} title="Featured Cards" subtitle="Hand-picked by our team" viewAllLink="/search?featured=true" />
              )}
              <CardGrid listings={newest} title="Newest Listings" subtitle="Just added to the marketplace" viewAllLink="/search?sort=newest" />
            </>
          )}
        </div>

        {/* Popular — single responsive mount */}
        <PopularCards />
      </div>
    </PullToRefresh>
  );
}