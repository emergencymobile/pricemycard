import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { Image } from "@/components/ui/image";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { HighlightText } from "@/components/search/HighlightText";
import { maskName } from "@/lib/maskName";
import { useCurrency } from "@/lib/currency";
import AddPictureButton from "@/components/cards/AddPictureButton";

export default function CardTile({ listing, searchQuery = "" }) {
  const { formatFromAED } = useCurrency();
  const [liked, setLiked] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [imgSrc, setImgSrc] = useState(listing.images?.[0]);

  const toggleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const prev = liked;
    setLiked(!liked);
    try {
      const user = await base44.auth.me();
      if (!prev) {
        await base44.entities.Favorite.create({ listing_id: listing.id, user_id: user.id });
      } else {
        const favs = await base44.entities.Favorite.filter({ listing_id: listing.id, user_id: user.id });
        if (favs.length) await base44.entities.Favorite.delete(favs[0].id);
      }
    } catch {
      // Rollback the optimistic update if the API call failed.
      setLiked(prev);
    }
  };

  const hasImage = Boolean(imgSrc);
  const isOwner = Boolean(user?.id && listing.created_by_id && user.id === listing.created_by_id);
  const showAddPicture = (isAdmin || isOwner) && !hasImage;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="relative">
      <Link to={`/listing/${listing.id}`} className="group block">
        <div className="relative aspect-[3/4] rounded-lg md:rounded-xl overflow-hidden bg-secondary mb-1 md:mb-2">
          {hasImage ? (
            <Image src={imgSrc} fittingType="fill" className="w-full h-full opacity-100" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
              <Star className="h-8 w-8 opacity-40" />
            </div>
          )}

          <button onClick={toggleFav} className="absolute top-1.5 right-1.5 w-8 h-8 md:w-9 md:h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          </button>
          <div className="absolute bottom-1.5 left-1.5 flex gap-1 flex-wrap">
            {listing.is_rookie && <Badge className="bg-emerald-600 text-white text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5">RC</Badge>}
            {listing.is_autograph && <Badge className="bg-yellow-500 text-black text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5">AUTO</Badge>}
            {listing.is_patch && <Badge className="bg-purple-600 text-white text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5">PATCH</Badge>}

          </div>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-xs md:text-sm truncate"><HighlightText text={maskName(listing.title)} query={searchQuery} /></p>
          <p className="text-[11px] md:text-xs text-muted-foreground truncate"><HighlightText text={maskName(listing.player_name)} query={searchQuery} /> · <HighlightText text={maskName(listing.team)} query={searchQuery} /></p>
          <p className="font-display font-bold text-xs md:text-base text-emerald-600">{formatFromAED(listing.price)}</p>
        </div>
      </Link>
      {showAddPicture && (
        <AddPictureButton listing={listing} onUploaded={setImgSrc} />
      )}
    </motion.div>);

}