import React from "react";
import { Crown, Sparkles, Download, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium, startPremiumCheckout } from "@/hooks/usePremium";

// Upsell banner shown on the search page for non-premium users. Highlights
// the premium features and drives checkout. Hides entirely for premium users.
export default function PremiumBanner() {
  const { isPremium, loading } = usePremium();
  if (loading || isPremium) return null;

  return (
    <div className="mb-4 sm:mb-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600/15 to-emerald-500/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
            Upgrade to Premium
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unlock price-history exports, saved search alerts, and detailed market reports.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> CSV exports</span>
            <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> Search alerts</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Market reports</span>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0"
          onClick={startPremiumCheckout}
        >
          $4.99/mo
        </Button>
      </div>
    </div>
  );
}