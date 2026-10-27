import React from "react";
import { Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium, startPremiumCheckout } from "@/hooks/usePremium";
import { useToast } from "@/components/ui/use-toast";
import { toAED } from "@/lib/format";
import { useCurrency } from "@/lib/currency";

// Exports the sold-price history for the current search as a CSV download.
// Premium-only — non-premium users see a locked button that prompts upgrade.
export default function ExportPriceHistory({ sold, player }) {
  const { isPremium, loading } = usePremium();
  const { toast } = useToast();
  const { formatFromAED } = useCurrency();

  const handleExport = () => {
    if (!sold || sold.length === 0) return;
    const header = "Date,Sale Price (AED),Listing Title\n";
    const rows = sold.map((s) => {
      const price = toAED(s.price_usd);
      const title = (s.title || "").replace(/"/g, '""');
      return `${s.date || ""},${price.toFixed(2)},"${title}"`;
    }).join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${player.replace(/[^a-z0-9]/gi, "_")}_price_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Price history exported" });
  };

  if (loading) return null;

  if (!isPremium) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg text-xs h-8 gap-1 opacity-60"
        onClick={startPremiumCheckout}
      >
        <Lock className="w-3.5 h-3.5" /> Export CSV
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-lg text-xs h-8 gap-1"
      onClick={handleExport}
      disabled={!sold || sold.length === 0}
    >
      <Download className="w-3.5 h-3.5" /> Export CSV
    </Button>
  );
}