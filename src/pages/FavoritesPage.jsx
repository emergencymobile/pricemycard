import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import CardTile from "@/components/cards/CardTile";

export default function FavoritesPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        const favs = await base44.entities.Favorite.filter({ user_id: u.id });
        const cards = await Promise.all(favs.map(f => base44.entities.Listing.get(f.listing_id).catch(() => null)));
        setListings(cards.filter(Boolean));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl mb-8">Favorites</h1>
      {listings.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-2">No favorites yet</p>
          <p className="text-sm text-muted-foreground">Tap the heart icon on any card to save it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {listings.map(l => <CardTile key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}