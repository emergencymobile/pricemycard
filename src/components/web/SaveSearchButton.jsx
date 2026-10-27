import React, { useState, useEffect } from "react";
import { Bookmark, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { usePremium, startPremiumCheckout } from "@/hooks/usePremium";
import { useToast } from "@/components/ui/use-toast";

// Saves the current search keyword as a tracked alert (premium feature).
// Non-premium users see a locked button that prompts upgrade.
export default function SaveSearchButton({ keyword }) {
  const { isPremium, loading } = usePremium();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isPremium || !keyword) { setSaved(false); return; }
    let alive = true;
    setChecking(true);
    (async () => {
      try {
        const me = await base44.auth.me().catch(() => null);
        if (!me) { if (alive) setChecking(false); return; }
        const existing = await base44.entities.SavedSearch.filter(
          { user_id: me.id, keyword }, "-created_date", 1
        );
        if (alive) setSaved(existing.length > 0);
      } catch {}
      if (alive) setChecking(false);
    })();
    return () => { alive = false; };
  }, [isPremium, keyword]);

  const handleSave = async () => {
    if (!isPremium) { startPremiumCheckout(); return; }
    if (saved || !keyword) return;
    try {
      const me = await base44.auth.me();
      if (!me) return;
      await base44.entities.SavedSearch.create({ user_id: me.id, keyword });
      setSaved(true);
      toast({ title: "Search saved", description: "You'll get alerts for new listings." });
    } catch {
      toast({ title: "Could not save search", variant: "destructive" });
    }
  };

  if (loading || checking) return null;

  if (!isPremium) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg text-xs h-8 gap-1 opacity-60"
        onClick={startPremiumCheckout}
      >
        <Lock className="w-3.5 h-3.5" /> Save Alert
      </Button>
    );
  }

  return (
    <Button
      variant={saved ? "secondary" : "outline"}
      size="sm"
      className="rounded-lg text-xs h-8 gap-1"
      onClick={handleSave}
      disabled={saved || !keyword}
    >
      {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
      {saved ? "Saved" : "Save Alert"}
    </Button>
  );
}