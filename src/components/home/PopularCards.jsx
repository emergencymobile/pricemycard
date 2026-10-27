import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PopularCard from "@/components/home/PopularCard";

// Homepage "Most Popular" section. Reads the cached, normalized ranking from
// the PopularCardsCache entity (public) so anonymous visitors never trigger
// the expensive aggregation. Signed-in visitors also invoke the
// auth-protected computePopularCards function to refresh the cache if stale.
// Mobile renders a swipeable horizontal row; desktop renders a grid.
export default function PopularCards() {
  const [items, setItems] = useState(null); // null = loading, [] = loaded but empty

  useEffect(() => {
    let alive = true;
    const loadCache = async () => {
      try {
        const rows = await base44.entities.PopularCardsCache.list("-updated_date", 1);
        if (!alive) return;
        const row = rows && rows[0];
        setItems(row && Array.isArray(row.ranking) ? row.ranking : []);
      } catch {
        if (alive) setItems([]);
      }
    };
    loadCache();
    base44.auth.isAuthenticated().then((authed) => {
      if (authed && alive) base44.functions.invoke("computePopularCards", {}).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, []);

  const withImages = (items || []).filter((i) => i.image);
  const enough = withImages.length >= 3;

  return (
    <section className="md:max-w-7xl md:mx-auto md:px-4 pb-4 md:pb-12">
      <div className="flex items-end justify-between mb-2 md:mb-6 px-4 md:px-0">
        <div>
          <h2 className="font-display font-bold text-base md:text-2xl">Most Popular</h2>
          <p className="text-[11px] md:text-sm text-muted-foreground mt-0.5 md:mt-1">Top cards by sales & search activity</p>
        </div>
      </div>

      {items === null ? (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-0 pb-2 md:grid md:grid-cols-5 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-secondary animate-pulse w-36 shrink-0 md:w-auto" />
          ))}
        </div>
      ) : enough ? (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 md:px-0 pb-2 md:grid md:grid-cols-5 md:gap-4">
          {withImages.map((item) => (
            <div key={item.rank} className="w-36 shrink-0 md:w-auto">
              <PopularCard item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground px-4">
          <p className="font-medium mb-1">Popular items will appear here</p>
          <p className="text-sm">as the community grows.</p>
        </div>
      )}
    </section>
  );
}