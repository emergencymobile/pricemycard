import React from "react";

// A season-grouped block of listings. Renders the season label above an
// always-expanded card of listing rows (no collapse/toggle), for a clean,
// predictable structure on both mobile and desktop.
export default function SeasonGroup({ label, count, items, startYear, variant = "normal", renderRow }) {
  const isOutlier = variant === "outlier";
  const headerClass = isOutlier || startYear === null
    ? "font-display font-bold text-base text-muted-foreground"
    : "font-display font-bold text-lg text-foreground";
  const cardClass = isOutlier
    ? "divide-y divide-border rounded-xl border border-border/60 overflow-hidden bg-card/50"
    : "divide-y divide-border rounded-xl border border-border overflow-hidden bg-card";

  return (
    <div className="mb-3 sm:mb-6 last:mb-0">
      <div className="flex items-center gap-3 mb-2 sm:mb-3">
        <h3 className={headerClass}>{label}</h3>
        <span className="text-xs text-muted-foreground">{count} {count === 1 ? "listing" : "listings"}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className={cardClass}>
        {items.map((l, i) => renderRow(l, i))}
      </div>
    </div>
  );
}