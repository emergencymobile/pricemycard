import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-background border-t border-border text-muted-foreground mt-2 md:mt-20">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 md:mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 md:mb-4">
              <Logo className="h-9 w-auto" />
              <span className="font-display font-bold text-lg">Price My Card</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The premium marketplace for authentic soccer trading cards.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 md:mb-4">Marketplace</h4>
            <div className="space-y-1.5 md:space-y-2.5">
              <Link to="/search" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Browse Cards</Link>
              <Link to="/sell" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Sell Cards</Link>
              <Link to="/search?category=Singles" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Collections</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 md:mb-4">Account</h4>
            <div className="space-y-1.5 md:space-y-2.5">
              <Link to="/profile" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
              <Link to="/orders" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Orders</Link>
              <Link to="/favorites" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Favorites</Link>
              <Link to="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Seller Dashboard</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2 md:mb-4">Support</h4>
            <div className="space-y-1.5 md:space-y-2.5">
              <Link to="/messages" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Messages</Link>
              <span className="block text-sm text-muted-foreground">help@pricemycard.com</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4 md:pt-8 flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
          <p className="text-xs text-muted-foreground">© 2026 Pricemycard. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms &amp; Conditions</Link>
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="text-xs text-muted-foreground">Secure payments by Stripe</span>
          </div>
        </div>
      </div>
    </footer>
  );
}