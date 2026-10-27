import React, { useState } from "react";
import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatOriginal } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { HighlightText } from "@/components/search/HighlightText";

// One SOLD/completed external listing. Shows the true final sale price
// (incl. accepted Best Offer), sale date, source, grade, and a direct link.
export default function SoldListingCard({ listing, query }) {
  const { formatFromUSD } = useCurrency();
  const [imgError, setImgError] = useState(false);
  const showImg = !!listing.image_url && !imgError;
  const gradeLabel =
    listing.grade_company && listing.grade
      ? `${listing.grade_company} ${listing.grade}`
      : listing.raw
        ? "Raw"
        : "";

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-secondary rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500/40 transition-all"
    >
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {showImg ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/30 to-muted">
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}
        <span className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {listing.source && <Badge className="bg-background/80 backdrop-blur text-foreground text-[10px]">{listing.source}</Badge>}
          {listing.is_best_offer && <Badge className="bg-emerald-600 text-white text-[10px]">Best Offer</Badge>}
        </span>
      </div>
      <div className="p-2.5 md:p-3 space-y-1 md:space-y-1.5">
        <p className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
          <HighlightText text={listing.title} query={query} />
        </p>
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-emerald-600 leading-tight">
            {formatFromUSD(listing.price_usd)}
            <span className="block text-[10px] font-normal text-muted-foreground">≈ {formatOriginal(listing.original_price, listing.original_currency)}</span>
          </span>
          {listing.date && <span className="text-[11px] text-muted-foreground self-center">{listing.date}</span>}
        </div>
        <div className="flex items-center justify-between">
          {gradeLabel ? <Badge variant="outline" className="text-[10px]">{gradeLabel}</Badge> : <span />}
          <span className="text-xs text-muted-foreground group-hover:text-emerald-500 transition-colors flex items-center gap-1">
            View <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}