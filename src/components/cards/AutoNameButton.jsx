import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { analyzeCardImage, categoryForItemType } from "@/lib/autoNameListing";

/**
 * Runs vision-based auto-naming on an existing listing's first photo and
 * persists the detected fields. Works for any product type (cards, packs,
 * boxes, lots). Renders a compact icon button.
 */
export default function AutoNameButton({ listing, onNamed, size = "icon" }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    const image = listing.images?.[0];
    if (!image) {
      toast({ title: "No photo to analyze", description: "Add a picture first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await analyzeCardImage(image);
      if (data.confident && data.title) {
        const updates = {
          title: data.title,
          player_name: data.player_name,
          team: data.team,
          manufacturer: data.manufacturer,
          card_set: data.card_set,
          parallel: data.parallel,
          serial_number: data.serial_number,
          is_autograph: data.is_autograph,
          is_patch: data.is_patch,
          is_rookie: data.is_rookie,
          needs_review: false,
        };
        const cat = categoryForItemType(data.item_type);
        if (cat) updates.category = cat;
        const updated = await base44.entities.Listing.update(listing.id, updates);
        onNamed?.(updated);
        toast({ title: "Auto-named", description: data.title });
      } else {
        await base44.entities.Listing.update(listing.id, { needs_review: true });
        onNamed?.({ ...listing, needs_review: true });
        toast({ title: "Couldn't read it", description: "Flagged for manual naming.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Auto-naming failed", description: "You can name it manually.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const cls = size === "icon"
    ? "h-8 w-8"
    : "h-8 rounded-xl gap-1 text-xs";

  return (
    <button
      type="button"
      onClick={run}
      disabled={loading || !listing.images?.length}
      className={`${cls} inline-flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-600/10 disabled:opacity-50 transition-colors`}
      title={loading ? "Naming from photo…" : "Auto-name from photo"}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      {size !== "icon" && (loading ? "Naming…" : "Auto-name")}
    </button>
  );
}