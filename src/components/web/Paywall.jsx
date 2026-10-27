import React from "react";
import { Crown, Search, TrendingUp, Download, Bell, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPremiumCheckout } from "@/hooks/usePremium";
import AccessRequestButton from "@/components/web/AccessRequestButton";

// Full-page paywall shown when a user is not premium. Blocks all search
// functionality until they start a 7-day free trial ($5.99/month after).
export default function Paywall() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center mx-auto mb-6">
        <Crown className="w-8 h-8 text-emerald-400" />
      </div>
      <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
        Start Your 7-Day Free Trial
      </h1>
      <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md mx-auto">
        Get unlimited access to live card market search, price history, and alerts.
        Try it free for 7 days — then just $5.99/month.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/60 border border-border">
          <Search className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-medium text-center">Unlimited Searches</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/60 border border-border">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-medium text-center">Price History</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/60 border border-border">
          <Download className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-medium text-center">CSV Exports</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/60 border border-border">
          <Bell className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-medium text-center">Search Alerts</span>
        </div>
      </div>

      <Button
        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-3 text-base font-semibold"
        onClick={startPremiumCheckout}
      >
        Start 7-Day Free Trial
      </Button>
      <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" />
        $5.99/month after trial. Cancel anytime.
      </p>

      <AccessRequestButton />
    </div>
  );
}