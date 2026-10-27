import React from "react";
import CardTile from "@/components/cards/CardTile";

export default function CardGrid({ listings, title, subtitle, viewAllLink, emptyMessage = "No cards found", mobileLimit }) {
  return (
    <section>
      {(title || subtitle) && (
        <div className="flex items-end justify-between mb-2 md:mb-6">
          <div>
            {title && <h2 className="font-display font-bold text-lg md:text-2xl">{title}</h2>}
            {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <a href={viewAllLink} className="text-xs md:text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors shrink-0">
              View All →
            </a>
          )}
        </div>
      )}
      {listings.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3 md:gap-4">
          {listings.map((listing, i) => (
            <div key={listing.id} className={mobileLimit && i >= mobileLimit ? "hidden sm:block" : "contents"}>
              <CardTile listing={listing} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}