import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Globe, Search, Plus, Heart, User } from "lucide-react";

// Mobile-only bottom navigation bar. Guarantees the primary destinations are
// always visible and tappable on small screens (the top navbar keeps the
// logo, search, cart, notifications, and a hamburger for the rest). Hidden on
// >= md so the desktop top navbar is the sole nav, unchanged.
const ITEMS = [
  { label: "Market", path: "/", icon: Globe },
  { label: "Browse", path: "/search", icon: Search },
  { label: "Sell", path: "/sell", icon: Plus },
  { label: "Favorites", path: "/favorites", icon: Heart },
  { label: "Profile", path: "/profile", icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;

  // Tapping the already-active tab resets to the tab's root path, clearing any
  // query parameters (e.g. /search?category=Singles → /search).
  const handleTabClick = (e, item) => {
    if (location.pathname === item.path) {
      e.preventDefault();
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border">
      <div className="grid grid-cols-5 max-w-md mx-auto pb-[min(env(safe-area-inset-bottom),20px)]">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              onClick={(e) => handleTabClick(e, item)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[44px] py-1.5 transition-colors ${active ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}