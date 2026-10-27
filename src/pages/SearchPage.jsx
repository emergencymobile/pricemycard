import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { textMatch } from "@/lib/fuzzySearch";
import CardTile from "@/components/cards/CardTile";
import { motion, AnimatePresence } from "framer-motion";

const CONDITIONS = ["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"];
const CATEGORIES = ["Singles", "Lots", "Boxes", "Packs", "Cases"];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    condition: "",
    is_autograph: false,
    is_patch: false,
    is_rookie: false,
    minPrice: "",
    maxPrice: "",
  });

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const filter = { status: "active" };
      if (filters.category) filter.category = filters.category;
      if (filters.condition) filter.condition = filters.condition;
      if (filters.is_autograph) filter.is_autograph = true;
      if (filters.is_patch) filter.is_patch = true;
      if (filters.is_rookie) filter.is_rookie = true;

      const sortMap = { newest: "-created_date", oldest: "created_date", price_low: "price", price_high: "-price", popular: "-views" };
      let results = await base44.entities.Listing.filter(filter, sortMap[sort] || "-created_date", 50);

      if (query) {
        results = results.filter(l =>
          textMatch(query, l.title) > 0 ||
          textMatch(query, l.player_name) > 0 ||
          textMatch(query, l.team) > 0 ||
          textMatch(query, l.manufacturer) > 0 ||
          textMatch(query, l.card_set) > 0
        );
      }
      if (filters.minPrice) results = results.filter(l => l.price >= Number(filters.minPrice));
      if (filters.maxPrice) results = results.filter(l => l.price <= Number(filters.maxPrice));
      // Hide listings without a picture (they'd show an "Add Picture" placeholder).
      results = results.filter(l => l.images?.length > 0);

      setListings(filters.category ? results.slice(0, 3) : results);
    } catch { setListings([]); }
    setLoading(false);
  }, [query, sort, filters]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Sync component state with URL query params so navigating between
  // /search (Browse) and /search?category=Singles (Collections) updates the
  // view even though the route (and component) stays mounted.
  useEffect(() => {
    setFilters(f => ({ ...f, category: searchParams.get("category") || "" }));
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(prev => { prev.set("q", query); return prev; });
    fetchListings();
  };

  const clearFilters = () => {
    setFilters({ category: "", condition: "", is_autograph: false, is_patch: false, is_rookie: false, minPrice: "", maxPrice: "" });
    setQuery("");
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== false).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4 md:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cards, players, teams..."
            className="w-full pl-10 pr-4 py-2.5 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <Button type="button" variant="outline" className="rounded-xl gap-2 relative" onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
        </Button>
      </form>

      {/* Sort Bar */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <p className="text-sm text-muted-foreground">{listings.length} results</p>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="price_low">Price: Low</SelectItem>
            <SelectItem value="price_high">Price: High</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="shrink-0 overflow-hidden hidden md:block">
              <div className="w-[260px] space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Filters</h3>
                  <button onClick={clearFilters} className="text-xs text-emerald-600 hover:underline">Clear all</button>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
                  <div className="space-y-1.5">
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setFilters(f => ({ ...f, category: f.category === c ? "" : c }))}
                        className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${filters.category === c ? "bg-emerald-50 text-emerald-700 font-medium" : "hover:bg-secondary"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Condition</p>
                  <div className="space-y-1.5">
                    {CONDITIONS.map(c => (
                      <button key={c} onClick={() => setFilters(f => ({ ...f, condition: f.condition === c ? "" : c }))}
                        className={`block w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${filters.condition === c ? "bg-emerald-50 text-emerald-700 font-medium" : "hover:bg-secondary"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Card Type</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={filters.is_rookie} onCheckedChange={v => setFilters(f => ({ ...f, is_rookie: v }))} /> Rookie Card
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={filters.is_autograph} onCheckedChange={v => setFilters(f => ({ ...f, is_autograph: v }))} /> Autograph
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={filters.is_patch} onCheckedChange={v => setFilters(f => ({ ...f, is_patch: v }))} /> Patch
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Price Range</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-secondary rounded-lg text-sm" />
                    <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-secondary rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile Filter Sheet */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-50 bg-background md:hidden overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Filters</h3>
                  <Button variant="ghost" size="icon" onClick={() => setFiltersOpen(false)}><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setFilters(f => ({ ...f, category: f.category === c ? "" : c }))}
                          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${filters.category === c ? "bg-emerald-600 text-white border-emerald-600" : "border-border"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Card Type</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setFilters(f => ({ ...f, is_rookie: !f.is_rookie }))}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${filters.is_rookie ? "bg-emerald-600 text-white border-emerald-600" : "border-border"}`}>Rookie</button>
                      <button onClick={() => setFilters(f => ({ ...f, is_autograph: !f.is_autograph }))}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${filters.is_autograph ? "bg-emerald-600 text-white border-emerald-600" : "border-border"}`}>Autograph</button>
                      <button onClick={() => setFilters(f => ({ ...f, is_patch: !f.is_patch }))}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${filters.is_patch ? "bg-emerald-600 text-white border-emerald-600" : "border-border"}`}>Patch</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Price Range</p>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                        className="w-full px-3 py-2 bg-secondary rounded-lg text-sm" />
                      <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                        className="w-full px-3 py-2 bg-secondary rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={clearFilters}>Clear All</Button>
                  <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setFiltersOpen(false)}>Apply Filters</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg font-medium mb-2">No cards found</p>
              <p className="text-sm text-muted-foreground">Try different search terms or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {listings.map(l => <CardTile key={l.id} listing={l} searchQuery={query} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}