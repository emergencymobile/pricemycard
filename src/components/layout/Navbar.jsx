import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, Bell, Menu, X, Heart, User, Plus, Globe, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import CurrencySelector from "@/components/CurrencySelector";
import Logo from "@/components/Logo";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const location = useLocation();

  const isTabActive = (path) => {
    const [pathname, search] = path.split("?");
    if (pathname !== location.pathname) return false;
    if (!search) {
      // "Browse" is active only when no category is selected
      return !new URLSearchParams(location.search).get("category");
    }
    return new URLSearchParams(location.search).get("category") ===
    new URLSearchParams(search).get("category");
  };

  const navigate = useNavigate();
  // Root screens show the brand logo; child screens show a native-style back
  // button on mobile (the desktop navbar keeps the logo on every route).
  const ROOT_PATHS = new Set(["/", "/search", "/favorites", "/profile", "/sell"]);
  const CHILD_TITLES = {
    "/cart": "Cart", "/checkout": "Checkout", "/orders": "Orders",
    "/sell": "Sell a Card", "/dashboard": "Dashboard", "/messages": "Messages",
    "/notifications": "Notifications", "/addresses": "Addresses",
    "/web-search": "Market Search", "/admin": "Admin", "/terms": "Terms",
    "/privacy": "Privacy"
  };
  const isRoot = ROOT_PATHS.has(location.pathname);
  const childTitle = CHILD_TITLES[location.pathname] ||
    (location.pathname.startsWith("/listing/") ? "Listing" : "Back");
  const goBack = () => { if (window.history.length > 1) navigate(-1); else navigate("/"); };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        const cart = await base44.entities.CartItem.filter({ user_id: u.id });
        setCartCount(cart.length);
        const notifs = await base44.entities.Notification.filter({ user_id: u.id, is_read: false });
        setNotifCount(notifs.length);
      } catch {
        // unauthenticated
      } finally {
        setAuthLoaded(true);
      }
    };
    loadUser();
  }, []);

  const navLinks = [
  { label: "Market Search", path: "/web-search", icon: Globe, highlight: true },
  { label: "Browse", path: "/search" },
  { label: "Sell", path: "/sell" },
  { label: "Collections", path: "/search?category=Singles" }];


  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Mobile back button (child screens only) */}
            {!isRoot && (
              <button
                onClick={goBack}
                aria-label="Back"
                className="md:hidden flex items-center gap-1 h-11 -ml-2 px-2 rounded-lg text-foreground hover:bg-secondary transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium text-sm">{childTitle}</span>
              </button>
            )}
            {/* Logo — root screens (all sizes), child screens (desktop only) */}
            <Link to="/" className={`flex items-center gap-2 shrink-0 ${!isRoot ? "hidden md:flex" : "flex"}`}>
              <Logo className="h-9 w-auto" />
              <span className="font-display font-bold text-lg hidden sm:block">Price My Card</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((l) =>
              <Link key={l.path} to={l.path} className={`text-sm font-medium transition-colors mx-4 ${l.highlight ? "text-emerald-400 font-semibold" : isTabActive(l.path) ? "text-emerald-500 font-semibold" : "hover:text-foreground"}`}>
                   {l.icon && <l.icon className="w-4 h-4 inline-block -mt-0.5 mr-1" />}{l.label}
                   </Link>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Link to="/favorites" className="hidden md:block">
                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-9 md:w-9">
                  <Heart className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-9 md:w-9">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 &&
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  }
                </Button>
              </Link>
              <Link to="/notifications" className="relative">
                <Button variant="ghost" size="icon" className="h-11 w-11 md:h-9 md:w-9">
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 &&
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifCount}
                    </span>
                  }
                </Button>
              </Link>
              <Link to="/sell" className="hidden sm:block">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-1 ml-2">
                  <Plus className="w-4 h-4" /> Sell
                </Button>
              </Link>
              <div className="ml-1"><CurrencySelector /></div>
              {authLoaded && !user ? (
                <Link to="/login" className="ml-1 hidden md:block">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                    Log in
                  </Button>
                </Link>
              ) : (
                <Link to="/profile" className="hidden md:block">
                  <Button variant="ghost" size="icon" className="ml-1 h-11 w-11 md:h-9 md:w-9">
                    <User className="w-5 h-5" />
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="icon" className="md:hidden h-11 w-11" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen &&
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-border overflow-hidden">
              <div className="p-4 space-y-1">
                {navLinks.map((l) =>
              <Link key={l.path} to={l.path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${isTabActive(l.path) ? "bg-emerald-50 text-emerald-700 font-semibold" : "hover:bg-secondary"}`}>
                     {l.icon && <l.icon className="w-4 h-4" />}{l.label}
                     </Link>
              )}
                <div className="border-t border-border my-2" />
                <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                  <ShoppingCart className="w-4 h-4" /> Cart
                  {cartCount > 0 && <span className="ml-auto bg-emerald-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{cartCount}</span>}
                </Link>
                <Link to="/favorites" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                  <Heart className="w-4 h-4" /> Favorites
                </Link>
                <Link to="/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                  <Bell className="w-4 h-4" /> Notifications
                  {notifCount > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{notifCount}</span>}
                </Link>
                {authLoaded && user ? (
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                    <User className="w-4 h-4" /> Profile
                  </Link>
                ) : authLoaded && !user ? (
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <User className="w-4 h-4" /> Log in
                  </Link>
                ) : null}
                <Link to="/sell" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
                  <Plus className="w-4 h-4" /> Sell a Card
                </Link>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                  Seller Dashboard
                </Link>
                <Link to="/messages" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                  Messages
                </Link>
                <Link to="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                  Orders
                </Link>
                <div className="py-2.5 px-3"><CurrencySelector /></div>
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </nav>
    </>);

}