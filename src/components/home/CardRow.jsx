import React from "react";
import { Link } from "react-router-dom";
import CardTile from "@/components/cards/CardTile";

// Horizontal, swipeable carousel of listing cards used on the mobile homepage.
// Each card is a fixed width so the row scrolls cleanly without overflowing.
export default function CardRow({ listings, title, subtitle, viewAllLink }) {
  if (!listings || listings.length === 0) return null;
  return (
    <section>
      <div className="flex items-end justify-between mb-2 px-4">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-base leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-xs font-medium text-emerald-500 hover:text-emerald-400 shrink-0 ml-2">
            View All →
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 snap-x">
        {listings.map((listing) => (
          <div key={listing.id} className="shrink-0 w-36 snap-start">
            <CardTile listing={listing} />
          </div>
        ))}
      </div>
    </section>
  );
}