import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { ShoppingBag, Flame, Star } from "lucide-react";
import { motion } from "framer-motion";

// Maps a popularity source to its badge styling. A card popular in both sources
// renders both badges together.
const BADGES = {
  purchase: { icon: ShoppingBag, label: "Top Seller", className: "bg-emerald-600 text-white" },
  search: { icon: Flame, label: "Trending Search", className: "bg-amber-500 text-black" }
};

export default function PopularCard({ item }) {
  const badges = (item.sources || []).map((s) => BADGES[s]).filter(Boolean);

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="relative">
      <Link to={item.link} className="group block">
        <div className="relative aspect-[3/4] rounded-lg md:rounded-xl overflow-hidden bg-secondary mb-1 md:mb-2">
          {item.image ? (
            <Image src={item.image} fittingType="fill" className="w-full h-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
              <Star className="h-8 w-8 opacity-40" />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 flex gap-1 flex-wrap">
            {badges.map((b, i) => {
              const Icon = b.icon;
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 font-semibold ${b.className}`}
                >
                  <Icon className="w-2.5 h-2.5" /> {b.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-xs md:text-sm line-clamp-2">{item.title}</p>
          <p className="text-[11px] md:text-xs text-muted-foreground truncate">{item.player}</p>
        </div>
      </Link>
    </motion.div>
  );
}